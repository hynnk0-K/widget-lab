import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { LayoutMap, type MapPin } from '@/shared/ui/layout-map'

interface SiteDto {
  id: number
  companyId: number
  code: string
  name: string
  address: string | null
  createdAt: string
}

interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

interface FactoryDto {
  id: number
  siteId: number
  code: string
  name: string
  description: string | null
  hasImage: boolean
  createdAt: string
  updatedAt: string
}

export function SiteMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const siteId = Number(id)

  const [site, setSite] = useState<SiteDto | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [factories, setFactories] = useState<FactoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!siteId || Number.isNaN(siteId)) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      api.get<SiteDto>(`/master/sites/${siteId}`),
      api.get<LayoutImageDto>(`/master/sites/${siteId}/image`).catch(() => null),
      api.get<FactoryDto[]>(`/master/factories?siteId=${siteId}`),
    ])
      .then(([siteData, imgData, factoriesData]) => {
        if (!active) return
        setSite(siteData)
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({ base64: imgData.imageBase64, width: imgData.width, height: imgData.height })
        } else {
          setImage(null)
        }
        setFactories(factoriesData)
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
  }, [siteId])

  // ponytail: 공장(Factory)에는 아직 position 필드가 없어 핀 위치를 못 둔다.
  // 공정/라인처럼 backend FactoryDto/FactoryCreateRequest에 position 컬럼이 추가되면
  // 아래 position을 parsePosition(f.position)으로 바꾸고 onPinMove도 연결할 것.
  const pins: MapPin[] = useMemo(() => {
    return factories.map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      position: null,
      live: { hasData: false },
    }))
  }, [factories])

  async function handleImageUpload(base64: string, width: number, height: number) {
    await api.put<LayoutImageDto>(`/master/sites/${siteId}/image`, {
      imageBase64: base64,
      width,
      height,
    })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await api.delete(`/master/sites/${siteId}/image`)
    setImage(null)
  }

  // 공장 핀 클릭 → 공장 도면 페이지로 이동 (계층 탐색)
  function handlePinClick(pinId: number | string) {
    navigate(`/service/factory/${pinId}/map`)
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
          onClick={() => navigate('/system/site')}
          className="mt-3 h-8 px-4 text-[12px] text-red-600 underline"
        >
          사업장 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/system/site')}
            className="text-[12px] text-slate-400 hover:text-slate-600"
          >
            ← 사업장 목록
          </button>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {site?.name ?? '사업장'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            공장 {factories.length}개 · 핀 클릭 시 해당 공장 도면으로 이동
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
        onPinClick={handlePinClick}
      />
    </div>
  )
}
