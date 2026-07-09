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
import type { Layer as KonvaLayer } from 'konva/lib/Layer'
import type { Line as KonvaLine } from 'konva/lib/shapes/Line'
import type { Shape as KonvaShape } from 'konva/lib/Shape'
import type {
  DiagramNode,
  DiagramEdge,
  PidSymbolType,
  PortSide,
} from '@/shared/lib/diagramStorage'

export interface EquipmentOption {
  code: string
  name: string
}

export interface ZoneOption {
  id: number
  name: string
}

export interface ZoneValue {
  value: number
  risk: string // 'safe' | 'caution' | 'warning' | 'danger'
  riskLabel: string
}

export interface SensorMarker {
  label: string
  valueText: string
  risk: 'normal' | 'caution' | 'warning' | 'danger' | 'offline'
}

interface Props {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  editMode?: boolean
  onChange?: (nodes: DiagramNode[], edges: DiagramEdge[]) => void
  equipmentOptions?: EquipmentOption[]
  zoneOptions?: ZoneOption[] // 영역 노드 링크 대상 (라인/공정 목록)
  zoneValueMap?: Record<number, ZoneValue> // linkedId → 실시간 값 (WBGT 등)
  onZoneClick?: (linkedId: number) => void // 뷰 모드에서 영역 클릭 (드릴다운)
  alarmStatusByDevice?: Record<string, 'critical' | 'warning'>
  selectedDeviceCode?: string | null
  backgroundImage?: { base64: string; width: number; height: number } | null
  sensorMarkers?: Record<string, SensorMarker> // deviceCode → 실시간 값. 뷰 모드에서 심볼 대신 상태 칩 렌더
  onMarkerClick?: (deviceCode: string) => void
  onDeviceClick?: (deviceCode: string) => void // 뷰 모드에서 설비 연결 심볼 클릭 (마커 제외)
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
  heat_exchanger: '열교환기',
  filter: '여과기',
  compressor: '압축기',
  conveyor: '컨베이어',
  agitator: '교반기',
  generic: '일반 장비',
  zone: '영역',
  equipment: '설비',
}

const SYMBOL_CATEGORIES: { label: string; types: PidSymbolType[] }[] = [
  { label: '영역', types: ['zone'] },
  { label: '밸브', types: ['valve_gate', 'valve_globe', 'valve_check', 'valve_ball'] },
  { label: '계기', types: ['instrument'] },
  {
    label: '장비',
    types: [
      'tank',
      'pump',
      'motor',
      'heat_exchanger',
      'filter',
      'compressor',
      'conveyor',
      'agitator',
      'generic',
    ],
  },
]

// 배관 매체별 색/굵기 — DiagramEdge.medium 키
export const PIPE_MEDIUM: Record<string, { label: string; color: string; width: number }> = {
  default: { label: '기본', color: '#475569', width: 2 },
  oil: { label: '절삭유/유류', color: '#f59e0b', width: 3 },
  water: { label: '용수/폐수', color: '#0ea5e9', width: 3 },
  chem: { label: '약품', color: '#8b5cf6', width: 2.5 },
  gas: { label: 'LNG/가스', color: '#ef4444', width: 2.5 },
  air: { label: '압축공기', color: '#10b981', width: 2 },
}

const ZONE_RISK_HEX: Record<string, string> = {
  safe: '#22c55e',
  caution: '#eab308',
  warning: '#f97316',
  danger: '#ef4444',
}

const MARKER_STYLE: Record<
  SensorMarker['risk'],
  { stroke: string; fill: string; dot: string; label: string; value: string }
> = {
  normal: { stroke: '#10b981', fill: '#ffffff', dot: '#10b981', label: '#64748b', value: '#0f172a' },
  caution: { stroke: '#eab308', fill: '#fefce8', dot: '#eab308', label: '#854d0e', value: '#713f12' },
  warning: { stroke: '#f97316', fill: '#fff7ed', dot: '#f97316', label: '#9a3412', value: '#7c2d12' },
  danger: { stroke: '#ef4444', fill: '#fef2f2', dot: '#ef4444', label: '#b91c1c', value: '#7f1d1d' },
  offline: { stroke: '#94a3b8', fill: '#f8fafc', dot: '#94a3b8', label: '#94a3b8', value: '#64748b' },
}

