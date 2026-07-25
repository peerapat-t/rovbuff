import type { ReactNode } from "react"
import Breadcrumb from "@/components/Breadcrumb"

type Crumb = { label: string; href?: string }

export function PageHeader({
  crumbs,
  kicker,
  title,
  description,
  icon,
  aside,
  accent = "#ef4444",
}: {
  crumbs: Crumb[]
  kicker: string
  title: string
  description: ReactNode
  icon?: string
  aside?: ReactNode
  accent?: string
}) {
  return (
    <header className="ui-panel">
      <div className="ui-panel-content p-5 sm:p-6">
        <Breadcrumb crumbs={crumbs} />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div
                className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-xl"
                style={{ background: `${accent}16`, border: `1px solid ${accent}55`, boxShadow: `0 0 20px ${accent}12` }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <p className="ui-kicker" style={{ color: accent }}>{kicker}</p>
              <h1 className="ui-page-title mt-1.5">{title}</h1>
              <p className="ui-copy mt-2 max-w-2xl">{description}</p>
            </div>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </div>
    </header>
  )
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  accent = "#ef4444",
}: {
  kicker?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  accent?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <div>
        {kicker && <p className="ui-kicker" style={{ color: accent }}>{kicker}</p>}
        <h2 className="ui-section-title mt-1">{title}</h2>
        {description && <p className="ui-copy mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
