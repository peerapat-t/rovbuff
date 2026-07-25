"use client"
import { useMemo, useState } from "react"
import GameCard from "@/components/GameCard"
import type { GameDetail } from "@/lib/types"

const PAGE_SIZE = 10

export default function GameHistory({
  games,
  players,
  heroes,
}: {
  games: GameDetail[]
  players: string[]
  heroes: string[]
}) {
  const [player, setPlayer] = useState("")
  const [hero, setHero] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (player && !g.players.some((p) => p.player_name === player)) return false
      if (hero && !g.players.some((p) => p.hero_name === hero)) return false
      return true
    })
  }, [games, player, hero])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const paginated = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const reset = (fn: () => void) => () => { fn(); setPage(1) }

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="ui-panel">
        <div className="ui-panel-content p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <span className="ui-kicker mr-1">Filter matches</span>
        <select value={player} onChange={(e) => reset(() => setPlayer(e.target.value))()}
          className="ui-input px-3 py-2 text-sm">
          <option value="">All players</option>
          {players.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={hero} onChange={(e) => reset(() => setHero(e.target.value))()}
          className="ui-input px-3 py-2 text-sm">
          <option value="">All heroes</option>
          {heroes.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>

        {(player || hero) && (
          <button onClick={() => { setPlayer(""); setHero(""); setPage(1) }}
            className="ui-control ml-auto px-3 py-2 text-xs font-bold">
            Clear
          </button>
        )}
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {filtered.length} game{filtered.length === 1 ? "" : "s"} · page {current} of {totalPages}
      </p>

      <div className="space-y-4">
        {paginated.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No games match these filters.</p>
        ) : (
          paginated.map((detail) => <GameCard key={detail.game.game_id} detail={detail} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)}
            className="ui-control px-4 py-2 text-sm font-bold disabled:opacity-30">
            ← Prev
          </button>
          <span className="text-sm px-2" style={{ color: "var(--text-muted)" }}>{current} / {totalPages}</span>
          <button disabled={current >= totalPages} onClick={() => setPage(current + 1)}
            className="ui-control px-4 py-2 text-sm font-bold disabled:opacity-30">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
