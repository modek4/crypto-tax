import { useCallback } from 'react'
import { useAppContext } from '../context/AppContext'
import { parseCSV } from '../lib/csvParser'
import { processTransactions } from '../lib/processor'
import { exportToExcel } from '../lib/excelExport'

/**
 * Hook do obsługi logiki związanej z PIT-38
 *
 * @returns {Object} - Obiekt zawierający funkcje
 * @property {Function} loadCSV - Funkcja do wczytywania pliku CSV
 * @property {Function} runProcessing - Funkcja do uruchamiania procesu przetwarzania danych
 * @property {Function} downloadExcel - Funkcja do pobierania wygenerowanego pliku Excel
 */
export function usePIT38() {
  //* Pobranie stanu i dispatchera z kontekstu aplikacji
  const { state, dispatch } = useAppContext()
  //* Funkcja do wczytywania pliku CSV, parsowania jego zawartości i aktualizacji stanu aplikacji
  const loadCSV = useCallback((file: File) => {
    const reader = new FileReader()
    //* Obsługa zdarzenia zakończenia odczytu pliku
    reader.onload = e => {
      try {
        const raw = e.target?.result
        if (typeof raw !== 'string') {
          dispatch({ type: 'SET_ERROR', payload: 'Nie udało się odczytać pliku jako tekst.' })
          return
        }
        //* Usuń BOM
        const content = raw.replace(/^\uFEFF/, '')
        //* Podziel na linie i usuń puste
        const { rows, missingColumns, detectedSep } = parseCSV(content)
        //* Jeśli brakuje wymaganych kolumn, zaktualizuj stan błędu z informacją o brakujących kolumnach
        if (missingColumns.length > 0) {
          dispatch({
            type: 'SET_ERROR',
            payload:
              `Brakujące kolumny w CSV: ${missingColumns.join(', ')}. ` +
              `Pobierz plik przez "Generate all statements" w Binance Download Center. ` +
              `Wykryte kolumny: ${content.split(/\r?\n/)[0].slice(0, 120)}`,
          })
          return
        }
        //* Jeśli plik jest pusty lub nie zawiera danych, zaktualizuj stan błędu z informacją o pustym pliku
        if (rows.length === 0) {
          dispatch({
            type: 'SET_ERROR',
            payload:
              `Plik CSV jest pusty lub nie zawiera żadnych danych. ` +
              `Wykryty separator: "${detectedSep}". ` +
              `Sprawdź ustawienie CSV_SEPARATOR w konfiguracji.`,
          })
          return
        }
        //* Zaktualizuj stan aplikacji z zawartością CSV, nazwą pliku i liczbą wierszy
        dispatch({
          type: 'SET_CSV',
          payload: { content, filename: file.name, rowCount: rows.length },
        })
        //* Dev info o wczytanym pliku, liczbie wierszy i wykrytym separatorze
        console.info(`[PIT38] Załadowano: ${file.name}, wierszy: ${rows.length}, sep: "${detectedSep}"`)
      } catch (err) {
        //* Loguj błąd do konsoli i zaktualizuj stan błędu z informacją o błędzie parsowania
        console.error('[PIT38] Błąd parsowania CSV:', err)
        dispatch({
          type: 'SET_ERROR',
          payload: `Błąd parsowania pliku: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }
    //* Obsługa zdarzenia błędu odczytu pliku
    reader.onerror = () => {
      dispatch({ type: 'SET_ERROR', payload: 'Nie można otworzyć pliku. Sprawdź uprawnienia.' })
    }
    //* Próbuj odczytać plik jako UTF-8, a jeśli wystąpi błąd, spróbuj ponownie jako latin1
    reader.readAsText(file, 'utf-8')
  }, [dispatch])
  //* Funkcja do uruchamiania procesu przetwarzania danych z CSV, aktualizująca postęp i obsługująca błędy
  const runProcessing = useCallback(async () => {
    //* Jeśli nie ma zawartości CSV, ostrzeżenie i zakończ funkcję
    if (!state.csvContent) {
      console.warn('[PIT38] runProcessing wywołane bez csvContent')
      return
    }
    //* Zainicjuj stan postępu na "processing" z aktualizacją o rozpoczęciu parsowania CSV
    dispatch({
      type: 'SET_PROGRESS',
      payload: { status: 'processing', current: 0, total: 0, lastMessage: 'Parsowanie CSV...', errors: 0 },
    })
    try {
      //* Parsuj zawartość CSV
      const { rows } = parseCSV(state.csvContent)
      //* Przetwarzaj transakcje
      const result = await processTransactions(
        rows,
        state.config,
        (current, total, msg) => {
          dispatch({ type: 'SET_PROGRESS', payload: { status: 'processing', current, total, lastMessage: msg } })
        }
      )
      //* Zaktualizuj stan aplikacji
      dispatch({ type: 'SET_RESULT', payload: result })
    } catch (err) {
      //* Loguj błąd do konsoli i zaktualizuj stan błędu z informacją o błędzie przetwarzania
      console.error('[PIT38] Błąd przetwarzania:', err)
      dispatch({
        type: 'SET_ERROR',
        payload: `Błąd przetwarzania: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }, [state.csvContent, state.config, dispatch])
  //* Funkcja do pobierania wygenerowanego pliku Excel z wynikami przetwarzania
  const downloadExcel = useCallback(() => {
    if (!state.result) return
    exportToExcel(state.result, state.config)
  }, [state.result, state.config])

  return { loadCSV, runProcessing, downloadExcel }
}
