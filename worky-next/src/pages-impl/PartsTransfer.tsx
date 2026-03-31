'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle, Plus, X } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const VA_TO  = ['hope.hawks@munters.com', 'Betty.Thompson@munters.com']
const VA_CC  = ['Rebecca.Patterson@munters.com', 'Lisa.Slagle@munters.com', 'Sarah.Dudley@Munters.com', 'Carson.Brantley@munters.com']
const VA_NDA_CONTACT = 'Amanda Nicely'

const TX_TO  = ['Katherine.morales@munters.com']
const TX_CC  = ['Elizabeth.olguin@munters.com']
const TX_SHIPPING    = 'Texas.shipping@munters.com'
const TX_NDA_CONTACT = 'Benito Calderon (warehouse supervisor)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return 'XX/XX/XXXX'
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function isAfter2pm(): boolean {
  return new Date().getHours() >= 14
}

// ── Part row type ─────────────────────────────────────────────────────────────

interface PartRow {
  id: number
  partNumber: string
  description: string
  qty: string
}

let nextId = 1

function newRow(): PartRow {
  return { id: nextId++, partNumber: '', description: '', qty: '' }
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }
  return (
    <button
      className={`btn btn-sm ${copied ? 'btn-success' : 'btn-secondary'}`}
      onClick={copy}
      style={{ minWidth: 90 }}
    >
      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> {label}</>}
    </button>
  )
}

// ── Output block ──────────────────────────────────────────────────────────────

