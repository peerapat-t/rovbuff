import { ImageResponse } from "next/og"
import { getPlayerStats } from "@/lib/data"
import { getSession } from "@/lib/session"

// Shareable stat card for a player — 1200×630 social image.
// GET /api/card/<player name> — scoped to the signed-in user's own data.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getSession()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { name } = await params
  const playerName = decodeURIComponent(name)
  const s = getPlayerStats(playerName, session.username)

  if (!s) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#02040c", color: "#e8eeff", fontSize: 48 }}>
          Player not found
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  const wr = Math.round(s.win_rate * 100)
  const kda = s.avg_kda.toFixed(2)

  const stat = (label: string, value: string, color: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 22, color: "#5d7099", textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      <span style={{ fontSize: 64, fontWeight: 800, color }}>{value}</span>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #02040c 0%, #0c1222 100%)",
          color: "#e8eeff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#ef4444" }}>RoVBuff</span>
          <span style={{ fontSize: 24, color: "#5d7099" }}>Player Stat Card</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 80, fontWeight: 800 }}>{playerName}</span>
          <span style={{ fontSize: 28, color: "#5d7099" }}>
            {s.games_played} games · {s.wins}W {s.losses}L
          </span>
        </div>

        <div style={{ display: "flex", gap: 80 }}>
          {stat("Win Rate", `${wr}%`, wr >= 50 ? "#22c55e" : "#ef4444")}
          {stat("Avg KDA", kda, "#f59e0b")}
          {stat("Fantasy", s.avg_fantasy_score.toFixed(1), "#a855f7")}
          {stat("Dmg/Game", Math.round(s.avg_dmg_to_heroes).toLocaleString(), "#e8eeff")}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