// ponytail: 글자폭 근사치(ASCII 0.6em, 한글 1em) — 칩이 어긋나 보이면 Konva measureText로 교체
function approxTextWidth(s: string, fontSize: number): number {
  let w = 0
  for (const ch of s) w += ch.charCodeAt(0) < 256 ? fontSize * 0.6 : fontSize
  return w
}

export function getDefaultDims(type: PidSymbolType): { w: number; h: number } {
  if (type === 'tank') return { w: 28, h: 60 }
  if (type === 'generic') return { w: 68, h: 36 }
  if (type === 'zone') return { w: 160, h: 100 }
  if (type === 'equipment') return { w: 36, h: 36 }
  if (type === 'conveyor') return { w: 76, h: 24 }
  if (type === 'filter') return { w: 34, h: 44 }
  if (type === 'agitator') return { w: 40, h: 56 }
  return { w: 40, h: 40 }
}

// ── 포트(노즐) ────────────────────────────────────────────────────
const PORT_DIR: Record<PortSide, { dx: number; dy: number }> = {
  t: { dx: 0, dy: -1 },
  r: { dx: 1, dy: 0 },
  b: { dx: 0, dy: 1 },
  l: { dx: -1, dy: 0 },
}

function portAnchor(node: DiagramNode, side: PortSide) {
  const d = {
    w: node.width ?? getDefaultDims(node.type).w,
    h: node.height ?? getDefaultDims(node.type).h,
  }
  const dir = PORT_DIR[side]
  return { x: node.x + (dir.dx * d.w) / 2, y: node.y + (dir.dy * d.h) / 2, ...dir }
}

// 클릭 지점에서 가장 가까운 포트 — 반폭/반높이로 정규화해 축 판정
function nearestPort(node: DiagramNode, px: number, py: number): PortSide {
  const d = {
    w: node.width ?? getDefaultDims(node.type).w,
    h: node.height ?? getDefaultDims(node.type).h,
  }
  const nx = (px - node.x) / (d.w / 2)
  const ny = (py - node.y) / (d.h / 2)
  if (Math.abs(nx) >= Math.abs(ny)) return nx >= 0 ? 'r' : 'l'
  return ny >= 0 ? 'b' : 't'
}

