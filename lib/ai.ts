import type { FortuneProfile } from '../types/game'
import { phraseFor } from './fortune-engine'

export interface AiResult {
  line1: string
  line2: string
  source: 'ai' | 'engine'
}

function payloadFor(profile: FortuneProfile) {
  return {
    color: profile.color,
    characteristic: profile.characteristic,
    relationshipStatus: profile.relationshipStatus,
    day: profile.day,
    dayMeaning: profile.dayMeaning.essence,
    themes: profile.pathThemes.map(phraseFor).slice(0, 8),
    tone: profile.tone,
  }
}

/**
 * Optional AI writing layer. AI only *writes* the fortune the deterministic
 * engine already computed — it never chooses the day, status or themes.
 * Any failure returns null so the caller falls back to the engine's lines.
 */
export async function enhanceFortune(profile: FortuneProfile): Promise<AiResult | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const res = await fetch('/api/fortune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(profile)),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { line1?: string; line2?: string; source?: string }
    if (
      data.source === 'ai' &&
      typeof data.line1 === 'string' &&
      data.line1.trim().length > 20 &&
      typeof data.line2 === 'string' &&
      data.line2.trim().length > 20
    ) {
      const strip = (s: string) => s.replace(/\s+/g, ' ').trim()
      return { line1: strip(data.line1), line2: strip(data.line2), source: 'ai' }
    }
    return null
  } catch {
    return null
  }
}