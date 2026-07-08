import { cn } from '@/shared/lib/cn'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { getCategoryConfig } from '@/entities/ehs/model/config'
import { childrenOf } from '@/shared/lib/masterTree'
import {
  useRealtimeOverview,
  EQ_TYPE_LABEL,
  RISK_COLOR_BG,
  RISK_ORDER,
} from './model/useRealtimeOverview'

export function RealtimeOverviewPage() {
  const {
    fId, pId, lId, selType,
    factories, processes, lines,
    equipments, sensorMap, loading,
    typeGroups, displayedEquipments,
    goFactory, goProcess, goLine, toggleType,
    crumbs,
  } = useRealtimeOverview()

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col h-full overflow-hidden">
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
          {!fId && (
            <div className="grid grid-cols-3 gap-3">
              {factories.map((f) => (
                <button
                  key={f.id}
                  onClick={() => goFactory(f.id)}
                  className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-[#003087] hover:shadow-sm transition-all"
                >
                  <p className="text-[15px] font-semibold text-slate-800 m-0">{f.name}</p>
                  <p className="text-[11px] text-slate-400 m-0 mt-1">공정 {childrenOf(f, 'process').length}개</p>
                </button>
              ))}
              {factories.length === 0 && (
                <p className="col-span-3 text-[12px] text-slate-400 py-8 text-center">공장 데이터가 없습니다</p>
              )}
            </div>
          )}

          {fId && !pId && (
            <div className="grid grid-cols-4 gap-3">
              {processes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goProcess(p.id)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-[#003087] hover:shadow-sm transition-all"
                >
                  <p className="text-[14px] font-semibold text-slate-800 m-0">{p.name}</p>
                  <p className="text-[11px] text-slate-400 m-0 mt-1">라인 {childrenOf(p, 'line').length}개</p>
                </button>
              ))}
            </div>
          )}

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

          {lId && (
            <div className="flex gap-4 h-full min-h-0">
              <div className="w-[240px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">설비 타입</p>
                <button
                  onClick={() => toggleType('')}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors',
                    !selType ? 'border-[#003087] bg-blue-50 text-[#003087]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="text-[12px] font-medium">전체</span>
                  <span className="text-[11px] text-slate-400">{equipments.length}대</span>
                </button>

                {typeGroups.map(({ type, eqs, counts }) => {
                  const label = EQ_TYPE_LABEL[type] ?? type
                  const isSelected = selType === type
                  const hasSensor = getCategoryConfig(type.toLowerCase()) != null
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        'flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        isSelected ? 'border-[#003087] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50',
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
                              <span key={r} className={cn('text-[10px] px-1.5 py-0.5 rounded-full text-white leading-none', RISK_COLOR_BG[r])}>
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
                            <td className="px-3 py-2.5 text-slate-400">{EQ_TYPE_LABEL[eq.equipmentType ?? ''] ?? eq.equipmentType ?? '—'}</td>
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
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-400">설비 없음</td>
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
