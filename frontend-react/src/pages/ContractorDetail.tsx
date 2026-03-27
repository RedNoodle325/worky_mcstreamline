import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { API } from '../api'
import type { Contractor, Site } from '../types'
import { useToastFn } from '../App'

export function ContractorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToastFn()
  const isNew = !id

  const [contractor, setContractor] = useState<Partial<Contractor>>({})
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      try {
        if (!isNew && id) {
          const [c, allSites] = await Promise.all([
            API.contractors.get(id),
            API.sites.list().catch(() => [] as Site[]),
          ])
          setContractor(c)
          setName(c.name || '')
          setCompany(c.company || '')
          setEmail(c.email || '')
          setPhone(c.phone || '')
          setSpecialty(c.specialty || '')
          setNotes(c.notes || '')
          setSites(allSites)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contractor')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isNew])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const data: Partial<Contractor> = {
      name: name || undefined,
      company: company || undefined,
      email: email || undefined,
      phone: phone || undefined,
      specialty: specialty || undefined,
      notes: notes || undefined,
    }
    try {
      if (!isNew && id) {
        await API.contractors.update(id, data)
        toast('Contractor updated')
      } else {
        await API.contractors.create(data)
        toast('Contractor added')
      }
      navigate('/contractors')
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm(`Delete "${contractor.name || contractor.company}"? This cannot be undone.`)) return
    try {
      await API.contractors.delete(id)
      toast('Contractor deleted')
      navigate('/contractors')
    } catch (e) {
      toast('Error: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 40 }}>Error: {error}</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/contractors" className="btn btn-secondary btn-sm">← Contractors</Link>
          <div>
            <h1 style={{ margin: 0 }}>{isNew ? 'New Contractor' : (contractor.company || contractor.name || 'Contractor')}</h1>
            {!isNew && contractor.specialty && (
              <div className="page-subtitle">{contractor.specialty}</div>
            )}
          </div>
        </div>
        {!isNew && (
          <button
            className="btn btn-sm"
            onClick={handleDelete}
            style={{ background: 'var(--red)22', color: 'var(--red)', border: '1px solid var(--red)44' }}
          >
            Delete
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 900 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Contractor Info</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. ABC Mechanical"
              />
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <input
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                placeholder="e.g. HVAC, electrical"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Associated sites — read-only info panel when editing */}
        {!isNew && sites.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Associated Sites</div>
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>
              Sites are linked via contacts. Visit a site to associate this contractor.
            </div>
          </div>
        )}

        <div className="form-actions" style={{ padding: '0 0 32px' }}>
          <Link to="/contractors" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add Contractor' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
