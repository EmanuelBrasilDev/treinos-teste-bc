import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  PointerEvent as ReactPointerEvent,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  ArrowLeft,
  Crosshair,
  RotateCcw,
  Trophy,
  Zap,
} from 'lucide-react'

import { useTrainingStore } from '../../features/training/store/useTrainingStore'

type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'

interface Point {
  x: number
  y: number
}

interface Target extends Point {
  radius: number
  hp: number
  maxHp: number
}

const BOARD_WIDTH = 360
const BOARD_HEIGHT = 500

const ORIGIN: Point = {
  x: 180,
  y: 410,
}

const MAX_PULL = 86
const MIN_PULL = 18

const PROJECTILE_RADIUS = 10

const VELOCITY_SCALE = 6.4
const GRAVITY = 115

/*
 * Movimento contínuo dos alvos.
 *
 * A dificuldade cresce com os Stacks,
 * mas o padrão continua previsível:
 * movimento horizontal com rebote.
 */
const TARGET_SIDE_PADDING = 20

const TARGET_SPEED_SLOW = 48
const TARGET_SPEED_MEDIUM = 68
const TARGET_SPEED_FAST = 88

const TARGET_POSITIONS: Point[] = [
  { x: 90, y: 145 },
  { x: 270, y: 130 },
  { x: 180, y: 195 },
  { x: 75, y: 230 },
  { x: 285, y: 215 },
  { x: 145, y: 92 },
  { x: 230, y: 170 },
  { x: 180, y: 78 },
]

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.max(
    min,
    Math.min(max, value)
  )

const distance = (
  a: Point,
  b: Point
) =>
  Math.hypot(
    a.x - b.x,
    a.y - b.y
  )

function getTargetSpeed(
  stacks: number,
  number: number
) {
  const baseSpeed =
    stacks <= 30
      ? TARGET_SPEED_SLOW
      : stacks <= 65
        ? TARGET_SPEED_MEDIUM
        : TARGET_SPEED_FAST

  const variation =
    (
      number * 7
    ) %
      13 -
    6

  return (
    baseSpeed +
    variation
  )
}

function makeTarget(
  number: number,
  stacks: number,
  targetStacks: number
): Target {
  const progress =
    targetStacks > 0
      ? stacks / targetStacks
      : 0

  const position =
    TARGET_POSITIONS[
      (
        number * 3 +
        Math.floor(stacks / 10)
      ) %
      TARGET_POSITIONS.length
    ]

  const radius =
    progress < 0.35
      ? 30
      : progress < 0.7
        ? 26
        : 22

  const maxHp =
    progress < 0.35
      ? 65
      : progress < 0.7
        ? 85
        : 105

  return {
    ...position,
    radius,
    hp: maxHp,
    maxHp,
  }
}

function clampPull(
  point: Point
): Point {
  let dx =
    point.x -
    ORIGIN.x

  let dy =
    Math.max(
      0,
      point.y -
        ORIGIN.y
    )

  const pull =
    Math.hypot(dx, dy)

  if (pull > MAX_PULL) {
    const scale =
      MAX_PULL / pull

    dx *= scale
    dy *= scale
  }

  return {
    x:
      ORIGIN.x +
      dx,

    y:
      ORIGIN.y +
      dy,
  }
}

function trajectory(
  aim: Point
): Point[] {
  const pull =
    distance(
      aim,
      ORIGIN
    )

  if (pull < MIN_PULL) {
    return []
  }

  const vx =
    (
      ORIGIN.x -
      aim.x
    ) *
    VELOCITY_SCALE

  const vy =
    (
      ORIGIN.y -
      aim.y
    ) *
    VELOCITY_SCALE

  const result: Point[] = []

  for (
    let index = 1;
    index <= 9;
    index += 1
  ) {
    const time =
      index * 0.105

    const point = {
      x:
        ORIGIN.x +
        vx * time,

      y:
        ORIGIN.y +
        vy * time +
        0.5 *
          GRAVITY *
          time *
          time,
    }

    if (
      point.x > -20 &&
      point.x <
        BOARD_WIDTH + 20 &&
      point.y > -20 &&
      point.y <
        BOARD_HEIGHT + 20
    ) {
      result.push(point)
    }
  }

  return result
}

