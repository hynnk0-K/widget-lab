import { api } from '@/shared/lib/api'
import type { Alarm, AlarmSummary } from '../model/types'

// ── 백엔드 DTO 타입 (Java record와 매핑) ──
interface AlarmSummaryResponse {
  total: number
  critical: number
  warning: number
  info: number
  active: number
  acknowledged: number
  inProgress: number
  resolved: number
}

export async function fetchAlarms(params?: {
  status?: string
  severity?: string
  limit?: number
}): Promise<Alarm[]> {
  const search = new URLSearchParams()
  if (params?.status) search.append('status', params.status)
  if (params?.severity) search.append('severity', params.severity)
  if (params?.limit) search.append('limit', String(params.limit))
  const query = search.toString()
  return api.get<Alarm[]>(`/alarms${query ? `?${query}` : ''}`)
}

export async function fetchAlarm(alarmId: number): Promise<Alarm> {
  return api.get<Alarm>(`/alarms/${alarmId}`)
}

export async function fetchAlarmSummary(): Promise<AlarmSummary> {
  const data = await api.get<AlarmSummaryResponse>('/alarms/summary')
  return {
    total: data.total,
    critical: data.critical,
    warning: data.warning,
    info: data.info,
    acknowledged: data.acknowledged,
    inProgress: data.inProgress,
  }
}
