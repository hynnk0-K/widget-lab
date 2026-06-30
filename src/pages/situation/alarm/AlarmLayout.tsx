import type { ReactNode } from 'react'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { SideTabs } from '@/shared/ui/SideTabs'

const ALARM_SUBTABS = [
  { label: '실시간 모니터링', href: '/situation/alarm/realtime' },
  { label: '이력 조회', href: '/situation/alarm/history' },
  { label: '통보 로그', href: '/situation/alarm/notify-log' },
  { label: '실시간 알람/이벤트 처리', href: '/situation/alarm/process' },
  { label: '실시간 알람/이벤트 처리 이력 조회', href: '/situation/alarm/process-history' },
]

export function AlarmLayout({ children }: { children: ReactNode }) {
  return (
    <ManagementLayout section="situation">
      <div className="flex h-full">
        <SideTabs tabs={ALARM_SUBTABS} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </ManagementLayout>
  )
}