// ── 팔레트 SVG 미리보기 ───────────────────────────────────────────
function SymbolSvg({ type }: { type: PidSymbolType }) {
  const c = '#475569'
  const sw = 1.5

  switch (type) {
    case 'zone':
      return (
        <svg width={40} height={28} viewBox="0 0 40 28">
          <rect
            x={1}
            y={1}
            width={38}
            height={26}
            rx={4}
            fill="none"
            stroke={c}
            strokeWidth={sw}
            strokeDasharray="4,2.5"
          />
          <text x={20} y={17} textAnchor="middle" fontSize={9} fontWeight="bold" fill={c}>
            영역
          </text>
        </svg>
      )
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
    case 'equipment':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <rect x={2} y={2} width={28} height={28} rx={4} fill="none" stroke={c} strokeWidth={sw} />
          <circle cx={16} cy={16} r={4} fill={c} />
        </svg>
      )
    case 'heat_exchanger':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={13} fill="none" stroke={c} strokeWidth={sw} />
          <polyline
            points="3,16 9,16 13,10 19,22 23,16 29,16"
            fill="none"
            stroke={c}
            strokeWidth={sw}
          />
        </svg>
      )
    case 'filter':
      return (
        <svg width={26} height={34} viewBox="0 0 26 34">
          <rect x={1} y={1} width={24} height={32} rx={3} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={1} y1={12} x2={25} y2={12} stroke={c} strokeWidth={1} strokeDasharray="3,2" />
          <line x1={1} y1={22} x2={25} y2={22} stroke={c} strokeWidth={1} strokeDasharray="3,2" />
        </svg>
      )
    case 'compressor':
      return (
        <svg width={32} height={32} viewBox="0 0 32 32">
          <circle cx={16} cy={16} r={13} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={5} y1={10} x2={27} y2={14} stroke={c} strokeWidth={sw} />
          <line x1={5} y1={22} x2={27} y2={18} stroke={c} strokeWidth={sw} />
        </svg>
      )
    case 'conveyor':
      return (
        <svg width={40} height={16} viewBox="0 0 40 16">
          <circle cx={8} cy={8} r={6} fill="none" stroke={c} strokeWidth={sw} />
          <circle cx={32} cy={8} r={6} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={8} y1={2} x2={32} y2={2} stroke={c} strokeWidth={sw} />
          <line x1={8} y1={14} x2={32} y2={14} stroke={c} strokeWidth={sw} />
        </svg>
      )
    case 'agitator':
      return (
        <svg width={24} height={34} viewBox="0 0 24 34">
          <rect x={7} y={1} width={10} height={7} fill="none" stroke={c} strokeWidth={sw} />
          <line x1={12} y1={8} x2={12} y2={24} stroke={c} strokeWidth={sw} />
          <line x1={4} y1={28} x2={12} y2={24} stroke={c} strokeWidth={sw} />
          <line x1={20} y1={28} x2={12} y2={24} stroke={c} strokeWidth={sw} />
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

// ── Konva P&ID 심볼 ───────────────────────────────────────────────
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
    case 'equipment':
      return (
        <>
          <Rect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            stroke={color}
            strokeWidth={1.5}
            cornerRadius={4}
          />
          <Circle x={w / 2} y={h / 2} radius={4} fill={color} />
        </>
      )
    case 'heat_exchanger':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.42} stroke={color} strokeWidth={1.5} />
          <Line
            points={[0, cy, w * 0.28, cy, w * 0.4, cy - h * 0.2, w * 0.6, cy + h * 0.2, w * 0.72, cy, w, cy]}
            stroke={color}
            strokeWidth={1.5}
          />
        </>
      )
    case 'filter':
      return (
        <>
          <Rect
            x={1}
            y={1}
            width={w - 2}
            height={h - 2}
            stroke={color}
            strokeWidth={1.5}
            cornerRadius={3}
          />
          <Line points={[1, h * 0.36, w - 1, h * 0.36]} stroke={color} strokeWidth={1} dash={[3, 2]} />
          <Line points={[1, h * 0.64, w - 1, h * 0.64]} stroke={color} strokeWidth={1} dash={[3, 2]} />
        </>
      )
    case 'compressor':
      return (
        <>
          <Circle x={cx} y={cy} radius={w * 0.42} stroke={color} strokeWidth={1.5} />
          <Line points={[cx - w * 0.34, cy - h * 0.2, cx + w * 0.34, cy - h * 0.06]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx - w * 0.34, cy + h * 0.2, cx + w * 0.34, cy + h * 0.06]} stroke={color} strokeWidth={1.5} />
        </>
      )
    case 'conveyor': {
      const r = h / 2 - 1
      return (
        <>
          <Circle x={r + 1} y={cy} radius={r} stroke={color} strokeWidth={1.5} />
          <Circle x={w - r - 1} y={cy} radius={r} stroke={color} strokeWidth={1.5} />
          <Line points={[r + 1, 1, w - r - 1, 1]} stroke={color} strokeWidth={1.5} />
          <Line points={[r + 1, h - 1, w - r - 1, h - 1]} stroke={color} strokeWidth={1.5} />
        </>
      )
    }
    case 'agitator':
      return (
        <>
          <Rect x={cx - w * 0.2} y={0} width={w * 0.4} height={h * 0.16} stroke={color} strokeWidth={1.5} />
          <Line points={[cx, h * 0.16, cx, h * 0.72]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx - w * 0.36, h * 0.88, cx, h * 0.72]} stroke={color} strokeWidth={1.5} />
          <Line points={[cx + w * 0.36, h * 0.88, cx, h * 0.72]} stroke={color} strokeWidth={1.5} />
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

