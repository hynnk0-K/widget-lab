import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { LayoutMap, type MapPin } from '@/shared/ui/layout-map'

interface ProcessDto {
  id: number
  factoryId: number
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

export function ProcessMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const processId = Number(id)

  const [process, setProcess] = useState<ProcessDto | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [lines, setLines] = useState<LineDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!processId || Number.isNaN(processId)) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      api.get<ProcessDto>(`/master/processes/${processId}`),
      api.get<LayoutImageDto>(`/master/processes/${processId}/image`).catch(() => null),
      api.get<LineDto[]>(`/master/lines?processId=${processId}`),
    ])
      .then(([processData, imgData, linesData]) => {
        if (!active) return
        setProcess(processData)
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({
            base64: imgData.imageBase64,
            width: imgData.width,
            height: imgData.height,
          })
        } else {
          setImage(null)
        }
        setLines(linesData)
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
  }, [processId])

  const pins: MapPin[] = useMemo(() => {
    return lines.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      position: parsePosition(l.position),
      live: { hasData: false },
    }))
  }, [lines])

  async function handleImageUpload(base64: string, width: number, height: number) {
    await api.put<LayoutImageDto>(`/master/processes/${processId}/image`, {
      imageBase64: base64,
      width,
      height,
    })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await api.delete(`/master/processes/${processId}/image`)
    setImage(null)
  }

  async function handlePinMove(pinId: number | string, position: { x: number; y: number }) {
    const target = lines.find((l) => l.id === pinId)
    if (!target) return
    const positionJson = JSON.stringify(position)
    await api.put<LineDto>(`/master/lines/${pinId}`, {
      processId: target.processId,
      code: target.code,
      name: target.name,
      description: target.description,
      position: positionJson,
      imageWidth: target.imageWidth,
      imageHeight: target.imageHeight,
    })
    setLines((prev) => prev.map((l) => (l.id === pinId ? { ...l, position: positionJson } : l)))
  }

  function handlePinClick(pinId: number | string) {
    navigate(`/service/line/${pinId}/map`)
  }

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
          onClick={() => navigate('/service/process')}
          className="mt-3 h-8 px-4 text-[12px] text-red-600 underline"
        >
          공정 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/service/process')}
            className="text-[12px] text-slate-400 hover:text-slate-600"
          >
            ← 공정 목록
          </button>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {process?.name ?? '공정'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            라인 {lines.length}개 · 핀 클릭 시 해당 라인 도면으로 이동
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
