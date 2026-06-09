import { GaugeWidget } from './GaugeWidget'
import { TrendWidget } from './TrendWidget'
import type { DashboardLayout, Widget } from './types'

interface Props {
  layout: DashboardLayout
  editMode: boolean
  onRemove: (id: string) => void
}

function WidgetCard({
  widget,
  editMode,
  onRemove,
}: {
  widget: Widget
  editMode: boolean
  onRemove: (id: string) => void
}) {
  return (
    <div
      style={{
        gridColumn: `${widget.x + 1} / span ${widget.w}`,
        gridRow: `${widget.y + 1} / span ${widget.h}`,
      }}
      className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group"
    >
      {widget.type === 'gauge' && <GaugeWidget widget={widget} />}
      {widget.type === 'trend' && <TrendWidget widget={widget} />}

      {editMode && (
        <button
          onClick={() => onRemove(widget.id)}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-[14px] leading-none hover:bg-red-600 transition-colors shadow-sm"
          title="위젯 삭제"
        >
          ×
        </button>
      )}

      {editMode && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-[#003087]/30 ring-inset pointer-events-none" />
      )}
    </div>
  )
}

export function WidgetGrid({ layout, editMode, onRemove }: Props) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: '110px' }}
    >
      {layout.widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} editMode={editMode} onRemove={onRemove} />
      ))}
    </div>
  )
}
