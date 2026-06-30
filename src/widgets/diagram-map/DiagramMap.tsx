import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeDragHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EquipmentNode, ICON_OPTIONS, type IconKey } from './EquipmentNode'
import { GroupNode } from './GroupNode'

export interface EquipmentOption {
  code: string
  name: string
}

interface Props {
  nodes: Node[]
  edges: Edge[]
  editMode?: boolean
  onChange?: (nodes: Node[], edges: Edge[]) => void
  /** 노드 편집 시 연결할 설비 선택 목록 (없으면 연결 설비 선택 UI 숨김) */
  equipmentOptions?: EquipmentOption[]
  /** deviceCode → 알람 심각도. 보기 전용 모드에서 해당 노드를 깜빡이게 표시 */
  alarmStatusByDevice?: Record<string, 'critical' | 'warning'>
  /** 현재 선택된 알람의 deviceCode — 일치하는 노드를 강조 표시 */
  selectedDeviceCode?: string | null
  /** 업로드된 평면도 이미지를 다이어그램 배경으로 깔기 (없으면 표시 안 함) */
  backgroundImage?: { base64: string; width: number; height: number } | null
}

const NODE_TYPES = { equipment: EquipmentNode, group: GroupNode }

const EQUIPMENT_DEFAULT_SIZE = { width: 92, height: 64 }

let nextId = 1

interface EditState {
  nodeId: string | null // null = 새 노드 생성
  label: string
  icon: IconKey
  deviceCode: string
}

