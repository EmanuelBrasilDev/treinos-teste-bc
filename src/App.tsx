import { TrainingMenu } from './features/training/components/TrainingMenu'
import { useTrainingStore } from './features/training/store/useTrainingStore'
import { ImpetoTraining } from './games/impeto/ImpetoTraining'

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

  return <TrainingMenu />
}
