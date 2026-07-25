import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { EXTRACTOR_API } from "@/lib/extractorApi"
import { internalHeaders } from "@/lib/internalApi"

// Deletes one of the signed-in user's games. The backend re-checks ownership.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let res: Response
  try {
    res = await fetch(
      `${EXTRACTOR_API}/games/${encodeURIComponent(id)}?user=${encodeURIComponent(session.username)}`,
      { method: "DELETE", headers: internalHeaders() },
    )
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
