export interface EquipmentDto {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  model?: string | null
  manufacturer?: string | null
  installedAt?: string | null
  position: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface EquipmentCreateRequest {
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  model?: string | null
  manufacturer?: string | null
  installedAt?: string | null
  position?: string | null
  isActive?: boolean
}

// RDB 마스터 + TDengine 데이터 존재 여부 (실시간 연결 상태)
export interface EquipmentLive {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string
  isActive: boolean
  hasData: boolean
  lastDataAt: string | null
}
