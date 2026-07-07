import {
  Wind,
  Droplet,
  Waves,
  Fuel,
  Thermometer,
  FlaskConical,
  Package,
  Flame,
  Activity,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import type { EhsRiskLevel, MetricSpec, EhsCategoryConfig } from './types'

export const RISK_LABEL: Record<EhsRiskLevel, string> = {
  normal: '정상',
  caution: '관심',
  warning: '경고',
  danger: '위험',
}

export const RISK_COLOR_BG: Record<EhsRiskLevel, string> = {
  normal: 'bg-emerald-500',
  caution: 'bg-amber-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-600',
}

export const RISK_COLOR_TEXT: Record<EhsRiskLevel, string> = {
  normal: 'text-emerald-700',
  caution: 'text-amber-700',
  warning: 'text-orange-700',
  danger: 'text-red-700',
}

export function calcRisk(value: number, spec: MetricSpec): EhsRiskLevel {
  const { thresholds } = spec
  if (thresholds.reversed) {
    if (thresholds.danger !== undefined && value <= thresholds.danger) return 'danger'
    if (thresholds.warning !== undefined && value <= thresholds.warning) return 'warning'
    if (thresholds.caution !== undefined && value <= thresholds.caution) return 'caution'
    return 'normal'
  }
  if (thresholds.danger !== undefined && value >= thresholds.danger) return 'danger'
  if (thresholds.warning !== undefined && value >= thresholds.warning) return 'warning'
  if (thresholds.caution !== undefined && value >= thresholds.caution) return 'caution'
  return 'normal'
}

export const CATEGORIES: Record<string, EhsCategoryConfig> = {
  wbgt: {
    slug: 'wbgt',
    koreanLabel: '체감온도',
    icon: Thermometer,
    color: '#e63312',
    primaryMetric: {
      key: 'wbgt',
      label: 'WBGT',
      unit: '°C',
      thresholds: { caution: 31, warning: 33, danger: 35 },
    },
    detailMetrics: [
      {
        key: 'wbgt',
        label: 'WBGT',
        unit: '°C',
        thresholds: { caution: 31, warning: 33, danger: 35 },
      },
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 30, warning: 33, danger: 35 },
      },
      {
        key: 'humidity',
        label: '습도',
        unit: '%',
        thresholds: { caution: 65, warning: 75, danger: 85 },
      },
      {
        key: 'apparent_temp',
        label: '체감온도',
        unit: '°C',
        thresholds: { caution: 32, warning: 38, danger: 41 },
      },
      {
        key: 'heat_index',
        label: '열지수',
        unit: '',
        thresholds: { caution: 32, warning: 40, danger: 50 },
      },
    ],
  },
  airclean: {
    slug: 'airclean',
    koreanLabel: '대기방지설비',
    icon: Wind,
    color: '#00aad2',
    primaryMetric: {
      key: 'differential_pressure',
      label: '차압',
      unit: 'mmH₂O',
      thresholds: { caution: 200, warning: 300, danger: 400 },
    },
    detailMetrics: [
      {
        key: 'differential_pressure',
        label: '차압',
        unit: 'mmH₂O',
        thresholds: { caution: 200, warning: 300, danger: 400 },
      },
      {
        key: 'intake_flow',
        label: '흡입풍량',
        unit: 'm³/h',
        thresholds: { caution: 800, warning: 500, danger: 300, reversed: true },
      },
      {
        key: 'treatment_efficiency',
        label: '처리효율',
        unit: '%',
        thresholds: { caution: 85, warning: 70, danger: 60, reversed: true },
      },
      {
        key: 'filter_wear',
        label: '필터마모도',
        unit: '%',
        thresholds: { caution: 50, warning: 80, danger: 90 },
      },
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 50, warning: 65, danger: 75 },
      },
    ],
  },
  drainage: {
    slug: 'drainage',
    koreanLabel: '배수로',
    icon: Droplet,
    color: '#0ea5e9',
    primaryMetric: {
      key: 'water_level',
      label: '수위',
      unit: 'm',
      thresholds: { caution: 1.2, warning: 1.8, danger: 2.2 },
    },
    detailMetrics: [
      {
        key: 'water_level',
        label: '수위',
        unit: 'm',
        thresholds: { caution: 1.2, warning: 1.8, danger: 2.2 },
      },
      {
        key: 'flow_rate',
        label: '유량',
        unit: 'm³/h',
        thresholds: { caution: 40, warning: 60, danger: 80 },
      },
      {
        key: 'turbidity',
        label: '탁도',
        unit: 'NTU',
        thresholds: { caution: 30, warning: 80, danger: 120 },
      },
      {
        key: 'cod',
        label: 'COD',
        unit: 'mg/L',
        thresholds: { caution: 40, warning: 80, danger: 130 },
      },
      {
        key: 'ph',
        label: 'pH',
        unit: '',
        thresholds: { caution: 6.5, warning: 6.0, danger: 5.5, reversed: true },
      },
    ],
  },
  sewage_tank: {
    slug: 'sewage_tank',
    koreanLabel: '오수집수조',
    icon: Waves,
    color: '#0891b2',
    primaryMetric: {
      key: 'water_level_pct',
      label: '수위',
      unit: '%',
      thresholds: { caution: 75, warning: 85, danger: 95 },
    },
    detailMetrics: [
      {
        key: 'water_level_pct',
        label: '수위',
        unit: '%',
        thresholds: { caution: 75, warning: 85, danger: 95 },
      },
      {
        key: 'inflow',
        label: '유입유량',
        unit: 'm³/h',
        thresholds: { caution: 20, warning: 35, danger: 50 },
      },
      {
        key: 'outflow',
        label: '배출유량',
        unit: 'm³/h',
        thresholds: { caution: 5, warning: 3, danger: 1, reversed: true },
      },
      {
        key: 'ph',
        label: 'pH',
        unit: '',
        thresholds: { caution: 6.5, warning: 6.0, danger: 5.5, reversed: true },
      },
      {
        key: 'cod',
        label: 'COD',
        unit: 'mg/L',
        thresholds: { caution: 80, warning: 150, danger: 250 },
      },
    ],
  },
  cutting_oil: {
    slug: 'cutting_oil',
    koreanLabel: '절삭유',
    icon: Fuel,
    color: '#eab308',
    primaryMetric: {
      key: 'temperature',
      label: '온도',
      unit: '°C',
      thresholds: { caution: 40, warning: 50, danger: 60 },
    },
    detailMetrics: [
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 40, warning: 50, danger: 60 },
      },
      {
        key: 'ph',
        label: 'pH',
        unit: '',
        thresholds: { caution: 8.5, warning: 7.5, danger: 6.5, reversed: true },
      },
      {
        key: 'concentration',
        label: '농도',
        unit: '%',
        thresholds: { caution: 5, warning: 3, danger: 1, reversed: true },
      },
      {
        key: 'remaining_pct',
        label: '잔량',
        unit: '%',
        thresholds: { caution: 40, warning: 20, danger: 10, reversed: true },
      },
      {
        key: 'contamination',
        label: '오염도',
        unit: 'NTU',
        thresholds: { caution: 30, warning: 60, danger: 90 },
      },
    ],
  },
  wastewater: {
    slug: 'wastewater',
    koreanLabel: '폐수',
    icon: Waves,
    color: '#059669',
    primaryMetric: {
      key: 'cod',
      label: 'COD',
      unit: 'mg/L',
      thresholds: { caution: 70, warning: 100, danger: 180 },
    },
    detailMetrics: [
      {
        key: 'cod',
        label: 'COD',
        unit: 'mg/L',
        thresholds: { caution: 70, warning: 100, danger: 180 },
      },
      {
        key: 'bod',
        label: 'BOD',
        unit: 'mg/L',
        thresholds: { caution: 30, warning: 50, danger: 90 },
      },
      {
        key: 'ss',
        label: 'SS',
        unit: 'mg/L',
        thresholds: { caution: 60, warning: 100, danger: 180 },
      },
      {
        key: 'ph',
        label: 'pH',
        unit: '',
        thresholds: { caution: 6.5, warning: 6.0, danger: 5.5, reversed: true },
      },
      {
        key: 'flow_rate',
        label: '유량',
        unit: 'm³/h',
        thresholds: { caution: 30, warning: 50, danger: 75 },
      },
    ],
  },
  waste_thinner: {
    slug: 'waste_thinner',
    koreanLabel: '폐신나',
    icon: FlaskConical,
    color: '#7c3aed',
    primaryMetric: {
      key: 'voc_concentration',
      label: 'VOC',
      unit: 'ppm',
      thresholds: { caution: 100, warning: 200, danger: 400 },
    },
    detailMetrics: [
      {
        key: 'voc_concentration',
        label: 'VOC',
        unit: 'ppm',
        thresholds: { caution: 100, warning: 200, danger: 400 },
      },
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 30, warning: 40, danger: 50 },
      },
      {
        key: 'storage_level',
        label: '저장량',
        unit: 'L',
        thresholds: { caution: 850, warning: 950, danger: 990 },
      },
    ],
  },
  waste_cutting_oil: {
    slug: 'waste_cutting_oil',
    koreanLabel: '폐절삭유',
    icon: Package,
    color: '#a855f7',
    primaryMetric: {
      key: 'storage_level_pct',
      label: '저장량',
      unit: '%',
      thresholds: { caution: 70, warning: 90, danger: 98 },
    },
    detailMetrics: [
      {
        key: 'storage_level_pct',
        label: '저장량',
        unit: '%',
        thresholds: { caution: 70, warning: 90, danger: 98 },
      },
      {
        key: 'ph',
        label: 'pH',
        unit: '',
        thresholds: { caution: 8.0, warning: 7.0, danger: 6.0, reversed: true },
      },
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 35, warning: 45, danger: 55 },
      },
      {
        key: 'contamination',
        label: '오염도',
        unit: 'NTU',
        thresholds: { caution: 40, warning: 70, danger: 90 },
      },
    ],
  },
  lng_flow: {
    slug: 'lng_flow',
    koreanLabel: 'LNG유량계',
    icon: Flame,
    color: '#dc2626',
    primaryMetric: {
      key: 'instant_flow',
      label: '순간유량',
      unit: 'Nm³/h',
      thresholds: { caution: 800, warning: 950, danger: 1000 },
    },
    detailMetrics: [
      {
        key: 'instant_flow',
        label: '순간유량',
        unit: 'Nm³/h',
        thresholds: { caution: 800, warning: 950, danger: 1000 },
      },
      {
        key: 'pressure',
        label: '압력',
        unit: 'bar',
        thresholds: { caution: 3, warning: 2, danger: 1, reversed: true },
      },
      {
        key: 'temperature',
        label: '온도',
        unit: '°C',
        thresholds: { caution: 15, warning: 25, danger: 40 },
      },
      { key: 'cumulative_flow', label: '적산유량', unit: 'Nm³', thresholds: {} },
    ],
  },
  seismic: {
    slug: 'seismic',
    koreanLabel: '지진계',
    icon: Activity,
    color: '#78350f',
    primaryMetric: {
      key: 'max_accel',
      label: '최대가속도',
      unit: 'gal',
      thresholds: { caution: 3, warning: 15, danger: 50 },
    },
    detailMetrics: [
      {
        key: 'max_accel',
        label: '최대가속도',
        unit: 'gal',
        thresholds: { caution: 3, warning: 15, danger: 50 },
      },
      {
        key: 'accel_x',
        label: 'X축',
        unit: 'gal',
        thresholds: { caution: 2, warning: 10, danger: 30 },
      },
      {
        key: 'accel_y',
        label: 'Y축',
        unit: 'gal',
        thresholds: { caution: 2, warning: 10, danger: 30 },
      },
      {
        key: 'accel_z',
        label: 'Z축',
        unit: 'gal',
        thresholds: { caution: 2, warning: 10, danger: 30 },
      },
      {
        key: 'intensity',
        label: '진도',
        unit: '',
        thresholds: { caution: 2, warning: 3, danger: 4 },
      },
    ],
  },
  confined_gas: {
    slug: 'confined_gas',
    koreanLabel: '밀폐공간 유해가스',
    icon: ShieldAlert,
    color: '#dc2626',
    primaryMetric: {
      key: 'o2',
      label: '산소농도',
      unit: '%',
      thresholds: { caution: 19.5, warning: 18, danger: 16, reversed: true },
    },
    detailMetrics: [
      {
        key: 'o2',
        label: '산소농도',
        unit: '%',
        thresholds: { caution: 19.5, warning: 18, danger: 16, reversed: true },
      },
      {
        key: 'co',
        label: '일산화탄소',
        unit: 'ppm',
        thresholds: { caution: 25, warning: 50, danger: 200 },
      },
      {
        key: 'h2s',
        label: '황화수소',
        unit: 'ppm',
        thresholds: { caution: 1, warning: 5, danger: 10 },
      },
      {
        key: 'lel',
        label: '폭발하한계',
        unit: '%',
        thresholds: { caution: 10, warning: 25, danger: 50 },
      },
    ],
  },
  motion: {
    slug: 'motion',
    koreanLabel: '이동형 모션센서',
    icon: Zap,
    color: '#7c3aed',
    primaryMetric: {
      key: 'fall_detected',
      label: '낙상감지',
      unit: '',
      thresholds: { danger: 1 },
    },
    detailMetrics: [
      { key: 'fall_detected', label: '낙상감지', unit: '', thresholds: { danger: 1 } },
      {
        key: 'accel_x',
        label: 'X축 가속도',
        unit: 'm/s²',
        thresholds: { caution: 5, warning: 10, danger: 20 },
      },
      {
        key: 'accel_y',
        label: 'Y축 가속도',
        unit: 'm/s²',
        thresholds: { caution: 5, warning: 10, danger: 20 },
      },
      {
        key: 'accel_z',
        label: 'Z축 가속도',
        unit: 'm/s²',
        thresholds: { caution: 5, warning: 10, danger: 20 },
      },
      {
        key: 'battery_level',
        label: '배터리',
        unit: '%',
        thresholds: { caution: 50, warning: 20, danger: 10, reversed: true },
      },
    ],
  },
}

export function getCategoryConfig(slug: string): EhsCategoryConfig | null {
  return CATEGORIES[slug] ?? null
}
