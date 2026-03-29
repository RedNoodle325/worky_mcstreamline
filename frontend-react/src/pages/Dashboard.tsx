import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API } from '../api'
import { useToastFn } from '../App'
import type { Site, Issue, ServiceTicket, Todo } from '../types'


const STATUS_COLOR: Record<string, string> = {
  open:        '#dc2626',
  in_progress: '#d97706',
}

const STATUS_LABEL: Record<string, string> = {
  open:        'Open',
  in_progress: 'In Progress',
}

// ── Scoreboard digit ──────────────────────────────────────────────────────────
function ScoreDigit({ value, label, color, onClick }: {
  value: number; label: string; color: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        padding: '8px 20px',
        borderLeft: '1px solid #ffffff18',
      }}
    >
      <div style={{
        fontFamily: "'Bebas Neue', 'Righteous', monospace",
        fontSize: 42, lineHeight: 1, fontWeight: 900,
        color,
        textShadow: `0 0 20px ${color}88, 0 0 40px ${color}44`,
        letterSpacing: 2,
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: 2,
        color: '#ffffff55', textTransform: 'uppercase', marginTop: 2,
      }}>
        {label}
      </div>
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
  const emergencyCount = sites.filter(s => {
    const si = issues.filter(i => i.site_id === s.id && (i.status === 'open' || i.status === 'in_progress'))
    return si.some(i => i.priority === 'critical')
  }).length

  // Per-site issue counts, sorted: emergency → problem → operational
  const siteIssueStats = sites.map(s => {
    const si = issues.filter(i => i.site_id === s.id && (i.status === 'open' || i.status === 'in_progress'))
    const critical = si.filter(i => i.priority === 'critical').length
    const high = si.filter(i => i.priority === 'high').length
    const total = si.length
    const status = critical > 0 ? 'emergency' : high > 0 ? 'problem' : 'operational'
    return { site: s, total, critical, high, status }
  }).filter(s => s.total > 0)
    .sort((a, b) => {
      const order: Record<string, number> = { emergency: 0, problem: 1, operational: 2 }
      return order[a.status] - order[b.status] || b.critical - a.critical || b.total - a.total
    })

  return (
    <div>
      {/* ── 90s Scoreboard Header ── */}
      <div style={{
        background: 'linear-gradient(180deg, #0a0010 0%, #120020 100%)',
        border: '2px solid #FF2D88',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
        boxShadow: '0 0 30px #FF2D8840, inset 0 0 40px #00000080',
      }}>
        {/* Top stripe */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #FF2D88, #FFE81A, #00D4FF, #9B30FF, #FF2D88)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          {/* Branding */}
          <div style={{ padding: '12px 20px 12px 0', borderRight: '1px solid #ffffff18' }}>
            <div style={{
              fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
              fontSize: 11, letterSpacing: 3, color: '#FF2D88', fontWeight: 900,
            }}>
              WORKY
            </div>
            <div style={{
              fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
              fontSize: 22, letterSpacing: 2, color: '#FFE81A', lineHeight: 1, fontWeight: 900,
            }}>
              MCSTREAMLINE
            </div>
            <div style={{ fontSize: 9, color: '#ffffff44', letterSpacing: 2, marginTop: 2 }}>
              FIELD OPS · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </div>
          </div>

          {/* Score digits */}
          <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
            <ScoreDigit value={sites.length} label="Sites" color="#00D4FF" />
            <ScoreDigit
              value={openIssues} label="Issues"
              color={openIssues > 0 ? '#FFE81A' : '#4a4a4a'}
              onClick={() => navigate('/issues')}
            />
            <ScoreDigit
              value={openTickets} label="CS Tickets"
              color={openTickets > 0 ? '#FF7A1A' : '#4a4a4a'}
              onClick={() => navigate('/service-tickets')}
            />
            {emergencyCount > 0 && (
              <ScoreDigit
                value={emergencyCount} label="Emergency"
                color="#FF2D88"
                onClick={() => navigate('/issues')}
              />
            )}
          </div>

          {/* Period / clock decoration */}
          <div style={{
            padding: '12px 0 12px 20px',
            borderLeft: '1px solid #ffffff18',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 28, color: '#FF2D8888', lineHeight: 1,
            }}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 9, color: '#ffffff33', letterSpacing: 2, marginTop: 2 }}>
              LOCAL TIME
            </div>
          </div>
        </div>

        {/* Bottom stripe */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #9B30FF, #00D4FF, #FFE81A, #FF2D88)',
        }} />
      </div>

      {/* ── Two-column: Site Issues Board + To-Do ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Site Issues Scoreboard */}
        <div style={{
          background: 'linear-gradient(180deg, #0a0010 0%, #0e0020 100%)',
          border: '1px solid var(--border)',
          borderTop: '3px solid #FFE81A',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid #ffffff18',
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
              fontSize: 13, letterSpacing: 2, color: '#FFE81A',
            }}>
              SITE ISSUES BOARD
            </span>
            <Link to="/issues" style={{ fontSize: 10, color: 'var(--text3)', textDecoration: 'none', letterSpacing: 1 }}>
              VIEW ALL →
            </Link>
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px',
            padding: '4px 14px', borderBottom: '1px solid #ffffff10',
          }}>
            {['SITE', 'TTL', 'CRIT', 'HIGH'].map(h => (
              <span key={h} style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, color: '#ffffff33', textAlign: h !== 'SITE' ? 'center' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {siteIssueStats.length === 0 ? (
            <div style={{ padding: '20px 14px', fontSize: 12, color: '#ffffff33', textAlign: 'center' }}>
              ✓ ALL CLEAR — NO OPEN ISSUES
            </div>
          ) : siteIssueStats.map(({ site, total, critical, high, status }) => {
            const statusColor = status === 'emergency' ? '#FF2D88' : status === 'problem' ? '#FF7A1A' : '#00E676'
            return (
              <div
                key={site.id}
                onClick={() => navigate(`/sites/${site.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderBottom: '1px solid #ffffff08',
                  cursor: 'pointer',
                  background: status === 'emergency' ? '#FF2D8810' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {site.name}
                  </span>
                </div>
                <div style={{ textAlign: 'center', fontFamily: "'Bebas Neue', monospace", fontSize: 16, color: '#FFE81A', fontWeight: 900 }}>
                  {total}
                </div>
                <div style={{ textAlign: 'center', fontFamily: "'Bebas Neue', monospace", fontSize: 16, color: critical > 0 ? '#FF2D88' : '#ffffff22', fontWeight: 900 }}>
                  {critical || '—'}
                </div>
                <div style={{ textAlign: 'center', fontFamily: "'Bebas Neue', monospace", fontSize: 16, color: high > 0 ? '#FF7A1A' : '#ffffff22', fontWeight: 900 }}>
                  {high || '—'}
                </div>
              </div>
            )
          })}

          {/* Sites with no issues — compact footer */}
          {(() => {
            const clean = sites.filter(s => !siteIssueStats.find(x => x.site.id === s.id))
            if (!clean.length) return null
            return (
              <div style={{ padding: '6px 14px', borderTop: '1px solid #ffffff08', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {clean.map(s => (
                  <span
                    key={s.id}
                    onClick={() => navigate(`/sites/${s.id}`)}
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      color: '#00E67688', cursor: 'pointer',
                      background: '#00E67610', borderRadius: 3,
                      padding: '1px 5px', border: '1px solid #00E67630',
                    }}
                  >
                    ✓ {s.name}
                  </span>
                ))}
              </div>
            )
          })()}
        </div>

        {/* To-Do widget */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.07em', color: 'var(--accent)', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: "'Bebas Neue', 'Righteous', sans-serif", letterSpacing: 2 }}>
              My To-Do
            </span>
            <Link to="/todos" style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', textDecoration: 'none' }}>
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
                const priColor: Record<string, string> = { urgent: '#dc2626', high: '#ea580c', normal: '#2563eb', low: '#6b7280' }
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: priColor[t.priority ?? 'normal'], marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      {t.site_id && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{siteMap[t.site_id] || ''}</div>}
                    </div>
                    {overdue ? (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>Overdue</span>
                    ) : due ? (
                      <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </div>
                )
              })}
              {todos.length > 8 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 6, textAlign: 'center' }}>+ {todos.length - 8} more</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Site Cards ── */}
      {sites.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {sites.map(site => {
            const siteIssues = issues.filter(
              i => i.site_id === site.id && (i.status === 'open' || i.status === 'in_progress')
            )
            const hasCritical = siteIssues.some(i => i.priority === 'critical')
            const hasHigh = siteIssues.some(i => i.priority === 'high')
            const siteStatus = hasCritical
              ? { label: 'EMERGENCY', color: '#FF2D88' }
              : hasHigh
              ? { label: 'PROBLEM', color: '#FF7A1A' }
              : { label: 'OPERATIONAL', color: '#00E676' }
            const accentColor = siteStatus.color

            return (
              <div
                key={site.id}
                onClick={() => navigate(`/sites/${site.id}`)}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  minHeight: 78,
                }}
              >
                <div style={{ padding: '7px 10px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 7, fontWeight: 800, letterSpacing: .8, color: accentColor,
                      fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                    }}>
                      {siteStatus.label}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue', 'Righteous', sans-serif",
                    fontSize: 14, fontWeight: 900, letterSpacing: .5, color: 'var(--text1)', lineHeight: 1.15,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {site.name}
                  </div>
                  {siteIssues.length > 0 && (
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontFamily: "'Bebas Neue', monospace", fontSize: 18, fontWeight: 900,
                        color: accentColor, lineHeight: 1,
                        textShadow: `0 0 8px ${accentColor}66`,
                      }}>
                        {siteIssues.length}
                      </span>
                      <span style={{ fontSize: 9, color: accentColor + '99', letterSpacing: 1 }}>
                        OPEN
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden — kept for StatusBadge/Link import usage */}
      <span style={{ display: 'none' }}>
        {Object.keys(STATUS_COLOR).map(k => STATUS_LABEL[k])}
      </span>
    </div>
  )
}
