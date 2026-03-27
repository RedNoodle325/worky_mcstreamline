import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/Toast'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Sites } from './pages/Sites'
import { SiteDetail } from './pages/SiteDetail'
import { SiteForm } from './pages/SiteForm'
import { UnitDetail } from './pages/UnitDetail'
import { UnitForm } from './pages/UnitForm'
import { Contacts } from './pages/Contacts'
import { CSTickets } from './pages/CSTickets'
import { Issues } from './pages/Issues'
import { Notes } from './pages/Notes'
import { Todos } from './pages/Todos'
import { Schedule } from './pages/Schedule'
import { MSOW } from './pages/MSOW'
import { Tickets } from './pages/Tickets'
import { TicketDetail } from './pages/TicketDetail'
import { Contractors } from './pages/Contractors'
import { ContractorDetail } from './pages/ContractorDetail'
import { BOM } from './pages/BOM'
import { Warranty } from './pages/Warranty'
import { WarrantyDetail } from './pages/WarrantyDetail'
import { Report } from './pages/Report'

// Global toast context so pages can call toast() without prop drilling
type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void
export const ToastContext = createContext<ToastFn>(() => {})
export function useToastFn() { return useContext(ToastContext) }

function AuthGate() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)' }}>
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/sites/new" element={<SiteForm />} />
        <Route path="/sites/:id" element={<SiteDetail />} />
        <Route path="/sites/:id/edit" element={<SiteForm />} />
        <Route path="/units/:id" element={<UnitDetail />} />
        <Route path="/units/:id/edit" element={<UnitForm />} />
        <Route path="/sites/:siteId/units/new" element={<UnitForm />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/cs-tickets" element={<CSTickets />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/msow" element={<MSOW />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/contractors" element={<Contractors />} />
        <Route path="/contractors/:id" element={<ContractorDetail />} />
        <Route path="/bom" element={<BOM />} />
        <Route path="/warranty" element={<Warranty />} />
        <Route path="/warranty/:id" element={<WarrantyDetail />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function AppWithToast() {
  const { toasts, toast, dismiss } = useToast()

  return (
    <ToastContext.Provider value={toast}>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithToast />
      </AuthProvider>
    </ThemeProvider>
  )
}
