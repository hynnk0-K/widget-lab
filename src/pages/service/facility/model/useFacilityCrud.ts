import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormField } from '@/shared/ui/FormModal'
import { api } from '@/shared/lib/api'
import { lineQueries } from '@/entities/line/api/lineQueries'

interface Line {
  id: number
  name: string
}
export interface Equipment {
  id: number
  line?: Line
  lineId?: number
  lineName?: string
  type: string
  code: string
  name: string
  description?: string
}

const EMPTY: Record<string, string> = { lineId: '', type: '', code: '', name: '', description: '' }

export function useFacilityCrud() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipment | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Equipment[]>([])

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['equipment', 'list', null],
    queryFn: () => api.get<Equipment[]>('/master/equipments'),
  })
  const { data: lines = [] } = useQuery(lineQueries.list()) as { data: Line[] }

  function invalidateRows() {
    return queryClient.invalidateQueries({ queryKey: ['equipment'] })
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as Equipment
    setEditTarget(r)
    setFormValues({
      lineId: String(r.line?.id ?? r.lineId ?? ''),
      type: r.type ?? '',
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      lineId: Number(formValues.lineId),
      type: formValues.type,
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) await api.put(`/master/equipments/${editTarget.id}`, body)
    else await api.post('/master/equipments', body)
    setFormOpen(false)
    await invalidateRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await api.delete(`/master/equipments/${t.id}`)
    setDeleteTargets([])
    await invalidateRows()
  }

  const fields: FormField[] = [
    {
      key: 'lineId',
      label: '라인',
      type: 'select',
      required: true,
      options: lines.map((l) => ({ value: String(l.id), label: l.name })),
    },
    {
      key: 'type',
      label: '유형',
      type: 'select',
      required: true,
      options: [
        { value: 'SENSOR', label: '센서' },
        { value: 'CNC', label: 'CNC' },
        { value: 'COMPRESSOR', label: '압축기' },
      ],
    },
    {
      key: 'code',
      label: '코드 (장치ID)',
      type: 'text',
      required: true,
      placeholder: 'cmp_1, cnc_1, AABBCC...',
    },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '설비명' },
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
