import { useNavigate, useParams } from 'react-router-dom'
import { LayoutMap } from '@/widgets/layout-map'
import { useCompanyMap } from './model/useCompanyMap'

export function CompanyMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const companyId = Number(id)
  const {
    company, image, sites, loading, error,
    editMode, setEditMode,
    pins, handleImageUpload, handleImageDelete,
  } = useCompanyMap(companyId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[480px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-slate-400">도면 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-red-50 rounded-xl border border-red-200">
        <p className="text-[14px] text-red-600 m-0">{error}</p>
        <button onClick={() => navigate('/system/company')} className="mt-3 h-8 px-4 text-[12px] text-red-600 underline">
          법인 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/system/company')} className="text-[12px] text-slate-400 hover:text-slate-600">
            ← 법인 목록
          </button>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {company?.name ?? '법인'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            사업장 {sites.length}개 · 핀 클릭 시 해당 사업장 도면으로 이동
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <button onClick={() => setEditMode(false)} className="h-8 px-4 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors">
              편집 종료
            </button>
          ) : (
            <button onClick={() => setEditMode(true)} className="h-8 px-4 border border-slate-200 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25 2 14l.75-3L11.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              도면 편집
            </button>
          )}
        </div>
      </div>

      <LayoutMap
        image={image}
        pins={pins}
        editMode={editMode}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
        onPinClick={(pinId) => navigate(`/system/site/${pinId}/map`)}
      />
    </div>
  )
}
