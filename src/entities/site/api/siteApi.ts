import { api } from '@/shared/lib/api'
import type { Site, SiteCreateRequest } from '../model/types'

export interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

export function listSites(companyId?: number) {
  return api.get<Site[]>(`/master/sites${companyId ? `?companyId=${companyId}` : ''}`)
}

export function getSite(id: number) {
  return api.get<Site>(`/master/sites/${id}`)
}

export function createSite(body: SiteCreateRequest) {
  return api.post<Site>('/master/sites', body)
}

export function updateSite(id: number, body: SiteCreateRequest) {
  return api.put<Site>(`/master/sites/${id}`, body)
}

export function deleteSite(id: number) {
  return api.delete(`/master/sites/${id}`)
}

export function getSiteImage(id: number) {
  return api.get<LayoutImageDto>(`/master/sites/${id}/image`)
}

export function putSiteImage(id: number, body: { imageBase64: string; width: number; height: number }) {
  return api.put<LayoutImageDto>(`/master/sites/${id}/image`, body)
}

export function deleteSiteImage(id: number) {
  return api.delete(`/master/sites/${id}/image`)
}
