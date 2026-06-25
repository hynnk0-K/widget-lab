import { useEffect } from 'react'
import { AlertCircle, AlertTriangle, X, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useSnackbarStore } from '@/shared/store/snackbar'
import {
  SEVERITY_LABEL,
  METRIC_LABEL,
  METRIC_UNIT,
} from '@/pages/situation/alarm/types'
import type { Alarm, AlarmSeverity } from '@/pages/situation/alarm/types'

const AUTO_DISMISS_MS = 6000

const SEVERITY_STYLE: Record<
  AlarmSeverity,
  {
    bg: string
    border: string
    accentBar: string
    iconColor: string
    icon: typeof AlertCircle
    label: string
  }
> = {
  critical: {
    bg: 'bg-white',
    border: 'border-red-200',
    accentBar: 'bg-red-500',
    iconColor: 'text-red-500',
    icon: AlertCircle,
    label: '심각',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-amber-200',
    accentBar: 'bg-amber-500',
    iconColor: 'text-amber-500',
    icon: AlertTriangle,
    label: '주의',
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-200',
    accentBar: 'bg-blue-500',
    iconColor: 'text-blue-500',
    icon: AlertCircle,
    label: '정보',
  },
}

export function AlarmSnackbarContainer() {
  const items = useSnackbarStore((s) => s.items)

  return (
    <div className="fixed top-[60px] right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <AlarmSnackbar key={item.id} id={item.id} alarm={item.alarm} />
      ))}
    </div>
  )
}

interface Props {
  id: string
  alarm: Alarm
}

function AlarmSnackbar({ id, alarm }: Props) {
  const remove = useSnackbarStore((s) => s.remove)
  const navigate = useNavigate()
  const style = SEVERITY_STYLE[alarm.severity]
  const Icon = style.icon

  // 자동 닫힘
  useEffect(() => {
    const timer = setTimeout(() => remove(id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [id, remove])

  function handleClick() {
    // 알람 페이지로 이동 + URL 파라미터로 선택할 알람 ID 전달
    navigate(`/situation/alarm?alarmId=${alarm.alarmId}`)
    remove(id)
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation()
    remove(id)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'pointer-events-auto relative w-[340px] rounded-lg shadow-lg border overflow-hidden cursor-pointer',
        'transition-all duration-300 animate-slide-in-right',
        'hover:shadow-xl',
        style.bg,
        style.border,
      )}
    >
      {/* 좌측 강조 바 */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', style.accentBar)} />

      <div className="flex gap-3 p-3 pl-4">
        {/* 아이콘 */}
        <div className="flex-shrink-0 pt-0.5">
          <Icon className={cn('w-5 h-5', style.iconColor)} />
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          {/* 1행: 심각도 + 디바이스 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded text-white',
                style.accentBar,
              )}
            >
              {style.label}
            </span>
            <span className="text-[13px] font-semibold text-slate-800 truncate">
              {alarm.deviceName}
            </span>
          </div>

          {/* 2행: 메시지 */}
          <p className="text-[12px] text-slate-600 m-0 leading-snug">
            {METRIC_LABEL[alarm.metric] ?? alarm.metric}{' '}
            <span className="font-bold text-slate-900">
              {alarm.value} {METRIC_UNIT[alarm.metric] ?? ''}
            </span>
            <span className="text-slate-400">
              {' '}
              / 임계값 {alarm.threshold}
            </span>
          </p>

          {/* 3행: 위치 + 담당자 */}
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3" />
            <span>{alarm.line}</span>
            <span className="text-slate-300">·</span>
            <span>{alarm.location}</span>
          </div>

          {/* 4행: 담당자 */}
          <div className="text-[11px] text-slate-500 mt-0.5">
            담당자 <span className="text-slate-700 font-medium">김혜원</span>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 진행 바 (자동 닫힘 카운트다운) */}
      <div className="h-0.5 bg-slate-100">
        <div
          className={cn('h-full', style.accentBar)}
          style={{
            animation: `snackbar-progress ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  )
}