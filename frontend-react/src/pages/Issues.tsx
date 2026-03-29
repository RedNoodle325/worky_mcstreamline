import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { API } from '../api'
import type { Issue, Site } from '../types'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { useToastFn } from '../App'

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { val: 'open',             label: 'Open',             color: 'var(--red)'    },
  { val: 'in_progress',      label: 'In Progress',      color: 'var(--yellow)' },
  { val: 'work_complete',    label: 'Work Complete',    color: 'var(--green)'  },
  { val: 'ready_to_inspect', label: 'Ready to Inspect', color: 'var(--accent)' },
  { val: 'closed',           label: 'Closed',           color: 'var(--text3)'  },
]

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'var(--red)', high: 'var(--orange)', low: 'var(--text2)',
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical', high: 'High', low: 'Low',
}

const ISSUE_TYPES = [
  'Incorrect Installation', 'Damage after Install', 'Missing Components',
  'Material/Component Failure', 'Shipping Damage',
  'Documentation Not Complete or Ready', 'Design Defect/Lack of Design', 'Other',
]

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Issue Modal (create + edit) ────────────────────────────────────────────────

interface IssueModalProps {
  issue: Issue | null
  sites: Site[]
  onSave: (i: Issue) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function IssueModal({ issue, sites, onSave, onDelete, onClose }: IssueModalProps) {
  const toast = useToastFn()
  const [saving, setSaving] = useState(false)
  const [siteId, setSiteId] = useState(issue?.site_id ?? '')
  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState(issue?.description ?? '')
  const [unitTag, setUnitTag] = useState(issue?.unit_tag ?? '')
  const [cxZone, setCxZone] = useState(issue?.cx_zone ?? '')
  const [priority, setPriority] = useState(issue?.priority ?? 'low')
  const [status, setStatus] = useState(issue?.status ?? 'open')
  const [cxIssueType, setCxIssueType] = useState(issue?.cx_issue_type ?? '')
  const [cxalloyUrl, setCxalloyUrl] = useState(issue?.cxalloy_url ?? '')
  const [resolutionNotes, setResolutionNotes] = useState(issue?.resolution_notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return toast('Title is required', 'error')
    if (!issue && !siteId) return toast('Site is required', 'error')
    setSaving(true)
    const data: Partial<Issue> = {
      title: title.trim(),
      description: description.trim() || undefined,
      unit_tag: unitTag.trim() || undefined,
      cx_zone: cxZone.trim() || undefined,
      priority: priority || undefined,
      status,
      cx_issue_type: cxIssueType || undefined,
      cxalloy_url: cxalloyUrl.trim() || undefined,
      resolution_notes: resolutionNotes.trim() || undefined,
    }
    try {
      if (issue) {
        const updated = await API.issues.update(issue.id, data)
        onSave(updated)
        toast('Issue saved')
      } else {
        const created = await API.issues.create(siteId, { ...data, site_id: siteId })
        onSave(created)
        toast('Issue created')
      }
      onClose()
    } catch (err: unknown) {
      toast('Error: ' + (err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!issue || !onDelete) return
    if (!confirm('Delete this issue?')) return
    try {
      await API.issues.delete(issue.id)
      onDelete(issue.id)
      toast('Issue deleted')
      onClose()
    } catch (err: unknown) {
      toast('Error: ' + (err as Error).message, 'error')
    }
  }

  return (
    <Modal title={issue ? 'Edit Issue' : 'New Issue'} onClose={onClose} maxWidth={560}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {!issue && (
            <div className="form-group full">
              <label>Site *</label>
              <select required value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">— Select Site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group full">
            <label>Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue" />
          </div>
          <div className="form-group full">
            <label>Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Details…" />
          </div>
          <div className="form-group">
            <label>Equipment Tag</label>
            <input value={unitTag} onChange={e => setUnitTag(e.target.value)} placeholder="e.g. CRAC-DH1300-18" />
          </div>
          <div className="form-group">
            <label>Zone</label>
            <input value={cxZone} onChange={e => setCxZone(e.target.value)} placeholder="e.g. Data Hall 1300" />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          {issue && (
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="work_complete">Work Complete</option>
                <option value="ready_to_inspect">Ready to Inspect</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
          <div className="form-group full">
            <label>Issue Type</label>
            <select value={cxIssueType} onChange={e => setCxIssueType(e.target.value)}>
              <option value="">— None —</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(issue?.cxalloy_issue_id || cxalloyUrl) && (
            <div className="form-group full">
              <label>CxAlloy Issue URL</label>
              <input
                type="url"
                value={cxalloyUrl}
                onChange={e => setCxalloyUrl(e.target.value)}
                placeholder="https://app.cxalloy.com/…"
              />
            </div>
          )}
          <div className="form-group full">
            <label>Comments / Resolution</label>
            <textarea rows={2} value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Notes on resolution…" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 16 }}>
          {issue && onDelete ? (
            <button type="button" className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={handleDelete}>Delete</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{issue ? 'Save' : 'Create Issue'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function Issues() {
  const toast = useToastFn()

  const [issues, setIssues] = useState<Issue[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set(['open', 'in_progress']))

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingIssue, setEditingIssue] = useState<Issue | null | undefined>(undefined)

  useEffect(() => {
    Promise.all([API.issues.listAll(), API.sites.list()])
      .then(([i, s]) => { setIssues(i); setSites(s) })
      .catch(err => toast('Failed to load: ' + err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const siteMap = useMemo(() => Object.fromEntries(sites.map(s => [s.id, s])), [sites])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    STATUS_OPTS.forEach(s => { c[s.val] = issues.filter(i => i.status === s.val).length })
    return c
  }, [issues])

  const filtered = useMemo(() => {
    return issues.filter(i => {
      if (filterSite && i.site_id !== filterSite) return false
      if (filterStatuses.size && !filterStatuses.has(i.status ?? 'open')) return false
      if (filterPriority && i.priority !== filterPriority) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(
          (i.title ?? '').toLowerCase().includes(q) ||
          (i.unit_tag ?? '').toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q)
        )) return false
      }
      return true
    })
  }, [issues, filterSite, filterStatuses, filterPriority, search])

  function toggleStatus(val: string) {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
  }

  if (loading) return <div style={{ color: 'var(--text2)', padding: 40, textAlign: 'center' }}>Loading…</div>

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Issues</h1>
          <div className="page-subtitle">
            {issues.length} total · {counts['open'] ?? 0} open · {counts['closed'] ?? 0} closed
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditingIssue(null)}>+ New Issue</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 180 }}
          />
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Status:</span>
            {STATUS_OPTS.map(s => {
              const active = filterStatuses.has(s.val)
              return (
                <button
                  key={s.val}
                  onClick={() => toggleStatus(s.val)}
                  style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${s.color}`, background: active ? s.color : 'transparent',
                    color: active ? '#fff' : s.color, transition: 'all .15s', whiteSpace: 'nowrap',
                  }}
                >
                  {s.label} <span style={{ opacity: .7 }}>{counts[s.val] ?? 0}</span>
                </button>
              )
            })}
            {filterStatuses.size > 0 && (
              <button
                onClick={() => setFilterStatuses(new Set())}
                style={{ padding: '3px 8px', borderRadius: 99, fontSize: 11, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
              >✕ Clear</button>
            )}
          </div>
          <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 'auto' }}>{filtered.length} shown</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="card desktop-only">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Issue ID</th>
                <th>Site</th>
                <th>Equipment</th>
                <th style={{ minWidth: 200 }}>Description</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No issues match your filters</td></tr>
              ) : filtered.flatMap(i => {
                const site = i.site_id ? siteMap[i.site_id] : undefined
                const isOpen = expandedId === i.id
                const priColor = PRIORITY_COLOR[i.priority ?? ''] ?? 'var(--text3)'

                const row = (
                  <tr
                    key={i.id + '_row'}
                    style={{ cursor: 'pointer', background: isOpen ? 'var(--bg3)' : undefined }}
                    onClick={() => setExpandedId(isOpen ? null : i.id)}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.title ?? ''}>
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginRight: 5, display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>▶</span>
                      {i.cxalloy_issue_id || i.title || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {site ? (
                        <Link to={`/sites/${site.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit' }}>{site.name}</Link>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>{i.unit_tag || '—'}</td>
                    <td style={{ maxWidth: 260 }}>
                      {i.description ? (
                        <span style={{ fontSize: 12, color: 'var(--text3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 } as React.CSSProperties}>
                          {i.description}
                        </span>
                      ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
                    </td>
                    <td>
                      <span style={{ color: priColor, fontWeight: 600, fontSize: 11 }}>
                        {PRIORITY_LABEL[i.priority ?? ''] || i.priority || '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={i.status ?? 'open'} size="sm" />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(i.reported_date || i.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingIssue(i)}>Edit</button>
                    </td>
                  </tr>
                )

                const detail = isOpen ? (
                  <tr key={i.id + '_detail'} style={{ background: 'var(--bg3)' }}>
                    <td colSpan={8} style={{ padding: '0 16px 16px 32px', borderBottom: '2px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px 20px', paddingTop: 12, marginBottom: (i.description || i.resolution_notes) ? 12 : 0 }}>
                        {i.cx_issue_type && <div><div className="section-title">Issue Type</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{i.cx_issue_type}</div></div>}
                        {i.cx_zone && <div><div className="section-title">Zone</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{i.cx_zone}</div></div>}
                        {i.cx_source && <div><div className="section-title">Source</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{i.cx_source}</div></div>}
                        {i.reported_by && <div><div className="section-title">Reported By</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{i.reported_by}</div></div>}
                        {i.closed_date && <div><div className="section-title">Closed</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(i.closed_date)}</div></div>}
                      </div>
                      {i.description && (
                        <div style={{ marginBottom: 8 }}>
                          <div className="section-title">Description</div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>{i.description}</div>
                        </div>
                      )}
                      {i.resolution_notes && (
                        <div>
                          <div className="section-title">Comments / Resolution</div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text2)', marginTop: 3, background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px' }}>{i.resolution_notes}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null

                return [row, detail].filter(Boolean)
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="mobile-issue-cards mobile-only">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No issues match your filters</div>
        ) : filtered.map(i => {
          const site = i.site_id ? siteMap[i.site_id] : undefined
          const isOpen = expandedId === i.id
          const isCx = !!i.cxalloy_issue_id
          const priColor = PRIORITY_COLOR[i.priority ?? ''] ?? 'var(--text3)'
          // CxAlloy = cyan left border; manual/field = accent pink
          const accentColor = isCx ? 'var(--cyan)' : 'var(--accent)'

          // Primary label: unit_tag is the identifier, fall back to title
          const primaryLabel = i.unit_tag || i.title || '—'
          // Secondary text: for CX issues, description is the CxAlloy description; for manual, it's the description
          const secondaryText = i.description

          return (
            <div
              key={i.id}
              style={{
                borderLeft: `3px solid ${isCx ? 'var(--cyan)' : 'var(--accent)'}`,
                background: 'var(--bg2)',
                borderRadius: '0 8px 8px 0',
                borderTop: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              {/* Collapsed row — always visible, tap to expand */}
              <div
                style={{ padding: '9px 12px', cursor: 'pointer' }}
                onClick={() => setExpandedId(isOpen ? null : i.id)}
              >
                {/* Row 1: source badge + identifier + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: 1,
                    color: accentColor,
                    background: `color-mix(in srgb, ${isCx ? 'var(--cyan)' : 'var(--accent)'} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${isCx ? 'var(--cyan)' : 'var(--accent)'} 40%, transparent)`,
                    borderRadius: 3, padding: '1px 5px', flexShrink: 0,
                  }}>
                    {isCx ? 'CX' : 'FIELD'}
                  </span>

                  {/* CxAlloy issue ID — clickable link if URL available */}
                  {isCx && (
                    i.cxalloy_url ? (
                      <a
                        href={i.cxalloy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: 'monospace', fontSize: 11,
                          color: 'var(--cyan)', textDecoration: 'none',
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        {i.cxalloy_issue_id}
                        <span style={{ fontSize: 9, opacity: 0.8 }}>↗</span>
                      </a>
                    ) : (
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                        {i.cxalloy_issue_id}
                      </span>
                    )
                  )}

                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <StatusBadge status={i.status ?? 'open'} size="sm" />
                  </span>
                </div>

                {/* Row 2: primary identifier (unit_tag / title) — bold */}
                <div style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text)',
                  lineHeight: 1.3, marginBottom: secondaryText ? 3 : 5,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {primaryLabel}
                </div>

                {/* Row 3: description — 1 line, muted */}
                {secondaryText && (
                  <div style={{
                    fontSize: 12, color: 'var(--text3)', marginBottom: 5,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {secondaryText}
                  </div>
                )}

                {/* Row 4: meta — site · priority · date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
                  {site && (
                    <Link
                      to={`/sites/${site.id}`}
                      onClick={e => e.stopPropagation()}
                      style={{ color: 'var(--text3)', textDecoration: 'none' }}
                    >
                      {site.name}
                    </Link>
                  )}
                  {site && i.priority && <span style={{ opacity: 0.4 }}>·</span>}
                  {i.priority && (
                    <span style={{ color: priColor, fontWeight: 700 }}>
                      {PRIORITY_LABEL[i.priority] || i.priority}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto' }}>
                    {fmtDate(i.reported_date || i.created_at)}
                  </span>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isOpen && (
                <div style={{ borderTop: `1px solid var(--border)`, background: 'var(--bg3)' }}>
                  <div style={{ padding: '10px 12px' }}>
                    {/* CxAlloy title shown as reference when it differs from unit_tag */}
                    {isCx && i.title && i.title !== i.unit_tag && (
                      <div style={{ marginBottom: 10 }}>
                        <div className="mic-detail-label" style={{ marginBottom: 2 }}>CxAlloy Title</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{i.title}</div>
                      </div>
                    )}

                    {/* Full description */}
                    {secondaryText && (
                      <div style={{ marginBottom: 10 }}>
                        <div className="mic-detail-label" style={{ marginBottom: 2 }}>Description</div>
                        <div className="mic-detail-text">{secondaryText}</div>
                      </div>
                    )}

                    {/* CX metadata grid */}
                    {(i.cx_issue_type || i.cx_zone || i.cx_source || i.reported_by || i.closed_date) && (
                      <div className="mic-detail-grid" style={{ marginBottom: 8 }}>
                        {i.cx_issue_type && (
                          <div><div className="mic-detail-label">Issue Type</div><div className="mic-detail-value">{i.cx_issue_type}</div></div>
                        )}
                        {i.cx_zone && (
                          <div><div className="mic-detail-label">Zone</div><div className="mic-detail-value">{i.cx_zone}</div></div>
                        )}
                        {i.cx_source && (
                          <div><div className="mic-detail-label">Source</div><div className="mic-detail-value">{i.cx_source}</div></div>
                        )}
                        {i.reported_by && (
                          <div><div className="mic-detail-label">Reported By</div><div className="mic-detail-value">{i.reported_by}</div></div>
                        )}
                        {i.closed_date && (
                          <div><div className="mic-detail-label">Closed</div><div className="mic-detail-value">{fmtDate(i.closed_date)}</div></div>
                        )}
                      </div>
                    )}

                    {/* Resolution notes */}
                    {i.resolution_notes && (
                      <div>
                        <div className="mic-detail-label" style={{ marginBottom: 2 }}>Resolution</div>
                        <div className="mic-detail-text" style={{ background: 'var(--bg2)', borderRadius: 5, padding: '7px 9px' }}>{i.resolution_notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingIssue(i)}>Edit</button>
                    {isCx && i.cxalloy_url && (
                      <a
                        href={i.cxalloy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-secondary"
                        style={{ color: 'var(--cyan)', textDecoration: 'none' }}
                      >
                        Open in CxAlloy ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {editingIssue !== undefined && (
        <IssueModal
          issue={editingIssue}
          sites={sites}
          onSave={saved => {
            setIssues(prev => {
              const idx = prev.findIndex(i => i.id === saved.id)
              return idx >= 0 ? prev.map((i, n) => n === idx ? saved : i) : [saved, ...prev]
            })
          }}
          onDelete={id => setIssues(prev => prev.filter(i => i.id !== id))}
          onClose={() => setEditingIssue(undefined)}
        />
      )}
    </div>
  )
}
