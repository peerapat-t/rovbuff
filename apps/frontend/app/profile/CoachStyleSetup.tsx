"use client"

import { useEffect, useState } from "react"

type CoachStyleOption = {
  id: string
  label: string
  subtitle: string
  body: string
}

type CoachStyleResponse = {
  coachStyle: string
  options: CoachStyleOption[]
  detail?: string
}

export default function CoachStyleSetup() {
  const [selected, setSelected] = useState<string | null>(null)
  const [options, setOptions] = useState<CoachStyleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/profile/coach-style", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as CoachStyleResponse
        if (!response.ok) throw new Error(data.detail || "Could not load your coach settings")
        return data
      })
      .then((data) => {
        setSelected(data.coachStyle)
        setOptions(data.options)
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not load your coach settings")
      })
      .finally(() => setLoading(false))
  }, [])

  async function choose(style: string) {
    setSelected(style)
    setSaving(style)
    setStatus(null)
    setError(null)
    try {
      const res = await fetch("/api/profile/coach-style", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coachStyle: style }),
      })
      const data = await res.json() as CoachStyleResponse
      if (!res.ok) throw new Error(data.detail || "Save failed")
      setSelected(data.coachStyle)
      setOptions(data.options)
      setStatus(`Your coach is set to ${data.options.find((item) => item.id === data.coachStyle)?.label ?? data.coachStyle}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="ui-panel">
        <div className="ui-panel-content p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-base font-bold text-white">Personal coach style</span>
          <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
            Coach Chat
          </span>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((style) => {
              const active = selected === style.id
              const busy = saving === style.id
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => choose(style.id)}
                  disabled={saving !== null}
                  className="ui-card ui-card-hover text-left p-4 disabled:opacity-60"
                  style={{
                    background: active ? "rgba(239,68,68,0.10)" : "rgba(2,4,12,.35)",
                    borderColor: active ? "rgba(239,68,68,0.38)" : "var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">{style.label}</div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{style.subtitle}</div>
                    </div>
                    <span
                      className="rounded px-2 py-1 text-[10px] font-black uppercase"
                      style={{
                        background: active ? "rgba(239,68,68,.16)" : "rgba(255,255,255,0.04)",
                        color: active ? "#fca5a5" : "var(--text-muted)",
                        border: `1px solid ${active ? "rgba(239,68,68,.3)" : "var(--border)"}`,
                      }}
                    >
                      {busy ? "Saving" : active ? "Active" : "Select"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
                    {style.body}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {status && <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>{status}</p>}
        {error && <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}
