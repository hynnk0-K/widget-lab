import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { DiagramMap } from '@/widgets/diagram-map'
import { getFactory } from '@/entities/factory/api/factoryApi'
import { listProcesses, getProcessImage } from '@/entities/process/api/processApi'
import { getLineImage } from '@/entities/line/api/lineApi'
import { fetchEnvSensorMarkers } from '@/entities/ehs/model/envSensors'
import type { EnvSensorMarker } from '@/entities/ehs/model/envSensors'
import { CATEGORIES } from '@/entities/ehs/model/config'
import { fetchTrend as fetchEhsTrend } from '@/entities/ehs/api/ehsApi'
import { loadDiagram } from '@/shared/lib/diagramStorage'
import type { DiagramData, DiagramNode, DiagramEdge } from '@/shared/lib/diagramStorage'
import { api } from '@/shared/lib/api'
import type { Factory } from '@/entities/factory/model/types'
import type { Process } from '@/entities/process/model/types'
import { METRIC_LABELS } from '../model/metricLabels'
import { fetchTrend, type TrendPoint } from '../api/widgetApi'
import type { Widget, FactoryMapConfig } from '../model/types'

// ── 설비 차트 패널 ─────────────────────────────────────────────────
interface EquipmentLiveDetail {
  code: string
  name: string
  latest: Record<string, unknown>
}

function miniChartOption(points: { ts: string; avg: number }[]) {
  return {
    grid: { top: 6, right: 4, bottom: 4, left: 4 },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 10 },
      formatter: (params: Array<{ axisValue: string; value: number }>) => {
        const ts = new Date(params[0].axisValue).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return `<div style="font-size:10px;color:#94a3b8">${ts}</div><div style="font-weight:600">${params[0].value?.toFixed(2) ?? '-'}</div>`
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.ts),
      show: false,
      boundaryGap: false,
    },
    yAxis: { type: 'value', scale: true, show: false },
    series: [
      {
        type: 'line' as const,
        data: points.map((p) => p.avg),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#003087', width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 48, 135, 0.15)' },
              { offset: 1, color: 'rgba(0, 48, 135, 0.01)' },
            ],
          },
        },
      },
    ],
  }
}

