import type { OpPattern } from '../constants/operations'
import {
  FIAT_CURRENCIES,
  DEFAULT_STABLECOINS,
  TRADE_PATTERNS,
  FEE_PATTERNS,
  TAXABLE_INCOME_PATTERNS,
  TECHNICAL_PATTERNS,
  DUST_PATTERNS,
} from '../constants/operations'

export {
  TRADE_PATTERNS,
  FEE_PATTERNS,
  TAXABLE_INCOME_PATTERNS,
  TECHNICAL_PATTERNS,
  DUST_PATTERNS,
}

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorca (pattern), uwzględniając typ dopasowania (exact, suffix, prefix, contains) i ignorując wielkość liter.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Buy", "Sell", "Staking Rewards")
 * @param {OpPattern} pattern - Wzorzec, który zawiera typ dopasowania i wartość do porównania
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorca, w przeciwnym razie false
 */
export function matchesPattern(op: string, pattern: OpPattern): boolean {
  const opLower = op.toLowerCase()
  const valLower = pattern.value.toLowerCase()

  switch (pattern.type) {
    case 'exact': return opLower === valLower
    case 'suffix': return opLower.endsWith(valLower)
    case 'prefix': return opLower.startsWith(valLower)
    case 'contains': return opLower.includes(valLower)
  }
}

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do któregokolwiek z wzorców w podanej tablicy, wykorzystując funkcję matchesPattern.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Buy", "Sell", "Staking Rewards")
 * @param {OpPattern[]} patterns - Tablica wzorców, które zawierają typ dopasowania i wartość do porównania
 * @return {boolean} True, jeśli kategoria operacji pasuje do któregokolwiek z wzorców, w przeciwnym razie false
 */
function matchesAny(op: string, patterns: OpPattern[]): boolean {
  return patterns.some(p => matchesPattern(op, p))
}

/**
 * Sprawdza, czy dany symbol waluty jest walutą fiat, na podstawie zbioru zdefiniowanego w constants/operations.ts.
 *
 * @param {string} symbol - Symbol waluty do sprawdzenia (np. "USD", "EUR", "PLN")
 * @return {boolean} True, jeśli symbol jest walutą fiat, w przeciwnym razie false
 */
export function isFiat(symbol: string): boolean {
  return FIAT_CURRENCIES.has(symbol.toUpperCase())
}

/**
 * Sprawdza, czy dany symbol waluty jest stablecoinem, na podstawie zbioru domyślnych stablecoinów oraz dodatkowego zbioru przekazanego jako argument. Stablecoiny są traktowane jako równowartość 1 USD, a operacje z nimi związane są wyceniane po kursie 1:1 do dolara amerykańskiego.
 *
 * @param {string} symbol - Symbol waluty do sprawdzenia (np. "USDT", "USDC", "BUSD")
 * @param {Set<string>} extraStablecoins - Zbiór dodatkowych stablecoinów do uwzględnienia, przekazany jako argument (np. "EURC", "USDD")
 * @return {boolean} True, jeśli symbol jest stablecoinem, w przeciwnym razie false
 */
export function isStablecoin(symbol: string, extraStablecoins: Set<string>): boolean {
  const upper = symbol.toUpperCase()
  return DEFAULT_STABLECOINS.has(upper) || extraStablecoins.has(upper)
}

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorców operacji handlowych (TRADE_PATTERNS), opłat (FEE_PATTERNS), przychodów z Earn/Staking/Airdrop (TAXABLE_INCOME_PATTERNS), operacji technicznych (TECHNICAL_PATTERNS) lub "pyłowych" (DUST_PATTERNS), wykorzystując funkcję matchesAny i zwracając odpowiednią kategorię jako string.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Buy", "Sell", "Staking Rewards")
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorców handlowych, opłat, przychodów z Earn/Staking/Airdrop, operacji technicznych lub "pyłowych", w przeciwnym razie false
 */
export function isTradeOp(op: string): boolean { return matchesAny(op, TRADE_PATTERNS) }

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorców opłat (FEE_PATTERNS), wykorzystując funkcję matchesAny.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Transaction Fee", "Trading Fee")
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorców opłat, w przeciwnym razie false
 */
