import { useMemo } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Alarm, AlarmSeverity, AlarmStatus } from '@/entities/alarm/model/types'
import { SEVERITY_LABEL, STATUS_LABEL, METRIC_LABEL, METRIC_UNIT } from '@/entities/alarm/model/types'

interface Props {
  alarms: Alarm[]
  selectedId: number | null
  onSelect: (id: number) => void
}

// 발생 시각 → 상대 시간 ('방금', '5분 전', '2시간 전')
function formatAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

const SEVERITY_STYLE: Record<AlarmSeverity, { dot: string; text: string; bg: string }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  info: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
}

const STATUS_STYLE: Record<AlarmStatus, string> = {
  active: 'text-red-600 bg-red-50',
  acknowledged: 'text-amber-600 bg-amber-50',
  in_progress: 'text-blue-600 bg-blue-50',
  resolved: 'text-slate-500 bg-slate-100',
}

export function AlarmListPanel({ alarms, selectedId, onSelect }: Props) {
  // 정렬: 미처리 먼저 (severity critical > warning), 그 다음 인지/조치중, 완료 마지막
  // 같은 그룹 내에선 최신순
  const sorted = useMemo(() => {
    const statusOrder: Record<AlarmStatus, number> = {
      active: 0,
      acknowledged: 1,
      in_progress: 2,
      resolved: 3,
    }
    const severityOrder: Record<AlarmSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    }
    return [...alarms].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    })
  }, [alarms])

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <span className="text-[13px] font-semibold text-slate-700">
          활성 알람 ({alarms.length})
        </span>
        <span className="text-[11px] text-slate-400">최근순</span>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">
            활성 알람이 없습니다
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map((a) => {
              const isSelected = a.alarmId === selectedId
              const sev = SEVERITY_STYLE[a.severity]
              const isResolved = a.status === 'resolved'
              return (
                <li key={a.alarmId}>
                  <button
                    onClick={() => onSelect(a.alarmId)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors hover:bg-slate-50',
                      isSelected && 'bg-blue-50 hover:bg-blue-50',
                      isResolved && 'opacity-60',
                    )}
                  >
                    {/* 1행: 심각도 점 + 디바이스 + 시각 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', sev.dot)} />
                        <span className="text-[13px] font-semibold text-slate-800">
                          {a.deviceName}
                        </span>
                        <span className="text-[11px] text-slate-400">{a.line}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatAgo(a.occurredAt)}</span>
                    </div>

                    {/* 2행: 메트릭 + 값 + 임계값 */}
                    <div className="flex items-center gap-1.5 mb-2 pl-4">
                      <span className="text-[12px] text-slate-600">
                        {METRIC_LABEL[a.metric] ?? a.metric}
                      </span>
                      <span className={cn('text-[13px] font-bold', sev.text)}>
                        {a.value} {METRIC_UNIT[a.metric] ?? ''}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        / 임계값 {a.threshold} {METRIC_UNIT[a.metric] ?? ''}
                      </span>
                    </div>

                    {/* 3행: 심각도 + 상태 뱃지 */}
                    <div className="flex items-center gap-1.5 pl-4">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          sev.bg,
                          sev.text,
                        )}
                      >
                        {SEVERITY_LABEL[a.severity]}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          STATUS_STYLE[a.status],
                        )}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
