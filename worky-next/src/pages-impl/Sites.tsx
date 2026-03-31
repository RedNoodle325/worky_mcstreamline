'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { StatusBadge } from '../components/StatusBadge'
import type { Site } from '../types'

const NO_CUSTOMER = '(No Customer)'

function groupByCustomer(sites: Site[]): [string, Site[]][] {
  const map = new Map<string, Site[]>()
  for (const s of sites) {
    const key = s.owner?.trim() || s.customer_name?.trim() || NO_CUSTOMER
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === NO_CUSTOMER) return 1
    if (b === NO_CUSTOMER) return -1
    return a.localeCompare(b)
  })
}

export function Sites() {
  const toast = useToastFn()
  const router = useRouter()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

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

  function toggleCustomer(customer: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(customer)) next.delete(customer)
      else next.add(customer)
      return next
    })
  }

  const q = search.trim().toLowerCase()

  const filtered = q
    ? sites.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.owner || '').toLowerCase().includes(q) ||
        (s.customer_name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        (s.project_number || '').toLowerCase().includes(q)
      )
    : sites

  const groups = groupByCustomer(filtered)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sites</h1>
          <div className="page-subtitle">
            {groups.length} customer{groups.length !== 1 ? 's' : ''} · {filtered.length} site{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/sites/new')}>
          + New Site
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="toolbar">
          <div className="search-bar">
            <input
              placeholder="Search customers or sites…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-spacer" />
          {groups.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCollapsed(new Set())}
              >
                Expand All
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCollapsed(new Set(groups.map(([k]) => k)))}
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>
          {q ? 'No sites match your search' : 'No sites yet'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(([customer, customerSites]) => {
            const isOpen = !collapsed.has(customer)
            return (
              <div
                key={customer}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Customer header row */}
                <button
                  onClick={() => toggleCustomer(customer)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    textAlign: 'left',
                  }}
                >
                  {isOpen
                    ? <ChevronDown size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    : <ChevronRight size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  }
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                    {customer}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'var(--text3)',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '1px 8px',
                  }}>
                    {customerSites.length} site{customerSites.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isOpen && (
                  <>
                    {/* Desktop table */}
                    <div className="desktop-only table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Site Name</th>
                            <th>Project #</th>
                            <th>City, State</th>
                            <th>Status</th>
                            <th>Warranty</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerSites.map(s => (
                            <tr key={s.id}>
                              <td>
                                <Link
                                  href={`/sites/${s.id}`}
                                  style={{ fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}
                                >
                                  {s.name}
                                </Link>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {s.project_number || '—'}
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
                                  onClick={() => router.push(`/sites/${s.id}`)}
                                >
                                  Open
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ marginLeft: 4 }}
                                  onClick={() => router.push(`/sites/${s.id}/edit`)}
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
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile site list */}
                    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column' }}>
                      {customerSites.map(s => {
                        const location = [s.city, s.state].filter(Boolean).join(', ')
                        return (
                          <div
                            key={s.id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              padding: '10px 14px',
                              cursor: 'pointer',
                            }}
                            onClick={() => router.push(`/sites/${s.id}`)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>
                                {s.name}
                              </span>
                              {s.status && <StatusBadge status={s.status} size="sm" />}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              {location && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{location}</span>}
                              {s.project_number && (
                                <span style={{
                                  fontSize: 11, fontFamily: 'monospace',
                                  color: 'var(--text3)', background: 'var(--bg3)',
                                  border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px',
                                }}>
                                  #{s.project_number}
                                </span>
                              )}
                              {s.warranty_status && <StatusBadge status={s.warranty_status} size="sm" />}
                            </div>
                            <div
                              style={{ display: 'flex', gap: 6, marginTop: 8 }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: 11 }}
                                onClick={() => router.push(`/sites/${s.id}/edit`)}
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
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
