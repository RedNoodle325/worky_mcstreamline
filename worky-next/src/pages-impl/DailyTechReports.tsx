'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { DailyTechReport, ReportUnitEntry, Site, Technician, Unit, BomItem } from '../types'
import { Plus, X, ChevronDown, ChevronUp, Camera } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.slice(0, 10).split('-')
  return `${m}/${d}/${y}`
}

function emptyEntry(): ReportUnitEntry {
  return {
    unit_id: '', unit_tag: '', unit_serial: '',
    issue_description: '', resolution: '', parts_text: '',
    part_catalog_id: '', follow_up_required: false, photo_urls: [],
  }
}

interface ReportForm {
  report_date: string
  technician_id: string
  technician_name: string
  site_id: string
  customer_complaint: string
  site_delays: string
  engineering_requests: string
  notes: string
  unit_entries: ReportUnitEntry[]
}

const EMPTY_FORM: ReportForm = {
  report_date: today(),
  technician_id: '',
  technician_name: '',
  site_id: '',
  customer_complaint: '',
  site_delays: '',
  engineering_requests: '',
  notes: '',
  unit_entries: [],
}

// ── Sub-component: one unit entry card ───────────────────────────────────────

function UnitEntryCard({
  entry, index, siteUnits, bomParts, onUpdate, onRemove, onPhotoUpload,
}: {
  entry: ReportUnitEntry
  index: number
  siteUnits: Unit[]
  bomParts: BomItem[]
  onUpdate: (patch: Partial<ReportUnitEntry>) => void
  onRemove: () => void
  onPhotoUpload: (file: File) => Promise<void>
}) {
  const [addingUnit, setAddingUnit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const isNewUnit = entry.unit_id === '__new__'

  function handleUnitSelect(val: string) {
    if (val === '__new__') {
      setAddingUnit(true)
      onUpdate({ unit_id: '__new__', unit_tag: '', unit_serial: '' })
    } else {
      setAddingUnit(false)
      const unit = siteUnits.find(u => u.id === val)
      onUpdate({
        unit_id: val || '',
        unit_tag: unit?.tag ?? '',
        unit_serial: unit?.serial_number ?? '',
      })
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try { await onPhotoUpload(file) } finally { setUploading(false) }
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg)',
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Entry header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.06 }}>
          Unit {index + 1}
        </span>
        {entry.follow_up_required && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#fb923c',
            background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)',
            borderRadius: 4, padding: '1px 5px',
          }}>FOLLOW-UP</span>
        )}
        <button
          onClick={onRemove}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Unit selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>Unit</label>
            <select
              value={isNewUnit ? '__new__' : (entry.unit_id || '')}
              onChange={e => handleUnitSelect(e.target.value)}
            >
              <option value="">— Select unit —</option>
              {siteUnits.map(u => (
                <option key={u.id} value={u.id}>
                  {u.tag || u.serial_number || u.id.slice(0, 6)}
                  {u.unit_type ? ` · ${u.unit_type}` : ''}
                </option>
              ))}
              <option value="__new__">+ Add new unit…</option>
            </select>
          </div>
          {isNewUnit && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11, color: 'var(--accent)' }}>New Unit — Tag or Serial *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="Site Tag (e.g. AHU-01)"
                  value={entry.unit_tag || ''}
                  onChange={e => onUpdate({ unit_tag: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  placeholder="Serial #"
                  value={entry.unit_serial || ''}
                  onChange={e => onUpdate({ unit_serial: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}
          {!isNewUnit && entry.unit_id && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Serial</label>
              <input value={entry.unit_serial || ''} readOnly style={{ color: 'var(--text3)' }} />
            </div>
          )}
        </div>

        {/* Issue */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Issue / Customer Complaint</label>
          <textarea
            rows={2}
            placeholder="Describe the issue found on this unit…"
            value={entry.issue_description || ''}
            onChange={e => onUpdate({ issue_description: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Resolution */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Resolution / Work Performed</label>
          <textarea
            rows={2}
            placeholder="What was done, or what is the plan…"
            value={entry.resolution || ''}
            onChange={e => onUpdate({ resolution: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Parts */}
        <div style={{ display: 'grid', gridTemplateColumns: bomParts.length ? '1fr 1fr' : '1fr', gap: 8 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>Parts Needed (description)</label>
            <input
              placeholder="Brief description of parts required…"
              value={entry.parts_text || ''}
              onChange={e => onUpdate({ parts_text: e.target.value })}
            />
          </div>
          {bomParts.length > 0 && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Or select from site BOM</label>
              <select
                value={entry.part_catalog_id || ''}
                onChange={e => {
                  const p = bomParts.find(b => b.id === e.target.value)
                  onUpdate({ part_catalog_id: e.target.value, parts_text: p?.part_number ? `${p.part_number} – ${p.description || ''}` : entry.parts_text })
                }}
              >
                <option value="">— Select part —</option>
                {bomParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.part_number} {p.description ? `· ${p.description.slice(0, 40)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Follow-up + Photos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={entry.follow_up_required || false}
              onChange={e => onUpdate({ follow_up_required: e.target.checked })}
              style={{ accentColor: '#fb923c', width: 14, height: 14 }}
            />
            Follow-up required
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => photoRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Camera size={12} />
              {uploading ? 'Uploading…' : 'Add Photo'}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhoto}
            />
            {(entry.photo_urls || []).map((url, pi) => (
              <div key={pi} style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${pi + 1}`}
                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                />
                <button
                  onClick={() => onUpdate({ photo_urls: (entry.photo_urls || []).filter((_, i) => i !== pi) })}
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--red)', color: '#fff', border: 'none',
                    borderRadius: '50%', width: 14, height: 14,
                    fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DailyTechReports() {
  const toast = useToastFn()

  const [reports, setReports] = useState<DailyTechReport[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [techs, setTechs] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<DailyTechReport | null | 'new'>(null)
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [siteUnits, setSiteUnits] = useState<Unit[]>([])
  const [bomParts, setBomParts] = useState<BomItem[]>([])

  // filters
  const [filterSite, setFilterSite] = useState('')
  const [filterTech, setFilterTech] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterSite) params.site_id = filterSite
      if (filterTech) params.technician_id = filterTech
      if (filterFrom) params.date_from = filterFrom
      if (filterTo) params.date_to = filterTo

      const [data, siteData, techData] = await Promise.all([
        API.dailyTechReports.list(params),
        API.sites.list(),
        API.schedule.listTechs(),
      ])
      setReports(data)
      setSites(siteData)
      setTechs(techData)
    } catch (e) {
      toast('Failed to load reports: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterSite, filterTech, filterFrom, filterTo])

  // When site changes in form, load its units and BOM parts
  useEffect(() => {
    if (!form.site_id) { setSiteUnits([]); setBomParts([]); return }
    API.units.list({ site_id: form.site_id })
      .then(setSiteUnits)
      .catch(() => setSiteUnits([]))
    // Load BOM parts for this site
    API.bom.list()
      .then(boms => {
        const siteBomIds = boms
          .filter(b => (b.site_ids ?? []).includes(form.site_id))
          .map(b => b.id)
        if (!siteBomIds.length) { setBomParts([]); return }
        // Fetch items from first matching BOM (could enhance to merge all)
        return API.bom.getItems(siteBomIds[0]).then(setBomParts)
      })
      .catch(() => setBomParts([]))
  }, [form.site_id])

  function openNew() {
    setForm({ ...EMPTY_FORM, report_date: today() })
    setModal('new')
  }

  function openEdit(r: DailyTechReport) {
    setForm({
      report_date:        r.report_date?.slice(0, 10) ?? today(),
      technician_id:      r.technician_id ?? '',
      technician_name:    r.technician_name ?? '',
      site_id:            r.site_id ?? '',
      customer_complaint: r.customer_complaint ?? '',
      site_delays:        r.site_delays ?? '',
      engineering_requests: r.engineering_requests ?? '',
      notes:              r.notes ?? '',
      unit_entries:       (r.unit_entries ?? []).map(e => ({ ...e })),
    })
    setModal(r)
  }

  function updateEntry(i: number, patch: Partial<ReportUnitEntry>) {
    setForm(f => {
      const entries = [...f.unit_entries]
      entries[i] = { ...entries[i], ...patch }
      return { ...f, unit_entries: entries }
    })
  }

  async function handlePhotoUpload(entryIndex: number, file: File) {
    try {
      const url = await API.dailyTechReports.uploadPhoto(file)
      setForm(f => {
        const entries = [...f.unit_entries]
        entries[entryIndex] = {
          ...entries[entryIndex],
          photo_urls: [...(entries[entryIndex].photo_urls ?? []), url],
        }
        return { ...f, unit_entries: entries }
      })
    } catch (e) {
      toast('Photo upload failed: ' + (e as Error).message, 'error')
    }
  }

  async function handleSave() {
    if (!form.report_date) { toast('Report date is required', 'error'); return }
    if (!form.technician_id && !form.technician_name.trim()) {
      toast('Technician name or selection is required', 'error'); return
    }

    // Validate any new units have at least tag or serial
    for (let i = 0; i < form.unit_entries.length; i++) {
      const e = form.unit_entries[i]
      if (e.unit_id === '__new__' && !e.unit_tag?.trim() && !e.unit_serial?.trim()) {
        toast(`Unit ${i + 1}: enter at least a site tag or serial number`, 'error')
        return
      }
    }

    setSaving(true)
    try {
      // Create any new units first and swap in their IDs
      const resolvedEntries = await Promise.all(
        form.unit_entries.map(async (e) => {
          if (e.unit_id === '__new__') {
            const newUnit = await API.units.create({
              site_id: form.site_id || undefined,
              tag: e.unit_tag?.trim() || undefined,
              serial_number: e.unit_serial?.trim() || undefined,
            })
            return { ...e, unit_id: newUnit.id, unit_tag: newUnit.tag, unit_serial: newUnit.serial_number }
          }
          return e
        })
      )

      const payload: Partial<DailyTechReport> = {
        report_date:        form.report_date,
        technician_id:      form.technician_id || undefined,
        technician_name:    form.technician_name.trim() || undefined,
        site_id:            form.site_id || undefined,
        customer_complaint: form.customer_complaint.trim() || undefined,
        site_delays:        form.site_delays.trim() || undefined,
        engineering_requests: form.engineering_requests.trim() || undefined,
        notes:              form.notes.trim() || undefined,
        unit_entries:       resolvedEntries,
      }

      if (modal && modal !== 'new') {
        const updated = await API.dailyTechReports.update(modal.id, payload)
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
        toast('Report saved')
      } else {
        const created = await API.dailyTechReports.create(payload)
        setReports(prev => [created, ...prev])
        toast('Report submitted')
      }
      setModal(null)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!modal || modal === 'new') return
    if (!confirm('Delete this report?')) return
    try {
      await API.dailyTechReports.delete((modal as DailyTechReport).id)
      setReports(prev => prev.filter(r => r.id !== (modal as DailyTechReport).id))
      setModal(null)
      toast('Report deleted')
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  const techDisplay = (r: DailyTechReport) => r._technician_name || r.technician_name || '—'
  const siteDisplay = (r: DailyTechReport) => r._site_name || '—'
  const hasFollowUp = (r: DailyTechReport) => r.unit_entries?.some(e => e.follow_up_required)
  const hasFlags = (r: DailyTechReport) => !!(r.site_delays || r.engineering_requests) || hasFollowUp(r)

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Daily Tech Reports</h1>
          <div className="page-subtitle">Field technician daily activity logs</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Report</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[
          { label: 'Technician', value: filterTech, onChange: setFilterTech, children: techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>), all: 'All Techs' },
          { label: 'Site', value: filterSite, onChange: setFilterSite, children: sites.map(s => <option key={s.id} value={s.id}>{s.project_name || s.name}</option>), all: 'All Sites' },
        ].map(({ label, value, onChange, children, all }) => (
          <div key={label} className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} style={{ fontSize: 13, padding: '4px 8px' }}>
              <option value="">{all}</option>
              {children}
            </select>
          </div>
        ))}
        {[
          { label: 'From', value: filterFrom, onChange: setFilterFrom },
          { label: 'To',   value: filterTo,   onChange: setFilterTo },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{label}</label>
            <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ fontSize: 13, padding: '4px 8px' }} />
          </div>
        ))}
        {(filterSite || filterTech || filterFrom || filterTo) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterSite(''); setFilterTech(''); setFilterFrom(''); setFilterTo('') }}>Clear</button>
        )}
      </div>

      {/* Report list */}
      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>No reports found. Submit one!</div>
      ) : (
        <div>
          {reports.map(r => {
            const isOpen = expanded === r.id
            const flagged = hasFlags(r)
            const entries = r.unit_entries ?? []
            return (
              <div key={r.id} style={{
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${flagged ? '#ea580c' : 'var(--accent)'}`,
                borderRadius: 8, marginBottom: 8,
                background: 'var(--bg2)', overflow: 'hidden',
              }}>
                {/* Row header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(r.report_date)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{techDisplay(r)}</span>
                      {r.site_id ? (
                        <Link href={`/sites/${r.site_id}`} onClick={e => e.stopPropagation()}
                          style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'none' }}>
                          {siteDisplay(r)}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{siteDisplay(r)}</span>
                      )}
                      {entries.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{entries.length} unit{entries.length !== 1 ? 's' : ''}</span>
                      )}
                      {hasFollowUp(r) && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', background: '#fb923c18', border: '1px solid #fb923c44', borderRadius: 99, padding: '1px 7px' }}>
                          Follow-up needed
                        </span>
                      )}
                      {(r.site_delays || r.engineering_requests) && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', background: '#ea580c18', border: '1px solid #ea580c44', borderRadius: 99, padding: '1px 7px' }}>
                          Action needed
                        </span>
                      )}
                    </div>
                    {r.customer_complaint && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.customer_complaint}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); openEdit(r) }}>Edit</button>
                    {isOpen ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                    {entries.length > 0 && (
                      <div style={{ marginBottom: r.site_delays || r.engineering_requests || r.notes ? 12 : 0 }}>
                        {entries.map((e, ei) => (
                          <div key={ei} style={{
                            border: '1px solid var(--border)', borderRadius: 6,
                            padding: '10px 12px', marginBottom: 8, background: 'var(--bg)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                                {e.unit_tag || e.unit_serial || `Unit ${ei + 1}`}
                              </span>
                              {e.follow_up_required && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 4, padding: '1px 5px' }}>FOLLOW-UP</span>
                              )}
                            </div>
                            {e.issue_description && <DetailRow label="Issue" value={e.issue_description} />}
                            {e.resolution && <DetailRow label="Resolution" value={e.resolution} />}
                            {(e.parts_text || e.part_number) && (
                              <DetailRow label="Parts" value={e.part_number ? `${e.part_number}${e.parts_text ? ` — ${e.parts_text}` : ''}` : (e.parts_text || '')} highlight />
                            )}
                            {(e.photo_urls ?? []).length > 0 && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                {(e.photo_urls ?? []).map((url, pi) => (
                                  <a key={pi} href={url} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                      <DetailRow label="Site Delays" value={r.site_delays} highlight={!!r.site_delays} />
                      <DetailRow label="Engineering Requested" value={r.engineering_requests} highlight={!!r.engineering_requests} />
                      <DetailRow label="Notes" value={r.notes} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal form */}
      {modal !== null && (
        <Modal
          title={modal === 'new' ? 'New Daily Report' : 'Edit Daily Report'}
          onClose={() => setModal(null)}
          maxWidth={640}
        >
          {/* ── Header section ── */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text3)', marginBottom: 10 }}>
              Report Info
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Date *</label>
                <input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Site</label>
                <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                  <option value="">— Select site —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.project_name || s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Technician</label>
                <select
                  value={form.technician_id}
                  onChange={e => setForm(f => ({ ...f, technician_id: e.target.value, technician_name: '' }))}
                >
                  <option value="">— Select tech —</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Or enter name</label>
                <input
                  value={form.technician_name}
                  onChange={e => setForm(f => ({ ...f, technician_name: e.target.value, technician_id: '' }))}
                  placeholder="Manual name if not in list"
                  disabled={!!form.technician_id}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Customer Complaint / Scope of Work</label>
              <textarea
                rows={2}
                placeholder="Brief description of today's scope or reported complaint…"
                value={form.customer_complaint}
                onChange={e => setForm(f => ({ ...f, customer_complaint: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ── Unit entries ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.06 }}>
                Units Worked On
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setForm(f => ({ ...f, unit_entries: [...f.unit_entries, emptyEntry()] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={12} /> Add Unit
              </button>
            </div>

            {form.unit_entries.length === 0 ? (
              <div style={{
                border: '1px dashed var(--border)', borderRadius: 8,
                padding: '20px 14px', textAlign: 'center',
                color: 'var(--text3)', fontSize: 13,
              }}>
                No units yet — click Add Unit to log work on a specific unit
              </div>
            ) : (
              form.unit_entries.map((entry, i) => (
                <UnitEntryCard
                  key={i}
                  entry={entry}
                  index={i}
                  siteUnits={siteUnits}
                  bomParts={bomParts}
                  onUpdate={(patch) => updateEntry(i, patch)}
                  onRemove={() => setForm(f => ({ ...f, unit_entries: f.unit_entries.filter((_, idx) => idx !== i) }))}
                  onPhotoUpload={(file) => handlePhotoUpload(i, file)}
                />
              ))
            )}
          </div>

          {/* ── Footer fields ── */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text3)', marginBottom: 10 }}>
              Site-Level Notes
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Site Delays</label>
              <textarea rows={2} value={form.site_delays}
                onChange={e => setForm(f => ({ ...f, site_delays: e.target.value }))}
                placeholder="Access issues, waiting on other trades, weather, etc." />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Engineering Requested</label>
              <textarea rows={2} value={form.engineering_requests}
                onChange={e => setForm(f => ({ ...f, engineering_requests: e.target.value }))}
                placeholder="Any engineering support or decisions needed…" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Additional Notes</label>
              <textarea rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything else to note…" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {modal !== 'new' ? (
              <button className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={handleDelete}>Delete</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'new' ? 'Submit Report' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: highlight ? '#ea580c' : 'var(--text3)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}
