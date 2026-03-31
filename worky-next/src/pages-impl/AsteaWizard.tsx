'use client'

import { useState } from 'react'
import { Check, Copy, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type TicketType = 'warranty' | 'rga' | 'concession' | 'service_order' | 'po_request' | 'invoice'

interface TypeMeta {
  label: string
  description: string
  accent: string
}

// ── Ticket type config ─────────────────────────────────────────────────────────

const TYPES: Record<TicketType, TypeMeta> = {
  warranty:      { label: 'Warranty',        description: 'Warranty repair or startup service',         accent: '#4ade80' },
  rga:           { label: 'RGA',             description: 'Return Goods Authorization for parts',        accent: '#f97316' },
  concession:    { label: 'Sales Concession',description: 'Goodwill credit or cost adjustment',          accent: '#a78bfa' },
  service_order: { label: 'Service Order',   description: 'Scheduled or billable field service',         accent: '#38bdf8' },
  po_request:    { label: 'PO Request',      description: 'Purchase order for parts or subcontract',     accent: '#fbbf24' },
  invoice:       { label: 'Invoice',         description: 'Invoice processing for completed work',        accent: '#2dd4bf' },
}

// ── Field definitions ──────────────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'select' | 'date'

interface Field {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]
  required?: boolean
  hint?: string
  wide?: boolean   // span full width
}

