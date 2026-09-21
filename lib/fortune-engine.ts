import type { FortuneProfile, GameState, Sentiment } from '../types/game'
import { COLORS } from '../data/colors'
import { CHARACTERISTICS } from '../data/characteristics'
import { RELATIONSHIPS } from '../data/relationships'
import { DAYS_BY_NUMBER, SOFTENERS } from '../data/days'
import { FUTURE_LINES, PRESENT_LINES } from '../data/fortunes'
import { HEARTWORDS } from '../data/pools'
import type { GameGraph } from './game-graph'
import { pickIndex, seeded } from './random'

/** Human labels for the internal theme tokens, used for AI + fallbacks. */
export const THEME_LABELS: Record<string, string> = {
  instinct: 'an instinct',
  patience: 'your patience',
  restraint: 'your restraint',
  mystery: 'the mystery you are leaving alone',
  communication: 'an honest conversation',
  presence: 'your willingness to show up',
  pride: 'a little wounded pride',
  belief: 'the belief you keep feeding',
  logic: 'your careful logic',
  risk: 'a risk you half-wanted',
  connection: 'a connection worth keeping',
  comfort: 'the comfort of the familiar',
  possibility: 'a brighter possibility',
  intuition: 'your intuition',
  expectation: 'what everyone expects of you',
  warmth: 'a genuine warmth',
  guardedness: 'a guardedness they cannot see',
  uncertainty: 'an uncertainty that nags',
  clarity: 'a need for clarity',
  courage: 'the courage you are almost ready for',
  honesty: 'an honesty you have waited on',
  certainty: 'the certainty you crave',
  realization: 'a slow realization',
  fantasy: 'a fantasy you have dressed as reality',
  steadiness: 'your steadiness',
  curiosity: 'your curiosity',
  understanding: 'being understood',
  attention: 'being chosen',
  passion: 'an old spark',
  calmness: 'a peace without questions',
  loyalty: 'your loyalty',
  hope: 'an audacious hope',
  memory: 'a memory holding on',
  selflove: 'a promise you made to yourself',
  expression: 'the words you almost said',
  privacy: 'your private thoughts',
  trust: 'the trust you are testing',
  timing: 'a sense of timing',
  anticipation: 'an anticipation you cannot switch off',
  recovery: 'the progress you have made',
  neutrality: 'a careful neutrality',
  fear: 'a fear you do not name',
  integrity: 'plain integrity',
  ease: 'an easier love',
  growth: 'something growing in you',
  freedom: 'the freedom of letting go',
  self: 'the person you are becoming',
  commitment: 'a real commitment',
  yearning: 'a yearning with no address',
  beingchosen: 'the quiet need to be chosen',
  casualness: 'a casualness you are maintaining',
  retreat: 'a slow retreat',
  vulnerability: 'being truly seen',
  peace: 'a certain calm',
  intensity: 'an intensity without a release',
  action: 'the decision to move',
  respect: 'a quiet self-respect',
  spontaneity: 'a sudden spontaneity',
  openness: 'your openness',
  boundaries: 'the boundaries you guard',
  discernment: 'a careful discernment',
  ready: 'a quiet readiness',
  selfwork: 'the work you are doing on yourself',
  awe: 'a shock of possibility',
  evidence: 'a need for proof',
  confidence: 'a new confidence',
  waiting: 'the waiting you have mastered',
  play: 'a lighter, playful energy',
  slowness: 'a slow unfolding',
  spark: 'a sudden spark',
  surprise: 'an unexpected turn',
  return: 'something returning',
  space: 'the space you need',
  revival: 'a revival of the old feeling',
  reassurance: 'a need for reassurance',
  beginning: 'a return to the beginning',
  novelty: 'something brand new',
  faith: 'your faith',
  transparency: 'full transparency',
  history: 'the patterns of the past',
  cohesion: 'growing in the same direction',
  drift: 'a slow drift',
  stasis: 'a refusal to move',
  finality: 'a clean ending',
  closure: 'the closure you owe yourself',
  renewal: 'a renewal you did not expect',
  reopening: 'an old door',
  lettinggo: 'the gentle art of letting go',
  time: 'nothing but time',
  freshness: 'a clean slate',
  farewell: 'a last kind goodbye',
  distance: 'the distance you both chose',
  fade: 'a feeling fading',
  reciprocity: 'the answer you hope for',
  truth: 'the bare truth',
  exit: 'a quiet exit',
  meaning: 'a meaning the signs are forming',
  selfreflection: 'a mirror held up to you',
  acceptance: 'a calm acceptance',
  signs: 'the signs you keep reading',
  inevitability: 'a truth that will not stay hidden',
}

