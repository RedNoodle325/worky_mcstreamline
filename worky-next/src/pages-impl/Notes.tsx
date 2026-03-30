'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { Note } from '../types'

const NOTE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  meeting:    { icon: '👥', label: 'Meeting',    color: '#7c3aed' },
  phone_call: { icon: '📞', label: 'Phone Call', color: '#2563eb' },
  email:      { icon: '✉️',  label: 'Email',      color: '#0891b2' },
  note:       { icon: '📝', label: 'Note',       color: '#6b7280' },
}

const NOTE_TEMPLATES: Record<string, string[]> = {
  meeting:    ['date', 'attendees', 'agenda', 'notes', 'actions'],
  phone_call: ['date', 'with', 'purpose', 'notes', 'actions'],
  email:      ['date', 'to_from', 'subject', 'notes', 'actions'],
  note:       ['notes'],
}

const CONTENT_LABELS: Record<string, string> = {
  date: 'Date', attendees: 'Attendees', agenda: 'Agenda',
  notes: 'Notes', actions: 'Action Items', with: 'With',
  purpose: 'Purpose', to_from: 'To / From', subject: 'Subject',
}

const TEXTAREA_FIELDS = new Set(['notes', 'agenda', 'actions', 'purpose'])

type ParsedContent = Record<string, string>

function parseContent(content?: string): ParsedContent | null {
  if (!content) return null
  const c = content.trim()
  if (!c.startsWith('{')) return null
  try { return JSON.parse(c) } catch { return null }
}

interface NoteGroup {
  site_id?: string
  site_name?: string
  notes: Note[]
}

