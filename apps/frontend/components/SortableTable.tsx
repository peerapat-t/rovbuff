"use client"
import { useState } from "react"

export interface ColDef<T> {
  key: keyof T
  label: string
  align?: "left" | "center" | "right"
  sortable?: boolean          // default true
  defaultDir?: "asc" | "desc"
}

interface Props<T extends object> {
  columns: ColDef<T>[]
  rows: T[]
  defaultSort?: keyof T
  defaultDir?: "asc" | "desc"
  renderRow: (row: T, index: number) => React.ReactNode
  rowKey: (row: T) => string
}

export default function SortableTable<T extends object>({
  columns,
  rows,
  defaultSort,
  defaultDir = "desc",
  renderRow,
  rowKey,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSort ?? null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir)

  const handleSort = (key: keyof T) => {
    if (columns.find((c) => c.key === key)?.sortable === false) return
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(columns.find((c) => c.key === key)?.defaultDir ?? "desc")
    }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        let cmp = 0
        if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""))
        }
        return sortDir === "asc" ? cmp : -cmp
      })
    : rows

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((col) => {
              const sortable = col.sortable !== false
              const active = sortKey === col.key
              return (
                <th
                  key={String(col.key)}
                  onClick={() => sortable && handleSort(col.key)}
                  className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap select-none ${
                    col.align === "right" ? "text-right" :
                    col.align === "center" ? "text-center" : "text-left"
                  } ${sortable ? "cursor-pointer hover:text-white" : ""}`}
                  style={{ color: active ? "#fff" : "var(--text-muted)" }}
                >
                  {col.label}
                  {sortable && (
                    <span className="ml-1 text-xs" style={{ color: active ? "#ef4444" : "#3d4e6d" }}>
                      {active ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={rowKey(row)}>{renderRow(row, i)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
