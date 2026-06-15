import { useEffect, useRef, useState } from 'react'
import { api } from '@/shared/lib/api'

interface FactoryImageDto {
  imageBase64?: string | null
}

interface Props {
  factoryId: number
  factoryName: string
  onClose: () => void
}

export function FactoryImageModal({ factoryId, factoryName, onClose }: Props) {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    api
      .get<FactoryImageDto>(`/master/factories/${factoryId}/image`)
      .then((data) => {
        if (active) setImage(data.imageBase64 ?? null)
      })
      .catch(() => {
        if (active) setImage(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [factoryId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setSaving(true)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      api
        .put<FactoryImageDto>(`/master/factories/${factoryId}/image`, { imageBase64: dataUrl })
        .then((data) => setImage(data.imageBase64 ?? dataUrl))
        .catch((err) => setError(err instanceof Error ? err.message : '업로드 실패'))
        .finally(() => setSaving(false))
    }
    reader.onerror = () => {
      setError('파일을 읽을 수 없습니다')
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleDelete() {
    setError('')
    setSaving(true)
    try {
      await api.delete(`/master/factories/${factoryId}/image`)
      setImage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[640px] max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[16px] font-bold text-slate-800 m-0">{factoryName} · 도면 이미지</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center gap-2 text-slate-400 text-[13px]">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#003087] rounded-full animate-spin" />
              불러오는 중...
            </div>
          ) : image ? (
            <img
              src={image}
              alt={`${factoryName} 도면`}
              className="max-h-[420px] w-full object-contain rounded-xl border border-slate-200 bg-slate-50"
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
                <rect x="4" y="6" width="40" height="36" rx="3" />
                <circle cx="16" cy="18" r="3" />
                <path d="M4 32l10-10 8 8 8-8 14 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[13px] text-slate-400 m-0">등록된 도면 이미지가 없습니다</p>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600 m-0">{error}</p>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-slate-200 rounded-xl text-[13px] text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
            {image && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 h-10 border border-red-200 text-red-500 rounded-xl text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {saving ? '처리 중...' : '삭제'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || loading}
              className="flex-1 h-10 bg-[#003087] text-white rounded-xl text-[13px] font-semibold hover:bg-[#002470] transition-colors disabled:opacity-60"
            >
              {saving ? '업로드 중...' : image ? '교체' : '업로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
