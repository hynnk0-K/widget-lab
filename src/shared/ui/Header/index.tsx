import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

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
  const [search, setSearch] = useState('')

  return (
    <header className="flex items-center h-[52px] px-5 bg-[#002c6c] flex-shrink-0 z-50 gap-6">
      {/* Logo + 시스템명 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <img src="/logo.svg" alt="Hyundai" height={22} style={{ display: 'block' }} />
        <span className="w-px h-4 bg-white/30" />
        <span className="text-[13px] font-medium text-white/90 whitespace-nowrap">
          통합안전관제시스템
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3.5 py-1.5 text-[13px] rounded whitespace-nowrap transition-colors no-underline',
              activeHref === item.href
                ? 'bg-white/15 border border-white/25 text-white font-medium'
                : 'text-white/65 hover:text-white hover:bg-white/10',
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Search */}
        <div className="flex items-center gap-2 h-8 px-3 bg-white/10 border border-white/20 rounded-md">
          <svg
            className="w-3.5 h-3.5 text-white/50 flex-shrink-0"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="통합 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] text-white placeholder:text-white/45 w-28"
          />
          <span className="text-[11px] text-white/45 border border-white/25 rounded px-1 py-0.5 leading-none">
            ⌘K
          </span>
        </div>

        {/* Refresh */}
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
          <svg
            className="w-[18px] h-[18px]"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" strokeLinecap="round" />
            <path d="M14.5 3.5 L14.6 7.5 L10.6 7.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors relative">
          <svg
            className="w-[18px] h-[18px]"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              d="M10 2a5.5 5.5 0 0 0-5.5 5.5V11l-1.5 2.5h14L15.5 11V7.5A5.5 5.5 0 0 0 10 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M8 13.5a2 2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-semibold leading-none">
            1
          </span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-1.5 pl-1 cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors">
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            KS
          </div>
          <span className="text-[13px] text-white font-medium">김실비</span>
          <svg
            className="w-3 h-3 text-white/50"
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </header>
  )
}
