'use client'

import { useState } from 'react'
import type { ColorKey, FortuneProfile, RelationshipStatus } from '../../types/game'
import { COLORS, COLOR_NAMES } from '../../data/colors'
import { RELATIONSHIPS } from '../../data/relationships'
import { DAYS_BY_NUMBER } from '../../data/days'
import { sfx } from '../../lib/sound'

interface ResultCardProps {
  profile: FortuneProfile
  onReplay: () => void
  onBack?: () => void
}

function shareText(profile: FortuneProfile): string {
  return `FOUR CUPS — DAY ${profile.day}\n\n"${profile.line1} ${profile.line2}"\n\nA love fortune, folded by paper and instinct.`
}

export function ResultCard({ profile, onReplay, onBack }: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  const [showPath, setShowPath] = useState(false)
  const color = COLORS[profile.color as ColorKey]

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleShare = async () => {
    sfx.play('number')
    const text = shareText(profile)
    if (canShare) {
      try {
        await navigator.share({ text })
        return
      } catch {
        /* user dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* ignore */
    }
  }

  const pathRows: { label: string; value: string }[] = [
    { label: 'Colour', value: COLOR_NAMES[profile.color as ColorKey] },
    {
      label: 'What you chose',
      value: profile.characteristic.charAt(0).toUpperCase() + profile.characteristic.slice(1).replace(/-/g, ' '),
    },
    {
      label: 'Heart',
      value: RELATIONSHIPS[profile.relationshipStatus as RelationshipStatus].label,
    },
    { label: 'Day', value: `${profile.day} — ${DAYS_BY_NUMBER[profile.day].title}` },
  ]

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto px-5 pb-10 pt-[8vh]">
      <div className="fade-up glass relative w-full max-w-md rounded-3xl p-7 text-center shadow-glow-bright sm:p-9">
        <span
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, rgba(${color.rgba}, 0.8), transparent)` }}
        />

        <span className="ginzel-cta text-[10px] uppercase">Your Fortune</span>
        <h2 className="title-display gold-text mt-3 text-5xl sm:text-6xl">
          {profile.color.toUpperCase()}
          <span className="mx-3 text-mist-500">·</span>DAY {profile.day}
        </h2>

        <div className="mt-7 space-y-4">
          <p className="text-[17px] font-light leading-relaxed text-mist-300 sm:text-lg">
            {profile.line1}
          </p>
          <div
            className="mx-auto h-px w-24 opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, rgba(${color.rgba}, 0.7), transparent)` }}
          />
          <p className="text-[17px] font-light leading-relaxed text-mist-300 sm:text-lg">
            {profile.line2}
          </p>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-mist-500/80 italic">
          A playful reading, not a prophecy. The folded paper only suggests what
          your own heart already leans toward.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={handleShare}
            className="glow-pulse title-display w-full rounded-full border border-gold-500/50 bg-gold-500/10 py-3.5 text-sm tracking-[0.25em] text-gold-300 transition-all duration-300 hover:bg-gold-500/20 hover:shadow-glow-bright"
          >
            {copied ? 'COPIED TO CLIPBOARD' : 'SHARE MY FORTUNE'}
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full rounded-full border border-mist-500/30 py-3.5 text-sm tracking-[0.25em] text-mist-300 transition-all duration-300 hover:border-mist-500/60 hover:text-white"
            >
              CHANGE MY NUMBER
            </button>
          )}
          <button
            onClick={onReplay}
            className="w-full rounded-full border border-mist-500/30 py-3.5 text-sm tracking-[0.25em] text-mist-300 transition-all duration-300 hover:border-mist-500/60 hover:text-white"
          >
            START AGAIN
          </button>
        </div>

        <button
          onClick={() => setShowPath((v) => !v)}
          className="mt-6 text-[10px] uppercase tracking-widest2 text-mist-500/70 transition-colors hover:text-mist-400"
        >
          {showPath ? 'hide your path' : 'see your path'}
        </button>

        {showPath && (
          <div className="stagger mt-5 space-y-2 rounded-2xl border border-gold-500/15 bg-ink-900/60 p-4 text-left">
            {pathRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[11px] uppercase tracking-widest text-mist-500">{row.label}</span>
                <span className="text-mist-300">{row.value}</span>
              </div>
            ))}
            <p className="pt-2 text-center text-[10px] italic text-mist-500/60">
              every choice you made is folded into this reading
            </p>
          </div>
        )}
      </div>
    </div>
  )
}