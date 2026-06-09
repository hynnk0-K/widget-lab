import { useEffect, useRef, useState } from 'react'
import type { Widget, TrendConfig } from './types'
import { fetchTrend, type TrendPoint } from './widgetApi'

const W = 320
const H = 100
const PAD = { top: 12, right: 12, bottom: 24, left: 36 }
const POLL_MS = 30_000

interface Props {
  widget: Widget
}

export function TrendWidget({ widget }: Props) {
  const cfg = widget.config as TrendConfig
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const data = await fetchTrend(
        widget.source.device,
        widget.source.metric,
        cfg.hours,
        cfg.intervalMinutes,
      )
      if (active) {
        setPoints(data)
        setLoading(false)
      }
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric, cfg.hours, cfg.intervalMinutes])

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const hasData = points.length > 0
  const minVal = hasData ? Math.min(...points.map((p) => p.min)) : 0
  const maxVal = hasData ? Math.max(...points.map((p) => p.max)) : 100
  const range = maxVal - minVal || 1

  const toX = (i: number) =>
    PAD.left + (points.length < 2 ? 0 : (i / (points.length - 1)) * chartW)
  const toY = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH

  const avgLine = hasData
    ? points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.avg).toFixed(1)}`)
        .join(' ')
    : ''

  const areaPath = hasData
    ? [
        `M ${toX(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
        ...points.map((p, i) => `L ${toX(i).toFixed(1)} ${toY(p.avg).toFixed(1)}`),
        `L ${toX(points.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
        'Z',
      ].join(' ')
    : ''

  const bandPath = hasData
    ? [
        ...points.map(
          (p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.max).toFixed(1)}`,
        ),
        ...points.map(
          (_, i) =>
            `L ${toX(points.length - 1 - i).toFixed(1)} ${toY(points[points.length - 1 - i].min).toFixed(1)}`,
        ),
        'Z',
      ].join(' ')
    : ''

  const last = points[points.length - 1]
  const lastX = hasData ? toX(points.length - 1) : 0
  const lastY = hasData ? toY(last.avg) : 0

  const xLabels = hasData
    ? [0, Math.floor(points.length / 2), points.length - 1].map((idx) => ({
        x: toX(idx),
        label: new Date(points[idx].ts).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    : []

  const yLabels = [maxVal, (minVal + maxVal) / 2, minVal]

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-2 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {hasData && (
            <>
              <span className="text-[13px] font-bold text-[#003087]">{last.avg.toFixed(1)}</span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                title="실시간 연결됨"
              />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-[12px]">
            데이터 없음
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id={`area-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003087" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#003087" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {yLabels.map((_, i) => {
              const y = PAD.top + (i / 2) * chartH
              return (
                <line
                  key={i}
                  x1={PAD.left}
                  y1={y.toFixed(1)}
                  x2={PAD.left + chartW}
                  y2={y.toFixed(1)}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
              )
            })}

            <path d={bandPath} fill="#003087" opacity="0.06" />
            <path d={areaPath} fill={`url(#area-${widget.id})`} />

            <path
              d={avgLine}
              fill="none"
              stroke="#003087"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill="#003087" />

            {yLabels.map((v, i) => (
              <text
                key={i}
                x={PAD.left - 4}
                y={(PAD.top + (i / 2) * chartH).toFixed(1)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="8"
                fill="#94a3b8"
              >
                {v.toFixed(0)}
              </text>
            ))}

            {xLabels.map(({ x, label }, i) => (
              <text
                key={i}
                x={x.toFixed(1)}
                y={(PAD.top + chartH + 10).toFixed(1)}
                textAnchor="middle"
                fontSize="8"
                fill="#94a3b8"
              >
                {label}
              </text>
            ))}

            <text x={PAD.left} y={(PAD.top + chartH + 20).toFixed(1)} fontSize="7" fill="#cbd5e1">
              {widget.source.metric}
            </text>
          </svg>
        )}
      </div>
    </div>
  )
}
