import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, verifyToken } from "@/lib/auth"

// Paths that do NOT require a logged-in session.
const PUBLIC_PATHS = ["/", "/login"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const username = verifyToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (username) {
    return NextResponse.next()
  }

  // Not authenticated → send to login, remembering where they were headed.
  const loginUrl = new URL("/login", request.url)
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Run on every path except Next internals, API routes, and static assets.
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|img|.*\\.png$).*)"],
}
