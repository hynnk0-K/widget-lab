import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormField } from '@/shared/ui/FormModal'
import { processQueries } from '@/entities/process/api/processQueries'
import { lineQueries } from '@/entities/line/api/lineQueries'
import { createLine, updateLine, deleteLine } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'

interface Process { id: number; name: string }
export interface LineRow extends Line { process?: Process; processName?: string }

const EMPTY: Record<string, string> = { processId: '', code: '', name: '', description: '' }

export function useLineCrud() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LineRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<LineRow[]>([])

  const { data: rows = [], isLoading: loading } = useQuery(lineQueries.list())
  const { data: processes = [] } = useQuery(processQueries.list())

  function invalidateRows() {
    return queryClient.invalidateQueries({ queryKey: ['line'] })
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as LineRow
    setEditTarget(r)
    setFormValues({
      processId: String(r.process?.id ?? r.processId ?? ''),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      processId: Number(formValues.processId),
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) await updateLine(editTarget.id, body)
    else await createLine(body)
    setFormOpen(false)
    await invalidateRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteLine(t.id)
    setDeleteTargets([])
    await invalidateRows()
  }

  const fields: FormField[] = [
    { key: 'processId', label: '공정', type: 'select', required: true, options: processes.map((p) => ({ value: String(p.id), label: p.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'LINE-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '라인명' },
    { key: 'description', label: '설명', type: 'textarea', placeholder: '설명 (선택)' },
  ]

  return {
    rows, loading,
    formOpen, setFormOpen,
    editTarget,
    formValues, setFormValues,
    deleteTargets, setDeleteTargets,
    openCreate, openEdit, handleSubmit, handleDelete,
    fields,
  }
}
