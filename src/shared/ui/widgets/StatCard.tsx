import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Widget, StatConfig } from './types'
import { fetchLatest, fetchTrend } from './widgetApi'

const POLL_MS = 5_000

interface Props {
  widget: Widget
}

export function StatCard({ widget }: Props) {
  const cfg = widget.config as StatConfig
  const decimals = cfg.decimals ?? 1
  const unit = cfg.unit ?? ''
  const trendHours = cfg.trendHours ?? 24

  const [value, setValue] = useState<number | null>(null)
  const [avg, setAvg] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const [latestVal, trendPoints] = await Promise.all([
        fetchLatest(widget.source.device, widget.source.metric),
        fetchTrend(widget.source.device, widget.source.metric, trendHours, 60),
      ])
      if (!active) return
      if (latestVal !== null) setValue(latestVal)
      if (trendPoints.length > 0) {
        const meanAvg = trendPoints.reduce((sum, p) => sum + p.avg, 0) / trendPoints.length
        setAvg(meanAvg)
      }
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric, trendHours])

  // 추이 계산: 현재값 vs 기간 평균
  const trend =
    value !== null && avg !== null && avg !== 0 ? ((value - avg) / Math.abs(avg)) * 100 : null

  const trendIcon =
    trend === null || Math.abs(trend) < 1 ? (
      <Minus className="w-3 h-3 text-slate-400" />
    ) : trend > 0 ? (
      <TrendingUp className="w-3 h-3 text-red-500" />
    ) : (
      <TrendingDown className="w-3 h-3 text-blue-500" />
    )

  const trendColor =
    trend === null || Math.abs(trend) < 1
      ? 'text-slate-400'
      : trend > 0
        ? 'text-red-500'
        : 'text-blue-500'

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {value !== null && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-3 pb-3 min-h-0">
        {value === null ? (
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : (
          <>
            {/* 큰 숫자 */}
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-bold text-slate-800 leading-none">
                {value.toLocaleString('ko-KR', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}
              </span>
              {unit && <span className="text-[14px] text-slate-400 font-medium">{unit}</span>}
            </div>

            {/* 추이 */}
            {trend !== null && (
              <div className={`flex items-center gap-1 mt-2 text-[11px] ${trendColor}`}>
                {trendIcon}
                <span className="font-semibold">
                  {trend > 0 ? '+' : ''}
                  {trend.toFixed(1)}%
                </span>
                <span className="text-slate-400">vs {trendHours}h 평균</span>
              </div>
            )}

            <div className="text-[10px] text-slate-300 mt-1">{widget.source.metric}</div>
          </>
        )}
      </div>
    </div>
  )
}
