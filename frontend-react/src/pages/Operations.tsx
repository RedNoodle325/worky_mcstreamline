import { useState, useEffect, useMemo } from 'react'
import { API } from '../api'
import type { JobSchedule, Technician, Site } from '../types'
import { useToastFn } from '../App'

// ── Config ─────────────────────────────────────────────────────────────────────

const PRI_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'P1',  color: '#ff2d88' },
  2: { label: 'P2',  color: '#ff8c00' },
  3: { label: 'P3',  color: '#2563eb' },
  4: { label: 'P4',  color: '#6b7280' },
  5: { label: 'P5',  color: '#374151' },
}

const JOB_TYPES = [
  'PM Warranty', 'EXT Warranty', 'Startup', 'Startup and Warranty',
  'Billable', 'Special Project', 'Sales Concession', 'Training',
  'Pre-startup', 'Weekend Support',
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:   { label: 'SCHEDULED',    color: '#00cfff' },
  in_progress: { label: 'IN PROGRESS',  color: '#ffdd00' },
  complete:    { label: 'COMPLETE',     color: '#39ff14' },
  cancelled:   { label: 'CANCELLED',   color: '#6b7280' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(dt?: string) {
  if (!dt) return '—'
  return new Date(dt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface JobModalProps {
  job: Partial<JobSchedule> | null
  sites: Site[]
  onClose: () => void
  onSave: (data: Partial<JobSchedule>) => Promise<void>
}
function JobModal({ job, sites, onClose, onSave }: JobModalProps) {
  const [form, setForm] = useState<Partial<JobSchedule>>(job ?? {
    priority: 3, status: 'scheduled', techs_needed: 1,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof JobSchedule, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 24, width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--accent)', letterSpacing: 2 }}>
          {job?.id ? 'EDIT SERVICE REQUEST' : 'NEW SERVICE REQUEST'}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Job Name *
          <input required value={form.job_name ?? ''} onChange={e => set('job_name', e.target.value)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Site
            <select value={form.site_id ?? ''} onChange={e => set('site_id', e.target.value || undefined)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }}>
              <option value="">— any —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Job Type *
            <select required value={form.job_type ?? ''} onChange={e => set('job_type', e.target.value)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }}>
              <option value="">— select —</option>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Priority
            <select value={form.priority ?? 3} onChange={e => set('priority', Number(e.target.value))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }}>
              {Object.entries(PRI_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Techs Needed
            <input type="number" min={1} max={20} value={form.techs_needed ?? 1} onChange={e => set('techs_needed', Number(e.target.value))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Status
            <select value={form.status ?? 'scheduled'} onChange={e => set('status', e.target.value)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            Start Date
            <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value || undefined)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            End Date
            <input type="date" value={form.end_date ?? ''} onChange={e => set('end_date', e.target.value || undefined)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Contract #
          <input value={form.contract_number ?? ''} onChange={e => set('contract_number', e.target.value || undefined)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Scope of Work
          <textarea rows={3} value={form.scope ?? ''} onChange={e => set('scope', e.target.value || undefined)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13, resize: 'vertical' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Notes
          <textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value || undefined)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13, resize: 'vertical' }} />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '7px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: '7px 18px', background: 'var(--accent)', border: 'none', borderRadius: 4, color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface TechModalProps {
  tech: Partial<Technician> | null
  onClose: () => void
  onSave: (data: Partial<Technician>) => Promise<void>
}
function TechModal({ tech, onClose, onSave }: TechModalProps) {
  const [form, setForm] = useState<Partial<Technician>>(tech ?? { is_active: true })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Technician, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 24, width: '100%', maxWidth: 400,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#00cfff', letterSpacing: 2 }}>
          {tech?.id ? 'EDIT TECHNICIAN' : 'ADD TECHNICIAN'}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Name *
          <input required value={form.name ?? ''} onChange={e => set('name', e.target.value)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            City
            <input value={form.location_city ?? ''} onChange={e => set('location_city', e.target.value || undefined)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
            State
            <input maxLength={2} value={form.location_state ?? ''} onChange={e => set('location_state', e.target.value.toUpperCase() || undefined)}
              placeholder="CA"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13 }} />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>
          Notes
          <textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value || undefined)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text1)', fontSize: 13, resize: 'vertical' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} />
          Active
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '7px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: '7px 18px', background: '#00cfff', border: 'none', borderRadius: 4, color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type Tab = 'dispatch' | 'requests' | 'roster'

export function Operations() {
  const toast = useToastFn()
  const [tab, setTab] = useState<Tab>('dispatch')

  // Data
  const [jobs, setJobs] = useState<JobSchedule[]>([])
  const [techs, setTechs] = useState<Technician[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [jobTechs, setJobTechs] = useState<Record<string, Technician[]>>({})
  const [loading, setLoading] = useState(true)

  // Modals
  const [jobModal, setJobModal] = useState<Partial<JobSchedule> | null | false>(false)
  const [techModal, setTechModal] = useState<Partial<Technician> | null | false>(false)
  const [delJob, setDelJob] = useState<string | null>(null)
  const [delTech, setDelTech] = useState<string | null>(null)

  // Dispatch state
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [j, t, s] = await Promise.all([
        API.schedule.listJobs({ status: 'scheduled,in_progress' }),
        API.schedule.listTechs(),
        API.sites.list(),
      ])
      setJobs(j)
      setTechs(t)
      setSites(s)
    } catch (e: unknown) {
      toast(String(e), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllJobs() {
    try {
      const j = await API.schedule.listJobs()
      setJobs(j)
    } catch { /* ignore */ }
  }

  async function loadJobTechs(jobId: string) {
    try {
      const t = await API.schedule.listJobTechs(jobId)
      setJobTechs(prev => ({ ...prev, [jobId]: t }))
    } catch { /* ignore */ }
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (tab === 'requests') loadAllJobs()
  }, [tab])

  useEffect(() => {
    if (selectedJob && !jobTechs[selectedJob]) {
      loadJobTechs(selectedJob)
    }
  }, [selectedJob])

  // Computed
  const openJobs = useMemo(() =>
    jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress')
      .sort((a, b) => a.priority - b.priority),
    [jobs]
  )

  const activeTechs = useMemo(() =>
    techs.filter(t => t.is_active !== false),
    [techs]
  )

  const allJobs = useMemo(() =>
    [...jobs].sort((a, b) => a.priority - b.priority),
    [jobs]
  )

  // ── Site name lookup
  const siteMap = useMemo(() => {
    const m: Record<string, string> = {}
    sites.forEach(s => { m[s.id] = s.name })
    return m
  }, [sites])

  // ── Job handlers
  async function saveJob(data: Partial<JobSchedule>) {
    try {
      if (jobModal && (jobModal as JobSchedule).id) {
        await API.schedule.updateJob((jobModal as JobSchedule).id, data)
        toast('Job updated', 'success')
      } else {
        await API.schedule.createJob(data)
        toast('Job created', 'success')
      }
      setJobModal(false)
      loadAll()
      if (tab === 'requests') loadAllJobs()
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  async function confirmDelJob() {
    if (!delJob) return
    try {
      await API.schedule.deleteJob(delJob)
      toast('Deleted', 'success')
      setDelJob(null)
      loadAll()
      if (tab === 'requests') loadAllJobs()
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  // ── Tech handlers
  async function saveTech(data: Partial<Technician>) {
    try {
      if (techModal && (techModal as Technician).id) {
        await API.schedule.updateTech((techModal as Technician).id, data)
        toast('Technician updated', 'success')
      } else {
        await API.schedule.createTech(data)
        toast('Technician added', 'success')
      }
      setTechModal(false)
      const t = await API.schedule.listTechs()
      setTechs(t)
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  async function confirmDelTech() {
    if (!delTech) return
    try {
      await API.schedule.deleteTech(delTech)
      toast('Removed', 'success')
      setDelTech(null)
      const t = await API.schedule.listTechs()
      setTechs(t)
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  // ── Dispatch handlers
  async function assignTech(techId: string) {
    if (!selectedJob) return
    try {
      await API.schedule.assignTech(selectedJob, techId)
      await loadJobTechs(selectedJob)
      toast('Tech assigned', 'success')
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  async function removeTech(techId: string) {
    if (!selectedJob) return
    try {
      await API.schedule.removeTech(selectedJob, techId)
      await loadJobTechs(selectedJob)
      toast('Tech removed', 'success')
    } catch (e: unknown) {
      toast(String(e), 'error')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedJobData = selectedJob ? openJobs.find(j => j.id === selectedJob) : null
  const assignedTechIds = new Set((jobTechs[selectedJob ?? ''] ?? []).map(t => t.id))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Rainbow stripe */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #ff2d88, #ff8c00, #ffdd00, #39ff14, #00cfff, #7b2fff, #ff2d88)' }} />
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#ff8c00', letterSpacing: 4, lineHeight: 1 }}>
              OPERATIONS CENTER
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 2, marginTop: 2 }}>
              DISPATCH · SERVICE REQUESTS · TECH ROSTER
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '6px 14px', background: 'rgba(0,207,255,.1)', borderRadius: 4, border: '1px solid rgba(0,207,255,.3)' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#00cfff', lineHeight: 1 }}>{openJobs.length}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>OPEN JOBS</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 14px', background: 'rgba(57,255,20,.1)', borderRadius: 4, border: '1px solid rgba(57,255,20,.3)' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#39ff14', lineHeight: 1 }}>{activeTechs.length}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>ACTIVE TECHS</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,.4)' }}>
          {([
            ['dispatch', '📡 DISPATCH BOARD'],
            ['requests', '📋 SERVICE REQUESTS'],
            ['roster',   '👥 TECH ROSTER'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 8px', background: 'none',
              border: 'none', borderBottom: tab === key ? '3px solid #ff8c00' : '3px solid transparent',
              color: tab === key ? '#ff8c00' : 'var(--text3)',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 1.5,
              cursor: 'pointer', transition: 'color .15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading…</div>
      )}

      {/* ── DISPATCH TAB ── */}
      {!loading && tab === 'dispatch' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Open Jobs column */}
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#ff8c00', letterSpacing: 2, marginBottom: 10 }}>
              OPEN JOBS ({openJobs.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {openJobs.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>No open jobs</div>
              )}
              {openJobs.map(job => {
                const isSelected = selectedJob === job.id
                const pri = PRI_CONFIG[job.priority] ?? PRI_CONFIG[3]
                const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG['scheduled']
                const assignedCount = (jobTechs[job.id] ?? []).length
                const needed = job.techs_needed ?? 1
                const covered = assignedCount >= needed

                return (
                  <div key={job.id}
                    onClick={() => setSelectedJob(isSelected ? null : job.id)}
                    style={{
                      background: isSelected ? 'rgba(255,140,0,.08)' : 'var(--bg2)',
                      border: `1px solid ${isSelected ? '#ff8c00' : 'var(--border)'}`,
                      borderLeft: `4px solid ${pri.color}`,
                      borderRadius: 6, padding: '10px 12px', cursor: 'pointer',
                      transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{job.job_name}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${pri.color}22`, color: pri.color, fontWeight: 700 }}>{pri.label}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${st.color}22`, color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                      {job.site_id ? siteMap[job.site_id] ?? '—' : '—'}
                      {job.job_type ? ` · ${job.job_type}` : ''}
                      {job.start_date ? ` · ${fmtDate(job.start_date)}` : ''}
                      {job.end_date ? ` → ${fmtDate(job.end_date)}` : ''}
                    </div>
                    {job.scope && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.scope}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: covered ? '#39ff14' : '#ff2d88', fontWeight: 700 }}>
                        {assignedCount}/{needed} TECHS
                      </span>
                      {(jobTechs[job.id] ?? []).map(t => (
                        <span key={t.id} style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(0,207,255,.15)', color: '#00cfff', borderRadius: 10 }}>
                          {t.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tech Roster column */}
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#00cfff', letterSpacing: 2, marginBottom: 10 }}>
              {selectedJob ? `ASSIGN TO: ${selectedJobData?.job_name ?? ''}` : 'TECH ROSTER'}
            </div>

            {!selectedJob && (
              <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12, fontStyle: 'italic' }}>
                ← Select a job to assign techs
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeTechs.map(tech => {
                const isAssigned = assignedTechIds.has(tech.id)
                return (
                  <div key={tech.id} style={{
                    background: isAssigned ? 'rgba(0,207,255,.08)' : 'var(--bg2)',
                    border: `1px solid ${isAssigned ? '#00cfff55' : 'var(--border)'}`,
                    borderRadius: 6, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isAssigned ? '#00cfff' : 'var(--text1)' }}>
                        {tech.name}
                        {isAssigned && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 5px', background: '#00cfff22', color: '#00cfff', borderRadius: 3 }}>ASSIGNED</span>}
                      </div>
                      {(tech.location_city || tech.location_state) && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          📍 {[tech.location_city, tech.location_state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {tech.notes && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>{tech.notes}</div>
                      )}
                    </div>
                    {selectedJob && (
                      <button
                        onClick={() => isAssigned ? removeTech(tech.id) : assignTech(tech.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: isAssigned ? '#ff2d8822' : '#00cfff22',
                          color: isAssigned ? '#ff2d88' : '#00cfff',
                          fontSize: 11, fontWeight: 700,
                        }}>
                        {isAssigned ? 'Remove' : 'Assign'}
                      </button>
                    )}
                  </div>
                )
              })}
              {activeTechs.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>No active technicians</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICE REQUESTS TAB ── */}
      {!loading && tab === 'requests' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#ff8c00', letterSpacing: 2 }}>
              ALL SERVICE REQUESTS ({allJobs.length})
            </div>
            <button onClick={() => setJobModal(null)} style={{
              padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: 4,
              color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}>
              + New Request
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allJobs.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>No service requests yet</div>
            )}
            {allJobs.map(job => {
              const pri = PRI_CONFIG[job.priority] ?? PRI_CONFIG[3]
              const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG['scheduled']
              return (
                <div key={job.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${pri.color}`, borderRadius: 6, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>{job.job_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {job.site_id ? siteMap[job.site_id] ?? '—' : '—'}
                        {job.job_type ? ` · ${job.job_type}` : ''}
                        {job.contract_number ? ` · Contract: ${job.contract_number}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${pri.color}22`, color: pri.color, fontWeight: 700 }}>{pri.label}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${st.color}22`, color: st.color }}>{st.label}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: job.scope ? 8 : 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <span style={{ color: 'var(--text2)' }}>Start:</span> {fmtDate(job.start_date)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <span style={{ color: 'var(--text2)' }}>End:</span> {fmtDate(job.end_date)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <span style={{ color: 'var(--text2)' }}>Techs:</span>{' '}
                      <span style={{ color: '#00cfff' }}>{job.techs_needed ?? 1} needed</span>
                    </div>
                  </div>

                  {job.scope && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 4, padding: '6px 10px', marginBottom: 8, fontStyle: 'italic' }}>
                      {job.scope}
                    </div>
                  )}
                  {job.notes && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{job.notes}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setJobModal(job)} style={{
                      padding: '4px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 4, color: 'var(--text2)', cursor: 'pointer', fontSize: 11,
                    }}>Edit</button>
                    <button onClick={() => setDelJob(job.id)} style={{
                      padding: '4px 12px', background: '#ff2d8811', border: '1px solid #ff2d8844',
                      borderRadius: 4, color: '#ff2d88', cursor: 'pointer', fontSize: 11,
                    }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ROSTER TAB ── */}
      {!loading && tab === 'roster' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#00cfff', letterSpacing: 2 }}>
              TECHNICIAN ROSTER ({techs.length})
            </div>
            <button onClick={() => setTechModal(null)} style={{
              padding: '7px 16px', background: '#00cfff', border: 'none', borderRadius: 4,
              color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}>
              + Add Tech
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {techs.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>No technicians yet</div>
            )}
            {techs.map(tech => (
              <div key={tech.id} style={{
                background: 'var(--bg2)', border: `1px solid ${tech.is_active === false ? 'var(--border)' : '#00cfff33'}`,
                borderRadius: 6, padding: '12px 14px',
                opacity: tech.is_active === false ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: tech.is_active === false ? 'var(--text3)' : 'var(--text1)' }}>
                      {tech.name}
                    </div>
                    {tech.is_active === false && (
                      <span style={{ fontSize: 9, padding: '1px 5px', background: '#6b728022', color: '#6b7280', borderRadius: 3 }}>INACTIVE</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setTechModal(tech)} style={{
                      padding: '3px 9px', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 3, color: 'var(--text2)', cursor: 'pointer', fontSize: 11,
                    }}>Edit</button>
                    <button onClick={() => setDelTech(tech.id)} style={{
                      padding: '3px 9px', background: '#ff2d8811', border: '1px solid #ff2d8844',
                      borderRadius: 3, color: '#ff2d88', cursor: 'pointer', fontSize: 11,
                    }}>✕</button>
                  </div>
                </div>

                {(tech.location_city || tech.location_state) && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                    📍 {[tech.location_city, tech.location_state].filter(Boolean).join(', ')}
                  </div>
                )}
                {tech.notes && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{tech.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {jobModal !== false && (
        <JobModal
          job={jobModal}
          sites={sites}
          onClose={() => setJobModal(false)}
          onSave={saveJob}
        />
      )}

      {techModal !== false && (
        <TechModal
          tech={techModal}
          onClose={() => setTechModal(false)}
          onSave={saveTech}
        />
      )}

      {/* Delete confirm — job */}
      {delJob && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setDelJob(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
            padding: 24, maxWidth: 340, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, color: 'var(--text1)', marginBottom: 8 }}>Delete this service request?</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDelJob(null)} style={{ padding: '7px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelJob} style={{ padding: '7px 20px', background: '#ff2d88', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm — tech */}
      {delTech && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setDelTech(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
            padding: 24, maxWidth: 340, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, color: 'var(--text1)', marginBottom: 8 }}>Remove this technician?</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDelTech(null)} style={{ padding: '7px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelTech} style={{ padding: '7px 20px', background: '#ff2d88', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
