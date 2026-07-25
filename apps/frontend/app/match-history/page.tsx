import { getAllGames } from "@/lib/data"
import GameHistory from "@/components/GameHistory"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Match History - RoVBuff" }

export default async function MatchHistoryPage() {
  const { username } = await requireSession()
  const games = getAllGames(username)

  const players = [...new Set(games.flatMap((g) => g.players.map((p) => p.player_name)))].sort()
  const heroes = [...new Set(games.flatMap((g) => g.players.map((p) => p.hero_name)))].sort()

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Match History" }]}
        kicker="Your match archive"
        title="Match History"
        description={`${games.length} uploaded matches · crowns mark each match MVP · player bars show damage share.`}
        icon="🎮"
        accent="#ef4444"
      />

      <GameHistory games={games} players={players} heroes={heroes} />
    </div>
  )
}