export function RupturaTraining() {
  const {
    currentStacks,
    targetStacks,
    addStack,
    resetProgress,
    returnToMenu,
  } = useTrainingStore()

  const [phase, setPhase] =
    useState<GamePhase>('ready')

  const [
    countdown,
    setCountdown,
  ] =
    useState(3)

  const [
    dragging,
    setDragging,
  ] =
    useState(false)

  const [
    aim,
    setAim,
  ] =
    useState<Point>(
      ORIGIN
    )

  const [
    projectile,
    setProjectile,
  ] =
    useState<Point | null>(
      null
    )

  const [
    target,
    setTarget,
  ] =
    useState<Target | null>(
      null
    )

  const [
    targetNumber,
    setTargetNumber,
  ] =
    useState(1)

  const [
    shots,
    setShots,
  ] =
    useState(0)

  const [
    feedback,
    setFeedback,
  ] =
    useState<string | null>(
      null
    )

  const svgRef =
    useRef<SVGSVGElement | null>(
      null
    )

  const phaseRef =
    useRef<GamePhase>('ready')

  const targetRef =
    useRef<Target | null>(
      null
    )

  const projectileRef =
    useRef<Point | null>(
      null
    )

  const velocityRef =
    useRef<Point>({
      x: 0,
      y: 0,
    })

  const chargeRef =
    useRef(0)

  const stacksRef =
    useRef(currentStacks)

  const targetNumberRef =
    useRef(1)

  const flyingRef =
    useRef(false)

  const frameRef =
    useRef<number | null>(
      null
    )

  const lastFrameRef =
    useRef<number | null>(
      null
    )

  const feedbackTimerRef =
    useRef<number | null>(
      null
    )

  const targetTimerRef =
    useRef<number | null>(
      null
    )

  
  /*
   * Loop separado do alvo.
   *
   * Não reutilizar frameRef porque
   * ele pertence ao projétil.
   */
  const targetFrameRef =
    useRef<number | null>(
      null
    )

  const targetLastFrameRef =
    useRef<number | null>(
      null
    )

  const targetVelocityRef =
    useRef(0)

const pull =
    dragging
      ? distance(
          aim,
          ORIGIN
        )
      : 0

  const power =
    Math.round(
      clamp(
        (
          pull /
          MAX_PULL
        ) *
          100,
        0,
        100
      )
    )

  const progress =
    targetStacks > 0
      ? (
          currentStacks /
          targetStacks
        ) *
        100
      : 0

  const preview =
    dragging
      ? trajectory(aim)
      : []

  const clearTimers =
    useCallback(() => {
      if (
        frameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          frameRef.current
        )

        frameRef.current =
          null
      }

      
      if (
        targetFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          targetFrameRef.current
        )

        targetFrameRef.current =
          null
      }

      targetLastFrameRef.current =
        null

if (
        feedbackTimerRef.current !==
        null
      ) {
        clearTimeout(
          feedbackTimerRef.current
        )

        feedbackTimerRef.current =
          null
      }

      if (
        targetTimerRef.current !==
        null
      ) {
        clearTimeout(
          targetTimerRef.current
        )

        targetTimerRef.current =
          null
      }

      flyingRef.current =
        false

      lastFrameRef.current =
        null
    }, [])

  const showFeedback =
    useCallback(
      (
        text: string,
        duration = 850
      ) => {
        if (
          feedbackTimerRef.current !==
          null
        ) {
          clearTimeout(
            feedbackTimerRef.current
          )
        }

        setFeedback(text)

        feedbackTimerRef.current =
          window.setTimeout(
            () => {
              setFeedback(null)

              feedbackTimerRef.current =
                null
            },
            duration
          )
      },
      []
    )

  const prepareTarget =
    useCallback(
      (
        number: number,
        stacks: number
      ) => {
        const next =
          makeTarget(
            number,
            stacks,
            targetStacks
          )

        
        const direction =
          number % 2 === 0
            ? -1
            : 1

        targetVelocityRef.current =
          getTargetSpeed(
            stacks,
            number
          ) *
          direction

        targetLastFrameRef.current =
          null

        targetRef.current =
          next

        setTarget(next)
      },
      [
        targetStacks,
      ]
    )

  const resetShot = () => {
    flyingRef.current =
      false

    projectileRef.current =
      null

    lastFrameRef.current =
      null

    setProjectile(null)
    setAim(ORIGIN)
    setDragging(false)
  }

  const startGame = () => {
    clearTimers()
    resetProgress()

    stacksRef.current = 0
    targetNumberRef.current = 1

    setShots(0)
    setTargetNumber(1)

    resetShot()

    prepareTarget(
      1,
      0
    )

    setFeedback(null)
    setCountdown(3)

    phaseRef.current =
      'countdown'

    setPhase(
      'countdown'
    )
  }

  const finishGame = () => {
    clearTimers()
    resetShot()

    phaseRef.current =
      'complete'

    setPhase(
      'complete'
    )
  }

  const exitTraining = () => {
    clearTimers()

    targetRef.current =
      null

    projectileRef.current =
      null

    returnToMenu()
  }

  useEffect(() => {
    stacksRef.current =
      currentStacks
  }, [
    currentStacks,
  ])

  useEffect(() => {
    phaseRef.current =
      phase
  }, [
    phase,
  ])

  useEffect(() => {
    if (
      phase !==
      'countdown'
    ) {
      return
    }

    if (
      countdown <= 0
    ) {
      const timer =
        window.setTimeout(
          () => {
            phaseRef.current =
              'playing'

            setPhase(
              'playing'
            )
          },
          400
        )

      return () =>
        clearTimeout(timer)
    }

    const timer =
      window.setTimeout(
        () => {
          setCountdown(
            (value) =>
              value - 1
          )
        },
        700
      )

    return () =>
      clearTimeout(timer)
  }, [
    phase,
    countdown,
  ])

  useEffect(() => {
    if (
      phase !==
      'playing'
    ) {
      return
    }

    let active = true

    targetLastFrameRef.current =
      null

    const moveTarget = (
      time: number
    ) => {
      if (
        !active ||
        phaseRef.current !==
          'playing'
      ) {
        return
      }

      if (
        targetLastFrameRef.current ===
        null
      ) {
        targetLastFrameRef.current =
          time
      }

      const delta =
        Math.min(
          (
            time -
            targetLastFrameRef.current
          ) /
            1000,
          0.032
        )

      targetLastFrameRef.current =
        time

      const currentTarget =
        targetRef.current

      if (currentTarget) {
        const minX =
          TARGET_SIDE_PADDING +
          currentTarget.radius

        const maxX =
          BOARD_WIDTH -
          TARGET_SIDE_PADDING -
          currentTarget.radius

        let velocity =
          targetVelocityRef.current

        let nextX =
          currentTarget.x +
          velocity *
            delta

        /*
         * Rebote horizontal.
         */
        if (
          nextX <= minX
        ) {
          nextX =
            minX

          velocity =
            Math.abs(
              velocity
            )
        } else if (
          nextX >= maxX
        ) {
          nextX =
            maxX

          velocity =
            -Math.abs(
              velocity
            )
        }

        targetVelocityRef.current =
          velocity

        const movedTarget = {
          ...currentTarget,
          x: nextX,
        }

        /*
         * Atualizamos state + ref.
         *
         * checkHit() usa targetRef,
         * portanto a colisão acompanha
         * a posição atual do alvo.
         */
        targetRef.current =
          movedTarget

        setTarget(
          movedTarget
        )
      }

      targetFrameRef.current =
        requestAnimationFrame(
          moveTarget
        )
    }

    targetFrameRef.current =
      requestAnimationFrame(
        moveTarget
      )

    return () => {
      active = false

      if (
        targetFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          targetFrameRef.current
        )

        targetFrameRef.current =
          null
      }

      targetLastFrameRef.current =
        null
    }
  }, [
    phase,
  ])

  useEffect(
    () => () => {
      clearTimers()
    },
    [
      clearTimers,
    ]
  )

  const boardPoint = (
    event:
      ReactPointerEvent<SVGGElement>
  ): Point => {
    const svg =
      svgRef.current

    if (!svg) {
      return ORIGIN
    }

    const rect =
      svg.getBoundingClientRect()

    return {
      x:
        (
          event.clientX -
          rect.left
        ) /
        rect.width *
        BOARD_WIDTH,

      y:
        (
          event.clientY -
          rect.top
        ) /
        rect.height *
        BOARD_HEIGHT,
    }
  }

  const destroyTarget = (
    coreHit: boolean
  ) => {
    const reward =
      coreHit
        ? 3
        : 2

    const nextStacks =
      Math.min(
        targetStacks,
        stacksRef.current +
          reward
      )

    stacksRef.current =
      nextStacks

    addStack(reward)

    showFeedback(
      coreHit
        ? `RUPTURA PERFEITA · +${reward} Stacks`
        : `ALVO DESTRUÍDO · +${reward} Stacks`,
      1000
    )

    targetRef.current =
      null

    setTarget(null)

    resetShot()

    if (
      targetStacks > 0 &&
      nextStacks >=
        targetStacks
    ) {
      targetTimerRef.current =
        window.setTimeout(
          finishGame,
          650
        )

      return
    }

    const nextNumber =
      targetNumberRef.current +
      1

    targetNumberRef.current =
      nextNumber

    setTargetNumber(
      nextNumber
    )

    targetTimerRef.current =
      window.setTimeout(
        () => {
          prepareTarget(
            nextNumber,
            nextStacks
          )

          targetTimerRef.current =
            null
        },
        500
      )
  }

  const checkHit = (
    point: Point
  ) => {
    const currentTarget =
      targetRef.current

    if (!currentTarget) {
      return false
    }

    const hitDistance =
      distance(
        point,
        currentTarget
      )

    if (
      hitDistance >
      currentTarget.radius +
        PROJECTILE_RADIUS
    ) {
      return false
    }

    const coreHit =
      hitDistance <=
      currentTarget.radius *
        0.36

    const damage =
      Math.round(
        (
          28 +
          chargeRef.current *
            0.85
        ) *
        (
          coreHit
            ? 1.3
            : 1
        )
      )

    const remaining =
      Math.max(
        0,
        currentTarget.hp -
          damage
      )

    if (
      remaining <= 0
    ) {
      destroyTarget(
        coreHit
      )

      return true
    }

    const updated = {
      ...currentTarget,
      hp: remaining,
    }

    targetRef.current =
      updated

    setTarget(updated)

    showFeedback(
      coreHit
        ? `NÚCLEO · -${damage}`
        : `IMPACTO · -${damage}`
    )

    resetShot()

    return true
  }

  const launch = (
    finalAim: Point
  ) => {
    const pullDistance =
      distance(
        finalAim,
        ORIGIN
      )

    if (
      pullDistance <
      MIN_PULL
    ) {
      resetShot()

      showFeedback(
        'Puxe mais para carregar a magia.'
      )

      return
    }

    chargeRef.current =
      clamp(
        (
          pullDistance /
          MAX_PULL
        ) *
          100,
        0,
        100
      )

    velocityRef.current = {
      x:
        (
          ORIGIN.x -
          finalAim.x
        ) *
        VELOCITY_SCALE,

      y:
        (
          ORIGIN.y -
          finalAim.y
        ) *
        VELOCITY_SCALE,
    }

    projectileRef.current =
      ORIGIN

    setProjectile(
      ORIGIN
    )

    setDragging(false)
    setAim(ORIGIN)

    setShots(
      (value) =>
        value + 1
    )

    flyingRef.current =
      true

    lastFrameRef.current =
      null

    const animate = (
      time: number
    ) => {
      if (
        !flyingRef.current
      ) {
        return
      }

      if (
        lastFrameRef.current ===
        null
      ) {
        lastFrameRef.current =
          time
      }

      const delta =
        Math.min(
          (
            time -
            lastFrameRef.current
          ) /
            1000,
          0.032
        )

      lastFrameRef.current =
        time

      velocityRef.current = {
        x:
          velocityRef.current.x,

        y:
          velocityRef.current.y +
          GRAVITY *
            delta,
      }

      const current =
        projectileRef.current ??
        ORIGIN

      const next = {
        x:
          current.x +
          velocityRef.current.x *
            delta,

        y:
          current.y +
          velocityRef.current.y *
            delta,
      }

      projectileRef.current =
        next

      setProjectile(next)

      if (
        checkHit(next)
      ) {
        return
      }

      const outside =
        next.x < -40 ||
        next.x >
          BOARD_WIDTH + 40 ||
        next.y < -70 ||
        next.y >
          BOARD_HEIGHT + 45

      if (outside) {
        resetShot()

        showFeedback(
          'ERROU O ALVO'
        )

        return
      }

      frameRef.current =
        requestAnimationFrame(
          animate
        )
    }

    frameRef.current =
      requestAnimationFrame(
        animate
      )
  }

  const pointerDown = (
    event:
      ReactPointerEvent<SVGGElement>
  ) => {
    if (
      phaseRef.current !==
        'playing' ||
      flyingRef.current ||
      !targetRef.current
    ) {
      return
    }

    event.preventDefault()

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      )

    setDragging(true)

    setAim(
      clampPull(
        boardPoint(event)
      )
    )
  }

  const pointerMove = (
    event:
      ReactPointerEvent<SVGGElement>
  ) => {
    if (!dragging) {
      return
    }

    event.preventDefault()

    setAim(
      clampPull(
        boardPoint(event)
      )
    )
  }

  const pointerUp = (
    event:
      ReactPointerEvent<SVGGElement>
  ) => {
    if (!dragging) {
      return
    }

    event.preventDefault()

    const finalAim =
      clampPull(
        boardPoint(event)
      )

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        )
    }

    launch(finalAim)
  }

  const pointerCancel = (
    event:
      ReactPointerEvent<SVGGElement>
  ) => {
    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        )
    }

    resetShot()
  }

  return (
    <main
      className="
        min-h-[100dvh]
        overflow-hidden
        overscroll-none
        bg-[#080707]
        text-white
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[100dvh]
          w-full
          max-w-md
          flex-col
          px-3
          pb-[max(12px,env(safe-area-inset-bottom))]
          pt-[max(12px,env(safe-area-inset-top))]
          sm:max-w-lg
        "
      >
        <header
          className="
            shrink-0
            pb-3
          "
        >
          <div
            className="
              grid
              grid-cols-[44px_minmax(0,1fr)_auto]
              items-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={
                exitTraining
              }
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/5
              "
            >
              <ArrowLeft
                size={20}
              />
            </button>

            <div
              className="
                min-w-0
                flex-1
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <Zap
                  size={18}
                  className="
                    text-red-400
                  "
                />

                <h1
                  className="
                    text-lg
                    font-black
                  "
                >
                  Ruptura
                </h1>
              </div>

              <p
                className="
                  text-[11px]
                  text-white/35
                "
              >
                Artilharia Mágica
              </p>
            </div>

            <div
              className="
                text-right
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-widest
                  text-white/30
                "
              >
                Stacks
              </p>

              <p
                className="
                  text-lg
                  font-black
                "
              >
                {currentStacks}
                <span
                  className="
                    text-white/30
                  "
                >
                  /
                  {targetStacks}
                </span>
              </p>
            </div>
          </div>

          <div
            className="
              mt-3
              h-1.5
              overflow-hidden
              rounded-full
              bg-white/10
            "
          >
            <motion.div
              className="
                h-full
                rounded-full
                bg-red-500
              "
              animate={{
                width:
                  `${progress}%`,
              }}
            />
          </div>
        </header>

        <section
          className="
            relative
            flex
            min-h-0
            flex-1
            flex-col
            pt-3
          "
        >
          <AnimatePresence
            mode="wait"
          >
            {phase ===
              'ready' && (
              <motion.div
                key="ready"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  flex
                  h-full
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-24
                    w-24
                    items-center
                    justify-center
                    rounded-[28px]
                    border
                    border-red-400/20
                    bg-red-500/10
                    text-red-400
                  "
                >
                  <Crosshair
                    size={44}
                  />
                </div>

                <p
                  className="
                    mt-6
                    text-xs
                    font-black
                    uppercase
                    tracking-[0.3em]
                    text-red-400
                  "
                >
                  Artilharia Mágica
                </p>

                <h2
                  className="
                    mt-2
                    text-3xl
                    font-black
                  "
                >
                  Carregue e destrua
                </h2>

                <p
                  className="
                    mt-3
                    max-w-xs
                    text-sm
                    leading-6
                    text-white/45
                  "
                >
                  Segure a esfera,
                  puxe para trás e
                  antecipe o alvo em
                  movimento antes de
                  lançar a magia.
                </p>

                <div
                  className="
                    mt-6
                    grid
                    w-full
                    grid-cols-2
                    gap-2
                  "
                >
                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.035]
                      p-4
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        uppercase
                        tracking-widest
                        text-white/30
                      "
                    >
                      Destruição
                    </p>

                    <p
                      className="
                        mt-1
                        font-black
                      "
                    >
                      +2 Stacks
                    </p>
                  </div>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.035]
                      p-4
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        uppercase
                        tracking-widest
                        text-white/30
                      "
                    >
                      Núcleo
                    </p>

                    <p
                      className="
                        mt-1
                        font-black
                        text-red-300
                      "
                    >
                      +3 Stacks
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    startGame
                  }
                  className="
                    mt-7
                    min-h-14
                    w-full
                    rounded-2xl
                    bg-red-500
                    font-black
                    text-white
                  "
                >
                  Começar Treino
                </button>
              </motion.div>
            )}

            {phase ===
              'countdown' && (
              <motion.div
                key={
                  `countdown-${countdown}`
                }
                initial={{
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="
                  flex
                  h-full
                  items-center
                  justify-center
                  text-center
                "
              >
                <p
                  className="
                    text-7xl
                    font-black
                    text-red-400
                  "
                >
                  {countdown > 0
                    ? countdown
                    : 'VAI!'}
                </p>
              </motion.div>
            )}

            {phase ===
              'playing' && (
              <motion.div
                key="playing"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  grid
                  min-h-0
                  flex-1
                  grid-rows-[auto_minmax(0,1fr)_auto]
                  gap-3
                "
              >
                <div
                  className="
                    grid
                    grid-cols-2
                    items-center
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.025]
                    px-4
                    py-2.5
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-white/40
                    "
                  >
                    ALVO #{targetNumber}
                  </p>

                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-white/40
                      text-right
                    "
                  >
                    {shots} DISPAROS
                  </p>
                </div>

                <div
                  className="
                    flex
                    min-h-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-[28px]
                    border
                    border-white/10
                    bg-white/[0.025]
                  "
                >
                  <svg
                    ref={svgRef}
                    viewBox={
                      `0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`
                    }
                    preserveAspectRatio="xMidYMid meet"
                    className="
                      block
                      h-full
                      min-h-0
                      w-full
                      select-none
                      touch-none
                    "
                  >
                    <defs>
                      <filter
                        id="ruptura-glow"
                        filterUnits="userSpaceOnUse"
                        x="-100"
                        y="-100"
                        width="560"
                        height="700"
                      >
                        <feGaussianBlur
                          stdDeviation="4"
                          result="blur"
                        />

                        <feMerge>
                          <feMergeNode
                            in="blur"
                          />

                          <feMergeNode
                            in="SourceGraphic"
                          />
                        </feMerge>
                      </filter>
                    </defs>

                    {target && (
                      <g>
                        <circle
                          cx={target.x}
                          cy={target.y}
                          r={
                            target.radius +
                            8
                          }
                          fill="rgba(239,68,68,0.08)"
                        />

                        <circle
                          cx={target.x}
                          cy={target.y}
                          r={
                            target.radius
                          }
                          fill="rgba(127,29,29,0.9)"
                          stroke="rgb(248 113 113)"
                          strokeWidth="3"
                          filter="url(#ruptura-glow)"
                        />

                        <circle
                          cx={target.x}
                          cy={target.y}
                          r={
                            target.radius *
                            0.34
                          }
                          fill="white"
                          stroke="rgb(248 113 113)"
                          strokeWidth="2"
                        />

                        <rect
                          x={
                            target.x -
                            34
                          }
                          y={
                            target.y -
                            target.radius -
                            20
                          }
                          width="68"
                          height="6"
                          rx="3"
                          fill="rgba(255,255,255,0.12)"
                        />

                        <rect
                          x={
                            target.x -
                            34
                          }
                          y={
                            target.y -
                            target.radius -
                            20
                          }
                          width={
                            68 *
                            (
                              target.hp /
                              target.maxHp
                            )
                          }
                          height="6"
                          rx="3"
                          fill="rgb(239 68 68)"
                        />
                      </g>
                    )}

                    {dragging && (
                      <>
                        <line
                          x1={ORIGIN.x}
                          y1={ORIGIN.y}
                          x2={aim.x}
                          y2={aim.y}
                          stroke="rgba(248,113,113,0.55)"
                          strokeWidth="3"
                          strokeDasharray="6 6"
                        />

                        {preview.map(
                          (
                            point,
                            index
                          ) => (
                            <circle
                              key={index}
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="rgba(248,113,113,0.72)"
                            />
                          )
                        )}
                      </>
                    )}

                    <circle
                      cx={ORIGIN.x}
                      cy={ORIGIN.y}
                      r="31"
                      fill="rgba(239,68,68,0.05)"
                      stroke="rgba(248,113,113,0.2)"
                    />

                    {!projectile && (
                      <g
                        transform={
                          `translate(${
                            dragging
                              ? aim.x
                              : ORIGIN.x
                          } ${
                            dragging
                              ? aim.y
                              : ORIGIN.y
                          })`
                        }
                        onPointerDown={
                          pointerDown
                        }
                        onPointerMove={
                          pointerMove
                        }
                        onPointerUp={
                          pointerUp
                        }
                        onPointerCancel={
                          pointerCancel
                        }
                        style={{
                          cursor:
                            dragging
                              ? 'grabbing'
                              : 'grab',

                          touchAction:
                            'none',
                        }}
                      >
                        <circle
                          r="31"
                          fill="transparent"
                        />

                        <circle
                          r="16"
                          fill="rgb(239 68 68)"
                          stroke="white"
                          strokeWidth="3"
                          filter="url(#ruptura-glow)"
                        />

                        <circle
                          r="6"
                          fill="white"
                          pointerEvents="none"
                        />
                      </g>
                    )}

                    {projectile && (
                      <g
                        transform={
                          `translate(${projectile.x} ${projectile.y})`
                        }
                      >
                        <circle
                          r="17"
                          fill="rgba(239,68,68,0.15)"
                        />

                        <circle
                          r={
                            PROJECTILE_RADIUS
                          }
                          fill="rgb(239 68 68)"
                          stroke="white"
                          strokeWidth="2"
                          filter="url(#ruptura-glow)"
                        />
                      </g>
                    )}
                  </svg>
                </div>

                <div
                  className="
                    shrink-0
                    space-y-2
                  "
                >
                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.035]
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        justify-between
                        text-[10px]
                        font-black
                        text-white/35
                      "
                    >
                      <span>
                        POTÊNCIA
                      </span>

                      <span>
                        {dragging
                          ? power
                          : 0}
                        %
                      </span>
                    </div>

                    <div
                      className="
                        mt-2
                        h-2
                        overflow-hidden
                        rounded-full
                        bg-white/10
                      "
                    >
                      <div
                        className="
                          h-full
                          bg-red-500
                        "
                        style={{
                          width:
                            `${
                              dragging
                                ? power
                                : 0
                            }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      min-h-6
                      items-center
                      justify-center
                      px-2
                      text-center
                    "
                  >
                    <AnimatePresence
                      mode="wait"
                    >
                      {feedback && (
                        <motion.p
                          key={
                            feedback
                          }
                          initial={{
                            opacity: 0,
                          }}
                          animate={{
                            opacity: 1,
                          }}
                          exit={{
                            opacity: 0,
                          }}
                          className="
                            text-xs
                            font-black
                            text-red-300
                          "
                        >
                          {feedback}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <p
                    className="
                      px-3
                      text-center
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-white/30
                    "
                  >
                    Puxe para baixo,
                    antecipe o alvo e solte
                  </p>
                </div>
              </motion.div>
            )}

            {phase ===
              'complete' && (
              <motion.div
                key="complete"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  flex
                  h-full
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-24
                    w-24
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                  "
                >
                  <Trophy
                    size={44}
                  />
                </div>

                <h2
                  className="
                    mt-6
                    text-3xl
                    font-black
                  "
                >
                  Ruptura Dominada
                </h2>

                <p
                  className="
                    mt-3
                    text-white/45
                  "
                >
                  {currentStacks}
                  /
                  {targetStacks}
                  {' '}
                  Stacks
                </p>

                <button
                  type="button"
                  onClick={
                    startGame
                  }
                  className="
                    mt-8
                    flex
                    min-h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-red-500
                    font-black
                  "
                >
                  <RotateCcw
                    size={18}
                  />

                  Treinar Novamente
                </button>

                <button
                  type="button"
                  onClick={
                    exitTraining
                  }
                  className="
                    mt-3
                    min-h-14
                    w-full
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/5
                    font-black
                  "
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
