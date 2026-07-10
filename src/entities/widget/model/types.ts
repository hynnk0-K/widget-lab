export type WidgetType =
  | 'gauge'
  | 'trend'
  | 'stat'
  | 'status'
  | 'counter'
  | 'minibar'
  | 'heatmap'
  | 'summary'
  | 'alarm-feed'
  | 'factory-map'
  | 'line-map'
  | 'site-map'

export interface WidgetSource {
  device: string
  metric: string
}

// ── 기존 ──
export interface GaugeConfig {
  min: number
  max: number
  warningAt: number
}

export interface TrendConfig {
  hours: number
  intervalMinutes: number
}

// StatCard — 큰 숫자 + 기간 평균 대비 추이
export interface StatConfig {
  decimals?: number // 소수점 자릿수 (기본 1)
  unit?: string // 단위 표시 ("kW", "%" 등)
  trendHours?: number // 추이 비교 기간 (기본 24)
}

// StatusBadge — run_state 같은 정수 → 색깔 박스
export interface StatusConfig {
  // 각 값별 라벨·색
  states: Record<number, { label: string; color: 'green' | 'yellow' | 'red' | 'gray' }>
}

// CounterCard — 두 카운터를 같이 (good_count + reject_count)
export interface CounterConfig {
  secondaryMetric: string // 두 번째 메트릭 (보통 reject_count)
  primaryLabel?: string // 주 카운터 라벨 (기본 "양품")
  secondaryLabel?: string // 부 카운터 라벨 (기본 "불량")
}

export interface MiniBarConfig {
  hours: number // 보여줄 기간 (기본 24)
  intervalMinutes: number // 막대 하나 = 몇 분치 (기본 60)
}

export interface HeatMapConfig {
  days?: number
}

export type SummaryKind = 'total' | 'active' | 'inactive' | 'alarm' | 'comm-fault'

export interface SummaryConfig {
  kind: SummaryKind
}

export interface AlarmFeedConfig {
  maxItems?: number
  severity?: 'critical' | 'warning' | 'info' | 'all'
}

export interface FactoryMapConfig {
  factoryId: number
}

export interface LineMapConfig {
  lineId: number
}

export interface SiteMapConfig {
  siteId: number
}

// ── 위젯 본체 ──
export interface Widget {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  title: string
  source: WidgetSource
  config:
    | GaugeConfig
    | TrendConfig
    | StatConfig
    | StatusConfig
    | CounterConfig
    | MiniBarConfig
    | HeatMapConfig
    | SummaryConfig
    | AlarmFeedConfig
    | FactoryMapConfig
    | LineMapConfig
    | SiteMapConfig
}

export interface DashboardLayout {
  version: number
  widgets: Widget[]
}
