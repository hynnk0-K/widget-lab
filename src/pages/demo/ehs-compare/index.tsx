import { useState, useCallback } from 'react'
import { EhsWidget } from './ui/EhsWidget'
import { TrendPanel } from './ui/TrendPanel'
import { CATEGORIES } from './types'
import type { CumulativeStats } from './types'

const MAX_BUFFER = 500

const INTERVAL_OPTIONS = [
  { label: '1초', value: 1000 },
  { label: '2초', value: 2000 },
  { label: '5초', value: 5000 },
]

function createEmptyStats(): CumulativeStats {
  return { callCount: 0, totalMs: 0, responseTimes: [], errors: 0 }
}

export function EhsComparePage() {
  const [intervalMs, setIntervalMs] = useState(2000)
  const [paused, setPaused] = useState(false)
  const [tdStats, setTdStats] = useState<CumulativeStats>(() => createEmptyStats())
  const [tsStats, setTsStats] = useState<CumulativeStats>(() => createEmptyStats())

  const effectiveInterval = paused ? 60 * 60 * 1000 : intervalMs

  const handleTdMeasure = useCallback((responseMs: number, hasError: boolean) => {
    setTdStats((prev) => ({
      callCount: prev.callCount + 1,
      totalMs: prev.totalMs + responseMs,
      responseTimes: [...prev.responseTimes.slice(-MAX_BUFFER + 1), responseMs],
      errors: prev.errors + (hasError ? 1 : 0),
    }))
  }, [])

  const handleTsMeasure = useCallback((responseMs: number, hasError: boolean) => {
    setTsStats((prev) => ({
      callCount: prev.callCount + 1,
      totalMs: prev.totalMs + responseMs,
      responseTimes: [...prev.responseTimes.slice(-MAX_BUFFER + 1), responseMs],
      errors: prev.errors + (hasError ? 1 : 0),
    }))
  }, [])

  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.min(Math.floor(s.length * p), s.length - 1)]
  }

  const tdAvg = tdStats.callCount > 0 ? tdStats.totalMs / tdStats.callCount : 0
  const tsAvg = tsStats.callCount > 0 ? tsStats.totalMs / tsStats.callCount : 0
  const tdP95 = percentile(tdStats.responseTimes, 0.95)
  const tsP95 = percentile(tsStats.responseTimes, 0.95)

  const ratio = tdAvg > 0 && tsAvg > 0 ? tsAvg / tdAvg : 0
  const faster = ratio > 1 ? 'TDengine' : 'TimescaleDB'
  const factor = ratio > 1 ? ratio : ratio > 0 ? 1 / ratio : 0

  const bothReady = tdStats.callCount > 3 && tsStats.callCount > 3

  function handleReset() {
    setTdStats(createEmptyStats())
    setTsStats(createEmptyStats())
  }

  return (
    <div className="flex flex-col gap-3 p-5 h-full overflow-auto">
      {/* 타이틀 + 컨트롤 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 m-0">EHS 실시간 비교 데모</h1>
          <p className="text-sm text-slate-500 mt-1 m-0">
            TDengine vs TimescaleDB · 10개 카테고리 × 2대 = 20개 위젯
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setIntervalMs(opt.value)}
                disabled={paused}
                className={`px-3 py-1.5 text-xs rounded font-medium ${
                  intervalMs === opt.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${paused ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className={`px-3 py-1.5 text-xs rounded font-medium ${
              paused ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {paused ? '▶ 재개' : '⏸ 일시정지'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded font-medium hover:bg-slate-200"
          >
            ⟲ 초기화
          </button>
        </div>
      </div>

      {/* 누적 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border-l-4 border-blue-500 border border-slate-200 rounded p-3">
          <div className="text-xs font-bold text-blue-600 mb-2">TDengine 누적</div>
          {tdStats.callCount === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">대기중...</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] text-slate-400">호출</div>
                <div className="text-sm font-bold">{tdStats.callCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">평균</div>
                <div className="text-sm font-bold">{tdAvg.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">P95</div>
                <div className="text-sm font-bold">{tdP95.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">에러</div>
                <div className="text-sm font-bold">{tdStats.errors}</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-l-4 border-red-500 border border-slate-200 rounded p-3">
          <div className="text-xs font-bold text-red-600 mb-2">TimescaleDB 누적</div>
          {tsStats.callCount === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">대기중...</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] text-slate-400">호출</div>
                <div className="text-sm font-bold">{tsStats.callCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">평균</div>
                <div className="text-sm font-bold">{tsAvg.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">P95</div>
                <div className="text-sm font-bold">{tsP95.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">에러</div>
                <div className="text-sm font-bold">{tsStats.errors}</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-white rounded p-3 flex flex-col justify-center">
          {bothReady ? (
            <>
              <div className="text-[10px] text-slate-400">현재 비율</div>
              <div className="text-2xl font-bold">{factor.toFixed(2)}×</div>
              <div className="text-[10px] text-slate-300">{faster} 우위</div>
            </>
          ) : (
            <div className="text-sm text-slate-400 italic text-center">데이터 수집 중...</div>
          )}
        </div>
      </div>

      {/* 좌우 패널 */}
      <div className="grid grid-cols-2 gap-3">
        {/* TDengine 좌 */}
        <div>
          <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-blue-700">TDengine</span>
            <span className="text-[11px] text-blue-500">시계열 특화</span>
          </div>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <div
                  key={`td-${cat.category}`}
                  className="bg-white border border-slate-200 rounded p-2"
                >
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    <span>{cat.koreanLabel}</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-auto">
                      {cat.metric.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cat.devices.map((dev) => (
                      <EhsWidget
                        key={`td-${cat.category}-${dev.id}`}
                        db="tdengine"
                        category={cat}
                        device={dev}
                        intervalMs={effectiveInterval}
                        onMeasure={handleTdMeasure}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* TimescaleDB 우 */}
        <div>
          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-bold text-red-700">TimescaleDB</span>
            <span className="text-[11px] text-red-500">PostgreSQL 기반</span>
          </div>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <div
                  key={`ts-${cat.category}`}
                  className="bg-white border border-slate-200 rounded p-2"
                >
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    <span>{cat.koreanLabel}</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-auto">
                      {cat.metric.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cat.devices.map((dev) => (
                      <EhsWidget
                        key={`ts-${cat.category}-${dev.id}`}
                        db="timescale"
                        category={cat}
                        device={dev}
                        intervalMs={effectiveInterval}
                        onMeasure={handleTsMeasure}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 트렌드 조회 패널 */}
      <TrendPanel />
    </div>
  )
}
