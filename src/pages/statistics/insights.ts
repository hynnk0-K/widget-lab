// 시리즈별 통계 + 인사이트 계산
// 백엔드 호출 없이 FE에서 trend 데이터로 직접 계산

export interface SeriesStats {
  seriesId: string
  count: number
  avg: number
  min: number
  max: number
  stddev: number
  cv: number // 변동계수 = stddev / avg
  slope: number // 시간당 변화율 (선형 회귀)
  slopePerDay: number // 일당 변화율 (시연용 직관)
  slopePercent: number // 시작 평균 대비 % 변화
  firstAvg: number // 초반 1/4 구간 평균
  lastAvg: number // 마지막 1/4 구간 평균
  outlierCount: number // 평균 ± 2σ 벗어난 점 개수
}

export interface Insight {
  seriesId: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metric: 'trend' | 'comparison' | 'outlier' | 'volatility'
}

interface TrendPoint {
  ts: string
  avg: number
  min: number
  max: number
  count: number
}

// ── 시리즈 1개 통계 계산 ──
export function calcStats(seriesId: string, points: TrendPoint[]): SeriesStats {
  if (points.length === 0) {
    return {
      seriesId,
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      stddev: 0,
      cv: 0,
      slope: 0,
      slopePerDay: 0,
      slopePercent: 0,
      firstAvg: 0,
      lastAvg: 0,
      outlierCount: 0,
    }
  }

  const values = points.map((p) => p.avg)
  const n = values.length

  // 평균
  const avg = values.reduce((s, v) => s + v, 0) / n

  // min/max
  const min = Math.min(...values)
  const max = Math.max(...values)

  // 표준편차
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  const stddev = Math.sqrt(variance)

  // 변동계수
  const cv = avg !== 0 ? Math.abs(stddev / avg) : 0

  // 선형 회귀 — 기울기
  // x = 인덱스 (균등 간격으로 가정), y = 값
  const xMean = (n - 1) / 2
  const yMean = avg
  let num = 0
  let den = 0
  values.forEach((y, i) => {
    num += (i - xMean) * (y - yMean)
    den += Math.pow(i - xMean, 2)
  })
  const slopePerPoint = den > 0 ? num / den : 0

  // 시간 간격 환산 (전체 기간 / n포인트)
  const firstTs = new Date(points[0].ts).getTime()
  const lastTs = new Date(points[n - 1].ts).getTime()
  const totalHours = Math.max(1, (lastTs - firstTs) / 1000 / 3600)
  const hoursPerPoint = totalHours / Math.max(1, n - 1)
  const slope = slopePerPoint / hoursPerPoint // 시간당
  const slopePerDay = slope * 24

  // 시작 평균 대비 % 변화
  const quarter = Math.max(1, Math.floor(n / 4))
  const firstAvg = values.slice(0, quarter).reduce((s, v) => s + v, 0) / quarter
  const lastAvg = values.slice(-quarter).reduce((s, v) => s + v, 0) / quarter
  const slopePercent = firstAvg !== 0 ? ((lastAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0

  // 이상치 (± 2σ)
  const upper = avg + 2 * stddev
  const lower = avg - 2 * stddev
  const outlierCount = values.filter((v) => v > upper || v < lower).length

  return {
    seriesId,
    count: n,
    avg,
    min,
    max,
    stddev,
    cv,
    slope,
    slopePerDay,
    slopePercent,
    firstAvg,
    lastAvg,
    outlierCount,
  }
}

// ── 인사이트 룰 적용 ──
export function generateInsights(
  statsList: SeriesStats[],
  labelMap: Record<string, string>, // seriesId → "CNC #3 · 진동"
): Insight[] {
  const insights: Insight[] = []

  for (const s of statsList) {
    const label = labelMap[s.seriesId] ?? s.seriesId

    // 1. 추세 분석 — slopePercent 기반
    const absChange = Math.abs(s.slopePercent)
    if (absChange >= 30) {
      insights.push({
        seriesId: s.seriesId,
        level: 'critical',
        metric: 'trend',
        title: '급격한 변화 감지',
        message: `${label}이(가) 기간 동안 평균 ${s.firstAvg.toFixed(2)} → ${s.lastAvg.toFixed(2)}로 ${s.slopePercent > 0 ? '+' : ''}${s.slopePercent.toFixed(1)}% 변화했습니다. 점검 권장.`,
      })
    } else if (absChange >= 15) {
      insights.push({
        seriesId: s.seriesId,
        level: 'warning',
        metric: 'trend',
        title: s.slopePercent > 0 ? '상승 추세' : '하락 추세',
        message: `${label}이(가) ${s.slopePercent > 0 ? '+' : ''}${s.slopePercent.toFixed(1)}% 변화 (${s.firstAvg.toFixed(2)} → ${s.lastAvg.toFixed(2)}). 추세 모니터링 필요.`,
      })
    }

    // 2. 변동성 — CV
    if (s.cv > 0.3 && s.avg > 0.5) {
      insights.push({
        seriesId: s.seriesId,
        level: 'warning',
        metric: 'volatility',
        title: '불안정한 가동',
        message: `${label}의 변동계수가 ${(s.cv * 100).toFixed(1)}%로 높습니다. 평균 ${s.avg.toFixed(2)}, 표준편차 ${s.stddev.toFixed(2)}.`,
      })
    }

    // 3. 이상치
    const outlierRate = s.count > 0 ? s.outlierCount / s.count : 0
    if (s.outlierCount >= 5 && outlierRate > 0.02) {
      insights.push({
        seriesId: s.seriesId,
        level: 'warning',
        metric: 'outlier',
        title: '이상치 빈발',
        message: `${label}에서 평균 ±2σ를 벗어난 데이터가 ${s.outlierCount}회 (${(outlierRate * 100).toFixed(1)}%) 발생했습니다.`,
      })
    }
  }

  // 4. 시리즈 간 비교 — 같은 메트릭끼리 평균 비교
  // seriesId 형식: "deviceCode::metric" → metric으로 그룹핑
  const byMetric = new Map<string, SeriesStats[]>()
  for (const s of statsList) {
    const metric = s.seriesId.split('::')[1] ?? 'unknown'
    if (!byMetric.has(metric)) byMetric.set(metric, [])
    byMetric.get(metric)!.push(s)
  }

  for (const [, group] of byMetric) {
    if (group.length < 2) continue
    const avgs = group.map((g) => g.avg)
    const groupMean = avgs.reduce((s, v) => s + v, 0) / avgs.length

    for (const g of group) {
      if (groupMean === 0) continue
      const ratio = g.avg / groupMean
      // 다른 설비 대비 1.5배 이상 높음
      if (ratio >= 1.4) {
        const label = labelMap[g.seriesId] ?? g.seriesId
        insights.push({
          seriesId: g.seriesId,
          level: 'warning',
          metric: 'comparison',
          title: '다른 설비 대비 높음',
          message: `${label}이(가) 같은 종류 설비 평균(${groupMean.toFixed(2)}) 대비 ${((ratio - 1) * 100).toFixed(0)}% 높습니다 (${g.avg.toFixed(2)}).`,
        })
      }
    }
  }

  return insights
}
