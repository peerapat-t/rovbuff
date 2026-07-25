import { getAllPlayerStats, getTotalGames } from "@/lib/data"
import PlayerStatsTable from "@/components/tables/PlayerStatsTable"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Player Stats - RoVBuff" }

export default async function PlayerStatsPage() {
  const { username } = await requireSession()
  const players = getAllPlayerStats(username)
  const totalGames = getTotalGames(username)
  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Player Stats" }]}
        kicker="Performance index"
        title="Player Stats"
        description={`Compare ${players.length} players across ${totalGames} uploaded matches. Select any column to change the ranking.`}
        icon="🏅"
        accent="#eab308"
      />
      <PlayerStatsTable players={players} />
    </div>
  )
}
