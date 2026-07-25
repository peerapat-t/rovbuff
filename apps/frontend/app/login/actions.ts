"use server"

import { redirect } from "next/navigation"
import { verifyCredentials } from "@/lib/auth"
import { createSession, clearSession } from "@/lib/session"

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "/")

  const user = verifyCredentials(username, password)
  if (!user) {
    return { error: "Invalid username or password" }
  }

  await createSession(user.username)
  // Only allow same-site relative redirects.
  redirect(next.startsWith("/") ? next : "/")
}

export async function logout(): Promise<void> {
  await clearSession()
  redirect("/")
}
