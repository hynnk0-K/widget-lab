import { useState, useMemo } from 'react'
import { cn } from '@/shared/lib/cn'

export interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface Props {
  columns: Column[]
  rows: Record<string, unknown>[]
  keyField?: string
  loading?: boolean
  onAdd?: () => void
  onEdit?: (row: Record<string, unknown>) => void
  onDelete?: (rows: Record<string, unknown>[]) => void
  emptyLabel?: string
  searchPlaceholder?: string
}

export function DataTable({
  columns,
  rows,
  keyField = 'id',
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  emptyLabel = '데이터가 없습니다',
  searchPlaceholder = '검색',
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) =>
      columns.some((col) => {
        const v = row[col.key]
        if (v == null) return false
        if (typeof v === 'object') return JSON.stringify(v).toLowerCase().includes(q)
        return String(v).toLowerCase().includes(q)
      }),
    )
  }, [rows, columns, search])

  const allKeys = filtered.map((r) => String(r[keyField] ?? ''))
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k))
  const someSelected = allKeys.some((k) => selected.has(k))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allKeys))
    }
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectedRows = filtered.filter((r) => selected.has(String(r[keyField] ?? '')))
  const canEdit = selectedRows.length === 1
  const canDelete = selectedRows.length >= 1

  function handleEdit() {
    if (canEdit && onEdit) onEdit(selectedRows[0])
  }

  function handleDelete() {
    if (canDelete && onDelete) onDelete(selectedRows)
  }

  return (
    <div className="flex flex-col gap-0">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        {/* 검색 */}
        <div className="flex items-center gap-2 h-8 px-3 border border-slate-200 rounded-lg bg-white w-64">
          <svg
            className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-700 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 text-[14px] leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5">
          {onAdd && (
            <button
              onClick={onAdd}
              className="h-8 px-4 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors"
            >
              생성
            </button>
          )}
          {onEdit && (
            <button
              onClick={handleEdit}
              disabled={!canEdit}
              className="h-8 px-4 border border-slate-300 text-[13px] font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              수정
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="h-8 px-4 border border-red-200 text-[13px] font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto px-2 py-2">
        <table className="w-full border-collapse text-[13px] rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-[#003087] cursor-pointer"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-2.5 text-[12px] text-slate-500 font-semibold whitespace-nowrap text-left',
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                        ? 'text-right'
                        : '',
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="w-3.5 h-3.5 bg-slate-100 rounded animate-pulse" />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-16 text-center text-[13px] text-slate-400"
                >
                  {search ? `"${search}"에 대한 결과가 없습니다` : emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const key = String(row[keyField] ?? '')
                const isSelected = selected.has(key)
                return (
                  <tr
                    key={key}
                    onClick={() => toggleRow(key)}
                    className={cn(
                      'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50/70',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-[#003087] cursor-pointer"
                      />
                    </td>
                    {columns.map((col) => {
                      const value = row[col.key]
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-4 py-2.5 text-slate-700',
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                                ? 'text-right'
                                : '',
                          )}
                        >
                          {col.render ? col.render(value, row) : String(value ?? '-')}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 하단 카운트 */}
      {!loading && filtered.length > 0 && (
        <div className="px-6 py-2.5 border-t border-slate-100 flex items-center gap-3">
          <span className="text-[12px] text-slate-400">총 {filtered.length}건</span>
          {selectedRows.length > 0 && (
            <span className="text-[12px] text-[#003087] font-medium">
              {selectedRows.length}개 선택됨
            </span>
          )}
        </div>
      )}
    </div>
  )
}
