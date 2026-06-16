import { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Widget, HeatmapConfig } from './types'
import { fetchTrend, type TrendPoint } from './widgetApi'

const POLL_MS = 5 * 60_000 // 5분 (요일 단위라 자주 갱신 안 함)
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i)
const DAY_LABELS_KO = ['월', '화', '수', '목', '금', '토', '일']

interface Props {
  widget: Widget
}

export function HeatmapHour({ widget }: Props) {
  const cfg = widget.config as HeatmapConfig
  const days = cfg.days ?? 7

  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const data = await fetchTrend(
        widget.source.device,
        widget.source.metric,
        days * 24,
        60, // 1시간 간격
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
  }, [widget.source.device, widget.source.metric, days])

  const hasData = points.length > 0

  // 데이터를 [요일][시간] 매트릭스로 변환
  // echarts heatmap data: [xIdx, yIdx, value]
  const matrix: Array<[number, number, number]> = []
  const dayLabels: string[] = []
  let minVal = Infinity
  let maxVal = -Infinity

  if (hasData) {
    // 데이터 시작/끝 날짜
    const firstDate = new Date(points[0].ts)
    firstDate.setHours(0, 0, 0, 0)

    // 일자별 라벨 만들기
    for (let d = 0; d < days; d++) {
      const date = new Date(firstDate.getTime() + d * 24 * 3600 * 1000)
      const dayOfWeek = (date.getDay() + 6) % 7 // 월=0
      dayLabels.push(`${date.getMonth() + 1}/${date.getDate()} (${DAY_LABELS_KO[dayOfWeek]})`)
    }

    // 각 포인트를 매트릭스 셀에 매핑
    const cellMap = new Map<string, { sum: number; count: number }>()
    points.forEach((p) => {
      const d = new Date(p.ts)
      const dayDiff = Math.floor((d.getTime() - firstDate.getTime()) / (24 * 3600 * 1000))
      if (dayDiff < 0 || dayDiff >= days) return
      const hour = d.getHours()
      const key = `${dayDiff}-${hour}`
      if (!cellMap.has(key)) cellMap.set(key, { sum: 0, count: 0 })
      const cell = cellMap.get(key)!
      cell.sum += p.avg
      cell.count += 1
    })

    // 매트릭스 변환 + min/max 계산
    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = cellMap.get(`${dayIdx}-${hour}`)
        if (cell) {
          const avg = cell.sum / cell.count
          matrix.push([hour, dayIdx, avg])
          if (avg < minVal) minVal = avg
          if (avg > maxVal) maxVal = avg
        } else {
          matrix.push([hour, dayIdx, 0]) // 데이터 없는 셀 = 0
        }
      }
    }
  }

  const option = hasData
    ? {
        grid: { top: 12, right: 20, bottom: 40, left: 50 },
        tooltip: {
          position: 'top',
          formatter: (params: { value: [number, number, number] }) => {
            const [hour, dayIdx, val] = params.value
            return `<div style="font-size:11px"><div style="color:#94a3b8">${dayLabels[dayIdx]} ${hour.toString().padStart(2, '0')}:00</div><div style="font-weight:600">${val?.toFixed(2) ?? '-'}</div></div>`
          },
          textStyle: { fontSize: 11 },
        },
        xAxis: {
          type: 'category' as const,
          data: HOURS_OF_DAY.map((h) => h.toString().padStart(2, '0')),
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 9,
            interval: 2, // 0, 3, 6, 9... 시간만 표시
          },
          splitArea: { show: true },
        },
        yAxis: {
          type: 'category' as const,
          data: dayLabels,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 9 },
          splitArea: { show: true },
        },
        visualMap: {
          min: minVal === Infinity ? 0 : minVal,
          max: maxVal === -Infinity ? 1 : maxVal,
          calculable: false,
          orient: 'horizontal' as const,
          left: 'center',
          bottom: 0,
          inRange: {
            color: ['#f1f5f9', '#dbeafe', '#93c5fd', '#3b82f6', '#003087'],
          },
          textStyle: { fontSize: 9, color: '#94a3b8' },
          itemWidth: 10,
          itemHeight: 110,
          show: true,
        },
        series: [
          {
            type: 'heatmap' as const,
            data: matrix,
            itemStyle: { borderRadius: 2, borderColor: '#fff', borderWidth: 1 },
            label: { show: false },
            emphasis: { itemStyle: { borderColor: '#003087', borderWidth: 2 } },
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
          <span className="text-[10px] text-slate-400">최근 {days}일</span>
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
