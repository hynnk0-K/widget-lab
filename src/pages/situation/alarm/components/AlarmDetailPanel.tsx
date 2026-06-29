import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { cn } from '@/shared/lib/cn'
import { fetchTrend, type TrendPoint } from '@/shared/ui/widgets/widgetApi'
import type { Alarm, AlarmSeverity } from '../types'
import { SEVERITY_LABEL, STATUS_LABEL, METRIC_LABEL, METRIC_UNIT } from '../types'

const TREND_HOURS = 6
const TREND_INTERVAL_MIN = 5

const SEVERITY_STYLE: Record<AlarmSeverity, { dot: string; text: string; bg: string }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  info: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
}

interface Props {
  alarm: Alarm | null
}

export function AlarmDetailPanel({ alarm }: Props) {
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!alarm) {
      setPoints([])
      return
    }
    let active = true
    setLoading(true)
    fetchTrend(alarm.deviceCode, alarm.metric, TREND_HOURS, TREND_INTERVAL_MIN).then((data) => {
      if (active) {
        setPoints(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [alarm?.alarmId, alarm?.deviceCode, alarm?.metric])

  if (!alarm) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white border border-slate-200 rounded-lg text-sm text-slate-400">
        알람을 선택하면 상세 정보가 표시됩니다
      </div>
    )
  }

  const sev = SEVERITY_STYLE[alarm.severity]
  // 임계값을 넘은 방향(초과/미달) — 같은 방향으로 벗어난 포인트를 이상치로 표시
  const isAbove = alarm.value >= alarm.threshold
  const isAnomalous = (v: number) => (isAbove ? v >= alarm.threshold : v <= alarm.threshold)

  const chartOption = points.length
    ? {
        grid: { top: 12, right: 16, bottom: 24, left: 40 },
        tooltip: {
          trigger: 'axis' as const,
          axisPointer: { type: 'cross' as const, label: { backgroundColor: '#475569' } },
          textStyle: { fontSize: 11 },
        },
        xAxis: {
          type: 'category' as const,
          data: points.map((p) => p.ts),
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 9,
            formatter: (val: string) =>
              new Date(val).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          },
        },
        yAxis: {
          type: 'value' as const,
          scale: true,
          axisLine: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 9 },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
        },
        series: [
          {
            name: METRIC_LABEL[alarm.metric] ?? alarm.metric,
            type: 'line' as const,
            data: points.map((p) => ({
              value: p.avg,
              itemStyle: isAnomalous(p.avg) ? { color: '#ef4444' } : undefined,
            })),
            symbol: 'circle',
            symbolSize: 4,
            smooth: true,
            lineStyle: { color: '#003087', width: 2 },
            itemStyle: { color: '#003087' },
            markLine: {
              symbol: 'none',
              lineStyle: { color: '#ef4444', type: 'dashed' as const },
              label: { formatter: `임계값 ${alarm.threshold}`, color: '#ef4444', fontSize: 10 },
              data: [{ yAxis: alarm.threshold }],
            },
          },
        ],
      }
    : null

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', sev.dot)} />
          <span className="text-[13px] font-semibold text-slate-800">{alarm.deviceName}</span>
          <span className="text-[11px] text-slate-400">
            {alarm.line} · {alarm.location}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          {new Date(alarm.occurredAt).toLocaleString('ko-KR')}
        </span>
      </div>

      {/* 정보 */}
      <div className="px-4 py-3 flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', sev.bg, sev.text)}>
            {SEVERITY_LABEL[alarm.severity]}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
            {STATUS_LABEL[alarm.status]}
          </span>
        </div>
        <p className="text-[12.5px] text-slate-700 m-0">{alarm.message}</p>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="text-slate-500">{METRIC_LABEL[alarm.metric] ?? alarm.metric}</span>
          <span className={cn('font-bold', sev.text)}>
            {alarm.value} {METRIC_UNIT[alarm.metric] ?? ''}
          </span>
          <span className="text-slate-400">
            / 임계값 {alarm.threshold} {METRIC_UNIT[alarm.metric] ?? ''}
          </span>
        </div>
      </div>

      {/* 트렌드 차트 */}
      <div className="flex-1 min-h-0 px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[12px] text-slate-400">
            추이 불러오는 중...
          </div>
        ) : chartOption ? (
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-slate-300">
            추이 데이터 없음
          </div>
        )}
      </div>
    </div>
  )
}
