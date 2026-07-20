import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { companyQueries } from '@/entities/company/api/companyQueries'
import { createCompany, updateCompany, deleteCompany } from '@/entities/company/api/companyApi'
import type { Company } from '@/entities/company/model/types'

const EMPTY: Record<string, string> = { code: '', name: '', description: '' }

export function useCompanyCrud() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Company | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Company[]>([])

  const { data: rows = [], isLoading: loading } = useQuery(companyQueries.list())

  function invalidateRows() {
    return queryClient.invalidateQueries({ queryKey: ['company'] })
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as Company
    setEditTarget(r)
    setFormValues({ code: r.code, name: r.name, description: r.description ?? '' })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = { code: formValues.code, name: formValues.name, description: formValues.description }
    if (editTarget) await updateCompany(editTarget.id, body)
    else await createCompany(body)
    setFormOpen(false)
    await invalidateRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteCompany(t.id)
    setDeleteTargets([])
    await invalidateRows()
  }

  return {
    rows, loading,
    formOpen, setFormOpen,
    editTarget,
    formValues, setFormValues,
    deleteTargets, setDeleteTargets,
    openCreate, openEdit, handleSubmit, handleDelete,
  }
}
