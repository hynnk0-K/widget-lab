import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Company { id: number; name: string }
interface Site {
  id: number
  company?: Company
  companyId?: number
  companyName?: string
  code: string
  name: string
  description?: string
}

const COLUMNS: Column[] = [
  {
    key: 'company',
    label: '법인',
    width: '160px',
    render: (v, row) => {
      const c = v as Company | undefined
      return c?.name ?? (row.companyName as string | undefined) ?? '-'
    },
  },
  { key: 'code', label: '코드', width: '140px' },
  { key: 'name', label: '이름' },
  { key: 'description', label: '설명' },
]

const EMPTY: Record<string, string> = { companyId: '', code: '', name: '', description: '' }

export function SitePage() {
  const [rows, setRows] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Site | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Site[]>([])

  useEffect(() => {
    loadRows()
    api.get<Company[]>('/master/companies').then(setCompanies).catch(() => setCompanies([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await api.get<Site[]>('/master/sites'))
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
    const r = row as unknown as Site
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
    const body = { companyId: Number(formValues.companyId), code: formValues.code, name: formValues.name, description: formValues.description }
    if (editTarget) {
      await api.put(`/master/sites/${editTarget.id}`, body)
    } else {
      await api.post('/master/sites', body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await api.delete(`/master/sites/${t.id}`)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    { key: 'companyId', label: '법인', type: 'select', required: true, options: companies.map((c) => ({ value: String(c.id), label: c.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'SITE-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '사업장명' },
    { key: 'description', label: '설명', type: 'textarea', placeholder: '설명 (선택)' },
  ]

  return (
    <ManagementLayout section="system">
      <DataTable
        columns={COLUMNS}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as Site[])}
        searchPlaceholder="사업장 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '사업장 수정' : '사업장 등록'}
          fields={fields}
          values={formValues}
          onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
      {deleteTargets.length > 0 && (
        <ConfirmModal
          message={deleteTargets.length === 1 ? `"${deleteTargets[0].name}" 사업장을 삭제하시겠습니까?` : `선택한 ${deleteTargets.length}개 사업장을 삭제하시겠습니까?`}
          detail="삭제 시 하위 공장 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
