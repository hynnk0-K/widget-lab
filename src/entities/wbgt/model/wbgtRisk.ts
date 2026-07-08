export type WbgtRiskLevel = 'normal' | 'caution' | 'warning' | 'danger' | 'extreme'

export const WBGT_RISK_LABEL: Record<WbgtRiskLevel, string> = {
  normal: '정상',
  caution: '주의',
  warning: '주의',
  danger: '경고',
  extreme: '위험',
}

export const WBGT_RISK_COLOR: Record<WbgtRiskLevel, string> = {
  normal: 'bg-emerald-500',
  caution: 'bg-blue-500',
  warning: 'bg-amber-500',
  danger: 'bg-orange-500',
  extreme: 'bg-red-600',
}

const RISK_ORDER: WbgtRiskLevel[] = ['normal', 'caution', 'warning', 'danger', 'extreme']

// 고용노동부 체감온도 작업중지 가이드라인 근사치
export function wbgtToRisk(value: number): WbgtRiskLevel {
  if (value >= 38) return 'extreme'
  if (value >= 35) return 'danger'
  if (value >= 33) return 'warning'
  if (value >= 31) return 'caution'
  return 'normal'
}

export function worstRisk(levels: WbgtRiskLevel[]): WbgtRiskLevel {
  let worst: WbgtRiskLevel = 'normal'
  for (const level of levels) {
    if (RISK_ORDER.indexOf(level) > RISK_ORDER.indexOf(worst)) worst = level
  }
  return worst
}

// ponytail: 백엔드 WBGT 센서 API 준비 전까지 라인 ID + 분 단위 시간 버킷 기반 결정적 mock 값. API 연동 시 교체.
function wbgtAt(lineId: number, minuteBucket: number): number {
  const wave = Math.sin(lineId * 1.37 + minuteBucket * 0.1)
  return Math.round((30 + wave * 8) * 10) / 10
}

export function getMockWbgt(lineId: number): number {
  return wbgtAt(lineId, Math.floor(Date.now() / 60_000))
}

// 디테일 차트용: 최근 N분간 1분 간격 mock 추이
export function getMockWbgtTrend(lineId: number, minutes = 30): { ts: number; value: number }[] {
  const nowBucket = Math.floor(Date.now() / 60_000)
  const points: { ts: number; value: number }[] = []
  for (let i = minutes; i >= 0; i--) {
    const bucket = nowBucket - i
    points.push({ ts: bucket * 60_000, value: wbgtAt(lineId, bucket) })
  }
  return points
}
