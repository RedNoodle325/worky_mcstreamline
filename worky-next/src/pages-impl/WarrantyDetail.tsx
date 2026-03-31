'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { API } from '../api'
import type { WarrantyClaim, Site, Unit } from '../types'
import { StatusBadge } from '../components/StatusBadge'
import { useToastFn } from '@/app/providers'

const STATUS_OPTIONS = [
  ['submitted',   'Submitted'],
  ['in_review',   'In Review'],
  ['approved',    'Approved'],
  ['denied',      'Denied'],
  ['closed',      'Closed'],
]

const PARTS_STATUS_OPTIONS = [
  ['not_needed', 'Not Needed'],
  ['needed',     'Parts Needed'],
  ['ordered',    'Parts Ordered'],
  ['received',   'Parts Received'],
]

const STATUS_COLORS: Record<string, string> = {
  submitted: '#3b82f6',
  in_review: '#f97316',
  approved:  '#22c55e',
  denied:    '#ef4444',
  closed:    '#64748b',
}

const PARTS_COLORS: Record<string, string> = {
  not_needed: '#64748b',
  needed:     '#ef4444',
  ordered:    '#f97316',
  received:   '#22c55e',
}

// ── Small inline section header ───────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.06,
      textTransform: 'uppercase', color: 'var(--text3)',
      marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6,
    }}>
      {children}
    </div>
  )
}

