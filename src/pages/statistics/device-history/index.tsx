import { ManagementLayout } from '@/shared/ui/ManagementLayout'

export function DeviceHistoryPage() {
  return (
    <ManagementLayout section="statistics">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900">디바이스/설비별 이력</h1>
        <p className="mt-2 text-sm text-slate-500">설비별 가동/점검/이상 이력 조회 — 준비 중</p>
      </div>
    </ManagementLayout>
  )
}
