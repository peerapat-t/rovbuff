"use client"
import Link from "next/link"
import SortableTable, { ColDef } from "@/components/SortableTable"
import HeroTag from "@/components/HeroTag"
import WinBadge from "@/components/WinBadge"
import type { PlayerGameRow } from "@/lib/types"
import { gameEndTime } from "@/lib/gameTime"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtDec = (n: number, d = 2) => n.toFixed(d)
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

type Row = PlayerGameRow & Record<string, unknown>

const COLS: ColDef<Row>[] = [
  { key: "result",         label: "Result",   align: "left",   sortable: false },
  { key: "hero_name",      label: "Hero",     align: "left",   sortable: false },
  { key: "end_ts",         label: "Date",     align: "left"   },
  { key: "kda",            label: "KDA",      align: "center" },
  { key: "kill",           label: "K",        align: "center" },
  { key: "death",          label: "D",        align: "center", defaultDir: "asc" },
  { key: "assist",         label: "A",        align: "center" },
  { key: "fantasy_score",  label: "Fantasy",  align: "center" },
  { key: "dmg_to_heroes",  label: "Dmg",      align: "center" },
  { key: "dmg_taken",      label: "Taken",    align: "center" },
  { key: "participation",  label: "Part%",    align: "center" },
  { key: "gold_tol",       label: "Gold",     align: "center" },
  { key: "gold_jungle",    label: "Jungle G", align: "center" },
  { key: "last_hit",       label: "LH",       align: "center" },
  { key: "dmg_disable",    label: "Disable",  align: "center" },
  { key: "dmg_heal",       label: "Heal",     align: "center" },
  { key: "dmg_to_tw",      label: "Tower",    align: "center" },
]

export default function MatchHistoryTable({ rows }: { rows: PlayerGameRow[] }) {
  const tableRows: Row[] = rows.map((r) => ({ ...r, end_ts: gameEndTime(r.datetime) })) as Row[]
  return (
    <div className="ui-table-shell">
      <SortableTable<Row>
        columns={COLS}
        rows={tableRows}
        defaultSort="end_ts"
        defaultDir="desc"
        rowKey={(r) => r.game_id}
        renderRow={(row) => (
          <>
            <td className="px-3 py-2">
              <Link
                href={`/match-history/${encodeURIComponent(row.game_id)}`}
                className="inline-flex"
                title={`Open match ${row.game_id}`}
              >
                <WinBadge result={row.result as "win" | "loss"} />
              </Link>
            </td>
            <td className="px-3 py-2"><HeroTag hero={row.hero_name} /></td>
            <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">{row.datetime}</td>
            <td className="px-3 py-2 text-center font-semibold" style={{ color: "#f59e0b" }}>{fmtDec(row.kda as number)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{row.kill as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{row.death as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{row.assist as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{row.fantasy_score as number}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmt(row.dmg_to_heroes as number)}</td>
            <td className="px-3 py-2 text-center text-gray-400">{fmt(row.dmg_taken as number)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmtPct(row.participation as number)}</td>
            <td className="px-3 py-2 text-center text-gray-300">{fmt(row.gold_tol as number)}</td>
            <td className="px-3 py-2 text-center text-gray-400">{fmt(row.gold_jungle as number)}</td>
            <td className="px-3 py-2 text-center text-gray-400">{row.last_hit as number}</td>
            <td className="px-3 py-2 text-center text-gray-400">{fmt(row.dmg_disable as number)}</td>
            <td className="px-3 py-2 text-center text-gray-400">{fmt(row.dmg_heal as number)}</td>
            <td className="px-3 py-2 text-center text-gray-400">{fmt(row.dmg_to_tw as number)}</td>
          </>
        )}
      />
    </div>
  )
}
