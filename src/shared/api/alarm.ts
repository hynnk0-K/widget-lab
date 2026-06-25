import { api } from '@/shared/lib/api'
import type { Alarm, AlarmSummary } from '@/pages/situation/alarm/types'

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

// ── 조회 ──

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

// ── 처리 ──

export async function acknowledgeAlarm(alarmId: number, acknowledgedBy: string): Promise<Alarm> {
  return api.post<Alarm>(`/alarms/${alarmId}/acknowledge`, {
    acknowledgedBy,
  })
}

export async function startAlarm(
  alarmId: number,
  startedBy: string,
  note?: string,
): Promise<Alarm> {
  return api.post<Alarm>(`/alarms/${alarmId}/start`, {
    startedBy,
    note,
  })
}

export async function resolveAlarm(
  alarmId: number,
  resolvedBy: string,
  note?: string,
): Promise<Alarm> {
  return api.post<Alarm>(`/alarms/${alarmId}/resolve`, {
    resolvedBy,
    note,
  })
}
