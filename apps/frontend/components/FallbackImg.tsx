"use client"

/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes, ReactNode } from "react"
import { useState } from "react"

const DEFAULT_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError" | "alt"> {
  alt: string
  basePath: string
  extensions?: readonly string[]
  fallback?: ReactNode
}

export default function FallbackImg({
  alt,
  basePath,
  extensions = DEFAULT_EXTENSIONS,
  fallback = null,
  ...props
}: Props) {
  const [fallbackState, setFallbackState] = useState<{ basePath: string; index: number } | null>(null)
  const index = fallbackState?.basePath === basePath ? fallbackState.index : 0

  if (index >= extensions.length) {
    return fallback
  }

  return (
    <img
      {...props}
      alt={alt}
      src={`${basePath}.${extensions[index]}`}
      onError={() => setFallbackState({ basePath, index: index + 1 })}
    />
  )
}
