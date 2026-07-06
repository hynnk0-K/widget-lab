import { useEffect, useState, useRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { fetchEhsLatest } from '../api'
import type { DbType, CategoryConfig, DeviceConfig, MeasurementResult } from '../types'

interface Props {
  db: DbType
  category: CategoryConfig
  device: DeviceConfig
  intervalMs: number
  onMeasure?: (responseMs: number, hasError: boolean) => void
}

const DB_STYLE: Record<DbType, { bar: string; text: string; bg: string }> = {
  tdengine: { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
  timescale: { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
}

export function EhsWidget({ db, category, device, intervalMs, onMeasure }: Props) {
  const [result, setResult] = useState<MeasurementResult | null>(null)
  const [flash, setFlash] = useState(false)
  const flashTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const res = await fetchEhsLatest(db, category.category, device.id, category.metric.key)
      if (cancelled) return
      setResult(res)
      onMeasure?.(res.responseMs, !!res.error)
      setFlash(true)
      window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => setFlash(false), 300)
    }

    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.clearTimeout(flashTimerRef.current)
    }
  }, [db, category.category, device.id, category.metric.key, intervalMs])

  const style = DB_STYLE[db]
  const value = result?.value
  const formatted =
    value !== null && value !== undefined
      ? Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(2)
      : '—'

  const lagSec =
    result?.lagMs !== null && result?.lagMs !== undefined ? (result.lagMs / 1000).toFixed(0) : null

  return (
    <div
      className={cn(
        'relative bg-white rounded-md border border-slate-200 px-2 py-2 overflow-hidden transition-all',
        flash && style.bg,
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5', style.bar)} />

      <div className="ml-1">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-[9px] text-slate-500 font-medium">{device.id}</span>
          {result?.error ? (
            <span className="text-[9px] text-red-500">ERR</span>
          ) : (
            <span className={cn('text-[9px] font-mono', style.text)}>
              {result?.responseMs.toFixed(0)}ms
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-0.5">
          <span
            className={cn(
              'text-base font-bold tabular-nums leading-tight transition-colors',
              flash ? style.text : 'text-slate-800',
            )}
          >
            {formatted}
          </span>
          <span className="text-[9px] text-slate-400">{category.metric.unit}</span>
        </div>

        {lagSec && <div className="text-[9px] text-slate-400 mt-0.5">📡 {lagSec}s</div>}
      </div>
    </div>
  )
}
