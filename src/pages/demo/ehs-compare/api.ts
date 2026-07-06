import type { DbType, MeasurementResult, TrendPoint } from './types'
import { toTdengineId, toTimescaleId } from './types'

async function timedFetch(url: string): Promise<{
  data: any
  responseMs: number
  error?: string
}> {
  const start = performance.now()
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`http://localhost:8080${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) {
      return {
        data: null,
        responseMs: performance.now() - start,
        error: `HTTP ${res.status}`,
      }
    }
    const data = await res.json()
    return { data, responseMs: performance.now() - start }
  } catch (err) {
    return {
      data: null,
      responseMs: performance.now() - start,
      error: err instanceof Error ? err.message : '네트워크 에러',
    }
  }
}

// EHS 카테고리별 latest 조회 (자동 대소문자 변환)
export async function fetchEhsLatest(
  db: DbType,
  category: string,
  deviceId: string,
  metricKey: string,
): Promise<MeasurementResult> {
  // DB에 맞게 ID 변환
  const actualId = db === 'tdengine' ? toTdengineId(deviceId) : toTimescaleId(deviceId)
  const prefix = db === 'tdengine' ? '/api/ehs' : '/api/ts/ehs'
  const url = `${prefix}/${category}/latest?deviceId=${actualId}`

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

  const value = data[metricKey]
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

// 트렌드 차트용
export async function fetchEhsTrend(
  db: DbType,
  category: string,
  deviceId: string,
  metric: string,
  hours: number,
  intervalMinutes: number,
): Promise<{ data: TrendPoint[]; responseMs: number; error?: string }> {
  const actualId = db === 'tdengine' ? toTdengineId(deviceId) : toTimescaleId(deviceId)
  const prefix = db === 'tdengine' ? '/api/ehs' : '/api/ts/ehs'
  const url = `${prefix}/${category}/trend?deviceId=${actualId}&metric=${metric}&hours=${hours}&intervalMinutes=${intervalMinutes}`

  const { data, responseMs, error } = await timedFetch(url)
  return {
    data: Array.isArray(data) ? data : [],
    responseMs,
    error,
  }
}