function OutputBlock({ title, value, mono = true }: { title: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </div>
        <CopyButton text={value} />
      </div>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '10px 12px', fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', color: 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Dest = 'va' | 'tx'
type Ship = 'standard' | 'nda'

export function PartsTransfer() {
  const [dest, setDest]       = useState<Dest>('va')
  const [vaSource, setVaSource] = useState<'Main' | 'Main2'>('Main')
  const [ship, setShip]       = useState<Ship>('standard')
  const [parts, setParts]     = useState<PartRow[]>([newRow()])
  const [needBy, setNeedBy]   = useState('')
  const [soNumber, setSoNumber] = useState('')
  const [priority, setPriority] = useState('Standard')
  const [notes, setNotes]     = useState('')

  const lateWarning = ship === 'nda' && isAfter2pm()
  const needByFmt   = fmtDate(needBy)

  const filledParts = parts.filter(p => p.partNumber.trim())
  const hasRequired = filledParts.length > 0 && needBy

  // ── Parts table helpers ────────────────────────────────────────────────────

  function updatePart(id: number, field: keyof PartRow, value: string) {
    setParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function addPart() {
    setParts(prev => [...prev, newRow()])
  }

  function removePart(id: number) {
    setParts(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev)
  }

  // ── Subject lines ──────────────────────────────────────────────────────────

  function partNumberList(): string {
    const pns = filledParts.map(p => p.partNumber.trim())
    if (pns.length === 0) return '[Part Number]'
    if (pns.length === 1) return pns[0]
    return pns.join(', ')
  }

  function subjectTransfer(): string {
    if (dest === 'va') {
      const base = `Transfer Request VA1 ${vaSource} to SVA | ${partNumberList()}`
      return ship === 'nda'
        ? `${base} | UPS RED | NEED BY ${needByFmt}`
        : `${base} | Need By ${needByFmt}`
    } else {
      return ship === 'nda'
        ? `Transfer Request TX3 to STX | UPS RED | NEED BY ${needByFmt}`
        : `Transfer Request from TX3 to STX | Need by ${needByFmt}`
    }
  }

  function subjectNdaShipping(): string {
    if (dest === 'va') {
      return `Transfer Request VA1 ${vaSource} to SVA | ${partNumberList()} | UPS RED | NEED BY ${needByFmt}`
    }
    return `Shipment Request TX3 to STX | UPS RED | NEED BY ${needByFmt}`
  }

  // ── To / CC strings ────────────────────────────────────────────────────────

  const toStr = dest === 'va' ? VA_TO.join('; ') : TX_TO.join('; ')
  const ccStr = dest === 'va' ? VA_CC.join('; ') : TX_CC.join('; ')

  // ── Parts listing for email body ───────────────────────────────────────────

  function partsBlock(): string {
    if (filledParts.length === 1) {
      const p = filledParts[0]
      const lines = [
        `  Part Number:  ${p.partNumber.trim()}`,
        p.description.trim() ? `  Description: ${p.description.trim()}` : '',
        `  Quantity:     ${p.qty.trim() || '1'}`,
      ]
      return lines.filter(Boolean).join('\n')
    }
    // Multiple parts — table format
    const rows = filledParts.map((p, i) => {
      const desc = p.description.trim() ? ` – ${p.description.trim()}` : ''
      return `  ${i + 1}. ${p.partNumber.trim()}${desc}  |  Qty: ${p.qty.trim() || '1'}`
    })
    return rows.join('\n')
  }

  // ── Email body ─────────────────────────────────────────────────────────────

  function transferBody(): string {
    const so = soNumber.trim()
    const n  = notes.trim()
    const multiPart = filledParts.length > 1

    return [
      `Hi Team,`,
      ``,
      `Please process the following transfer request:`,
      ``,
      multiPart ? `PARTS:` : '',
      partsBlock(),
      ``,
      `  Shipping:  ${ship === 'nda' ? 'UPS RED – Next Day Air' : 'Standard Ground'}`,
      so        ? `  Sales Order: ${so}` : '',
      `  Need By:  ${needByFmt}`,
      n         ? `\n  Notes: ${n}` : '',
      ``,
      `Please confirm receipt and status.`,
      ``,
      `Thank you,`,
    ].filter(l => l !== undefined && l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  }

  // ── VA service follow-up email ─────────────────────────────────────────────

  function vaFollowUpBody(): string {
    const so = soNumber.trim() || '[SO Number — to be provided by OE team]'
    return [
      `Hi Team,`,
      ``,
      `Following up on the transfer request for ${filledParts.length > 1 ? 'the parts listed below' : `Part # ${filledParts[0]?.partNumber.trim() || '[Part Number]'}`}.`,
      ``,
      `  Priority:        ${priority}`,
      `  Shipping Method: ${ship === 'nda' ? 'UPS RED – Next Day Air' : 'Standard Ground'}`,
      `  Sales Order #:   ${so}`,
      `  Need By:         ${needByFmt}`,
      filledParts.length > 1 ? `\nPARTS:\n${partsBlock()}` : '',
      ``,
      `Please let us know if any further information is needed.`,
      ``,
      `Thank you,`,
    ].filter(l => l !== undefined && l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  }

  // ── TX NDA shipping notification ───────────────────────────────────────────

  function txNdaShippingBody(): string {
    const so = soNumber.trim() || '[SO Number — to be provided by OE team]'
    return [
      `Hi Team,`,
      ``,
      `Please be advised of the following NDA shipment request:`,
      ``,
      filledParts.length > 1 ? `PARTS:\n${partsBlock()}` : partsBlock(),
      ``,
      `  Sales Order #: ${so}`,
      `  Shipping:      UPS RED – Next Day Air`,
      `  Need By:       ${needByFmt}`,
      ``,
      `This is a time-sensitive NDA shipment. Please process accordingly.`,
      ``,
      `Thank you,`,
    ].filter(l => l !== undefined && l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transfer Email Generator</h1>
          <div className="page-subtitle">Build pre-addressed transfer request emails for VA1→SVA and TX3→STX</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: form ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Transfer Details</div>
            <div className="form-grid">

              {/* Destination */}
              <div className="form-group">
                <label>From → To</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['va', 'tx'] as Dest[]).map(d => (
                    <button key={d} className={`btn btn-sm ${dest === d ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }} onClick={() => setDest(d)}>
                      {d === 'va' ? 'VA1 → SVA' : 'TX3 → STX'}
                    </button>
                  ))}
                </div>
              </div>

              {/* VA source location */}
              {dest === 'va' && (
                <div className="form-group">
                  <label>VA1 Source Location</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['Main', 'Main2'] as const).map(s => (
                      <button key={s} className={`btn btn-sm ${vaSource === s ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }} onClick={() => setVaSource(s)}>
                        VA1 {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping method */}
              <div className="form-group full">
                <label>Shipping Method</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['standard', 'nda'] as Ship[]).map(s => (
                    <button key={s} className={`btn btn-sm ${ship === s ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }} onClick={() => setShip(s)}>
                      {s === 'standard' ? 'Standard Ground' : 'NDA (UPS RED)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* NDA warning */}
              {ship === 'nda' && (
                <div className="form-group full">
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8,
                    background: lateWarning ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)',
                    border: `1px solid ${lateWarning ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  }}>
                    <AlertTriangle size={14} style={{ color: lateWarning ? 'var(--red)' : '#fbbf24', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {lateWarning
                        ? <><strong>It is currently after 2:00 PM.</strong> Contact <strong>{dest === 'va' ? VA_NDA_CONTACT : TX_NDA_CONTACT}</strong> for authorization before sending.</>
                        : <>NDA requests must be received by <strong>2:00 PM</strong>.{dest === 'tx' && <> Also notify <strong>USSAT Shipping</strong> ({TX_SHIPPING}) with the SO number.</>}</>
                      }
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Parts table */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>Parts <span style={{ color: 'var(--red)' }}>*</span></div>
              <button className="btn btn-sm btn-secondary" onClick={addPart}>
                <Plus size={12} /> Add Part
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 60px 28px', gap: 6 }}>
                {['Part Number', 'Description', 'Qty', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, paddingLeft: 2 }}>{h}</div>
                ))}
              </div>

              {parts.map((p, i) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 60px 28px', gap: 6, alignItems: 'center' }}>
                  <input
                    placeholder={`Part #${i + 1}`}
                    value={p.partNumber}
                    onChange={e => updatePart(p.id, 'partNumber', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    placeholder="Description (optional)"
                    value={p.description}
                    onChange={e => updatePart(p.id, 'description', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    placeholder="1"
                    value={p.qty}
                    onChange={e => updatePart(p.id, 'qty', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <button
                    className="btn btn-sm"
                    style={{ padding: '4px 6px', color: 'var(--text3)', background: 'none', border: '1px solid transparent' }}
                    onClick={() => removePart(p.id)}
                    disabled={parts.length === 1}
                    title="Remove row"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dates + meta */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Shipping Info</div>
            <div className="form-grid">

              <div className="form-group">
                <label>Need By Date <span style={{ color: 'var(--red)' }}>*</span></label>
                <input type="date" value={needBy} onChange={e => setNeedBy(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Sales Order #
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>
                    (if available — OE team will add)
                  </span>
                </label>
                <input
                  placeholder="Leave blank if not yet assigned"
                  value={soNumber}
                  onChange={e => setSoNumber(e.target.value)}
                />
              </div>

              {dest === 'va' && (
                <div className="form-group">
                  <label>Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}>
                    <option>Standard</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              )}

              <div className="form-group full">
                <label>Notes</label>
                <textarea
                  rows={2}
                  placeholder="Site name, unit, reason for request, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: output ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!hasRequired ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✉</div>
                <div style={{ fontSize: 14 }}>Add at least one part number and a need-by date</div>
              </div>
            </div>
          ) : (
            <>
              {/* Transfer request */}
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Transfer Request Email</div>
                <OutputBlock title="To"      value={toStr}             mono={false} />
                <OutputBlock title="CC"      value={ccStr}             mono={false} />
                <OutputBlock title="Subject" value={subjectTransfer()} mono={false} />
                <OutputBlock title="Body"    value={transferBody()} />
                <div style={{
                  marginTop: 4, padding: '7px 10px', borderRadius: 6,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
                }}>
                  {dest === 'va'
                    ? 'Reply will confirm "done and pulling" or that further approval is needed.'
                    : 'Standard: acknowledged by 5:00 PM same day. NDA: within 1 hour.'
                  }
                </div>
              </div>

              {/* VA follow-up */}
              {dest === 'va' && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    Service Follow-Up Email
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                      (OE team sends this after request is processed)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                    Confirms priority, shipping method, and SO# once assigned.
                  </div>
                  <OutputBlock title="Subject" value={subjectTransfer()} mono={false} />
                  <OutputBlock title="Body"    value={vaFollowUpBody()} />
                </div>
              )}

              {/* TX NDA shipping notification */}
              {dest === 'tx' && ship === 'nda' && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    NDA Shipping Notification
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                      (sent separately to USSAT Shipping)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                    OE team sends this to alert TX shipping of the NDA.
                  </div>
                  <OutputBlock title="To"      value={TX_SHIPPING}         mono={false} />
                  <OutputBlock title="Subject" value={subjectNdaShipping()} mono={false} />
                  <OutputBlock title="Body"    value={txNdaShippingBody()} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
