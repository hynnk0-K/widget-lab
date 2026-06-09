import { api } from '@/shared/lib/api'

export interface TrendPoint {
  ts: string
  avg: number
  min: number
  max: number
  count: number
}

// deviceId 접두사로 API 경로 결정
function devicePath(deviceId: string): string {
  if (/^cnc/i.test(deviceId)) return 'cnc'
  if (/^cmp/i.test(deviceId)) return 'compressors'
  return 'sensors'
}

// snake_case → camelCase (metric 이름 변환)
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// API 응답 객체에서 metric 값 추출
function pickValue(data: Record<string, unknown>, metric: string): number | null {
  const key = toCamel(metric)
  const v = data[key]
  return typeof v === 'number' ? v : null
}

// gauge용: 최신값 1건
export async function fetchLatest(
  deviceId: string,
  metric: string,
): Promise<number | null> {
  try {
    const path = devicePath(deviceId)
    const data = await api.get<Record<string, unknown>>(
      `/${path}/latest?deviceId=${encodeURIComponent(deviceId)}`,
    )
    return pickValue(data, metric)
  } catch {
    return null
  }
}

// trend용: 집계 포인트 배열
export async function fetchTrend(
  deviceId: string,
  metric: string,
  hours: number,
  intervalMinutes: number,
): Promise<TrendPoint[]> {
  try {
    const path = devicePath(deviceId)
    const metricParam = path !== 'sensors' ? `&metric=${encodeURIComponent(metric)}` : ''
    return await api.get<TrendPoint[]>(
      `/${path}/trend?deviceId=${encodeURIComponent(deviceId)}&hours=${hours}&intervalMinutes=${intervalMinutes}${metricParam}`,
    )
  } catch {
    return []
  }
}
