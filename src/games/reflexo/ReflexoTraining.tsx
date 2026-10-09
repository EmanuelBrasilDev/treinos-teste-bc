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
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy,
  Wind,
} from 'lucide-react'

import { useTrainingStore } from '../../features/training/store/useTrainingStore'

type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'
  | 'failed'

type MoveDirection =
  | 'left'
  | 'right'
  | null

interface Projectile {
  id: number
  x: number
  y: number
  radius: number
  speed: number
}

interface Difficulty {
  projectileSpeed: number
  spawnInterval: number
  playerSpeed: number
  label: string
}

const PLAYER_WIDTH = 54
const PLAYER_HEIGHT = 72

const PLAYER_HITBOX_WIDTH = 34
const PLAYER_HITBOX_HEIGHT = 52

const PROJECTILE_RADIUS = 13

const INVULNERABILITY_TIME = 650

const MAX_HEARTS = 3
function getDifficulty(
  stacks: number
): Difficulty {
  // A velocidade permanece alta do início ao fim.
  // O parâmetro continua aqui para manter a estrutura
  // preparada para ajustes futuros.
  void stacks

  return {
    projectileSpeed: 450,
    spawnInterval: 240,
    playerSpeed: 330,
    label: 'Relâmpago',
  }
}

function circleRectCollision(
  circleX: number,
  circleY: number,
  radius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
) {
  const closestX = Math.max(
    rectX,
    Math.min(
      circleX,
      rectX + rectWidth
    )
  )

  const closestY = Math.max(
    rectY,
    Math.min(
      circleY,
      rectY + rectHeight
    )
  )

  const dx =
    circleX - closestX

  const dy =
    circleY - closestY

  return (
    dx * dx + dy * dy <=
    radius * radius
  )
}

