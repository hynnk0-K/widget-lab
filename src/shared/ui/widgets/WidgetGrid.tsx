import { GridLayout, useContainerWidth } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { cn } from '@/shared/lib/cn'
import { GaugeWidget } from './GaugeWidget'
import { TrendWidget } from './TrendWidget'
import { StatCard } from './StatCard'
import { StatusBadge } from './StatusBadge'
import { CounterCard } from './CounterCard'
import { MiniBar } from './MiniBar'
import { HeatmapHour } from './HeatmapHour'
import type { DashboardLayout, Widget } from './types'

interface Props {
  layout: DashboardLayout
  editMode: boolean
  onRemove: (id: string) => void
  onLayoutChange: (widgets: Widget[]) => void
}

export function WidgetGrid({ layout, editMode, onRemove, onLayoutChange }: Props) {
  const { width, containerRef, mounted } = useContainerWidth()

  const rglLayout: LayoutItem[] = layout.widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 2,
  }))

  // 드래그/리사이즈가 완전히 끝났을 때만 부모 상태를 업데이트
  // (onLayoutChange를 사용하면 드래그 중 부모 re-render → props 변경 → 내부 상태 리셋 → 드래그 끊김)
  function commitLayout(newLayout: Layout) {
    const updated = layout.widgets.map((w) => {
      const item = newLayout.find((l) => l.i === w.id)
      if (!item) return w
      return { ...w, x: item.x, y: item.y, w: item.w, h: item.h }
    })
    onLayoutChange(updated)
  }

  return (
    <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={rglLayout}
          gridConfig={{ cols: 12, rowHeight: 110, margin: [12, 12] as const }}
          dragConfig={{ enabled: editMode, handle: '.widget-drag-handle' }}
          resizeConfig={{ enabled: editMode }}
          onDragStop={commitLayout}
          onResizeStop={commitLayout}
        >
          {layout.widgets.map((widget) => (
            <div
              key={widget.id}
              className={cn(
                'bg-white rounded-xl border border-slate-200 shadow-sm relative',
                editMode && 'ring-2 ring-[#003087]/20',
              )}
            >
              {editMode && (
                <div
                  className="widget-drag-handle absolute inset-x-0 top-0 h-9 z-10 cursor-grab active:cursor-grabbing flex items-center justify-center"
                  title="드래그하여 이동"
                >
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="5.5" cy="4" r="1.2" />
                    <circle cx="10.5" cy="4" r="1.2" />
                    <circle cx="5.5" cy="8" r="1.2" />
                    <circle cx="10.5" cy="8" r="1.2" />
                    <circle cx="5.5" cy="12" r="1.2" />
                    <circle cx="10.5" cy="12" r="1.2" />
                  </svg>
                </div>
              )}

              <div className="h-full overflow-hidden rounded-xl">
                {widget.type === 'gauge' && <GaugeWidget widget={widget} />}
                {widget.type === 'trend' && <TrendWidget widget={widget} />}
                {widget.type === 'stat' && <StatCard widget={widget} />}
                {widget.type === 'status' && <StatusBadge widget={widget} />}
                {widget.type === 'counter' && <CounterCard widget={widget} />}
                {widget.type === 'minibar' && <MiniBar widget={widget} />}
                {widget.type === 'heatmap' && <HeatmapHour widget={widget} />}
              </div>

              {editMode && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onRemove(widget.id)}
                  className="absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-[14px] leading-none hover:bg-red-600 transition-colors shadow-sm"
                  title="위젯 삭제"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}
