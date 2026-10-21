import type { TrainingDefinition } from '../types/training'

export const trainings: TrainingDefinition[] = [
  {
    id: 'impeto',
    name: 'Ímpeto',
    icon: '🔥',
    minigame: 'Quebra de Alvos',
    description:
      'Acerte o momento ideal para aplicar golpes de máximo impacto.',
    stacks: 130,
    difficulty: 'facil',
  },
  {
    id: 'reflexo',
    name: 'Reflexo',
    icon: '🌪️',
    minigame: 'Esquiva Relâmpago',
    description:
      'Desvie continuamente dos projéteis usando movimentação manual.',
    stacks: 200,
    difficulty: 'medio',
  },
  {
    id: 'vigor',
    name: 'Vigor',
    icon: '🛡️',
    minigame: 'Resistência Extrema',
    description:
      'Sobreviva administrando Vida, Energia e diferentes tipos de defesa.',
    stacks: 50,
    difficulty: 'dificil',
  },
  {
    id: 'fluxo',
    name: 'Fluxo',
    icon: '🔮',
    minigame: 'Circuito de Mana',
    description:
      'Mantenha a circulação de mana dentro da faixa de estabilidade.',
    stacks: 80,
    difficulty: 'dificil',
  },
  {
    id: 'moldagem',
    name: 'Moldagem',
    icon: '🧵',
    minigame: 'Construção de Mana',
    description:
      'Arraste nós de mana, encaixe-os nos pontos corretos e construa formas mágicas.',
    stacks: 60,
    difficulty: 'medio',
  },
  {
    id: 'ruptura',
    name: 'Ruptura',
    icon: '💥',
    minigame: 'Artilharia Mágica',
    description:
      'Puxe, mire e lance magias ofensivas para romper alvos com força e precisão.',
    stacks: 100,
    difficulty: 'facil',
  },
  {
    id: 'discernimento',
    name: 'Discernimento',
    icon: '📚',
    minigame: 'Mosaico Arcano',
    description:
      'Reorganize as peças e reconstrua corretamente a imagem.',
    stacks: 50,
    difficulty: 'muito-dificil',
  },
]
