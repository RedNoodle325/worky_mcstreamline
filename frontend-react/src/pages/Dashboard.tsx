import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import type { Site, Issue, ServiceTicket, Todo } from '../types'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  urgent:   '#dc2626',
  normal:   '#2563eb',
  low:      '#6b7280',
}

const STATUS_COLOR: Record<string, string> = {
  open:        '#dc2626',
  in_progress: '#d97706',
}

const STATUS_LABEL: Record<string, string> = {
  open:        'Open',
  in_progress: 'In Progress',
}

const SITE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  normal:        { label: 'Normal',        color: '#16a34a' },
  open_issues:   { label: 'Open Issues',   color: '#d97706' },
  techs_onsite:  { label: 'Techs on Site', color: '#2563eb' },
  emergency:     { label: 'Emergency',     color: '#dc2626' },
}

const PHASE_BADGE: Record<string, { label: string; color: string }> = {
  production_shipping: { label: 'Production & Shipping', color: '#6366f1' },
  commissioning_l2:    { label: 'L2 Pre-Energization',   color: '#f97316' },
  commissioning_l3:    { label: 'L3 Startup',            color: '#eab308' },
  commissioning_l4:    { label: 'L4 SOO/TAB/BMS',        color: '#3b82f6' },
  commissioning_l5:    { label: 'L5 IST',                color: '#06b6d4' },
  pre_commissioning:   { label: 'Pre-Commissioning',     color: '#6366f1' },
}