// 직교(Manhattan) 배관 라우팅 — 포트 지정 시 노즐에서 스텁으로 나간 뒤 직교 연결,
// 미지정 시 지배 축 기준 ㄷ자(Z자) 자동 경로
function calcEdgePoints(
  from: DiagramNode,
  to: DiagramNode,
  fromPort?: PortSide,
  toPort?: PortSide,
): number[] {
  if (fromPort && toPort) {
    const a = portAnchor(from, fromPort)
    const b = portAnchor(to, toPort)
    const STUB = 14
    const s1 = { x: a.x + a.dx * STUB, y: a.y + a.dy * STUB }
    const s2 = { x: b.x + b.dx * STUB, y: b.y + b.dy * STUB }
    const pts = [a.x, a.y, s1.x, s1.y]
    if (Math.abs(s1.x - s2.x) < 0.5 || Math.abs(s1.y - s2.y) < 0.5) {
      pts.push(s2.x, s2.y)
    } else if (a.dx !== 0) {
      const mx = (s1.x + s2.x) / 2
      pts.push(mx, s1.y, mx, s2.y, s2.x, s2.y)
    } else {
      const my = (s1.y + s2.y) / 2
      pts.push(s1.x, my, s2.x, my, s2.x, s2.y)
    }
    pts.push(b.x, b.y)
    return pts
  }

  const fd = {
    w: from.width ?? getDefaultDims(from.type).w,
    h: from.height ?? getDefaultDims(from.type).h,
  }
  const td = { w: to.width ?? getDefaultDims(to.type).w, h: to.height ?? getDefaultDims(to.type).h }
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    // 좌우로 나가서 좌우로 들어옴
    const sx = Math.sign(dx || 1)
    const fx = from.x + (sx * fd.w) / 2
    const tx = to.x - (sx * td.w) / 2
    if (Math.abs(dy) < 1) return [fx, from.y, tx, to.y]
    const mx = (fx + tx) / 2
    return [fx, from.y, mx, from.y, mx, to.y, tx, to.y]
  }
  // 상하로 나가서 상하로 들어옴
  const sy = Math.sign(dy || 1)
  const fy = from.y + (sy * fd.h) / 2
  const ty = to.y - (sy * td.h) / 2
  if (Math.abs(dx) < 1) return [from.x, fy, to.x, ty]
  const my = (fy + ty) / 2
  return [from.x, fy, from.x, my, to.x, my, to.x, ty]
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
interface EditState {
  id: string | null
  type: PidSymbolType
  label: string
  deviceCode: string
  imageBase64: string
  linkedId: number | null
}

let _id = Date.now()

