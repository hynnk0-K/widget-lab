import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import { useFacilityCrud, type Equipment } from './model/useFacilityCrud'

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
      const l = v as { name: string } | undefined
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

export function FacilityPage() {
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
  } = useFacilityCrud()

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
