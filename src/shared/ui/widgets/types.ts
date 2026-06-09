export type WidgetType = 'gauge' | 'trend'

export interface WidgetSource {
  device: string
  metric: string
}

export interface GaugeConfig {
  min: number
  max: number
  warningAt: number
}

export interface TrendConfig {
  hours: number
  intervalMinutes: number
}

export interface Widget {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  title: string
  source: WidgetSource
  config: GaugeConfig | TrendConfig
}

export interface DashboardLayout {
  version: number
  widgets: Widget[]
}
