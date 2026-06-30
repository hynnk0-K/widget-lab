import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchAlarms } from '@/entities/alarm/api/alarmApi'
import type { Alarm } from '@/entities/alarm/model/types'
import type { EquipmentDto } from '@/entities/equipment/model/types'
import { useSnackbarStore } from '@/features/alarm-notify/model/snackbarStore'

const POLL_INTERVAL_MS = 5000

export function useAlarmFeed() {
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

  // ── 선택된 알람 (라인 필터와 무관하게 항상 전체 목록 기준) ──
  const selectedAlarm = useMemo(() => {
    if (selectedId === null) return null
    return allAlarms.find((a) => a.alarmId === selectedId) ?? null
  }, [allAlarms, selectedId])

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

  // URL ?alarmId=xxx 처리 (스낵바 클릭 등으로 진입)
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
    // 선택된 알람은 유지 — 라인 전환이 알람 선택(스낵바 클릭 등)에 의해 자동으로 일어날 수 있어서
    // 여기서 선택을 초기화하면 막 선택한 알람이 곧바로 풀려버린다
  }

  return {
    loading,
    error,
    allAlarms,
    filteredAlarms,
    selectedId,
    setSelectedId,
    selectedAlarm,
    selectedLineId,
    setLineEquipments,
    handleMapPinClick,
    handleLineChange,
  }
}
