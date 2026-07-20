import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/entities/user/model/authStore'

const NAV_ITEMS = [
  { label: '실시간 모니터링', href: '/realtime/dashboard', exact: false },
  { label: '상황대응', href: '/situation/alarm', exact: false },
  { label: '현황/통계', href: '/statistics', exact: false },
  { label: '서비스정보관리', href: '/service/factory', exact: false },
  { label: '시스템관리', href: '/system/company', exact: false },
]

interface Props {
  activeHref?: string
}

function initials(name: string) {
  if (!name) return '?'
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed
  // 한글 이름: 성 + 이름 첫 글자
  return trimmed[0] + trimmed[trimmed.length - 1]
}

export function Header({ activeHref = '/' }: Props) {
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // 토큰이 만료됐어도 로컬 정리 후 이동
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center h-[52px] px-5 bg-[#002c6c] flex-shrink-0 z-50 gap-6">
      {/* Logo + 시스템명 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <img src="/logo.svg" alt="Hyundai" height={20} style={{ display: 'block' }} />
        <span className="w-px h-4 bg-white/30" />
        <span className="text-[14px] font-medium text-white/90 whitespace-nowrap">
          통합안전관제시스템
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? activeHref === item.href
            : activeHref.startsWith(item.href.split('/').slice(0, 2).join('/'))
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center px-3.5 py-1.5 text-[13px] rounded whitespace-nowrap transition-colors no-underline',
                isActive
                  ? 'bg-white/15 border border-white/25 text-white font-medium'
                  : 'text-white/65 hover:text-white hover:bg-white/10',
              )}
            >
              {item.label}
            </Link>
          )
        })}
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
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-1.5 pl-1 hover:bg-white/10 rounded px-2 py-1 transition-colors"
          >
            <div className="w-7 h-7 bg-[#003087] border border-white/30 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              {initials(user?.displayName ?? '')}
            </div>
            <span className="text-[13px] text-white font-medium">{user?.displayName ?? ''}</span>
            <svg
              className="w-3 h-3 text-white/50"
              fill="none"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M2 4l4 4 4-4" strokeLinecap="round" />
            </svg>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-[13px] font-semibold text-slate-800 m-0">
                    {user?.displayName}
                  </p>
                  <p className="text-[11px] text-slate-400 m-0">{user?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
