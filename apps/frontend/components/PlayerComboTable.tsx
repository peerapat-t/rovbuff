"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { PlayerComboRow, PlayerComboSize } from "@/lib/types"
import { DEFAULT_MIN_GAMES, MIN_GAMES_OPTIONS } from "@/lib/minGames"

const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

const GROUP_OPTIONS = [
  { value: 2 as const, label: "2 Players" },
  { value: 3 as const, label: "3 Players" },
  { value: 5 as const, label: "5 Players" },
]

type SortKey = "games_together" | "wins" | "losses" | "win_rate"

const SORT_LABELS: Record<SortKey, string> = {
  games_together: "Games Together",
  wins: "Wins",
  losses: "Losses",
  win_rate: "Win%",
}

export default function PlayerComboTable({
  groups,
}: {
  groups: Record<PlayerComboSize, PlayerComboRow[]>
}) {
  const [groupSize, setGroupSize] = useState<PlayerComboSize>(2)
  const [sortKey, setSortKey] = useState<SortKey>("win_rate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [query, setQuery] = useState("")
  const [minGames, setMinGames] = useState(DEFAULT_MIN_GAMES)

  const currentRows = groups[groupSize]

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = currentRows
      .filter((row) => row.games_together >= minGames)
      .filter((row) =>
        q === "" ? true : row.player_names.some((n) => n.toLowerCase().includes(q))
      )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [currentRows, sortDir, sortKey, query, minGames])

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

  const headerCell = (
    label: string,
    key: SortKey,
    align: "left" | "center" = "center"
  ) => (
    <th
      onClick={() => handleSort(key)}
      className={`px-4 py-3 text-xs font-semibold cursor-pointer select-none hover:text-white ${
        align === "left" ? "text-left" : "text-center"
      }`}
      style={{ color: sortKey === key ? "#e2e8f0" : "#8892a4" }}
    >
      {label}
      <span className="ml-1 text-xs" style={{ color: sortKey === key ? "#3b82f6" : "#4b5563" }}>
        {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  )

  const playerChips = (names: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <Link
          key={name}
          href={`/player-stats/${encodeURIComponent(name)}`}
          className="text-xs font-semibold px-2 py-1 rounded-full transition-colors"
          style={{
            background: "rgba(59,130,246,0.12)",
            color: "#93c5fd",
            border: "1px solid rgba(59,130,246,0.22)",
          }}
        >
          {name}
        </Link>
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
              background: groupSize === option.value ? "rgba(34,197,94,.13)" : "rgba(255,255,255,.025)",
              borderColor: groupSize === option.value ? "rgba(34,197,94,.38)" : "var(--border)",
              color: groupSize === option.value ? "#86efac" : "var(--text-muted)",
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
            placeholder="Search player…"
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
                background: minGames === option.value ? "rgba(34,197,94,.13)" : "rgba(255,255,255,.025)",
                borderColor: minGames === option.value ? "rgba(34,197,94,.38)" : "var(--border)",
                color: minGames === option.value ? "#86efac" : "var(--text-muted)",
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Player Combo</th>
                {headerCell("Games Together", "games_together")}
                {headerCell("W", "wins")}
                {headerCell("L", "losses")}
                {headerCell("Win%", "win_rate")}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.group_size}-${row.player_names.join("__")}`}
                  className="border-t row-hover"
                  style={{
                    borderColor: "var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 text-xs w-4 pt-0.5">{i + 1}</span>
                      {playerChips(row.player_names)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{row.games_together}</td>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No player combos match your filters.
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
            key={`${row.group_size}-${row.player_names.join("__")}`}
            className="ui-card ui-card-hover p-3 space-y-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-600 text-xs w-4 pt-1">{i + 1}</span>
              {playerChips(row.player_names)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Games</div>
                <div className="text-sm font-semibold text-white">{row.games_together}</div>
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
            No player combos match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
