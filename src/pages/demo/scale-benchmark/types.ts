export type DbType = 'tdengine' | 'timescale'

export interface MeasurementSample {
  timestamp: number
  responseMs: number
  hasError: boolean
  dataSize?: number
}

export interface ScenarioMetrics {
  callCount: number
  totalMs: number
  errors: number
  samples: number[] // 최근 200개
  lastResponseMs: number | null
  lastMeasuredAt: number | null // Date.now()
}

export const EMPTY_METRICS: ScenarioMetrics = {
  callCount: 0,
  totalMs: 0,
  errors: 0,
  samples: [],
  lastResponseMs: null,
  lastMeasuredAt: null,
}
