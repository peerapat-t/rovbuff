import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { chatHeaders, chatUrl, proxyChat } from "../../_proxy"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  const { threadId } = await params

  return proxyChat(() =>
    fetch(chatUrl(`/threads/${encodeURIComponent(threadId)}`), {
      method: "DELETE",
      headers: chatHeaders(session),
    }),
  )
}
