import { useEffect, useRef, useState } from 'react'
import type { Widget, GaugeConfig } from '../model/types'
import { fetchLatest } from '../api/widgetApi'

const CX = 80
const CY = 88
const R = 64
const START_DEG = 225
const SWEEP_DEG = 270

const POLL_MS = 5_000

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function polarXY(deg: number, r = R) {
  const rad = toRad(deg)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arcPath(fromDeg: number, toDeg: number, r = R) {
  const s = polarXY(fromDeg, r)
  const e = polarXY(toDeg, r)
  const span = Math.abs(toDeg - fromDeg)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function needlePath(deg: number) {
  const tip = polarXY(deg, R - 10)
  const bL = polarXY(deg + 90, 6)
  const bR = polarXY(deg - 90, 6)
  return `M ${bL.x.toFixed(2)} ${bL.y.toFixed(2)} L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${bR.x.toFixed(2)} ${bR.y.toFixed(2)} Z`
}

interface Props {
  widget: Widget
}

export function GaugeWidget({ widget }: Props) {
  const cfg = widget.config as GaugeConfig
  const [value, setValue] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const v = await fetchLatest(widget.source.device, widget.source.metric)
      if (active && v !== null) setValue(v)
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric])

  const displayValue = value ?? 0
  const pct = Math.max(0, Math.min(1, (displayValue - cfg.min) / (cfg.max - cfg.min)))
  const valueDeg = START_DEG - pct * SWEEP_DEG
  const bgEnd = START_DEG - SWEEP_DEG

  const valueColor =
    displayValue >= cfg.warningAt
      ? '#ef4444'
      : displayValue >= cfg.warningAt * 0.8
        ? '#f59e0b'
        : '#22c55e'

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const deg = START_DEG - (i / 5) * SWEEP_DEG
    const inner = polarXY(deg)
    const outer = polarXY(deg, R + 8)
    const label = polarXY(deg, R + 18)
    const val = Math.round(cfg.min + (i / 5) * (cfg.max - cfg.min))
    return { inner, outer, label, val }
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {/* 실시간 표시 점 */}
          {value !== null && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
              title="실시간 연결됨"
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-2 pb-2 min-h-0">
        {value === null ? (
          /* 초기 로딩 */
          <div className="flex items-center justify-center h-full gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : (
          <svg viewBox="0 0 160 180" className="w-full max-w-[180px]">
            {/* 배경 트랙 */}
            <path
              d={arcPath(START_DEG, bgEnd)}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* 값 호 */}
            {pct > 0 && (
              <path
                d={arcPath(START_DEG, valueDeg)}
                fill="none"
                stroke={valueColor}
                strokeWidth="10"
                strokeLinecap="round"
              />
            )}

            {/* 눈금 */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line
                  x1={t.inner.x.toFixed(2)}
                  y1={t.inner.y.toFixed(2)}
                  x2={t.outer.x.toFixed(2)}
                  y2={t.outer.y.toFixed(2)}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={t.label.x.toFixed(2)}
                  y={t.label.y.toFixed(2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="7"
                  fill="#94a3b8"
                >
                  {t.val}
                </text>
              </g>
            ))}

            {/* 바늘 */}
            <path d={needlePath(valueDeg)} fill="#334155" />
            <circle cx={CX} cy={CY} r="5" fill="#334155" />
            <circle cx={CX} cy={CY} r="2.5" fill="white" />

            {/* 수치 */}
            <text
              x={CX}
              y={CY + 20}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill={valueColor}
            >
              {displayValue.toFixed(1)}
            </text>
            <text x={CX} y={CY + 30} textAnchor="middle" fontSize="7" fill="#94a3b8">
              {widget.source.metric}
            </text>
          </svg>
        )}
      </div>
    </div>
  )
}
