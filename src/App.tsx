import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { Layout } from '@/shared/ui/Layout'
import { HomePage } from '@/pages/home'
import { DashboardPage } from '@/pages/dashboard'

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </Providers>
  )
}

export default App
