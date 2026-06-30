export interface Site {
  id: number
  companyId: number
  code: string
  name: string
  address: string | null
  // ponytail: 백엔드 SiteDto/SiteCreateRequest엔 description 필드가 없어 항상 비어있음(기존 폼 동작 그대로 유지,
  // 고치려면 백엔드에 description 컬럼 추가하거나 프론트 폼을 address로 바꿀 것).
  description?: string
  createdAt?: string
}

export interface SiteCreateRequest {
  companyId: number
  code: string
  name: string
  description: string
}
