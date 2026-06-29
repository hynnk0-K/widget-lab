export type AlarmSeverity = 'critical' | 'warning' | 'info'
export type AlarmStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved'

export interface Alarm {
  alarmId: number
  occurredAt: string // ISO timestamp
  deviceCode: string // 'cnc_3'
  deviceName: string // 'CNC #3'
  line: string // 'MACH-CELL'
  location: string // '생산동/가공셀'
  metric: string // 'vibration'
  value: number // 7.2
  threshold: number // 7.0
  severity: AlarmSeverity
  message: string // 'CNC #3 진동 위험 7.2'
  status: AlarmStatus
  acknowledgedBy?: string | null
  acknowledgedAt?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  note?: string | null
}

export interface EquipmentDto {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  position: string | null
  isActive: boolean
}

export interface AlarmSummary {
  total: number
  critical: number
  warning: number
  info: number
  acknowledged: number
  inProgress: number
}

// 한글 라벨
export const SEVERITY_LABEL: Record<AlarmSeverity, string> = {
  critical: '심각',
  warning: '주의',
  info: '정보',
}

export const STATUS_LABEL: Record<AlarmStatus, string> = {
  active: '미처리',
  acknowledged: '인지',
  in_progress: '조치중',
  resolved: '완료',
}

export const METRIC_LABEL: Record<string, string> = {
  vibration: '진동',
  motor_temp: '모터 온도',
  spindle_load: '스핀들 부하',
  spindle_rpm: '스핀들 RPM',
  cycle_time: '사이클 시간',
  discharge_pressure: '토출 압력',
  discharge_temp: '토출 온도',
  suction_temp: '흡입 온도',
  motor_current: '모터 전류',
  active_power: '유효 전력',
  power_factor: '역률',
}

export const METRIC_UNIT: Record<string, string> = {
  vibration: 'mm/s',
  motor_temp: '°C',
  spindle_load: '%',
  spindle_rpm: 'rpm',
  cycle_time: 's',
  discharge_pressure: 'bar',
  discharge_temp: '°C',
  suction_temp: '°C',
  motor_current: 'A',
  active_power: 'kW',
  power_factor: '',
}
