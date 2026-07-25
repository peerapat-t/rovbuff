"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { login, type LoginState } from "./actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-accent w-full px-5 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in →"}
    </button>
  )
}

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}>
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="ui-input w-full px-4 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="ui-input w-full px-4 py-2.5 text-sm"
        />
      </div>

      {state.error && (
        <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
