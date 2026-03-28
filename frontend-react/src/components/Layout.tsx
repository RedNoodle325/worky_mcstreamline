import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEditMode } from '../contexts/EditModeContext'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Ticket, AlertTriangle,
  Users, FileText, CheckSquare, Calendar, Sun, Moon,
  Eye, Pencil, LogOut, Menu, ChevronLeft,
} from 'lucide-react'

const NAV = [
  { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard, end: true },
  { to: '/sites',      label: 'Sites',       Icon: Building2 },
  { to: '/cs-tickets', label: 'CS Tickets',  Icon: Ticket },
  { to: '/issues',     label: 'Issues',      Icon: AlertTriangle },
  { to: '/contacts',   label: 'Contacts',    Icon: Users },
  { to: '/notes',      label: 'Notes',       Icon: FileText },
  { to: '/todos',      label: 'To-Do',       Icon: CheckSquare },
  { to: '/schedule',   label: 'Schedule',    Icon: Calendar },
]

export function Layout() {
  const { logout, user } = useAuth()
  const { theme, toggle } = useTheme()
  const { editMode, toggleEditMode } = useEditMode()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div id="app">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 49 }}
        />
      )}

      {/* Sidebar */}
      <aside id="sidebar" className={`sidebar-responsive${sidebarOpen ? ' open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">🏀</div>
            <span className="sidebar-logo-m">Zak's Office</span>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            {NAV.map(({ to, label, Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-action-btn" onClick={toggleEditMode}>
            {editMode ? <Pencil size={13} /> : <Eye size={13} />}
            <span>{editMode ? 'Editing' : 'View Mode'}</span>
          </button>
          <button className="sidebar-action-btn" onClick={toggle}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <span className="sidebar-user-name">{user.name || user.email}</span>
              <button className="sidebar-user-logout" onClick={logout} title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="mobile-header">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <Menu size={20} />
        </button>
        <span style={{ fontFamily: "'Righteous', sans-serif", fontSize: 18, color: '#FFE81A', letterSpacing: '0.08em' }}>Zak's Office</span>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      {/* Main content */}
      <main id="content" className="main-content">
        <div id="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
