"use client"
import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { PlayerGameRow } from "@/lib/types"
import { byGameEndAsc } from "@/lib/gameTime"

interface Props {
  history: PlayerGameRow[]
}

const METRICS = [
  { key: "KDA",       color: "#3b82f6", label: "KDA" },
  { key: "Fantasy",   color: "#f59e0b", label: "Fantasy" },
  { key: "Dmg (k)",   color: "#ef4444", label: "Dmg (k)" },
  { key: "Gold (k)",  color: "#22c55e", label: "Gold (k)" },
] as const

type MetricKey = typeof METRICS[number]["key"]

export default function HistoryChart({ history }: Props) {
  const [active, setActive] = useState<Set<MetricKey>>(new Set(["KDA", "Fantasy"]))

  const toggle = (key: MetricKey) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const data = [...history]
    .sort(byGameEndAsc)
    .map((g, i) => ({
      game: `G${i + 1}`,
      date: g.datetime,
      KDA: parseFloat(g.kda.toFixed(2)),
      Fantasy: g.fantasy_score,
      "Dmg (k)": parseFloat((g.dmg_to_heroes / 1000).toFixed(1)),
      "Gold (k)": parseFloat((g.gold_tol / 1000).toFixed(1)),
    }))

  return (
    <div className="space-y-3">
      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(({ key, color, label }) => {
          const on = active.has(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all"
              style={{
                background: on ? color + "22" : "var(--surface2)",
                border: `1px solid ${on ? color : "var(--border)"}`,
                color: on ? color : "var(--text-muted)",
              }}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: on ? color : "var(--border)" }} />
              {label}
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0f1a2e" />
          <XAxis dataKey="game" tick={{ fill: "#8892a4", fontSize: 11 }} />
          <YAxis tick={{ fill: "#8892a4", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #2a1a1a", borderRadius: 8, color: "#f0e0e0" }}
            labelStyle={{ color: "#f0e0e0" }}
            itemStyle={{ color: "#f0e0e0" }}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.date ? `${label} · ${payload[0].payload.date}` : label
            }
          />
          <Legend wrapperStyle={{ color: "#8892a4", fontSize: 12 }} />
          {METRICS.map(({ key, color }) =>
            active.has(key) ? (
              <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={data.length < 3} />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
