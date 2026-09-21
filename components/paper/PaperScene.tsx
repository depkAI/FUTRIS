'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { shortLabel } from '../../lib/paper-content'
import {
  isClosed,
  isMoving,
  isOpen,
  isRevealing,
  type PaperState,
} from '../../lib/paper-state'
import type { ColorKey } from '../../types/game'
import { COLORS, COLOR_ORDER } from '../../data/colors'

export type PaperSurface = 'colors' | 'options' | 'numbers' | 'reveal'

export interface PaperPanel {
  id: string
  text: string
}

const R = 1.06
const OPEN_THETA = 0.98
const OPEN_MS = 640
const CLOSE_MS = 460

const CORNERS: [number, number][] = [
  [R, 0],
  [0, R],
  [-R, 0],
  [0, -R],
]

const INK = '#3b3235'
const CREAM = '#f3e9d6'
const GOLD = '#c9a15f'
const NUMBER_BREAKS = [8, 16, 24, 31]

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function sheetTexture(opts: {
  accent: string
  accentText?: string
  title?: string
  body?: string
  ghost?: string
  crease?: boolean
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, 256, 256)
  const wash = ctx.createLinearGradient(0, 0, 256, 256)
  wash.addColorStop(0, 'rgba(255,255,255,0.5)')
  wash.addColorStop(0.5, 'rgba(120,90,40,0.07)')
  wash.addColorStop(1, 'rgba(80,55,25,0.14)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, 256, 256)

  if (opts.crease) {
    ctx.strokeStyle = 'rgba(90,60,30,0.18)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 148)
    ctx.lineTo(256, 148)
    ctx.moveTo(128, 256)
    ctx.lineTo(128, 148)
    ctx.moveTo(128, 148)
    ctx.lineTo(0, 256)
    ctx.moveTo(128, 148)
    ctx.lineTo(256, 256)
    ctx.stroke()
  }

  if (opts.accentText) {
    ctx.fillStyle = opts.accent
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(256, 0)
    ctx.lineTo(256, 54)
    ctx.lineTo(0, 54)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.font = '700 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(opts.accentText, 128, 28)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const bodyY = opts.accentText ? 122 : 96

  if (opts.title) {
    ctx.fillStyle = INK
    ctx.font = '700 36px system-ui, sans-serif'
    ctx.fillText(opts.title, 128, opts.accentText ? 104 : 88)
  }

  if (opts.body) {
    ctx.fillStyle = '#4a4146'
    ctx.font = '22px system-ui, sans-serif'
    const lines = wrap(ctx, opts.body, 196)
    lines.forEach((l, i) => ctx.fillText(l, 128, bodyY + i * 28))
  }

  if (opts.ghost) {
    ctx.fillStyle = 'rgba(60,50,55,0.26)'
    ctx.font = 'italic 20px Georgia, serif'
    ctx.fillText(opts.ghost, 128, 252)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

interface PanelGeometry {
  half: number
  len: number
  shape: THREE.Shape
}

function makePanelGeometry(index: number): PanelGeometry {
  const A = CORNERS[index]
  const B = CORNERS[(index + 1) % 4]
  const half = Math.hypot(B[0] - A[0], B[1] - A[1]) / 2
  const len = Math.hypot(A[0], A[1])
  const shape = new THREE.Shape()
  shape.moveTo(-half, 0)
  shape.lineTo(half, 0)
  shape.lineTo(0, len)
  shape.closePath()
  return { half, len, shape }
}

interface FoldProps {
  geometry: THREE.ShapeGeometry
  material: THREE.Material
  index: number
  theta: number
  interactive: boolean
  onSelect: () => void
}

function Fold({ geometry, material, index, theta, interactive, onSelect }: FoldProps) {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  useEffect(() => {
    const g = outer.current
    if (!g) return
    const A = CORNERS[index]
    const B = CORNERS[(index + 1) % 4]
    const av = new THREE.Vector3(A[0], 0, A[1])
    const bv = new THREE.Vector3(B[0], 0, B[1])
    const mid = av.clone().add(bv).multiplyScalar(0.5)
    const e = bv.clone().sub(av).normalize()
    const cent = mid.clone().negate().normalize()
    if (e.clone().cross(cent).y < 0) e.negate()
    g.position.copy(mid)
    g.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(e, cent, new THREE.Vector3(0, 1, 0)),
    )
  }, [index])

  useEffect(() => {
    if (inner.current) inner.current.rotation.x = theta
  }, [theta])

  return (
    <group ref={outer}>
      <group ref={inner}>
        <mesh
          geometry={geometry}
          material={material}
          onClick={(ev) => {
            if (!interactive) return
            ev.stopPropagation()
            onSelect()
          }}
          onPointerOver={(ev) => {
            ev.stopPropagation()
            document.body.style.cursor = interactive ? 'pointer' : 'auto'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        />
      </group>
    </group>
  )
}

function paperDesired(state: PaperState): number {
  if (isOpen(state) || isRevealing(state)) return 1
  if (isClosed(state)) return 0
  if (state === 'closing_a' || state === 'closing_b') return 0
  return 1
}

export interface PaperSceneProps {
  target: PaperState
  surface: PaperSurface
  colorKey: ColorKey | null
  panels: PaperPanel[]
  selectedId: string | null
  interactive: boolean
  bias: number | null
  onSelect: (id: string) => void
  onOpenChange: (open: boolean) => void
  lowPower: boolean
  reducingMotion: boolean
}

export function PaperScene({
  target,
  surface,
  colorKey,
  panels,
  selectedId,
  interactive,
  bias,
  onSelect,
  onOpenChange,
  lowPower,
  reducingMotion,
}: PaperSceneProps) {
  const [state, setState] = useState<PaperState>('closed')
  const tRef = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const stateRef = useRef<PaperState>('closed')

  const theme = colorKey ? COLORS[colorKey] : null
  const lidOrder = COLOR_ORDER.map((k) => COLORS[k])

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timers.current.push(id)
    }
    const go = (next: PaperState) => {
      stateRef.current = next
      setState(next)
    }
    const plan = (from: PaperState, to: PaperState) => {
      if (from === to) return
      if (to === 'closed') {
        if (from === 'open_a' || from === 'closing_a' || from === 'opening_a' || from === 'revealing')
          go('closing_a')
        else go('closing_b')
        schedule(() => go('closed'), CLOSE_MS)
        return
      }
      if (from === 'closed') {
        go(to)
        schedule(() => go(to === 'open_a' ? 'open_a' : 'open_b'), OPEN_MS)
        return
      }
      if (to === 'open_a') {
        go('closing_b')
        schedule(() => go('opening_a'), CLOSE_MS)
        schedule(() => go('open_a'), CLOSE_MS + OPEN_MS)
        return
      }
      if (to === 'open_b') {
        go('closing_a')
        schedule(() => go('opening_b'), CLOSE_MS)
        schedule(() => go('open_b'), CLOSE_MS + OPEN_MS)
        return
      }
      go('revealing')
    }
    plan(stateRef.current, target)
    const pending = [...timers.current]
    timers.current = []
    return () => pending.forEach(clearTimeout)
  }, [target])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useFrame((_, delta) => {
    const desired = bias ?? paperDesired(stateRef.current)
    const lambda = reducingMotion || isMoving(stateRef.current) ? 9 : 2.4
    const k = 1 - Math.exp(-lambda * delta)
    tRef.current += (desired - tRef.current) * k
  })

  const theta = OPEN_THETA * Math.max(0.001, tRef.current)
  const wasOpen = useRef(false)
  useEffect(() => {
    const open = isOpen(state) || isRevealing(state)
    if (open !== wasOpen.current) {
      wasOpen.current = open
      onOpenChange(open)
    }
  }, [state, onOpenChange])

  // ---- textures ----------------------------------------------------------
  const valueKey = `${surface}|${colorKey ?? ''}|${panels.map((p) => `${p.id}:${p.text}`).join(',')}|${selectedId ?? ''}`

  const lidTextures = useTextureArray(
    `lid|${valueKey}`,
    4,
    (i) =>
      sheetTexture({
        accent: lidOrder[i].hex,
        accentText: surface === 'colors' ? (panels[i]?.text ?? lidOrder[i].name) : lidOrder[i].name,
        crease: true,
        ghost: surface === 'colors' && selectedId === panels[i]?.id ? 'chosen' : 'touch to choose',
      }),
  )

  const baseTextures = useTextureArray(
    `base|${valueKey}`,
    4,
    (i) => {
      if (surface === 'options') {
        return sheetTexture({
          accent: theme?.hex ?? GOLD,
          accentText: String.fromCharCode(65 + i),
          title: shortLabel(panels[i]?.text ?? ''),
          ghost: selectedId === panels[i]?.id ? 'chosen' : `press ${i + 1}`,
        })
      }
      if (surface === 'numbers') {
        return sheetTexture({
          accent: theme?.hex ?? GOLD,
          accentText: `${i === 0 ? 1 : NUMBER_BREAKS[i - 1] + 1}–${NUMBER_BREAKS[i]}`,
          title: 'number',
          ghost: 'pick a number on the card',
        })
      }
      return sheetTexture({
        accent: theme?.hex ?? GOLD,
        title: '✶',
        body: theme ? theme.ritual : 'your fortune waits below',
        ghost: 'revealed',
        crease: true,
      })
    },
  )

  const lidMaterials = useMaterials(lidTextures, true)
  const baseMaterials = useMaterials(baseTextures, false)

  const showBase = surface !== 'colors'

  const geometryByIndex = useMemo(
    () => CORNERS.map((_, i) => new THREE.ShapeGeometry(makePanelGeometry(i).shape)),
    [],
  )

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 5]} intensity={lowPower ? 0.7 : 1.25} castShadow={!lowPower} />
      <pointLight position={[-4, 3, -3]} intensity={0.4} color="#8a7dff" />
      <pointLight position={[0, 5, 3]} intensity={0.7} color="#ffd98a" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow={!lowPower}>
        <circleGeometry args={[5.6, 48]} />
        <meshStandardMaterial color="#0d0b12" roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[1.42, 32]} />
        <meshStandardMaterial color="#07050c" roughness={1} metalness={0} transparent opacity={0.4} />
      </mesh>

      <group position={[0, 0.04, 0]}>
        {showBase &&
          CORNERS.map((_, i) => (
            <Fold
              key={`base-${i}-${surface}`}
              geometry={geometryByIndex[i]}
              material={baseMaterials[i]}
              index={i}
              theta={0}
              interactive={interactive && !isMoving(stateRef.current) && isOpen(state)}
              onSelect={() => onSelect(panels[i]?.id ?? '')}
            />
          ))}

        {CORNERS.map((_, i) => (
          <Fold
            key={`lid-${i}`}
            geometry={geometryByIndex[i]}
            material={lidMaterials[i]}
            index={i}
            theta={theta}
            interactive={surface === 'colors' && interactive}
            onSelect={() => onSelect(panels[i]?.id ?? '')}
          />
        ))}
      </group>

      {!lowPower && !reducingMotion && (
        <Sparkles
          count={46}
          scale={[7, 5, 4]}
          size={1.4}
          speed={0.3}
          opacity={0.45}
          color={theme?.glow ?? '#f4e8ff'}
        />
      )}
    </>
  )
}

