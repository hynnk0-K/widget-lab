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
import { getFactory, getFactoryImage, putFactoryImage, deleteFactoryImage } from '@/entities/factory/api/factoryApi'
import type { Factory } from '@/entities/factory/model/types'
import { listProcesses, updateProcess } from '@/entities/process/api/processApi'
import type { Process } from '@/entities/process/model/types'
import { listLines } from '@/entities/line/api/lineApi'
import { listEquipments } from '@/entities/equipment/api/equipmentApi'
import type { MapPin } from '@/widgets/layout-map'
import type { EquipmentOption } from '@/widgets/diagram-map'

export function useFactoryMap(factoryId: number) {
  const [factory, setFactory] = useState<Factory | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [mode, setMode] = useState<MapMode>(() => loadMapMode('factory', factoryId))
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([])
  const saveDiagramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diagramRef = useRef(diagram)
  diagramRef.current = diagram

  useEffect(() => {
    if (!factoryId || Number.isNaN(factoryId)) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getFactory(factoryId),
      getFactoryImage(factoryId).catch(() => null),
      listProcesses(factoryId),
      loadDiagram('factory', factoryId),
    ])
      .then(([factoryData, imgData, processesData, diagramData]) => {
        if (!active) return
        setFactory(factoryData)
        setImage(imgData?.imageBase64 && imgData.width && imgData.height
          ? { base64: imgData.imageBase64, width: imgData.width, height: imgData.height }
          : null)
        setProcesses(processesData)
        setDiagram(diagramData)
        // 공장 하위 전체 설비 → 도면 심볼의 설비 연결 옵션
        Promise.all(processesData.map((p) => listLines(p.id)))
          .then((liness) => Promise.all(liness.flat().map((l) => listEquipments(l.id))))
          .then((eqss) => {
            if (!active) return
            setEquipmentOptions(eqss.flat().map((e) => ({ code: e.code, name: e.name })))
          })
          .catch(() => {})
      })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [factoryId])

  useEffect(() => {
    return () => {
      if (saveDiagramTimerRef.current) {
        clearTimeout(saveDiagramTimerRef.current)
        saveDiagram('factory', factoryId, diagramRef.current)
      }
    }
  }, [factoryId])

  const pins: MapPin[] = useMemo(() => {
    return processes.map((p) => {
      const parsed = parsePosition(p.position)
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        position: parsed ? { x: parsed.x, y: parsed.y } : null,
        size: parsed?.width && parsed?.height ? { width: parsed.width, height: parsed.height } : undefined,
        live: { hasData: false },
      }
    })
  }, [processes])

  function selectMode(m: MapMode) {
    setMode(m)
    saveMapMode('factory', factoryId, m)
  }

  function handleDiagramChange(next: DiagramData) {
    setDiagram(next)
    if (saveDiagramTimerRef.current) clearTimeout(saveDiagramTimerRef.current)
    saveDiagramTimerRef.current = setTimeout(() => { saveDiagram('factory', factoryId, next) }, 600)
  }

  async function handleImageUpload(base64: string, width: number, height: number) {
    await putFactoryImage(factoryId, { imageBase64: base64, width, height })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await deleteFactoryImage(factoryId)
    setImage(null)
  }

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

  return {
    factory, image, processes, loading, error,
    editMode, setEditMode,
    mode, selectMode,
    diagram,
    equipmentOptions,
    pins,
    handleDiagramChange,
    handleImageUpload,
    handleImageDelete,
    handlePinMove,
    handlePinResize,
  }
}
