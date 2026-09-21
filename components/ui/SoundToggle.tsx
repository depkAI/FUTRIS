'use client'

import { useState } from 'react'
import { sfx } from '../../lib/sound'

export function SoundToggle() {
  const [muted, setMuted] = useState(sfx.isMuted())

  const toggle = () => {
    const next = sfx.toggle()
    setMuted(next)
    if (!next) sfx.play('transition')
  }

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="fixed right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/25 bg-ink-900/60 text-gold-300/90 backdrop-blur transition-all duration-200 hover:border-gold-500/50 hover:text-gold-300"
      style={{ top: 'env(safe-area-inset-top, 16px)' }}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      )}
    </button>
  )
}