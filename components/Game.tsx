'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColorKey, FortuneProfile, GameNode } from '../types/game'
import { GAME_GRAPH } from '../lib/game-graph'
import { computeFortune } from '../lib/fortune-engine'
import { enhanceFortune } from '../lib/ai'
import { GameProvider, useGame } from '../lib/game-state'
import { PaperStage } from './paper/PaperStage'
import type { PaperSurface } from './paper/PaperScene'
import { Intro } from './ui/Intro'
import { DaySelector } from './ui/DaySelector'
import { Reveal } from './ui/Reveal'
import { ResultCard } from './ui/ResultCard'
import { SoundToggle } from './ui/SoundToggle'
import { COLOR_ORDER, COLORS } from '../data/colors'
import { sfx } from '../lib/sound'

const STEP_NAMES = ['colour', 'quality', 'path', 'path', 'heart', 'path', 'final', 'number']

interface PaperPanel {
  id: string
  text: string
}

function panelsForColors(): PaperPanel[] {
  return COLOR_ORDER.map((key) => ({ id: `pick-${key}`, text: COLORS[key].name }))
}

function panelsForOptions(node: GameNode): PaperPanel[] {
  return node.options.map((o) => ({ id: o.id, text: o.text }))
}

const NUMBER_TILES: PaperPanel[] = [
  { id: 'tile-1', text: '1–8' },
  { id: 'tile-2', text: '9–16' },
  { id: 'tile-3', text: '17–24' },
  { id: 'tile-4', text: '25–31' },
]

function stageForPhase(
  phase: string,
): { surface: PaperSurface; interactive: boolean } {
  switch (phase) {
    case 'cups':
      return { surface: 'colors', interactive: true }
    case 'q':
      return { surface: 'options', interactive: true }
    case 'days':
      return { surface: 'numbers', interactive: false }
    case 'reveal':
    case 'result':
      return { surface: 'reveal', interactive: false }
    case 'intro':
    default:
      return { surface: 'colors', interactive: false }
  }
}

function Ritual() {
  const {
    state,
    currentNode,
    hasProgress,
    hydrated,
    begin,
    continueRun,
    choose,
    pickDay,
    changeDay,
    back,
    finish,
    replay,
  } = useGame()

  const [profile, setProfile] = useState<FortuneProfile | null>(null)
  const aiTriedFor = useRef<number | null>(null)

  const level =
    state.phase === 'cups' ? 1 : state.phase === 'q' ? state.choices.length + 1 : state.phase === 'days' ? 8 : state.day ? 9 : 1

  const stage = useMemo(() => stageForPhase(state.phase), [state.phase])

  const options: PaperPanel[] =
    stage.surface === 'options'
      ? panelsForOptions(currentNode)
      : stage.surface === 'colors'
        ? panelsForColors()
        : stage.surface === 'reveal'
          ? [{ id: 'fortune', text: 'your fortune' }]
          : NUMBER_TILES

  const computed = useMemo(() => {
    if (!state.day || !state.color || !state.characteristic || !state.relationshipStatus) return null
    return computeFortune(state, GAME_GRAPH)
  }, [state])

  useEffect(() => {
    if (computed && aiTriedFor.current !== computed.day) {
      aiTriedFor.current = computed.day
      enhanceFortune(computed).then((ai) => {
        if (ai) setProfile({ ...computed, ...ai })
      })
    }
  }, [computed])

  const effectiveProfile = profile && computed ? { ...computed, ...(profile.source === 'ai' ? profile : {}) } : computed

  const onReplay = () => {
    setProfile(null)
    aiTriedFor.current = null
    replay()
  }

  const showIntro = state.phase === 'intro'
  const isStatus = state.phase === 'q' && currentNode.kind === 'status'
  const stepName = STEP_NAMES[state.phase === 'q' ? state.choices.length : 7] ?? 'path'

  return (
    <main className="ritual-stage no-select">
      <PaperStage
        surface={stage.surface}
        level={level}
        colorKey={state.color}
        panels={options}
        selectedId={null}
        interactive={stage.interactive}
        onSelect={choose}
      />

      <div className="overlay-scrim pointer-events-none" aria-hidden />

      {/* ambient resting dust */}
      {!showIntro && (
        <div aria-hidden className="pointer-events-none">
          {[10, 25, 40, 62, 78, 88].map((left, i) => (
            <span
              key={left}
              className="dust"
              style={{
                left: `${left}%`,
                animationDuration: `${9 + i * 2.4}s`,
                animationDelay: `${i * 1.7}s`,
              }}
            />
          ))}
        </div>
      )}

      {!showIntro && (
        <header className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-3">
          <button
            onClick={() => state.phase === 'result' && onReplay()}
            className="title-display text-xs tracking-[0.3em] text-gold-500/90"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
            aria-label="Four Cups"
          >
            FOUR&nbsp;CUPS
          </button>
        </header>
      )}

      <SoundToggle />

      {showIntro && (
        <Intro
          hasProgress={hasProgress}
          hydrated={hydrated}
          onBegin={begin}
          onContinue={continueRun}
        />
      )}

      {state.phase === 'q' && (
        <PaperPrompt
          node={currentNode}
          colorKey={state.color}
          stepName={isStatus ? 'the heart' : stepName}
          choicesMade={state.choices.length}
          onChoose={choose}
          onBack={state.choices.length > 0 ? back : undefined}
        />
      )}

      {state.phase === 'days' && (
        <DayNumberGate
          choseNumber={state.day !== null}
          onBack={back}
          onChange={changeDay}
          color={state.color}
          locked={state.day !== null}
          chosen={state.day}
          onPick={pickDay}
        />
      )}

      {state.phase === 'reveal' && state.day !== null && (
        <Reveal day={state.day} color={state.color} onDone={finish} />
      )}

      {state.phase === 'result' && effectiveProfile && (
        <ResultCard profile={effectiveProfile} onReplay={onReplay} onBack={back} />
      )}
    </main>
  )
}