export function WarrantyDetail() {
  const toast = useToastFn()
  const router = useRouter()
  const { id } = useParams<{ id?: string }>()

  const isEditing = !!id && id !== 'new'

  const [sites, setSites] = useState<Site[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Core claim fields
  const [siteId, setSiteId]               = useState('')
  const [unitId, setUnitId]               = useState('')
  const [title, setTitle]                 = useState('')
  const [claimNumber, setClaimNumber]     = useState('')
  const [description, setDescription]     = useState('')
  const [status, setStatus]               = useState('submitted')
  const [submittedDate, setSubmittedDate] = useState('')
  const [resolvedDate, setResolvedDate]   = useState('')
  const [resolution, setResolution]       = useState('')

  // Workflow fields
  const [rgaNumber, setRgaNumber]             = useState('')
  const [c2TicketNumber, setC2TicketNumber]   = useState('')
  const [partsStatus, setPartsStatus]         = useState('not_needed')
  const [partsNotes, setPartsNotes]           = useState('')
  const [techDispatched, setTechDispatched]   = useState(false)
  const [techDispatchDate, setTechDispatchDate] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u] = await Promise.all([API.sites.list(), API.units.list()])
        setSites(s)
        setUnits(u)
        if (isEditing && id) {
          const c = await API.warranty.get(id)
          setSiteId(c.site_id ?? '')
          setUnitId(c.unit_id ?? '')
          setTitle(c.title ?? '')
          setClaimNumber(c.claim_number ?? '')
          setDescription(c.description ?? '')
          setStatus(c.status ?? 'submitted')
          setSubmittedDate(c.submitted_date ?? '')
          setResolvedDate(c.resolved_date ?? '')
          setResolution(c.resolution ?? '')
          setRgaNumber(c.rga_number ?? '')
          setC2TicketNumber(c.c2_ticket_number ?? '')
          setPartsStatus(c.parts_status ?? 'not_needed')
          setPartsNotes(c.parts_notes ?? '')
          setTechDispatched(c.tech_dispatched ?? false)
          setTechDispatchDate(c.tech_dispatch_date ?? '')
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
      site_id:           siteId || undefined,
      unit_id:           unitId || undefined,
      title:             title.trim(),
      claim_number:      claimNumber.trim() || undefined,
      description:       description.trim() || undefined,
      status,
      submitted_date:    submittedDate || undefined,
      resolved_date:     resolvedDate || undefined,
      resolution:        resolution.trim() || undefined,
      rga_number:        rgaNumber.trim() || undefined,
      c2_ticket_number:  c2TicketNumber.trim() || undefined,
      parts_status:      partsStatus,
      parts_notes:       partsNotes.trim() || undefined,
      tech_dispatched:   techDispatched,
      tech_dispatch_date: techDispatchDate || undefined,
    }
    try {
      if (isEditing && id) {
        await API.warranty.update(id, data)
        toast('Claim updated')
      } else {
        const created = await API.warranty.create(data)
        toast('Warranty claim created')
        router.push(`/warranty/${created.id}`)
        return
      }
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
      router.push('/warranty')
    } catch (err: unknown) {
      toast('Error: ' + (err as Error).message, 'error')
    }
  }

  if (loading) return <div style={{ color: 'var(--text2)', padding: 40, textAlign: 'center' }}>Loading…</div>

  const filteredUnits = unitId
    ? units
    : siteId
    ? units.filter(u => u.site_id === siteId)
    : units

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/warranty')}>
            ← Warranty
          </button>
          <div>
            <h1 style={{ margin: 0 }}>
              {isEditing ? (claimNumber || title || 'Warranty Claim') : 'New Warranty Claim'}
            </h1>
            {isEditing && status && (
              <div className="page-subtitle">
                <StatusBadge status={status} />
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
            Delete
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 960 }}>

        {/* ── Claim Details ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle>Claim Details</SectionTitle>
          <div className="form-grid">
            <div className="form-group">
              <label>Site</label>
              <select value={siteId} onChange={e => { setSiteId(e.target.value); setUnitId('') }}>
                <option value="">— No site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">— No specific unit —</option>
                {filteredUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.tag || u.serial_number || u.id}{u.model ? ` – ${u.model}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Claim # / Reference</label>
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
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief title for the warranty claim"
              />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the warranty issue in detail…"
              />
            </div>
          </div>
        </div>

        {/* ── Workflow Tracking ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle>Workflow Tracking</SectionTitle>
          <div className="form-grid">

            {/* RGA */}
            <div className="form-group">
              <label>RGA Number</label>
              <input
                value={rgaNumber}
                onChange={e => setRgaNumber(e.target.value)}
                placeholder="Return goods authorization #"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {/* C2 ticket */}
            <div className="form-group">
              <label>C2 Ticket #</label>
              <input
                value={c2TicketNumber}
                onChange={e => setC2TicketNumber(e.target.value)}
                placeholder="Factory C2 system ticket #"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {/* Parts status */}
            <div className="form-group">
              <label>Parts Status</label>
              <select value={partsStatus} onChange={e => setPartsStatus(e.target.value)}>
                {PARTS_STATUS_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Parts notes */}
            <div className="form-group">
              <label>Parts Notes</label>
              <input
                value={partsNotes}
                onChange={e => setPartsNotes(e.target.value)}
                placeholder="Part numbers, SO#, ETA…"
              />
            </div>

            {/* Tech dispatched */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={techDispatched}
                  onChange={e => setTechDispatched(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                Tech Dispatched to Site
              </label>
            </div>

            {/* Tech dispatch date */}
            <div className="form-group">
              <label>Tech Dispatch Date</label>
              <input
                type="date"
                value={techDispatchDate}
                onChange={e => setTechDispatchDate(e.target.value)}
              />
            </div>
          </div>

          {/* Workflow status pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <Pill
              label={`Parts: ${PARTS_STATUS_OPTIONS.find(([v]) => v === partsStatus)?.[1] ?? partsStatus}`}
              color={PARTS_COLORS[partsStatus] ?? '#64748b'}
            />
            <Pill
              label={techDispatched ? 'Tech: Dispatched' : 'Tech: Not Dispatched'}
              color={techDispatched ? '#22c55e' : '#64748b'}
            />
            {rgaNumber && <Pill label={`RGA: ${rgaNumber}`} color="#3b82f6" />}
            {c2TicketNumber && <Pill label={`C2: ${c2TicketNumber}`} color="#8b5cf6" />}
          </div>
        </div>

        {/* ── Status & Resolution (edit only) ── */}
        {isEditing && (
          <div className="card" style={{ marginBottom: 16 }}>
            <SectionTitle>Status &amp; Resolution</SectionTitle>
            <div className="form-grid">
              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Resolved Date</label>
                <input type="date" value={resolvedDate} onChange={e => setResolvedDate(e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Resolution Notes</label>
                <textarea
                  rows={2}
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="How was this resolved?"
                />
              </div>
            </div>
            {status && (
              <div style={{
                marginTop: 8, padding: '8px 14px',
                background: `${STATUS_COLORS[status] ?? '#64748b'}11`,
                border: `1px solid ${STATUS_COLORS[status] ?? '#64748b'}33`,
                borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[status] ?? '#64748b', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[status] ?? '#64748b' }}>
                  {status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Form Actions ── */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/warranty')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Claim'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}44`,
      borderRadius: 20,
      padding: '3px 10px',
    }}>
      {label}
    </span>
  )
}
