import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/shared/ui/Header'
import { Sidebar } from '@/shared/ui/Sidebar'
// ponytail: shared layer가 features/alarm-notify를 참조하는 FSD 경계 예외 — 전역 레이아웃에서
// 알람 스낵바를 한 번만 마운트해야 해서 불가피. 더 엄격하게 하려면 app/ 레이어에서 합성할 것.
import { AlarmSnackbarContainer } from '@/features/alarm-notify/ui/AlarmSnackbar'

interface Props {
  children: ReactNode
}

export function Layout({ children }: Props) {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <Header activeHref={pathname} />
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <AlarmSnackbarContainer />
    </div>
  )
}
