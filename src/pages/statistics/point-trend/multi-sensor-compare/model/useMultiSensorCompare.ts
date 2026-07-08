import { useEffect, useMemo, useState } from 'react'
import { api } from '@/shared/lib/api'
import { calcStats, generateInsights, type SeriesStats, type Insight } from '@/entities/series/lib/insights'
import { METRIC_LABELS, type Series, type EquipmentLive } from '@/entities/series/model/types'

interface TrendPoint {
  ts: string
  avg: number
  min: number
  max: number
  count: number
}

interface SeriesData {
  seriesId: string
  points: TrendPoint[]
}

interface RangeOption {
  label: string
  hours: number
  intervalMinutes: number
}

export const RANGES: RangeOption[] = [
  { label: '1시간', hours: 1, intervalMinutes: 1 },
  { label: '1일', hours: 24, intervalMinutes: 5 },
  { label: '1주', hours: 24 * 7, intervalMinutes: 30 },
  { label: '1개월', hours: 24 * 30, intervalMinutes: 60 },
  { label: '3개월', hours: 24 * 90, intervalMinutes: 180 },
  { label: '6개월', hours: 24 * 180, intervalMinutes: 360 },
  { label: '1년', hours: 24 * 365, intervalMinutes: 1440 },
]

export const COLORS = [
  '#003087', '#22c55e', '#ef4444', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function devicePath(code: string): string {
  if (/^cnc/i.test(code)) return 'cnc'
  if (/^cmp/i.test(code)) return 'compressors'
  return 'sensors'
}

const METRIC_UNIT_GROUP: Record<string, string> = {
  spindle_rpm: 'rpm', spindle_load: 'percent', power_factor: 'percent',
  vibration: 'mm/s', motor_temp: 'celsius', suction_temp: 'celsius',
  discharge_temp: 'celsius', cycle_time: 'sec', discharge_pressure: 'bar',
  motor_current: 'amp', active_power: 'kw', energy_kwh: 'kwh',
  good_count: 'count', reject_count: 'count', run_state: 'state', tool_hours: 'hour',
}

function assignYAxis(existing: Series[], metric: string): number {
  const newGroup = METRIC_UNIT_GROUP[metric] ?? metric
  const same = existing.find((s) => (METRIC_UNIT_GROUP[s.metric] ?? s.metric) === newGroup)
  if (same) return same.yAxisIndex
  const usedAxes = new Set(existing.map((s) => s.yAxisIndex))
  if (existing.length === 0) return 0
  if (!usedAxes.has(1)) return 1
  return 0
}

export function useMultiSensorCompare() {
  const [series, setSeries] = useState<Series[]>([])
  const [rangeIdx, setRangeIdx] = useState(3)
  const [showAddModal, setShowAddModal] = useState(false)
  const [seriesData, setSeriesData] = useState<SeriesData[]>([])
  const [loading, setLoading] = useState(false)
  const [perf, setPerf] = useState<{ totalMs: number; totalBytes: number } | null>(null)
  const [devicesPreloaded, setDevicesPreloaded] = useState<EquipmentLive[]>([])

  const range = RANGES[rangeIdx]

  const { statsList, insights } = useMemo((): { statsList: SeriesStats[]; insights: Insight[] } => {
    if (series.length === 0 || seriesData.length === 0) return { statsList: [], insights: [] }
    const seriesById = new Map(seriesData.map((sd) => [sd.seriesId, sd]))
    const computed = series
      .map((s) => {
        const sd = seriesById.get(s.id)
        return sd ? calcStats(s.id, sd.points) : null
      })
      .filter((v): v is SeriesStats => v !== null)
    const labelMap: Record<string, string> = {}
    series.forEach((s) => { labelMap[s.id] = `${s.deviceName} · ${s.metricLabel}` })
    return { statsList: computed, insights: generateInsights(computed, labelMap) }
  }, [series, seriesData])

  useEffect(() => {
    api
      .get<EquipmentLive[]>('/equipment-live')
      .then((data) => {
        setDevicesPreloaded(data)
        if (series.length === 0) {
          const cncs = data.filter((d) => d.code.startsWith('cnc') && d.hasData)
          const defaults: Series[] = cncs.slice(0, 3).map((d, i) => ({
            id: `${d.code}::vibration`,
            deviceCode: d.code,
            deviceName: d.name,
            deviceType: d.equipmentType,
            metric: 'vibration',
            metricLabel: METRIC_LABELS.vibration,
            color: COLORS[i % COLORS.length],
            yAxisIndex: 0,
          }))
          if (defaults.length > 0) setSeries(defaults)
        }
      })
      .catch(() => setDevicesPreloaded([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (series.length === 0) { setSeriesData([]); setPerf(null); return }
    let active = true
    setLoading(true)
    const t0 = performance.now()
    Promise.all(
      series.map(async (s) => {
        const path = devicePath(s.deviceCode)
        // ponytail: TSDB 라이센스 만료로 임시로 TimescaleDB(/ts/{path}/trend)만 조회. 복구 시 아래로 교체.
        // const url = `/${path}/trend?...`
        const url = `/ts/${path}/trend?deviceId=${encodeURIComponent(s.deviceCode)}&metric=${encodeURIComponent(s.metric)}&hours=${range.hours}&intervalMinutes=${range.intervalMinutes}`
        const points = await api.get<TrendPoint[]>(url)
        return { seriesId: s.id, points, bytes: JSON.stringify(points).length }
      }),
    )
      .then((results) => {
        if (!active) return
        setSeriesData(results.map((r) => ({ seriesId: r.seriesId, points: r.points })))
        setPerf({ totalMs: performance.now() - t0, totalBytes: results.reduce((sum, r) => sum + r.bytes, 0) })
      })
      .catch(() => { if (active) { setSeriesData([]); setPerf(null) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [series, range.hours, range.intervalMinutes])

  const chartOption = useMemo(() => {
    if (series.length === 0 || seriesData.length === 0) return null
    const allTs = new Set<string>()
    seriesData.forEach((sd) => sd.points.forEach((p) => allTs.add(p.ts)))
    const xData = Array.from(allTs).sort()

    const yAxisGroups = new Map<number, string[]>()
    series.forEach((s) => {
      if (!yAxisGroups.has(s.yAxisIndex)) yAxisGroups.set(s.yAxisIndex, [])
      const g = yAxisGroups.get(s.yAxisIndex)!
      if (!g.includes(s.metricLabel)) g.push(s.metricLabel)
    })

    const yAxis = Array.from({ length: Math.max(...series.map((s) => s.yAxisIndex)) + 1 }).map((_, idx) => ({
      type: 'value' as const,
      scale: true,
      position: idx === 0 ? ('left' as const) : ('right' as const),
      name: yAxisGroups.get(idx)?.join(', ') ?? '',
      nameTextStyle: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' as const } },
    }))

    const seriesById = new Map(seriesData.map((sd) => [sd.seriesId, sd]))
    const echartsSeries = series.map((s) => {
      const sd = seriesById.get(s.id)
      const tsToVal = new Map<string, number>()
      sd?.points.forEach((p) => tsToVal.set(p.ts, p.avg))
      return {
        name: `${s.deviceName} · ${s.metricLabel}`,
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        yAxisIndex: s.yAxisIndex,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        data: xData.map((ts) => tsToVal.get(ts) ?? null),
      }
    })

    return {
      grid: { top: 50, right: 60, bottom: 70, left: 60 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' as const, label: { backgroundColor: '#475569' } } },
      legend: { data: echartsSeries.map((s) => s.name), top: 0, textStyle: { color: '#64748b', fontSize: 11 }, type: 'scroll' as const },
      xAxis: {
        type: 'category' as const,
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val)
            if (range.hours <= 24) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            if (range.hours <= 24 * 30) return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
            return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
          },
        },
      },
      yAxis,
      dataZoom: [
        { type: 'inside' as const, start: 0, end: 100 },
        { type: 'slider' as const, start: 0, end: 100, height: 18, bottom: 24, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', fillerColor: 'rgba(0, 48, 135, 0.1)', handleStyle: { color: '#003087' }, textStyle: { color: '#94a3b8', fontSize: 10 } },
      ],
      series: echartsSeries,
    }
  }, [series, seriesData, range.hours])

  function handleAddSeries(deviceCode: string, deviceName: string, deviceType: string, metric: string) {
    const id = `${deviceCode}::${metric}`
    if (series.some((s) => s.id === id)) { setShowAddModal(false); return }
    if (series.length >= 8) { alert('최대 8개까지 추가할 수 있습니다'); return }
    const newSeries: Series = {
      id, deviceCode, deviceName, deviceType, metric,
      metricLabel: METRIC_LABELS[metric] ?? metric,
      color: COLORS[series.length % COLORS.length],
      yAxisIndex: assignYAxis(series, metric),
    }
    setSeries((prev) => [...prev, newSeries])
    setShowAddModal(false)
  }

  function handleRemoveSeries(id: string) { setSeries((prev) => prev.filter((s) => s.id !== id)) }
  function handleClearAll() { setSeries([]) }

  return {
    series, rangeIdx, setRangeIdx,
    showAddModal, setShowAddModal,
    seriesData, loading, perf, range,
    devicesPreloaded, statsList, insights, chartOption,
    handleAddSeries, handleRemoveSeries, handleClearAll,
  }
}
