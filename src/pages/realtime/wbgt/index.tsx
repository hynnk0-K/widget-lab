import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { api } from '@/shared/lib/api'
import { parsePosition } from '@/shared/lib/parsePosition'
import { WbgtZoneMap, type WbgtZonePin, type WbgtZoneSummary } from './WbgtZoneMap'
import {
  WBGT_RISK_COLOR,
  WBGT_RISK_LABEL,
  getMockWbgt,
  getMockWbgtTrend,
  wbgtToRisk,
  worstRisk,
} from './wbgtRisk'

interface MasterTreeNode {
  type: string
  id: number
  code: string
  name: string
  children?: MasterTreeNode[]
}

interface LayoutImageDto {
  imageBase64: string | null
  width: number | null
  height: number | null
}

// /master/tree는 좌표를 안 내려줌 — 좌표는 공정/라인 DTO에만 있어서 별도 조회
interface PositionedDto {
  id: number
  position: string | null
}

function children(node: MasterTreeNode, type: string): MasterTreeNode[] {
  return node.children?.filter((c) => c.type === type) ?? []
}

// Sidebar.tsx의 getDescendants와 동일한 재귀 탐색 (타입 무관하게 하위 전체에서 찾기)
function descendants(nodes: MasterTreeNode[], targetType: string): MasterTreeNode[] {
  const result: MasterTreeNode[] = []
  for (const node of nodes) {
    if (node.type === targetType) result.push(node)
    else if (node.children?.length) result.push(...descendants(node.children, targetType))
  }
  return result
}

function lineRisk(line: MasterTreeNode) {
  return wbgtToRisk(getMockWbgt(line.id))
}

function nodeWorstRisk(node: MasterTreeNode) {
  const lines = descendants([node], 'line')
  if (lines.length === 0) return wbgtToRisk(getMockWbgt(node.id))
  return worstRisk(lines.map(lineRisk))
}

type View =
  | { level: 'factories' }
  | { level: 'factory'; factory: MasterTreeNode }
  | { level: 'process'; factory: MasterTreeNode; process: MasterTreeNode }

