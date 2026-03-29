'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import type { Site, Unit, WarrantyClaim } from '../types'

interface ClaimForm {
  title: string
  description: string
  site_id: string
  unit_id: string
  claim_number: string
  submitted_date: string
  status: string
}

const EMPTY_FORM: ClaimForm = {
  title: '', description: '', site_id: '', unit_id: '',
  claim_number: '', submitted_date: '', status: 'submitted',
}

const STATUS_OPTIONS = ['submitted', 'in_review', 'approved', 'denied', 'closed']

export function Warranty() {
  const toast = useToastFn()
  const router = useRouter()

  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ClaimForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [claimData, siteData, unitData] = await Promise.all([
        API.warranty.list(),
        API.sites.list(),
        API.units.list(),
      ])
      setClaims(claimData)
      setSites(siteData)
      setUnits(unitData)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function siteName(id?: string) {
    return id ? (sites.find(s => s.id === id)?.name || '—') : '—'
  }

  function unitLabel(id?: string) {
    if (!id) return '—'
    const u = units.find(u => u.id === id)
    return u ? (u.tag || u.serial_number || u.id) : '—'
  }

  async function handleCreate() {
    if (!form.title.trim()) {
      toast('Title is required', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await API.warranty.create({
        title:          form.title.trim(),
        description:    form.description.trim() || undefined,
        site_id:        form.site_id || undefined,
        unit_id:        form.unit_id || undefined,
        claim_number:   form.claim_number.trim() || undefined,
        submitted_date: form.submitted_date || undefined,
        status:         form.status,
      })
      toast('Claim created')
      setShowModal(false)
      setForm(EMPTY_FORM)
      router.push(`/warranty/${created.id}`)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this warranty claim? This cannot be undone.')) return
    try {
      await API.warranty.delete(id)
      toast('Claim deleted')
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  const filtered = statusFilter
    ? claims.filter(c => c.status === statusFilter)
    : claims

  const siteUnits = form.site_id
    ? units.filter(u => u.site_id === form.site_id)
    : units

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Warranty Claims</h1>
          <div className="page-subtitle">Track warranty submissions and resolutions</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Claim
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="toolbar-spacer" />
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Title</th>
                  <th>Site</th>
                  <th>Unit</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: 'var(--text3)' }}>No claims</td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {c.claim_number || '—'}
                      </td>
                      <td
                        style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {c.title}
                      </td>
                      <td>{siteName(c.site_id)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{unitLabel(c.unit_id)}</td>
                      <td style={{ fontSize: 12 }}>
                        {c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => router.push(`/warranty/${c.id}`)}
                        >
                          Open
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ marginLeft: 4, color: 'var(--red)' }}
                          onClick={() => handleDelete(c.id)}
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
        <Modal title="New Warranty Claim" onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }} maxWidth={520}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Title *</label>
              <input
                placeholder="Brief description of the claim"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Claim Number</label>
              <input
                placeholder="e.g. WC-2024-001"
                value={form.claim_number}
                onChange={e => setForm(f => ({ ...f, claim_number: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Site</label>
              <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value, unit_id: '' }))}>
                <option value="">— No site —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                <option value="">— No unit —</option>
                {siteUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.tag || u.serial_number || u.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Submitted Date</label>
              <input
                type="date"
                value={form.submitted_date}
                onChange={e => setForm(f => ({ ...f, submitted_date: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="Details of the claim…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create Claim'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
