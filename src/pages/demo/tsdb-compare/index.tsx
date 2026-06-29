import { useState, useRef, useCallback } from 'react'
import { MetricWidget } from './ui/MetricWidget'
import { TrendWidget } from './ui/TrendWidget'
import { StatsPanel } from './ui/StatsPanel'
import { ControlBar } from './ui/ControlBar'
import { METRIC_CONFIGS, TREND_CONFIGS } from './types'
import type { CumulativeStats } from './types'

const MAX_RESPONSE_TIME_BUFFER = 200 // 최근 200개로 P95 계산

const EMPTY_STATS: CumulativeStats = {
  callCount: 0,
  totalMs: 0,
  responseTimes: [],
  errors: 0,
}

export function TsdbComparePage() {
  const [intervalMs, setIntervalMs] = useState(1000)
  const [paused, setPaused] = useState(false)
  const [tdStats, setTdStats] = useState<CumulativeStats>(EMPTY_STATS)
  const [tsStats, setTsStats] = useState<CumulativeStats>(EMPTY_STATS)

  // 일시정지: intervalMs를 매우 큰 값으로 (사실상 정지)
  const effectiveInterval = paused ? 60 * 60 * 1000 : intervalMs

  const handleTdMeasure = useCallback((responseMs: number, hasError: boolean) => {
    setTdStats((prev) => ({
      callCount: prev.callCount + 1,
      totalMs: prev.totalMs + responseMs,
      responseTimes: [...prev.responseTimes.slice(-MAX_RESPONSE_TIME_BUFFER + 1), responseMs],
      errors: prev.errors + (hasError ? 1 : 0),
    }))
  }, [])

  const handleTsMeasure = useCallback((responseMs: number, hasError: boolean) => {
    setTsStats((prev) => ({
      callCount: prev.callCount + 1,
      totalMs: prev.totalMs + responseMs,
      responseTimes: [...prev.responseTimes.slice(-MAX_RESPONSE_TIME_BUFFER + 1), responseMs],
      errors: prev.errors + (hasError ? 1 : 0),
    }))
  }, [])

  function handleReset() {
    setTdStats(EMPTY_STATS)
    setTsStats(EMPTY_STATS)
  }

  return (
    <div className="flex flex-col gap-3 p-5 h-full overflow-auto">
      {/* 타이틀 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 m-0">TSDB 실시간 비교 데모</h1>
        <p className="text-sm text-slate-500 mt-1 m-0">
          TDengine vs TimescaleDB · 같은 OPCUA 데이터, 다른 DB · 매초 폴링
        </p>
      </div>

      {/* 컨트롤 바 */}
      <ControlBar
        intervalMs={intervalMs}
        onIntervalChange={setIntervalMs}
        paused={paused}
        onPauseToggle={() => setPaused((p) => !p)}
        onReset={handleReset}
      />

      {/* 누적 통계 */}
      <StatsPanel tdStats={tdStats} tsStats={tsStats} />

      {/* 좌우 패널 */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* 좌측 — TDengine */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-blue-700">TDengine</span>
            <span className="text-[11px] text-blue-500">시계열 특화 DB</span>
          </div>

          {/* 단일값 위젯 6개 — 2열 그리드 */}
          <div className="grid grid-cols-2 gap-2">
            {METRIC_CONFIGS.map((config) => (
              <MetricWidget
                key={`td-${config.id}`}
                db="tdengine"
                config={config}
                intervalMs={effectiveInterval}
                onMeasure={handleTdMeasure}
              />
            ))}
          </div>

          {/* 트렌드 차트 2개 */}
          <div className="flex flex-col gap-2">
            {TREND_CONFIGS.map((config) => (
              <TrendWidget
                key={`td-${config.id}`}
                db="tdengine"
                config={config}
                intervalMs={effectiveInterval}
                onMeasure={handleTdMeasure}
              />
            ))}
          </div>
        </div>

        {/* 우측 — TimescaleDB */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-bold text-red-700">TimescaleDB</span>
            <span className="text-[11px] text-red-500">PostgreSQL 기반 시계열 확장</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {METRIC_CONFIGS.map((config) => (
              <MetricWidget
                key={`ts-${config.id}`}
                db="timescale"
                config={config}
                intervalMs={effectiveInterval}
                onMeasure={handleTsMeasure}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {TREND_CONFIGS.map((config) => (
              <TrendWidget
                key={`ts-${config.id}`}
                db="timescale"
                config={config}
                intervalMs={effectiveInterval}
                onMeasure={handleTsMeasure}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
