import { create } from 'zustand'
import type { TrainingAttribute } from '../types/training'

type TrainingScreen =
  | 'menu'
  | 'training'

interface TrainingState {
  screen: TrainingScreen

  selectedTraining: TrainingAttribute | null

  currentStacks: number
  targetStacks: number

  selectTraining: (
    training: TrainingAttribute,
    stacks: number
  ) => void

  startTraining: () => void

  addStack: (amount?: number) => void

  resetProgress: () => void

  returnToMenu: () => void
}

export const useTrainingStore = create<TrainingState>((set) => ({
  screen: 'menu',

  selectedTraining: null,

  currentStacks: 0,
  targetStacks: 0,

  selectTraining: (training, stacks) =>
    set({
      selectedTraining: training,
      targetStacks: stacks,
      currentStacks: 0,
    }),

  startTraining: () =>
    set({
      screen: 'training',
      currentStacks: 0,
    }),

  addStack: (amount = 1) =>
    set((state) => ({
      currentStacks: Math.min(
        state.currentStacks + amount,
        state.targetStacks
      ),
    })),

  resetProgress: () =>
    set({
      currentStacks: 0,
    }),

  returnToMenu: () =>
    set({
      screen: 'menu',
      currentStacks: 0,
    }),
}))
