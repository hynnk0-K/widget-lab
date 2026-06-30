import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parsePosition } from '@/shared/lib/parsePosition'
import { LayoutMap, type MapPin } from '@/widgets/layout-map'
import {
  getFactory,
  getFactoryImage,
  putFactoryImage,
  deleteFactoryImage,
} from '@/entities/factory/api/factoryApi'
import type { Factory } from '@/entities/factory/model/types'
import { listProcesses, updateProcess } from '@/entities/process/api/processApi'
import type { Process } from '@/entities/process/model/types'

export function FactoryMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const factoryId = Number(id)

  const [factory, setFactory] = useState<Factory | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!factoryId || Number.isNaN(factoryId)) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      getFactory(factoryId),
      getFactoryImage(factoryId).catch(() => null),
      listProcesses(factoryId),
    ])
      .then(([factoryData, imgData, processesData]) => {
        if (!active) return
        setFactory(factoryData)
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({
            base64: imgData.imageBase64,
            width: imgData.width,
            height: imgData.height,
          })
        } else {
          setImage(null)
        }
        setProcesses(processesData)
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
  }, [factoryId])

  // 공정들 → MapPin 변환 (실시간 데이터 없음)
  const pins: MapPin[] = useMemo(() => {
    return processes.map((p) => {
      const parsed = parsePosition(p.position)
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        position: parsed ? { x: parsed.x, y: parsed.y } : null,
        size: parsed?.width && parsed?.height ? { width: parsed.width, height: parsed.height } : undefined,
        // 공정은 실시간 데이터 직접 없음 (그냥 회색 핀)
        live: { hasData: false },
      }
    })
  }, [processes])

  async function handleImageUpload(base64: string, width: number, height: number) {
    await putFactoryImage(factoryId, { imageBase64: base64, width, height })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await deleteFactoryImage(factoryId)
    setImage(null)
  }

  // 공정의 position 변경은 PUT으로 전체 업데이트 (별도 PATCH API 없음)
  async function savePosition(pinId: number | string, x: number, y: number, width?: number, height?: number) {
    const target = processes.find((p) => p.id === pinId)
    if (!target) return
    const positionJson = JSON.stringify({ x, y, ...(width && height ? { w: width, h: height } : {}) })
    await updateProcess(Number(pinId), {
      factoryId: target.factoryId,
      code: target.code,
      name: target.name,
      description: target.description ?? '',
      position: positionJson,
      imageWidth: target.imageWidth,
      imageHeight: target.imageHeight,
    })
    setProcesses((prev) => prev.map((p) => (p.id === pinId ? { ...p, position: positionJson } : p)))
  }

  function handlePinMove(pinId: number | string, position: { x: number; y: number }) {
    const existing = parsePosition(processes.find((p) => p.id === pinId)?.position ?? null)
    return savePosition(pinId, position.x, position.y, existing?.width, existing?.height)
  }

  function handlePinResize(pinId: number | string, size: { width: number; height: number }) {
    const existing = parsePosition(processes.find((p) => p.id === pinId)?.position ?? null)
    if (!existing) return Promise.resolve()
    return savePosition(pinId, existing.x, existing.y, size.width, size.height)
  }

  // 공정 핀 클릭 → 공정 도면 페이지로 이동 (계층 탐색)
  function handlePinClick(pinId: number | string) {
    navigate(`/service/process/${pinId}/map`)
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
          onClick={() => navigate('/service/factory')}
          className="mt-3 h-8 px-4 text-[12px] text-red-600 underline"
        >
          공장 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/service/factory')}
            className="text-[12px] text-slate-400 hover:text-slate-600"
          >
            ← 공장 목록
          </button>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {factory?.name ?? '공장'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            공정 {processes.length}개 · 핀 클릭 시 해당 공정 도면으로 이동
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
        pinStyle="card"
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
        onPinMove={handlePinMove}
        onPinResize={handlePinResize}
        onPinClick={handlePinClick}
      />
    </div>
  )
}
