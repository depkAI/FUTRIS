import type { ColorKey, GameNode, GameOption, RelationshipStatus } from '../types/game'
import { CHARACTERISTICS } from '../data/characteristics'
import { COLOR_ORDER, COLORS, CHARACTERISTIC_QUESTION, CUP_QUESTION } from '../data/colors'
import { RELATIONSHIPS, RELATIONSHIP_ORDER } from '../data/relationships'
import { MOOD_SLOTS, PULL_SLOTS, STATUS_SLOTS } from '../data/pools'
import {
  MID_ARCHETYPES,
  ARCHETYPES_BY_STATUS,
  STATUS_QUESTION_ARCHETYPES,
  FINAL_ARCHETYPES_BY_STATUS,
  type Archetype,
} from '../data/archetypes'
import { phraseFor } from './fortune-engine'
import { pickDistinct, seeded, slugify, hashStr } from './random'

/** The only sanctioned convergent nodes: the day selector and the terminal reveal. */
export const DAY_NODE_ID = 'days'
export const FORTUNE_NODE_ID = 'fortune'

interface BuildContext {
  color: ColorKey | null
  essence: string
  status: RelationshipStatus | null
}

interface FillOptions {
  ctx: BuildContext
  pool: Archetype[]
  childLevel: number
  /** Phrase for the {p} slot — quotes the answer that led to this node. */
  parentPhrase?: string
  /** When set, all 4 options converge into this node id (day selector only). */
  target?: string
}

interface FillOrigin {
  ctx: BuildContext
  kind: 'question' | 'status'
  archetype: Archetype
  parentPhrase?: string
  target?: string
  attempt: number
}

function fill(template: string, ctx: Record<string, string>): string {
  return template
    .replace(/\{c\}/g, ctx['c'] ?? '')
    .replace(/\{e\}/g, ctx['e'] ?? '')
    .replace(/\{s\}/g, ctx['s'] ?? '')
    .replace(/\{p\}/g, ctx['p'] ?? '')
    .replace(/\{t1\}/g, ctx['t1'] ?? '')
    .replace(/\{t2\}/g, ctx['t2'] ?? '')
}

function blankNode(
  id: string,
  level: number,
  kind: GameNode['kind'],
  ctx: BuildContext,
  themes: string[],
): GameNode {
  return {
    id,
    level,
    kind,
    color: ctx.color,
    question: '',
    options: [],
    themes,
    tone: 'steady',
    relationshipStatus: ctx.status,
    archetype: null,
    essence: ctx.essence,
  }
}

function makeChildId(parentId: string, index: number, theme: string, used: Set<string>): string {
  let code = slugify(theme, 4)
  if (!code) code = `n${index}`
  let candidate = `${parentId}-${code}`
  let attempt = 0
  while (used.has(candidate)) {
    candidate = `${parentId}-${code}${'x'.repeat(attempt + 1)}`
    attempt++
  }
  used.add(candidate)
  return candidate
}

export class GameGraph {
  nodes = new Map<string, GameNode>()
  private fills = new Map<string, FillOrigin>()

  constructor() {
    this.build()
  }

