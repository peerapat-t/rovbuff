"use client"

import { Fragment, useMemo, useState } from "react"
import type { HeroComboRow, HeroComboSize } from "@/lib/types"
import HeroTag from "@/components/HeroTag"
import { DEFAULT_MIN_GAMES, MIN_GAMES_OPTIONS } from "@/lib/minGames"

const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

const GROUP_OPTIONS = [
  { value: 2 as const, label: "2 Heroes" },
  { value: 3 as const, label: "3 Heroes" },
  { value: 5 as const, label: "5 Heroes" },
]

type SortKey = "games" | "wins" | "losses" | "win_rate"

const SORT_LABELS: Record<SortKey, string> = {
  games: "Games",
  wins: "Wins",
  losses: "Losses",
  win_rate: "Win%",
}

export default function HeroComboTable({
  groups,
}: {
  groups: Record<HeroComboSize, HeroComboRow[]>
}) {
  const [groupSize, setGroupSize] = useState<HeroComboSize>(2)
  const [sortKey, setSortKey] = useState<SortKey>("win_rate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [query, setQuery] = useState("")
  const [minGames, setMinGames] = useState(DEFAULT_MIN_GAMES)

  const currentRows = groups[groupSize]

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...currentRows]
      .filter((row) => row.games >= minGames)
      .filter((row) =>
        q === "" ? true : row.heroes.some((h) => h.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const cmp = a[sortKey] - b[sortKey]
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [currentRows, sortKey, sortDir, query, minGames])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const btnBase: React.CSSProperties = {
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 14px",
    cursor: "pointer",
    border: "1px solid",
    transition: "all 0.15s",
  }

  const headerCell = (label: string, key: SortKey) => (
    <th
      onClick={() => handleSort(key)}
      className="px-4 py-3 text-xs font-semibold cursor-pointer select-none hover:text-white text-center"
      style={{ color: sortKey === key ? "#e2e8f0" : "#8892a4" }}
    >
      {label}
      <span className="ml-1 text-xs" style={{ color: sortKey === key ? "#3b82f6" : "#4b5563" }}>
        {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  )

  const heroTags = (heroes: string[]) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {heroes.map((hero, idx) => (
        <Fragment key={hero}>
          {idx > 0 && <span style={{ color: "var(--text-muted)" }}>+</span>}
          <HeroTag hero={hero} />
        </Fragment>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* group size toggle */}
      <div className="ui-panel">
        <div className="ui-panel-content flex items-center gap-2 flex-wrap p-3 sm:p-4">
        {GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setGroupSize(option.value)}
            style={{
              ...btnBase,
              background: groupSize === option.value ? "rgba(236,72,153,.13)" : "rgba(255,255,255,.025)",
              borderColor: groupSize === option.value ? "rgba(236,72,153,.38)" : "var(--border)",
              color: groupSize === option.value ? "#f9a8d4" : "var(--text-muted)",
            }}
          >
            {option.label}
          </button>
        ))}
        <span className="text-xs ml-auto sm:ml-2" style={{ color: "var(--text-muted)" }}>
          {rows.length} combos
        </span>
        </div>
      </div>

      {/* filters: search + min games */}
      <div className="ui-card flex flex-col sm:flex-row sm:items-center gap-3 p-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hero…"
            className="ui-input w-full text-sm pl-9 pr-9 py-2"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm hover:text-white"
              style={{ color: "var(--text-muted)" }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            Min games
          </span>
          {MIN_GAMES_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setMinGames(option.value)}
              style={{
                ...btnBase,
                padding: "6px 12px",
                background: minGames === option.value ? "rgba(236,72,153,.13)" : "rgba(255,255,255,.025)",
                borderColor: minGames === option.value ? "rgba(236,72,153,.38)" : "var(--border)",
                color: minGames === option.value ? "#f9a8d4" : "var(--text-muted)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* mobile sort control */}
      <div className="flex sm:hidden items-center gap-2">
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          Sort by
        </span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="ui-input flex-1 text-sm px-3 py-2"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
          style={{ ...btnBase, padding: "8px 12px", background: "var(--surface2)", borderColor: "var(--border)", color: "#e2e8f0" }}
          aria-label="Toggle sort direction"
        >
          {sortDir === "desc" ? "↓" : "↑"}
        </button>
      </div>

      {/* desktop table */}
      <div className="ui-table-shell hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                  Hero Combo
                </th>
                {headerCell("Games", "games")}
                {headerCell("W", "wins")}
                {headerCell("L", "losses")}
                {headerCell("Win%", "win_rate")}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.heroes.join("__")}
                  className="border-t row-hover"
                  style={{
                    borderColor: "var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 text-xs w-4 pt-0.5">{i + 1}</span>
                      {heroTags(row.heroes)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{row.games}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-400 font-semibold">{row.wins}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-red-400 font-semibold">{row.losses}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold" style={{ color: row.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                      {fmtP(row.win_rate)}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No hero combos match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* mobile cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.heroes.join("__")}
            className="ui-card ui-card-hover p-3 space-y-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-600 text-xs w-4 pt-1">{i + 1}</span>
              {heroTags(row.heroes)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Games</div>
                <div className="text-sm font-semibold text-white">{row.games}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>W / L</div>
                <div className="text-sm font-semibold">
                  <span className="text-green-400">{row.wins}</span>
                  <span style={{ color: "var(--text-muted)" }}> / </span>
                  <span className="text-red-400">{row.losses}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Win%</div>
                <div className="text-sm font-semibold" style={{ color: row.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                  {fmtP(row.win_rate)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="ui-card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No hero combos match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
