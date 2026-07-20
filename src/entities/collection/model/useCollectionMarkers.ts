import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { STALE_MS } from '@/entities/ehs/model/envSensors'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import { classifyRisk, type SensorThresholds } from './classifyRisk'

// DiagramMap의 SensorMarker와 구조 동일 (FSD상 widgets를 import하지 않으려 로컬 정의)
export interface CollectionMarker {
  label: string
  valueText: string
  risk: DeviceRisk
}

type ParentType = 'FACTORY' | 'PROCESS' | 'LINE'

interface SensorMaster extends SensorThresholds {
  code: string
  name?: string
}

interface LatestRow {
  ts: string
  sensor_code: string
  value: number | null
  quality?: number
}

const POLL_MS = 5000

function fmtValue(v: number, unit?: string): string {
  const n = Number.isInteger(v) ? v.toLocaleString('ko-KR') : v.toFixed(1)
  return unit ? `${n} ${unit}` : n
}

// 계층 소속 독립 수집 센서의 실시간 마커 맵 (sensorCode → 값/등급). 5초 폴링.
export function useCollectionMarkers(
  parentType: ParentType,
  parentId: number,
): Record<string, CollectionMarker> {
  const [markers, setMarkers] = useState<Record<string, CollectionMarker>>({})

  useEffect(() => {
    if (!parentId || Number.isNaN(parentId)) return
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function build() {
      const q = `parentType=${parentType}&parentId=${parentId}`
      const masters = await api
        .get<SensorMaster[]>(`/collection/sensors?${q}&activeOnly=true`)
        .catch(() => [])
      if (!active) return
      if (masters.length === 0) {
        setMarkers({})
        return
      }
      const byCode = new Map(masters.map((m) => [m.code, m]))

      async function refresh() {
        const rows = await api.get<LatestRow[]>(`/collection/data/all-latest?${q}`).catch(() => [])
        if (!active) return
        const now = Date.now()
        const next: Record<string, CollectionMarker> = {}
        for (const s of masters) {
          const row = rows.find((r) => r.sensor_code === s.code)
          const stale = row ? now - new Date(row.ts).getTime() > STALE_MS : true
          const value = row && !stale ? row.value : null
          next[s.code] = {
            label: s.name || s.code,
            valueText: value != null ? fmtValue(value, s.unit) : '—',
            risk: value != null ? classifyRisk(value, byCode.get(s.code)!) : 'offline',
          }
        }
        setMarkers(next)
      }

      await refresh()
      timer = setInterval(refresh, POLL_MS)
    }

    build()
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [parentType, parentId])

  return markers
}
