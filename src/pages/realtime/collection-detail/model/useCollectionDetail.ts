import { useEffect, useMemo, useState } from 'react'
import { api } from '@/shared/lib/api'
import { loadDiagram, type DiagramData } from '@/shared/lib/diagramStorage'
import { STALE_MS } from '@/entities/ehs/model/envSensors'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import { classifyRisk, type SensorThresholds } from '@/entities/collection/model/classifyRisk'
import { sensorTypeMeta } from '@/entities/collection/model/sensorTypeMeta'
import type { SensorMarker } from '@/widgets/diagram-map'

const POLL_MS = 5000

export interface CollectionSensorRow extends SensorThresholds {
  id: number
  code: string
  name?: string
  sensor_type?: string
  parent_type?: 'FACTORY' | 'PROCESS' | 'LINE'
  parent_id?: number
  value: number | null
  risk: DeviceRisk
  valueText: string
}

interface Master extends SensorThresholds {
  id: number
  code: string
  name?: string
  sensor_type?: string
  parent_type?: 'FACTORY' | 'PROCESS' | 'LINE'
  parent_id?: number
}

interface Latest {
  ts: string
  sensor_code: string
  value: number | null
}

function fmtValue(v: number, unit?: string): string {
  const n = Number.isInteger(v) ? v.toLocaleString('ko-KR') : v.toFixed(1)
  return unit ? `${n} ${unit}` : n
}

const SCOPE_PATH = { FACTORY: 'factory', PROCESS: 'process', LINE: 'line' } as const

// 센서 유형(sensor_type) 하나에 대한 상세 — 좌측 도면 + 우측 목록
export function useCollectionDetail(sensorType: string) {
  const [masters, setMasters] = useState<Master[]>([])
  const [latest, setLatest] = useState<Latest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const [mapImage, setMapImage] = useState<{
    base64: string
    width: number
    height: number
  } | null>(null)
  const [mapLoading, setMapLoading] = useState(false)

  const meta = sensorTypeMeta(sensorType)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function start() {
      const all = await api
        .get<Master[]>('/collection/sensors?activeOnly=true')
        .catch(() => [] as Master[])
      if (!active) return
      setMasters(all.filter((m) => (m.sensor_type ?? '') === sensorType))
      setLoading(false)

      async function refresh() {
        const rows = await api
          .get<Latest[]>('/collection/data/all-latest')
          .catch(() => [] as Latest[])
        if (active) setLatest(rows)
      }
      await refresh()
      timer = setInterval(refresh, POLL_MS)
    }

    start()
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [sensorType])

  const rows: CollectionSensorRow[] = useMemo(() => {
    const byCode = new Map(latest.map((r) => [r.sensor_code, r]))
    const now = Date.now()
    return masters.map((m) => {
      const row = byCode.get(m.code)
      const stale = row ? now - new Date(row.ts).getTime() > STALE_MS : true
      const value = row && !stale ? row.value : null
      return {
        ...m,
        value,
        risk: value != null ? classifyRisk(value, m) : 'offline',
        valueText: value != null ? fmtValue(value, m.unit) : '—',
      }
    })
  }, [masters, latest])

  const summary = useMemo(() => {
    const c = { normal: 0, caution: 0, warning: 0, danger: 0, offline: 0 }
    rows.forEach((r) => c[r.risk]++)
    return c
  }, [rows])

  const filteredRows = useMemo(() => {
    let arr = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter(
        (r) => r.code.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q),
      )
    }
    const ORDER: DeviceRisk[] = ['danger', 'warning', 'caution', 'offline', 'normal']
    return [...arr].sort((a, b) => ORDER.indexOf(a.risk) - ORDER.indexOf(b.risk))
  }, [rows, search])

  const markers = useMemo(() => {
    const m: Record<string, SensorMarker> = {}
    for (const r of rows)
      m[r.code] = { label: r.name || r.code, valueText: r.valueText, risk: r.risk }
    return m
  }, [rows])

  // 선택 센서의 소속 계층 도면 로드
  const selected = rows.find((r) => r.code === selectedCode) ?? null
  const scopeKey = selected?.parent_type && selected.parent_id
    ? `${selected.parent_type}:${selected.parent_id}`
    : null

  useEffect(() => {
    if (!scopeKey) {
      setDiagram({ nodes: [], edges: [] })
      setMapImage(null)
      return
    }
    const [pt, pid] = scopeKey.split(':')
    const scope = SCOPE_PATH[pt as keyof typeof SCOPE_PATH]
    const path = pt === 'FACTORY' ? 'factories' : pt === 'PROCESS' ? 'processes' : 'lines'
    let active = true
    setMapLoading(true)
    Promise.all([
      loadDiagram(scope, Number(pid)),
      api
        .get<{ imageBase64: string | null; width: number | null; height: number | null }>(
          `/master/${path}/${pid}/image`,
        )
        .catch(() => null),
    ])
      .then(([diag, img]) => {
        if (!active) return
        setDiagram(diag)
        setMapImage(
          img?.imageBase64 && img.width && img.height
            ? { base64: img.imageBase64, width: img.width, height: img.height }
            : null,
        )
      })
      .finally(() => {
        if (active) setMapLoading(false)
      })
    return () => {
      active = false
    }
  }, [scopeKey])

  return {
    meta,
    loading,
    rows,
    filteredRows,
    summary,
    search,
    setSearch,
    selectedCode,
    setSelectedCode,
    selected,
    diagram,
    mapImage,
    mapLoading,
    markers,
  }
}
