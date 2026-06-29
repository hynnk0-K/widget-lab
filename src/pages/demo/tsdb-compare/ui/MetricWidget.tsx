import { useEffect, useState, useRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { fetchLatest } from '../api'
import type { DbType, MetricConfig, MeasurementResult } from '../types'

interface Props {
  db: DbType
  config: MetricConfig
  intervalMs: number
  // 응답 시간을 부모에 알림 (누적 통계용)
  onMeasure?: (responseMs: number, hasError: boolean) => void
}

const DB_COLOR: Record<DbType, { bar: string; text: string; bg: string }> = {
  tdengine: { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
  timescale: { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
}

export function MetricWidget({ db, config, intervalMs, onMeasure }: Props) {
  const [result, setResult] = useState<MeasurementResult | null>(null)
  const [flash, setFlash] = useState(false)
  const flashTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const res = await fetchLatest(db, config)
      if (cancelled) return
      setResult(res)
      // 부모에 응답 시간 알림
      onMeasure?.(res.responseMs, !!res.error)
      // 값 갱신 플래시 효과
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
  }, [db, config.id, intervalMs])

  const color = DB_COLOR[db]
  const value = result?.value
  const formattedValue =
    value !== null && value !== undefined
      ? Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(2)
      : '—'

  // lag 표시: 초 단위
  const lagSec =
    result?.lagMs !== null && result?.lagMs !== undefined ? (result.lagMs / 1000).toFixed(1) : null

  return (
    <div
      className={cn(
        'relative bg-white rounded-lg border border-slate-200 px-3 py-2.5 overflow-hidden transition-all',
        flash && color.bg,
      )}
    >
      {/* 좌측 색 strip */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', color.bar)} />

      {/* 디바이스 + 메트릭 */}
      <div className="ml-1.5">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-[11px] text-slate-500 font-medium">{config.deviceName}</span>
          {result?.error ? (
            <span className="text-[10px] text-red-500">에러</span>
          ) : (
            <span className={cn('text-[10px] font-mono', color.text)}>
              {result?.responseMs.toFixed(0)}ms
            </span>
          )}
        </div>

        <div className="text-[10px] text-slate-400 mb-1">{config.metricLabel}</div>

        {/* 큰 숫자 */}
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums leading-tight transition-colors',
              flash ? color.text : 'text-slate-800',
            )}
          >
            {formattedValue}
          </span>
          <span className="text-[11px] text-slate-400">{config.unit}</span>
        </div>

        {/* lag 표시 */}
        {lagSec && <div className="text-[10px] text-slate-400 mt-1">📡 {lagSec}s 전 데이터</div>}
      </div>
    </div>
  )
}
