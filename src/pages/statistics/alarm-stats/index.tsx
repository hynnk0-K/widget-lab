import { ManagementLayout } from '@/shared/ui/ManagementLayout'

export function AlarmStatsPage() {
  return (
    <ManagementLayout section="statistics">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900">알람/이벤트 통계</h1>
        <p className="mt-2 text-sm text-slate-500">기간/심각도/설비별 알람 발생 통계 — 준비 중</p>
      </div>
    </ManagementLayout>
  )
}
