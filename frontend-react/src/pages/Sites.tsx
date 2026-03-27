import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import { StatusBadge } from '../components/StatusBadge'
import type { Site } from '../types'

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

      <div className="card">
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
    </div>
  )
}
