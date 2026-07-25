import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { EXTRACTOR_API } from "@/lib/extractorApi"
import { internalHeaders } from "@/lib/internalApi"

// Returns the guided player-name list from the extractor backend.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch(
      `${EXTRACTOR_API}/config/players?user=${encodeURIComponent(session.username)}`,
      { cache: "no-store", headers: internalHeaders() },
    )
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    // Non-fatal: the UI just starts with an empty guided list.
    return NextResponse.json({ players: [] })
  }
}

// Persists the guided player-name list to the backend txt file.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  const { players } = await req.json()
  if (!Array.isArray(players)) {
    return NextResponse.json({ detail: "players must be an array" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${EXTRACTOR_API}/config/players?user=${encodeURIComponent(session.username)}`,
      {
        method: "POST",
        headers: internalHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ players }),
      },
    )
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    return NextResponse.json(
      { detail: "Extractor backend unreachable. Is the FastAPI server running?" },
      { status: 502 },
    )
  }
}
