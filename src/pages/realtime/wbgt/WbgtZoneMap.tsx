import { useEffect, useRef, useState } from 'react'
import { WBGT_RISK_COLOR, WBGT_RISK_LABEL, type WbgtRiskLevel } from './wbgtRisk'

export interface WbgtZonePin {
  id: number
  name: string
  position: { x: number; y: number } | null
  value: number
  risk: WbgtRiskLevel
  selected?: boolean
}

interface Props {
  image: { base64: string; width: number; height: number } | null
  pins: WbgtZonePin[]
  onPinClick: (id: number) => void
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

export function WbgtZoneMap({ image, pins, onPinClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // 도면 이미지가 없으면 카드 그리드로 폴백
  if (!image) {
    return (
      <div className="flex flex-wrap gap-3 p-4">
        {pins.map((pin) => (
          <ZoneBadge key={pin.id} pin={pin} onClick={() => onPinClick(pin.id)} />
        ))}
      </div>
    )
  }

  const scale = width > 0 ? width / image.width : 1
  const displayHeight = image.height * scale

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ minHeight: 360 }}
    >
      <img src={image.base64} alt="layout" className="w-full block" style={{ height: displayHeight }} />
      <div className="absolute inset-0">
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
      </div>
    </div>
  )
}
