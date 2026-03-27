import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API } from '../api'
import type { Site, MsowDraft } from '../types'
import { useToastFn } from '../App'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Personnel { name: string; role: string; email: string; tel: string }
interface Step { step: string; description: string; initials: string }
interface HazmatRow { name: string; use: string; msds: string }
interface PermitRow { name: string; task: string }
interface AcceptRow { name: string; signature: string; date: string }
interface HazardRow { hazard: string; persons: string; controls: string; l: string; s: string; r: string; further: string; res_l: string; res_s: string; res_rr: string }

interface MsowForm {
  date: string; equipment_tag: string; cmms_wo: string
  contractor_name: string; author_name: string
  poc_phone: string; poc_email: string; project_name: string
  site_address: string; task_description: string
  site_supervisor: string; supervisor_tel: string; supervisor_email: string
  safety_officer: string; safety_tel: string; safety_email: string
  location_of_work: string; documentation_references: string
  start_datetime: string; finish_datetime: string; duration: string
  personnel: Personnel[]
  calibrated_tools: string; tools_and_materials: string; temporary_supports: string
  loto_required: 'yes' | 'no'; loto_equipment: string; staff_training: string
  steps: Step[]
  general_comments: string
  access_egress: string; fall_protection: string; ppe: string
  hazmat: HazmatRow[]; storage: string
  permits: PermitRow[]
  soc_number: string; foc_number: string
  first_aider: string; first_aid_location: string
  hospital_location: string; welfare: string
  services_others: string; other_comments: string
  briefing_by: string; briefing_position: string; briefing_date: string
  acceptance: AcceptRow[]
  ra_date: string; ra_assessed_by: string; ra_checked_by: string
  ra_location: string; ra_task: string; ra_equipment: string
  hazards: HazardRow[]
}

const EMPTY_FORM: MsowForm = {
  date: '', equipment_tag: '', cmms_wo: '',
  contractor_name: '', author_name: '',
  poc_phone: '', poc_email: '', project_name: '',
  site_address: '', task_description: '',
  site_supervisor: '', supervisor_tel: '', supervisor_email: '',
  safety_officer: '', safety_tel: '', safety_email: '',
  location_of_work: '', documentation_references: '',
  start_datetime: '', finish_datetime: '', duration: '',
  personnel: [],
  calibrated_tools: '', tools_and_materials: '', temporary_supports: '',
  loto_required: 'no', loto_equipment: '', staff_training: '',
  steps: [],
  general_comments: '',
  access_egress: '', fall_protection: '', ppe: '',
  hazmat: [], storage: '',
  permits: [],
  soc_number: '', foc_number: '',
  first_aider: '', first_aid_location: '',
  hospital_location: '', welfare: '',
  services_others: '', other_comments: '',
  briefing_by: '', briefing_position: '', briefing_date: '',
  acceptance: [],
  ra_date: '', ra_assessed_by: '', ra_checked_by: '',
  ra_location: '', ra_task: '', ra_equipment: '',
  hazards: [],
}

// ── Shared style constants ─────────────────────────────────────────────────────

const IS: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }
function TA(rows: number): React.CSSProperties { return { ...IS, resize: 'vertical', minHeight: rows * 22 + 16 } }

// ── Form field label wrapper ───────────────────────────────────────────────────

