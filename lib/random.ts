export function hashStr(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic per-string pseudo random generator. */
export function seeded(seedString: string): () => number {
  return mulberry32(hashStr(seedString))
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function pickIndex(rng: () => number, length: number): number {
  return Math.floor(rng() * length)
}

/** Returns `count` distinct indices in [0, length). */
export function pickDistinct(rng: () => number, length: number, count: number): number[] {
  const seen = new Set<number>()
  let guard = 0
  while (seen.size < count && guard < length * 4) {
    seen.add(pickIndex(rng, length))
    guard++
  }
  return Array.from(seen)
}

export function slugify(word: string, max = 3): string {
  const cleaned = word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return cleaned.slice(0, max)
}