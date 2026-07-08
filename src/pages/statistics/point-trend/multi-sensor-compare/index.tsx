import ReactECharts from 'echarts-for-react'
import { PointTrendLayout } from '../PointTrendLayout'
import { AddSeriesModal } from '../ui/AddSeriesModal'
import { StatsMatrix } from '../ui/StatsMatrix'
import { InsightCards } from '../ui/InsightCards'
import {
  useMultiSensorCompare,
  RANGES,
  fmtMs,
} from './model/useMultiSensorCompare'

export function MultiSensorComparePage() {
  const {
    series, rangeIdx, setRangeIdx,
    showAddModal, setShowAddModal,
    seriesData, loading, perf,
    devicesPreloaded, statsList, insights, chartOption,
    handleAddSeries, handleRemoveSeries, handleClearAll,
  } = useMultiSensorCompare()

  return (
    <PointTrendLayout>
      <div className="flex flex-col gap-3 p-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-500">시리즈 ({series.length}/8)</label>
              {series.length > 0 && (
                <button onClick={handleClearAll} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                  모두 제거
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {series.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-50 border border-slate-200 rounded-full text-[12px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-700 font-medium">{s.deviceName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{s.metricLabel}</span>
                  <button onClick={() => handleRemoveSeries(s.id)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 leading-none text-[13px] ml-0.5">
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

        {series.length > 0 && statsList.length > 0 && <StatsMatrix series={series} statsList={statsList} />}
        {series.length > 0 && <InsightCards insights={insights} />}

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
              <span className="font-semibold text-slate-700 ml-1">{(perf.totalBytes / 1024).toFixed(1)} KB</span>
            </span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 relative" style={{ minHeight: 460 }}>
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
              <ReactECharts option={chartOption} style={{ height: '440px', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
            )
          )}
        </div>

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
