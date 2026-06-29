import { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cn } from '@/shared/lib/cn'
import { fetchTrend } from '../api'
import type { DbType, MetricConfig, TrendPoint } from '../types'

interface Props {
  db: DbType
  config: MetricConfig
  intervalMs: number
  hours?: number
  intervalMinutes?: number
  onMeasure?: (responseMs: number, hasError: boolean) => void
}

const DB_COLOR: Record<DbType, { line: string; bar: string; text: string }> = {
  tdengine: { line: '#2E75B6', bar: 'bg-blue-500', text: 'text-blue-600' },
  timescale: { line: '#E53E3E', bar: 'bg-red-500', text: 'text-red-600' },
}

export function TrendWidget({
  db,
  config,
  intervalMs,
  hours = 1,
  intervalMinutes = 1,
  onMeasure,
}: Props) {
  const [data, setData] = useState<TrendPoint[]>([])
  const [responseMs, setResponseMs] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const result = await fetchTrend(db, config, hours, intervalMinutes)
      if (cancelled) return
      setData(result.data)
      setResponseMs(result.responseMs)
      setError(result.error ?? '')
      onMeasure?.(result.responseMs, !!result.error)
    }

    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [db, config.id, intervalMs, hours, intervalMinutes])

  const color = DB_COLOR[db]

  const option = useMemo(() => {
    const xs = data.map((p) => new Date(p.ts).getTime())
    const ys = data.map((p) => p.avgV ?? null)

    return {
      grid: { left: 40, right: 10, top: 10, bottom: 28 },
      xAxis: {
        type: 'time',
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (val: number) => {
            const d = new Date(val)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          },
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || !params[0]) return ''
          const p = params[0]
          const d = new Date(p.value[0])
          const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          const v = p.value[1]
          return `${t}<br/>${config.metricLabel}: <b>${typeof v === 'number' ? v.toFixed(2) : '-'}</b> ${config.unit}`
        },
      },
      series: [
        {
          type: 'line',
          data: xs.map((x, i) => [x, ys[i]]),
          smooth: false,
          symbol: 'none',
          lineStyle: { color: color.line, width: 1.5 },
          areaStyle: {
            color: color.line,
            opacity: 0.08,
          },
        },
      ],
      animation: false,
    }
  }, [data, color.line, config.metricLabel, config.unit])

  return (
    <div className="relative bg-white rounded-lg border border-slate-200 px-3 py-2.5 overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', color.bar)} />

      <div className="ml-1.5">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-semibold text-slate-700">
              {config.deviceName} · {config.metricLabel}
            </span>
            <span className="text-[10px] text-slate-400">
              최근 {hours}시간 · {intervalMinutes}분 단위
            </span>
          </div>
          {error ? (
            <span className="text-[10px] text-red-500">에러</span>
          ) : (
            <span className={cn('text-[10px] font-mono', color.text)}>
              {responseMs.toFixed(0)}ms · {data.length}p
            </span>
          )}
        </div>

        <ReactECharts option={option} style={{ height: 140, width: '100%' }} notMerge={true} />
      </div>
    </div>
  )
}
