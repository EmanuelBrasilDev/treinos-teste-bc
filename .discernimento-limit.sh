#!/usr/bin/env bash

set +e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"

if [ -z "$REPO_ROOT" ]; then
  echo "❌ Não estou dentro de um repositório Git."
  exit 1
fi

cd "$REPO_ROOT" || exit 1

DISCERNIMENTO_FILE="src/games/discernimento/DiscernimentoTraining.tsx"
MENU_FILE="src/features/training/components/TrainingMenu.tsx"

if [ ! -f "$DISCERNIMENTO_FILE" ]; then
  echo "❌ Não encontrei:"
  echo "$DISCERNIMENTO_FILE"
  exit 1
fi

if [ ! -f "$MENU_FILE" ]; then
  echo "❌ Não encontrei:"
  echo "$MENU_FILE"
  exit 1
fi

echo "📁 $REPO_ROOT"
echo "🌿 Branch: $(git branch --show-current)"
echo

echo "Estado atual:"
git status --short
echo

TMP_DIR="$(mktemp -d)"

if [ -z "$TMP_DIR" ] || [ ! -d "$TMP_DIR" ]; then
  echo "❌ Não consegui criar diretório temporário."
  exit 1
fi

cp "$DISCERNIMENTO_FILE" "$TMP_DIR/DiscernimentoTraining.tsx"
cp "$MENU_FILE" "$TMP_DIR/TrainingMenu.tsx"

restore_files() {
  echo
  echo "Restaurando os arquivos anteriores..."

  cp \
    "$TMP_DIR/DiscernimentoTraining.tsx" \
    "$DISCERNIMENTO_FILE"

  cp \
    "$TMP_DIR/TrainingMenu.tsx" \
    "$MENU_FILE"

  echo "✅ Arquivos restaurados."
}

echo "✅ Backup temporário criado."
echo

node --input-type=module <<'NODE'
import fs from 'node:fs'

const discernimentoPath =
  'src/games/discernimento/DiscernimentoTraining.tsx'

const menuPath =
  'src/features/training/components/TrainingMenu.tsx'

let discernimento =
  fs.readFileSync(
    discernimentoPath,
    'utf8'
  )

let menu =
  fs.readFileSync(
    menuPath,
    'utf8'
  )

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function replaceOnce(
  source,
  search,
  replacement,
  label
) {
  if (!source.includes(search)) {
    fail(
      `Não encontrei o trecho esperado: ${label}`
    )
  }

  const result =
    source.replace(
      search,
      replacement
    )

  console.log(`✅ ${label}`)

  return result
}

/*
========================================
PROTEÇÃO CONTRA PATCH DUPLICADO
========================================
*/

if (
  discernimento.includes(
    'const MAX_MOVEMENTS = 100'
  )
) {
  fail(
    'O limite de 100 movimentos já parece estar implementado.'
  )
}

/*
========================================
1. NOVA FASE DE FALHA
========================================
*/

discernimento =
  replaceOnce(
    discernimento,
`type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'complete'`,
`type GamePhase =
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'failed'
  | 'complete'`,
    'fase failed adicionada'
  )

/*
========================================
2. CONSTANTE DO LIMITE
========================================
*/

discernimento =
  replaceOnce(
    discernimento,
`const REVEAL_DURATION = 1200`,
`const REVEAL_DURATION = 1200
const MAX_MOVEMENTS = 100`,
    'limite MAX_MOVEMENTS = 100'
  )

/*
========================================
3. LÓGICA DO 100º MOVIMENTO

A ordem é intencional:

1. aplica o movimento;
2. verifica vitória;
3. somente se NÃO venceu,
   verifica se chegou a 100.

Assim resolver exatamente no
movimento 100 continua sendo vitória.
========================================
*/

const oldVictoryBlock =
`    if (!isPuzzleSolved(nextPuzzle)) return

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
    )`

const newVictoryBlock =
`    /*
     * Vitória tem prioridade sobre o limite.
     *
     * Portanto, se a imagem for resolvida
     * exatamente no movimento 100,
     * o jogador vence normalmente.
     */
    if (isPuzzleSolved(nextPuzzle)) {
      solvedRef.current = true
      setSolved(true)
      addStack(targetStacks)

      completionTimerRef.current =
        window.setTimeout(
          () => {
            phaseRef.current =
              'complete'

            setPhase(
              'complete'
            )

            completionTimerRef.current =
              null
          },
          REVEAL_DURATION
        )

      return
    }

    /*
     * Movimento 100 sem solucionar:
     * encerra imediatamente a tentativa.
     *
     * Nenhum Stack é concedido.
     */
    if (
      nextMovements >=
      MAX_MOVEMENTS
    ) {
      solvedRef.current = true
      phaseRef.current = 'failed'

      setPhase(
        'failed'
      )
    }`

discernimento =
  replaceOnce(
    discernimento,
    oldVictoryBlock,
    newVictoryBlock,
    'regra de vitória e limite'
  )

/*
========================================
4. READY SCREEN

Troca o terceiro cartão por uma
informação explícita sobre o limite.
========================================
*/

discernimento =
  replaceOnce(
    discernimento,
`                    ['Conclua', 'uma única vez'],`,
`                    ['Limite', '100 movimentos'],`,
    'limite exibido na tela inicial'
  )

/*
========================================
5. CONTADOR DURANTE O JOGO

Antes:
23

Agora:
23/100
========================================
*/

discernimento =
  replaceOnce(
    discernimento,
`                    <p className="mt-0.5 font-black">
                      {movements}
                    </p>`,
`                    <p className="mt-0.5 font-black">
                      {movements}/{MAX_MOVEMENTS}
                    </p>`,
    'contador X/100'
  )