  private build() {
    // ---- level 1: the four cups -----------------------------------------
    const start: GameNode = {
      id: 'start',
      level: 1,
      kind: 'color',
      color: null,
      question: CUP_QUESTION,
      options: [],
      themes: [],
      tone: 'open',
      relationshipStatus: null,
      archetype: null,
      essence: null,
    }
    for (const color of COLOR_ORDER) {
      start.options.push({
        id: `pick-${color}`,
        text: COLORS[color].name,
        theme: `the ${color} path`,
        sentiment: 'open',
        nextNode: color,
      })
    }
    this.register(start)

    const anyCtx: BuildContext = { color: null, essence: '', status: null }

    // ---- levels 2–7: a pure 4-ary tree --------------------------------
    // colour(4) → characteristic(4^2) → path question(4^3) → path question(4^4)
    // → contextualised status(4^5) → status question(4^6) → final question(4^7)
    // → the single shared day selector. No two branches ever merge.
    for (const color of COLOR_ORDER) {
      const colorTheme = COLORS[color]
      const colorNode: GameNode = {
        id: color,
        level: 2,
        kind: 'characteristic',
        color,
        question: CHARACTERISTIC_QUESTION[color],
        options: [],
        themes: [...colorTheme.words],
        tone: colorTheme.key,
        relationshipStatus: null,
        archetype: null,
        essence: null,
      }
      for (const charSlug of colorTheme.characteristics) {
        const char = CHARACTERISTICS[`${color}-${charSlug}`]
        colorNode.options.push({
          id: `${color}-pick-${charSlug}`,
          text: char.name,
          theme: char.themes[0],
          sentiment: 'open',
          nextNode: `${color}-${charSlug}`,
        })
      }
      this.register(colorNode)

      for (const charSlug of colorTheme.characteristics) {
        const char = CHARACTERISTICS[`${color}-${charSlug}`]
        const ctx: BuildContext = { color, essence: char.essence, status: null }

        // level 3: first path question (16 nodes)
        const level3 = blankNode(
          `${color}-${charSlug}`,
          3,
          'question',
          ctx,
          [...colorNode.themes, ...char.themes],
        )
        this.fillQuestionNode(level3, { ctx, pool: MID_ARCHETYPES, childLevel: 4 })
        this.register(level3)

        for (const opt3 of level3.options) {
          // level 4: second path question (64 nodes)
          const level4 = blankNode(
            opt3.nextNode,
            4,
            'question',
            ctx,
            [...level3.themes, opt3.theme],
          )
          this.fillQuestionNode(level4, { ctx, pool: MID_ARCHETYPES, childLevel: 5 })
          this.register(level4)

          for (const opt4 of level4.options) {
            // level 5: contextualised status question (256 nodes)
            const level5 = blankNode(
              opt4.nextNode,
              5,
              'status',
              ctx,
              [...level4.themes, opt4.theme],
            )
            this.fillStatusNode(level5, { ctx, parentPhrase: phraseFor(opt4.theme) })
            this.register(level5)

            for (const stOpt of level5.options) {
              const status = stOpt.theme as RelationshipStatus
              const rel = RELATIONSHIPS[status]
              const sctx: BuildContext = { color, essence: rel.essence, status }

              // level 6: status-aware question, one per status choice (1024 nodes)
              const level6 = blankNode(
                stOpt.nextNode,
                6,
                'question',
                sctx,
                [...level5.themes, ...rel.themes],
              )
              this.fillQuestionNode(level6, {
                ctx: sctx,
                pool: ARCHETYPES_BY_STATUS[status],
                childLevel: 7,
              })
              this.register(level6)

              for (const opt6 of level6.options) {
                // level 7: final question quoting the level-6 answer (4096 nodes)
                const level7 = blankNode(
                  opt6.nextNode,
                  7,
                  'question',
                  sctx,
                  [...level6.themes, opt6.theme],
                )
                this.fillQuestionNode(level7, {
                  ctx: sctx,
                  pool: FINAL_ARCHETYPES_BY_STATUS[status],
                  childLevel: 8,
                  parentPhrase: phraseFor(opt6.theme),
                  target: DAY_NODE_ID,
                })
                this.register(level7)
              }
            }
          }
        }
      }
    }

    // ---- level 8: the 31-day selector (the only shared node) ------------
    const dayNode = blankNode(DAY_NODE_ID, 8, 'day', anyCtx, ['the last choice'])
    dayNode.question = 'Choose your number.'
    dayNode.tone = 'mysterious'
    for (let n = 1; n <= 31; n++) {
      dayNode.options.push({
        id: `day-${n}`,
        text: String(n),
        theme: `day ${n}`,
        sentiment: 'steady',
        nextNode: FORTUNE_NODE_ID,
        day: n,
      })
    }
    this.register(dayNode)

    // ---- level 9: terminal reveal --------------------------------------
    this.register({
      id: FORTUNE_NODE_ID,
      level: 9,
      kind: 'fortune',
      color: null,
      question: 'Your fortune is ready.',
      options: [],
      themes: [],
      tone: 'mysterious',
      relationshipStatus: null,
      archetype: null,
      essence: null,
    })

    this.dedupeTexts()
  }

  private register(node: GameNode) {
    if (this.nodes.has(node.id)) {
      throw new Error(`duplicate node id in graph: ${node.id}`)
    }
    this.nodes.set(node.id, node)
  }

  /**
   * Writes an archetype-driven question onto `node` and sets its 4 answer
   * options. When `target` is set the options converge there (sanctioned day
   * selector only); otherwise option nextNode ids point at child nodes the
   * caller registers via `register`.
   */
  private fillQuestionNode(node: GameNode, opts: FillOptions) {
    const rng = seeded(node.id)
    const archetype = opts.pool[Math.floor(rng() * opts.pool.length)]
    this.fills.set(node.id, {
      ctx: opts.ctx,
      kind: 'question',
      archetype,
      parentPhrase: opts.parentPhrase,
      target: opts.target,
      attempt: 0,
    })
    this.applyQuestionFill(node)
  }

