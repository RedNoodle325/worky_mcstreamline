'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API } from '../api'
import { useToastFn } from '@/app/providers'
import { Modal } from '../components/Modal'
import type { BomImport, BomItem, Site } from '../types'

export function BOM() {
  const toast  = useToastFn()
  const router = useRouter()

  function goToTransfer(partNumber: string, description?: string) {
    const params = new URLSearchParams({ part: partNumber })
    if (description) params.set('desc', description)
    router.push(`/parts-transfer?${params}`)
  }

  const [imports, setImports] = useState<BomImport[]>([])
  const [loading, setLoading] = useState(true)
  const [partsQuery, setPartsQuery] = useState('')
  const [partsResults, setPartsResults] = useState<BomItem[]>([])
  const [partsSearched, setPartsSearched] = useState(false)
  const [selectedBom, setSelectedBom] = useState<{ id: string; label: string } | null>(null)
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [bomItemsLoading, setBomItemsLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSiteId, setImportSiteId] = useState('')
  const [importing, setImporting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadImports() {
    try {
      const data = await API.bom.list()
      setImports(data)
    } catch (e) {
      toast('Error: ' + (e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImports()
    API.sites.list().then(setSites).catch(() => {})
  }, [])

  function handlePartsSearch(q: string) {
    setPartsQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setPartsResults([])
      setPartsSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await API.bom.searchParts(q.trim())
        setPartsResults(results)
        setPartsSearched(true)
      } catch (e) {
        toast('Search error: ' + (e as Error).message, 'error')
      }
    }, 300)
  }

  async function viewBomItems(bom: BomImport) {
    setSelectedBom({ id: bom.id, label: bom.filename || bom.id })
    setBomItemsLoading(true)
    try {
      const items = await API.bom.getItems(bom.id)
      setBomItems(items)
    } catch (e) {
      toast('Error loading items: ' + (e as Error).message, 'error')
    } finally {
      setBomItemsLoading(false)
    }
  }

  async function handleImport() {
    if (!importFile) {
      toast('Please select a file', 'error')
      return
    }
    setImporting(true)
    try {
      await API.bom.import(importFile)
      toast('BOM imported successfully')
      setShowImportModal(false)
      setImportFile(null)
      setImportSiteId('')
      loadImports()
    } catch (e) {
      toast('Import failed: ' + (e as Error).message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>BOM / Parts</h1>
          <div className="page-subtitle">Glovia BOM imports and parts catalog</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
          Import BOM
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Parts search */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Parts Search</div>
          <div className="search-bar" style={{ marginBottom: 12 }}>
            <input
              placeholder="Part number or description…"
              value={partsQuery}
              onChange={e => handlePartsSearch(e.target.value)}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>UM</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!partsSearched && partsQuery.length < 2 ? (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text3)' }}>
                      {partsQuery.length === 0 ? 'Search above to find parts' : 'Type at least 2 characters…'}
                    </td>
                  </tr>
                ) : partsResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text3)' }}>No parts found</td>
                  </tr>
                ) : (
                  partsResults.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.part_number || '—'}</td>
                      <td style={{ fontSize: 12 }}>{p.description || '—'}</td>
                      <td style={{ fontSize: 12 }}>{p.unit || '—'}</td>
                      <td>
                        {p.part_number && (
                          <button className="btn btn-sm btn-secondary"
                            onClick={() => goToTransfer(p.part_number!, p.description)}>
                            Transfer →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOM imports list */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>BOM Imports</div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ color: 'var(--text3)', padding: 20 }}>Loading…</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Imported</th>
                    <th>Rows</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {imports.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: 'var(--text3)' }}>No BOMs imported yet</td>
                    </tr>
                  ) : (
                    imports.map(b => (
                      <tr key={b.id}>
                        <td
                          style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={b.filename}
                        >
                          {b.filename || '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {b.imported_at ? new Date(b.imported_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>{b.row_count ?? '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => viewBomItems(b)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* BOM items panel */}
      {selectedBom && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title">
              BOM: {selectedBom.label}
              {!bomItemsLoading && ` (${bomItems.length} items)`}
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSelectedBom(null)}
            >
              ✕ Close
            </button>
          </div>

          {bomItemsLoading ? (
            <div style={{ color: 'var(--text3)', padding: 20 }}>Loading items…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ color: 'var(--text3)' }}>No items</td>
                    </tr>
                  ) : (
                    bomItems.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.part_number || '—'}</td>
                        <td style={{ fontSize: 12 }}>{i.description || '—'}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{i.quantity ?? '—'}</td>
                        <td style={{ fontSize: 12 }}>{i.unit || '—'}</td>
                        <td style={{ fontSize: 12 }}>
                          {i.unit_price != null
                            ? `$${i.unit_price.toFixed(2)}`
                            : '—'
                          }
                        </td>
                        <td>
                          {i.part_number && (
                            <button className="btn btn-sm btn-secondary"
                              onClick={() => goToTransfer(i.part_number!, i.description)}>
                              Transfer →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showImportModal && (
        <Modal
          title="Import BOM CSV"
          onClose={() => { setShowImportModal(false); setImportFile(null); setImportSiteId('') }}
          maxWidth={480}
        >
          <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>
            Upload a BOM CSV file. Parts will be parsed and added to the catalog.
          </p>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>BOM File *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)}
              style={{ display: 'block', marginTop: 4 }}
            />
            {importFile && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                Selected: {importFile.name}
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Site (optional)</label>
            <select value={importSiteId} onChange={e => setImportSiteId(e.target.value)}>
              <option value="">— No site —</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowImportModal(false); setImportFile(null); setImportSiteId('') }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing || !importFile}
            >
              {importing ? 'Importing…' : 'Import BOM'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
