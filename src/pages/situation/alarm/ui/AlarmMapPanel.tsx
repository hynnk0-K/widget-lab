import { useEffect, useMemo, useState } from 'react'
import { parsePosition } from '@/shared/lib/parsePosition'
import { LayoutMap, type MapPin } from '@/widgets/layout-map'
import { DiagramMap } from '@/widgets/diagram-map'
import { loadDiagram, loadBgVisible, type DiagramData } from '@/shared/lib/diagramStorage'
import type { Alarm } from '@/entities/alarm/model/types'
import type { EquipmentDto } from '@/entities/equipment/model/types'
import { listEquipments } from '@/entities/equipment/api/equipmentApi'
import { listLines, getLineImage } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'

interface Props {
  alarms: Alarm[]
  selectedAlarmId: number | null
  onPinClick: (deviceCode: string) => void
  selectedLineId: number | null
  onLineChange: (lineId: number) => void
  onEquipmentsLoaded: (equipments: EquipmentDto[]) => void
  /** 선택된 알람이 속한 라인 — 일치하는 라인으로 자동 전환 */
  targetLine?: string | null
}

export function AlarmMapPanel({
  alarms,
  selectedAlarmId,
  onPinClick,
  selectedLineId,
  onLineChange,
  onEquipmentsLoaded,
  targetLine,
}: Props) {
  const [lines, setLines] = useState<Line[]>([])
  //   const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [diagram, setDiagram] = useState<DiagramData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)

  // 라인 목록 로드
  useEffect(() => {
    listLines().then((data) => {
      setLines(data)
      if (data.length > 0 && selectedLineId === null) {
        onLineChange(data[0].id) // ← 부모에 첫 라인 알림
      }
    })
  }, []) // 처음 한 번만

  // 스낵바 클릭 등으로 다른 라인의 알람이 선택되면 해당 라인으로 전환
  // targetLine(알람 선택)이 바뀔 때만 동작 — selectedLineId를 deps에 넣으면
  // 사용자가 수동으로 다른 라인을 고른 직후 다시 덮어써버린다
  useEffect(() => {
    if (!targetLine || lines.length === 0) return
    const match = lines.find(
      (l) => l.code.toLowerCase() === targetLine.toLowerCase() || l.name === targetLine,
    )
    if (match && match.id !== selectedLineId) {
      onLineChange(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLine, lines])

  // 선택된 라인의 도면 + 설비 로드
  useEffect(() => {
    if (!selectedLineId) return
    setLoading(true)
    Promise.all([
      getLineImage(selectedLineId).catch(() => null),
      listEquipments(selectedLineId),
      loadDiagram('line', selectedLineId),
    ])
      .then(([imgData, equipsData, diagramData]) => {
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({ base64: imgData.imageBase64, width: imgData.width, height: imgData.height })
        } else {
          setImage(null)
        }
        setEquipments(equipsData)
        onEquipmentsLoaded(equipsData) // ← 부모에 알림
        setDiagram(diagramData)
      })
      .finally(() => setLoading(false))
  }, [selectedLineId, onEquipmentsLoaded])

  // 디바이스별 알람 상태 매핑 (resolved 제외)
  const alarmStatusByDevice = useMemo(() => {
    const map: Record<string, 'critical' | 'warning'> = {}
    alarms
      .filter((a) => a.status !== 'resolved')
      .forEach((a) => {
        const current = map[a.deviceCode]
        // critical 우선, 같은 디바이스에 여러 알람 있으면 가장 심한 것
        if (a.severity === 'critical') {
          map[a.deviceCode] = 'critical'
        } else if (a.severity === 'warning' && current !== 'critical') {
          map[a.deviceCode] = 'warning'
        }
      })
    return map
  }, [alarms])

  // 선택된 알람의 deviceCode
  const selectedDeviceCode = useMemo(() => {
    if (!selectedAlarmId) return null
    return alarms.find((a) => a.alarmId === selectedAlarmId)?.deviceCode ?? null
  }, [selectedAlarmId, alarms])

  // 설비 → MapPin 변환 (alarmStatus 포함)
  const pins: MapPin[] = useMemo(() => {
    return equipments.map((eq) => ({
      id: eq.id,
      code: eq.code,
      name: eq.name,
      position: parsePosition(eq.position),
      live: { hasData: eq.isActive },
      alarmStatus: alarmStatusByDevice[eq.code] ?? null,
      selected: eq.code === selectedDeviceCode,
    }))
  }, [equipments, alarmStatusByDevice, selectedDeviceCode])

  // 해당 라인에 다이어그램(P&ID)이 만들어져 있으면 그걸로 표시, 아직 없으면 기존 이미지+핀으로 폴백
  const hasDiagram = diagram.nodes.length > 0
  const showBg = useMemo(
    () => (selectedLineId ? loadBgVisible('line', selectedLineId) : true),
    [selectedLineId],
  )

  function handlePinClick(pinId: number | string) {
    const eq = equipments.find((e) => e.id === pinId)
    if (eq) onPinClick(eq.code)
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* 헤더 — 라인 선택 + 범례 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-slate-700">공장 도면</span>
          {lines.length > 0 && (
            <select
              value={selectedLineId ?? ''}
              onChange={(e) => onLineChange(Number(e.target.value))}
              className="text-[12px] border border-slate-200 rounded px-2 py-1 bg-white"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>심각</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>주의</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>정상</span>
          </div>
          {selectedDeviceCode && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
              선택: {selectedDeviceCode}
            </span>
          )}
        </div>
      </div>

      {/* 도면 영역 */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            도면 불러오는 중...
          </div>
        ) : hasDiagram ? (
          <DiagramMap
            nodes={diagram.nodes}
            edges={diagram.edges}
            editMode={false}
            alarmStatusByDevice={alarmStatusByDevice}
            selectedDeviceCode={selectedDeviceCode}
            backgroundImage={showBg ? image : null}
          />
        ) : (
          <LayoutMap image={image} pins={pins} editMode={false} onPinClick={handlePinClick} />
        )}
      </div>
    </div>
  )
}
