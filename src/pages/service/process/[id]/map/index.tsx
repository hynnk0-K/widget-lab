import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parsePosition } from '@/shared/lib/parsePosition'
import { LayoutMap, type MapPin } from '@/widgets/layout-map'
import { DiagramMap } from '@/widgets/diagram-map'
import {
  loadMapMode,
  saveMapMode,
  loadDiagram,
  saveDiagram,
  type MapMode,
  type DiagramData,
} from '@/shared/lib/diagramStorage'
import {
  getProcess,
  getProcessImage,
  putProcessImage,
  deleteProcessImage,
} from '@/entities/process/api/processApi'
import type { Process } from '@/entities/process/model/types'
import { listLines, updateLine } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'

export function ProcessMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const processId = Number(id)

  const [process, setProcess] = useState<Process | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [mode, setMode] = useState<MapMode>(() => loadMapMode('process', processId))
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const saveDiagramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diagramRef = useRef(diagram)
  diagramRef.current = diagram

  useEffect(() => {
    if (!processId || Number.isNaN(processId)) return
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      getProcess(processId),
      getProcessImage(processId).catch(() => null),
      listLines(processId),
      loadDiagram('process', processId),
    ])
      .then(([processData, imgData, linesData, diagramData]) => {
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
  }, [processId])

  // 페이지를 떠날 때 디바운스 대기 중인 저장이 있으면 즉시 flush
  useEffect(() => {
    return () => {
      if (saveDiagramTimerRef.current) {
        clearTimeout(saveDiagramTimerRef.current)
        saveDiagram('process', processId, diagramRef.current)
      }
    }
  }, [processId])

  const pins: MapPin[] = useMemo(() => {
    return lines.map((l) => {
      const parsed = parsePosition(l.position)
      return {
        id: l.id,
        code: l.code,
        name: l.name,
        position: parsed ? { x: parsed.x, y: parsed.y } : null,
        size:
          parsed?.width && parsed?.height
            ? { width: parsed.width, height: parsed.height }
            : undefined,
        live: { hasData: false },
      }
    })
  }, [lines])

  // 드래그/리사이즈 중 매번 PUT 보내지 않도록 디바운스
  function handleDiagramChange(next: DiagramData) {
    setDiagram(next)
    if (saveDiagramTimerRef.current) clearTimeout(saveDiagramTimerRef.current)
    saveDiagramTimerRef.current = setTimeout(() => {
      saveDiagram('process', processId, next)
    }, 600)
  }

  async function handleImageUpload(base64: string, width: number, height: number) {
    await putProcessImage(processId, { imageBase64: base64, width, height })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await deleteProcessImage(processId)
    setImage(null)
  }

  async function savePosition(
    pinId: number | string,
    x: number,
    y: number,
    width?: number,
    height?: number,
  ) {
    const target = lines.find((l) => l.id === pinId)
    if (!target) return
    const positionJson = JSON.stringify({
      x,
      y,
      ...(width && height ? { w: width, h: height } : {}),
    })
    await updateLine(Number(pinId), {
      processId: target.processId,
      code: target.code,
      name: target.name,
      description: target.description ?? '',
      position: positionJson,
      imageWidth: target.imageWidth,
      imageHeight: target.imageHeight,
    })
    setLines((prev) => prev.map((l) => (l.id === pinId ? { ...l, position: positionJson } : l)))
  }

  function handlePinMove(pinId: number | string, position: { x: number; y: number }) {
    const existing = parsePosition(lines.find((l) => l.id === pinId)?.position ?? null)
    return savePosition(pinId, position.x, position.y, existing?.width, existing?.height)
  }

  function handlePinResize(pinId: number | string, size: { width: number; height: number }) {
    const existing = parsePosition(lines.find((l) => l.id === pinId)?.position ?? null)
    if (!existing) return Promise.resolve()
    return savePosition(pinId, existing.x, existing.y, size.width, size.height)
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
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[12px]">
            <button
              onClick={() => {
                setMode('image')
                saveMapMode('process', processId, 'image')
              }}
              className={`h-8 px-3 transition-colors ${
                mode === 'image'
                  ? 'bg-[#003087] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              이미지
            </button>
            <button
              onClick={() => {
                setMode('diagram')
                saveMapMode('process', processId, 'diagram')
              }}
              className={`h-8 px-3 transition-colors border-l border-slate-200 ${
                mode === 'diagram'
                  ? 'bg-[#003087] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              다이어그램
            </button>
          </div>
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

      {mode === 'image' ? (
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
      ) : (
        <>
          <DiagramMap
            nodes={diagram.nodes}
            edges={diagram.edges}
            editMode={editMode}
            backgroundImage={image}
            zoneOptions={lines.map((l) => ({ id: l.id, name: l.name }))}
            onZoneClick={(id) => navigate(`/service/line/${id}/map`)}
            onChange={(nodes, edges) => handleDiagramChange({ nodes, edges })}
          />
          {diagram.nodes.some((n) => n.type === 'zone') && (
            <div className="flex items-center gap-2 flex-wrap px-1">
              <span className="text-[11px] text-slate-400 flex-shrink-0">등록된 영역</span>
              {diagram.nodes
                .filter((n) => n.type === 'zone')
                .map((n) => {
                  const linked = n.linkedId ? lines.find((l) => l.id === n.linkedId) : null
                  return (
                    <span key={n.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                      {n.label || '(이름 없음)'}
                      {linked && <span className="text-slate-400">· {linked.name}</span>}
                    </span>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
