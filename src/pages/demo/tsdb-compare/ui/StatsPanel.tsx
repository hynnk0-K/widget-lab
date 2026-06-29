import { cn } from '@/shared/lib/cn'
import type { CumulativeStats, DbType } from '../types'

interface Props {
  tdStats: CumulativeStats
  tsStats: CumulativeStats
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1)
  return sorted[idx]
}

function StatColumn({ db, stats, label }: { db: DbType; stats: CumulativeStats; label: string }) {
  const avg = stats.callCount > 0 ? stats.totalMs / stats.callCount : 0
  const p95 = percentile(stats.responseTimes, 0.95)
  const color = db === 'tdengine' ? 'text-blue-600' : 'text-red-600'
  const barColor = db === 'tdengine' ? 'bg-blue-500' : 'bg-red-500'

  return (
    <div className="flex-1 relative bg-white rounded-lg border border-slate-200 px-4 py-3 overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', barColor)} />
      <div className="ml-2">
        <div className={cn('text-[12px] font-bold mb-2', color)}>{label}</div>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="호출 수" value={stats.callCount.toLocaleString()} unit="" />
          <Stat label="평균" value={avg.toFixed(0)} unit="ms" />
          <Stat label="P95" value={p95.toFixed(0)} unit="ms" />
          <Stat label="에러" value={stats.errors.toString()} unit="" />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-bold text-slate-800 tabular-nums">{value}</span>
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </div>
    </div>
  )
}

export function StatsPanel({ tdStats, tsStats }: Props) {
  const tdAvg = tdStats.callCount > 0 ? tdStats.totalMs / tdStats.callCount : 0
  const tsAvg = tsStats.callCount > 0 ? tsStats.totalMs / tsStats.callCount : 0
  const ratio = tdAvg > 0 ? tsAvg / tdAvg : 0
  const faster = ratio > 1 ? 'TDengine' : 'TimescaleDB'
  const factor = ratio > 1 ? ratio : 1 / ratio

  return (
    <div className="flex gap-3">
      <StatColumn db="tdengine" stats={tdStats} label="TDengine 누적" />
      <StatColumn db="timescale" stats={tsStats} label="TimescaleDB 누적" />
      {tdStats.callCount > 5 && tsStats.callCount > 5 && (
        <div className="flex-shrink-0 flex flex-col justify-center bg-slate-900 text-white rounded-lg px-4 py-3">
          <span className="text-[10px] text-slate-400">현재 비율</span>
          <span className="text-2xl font-bold leading-tight">{factor.toFixed(2)}×</span>
          <span className="text-[10px] text-slate-300">{faster} 우위</span>
        </div>
      )}
    </div>
  )
}
