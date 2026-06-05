import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/shared/ui/Header'
import { Sidebar } from '@/shared/ui/Sidebar'

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
    </div>
  )
}