/*
========================================
6. TELA DE LIMITE ATINGIDO

Será inserida imediatamente antes
da tela COMPLETE.
========================================
*/

const completeMarker =
`            {phase === 'complete' && (`

if (
  !discernimento.includes(
    completeMarker
  )
) {
  fail(
    'Não encontrei a tela complete do Discernimento.'
  )
}

const failedScreen =
`            {phase === 'failed' && (
              <motion.div
                key="failed"
                initial={{
                  opacity: 0,
                  scale: 0.94,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-red-300/20 bg-red-400/10 text-3xl font-black text-red-300 shadow-[0_0_45px_rgba(248,113,113,.1)]">
                  100
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-red-300">
                  Limite atingido
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Mosaico incompleto
                </h2>

                <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
                  Você chegou ao limite de 100 movimentos antes de reconstruir a imagem.
                </p>

                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Movimentos
                    </p>

                    <p className="mt-1 text-xl font-black text-red-200">
                      {movements}/{MAX_MOVEMENTS}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Peças corretas
                    </p>

                    <p className="mt-1 text-xl font-black text-cyan-200">
                      {correctTiles}/8
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-black text-cyan-950 active:scale-[0.98]"
                >
                  <RotateCcw size={18} />

                  Tentar Novamente
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

`

discernimento =
  discernimento.replace(
    completeMarker,
    failedScreen +
      completeMarker
  )

console.log(
  '✅ tela de limite atingido adicionada'
)

/*
========================================
7. META -> LIMITE NO MENU
========================================
*/

const metaRegex =
  />\s*Meta\s*</

if (!metaRegex.test(menu)) {
  fail(
    'Não encontrei a palavra Meta no TrainingMenu.'
  )
}

menu =
  menu.replace(
    metaRegex,
    '>\n                        Limite\n                      <'
  )

console.log(
  '✅ Meta alterado para Limite no menu'
)

/*
========================================
8. GARANTIAS

Não alterar stacks ou dificuldade.
========================================
*/

const requiredDiscernimento = [
  'const MAX_MOVEMENTS = 100',
  "| 'failed'",
  "phaseRef.current = 'failed'",
  "setPhase(\n        'failed'\n      )",
  '{movements}/{MAX_MOVEMENTS}',
  "key=\"failed\"",
  'Tentar Novamente',
  'addStack(targetStacks)',
]

for (
  const marker of requiredDiscernimento
) {
  if (
    !discernimento.includes(
      marker
    )
  ) {
    fail(
      `Validação estrutural falhou: ${marker}`
    )
  }
}

const preservedRules = [
  'createShuffledPuzzle()',
  'moveTile(',
  'isPuzzleSolved(nextPuzzle)',
  'countCorrectTiles(puzzle)',
]

for (
  const marker of preservedRules
) {
  if (
    !discernimento.includes(
      marker
    )
  ) {
    fail(
      `Regra original desapareceu: ${marker}`
    )
  }
}

if (
  !menu.includes(
    'Limite'
  )
) {
  fail(
    'TrainingMenu não contém Limite.'
  )
}

fs.writeFileSync(
  discernimentoPath,
  discernimento
)

fs.writeFileSync(
  menuPath,
  menu
)

console.log('')
console.log(
  '✅ Implementação gravada.'
)
NODE

PATCH_STATUS=$?

if [ $PATCH_STATUS -ne 0 ]; then
  echo
  echo "========================================"
  echo " ❌ PATCH FALHOU"
  echo "========================================"

  restore_files
  rm -rf "$TMP_DIR"

  exit $PATCH_STATUS
fi

echo
echo "========================================"
echo " CONFERÊNCIA"
echo "========================================"
echo

echo "--- Discernimento ---"

grep -n \
  "MAX_MOVEMENTS\|Limite atingido\|Tentar Novamente\|movements}/{MAX_MOVEMENTS}" \
  "$DISCERNIMENTO_FILE" |
  head -40

echo
echo "--- Menu ---"

grep -n \
  "Limite" \
  "$MENU_FILE" |
  head -20

echo
echo "========================================"
echo " GARANTIAS DE CONFIGURAÇÃO"
echo "========================================"
echo

echo "Discernimento ainda deve continuar com:"
echo "  stacks: 50"
echo "  difficulty: 'muito-dificil'"
echo

grep -n -A9 \
  "id: 'discernimento'" \
  src/features/training/data/trainings.ts

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

  restore_files
  rm -rf "$TMP_DIR"

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
  rm -rf "$TMP_DIR"

  echo "========================================"
  echo " ✅ DISCERNIMENTO FINALIZADO"
  echo "========================================"
  echo
  echo "Regras implementadas:"
  echo
  echo "• máximo de 100 movimentos"
  echo "• resolver no movimento 100 = vitória"
  echo "• movimento 100 sem solução = falha"
  echo "• falha não concede Stacks"
  echo "• contador mostra X/100"
  echo "• botão Tentar Novamente"
  echo "• botão Voltar aos Treinos"
  echo "• Meta passou a se chamar Limite"
  echo
  echo "Preservado:"
  echo "• Discernimento = 50 Stacks"
  echo "• shuffle solucionável"
  echo "• vazio no canto inferior direito"
  echo "• 8 peças + 1 vazio"
  echo
  echo "Teste agora com:"
  echo
  echo "npm run dev"

  exit 0
fi

echo "========================================"
echo " ⚠️ BUILD OU LINT FALHOU"
echo "========================================"
echo
echo "As alterações foram mantidas para diagnóstico."
echo
echo "Backup temporário disponível em:"
echo "$TMP_DIR"
echo
echo "Não faça commit ainda."

exit 1
