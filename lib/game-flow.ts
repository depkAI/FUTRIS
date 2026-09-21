import type {
  ChoiceRecord,
  ColorKey,
  GameNode,
  GameState,
  Phase,
  RelationshipStatus,
} from '../types/game'

/** The only dependency game-flow has on the graph: node lookups by id. */
export interface GraphLike {
  getNode(id: string): GameNode | undefined
}

const DAYS_MAX = 31

export function makeInitialState(): GameState {
  return {
    phase: 'intro',
    color: null,
    characteristic: null,
    relationshipStatus: null,
    day: null,
    path: [],
    choices: [],
    revealed: false,
  }
}

/**
 * Replay `choices` against the graph to rebuild the derived fields. Because the
 * tree never merges before the day selector, the path is exactly the list of
 * child node ids each answered option led to (the day selector itself is not a
 * node we push — it is implied by the last question's options).
 */
export function derivePath(
  choices: ChoiceRecord[],
  resolve: (id: string) => GameNode | undefined,
): string[] {
  const path: string[] = []
  for (const c of choices) {
    const node = resolve(c.nodeId)
    if (!node) continue
    const opt = node.options.find((o) => o.id === c.optionId)
    if (!opt) continue
    const child = resolve(opt.nextNode)
    if (!child || child.kind === 'day' || child.kind === 'fortune') continue
    path.push(opt.nextNode)
  }
  return path
}

export interface Derived {
  color: ColorKey | null
  characteristic: string | null
  relationshipStatus: RelationshipStatus | null
  path: string[]
}

export function deriveFromChoices(
  choices: ChoiceRecord[],
  resolve: (id: string) => GameNode | undefined,
): Derived {
  const derived: Derived = { color: null, characteristic: null, relationshipStatus: null, path: [] }
  for (const c of choices) {
    const node = resolve(c.nodeId)
    if (!node) continue
    const opt = node.options.find((o) => o.id === c.optionId)
    if (!opt) continue
    const child = resolve(opt.nextNode)
    if (child && child.kind !== 'day' && child.kind !== 'fortune') derived.path.push(opt.nextNode)
    if (node.id === 'start') {
      derived.color = opt.nextNode as ColorKey
    } else if (node.kind === 'characteristic' && derived.color && opt.nextNode.startsWith(`${derived.color}-`)) {
      derived.characteristic = opt.nextNode.slice(`${derived.color}-`.length)
    } else if (node.kind === 'status') {
      derived.relationshipStatus = opt.theme as RelationshipStatus
    }
  }
  return derived
}

function phaseForNext(next: string | undefined, resolve: (id: string) => GameNode | undefined): Phase {
  const node = next ? resolve(next) : undefined
  if (!node) return 'q'
  if (node.kind === 'day') return 'days'
  if (node.kind === 'fortune') return 'reveal'
  return 'q'
}

/**
 * Apply one answer at `node`. Idempotent when the same option is re-selected.
 * When a previously answered node is answered differently, every downstream
 * choice is dropped and the number selector is cleared along with it — a
 * changed earlier answer wipes the rest of the journey.
 */
export function applyChoice(
  state: GameState,
  node: GameNode,
  optionId: string,
  resolve: (id: string) => GameNode | undefined,
): GameState {
  const option = node.options.find((o) => o.id === optionId)
  if (!option) return state

  const idx = state.choices.findIndex((c) => c.nodeId === node.id)
  if (idx !== -1 && state.choices[idx].optionId === optionId) return state

  const kept = idx === -1 ? state.choices : state.choices.slice(0, idx)
  const choices = [...kept, { nodeId: node.id, optionId }]
  const derived = deriveFromChoices(choices, resolve)
  const changedAnswer = idx !== -1 && state.choices[idx].optionId !== optionId

  return {
    ...state,
    ...derived,
    choices,
    phase: phaseForNext(option.nextNode, resolve),
    day: changedAnswer ? null : state.day,
    revealed: changedAnswer ? false : state.revealed,
  }
}

/** Move to the previous stage without touching derived values. */
export function back(state: GameState, resolve: (id: string) => GameNode | undefined): GameState {
  switch (state.phase) {
    case 'reveal':
    case 'result':
      if (state.day === null) return state
      return { ...state, phase: 'days', revealed: false }
    case 'days':
    case 'q': {
      if (state.choices.length === 0) return state
      const kept = state.choices.slice(0, -1)
      const derived = deriveFromChoices(kept, resolve)
      return {
        ...state,
        ...derived,
        choices: kept,
        phase: kept.length === 0 ? 'cups' : 'q',
      }
    }
    case 'cups':
    case 'intro':
    default:
      return state
  }
}

/** The number is locked forever — unless the player explicitly changes it. */
export function pickDay(state: GameState, day: number): GameState {
  if (state.day !== null) return state
  if (!Number.isInteger(day) || day < 1 || day > DAYS_MAX) return state
  return { ...state, day, phase: 'reveal', revealed: false }
}

/** Explicit "change my number" action; clears the locked choice. */
export function changeDay(state: GameState): GameState {
  if (state.day === null) return state
  return { ...state, day: null, phase: 'days', revealed: false }
}

const VALID_PHASES: Phase[] = ['intro', 'cups', 'q', 'days', 'reveal', 'result']
const VALID_COLORS: ColorKey[] = ['red', 'blue', 'green', 'yellow']
const VALID_STATUSES: RelationshipStatus[] = ['single', 'committed', 'breakup', 'one-sided']

/**
 * Sanitise a value loaded from storage. Anything malformed is rejected so the
 * app always starts from a coherent state instead of trusting corrupted JSON.
 */
export function validateSavedState(
  value: unknown,
  resolve: (id: string) => GameNode | undefined,
): GameState | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>

  const phase = VALID_PHASES.includes(raw.phase as Phase) ? (raw.phase as Phase) : null
  if (!phase) return null

  const color = VALID_COLORS.includes(raw.color as ColorKey) ? (raw.color as ColorKey) : null
  const characteristic =
    typeof raw.characteristic === 'string' ? (raw.characteristic as string) : null
  const relationshipStatus = VALID_STATUSES.includes(raw.relationshipStatus as RelationshipStatus)
    ? (raw.relationshipStatus as RelationshipStatus)
    : null
  const day =
    typeof raw.day === 'number' && Number.isInteger(raw.day) && raw.day >= 1 && raw.day <= DAYS_MAX
      ? raw.day
      : null

  if (!Array.isArray(raw.choices)) return null
  const choices: ChoiceRecord[] = []
  for (const entry of raw.choices) {
    if (typeof entry !== 'object' || entry === null) return null
    const e = entry as Record<string, unknown>
    if (typeof e.nodeId !== 'string' || typeof e.optionId !== 'string') return null
    choices.push({ nodeId: e.nodeId, optionId: e.optionId })
  }

  const derived = deriveFromChoices(choices, resolve)

  // A run that reached the number (`reveal`/`result`) must be a full 7-answer
  // journey with a chosen day; anything shorter is corrupted or truncated.
  if (phase === 'reveal' || phase === 'result') {
    if (choices.length !== 7 || !day) return null
  }

  return {
    phase,
    color: derived.color ?? color,
    characteristic: derived.characteristic ?? characteristic,
    relationshipStatus: derived.relationshipStatus ?? relationshipStatus,
    day,
    path: derived.path,
    choices,
    revealed: phase === 'result' || raw.revealed === true,
  }
}