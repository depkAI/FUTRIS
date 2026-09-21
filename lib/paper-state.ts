/**
 * Paper fortune-teller state machine.
 *
 * This is deliberately independent of the game/branching engine: the paper
 * component only ever folds, unfolds, and surfaces content. Valid transitions
 * follow the two alternating opening axes and a terminal "revealing" pose.
 */

export const PAPER_STATES = [
  'closed',
  'opening_a',
  'open_a',
  'closing_a',
  'opening_b',
  'open_b',
  'closing_b',
  'revealing',
] as const

export type PaperState = (typeof PAPER_STATES)[number]

export type PaperAxis = 'a' | 'b'

export const VALID_TRANSITIONS: Record<PaperState, PaperState[]> = {
  closed: ['opening_a', 'revealing'],
  opening_a: ['open_a', 'closing_a', 'revealing'],
  open_a: ['closing_a', 'closed', 'revealing'],
  closing_a: ['opening_b', 'closed', 'revealing'],
  opening_b: ['open_b', 'closing_b', 'revealing'],
  open_b: ['closing_b', 'closed', 'revealing'],
  closing_b: ['opening_a', 'closed', 'revealing'],
  revealing: ['closed'],
}

export function isPaperState(value: unknown): value is PaperState {
  return typeof value === 'string' && (PAPER_STATES as readonly string[]).includes(value)
}

export function axisFor(state: PaperState): PaperAxis | null {
  if (state === 'opening_a' || state === 'open_a' || state === 'closing_a') return 'a'
  if (state === 'opening_b' || state === 'open_b' || state === 'closing_b') return 'b'
  return null
}

export function isOpen(state: PaperState): boolean {
  return state === 'open_a' || state === 'open_b'
}

export function isMoving(state: PaperState): boolean {
  return (
    state === 'opening_a' ||
    state === 'closing_a' ||
    state === 'opening_b' ||
    state === 'closing_b'
  )
}

export function isClosed(state: PaperState): boolean {
  return state === 'closed'
}

export function isRevealing(state: PaperState): boolean {
  return state === 'revealing'
}

export function openRatio(state: PaperState): 0 | 1 {
  return isOpen(state) || isRevealing(state) ? 1 : 0
}

export function nextOpeningState(state: PaperState): PaperState | null {
  const candidates = VALID_TRANSITIONS[state] ?? []
  return candidates.find((c) => c.startsWith('opening_')) ?? null
}

export function canTransition(from: PaperState, to: PaperState): boolean {
  return (VALID_TRANSITIONS[from] as readonly PaperState[]).includes(to)
}

/**
 * The selection sequence alternates the opening axis. Selection step 0 uses
 * axis a, step 1 axis b, and so on — matching how a real paper teller is
 * flipped from one pair of pockets to the other.
 */
export function axisForSelectionStep(step: number): PaperAxis {
  return step % 2 === 0 ? 'a' : 'b'
}

export function axisOpenState(axis: PaperAxis): PaperState {
  return axis === 'a' ? 'open_a' : 'open_b'
}