function PaperPrompt({
  node,
  colorKey,
  stepName,
  choicesMade,
  onChoose,
  onBack,
}: {
  node: GameNode
  colorKey: ColorKey | null
  stepName: string
  choicesMade: number
  onChoose: (optionId: string) => void
  onBack?: () => void
}) {
  const accent = colorKey ? COLORS[colorKey as keyof typeof COLORS] : null
  const systemColor = accent ? accent.rgba : '217, 179, 106'

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5">
      <div className="glass w-full max-w-lg rounded-3xl p-5 shadow-glow sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest2"
            style={{
              color: `rgba(${systemColor}, 0.95)`,
              borderColor: `rgba(${systemColor}, 0.35)`,
              background: `rgba(${systemColor}, 0.06)`,
            }}
          >
            {stepName}
          </span>
          <span className="flex items-center gap-1" aria-label={`Step ${choicesMade + 1} of 8`}>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i < choicesMade + 1 ? 10 : 6,
                  background: i < choicesMade + 1 ? `rgba(${systemColor}, 0.9)` : 'rgba(217,179,106,0.25)',
                }}
              />
            ))}
          </span>
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="rounded-full border border-mist-500/30 px-3 py-1 text-xs tracking-widest text-mist-300 transition-colors hover:border-mist-500/60 hover:text-white"
            >
              ← BACK
            </button>
          )}
        </div>

        <h2 className="title-display mb-4 text-lg font-medium leading-snug sm:text-xl" aria-live="polite">
          {node.question}
        </h2>

        <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-mist-500/80">
          find your answer on the paper — or pick it here
        </p>

        <div className="stagger flex w-full flex-col gap-2.5">
          {node.options.map((opt, i) => (
            <button
              key={opt.id}
              className="option-btn"
              style={{
                ['--accent' as string]: systemColor,
                borderLeft: `2px solid rgba(${systemColor}, 0.5)`,
              }}
              onClick={() => onChoose(opt.id)}
              onMouseEnter={() => sfx.play('hover')}
              aria-label={opt.text}
            >
              <span className="flex items-center gap-4">
                <span
                  className="title-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs"
                  style={{
                    borderColor: `rgba(${systemColor}, 0.4)`,
                    color: `rgba(${systemColor}, 1)`,
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[15px] font-light leading-snug">{opt.text}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-mist-500/70">
          no wrong answers — only folds
        </p>
      </div>
    </div>
  )
}

function DayNumberGate({
  choseNumber,
  onBack,
  onChange,
  color,
  locked,
  chosen,
  onPick,
}: {
  choseNumber: boolean
  onBack: () => void
  onChange: () => void
  color: ColorKey | null
  locked: boolean
  chosen: number | null
  onPick: (day: number) => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex justify-center">
      <DaySelector color={color} locked={locked} chosen={chosen} onPick={onPick} />
      <div className="absolute bottom-[3vh] z-30 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-mist-500/30 px-4 py-2 text-xs tracking-widest text-mist-300 transition-colors hover:border-mist-500/60 hover:text-white"
        >
          ← BACK
        </button>
        {choseNumber && (
          <button
            onClick={onChange}
            className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-xs tracking-widest text-gold-300 transition-colors hover:bg-gold-500/20"
          >
            CHANGE NUMBER
          </button>
        )}
      </div>
    </div>
  )
}

export function Game() {
  return (
    <GameProvider>
      <Ritual />
    </GameProvider>
  )
}