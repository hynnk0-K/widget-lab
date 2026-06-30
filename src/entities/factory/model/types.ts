export interface Factory {
  id: number
  siteId: number
  code: string
  name: string
  description: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  hasImage?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FactoryCreateRequest {
  siteId: number
  code: string
  name: string
  description: string
}
