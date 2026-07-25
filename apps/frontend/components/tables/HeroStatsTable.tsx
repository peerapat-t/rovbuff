"use client"
import SortableTable, { ColDef } from "@/components/SortableTable"
import HeroTag from "@/components/HeroTag"

export interface HeroStat {
  hero: string
  gp: number
  wins: number
  losses: number
  win_rate: number
  avg_kill: number
  avg_death: number
  avg_assist: number
  avg_kda: number
  avg_fantasy: number
  avg_golds: number
  avg_dmg: number
  avg_dmg_taken: number
  avg_participation: number
  avg_gold_jungle: number
  avg_last_hit: number
  avg_dmg_disable: number
  avg_dmg_heal: number
  avg_dmg_to_tw: number
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtDec = (n: number, d = 2) => n.toFixed(d)
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

type Row = HeroStat & Record<string, unknown>

const COLS: ColDef<Row>[] = [
  { key: "hero",             label: "Hero",        align: "left",   sortable: false },
  { key: "gp",              label: "GP",           align: "center" },
  { key: "wins",            label: "W",            align: "center" },
  { key: "losses",          label: "L",            align: "center", defaultDir: "asc" },
  { key: "win_rate",        label: "Win%",         align: "center" },
  { key: "avg_kda",         label: "Avg KDA",      align: "center" },
  { key: "avg_kill",        label: "Avg K",        align: "center" },
  { key: "avg_death",       label: "Avg D",        align: "center", defaultDir: "asc" },
  { key: "avg_assist",      label: "Avg A",        align: "center" },
  { key: "avg_fantasy",     label: "Fantasy",      align: "center" },
  { key: "avg_dmg",         label: "Dmg",          align: "center" },
  { key: "avg_dmg_taken",   label: "Taken",        align: "center", defaultDir: "asc" },
  { key: "avg_participation",label: "Part%",       align: "center" },
  { key: "avg_golds",       label: "Gold",         align: "center" },
  { key: "avg_gold_jungle", label: "Jungle G",     align: "center" },
  { key: "avg_last_hit",    label: "LH",           align: "center" },
  { key: "avg_dmg_disable", label: "Disable",      align: "center" },
  { key: "avg_dmg_heal",    label: "Heal",         align: "center" },
  { key: "avg_dmg_to_tw",   label: "Tower",        align: "center" },
]

export default function HeroStatsTable({ rows }: { rows: HeroStat[] }) {
  return (
    <div className="ui-table-shell">
      <SortableTable<Row>
        columns={COLS}
        rows={rows as Row[]}
        defaultSort="gp"
        defaultDir="desc"
        rowKey={(r) => r.hero}
        renderRow={(h) => (
          <>
            <td className="px-4 py-3"><HeroTag hero={h.hero} /></td>
            <td className="px-4 py-3 text-center font-semibold text-gray-300">{h.gp}</td>
            <td className="px-4 py-3 text-center font-semibold text-green-400">{h.wins}</td>
            <td className="px-4 py-3 text-center font-semibold text-red-400">{h.losses}</td>
            <td className="px-4 py-3 text-center font-semibold" style={{ color: h.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
              {fmtPct(h.win_rate)}
            </td>
            <td className="px-4 py-3 text-center font-bold" style={{ color: "#f59e0b" }}>{fmtDec(h.avg_kda)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmtDec(h.avg_kill, 1)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmtDec(h.avg_death, 1)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmtDec(h.avg_assist, 1)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmtDec(h.avg_fantasy, 1)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmt(h.avg_dmg)}</td>
            <td className="px-4 py-3 text-center text-gray-400">{fmt(h.avg_dmg_taken)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmtPct(h.avg_participation)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmt(h.avg_golds)}</td>
            <td className="px-4 py-3 text-center text-gray-400">{fmt(h.avg_gold_jungle)}</td>
            <td className="px-4 py-3 text-center text-gray-400">{fmtDec(h.avg_last_hit, 1)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmt(h.avg_dmg_disable)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmt(h.avg_dmg_heal)}</td>
            <td className="px-4 py-3 text-center text-gray-300">{fmt(h.avg_dmg_to_tw)}</td>
          </>
        )}
      />
    </div>
  )
}
