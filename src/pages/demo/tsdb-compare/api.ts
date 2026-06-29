import type { DbType, MetricConfig, MeasurementResult, TrendPoint } from './types'

// 시간 측정해서 API 호출
async function timedFetch(url: string): Promise<{
  data: any
  responseMs: number
  error?: string
}> {
  const start = performance.now()
  try {
    // api 라이브러리 직접 안 쓰고 fetch — 시간 측정을 위해
    // 인증 토큰은 localStorage에서 가져와 헤더 추가
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`http://localhost:8080${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    const responseMs = performance.now() - start
    if (!res.ok) {
      return { data: null, responseMs, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    // 응답 시간은 JSON 파싱 후가 더 정확 — 다시 측정
    const totalMs = performance.now() - start
    return { data, responseMs: totalMs }
  } catch (err) {
    return {
      data: null,
      responseMs: performance.now() - start,
      error: err instanceof Error ? err.message : '네트워크 에러',
    }
  }
}

// 단일값 — latest
export async function fetchLatest(db: DbType, config: MetricConfig): Promise<MeasurementResult> {
  const prefix = db === 'tdengine' ? '/api' : '/api/ts'
  const path = config.deviceType === 'cnc' ? '/cnc/latest' : '/compressors/latest'
  const url = `${prefix}${path}?deviceId=${config.deviceCode}`

  const { data, responseMs, error } = await timedFetch(url)
  const fetchedAt = Date.now()

  if (error || !data) {
    return {
      value: null,
      timestamp: null,
      responseMs,
      lagMs: null,
      error,
      fetchedAt,
    }
  }

  // camelCase 변환된 메트릭 키
  const camelKey = config.metric.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  const value = data[camelKey]
  const timestamp = data.ts
  const lagMs = timestamp ? fetchedAt - new Date(timestamp).getTime() : null

  return {
    value: typeof value === 'number' ? value : null,
    timestamp,
    responseMs,
    lagMs,
    fetchedAt,
  }
}

export async function fetchTrend(
  db: DbType,
  config: MetricConfig,
  hours: number = 1,
  intervalMinutes: number = 1,
): Promise<{ data: TrendPoint[]; responseMs: number; error?: string }> {
  const prefix = db === 'tdengine' ? '/api' : '/api/ts'
  const path = config.deviceType === 'cnc' ? '/cnc/trend' : '/compressors/trend'
  const url = `${prefix}${path}?deviceId=${config.deviceCode}&metric=${config.metric}&hours=${hours}&intervalMinutes=${intervalMinutes}`

  const { data, responseMs, error } = await timedFetch(url)

  return {
    data: Array.isArray(data) ? data : [],
    responseMs,
    error,
  }
}
