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
  Flame,
  RotateCcw,
  Trophy,
} from 'lucide-react'

import { useTrainingStore } from '../../features/training/store/useTrainingStore'

type HitResult =
  | 'PERFEITO'
  | 'BOM'
  | 'FRACO'
  | null

type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'

const TARGET_MAX_HP = 5

export function ImpetoTraining() {
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

  const [meter, setMeter] =
    useState(0)

  const [direction, setDirection] =
    useState(1)

  const [feedback, setFeedback] =
    useState<HitResult>(null)

  const [damageFeedback, setDamageFeedback] =
    useState<number | null>(null)

  const [targetHp, setTargetHp] =
    useState(TARGET_MAX_HP)

  const [targetNumber, setTargetNumber] =
    useState(1)

  const [isImpacting, setIsImpacting] =
    useState(false)

  const [isTargetBroken, setIsTargetBroken] =
    useState(false)

  const animationRef =
    useRef<number | null>(null)

  const lastFrameRef =
    useRef<number | null>(null)

  const lockedRef =
    useRef(false)

  const speed =
    currentStacks < 40
      ? 52
      : currentStacks < 90
        ? 62
        : 72

  const progress =
    targetStacks > 0
      ? (currentStacks / targetStacks) * 100
      : 0

  const startGame = () => {
    resetProgress()

    setTargetHp(TARGET_MAX_HP)
    setTargetNumber(1)

    setMeter(0)
    setDirection(1)

    setFeedback(null)
    setDamageFeedback(null)

    setIsImpacting(false)
    setIsTargetBroken(false)

    lockedRef.current = false

    setCountdown(3)
    setPhase('countdown')
  }

  /*
  ==========================================
  CONTAGEM REGRESSIVA
  ==========================================
  */

  useEffect(() => {
    if (phase !== 'countdown') {
      return
    }

    if (countdown <= 0) {
      const timer =
        window.setTimeout(() => {
          setPhase('playing')
        }, 400)

      return () => {
        window.clearTimeout(timer)
      }
    }

    const timer =
      window.setTimeout(() => {
        setCountdown(
          (value) => value - 1
        )
      }, 700)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    phase,
    countdown,
  ])

  /*
  ==========================================
  MOVIMENTO DO MEDIDOR
  ==========================================
  */

  useEffect(() => {
    if (phase !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        )
      }

      lastFrameRef.current = null
      return
    }

    const animate = (
      time: number
    ) => {
      if (
        lastFrameRef.current === null
      ) {
        lastFrameRef.current = time
      }

      const delta =
        (
          time -
          lastFrameRef.current
        ) / 1000

      lastFrameRef.current = time

      setMeter(
        (oldValue) => {
          let next =
            oldValue +
            direction *
              speed *
              delta

          if (next >= 100) {
            next = 100
            setDirection(-1)
          }

          if (next <= 0) {
            next = 0
            setDirection(1)
          }

          return next
        }
      )

      animationRef.current =
        requestAnimationFrame(
          animate
        )
    }

    animationRef.current =
      requestAnimationFrame(
        animate
      )

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        )
      }

      lastFrameRef.current = null
    }
  }, [
    phase,
    direction,
    speed,
  ])

  /*
  ==========================================
  EXECUTAR GOLPE
  ==========================================
  */

  const hit =
    useCallback(() => {
      if (
        phase !== 'playing' ||
        lockedRef.current ||
        isTargetBroken
      ) {
        return
      }

      lockedRef.current = true

      const distance =
        Math.abs(
          meter - 50
        )

      let result: HitResult =
        'FRACO'

      let damage = 0

      /*
      PERFEITO:
      centro +/- 6%
      5 de dano

      BOM:
      centro +/- 18%
      3 de dano

      FRACO:
      fora dessas zonas
      0 de dano
      */

      if (distance <= 6) {
        result = 'PERFEITO'
        damage = 5
      } else if (
        distance <= 18
      ) {
        result = 'BOM'
        damage = 3
      }

      setFeedback(result)

      setDamageFeedback(
        damage > 0
          ? damage
          : null
      )

      setIsImpacting(true)

      window.setTimeout(() => {
        setIsImpacting(false)
      }, 150)

      /*
      ======================================
      DANO NO ALVO
      ======================================

      O dano excedente NÃO é transferido.

      Exemplo:

      5 HP
      -3
      = 2 HP

      próximo golpe:
      -3

      alvo destruído.

      O -1 excedente é descartado.

      Novo alvo:
      5 HP.
      */

      if (damage > 0) {
        const remainingHp = Math.max(
          0,
          targetHp - damage
        )

        /*
        Atualizamos a integridade diretamente.

        IMPORTANTE:
        Não colocamos addStack dentro de um
        callback de setState, pois o React
        StrictMode pode executar callbacks
        de atualização mais de uma vez
        durante o desenvolvimento.
        */

        setTargetHp(remainingHp)

        /*
        O Stack só é concedido quando
        a integridade chega a zero.
        */

        if (remainingHp === 0) {
          setIsTargetBroken(true)

          /*
          EXATAMENTE 1 STACK
          POR ALVO DESTRUÍDO.
          */

          addStack(1)

          window.setTimeout(
            () => {
              setTargetNumber(
                (value) =>
                  value + 1
              )

              /*
              Dano excedente é descartado.
              Todo novo alvo começa em 5/5.
              */

              setTargetHp(
                TARGET_MAX_HP
              )

              setIsTargetBroken(
                false
              )
            },
            300
          )
        }
      }

      window.setTimeout(() => {
        setFeedback(null)
        setDamageFeedback(null)

        lockedRef.current = false
      }, 360)
    }, [
      phase,
      meter,
      targetHp,
      addStack,
      isTargetBroken,
    ])

  /*
  ==========================================
  FINAL DO TREINO
  ==========================================
  */

  useEffect(() => {
    if (
      targetStacks > 0 &&
      currentStacks >=
        targetStacks &&
      phase === 'playing'
    ) {
      setPhase('complete')
    }
  }, [
    currentStacks,
    targetStacks,
    phase,
  ])

  /*
  ==========================================
  CONTROLE DESKTOP
  ==========================================
  */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.code ===
          'Space' ||
        event.code ===
          'Enter'
      ) {
        event.preventDefault()
        hit()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [hit])

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <main
      className="
        min-h-[100dvh]
        select-none
        overscroll-none
        bg-[#080808]
        text-white
      "
    >

      <div
        className="
          mx-auto
          flex
          min-h-[100dvh]
          w-full
          max-w-md
          flex-col
          px-4
          pb-[max(16px,env(safe-area-inset-bottom))]
          pt-[max(16px,env(safe-area-inset-top))]
          sm:max-w-lg
          lg:max-w-xl
        "
      >

        {/* HUD */}

        <header
          className="shrink-0"
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <button
              type="button"
              onClick={returnToMenu}
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
                <Flame
                  size={18}
                  className="
                    text-orange-400
                  "
                />

                <h1
                  className="
                    truncate
                    text-lg
                    font-black
                  "
                >
                  Ímpeto
                </h1>
              </div>

              <p
                className="
                  text-xs
                  text-white/40
                "
              >
                Quebra de Alvos
              </p>

            </div>

            <div
              className="
                text-right
              "
            >

              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-widest
                  text-white/35
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
                  /{targetStacks}
                </span>
              </p>

            </div>

          </div>

          <div
            className="
              mt-4
              h-2
              overflow-hidden
              rounded-full
              bg-white/10
            "
          >

            <motion.div
              className="
                h-full
                rounded-full
                bg-orange-500
              "
              animate={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

        </header>

        {/* CONTEÚDO */}

        <section
          className="
            relative
            flex
            min-h-0
            flex-1
            flex-col
            items-center
            justify-center
            py-5
          "
        >

          <AnimatePresence
            mode="wait"
          >

            {/* READY */}

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
                    h-24
                    w-24
                    items-center
                    justify-center
                    rounded-[28px]
                    border
                    border-orange-500/20
                    bg-orange-500/10
                    text-5xl
                  "
                >
                  🔥
                </div>

                <h2
                  className="
                    mt-6
                    text-3xl
                    font-black
                  "
                >
                  Quebra de Alvos
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
                  Destrua os alvos
                  acertando o momento
                  certo do golpe.
                </p>

                <div
                  className="
                    mt-7
                    grid
                    w-full
                    grid-cols-3
                    gap-2
                  "
                >

                  <div
                    className="
                      rounded-2xl
                      bg-white/5
                      p-3
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-black
                        text-white/30
                      "
                    >
                      FRACO
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-bold
                      "
                    >
                      0 Dano
                    </p>
                  </div>

                  <div
                    className="
                      rounded-2xl
                      bg-white/5
                      p-3
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-black
                        text-white/30
                      "
                    >
                      BOM
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-bold
                      "
                    >
                      3 Dano
                    </p>
                  </div>

                  <div
                    className="
                      rounded-2xl
                      bg-orange-500/10
                      p-3
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-black
                        text-orange-300
                      "
                    >
                      PERFEITO
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-bold
                      "
                    >
                      5 Dano
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
                  Cada alvo destruído
                  concede 1 Stack.
                </p>

                <button
                  type="button"
                  onClick={startGame}
                  className="
                    mt-7
                    min-h-14
                    w-full
                    rounded-2xl
                    bg-orange-500
                    px-6
                    py-4
                    font-black
                    text-black
                    active:scale-[0.98]
                  "
                >
                  Começar Treino
                </button>

              </motion.div>
            )}

            {/* COUNTDOWN */}

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
                  scale: 1.4,
                }}

                className="
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
                        mt-4
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
                      text-orange-400
                    "
                  >
                    VAI!
                  </p>
                )}

              </motion.div>
            )}

            {/* PLAYING */}

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
                  h-full
                  w-full
                  flex-col
                  items-center
                  justify-between
                "
              >

                {/* ALVO */}

                <div
                  className="
                    flex
                    flex-1
                    flex-col
                    items-center
                    justify-center
                    py-3
                  "
                >

                  <p
                    className="
                      mb-4
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.25em]
                      text-white/30
                    "
                  >
                    Alvo #{targetNumber}
                  </p>

                  <motion.div
                    animate={
                      isTargetBroken
                        ? {
                            scale: [
                              1,
                              1.12,
                              0,
                            ],
                            rotate: [
                              0,
                              -5,
                              10,
                            ],
                            opacity: [
                              1,
                              1,
                              0,
                            ],
                          }
                        : isImpacting
                          ? {
                              x: [
                                0,
                                -8,
                                8,
                                -4,
                                4,
                                0,
                              ],

                              scale: [
                                1,
                                0.94,
                                1.04,
                                1,
                              ],
                            }
                          : {
                              x: 0,
                              scale: 1,
                              opacity: 1,
                              rotate: 0,
                            }
                    }

                    transition={{
                      duration:
                        isTargetBroken
                          ? 0.28
                          : 0.15,
                    }}

                    className="
                      relative
                      flex
                      h-44
                      w-44
                      items-center
                      justify-center
                      rounded-full
                      border-[10px]
                      border-white/10
                      bg-white/[0.04]
                      shadow-2xl
                      sm:h-52
                      sm:w-52
                    "
                  >

                    <div
                      className="
                        absolute
                        h-28
                        w-28
                        rounded-full
                        border-[8px]
                        border-orange-500/25
                      "
                    />

                    <div
                      className="
                        absolute
                        h-14
                        w-14
                        rounded-full
                        bg-orange-500
                        shadow-[0_0_40px_rgba(249,115,22,0.35)]
                      "
                    />

                    <div
                      className="
                        absolute
                        h-4
                        w-4
                        rounded-full
                        bg-white
                      "
                    />

                  </motion.div>

                  {/* VIDA DO ALVO */}

                  <div
                    className="
                      mt-5
                      w-44
                    "
                  >

                    <div
                      className="
                        mb-2
                        flex
                        justify-between
                        text-[10px]
                        font-black
                        uppercase
                        tracking-widest
                        text-white/30
                      "
                    >

                      <span>
                        Integridade
                      </span>

                      <span>
                        {targetHp}
                        /
                        {TARGET_MAX_HP}
                      </span>

                    </div>

                    <div
                      className="
                        h-2
                        overflow-hidden
                        rounded-full
                        bg-white/10
                      "
                    >

                      <motion.div
                        className="
                          h-full
                          bg-orange-500
                        "
                        animate={{
                          width:
                            `${
                              (
                                targetHp /
                                TARGET_MAX_HP
                              ) *
                              100
                            }%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* FEEDBACK */}

                  <div
                    className="
                      mt-4
                      h-14
                      text-center
                    "
                  >

                    <AnimatePresence
                      mode="wait"
                    >

                      {feedback && (
                        <motion.div
                          key={feedback}

                          initial={{
                            opacity: 0,
                            y: 8,
                            scale: 0.8,
                          }}

                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                          }}

                          exit={{
                            opacity: 0,
                            y: -6,
                          }}
                        >

                          <p
                            className={
                              feedback ===
                              'PERFEITO'
                                ? 'text-xl font-black text-orange-400'
                                : feedback ===
                                    'BOM'
                                  ? 'text-xl font-black text-white'
                                  : 'text-xl font-black text-white/35'
                            }
                          >
                            {feedback}
                          </p>

                          {damageFeedback !==
                            null && (
                            <p
                              className="
                                mt-1
                                text-xs
                                font-black
                                text-white/35
                              "
                            >
                              -
                              {
                                damageFeedback
                              }
                              {' '}
                              Integridade
                            </p>
                          )}

                        </motion.div>
                      )}

                    </AnimatePresence>

                  </div>

                </div>

                {/* BARRA */}

                <div
                  className="
                    w-full
                  "
                >

                  <div
                    className="
                      mb-2
                      flex
                      justify-between
                      px-1
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-white/30
                    "
                  >
                    <span>
                      Fraco
                    </span>

                    <span>
                      Perfeito
                    </span>

                    <span>
                      Fraco
                    </span>
                  </div>

                  <div
                    className="
                      relative
                      h-14
                      overflow-hidden
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                    "
                  >

                    {/* BOM */}

                    <div
                      className="
                        absolute
                        bottom-0
                        left-[32%]
                        top-0
                        w-[36%]
                        bg-orange-500/10
                      "
                    />

                    {/* PERFEITO */}

                    <div
                      className="
                        absolute
                        bottom-0
                        left-[44%]
                        top-0
                        w-[12%]
                        bg-orange-500/30
                      "
                    />

                    {/* CENTRO */}

                    <div
                      className="
                        absolute
                        bottom-0
                        left-1/2
                        top-0
                        w-px
                        -translate-x-1/2
                        bg-white/40
                      "
                    />

                    {/* MARCADOR */}

                    <div
                      className="
                        absolute
                        top-1/2
                        h-10
                        w-2
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-full
                        bg-white
                        shadow-[0_0_14px_rgba(255,255,255,0.7)]
                      "
                      style={{
                        left:
                          `${meter}%`,
                      }}
                    />

                  </div>

                  <button
                    type="button"

                    onPointerDown={(
                      event
                    ) => {
                      event.preventDefault()
                      hit()
                    }}

                    className="
                      mt-4
                      flex
                      min-h-[76px]
                      w-full
                      touch-manipulation
                      items-center
                      justify-center
                      rounded-[24px]
                      bg-orange-500
                      px-6
                      text-lg
                      font-black
                      text-black
                      shadow-lg
                      active:scale-[0.97]
                    "
                  >
                    TOCAR PARA GOLPEAR
                  </button>

                  <p
                    className="
                      mt-3
                      hidden
                      text-center
                      text-xs
                      text-white/25
                      md:block
                    "
                  >
                    Desktop:
                    Espaço ou Enter
                  </p>

                </div>

              </motion.div>
            )}

            {/* COMPLETE */}

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
                  w-full
                  flex-col
                  items-center
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
                    bg-orange-500
                    text-black
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
                    text-orange-400
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
                  Ímpeto Finalizado
                </h2>

                <p
                  className="
                    mt-3
                    text-white/45
                  "
                >
                  Você destruiu
                  {' '}
                  <strong
                    className="
                      text-white
                    "
                  >
                    {targetStacks}
                    {' '}
                    alvos
                  </strong>
                  .
                </p>

                <button
                  type="button"
                  onClick={startGame}
                  className="
                    mt-8
                    flex
                    min-h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-orange-500
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
                  onClick={returnToMenu}
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
    </main>
  )
}
