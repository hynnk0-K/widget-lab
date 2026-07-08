import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { listEquipments } from '@/entities/equipment/api/equipmentApi'
import type { EquipmentDto } from '@/entities/equipment/model/types'
import { fetchAllLatest } from '@/entities/ehs/api/ehsApi'
import { getCategoryConfig, calcRisk, RISK_COLOR_BG } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'
import { allOf, childrenOf } from '@/shared/lib/masterTree'
import type { MasterNode } from '@/shared/lib/masterTree'

export const EQ_TYPE_LABEL: Record<string, string> = {
  CNC: 'CNC 가공', COMPRESSOR: '컴프레서', AIRCLEAN: '대기방지',
  DRAINAGE: '배수', SEWAGE_TANK: '오수집수조', CUTTING_OIL: '절삭유',
  WBGT: '체감온도', WASTEWATER: '폐수', WASTE_THINNER: '폐신나',
  WASTE_CUTTING_OIL: '폐절삭유', LNG_FLOW: 'LNG유량', SEISMIC: '지진계',
  CONFINED_GAS: '밀폐공간 유해가스', MOTION: '모션센서',
}

type SensorData = { value: number | null; risk: EhsRiskLevel; unit: string }
export type { SensorData }

const POLL_MS = 5000
const RISK_ORDER: EhsRiskLevel[] = ['danger', 'warning', 'caution', 'normal']

export { RISK_ORDER, RISK_COLOR_BG }

export function useRealtimeOverview() {
  const [params, setParams] = useSearchParams()
  const fId = params.get('f') ? Number(params.get('f')) : null
  const pId = params.get('p') ? Number(params.get('p')) : null
  const lId = params.get('l') ? Number(params.get('l')) : null
  const selType = params.get('t') ?? null

  const [tree, setTree] = useState<MasterNode[]>([])
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [sensorMap, setSensorMap] = useState<Map<string, SensorData>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<MasterNode[]>('/master/tree').then(setTree).catch(() => {})
  }, [])

  const factories = useMemo(() => allOf(tree, 'factory'), [tree])
  const selFactory = useMemo(() => factories.find((f) => f.id === fId) ?? null, [factories, fId])
  const processes = useMemo(() => (selFactory ? childrenOf(selFactory, 'process') : []), [selFactory])
  const selProcess = useMemo(() => processes.find((p) => p.id === pId) ?? null, [processes, pId])
  const lines = useMemo(() => (selProcess ? childrenOf(selProcess, 'line') : []), [selProcess])
  const selLine = useMemo(() => lines.find((l) => l.id === lId) ?? null, [lines, lId])

  useEffect(() => {
    if (!lId) { setEquipments([]); setSensorMap(new Map()); return }
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const eqs = await listEquipments(lId!)
        if (cancelled) return
        setEquipments(eqs)

        const categories = [...new Set(
          eqs.map((e) => e.equipmentType?.toLowerCase()).filter(Boolean) as string[]
        )].filter((cat) => getCategoryConfig(cat) != null)

        const results = await Promise.allSettled(
          categories.map((cat) => fetchAllLatest(cat).then((rows) => ({ cat, rows })))
        )
        if (cancelled) return

        const map = new Map<string, SensorData>()
        for (const r of results) {
          if (r.status !== 'fulfilled') continue
          const { cat, rows } = r.value
          const cfg = getCategoryConfig(cat)!
          for (const row of rows) {
            const value = row[cfg.primaryMetric.key] as number | null
            const risk: EhsRiskLevel = value != null ? calcRisk(value, cfg.primaryMetric) : 'normal'
            map.set(row.device_code, { value, risk, unit: cfg.primaryMetric.unit })
          }
        }
        setSensorMap(map)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [lId])

  const typeGroups = useMemo(() => {
    const groups = new Map<string, { eqs: EquipmentDto[]; counts: Record<EhsRiskLevel, number> }>()
    for (const eq of equipments) {
      const t = eq.equipmentType ?? 'UNKNOWN'
      if (!groups.has(t)) groups.set(t, { eqs: [], counts: { normal: 0, caution: 0, warning: 0, danger: 0 } })
      const g = groups.get(t)!
      g.eqs.push(eq)
      const d = sensorMap.get(eq.code)
      if (d) g.counts[d.risk]++
    }
    return [...groups.entries()]
      .map(([type, { eqs, counts }]) => {
        const worstRisk: EhsRiskLevel = RISK_ORDER.find((r) => counts[r] > 0) ?? 'normal'
        return { type, eqs, counts, worstRisk }
      })
      .sort((a, b) => RISK_ORDER.indexOf(a.worstRisk) - RISK_ORDER.indexOf(b.worstRisk))
  }, [equipments, sensorMap])

  const displayedEquipments = useMemo(() => {
    const filtered = selType ? equipments.filter((e) => e.equipmentType === selType) : equipments
    return [...filtered].sort((a, b) => {
      const ra = sensorMap.get(a.code)?.risk ?? 'normal'
      const rb = sensorMap.get(b.code)?.risk ?? 'normal'
      return RISK_ORDER.indexOf(ra) - RISK_ORDER.indexOf(rb)
    })
  }, [equipments, selType, sensorMap])

  function goFactory(id: number) { setParams({ f: String(id) }) }
  function goProcess(id: number) { setParams({ f: String(fId!), p: String(id) }) }
  function goLine(id: number) { setParams({ f: String(fId!), p: String(pId!), l: String(id) }) }
  function toggleType(t: string) {
    const base = { f: String(fId!), p: String(pId!), l: String(lId!) }
    setParams(selType === t ? base : { ...base, t })
  }

  const crumbs = [
    { label: '전체', onClick: () => setParams({}) },
    ...(selFactory ? [{ label: selFactory.name, onClick: () => setParams({ f: String(fId!) }) }] : []),
    ...(selProcess ? [{ label: selProcess.name, onClick: () => setParams({ f: String(fId!), p: String(pId!) }) }] : []),
    ...(selLine ? [{ label: selLine.name, onClick: () => {} }] : []),
  ]

  return {
    fId, pId, lId, selType,
    factories, selFactory, processes, selProcess, lines, selLine,
    equipments, sensorMap, loading,
    typeGroups, displayedEquipments,
    goFactory, goProcess, goLine, toggleType,
    crumbs,
  }
}
