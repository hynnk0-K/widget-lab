import { api } from '@/shared/lib/api'
import type { DiagramEdge } from '@/shared/lib/diagramStorage'

export type FlowParentType = 'FACTORY' | 'PROCESS' | 'LINE'

// BE FlowEdgeController.FlowEdgeDto
interface FlowEdgeDto {
  fromType: string
  fromId: number
  toType: string
  toId: number
  edgeType: string
  label: string | null
  displayOrder: number
}

// diagram 노드 id 접두사 → flow_edges 엔티티 타입
const PREFIX_TYPE: Record<string, string> = {
  eq: 'EQUIPMENT',
  sensor: 'SENSOR',
  line: 'LINE',
  line_bg: 'LINE',
  process: 'PROCESS',
  factory: 'FACTORY',
}

// 노드 id("eq_1", "sensor_31", "line_bg_2") → (type, id). 엔티티가 아니면(zone/자유심볼) null
function parseNodeRef(nodeId: string): { type: string; id: number } | null {
  const idx = nodeId.lastIndexOf('_')
  if (idx < 0) return null
  const prefix = nodeId.slice(0, idx)
  const n = Number(nodeId.slice(idx + 1))
  const type = PREFIX_TYPE[prefix]
  if (!type || !Number.isInteger(n)) return null
  return { type, id: n }
}

// diagram 엣지 → flow_edges 일괄 저장 (전량 교체)
// 엔티티 노드끼리의 연결만 저장됨 — zone/자유 P&ID 심볼 간 엣지는 flow_edges에 담을 수 없어 제외
export async function saveFlowEdges(
  parentType: FlowParentType,
  parentId: number,
  edges: DiagramEdge[],
): Promise<void> {
  const dtos: FlowEdgeDto[] = []
  edges.forEach((e, i) => {
    const from = parseNodeRef(e.fromId)
    const to = parseNodeRef(e.toId)
    if (!from || !to) return
    dtos.push({
      fromType: from.type,
      fromId: from.id,
      toType: to.type,
      toId: to.id,
      edgeType: e.edgeType ?? 'flow',
      label: e.label ?? null,
      displayOrder: i,
    })
  })
  await api.put(`/flow-edges/bulk?parentType=${parentType}&parentId=${parentId}`, dtos)
}
