import { useEffect, useRef, useState } from 'react'
import { getProcess } from '@/entities/process/api/processApi'
import { listLines } from '@/entities/line/api/lineApi'
import { listEquipmentLive } from '@/entities/equipment/api/equipmentApi'
import type { Process } from '@/entities/process/model/types'
import type { Line } from '@/entities/line/model/types'
import type { EquipmentLive } from '@/entities/equipment/model/types'

export interface LineGroup {
  line: Line
  equipments: EquipmentLive[]
}

const POLL_MS = 5_000

export function useProcessEquipment(processId: number) {
  const [process, setProcess] = useState<Process | null>(null)
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const linesRef = useRef<Line[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    Promise.all([getProcess(processId), listLines(processId)])
      .then(async ([p, lines]) => {
        if (!active) return
        linesRef.current = lines
        setProcess(p)
        const liveAll = await Promise.all(lines.map((l) => listEquipmentLive(l.id)))
        if (!active) return
        setLineGroups(lines.map((l, i) => ({ line: l, equipments: liveAll[i] })))
        setLoading(false)
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : '불러오기 실패')
          setLoading(false)
        }
      })

    const t = setInterval(() => {
      const lines = linesRef.current
      if (!lines.length) return
      Promise.all(lines.map((l) => listEquipmentLive(l.id)))
        .then((liveAll) => {
          if (!active) return
          setLineGroups(lines.map((l, i) => ({ line: l, equipments: liveAll[i] })))
        })
        .catch(() => {})
    }, POLL_MS)

    return () => {
      active = false
      clearInterval(t)
    }
  }, [processId])

  const totalCount = lineGroups.reduce((s, g) => s + g.equipments.length, 0)
  const activeCount = lineGroups.reduce(
    (s, g) => s + g.equipments.filter((e) => e.isActive && e.hasData).length,
    0,
  )

  return { process, lineGroups, loading, error, totalCount, activeCount }
}