export function RealtimeWbgtPage() {
  const [tree, setTree] = useState<MasterTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [siteId, setSiteId] = useState<number | null>(null)
  const [view, setView] = useState<View>({ level: 'factories' })
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [positions, setPositions] = useState<Record<number, { x: number; y: number } | null>>({})
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  // 화면 전환(드릴다운/브레드크럼) 시 이전 선택은 해제
  useEffect(() => {
    setSelectedLineId(null)
  }, [view])

  useEffect(() => {
    api
      .get<MasterTreeNode[]>('/master/tree')
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false))
  }, [])

  // mock 값이 1분 단위로 바뀌므로 그만큼만 다시 그려준다
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  const sites = useMemo(() => descendants(tree, 'site'), [tree])

  useEffect(() => {
    if (siteId === null && sites.length > 0) setSiteId(sites[0].id)
  }, [siteId, sites])

  const selectedSite = sites.find((s) => s.id === siteId) ?? null
  const factories = useMemo(() => (selectedSite ? children(selectedSite, 'factory') : []), [selectedSite])

  // 도면(공장/공정) 이미지 + 하위 노드 좌표 로드
  useEffect(() => {
    if (view.level === 'factories') {
      setImage(null)
      setPositions({})
      return
    }
    const id = view.level === 'factory' ? view.factory.id : view.process.id
    const path = view.level === 'factory' ? 'factories' : 'processes'
    const childPath = view.level === 'factory' ? `/master/processes?factoryId=${id}` : `/master/lines?processId=${id}`
    setImageLoading(true)
    Promise.all([
      api.get<LayoutImageDto>(`/master/${path}/${id}/image`).catch(() => null),
      api.get<PositionedDto[]>(childPath).catch(() => []),
    ])
      .then(([data, childList]) => {
        if (data?.imageBase64 && data.width && data.height) {
          setImage({ base64: data.imageBase64, width: data.width, height: data.height })
        } else {
          setImage(null)
        }
        const map: Record<number, { x: number; y: number } | null> = {}
        for (const c of childList) map[c.id] = parsePosition(c.position)
        setPositions(map)
      })
      .finally(() => setImageLoading(false))
  }, [view])

  const pins: WbgtZonePin[] = useMemo(() => {
    void tick // tick 변경 시에만 재계산
    if (view.level === 'factory') {
      return children(view.factory, 'process').map((p) => ({
        id: p.id,
        name: p.name,
        position: positions[p.id] ?? null,
        value: getMockWbgt(p.id),
        risk: nodeWorstRisk(p),
      }))
    }
    if (view.level === 'process') {
      return children(view.process, 'line').map((l) => ({
        id: l.id,
        name: l.name,
        position: positions[l.id] ?? null,
        value: getMockWbgt(l.id),
        risk: lineRisk(l),
        selected: l.id === selectedLineId,
      }))
    }
    return []
  }, [view, tick, positions, selectedLineId])

  // 공정에 센서(라인)가 여러 개면 그 위치들의 대략 중심에 요약 카드 오버레이
  const processSummary: WbgtZoneSummary | null = useMemo(() => {
    void tick
    if (view.level !== 'process') return null
    const lines = children(view.process, 'line')
    if (lines.length < 2) return null
    const pts = lines.map((l) => positions[l.id]).filter((p): p is { x: number; y: number } => !!p)
    if (pts.length === 0) return null
    return {
      position: {
        x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
        y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
      },
      label: '공정 요약',
      count: lines.length,
      value: Math.max(...lines.map((l) => getMockWbgt(l.id))),
      risk: worstRisk(lines.map(lineRisk)),
    }
  }, [view, tick, positions])

  const selectedLine =
    view.level === 'process' && selectedLineId !== null
      ? (children(view.process, 'line').find((l) => l.id === selectedLineId) ?? null)
      : null

  const trendOption = useMemo(() => {
    if (!selectedLine) return null
    const points = getMockWbgtTrend(selectedLine.id, 30)
    return {
      grid: { top: 16, right: 16, bottom: 28, left: 36 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: points.map((p) => new Date(p.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })),
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 4 },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' as const } },
      },
      series: [
        {
          type: 'line' as const,
          smooth: true,
          symbol: 'none',
          data: points.map((p) => p.value),
          lineStyle: { color: '#003087', width: 2 },
          areaStyle: { color: 'rgba(0,48,135,0.08)' },
        },
      ],
    }
  }, [selectedLine, tick])

  function handlePinClick(id: number) {
    if (view.level === 'factory') {
      const process = children(view.factory, 'process').find((p) => p.id === id)
      if (process) setView({ level: 'process', factory: view.factory, process })
    } else if (view.level === 'process') {
      setSelectedLineId((prev) => (prev === id ? null : id))
    }
  }

  if (loading) {
    return (
      <ManagementLayout section="realtime">
        <div className="flex items-center justify-center h-full text-[13px] text-slate-400">
          불러오는 중...
        </div>
      </ManagementLayout>
    )
  }

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col gap-3 p-5 h-full overflow-hidden">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => setView({ level: 'factories' })}
            className={view.level === 'factories' ? 'font-semibold text-slate-800' : 'text-slate-400 hover:text-slate-600'}
          >
            {selectedSite?.name ?? '사업장'}
          </button>
          {view.level !== 'factories' && (
            <>
              <span className="text-slate-300">/</span>
              <button
                onClick={() => setView({ level: 'factory', factory: view.factory })}
                className={view.level === 'factory' ? 'font-semibold text-slate-800' : 'text-slate-400 hover:text-slate-600'}
              >
                {view.factory.name}
              </button>
            </>
          )}
          {view.level === 'process' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">{view.process.name}</span>
            </>
          )}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {(Object.keys(WBGT_RISK_LABEL) as (keyof typeof WBGT_RISK_LABEL)[]).map((level) => (
            <div key={level} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${WBGT_RISK_COLOR[level]}`} />
              <span>{WBGT_RISK_LABEL[level]}</span>
            </div>
          ))}
        </div>

        {view.level === 'factories' ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-auto">
            {sites.length > 1 && (
              <select
                value={siteId ?? ''}
                onChange={(e) => setSiteId(Number(e.target.value))}
                className="self-start text-[12px] border border-slate-200 rounded px-2 py-1 bg-white"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-3">
              {factories.map((f) => {
                const risk = nodeWorstRisk(f)
                return (
                  <button
                    key={f.id}
                    onClick={() => setView({ level: 'factory', factory: f })}
                    className="flex flex-col items-start gap-1 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow min-w-[160px]"
                  >
                    <span className="text-[13px] font-semibold text-slate-800">{f.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${WBGT_RISK_COLOR[risk]}`}>
                      {WBGT_RISK_LABEL[risk]}
                    </span>
                  </button>
                )
              })}
              {factories.length === 0 && (
                <p className="text-[13px] text-slate-400">공장이 없습니다.</p>
              )}
            </div>
          </div>
        ) : imageLoading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-[13px] text-slate-400">
            도면 불러오는 중...
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex gap-3">
            <div className="flex-1 min-w-0">
              <WbgtZoneMap image={image} pins={pins} onPinClick={handlePinClick} summary={processSummary} />
            </div>
            {selectedLine && (
              <div className="w-[300px] flex-shrink-0 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 overflow-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-slate-800 m-0">{selectedLine.name}</h3>
                  <button
                    onClick={() => setSelectedLineId(null)}
                    className="text-slate-400 hover:text-slate-600 text-[12px]"
                  >
                    닫기
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[13px] font-bold px-2 py-0.5 rounded-full text-white ${WBGT_RISK_COLOR[lineRisk(selectedLine)]}`}
                  >
                    {getMockWbgt(selectedLine.id)}°C
                  </span>
                  <span className="text-[12px] text-slate-500">{WBGT_RISK_LABEL[lineRisk(selectedLine)]}</span>
                </div>
                {trendOption && <ReactECharts option={trendOption} style={{ height: 220 }} notMerge />}
              </div>
            )}
          </div>
        )}
      </div>
    </ManagementLayout>
  )
}
