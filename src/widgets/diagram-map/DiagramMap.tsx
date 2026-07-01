import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Group, Rect, Circle, Line, Arrow, Text, Image as KonvaImage } from 'react-konva'
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

const PALETTE: PidSymbolType[] = [
  'valve_gate', 'valve_globe', 'valve_check', 'valve_ball',
  'instrument', 'tank', 'pump', 'motor', 'generic',
]

/** 심볼 타입별 기본 크기 (px) */
export function getDefaultDims(type: PidSymbolType): { w: number; h: number } {
  if (type === 'tank') return { w: 28, h: 60 }
  if (type === 'generic') return { w: 68, h: 36 }
  return { w: 40, h: 40 }
}

// ── P&ID 심볼 렌더 ────────────────────────────────────────────────
function Symbol({
  type, w, h, color, label,
}: {
  type: PidSymbolType; w: number; h: number; color: string; label?: string
}) {
  const cx = w / 2, cy = h / 2

  switch (type) {
    case 'valve_gate':
      return (
        <>
          <Line points={[0, 0, cx, cy, 0, h]} closed stroke={color} strokeWidth={1.5} fill={color} />
          <Line points={[w, 0, cx, cy, w, h]} closed stroke={color} strokeWidth={1.5} fill={color} />
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
          <Line points={[0, 0, 0, h, w * 0.72, cy]} closed stroke={color} strokeWidth={1.5} fill={color} />
          <Line points={[w, 0, w, h]} stroke={color} strokeWidth={2} />
        </>
      )
    case 'valve_ball':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.38} stroke={color} strokeWidth={1.5} />
          <Line points={[0, cy, cx - w * 0.38, cy]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx + w * 0.38, cy, w, cy]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx, cy - w * 0.38, cx, cy + w * 0.38]} stroke={color} strokeWidth={1.2} dash={[3, 2]} />
        </>
      )
    case 'instrument':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          {label && (
            <Text x={0} y={cy - 7} width={w} align="center" text={label} fontSize={10} fontStyle="bold" fill={color} listening={false} />
          )}
        </>
      )
    case 'tank':
      return (
        <Rect x={2} y={2} width={w - 4} height={h - 4} stroke={color} strokeWidth={1.5}
          cornerRadius={[w / 2, w / 2, w / 2, w / 2]} />
      )
    case 'pump':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          <Line points={[cx - w * 0.2, cy - w * 0.18, cx - w * 0.2, cy + w * 0.18, cx + w * 0.28, cy]}
            closed stroke={color} strokeWidth={1.2} fill={color} />
        </>
      )
    case 'motor':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.46} stroke={color} strokeWidth={1.5} />
          <Text x={0} y={cy - 8} width={w} align="center" text="M" fontSize={14} fontStyle="bold" fill={color} listening={false} />
        </>
      )
    default:
      return (
        <Rect x={1} y={h * 0.18} width={w - 2} height={h * 0.64} stroke={color} strokeWidth={1.5} cornerRadius={3} />
      )
  }
}

// ── 이미지 노드 렌더 (캐시는 DiagramMap 레벨에서 관리) ──────────
function NodeImage({ img, w, h }: { img: HTMLImageElement; w: number; h: number }) {
  return <KonvaImage image={img} x={0} y={0} width={w} height={h} cornerRadius={3} />
}

