// BE generate_diagrams.py의 SENSOR_TYPE_META와 동일 — 독립 수집 센서 유형 표시용
export const SENSOR_TYPE_META: Record<string, { label: string; color: string }> = {
  NOISE: { label: '소음계', color: '#f59e0b' },
  LUX: { label: '조도', color: '#fbbf24' },
  WIND: { label: '풍속', color: '#06b6d4' },
  RAIN: { label: '강우량', color: '#3b82f6' },
  PM10: { label: '미세먼지', color: '#78716c' },
  VIBRATION: { label: '진동', color: '#8b5cf6' },
  THERMO: { label: '온습도', color: '#ef4444' },
  CO2: { label: 'CO2', color: '#10b981' },
}

export function sensorTypeMeta(type?: string) {
  return SENSOR_TYPE_META[type ?? ''] ?? { label: type || '기타', color: '#94a3b8' }
}