  private applyQuestionFill(node: GameNode) {
    const origin = this.fills.get(node.id) as FillOrigin
    const rng = seeded(origin.attempt ? `${node.id}#${origin.attempt}` : node.id)
    const archetype = origin.archetype
    const ctx = origin.ctx
    const moods = pickDistinct(rng, MOOD_SLOTS.length, 2)
    const t1 = MOOD_SLOTS[moods[0]]
    const t2 = MOOD_SLOTS[moods[1] ?? moods[0]]
    const statusPhrase = ctx.status ? STATUS_SLOTS[ctx.status] : ''
    const colourPhrase = ctx.color ? COLORS[ctx.color].ritual : ''

    node.question = fill(archetype.template, {
      c: colourPhrase,
      e: ctx.essence,
      s: statusPhrase,
      p: origin.parentPhrase ?? '',
      t1,
      t2,
    })
    node.archetype = archetype.id

    const used = new Set<string>()
    const pullPicks = pickDistinct(rng, PULL_SLOTS.length, archetype.options.length)
    node.options = archetype.options.map((spec, i) => {
      const nextId = origin.target
        ? origin.target
        : makeChildId(node.id, i, spec.theme, used)
      const pull = PULL_SLOTS[pullPicks[i] ?? 0]
      return {
        id: `${node.id}-opt-${i}`,
        text: `${spec.text} — ${pull}`,
        theme: spec.theme,
        sentiment: spec.sentiment,
        nextNode: nextId,
      } satisfies GameOption
    })
  }

  /**
   * Level-5 status question. The wording is contextualised to the whole
   * preceding path ({c} colour, {e} essence, {p} the answer before it, moods),
   * while the four options are always the relationship statuses — each leading
   * to its own level-6 branch.
   */
  private fillStatusNode(node: GameNode, opts: { ctx: BuildContext; parentPhrase: string }) {
    const rng = seeded(node.id)
    const archetype =
      STATUS_QUESTION_ARCHETYPES[Math.floor(rng() * STATUS_QUESTION_ARCHETYPES.length)]
    this.fills.set(node.id, {
      ctx: opts.ctx,
      kind: 'status',
      archetype,
      parentPhrase: opts.parentPhrase,
      attempt: 0,
    })
    this.applyStatusFill(node)
  }

  private applyStatusFill(node: GameNode) {
    const origin = this.fills.get(node.id) as FillOrigin
    const rng = seeded(origin.attempt ? `${node.id}#${origin.attempt}` : node.id)
    const archetype = origin.archetype
    const ctx = origin.ctx
    const moods = pickDistinct(rng, MOOD_SLOTS.length, 2)
    const t1 = MOOD_SLOTS[moods[0]]
    const t2 = MOOD_SLOTS[moods[1] ?? moods[0]]
    const colourPhrase = ctx.color ? COLORS[ctx.color].ritual : ''

    node.question = fill(archetype.template, {
      c: colourPhrase,
      e: ctx.essence,
      p: origin.parentPhrase ?? '',
      t1,
      t2,
    })
    node.archetype = archetype.id

    const used = new Set<string>()
    const pullPicks = pickDistinct(rng, PULL_SLOTS.length, RELATIONSHIP_ORDER.length)
    node.options = RELATIONSHIP_ORDER.map((status, i) => {
      const rel = RELATIONSHIPS[status]
      const pull = PULL_SLOTS[pullPicks[i] ?? 0]
      return {
        id: `${node.id}-st-${status}`,
        text: `${rel.label} — ${pull}`,
        theme: status,
        sentiment: 'open',
        nextNode: makeChildId(node.id, i, status, used),
      } satisfies GameOption
    })
  }

  /**
   * Deterministic de-collision pass. Node ids, option ids and targets are fixed
   * by the tree structure; the only variable left is which slot phrases each
   * node draws. When two nodes would render the same question (or the same
   * option set), the later one re-rolls its slot draws from a salted seed until
   * every text across the whole graph is unique. This is still genuine
   * template filling — never a hardcoded tweak.
   */
  private dedupeTexts() {
    for (let round = 0; round < 40; round++) {
      let changed = this.reRollCollisions(this.questionKey)
      changed = this.reRollCollisions(this.optionSetKey) || changed
      if (!changed) return
    }
  }

  private questionKey = (node: GameNode): string | null => node.question || null

  private optionSetKey = (node: GameNode): string | null => {
    if (node.kind === 'day') return null
    return node.options.map((o) => o.text).sort().join(' | ')
  }

  private reRollCollisions(keyOf: (node: GameNode) => string | null): boolean {
    const first = new Map<string, string>()
    let changed = false
    for (const [id, node] of this.nodes) {
      const key = keyOf(node)
      if (key === null) continue
      const owner = first.get(key)
      if (owner === undefined) {
        first.set(key, id)
        continue
      }
      if (owner === id) continue
      const origin = this.fills.get(id)
      if (!origin) continue
      origin.attempt += 1
      if (origin.kind === 'status') this.applyStatusFill(node)
      else this.applyQuestionFill(node)
      changed = true
    }
    return changed
  }

  getNode(id: string): GameNode | undefined {
    return this.nodes.get(id)
  }

  allNodes(): GameNode[] {
    return Array.from(this.nodes.values())
  }
}

export const GAME_GRAPH = new GameGraph()
export const GRAPH_HASH = hashStr(
  GAME_GRAPH.allNodes()
    .map((n) => n.id + n.question + n.options.map((o) => o.id + o.text).join(''))
    .join(''),
)