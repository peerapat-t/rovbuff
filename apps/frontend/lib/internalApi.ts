export const INTERNAL_API_KEY = process.env.ROVBUFF_INTERNAL_API_KEY || "dev-internal-key"

export function internalHeaders(extra?: HeadersInit): HeadersInit {
  return {
    ...extra,
    "x-rovbuff-internal-key": INTERNAL_API_KEY,
  }
}
