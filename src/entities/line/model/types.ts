export interface Line {
  id: number
  processId: number
  code: string
  name: string
  description: string | null
  position?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  hasImage?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LineCreateRequest {
  processId: number
  code: string
  name: string
  description: string
  position?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
}
