import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { DiagramMap } from '@/shared/ui/diagram-map'
import {
  loadDiagram,
  saveDiagram,
  loadBgVisible,
  saveBgVisible,
  type DiagramData,
} from '@/shared/lib/diagramStorage'
import { readImageFile } from '@/shared/lib/readImageFile'

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

export function LineMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lineId = Number(id)

  const [line, setLine] = useState<LineDto | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [liveMap, setLiveMap] = useState<Record<string, EquipmentLive>>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const [showBg, setShowBg] = useState(() => loadBgVisible('line', lineId))
  const [bgUploading, setBgUploading] = useState(false)
  const [bgError, setBgError] = useState('')
  const bgFileInputRef = useRef<HTMLInputElement>(null)
  const saveDiagramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diagramRef = useRef(diagram)
  diagramRef.current = diagram

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
      loadDiagram('line', lineId),
    ])
      .then(([lineData, imgData, equipsData, liveData, diagramData]) => {
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
        setDiagram(diagramData)
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

  // 페이지를 떠날 때 디바운스 대기 중인 저장이 있으면 즉시 flush
  useEffect(() => {
    return () => {
      if (saveDiagramTimerRef.current) {
        clearTimeout(saveDiagramTimerRef.current)
        saveDiagram('line', lineId, diagramRef.current)
      }
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

  async function handleBgFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgError('')
    setBgUploading(true)
    try {
      const { base64, width, height } = await readImageFile(file)
      await handleImageUpload(base64, width, height)
    } catch (err) {
      setBgError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setBgUploading(false)
      if (bgFileInputRef.current) bgFileInputRef.current.value = ''
    }
  }

  // 드래그/리사이즈 중 매번 PUT 보내지 않도록 디바운스
  function handleDiagramChange(next: DiagramData) {
    setDiagram(next)
    if (saveDiagramTimerRef.current) clearTimeout(saveDiagramTimerRef.current)
    saveDiagramTimerRef.current = setTimeout(() => {
      saveDiagram('line', lineId, next)
    }, 600)
  }

  function toggleShowBg() {
    const next = !showBg
    setShowBg(next)
    saveBgVisible('line', lineId, next)
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
          {image && (
            <button
              onClick={toggleShowBg}
              className={`h-8 px-3 text-[12px] rounded-lg border transition-colors ${
                showBg
                  ? 'bg-[#003087] text-white border-[#003087]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              배경 이미지 {showBg ? '켜짐' : '꺼짐'}
            </button>
          )}
          {editMode && (
            <>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgFileChange}
                disabled={bgUploading}
                className="hidden"
                id="bg-file-input"
              />
              <label
                htmlFor="bg-file-input"
                className="h-8 px-3 text-[12px] bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center"
              >
                {bgUploading ? '업로드 중...' : image ? '배경 변경' : '배경 업로드'}
              </label>
              {image && (
                <button
                  onClick={handleImageDelete}
                  className="h-8 px-3 text-[12px] text-red-500 border border-slate-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  배경 삭제
                </button>
              )}
            </>
          )}
          {bgError && <span className="text-[11px] text-red-500">{bgError}</span>}
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

      {/* 도면 — 배경 이미지(선택) + 다이어그램 */}
      <DiagramMap
        nodes={diagram.nodes}
        edges={diagram.edges}
        editMode={editMode}
        equipmentOptions={equipments.map((eq) => ({ code: eq.code, name: eq.name }))}
        backgroundImage={showBg ? image : null}
        onChange={(nodes, edges) => handleDiagramChange({ nodes, edges })}
      />
    </div>
  )
}
