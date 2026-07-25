import { getSession } from "@/lib/session"
import { chatHeaders, chatUrl, proxyChat } from "../../chat/_proxy"

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ detail: "Unauthorized" }, { status: 401 })

  return proxyChat(() =>
    fetch(chatUrl("/profile/coach-style"), {
      headers: chatHeaders(session),
      cache: "no-store",
    }),
  )
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ detail: "Unauthorized" }, { status: 401 })

  const body = await req.text()
  return proxyChat(() =>
    fetch(chatUrl("/profile/coach-style"), {
      method: "POST",
      headers: chatHeaders(session),
      body,
      cache: "no-store",
    }),
  )
}
