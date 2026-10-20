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

interface PointCoord {
  x: number
  y: number
}

interface ManaNode extends PointCoord {
  id: number
  locked: boolean
}

interface ShapeDefinition {
  id: string
  name: string
  points: PointCoord[]

  guideEdges: Array<[number, number]>

  connectionEdges: Array<[number, number]>
}

const BOARD_WIDTH = 360
const BOARD_HEIGHT = 390

const NODE_RADIUS = 17
const SNAP_DISTANCE = 36

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.max(
  min,
  Math.min(max, value)
)

const createLoopEdges = (
  count: number
): Array<[number, number]> =>
  Array.from(
    { length: count },
    (_, index) => [
      index,
      (index + 1) % count,
    ]
  )

const createCompleteEdges = (
  count: number
): Array<[number, number]> => {
  const edges:
    Array<[number, number]> = []

  for (
    let first = 0;
    first < count;
    first += 1
  ) {
    for (
      let second = first + 1;
      second < count;
      second += 1
    ) {
      edges.push([
        first,
        second,
      ])
    }
  }

  return edges
}

const SHAPES: ShapeDefinition[] = [
  {
    id: 'triangle',
    name: 'Triângulo Arcano',
    points: [
      { x: 180, y: 75 },
      { x: 275, y: 245 },
      { x: 85, y: 245 },
    ],
    guideEdges: createLoopEdges(3),

    // Todas as ligações do triângulo.
    // 1-2 e 1-3 formam as laterais.
    // 2-3 fecha explicitamente a base.
    connectionEdges: [
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },

  {
    id: 'square',
    name: 'Selo Quadrangular',
    points: [
      { x: 105, y: 85 },
      { x: 255, y: 85 },
      { x: 255, y: 245 },
      { x: 105, y: 245 },
    ],
    guideEdges: createLoopEdges(4),

    // Quatro lados.
    // As duas últimas ligações
    // formam o X interno.
    connectionEdges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 2],
      [1, 3],
    ],
  },

  {
    id: 'pentagon',
    name: 'Núcleo Pentagonal',
    points: [
      { x: 180, y: 62 },
      { x: 282, y: 138 },
      { x: 242, y: 258 },
      { x: 118, y: 258 },
      { x: 78, y: 138 },
    ],
    guideEdges: createLoopEdges(5),
    connectionEdges: createCompleteEdges(5),
  },

  {
    id: 'shield',
    name: 'Escudo de Mana',
    points: [
      { x: 180, y: 55 },
      { x: 275, y: 92 },
      { x: 268, y: 178 },
      { x: 238, y: 248 },
      { x: 180, y: 298 },
      { x: 122, y: 248 },
      { x: 92, y: 178 },
      { x: 85, y: 92 },
    ],
    guideEdges: createLoopEdges(8),
    connectionEdges: createCompleteEdges(8),
  },

  {
    id: 'star',
    name: 'Estrela Arcana',
    points: [
      { x: 180, y: 48 },
      { x: 207, y: 121 },
      { x: 290, y: 128 },
      { x: 226, y: 181 },
      { x: 252, y: 270 },
      { x: 180, y: 219 },
      { x: 108, y: 270 },
      { x: 134, y: 181 },
      { x: 70, y: 128 },
      { x: 153, y: 121 },
    ],
    guideEdges: createLoopEdges(10),
    connectionEdges: createCompleteEdges(10),
  },
]

const SPAWN_SLOTS: PointCoord[] = [
  { x: 38, y: 48 },
  { x: 322, y: 48 },
  { x: 36, y: 125 },
  { x: 324, y: 125 },
  { x: 36, y: 215 },
  { x: 324, y: 215 },
  { x: 58, y: 340 },
  { x: 120, y: 354 },
  { x: 240, y: 354 },
  { x: 302, y: 340 },
]

const createNodes = (
  shape: ShapeDefinition,
  generation: number
): ManaNode[] => {
  const offset =
    (
      generation * 3 +
      2
    ) %
    SPAWN_SLOTS.length

  return shape.points.map(
    (_, id) => {
      const slotIndex =
        (
          id * 3 +
          offset
        ) %
        SPAWN_SLOTS.length

      const slot =
        SPAWN_SLOTS[slotIndex]

      return {
        id,
        x: slot.x,
        y: slot.y,
        locked: false,
      }
    }
  )
}

