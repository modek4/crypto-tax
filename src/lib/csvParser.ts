import type { RawRow } from '../types/pit38'

/**
 * Tablica funkcji próbujących sparsować datę w różnych formatach.
 *
 * @param {string} s - Surowy string z datą do parsowania
 * @return {Date | null} Obiekt Date, jeśli parsowanie się powiodło, lub null, jeśli format jest nieobsługiwany
 */
const DATE_PARSERS: Array<(s: string) => Date | null> = [
  //* YYYY-MM-DD HH:mm:ss lub YYYY-MM-DDTHH:mm:ss
  s => {
    const norm = s.trim().replace(' ', 'T')
    //* Jeśli brak strefy — traktuj jako UTC (Binance eksportuje UTC)
    const withZ = norm.endsWith('Z') ? norm : norm + 'Z'
    const d = new Date(withZ)
    return isNaN(d.getTime()) ? null : d
  },
  //* DD-MM-YYYY HH:mm:ss
  s => {
    const m = s.trim().match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2}:\d{2})$/)
    if (!m) return null
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}Z`)
    return isNaN(d.getTime()) ? null : d
  },
  //* YY-MM-DD HH:mm:ss (rok 2-cyfrowy)
  s => {
    const m = s.trim().match(/^(\d{2})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})$/)
    if (!m) return null
    const d = new Date(`20${m[1]}-${m[2]}-${m[3]}T${m[4]}Z`)
    return isNaN(d.getTime()) ? null : d
  },
  //* MM/DD/YYYY HH:mm:ss
  s => {
    const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}:\d{2}:\d{2})$/)
    if (!m) return null
    const d = new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}Z`)
    return isNaN(d.getTime()) ? null : d
  },
]

/**
 * Próbuje sparsować surowy string z datą, obsługując różne formaty daty, które mogą wystąpić w plikach CSV z Binance.
 *
 * @param {string} raw - Surowy string z datą do parsowania
 * @return {Date} Obiekt Date reprezentujący datę i czas transakcji
 * @throws {Error} Jeśli format daty jest nieobsługiwany lub parsowanie się nie powiodło
 */
export function parseDate(raw: string): Date {
  const s = raw.trim().replace(/^"|"$/g, '')
  for (const parser of DATE_PARSERS) {
    const d = parser(s)
    if (d !== null) return d
  }
  throw new Error(`Nieobsługiwany format daty: "${raw}"`)
}

/**
 * Wykrywa separator kolumn w pliku CSV, analizując pierwszy wiersz (nagłówek) i licząc wystąpienia potencjalnych separatorów poza cudzysłowami.
 *
 * @param {string} firstLine - Pierwszy wiersz pliku CSV, zawierający nagłówki kolumn
 * @return {string} Wykryty separator (np. ';', ',', '\t')
 */
function detectSeparator(firstLine: string): string {
  const count = (sep: string) => {
    let inside = false, n = 0
    for (const ch of firstLine) {
      //* Pomiń separatory wewnątrz cudzysłowów
      if (ch === '"') { inside = !inside; continue }
      if (!inside && ch === sep) n++
    }
    return n
  }
  const scores = { ';': count(';'), ',': count(','), '\t': count('\t') }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Dzieli pojedynczy wiersz CSV na kolumny, obsługując cudzysłowy i potencjalne wystąpienia separatorów wewnątrz nich.
 *
 * @param {string} line - Wiersz CSV do podzielenia
 * @param {string} sep - Separator kolumn (np. ';', ',', '\t')
 * @return {string[]} Tablica z wartościami poszczególnych kolumn, po usunięciu cudzysłowów i przycięciu spacji
 */
function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Mapowanie kanonicznych nazw kolumn na ich potencjalne aliasy, które mogą wystąpić w plikach CSV z Binance. Umożliwia elastyczne dopasowanie kolumn niezależnie od dokładnej nazwy użytej w nagłówku.
 *
 * @type {Record<string, string[]>} Obiekt, gdzie klucze to kanoniczne nazwy kolumn, a wartości to tablice z potencjalnymi aliasami dla tych kolumn.
 * @property {string} UTC_Time - Data i czas transakcji (np. "2000-01-01 10:10:10")
 * @property {string} Operation - Opis operacji (np. "Buy", "Sell", "Earn")
 * @property {string} Coin - Nazwa kryptowaluty (np. "BTC", "ETH")
 * @property {string} Change - Zmiana ilości (np. "-0.5", "+1.0")
 * @property {string} Account - Nazwa konta lub portfela, z którego pochodzi transakcja
 * @property {string} Remark - Dodatkowy komentarz lub uwaga (opcjonalnie)
 */
const COL_ALIASES: Record<string, string[]> = {
  UTC_Time: ['UTC_Time', 'Czas', 'Time', 'Date', 'Datetime', 'utc_time', 'timestamp'],
  Operation: ['Operation', 'Operacja', 'Type', 'operation', 'type'],
  Coin: ['Coin', 'Moneta', 'Asset', 'Currency', 'coin', 'asset'],
  Change: ['Change', 'Zmień', 'Amount', 'Quantity', 'change', 'amount'],
  Account: ['Account', 'Konto', 'account'],
  Remark: ['Remark', 'Uwagi', 'Note', 'remark'],
}

/**
 * Buduje mapę z kanonicznych nazw kolumn na ich indeksy w tablicy nagłówków, umożliwiając łatwe odwoływanie się do kolumn po kanonicznych nazwach niezależnie od dokładnej nazwy użytej w pliku CSV.
 *
 * @param {string[]} headers - Tablica z nagłówkami kolumn odczytanymi z pierwszego wiersza pliku CSV
 * @return {Record<string, number>} Obiekt, gdzie klucze to kanoniczne nazwy kolumn, a wartości to indeksy tych kolumn w tablicy nagłówków
 * @example
 * const headers = ['Time', 'Type', 'Asset', 'Amount', 'account']
 * const colMap = buildColMap(headers)
 * console.log(colMap) // { UTC_Time: 0, Operation: 1, Coin: 2, Change: 3, Account: 4 }
 */
function buildColMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const [canonical, aliases] of Object.entries(COL_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim().replace(/^"|"$/g, '')
      if (aliases.some(a => a.toLowerCase() === h.toLowerCase())) {
        map[canonical] = i
        break
      }
    }
  }
  return map
}

