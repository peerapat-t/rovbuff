import path from "path"
import Database from "better-sqlite3"
import type {
  PlayerStats,
  GameDetail,
  GamePlayerDetail,
  GameRecord,
  PlayerGameRow,
  PayoffRow,
  HeroMetaStat,
  PlayerComboRow,
  BuildPattern,
  HeroDetail,
  HeroPlayerRow,
  HeroMatchupRow,
  CounterRow,
  HeroComboRow,
  HeroComboSize,
  PlayerComboSize,
} from "./types"
import { gameEndTime } from "./gameTime"

function resolveDbPath(): string {
  const configured = process.env.ROVBUFF_DB_PATH
  if (configured) {
    if (path.isAbsolute(configured)) return configured
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
  }

  // Default: the SQLite db lives inside the OCR backend app (apps/backend_ocr/data).
  // process.cwd() is apps/frontend when Next runs, so step up to apps/ then into backend_ocr.
  return path.join(process.cwd(), "..", "backend_ocr", "data", "rovbuff.db")
}

const DB_PATH = resolveDbPath()

let _db: Database.Database | null = null
function getDb(): Database.Database {
  if (!_db) _db = new Database(DB_PATH, { readonly: true })
  return _db
}

function parseJsonList(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeDiv(n: number, d: number): number {
  return d === 0 ? 0 : n / d
}

// ── Shared SQL fragments ──────────────────────────────────────────────────────

const STATS_COLS = `
  COUNT(*)                                                               AS games_played,
  SUM(CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
               OR (s.side_blue_or_red='red'  AND g.is_victory=0)
            THEN 1 ELSE 0 END)                                           AS wins,
  AVG(o.fantasy_score)  AS avg_fantasy_score,
  AVG(o.kill)           AS avg_kills,
  AVG(o.death)          AS avg_deaths,
  AVG(o.assist)         AS avg_assists,
  AVG(o.golds)          AS avg_golds,
  AVG(d.dmg_to_heroes)  AS avg_dmg_to_heroes,
  AVG(d.dmg_taken)      AS avg_dmg_taken,
  AVG(d.participation)  AS avg_participation,
  AVG(gl.gold_tol)      AS avg_gold_tol,
  AVG(gl.gold_jungle)   AS avg_gold_jungle,
  AVG(gl.last_hit)      AS avg_last_hit,
  AVG(od.dmg_disable)   AS avg_dmg_disable,
  AVG(od.dmg_heal)      AS avg_dmg_heal,
  AVG(od.dmg_to_tw)     AS avg_dmg_to_tw
`

const STATS_FROM = `
  FROM overview_data o
  JOIN side_mapping s  USING (game_id, player_name)
  JOIN game_data    g  USING (game_id)
  JOIN dmg          d  USING (game_id, player_name)
  JOIN gold         gl USING (game_id, player_name)
  JOIN oth_dmg      od USING (game_id, player_name)
`

const PLAYERS_SELECT = `
  SELECT
    o.game_id,
    o.player_name,
    o.hero_name,
    s.side_blue_or_red                                  AS side,
    o.fantasy_score,
    o.kill, o.death, o.assist, o.golds,
    d.dmg_to_heroes, d.dmg_taken, d.participation,
    gl.gold_tol, gl.gold_jungle, gl.last_hit,
    od.dmg_disable, od.dmg_heal, od.dmg_to_tw,
    il.items_name_list
  FROM overview_data o
  JOIN side_mapping  s  USING (game_id, player_name)
  JOIN dmg           d  USING (game_id, player_name)
  JOIN gold          gl USING (game_id, player_name)
  JOIN oth_dmg       od USING (game_id, player_name)
  LEFT JOIN item_list il USING (game_id, player_name)
`

// ── Row mappers ───────────────────────────────────────────────────────────────

type RawStats = Record<string, number> & { player_name: string }

function toPlayerStats(r: RawStats, heroes: string[]): PlayerStats {
  const wins = r.wins
  const gp   = r.games_played
  const avgK = r.avg_kills
  const avgD = r.avg_deaths
  const avgA = r.avg_assists
  return {
    player_name:        r.player_name,
    games_played:       gp,
    wins,
    losses:             gp - wins,
    win_rate:           wins / gp,
    heroes_played:      heroes,
    avg_fantasy_score: r.avg_fantasy_score,
    avg_kills:         avgK,
    avg_deaths:        avgD,
    avg_assists:       avgA,
    avg_kda:           avgD === 0 ? avgK + avgA : (avgK + avgA) / avgD,
    avg_golds:         r.avg_golds,
    avg_dmg_to_heroes: r.avg_dmg_to_heroes,
    avg_dmg_taken:     r.avg_dmg_taken,
    avg_participation: r.avg_participation,
    avg_gold_tol:      r.avg_gold_tol,
    avg_gold_jungle:   r.avg_gold_jungle,
    avg_last_hit:      r.avg_last_hit,
    avg_dmg_disable:   r.avg_dmg_disable,
    avg_dmg_heal:      r.avg_dmg_heal,
    avg_dmg_to_tw:     r.avg_dmg_to_tw,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPlayerDetail(r: any): GamePlayerDetail {
  return {
    player_name:   r.player_name,
    hero_name:     r.hero_name,
    side:          r.side,
    fantasy_score: r.fantasy_score,
    kill:          r.kill,
    death:         r.death,
    assist:        r.assist,
    golds:         r.golds,
    dmg_to_heroes: r.dmg_to_heroes,
    dmg_taken:     r.dmg_taken,
    participation: r.participation,
    gold_tol:      r.gold_tol,
    gold_jungle:   r.gold_jungle,
    last_hit:      r.last_hit,
    dmg_disable:   r.dmg_disable,
    dmg_heal:      r.dmg_heal,
    dmg_to_tw:     r.dmg_to_tw,
    items:         parseJsonList(r.items_name_list),
  }
}

// ── Exported query functions ──────────────────────────────────────────────────

export function getPlayerStats(playerName: string, user: string): PlayerStats | null {
  const db = getDb()

  const row = db.prepare(
    `SELECT o.player_name, ${STATS_COLS} ${STATS_FROM} WHERE o.player_name = ? AND g.uploaded_by = ? GROUP BY o.player_name`
  ).get(playerName, user) as RawStats | undefined
  if (!row) return null

  const heroes = (db.prepare(
    `SELECT o.hero_name FROM overview_data o
     JOIN game_data g USING (game_id)
     WHERE o.player_name = ? AND g.uploaded_by = ?
     GROUP BY o.hero_name ORDER BY COUNT(*) DESC`
  ).all(playerName, user) as { hero_name: string }[]).map((h) => h.hero_name)

  return toPlayerStats(row, heroes)
}

export function getAllPlayerStats(user: string): PlayerStats[] {
  const db = getDb()

  const rows = db.prepare(
    `SELECT o.player_name, ${STATS_COLS} ${STATS_FROM} WHERE g.uploaded_by = ? GROUP BY o.player_name ORDER BY o.player_name`
  ).all(user) as RawStats[]

  const heroRows = db.prepare(
    `SELECT o.player_name, o.hero_name FROM overview_data o
     JOIN game_data g USING (game_id)
     WHERE g.uploaded_by = ?
     GROUP BY o.player_name, o.hero_name ORDER BY o.player_name, COUNT(*) DESC`
  ).all(user) as { player_name: string; hero_name: string }[]

  const heroesMap = new Map<string, string[]>()
  for (const h of heroRows) {
    if (!heroesMap.has(h.player_name)) heroesMap.set(h.player_name, [])
    heroesMap.get(h.player_name)!.push(h.hero_name)
  }

  return rows.map((r) =>
    toPlayerStats(r, heroesMap.get(r.player_name) ?? []),
  )
}

export function getPlayerGameHistory(playerName: string, user: string): PlayerGameRow[] {
  const db = getDb()

  const rows = db.prepare(`
    SELECT
      o.game_id,
      g.datetime,
      g.name_duration,
      o.hero_name,
      s.side_blue_or_red AS side,
      CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                OR (s.side_blue_or_red='red'  AND g.is_victory=0)
           THEN 'win' ELSE 'loss' END                          AS result,
      o.fantasy_score,
      o.kill, o.death, o.assist, o.golds,
      CASE WHEN o.death = 0
           THEN CAST(o.kill + o.assist AS REAL)
           ELSE CAST(o.kill + o.assist AS REAL) / o.death
      END                                                      AS kda,
      d.dmg_to_heroes, d.dmg_taken, d.participation,
      gl.gold_tol, gl.gold_jungle, gl.last_hit,
      od.dmg_disable, od.dmg_heal, od.dmg_to_tw,
      il.items_name_list
    FROM overview_data o
    JOIN side_mapping  s  USING (game_id, player_name)
    JOIN game_data     g  USING (game_id)
    JOIN dmg           d  USING (game_id, player_name)
    JOIN gold          gl USING (game_id, player_name)
    JOIN oth_dmg       od USING (game_id, player_name)
    LEFT JOIN item_list il USING (game_id, player_name)
    WHERE o.player_name = ? AND g.uploaded_by = ?
    ORDER BY g.datetime DESC
  `).all(playerName, user) as Record<string, unknown>[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    game_id:       r.game_id,
    datetime:      r.datetime,
    name_duration: r.name_duration,
    hero_name:     r.hero_name,
    side:          r.side,
    result:        r.result,
    fantasy_score: r.fantasy_score,
    kill:          r.kill,
    death:         r.death,
    assist:        r.assist,
    kda:           r.kda,
    golds:         r.golds,
    dmg_to_heroes: r.dmg_to_heroes,
    dmg_taken:     r.dmg_taken,
    participation: r.participation,
    gold_tol:      r.gold_tol,
    gold_jungle:   r.gold_jungle,
    last_hit:      r.last_hit,
    dmg_disable:   r.dmg_disable,
    dmg_heal:      r.dmg_heal,
    dmg_to_tw:     r.dmg_to_tw,
    items:         parseJsonList(r.items_name_list as string),
  } as PlayerGameRow))
}

export function getGameDetail(gameId: string, user: string): GameDetail | null {
  const db = getDb()

  const game = db.prepare(
    "SELECT * FROM game_data WHERE game_id = ? AND uploaded_by = ?"
  ).get(gameId, user) as Record<string, unknown> | undefined
  if (!game) return null

  const playerRows = db.prepare(
    `${PLAYERS_SELECT} WHERE o.game_id = ?`
  ).all(gameId) as Record<string, unknown>[]

  return {
    game: { ...game, is_victory: Boolean(game.is_victory) } as GameRecord,
    players: playerRows.map(toPlayerDetail),
  }
}

export function getPlayerPayoff(playerName: string, user: string): PayoffRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM payoff WHERE player_name = ? AND uploaded_by = ? ORDER BY win_pct_vs DESC`
    )
    .all(playerName, user) as PayoffRow[]
}

export function getHeroMetaStats(user: string): HeroMetaStat[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      o.hero_name,
      COUNT(*)                                                          AS games_played,
      SUM(CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                   OR (s.side_blue_or_red='red'  AND g.is_victory=0)
               THEN 1 ELSE 0 END)                                      AS wins,
      AVG(o.fantasy_score)  AS avg_fantasy,
      AVG(o.kill)           AS avg_kills,
      AVG(o.death)          AS avg_deaths,
      AVG(o.assist)         AS avg_assists,
      AVG(d.dmg_to_heroes)  AS avg_dmg,
      AVG(d.participation)  AS avg_participation,
      AVG(gl.gold_tol)      AS avg_gold,
      GROUP_CONCAT(DISTINCT o.player_name) AS players
    FROM overview_data o
    JOIN side_mapping s  USING (game_id, player_name)
    JOIN game_data    g  USING (game_id)
    JOIN dmg          d  USING (game_id, player_name)
    JOIN gold         gl USING (game_id, player_name)
    WHERE g.uploaded_by = ?
    GROUP BY o.hero_name
    ORDER BY games_played DESC
  `).all(user) as Record<string, unknown>[]

  return rows.map(r => {
    const wins = r.wins as number
    const gp   = r.games_played as number
    const avgK = r.avg_kills as number
    const avgD = r.avg_deaths as number
    const avgA = r.avg_assists as number
    return {
      hero_name:         r.hero_name as string,
      games_played:      gp,
      wins,
      losses:            gp - wins,
      win_rate:          wins / gp,
      avg_fantasy:       r.avg_fantasy as number,
      avg_kills:         avgK,
      avg_deaths:        avgD,
      avg_assists:       avgA,
      avg_kda:           avgD === 0 ? avgK + avgA : (avgK + avgA) / avgD,
      avg_dmg:           r.avg_dmg as number,
      avg_participation: r.avg_participation as number,
      avg_gold:          r.avg_gold as number,
      players:           ((r.players as string) || "").split(",").filter(Boolean),
    }
  })
}

