import { NodeResizer, type NodeProps } from '@xyflow/react'

export function GroupNode({ data, selected }: NodeProps) {
  return (
    <div className="w-full h-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60">
      <NodeResizer isVisible={selected} minWidth={160} minHeight={120} />
      <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">
        {String(data.label ?? '그룹')}
      </div>
    </div>
  )
}
