import Link from "next/link"

type Crumb = { label: string; href?: string }

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
      {crumbs.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="mx-1 opacity-50">/</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-[var(--accent)] transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-white">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
