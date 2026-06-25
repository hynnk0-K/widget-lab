import { useEffect, useMemo, useState } from 'react'
import { api } from '@/shared/lib/api'
import { LayoutMap, type MapPin } from '@/shared/ui/layout-map'
import type { Alarm } from '../types'

interface LineDto {
  id: number
  code: string
  name: string
  hasImage: boolean
}

interface LayoutImageDto {
  imageBase64: string | null
  width: number | null
  height: number | null
}

interface EquipmentDto {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  position: string | null
  isActive: boolean
}

interface Props {
  alarms: Alarm[]
  selectedAlarmId: number | null
  onPinClick: (deviceCode: string) => void
  selectedLineId: number | null
  onLineChange: (lineId: number) => void
  onEquipmentsLoaded: (equipments: EquipmentDto[]) => void
}

function parsePosition(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return { x: p.x, y: p.y }
  } catch {
    /* ignore */
  }
  return null
}

export function AlarmMapPanel({
  alarms,
  selectedAlarmId,
  onPinClick,
  selectedLineId,
  onLineChange,
  onEquipmentsLoaded,
}: Props) {
  const [lines, setLines] = useState<LineDto[]>([])
  //   const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [equipments, setEquipments] = useState<EquipmentDto[]>([])
  const [loading, setLoading] = useState(true)

  // 라인 목록 로드
  useEffect(() => {
    api.get<LineDto[]>('/master/lines').then((data) => {
      setLines(data)
      if (data.length > 0 && selectedLineId === null) {
        onLineChange(data[0].id) // ← 부모에 첫 라인 알림
      }
    })
  }, []) // 처음 한 번만

  // 선택된 라인의 도면 + 설비 로드
  useEffect(() => {
    if (!selectedLineId) return
    setLoading(true)
    Promise.all([
      api.get<LayoutImageDto>(`/master/lines/${selectedLineId}/image`).catch(() => null),
      api.get<EquipmentDto[]>(`/master/equipments?lineId=${selectedLineId}`),
    ])
      .then(([imgData, equipsData]) => {
        if (imgData?.imageBase64 && imgData.width && imgData.height) {
          setImage({ base64: imgData.imageBase64, width: imgData.width, height: imgData.height })
        } else {
          setImage(null)
        }
        setEquipments(equipsData)
        onEquipmentsLoaded(equipsData) // ← 부모에 알림
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
    }))
  }, [equipments, alarmStatusByDevice])

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
        ) : (
          <LayoutMap image={image} pins={pins} editMode={false} onPinClick={handlePinClick} />
        )}
      </div>
    </div>
  )
}
