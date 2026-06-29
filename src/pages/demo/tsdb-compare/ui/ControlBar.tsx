import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface Props {
  intervalMs: number
  onIntervalChange: (ms: number) => void
  paused: boolean
  onPauseToggle: () => void
  onReset: () => void
}

const INTERVAL_OPTIONS = [
  { label: '1초', value: 1000 },
  { label: '2초', value: 2000 },
  { label: '5초', value: 5000 },
]

export function ControlBar({
  intervalMs,
  onIntervalChange,
  paused,
  onPauseToggle,
  onReset,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg">
      <span className="text-[12px] text-slate-500 font-medium">폴링 주기</span>
      <div className="flex gap-1">
        {INTERVAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onIntervalChange(opt.value)}
            disabled={paused}
            className={cn(
              'px-3 py-1 text-[12px] rounded-md font-medium transition-colors',
              intervalMs === opt.value
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              paused && 'opacity-50 cursor-not-allowed',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-slate-200" />

      <button
        onClick={onPauseToggle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 text-[12px] rounded-md font-medium transition-colors',
          paused
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        )}
      >
        {paused ? (
          <>
            <Play className="w-3 h-3" />
            재개
          </>
        ) : (
          <>
            <Pause className="w-3 h-3" />
            일시정지
          </>
        )}
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1 text-[12px] rounded-md font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        통계 초기화
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>TDengine</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>TimescaleDB</span>
        </div>
      </div>
    </div>
  )
}