function FG({ label, required, children, style }: { label: string; required?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="form-group" style={{ marginBottom: 14, ...style }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ── Collapsible section card ───────────────────────────────────────────────────

function ColCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', paddingBottom: open ? 12 : 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
          <div className="card-title" style={{ margin: 0 }}>{title}</div>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

// ── Table helper ──────────────────────────────────────────────────────────────

function THead({ cols }: { cols: Array<{ label: string; width?: number }> }) {
  return (
    <thead>
      <tr style={{ background: 'var(--bg3)' }}>
        {cols.map(c => (
          <th key={c.label} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', width: c.width }}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function MSOW() {
  const toast = useToastFn()
  const [searchParams] = useSearchParams()

  const [sites, setSites] = useState<Site[]>([])
  const [drafts, setDrafts] = useState<MsowDraft[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') ?? '')
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [draftName, setDraftName] = useState('Untitled MSOW')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<MsowForm>({ ...EMPTY_FORM })

  useEffect(() => {
    API.sites.list().then(setSites).catch(() => {})
    API.msow.list().then(setDrafts).catch(() => {})
    const siteId = searchParams.get('siteId')
    if (siteId) {
      API.sites.get(siteId).then(site => {
        const addr = [site.address, site.city, site.state, site.zip].filter(Boolean).join(', ')
        setForm(f => ({ ...f, project_name: site.name || site.project_name || '', site_address: addr }))
      }).catch(() => {})
    }
  }, [])

  function set<K extends keyof MsowForm>(key: K, val: MsowForm[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function loadDraft(id: string) {
    if (!id) return
    try {
      const draft = await API.msow.get(id)
      setDraftName(draft.name)
      setSelectedSiteId(draft.site_id ?? '')
      setForm({ ...EMPTY_FORM, ...(draft.form_data as Partial<MsowForm>) })
      toast('Draft loaded')
    } catch (err: unknown) { toast('Error: ' + (err as Error).message, 'error') }
  }

  async function saveDraft() {
    setSaving(true)
    try {
      const payload = { name: draftName, site_id: selectedSiteId || undefined, form_data: form as unknown as Record<string, unknown> }
      if (selectedDraftId) {
        const updated = await API.msow.update(selectedDraftId, payload)
        setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d))
        toast('Draft saved')
      } else {
        const created = await API.msow.create(payload)
        setDrafts(prev => [created, ...prev])
        setSelectedDraftId(created.id)
        toast('Draft created')
      }
    } catch (err: unknown) { toast('Error: ' + (err as Error).message, 'error') }
    finally { setSaving(false) }
  }

  async function deleteDraft() {
    if (!selectedDraftId || !confirm('Delete this draft?')) return
    try {
      await API.msow.delete(selectedDraftId)
      setDrafts(prev => prev.filter(d => d.id !== selectedDraftId))
      setSelectedDraftId('')
      setDraftName('Untitled MSOW')
      setForm({ ...EMPTY_FORM })
      toast('Draft deleted')
    } catch (err: unknown) { toast('Error: ' + (err as Error).message, 'error') }
  }

  // ── Dynamic row tables ───────────────────────────────────────────────────────

  function PersonnelTable() {
    const rows = form.personnel
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Personnel</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <THead cols={[{ label: 'Name' }, { label: 'Role / Trade' }, { label: 'Email' }, { label: 'Tel' }, { label: '', width: 36 }]} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {(['name', 'role', 'email', 'tel'] as const).map(k => (
                  <td key={k} style={{ padding: '3px 3px' }}>
                    <input value={r[k]} onChange={e => set('personnel', rows.map((row, idx) => idx === i ? { ...row, [k]: e.target.value } : row))} style={IS} />
                  </td>
                ))}
                <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('personnel', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-secondary" onClick={() => set('personnel', [...rows, { name: '', role: '', email: '', tel: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Person</button>
      </div>
    )
  }

  function StepsTable() {
    const rows = form.steps
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Steps</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <THead cols={[{ label: 'Step #', width: 80 }, { label: 'Description' }, { label: 'Initials', width: 80 }, { label: '', width: 36 }]} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: '3px 3px' }}><input value={r.step} onChange={e => set('steps', rows.map((row, idx) => idx === i ? { ...row, step: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><input value={r.description} onChange={e => set('steps', rows.map((row, idx) => idx === i ? { ...row, description: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><input value={r.initials} onChange={e => set('steps', rows.map((row, idx) => idx === i ? { ...row, initials: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('steps', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-secondary" onClick={() => set('steps', [...rows, { step: String(rows.length + 1), description: '', initials: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Step</button>
      </div>
    )
  }

  function HazmatTable() {
    const rows = form.hazmat
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Hazardous Substances</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <THead cols={[{ label: 'Name' }, { label: 'Use' }, { label: 'MSDS/SDS Provided', width: 140 }, { label: '', width: 36 }]} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {(['name', 'use', 'msds'] as const).map(k => (
                  <td key={k} style={{ padding: '3px 3px' }}><input value={r[k]} onChange={e => set('hazmat', rows.map((row, idx) => idx === i ? { ...row, [k]: e.target.value } : row))} style={IS} /></td>
                ))}
                <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('hazmat', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-secondary" onClick={() => set('hazmat', [...rows, { name: '', use: '', msds: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Substance</button>
      </div>
    )
  }

  function PermitsTable() {
    const rows = form.permits
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Permits to Work</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <THead cols={[{ label: 'Name of Permit' }, { label: 'Description of Task' }, { label: '', width: 36 }]} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {(['name', 'task'] as const).map(k => (
                  <td key={k} style={{ padding: '3px 3px' }}><input value={r[k]} onChange={e => set('permits', rows.map((row, idx) => idx === i ? { ...row, [k]: e.target.value } : row))} style={IS} /></td>
                ))}
                <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('permits', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-secondary" onClick={() => set('permits', [...rows, { name: '', task: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Permit</button>
      </div>
    )
  }

  function AcceptanceTable() {
    const rows = form.acceptance
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Acceptance List</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <THead cols={[{ label: 'Name (Print)' }, { label: 'Signature' }, { label: 'Date', width: 130 }, { label: '', width: 36 }]} />
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: '3px 3px' }}><input value={r.name} onChange={e => set('acceptance', rows.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><input value={r.signature} onChange={e => set('acceptance', rows.map((row, idx) => idx === i ? { ...row, signature: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><input type="date" value={r.date} onChange={e => set('acceptance', rows.map((row, idx) => idx === i ? { ...row, date: e.target.value } : row))} style={IS} /></td>
                <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('acceptance', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-secondary" onClick={() => set('acceptance', [...rows, { name: '', signature: '', date: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Person</button>
      </div>
    )
  }

  function HazardsTable() {
    const rows = form.hazards
    const cols: (keyof HazardRow)[] = ['hazard', 'persons', 'controls', 'l', 's', 'r', 'further', 'res_l', 'res_s', 'res_rr']
    const labels = ['Hazard', 'Persons at Risk', 'Existing Controls', 'L', 'S', 'R', 'Further Controls', 'Res. L', 'Res. S', 'Res. RR']
    const small = new Set(['l', 's', 'r', 'res_l', 'res_s', 'res_rr'])
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>Hazard Assessment</label>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <THead cols={labels.map((l, li) => ({ label: l, width: small.has(cols[li]) ? 48 : undefined }))} />
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map(k => (
                    <td key={k} style={{ padding: '3px 3px' }}>
                      <input value={r[k]} onChange={e => set('hazards', rows.map((row, idx) => idx === i ? { ...row, [k]: e.target.value } : row))} style={{ ...IS, textAlign: small.has(k) ? 'center' : 'left', padding: '4px 6px' }} />
                    </td>
                  ))}
                  <td style={{ padding: '3px 3px' }}><button type="button" className="btn btn-sm btn-secondary" onClick={() => set('hazards', rows.filter((_, idx) => idx !== i))} style={{ padding: '3px 7px' }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => set('hazards', [...rows, { hazard: '', persons: '', controls: '', l: '', s: '', r: '', further: '', res_l: '', res_s: '', res_rr: '' }])} style={{ marginTop: 8, fontSize: 12 }}>+ Add Hazard</button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>MSOW</h1>
          <div className="page-subtitle">Method Statement of Work</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedDraftId && <button className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={deleteDraft}>Delete Draft</button>}
          <button className="btn btn-primary" onClick={saveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
        </div>
      </div>

      {/* Draft picker bar */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <label>Draft Name</label>
            <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Untitled MSOW" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <label>Site</label>
            <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
              <option value="">— No site —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <label>Load Existing Draft</label>
            <select value={selectedDraftId} onChange={e => { setSelectedDraftId(e.target.value); loadDraft(e.target.value) }}>
              <option value="">— New draft —</option>
              {drafts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 1 — Cover */}
      <ColCard title="1. Cover" defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FG label="Date" required><input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={IS} /></FG>
          <FG label="Equipment Tag"><input value={form.equipment_tag} onChange={e => set('equipment_tag', e.target.value)} style={IS} /></FG>
          <FG label="CMMS WO #"><input value={form.cmms_wo} onChange={e => set('cmms_wo', e.target.value)} style={IS} /></FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Contractor's Name"><input value={form.contractor_name} onChange={e => set('contractor_name', e.target.value)} style={IS} /></FG>
          <FG label="Author's Name"><input value={form.author_name} onChange={e => set('author_name', e.target.value)} style={IS} /></FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FG label="POC Phone"><input type="tel" value={form.poc_phone} onChange={e => set('poc_phone', e.target.value)} style={IS} /></FG>
          <FG label="POC Email"><input type="email" value={form.poc_email} onChange={e => set('poc_email', e.target.value)} style={IS} /></FG>
          <FG label="Project Name" required><input value={form.project_name} onChange={e => set('project_name', e.target.value)} style={IS} /></FG>
        </div>
        <FG label="Site Address"><input value={form.site_address} onChange={e => set('site_address', e.target.value)} style={IS} /></FG>
        <FG label="Description of Task / Activity"><textarea rows={3} value={form.task_description} onChange={e => set('task_description', e.target.value)} style={TA(3)} /></FG>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Site Supervisor"><input value={form.site_supervisor} onChange={e => set('site_supervisor', e.target.value)} style={IS} /></FG>
          <span />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Supervisor Tel"><input type="tel" value={form.supervisor_tel} onChange={e => set('supervisor_tel', e.target.value)} style={IS} /></FG>
          <FG label="Supervisor Email"><input type="email" value={form.supervisor_email} onChange={e => set('supervisor_email', e.target.value)} style={IS} /></FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Safety Officer"><input value={form.safety_officer} onChange={e => set('safety_officer', e.target.value)} style={IS} /></FG>
          <span />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Safety Officer Tel"><input type="tel" value={form.safety_tel} onChange={e => set('safety_tel', e.target.value)} style={IS} /></FG>
          <FG label="Safety Officer Email"><input type="email" value={form.safety_email} onChange={e => set('safety_email', e.target.value)} style={IS} /></FG>
        </div>
        <FG label="Specific Location of Work on Site"><textarea rows={2} value={form.location_of_work} onChange={e => set('location_of_work', e.target.value)} style={TA(2)} /></FG>
        <FG label="Supporting Documentation References"><textarea rows={2} value={form.documentation_references} onChange={e => set('documentation_references', e.target.value)} style={TA(2)} /></FG>
      </ColCard>

      {/* Section 2 — Task Information */}
      <ColCard title="2. Task Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FG label="Estimated Start"><input type="datetime-local" value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} style={IS} /></FG>
          <FG label="Estimated Finish"><input type="datetime-local" value={form.finish_datetime} onChange={e => set('finish_datetime', e.target.value)} style={IS} /></FG>
          <FG label="Estimated Duration"><input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="e.g. 8 hours" style={IS} /></FG>
        </div>
        <PersonnelTable />
        <FG label="Calibrated Tools (If applicable)"><textarea rows={2} value={form.calibrated_tools} onChange={e => set('calibrated_tools', e.target.value)} style={TA(2)} /></FG>
        <FG label="Required Equipment, Tools & Materials"><textarea rows={3} value={form.tools_and_materials} onChange={e => set('tools_and_materials', e.target.value)} style={TA(3)} /></FG>
        <FG label="Temporary Supports and Props"><textarea rows={2} value={form.temporary_supports} onChange={e => set('temporary_supports', e.target.value)} style={TA(2)} /></FG>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 4 }}>LOTO Required?</label>
          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            {(['yes', 'no'] as const).map(v => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="loto_required" value={v} checked={form.loto_required === v} onChange={() => set('loto_required', v)} style={{ accentColor: 'var(--accent)' }} />
                {v === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
        </div>
        {form.loto_required === 'yes' && (
          <FG label="Equipment / Systems Requiring LOTO"><textarea rows={2} value={form.loto_equipment} onChange={e => set('loto_equipment', e.target.value)} style={TA(2)} /></FG>
        )}
        <FG label="Specific Staff Training"><textarea rows={2} value={form.staff_training} onChange={e => set('staff_training', e.target.value)} style={TA(2)} /></FG>
      </ColCard>

      {/* Section 3 — Sequence of Operations */}
      <ColCard title="3. Sequence of Operations">
        <StepsTable />
        <FG label="General Comments / Notes"><textarea rows={3} value={form.general_comments} onChange={e => set('general_comments', e.target.value)} style={TA(3)} /></FG>
      </ColCard>

      {/* Section 4 — Safety & Controls */}
      <ColCard title="4. Safety & Controls">
        <FG label="Method of Access and Egress"><textarea rows={2} value={form.access_egress} onChange={e => set('access_egress', e.target.value)} style={TA(2)} /></FG>
        <FG label="Fall Protection Measures"><textarea rows={2} value={form.fall_protection} onChange={e => set('fall_protection', e.target.value)} style={TA(2)} /></FG>
        <FG label="Required PPE"><textarea rows={2} value={form.ppe} onChange={e => set('ppe', e.target.value)} style={TA(2)} /></FG>
        <HazmatTable />
        <FG label="Storage Arrangements"><textarea rows={2} value={form.storage} onChange={e => set('storage', e.target.value)} style={TA(2)} /></FG>
        <PermitsTable />
      </ColCard>

      {/* Section 5 — Emergency Procedures */}
      <ColCard title="5. Emergency Procedures">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Security Operations Center #"><input type="tel" value={form.soc_number} onChange={e => set('soc_number', e.target.value)} style={IS} /></FG>
          <FG label="Facility Operations Center #"><input type="tel" value={form.foc_number} onChange={e => set('foc_number', e.target.value)} style={IS} /></FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="On-Site First Aider Name"><input value={form.first_aider} onChange={e => set('first_aider', e.target.value)} style={IS} /></FG>
          <FG label="First Aid Box Location"><input value={form.first_aid_location} onChange={e => set('first_aid_location', e.target.value)} style={IS} /></FG>
        </div>
        <FG label="Nearest Hospital Location"><input value={form.hospital_location} onChange={e => set('hospital_location', e.target.value)} style={IS} /></FG>
        <FG label="Welfare Requirements"><textarea rows={2} value={form.welfare} onChange={e => set('welfare', e.target.value)} style={TA(2)} /></FG>
        <FG label="Services to be Supplied by Others"><textarea rows={2} value={form.services_others} onChange={e => set('services_others', e.target.value)} style={TA(2)} /></FG>
        <FG label="Other Information and Comments"><textarea rows={2} value={form.other_comments} onChange={e => set('other_comments', e.target.value)} style={TA(2)} /></FG>
      </ColCard>

      {/* Section 6 — Daily Briefing Record */}
      <ColCard title="6. Daily Briefing Record">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FG label="Briefing Delivered By"><input value={form.briefing_by} onChange={e => set('briefing_by', e.target.value)} style={IS} /></FG>
          <FG label="Position"><input value={form.briefing_position} onChange={e => set('briefing_position', e.target.value)} style={IS} /></FG>
          <FG label="Briefing Date"><input type="date" value={form.briefing_date} onChange={e => set('briefing_date', e.target.value)} style={IS} /></FG>
        </div>
        <AcceptanceTable />
      </ColCard>

      {/* Section 7 — Risk Assessment */}
      <ColCard title="7. Risk Assessment">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FG label="RA Date"><input type="date" value={form.ra_date} onChange={e => set('ra_date', e.target.value)} style={IS} /></FG>
          <FG label="Assessed By"><input value={form.ra_assessed_by} onChange={e => set('ra_assessed_by', e.target.value)} style={IS} /></FG>
          <FG label="Checked By"><input value={form.ra_checked_by} onChange={e => set('ra_checked_by', e.target.value)} style={IS} /></FG>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FG label="Location"><input value={form.ra_location} onChange={e => set('ra_location', e.target.value)} style={IS} /></FG>
          <span />
        </div>
        <FG label="Task Description"><textarea rows={2} value={form.ra_task} onChange={e => set('ra_task', e.target.value)} style={TA(2)} /></FG>
        <FG label="Equipment / Substances Used"><textarea rows={2} value={form.ra_equipment} onChange={e => set('ra_equipment', e.target.value)} style={TA(2)} /></FG>
        <HazardsTable />
        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '.05em', marginBottom: 6 }}>Risk Rating Reference</label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: 'auto' }}>
              <THead cols={[{ label: 'Rating' }, { label: 'Score (L×S)' }, { label: 'Risk Level' }, { label: 'Action Required' }]} />
              <tbody>
                {[
                  { color: '#22c55e', label: 'Low', score: '1 – 6', level: 'Acceptable', action: 'No further action required' },
                  { color: '#eab308', label: 'Medium', score: '8 – 16', level: 'Moderate', action: 'Further controls required; management review' },
                  { color: '#ef4444', label: 'High', score: '20 – 25', level: 'Unacceptable', action: 'Stop work; immediate corrective action' },
                ].map(row => (
                  <tr key={row.label}>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <span style={{ background: row.color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{row.label}</span>
                    </td>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>{row.score}</td>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--border)' }}>{row.level}</td>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--border)' }}>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>L = Likelihood (1–5) · S = Severity (1–5) · R = Risk Rating (L×S)</div>
        </div>
      </ColCard>

      {/* Bottom save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingBottom: 40 }}>
        {selectedDraftId && <button className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={deleteDraft}>Delete Draft</button>}
        <button className="btn btn-primary" onClick={saveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
      </div>
    </div>
  )
}
