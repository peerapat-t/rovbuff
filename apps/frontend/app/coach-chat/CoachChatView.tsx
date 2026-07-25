"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Thread = {
  thread_id: string
  title: string
  created_at: string
  updated_at: string
}

type Message = {
  message_id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  created_at: string
  metadata?: Record<string, unknown>
}

type SendResponse = {
  message: Message
  thread: Thread
}

type StreamEvent = {
  event: string
  data: unknown
}

const STARTER_PROMPTS = [
  "Violet ชนะทางตัวอะไร",
  "Hero อะไร Win Rate สูงที่สุด",
  "เกมล่าสุดแพ้เพราะอะไร",
  "ใครเล่นคู่กับผมแล้วชนะบ่อย",
]

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.detail ?? "Request failed")
  return data as T
}

function parseStreamEvent(block: string): StreamEvent | null {
  let event = "message"
  const dataLines: string[] = []
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
  }
  if (dataLines.length === 0) return null
  const raw = dataLines.join("\n")
  try {
    return { event, data: JSON.parse(raw) as unknown }
  } catch {
    return { event, data: raw }
  }
}

function errorDetail(data: unknown): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    return String(data.detail)
  }
  return "Chat stream failed"
}

function ToolCallHint({ message }: { message: Message }) {
  const calls = message.metadata?.tool_calls
  if (!Array.isArray(calls) || calls.length === 0) return null
  const names = calls
    .map((call) => typeof call === "object" && call !== null && "name" in call ? String(call.name) : "")
    .filter(Boolean)
  if (names.length === 0) return null
  return (
    <div className="mt-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      Tools: {[...new Set(names)].join(", ")}
    </div>
  )
}

