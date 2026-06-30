import { useEffect, useMemo, useState } from 'react'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { api } from '@/shared/lib/api'
import { WbgtZoneMap, type WbgtZonePin } from './WbgtZoneMap'
import { WBGT_RISK_COLOR, WBGT_RISK_LABEL, getMockWbgt, wbgtToRisk, worstRisk } from './wbgtRisk'

interface MasterTreeNode {
  type: string
  id: number
  code: string
  name: string
  position?: string | null
  children?: MasterTreeNode[]
}

interface LayoutImageDto {
  imageBase64: string | null
  width: number | null
  height: number | null
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

function parsePosition(raw: string | null | undefined): { x: number; y: number } | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return { x: p.x, y: p.y }
  } catch {
    /* ignore */
  }
  return null
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
  const [tick, setTick] = useState(0)

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

  // 도면(공장/공정) 이미지 로드
  useEffect(() => {
    if (view.level === 'factories') {
      setImage(null)
      return
    }
    const id = view.level === 'factory' ? view.factory.id : view.process.id
    const path = view.level === 'factory' ? 'factories' : 'processes'
    setImageLoading(true)
    api
      .get<LayoutImageDto>(`/master/${path}/${id}/image`)
      .catch(() => null)
      .then((data) => {
        if (data?.imageBase64 && data.width && data.height) {
          setImage({ base64: data.imageBase64, width: data.width, height: data.height })
        } else {
          setImage(null)
        }
      })
      .finally(() => setImageLoading(false))
  }, [view])

  const pins: WbgtZonePin[] = useMemo(() => {
    void tick // tick 변경 시에만 재계산
    if (view.level === 'factory') {
      return children(view.factory, 'process').map((p) => ({
        id: p.id,
        name: p.name,
        position: parsePosition(p.position),
        value: getMockWbgt(p.id),
        risk: nodeWorstRisk(p),
      }))
    }
    if (view.level === 'process') {
      return children(view.process, 'line').map((l) => ({
        id: l.id,
        name: l.name,
        position: parsePosition(l.position),
        value: getMockWbgt(l.id),
        risk: lineRisk(l),
      }))
    }
    return []
  }, [view, tick])

  function handlePinClick(id: number) {
    if (view.level === 'factory') {
      const process = children(view.factory, 'process').find((p) => p.id === id)
      if (process) setView({ level: 'process', factory: view.factory, process })
    }
    // 공정뷰의 라인 핀은 이미 값을 보여주고 있어 더 내려갈 곳이 없음
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
      <div className="flex flex-col gap-3 p-5 h-full overflow-auto">
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
          <div className="flex flex-col gap-3">
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
          <div className="flex items-center justify-center h-40 text-[13px] text-slate-400">
            도면 불러오는 중...
          </div>
        ) : (
          <WbgtZoneMap image={image} pins={pins} onPinClick={handlePinClick} />
        )}
      </div>
    </ManagementLayout>
  )
}