// ── 엣지 연결점 계산 (가장 가까운 앵커 쌍) ───────────────────────
function calcEdgePoints(from: DiagramNode, to: DiagramNode): number[] {
  const fd = { w: from.width ?? getDefaultDims(from.type).w, h: from.height ?? getDefaultDims(from.type).h }
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
  let minD = Infinity, fp = fromA[1], tp = toA[3]
  for (const fa of fromA) for (const ta of toA) {
    const d = Math.hypot(fa.x - ta.x, fa.y - ta.y)
    if (d < minD) { minD = d; fp = fa; tp = ta }
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
  nodes, edges, editMode = false, onChange,
  equipmentOptions, alarmStatusByDevice, selectedDeviceCode, backgroundImage,
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
  // 리사이즈 중 임시 크기 (선택 노드에만)
  const [resizingDims, setResizingDims] = useState<{ id: string; w: number; h: number } | null>(null)
  // 이미지 캐시: base64 → HTMLImageElement
  const [imgCache, setImgCache] = useState<Map<string, HTMLImageElement>>(new Map())

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => setLocalNodes(nodes), [nodes])
  useEffect(() => setLocalEdges(edges), [edges])
  useEffect(() => { if (!editMode) { setTool('select'); setPendingFrom(null) } }, [editMode])

  // 배경 이미지 로드
  useEffect(() => {
    if (!backgroundImage) { setBgImage(null); return }
    const img = new window.Image()
    img.onload = () => setBgImage(img)
    img.src = backgroundImage.base64
  }, [backgroundImage?.base64])

  // 노드 이미지 캐시 로드
  useEffect(() => {
    for (const n of localNodes) {
      if (!n.imageBase64 || imgCache.has(n.imageBase64)) continue
      const img = new window.Image()
      img.onload = () => setImgCache((prev) => new Map(prev).set(n.imageBase64!, img))
      img.src = n.imageBase64
    }
  }, [localNodes]) // eslint-disable-line react-hooks/exhaustive-deps

  // 컨테이너 크기
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    setStageSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  // 배경 이미지 contain-fit (Stage 좌표계 기준)
  const bgFit = useMemo(() => {
    if (!backgroundImage) return null
    const s = Math.min(stageSize.w / backgroundImage.width, stageSize.h / backgroundImage.height)
    const w = backgroundImage.width * s, h = backgroundImage.height * s
    return { x: (stageSize.w - w) / 2, y: (stageSize.h - h) / 2, w, h }
  }, [backgroundImage, stageSize])

  /** 노드의 실효 크기 (리사이즈 중이면 임시값, 아니면 저장값 or 기본) */
  function nodeDims(node: DiagramNode) {
    if (resizingDims?.id === node.id) return { w: resizingDims.w, h: resizingDims.h }
    if (node.width && node.height) return { w: node.width, h: node.height }
    return getDefaultDims(node.type)
  }

  function emit(nn: DiagramNode[], ee: DiagramEdge[]) {
    onChangeRef.current?.(nn, ee)
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
    setSelectedId(null); setPendingFrom(null)
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
      setSelectedId(nodeId === selectedId ? null : nodeId); return
    }
    if (!pendingFrom) { setPendingFrom(nodeId); return }
    if (pendingFrom === nodeId) { setPendingFrom(null); return }
    const edge: DiagramEdge = { id: `e${_id++}`, fromId: pendingFrom, toId: nodeId, edgeType: tool }
    const next = [...localEdges, edge]
    setLocalEdges(next); emit(localNodes, next); setPendingFrom(null)
  }

  function handleNodeDblClick(nodeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (!editMode) return
    const node = localNodes.find((n) => n.id === nodeId)
    if (!node) return
    setEditing({ id: node.id, type: node.type, label: node.label ?? '', deviceCode: node.deviceCode ?? '', imageBase64: node.imageBase64 ?? '' })
  }

  function handleNodeDragEnd(nodeId: string, x: number, y: number) {
    const next = localNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    setLocalNodes(next); emit(next, localEdges)
  }

  // ── 리사이즈 핸들 ──
  function handleResizeDragMove(nodeId: string, e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    const dims = nodeDims(localNodes.find((n) => n.id === nodeId)!)
    const newW = Math.max(20, e.target.x() + 5)
    const newH = Math.max(20, e.target.y() + 5)
    // 핸들 오버슈트 방지 (최소 크기)
    if (newW < 20) e.target.x(15)
    if (newH < 20) e.target.y(15)
    setResizingDims({ id: nodeId, w: newW, h: newH })
    // 핸들 위치를 드래그한 위치로 고정 (Group offsetX/Y 영향 방지)
    void dims
  }

  function handleResizeDragEnd(nodeId: string, e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true
    const newW = Math.max(20, Math.round(e.target.x() + 5))
    const newH = Math.max(20, Math.round(e.target.y() + 5))
    const next = localNodes.map((n) => n.id === nodeId ? { ...n, width: newW, height: newH } : n)
    setLocalNodes(next); emit(next, localEdges)
    setResizingDims(null)
  }

  // ── 엣지 ──
  function handleEdgeClick(edgeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (!editMode || tool !== 'select') return
    setSelectedId(edgeId)
  }

  // ── 추가/수정/삭제 ──
  function handleAddNode(type: PidSymbolType) {
    setEditing({ id: null, type, label: '', deviceCode: '', imageBase64: '' })
  }

  function handleSaveEdit() {
    if (!editing) return
    const base: Omit<DiagramNode, 'id' | 'x' | 'y'> = {
      type: editing.type,
      label: editing.label || undefined,
      deviceCode: editing.deviceCode || undefined,
      imageBase64: editing.imageBase64 || undefined,
    }
    if (editing.id === null) {
      const node: DiagramNode = {
        id: `n${_id++}`,
        x: (stageSize.w / 2 - stagePos.x) / scale + (Math.random() - 0.5) * 60,
        y: (stageSize.h / 2 - stagePos.y) / scale + (Math.random() - 0.5) * 60,
        ...base,
      }
      const next = [...localNodes, node]
      setLocalNodes(next); emit(next, localEdges)
    } else {
      const next = localNodes.map((n) => n.id === editing.id ? { ...n, ...base } : n)
      setLocalNodes(next); emit(next, localEdges)
    }
    setEditing(null)
  }

  function handleDeleteEditing() {
    if (!editing?.id) return
    const id = editing.id
    const nn = localNodes.filter((n) => n.id !== id)
    const ee = localEdges.filter((e) => e.fromId !== id && e.toId !== id)
    setLocalNodes(nn); setLocalEdges(ee); emit(nn, ee)
    setEditing(null); setSelectedId(null)
  }

  function handleDeleteSelected() {
    if (!selectedId) return
    if (localNodes.some((n) => n.id === selectedId)) {
      const nn = localNodes.filter((n) => n.id !== selectedId)
      const ee = localEdges.filter((e) => e.fromId !== selectedId && e.toId !== selectedId)
      setLocalNodes(nn); setLocalEdges(ee); emit(nn, ee)
    } else {
      const ee = localEdges.filter((e) => e.id !== selectedId)
      setLocalEdges(ee); emit(localNodes, ee)
    }
    setSelectedId(null)
  }

  // 편집 모달 이미지 업로드
  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setEditing((s) => s ? { ...s, imageBase64: reader.result as string } : s)
    }
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

  return (
    <div className="flex flex-col gap-2">
      {/* 툴바 */}
      {editMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[12px]">
            {(['select', 'pipe', 'signal'] as const).map((t, i) => (
              <button key={t}
                onClick={() => { setTool(t); setPendingFrom(null) }}
                className={`h-8 px-3 transition-colors ${
                  tool === t ? 'bg-[#003087] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                } ${i > 0 ? 'border-l border-slate-200' : ''}`}
              >
                {t === 'select' ? '선택' : t === 'pipe' ? '배관' : '신호선'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {PALETTE.map((type) => (
              <button key={type} onClick={() => handleAddNode(type)}
                className="h-8 px-2.5 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                + {SYMBOL_LABELS[type]}
              </button>
            ))}
          </div>

          {selectedId && (
            <button onClick={handleDeleteSelected}
              className="h-8 px-3 text-[12px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              삭제
            </button>
          )}
          {pendingFrom && (
            <span className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-lg">
              연결할 심볼 클릭 · ESC 취소
            </span>
          )}
        </div>
      )}

      {/* 캔버스 */}
      <div ref={containerRef}
        className="relative w-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
        style={{ height: 520 }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setPendingFrom(null); setSelectedId(null) }
          if ((e.key === 'Delete' || e.key === 'Backspace') && editMode) handleDeleteSelected()
        }}
      >
        <Stage
          width={stageSize.w} height={stageSize.h}
          scaleX={scale} scaleY={scale}
          x={stagePos.x} y={stagePos.y}
          draggable={tool === 'select' || !editMode}
          onWheel={handleWheel}
          onDragEnd={handleStageDragEnd}
          onMouseMove={handleMouseMove}
          onClick={handleStageClick}
        >
          <Layer>
            {/* 배경 이미지 — Stage 안에서 심볼과 함께 pan/zoom */}
            {bgImage && bgFit && (
              <KonvaImage image={bgImage} x={bgFit.x} y={bgFit.y} width={bgFit.w} height={bgFit.h} opacity={0.5} listening={false} />
            )}

            {/* 엣지 */}
            {localEdges.map((edge) => {
              const from = nodesMap[edge.fromId], to = nodesMap[edge.toId]
              if (!from || !to) return null
              const pts = calcEdgePoints(from, to)
              const isSel = selectedId === edge.id
              const isPipe = edge.edgeType === 'pipe'
              return (
                <Arrow key={edge.id} points={pts}
                  stroke={isSel ? '#3b82f6' : '#475569'}
                  strokeWidth={isPipe ? 2 : 1.5}
                  dash={isPipe ? undefined : [7, 4]}
                  fill={isSel ? '#3b82f6' : '#475569'}
                  pointerLength={isPipe ? 9 : 0} pointerWidth={isPipe ? 6 : 0}
                  hitStrokeWidth={14}
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                />
              )
            })}

            {/* 연결 고무줄 */}
            {pendingFrom && nodesMap[pendingFrom] && (
              <Line
                points={[nodesMap[pendingFrom].x, nodesMap[pendingFrom].y, mousePos.x, mousePos.y]}
                stroke="#6366f1" strokeWidth={1.5}
                dash={tool === 'signal' ? [7, 4] : undefined}
                opacity={0.7} listening={false}
              />
            )}

            {/* 노드 */}
            {localNodes.map((node) => {
              const dims = nodeDims(node)
              const color = nodeColor(node)
              const isSel = selectedId === node.id
              const isPending = pendingFrom === node.id
              const cachedImg = node.imageBase64 ? imgCache.get(node.imageBase64) : undefined

              return (
                <Group key={node.id}
                  x={node.x} y={node.y}
                  offsetX={dims.w / 2} offsetY={dims.h / 2}
                  draggable={editMode && tool === 'select'}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  onDblClick={(e) => handleNodeDblClick(node.id, e)}
                  onDragEnd={(e) => handleNodeDragEnd(node.id, e.target.x(), e.target.y())}
                >
                  {/* 선택/대기 하이라이트 */}
                  {(isSel || isPending) && (
                    <Rect x={-5} y={-5} width={dims.w + 10} height={dims.h + 10}
                      stroke={isPending ? '#6366f1' : '#3b82f6'}
                      strokeWidth={1.5} dash={[4, 3]} cornerRadius={4} listening={false}
                    />
                  )}

                  {/* 심볼 or 이미지 */}
                  {cachedImg
                    ? <>
                        <NodeImage img={cachedImg} w={dims.w} h={dims.h} />
                        {/* 이미지 노드는 Symbol과 달리 색 주입이 없으므로 알람/선택 상태를 테두리로 표시 */}
                        {color !== '#334155' && (
                          <Rect
                            x={-3} y={-3}
                            width={dims.w + 6} height={dims.h + 6}
                            stroke={color} strokeWidth={2.5}
                            cornerRadius={4} listening={false}
                          />
                        )}
                      </>
                    : <Symbol type={node.type} w={dims.w} h={dims.h} color={color}
                        label={node.type === 'instrument' ? (node.label ?? '') : undefined} />
                  }

                  {/* 레이블 (instrument + 이미지 노드는 별도 처리) */}
                  {node.type !== 'instrument' && !cachedImg && node.label && (
                    <Text x={-10} y={dims.h + 5} width={dims.w + 20} align="center"
                      text={node.label} fontSize={10} fill="#475569" listening={false} />
                  )}
                  {cachedImg && node.label && (
                    <Text x={-10} y={dims.h + 5} width={dims.w + 20} align="center"
                      text={node.label} fontSize={10} fill="#475569" listening={false} />
                  )}

                  {/* 리사이즈 핸들 (선택된 노드, 편집 모드) */}
                  {isSel && editMode && tool === 'select' && (
                    <Rect
                      x={dims.w - 5} y={dims.h - 5}
                      width={10} height={10}
                      fill="#3b82f6" cornerRadius={2}
                      draggable
                      dragBoundFunc={(pos) => ({
                        x: Math.max(pos.x, node.x - dims.w / 2 + 15),  // 최소 20px
                        y: Math.max(pos.y, node.y - dims.h / 2 + 15),
                      })}
                      onDragMove={(e) => handleResizeDragMove(node.id, e)}
                      onDragEnd={(e) => handleResizeDragEnd(node.id, e)}
                    />
                  )}
                </Group>
              )
            })}
          </Layer>
        </Stage>

        {/* 줌 인디케이터 */}
        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none">
          {Math.round(scale * 100)}%
        </div>

        {!editMode && localNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[13px] text-slate-400">편집 모드에서 P&amp;ID 심볼을 추가하세요</p>
          </div>
        )}
      </div>

      {/* 심볼 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-[360px]">
            <p className="text-[13px] font-semibold text-slate-800 m-0 mb-3">
              {editing.id === null ? '심볼 추가' : '심볼 수정'}
            </p>

            {/* 심볼 유형 (이미지 없을 때만) */}
            {!editing.imageBase64 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {PALETTE.map((type) => (
                  <button key={type}
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

            {/* 이미지 업로드 */}
            <div className="mb-3">
              {editing.imageBase64 ? (
                <div className="flex items-start gap-2">
                  <img src={editing.imageBase64} alt="" className="h-16 w-16 object-contain rounded border border-slate-200 bg-slate-50" />
                  <div className="flex flex-col gap-1.5">
                    <label className="h-7 px-2.5 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center">
                      이미지 교체
                      <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                    </label>
                    <button
                      onClick={() => setEditing((s) => s ? { ...s, imageBase64: '' } : s)}
                      className="h-7 px-2.5 text-[11px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      이미지 제거
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 h-9 px-3 border border-dashed border-slate-300 rounded-lg text-[12px] text-slate-500 hover:bg-slate-50 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2 12l3-4 2 2.5L10 7l4 5H2z" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="1" y="1" width="14" height="14" rx="2" />
                  </svg>
                  이미지 선택 (선택 시 심볼 대신 표시)
                  <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                </label>
              )}
            </div>

            <input
              autoFocus
              value={editing.label}
              onChange={(e) => setEditing((s) => (s ? { ...s, label: e.target.value } : s))}
              placeholder={editing.type === 'instrument' ? '태그 (예: LT, LC-101)' : '이름'}
              className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087]"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit() }}
            />

            {equipmentOptions && equipmentOptions.length > 0 && (
              <select
                value={editing.deviceCode}
                onChange={(e) => setEditing((s) => (s ? { ...s, deviceCode: e.target.value } : s))}
                className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087] bg-white"
              >
                <option value="">설비 연결 안 함</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq.code} value={eq.code}>{eq.name} ({eq.code})</option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2">
              {editing.id !== null && (
                <button onClick={handleDeleteEditing}
                  className="h-8 px-3 text-[12px] text-red-500 hover:bg-red-50 rounded-lg mr-auto"
                >삭제</button>
              )}
              <button onClick={() => setEditing(null)} className="h-8 px-3 text-[12px] text-slate-500 hover:bg-slate-50 rounded-lg">취소</button>
              <button onClick={handleSaveEdit} className="h-8 px-3 text-[12px] bg-[#003087] text-white rounded-lg hover:bg-[#002470]">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
