import { getHeroDetail } from "@/lib/data"
import { notFound } from "next/navigation"
import Link from "next/link"
import HeroTag from "@/components/HeroTag"
import StatCard from "@/components/StatCard"
import BuildPatternsSection from "@/components/BuildPatternsSection"
import { requireSession } from "@/lib/session"
import { PageHeader, SectionHeader } from "@/components/ui/Surface"

const fmtN = (n: number) => Math.round(n).toLocaleString("en-US")
const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

export default async function HeroDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { username } = await requireSession()
  const { name } = await params
  const heroName = decodeURIComponent(name)
  const hero = getHeroDetail(heroName, username)
  if (!hero) notFound()

  const { meta, builds, matchups, roles, players } = hero
  const best = matchups.slice(0, 8)
  const worst = [...matchups].reverse().slice(0, 8)
  const bestPlayers = [...players]
    .sort((a, b) => b.games - a.games || b.win_rate - a.win_rate)
    .slice(0, 8)

  return (
    <div className="hero-detail-page space-y-8">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "All Heroes", href: "/all-heroes" }, { label: heroName }]}
        kicker="Hero dossier"
        title={heroName}
        description="Performance, players, builds, and matchup history from your uploaded matches."
        icon="⚔️"
        accent="#a855f7"
        aside={<div className="flex items-center gap-2 flex-wrap"><HeroTag hero={heroName} />
          {roles.map((r) => (
            <span key={r} className="ui-control text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              {r}
            </span>
          ))}</div>}
      />

      {/* meta overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Games" value={meta.games_played} />
        <StatCard label="Win Rate" value={fmtP(meta.win_rate)} color={meta.win_rate >= 0.5 ? "#22c55e" : "#ef4444"} />
        <StatCard label="Fantasy" value={meta.avg_fantasy.toFixed(1)} color="#f59e0b" />
        <StatCard label="KDA" value={meta.avg_kda.toFixed(2)} color="#f59e0b" />
        <StatCard label="Dmg/G" value={fmtN(meta.avg_dmg)} />
        <StatCard label="Gold/G" value={fmtN(meta.avg_gold)} />
      </div>

      {/* players */}
      {bestPlayers.length > 0 && (
        <section>
          <SectionHeader kicker="Player ranking" title="Top Players on This Hero"
            description="Sorted by game count first, then raw win rate." accent="#eab308" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {bestPlayers.map((p) => (
              <Link
                key={p.player_name}
                href={`/player-stats/${encodeURIComponent(p.player_name)}`}
                className="ui-card ui-card-hover p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{p.player_name}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Games</div>
                    <div className="font-bold text-white">{p.games}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Win</div>
                    <div className="font-bold" style={{ color: p.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                      {fmtP(p.win_rate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Fantasy</div>
                    <div className="font-bold" style={{ color: "#f59e0b" }}>{p.avg_fantasy.toFixed(1)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* builds */}
      <section>
        <SectionHeader kicker="Build patterns" title="Common Final Builds"
          description="Final loadouts grouped by frequency, keeping one-off late-game items from looking like recommendations." accent="#ef4444" />
        <BuildPatternsSection builds={builds} />
      </section>

      {/* matchups */}
      {matchups.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ui-panel p-4 sm:p-5">
            <div className="relative z-10">
            <SectionHeader kicker="Favorable history" title="Strong Against" description={`Enemy heroes ${heroName} beats most often.`} accent="#22c55e" />
            <div className="space-y-2">
              {best.map((m) => (
                <MatchupRow key={m.enemy_hero} enemy={m.enemy_hero} games={m.games} winRate={m.win_rate} />
              ))}
            </div>
            </div>
          </div>
          <div className="ui-panel p-4 sm:p-5">
            <div className="relative z-10">
            <SectionHeader kicker="Difficult history" title="Weak Against" description={`Enemy heroes that give ${heroName} trouble.`} accent="#ef4444" />
            <div className="space-y-2">
              {worst.map((m) => (
                <MatchupRow key={m.enemy_hero} enemy={m.enemy_hero} games={m.games} winRate={m.win_rate} />
              ))}
            </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function MatchupRow({ enemy, games, winRate }: { enemy: string; games: number; winRate: number }) {
  return (
    <Link href={`/all-heroes/${encodeURIComponent(enemy)}`}
      className="ui-card ui-card-hover flex items-center justify-between gap-3 p-2.5">
      <HeroTag hero={enemy} link={false} />
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold tabular-nums" style={{ color: winRate >= 0.5 ? "#22c55e" : "#ef4444" }}>
          {fmtP(winRate)}
          <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>({games})</span>
        </span>
      </span>
    </Link>
  )
}
