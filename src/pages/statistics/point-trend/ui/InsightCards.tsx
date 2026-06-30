import type { Insight } from '@/entities/series/lib/insights'
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  insights: Insight[]
}

const LEVEL_STYLE = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    Icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    Icon: AlertCircle,
  },
} as const

const METRIC_LABEL: Record<Insight['metric'], string> = {
  trend: '추세',
  comparison: '비교',
  outlier: '이상치',
  volatility: '변동성',
}

export function InsightCards({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <p className="text-slate-700 text-[13px] font-semibold m-0">감지된 이슈가 없습니다</p>
          <p className="text-slate-400 text-[12px] m-0">안정적으로 운영 중입니다</p>
        </div>
      </div>
    )
  }

  // critical → warning → info 순서로
  const ordered = [...insights].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.level] - order[b.level]
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-700 m-0">
          인사이트 ({insights.length}건)
        </h3>
        <div className="flex items-center gap-1.5 text-[11px]">
          {(['critical', 'warning', 'info'] as const).map((level) => {
            const count = insights.filter((i) => i.level === level).length
            if (count === 0) return null
            const s = LEVEL_STYLE[level]
            return (
              <span
                key={level}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${s.bg} ${s.iconColor} font-semibold`}
              >
                <s.Icon className="w-4 h-4" /> {count}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {ordered.map((insight, i) => {
          const s = LEVEL_STYLE[insight.level]
          return (
            <div
              key={`${insight.seriesId}-${insight.metric}-${i}`}
              className={`${s.bg} ${s.border} border rounded-lg p-3 flex items-start gap-3`}
            >
              <div
                className={`w-8 h-8 rounded-full ${s.iconBg} ${s.iconColor} flex items-center justify-center text-[14px] flex-shrink-0`}
              >
                <s.Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className={`text-[13px] font-semibold m-0 ${s.titleColor}`}>
                    {insight.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded">
                    {METRIC_LABEL[insight.metric]}
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 m-0 leading-relaxed">{insight.message}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
