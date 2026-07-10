import { useEffect, useState } from 'react'
import { listProcesses } from '@/entities/process/api/processApi'
import { listLines } from '@/entities/line/api/lineApi'
import { fetchEnvSensorMarkers, RISK_RANK } from '@/entities/ehs/model/envSensors'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import { loadDiagram } from '@/shared/lib/diagramStorage'

export interface FactoryStatus {
  deviceCount: number
  risk: DeviceRisk
}

const POLL_MS = 10_000

// 공장 → 공정 → 라인 도면의 deviceCode를 모아 공장별 설비 수 + 최악 등급 집계 (10초 폴링)
export function useSiteFactoryStatus(factoryIds: number[]) {
  const [status, setStatus] = useState<Record<number, FactoryStatus>>({})

  useEffect(() => {
    if (factoryIds.length === 0) return
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function build() {
      const [procs, lines] = await Promise.all([listProcesses(), listLines()])
      if (!active) return

      const codesByFactory = new Map<number, string[]>()
      const lineIds = new Set<number>()
      const factoryOfLine = new Map<number, number>()
      for (const fid of factoryIds) {
        codesByFactory.set(fid, [])
        const pids = new Set(procs.filter((p) => p.factoryId === fid).map((p) => p.id))
        for (const l of lines) {
          if (pids.has(l.processId)) {
            lineIds.add(l.id)
            factoryOfLine.set(l.id, fid)
          }
        }
      }

      const ids = [...lineIds]
      const diagrams = await Promise.all(ids.map((id) => loadDiagram('line', id)))
      if (!active) return
      ids.forEach((id, i) => {
        const fid = factoryOfLine.get(id)!
        const codes = diagrams[i].nodes.filter((n) => n.deviceCode).map((n) => n.deviceCode!)
        codesByFactory.get(fid)!.push(...codes)
      })

      async function refresh() {
        try {
          const { markers } = await fetchEnvSensorMarkers()
          if (!active) return
          const next: Record<number, FactoryStatus> = {}
          for (const fid of factoryIds) {
            const codes = codesByFactory.get(fid) ?? []
            let worst: DeviceRisk = 'normal'
            for (const c of codes) {
              const m = markers[c]
              if (m && RISK_RANK[m.risk] > RISK_RANK[worst]) worst = m.risk
            }
            next[fid] = { deviceCount: codes.length, risk: worst }
          }
          setStatus(next)
        } catch {
          // ignore — 이전 상태 유지
        }
      }

      await refresh()
      timer = setInterval(refresh, POLL_MS)
    }

    build()
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryIds.join(',')])

  return status
}
