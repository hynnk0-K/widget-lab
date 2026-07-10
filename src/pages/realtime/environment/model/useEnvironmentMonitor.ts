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

  const counts = useMemo(() => {
    const c = { normal: 0, caution: 0, alert: 0, offline: 0 }
    for (const g of groups)
      for (const d of g.devices) {
        if (d.risk === 'normal') c.normal++
        else if (d.risk === 'caution') c.caution++
        else if (d.risk === 'offline') c.offline++
        else c.alert++
      }
    return c
  }, [groups])

  const sensorMarkers = useMemo(() => {
    const m: Record<string, SensorMarker> = {}
    for (const g of groups)
      for (const d of g.devices)
        m[d.code] = {
          label: `${g.cfg.koreanLabel} ${d.code}`,
          valueText: d.valueText,
          risk: d.risk,
        }
    return m
  }, [groups])

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
          count: (diagramsByLine.get(line.id)?.nodes ?? []).filter(
            (n) => n.deviceCode && sensorMarkers[n.deviceCode],
          ).length,
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
    () => diagram.nodes.filter((n) => n.deviceCode && sensorMarkers[n.deviceCode]).length,
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
