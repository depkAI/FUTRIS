'use client'

import { useState } from 'react'
import type { ColorKey } from '../../types/game'
import { COLORS } from '../../data/colors'
import { DAYS } from '../../data/days'
import { sfx } from '../../lib/sound'

interface DaySelectorProps {
  color: ColorKey | null
  locked: boolean
  chosen: number | null
  onPick: (day: number) => void
}

export function DaySelector({ color, locked, chosen, onPick }: DaySelectorProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const accent = color ? COLORS[color] : null
  const systemColor = accent ? accent.rgba : '217, 179, 106'

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto px-5 pb-28 pt-[12vh]">
      <div className="flex w-full max-w-md flex-col items-center">
        <span
          className="fade-up mb-4 rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-widest2"
          style={{
            color: `rgba(${systemColor}, 0.95)`,
            borderColor: `rgba(${systemColor}, 0.35)`,
            background: `rgba(${systemColor}, 0.06)`,
          }}
        >
          The last choice
        </span>
        <h2 className="fade-up title-display mb-2 text-center text-2xl font-medium sm:text-3xl">
          Choose your number.
        </h2>
        <p className="fade-up mb-7 max-w-xs text-center text-sm font-light leading-relaxed text-mist-500">
          A number from 1–31. It cannot be changed once it settles into your path.
        </p>

        <div className="numbers-grid w-full" role="group" aria-label="Pick a day, 1 to 31">
          {DAYS.map((d) => {
            const isChosen = chosen === d.day
            const isHovered = hovered === d.day
            const dimmed = locked && !isChosen
            return (
              <button
                key={d.day}
                disabled={locked}
                aria-label={`Day ${d.day}, ${d.title}`}
                onClick={() => onPick(d.day)}
                onMouseEnter={() => setHovered(d.day)}
                onMouseLeave={() => setHovered(null)}
                className="title-display relative aspect-square rounded-xl border transition-all duration-200 disabled:cursor-default sm:aspect-[4/3.4]"
                style={{
                  borderColor: isChosen
                    ? `rgba(${systemColor}, 0.95)`
                    : isHovered
                      ? `rgba(${systemColor}, 0.6)`
                      : 'rgba(217, 179, 106, 0.16)',
                  background: isChosen ? `rgba(${systemColor}, 0.16)` : 'rgba(26, 20, 38, 0.5)',
                  color: isChosen ? `rgba(${systemColor}, 1)` : '#cfc6e0',
                  boxShadow: isChosen
                    ? `0 0 26px rgba(${systemColor}, 0.35)`
                    : isHovered
                      ? '0 0 14px rgba(217, 179, 106, 0.18)'
                      : 'none',
                  opacity: dimmed ? 0.3 : 1,
                }}
              >
                <span className="text-lg sm:text-xl">{d.day}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.25em] text-mist-500/70">
          {color ? `${COLORS[color].name} remembered · number holds the hour` : 'the number holds the hour'}
        </p>
      </div>
    </div>
  )
}