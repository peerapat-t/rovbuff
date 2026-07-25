import Link from "next/link"
import { getSession } from "@/lib/session"

export default async function HomePage() {
  const session = await getSession()
  const loggedIn = !!session

  const primaryCta = loggedIn
    ? { href: "/profile", label: "Go to your Profile →" }
    : { href: "/login", label: "Log in →" }

  return (
    <div>
      <section className="relative py-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(239,68,68,0.11) 0%, transparent 65%)", filter: "blur(60px)" }} />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(147,51,234,0.10) 0%, transparent 65%)", filter: "blur(60px)" }} />
        </div>

        <div className="ui-panel relative z-10 w-full">
          <div className="ui-panel-content p-6 sm:p-10 lg:p-12">
          <div className="space-y-7">
            <div className="anim-fade-up inline-flex max-w-full items-center gap-3 rounded-full border border-green-400/25 bg-green-400/[.07] px-4 py-2 shadow-[0_0_24px_rgba(34,197,94,.08)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">
                {loggedIn ? (
                  `Ready to review your games, ${session!.displayName}`
                ) : (
                  "Your Personal RoV Coach"
                )}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="anim-fade-up anim-d1 text-[clamp(2.75rem,7vw,5.5rem)] font-black leading-[0.94] tracking-[-.045em] text-white max-w-4xl">
                Your personal RoV coach
              </h1>
              <p className="anim-fade-up anim-d2 text-xl md:text-2xl font-bold text-red-300 leading-snug">
                Turn every game into progress.
              </p>
            </div>

            <p className="anim-fade-up anim-d3 text-lg max-w-md leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Upload the matches you already play. RoVBuff helps you spot patterns, understand your
              performance, fix mistakes, and enter the next game with a clearer plan.
            </p>

            <div className="anim-fade-up anim-d4 space-y-2">
              <Link href={primaryCta.href}
                className="btn-accent inline-flex px-6 py-3 rounded-xl font-bold text-white text-sm">
                {primaryCta.label}
              </Link>
              <p
                aria-hidden={loggedIn}
                className={`text-xs ${loggedIn ? "invisible" : ""}`}
                style={{ color: "var(--text-muted)" }}
              >
                Sign in to upload your matches and unlock your personal coach tools.
              </p>
            </div>
          </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(transparent, var(--bg))" }} />
      </section>

      <div className="divider-glow" />

      <section id="features" className="scroll-mt-20 py-12 px-2 space-y-5">
        <div>
          <p className="ui-kicker">Coach Tools</p>
          <h2 className="ui-section-title mt-1">Your performance workspace</h2>
          <p className="ui-copy mt-1">Move from a single match to the patterns that shape your play.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/match-history", icon: "📊", title: "Match History",
              desc: "Inspect the scoreboard, damage, gold, items, and MVP for every uploaded match.",
              accent: "#f59e0b", badge: "HIGHLIGHT",
            },
            {
              href: "/all-heroes", icon: "⚔️", title: "All Heroes",
              desc: "See which heroes and builds perform best across the matches you upload.",
              accent: "#a855f7", badge: "HIGHLIGHT",
            },
            {
              href: "/player-combo", icon: "🔗", title: "Player Combo",
              desc: "Find the player combinations you perform best alongside.",
              accent: "#22c55e", badge: "HIGHLIGHT",
            },
            {
              href: "/hero-combo", icon: "👯", title: "Hero Combo",
              desc: "Hero duos and full comps that win together, ranked by win rate.",
              accent: "#ec4899",
            },
            {
              href: "/draft-helper", icon: "🎯", title: "Draft Helper",
              desc: "Plan against enemy comps using patterns from your uploaded match history.",
              accent: "#0891b2",
            },
            {
              href: "/player-comparison", icon: "📊", title: "Player Comparison",
              desc: "Compare roles, form, and output to put your own performance in context.",
              accent: "#ef4444",
            },
            {
              href: "/coach-chat", icon: "💬", title: "Coach Chat",
              desc: "Ask about your matches, heroes, builds, and reviews in Thai — answered from your data.",
              accent: "#3b82f6", badge: "New",
            },
            {
              href: loggedIn ? "/profile" : "/login", icon: "📸", title: "Upload Match Data",
              desc: "Upload end-screen screenshots and build a match history that grows with you.",
              accent: "#64748b",
            },
          ].map(f => (
            <FeatureCard key={f.href} {...f} />
          ))}
        </div>
      </section>

      <section className="py-12 px-2">
        <div className="ui-panel text-center">
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 90% at 50% 110%, rgba(148,163,184,0.08) 0%, rgba(71,85,105,0.035) 50%, transparent 75%)" }} />
          <div className="ui-panel-content px-6 py-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Ready to learn from your <span className="gradient-text-animated">next match</span>?
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              Your personal RoV coach is ready after every game you play.
            </p>
            <div className="flex items-center justify-center pt-2">
              <Link href={primaryCta.href} className="btn-accent px-7 py-3 rounded-xl font-bold text-white text-sm">
                {primaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ href, icon, title, desc, accent, badge }: {
  href: string; icon: string; title: string; desc: string; badge?: string
  accent: string
}) {
  return (
    <Link href={href} className="ui-panel group flex flex-col gap-3 transition-colors hover:border-slate-500/50"
      style={{ padding: "1.25rem" }}>

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-3">
          <span className="inline-block shrink-0 text-2xl transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6">{icon}</span>
          <span className="min-w-0 text-base font-bold leading-tight text-white">{title}</span>
        </div>
        {badge && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase leading-none"
            style={{ background: `${accent}1f`, border: `1px solid ${accent}44`, color: accent }}>
            {badge}
          </span>
        )}
      </div>

      <p className="relative z-10 text-sm leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>{desc}</p>

      <div className="relative z-10 text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-1"
        style={{ color: accent }}>
        Explore →
      </div>
    </Link>
  )
}
