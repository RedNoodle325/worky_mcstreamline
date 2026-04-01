'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import { ContactPicker } from '../components/ContactPicker'
import type { Site, Contact, Contractor } from '../types'

// ── Category config ────────────────────────────────────────────────────────────
export const CATEGORIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  munters_sales:   { label: 'Munters Sales',    color: '#60a5fa', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)' },
  munters_service: { label: 'Munters Service',  color: '#a78bfa', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)' },
  contractor:      { label: 'Contractor',        color: '#fb923c', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' },
  site_ops:        { label: 'Site Operations',   color: '#34d399', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  customer:        { label: 'Customer',          color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
}
const CATEGORY_ORDER = ['munters_sales', 'munters_service', 'contractor', 'site_ops', 'customer']

// Map site contact_type → category key
function mapContactType(t?: string): string {
  if (!t) return 'customer'
  const lower = t.toLowerCase()
  if (lower.includes('sales')) return 'munters_sales'
  if (lower.includes('service') || lower.includes('munters')) return 'munters_service'
  if (lower.includes('contractor')) return 'contractor'
  if (lower.includes('site') || lower.includes('ops') || lower.includes('facility')) return 'site_ops'
  return 'customer'
}

interface NormalizedContact {
  _type: 'site_contact' | 'contractor'
  id: string
  siteId?: string
  siteName?: string
  name: string
  title: string
  company: string
  phone: string
  email: string | null
  category: string
  is_technician: boolean
}

interface ContactForm {
  name: string
  title: string
  company: string
  phone: string
  email: string
  region: string
  category: string
  is_technician: boolean
}

const EMPTY_FORM: ContactForm = {
  name: '', title: '', company: '', phone: '', email: '',
  region: '', category: 'munters_service', is_technician: false,
}

export function Contacts() {
  const toast = useToastFn()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<NormalizedContact[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [contractors, allSites] = await Promise.all([
        API.contractors.list(),
        API.sites.list(),
      ])
      setSites(allSites)

      const siteContactsNested = await Promise.all(
        allSites.map(s =>
          API.contacts.list(s.id)
            .then((cs: Contact[]) => cs.map(c => ({ ...c, _site_name: s.name })))
            .catch(() => [] as (Contact & { _site_name: string })[])
        )
      )
      const siteContacts = siteContactsNested.flat()

      const normalized: NormalizedContact[] = [
        ...contractors.map((c: Contractor): NormalizedContact => ({
          _type: 'contractor',
          id: c.id,
          name: c.name || '—',
          title: c.title || '',
          company: c.company || '',
          phone: c.phone || '—',
          email: c.email ?? null,
          category: c.category || 'contractor',
          is_technician: c.is_technician ?? false,
        })),
        ...siteContacts.map((c): NormalizedContact => ({
          _type: 'site_contact',
          id: c.id,
          siteId: c.site_id,
          siteName: (c as Contact & { _site_name: string })._site_name,
          name: c.name || '—',
          title: c.title || '',
          company: (c as Contact & { _site_name: string })._site_name || '',
          phone: c.phone || '—',
          email: c.email ?? null,
          category: mapContactType(c.contact_type),
          is_technician: false,
        })),
      ]

      normalized.sort((a, b) => a.name.localeCompare(b.name))
      setContacts(normalized)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      await API.contractors.create({
        name: form.name.trim(),
        title: form.title.trim() || undefined,
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.region.trim() || undefined,
        category: form.category,
        is_technician: form.is_technician,
      })
      toast('Contact added')
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = contacts.filter(c => {
    if (categoryFilter && c.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by category in defined order, then uncategorized last
  const groups = CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(c => c.category === cat) }))
    .filter(g => g.items.length > 0)

  const uncategorized = filtered.filter(c => !CATEGORY_ORDER.includes(c.category))
  if (uncategorized.length > 0) groups.push({ cat: '_other', items: uncategorized })

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>Contacts</h1>
          <div className="page-subtitle">All contacts across sites and contractors</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Contact
        </button>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search name, title, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All categories</option>
            {CATEGORY_ORDER.map(k => (
              <option key={k} value={k}>{CATEGORIES[k].label}</option>
            ))}
          </select>
          {(search || categoryFilter) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setCategoryFilter('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : error ? (
        <div style={{ color: 'var(--red)', padding: 20 }}>Error: {error}</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ color: 'var(--text3)', padding: 32, textAlign: 'center' }}>
          No contacts found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(({ cat, items }) => {
            const cfg = CATEGORIES[cat] ?? { label: 'Other', color: 'var(--text3)', bg: 'var(--bg2)', border: 'var(--border)' }
            return (
              <div key={cat} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: cfg.bg,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, letterSpacing: 0.04 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                    {items.length}
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Title</th>
                        <th>Company / Site</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(c => (
                        <tr key={`${c._type}-${c.id}`}>
                          <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {c.name}
                              {c.is_technician && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, letterSpacing: 0.06,
                                  background: 'rgba(34,211,238,0.15)',
                                  color: '#22d3ee',
                                  border: '1px solid rgba(34,211,238,0.3)',
                                  borderRadius: 4, padding: '1px 5px',
                                  flexShrink: 0,
                                }}>
                                  TECH
                                </span>
                              )}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text2)', fontSize: 13 }}>{c.title || '—'}</td>
                          <td style={{ fontSize: 13 }}>{c.company || '—'}</td>
                          <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{c.phone}</td>
                          <td style={{ fontSize: 13 }}>
                            {c.email
                              ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
                              : '—'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {c._type === 'contractor' ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => router.push(`/contractors/${c.id}`)}
                              >
                                Edit
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => router.push(`/sites/${c.siteId}`)}
                              >
                                Site →
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Add Contact" onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }} maxWidth={500}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Name *</label>
              <ContactPicker
                value={form.name}
                onChange={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Full name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORY_ORDER.map(k => (
                  <option key={k} value={k}>{CATEGORIES[k].label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {form.category === 'munters_service' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.is_technician}
                    onChange={e => setForm(f => ({ ...f, is_technician: e.target.checked }))}
                    style={{ accentColor: '#22d3ee', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 13 }}>Field Technician</span>
                </label>
              )}
            </div>

            <div className="form-group">
              <label>Title / Role</label>
              <input
                placeholder="e.g. Service PM, Sales Engineer"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                placeholder="Company name"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="form-group full">
              <label>Region / Area</label>
              <input
                placeholder="e.g. Southeast"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding…' : 'Add Contact'}
            </button>
          </div>
        </Modal>
      )}

      <input ref={importRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} />
    </div>
  )
}
