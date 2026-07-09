import { api } from '@/shared/lib/api'

// ── P&ID 심볼 타입 ────────────────────────────────────────────────
export type PidSymbolType =
  | 'valve_gate'
  | 'valve_globe'
  | 'valve_check'
  | 'valve_ball'
  | 'instrument'
  | 'tank'
  | 'pump'
  | 'motor'
  | 'heat_exchanger'
  | 'filter'
  | 'compressor'
  | 'conveyor'
  | 'agitator'
  | 'generic'
  | 'zone' // 구역 레이블 (WBGT 등 오버레이용)
  | 'equipment' // 스크립트 자동 생성 설비 노드

export type PortSide = 't' | 'r' | 'b' | 'l' // 노즐(포트) 위치

export interface DiagramNode {
  id: string
  type: PidSymbolType
  x: number
  y: number
  rotation?: number
  label?: string // instrument: 버블 안 태그(LT, LC), 그 외: 아래 레이블
  deviceCode?: string
  width?: number // 사용자 지정 너비 (없으면 심볼 기본 크기)
  height?: number // 사용자 지정 높이
  imageBase64?: string // 설정 시 심볼 대신 이미지 렌더
  linkedId?: number // zone: 연결된 공정/라인 ID, equipment: 설비 ID
  zoneKind?: 'line' | 'type' // 자동 생성 zone 구분 (line=배경, type=타입그룹)
  color?: string // zone 커스텀 색상 (타입그룹별)
  equipmentType?: string // 설비 타입 분류 (WBGT, CNC 등)
}

export interface DiagramEdge {
  id: string
  fromId: string
  toId: string
  edgeType: 'pipe' | 'signal'
  medium?: string // 배관 매체 (PIPE_MEDIUM 키) — 없으면 기본 색
  fromPort?: PortSide // 연결 노즐 — 없으면 자동(지배 축) 라우팅
  toPort?: PortSide
}

export interface DiagramData {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

// ── 저장 모드 ─────────────────────────────────────────────────────
export type MapMode = 'image' | 'diagram'

const SCOPE_PATH: Record<'factory' | 'process' | 'line', string> = {
  factory: '/master/factories',
  process: '/master/processes',
  line: '/master/lines',
}

export function loadMapMode(scope: 'factory' | 'process' | 'line', id: number): MapMode {
  const v = localStorage.getItem(`map-mode:${scope}:${id}`)
  return v === 'diagram' ? 'diagram' : 'image'
}

export function saveMapMode(scope: 'factory' | 'process' | 'line', id: number, mode: MapMode) {
  localStorage.setItem(`map-mode:${scope}:${id}`, mode)
}

export function loadBgVisible(scope: 'process' | 'line', id: number): boolean {
  return localStorage.getItem(`map-bg:${scope}:${id}`) !== 'off'
}

export function saveBgVisible(scope: 'process' | 'line', id: number, visible: boolean) {
  localStorage.setItem(`map-bg:${scope}:${id}`, visible ? 'on' : 'off')
}

// ── API ───────────────────────────────────────────────────────────
// 이전 React Flow 형식(nodes[].position 객체)을 새 형식으로 마이그레이션
function migrate(raw: Record<string, unknown>): DiagramData {
  const rawNodes = (raw.nodes ?? []) as Array<Record<string, unknown>>
  if (!rawNodes.length) return { nodes: [], edges: [] }

  // React Flow 형식 감지
  if (rawNodes[0]?.position && typeof rawNodes[0].position === 'object') {
    const typeMap: Record<string, PidSymbolType> = {
      pump: 'pump',
      valve: 'valve_gate',
      tank: 'tank',
      sensor: 'instrument',
      compressor: 'generic',
      motor: 'motor',
      filter: 'generic',
      heater: 'generic',
      generic: 'generic',
    }
    const nodes: DiagramNode[] = rawNodes.map((n) => {
      const pos = n.position as { x: number; y: number }
      const data = (n.data ?? {}) as Record<string, unknown>
      return {
        id: String(n.id),
        type: typeMap[String(data.icon ?? 'generic')] ?? 'generic',
        x: pos.x + 20,
        y: pos.y + 20,
        label: data.label ? String(data.label) : undefined,
        deviceCode: data.deviceCode ? String(data.deviceCode) : undefined,
      }
    })
    const rawEdges = (raw.edges ?? []) as Array<Record<string, unknown>>
    const edges: DiagramEdge[] = rawEdges.map((e) => ({
      id: String(e.id),
      fromId: String(e.source),
      toId: String(e.target),
      edgeType: 'pipe',
    }))
    return { nodes, edges }
  }

  return {
    nodes: rawNodes as unknown as DiagramNode[],
    edges: (raw.edges ?? []) as unknown[] as DiagramEdge[],
  }
}

export async function loadDiagram(
  scope: 'factory' | 'process' | 'line',
  id: number,
): Promise<DiagramData> {
  try {
    const data = await api.get<Record<string, unknown>>(`${SCOPE_PATH[scope]}/${id}/diagram`)
    return migrate(data)
  } catch {
    return { nodes: [], edges: [] }
  }
}

export async function saveDiagram(
  scope: 'factory' | 'process' | 'line',
  id: number,
  data: DiagramData,
) {
  await api.put(`${SCOPE_PATH[scope]}/${id}/diagram`, data)
}
