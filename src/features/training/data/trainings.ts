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
      'Reaja rapidamente aos ataques e ameaças da arena.',
    stacks: 70,
    difficulty: 'dificil',
  },
  {
    id: 'vigor',
    name: 'Vigor',
    icon: '🛡️',
    minigame: 'Resistência Extrema',
    description:
      'Administre esforço e resistência enquanto enfrenta obstáculos.',
    stacks: 120,
    difficulty: 'facil',
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
    minigame: 'Traçado Mágico',
    description:
      'Reproduza formas mágicas com precisão e controle.',
    stacks: 60,
    difficulty: 'dificil',
  },
  {
    id: 'ruptura',
    name: 'Ruptura',
    icon: '💥',
    minigame: 'Destruição Máxima',
    description:
      'Encontre os pontos vulneráveis e destrua o alvo.',
    stacks: 100,
    difficulty: 'medio',
  },
  {
    id: 'discernimento',
    name: 'Discernimento',
    icon: '📚',
    minigame: 'Análise de Combate',
    description:
      'Analise situações e escolha rapidamente a melhor decisão.',
    stacks: 50,
    difficulty: 'muito-dificil',
  },
]
