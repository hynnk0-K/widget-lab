import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import type { Widget, WidgetType } from '@/entities/widget/model/types'

interface Props {
  onAdd: (widget: Omit<Widget, 'id'>) => void
  onClose: () => void
}

interface EquipmentLive {
  id: number
  code: string
  name: string
  equipmentType: string
  isActive: boolean
  hasData: boolean
  lastDataAt?: string
}

interface EquipmentLiveDetail {
  id: number
  code: string
  name: string
  equipmentType: string
  isActive: boolean
  latest: Record<string, unknown>
}

const METRIC_LABELS: Record<string, string> = {
  temperature: '온도 (°C)',
  humidity: '습도 (%)',
  battery: '배터리 (%)',
  rssi: 'RSSI (dBm)',
  spindle_rpm: '스핀들 RPM',
  spindle_load: '스핀들 부하 (%)',
  vibration: '진동',
  motor_temp: '모터 온도 (°C)',
  cycle_time: '사이클 타임 (s)',
  discharge_pressure: '토출압력 (bar)',
  suction_temp: '흡입온도 (°C)',
  discharge_temp: '토출온도 (°C)',
  motor_current: '모터전류 (A)',
  active_power: '유효전력 (kW)',
  energy_kwh: '에너지 (kWh)',
}

const GAUGE_CONFIG: Record<string, { min: number; max: number; warningAt: number }> = {
  temperature: { min: 0, max: 60, warningAt: 50 },
  humidity: { min: 0, max: 100, warningAt: 90 },
  battery: { min: 0, max: 100, warningAt: 20 },
  rssi: { min: -100, max: 0, warningAt: -80 },
  spindle_rpm: { min: 0, max: 6000, warningAt: 5000 },
  spindle_load: { min: 0, max: 100, warningAt: 80 },
  vibration: { min: 0, max: 10, warningAt: 7 },
  motor_temp: { min: 0, max: 100, warningAt: 85 },
  cycle_time: { min: 0, max: 60, warningAt: 50 },
  discharge_pressure: { min: 0, max: 10, warningAt: 8 },
  suction_temp: { min: 0, max: 50, warningAt: 40 },
  discharge_temp: { min: 0, max: 120, warningAt: 100 },
  motor_current: { min: 0, max: 100, warningAt: 80 },
  active_power: { min: 0, max: 50, warningAt: 40 },
  energy_kwh: { min: 0, max: 1000, warningAt: 800 },
}

const DEFAULT_GAUGE = { min: 0, max: 100, warningAt: 80 }
const DEFAULT_SIZE = {
  gauge: { w: 3, h: 2 },
  trend: { w: 6, h: 3 },
  stat: { w: 3, h: 2 },
  status: { w: 3, h: 2 },
  counter: { w: 3, h: 3 },
  minibar: { w: 6, h: 3 },
  heatmap: { w: 6, h: 3 },
}

const WIDGET_TYPES: { value: WidgetType; label: string; desc: string }[] = [
  { value: 'gauge', label: '게이지', desc: '현재 값을 반원 계기판으로 표시' },
  { value: 'trend', label: '추이', desc: '시간에 따른 변화를 꺾은선으로 표시' },
  { value: 'stat', label: '수치 카드', desc: '큰 숫자 + 기간 평균 대비 변화율' },
  { value: 'status', label: '상태', desc: '가동·정지·알람 색깔 배지' },
  { value: 'counter', label: '카운터', desc: '양품/불량 같이 표시' },
  { value: 'minibar', label: '시간별 막대', desc: '24시간 시간별 평균 막대그래프' },
  { value: 'heatmap', label: '요일×시간 히트맵', desc: '1주일 가동 패턴 시각화' },
]

