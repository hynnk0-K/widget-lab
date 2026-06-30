import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Widget, CounterConfig } from '../model/types'
import { fetchLatest } from '../api/widgetApi'

const POLL_MS = 5_000

interface Props {
  widget: Widget
}

export function CounterCard({ widget }: Props) {
  const cfg = widget.config as CounterConfig
  const primaryLabel = cfg.primaryLabel ?? '양품'
  const secondaryLabel = cfg.secondaryLabel ?? '불량'

  const [primary, setPrimary] = useState<number | null>(null)
  const [secondary, setSecondary] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const [p, s] = await Promise.all([
        fetchLatest(widget.source.device, widget.source.metric),
        fetchLatest(widget.source.device, cfg.secondaryMetric),
      ])
      if (!active) return
      if (p !== null) setPrimary(Math.round(p))
      if (s !== null) setSecondary(Math.round(s))
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric, cfg.secondaryMetric])

  // 불량률 계산
  const total = (primary ?? 0) + (secondary ?? 0)
  const rejectRate = total > 0 && secondary !== null ? (secondary / total) * 100 : null

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {primary !== null && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 pb-3 min-h-0 gap-2">
        {primary === null && secondary === null ? (
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : (
          <>
            {/* 양품 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-[12px] text-slate-600">{primaryLabel}</span>
              </div>
              <span className="text-[18px] font-bold text-slate-800">
                {primary?.toLocaleString('ko-KR') ?? '-'}
              </span>
            </div>

            {/* 불량 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-[12px] text-slate-600">{secondaryLabel}</span>
              </div>
              <span className="text-[18px] font-bold text-slate-800">
                {secondary?.toLocaleString('ko-KR') ?? '-'}
              </span>
            </div>

            {/* 불량률 */}
            {rejectRate !== null && (
              <div className="border-t border-slate-100 pt-2 mt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">불량률</span>
                <span
                  className={`text-[14px] font-bold ${
                    rejectRate >= 8
                      ? 'text-red-500'
                      : rejectRate >= 5
                        ? 'text-amber-500'
                        : 'text-green-600'
                  }`}
                >
                  {rejectRate.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
