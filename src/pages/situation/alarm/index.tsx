import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import { FormModal } from '@/shared/ui/FormModal'
import { ConfirmModal } from '@/shared/ui/ConfirmModal'
import type { Column } from '@/shared/ui/DataTable'
import type { FormField } from '@/shared/ui/FormModal'

interface Alarm {
  id: number
  code: string
  name: string
  description?: string
}

interface Event {
  id: number
  code: string
  name: string
  description?: string
}

const COLUMNS: Column[] = [
  { key: 'code', label: '코드', width: '140px' },
  { key: 'name', label: '이름' },
  { key: 'description', label: '설명' },
]

const EMPTY: Record<string, string> = {
  code: '',
  name: '',
  description: '',
}

export function AlarmPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/alarms')
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <ManagementLayout section="situation">
      <DataTable columns={COLUMNS} rows={rows} loading={loading} />
    </ManagementLayout>
  )
}
