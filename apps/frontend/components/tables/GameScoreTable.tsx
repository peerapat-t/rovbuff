"use client"
import Link from "next/link"
import SortableTable, { ColDef } from "@/components/SortableTable"
import HeroTag from "@/components/HeroTag"
import type { GamePlayerDetail } from "@/lib/types"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtDec = (n: number, d = 2) => n.toFixed(d)
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

type Row = GamePlayerDetail & { kda: number } & Record<string, unknown>

const COLS: ColDef<Row>[] = [
  { key: "player_name",    label: "Player",    align: "left",   sortable: false },
  { key: "hero_name",      label: "Hero",      align: "left",   sortable: false },
  { key: "kda",            label: "KDA",       align: "center" },
  { key: "kill",           label: "K",         align: "center" },
  { key: "death",          label: "D",         align: "center", defaultDir: "asc" },
  { key: "assist",         label: "A",         align: "center" },
  { key: "fantasy_score",  label: "Fantasy",   align: "center" },
  { key: "dmg_to_heroes",  label: "Dmg",       align: "center" },
  { key: "dmg_taken",      label: "Taken",     align: "center" },
  { key: "participation",  label: "Part%",     align: "center" },
  { key: "gold_tol",       label: "Gold",      align: "center" },
  { key: "gold_jungle",    label: "Jungle G",  align: "center" },
  { key: "last_hit",       label: "LH",        align: "center" },
  { key: "dmg_disable",    label: "Disable",   align: "center" },
  { key: "dmg_heal",       label: "Heal",      align: "center" },
  { key: "dmg_to_tw",      label: "Tower",     align: "center" },
]

interface Props {
  players: GamePlayerDetail[]
  won: boolean
}

export default function GameScoreTable({ players, won }: Props) {
  const rows: Row[] = players.map((p) => ({
    ...p,
    kda: p.death === 0 ? p.kill + p.assist : (p.kill + p.assist) / p.death,
  })) as Row[]

  const nameColor = won ? "#86efac" : "#fca5a5"

  return (
    <div className="ui-table-shell" style={{ borderColor: won ? "rgba(34,197,94,0.38)" : "rgba(239,68,68,0.38)" }}>
      <SortableTable<Row>
        columns={COLS}
        rows={rows}
        defaultSort="fantasy_score"
        defaultDir="desc"
        rowKey={(r) => r.player_name}
        renderRow={(p) => (
          <>
            <td className="px-3 py-2">
              <Link
                href={`/player-stats/${encodeURIComponent(p.player_name)}`}
                className="font-semibold hover:text-white transition-colors"
                style={{ color: nameColor }}
              >
                {p.player_name}
              </Link>
            </td>
            <td className="px-3 py-2"><HeroTag hero={p.hero_name} /></td>
            <td className="px-3 py-2 text-center font-bold" style={{ color: "#f59e0b" }}>{fmtDec(p.kda)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{p.kill as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{p.death as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{p.assist as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{p.fantasy_score as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmt(p.dmg_to_heroes as number)}</td>
            <td className="px-3 py-2 text-center text-gray-500">{fmt(p.dmg_taken as number)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmtPct(p.participation as number)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmt(p.gold_tol as number)}</td>
            <td className="px-3 py-2 text-center text-gray-500">{fmt(p.gold_jungle as number)}</td>
            <td className="px-3 py-2 text-center text-gray-500">{p.last_hit as number}</td>
            <td className="px-3 py-2 text-center text-gray-500">{fmt(p.dmg_disable as number)}</td>
            <td className="px-3 py-2 text-center text-gray-500">{fmt(p.dmg_heal as number)}</td>
            <td className="px-3 py-2 text-center text-gray-500">{fmt(p.dmg_to_tw as number)}</td>
          </>
        )}
      />
    </div>
  )
}
