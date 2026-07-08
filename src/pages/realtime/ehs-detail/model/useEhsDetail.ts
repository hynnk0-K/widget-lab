import { useEffect, useState, useMemo } from 'react'
import { api } from '@/shared/lib/api'
import { parsePosition } from '@/shared/lib/parsePosition'
import { loadDiagram } from '@/shared/lib/diagramStorage'
import type { DiagramData } from '@/shared/lib/diagramStorage'
import { allOf, childrenOf } from '@/shared/lib/masterTree'
import type { MasterNode } from '@/shared/lib/masterTree'
import { listEquipments } from '@/entities/equipment/api/equipmentApi'
import type { EquipmentDto } from '@/entities/equipment/model/types'
import { fetchAllLatest } from '@/entities/ehs/api/ehsApi'
import { getCategoryConfig, calcRisk } from '@/entities/ehs/model/config'
import type { EhsRiskLevel } from '@/entities/ehs/model/types'

const POLL_INTERVAL_MS = 5000

export function useEhsDetail(category: string) {
  const config = getCategoryConfig(category)

  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAllLatest>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDeviceCode, setSelectedDeviceCode] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | EhsRiskLevel>('all')
  const [search, setSearch] = useState('')

  const [tree, setTree] = useState<MasterNode[]>([])
  const [scopeFactory, setScopeFactory] = useState<MasterNode | null>(null)
  const [scopeProcess, setScopeProcess] = useState<MasterNode | null>(null)
  const [scopeLine, setScopeLine] = useState<MasterNode | null>(null)
  const [mapImage, setMapImage] = useState<{
    base64: string
    width: number
    height: number
  } | null>(null)
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const [deviceLineMap, setDeviceLineMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    api
      .get<MasterNode[]>('/master/tree')
      .then(setTree)
      .catch(() => setTree([]))
  }, [])

  const factories = useMemo(() => allOf(tree, 'factory'), [tree])
  useEffect(() => {
    if (factories.length > 0 && !scopeFactory) setScopeFactory(factories[0])
  }, [factories, scopeFactory])

  const processes = useMemo(
    () => (scopeFactory ? childrenOf(scopeFactory, 'process') : []),
    [scopeFactory],
  )
  const lines = useMemo(
    () => (scopeProcess ? childrenOf(scopeProcess, 'line') : []),
    [scopeProcess],
  )

  useEffect(() => {
    if (tree.length === 0) return
    const allLines = allOf(tree, 'line')
    Promise.all(allLines.map((l) => listEquipments(l.id).then((eqs) => ({ lineId: l.id, eqs }))))
      .then((results) => {
        const map = new Map<string, number>()
        results.forEach(({ lineId, eqs }) => eqs.forEach((e) => map.set(e.code, lineId)))
        setDeviceLineMap(map)
      })
      .catch(() => {})
  }, [tree])

  const lineAncestors = useMemo(() => {
    const map = new Map<number, { process: MasterNode; factory: MasterNode }>()
    allOf(tree, 'factory').forEach((factory) => {
      childrenOf(factory, 'process').forEach((process) => {
        childrenOf(process, 'line').forEach((line) => {
          map.set(line.id, { process, factory })
        })
      })
    })
    return map
  }, [tree])

  // cascade-safe 드롭다운 셀렉터
  function selectFactory(f: MasterNode | null) {
    setScopeFactory(f)
    setScopeProcess(null)
    setScopeLine(null)
  }
  function selectProcess(p: MasterNode | null) {
    setScopeProcess(p)
    setScopeLine(null)
  }

  // 설비 선택/해제 + 미선택 라인 자동 연결
  function handleDeviceSelect(code: string) {
    const isDeselect = selectedDeviceCode === code
    setSelectedDeviceCode(isDeselect ? null : code)
    if (!isDeselect && !scopeLine) {
      const lineId = deviceLineMap.get(code)
      if (lineId != null) {
        const ancestors = lineAncestors.get(lineId)
        const lineNode = allOf(tree, 'line').find((l) => l.id === lineId)
        if (lineNode && ancestors) {
          setScopeFactory(ancestors.factory)
          setScopeProcess(ancestors.process)
          setScopeLine(lineNode)
        }
      }
    }
  }

  useEffect(() => {
    if (!scopeLine) {
      setMapImage(null)
      setEquipments([])
      setDiagram({ nodes: [], edges: [] })
      return
    }
    Promise.all([
      api
        .get<{
          imageBase64: string | null
          width: number | null
          height: number | null
        }>(`/master/lines/${scopeLine.id}/image`)
        .catch(() => null),
      listEquipments(scopeLine.id),
      loadDiagram('line', scopeLine.id),
    ]).then(([img, eqs, diag]) => {
      setMapImage(
        img?.imageBase64 && img.width && img.height
          ? { base64: img.imageBase64, width: img.width, height: img.height }
          : null,
      )
      setEquipments(eqs)
      const idToCode = new Map(eqs.map((e) => [e.id, e.code]))
      setDiagram({
        nodes: diag.nodes.map((n) =>
          n.type === 'equipment' && n.linkedId != null && !n.deviceCode
            ? { ...n, deviceCode: idToCode.get(n.linkedId) }
            : n,
        ),
        edges: diag.edges,
      })
    })
  }, [scopeLine])

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

  const rowsWithRisk = useMemo(() => {
    if (!config) return []
    return rows.map((r) => {
      const value = r[config.primaryMetric.key] as number | null
      const risk: EhsRiskLevel = value != null ? calcRisk(value, config.primaryMetric) : 'normal'
      return { row: r, value, risk }
    })
  }, [rows, config])

  const alarmStatusByDevice = useMemo(() => {
    const map: Record<string, 'critical' | 'warning'> = {}
    rowsWithRisk.forEach(({ row, risk }) => {
      if (risk === 'danger') map[row.device_code] = 'critical'
      else if (risk === 'warning') map[row.device_code] = 'warning'
    })
    return map
  }, [rowsWithRisk])

  const lineDeviceCodes = useMemo(() => new Set(equipments.map((e) => e.code)), [equipments])
  const scopedRows = useMemo(
    () =>
      scopeLine ? rowsWithRisk.filter((r) => lineDeviceCodes.has(r.row.device_code)) : rowsWithRisk,
    [rowsWithRisk, scopeLine, lineDeviceCodes],
  )

  const summary = useMemo(() => {
    const counts = { normal: 0, caution: 0, warning: 0, danger: 0 }
    scopedRows.forEach((r) => counts[r.risk]++)
    return counts
  }, [scopedRows])

  const filteredRows = useMemo(() => {
    let arr = scopedRows
    if (filter !== 'all') arr = arr.filter((r) => r.risk === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter((r) => r.row.device_code.toLowerCase().includes(q))
    }
    const ORDER: EhsRiskLevel[] = ['danger', 'warning', 'caution', 'normal']
    return [...arr].sort((a, b) => ORDER.indexOf(a.risk) - ORDER.indexOf(b.risk))
  }, [scopedRows, filter, search])

  const mapPins = useMemo(() => {
    const riskMap = new Map(rowsWithRisk.map((r) => [r.row.device_code, r]))
    return equipments
      .filter((eq) => riskMap.has(eq.code))
      .map((eq) => {
        const { value, risk } = riskMap.get(eq.code)!
        const pos = parsePosition(eq.position)
        return {
          code: eq.code,
          name: eq.name,
          position: pos ? { x: pos.x, y: pos.y } : null,
          value,
          unit: config?.primaryMetric.unit ?? '',
          risk,
        }
      })
  }, [equipments, rowsWithRisk, config])

  return {
    config,
    loading,
    error,
    rows,
    factories,
    processes,
    lines,
    scopeFactory,
    scopeProcess,
    scopeLine,
    selectFactory,
    selectProcess,
    setScopeLine,
    selectedDeviceCode,
    handleDeviceSelect,
    mapImage,
    diagram,
    alarmStatusByDevice,
    mapPins,
    filter,
    setFilter,
    search,
    setSearch,
    scopedRows,
    filteredRows,
    summary,
  }
}
