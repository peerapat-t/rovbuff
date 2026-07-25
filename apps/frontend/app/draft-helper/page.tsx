import { getCounterMatrix, getKnownEnemyHeroes } from "@/lib/data"
import { PageHeader } from "@/components/ui/Surface"
import DraftHelper from "@/components/DraftHelper"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Draft Helper - RoVBuff" }

export default async function DraftHelperPage() {
  const { username } = await requireSession()
  const matrix = getCounterMatrix(username)
  const enemies = getKnownEnemyHeroes(username)

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Draft Helper" }]}
        kicker="Counter planning"
        title="Draft Helper"
        description="Build the enemy lineup and rank the strongest historical answers from your uploaded matches."
        icon="🎯"
        accent="#38bdf8"
      />
      <DraftHelper matrix={matrix} enemyOptions={enemies} />
    </div>
  )
}
