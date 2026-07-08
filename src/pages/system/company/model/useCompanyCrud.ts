import { useEffect, useState } from 'react'
import { listCompanies, createCompany, updateCompany, deleteCompany } from '@/entities/company/api/companyApi'
import type { Company } from '@/entities/company/model/types'

const EMPTY: Record<string, string> = { code: '', name: '', description: '' }

export function useCompanyCrud() {
  const [rows, setRows] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Company | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Company[]>([])

  useEffect(() => { loadRows() }, [])

  async function loadRows() {
    setLoading(true)
    try { setRows(await listCompanies()) }
    catch { setRows([]) }
    finally { setLoading(false) }
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
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteCompany(t.id)
    setDeleteTargets([])
    loadRows()
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
