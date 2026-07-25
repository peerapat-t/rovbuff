import { getHeroMetaStats } from "@/lib/data"
import HeroMetaView from "@/components/HeroMetaView"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"

export const metadata = { title: "All Heroes - RoVBuff" }

export default async function AllHeroesPage() {
  const { username } = await requireSession()
  const heroes = getHeroMetaStats(username)

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "All Heroes" }]}
        kicker="Hero performance"
        title="All Heroes"
        description={`${heroes.length} heroes tracked from your uploaded matches, ranked by game count and raw win rate.`}
        icon="⚔️"
        accent="#a855f7"
      />
      <HeroMetaView heroes={heroes} />
    </div>
  )
}
