import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { chatHeaders, chatUrl, proxyChat } from "../_proxy"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })

  return proxyChat(() =>
    fetch(chatUrl("/threads"), {
      cache: "no-store",
      headers: chatHeaders(session),
    }),
  )
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  const body = await req.text()

  return proxyChat(() =>
    fetch(chatUrl("/threads"), {
      method: "POST",
      headers: chatHeaders(session),
      body: body || "{}",
    }),
  )
}
