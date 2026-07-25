"use client"

import { useState } from "react"
import Link from "next/link"
import type { HeroMetaStat } from "@/lib/types"
import { HeroAvatar } from "@/components/HeroTag"
import { DEFAULT_MIN_GAMES, MIN_GAMES_OPTIONS } from "@/lib/minGames"

const fmt  = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtD = (n: number, d = 2) => n.toFixed(d)
const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

type MetricKey =
  | "win_rate" | "avg_fantasy" | "avg_kda" | "games_played"
  | "avg_dmg" | "avg_gold" | "avg_participation"

interface Metric {
  key: MetricKey
  label: string
  format: (n: number) => string
  accent: string
  // win_rate is colored by a 50% threshold instead of a flat accent
  threshold?: boolean
}

const METRICS: Metric[] = [
  { key: "win_rate",          label: "Win%",    format: fmtP,                 accent: "#22c55e", threshold: true },
  { key: "avg_fantasy",       label: "Fantasy", format: (n) => fmtD(n, 1),    accent: "#f59e0b" },
  { key: "avg_kda",           label: "KDA",     format: (n) => fmtD(n, 2),    accent: "#f59e0b" },
  { key: "games_played",      label: "Games",   format: fmt,                  accent: "#3b82f6" },
  { key: "avg_dmg",           label: "Dmg/G",   format: fmt,                  accent: "#ef4444" },
  { key: "avg_gold",          label: "Gold/G",  format: fmt,                  accent: "#eab308" },
  { key: "avg_participation", label: "Part%",   format: fmtP,                 accent: "#06b6d4" },
]

export default function HeroMetaChart({ heroes }: { heroes: HeroMetaStat[] }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("win_rate")
  const [minGames, setMinGames] = useState(DEFAULT_MIN_GAMES)

  const metric = METRICS.find((m) => m.key === metricKey)!

  // React Compiler memoizes this automatically.
  const rows = heroes
    .filter((h) => h.games_played >= minGames)
    .map((h) => ({ hero: h, value: h[metricKey] as number }))
    .sort((a, b) => b.value - a.value || b.hero.games_played - a.hero.games_played)

  const maxValue = rows.length ? Math.max(...rows.map((r) => r.value)) : 0

  const barColor = (value: number) =>
    metric.threshold ? (value >= 0.5 ? "#22c55e" : "#ef4444") : metric.accent

  const btnBase: React.CSSProperties = {
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 12px",
    cursor: "pointer",
    border: "1px solid",
    transition: "all 0.15s",
  }

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="ui-panel"><div className="ui-panel-content p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              style={{
                ...btnBase,
                background: metricKey === m.key ? `${m.accent}18` : "var(--surface2)",
                borderColor: metricKey === m.key ? `${m.accent}88` : "var(--border)",
                color: metricKey === m.key ? "#fff" : "var(--text-muted)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            Min games
          </span>
          {MIN_GAMES_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setMinGames(option.value)}
              style={{
                ...btnBase,
                background: minGames === option.value ? "rgba(56,189,248,.14)" : "var(--surface2)",
                borderColor: minGames === option.value ? "rgba(56,189,248,.55)" : "var(--border)",
                color: minGames === option.value ? "#fff" : "var(--text-muted)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div></div>

      {/* bar list */}
      <div className="ui-panel"><div className="ui-panel-content p-3 sm:p-4 space-y-1.5">
        {rows.map(({ hero, value }, i) => {
          const color = barColor(value)
          const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0
          return (
            <Link
              key={hero.hero_name}
              href={`/all-heroes/${encodeURIComponent(hero.hero_name)}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
            >
              <span className="text-gray-600 text-xs w-5 text-right tabular-nums flex-shrink-0">{i + 1}</span>
              <div className="flex items-center gap-2 w-32 sm:w-40 flex-shrink-0 min-w-0">
                <HeroAvatar hero={hero.hero_name} size={22} />
                <span className="text-sm font-semibold text-white truncate">{hero.hero_name}</span>
              </div>
              <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div
                  className="h-full rounded-md transition-all"
                  style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums w-16 text-right flex-shrink-0" style={{ color }}>
                {metric.format(value)}
              </span>
              <span className="hidden sm:inline text-xs tabular-nums w-14 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {hero.games_played} GP
              </span>
            </Link>
          )
        })}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No heroes match this filter.
          </div>
        )}
      </div></div>
    </div>
  )
}
