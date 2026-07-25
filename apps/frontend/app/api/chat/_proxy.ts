import { NextResponse } from "next/server"
import { chatBackendHeaders, chatBackendUrl } from "@/lib/chatApi"
import type { Session } from "@/lib/session"

export function chatHeaders(session: Session): HeadersInit {
  return chatBackendHeaders(session)
}

export async function proxyChat(resolver: () => Promise<Response>): Promise<NextResponse> {
  let res: Response
  try {
    res = await resolver()
  } catch {
    return NextResponse.json(
      { detail: "Chat backend unreachable. Is backend_chat running on port 8002?" },
      { status: 502 },
    )
  }

  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  })
}

export async function proxyChatStream(resolver: () => Promise<Response>): Promise<Response> {
  let res: Response
  try {
    res = await resolver()
  } catch {
    return NextResponse.json(
      { detail: "Chat backend unreachable. Is backend_chat running on port 8002?" },
      { status: 502 },
    )
  }

  if (!res.ok) {
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    })
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  })
}

export function chatUrl(path: string): string {
  return chatBackendUrl(path)
}
