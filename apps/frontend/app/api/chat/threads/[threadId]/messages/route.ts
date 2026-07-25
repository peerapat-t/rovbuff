import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { chatHeaders, chatUrl, proxyChat, proxyChatStream } from "../../../_proxy"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  const { threadId } = await params

  return proxyChat(() =>
    fetch(chatUrl(`/threads/${encodeURIComponent(threadId)}/messages`), {
      cache: "no-store",
      headers: chatHeaders(session),
    }),
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  const { threadId } = await params
  const body = await req.text()

  return proxyChatStream(() =>
    fetch(chatUrl(`/threads/${encodeURIComponent(threadId)}/messages/stream`), {
      method: "POST",
      headers: chatHeaders(session),
      body,
    }),
  )
}
