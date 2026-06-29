import type { ReactNode } from 'react'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { SubTabs } from '@/shared/ui/SubTabs'

const REPORT_SUBTABS = [
  { label: '정기보고서', href: '/statistics/report/regular' },
  { label: '사용자 정의 보고서', href: '/statistics/report/custom' },
  { label: '보고서 템플릿 관리', href: '/statistics/report/template' },
]

export function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <ManagementLayout section="statistics">
      <div className="flex flex-col h-full">
        <SubTabs tabs={REPORT_SUBTABS} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ManagementLayout>
  )
}
