#!/usr/bin/env bash

set +e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"

if [ -z "$REPO_ROOT" ]; then
  echo "❌ Não estou dentro de um repositório Git."
  exit 1
fi

cd "$REPO_ROOT" || exit 1

FILE="src/games/ruptura/RupturaTraining.tsx"
BACKUP="${FILE}.moving-target-backup"

echo "📁 $REPO_ROOT"
echo "🌿 Branch: $(git branch --show-current)"
echo

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE não encontrado."
  exit 1
fi

CHANGES="$(
  git status --porcelain |
  grep -v '^?? \.ruptura-moving-target-v2\.sh$'
)"

if [ -n "$CHANGES" ]; then
  echo "❌ Existem alterações locais:"
  echo
  printf '%s\n' "$CHANGES"
  echo
  echo "Faça commit ou stash antes de continuar."
  exit 1
fi

cp "$FILE" "$BACKUP"

if [ $? -ne 0 ]; then
  echo "❌ Não consegui criar o backup."
  exit 1
fi

echo "✅ Backup criado."
echo

node --input-type=module <<'NODE'
import fs from 'node:fs'

const path =
  'src/games/ruptura/RupturaTraining.tsx'

let source =
  fs.readFileSync(
    path,
    'utf8'
  )

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function replaceOnce(
  regex,
  replacement,
  label
) {
  if (!regex.test(source)) {
    fail(
      `Não encontrei o ponto para: ${label}`
    )
  }

  source =
    source.replace(
      regex,
      replacement
    )

  console.log(`✅ ${label}`)
}

/*
========================================
PROTEÇÃO CONTRA PATCH DUPLICADO
========================================
*/

if (
  source.includes(
    'TARGET_SPEED_SLOW'
  ) ||
  source.includes(
    'targetFrameRef'
  ) ||
  source.includes(
    'const moveTarget ='
  )
) {
  fail(
    'O sistema de alvo móvel aparentemente já existe no arquivo.'
  )
}

/*
========================================
1. CONSTANTES DE MOVIMENTO
========================================
*/

replaceOnce(
  /const VELOCITY_SCALE = 6\.4\s+const GRAVITY = 115/,
`const VELOCITY_SCALE = 6.4
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
const TARGET_SPEED_FAST = 88`,
  'constantes de velocidade'
)

/*
========================================
2. CÁLCULO DA VELOCIDADE

0–30   Stacks -> lento
31–65  Stacks -> médio
66–100 Stacks -> rápido

Pequena variação entre alvos para
não ficarem todos idênticos.
========================================
*/

