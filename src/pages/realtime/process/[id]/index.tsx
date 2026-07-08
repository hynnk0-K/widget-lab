import { useNavigate, useParams } from 'react-router-dom'
import { useProcessEquipment } from './model/useProcessEquipment'

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  comm: 'bg-amber-400',
  inactive: 'bg-slate-300',
}

function eqStatus(isActive: boolean, hasData: boolean) {
  if (!isActive) return 'inactive'
  return hasData ? 'active' : 'comm'
}

const STATUS_LABEL = { active: '정상', comm: '통신이상', inactive: '비활성' }

export function ProcessEquipmentPage() {
  const { id } = useParams<{ id: string }>()
  const processId = Number(id)
  const navigate = useNavigate()
  const { process, lineGroups, loading, error, totalCount, activeCount } =
    useProcessEquipment(processId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="뒤로"
        >
          ←
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">
            {process?.name ?? '공정'} · 설비 현황
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            전체 {totalCount}대 · 정상 {activeCount}대
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />정상
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-2" />통신이상
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block ml-2" />비활성
        </div>
      </div>

      {/* Line groups */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {lineGroups.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-slate-400">
            라인 정보 없음
          </div>
        ) : (
          lineGroups.map(({ line, equipments }) => (
            <div key={line.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-[13px] font-semibold text-slate-700">{line.name}</span>
                <span className="text-[11px] text-slate-400">
                  설비 {equipments.length}대 · 정상{' '}
                  {equipments.filter((e) => e.isActive && e.hasData).length}대
                </span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {equipments.length === 0 ? (
                  <span className="col-span-full text-[12px] text-slate-400">설비 없음</span>
                ) : (
                  equipments.map((eq) => {
                    const st = eqStatus(eq.isActive, eq.hasData)
                    return (
                      <div
                        key={eq.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white transition-colors"
                        title={`${STATUS_LABEL[st]} · ${eq.lastDataAt ? new Date(eq.lastDataAt).toLocaleString('ko-KR') : '데이터 없음'}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[st]}`} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-slate-700 truncate">
                            {eq.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{eq.code}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
