"use client"
import { useState } from "react"
import HeroTag from "@/components/HeroTag"
import type { PayoffRow } from "@/lib/types"

interface Props {
  allRows: PayoffRow[]
  selectedHero: string   // controlled by parent page filter
}

const TOP_N_OPTIONS = [
  { label: "Top 5",  value: 5  },
  { label: "Top 10", value: 10 },
  { label: "All",    value: 0  },
]

function MatchupTable({ rows, favorable, topN }: { rows: PayoffRow[]; favorable: boolean; topN: number }) {
  const sorted = [...rows].sort((a, b) =>
    favorable
      ? (b.win_pct_vs - a.win_pct_vs) || (b.games_vs - a.games_vs)
      : (a.win_pct_vs - b.win_pct_vs) || (b.games_vs - a.games_vs)
  )
  const shown = topN === 0 ? sorted : sorted.slice(0, topN)

  const borderColor = favorable ? "#1f3a33" : "#3f2230"
  const headerBg   = favorable ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"
  const headerText = favorable ? "#9ed8b5" : "#e1a1aa"
  const rowBg0 = favorable ? "#0d1719" : "#171119"
  const rowBg1 = favorable ? "#0a1316" : "#140e15"
  const winColor = favorable ? "#9ed8b5" : "#b9c2d6"
  const lossColor = favorable ? "#b9c2d6" : "#e1a1aa"

  return (
    <div className="ui-table-shell" style={{ borderColor }}>
      <div className="px-4 py-2 text-sm font-bold flex items-center justify-between"
        style={{ background: headerBg }}>
        <span style={{ color: headerText }}>{favorable ? "✅ Strong Against" : "⚠️ Weak Against"}</span>
        <span className="font-normal text-xs opacity-60">{shown.length} / {sorted.length}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
            <th className="px-3 py-2 text-left   text-xs font-semibold text-gray-400">Enemy Hero</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400"># Match</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400">% Win</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400">% Loss</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={row.enemy_hero} className="border-t" style={{
              borderColor: "var(--border)",
              background: favorable
                ? i % 2 === 0 ? rowBg0 : rowBg1
                : i % 2 === 0 ? rowBg0 : rowBg1,
            }}>
              <td className="px-3 py-2"><HeroTag hero={row.enemy_hero} /></td>
              <td className="px-3 py-2 text-center text-gray-300">{row.games_vs}</td>
              <td className="px-3 py-2 text-center font-semibold" style={{ color: winColor }}>{row.win_pct_vs.toFixed(1)}%</td>
              <td className="px-3 py-2 text-center font-semibold" style={{ color: lossColor }}>{row.loss_pct_vs.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PayoffSection({ allRows, selectedHero }: Props) {
  const [topN, setTopN] = useState(5)

  const filtered = allRows.filter((r) => r.own_hero === selectedHero)
  const byWin = filtered

  const btnBase: React.CSSProperties = {
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    padding: "4px 12px", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
  }

  return (
    <div className="space-y-4">
      {/* Top N only */}
      <div className="ui-panel"><div className="relative z-10 p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Show:</span>
        {TOP_N_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTopN(opt.value)}
            style={{
              ...btnBase,
              background: topN === opt.value ? "rgba(56,189,248,.14)" : "var(--surface2)",
              borderColor: topN === opt.value ? "rgba(56,189,248,.55)" : "var(--border)",
              color:       topN === opt.value ? "#fff"    : "var(--text-muted)",
            }}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
          {filtered.length} total matchups
        </span>
      </div></div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MatchupTable rows={byWin} favorable={true}  topN={topN} />
        <MatchupTable rows={byWin} favorable={false} topN={topN} />
      </div>

    </div>
  )
}
