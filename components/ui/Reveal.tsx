'use client'

import { useEffect, useState } from 'react'
import type { ColorKey } from '../../types/game'
import { COLORS } from '../../data/colors'

interface RevealProps {
  day: number
  color: ColorKey | null
  onDone: () => void
}

const PHASES = [
  'Your choices have been made.',
  'The number has fallen into place.',
  'One final reveal…',
]

export function Reveal({ day, color, onDone }: RevealProps) {
  const [stage, setStage] = useState(0)
  const accent = color ? COLORS[color] : null
  const systemColor = accent ? accent.rgba : '217, 179, 106'

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1600),
      setTimeout(() => setStage(2), 3000),
      setTimeout(() => setStage(3), 4400),
    ]
    setTimeout(onDone, 5200)
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {stage >= 0 && (
          <p className="fade-up text-sm tracking-[0.2em] text-mist-400/90">{PHASES[0]}</p>
        )}
        {stage >= 1 && (
          <div
            className="fade-up title-display gold-text my-8 text-8xl leading-none sm:text-9xl"
            style={{
              textShadow: `0 0 60px rgba(${systemColor}, 0.45)`,
            }}
          >
            {day}
          </div>
        )}
        {stage >= 2 && (
          <p className="fade-up text-sm tracking-[0.2em] text-mist-400/90">{PHASES[2]}</p>
        )}
        {stage >= 3 && (
          <p
            className="fade-up mt-10 text-[10px] uppercase tracking-widest2"
            style={{ color: `rgba(${systemColor}, 0.9)` }}
          >
            the paper folds open
          </p>
        )}
      </div>
    </div>
  )
}