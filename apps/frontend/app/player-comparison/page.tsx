import { getAllPlayerStats } from "@/lib/data"
import PlayerComparisonView from "@/components/PlayerComparisonView"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Player Comparison - RoVBuff" }

export default async function PlayerComparisonPage() {
  const { username } = await requireSession()
  const players = getAllPlayerStats(username)
  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Player Comparison" }]}
        kicker="Head-to-head"
        title="Player Comparison"
        description="Select two players to compare roles, form, consistency, economy, and combat output."
        icon="📊"
        accent="#38bdf8"
      />
      <PlayerComparisonView players={players} />
    </div>
  )
}
