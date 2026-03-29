import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import type { Site, Issue, ServiceTicket, Todo } from '../types'

// ── 90s NBA Team palettes (same as Sites mobile) ──────────────────────────────
const NBA_TEAMS = [
  { name: 'BULLS',   abbr: 'CHI', primary: '#CE1141', secondary: '#000000', cardBg: '#1e0008' },
  { name: 'LAKERS',  abbr: 'LAL', primary: '#FDB927', secondary: '#552583', cardBg: '#160824' },
  { name: 'MAGIC',   abbr: 'ORL', primary: '#0077C0', secondary: '#C4CED4', cardBg: '#001424' },
  { name: 'SONICS',  abbr: 'SEA', primary: '#00A550', secondary: '#FFC200', cardBg: '#001810' },
  { name: 'KNICKS',  abbr: 'NYK', primary: '#F58426', secondary: '#006BB6', cardBg: '#001624' },
  { name: 'JAZZ',    abbr: 'UTA', primary: '#F9A01B', secondary: '#002B5C', cardBg: '#060e1e' },
  { name: 'SUNS',    abbr: 'PHX', primary: '#E56020', secondary: '#1D1160', cardBg: '#0e0818' },
  { name: 'PACERS',  abbr: 'IND', primary: '#FDBB30', secondary: '#002D62', cardBg: '#000e20' },
  { name: 'ROCKETS', abbr: 'HOU', primary: '#CE1141', secondary: '#C4CED4', cardBg: '#180008' },
  { name: 'KINGS',   abbr: 'SAC', primary: '#9B4DCA', secondary: '#63727A', cardBg: '#10061e' },
  { name: 'PISTONS', abbr: 'DET', primary: '#006BB6', secondary: '#ED174C', cardBg: '#00101e' },
  { name: 'SPURS',   abbr: 'SAS', primary: '#C4CED4', secondary: '#000000', cardBg: '#0a0a0a' },
]

function getTeam(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0
  return NBA_TEAMS[h % NBA_TEAMS.length]
}

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

      {/* Site cards — 90s NBA trading card style */}
      {sites.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>
          No sites yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {sites.map(site => {
            const team = getTeam(site.id)
            const siteIssues = issues.filter(
              i => i.site_id === site.id && (i.status === 'open' || i.status === 'in_progress')
            )
            const hasCritical = siteIssues.some(i => i.priority === 'critical')
            const hasHigh = siteIssues.some(i => i.priority === 'high')

            const siteStatus = hasCritical
              ? { label: 'EMERGENCY', color: '#dc2626' }
              : hasHigh
              ? { label: 'PROBLEM',   color: '#ea580c' }
              : { label: 'OPERATIONAL', color: '#16a34a' }

            return (
              <div
                key={site.id}
                onClick={() => navigate(`/sites/${site.id}`)}
                style={{
                  background: team.cardBg,
                  borderLeft: `3px solid ${team.primary}`,
                  borderTop: `1px solid ${team.primary}33`,
                  borderRight: `1px solid ${team.primary}18`,
                  borderBottom: `1px solid ${team.primary}18`,
                  borderRadius: '0 8px 8px 0',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: 80,
                  transition: 'border-color .15s',
                }}
              >
                {/* Top stripe */}
                <div style={{
                  height: 2,
                  background: `linear-gradient(90deg, ${team.primary}, ${team.secondary === '#000000' ? team.primary + '44' : team.secondary}, transparent)`,
                }} />

                {/* Watermark */}
                <div style={{
                  position: 'absolute', bottom: 2, right: 6,
                  fontSize: 28, fontWeight: 900,
                  fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                  color: team.primary, opacity: 0.07,
                  letterSpacing: 1, pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
                }}>
                  {team.name}
                </div>

                <div style={{ padding: '7px 10px 8px' }}>
                  {/* Team badge + status dot */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: 1.5,
                      color: team.primary,
                      fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                    }}>
                      {team.abbr}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: siteStatus.color, display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: .8,
                        color: siteStatus.color,
                        fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                      }}>
                        {siteStatus.label}
                      </span>
                    </span>
                  </div>

                  {/* Site name */}
                  <div style={{
                    fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                    fontSize: 15, fontWeight: 900, letterSpacing: .5,
                    color: team.primary, lineHeight: 1.15,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {site.name}
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
