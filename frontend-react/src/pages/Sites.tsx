import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import { StatusBadge } from '../components/StatusBadge'
import type { Site } from '../types'

// ── 90s NBA Team palettes ──────────────────────────────────────────────────────
const NBA_TEAMS = [
  { name: 'BULLS',      abbr: 'CHI', primary: '#CE1141', secondary: '#000000', cardBg: '#1e0008' },
  { name: 'LAKERS',     abbr: 'LAL', primary: '#FDB927', secondary: '#552583', cardBg: '#160824' },
  { name: 'MAGIC',      abbr: 'ORL', primary: '#0077C0', secondary: '#C4CED4', cardBg: '#001424' },
  { name: 'SONICS',     abbr: 'SEA', primary: '#00A550', secondary: '#FFC200', cardBg: '#001810' },
  { name: 'KNICKS',     abbr: 'NYK', primary: '#F58426', secondary: '#006BB6', cardBg: '#001624' },
  { name: 'JAZZ',       abbr: 'UTA', primary: '#F9A01B', secondary: '#002B5C', cardBg: '#060e1e' },
  { name: 'SUNS',       abbr: 'PHX', primary: '#E56020', secondary: '#1D1160', cardBg: '#0e0818' },
  { name: 'PACERS',     abbr: 'IND', primary: '#FDBB30', secondary: '#002D62', cardBg: '#000e20' },
  { name: 'ROCKETS',    abbr: 'HOU', primary: '#CE1141', secondary: '#C4CED4', cardBg: '#180008' },
  { name: 'KINGS',      abbr: 'SAC', primary: '#9B4DCA', secondary: '#63727A', cardBg: '#10061e' },
  { name: 'PISTONS',    abbr: 'DET', primary: '#006BB6', secondary: '#ED174C', cardBg: '#00101e' },
  { name: 'SPURS',      abbr: 'SAS', primary: '#C4CED4', secondary: '#000000', cardBg: '#0a0a0a' },
]

function getTeam(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0
  return NBA_TEAMS[h % NBA_TEAMS.length]
}

export function Sites() {
  const toast = useToastFn()
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    try {
      const data = await API.sites.list()
      setSites(data)
    } catch (e) {
      toast('Error loading sites: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function deleteSite(id: string, name: string) {
    if (!confirm(`Delete site "${name}"? This cannot be undone.`)) return
    try {
      await API.sites.delete(id)
      toast('Site deleted')
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  const filtered = search.trim()
    ? sites.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.state || '').toLowerCase().includes(search.toLowerCase())
      )
    : sites

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sites</h1>
          <div className="page-subtitle">Customer sites and locations</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/sites/new')}>
          + New Site
        </button>
      </div>

      {/* Search bar — always visible */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="toolbar">
          <div className="search-bar">
            <input
              placeholder="Search sites…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-spacer" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="card desktop-only">
        <div className="table-wrap">
          {loading ? (
            <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>City, State</th>
                  <th>Status</th>
                  <th>Warranty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--text3)' }}>
                      {search ? 'No sites match your search' : 'No sites yet'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr key={s.id}>
                      <td>
                        <Link
                          to={`/sites/${s.id}`}
                          style={{ fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td>{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        {s.status ? <StatusBadge status={s.status} size="sm" /> : '—'}
                      </td>
                      <td>
                        {s.warranty_status ? <StatusBadge status={s.warranty_status} size="sm" /> : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/sites/${s.id}`)}
                        >
                          Open
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ marginLeft: 4 }}
                          onClick={() => navigate(`/sites/${s.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ marginLeft: 4, color: 'var(--red)' }}
                          onClick={() => deleteSite(s.id, s.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile NBA team cards */}
      {loading ? (
        <div className="mobile-only" style={{ color: 'var(--text3)', padding: 32, textAlign: 'center' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mobile-only" style={{ color: 'var(--text3)', textAlign: 'center', padding: 32 }}>
          {search ? 'No sites match your search' : 'No sites yet'}
        </div>
      ) : (
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(s => {
            const team = getTeam(s.id)
            const location = [s.city, s.state].filter(Boolean).join(', ')
            return (
              <div
                key={s.id}
                className="nba-site-card"
                style={{
                  background: team.cardBg,
                  borderLeft: `4px solid ${team.primary}`,
                  borderTop: `1px solid ${team.primary}44`,
                  borderRight: `1px solid ${team.primary}22`,
                  borderBottom: `1px solid ${team.primary}22`,
                  borderRadius: '0 10px 10px 0',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onClick={() => navigate(`/sites/${s.id}`)}
              >
                {/* Top stripe */}
                <div style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${team.primary} 0%, ${team.secondary} 60%, transparent 100%)`,
                }} />

                {/* Watermark */}
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 10,
                  fontSize: 36,
                  fontWeight: 900,
                  fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                  color: team.primary,
                  opacity: 0.07,
                  letterSpacing: 2,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  lineHeight: 1,
                }}>
                  {team.name}
                </div>

                <div style={{ padding: '10px 14px 12px' }}>
                  {/* Team badge + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                      letterSpacing: 2,
                      color: team.primary,
                      background: `${team.primary}18`,
                      border: `1px solid ${team.primary}55`,
                      borderRadius: 3,
                      padding: '2px 8px',
                    }}>
                      ◆ {team.abbr}
                    </span>
                    {s.status && <StatusBadge status={s.status} size="sm" />}
                  </div>

                  {/* Site name */}
                  <div style={{
                    fontSize: 17,
                    fontWeight: 800,
                    fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                    letterSpacing: 1,
                    color: team.primary,
                    marginBottom: 3,
                    lineHeight: 1.2,
                  }}>
                    {s.name}
                  </div>

                  {/* Location */}
                  {location && (
                    <div style={{ fontSize: 12, color: `${team.primary}99`, marginBottom: 6 }}>
                      {location}
                    </div>
                  )}

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                    {s.project_number && (
                      <span style={{
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: team.secondary === '#000000' ? '#aaa' : team.secondary,
                        background: `${team.secondary}18`,
                        border: `1px solid ${team.secondary}33`,
                        borderRadius: 3,
                        padding: '1px 6px',
                      }}>
                        #{s.project_number}
                      </span>
                    )}
                    {s.warranty_status && (
                      <StatusBadge status={s.warranty_status} size="sm" />
                    )}
                    {s.region && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.region}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: team.primary,
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 11,
                        padding: '5px 14px',
                      }}
                      onClick={() => navigate(`/sites/${s.id}`)}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11 }}
                      onClick={() => navigate(`/sites/${s.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, color: 'var(--red)', marginLeft: 'auto' }}
                      onClick={() => deleteSite(s.id, s.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
