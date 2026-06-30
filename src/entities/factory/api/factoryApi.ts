import { api } from '@/shared/lib/api'
import type { Factory, FactoryCreateRequest } from '../model/types'

export interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

export function listFactories(siteId?: number) {
  return api.get<Factory[]>(`/master/factories${siteId ? `?siteId=${siteId}` : ''}`)
}

export function getFactory(id: number) {
  return api.get<Factory>(`/master/factories/${id}`)
}

export function createFactory(body: FactoryCreateRequest) {
  return api.post<Factory>('/master/factories', body)
}

export function updateFactory(id: number, body: FactoryCreateRequest) {
  return api.put<Factory>(`/master/factories/${id}`, body)
}

export function deleteFactory(id: number) {
  return api.delete(`/master/factories/${id}`)
}

export function getFactoryImage(id: number) {
  return api.get<LayoutImageDto>(`/master/factories/${id}/image`)
}

export function putFactoryImage(id: number, body: { imageBase64: string; width: number; height: number }) {
  return api.put<LayoutImageDto>(`/master/factories/${id}/image`, body)
}

export function deleteFactoryImage(id: number) {
  return api.delete(`/master/factories/${id}/image`)
}
