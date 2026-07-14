import { useEffect, useState } from 'react'
import type { FormField } from '@/shared/ui/FormModal'
import { api } from '@/shared/lib/api'

// 목록/단건 응답은 DB 로우(snake_case), 등록/수정 요청은 DTO(camelCase)
export interface CollectionSensorRow {
  id: number
  code: string
  name: string
  sensor_type?: string
  unit?: string
  signal_type?: string
  parent_type?: string
  parent_id?: number
  interval_sec?: number
  normal_min?: number
  normal_max?: number
  warning_min?: number
  warning_max?: number
  critical_min?: number
  critical_max?: number
  reversed?: boolean
  description?: string
  is_active?: boolean
}

interface NamedEntity {
  id: number
  name: string
}

const EMPTY: Record<string, string> = {
  code: '',
  name: '',
  sensorType: '',
  unit: '',
  signalType: 'ANALOG',
  parentType: 'line',
  parentId: '',
  intervalSec: '60',
  normalMin: '',
  normalMax: '',
  warningMin: '',
  warningMax: '',
  criticalMin: '',
  criticalMax: '',
  reversed: 'false',
  description: '',
}

function numOrNull(v: string): number | null {
  const t = v.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? null : n
}

export function useCollectionCrud() {
  const [rows, setRows] = useState<CollectionSensorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [factories, setFactories] = useState<NamedEntity[]>([])
  const [processes, setProcesses] = useState<NamedEntity[]>([])
  const [lines, setLines] = useState<NamedEntity[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CollectionSensorRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<CollectionSensorRow[]>([])

  useEffect(() => {
    loadRows()
    api
      .get<NamedEntity[]>('/master/factories')
      .then(setFactories)
      .catch(() => setFactories([]))
    api
      .get<NamedEntity[]>('/master/processes')
      .then(setProcesses)
      .catch(() => setProcesses([]))
    api
      .get<NamedEntity[]>('/master/lines')
      .then(setLines)
      .catch(() => setLines([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      // activeOnly=false: 비활성(soft delete) 항목도 표시
      setRows(await api.get<CollectionSensorRow[]>('/collection/sensors?activeOnly=false'))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as CollectionSensorRow
    setEditTarget(r)
    setFormValues({
      code: r.code,
      name: r.name ?? '',
      sensorType: r.sensor_type ?? '',
      unit: r.unit ?? '',
      signalType: r.signal_type ?? 'ANALOG',
      parentType: r.parent_type ?? 'line',
      parentId: r.parent_id != null ? String(r.parent_id) : '',
      intervalSec: r.interval_sec != null ? String(r.interval_sec) : '60',
      normalMin: r.normal_min != null ? String(r.normal_min) : '',
      normalMax: r.normal_max != null ? String(r.normal_max) : '',
      warningMin: r.warning_min != null ? String(r.warning_min) : '',
      warningMax: r.warning_max != null ? String(r.warning_max) : '',
      criticalMin: r.critical_min != null ? String(r.critical_min) : '',
      criticalMax: r.critical_max != null ? String(r.critical_max) : '',
      reversed: r.reversed ? 'true' : 'false',
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      sensorType: formValues.sensorType.trim() || null,
      unit: formValues.unit.trim() || null,
      signalType: formValues.signalType || null,
      parentType: formValues.parentType || null,
      parentId: numOrNull(formValues.parentId),
      intervalSec: numOrNull(formValues.intervalSec) ?? 60,
      normalMin: numOrNull(formValues.normalMin),
      normalMax: numOrNull(formValues.normalMax),
      warningMin: numOrNull(formValues.warningMin),
      warningMax: numOrNull(formValues.warningMax),
      criticalMin: numOrNull(formValues.criticalMin),
      criticalMax: numOrNull(formValues.criticalMax),
      reversed: formValues.reversed === 'true',
      description: formValues.description.trim() || null,
      isActive: true,
    }
    if (editTarget) await api.put(`/collection/sensors/${editTarget.id}`, body)
    else await api.post('/collection/sensors', body)
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await api.delete(`/collection/sensors/${t.id}`)
    setDeleteTargets([])
    loadRows()
  }

  const parentOptions =
    formValues.parentType === 'factory'
      ? factories
      : formValues.parentType === 'process'
        ? processes
        : lines

  const fields: FormField[] = [
    {
      key: 'code',
      label: '코드 (센서ID)',
      type: 'text',
      required: true,
      placeholder: 'WBGT_101, AIR_001...',
      disabled: !!editTarget, // 코드는 TDengine 서브테이블 태그라 수정 불가
    },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '센서명' },
    {
      key: 'sensorType',
      label: '센서 유형',
      type: 'text',
      placeholder: 'wbgt, airclean, drainage...',
    },
    { key: 'unit', label: '단위', type: 'text', placeholder: '°C, %, ppm, mmH₂O...' },
    {
      key: 'signalType',
      label: '신호 유형',
      type: 'select',
      options: [
        { value: 'ANALOG', label: '아날로그' },
        { value: 'DIGITAL', label: '디지털' },
        { value: 'STATUS', label: '상태' },
      ],
    },
    {
      key: 'parentType',
      label: '소속 계층',
      type: 'select',
      options: [
        { value: 'factory', label: '공장' },
        { value: 'process', label: '공정' },
        { value: 'line', label: '라인' },
      ],
    },
    {
      key: 'parentId',
      label: '소속 대상',
      type: 'select',
      options: parentOptions.map((e) => ({ value: String(e.id), label: e.name })),
    },
    { key: 'intervalSec', label: '수집 주기 (초)', type: 'number', placeholder: '60' },
    { key: 'normalMin', label: '정상 하한', type: 'number', placeholder: '비워두면 미설정' },
    { key: 'normalMax', label: '정상 상한', type: 'number', placeholder: '비워두면 미설정' },
    { key: 'warningMin', label: '경고 하한', type: 'number' },
    { key: 'warningMax', label: '경고 상한', type: 'number' },
    { key: 'criticalMin', label: '위험 하한', type: 'number' },
    { key: 'criticalMax', label: '위험 상한', type: 'number' },
    {
      key: 'reversed',
      label: '역방향 임계 (낮을수록 위험)',
      type: 'select',
      options: [
        { value: 'false', label: '아니오 (높을수록 위험)' },
        { value: 'true', label: '예 (낮을수록 위험)' },
      ],
    },
    { key: 'description', label: '설명', type: 'textarea', placeholder: '설명 (선택)' },
  ]

  return {
    rows,
    loading,
    formOpen,
    setFormOpen,
    editTarget,
    formValues,
    setFormValues,
    deleteTargets,
    setDeleteTargets,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    fields,
  }
}
