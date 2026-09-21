import { describe, it, expect } from 'vitest'
import type { GameState, GameNode } from '../types/game'
import { GAME_GRAPH, DAY_NODE_ID, FORTUNE_NODE_ID } from '../lib/game-graph'
import { computeFortune, isDeterministic } from '../lib/fortune-engine'

/** Walk the graph deterministically by asking `choice` per node. */
function trace(
  choice: (node: GameNode, state: GameState) => number,
  day: number,
): GameState {
  const state: GameState = {
    phase: 'q',
    color: null,
    characteristic: null,
    relationshipStatus: null,
    day,
    path: [],
    choices: [],
    revealed: false,
  }
  let node = GAME_GRAPH.getNode('start') as GameNode
  let guard = 0
  while (node && guard < 20) {
    guard++
    if (node.id === DAY_NODE_ID) break
    const idx = choice(node, state)
    const opt = node.options[idx]
    if (!opt) break
    state.choices.push({ nodeId: node.id, optionId: opt.id })
    if (opt.nextNode !== DAY_NODE_ID) state.path.push(opt.nextNode)

    if (node.id === 'start') state.color = opt.nextNode as GameState['color']
    else if (node.kind === 'characteristic' && state.color) {
      state.characteristic = opt.nextNode.slice(`${state.color}-`.length)
    } else if (node.kind === 'status') {
      state.relationshipStatus = opt.theme as GameState['relationshipStatus']
    }

    const next = GAME_GRAPH.getNode(opt.nextNode)
    if (!next || next.id === FORTUNE_NODE_ID) break
    node = next
  }
  return state
}

const firstChoice = () => 0
const altChoice = (node: GameNode, state: GameState) => {
  if (node.id === 'start') return 1 // BLUE
  if (node.kind === 'characteristic') return 1 // BLUE trust
  if (node.kind === 'status') return 0 // single
  return state.choices.length % 2
}

describe('Fortune engine determinism and day-locking', () => {
  it('same path + same day → identical fortune profile', () => {
    const a = trace(firstChoice, 14)
    const b = trace(firstChoice, 14)
    const pa = computeFortune(a, GAME_GRAPH)
    const pb = computeFortune(b, GAME_GRAPH)
    expect(pa).not.toBeNull()
    expect(pb).not.toBeNull()
    expect(isDeterministic(pa as never, pb as never)).toBe(true)
    expect(pa?.line1).toBe(pb?.line1)
    expect(pa?.line2).toBe(pb?.line2)
  })

  it('different path + same day → different fortune profile', () => {
    const redPath = trace(firstChoice, 14) // RED branch
    const bluePath = trace(altChoice, 14) // BLUE branch
    const pr = computeFortune(redPath, GAME_GRAPH)
    const pb = computeFortune(bluePath, GAME_GRAPH)
    expect(pr?.color).toBe('red')
    expect(pb?.color).toBe('blue')
    expect(pr?.line1).not.toBe(pb?.line1)
    expect(pr?.line2).not.toBe(pb?.line2)
  })

  it('two divergent options under the same question produce different profiles', () => {
    // RED, loyal, then always the LAST option vs always the FIRST option
    const last = (node: GameNode) => node.options.length - 1
    const a = trace(firstChoice, 7)
    const b = trace(last, 7)
    const pa = computeFortune(a, GAME_GRAPH)
    const pb = computeFortune(b, GAME_GRAPH)
    expect(pa?.pathThemes[0]).not.toBe(pb?.pathThemes[0])
    expect(`${pa?.line1}|${pa?.line2}`).not.toBe(`${pb?.line1}|${pb?.line2}`)
  })

  it('same path + different day → different fortune profile', () => {
    const day14 = computeFortune(trace(firstChoice, 14), GAME_GRAPH)
    const day21 = computeFortune(trace(firstChoice, 21), GAME_GRAPH)
    expect(day14?.day).toBe(14)
    expect(day21?.day).toBe(21)
    expect(day14?.line2).not.toBe(day21?.line2)
  })

  it('day 14 is permanently preserved by the engine', () => {
    const profile = computeFortune(trace(firstChoice, 14), GAME_GRAPH)
    expect(profile?.day).toBe(14)
    expect(profile?.dayMeaning.title).toBe('Revelation')
    expect(profile?.line2).toContain('revelation')
  })

  it('a deterministic profile always mentions day 14 as 14 (never re-rolled)', () => {
    for (let i = 0; i < 5; i++) {
      const p = computeFortune(trace(firstChoice, 14), GAME_GRAPH)
      expect(p?.day).toBe(14)
    }
    const again = computeFortune(trace(firstChoice, 14), GAME_GRAPH)
    expect(again?.path.join('|')).toBe(computeFortune(trace(firstChoice, 14), GAME_GRAPH)?.path.join('|'))
  })

  it('the chosen day never mutates across the whole profile', () => {
    const profile = computeFortune(trace(firstChoice, 31), GAME_GRAPH)
    expect(profile?.day).toBe(31)
    expect(profile?.dayMeaning.day).toBe(31)
  })

  it('engine produces 2 crisp lines, not paragraphs', () => {
    const profile = computeFortune(trace(firstChoice, 14), GAME_GRAPH) as never
    const p = profile as { line1: string; line2: string }
    expect(p.line1.split(/\s+/).length).toBeLessThan(40)
    expect(p.line2.split(/\s+/).length).toBeLessThan(40)
  })
})

