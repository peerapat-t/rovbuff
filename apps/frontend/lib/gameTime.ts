// The end-of-match timestamp OCR'd from the result screen ("YYYY/MM/DD HH:MM").
// Separator and zero-padding can drift between captures, so games are ordered
// by this parsed value instead of comparing the raw strings.
export function gameEndTime(datetime: string | null | undefined): number {
  if (!datetime) return 0
  const m = String(datetime).match(
    /(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}))?/
  )
  if (!m) return 0
  const [, y, mo, d, h, mi, s] = m
  return new Date(+y, +mo - 1, +d, +h, +mi, s ? +s : 0).getTime()
}

export function byGameEndAsc(a: { datetime: string }, b: { datetime: string }): number {
  return gameEndTime(a.datetime) - gameEndTime(b.datetime)
}

export function byGameEndDesc(a: { datetime: string }, b: { datetime: string }): number {
  return gameEndTime(b.datetime) - gameEndTime(a.datetime)
}
