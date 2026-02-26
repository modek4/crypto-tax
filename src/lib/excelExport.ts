import ExcelJS from 'exceljs'
import type { PIT38Result, ProcessedRow, AppConfig } from '../types/pit38'

/**
 * Funkcja zaokrąglająca liczbę do 2 miejsc po przecinku, z zachowaniem typu number.
 *
 * @param {number} n - Liczba do zaokrąglenia
 * @returns {number} - Zaokrąglona liczba do 2 miejsc po przecinku
 */
function r2(n: number) { return Math.round(n * 100) / 100 }

/**
 * Funkcja pomocnicza do stylizacji nagłówków w arkuszu Excel.
 *
 * @param {ExcelJS.Row} row - Wiersz, któremu chcemy nadać styl nagłówka
 * @param {string} fillColor - Opcjonalny kolor tła nagłówka w formacie ARGB
 */
function applyHeaderStyle(row: ExcelJS.Row, fillColor = '3b1e5f') {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fillColor } }
    cell.alignment = { vertical: 'middle', wrapText: false }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'ff4a3355' } },
    }
  })
  row.height = 22
}

/**
 * Funkcja tworząca arkusz z listą transakcji i dodająca go do Excela.
 *
 * @param {ExcelJS.Workbook} wb - Obiekt Workbook, do którego zostanie dodany arkusz
 * @param {string} name - Nazwa arkusza
 * @param {ProcessedRow[]} rows - Lista transakcji do umieszczenia w arkuszu
 * @param {string} accentColor - Kolor akcentujący nagłówek arkusza w formacie ARGB
 */
