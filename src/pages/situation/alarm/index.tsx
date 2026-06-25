import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { AlarmSummaryCard } from './components/AlarmSummaryCard'
import { AlarmListPanel } from './components/AlarmListPanel'
import { AlarmMapPanel } from './components/AlarmMapPanel'
import { fetchAlarms } from '@/shared/api/alarm'
import { useSnackbarStore } from '@/shared/store/snackbar'
import type { Alarm } from './types'

// EquipmentDto는 AlarmMapPanel에서도 쓰는 타입이라 별도 파일로 빼는 게 깔끔하지만
// 일단 여기 inline
interface EquipmentDto {
  id: number
  lineId: number
  code: string
  name: string
  equipmentType: string | null
  position: string | null
  isActive: boolean
}

const POLL_INTERVAL_MS = 5000

export function AlarmPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allAlarms, setAllAlarms] = useState<Alarm[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [lineEquipments, setLineEquipments] = useState<EquipmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const push = useSnackbarStore((s) => s.push)

  // ── 알람 폴링 ──
  useEffect(() => {
    let cancelled = false
    let knownAlarmIds = new Set<number>()
    let isFirstLoad = true

    async function loadAlarms() {
      try {
        const data = await fetchAlarms({ limit: 200 })
        if (cancelled) return

        if (isFirstLoad) {
          knownAlarmIds = new Set(data.map((a) => a.alarmId))
          isFirstLoad = false
        } else {
          const newOnes = data.filter((a) => !knownAlarmIds.has(a.alarmId) && a.status === 'active')
          newOnes.forEach((a) => push(a))
          data.forEach((a) => knownAlarmIds.add(a.alarmId))
        }

        setAllAlarms(data)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '알람을 불러올 수 없습니다')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAlarms()
    const timer = setInterval(loadAlarms, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [push])

  // ── 선택된 라인의 설비 코드 set ──
  const deviceCodesInLine = useMemo(() => {
    return new Set(lineEquipments.map((eq) => eq.code))
  }, [lineEquipments])

  // ── 라인 필터링된 알람 ──
  // 설비가 아직 안 로드됐으면 전체 알람 표시 (Set이 비어있어도 빈 알람이 아닌 fallback)
  const filteredAlarms = useMemo(() => {
    if (deviceCodesInLine.size === 0) {
      return allAlarms // 라인 설비 안 로드된 상태 — 전체
    }
    return allAlarms.filter((a) => deviceCodesInLine.has(a.deviceCode))
  }, [allAlarms, deviceCodesInLine])

  // URL ?alarmId=xxx 처리
  useEffect(() => {
    const alarmIdParam = searchParams.get('alarmId')
    if (alarmIdParam && allAlarms.length > 0) {
      const id = Number(alarmIdParam)
      const exists = allAlarms.find((a) => a.alarmId === id)
      if (exists) {
        setSelectedId(id)
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, allAlarms, setSearchParams])

  function handleMapPinClick(deviceCode: string) {
    const deviceAlarms = filteredAlarms
      .filter((a) => a.deviceCode === deviceCode && a.status !== 'resolved')
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    if (deviceAlarms.length > 0) {
      setSelectedId(deviceAlarms[0].alarmId)
    }
  }

  function handleLineChange(lineId: number) {
    setSelectedLineId(lineId)
    setSelectedId(null) // 라인 바뀌면 선택 알람 초기화
  }

  if (loading) {
    return (
      <ManagementLayout section="situation">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-400">알람 불러오는 중...</span>
          </div>
        </div>
      </ManagementLayout>
    )
  }

  if (error) {
    return (
      <ManagementLayout section="situation">
        <div className="flex flex-col items-center justify-center h-full bg-red-50 m-5 rounded-xl border border-red-200">
          <p className="text-[14px] text-red-600 m-0">{error}</p>
        </div>
      </ManagementLayout>
    )
  }

  return (
    <ManagementLayout section="situation">
      <div className="flex flex-col gap-3 p-5 h-full">
        <AlarmSummaryCard alarms={filteredAlarms} />

        <div className="grid grid-cols-[1fr_400px] gap-3 flex-1 min-h-0">
          <AlarmMapPanel
            alarms={filteredAlarms}
            selectedAlarmId={selectedId}
            onPinClick={handleMapPinClick}
            selectedLineId={selectedLineId}
            onLineChange={handleLineChange}
            onEquipmentsLoaded={setLineEquipments}
          />
          <AlarmListPanel
            alarms={filteredAlarms}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </ManagementLayout>
  )
}
