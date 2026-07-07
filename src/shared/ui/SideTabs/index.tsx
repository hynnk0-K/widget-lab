import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

interface Tab {
  label: string
  href: string
}

interface Props {
  tabs: Tab[]
}

export function SideTabs({ tabs }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="w-[200px] flex-shrink-0 border-r border-slate-100 py-2 overflow-y-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <button
            key={tab.href}
            onClick={() => navigate(tab.href)}
            className={cn(
              'w-full text-left px-4 py-2.5 text-[12.5px] font-medium transition-colors border-l-2',
              isActive
                ? 'bg-blue-50 text-[#003087] border-[#003087]'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
