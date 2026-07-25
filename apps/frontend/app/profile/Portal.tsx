"use client"

import { useState } from "react"
import UploadFlow from "./UploadFlow"
import MyGames from "./MyGames"
import PlayerSetup from "./PlayerSetup"
import CoachStyleSetup from "./CoachStyleSetup"

type Tab = "upload" | "games" | "players" | "coach"

export default function Portal() {
  const [tab, setTab] = useState<Tab>("upload")
  // Bumped after a successful upload so Match History refetches.
  const [refreshKey, setRefreshKey] = useState(0)

  const tabs: { id: Tab; label: string }[] = [
    { id: "upload", label: "⬆️ Upload Match" },
    { id: "games", label: "🎮 Match History" },
    { id: "players", label: "👤 Player Names" },
    { id: "coach", label: "🧠 Coach Style" },
  ]

  return (
    <div className="space-y-6">
      <div className="ui-panel">
        <div className="ui-panel-content flex gap-2 p-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
            style={tab === t.id
              ? { background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }
              : { background: "rgba(255,255,255,.02)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {t.label}
          </button>
        ))}
        </div>
      </div>

      {tab === "upload" && (
        <UploadFlow
          onSaved={() => setRefreshKey((k) => k + 1)}
          onViewGames={() => setTab("games")}
        />
      )}
      {tab === "games" && <MyGames refreshKey={refreshKey} />}
      {tab === "players" && <PlayerSetup />}
      {tab === "coach" && <CoachStyleSetup />}
    </div>
  )
}
