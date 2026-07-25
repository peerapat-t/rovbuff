"use client"

import { useEffect, useState } from "react"

export default function PlayerSetup() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/extractor/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.players)) setText(d.players.join("\n")) })
      .catch(() => setError("Could not load the saved list (is the backend running?)"))
      .finally(() => setLoading(false))
  }, [])

  const names = text.split("\n").map((l) => l.trim()).filter(Boolean)

  async function save() {
    setSaving(true)
    setStatus(null)
    setError(null)
    try {
      const res = await fetch("/api/extractor/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ players: names }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Save failed")
      setStatus(`Saved ${data.count ?? names.length} name(s) to your profile`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="ui-panel">
        <div className="ui-panel-content p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span className="text-base font-bold text-white">Recognized player names</span>
          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{names.length} name(s)</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Add your in-game name first, plus any teammates or opponents you want the OCR to recognize accurately.
          Use one name per line. The list is saved to <strong className="text-white">your profile</strong> and used
          as ground truth on every extraction, so each account keeps its own match data clean.
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={"@player1\n@player2\n…"}
            className="ui-input w-full px-3 py-2 text-sm font-mono"
          />
        )}

        {status && <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>{status}</p>}
        {error && <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>{error}</p>}

        <button onClick={save} disabled={saving || loading}
          className="btn-accent px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50">
          {saving ? "Saving…" : "💾 Save names"}
        </button>
        </div>
      </div>
    </div>
  )
}
