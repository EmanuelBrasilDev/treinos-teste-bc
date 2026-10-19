import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react'

import { useTrainingStore } from '../../features/training/store/useTrainingStore'

type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'

type CycleFeedback =
  | 'stable'
  | 'unstable'
  | null

interface FlowTarget {
  center: number
  min: number
  max: number
}

const FLOW_MIN = 0
const FLOW_MAX = 100
const INITIAL_FLOW = 50

const CONTROL_SPEED = 32
const CYCLE_DURATION = 2000
const TARGET_HALF_WIDTH = 8
const MIN_TARGET_CENTER = FLOW_MIN + TARGET_HALF_WIDTH
const MAX_TARGET_CENTER = FLOW_MAX - TARGET_HALF_WIDTH

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.max(min, Math.min(max, value))

const createTarget = (
  center: number
): FlowTarget => {
  const safeCenter = clamp(
    center,
    MIN_TARGET_CENTER,
    MAX_TARGET_CENTER
  )

  return {
    center: safeCenter,
    min: safeCenter - TARGET_HALF_WIDTH,
    max: safeCenter + TARGET_HALF_WIDTH,
  }
}

const createInitialTarget = () =>
  createTarget(35 + Math.random() * 30)

const createDrift = () =>
  -3 + Math.random() * 6

const createNextTarget = (
  currentFlow: number
) => {
  const directions: number[] = []

  if (
    currentFlow + 12 <=
    MAX_TARGET_CENTER
  ) {
    directions.push(1)
  }

  if (
    currentFlow - 12 >=
    MIN_TARGET_CENTER
  ) {
    directions.push(-1)
  }

  const direction =
    directions[
      Math.floor(
        Math.random() *
        directions.length
      )
    ] ?? (currentFlow < 50 ? 1 : -1)

  const availableDistance =
    direction > 0
      ? MAX_TARGET_CENTER - currentFlow
      : currentFlow - MIN_TARGET_CENTER

  const maxDistance = Math.min(
    30,
    Math.max(12, availableDistance)
  )

  const distance =
    12 +
    Math.random() *
      Math.max(0, maxDistance - 12)

  return createTarget(
    currentFlow + direction * distance
  )
}

