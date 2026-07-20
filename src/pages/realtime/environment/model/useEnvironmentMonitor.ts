import { useEffect, useMemo, useRef, useState } from 'react'
import { listLines, getLineImage } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'
import { fetchAllLatest } from '@/entities/ehs/api/ehsApi'
import type { EhsLatestRow } from '@/entities/ehs/api/ehsApi'
import { CATEGORIES, calcRisk } from '@/entities/ehs/model/config'
import { ENV_SLUGS, STALE_MS, fmtMetricValue, RISK_RANK } from '@/entities/ehs/model/envSensors'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import type { EhsCategoryConfig, EhsRiskLevel } from '@/entities/ehs/model/types'
import { loadDiagram, type DiagramData } from '@/shared/lib/diagramStorage'
import { api } from '@/shared/lib/api'
import { classifyRisk, type SensorThresholds } from '@/entities/collection/model/classifyRisk'
import { sensorTypeMeta } from '@/entities/collection/model/sensorTypeMeta'
import type { SensorMarker } from '@/widgets/diagram-map'

export type { DeviceRisk }
export { RISK_RANK }

export interface EnvDevice {
  code: string
  valueText: string
  risk: DeviceRisk
}

export interface EnvCategoryGroup {
  slug: string
  cfg: EhsCategoryConfig
  devices: EnvDevice[]
  worst: DeviceRisk
}

// 독립 수집 센서 (설비 비소속) — 센서 유형별 묶음
export interface CollectionGroup {
  type: string
  label: string
  color: string
  devices: EnvDevice[]
  worst: DeviceRisk
}

interface CollectionMaster extends SensorThresholds {
  code: string
  name?: string
  sensor_type?: string
  parent_type?: string
  parent_id?: number
}

interface CollectionLatest {
  ts: string
  sensor_code: string
  value: number | null
}

export interface EnvEvent {
  id: number
  time: string
  slug: string
  categoryLabel: string
  risk: EhsRiskLevel
  message: string
}

const POLL_MS = 5_000
const EMPTY_DIAGRAM: DiagramData = { nodes: [], edges: [] }

