"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type Item = { label: string; href: string; group: string }

const PAGES: Item[] = [
  { label: "Player Stats", href: "/player-stats", group: "pages" },
  { label: "Match History", href: "/match-history", group: "pages" },
  { label: "Coach Chat", href: "/coach-chat", group: "pages" },
  { label: "All Heroes", href: "/all-heroes", group: "pages" },
  { label: "Player Combo", href: "/player-combo", group: "pages" },
  { label: "Hero Combo", href: "/hero-combo", group: "pages" },
  { label: "Draft Helper", href: "/draft-helper", group: "pages" },
  { label: "Player Comparison", href: "/player-comparison", group: "pages" },
]

export default function CommandSearch({ players, heroes }: { players: string[]; heroes: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo<Item[]>(
    () => [
      ...players.map((p) => ({ label: p, href: `/player-stats/${encodeURIComponent(p)}`, group: "players" })),
      ...heroes.map((h) => ({ label: h, href: `/all-heroes/${encodeURIComponent(h)}`, group: "heroes" })),
      ...PAGES,
    ],
    [players, heroes],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGES.slice(0, 8)
    return index.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 30)
  }, [query, index])

  const openSearch = useCallback(() => {
    setQuery("")
    setActive(0)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  // global ⌘K / Ctrl+K toggle (re-binds on open change so it can read it)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (open) setOpen(false)
        else openSearch()
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, openSearch])

  const go = (item: Item) => {
    setOpen(false)
    router.push(item.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]) }
  }

  const groupLabel: Record<string, string> = {
    players: "Players",
    heroes: "Heroes",
    pages: "Pages",
  }

  return (
    <>
      {/* trigger button (lives in the navbar) */}
      <button
        onClick={openSearch}
        className="ui-control flex items-center gap-2 px-3 py-2 text-xs font-bold"
        aria-label="Open search"
      >
        <span>🔍</span>
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
          style={{ background: "rgba(2,4,12,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="ui-panel w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              placeholder="Search players & heroes…"
              className="w-full px-5 py-4 text-base outline-none"
              style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
            />
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {results.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>No matches</p>
              ) : (
                results.map((r, i) => {
                  const showGroup = i === 0 || results[i - 1].group !== r.group
                  return (
                    <div key={`${r.group}-${r.href}`}>
                      {showGroup && (
                        <div className="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          {groupLabel[r.group] ?? r.group}
                        </div>
                      )}
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className="w-full text-left px-5 py-2 text-sm flex items-center justify-between"
                        style={{ background: i === active ? "rgba(239,68,68,0.10)" : "transparent", color: i === active ? "#fca5a5" : "var(--text)" }}
                      >
                        <span className="truncate">{r.label}</span>
                        {i === active && <span className="text-xs" style={{ color: "var(--text-muted)" }}>↵</span>}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
