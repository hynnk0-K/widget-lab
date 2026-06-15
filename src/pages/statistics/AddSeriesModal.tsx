import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { METRIC_LABELS, type EquipmentLive } from '.'

interface EquipmentLiveDetail {
  id: number
  code: string
  name: string
  equipmentType: string
  latest: Record<string, unknown>
}

interface Props {
  devices: EquipmentLive[]
  onAdd: (deviceCode: string, deviceName: string, deviceType: string, metric: string) => void
  onClose: () => void
}

const TYPE_LABEL: Record<string, string> = {
  CNC: 'CNC',
  COMPRESSOR: '압축기',
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function AddSeriesModal({ devices, onAdd, onClose }: Props) {
  const [deviceCode, setDeviceCode] = useState('')
  const [metrics, setMetrics] = useState<string[]>([])
  const [metric, setMetric] = useState('')
  const [metricsLoading, setMetricsLoading] = useState(false)

  useEffect(() => {
    if (!deviceCode) {
      setMetrics([])
      setMetric('')
      return
    }
    let active = true
    setMetricsLoading(true)
    api
      .get<EquipmentLiveDetail>(`/equipment-live/${deviceCode}`)
      .then((detail) => {
        if (!active) return
        const keys = Object.keys(detail.latest ?? {}).filter((k) => k !== 'ts')
        setMetrics(keys)
      })
      .catch(() => {
        if (active) setMetrics([])
      })
      .finally(() => {
        if (active) setMetricsLoading(false)
      })
    return () => {
      active = false
    }
  }, [deviceCode])

  const selectedDevice = devices.find((d) => d.code === deviceCode)
  const deviceGroups = groupBy(devices, (d) => d.equipmentType)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!deviceCode || !metric || !selectedDevice) return
    onAdd(deviceCode, selectedDevice.name, selectedDevice.equipmentType, metric)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-800 m-0">시리즈 추가</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 설비 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">설비</label>
            <select
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              required
              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-[#003087]"
            >
              <option value="" disabled>
                설비 선택
              </option>
              {Object.entries(deviceGroups).map(([type, group]) => (
                <optgroup key={type} label={TYPE_LABEL[type] ?? type}>
                  {group.map((d) => (
                    <option key={d.code} value={d.code} disabled={!d.hasData}>
                      {d.name} ({d.code}){!d.hasData ? ' — 데이터 없음' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 메트릭 */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
              측정 항목
            </label>
            {metricsLoading ? (
              <div className="h-9 border border-slate-200 rounded-lg flex items-center px-3 gap-2 text-slate-400 text-[12px]">
                <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                측정 항목 불러오는 중...
              </div>
            ) : (
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                disabled={!deviceCode || metrics.length === 0}
                required
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-[#003087] disabled:opacity-50"
              >
                <option value="" disabled>
                  {!deviceCode ? '설비를 먼저 선택하세요' : '측정 항목 선택'}
                </option>
                {metrics.map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABELS[m] ?? m}
                  </option>
                ))}
              </select>
            )}
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
              disabled={!deviceCode || !metric}
              className="flex-1 h-10 bg-[#003087] text-white rounded-xl text-[13px] font-semibold hover:bg-[#002470] transition-colors disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