export function DiagramMap({
  nodes,
  edges,
  editMode = false,
  onChange,
  equipmentOptions,
  zoneOptions,
  zoneValueMap,
  onZoneClick,
  alarmStatusByDevice,
  selectedDeviceCode,
  backgroundImage,
  sensorMarkers,
  onMarkerClick,
  onDeviceClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 520 })
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  const [localNodes, setLocalNodes] = useState<DiagramNode[]>(nodes)
  const [localEdges, setLocalEdges] = useState<DiagramEdge[]>(edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'pipe' | 'signal'>('select')
  const [pendingFrom, setPendingFrom] = useState<{ id: string; port: PortSide } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [editing, setEditing] = useState<EditState | null>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [resizingDims, setResizingDims] = useState<{ id: string; w: number; h: number } | null>(
    null,
  )
  const [imgCache, setImgCache] = useState<Map<string, HTMLImageElement>>(new Map())
  const autoFittedRef = useRef(false)
  const layerRef = useRef<KonvaLayer>(null)

  // 배관 흐름 + 알람 점멸 애니메이션 — React 재렌더 없이 Konva 노드만 갱신 (rAF)
  const hasPipes = localEdges.some((e) => e.edgeType === 'pipe')
  const hasBlink =
    !editMode &&
    localNodes.some((n) => n.deviceCode && alarmStatusByDevice?.[n.deviceCode] === 'critical')
  useEffect(() => {
    if (!hasPipes && !hasBlink) return
    let raf = 0
    const tick = (t: number) => {
      const layer = layerRef.current
      if (layer) {
        const off = -((t / 75) % 12)
        for (const l of layer.find<KonvaLine>('.flow-dash')) l.dashOffset(off)
        const op = 0.35 + 0.65 * Math.abs(Math.sin(t / 280))
        for (const c of layer.find<KonvaShape>('.alarm-blink')) c.opacity(op)
        layer.batchDraw()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hasPipes, hasBlink])

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
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, cell, cell)
    ctx.strokeStyle = '#e2e8f0'
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

  function handleNodeClick(nodeId: string, e: KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (tool === 'select' || !editMode) {
      if (!editMode && onDeviceClick) {
        const node = localNodes.find((n) => n.id === nodeId)
        if (node?.deviceCode) {
          onDeviceClick(node.deviceCode)
          return
        }
      }
      setSelectedId(nodeId === selectedId ? null : nodeId)
      return
    }
    // 배관/신호선 도구: 클릭 지점에서 가장 가까운 노즐(포트)에 스냅
    const node = localNodes.find((n) => n.id === nodeId)
    if (!node) return
    const ptr = e.target.getStage()?.getRelativePointerPosition()
    const port = ptr ? nearestPort(node, ptr.x, ptr.y) : 'r'
    if (!pendingFrom) {
      setPendingFrom({ id: nodeId, port })
      return
    }
    if (pendingFrom.id === nodeId) {
      setPendingFrom(null)
      return
    }
    const edge: DiagramEdge = {
      id: `e${_id++}`,
      fromId: pendingFrom.id,
      toId: nodeId,
      edgeType: tool,
      fromPort: pendingFrom.port,
      toPort: port,
    }
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
      linkedId: node.linkedId ?? null,
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
    const base: Partial<DiagramNode> = {
      type: editing.type,
      label: editing.label || undefined,
      deviceCode: editing.type !== 'zone' ? editing.deviceCode || undefined : undefined,
      imageBase64: editing.imageBase64 || undefined,
      linkedId: editing.type === 'zone' ? (editing.linkedId ?? undefined) : undefined,
    }
    if (editing.id === null) {
      const el = containerRef.current
      const w = el?.offsetWidth ?? stageSize.w,
        h = el?.offsetHeight ?? stageSize.h
      const node: DiagramNode = {
        id: `n${_id++}`,
        type: editing.type,
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
    if (selectedId === node.id || pendingFrom?.id === node.id) return '#3b82f6'
    return '#334155'
  }

  const zoneNodes = localNodes.filter((n) => n.type === 'zone')
  const symbolNodes = localNodes.filter((n) => n.type !== 'zone')

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

          {(() => {
            const selEdge = selectedId ? localEdges.find((e) => e.id === selectedId) : undefined
            if (!selEdge || selEdge.edgeType !== 'pipe') return null
            return (
              <select
                value={selEdge.medium ?? 'default'}
                onChange={(e) => {
                  const next = localEdges.map((ed) =>
                    ed.id === selEdge.id ? { ...ed, medium: e.target.value } : ed,
                  )
                  setLocalEdges(next)
                  emit(localNodes, next)
                }}
                className="h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:border-[#003087]"
                title="배관 매체"
              >
                {Object.entries(PIPE_MEDIUM).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            )
          })()}

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
            <Layer ref={layerRef}>
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

              {/* 영역 노드 — 심볼보다 먼저 그려서 뒤에 위치 */}
              {zoneNodes.map((node) => {
                const dims = nodeDims(node)
                const isSel = selectedId === node.id
                const zoneData = node.linkedId != null ? zoneValueMap?.[node.linkedId] : undefined
                const zColor = zoneData
                  ? (ZONE_RISK_HEX[zoneData.risk] ?? '#64748b')
                  : (node.color ?? '#64748b')

                return (
                  <Group
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    offsetX={dims.w / 2}
                    offsetY={dims.h / 2}
                    draggable={editMode && tool === 'select'}
                    onClick={(e) => {
                      e.cancelBubble = true
                      if (!editMode && node.linkedId != null) {
                        onZoneClick?.(node.linkedId)
                      } else if (editMode) {
                        handleNodeClick(node.id, e)
                      }
                    }}
                    onDblClick={(e) => handleNodeDblClick(node.id, e)}
                    onDragEnd={(e) => handleNodeDragEnd(node.id, e.target.x(), e.target.y())}
                  >
                    <Rect
                      x={0}
                      y={0}
                      width={dims.w}
                      height={dims.h}
                      fill={zColor}
                      opacity={
                        zoneData
                          ? 0.15
                          : node.zoneKind === 'line'
                            ? 0.02
                            : node.zoneKind === 'type'
                              ? 0.08
                              : 0.04
                      }
                      cornerRadius={6}
                    />
                    <Rect
                      x={0}
                      y={0}
                      width={dims.w}
                      height={dims.h}
                      stroke={isSel ? '#3b82f6' : zColor}
                      strokeWidth={isSel ? 2 : 1.5}
                      dash={[6, 3]}
                      cornerRadius={6}
                    />
                    {node.label && (
                      <Text
                        x={4}
                        y={8}
                        width={dims.w - 8}
                        align="center"
                        text={node.label}
                        fontSize={12}
                        fontStyle="bold"
                        fill={zColor}
                        listening={false}
                      />
                    )}
                    {zoneData && (
                      <>
                        <Text
                          x={0}
                          y={dims.h / 2 - 14}
                          width={dims.w}
                          align="center"
                          text={`${zoneData.value}°C`}
                          fontSize={22}
                          fontStyle="bold"
                          fill={zColor}
                          listening={false}
                        />
                        <Text
                          x={0}
                          y={dims.h / 2 + 12}
                          width={dims.w}
                          align="center"
                          text={zoneData.riskLabel}
                          fontSize={10}
                          fill={zColor}
                          listening={false}
                        />
                      </>
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

              {localEdges.map((edge) => {
                const from = nodesMap[edge.fromId],
                  to = nodesMap[edge.toId]
                if (!from || !to) return null
                const pts = calcEdgePoints(from, to, edge.fromPort, edge.toPort)
                const isSel = selectedId === edge.id
                const isPipe = edge.edgeType === 'pipe'
                const med = PIPE_MEDIUM[edge.medium ?? 'default'] ?? PIPE_MEDIUM.default
                const stroke = isSel ? '#3b82f6' : isPipe ? med.color : '#475569'
                return (
                  <Group key={edge.id}>
                    <Arrow
                      points={pts}
                      stroke={stroke}
                      strokeWidth={isPipe ? med.width : 1.5}
                      dash={isPipe ? undefined : [7, 4]}
                      fill={stroke}
                      pointerLength={isPipe ? 9 : 0}
                      pointerWidth={isPipe ? 6 : 0}
                      hitStrokeWidth={14}
                      lineJoin="round"
                      onClick={(e) => handleEdgeClick(edge.id, e)}
                    />
                    {isPipe && (
                      <Line
                        points={pts}
                        stroke="#ffffff"
                        strokeWidth={Math.max(1, med.width * 0.4)}
                        dash={[7, 5]}
                        name="flow-dash"
                        opacity={0.85}
                        lineJoin="round"
                        listening={false}
                      />
                    )}
                  </Group>
                )
              })}

              {pendingFrom &&
                nodesMap[pendingFrom.id] &&
                (() => {
                  const a = portAnchor(nodesMap[pendingFrom.id], pendingFrom.port)
                  return (
                    <Line
                      points={[a.x, a.y, mousePos.x, mousePos.y]}
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      dash={tool === 'signal' ? [7, 4] : undefined}
                      opacity={0.7}
                      listening={false}
                    />
                  )
                })()}

              {/* 심볼 노드 */}
              {symbolNodes.map((node) => {
                const marker =
                  !editMode && node.deviceCode ? sensorMarkers?.[node.deviceCode] : undefined
                if (marker) {
                  const st = MARKER_STYLE[marker.risk]
                  // 마커는 역스케일로 화면 고정 크기 유지 — 축소해도 읽을 수 있게
                  const inv = 1 / scale
                  const abnormal =
                    marker.risk === 'caution' ||
                    marker.risk === 'warning' ||
                    marker.risk === 'danger'
                  // ponytail: 마커 LOD — 축소 상태에선 정상/단절은 점, 이상만 칩. 0.5배 이상 확대하면 전부 칩. 임계 조정은 여기.
                  const showChip = abnormal || scale >= 0.5
                  if (!showChip) {
                    return (
                      <Group
                        key={node.id}
                        x={node.x}
                        y={node.y}
                        scaleX={inv}
                        scaleY={inv}
                        opacity={marker.risk === 'offline' ? 0.55 : 1}
                        onClick={(e) => {
                          e.cancelBubble = true
                          onMarkerClick?.(node.deviceCode!)
                        }}
                      >
                        <Circle
                          radius={4.5}
                          fill={st.dot}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          hitStrokeWidth={10}
                        />
                      </Group>
                    )
                  }
                  const danger = marker.risk === 'danger'
                  const labelFs = danger ? 12 : 11
                  const valueFs = danger ? 14 : 12
                  const h = danger ? 32 : 26
                  const labelW = approxTextWidth(marker.label, labelFs)
                  const valueW = approxTextWidth(marker.valueText, valueFs)
                  const w = 20 + labelW + 7 + valueW + 12
                  return (
                    <Group
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      scaleX={inv}
                      scaleY={inv}
                      offsetX={w / 2}
                      offsetY={h / 2}
                      opacity={marker.risk === 'offline' ? 0.75 : 1}
                      onClick={(e) => {
                        e.cancelBubble = true
                        onMarkerClick?.(node.deviceCode!)
                      }}
                    >
                      <Rect
                        width={w}
                        height={h}
                        fill={st.fill}
                        stroke={st.stroke}
                        strokeWidth={danger ? 2.5 : 1.5}
                        cornerRadius={h / 2}
                        shadowColor={danger ? '#ef4444' : undefined}
                        shadowBlur={danger ? 8 : 0}
                        shadowOpacity={danger ? 0.5 : 0}
                      />
                      <Circle x={13} y={h / 2} radius={3.5} fill={st.dot} listening={false} />
                      <Text
                        x={20}
                        y={(h - labelFs) / 2 - 1}
                        text={marker.label}
                        fontSize={labelFs}
                        fill={st.label}
                        listening={false}
                      />
                      <Text
                        x={20 + labelW + 7}
                        y={(h - valueFs) / 2 - 1}
                        text={marker.valueText}
                        fontSize={valueFs}
                        fontStyle="bold"
                        fill={st.value}
                        listening={false}
                      />
                    </Group>
                  )
                }

                const dims = nodeDims(node)
                const color = nodeColor(node)
                const isSel = selectedId === node.id
                const isPending = pendingFrom?.id === node.id
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

                    {/* 노즐(포트) — 배관/신호선 도구일 때 연결 지점 표시 */}
                    {editMode && tool !== 'select' && (
                      <>
                        {(
                          [
                            [dims.w / 2, 0],
                            [dims.w, dims.h / 2],
                            [dims.w / 2, dims.h],
                            [0, dims.h / 2],
                          ] as const
                        ).map(([px, py], i) => (
                          <Circle
                            key={i}
                            x={px}
                            y={py}
                            radius={3}
                            fill="#ffffff"
                            stroke="#6366f1"
                            strokeWidth={1.2}
                            listening={false}
                          />
                        ))}
                      </>
                    )}

                    {/* 알람 상태 점 — critical은 점멸 */}
                    {!editMode &&
                      node.deviceCode &&
                      alarmStatusByDevice?.[node.deviceCode] && (
                        <Circle
                          x={dims.w}
                          y={0}
                          radius={4.5}
                          fill={
                            alarmStatusByDevice[node.deviceCode] === 'critical'
                              ? '#ef4444'
                              : '#f59e0b'
                          }
                          stroke="#ffffff"
                          strokeWidth={1.2}
                          name={
                            alarmStatusByDevice[node.deviceCode] === 'critical'
                              ? 'alarm-blink'
                              : undefined
                          }
                          listening={false}
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

      {/* 속성 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-[360px]">
            <p className="text-[13px] font-semibold text-slate-800 m-0 mb-3">
              {editing.id === null ? '심볼 추가' : '속성 편집'}
            </p>

            {editing.type !== 'zone' && !editing.imageBase64 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(Object.keys(SYMBOL_LABELS) as PidSymbolType[])
                  .filter((t) => t !== 'zone')
                  .map((type) => (
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

            {editing.type !== 'zone' && (
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
            )}

            <input
              autoFocus
              value={editing.label}
              onChange={(e) => setEditing((s) => (s ? { ...s, label: e.target.value } : s))}
              placeholder={
                editing.type === 'zone'
                  ? '영역 이름 (예: 가공공정, 유틸리티)'
                  : editing.type === 'instrument'
                    ? '태그 (예: LT, LC-101)'
                    : '이름'
              }
              className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
              }}
            />

            {/* 영역 노드: 연결 라인/공정 선택 */}
            {editing.type === 'zone' && zoneOptions && zoneOptions.length > 0 && (
              <select
                value={editing.linkedId ?? ''}
                onChange={(e) =>
                  setEditing((s) =>
                    s ? { ...s, linkedId: e.target.value ? Number(e.target.value) : null } : s,
                  )
                }
                className="w-full h-9 px-3 mb-3 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-[#003087] bg-white"
              >
                <option value="">연결 대상 없음</option>
                {zoneOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            )}

            {/* 일반 심볼: 설비 연결 */}
            {editing.type !== 'zone' && equipmentOptions && equipmentOptions.length > 0 && (
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
