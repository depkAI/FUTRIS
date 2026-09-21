'use client'

import dynamic from 'next/dynamic'
import type { ColorKey } from '../types/game'
import type { CupMode } from './cups/Cup'

const Stage3D = dynamic(() => import('./Stage3D'), { ssr: false, loading: () => null })

export interface CupStageProps {
  mode: CupMode
  interactive: boolean
  selectedKey: ColorKey | null
  onPick: (key: ColorKey) => void
  onSelectComplete: (key: ColorKey) => void
}

export function CupStage(props: CupStageProps) {
  return <Stage3D {...props} />
}