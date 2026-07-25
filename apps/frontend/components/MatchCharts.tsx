"use client"

import { useState } from "react"
import Link from "next/link"
import { HeroAvatar } from "@/components/HeroTag"
import type { GamePlayerDetail } from "@/lib/types"

type MetricKey = keyof Pick<
  GamePlayerDetail,
  "dmg_to_heroes" | "dmg_taken" | "gold_tol" | "dmg_heal" | "dmg_disable" | "dmg_to_tw"
>

type Metric = {
  key: MetricKey
  label: string
  shortLabel: string
  icon: string
  color: string
}

const METRICS: Metric[] = [
  { key: "dmg_to_heroes", label: "Damage to Heroes", shortLabel: "Hero Damage", icon: "⚔️", color: "#ef4444" },
  { key: "dmg_taken", label: "Damage Taken", shortLabel: "Damage Taken", icon: "🛡️", color: "#a855f7" },
  { key: "gold_tol", label: "Total Gold", shortLabel: "Gold", icon: "🪙", color: "#eab308" },
  { key: "dmg_heal", label: "Healing", shortLabel: "Healing", icon: "💚", color: "#22c55e" },
  { key: "dmg_disable", label: "Disable Damage", shortLabel: "Control", icon: "⛓️", color: "#38bdf8" },
  { key: "dmg_to_tw", label: "Tower Damage", shortLabel: "Tower", icon: "🏰", color: "#ef4444" },
]

function formatCompact(value: number) {
  const rounded = Math.round(value)
  if (Math.abs(rounded) >= 1_000_000) {
    const scaled = rounded / 1_000_000
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}M`
  }
  if (Math.abs(rounded) >= 1_000) {
    const scaled = rounded / 1_000
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}K`
  }
  return rounded.toLocaleString("en-US")
}

function formatFull(value: number) {
  return Math.round(value).toLocaleString("en-US")
}

export default function MatchCharts({
  players,
  winningSide,
}: {
  players: GamePlayerDetail[]
  winningSide: "blue" | "red"
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>("dmg_to_heroes")
  const metric = METRICS.find((item) => item.key === metricKey) ?? METRICS[0]
  const ranked = [...players].sort((a, b) => Number(b[metricKey]) - Number(a[metricKey]))
  const maxValue = Math.max(...ranked.map((player) => Number(player[metricKey])), 0)
  const topPlayer = ranked[0]
  const winners = ranked.filter((player) => player.side === winningSide)
  const losers = ranked.filter((player) => player.side !== winningSide)

  return (
    <div
      data-match-charts
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--grad-card)", border: "1px solid var(--border)" }}
    >
      <div className="p-4 sm:p-5 space-y-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: metric.color }}>
              Performance comparison
            </p>
            <h3 className="text-xl font-black text-white mt-1">{metric.label}</h3>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ranked across all {players.length} players · switch metrics below
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {METRICS.map((item) => {
            const active = item.key === metricKey
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => setMetricKey(item.key)}
                className="min-w-0 rounded-xl px-3 py-2.5 text-left transition-all"
                style={{
                  background: active ? `${item.color}18` : "var(--surface2)",
                  border: `1px solid ${active ? `${item.color}80` : "var(--border)"}`,
                  boxShadow: active ? `0 0 18px ${item.color}18` : "none",
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.icon}</span>
                  <span
                    className="truncate text-xs font-bold"
                    style={{ color: active ? "#fff" : "var(--text-muted)" }}
                  >
                    {item.shortLabel}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <TeamBars
          title="Victory"
          players={winners}
          metricKey={metricKey}
          metricColor={metric.color}
          resultColor="#22c55e"
          maxValue={maxValue}
          topPlayer={topPlayer}
        />
        <TeamBars
          title="Defeat"
          players={losers}
          metricKey={metricKey}
          metricColor={metric.color}
          resultColor="#ef4444"
          maxValue={maxValue}
          topPlayer={topPlayer}
          right
        />
      </div>
    </div>
  )
}

function TeamBars({
  title,
  players,
  metricKey,
  metricColor,
  resultColor,
  maxValue,
  topPlayer,
  right = false,
}: {
  title: string
  players: GamePlayerDetail[]
  metricKey: MetricKey
  metricColor: string
  resultColor: string
  maxValue: number
  topPlayer?: GamePlayerDetail
  right?: boolean
}) {
  const total = players.reduce((sum, player) => sum + Number(player[metricKey]), 0)

  return (
    <div
      className={`p-4 sm:p-5 space-y-3 ${right ? "border-t lg:border-t-0 lg:border-l" : ""}`}
      style={{
        borderColor: "var(--border)",
        background: `linear-gradient(145deg, ${resultColor}08 0%, transparent 48%)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: resultColor, boxShadow: `0 0 10px ${resultColor}99` }} />
          <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: resultColor }}>{title}</h4>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Team total</div>
          <div className="text-sm font-black tabular-nums text-white" title={formatFull(total)}>{formatCompact(total)}</div>
        </div>
      </div>

      {players.map((player) => {
        const value = Number(player[metricKey])
        const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 2 : 0) : 0
        const isTop = player === topPlayer

        return (
          <div
            key={`${player.side}-${player.player_name}`}
            className="group rounded-xl p-3 transition-colors hover:bg-white/[0.035]"
            style={{ background: "rgba(2, 4, 12, 0.35)", border: `1px solid ${isTop ? `${metricColor}55` : "rgba(23,36,61,0.72)"}` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <HeroAvatar hero={player.hero_name} size={34} />
                {isTop && (
                  <span className="absolute -top-2 -right-2 text-[11px]" title="Top performer for this metric">👑</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/player-stats/${encodeURIComponent(player.player_name)}`}
                  className="block truncate text-sm font-bold text-white hover:underline"
                >
                  {player.player_name}
                </Link>
                <div className="truncate text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{player.hero_name}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-base font-black tabular-nums text-white" title={formatFull(value)}>{formatCompact(value)}</div>
              </div>
            </div>

            <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.055)" }}>
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${resultColor}aa, ${metricColor})`,
                  boxShadow: value > 0 ? `0 0 10px ${metricColor}55` : "none",
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
