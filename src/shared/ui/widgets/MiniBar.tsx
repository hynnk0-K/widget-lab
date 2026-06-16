import { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Widget, MiniBarConfig } from './types'
import { fetchTrend, type TrendPoint } from './widgetApi'

const POLL_MS = 60_000 // 1분마다 갱신 (시간 단위라 자주 안 필요)

interface Props {
  widget: Widget
}

export function MiniBar({ widget }: Props) {
  const cfg = widget.config as MiniBarConfig
  const hours = cfg.hours ?? 24
  const interval = cfg.intervalMinutes ?? 60

  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const data = await fetchTrend(widget.source.device, widget.source.metric, hours, interval)
      if (active) {
        setPoints(data)
        setLoading(false)
      }
    }

    load()
    timerRef.current = setInterval(load, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [widget.source.device, widget.source.metric, hours, interval])

  const hasData = points.length > 0
  const last = points[points.length - 1]

  // 평균값으로 막대 색깔 그라데이션 (작을수록 연하게, 클수록 진하게)
  const maxVal = hasData ? Math.max(...points.map((p) => p.avg)) : 1

  const option = hasData
    ? {
        grid: { top: 8, right: 8, bottom: 22, left: 28 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          textStyle: { fontSize: 11 },
          formatter: (params: Array<{ axisValue: string; value: number }>) => {
            const ts = new Date(params[0].axisValue).toLocaleString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            return `<div style="font-size:10px;color:#94a3b8">${ts}</div><div style="font-weight:600">${params[0].value?.toFixed(2) ?? '-'}</div>`
          },
        },
        xAxis: {
          type: 'category',
          data: points.map((p) => p.ts),
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 9,
            interval: Math.floor(points.length / 6),
            formatter: (val: string) => {
              const d = new Date(val)
              if (hours <= 24) {
                return d.toLocaleTimeString('ko-KR', { hour: '2-digit' })
              } else {
                return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
              }
            },
          },
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 9 },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
          splitNumber: 3,
        },
        series: [
          {
            type: 'bar' as const,
            data: points.map((p) => ({
              value: p.avg,
              itemStyle: {
                // 평균값 비율에 따라 색 농도
                color: `rgba(0, 48, 135, ${Math.max(0.2, Math.min(1, p.avg / maxVal))})`,
              },
            })),
            barCategoryGap: '20%',
          },
        ],
      }
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-2 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {hasData && (
            <>
              <span className="text-[13px] font-bold text-[#003087]">{last.avg.toFixed(1)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1 pb-1">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-slate-300">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            <span className="text-[12px]">연결 중...</span>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-[12px]">
            데이터 없음
          </div>
        ) : (
          option && (
            <ReactECharts
              option={option}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
            />
          )
        )}
      </div>
    </div>
  )
}
