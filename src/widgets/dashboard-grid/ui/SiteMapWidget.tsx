import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteIsoMap, useSiteFactoryStatus } from '@/widgets/site-iso-map'
import { getSite } from '@/entities/site/api/siteApi'
import { listFactories } from '@/entities/factory/api/factoryApi'
import type { Site } from '@/entities/site/model/types'
import { FactoryMapWidget } from './FactoryMapWidget'
import type { Widget, SiteMapConfig } from '@/entities/widget/model/types'

export function SiteMapWidget({ widget }: { widget: Widget }) {
  const { siteId } = widget.config as SiteMapConfig
  const navigate = useNavigate()

  const [site, setSite] = useState<Site | null>(null)
  const [factories, setFactories] = useState<{ id: number; name: string }[]>([])
  const [loadError, setLoadError] = useState('')
  // 공장 클릭 시 위젯 안에서 공장 → 공정 → 라인 드릴다운
  const [drillFactoryId, setDrillFactoryId] = useState<number | null>(null)

  useEffect(() => {
    if (!siteId) return
    let active = true
    Promise.all([getSite(siteId), listFactories(siteId)])
      .then(([s, fs]) => {
        if (!active) return
        setSite(s)
        setFactories(fs)
      })
      .catch((e) => {
        if (active) setLoadError(e instanceof Error ? e.message : '불러오기 실패')
      })
    return () => {
      active = false
    }
  }, [siteId])

  const factoryIds = useMemo(() => factories.map((f) => f.id), [factories])
  const status = useSiteFactoryStatus(factoryIds)

  const error = !siteId ? '사업장 정보가 없습니다' : loadError
  const loading = !error && site === null

  if (loading || error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
          <span className="text-[12px] font-semibold text-slate-700">{widget.title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {error ? (
            <span className="text-[12px] text-red-400">{error}</span>
          ) : (
            <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    )
  }

  if (drillFactoryId != null) {
    return (
      <FactoryMapWidget
        widget={{ ...widget, config: { factoryId: drillFactoryId } }}
        onBack={() => setDrillFactoryId(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700 truncate">
          {site?.name ?? widget.title}
          <span className="ml-1.5 font-normal text-slate-400">공장 {factories.length}개</span>
        </span>
        <button
          onClick={() => navigate(`/system/site/${siteId}/map`)}
          className="text-[11px] text-slate-400 hover:text-[#003087] transition-colors flex-shrink-0"
        >
          전체보기 →
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <SiteIsoMap
          factories={factories.map((f) => ({
            id: f.id,
            name: f.name,
            deviceCount: status[f.id]?.deviceCount ?? 0,
            risk: status[f.id]?.risk ?? 'normal',
          }))}
          onFactoryClick={setDrillFactoryId}
        />
      </div>
    </div>
  )
}