function DiagramMapInner({
  nodes,
  edges,
  editMode = false,
  onChange,
  equipmentOptions,
  alarmStatusByDevice,
  selectedDeviceCode,
  backgroundImage,
}: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges)
  const [editing, setEditing] = useState<EditState | null>(null)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    onChangeRef.current?.(rfNodes, rfEdges)
  }, [rfNodes, rfEdges])

  // 장비 노드 크기 기본값 + 알람 상태/선택 표시 주입
  const nodesWithAlarm = useMemo(() => {
    return rfNodes.map((n) => {
      if (n.type !== 'equipment') return n
      const deviceCode = n.data.deviceCode as string | undefined
      const needsDefaultSize = !n.style?.width || !n.style?.height
      return {
        ...n,
        style: needsDefaultSize
          ? { ...n.style, width: n.style?.width ?? EQUIPMENT_DEFAULT_SIZE.width, height: n.style?.height ?? EQUIPMENT_DEFAULT_SIZE.height }
          : n.style,
        data: {
          ...n.data,
          alarmStatus: (deviceCode && alarmStatusByDevice?.[deviceCode]) ?? null,
          selected: Boolean(deviceCode && deviceCode === selectedDeviceCode),
        },
      }
    })
  }, [rfNodes, alarmStatusByDevice, selectedDeviceCode])

  // 그룹 노드가 자식보다 먼저 렌더링돼야 React Flow가 parentId를 인식함
  const orderedNodes = useMemo(
    () =>
      [...nodesWithAlarm].sort(
        (a, b) => (a.type === 'group' ? -1 : 0) - (b.type === 'group' ? -1 : 0),
      ),
    [nodesWithAlarm],
  )

  function handleConnect(conn: Connection) {
    if (!editMode) return
    setRfEdges((curr) => addEdge(conn, curr))
  }

  function handleAddGroup() {
    const label = window.prompt('그룹/라인 이름 (예: 1라인)')
    if (!label) return
    const id = `g${nextId++}`
    const node: Node = {
      id,
      type: 'group',
      position: { x: 40 + Math.random() * 100, y: 40 + Math.random() * 100 },
      style: { width: 260, height: 180 },
      data: { label },
    }
    setRfNodes((curr) => [...curr, node])
  }

  // 장비를 그룹 박스 영역 위에 드롭하면 그 그룹 소속으로 표시(절대좌표 교차 검사, 없으면 소속 해제)
  const handleNodeDragStop: NodeDragHandler = (_e, node) => {
    if (node.type === 'group') return
    const w = (node.measured?.width ?? 0) / 2
    const h = (node.measured?.height ?? 0) / 2
    const cx = node.position.x + w
    const cy = node.position.y + h
    const group = rfNodes.find((g) => {
      if (g.type !== 'group') return false
      const gw = Number(g.style?.width ?? 0)
      const gh = Number(g.style?.height ?? 0)
      return (
        cx >= g.position.x && cx <= g.position.x + gw && cy >= g.position.y && cy <= g.position.y + gh
      )
    })
    setRfNodes((curr) =>
      curr.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, groupId: group?.id } } : n)),
    )
  }

  function handleNodeDoubleClick(_e: React.MouseEvent, node: Node) {
    if (!editMode) return
    setEditing({
      nodeId: node.id,
      label: String(node.data.label ?? ''),
      icon: (node.data.icon as IconKey) ?? 'generic',
      deviceCode: String(node.data.deviceCode ?? ''),
    })
  }

  function handleSaveEdit() {
    if (!editing || !editing.label.trim()) return
    if (editing.nodeId === null) {
      const id = `n${nextId++}`
      const node: Node = {
        id,
        type: 'equipment',
        position: { x: 80 + Math.random() * 200, y: 80 + Math.random() * 200 },
        data: { label: editing.label, icon: editing.icon, deviceCode: editing.deviceCode || undefined },
      }
      setRfNodes((curr) => [...curr, node])
    } else {
      setRfNodes((curr) =>
        curr.map((n) =>
          n.id === editing.nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: editing.label,
                  icon: editing.icon,
                  deviceCode: editing.deviceCode || undefined,
                },
              }
            : n,
        ),
      )
    }
    setEditing(null)
  }

  function handleDeleteNode() {
    if (!editing || editing.nodeId === null) return
    const nodeId = editing.nodeId
    setRfNodes((curr) => curr.filter((n) => n.id !== nodeId))
    setRfEdges((curr) => curr.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setEditing(null)
  }

  return (
    <div
      className="relative w-full bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ height: 520 }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage.base64}
          alt="배경 도면"
          className="absolute inset-0 w-full h-full object-contain opacity-60 pointer-events-none"
        />
      )}
      {editMode && (
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing({ nodeId: null, label: '', icon: 'generic', deviceCode: '' })}
            className="h-8 px-3 bg-[#003087] text-white text-[12px] font-medium rounded-lg hover:bg-[#002470] transition-colors"
          >
            + 장비 추가
          </button>
          <button
            type="button"
            onClick={handleAddGroup}
            className="h-8 px-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            + 그룹 추가
          </button>
        </div>
      )}
      <ReactFlow
        nodes={orderedNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        nodesDraggable={editMode}
        nodesConnectable={editMode}
        elementsSelectable={editMode}
        deleteKeyCode={editMode ? ['Backspace', 'Delete'] : null}
        fitView
      >
        {!backgroundImage && <Background />}
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>

      {editing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-[300px]">
            <p className="text-[13px] font-semibold text-slate-800 m-0 mb-3">
              {editing.nodeId === null ? '장비 추가' : '장비 수정'}
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditing((s) => (s ? { ...s, icon: key } : s))}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] ${
                    editing.icon === key
                      ? 'border-[#003087] bg-blue-50 text-[#003087]'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={editing.label}
              onChange={(e) => setEditing((s) => (s ? { ...s, label: e.target.value } : s))}
              placeholder="장비 이름"
              className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087]"
            />
            {equipmentOptions && equipmentOptions.length > 0 && (
              <select
                value={editing.deviceCode}
                onChange={(e) => setEditing((s) => (s ? { ...s, deviceCode: e.target.value } : s))}
                className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087] bg-white"
              >
                <option value="">연결 설비 안 함</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq.code} value={eq.code}>
                    {eq.name} ({eq.code})
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2">
              {editing.nodeId !== null && (
                <button
                  type="button"
                  onClick={handleDeleteNode}
                  className="h-8 px-3 text-[12px] text-red-500 hover:bg-red-50 rounded-lg mr-auto"
                >
                  삭제
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-8 px-3 text-[12px] text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                취소
              </button>
              <button
                type="button"
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

export function DiagramMap(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramMapInner {...props} />
    </ReactFlowProvider>
  )
}