/** Rebuild a texture array when the serialised key changes. */
function useTextureArray(
  key: string,
  count: number,
  draw: (index: number) => THREE.CanvasTexture,
): THREE.CanvasTexture[] {
  const [textures, setTextures] = useState<THREE.CanvasTexture[] | null>(null)
  const keyRef = useRef(key)
  const builtRef = useRef<THREE.CanvasTexture[] | null>(null)

  useEffect(() => {
    if (keyRef.current === key) return
    keyRef.current = key
    const built = Array.from({ length: count }, (_, i) => draw(i))
    if (builtRef.current) builtRef.current.forEach((t) => t.dispose())
    builtRef.current = built
    setTextures(built)
  }, [key, count, draw]) // eslint-disable-line react-hooks/exhaustive-deps

  const fallbackRef = useRef<THREE.CanvasTexture[] | null>(null)
  if (!fallbackRef.current) {
    fallbackRef.current = Array.from({ length: count }, (_, i) => draw(i))
  }

  return textures ?? fallbackRef.current
}

function useMaterials(
  textures: THREE.Texture[],
  doubleSided: boolean,
): THREE.Material[] {
  const materials = useMemo(
    () =>
      textures.map(
        (map) =>
          new THREE.MeshStandardMaterial({
            map,
            roughness: 0.82,
            metalness: 0,
            side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
          }),
      ),
    [textures, doubleSided],
  )
  return materials
}