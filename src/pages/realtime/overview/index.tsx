import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { api } from '@/shared/lib/api'
import { listEquipments } from '@/entities/equipment/api/equipmentApi'
import type { EquipmentDto } from '@/entities/equipment/model/types'
import { fetchAllLatest } from '@/entities/ehs/api/ehsApi'
import { getCategoryConfig, calcRisk, RISK_COLOR_BG } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'
import { allOf, childrenOf } from '@/shared/lib/masterTree'
import type { MasterNode } from '@/shared/lib/masterTree'

const EQ_TYPE_LABEL: Record<string, string> = {
  CNC: 'CNC 가공', COMPRESSOR: '컴프레서', AIRCLEAN: '대기방지',
  DRAINAGE: '배수', SEWAGE_TANK: '오수집수조', CUTTING_OIL: '절삭유',
  WBGT: '체감온도', WASTEWATER: '폐수', WASTE_THINNER: '폐신나',
  WASTE_CUTTING_OIL: '폐절삭유', LNG_FLOW: 'LNG유량', SEISMIC: '지진계',
  CONFINED_GAS: '밀폐공간 유해가스', MOTION: '모션센서',
}

type SensorData = { value: number | null; risk: EhsRiskLevel; unit: string }

const POLL_MS = 5000
const RISK_ORDER: EhsRiskLevel[] = ['danger', 'warning', 'caution', 'normal']

export function RealtimeOverviewPage() {
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
  const processes = useMemo(() => selFactory ? childrenOf(selFactory, 'process') : [], [selFactory])
  const selProcess = useMemo(() => processes.find((p) => p.id === pId) ?? null, [processes, pId])
  const lines = useMemo(() => selProcess ? childrenOf(selProcess, 'line') : [], [selProcess])
  const selLine = useMemo(() => lines.find((l) => l.id === lId) ?? null, [lines, lId])

  // 라인 선택 시 장비 + EHS 데이터 로드 & 폴링
  useEffect(() => {
    if (!lId) { setEquipments([]); setSensorMap(new Map()); return }
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const eqs = await listEquipments(lId!)
        if (cancelled) return
        setEquipments(eqs)

        // 장비 타입 → 카테고리 슬러그 (존재하는 것만)
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

  // 타입별 그룹 + 위험도 집계
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

  // 네비게이션 헬퍼
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

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col h-full overflow-hidden">
        {/* 브레드크럼 */}
        <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-1.5 text-[12px] flex-shrink-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300">›</span>}
              <button
                onClick={c.onClick}
                className={cn(
                  'transition-colors',
                  i === crumbs.length - 1
                    ? 'text-slate-700 font-medium cursor-default'
                    : 'text-slate-400 hover:text-[#003087]',
                )}
              >
                {c.label}
              </button>
            </span>
          ))}
          {loading && <span className="ml-auto text-[11px] text-slate-400">불러오는 중...</span>}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* 레벨 0: 공장 선택 */}
          {!fId && (
            <div className="grid grid-cols-3 gap-3">
              {factories.map((f) => (
                <button
                  key={f.id}
                  onClick={() => goFactory(f.id)}
                  className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-[#003087] hover:shadow-sm transition-all"
                >
                  <p className="text-[15px] font-semibold text-slate-800 m-0">{f.name}</p>
                  <p className="text-[11px] text-slate-400 m-0 mt-1">
                    공정 {childrenOf(f, 'process').length}개
                  </p>
                </button>
              ))}
              {factories.length === 0 && (
                <p className="col-span-3 text-[12px] text-slate-400 py-8 text-center">공장 데이터가 없습니다</p>
              )}
            </div>
          )}

          {/* 레벨 1: 공정 선택 */}
          {fId && !pId && (
            <div className="grid grid-cols-4 gap-3">
              {processes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goProcess(p.id)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-[#003087] hover:shadow-sm transition-all"
                >
                  <p className="text-[14px] font-semibold text-slate-800 m-0">{p.name}</p>
                  <p className="text-[11px] text-slate-400 m-0 mt-1">
                    라인 {childrenOf(p, 'line').length}개
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 레벨 2: 라인 선택 */}
          {fId && pId && !lId && (
            <div className="grid grid-cols-4 gap-3">
              {lines.map((l) => (
                <button
                  key={l.id}
                  onClick={() => goLine(l.id)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-[#003087] hover:shadow-sm transition-all"
                >
                  <p className="text-[14px] font-semibold text-slate-800 m-0">{l.name}</p>
                </button>
              ))}
            </div>
          )}

          {/* 레벨 3: 라인 내 설비 현황 */}
          {lId && (
            <div className="flex gap-4 h-full min-h-0">
              {/* 좌: 타입 그룹 패널 */}
              <div className="w-[240px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">설비 타입</p>

                {/* 전체 버튼 */}
                <button
                  onClick={() => toggleType('')}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors',
                    !selType
                      ? 'border-[#003087] bg-blue-50 text-[#003087]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="text-[12px] font-medium">전체</span>
                  <span className="text-[11px] text-slate-400">{equipments.length}대</span>
                </button>

                {typeGroups.map(({ type, eqs, counts, worstRisk }) => {
                  const label = EQ_TYPE_LABEL[type] ?? type
                  const isSelected = selType === type
                  const hasSensor = getCategoryConfig(type.toLowerCase()) != null
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        'flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        isSelected
                          ? 'border-[#003087] bg-blue-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-slate-700 leading-tight">{label}</span>
                        <span className="text-[11px] text-slate-400 ml-1 flex-shrink-0">{eqs.length}대</span>
                      </div>
                      {hasSensor ? (
                        <div className="flex gap-1 flex-wrap">
                          {RISK_ORDER.map((r) =>
                            counts[r] > 0 ? (
                              <span
                                key={r}
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full text-white leading-none',
                                  RISK_COLOR_BG[r],
                                )}
                              >
                                {counts[r]}
                              </span>
                            ) : null,
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">센서 없음</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 우: 센서 리스트 */}
              <div className="flex-1 flex flex-col min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {selType ? (EQ_TYPE_LABEL[selType] ?? selType) : '전체 설비'}
                  <span className="ml-2 normal-case font-normal">{displayedEquipments.length}대</span>
                </p>
                <div className="bg-white border border-slate-200 rounded-xl flex-1 overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-slate-500 w-4"></th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">코드</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">이름</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">타입</th>
                        <th className="text-right px-4 py-2 font-medium text-slate-500">현재값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedEquipments.map((eq) => {
                        const d = sensorMap.get(eq.code)
                        const risk = d?.risk ?? 'normal'
                        const hasData = !!d
                        return (
                          <tr key={eq.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <span className={cn('w-2 h-2 rounded-full block', hasData ? RISK_COLOR_BG[risk] : 'bg-slate-200')} />
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-700 font-mono">{eq.code}</td>
                            <td className="px-3 py-2.5 text-slate-500 max-w-[160px] truncate">{eq.name}</td>
                            <td className="px-3 py-2.5 text-slate-400">
                              {EQ_TYPE_LABEL[eq.equipmentType ?? ''] ?? eq.equipmentType ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {hasData ? (
                                <span className="font-bold tabular-nums text-slate-900">
                                  {d!.value != null ? d!.value.toFixed(1) : '—'}
                                  <span className="text-[10px] text-slate-400 ml-1 font-normal">{d!.unit}</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {displayedEquipments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                            설비 없음
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ManagementLayout>
  )
}
