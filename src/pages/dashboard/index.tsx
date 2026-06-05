import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

const SUB_TABS = ['공통코드관리', '회사관리', '사업관리', '다국어관리', '감사로그']

const MOCK_ROWS = [
  { id: 1, code: 'CAM-GJ-PR1-01', example: '예시', path: 'H › 광주 › 프레스1' },
  { id: 2, code: 'CAM-GJ-PR1-01', example: '예시', path: 'H › 광주 › 프레스1' },
]

function ChevronIcon() {
  return (
    <svg
      className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
      fill="none"
      viewBox="0 0 12 12"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('공통코드관리')
  const [selectedRow, setSelectedRow] = useState<number | null>(2)

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <span>시스템관리</span>
        <span className="text-slate-400">›</span>
        <span>공통코드관리</span>
      </nav>

      {/* Title */}
      <h1 className="m-0 text-[20px] font-bold text-slate-900 leading-tight">
        시스템관리 · 공통코드
      </h1>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2 text-[13px] border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-[#003087] text-[#003087] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Filter Row */}
        <div className="flex items-end gap-2 px-4 py-3 border-b border-slate-200">
          {/* 공통코드 Select */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">공통코드</span>
            <div className="relative">
              <select className="h-8 pl-2.5 pr-7 border border-slate-200 rounded text-[13px] text-slate-700 bg-white appearance-none cursor-pointer focus:outline-none focus:border-blue-400 min-w-[110px]">
                <option>-</option>
              </select>
              <ChevronIcon />
            </div>
          </div>

          {/* 예시 Select */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">예시</span>
            <div className="relative">
              <select className="h-8 pl-2.5 pr-7 border border-slate-200 rounded text-[13px] text-slate-700 bg-white appearance-none cursor-pointer focus:outline-none focus:border-blue-400 min-w-[110px]">
                <option>-</option>
              </select>
              <ChevronIcon />
            </div>
          </div>

          {/* Search */}
          <div className="flex h-8 border border-slate-200 rounded overflow-hidden">
            <div className="flex items-center px-2.5 bg-slate-50 border-r border-slate-200">
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="검색"
              className="h-full px-2.5 border-none outline-none text-[13px] text-slate-700 placeholder:text-slate-400 w-36 bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 ml-auto">
            <button className="h-8 px-4 bg-[#003087] text-white text-[13px] font-medium rounded hover:bg-[#002470] transition-colors">
              생성
            </button>
            <button className="h-8 px-4 bg-slate-600 text-white text-[13px] font-medium rounded hover:bg-slate-700 transition-colors">
              수정
            </button>
            <button className="h-8 px-4 bg-red-500 text-white text-[13px] font-medium rounded hover:bg-red-600 transition-colors">
              삭제
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-10 px-4 py-2.5 text-center bg-slate-50 text-[12px] text-slate-500 font-medium border-b border-slate-200">
                <input type="checkbox" className="cursor-pointer" />
              </th>
              <th className="px-4 py-2.5 text-left bg-slate-50 text-[12px] text-slate-500 font-medium border-b border-slate-200">
                공통코드
              </th>
              <th className="px-4 py-2.5 text-left bg-slate-50 text-[12px] text-slate-500 font-medium border-b border-slate-200">
                예시
              </th>
              <th className="px-4 py-2.5 text-left bg-slate-50 text-[12px] text-slate-500 font-medium border-b border-slate-200">
                경로
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((row) => {
              const isSelected = row.id === selectedRow
              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedRow(row.id)}
                  className={cn(
                    'cursor-pointer border-b border-slate-100 last:border-0 transition-colors',
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                  )}
                >
                  <td className="w-10 px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="cursor-pointer accent-[#003087]"
                    />
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5',
                      isSelected ? 'text-blue-800 font-medium' : 'text-slate-700',
                    )}
                  >
                    {row.code}
                  </td>
                  <td
                    className={cn('px-4 py-2.5', isSelected ? 'text-blue-700' : 'text-slate-600')}
                  >
                    {row.example}
                  </td>
                  <td
                    className={cn('px-4 py-2.5', isSelected ? 'text-blue-700' : 'text-slate-600')}
                  >
                    {row.path}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
