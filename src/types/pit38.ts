export type TransactionCategory =
  | 'revenue'    // Przychód ze sprzedaży (Pole 34)
  | 'income'     // Przychód z Earn/Staking (Pole 34)
  | 'cost'       // Koszt nabycia / prowizja (Pole 35)
  | 'warning'    // Wymaga ręcznej weryfikacji
  | 'ignored'    // Neutralne podatkowo

/**
 * Surowy format danych transakcji, bez dodatkowych obliczeń czy przypisań, bezpośrednio odczytany z pliku CSV.
 *
 * @interface RawRow
 * @property {string} UTC_Time - Data i czas transakcji w formacie UTC (np. "2000-01-01 10:10:10")
 * @property {string} Operation - Opis operacji (np. "Buy", "Sell", "Earn")
 * @property {string} Coin - Nazwa kryptowaluty (np. "BTC", "ETH")
 * @property {string} Change - Zmiana ilości (np. "-0.5", "+1.0")
 * @property {string} Account - Nazwa konta lub portfela, z którego pochodzi transakcja
 * @property {string} [Remark] - Dodatkowy komentarz lub uwaga (opcjonalnie)
 */
export interface RawRow {
  UTC_Time: string
  Operation: string
  Coin: string
  Change: string
  Account: string
  Remark?: string
}

/**
 * Znormalizowany format danych transakcji po przetworzeniu, zawierający wszystkie niezbędne informacje do dalszej analizy i generowania raportu PIT-38.
 *
 * @interface ProcessedRow
 * @property {string} operationDate - Data i czas transakcji w formacie "YYYY-MM-DD HH:MM:SS"
 * @property {string} operationName - Opis operacji (np. "Buy", "Sell", "Earn")
 * @property {string} coinName - Nazwa kryptowaluty (np. "BTC", "ETH")
 * @property {number} coinAmount - Ilość jednostek kryptowaluty
 * @property {string} account - Nazwa konta lub portfela, z którego pochodzi transakcja
 * @property {number} pricePLN - Wartość transakcji przeliczona na PLN
 * @property {number} [shareNBP] - Kurs NBP dla danej daty (jeśli dostępny)
 * @property {number} [priceUSD] - Cena w USD dla danej daty (jeśli dostępna)
 * @property {string} [legalBasis] - Podstawa prawna przypisana do transakcji (np. "art. 22 ust. 14 updof")
 * @property {string} [additionalWarning] - Dodatkowe ostrzeżenie lub informacja dotycząca transakcji
 * @property {string} [additionalReason] - Powód ignorowania transakcji lub informacja o błędzie (jeśli dotyczy)
 * @property {TransactionCategory} category - Kategoria transakcji (np. 'revenue', 'cost', 'warning')
 * @property {string} extendedCategory - Kategoria transakcji z opisem (np. "KOSZT NABYCIA — Buy")
 */
export interface ProcessedRow {
  operationDate: string
  operationName: string
  coinName: string
  coinAmount: number
  account: string
  pricePLN: number
  shareNBP?: number
  priceUSD?: number
  legalBasis?: string
  additionalWarning?: string
  additionalReason?: string
  category: TransactionCategory
  extendedCategory: string
}

/**
 * Konfiguracja aplikacji, zawierająca ustawienia wpływające na przetwarzanie danych i generowanie raportu PIT-38.
 *
 * @interface AppConfig
 * @property {number} targetYear - Rok podatkowy, dla którego generowany jest raport
 * @property {number} carriedCosts - Kwota kosztów przeniesionych z lat poprzednich (art. 22 ust. 16 updof)
 * @property {string} csvSeparator - Separator używany w pliku CSV (np. ",", ";", "\t")
 * @property {string} extraStablecoins - Lista dodatkowych stablecoinów do uwzględnienia, oddzielonych przecinkami (np. "EURC,USDD")
 */
export interface AppConfig {
  targetYear: number
  carriedCosts: number
  csvSeparator: string
  extraStablecoins: string
}

/**
 * Wynik obliczenia podatku PIT-38 dla roku podatkowego.
 *
 * @interface PIT38Result
 * @property {number} totalRevenueSale - Całkowity przychód ze sprzedaży
 * @property {number} totalRevenueEarn - Całkowity przychód ze stakingu/earn
 * @property {number} totalRevenue - Suma przychodów (Pole 34)
 * @property {number} totalCostsCurrent - Koszty bieżące
 * @property {number} totalCostsCarried - Koszty przeniesione
 * @property {number} totalCosts - Suma kosztów (Pole 35)
 * @property {number} income - Dochód netto
 * @property {number} surplusToCosts - Nadwyżka kosztów do przeniesienia na rok następny
 * @property {number} basePLN - Podstawa opodatkowania zaokrąglona do pełnych PLN
 * @property {number} taxPLN - Podatek dochodowy (19%)
 * @property {ProcessedRow[]} revenues - Lista przychodów ze sprzedaży
 * @property {ProcessedRow[]} incomes - Lista dochodów ze stakingu/earn
 * @property {ProcessedRow[]} costs - Lista kosztów
 * @property {ProcessedRow[]} warnings - Lista ostrzeżeń
 * @property {ProcessedRow[]} ignored - Lista ignorowanych pozycji
 * @property {string[]} nonSpotAccounts - Lista kont niespotowych
 */
export interface PIT38Result {
  totalRevenueSale: number
  totalRevenueEarn: number
  totalRevenue: number
  totalCostsCurrent: number
  totalCostsCarried: number
  totalCosts: number
  income: number
  surplusToCosts: number
  basePLN: number
  taxPLN: number
  revenues: ProcessedRow[]
  incomes: ProcessedRow[]
  costs: ProcessedRow[]
  warnings: ProcessedRow[]
  ignored: ProcessedRow[]
  nonSpotAccounts: string[]
}

export type ProcessingStatus =
  | 'idle'          // Brak aktywności
  | 'loading_nbp'   // Pobieranie kursów NBP
  | 'processing'    // Przetwarzanie danych i obliczanie wyników
  | 'done'          // Przetwarzanie zakończone
  | 'error'         // Wystąpił błąd podczas przetwarzania

/**
 * Stan postępu procesu przetwarzania danych PIT-38, używany do aktualizacji interfejsu użytkownika i informowania o bieżącym statusie.
 *
 * @interface ProgressState
 * @property {ProcessingStatus} status - Aktualny status procesu (np. 'idle', 'loading_nbp', 'processing', 'done', 'error')
 * @property {number} current - Liczba aktualnie przetworzonych elementów
 * @property {number} total - Całkowita liczba elementów do przetworzenia
 * @property {string} lastMessage - Ostatnia wiadomość lub informacja o postępie
 * @property {number} errors - Liczba napotkanych błędów podczas procesu
 */
export interface ProgressState {
  status: ProcessingStatus
  current: number
  total: number
  lastMessage: string
  errors: number
}
