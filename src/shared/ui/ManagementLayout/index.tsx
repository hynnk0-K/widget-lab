import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

interface Tab {
  label: string
  href: string
}

const SECTION_CONFIG: Record<
  'situation' | 'service' | 'system' | 'statistics' | 'realtime',
  { label: string; tabs: Tab[] }
> = {
  realtime: {
    label: '실시간 모니터링',
    tabs: [
      { label: '대시보드', href: '/realtime/dashboard' },
      { label: '체감온도', href: '/realtime/wbgt' },
      { label: '밀폐공간 유해가스', href: '/realtime/gas' },
      { label: '이동형 모션센서', href: '/realtime/motion' },
      { label: '도시가스 정압실', href: '/realtime/citygas' },
      { label: '환경설비', href: '/realtime/environment' },
      { label: '안전장치', href: '/realtime/safety' },
      { label: '소방설비', href: '/realtime/firefighting' },
      { label: '장비 통신상태', href: '/realtime/comm-status' },
      { label: '외부 솔루션 연계', href: '/realtime/external' },
    ],
  },
  situation: {
    label: '상황대응',
    tabs: [{ label: '알람/이벤트', href: '/situation/alarm' }],
  },
  statistics: {
    label: '현황/통계',
    tabs: [
      { label: '알람/이벤트 통계', href: '/statistics/alarm-stats' },
      { label: '사고/인시던트 통계', href: '/statistics/incident-stats' },
      { label: '디바이스/설비별 이력', href: '/statistics/device-history' },
      { label: '포인트 시계열 차트', href: '/statistics/point-trend' },
      { label: '리포트', href: '/statistics/report' },
    ],
  },
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
  '/realtime/dashboard',
  '/realtime/wbgt',
  '/realtime/gas',
  '/realtime/motion',
  '/realtime/citygas',
  '/realtime/environment',
  '/realtime/safety',
  '/realtime/firefighting',
  '/realtime/comm-status',
  '/realtime/external',
  '/situation/alarm',
  '/statistics/alarm-stats',
  '/statistics/incident-stats',
  '/statistics/device-history',
  '/statistics/point-trend',
  '/statistics/report',
  '/service/factory',
  '/service/process',
  '/service/line',
  '/service/facility',
  '/system/company',
  '/system/site',
])

interface Props {
  section: 'situation' | 'service' | 'system' | 'statistics' | 'realtime'
  children: ReactNode
}

export function ManagementLayout({ section, children }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const config = SECTION_CONFIG[section]
  // 서브탭이 있는 메뉴(예: /situation/alarm/realtime)도 부모 탭이 active로 표시되도록 prefix 매칭
  const activeTab = config.tabs.find(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  )

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex-shrink-0">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 px-6 pt-4 pb-1 text-[12px] text-slate-400 select-none">
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
        <div className="flex justify-between flex-shrink-0 mb-2">
          <div className="px-6">
            <h1 className="text-[22px] font-bold text-slate-800 m-0">
              {config.label}
              <span className="text-slate-300 mx-2">·</span>
              {activeTab?.label ?? ''}
            </h1>
          </div>
          {/* 탭 네비게이션 */}
          <div className="flex items-end gap-0 px-6 flex-shrink-0 flex-wrap justify-end max-w-[90%]">
            {config.tabs.map((tab) => {
              const isActive = tab === activeTab
              const isAvailable = IMPLEMENTED.has(tab.href)
              return (
                <button
                  key={tab.href}
                  onClick={() => isAvailable && navigate(tab.href)}
                  className={cn(
                    'relative px-4 py-2 text-[13px] font-medium transition-colors whitespace-nowrap border-b-2',
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
        </div>
      </div>
      {/* 콘텐츠 */}
      <div className="flex flex-col flex-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-auto">
        {children}
      </div>
    </div>
  )
}
