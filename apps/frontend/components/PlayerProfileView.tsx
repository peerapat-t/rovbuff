"use client"
import { useState, useMemo } from "react"
import Breadcrumb from "@/components/Breadcrumb"
import type { PlayerStats, PlayerGameRow, PayoffRow } from "@/lib/types"
import type { HeroStat } from "@/components/tables/HeroStatsTable"
import StatCard from "@/components/StatCard"
import HeroTag from "@/components/HeroTag"
import PlayerRadar from "@/components/PlayerRadar"
import HistoryChart from "@/components/HistoryChart"
import PlayerHeatmap from "@/components/PlayerHeatmap"
import HeroStatsTable from "@/components/tables/HeroStatsTable"
import MatchHistoryTable from "@/components/tables/MatchHistoryTable"
import PayoffSection from "@/components/PayoffSection"
import { byGameEndAsc, byGameEndDesc } from "@/lib/gameTime"
import { SectionHeader } from "@/components/ui/Surface"

const fmt  = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtD = (n: number, d = 2) => n.toFixed(d)
const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`
const avg  = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

function fmtDuration(mins: number): string {
  if (mins === 0) return "—"
  const m = Math.floor(mins)
  const s = Math.round((mins - m) * 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function parseDurationToMinutes(s: string): number {
  const parts = s.split(":").map(Number)
  if (parts.length === 2) return parts[0] + parts[1] / 60
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  return 0
}

interface Props {
  playerName: string
  baseStats: PlayerStats         // pre-computed all-hero aggregate (for radar normalization)
  allStats: PlayerStats[]        // all players (for radar normalization)
  history: PlayerGameRow[]       // all games for this player
  payoff: PayoffRow[]            // all payoff rows (ALL + per hero)
  heroRoleMap: Record<string, string[]>
}

function deriveLikelyRoles(
  rows: PlayerGameRow[],
  heroRoleMap: Record<string, string[]>
): { role: string; score: number; share: number }[] {
  const roleWeights = [1, 0.6, 0.35]
  const roleScore = new Map<string, number>()

  for (const row of rows) {
    const roles = heroRoleMap[row.hero_name] ?? []
    roles.forEach((role, index) => {
      const weight = roleWeights[index] ?? 0.2
      roleScore.set(role, (roleScore.get(role) ?? 0) + weight)
    })
  }

  const total = [...roleScore.values()].reduce((sum, value) => sum + value, 0)
  return [...roleScore.entries()]
    .map(([role, score]) => ({
      role,
      score,
      share: total > 0 ? score / total : 0,
    }))
    .sort((a, b) => b.score - a.score || a.role.localeCompare(b.role))
}

// Derive aggregated stats from a subset of history rows
function deriveStats(rows: PlayerGameRow[], playerName: string): PlayerStats {
  if (!rows.length) return {} as PlayerStats
  const wins = rows.filter(r => r.result === "win").length
  const gp   = rows.length
  const kills   = rows.map(r => r.kill)
  const deaths  = rows.map(r => r.death)
  const assists = rows.map(r => r.assist)
  const avgK = avg(kills)
  const avgD = avg(deaths)
  const avgA = avg(assists)
  const kda  = avgD === 0 ? avgK + avgA : (avgK + avgA) / avgD
  return {
    player_name:         playerName,
    games_played:        gp,
    wins,
    losses:              gp - wins,
    win_rate:            wins / gp,
    heroes_played:       [...new Set(rows.map(r => r.hero_name))],
    avg_fantasy_score:   avg(rows.map(r => r.fantasy_score)),
    avg_kills:           avgK,
    avg_deaths:          avgD,
    avg_assists:         avgA,
    avg_kda:             kda,
    avg_golds:           avg(rows.map(r => r.golds)),
    avg_dmg_to_heroes:   avg(rows.map(r => r.dmg_to_heroes)),
    avg_dmg_taken:       avg(rows.map(r => r.dmg_taken)),
    avg_participation:   avg(rows.map(r => r.participation)),
    avg_gold_tol:        avg(rows.map(r => r.gold_tol)),
    avg_gold_jungle:     avg(rows.map(r => r.gold_jungle)),
    avg_last_hit:        avg(rows.map(r => r.last_hit)),
    avg_dmg_disable:     avg(rows.map(r => r.dmg_disable)),
    avg_dmg_heal:        avg(rows.map(r => r.dmg_heal)),
    avg_dmg_to_tw:       avg(rows.map(r => r.dmg_to_tw)),
  }
}

function buildHeroStats(rows: PlayerGameRow[]): HeroStat[] {
  const map = new Map<string, {
    gp: number; wins: number; kills: number; deaths: number; assists: number
    fantasy: number; golds: number; dmg: number; dmg_taken: number
    participation: number; gold_jungle: number; last_hit: number
    dmg_disable: number; dmg_heal: number; dmg_to_tw: number
  }>()
  const z = () => ({ gp:0,wins:0,kills:0,deaths:0,assists:0,fantasy:0,golds:0,dmg:0,
    dmg_taken:0,participation:0,gold_jungle:0,last_hit:0,dmg_disable:0,dmg_heal:0,dmg_to_tw:0 })
  for (const g of rows) {
    const p = map.get(g.hero_name) ?? z()
    map.set(g.hero_name, {
      gp:           p.gp + 1,
      wins:         p.wins + (g.result === "win" ? 1 : 0),
      kills:        p.kills + g.kill,
      deaths:       p.deaths + g.death,
      assists:      p.assists + g.assist,
      fantasy:      p.fantasy + g.fantasy_score,
      golds:        p.golds + g.golds,
      dmg:          p.dmg + g.dmg_to_heroes,
      dmg_taken:    p.dmg_taken + g.dmg_taken,
      participation:p.participation + g.participation,
      gold_jungle:  p.gold_jungle + g.gold_jungle,
      last_hit:     p.last_hit + g.last_hit,
      dmg_disable:  p.dmg_disable + g.dmg_disable,
      dmg_heal:     p.dmg_heal + g.dmg_heal,
      dmg_to_tw:    p.dmg_to_tw + g.dmg_to_tw,
    })
  }
  return [...map.entries()]
    .map(([hero, h]) => ({
      hero,
      gp:               h.gp,
      wins:             h.wins,
      losses:           h.gp - h.wins,
      win_rate:         h.wins / h.gp,
      avg_kill:         h.kills        / h.gp,
      avg_death:        h.deaths       / h.gp,
      avg_assist:       h.assists      / h.gp,
      avg_kda:          h.deaths === 0 ? h.kills + h.assists : (h.kills + h.assists) / h.deaths,
      avg_fantasy:      h.fantasy      / h.gp,
      avg_golds:        h.golds        / h.gp,
      avg_dmg:          h.dmg          / h.gp,
      avg_dmg_taken:    h.dmg_taken    / h.gp,
      avg_participation:h.participation / h.gp,
      avg_gold_jungle:  h.gold_jungle  / h.gp,
      avg_last_hit:     h.last_hit     / h.gp,
      avg_dmg_disable:  h.dmg_disable  / h.gp,
      avg_dmg_heal:     h.dmg_heal     / h.gp,
      avg_dmg_to_tw:    h.dmg_to_tw    / h.gp,
    }))
    .sort((a, b) => b.gp - a.gp || b.wins - a.wins)
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ui-panel p-4">
      <div className="relative z-10">
        <h3 className="text-sm font-black text-white mb-3">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  )
}
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

export default function PlayerProfileView({ playerName, baseStats, allStats, history, payoff, heroRoleMap }: Props) {
  const heroesPlayed = useMemo(() => {
    // order by most played
    const cnt = new Map<string, number>()
    for (const g of history) cnt.set(g.hero_name, (cnt.get(g.hero_name) ?? 0) + 1)
    return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h)
  }, [history])

  const [selected, setSelected] = useState("ALL")

  const filteredHistory = useMemo(() => {
    const base = selected === "ALL" ? history : history.filter(g => g.hero_name === selected)
    return [...base].sort(byGameEndAsc)
  }, [history, selected])

  const stats = useMemo(
    () => selected === "ALL" ? baseStats : deriveStats(filteredHistory, playerName),
    [selected, filteredHistory, baseStats, playerName]
  )

  const heroStats = useMemo(() => buildHeroStats(filteredHistory), [filteredHistory])
  const likelyRoles = useMemo(
    () => deriveLikelyRoles(selected === "ALL" ? history : filteredHistory, heroRoleMap),
    [selected, history, filteredHistory, heroRoleMap]
  )

  // Recent Form — last 5 games by in-game end time (newest first)
  const recentForm = [...history].sort(byGameEndDesc).slice(0, 5)

  // Avg game duration by result
  const avgTimeWin = useMemo(() => {
    const vals = filteredHistory.filter(g => g.result === "win").map(g => parseDurationToMinutes(g.name_duration)).filter(v => v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [filteredHistory])

  const avgTimeLoss = useMemo(() => {
    const vals = filteredHistory.filter(g => g.result === "loss").map(g => parseDurationToMinutes(g.name_duration)).filter(v => v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [filteredHistory])

  // Gold/Min per game
  const avgGoldPerMin = useMemo(() => {
    const vals = filteredHistory
      .map(g => {
        const mins = parseDurationToMinutes(g.name_duration)
        return mins > 0 ? g.gold_tol / mins : 0
      })
      .filter(v => v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [filteredHistory])

  // Radar — normalize against all players' baseStats
  const normalize = (val: number, key: keyof PlayerStats) => {
    const vals = allStats.map(p => p[key] as number)
    const max = Math.max(...vals)
    return max > 0 ? Math.round((val / max) * 100) : 0
  }
  const radarData = [
    { subject: "KDA",     value: normalize(stats.avg_kda,           "avg_kda")           },
    { subject: "Damage",  value: normalize(stats.avg_dmg_to_heroes, "avg_dmg_to_heroes") },
    { subject: "Gold",    value: normalize(stats.avg_gold_tol,      "avg_gold_tol")      },
    { subject: "Healing", value: normalize(stats.avg_dmg_heal,      "avg_dmg_heal")      },
    { subject: "Disable", value: normalize(stats.avg_dmg_disable,   "avg_dmg_disable")   },
    { subject: "Tower",   value: normalize(stats.avg_dmg_to_tw,     "avg_dmg_to_tw")     },
  ]

  const winRateColor = (stats.win_rate ?? 0) >= 0.5 ? "#22c55e" : "#ef4444"

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[
        { label: "Home", href: "/" },
        { label: "Player Stats", href: "/player-stats" },
        { label: playerName },
      ]} />

      {/* Hero filter */}
      <div
        className="ui-panel relative z-10 flex flex-wrap items-center gap-3 px-4 py-3"
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Filter by Hero
        </span>
        <select value={selected} onChange={e => setSelected(e.target.value)} className="ui-input px-3 py-2 text-sm cursor-pointer">
          <option value="ALL">All Heroes</option>
          {heroesPlayed.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        {selected !== "ALL" && (
          <button
            onClick={() => setSelected("ALL")}
            className="ui-control text-xs font-bold px-3 py-2"
          >
            ✕ Clear
          </button>
        )}
        {selected !== "ALL" && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {filteredHistory.length} game{filteredHistory.length !== 1 ? "s" : ""} as{" "}
            <HeroTag hero={selected} />
          </span>
        )}
      </div>

      {/* 1. Header */}
      <div
        className="ui-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center"
      >
        <div className="relative z-10 flex-1">
          <p className="ui-kicker mb-2">Player profile</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white break-all">{playerName}</h1>
            <a
              href={`/api/card/${encodeURIComponent(playerName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-control text-xs font-bold px-3 py-2 rounded-xl"
              title="Open a shareable coach card image"
            >
              📇 Coach Card
            </a>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(stats.heroes_played ?? []).map(h => <HeroTag key={h} hero={h} />)}
          </div>
          {likelyRoles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Likely Roles
              </span>
              {likelyRoles.slice(0, 3).map((row, index) => (
                <span
                  key={row.role}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: index === 0 ? "rgba(239,68,68,0.12)" : "var(--surface2)",
                    border: `1px solid ${index === 0 ? "rgba(239,68,68,0.32)" : "var(--border)"}`,
                    color: index === 0 ? "#fca5a5" : "var(--text)",
                  }}
                >
                  <span>{row.role}</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {(row.share * 100).toFixed(0)}%
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="relative z-10 flex gap-6 flex-wrap">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: winRateColor }}>{fmtP(stats.win_rate ?? 0)}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#f59e0b" }}>{fmtD(stats.avg_kda ?? 0)}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Avg KDA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.games_played ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Games</div>
          </div>
        </div>
      </div>

      {/* Recent Form */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Recent Form
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          (last 5 games)
        </span>
        {recentForm.map((g, i) => (
          <span
            key={i}
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: g.result === "win" ? "#14532d" : "#450a0a",
              color:      g.result === "win" ? "#22c55e" : "#ef4444",
            }}
          >
            {g.result === "win" ? "W" : "L"}
          </span>
        ))}
        {recentForm.length === 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>No games</span>}
      </div>

      {/* Daily consistency heatmap */}
      <section>
        <SectionHeader kicker="Activity pattern" title="Daily Consistency"
          description={`Spot form streaks and see how regularly ${playerName} plays across the calendar.`} accent="#22c55e" />
        <div className="ui-panel p-4"><div className="relative z-10">
          <PlayerHeatmap history={history} />
        </div></div>
      </section>

      {/* 2. Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Games"       value={stats.games_played ?? 0} />
        <StatCard label="Wins"        value={stats.wins ?? 0}    color="#22c55e" />
        <StatCard label="Losses"      value={stats.losses ?? 0}  color="#ef4444" />
        <StatCard label="% Win"       value={fmtP(stats.win_rate ?? 0)} color={(stats.win_rate ?? 0) >= 0.5 ? "#22c55e" : "#ef4444"} />
        <StatCard label="Avg K/D/A"   value={`${fmtD(stats.avg_kills??0,1)}/${fmtD(stats.avg_deaths??0,1)}/${fmtD(stats.avg_assists??0,1)}`} />
        <StatCard label="Fantasy Avg"  value={fmtD(stats.avg_fantasy_score??0,1)} color="#f59e0b" />
        <StatCard label="Gold/Min"     value={fmtD(avgGoldPerMin, 0)} color="#22c55e" />
        <StatCard label="Avg Win Time"  value={fmtDuration(avgTimeWin)}  color="#22c55e" />
        <StatCard label="Avg Loss Time" value={fmtDuration(avgTimeLoss)} color="#ef4444" />
      </div>

      {/* 3. Top Heroes */}
      {heroStats.length > 0 && (
        <section>
          <SectionHeader kicker="Hero performance" title="Top Heroes" description="Sortable hero-level results for this player." accent="#a855f7" />
          <HeroStatsTable rows={heroStats} />
        </section>
      )}

      {/* 4. Radar + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ui-panel p-4"><div className="relative z-10">
          <h3 className="text-sm font-bold text-white mb-1">Performance Radar</h3>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Relative to all players (100 = best)
          </p>
          <PlayerRadar data={radarData} />
        </div></div>
        <div className="ui-panel p-4"><div className="relative z-10">
          <h3 className="text-sm font-bold text-white mb-1">Game-by-Game Trend</h3>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Sorted by date · KDA · Fantasy · Damage · Gold
          </p>
          <HistoryChart history={filteredHistory} />
        </div></div>
      </div>

      {/* 5. Combat / Economy / Utility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatSection title="💥 Combat">
          <StatRow label="Avg Dmg to Heroes"    value={fmt(stats.avg_dmg_to_heroes ?? 0)} />
          <StatRow label="Avg Dmg Taken"        value={fmt(stats.avg_dmg_taken ?? 0)} />
          <StatRow label="Avg Kill Participation" value={fmtP(stats.avg_participation ?? 0)} />
        </StatSection>
        <StatSection title="💰 Economy">
          <StatRow label="Avg Gold Total"   value={fmt(stats.avg_gold_tol ?? 0)} />
          <StatRow label="Avg Jungle Gold"  value={fmt(stats.avg_gold_jungle ?? 0)} />
          <StatRow label="Avg Last Hits"    value={fmtD(stats.avg_last_hit ?? 0, 1)} />
        </StatSection>
        <StatSection title="🛡️ Utility">
          <StatRow label="Avg Disable Dmg" value={fmt(stats.avg_dmg_disable ?? 0)} />
          <StatRow label="Avg Healing"     value={fmt(stats.avg_dmg_heal ?? 0)} />
          <StatRow label="Avg Tower Dmg"   value={fmt(stats.avg_dmg_to_tw ?? 0)} />
        </StatSection>
      </div>

      {/* 6. Match History */}
      <section>
        <SectionHeader kicker="Game log" title="Match History" description="Every uploaded match for the current player and hero filter." accent="#ef4444" />
        <MatchHistoryTable rows={filteredHistory} />
      </section>

      {/* 7. Matchup Payoff */}
      {payoff.length > 0 && (
        <section>
          <SectionHeader kicker="Opponent history" title="Matchup Payoff" description="Favorable and difficult matchups using raw win rate and game count." accent="#38bdf8" />
          <PayoffSection
            allRows={payoff}
            selectedHero={selected}
          />
        </section>
      )}

    </div>
  )
}
