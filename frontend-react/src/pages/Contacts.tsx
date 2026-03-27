import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import { Modal } from '../components/Modal'
import type { Site, Contact, Contractor } from '../types'

interface NormalizedContact {
  _type: 'site_contact' | 'contractor'
  id: string
  siteId?: string
  name: string
  title: string
  company: string
  phone: string
  email: string | null
}

interface NewContractorForm {
  name: string
  company: string
  title: string
  phone: string
  email: string
  region: string
}

const EMPTY_FORM: NewContractorForm = {
  name: '', company: '', title: '', phone: '', email: '', region: '',
}

export function Contacts() {
  const toast = useToastFn()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<NormalizedContact[]>([])
  const [siteFilter, setSiteFilter] = useState('')
  const [sites, setSites] = useState<Site[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewContractorForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

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
          title: '—',
          company: c.company || '—',
          phone: c.phone || '—',
          email: c.email ?? null,
        })),
        ...siteContacts.map((c): NormalizedContact => ({
          _type: 'site_contact',
          id: c.id,
          siteId: c.site_id,
          name: c.name || '—',
          title: c.title || '—',
          company: (c as Contact & { _site_name: string })._site_name || '—',
          phone: c.phone || '—',
          email: c.email ?? null,
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

  async function handleAddContact() {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    setSaving(true)
    try {
      await API.contractors.create({
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.region.trim() || undefined,
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

  const filtered = siteFilter
    ? contacts.filter(c => c._type === 'site_contact' && c.siteId === siteFilter)
    : contacts

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
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
          <label style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Filter by site:</label>
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="">All contacts</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : error ? (
        <div style={{ color: 'var(--red)', padding: 20 }}>Error: {error}</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title / Role</th>
                  <th>Company / Site</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: 'var(--text3)' }}>No contacts found</td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={`${c._type}-${c.id}`}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>{c.title}</td>
                      <td>{c.company}</td>
                      <td>{c.phone}</td>
                      <td style={{ fontSize: 13 }}>
                        {c.email
                          ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
                          : '—'
                        }
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          background: c._type === 'contractor' ? '#2563eb22' : '#16a34a22',
                          color: c._type === 'contractor' ? '#60a5fa' : '#4ade80',
                          border: `1px solid ${c._type === 'contractor' ? '#2563eb44' : '#16a34a44'}`,
                          borderRadius: 99, padding: '1px 7px',
                        }}>
                          {c._type === 'contractor' ? 'Contractor' : 'Site Contact'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c._type === 'contractor' ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/contractors/${c.id}`)}
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/sites/${c.siteId}`)}
                          >
                            Site
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="Add Contact" onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }} maxWidth={480}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Name *</label>
              <input
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Title / Role</label>
              <input
                placeholder="e.g. Facility Manager"
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
            <div className="form-group full">
              <label>Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Region / Area</label>
              <input
                placeholder="e.g. Southeast"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddContact}
              disabled={saving}
            >
              {saving ? 'Adding…' : 'Add Contact'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
