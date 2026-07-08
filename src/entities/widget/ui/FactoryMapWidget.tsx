import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiagramMap } from '@/widgets/diagram-map'
import { getFactory } from '@/entities/factory/api/factoryApi'
import { listProcesses } from '@/entities/process/api/processApi'
import { loadDiagram } from '@/shared/lib/diagramStorage'
import type { DiagramNode, DiagramEdge } from '@/shared/lib/diagramStorage'
import type { Factory } from '@/entities/factory/model/types'
import type { Process } from '@/entities/process/model/types'
import type { Widget, FactoryMapConfig } from '../model/types'

export function FactoryMapWidget({ widget }: { widget: Widget }) {
  const { factoryId } = widget.config as FactoryMapConfig
  const navigate = useNavigate()

  const [factory, setFactory] = useState<Factory | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [nodes, setNodes] = useState<DiagramNode[]>([])
  const [edges, setEdges] = useState<DiagramEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!factoryId) return
    let active = true
    setLoading(true)
    Promise.all([
      getFactory(factoryId),
      listProcesses(factoryId),
      loadDiagram('factory', factoryId),
    ])
      .then(([f, procs, diagram]) => {
        if (!active) return
        setFactory(f)
        setProcesses(procs)
        setNodes(diagram.nodes)
        setEdges(diagram.edges)
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : '불러오기 실패') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [factoryId])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
          <span className="text-[12px] font-semibold text-slate-700">{widget.title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
          <span className="text-[12px] font-semibold text-slate-700">{widget.title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[12px] text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700">
          {factory?.name ?? widget.title}
          <span className="ml-1.5 font-normal text-slate-400">공정 {processes.length}개</span>
        </span>
        <button
          onClick={() => navigate(`/service/factory/${factoryId}/map`)}
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
          zoneOptions={processes.map((p) => ({ id: p.id, name: p.name }))}
          onZoneClick={(id) => navigate(`/realtime/process/${id}`)}
        />
      </div>
    </div>
  )
}
