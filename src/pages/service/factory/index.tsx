import { useNavigate } from 'react-router-dom'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import { useFactoryCrud, type FactoryRow } from './model/useFactoryCrud'

export function FactoryPage() {
  const navigate = useNavigate()
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
  } = useFactoryCrud()

  const columns: Column[] = [
    {
      key: 'site',
      label: '사업장',
      width: '160px',
      render: (v, row) => {
        const s = v as { name: string } | undefined
        return s?.name ?? (row.siteName as string | undefined) ?? '-'
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
            navigate(`/service/factory/${row.id}/map`)
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

  return (
    <ManagementLayout section="service">
      <DataTable
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(selected) => setDeleteTargets(selected as unknown as FactoryRow[])}
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
          message={
            deleteTargets.length === 1
              ? `"${deleteTargets[0].name}" 공장을 삭제하시겠습니까?`
              : `선택한 ${deleteTargets.length}개 공장을 삭제하시겠습니까?`
          }
          detail="삭제 시 하위 공정 데이터에 영향을 줄 수 있습니다."
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}
    </ManagementLayout>
  )
}
