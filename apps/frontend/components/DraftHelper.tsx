"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { HeroAvatar } from "@/components/HeroTag"
import type { CounterRow } from "@/lib/types"
import { DEFAULT_MIN_GAMES, MIN_GAMES_OPTIONS } from "@/lib/minGames"

const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`
const MAX_ENEMIES = 5
const MEDALS = ["#f59e0b", "#94a3b8", "#b45309"]

type Matchup = { enemy: string; games: number; win_rate: number | null }

export default function DraftHelper({
  matrix,
  enemyOptions,
}: {
  matrix: CounterRow[]
  enemyOptions: string[]
}) {
  const [enemies, setEnemies] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [minGames, setMinGames] = useState(DEFAULT_MIN_GAMES)

  const full = enemies.length >= MAX_ENEMIES

  const grid = useMemo(
    () => enemyOptions.filter((h) => h.toLowerCase().includes(query.toLowerCase())),
    [enemyOptions, query],
  )

  const toggle = (hero: string) => {
    setEnemies((prev) => {
      if (prev.includes(hero)) return prev.filter((x) => x !== hero)
      if (prev.length >= MAX_ENEMIES) return prev
      return [...prev, hero]
    })
  }

  const recommendations = useMemo(() => {
    if (enemies.length === 0) return []
    const enemySet = new Set(enemies)
    const agg = new Map<
      string,
      { games: number; wins: number; per: Map<string, { games: number; wins: number }> }
    >()

    for (const row of matrix) {
      if (!enemySet.has(row.enemy_hero)) continue
      const entry = agg.get(row.own_hero) ?? { games: 0, wins: 0, per: new Map() }
      entry.games += row.games
      entry.wins += row.wins
      entry.per.set(row.enemy_hero, { games: row.games, wins: row.wins })
      agg.set(row.own_hero, entry)
    }

    return [...agg.entries()]
      .map(([own_hero, entry]) => ({
        own_hero,
        games: entry.games,
        wins: entry.wins,
        win_rate: entry.games > 0 ? entry.wins / entry.games : 0,
        coverage: entry.per.size,
        matchups: enemies.map<Matchup>((enemy) => {
          const d = entry.per.get(enemy)
          return {
            enemy,
            games: d?.games ?? 0,
            win_rate: d && d.games > 0 ? d.wins / d.games : null,
          }
        }),
      }))
      .filter((r) => r.games >= minGames && !enemySet.has(r.own_hero))
      .sort((a, b) => b.win_rate - a.win_rate || b.coverage - a.coverage || b.games - a.games)
      .slice(0, 12)
  }, [matrix, enemies, minGames])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(340px,420px)] gap-6 items-start">
      {/* ── LEFT: enemy draft + hero list ────────────────────────────────── */}
      <div className="space-y-6 min-w-0">
      {/* enemy draft bar */}
      <div className="ui-panel p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--red-team)" }}>
              Enemy Draft
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              {enemies.length}/{MAX_ENEMIES}
            </span>
          </div>
          {enemies.length > 0 && (
            <button
              onClick={() => setEnemies([])}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:text-white hover:bg-white/5"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
          {Array.from({ length: MAX_ENEMIES }).map((_, i) => {
            const hero = enemies[i]
            return (
              <div key={hero ?? `slot-${i}`} className="flex flex-col items-center gap-1.5 w-16 sm:w-[72px]">
                {hero ? (
                  <button
                    onClick={() => toggle(hero)}
                    title={`Remove ${hero}`}
                    className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl overflow-hidden group flex-shrink-0"
                    style={{ border: "2px solid var(--red-team)", boxShadow: "0 0 12px rgba(239,68,68,0.28)" }}
                  >
                    <HeroAvatar hero={hero} fill />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      Remove
                    </span>
                  </button>
                ) : (
                  <div
                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
                    style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}
                  >
                    {i + 1}
                  </div>
                )}
                <span
                  className="text-[10px] text-center leading-tight truncate w-full"
                  style={{ color: hero ? "#fca5a5" : "var(--text-muted)" }}
                >
                  {hero ?? "Empty"}
                </span>
              </div>
            )
          })}
        </div>

        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {full ? "Enemy team full — tap a hero to remove it." : "Tap heroes below to build the enemy team, then read your best answers on the right."}
        </p>
      </div>

      {/* hero list */}
      <div className="ui-panel p-4 min-w-0">
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search heroes…"
              className="ui-input w-full pl-9 pr-9 py-2.5 text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-xs transition-colors hover:text-white hover:bg-white/10"
                style={{ color: "var(--text-muted)" }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-3 max-h-[520px] overflow-y-auto pr-1">
            {grid.map((hero) => {
              const selected = enemies.includes(hero)
              const disabled = full && !selected
              return (
                <button
                  key={hero}
                  onClick={() => toggle(hero)}
                  disabled={disabled}
                  title={hero}
                  className="flex flex-col items-center gap-1 group min-w-0"
                  style={{ opacity: disabled ? 0.3 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                >
                  <span
                    className="relative w-full aspect-square rounded-xl overflow-hidden transition-transform group-hover:scale-105"
                    style={{
                      border: selected ? "2px solid var(--red-team)" : "2px solid var(--border)",
                      boxShadow: selected ? "0 0 12px rgba(239,68,68,0.5)" : "none",
                    }}
                  >
                    <HeroAvatar hero={hero} fill />
                    {selected && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-white text-lg font-black"
                        style={{ background: "rgba(239,68,68,0.45)" }}
                      >
                        ✕
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-center leading-tight truncate w-full" style={{ color: selected ? "#fca5a5" : "var(--text-muted)" }}>
                    {hero}
                  </span>
                </button>
              )
            })}

            {grid.length === 0 && (
              <p className="col-span-full text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                No heroes match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── RIGHT: recommendations (rises to fill the top-right space) ─────── */}
      <div
        className="ui-panel lg:sticky lg:top-20"
      >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
            {enemies.length > 0 && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <h2 className="text-sm font-bold text-white">Best Counter Picks</h2>
            {enemies.length > 0 && (
              <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                vs {enemies.length} hero{enemies.length > 1 ? "es" : ""}
              </span>
            )}
          </div>

          <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Min games</span>
            {MIN_GAMES_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMinGames(option.value)}
                className="rounded-lg px-2.5 py-1 text-xs font-bold"
                style={{
                  background: minGames === option.value ? "rgba(6,182,212,.13)" : "rgba(255,255,255,.025)",
                  border: `1px solid ${minGames === option.value ? "rgba(6,182,212,.38)" : "var(--border)"}`,
                  color: minGames === option.value ? "#67e8f9" : "var(--text-muted)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {enemies.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-white">Pick the enemy team</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Recommendations rank instantly as you select enemy heroes, with your win rate against
                each one.
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-white">No matchup history yet</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Not enough games against this enemy selection at the current sample threshold. Try
                lowering min games.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2 max-h-[560px] overflow-y-auto">
              {recommendations.map((r, i) => {
                const good = r.win_rate >= 0.5
                const medal = MEDALS[i]
                return (
                  <div
                    key={r.own_hero}
                    className="ui-card ui-card-hover p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 tabular-nums"
                        style={medal
                          ? { background: `${medal}22`, color: medal, border: `1px solid ${medal}55` }
                          : { color: "var(--text-muted)" }}
                      >
                        {i + 1}
                      </span>
                      <Link
                        href={`/all-heroes/${encodeURIComponent(r.own_hero)}`}
                        className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105"
                        style={{ border: "1px solid var(--border)" }}
                        title={`Open ${r.own_hero}`}
                      >
                        <HeroAvatar hero={r.own_hero} fill />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/all-heroes/${encodeURIComponent(r.own_hero)}`}
                            className="text-sm font-bold text-white truncate hover:underline"
                          >
                            {r.own_hero}
                          </Link>
                          <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: good ? "var(--green)" : "var(--red-team)" }}>
                            {fmtP(r.win_rate)}
                          </span>
                        </div>
                        <div className="h-1 rounded-full mt-1" style={{ background: "var(--surface)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: fmtP(r.win_rate),
                              background: good
                                ? "linear-gradient(90deg, #16a34a, #22c55e)"
                                : "linear-gradient(90deg, #b91c1c, #ef4444)",
                            }}
                          />
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                          covers {r.coverage}/{enemies.length} · {r.games} games
                        </div>
                      </div>
                    </div>

                    {/* per-enemy matchup breakdown */}
                    <div className="flex items-center gap-2 mt-2.5 pt-2.5 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
                      {r.matchups.map((m) => {
                        const has = m.win_rate !== null
                        const mGood = has && (m.win_rate as number) >= 0.5
                        return (
                          <div
                            key={m.enemy}
                            className="flex flex-col items-center gap-0.5"
                            title={has ? `vs ${m.enemy}: ${fmtP(m.win_rate as number)} over ${m.games} games` : `vs ${m.enemy}: no data`}
                          >
                            <span
                              className="w-7 h-7 rounded-md overflow-hidden"
                              style={{ border: "1px solid var(--border)", opacity: has ? 1 : 0.35 }}
                            >
                              <HeroAvatar hero={m.enemy} fill />
                            </span>
                            <span
                              className="text-[9px] font-bold tabular-nums"
                              style={{ color: !has ? "var(--text-muted)" : mGood ? "var(--green)" : "var(--red-team)" }}
                            >
                              {has ? fmtP(m.win_rate as number) : "—"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </div>
  )
}
