export default function CoachStyleBadge({
  label,
  subtitle,
}: {
  label: string
  subtitle?: string
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(239,68,68,0.09)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: "#fed7aa",
      }}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "#f87171" }}>
        Coach
      </span>
      <span className="text-sm font-black text-white">{label}</span>
      {subtitle && (
        <span className="hidden sm:inline text-xs" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}
