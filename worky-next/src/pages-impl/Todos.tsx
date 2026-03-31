'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { Site, Todo } from '../types'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#dc2626' },
  high:   { label: 'High',   color: '#ea580c' },
  normal: { label: 'Normal', color: '#2563eb' },
  low:    { label: 'Low',    color: '#6b7280' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo:        { label: 'To Do',       color: '#6b7280' },
  in_progress: { label: 'In Progress', color: '#d97706' },
  done:        { label: 'Done',        color: '#16a34a' },
}

type StatusFilter = '' | 'todo' | 'in_progress' | 'done'

interface TodoForm {
  title: string
  description: string
  priority: string
  status: string
  due_date: string
  site_id: string
}

const EMPTY_FORM: TodoForm = {
  title: '', description: '', priority: 'normal', status: 'todo', due_date: '', site_id: '',
}

export function Todos() {
  const toast = useToastFn()

  const [todos, setTodos] = useState<Todo[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [modalTodo, setModalTodo] = useState<Todo | null | 'new'>(null)
  const [form, setForm] = useState<TodoForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, string> = statusFilter ? { status: statusFilter } : {}
      const [data, siteData] = await Promise.all([
        API.todos.list(params),
        API.sites.list(),
      ])
      setTodos(data)
      setSites(siteData)
    } catch (e) {
      toast('Failed to load todos: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  function siteName(id?: string) {
    return id ? (sites.find(s => s.id === id)?.name || '—') : null
  }

  async function toggleDone(todo: Todo, checked: boolean) {
    try {
      const updated = await API.todos.update(todo.id, { status: checked ? 'done' : 'todo' })
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  function openModal(todo: Todo | null) {
    setModalTodo(todo ?? 'new')
    if (todo) {
      setForm({
        title:       todo.title,
        description: todo.description ?? '',
        priority:    todo.priority ?? 'normal',
        status:      todo.status ?? 'todo',
        due_date:    todo.due_date?.slice(0, 10) ?? '',
        site_id:     todo.site_id ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast('Title is required', 'error')
      return
    }
    setSaving(true)
    const data: Partial<Todo> = {
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      priority:    form.priority || undefined,
      status:      form.status,
      due_date:    form.due_date || undefined,
      site_id:     form.site_id || undefined,
    }
    try {
      if (modalTodo && modalTodo !== 'new') {
        const updated = await API.todos.update(modalTodo.id, data)
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
        toast('Task saved')
      } else {
        const created = await API.todos.create(data)
        setTodos(prev => [created, ...prev])
        toast('Task added')
      }
      setModalTodo(null)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (modalTodo === 'new' || !modalTodo) return
    if (!confirm('Delete this task?')) return
    try {
      await API.todos.delete(modalTodo.id)
      setTodos(prev => prev.filter(t => t.id !== (modalTodo as Todo).id))
      setModalTodo(null)
      toast('Task deleted')
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    }
  }

  const FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'All',         value: '' },
    { label: 'To Do',       value: 'todo' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done',        value: 'done' },
  ]

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>To-Do</h1>
          <div className="page-subtitle">Personal task list</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openModal(null)}>
          + New Task
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`btn btn-secondary btn-sm${statusFilter === f.value ? ' active' : ''}`}
            style={statusFilter === f.value ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : todos.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>
          No tasks yet. Add one!
        </div>
      ) : (
        <div>
          {todos.map(t => {
            const pri = PRIORITY_CONFIG[t.priority ?? 'normal'] ?? PRIORITY_CONFIG.normal
            const st  = STATUS_CONFIG[t.status ?? 'todo'] ?? STATUS_CONFIG.todo
            const site = siteName(t.site_id)
            const due = t.due_date ? new Date(t.due_date.slice(0, 10) + 'T12:00:00') : null
            const overdue = due && due < new Date() && t.status !== 'done'

            return (
              <div
                key={t.id}
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${pri.color}`,
                  borderRadius: 8, padding: '12px 14px', marginBottom: 8,
                  background: 'var(--bg2)',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  opacity: t.status === 'done' ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={e => toggleDone(t, e.target.checked)}
                  style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 600,
                      textDecoration: t.status === 'done' ? 'line-through' : undefined,
                      color: t.status === 'done' ? 'var(--text3)' : undefined,
                    }}>
                      {t.title}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: st.color,
                      background: `${st.color}18`, border: `1px solid ${st.color}44`,
                      borderRadius: 99, padding: '1px 7px',
                    }}>
                      {st.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: pri.color,
                      background: `${pri.color}18`, border: `1px solid ${pri.color}44`,
                      borderRadius: 99, padding: '1px 7px',
                    }}>
                      {pri.label}
                    </span>
                  </div>

                  {t.description && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                      {t.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text3)' }}>
                    {site && t.site_id && (
                      <span>
                        <Link href={`/sites/${t.site_id}`}
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {site}
                        </Link>
                      </span>
                    )}
                    {due && (
                      <span style={{ color: overdue ? 'var(--red)' : 'var(--text3)' }}>
                        {overdue ? 'Overdue · ' : ''}
                        {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => openModal(t)}
                  style={{ flexShrink: 0 }}
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalTodo !== null && (
        <Modal
          title={modalTodo === 'new' ? 'New Task' : 'Edit Task'}
          onClose={() => setModalTodo(null)}
          maxWidth={480}
        >
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Task *</label>
            <input
              required autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Complete MSOW for QTS Chicago"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Details</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional notes…"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Site (optional)</label>
              <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— Not site-specific —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {modalTodo !== 'new' ? (
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--red)' }}
                onClick={handleDelete}
              >
                Delete
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setModalTodo(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modalTodo === 'new' ? 'Add Task' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
