import { api } from '@/shared/lib/api'
import type { EquipmentDto, EquipmentCreateRequest, EquipmentLive } from '../model/types'

export function listEquipments(lineId?: number) {
  return api.get<EquipmentDto[]>(`/master/equipments${lineId ? `?lineId=${lineId}` : ''}`)
}

export function getEquipment(id: number) {
  return api.get<EquipmentDto>(`/master/equipments/${id}`)
}

export function createEquipment(body: EquipmentCreateRequest) {
  return api.post<EquipmentDto>('/master/equipments', body)
}

export function updateEquipment(id: number, body: EquipmentCreateRequest) {
  return api.put<EquipmentDto>(`/master/equipments/${id}`, body)
}

export function deleteEquipment(id: number) {
  return api.delete(`/master/equipments/${id}`)
}

// RDB 마스터 + TDengine 실시간 연결 상태 통합 조회
export function listEquipmentLive(lineId?: number) {
  return api.get<EquipmentLive[]>(`/equipment-live${lineId ? `?lineId=${lineId}` : ''}`)
}
