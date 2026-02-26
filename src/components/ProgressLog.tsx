import { useAppContext } from '../context/AppContext'

//* Fallback jakby co
export function ProgressLog() {
  const { state: { progress, errorMsg } } = useAppContext()
  if (progress.status === 'idle' || progress.status === 'done') return null
  if (errorMsg) return null
  return null
}
