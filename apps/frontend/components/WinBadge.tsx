export default function WinBadge({ result }: { result: "win" | "loss" }) {
  return (
    <span
      className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
      style={{
        background: result === "win" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        border: `1px solid ${result === "win" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
        color: result === "win" ? "#22c55e" : "#ef4444",
      }}
    >
      {result === "win" ? "WIN" : "LOSS"}
    </span>
  )
}
