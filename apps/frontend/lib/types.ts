export interface HeroMetaStat {
  hero_name: string
  games_played: number
  wins: number
  losses: number
  win_rate: number
  avg_fantasy: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_kda: number
  avg_dmg: number
  avg_participation: number
  avg_gold: number
  players: string[]
}

export interface PlayerComboRow {
  group_size: number
  player_names: string[]
  games_together: number
  wins: number
  losses: number
  win_rate: number
}

export type PlayerComboSize = 2 | 3 | 5

export interface PayoffRow {
  player_name: string
  own_hero: string      // "ALL" or specific hero name
  enemy_hero: string
  games_vs: number
  wins_vs: number
  win_pct_vs: number    // % win  (0–100)
  loss_pct_vs: number   // % loss (0–100)
}

export interface GameRecord {
  game_id: string
  name_duration: string
  datetime: string
  is_victory: boolean
  blue_kills: number
  red_kills: number
}


// Aggregated per-player stats across all games
export interface PlayerStats {
  player_name: string
  games_played: number
  wins: number
  losses: number
  win_rate: number
  heroes_played: string[]
  avg_fantasy_score: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_kda: number
  avg_golds: number
  avg_dmg_to_heroes: number
  avg_dmg_taken: number
  avg_participation: number
  avg_gold_tol: number
  avg_gold_jungle: number
  avg_last_hit: number
  avg_dmg_disable: number
  avg_dmg_heal: number
  avg_dmg_to_tw: number
}

// All data for a single game (joined)
export interface GameDetail {
  game: GameRecord
  players: GamePlayerDetail[]
}

export interface GamePlayerDetail {
  player_name: string
  hero_name: string
  side: "blue" | "red"
  fantasy_score: number
  kill: number
  death: number
  assist: number
  golds: number
  dmg_to_heroes: number
  dmg_taken: number
  participation: number
  gold_tol: number
  gold_jungle: number
  last_hit: number
  dmg_disable: number
  dmg_heal: number
  dmg_to_tw: number
  items: string[]
}

// ── Feature-specific aggregates ───────────────────────────────────────────────

// Final item loadout pattern, ranked by frequency instead of item-level win rate.
export interface BuildPattern {
  items: string[]
  games: number
  wins: number
  losses: number
  win_rate: number
}

// Per-hero detail bundle
export interface HeroPlayerRow {
  player_name: string
  games: number
  wins: number
  win_rate: number
  avg_fantasy: number
}

export interface HeroMatchupRow {
  enemy_hero: string
  games: number
  wins: number
  win_rate: number
}

export interface HeroDetail {
  hero_name: string
  roles: string[]
  meta: HeroMetaStat
  players: HeroPlayerRow[]
  builds: BuildPattern[]
  matchups: HeroMatchupRow[]
}

// Aggregated hero-vs-hero matchup used by Draft Helper.
export interface CounterRow {
  own_hero: string
  enemy_hero: string
  games: number
  wins: number
  win_rate: number
}

// ── Hero combinations that win together ──────────────────────────────────────────

export type HeroComboSize = 2 | 3 | 5

export interface HeroComboRow {
  group_size: number
  heroes: string[]
  games: number
  wins: number
  losses: number
  win_rate: number
}

// Per-game row for a player's history
export interface PlayerGameRow {
  game_id: string
  datetime: string
  hero_name: string
  side: "blue" | "red"
  result: "win" | "loss"
  name_duration: string
  fantasy_score: number
  kill: number
  death: number
  assist: number
  kda: number
  golds: number
  dmg_to_heroes: number
  dmg_taken: number
  participation: number
  gold_tol: number
  gold_jungle: number
  last_hit: number
  dmg_disable: number
  dmg_heal: number
  dmg_to_tw: number
  items: string[]
}
