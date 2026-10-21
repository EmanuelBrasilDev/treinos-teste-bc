export type PuzzleCell = number | null
export type PuzzleState = PuzzleCell[]

const BOARD_SIZE = 3
const TILE_COUNT = 8

export const createSolvedPuzzle = (): PuzzleState => [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  null,
]

export const getAdjacentIndices = (
  index: number
): number[] => {
  const row = Math.floor(index / BOARD_SIZE)
  const column = index % BOARD_SIZE
  const adjacent: number[] = []

  if (row > 0) adjacent.push(index - BOARD_SIZE)
  if (row < BOARD_SIZE - 1) adjacent.push(index + BOARD_SIZE)
  if (column > 0) adjacent.push(index - 1)
  if (column < BOARD_SIZE - 1) adjacent.push(index + 1)

  return adjacent
}

export const isPuzzleSolved = (
  puzzle: PuzzleState
) =>
  puzzle.length === TILE_COUNT + 1 &&
  puzzle.every((tile, index) =>
    index === TILE_COUNT
      ? tile === null
      : tile === index
  )

export const countCorrectTiles = (
  puzzle: PuzzleState
) =>
  puzzle.reduce<number>(
    (total, tile, index) =>
      tile !== null && tile === index
        ? total + 1
        : total,
    0
  )

export const getMovableTileIndices = (
  puzzle: PuzzleState
) => {
  const blankIndex = puzzle.indexOf(null)

  return blankIndex < 0
    ? []
    : getAdjacentIndices(blankIndex)
}

export const moveTile = (
  puzzle: PuzzleState,
  tileIndex: number
): PuzzleState | null => {
  const blankIndex = puzzle.indexOf(null)

  if (
    puzzle[tileIndex] === null ||
    !getAdjacentIndices(blankIndex).includes(tileIndex)
  ) {
    return null
  }

  const nextPuzzle = [...puzzle]

  nextPuzzle[blankIndex] = nextPuzzle[tileIndex]
  nextPuzzle[tileIndex] = null

  return nextPuzzle
}

export const createShuffledPuzzle = (
  random: () => number = Math.random
): PuzzleState => {
  while (true) {
    let puzzle = createSolvedPuzzle()
    let blankIndex = TILE_COUNT
    let previousBlankIndex: number | null = null

    const minimumMoves =
      80 + Math.floor(random() * 41)

    for (let move = 1; move <= 120; move += 1) {
      const adjacent = getAdjacentIndices(blankIndex)
      const withoutImmediateUndo = adjacent.filter(
        (index) => index !== previousBlankIndex
      )
      const candidates =
        withoutImmediateUndo.length > 0
          ? withoutImmediateUndo
          : adjacent
      const tileIndex =
        candidates[
          Math.floor(random() * candidates.length)
        ]

      puzzle = [...puzzle]
      puzzle[blankIndex] = puzzle[tileIndex]
      puzzle[tileIndex] = null

      previousBlankIndex = blankIndex
      blankIndex = tileIndex

      if (
        move >= minimumMoves &&
        blankIndex === TILE_COUNT &&
        countCorrectTiles(puzzle) <= 2 &&
        !isPuzzleSolved(puzzle)
      ) {
        return puzzle
      }
    }
  }
}