export function ReflexoTraining() {
  const [hearts, setHearts] =
    useState(MAX_HEARTS)

  const heartsRef =
    useRef(MAX_HEARTS)

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

  const [projectiles, setProjectiles] =
    useState<Projectile[]>([])

  const [playerX, setPlayerX] =
    useState(0)

  const [combo, setCombo] =
    useState(0)

  const [bestCombo, setBestCombo] =
    useState(0)

  const [hits, setHits] =
    useState(0)

  const [isHit, setIsHit] =
    useState(false)

  const [moveDirection, setMoveDirection] =
    useState<MoveDirection>(null)

  const [arenaReady, setArenaReady] =
    useState(false)

  const arenaRef =
    useRef<HTMLDivElement | null>(null)

  const playerXRef =
    useRef(0)

  const projectilesRef =
    useRef<Projectile[]>([])

  const currentStacksRef =
    useRef(0)

  const phaseRef =
    useRef<GamePhase>('ready')

  const leftPressedRef =
    useRef(false)

  const rightPressedRef =
    useRef(false)

  const lastFrameRef =
    useRef<number | null>(null)

  const lastSpawnRef =
    useRef(0)

  const projectileIdRef =
    useRef(0)

  const invulnerableUntilRef =
    useRef(0)

  const animationFrameRef =
    useRef<number | null>(null)

  const progress =
    targetStacks > 0
      ? (
          currentStacks /
          targetStacks
        ) * 100
      : 0

  const difficulty =
    getDifficulty(
      currentStacks
    )

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    currentStacksRef.current =
      currentStacks
  }, [currentStacks])

  useEffect(() => {
    playerXRef.current =
      playerX
  }, [playerX])

  useEffect(() => {
    projectilesRef.current =
      projectiles
  }, [projectiles])

  /*
  =========================================================
  CONTROLES
  =========================================================
  */

  const updateMoveDirection =
    useCallback(() => {
      if (
        leftPressedRef.current &&
        !rightPressedRef.current
      ) {
        setMoveDirection('left')
        return
      }

      if (
        rightPressedRef.current &&
        !leftPressedRef.current
      ) {
        setMoveDirection('right')
        return
      }

      setMoveDirection(null)
    }, [])

  const pressLeft =
    useCallback(() => {
      leftPressedRef.current = true
      updateMoveDirection()
    }, [updateMoveDirection])

  const releaseLeft =
    useCallback(() => {
      leftPressedRef.current = false
      updateMoveDirection()
    }, [updateMoveDirection])

  const pressRight =
    useCallback(() => {
      rightPressedRef.current = true
      updateMoveDirection()
    }, [updateMoveDirection])

  const releaseRight =
    useCallback(() => {
      rightPressedRef.current = false
      updateMoveDirection()
    }, [updateMoveDirection])

  const stopMovement =
    useCallback(() => {
      leftPressedRef.current = false
      rightPressedRef.current = false

      setMoveDirection(null)
    }, [])

  /*
  =========================================================
  TECLADO DESKTOP
  =========================================================
  */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.code === 'KeyA'
      ) {
        event.preventDefault()

        if (
          !leftPressedRef.current
        ) {
          pressLeft()
        }
      }

      if (
        event.code === 'KeyD'
      ) {
        event.preventDefault()

        if (
          !rightPressedRef.current
        ) {
          pressRight()
        }
      }
    }

    const handleKeyUp = (
      event: KeyboardEvent
    ) => {
      if (
        event.code === 'KeyA'
      ) {
        event.preventDefault()
        releaseLeft()
      }

      if (
        event.code === 'KeyD'
      ) {
        event.preventDefault()
        releaseRight()
      }
    }

    const handleBlur = () => {
      stopMovement()
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    window.addEventListener(
      'keyup',
      handleKeyUp
    )

    window.addEventListener(
      'blur',
      handleBlur
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )

      window.removeEventListener(
        'keyup',
        handleKeyUp
      )

      window.removeEventListener(
        'blur',
        handleBlur
      )
    }
  }, [
    pressLeft,
    pressRight,
    releaseLeft,
    releaseRight,
    stopMovement,
  ])

  /*
  =========================================================
  INICIAR
  =========================================================
  */

  const startGame =
    useCallback(() => {
      resetProgress()

      // RESET HEARTS REFLEXO
      heartsRef.current =
        MAX_HEARTS

      setHearts(
        MAX_HEARTS
      )

      stopMovement()

      setProjectiles([])
      projectilesRef.current = []

      setCombo(0)
      setBestCombo(0)
      setHits(0)

      setIsHit(false)

      invulnerableUntilRef.current = 0

      lastFrameRef.current = null
      lastSpawnRef.current = 0

      setCountdown(3)
      setPhase('countdown')
    }, [
      resetProgress,
      stopMovement,
    ])

  /*
  =========================================================
  COUNTDOWN
  =========================================================
  */

  useEffect(() => {
    if (
      phase !== 'countdown'
    ) {
      return
    }

    if (countdown <= 0) {
      const timer =
        window.setTimeout(
          () => {
            const arena =
              arenaRef.current

            if (arena) {
              const width =
                arena.clientWidth

              const startX =
                width / 2

              playerXRef.current =
                startX

              setPlayerX(
                startX
              )
            }

            lastFrameRef.current =
              null

            lastSpawnRef.current =
              performance.now()

            setPhase('playing')
          },
          300
        )

      return () => {
        window.clearTimeout(
          timer
        )
      }
    }

    const timer =
      window.setTimeout(
        () => {
          setCountdown(
            (value) =>
              value - 1
          )
        },
        650
      )

    return () => {
      window.clearTimeout(
        timer
      )
    }
  }, [
    phase,
    countdown,
  ])

  /*
  =========================================================
  ARENA
  =========================================================
  */

  useEffect(() => {
    const arena =
      arenaRef.current

    if (!arena) {
      return
    }

    const setup = () => {
      const width =
        arena.clientWidth

      if (
        playerXRef.current === 0
      ) {
        const startX =
          width / 2

        playerXRef.current =
          startX

        setPlayerX(
          startX
        )
      }

      setArenaReady(true)
    }

    setup()

    const observer =
      new ResizeObserver(
        () => {
          const width =
            arena.clientWidth

          const half =
            PLAYER_WIDTH / 2

          const next =
            Math.max(
              half,
              Math.min(
                width - half,
                playerXRef.current
              )
            )

          playerXRef.current =
            next

          setPlayerX(next)
        }
      )

    observer.observe(arena)

    return () => {
      observer.disconnect()
    }
  }, [])

  /*
  =========================================================
  GAME LOOP
  =========================================================
  */

  useEffect(() => {
    if (
      phase !== 'playing'
    ) {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )
      }

      return
    }

    const frame = (
      time: number
    ) => {
      const arena =
        arenaRef.current

      if (
        !arena ||
        phaseRef.current !==
          'playing'
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
          ) / 1000,
          0.05
        )

      lastFrameRef.current =
        time

      const arenaWidth =
        arena.clientWidth

      const arenaHeight =
        arena.clientHeight

      const activeDifficulty =
        getDifficulty(
          currentStacksRef.current
        )

      /*
      -------------------------------------------------------
      MOVIMENTO DO PERSONAGEM

      Nenhum movimento automático.

      Soltou:
      permanece exatamente onde está.
      -------------------------------------------------------
      */

      let moveAxis = 0

      if (
        leftPressedRef.current &&
        !rightPressedRef.current
      ) {
        moveAxis = -1
      }

      if (
        rightPressedRef.current &&
        !leftPressedRef.current
      ) {
        moveAxis = 1
      }

      if (
        moveAxis !== 0
      ) {
        const half =
          PLAYER_WIDTH / 2

        const nextX =
          Math.max(
            half,
            Math.min(
              arenaWidth - half,
              playerXRef.current +
                (
                  moveAxis *
                  activeDifficulty.playerSpeed *
                  delta
                )
            )
          )

        playerXRef.current =
          nextX

        setPlayerX(
          nextX
        )
      }

      /*
      -------------------------------------------------------
      SPAWN CONTÍNUO
      -------------------------------------------------------
      */

      if (
        time -
          lastSpawnRef.current >=
        activeDifficulty.spawnInterval
      ) {
        lastSpawnRef.current =
          time

        projectileIdRef.current +=
          1

        const padding =
          PROJECTILE_RADIUS + 8

        const spawnX =
          padding +
          Math.random() *
            Math.max(
              1,
              arenaWidth -
                padding * 2
            )

        projectilesRef.current = [
          ...projectilesRef.current,
          {
            id:
              projectileIdRef.current,

            x: spawnX,

            y:
              -PROJECTILE_RADIUS,

            radius:
              PROJECTILE_RADIUS,

            speed:
              activeDifficulty.projectileSpeed *
              (
                0.9 +
                Math.random() *
                  0.2
              ),
          },
        ]
      }

      /*
      -------------------------------------------------------
      HITBOX DO PERSONAGEM
      -------------------------------------------------------
      */

      const playerBottom =
        arenaHeight - 18

      const playerTop =
        playerBottom -
        PLAYER_HEIGHT

      const hitboxX =
        playerXRef.current -
        PLAYER_HITBOX_WIDTH /
          2

      const hitboxY =
        playerTop +
        PLAYER_HEIGHT -
        PLAYER_HITBOX_HEIGHT

      let escaped = 0
      let gotHit = false

      const now =
        performance.now()

      const nextProjectiles:
        Projectile[] = []

      for (
        const projectile of
        projectilesRef.current
      ) {
        const nextProjectile = {
          ...projectile,

          y:
            projectile.y +
            projectile.speed *
              delta,
        }

        const collided =
          circleRectCollision(
            nextProjectile.x,
            nextProjectile.y,
            nextProjectile.radius,

            hitboxX,
            hitboxY,

            PLAYER_HITBOX_WIDTH,
            PLAYER_HITBOX_HEIGHT
          )

        /*
        Colisão durante invulnerabilidade:

        remove o projétil,
        mas não causa novo dano
        e também não concede Stack.
        */

        if (collided) {
          if (
            now >=
              invulnerableUntilRef.current &&
            !gotHit
          ) {
            gotHit = true

            invulnerableUntilRef.current =
              now +
              INVULNERABILITY_TIME
          }

          continue
        }

        /*
        Passou totalmente pela arena:

        esquiva válida.
        */

        if (
          nextProjectile.y -
            nextProjectile.radius >
          arenaHeight
        ) {
          escaped += 1
          continue
        }

        nextProjectiles.push(
          nextProjectile
        )
      }

      projectilesRef.current =
        nextProjectiles

      setProjectiles(
        nextProjectiles
      )

      /*
      -------------------------------------------------------
      STACKS POR ESQUIVA
      -------------------------------------------------------
      */

      if (
        escaped > 0
      ) {
        addStack(escaped)

        setCombo(
          (value) => {
            const next =
              value + escaped

            setBestCombo(
              (best) =>
                Math.max(
                  best,
                  next
                )
            )

            return next
          }
        )
      }

      /*
      -------------------------------------------------------
      HIT
      -------------------------------------------------------
      */

      if (gotHit) {
        /*
        Cada impacto remove 10 Stacks.

        O Store impede que o valor
        fique abaixo de zero.
        */

        addStack(-10)

        const nextHearts =
          Math.max(
            0,
            heartsRef.current - 1
          )

        heartsRef.current =
          nextHearts

        setHearts(
          nextHearts
        )

        if (
          nextHearts <= 0
        ) {
          phaseRef.current =
            'failed'

          projectilesRef.current =
            []

          setProjectiles([])

          setPhase(
            'failed'
          )

          return
        }

        setHits(
          (value) =>
            value + 1
        )

        setCombo(0)

        setIsHit(true)

        window.setTimeout(
          () => {
            setIsHit(false)
          },
          220
        )
      }

      animationFrameRef.current =
        requestAnimationFrame(
          frame
        )
    }

    animationFrameRef.current =
      requestAnimationFrame(
        frame
      )

    return () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )
      }

      lastFrameRef.current =
        null
    }
  }, [
    phase,
    addStack,
  ])

  /*
  =========================================================
  FINALIZAÇÃO
  =========================================================
  */

  useEffect(() => {
    if (
      phase === 'playing' &&
      targetStacks > 0 &&
      currentStacks >=
        targetStacks
    ) {
      stopMovement()

      setProjectiles([])
      projectilesRef.current = []

      setPhase('complete')
    }
  }, [
    currentStacks,
    targetStacks,
    phase,
    stopMovement,
  ])

  /*
  =========================================================
  SAIR
  =========================================================
  */

  const exitTraining =
    () => {
      stopMovement()

      setProjectiles([])
      projectilesRef.current = []

      returnToMenu()
    }

  return (
    <main
      className="
        min-h-[100dvh]
        overflow-hidden
        overscroll-none
        select-none
        bg-[#05080a]
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
          pb-[max(10px,env(safe-area-inset-bottom))]
          pt-[max(10px,env(safe-area-inset-top))]
          sm:max-w-lg
          lg:max-w-xl
          lg:px-4
        "
      >

        {/* =================================================
            HUD
        ================================================= */}

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
              onClick={exitTraining}

              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/10
                bg-white/5
                active:scale-95
              "
            >
              <ArrowLeft
                size={19}
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

                <Wind
                  size={18}
                  className="
                    text-cyan-300
                  "
                />

                <h1
                  className="
                    text-base
                    font-black
                  "
                >
                  Reflexo
                </h1>

              </div>

              <p
                className="
                  text-[11px]
                  text-white/35
                "
              >
                Esquiva Relâmpago
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
                  text-base
                  font-black
                "
              >
                {currentStacks}

                <span
                  className="
                    text-white/30
                  "
                >
                  /{targetStacks}
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
                bg-cyan-400
              "

              animate={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

        </header>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

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

            {/* =================================================
                READY
            ================================================= */}

            {phase === 'ready' && (
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
                  my-auto
                  flex
                  w-full
                  flex-col
                  items-center
                  text-center
                "
              >

                <div
                  className="
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-cyan-400/20
                    bg-cyan-400/10
                  "
                >

                  <Wind
                    size={40}
                    className="
                      text-cyan-300
                    "
                  />

                </div>

                <h2
                  className="
                    mt-5
                    text-3xl
                    font-black
                  "
                >
                  Esquiva Relâmpago
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
                  Movimente-se livremente
                  e evite os projéteis que
                  caem pela arena.
                </p>

                <div
                  className="
                    mt-6
                    grid
                    w-full
                    grid-cols-2
                    gap-3
                  "
                >

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-4
                    "
                  >

                    <ArrowLeft
                      className="
                        mx-auto
                        text-cyan-300
                      "
                    />

                    <p
                      className="
                        mt-2
                        text-xs
                        font-black
                      "
                    >
                      ESQUERDA
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        text-white/35
                      "
                    >
                      Segure o botão
                      <br />
                      ou A
                    </p>

                  </div>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-4
                    "
                  >

                    <ArrowRight
                      className="
                        mx-auto
                        text-cyan-300
                      "
                    />

                    <p
                      className="
                        mt-2
                        text-xs
                        font-black
                      "
                    >
                      DIREITA
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        text-white/35
                      "
                    >
                      Segure o botão
                      <br />
                      ou D
                    </p>

                  </div>

                </div>

                <p
                  className="
                    mt-5
                    text-xs
                    leading-5
                    text-white/30
                  "
                >
                  Soltou o controle?
                  <br />
                  O personagem fica
                  exatamente naquela posição.
                </p>

                <button
                  type="button"
                  onClick={startGame}

                  className="
                    mt-6
                    min-h-14
                    w-full
                    rounded-2xl
                    bg-cyan-400
                    px-6
                    font-black
                    text-black
                    active:scale-[0.98]
                  "
                >
                  Começar Treino
                </button>

              </motion.div>
            )}

            {/* =================================================
                COUNTDOWN
            ================================================= */}

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
                  scale: 1.3,
                }}

                className="
                  my-auto
                  text-center
                "
              >

                {countdown > 0 ? (
                  <>

                    <p
                      className="
                        text-xs
                        font-black
                        uppercase
                        tracking-[0.3em]
                        text-white/30
                      "
                    >
                      Prepare-se
                    </p>

                    <p
                      className="
                        mt-3
                        text-8xl
                        font-black
                      "
                    >
                      {countdown}
                    </p>

                  </>
                ) : (
                  <p
                    className="
                      text-5xl
                      font-black
                      text-cyan-300
                    "
                  >
                    VAI!
                  </p>
                )}

              </motion.div>
            )}

          </AnimatePresence>

          {/* =================================================
              ARENA
          ================================================= */}

          <div
            ref={arenaRef}

            className={`
              relative
              min-h-0
              flex-1
              overflow-hidden
              rounded-[26px]
              border
              border-white/10
              bg-gradient-to-b
              from-cyan-950/30
              via-[#081116]
              to-[#05080a]

              ${
                phase === 'playing'
                  ? 'block'
                  : 'hidden'
              }
            `}
          >

            {/* GRID FUNDO */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                opacity-20
              "
            >

              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  h-24
                  bg-gradient-to-t
                  from-cyan-500/10
                  to-transparent
                "
              />

              <div
                className="
                  absolute
                  left-1/4
                  top-0
                  h-full
                  w-px
                  bg-cyan-300/20
                "
              />

              <div
                className="
                  absolute
                  left-1/2
                  top-0
                  h-full
                  w-px
                  bg-cyan-300/15
                "
              />

              <div
                className="
                  absolute
                  left-3/4
                  top-0
                  h-full
                  w-px
                  bg-cyan-300/20
                "
              />

            </div>

            {/* STATUS */}

            <div
              className="
                absolute
                left-3
                right-3
                top-3
                z-30
                flex
                items-center
                justify-between
              "
            >

              <div
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-black/30
                  px-3
                  py-1.5
                  backdrop-blur
                "
              >

                <p
                  className="
                    text-[10px]
                    font-black
                    text-cyan-200
                  "
                >
                  {difficulty.label}
                </p>

              </div>

              <div
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-black/30
                  px-3
                  py-1.5
                  text-[10px]
                  font-black
                  backdrop-blur
                "
              >
                Combo x{combo}
              </div>

            </div>

            {/* PROJÉTEIS */}

            {/* VIDA DO REFLEXO */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-3
                    z-50
                    flex
                    -translate-x-1/2
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-white/10
                    bg-black/55
                    px-3
                    py-2
                    shadow-lg
                    backdrop-blur
                  "
                >

                  {Array.from({
                    length: MAX_HEARTS,
                  }).map(
                    (_, index) => (

                      <motion.span
                        key={index}

                        animate={{
                          opacity:
                            index < hearts
                              ? 1
                              : 0.18,

                          scale:
                            index < hearts
                              ? 1
                              : 0.78,
                        }}

                        transition={{
                          duration: 0.15,
                        }}

                        className="
                          text-xl
                          leading-none
                        "
                      >
                        ❤️
                      </motion.span>

                    )
                  )}

                </div>

                {projectiles.map(
              (projectile) => (
                <div
                  key={projectile.id}

                  className="
                    pointer-events-none
                    absolute
                    z-20
                    rounded-full
                    border
                    border-cyan-100/70
                    bg-cyan-300
                    shadow-[0_0_22px_rgba(34,211,238,0.75)]
                  "

                  style={{
                    width:
                      projectile.radius *
                      2,

                    height:
                      projectile.radius *
                      2,

                    left:
                      projectile.x -
                      projectile.radius,

                    top:
                      projectile.y -
                      projectile.radius,
                  }}
                >
                  <div
                    className="
                      absolute
                      left-1/2
                      top-1/2
                      h-1.5
                      w-1.5
                      -translate-x-1/2
                      -translate-y-1/2
                      rounded-full
                      bg-white
                    "
                  />
                </div>
              )
            )}

            {/* PERSONAGEM */}

            {arenaReady && (
              <motion.div
                className="
                  pointer-events-none
                  absolute
                  bottom-[18px]
                  z-40
                "

                style={{
                  width:
                    PLAYER_WIDTH,

                  height:
                    PLAYER_HEIGHT,

                  left:
                    playerX -
                    PLAYER_WIDTH /
                      2,
                }}

                animate={{
                  opacity:
                    isHit
                      ? [
                          1,
                          0.25,
                          1,
                          0.25,
                          1,
                        ]
                      : 1,

                  rotate:
                    isHit
                      ? [
                          0,
                          -8,
                          8,
                          -4,
                          0,
                        ]
                      : moveDirection ===
                          'left'
                        ? -4
                        : moveDirection ===
                            'right'
                          ? 4
                          : 0,
                }}

                transition={{
                  duration:
                    isHit
                      ? 0.22
                      : 0.1,
                }}
              >

                <motion.img
                  src="/reflexo-sprite.svg"
                  alt="Personagem"

                  animate={
                    moveDirection
                      ? {
                          y: [
                            0,
                            -3,
                            0,
                          ],
                        }
                      : {
                          y: [
                            0,
                            -1,
                            0,
                          ],
                        }
                  }

                  transition={{
                    duration:
                      moveDirection
                        ? 0.24
                        : 1,

                    repeat:
                      Infinity,

                    ease:
                      'easeInOut',
                  }}

                  className="
                    h-full
                    w-full
                    object-contain
                  "

                  style={{
                    transform:
                      moveDirection ===
                      'left'
                        ? 'scaleX(-1)'
                        : 'scaleX(1)',
                  }}
                />

              </motion.div>
            )}

            {/* HIT */}

            <AnimatePresence>

              {isHit && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}

                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}

                  exit={{
                    opacity: 0,
                  }}

                  className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-1/2
                    z-50
                    -translate-x-1/2
                    -translate-y-1/2
                    rounded-full
                    border
                    border-red-400/30
                    bg-red-950/70
                    px-5
                    py-2
                    text-sm
                    font-black
                    text-red-300
                    backdrop-blur
                  "
                >
                  ATINGIDO!
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* =================================================
              MOBILE CONTROLS
          ================================================= */}

          {phase === 'playing' && (
            <>

              <div
                className="
                  mt-2
                  grid
                  shrink-0
                  grid-cols-2
                  gap-3
                  md:hidden
                "
              >

                <button
                  type="button"

                  onPointerDown={(
                    event
                  ) => {
                    event.preventDefault()

                    event.currentTarget
                      .setPointerCapture(
                        event.pointerId
                      )

                    pressLeft()
                  }}

                  onPointerUp={(
                    event
                  ) => {
                    event.preventDefault()
                    releaseLeft()
                  }}

                  onPointerCancel={
                    releaseLeft
                  }

                  className="
                    flex
                    min-h-[82px]
                    touch-none
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-cyan-400/20
                    bg-cyan-400/10
                    text-cyan-200
                    active:scale-[0.97]
                    active:bg-cyan-400/25
                  "
                >

                  <ArrowLeft
                    size={44}
                  />

                </button>

                <button
                  type="button"

                  onPointerDown={(
                    event
                  ) => {
                    event.preventDefault()

                    event.currentTarget
                      .setPointerCapture(
                        event.pointerId
                      )

                    pressRight()
                  }}

                  onPointerUp={(
                    event
                  ) => {
                    event.preventDefault()
                    releaseRight()
                  }}

                  onPointerCancel={
                    releaseRight
                  }

                  className="
                    flex
                    min-h-[82px]
                    touch-none
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-cyan-400/20
                    bg-cyan-400/10
                    text-cyan-200
                    active:scale-[0.97]
                    active:bg-cyan-400/25
                  "
                >

                  <ArrowRight
                    size={44}
                  />

                </button>

              </div>

              {/* DESKTOP */}

              <div
                className="
                  mt-3
                  hidden
                  shrink-0
                  items-center
                  justify-center
                  gap-8
                  md:flex
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <kbd
                    className="
                      rounded-lg
                      border
                      border-white/15
                      bg-white/5
                      px-4
                      py-2
                      text-lg
                      font-black
                    "
                  >
                    A
                  </kbd>

                  <span
                    className="
                      text-xs
                      text-white/35
                    "
                  >
                    Segure para esquerda
                  </span>

                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <kbd
                    className="
                      rounded-lg
                      border
                      border-white/15
                      bg-white/5
                      px-4
                      py-2
                      text-lg
                      font-black
                    "
                  >
                    D
                  </kbd>

                  <span
                    className="
                      text-xs
                      text-white/35
                    "
                  >
                    Segure para direita
                  </span>

                </div>

              </div>

            </>
          )}

          {/* =================================================
              COMPLETE
          ================================================= */}

          <AnimatePresence>

            {phase === 'complete' && (
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
                  absolute
                  inset-0
                  z-50
                  flex
                  flex-col
                  items-center
                  justify-center
                  bg-[#05080a]
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
                    bg-cyan-400
                    text-cyan-950
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
                    text-cyan-300
                  "
                >
                  Treino concluído
                </p>

                <h2
                  className="
                    mt-2
                    text-3xl
                    font-black
                  "
                >
                  Reflexo Finalizado
                </h2>

                <p
                  className="
                    mt-3
                    text-sm
                    text-white/45
                  "
                >
                  Você desviou de
                  {' '}
                  <strong
                    className="
                      text-white
                    "
                  >
                    {targetStacks}
                    {' '}
                    projéteis
                  </strong>
                  .
                </p>

                <div
                  className="
                    mt-7
                    grid
                    w-full
                    grid-cols-2
                    gap-3
                  "
                >

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-4
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
                      Melhor combo
                    </p>

                    <p
                      className="
                        mt-1
                        text-xl
                        font-black
                      "
                    >
                      x{bestCombo}
                    </p>

                  </div>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-4
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
                      Impactos
                    </p>

                    <p
                      className="
                        mt-1
                        text-xl
                        font-black
                      "
                    >
                      {hits}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={startGame}

                  className="
                    mt-7
                    flex
                    min-h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-cyan-400
                    px-6
                    font-black
                    text-black
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
                  onClick={exitTraining}

                  className="
                    mt-3
                    min-h-14
                    w-full
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/5
                    px-6
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

          <AnimatePresence>

        {phase === 'failed' && (

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}

            animate={{
              opacity: 1,
              scale: 1,
            }}

            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-black/85
              px-4
              backdrop-blur-sm
            "
          >

            <div
              className="
                w-full
                max-w-sm
                rounded-[28px]
                border
                border-red-400/20
                bg-[#09090b]
                p-6
                text-center
                shadow-2xl
              "
            >

              <div
                className="
                  text-6xl
                "
              >
                💔
              </div>

              <p
                className="
                  mt-4
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.25em]
                  text-red-300
                "
              >
                VOCÊ PERDEU OS 3 CORAÇÕES
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-black
                "
              >
                Treino falhou
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  text-white/45
                "
              >
                Tente chegar aos
                200 Stacks antes de
                receber três golpes.
              </p>

              <div
                className="
                  mt-5
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/5
                  p-4
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
                  Progresso
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-black
                  "
                >
                  {currentStacks}
                  /{targetStacks}
                </p>

              </div>

              <button
                type="button"

                onClick={() => {

                  resetProgress()

                  heartsRef.current =
                    MAX_HEARTS

                  setHearts(
                    MAX_HEARTS
                  )

                  setCountdown(3)

                  setPhase(
                    'countdown'
                  )

                }}

                className="
                  mt-5
                  min-h-14
                  w-full
                  rounded-2xl
                  bg-cyan-300
                  font-black
                  text-black
                  active:scale-[0.98]
                "
              >
                Tentar Novamente
              </button>

              <button
                type="button"

                onClick={
                  returnToMenu
                }

                className="
                  mt-2
                  min-h-12
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

            </div>

          </motion.div>

        )}

      </AnimatePresence>

</main>
  )
}
