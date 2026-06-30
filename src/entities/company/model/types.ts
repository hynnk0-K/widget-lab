export interface Company {
  id: number
  code: string
  name: string
  description: string | null
  createdAt?: string
}

export interface CompanyCreateRequest {
  code: string
  name: string
  description: string
}
