import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/shared/ui/Header'
import { Sidebar } from '@/shared/ui/Sidebar'
import styles from './Layout.module.css'

interface Props {
  children: ReactNode
}

export function Layout({ children }: Props) {
  const { pathname } = useLocation()

  return (
    <div className={styles.root}>
      <Header activeHref={pathname} />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
