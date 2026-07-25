import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import LoginForm from "./LoginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = next && next.startsWith("/") ? next : "/"

  // Already signed in → skip the form.
  const session = await getSession()
  if (session) redirect(target)

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-2">
      <div className="ui-panel w-full max-w-sm">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(239,68,68,0.10) 0%, transparent 70%)" }} />

        <div className="ui-panel-content p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <p className="ui-kicker">Personal workspace</p>
            <h1 className="text-2xl font-black text-white">Welcome to RoVBuff</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Sign in to upload games and view your stats
            </p>
          </div>

          <LoginForm next={target} />

          <Link href="/" className="block text-center text-xs transition-colors hover:text-white"
            style={{ color: "var(--text-muted)" }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
