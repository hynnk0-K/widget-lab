import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { fetchAlarmSummary } from '@/entities/alarm/api/alarmApi'
import type { EquipmentLive } from '@/entities/equipment/model/types'
import type { Widget, SummaryConfig, SummaryKind } from '../model/types'

const KIND_META: Record<
  SummaryKind,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  total: {
    label: '전체 설비',
    color: '#003087',
    bg: '#eff6ff',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  active: {
    label: '가동중',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <polygon points="5,3 19,12 5,21" />
      </svg>
    ),
  },
  inactive: {
    label: '대기 / 유휴',
    color: '#64748b',
    bg: '#f8fafc',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    ),
  },
  alarm: {
    label: '오늘 알람',
    color: '#dc2626',
    bg: '#fef2f2',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
      </svg>
    ),
  },
  'comm-fault': {
    label: '장애 / 통신단절',
    color: '#d97706',
    bg: '#fffbeb',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
}

const POLL_MS = 10_000

export function SummaryCard({ widget }: { widget: Widget }) {
  const { kind } = widget.config as SummaryConfig
  const meta = KIND_META[kind]

  const [value, setValue] = useState<number | null>(null)
  const [sub, setSub] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        if (kind === 'alarm') {
          const summary = await fetchAlarmSummary()
          if (!active) return
          setValue(summary.total)
          setSub(`미처리 ${summary.total - summary.acknowledged - summary.inProgress}건`)
        } else {
          const data = await api.get<EquipmentLive[]>('/equipment-live')
          if (!active) return
          const total = data.length
          const active_ = data.filter((d) => d.isActive).length
          const noData = data.filter((d) => d.isActive && !d.hasData).length
          if (kind === 'total') {
            setValue(total)
            setSub(`전체 ${total}대`)
          } else if (kind === 'active') {
            setValue(active_)
            setSub(`가동률 ${total ? Math.round((active_ / total) * 100) : 0}%`)
          } else if (kind === 'inactive') {
            setValue(total - active_)
            setSub(`전체 ${total}대 중`)
          } else if (kind === 'comm-fault') {
            setValue(noData)
            setSub(`응답 없음`)
          }
        }
      } catch {
        // ignore — keep previous value
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [kind])

  return (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {meta.label}
        </span>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.icon}
        </span>
      </div>

      <div>
        {value === null ? (
          <div className="w-12 h-8 bg-slate-100 rounded animate-pulse" />
        ) : (
          <p className="m-0 text-[32px] font-bold leading-none" style={{ color: meta.color }}>
            {value.toLocaleString('ko-KR')}
            <span className="text-[16px] font-medium text-slate-400 ml-1">대</span>
          </p>
        )}
        <p className="m-0 mt-1 text-[11px] text-slate-400">{sub || ' '}</p>
      </div>
    </div>
  )
}
