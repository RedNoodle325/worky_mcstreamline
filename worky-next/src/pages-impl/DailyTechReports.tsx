'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { DailyTechReport, Site, Technician } from '../types'

interface ReportForm {
  report_date: string
  technician_id: string
  technician_name: string
  site_id: string
  units_worked: string
  work_performed: string
  site_delays: string
  parts_needed: string
  engineering_requests: string
  notes: string
}

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM: ReportForm = {
  report_date: today(),
  technician_id: '',
  technician_name: '',
  site_id: '',
  units_worked: '',
  work_performed: '',
  site_delays: '',
  parts_needed: '',
  engineering_requests: '',
  notes: '',
}

function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.slice(0, 10).split('-')
  return `${m}/${d}/${y}`
}

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

  function openNew() {
    setForm({ ...EMPTY_FORM, report_date: today() })
    setModal('new')
  }

  function openEdit(r: DailyTechReport) {
    setForm({
      report_date:          r.report_date?.slice(0, 10) ?? today(),
      technician_id:        r.technician_id ?? '',
      technician_name:      r.technician_name ?? '',
      site_id:              r.site_id ?? '',
      units_worked:         r.units_worked ?? '',
      work_performed:       r.work_performed ?? '',
      site_delays:          r.site_delays ?? '',
      parts_needed:         r.parts_needed ?? '',
      engineering_requests: r.engineering_requests ?? '',
      notes:                r.notes ?? '',
    })
    setModal(r)
  }

  async function handleSave() {
    if (!form.report_date) {
      toast('Report date is required', 'error')
      return
    }
    if (!form.technician_id && !form.technician_name.trim()) {
      toast('Technician name or selection is required', 'error')
      return
    }
    setSaving(true)
    const data: Partial<DailyTechReport> = {
      report_date:          form.report_date,
      technician_id:        form.technician_id || undefined,
      technician_name:      form.technician_name.trim() || undefined,
      site_id:              form.site_id || undefined,
      units_worked:         form.units_worked.trim() || undefined,
      work_performed:       form.work_performed.trim() || undefined,
      site_delays:          form.site_delays.trim() || undefined,
      parts_needed:         form.parts_needed.trim() || undefined,
      engineering_requests: form.engineering_requests.trim() || undefined,
      notes:                form.notes.trim() || undefined,
    }
    try {
      if (modal && modal !== 'new') {
        const updated = await API.dailyTechReports.update(modal.id, data)
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
        toast('Report saved')
      } else {
        const created = await API.dailyTechReports.create(data)
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
      await API.dailyTechReports.delete(modal.id)
      setReports(prev => prev.filter(r => r.id !== (modal as DailyTechReport).id))
      setModal(null)
      toast('Report deleted')
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  function techDisplay(r: DailyTechReport) {
    if (r._technician_name) return r._technician_name
    if (r.technician_name) return r.technician_name
    return '—'
  }

  function siteDisplay(r: DailyTechReport) {
    return r._site_name || '—'
  }

  const hasFlags = (r: DailyTechReport) =>
    !!(r.site_delays || r.parts_needed || r.engineering_requests)

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Daily Tech Reports</h1>
          <div className="page-subtitle">Field technician daily activity logs</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + New Report
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Technician</label>
          <select
            value={filterTech}
            onChange={e => setFilterTech(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          >
            <option value="">All Techs</option>
            {techs.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Site</label>
          <select
            value={filterSite}
            onChange={e => setFilterSite(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          >
            <option value="">All Sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.project_name || s.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>To</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          />
        </div>
        {(filterSite || filterTech || filterFrom || filterTo) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterSite(''); setFilterTech(''); setFilterFrom(''); setFilterTo('') }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Report list */}
      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>
          No reports found. Submit one!
        </div>
      ) : (
        <div>
          {reports.map(r => {
            const isOpen = expanded === r.id
            const flagged = hasFlags(r)
            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${flagged ? '#ea580c' : 'var(--accent)'}`,
                  borderRadius: 8,
                  marginBottom: 8,
                  background: 'var(--bg2)',
                  overflow: 'hidden',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                  }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(r.report_date)}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--accent)',
                      }}>
                        {techDisplay(r)}
                      </span>
                      {r.site_id ? (
                        <Link
                          href={`/sites/${r.site_id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'none' }}
                        >
                          {siteDisplay(r)}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{siteDisplay(r)}</span>
                      )}
                      {flagged && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#ea580c',
                          background: '#ea580c18', border: '1px solid #ea580c44',
                          borderRadius: 99, padding: '1px 7px',
                        }}>
                          Action needed
                        </span>
                      )}
                    </div>
                    {r.units_worked && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        Units: {r.units_worked}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={e => { e.stopPropagation(); openEdit(r) }}
                    >
                      Edit
                    </button>
                    <span style={{ color: 'var(--text3)', fontSize: 12, lineHeight: '28px' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{
                    padding: '0 14px 14px',
                    borderTop: '1px solid var(--border)',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12,
                    paddingTop: 12,
                  }}>
                    <Field label="Work Performed" value={r.work_performed} />
                    <Field label="Site Delays" value={r.site_delays} highlight={!!r.site_delays} />
                    <Field label="Parts Needed" value={r.parts_needed} highlight={!!r.parts_needed} />
                    <Field label="Engineering Requested" value={r.engineering_requests} highlight={!!r.engineering_requests} />
                    <Field label="Additional Notes" value={r.notes} />
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
          maxWidth={560}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={form.report_date}
                onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Site</label>
              <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— Select site —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.project_name || s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label>Technician</label>
              <select
                value={form.technician_id}
                onChange={e => setForm(f => ({ ...f, technician_id: e.target.value, technician_name: '' }))}
              >
                <option value="">— Select tech —</option>
                {techs.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Or enter name *</label>
              <input
                value={form.technician_name}
                onChange={e => setForm(f => ({ ...f, technician_name: e.target.value, technician_id: '' }))}
                placeholder="Manual name if not in list"
                disabled={!!form.technician_id}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Units Worked On</label>
            <input
              value={form.units_worked}
              onChange={e => setForm(f => ({ ...f, units_worked: e.target.value }))}
              placeholder="e.g. AHU-01, AHU-02, CU-03"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Work Performed</label>
            <textarea
              rows={3}
              value={form.work_performed}
              onChange={e => setForm(f => ({ ...f, work_performed: e.target.value }))}
              placeholder="Describe what was done today…"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Site Delays</label>
            <textarea
              rows={2}
              value={form.site_delays}
              onChange={e => setForm(f => ({ ...f, site_delays: e.target.value }))}
              placeholder="Any delays encountered (access issues, weather, waiting on other trades, etc.)"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Parts Needed</label>
            <textarea
              rows={2}
              value={form.parts_needed}
              onChange={e => setForm(f => ({ ...f, parts_needed: e.target.value }))}
              placeholder="List any parts that need to be ordered or sourced…"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Engineering Requested</label>
            <textarea
              rows={2}
              value={form.engineering_requests}
              onChange={e => setForm(f => ({ ...f, engineering_requests: e.target.value }))}
              placeholder="Any engineering support or decisions needed…"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Additional Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything else to note…"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {modal !== 'new' ? (
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--red)' }}
                onClick={handleDelete}
              >
                Delete
              </button>
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

function Field({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: highlight ? '#ea580c' : 'var(--text3)',
        marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text1)', whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  )
}
