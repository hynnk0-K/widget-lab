import { useState } from 'react'
import styles from './Sidebar.module.css'

interface SelectFieldProps {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}

function SelectField({ label, options, value, onChange }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

const FAVORITE_PLANTS = ['울산5공장', '여산공장', '광주공장']

export function Sidebar() {
  const [corporation, setCorporation] = useState('HYUNDAI')
  const [plant, setPlant] = useState('울산공장')
  const [factory, setFactory] = useState('5공장')
  const [line, setLine] = useState('공장작업장')
  const [measurePoint, setMeasurePoint] = useState('A라인')
  const [area, setArea] = useState('환경')
  const [equipment, setEquipment] = useState('대기')
  const [sensor, setSensor] = useState('대기일')
  const [favorites, setFavorites] = useState(FAVORITE_PLANTS)

  const removeFavorite = (name: string) => {
    setFavorites((prev) => prev.filter((f) => f !== name))
  }

  return (
    <aside className={styles.sidebar}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>법인/사업장/공장 선택</h3>
        <div className={styles.collapseBtn}>
          <span>◀</span>
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
          options={['공장작업장', 'A라인', 'B라인']}
          value={line}
          onChange={setLine}
        />
        <SelectField
          label="측정포인트"
          options={['A라인', 'B라인', 'C라인']}
          value={measurePoint}
          onChange={setMeasurePoint}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>카테고리 선택</h3>
        <SelectField
          label="영역"
          options={['환경', '안전', '보건']}
          value={area}
          onChange={setArea}
        />
        <SelectField
          label="설비"
          options={['대기', '수질', '토양']}
          value={equipment}
          onChange={setEquipment}
        />
        <SelectField
          label="센서"
          options={['대기일', '대기월', '수질일']}
          value={sensor}
          onChange={setSensor}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>즐겨찾는 공장</h3>
        <div className={styles.tags}>
          {favorites.map((name) => (
            <span key={name} className={styles.tag}>
              ★ {name}
              <button className={styles.tagRemove} onClick={() => removeFavorite(name)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <button className={styles.addBtn}>+ 추가</button>
      </section>
    </aside>
  )
}
