import { getHeroComboStats } from "@/lib/data"
import HeroComboTable from "@/components/HeroComboTable"
import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"
import type { HeroComboSize, HeroComboRow } from "@/lib/types"

export const metadata = { title: "Hero Combo - RoVBuff" }

export default async function HeroComboPage() {
  const { username } = await requireSession()
  const groups: Record<HeroComboSize, HeroComboRow[]> = {
    2: getHeroComboStats(2, username),
    3: getHeroComboStats(3, username),
    5: getHeroComboStats(5, username),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Hero Combo" }]}
        kicker="Composition lab"
        title="Hero Combo"
        description="Explore 2, 3, and 5-hero combinations using raw win rate and game count."
        icon="👯"
        accent="#ec4899"
      />
      <HeroComboTable groups={groups} />
    </div>
  )
}
