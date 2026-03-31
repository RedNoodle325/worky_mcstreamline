'use client'

import { useState } from 'react'
import { Copy, Check, Plus, X, Printer } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id: number
  partNumber: string
  description: string
  qty: string
  soNumber: string
  causeCode: string
}

let nextId = 1
const newLine = (): LineItem => ({ id: nextId++, partNumber: '', description: '', qty: '1', soNumber: '', causeCode: '' })

const CAUSE_CODES = [
  'DOA – Dead on Arrival',
  'Wrong Part Shipped',
  'Damaged in Transit',
  'Ordered in Error',
  'Warranty Defect',
  'Installation Error',
  'Other',
]

const RETURN_DESTS = [
  'SVA – 2215 Sanders Road, Northbrook, IL 60062',
  'STX – Munters DCT, Selma, TX',
]

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={`btn btn-sm ${copied ? 'btn-success' : 'btn-secondary'}`}
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })}
    >
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RgaForm() {
  const [customerId,    setCustomerId]    = useState('')
  const [customerName,  setCustomerName]  = useState('')
  const [customerAddr,  setCustomerAddr]  = useState('')
  const [date,          setDate]          = useState('')
  const [origSo,        setOrigSo]        = useState('')
  const [returnDest,    setReturnDest]    = useState(RETURN_DESTS[0])
  const [returnMethod,  setReturnMethod]  = useState('UPS Ground – Prepaid Label')
  const [authBy,        setAuthBy]        = useState('')
  const [lines,         setLines]         = useState<LineItem[]>([newLine()])
  const [notes,         setNotes]         = useState('')

  function updateLine(id: number, field: keyof LineItem, value: string) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  function addLine()        { setLines(prev => [...prev, newLine()]) }
  function removeLine(id: number) { setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev) }

  function fmtDate(iso: string) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
  }

  const filledLines = lines.filter(l => l.partNumber.trim())
  const isReady = customerName.trim() && origSo.trim() && filledLines.length > 0

  // ── Generate RGA form text ──────────────────────────────────────────────────

  function generateForm(): string {
    const line = '═'.repeat(60)
    const thin = '─'.repeat(60)
    const dateStr = date ? fmtDate(date) : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

    const itemLines = filledLines.map((l, i) => [
      `  Item ${i + 1}`,
      `  Part Number:   ${l.partNumber.trim() || '—'}`,
      l.description.trim() ? `  Description:  ${l.description.trim()}` : '',
      `  Quantity:      ${l.qty.trim() || '1'}`,
      l.soNumber.trim() ? `  Sales Order:   ${l.soNumber.trim()}` : '',
      `  Cause Code:    ${l.causeCode || '—'}`,
    ].filter(Boolean).join('\n')).join('\n\n')

    return [
      line,
      `  RETURN GOODS AUTHORIZATION (RGA)`,
      line,
      ``,
      `  Date:           ${dateStr}`,
      customerId.trim() ? `  Customer ID:    ${customerId.trim()}` : '',
      `  Customer:       ${customerName.trim() || '—'}`,
      customerAddr.trim() ? `  Address:\n${customerAddr.trim().split('\n').map(l => `    ${l}`).join('\n')}` : '',
      ``,
      thin,
      `  RETURN INFORMATION`,
      thin,
      `  Original SO #:  ${origSo.trim() || '—'}`,
      `  Return To:      ${returnDest}`,
      `  Ship Method:    ${returnMethod}`,
      authBy.trim() ? `  Authorized By:  ${authBy.trim()}` : '',
      ``,
      thin,
      `  ITEMS TO RETURN`,
      thin,
      itemLines,
      notes.trim() ? `\n${thin}\n  NOTES\n${thin}\n  ${notes.trim()}` : '',
      ``,
      line,
      `  Please include a copy of this form with your return shipment.`,
      `  Contact your Munters service representative with any questions.`,
      line,
    ].filter(l => l !== undefined && l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  }

  const formText = isReady ? generateForm() : ''

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>RGA Form</h1>
          <div className="page-subtitle">Return Goods Authorization — fill in details and copy the completed form</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: form inputs ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Customer info */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Customer Info</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Customer Name <span style={{ color: 'var(--red)' }}>*</span></label>
                <input placeholder="Company name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Customer ID</label>
                <input placeholder="Astea customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Original SO # <span style={{ color: 'var(--red)' }}>*</span></label>
                <input placeholder="Original sales order number" value={origSo} onChange={e => setOrigSo(e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Customer Address</label>
                <textarea rows={2} placeholder="Street, City, State ZIP" value={customerAddr} onChange={e => setCustomerAddr(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Return info */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Return Info</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Return Destination</label>
                <select value={returnDest} onChange={e => setReturnDest(e.target.value)}>
                  {RETURN_DESTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Ship Method</label>
                <select value={returnMethod} onChange={e => setReturnMethod(e.target.value)}>
                  <option>UPS Ground – Prepaid Label</option>
                  <option>UPS Ground – Customer Account</option>
                  <option>UPS Red – Next Day Air</option>
                  <option>FedEx Ground – Prepaid Label</option>
                  <option>Customer Arranged</option>
                </select>
              </div>
              <div className="form-group">
                <label>Authorized By</label>
                <input placeholder="Munters contact who approved" value={authBy} onChange={e => setAuthBy(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                Items to Return <span style={{ color: 'var(--red)' }}>*</span>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={addLine}>
                <Plus size={12} /> Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map((l, i) => (
                <div key={l.id} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>Item {i + 1}</span>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', color: 'var(--text3)', background: 'none', border: 'none' }}
                      onClick={() => removeLine(l.id)}
                      disabled={lines.length === 1}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Part Number</label>
                      <input placeholder="e.g. 150-018385-001" value={l.partNumber}
                        onChange={e => updateLine(l.id, 'partNumber', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div className="form-group">
                      <label>Qty</label>
                      <input placeholder="1" value={l.qty}
                        onChange={e => updateLine(l.id, 'qty', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div className="form-group full">
                      <label>Description</label>
                      <input placeholder="Part description" value={l.description}
                        onChange={e => updateLine(l.id, 'description', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div className="form-group">
                      <label>Sales Order #</label>
                      <input placeholder="If different from original" value={l.soNumber}
                        onChange={e => updateLine(l.id, 'soNumber', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div className="form-group">
                      <label>Cause Code</label>
                      <select value={l.causeCode} onChange={e => updateLine(l.id, 'causeCode', e.target.value)}
                        style={{ fontSize: 12 }}>
                        <option value="">— Select —</option>
                        {CAUSE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="form-group">
              <label>Notes / Special Instructions</label>
              <textarea rows={3} placeholder="Any additional instructions, handling notes, etc."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Right: output ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isReady ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14 }}>Fill in Customer, Original SO #, and at least one part to generate the form</div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>RGA Form — Ready</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CopyButton text={formText} />
                  <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
              <pre style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '14px 16px', fontFamily: 'monospace', fontSize: 12,
                lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                color: 'var(--text)', maxHeight: '75vh', overflowY: 'auto',
              }}>
                {formText}
              </pre>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                Copy and paste into an email, or print and include with the return shipment.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
