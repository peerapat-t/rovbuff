import { getPlayerStats, getPlayerGameHistory, getAllPlayerStats, getPlayerPayoff, getHeroRoleMap } from "@/lib/data"
import { notFound } from "next/navigation"
import PlayerProfileView from "@/components/PlayerProfileView"
import { requireSession } from "@/lib/session"

export default async function PlayerStatsDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { username } = await requireSession()
  const { name } = await params
  const playerName = decodeURIComponent(name)
  const stats = getPlayerStats(playerName, username)
  if (!stats) notFound()

  const history = getPlayerGameHistory(playerName, username)
  const payoff  = getPlayerPayoff(playerName, username)
  const allStats = getAllPlayerStats(username)
  const heroRoleMap = getHeroRoleMap()

  return (
    <PlayerProfileView
      playerName={playerName}
      baseStats={stats}
      allStats={allStats}
      history={history}
      payoff={payoff}
      heroRoleMap={heroRoleMap}
    />
  )
}
