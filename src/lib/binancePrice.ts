import { DEFAULT_STABLECOINS, FIAT_CURRENCIES } from '../constants/operations'
//* API Binance do pobierania cen kryptowalut
const KLINES = 'https://api.binance.com/api/v3/klines'
//* Cache do przechowywania pobranych cen
const priceCache = new Map<string, number>()

/**
 * Pobiera cenę zamknięcia świecy 1-godzinnej dla danej pary symbolu i czasu.
 *
 * @param {string} symbol - Symbol kryptowaluty (np. "BTC", "ETH")
 * @param {number} startMs - Czas rozpoczęcia świecy w formacie timestamp (ms)
 * @return {Promise<number|null>} Cena zamknięcia świecy lub null, jeśli nie można pobrać ceny
 * @throws {Error} Jeśli wystąpi błąd podczas pobierania danych z API Binance
 */
async function fetchKlineClose(symbol: string, startMs: number): Promise<number | null> {
  try {
    const url = `${KLINES}?symbol=${symbol}&interval=1h&startTime=${startMs}&limit=1`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!Array.isArray(data) || data.length === 0) return null
    //* Cena zamknięcia na 5 pozycji w tablicy z API Binance
    return parseFloat(data[0][4])
  } catch {
    return null
  }
}

/**
 * Pobiera cenę kryptowaluty (świeca 1-godzinna) w USD dla danej daty, próbując kolejno różne pary (USDT, BTC, ETH, BNB) i wykorzystując cache do przyspieszenia.
 *
 * @param {string} symbol - Symbol kryptowaluty (np. "BTC", "ETH")
 * @param {Date} dt - Data i czas transakcji, dla której ma być pobrana cena
 * @return {Promise<number|null>} Cena kryptowaluty w USD lub null, jeśli nie można jej określić
 */
export async function getCryptoPriceUSD(symbol: string, dt: Date): Promise<number | null> {
  //* Stablecoiny traktujemy jako 1 USD, a waluty fiat jako brak ceny (nie obsługiwane)
  if (DEFAULT_STABLECOINS.has(symbol)) return 1.0
  if (FIAT_CURRENCIES.has(symbol)) return null
  //* Pełna godzina dla cache (świeca 1-godzinna)
  const hourStart = new Date(dt)
  hourStart.setUTCMinutes(0, 0, 0)
  const startMs = hourStart.getTime()
  const cacheKey = `${symbol}_${startMs}`
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey)!
  //* Próbujemy kolejne pary
  const pairs: Array<[string, () => Promise<number | null>]> = [
    //* USDT bo jest najpowszechniejszy
    [`${symbol}USDT`, async () => fetchKlineClose(`${symbol}USDT`, startMs)],
    //* BTC jako często używana para
    [`${symbol}BTC`, async () => {
      const p = await fetchKlineClose(`${symbol}BTC`, startMs)
      if (p === null) return null
      const btc = await getCryptoPriceUSD('BTC', dt)
      return btc !== null ? p * btc : null
    }],
    //* ETH jako alternatywna para
    [`${symbol}ETH`, async () => {
      const p = await fetchKlineClose(`${symbol}ETH`, startMs)
      if (p === null) return null
      const eth = await getCryptoPriceUSD('ETH', dt)
      return eth !== null ? p * eth : null
    }],
    //* BNB jako kolejna alternatywa
    [`${symbol}BNB`, async () => {
      const p = await fetchKlineClose(`${symbol}BNB`, startMs)
      if (p === null) return null
      const bnb = await getCryptoPriceUSD('BNB', dt)
      return bnb !== null ? p * bnb : null
    }],
  ]
  for (const [, fetcher] of pairs) {
    const price = await fetcher()
    if (price !== null) {
      priceCache.set(cacheKey, price)
      return price
    }
  }
  return null
}
