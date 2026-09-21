import { describe, it, expect } from 'vitest'
import { GAME_GRAPH, DAY_NODE_ID, FORTUNE_NODE_ID } from '../lib/game-graph'
import { buildValidationReport, summarise } from '../lib/path-validator'

describe('Four Cups path validator', () => {
  const report = buildValidationReport(GAME_GRAPH)

  it('prints the validation ledger', () => {
    const out = summarise(report)
    expect(out).toContain('PATH VALIDATOR')
    expect(out).toContain('Unique paths')
    expect(report.totalPaths).toBeGreaterThan(0)
  })

  it('has no broken references', () => {
    expect(report.brokenRefs).toBe(0)
  })

  it('has no dead ends', () => {
    expect(report.deadEnds).toBe(0)
  })

  it('has no unreachable nodes', () => {
    expect(report.unreachableNodes).toBe(0)
  })

  it('has no cycles', () => {
    expect(report.loops).toBe(0)
  })

  it('has no duplicate question text', () => {
    expect(report.duplicateQuestions).toBe(0)
  })

  it('has no duplicate option sets', () => {
    expect(report.duplicateOptionSets).toBe(0)
  })

  it('has no accidental convergence (only the day selector and the reveal may merge)', () => {
    expect(report.convergences).toBe(0)
  })

  it('every path reaches the 31-day stage', () => {
    expect(report.pathsMissingDayStage).toBe(0)
  })

  it('reports a unique path for every path (no merged duplicate journeys)', () => {
    expect(report.uniquePaths).toBe(report.totalPaths)
    expect(report.totalPaths).toBeGreaterThan(1000)
  })

  it('the graph is structurally sound', () => {
    expect(report.ok).toBe(true)
  })

  it('the day selector exposes exactly 31 numbers and nothing else', () => {
    const dayNode = GAME_GRAPH.getNode(DAY_NODE_ID)
    expect(dayNode?.options.length).toBe(31)
    expect(new Set(dayNode?.options.map((o) => o.day))).toEqual(
      new Set(Array.from({ length: 31 }, (_, i) => i + 1)),
    )
    dayNode?.options.forEach((o) => expect(o.nextNode).toBe(FORTUNE_NODE_ID))
  })

  it('sibling branches never point to the same child node (unless sanctioned)', () => {
    const allowed = new Set([DAY_NODE_ID, FORTUNE_NODE_ID])
    for (const node of GAME_GRAPH.allNodes()) {
      const targets = node.options.map((o) => o.nextNode)
      const unique = new Set(targets)
      for (const t of targets) {
        if (unique.size !== targets.length && !allowed.has(t)) {
          expect.fail(
            `node ${node.id} has duplicated targets ${JSON.stringify(targets)}`,
          )
        }
      }
    }
  })

  it('mid branches stay unique across the board (spot check)', () => {
    const seenNodes = new Map<string, number>()
    for (const node of GAME_GRAPH.allNodes()) {
      seenNodes.set(node.id, (seenNodes.get(node.id) ?? 0) + 1)
    }
    for (const [id, count] of seenNodes) {
      expect(count).toBe(1)
    }
  })
})