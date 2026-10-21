import {
  lazy,
  Suspense,
} from 'react'

import { TrainingMenu } from './features/training/components/TrainingMenu'
import { useTrainingStore } from './features/training/store/useTrainingStore'

import { ImpetoTraining } from './games/impeto/ImpetoTraining'
import { FluxoTraining } from './games/fluxo/FluxoTraining'
import { MoldagemTraining } from './games/moldagem/MoldagemTraining'
import { ReflexoTraining } from './games/reflexo/ReflexoTraining'
import { VigorTraining } from './games/vigor/VigorTraining'

import { RupturaTraining } from './games/ruptura/RupturaTraining'

const DiscernimentoTraining = lazy(() =>
  import(
    './games/discernimento/DiscernimentoTraining'
  ).then((module) => ({
    default: module.DiscernimentoTraining,
  }))
)

export default function App() {
  const {
    screen,
    selectedTraining,
  } = useTrainingStore()

  if (
    screen === 'training' &&
    selectedTraining === 'impeto'
  ) {
    return <ImpetoTraining />
  }

  if (
    screen === 'training' &&
    selectedTraining === 'reflexo'
  ) {
    return <ReflexoTraining />
  }

  if (
    screen === 'training' &&
    selectedTraining === 'fluxo'
  ) {
    return <FluxoTraining />
  }

  if (
    screen === 'training' &&
    selectedTraining === 'moldagem'
  ) {
    return <MoldagemTraining />
  }

  if (
    screen === 'training' &&
    selectedTraining === 'vigor'
  ) {
    return <VigorTraining />
  }

  if (

    screen === 'training' &&

    selectedTraining === 'ruptura'

  ) {

    return <RupturaTraining />

  }
  if (
    screen === 'training' &&
    selectedTraining === 'discernimento'
  ) {
    return (
      <Suspense
        fallback={
          <main className="min-h-[100dvh] bg-[#070b13]" />
        }
      >
        <DiscernimentoTraining />
      </Suspense>
    )
  }

  return <TrainingMenu />
}
