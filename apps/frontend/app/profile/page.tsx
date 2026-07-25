import { PageHeader } from "@/components/ui/Surface"
import { requireSession } from "@/lib/session"
import Portal from "./Portal"

export const metadata = { title: "My Profile · RoVBuff" }

export default async function ProfilePage() {
  const session = await requireSession()
  const initial = session.displayName.charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "My Profile" }]}
        kicker="Personal workspace"
        title={session.displayName}
        description="Upload matches, manage recognized names, and shape how your personal coach guides you."
        accent="#ef4444"
        aside={<div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #ef4444, #a855f7)", boxShadow: "0 0 30px rgba(239,68,68,.12)" }}>
          {initial}
        </div>
        <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>@{session.username}</p>
      </div>}
      />

      <Portal />
    </div>
  )
}
