import { useState } from 'react'
import styles from './Header.module.css'

const NAV_ITEMS = [
  { label: '실시간 모니터링', href: '/' },
  { label: '상황대응', href: '/situation' },
  { label: '현황/통계', href: '/statistics' },
  { label: '서비스정보관리', href: '/service' },
  { label: '시스템관리', href: '/dashboard' },
]

interface Props {
  activeHref?: string
}

export function Header({ activeHref = '/' }: Props) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>H</span>
          <span className={styles.logoText}>통합안전관제시스템</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${activeHref === item.href ? styles.navItemActive : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className={styles.right}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="통합 검색"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchShortcut}>⌘K</span>
        </div>
        <button className={styles.iconBtn} aria-label="새로고침">⟳</button>
        <button className={styles.iconBtn} aria-label="알림">🔔</button>
        <div className={styles.profile}>
          <span className={styles.profileAvatar}>KS</span>
          <span className={styles.profileName}>김실비</span>
        </div>
      </div>
    </header>
  )
}
