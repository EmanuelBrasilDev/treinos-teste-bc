export type TrainingAttribute =
  | 'impeto'
  | 'reflexo'
  | 'vigor'
  | 'fluxo'
  | 'moldagem'
  | 'ruptura'
  | 'discernimento'

export type TrainingDifficulty =
  | 'facil'
  | 'medio'
  | 'dificil'
  | 'muito-dificil'

export interface TrainingDefinition {
  id: TrainingAttribute
  name: string
  icon: string
  minigame: string
  description: string
  stacks: number
  difficulty: TrainingDifficulty
}
