import { useEffect, useState } from 'react'
import { fetchAlarms } from '@/entities/alarm/api/alarmApi'
import type { Alarm } from '@/entities/alarm/model/types'
import type { Widget, AlarmFeedConfig } from '../model/types'

const SEV_COLOR: Record<string, { dot: string; text: string; border: string }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-600', border: 'border-l-red-500' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-600', border: 'border-l-amber-400' },
  info: { dot: 'bg-blue-400', text: 'text-blue-600', border: 'border-l-blue-400' },
}

const SEV_LABEL: Record<string, string> = { critical: '심각', warning: '주의', info: '정보' }

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

const POLL_MS = 8_000

export function AlarmFeedWidget({ widget }: { widget: Widget }) {
  const cfg = widget.config as AlarmFeedConfig
  const maxItems = cfg.maxItems ?? 10
  const severity = cfg.severity && cfg.severity !== 'all' ? cfg.severity : undefined

  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await fetchAlarms({ severity, limit: maxItems })
        if (active) setAlarms(data)
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => { active = false; clearInterval(t) }
  }, [maxItems, severity])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700">{widget.title}</span>
        <span className="text-[10px] text-slate-400">실시간</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#003087] rounded-full animate-spin" />
          </div>
        ) : alarms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12px] text-slate-400">
            알람 없음
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {alarms.map((alarm) => {
              const sev = SEV_COLOR[alarm.severity] ?? SEV_COLOR.info
              return (
                <li
                  key={alarm.alarmId}
                  className={`px-4 py-2.5 border-l-[3px] ${sev.border} hover:bg-slate-50 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${sev.dot}`} />
                      <span className="text-[12px] font-medium text-slate-700 truncate">
                        {alarm.deviceName}
                      </span>
                      <span className={`text-[10px] font-semibold flex-shrink-0 ${sev.text}`}>
                        {SEV_LABEL[alarm.severity]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                      {timeAgo(alarm.occurredAt)}
                    </span>
                  </div>
                  <p className="m-0 mt-0.5 ml-3 text-[11px] text-slate-500 truncate">{alarm.message}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
