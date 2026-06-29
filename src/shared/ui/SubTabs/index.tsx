import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

interface Tab {
  label: string
  href: string
}

interface Props {
  tabs: Tab[]
}

export function SubTabs({ tabs }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100 flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.href === pathname
        return (
          <button
            key={tab.href}
            onClick={() => navigate(tab.href)}
            className={cn(
              'px-3 py-2 text-[12.5px] font-medium rounded-t transition-colors whitespace-nowrap',
              isActive
                ? 'bg-white text-[#003087] border border-slate-200 border-b-white -mb-px'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
