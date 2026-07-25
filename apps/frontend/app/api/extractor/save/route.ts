import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { EXTRACTOR_API } from "@/lib/extractorApi"
import { internalHeaders } from "@/lib/internalApi"

// Saves reviewed tables and screenshots to the database, attributing the game
// to the signed-in user.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  const incoming = await req.formData()
  const game_id = incoming.get("game_id")
  const tables = incoming.get("tables")
  if (typeof game_id !== "string" || typeof tables !== "string") {
    return NextResponse.json({ detail: "game_id and tables are required" }, { status: 400 })
  }

  const out = new FormData()
  out.set("uploaded_by", session.username)
  out.set("game_id", game_id)
  out.set("tables", tables)
  for (const slot of ["page1", "page2", "page3", "page4"]) {
    const file = incoming.get(slot)
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: `Missing image for ${slot}` }, { status: 400 })
    }
    out.set(slot, file)
  }

  let res: Response
  try {
    res = await fetch(`${EXTRACTOR_API}/save`, {
      method: "POST",
      headers: internalHeaders(),
      body: out,
    })
  } catch {
    return NextResponse.json(
      { detail: "Extractor backend unreachable. Is the FastAPI server running?" },
      { status: 502 },
    )
  }

  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  })
}
