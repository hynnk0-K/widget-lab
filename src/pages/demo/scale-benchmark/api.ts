import type { DbType } from './types'

interface TimedResult {
  responseMs: number
  hasError: boolean
  dataSize: number
}

async function timedFetch(url: string): Promise<TimedResult> {
  const start = performance.now()
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`http://localhost:8080${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) {
      return { responseMs: performance.now() - start, hasError: true, dataSize: 0 }
    }
    const text = await res.text()
    return {
      responseMs: performance.now() - start,
      hasError: false,
      dataSize: text.length,
    }
  } catch (err) {
    return { responseMs: performance.now() - start, hasError: true, dataSize: 0 }
  }
}

// 시나리오 1: 카테고리 전체 최근값 (200대 wbgt)
export async function fetchAllLatest(db: DbType, category: string) {
  const prefix = db === 'tdengine' ? '/api/ehs' : '/api/ts/ehs'
  return timedFetch(`${prefix}/${category}/all-latest`)
}

// 시나리오 2: 카테고리 집계 (GROUP BY)
export async function fetchAggregate(db: DbType, category: string, metric: string, hours: number) {
  const prefix = db === 'tdengine' ? '/api/ehs' : '/api/ts/ehs'
  return timedFetch(`${prefix}/${category}/aggregate?metric=${metric}&hours=${hours}`)
}

// 시나리오 3: 병렬 폴링 (100대)
// TDengine은 소문자, TimescaleDB는 대문자
export async function runParallelPoll(
  db: DbType,
  count: number,
): Promise<{ totalMs: number; avgMs: number; times: number[]; errors: number }> {
  const prefix = db === 'tdengine' ? '/api/ehs' : '/api/ts/ehs'
  const isCased = db === 'timescale'
  const ids = Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(3, '0')
    return isCased ? `WBGT_${num}` : `wbgt_${num}`
  })

  const overallStart = performance.now()
  const results = await Promise.allSettled(
    ids.map((id) => timedFetch(`${prefix}/wbgt/latest?deviceId=${id}`)),
  )
  const overallMs = performance.now() - overallStart

  const times: number[] = []
  let errors = 0
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      times.push(r.value.responseMs)
      if (r.value.hasError) errors++
    } else {
      errors++
    }
  })

  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

  return { totalMs: overallMs, avgMs: avg, times, errors }
}