const FIELDS: Record<TicketType, Field[]> = {
  warranty: [
    { key: 'cs_number',    label: 'CS Number',          type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'site',         label: 'Site / Customer',     type: 'text',     placeholder: 'Site or customer name',    required: true },
    { key: 'contact',      label: 'Site Contact',        type: 'text',     placeholder: 'Name' },
    { key: 'phone',        label: 'Contact Phone',       type: 'text',     placeholder: '555-555-5555' },
    { key: 'serial',       label: 'Unit Serial #',       type: 'text',     placeholder: 'Serial number',            required: true },
    { key: 'model',        label: 'Unit Model',          type: 'text',     placeholder: 'Model number' },
    { key: 'fault',        label: 'Reported Fault',      type: 'textarea', placeholder: 'Describe the symptom or failure in detail', required: true, wide: true },
    { key: 'action',       label: 'Action Required',     type: 'select',   options: ['Dispatch tech for diagnosis', 'Dispatch tech for repair', 'Dispatch tech for 90-day startup', 'Dispatch tech for annual startup', 'Ship replacement part + dispatch', 'Remote support first'], required: true },
    { key: 'notes',        label: 'Additional Notes',    type: 'textarea', placeholder: 'Parts suspected, access info, urgency, etc.', wide: true },
  ],
  rga: [
    { key: 'cs_number',    label: 'CS Number',           type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'customer',     label: 'Customer',            type: 'text',     placeholder: 'Customer name',            required: true },
    { key: 'orig_so',      label: 'Original SO #',       type: 'text',     placeholder: 'Original sales order',     required: true },
    { key: 'part_number',  label: 'Part Number',         type: 'text',     placeholder: 'e.g. 123456-01',           required: true },
    { key: 'part_desc',    label: 'Part Description',    type: 'text',     placeholder: 'Description of the part' },
    { key: 'qty',          label: 'Quantity',            type: 'text',     placeholder: '1',                        required: true },
    { key: 'reason',       label: 'Return Reason',       type: 'select',   options: ['Defective / DOA', 'Wrong part shipped', 'Damaged in transit', 'Ordered in error', 'Warranty defect', 'Other'], required: true },
    { key: 'dest',         label: 'Return Destination',  type: 'select',   options: ['SVA – Northbrook, IL', 'STX – Houston, TX'], required: true },
    { key: 'fault',        label: 'Fault / Return Detail', type: 'textarea', placeholder: 'Describe the fault or reason for return in detail', required: true, wide: true },
  ],
  concession: [
    { key: 'cs_number',    label: 'CS Number',           type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'customer',     label: 'Customer / Site',     type: 'text',     placeholder: 'Customer name',            required: true },
    { key: 'issue',        label: 'Customer Issue',      type: 'textarea', placeholder: 'What went wrong — be specific', required: true, wide: true },
    { key: 'root_cause',   label: 'Root Cause',          type: 'select',   options: ['Shipping damage', 'Wrong part shipped', 'Installation error', 'Design issue', 'Tech error on site', 'Delayed response', 'Customer goodwill', 'Other'] },
    { key: 'resolution',   label: 'Resolution Offered',  type: 'textarea', placeholder: 'Credit, free service call, replacement, etc.', required: true, wide: true },
    { key: 'amount',       label: 'Amount ($)',          type: 'text',     placeholder: 'Dollar value if applicable' },
    { key: 'approver',     label: 'Approver',            type: 'text',     placeholder: 'Manager or PM who approved', required: true },
  ],
  service_order: [
    { key: 'cs_number',    label: 'CS Number',           type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'customer',     label: 'Customer / Site',     type: 'text',     placeholder: 'Customer or site name',    required: true },
    { key: 'contact',      label: 'Site Contact',        type: 'text',     placeholder: 'Name' },
    { key: 'phone',        label: 'Contact Phone',       type: 'text',     placeholder: '555-555-5555' },
    { key: 'billing_type', label: 'Billing Type',        type: 'select',   options: ['Warranty', 'Billable – T&M', 'Billable – Fixed Price', 'Sales Concession', 'Internal'], required: true },
    { key: 'customer_po',  label: 'Customer PO #',       type: 'text',     placeholder: 'Required if billable' },
    { key: 'scope',        label: 'Scope of Work',       type: 'textarea', placeholder: 'Describe what needs to be done', required: true, wide: true },
    { key: 'labor_hrs',    label: 'Est. Labor Hours',    type: 'text',     placeholder: 'e.g. 8' },
    { key: 'need_by',      label: 'Need By Date',        type: 'date' },
    { key: 'site_notes',   label: 'Site Access / Notes', type: 'textarea', placeholder: 'Badge requirements, parking, hours of access, etc.', wide: true },
  ],
  po_request: [
    { key: 'cs_number',    label: 'CS Number',           type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'vendor',       label: 'Vendor / Supplier',   type: 'text',     placeholder: 'Vendor name',              required: true },
    { key: 'shipping',     label: 'Shipping Method',     type: 'select',   options: ['Standard Ground', 'NDA – Next Day Air', '2-Day Air', 'Will Call / Pickup'], required: true },
    { key: 'ship_to',      label: 'Ship To',             type: 'select',   options: ['SVA – Northbrook, IL', 'STX – Houston, TX', 'Direct to Site'], required: true },
    { key: 'need_by',      label: 'Need By Date',        type: 'date' },
    { key: 'parts',        label: 'Parts / Line Items',  type: 'textarea', placeholder: 'Part #  |  Description  |  Qty  |  Unit Price\n—  |  —  |  —  |  $—', required: true, wide: true, hint: 'List each line: Part # | Description | Qty | Unit Price' },
    { key: 'justification',label: 'Justification',       type: 'textarea', placeholder: 'Why is this purchase needed?', required: true, wide: true },
    { key: 'approver',     label: 'Approved By',         type: 'text',     placeholder: 'PM or manager who approved', required: true },
  ],
  invoice: [
    { key: 'cs_number',    label: 'CS Number',           type: 'text',     placeholder: 'e.g. CS-00012345',         required: true },
    { key: 'date',         label: 'Date',                type: 'date',                                              required: true },
    { key: 'customer',     label: 'Bill-To Customer',    type: 'text',     placeholder: 'Customer / company name',  required: true },
    { key: 'invoice_num',  label: 'Invoice Number',      type: 'text',     placeholder: 'INV-XXXXX',                required: true },
    { key: 'invoice_date', label: 'Invoice Date',        type: 'date' },
    { key: 'amount',       label: 'Invoice Amount ($)',  type: 'text',     placeholder: '0.00',                     required: true },
    { key: 'customer_po',  label: 'Customer PO #',       type: 'text',     placeholder: 'Customer purchase order number' },
    { key: 'description',  label: 'Invoice Description', type: 'textarea', placeholder: 'Services rendered, parts supplied, labor dates, etc.', required: true, wide: true },
    { key: 'billing_addr', label: 'Billing Address',     type: 'textarea', placeholder: 'Street, City, State ZIP', wide: true },
  ],
}

