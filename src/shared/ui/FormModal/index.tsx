import { useState } from 'react'

export interface FormField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  disabled?: boolean
}

interface Props {
  title: string
  fields: FormField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onSubmit: () => Promise<void>
  onClose: () => void
  submitLabel?: string
  error?: string
}

export function FormModal({
  title,
  fields,
  values,
  onChange,
  onSubmit,
  onClose,
  submitLabel = '저장',
  error,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [internalError, setInternalError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInternalError('')
    setLoading(true)
    try {
      await onSubmit()
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : '처리 실패')
      setLoading(false)
    }
  }

  const displayError = error || internalError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[480px] max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[16px] font-bold text-slate-800 m-0">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                  disabled={field.disabled}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#003087] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    선택하세요
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                  disabled={field.disabled}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors resize-none disabled:opacity-50"
                />
              ) : (
                <input
                  type={field.type}
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  required={field.required}
                  disabled={field.disabled}
                  placeholder={field.placeholder}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors disabled:opacity-50"
                />
              )}
            </div>
          ))}

          {displayError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600 m-0">{displayError}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-slate-200 rounded-xl text-[13px] text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 bg-[#003087] text-white rounded-xl text-[13px] font-semibold hover:bg-[#002470] transition-colors disabled:opacity-60"
            >
              {loading ? '저장 중...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
