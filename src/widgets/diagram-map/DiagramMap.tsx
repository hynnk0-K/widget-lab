import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Stage,
  Layer,
  Group,
  Rect,
  Circle,
  Line,
  Arrow,
  Text,
  Image as KonvaImage,
} from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { DiagramNode, DiagramEdge, PidSymbolType } from '@/shared/lib/diagramStorage'

export interface EquipmentOption {
  code: string
  name: string
}

interface Props {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  editMode?: boolean
  onChange?: (nodes: DiagramNode[], edges: DiagramEdge[]) => void
  equipmentOptions?: EquipmentOption[]
  alarmStatusByDevice?: Record<string, 'critical' | 'warning'>
  selectedDeviceCode?: string | null
  backgroundImage?: { base64: string; width: number; height: number } | null
}

// ── 심볼 메타 ─────────────────────────────────────────────────────
const SYMBOL_LABELS: Record<PidSymbolType, string> = {
  valve_gate: '게이트 밸브',
  valve_globe: '글로브 밸브',
  valve_check: '체크 밸브',
  valve_ball: '볼 밸브',
  instrument: '계기',
  tank: '탱크',
  pump: '펌프',
  motor: '모터',
  generic: '일반 장비',
}

const SYMBOL_CATEGORIES: { label: string; types: PidSymbolType[] }[] = [
  { label: '밸브', types: ['valve_gate', 'valve_globe', 'valve_check', 'valve_ball'] },
  { label: '계기', types: ['instrument'] },
  { label: '장비', types: ['tank', 'pump', 'motor', 'generic'] },
]

export function getDefaultDims(type: PidSymbolType): { w: number; h: number } {
  if (type === 'tank') return { w: 28, h: 60 }
  if (type === 'generic') return { w: 68, h: 36 }
  return { w: 40, h: 40 }
}

// ── 팔레트 SVG 미리보기 ───────────────────────────────────────────
function SymbolSvg({ type }: { type: PidSymbolType }) {
  const c = '#475569'
  const sw = 1.5

  switch (type) {
    case 'valve_gate':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <polygon points="0,0 16,16 0,32" fill={c} />
          <polygon points="32,0 16,16 32,32" fill={c} />
        </svg>
      )
    case 'valve_globe':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={13} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={0} y1={16} x2={32} y2={16} stroke={c} strokeWidth={sw} />
          <line x1={16} y1={2} x2={16} y2={7} stroke={c} strokeWidth={sw} />
        </svg>
      )
    case 'valve_check':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <polygon points="0,0 0,32 23,16" fill={c} />
          <line x1={32} y1={0} x2={32} y2={32} stroke={c} strokeWidth={2} />
        </svg>
      )
    case 'valve_ball':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={12} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={0} y1={16} x2={4} y2={16} stroke={c} strokeWidth={sw} />
          <line x1={28} y1={16} x2={32} y2={16} stroke={c} strokeWidth={sw} />
          <line x1={16} y1={4} x2={16} y2={28} stroke={c} strokeWidth={1.2} strokeDasharray="3,2" />
        </svg>
      )
    case 'instrument':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={14} fill="none" stroke={c} strokeWidth={sw} />
          <text x={16} y={20} textAnchor="middle" fontSize={10} fontWeight="bold" fill={c}>
            IT
          </text>
        </svg>
      )
    case 'tank':
      return (
        <svg width={20} height={38} viewBox="0 0 20 38">
          <rect x={1} y={1} width={18} height={36} rx={9} fill="none" stroke={c} strokeWidth={sw} />
        </svg>
      )
    case 'pump':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={14} fill="none" stroke={c} strokeWidth={sw} />
          <polygon points="7,11 7,21 25,16" fill={c} />
        </svg>
      )
    case 'motor':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={14} fill="none" stroke={c} strokeWidth={sw} />
          <text x={16} y={21} textAnchor="middle" fontSize={13} fontWeight="bold" fill={c}>
            M
          </text>
        </svg>
      )
    default: // generic
      return (
        <svg width={40} height={24} viewBox="0 0 40 24">
          <rect x={1} y={4} width={38} height={16} rx={3} fill="none" stroke={c} strokeWidth={sw} />
        </svg>
      )
  }
}

