import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'
import { listProcesses } from '@/entities/process/api/processApi'
import { listLines, createLine, updateLine, deleteLine } from '@/entities/line/api/lineApi'
import type { Line } from '@/entities/line/model/types'

interface Process {
  id: number
  name: string
}
interface LineRow extends Line {
  process?: Process
  processName?: string
}

const EMPTY: Record<string, string> = { processId: '', code: '', name: '', description: '' }

export function LinePage() {
  const navigate = useNavigate()

  const [rows, setRows] = useState<LineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState<Process[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LineRow | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<LineRow[]>([])

  const columns: Column[] = [
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
    {
      key: 'actions',
      label: '도면',
      width: '100px',
      render: (_v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/service/line/${row.id}/map`)
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

  useEffect(() => {
    loadRows()
    listProcesses().then(setProcesses).catch(() => setProcesses([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await listLines())
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
    const r = row as unknown as LineRow
    setEditTarget(r)
    setFormValues({
      processId: String(r.process?.id ?? r.processId ?? ''),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      processId: Number(formValues.processId),
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) {
      await updateLine(editTarget.id, body)
    } else {
      await createLine(body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await deleteLine(t.id)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    {
      key: 'processId',
      label: '공정',
      type: 'select',
      required: true,
      options: processes.map((p) => ({ value: String(p.id), label: p.name })),
    },
    { key: 'code', label: '코드', type: 'text', required: true, placeholder: 'LINE-001' },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '라인명' },
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
        onDelete={(selected) => setDeleteTargets(selected as unknown as LineRow[])}
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
          message={
            deleteTargets.length === 1
              ? `"${deleteTargets[0].name}" 라인을 삭제하시겠습니까?`
              : `선택한 ${deleteTargets.length}개 라인을 삭제하시겠습니까?`
          }
          detail="삭제 시 하위 설비 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
