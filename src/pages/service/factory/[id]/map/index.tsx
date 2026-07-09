import { useNavigate, useParams } from 'react-router-dom'
import { LayoutMap } from '@/widgets/layout-map'
import { DiagramMap } from '@/widgets/diagram-map'
import { useFactoryMap } from './model/useFactoryMap'

export function FactoryMapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const factoryId = Number(id)
  const {
    factory, image, processes, loading, error,
    editMode, setEditMode,
    mode, selectMode,
    diagram, equipmentOptions, pins,
    handleDiagramChange, handleImageUpload, handleImageDelete,
    handlePinMove, handlePinResize,
  } = useFactoryMap(factoryId)

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
        <button onClick={() => navigate('/service/factory')} className="mt-3 h-8 px-4 text-[12px] text-red-600 underline">
          공장 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/service/factory')} className="text-[12px] text-slate-400 hover:text-slate-600">
            ← 공장 목록
          </button>
          <h1 className="m-0 mt-1 text-[20px] font-bold text-slate-900 leading-tight">
            {factory?.name ?? '공장'} <span className="text-slate-400 font-normal">도면</span>
          </h1>
          <p className="m-0 text-[12px] text-slate-400 mt-0.5">
            공정 {processes.length}개 · 핀 클릭 시 해당 공정 도면으로 이동
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-[12px]">
            <button
              onClick={() => selectMode('image')}
              className={`h-8 px-3 transition-colors ${mode === 'image' ? 'bg-[#003087] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              이미지
            </button>
            <button
              onClick={() => selectMode('diagram')}
              className={`h-8 px-3 transition-colors border-l border-slate-200 ${mode === 'diagram' ? 'bg-[#003087] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              다이어그램
            </button>
          </div>
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

      {mode === 'image' ? (
        <LayoutMap
          image={image}
          pins={pins}
          editMode={editMode}
          pinStyle="card"
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          onPinMove={handlePinMove}
          onPinResize={handlePinResize}
          onPinClick={(pinId) => navigate(`/service/process/${pinId}/map`)}
        />
      ) : (
        <>
          <DiagramMap
            nodes={diagram.nodes}
            edges={diagram.edges}
            editMode={editMode}
            backgroundImage={image}
            equipmentOptions={equipmentOptions}
            zoneOptions={processes.map((p) => ({ id: p.id, name: p.name }))}
            onZoneClick={(id) => navigate(`/service/process/${id}/map`)}
            onChange={(nodes, edges) => handleDiagramChange({ nodes, edges })}
          />
          {diagram.nodes.some((n) => n.type === 'zone') && (
            <div className="flex items-center gap-2 flex-wrap px-1">
              <span className="text-[11px] text-slate-400 flex-shrink-0">등록된 영역</span>
              {diagram.nodes.filter((n) => n.type === 'zone').map((n) => {
                const linked = n.linkedId ? processes.find((p) => p.id === n.linkedId) : null
                return (
                  <span key={n.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                    {n.label || '(이름 없음)'}
                    {linked && <span className="text-slate-400">· {linked.name}</span>}
                  </span>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
