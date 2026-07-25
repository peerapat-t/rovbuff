import { getGameDetail } from "@/lib/data"
import { notFound } from "next/navigation"
import Link from "next/link"
import HeroTag from "@/components/HeroTag"
import MatchCharts from "@/components/MatchCharts"
import GameScoreTable from "@/components/tables/GameScoreTable"
import ItemIcon from "@/components/ItemIcon"
import type { GamePlayerDetail } from "@/lib/types"
import { requireSession } from "@/lib/session"
import { PageHeader, SectionHeader } from "@/components/ui/Surface"

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { username } = await requireSession()
  const { id } = await params
  const detail = getGameDetail(id, username)
  if (!detail) notFound()

  const { game, players } = detail
  const blueWon = Boolean(game.is_victory)
  const winningSide: "blue" | "red" = blueWon ? "blue" : "red"
  const winners = players.filter((p) => p.side === winningSide)
  const losers  = players.filter((p) => p.side !== winningSide)
  const winnerKills = blueWon ? game.blue_kills : game.red_kills
  const loserKills  = blueWon ? game.red_kills : game.blue_kills

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Match History", href: "/match-history" }, { label: id }]}
        kicker="Match detail"
        title={game.datetime}
        description={`${game.game_id} · ${game.name_duration}`}
        icon="🎮"
        accent="#ef4444"
        aside={<div className="flex items-center gap-4 sm:gap-6 text-xl sm:text-2xl font-black">
            <span style={{ color: "#22c55e" }}>
              WIN {winnerKills}
            </span>
            <span className="text-gray-600 text-xl">vs</span>
            <span style={{ color: "#ef4444" }}>
              {loserKills} LOSS
            </span>
          </div>}
      />

      {/* Scoreboard */}
      {([["VICTORY", winners, true], ["DEFEAT", losers, false]] as [string, GamePlayerDetail[], boolean][]).map(([label, teamPlayers, won]) => (
        <section key={label}>
          <SectionHeader kicker={won ? "Winning lineup" : "Opposing lineup"} title={label}
            description="Sortable scoreboard with combat, economy, and utility output."
            accent={won ? "#22c55e" : "#ef4444"} />
          <GameScoreTable players={teamPlayers} won={won} />
        </section>
      ))}

      {/* Charts */}
      <section>
        <SectionHeader kicker="Performance comparison" title="Match Charts"
          description="Compare individual output and team totals across every key match metric." accent="#ef4444" />
        <MatchCharts players={players} winningSide={winningSide} />
      </section>

      {/* Items */}
      <section>
        <SectionHeader kicker="Final loadouts" title="Items" description="Completed items for every player at the end of the match." accent="#a855f7" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((p) => (
            <div
              key={p.player_name}
              className="ui-card ui-card-hover p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: p.side === winningSide ? "#22c55e" : "#ef4444" }}
                />
                <Link
                  href={`/player-stats/${encodeURIComponent(p.player_name)}`}
                  className="text-sm font-semibold hover:text-white transition-colors"
                  style={{ color: p.side === winningSide ? "#86efac" : "#fca5a5" }}
                >
                  {p.player_name}
                </Link>
                <HeroTag hero={p.hero_name} />
              </div>
              <div className="flex flex-wrap gap-1">
                {p.items.filter((item) => !item.startsWith("Unknown")).map((item, i) => (
                  <ItemIcon key={`${item}-${i}`} item={item} size={36} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
