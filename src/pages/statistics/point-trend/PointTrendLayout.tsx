import type { ReactNode } from 'react'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { SubTabs } from '@/shared/ui/SubTabs'

const POINT_TREND_SUBTABS = [
  { label: '다중센서 트렌드 비교', href: '/statistics/point-trend/multi-sensor-compare' },
  { label: '통계분석', href: '/statistics/point-trend/stats-analysis' },
  { label: '이상치분석', href: '/statistics/point-trend/anomaly-analysis' },
]

export function PointTrendLayout({ children }: { children: ReactNode }) {
  return (
    <ManagementLayout section="statistics">
      <div className="flex flex-col h-full">
        <SubTabs tabs={POINT_TREND_SUBTABS} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ManagementLayout>
  )
}
