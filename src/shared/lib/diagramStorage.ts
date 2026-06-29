import type { Edge, Node } from '@xyflow/react'

export interface DiagramData {
  nodes: Node[]
  edges: Edge[]
}

export type MapMode = 'image' | 'diagram'

// ponytail: 백엔드에 diagram/mode 저장 API가 아직 없어서 localStorage로 우선 처리.
// 서버 동기화가 필요해지면 /master/processes/:id/diagram, /master/lines/:id/diagram 같은
// 엔드포인트를 추가하고 이 두 함수만 api.get/put으로 교체하면 됨.

export function loadMapMode(scope: 'process' | 'line', id: number): MapMode {
  const v = localStorage.getItem(`map-mode:${scope}:${id}`)
  return v === 'diagram' ? 'diagram' : 'image'
}

export function saveMapMode(scope: 'process' | 'line', id: number, mode: MapMode) {
  localStorage.setItem(`map-mode:${scope}:${id}`, mode)
}

export function loadDiagram(scope: 'process' | 'line', id: number): DiagramData {
  const raw = localStorage.getItem(`diagram:${scope}:${id}`)
  if (!raw) return { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(raw)
    return { nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export function saveDiagram(scope: 'process' | 'line', id: number, data: DiagramData) {
  localStorage.setItem(`diagram:${scope}:${id}`, JSON.stringify(data))
}
