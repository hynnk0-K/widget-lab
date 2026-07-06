// src/pages/realtime/ehs-detail/index.tsx

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { fetchAllLatest, type EhsLatestRow } from '@/entities/ehs/api/ehsApi'
import { getCategoryConfig, calcRisk, RISK_COLOR_BG } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'
import { EhsSummaryCards } from './ui/EhsSummaryCards'
import { EhsDeviceDetailPanel } from './ui/EhsDeviceDetailPanel'

const POLL_INTERVAL_MS = 5000

export function EhsDetailPage() {
  const { category = '' } = useParams<{ category: string }>()

  const config = getCategoryConfig(category)
  const [rows, setRows] = useState<EhsLatestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedDeviceCode, setSelectedDeviceCode] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | EhsRiskLevel>('all')
  const [search, setSearch] = useState('')

  // 폴링
  useEffect(() => {
    if (!config) return
    let cancelled = false

    async function load() {
      try {
        const data = await fetchAllLatest(category)
        if (cancelled) return
        setRows(data)
        setError('')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [config, category])

  // 위험도 계산
  const rowsWithRisk = useMemo(() => {
    if (!config) return []
    return rows.map((r) => {
      const value = r[config.primaryMetric.key] as number | null
      const risk: EhsRiskLevel = value != null ? calcRisk(value, config.primaryMetric) : 'normal'
      return { row: r, value, risk }
    })
  }, [rows, config])

  // 요약
  const summary = useMemo(() => {
    const counts = { normal: 0, caution: 0, warning: 0, danger: 0 }
    rowsWithRisk.forEach((r) => {
      counts[r.risk]++
    })
    return counts
  }, [rowsWithRisk])

  // 필터링
  const filteredRows = useMemo(() => {
    let arr = rowsWithRisk
    if (filter !== 'all') arr = arr.filter((r) => r.risk === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter((r) => r.row.device_code.toLowerCase().includes(q))
    }
    // 위험도 높은 순으로 정렬
    const ORDER: EhsRiskLevel[] = ['danger', 'warning', 'caution', 'normal']
    return [...arr].sort((a, b) => ORDER.indexOf(a.risk) - ORDER.indexOf(b.risk))
  }, [rowsWithRisk, filter, search])

  if (!config) {
    return (
      <ManagementLayout section="realtime">
        <div className="p-8">
          <p className="text-red-600">알 수 없는 카테고리: {category}</p>
        </div>
      </ManagementLayout>
    )
  }

  const Icon = config.icon

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col h-full overflow-hidden">
        {/* 서브 헤더 */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2.5 flex-shrink-0">
          <Icon className="w-4 h-4" style={{ color: config.color }} />
          <span className="text-[13px] text-slate-500">
            {rows.length}대 관제 · 주요 지표 {config.primaryMetric.label}
          </span>
          {loading && <span className="ml-auto text-[11px] text-slate-400">불러오는 중...</span>}
        </div>

      {/* 본체 — 좌: 도면, 우: 리스트+상세 */}
      <div className="flex-1 grid grid-cols-[1fr_600px] gap-3 p-3 overflow-hidden">
        {/* 좌: 도면 — 추후 도면 연동 */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-[13px] text-slate-400">
          도면 준비 중
        </div>

        {/* 우: 요약 + 리스트 + 상세 */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* 요약 */}
          <EhsSummaryCards
            total={rows.length}
            summary={summary}
            filter={filter}
            onFilterChange={setFilter}
          />

          {/* 리스트 */}
          <div className="bg-white rounded-lg border border-slate-200 flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="설비 코드로 검색"
                className="flex-1 text-xs bg-transparent outline-none"
              />
              <span className="text-[11px] text-slate-400">{filteredRows.length}대</span>
            </div>

            <div className="flex-1 overflow-auto">
              {error && <div className="p-3 text-xs text-red-600">{error}</div>}
              {filteredRows.map(({ row, value, risk }) => (
                <button
                  key={row.device_code}
                  onClick={() => setSelectedDeviceCode(row.device_code)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 text-left',
                    selectedDeviceCode === row.device_code && 'bg-blue-50 hover:bg-blue-50',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', RISK_COLOR_BG[risk])} />
                  <span className="text-xs font-medium text-slate-700 flex-1">
                    {row.device_code}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {value != null ? value.toFixed(1) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 w-8">
                    {config.primaryMetric.unit}
                  </span>
                </button>
              ))}
              {filteredRows.length === 0 && !loading && !error && (
                <div className="p-6 text-center text-xs text-slate-400">조회 결과 없음</div>
              )}
            </div>
          </div>

          {/* 상세 */}
          {selectedDeviceCode && (
            <EhsDeviceDetailPanel
              category={category}
              deviceCode={selectedDeviceCode}
              config={config}
            />
          )}
        </div>
      </div>
      </div>
    </ManagementLayout>
  )
}
