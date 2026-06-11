import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Site { id: number; name: string }
interface Factory {
  id: number
  site?: Site
  siteId?: number
  siteName?: string
  code: string
  name: string
  description?: string
}

const COLUMNS: Column[] = [
  {
    key: 'site',
    label: '사업장',
    width: '160px',
    render: (v, row) => {
      const s = v as Site | undefined
      return s?.name ?? (row.siteName as string | undefined) ?? '-'
    },
  },
  { key: 'code', label: '코드', width: '140px' },
  { key: 'name', label: '이름' },
  { key: 'description', label: '설명' },
]

const EMPTY: Record<string, string> = { siteId: '', code: '', name: '', description: '' }

export function FactoryPage() {
  const [rows, setRows] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Factory | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Factory[]>([])

  useEffect(() => {
    loadRows()
    api.get<Site[]>('/master/sites').then(setSites).catch(() => setSites([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await api.get<Factory[]>('/master/factories'))
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
    const r = row as unknown as Factory
    setEditTarget(r)
    setFormValues({ siteId: String(r.site?.id ?? r.siteId ?? ''), code: r.code, name: r.name, description: r.description ?? '' })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = { siteId: Number(formValues.siteId), code: formValues.code, name: formValues.name, description: formValues.description }
    if (editTarget) {
      await api.put(`/master/factories/${editTarget.id}`, body)
    } else {
      await api.post('/master/factories', body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await api.delete(`/master/factories/${t.id}`)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    { key: 'siteId', label: '사업장', type: 'select', required: true, options: sites.map((s) => ({ value: String(s.id), label: s.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'FACT-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '공장명' },
    { key: 'description', label: '설명', type: 'textarea', placeholder: '설명 (선택)' },
  ]

  return (
    <ManagementLayout section="service">
      <DataTable
        columns={COLUMNS}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as Factory[])}
        searchPlaceholder="공장 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '공장 수정' : '공장 등록'}
          fields={fields}
          values={formValues}
          onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
      {deleteTargets.length > 0 && (
        <ConfirmModal
          message={deleteTargets.length === 1 ? `"${deleteTargets[0].name}" 공장을 삭제하시겠습니까?` : `선택한 ${deleteTargets.length}개 공장을 삭제하시겠습니까?`}
          detail="삭제 시 하위 공정 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