function addTransactionSheet(
  wb: ExcelJS.Workbook,
  name: string,
  rows: ProcessedRow[],
  accentColor: string
) {
  //* Dodanie nowego arkusza do workbooka
  const ws = wb.addWorksheet(name)
  //* Definicja kolumn i ich formatów
  ws.columns = [
    { header: 'Data', key: 'operationDate', width: 20 },
    { header: 'Operacja', key: 'operationName', width: 28 },
    { header: 'Moneta', key: 'coinName', width: 10 },
    { header: 'Ilość', key: 'coinAmount', width: 18, style: { numFmt: '#,##0.00000000' } },
    { header: 'PLN', key: 'pricePLN', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Kurs NBP', key: 'shareNBP', width: 12, style: { numFmt: '#,##0.0000' } },
    { header: 'Cena USD', key: 'priceUSD', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Typ', key: 'extendedCategory', width: 38 },
    { header: 'Podstawa prawna', key: 'legalBasis', width: 30 },
    { header: 'Uwaga', key: 'additionalWarning', width: 45 },
  ]
  //* Stylizacja nagłówka
  applyHeaderStyle(ws.getRow(1), accentColor)
  //* Dodanie danych transakcji do arkusza
  for (const r of rows) {
    ws.addRow({
      operationDate: r.operationDate,
      operationName: r.operationName,
      coinName: r.coinName,
      coinAmount: r.coinAmount,
      pricePLN: r.pricePLN,
      shareNBP: r.shareNBP ?? null,
      priceUSD: r.priceUSD ?? null,
      extendedCategory: r.extendedCategory,
      legalBasis: r.legalBasis ?? '',
      additionalWarning: r.additionalWarning ?? r.additionalReason ?? '',
    })
  }
  //* Dodanie autofiltera do nagłówka
  ws.autoFilter = { from: 'A1', to: `J1` }
  //* Zamrożenie pierwszego wiersza z nagłówkiem
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

/**
 * Główna funkcja eksportująca dane do pliku Excel. Tworzy workbook, dodaje arkusz z podsumowaniem oraz arkusze z listami transakcji, a następnie generuje i pobiera plik Excel.
 *
 * @param {PIT38Result} result - Obiekt zawierający wyniki obliczeń i listy transakcji
 * @param {AppConfig} config - Konfiguracja aplikacji, zawierająca m.in. docelowy rok podatkowy
 * @returns {Promise<void>} - Promise, który rozwiązuje się po zakończeniu procesu eksportu
 */
export async function exportToExcel(result: PIT38Result, config: AppConfig): Promise<void> {
  //* Utworzenie nowego workbooka Excel
  const wb = new ExcelJS.Workbook()
  //* Ustawienie właściwości dokumentu, takich jak autor, data utworzenia i temat
  const yr = config.targetYear
  wb.creator = 'Modek4'
  wb.created = new Date()
  wb.subject = `PIT-38 Kryptowaluty ${yr}`
  //* Dodanie arkusza z podsumowaniem wyników i statystyk
  const wsSummary = wb.addWorksheet('Podsumowanie')
  wsSummary.columns = [
    { key: 'opis', width: 58 },
    { key: 'wartosc', width: 20, style: { numFmt: '#,##0.00' } },
  ]
  //* Definicja sekcji i ich zawartości do umieszczenia w arkuszu podsumowania
  const sections: Array<[string, number | string | null, string?]> = [
    [`PIT-38 CRYPTO — Rok podatkowy ${yr}`, null],
    ['', null],
    ['POLE 34 — PRZYCHODY (art. 17 ust. 1f updof)', null, 'HEADER'],
    ['  Przychody ze sprzedaży krypto na fiat', r2(result.totalRevenueSale)],
    ['  Przychody z Earn / Staking / Airdrop', r2(result.totalRevenueEarn)],
    ['  ► RAZEM POLE 34', r2(result.totalRevenue), 'TOTAL'],
    ['', null],
    ['POLE 35 — KOSZTY (art. 22 ust. 14-16 updof)', null, 'HEADER'],
    [`  Koszty poniesione w ${yr}`, r2(result.totalCostsCurrent)],
    ['  Nadwyżka kosztów z lat poprzednich', r2(result.totalCostsCarried)],
    ['  ► RAZEM POLE 35', r2(result.totalCosts), 'TOTAL'],
    ['', null],
    ['WYNIK', null, 'HEADER'],
    ['  Dochód (Pole 34 - Pole 35)', r2(result.income)],
    ['  Podstawa opodatkowania [pełne PLN]', result.basePLN, 'INTEGER'],
    ['  ► PODATEK DO ZAPŁATY 19%', result.taxPLN, 'TAX'],
    ['', null],
    ['NADWYŻKA KOSZTÓW NA NASTĘPNY ROK', null, 'HEADER'],
    ['  Kwota do wpisania w rozliczeniu za rok następny', r2(result.surplusToCosts), 'CARRY'],
    ['  Podstawa: art. 22 ust. 16 updof', null],
    ['', null],
    ['STATYSTYKI', null, 'HEADER'],
    [`  Transakcje przychodowe (Pole 34)`, result.revenues.length + result.incomes.length],
    [`  Transakcje kosztowe (Pole 35)`, result.costs.length],
    [`  Earn/Staking/Airdrop`, result.incomes.length],
    [`  Do ręcznej weryfikacji`, result.warnings.length],
    [`  Neutralne/ignorowane`, result.ignored.length],
  ]
  //* Dodanie sekcji do arkusza podsumowania z odpowiednią stylizacją
  for (const [opis, wartosc, tag] of sections) {
    const row = wsSummary.addRow({ opis, wartosc: wartosc ?? '' })
    if (tag === 'HEADER') {
      row.getCell(1).font = { bold: true, color: { argb: 'ffca93fd' }, size: 10 }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffd493fd' } }
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffd493fd' } }
    } else if (tag === 'TOTAL') {
      row.font = { bold: true }
    } else if (tag === 'TAX') {
      row.getCell(2).font = { bold: true, color: { argb: 'ff4ade70' }, size: 12 }
      row.getCell(2).numFmt = '#,##0'
    } else if (tag === 'CARRY') {
      row.getCell(2).font = { bold: true, color: { argb: 'fffbd024' } }
    } else if (tag === 'INTEGER') {
      row.getCell(2).numFmt = '#,##0'
    }
  }
  //* Zamrożenie pierwszego wiersza z nagłówkiem
  wsSummary.views = [{ state: 'frozen', ySplit: 0 }]
  //* Dodanie arkuszy z listami transakcji dla poszczególnych kategorii (przychody, koszty, earn/staking, ostrzeżenia, ignorowane)
  addTransactionSheet(wb, 'Przychody Pole 34', result.revenues, '065f1f')
  addTransactionSheet(wb, 'Dochód łączony Pole 34', result.incomes, '731eaf')
  addTransactionSheet(wb, 'Koszty Pole 35', result.costs, '7f281d')
  if (result.warnings.length > 0) addTransactionSheet(wb, 'WERYFIKACJA RĘCZNA', result.warnings, '92530e')
  addTransactionSheet(wb, 'Ignorowane', result.ignored, '291f37')
  //* Generowanie pliku Excel i inicjowanie pobierania
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Binance_PIT38_${yr}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
