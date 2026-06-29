import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '@/shared/lib/api'
import { PointTrendLayout } from '../PointTrendLayout'
import { AddSeriesModal } from '../../AddSeriesModal'
import { calcStats, generateInsights, type SeriesStats, type Insight } from '../../insights'
import { StatsMatrix } from '../../StatsMatrix'
import { InsightCards } from '../../InsightCards'
import { METRIC_LABELS, type Series, type EquipmentLive } from '../../types'

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

const RANGES: RangeOption[] = [
  { label: '1시간', hours: 1, intervalMinutes: 1 },
  { label: '1일', hours: 24, intervalMinutes: 5 },
  { label: '1주', hours: 24 * 7, intervalMinutes: 30 },
  { label: '1개월', hours: 24 * 30, intervalMinutes: 60 },
  { label: '3개월', hours: 24 * 90, intervalMinutes: 180 },
  { label: '6개월', hours: 24 * 180, intervalMinutes: 360 },
  { label: '1년', hours: 24 * 365, intervalMinutes: 1440 },
]

// 시리즈 색상 팔레트
const COLORS = [
  '#003087',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

function devicePath(code: string): string {
  if (/^cnc/i.test(code)) return 'cnc'
  if (/^cmp/i.test(code)) return 'compressors'
  return 'sensors'
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// 메트릭 단위 그룹 — 같은 단위는 같은 Y축
const METRIC_UNIT_GROUP: Record<string, string> = {
  spindle_rpm: 'rpm',
  spindle_load: 'percent',
  power_factor: 'percent',
  vibration: 'mm/s',
  motor_temp: 'celsius',
  suction_temp: 'celsius',
  discharge_temp: 'celsius',
  cycle_time: 'sec',
  discharge_pressure: 'bar',
  motor_current: 'amp',
  active_power: 'kw',
  energy_kwh: 'kwh',
  good_count: 'count',
  reject_count: 'count',
  run_state: 'state',
  tool_hours: 'hour',
}

// 시리즈 추가 시 Y축 할당 — 같은 단위면 같은 축, 다르면 새 축 (최대 2개)
function assignYAxis(existing: Series[], metric: string): number {
  const newGroup = METRIC_UNIT_GROUP[metric] ?? metric
  // 기존에 같은 그룹 있으면 그 yAxisIndex
  const same = existing.find((s) => (METRIC_UNIT_GROUP[s.metric] ?? s.metric) === newGroup)
  if (same) return same.yAxisIndex
  // 다른 그룹 — 사용중인 yAxisIndex가 0뿐이면 1, 둘 다면 0으로 묶음
  const usedAxes = new Set(existing.map((s) => s.yAxisIndex))
  if (existing.length === 0) return 0
  if (!usedAxes.has(1)) return 1
  return 0
}

export function MultiSensorComparePage() {
  const [series, setSeries] = useState<Series[]>([])
  const [rangeIdx, setRangeIdx] = useState(3) // 기본: 1개월
  const [showAddModal, setShowAddModal] = useState(false)

  const [seriesData, setSeriesData] = useState<SeriesData[]>([])
  const [loading, setLoading] = useState(false)
  const [perf, setPerf] = useState<{ totalMs: number; totalBytes: number } | null>(null)

  const range = RANGES[rangeIdx]

  // ── 통계·인사이트 계산 ──
  const { statsList, insights } = useMemo(() => {
    if (series.length === 0 || seriesData.length === 0) {
      return { statsList: [] as SeriesStats[], insights: [] as Insight[] }
    }
    const seriesById = new Map(seriesData.map((sd) => [sd.seriesId, sd]))
    const statsList = series
      .map((s) => {
        const sd = seriesById.get(s.id)
        return sd ? calcStats(s.id, sd.points) : null
      })
      .filter((v): v is SeriesStats => v !== null)

    const labelMap: Record<string, string> = {}
    series.forEach((s) => {
      labelMap[s.id] = `${s.deviceName} · ${s.metricLabel}`
    })

    const insights = generateInsights(statsList, labelMap)
    return { statsList, insights }
  }, [series, seriesData])

  // ── 초기 디폴트 시리즈 — 시연용 cnc 3대 진동 ──
  const [devicesPreloaded, setDevicesPreloaded] = useState<EquipmentLive[]>([])

  useEffect(() => {
    api
      .get<EquipmentLive[]>('/equipment-live')
      .then((data) => {
        setDevicesPreloaded(data)
        // 시연용 디폴트: cnc 3대의 vibration
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
    // 의존성 비움 — 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 시리즈 또는 기간 변경 시 데이터 fetch ──
  useEffect(() => {
    if (series.length === 0) {
      setSeriesData([])
      setPerf(null)
      return
    }
    let active = true
    setLoading(true)

    const t0 = performance.now()

    Promise.all(
      series.map(async (s) => {
        const path = devicePath(s.deviceCode)
        const url = `/${path}/trend?deviceId=${encodeURIComponent(s.deviceCode)}&metric=${encodeURIComponent(s.metric)}&hours=${range.hours}&intervalMinutes=${range.intervalMinutes}`
        const points = await api.get<TrendPoint[]>(url)
        return { seriesId: s.id, points, bytes: JSON.stringify(points).length }
      }),
    )
      .then((results) => {
        if (!active) return
        setSeriesData(results.map((r) => ({ seriesId: r.seriesId, points: r.points })))
        const totalMs = performance.now() - t0
        const totalBytes = results.reduce((sum, r) => sum + r.bytes, 0)
        setPerf({ totalMs, totalBytes })
      })
      .catch(() => {
        if (active) {
          setSeriesData([])
          setPerf(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [series, range.hours, range.intervalMinutes])

  // ── 시리즈 추가 ──
  function handleAddSeries(
    deviceCode: string,
    deviceName: string,
    deviceType: string,
    metric: string,
  ) {
    const id = `${deviceCode}::${metric}`
    if (series.some((s) => s.id === id)) {
      setShowAddModal(false)
      return
    }
    if (series.length >= 8) {
      alert('최대 8개까지 추가할 수 있습니다')
      return
    }
    const newSeries: Series = {
      id,
      deviceCode,
      deviceName,
      deviceType,
      metric,
      metricLabel: METRIC_LABELS[metric] ?? metric,
      color: COLORS[series.length % COLORS.length],
      yAxisIndex: assignYAxis(series, metric),
    }
    setSeries((prev) => [...prev, newSeries])
    setShowAddModal(false)
  }

  function handleRemoveSeries(id: string) {
    setSeries((prev) => prev.filter((s) => s.id !== id))
  }

  function handleClearAll() {
    setSeries([])
  }

  // ── 차트 옵션 ──
  const chartOption = useMemo(() => {
    if (series.length === 0 || seriesData.length === 0) return null

    // X축 = 가장 긴 시리즈의 ts 배열 (또는 합집합)
    const allTs = new Set<string>()
    seriesData.forEach((sd) => sd.points.forEach((p) => allTs.add(p.ts)))
    const xData = Array.from(allTs).sort()

    // Y축 — yAxisIndex별 단위 라벨 모음
    const yAxisGroups = new Map<number, string[]>()
    series.forEach((s) => {
      if (!yAxisGroups.has(s.yAxisIndex)) yAxisGroups.set(s.yAxisIndex, [])
      const g = yAxisGroups.get(s.yAxisIndex)!
      if (!g.includes(s.metricLabel)) g.push(s.metricLabel)
    })

    const yAxis = Array.from({ length: Math.max(...series.map((s) => s.yAxisIndex)) + 1 }).map(
      (_, idx) => ({
        type: 'value' as const,
        scale: true,
        position: idx === 0 ? ('left' as const) : ('right' as const),
        name: yAxisGroups.get(idx)?.join(', ') ?? '',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' as const } },
      }),
    )

    // 시리즈 데이터를 ts → value 맵으로 변환
    const seriesById = new Map(seriesData.map((sd) => [sd.seriesId, sd]))

    const echartsSeries = series.map((s) => {
      const sd = seriesById.get(s.id)
      const tsToVal = new Map<string, number>()
      sd?.points.forEach((p) => tsToVal.set(p.ts, p.avg))
      const data = xData.map((ts) => tsToVal.get(ts) ?? null)
      return {
        name: `${s.deviceName} · ${s.metricLabel}`,
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        yAxisIndex: s.yAxisIndex,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        data,
      }
    })

    return {
      grid: { top: 50, right: 60, bottom: 70, left: 60 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' as const, label: { backgroundColor: '#475569' } },
      },
      legend: {
        data: echartsSeries.map((s) => s.name),
        top: 0,
        textStyle: { color: '#64748b', fontSize: 11 },
        type: 'scroll' as const,
      },
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
            if (range.hours <= 24) {
              return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            } else if (range.hours <= 24 * 30) {
              return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
            } else {
              return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
            }
          },
        },
      },
      yAxis,
      dataZoom: [
        { type: 'inside' as const, start: 0, end: 100 },
        {
          type: 'slider' as const,
          start: 0,
          end: 100,
          height: 18,
          bottom: 24,
          borderColor: '#e2e8f0',
          backgroundColor: '#f8fafc',
          fillerColor: 'rgba(0, 48, 135, 0.1)',
          handleStyle: { color: '#003087' },
          textStyle: { color: '#94a3b8', fontSize: 10 },
        },
      ],
      series: echartsSeries,
    }
  }, [series, seriesData, range.hours])

  return (
    <PointTrendLayout>
      <div className="flex flex-col gap-3 p-5">
        {/* 시리즈 칩 + 추가 버튼 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-500">
                시리즈 ({series.length}/8)
              </label>
              {series.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                >
                  모두 제거
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {series.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-full text-[12px]"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-700 font-medium">{s.deviceName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{s.metricLabel}</span>
                  <button
                    onClick={() => handleRemoveSeries(s.id)}
                    className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 leading-none text-[13px] ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}

              {series.length < 8 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1 h-7 px-3 border border-dashed border-slate-300 rounded-full text-[12px] text-slate-500 hover:bg-slate-50 hover:border-[#003087] hover:text-[#003087] transition-colors"
                >
                  + 시리즈 추가
                </button>
              )}
            </div>
          </div>

          {/* 기간 토글 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">조회 기간</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRangeIdx(i)}
                  className={
                    rangeIdx === i
                      ? 'h-8 px-3 text-[12px] font-semibold rounded-lg bg-[#003087] text-white'
                      : 'h-8 px-3 text-[12px] rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 통계 매트릭스 */}
        {series.length > 0 && statsList.length > 0 && (
          <StatsMatrix series={series} statsList={statsList} />
        )}

        {/* 인사이트 카드 */}
        {series.length > 0 && <InsightCards insights={insights} />}

        {/* 성능 표시 */}
        {perf && !loading && series.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-4 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-slate-500">총 조회 시간:</span>
              <span className="font-bold text-[#003087]">{fmtMs(perf.totalMs)}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              <span className="text-slate-500">시리즈:</span>
              <span className="font-semibold text-slate-700 ml-1">{series.length}개</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              <span className="text-slate-500">총 데이터:</span>
              <span className="font-semibold text-slate-700 ml-1">
                {seriesData.reduce((sum, sd) => sum + sd.points.length, 0).toLocaleString('ko-KR')}개
              </span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              <span className="text-slate-500">응답 크기:</span>
              <span className="font-semibold text-slate-700 ml-1">
                {(perf.totalBytes / 1024).toFixed(1)} KB
              </span>
            </span>
          </div>
        )}

        {/* 차트 영역 */}
        <div
          className="bg-white rounded-xl border border-slate-200 p-4 relative"
          style={{ minHeight: 460 }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px]">데이터 조회 중...</span>
              </div>
            </div>
          )}

          {series.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[420px] text-slate-300">
              <p className="text-[14px] m-0">시리즈를 추가해 추이를 비교하세요</p>
              <p className="text-[12px] m-0 mt-1 text-slate-400">+ 시리즈 추가 버튼을 눌러 시작</p>
            </div>
          ) : (
            chartOption && (
              <ReactECharts
                option={chartOption}
                style={{ height: '440px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge
              />
            )
          )}
        </div>

        {/* 시리즈 추가 모달 */}
        {showAddModal && (
          <AddSeriesModal
            devices={devicesPreloaded}
            onAdd={handleAddSeries}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    </PointTrendLayout>
  )
}
