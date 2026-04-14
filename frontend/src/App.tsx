import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EnergyMonitor from './pages/EnergyMonitor'
import CarbonAnalysis from './pages/CarbonAnalysis'
import DeviceManagement from './pages/DeviceManagement'
import DataCollection from './pages/DataCollection'
import AlarmCenter from './pages/AlarmCenter'
import ReportCenter from './pages/ReportCenter'
import EmissionFactors from './pages/EmissionFactors'
import SystemSettings from './pages/SystemSettings'
import { useAuthStore } from './store/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="energy-monitor" element={<EnergyMonitor />} />
            <Route path="carbon-analysis" element={<CarbonAnalysis />} />
            <Route path="devices" element={<DeviceManagement />} />
            <Route path="data-collection" element={<DataCollection />} />
            <Route path="alarms" element={<AlarmCenter />} />
            <Route path="reports" element={<ReportCenter />} />
            <Route path="emission-factors" element={<EmissionFactors />} />
            <Route path="areas" element={<SystemSettings />} />
            <Route path="users" element={<SystemSettings />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
