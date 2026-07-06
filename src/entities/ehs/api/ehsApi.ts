import { api } from '@/shared/lib/api'

export interface EhsLatestRow {
  ts: string
  device_code: string
  [key: string]: any
}

export interface TrendPoint {
  ts: string
  avg: number | null
  min: number | null
  max: number | null
  count: number
}

export async function fetchAllLatest(category: string): Promise<EhsLatestRow[]> {
  return api.get<EhsLatestRow[]>(`/ts/ehs/${category}/all-latest`)
}

export async function fetchLatest(
  category: string,
  deviceId: string,
): Promise<EhsLatestRow | null> {
  try {
    return await api.get<EhsLatestRow>(`/ts/ehs/${category}/latest?deviceId=${deviceId}`)
  } catch {
    return null
  }
}

export async function fetchTrend(
  category: string,
  deviceId: string,
  metric: string,
  hours: number,
  intervalMinutes: number,
): Promise<TrendPoint[]> {
  const q = new URLSearchParams({
    deviceId,
    metric,
    hours: String(hours),
    intervalMinutes: String(intervalMinutes),
  })
  return api.get<TrendPoint[]>(`/ts/ehs/${category}/trend?${q.toString()}`)
}
