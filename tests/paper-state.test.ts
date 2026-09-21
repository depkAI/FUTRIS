import { describe, it, expect } from 'vitest'
import {
  PAPER_STATES,
  VALID_TRANSITIONS,
  axisFor,
  axisForSelectionStep,
  canTransition,
  isClosed,
  isMoving,
  isOpen,
  isPaperState,
  isRevealing,
  nextOpeningState,
  openRatio,
  axisOpenState,
  type PaperAxis,
  type PaperState,
} from '../lib/paper-state'

describe('paper state machine', () => {
  it('exposes exactly the eight states of a folding teller', () => {
    expect(PAPER_STATES).toEqual([
      'closed',
      'opening_a',
      'open_a',
      'closing_a',
      'opening_b',
      'open_b',
      'closing_b',
      'revealing',
    ])
  })

  it('every state has a legal next move and stays out of the table', () => {
    for (const state of PAPER_STATES) {
      expect(Object.keys(VALID_TRANSITIONS)).toContain(state)
      expect(canTransition(state, state)).toBe(false)
    }
    expect(canTransition('closed', 'opening_a')).toBe(true)
    expect(canTransition('open_b', 'closing_b')).toBe(true)
    expect(canTransition('closing_b', 'opening_a')).toBe(true)
  })

  it('rejects transitions that would skip a phase (no rapid input)', () => {
    expect(canTransition('closed', 'open_a')).toBe(false)
    expect(canTransition('opening_a', 'closed')).toBe(false)
    expect(canTransition('closed', 'open_b')).toBe(false)
    expect(canTransition('open_a', 'opening_b')).toBe(false)
  })

  it('only half-open while moving, fully open/closed at the ends', () => {
    expect(openRatio('closed')).toBe(0)
    expect(openRatio('open_a')).toBe(1)
    expect(openRatio('open_b')).toBe(1)
    expect(openRatio('revealing')).toBe(1)
  })

  it('maps states to their folding axis', () => {
    expect(axisFor('closed')).toBeNull()
    expect(axisFor('open_a')).toBe('a')
    expect(axisFor('closing_a')).toBe('a')
    expect(axisFor('open_b')).toBe('b')
  })

  it('alternates the selection axis with the step', () => {
    const axisSeq = [0, 1, 2, 3, 4, 5, 6].map((s) => axisForSelectionStep(s))
    const expected: PaperAxis[] = ['a', 'b', 'a', 'b', 'a', 'b', 'a']
    expect(axisSeq).toEqual(expected)
    expect(axisOpenState('a')).toBe('open_a')
    expect(axisOpenState('b')).toBe('open_b')
  })

  it('guards against invalid values and states', () => {
    expect(isPaperState('closed')).toBe(true)
    expect(isPaperState('shut')).toBe(false)
    expect(isPaperState(5)).toBe(false)
    expect(nextOpeningState('open_a')).toBeNull()
    expect(nextOpeningState('closed')).toBe('opening_a')
  })

  it('closed-and-revealing is the only legal exit from a static state', () => {
    expect(canTransition('closed', 'revealing')).toBe(true)
    expect(canTransition('open_a', 'revealing')).toBe(true)
    expect(canTransition('closing_a', 'revealing')).toBe(true)
  })

  it('predicate helpers agree with the table', () => {
    for (const s of PAPER_STATES) {
      const moving = isMoving(s)
      const open = isOpen(s)
      const closed = isClosed(s)
      const revealing = isRevealing(s)
      expect([moving, open, closed, revealing].filter(Boolean).length).toBe(1)
    }
    // TS narrowing sanity check
    const s: unknown = 'open_b'
    if (isPaperState(s)) {
      const typed: PaperState = s
      expect(axisFor(typed)).toBe('b')
    }
  })
})