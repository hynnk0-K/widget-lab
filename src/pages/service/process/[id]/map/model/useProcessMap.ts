import { useEffect, useMemo, useRef, useState } from 'react'
import { parsePosition } from '@/shared/lib/parsePosition'
import {
  loadMapMode,
  saveMapMode,
  loadDiagram,
  saveDiagram,
  type MapMode,
  type DiagramData,
} from '@/shared/lib/diagramStorage'
import { saveFlowEdges } from '@/entities/flow/api/flowEdgeApi'
import { getProcess, getProcessImage, putProcessImage, deleteProcessImage } from '@/entities/process/api/processApi'
import type { Process } from '@/entities/process/model/types'
import { listLines, updateLine } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'
import type { MapPin } from '@/widgets/layout-map'

export function useProcessMap(processId: number) {
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
        setImage(imgData?.imageBase64 && imgData.width && imgData.height
          ? { base64: imgData.imageBase64, width: imgData.width, height: imgData.height }
          : null)
        setLines(linesData)
        setDiagram(diagramData)
      })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [processId])

  useEffect(() => {
    return () => {
      if (saveDiagramTimerRef.current) {
        clearTimeout(saveDiagramTimerRef.current)
        saveDiagram('process', processId, diagramRef.current)
        saveFlowEdges('PROCESS', processId, diagramRef.current.edges).catch(() => {})
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
        size: parsed?.width && parsed?.height ? { width: parsed.width, height: parsed.height } : undefined,
        live: { hasData: false },
      }
    })
  }, [lines])

  function selectMode(m: MapMode) {
    setMode(m)
    saveMapMode('process', processId, m)
  }

  function handleDiagramChange(next: DiagramData) {
    setDiagram(next)
    if (saveDiagramTimerRef.current) clearTimeout(saveDiagramTimerRef.current)
    saveDiagramTimerRef.current = setTimeout(() => {
      saveDiagram('process', processId, next)
      saveFlowEdges('PROCESS', processId, next.edges).catch(() => {})
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

  async function savePosition(pinId: number | string, x: number, y: number, width?: number, height?: number) {
    const target = lines.find((l) => l.id === pinId)
    if (!target) return
    const positionJson = JSON.stringify({ x, y, ...(width && height ? { w: width, h: height } : {}) })
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

  return {
    process, image, lines, loading, error,
    editMode, setEditMode,
    mode, selectMode,
    diagram,
    pins,
    handleDiagramChange,
    handleImageUpload,
    handleImageDelete,
    handlePinMove,
    handlePinResize,
  }
}