export function MoldagemTraining() {
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

  const [shapeIndex, setShapeIndex] =
    useState(0)

  const [shapeRound, setShapeRound] =
    useState(1)

  const [nodes, setNodes] =
    useState<ManaNode[]>([])

  const [shapeSolved, setShapeSolved] =
    useState(false)

  const [feedback, setFeedback] =
    useState<string | null>(null)

  const [
    averagePrecision,
    setAveragePrecision,
  ] = useState<number | null>(null)

  const phaseRef =
    useRef<GamePhase>('ready')

  const svgRef =
    useRef<SVGSVGElement | null>(null)

  const nodesRef =
    useRef<ManaNode[]>([])

  const activeNodeRef =
    useRef<number | null>(null)

  const stacksRef =
    useRef(currentStacks)

  const precisionRef =
    useRef<number[]>([])

  const generationRef =
    useRef(0)

  const transitionTimerRef =
    useRef<number | null>(null)

  const feedbackTimerRef =
    useRef<number | null>(null)

  const shape =
    SHAPES[shapeIndex]

  const placedCount =
    nodes.filter(
      (node) => node.locked
    ).length

  const progress =
    targetStacks > 0
      ? (
          currentStacks /
          targetStacks
        ) * 100
      : 0

  const clearTimers =
    useCallback(() => {
      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current
        )

        transitionTimerRef.current =
          null
      }

      if (
        feedbackTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          feedbackTimerRef.current
        )

        feedbackTimerRef.current =
          null
      }
    }, [])

  const prepareShape =
    useCallback(
      (
        index: number,
        resetGeneration = false
      ) => {
        if (resetGeneration) {
          generationRef.current = 0
        } else {
          generationRef.current += 1
        }

        const nextNodes =
          createNodes(
            SHAPES[index],
            generationRef.current
          )

        nodesRef.current =
          nextNodes

        precisionRef.current = []

        activeNodeRef.current = null

        setNodes(nextNodes)
        setShapeSolved(false)
        setAveragePrecision(null)
        setFeedback(null)
      },
      []
    )

  const startGame = () => {
    clearTimers()
    resetProgress()

    stacksRef.current = 0

    setShapeIndex(0)
    setShapeRound(1)

    prepareShape(
      0,
      true
    )

    setCountdown(3)

    phaseRef.current =
      'countdown'

    setPhase('countdown')
  }

  const exitTraining = () => {
    clearTimers()

    activeNodeRef.current =
      null

    phaseRef.current =
      'ready'

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
      phase !== 'countdown'
    ) {
      return
    }

    if (
      countdown <= 0
    ) {
      const timer =
        window.setTimeout(() => {
          phaseRef.current =
            'playing'

          setPhase('playing')
        }, 400)

      return () => {
        window.clearTimeout(timer)
      }
    }

    const timer =
      window.setTimeout(() => {
        setCountdown(
          (value) =>
            value - 1
        )
      }, 700)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    phase,
    countdown,
  ])

  useEffect(
    () => () => {
      clearTimers()
    },
    [
      clearTimers,
    ]
  )

  const getBoardPoint =
    useCallback(
      (
        event:
          ReactPointerEvent<SVGGElement>
      ): PointCoord => {
        const svg =
          svgRef.current

        if (!svg) {
          return {
            x: 0,
            y: 0,
          }
        }

        const rect =
          svg.getBoundingClientRect()

        const x =
          (
            event.clientX -
            rect.left
          ) /
          rect.width *
          BOARD_WIDTH

        const y =
          (
            event.clientY -
            rect.top
          ) /
          rect.height *
          BOARD_HEIGHT

        return {
          x: clamp(
            x,
            NODE_RADIUS,
            BOARD_WIDTH -
              NODE_RADIUS
          ),

          y: clamp(
            y,
            NODE_RADIUS,
            BOARD_HEIGHT -
              NODE_RADIUS
          ),
        }
      },
      []
    )

  const showTemporaryFeedback =
    useCallback(
      (
        message: string,
        duration = 700
      ) => {
        if (
          feedbackTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            feedbackTimerRef.current
          )
        }

        setFeedback(message)

        feedbackTimerRef.current =
          window.setTimeout(() => {
            setFeedback(null)

            feedbackTimerRef.current =
              null
          }, duration)
      },
      []
    )

  const advanceShape =
    useCallback(() => {
      const nextIndex =
        (
          shapeIndex + 1
        ) %
        SHAPES.length

      if (
        nextIndex === 0
      ) {
        setShapeRound(
          (value) =>
            value + 1
        )
      }

      setShapeIndex(
        nextIndex
      )

      prepareShape(
        nextIndex
      )
    }, [
      shapeIndex,
      prepareShape,
    ])

  const handlePointerDown = (
    event:
      ReactPointerEvent<SVGGElement>,
    node: ManaNode
  ) => {
    if (
      phaseRef.current !==
        'playing' ||
      node.locked ||
      shapeSolved
    ) {
      return
    }

    event.preventDefault()

    activeNodeRef.current =
      node.id

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      )
  }

  const handlePointerMove = (
    event:
      ReactPointerEvent<SVGGElement>,
    nodeId: number
  ) => {
    if (
      activeNodeRef.current !==
      nodeId
    ) {
      return
    }

    event.preventDefault()

    const point =
      getBoardPoint(event)

    const nextNodes =
      nodesRef.current.map(
        (node) =>
          node.id === nodeId &&
          !node.locked
            ? {
                ...node,
                x: point.x,
                y: point.y,
              }
            : node
      )

    nodesRef.current =
      nextNodes

    setNodes(nextNodes)
  }

  const handlePointerCancel = (
    event:
      ReactPointerEvent<SVGGElement>
  ) => {
    activeNodeRef.current =
      null

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
  }

  const handlePointerUp = (
    event:
      ReactPointerEvent<SVGGElement>,
    nodeId: number
  ) => {
    if (
      activeNodeRef.current !==
      nodeId
    ) {
      return
    }

    event.preventDefault()

    activeNodeRef.current =
      null

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

    const releasePoint =
      getBoardPoint(event)

    const target =
      shape.points[nodeId]

    const distance =
      Math.hypot(
        releasePoint.x -
          target.x,

        releasePoint.y -
          target.y
      )

    if (
      distance >
      SNAP_DISTANCE
    ) {
      const movedNodes =
        nodesRef.current.map(
          (node) =>
            node.id === nodeId &&
            !node.locked
              ? {
                  ...node,
                  x: releasePoint.x,
                  y: releasePoint.y,
                }
              : node
        )

      nodesRef.current =
        movedNodes

      setNodes(
        movedNodes
      )

      showTemporaryFeedback(
        `Aproxime o Nó ${nodeId + 1} do alvo correspondente.`
      )

      return
    }

    const accuracy =
      Math.round(
        clamp(
          100 -
            (
              distance /
              SNAP_DISTANCE
            ) *
              40,
          60,
          100
        )
      )

    const nextNodes =
      nodesRef.current.map(
        (node) =>
          node.id === nodeId
            ? {
                ...node,
                x: target.x,
                y: target.y,
                locked: true,
              }
            : node
      )

    nodesRef.current =
      nextNodes

    setNodes(nextNodes)

    precisionRef.current = [
      ...precisionRef.current,
      accuracy,
    ]

    const precisionTotal =
      precisionRef.current.reduce(
        (
          total,
          value
        ) =>
          total + value,
        0
      )

    setAveragePrecision(
      Math.round(
        precisionTotal /
          precisionRef.current.length
      )
    )

    const nextStacks =
      Math.min(
        targetStacks,
        stacksRef.current + 1
      )

    stacksRef.current =
      nextStacks

    addStack(1)

    const allLocked =
      nextNodes.every(
        (node) =>
          node.locked
      )

    if (
      targetStacks > 0 &&
      nextStacks >=
        targetStacks
    ) {
      setShapeSolved(true)

      setFeedback(
        'MOLDAGEM DOMINADA'
      )

      transitionTimerRef.current =
        window.setTimeout(
          () => {
            phaseRef.current =
              'complete'

            setPhase(
              'complete'
            )
          },
          650
        )

      return
    }

    if (
      allLocked
    ) {
      setShapeSolved(true)

      setFeedback(
        'ESTRUTURA ESTABILIZADA'
      )

      /*
       * Mantém a construção final
       * completamente visível para
       * que o jogador veja todas
       * as conexões antes de avançar.
       */
      transitionTimerRef.current =
        window.setTimeout(
          () => {
            advanceShape()
          },
          1500
        )

      return
    }

    showTemporaryFeedback(
      `Nó ${nodeId + 1} estabilizado · +1 Stack`
    )
  }

  return (
    <main
      className="
        min-h-[100dvh]
        overflow-hidden
        overscroll-none
        bg-[#070710]
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
          "
        >
          <div
            className="
              flex
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
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/5
                active:scale-95
              "
              aria-label="Voltar"
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
                <Sparkles
                  size={18}
                  className="
                    text-fuchsia-300
                  "
                />

                <h1
                  className="
                    text-lg
                    font-black
                  "
                >
                  Moldagem
                </h1>
              </div>

              <p
                className="
                  text-[11px]
                  text-white/35
                "
              >
                Construção de Mana
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
                bg-fuchsia-400
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
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
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
                    border-fuchsia-300/20
                    bg-fuchsia-300/[0.08]
                    text-fuchsia-200
                    shadow-[0_0_45px_rgba(217,70,239,.12)]
                  "
                >
                  <Sparkles
                    size={42}
                  />
                </div>

                <p
                  className="
                    mt-6
                    text-xs
                    font-black
                    uppercase
                    tracking-[0.3em]
                    text-fuchsia-300/60
                  "
                >
                  Construção de Mana
                </p>

                <h2
                  className="
                    mt-2
                    text-3xl
                    font-black
                  "
                >
                  Molde a estrutura
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
                  Arraste cada Nó de Mana
                  até o alvo de mesmo
                  número. Cada novo nó se conecta
                  aos nós já estabilizados.
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
                        text-[10px]
                        font-black
                        uppercase
                        tracking-widest
                        text-white/30
                      "
                    >
                      Cada nó
                    </p>

                    <p
                      className="
                        mt-1
                        text-lg
                        font-black
                        text-fuchsia-200
                      "
                    >
                      +1 Stack
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
                        text-[10px]
                        font-black
                        uppercase
                        tracking-widest
                        text-white/30
                      "
                    >
                      Erro
                    </p>

                    <p
                      className="
                        mt-1
                        text-lg
                        font-black
                      "
                    >
                      Reposicione
                    </p>
                  </div>
                </div>

                <p
                  className="
                    mt-4
                    text-xs
                    font-bold
                    text-white/30
                  "
                >
                  5 estruturas · 30 nós
                  por ciclo
                </p>

                <button
                  type="button"
                  onClick={
                    startGame
                  }
                  className="
                    mt-6
                    min-h-14
                    w-full
                    rounded-2xl
                    bg-fuchsia-400
                    px-6
                    font-black
                    text-fuchsia-950
                    shadow-[0_12px_35px_rgba(217,70,239,.18)]
                    active:scale-[0.98]
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
                exit={{
                  opacity: 0,
                  scale: 1.35,
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
                {countdown > 0
                  ? (
                    <>
                      <p
                        className="
                          text-xs
                          font-black
                          uppercase
                          tracking-[0.3em]
                          text-fuchsia-200/50
                        "
                      >
                        Materializando
                      </p>

                      <p
                        className="
                          mt-4
                          text-8xl
                          font-black
                        "
                      >
                        {countdown}
                      </p>
                    </>
                  )
                  : (
                    <p
                      className="
                        text-5xl
                        font-black
                        text-fuchsia-300
                      "
                    >
                      MOLDE!
                    </p>
                  )}
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
                  flex
                  min-h-0
                  flex-1
                  flex-col
                "
              >
                <div
                  className="
                    mb-2
                    flex
                    items-end
                    justify-between
                    gap-3
                    px-1
                  "
                >
                  <div
                    className="
                      min-w-0
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
                      Molde
                      {' '}
                      {shapeIndex + 1}
                      /
                      {SHAPES.length}
                    </p>

                    <p
                      className="
                        truncate
                        text-sm
                        font-black
                        text-fuchsia-200
                      "
                    >
                      {shape.name}
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
                      Ciclo
                    </p>

                    <p
                      className="
                        text-sm
                        font-black
                      "
                    >
                      {shapeRound}
                    </p>
                  </div>
                </div>

                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    items-center
                    justify-center
                  "
                >
                  <div
                    className="
                      w-full
                      max-w-[420px]
                      overflow-hidden
                      rounded-[28px]
                      border
                      border-white/10
                      bg-white/[0.025]
                      p-1
                    "
                  >
                    <svg
                      ref={svgRef}
                      viewBox={
                        `0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`
                      }
                      className="
                        aspect-[12/13]
                        w-full
                        select-none
                        touch-none
                      "
                      aria-label={
                        `Molde ${shape.name}`
                      }
                    >
                      <defs>
                        <filter
                          id="moldagem-glow"
                          filterUnits="userSpaceOnUse"
                          x="-20"
                          y="-20"
                          width={
                            BOARD_WIDTH + 40
                          }
                          height={
                            BOARD_HEIGHT + 40
                          }
                        >
                          <feGaussianBlur
                            stdDeviation="3"
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

                      <rect
                        x="4"
                        y="4"
                        width={
                          BOARD_WIDTH -
                          8
                        }
                        height={
                          BOARD_HEIGHT -
                          8
                        }
                        rx="24"
                        fill="rgba(255,255,255,0.012)"
                        stroke="rgba(255,255,255,0.045)"
                      />

                      {shape.guideEdges.map(
                        (
                          [
                            first,
                            second,
                          ],
                          index
                        ) => {
                          const a =
                            shape.points[
                              first
                            ]

                          const b =
                            shape.points[
                              second
                            ]

                          return (
                            <line
                              key={
                                `ghost-${index}`
                              }
                              x1={a.x}
                              y1={a.y}
                              x2={b.x}
                              y2={b.y}
                              stroke="rgba(255,255,255,0.11)"
                              strokeWidth="2"
                              strokeDasharray="6 8"
                            />
                          )
                        }
                      )}

                      {/* Bordas construídas do molde. */}
                      {shape.guideEdges.map(
                        (
                          [
                            first,
                            second,
                          ]
                        ) => {
                          const firstNode =
                            nodes.find(
                              (node) =>
                                node.id ===
                                first
                            )

                          const secondNode =
                            nodes.find(
                              (node) =>
                                node.id ===
                                second
                            )

                          if (
                            !firstNode?.locked ||
                            !secondNode?.locked
                          ) {
                            return null
                          }

                          return (
                            <motion.line
                              key={
                                `border-${first}-${second}`
                              }
                              initial={{
                                opacity: 0,
                              }}
                              animate={{
                                opacity: 1,
                              }}
                              transition={{
                                duration: 0.22,
                                ease: 'easeOut',
                              }}
                              x1={
                                firstNode.x
                              }
                              y1={
                                firstNode.y
                              }
                              x2={
                                secondNode.x
                              }
                              y2={
                                secondNode.y
                              }
                              stroke="rgb(232 121 249)"
                              strokeWidth="5"
                              strokeLinecap="round"
                              filter="url(#moldagem-glow)"
                            />
                          )
                        }
                      )}

                      {/* Conexões internas, sem guia tracejado. */}
                      {shape.connectionEdges.map(
                        (
                          [
                            first,
                            second,
                          ]
                        ) => {
                          const isGuideEdge =
                            shape.guideEdges.some(
                              ([
                                guideFirst,
                                guideSecond,
                              ]) =>
                                (
                                  guideFirst ===
                                    first &&
                                  guideSecond ===
                                    second
                                ) ||
                                (
                                  guideFirst ===
                                    second &&
                                  guideSecond ===
                                    first
                                )
                            )

                          if (isGuideEdge) {
                            return null
                          }

                          const firstNode =
                            nodes.find(
                              (node) =>
                                node.id ===
                                first
                            )

                          const secondNode =
                            nodes.find(
                              (node) =>
                                node.id ===
                                second
                            )

                          if (
                            !firstNode?.locked ||
                            !secondNode?.locked
                          ) {
                            return null
                          }

                          const internalOpacity =
                            shape.id ===
                              'square'
                              ? 0.75
                              : 0.42

                          const internalWidth =
                            shape.id ===
                              'square'
                              ? 3.25
                              : 2.25

                          return (
                            <motion.line
                              key={
                                `internal-${first}-${second}`
                              }
                              initial={{
                                opacity: 0,
                              }}
                              animate={{
                                opacity:
                                  internalOpacity,
                              }}
                              transition={{
                                duration: 0.22,
                                ease: 'easeOut',
                              }}
                              x1={
                                firstNode.x
                              }
                              y1={
                                firstNode.y
                              }
                              x2={
                                secondNode.x
                              }
                              y2={
                                secondNode.y
                              }
                              stroke="rgb(232 121 249)"
                              strokeWidth={
                                internalWidth
                              }
                              strokeLinecap="round"
                              filter="url(#moldagem-glow)"
                            />
                          )
                        }
                      )}

                      {shape.points.map(
                        (
                          point,
                          index
                        ) => {
                          const locked =
                            nodes[
                              index
                            ]?.locked

                          return (
                            <g
                              key={
                                `target-${index}`
                              }
                              opacity={
                                locked
                                  ? 0.18
                                  : 1
                              }
                            >
                              <circle
                                cx={
                                  point.x
                                }
                                cy={
                                  point.y
                                }
                                r="22"
                                fill="rgba(217,70,239,0.055)"
                                stroke="rgba(232,121,249,0.42)"
                                strokeWidth="2"
                                strokeDasharray="5 5"
                              />

                              <text
                                x={
                                  point.x
                                }
                                y={
                                  point.y +
                                  4
                                }
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="900"
                                fill="rgba(255,255,255,0.48)"
                                pointerEvents="none"
                              >
                                {index + 1}
                              </text>
                            </g>
                          )
                        }
                      )}

                      {nodes.map(
                        (node) => (
                          <g
                            key={
                              node.id
                            }
                            transform={
                              `translate(${node.x} ${node.y})`
                            }
                            onPointerDown={(
                              event
                            ) =>
                              handlePointerDown(
                                event,
                                node
                              )
                            }
                            onPointerMove={(
                              event
                            ) =>
                              handlePointerMove(
                                event,
                                node.id
                              )
                            }
                            onPointerUp={(
                              event
                            ) =>
                              handlePointerUp(
                                event,
                                node.id
                              )
                            }
                            onPointerCancel={
                              handlePointerCancel
                            }
                            style={{
                              cursor:
                                node.locked
                                  ? 'default'
                                  : 'grab',

                              touchAction:
                                'none',
                            }}
                          >
                            <circle
                              r={
                                NODE_RADIUS
                              }
                              fill={
                                node.locked
                                  ? 'rgb(232 121 249)'
                                  : 'rgb(39 39 50)'
                              }
                              stroke={
                                node.locked
                                  ? 'rgba(255,255,255,0.9)'
                                  : 'rgba(232,121,249,0.75)'
                              }
                              strokeWidth="3"
                              filter={
                                node.locked
                                  ? 'url(#moldagem-glow)'
                                  : undefined
                              }
                            />

                            <circle
                              r="6"
                              fill={
                                node.locked
                                  ? 'rgba(255,255,255,0.9)'
                                  : 'rgba(232,121,249,0.55)'
                              }
                              pointerEvents="none"
                            />

                            <text
                              x="0"
                              y="-25"
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="900"
                              fill="rgba(255,255,255,0.8)"
                              pointerEvents="none"
                            >
                              {node.id + 1}
                            </text>
                          </g>
                        )
                      )}
                    </svg>
                  </div>
                </div>

                <div
                  className="
                    shrink-0
                    pt-2
                  "
                >
                  <div
                    className="
                      grid
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
                        px-4
                        py-3
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
                        Nós
                      </p>

                      <p
                        className="
                          mt-1
                          font-black
                        "
                      >
                        {placedCount}
                        /
                        {nodes.length}
                      </p>
                    </div>

                    <div
                      className="
                        rounded-2xl
                        border
                        border-white/10
                        bg-white/[0.035]
                        px-4
                        py-3
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
                        Precisão
                      </p>

                      <p
                        className="
                          mt-1
                          font-black
                          text-fuchsia-200
                        "
                      >
                        {
                          averagePrecision ===
                          null
                            ? '—'
                            : `${averagePrecision}%`
                        }
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      h-10
                      items-center
                      justify-center
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
                            y: 5,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -4,
                          }}
                          className="
                            text-xs
                            font-black
                            text-fuchsia-200
                          "
                        >
                          {feedback}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <p
                    className="
                      text-center
                      text-[11px]
                      font-bold
                      text-white/30
                    "
                  >
                    Arraste um nó até o
                    alvo de mesmo número.
                    Cada encaixe amplia a
                    rede de mana.
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
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
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
                    bg-fuchsia-400
                    text-fuchsia-950
                    shadow-[0_0_45px_rgba(217,70,239,.22)]
                  "
                >
                  <Trophy
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
                    text-fuchsia-300
                  "
                >
                  Moldagem dominada
                </p>

                <h2
                  className="
                    mt-2
                    text-3xl
                    font-black
                  "
                >
                  Estrutura concluída
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
                  Você estabilizou os
                  nós e construiu as
                  formas mágicas.
                </p>

                <div
                  className="
                    mt-6
                    rounded-2xl
                    border
                    border-fuchsia-300/15
                    bg-fuchsia-300/[0.06]
                    px-10
                    py-4
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
                      mt-1
                      text-3xl
                      font-black
                      text-fuchsia-200
                    "
                  >
                    {currentStacks}
                    /
                    {targetStacks}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    startGame
                  }
                  className="
                    mt-7
                    flex
                    min-h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-fuchsia-400
                    font-black
                    text-fuchsia-950
                    active:scale-[0.98]
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
                    active:scale-[0.98]
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
