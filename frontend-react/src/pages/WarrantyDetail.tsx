import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API } from '../api'
import type { WarrantyClaim, Site, Unit } from '../types'
import { StatusBadge } from '../components/StatusBadge'
import { useToastFn } from '../App'

const STATUS_COLORS: Record<string, string> = {
  submitted: '#3b82f6',
  in_review: '#f97316',
  approved:  '#22c55e',
  denied:    '#ef4444',
  closed:    '#64748b',
}

export function WarrantyDetail() {
  const toast = useToastFn()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()

  const isEditing = !!id && id !== 'new'

  const [claim, setClaim] = useState<Partial<WarrantyClaim>>({})
  const [sites, setSites] = useState<Site[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [siteId, setSiteId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [claimNumber, setClaimNumber] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('submitted')
  const [submittedDate, setSubmittedDate] = useState('')
  const [resolvedDate, setResolvedDate] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u] = await Promise.all([API.sites.list(), API.units.list()])
        setSites(s)
        setUnits(u)
        if (isEditing && id) {
          const c = await API.warranty.get(id)
          setClaim(c)
          setSiteId(c.site_id ?? '')
          setUnitId(c.unit_id ?? '')
          setClaimNumber(c.claim_number ?? '')
          setTitle(c.title ?? '')
          setDescription(c.description ?? '')
          setStatus(c.status ?? 'submitted')
          setSubmittedDate(c.submitted_date ?? '')
          setResolvedDate(c.resolved_date ?? '')
        }
      } catch (err: unknown) {
        toast('Error loading: ' + (err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return toast('Title is required', 'error')
    setSaving(true)
    const data: Partial<WarrantyClaim> = {
      site_id: siteId || undefined,
      unit_id: unitId || undefined,
      claim_number: claimNumber.trim() || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      submitted_date: submittedDate || undefined,
      resolved_date: resolvedDate || undefined,
    }
    try {
      if (isEditing && id) {
        await API.warranty.update(id, data)
        toast('Claim updated')
      } else {
        await API.warranty.create(data)
        toast('Warranty claim submitted')
      }
      navigate('/warranty')
    } catch (err: unknown) {
      toast('Error: ' + (err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Delete this warranty claim? This cannot be undone.')) return
    try {
      await API.warranty.delete(id)
      toast('Claim deleted')
      navigate('/warranty')
    } catch (err: unknown) {
      toast('Error: ' + (err as Error).message, 'error')
    }
  }

  if (loading) return <div style={{ color: 'var(--text2)', padding: 40, textAlign: 'center' }}>Loading…</div>

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/warranty')}>← Warranty</button>
          <div>
            <h1 style={{ margin: 0 }}>
              {isEditing ? (claim.claim_number || claim.title || 'Warranty Claim') : 'New Warranty Claim'}
            </h1>
            {isEditing && claim.status && (
              <div className="page-subtitle">
                <StatusBadge status={claim.status} />
              </div>
            )}
          </div>
        </div>
        {isEditing && (
          <button
            className="btn btn-sm"
            onClick={handleDelete}
            style={{ background: 'var(--red)22', color: 'var(--red)', border: '1px solid var(--red)44' }}
          >
            Delete Claim
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 900 }}>
        {/* Claim Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Claim Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Site *</label>
              <select required value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">— Select Site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">— No specific unit —</option>
                {units
                  .filter(u => !siteId || u.site_id === siteId)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.tag || u.serial_number || u.id} {u.model ? `– ${u.model}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Claim Number</label>
              <input
                value={claimNumber}
                onChange={e => setClaimNumber(e.target.value)}
                placeholder="e.g. WC-2024-001"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label>Submitted Date</label>
              <input type="date" value={submittedDate} onChange={e => setSubmittedDate(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Title *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief title for the warranty claim" />
            </div>
            <div className="form-group full">
              <label>Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the warranty issue in detail…"
              />
            </div>
          </div>
        </div>

        {/* Status & Resolution (edit mode only) */}
        {isEditing && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Status &amp; Resolution</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {[
                    ['submitted', 'Submitted'],
                    ['in_review', 'In Review'],
                    ['approved', 'Approved'],
                    ['denied', 'Denied'],
                    ['closed', 'Closed'],
                  ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Resolved Date</label>
                <input type="date" value={resolvedDate} onChange={e => setResolvedDate(e.target.value)} />
              </div>
            </div>
            {/* Status indicator */}
            {status && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: `${STATUS_COLORS[status] ?? '#64748b'}11`, border: `1px solid ${STATUS_COLORS[status] ?? '#64748b'}33`, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] ?? '#64748b', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[status] ?? '#64748b' }}>
                  {status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Form actions */}
        <div className="form-actions" style={{ padding: '0 0 32px', display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/warranty')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  )
}
