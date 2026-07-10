import type { DeviceRisk } from '@/entities/ehs/model/envSensors'

export interface IsoFactory {
  id: number
  name: string
  deviceCount: number
  risk: DeviceRisk
}

interface Props {
  factories: IsoFactory[]
  onFactoryClick?: (id: number) => void
}

const RISK_DOT: Record<DeviceRisk, string> = {
  normal: '#10b981',
  caution: '#f59e0b',
  warning: '#ef4444',
  danger: '#ef4444',
  offline: '#94a3b8',
}

const RISK_LABEL: Record<DeviceRisk, string> = {
  normal: '정상',
  caution: '주의',
  warning: '경고',
  danger: '위험',
  offline: '단절',
}

// 아이소메트릭 박스 치수 (스테이지 단위)
const W = 96 // 윗면 반너비
const H = 50 // 윗면 반높이
const D = 46 // 벽 깊이
const STEP_X = 168 // 대각선 계단 간격
const STEP_Y = 52

function IsoBox({ f, x, y, onClick }: { f: IsoFactory; x: number; y: number; onClick?: () => void }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer transition-transform duration-150 hover:-translate-y-1.5"
      role="button"
      aria-label={f.name}
    >
      {/* 왼쪽 벽 */}
      <polygon points={`${-W},0 0,${H} 0,${H + D} ${-W},${D}`} fill="#7d9fd4" />
      {/* 오른쪽 벽 */}
      <polygon points={`${W},0 ${W},${D} 0,${H + D} 0,${H}`} fill="#96b4e0" />
      {/* 윗면 */}
      <polygon points={`0,${-H} ${W},0 0,${H} ${-W},0`} fill="#b4cbec" />

      {/* 상태 점 */}
      <circle cx={0} cy={-H * 0.35} r={9} fill={RISK_DOT[f.risk]} stroke="#ffffff" strokeWidth={2.5} />

      {/* 이름 + 상태 배지 */}
      <text x={0} y={H * 0.28} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1e293b">
        {f.name}
      </text>
      <text x={0} y={H * 0.28 + 15} textAnchor="middle" fontSize={10.5} fill="#475569">
        {f.deviceCount}대 · {RISK_LABEL[f.risk]}
      </text>
    </g>
  )
}

export function SiteIsoMap({ factories, onFactoryClick }: Props) {
  const n = Math.max(factories.length, 1)
  const pad = 60
  const width = pad * 2 + (n - 1) * STEP_X + W * 2
  const height = pad * 2 + (n - 1) * STEP_Y + H * 2 + D + 20

  return (
    <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 620 }}>
        {factories.map((f, i) => (
          <IsoBox
            key={f.id}
            f={f}
            x={pad + W + i * STEP_X}
            y={pad + H + i * STEP_Y}
            onClick={() => onFactoryClick?.(f.id)}
          />
        ))}
        {factories.length === 0 && (
          <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={13} fill="#94a3b8">
            소속 공장이 없습니다
          </text>
        )}
      </svg>

      {/* 범례 */}
      <div className="absolute bottom-3 left-3 bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2 flex flex-col gap-1">
        {(
          [
            ['normal', '정상'],
            ['caution', '주의'],
            ['warning', '경고·위험'],
            ['offline', '통신단절'],
          ] as const
        ).map(([risk, label]) => (
          <span key={risk} className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ background: RISK_DOT[risk] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
