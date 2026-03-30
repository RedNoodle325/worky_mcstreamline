'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { Note, Site } from '../types'

const NOTE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  meeting:    { icon: '👥', label: 'Meeting',     color: '#7c3aed' },
  phone_call: { icon: '📞', label: 'Phone Call',  color: '#2563eb' },
  email:      { icon: '✉️',  label: 'Email',       color: '#0891b2' },
  note:       { icon: '📝', label: 'Note',        color: '#6b7280' },
  improvement:{ icon: '💡', label: 'Improvement', color: '#d97706' },
  follow_up:  { icon: '👤', label: 'Follow Up',   color: '#16a34a' },
}

// Site-related note types
const SITE_NOTE_TYPES = ['meeting', 'phone_call', 'email', 'note']
// Job-level note types (not site-specific)
const JOB_NOTE_TYPES = ['improvement', 'follow_up', 'note', 'meeting', 'phone_call', 'email']

const MARKDOWN_TEMPLATES: Record<string, string> = {
  meeting: `# Meeting Notes

**Date:**
**Attendees:**
**Location / Call Link:**

## Agenda


## Notes


## Action Items
- `,
  phone_call: `# Phone Call

**Date:**
**With:**
**Purpose:**

## Notes


## Action Items
- `,
  email: `# Email

**Date:**
**To / From:**
**Subject:**

## Notes


## Action Items
- `,
  note: '',
  improvement: `# Company Improvement

## Observation


## Suggestion


## Priority
Low / Medium / High
`,
  follow_up: `# Follow Up

**Person:**
**Topic:**

## Notes


## Next Steps
- `,
}

// Convert legacy JSON-structured notes to markdown
function jsonToMarkdown(parsed: Record<string, string>, noteType: string): string {
  if (noteType === 'meeting') {
    const parts: string[] = ['# Meeting Notes']
    if (parsed.date)      parts.push(`\n**Date:** ${parsed.date}`)
    if (parsed.attendees) parts.push(`**Attendees:** ${parsed.attendees}`)
    if (parsed.agenda)    parts.push(`\n## Agenda\n${parsed.agenda}`)
    if (parsed.notes)     parts.push(`\n## Notes\n${parsed.notes}`)
    if (parsed.actions)   parts.push(`\n## Action Items\n${parsed.actions}`)
    return parts.join('\n')
  }
  if (noteType === 'phone_call') {
    const parts: string[] = ['# Phone Call']
    if (parsed.date)    parts.push(`\n**Date:** ${parsed.date}`)
    if (parsed.with)    parts.push(`**With:** ${parsed.with}`)
    if (parsed.purpose) parts.push(`**Purpose:** ${parsed.purpose}`)
    if (parsed.notes)   parts.push(`\n## Notes\n${parsed.notes}`)
    if (parsed.actions) parts.push(`\n## Action Items\n${parsed.actions}`)
    return parts.join('\n')
  }
  if (noteType === 'email') {
    const parts: string[] = ['# Email']
    if (parsed.date)    parts.push(`\n**Date:** ${parsed.date}`)
    if (parsed.to_from) parts.push(`**To / From:** ${parsed.to_from}`)
    if (parsed.subject) parts.push(`**Subject:** ${parsed.subject}`)
    if (parsed.notes)   parts.push(`\n## Notes\n${parsed.notes}`)
    if (parsed.actions) parts.push(`\n## Action Items\n${parsed.actions}`)
    return parts.join('\n')
  }
  // generic
  return parsed.notes || Object.values(parsed).join('\n')
}

function getEditableContent(note: Note): string {
  const raw = note.content || ''
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return jsonToMarkdown(parsed, note.note_type || 'note')
    } catch { /* fall through */ }
  }
  return raw
}

interface NoteGroup {
  site_id?: string
  site_name?: string
  notes: Note[]
}

interface EditState {
  note: Note
  type: string
  content: string
  preview: boolean
}

interface CreateState {
  type: string
  siteId: string
  content: string
  preview: boolean
}

