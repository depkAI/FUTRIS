'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { GameState, GameNode } from '../types/game'
import { GAME_GRAPH, DAY_NODE_ID } from './game-graph'
import {
  applyChoice,
  back,
  changeDay,
  deriveFromChoices,
  makeInitialState,
  pickDay as pickDayFlow,
  validateSavedState,
} from './game-flow'
import { sfx } from './sound'

const STORAGE_KEY = 'fourcups.state.v1'

interface GameContextValue {
  state: GameState
  currentNode: GameNode
  hasProgress: boolean
  hydrated: boolean
  begin: () => void
  continueRun: () => void
  choose: (optionId: string) => void
  pickDay: (day: number) => void
  changeDay: () => void
  back: () => void
  finish: () => void
  replay: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

function safeLoad(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return validateSavedState(JSON.parse(raw), GAME_GRAPH.getNode.bind(GAME_GRAPH))
  } catch {
    return null
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(makeInitialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = safeLoad()
    if (saved) {
      setState(saved)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [hydrated, state])

  const hasProgress = useMemo(
    () => state.path.length > 0 && state.phase !== 'result' && state.phase !== 'reveal',
    [state.path.length, state.phase],
  )

  const currentNode = useMemo<GameNode>(() => {
    if (state.phase === 'cups') return GAME_GRAPH.getNode('start') as GameNode
    if (state.phase === 'days') return GAME_GRAPH.getNode(DAY_NODE_ID) as GameNode
    const last = state.path[state.path.length - 1]
    return (last ? GAME_GRAPH.getNode(last) : null) ?? (GAME_GRAPH.getNode('start') as GameNode)
  }, [state.phase, state.path])

  const begin = () => {
    sfx.unlock()
    setState({ ...makeInitialState(), phase: 'cups' })
    sfx.play('transition')
  }

  const continueRun = () => {
    sfx.unlock()
    setState((prev) => {
      if (prev.day !== null) return { ...prev, phase: 'result', revealed: true }
      return prev
    })
    sfx.play('transition')
  }

  const choose = (optionId: string) => {
    const node = currentNode
    const opt = node.options.find((o) => o.id === optionId)
    if (!opt) return
    sfx.play('pick')
    setState((prev) => applyChoice(prev, node, optionId, GAME_GRAPH.getNode.bind(GAME_GRAPH)))
  }

  const pickDay = (day: number) => {
    setState((prev) => {
      const next = pickDayFlow(prev, day)
      if (next.day !== prev.day) {
        sfx.unlock()
        sfx.play('number')
      }
      return next
    })
  }

  const changeDayAction = () => {
    setState((prev) => {
      const next = changeDay(prev)
      if (next !== prev) sfx.play('swish')
      return next
    })
  }

  const backAction = () => {
    setState((prev) => {
      const next = back(prev, GAME_GRAPH.getNode.bind(GAME_GRAPH))
      if (next !== prev) sfx.play('transition')
      return next
    })
  }

  const finish = () => {
    sfx.play('reveal')
    setState((prev) => ({ ...prev, phase: 'result', revealed: true }))
  }

  const replay = () => {
    sfx.unlock()
    sfx.play('swish')
    setState(makeInitialState())
  }

  const value: GameContextValue = {
    state,
    currentNode,
    hasProgress: hasProgress && hydrated,
    hydrated,
    begin,
    continueRun,
    choose,
    pickDay,
    changeDay: changeDayAction,
    back: backAction,
    finish,
    replay,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}

export { deriveFromChoices }