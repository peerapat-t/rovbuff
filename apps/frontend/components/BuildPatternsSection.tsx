"use client"
import ItemIcon from "@/components/ItemIcon"
import type { BuildPattern } from "@/lib/types"

const fmtP = (n: number) => `${(n * 100).toFixed(0)}%`

export default function BuildPatternsSection({
  builds,
}: {
  builds: BuildPattern[]
}) {
  if (builds.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No build pattern data yet.</p>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {builds.map((build, index) => (
        <div
          key={`${build.items.join("__")}-${index}`}
          className="ui-card ui-card-hover p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              #{index + 1}
            </span>
            <div className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {build.games} games
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {build.items.map((item, itemIndex) => (
              <ItemIcon key={`${item}-${itemIndex}`} item={item} size={34} />
            ))}
            {build.items.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>No completed items</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--text-muted)" }}>Record</span>
            <span className="font-semibold tabular-nums">
              <span className="text-green-400">{build.wins}W</span>
              <span style={{ color: "var(--text-muted)" }}> / </span>
              <span className="text-red-400">{build.losses}L</span>
              <span style={{ color: "var(--text-muted)" }}> - </span>
              <span style={{ color: build.win_rate >= 0.5 ? "#22c55e" : "#ef4444" }}>
                {fmtP(build.win_rate)}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
