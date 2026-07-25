"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts"
import type { PlayerStats } from "@/lib/types"
import HeroTag from "@/components/HeroTag"

const P1_COLOR = "#3b82f6"
const P2_COLOR = "#ef4444"

const fmt  = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtD = (n: number, d = 2) => n.toFixed(d)
const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

interface StatGroup {
  label: string
  icon: string
  metrics: { key: keyof PlayerStats; name: string; format: (n: number) => string }[]
}

const STAT_GROUPS: StatGroup[] = [
  {
    label: "Combat",
    icon: "⚔️",
    metrics: [
      { key: "avg_dmg_to_heroes", name: "Avg Damage",       format: fmt },
      { key: "avg_dmg_taken",     name: "Avg Dmg Taken",    format: fmt },
      { key: "avg_participation", name: "Kill Part%",        format: fmtP },
    ],
  },
  {
    label: "Economy",
    icon: "💰",
    metrics: [
      { key: "avg_gold_tol",    name: "Avg Gold",        format: fmt },
      { key: "avg_gold_jungle", name: "Avg Jungle Gold", format: fmt },
      { key: "avg_last_hit",    name: "Avg Last Hits",   format: (n) => fmtD(n, 1) },
    ],
  },
  {
    label: "KDA",
    icon: "🎯",
    metrics: [
      { key: "avg_kda",     name: "Avg KDA",     format: fmtD },
      { key: "avg_kills",   name: "Avg Kills",   format: (n) => fmtD(n, 1) },
      { key: "avg_deaths",  name: "Avg Deaths",  format: (n) => fmtD(n, 1) },
      { key: "avg_assists", name: "Avg Assists",  format: (n) => fmtD(n, 1) },
    ],
  },
  {
    label: "Utility",
    icon: "✨",
    metrics: [
      { key: "avg_dmg_heal",    name: "Avg Healing", format: fmt },
      { key: "avg_dmg_disable", name: "Avg Disable", format: fmt },
      { key: "avg_dmg_to_tw",   name: "Avg Tower",   format: fmt },
    ],
  },
]

