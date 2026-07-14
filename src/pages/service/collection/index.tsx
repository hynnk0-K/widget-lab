import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import { useCollectionCrud, type CollectionSensorRow } from './model/useCollectionCrud'

const PARENT_LABELS: Record<string, string> = {
  factory: '공장',
  process: '공정',
  line: '라인',
}

const SIGNAL_LABELS: Record<string, string> = {
  ANALOG: '아날로그',
  DIGITAL: '디지털',
  STATUS: '상태',
}

function fmtRange(min: unknown, max: unknown, unit?: string): string {
  const lo = typeof min === 'number' ? min : null
  const hi = typeof max === 'number' ? max : null
  if (lo == null && hi == null) return '-'
  const u = unit ? ` ${unit}` : ''
  return `${lo ?? '−∞'} ~ ${hi ?? '∞'}${u}`
}

const COLUMNS: Column[] = [
  { key: 'code', label: '코드', width: '130px' },
  { key: 'name', label: '이름' },
  { key: 'sensor_type', label: '유형', width: '110px', render: (v) => (v as string) ?? '-' },
  { key: 'unit', label: '단위', width: '80px', render: (v) => (v as string) ?? '-' },
  {
    key: 'signal_type',
    label: '신호',
    width: '90px',
    render: (v) => SIGNAL_LABELS[v as string] ?? (v as string) ?? '-',
  },
  {
    key: 'parent_type',
    label: '소속',
    width: '110px',
    render: (v, row) => {
      const t = PARENT_LABELS[v as string] ?? (v as string) ?? '-'
      const pid = row.parent_id
      return pid != null ? `${t} #${pid}` : t
    },
  },
  {
    key: 'normal_min',
    label: '정상 범위',
    width: '150px',
    render: (_v, row) => fmtRange(row.normal_min, row.normal_max, row.unit as string | undefined),
  },
  {
    key: 'interval_sec',
    label: '주기',
    width: '70px',
    align: 'right',
    render: (v) => (typeof v === 'number' ? `${v}s` : '-'),
  },
  {
    key: 'is_active',
    label: '상태',
    width: '90px',
    align: 'center',
    render: (v) => (
      <span
        className={[
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
          v ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
        ].join(' ')}
      >
        {v ? '활성' : '비활성'}
      </span>
    ),
  },
]

export function CollectionSensorPage() {
  const {
    rows,
    loading,
    formOpen,
    setFormOpen,
    editTarget,
    formValues,
    setFormValues,
    deleteTargets,
    setDeleteTargets,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    fields,
  } = useCollectionCrud()

  return (
    <ManagementLayout section="service">
      <DataTable
        columns={COLUMNS}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as CollectionSensorRow[])}
        searchPlaceholder="수집항목 검색"
      />
      {formOpen && (
        <FormModal
          title={editTarget ? '수집항목 수정' : '수집항목 등록'}
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
              ? `"${deleteTargets[0].name}" 수집항목을 비활성화하시겠습니까?`
              : `선택한 ${deleteTargets.length}개 수집항목을 비활성화하시겠습니까?`
          }
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