function combinations(values: string[], size: number): string[][] {
  if (size <= 0 || size > values.length) return []
  const out: string[][] = []
  const path: string[] = []

  const dfs = (start: number) => {
    if (path.length === size) {
      out.push([...path])
      return
    }
    for (let i = start; i <= values.length - (size - path.length); i += 1) {
      path.push(values[i])
      dfs(i + 1)
      path.pop()
    }
  }

  dfs(0)
  return out
}

export function getPlayerComboStats(groupSize: PlayerComboSize, user: string): PlayerComboRow[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      sm.game_id,
      sm.side_blue_or_red,
      sm.player_name,
      CASE WHEN (sm.side_blue_or_red='blue' AND g.is_victory=1)
                OR (sm.side_blue_or_red='red'  AND g.is_victory=0)
           THEN 1 ELSE 0 END AS won
    FROM side_mapping sm
    JOIN game_data g USING (game_id)
    WHERE g.uploaded_by = ?
    ORDER BY sm.game_id, sm.side_blue_or_red, sm.player_name
  `).all(user) as {
    game_id: string
    side_blue_or_red: string
    player_name: string
    won: number
  }[]

  const teamMap = new Map<string, { players: string[]; won: boolean }>()
  for (const row of rows) {
    const key = `${row.game_id}::${row.side_blue_or_red}`
    const entry = teamMap.get(key) ?? { players: [], won: Boolean(row.won) }
    entry.players.push(row.player_name)
    entry.won = Boolean(row.won)
    teamMap.set(key, entry)
  }

  const groupMap = new Map<string, { player_names: string[]; games: number; wins: number }>()
  for (const team of teamMap.values()) {
    const players = [...team.players].sort((a, b) => a.localeCompare(b))
    for (const group of combinations(players, groupSize)) {
      const key = group.join("::")
      const entry = groupMap.get(key) ?? { player_names: group, games: 0, wins: 0 }
      entry.games += 1
      entry.wins += team.won ? 1 : 0
      groupMap.set(key, entry)
    }
  }

  return [...groupMap.values()]
    .map((entry) => ({
      group_size: groupSize,
      player_names: entry.player_names,
      games_together: entry.games,
      wins: entry.wins,
      losses: entry.games - entry.wins,
      win_rate: safeDiv(entry.wins, entry.games),
    }))
    .sort((a, b) =>
      b.wins - a.wins ||
      b.games_together - a.games_together ||
      a.player_names.join(",").localeCompare(b.player_names.join(","))
    )
}

export function getTotalGames(user: string): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM game_data WHERE uploaded_by = ?").get(user) as { n: number }).n
}

export function getAllGames(user: string): GameDetail[] {
  const db = getDb()

  const games = db.prepare(
    "SELECT * FROM game_data WHERE uploaded_by = ? ORDER BY datetime DESC"
  ).all(user) as Record<string, unknown>[]

  const playerRows = db.prepare(
    `${PLAYERS_SELECT} JOIN game_data g USING (game_id) WHERE g.uploaded_by = ? ORDER BY g.datetime DESC, o.game_id`
  ).all(user) as Record<string, unknown>[]

  // Group players by game_id
  const playersMap = new Map<string, GamePlayerDetail[]>()
  for (const r of playerRows) {
    const gid = r.game_id as string
    if (!playersMap.has(gid)) playersMap.set(gid, [])
    playersMap.get(gid)!.push(toPlayerDetail(r))
  }

  return games
    .map((g) => ({
      game:    { ...g, is_victory: Boolean(g.is_victory) } as GameRecord,
      players: playersMap.get(g.game_id as string) ?? [],
    }))
    .sort((a, b) => gameEndTime(b.game.datetime) - gameEndTime(a.game.datetime))
}

export function getHeroRoleMap(): Record<string, string[]> {
  const rows = getDb()
    .prepare("SELECT hero_name, possible_role_sorted FROM hero_role")
    .all() as { hero_name: string; possible_role_sorted: string }[]

  const roleMap: Record<string, string[]> = {}
  for (const row of rows) {
    roleMap[row.hero_name] = (row.possible_role_sorted || "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean)
  }
  return roleMap
}

// ── Hero detail ───────────────────────────────────────────────────────────────

export function getHeroDetail(heroName: string, user: string): HeroDetail | null {
  const db = getDb()
  const meta = getHeroMetaStats(user).find((h) => h.hero_name === heroName)
  if (!meta) return null

  const roles = getHeroRoleMap()[heroName] ?? []

  // who plays the hero — raw win rate computed in SQL
  const players = db.prepare(`
    SELECT o.player_name AS player_name,
      COUNT(*) AS games,
      SUM(CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                   OR (s.side_blue_or_red='red'  AND g.is_victory=0)
               THEN 1 ELSE 0 END) AS wins,
      CAST(SUM(CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                         OR (s.side_blue_or_red='red'  AND g.is_victory=0)
                    THEN 1 ELSE 0 END) AS REAL) / COUNT(*) AS win_rate,
      AVG(o.fantasy_score) AS avg_fantasy
    FROM overview_data o
    JOIN side_mapping s USING (game_id, player_name)
    JOIN game_data    g USING (game_id)
    WHERE o.hero_name = ? AND g.uploaded_by = ?
    GROUP BY o.player_name
    ORDER BY games DESC, win_rate DESC
  `).all(heroName, user) as HeroPlayerRow[]

  const buildRows = db.prepare(`
    SELECT
      il.items_name_list,
      CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                OR (s.side_blue_or_red='red'  AND g.is_victory=0)
           THEN 1 ELSE 0 END AS won
    FROM item_list il
    JOIN side_mapping s USING (game_id, player_name)
    JOIN game_data    g USING (game_id)
    WHERE il.hero_name = ? AND g.uploaded_by = ?
  `).all(heroName, user) as { items_name_list: string; won: number }[]

  const buildMap = new Map<string, { items: string[]; games: number; wins: number }>()
  for (const row of buildRows) {
    const items = parseJsonList(row.items_name_list)
      .filter((item) => !item.startsWith("Unknown"))
    const key = items.join("::")
    const entry = buildMap.get(key) ?? { items, games: 0, wins: 0 }
    entry.games += 1
    entry.wins += row.won
    buildMap.set(key, entry)
  }

  const builds: BuildPattern[] = [...buildMap.values()]
    .map((entry) => ({
      items: entry.items,
      games: entry.games,
      wins: entry.wins,
      losses: entry.games - entry.wins,
      win_rate: safeDiv(entry.wins, entry.games),
    }))
    .sort((a, b) =>
      b.games - a.games ||
      b.wins - a.wins ||
      a.items.join(",").localeCompare(b.items.join(","))
    )
    .slice(0, 8)

  // matchups — aggregate the payoff table across players, using raw win rate
  const matchups = db.prepare(`
    SELECT enemy_hero,
      SUM(games_vs) AS games,
      SUM(wins_vs)  AS wins,
      CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) AS win_rate
    FROM payoff
    WHERE own_hero = ? AND uploaded_by = ?
    GROUP BY enemy_hero
    ORDER BY win_rate DESC, games DESC
  `).all(heroName, user) as HeroMatchupRow[]

  return { hero_name: heroName, roles, meta, players, builds, matchups }
}

// ── Draft Helper ──────────────────────────────────────────────────────────────

/**
 * Hero-vs-hero matchups aggregated across all players from the payoff table.
 * Draft Helper filters this client-side by the chosen enemy heroes.
 */
export function getCounterMatrix(user: string): CounterRow[] {
  return getDb().prepare(`
    SELECT own_hero, enemy_hero,
      SUM(games_vs) AS games,
      SUM(wins_vs)  AS wins,
      CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) AS win_rate
    FROM payoff
    WHERE own_hero <> 'ALL' AND uploaded_by = ?
    GROUP BY own_hero, enemy_hero
  `).all(user) as CounterRow[]
}

// distinct hero names that appear as an enemy in the payoff table
export function getKnownEnemyHeroes(user: string): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT enemy_hero FROM payoff WHERE uploaded_by = ? ORDER BY enemy_hero")
    .all(user) as { enemy_hero: string }[]
  return rows.map((r) => r.enemy_hero)
}

// ── Hero Combo ────────────────────────────────────────────────────────────────

/**
 * Hero combinations (2, 3, or 5) that share a team, ranked by raw win rate.
 * Mirrors getPlayerComboStats but combines heroes (from overview_data) per team
 * instead of players. A group of 5 collapses to the full team composition.
 */
export function getHeroComboStats(groupSize: HeroComboSize, user: string): HeroComboRow[] {
  const rows = getDb().prepare(`
    SELECT o.game_id, s.side_blue_or_red AS side, o.hero_name,
      CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                OR (s.side_blue_or_red='red'  AND g.is_victory=0)
           THEN 1 ELSE 0 END AS won
    FROM overview_data o
    JOIN side_mapping s USING (game_id, player_name)
    JOIN game_data    g USING (game_id)
    WHERE g.uploaded_by = ?
  `).all(user) as { game_id: string; side: string; hero_name: string; won: number }[]

  // group heroes by (game_id, side) into a team
  const teamMap = new Map<string, { heroes: string[]; won: boolean }>()
  for (const row of rows) {
    const key = `${row.game_id}::${row.side}`
    const entry = teamMap.get(key) ?? { heroes: [], won: Boolean(row.won) }
    entry.heroes.push(row.hero_name)
    entry.won = Boolean(row.won)
    teamMap.set(key, entry)
  }

  const groupMap = new Map<string, { heroes: string[]; games: number; wins: number }>()
  for (const team of teamMap.values()) {
    const heroes = [...new Set(team.heroes)].sort((a, b) => a.localeCompare(b))
    for (const combo of combinations(heroes, groupSize)) {
      const key = combo.join("::")
      const entry = groupMap.get(key) ?? { heroes: combo, games: 0, wins: 0 }
      entry.games += 1
      entry.wins += team.won ? 1 : 0
      groupMap.set(key, entry)
    }
  }

  return [...groupMap.values()]
    .map((entry) => ({
      group_size: groupSize,
      heroes: entry.heroes,
      games: entry.games,
      wins: entry.wins,
      losses: entry.games - entry.wins,
      win_rate: safeDiv(entry.wins, entry.games),
    }))
    .sort((a, b) =>
      b.win_rate - a.win_rate ||
      b.games - a.games ||
      a.heroes.join(",").localeCompare(b.heroes.join(","))
    )
}
