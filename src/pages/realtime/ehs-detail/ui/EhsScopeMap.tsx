import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { RISK_COLOR_BG, RISK_LABEL } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'

export interface EhsMapPin {
  code: string
  name: string
  position: { x: number; y: number } | null
  value: number | null
  unit: string
  risk: EhsRiskLevel
}

interface Props {
  image: { base64: string; width: number; height: number } | null
  pins: EhsMapPin[]
  selectedCode: string | null
  onPinClick: (code: string) => void
}

export function EhsScopeMap({ image, pins, selectedCode, onPinClick }: Props) {
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

  if (!image) {
    return (
      <div className="flex flex-wrap gap-2 p-3 content-start overflow-auto h-full">
        {pins.length === 0 && (
          <p className="text-[12px] text-slate-400 w-full text-center pt-8">
            라인을 선택하면 센서 위치가 표시됩니다
          </p>
        )}
        {pins.map((pin) => (
          <button
            key={pin.code}
            onClick={() => onPinClick(pin.code)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border-2 text-white text-left transition-transform hover:scale-105',
              RISK_COLOR_BG[pin.risk],
              selectedCode === pin.code ? 'ring-4 ring-blue-300 border-white' : 'border-white/60',
            )}
          >
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">
              {pin.name || pin.code}
            </span>
            <span className="text-[13px] font-bold leading-none">
              {pin.value != null ? `${pin.value.toFixed(1)}${pin.unit}` : '—'}
            </span>
            <span className="text-[9px] leading-none opacity-90">{RISK_LABEL[pin.risk]}</span>
          </button>
        ))}
      </div>
    )
  }

  const scale =
    size.width > 0 && size.height > 0
      ? Math.min(size.width / image.width, size.height / image.height)
      : 1
  const displayWidth = image.width * scale
  const displayHeight = image.height * scale

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white overflow-hidden flex items-center justify-center"
    >
      <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
        <img src={image.base64} alt="map" className="w-full h-full block" />
        {pins.map((pin) => {
          if (!pin.position) return null
          return (
            <div
              key={pin.code}
              className="absolute"
              style={{
                left: pin.position.x * scale,
                top: pin.position.y * scale,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                onClick={() => onPinClick(pin.code)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border-2 text-white shadow-md transition-transform hover:scale-105',
                  RISK_COLOR_BG[pin.risk],
                  selectedCode === pin.code
                    ? 'ring-4 ring-blue-300 border-white'
                    : 'border-white/60',
                )}
              >
                <span className="text-[9px] font-medium leading-none whitespace-nowrap">
                  {pin.name || pin.code}
                </span>
                <span className="text-[12px] font-bold leading-none">
                  {pin.value != null ? `${pin.value.toFixed(1)}${pin.unit}` : '—'}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
