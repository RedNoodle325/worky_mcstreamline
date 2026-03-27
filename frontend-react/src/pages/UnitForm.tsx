import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { API } from '../api'
import type { Unit, Site } from '../types'
import { useToastFn } from '../App'

const UNIT_TYPES = [
  { value: 'condenser', label: 'Condenser' },
  { value: 'evaporator', label: 'Evaporator' },
  { value: 'chiller', label: 'Chiller' },
  { value: 'air_handler', label: 'Air Handler' },
  { value: 'indirect_cooling', label: 'Indirect Cooling' },
  { value: 'indirect_evaporative', label: 'Indirect Evaporative' },
  { value: 'sycool', label: 'SyCool' },
]

export function UnitForm() {
  const { id, siteId: paramSiteId } = useParams<{ id?: string; siteId?: string }>()
  const navigate = useNavigate()
  const toast = useToastFn()
  const isEditing = !!id

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [siteId, setSiteId] = useState(paramSiteId || '')
  const [tag, setTag] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [unitType, setUnitType] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [capacityKw, setCapacityKw] = useState('')
  const [location, setLocation] = useState('')
  const [floor, setFloor] = useState('')
  const [status, setStatus] = useState('')
  const [installDate, setInstallDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [notes, setNotes] = useState('')

  // Keep reference to original unit for display
  const [origUnit, setOrigUnit] = useState<Partial<Unit>>({})

  useEffect(() => {
    async function load() {
      try {
        const [allSites] = await Promise.all([API.sites.list()])
        setSites(allSites)

        if (isEditing && id) {
          const unit = await API.units.get(id)
          setOrigUnit(unit)
          setSiteId(unit.site_id || '')
          setTag(unit.tag || '')
          setSerialNumber(unit.serial_number || '')
          setUnitType(unit.unit_type || '')
          setManufacturer(unit.manufacturer || '')
          setModel(unit.model || '')
          setCapacityKw(unit.capacity_kw != null ? String(unit.capacity_kw) : '')
          setLocation(unit.location || '')
          setFloor(unit.floor || '')
          setStatus(unit.status || '')
          setInstallDate(unit.install_date ? unit.install_date.split('T')[0] : '')
          setWarrantyExpiry(unit.warranty_expiry ? unit.warranty_expiry.split('T')[0] : '')
          setNotes(unit.notes || '')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEditing])

  const handleDelete = async () => {
    if (!id || !confirm(`Delete unit "${origUnit.tag || origUnit.serial_number}"? This cannot be undone.`)) return
    try {
      await API.units.delete(id)
      toast('Unit deleted')
      if (origUnit.site_id) navigate(`/sites/${origUnit.site_id}`)
      else navigate('/')
    } catch (e) {
      toast('Error: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const data: Partial<Unit> = {
      tag: tag || undefined,
      serial_number: serialNumber || undefined,
      unit_type: unitType || undefined,
      manufacturer: manufacturer || undefined,
      model: model || undefined,
      capacity_kw: capacityKw ? Number(capacityKw) : undefined,
      location: location || undefined,
      floor: floor || undefined,
      status: status || undefined,
      install_date: installDate || undefined,
      warranty_expiry: warrantyExpiry || undefined,
      notes: notes || undefined,
    }

    if (!isEditing) {
      data.site_id = siteId || undefined
    }

    try {
      if (isEditing && id) {
        await API.units.update(id, data)
        toast('Unit updated')
        navigate(`/units/${id}`)
      } else {
        const created = await API.units.create(data)
        toast('Unit created')
        if (created.site_id) navigate(`/sites/${created.site_id}`)
        else navigate(`/units/${created.id}`)
      }
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : String(err)), 'error')
    } finally {
      setSaving(false)
    }
  }

  const backHref = isEditing && origUnit.site_id
    ? `/sites/${origUnit.site_id}`
    : paramSiteId
    ? `/sites/${paramSiteId}`
    : '/'

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
          <Link to={backHref} className="btn btn-secondary btn-sm">← Back</Link>
          <div>
            <h1 style={{ margin: 0 }}>
              {isEditing ? `Edit Unit ${origUnit.tag || origUnit.serial_number || ''}` : 'New Unit'}
            </h1>
            {isEditing && origUnit.model && (
              <div className="page-subtitle">{origUnit.model}</div>
            )}
          </div>
        </div>
        {isEditing && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleDelete}
            style={{ background: 'var(--red)22', color: 'var(--red)', border: '1px solid var(--red)44' }}
          >
            Delete Unit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 900 }}>

        {/* Identification */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Unit Identification</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Site *</label>
              <select
                required
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                disabled={isEditing}
              >
                <option value="">— Select Site —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.project_name || s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tag / ID *</label>
              <input
                required
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="e.g. COND-001"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label>Serial Number</label>
              <input
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="e.g. 22366582-0001"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label>Unit Type *</label>
              <select required value={unitType} onChange={e => setUnitType(e.target.value)}>
                <option value="">— Select Type —</option>
                {UNIT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Manufacturer</label>
              <input
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                placeholder="e.g. Munters"
              />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. SYS500C"
              />
            </div>
            <div className="form-group">
              <label>Capacity (kW)</label>
              <input
                type="number"
                step="0.1"
                value={capacityKw}
                onChange={e => setCapacityKw(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div className="form-group">
              <label>Location on Site</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Rooftop North"
              />
            </div>
            <div className="form-group">
              <label>Floor</label>
              <input
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          </div>
        </div>

        {/* Status & Dates */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Status &amp; Dates</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">— Select —</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </div>
            <div className="form-group">
              <label>Install Date</label>
              <input
                type="date"
                value={installDate}
                onChange={e => setInstallDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Warranty Expiry</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={e => setWarrantyExpiry(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Notes</div>
          <div className="form-grid">
            <div className="form-group full">
              <textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes about this unit…"
              />
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ padding: '0 0 32px' }}>
          <Link to={backHref} className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Unit'}
          </button>
        </div>
      </form>
    </div>
  )
}
