import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEditMode } from '../contexts/EditModeContext'
import { useState } from 'react'

const NAV = [
  { to: '/',            label: 'Dashboard', icon: '⊞', end: true },
  { to: '/sites',       label: 'Sites',      icon: '🏢' },
  { to: '/cs-tickets',  label: 'CS Tickets', icon: '🎫' },
  { to: '/issues',      label: 'Issues',     icon: '⚠' },
  { to: '/contacts',    label: 'Contacts',   icon: '👤' },
  { to: '/notes',       label: 'Notes',      icon: '📝' },
  { to: '/todos',       label: 'To-Do',      icon: '✅' },
  { to: '/schedule',    label: 'Schedule',   icon: '📅' },
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 49 }}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar-responsive${sidebarOpen ? ' open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-m">Zak's Office</span>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            {NAV.map(n => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="icon">{n.icon}</span>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleEditMode} style={{ marginBottom: 4 }}>
            <span className="toggle-icon">{editMode ? '✏️' : '👁'}</span>
            {editMode ? 'Editing' : 'View Mode'}
          </button>
          <button className="theme-toggle" onClick={toggle}>
            <span className="toggle-icon">{theme === 'dark' ? '☀' : '🌙'}</span>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="mobile-header">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 4 }}
        >
          ☰
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Zak's Office</span>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}
        >
          ← Back
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