// ── Pre-flight checklists ─────────────────────────────────────────────────────

const PREFLIGHT: Record<TicketType, string[]> = {
  warranty: [
    'Confirmed unit is within the warranty period',
    'Obtained unit serial number',
    'Fault/symptom documented in detail',
    'Site contact name and phone confirmed',
    'Checked for any prior repair attempts on this issue',
    'Verified site is reachable and access is available',
  ],
  rga: [
    'Original SO number verified',
    'Part number and description confirmed',
    'Quantity to return confirmed',
    'Return reason / cause code identified',
    'Return destination confirmed (SVA or STX)',
    'Customer notified that RGA is being processed',
  ],
  concession: [
    'Customer issue fully documented',
    'Root cause identified (or noted as under investigation)',
    'Resolution type and amount agreed upon',
    'Manager or PM approval obtained',
    'Accounting / finance notified if a credit is involved',
  ],
  service_order: [
    'Scope of work confirmed with customer',
    'Billing type confirmed (warranty, billable, etc.)',
    'Customer PO obtained (if billable)',
    'Technician availability checked',
    'Site access requirements and hours noted',
    'Any parts needed for the visit identified',
  ],
  po_request: [
    'Parts or services clearly identified',
    'Vendor quote obtained (or internal sourcing confirmed)',
    'Part numbers and quantities verified',
    'Shipping method and destination confirmed',
    'PM or manager approval received',
    'Need-by date established and communicated',
  ],
  invoice: [
    'All work is complete and signed off',
    'Service report submitted',
    'Labor hours verified against time sheets',
    'Parts and quantities match what was used',
    'Customer PO number confirmed',
    'Billing address verified',
  ],
}

// ── Note generators ────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function v(vals: Record<string, string>, key: string): string {
  return vals[key]?.trim() || '—'
}

