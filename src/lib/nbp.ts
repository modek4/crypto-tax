/*
Klient NBP API — Tabela A, średni kurs walut obcych
Zgodnie z art. 22 ust. 1 updof: kurs z dnia POPRZEDZAJĄCEGO
datę transakcji. Przy weekendzie/święcie cofa się do 14 dni.
*/
//* API NBP do pobierania kursów walut
const NBP_BASE = 'https://api.nbp.pl/api/exchangerates/rates/a'
//* Cache do przechowywania pobranych kursów NBP
const cache = new Map<string, number>()

/**
 * Odejmowanie określonej liczby dni od daty, przydatne do obliczania daty poprzedzającej transakcję zgodnie z art. 22 ust. 1 updof.
 *
 * @param {Date} date - Data, od której mają być odjęte dni
 * @param {number} days - Liczba dni do odjęcia
 * @return {Date} Nowa data po odjęciu określonej liczby dni
 */
function subtractDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

/**
 * Konwertuje obiekt Date do formatu "YYYY-MM-DD", który jest wymagany przez API NBP.
 *
 * @param {Date} date - Data do konwersji
 * @return {string} Sformatowana data w formacie "YYYY-MM-DD"
 */
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Pobiera kurs NBP dla danej waluty i daty transakcji, zgodnie z art. 22 ust. 1 updof. Jeśli kurs dla tej daty nie jest dostępny (weekend/święto), próbuje cofnąć się do 14 dni wstecz.
 *
 * @param {string} currency - Kod waluty (np. "USD", "EUR")
 * @param {Date} transactionDt - Data transakcji, dla której ma być pobrany kurs
 * @return {Promise<number>} Kurs NBP dla danej waluty i daty
 * @throws {Error} Jeśli kurs NBP nie jest dostępny dla żadnej z dat w ciągu 14 dni wstecz
 */
export async function getNBPRate(currency: string, transactionDt: Date): Promise<number> {
  //* PLN zawsze 1.0
  if (currency === 'PLN') return 1.0
  //! Dzień poprzedzający transakcję (art. 22 ust. 1 updof)
  const prevDay = subtractDays(transactionDt, 1)
  //* Sprawdzenie cache przed wykonywaniem zapytań do API NBP
  for (let daysBack = 0; daysBack < 14; daysBack++) {
    const checkDate = subtractDays(prevDay, daysBack)
    const dateStr = toDateStr(checkDate)
    const key = `${currency.toUpperCase()}_${dateStr}`
    if (cache.has(key)) return cache.get(key)!
    //* Pobieranie kursu NBP z API, z obsługą błędów i retry
    try {
      //* Pobierz kurs NBP dla danej waluty i daty
      const resp = await fetch(
        `${NBP_BASE}/${currency.toLowerCase()}/${dateStr}/?format=json`,
        { signal: AbortSignal.timeout(8000) }
      )
      //* Jeśli odpowiedź jest poprawna, zwróć kurs i zapisz w cache
      if (resp.ok) {
        const data = await resp.json()
        const rate = data.rates[0].mid as number
        cache.set(key, rate)
        return rate
      }
      //* Jeśli brak notowania (404) próbuj dalej
      if (resp.status === 404) continue
      //* Jeśli limit zapytań (429), poczekaj i spróbuj ponownie
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
    } catch {
      //* W przypadku innych błędów (np. sieciowych) poczekaj i spróbuj ponownie
      await new Promise(r => setTimeout(r, 200))
      continue
    }
  }
  //* Jeśli po 14 dniach wstecz nie znaleziono kursu, zgłoś błąd
  throw new Error(`Brak kursu NBP dla '${currency}' w pobliżu daty ${toDateStr(prevDay)} (sprawdzono 14 dni wstecz). Sprawdź czy waluta jest w tabeli A NBP.`)
}
