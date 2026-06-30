import { useEffect, useRef, useState } from 'react'
import { WBGT_RISK_COLOR, WBGT_RISK_LABEL, type WbgtRiskLevel } from '@/entities/wbgt/model/wbgtRisk'

export interface WbgtZonePin {
  id: number
  name: string
  position: { x: number; y: number } | null
  value: number
  risk: WbgtRiskLevel
  selected?: boolean
}

// 공정 내 센서(라인) 여러 개를 한 번에 보여주는 요약 카드 — 개별 핀과 별개로 도면 위 대략 중심에 오버레이
export interface WbgtZoneSummary {
  position: { x: number; y: number }
  label: string
  count: number
  value: number
  risk: WbgtRiskLevel
}

interface Props {
  image: { base64: string; width: number; height: number } | null
  pins: WbgtZonePin[]
  onPinClick: (id: number) => void
  summary?: WbgtZoneSummary | null
}

function ZoneBadge({ pin, onClick }: { pin: WbgtZonePin; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border-2 border-white shadow-md text-white transition-transform hover:scale-105',
        WBGT_RISK_COLOR[pin.risk],
        pin.selected ? 'ring-4 ring-blue-300' : '',
      ].join(' ')}
    >
      <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{pin.name}</span>
      <span className="text-[13px] font-bold leading-none">{pin.value}°C</span>
      <span className="text-[10px] leading-none opacity-90">{WBGT_RISK_LABEL[pin.risk]}</span>
    </button>
  )
}

function SummaryBadge({ summary }: { summary: WbgtZoneSummary }) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border-2 border-dashed border-white shadow-lg text-white',
        WBGT_RISK_COLOR[summary.risk],
      ].join(' ')}
    >
      <span className="text-[10px] font-semibold leading-none whitespace-nowrap opacity-90">
        {summary.label} · {summary.count}개
      </span>
      <span className="text-[14px] font-bold leading-none">{summary.value}°C</span>
      <span className="text-[10px] leading-none opacity-90">{WBGT_RISK_LABEL[summary.risk]}</span>
    </div>
  )
}

export function WbgtZoneMap({ image, pins, onPinClick, summary }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // 도면 이미지가 없으면 카드 그리드로 폴백
  if (!image) {
    return (
      <div className="flex flex-wrap gap-3 p-4">
        {summary && <SummaryBadge summary={summary} />}
        {pins.map((pin) => (
          <ZoneBadge key={pin.id} pin={pin} onClick={() => onPinClick(pin.id)} />
        ))}
      </div>
    )
  }

  // 화면(컨테이너) 안에 꽉 차도록 — 가로/세로 중 더 빡빡한 쪽에 맞춰 축소(contain)
  const scale =
    size.width > 0 && size.height > 0
      ? Math.min(size.width / image.width, size.height / image.height)
      : 1
  const displayWidth = image.width * scale
  const displayHeight = image.height * scale

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[360px] bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center"
    >
      <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
        <img src={image.base64} alt="layout" className="w-full h-full block" />
        {pins.map((pin) => {
          if (!pin.position) return null
          return (
            <div
              key={pin.id}
              className="absolute"
              style={{
                left: pin.position.x * scale,
                top: pin.position.y * scale,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <ZoneBadge pin={pin} onClick={() => onPinClick(pin.id)} />
            </div>
          )
        })}
        {summary && (
          <div
            className="absolute"
            style={{
              left: summary.position.x * scale,
              top: summary.position.y * scale,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <SummaryBadge summary={summary} />
          </div>
        )}
      </div>
    </div>
  )
}
