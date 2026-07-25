"use client"
import { useMemo } from "react"
import type { PlayerGameRow } from "@/lib/types"
import { gameEndTime } from "@/lib/gameTime"

const GAP = 4
const LABEL_W = 30
const WEEKS = 53 // full trailing year

type Day = {
  key: string
  date: Date
  games: number
  wins: number
  losses: number
  win_rate: number
  fantasy: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

function cellColor(day: Day | null): string {
  if (!day || day.games === 0) return "var(--surface2)"
  const hue = Math.round(day.win_rate * 120) // 0 = red, 60 = amber, 120 = green
  const light = 52 - Math.min(day.games, 6) * 3.2 // more games → deeper colour
  return `hsl(${hue}, 68%, ${light}%)`
}

function tooltip(day: Day | null): string {
  if (!day) return ""
  if (day.games === 0) return `${day.key} · no games`
  return `${day.key} · ${day.games} game${day.games > 1 ? "s" : ""} · ${day.wins}W ${day.losses}L (${Math.round(
    day.win_rate * 100,
  )}%) · avg fantasy ${day.fantasy.toFixed(0)}`
}

export default function PlayerHeatmap({ history }: { history: PlayerGameRow[] }) {
  const { weeks, monthLabels, summary } = useMemo(() => {
    const map = new Map<string, Day>()
    for (const g of history) {
      const t = gameEndTime(g.datetime)
      if (!t) continue
      const d = new Date(t)
      const key = dayKey(d)
      const cur = map.get(key) ?? {
        key,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        games: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        fantasy: 0,
      }
      cur.games += 1
      if (g.result === "win") cur.wins += 1
      else cur.losses += 1
      cur.fantasy += g.fantasy_score
      map.set(key, cur)
    }
    for (const d of map.values()) {
      d.win_rate = d.games ? d.wins / d.games : 0
      d.fantasy = d.games ? d.fantasy / d.games : 0
    }

    // Always render a full trailing year (WEEKS columns ending this week).
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - 7 * (WEEKS - 1))
    start.setDate(start.getDate() - start.getDay()) // back up to Sunday

    const weeks: (Day | null)[][] = []
    const monthLabels: string[] = []
    const cursor = new Date(start)
    let prevMonth = -1
    while (cursor <= today) {
      const week: (Day | null)[] = []
      const weekMonth = cursor.getMonth()
      monthLabels.push(weekMonth !== prevMonth ? MONTHS[weekMonth] : "")
      prevMonth = weekMonth
      for (let i = 0; i < 7; i += 1) {
        if (cursor <= today) {
          const key = dayKey(cursor)
          week.push(map.get(key) ?? { key, date: new Date(cursor), games: 0, wins: 0, losses: 0, win_rate: 0, fantasy: 0 })
        } else {
          week.push(null)
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    const played = [...map.values()].filter((d) => d.games > 0)
    const best = [...played].sort((a, b) => b.win_rate - a.win_rate || b.games - a.games)[0] ?? null
    const worst = [...played].sort((a, b) => a.win_rate - b.win_rate || b.games - a.games)[0] ?? null
    const busiest = [...played].sort((a, b) => b.games - a.games)[0] ?? null

    return { weeks, monthLabels, summary: { daysPlayed: played.length, best, worst, busiest } }
  }, [history])

  const weekdayLabels = ["", "Mon", "", "Wed", "", "Fri", ""]

  return (
    <div className="space-y-3">
      {/* summary chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Chip label="Days played" value={String(summary.daysPlayed)} />
        {summary.best && summary.best.games > 0 && (
          <Chip label="Best day" value={`${summary.best.key.slice(5)} · ${Math.round(summary.best.win_rate * 100)}%`} color="var(--green)" />
        )}
        {summary.worst && summary.worst.win_rate < 1 && (
          <Chip label="Toughest day" value={`${summary.worst.key.slice(5)} · ${Math.round(summary.worst.win_rate * 100)}%`} color="var(--red-team)" />
        )}
        {summary.busiest && (
          <Chip label="Most active" value={`${summary.busiest.key.slice(5)} · ${summary.busiest.games} games`} />
        )}
      </div>

      {/* full-width calendar */}
      <div className="w-full">
        {/* month labels */}
        <div className="flex" style={{ gap: GAP, paddingLeft: LABEL_W + GAP }}>
          {monthLabels.map((label, i) => (
            <div
              key={i}
              style={{ flex: "1 1 0", minWidth: 0, fontSize: 10, whiteSpace: "nowrap", color: "var(--text-muted)" }}
            >
              {label}
            </div>
          ))}
        </div>
        {/* weekday labels + week columns */}
        <div className="flex" style={{ gap: GAP, marginTop: GAP }}>
          <div className="flex flex-col" style={{ gap: GAP, width: LABEL_W, flex: "none" }}>
            {weekdayLabels.map((d, i) => (
              <div key={i} className="flex items-center" style={{ flex: "1 1 0", fontSize: 10, color: "var(--text-muted)" }}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP, flex: "1 1 0", minWidth: 0 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={tooltip(day)}
                  style={{
                    width: "100%",
                    aspectRatio: 1,
                    borderRadius: 3,
                    background: cellColor(day),
                    border: day && day.games > 0 ? "1px solid rgba(0,0,0,0.25)" : "1px solid var(--border)",
                    visibility: day ? "visible" : "hidden",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span>Losing day</span>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: "hsl(0,68%,45%)" }} />
        <span style={{ width: 12, height: 12, borderRadius: 3, background: "hsl(60,68%,45%)" }} />
        <span style={{ width: 12, height: 12, borderRadius: 3, background: "hsl(120,68%,42%)" }} />
        <span>Winning day</span>
        <span className="ml-2 flex items-center gap-1">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--surface2)", border: "1px solid var(--border)" }} />
          no games
        </span>
      </div>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-semibold" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </span>
  )
}
