'use client'

import { useEffect, useState } from 'react'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { ResourceLink } from '../types'
import { ExternalLink, Plus, Pencil, Trash2, BookOpen, FileText, BarChart2, Link } from 'lucide-react'

const CATEGORIES = [
  { value: 'tracker',   label: 'Trackers',   icon: BarChart2,  color: '#3b82f6' },
  { value: 'form',      label: 'Forms',      icon: FileText,   color: '#8b5cf6' },
  { value: 'reference', label: 'References', icon: BookOpen,   color: '#f97316' },
  { value: 'general',   label: 'General',    icon: Link,       color: '#64748b' },
]

function catMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[3]
}

interface FormState {
  name: string
  url: string
  category: string
  description: string
}

const EMPTY: FormState = { name: '', url: '', category: 'general', description: '' }

export function Resources() {
  const toast = useToastFn()
  const [links, setLinks] = useState<ResourceLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ResourceLink | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setLinks(await API.resourceLinks.list())
    } catch (e) {
      toast('Failed to load resources: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditTarget(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function openEdit(link: ResourceLink) {
    setEditTarget(link)
    setForm({ name: link.name, url: link.url ?? '', category: link.category, description: link.description ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      if (editTarget) {
        await API.resourceLinks.update(editTarget.id, form)
        toast('Link updated')
      } else {
        await API.resourceLinks.create(form)
        toast('Link added')
      }
      setShowModal(false)
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(link: ResourceLink) {
    if (!confirm(`Delete "${link.name}"?`)) return
    try {
      await API.resourceLinks.delete(link.id)
      toast('Deleted')
      load()
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  // Group by category in display order
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: links.filter(l => l.category === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resources</h1>
          <div className="page-subtitle">Quick links to trackers, forms, and reference documents</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={14} style={{ marginRight: 4 }} />
          Add Link
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : links.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          No links yet — add a tracker, form, or document link above.
        </div>
      ) : (
        grouped.map(group => {
          const Icon = group.icon
          return (
            <div key={group.value} style={{ marginBottom: 20 }}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 8,
              }}>
                <Icon size={14} color={group.color} />
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.06,
                  textTransform: 'uppercase', color: group.color,
                }}>
                  {group.label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {group.items.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    accentColor={group.color}
                    onEdit={() => openEdit(link)}
                    onDelete={() => handleDelete(link)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Uncategorised (categories not in our list) */}
      {(() => {
        const knownCats = new Set(CATEGORIES.map(c => c.value))
        const other = links.filter(l => !knownCats.has(l.category))
        if (!other.length) return null
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
              Other
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {other.map(link => (
                <LinkCard key={link.id} link={link} accentColor="#64748b" onEdit={() => openEdit(link)} onDelete={() => handleDelete(link)} />
              ))}
            </div>
          </div>
        )
      })()}

      {showModal && (
        <Modal
          title={editTarget ? 'Edit Link' : 'Add Link'}
          onClose={() => setShowModal(false)}
          maxWidth={480}
        >
          <div className="form-grid">
            <div className="form-group full">
              <label>Name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. DC PM Tracker"
              />
            </div>
            <div className="form-group full">
              <label>URL</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://…"
                type="url"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short note about what this is"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save' : 'Add'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Link card ──────────────────────────────────────────────────────────────────
function LinkCard({
  link, accentColor, onEdit, onDelete,
}: {
  link: ResourceLink
  accentColor: string
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = catMeta(link.category)
  const Icon = meta.icon

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: accentColor, flexShrink: 0 }} />

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <Icon size={13} color={accentColor} style={{ flexShrink: 0 }} />
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {link.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              title="Edit"
              onClick={onEdit}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}
            >
              <Pencil size={12} />
            </button>
            <button
              title="Delete"
              onClick={onDelete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, display: 'flex', opacity: 0.6 }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {link.description && (
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
            {link.description}
          </div>
        )}
      </div>

      {/* Open button */}
      {link.url && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px',
            borderTop: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600,
            color: accentColor,
            textDecoration: 'none',
            background: `${accentColor}0a`,
          }}
        >
          <ExternalLink size={12} />
          Open
        </a>
      )}
    </div>
  )
}
