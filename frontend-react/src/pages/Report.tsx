import { useState } from 'react'
import { API } from '../api'
import type { Site, Issue, Note, User } from '../types'
import { useToastFn } from '../App'

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtShort(dt?: string | Date) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getWeekBounds() {
  const now = new Date()
  const todayDay = now.getDay()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - ((todayDay + 6) % 7))
  startOfThisWeek.setHours(0, 0, 0, 0)
  const noteCutoff = new Date(startOfThisWeek)
  noteCutoff.setDate(startOfThisWeek.getDate() - 7)
  return { now, noteCutoff }
}

function renderNoteText(raw?: string): string {
  if (!raw) return '—'
  try {
    const obj = JSON.parse(raw)
    if (obj._type === 'email_chain') return `📧 <em>${esc(obj.subject || 'Email Chain')}</em> · ${Array.isArray(obj.emails) ? obj.emails.length : '?'} messages`
    if (obj.date && obj.attendees) {
      const actions = (obj.actions || obj.agenda || '').slice(0, 100)
      return `📋 <strong>Meeting</strong> · ${esc(obj.attendees.slice(0, 60))}${obj.attendees.length > 60 ? '…' : ''}${actions ? ` — ${esc(actions)}` : ''}`
    }
    if (obj.to_from && obj.notes) return `📞 <strong>${esc(obj.to_from)}</strong>: ${esc(String(obj.notes).slice(0, 120))}${String(obj.notes).length > 120 ? '…' : ''}`
    const text = Object.values(obj).filter(v => typeof v === 'string').join(' · ').slice(0, 150)
    return esc(text) || esc(raw.slice(0, 120))
  } catch {
    return esc((raw || '').slice(0, 150))
  }
}

// ── Report HTML builder ────────────────────────────────────────────────────────

interface ReportData {
  sites: Site[]
  issues: Issue[]
  notes: Note[]
  users: User[]
  siteDetails: Record<string, { campaigns: unknown[]; systems: unknown[] }>
}

const SITE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  normal:       { label: 'Normal',        color: '#16a34a', bg: '#dcfce7' },
  open_issues:  { label: 'Open Issues',   color: '#d97706', bg: '#fef9c3' },
  techs_onsite: { label: 'Techs on Site', color: '#2563eb', bg: '#dbeafe' },
  emergency:    { label: 'Emergency',     color: '#dc2626', bg: '#fee2e2' },
}

const PM_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2']

