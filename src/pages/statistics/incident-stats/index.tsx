import { ManagementLayout } from '@/shared/ui/ManagementLayout'

export function IncidentStatsPage() {
  return (
    <ManagementLayout section="statistics">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900">사고/인시던트 통계</h1>
        <p className="mt-2 text-sm text-slate-500">사고/인시던트 발생·처리 통계 — 준비 중</p>
      </div>
    </ManagementLayout>
  )
}
