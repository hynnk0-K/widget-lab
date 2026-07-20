import { RISK_LABEL } from '@/entities/ehs/model/config'
import type { DeviceRisk, CollectionGroup } from '../model/useEnvironmentMonitor'

const BADGE_LABEL: Record<DeviceRisk, string> = { ...RISK_LABEL, offline: '통신단절' }

const BADGE_CLASS: Record<DeviceRisk, string> = {
  normal: 'bg-emerald-50 text-emerald-600',
  caution: 'bg-amber-50 text-amber-600',
  warning: 'bg-orange-50 text-orange-600',
  danger: 'bg-red-50 text-red-600',
  offline: 'bg-slate-100 text-slate-500',
}

const DOT_CLASS: Record<DeviceRisk, string> = {
  normal: 'bg-emerald-400',
  caution: 'bg-amber-400',
  warning: 'bg-orange-400',
  danger: 'bg-red-500',
  offline: 'bg-slate-300',
}

const VALUE_CLASS: Record<DeviceRisk, string> = {
  normal: 'text-slate-700',
  caution: 'text-amber-600',
  warning: 'text-orange-600',
  danger: 'text-red-600',
  offline: 'text-slate-400',
}

const MAX_ROWS = 6

interface Props {
  group: CollectionGroup
  onSensorClick: (code: string) => void
  onSectionClick: () => void
}

export function CollectionCard({ group, onSensorClick, onSectionClick }: Props) {
  const { label, color, devices, worst } = group
  const alert = worst === 'danger' || worst === 'warning'

  return (
    <div
      className={`bg-white rounded-xl p-4 transition-shadow hover:shadow-sm ${alert ? 'border-2 border-red-300' : 'border border-slate-200'}`}
    >
      {/* 헤더 클릭 → 센서 유형 상세 화면 */}
      <button
        onClick={onSectionClick}
        className="w-full text-left flex items-center justify-between mb-2.5 group"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[13px] font-semibold text-slate-700 truncate group-hover:text-[#003087] transition-colors">
            {label}
          </span>
          <span className="text-[11px] text-slate-400 flex-shrink-0">{devices.length}대</span>
        </span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${BADGE_CLASS[worst]} ${
            worst === 'danger' ? 'animate-pulse' : ''
          }`}
        >
          {BADGE_LABEL[worst]}
        </span>
      </button>

      <div className="space-y-0.5">
        {devices.slice(0, MAX_ROWS).map((d) => (
          <button
            key={d.code}
            onClick={() => onSensorClick(d.code)}
            className="w-full flex items-center gap-1.5 text-[12px] px-1 py-0.5 -mx-1 rounded hover:bg-slate-50 transition-colors"
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[d.risk]}`} />
            <span className="text-slate-500 truncate">{d.code}</span>
            <span className={`ml-auto font-medium whitespace-nowrap ${VALUE_CLASS[d.risk]}`}>
              {d.valueText}
            </span>
          </button>
        ))}
        {devices.length > MAX_ROWS && (
          <p className="text-[10px] text-slate-400 m-0 px-1">
            +{devices.length - MAX_ROWS}개 더보기
          </p>
        )}
      </div>
    </div>
  )
}
