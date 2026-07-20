import type { DeviceRisk } from '@/entities/ehs/model/envSensors'

// 수집항목 임계 밴드는 오름차순 구간: 정상 → 경고 → 위험
// reversed=true 이면 낮을수록 위험(예: 산소농도)
export interface SensorThresholds {
  unit?: string
  normal_min?: number | null
  normal_max?: number | null
  warning_min?: number | null
  warning_max?: number | null
  critical_min?: number | null
  critical_max?: number | null
  reversed?: boolean
}

export function classifyRisk(v: number | null | undefined, m: SensorThresholds): DeviceRisk {
  if (v == null) return 'offline'
  if (m.reversed) {
    if (m.critical_max != null && v <= m.critical_max) return 'danger'
    if (m.warning_max != null && v <= m.warning_max) return 'warning'
    if (m.normal_max != null && v > m.normal_max) return 'caution'
    return 'normal'
  }
  if (m.critical_min != null && v >= m.critical_min) return 'danger'
  if (m.warning_min != null && v >= m.warning_min) return 'warning'
  if (m.normal_min != null && v < m.normal_min) return 'caution'
  return 'normal'
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '−'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// 이슈 원인 문장 — 넘어선 임계 경계와 초과 폭을 설명
export function diagnoseReason(v: number | null | undefined, m: SensorThresholds): string {
  const u = m.unit ? ` ${m.unit}` : ''
  if (v == null) return '최근 수신된 값이 없습니다 (통신 두절 가능성).'
  const risk = classifyRisk(v, m)
  const normalRange = `정상 범위(${fmt(m.normal_min)} ~ ${fmt(m.normal_max)}${u})`
  if (m.reversed) {
    if (risk === 'danger')
      return `현재 ${fmt(v)}${u} — 위험 기준 ${fmt(m.critical_max)}${u} 이하 (기준 −${(m.critical_max! - v).toFixed(1)}).`
    if (risk === 'warning') return `현재 ${fmt(v)}${u} — 경고 기준 ${fmt(m.warning_max)}${u} 이하.`
    if (risk === 'caution') return `현재 ${fmt(v)}${u} — 정상 상한 ${fmt(m.normal_max)}${u} 초과.`
    return `${normalRange} 내에서 안정적입니다.`
  }
  if (risk === 'danger')
    return `현재 ${fmt(v)}${u} — 위험 기준 ${fmt(m.critical_min)}${u} 이상 (기준 +${(v - m.critical_min!).toFixed(1)}).`
  if (risk === 'warning')
    return `현재 ${fmt(v)}${u} — 경고 기준 ${fmt(m.warning_min)}${u} 이상 (기준 +${(v - m.warning_min!).toFixed(1)}).`
  if (risk === 'caution') return `현재 ${fmt(v)}${u} — 정상 하한 ${fmt(m.normal_min)}${u} 미만.`
  return `${normalRange} 내에서 안정적입니다.`
}
