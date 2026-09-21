import { describe, it, expect } from 'vitest'
import {
  paperAxisForLevel,
  paperSurfaceFor,
  shortLabel,
  numberTileLabel,
  tileCount,
} from '../lib/paper-content'

describe('paper-content pure helpers', () => {
  it('level 1 stays closed on the outer colour flaps', () => {
    expect(paperAxisForLevel(1)).toBe('closed')
    expect(paperSurfaceFor(1)).toBe('colors')
  })

  it('question levels alternate the opening axis', () => {
    const seq = [2, 3, 4, 5, 6, 7].map((n) => paperAxisForLevel(n))
    expect(seq).toEqual(['a', 'b', 'a', 'b', 'a', 'b'])
    for (const n of seq) expect(n).not.toBe('closed')
  })

  it('level 8 (the number selector) and level 9 (reveal) open on axis a', () => {
    expect(paperAxisForLevel(8)).toBe('a')
    expect(paperAxisForLevel(9)).toBe('a')
    expect(paperSurfaceFor(8)).toBe('numbers')
    expect(paperSurfaceFor(9)).toBe('reveal')
  })

  it('shortLabel trims trailing pull phrases and ellipsifies long text', () => {
    expect(shortLabel('Patience — a soft word in a hard hour')).toBe('Patience')
    expect(shortLabel('An honest conversation that arrives quietly')).toContain('…')
    expect(shortLabel('short').length).toBeLessThanOrEqual(30)
  })

  it('number tiles cover 1–31 in 4 groups of 8/8/8/7', () => {
    expect(tileCount()).toBe(4)
    expect(numberTileLabel(0)).toBe('1–8')
    expect(numberTileLabel(1)).toBe('9–16')
    expect(numberTileLabel(2)).toBe('17–24')
    expect(numberTileLabel(3)).toBe('25–31')
  })
})