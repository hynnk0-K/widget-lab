import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Box,
  Fan,
  Gauge,
  Flame,
  Wind,
  Database,
  ToggleLeft,
  Filter,
  Cog,
} from 'lucide-react'

export const ICON_OPTIONS = [
  { key: 'pump', label: '펌프', icon: Fan },
  { key: 'valve', label: '밸브', icon: ToggleLeft },
  { key: 'tank', label: '탱크', icon: Database },
  { key: 'motor', label: '모터', icon: Cog },
  { key: 'sensor', label: '센서', icon: Gauge },
  { key: 'heater', label: '히터', icon: Flame },
  { key: 'compressor', label: '압축기', icon: Wind },
  { key: 'filter', label: '필터', icon: Filter },
  { key: 'generic', label: '장비', icon: Box },
] as const

export type IconKey = (typeof ICON_OPTIONS)[number]['key']

const ICON_MAP: Record<string, (typeof ICON_OPTIONS)[number]['icon']> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.key, o.icon]),
)

export function EquipmentNode({ data, selected }: NodeProps) {
  const Icon = ICON_MAP[data.icon as string] ?? Box
  const alarmStatus = data.alarmStatus as 'critical' | 'warning' | undefined
  const isTargetAlarm = Boolean(data.selected)

  const borderClass = isTargetAlarm
    ? 'border-blue-500 ring-4 ring-blue-200'
    : alarmStatus === 'critical'
      ? 'border-red-500'
      : alarmStatus === 'warning'
        ? 'border-amber-500'
        : selected
          ? 'border-[#003087] ring-2 ring-blue-200'
          : 'border-slate-300'

  return (
    <div
      className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border bg-white ${borderClass}`}
    >
      {alarmStatus && (
        <span
          className={`absolute -inset-1 rounded-lg animate-ping opacity-40 ${
            alarmStatus === 'critical' ? 'bg-red-400' : 'bg-amber-400'
          }`}
        />
      )}
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Icon
        className={`relative w-6 h-6 ${
          alarmStatus === 'critical'
            ? 'text-red-600'
            : alarmStatus === 'warning'
              ? 'text-amber-600'
              : 'text-slate-700'
        }`}
      />
      <span className="relative text-[11px] text-slate-700 whitespace-nowrap">
        {String(data.label ?? '')}
      </span>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  )
}
