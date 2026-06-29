import { AlarmLayout } from '../AlarmLayout'

export function AlarmNotifyLogPage() {
  return (
    <AlarmLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900">알람/이벤트 통보 로그</h1>
        <p className="mt-2 text-sm text-slate-500">SMS/메일/푸시 통보 발송 내역 및 결과 — 준비 중</p>
      </div>
    </AlarmLayout>
  )
}