function DeviceChartsPanel({
  deviceCode,
  ehsCategory,
  onClose,
}: {
  deviceCode: string
  ehsCategory?: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [charts, setCharts] = useState<
    { label: string; points: { ts: string; avg: number }[] }[] | null
  >(null)

  useEffect(() => {
    let active = true
    setCharts(null)
    setName('')

    // 환경(EHS) 센서: 카테고리 설정의 detailMetrics로 EHS 트렌드 조회
    if (ehsCategory) {
      const cfg = CATEGORIES[ehsCategory]
      if (cfg) setName(cfg.koreanLabel)
      const metrics = cfg?.detailMetrics ?? []
      Promise.all(
        metrics.map((m) => fetchEhsTrend(ehsCategory, deviceCode, m.key, 6, 10).catch(() => [])),
      ).then((trends) => {
        if (!active) return
        setCharts(
          metrics
            .map((m, i) => ({
              label: m.unit ? `${m.label} (${m.unit})` : m.label,
              points: trends[i].filter((p): p is typeof p & { avg: number } => p.avg != null),
            }))
            .filter((c) => c.points.length > 0),
        )
      })
      return () => {
        active = false
      }
    }

    // 일반 설비: equipment-live 최신값의 숫자 키를 메트릭으로 사용
    api
      .get<EquipmentLiveDetail>(`/equipment-live/${deviceCode}`)
      .catch(() => null)
      .then(async (detail) => {
        if (!active) return
        if (detail?.name) setName(detail.name)
        const metrics = Object.keys(detail?.latest ?? {}).filter(
          (k) => typeof detail?.latest[k] === 'number',
        )
        const trends = await Promise.all(metrics.map((m) => fetchTrend(deviceCode, m, 6, 10)))
        if (!active) return
        setCharts(
          metrics
            .map((m, i) => ({ label: METRIC_LABELS[m] ?? m, points: trends[i] as TrendPoint[] }))
            .filter((c) => c.points.length > 0),
        )
      })
    return () => {
      active = false
    }
  }, [deviceCode, ehsCategory])

  return (
    <div className="absolute inset-y-0 right-0 w-[250px] bg-white border-l border-slate-200 shadow-lg z-10 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700 truncate">
          {name || deviceCode}
          <span className="ml-1.5 font-normal text-slate-400">{deviceCode}</span>
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {ehsCategory && (
            <button
              onClick={() => navigate(`/realtime/ehs-detail/${ehsCategory}`)}
              className="text-[11px] text-slate-400 hover:text-[#003087] transition-colors"
            >
              상세 →
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-[14px] leading-none px-1"
          >
            ×
          </button>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {charts === null ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : charts.length === 0 ? (
          <p className="m-0 p-3 text-[11px] text-slate-400">표시할 측정 데이터가 없습니다</p>
        ) : (
          charts.map((c) => (
            <div key={c.label} className="px-3 pt-2.5 pb-1 border-b border-slate-50">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-500">{c.label}</span>
                <span className="text-[12px] font-bold text-[#003087]">
                  {c.points[c.points.length - 1].avg.toFixed(1)}
                </span>
              </div>
              <ReactECharts
                option={miniChartOption(c.points)}
                style={{ height: 64, width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge
              />
            </div>
          ))
        )}
      </div>
      <p className="m-0 px-3 py-1.5 text-[10px] text-slate-300 border-t border-slate-50 flex-shrink-0">
        최근 6시간 · 10분 집계
      </p>
    </div>
  )
}

// ── 공장 도면 위젯 (공정 → 라인 드릴다운) ──────────────────────────
interface DrillLevel {
  scope: 'process' | 'line'
  id: number
  name: string
}

export function FactoryMapWidget({ widget }: { widget: Widget }) {
  const { factoryId } = widget.config as FactoryMapConfig
  const navigate = useNavigate()

  const [factory, setFactory] = useState<Factory | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [nodes, setNodes] = useState<DiagramNode[]>([])
  const [edges, setEdges] = useState<DiagramEdge[]>([])
  const [markers, setMarkers] = useState<Record<string, EnvSensorMarker>>({})
  const [slugMap, setSlugMap] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')

  // 드릴다운 스택: 공장 → 공정 → 라인, 마지막 단계에서 설비 선택 시 차트
  const [stack, setStack] = useState<DrillLevel[]>([])
  const drill = stack.length > 0 ? stack[stack.length - 1] : null
  const [drillDiagram, setDrillDiagram] = useState<DiagramData | null>(null)
  const [drillImage, setDrillImage] = useState<{
    base64: string
    width: number
    height: number
  } | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  // 도면에 설비가 연결돼 있으면 실시간 값 칩으로 표시 (10초 폴링)
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
    const t = setInterval(load, 10_000)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!factoryId) return
    let active = true
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
      .catch((e) => {
        if (active) setLoadError(e instanceof Error ? e.message : '불러오기 실패')
      })
    return () => {
      active = false
    }
  }, [factoryId])

  // 드릴다운 시 해당 스코프 도면 + 배경 이미지 로드
  useEffect(() => {
    if (!drill) {
      setDrillDiagram(null)
      setDrillImage(null)
      setSelectedDevice(null)
      return
    }
    let active = true
    setDrillDiagram(null)
    setSelectedDevice(null)
    const getImage = drill.scope === 'process' ? getProcessImage : getLineImage
    Promise.all([loadDiagram(drill.scope, drill.id), getImage(drill.id).catch(() => null)])
      .then(([diagram, img]) => {
        if (!active) return
        setDrillDiagram(diagram)
        setDrillImage(
          img?.imageBase64 && img.width && img.height
            ? { base64: img.imageBase64, width: img.width, height: img.height }
            : null,
        )
      })
      .catch(() => {
        if (active) setDrillDiagram({ nodes: [], edges: [] })
      })
    return () => {
      active = false
    }
  }, [drill])

  const error = !factoryId ? '공장 정보가 없습니다' : loadError
  const loading = !error && factory === null

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

  // 마커(환경 센서)도 위젯 안 차트 패널로 — 상세 페이지는 패널 헤더의 "상세 →"로 이동
  const onMarkerClick = (code: string) => setSelectedDevice(code)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <span className="text-[12px] font-semibold text-slate-700 flex items-center gap-1.5 min-w-0">
          {drill ? (
            <>
              <button
                onClick={() => setStack((s) => s.slice(0, -1))}
                className="text-slate-400 hover:text-[#003087] transition-colors flex-shrink-0"
                title="상위 도면으로"
              >
                ←
              </button>
              <span className="text-slate-400 font-normal truncate">
                {[factory?.name, ...stack.slice(0, -1).map((l) => l.name)].join(' › ')}
              </span>
              <span className="text-slate-300 flex-shrink-0">›</span>
              <span className="truncate">{drill.name}</span>
            </>
          ) : (
            <>
              {factory?.name ?? widget.title}
              <span className="font-normal text-slate-400">공정 {processes.length}개</span>
            </>
          )}
        </span>
        <button
          onClick={() =>
            navigate(
              !drill
                ? `/service/factory/${factoryId}/map`
                : drill.scope === 'process'
                  ? `/realtime/process/${drill.id}`
                  : `/service/line/${drill.id}/map`,
            )
          }
          className="text-[11px] text-slate-400 hover:text-[#003087] transition-colors flex-shrink-0"
        >
          전체보기 →
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {drill ? (
          drillDiagram === null ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : drillDiagram.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-slate-400">
              도면이 없습니다
            </div>
          ) : (
            <DiagramMap
              key={`${drill.scope}-${drill.id}`}
              nodes={drillDiagram.nodes}
              edges={drillDiagram.edges}
              editMode={false}
              backgroundImage={drillImage}
              sensorMarkers={markers}
              onMarkerClick={onMarkerClick}
              onDeviceClick={setSelectedDevice}
              selectedDeviceCode={selectedDevice}
              onZoneClick={
                drill.scope === 'process'
                  ? (id) => {
                      const zone = drillDiagram.nodes.find(
                        (n) => n.type === 'zone' && n.linkedId === id,
                      )
                      setStack((s) => [
                        ...s,
                        { scope: 'line', id, name: zone?.label ?? `라인 ${id}` },
                      ])
                    }
                  : undefined
              }
            />
          )
        ) : (
          <DiagramMap
            key="factory"
            nodes={nodes}
            edges={edges}
            editMode={false}
            zoneOptions={processes.map((p) => ({ id: p.id, name: p.name }))}
            onZoneClick={(id) => {
              const proc = processes.find((p) => p.id === id)
              if (proc) setStack([{ scope: 'process', id: proc.id, name: proc.name }])
            }}
            sensorMarkers={markers}
            onMarkerClick={onMarkerClick}
          />
        )}

        {selectedDevice && (
          <DeviceChartsPanel
            deviceCode={selectedDevice}
            ehsCategory={slugMap[selectedDevice]}
            onClose={() => setSelectedDevice(null)}
          />
        )}
      </div>
    </div>
  )
}
