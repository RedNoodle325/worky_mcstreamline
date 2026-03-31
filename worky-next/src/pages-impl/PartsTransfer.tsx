'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const VA_TO   = ['hope.hawks@munters.com', 'Betty.Thompson@munters.com']
const VA_CC   = ['Rebecca.Patterson@munters.com', 'Lisa.Slagle@munters.com', 'Sarah.Dudley@Munters.com', 'Carson.Brantley@munters.com']
const VA_NDA_AFTER_2PM = 'Amanda Nicely'

const TX_TO   = ['Katherine.morales@munters.com']
const TX_CC   = ['Elizabeth.olguin@munters.com']
const TX_SHIPPING = 'Texas.shipping@munters.com'
const TX_NDA_AFTER_2PM = 'Benito Calderon (warehouse supervisor)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return 'XX/XX/XXXX'
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function isAfter2pm(): boolean {
  const now = new Date()
  return now.getHours() >= 14
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

// ── Section ───────────────────────────────────────────────────────────────────

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
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--text)',
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
  const [dest, setDest] = useState<Dest>('va')
  const [vaSource, setVaSource] = useState<'Main' | 'Main2'>('Main')
  const [ship, setShip] = useState<Ship>('standard')
  const [partNumber, setPartNumber] = useState('')
  const [partDesc, setPartDesc] = useState('')
  const [qty, setQty] = useState('')
  const [needBy, setNeedBy] = useState('')
  const [soNumber, setSoNumber] = useState('')
  const [priority, setPriority] = useState('Standard')
  const [notes, setNotes] = useState('')

  const lateWarning = ship === 'nda' && isAfter2pm()
  const needByFmt = fmtDate(needBy)
  const hasRequired = partNumber.trim() && needBy

  // ── Subject lines ──────────────────────────────────────────────────────────

  function subjectTransfer(): string {
    if (dest === 'va') {
      const base = `Transfer Request VA1 ${vaSource} to SVA | ${partNumber.trim() || '[Part Number]'}`
      if (ship === 'nda') return `${base} | UPS RED | NEED BY ${needByFmt}`
      return `${base} | Need By ${needByFmt}`
    } else {
      if (ship === 'nda') return `Transfer Request TX3 to STX | UPS RED | NEED BY ${needByFmt}`
      return `Transfer Request from TX3 to STX | Need by ${needByFmt}`
    }
  }

  function subjectFollowUp(): string {
    if (dest === 'va') {
      const base = `Transfer Request VA1 ${vaSource} to SVA | ${partNumber.trim() || '[Part Number]'}`
      if (ship === 'nda') return `${base} | UPS RED | NEED BY ${needByFmt}`
      return `${base} | Need By ${needByFmt}`
    } else {
      if (ship === 'nda') return `Shipment Request TX3 to STX | UPS RED | NEED BY ${needByFmt}`
      return `Transfer Request from TX3 to STX | Need by ${needByFmt}`
    }
  }

  // ── To / CC strings ────────────────────────────────────────────────────────

  const toStr   = dest === 'va' ? VA_TO.join('; ') : TX_TO.join('; ')
  const ccStr   = dest === 'va' ? VA_CC.join('; ') : TX_CC.join('; ')

  // ── Email body ─────────────────────────────────────────────────────────────

  function transferBody(): string {
    const pn   = partNumber.trim() || '[Part Number]'
    const desc = partDesc.trim()
    const q    = qty.trim() || '[Qty]'
    const so   = soNumber.trim()
    const n    = notes.trim()

    const lines = [
      `Hi Team,`,
      ``,
      `Please process the following transfer request:`,
      ``,
      `  Part Number:   ${pn}`,
      desc ? `  Description:  ${desc}` : '',
      `  Quantity:      ${q}`,
      `  Shipping:      ${ship === 'nda' ? 'UPS RED – Next Day Air' : 'Standard Ground'}`,
      so ? `  Sales Order:   ${so}` : '',
      `  Need By:       ${needByFmt}`,
      n ? `\n  Notes: ${n}` : '',
      ``,
      `Please confirm receipt and status.`,
      ``,
      `Thank you,`,
    ]

    return lines.filter(l => l !== undefined && l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
  }

  // ── VA service follow-up email ─────────────────────────────────────────────

  function vaFollowUpBody(): string {
    const pn = partNumber.trim() || '[Part Number]'
    const so = soNumber.trim() || '[SO Number]'
    return [
      `Hi Team,`,
      ``,
      `Following up on the transfer request for Part # ${pn}.`,
      ``,
      `  Priority:        ${priority}`,
      `  Shipping Method: ${ship === 'nda' ? 'UPS RED – Next Day Air' : 'Standard Ground'}`,
      `  Sales Order #:   ${so}`,
      `  Need By:         ${needByFmt}`,
      ``,
      `Please let us know if any further information is needed.`,
      ``,
      `Thank you,`,
    ].join('\n')
  }

  // ── TX NDA shipping notification ───────────────────────────────────────────

  function txNdaShippingBody(): string {
    const pn = partNumber.trim() || '[Part Number]'
    const so = soNumber.trim() || '[SO Number]'
    return [
      `Hi Team,`,
      ``,
      `Please be advised of the following NDA shipment request:`,
      ``,
      `  Part Number:   ${pn}`,
      `  Sales Order #: ${so}`,
      `  Shipping:      UPS RED – Next Day Air`,
      `  Need By:       ${needByFmt}`,
      ``,
      `This is a time-sensitive NDA shipment. Please process accordingly.`,
      ``,
      `Thank you,`,
    ].join('\n')
  }

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

          {/* Destination + shipping */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Transfer Details</div>
            <div className="form-grid">

              <div className="form-group">
                <label>From → To</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['va', 'tx'] as Dest[]).map(d => (
                    <button
                      key={d}
                      className={`btn btn-sm ${dest === d ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setDest(d)}
                    >
                      {d === 'va' ? 'VA1 → SVA' : 'TX3 → STX'}
                    </button>
                  ))}
                </div>
              </div>

              {dest === 'va' && (
                <div className="form-group">
                  <label>VA1 Source Location</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['Main', 'Main2'] as const).map(s => (
                      <button
                        key={s}
                        className={`btn btn-sm ${vaSource === s ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                        onClick={() => setVaSource(s)}
                      >
                        VA1 {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Shipping Method</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['standard', 'nda'] as Ship[]).map(s => (
                    <button
                      key={s}
                      className={`btn btn-sm ${ship === s ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setShip(s)}
                    >
                      {s === 'standard' ? 'Standard Ground' : 'NDA (UPS RED)'}
                    </button>
                  ))}
                </div>
              </div>

              {ship === 'nda' && (
                <div className="form-group full">
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: '8px 10px', borderRadius: 8,
                    background: lateWarning ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)',
                    border: `1px solid ${lateWarning ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  }}>
                    <AlertTriangle size={14} style={{ color: lateWarning ? 'var(--red)' : '#fbbf24', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {lateWarning
                        ? <>
                            <strong>It is currently after 2:00 PM.</strong> NDA requests must be received by 2:00 PM.{' '}
                            Contact <strong>{dest === 'va' ? VA_NDA_AFTER_2PM : TX_NDA_AFTER_2PM}</strong> for authorization before sending.
                          </>
                        : <>NDA requests must be received by <strong>2:00 PM</strong> to be processed.{' '}
                            {dest === 'tx' && <>For TX, also notify <strong>USSAT Shipping</strong> ({TX_SHIPPING}) with the SO number.</>}
                          </>
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Part Number <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  placeholder="e.g. 123456-01"
                  value={partNumber}
                  onChange={e => setPartNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Part Description</label>
                <input
                  placeholder="Optional — helps warehouse identify it"
                  value={partDesc}
                  onChange={e => setPartDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  placeholder="1"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Need By Date <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="date"
                  value={needBy}
                  onChange={e => setNeedBy(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Sales Order # {ship === 'nda' && <span style={{ color: 'var(--red)' }}>*</span>}</label>
                <input
                  placeholder={ship === 'nda' ? 'Required for NDA' : 'If available'}
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
                <label>Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Site name, unit, reason for transfer, etc."
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
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✉</div>
                <div style={{ fontSize: 14 }}>Fill in Part Number and Need By Date to generate emails</div>
              </div>
            </div>
          ) : (
            <>
              {/* Transfer request email */}
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text)' }}>
                  Transfer Request Email
                </div>

                <OutputBlock title="To" value={toStr} mono={false} />
                <OutputBlock title="CC" value={ccStr} mono={false} />
                <OutputBlock title="Subject" value={subjectTransfer()} mono={false} />
                <OutputBlock title="Body" value={transferBody()} />

                <div style={{
                  marginTop: 8, padding: '8px 10px', borderRadius: 6,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
                }}>
                  {dest === 'va'
                    ? 'Acknowledgment: You will receive a reply stating "done and pulling" or that further approval is needed.'
                    : `Acknowledgment: Standard requests acknowledged by 5:00 PM same day. NDA within 1 hour.`
                  }
                </div>
              </div>

              {/* VA: service follow-up email */}
              {dest === 'va' && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
                    Service Follow-Up Email
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                      (sent by OE team after request)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                    Send this to the same To/CC list to confirm priority, method, and SO number.
                  </div>
                  <OutputBlock title="Subject" value={subjectFollowUp()} mono={false} />
                  <OutputBlock title="Body" value={vaFollowUpBody()} />
                </div>
              )}

              {/* TX NDA: shipping notification */}
              {dest === 'tx' && ship === 'nda' && (
                <div className="card">
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
                    NDA Shipping Notification
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                      (sent separately to USSAT Shipping)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                    Sent by OE team to alert the TX shipping department of the NDA.
                  </div>
                  <OutputBlock title="To" value={TX_SHIPPING} mono={false} />
                  <OutputBlock title="Subject" value={subjectFollowUp()} mono={false} />
                  <OutputBlock title="Body" value={txNdaShippingBody()} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
