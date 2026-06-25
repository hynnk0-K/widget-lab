import { AlertTriangle, AlertCircle, Activity, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { Alarm } from '../types'

interface Props {
  alarms: Alarm[]
}

interface CardConfig {
  label: string
  value: number
  icon: typeof AlertTriangle
  color: string // 강조 색 (글자/아이콘)
  bgColor: string // 카드 배경
  borderColor: string // 좌측 strip
}

export function AlarmSummaryCard({ alarms }: Props) {
  const activeAlarms = alarms.filter((a) => a.status !== 'resolved')
  const critical = alarms.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length
  const warning = alarms.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length
  const inProgress = alarms.filter(
    (a) => a.status === 'in_progress' || a.status === 'acknowledged',
  ).length

  const cards: CardConfig[] = [
    {
      label: '활성 알람',
      value: activeAlarms.length,
      icon: Activity,
      color: 'text-slate-800',
      bgColor: 'bg-white',
      borderColor: 'border-l-slate-400',
    },
    {
      label: '심각',
      value: critical,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-l-red-500',
    },
    {
      label: '주의',
      value: warning,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-l-amber-500',
    },
    {
      label: '처리중',
      value: inProgress,
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-blue-500',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            'flex items-center justify-between px-4 py-3 rounded-lg border-l-4 border border-slate-200',
            c.bgColor,
            c.borderColor,
          )}
        >
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 font-medium">{c.label}</span>
            <span className={cn('text-2xl font-bold leading-tight mt-1', c.color)}>{c.value}</span>
          </div>
          <c.icon className={cn('w-7 h-7 opacity-70', c.color)} />
        </div>
      ))}
    </div>
  )
}