export function FluxoTraining() {
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

  const [flow, setFlow] =
    useState(INITIAL_FLOW)

  const [target, setTarget] =
    useState<FlowTarget>(createInitialTarget)

  const [drift, setDrift] =
    useState(createDrift)

  const [cycleProgress, setCycleProgress] =
    useState(0)

  const [feedback, setFeedback] =
    useState<CycleFeedback>(null)

  const [containActive, setContainActive] =
    useState(false)

  const [boostActive, setBoostActive] =
    useState(false)

  const phaseRef = useRef<GamePhase>('ready')
  const flowRef = useRef(INITIAL_FLOW)
  const targetRef = useRef(target)
  const driftRef = useRef(drift)
  const stacksRef = useRef(currentStacks)

  const containRef = useRef(false)
  const boostRef = useRef(false)

  const animationRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const nextEvaluationAtRef = useRef(0)
  const lastVisualUpdateRef = useRef(0)
  const feedbackTimerRef = useRef<number | null>(null)

  const progress =
    targetStacks > 0
      ? (currentStacks / targetStacks) * 100
      : 0

  const distanceFromTarget =
    flow < target.min
      ? target.min - flow
      : flow > target.max
        ? flow - target.max
        : 0

  const isStable = distanceFromTarget === 0

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(
        feedbackTimerRef.current
      )
      feedbackTimerRef.current = null
    }
  }

  const stopControls = useCallback(() => {
    containRef.current = false
    boostRef.current = false
    setContainActive(false)
    setBoostActive(false)
  }, [])

  const setContain = useCallback((active: boolean) => {
    containRef.current = active
    setContainActive(active)
  }, [])

  const setBoost = useCallback((active: boolean) => {
    boostRef.current = active
    setBoostActive(active)
  }, [])

  const startGame = () => {
    const nextTarget = createInitialTarget()

    resetProgress()
    stacksRef.current = 0

    flowRef.current = INITIAL_FLOW
    targetRef.current = nextTarget
    const nextDrift = createDrift()
    driftRef.current = nextDrift

    lastFrameRef.current = null
    nextEvaluationAtRef.current = 0
    lastVisualUpdateRef.current = 0

    stopControls()
    clearFeedbackTimer()

    setFlow(INITIAL_FLOW)
    setTarget(nextTarget)
    setDrift(nextDrift)
    setCycleProgress(0)
    setFeedback(null)
    setCountdown(3)

    phaseRef.current = 'countdown'
    setPhase('countdown')
  }

  const exitTraining = () => {
    phaseRef.current = 'ready'

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    stopControls()
    clearFeedbackTimer()
    returnToMenu()
  }

  useEffect(() => {
    stacksRef.current = currentStacks
  }, [currentStacks])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'countdown') {
      return
    }

    if (countdown <= 0) {
      const timer = window.setTimeout(() => {
        phaseRef.current = 'playing'
        setPhase('playing')
      }, 400)

      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => value - 1)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [phase, countdown])

  useEffect(() => {
    if (phase !== 'playing') {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      lastFrameRef.current = null
      return
    }

    const startedAt = performance.now()
    lastFrameRef.current = startedAt
    nextEvaluationAtRef.current =
      startedAt + CYCLE_DURATION
    lastVisualUpdateRef.current = startedAt

    const frame = (time: number) => {
      if (phaseRef.current !== 'playing') {
        return
      }

      const previousFrame =
        lastFrameRef.current ?? time

      const delta = Math.min(
        (time - previousFrame) / 1000,
        0.05
      )

      lastFrameRef.current = time

      const inputAxis =
        containRef.current === boostRef.current
          ? 0
          : containRef.current
            ? -1
            : 1

      flowRef.current = clamp(
        flowRef.current +
          (
            inputAxis * CONTROL_SPEED +
            driftRef.current
          ) *
            delta,
        FLOW_MIN,
        FLOW_MAX
      )

      if (
        time - lastVisualUpdateRef.current >=
        32
      ) {
        lastVisualUpdateRef.current = time
        setFlow(flowRef.current)
        setCycleProgress(
          clamp(
            1 -
              (
                nextEvaluationAtRef.current -
                time
              ) /
                CYCLE_DURATION,
            0,
            1
          )
        )
      }

      if (
        time >=
        nextEvaluationAtRef.current
      ) {
        const activeTarget = targetRef.current
        const evaluatedFlow = flowRef.current
        const successful =
          evaluatedFlow >= activeTarget.min &&
          evaluatedFlow <= activeTarget.max

        clearFeedbackTimer()

        if (successful) {
          const nextStacks = Math.min(
            targetStacks,
            stacksRef.current + 2
          )

          addStack(2)
          stacksRef.current = nextStacks
          setFeedback('stable')

          if (
            targetStacks > 0 &&
            nextStacks >= targetStacks
          ) {
            phaseRef.current = 'complete'
            stopControls()
            setFlow(evaluatedFlow)
            setCycleProgress(1)
            setPhase('complete')
            return
          }

          const nextTarget =
            createNextTarget(evaluatedFlow)

          targetRef.current = nextTarget
          const nextDrift = createDrift()
          driftRef.current = nextDrift
          setTarget(nextTarget)
          setDrift(nextDrift)
        } else {
          const nextStacks = Math.max(
            0,
            stacksRef.current - 1
          )

          addStack(-1)
          stacksRef.current = nextStacks
          setFeedback('unstable')
        }

        setFlow(evaluatedFlow)
        setCycleProgress(0)

        nextEvaluationAtRef.current =
          time + CYCLE_DURATION

        feedbackTimerRef.current =
          window.setTimeout(() => {
            setFeedback(null)
            feedbackTimerRef.current = null
          }, 650)
      }

      animationRef.current =
        requestAnimationFrame(frame)
    }

    animationRef.current =
      requestAnimationFrame(frame)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      lastFrameRef.current = null
    }
  }, [
    phase,
    addStack,
    stopControls,
    targetStacks,
  ])

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (phaseRef.current !== 'playing') {
        return
      }

      if (
        event.code === 'KeyA' ||
        event.code === 'ArrowLeft'
      ) {
        event.preventDefault()
        setContain(true)
      }

      if (
        event.code === 'KeyD' ||
        event.code === 'ArrowRight'
      ) {
        event.preventDefault()
        setBoost(true)
      }
    }

    const handleKeyUp = (
      event: KeyboardEvent
    ) => {
      if (
        event.code === 'KeyA' ||
        event.code === 'ArrowLeft'
      ) {
        event.preventDefault()
        setContain(false)
      }

      if (
        event.code === 'KeyD' ||
        event.code === 'ArrowRight'
      ) {
        event.preventDefault()
        setBoost(false)
      }
    }

    const handleBlur = () => stopControls()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [setBoost, setContain, stopControls])

  useEffect(() => () => {
    clearFeedbackTimer()
    stopControls()
  }, [stopControls])

  const targetWidth =
    target.max - target.min

  const circuitStatus =
    isStable
      ? 'stable'
      : distanceFromTarget > 20
        ? 'strained'
        : 'adjusting'

  const cycleCircumference = 289
  const cycleOffset =
    cycleCircumference *
    (1 - cycleProgress)

  return (
    <main className="game-shell game-fluxo min-h-[100dvh] overflow-hidden overscroll-none bg-[#070610] text-white">
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] sm:max-w-lg lg:max-w-xl">
        <header className="game-hud shrink-0">
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
                <Sparkles size={18} className="text-violet-300" />
                <h1 className="text-lg font-black">Fluxo</h1>
              </div>
              <p className="text-[11px] text-white/35">Circuito de Mana</p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Stacks</p>
              <p className="text-lg font-black">
                {currentStacks}
                <span className="text-white/30">/{targetStacks}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-violet-400"
              animate={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="game-stage relative flex min-h-0 flex-1 flex-col pt-3">
          <AnimatePresence mode="wait">
            {phase === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <div className="fluxo-ready-orb">
                  <Sparkles size={38} />
                </div>

                <h2 className="mt-5 text-3xl font-black">Circuito de Mana</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">
                  Mantenha o fluxo dentro da faixa quando o circuito avaliar.
                </p>

                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  <div className="fluxo-rule-card">
                    <ArrowDown size={21} className="text-cyan-300" />
                    <strong>CONTER</strong>
                    <span>Reduz o Fluxo</span>
                  </div>
                  <div className="fluxo-rule-card">
                    <ArrowUp size={21} className="text-violet-300" />
                    <strong>IMPULSIONAR</strong>
                    <span>Aumenta o Fluxo</span>
                  </div>
                </div>

                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3">
                    <p className="text-[10px] font-black text-emerald-200">ACERTO</p>
                    <p className="mt-1 text-sm font-black">+2 Stacks</p>
                  </div>
                  <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.06] p-3">
                    <p className="text-[10px] font-black text-rose-200">ERRO</p>
                    <p className="mt-1 text-sm font-black">-1 Stack</p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-bold text-white/30">
                  Avaliação a cada 2 segundos
                </p>

                <button
                  type="button"
                  onClick={startGame}
                  className="mt-5 min-h-14 w-full rounded-2xl bg-violet-400 px-6 font-black text-violet-950 shadow-[0_12px_35px_rgba(139,92,246,.24)] active:scale-[0.98]"
                >
                  Começar Treino
                </button>
              </motion.div>
            )}

            {phase === 'countdown' && (
              <motion.div
                key={`countdown-${countdown}`}
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.35 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                {countdown > 0 ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-200/50">Sincronizando</p>
                    <p className="fluxo-countdown mt-4 text-8xl font-black">{countdown}</p>
                  </>
                ) : (
                  <p className="fluxo-countdown text-5xl font-black">VAI!</p>
                )}
              </motion.div>
            )}

            {phase === 'playing' && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-0 flex-1 flex-col"
                data-flow={Math.round(flow)}
                data-stacks={currentStacks}
                data-target-min={Math.round(target.min)}
                data-target-max={Math.round(target.max)}
              >
                <div className="flex min-h-0 flex-1 items-center justify-center py-2">
                  <motion.div
                    className="fluxo-circuit"
                    data-status={circuitStatus}
                    animate={
                      feedback === 'stable'
                        ? { scale: [1, 1.06, 1] }
                        : feedback === 'unstable'
                          ? { x: [0, -4, 4, -3, 3, 0] }
                          : { x: 0, scale: 1 }
                    }
                    transition={{ duration: 0.24 }}
                  >
                    <div className="fluxo-circuit-runes" />
                    <div className="fluxo-circuit-orbit fluxo-circuit-orbit-a" />
                    <div className="fluxo-circuit-orbit fluxo-circuit-orbit-b" />

                    <svg className="fluxo-cycle-ring" viewBox="0 0 104 104" aria-label="Tempo restante do ciclo">
                      <circle cx="52" cy="52" r="46" className="fluxo-cycle-track" />
                      <circle
                        cx="52"
                        cy="52"
                        r="46"
                        className="fluxo-cycle-progress"
                        strokeDasharray={cycleCircumference}
                        strokeDashoffset={cycleOffset}
                      />
                    </svg>

                    <div className="fluxo-core">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Fluxo</span>
                      <strong>{Math.round(flow)}</strong>
                    </div>

                    <span className="fluxo-mana-node fluxo-node-a" />
                    <span className="fluxo-mana-node fluxo-node-b" />
                    <span className="fluxo-mana-node fluxo-node-c" />
                    <span className="fluxo-mana-node fluxo-node-d" />
                  </motion.div>
                </div>

                <div className="shrink-0">
                  <div className="mb-2 flex items-end justify-between px-1">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Fluxo necessário</p>
                      <p className="text-sm font-black text-violet-200">
                        {Math.round(target.min)}–{Math.round(target.max)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Tendência</p>
                      <p className="text-xs font-black text-white/55">
                        {drift >= 0 ? '↑ Crescente' : '↓ Decrescente'}
                      </p>
                    </div>
                  </div>

                  <div className="fluxo-meter" aria-label={`Fluxo ${Math.round(flow)}, alvo entre ${Math.round(target.min)} e ${Math.round(target.max)}`}>
                    <div
                      className="fluxo-target-zone"
                      style={{
                        left: `${target.min}%`,
                        width: `${targetWidth}%`,
                      }}
                    >
                      <span>ESTÁVEL</span>
                    </div>
                    <div
                      className="fluxo-marker"
                      data-stable={isStable}
                      style={{ left: `${flow}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between px-1 text-[9px] font-bold text-white/25">
                    <span>0</span>
                    <span>{isStable ? 'FLUXO ALINHADO' : flow < target.min ? 'ABAIXO DA FAIXA' : 'ACIMA DA FAIXA'}</span>
                    <span>100</span>
                  </div>

                  <AnimatePresence mode="wait">
                    {feedback && (
                      <motion.div
                        key={feedback}
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`fluxo-feedback ${feedback === 'stable' ? 'fluxo-feedback-stable' : 'fluxo-feedback-unstable'}`}
                      >
                        <strong>{feedback === 'stable' ? 'FLUXO ESTÁVEL' : 'FLUXO INSTÁVEL'}</strong>
                        <span>{feedback === 'stable' ? '+2 STACKS' : '-1 STACK'}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.currentTarget.setPointerCapture(event.pointerId)
                        setContain(true)
                      }}
                      onPointerUp={() => setContain(false)}
                      onPointerCancel={() => setContain(false)}
                      onPointerLeave={() => setContain(false)}
                      className={`fluxo-control ${containActive ? 'fluxo-control-active' : ''}`}
                    >
                      <ArrowDown size={26} />
                      <span>CONTER</span>
                      <small>A ou ←</small>
                    </button>

                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.currentTarget.setPointerCapture(event.pointerId)
                        setBoost(true)
                      }}
                      onPointerUp={() => setBoost(false)}
                      onPointerCancel={() => setBoost(false)}
                      onPointerLeave={() => setBoost(false)}
                      className={`fluxo-control fluxo-control-boost ${boostActive ? 'fluxo-control-active' : ''}`}
                    >
                      <ArrowUp size={26} />
                      <span>IMPULSIONAR</span>
                      <small>D ou →</small>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <div className="fluxo-complete-orb">
                  <Trophy size={42} />
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-violet-300">Fluxo dominado</p>
                <h2 className="mt-2 text-3xl font-black">Circuito estabilizado</h2>
                <p className="mt-3 text-sm text-white/45">Você manteve a mana sob controle.</p>

                <div className="mt-6 rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] px-10 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Stacks</p>
                  <p className="mt-1 text-3xl font-black text-violet-200">{currentStacks}/{targetStacks}</p>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-400 font-black text-violet-950 active:scale-[0.98]"
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
