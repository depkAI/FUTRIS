'use client'

import { useEffect, useRef } from 'react'
import type { ColorKey, GameNode } from '../../types/game'
import { COLORS, COLOR_ORDER } from '../../data/colors'
import { sfx } from '../../lib/sound'

const STEPS = ['cups', 'characteristic', 'level 3', 'level 4', 'heart', 'level 6', 'level 7', 'day']

interface QuestionPanelProps {
  node: GameNode
  color: ColorKey | null
  step: number
  onChoose: (optionId: string) => void
}

export function QuestionPanel({ node, color, step, onChoose }: QuestionPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const accent = color ? COLORS[color] : null
  const systemColor = accent ? accent.rgba : '217, 179, 106'

  useEffect(() => {
    sfx.play('transition')
    const t = setTimeout(() => listRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [node.id])

  const isStatus = node.kind === 'status'
  const stepLabel = isStatus ? 'The heart' : `step ${Math.min(Math.max(step, 1), 8)}`

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end overflow-y-auto px-5 pb-8 pt-6">
      <div className="flex w-full max-w-xl flex-col items-center">
        <span
          className="fade-up mb-5 rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-widest2"
          style={{
            color: `rgba(${systemColor}, 0.95)`,
            borderColor: `rgba(${systemColor}, 0.35)`,
            background: `rgba(${systemColor}, 0.06)`,
          }}
        >
          {stepLabel}
        </span>

        <h2
          className="fade-up title-display mb-7 text-center text-2xl font-medium leading-snug sm:text-3xl"
          aria-live="polite"
        >
          {node.question}
        </h2>

        <div
          ref={listRef}
          tabIndex={-1}
          className="stagger flex w-full flex-col gap-3 outline-none"
        >
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
                  className="title-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs"
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

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.25em] text-mist-500/70">
          no wrong answers — only paths
        </p>
      </div>
    </div>
  )
}

export { STEPS, COLOR_ORDER }