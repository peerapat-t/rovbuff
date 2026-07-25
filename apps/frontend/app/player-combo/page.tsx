import { getPlayerComboStats } from "@/lib/data"
import PlayerComboTable from "@/components/PlayerComboTable"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"
import type { PlayerComboSize, PlayerComboRow } from "@/lib/types"

export const metadata = { title: "Player Combo - RoVBuff" }

export default async function PlayerComboPage() {
  const { username } = await requireSession()
  const groups: Record<PlayerComboSize, PlayerComboRow[]> = {
    2: getPlayerComboStats(2, username),
    3: getPlayerComboStats(3, username),
    5: getPlayerComboStats(5, username),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Player Combo" }]}
        kicker="Lineup chemistry"
        title="Player Combo"
        description="See which 2, 3, and 5-player combinations perform best across your uploaded matches."
        icon="🔗"
        accent="#22c55e"
      />
      <PlayerComboTable groups={groups} />
    </div>
  )
}