// ── Konva 심볼 렌더 ───────────────────────────────────────────────
function Symbol({
  type,
  w,
  h,
  color,
  label,
}: {
  type: PidSymbolType
  w: number
  h: number
  color: string
  label?: string
}) {
  const cx = w / 2,
    cy = h / 2

  switch (type) {
    case 'valve_gate':
      return (
        <>
          <Line
            points={[0, 0, cx, cy, 0, h]}
            closed
            stroke={color}
            strokeWidth={1.5}
            fill={color}
          />
          <Line
            points={[w, 0, cx, cy, w, h]}
            closed
            stroke={color}
            strokeWidth={1.5}
            fill={color}
          />
        </>
      )
    case 'valve_globe':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.42} stroke={color} strokeWidth={1.5} />
          <Line points={[0, cy, w, cy]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx, 0, cx, cy - w * 0.28]} stroke={color} strokeWidth={1.5} />
        </>
      )
    case 'valve_check':
      return (
        <>
          <Line
            points={[0, 0, 0, h, w * 0.72, cy]}
            closed
            stroke={color}
            strokeWidth={1.5}
            fill={color}
          />
          <Line points={[w, 0, w, h]} stroke={color} strokeWidth={2} />
        </>
      )
    case 'valve_ball':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.38} stroke={color} strokeWidth={1.5} />
          <Line points={[0, cy, cx - w * 0.38, cy]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx + w * 0.38, cy, w, cy]} stroke={color} strokeWidth={1.5} />
          <Line
            points={[cx, cy - w * 0.38, cx, cy + w * 0.38]}
            stroke={color}
            strokeWidth={1.2}
            dash={[3, 2]}
          />
        </>
      )
    case 'instrument':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          {label && (
            <Text
              x={0}
              y={cy - 7}
              width={w}
              align="center"
              text={label}
              fontSize={10}
              fontStyle="bold"
              fill={color}
              listening={false}
            />
          )}
        </>
      )
    case 'tank':
      return (
        <Rect
          x={2}
          y={2}
          width={w - 4}
          height={h - 4}
          stroke={color}
          strokeWidth={1.5}
          cornerRadius={[w / 2, w / 2, w / 2, w / 2]}
        />
      )
    case 'pump':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          <Line
            points={[cx - w * 0.2, cy - w * 0.18, cx - w * 0.2, cy + w * 0.18, cx + w * 0.28, cy]}
            closed
            stroke={color}
            strokeWidth={1.2}
            fill={color}
          />
        </>
      )
    case 'motor':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          <Text
            x={0}
            y={cy - 8}
            width={w}
            align="center"
            text="M"
            fontSize={14}
            fontStyle="bold"
            fill={color}
            listening={false}
          />
        </>
      )
    default:
      return (
        <Rect
          x={1}
          y={h * 0.18}
          width={w - 2}
          height={h * 0.64}
          stroke={color}
          strokeWidth={1.5}
          cornerRadius={3}
        />
      )
  }
}

function NodeImage({ img, w, h }: { img: HTMLImageElement; w: number; h: number }) {
  return <KonvaImage image={img} x={0} y={0} width={w} height={h} cornerRadius={3} />
}

