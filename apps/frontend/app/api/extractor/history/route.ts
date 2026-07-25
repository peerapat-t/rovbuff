import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { EXTRACTOR_API } from "@/lib/extractorApi"
import { internalHeaders } from "@/lib/internalApi"

// Lists the signed-in user's own uploaded games.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  let res: Response
  try {
    res = await fetch(`${EXTRACTOR_API}/history?user=${encodeURIComponent(session.username)}`, {
      cache: "no-store",
      headers: internalHeaders(),
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
