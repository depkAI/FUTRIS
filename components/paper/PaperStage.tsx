'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import type { ColorKey } from '../../types/game'
import { paperAxisForLevel } from '../../lib/paper-content'
import type { PaperSceneProps, PaperPanel } from './PaperScene'
import type { PaperAxis, PaperState } from '../../lib/paper-state'
import { axisOpenState } from '../../lib/paper-state'
import { Paper2D } from './Paper2D'

// three.js touches the DOM (canvas 2D textures, WebGL) at render time, so it
// must never run inside Next's server renderer. Loading it client-only keeps
// the SSR HTML cheap and prevents `document is not defined` crashes in build.
const PaperScene = dynamic<PaperSceneProps>(
  () => import('./PaperScene').then((m) => m.PaperScene),
  { ssr: false, loading: () => null },
)

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

function prefersNoMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Target paper pose derived from which surface is active. */
function foldTargetFor(
  surface: 'colors' | 'options' | 'numbers' | 'reveal',
  level: number,
): PaperState {
  if (surface === 'colors') return 'closed'
  if (surface === 'reveal') return 'revealing'
  const axis: PaperAxis | 'closed' = paperAxisForLevel(level)
  return axis === 'closed' ? 'closed' : axisOpenState(axis)
}

const DRAG_GAIN = 0.0045
const DRAG_THRESHOLD = 12

export interface PaperStageProps {
  surface: PaperSceneProps['surface']
  level: number
  colorKey: ColorKey | null
  panels: PaperPanel[]
  selectedId: string | null
  interactive: boolean
  onSelect: (id: string) => void
  onOpenChange?: (open: boolean) => void
}

export function PaperStage({
  surface,
  level,
  colorKey,
  panels,
  selectedId,
  interactive,
  onSelect,
  onOpenChange,
}: PaperStageProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [dpr, setDpr] = useState(1.8)
  const [bias, setBias] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const drag = useRef({ startY: 0, bias: 0, active: false })
  const pressed = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWebgl(supportsWebGL())
    setReducedMotion(prefersNoMotion())
    setDpr(Math.min(window.devicePixelRatio || 1, 2))
  }, [])

  const lowPower =
    (typeof navigator !== 'undefined' &&
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? Infinity) <= 4) ||
    (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4)

  const target = foldTargetFor(surface, level)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pressed.current = true
    if (!interactive) return
    drag.current = { startY: e.clientY, bias: target === 'closed' ? 0 : 1, active: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only fold while the pointer is actually held; stray moves before (or
    // after) a press must not arm the drag.
    if (!pressed.current) return
    if (!interactive) return
    const d = drag.current
    if (!d.active) {
      if (Math.abs(e.clientY - d.startY) > DRAG_THRESHOLD) {
        d.active = true
        setDragging(true)
        // Capture only once this is a real drag, so plain taps keep
        // pointerup on the canvas and R3F's click detection still fires.
        containerRef.current?.setPointerCapture?.(e.pointerId)
      } else {
        return
      }
    }
    setBias(Math.min(1, Math.max(0, d.bias + (d.startY - e.clientY) * DRAG_GAIN)))
  }

  const onPointerUp = () => {
    pressed.current = false
    if (drag.current.active) {
      setBias((b) => (b ?? 0) >= 0.5 ? 1 : 0)
      setDragging(false)
    }
    drag.current.active = false
  }

  const handleSelect = useCallback(
    (id: string) => {
      if (dragging) return
      onSelect(id)
    },
    [dragging, onSelect],
  )

  if (webgl === null) return null

  if (!webgl || reducedMotion) {
    return (
      <div className="absolute inset-0">
        <Paper2D
          surface={surface}
          colorKey={colorKey}
          panels={panels}
          selectedId={selectedId}
          interactive={interactive}
          onSelect={onSelect}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        shadows={!lowPower}
        dpr={[1, dpr]}
        gl={{ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 2.4, 4.4], fov: 42 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <PaperScene
          target={target}
          surface={surface}
          colorKey={colorKey}
          panels={panels}
          selectedId={selectedId}
          interactive={interactive && !dragging}
          bias={bias}
          onSelect={handleSelect}
          onOpenChange={onOpenChange ?? (() => {})}
          lowPower={lowPower}
          reducingMotion={false}
        />
      </Canvas>
    </div>
  )
}

export { foldTargetFor, supportsWebGL, prefersNoMotion }