const TYPE_LABEL: Record<string, string> = {
  SENSOR: '센서',
  CNC: 'CNC',
  COMPRESSOR: '압축기',
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function AddWidgetModal({ onAdd, onClose }: Props) {
  const [widgetType, setWidgetType] = useState<WidgetType>('gauge')

  const [devices, setDevices] = useState<EquipmentLive[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)

  const [deviceCode, setDeviceCode] = useState('')
  const [metrics, setMetrics] = useState<string[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)

  const [metric, setMetric] = useState('')
  const [title, setTitle] = useState('')

  // 설비 목록 초기 로드
  useEffect(() => {
    let active = true
    api
      .get<EquipmentLive[]>('/equipment-live')
      .then((data) => {
        if (active) setDevices(data)
      })
      .catch(() => {
        if (active) setDevices([])
      })
      .finally(() => {
        if (active) setDevicesLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // 설비 선택 후 측정 항목 로드 (useEffect 내부에 동기 setState 없음)
  useEffect(() => {
    if (!deviceCode) return
    let active = true
    api
      .get<EquipmentLiveDetail>(`/equipment-live/${deviceCode}`)
      .then((detail) => {
        if (active) {
          setMetrics(Object.keys(detail.latest ?? {}))
          setMetricsLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setMetrics([])
          setMetricsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [deviceCode])

  // 설비 변경 핸들러 — 동기 초기화는 이벤트 핸들러에서
  function handleDeviceChange(code: string) {
    setDeviceCode(code)
    setMetric('')
    setTitle('')
    setMetrics([])
    setMetricsLoading(Boolean(code))
  }

  // 메트릭 변경 시 제목 자동 생성
  function handleMetricChange(m: string) {
    setMetric(m)
    if (deviceCode && m) {
      const dev = devices.find((d) => d.code === deviceCode)
      setTitle(`${dev?.name ?? deviceCode} · ${METRIC_LABELS[m] ?? m}`)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || !deviceCode || !metric) return

    // 타입별 기본 config 생성
    let config: any
    if (widgetType === 'gauge') {
      config = GAUGE_CONFIG[metric] ?? DEFAULT_GAUGE
    } else if (widgetType === 'trend') {
      config = { hours: 6, intervalMinutes: 5 }
    } else if (widgetType === 'stat') {
      // metric별 적절한 unit 추정
      const unitMap: Record<string, string> = {
        spindle_rpm: 'rpm',
        spindle_load: '%',
        vibration: 'mm/s',
        motor_temp: '°C',
        discharge_pressure: 'bar',
        suction_temp: '°C',
        discharge_temp: '°C',
        motor_current: 'A',
        active_power: 'kW',
        energy_kwh: 'kWh',
      }
      config = { decimals: 1, unit: unitMap[metric] ?? '', trendHours: 24 }
    } else if (widgetType === 'status') {
      // run_state 가정 — CNC와 압축기 다름
      if (deviceCode.startsWith('cnc')) {
        config = {
          states: {
            0: { label: '정지', color: 'gray' },
            1: { label: '대기', color: 'yellow' },
            2: { label: '가동', color: 'green' },
            3: { label: '알람', color: 'red' },
          },
        }
      } else {
        config = {
          states: {
            0: { label: '정지', color: 'gray' },
            1: { label: '무부하', color: 'yellow' },
            2: { label: '가동', color: 'green' },
          },
        }
      }
    } else if (widgetType === 'counter') {
      // CNC 양품/불량 자동 매핑
      config = {
        secondaryMetric: metric === 'good_count' ? 'reject_count' : 'good_count',
        primaryLabel: metric === 'good_count' ? '양품' : '불량',
        secondaryLabel: metric === 'good_count' ? '불량' : '양품',
      }
    } else if (widgetType === 'minibar') {
      config = { hours: 24, intervalMinutes: 60 }
    } else if (widgetType === 'heatmap') {
      config = { days: 7 }
    } else {
      config = {}
    }

    onAdd({
      type: widgetType,
      title: title.trim(),
      source: { device: deviceCode, metric },
      config,
      x: 0,
      y: 999,
      ...DEFAULT_SIZE[widgetType],
    })
  }

  const selectedDevice = devices.find((d) => d.code === deviceCode)
  const deviceGroups = groupBy(devices, (d) => d.equipmentType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-800 m-0">위젯 추가</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 위젯 종류 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-2">위젯 종류</label>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setWidgetType(t.value)}
                  className={[
                    'flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all',
                    widgetType === t.value
                      ? 'border-[#003087] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-[13px] font-semibold',
                      widgetType === t.value ? 'text-[#003087]' : 'text-slate-700',
                    ].join(' ')}
                  >
                    {t.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 설비 선택 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">설비</label>
            {devicesLoading ? (
              <div className="h-9 border border-slate-200 rounded-lg flex items-center px-3 gap-2 text-slate-400 text-[12px]">
                <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                설비 목록 불러오는 중...
              </div>
            ) : (
              <select
                value={deviceCode}
                onChange={(e) => handleDeviceChange(e.target.value)}
                required
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#003087] transition-colors cursor-pointer"
              >
                <option value="" disabled>
                  설비를 선택하세요
                </option>
                {Object.entries(deviceGroups).map(([type, group]) => (
                  <optgroup key={type} label={TYPE_LABEL[type] ?? type}>
                    {group.map((d) => (
                      <option key={d.code} value={d.code} disabled={!d.hasData}>
                        {d.name} ({d.code}){!d.hasData ? ' — 데이터 없음' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {/* 선택된 설비 상태 */}
            {selectedDevice && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={[
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                    selectedDevice.hasData
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {selectedDevice.hasData ? '● 데이터 있음' : '○ 데이터 없음'}
                </span>
                {selectedDevice.lastDataAt && (
                  <span className="text-[11px] text-slate-400">
                    마지막 수신: {new Date(selectedDevice.lastDataAt).toLocaleString('ko-KR')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 측정 항목 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
              측정 항목
            </label>
            {metricsLoading ? (
              <div className="h-9 border border-slate-200 rounded-lg flex items-center px-3 gap-2 text-slate-400 text-[12px]">
                <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                측정 항목 불러오는 중...
              </div>
            ) : (
              <select
                value={metric}
                onChange={(e) => handleMetricChange(e.target.value)}
                disabled={!deviceCode || metrics.length === 0}
                required
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#003087] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {!deviceCode
                    ? '설비를 먼저 선택하세요'
                    : metrics.length === 0
                      ? '측정 항목 없음'
                      : '측정 항목을 선택하세요'}
                </option>
                {metrics.map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABELS[m] ?? m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 위젯 제목 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
              위젯 제목
            </label>
            <input
              type="text"
              placeholder="설비 + 측정 항목 선택 시 자동 입력됩니다"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors"
              required
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-slate-200 rounded-xl text-[13px] text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!deviceCode || !metric || !title.trim()}
              className="flex-1 h-10 bg-[#003087] text-white rounded-xl text-[13px] font-semibold hover:bg-[#002470] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
