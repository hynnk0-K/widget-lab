// src/pages/realtime/ehs-detail/ui/EhsSummaryCards.tsx

import { cn } from '@/shared/lib/cn'
import { RISK_COLOR_BG, RISK_LABEL } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'

interface Props {
  total: number
  summary: Record<EhsRiskLevel, number>
  filter: 'all' | EhsRiskLevel
  onFilterChange: (v: 'all' | EhsRiskLevel) => void
}

export function EhsSummaryCards({ total, summary, filter, onFilterChange }: Props) {
  const cards: Array<{
    key: 'all' | EhsRiskLevel
    label: string
    value: number
    colorBg: string
  }> = [
    { key: 'all', label: '전체', value: total, colorBg: 'bg-slate-500' },
    {
      key: 'normal',
      label: RISK_LABEL.normal,
      value: summary.normal,
      colorBg: RISK_COLOR_BG.normal,
    },
    {
      key: 'caution',
      label: RISK_LABEL.caution,
      value: summary.caution,
      colorBg: RISK_COLOR_BG.caution,
    },
    {
      key: 'warning',
      label: RISK_LABEL.warning,
      value: summary.warning,
      colorBg: RISK_COLOR_BG.warning,
    },
    {
      key: 'danger',
      label: RISK_LABEL.danger,
      value: summary.danger,
      colorBg: RISK_COLOR_BG.danger,
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => onFilterChange(c.key)}
          className={cn(
            'bg-white rounded-lg border-2 p-2.5 text-left transition-all',
            filter === c.key
              ? 'border-slate-800 shadow-sm'
              : 'border-slate-200 hover:border-slate-300',
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('w-2 h-2 rounded-full', c.colorBg)} />
            <span className="text-[10px] font-medium text-slate-500">{c.label}</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-slate-900">{c.value}</div>
        </button>
      ))}
    </div>
  )
}
