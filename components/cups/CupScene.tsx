'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { COLOR_ORDER, COLORS } from '../../data/colors'
import { Cup, type CupMode } from './Cup'
import type { ColorKey } from '../../types/game'

export type { CupMode } from './Cup'

export interface CupSceneProps {
  mode: CupMode
  interactive: boolean
  selectedKey: ColorKey | null
  onPick: (key: ColorKey) => void
  lowPower: boolean
  reducingMotion: boolean
}

function CameraRig({ mode }: { mode: CupMode }) {
  const target = useRef<Record<CupMode, [number, number, number]>>({
    idle: [0, 0.15, 7],
    select: [0, 0.15, 6.4],
    fade: [0, 0.1, 5],
    reveal: [0, 0, 5.6],
  })
  useFrame((state, delta) => {
    const [x, y, z] = target.current[mode]
    const cam = state.camera
    const damp = 1 - Math.exp(-2.2 * delta)
    cam.position.x += (x - cam.position.x) * damp
    cam.position.y += (y - cam.position.y) * damp
    cam.position.z += (z - cam.position.z) * damp
    cam.lookAt(0, 0, 0)
  })
  return null
}

export function CupScene({
  mode,
  interactive,
  selectedKey,
  onPick,
  lowPower,
  reducingMotion,
}: CupSceneProps) {
  const [hovered, setHovered] = useState<ColorKey | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedLocal, setSelectedLocal] = useState<ColorKey | null>(selectedKey)

  useEffect(() => {
    if (mode === 'idle' || mode === 'select') {
      if (selectedKey === null) {
        setSelectedLocal(null)
        setSelecting(false)
      }
    }
  }, [mode, selectedKey])

  const handlePick = (key: ColorKey) => {
    if (selecting) return
    setSelectedLocal(key)
    setSelecting(true)
    onPick(key)
  }

  const effectiveSelected = selectedLocal ?? selectedKey

  return (
    <>
      <color attach="background" args={['#0b0911']} />
      <fog attach="fog" args={['#0b0911', 9, 16]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={lowPower ? 0.6 : 1.1}
        castShadow={!lowPower}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 3, -3]} intensity={0.5} color="#8a7dff" />
      <pointLight position={[0, -1, 5]} intensity={0.4} color="#ffd98a" />

      <CameraRig mode={mode} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow={!lowPower}>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#0d0b12" roughness={1} metalness={0} />
      </mesh>

      {COLOR_ORDER.map((key, i) => (
        <Cup
          key={key}
          colorKey={key}
          index={i}
          mode={mode}
          interactive={interactive && !selecting}
          hovered={hovered === key}
          selected={effectiveSelected === key}
          selecting={selecting}
          reducingMotion={reducingMotion}
          onHover={(v) => setHovered(v ? key : null)}
          onPick={() => handlePick(key)}
        />
      ))}

      {!lowPower && !reducingMotion && (
        <Sparkles
          count={mode === 'reveal' ? 90 : 40}
          scale={[10, 5, 6]}
          size={1.6}
          speed={0.35}
          opacity={0.5}
          color={effectiveSelected ? COLORS[effectiveSelected].glow : '#f4e8ff'}
        />
      )}
    </>
  )
}

export { COLOR_ORDER, COLORS }