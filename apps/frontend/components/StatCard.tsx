interface StatCardProps {
  label: string
  value: string | number
  color?: string
}

export default function StatCard({ label, value, color }: StatCardProps) {
  const accentColor = color ?? "#e8eeff"
  return (
    <div
      className="ui-card ui-card-hover p-4 flex flex-col gap-1 relative overflow-hidden"
      style={{
        boxShadow: `inset 0 1px 0 ${accentColor}10`,
      }}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)` }} />
      <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-black" style={{ color: accentColor }}>
        {value}
      </p>
    </div>
  )
}
