import { useEffect, useState } from 'react'
import type { FormField } from '@/shared/ui/FormModal'
import { listCompanies } from '@/entities/company/api/companyApi'
import { listSites, createSite, updateSite, deleteSite } from '@/entities/site/api/siteApi'
import type { Site } from '@/entities/site/model/types'

interface Company { id: number; name: string }
export interface SiteRow extends Site { company?: Company; companyName?: string }

const EMPTY: Record<string, string> = { companyId: '', code: '', name: '', description: '' }

export function useSiteCrud() {
  const [rows, setRows] = useState<SiteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SiteRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<SiteRow[]>([])

  useEffect(() => {
    loadRows()
    listCompanies().then(setCompanies).catch(() => setCompanies([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try { setRows(await listSites()) }
    catch { setRows([]) }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as SiteRow
    setEditTarget(r)
    setFormValues({
      companyId: String(r.company?.id ?? r.companyId ?? ''),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      companyId: Number(formValues.companyId),
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) await updateSite(editTarget.id, body)
    else await createSite(body)
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteSite(t.id)
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    { key: 'companyId', label: '법인', type: 'select', required: true, options: companies.map((c) => ({ value: String(c.id), label: c.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'SITE-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '사업장명' },
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
