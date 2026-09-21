'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CupScene, type CupMode } from './cups/CupScene'
import type { ColorKey } from '../types/game'

export interface Stage3DProps {
  mode: CupMode
  interactive: boolean
  selectedKey: ColorKey | null
  onPick: (key: ColorKey) => void
  onSelectComplete: (key: ColorKey) => void
}

export default function Stage3D({
  mode,
  interactive,
  selectedKey,
  onPick,
  onSelectComplete,
}: Stage3DProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dpr, setDpr] = useState(1.8)

  useEffect(() => {
    const d = Math.min(window.devicePixelRatio || 1, 2)
    setDpr(d)
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const lowPower =
    (typeof navigator !== 'undefined' &&
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? Infinity) <= 4) ||
    (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4)

  const reducingMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handlePick = useCallback(
    (key: ColorKey) => {
      onPick(key)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => onSelectComplete(key), 1150)
    },
    [onPick, onSelectComplete],
  )

  return (
    <Canvas
      shadows={!lowPower}
      dpr={[1, dpr]}
      gl={{ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.15, 7], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <CupScene
        mode={mode}
        interactive={interactive}
        selectedKey={selectedKey}
        onPick={handlePick}
        lowPower={lowPower}
        reducingMotion={reducingMotion}
      />
    </Canvas>
  )
}