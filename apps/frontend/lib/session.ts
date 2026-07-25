import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createToken,
  verifyToken,
  getDisplayName,
} from "./auth"

export type Session = { username: string; displayName: string }

/** Read and verify the current session from the request cookie. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const username = verifyToken(store.get(SESSION_COOKIE)?.value)
  if (!username) return null
  return { username, displayName: getDisplayName(username) }
}

/** Return the session or redirect to /login. Use at the top of protected pages. */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

/** Set the signed session cookie. Call only from a Server Action / Route Handler. */
export async function createSession(username: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

/** Clear the session cookie. Call only from a Server Action / Route Handler. */
export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
