import { useNavigate } from 'react-router-dom'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DiagramMap } from '@/widgets/diagram-map'
import { RISK_LABEL } from '@/entities/ehs/model/config'
import { CategoryCard } from './ui/CategoryCard'
import { useEnvironmentMonitor } from './model/useEnvironmentMonitor'

const LEGEND = [
  { label: '정상', dot: 'bg-emerald-400' },
  { label: '주의', dot: 'bg-amber-400' },
  { label: '경고·위험', dot: 'bg-red-500' },
  { label: '통신단절', dot: 'bg-slate-300' },
]

const EVENT_BADGE: Record<string, string> = {
  caution: 'bg-amber-50 text-amber-600',
  warning: 'bg-orange-50 text-orange-600',
  danger: 'bg-red-50 text-red-600',
}

export function RealtimeEnvironmentPage() {
  const navigate = useNavigate()
  const {
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
  } = useEnvironmentMonitor()

  if (loading) {
    return (
      <ManagementLayout section="realtime">
        <div className="flex items-center justify-center min-h-[480px]">
          <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
        </div>
      </ManagementLayout>
    )
  }

  return (
    <ManagementLayout section="realtime">
      <div className="p-6 flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="m-0 text-[15px] font-semibold text-slate-800">환경설비 모니터링</h2>
            <p className="m-0 mt-0.5 text-[11px] text-slate-400">
              5초마다 갱신
              {updatedAt && ` · 마지막 ${updatedAt.toLocaleTimeString('ko-KR', { hour12: false })}`}
            </p>
          </div>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[12px]">
            <button
              onClick={() => setView('board')}
              className={`h-8 px-4 transition-colors ${
                view === 'board'
                  ? 'bg-[#003087] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              상황판
            </button>
            <button
              onClick={() => setView('map')}
              className={`h-8 px-4 transition-colors border-l border-slate-200 ${
                view === 'map'
                  ? 'bg-[#003087] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              도면
            </button>
          </div>
        </div>

        {/* 위험도 집계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="m-0 text-[11px] text-slate-400">정상</p>
            <p className="m-0 mt-0.5 text-[24px] font-bold leading-none text-emerald-600">
              {counts.normal}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="m-0 text-[11px] text-slate-400">주의</p>
            <p className="m-0 mt-0.5 text-[24px] font-bold leading-none text-amber-500">
              {counts.caution}
            </p>
          </div>
          <div
            className={`rounded-xl px-4 py-3 ${
              counts.alert > 0
                ? 'bg-red-50 border-2 border-red-300'
                : 'bg-white border border-slate-200'
            }`}
          >
            <p
              className={`m-0 text-[11px] ${counts.alert > 0 ? 'text-red-500' : 'text-slate-400'}`}
            >
              경고·위험
            </p>
            <p className="m-0 mt-0.5 text-[24px] font-bold leading-none text-red-600">
              {counts.alert}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="m-0 text-[11px] text-slate-400">통신단절</p>
            <p className="m-0 mt-0.5 text-[24px] font-bold leading-none text-slate-500">
              {counts.offline}
            </p>
          </div>
        </div>

        {view === 'board' ? (
          <>
            {/* 카테고리 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {groups.map((g) => (
                <CategoryCard
                  key={g.slug}
                  group={g}
                  onClick={() => navigate(`/realtime/ehs-detail/${g.slug}`)}
                />
              ))}
            </div>

            {/* 이상 이벤트 피드 */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-2.5 border-b border-slate-100 text-[12px] font-semibold text-slate-700">
                이상 이벤트
              </div>
              {events.length === 0 ? (
                <p className="m-0 px-4 py-3 text-[12px] text-slate-400">
                  등급 상승 이벤트가 없습니다
                </p>
              ) : (
                <ul className="m-0 p-0 list-none divide-y divide-slate-50 max-h-[240px] overflow-y-auto">
                  {events.map((ev) => (
                    <li key={ev.id} className="px-4 py-2 flex items-center gap-2 text-[12px]">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${EVENT_BADGE[ev.risk]}`}
                      >
                        {RISK_LABEL[ev.risk]}
                      </span>
                      <span className="text-slate-600 truncate">
                        {ev.categoryLabel} · {ev.message}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">
                        {ev.time}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 도면 뷰 컨트롤 */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={lineId ?? ''}
                onChange={(e) => setSelectedLineId(Number(e.target.value))}
                className="h-8 px-3 border border-slate-200 rounded-lg text-[12px] text-slate-700 bg-white focus:outline-none focus:border-[#003087]"
              >
                {mappedLines.length === 0 && <option value="">라인 없음</option>}
                {mappedLines.map(({ line, count }) => (
                  <option key={line.id} value={line.id}>
                    {line.name} · 센서 {count}개
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                {LEGEND.map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                    {l.label}
                  </span>
                ))}
              </div>
              {mappedCount === 0 && !mapLoading && (
                <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  환경 센서가 매핑된 라인 도면이 없습니다 — 라인 도면 편집에서 심볼에 설비를
                  연결하세요
                </span>
              )}
            </div>

            {mapLoading ? (
              <div className="flex items-center justify-center h-[560px] bg-white rounded-xl border border-slate-200">
                <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <DiagramMap
                nodes={diagram.nodes}
                edges={diagram.edges}
                editMode={false}
                backgroundImage={bgImage}
                sensorMarkers={sensorMarkers}
                onMarkerClick={(code) => {
                  const slug = slugByDevice[code]
                  if (slug) navigate(`/realtime/ehs-detail/${slug}`)
                }}
              />
            )}
          </>
        )}
      </div>
    </ManagementLayout>
  )
}
