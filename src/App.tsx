import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { Layout } from '@/shared/ui/Layout'
import { useAuthStore } from '@/shared/store/auth'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { DashboardPage } from '@/pages/dashboard'
import { AlarmPage } from '@/pages/situation/alarm'
import { AlarmRealtimePage } from '@/pages/situation/alarm/realtime'
import { FactoryPage } from '@/pages/service/factory'
import { FactoryMapPage } from '@/pages/service/factory/[id]/map'
import { ProcessPage } from '@/pages/service/process'
import { ProcessMapPage } from '@/pages/service/process/[id]/map'
import { LinePage } from '@/pages/service/line'
import { LineMapPage } from '@/pages/service/line/[id]/map'
import { FacilityPage } from '@/pages/service/facility'
import { StatisticsPage } from '@/pages/statistics'
import { CompanyPage } from '@/pages/system/company'
import { SitePage } from '@/pages/system/site'

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
                    <Route path="/situation/alarm" element={<AlarmPage />} />
                    <Route path="/situation/alarm/realtime" element={<AlarmRealtimePage />} />
                    <Route path="/service/factory" element={<FactoryPage />} />
                    <Route path="/service/factory/:id/map" element={<FactoryMapPage />} />
                    <Route path="/service/process" element={<ProcessPage />} />
                    <Route path="/service/process/:id/map" element={<ProcessMapPage />} />
                    <Route path="/service/line" element={<LinePage />} />
                    <Route path="/service/line/:id/map" element={<LineMapPage />} />
                    <Route path="/service/facility" element={<FacilityPage />} />
                    <Route path="/statistics" element={<StatisticsPage />} />
                    <Route path="/system/company" element={<CompanyPage />} />
                    <Route path="/system/site" element={<SitePage />} />
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
