"use client"

import { useState } from "react"
import type { HeroMetaStat } from "@/lib/types"
import HeroMetaChart from "@/components/HeroMetaChart"
import HeroMetaTable from "@/components/tables/HeroMetaTable"

type RankView = "chart" | "table"

export default function HeroMetaView({
  heroes,
}: {
  heroes: HeroMetaStat[]
}) {
  const [rankView, setRankView] = useState<RankView>("chart")

  return (
    <div className="space-y-5">
      <div className="ui-panel inline-flex p-1.5 gap-1">
        <button onClick={() => setRankView("chart")} className="relative z-10 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: rankView === "chart" ? "rgba(168,85,247,.16)" : "transparent", border: `1px solid ${rankView === "chart" ? "rgba(168,85,247,.55)" : "transparent"}`, color: rankView === "chart" ? "#fff" : "var(--text-muted)" }}>
          Chart
        </button>
        <button onClick={() => setRankView("table")} className="relative z-10 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: rankView === "table" ? "rgba(168,85,247,.16)" : "transparent", border: `1px solid ${rankView === "table" ? "rgba(168,85,247,.55)" : "transparent"}`, color: rankView === "table" ? "#fff" : "var(--text-muted)" }}>
          Table
        </button>
      </div>
      {rankView === "chart" ? (
        <HeroMetaChart heroes={heroes} />
      ) : (
        <HeroMetaTable heroes={heroes} />
      )}
    </div>
  )
}
