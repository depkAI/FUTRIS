import type { PaperAxis } from './paper-state'

export const PAPER_SURFACES = ['colors', 'options', 'numbers', 'reveal'] as const
export type PaperSurface = (typeof PAPER_SURFACES)[number]

/**
 * Which fold axis surfaces the given game level: level 1 stays on the closed
 * outer flaps (the four colours), levels 2–7 alternate axes, the number
 * selector and reveal open on axis a.
 */
export function paperAxisForLevel(level: number): PaperAxis | 'closed' {
  if (level <= 1) return 'closed'
  if (level === 8 || level === 9) return 'a'
  return level % 2 === 0 ? 'a' : 'b'
}

/** The surface shown for a given mode. */
export function paperSurfaceFor(level: number): PaperSurface {
  if (level === 1) return 'colors'
  if (level === 8) return 'numbers'
  if (level === 9) return 'reveal'
  return 'options'
}

/** Shorten a long option label to fit a triangular paper panel. */
export function shortLabel(text: string, max = 30): string {
  const trimmed = text.split(' — ')[0] || text
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

const TILE_BREAKS = [8, 16, 24, 31]

/** Number tiles drawn inside the paper before the real day selector. */
export function numberTileLabel(n: number): string {
  const start = n === 0 ? 1 : TILE_BREAKS[n - 1] + 1
  const end = TILE_BREAKS[n]
  return `${start}–${end}`
}

export function tileCount(): number {
  return TILE_BREAKS.length
}