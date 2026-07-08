import { useEffect, useState } from 'react'
import type { FormField } from '@/shared/ui/FormModal'
import { listSites } from '@/entities/site/api/siteApi'
import { listFactories, createFactory, updateFactory, deleteFactory } from '@/entities/factory/api/factoryApi'
import type { Factory } from '@/entities/factory/model/types'

interface Site { id: number; name: string }
export interface FactoryRow extends Factory { site?: Site; siteName?: string }

const EMPTY: Record<string, string> = { siteId: '', code: '', name: '', description: '' }

export function useFactoryCrud() {
  const [rows, setRows] = useState<FactoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FactoryRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<FactoryRow[]>([])

  useEffect(() => {
    loadRows()
    listSites().then(setSites).catch(() => setSites([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try { setRows(await listFactories()) }
    catch { setRows([]) }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditTarget(null)
    setFormValues(EMPTY)
    setFormOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    const r = row as unknown as FactoryRow
    setEditTarget(r)
    setFormValues({
      siteId: String(r.site?.id ?? r.siteId ?? ''),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      siteId: Number(formValues.siteId),
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) await updateFactory(editTarget.id, body)
    else await createFactory(body)
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) await deleteFactory(t.id)
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    { key: 'siteId', label: '사업장', type: 'select', required: true, options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'FACT-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '공장명' },
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
