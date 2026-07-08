import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { WidgetGrid } from '@/widgets/dashboard-grid/ui/WidgetGrid'
import { AddWidgetModal } from '@/features/widget-personalize/ui/AddWidgetModal'
import { useHomeDashboard } from './model/useHomeDashboard'

export function HomePage() {
  const {
    layout,
    editMode,
    setEditMode,
    showModal,
    setShowModal,
    saving,
    saveError,
    handleSave,
    handleCancelEdit,
    handleRemove,
    handleLayoutChange,
    handleAddWidget,
  } = useHomeDashboard()

  if (layout === null) {
    return (
      <ManagementLayout section="realtime">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-400">대시보드 불러오는 중...</span>
          </div>
        </div>
      </ManagementLayout>
    )
  }

  return (
    <ManagementLayout section="realtime">
      <div className="flex flex-col gap-3 p-5 h-full">
        <div className="flex items-center justify-between">
          <p className="m-0 text-[12px] text-slate-400">위젯 {layout.widgets.length}개</p>

          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                {saveError && <span className="text-[12px] text-red-500">{saveError}</span>}
                <button
                  onClick={handleCancelEdit}
                  className="h-8 px-4 border border-slate-200 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="h-8 px-4 border border-[#003087] text-[#003087] text-[13px] rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + 위젯 추가
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-4 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors disabled:opacity-60"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="h-8 px-4 border border-slate-200 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 16 16"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25 2 14l.75-3L11.5 2.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                위젯 편집
              </button>
            )}
          </div>
        </div>

        {layout.widgets.length > 0 ? (
          <WidgetGrid
            layout={layout}
            editMode={editMode}
            onRemove={handleRemove}
            onLayoutChange={handleLayoutChange}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[320px] bg-white rounded-xl border-2 border-dashed border-slate-200">
            <svg
              className="w-12 h-12 text-slate-300 mb-3"
              fill="none"
              viewBox="0 0 48 48"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="4" y="4" width="18" height="18" rx="3" />
              <rect x="26" y="4" width="18" height="18" rx="3" />
              <rect x="4" y="26" width="18" height="18" rx="3" />
              <rect x="26" y="26" width="18" height="18" rx="3" />
            </svg>
            <p className="text-[14px] font-medium text-slate-400 m-0">위젯이 없습니다</p>
            <p className="text-[12px] text-slate-300 mt-1 mb-4 m-0">위젯을 추가하세요</p>
            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-5 bg-[#003087] text-white text-[13px] font-medium rounded-lg hover:bg-[#002470] transition-colors"
            >
              + 첫 위젯 추가
            </button>
          </div>
        )}

        {showModal && (
          <AddWidgetModal onAdd={handleAddWidget} onClose={() => setShowModal(false)} />
        )}
      </div>
    </ManagementLayout>
  )
}
