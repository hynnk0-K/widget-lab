import { ManagementLayout } from '@/shared/ui/ManagementLayout'
import { DataTable } from '@/shared/ui/DataTable'
import type { Column } from '@/shared/ui/DataTable'
import { useSystemConnections } from './model/useSystemConnections'

const COLUMNS: Column[] = [
  { key: 'code', label: '코드', width: '160px' },
  { key: 'name', label: '이름', render: (v) => (v as string) ?? '-' },
  {
    key: 'conn_type',
    label: '유형',
    width: '100px',
    render: (v, row) =>
      (v as string) ?? (String(row.code).toLowerCase().includes('opcua') ? 'OPCUA' : 'DB'),
  },
  {
    key: 'endpoint',
    label: '엔드포인트',
    render: (v) =>
      v ? <span className="font-mono text-[11px] text-slate-500">{v as string}</span> : '-',
  },
  {
    key: 'node_count',
    label: '노드 수',
    width: '100px',
    align: 'right',
    render: (v) => (typeof v === 'number' ? v.toLocaleString('ko-KR') : '-'),
  },
  {
    key: 'last_seen',
    label: '마지막 수신',
    width: '170px',
    render: (v) => (v ? new Date(v as string).toLocaleString('ko-KR', { hour12: false }) : '-'),
  },
  {
    key: 'status',
    label: '상태',
    width: '120px',
    align: 'center',
    render: (v) => {
      const s = v as string
      const connected = s === 'CONNECTED'
      return (
        <span
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
            connected
              ? 'bg-emerald-50 text-emerald-700'
              : s === 'DISCONNECTED'
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-100 text-slate-500',
          ].join(' ')}
        >
          <span
            className={[
              'w-1.5 h-1.5 rounded-full',
              connected ? 'bg-emerald-500' : s === 'DISCONNECTED' ? 'bg-red-500' : 'bg-slate-400',
            ].join(' ')}
          />
          {connected ? '연결됨' : s === 'DISCONNECTED' ? '연결 끊김' : s}
        </span>
      )
    },
  },
]

export function SystemConnectionsPage() {
  const { rows, loading, apiDown, updatedAt } = useSystemConnections()

  return (
    <ManagementLayout section="service">
      <div className="px-4 pt-3 flex items-center justify-between flex-wrap gap-2">
        <p className="m-0 text-[12px] text-slate-400">
          OPC UA · DB 연결 상태 — 10초마다 갱신
          {updatedAt && ` · 마지막 ${updatedAt.toLocaleTimeString('ko-KR', { hour12: false })}`}
        </p>
        {apiDown && (
          <span className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
            연결 상태 API에 접속할 수 없습니다 — 수집 서버가 꺼져 있는지 확인하세요
          </span>
        )}
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows as unknown as Record<string, unknown>[]}
        keyField="code"
        loading={loading}
        emptyLabel={apiDown ? '수집 서버 응답 없음' : '연결 정보가 없습니다'}
        searchPlaceholder="연결 검색"
      />
    </ManagementLayout>
  )
}
