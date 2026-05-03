'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import type { CatalogWatch, WatchType } from '@/types/watch'

export const dynamic = 'force-dynamic'

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'list' | 'add' | 'import'
type ImportRow = Record<string, string> & { _id: string; _error?: string }

const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

const BLANK_FORM = {
  id: '', brand: '', model: '', reference: '',
  watch_type: 'Sport', case_size_mm: '', lug_width_mm: '',
  case_material: '', dial_color: '', movement: '',
  complications: '', estimated_value: '',
  dial_color_hex: '#1A1410', marker_color_hex: '#C8BCAF', hand_color_hex: '#FFFFFF',
}

// ─── CSV utilities ────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function autoId(row: ImportRow) {
  return [slugify(row.brand ?? ''), slugify(row.model ?? ''), slugify(row.reference ?? '')]
    .filter(Boolean).join('-')
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line, i) => {
    const values: string[] = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    values.push(cur.trim())
    const row: ImportRow = { _id: `row-${i}` }
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    if (!row.brand || !row.model || !row.reference) row._error = 'Missing brand, model, or reference'
    if (!row.id) row.id = autoId(row)
    if (row.complications) row.complications = row.complications.split('|').join(',')
    return row
  })
}

function parseJSON(text: string): ImportRow[] {
  try {
    const parsed = JSON.parse(text)
    const arr = Array.isArray(parsed) ? parsed : parsed.watches ?? []
    return arr.map((item: Record<string, unknown>, i: number) => {
      const row: ImportRow = { _id: `row-${i}` }
      for (const [k, v] of Object.entries(item)) {
        row[k] = String(v ?? '')
      }
      // normalise camelCase keys to snake_case for display
      if (!row.case_size_mm && item.caseSizeMm) row.case_size_mm = String(item.caseSizeMm)
      if (!row.watch_type && item.watchType) row.watch_type = String(item.watchType)
      if (!row.id) row.id = autoId(row)
      if (!row.brand || !row.model || !row.reference) row._error = 'Missing brand, model, or reference'
      return row
    })
  } catch {
    return []
  }
}

function importRowToPayload(row: ImportRow): Record<string, unknown> {
  const complications = (row.complications ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return {
    id: row.id || autoId(row),
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    case_size_mm: Number(row.case_size_mm || row.caseSizeMm || 0),
    lug_width_mm: row.lug_width_mm || row.lugWidthMm ? Number(row.lug_width_mm || row.lugWidthMm) : null,
    case_material: row.case_material || row.caseMaterial || '',
    dial_color: row.dial_color || row.dialColor || '',
    movement: row.movement || '',
    complications,
    estimated_value: Number(row.estimated_value || row.estimatedValue || 0),
    watch_type: row.watch_type || row.watchType || 'Sport',
    dial_color_hex: row.dial_color_hex || '#1A1410',
    marker_color_hex: row.marker_color_hex || '#C8BCAF',
    hand_color_hex: row.hand_color_hex || '#FFFFFF',
    source: 'import',
  }
}

const CSV_TEMPLATE = [
  'brand,model,reference,watch_type,case_size_mm,lug_width_mm,case_material,dial_color,movement,complications,estimated_value,dial_color_hex,marker_color_hex,hand_color_hex,id',
  'Rolex,Submariner,126610LN,Diver,41,20,Oystersteel,Black,Cal. 3235,Date,12500,#0B0F14,#C8BCAF,#FFFFFF,rolex-submariner-126610ln',
].join('\n')

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ children, ink }: { children: React.ReactNode; ink?: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: brand.radius.pill,
      fontSize: 10,
      fontFamily: brand.font.sans,
      fontWeight: 500,
      letterSpacing: '0.04em',
      background: ink ? brand.colors.ink : brand.colors.goldWash,
      color: ink ? brand.colors.bg : brand.colors.gold,
      border: `1px solid ${ink ? brand.colors.ink : brand.colors.goldLine}`,
    }}>
      {children}
    </span>
  )
}

