export interface Series {
  id: string
  deviceCode: string
  deviceName: string
  deviceType: string
  metric: string
  metricLabel: string
  color: string
  yAxisIndex: number
}

export interface EquipmentLive {
  id: number
  code: string
  name: string
  equipmentType: string
  isActive: boolean
  hasData: boolean
}

export const METRIC_LABELS: Record<string, string> = {
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
  power_factor: '역률',
  energy_kwh: '에너지 (kWh)',
  good_count: '양품 카운트',
  reject_count: '불량 카운트',
  run_state: '가동상태',
  tool_hours: '공구사용시간 (h)',
}
