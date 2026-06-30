import type { SeriesStats } from '@/entities/series/lib/insights'
import type { Series } from '@/entities/series/model/types'

interface Props {
  series: Series[]
  statsList: SeriesStats[]
}

function fmtNum(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return '-'
  return v.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// 시리즈의 상태 판정
function judge(stats: SeriesStats): { label: string; color: string } {
  const absChange = Math.abs(stats.slopePercent)
  if (absChange >= 30) return { label: '⚠ 경고', color: 'text-red-600' }
  if (absChange >= 15) return { label: '주의', color: 'text-amber-600' }
  if (stats.cv > 0.3 && stats.avg > 0.5) return { label: '불안정', color: 'text-amber-600' }
  return { label: '정상', color: 'text-green-600' }
}

export function StatsMatrix({ series, statsList }: Props) {
  if (series.length === 0 || statsList.length === 0) return null

  const statsById = new Map(statsList.map((s) => [s.seriesId, s]))

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100">
        <h3 className="text-[13px] font-semibold text-slate-700 m-0">시리즈 통계</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500">
              <th className="px-4 py-2 text-left font-semibold">시리즈</th>
              <th className="px-3 py-2 text-right font-semibold">평균</th>
              <th className="px-3 py-2 text-right font-semibold">최소</th>
              <th className="px-3 py-2 text-right font-semibold">최대</th>
              <th className="px-3 py-2 text-right font-semibold">표준편차</th>
              <th className="px-3 py-2 text-right font-semibold">변화율</th>
              <th className="px-3 py-2 text-right font-semibold">이상치</th>
              <th className="px-3 py-2 text-center font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => {
              const stats = statsById.get(s.id)
              if (!stats) return null
              const status = judge(stats)
              return (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-700 font-medium">{s.deviceName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{s.metricLabel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                    {fmtNum(stats.avg)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                    {fmtNum(stats.min)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                    {fmtNum(stats.max)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                    {fmtNum(stats.stddev)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span
                      className={
                        Math.abs(stats.slopePercent) >= 15
                          ? stats.slopePercent > 0
                            ? 'text-red-600 font-semibold'
                            : 'text-blue-600 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      {stats.slopePercent > 0 ? '+' : ''}
                      {fmtNum(stats.slopePercent, 1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                    {stats.outlierCount}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-center text-[12px] font-semibold ${status.color}`}
                  >
                    {status.label}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
