import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Process { id: number; name: string }
interface Line {
  id: number
  process?: Process
  processId?: number
  processName?: string
  code: string
  name: string
  description?: string
}

const COLUMNS: Column[] = [
  {
    key: 'process',
    label: '공정',
    width: '160px',
    render: (v, row) => {
      const p = v as Process | undefined
      return p?.name ?? (row.processName as string | undefined) ?? '-'
    },
  },
  { key: 'code', label: '코드', width: '140px' },
  { key: 'name', label: '이름' },
  { key: 'description', label: '설명' },
]

const EMPTY: Record<string, string> = { processId: '', code: '', name: '', description: '' }

export function LinePage() {
  const [rows, setRows] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState<Process[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Line | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Line[]>([])

  useEffect(() => {
    loadRows()
    api.get<Process[]>('/master/processes').then(setProcesses).catch(() => setProcesses([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await api.get<Line[]>('/master/lines'))
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
    const r = row as unknown as Line
    setEditTarget(r)
    setFormValues({ processId: String(r.process?.id ?? r.processId ?? ''), code: r.code, name: r.name, description: r.description ?? '' })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = { processId: Number(formValues.processId), code: formValues.code, name: formValues.name, description: formValues.description }
    if (editTarget) {
      await api.put(`/master/lines/${editTarget.id}`, body)
    } else {
      await api.post('/master/lines', body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await api.delete(`/master/lines/${t.id}`)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    { key: 'processId', label: '공정', type: 'select', required: true, options: processes.map((p) => ({ value: String(p.id), label: p.name })) },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'LINE-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '라인명' },
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
        onDelete={(selected) => setDeleteTargets(selected as unknown as Line[])}
        searchPlaceholder="라인 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '라인 수정' : '라인 등록'}
          fields={fields}
          values={formValues}
          onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
      {deleteTargets.length > 0 && (
        <ConfirmModal
          message={deleteTargets.length === 1 ? `"${deleteTargets[0].name}" 라인을 삭제하시겠습니까?` : `선택한 ${deleteTargets.length}개 라인을 삭제하시겠습니까?`}
          detail="삭제 시 하위 설비 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