replaceOnce(
  /function makeTarget\(/,
`function getTargetSpeed(
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

function makeTarget(`,
  'função getTargetSpeed'
)

/*
========================================
3. REFS EXCLUSIVOS DO ALVO

frameRef continua sendo exclusivamente
do projétil.

Isso é importante para o alvo NÃO parar
quando resetShot() for executado.
========================================
*/

replaceOnce(
  /(\s+const targetTimerRef =\s+useRef<number \| null>\(\s+null\s+\)\s+)/,
`$1
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

`,
  'refs independentes do alvo'
)

/*
========================================
4. CLEAR TIMERS TAMBÉM ENCERRA
O LOOP DO ALVO QUANDO O TREINO ACABA
========================================
*/

const frameCleanupRegex =
  /(\s+if \(\s+frameRef\.current !==\s+null\s+\) \{\s+cancelAnimationFrame\(\s+frameRef\.current\s+\)\s+frameRef\.current =\s+null\s+\}\s+)/

replaceOnce(
  frameCleanupRegex,
`$1
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

`,
  'cleanup do loop do alvo'
)

/*
========================================
5. PREPARE TARGET

Cada alvo ganha velocidade quando nasce.

A direção inicial alterna:
alvo 1 -> direita
alvo 2 -> esquerda
etc.
========================================
*/

const prepareRegex =
  /(const next =\s+makeTarget\(\s+number,\s+stacks,\s+targetStacks\s+\)\s+)(targetRef\.current =\s+next)/

replaceOnce(
  prepareRegex,
`$1
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

        $2`,
  'velocidade aplicada a cada novo alvo'
)

/*
========================================
6. LOOP CONTÍNUO DO ALVO

REGRAS:

- só roda em playing;
- não depende de dragging;
- não depende de flyingRef;
- continua enquanto o jogador mira;
- continua enquanto a magia voa;
- continua depois de receber dano;
- rebate nas laterais;
- preserva HP e Y;
- atualiza targetRef para colisão real.
========================================
*/

const cleanupMarker =
`  useEffect(
    () => () => {
      clearTimers()
    },
    [
      clearTimers,
    ]
  )`

if (
  !source.includes(
    cleanupMarker
  )
) {
  fail(
    'Não encontrei o useEffect de cleanup.'
  )
}

const movingTargetEffect =
`  useEffect(() => {
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

`

source =
  source.replace(
    cleanupMarker,
    movingTargetEffect +
      cleanupMarker
  )

console.log(
  '✅ loop horizontal contínuo criado'
)

/*
========================================
7. TEXTO DA INTRODUÇÃO
========================================
*/

const oldInstruction =
`                  Segure a esfera,
                  puxe para trás,
                  mire e solte para
                  lançar a magia.`

const newInstruction =
`                  Segure a esfera,
                  puxe para trás e
                  antecipe o alvo em
                  movimento antes de
                  lançar a magia.`

if (
  source.includes(
    oldInstruction
  )
) {
  source =
    source.replace(
      oldInstruction,
      newInstruction
    )

  console.log(
    '✅ instrução atualizada'
  )
}

/*
========================================
8. VALIDAÇÃO ROBUSTA

Sem comparar espaços ou \\n.
========================================
*/

const requiredMarkers = [
  'const TARGET_SPEED_SLOW = 48',
  'const TARGET_SPEED_MEDIUM = 68',
  'const TARGET_SPEED_FAST = 88',
  'function getTargetSpeed(',
  'const targetFrameRef =',
  'const targetLastFrameRef =',
  'const targetVelocityRef =',
  'const moveTarget =',
  'const movedTarget = {',
  'targetRef.current =',
  'setTarget(',
  'requestAnimationFrame(',
]

for (
  const marker of requiredMarkers
) {
  if (
    !source.includes(
      marker
    )
  ) {
    fail(
      `Validação falhou: ${marker}`
    )
  }
}

/*
 * Confere também que continuam existindo
 * os sistemas fundamentais do Ruptura.
 */
const preservedMarkers = [
  'const launch =',
  'const checkHit =',
  'const destroyTarget =',
  'const pointerDown =',
  'const pointerMove =',
  'const pointerUp =',
  'filterUnits="userSpaceOnUse"',
]

for (
  const marker of preservedMarkers
) {
  if (
    !source.includes(
      marker
    )
  ) {
    fail(
      `Estrutura original ausente: ${marker}`
    )
  }
}

fs.writeFileSync(
  path,
  source
)

console.log('')
console.log('✅ Patch gravado.')
NODE

PATCH_STATUS=$?

if [ $PATCH_STATUS -ne 0 ]; then
  echo
  echo "========================================"
  echo " ❌ PATCH FALHOU"
  echo "========================================"
  echo
  echo "Restaurando arquivo anterior..."

  cp "$BACKUP" "$FILE"
  rm -f "$BACKUP"

  echo "✅ Arquivo restaurado."
  exit $PATCH_STATUS
fi

echo
echo "========================================"
echo " VERIFICAÇÃO"
echo "========================================"
echo

grep -n \
  "TARGET_SPEED_\|getTargetSpeed\|targetFrameRef\|targetVelocityRef\|moveTarget\|movedTarget" \
  "$FILE" |
  head -60

echo
echo "========================================"
echo " DIFF CHECK"
echo "========================================"
echo

git diff --check
DIFF_STATUS=$?

if [ $DIFF_STATUS -ne 0 ]; then
  echo
  echo "❌ git diff --check falhou."
  echo "Restaurando arquivo..."

  cp "$BACKUP" "$FILE"
  rm -f "$BACKUP"

  exit $DIFF_STATUS
fi

echo "✅ Diff OK."

echo
echo "========================================"
echo " BUILD"
echo "========================================"
echo

npm run build
BUILD_STATUS=$?

echo
echo "========================================"
echo " LINT"
echo "========================================"
echo

npm run lint
LINT_STATUS=$?

echo
echo "========================================"
echo " RESULTADO"
echo "========================================"
echo

git status --short

echo
git diff --stat

echo

if [ $BUILD_STATUS -eq 0 ]; then
  echo "✅ Build: OK"
else
  echo "❌ Build: FALHOU ($BUILD_STATUS)"
fi

if [ $LINT_STATUS -eq 0 ]; then
  echo "✅ Lint: OK"
else
  echo "❌ Lint: FALHOU ($LINT_STATUS)"
fi

echo

if \
  [ $BUILD_STATUS -eq 0 ] &&
  [ $LINT_STATUS -eq 0 ]
then
  rm -f "$BACKUP"

  echo "========================================"
  echo " ✅ ALVO MÓVEL IMPLEMENTADO"
  echo "========================================"
  echo
  echo "Comportamento esperado:"
  echo
  echo "• alvo anda horizontalmente"
  echo "• rebate nas laterais"
  echo "• não para enquanto você mira"
  echo "• não para enquanto a magia voa"
  echo "• continua andando após receber dano"
  echo "• cada alvo nasce em uma altura diferente"
  echo
  echo "Velocidade:"
  echo "  0–30  Stacks -> lenta"
  echo " 31–65  Stacks -> média"
  echo " 66–100 Stacks -> rápida"
  echo
  echo "Teste com:"
  echo
  echo "npm run dev"

  exit 0
fi

echo "========================================"
echo " ⚠️ VALIDAÇÃO DE BUILD/LINT FALHOU"
echo "========================================"
echo
echo "Backup mantido em:"
echo "$BACKUP"
echo
echo "Não faça commit ainda."

exit 1
