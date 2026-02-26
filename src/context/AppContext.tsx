import React, {
  createContext, useContext, useReducer, useMemo,
  type ReactNode
} from 'react'
import type { AppConfig, PIT38Result, ProgressState } from '../types/pit38'

/**
 * Interfejs definiujący strukturę stanu aplikacji
 *
 * @interface AppState
 * @property {AppConfig} config - Konfiguracja aplikacji, zawierająca ustawienia takie jak rok podatkowy, koszty przeniesione, separator CSV itp.
 * @property {string | null} csvContent - Zawartość wczytanego pliku CSV jako string
 * @property {string | null} csvFilename - Nazwa wczytanego pliku CSV
 * @property {number} rowCount - Liczba wierszy danych w pliku CSV
 * @property {ProgressState} progress - Obiekt reprezentujący aktualny postęp procesu przetwarzania danych
 * @property {PIT38Result | null} result - Wynik obliczeń podatkowych PIT-38 po przetworzeniu danych
 * @property {string | null} errorMsg - Wiadomość błędu, jeśli wystąpił problem podczas wczytywania lub przetwarzania danych
 */
interface AppState {
  config:       AppConfig
  csvContent:   string | null
  csvFilename:  string | null
  rowCount:     number
  progress:     ProgressState
  result:       PIT38Result | null
  errorMsg:     string | null
}

/**
 * Typy akcji, które mogą być dispatchowane do reducera w celu aktualizacji stanu aplikacji
 *
 * @type Action
 * @property {Object} SET_CONFIG - Akcja do aktualizacji konfiguracji aplikacji, przyjmuje częściowy obiekt AppConfig jako payload
 * @property {Object} SET_CSV - Akcja do ustawienia zawartości CSV, nazwy pliku i liczby wierszy, przyjmuje obiekt z tymi danymi jako payload
 * @property {Object} SET_PROGRESS - Akcja do aktualizacji stanu postępu procesu, przyjmuje częściowy obiekt ProgressState jako payload
 * @property {Object} SET_RESULT - Akcja do ustawienia wyniku obliczeń PIT-38, przyjmuje obiekt PIT38Result jako payload
 * @property {Object} SET_ERROR - Akcja do ustawienia wiadomości błędu, przyjmuje string z wiadomością błędu jako payload
 * @property {Object} RESET - Akcja do zresetowania stanu aplikacji do wartości początkowych
 */
export type Action =
  | { type: 'SET_CONFIG';   payload: Partial<AppConfig> }
  | { type: 'SET_CSV';      payload: { content: string; filename: string; rowCount: number } }
  | { type: 'SET_PROGRESS'; payload: Partial<ProgressState> }
  | { type: 'SET_RESULT';   payload: PIT38Result }
  | { type: 'SET_ERROR';    payload: string }
  | { type: 'RESET' }

/**
 * Domyślna konfiguracja aplikacji
 *
 * @property {number} targetYear - Domyślny rok podatkowy ustawiony na poprzedni rok
 * @property {number} carriedCosts - Domyślna wartość kosztów przeniesionych z poprzednich lat ustawiona na 0
 * @property {string} csvSeparator - Domyślny separator kolumn w pliku CSV ustawiony na ';'
 * @property {string} extraStablecoins - Domyślna lista dodatkowych stablecoinów, które mają być traktowane jako neutralne podatkowo, ustawiona na pusty string
 */
const defaultConfig: AppConfig = {
  targetYear:       new Date().getFullYear() - 1,
  carriedCosts:     0,
  csvSeparator:     ';',
  extraStablecoins: '',
}

/**
 * Początkowy stan aplikacji, zawierający domyślną konfigurację oraz wartości null lub 0 dla pozostałych właściwości
 *
 * @constant {AppState} initialState - Obiekt reprezentujący początkowy stan aplikacji
 * @property {AppConfig} config - Ustawiona na defaultConfig, zawierająca domyślne ustawienia aplikacji
 * @property {string | null} csvContent - Początkowo null, oznaczający brak wczytanego pliku CSV
 * @property {string | null} csvFilename - Początkowo null, oznaczający brak nazwy wczytanego pliku CSV
 * @property {number} rowCount - Początkowo 0, oznaczający brak danych w pliku CSV
 * @property {ProgressState} progress - Ustawiony na status 'idle' z innymi właściwościami zainicjowanymi do wartości początkowych
 * @property {PIT38Result | null} result - Początkowo null, oznaczający brak wyniku obliczeń PIT-38
 * @property {string | null} errorMsg - Początkowo null, oznaczający brak błędów
 */