export function phraseFor(theme: string): string {
  return THEME_LABELS[theme] ?? theme.replace(/-/g, ' ')
}

const FALLBACK_TONES = ['hopeful', 'restless', 'steady', 'guarded', 'open', 'wary']
const TONE_WEIGHT: Record<Sentiment, number> = {
  hopeful: 3,
  open: 3,
  restless: 2,
  steady: 1,
  guarded: 0,
  wary: 0,
}

function tallyTone(sentiments: Sentiment[]): { tone: string; strength: number } {
  const counts = new Map<string, number>()
  let max = 0
  for (const s of sentiments) {
    const key = s === 'open' || s === 'hopeful' ? 'hopeful' : s === 'restless' ? 'restless' : s === 'steady' ? 'steady' : 'guarded'
    counts.set(key, (counts.get(key) ?? 0) + 1)
    max = Math.max(max, counts.get(key) ?? 0)
  }
  const ordered = FALLBACK_TONES.filter((t) => counts.has(t)).sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || TONE_WEIGHT[b as Sentiment] - TONE_WEIGHT[a as Sentiment],
  )
  return { tone: ordered[0] ?? 'steady', strength: sentiments.length ? max / sentiments.length : 0 }
}

export function computeFortune(state: GameState, graph: GameGraph): FortuneProfile | null {
  if (!state.color || !state.characteristic || !state.relationshipStatus || !state.day) return null

  const color = COLORS[state.color]
  const charNode = CHARACTERISTICS[`${state.color}-${state.characteristic}`]
  const essence = charNode?.essence ?? state.characteristic
  const dayMeaning = DAYS_BY_NUMBER[state.day]

  const sentiments: Sentiment[] = []
  const pathThemes: string[] = []

  for (const choice of state.choices) {
    const node = graph.getNode(choice.nodeId)
    if (!node) continue
    if (node.kind !== 'question') continue
    const opt = node.options.find((o) => o.id === choice.optionId)
    if (opt) {
      sentiments.push(opt.sentiment)
      pathThemes.push(opt.theme)
    }
  }

  pathThemes.unshift(phraseFor(RELATIONSHIPS[state.relationshipStatus].themes[0]))
  pathThemes.unshift(charNode ? charNode.themes[0] : state.characteristic)

  const { tone, strength } = tallyTone(sentiments)
  const seedKey = `${state.color}|${state.characteristic}|${state.relationshipStatus}|${state.day}|${state.path.join('>')}|${state.choices
    .map((c) => `${c.nodeId}#${c.optionId}`)
    .join('>')}`

  const dayKey = state.day
  const rng = seeded(seedKey)

  const twoWords = () => {
    const a = pickIndex(rng, HEARTWORDS.length)
    let b = pickIndex(rng, HEARTWORDS.length)
    while (b === a) b = pickIndex(rng, HEARTWORDS.length)
    return { w1: HEARTWORDS[a], w2: HEARTWORDS[b] }
  }

  const cW = twoWords()
  const presentTemplate = PRESENT_LINES[state.relationshipStatus][pickIndex(rng, PRESENT_LINES[state.relationshipStatus].length)]
  const line1 = presentTemplate
    .replace(/\{w1\}/g, cW.w1)
    .replace(/\{w2\}/g, cW.w2)
    .replace(/\{e\}/g, essence)
    .replace(/\{co\}/g, state.color)

  const fW = twoWords()
  const futureTemplate = FUTURE_LINES[pickIndex(rng, FUTURE_LINES.length)]
  const softener = SOFTENERS[dayMeaning.energy] ?? 'may'
  const line2 = futureTemplate
    .replace(/\{w1\}/g, fW.w1)
    .replace(/\{w2\}/g, fW.w2)
    .replace(/\{d\}/g, dayMeaning.essence)
    .replace(/\{s\}/g, softener)

  return {
    color: state.color,
    characteristic: state.characteristic,
    relationshipStatus: state.relationshipStatus,
    day: state.day,
    dayMeaning,
    colorWord: color.words[pickIndex(seeded(seedKey + 'w'), color.words.length)],
    essence,
    pathThemes,
    sentiments,
    tone,
    toneStrength: strength,
    path: [...state.path],
    line1,
    line2,
    source: 'engine',
  }
}

/** Same path + same day MUST produce the exact same profile. */
export function isDeterministic(a: FortuneProfile, b: FortuneProfile): boolean {
  return (
    a.color === b.color &&
    a.characteristic === b.characteristic &&
    a.relationshipStatus === b.relationshipStatus &&
    a.day === b.day &&
    a.line1 === b.line1 &&
    a.line2 === b.line2 &&
    a.path.join('|') === b.path.join('|')
  )
}