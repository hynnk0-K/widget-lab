import { useState, useRef, useEffect } from 'react'
import { readImageFile } from '@/shared/lib/readImageFile'
import type { LayoutMapProps, MapPin } from './types'

export function LayoutMap({
  image,
  pins,
  editMode = false,
  onPinClick,
  onImageUpload,
  onImageDelete,
  onPinMove,
}: LayoutMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 컨테이너 크기 추적
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // 파일 선택 → 업로드
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!onImageUpload) return

    setError('')

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일이 10MB를 초과합니다')
      return
    }

    // 이미지 타입만
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 가능합니다')
      return
    }

    setUploading(true)
    try {
      const { base64, width, height } = await readImageFile(file)
      await onImageUpload(base64, width, height)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
      // input 초기화 (같은 파일 다시 선택 가능하게)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!onImageDelete) return
    if (!confirm('도면 이미지를 삭제하시겠습니까?')) return
    setError('')
    try {
      await onImageDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  // 도면 없을 때 — placeholder + 업로드 UI
  if (!image || !image.base64) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-6">
        <svg
          className="w-16 h-16 text-slate-300 mb-3"
          fill="none"
          viewBox="0 0 64 64"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="8" y="8" width="48" height="48" rx="4" />
          <circle cx="22" cy="22" r="4" />
          <path d="M8 44l16-16 12 12 8-8 12 12" />
        </svg>
        <p className="text-[14px] font-medium text-slate-400 m-0">도면이 등록되지 않았습니다</p>

        {editMode && onImageUpload ? (
          <>
            <p className="text-[12px] text-slate-300 mt-1 mb-3 m-0">
              평면도 이미지를 업로드해주세요 (최대 10MB)
            </p>
            <label className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors cursor-pointer disabled:opacity-50">
              {uploading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>+ 도면 업로드</>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {error && <p className="text-[12px] text-red-500 mt-2 m-0">{error}</p>}
          </>
        ) : (
          <p className="text-[12px] text-slate-300 mt-1 m-0">
            편집 모드에서 도면을 등록할 수 있습니다
          </p>
        )}
      </div>
    )
  }

  // 도면 있을 때
  const scale = containerSize.width > 0 ? containerSize.width / image.width : 1
  const displayHeight = image.height * scale

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ minHeight: 480 }}
    >
      <img
        src={image.base64}
        alt="layout"
        className="w-full block"
        style={{ height: displayHeight }}
      />

      <div className="absolute inset-0 pointer-events-none">
        {pins.map((pin) => (
          <PinView
            key={pin.id}
            pin={pin}
            scale={scale}
            editMode={editMode}
            containerRef={containerRef}
            onClick={onPinClick}
            onMove={onPinMove}
          />
        ))}
      </div>

      {/* 우상단 정보 */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 border border-slate-200">
        핀 {pins.length}개 · 원본 {image.width}×{image.height}
      </div>

      {/* 편집 모드 — 이미지 변경/삭제 버튼 */}
      {editMode && onImageUpload && (
        <div className="absolute top-3 left-3 flex gap-2">
          <label className="inline-flex items-center gap-1.5 h-8 px-3 bg-white text-slate-700 text-[12px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
            {uploading ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                업로드 중
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 16 16"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M8 2v12M2 8l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                도면 변경
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {onImageDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-white text-red-500 text-[12px] font-medium rounded-lg border border-slate-200 hover:bg-red-50 transition-colors shadow-sm"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M3 4h10M5 4V2h6v2M5 7v6M8 7v6M11 7v6M4 4h8l-1 10H5L4 4z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              삭제
            </button>
          )}
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 text-[12px] px-3 py-1.5 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

// ─── 핀 (드래그 가능 버전) ──────────────────────────
interface PinViewProps {
  pin: MapPin
  scale: number
  editMode: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  onClick?: (id: number | string) => void
  onMove?: (id: number | string, position: { x: number; y: number }) => Promise<void>
}

function PinView({ pin, scale, editMode, containerRef, onClick, onMove }: PinViewProps) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  // 드래그 중 임시 위치 (원본 이미지 좌표 기준)
  const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(null)
  const dragStartedRef = useRef(false)

  if (!pin.position) return null

  // 표시할 좌표 = 드래그 중이면 임시 좌표, 아니면 props 좌표
  const currentPos = tempPos ?? pin.position
  const x = currentPos.x * scale
  const y = currentPos.y * scale

  // const hasLive = pin.live?.hasData
  // const pinColor = hasLive ? 'bg-green-500' : 'bg-slate-400'
  const hasLive = pin.live?.hasData
  const alarmStatus = pin.alarmStatus

  // 알람 우선: critical > warning > 실시간 데이터 여부
  const pinColor =
    alarmStatus === 'critical'
      ? 'bg-red-500'
      : alarmStatus === 'warning'
        ? 'bg-amber-500'
        : hasLive
          ? 'bg-green-500'
          : 'bg-slate-400'

  // 펄스 애니메이션도 알람 발생 시
  const showPulse = alarmStatus === 'critical' || alarmStatus === 'warning' || hasLive

  // 드래그 시작
  function handleMouseDown(e: React.MouseEvent) {
    if (!editMode || !onMove) return
    e.preventDefault()
    e.stopPropagation()

    setDragging(true)
    dragStartedRef.current = false

    function handleMouseMove(ev: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      // 컨테이너 기준 상대 좌표 (화면 픽셀)
      const screenX = ev.clientX - rect.left
      const screenY = ev.clientY - rect.top
      // 원본 이미지 좌표로 환산
      const originalX = Math.round(screenX / scale)
      const originalY = Math.round(screenY / scale)
      setTempPos({ x: originalX, y: originalY })
      dragStartedRef.current = true
    }

    async function handleMouseUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      setDragging(false)

      // 실제로 움직였을 때만 저장
      if (dragStartedRef.current && containerRef.current && onMove) {
        const rect = containerRef.current.getBoundingClientRect()
        const screenX = ev.clientX - rect.left
        const screenY = ev.clientY - rect.top
        const originalX = Math.round(screenX / scale)
        const originalY = Math.round(screenY / scale)

        try {
          await onMove(pin.id, { x: originalX, y: originalY })
          // 부모가 position 갱신해서 새 props로 내려올 때까지 tempPos 유지
          setTempPos({ x: originalX, y: originalY })
        } catch {
          // 실패 시 원래 위치로 복원
          setTempPos(null)
        }
      } else {
        setTempPos(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // 부모 props의 position이 바뀌면 tempPos 초기화
  // (저장 후 부모에서 새 position 내려옴)
  useEffect(() => {
    setTempPos(null)
  }, [pin.position?.x, pin.position?.y])

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: dragging ? 30 : 1,
      }}
    >
      <button
        type="button"
        onMouseEnter={() => !dragging && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          // 드래그 후 click 이벤트 막기
          if (dragStartedRef.current) {
            e.preventDefault()
            return
          }
          onClick?.(pin.id)
        }}
        className={[
          'relative group',
          editMode ? 'cursor-grab' : 'cursor-pointer',
          dragging && 'cursor-grabbing',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* {hasLive && !dragging && (
          <span className={`absolute inset-0 ${pinColor} rounded-full animate-ping opacity-50`} />
        )} */}
        {showPulse && !dragging && (
          <span className={`absolute inset-0 ${pinColor} rounded-full animate-ping opacity-50`} />
        )}
        <span
          className={[
            'relative block w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform',
            pinColor,
            dragging
              ? 'scale-150 ring-4 ring-blue-300'
              : pin.selected
                ? 'scale-150 ring-4 ring-blue-400'
                : 'hover:scale-125',
          ].join(' ')}
        />
      </button>

      {/* 호버 툴팁 — 드래그 중엔 숨김 */}
      {hovered && !dragging && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-slate-900 text-white text-[11px] rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg z-10">
          <div className="font-semibold">{pin.name}</div>
          <div className="text-slate-300 text-[10px]">{pin.code}</div>
          {pin.live?.lastValueLabel && (
            <div className="text-green-300 text-[10px] mt-0.5">{pin.live.lastValueLabel}</div>
          )}
          {/* ← 추가: 알람 상태 표시 */}
          {pin.alarmStatus === 'critical' && (
            <div className="text-red-300 text-[10px] mt-0.5 font-semibold">⚠ 심각 알람</div>
          )}
          {pin.alarmStatus === 'warning' && (
            <div className="text-amber-300 text-[10px] mt-0.5 font-semibold">⚠ 주의 알람</div>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}

      {/* 드래그 중 좌표 표시 */}
      {dragging && tempPos && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-full bg-blue-600 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap font-mono">
          ({tempPos.x}, {tempPos.y})
        </div>
      )}
    </div>
  )
}
