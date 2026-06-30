import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, Pause, HelpCircle } from 'lucide-react'
import type { Widget, StatusConfig } from '../model/types'
import { fetchLatest } from '../api/widgetApi'

const POLL_MS = 3_000

// 색깔별 클래스
const COLOR_CLASS = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', icon: Activity },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', icon: Pause },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', icon: AlertTriangle },
  gray: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', icon: HelpCircle },
} as const

interface Props {
  widget: Widget
}

export function StatusBadge({ widget }: Props) {
  const cfg = widget.config as StatusConfig
  const [value, setValue] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const v = await fetchLatest(widget.source.device, widget.source.metric)
      if (active && v !== null) setValue(Math.round(v))
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric])

  // 현재 상태 매핑
  const stateConfig = value !== null ? cfg.states[value] : null
  const color = stateConfig?.color ?? 'gray'
  const label = stateConfig?.label ?? '알 수 없음'
  const styles = COLOR_CLASS[color]
  const Icon = styles.icon

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <span className="text-[11px] text-slate-400">{widget.source.device}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-3 min-h-0">
        {value === null ? (
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-xl ${styles.bg} ${styles.text} w-full max-w-[200px]`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-[16px] font-bold">{label}</div>
            <div className="text-[10px] opacity-60">
              {widget.source.metric} = {value}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