function buildReportHtml(data: ReportData, weeklyNotes: string): string {
  const { sites, issues, notes, users } = data
  const { now, noteCutoff } = getWeekBounds()

  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const recentNotes = notes.filter(n => n.created_at && new Date(n.created_at) >= noteCutoff)

  const totalOpen = issues.filter(i => i.status !== 'closed').length

  // PM tracker
  const pmMap: Record<string, Site[]> = {}
  for (const site of sites) {
    const pmId = (site as Site & { project_manager_id?: string }).project_manager_id || '__none__'
    if (!pmMap[pmId]) pmMap[pmId] = []
    pmMap[pmId].push(site)
  }

  function issueRowsHtml(openIssues: Issue[]) {
    if (!openIssues.length) return `<tr><td colspan="4" style="padding:6px 8px;color:#aaa;font-size:10px;text-align:center">No open issues</td></tr>`
    const visible = openIssues.slice(0, 10)
    const overflow = openIssues.length - visible.length
    const rows = visible.map(i => {
      const pc = { critical: '#dc2626', high: '#ea580c', low: '#6b7280' }[(i.priority ?? '') as string] || '#6b7280'
      const sc = { open: '#dc2626', in_progress: '#d97706', work_complete: '#16a34a', ready_to_inspect: '#7c3aed', closed: '#6b7280' }[(i.status ?? '') as string] || '#6b7280'
      const sl = { open: 'Open', in_progress: 'In Progress', work_complete: 'Work Complete', ready_to_inspect: 'Ready to Inspect', closed: 'Closed' }[(i.status ?? '') as string] || i.status || '—'
      return `<tr>
        <td style="font-family:monospace;font-size:9px;color:#6b7280;padding:3px 8px;white-space:nowrap">${esc(i.unit_tag || '—')}</td>
        <td style="padding:3px 8px;font-size:10px">${esc(i.title || i.description || '—')}</td>
        <td style="padding:3px 8px;white-space:nowrap"><span style="color:${pc};font-size:9px;font-weight:700">${(i.priority || '').toUpperCase() || '—'}</span></td>
        <td style="padding:3px 8px;white-space:nowrap"><span style="background:${sc}18;color:${sc};border:1px solid ${sc}44;border-radius:99px;padding:1px 6px;font-size:9px;font-weight:600">${sl}</span></td>
      </tr>`
    }).join('')
    const moreRow = overflow > 0 ? `<tr><td colspan="4" style="padding:4px 8px;font-size:9px;color:#6b7280;font-style:italic;text-align:center;border-top:1px solid #e5e7eb">+ ${overflow} more</td></tr>` : ''
    return rows + moreRow
  }

  function noteRowsHtml(siteNotes: Note[]) {
    if (!siteNotes.length) return `<tr><td colspan="3" style="padding:6px 8px;color:#aaa;font-size:10px;text-align:center">No recent notes</td></tr>`
    return siteNotes.map(n => `<tr>
      <td style="padding:3px 8px;white-space:nowrap;font-size:9px;color:#6b7280;vertical-align:top">${fmtShort(n.created_at)}</td>
      <td style="padding:3px 8px;white-space:nowrap;font-size:9px;color:#6b7280;vertical-align:top">${esc(n.author_name || n.created_by_name || '—')}</td>
      <td style="padding:3px 8px;font-size:10px;max-width:340px;line-height:1.4">${renderNoteText(n.content)}</td>
    </tr>`).join('')
  }

  const pmTrackerHtml = Object.entries(pmMap)
    .sort(([a], [b]) => {
      if (a === '__none__') return 1
      if (b === '__none__') return -1
      const nameA = (users.find(u => u.id === a)?.name || '').toLowerCase()
      const nameB = (users.find(u => u.id === b)?.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
    .map(([pmId, pmSites], idx) => {
      const user = users.find(u => u.id === pmId)
      const pmName = user?.name || user?.email || 'Unassigned'
      const initials = pmName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      const color = PM_COLORS[idx % PM_COLORS.length]

      const rows = pmSites.map(site => {
        const statusCfg = SITE_STATUS[(site as Site & { site_status?: string }).site_status || 'normal'] || SITE_STATUS.normal
        const openCount = issues.filter(i => i.site_id === site.id && i.status === 'open').length
        const inProgCount = issues.filter(i => i.site_id === site.id && i.status === 'in_progress').length
        const latestNote = recentNotes.filter(n => n.site_id === site.id).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0]
        const updateText = latestNote ? renderNoteText(latestNote.content) : '<span style="color:#9ca3af;font-style:italic">No update this week</span>'
        const issueStr = (openCount + inProgCount) > 0
          ? `${openCount ? `<span style="color:#dc2626;font-weight:700">${openCount} open</span>` : ''}${openCount && inProgCount ? ' · ' : ''}${inProgCount ? `<span style="color:#d97706">${inProgCount} in-prog</span>` : ''}`
          : `<span style="color:#9ca3af">—</span>`
        const location = [site.city, site.state].filter(Boolean).join(', ') || site.address || '—'
        return `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:4px 8px;font-weight:700;font-size:10px;white-space:nowrap">${esc(site.name || '—')}</td>
          <td style="padding:4px 8px;font-size:9px;color:#6b7280;white-space:nowrap">${esc(location)}</td>
          <td style="padding:4px 8px;white-space:nowrap"><span style="background:${statusCfg.color}18;color:${statusCfg.color};border:1px solid ${statusCfg.color}44;border-radius:99px;padding:1px 6px;font-size:9px;font-weight:600">${statusCfg.label}</span></td>
          <td style="padding:4px 8px;font-size:9px;white-space:nowrap">${issueStr}</td>
          <td style="padding:4px 8px;font-size:10px;max-width:260px">${updateText}</td>
        </tr>`
      }).join('')

      return `<div style="margin-bottom:14px;border-left:3px solid ${color};padding-left:10px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <div style="width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>
          <span style="font-size:11px;font-weight:700;color:#111827">${esc(pmName)}</span>
          <span style="font-size:9px;color:#6b7280">${pmSites.length} site${pmSites.length !== 1 ? 's' : ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:10px">
          <thead><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
            ${['Site', 'Location', 'Status', 'Issues', "This Week's Update"].map(h =>
              `<th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">${h}</th>`
            ).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }).join('')

  // Per-site detail sections
  const detailSectionsHtml = sites.map(site => {
    const openIssues = issues.filter(i => i.site_id === site.id && i.status !== 'closed')
    const siteNotes = recentNotes.filter(n => n.site_id === site.id)
    const statusCfg = SITE_STATUS[(site as Site & { site_status?: string }).site_status || 'normal'] || SITE_STATUS.normal

    return `<div style="page-break-before:always;margin:0 24px 32px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">
        <div>
          <div style="font-size:14px;font-weight:800;color:#111827">${esc(site.name)}</div>
          ${[site.city, site.state].filter(Boolean).length ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">${esc([site.city, site.state].filter(Boolean).join(', '))}</div>` : ''}
        </div>
        <span style="background:${statusCfg.color}18;color:${statusCfg.color};border:1px solid ${statusCfg.color}44;border-radius:99px;padding:2px 10px;font-size:10px;font-weight:600">${statusCfg.label}</span>
      </div>

      <!-- Issues -->
      <div style="margin-bottom:14px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Open Issues (${openIssues.length})</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-size:10px">
          <thead><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
            ${['Equipment', 'Description', 'Priority', 'Status'].map(h =>
              `<th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">${h}</th>`
            ).join('')}
          </tr></thead>
          <tbody>${issueRowsHtml(openIssues)}</tbody>
        </table>
      </div>

      <!-- Notes -->
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Recent Notes</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-size:10px">
          <thead><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
            ${['Date', 'Author', 'Note'].map(h =>
              `<th style="padding:4px 8px;font-size:8px;text-transform:uppercase;color:#9ca3af;font-weight:700;text-align:left">${h}</th>`
            ).join('')}
          </tr></thead>
          <tbody>${noteRowsHtml(siteNotes)}</tbody>
        </table>
      </div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>All Sites Status Report — ${today}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; background: #fff; color: #111827; }
  @media print {
    .no-print { display: none !important; }
    body { font-size: 10px; }
  }
  #weekly-notes-box:empty:before { content: attr(data-placeholder); color: #9ca3af; }
</style>
</head>
<body>
  <!-- HEADER -->
  <div style="background:#1e3a5f;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:14px;border-bottom:3px solid #2563eb">
    <div style="width:32px;height:32px;background:#6366f1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">Z</div>
    <div>
      <div style="font-size:15px;font-weight:800;letter-spacing:.04em">ALL SITES STATUS REPORT</div>
      <div style="font-size:10px;color:#a5b4fc;margin-top:2px">Zak's Office · ${today}</div>
    </div>
    <div style="flex:1"></div>
    <div style="text-align:right;font-size:10px;color:#93c5fd">Week of: <strong style="color:#fff">${fmtShort(noteCutoff)} – ${fmtShort(now)}</strong></div>
  </div>

  <!-- STATS BAR -->
  <div style="display:flex;gap:20px;margin:12px 24px;padding:8px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;align-items:center">
    ${Object.entries(SITE_STATUS).map(([key, cfg]) => {
      const count = sites.filter(s => ((s as Site & { site_status?: string }).site_status || 'normal') === key).length
      if (!count) return ''
      return `<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:${cfg.color}">${count}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">${cfg.label}</div></div>`
    }).join('')}
    <div style="width:1px;background:#e5e7eb;align-self:stretch;margin:0 4px"></div>
    <div style="text-align:center"><div style="font-size:18px;font-weight:800;color:#dc2626">${totalOpen}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">Open Issues</div></div>
    <div style="text-align:center"><div style="font-size:18px;font-weight:800;color:#111827">${sites.length}</div><div style="font-size:8px;text-transform:uppercase;color:#6b7280">Total Sites</div></div>
  </div>

  <!-- PM PROJECT TRACKER -->
  <div style="margin:12px 24px 0">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:.06em">PM Project Tracker — Week of ${fmtShort(noteCutoff)} – ${fmtShort(now)}</div>
    ${pmTrackerHtml}
  </div>

  <!-- WEEKLY NOTES -->
  <div style="margin:14px 24px 0">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;letter-spacing:.06em">Weekly Notes</div>
    <div class="no-print" style="font-size:9px;color:#9ca3af;margin-bottom:4px">Type your notes below — they will appear when printed.</div>
    <div id="weekly-notes-box"
         contenteditable="true"
         style="min-height:100px;border:1px solid #d1d5db;border-radius:6px;padding:10px 12px;font-size:11px;line-height:1.6;color:#111827;outline:none;font-family:'Segoe UI',system-ui,sans-serif"
         data-placeholder="Click here to type your weekly notes…">${esc(weeklyNotes)}</div>
  </div>

  <!-- SITE DETAIL PAGES -->
  ${detailSectionsHtml}
</body>
</html>`
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function Report() {
  const toast = useToastFn()
  const [loading, setLoading] = useState(false)
  const [weeklyNotes, setWeeklyNotes] = useState('')

  async function buildReport() {
    setLoading(true)
    toast('Building report…')
    try {
      const [sites, issues, notes, users] = await Promise.all([
        API.sites.list(),
        API.issues.listAll().catch(() => [] as Issue[]),
        API.notes.search('').catch(() => [] as Note[]),
        API.auth.listUsers().catch(() => [] as User[]),
      ])

      // Per-site detail data
      const siteDetails: Record<string, { campaigns: unknown[]; systems: unknown[] }> = {}
      await Promise.all(sites.map(async s => {
        const [campaigns, systems] = await Promise.all([
          API.campaigns.list(s.id).catch(() => []),
          API.systems.list(s.id).catch(() => []),
        ])
        siteDetails[s.id] = { campaigns, systems }
      }))

      const html = buildReportHtml({ sites, issues, notes, users, siteDetails }, weeklyNotes)
      const win = window.open('', '_blank')
      if (!win) { toast('Popup blocked — allow pop-ups and try again', 'error'); return }
      win.document.write(html)
      win.document.close()
    } catch (err: unknown) {
      toast('Failed to load report data: ' + (err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const { noteCutoff, now } = getWeekBounds()

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Report</h1>
          <div className="page-subtitle">
            Weekly / project status report · Week of {fmtShort(noteCutoff)} – {fmtShort(now)}
          </div>
        </div>
        <button className="btn btn-primary" onClick={buildReport} disabled={loading}>
          {loading ? 'Building…' : '📄 Generate Report'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Weekly Notes</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 0, marginBottom: 10 }}>
          These notes will appear in the generated report under "Weekly Notes".
        </p>
        <textarea
          rows={8}
          value={weeklyNotes}
          onChange={e => setWeeklyNotes(e.target.value)}
          placeholder="Type your weekly notes here…"
          style={{ width: '100%', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setWeeklyNotes('')}>Clear</button>
          <button className="btn btn-primary" onClick={buildReport} disabled={loading}>
            {loading ? 'Building…' : '📄 Generate Report'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, maxWidth: 700 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>What's Included</div>
        <ul style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
          <li>All sites status overview with PM tracker</li>
          <li>Open issue counts per site</li>
          <li>Weekly notes (last 2 weeks)</li>
          <li>Per-site breakdowns: open issues, recent activity</li>
          <li>Printable via browser print dialog (Ctrl/Cmd+P)</li>
        </ul>
      </div>
    </div>
  )
}