describe('Path integrity through the whole tree', () => {
  it('every colour and every status has real branching coverage', () => {
    const colours = new Set<string>()
    const statuses = new Set<string>()
    const startAt = (colorIdx: number) => (node: GameNode) => (node.id === 'start' ? colorIdx : 0)
    const statusAt = (statusIdx: number) => (node: GameNode) =>
      node.kind === 'status' ? statusIdx : 0
    for (const ci of [0, 1, 2, 3]) {
      for (const si of [0, 1, 2, 3]) {
        const s = trace(seedlessChoice(ci, si), 14)
        colours.add(s.color ?? '')
        statuses.add(s.relationshipStatus ?? '')
      }
    }
    expect(colours.size).toBe(4)
    expect(statuses.size).toBe(4)
    // unambiguous: the engine emits different readings for each colour
    const red = computeFortune(trace(seedlessChoice(0, 0), 14), GAME_GRAPH)
    const blue = computeFortune(trace(seedlessChoice(1, 0), 14), GAME_GRAPH)
    expect(red?.line1).not.toBe(blue?.line1)
  })

  it('every possible journey is unique and reaches the day stage', () => {
    let journeys = 0
    const outcomes = new Set<string>()
    const walk = (nodeId: string, trail: string, choices: string[]) => {
      const node = GAME_GRAPH.getNode(nodeId)
      if (!node) throw new Error(`missing node ${nodeId}`)
      if (node.kind === 'fortune') {
        journeys += 1
        outcomes.add(trail)
        return
      }
      if (nodeId === DAY_NODE_ID) {
        for (const opt of node.options) {
          journeys += 1
          outcomes.add(`${trail}|day#${opt.id}`)
        }
        return
      }
      for (const opt of node.options) {
        const id = `${nodeId}#${opt.id}`
        if (choices.includes(id)) throw new Error(`loop at ${id}`)
        walk(opt.nextNode, choices.length ? `${trail}|${id}` : id, [...choices, id])
      }
    }
    walk('start', '', [])
    const fourWayLevels = Math.pow(4, 7) // colour×char×q2×midq2×status×l6×l7
    expect(journeys).toBe(fourWayLevels * 31)
    expect(outcomes.size).toBe(journeys)
  })
})

function seedlessChoice(colorIdx: number, statusIdx: number) {
  return (node: GameNode) => {
    if (node.id === 'start') return colorIdx
    if (node.kind === 'status') return statusIdx
    return 0
  }
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}