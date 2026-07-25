"use client"
import Link from "next/link"
import SortableTable, { ColDef } from "@/components/SortableTable"
import type { PlayerStats } from "@/lib/types"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtDec = (n: number, d = 2) => n.toFixed(d)
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

type Row = PlayerStats & Record<string, unknown>

const COLS: ColDef<Row>[] = [
  { key: "player_name",        label: "#  Player",         align: "left"   },
  { key: "games_played",       label: "GP",                align: "center" },
  { key: "wins",               label: "W",                 align: "center" },
  { key: "losses",             label: "L",                 align: "center" },
  { key: "win_rate",           label: "Win%",              align: "center" },
  { key: "avg_kda",            label: "KDA",               align: "center", defaultDir: "desc" },
  { key: "avg_kills",          label: "Avg K",             align: "center" },
  { key: "avg_deaths",         label: "Avg D",             align: "center", defaultDir: "asc"  },
  { key: "avg_assists",        label: "Avg A",             align: "center" },
  { key: "avg_fantasy_score",  label: "Fantasy",           align: "center" },
  { key: "avg_dmg_to_heroes",  label: "Dmg/G",             align: "center" },
  { key: "avg_dmg_taken",      label: "Taken/G",           align: "center", defaultDir: "asc" },
  { key: "avg_participation",  label: "Part%",             align: "center" },
  { key: "avg_gold_tol",       label: "Gold/G",            align: "center" },
  { key: "avg_gold_jungle",    label: "Jungle G/G",        align: "center" },
  { key: "avg_last_hit",       label: "LH/G",              align: "center" },
  { key: "avg_dmg_heal",       label: "Heal/G",            align: "center" },
  { key: "avg_dmg_disable",    label: "Disable/G",         align: "center" },
  { key: "avg_dmg_to_tw",      label: "Tower/G",           align: "center" },
]

export default function PlayerStatsTable({ players }: { players: PlayerStats[] }) {
  return (
    <div className="ui-table-shell">
      <SortableTable<Row>
        columns={COLS}
        rows={players as Row[]}
        defaultSort="avg_fantasy_score"
        defaultDir="desc"
        rowKey={(r) => r.player_name}
        renderRow={(p, i) => {
          const td = (content: React.ReactNode, center = false, extra = "") => (
            <td className={`px-4 py-3 ${center ? "text-center" : ""} ${extra}`}>{content}</td>
          )
          return (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                  <Link
                    href={`/player-stats/${encodeURIComponent(p.player_name)}`}
                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {p.player_name}
                  </Link>
                </div>
              </td>
              {td(p.games_played, true, "text-gray-300")}
              {td(<span className="text-green-400 font-semibold">{p.wins}</span>, true)}
              {td(<span className="text-red-400 font-semibold">{p.losses}</span>, true)}
              {td(
                <span className="font-semibold" style={{ color: p.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                  {fmtPct(p.win_rate)}
                </span>, true
              )}
              {td(<span className="font-bold" style={{ color: "#f59e0b" }}>{fmtDec(p.avg_kda)}</span>, true)}
              {td(<span className="text-gray-300">{fmtDec(p.avg_kills, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmtDec(p.avg_deaths, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmtDec(p.avg_assists, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmtDec(p.avg_fantasy_score, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(p.avg_dmg_to_heroes)}</span>, true)}
              {td(<span className="text-gray-400">{fmt(p.avg_dmg_taken)}</span>, true)}
              {td(<span className="text-gray-300">{fmtPct(p.avg_participation)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(p.avg_gold_tol)}</span>, true)}
              {td(<span className="text-gray-400">{fmt(p.avg_gold_jungle)}</span>, true)}
              {td(<span className="text-gray-400">{fmtDec(p.avg_last_hit, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(p.avg_dmg_heal)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(p.avg_dmg_disable)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(p.avg_dmg_to_tw)}</span>, true)}
            </>
          )
        }}
      />
    </div>
  )
}
