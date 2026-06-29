import { ReportLayout } from '../ReportLayout'

export function RegularReportPage() {
  return (
    <ReportLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900">정기보고서</h1>
        <p className="mt-2 text-sm text-slate-500">일/주/월 단위 정기 보고서 — 준비 중</p>
      </div>
    </ReportLayout>
  )
}
