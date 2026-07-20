import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormField } from '@/shared/ui/FormModal'
import { factoryQueries } from '@/entities/factory/api/factoryQueries'
import { processQueries } from '@/entities/process/api/processQueries'
import { createProcess, updateProcess, deleteProcess } from '@/entities/process/api/processApi'
import type { Process } from '@/entities/process/model/types'

interface Factory { id: number; name: string }
export interface ProcessRow extends Process { factory?: Factory; factoryName?: string }

const EMPTY: Record<string, string> = { factoryId: '', code: '', name: '', description: '' }

export function useProcessCrud() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProcessRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<ProcessRow[]>([])

  const { data: rows = [], isLoading: loading } = useQuery(processQueries.list())
  const { data: factories = [] } = useQuery(factoryQueries.list())

  function invalidateRows() {
    return queryClient.invalidateQueries({ queryKey: ['process'] })
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as ProcessRow
    setEditTarget(r)
    setFormValues({
      factoryId: String(r.factory?.id ?? r.factoryId ?? ''),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      factoryId: Number(formValues.factoryId),
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) await updateProcess(editTarget.id, body)
    else await createProcess(body)
    setFormOpen(false)
    await invalidateRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteProcess(t.id)
    setDeleteTargets([])
    await invalidateRows()
  }

  const fields: FormField[] = [
    { key: 'factoryId', label: '공장', type: 'select', required: true, options: factories.map((f) => ({ value: String(f.id), label: f.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'PROC-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '공정명' },
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