function MarkdownField({ content, size = 13 }: { content: string; size?: number }) {
  return (
    <div className="md-content" style={{ fontSize: size }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function StructuredContent({ parsed }: { parsed: ParsedContent }) {
  return (
    <div style={{ marginTop: 4 }}>
      {Object.entries(parsed)
        .filter(([k, v]) => v && k !== 'notes')
        .map(([k, v]) => (
          <div key={k} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>
              {CONTENT_LABELS[k] || k}
            </div>
            {TEXTAREA_FIELDS.has(k)
              ? <MarkdownField content={v} size={12} />
              : <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{v}</div>
            }
          </div>
        ))
      }
      {parsed.notes && (
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>
            Notes
          </div>
          <MarkdownField content={parsed.notes} />
        </div>
      )}
    </div>
  )
}

interface EditState {
  note: Note
  type: string
  fields: Record<string, string>
  preview: boolean
}

export function Notes() {
  const toast = useToastFn()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Note[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function doSearch(q: string) {
    setSearching(true)
    setSearched(true)
    try {
      const data = await API.notes.search(q)
      setResults(data)
    } catch (e) {
      toast('Search error: ' + (e as Error).message, 'error')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => { doSearch('') }, [])

  function handleSearch() { doSearch(query) }
  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  function openEdit(note: Note) {
    const parsed = parseContent(note.content)
    const activeType = note.note_type || 'note'
    const fields: Record<string, string> = {}
    if (parsed) {
      for (const k of (NOTE_TEMPLATES[activeType] || NOTE_TEMPLATES.note)) {
        fields[k] = parsed[k] || ''
      }
    } else {
      fields['notes'] = note.content || ''
    }
    setEditState({ note, type: activeType, fields, preview: false })
  }

  function switchType(type: string) {
    if (!editState) return
    const fields: Record<string, string> = {}
    for (const k of (NOTE_TEMPLATES[type] || NOTE_TEMPLATES.note)) {
      fields[k] = ''
    }
    setEditState({ ...editState, type, fields, preview: false })
  }

  async function handleSaveNote() {
    if (!editState) return
    setSaving(true)
    const contentObj: Record<string, string> = {}
    for (const f of (NOTE_TEMPLATES[editState.type] || NOTE_TEMPLATES.note)) {
      const v = editState.fields[f]
      if (v) contentObj[f] = v
    }
    try {
      await API.notes.update(editState.note.id, {
        note_type: editState.type,
        content: JSON.stringify(contentObj),
      })
      toast('Note saved')
      setEditState(null)
      doSearch(query)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteNote() {
    if (!editState) return
    if (!confirm('Delete this note?')) return
    try {
      await API.notes.delete(editState.note.id)
      toast('Note deleted')
      setEditState(null)
      doSearch(query)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  // Group by site
  const grouped: NoteGroup[] = []
  const siteOrder: string[] = []
  const siteMap: Record<string, NoteGroup> = {}

  for (const n of results) {
    const key = n.site_id || '__none__'
    if (!siteMap[key]) {
      siteMap[key] = { site_id: n.site_id, site_name: (n as Note & { site_name?: string }).site_name, notes: [] }
      siteOrder.push(key)
    }
    siteMap[key].notes.push(n)
  }
  for (const k of siteOrder) grouped.push(siteMap[k])

  function highlight(text: string) {
    if (!query.trim()) return text
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(re)
    return (
      <>
        {parts.map((p, i) =>
          re.test(p) ? (
            <mark key={i} style={{ background: 'var(--yellow)33', color: 'var(--yellow)', borderRadius: 2 }}>
              {p}
            </mark>
          ) : p
        )}
      </>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Notes</h1>
          <div className="page-subtitle">Search notes across all sites and units</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by keyword, site, or unit…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            style={{
              flex: 1, minWidth: 200, padding: '8px 12px',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
            }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          <button className="btn btn-secondary" onClick={handleClear}>Clear</button>
        </div>
      </div>

      {/* Results */}
      {searching ? (
        <div style={{ color: 'var(--text2)', fontSize: 13, padding: '12px 0' }}>Searching…</div>
      ) : !searched ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>
          Enter a search term to find notes, or leave blank to see all recent notes.
        </div>
      ) : results.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>No notes found.</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            {results.length} note{results.length !== 1 ? 's' : ''} found
          </div>
          {grouped.map(group => (
            <div key={group.site_id || 'none'} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {group.site_id ? (
                  <span
                    onClick={() => router.push(`/sites/${group.site_id}`)}
                    style={{ cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}
                  >
                    {group.site_name || 'Unknown Site'}
                  </span>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    No Site
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {group.notes.length} note{group.notes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {group.notes.map(n => {
                const typeCfg = NOTE_TYPE_CONFIG[n.note_type || 'note'] || NOTE_TYPE_CONFIG.note
                const parsed = parseContent(n.content)
                const whoField = parsed?.attendees || parsed?.with || parsed?.to_from || null

                return (
                  <div
                    key={n.id}
                    onClick={() => openEdit(n)}
                    style={{
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${typeCfg.color}`,
                      borderRadius: 8, padding: 12, marginBottom: 8,
                      background: 'var(--bg3)', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      marginBottom: parsed ? 8 : 4, flexWrap: 'wrap', gap: 6,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: typeCfg.color, background: `${typeCfg.color}18`,
                          border: `1px solid ${typeCfg.color}44`,
                          borderRadius: 99, padding: '1px 8px',
                        }}>
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                        {whoField && (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{whoField}</span>
                        )}
                        {(n as Note & { unit_id?: string; unit_asset_tag?: string }).unit_asset_tag && (
                          <span
                            onClick={e => {
                              e.stopPropagation()
                              const unitId = (n as Note & { unit_id?: string }).unit_id
                              if (unitId) router.push(`/units/${unitId}`)
                            }}
                            style={{
                              fontSize: 11, fontFamily: 'monospace',
                              background: 'var(--bg2)', border: '1px solid var(--border)',
                              borderRadius: 4, padding: '1px 6px', cursor: 'pointer',
                            }}
                          >
                            {(n as Note & { unit_asset_tag?: string }).unit_asset_tag}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Edit</span>
                      </div>
                    </div>

                    {parsed
                      ? <StructuredContent parsed={parsed} />
                      : <MarkdownField content={n.content || ''} />
                    }
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {/* Edit modal */}
      {editState && (
        <Modal title="Edit Log Entry" onClose={() => setEditState(null)} maxWidth={520}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            {editState.note.site_id ? (grouped.find(g => g.site_id === editState.note.site_id)?.site_name || 'Unknown Site') : 'No Site'}
          </div>

          {/* Note type selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(NOTE_TYPE_CONFIG).map(([val, cfg]) => (
              <button
                key={val}
                type="button"
                onClick={() => switchType(val)}
                style={{
                  flex: 1, minWidth: 80, textAlign: 'center', padding: '7px 4px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: editState.type === val ? 'var(--accent)' : 'transparent',
                  color: editState.type === val ? '#fff' : 'var(--text)',
                  borderColor: editState.type === val ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>

          {/* Dynamic fields */}
          {(NOTE_TEMPLATES[editState.type] || NOTE_TEMPLATES.note).map(field => {
            const label = CONTENT_LABELS[field] || field
            const isTextarea = TEXTAREA_FIELDS.has(field)
            const isDate = field === 'date'
            return (
              <div key={field} className="form-group" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>
                    {label}
                  </label>
                  {isTextarea && (
                    <button
                      type="button"
                      onClick={() => setEditState(s => s ? { ...s, preview: !s.preview } : s)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 8px',
                        border: '1px solid var(--border)', borderRadius: 4,
                        background: editState.preview ? 'var(--accent)' : 'transparent',
                        color: editState.preview ? '#fff' : 'var(--text3)',
                        cursor: 'pointer',
                      }}
                    >
                      {editState.preview ? 'Edit' : 'Preview'}
                    </button>
                  )}
                </div>
                {isTextarea ? (
                  editState.preview ? (
                    <div
                      className="md-content"
                      style={{
                        minHeight: 72, padding: '8px 10px',
                        border: '1px solid var(--border)', borderRadius: 8,
                        background: 'var(--bg3)', fontSize: 13,
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {editState.fields[field] || '*nothing yet*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      rows={4}
                      value={editState.fields[field] || ''}
                      onChange={e => setEditState(s => s ? { ...s, fields: { ...s.fields, [field]: e.target.value } } : s)}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }}
                      placeholder="Markdown supported"
                    />
                  )
                ) : (
                  <input
                    type={isDate ? 'datetime-local' : 'text'}
                    value={editState.fields[field] || ''}
                    onChange={e => setEditState(s => s ? { ...s, fields: { ...s.fields, [field]: e.target.value } } : s)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ color: 'var(--red)' }}
              onClick={handleDeleteNote}
            >
              Delete
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setEditState(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveNote} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
