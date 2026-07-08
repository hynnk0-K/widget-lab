// src/pages/realtime/ehs-detail/ui/EhsDeviceDetailPanel.tsx

import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { cn } from '@/shared/lib/cn'
import {
  fetchLatest,
  fetchTrend,
  type EhsLatestRow,
  type TrendPoint,
} from '@/entities/ehs/api/ehsApi'
import { calcRisk, RISK_COLOR_BG, RISK_COLOR_TEXT } from '@/entities/ehs/model/config'
import type { EhsCategoryConfig } from '@/entities/ehs/model/types'

interface Props {
  category: string
  deviceCode: string
  config: EhsCategoryConfig
}

export function EhsDeviceDetailPanel({ category, deviceCode, config }: Props) {
  const [latest, setLatest] = useState<EhsLatestRow | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  // 최근값 폴링
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [l, t] = await Promise.all([
        fetchLatest(category, deviceCode),
        fetchTrend(category, deviceCode, config.primaryMetric.key, 24, 30),
      ])
      if (cancelled) return
      setLatest(l)
      setTrend(t)
      setLoading(false)
    }

    load()
    const timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [category, deviceCode, config.primaryMetric.key])

  const chartOption = {
    grid: { left: 40, right: 15, top: 10, bottom: 25 },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 9, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 9, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params?.[0]
        if (!p) return ''
        const d = new Date(p.value[0])
        const t = d.toLocaleString('ko-KR', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        return `${t}<br/><b>${p.value[1]?.toFixed(2) ?? '-'}</b> ${config.primaryMetric.unit}`
      },
    },
    series: [
      {
        type: 'line',
        data: trend.map((p) => [new Date(p.ts).getTime(), p.avg]),
        smooth: false,
        symbol: 'none',
        lineStyle: { color: config.color, width: 1.5 },
        areaStyle: { color: config.color, opacity: 0.1 },
      },
    ],
    animation: false,
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900">{deviceCode}</h3>
        {loading && <span className="text-[10px] text-slate-400">로딩...</span>}
      </div>

      {/* 상세 메트릭 */}
      {latest && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {config.detailMetrics.map((m) => {
            const value = latest[m.key] as number | null
            const risk =
              value != null && Object.keys(m.thresholds).length > 0 ? calcRisk(value, m) : 'normal'
            return (
              <div key={m.key} className="border border-slate-200 rounded p-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-slate-500">{m.label}</span>
                  {Object.keys(m.thresholds).length > 0 && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', RISK_COLOR_BG[risk])} />
                  )}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className={cn(
                      'text-base font-bold tabular-nums',
                      risk !== 'normal' ? RISK_COLOR_TEXT[risk] : 'text-slate-800',
                    )}
                  >
                    {value != null ? value.toFixed(1) : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400">{m.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 트렌드 차트 */}
      <div className="border-t border-slate-100 pt-2">
        <div className="text-[10px] text-slate-500 mb-1">
          최근 24시간 · {config.primaryMetric.label}
        </div>
        <ReactECharts option={chartOption} style={{ height: 140, width: '100%' }} notMerge={true} />
      </div>
    </div>
  )
}