/**
 * Interfejs reprezentujący wynik parsowania pliku CSV.
 *
 * @property {RawRow[]} rows - Tablica z surowymi danymi transakcji odczytanymi z pliku CSV
 * @property {string} detectedSep - Wykryty separator kolumn w pliku CSV (np. ';', ',', '\t')
 * @property {string[]} missingColumns - Tablica z nazwami wymaganych kolumn, które nie zostały znalezione w nagłówku pliku CSV
 * @property {string[]} headers - Tablica z oryginalnymi nagłówkami kolumn odczytanymi z pierwszego wiersza pliku CSV
 */
export interface ParseResult {
  rows: RawRow[]
  detectedSep: string
  missingColumns: string[]
  headers: string[]
}

/**
 * Główna funkcja parsująca zawartość pliku CSV.
 *
 * @param {string} content - Zawartość pliku CSV jako string
 * @return {ParseResult} Obiekt zawierający tablicę z surowymi danymi transakcji, wykryty separator, listę brakujących kolumn oraz oryginalne nagłówki
 * @throws {Error} Jeśli plik CSV jest pusty lub nie zawiera wymaganych kolumn
 * @example
 * const csvContent = 'Time,Type,Asset,Amount,account\n2000-01-01 10:10:10,Buy,BTC,1.0,123123123'
 * const result = parseCSV(csvContent)
 * console.log(result.rows) // [{ UTC_Time: '2000-01-01 10:10:10', Operation: 'Buy', Coin: 'BTC', Change: '1.0', Account: '123123123' }]
 * console.log(result.detectedSep) // ','
 * console.log(result.missingColumns) // []
 * console.log(result.headers) // ['Time', 'Type', 'Asset', 'Amount', 'account']
 */
export function parseCSV(content: string): ParseResult {
  //* Usuń BOM
  const clean = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  //* Podziel na linie i usuń puste
  const lines = clean.split('\n').filter(l => l.trim().length > 0)
  //* Jeśli brak linii lub tylko nagłówek, zwróć błąd z informacją o brakujących kolumnach
  if (lines.length < 2)
    return { rows: [], detectedSep: ',', missingColumns: ['UTC_Time', 'Operation', 'Coin', 'Change', 'Account'], headers: [] }
  //* Wykryj separator, zbuduj mapę kolumn i sparsuj wiersze
  const sep = detectSeparator(lines[0])
  const headers = splitCSVLine(lines[0], sep)
  const colMap = buildColMap(headers)
  const required = ['UTC_Time', 'Operation', 'Coin', 'Change', 'Account']
  const missingColumns = required.filter(c => !(c in colMap))
  //* Jeśli brakuje wymaganych kolumn, zwróć błąd z informacją o brakujących kolumnach
  if (missingColumns.length > 0)
    return { rows: [], detectedSep: sep, missingColumns, headers }
  //* Parsuj wiersze
  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep)
    if (cols.length < required.length) continue
    const get = (canon: string) => (cols[colMap[canon]] ?? '').trim()
    //* Pomiń wiersze bez daty lub operacji
    if (!get('UTC_Time') || !get('Operation')) continue
    rows.push({
      UTC_Time: get('UTC_Time'),
      Operation: get('Operation'),
      Coin: get('Coin').toUpperCase(),
      Change: get('Change'),
      Account: get('Account'),
      Remark: 'Remark' in colMap ? get('Remark') : undefined,
    })
  }
  return { rows, detectedSep: sep, missingColumns: [], headers }
}