function StatCard({
  label, value, color, onClick,
}: {
  label: string; value: number | string; color?: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 14px', background: 'var(--bg2)',
        border: `1px solid var(--border)`,
        borderLeft: color ? `3px solid ${color}` : '1px solid var(--border)',
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}

export function Dashboard() {
  const toast = useToastFn()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([])
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    Promise.all([
      API.sites.list(),
      API.issues.listAll().catch(() => [] as Issue[]),
      API.serviceTickets.listAll().catch(() => [] as ServiceTicket[]),
      API.todos.list({ status: 'todo' }).catch(() => [] as Todo[]),
      API.todos.list({ status: 'in_progress' }).catch(() => [] as Todo[]),
    ]).then(([s, i, st, todosOpen, todosInProgress]) => {
      setSites(s)
      setIssues(i)
      setServiceTickets(st)
      const merged = [...todosInProgress, ...todosOpen].sort((a, b) => {
        const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
        return (order[a.priority ?? 'normal'] ?? 2) - (order[b.priority ?? 'normal'] ?? 2)
      })
      setTodos(merged)
    }).catch(e => {
      toast('Failed to load dashboard: ' + (e as Error).message, 'error')
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]))

  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in_progress').length
  const openTickets = serviceTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length

  const criticalIssues = issues
    .filter(i =>
      (i.priority === 'critical' || i.priority === 'high') &&
      (i.status === 'open' || i.status === 'in_progress')
    )
    .sort((a, b) => (a.priority === 'critical' ? 0 : 1) - (b.priority === 'critical' ? 0 : 1))

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            Dashboard
          </h1>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <StatCard label="Sites" value={sites.length} />
          <StatCard
            label="Open Issues" value={openIssues}
            color={openIssues > 0 ? '#d97706' : undefined}
            onClick={() => navigate('/issues')}
          />
          <StatCard
            label="CS Tickets" value={openTickets}
            color={openTickets > 0 ? '#2563eb' : undefined}
            onClick={() => navigate('/service-tickets')}
          />
        </div>
      </div>

      {/* Two-column widget row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Critical Issues */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.07em', color: 'var(--red)', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Critical &amp; High Issues</span>
            <Link
              to="/issues"
              style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {criticalIssues.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>
              No critical or high issues
            </div>
          ) : (
            <>
              {criticalIssues.slice(0, 8).map(i => (
                <div
                  key={i.id}
                  onClick={() => navigate(`/sites/${i.site_id}`)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 6, height: 6, borderRadius: '50%',
                    background: PRIORITY_COLOR[i.priority ?? 'high'], marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {siteMap[i.site_id ?? ''] || 'Unknown'}
                      {i.unit_tag ? ` · ${i.unit_tag}` : ''}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 700,
                    color: STATUS_COLOR[i.status ?? ''] || 'var(--text3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABEL[i.status ?? ''] || i.status}
                  </span>
                </div>
              ))}
              {criticalIssues.length > 8 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 6, textAlign: 'center' }}>
                  + {criticalIssues.length - 8} more
                </div>
              )}
            </>
          )}
        </div>

        {/* To-Do widget */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.07em', color: 'var(--accent)', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>My To-Do</span>
            <Link
              to="/todos"
              style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {todos.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>
              Nothing on the list — enjoy it while it lasts
            </div>
          ) : (
            <>
              {todos.slice(0, 8).map(t => {
                const due = t.due_date ? new Date(t.due_date + 'T00:00:00') : null
                const overdue = due && due < new Date() && t.status !== 'done'
                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '7px 0', borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 6, height: 6, borderRadius: '50%',
                      background: PRIORITY_COLOR[t.priority ?? 'normal'], marginTop: 5,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </div>
                      {t.site_id && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {siteMap[t.site_id] || ''}
                        </div>
                      )}
                    </div>
                    {overdue ? (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                        Overdue
                      </span>
                    ) : due ? (
                      <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </div>
                )
              })}
              {todos.length > 8 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 6, textAlign: 'center' }}>
                  + {todos.length - 8} more
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Site cards */}
      {sites.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>
          No sites yet. <Link to="/sites/new" style={{ color: 'var(--accent)' }}>Add a site</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {sites.map(site => {
            const hasOpenTicket = serviceTickets.some(
              t => t.site_id === site.id && (t.status === 'open' || t.status === 'in_progress')
            )

            const statusCfg = SITE_STATUS_CONFIG[site.site_status || 'normal'] || SITE_STATUS_CONFIG.normal

            const phase = site.lifecycle_phase || 'production_shipping'
            const today = new Date(); today.setHours(0, 0, 0, 0)
            let warrantyLabel = ''
            let warrantyColor = ''
            if (phase === 'warranty' || phase === 'extended_warranty') {
              const endDateStr = site.extended_warranty_end || site.warranty_end_date
              const endDate = endDateStr ? new Date(endDateStr) : null
              const days = endDate ? Math.round((endDate.getTime() - today.getTime()) / 86400000) : null
              const prefix = phase === 'extended_warranty' ? 'Ext. ' : ''
              warrantyLabel = days != null
                ? `${prefix}Warranty · ${days >= 0 ? days + 'd left' : 'expired'}`
                : `${prefix}Warranty`
              warrantyColor = (days != null && days < 0) ? '#dc2626' : '#16a34a'
            } else if (phase === 'out_of_warranty') {
              warrantyLabel = 'Out of Warranty'
              warrantyColor = '#dc2626'
            } else if (PHASE_BADGE[phase]) {
              warrantyLabel = PHASE_BADGE[phase].label
              warrantyColor = PHASE_BADGE[phase].color
            }

            const lastContact = site.last_contact_date
              ? new Date(site.last_contact_date + 'T00:00:00').toLocaleDateString()
              : null

            return (
              <div
                key={site.id}
                onClick={() => navigate(`/sites/${site.id}`)}
                className="card"
                style={{
                  cursor: 'pointer', padding: 0, overflow: 'hidden',
                  borderLeft: `4px solid ${statusCfg.color}`,
                }}
              >
                {/* Status header */}
                <div style={{
                  background: `${statusCfg.color}1a`,
                  borderBottom: `2px solid ${statusCfg.color}55`,
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: statusCfg.color, flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {site.techs_on_site && (
                      <span style={{
                        background: '#2563eb1a', color: '#2563eb',
                        border: '1px solid #2563eb55', borderRadius: 99,
                        padding: '1px 7px', fontSize: 11, fontWeight: 600,
                      }}>🔧 On Site</span>
                    )}
                    {site.logo_url && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fff', borderRadius: 6, padding: '3px 6px', height: 30,
                      }}>
                        <img
                          src={site.logo_url}
                          style={{ height: 22, maxWidth: 72, objectFit: 'contain' }}
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                          alt=""
                        />
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {site.name || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {warrantyLabel && (
                      <span style={{
                        background: `${warrantyColor}1a`, color: warrantyColor,
                        border: `1px solid ${warrantyColor}55`,
                        borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        {warrantyLabel}
                      </span>
                    )}
                    {hasOpenTicket && (
                      <span style={{
                        background: 'var(--red)22', color: 'var(--red)',
                        border: '1px solid var(--red)44',
                        borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        🎫 Open Ticket
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {lastContact ? `📞 ${lastContact}` : 'No contact logged'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