function FantasyCard({ p, color, rank, leading }: { p: PlayerStats; color: string; rank: number; leading: boolean }) {
  return (
    <div
      className="ui-panel relative flex-1 p-5 text-center"
      style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 0%, ${color}1f 0%, transparent 70%), var(--surface)`,
        border: leading ? `2px solid ${color}aa` : `2px solid ${color}40`,
        boxShadow: leading ? `0 0 26px ${color}2e` : "none",
      }}
    >
      {leading && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: color + "22", border: `1px solid ${color}66`, color }}>
          👑 LEAD
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>
        Player {rank}
      </p>
      <p className="text-lg font-bold text-white truncate mb-2">{p.player_name}</p>
      <div className="flex flex-wrap justify-center gap-1 mb-3">
        {p.heroes_played.map((h) => <HeroTag key={h} hero={h} />)}
      </div>
      <p className="text-5xl font-black mb-1" style={{ color }}>
        {fmtD(p.avg_fantasy_score, 1)}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Fantasy Score</p>
      <div className="mt-3 flex justify-center gap-4 text-sm">
        <span>
          <span className="font-bold" style={{ color: "#22c55e" }}>{p.wins}W</span>
          <span className="text-gray-500"> / </span>
          <span className="font-bold" style={{ color: "#ef4444" }}>{p.losses}L</span>
        </span>
        <span className="font-semibold" style={{ color: p.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
          {fmtP(p.win_rate)}
        </span>
        <span className="font-bold" style={{ color: "#f59e0b" }}>
          {fmtD(p.avg_kda, 1)} KDA
        </span>
      </div>
    </div>
  )
}

function GroupChart({
  group, p1, p2,
}: {
  group: StatGroup
  p1: PlayerStats
  p2: PlayerStats
}) {
  const data = group.metrics.map((m) => ({
    name:  m.name,
    p1:    p1[m.key] as number,
    p2:    p2[m.key] as number,
    p1Lbl: m.format(p1[m.key] as number),
    p2Lbl: m.format(p2[m.key] as number),
  }))

  return (
    <div
      className="ui-panel p-4"
    >
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span>{group.icon}</span> {group.label}
      </h3>
      <ResponsiveContainer width="100%" height={group.metrics.length * 52 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          barCategoryGap="30%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#0f1a2e" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "#8892a4", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #2a1a1a", borderRadius: 8, fontSize: 12, color: "#f0e0e0" }}
            labelStyle={{ color: "#f0e0e0" }}
            itemStyle={{ color: "#f0e0e0" }}
            formatter={(val, name) => {
              const formatted = typeof val === "number" ? val.toLocaleString("en-US") : String(val)
              const playerName = name === "p1" ? p1.player_name : p2.player_name
              return [formatted, playerName]
            }}
            cursor={{ fill: "#ffffff08" }}
          />
          <Bar dataKey="p1" name="p1" fill={P1_COLOR} radius={[0, 4, 4, 0]}>
            <LabelList dataKey="p1Lbl" position="right"
              style={{ fill: P1_COLOR, fontSize: 11, fontWeight: 600 }} />
          </Bar>
          <Bar dataKey="p2" name="p2" fill={P2_COLOR} radius={[0, 4, 4, 0]}>
            <LabelList dataKey="p2Lbl" position="right"
              style={{ fill: P2_COLOR, fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildRadarData(p1: PlayerStats, p2: PlayerStats, allPlayers: PlayerStats[]) {
  const normalize = (val: number, key: keyof PlayerStats) => {
    const vals = allPlayers.map(pl => pl[key] as number)
    const max = Math.max(...vals)
    return max > 0 ? Math.round((val / max) * 100) : 0
  }
  return [
    { subject: "KDA",     p1: normalize(p1.avg_kda,           "avg_kda"),           p2: normalize(p2.avg_kda,           "avg_kda")           },
    { subject: "Damage",  p1: normalize(p1.avg_dmg_to_heroes, "avg_dmg_to_heroes"), p2: normalize(p2.avg_dmg_to_heroes, "avg_dmg_to_heroes") },
    { subject: "Gold",    p1: normalize(p1.avg_gold_tol,      "avg_gold_tol"),      p2: normalize(p2.avg_gold_tol,      "avg_gold_tol")      },
    { subject: "Healing", p1: normalize(p1.avg_dmg_heal,      "avg_dmg_heal"),      p2: normalize(p2.avg_dmg_heal,      "avg_dmg_heal")      },
    { subject: "Disable", p1: normalize(p1.avg_dmg_disable,   "avg_dmg_disable"),   p2: normalize(p2.avg_dmg_disable,   "avg_dmg_disable")   },
    { subject: "Tower",   p1: normalize(p1.avg_dmg_to_tw,     "avg_dmg_to_tw"),     p2: normalize(p2.avg_dmg_to_tw,     "avg_dmg_to_tw")     },
  ]
}

// Searchable player picker — type to filter, click to select.
function PlayerSelect({
  value, onChange, options, disabledValue, accent,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  disabledValue: string
  accent: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter((n) => n !== disabledValue && n.toLowerCase().includes(q))
  }, [options, query, disabledValue])

  const boxStyle: React.CSSProperties = {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    textAlign: "left",
    cursor: "pointer",
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" style={boxStyle} onClick={() => { setOpen((o) => !o); setQuery("") }}>
        {value || "Select player…"}
        <span style={{ float: "right", color: "var(--text-muted)" }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden",
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 12px", fontSize: 14,
              background: "var(--surface2)", border: "none", borderBottom: "1px solid var(--border)",
              color: "var(--text)", outline: "none",
            }}
          />
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "8px 12px", fontSize: 13, color: "var(--text-muted)" }}>No players found</div>
            )}
            {filtered.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { onChange(n); setOpen(false) }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                  fontSize: 14, background: n === value ? accent + "22" : "transparent",
                  border: "none", color: n === value ? accent : "var(--text)", cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (n !== value) e.currentTarget.style.background = "#ffffff0a" }}
                onMouseLeave={(e) => { if (n !== value) e.currentTarget.style.background = "transparent" }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlayerComparisonView({ players }: { players: PlayerStats[] }) {
  const names = players.map((p) => p.player_name)
  const [p1Name, setP1Name] = useState(names[0] ?? "")
  const [p2Name, setP2Name] = useState(names[1] ?? "")

  const p1 = players.find((p) => p.player_name === p1Name)
  const p2 = players.find((p) => p.player_name === p2Name)

  const swap = () => {
    setP1Name(p2Name)
    setP2Name(p1Name)
  }

  return (
    <div className="space-y-6">
      {/* Player selectors */}
      <div className="ui-panel grid grid-cols-[1fr_auto_1fr] gap-3 items-end p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: P1_COLOR }}>
            Player 1
          </label>
          <PlayerSelect value={p1Name} onChange={setP1Name} options={names} disabledValue={p2Name} accent={P1_COLOR} />
        </div>
        <button
          type="button"
          onClick={swap}
          title="Swap players"
          className="ui-control w-10 h-[38px] text-base hover:text-white"
        >
          ⇄
        </button>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: P2_COLOR }}>
            Player 2
          </label>
          <PlayerSelect value={p2Name} onChange={setP2Name} options={names} disabledValue={p1Name} accent={P2_COLOR} />
        </div>
      </div>

      {p1 && p2 && (
        <>
          {/* Fantasy cards — most prominent */}
          <div className="flex gap-4 items-stretch">
            <FantasyCard p={p1} color={P1_COLOR} rank={1} leading={p1.avg_fantasy_score > p2.avg_fantasy_score} />
            <div className="flex items-center justify-center px-1">
              <span className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${P1_COLOR}33, ${P2_COLOR}33)`,
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                }}>
                VS
              </span>
            </div>
            <FantasyCard p={p2} color={P2_COLOR} rank={2} leading={p2.avg_fantasy_score > p1.avg_fantasy_score} />
          </div>

          {/* Radar comparison */}
          <div className="ui-panel p-4">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><span>🕸️</span> Performance Radar</h3>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Relative to all players (100 = best)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={buildRadarData(p1, p2, players)} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#0f1a2e" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#8892a4", fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={p1.player_name} dataKey="p1" stroke={P1_COLOR} fill={P1_COLOR} fillOpacity={0.2} strokeWidth={2} />
                <Radar name={p2.player_name} dataKey="p2" stroke={P2_COLOR} fill={P2_COLOR} fillOpacity={0.2} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #2a1a1a", borderRadius: 8, color: "#f0e0e0" }}
                  labelStyle={{ color: "#f0e0e0" }}
                  formatter={(val, name) => [val, name]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: P1_COLOR }}>
                <span className="w-3 h-1 rounded-full inline-block" style={{ background: P1_COLOR }} />
                {p1.player_name}
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: P2_COLOR }}>
                <span className="w-3 h-1 rounded-full inline-block" style={{ background: P2_COLOR }} />
                {p2.player_name}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: P1_COLOR + "14", border: `1px solid ${P1_COLOR}44` }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: P1_COLOR }} />
              <span className="font-semibold truncate max-w-40" style={{ color: P1_COLOR }}>{p1.player_name}</span>
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: P2_COLOR + "14", border: `1px solid ${P2_COLOR}44` }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: P2_COLOR }} />
              <span className="font-semibold truncate max-w-40" style={{ color: P2_COLOR }}>{p2.player_name}</span>
            </span>
          </div>

          {/* Stat group charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {STAT_GROUPS.map((group) => (
              <GroupChart key={group.label} group={group} p1={p1} p2={p2} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
