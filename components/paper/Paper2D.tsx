'use client'

import { shortLabel } from '../../lib/paper-content'
import { COLORS, COLOR_ORDER } from '../../data/colors'
import type { ColorKey } from '../../types/game'
import type { PaperPanel } from './PaperScene'

const R = 1

const CORNERS: [number, number][] = [
  [R, 0],
  [0, R],
  [-R, 0],
  [0, -R],
]

function triPath(i: number): string {
  const A = CORNERS[i]
  const B = CORNERS[(i + 1) % 4]
  // viewBox is 0 0 200 200; map the unit diamond to real coordinates.
  const px = (v: [number, number]) => `${(v[0] + 1) * 100} ${(1 - v[1]) * 100}`
  return `M ${px(A)} L ${px(B)} L 100 100 Z`
}

export function Paper2D({
  surface,
  colorKey,
  panels,
  selectedId,
  interactive,
  onSelect,
}: {
  surface: 'colors' | 'options' | 'numbers' | 'reveal'
  colorKey: ColorKey | null
  panels: PaperPanel[]
  selectedId: string | null
  interactive: boolean
  onSelect: (id: string) => void
}) {
  const theme = colorKey ? COLORS[colorKey] : null
  const accent = theme?.hex ?? '#c9a15f'

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden={false}>
      <div
        className="relative h-[62vmin] w-[62vmin] sm:h-[52vh] sm:w-[52vh]"
        role={surface === 'colors' || surface === 'options' ? 'group' : undefined}
        aria-label={surface === 'colors' ? 'Choose a colour' : 'Choose an answer'}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
          {CORNERS.map((_, i) => {
            const selectable = interactive && (surface === 'colors' || surface === 'options')
            const label =
              surface === 'colors'
                ? (panels[i]?.text ?? COLOR_ORDER[i].toUpperCase())
                : shortLabel(panels[i]?.text ?? '')
            const chosen = surface === 'options' && selectedId === panels[i]?.id
            return (
              <g
                key={`${surface}-${i}`}
                transform={`rotate(${i * 90} 100 100)`}
                style={{ cursor: selectable ? 'pointer' : 'default' }}
                onClick={() => {
                  if (selectable) onSelect(panels[i]?.id ?? '')
                }}
              >
                <path
                  d={triPath(0)}
                  fill={
                    surface === 'colors'
                      ? COLORS[COLOR_ORDER[i]].hex
                      : chosen
                        ? '#e9dfc6'
                        : '#f3e9d6'
                  }
                  stroke={chosen || surface === 'colors' ? accent : 'rgba(120,90,40,0.4)'}
                  strokeWidth={chosen ? 3 : 1.2}
                />
                {surface === 'colors' && (
                  <circle cx="30" cy="100" r="7" fill={COLORS[COLOR_ORDER[i]].glow} opacity="0.9" />
                )}
                <text
                  x="100"
                  y="88"
                  textAnchor="middle"
                  fill="#3b3235"
                  fontSize="50"
                  fontWeight="700"
                >
                  {surface === 'colors' ? panels[i]?.text?.charAt(0) ?? '' : String.fromCharCode(65 + i)}
                </text>
                <text
                  x="150"
                  y="40"
                  textAnchor="middle"
                  fill={surface === 'colors' ? 'rgba(255,255,255,0.92)' : '#4a4146'}
                  fontSize="20"
                  fontWeight="600"
                  transform="rotate(-90 150 40)"
                >
                  {surface === 'colors' ? '' : 'tap'}
                </text>
                <text
                  x="100"
                  y="150"
                  textAnchor="middle"
                  fill="#4a4146"
                  fontSize="16"
                >
                  {label.length > 13 ? `${label.slice(0, 12)}…` : label}
                </text>
              </g>
            )
          })}
        </svg>

        {surface === 'colors' || surface === 'options' ? (
          <div className="sr-only">
            {panels.map((p, i) => (
              <button
                key={p.id}
                disabled={!interactive}
                tabIndex={interactive ? 0 : -1}
                onClick={() => onSelect(p.id)}
              >
                {`Option ${i + 1}: ${p.text}`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}