export function useEnvironmentMonitor() {
  const [view, setView] = useState<'board' | 'map'>('board')
  const [groups, setGroups] = useState<EnvCategoryGroup[]>([])
  const [events, setEvents] = useState<EnvEvent[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const prevRiskRef = useRef<Map<string, DeviceRisk>>(new Map())
  const eventIdRef = useRef(1)
  // 독립 수집 센서 (전 계층)
  const [colMasters, setColMasters] = useState<CollectionMaster[]>([])
  const [colLatest, setColLatest] = useState<CollectionLatest[]>([])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function start() {
      const masters = await api
        .get<CollectionMaster[]>('/collection/sensors?activeOnly=true')
        .catch(() => [] as CollectionMaster[])
      if (!active) return
      setColMasters(masters)
      if (masters.length === 0) return

      async function refresh() {
        const rows = await api
          .get<CollectionLatest[]>('/collection/data/all-latest')
          .catch(() => [] as CollectionLatest[])
        if (active) setColLatest(rows)
      }
      await refresh()
      timer = setInterval(refresh, POLL_MS)
    }

    start()
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [])

  // 독립 수집 센서 → 유형별 그룹 + 마커
  const { collectionGroups, collectionMarkers, collectionCodes } = useMemo(() => {
    const latestByCode = new Map(colLatest.map((r) => [r.sensor_code, r]))
    const now = Date.now()
    const byType = new Map<string, EnvDevice[]>()
    const markers: Record<string, SensorMarker> = {}

    for (const m of colMasters) {
      const row = latestByCode.get(m.code)
      const stale = row ? now - new Date(row.ts).getTime() > STALE_MS : true
      const value = row && !stale ? row.value : null
      const risk: DeviceRisk = value != null ? classifyRisk(value, m) : 'offline'
      const valueText = value != null ? fmtMetricValue(value, m.unit ?? '') : '—'
      const dev: EnvDevice = { code: m.code, valueText, risk }
      const t = m.sensor_type ?? 'ETC'
      if (!byType.has(t)) byType.set(t, [])
      byType.get(t)!.push(dev)
      markers[m.code] = { label: m.name || m.code, valueText, risk }
    }

    const groups: CollectionGroup[] = [...byType.entries()].map(([type, devices]) => {
      const meta = sensorTypeMeta(type)
      const sorted = [...devices].sort((a, b) => RISK_RANK[b.risk] - RISK_RANK[a.risk])
      const worst = sorted.reduce<DeviceRisk>(
        (acc, d) => (RISK_RANK[d.risk] > RISK_RANK[acc] ? d.risk : acc),
        'normal',
      )
      return { type, label: meta.label, color: meta.color, devices: sorted, worst }
    })

    return {
      collectionGroups: groups,
      collectionMarkers: markers,
      collectionCodes: new Set(colMasters.map((m) => m.code)),
    }
  }, [colMasters, colLatest])

  useEffect(() => {
    let active = true

    async function load() {
      const results = await Promise.allSettled(
        ENV_SLUGS.map((slug) => fetchAllLatest(slug).then((rows) => ({ slug, rows }))),
      )
      if (!active) return

      const rowsBySlug = new Map<string, EhsLatestRow[]>()
      for (const r of results) {
        if (r.status === 'fulfilled') rowsBySlug.set(r.value.slug, r.value.rows)
      }

      const now = Date.now()
      const nextGroups: EnvCategoryGroup[] = []
      const newEvents: EnvEvent[] = []

      for (const slug of ENV_SLUGS) {
        const cfg = CATEGORIES[slug]
        const rows = rowsBySlug.get(slug) ?? []
        const devices: EnvDevice[] = rows
          .map((row) => {
            const raw = row[cfg.primaryMetric.key]
            const value = typeof raw === 'number' ? raw : null
            const stale = now - new Date(row.ts).getTime() > STALE_MS
            const risk: DeviceRisk =
              stale || value == null ? 'offline' : calcRisk(value, cfg.primaryMetric)
            return {
              code: row.device_code,
              valueText: value != null ? fmtMetricValue(value, cfg.primaryMetric.unit) : '—',
              risk,
            }
          })
          .sort((a, b) => RISK_RANK[b.risk] - RISK_RANK[a.risk])

        const worst = devices.reduce<DeviceRisk>(
          (acc, d) => (RISK_RANK[d.risk] > RISK_RANK[acc] ? d.risk : acc),
          'normal',
        )

        for (const d of devices) {
          const prev = prevRiskRef.current.get(d.code)
          if (
            prev !== undefined &&
            RISK_RANK[d.risk] > RISK_RANK[prev] &&
            d.risk !== 'offline' &&
            d.risk !== 'normal'
          ) {
            newEvents.push({
              id: eventIdRef.current++,
              time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
              slug,
              categoryLabel: cfg.koreanLabel,
              risk: d.risk,
              message: `${d.code} ${cfg.primaryMetric.label} ${d.valueText}`,
            })
          }
          prevRiskRef.current.set(d.code, d.risk)
        }

        nextGroups.push({ slug, cfg, devices, worst })
      }

      setGroups(nextGroups)
      if (newEvents.length) setEvents((prev) => [...newEvents, ...prev].slice(0, 30))
      setUpdatedAt(new Date())
      setLoading(false)
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [])

  // 환경 설비 + 독립 수집 센서 합산
  const counts = useMemo(() => {
    const c = { normal: 0, caution: 0, alert: 0, offline: 0 }
    const tally = (risk: DeviceRisk) => {
      if (risk === 'normal') c.normal++
      else if (risk === 'caution') c.caution++
      else if (risk === 'offline') c.offline++
      else c.alert++
    }
    for (const g of groups) for (const d of g.devices) tally(d.risk)
    for (const g of collectionGroups) for (const d of g.devices) tally(d.risk)
    return c
  }, [groups, collectionGroups])

  const sensorMarkers = useMemo(() => {
    const m: Record<string, SensorMarker> = {}
    for (const g of groups)
      for (const d of g.devices)
        m[d.code] = {
          label: `${g.cfg.koreanLabel} ${d.code}`,
          valueText: d.valueText,
          risk: d.risk,
        }
    // 독립 수집 센서 마커도 도면에 함께 표시
    return { ...m, ...collectionMarkers }
  }, [groups, collectionMarkers])

  const slugByDevice = useMemo(() => {
    const m: Record<string, string> = {}
    for (const g of groups) for (const d of g.devices) m[d.code] = g.slug
    return m
  }, [groups])

  // ── 도면 뷰 ──
  // 센서 매핑은 라인 도면에 있으므로 전체 라인 도면을 한 번 스캔해서
  // 환경 센서가 매핑된 라인만 선택지로 노출
  const [lines, setLines] = useState<Line[]>([])
  const [diagramsByLine, setDiagramsByLine] = useState<Map<number, DiagramData>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [bgByLine, setBgByLine] = useState<
    Map<number, { base64: string; width: number; height: number } | null>
  >(new Map())

  useEffect(() => {
    let active = true
    listLines()
      .then(async (ls) => {
        const diagrams = await Promise.all(ls.map((l) => loadDiagram('line', l.id)))
        if (!active) return
        setLines(ls)
        setDiagramsByLine(new Map(ls.map((l, i) => [l.id, diagrams[i]])))
        setMapReady(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const mappedLines = useMemo(
    () =>
      lines
        .map((line) => ({
          line,
          count: (diagramsByLine.get(line.id)?.nodes ?? []).filter((n) => {
            const code = n.deviceCode ?? n.sensorCode
            return code != null && sensorMarkers[code] != null
          }).length,
        }))
        .filter((x) => x.count > 0),
    [lines, diagramsByLine, sensorMarkers],
  )

  const lineId = selectedLineId ?? mappedLines[0]?.line.id ?? null
  const diagram = (lineId != null && diagramsByLine.get(lineId)) || EMPTY_DIAGRAM
  const bgImage = (lineId != null && bgByLine.get(lineId)) || null
  const mapLoading = !mapReady

  useEffect(() => {
    if (lineId == null || bgByLine.has(lineId)) return
    let active = true
    getLineImage(lineId)
      .catch(() => null)
      .then((img) => {
        if (!active) return
        setBgByLine((prev) =>
          new Map(prev).set(
            lineId,
            img?.imageBase64 && img.width && img.height
              ? { base64: img.imageBase64, width: img.width, height: img.height }
              : null,
          ),
        )
      })
    return () => {
      active = false
    }
  }, [lineId, bgByLine])

  const mappedCount = useMemo(
    () =>
      diagram.nodes.filter((n) => {
        const code = n.deviceCode ?? n.sensorCode
        return code != null && sensorMarkers[code] != null
      }).length,
    [diagram, sensorMarkers],
  )

  return {
    view,
    setView,
    loading,
    groups,
    counts,
    events,
    updatedAt,
    collectionGroups,
    collectionCodes,
    sensorMarkers,
    slugByDevice,
    mappedLines,
    lineId,
    setSelectedLineId,
    diagram,
    bgImage,
    mapLoading,
    mappedCount,
  }
}
