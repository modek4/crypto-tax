import { AlertTriangle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

export function WarningBanner() {
  const { state: { result, errorMsg } } = useAppContext()
  //* Jeśli jest błąd krytyczny, pokazujemy go w czerwonym bannerze
  if (errorMsg) {
    return (
      <div className='flex items-start gap-3 dark:bg-red-900/30 bg-red-600/30 border dark:border-red-700/50 border-red-700 rounded-xl p-4'>
        <AlertTriangle className='w-5 h-5 dark:text-red-400 text-red-700 shrink-0 mt-0.5' />
        <div>
          <p className='dark:text-red-300 text-red-600 font-medium text-sm'>Błąd krytyczny</p>
          <p className='dark:text-red-400 text-red-700 text-sm mt-0.5'>{errorMsg}</p>
        </div>
      </div>
    )
  }
  //* Jeśli nie ma błędu, ale są ostrzeżenia lub ważne informacje, pokazujemy je w bannerze
  if (!result) return null
  const msgs: string[] = []
  //* Dodajemy różne ostrzeżenia na podstawie wyników analizy
  if (result.nonSpotAccounts.length > 0)
    msgs.push(`Wykryto konta: ${result.nonSpotAccounts.join(', ')} — Futures/Margin wymagają osobnej analizy prawnej!`)
  if (result.warnings.length > 0)
    msgs.push(`${result.warnings.length} transakcji wymaga ręcznej weryfikacji — sprawdź arkusz WERYFIKACJA_RĘCZNA w pliku Excel.`)
  if (result.surplusToCosts > 0)
    msgs.push(`Nadwyżka kosztów ${result.surplusToCosts.toFixed(2)} PLN wpisz jako "Koszty przeniesione" w rozliczeniu za rok następny (art. 22 ust. 16 updof).`)
  if (msgs.length === 0) return null
  return (
    <div className='space-y-2'>
      {msgs.map((msg, i) => (
        <div key={i} className='flex items-start gap-3 dark:bg-amber-900/25 bg-amber-500/25 border dark:border-amber-700/40 border-amber-600/40 rounded-xl p-4'>
          <AlertTriangle className='w-4 h-4 dark:text-amber-400 text-amber-600 shrink-0 mt-0.5' />
          <p className='dark:text-amber-300 text-amber-700 text-sm'>{msg}</p>
        </div>
      ))}
    </div>
  )
}
