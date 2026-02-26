import type { RawRow, ProcessedRow, AppConfig, PIT38Result } from '../types/pit38'
import { DEFAULT_STABLECOINS } from '../constants/operations'
import {
  isFiat, isStablecoin,
  isTradeOp, isFeeOp, isTaxableIncomeOp, isTechnicalOp, isDustOp,
  classifyOp, whichPatternMatched,
  TRADE_PATTERNS, TAXABLE_INCOME_PATTERNS, TECHNICAL_PATTERNS,
} from './matcher'
import { getNBPRate } from './nbp'
import { getCryptoPriceUSD } from './binancePrice'
import { parseDate } from './csvParser'

/**
 * Zaokrąglenie wartości do pełnych PLN zgodnie z art. 30b ustawy o podatku dochodowym od osób fizycznych. Wszystkie wartości w PLN w raporcie PIT-38 są zaokrąglane do pełnych złotych, a wszelkie grosze są pomijane (nie są zaokrąglane w górę).
 *
 * @param {number} val - Wartość w PLN do zaokrąglenia
 * @return {number} Wartość zaokrąglona do pełnych PLN
 */
function roundPLN(val: number): number {
  return Math.round(val)
}

/**
 * Zaokrąglenie do 6 miejsc po przecinku, przydatne do wyceny prowizji i kosztów w PLN.
 *
 * @param {number} val - Kwota do zaokrąglenia
 * @return {number} Zaokrąglona kwota do 6 miejsc po przecinku
 */
function round6(val: number): number {
  return Math.round(val * 1_000_000) / 1_000_000
}

/**
 * Typ postępującej funkcji callback do raportowania postępu przetwarzania transakcji.
 *
 * @callback ProgressCallback
 */
export type ProgressCallback = (current: number, total: number, msg: string) => void

/**
 * Główna funkcja przetwarzająca surowe dane transakcji i generująca wynik PIT-38.
 *
 * @param {RawRow[]} rows - Surowe dane transakcji z pliku CSV
 * @param {AppConfig} config - Konfiguracja aplikacji wpływająca na przetwarzanie danych
 * @param {ProgressCallback} onProgress - Callback do raportowania postępu przetwarzania
 * @return {Promise<PIT38Result>} Obiekt zawierający obliczone wartości podatkowe i kategoryzację transakcji
 */
