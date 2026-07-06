import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchAllLatest, fetchAggregate, runParallelPoll } from './api'
import type { ScenarioMetrics, DbType } from './types'
import { EMPTY_METRICS } from './types'

const SCENARIO_1_INTERVAL_MS = 3000 // 3초
const SCENARIO_2_INTERVAL_MS = 3000 // 3초
const SCENARIO_3_INTERVAL_MS = 10000 // 10초 (병렬)
const SAMPLE_BUFFER = 200

function useScenarioMetrics() {
  const [tdMetrics, setTdMetrics] = useState<ScenarioMetrics>(EMPTY_METRICS)
  const [tsMetrics, setTsMetrics] = useState<ScenarioMetrics>(EMPTY_METRICS)

  const record = useCallback((db: DbType, responseMs: number, hasError: boolean) => {
    const setter = db === 'tdengine' ? setTdMetrics : setTsMetrics
    setter((prev) => ({
      callCount: prev.callCount + 1,
      totalMs: prev.totalMs + responseMs,
      errors: prev.errors + (hasError ? 1 : 0),
      samples: [...prev.samples.slice(-SAMPLE_BUFFER + 1), responseMs],
      lastResponseMs: responseMs,
      lastMeasuredAt: Date.now(),
    }))
  }, [])

  const reset = useCallback(() => {
    setTdMetrics(EMPTY_METRICS)
    setTsMetrics(EMPTY_METRICS)
  }, [])

  return { tdMetrics, tsMetrics, record, reset }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1)
  return sorted[idx]
}

interface ScenarioCardProps {
  title: string
  subtitle: string
  tdMetrics: ScenarioMetrics
  tsMetrics: ScenarioMetrics
  extraTd?: React.ReactNode
  extraTs?: React.ReactNode
}

