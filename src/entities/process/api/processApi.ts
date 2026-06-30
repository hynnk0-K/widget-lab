import { api } from '@/shared/lib/api'
import type { Process, ProcessCreateRequest } from '../model/types'

export interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

export function listProcesses(factoryId?: number) {
  return api.get<Process[]>(`/master/processes${factoryId ? `?factoryId=${factoryId}` : ''}`)
}

export function getProcess(id: number) {
  return api.get<Process>(`/master/processes/${id}`)
}

export function createProcess(body: ProcessCreateRequest) {
  return api.post<Process>('/master/processes', body)
}

export function updateProcess(id: number, body: ProcessCreateRequest) {
  return api.put<Process>(`/master/processes/${id}`, body)
}

export function deleteProcess(id: number) {
  return api.delete(`/master/processes/${id}`)
}

export function getProcessImage(id: number) {
  return api.get<LayoutImageDto>(`/master/processes/${id}/image`)
}

export function putProcessImage(id: number, body: { imageBase64: string; width: number; height: number }) {
  return api.put<LayoutImageDto>(`/master/processes/${id}/image`, body)
}

export function deleteProcessImage(id: number) {
  return api.delete(`/master/processes/${id}/image`)
}