function generateNote(type: TicketType, vals: Record<string, string>): string {
  const date = vals.date ? fmtDate(vals.date) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const line = '─'.repeat(44)

  switch (type) {
    case 'warranty':
      return [
        `WARRANTY SERVICE REQUEST`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Site:     ${v(vals, 'site')}`,
        `Contact:  ${v(vals, 'contact')}  |  ${v(vals, 'phone')}`,
        ``,
        `Unit Serial:  ${v(vals, 'serial')}`,
        `Unit Model:   ${v(vals, 'model')}`,
        ``,
        `REPORTED FAULT:`,
        v(vals, 'fault'),
        ``,
        `ACTION:`,
        v(vals, 'action'),
        vals.notes?.trim() ? `\nNOTES:\n${vals.notes.trim()}` : '',
        ``,
        `Status:  Open – Pending Dispatch`,
      ].filter(l => l !== undefined).join('\n')

    case 'rga':
      return [
        `RGA REQUEST`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Customer:     ${v(vals, 'customer')}`,
        `Original SO#: ${v(vals, 'orig_so')}`,
        ``,
        `RETURN ITEM:`,
        `  Part #:       ${v(vals, 'part_number')}`,
        `  Description:  ${v(vals, 'part_desc')}`,
        `  Qty:          ${v(vals, 'qty')}`,
        `  Return To:    ${v(vals, 'dest')}`,
        ``,
        `Return Reason:  ${v(vals, 'reason')}`,
        ``,
        `DETAIL:`,
        v(vals, 'fault'),
        ``,
        `Action:  Issue return label – coordinate shipment to ${v(vals, 'dest')}.`,
        `Status:  Open – Pending RGA Issuance`,
      ].join('\n')

    case 'concession': {
      const amtLine = vals.amount?.trim() ? `Amount:     $${vals.amount.trim()}` : ''
      return [
        `SALES CONCESSION REQUEST`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Customer:   ${v(vals, 'customer')}`,
        `Root Cause: ${v(vals, 'root_cause')}`,
        ``,
        `ISSUE:`,
        v(vals, 'issue'),
        ``,
        `RESOLUTION:`,
        v(vals, 'resolution'),
        amtLine,
        ``,
        `Approved By:  ${v(vals, 'approver')}`,
        ``,
        `Status:  Pending – Awaiting Customer Acceptance`,
      ].filter(Boolean).join('\n')
    }

    case 'service_order':
      return [
        `SERVICE ORDER REQUEST`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Customer:     ${v(vals, 'customer')}`,
        `Contact:      ${v(vals, 'contact')}  |  ${v(vals, 'phone')}`,
        `Billing Type: ${v(vals, 'billing_type')}`,
        vals.customer_po?.trim() ? `Customer PO:  ${vals.customer_po.trim()}` : '',
        ``,
        `SCOPE OF WORK:`,
        v(vals, 'scope'),
        ``,
        `Est. Labor:  ${v(vals, 'labor_hrs')} hrs`,
        `Need By:     ${vals.need_by ? fmtDate(vals.need_by) : '—'}`,
        vals.site_notes?.trim() ? `\nSITE NOTES:\n${vals.site_notes.trim()}` : '',
        ``,
        `Status:  Open – Awaiting Scheduling`,
      ].filter(Boolean).join('\n')

    case 'po_request':
      return [
        `PURCHASE ORDER REQUEST`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Vendor:    ${v(vals, 'vendor')}`,
        `Shipping:  ${v(vals, 'shipping')}`,
        `Ship To:   ${v(vals, 'ship_to')}`,
        `Need By:   ${vals.need_by ? fmtDate(vals.need_by) : '—'}`,
        ``,
        `PARTS / LINE ITEMS:`,
        v(vals, 'parts'),
        ``,
        `JUSTIFICATION:`,
        v(vals, 'justification'),
        ``,
        `Approved By:  ${v(vals, 'approver')}`,
        ``,
        `Status:  Open – Pending PO Issuance`,
      ].join('\n')

    case 'invoice':
      return [
        `INVOICE PROCESSING`,
        line,
        `CS#:      ${v(vals, 'cs_number')}`,
        `Date:     ${date}`,
        ``,
        `Bill To:      ${v(vals, 'customer')}`,
        `Invoice #:    ${v(vals, 'invoice_num')}`,
        `Invoice Date: ${vals.invoice_date ? fmtDate(vals.invoice_date) : '—'}`,
        `Customer PO:  ${v(vals, 'customer_po')}`,
        ``,
        `Amount:  $${v(vals, 'amount')}`,
        ``,
        `DESCRIPTION:`,
        v(vals, 'description'),
        vals.billing_addr?.trim() ? `\nBilling Address:\n${vals.billing_addr.trim()}` : '',
        ``,
        `Status:  Ready for Invoice Processing`,
      ].filter(Boolean).join('\n')
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AsteaWizard() {
  const [selectedType, setSelectedType] = useState<TicketType | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)

  function selectType(t: TicketType) {
    setSelectedType(t)
    setStep(1)
    setValues({})
    setChecked({})
    setCopied(false)
  }

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function toggleCheck(item: string) {
    setChecked(prev => ({ ...prev, [item]: !prev[item] }))
  }

  const fields = selectedType ? FIELDS[selectedType] : []
  const preflight = selectedType ? PREFLIGHT[selectedType] : []
  const requiredFields = fields.filter(f => f.required)
  const step1Valid = requiredFields.every(f => values[f.key]?.trim())
  const allChecked = preflight.every(item => checked[item])

  function handleCopy() {
    if (!selectedType) return
    const note = generateNote(selectedType, values)
    navigator.clipboard.writeText(note).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function reset() {
    setSelectedType(null)
    setStep(1)
    setValues({})
    setChecked({})
    setCopied(false)
  }

  const accent = selectedType ? TYPES[selectedType].accent : 'var(--accent)'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Astea Ticket Wizard</h1>
          <div className="page-subtitle">Build Astea notes for any ticket type — fill in the fields, check off the list, copy.</div>
        </div>
        {selectedType && (
          <button className="btn btn-secondary" onClick={reset}>
            ← Start Over
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedType ? '220px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: type selector ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(Object.entries(TYPES) as [TicketType, TypeMeta][]).map(([type, meta]) => {
            const active = selectedType === type
            return (
              <button
                key={type}
                onClick={() => selectType(type)}
                style={{
                  background: active ? `${meta.accent}18` : 'var(--bg2)',
                  border: `1px solid ${active ? meta.accent : 'var(--border)'}`,
                  borderLeft: `3px solid ${active ? meta.accent : 'transparent'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: active ? meta.accent : 'var(--text)', marginBottom: 2 }}>
                  {meta.label}
                </div>
                {(!selectedType || active) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                    {meta.description}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Right: wizard steps ─────────────────────────────────────────── */}
        {selectedType ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {([1, 2, 3] as const).map(s => {
                const labels = ['Fill Fields', 'Pre-flight', 'Copy Note']
                const done = step > s
                const active = step === s
                return (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      textAlign: 'center',
                      background: active ? `${accent}20` : done ? 'var(--bg3)' : 'var(--bg2)',
                      color: active ? accent : done ? 'var(--text3)' : 'var(--text3)',
                      borderRight: s < 3 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {done
                      ? <Check size={12} style={{ color: 'var(--green)' }} />
                      : <span style={{ width: 16, height: 16, borderRadius: '50%', background: active ? accent : 'var(--bg3)', color: active ? '#fff' : 'var(--text3)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s}</span>
                    }
                    {labels[s - 1]}
                  </div>
                )
              })}
            </div>

            {/* ── Step 1: Fields ─────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>
                  {TYPES[selectedType].label} — Enter Details
                </div>
                <div className="form-grid">
                  {fields.map(f => (
                    <div key={f.key} className={`form-group${f.wide ? ' full' : ''}`}>
                      <label>
                        {f.label}
                        {f.required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
                      </label>
                      {f.hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{f.hint}</div>}
                      {f.type === 'select' ? (
                        <select value={values[f.key] || ''} onChange={e => setValue(f.key, e.target.value)}>
                          <option value="">— Select —</option>
                          {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={f.placeholder}
                          value={values[f.key] || ''}
                          onChange={e => setValue(f.key, e.target.value)}
                        />
                      ) : (
                        <input
                          type={f.type === 'date' ? 'date' : 'text'}
                          placeholder={f.placeholder}
                          value={values[f.key] || ''}
                          onChange={e => setValue(f.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    className="btn btn-primary"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    style={{ opacity: step1Valid ? 1 : 0.45 }}
                  >
                    Next: Pre-flight <ChevronRight size={14} />
                  </button>
                </div>
                {!step1Valid && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', marginTop: 6 }}>
                    Fill all required fields (*) to continue
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Pre-flight checklist ───────────────────────────────── */}
            {step === 2 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 4 }}>Pre-flight Checklist</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                  Confirm each item before generating the note. All boxes must be checked.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {preflight.map(item => {
                    const done = !!checked[item]
                    return (
                      <label
                        key={item}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}
                        onClick={() => toggleCheck(item)}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                          border: `2px solid ${done ? accent : 'var(--border)'}`,
                          background: done ? accent : 'var(--bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {done && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: 13, color: done ? 'var(--text3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5 }}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!allChecked}
                    onClick={() => setStep(3)}
                    style={{ opacity: allChecked ? 1 : 0.45 }}
                  >
                    Generate Note <ChevronRight size={14} />
                  </button>
                </div>
                {!allChecked && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', marginTop: 6 }}>
                    Check all items to continue
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Generated note ─────────────────────────────────────── */}
            {step === 3 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title" style={{ margin: 0 }}>
                    Astea Note — Ready to Copy
                  </div>
                  <button
                    className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                    onClick={handleCopy}
                    style={{ minWidth: 130 }}
                  >
                    {copied
                      ? <><Check size={14} /> Copied!</>
                      : <><Copy size={14} /> Copy to Clipboard</>
                    }
                  </button>
                </div>
                <pre style={{
                  background: 'var(--bg)',
                  border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--text)',
                  transition: 'border-color 0.3s',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}>
                  {generateNote(selectedType, values)}
                </pre>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>
                    <ChevronLeft size={14} /> Back
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Paste this into the Astea Notes / Comments field
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* No type selected — prompt */
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>←</div>
              <div style={{ fontSize: 14 }}>Select a ticket type to get started</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
