import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { CSSProperties } from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react'

import puzzleImage from '../../assets/discernimento/discernimento-puzzle.png'
import { useTrainingStore } from '../../features/training/store/useTrainingStore'
import {
  countCorrectTiles,
  createShuffledPuzzle,
  createSolvedPuzzle,
  getMovableTileIndices,
  isPuzzleSolved,
  moveTile,
} from './puzzle'

import type { PuzzleState } from './puzzle'

type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'

const REVEAL_DURATION = 1200

const getTileStyle = (
  tile: number
): CSSProperties => ({
  backgroundImage: `url("${puzzleImage}")`,
  backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%`,
  backgroundSize: '300% 300%',
})

export function DiscernimentoTraining() {
  const {
    currentStacks,
    targetStacks,
    addStack,
    resetProgress,
    returnToMenu,
  } = useTrainingStore()

  const [phase, setPhase] =
    useState<GamePhase>('ready')
  const [countdown, setCountdown] =
    useState(3)
  const [puzzle, setPuzzle] =
    useState<PuzzleState>(createSolvedPuzzle)
  const [movements, setMovements] =
    useState(0)
  const [solved, setSolved] =
    useState(false)

  const phaseRef = useRef<GamePhase>('ready')
  const puzzleRef = useRef<PuzzleState>(puzzle)
  const movementsRef = useRef(0)
  const solvedRef = useRef(false)
  const completionTimerRef =
    useRef<number | null>(null)

  const progress =
    targetStacks > 0
      ? (currentStacks / targetStacks) * 100
      : 0
  const correctTiles = countCorrectTiles(puzzle)
  const movableTileIndices =
    phase === 'playing' && !solved
      ? getMovableTileIndices(puzzle)
      : []

  const clearCompletionTimer =
    useCallback(() => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(
          completionTimerRef.current
        )
        completionTimerRef.current = null
      }
    }, [])

  useEffect(
    () => () => {
      clearCompletionTimer()
    },
    [clearCompletionTimer]
  )

  useEffect(() => {
    if (phase !== 'countdown') return

    const timer = window.setTimeout(() => {
      if (countdown > 0) {
        setCountdown((value) => value - 1)
        return
      }

      phaseRef.current = 'playing'
      setPhase('playing')
    }, countdown > 0 ? 700 : 400)

    return () => window.clearTimeout(timer)
  }, [phase, countdown])

  const startGame = () => {
    clearCompletionTimer()
    resetProgress()

    const nextPuzzle = createShuffledPuzzle()

    puzzleRef.current = nextPuzzle
    movementsRef.current = 0
    solvedRef.current = false
    phaseRef.current = 'countdown'

    setPuzzle(nextPuzzle)
    setMovements(0)
    setSolved(false)
    setCountdown(3)
    setPhase('countdown')
  }

  const exitTraining = () => {
    clearCompletionTimer()
    solvedRef.current = true
    phaseRef.current = 'ready'
    returnToMenu()
  }

  const handleTileClick = (position: number) => {
    if (
      phaseRef.current !== 'playing' ||
      solvedRef.current
    ) {
      return
    }

    const nextPuzzle = moveTile(
      puzzleRef.current,
      position
    )

    if (!nextPuzzle) return

    const nextMovements = movementsRef.current + 1

    puzzleRef.current = nextPuzzle
    movementsRef.current = nextMovements

    setPuzzle(nextPuzzle)
    setMovements(nextMovements)

    if (!isPuzzleSolved(nextPuzzle)) return

    solvedRef.current = true
    setSolved(true)
    addStack(targetStacks)

    completionTimerRef.current = window.setTimeout(
      () => {
        phaseRef.current = 'complete'
        setPhase('complete')
        completionTimerRef.current = null
      },
      REVEAL_DURATION
    )
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden overscroll-none bg-[#070b13] text-white">
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] sm:max-w-lg">
        <header className="shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exitTraining}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  className="text-cyan-300"
                />
                <h1 className="text-lg font-black">
                  Discernimento
                </h1>
              </div>
              <p className="text-[11px] text-white/35">
                Mosaico Arcano
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                Stacks
              </p>
              <p className="text-lg font-black">
                {currentStacks}
                <span className="text-white/30">
                  /{targetStacks}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-cyan-300"
              animate={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="relative flex min-h-0 flex-1 flex-col pt-3">
          <AnimatePresence mode="wait">
            {phase === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <div className="w-44 overflow-hidden rounded-[26px] border border-cyan-200/20 bg-cyan-300/5 p-1 shadow-[0_0_40px_rgba(103,232,249,.12)] sm:w-52">
                  <img
                    src={puzzleImage}
                    alt="Imagem completa do Mosaico Arcano"
                    className="aspect-square w-full rounded-[22px] object-cover"
                  />
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                  Construção mental
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Mosaico Arcano
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
                  Reorganize as peças até reconstruir corretamente a imagem.
                </p>

                <div className="mt-5 grid w-full grid-cols-3 gap-2 text-left">
                  {[
                    ['Toque', 'ao lado do vazio'],
                    ['Organize', 'as 8 peças'],
                    ['Conclua', 'uma única vez'],
                  ].map(([title, detail]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">
                        {title}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-white/35">
                        {detail}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="mt-6 min-h-14 w-full rounded-2xl bg-cyan-300 font-black text-cyan-950 active:scale-[0.98]"
                >
                  Começar Treino
                </button>
              </motion.div>
            )}

            {phase === 'countdown' && (
              <motion.div
                key={`countdown-${countdown}`}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.12 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                  Prepare a mente
                </p>
                <p className="mt-4 text-8xl font-black text-white">
                  {countdown > 0 ? countdown : 'VAI!'}
                </p>
              </motion.div>
            )}

            {phase === 'playing' && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Movimentos
                    </p>
                    <p className="mt-0.5 font-black">
                      {movements}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Peças corretas
                    </p>
                    <p className="mt-0.5 font-black text-cyan-200">
                      {correctTiles}/8
                    </p>
                  </div>
                </div>

                <div className="flex min-h-0 items-center justify-center">
                  <motion.div
                    className="grid aspect-square w-[min(100%,calc(100dvh-255px),430px)] grid-cols-3 overflow-hidden rounded-[26px] border border-cyan-200/20 bg-[#0d1520] shadow-[0_0_45px_rgba(34,211,238,.12)]"
                    animate={{
                      gap: solved ? 0 : 2,
                      padding: solved ? 0 : 2,
                      scale: solved ? 1.015 : 1,
                    }}
                    transition={{ duration: 0.28 }}
                    aria-label="Quebra-cabeça deslizante 3 por 3"
                  >
                    {puzzle.map((tile, position) => {
                      if (tile === null) {
                        return (
                          <motion.div
                            key="blank"
                            layout
                            className="relative overflow-hidden rounded-sm bg-cyan-950/20"
                            aria-label="Espaço vazio"
                          >
                            {solved && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.42 }}
                                className="absolute inset-0 bg-cover"
                                style={getTileStyle(8)}
                              />
                            )}
                          </motion.div>
                        )
                      }

                      const movable =
                        movableTileIndices.includes(position)

                      return (
                        <motion.button
                          key={tile}
                          layout
                          type="button"
                          disabled={solved}
                          onClick={() => handleTileClick(position)}
                          transition={{
                            layout: {
                              duration: 0.15,
                              ease: 'easeOut',
                            },
                          }}
                          whileTap={movable ? { scale: 0.98 } : undefined}
                          className={
                            movable
                              ? 'touch-manipulation select-none rounded-sm border border-cyan-100/70 brightness-110 shadow-[inset_0_0_16px_rgba(103,232,249,.16),0_0_10px_rgba(103,232,249,.18)]'
                              : 'touch-manipulation select-none rounded-sm border border-white/10'
                          }
                          style={getTileStyle(tile)}
                          aria-label={`Peça ${tile + 1}${movable ? ', pode mover' : ''}`}
                        />
                      )
                    })}
                  </motion.div>
                </div>

                <div className="shrink-0 px-3 pb-1 text-center">
                  <AnimatePresence mode="wait">
                    {solved ? (
                      <motion.p
                        key="solved"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200"
                      >
                        Imagem reconstruída
                      </motion.p>
                    ) : (
                      <motion.p
                        key="instruction"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] font-bold text-white/35"
                      >
                        Toque em uma peça iluminada ao lado do espaço vazio.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <div className="relative w-44 overflow-hidden rounded-[26px] border border-cyan-100/30 p-1 shadow-[0_0_50px_rgba(103,232,249,.2)] sm:w-52">
                  <img
                    src={puzzleImage}
                    alt="Mosaico Arcano reconstruído"
                    className="aspect-square w-full rounded-[22px] object-cover"
                  />
                  <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-cyan-950 shadow-lg">
                    <Trophy size={20} />
                  </div>
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                  Discernimento concluído
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Imagem Reconstruída
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  Resolvido em {movements} movimentos
                </p>

                <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.06] px-10 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                    Stacks
                  </p>
                  <p className="mt-1 text-3xl font-black text-cyan-200">
                    {currentStacks}/{targetStacks}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-black text-cyan-950 active:scale-[0.98]"
                >
                  <RotateCcw size={18} />
                  Treinar Novamente
                </button>
                <button
                  type="button"
                  onClick={exitTraining}
                  className="mt-3 min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 font-black active:scale-[0.98]"
                >
                  Voltar aos Treinos
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  )
}
