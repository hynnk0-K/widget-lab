import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ExternalLink } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { RISK_COLOR_BG } from '@/entities/ehs/model/config'
import { DiagramMap } from '@/widgets/diagram-map/DiagramMap'
import { EhsSummaryCards } from './ui/EhsSummaryCards'
import { EhsDeviceDetailPanel } from './ui/EhsDeviceDetailPanel'
import { EhsScopeMap } from './ui/EhsScopeMap'
import { useEhsDetail } from './model/useEhsDetail'

export function EhsDetailPage() {
  const { category = '' } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    config,
    loading,
    error,
    rows,
    factories,
    processes,
    lines,
    scopeFactory,
    scopeProcess,
    scopeLine,
    selectFactory,
    selectProcess,
    setScopeLine,
    selectedDeviceCode,
    handleDeviceSelect,
    mapImage,
    diagram,
    alarmStatusByDevice,
    mapPins,
    filter,
    setFilter,
    search,
    setSearch,
    scopedRows,
    filteredRows,
    summary,
  } = useEhsDetail(category, searchParams.get('device'))

  if (!config) {
    return (
      <ManagementLayout section="realtime">
        <div className="p-8">
          <p className="text-red-600">알 수 없는 카테고리: {category}</p>
        </div>
      </ManagementLayout>
    )
  }

  const Icon = config.icon

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col h-full overflow-hidden">
        {/* 스코프 셀렉터 */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
          <select
            value={scopeFactory?.id ?? ''}
            onChange={(e) =>
              selectFactory(factories.find((f) => f.id === Number(e.target.value)) ?? null)
            }
            className="border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[12px] text-slate-700 outline-none"
          >
            <option value="">공장 선택</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {scopeFactory && (
            <>
              <span className="text-slate-300">›</span>
              <select
                value={scopeProcess?.id ?? ''}
                onChange={(e) =>
                  selectProcess(processes.find((p) => p.id === Number(e.target.value)) ?? null)
                }
                className="border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[12px] text-slate-700 outline-none"
              >
                <option value="">공정 선택</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {scopeProcess && (
            <>
              <span className="text-slate-300">›</span>
              <select
                value={scopeLine?.id ?? ''}
                onChange={(e) =>
                  setScopeLine(lines.find((l) => l.id === Number(e.target.value)) ?? null)
                }
                className="border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[12px] text-slate-700 outline-none"
              >
                <option value="">라인 선택</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            {scopeLine ? `${scopeLine.name} · ${scopedRows.length}대` : `전체 ${rows.length}대`}
          </span>
          {loading && <span className="text-[11px] text-slate-400 ml-1">불러오는 중...</span>}
        </div>

        {/* 본체: 좌측 도면 / 우측 설비 검색 */}
        <div className="flex-1 p-3 overflow-hidden gap-3 grid grid-cols-[1fr_500px]">
          {/* 도면 — 선택된 최하위 계층(라인 > 공정 > 공장) 기준 */}
          <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
            {diagram.nodes.length > 0 ? (
              <DiagramMap
                nodes={diagram.nodes}
                edges={diagram.edges}
                editMode={false}
                backgroundImage={mapImage}
                selectedDeviceCode={selectedDeviceCode}
                alarmStatusByDevice={alarmStatusByDevice}
                onDeviceClick={handleDeviceSelect}
              />
            ) : mapImage || mapPins.length > 0 ? (
              <EhsScopeMap
                image={mapImage}
                pins={mapPins}
                selectedCode={selectedDeviceCode}
                onPinClick={handleDeviceSelect}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <p className="m-0 text-[12px] text-slate-400">
                  {scopeFactory
                    ? '이 계층에 등록된 도면이 없습니다'
                    : '공장을 선택하면 도면이 표시됩니다'}
                </p>
              </div>
            )}
          </div>

          {/* 요약 카드 + 목록 + 상세 */}
          <div className="flex flex-col gap-3 overflow-hidden min-w-0">
            <EhsSummaryCards
              total={scopedRows.length}
              summary={summary}
              filter={filter}
              onFilterChange={setFilter}
            />

            <div className="bg-white rounded-lg border border-slate-200 flex flex-col min-h-0 flex-1">
              <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="설비 코드로 검색"
                  className="flex-1 text-xs bg-transparent outline-none"
                />
                <span className="text-[11px] text-slate-400">{filteredRows.length}대</span>
              </div>
              <div className="flex-1 overflow-auto">
                {error && <div className="p-3 text-xs text-red-600">{error}</div>}
                {filteredRows.map(({ row, value, risk }) => (
                  <div
                    key={row.device_code}
                    onClick={() => handleDeviceSelect(row.device_code)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer',
                      selectedDeviceCode === row.device_code && 'bg-blue-50 hover:bg-blue-50',
                    )}
                  >
                    <span
                      className={cn('w-2 h-2 rounded-full flex-shrink-0', RISK_COLOR_BG[risk])}
                    />
                    <span className="text-xs font-medium text-slate-700 flex-1">
                      {row.device_code}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {value != null ? value.toFixed(1) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 w-8">
                      {config.primaryMetric.unit}
                    </span>
                    {scopeLine && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/service/line/${scopeLine.id}/map`)
                        }}
                        className="text-slate-300 hover:text-slate-600 flex-shrink-0"
                        title="도면으로 이동"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {filteredRows.length === 0 && !loading && !error && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {scopeLine && scopedRows.length === 0
                      ? '이 라인에 해당 센서가 없습니다'
                      : '조회 결과 없음'}
                  </div>
                )}
              </div>
            </div>

            {selectedDeviceCode && (
              <EhsDeviceDetailPanel
                category={category}
                deviceCode={selectedDeviceCode}
                config={config}
              />
            )}
          </div>
        </div>
      </div>
    </ManagementLayout>
  )
}
