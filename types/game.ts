export type ColorKey = 'red' | 'blue' | 'green' | 'yellow'

export type RelationshipStatus = 'single' | 'committed' | 'breakup' | 'one-sided'

export type Sentiment =
  | 'open'
  | 'guarded'
  | 'hopeful'
  | 'restless'
  | 'steady'
  | 'wary'

export type NodeKind = 'color' | 'characteristic' | 'question' | 'status' | 'day' | 'fortune'

export interface GameOption {
  id: string
  text: string
  theme: string
  sentiment: Sentiment
  nextNode: string
  /** Optional cue shown for the day/number selector options. */
  day?: number
}

export interface GameNode {
  id: string
  level: number
  kind: NodeKind
  color: ColorKey | null
  question: string
  options: GameOption[]
  themes: string[]
  tone: string
  relationshipStatus: RelationshipStatus | null
  archetype: string | null
  essence: string | null
}

export interface ColorTheme {
  key: ColorKey
  name: string
  hex: string
  glow: string
  /** Tailwind-friendly CSS color used for glows and accents. */
  rgba: string
  /** Evocative words tied to the color's branch. */
  words: string[]
  /** Slugs of the characteristic nodes this color leads to. */
  characteristics: string[]
  /** Nostalgic one-liner shown with the color. */
  ritual: string
}

export interface CharacteristicNode {
  color: ColorKey
  name: string
  essence: string
  themes: string[]
}

export interface RelationshipProfile {
  status: RelationshipStatus
  label: string
  short: string
  themes: string[]
  essence: string
}

export type DayEnergy = 'gentle' | 'bright' | 'quiet' | 'electric' | 'heavy' | 'steady'

export interface DayMeaning {
  day: number
  title: string
  keywords: string[]
  energy: DayEnergy
  /** One evocative phrase used inside fortunes. */
  essence: string
}

export type Phase = 'intro' | 'cups' | 'q' | 'days' | 'reveal' | 'result'

export interface ChoiceRecord {
  nodeId: string
  optionId: string
}

export interface GameState {
  phase: Phase
  color: ColorKey | null
  characteristic: string | null
  relationshipStatus: RelationshipStatus | null
  day: number | null
  path: string[]
  choices: ChoiceRecord[]
  revealed: boolean
}

export interface FortuneProfile {
  color: ColorKey
  characteristic: string
  relationshipStatus: RelationshipStatus
  day: number
  dayMeaning: DayMeaning
  colorWord: string
  essence: string
  pathThemes: string[]
  sentiments: Sentiment[]
  tone: string
  toneStrength: number
  path: string[]
  line1: string
  line2: string
  source: 'engine' | 'ai'
}

export interface ValidationReport {
  totalNodes: number
  totalOptions: number
  totalPaths: number
  uniquePaths: number
  duplicateNodeIds: number
  duplicateOptionIds: number
  duplicateQuestions: number
  duplicateOptionSets: number
  brokenRefs: number
  deadEnds: number
  unreachableNodes: number
  loops: number
  convergences: number
  pathsMissingDayStage: number
  nodesAtDayStage: number[]
  ok: boolean
}