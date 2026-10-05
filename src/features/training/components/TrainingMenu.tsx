import { motion } from 'motion/react'

import {
  ChevronRight,
  Dumbbell,
  Play,
} from 'lucide-react'

import { trainings } from '../data/trainings'
import { useTrainingStore } from '../store/useTrainingStore'

function getDifficultyLabel(
  difficulty: string
) {
  switch (difficulty) {
    case 'facil':
      return 'Fácil'

    case 'medio':
      return 'Médio'

    case 'dificil':
      return 'Difícil'

    case 'muito-dificil':
      return 'Muito Difícil'

    default:
      return difficulty
  }
}

export function TrainingMenu() {
  const {
    selectedTraining,
    selectTraining,
    startTraining,
  } = useTrainingStore()

  const selected =
    trainings.find(
      (training) =>
        training.id === selectedTraining
    )

  const available =
    selected?.id === 'impeto'

  return (
    <main
      className="
        min-h-[100dvh]
        bg-[#080808]
        text-white
      "
    >
      <div
        className="
          mx-auto
          max-w-6xl
          px-4
          pb-10
          pt-[max(20px,env(safe-area-inset-top))]
          sm:px-6
          lg:px-8
        "
      >

        <header className="mb-8">

          <div className="mb-5 flex items-center gap-3">

            <div
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
              <Dumbbell size={20} />
            </div>

            <div>

              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.25em]
                  text-white/30
                "
              >
                Black Clover RPG
              </p>

              <p className="text-sm font-bold text-white/60">
                Central de Treinamentos
              </p>

            </div>

          </div>

          <h1
            className="
              text-3xl
              font-black
              tracking-tight
              sm:text-4xl
            "
          >
            Escolha seu treino
          </h1>

          <p
            className="
              mt-3
              max-w-xl
              text-sm
              leading-6
              text-white/40
            "
          >
            Cada atributo possui um minigame próprio.
          </p>

        </header>

        <section
          className="
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >

          {trainings.map(
            (training, index) => {
              const active =
                training.id ===
                selectedTraining

              const enabled =
                training.id === 'impeto'

              return (
                <motion.button
                  key={training.id}
                  type="button"

                  initial={{
                    opacity: 0,
                    y: 10,
                  }}

                  animate={{
                    opacity: 1,
                    y: 0,
                  }}

                  transition={{
                    delay:
                      index * 0.035,
                  }}

                  whileTap={{
                    scale: 0.985,
                  }}

                  onClick={() =>
                    selectTraining(
                      training.id,
                      training.stacks
                    )
                  }

                  className={
                    active
                      ? `
                        min-h-[150px]
                        rounded-[22px]
                        border
                        border-orange-500/40
                        bg-orange-500/10
                        p-5
                        text-left
                      `
                      : `
                        min-h-[150px]
                        rounded-[22px]
                        border
                        border-white/10
                        bg-white/[0.035]
                        p-5
                        text-left
                        active:bg-white/[0.08]
                      `
                  }
                >

                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >

                    <span className="text-3xl">
                      {training.icon}
                    </span>

                    <div className="text-right">

                      <p
                        className="
                          text-[9px]
                          font-black
                          uppercase
                          tracking-widest
                          text-white/30
                        "
                      >
                        Meta
                      </p>

                      <p className="font-black">
                        {training.stacks}
                      </p>

                    </div>

                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    {training.name}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-bold
                      text-white/55
                    "
                  >
                    {training.minigame}
                  </p>

                  <div
                    className="
                      mt-4
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <span
                      className="
                        text-xs
                        font-bold
                        text-white/35
                      "
                    >
                      {getDifficultyLabel(
                        training.difficulty
                      )}
                    </span>

                    <span
                      className="
                        flex
                        items-center
                        gap-1
                        text-xs
                        font-black
                      "
                    >
                      {enabled
                        ? 'Disponível'
                        : 'Em breve'}

                      <ChevronRight
                        size={14}
                      />
                    </span>

                  </div>

                </motion.button>
              )
            }
          )}

        </section>

        {selected && (
          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="
              sticky
              bottom-3
              mt-6
              rounded-[24px]
              border
              border-white/10
              bg-neutral-900/95
              p-4
              shadow-2xl
              backdrop-blur-xl
              sm:static
              sm:p-5
            "
          >

            <div
              className="
                flex
                items-center
                gap-4
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/5
                  text-2xl
                "
              >
                {selected.icon}
              </div>

              <div className="min-w-0 flex-1">

                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-widest
                    text-white/30
                  "
                >
                  Selecionado
                </p>

                <p className="truncate font-black">
                  {selected.name}
                </p>

                <p className="truncate text-xs text-white/40">
                  {selected.minigame}
                  {' · '}
                  {selected.stacks} Stacks
                </p>

              </div>

            </div>

            <button
              type="button"
              disabled={!available}
              onClick={() => {
                if (available) {
                  startTraining()
                }
              }}
              className={
                available
                  ? `
                    mt-4
                    flex
                    min-h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-orange-500
                    px-5
                    font-black
                    text-black
                    active:scale-[0.98]
                  `
                  : `
                    mt-4
                    flex
                    min-h-14
                    w-full
                    cursor-not-allowed
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white/10
                    px-5
                    font-black
                    text-white/25
                  `
              }
            >
              <Play size={17} />

              {available
                ? 'Iniciar Treino'
                : 'Em breve'}
            </button>

          </motion.section>
        )}

      </div>
    </main>
  )
}