export function isFeeOp(op: string): boolean { return matchesAny(op, FEE_PATTERNS) }

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorców przychodów z Earn/Staking/Airdrop (TAXABLE_INCOME_PATTERNS), wykorzystując funkcję matchesAny. Operacje te są klasyfikowane jako przychód na PIT-38, a ich wartość w dniu otrzymania jest traktowana zarówno jako przychód, jak i koszt nabycia przy późniejszej sprzedaży.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "ETH 2.0 Staking Rewards", "Simple Earn Flexible Interest")
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorców przychodów z Earn/Staking/Airdrop, w przeciwnym razie false
 */
export function isTaxableIncomeOp(op: string): boolean { return matchesAny(op, TAXABLE_INCOME_PATTERNS) }

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorców operacji technicznych (TECHNICAL_PATTERNS), wykorzystując funkcję matchesAny. Operacje techniczne to takie, które nie mają bezpośredniego wpływu na przychód lub koszt podatkowy, ale mogą być istotne z punktu widzenia analizy danych lub diagnostyki.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Deposit", "Withdrawal", "Transfer")
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorców operacji technicznych, w przeciwnym razie false
 */
export function isTechnicalOp(op: string): boolean { return matchesAny(op, TECHNICAL_PATTERNS) }

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do wzorców "pyłowych" (DUST_PATTERNS), wykorzystując funkcję matchesAny. Operacje "pyłowe" to takie, które dotyczą bardzo małych kwot lub ilości kryptowalut, które mogą być pomijalne z punktu widzenia rozliczeń podatkowych, ale mogą być istotne do zidentyfikowania i ewentualnego zignorowania w dalszej analizie.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Dust Transfer", "Small Amount Adjustment")
 * @return {boolean} True, jeśli kategoria operacji pasuje do wzorców "pyłowych", w przeciwnym razie false
 */
export function isDustOp(op: string): boolean { return matchesAny(op, DUST_PATTERNS) }

/**
 * Typ kategorii operacji, który może przyjmować wartości 'trade', 'fee', 'taxable_income', 'technical', 'dust' lub 'unknown', w zależności od tego, do której grupy wzorców pasuje dana kategoria operacji (op) po sprawdzeniu funkcją classifyOp.
 *
 * @typedef {('trade' | 'fee' | 'taxable_income' | 'technical' | 'dust' | 'unknown')} OpCategory - Typ kategorii operacji
 */
export type OpCategory =
  | 'trade'
  | 'fee'
  | 'taxable_income'
  | 'technical'
  | 'dust'
  | 'unknown'

/**
 * Sprawdza, czy dana kategoria operacji (op) pasuje do któregokolwiek z wzorców w podanej tablicy, wykorzystując funkcję matchesAny.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia
 * @return {OpCategory} Kategoria operacji jako string: 'trade', 'fee', 'taxable_income', 'technical', 'dust' lub 'unknown'
 */
export function classifyOp(op: string): OpCategory {
  if (isTradeOp(op)) return 'trade'
  if (isFeeOp(op)) return 'fee'
  if (isTaxableIncomeOp(op)) return 'taxable_income'
  if (isDustOp(op)) return 'dust'
  if (isTechnicalOp(op)) return 'technical'
  return 'unknown'
}

/**
 * Sprawdza, który wzorzec z podanej tablicy pasuje do danej kategorii operacji (op) i zwraca string z informacją o dopasowanym wzorcu w formacie "type:value". Jeśli żaden wzorzec nie pasuje, zwraca null.
 *
 * @param {string} op - Kategoria operacji do sprawdzenia (np. "Buy", "Sell", "Staking Rewards")
 * @param {OpPattern[]} patterns - Tablica wzorców, które zawierają typ dopasowania i wartość do porównania
 * @return {string | null} String z informacją o dopasowanym wzorcu w formacie "type:value" (np. "exact:Buy", "suffix:Staking Rewards") lub null, jeśli żaden wzorzec nie pasuje
 */
export function whichPatternMatched(op: string, patterns: OpPattern[]): string | null {
  for (const p of patterns) {
    if (matchesPattern(op, p)) {
      return `${p.type}:"${p.value}"`
    }
  }
  return null
}
