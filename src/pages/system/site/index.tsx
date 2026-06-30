import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'
import { listCompanies } from '@/entities/company/api/companyApi'
import { listSites, createSite, updateSite, deleteSite } from '@/entities/site/api/siteApi'
import type { Site } from '@/entities/site/model/types'

interface Company { id: number; name: string }
interface SiteRow extends Site {
  company?: Company
  companyName?: string
}

const EMPTY: Record<string, string> = { companyId: '', code: '', name: '', description: '' }

export function SitePage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<SiteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SiteRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<SiteRow[]>([])

  const columns: Column[] = [
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
    {
      key: 'actions',
      label: '도면',
      width: '100px',
      render: (_v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/system/site/${row.id}/map`)
          }}
          className="text-[12px] text-[#003087] hover:underline inline-flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
            <rect x="1" y="2" width="10" height="8" rx="1" />
            <circle cx="4" cy="5" r="0.8" />
            <path d="M1 8l3-3 2.5 2.5L8 6l3 3" />
          </svg>
          도면 보기
        </button>
      ),
    },
  ]

  useEffect(() => {
    loadRows()
    listCompanies().then(setCompanies).catch(() => setCompanies([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await listSites())
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
    const body = { companyId: Number(formValues.companyId), code: formValues.code, name: formValues.name, description: formValues.description }
    if (editTarget) {
      await updateSite(editTarget.id, body)
    } else {
      await createSite(body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await deleteSite(t.id)
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
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as SiteRow[])}
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
