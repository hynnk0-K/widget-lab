export interface CollectionSensorRow {
  id: number
  code: string
  name: string
  sensor_type?: string
  unit?: string
  signal_type?: string
  parent_type?: string
  parent_id?: number
  interval_sec?: number
  normal_min?: number
  normal_max?: number
  warning_min?: number
  warning_max?: number
  critical_min?: number
  critical_max?: number
  reversed?: boolean
  description?: string
  is_active?: boolean
}

export interface NamedEntity {
  id: number
  name: string
}
