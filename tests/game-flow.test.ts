import { describe, it, expect } from 'vitest'
import type { GameNode, GameState } from '../types/game'
import { GAME_GRAPH, DAY_NODE_ID } from '../lib/game-graph'
import {
  applyChoice,
  back,
  changeDay,
  deriveFromChoices,
  derivePath,
  makeInitialState,
  pickDay,
  validateSavedState,
} from '../lib/game-flow'

const resolve = (id: string): GameNode | undefined => GAME_GRAPH.getNode(id)

/** Walk by always choosing option index `fn(node)` until the day selector. */
function walkToDay(choice: (node: GameNode) => number, day = 14): GameState {
  let state = makeInitialState()
  state = { ...state, phase: 'cups' }
  let node = resolve('start') as GameNode
  let guard = 0
  while (node && guard < 30) {
    guard++
    if (node.kind === 'day') break
    const opt = node.options[choice(node)]
    state = applyChoice(state, node, opt.id, resolve)
    const next = resolve(opt.nextNode)
    node = (next as GameNode) ?? node
    if (node.kind === 'fortune') break
  }
  return pickDay(state, day)
}

const first = (node: GameNode) => {
  if (node.id === 'start') return 1 // blue
  if (node.kind === 'status') return 0 // single
  return 0
}

describe('game-flow: choosing', () => {
  it('starts on the intro screen', () => {
    expect(makeInitialState().phase).toBe('intro')
  })

  it('a first choice lands on the characteristic question and records the branch', () => {
    const state = walkToDay(first)
    expect(state.color).toBe('blue')
    expect(state.phase).toBe('reveal')
    expect(state.path.length).toBe(6)
    expect(state.choices.length).toBe(7)
    expect(state.day).toBe(14)
  })

  it('re-selecting the same answer on the same node is idempotent', () => {
    let state = makeInitialState()
    state = { ...state, phase: 'cups' }
    const node = resolve('start') as GameNode
    const after = applyChoice(state, node, node.options[1].id, resolve)
    const again = applyChoice(after, node, node.options[1].id, resolve)
    expect(again).toBe(after)
  })

  it('changing an answer at a previously answered node clears downstream', () => {
    const state = walkToDay(first)
    const characteristicNode = resolve(state.path[0]) as GameNode
    const differentOpt = characteristicNode.options[characteristicNode.options.length - 1]
    const changed = applyChoice(state, characteristicNode, differentOpt.id, resolve)
    expect(changed.day).toBeNull()
    expect(changed.revealed).toBe(false)
    expect(changed.path.length).toBe(2)
    expect(changed.choices.length).toBe(2)
  })

  it('the day selector is exited only when every answer forms a 7-step path', () => {
    const state = walkToDay(first, 15)
    expect(state.day).toBe(15)
    expect(state.phase).toBe('reveal')
  })
})

describe('game-flow: navigation', () => {
  it('back from the result returns to the locked number (explicit change only)', () => {
    const state = walkToDay(first)
    const atDays = back({ ...state, phase: 'result', revealed: true }, resolve)
    expect(atDays.phase).toBe('days')
    expect(atDays.day).toBe(state.day)
  })

  it('back from the day selector re-opens the final question', () => {
    const state = walkToDay(first)
    const atFinal = back({ ...state, phase: 'days' }, resolve)
    expect(atFinal.phase).toBe('q')
    expect(atFinal.choices.length).toBe(6)
  })

  it('back eventually returns to the first selection screen', () => {
    let state = walkToDay(first)
    state = { ...state, phase: 'days' }
    for (let i = 0; i < 8; i++) state = back(state, resolve)
    expect(state.phase).toBe('cups')
    expect(state.choices.length).toBe(0)
  })

  it('back is a no-op on intro and on the first screen', () => {
    const intro = makeInitialState()
    const cups = { ...intro, phase: 'cups' as const }
    expect(back(intro, resolve)).toBe(intro)
    expect(back(cups, resolve)).toStrictEqual(cups)
  })
})

describe('game-flow: number lock', () => {
  it('the number is chosen exactly once and then locked', () => {
    let state = walkToDay(first)
    const afterOne = pickDay(state, 21)
    expect(afterOne.day).toBe(14)
    const replaced = pickDay(afterOne, 3)
    expect(replaced.day).toBe(14)
  })

  it('explicit changeDay unlocks the grid', () => {
    const state = walkToDay(first)
    const unlocked = changeDay(state)
    expect(unlocked.day).toBeNull()
    expect(unlocked.phase).toBe('days')
    const rePicked = pickDay(unlocked, 9)
    expect(rePicked.day).toBe(9)
  })

  it('invalid numbers are rejected', () => {
    const state = walkToDay(first)
    expect(pickDay({ ...state, day: null }, 0).day).toBeNull()
    expect(pickDay({ ...state, day: null }, 32).day).toBeNull()
    expect(pickDay({ ...state, day: null }, 12.5).day).toBeNull()
  })
})

describe('game-flow: derived state', () => {
  it('deriveFromChoices rebuilds color / status / path from a choice log', () => {
    const state = walkToDay(first)
    const derived = deriveFromChoices(state.choices, resolve)
    expect(derived.color).toBe(state.color)
    expect(derived.characteristic).toBe(state.characteristic)
    expect(derived.relationshipStatus).toBe(state.relationshipStatus)
    expect(derived.path).toEqual(state.path)
  })

  it('derivePath never includes the day selector', () => {
    const state = walkToDay(first)
    const path = derivePath(state.choices, resolve)
    expect(path).not.toContain(DAY_NODE_ID)
    expect(path.length).toBe(6)
  })
})

describe('game-flow: persistence', () => {
  it('rejects malformed payloads outright', () => {
    expect(validateSavedState(null, resolve)).toBeNull()
    expect(validateSavedState('nope', resolve)).toBeNull()
    expect(validateSavedState({ phase: 'q', choices: 'nope' }, resolve)).toBeNull()
    expect(validateSavedState({ phase: 'made-up', choices: [] }, resolve)).toBeNull()
  })

  it('round-trips a valid mid-run state', () => {
    const halfState = walkToDay(first)
    const saved = validateSavedState(JSON.parse(JSON.stringify(halfState)), resolve)
    expect(saved).not.toBeNull()
    expect(saved?.color).toBe(halfState.color)
    expect(saved?.day).toBe(halfState.day)
    expect(saved?.choices).toEqual(halfState.choices)
  })

  it('accepts a coherent result state and rejects a broken one', () => {
    const complete = walkToDay(first, 14)
    expect(validateSavedState(JSON.parse(JSON.stringify(complete)), resolve)).not.toBeNull()
    const broken = { ...complete, choices: complete.choices.slice(0, 4) }
    expect(validateSavedState(broken, resolve)).toBeNull()
  })
})