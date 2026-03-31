'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import { API } from '../api'
import { useToastFn } from '@/app/providers'

export interface ContactOption {
  id: string
  name: string
  email?: string
  phone?: string
}

interface ContactPickerProps {
  value: string
  onChange: (value: string) => void
  /** Called when a contact is picked from the list (includes email/phone for auto-fill) */
  onSelect?: (contact: ContactOption) => void
  placeholder?: string
  style?: CSSProperties
  required?: boolean
  autoFocus?: boolean
}

// Module-level cache shared across all picker instances
let _cache: ContactOption[] | null = null
let _loading: Promise<ContactOption[]> | null = null

async function loadContacts(): Promise<ContactOption[]> {
  if (_cache) return _cache
  if (!_loading) {
    _loading = API.contractors.list().then(cs => {
      _cache = (cs as ContactOption[])
        .map(c => ({ id: c.id, name: c.name || '', email: c.email, phone: c.phone }))
        .filter(c => c.name)
        .sort((a, b) => a.name.localeCompare(b.name))
      return _cache
    }).catch(() => {
      _loading = null
      return []
    })
  }
  return _loading
}

/** Adds a newly created contact into the module cache */
export function invalidateContactCache(contact?: ContactOption) {
  if (!_cache) return
  if (contact) {
    _cache = [..._cache.filter(c => c.id !== contact.id), contact]
      .sort((a, b) => a.name.localeCompare(b.name))
  } else {
    _cache = null
    _loading = null
  }
}

export function ContactPicker({
  value,
  onChange,
  onSelect,
  placeholder,
  style,
  required,
  autoFocus,
}: ContactPickerProps) {
  const toast = useToastFn()
  const [contacts, setContacts] = useState<ContactOption[]>(_cache ?? [])
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContacts().then(cs => setContacts(cs)).catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const trimmed = value.trim().toLowerCase()
  const filtered = trimmed
    ? contacts.filter(c => c.name.toLowerCase().includes(trimmed))
    : contacts
  const exactMatch = contacts.some(c => c.name.toLowerCase() === trimmed)

  function pick(contact: ContactOption) {
    onChange(contact.name)
    onSelect?.(contact)
    setOpen(false)
  }

  async function addNew() {
    const name = value.trim()
    if (!name) return
    setAdding(true)
    try {
      const created = await API.contractors.create({ name })
      const contact: ContactOption = {
        id: created.id,
        name: created.name || name,
        email: created.email,
        phone: created.phone,
      }
      invalidateContactCache(contact)
      setContacts(_cache ?? [])
      onChange(contact.name)
      onSelect?.(contact)
      setOpen(false)
      toast(`"${contact.name}" added — open Contractors to fill in details`)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setAdding(false)
    }
  }

  const showDropdown = open && (filtered.length > 0 || (!exactMatch && value.trim()))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        required={required}
        autoFocus={autoFocus}
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? 'Select or type a name…'}
        style={style}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: '0 6px 20px #0008',
          maxHeight: 220, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onMouseDown={e => { e.preventDefault(); pick(c) }}
              style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                color: 'var(--text1)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {c.name}
              {c.email && (
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                  {c.email}
                </span>
              )}
            </div>
          ))}
          {!exactMatch && value.trim() && (
            <div
              onMouseDown={e => { e.preventDefault(); addNew() }}
              style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                color: 'var(--accent)',
                borderTop: filtered.length ? '1px solid var(--border)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {adding ? 'Adding…' : `+ Add "${value.trim()}" as new contact`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
