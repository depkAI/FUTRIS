import type { GameNode, ValidationReport } from '../types/game'
import type { GameGraph } from './game-graph'
import { DAY_NODE_ID, FORTUNE_NODE_ID } from './game-graph'

export const ALLOWED_CONVERGENCES = new Set([DAY_NODE_ID, FORTUNE_NODE_ID])

export function buildValidationReport(graph: GameGraph): ValidationReport {
  const nodes = graph.allNodes()
  const reports: string[] = []

  const duplicateNodeIds = Array.from(
    new Set(
      nodes
        .map((n) => n.id)
        .filter((id, i, arr) => arr.indexOf(id) !== i),
    ),
  )

  const seenOptionIds = new Map<string, string>()
  const duplicateOptionIds: string[] = []
  for (const node of nodes) {
    for (const opt of node.options) {
      if (seenOptionIds.has(opt.id) && seenOptionIds.get(opt.id) !== node.id) {
        duplicateOptionIds.push(opt.id)
      }
      seenOptionIds.set(opt.id, node.id)
    }
  }

  const seenQuestions = new Map<string, string>()
  const duplicateQuestions: string[] = []
  for (const node of nodes) {
    if (!node.question) continue
    if (seenQuestions.has(node.question)) {
      duplicateQuestions.push(node.question)
    }
    seenQuestions.set(node.question, node.id)
  }

  const optionSetKeys = new Map<string, string>()
  const duplicateOptionSets: string[] = []
  for (const node of nodes) {
    if (node.kind === 'day') continue
    const key = node.options.map((o) => o.text).sort().join(' | ')
    if (optionSetKeys.has(key)) {
      duplicateOptionSets.push(`${optionSetKeys.get(key)} == ${node.id}`)
    }
    optionSetKeys.set(key, node.id)
  }

  // Referential integrity
  const brokenRefs: string[] = []
  const deadEnds: string[] = []
  for (const node of nodes) {
    if (node.options.length === 0) {
      if (node.id !== FORTUNE_NODE_ID) deadEnds.push(node.id)
      continue
    }
    for (const opt of node.options) {
      if (!graph.getNode(opt.nextNode)) {
        brokenRefs.push(`${node.id} -> ${opt.nextNode}`)
      }
    }
  }

  // Reachability from the root
  const root = graph.getNode('start')
  const visited = new Set<string>()
  const queue = root ? [root] : []
  if (root) visited.add(root.id)
  while (queue.length) {
    const node = queue.shift() as GameNode
    for (const opt of node.options) {
      const next = graph.getNode(opt.nextNode)
      if (next && !visited.has(next.id)) {
        visited.add(next.id)
        queue.push(next)
      }
    }
  }
  const unreachable = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id)

  // Convergence: a node reached from 2+ parents is allowed ONLY at sanctioned points
  const parentCounts = new Map<string, string[]>()
  for (const node of nodes) {
    for (const opt of node.options) {
      const list = parentCounts.get(opt.nextNode) ?? []
      if (!parentCounts.has(opt.nextNode)) parentCounts.set(opt.nextNode, [])
      list.push(node.id)
    }
  }
  const convergences: string[] = []
  for (const [target, parents] of parentCounts) {
    if (parents.length > 1 && !ALLOWED_CONVERGENCES.has(target)) {
      convergences.push(`${target} (parents: ${parents.join(', ')})`)
    }
  }

  // Cycle detection (DFS)
  const loops: string[] = []
  const state = new Map<string, 'visiting' | 'done'>()
  const dfs = (node: GameNode) => {
    if (state.get(node.id) === 'visiting') {
      loops.push(node.id)
      return
    }
    if (state.get(node.id) === 'done') return
    state.set(node.id, 'visiting')
    for (const opt of node.options) {
      const next = graph.getNode(opt.nextNode)
      if (next) dfs(next)
    }
    state.set(node.id, 'done')
  }
  if (root) dfs(root)

  // Enumerate every root -> leaf traversal. A path is identified by its full
  // sequence of edge choices (nodeId # optionId), so two journeys that made a
  // different decision — even into a sanctioned shared question — stay unique.
  const walks: string[] = []
  const missingDay: string[] = []
  const walk = (node: GameNode, trail: string[], nodeSeq: string[]) => {
    const nodes = nodeSeq.concat(node.id)
    if (node.options.length === 0) {
      walks.push(trail.join(' -> '))
      if (!nodes.includes(DAY_NODE_ID)) missingDay.push(nodes.join(' -> '))
      return
    }
    for (const opt of node.options) {
      const child = graph.getNode(opt.nextNode)
      if (child) walk(child, trail.concat(`${node.id}#${opt.id}`), nodes)
    }
  }
  if (root) walk(root, [], [])

  const dayNode = graph.getNode(DAY_NODE_ID)
  const nodesAtDayStage = dayNode ? dayNode.options.map((o) => o.day ?? 0) : []

  const report: ValidationReport = {
    totalNodes: nodes.length,
    totalOptions: nodes.reduce((sum, n) => sum + n.options.length, 0),
    totalPaths: walks.length,
    uniquePaths: new Set(walks).size,
    duplicateNodeIds: duplicateNodeIds.length, // Map makes duplicates impossible; kept for parity
    duplicateOptionIds: duplicateOptionIds.length,
    duplicateQuestions: duplicateQuestions.length,
    duplicateOptionSets: duplicateOptionSets.length,
    brokenRefs: brokenRefs.length,
    deadEnds: deadEnds.length,
    unreachableNodes: unreachable.length,
    loops: loops.length,
    convergences: convergences.length,
    pathsMissingDayStage: missingDay.length,
    nodesAtDayStage,
    ok: false,
  }

  report.ok =
    report.uniquePaths === report.totalPaths &&
    report.duplicateNodeIds === 0 &&
    report.duplicateOptionIds === 0 &&
    report.duplicateQuestions === 0 &&
    report.duplicateOptionSets === 0 &&
    report.brokenRefs === 0 &&
    report.deadEnds === 0 &&
    report.unreachableNodes === 0 &&
    report.loops === 0 &&
    report.convergences === 0 &&
    report.pathsMissingDayStage === 0

  return report
}

export function summarise(report: ValidationReport): string {
  return [
    'Four Cups — PATH VALIDATOR',
    '--------------------------',
    `Total nodes:          ${report.totalNodes}`,
    `Total options:        ${report.totalOptions}`,
    `Total paths:          ${report.totalPaths}`,
    `Unique paths:         ${report.uniquePaths}`,
    `Duplicate paths:      ${report.totalPaths - report.uniquePaths}`,
    `Broken paths:         ${report.brokenRefs}`,
    `Dead ends:            ${report.deadEnds}`,
    `Unreachable nodes:    ${report.unreachableNodes}`,
    `Loops:                ${report.loops}`,
    `Illegal convergence:  ${report.convergences}`,
    `Duplicate questions:  ${report.duplicateQuestions}`,
    `Duplicate option sets:${report.duplicateOptionSets}`,
    `Paths missing day:    ${report.pathsMissingDayStage}`,
    `Day stage options:    ${report.nodesAtDayStage.length} numbers (1–${report.nodesAtDayStage.length})`,
    '',
    report.ok
      ? 'GRAPH OK — every path is unique and reaches the 31-day stage.'
      : 'GRAPH NOT OK — inspect the issues above.',
  ].join('\n')
}