export async function processTransactions(
  rows: RawRow[],
  config: AppConfig,
  onProgress: ProgressCallback
): Promise<PIT38Result> {
  //* Zbiór stablecoinów (domyślne + user-defined)
  const extraStablecoins = new Set([
    ...DEFAULT_STABLECOINS,
    ...config.extraStablecoins
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean),
  ])
  //* Filtrujemy rok i konto Spot, sortujemy chronologicznie (FIFO)
  const spotRows = rows
    .filter(r => {
      try {
        const dt = parseDate(r.UTC_Time)
        return (
          dt.getUTCFullYear() === config.targetYear &&
          r.Account.trim().toLowerCase() === 'spot'
        )
      } catch { return false }
    })
    .sort((a, b) => {
      try {
        return parseDate(a.UTC_Time).getTime() - parseDate(b.UTC_Time).getTime()
      } catch { return 0 }
    })
  //* Wykryj konta non-Spot
  const allAccounts = [...new Set(rows.map(r => r.Account.trim()))]
  const nonSpotAccounts = allAccounts.filter(a => a.toLowerCase() !== 'spot' && a !== '')
  //* Inicjujemy tablice wynikowe i zmienne pomocnicze do obliczeń
  const revenues: ProcessedRow[] = []
  const incomes: ProcessedRow[] = []
  const costs: ProcessedRow[] = []
  const warnings: ProcessedRow[] = []
  const ignored: ProcessedRow[] = []

  const total = spotRows.length
  for (let i = 0; i < total; i++) {
    //* Aktualny wiersz
    const row = spotRows[i]
    //* Postęp do raportowania
    onProgress(i + 1, total, `${row.Operation} — ${row.Coin}`)
    //* Throttle 1 tick co 10 rekordów żeby UI mógł się odświeżyć
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
    //* Parsowanie daty i wartości
    let dt: Date
    let changeVal: number
    try {
      dt = parseDate(row.UTC_Time)
      changeVal = parseFloat(row.Change.replace(',', '.'))
      if (isNaN(changeVal)) throw new Error('Nieprawidłowa wartość Change')
    } catch (e) {
      warnings.push(makeWarning(row, `Błąd parsowania wiersza: ${e}`))
      continue
    }
    //* Normalizacja nazwy monety i operacji
    const coinName = row.Coin.toUpperCase().trim()
    const extendedCategory = row.Operation.trim()
    const amount = Math.abs(changeVal)
    const isInflow = changeVal > 0
    const isOut = changeVal < 0
    const _isFiat = isFiat(coinName)
    const _isStable = isStablecoin(coinName, extraStablecoins)
    //* Podstawowy obiekt z danymi transakcji
    const base: Omit<ProcessedRow, 'pricePLN' | 'category' | 'extendedCategory'> = {
      operationDate: formatDt(dt),
      operationName: extendedCategory,
      coinName: coinName,
      coinAmount: changeVal,
      account: row.Account,
    }
    try {
      //! ──────────────────────────────────────────────────────────
      //* Operacje handlowe (Buy/Sell/Convert/P2P)
      //* TRADE_PATTERNS
      //! ──────────────────────────────────────────────────────────
      if (isTradeOp(extendedCategory)) {
        const matchedBy = whichPatternMatched(extendedCategory, TRADE_PATTERNS) ?? ''
        if (_isFiat && isOut) {
          //* KOSZT NABYCIA (wydajemy fiat, kupujemy krypto)
          const rate = await getNBPRate(coinName, dt)
          costs.push({
            ...base, pricePLN: round6(amount * rate), shareNBP: rate,
            category: 'cost',
            extendedCategory: `KOSZT NABYCIA — ${extendedCategory}`,
            legalBasis: 'art. 22 ust. 14 updof',
            additionalWarning: `Wzorzec: ${matchedBy}`,
          })

        } else if (_isFiat && isInflow) {
          //* PRZYCHÓD ZE SPRZEDAŻY (dostajemy fiat za krypto)
          const rate = await getNBPRate(coinName, dt)
          revenues.push({
            ...base, pricePLN: round6(amount * rate), shareNBP: rate,
            category: 'revenue',
            extendedCategory: `PRZYCHÓD ZE SPRZEDAŻY — ${extendedCategory}`,
            legalBasis: 'art. 17 ust. 1f updof',
            additionalWarning: `Wzorzec: ${matchedBy}`,
          })

        } else if (!_isFiat) {
          //* Krypto na Krypto lub Krypto na Stablecoin (neutralne)
          const reason = _isStable
            ? 'Wymiana Krypto na Stablecoin (neutralna, stanowisko KIS 2024/2025)'
            : 'Wymiana Krypto na Krypto (neutralna, art. 17 ust. 1f updof)'
          ignored.push({ ...base, pricePLN: 0, category: 'ignored', extendedCategory: reason })
        }
        continue
      }
      //! ──────────────────────────────────────────────────────────
      //* Prowizje transakcyjne (Fee) na koszt (art. 22 ust. 14)
      //* FEE_PATTERNS
      //! ──────────────────────────────────────────────────────────
      if (isFeeOp(extendedCategory)) {
        if (_isFiat) {
          //* Prowizja w FIAT wyceniamy bezpośrednio po kursie NBP
          const rate = await getNBPRate(coinName, dt)
          costs.push({
            ...base, pricePLN: round6(amount * rate), shareNBP: rate,
            category: 'cost',
            extendedCategory: `PROWIZJA (${coinName})`,
            legalBasis: 'art. 22 ust. 14 updof',
          })
        } else {
          //* Prowizja w Krypto wyceń na USD, potem na PLN (jeśli możliwe)
          const usdPrice = await getCryptoPriceUSD(coinName, dt)
          if (usdPrice !== null) {
            const usdRate = await getNBPRate('USD', dt)
            costs.push({
              ...base,
              pricePLN: round6(amount * usdPrice * usdRate),
              shareNBP: usdRate,
              priceUSD: usdPrice,
              category: 'cost',
              extendedCategory: `PROWIZJA KRYPTO (${coinName}→USD→PLN)`,
              legalBasis: 'art. 22 ust. 14 updof',
            })
          } else {
            warnings.push(makeWarning(row, `Prowizja w ${coinName} — nie udało się wycenić. Wyceń ręcznie cenę ${coinName} na ${base.operationDate.slice(0, 10)} i dodaj do kosztów.`))
          }
        }
        continue
      }
      //! ──────────────────────────────────────────────────────────
      //* Przychody z Earn/Staking/Airdrop na PRZYCHÓD (art. 17 ust. 1f updof)
      //* Wartość w dniu otrzymania, przychód staje się kosztem nabycia przy sprzedaży (!)
      //* TAXABLE_INCOME_PATTERNS
      //! ──────────────────────────────────────────────────────────
      if (isTaxableIncomeOp(extendedCategory) && isInflow) {
        const matchedBy = whichPatternMatched(extendedCategory, TAXABLE_INCOME_PATTERNS) ?? ''
        const usdPrice = await getCryptoPriceUSD(coinName, dt)
        //* Przychód w PLN przez USD, bo często nie ma bezpośredniego kursu NBP dla altcoinów
        //* IRS akceptuje taką metodę wyceny (por. KIS 2024/2025)
        if (usdPrice !== null) {
          const usdRate = await getNBPRate('USD', dt)
          incomes.push({
            ...base,
            pricePLN: round6(amount * usdPrice * usdRate),
            shareNBP: usdRate,
            priceUSD: usdPrice,
            category: 'income',
            extendedCategory: `PRZYCHÓD EARN/STAKING — ${extendedCategory}`,
            legalBasis: 'art. 17 ust. 1f updof — wartość rynkowa w dniu otrzymania',
            additionalWarning: `Wzorzec: ${matchedBy}. Ta kwota PLN = koszt nabycia przy późniejszej sprzedaży!`,
          })
        } else {
          //* Nie można wycenić przychodu z Earn/Staking, wymaga ręcznej wyceny i dodania do przychodów
          warnings.push(makeWarning(row, `Dochód z "${extendedCategory}" w ${coinName} — nie udało się automatycznie wycenić. Wyceń ręcznie cenę ${coinName} na ${base.operationDate.slice(0, 10)} i dodaj do PRZYCHODÓW. Wzorzec dopasowany: ${matchedBy}`))
        }
        continue
      }
      //! ──────────────────────────────────────────────────────────
      //* Konwersja pyłu (small assets) na BNB
      //* Neutralne podatkowo, ale wymaga uwagi jeśli było na FIAT
      //* DUST_PATTERNS
      //! ──────────────────────────────────────────────────────────
      if (isDustOp(extendedCategory)) {
        ignored.push({
          ...base, pricePLN: 0, category: 'ignored',
          extendedCategory: 'Konwersja pyłu → BNB (krypto→krypto, neutralna)',
          additionalReason: 'Jeśli pył był wymieniany na FIAT — wymaga ręcznej korekty.',
        })
        continue
      }
      //! ──────────────────────────────────────────────────────────
      //* Operacje techniczne (np. wewnętrzne, konwersje, itp.)
      //* TECHNICAL_PATTERNS
      //! ──────────────────────────────────────────────────────────
      if (isTechnicalOp(extendedCategory)) {
        const matchedBy = whichPatternMatched(extendedCategory, TECHNICAL_PATTERNS) ?? ''
        const reason = _isFiat && /deposit/i.test(extendedCategory)
          ? 'Wpłata własnych środków fiducjarnych'
          : _isFiat && /withdraw/i.test(extendedCategory)
            ? 'Wypłata środków na konto bankowe'
            : `Operacja techniczna (${extendedCategory})`
        ignored.push({
          ...base, pricePLN: 0, category: 'ignored',
          extendedCategory: reason,
          additionalReason: `Wzorzec: ${matchedBy}`,
        })
        continue
      }
      //! ──────────────────────────────────────────────────────────
      //* Wszystkie inne operacje, które wymagają ręcznej weryfikacji
      //! ──────────────────────────────────────────────────────────
      const opCategory = classifyOp(extendedCategory)
      warnings.push(makeWarning(row, `Nieznana operacja: "${extendedCategory}" dla ${coinName} (klasyfikacja: ${opCategory}). Sprawdź ręcznie czy to przychód, koszt, czy operacja neutralna. Jeśli to znany typ Binance — dodaj wzorzec do TAXABLE_INCOME_PATTERNS lub TECHNICAL_PATTERNS w constants/operations.ts`))

    } catch (e) {
      warnings.push(makeWarning(row, `Nieoczekiwany błąd: ${e}`))
    }
  }

  //! OBLICZENIA PODATKOWE
  const totalRevenueSale = revenues.reduce((s, r) => s + r.pricePLN, 0)
  const totalRevenueEarn = incomes.reduce((s, r) => s + r.pricePLN, 0)
  const totalRevenue = totalRevenueSale + totalRevenueEarn
  const totalCostsCurrent = costs.reduce((s, c) => s + c.pricePLN, 0)
  const totalCostsCarried = config.carriedCosts
  const totalCosts = totalCostsCurrent + totalCostsCarried
  const income = Math.max(0, totalRevenue - totalCosts)
  const surplusToCosts = Math.max(0, totalCosts - totalRevenue)
  const basePLN = roundPLN(income)
  const taxPLN = roundPLN(basePLN * 0.19)

  return {
    totalRevenueSale, totalRevenueEarn, totalRevenue,
    totalCostsCurrent, totalCostsCarried, totalCosts,
    income, surplusToCosts, basePLN, taxPLN,
    revenues, incomes, costs, warnings, ignored,
    nonSpotAccounts,
  }
}

/**
 * Formatowanie daty do postaci "YYYY-MM-DD HH:mm:ss" w UTC, przydatne do raportów i eksportu.
 *
 * @param {Date} dt - Data do sformatowania
 * @return {string} Sformatowana data w UTC
 */
function formatDt(dt: Date): string {
  return dt.toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * Tworzy obiekt ProcessedRow z kategorią "warning" i dodatkową informacją o konieczności ręcznej weryfikacji.
 *
 * @param {RawRow} row - Surowy wiersz danych, który spowodował ostrzeżenie
 * @param {string} msg - Szczegółowa wiadomość opisująca powód ostrzeżenia
 * @return {ProcessedRow} Obiekt ProcessedRow z kategorią "warning" i rozszerzonym opisem
 */
function makeWarning(row: RawRow, msg: string): ProcessedRow {
  return {
    operationDate: row.UTC_Time,
    operationName: row.Operation,
    coinName: row.Coin.toUpperCase(),
    coinAmount: 0,
    account: row.Account,
    pricePLN: 0,
    category: 'warning',
    extendedCategory: 'WERYFIKACJA RĘCZNA',
    additionalReason: msg,
  }
}
