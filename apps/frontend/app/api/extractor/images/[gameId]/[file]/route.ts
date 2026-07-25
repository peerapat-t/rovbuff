import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { EXTRACTOR_API } from "@/lib/extractorApi"
import { internalHeaders } from "@/lib/internalApi"

// Streams a screenshot from the extractor backend (auth-gated).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string; file: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  const { gameId, file } = await params

  let res: Response
  try {
    res = await fetch(
      `${EXTRACTOR_API}/images/${encodeURIComponent(gameId)}/${encodeURIComponent(file)}?user=${encodeURIComponent(session.username)}`,
      { cache: "no-store", headers: internalHeaders() },
    )
  } catch {
    return NextResponse.json({ detail: "Extractor backend unreachable" }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ detail: "Image not found" }, { status: res.status })
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: { "content-type": res.headers.get("content-type") ?? "image/png" },
  })
}
