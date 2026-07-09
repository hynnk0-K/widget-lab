import { RISK_LABEL } from '@/entities/ehs/model/config'
import type { DeviceRisk, EnvCategoryGroup } from '../model/useEnvironmentMonitor'

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

const MAX_ROWS = 4

export function CategoryCard({ group, onClick }: { group: EnvCategoryGroup; onClick: () => void }) {
  const { cfg, devices, worst } = group
  const Icon = cfg.icon
  const alert = worst === 'danger' || worst === 'warning'

  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-xl p-4 transition-shadow hover:shadow-sm ${
        alert ? 'border-2 border-red-300' : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${cfg.color}14`, color: cfg.color }}
          >
            <Icon className="w-4 h-4" />
          </span>
          <span className="text-[13px] font-semibold text-slate-700 truncate">
            {cfg.koreanLabel}
          </span>
        </span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${BADGE_CLASS[worst]} ${
            worst === 'danger' ? 'animate-pulse' : ''
          }`}
        >
          {BADGE_LABEL[worst]}
        </span>
      </div>

      <div className="space-y-1">
        {devices.length === 0 ? (
          <p className="text-[11px] text-slate-300 m-0">센서 없음</p>
        ) : (
          devices.slice(0, MAX_ROWS).map((d) => (
            <div key={d.code} className="flex items-center gap-1.5 text-[12px]">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[d.risk]}`} />
              <span className="text-slate-500 truncate">{d.code}</span>
              <span className={`ml-auto font-medium whitespace-nowrap ${VALUE_CLASS[d.risk]}`}>
                {d.valueText}
              </span>
            </div>
          ))
        )}
        {devices.length > MAX_ROWS && (
          <p className="text-[10px] text-slate-400 m-0">+{devices.length - MAX_ROWS}개 더보기</p>
        )}
      </div>
    </button>
  )
}
