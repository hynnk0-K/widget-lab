import { api } from '@/shared/lib/api'
import type { Company, CompanyCreateRequest } from '../model/types'

export interface LayoutImageDto {
  id: number
  imageBase64: string | null
  width: number | null
  height: number | null
}

export function listCompanies() {
  return api.get<Company[]>('/master/companies')
}

export function getCompany(id: number) {
  return api.get<Company>(`/master/companies/${id}`)
}

export function createCompany(body: CompanyCreateRequest) {
  return api.post<Company>('/master/companies', body)
}

export function updateCompany(id: number, body: CompanyCreateRequest) {
  return api.put<Company>(`/master/companies/${id}`, body)
}

export function deleteCompany(id: number) {
  return api.delete(`/master/companies/${id}`)
}

export function getCompanyImage(id: number) {
  return api.get<LayoutImageDto>(`/master/companies/${id}/image`)
}

export function putCompanyImage(id: number, body: { imageBase64: string; width: number; height: number }) {
  return api.put<LayoutImageDto>(`/master/companies/${id}/image`, body)
}

export function deleteCompanyImage(id: number) {
  return api.delete(`/master/companies/${id}/image`)
}
