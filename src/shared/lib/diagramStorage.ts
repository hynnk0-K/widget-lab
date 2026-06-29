import type { Edge, Node } from '@xyflow/react'
import { api } from '@/shared/lib/api'

export interface DiagramData {
  nodes: Node[]
  edges: Edge[]
}

export type MapMode = 'image' | 'diagram'

const SCOPE_PATH: Record<'process' | 'line', string> = {
  process: '/master/processes',
  line: '/master/lines',
}

export function loadMapMode(scope: 'process' | 'line', id: number): MapMode {
  const v = localStorage.getItem(`map-mode:${scope}:${id}`)
  return v === 'diagram' ? 'diagram' : 'image'
}

export function saveMapMode(scope: 'process' | 'line', id: number, mode: MapMode) {
  localStorage.setItem(`map-mode:${scope}:${id}`, mode)
}

// 다이어그램 위에 업로드 이미지를 배경으로 깔지 여부 (이미지/다이어그램 양자택일이 아니라 둘을 같이 쓰는 경우용)
export function loadBgVisible(scope: 'process' | 'line', id: number): boolean {
  return localStorage.getItem(`map-bg:${scope}:${id}`) !== 'off'
}

export function saveBgVisible(scope: 'process' | 'line', id: number, visible: boolean) {
  localStorage.setItem(`map-bg:${scope}:${id}`, visible ? 'on' : 'off')
}

export async function loadDiagram(scope: 'process' | 'line', id: number): Promise<DiagramData> {
  try {
    const data = await api.get<Partial<DiagramData>>(`${SCOPE_PATH[scope]}/${id}/diagram`)
    return { nodes: data.nodes ?? [], edges: data.edges ?? [] }
  } catch {
    return { nodes: [], edges: [] } // 저장된 도면 없음 (404)
  }
}

export async function saveDiagram(scope: 'process' | 'line', id: number, data: DiagramData) {
  await api.put(`${SCOPE_PATH[scope]}/${id}/diagram`, data)
}
