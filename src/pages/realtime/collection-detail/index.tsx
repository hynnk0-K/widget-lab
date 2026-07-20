import { useParams, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DiagramMap } from '@/widgets/diagram-map'
import { SensorDetailPanel } from '@/entities/collection/ui/SensorDetailPanel'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import { useCollectionDetail } from './model/useCollectionDetail'

const DOT_CLASS: Record<DeviceRisk, string> = {
  normal: 'bg-emerald-400',
  caution: 'bg-amber-400',
  warning: 'bg-orange-400',
  danger: 'bg-red-500',
  offline: 'bg-slate-300',
}

const SUMMARY: { key: DeviceRisk; label: string; text: string }[] = [
  { key: 'normal', label: '정상', text: 'text-emerald-600' },
  { key: 'caution', label: '주의', text: 'text-amber-500' },
  { key: 'warning', label: '경고', text: 'text-orange-500' },
  { key: 'danger', label: '위험', text: 'text-red-600' },
  { key: 'offline', label: '단절', text: 'text-slate-500' },
]

const PARENT_LABEL: Record<string, string> = {
  FACTORY: '공장',
  PROCESS: '공정',
  LINE: '라인',
}

export function CollectionDetailPage() {
  const { type = '' } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const {
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
  } = useCollectionDetail(type)

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col h-full overflow-hidden">
        {/* 헤더 */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/realtime/environment')}
            className="text-[12px] text-slate-400 hover:text-slate-600"
          >
            ← 환경설비 모니터링
          </button>
          <span className="text-slate-300">›</span>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: meta.color }}
          />
          <span className="text-[13px] font-semibold text-slate-700">{meta.label}</span>
          <span className="text-[11px] text-slate-400">독립 수집 센서</span>
          <span className="ml-auto text-[11px] text-slate-400">전체 {rows.length}대</span>
          {loading && <span className="text-[11px] text-slate-400 ml-1">불러오는 중...</span>}
        </div>

        {/* 본체: 좌측 도면 / 우측 센서 검색 */}
        <div className="flex-1 p-3 overflow-hidden gap-3 grid grid-cols-[1fr_500px]">
          {/* 도면 — 선택 센서의 소속 계층 */}
          <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0 relative">
            {mapLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : diagram.nodes.length > 0 ? (
              <DiagramMap
                key={selected ? `${selected.parent_type}-${selected.parent_id}` : 'none'}
                nodes={diagram.nodes}
                edges={diagram.edges}
                editMode={false}
                backgroundImage={mapImage}
                sensorMarkers={markers}
                selectedDeviceCode={selectedCode}
                onMarkerClick={setSelectedCode}
                onDeviceClick={setSelectedCode}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <p className="m-0 text-[12px] text-slate-400">
                  센서를 선택하면 소속 계층 도면이 표시됩니다
                </p>
              </div>
            )}
          </div>

          {/* 요약 + 검색 목록 + 상세 */}
          <div className="flex flex-col gap-3 overflow-hidden min-w-0">
            <div className="grid grid-cols-5 gap-1.5">
              {SUMMARY.map((s) => (
                <div key={s.key} className="bg-white rounded-lg border border-slate-200 px-2 py-1.5">
                  <p className="m-0 text-[10px] text-slate-400">{s.label}</p>
                  <p className={`m-0 text-[16px] font-bold leading-tight ${s.text}`}>
                    {summary[s.key]}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 flex flex-col min-h-0 flex-1">
              <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="센서 코드·이름으로 검색"
                  className="flex-1 text-xs bg-transparent outline-none"
                />
                <span className="text-[11px] text-slate-400">{filteredRows.length}대</span>
              </div>
              <div className="flex-1 overflow-auto">
                {filteredRows.map((r) => (
                  <div
                    key={r.code}
                    onClick={() => setSelectedCode(selectedCode === r.code ? null : r.code)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer',
                      selectedCode === r.code && 'bg-blue-50 hover:bg-blue-50',
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DOT_CLASS[r.risk])} />
                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                      {r.code}
                      {r.name && <span className="ml-1.5 text-slate-400">{r.name}</span>}
                    </span>
                    {r.parent_type && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {PARENT_LABEL[r.parent_type]} #{r.parent_id}
                      </span>
                    )}
                    <span className="text-sm font-bold tabular-nums text-slate-900 whitespace-nowrap">
                      {r.valueText}
                    </span>
                  </div>
                ))}
                {filteredRows.length === 0 && !loading && (
                  <div className="p-6 text-center text-xs text-slate-400">조회 결과 없음</div>
                )}
              </div>
            </div>

            {selectedCode && (
              <div className="relative h-[420px] flex-shrink-0">
                <SensorDetailPanel sensorCode={selectedCode} onClose={() => setSelectedCode(null)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagementLayout>
  )
}
