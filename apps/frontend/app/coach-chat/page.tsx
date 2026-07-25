import { PageHeader } from "@/components/ui/Surface"
import CoachStyleBadge from "@/components/CoachStyleBadge"
import { getCoachStyleProfile } from "@/lib/chatApi"
import { requireSession } from "@/lib/session"
import CoachChatView from "./CoachChatView"

export const metadata = { title: "Coach Chat - RoVBuff" }

export default async function CoachChatPage() {
  const session = await requireSession()
  const profile = await getCoachStyleProfile(session).catch(() => null)
  const coach = profile?.options.find((option) => option.id === profile.coachStyle)

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Coach Chat" }]}
        kicker="Personal coach"
        title="Coach Chat"
        description="Ask about your uploaded matches, heroes, builds, decisions, and next steps."
        icon="💬"
        accent="#3b82f6"
        aside={coach ? <CoachStyleBadge label={coach.label} subtitle={coach.subtitle} /> : undefined}
      />
      <CoachChatView displayName={session.displayName} />
    </div>
  )
}
