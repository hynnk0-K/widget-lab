import { api } from '@/shared/lib/api'
import type { Line, LineCreateRequest } from '../model/types'

export interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

export function listLines(processId?: number) {
  return api.get<Line[]>(`/master/lines${processId ? `?processId=${processId}` : ''}`)
}

export function getLine(id: number) {
  return api.get<Line>(`/master/lines/${id}`)
}

export function createLine(body: LineCreateRequest) {
  return api.post<Line>('/master/lines', body)
}

export function updateLine(id: number, body: LineCreateRequest) {
  return api.put<Line>(`/master/lines/${id}`, body)
}

export function deleteLine(id: number) {
  return api.delete(`/master/lines/${id}`)
}

export function getLineImage(id: number) {
  return api.get<LayoutImageDto>(`/master/lines/${id}/image`)
}

export function putLineImage(id: number, body: { imageBase64: string; width: number; height: number }) {
  return api.put<LayoutImageDto>(`/master/lines/${id}/image`, body)
}

export function deleteLineImage(id: number) {
  return api.delete(`/master/lines/${id}/image`)
}
