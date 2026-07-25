"use client"

import { useCallback, useEffect, useState } from "react"

type GameRecord = {
  game_id: string
  date_data_record: string
  game_datetime: string | null
  game_duration: string | null
  image_files: string[]
}

const PAGE_SIZE = 10

export default function MyGames({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setBulkConfirm(false)
    try {
      const res = await fetch("/api/extractor/history", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to load games")
      setRecords(data)
      setPage(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  function toggleOne(gameId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  async function confirmDelete(gameId: string) {
    setBusy(gameId)
    setError(null)
    try {
      const res = await fetch(`/api/extractor/games/${encodeURIComponent(gameId)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Delete failed")
      }
      setRecords((prev) => prev.filter((r) => r.game_id !== gameId))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(gameId)
        return next
      })
      setPendingDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function confirmBulkDelete() {
    setBulkBusy(true)
    setError(null)
    const ids = [...selected]
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await fetch(`/api/extractor/games/${encodeURIComponent(id)}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || id)
        }
        return id
      }),
    )
    const deleted = new Set<string>()
    const failed = new Set<string>()
    results.forEach((r, i) => {
      if (r.status === "fulfilled") deleted.add(ids[i])
      else failed.add(ids[i])
    })
    setRecords((prev) => prev.filter((r) => !deleted.has(r.game_id)))
    setSelected(failed) // keep only the games that failed to delete selected
    if (failed.size) setError(`Failed to delete ${failed.size} game(s). They are still selected — try again.`)
    setBulkConfirm(false)
    setBulkBusy(false)
  }

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading your matches…</p>
  }

  if (error) {
    return (
      <div className="ui-panel p-6 text-sm space-y-2" style={{ color: "var(--text-muted)" }}>
        <p style={{ color: "#fca5a5" }}>{error}</p>
        <p>If the OCR backend is down, start it with <code className="text-white">uvicorn api:app --port 8000</code> in <code className="text-white">apps/backend_ocr</code>.</p>
        <button onClick={load} className="ui-control mt-1 px-3 py-1.5 text-xs font-semibold">
          Retry
        </button>
      </div>
    )
  }

  if (!records.length) {
    return (
      <div className="ui-panel p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No matches uploaded yet. Switch to the <span className="text-white font-semibold">Upload Match</span> tab to add your first game.
      </div>
    )
  }

  const latest = records[0]?.date_data_record ?? "—"
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRecords = records.slice(pageStart, pageStart + PAGE_SIZE)
  const pageSelectedCount = pageRecords.filter((record) => selected.has(record.game_id)).length
  const allSelected = pageRecords.length > 0 && pageSelectedCount === pageRecords.length

  return (
    <div className="space-y-4">
      {/* summary card */}
      <div className="ui-panel p-5 flex items-center gap-6 flex-wrap">
        <div className="pl-4" style={{ borderLeft: "3px solid rgba(239,68,68,0.65)" }}>
          <div className="text-4xl font-black text-white tabular-nums">{records.length}</div>
          <div className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Uploaded matches
          </div>
        </div>
        <div className="pl-4" style={{ borderLeft: "1px solid var(--border)" }}>
          <div className="text-sm font-semibold text-white">{latest}</div>
          <div className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Last upload
          </div>
        </div>
      </div>

      {/* bulk-selection toolbar */}
      <div className="ui-card px-4 py-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
          <input type="checkbox" checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = pageSelectedCount > 0 && !allSelected }}
            onChange={() => setSelected((previous) => {
              const next = new Set(previous)
              for (const record of pageRecords) {
                if (allSelected) next.delete(record.game_id)
                else next.add(record.game_id)
              }
              return next
            })}
            className="w-4 h-4 accent-[var(--accent)] cursor-pointer" />
          Select page
        </label>

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {selected.size} selected
        </span>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {bulkConfirm ? (
              <>
                <span className="text-xs" style={{ color: "#fca5a5" }}>Delete {selected.size} game(s) permanently?</span>
                <button onClick={confirmBulkDelete} disabled={bulkBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "#ef4444" }}>
                  {bulkBusy ? "Deleting…" : "Confirm"}
                </button>
                <button onClick={() => setBulkConfirm(false)} disabled={bulkBusy}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setBulkConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: "#ef4444" }}>
                🗑️ Delete selected ({selected.size})
              </button>
            )}
          </div>
        )}
      </div>

      {pageRecords.map((rec) => (
        <div key={rec.game_id} className="ui-card ui-card-hover p-4 space-y-3"
          style={{ borderColor: selected.has(rec.game_id) ? "rgba(239,68,68,.5)" : "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm min-w-0 cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={selected.has(rec.game_id)}
                onChange={() => toggleOne(rec.game_id)}
                className="w-4 h-4 shrink-0 accent-[var(--accent)] cursor-pointer"
                aria-label={`Select game ${rec.game_id}`} />
              <span>
                <span className="font-mono text-white">{rec.game_id}</span>
                {"  ·  "}Played: {rec.game_datetime ?? "-"}
                {"  ·  "}⏱ {rec.game_duration ?? "-"}
                {"  ·  "}Recorded: {rec.date_data_record}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <a href={`/match-history/${encodeURIComponent(rec.game_id)}`}
                className="ui-control px-3 py-1.5 text-xs font-semibold hover:text-white">
                📊 Review game
              </a>

              {pendingDelete === rec.game_id ? (
                <>
                  <span className="text-xs" style={{ color: "#fca5a5" }}>Delete permanently?</span>
                  <button onClick={() => confirmDelete(rec.game_id)} disabled={busy === rec.game_id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: "#ef4444" }}>
                    {busy === rec.game_id ? "Deleting…" : "Confirm"}
                  </button>
                  <button onClick={() => setPendingDelete(null)} disabled={busy === rec.game_id}
                    className="ui-control px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setPendingDelete(rec.game_id)}
                  className="ui-control px-3 py-1.5 text-xs font-semibold hover:text-white">
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>

          {rec.image_files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {rec.image_files.slice(0, 4).map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f} src={`/api/extractor/images/${rec.game_id}/${f}`} alt={`Page ${i + 1}`}
                  className="rounded-lg w-full object-cover" style={{ border: "1px solid var(--border)" }} />
              ))}
            </div>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <nav className="ui-card px-4 py-3 flex items-center justify-between gap-3" aria-label="Match history pages">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="ui-control px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs tabular-nums text-center" style={{ color: "var(--text-muted)" }}>
            Page <span className="font-bold text-white">{currentPage}</span> of {totalPages}
            {" · "}
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, records.length)} of {records.length} games
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="ui-control px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  )
}
