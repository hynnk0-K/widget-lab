import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { api } from '@/shared/lib/api'

interface MasterTreeNode {
  type: string
  id: number
  code: string
  name: string
  children?: MasterTreeNode[]
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

function SelectField({ label, options, value, onChange, disabled = false }: SelectFieldProps) {
  const [focused, setFocused] = useState(false)
  const floated = focused || Boolean(value)

  return (
    <div className="relative mb-3 last:mb-0">
      <select
        className={cn(
          'w-full h-[36px] px-2 py-1 border border-slate-200 rounded-lg bg-white text-[13px] text-slate-800 appearance-none focus:outline-none focus:border-blue-400 transition-colors',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled || options.length === 0}
      >
        <option value="" disabled hidden />
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <span
        className={[
          'absolute left-3 text-slate-400 pointer-events-none bg-white transition-all duration-150',
          floated
            ? '-top-[4px] px-1 text-[11px] leading-none'
            : 'top-1/2 -translate-y-1/2 text-[13px]',
        ].join(' ')}
      >
        {label}
      </span>

      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
        fill="none"
        viewBox="0 0 12 12"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PanelIcon({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={flipped ? { transform: 'scaleX(-1)' } : undefined}
    >
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="14.5"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function getDescendants(nodes: MasterTreeNode[], targetType: string): MasterTreeNode[] {
  const result: MasterTreeNode[] = []
  for (const node of nodes) {
    if (node.type === targetType) {
      result.push(node)
    } else if (node.children?.length) {
      result.push(...getDescendants(node.children, targetType))
    }
  }
  return result
}

function toOptions(nodes: MasterTreeNode[]): SelectOption[] {
  return nodes.map((n) => ({ value: String(n.id), label: n.name }))
}

const INITIAL_FAVORITES = ['울산5공장', '아산공장', '광주공장']

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [tree, setTree] = useState<MasterTreeNode[]>([])

  const [companyId, setCompanyId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [factoryId, setFactoryId] = useState('')
  const [lineId, setLineId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')

  const [area, setArea] = useState('')
  const [facility, setFacility] = useState('')
  const [sensor, setSensor] = useState('')
  const [favorites, setFavorites] = useState(INITIAL_FAVORITES)

  useEffect(() => {
    api
      .get<MasterTreeNode[]>('/master/tree')
      .then((data) => setTree(data))
      .catch(() => setTree([]))
  }, [])

  const companies = tree.filter((n) => n.type === 'company')
  const selectedCompany = companies.find((n) => String(n.id) === companyId)
  const sites = selectedCompany?.children?.filter((n) => n.type === 'site') ?? []
  const selectedSite = sites.find((n) => String(n.id) === siteId)
  const factories = selectedSite?.children?.filter((n) => n.type === 'factory') ?? []
  const selectedFactory = factories.find((n) => String(n.id) === factoryId)
  const lines = selectedFactory ? getDescendants([selectedFactory], 'line') : []
  const selectedLine = lines.find((n) => String(n.id) === lineId)
  const equipment = selectedLine?.children?.filter((n) => n.type === 'equipment') ?? []

  function handleCompanyChange(id: string) {
    setCompanyId(id)
    setSiteId('')
    setFactoryId('')
    setLineId('')
    setEquipmentId('')
  }

  function handleSiteChange(id: string) {
    setSiteId(id)
    setFactoryId('')
    setLineId('')
    setEquipmentId('')
  }

  function handleFactoryChange(id: string) {
    setFactoryId(id)
    setLineId('')
    setEquipmentId('')
  }

  function handleLineChange(id: string) {
    setLineId(id)
    setEquipmentId('')
  }

  const removeFavorite = (name: string) => setFavorites((prev) => prev.filter((f) => f !== name))

  return (
    <aside
      className={cn(
        'flex-shrink-0 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col transition-[width] duration-200 overflow-hidden',
        collapsed ? 'w-[44px]' : 'w-[210px]',
      )}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          title="사이드바 열기"
          className="w-full flex items-center justify-center py-3.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <PanelIcon flipped />
        </button>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* 법인/사업장/공장 선택 */}
          <section className="px-4 pt-4 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-semibold text-slate-700">법인/사업장/공장 선택</h3>
              <button
                onClick={() => setCollapsed(true)}
                title="사이드바 닫기"
                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <PanelIcon />
              </button>
            </div>

            <SelectField
              label="법인"
              options={toOptions(companies)}
              value={companyId}
              onChange={handleCompanyChange}
            />
            <SelectField
              label="사업장"
              options={toOptions(sites)}
              value={siteId}
              onChange={handleSiteChange}
              disabled={!companyId}
            />
            <SelectField
              label="공장"
              options={toOptions(factories)}
              value={factoryId}
              onChange={handleFactoryChange}
              disabled={!siteId}
            />
            <SelectField
              label="라인"
              options={toOptions(lines)}
              value={lineId}
              onChange={handleLineChange}
              disabled={!factoryId}
            />
            <SelectField
              label="장비"
              options={toOptions(equipment)}
              value={equipmentId}
              onChange={setEquipmentId}
              disabled={!lineId}
            />
          </section>

          {/* 카테고리 선택 */}
          <section className="px-4 pt-4 pb-5 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-4">카테고리 선택</h3>

            <SelectField
              label="영역"
              options={[
                { value: 'env', label: '환경' },
                { value: 'safety', label: '안전' },
                { value: 'health', label: '보건' },
              ]}
              value={area}
              onChange={setArea}
            />
            <SelectField
              label="설비"
              options={[
                { value: 'air', label: '대기' },
                { value: 'water', label: '수질' },
                { value: 'soil', label: '토양' },
              ]}
              value={facility}
              onChange={setFacility}
            />
            <SelectField
              label="센서"
              options={[
                { value: 'air_day', label: '대기질' },
                { value: 'air_month', label: '대기월' },
                { value: 'water_day', label: '수질일' },
              ]}
              value={sensor}
              onChange={setSensor}
            />
          </section>

          {/* 즐겨찾는 공장 */}
          <section className="px-4 pt-4 pb-5">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-3">즐겨찾는 공장</h3>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {favorites.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700"
                >
                  <span className="text-yellow-400 leading-none">★</span>
                  <span>{name}</span>
                  <button
                    onClick={() => removeFavorite(name)}
                    className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 leading-none text-[14px] ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button className="w-full h-8 border border-slate-200 rounded-full text-[13px] text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              + 추가
            </button>
          </section>
        </div>
      )}
    </aside>
  )
}
