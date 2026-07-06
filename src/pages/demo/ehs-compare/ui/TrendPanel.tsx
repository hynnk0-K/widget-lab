import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cn } from '@/shared/lib/cn'
import { fetchEhsTrend } from '../api'
import type { CategoryConfig, TrendPoint, DbType } from '../types'
import { CATEGORIES, CATEGORY_MAX_MONTHS } from '../types'

const PERIOD_OPTIONS = [
  { label: '1시간', hours: 1, intervalMinutes: 1, monthsRequired: 0 },
  { label: '6시간', hours: 6, intervalMinutes: 10, monthsRequired: 0 },
  { label: '1일', hours: 24, intervalMinutes: 30, monthsRequired: 0 },
  { label: '1주', hours: 168, intervalMinutes: 60, monthsRequired: 0 },
  { label: '1개월', hours: 720, intervalMinutes: 240, monthsRequired: 1 },
  { label: '3개월', hours: 2160, intervalMinutes: 720, monthsRequired: 3 },
  { label: '6개월', hours: 4320, intervalMinutes: 1440, monthsRequired: 6 },
  { label: '1년', hours: 8760, intervalMinutes: 2880, monthsRequired: 12 },
]

interface ChartResult {
  data: TrendPoint[]
  responseMs: number
  error?: string
}

const DB_COLOR: Record<DbType, string> = {
  tdengine: '#2E75B6',
  timescale: '#E53E3E',
}