function StaticBadge() {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: brand.radius.pill,
      fontSize: 9,
      fontFamily: brand.font.sans,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      background: brand.colors.slot,
      color: brand.colors.muted,
      border: `1px solid ${brand.colors.borderLight}`,
    }}>
      Built-in
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminCatalogPage() {
  const { user } = useAuth()
  const { dynamicWatches, allWatches, refresh } = useCatalog()
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importBusy, setImportBusy] = useState(false)
  const [importDone, setImportDone] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dynamicIds = new Set(dynamicWatches.map(w => w.id))
  const isStatic = (w: CatalogWatch) => !dynamicIds.has(w.id)

  const filtered = allWatches.filter(w => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [w.brand, w.model, w.reference, w.watchType].some(v => v?.toLowerCase().includes(q))
  })

  function openAdd() {
    setEditId(null)
    setForm({ ...BLANK_FORM })
    setFormError(null)
    setView('add')
  }

  function openEdit(w: CatalogWatch) {
    setEditId(w.id)
    setForm({
      id: w.id,
      brand: w.brand,
      model: w.model,
      reference: w.reference,
      watch_type: w.watchType,
      case_size_mm: String(w.caseSizeMm),
      lug_width_mm: w.lugWidthMm ? String(w.lugWidthMm) : '',
      case_material: w.caseMaterial,
      dial_color: w.dialColor,
      movement: w.movement,
      complications: w.complications.join(', '),
      estimated_value: String(w.estimatedValue),
      dial_color_hex: w.dialConfig.dialColor,
      marker_color_hex: w.dialConfig.markerColor,
      hand_color_hex: w.dialConfig.handColor,
    })
    setFormError(null)
    setView('add')
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormBusy(true)
    setFormError(null)
    const payload = {
      id: form.id || [slugify(form.brand), slugify(form.model), slugify(form.reference)].filter(Boolean).join('-'),
      brand: form.brand,
      model: form.model,
      reference: form.reference,
      watch_type: form.watch_type,
      case_size_mm: Number(form.case_size_mm),
      lug_width_mm: form.lug_width_mm ? Number(form.lug_width_mm) : null,
      case_material: form.case_material,
      dial_color: form.dial_color,
      movement: form.movement,
      complications: form.complications.split(',').map(s => s.trim()).filter(Boolean),
      estimated_value: Number(form.estimated_value || 0),
      watch_type_: form.watch_type,
      dial_color_hex: form.dial_color_hex,
      marker_color_hex: form.marker_color_hex,
      hand_color_hex: form.hand_color_hex,
      source: 'manual',
    }
    try {
      const url = editId ? `/api/admin/catalog/${editId}` : '/api/admin/catalog'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed') }
      await refresh()
      setView('list')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFormBusy(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/catalog/${id}`, { method: 'DELETE' })
    if (res.ok) { await refresh(); setDeleteConfirm(null) }
  }

  function handleFile(file: File) {
    setImportDone(null)
    setImportError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text)
      setImportRows(rows)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    const valid = importRows.filter(r => !r._error)
    if (!valid.length) return
    setImportBusy(true)
    setImportError(null)
    try {
      const res = await fetch('/api/admin/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watches: valid.map(importRowToPayload) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Import failed')
      setImportDone(j.imported)
      setImportRows([])
      await refresh()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setImportBusy(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'vwb-catalog-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <div style={{ padding: '120px 56px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          Sign in to access the catalog manager.
        </p>
        <Link href="/auth" style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.gold }}>Sign in →</Link>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md,
    padding: '9px 12px', fontFamily: brand.font.sans, fontSize: 13,
    color: brand.colors.ink, background: brand.colors.bg, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: brand.font.sans, fontSize: 10,
    fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: brand.colors.muted, marginBottom: 5,
  }

  return (
    <div style={{ padding: '48px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontFamily: brand.font.sans, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
            Admin
          </p>
          <h1 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink }}>
            Watch Catalog
          </h1>
          <p style={{ margin: '4px 0 0', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted }}>
            {allWatches.length} watches · {dynamicWatches.length} in Supabase
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/admin/images"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: brand.radius.md,
              fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500,
              letterSpacing: '0.04em', color: brand.colors.ink, textDecoration: 'none',
              border: `1px solid ${brand.colors.border}`, background: brand.colors.white,
            }}
          >
            → Images
          </Link>
          <button
            onClick={() => { setView(view === 'import' ? 'list' : 'import'); setImportRows([]); setImportDone(null) }}
            style={{
              padding: '9px 16px', borderRadius: brand.radius.md,
              fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500,
              letterSpacing: '0.04em', cursor: 'pointer',
              border: `1px solid ${brand.colors.border}`,
              background: view === 'import' ? brand.colors.ink : brand.colors.white,
              color: view === 'import' ? brand.colors.bg : brand.colors.ink,
            }}
          >
            Import File
          </button>
          <button
            onClick={openAdd}
            style={{
              padding: '9px 16px', borderRadius: brand.radius.md,
              fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500,
              letterSpacing: '0.04em', cursor: 'pointer',
              border: 'none',
              background: brand.colors.ink, color: brand.colors.bg,
            }}
          >
            + Add Watch
          </button>
        </div>
      </div>

      {/* ── Add / Edit form ── */}
      {view === 'add' && (
        <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, padding: '28px 32px', marginBottom: 28, boxShadow: brand.shadow.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 22, fontWeight: 400, color: brand.colors.ink }}>
              {editId ? 'Edit Watch' : 'Add Watch'}
            </h2>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: brand.colors.muted, padding: 4 }}>✕</button>
          </div>
          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { key: 'brand', label: 'Brand', required: true },
                { key: 'model', label: 'Model', required: true },
                { key: 'reference', label: 'Reference', required: true },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}{required && ' *'}</label>
                  <input
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label style={labelStyle}>Watch Type *</label>
                <select
                  value={form.watch_type}
                  onChange={e => setForm(f => ({ ...f, watch_type: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' as const }}
                >
                  {WATCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Case Size (mm) *</label>
                <input type="number" required value={form.case_size_mm} onChange={e => setForm(f => ({ ...f, case_size_mm: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Lug Width (mm)</label>
                <input type="number" value={form.lug_width_mm} onChange={e => setForm(f => ({ ...f, lug_width_mm: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Case Material</label>
                <input value={form.case_material} onChange={e => setForm(f => ({ ...f, case_material: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dial Color</label>
                <input value={form.dial_color} onChange={e => setForm(f => ({ ...f, dial_color: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Movement</label>
                <input value={form.movement} onChange={e => setForm(f => ({ ...f, movement: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Complications (comma-sep)</label>
                <input placeholder="Date, GMT" value={form.complications} onChange={e => setForm(f => ({ ...f, complications: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Est. Value ($)</label>
                <input type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Watch ID (auto-generated)</label>
                <input placeholder="auto" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} style={{ ...inputStyle, color: brand.colors.muted }} />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: 12 }}>
              {[
                { key: 'dial_color_hex', label: 'Dial Hex' },
                { key: 'marker_color_hex', label: 'Marker Hex' },
                { key: 'hand_color_hex', label: 'Hand Hex' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }} />
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 2 }}>{label}</label>
                    <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{form[key as keyof typeof form]}</span>
                  </div>
                </div>
              ))}
            </div>

            {formError && <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: '#D04040', marginTop: 12 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="submit"
                disabled={formBusy}
                style={{ padding: '10px 24px', borderRadius: brand.radius.md, border: 'none', background: formBusy ? brand.colors.muted : brand.colors.ink, color: brand.colors.bg, fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', cursor: formBusy ? 'not-allowed' : 'pointer' }}
              >
                {formBusy ? 'Saving…' : editId ? 'Save Changes' : 'Add to Catalog'}
              </button>
              <button type="button" onClick={() => setView('list')} style={{ padding: '10px 20px', borderRadius: brand.radius.md, border: `1px solid ${brand.colors.border}`, background: 'none', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Import panel ── */}
      {view === 'import' && (
        <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, padding: '28px 32px', marginBottom: 28, boxShadow: brand.shadow.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 22, fontWeight: 400, color: brand.colors.ink }}>Import from File</h2>
            <button onClick={downloadTemplate} style={{ background: 'none', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md, padding: '7px 14px', cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.04em' }}>
              ↓ Download CSV Template
            </button>
          </div>
          <p style={{ margin: '0 0 20px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.6 }}>
            Drop a <strong>CSV</strong> or <strong>JSON</strong> file. CSV must have a header row. Required columns: <code>brand</code>, <code>model</code>, <code>reference</code>, <code>watch_type</code>, <code>case_size_mm</code>. Use <code>|</code> to separate complications (e.g. <code>Date|GMT</code>). Existing entries are updated by ID.
          </p>

          {/* Drop zone */}
          {importRows.length === 0 && !importDone && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? brand.colors.gold : brand.colors.borderMid}`,
                borderRadius: brand.radius.lg, padding: '48px 32px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? brand.colors.goldWash : brand.colors.bg,
                transition: `border-color ${brand.transition.fast}, background ${brand.transition.fast}`,
              }}
            >
              <p style={{ margin: '0 0 6px', fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink }}>
                Drop CSV or JSON file here
              </p>
              <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>or click to browse</p>
              <input ref={fileInputRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}

          {/* Success */}
          {importDone !== null && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <p style={{ margin: '0 0 8px', fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink }}>
                {importDone} watches imported
              </p>
              <button onClick={() => { setImportDone(null); setView('list') }} style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.gold, background: 'none', border: 'none', cursor: 'pointer' }}>
                View catalog →
              </button>
            </div>
          )}

          {/* Preview table */}
          {importRows.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.ink }}>
                  {importRows.filter(r => !r._error).length} valid · {importRows.filter(r => r._error).length} errors
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setImportRows([])} style={{ padding: '7px 14px', borderRadius: brand.radius.md, border: `1px solid ${brand.colors.border}`, background: 'none', fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, cursor: 'pointer' }}>
                    Clear
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importBusy || importRows.every(r => r._error)}
                    style={{ padding: '7px 18px', borderRadius: brand.radius.md, border: 'none', background: importBusy ? brand.colors.muted : brand.colors.ink, color: brand.colors.bg, fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', cursor: importBusy ? 'not-allowed' : 'pointer' }}
                  >
                    {importBusy ? 'Importing…' : `Import ${importRows.filter(r => !r._error).length} watches`}
                  </button>
                </div>
              </div>
              {importError && <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: '#D04040', marginBottom: 10 }}>{importError}</p>}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: brand.font.sans, fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${brand.colors.border}` }}>
                      {['ID', 'Brand', 'Model', 'Reference', 'Type', 'Size', 'Value', 'Status'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10, color: brand.colors.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map(row => (
                      <tr key={row._id} style={{ borderBottom: `1px solid ${brand.colors.borderLight}`, background: row._error ? 'rgba(208,64,64,0.04)' : 'transparent' }}>
                        <td style={{ padding: '7px 10px', color: brand.colors.muted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.id}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 500 }}>{row.brand}</td>
                        <td style={{ padding: '7px 10px' }}>{row.model}</td>
                        <td style={{ padding: '7px 10px', color: brand.colors.muted }}>{row.reference}</td>
                        <td style={{ padding: '7px 10px' }}>{row.watch_type || row.watchType}</td>
                        <td style={{ padding: '7px 10px' }}>{row.case_size_mm || row.caseSizeMm}mm</td>
                        <td style={{ padding: '7px 10px' }}>{row.estimated_value ? `$${Number(row.estimated_value).toLocaleString()}` : '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {row._error
                            ? <span style={{ color: '#D04040', fontSize: 11 }}>✕ {row._error}</span>
                            : <span style={{ color: '#3A7D44', fontSize: 11 }}>✓ Ready</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Search + Table ── */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search brand, model, reference, or type…"
          style={{ ...inputStyle, maxWidth: 400 }}
        />
      </div>

      <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: brand.font.sans, fontSize: 13 }}>
          <thead>
            <tr style={{ background: brand.colors.slot, borderBottom: `1px solid ${brand.colors.border}` }}>
              {['Brand / Model', 'Reference', 'Type', 'Size', 'Est. Value', 'Source', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.muted, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => {
              const isBuiltin = isStatic(w)
              return (
                <tr key={w.id} style={{ borderBottom: `1px solid ${brand.colors.borderLight}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 2 }}>{w.brand}</div>
                    <div style={{ fontFamily: brand.font.serif, fontSize: 17, color: brand.colors.ink, lineHeight: 1.1 }}>{w.model}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: brand.colors.muted }}>{w.reference}</td>
                  <td style={{ padding: '10px 14px' }}><Pill>{w.watchType}</Pill></td>
                  <td style={{ padding: '10px 14px', color: brand.colors.ink }}>{w.caseSizeMm}mm</td>
                  <td style={{ padding: '10px 14px', fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.ink }}>
                    {w.estimatedValue > 0 ? `$${w.estimatedValue.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {isBuiltin ? <StaticBadge /> : <Pill ink>Catalog</Pill>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {!isBuiltin && (
                        <>
                          <button
                            onClick={() => openEdit(w)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, letterSpacing: '0.02em' }}
                          >
                            Edit
                          </button>
                          {deleteConfirm === w.id ? (
                            <span style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 12, color: '#D04040' }}>Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>Cancel</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteConfirm(w.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>Delete</button>
                          )}
                        </>
                      )}
                      <Link
                        href={`/admin/images?watchId=${w.id}`}
                        style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.gold, textDecoration: 'none', letterSpacing: '0.02em' }}
                      >
                        → Image
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted }}>
                  No watches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