export default function CoachChatView({ displayName }: { displayName: string }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeId, setActiveId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function applyStarter(text: string) {
    setInput(text)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  const activeThread = useMemo(
    () => threads.find((thread) => thread.thread_id === activeId) ?? null,
    [threads, activeId],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let list = await fetchJson<Thread[]>("/api/chat/threads", { cache: "no-store" })
        if (list.length === 0) {
          const created = await fetchJson<Thread>("/api/chat/threads", {
            method: "POST",
            body: JSON.stringify({ title: "New chat" }),
          })
          list = [created]
        }
        if (cancelled) return
        setThreads(list)
        setActiveId(list[0]?.thread_id ?? "")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    async function loadMessages() {
      setError(null)
      try {
        const list = await fetchJson<Message[]>(`/api/chat/threads/${encodeURIComponent(activeId)}/messages`, {
          cache: "no-store",
        })
        if (!cancelled) setMessages(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void loadMessages()
    return () => { cancelled = true }
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: sending ? "auto" : "smooth", block: "end" })
  }, [messages, sending])

  async function newThread() {
    setError(null)
    try {
      const thread = await fetchJson<Thread>("/api/chat/threads", {
        method: "POST",
        body: JSON.stringify({ title: "New chat" }),
      })
      setThreads((prev) => [thread, ...prev])
      setActiveId(thread.thread_id)
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteThread(threadId: string) {
    const target = threads.find((t) => t.thread_id === threadId)
    if (!window.confirm(`ลบแชท "${target?.title ?? "นี้"}" ?`)) return

    const prev = threads
    const remaining = prev.filter((t) => t.thread_id !== threadId)
    setThreads(remaining) // optimistic
    setError(null)
    try {
      await fetchJson(`/api/chat/threads/${encodeURIComponent(threadId)}`, { method: "DELETE" })
      if (activeId === threadId) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].thread_id)
        } else {
          // deleted the last thread — start a fresh empty one
          const created = await fetchJson<Thread>("/api/chat/threads", {
            method: "POST",
            body: JSON.stringify({ title: "New chat" }),
          })
          setThreads([created])
          setActiveId(created.thread_id)
          setMessages([])
        }
      }
    } catch (e) {
      setThreads(prev) // rollback
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function send() {
    const content = input.trim()
    if (!content || !activeId || sending) return
    const temp: Message = {
      message_id: `local-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    }
    const streamed: Message = {
      message_id: `stream-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }
    setInput("")
    setMessages((prev) => [...prev, temp, streamed])
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/chat/threads/${encodeURIComponent(activeId)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const raw = await res.text()
        let detail = "Request failed"
        try {
          detail = errorDetail(JSON.parse(raw) as unknown)
        } catch {
          if (raw) detail = raw
        }
        throw new Error(detail)
      }
      if (!res.body) throw new Error("Streaming is unavailable in this browser")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let completed = false

      const handleEvent = (item: StreamEvent) => {
        if (item.event === "delta") {
          const delta = typeof item.data === "object" && item.data !== null && "content" in item.data
            ? String(item.data.content)
            : ""
          if (!delta) return
          setMessages((prev) => prev.map((message) => (
            message.message_id === streamed.message_id
              ? { ...message, content: message.content + delta }
              : message
          )))
          return
        }

        if (item.event === "error") throw new Error(errorDetail(item.data))
        if (item.event !== "done" || typeof item.data !== "object" || item.data === null) return

        const done = item.data as SendResponse
        completed = true
        setMessages((prev) => prev.map((message) => (
          message.message_id === streamed.message_id ? done.message : message
        )))
        setThreads((prev) => [done.thread, ...prev.filter((thread) => thread.thread_id !== done.thread.thread_id)])
      }

      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        buffer = buffer.replace(/\r\n/g, "\n")
        let boundary = buffer.indexOf("\n\n")
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const item = parseStreamEvent(block)
          if (item) handleEvent(item)
          boundary = buffer.indexOf("\n\n")
        }
        if (done) break
      }

      if (!completed) throw new Error("Chat stream ended before the response was saved")
    } catch (e) {
      setMessages((prev) => prev.filter((m) => (
        m.message_id !== temp.message_id && m.message_id !== streamed.message_id
      )))
      setInput(content)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 lg:h-[calc(100dvh-19.5rem)] lg:min-h-[32rem] lg:max-h-[46rem] lg:grid-cols-[280px_1fr]">
      <aside
        className="ui-panel flex max-h-[14rem] min-h-0 flex-col lg:h-full lg:max-h-none"
      >
        <div className="p-3 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="text-sm font-bold text-white">Threads</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{displayName}</div>
          </div>
          <button
            type="button"
            onClick={newThread}
            className="ui-control px-3 py-1.5 text-xs font-bold"
          >
            New
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
          {threads.map((thread) => {
            const active = thread.thread_id === activeId
            return (
              <div
                key={thread.thread_id}
                className="group relative rounded-lg"
                style={{
                  background: active ? "rgba(239,68,68,0.11)" : "transparent",
                  border: `1px solid ${active ? "rgba(239,68,68,0.32)" : "transparent"}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(thread.thread_id)}
                  className="w-full text-left rounded-lg pl-3 pr-9 py-2"
                  style={{ color: active ? "#fff" : "var(--text-muted)" }}
                >
                  <div className="text-sm font-semibold truncate">{thread.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(thread.updated_at).toLocaleString()}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteThread(thread.thread_id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white/10"
                  style={{ color: "var(--text-muted)" }}
                  title="Delete chat"
                  aria-label={`Delete chat ${thread.title}`}
                >
                  🗑
                </button>
              </div>
            )
          })}
          {loading && <p className="text-sm p-3" style={{ color: "var(--text-muted)" }}>Loading...</p>}
        </div>
      </aside>

      <section
        className="ui-panel flex h-[70dvh] min-h-[32rem] max-h-[44rem] flex-col lg:h-full lg:min-h-0 lg:max-h-none"
      >
        <div className="shrink-0 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-sm font-bold text-white">{activeThread?.title ?? "Coach Chat"}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your personal coach with match, player, hero, draft, and review tools
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="max-w-xl space-y-3">
              <div className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                เริ่มด้วยคำถามเหล่านี้ หรือพิมพ์คำถามของคุณเอง
              </div>
              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyStarter(prompt)}
                    className="text-left text-sm rounded-full px-3.5 py-2 transition-colors hover:text-white"
                    style={{
                      background: "rgba(2,4,12,.35)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const mine = message.role === "user"
            const streaming = message.message_id.startsWith("stream-")
            return (
              <div key={message.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-xl px-4 py-3"
                  style={{
                    background: mine ? "rgba(239,68,68,0.14)" : "rgba(2,4,12,.38)",
                    border: `1px solid ${mine ? "rgba(239,68,68,0.34)" : "var(--border)"}`,
                    color: "var(--text)",
                  }}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content || (streaming ? "Thinking..." : "")}
                    {streaming && message.content && (
                      <span className="ml-0.5 inline-block animate-pulse" style={{ color: "var(--accent)" }}>▍</span>
                    )}
                  </div>
                  {!mine && <ToolCallHint message={message} />}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="shrink-0 px-4 py-2 text-sm" style={{ color: "#fca5a5", borderTop: "1px solid var(--border)" }}>
            {error}
          </div>
        )}

        <div className="shrink-0 p-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder="Ask about your matches, heroes, builds, or performance..."
            rows={2}
            className="ui-input flex-1 resize-none px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="btn-accent px-5 rounded-lg text-sm font-bold text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  )
}
