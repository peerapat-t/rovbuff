"use client"

import { useEffect, useMemo, useState } from "react"

type Row = Record<string, string | number | boolean | null>
type Tables = Record<string, Row[]>
type Meta = { keys: string[]; labels: string[]; captions: string[] }
type ExtractResult = { game_id: string; tables: Tables; meta: Meta }

type Phase = "upload" | "extracting" | "review" | "saving" | "saved"

const PAGE_CAPTIONS = [
  "Overview (K/D/A, score, items)",
  "Damage to heroes / taken",
  "Gold / jungle / last hits",
  "Disable / heal / tower dmg",
]
const PAGE_ICONS = ["📊", "⚔️", "💰", "🛡️"]

// Natural filename order maps selected images to page slots 1–4.
function naturalSort(files: File[]): File[] {
  const key = (name: string) =>
    name.split(/(\d+)/).map((part) => (/^\d+$/.test(part) ? part.padStart(12, "0") : part.toLowerCase()))
  return [...files].sort((a, b) => {
    const ka = key(a.name)
    const kb = key(b.name)
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
      const cmp = (ka[i] ?? "").localeCompare(kb[i] ?? "")
      if (cmp) return cmp
    }
    return 0
  })
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ phase }: { phase: Phase }) {
  const order = ["upload", "review", "saved"]
  const current =
    phase === "extracting" ? 0 : phase === "saving" ? 1 : order.indexOf(phase === "saved" ? "saved" : phase)
  const steps = ["1. Upload Match", "2. Review & Edit", "3. Saved"]
  return (
    <div className="ui-panel flex gap-2 mb-6 p-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex-1 text-center text-xs font-semibold rounded-lg py-2 px-2"
            style={{
              background: active ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,.02)",
              border: `1px solid ${active ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
              color: done ? "#22c55e" : active ? "#fca5a5" : "var(--text-muted)",
            }}>
            {done ? "✓ " : ""}{label}
          </div>
        )
      })}
    </div>
  )
}

// ── Editable table ──────────────────────────────────────────────────────────
function EditableTable({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  if (!rows.length) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No rows</p>
  const cols = Object.keys(rows[0])

  const update = (rowIdx: number, col: string, value: string) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r))
    onChange(next)
  }

  return (
    <div className="ui-table-shell overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--surface2)" }}>
            {cols.map((c) => (
              <th key={c} className="text-left px-2 py-2 font-bold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid var(--border)" }}>
              {cols.map((c) => (
                <td key={c} className="px-1 py-1">
                  <input
                    value={String(r[c] ?? "")}
                    onChange={(e) => update(ri, c, e.target.value)}
                    className="ui-input w-full min-w-[80px] px-2 py-1 text-xs"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main flow ──────────────────────────────────────────────────────────────
export default function UploadFlow({ onSaved, onViewGames }: { onSaved?: () => void; onViewGames?: () => void }) {
  const [phase, setPhase] = useState<Phase>("upload")
  // 4 images for one game, ordered Page 1-4 by filename (natural sort).
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [tables, setTables] = useState<Tables>({})
  const [activeTab, setActiveTab] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Full-size image shown in the lightbox overlay (null = closed).
  const [zoom, setZoom] = useState<string | null>(null)
  // Index of the slot currently being dragged (for swap-to-reorder).
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const allReady = files.length === 4
  const fileUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => {
    return () => {
      fileUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [fileUrls])

  const onPickFiles = (picked: FileList | null) => {
    if (!picked) return
    setFiles(naturalSort(Array.from(picked)).slice(0, 4))
  }

  // Swap two page slots (used by drag-and-drop reordering).
  const swap = (a: number, b: number) => {
    if (a === b) return
    setFiles((prev) => {
      const next = [...prev]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }

  const reset = () => {
    setPhase("upload")
    setFiles([])
    setResult(null)
    setTables({})
    setActiveTab(0)
    setError(null)
    setZoom(null)
  }

  async function extract() {
    setError(null)
    setPhase("extracting")
    const fd = new FormData()
    files.forEach((f, i) => fd.set(`page${i + 1}`, f))
    try {
      const res = await fetch("/api/extractor/extract", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Extraction failed")
      setResult(data)
      setTables(data.tables)
      setActiveTab(0)
      setPhase("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("upload")
    }
  }

  async function save() {
    if (!result || files.length !== 4) return
    setError(null)
    setPhase("saving")
    const fd = new FormData()
    fd.set("game_id", result.game_id)
    fd.set("tables", JSON.stringify(tables))
    files.forEach((f, i) => fd.set(`page${i + 1}`, f))
    try {
      const res = await fetch("/api/extractor/save", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Save failed")
      setPhase("saved")
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase("review")
    }
  }

  const meta = result?.meta

  return (
    <div>
      <Stepper phase={phase} />

      {error && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* ── Upload ─────────────────────────────────────── */}
      {(phase === "upload" || phase === "extracting") && (
        <div className="space-y-5">
          {/* single picker for all 4 images of one game */}
          <label className="ui-panel block p-6 cursor-pointer text-center border-dashed transition-colors hover:border-red-400/30 hover:bg-red-400/[.025]">
            <div className="text-3xl mb-1">🖼️</div>
            <div className="text-sm font-bold text-white">Select 4 match screenshots</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              They&apos;re ordered into Page 1-4 by filename — name them like 1.jpg / 2.jpg / 3.jpg / 4.jpg
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
              disabled={phase === "extracting"}
              onChange={(e) => onPickFiles(e.target.files)} />
          </label>

          {files.length > 0 && files.length !== 4 && (
            <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
              {files.length} image(s) selected — exactly 4 are required.
            </p>
          )}

          {files.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Drag a card onto another to swap which screenshot is Page 1-4. Click an image to enlarge.
            </p>
          )}

          {/* preview slots — drag to swap, click to enlarge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAGE_CAPTIONS.map((caption, i) => {
              const file = files[i]
              const src = fileUrls[i]
              const draggable = !!file && phase !== "extracting"
              return (
                <div key={i}
                  draggable={draggable}
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => { if (dragIndex !== null) e.preventDefault() }}
                  onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) swap(dragIndex, i); setDragIndex(null) }}
                  className="ui-card p-3 flex flex-col gap-2 transition-all"
                  style={{
                    cursor: draggable ? "grab" : "default",
                    outline: dragIndex === i ? "2px solid var(--accent)" : "none",
                    opacity: dragIndex === i ? 0.6 : 1,
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PAGE_ICONS[i]}</span>
                    <span className="text-sm font-bold text-white">Page {i + 1}</span>
                    <span className="text-[11px] leading-tight ml-1 truncate" style={{ color: "var(--text-muted)" }}>{caption}</span>
                  </div>
                  {file ? (
                    <>
                      <button type="button" onClick={() => setZoom(src)}
                        className="group relative block w-full h-56 rounded-lg overflow-hidden"
                        style={{ background: "var(--bg)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Page ${i + 1}`}
                          className="w-full h-full object-contain transition-opacity group-hover:opacity-90" />
                        <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-md bg-black/60 text-white">🔍 Expand</span>
                      </button>
                      <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{file.name}</span>
                    </>
                  ) : (
                    <div className="rounded-lg w-full h-56 flex items-center justify-center text-xs border border-dashed"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      waiting…
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={extract} disabled={!allReady || phase === "extracting"}
            className="btn-accent w-full px-5 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50">
            {phase === "extracting" ? "Extracting… (this can take ~30s)" : "🚀 Analyze this match"}
          </button>
        </div>
      )}

      {/* ── Review ─────────────────────────────────────── */}
      {(phase === "review" || phase === "saving") && result && meta && (
        <div className="space-y-5">
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Game ID: {result.game_id}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file, i) => {
              const src = fileUrls[i]
              return (
                <button key={`${file.name}-${i}`} type="button" onClick={() => setZoom(src)}
                  className="group relative block w-full h-56 rounded-lg overflow-hidden"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Page ${i + 1}`}
                    className="w-full h-full object-contain transition-opacity group-hover:opacity-90" />
                  <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-md bg-black/60 text-white">🔍 Expand</span>
                </button>
              )
            })}
          </div>

          {/* tabs */}
          <div className="ui-panel flex flex-wrap gap-1 p-2">
            {meta.keys.map((key, i) => (
              <button key={key} onClick={() => setActiveTab(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={i === activeTab
                  ? { background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }
                  : { background: "rgba(255,255,255,.02)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {meta.labels[i] ?? key}
              </button>
            ))}
          </div>

          {meta.keys[activeTab] && (
            <EditableTable
              rows={tables[meta.keys[activeTab]] ?? []}
              onChange={(rows) => setTables((prev) => ({ ...prev, [meta.keys[activeTab]]: rows }))}
            />
          )}

          <div className="flex gap-3">
            <button onClick={save} disabled={phase === "saving"}
              className="btn-accent flex-1 px-5 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50">
              {phase === "saving" ? "Saving…" : "✅ Save match data"}
            </button>
            <button onClick={reset} disabled={phase === "saving"}
              className="ui-control px-5 py-3 font-semibold text-sm disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Saved ──────────────────────────────────────── */}
      {phase === "saved" && result && (
        <div className="ui-panel p-8 text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-white">Match data saved</h2>
          <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Game ID: {result.game_id}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            It now appears in your coach tools and match history.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={reset} className="btn-accent px-6 py-2.5 rounded-xl font-bold text-white text-sm">
              📄 Upload another match
            </button>
            <button onClick={onViewGames} className="ui-control px-6 py-2.5 font-semibold text-sm">
              View match history
            </button>
          </div>
        </div>
      )}

      {/* ── Lightbox overlay ──────────────────────────────── */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Expanded screenshot"
            className="max-w-full max-h-full rounded-lg object-contain"
            style={{ boxShadow: "0 0 60px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setZoom(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full text-white text-xl font-bold"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
