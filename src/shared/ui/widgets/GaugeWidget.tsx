import { useMemo } from 'react'
import type { Widget, GaugeConfig } from './types'

const CX = 80
const CY = 88
const R = 64
const START_DEG = 225
const SWEEP_DEG = 270

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function polarPoint(deg: number) {
  const rad = toRad(deg)
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

function arcPath(fromDeg: number, toDeg: number, r = R) {
  const start = { x: CX + r * Math.cos(toRad(fromDeg)), y: CY + r * Math.sin(toRad(fromDeg)) }
  const end = { x: CX + r * Math.cos(toRad(toDeg)), y: CY + r * Math.sin(toRad(toDeg)) }
  const span = Math.abs(toDeg - fromDeg)
  const large = span > 180 ? 1 : 0
  // counter-clockwise (sweep=0) from fromDeg to toDeg
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

// needle tip and base
function needlePath(deg: number) {
  const tipR = R - 8
  const tip = { x: CX + tipR * Math.cos(toRad(deg)), y: CY + tipR * Math.sin(toRad(deg)) }
  const baseL = { x: CX + 6 * Math.cos(toRad(deg + 90)), y: CY + 6 * Math.sin(toRad(deg + 90)) }
  const baseR = { x: CX + 6 * Math.cos(toRad(deg - 90)), y: CY + 6 * Math.sin(toRad(deg - 90)) }
  return `M ${baseL.x.toFixed(2)} ${baseL.y.toFixed(2)} L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${baseR.x.toFixed(2)} ${baseR.y.toFixed(2)} Z`
}

// deterministic mock value from widget id
function mockValue(id: string, min: number, max: number) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return min + ((hash % 1000) / 1000) * (max - min)
}

interface Props {
  widget: Widget
}

export function GaugeWidget({ widget }: Props) {
  const cfg = widget.config as GaugeConfig
  const value = useMemo(() => mockValue(widget.id, cfg.min, cfg.max), [widget.id, cfg.min, cfg.max])
  const pct = (value - cfg.min) / (cfg.max - cfg.min)

  // bg arc: from 225° counter-clockwise 270° to 315°
  const bgEnd = START_DEG - SWEEP_DEG  // = -45° = 315°
  const bgPath = arcPath(START_DEG, bgEnd)

  // value arc
  const valueDeg = START_DEG - pct * SWEEP_DEG
  const valPath = pct > 0 ? arcPath(START_DEG, valueDeg) : null

  // needle angle
  const needleDeg = START_DEG - pct * SWEEP_DEG

  // color
  const valueColor =
    value >= cfg.warningAt
      ? '#ef4444'
      : value >= cfg.warningAt * 0.8
        ? '#f59e0b'
        : '#22c55e'

  // tick marks
  const ticks = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const deg = START_DEG - (i / 5) * SWEEP_DEG
      const inner = polarPoint(deg)
      const outerR = R + 8
      const outer = { x: CX + outerR * Math.cos(toRad(deg)), y: CY + outerR * Math.sin(toRad(deg)) }
      const labelR = R + 18
      const label = { x: CX + labelR * Math.cos(toRad(deg)), y: CY + labelR * Math.sin(toRad(deg)) }
      const val = Math.round(cfg.min + (i / 5) * (cfg.max - cfg.min))
      return { inner, outer, label, val, deg }
    })
  }, [cfg.min, cfg.max])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <span className="text-[11px] text-slate-400 shrink-0 ml-1">
          {widget.source.device}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-2 pb-2 min-h-0">
        <svg viewBox="0 0 160 120" className="w-full max-w-[180px]">
          {/* background track */}
          <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />

          {/* value arc */}
          {valPath && (
            <path d={valPath} fill="none" stroke={valueColor} strokeWidth="10" strokeLinecap="round" />
          )}

          {/* ticks */}
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

          {/* needle */}
          <path d={needlePath(needleDeg)} fill="#334155" />
          <circle cx={CX} cy={CY} r="5" fill="#334155" />
          <circle cx={CX} cy={CY} r="2.5" fill="white" />

          {/* value text */}
          <text x={CX} y={CY + 20} textAnchor="middle" fontSize="16" fontWeight="700" fill={valueColor}>
            {value.toFixed(1)}
          </text>
          <text x={CX} y={CY + 30} textAnchor="middle" fontSize="7" fill="#94a3b8">
            {widget.source.metric}
          </text>
        </svg>
      </div>
    </div>
  )
}
