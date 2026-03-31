'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import { ContactPicker } from '../components/ContactPicker'
import type { Contractor } from '../types'

interface ContractorForm {
  name: string
  company: string
  email: string
  phone: string
  specialty: string
  notes: string
}

const EMPTY_FORM: ContractorForm = {
  name: '', company: '', email: '', phone: '', specialty: '', notes: '',
}

export function Contractors() {
  const toast = useToastFn()
  const router = useRouter()

  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ContractorForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const data = await API.contractors.list()
      setContractors(data)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    setSaving(true)
    try {
      await API.contractors.create({
        name:      form.name.trim(),
        company:   form.company.trim() || undefined,
        email:     form.email.trim() || undefined,
        phone:     form.phone.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        notes:     form.notes.trim() || undefined,
      })
      toast('Contractor added')
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await API.contractors.delete(id)
      toast('Contractor deleted')
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  const filtered = search.trim()
    ? contractors.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.specialty || '').toLowerCase().includes(search.toLowerCase())
      )
    : contractors

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contractors</h1>
          <div className="page-subtitle">Field contractors and vendors</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Contractor
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-bar">
            <input
              placeholder="Name, company, specialty…"
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
                  <th>Name</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Specialty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--text3)' }}>
                      {search ? 'No contractors match your search' : 'No contractors yet'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span
                          onClick={() => router.push(`/contractors/${c.id}`)}
                          style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--accent)' }}
                        >
                          {c.name || '—'}
                        </span>
                      </td>
                      <td>{c.company || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {c.email
                          ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
                          : '—'
                        }
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {c.specialty || '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => router.push(`/contractors/${c.id}`)}
                        >
                          Open
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ marginLeft: 4, color: 'var(--red)' }}
                          onClick={() => handleDelete(c.id, c.name)}
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

      {showModal && (
        <Modal title="New Contractor" onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }} maxWidth={480}>
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
              <label>Company</label>
              <input
                placeholder="Company name"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <input
                placeholder="e.g. Electrical, HVAC"
                value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
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
              <label>Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? 'Adding…' : 'Add Contractor'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
