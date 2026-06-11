import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Line { id: number; name: string }
interface Equipment {
  id: number
  line?: Line
  lineId?: number
  lineName?: string
  type: string
  code: string
  name: string
  description?: string
}

const TYPE_LABELS: Record<string, string> = {
  SENSOR: '센서',
  CNC: 'CNC',
  COMPRESSOR: '압축기',
}

const COLUMNS: Column[] = [
  {
    key: 'line',
    label: '라인',
    width: '140px',
    render: (v, row) => {
      const l = v as Line | undefined
      return l?.name ?? (row.lineName as string | undefined) ?? '-'
    },
  },
  {
    key: 'type',
    label: '유형',
    width: '100px',
    render: (v) => TYPE_LABELS[v as string] ?? (v as string) ?? '-',
  },
  { key: 'code', label: '코드 (장치ID)', width: '160px' },
  { key: 'name', label: '이름' },
  { key: 'description', label: '설명' },
]

const EMPTY: Record<string, string> = {
  lineId: '',
  type: '',
  code: '',
  name: '',
  description: '',
}

export function FacilityPage() {
  const [rows, setRows] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<Line[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipment | null>(null)
  const [formValues, setFormValues] = useState(EMPTY)
  const [deleteTargets, setDeleteTargets] = useState<Equipment[]>([])

  useEffect(() => {
    loadRows()
    api.get<Line[]>('/master/lines').then(setLines).catch(() => setLines([]))
  }, [])

  async function loadRows() {
    setLoading(true)
    try {
      setRows(await api.get<Equipment[]>('/master/equipments'))
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
    const r = row as unknown as Equipment
    setEditTarget(r)
    setFormValues({
      lineId: String(r.line?.id ?? r.lineId ?? ''),
      type: r.type ?? '',
      code: r.code,
      name: r.name,
      description: r.description ?? '',
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    const body = {
      lineId: Number(formValues.lineId),
      type: formValues.type,
      code: formValues.code,
      name: formValues.name,
      description: formValues.description,
    }
    if (editTarget) {
      await api.put(`/master/equipments/${editTarget.id}`, body)
    } else {
      await api.post('/master/equipments', body)
    }
    setFormOpen(false)
    loadRows()
  }

  async function handleDelete() {
    for (const t of deleteTargets) {
      await api.delete(`/master/equipments/${t.id}`)
    }
    setDeleteTargets([])
    loadRows()
  }

  const fields: FormField[] = [
    {
      key: 'lineId',
      label: '라인',
      type: 'select',
      required: true,
      options: lines.map((l) => ({ value: String(l.id), label: l.name })),
    },
    {
      key: 'type',
      label: '유형',
      type: 'select',
      required: true,
      options: [
        { value: 'SENSOR', label: '센서' },
        { value: 'CNC', label: 'CNC' },
        { value: 'COMPRESSOR', label: '압축기' },
      ],
    },
    {
      key: 'code',
      label: '코드 (장치ID)',
      type: 'text',
      required: true,
      placeholder: 'cmp_1, cnc_1, AABBCC...',
    },
    { key: 'name', label: '이름', type: 'text', required: true, placeholder: '설비명' },
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
        onDelete={(selected) => setDeleteTargets(selected as unknown as Equipment[])}
        searchPlaceholder="설비 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '설비 수정' : '설비 등록'}
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
              ? `"${deleteTargets[0].name}" 설비를 삭제하시겠습니까?`
              : `선택한 ${deleteTargets.length}개 설비를 삭제하시겠습니까?`
          }
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