export function TrendPanel() {
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(4) // wbgt
  const [selectedDeviceIdx, setSelectedDeviceIdx] = useState(0)
  const [selectedMetric, setSelectedMetric] = useState('wbgt')
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('1일')
  const [tdResult, setTdResult] = useState<ChartResult | null>(null)
  const [tsResult, setTsResult] = useState<ChartResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [tdLoading, setTdLoading] = useState(false)
  const [tsLoading, setTsLoading] = useState(false)

  const anyLoading = tdLoading || tsLoading

  const category = CATEGORIES[selectedCategoryIdx]
  const device = category.devices[selectedDeviceIdx]

  // 카테고리에 따라 사용 가능한 기간 필터링
  const availablePeriods = useMemo(() => {
    const maxMonths = CATEGORY_MAX_MONTHS[category.category] ?? 1
    return PERIOD_OPTIONS.map((p) => ({
      ...p,
      available: p.monthsRequired <= maxMonths,
    }))
  }, [category.category])

  // 선택된 기간이 현재 카테고리에서 사용 불가면 1일로 리셋
  useMemo(() => {
    const currentPeriod = availablePeriods.find((p) => p.label === selectedPeriodLabel)
    if (currentPeriod && !currentPeriod.available) {
      setSelectedPeriodLabel('1일')
    }
  }, [availablePeriods, selectedPeriodLabel])

  const selectedPeriod =
    availablePeriods.find((p) => p.label === selectedPeriodLabel) || availablePeriods[2] // fallback: 1일

  // 사용 가능한 메트릭 (기존 로직)
  const availableMetrics: Record<string, string[]> = {
    airclean: [
      'intake_flow',
      'differential_pressure',
      'treatment_efficiency',
      'filter_wear',
      'temperature',
    ],
    drainage: ['water_level', 'flow_rate', 'turbidity', 'cod', 'ph', 'temperature'],
    sewage_tank: ['water_level_pct', 'inflow', 'outflow', 'ph', 'temperature', 'cod'],
    cutting_oil: ['temperature', 'ph', 'concentration', 'remaining_pct', 'contamination'],
    wbgt: ['temperature', 'humidity', 'apparent_temp', 'heat_index', 'wbgt'],
    wastewater: ['flow_rate', 'cod', 'bod', 'ss', 'ph', 'temperature'],
    waste_thinner: ['storage_level', 'voc_concentration', 'temperature'],
    waste_cutting_oil: ['storage_level_pct', 'ph', 'temperature', 'contamination'],
    lng_flow: ['instant_flow', 'cumulative_flow', 'pressure', 'temperature'],
    seismic: ['accel_x', 'accel_y', 'accel_z', 'max_accel'],
  }

  async function handleQuery() {
    // 즉시 두 요청 시작 + 이전 결과 초기화
    setTdResult(null)
    setTsResult(null)
    setTdLoading(true)
    setTsLoading(true)

    // TDengine — 완료 즉시 setState
    fetchEhsTrend(
      'tdengine',
      category.category,
      device.id,
      selectedMetric,
      selectedPeriod.hours,
      selectedPeriod.intervalMinutes,
    ).then((res) => {
      setTdResult(res)
      setTdLoading(false)
    })

    // TimescaleDB — 완료 즉시 setState (별도)
    fetchEhsTrend(
      'timescale',
      category.category,
      device.id,
      selectedMetric,
      selectedPeriod.hours,
      selectedPeriod.intervalMinutes,
    ).then((res) => {
      setTsResult(res)
      setTsLoading(false)
    })
  }

  const makeChartOption = (data: TrendPoint[], color: string) => {
    const xs = data.map((p) => new Date(p.ts).getTime())
    const ys = data.map((p) => p.avg ?? null)

    return {
      grid: { left: 45, right: 15, top: 15, bottom: 30 },
      xAxis: {
        type: 'time',
        axisLabel: { fontSize: 10, color: '#94a3b8' },
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
          const t = d.toLocaleString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'numeric',
            day: 'numeric',
          })
          const v = p.value[1]
          return `${t}<br/><b>${typeof v === 'number' ? v.toFixed(2) : '-'}</b>`
        },
      },
      series: [
        {
          type: 'line',
          data: xs.map((x, i) => [x, ys[i]]),
          smooth: false,
          symbol: 'none',
          lineStyle: { color, width: 1.5 },
          areaStyle: { color, opacity: 0.08 },
        },
      ],
      animation: false,
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-slate-800">트렌드 조회</h2>
        <p className="text-[11px] text-slate-500">
          과거 데이터 조회 · 카테고리·설비·메트릭·기간 선택
        </p>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* 카테고리 */}
        <select
          value={selectedCategoryIdx}
          onChange={(e) => {
            const idx = Number(e.target.value)
            setSelectedCategoryIdx(idx)
            const cat = CATEGORIES[idx]
            setSelectedDeviceIdx(0)
            setSelectedMetric(cat.metric.key)
          }}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
        >
          {CATEGORIES.map((cat, idx) => (
            <option key={cat.category} value={idx}>
              {cat.koreanLabel}
              {CATEGORY_MAX_MONTHS[cat.category] === 12 ? ' (1년)' : ''}
            </option>
          ))}
        </select>

        {/* 설비 */}
        <select
          value={selectedDeviceIdx}
          onChange={(e) => setSelectedDeviceIdx(Number(e.target.value))}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
        >
          {category.devices.map((dev, idx) => (
            <option key={dev.id} value={idx}>
              {dev.id}
            </option>
          ))}
        </select>

        {/* 메트릭 */}
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
        >
          {(availableMetrics[category.category] || []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* 기간 — 사용 불가는 disabled */}
        <select
          value={selectedPeriodLabel}
          onChange={(e) => setSelectedPeriodLabel(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
        >
          {availablePeriods.map((p) => (
            <option key={p.label} value={p.label} disabled={!p.available}>
              {p.label}
              {!p.available ? ' (데이터 없음)' : ''}
            </option>
          ))}
        </select>

        {/* 조회 버튼 */}
        <button
          onClick={handleQuery}
          disabled={anyLoading} // ← 이전 loading → anyLoading
          className="text-xs px-4 py-1.5 bg-slate-800 text-white rounded font-medium hover:bg-slate-900 disabled:opacity-50"
        >
          {anyLoading ? '조회 중...' : '조회'}
        </button>

        {/* 데이터 범위 안내 */}
        <span className="text-[10px] text-slate-400 ml-auto">
          현재 카테고리 데이터:
          <span className="font-medium text-slate-600 ml-1">
            {CATEGORY_MAX_MONTHS[category.category] === 12 ? '최근 1년' : '최근 30일'}
          </span>
        </span>
      </div>

      {/* 좌우 차트 */}
      <div className="grid grid-cols-2 gap-3">
        {/* TDengine */}
        <div className="border border-blue-200 rounded p-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-bold text-blue-600">TDengine</span>
            {tdLoading ? (
              <span className="text-[10px] text-blue-400 font-mono">조회 중...</span>
            ) : tdResult ? (
              <span className="text-[10px] font-mono text-blue-500">
                {tdResult.responseMs.toFixed(0)}ms · {tdResult.data.length}p
              </span>
            ) : null}
          </div>
          {tdLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tdResult ? (
            tdResult.error ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-red-500">
                {tdResult.error}
              </div>
            ) : (
              <ReactECharts
                option={makeChartOption(tdResult.data, DB_COLOR.tdengine)}
                style={{ height: 200, width: '100%' }}
                notMerge={true}
              />
            )
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
              조회 버튼 클릭
            </div>
          )}
        </div>

        {/* TimescaleDB */}
        <div className="border border-red-200 rounded p-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-bold text-red-600">TimescaleDB</span>
            {tsLoading ? (
              <span className="text-[10px] text-red-400 font-mono">조회 중...</span>
            ) : tsResult ? (
              <span className="text-[10px] font-mono text-red-500">
                {tsResult.responseMs.toFixed(0)}ms · {tsResult.data.length}p
              </span>
            ) : null}
          </div>
          {tsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tsResult ? (
            tsResult.error ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-red-500">
                {tsResult.error}
              </div>
            ) : (
              <ReactECharts
                option={makeChartOption(tsResult.data, DB_COLOR.timescale)}
                style={{ height: 200, width: '100%' }}
                notMerge={true}
              />
            )
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
              조회 버튼 클릭
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