const initialState: AppState = {
  config:      defaultConfig,
  csvContent:  null,
  csvFilename: null,
  rowCount:    0,
  progress:    { status: 'idle', current: 0, total: 0, lastMessage: '', errors: 0 },
  result:      null,
  errorMsg:    null,
}

/**
 * Reducer do zarządzania stanem aplikacji. Przyjmuje aktualny stan i akcję, a następnie zwraca nowy stan w zależności od typu akcji.
 *
 * @param {AppState} state - Aktualny stan aplikacji
 * @param {Action} action - Akcja do przetworzenia, zawierająca typ i opcjonalny payload z danymi do aktualizacji stanu
 * @returns {AppState} Nowy stan aplikacji po zastosowaniu zmian wynikających z akcji
 */
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    //* Aktualizacja konfiguracji aplikacji, łącząc istniejącą konfigurację z nowymi wartościami z payload
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } }
    //* Ustawienie zawartości CSV, nazwy pliku i liczby wierszy, oraz zresetowanie wyniku i błędów
    case 'SET_CSV':
      return {
        ...state,
        csvContent:  action.payload.content,
        csvFilename: action.payload.filename,
        rowCount:    action.payload.rowCount,
        result:      null,
        errorMsg:    null,
        progress:    initialState.progress,
      }
    //* Aktualizacja stanu postępu procesu, łącząc istniejący stan z nowymi wartościami z payload
    case 'SET_PROGRESS':
      return { ...state, progress: { ...state.progress, ...action.payload } }
    //* Ustawienie wyniku obliczeń PIT-38 i zresetowanie błędów, oraz ustawienie statusu postępu na 'done'
    case 'SET_RESULT':
      return {
        ...state,
        result:   action.payload,
        errorMsg: null,
        progress: { ...state.progress, status: 'done' },
      }
    //* Ustawienie wiadomości błędu, zresetowanie wyniku i ustawienie statusu postępu na 'error'
    case 'SET_ERROR':
      return {
        ...state,
        errorMsg: action.payload,
        progress: { ...state.progress, status: 'error', lastMessage: action.payload },
      }
    //* Resetowanie stanu aplikacji do wartości początkowych, ale zachowując konfigurację
    case 'RESET':
      return { ...initialState, config: state.config }
    //* Jeśli typ akcji jest nieznany, zwróć aktualny stan bez zmian
    default:
      return state
  }
}

/**
 * Interfejs definiujący wartość kontekstu aplikacji, zawierający aktualny stan i funkcję dispatch do aktualizacji stanu
 *
 * @interface AppContextValue
 * @property {AppState} state - Aktualny stan aplikacji, zawierający konfigurację, dane CSV, postęp procesu, wynik obliczeń i ewentualne błędy
 * @property {React.Dispatch<Action>} dispatch - Funkcja do dispatchowania akcji do reducera w celu aktualizacji stanu aplikacji
 */
interface AppContextValue {
  state:    AppState
  dispatch: React.Dispatch<Action>
}

/**
 * Kontekst aplikacji, który będzie używany do udostępniania stanu i funkcji dispatch w całej aplikacji. Początkowo ustawiony na null, a jego wartość będzie dostarczana przez AppProvider.
 */
const AppContext = createContext<AppContextValue | null>(null)

/**
 * Provider kontekstu aplikacji, który zarządza stanem aplikacji za pomocą useReducer i udostępnia go wszystkim komponentom potomnym. Obejmuje logikę aktualizacji stanu w odpowiedzi na różne akcje, takie jak ustawienie konfiguracji, wczytanie CSV, aktualizacja postępu procesu, ustawienie wyniku obliczeń i obsługa błędów.
 *
 * @param {Object} props - Właściwości przekazywane do komponentu, zawierające dzieci (komponenty potomne)
 * @param {ReactNode} props.children - Komponenty potomne, które będą miały dostęp do kontekstu aplikacji
 * @returns {JSX.Element} Element JSX reprezentujący provider kontekstu aplikacji, który otacza dzieci i udostępnia im stan i funkcję dispatch
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  //* Żeby mi nie rzucało rerenderami
  const value = useMemo(() => ({ state, dispatch }), [state])
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

/**
 * Hook do korzystania z kontekstu aplikacji, który zapewnia dostęp do stanu i funkcji dispatch. Musi być używany wewnątrz komponentu potomnego AppProvider, w przeciwnym razie rzuci błąd.
 *
 * @returns {AppContextValue} Obiekt zawierający aktualny stan aplikacji i funkcję dispatch do aktualizacji stanu
 * @throws {Error} Jeśli hook jest używany poza komponentem AppProvider, zostanie rzucony błąd informujący o konieczności użycia wewnątrz AppProvider
 */
export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext musi być użyty wewnątrz <AppProvider>')
  return ctx
}
