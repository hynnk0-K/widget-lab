import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

interface Tab {
  label: string
  href: string
}

const SECTION_CONFIG: Record<
  'service' | 'system',
  { label: string; tabs: Tab[] }
> = {
  service: {
    label: '서비스정보관리',
    tabs: [
      { label: '공장관리', href: '/service/factory' },
      { label: '공정관리', href: '/service/process' },
      { label: '라인관리', href: '/service/line' },
      { label: '시설관리', href: '/service/facility' },
    ],
  },
  system: {
    label: '시스템관리',
    tabs: [
      { label: '공통코드관리', href: '/system/common-code' },
      { label: '회사관리', href: '/system/company' },
      { label: '사업장관리', href: '/system/site' },
      { label: '다국어관리', href: '/system/locale' },
      { label: '감사로그', href: '/system/audit' },
    ],
  },
}

const IMPLEMENTED = new Set([
  '/service/factory',
  '/service/process',
  '/service/line',
  '/service/facility',
  '/system/company',
  '/system/site',
])

interface Props {
  section: 'service' | 'system'
  children: ReactNode
}

export function ManagementLayout({ section, children }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const config = SECTION_CONFIG[section]
  const activeTab = config.tabs.find((t) => t.href === pathname)

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1.5 px-6 pt-5 pb-1 text-[12px] text-slate-400 select-none">
        <span>{config.label}</span>
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-slate-600 font-medium">{activeTab?.label ?? ''}</span>
      </div>

      {/* 페이지 타이틀 */}
      <div className="px-6 pb-4">
        <h1 className="text-[22px] font-bold text-slate-800 m-0">
          {config.label}
          <span className="text-slate-300 mx-2">·</span>
          {activeTab?.label ?? ''}
        </h1>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex items-end gap-0 px-6 border-b border-slate-200 flex-shrink-0">
        {config.tabs.map((tab) => {
          const isActive = tab.href === pathname
          const isAvailable = IMPLEMENTED.has(tab.href)
          return (
            <button
              key={tab.href}
              onClick={() => isAvailable && navigate(tab.href)}
              className={cn(
                'relative px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap border-b-2',
                isActive
                  ? 'text-[#003087] border-[#003087]'
                  : isAvailable
                    ? 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                    : 'text-slate-300 border-transparent cursor-default',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
