"use client"
import Link from "next/link"
import FallbackImg from "@/components/FallbackImg"

const HERO_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "svg"] as const

const HERO_COLORS: Record<string, string> = {
  // Heroes with hand-crafted color accents
  Zephys:       "#7c3aed",
  Sephera:      "#2563eb",
  Taara:        "#dc2626",
  "Tel'Annas":  "#16a34a",
  Veera:        "#9333ea",
  Zill:         "#0891b2",
  Krixi:        "#d97706",
  Hayate:       "#059669",
  Gildur:       "#b45309",
  Omen:         "#6d28d9",
  // Carry
  Brian:        "#dc2626",
  Fennik:       "#dc2626",
  Kaine:        "#dc2626",
  Laville:      "#dc2626",
  Valhein:      "#dc2626",
  Violet:       "#dc2626",
  Yorn:         "#dc2626",
  // Mid
  Aleister:     "#9333ea",
  "Azzen'Ka":   "#9333ea",
  "Eland'orr":  "#9333ea",
  Erin:         "#9333ea",
  Ignis:        "#9333ea",
  Kahlii:       "#9333ea",
  Lauriel:      "#9333ea",
  Liliana:      "#9333ea",
  Natalya:      "#9333ea",
  Tulen:        "#9333ea",
  // Jungle
  Airi:         "#16a34a",
  Butterfly:    "#16a34a",
  Florentino:   "#16a34a",
  "Kil'Groth":  "#16a34a",
  Murad:        "#16a34a",
  Qi:           "#16a34a",
  Raz:          "#16a34a",
  Skud:         "#16a34a",
  Tioro:        "#16a34a",
  Volkath:      "#16a34a",
  Yan:          "#16a34a",
  Zanis:        "#16a34a",
  // Offlane
  Allain:       "#d97706",
  Arthur:       "#d97706",
  Maloch:       "#d97706",
  "Y'bneth":    "#d97706",
  // Roam
  Alice:        "#2563eb",
  Aoi:          "#2563eb",
  Arum:         "#2563eb",
  Dolia:        "#2563eb",
  Errol:        "#2563eb",
  Grakk:        "#2563eb",
  Iggy:         "#2563eb",
  Rouie:        "#2563eb",
  TeeMee:       "#2563eb",
  Thorne:       "#2563eb",
  Zip:          "#2563eb",
}

const HERO_IMAGE_ALIASES: Record<string, string> = {
  Brian: "Biron",
  Tioro: "Toro",
}

function heroImageName(hero: string): string {
  return HERO_IMAGE_ALIASES[hero] ?? hero
}

function encodeAssetName(name: string): string {
  return encodeURIComponent(name).replace(/'/g, "%27")
}

// `fill` makes the avatar stretch to its parent box (parent should set size +
// overflow-hidden + rounding); default renders a fixed-size circle.
export function HeroAvatar({ hero, size = 20, fill = false }: { hero: string; size?: number; fill?: boolean }) {
  const color = HERO_COLORS[hero] ?? "#374151"
  const dims = fill ? { width: "100%", height: "100%" } : { width: size, height: size }
  const fallback = (
    <span className={`${fill ? "" : "rounded-full "}flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ ...dims, background: color, fontSize: fill ? "1.3rem" : size * 0.5 }}>
      {hero[0]}
    </span>
  )

  return (
    <FallbackImg
      basePath={`/img/hero_img/${encodeAssetName(heroImageName(hero))}`}
      extensions={HERO_IMAGE_EXTENSIONS}
      fallback={fallback}
      alt={hero}
      width={size}
      height={size}
      className={`${fill ? "" : "rounded-full "}object-cover flex-shrink-0`}
      style={dims}
    />
  )
}

// `link` defaults to true so heroes are clickable everywhere. Set link={false}
// when the tag is already nested inside an outer <Link> to avoid nested anchors.
export default function HeroTag({ hero, link = true }: { hero: string; link?: boolean }) {
  const color = HERO_COLORS[hero] ?? "#374151"
  const inner = (
    <>
      <HeroAvatar hero={hero} size={24} />
      {hero}
    </>
  )
  const className = "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-80"
  const style = { background: color + "22", border: `1px solid ${color}55`, color }

  if (!link) {
    return <span className={className} style={style}>{inner}</span>
  }
  return (
    <Link href={`/all-heroes/${encodeURIComponent(hero)}`} className={className} style={style}>
      {inner}
    </Link>
  )
}
