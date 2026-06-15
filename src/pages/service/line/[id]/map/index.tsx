import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { LayoutMap, type MapPin } from '@/shared/ui/layout-map'

// ── 백엔드 DTO 타입 ─────────────────────────────────
interface LineDto {
  id: number
  processId: number
  code: string
  name: string
  description: string | null
  position: string | null
  imageWidth: number | null
  imageHeight: number | null
  hasImage: boolean
  createdAt: string
  updatedAt: string
}

interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

interface EquipmentDto {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  model: string | null
  manufacturer: string | null
  installedAt: string | null
  position: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface EquipmentLive {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string
  isActive: boolean
  hasData: boolean
  lastDataAt: string | null
}

const LIVE_POLL_MS = 5000

// 설비 타입별 대표 measurement key (실시간 값 표시용)
const TYPE_TO_METRIC: Record<string, string> = {
  CNC: 'spindle_load',
  COMPRESSOR: 'active_power',
}

const METRIC_LABEL: Record<string, string> = {
  spindle_load: '부하',
  active_power: '전력',
}

// JSONB 문자열 → 좌표 객체
function parsePosition(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return { x: p.x, y: p.y }
  } catch {
    /* ignore */
  }
  return null
}

export function LineMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lineId = Number(id)

  const [rows, setRows] = useState<Line[]>([])
  const [line, setLine] = useState<LineDto | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [liveMap, setLiveMap] = useState<Record<string, EquipmentLive>>({})
  // 디바이스별 최신 측정값 (호버 툴팁용)
  const [liveValues, setLiveValues] = useState<Record<string, number>>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  // ── 초기 로딩 — 라인 정보 + 도면 + 설비 + 실시간 상태 ──
  useEffect(() => {
    if (!lineId || Number.isNaN(lineId)) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      api.get<LineDto>(`/master/lines/${lineId}`),
      api.get<LayoutImageDto>(`/master/lines/${lineId}/image`).catch(() => null),
      api.get<EquipmentDto[]>(`/master/equipments?lineId=${lineId}`),
      api.get<EquipmentLive[]>(`/equipment-live?lineId=${lineId}`),
    ])
      .then(([lineData, imgData, equipsData, liveData]) => {
        if (!active) return
        setLine(lineData)
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({
            base64: imgData.imageBase64,
            width: imgData.width,
            height: imgData.height,
          })
        } else {
          setImage(null)
        }
        setEquipments(equipsData)
        setLiveMap(Object.fromEntries(liveData.map((l) => [l.code, l])))
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lineId])

  // ── 실시간 상태 5초마다 갱신 ──
  useEffect(() => {
    if (!lineId || Number.isNaN(lineId)) return
    const timer = setInterval(() => {
      api
        .get<EquipmentLive[]>(`/equipment-live?lineId=${lineId}`)
        .then((live) => setLiveMap(Object.fromEntries(live.map((l) => [l.code, l]))))
        .catch(() => {
          /* ignore polling errors */
        })
    }, LIVE_POLL_MS)
    return () => clearInterval(timer)
  }, [lineId])

  // ── 각 설비의 대표 측정값 polling ──
  useEffect(() => {
    if (equipments.length === 0) return
    let active = true

    async function loadValues() {
      const next: Record<string, number> = {}
      await Promise.all(
        equipments.map(async (eq) => {
          const metric = TYPE_TO_METRIC[eq.equipmentType ?? '']
          if (!metric) return
          const path = eq.equipmentType === 'CNC' ? 'cnc' : 'compressors'
          try {
            const data = await api.get<Record<string, unknown>>(
              `/${path}/latest?deviceId=${encodeURIComponent(eq.code)}`,
            )
            const camel = metric.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
            const v = data[camel]
            if (typeof v === 'number') next[eq.code] = v
          } catch {
            /* ignore */
          }
        }),
      )
      if (active) setLiveValues(next)
    }

    loadValues()
    const timer = setInterval(loadValues, LIVE_POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [equipments])

  // ── 설비 + 실시간 상태 → MapPin 변환 ──
  const pins: MapPin[] = useMemo(() => {
    return equipments.map((eq) => {
      const live = liveMap[eq.code]
      const metric = TYPE_TO_METRIC[eq.equipmentType ?? '']
      const value = liveValues[eq.code]
      let lastValueLabel: string | undefined
      if (metric && value !== undefined) {
        lastValueLabel = `${METRIC_LABEL[metric] ?? metric}: ${value.toFixed(1)}`
      }
      return {
        id: eq.id,
        code: eq.code,
        name: eq.name,
        position: parsePosition(eq.position),
        live: {
          hasData: live?.hasData ?? false,
          lastValueLabel,
        },
      }
    })
  }, [equipments, liveMap, liveValues])

  // ── 핸들러 ──
  async function handleImageUpload(base64: string, width: number, height: number) {
    await api.put<LayoutImageDto>(`/master/lines/${lineId}/image`, {
      imageBase64: base64,
      width,
      height,
    })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await api.delete(`/master/lines/${lineId}/image`)
    setImage(null)
  }

  async function handlePinMove(pinId: number | string, position: { x: number; y: number }) {
    const positionJson = JSON.stringify(position)
    await api.patch<EquipmentDto>(`/master/equipments/${pinId}/position`, {
      position: positionJson,
    })
    setEquipments((prev) =>
      prev.map((e) => (e.id === pinId ? { ...e, position: positionJson } : e)),
    )
  }

  function handlePinClick(pinId: number | string) {
    const eq = equipments.find((e) => e.id === pinId)
    if (eq) {
      console.log('선택된 설비:', eq)
      // 추후: 설비 상세 사이드 패널 열기
    }
  }

  // ── 렌더 ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[480px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-slate-400">도면 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-red-50 rounded-xl border border-red-200">
        <p className="text-[14px] text-red-600 m-0">{error}</p>
        <button
          onClick={() => navigate('/service/line')}
          className="mt-3 h-8 px-4 text-[12px] text-red-600 underline"
        >
          라인 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/service/line')}
              className="text-[12px] text-slate-400 hover:text-slate-600"
            >
              ← 라인 목록
            </button>
          </div>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {line?.name ?? '라인'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            설비 {equipments.length}개 · 실시간 연결{' '}
            {Object.values(liveMap).filter((l) => l.hasData).length}개
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <button
              onClick={() => setEditMode(false)}
              className="h-8 px-4 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors"
            >
              편집 종료
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="h-8 px-4 border border-slate-200 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25 2 14l.75-3L11.5 2.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              도면 편집
            </button>
          )}
        </div>
      </div>

      {/* 도면 + 핀 */}
      <LayoutMap
        image={image}
        pins={pins}
        editMode={editMode}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
        onPinMove={handlePinMove}
        onPinClick={handlePinClick}
      />
    </div>
  )
}
