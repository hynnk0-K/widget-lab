import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagramMap } from '@/widgets/diagram-map'
import { getLine, getLineImage } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'
import { fetchEnvSensorMarkers } from '@/entities/ehs/model/envSensors'
import type { EnvSensorMarker } from '@/entities/ehs/model/envSensors'
import { loadDiagram } from '@/shared/lib/diagramStorage'
import type { DiagramNode, DiagramEdge } from '@/shared/lib/diagramStorage'
import type { Widget, LineMapConfig } from '@/entities/widget/model/types'

const POLL_MS = 10_000

export function LineMapWidget({ widget }: { widget: Widget }) {
  const { lineId } = widget.config as LineMapConfig
  const navigate = useNavigate()

  const [data, setData] = useState<{
    line: Line
    nodes: DiagramNode[]
    edges: DiagramEdge[]
    bgImage: { base64: string; width: number; height: number } | null
  } | null>(null)
  const [markers, setMarkers] = useState<Record<string, EnvSensorMarker>>({})
  const [slugMap, setSlugMap] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!lineId) return
    let active = true
    Promise.all([
      getLine(lineId),
      loadDiagram('line', lineId),
      getLineImage(lineId).catch(() => null),
    ])
      .then(([line, diagram, img]) => {
        if (!active) return
        setData({
          line,
          nodes: diagram.nodes,
          edges: diagram.edges,
          bgImage:
            img?.imageBase64 && img.width && img.height
              ? { base64: img.imageBase64, width: img.width, height: img.height }
              : null,
        })
      })
      .catch((e) => {
        if (active) setLoadError(e instanceof Error ? e.message : '불러오기 실패')
      })
    return () => {
      active = false
    }
  }, [lineId])

  const error = !lineId ? '라인 정보가 없습니다' : loadError
  const loading = !error && data === null

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { markers: m, slugByDevice } = await fetchEnvSensorMarkers()
        if (!active) return
        setMarkers(m)
        setSlugMap(slugByDevice)
      } catch {
        // ignore — keep previous markers
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [])

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

  const { line, nodes, edges, bgImage } = data!
  const sensorCount = nodes.filter((n) => n.deviceCode && markers[n.deviceCode]).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700">
          {line.name}
          <span className="ml-1.5 font-normal text-slate-400">센서 {sensorCount}개</span>
        </span>
        <button
          onClick={() => navigate('/realtime/environment')}
          className="text-[11px] text-slate-400 hover:text-[#003087] transition-colors"
        >
          전체보기 →
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DiagramMap
          nodes={nodes}
          edges={edges}
          editMode={false}
          backgroundImage={bgImage}
          sensorMarkers={markers}
          onMarkerClick={(code) => {
            const slug = slugMap[code]
            if (slug) navigate(`/realtime/ehs-detail/${slug}`)
          }}
        />
      </div>
    </div>
  )
}
