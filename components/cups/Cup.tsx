'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ColorKey } from '../../types/game'
import { COLORS } from '../../data/colors'

export type CupMode = 'idle' | 'select' | 'fade' | 'reveal'

function makeCupGeometry(): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0.02, 0.02),
    new THREE.Vector2(0.3, 0.02),
    new THREE.Vector2(0.36, 0.045),
    new THREE.Vector2(0.42, 0.09),
    new THREE.Vector2(0.48, 0.2),
    new THREE.Vector2(0.52, 0.32),
    new THREE.Vector2(0.55, 0.44),
    new THREE.Vector2(0.562, 0.52),
    new THREE.Vector2(0.568, 0.55),
  ]
  return new THREE.LatheGeometry(points, 40)
}

const CUPS_POSITIONS: { x: number; y: number; z: number }[] = [
  { x: -2.15, y: 0, z: 0.55 },
  { x: -0.72, y: 0, z: 0.12 },
  { x: 0.72, y: 0, z: -0.12 },
  { x: 2.15, y: 0, z: -0.5 },
]

const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt))

interface CupProps {
  colorKey: ColorKey
  index: number
  mode: CupMode
  interactive: boolean
  hovered: boolean
  selected: boolean
  selecting: boolean
  reducingMotion: boolean
  onHover: (v: boolean) => void
  onPick: () => void
}

export function Cup({
  colorKey,
  index,
  mode,
  interactive,
  hovered,
  selected,
  selecting,
  reducingMotion,
  onHover,
  onPick,
}: CupProps) {
  const group = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const rimRef = useRef<THREE.Mesh>(null)

  const theme = COLORS[colorKey]
  const geometry = useMemo(() => makeCupGeometry(), [])
  const innerGeometry = useMemo(() => new THREE.CircleGeometry(0.555, 32), [])
  const rimGeometry = useMemo(() => new THREE.TorusGeometry(0.57, 0.022, 16, 40), [])
  const pos = CUPS_POSITIONS[index]

  const bodyMaterial = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(theme.hex),
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1,
      transparent: true,
      opacity: 1,
    })
    return m
  }, [theme.hex])

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0b12',
        roughness: 0.9,
        metalness: 0,
      }),
    [],
  )

  const rimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.hex),
        emissive: new THREE.Color(theme.glow),
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.35,
        transparent: true,
        opacity: 1,
      }),
    [theme.hex, theme.glow],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const g = group.current
    const body = bodyRef.current
    const rim = rimRef.current
    if (!g || !body || !rim) return

    const baseY = mode === 'fade' ? -1.9 : mode === 'reveal' ? -0.25 : -0.18
    const desiredY =
      baseY +
      (reducingMotion ? 0 : Math.sin(t * 0.9 + index * 1.7) * 0.08) +
      (selected ? 1.35 : 0)

    let desiredScale = 1
    let desiredOpacity = 1
    let desiredRim = 0.6

    if (mode === 'fade') {
      desiredOpacity = 0.28
      desiredScale = 0.55
    } else if (mode === 'reveal') {
      desiredScale = 0.95
      desiredRim = 1.4 + Math.sin(t * 1.6) * 0.5
    } else if (selected) {
      desiredScale = 1.12
      desiredRim = 2.2
    } else if (hovered && interactive) {
      desiredScale = 1.06
      desiredRim = selecting ? 0.8 : 1.2
    }

    if (selecting && !selected) {
      desiredOpacity = 0.12
      desiredScale = 0.5
    }

    const lambda = selected || selecting ? 6 : 4
    g.position.y = damp(g.position.y, desiredY, lambda, delta)
    const s = damp(g.scale.x, desiredScale, lambda, delta)
    g.scale.set(s, s, s)

    bodyMaterial.opacity = damp(bodyMaterial.opacity, desiredOpacity, lambda, delta)
    rimMaterial.opacity = bodyMaterial.opacity
    rimMaterial.emissiveIntensity = damp(rimMaterial.emissiveIntensity, desiredRim, lambda, delta)

    if (!reducingMotion) {
      g.rotation.y = damp(g.rotation.y, selected ? t * 2 : Math.sin(t * 0.5 + index) * 0.06, selected ? 8 : 3, delta)
    }
  })

  return (
    <group ref={group} position={[pos.x, pos.y, pos.z]}>
      <mesh
        ref={bodyRef}
        geometry={geometry}
        material={bodyMaterial}
        position={[0, 0.3, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          if (interactive && !selecting) {
            onPick()
          }
        }}
        onPointerOver={() => {
          if (interactive) onHover(true)
        }}
        onPointerOut={() => {
          if (interactive) onHover(false)
        }}
      />
      <mesh
        geometry={innerGeometry}
        material={innerMaterial}
        position={[0, 0.565 + 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        ref={rimRef}
        geometry={rimGeometry}
        material={rimMaterial}
        position={[0, 0.57 + 0.3, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <pointLight
        color={new THREE.Color(theme.glow)}
        intensity={mode === 'reveal' ? 2.4 : 1.6}
        distance={3.2}
        position={[0, 1, 0.6]}
      />
    </group>
  )
}