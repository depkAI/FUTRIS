import { describe, it, expect } from 'vitest'
import type { GameNode, GameState } from '../types/game'
import { GAME_GRAPH } from '../lib/game-graph'
import {
  applyChoice,
  back,
  changeDay,
  makeInitialState,
  pickDay,
  validateSavedState,
} from '../lib/game-flow'
import { computeFortune } from '../lib/fortune-engine'

const resolve = (id: string): GameNode | undefined => GAME_GRAPH.getNode(id)

type AnswerFn = (node: GameNode, state: GameState) => number

/** Drives the same choices the paper + prompt would fire. */
function play(answer: AnswerFn, day = 14): GameState {
  let state: GameState = { ...makeInitialState(), phase: 'cups' }
  let node = resolve('start') as GameNode
  let guard = 0
  while (node && guard < 30) {
    guard++
    if (node.kind === 'day') break
    if (node.kind === 'fortune') break
    const opt = node.options[answer(node, state)]
    state = applyChoice(state, node, opt.id, resolve)
    const next = resolve(opt.nextNode) as GameNode | undefined
    if (!next) break
    node = next
  }
  return pickDay(state, day)
}

const byInstinct = (node: GameNode): number => {
  if (node.id === 'start') return 1 // blue
  if (node.kind === 'status') return 0 // single
  return 0
}

const byWander = (node: GameNode, state: GameState): number => {
  if (node.id === 'start') return 0 // red
  if (node.kind === 'characteristic') return 0
  return state.choices.length % 2
}

describe('full journey: first interaction to reveal', () => {
  it('reaching the number selector takes exactly 7 answers', () => {
    let state: GameState = { ...makeInitialState(), phase: 'cups' }
    let node = resolve('start') as GameNode
    let guard = 0
    while (node && guard < 30) {
      if (node.kind === 'day') break
      guard++
      const opt = node.options[1]
      state = applyChoice(state, node, opt.id, resolve)
      node = (resolve(opt.nextNode) as GameNode) ?? node
    }
    expect(guard).toBe(7)
    expect(state.choices.length).toBe(7)
    expect(state.phase).toBe('days')
  })

  it('returns a deterministic two-line fortune for both paths', () => {
    for (const strategy of [byInstinct, byWander]) {
      const st = play(strategy, 14)
      expect(st.choices.length).toBe(7)
      expect(st.day).toBe(14)
      const profile = computeFortune(st, GAME_GRAPH)
      expect(profile).not.toBeNull()
      expect(profile?.source).toBe('engine')
      expect(profile?.line1.length).toBeGreaterThan(0)
      expect(profile?.line2.length).toBeGreaterThan(0)
      expect(profile?.line1).not.toContain('\n')
      expect(profile?.line2).not.toContain('\n')
      const again = computeFortune(play(strategy, 14), GAME_GRAPH)
      expect(again?.line1).toBe(profile?.line1)
      expect(again?.line2).toBe(profile?.line2)
    }
  })

  it('back from the result returns to the locked number; explicit change re-rolls it', () => {
    const st = play(byInstinct)
    const atDays = back({ ...st, phase: 'result', revealed: true }, resolve)
    expect(atDays.phase).toBe('days')
    expect(atDays.day).toBe(14)
    const unlocked = changeDay(atDays)
    const rePicked = pickDay(unlocked, 27)
    expect(rePicked.day).toBe(27)
    const profile = computeFortune(rePicked, GAME_GRAPH)
    expect(profile?.day).toBe(27)
    expect(profile?.line2.length).toBeGreaterThan(0)
    const day14 = computeFortune(st, GAME_GRAPH)
    expect(`${profile?.line1}|${profile?.line2}`).not.toBe(`${day14?.line1}|${day14?.line2}`)
  })

  it('backtracking to a question keeps the locked number; explicit change re-rolls it', () => {
    const st = play(byInstinct, 14)
    const atDays = back({ ...st, phase: 'result', revealed: true }, resolve)
    expect(atDays.day).toBe(14)
    const backToFinal = back(atDays, resolve)
    expect(backToFinal.phase).toBe('q')
    const qNode = resolve(backToFinal.path[backToFinal.path.length - 1]) as GameNode
    const differentOpt = qNode.options[qNode.options.length - 1]
    const changed = applyChoice(backToFinal, qNode, differentOpt.id, resolve)
    expect(changed.day).toBe(14) // the number survives backtracking + re-answer
    expect(changed.phase).toBe('days')
    const before = computeFortune(st, GAME_GRAPH)
    const after = computeFortune(changed, GAME_GRAPH)
    expect(after).not.toBeNull()
    expect(`${after?.line1}|${after?.line2}`).not.toBe(`${before?.line1}|${before?.line2}`)
    const rePicked = pickDay(changeDay(changed), 3)
    expect(rePicked.day).toBe(3)
    expect(computeFortune(rePicked, GAME_GRAPH)?.day).toBe(3)
  })

  it('a full run stored and reloaded survives validation and replays the same fortune', () => {
    const st = play(byInstinct, 31)
    const restored = validateSavedState(JSON.parse(JSON.stringify(st)), resolve)
    expect(restored).not.toBeNull()
    expect(computeFortune(restored as GameState, GAME_GRAPH)?.line1).toBe(
      computeFortune(st, GAME_GRAPH)?.line1,
    )
  })

  it('rapid double-input cannot skip a question (answer change is idempotent)', () => {
    let state: GameState = { ...makeInitialState(), phase: 'cups' }
    const node = resolve('start') as GameNode
    const opt = node.options[0]
    state = applyChoice(state, node, opt.id, resolve)
    const double = applyChoice(state, node, opt.id, resolve)
    expect(double).toBe(state)
    expect(double.choices.length).toBe(1)
  })
})