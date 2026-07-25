import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import { getAllPlayerStats, getHeroMetaStats } from "@/lib/data"
import { getSession } from "@/lib/session"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RoVBuff - Your Personal RoV Coach",
  description: "Your personal RoV coach. Upload your matches, understand your performance, and turn every game into progress.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // Command search is scoped to the signed-in user's own data (empty when logged out).
  const players = session ? getAllPlayerStats(session.username).map((p) => p.player_name) : []
  const heroes = session ? getHeroMetaStats(session.username).map((h) => h.hero_name) : []

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Navbar searchPlayers={players} searchHeroes={heroes} session={session} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
