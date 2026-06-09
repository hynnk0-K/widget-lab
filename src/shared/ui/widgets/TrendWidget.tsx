import { useMemo } from 'react'
import type { Widget, TrendConfig } from './types'

const W = 320
const H = 100
const PAD = { top: 12, right: 12, bottom: 24, left: 36 }

function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

interface Props {
  widget: Widget
}

export function TrendWidget({ widget }: Props) {
  const cfg = widget.config as TrendConfig
  const pointCount = Math.min(Math.max(cfg.hours * 4, 12), 48)

  const data = useMemo(() => {
    let seed = 0
    for (let i = 0; i < widget.id.length; i++) seed = (seed * 31 + widget.id.charCodeAt(i)) & 0xffff
    const rand = seededRand(seed)
    const points: number[] = []
    let v = 40 + rand() * 30
    for (let i = 0; i < pointCount; i++) {
      v += (rand() - 0.48) * 8
      v = Math.max(5, Math.min(95, v))
      points.push(v)
    }
    return points
  }, [widget.id, pointCount])

  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const points = data.map((v, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((v - minVal) / range) * chartH,
  }))

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // area fill path
  const areaPath = [
    `M ${points[0].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    ...points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    'Z',
  ].join(' ')

  // y-axis labels (3 ticks)
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal]

  // x-axis: last N hours
  const now = new Date()
  const xTicks = [cfg.hours, cfg.hours / 2, 0].map((h) => {
    const d = new Date(now.getTime() - h * 3600000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  const last = data[data.length - 1]
  const lastPt = points[points.length - 1]

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-2 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          <span className="text-[13px] font-bold text-[#003087]">{last.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003087" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#003087" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* grid lines */}
          {yTicks.map((_, i) => {
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

          {/* area */}
          <path d={areaPath} fill={`url(#grad-${widget.id})`} />

          {/* line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#003087"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* last point dot */}
          <circle cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)} r="3" fill="#003087" />

          {/* y-axis labels */}
          {yTicks.map((v, i) => {
            const y = PAD.top + chartH - (i / 2) * chartH
            return (
              <text key={i} x={PAD.left - 4} y={y.toFixed(1)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#94a3b8">
                {v.toFixed(0)}
              </text>
            )
          })}

          {/* x-axis labels */}
          {xTicks.map((label, i) => {
            const x = PAD.left + (i / 2) * chartW
            return (
              <text key={i} x={x.toFixed(1)} y={(PAD.top + chartH + 10).toFixed(1)} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {label}
              </text>
            )
          })}

          {/* metric label */}
          <text x={PAD.left} y={(PAD.top + chartH + 20).toFixed(1)} fontSize="7" fill="#cbd5e1">
            {widget.source.metric}
          </text>
        </svg>
      </div>
    </div>
  )
}
