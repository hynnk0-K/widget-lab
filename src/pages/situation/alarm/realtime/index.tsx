import { AlarmLayout } from '../AlarmLayout'
import { AlarmListPanel } from '../ui/AlarmListPanel'
import { AlarmMapPanel } from '../ui/AlarmMapPanel'
import { AlarmDetailPanel } from '../ui/AlarmDetailPanel'
import { useAlarmFeed } from '@/features/alarm-feed/model/useAlarmFeed'

export function AlarmRealtimePage() {
  const {
    loading,
    error,
    filteredAlarms,
    selectedId,
    setSelectedId,
    selectedAlarm,
    selectedLineId,
    setLineEquipments,
    handleMapPinClick,
    handleLineChange,
  } = useAlarmFeed()

  if (loading) {
    return (
      <AlarmLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-400">알람 불러오는 중...</span>
          </div>
        </div>
      </AlarmLayout>
    )
  }

  if (error) {
    return (
      <AlarmLayout>
        <div className="flex flex-col items-center justify-center h-full bg-red-50 m-5 rounded-xl border border-red-200">
          <p className="text-[14px] text-red-600 m-0">{error}</p>
        </div>
      </AlarmLayout>
    )
  }

  return (
    <AlarmLayout>
      <div className="flex flex-col gap-3 p-5 h-full">
        <div className="grid grid-cols-[1fr_400px] gap-3 flex-1 min-h-0">
          <AlarmMapPanel
            alarms={filteredAlarms}
            selectedAlarmId={selectedId}
            onPinClick={handleMapPinClick}
            selectedLineId={selectedLineId}
            onLineChange={handleLineChange}
            onEquipmentsLoaded={setLineEquipments}
            targetLine={selectedAlarm?.line ?? null}
          />
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <AlarmListPanel
                alarms={filteredAlarms}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <div className="h-72 flex-shrink-0">
              <AlarmDetailPanel alarm={selectedAlarm} />
            </div>
          </div>
        </div>
      </div>
    </AlarmLayout>
  )
}
