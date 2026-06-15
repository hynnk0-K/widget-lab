import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Factory {
  id: number
  name: string
}
interface Process {
  id: number
  factory?: Factory
  factoryId?: number
  factoryName?: string
  code: string
  name: string
  description?: string
}

const columns: Column[] = [
  {
    key: 'factory',
    label: '공장',
    width: '160px',
    render: (v, row) => {
      const f = v as Factory | undefined
      return f?.name ?? (row.factoryName as string | undefined) ?? '-'
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
          navigate(`/service/process/${row.id}/map`)
        }}
        className="text-[12px] text-[#003087] hover:underline inline-flex items-center gap-1"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="1" y="2" width="10" height="8" rx="1" />
          <circle cx="4" cy="5" r="0.8" />
          <path d="M1 8l3-3 2.5 2.5L8 6l3 3" />
        </svg>
        도면 보기
      </button>
    ),
  },
]

const EMPTY: Record<string, string> = { factoryId: '', code: '', name: '', description: '' }

export function ProcessPage() {
  const [rows, setRows] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [factories, setFactories] = useState<Factory[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Process | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Process[]>([])

  const navigate = useNavigate()

  useEffect(() => {
    loadRows()
    api
      .get<Factory[]>('/master/factories')
      .then(setFactories)
      .catch(() => setFactories([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await api.get<Process[]>('/master/processes'))
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
    const r = row as unknown as Process
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
    if (editTarget) {
      await api.put(`/master/processes/${editTarget.id}`, body)
    } else {
      await api.post('/master/processes', body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await api.delete(`/master/processes/${t.id}`)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    {
      key: 'factoryId',
      label: '공장',
      type: 'select',
      required: true,
      options: factories.map((f) => ({ value: String(f.id), label: f.name })),
    },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'PROC-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '공정명' },
    { key: 'description', label: '설명', type: 'textarea', placeholder: '설명 (선택)' },
  ]

  return (
    <ManagementLayout section="service">
      <DataTable
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as Process[])}
        searchPlaceholder="공정 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '공정 수정' : '공정 등록'}
          fields={fields}
          values={formValues}
          onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
      {deleteTargets.length > 0 && (
        <ConfirmModal
          message={
            deleteTargets.length === 1
              ? `"${deleteTargets[0].name}" 공정을 삭제하시겠습니까?`
              : `선택한 ${deleteTargets.length}개 공정을 삭제하시겠습니까?`
          }
          detail="삭제 시 하위 라인 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
