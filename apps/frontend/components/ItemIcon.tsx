"use client"
import Image from "next/image"
import { useState } from "react"

const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const

function encodeAssetName(name: string): string {
  return encodeURIComponent(name)
}

interface Props {
  item: string
  size?: number
}

export default function ItemIcon({ item, size = 32 }: Props) {
  const [fallbackState, setFallbackState] = useState<{ item: string; index: number } | null>(null)
  const index = fallbackState?.item === item ? fallbackState.index : 0
  const hasImage = index < IMAGE_EXTENSIONS.length
  const src = `/img/item_img/${encodeAssetName(item)}.${IMAGE_EXTENSIONS[index]}`

  const abbr = item
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <span
      className="relative inline-flex items-center justify-center rounded-md overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: "#1e293b", border: "1px solid #334155" }}
      title={item}
    >
      {hasImage ? (
        <Image
          src={src}
          alt={item}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setFallbackState({ item, index: index + 1 })}
          unoptimized
        />
      ) : (
        <span className="text-gray-400 font-bold" style={{ fontSize: size * 0.35 }}>
          {abbr}
        </span>
      )}
    </span>
  )
}
