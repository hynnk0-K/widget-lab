import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '@/shared/lib/api'
import type { DeviceRisk } from '@/entities/ehs/model/envSensors'
import { classifyRisk, diagnoseReason, type SensorThresholds } from '../model/classifyRisk'

interface SensorMaster extends SensorThresholds {
  code: string
  name?: string
  sensor_type?: string
  interval_sec?: number
}

interface LatestRow {
  ts: string
  sensor_code: string
  value: number | null
  quality?: number
}

interface TrendPoint {
  ts: string
  avg: number | null
  min: number | null
  max: number | null
  count: number
}

const RISK_STYLE: Record<DeviceRisk, { label: string; badge: string; text: string; bar: string }> =
  {
    normal: {
      label: '정상',
      badge: 'bg-emerald-50 text-emerald-700',
      text: 'text-emerald-600',
      bar: 'bg-emerald-500',
    },
    caution: {
      label: '주의',
      badge: 'bg-amber-50 text-amber-700',
      text: 'text-amber-600',
      bar: 'bg-amber-500',
    },
    warning: {
      label: '경고',
      badge: 'bg-orange-50 text-orange-700',
      text: 'text-orange-600',
      bar: 'bg-orange-500',
    },
    danger: {
      label: '위험',
      badge: 'bg-red-50 text-red-700',
      text: 'text-red-600',
      bar: 'bg-red-600',
    },
    offline: {
      label: '통신두절',
      badge: 'bg-slate-100 text-slate-500',
      text: 'text-slate-500',
      bar: 'bg-slate-400',
    },
  }

function fmt(v: number | null | undefined): string {
  if (v == null) return '−'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function trendOption(points: TrendPoint[], m: SensorMaster) {
  const markLines = [
    m.warning_max != null && { yAxis: m.warning_max, name: '경고', color: '#f97316' },
    m.critical_max != null && { yAxis: m.critical_max, name: '위험', color: '#ef4444' },
  ].filter(Boolean) as { yAxis: number; name: string; color: string }[]

  return {
    grid: { top: 10, right: 10, bottom: 20, left: 36 },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 11 },
      formatter: (p: Array<{ axisValue: string; value: number }>) => {
        const ts = new Date(p[0].axisValue).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        return `<div style="font-size:10px;color:#94a3b8">${ts}</div><div style="font-weight:600">${p[0].value?.toFixed(2) ?? '-'}${m.unit ? ' ' + m.unit : ''}</div>`
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.ts),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 9,
        interval: Math.max(0, Math.floor(points.length / 4)),
        formatter: (val: string) =>
          new Date(val).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        type: 'line' as const,
        data: points.map((p) => p.avg),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#003087', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,48,135,0.16)' },
              { offset: 1, color: 'rgba(0,48,135,0.01)' },
            ],
          },
        },
        markLine: markLines.length
          ? {
              silent: true,
              symbol: 'none',
              data: markLines.map((ml) => ({
                yAxis: ml.yAxis,
                lineStyle: { color: ml.color, type: 'dashed', width: 1 },
                label: {
                  formatter: ml.name,
                  color: ml.color,
                  fontSize: 9,
                  position: 'insideEndTop',
                },
              })),
            }
          : undefined,
      },
    ],
  }
}

interface Props {
  sensorCode: string
  onClose: () => void
}

const POLL_MS = 5000

