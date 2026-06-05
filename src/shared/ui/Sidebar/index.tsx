import { useState } from 'react'

interface SelectFieldProps {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}

function SelectField({ label, options, value, onChange }: SelectFieldProps) {
  const [focused, setFocused] = useState(false)
  const floated = focused || Boolean(value)

  return (
    <div className="relative mb-3 last:mb-0">
      <select
        className="w-full h-[36px] px-2 py-1 border border-slate-200 rounded-lg bg-white text-[13px] text-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-blue-400 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <option value="" disabled hidden />
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
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

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

const INITIAL_FAVORITES = ['울산5공장', '아산공장', '광주공장']

export function Sidebar() {
  const [corporation, setCorporation] = useState('')
  const [plant, setPlant] = useState('')
  const [factory, setFactory] = useState('')
  const [line, setLine] = useState('')
  const [equipment, setEquipment] = useState('')
  const [measurePoint, setMeasurePoint] = useState('')
  const [area, setArea] = useState('')
  const [facility, setFacility] = useState('')
  const [sensor, setSensor] = useState('')
  const [favorites, setFavorites] = useState(INITIAL_FAVORITES)

  const removeFavorite = (name: string) => setFavorites((prev) => prev.filter((f) => f !== name))

  return (
    <aside className="w-[210px] flex-shrink-0 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-y-auto flex flex-col">
      {/* 법인/사업장/공장 선택 */}
      <section className="px-4 pt-4 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[12px] font-semibold text-slate-700">법인/사업장/공장 선택</h3>
          <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <PanelIcon />
          </button>
        </div>

        <SelectField
          label="법인"
          options={['HYUNDAI', 'KIA']}
          value={corporation}
          onChange={setCorporation}
        />
        <SelectField
          label="사업장"
          options={['울산공장', '아산공장', '전주공장']}
          value={plant}
          onChange={setPlant}
        />
        <SelectField
          label="공장"
          options={['5공장', '1공장', '2공장']}
          value={factory}
          onChange={setFactory}
        />
        <SelectField
          label="라인"
          options={['도장공정', 'A라인', 'B라인']}
          value={line}
          onChange={setLine}
        />
        <SelectField
          label="장비"
          options={['A라인', 'B라인', 'C라인']}
          value={equipment}
          onChange={setEquipment}
        />
        <SelectField
          label="측정포인트"
          options={['A라인', 'B라인', 'C라인']}
          value={measurePoint}
          onChange={setMeasurePoint}
        />
      </section>

      {/* 카테고리 선택 */}
      <section className="px-4 pt-4 pb-5 border-b border-slate-100">
        <h3 className="text-[13px] font-semibold text-slate-700 mb-4">카테고리 선택</h3>

        <SelectField
          label="영역"
          options={['환경', '안전', '보건']}
          value={area}
          onChange={setArea}
        />
        <SelectField
          label="설비"
          options={['대기', '수질', '토양']}
          value={facility}
          onChange={setFacility}
        />
        <SelectField
          label="센서"
          options={['대기질', '대기월', '수질일']}
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
    </aside>
  )
}
