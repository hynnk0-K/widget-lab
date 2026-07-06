import type { LucideIcon } from 'lucide-react'

export type EhsRiskLevel = 'normal' | 'caution' | 'warning' | 'danger'

export interface MetricSpec {
  key: string
  label: string
  unit: string
  thresholds: {
    caution?: number
    warning?: number
    danger?: number
    reversed?: boolean
  }
}

export interface EhsCategoryConfig {
  slug: string
  koreanLabel: string
  icon: LucideIcon
  color: string
  primaryMetric: MetricSpec
  detailMetrics: MetricSpec[]
}