export function SensorDetailPanel({ sensorCode, onClose }: Props) {
  const [master, setMaster] = useState<SensorMaster | null>(null)
  const [latest, setLatest] = useState<LatestRow | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    setMaster(null)

    async function loadMaster() {
      const list = await api
        .get<SensorMaster[]>('/collection/sensors?activeOnly=true')
        .catch(() => [] as SensorMaster[])
      if (!active) return
      const m = list.find((s) => s.code === sensorCode) ?? null
      setMaster(m)
      if (!m) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const t = await api
        .get<
          TrendPoint[]
        >(`/collection/data/trend?sensorCode=${encodeURIComponent(sensorCode)}&hours=6&intervalMinutes=10`)
        .catch(() => [] as TrendPoint[])
      if (!active) return
      setTrend(t)
      setLoading(false)
    }

    async function refreshLatest() {
      const l = await api
        .get<LatestRow>(`/collection/data/latest?sensorCode=${encodeURIComponent(sensorCode)}`)
        .catch(() => null)
      if (active) setLatest(l)
    }

    loadMaster()
    refreshLatest()
    const timer = setInterval(refreshLatest, POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [sensorCode])

  const value = latest?.value ?? null
  const risk: DeviceRisk = master ? classifyRisk(value, master) : 'offline'
  const reason = master ? diagnoseReason(value, master) : ''
  const rs = RISK_STYLE[risk]

  return (
    <div className="absolute inset-y-0 right-0 w-[320px] bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-semibold text-slate-800 truncate">
            {master?.name || sensorCode}
          </p>
          <p className="m-0 text-[11px] text-slate-400">
            {sensorCode}
            {master?.sensor_type ? ` · ${master.sensor_type}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-[16px] leading-none px-1 flex-shrink-0"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notFound ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[12px] text-slate-400 m-0">
            수집항목 마스터 정보를 찾을 수 없습니다.
            <br />
            독립 수집 센서가 아닌 항목일 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* 현재 값 + 등급 */}
          <div className="px-4 py-4 border-b border-slate-50">
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className={`text-[32px] font-bold leading-none ${rs.text}`}>
                  {fmt(value)}
                </span>
                <span className="text-[13px] text-slate-400">{master?.unit}</span>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${rs.badge}`}>
                {rs.label}
              </span>
            </div>
            {latest?.ts && (
              <p className="m-0 mt-1.5 text-[11px] text-slate-400">
                마지막 수신 {new Date(latest.ts).toLocaleString('ko-KR', { hour12: false })}
              </p>
            )}
          </div>

          {/* 이슈 원인 진단 */}
          {master && (
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="m-0 text-[11px] font-semibold text-slate-500 mb-1.5">이슈 진단</p>
              <div
                className={`flex items-start gap-2 px-3 py-2 rounded-lg ${risk === 'normal' ? 'bg-emerald-50' : risk === 'offline' ? 'bg-slate-50' : 'bg-red-50/60'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${rs.bar}`} />
                <p className={`m-0 text-[12px] leading-relaxed ${rs.text}`}>{reason}</p>
              </div>
            </div>
          )}

          {/* 임계 기준 */}
          {master && (
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="m-0 text-[11px] font-semibold text-slate-500 mb-2">임계 기준</p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['정상', master.normal_min, master.normal_max, 'normal'],
                    ['경고', master.warning_min, master.warning_max, 'warning'],
                    ['위험', master.critical_min, master.critical_max, 'danger'],
                  ] as const
                ).map(([label, lo, hi, bandRisk]) => {
                  const active = risk === bandRisk
                  const st = RISK_STYLE[bandRisk]
                  return (
                    <div
                      key={label}
                      className={`flex items-center justify-between text-[12px] px-2.5 py-1 rounded-lg border ${active ? `${st.badge} border-transparent font-semibold` : 'border-slate-100 text-slate-500'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${st.bar}`} />
                        {label}
                      </span>
                      <span>
                        {fmt(lo)} ~ {fmt(hi)}
                        {master.unit ? ` ${master.unit}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 트렌드 */}
          <div className="px-3 py-3">
            <p className="m-0 px-1 text-[11px] font-semibold text-slate-500 mb-1">
              최근 6시간 추이
            </p>
            {trend.length === 0 ? (
              <p className="m-0 px-1 text-[11px] text-slate-400">추이 데이터가 없습니다</p>
            ) : (
              master && (
                <ReactECharts
                  option={trendOption(trend, master)}
                  style={{ height: 160, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge
                />
              )
            )}
          </div>

          {master?.interval_sec != null && (
            <p className="m-0 px-4 pb-3 text-[10px] text-slate-300">
              수집 주기 {master.interval_sec}초
            </p>
          )}
        </div>
      )}
    </div>
  )
}
