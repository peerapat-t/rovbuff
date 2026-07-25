"use client"
import Link from "next/link"
import SortableTable, { ColDef } from "@/components/SortableTable"
import HeroTag from "@/components/HeroTag"
import type { HeroMetaStat } from "@/lib/types"

const fmt  = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtD = (n: number, d = 2) => n.toFixed(d)
const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

const COLS: ColDef<HeroMetaStat & Record<string, unknown>>[] = [
  { key: "hero_name",        label: "Hero",      align: "left",   sortable: false },
  { key: "games_played",     label: "GP",        align: "center" },
  { key: "wins",             label: "W",         align: "center" },
  { key: "losses",           label: "L",         align: "center" },
  { key: "win_rate",         label: "Win%",      align: "center", defaultDir: "desc" },
  { key: "avg_fantasy",      label: "Fantasy",   align: "center", defaultDir: "desc" },
  { key: "avg_kda",          label: "KDA",       align: "center", defaultDir: "desc" },
  { key: "avg_kills",        label: "Avg K",     align: "center", defaultDir: "desc" },
  { key: "avg_deaths",       label: "Avg D",     align: "center", defaultDir: "asc"  },
  { key: "avg_assists",      label: "Avg A",     align: "center", defaultDir: "desc" },
  { key: "avg_dmg",          label: "Dmg/G",     align: "center", defaultDir: "desc" },
  { key: "avg_participation",label: "Part%",     align: "center", defaultDir: "desc" },
  { key: "avg_gold",         label: "Gold/G",    align: "center", defaultDir: "desc" },
]

type Row = HeroMetaStat & Record<string, unknown>

export default function HeroMetaTable({ heroes }: { heroes: HeroMetaStat[] }) {
  return (
    <div className="ui-table-shell">
      <SortableTable<Row>
        columns={COLS}
        rows={heroes as Row[]}
        defaultSort="games_played"
        defaultDir="desc"
        rowKey={r => r.hero_name}
        renderRow={(h, i) => {
          const td = (content: React.ReactNode, center = false) => (
            <td className={`px-4 py-3 ${center ? "text-center" : ""}`}>{content}</td>
          )
          return (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                  <Link href={`/all-heroes/${encodeURIComponent(h.hero_name)}`} className="hover:opacity-80 transition-opacity">
                    <HeroTag hero={h.hero_name} link={false} />
                  </Link>
                </div>
              </td>
              {td(h.games_played, true)}
              {td(<span className="text-green-400 font-semibold">{h.wins}</span>, true)}
              {td(<span className="text-red-400 font-semibold">{h.losses}</span>, true)}
              {td(
                <span className="font-semibold" style={{ color: h.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                  {fmtP(h.win_rate)}
                </span>, true
              )}
              {td(<span className="text-yellow-400 font-semibold">{fmtD(h.avg_fantasy, 1)}</span>, true)}
              {td(<span className="font-bold" style={{ color: "#f59e0b" }}>{fmtD(h.avg_kda)}</span>, true)}
              {td(<span className="text-gray-300">{fmtD(h.avg_kills, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmtD(h.avg_deaths, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmtD(h.avg_assists, 1)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(h.avg_dmg)}</span>, true)}
              {td(<span className="text-gray-300">{fmtP(h.avg_participation)}</span>, true)}
              {td(<span className="text-gray-300">{fmt(h.avg_gold)}</span>, true)}
            </>
          )
        }}
      />
    </div>
  )
}
