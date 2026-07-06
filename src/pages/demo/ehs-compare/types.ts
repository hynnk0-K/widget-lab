import type { LucideIcon } from 'lucide-react'
import {
  Wind,
  Droplet,
  Waves,
  Fuel,
  Thermometer,
  ShieldAlert,
  FlaskConical,
  Package,
  Flame,
  Activity,
} from 'lucide-react'

export type DbType = 'tdengine' | 'timescale'

export interface DeviceConfig {
  id: string
  displayName: string
}

export interface CategoryConfig {
  category: string
  koreanLabel: string
  icon: LucideIcon // ← emoji: string 대신 icon
  devices: DeviceConfig[]
  metric: {
    key: string
    label: string
    unit: string
  }
}

export function toTdengineId(id: string): string {
  return id.toLowerCase()
}

export function toTimescaleId(id: string): string {
  return id.toUpperCase()
}

export const CATEGORIES: CategoryConfig[] = [
  {
    category: 'airclean',
    koreanLabel: '대기방지설비',
    icon: Wind,
    devices: [
      { id: 'AIR_001', displayName: '#001' },
      { id: 'AIR_002', displayName: '#002' },
    ],
    metric: { key: 'differential_pressure', label: '차압', unit: 'mmH₂O' },
  },
  {
    category: 'drainage',
    koreanLabel: '배수로',
    icon: Droplet,
    devices: [
      { id: 'DRN_001', displayName: '#001' },
      { id: 'DRN_002', displayName: '#002' },
    ],
    metric: { key: 'water_level', label: '수위', unit: 'm' },
  },
  {
    category: 'sewage_tank',
    koreanLabel: '오수집수조',
    icon: Waves,
    devices: [
      { id: 'SEW_001', displayName: '#001' },
      { id: 'SEW_002', displayName: '#002' },
    ],
    metric: { key: 'water_level_pct', label: '수위', unit: '%' },
  },
  {
    category: 'cutting_oil',
    koreanLabel: '절삭유',
    icon: Fuel,
    devices: [
      { id: 'COL_001', displayName: '#001' },
      { id: 'COL_002', displayName: '#002' },
    ],
    metric: { key: 'temperature', label: '온도', unit: '°C' },
  },
  {
    category: 'wbgt',
    koreanLabel: '체감온도',
    icon: Thermometer,
    devices: [
      { id: 'WBGT_001', displayName: '#001' },
      { id: 'WBGT_002', displayName: '#002' },
    ],
    metric: { key: 'wbgt', label: 'WBGT', unit: '°C' },
  },
  {
    category: 'wastewater',
    koreanLabel: '폐수',
    icon: Waves,
    devices: [
      { id: 'WW_001', displayName: '#001' },
      { id: 'WW_002', displayName: '#002' },
    ],
    metric: { key: 'cod', label: 'COD', unit: 'mg/L' },
  },
  {
    category: 'waste_thinner',
    koreanLabel: '폐신나',
    icon: FlaskConical,
    devices: [
      { id: 'THN_001', displayName: '#001' },
      { id: 'THN_002', displayName: '#002' },
    ],
    metric: { key: 'voc_concentration', label: 'VOC', unit: 'ppm' },
  },
  {
    category: 'waste_cutting_oil',
    koreanLabel: '폐절삭유',
    icon: Package,
    devices: [
      { id: 'WCO_001', displayName: '#001' },
      { id: 'WCO_002', displayName: '#002' },
    ],
    metric: { key: 'storage_level_pct', label: '저장량', unit: '%' },
  },
  {
    category: 'lng_flow',
    koreanLabel: 'LNG유량계',
    icon: Flame,
    devices: [
      { id: 'LNG_001', displayName: '#001' },
      { id: 'LNG_002', displayName: '#002' },
    ],
    metric: { key: 'instant_flow', label: '순간유량', unit: 'Nm³/h' },
  },
  {
    category: 'seismic',
    koreanLabel: '지진계',
    icon: Activity,
    devices: [
      { id: 'SMC_001', displayName: '#001' },
      { id: 'SMC_002', displayName: '#002' },
    ],
    metric: { key: 'max_accel', label: '최대가속도', unit: 'gal' },
  },
]

export interface MeasurementResult {
  value: number | null
  timestamp: string | null
  responseMs: number
  lagMs: number | null
  error?: string
  fetchedAt: number
}

export interface CumulativeStats {
  callCount: number
  totalMs: number
  responseTimes: number[]
  errors: number
}

export interface TrendPoint {
  ts: string
  avg: number | null
  min: number | null
  max: number | null
  count: number
}

// 각 카테고리의 실제 데이터 보유 개월 수
export const CATEGORY_MAX_MONTHS: Record<string, number> = {
  airclean: 1, // 30일
  drainage: 1,
  sewage_tank: 1,
  cutting_oil: 1,
  wbgt: 12, // 1년 (백필 완료)
  wastewater: 1,
  waste_thinner: 1,
  waste_cutting_oil: 1,
  lng_flow: 12, // 1년 (백필 완료)
  seismic: 12, // 1년 (백필 완료)
}
