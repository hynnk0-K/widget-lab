import { useState } from 'react'
import type { Widget, WidgetType } from './types'

interface Props {
  onAdd: (widget: Omit<Widget, 'id'>) => void
  onClose: () => void
}

const WIDGET_TYPES: { value: WidgetType; label: string; desc: string }[] = [
  { value: 'gauge', label: '게이지', desc: '현재 값을 반원 계기판으로 표시' },
  { value: 'trend', label: '추이', desc: '시간에 따른 변화를 꺾은선으로 표시' },
]

const DEFAULT_CONFIG = {
  gauge: { min: 0, max: 100, warningAt: 80 },
  trend: { hours: 6, intervalMinutes: 5 },
}

const DEFAULT_SIZE = {
  gauge: { w: 3, h: 2 },
  trend: { w: 6, h: 3 },
}

export function AddWidgetModal({ onAdd, onClose }: Props) {
  const [type, setType] = useState<WidgetType>('gauge')
  const [title, setTitle] = useState('')
  const [device, setDevice] = useState('')
  const [metric, setMetric] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !device.trim() || !metric.trim()) return
    onAdd({
      type,
      title: title.trim(),
      source: { device: device.trim(), metric: metric.trim() },
      config: DEFAULT_CONFIG[type],
      x: 0,
      y: 999,  // 홈페이지에서 실제 y 위치로 재계산
      ...DEFAULT_SIZE[type],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-800 m-0">위젯 추가</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 위젯 종류 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-2">위젯 종류</label>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={[
                    'flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all',
                    type === t.value
                      ? 'border-[#003087] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <span className={['text-[13px] font-semibold', type === t.value ? 'text-[#003087]' : 'text-slate-700'].join(' ')}>
                    {t.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">위젯 제목</label>
            <input
              type="text"
              placeholder="예: cnc_1 부하"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors"
              required
            />
          </div>

          {/* 장치 / 메트릭 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">장치 ID</label>
              <input
                type="text"
                placeholder="예: cnc_1"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">메트릭</label>
              <input
                type="text"
                placeholder="예: spindle_load"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-[#003087] transition-colors"
                required
              />
            </div>
          </div>

          {/* 버튼 */}
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
              className="flex-1 h-10 bg-[#003087] text-white rounded-xl text-[13px] font-semibold hover:bg-[#002470] transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
