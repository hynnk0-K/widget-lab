import { useEffect, useRef, useState } from 'react'
import {
  loadDiagram,
  saveDiagram,
  loadBgVisible,
  saveBgVisible,
  type DiagramData,
} from '@/shared/lib/diagramStorage'
import { readImageFile } from '@/shared/lib/readImageFile'
import { getLine, getLineImage, putLineImage, deleteLineImage } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'
import { listEquipments, listEquipmentLive } from '@/entities/equipment/api/equipmentApi'
import type { EquipmentDto, EquipmentLive } from '@/entities/equipment/model/types'

const LIVE_POLL_MS = 5000

export function useLineMap(lineId: number) {
  const [line, setLine] = useState<Line | null>(null)
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

  useEffect(() => {
    if (!lineId || Number.isNaN(lineId)) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getLine(lineId),
      getLineImage(lineId).catch(() => null),
      listEquipments(lineId),
      listEquipmentLive(lineId),
      loadDiagram('line', lineId),
    ])
      .then(([lineData, imgData, equipsData, liveData, diagramData]) => {
        if (!active) return
        setLine(lineData)
        setImage(imgData?.imageBase64 && imgData.width && imgData.height
          ? { base64: imgData.imageBase64, width: imgData.width, height: imgData.height }
          : null)
        setEquipments(equipsData)
        setLiveMap(Object.fromEntries(liveData.map((l) => [l.code, l])))
        setDiagram(diagramData)
      })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [lineId])

  useEffect(() => {
    return () => {
      if (saveDiagramTimerRef.current) {
        clearTimeout(saveDiagramTimerRef.current)
        saveDiagram('line', lineId, diagramRef.current)
      }
    }
  }, [lineId])

  useEffect(() => {
    if (!lineId || Number.isNaN(lineId)) return
    const timer = setInterval(() => {
      listEquipmentLive(lineId)
        .then((live) => setLiveMap(Object.fromEntries(live.map((l) => [l.code, l]))))
        .catch(() => {})
    }, LIVE_POLL_MS)
    return () => clearInterval(timer)
  }, [lineId])

  async function handleImageUpload(base64: string, width: number, height: number) {
    await putLineImage(lineId, { imageBase64: base64, width, height })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await deleteLineImage(lineId)
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

  function handleDiagramChange(next: DiagramData) {
    setDiagram(next)
    if (saveDiagramTimerRef.current) clearTimeout(saveDiagramTimerRef.current)
    saveDiagramTimerRef.current = setTimeout(() => { saveDiagram('line', lineId, next) }, 600)
  }

  function toggleShowBg() {
    const next = !showBg
    setShowBg(next)
    saveBgVisible('line', lineId, next)
  }

  return {
    line, image, equipments, liveMap, loading, error,
    editMode, setEditMode,
    diagram,
    showBg,
    bgUploading, bgError,
    bgFileInputRef,
    handleImageDelete,
    handleBgFileChange,
    handleDiagramChange,
    toggleShowBg,
  }
}
