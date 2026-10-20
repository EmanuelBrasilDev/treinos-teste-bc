import { TrainingMenu } from './features/training/components/TrainingMenu'
import { useTrainingStore } from './features/training/store/useTrainingStore'

import { ImpetoTraining } from './games/impeto/ImpetoTraining'
import { FluxoTraining } from './games/fluxo/FluxoTraining'
import { MoldagemTraining } from './games/moldagem/MoldagemTraining'
import { ReflexoTraining } from './games/reflexo/ReflexoTraining'
import { VigorTraining } from './games/vigor/VigorTraining'

import { RupturaTraining } from './games/ruptura/RupturaTraining'

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


  return <TrainingMenu />
}