function MarkdownView({ content }: { content: string }) {
  const trimmed = content.trim()
  // Render legacy JSON as markdown
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const md = jsonToMarkdown(parsed, 'note')
      return (
        <div className="md-content" style={{ fontSize: 13 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </div>
      )
    } catch { /* fall through */ }
  }
  return (
    <div className="md-content" style={{ fontSize: 13 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
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
  const [createState, setCreateState] = useState<CreateState | null>(null)
  const [sites, setSites] = useState<Site[]>([])
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

  useEffect(() => {
    doSearch('')
    API.sites.list().then(setSites).catch(() => {})
  }, [])

  function handleSearch() { doSearch(query) }
  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  function openEdit(note: Note) {
    setEditState({
      note,
      type: note.note_type || 'note',
      content: getEditableContent(note),
      preview: false,
    })
  }

  function openCreate() {
    setCreateState({ type: 'note', siteId: '', content: MARKDOWN_TEMPLATES.note, preview: false })
  }

  function switchCreateType(type: string) {
    if (!createState) return
    setCreateState({ ...createState, type, content: MARKDOWN_TEMPLATES[type] || '' })
  }

  function switchEditType(type: string) {
    if (!editState) return
    setEditState({ ...editState, type })
  }

  async function handleCreateNote() {
    if (!createState) return
    setSaving(true)
    try {
      if (createState.siteId) {
        await API.notes.createSite(createState.siteId, {
          note_type: createState.type,
          content: createState.content,
        })
      } else {
        await API.notes.create({
          note_type: createState.type,
          content: createState.content,
        })
      }
      toast('Note created')
      setCreateState(null)
      doSearch(query)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNote() {
    if (!editState) return
    setSaving(true)
    try {
      await API.notes.update(editState.note.id, {
        note_type: editState.type,
        content: editState.content,
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

  // Separate site notes from job notes
  const siteNotes = results.filter(n => n.site_id)
  const jobNotes  = results.filter(n => !n.site_id)

  // Group site notes by site
  const siteGroups: NoteGroup[] = []
  const siteOrder: string[] = []
  const siteMap: Record<string, NoteGroup> = {}
  for (const n of siteNotes) {
    const key = n.site_id!
    if (!siteMap[key]) {
      siteMap[key] = { site_id: n.site_id, site_name: (n as Note & { site_name?: string }).site_name, notes: [] }
      siteOrder.push(key)
    }
    siteMap[key].notes.push(n)
  }
  for (const k of siteOrder) siteGroups.push(siteMap[k])

  function renderNoteCard(n: Note) {
    const typeCfg = NOTE_TYPE_CONFIG[n.note_type || 'note'] || NOTE_TYPE_CONFIG.note
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
          marginBottom: 6, flexWrap: 'wrap', gap: 6,
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
            {(n as Note & { unit_asset_tag?: string; unit_id?: string }).unit_asset_tag && (
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
        <MarkdownView content={n.content || ''} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Notes</h1>
          <div className="page-subtitle">Search and manage notes across sites and jobs</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Note
        </button>
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
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            {results.length} note{results.length !== 1 ? 's' : ''} found
          </div>

          {/* Job-level notes */}
          {jobNotes.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: '.06em',
                marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6,
              }}>
                Job Notes
              </div>
              {jobNotes.map(renderNoteCard)}
            </div>
          )}

          {/* Site-grouped notes */}
          {siteGroups.map(group => (
            <div key={group.site_id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span
                  onClick={() => router.push(`/sites/${group.site_id}`)}
                  style={{ cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}
                >
                  {group.site_name || 'Unknown Site'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {group.notes.length} note{group.notes.length !== 1 ? 's' : ''}
                </span>
              </div>
              {group.notes.map(renderNoteCard)}
            </div>
          ))}
        </>
      )}

      {/* Create note modal */}
      {createState && (
        <Modal title="New Note" onClose={() => setCreateState(null)} maxWidth={580}>
          {/* Note type */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', marginBottom: 6 }}>
              Type
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(NOTE_TYPE_CONFIG).map(([val, cfg]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => switchCreateType(val)}
                  style={{
                    padding: '5px 10px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: createState.type === val ? 'var(--accent)' : 'transparent',
                    color: createState.type === val ? '#fff' : 'var(--text)',
                    borderColor: createState.type === val ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Site (optional) */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
              Site (optional — leave blank for job notes)
            </label>
            <select
              value={createState.siteId}
              onChange={e => setCreateState(s => s ? { ...s, siteId: e.target.value } : s)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">— No site (job note) —</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Markdown editor */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>
                Content (Markdown)
              </label>
              <button
                type="button"
                onClick={() => setCreateState(s => s ? { ...s, preview: !s.preview } : s)}
                style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 8px',
                  border: '1px solid var(--border)', borderRadius: 4,
                  background: createState.preview ? 'var(--accent)' : 'transparent',
                  color: createState.preview ? '#fff' : 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                {createState.preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {createState.preview ? (
              <div
                className="md-content"
                style={{
                  minHeight: 160, padding: '8px 12px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  background: 'var(--bg3)', fontSize: 13,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {createState.content || '*nothing yet*'}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                rows={10}
                value={createState.content}
                onChange={e => setCreateState(s => s ? { ...s, content: e.target.value } : s)}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder="Markdown supported…"
                autoFocus
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setCreateState(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateNote} disabled={saving}>
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit note modal */}
      {editState && (
        <Modal title="Edit Note" onClose={() => setEditState(null)} maxWidth={580}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            {editState.note.site_id
              ? (siteGroups.find(g => g.site_id === editState.note.site_id)?.site_name || 'Site note')
              : 'Job note'
            }
          </div>

          {/* Note type */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', marginBottom: 6 }}>
              Type
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(NOTE_TYPE_CONFIG).map(([val, cfg]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => switchEditType(val)}
                  style={{
                    padding: '5px 10px',
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
          </div>

          {/* Markdown editor */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>
                Content (Markdown)
              </label>
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
            </div>
            {editState.preview ? (
              <div
                className="md-content"
                style={{
                  minHeight: 160, padding: '8px 12px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  background: 'var(--bg3)', fontSize: 13,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editState.content || '*nothing yet*'}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                rows={12}
                value={editState.content}
                onChange={e => setEditState(s => s ? { ...s, content: e.target.value } : s)}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder="Markdown supported…"
                autoFocus
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
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