function calcEdgePoints(from: DiagramNode, to: DiagramNode): number[] {
  const fd = {
    w: from.width ?? getDefaultDims(from.type).w,
    h: from.height ?? getDefaultDims(from.type).h,
  }
  const td = { w: to.width ?? getDefaultDims(to.type).w, h: to.height ?? getDefaultDims(to.type).h }
  const fromA = [
    { x: from.x, y: from.y - fd.h / 2 },
    { x: from.x + fd.w / 2, y: from.y },
    { x: from.x, y: from.y + fd.h / 2 },
    { x: from.x - fd.w / 2, y: from.y },
  ]
  const toA = [
    { x: to.x, y: to.y - td.h / 2 },
    { x: to.x + td.w / 2, y: to.y },
    { x: to.x, y: to.y + td.h / 2 },
    { x: to.x - td.w / 2, y: to.y },
  ]
  let minD = Infinity,
    fp = fromA[1],
    tp = toA[3]
  for (const fa of fromA)
    for (const ta of toA) {
      const d = Math.hypot(fa.x - ta.x, fa.y - ta.y)
      if (d < minD) {
        minD = d
        fp = fa
        tp = ta
      }
    }
  return [fp.x, fp.y, tp.x, tp.y]
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
interface EditState {
  id: string | null
  type: PidSymbolType
  label: string
  deviceCode: string
  imageBase64: string
}

let _id = 1

export function DiagramMap({
  nodes,
  edges,
  editMode = false,
  onChange,
  equipmentOptions,
  alarmStatusByDevice,
  selectedDeviceCode,
  backgroundImage,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 520 })
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  const [localNodes, setLocalNodes] = useState<DiagramNode[]>(nodes)
  const [localEdges, setLocalEdges] = useState<DiagramEdge[]>(edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'pipe' | 'signal'>('select')
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [editing, setEditing] = useState<EditState | null>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [resizingDims, setResizingDims] = useState<{ id: string; w: number; h: number } | null>(
    null,
  )
  const [imgCache, setImgCache] = useState<Map<string, HTMLImageElement>>(new Map())
  const autoFittedRef = useRef(false)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => setLocalNodes(nodes), [nodes])
  useEffect(() => setLocalEdges(edges), [edges])
  useEffect(() => {
    if (!editMode) {
      setTool('select')
      setPendingFrom(null)
    }
  }, [editMode])

  useEffect(() => {
    if (!backgroundImage) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.onload = () => setBgImage(img)
    img.src = backgroundImage.base64
  }, [backgroundImage?.base64])

  useEffect(() => {
    for (const n of localNodes) {
      if (!n.imageBase64 || imgCache.has(n.imageBase64)) continue
      const img = new window.Image()
      img.onload = () => setImgCache((prev) => new Map(prev).set(n.imageBase64!, img))
      img.src = n.imageBase64
    }
  }, [localNodes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    setStageSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  // 초기 뷰: 노드 있으면 fit-to-nodes, 없으면 원점 중앙
  useEffect(() => {
    if (autoFittedRef.current) return
    const el = containerRef.current
    if (!el) return
    const w = el.offsetWidth,
      h = el.offsetHeight
    if (!w || !h) return
    if (localNodes.length === 0) {
      setStagePos({ x: w / 2, y: h / 2 })
      return
    }
    autoFittedRef.current = true
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const n of localNodes) {
      const d = n.width && n.height ? { w: n.width, h: n.height } : getDefaultDims(n.type)
      minX = Math.min(minX, n.x - d.w / 2)
      minY = Math.min(minY, n.y - d.h / 2)
      maxX = Math.max(maxX, n.x + d.w / 2)
      maxY = Math.max(maxY, n.y + d.h / 2)
    }
    const pad = 80
    const ns = Math.min(w / (maxX - minX + pad * 2), h / (maxY - minY + pad * 2), 2)
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2
    setScale(ns)
    setStagePos({ x: w / 2 - cx * ns, y: h / 2 - cy * ns })
  }, [localNodes])

  const gridPattern = useMemo(() => {
    const cell = 50
    const c = document.createElement('canvas')
    c.width = cell
    c.height = cell
    const ctx = c.getContext('2d')!
    // ctx.fillStyle = '#f8fafc00'
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, cell, cell)
    ctx.strokeStyle = '#e2e8f0aa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cell - 0.5, 0)
    ctx.lineTo(cell - 0.5, cell)
    ctx.moveTo(0, cell - 0.5)
    ctx.lineTo(cell, cell - 0.5)
    ctx.stroke()
    return c
  }, [])

  const bgFit = useMemo(() => {
    if (!backgroundImage) return null
    const s = Math.min(stageSize.w / backgroundImage.width, stageSize.h / backgroundImage.height)
    const w = backgroundImage.width * s,
      h = backgroundImage.height * s
    return { x: -w / 2, y: -h / 2, w, h }
  }, [backgroundImage, stageSize])

  function nodeDims(node: DiagramNode) {
    if (resizingDims?.id === node.id) return { w: resizingDims.w, h: resizingDims.h }
    if (node.width && node.height) return { w: node.width, h: node.height }
    return getDefaultDims(node.type)
  }

  function emit(nn: DiagramNode[], ee: DiagramEdge[]) {
    onChangeRef.current?.(nn, ee)
  }

  function fitView() {
    const el = containerRef.current
    if (!el) return
    const w = el.offsetWidth,
      h = el.offsetHeight
    if (localNodes.length === 0) {
      setScale(1)
      setStagePos({ x: w / 2, y: h / 2 })
      return
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const n of localNodes) {
      const d = nodeDims(n)
      minX = Math.min(minX, n.x - d.w / 2)
      minY = Math.min(minY, n.y - d.h / 2)
      maxX = Math.max(maxX, n.x + d.w / 2)
      maxY = Math.max(maxY, n.y + d.h / 2)
    }
    const pad = 80
    const ns = Math.min(w / (maxX - minX + pad * 2), h / (maxY - minY + pad * 2), 2)
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2
    setScale(ns)
    setStagePos({ x: w / 2 - cx * ns, y: h / 2 - cy * ns })
  }

  // ── Stage 이벤트 ──
  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()!
    const ptr = stage.getPointerPosition()!
    const ns = Math.max(0.15, Math.min(5, scale * (e.evt.deltaY < 0 ? 1.12 : 0.9)))
    const mpTo = { x: (ptr.x - stagePos.x) / scale, y: (ptr.y - stagePos.y) / scale }
    setScale(ns)
    setStagePos({ x: ptr.x - mpTo.x * ns, y: ptr.y - mpTo.y * ns })
  }

  function handleStageDragEnd(e: KonvaEventObject<DragEvent>) {
    if (e.target !== e.target.getStage()) return
    setStagePos({ x: e.target.x(), y: e.target.y() })
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.target !== e.target.getStage()) return
    setSelectedId(null)
    setPendingFrom(null)
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    if (!pendingFrom) return
    const pos = e.target.getStage()!.getRelativePointerPosition()!
    setMousePos({ x: pos.x, y: pos.y })
  }

  // ── 노드 이벤트 ──
  function handleNodeClick(nodeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (tool === 'select' || !editMode) {
      setSelectedId(nodeId === selectedId ? null : nodeId)
      return
    }
    if (!pendingFrom) {
      setPendingFrom(nodeId)
      return
    }
    if (pendingFrom === nodeId) {
      setPendingFrom(null)
      return
    }
    const edge: DiagramEdge = { id: `e${_id++}`, fromId: pendingFrom, toId: nodeId, edgeType: tool }
    const next = [...localEdges, edge]
    setLocalEdges(next)
    emit(localNodes, next)
    setPendingFrom(null)
  }

  function handleNodeDblClick(nodeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (!editMode) return
    const node = localNodes.find((n) => n.id === nodeId)
    if (!node) return
    setEditing({
      id: node.id,
      type: node.type,
      label: node.label ?? '',
      deviceCode: node.deviceCode ?? '',
      imageBase64: node.imageBase64 ?? '',
    })
  }

  function handleNodeDragEnd(nodeId: string, x: number, y: number) {
    const next = localNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    setLocalNodes(next)
    emit(next, localEdges)
  }

  function handleResizeDragMove(nodeId: string, e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    setResizingDims({
      id: nodeId,
      w: Math.max(20, e.target.x() + 5),
      h: Math.max(20, e.target.y() + 5),
    })
  }

  function handleResizeDragEnd(nodeId: string, e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    const newW = Math.max(20, Math.round(e.target.x() + 5))
    const newH = Math.max(20, Math.round(e.target.y() + 5))
    const next = localNodes.map((n) => (n.id === nodeId ? { ...n, width: newW, height: newH } : n))
    setLocalNodes(next)
    emit(next, localEdges)
    setResizingDims(null)
  }

  function handleEdgeClick(edgeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (!editMode || tool !== 'select') return
    setSelectedId(edgeId)
  }

  // 팔레트에서 클릭 → 즉시 캔버스 중앙에 추가 (모달 없이)
  function quickAddNode(type: PidSymbolType) {
    const el = containerRef.current
    if (!el) return
    const w = el.offsetWidth,
      h = el.offsetHeight
    const node: DiagramNode = {
      id: `n${_id++}`,
      type,
      x: (w / 2 - stagePos.x) / scale + (Math.random() - 0.5) * 40,
      y: (h / 2 - stagePos.y) / scale + (Math.random() - 0.5) * 40,
    }
    const next = [...localNodes, node]
    setLocalNodes(next)
    emit(next, localEdges)
    setSelectedId(node.id)
  }

  function handleSaveEdit() {
    if (!editing) return
    const base = {
      type: editing.type,
      label: editing.label || undefined,
      deviceCode: editing.deviceCode || undefined,
      imageBase64: editing.imageBase64 || undefined,
    }
    if (editing.id === null) {
      const el = containerRef.current
      const w = el?.offsetWidth ?? stageSize.w,
        h = el?.offsetHeight ?? stageSize.h
      const node: DiagramNode = {
        id: `n${_id++}`,
        x: (w / 2 - stagePos.x) / scale + (Math.random() - 0.5) * 60,
        y: (h / 2 - stagePos.y) / scale + (Math.random() - 0.5) * 60,
        ...base,
      }
      const next = [...localNodes, node]
      setLocalNodes(next)
      emit(next, localEdges)
    } else {
      const next = localNodes.map((n) => (n.id === editing.id ? { ...n, ...base } : n))
      setLocalNodes(next)
      emit(next, localEdges)
    }
    setEditing(null)
  }

  function handleDeleteEditing() {
    if (!editing?.id) return
    const id = editing.id
    const nn = localNodes.filter((n) => n.id !== id)
    const ee = localEdges.filter((e) => e.fromId !== id && e.toId !== id)
    setLocalNodes(nn)
    setLocalEdges(ee)
    emit(nn, ee)
    setEditing(null)
    setSelectedId(null)
  }

  function handleDeleteSelected() {
    if (!selectedId) return
    if (localNodes.some((n) => n.id === selectedId)) {
      const nn = localNodes.filter((n) => n.id !== selectedId)
      const ee = localEdges.filter((e) => e.fromId !== selectedId && e.toId !== selectedId)
      setLocalNodes(nn)
      setLocalEdges(ee)
      emit(nn, ee)
    } else {
      const ee = localEdges.filter((e) => e.id !== selectedId)
      setLocalEdges(ee)
      emit(localNodes, ee)
    }
    setSelectedId(null)
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      setEditing((s) => (s ? { ...s, imageBase64: reader.result as string } : s))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const nodesMap = Object.fromEntries(localNodes.map((n) => [n.id, n]))

  function nodeColor(node: DiagramNode): string {
    if (node.deviceCode && selectedDeviceCode === node.deviceCode) return '#3b82f6'
    const alarm = node.deviceCode ? alarmStatusByDevice?.[node.deviceCode] : undefined
    if (alarm === 'critical') return '#ef4444'
    if (alarm === 'warning') return '#f59e0b'
    if (selectedId === node.id || pendingFrom === node.id) return '#3b82f6'
    return '#334155'
  }

  // ── 렌더 ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* 툴바 */}
      {editMode && (
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[12px]">
            {(['select', 'pipe', 'signal'] as const).map((t, i) => (
              <button
                key={t}
                onClick={() => {
                  setTool(t)
                  setPendingFrom(null)
                }}
                className={`h-8 px-3 transition-colors ${
                  tool === t
                    ? 'bg-[#003087] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                } ${i > 0 ? 'border-l border-slate-200' : ''}`}
              >
                {t === 'select' ? '✦ 선택' : t === 'pipe' ? '— 배관' : '⋯ 신호선'}
              </button>
            ))}
          </div>

          {selectedId && (
            <button
              onClick={handleDeleteSelected}
              className="h-8 px-3 text-[12px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M2 4h12M6 4V2h4v2M5 4v9h6V4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              삭제
            </button>
          )}

          {pendingFrom && (
            <span className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              연결할 심볼을 클릭하세요 · ESC 취소
            </span>
          )}
        </div>
      )}

      {/* 캔버스 영역 */}
      <div
        className="flex rounded-xl border border-slate-200 overflow-hidden"
        style={{ height: 560 }}
      >
        {/* 왼쪽 심볼 팔레트 */}
        {editMode && (
          <div className="w-[148px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
            {SYMBOL_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                  {cat.label}
                </div>
                <div className="grid grid-cols-2 gap-1 p-1.5">
                  {cat.types.map((type) => (
                    <button
                      key={type}
                      onClick={() => quickAddNode(type)}
                      title={SYMBOL_LABELS[type]}
                      className="flex flex-col items-center justify-center gap-1 p-2 min-h-[60px] rounded-lg border border-transparent hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                    >
                      <SymbolSvg type={type} />
                      <span className="text-[9px] text-slate-500 group-hover:text-blue-600 text-center leading-tight line-clamp-2">
                        {SYMBOL_LABELS[type]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Konva 캔버스 */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-slate-50 overflow-hidden"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPendingFrom(null)
              setSelectedId(null)
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && editMode) handleDeleteSelected()
          }}
        >
          <Stage
            width={stageSize.w}
            height={stageSize.h}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={tool === 'select' || !editMode}
            onWheel={handleWheel}
            onDragEnd={handleStageDragEnd}
            onMouseMove={handleMouseMove}
            onClick={handleStageClick}
          >
            <Layer>
              <Rect
                x={-5000}
                y={-5000}
                width={10000}
                height={10000}
                fillPatternImage={gridPattern as unknown as HTMLImageElement}
                listening={false}
              />

              <Line points={[-24, 0, 24, 0]} stroke="#94a3b8" strokeWidth={1} listening={false} />
              <Line points={[0, -24, 0, 24]} stroke="#94a3b8" strokeWidth={1} listening={false} />
              <Circle x={0} y={0} radius={3} fill="#94a3b8" listening={false} />

              {bgImage && bgFit && (
                <KonvaImage
                  image={bgImage}
                  x={bgFit.x}
                  y={bgFit.y}
                  width={bgFit.w}
                  height={bgFit.h}
                  opacity={0.5}
                  listening={false}
                />
              )}

              {localEdges.map((edge) => {
                const from = nodesMap[edge.fromId],
                  to = nodesMap[edge.toId]
                if (!from || !to) return null
                const pts = calcEdgePoints(from, to)
                const isSel = selectedId === edge.id
                const isPipe = edge.edgeType === 'pipe'
                return (
                  <Arrow
                    key={edge.id}
                    points={pts}
                    stroke={isSel ? '#3b82f6' : '#475569'}
                    strokeWidth={isPipe ? 2 : 1.5}
                    dash={isPipe ? undefined : [7, 4]}
                    fill={isSel ? '#3b82f6' : '#475569'}
                    pointerLength={isPipe ? 9 : 0}
                    pointerWidth={isPipe ? 6 : 0}
                    hitStrokeWidth={14}
                    onClick={(e) => handleEdgeClick(edge.id, e)}
                  />
                )
              })}

              {pendingFrom && nodesMap[pendingFrom] && (
                <Line
                  points={[
                    nodesMap[pendingFrom].x,
                    nodesMap[pendingFrom].y,
                    mousePos.x,
                    mousePos.y,
                  ]}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dash={tool === 'signal' ? [7, 4] : undefined}
                  opacity={0.7}
                  listening={false}
                />
              )}

              {localNodes.map((node) => {
                const dims = nodeDims(node)
                const color = nodeColor(node)
                const isSel = selectedId === node.id
                const isPending = pendingFrom === node.id
                const cachedImg = node.imageBase64 ? imgCache.get(node.imageBase64) : undefined

                return (
                  <Group
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    offsetX={dims.w / 2}
                    offsetY={dims.h / 2}
                    draggable={editMode && tool === 'select'}
                    onClick={(e) => handleNodeClick(node.id, e)}
                    onDblClick={(e) => handleNodeDblClick(node.id, e)}
                    onDragEnd={(e) => handleNodeDragEnd(node.id, e.target.x(), e.target.y())}
                  >
                    {(isSel || isPending) && (
                      <Rect
                        x={-5}
                        y={-5}
                        width={dims.w + 10}
                        height={dims.h + 10}
                        stroke={isPending ? '#6366f1' : '#3b82f6'}
                        strokeWidth={1.5}
                        dash={[4, 3]}
                        cornerRadius={4}
                        listening={false}
                      />
                    )}

                    {cachedImg ? (
                      <>
                        <NodeImage img={cachedImg} w={dims.w} h={dims.h} />
                        {color !== '#334155' && (
                          <Rect
                            x={-3}
                            y={-3}
                            width={dims.w + 6}
                            height={dims.h + 6}
                            stroke={color}
                            strokeWidth={2.5}
                            cornerRadius={4}
                            listening={false}
                          />
                        )}
                      </>
                    ) : (
                      <Symbol
                        type={node.type}
                        w={dims.w}
                        h={dims.h}
                        color={color}
                        label={node.type === 'instrument' ? (node.label ?? '') : undefined}
                      />
                    )}

                    {node.label && node.type !== 'instrument' && (
                      <Text
                        x={-10}
                        y={dims.h + 5}
                        width={dims.w + 20}
                        align="center"
                        text={node.label}
                        fontSize={10}
                        fill="#475569"
                        listening={false}
                      />
                    )}

                    {isSel && editMode && tool === 'select' && (
                      <Rect
                        x={dims.w - 5}
                        y={dims.h - 5}
                        width={10}
                        height={10}
                        fill="#3b82f6"
                        cornerRadius={2}
                        draggable
                        onDragMove={(e) => handleResizeDragMove(node.id, e)}
                        onDragEnd={(e) => handleResizeDragEnd(node.id, e)}
                      />
                    )}
                  </Group>
                )
              })}
            </Layer>
          </Stage>

          {/* 우하단: 중앙 맞춤 + 줌 */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <button
              onClick={fitView}
              className="text-[10px] text-slate-500 bg-white/90 border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors"
            >
              중앙 맞춤
            </button>
            <div className="text-[10px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none">
              {Math.round(scale * 100)}%
            </div>
          </div>

          {!editMode && localNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[13px] text-slate-400">편집 모드에서 P&amp;ID 심볼을 추가하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 속성 편집 모달 (더블클릭) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-[360px]">
            <p className="text-[13px] font-semibold text-slate-800 m-0 mb-3">
              {editing.id === null ? '심볼 추가' : '속성 편집'}
            </p>

            {!editing.imageBase64 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(Object.keys(SYMBOL_LABELS) as PidSymbolType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEditing((s) => (s ? { ...s, type } : s))}
                    className={`py-1.5 rounded-lg border text-[10px] transition-colors ${
                      editing.type === type
                        ? 'border-[#003087] bg-blue-50 text-[#003087]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {SYMBOL_LABELS[type]}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3">
              {editing.imageBase64 ? (
                <div className="flex items-start gap-2">
                  <img
                    src={editing.imageBase64}
                    alt=""
                    className="h-16 w-16 object-contain rounded border border-slate-200 bg-slate-50"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="h-7 px-2.5 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center">
                      이미지 교체
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setEditing((s) => (s ? { ...s, imageBase64: '' } : s))}
                      className="h-7 px-2.5 text-[11px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      이미지 제거
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 h-9 px-3 border border-dashed border-slate-300 rounded-lg text-[12px] text-slate-500 hover:bg-slate-50 cursor-pointer">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      d="M2 12l3-4 2 2.5L10 7l4 5H2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="1" y="1" width="14" height="14" rx="2" />
                  </svg>
                  이미지 선택 (선택 시 심볼 대신 표시)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <input
              autoFocus
              value={editing.label}
              onChange={(e) => setEditing((s) => (s ? { ...s, label: e.target.value } : s))}
              placeholder={editing.type === 'instrument' ? '태그 (예: LT, LC-101)' : '이름'}
              className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
              }}
            />

            {equipmentOptions && equipmentOptions.length > 0 && (
              <select
                value={editing.deviceCode}
                onChange={(e) => setEditing((s) => (s ? { ...s, deviceCode: e.target.value } : s))}
                className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087] bg-white"
              >
                <option value="">설비 연결 안 함</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq.code} value={eq.code}>
                    {eq.name} ({eq.code})
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2">
              {editing.id !== null && (
                <button
                  onClick={handleDeleteEditing}
                  className="h-8 px-3 text-[12px] text-red-500 hover:bg-red-50 rounded-lg mr-auto"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setEditing(null)}
                className="h-8 px-3 text-[12px] text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="h-8 px-3 text-[12px] bg-[#003087] text-white rounded-lg hover:bg-[#002470]"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
