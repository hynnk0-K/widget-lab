import { useNavigate, useParams } from 'react-router-dom'
import { DiagramMap } from '@/widgets/diagram-map'
import { useLineMap } from './model/useLineMap'

export function LineMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lineId = Number(id)
  const {
    line, image, equipments, liveMap, loading, error,
    editMode, setEditMode,
    diagram, showBg, bgUploading, bgError, bgFileInputRef,
    handleImageDelete, handleBgFileChange, handleDiagramChange, toggleShowBg,
  } = useLineMap(lineId)

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
        <button onClick={() => navigate('/service/line')} className="mt-3 h-8 px-4 text-[12px] text-red-600 underline">
          라인 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/service/line')} className="text-[12px] text-slate-400 hover:text-slate-600">
              ← 라인 목록
            </button>
          </div>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {line?.name ?? '라인'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            설비 {equipments.length}개 · 실시간 연결 {Object.values(liveMap).filter((l) => l.hasData).length}개
          </p>
        </div>

        <div className="flex items-center gap-2">
          {image && (
            <button
              onClick={toggleShowBg}
              className={`h-8 px-3 text-[12px] rounded-lg border transition-colors ${showBg ? 'bg-[#003087] text-white border-[#003087]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              배경 이미지 {showBg ? '켜짐' : '꺼짐'}
            </button>
          )}
          {editMode && (
            <>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgFileChange}
                disabled={bgUploading}
                className="hidden"
                id="bg-file-input"
              />
              <label htmlFor="bg-file-input" className="h-8 px-3 text-[12px] bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center">
                {bgUploading ? '업로드 중...' : image ? '배경 변경' : '배경 업로드'}
              </label>
              {image && (
                <button onClick={handleImageDelete} className="h-8 px-3 text-[12px] text-red-500 border border-slate-200 rounded-lg hover:bg-red-50 transition-colors">
                  배경 삭제
                </button>
              )}
            </>
          )}
          {bgError && <span className="text-[11px] text-red-500">{bgError}</span>}
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

      <DiagramMap
        nodes={diagram.nodes}
        edges={diagram.edges}
        editMode={editMode}
        equipmentOptions={equipments.map((eq) => ({ code: eq.code, name: eq.name }))}
        backgroundImage={showBg ? image : null}
        onChange={(nodes, edges) => handleDiagramChange({ nodes, edges })}
      />
    </div>
  )
}
