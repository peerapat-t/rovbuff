"use client"
import FallbackImg from "@/components/FallbackImg"
import CommandSearch from "@/components/CommandSearch"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logout } from "@/app/login/actions"

type NavLink = { href: string; label: string; exact?: boolean }
type NavGroup = { label: string; items: NavLink[] }

const HOME: NavLink = { href: "/", label: "Home", exact: true }

// Logged-in nav: primary links stay visible; analysis routes live under Coach Tools.
const PRIVATE_LINKS: NavLink[] = [
  { href: "/player-stats", label: "Player Stats" },
  { href: "/match-history", label: "Match History" },
]
const PRIVATE_GROUPS: NavGroup[] = [
  {
    label: "Coach Tools",
    items: [
      { href: "/all-heroes", label: "All Heroes" },
      { href: "/player-combo", label: "Player Combo" },
      { href: "/hero-combo", label: "Hero Combo" },
      { href: "/draft-helper", label: "Draft Helper" },
      { href: "/player-comparison", label: "Player Comparison" },
    ],
  },
]

type Session = { username: string; displayName: string } | null

const isActive = (pathname: string, href: string, exact = false) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

const linkBaseClass = "px-3 py-2 rounded-lg transition-all whitespace-nowrap text-xs font-bold"
const activeStyle = {
  background: "rgba(239, 68, 68, 0.12)",
  color: "#fca5a5",
  boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.28), 0 8px 24px rgba(239,68,68,.06)",
} as const
const idleStyle = { color: "var(--text-muted)" } as const

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(pathname, link.href, link.exact)
  return (
    <Link
      href={link.href}
      className={linkBaseClass}
      style={active ? activeStyle : idleStyle}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)" }}
    >
      {link.label}
    </Link>
  )
}

function NavGroupMenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const groupActive = group.items.some((i) => isActive(pathname, i.href))

  // Close on click outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${linkBaseClass} flex items-center gap-1`}
        style={groupActive || open ? activeStyle : idleStyle}
        onMouseEnter={(e) => { if (!groupActive && !open) (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
        onMouseLeave={(e) => { if (!groupActive && !open) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)" }}
      >
        {group.label}
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 min-w-[210px] rounded-xl p-2 z-50"
          role="menu"
          style={{
            background: "rgba(7, 16, 31, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
          }}
        >
          {group.items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-3 py-2.5 rounded-lg text-xs font-bold transition-colors"
                style={active ? activeStyle : idleStyle}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)" }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Navbar({
  searchPlayers = [],
  searchHeroes = [],
  session = null,
}: {
  searchPlayers?: string[]
  searchHeroes?: string[]
  session?: Session
}) {
  const pathname = usePathname()

  return (
    <nav
      className="w-full sticky top-0 z-50"
      style={{
        background: "rgba(4, 10, 21, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap lg:flex-nowrap items-center gap-x-3 lg:gap-x-4 min-h-[68px]">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <span className="w-10 h-10 rounded-xl grid place-items-center border border-red-400/20 bg-red-400/[.06] shadow-[0_0_24px_rgba(239,68,68,.08)]">
            <FallbackImg basePath="/img/logo" alt="RoVBuff" width={32} height={32}
              className="rounded-lg transition-transform group-hover:scale-105" />
          </span>
          <span>
            <span className="block font-black text-lg leading-none text-white">RoVBuff</span>
            <span className="block mt-1 text-[8px] font-black uppercase tracking-[.2em] text-red-300/70">Personal coach</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden lg:block w-px h-6 mx-1" style={{ background: "var(--border)" }} />

        {/* Nav links */}
        <div className="order-3 lg:order-none flex items-center gap-1 w-full lg:w-auto lg:flex-1 min-w-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavItem link={HOME} pathname={pathname} />
          {session && (
            <>
              {PRIVATE_LINKS.map((l) => (
                <NavItem key={l.href} link={l} pathname={pathname} />
              ))}
              {PRIVATE_GROUPS.map((g) => (
                <div key={g.label} className="contents">
                  <div className="hidden lg:block">
                    <NavGroupMenu group={g} pathname={pathname} />
                  </div>
                  <div className="contents lg:hidden">
                    {g.items.map((item) => (
                      <NavItem key={item.href} link={item} pathname={pathname} />
                    ))}
                  </div>
                </div>
              ))}
              <NavItem link={{ href: "/coach-chat", label: "Coach Chat" }} pathname={pathname} />
            </>
          )}
        </div>

        {/* Right cluster: search + auth */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {session ? (
            <>
              <CommandSearch players={searchPlayers} heroes={searchHeroes} />
              <Link
                href="/profile"
                className="ui-control flex items-center gap-2 px-2 py-1.5"
                title="Your profile"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #ef4444, #a855f7)" }}>
                  {session.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-white hidden sm:inline">
                  {session.displayName}
                </span>
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="ui-control px-3 py-2 text-xs font-bold"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-accent px-4 py-2 rounded-lg text-xs font-bold text-white"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
