import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { Layout } from '@/shared/ui/Layout'
import { useAuthStore } from '@/shared/store/auth'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { DashboardPage } from '@/pages/dashboard'
import { AlarmRealtimePage } from '@/pages/situation/alarm/realtime'
import { AlarmHistoryPage } from '@/pages/situation/alarm/history'
import { AlarmNotifyLogPage } from '@/pages/situation/alarm/notify-log'
import { AlarmProcessPage } from '@/pages/situation/alarm/process'
import { AlarmProcessHistoryPage } from '@/pages/situation/alarm/process-history'
import { FactoryPage } from '@/pages/service/factory'
import { FactoryMapPage } from '@/pages/service/factory/[id]/map'
import { ProcessPage } from '@/pages/service/process'
import { ProcessMapPage } from '@/pages/service/process/[id]/map'
import { LinePage } from '@/pages/service/line'
import { LineMapPage } from '@/pages/service/line/[id]/map'
import { FacilityPage } from '@/pages/service/facility'
import { AlarmStatsPage } from '@/pages/statistics/alarm-stats'
import { IncidentStatsPage } from '@/pages/statistics/incident-stats'
import { DeviceHistoryPage } from '@/pages/statistics/device-history'
import { MultiSensorComparePage } from '@/pages/statistics/point-trend/multi-sensor-compare'
import { StatsAnalysisPage } from '@/pages/statistics/point-trend/stats-analysis'
import { AnomalyAnalysisPage } from '@/pages/statistics/point-trend/anomaly-analysis'
import { RegularReportPage } from '@/pages/statistics/report/regular'
import { CustomReportPage } from '@/pages/statistics/report/custom'
import { ReportTemplatePage } from '@/pages/statistics/report/template'
import { CompanyPage } from '@/pages/system/company'
import { SitePage } from '@/pages/system/site'

import { TsdbComparePage } from '@/pages/demo/tsdb-compare'

function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route
                      path="/situation/alarm"
                      element={<Navigate to="/situation/alarm/realtime" replace />}
                    />
                    <Route path="/situation/alarm/realtime" element={<AlarmRealtimePage />} />
                    <Route path="/situation/alarm/history" element={<AlarmHistoryPage />} />
                    <Route path="/situation/alarm/notify-log" element={<AlarmNotifyLogPage />} />
                    <Route path="/situation/alarm/process" element={<AlarmProcessPage />} />
                    <Route
                      path="/situation/alarm/process-history"
                      element={<AlarmProcessHistoryPage />}
                    />
                    <Route path="/service/factory" element={<FactoryPage />} />
                    <Route path="/service/factory/:id/map" element={<FactoryMapPage />} />
                    <Route path="/service/process" element={<ProcessPage />} />
                    <Route path="/service/process/:id/map" element={<ProcessMapPage />} />
                    <Route path="/service/line" element={<LinePage />} />
                    <Route path="/service/line/:id/map" element={<LineMapPage />} />
                    <Route path="/service/facility" element={<FacilityPage />} />
                    <Route
                      path="/statistics"
                      element={<Navigate to="/statistics/alarm-stats" replace />}
                    />
                    <Route path="/statistics/alarm-stats" element={<AlarmStatsPage />} />
                    <Route path="/statistics/incident-stats" element={<IncidentStatsPage />} />
                    <Route path="/statistics/device-history" element={<DeviceHistoryPage />} />
                    <Route
                      path="/statistics/point-trend"
                      element={
                        <Navigate to="/statistics/point-trend/multi-sensor-compare" replace />
                      }
                    />
                    <Route
                      path="/statistics/point-trend/multi-sensor-compare"
                      element={<MultiSensorComparePage />}
                    />
                    <Route
                      path="/statistics/point-trend/stats-analysis"
                      element={<StatsAnalysisPage />}
                    />
                    <Route
                      path="/statistics/point-trend/anomaly-analysis"
                      element={<AnomalyAnalysisPage />}
                    />
                    <Route
                      path="/statistics/report"
                      element={<Navigate to="/statistics/report/regular" replace />}
                    />
                    <Route path="/statistics/report/regular" element={<RegularReportPage />} />
                    <Route path="/statistics/report/custom" element={<CustomReportPage />} />
                    <Route path="/statistics/report/template" element={<ReportTemplatePage />} />
                    <Route path="/system/company" element={<CompanyPage />} />
                    <Route path="/system/site" element={<SitePage />} />
                    <Route path="/demo/tsdb-compare" element={<TsdbComparePage />} />
                  </Routes>
                </Layout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}

export default App
