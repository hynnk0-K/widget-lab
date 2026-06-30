import { api } from '@/shared/lib/api'
import type { Alarm } from '@/entities/alarm/model/types'

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
