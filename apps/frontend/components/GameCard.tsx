"use client"
import Link from "next/link"
import HeroTag from "@/components/HeroTag"
import type { GameDetail, GamePlayerDetail } from "@/lib/types"

interface Props {
  detail: GameDetail
}

function PlayerRow({ p, mvp, teamMaxDmg, accent }: {
  p: GamePlayerDetail; mvp: boolean; teamMaxDmg: number; accent: string
}) {
  const share = teamMaxDmg > 0 ? p.dmg_to_heroes / teamMaxDmg : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <HeroTag hero={p.hero_name} />
          <Link
            href={`/player-stats/${encodeURIComponent(p.player_name)}`}
            className="text-gray-200 hover:text-white transition-colors font-medium truncate max-w-24"
          >
            {p.player_name}
          </Link>
          {mvp && <span title={`Game MVP · ${p.fantasy_score.toFixed(1)} fantasy`}>👑</span>}
        </div>
        <span className="font-mono text-xs text-gray-400 flex-shrink-0">{p.kill}/{p.death}/{p.assist}</span>
      </div>
      {/* damage share bar */}
      <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: accent, opacity: 0.55 }} />
      </div>
    </div>
  )
}

export default function GameCard({ detail }: Props) {
  const { game, players } = detail
  const blueWon = game.is_victory
  const winners = players.filter((p) => (p.side === "blue") === Boolean(blueWon))
  const losers  = players.filter((p) => (p.side === "blue") !== Boolean(blueWon))
  const winnerKills = blueWon ? game.blue_kills : game.red_kills
  const loserKills  = blueWon ? game.red_kills : game.blue_kills
  const mvpName = players.length
    ? players.reduce((best, p) => (p.fantasy_score > best.fantasy_score ? p : best)).player_name
    : null
  const winnerMaxDmg = Math.max(0, ...winners.map((p) => p.dmg_to_heroes))
  const loserMaxDmg  = Math.max(0, ...losers.map((p) => p.dmg_to_heroes))

  return (
    <div
      className="ui-panel cursor-pointer transition-all hover:border-[var(--border-strong)]"
    >
      {/* Game header */}
      <Link href={`/match-history/${game.game_id}`} className="block">
        <div className="ui-panel-content px-5 py-3.5 flex flex-wrap items-center justify-between gap-3" style={{ background: "rgba(10,20,38,0.82)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-500">{game.game_id}</span>
            <span className="text-sm text-gray-400">{game.datetime}</span>
            <span className="text-sm text-gray-400">⏱ {game.name_duration}</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <span style={{ color: "#22c55e" }}>WIN {winnerKills}</span>
            <span className="text-gray-500">vs</span>
            <span style={{ color: "#ef4444" }}>{loserKills} LOSS</span>
          </div>
        </div>
      </Link>

      {/* Teams */}
      <div className="ui-panel-content grid grid-cols-1 md:grid-cols-2">
        {/* Winners */}
        <div className="p-4 border-b md:border-b-0 md:border-r" style={{ borderColor: "var(--border)", background: "linear-gradient(145deg, rgba(34,197,94,0.035), transparent 55%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 10px rgba(34,197,94,.7)" }} />
            <span className="text-xs font-black tracking-widest" style={{ color: "#22c55e" }}>VICTORY</span>
          </div>
          <div className="space-y-2">
            {winners.map((p) => (
              <PlayerRow key={p.player_name} p={p} mvp={p.player_name === mvpName} teamMaxDmg={winnerMaxDmg} accent="#22c55e" />
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="p-4" style={{ background: "linear-gradient(145deg, rgba(239,68,68,0.035), transparent 55%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,.7)" }} />
            <span className="text-xs font-black tracking-widest" style={{ color: "#ef4444" }}>DEFEAT</span>
          </div>
          <div className="space-y-2">
            {losers.map((p) => (
              <PlayerRow key={p.player_name} p={p} mvp={p.player_name === mvpName} teamMaxDmg={loserMaxDmg} accent="#ef4444" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
