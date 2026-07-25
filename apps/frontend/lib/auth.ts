import crypto from "crypto"

type StoredUser = {
  username: string
  passwordHash: string
  displayName: string
}

type SessionPayload = {
  v: 2
  u: string
  iat: number
  exp: number
}

const DEV_USERS: StoredUser[] = [
  {
    username: "admin",
    passwordHash: "pbkdf2_sha256$210000$aCFlcG2zVINSnr-2By64uw$zOi6UVF0iTLqvBbwv139kkQeThsadpFWRdqoDTaDTeo",
    displayName: "Admin",
  },
  {
    username: "scout",
    passwordHash: "pbkdf2_sha256$210000$6mipwM66nSUGu_ZZFI6v_A$6dsjv06nofhE_9DOUM3_2kRFdCc9Ndftq7-BHs0mLUg",
    displayName: "Scout",
  },
]

export const SESSION_COOKIE = "rovbuff_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 // 1 day

function users(): StoredUser[] {
  const raw = process.env.ROVBUFF_USERS_JSON
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredUser[]
      return parsed.filter((u) => u.username && u.passwordHash && u.displayName)
    } catch {
      return []
    }
  }

  // Built-in accounts are available only during local development.
  return process.env.NODE_ENV === "production" ? [] : DEV_USERS
}

function secret(): string {
  return process.env.ROVBUFF_AUTH_SECRET || "dev-insecure-rovbuff-secret-change-me"
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url")
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb)
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, iterationsRaw, salt, expected] = storedHash.split("$")
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !salt || !expected) return false

  const iterations = Number(iterationsRaw)
  if (!Number.isSafeInteger(iterations) || iterations < 100_000) return false

  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url")
  return timingSafeStringEqual(actual, expected)
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SessionPayload>
    if (
      decoded.v !== 2 ||
      typeof decoded.u !== "string" ||
      typeof decoded.iat !== "number" ||
      typeof decoded.exp !== "number"
    ) {
      return null
    }
    return { v: 2, u: decoded.u, iat: decoded.iat, exp: decoded.exp }
  } catch {
    return null
  }
}

export function verifyCredentials(username: string, password: string): StoredUser | null {
  const user = users().find((u) => u.username === username)
  if (!user || !verifyPassword(password, user.passwordHash)) return null
  return user
}

export function getDisplayName(username: string): string {
  return users().find((u) => u.username === username)?.displayName ?? username
}

export function createToken(username: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = encodePayload({
    v: 2,
    u: username,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  })
  return `${payload}.${sign(payload)}`
}

/** Returns the username if the token signature and expiry are valid. */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null

  const idx = token.lastIndexOf(".")
  if (idx <= 0) return null

  const payloadValue = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  if (!timingSafeStringEqual(sig, sign(payloadValue))) return null

  const payload = decodePayload(payloadValue)
  const now = Math.floor(Date.now() / 1000)
  if (
    !payload ||
    payload.iat > now + 60 ||
    payload.exp <= now ||
    payload.exp - payload.iat > SESSION_MAX_AGE
  ) return null
  if (!users().some((u) => u.username === payload.u)) return null
  return payload.u
}