function ScenarioCard({
  title,
  subtitle,
  tdMetrics,
  tsMetrics,
  extraTd,
  extraTs,
}: ScenarioCardProps) {
  const tdAvg = tdMetrics.callCount > 0 ? tdMetrics.totalMs / tdMetrics.callCount : 0
  const tsAvg = tsMetrics.callCount > 0 ? tsMetrics.totalMs / tsMetrics.callCount : 0
  const tdP50 = percentile(tdMetrics.samples, 0.5)
  const tsP50 = percentile(tsMetrics.samples, 0.5)

  // 배율 계산 (더 빠른 쪽 기준)
  let ratio = 0
  let winner: DbType | 'equal' = 'equal'
  if (tdMetrics.callCount > 3 && tsMetrics.callCount > 3) {
    if (tdAvg < tsAvg) {
      ratio = tsAvg / tdAvg
      winner = 'tdengine'
    } else if (tsAvg < tdAvg) {
      ratio = tdAvg / tsAvg
      winner = 'timescale'
    }
    if (ratio < 1.15) winner = 'equal'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {winner !== 'equal' && ratio > 1 && (
          <div
            className={`text-xs font-bold px-2 py-1 rounded ${
              winner === 'tdengine' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {winner === 'tdengine' ? 'TDengine' : 'TimescaleDB'} {ratio.toFixed(1)}×
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* TDengine */}
        <div className="relative bg-blue-50 border border-blue-200 rounded p-3">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
          <div className="ml-1">
            <div className="text-[10px] font-medium text-blue-600 mb-1">TDengine</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-blue-700 tabular-nums">
                {tdMetrics.lastResponseMs !== null ? tdMetrics.lastResponseMs.toFixed(0) : '—'}
              </span>
              <span className="text-[10px] text-blue-500">ms</span>
            </div>
            <div className="mt-2 text-[10px] text-blue-500 space-y-0.5 font-mono">
              <div>Avg: {tdAvg.toFixed(0)}ms</div>
              <div>P50: {tdP50.toFixed(0)}ms</div>
              <div>Calls: {tdMetrics.callCount}</div>
            </div>
            {extraTd}
          </div>
        </div>

        {/* TimescaleDB */}
        <div className="relative bg-red-50 border border-red-200 rounded p-3">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l" />
          <div className="ml-1">
            <div className="text-[10px] font-medium text-red-600 mb-1">TimescaleDB</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-red-700 tabular-nums">
                {tsMetrics.lastResponseMs !== null ? tsMetrics.lastResponseMs.toFixed(0) : '—'}
              </span>
              <span className="text-[10px] text-red-500">ms</span>
            </div>
            <div className="mt-2 text-[10px] text-red-500 space-y-0.5 font-mono">
              <div>Avg: {tsAvg.toFixed(0)}ms</div>
              <div>P50: {tsP50.toFixed(0)}ms</div>
              <div>Calls: {tsMetrics.callCount}</div>
            </div>
            {extraTs}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScaleBenchmarkPage() {
  const [running, setRunning] = useState(true)

  const scenario1 = useScenarioMetrics() // all-latest wbgt 200대
  const scenario2 = useScenarioMetrics() // aggregate wbgt 1h
  const scenario3 = useScenarioMetrics() // parallel 100대

  // 병렬 폴링 추가 정보
  const [tdParallel, setTdParallel] = useState<{ total: number; throughput: number } | null>(null)
  const [tsParallel, setTsParallel] = useState<{ total: number; throughput: number } | null>(null)

  // 시나리오 1: 3초마다 all-latest
  useEffect(() => {
    if (!running) return
    let cancelled = false

    async function tick() {
      const [tdRes, tsRes] = await Promise.all([
        fetchAllLatest('tdengine', 'wbgt'),
        fetchAllLatest('timescale', 'wbgt'),
      ])
      if (cancelled) return
      scenario1.record('tdengine', tdRes.responseMs, tdRes.hasError)
      scenario1.record('timescale', tsRes.responseMs, tsRes.hasError)
    }

    tick()
    const timer = setInterval(tick, SCENARIO_1_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [running])

  // 시나리오 2: 3초마다 aggregate
  useEffect(() => {
    if (!running) return
    let cancelled = false

    async function tick() {
      const [tdRes, tsRes] = await Promise.all([
        fetchAggregate('tdengine', 'wbgt', 'wbgt', 1),
        fetchAggregate('timescale', 'wbgt', 'wbgt', 1),
      ])
      if (cancelled) return
      scenario2.record('tdengine', tdRes.responseMs, tdRes.hasError)
      scenario2.record('timescale', tsRes.responseMs, tsRes.hasError)
    }

    tick()
    const timer = setInterval(tick, SCENARIO_2_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [running])

  // 시나리오 3: 10초마다 병렬 폴링
  useEffect(() => {
    if (!running) return
    let cancelled = false

    async function tick() {
      const [tdRes, tsRes] = await Promise.all([
        runParallelPoll('tdengine', 100),
        runParallelPoll('timescale', 100),
      ])
      if (cancelled) return
      // 병렬 폴링의 "응답 시간"은 평균값
      scenario3.record('tdengine', tdRes.avgMs, tdRes.errors > 50)
      scenario3.record('timescale', tsRes.avgMs, tsRes.errors > 50)
      setTdParallel({
        total: tdRes.totalMs,
        throughput: 100 / (tdRes.totalMs / 1000),
      })
      setTsParallel({
        total: tsRes.totalMs,
        throughput: 100 / (tsRes.totalMs / 1000),
      })
    }

    tick()
    const timer = setInterval(tick, SCENARIO_3_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [running])

  function handleReset() {
    scenario1.reset()
    scenario2.reset()
    scenario3.reset()
    setTdParallel(null)
    setTsParallel(null)
  }

  return (
    <div className="flex flex-col gap-3 p-5 h-full overflow-auto">
      {/* 타이틀 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 m-0">1000대 스케일 벤치마크</h1>
          <p className="text-sm text-slate-500 mt-1 m-0">
            TDengine vs TimescaleDB · EHS 실시간 관제 시나리오 · 자동 리버가이싱
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              running
                ? 'bg-slate-800 text-white hover:bg-slate-900'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {running ? '⏸ 일시정지' : '▶ 재개'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            ⟲ 초기화
          </button>
        </div>
      </div>

      {/* 시나리오 1 */}
      <ScenarioCard
        title="시나리오 1 — 200대 최근값 조회"
        subtitle="/api/{db}/ehs/wbgt/all-latest · 200대 WBGT의 최근 데이터"
        tdMetrics={scenario1.tdMetrics}
        tsMetrics={scenario1.tsMetrics}
      />

      {/* 시나리오 2 */}
      <ScenarioCard
        title="시나리오 2 — 카테고리 집계 (GROUP BY)"
        subtitle="/api/{db}/ehs/wbgt/aggregate · 200대 wbgt의 1시간 평균/최대/최소"
        tdMetrics={scenario2.tdMetrics}
        tsMetrics={scenario2.tsMetrics}
      />

      {/* 시나리오 3 (핵심) */}
      <ScenarioCard
        title="시나리오 3 — 100대 병렬 폴링 "
        subtitle="/api/{db}/ehs/wbgt/latest?deviceId=… × 100개 동시 요청"
        tdMetrics={scenario3.tdMetrics}
        tsMetrics={scenario3.tsMetrics}
        extraTd={
          tdParallel && (
            <div className="mt-2 pt-2 border-t border-blue-200 text-[10px] text-blue-500 space-y-0.5 font-mono">
              <div>Total: {tdParallel.total.toFixed(0)}ms</div>
              <div>RPS: {tdParallel.throughput.toFixed(0)}/s</div>
            </div>
          )
        }
        extraTs={
          tsParallel && (
            <div className="mt-2 pt-2 border-t border-red-200 text-[10px] text-red-500 space-y-0.5 font-mono">
              <div>Total: {tsParallel.total.toFixed(0)}ms</div>
              <div>RPS: {tsParallel.throughput.toFixed(0)}/s</div>
            </div>
          )
        }
      />
    </div>
  )
}
