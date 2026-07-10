import { fetchAllLatest } from '../api/ehsApi'
import { CATEGORIES, calcRisk } from './config'
import type { EhsRiskLevel } from './types'

// 환경 계열 EHS 카테고리 (안전/보건 계열 제외)
export const ENV_SLUGS = [
  'airclean',
  'drainage',
  'sewage_tank',
  'cutting_oil',
  'wastewater',
  'waste_thinner',
  'waste_cutting_oil',
  'lng_flow',
] as const

export type DeviceRisk = EhsRiskLevel | 'offline'

// 위험도 심각도 순위 — 집계 시 최악 등급 계산용
export const RISK_RANK: Record<DeviceRisk, number> = {
  normal: 0,
  offline: 1,
  caution: 2,
  warning: 3,
  danger: 4,
}

export const STALE_MS = 2 * 60_000 // 마지막 수신 2분 초과 시 통신단절 처리

export function fmtMetricValue(v: number, unit: string): string {
  const n = Number.isInteger(v) ? v.toLocaleString('ko-KR') : v.toFixed(1)
  return unit ? `${n} ${unit}` : String(n)
}

export interface EnvSensorMarker {
  label: string
  valueText: string
  risk: DeviceRisk
}

// 환경 카테고리 전체 최신값 → 도면 마커 맵 (deviceCode → 마커, deviceCode → 카테고리 slug)
export async function fetchEnvSensorMarkers(): Promise<{
  markers: Record<string, EnvSensorMarker>
  slugByDevice: Record<string, string>
}> {
  const results = await Promise.allSettled(
    ENV_SLUGS.map((slug) => fetchAllLatest(slug).then((rows) => ({ slug, rows }))),
  )
  const markers: Record<string, EnvSensorMarker> = {}
  const slugByDevice: Record<string, string> = {}
  const now = Date.now()

  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const cfg = CATEGORIES[r.value.slug]
    for (const row of r.value.rows) {
      const raw = row[cfg.primaryMetric.key]
      const value = typeof raw === 'number' ? raw : null
      const stale = now - new Date(row.ts).getTime() > STALE_MS
      const risk: DeviceRisk =
        stale || value == null ? 'offline' : calcRisk(value, cfg.primaryMetric)
      markers[row.device_code] = {
        label: `${cfg.koreanLabel} ${row.device_code}`,
        valueText: value != null ? fmtMetricValue(value, cfg.primaryMetric.unit) : '—',
        risk,
      }
      slugByDevice[row.device_code] = r.value.slug
    }
  }
  return { markers, slugByDevice }
}
