// 어떤 메트릭을 표시할지
export type DbType = 'tdengine' | 'timescale'

export interface MetricConfig {
  id: string // 'cnc_3-vibration' 같은 고유 ID
  deviceCode: string // 'cnc_3'
  deviceName: string // 'CNC #3'
  deviceType: 'cnc' | 'compressor'
  metric: string // 'vibration'
  metricLabel: string // '진동'
  unit: string // 'mm/s'
}

export interface MeasurementResult {
  value: number | null // 측정값
  timestamp: string | null // 데이터 타임스탬프 (ts)
  responseMs: number // API 응답 시간
  lagMs: number | null // E2E lag (now - timestamp)
  error?: string
  fetchedAt: number // 측정 시점 (Date.now())
}

// 누적 통계용
export interface CumulativeStats {
  callCount: number // 호출 횟수
  totalMs: number // 응답 시간 누적
  responseTimes: number[] // 최근 N개 (P95 계산용)
  errors: number
}

// metric 라벨 매핑 (위에 만든 거 재사용)
export const METRIC_LABEL: Record<string, string> = {
  vibration: '진동',
  motor_temp: '모터 온도',
  spindle_rpm: '스핀들 RPM',
  spindle_load: '스핀들 부하',
  cycle_time: '사이클 시간',
  discharge_pressure: '토출 압력',
  discharge_temp: '토출 온도',
  suction_temp: '흡입 온도',
  motor_current: '모터 전류',
  active_power: '유효 전력',
}

export const METRIC_UNIT: Record<string, string> = {
  vibration: 'mm/s',
  motor_temp: '°C',
  spindle_rpm: 'rpm',
  spindle_load: '%',
  cycle_time: 's',
  discharge_pressure: 'bar',
  discharge_temp: '°C',
  suction_temp: '°C',
  motor_current: 'A',
  active_power: 'kW',
}

// 표시할 메트릭 목록 (좌우 동일하게 사용)
export const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'cnc_3-vibration',
    deviceCode: 'cnc_3',
    deviceName: 'CNC #3',
    deviceType: 'cnc',
    metric: 'vibration',
    metricLabel: '진동',
    unit: 'mm/s',
  },
  {
    id: 'cnc_3-spindle_rpm',
    deviceCode: 'cnc_3',
    deviceName: 'CNC #3',
    deviceType: 'cnc',
    metric: 'spindle_rpm',
    metricLabel: '스핀들 RPM',
    unit: 'rpm',
  },
  {
    id: 'cnc_3-motor_temp',
    deviceCode: 'cnc_3',
    deviceName: 'CNC #3',
    deviceType: 'cnc',
    metric: 'motor_temp',
    metricLabel: '모터 온도',
    unit: '°C',
  },
  {
    id: 'cmp_1-active_power',
    deviceCode: 'cmp_1',
    deviceName: '컴프레서 #1',
    deviceType: 'compressor',
    metric: 'active_power',
    metricLabel: '유효 전력',
    unit: 'kW',
  },
  {
    id: 'cmp_1-discharge_pressure',
    deviceCode: 'cmp_1',
    deviceName: '컴프레서 #1',
    deviceType: 'compressor',
    metric: 'discharge_pressure',
    metricLabel: '토출 압력',
    unit: 'bar',
  },
  {
    id: 'cmp_3-vibration',
    deviceCode: 'cmp_3',
    deviceName: '컴프레서 #3',
    deviceType: 'compressor',
    metric: 'vibration',
    metricLabel: '진동',
    unit: 'mm/s',
  },
]

// 트렌드 차트용
export const TREND_CONFIGS: MetricConfig[] = [
  {
    id: 'trend-cnc_3-vibration',
    deviceCode: 'cnc_3',
    deviceName: 'CNC #3',
    deviceType: 'cnc',
    metric: 'vibration',
    metricLabel: '진동',
    unit: 'mm/s',
  },
  {
    id: 'trend-cmp_1-active_power',
    deviceCode: 'cmp_1',
    deviceName: '컴프레서 #1',
    deviceType: 'compressor',
    metric: 'active_power',
    metricLabel: '유효 전력',
    unit: 'kW',
  },
]

// types.ts에 추가
export interface TrendPoint {
  ts: string
  avgV: number | null
  minV: number | null
  maxV: number | null
  cnt: number
}
