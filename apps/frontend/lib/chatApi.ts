import "server-only"

import { INTERNAL_API_KEY } from "@/lib/internalApi"
import type { Session } from "@/lib/session"

const CHAT_API = process.env.ROVBUFF_CHAT_URL || "http://localhost:8002"

export type CoachStyleOption = {
  id: string
  label: string
  subtitle: string
  body: string
}

type CoachStyleProfile = {
  coachStyle: string
  options: CoachStyleOption[]
}

export function chatBackendHeaders(session: Session): HeadersInit {
  return {
    "content-type": "application/json",
    "x-rovbuff-internal-key": INTERNAL_API_KEY,
    "x-rovbuff-user": session.username,
  }
}

export function chatBackendUrl(path: string): string {
  return `${CHAT_API}${path}`
}

export async function getCoachStyleProfile(session: Session): Promise<CoachStyleProfile> {
  const response = await fetch(chatBackendUrl("/profile/coach-style"), {
    headers: chatBackendHeaders(session),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`Coach style request failed with status ${response.status}`)
  }
  return response.json() as Promise<CoachStyleProfile>
}
