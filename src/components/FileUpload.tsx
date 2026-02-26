import { useCallback, useRef } from 'react'
import { Upload, CheckCircle, XCircle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { usePIT38 } from '../hooks/usePIT38'

export function FileUpload() {
  //* Pobranie stanu i dispatchera z kontekstu aplikacji
  const { state, dispatch } = useAppContext()
  const { loadCSV, runProcessing } = usePIT38()
  const inputRef = useRef<HTMLInputElement>(null)
  //* Stan wyprowadzony bezpośrednio z kontekstu
  const hasFile = state.csvContent !== null && state.csvContent.length > 0
  const isProcessing = state.progress.status === 'processing'
  const isDone = state.progress.status === 'done'
  //* Funkcja do obsługi wczytywania pliku, sprawdzająca rozszerzenie i wywołująca loadCSV
  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      dispatch({ type: 'SET_ERROR', payload: 'Plik musi być w formacie .csv' })
      return
    }
    loadCSV(file)
  }, [loadCSV, dispatch])
  //* Funkcje obsługi zdarzeń dla inputa, przeciągania i upuszczania pliku, oraz resetowania stanu
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    //* Reset inputa żeby można było wgrać ten sam plik ponownie
    e.target.value = ''
  }
  //* Obsługa przeciągania i upuszczania pliku na strefę drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  //* Funkcja do resetowania stanu aplikacji i czyszczenia inputa, pozwalająca na wgranie nowego pliku od zera
  const onReset = () => {
    dispatch({ type: 'RESET' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Plik CSV z Binance
      </h2>
      {!hasFile && (
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed
            border-neutral-700 hover:border-purple-500 bg-neutral-800/40 hover:bg-blue-900/10
            rounded-xl p-10 cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onInputChange}
          />
          <Upload className="w-10 h-10 text-slate-500" />
          <div className="text-center">
            <p className="text-slate-300 font-medium">Przeciągnij plik CSV lub kliknij</p>
            <p className="text-slate-500 text-sm mt-1">
              Pobierz z{" "}
              <a
                href="https://www.binance.com/pl/my/download-center"
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                Binance Download Center
              </a>
              {" "}"Generate all statements"
            </p>
          </div>
        </div>
      )}
      {hasFile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 font-medium text-sm truncate">
                {state.csvFilename}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {state.rowCount.toLocaleString('pl-PL')} wierszy · rok {state.config.targetYear} · konto Spot
              </p>
            </div>
            <button
              onClick={onReset}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
              title="Usuń plik i zacznij od nowa"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="btn-primary flex-1 justify-center py-3"
              onClick={runProcessing}
              disabled={isProcessing || isDone}
            >
              {isProcessing
                ? '⏳ Przetwarzanie...'
                : isDone
                ? '✅ Obliczone'
                : 'Oblicz PIT-38'}
            </button>
            {!isProcessing && (
              <button
                className="btn-ghost"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Zmień plik
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onInputChange}
          />

        </div>
      )}
      {isProcessing && state.progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{state.progress.lastMessage}</span>
            <span className="tabular-nums font-mono">
              {state.progress.current}/{state.progress.total}
              {" "}({Math.round(state.progress.current / state.progress.total * 100)}%)
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${Math.round(state.progress.current / state.progress.total * 100)}%` }}
            />
          </div>
        </div>
      )}

    </div>
  )
}
