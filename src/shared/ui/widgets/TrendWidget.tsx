import { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Widget, TrendConfig } from './types'
import { fetchTrend, type TrendPoint } from './widgetApi'

const POLL_MS = 30_000

interface Props {
  widget: Widget
}

export function TrendWidget({ widget }: Props) {
  const cfg = widget.config as TrendConfig
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const data = await fetchTrend(
        widget.source.device,
        widget.source.metric,
        cfg.hours,
        cfg.intervalMinutes,
      )
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
  }, [widget.source.device, widget.source.metric, cfg.hours, cfg.intervalMinutes])

  const hasData = points.length > 0
  const last = points[points.length - 1]

  // 차트 옵션 — 위젯용 컴팩트 설정
  const option = hasData
    ? {
        grid: { top: 8, right: 8, bottom: 18, left: 32 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross', label: { backgroundColor: '#475569' } },
          textStyle: { fontSize: 11 },
          formatter: (params: Array<{ axisValue: string; value: number }>) => {
            const ts = new Date(params[0].axisValue).toLocaleString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            const avg = params[0].value
            return `<div style="font-size:10px;color:#94a3b8">${ts}</div><div style="font-weight:600">${avg?.toFixed(2) ?? '-'}</div>`
          },
        },
        xAxis: {
          type: 'category',
          data: points.map((p) => p.ts),
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 9,
            interval: Math.floor(points.length / 4), // 4개 라벨만
            formatter: (val: string) => {
              const d = new Date(val)
              if (cfg.hours <= 24) {
                return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              } else if (cfg.hours <= 24 * 30) {
                return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
              } else {
                return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
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
          // min/max 영역 — 위쪽 라인 (보이지 않음, area로 채움)
          {
            name: 'max',
            type: 'line' as const,
            data: points.map((p) => p.max),
            lineStyle: { opacity: 0 },
            stack: 'band',
            symbol: 'none',
            tooltip: { show: false },
            silent: true,
          },
          {
            name: 'range',
            type: 'line' as const,
            data: points.map((p) => p.min - p.max), // max에서 min까지의 음수 차이
            lineStyle: { opacity: 0 },
            stack: 'band',
            symbol: 'none',
            tooltip: { show: false },
            silent: true,
            areaStyle: { color: 'rgba(0, 48, 135, 0.07)' },
          },
          // 평균 라인 — 메인
          {
            name: '평균',
            type: 'line' as const,
            data: points.map((p) => p.avg),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#003087', width: 2 },
            itemStyle: { color: '#003087' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(0, 48, 135, 0.18)' },
                  { offset: 1, color: 'rgba(0, 48, 135, 0.01)' },
                ],
              },
            },
            // 마지막 점 강조
            markPoint: {
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: '#003087' },
              data: [{ coord: [points.length - 1, points[points.length - 1].avg] }],
              label: { show: false },
            },
          },
        ],
      }
    : null

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-slate-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-2 shrink-0 ml-1">
          <span className="text-[11px] text-slate-400">{widget.source.device}</span>
          {hasData && (
            <>
              <span className="text-[13px] font-bold text-[#003087]">{last.avg.toFixed(1)}</span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                title="실시간 연결됨"
              />
            </>
          )}
        </div>
      </div>

      {/* 차트 */}
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
