/**
 * Spis walut fiat, które są rozliczane bezpośrednio i nie wymagają wyceny.
 *
 * @constant {Set<string>} FIAT_CURRENCIES - Zbiór symboli walut fiat
 */
export const FIAT_CURRENCIES = new Set([
  'PLN', 'EUR', 'USD', 'GBP', 'CHF',
  'BIDR', 'BRL', 'AUD', 'TRY', 'RUB', 'UAH', 'NGN', 'ZAR',
  'JPY', 'CAD', 'HKD', 'SGD', 'MXN', 'ARS', 'CZK', 'HUF', 'SEK', 'NOK',
])

/**
 * Spis stablecoinów, które są traktowane jako równowartość 1 USD. Wszelkie operacje z tymi walutami są wyceniane po kursie 1:1 do dolara amerykańskiego.
 *
 * @constant {Set<string>} DEFAULT_STABLECOINS - Zbiór symboli stablecoinów
 */
export const DEFAULT_STABLECOINS = new Set([
  'USDT', 'USDC', 'FDUSD', 'BUSD', 'DAI', 'TUSD', 'USDP', 'GUSD', 'PYUSD',
  'USDD', 'FRAX', 'LUSD', 'CRVUSD', 'USDE', 'EURC', 'EURS', 'EURT',
])

/**
 * Typy dopasowania wzorca do kategorii operacji: 'exact' (dokładne), 'suffix' (końcówka), 'prefix' (początek) i 'contains' (zawiera).
 *
 * @typedef {('exact' | 'suffix' | 'prefix' | 'contains')} MatchType - Typ dopasowania wzorca
 */
export type MatchType = 'exact' | 'suffix' | 'prefix' | 'contains'

/**
 * Interfejs reprezentujący wzorzec dopasowania dla kategorii operacji, zawierający typ dopasowania (MatchType) i wartość do porównania (string).
 *
 * @interface OpPattern
 * @property {MatchType} type - Typ dopasowania wzorca (exact, suffix, prefix, contains)
 * @property {string} value - Wartość do porównania z kategorią operacji
 */
export interface OpPattern {
  type: MatchType
  value: string
}

/**
 * Spis operacji, które są klasyfikowane jako transakcje kupna/sprzedaży (art. 14 ust. 1 pkt 1 updof) i wymagają rozliczenia na PIT-38. Kluczowe wzorce exact pokrywają najpopularniejsze kategorie operacji handlowych z Binance i innych giełd.
 *
 * TRADE_OPS
 *
 * @constant {OpPattern[]} TRADE_PATTERNS - Tablica wzorców dopasowania dla operacji handlowych
 * @example
 * "Buy" - standardowa transakcja kupna
 * "Sell" - standardowa transakcja sprzedaży
 * "Binance Convert" - konwersja walut na Binance, traktowana jak sprzedaż jednej waluty i kupno drugiej
 * "P2P Trading" - transakcje peer-to-peer, które również są rozliczane jak tradycyjny handel
 */
export const TRADE_PATTERNS: OpPattern[] = [
  { type: 'exact', value: 'Buy' },
  { type: 'exact', value: 'Sell' },
  { type: 'exact', value: 'Transaction Buy' },
  { type: 'exact', value: 'Transaction Sold' },
  { type: 'exact', value: 'Transaction Spend' },
  { type: 'exact', value: 'Transaction Revenue' },
  { type: 'exact', value: 'Transaction Related' },
  // { type: 'exact', value: 'Binance Convert' }, //TODO Wymyślić, czy traktować konwersje jako handel
  { type: 'exact', value: 'Large OTC trading' },
  { type: 'exact', value: 'P2P Trading' },
  { type: 'contains', value: 'OTC' },
  { type: 'contains', value: 'P2P' },
]

/**
 * Spis operacji, które są klasyfikowane jako opłaty (art. 22 ust. 14 updof) i mogą być odliczone od przychodów, ale nie mogą generować straty podatkowej. Kluczowe wzorce exact pokrywają najpopularniejsze kategorie opłat z Binance i innych giełd, a wzorzec suffix "Fee" pozwala wychwycić dowolne opłaty, nawet te niestandardowe.
 *
 * FEE_OPS
 *
 * @constant {OpPattern[]} FEE_PATTERNS - Tablica wzorców dopasowania dla operacji opłat
 * @example
 * "Transaction Fee" - standardowa opłata transakcyjna
 * "Trading Fee" - opłata za handel
 */
export const FEE_PATTERNS: OpPattern[] = [
  { type: 'exact', value: 'Transaction Fee' },
  { type: 'exact', value: 'Fee' },
  { type: 'exact', value: 'Trading Fee' },
  { type: 'suffix', value: 'Fee' },
  { type: 'contains', value: 'Commission Fee' },
]

/**
 * Spis operacji, które są klasyfikowane jako przychody z Earn/Staking/Airdrop (art. 17 ust. 1f updof) i powinny być rozliczane jako przychód na PIT-38. Wartość tych operacji w dniu otrzymania jest traktowana zarówno jako przychód, jak i koszt nabycia przy późniejszej sprzedaży. Kluczowe wzorce sufixowe pokrywają wszystkie kryptowaluty, a wzorce prefixowe i contains pozwalają wychwycić różnorodne nazewnictwo operacji związanych z Earn/Staking/Airdrop.
 *
 * TAXABLE_INCOME_PATTERNS
 *
 * @constant {OpPattern[]} TAXABLE_INCOME_PATTERNS - Tablica wzorców dopasowania dla operacji przychodów z Earn/Staking/Airdrop
 * @example
 * "Staking Rewards" - SOL/DOT/ADA/MATIC/ETH/TRX/itp. Staking Rewards
 * "Staking Income" - wariant nazewnictwa
 * "Launchpool Earnings" - BNB/ETH/itp. Launchpool Earnings
 * "Mining Income" - dowolny token Mining Income
 * "Launchpool" - Launchpool Earnings, Launchpool Interest, itp.
 * "Simple Earn" - Simple Earn Flexible Interest, itp.
 * "Savings" - Savings Interest, Savings Distribution, itp.
 */
export const TAXABLE_INCOME_PATTERNS: OpPattern[] = [
  //* Staking
  { type: 'suffix', value: 'Staking Rewards' },
  { type: 'suffix', value: 'Staking Income' },
  { type: 'suffix', value: 'Staking Interest' },
  { type: 'suffix', value: 'Staking Distribution' },
  { type: 'contains', value: 'Staking Reward' },
  //*ETH 2.0/Beacon Chain
  { type: 'contains', value: 'ETH 2.0' },
  { type: 'contains', value: 'Beacon' },
  //* Launchpool
  { type: 'prefix', value: 'Launchpool' },
  //* Simple Earn/Savings
  { type: 'exact', value: 'Simple Earn Flexible Interest' },
  { type: 'exact', value: 'Simple Earn Flexible Airdrop' },
  { type: 'exact', value: 'Simple Earn Locked Rewards' },
  { type: 'exact', value: 'Simple Earn Locked Interest' },
  { type: 'suffix', value: 'Earn Rewards' },
  { type: 'suffix', value: 'Earn Interest' },
  { type: 'exact', value: 'Savings Interest' },
  { type: 'exact', value: 'Savings Distribution' },
  //* Airdropy i dystrybucje
  { type: 'exact', value: 'Distribution' },
  { type: 'suffix', value: 'Distribution' },
  { type: 'suffix', value: 'Airdrop' },
  { type: 'contains', value: 'Airdrop' },
  //* Referral/Cashback
  { type: 'exact', value: 'Referral Kickback' },
  { type: 'prefix', value: 'Referral' },
  { type: 'exact', value: 'Commission History' },
  { type: 'exact', value: 'Commission Rebate' },
  { type: 'prefix', value: 'Commission' },
  { type: 'suffix', value: 'Cashback' },
  { type: 'contains', value: 'Cash Voucher' },
  //* Inne nagrody
  { type: 'suffix', value: 'Rewards' },
  { type: 'suffix', value: 'Reward' },
  { type: 'suffix', value: 'Earnings' },
  { type: 'suffix', value: 'Income' },
  { type: 'suffix', value: 'Interest' },
  { type: 'exact', value: 'Crypto Box' },
  { type: 'exact', value: 'Token Swap Restitution' },
  { type: 'contains', value: 'Bonus' },
  { type: 'contains', value: 'Alpha 2.0 Token' },
  { type: 'contains', value: 'Mission Reward' },

  //* Mining (sprawdź z doradcą!)
  //! Mining jest bardziej podobny do działalności gospodarczej,
  //! ale na gruncie updof często kwalifikowany jak przychód z krypto
  { type: 'suffix', value: 'Mining Income' },
  { type: 'suffix', value: 'Mining Rewards' },
  { type: 'contains', value: 'Pool Distribution' },
]

/**
 * Spis operacji, które są klasyfikowane jako techniczne i nie mają skutku podatkowego. Obejmuje transfery między własnymi kontami, wpłaty i wypłaty środków, operacje związane z NFT, a także inne operacje techniczne, które nie generują przychodu ani kosztu. Kluczowe wzorce exact pokrywają najpopularniejsze kategorie operacji technicznych z Binance i innych giełd, a wzorce prefixowe, suffixowe i contains pozwalają wychwycić różnorodne nazewnictwo operacji technicznych.
 *
 * TECHNICAL_PATTERNS
 *
 * @constant {OpPattern[]} TECHNICAL_PATTERNS - Tablica wzorców dopasowania dla operacji technicznych
 * @example
 * "Deposit" - wpłata środków na konto giełdowe, traktowana jako operacja techniczna bez skutku podatkowego
 * "Withdraw" - wypłata środków z konta giełdowego, traktowana jako operacja techniczna bez skutku podatkowego
 * "Transfer" - transfer środków między własnymi kontami, traktowany jako operacja techniczna bez skutku podatkowego
 * "NFT Transaction" - operacje związane z NFT, które są rozliczane jako techniczne i nie mają wpływu na przychód czy koszt
 */
export const TECHNICAL_PATTERNS: OpPattern[] = [
  //* Freeze/lock
  { type: 'exact', value: 'Freeze' },
  { type: 'exact', value: 'Unfreeze' },
  { type: 'exact', value: 'Binance Convert' }, //REMOVE TODO Wymyślić, czy traktować konwersje jako handel
  //* Subscriptions/Redemptions
  { type: 'suffix', value: 'Subscription' },
  { type: 'suffix', value: 'Redemption' },
  { type: 'suffix', value: 'purchase' },
  { type: 'suffix', value: 'redemption' },
  //* Liquid Swap
  { type: 'prefix', value: 'Liquid Swap' },
  //* Transfery
  { type: 'exact', value: 'transfer_in' },
  { type: 'exact', value: 'transfer_out' },
  { type: 'contains', value: 'Account Transfer' },
  { type: 'contains', value: 'Funding Account' },
  { type: 'exact', value: 'Transfer Between Main and Funding Wallet' },
  { type: 'contains', value: 'Main Account/Futures and Margin Account' },
  //* Wpłaty/wypłaty
  { type: 'exact', value: 'Deposit' },
  { type: 'exact', value: 'Fiat Deposit' },
  { type: 'exact', value: 'Withdraw' },
  { type: 'exact', value: 'Fiat Withdraw' },
  { type: 'suffix', value: 'Deposit' },
  { type: 'suffix', value: 'Withdrawal' },
  { type: 'suffix', value: 'Withdraw' },
  //* NFT
  { type: 'prefix', value: 'NFT' },
  //* Dual Investment
  { type: 'prefix', value: 'Dual Investment' },
  //* Auto-Invest
  { type: 'prefix', value: 'Auto-Invest' },
  { type: 'prefix', value: 'Auto Invest' },
  //* Super BNB Mining (techniczne nie jest płatnością)
  { type: 'exact', value: 'Super BNB Mining' },
  //* Alpha 2.0
  { type: 'contains', value: 'Asset Freeze' },
]

/**
 * Spis operacji, które są klasyfikowane jako "pyłowe" (DUST_PATTERNS), dotyczą bardzo małych kwot lub ilości kryptowalut, które mogą być pomijalne z punktu widzenia rozliczeń podatkowych, ale mogą być istotne do zidentyfikowania i ewentualnego zignorowania w dalszej analizie. Kluczowe wzorce contains pozwalają wychwycić różnorodne nazewnictwo operacji "pyłowych", które często zawierają słowa "Small Assets", "Dust" lub "Convert".
 *
 * DUST_PATTERNS
 *
 * @constant {OpPattern[]} DUST_PATTERNS - Tablica wzorców dopasowania dla operacji "pyłowych"
 * @example
 * "Small Assets" - operacje związane z bardzo małymi ilościami kryptowalut, które mogą być pomijalne w rozliczeniach podatkowych
 * "Dust" - operacje związane z "pyłem" kryptowalutowym, czyli bardzo małymi ilościami, które często są konwertowane na inne tokeny lub usuwane
 */
export const DUST_PATTERNS: OpPattern[] = [
  { type: 'contains', value: 'Small Assets' },
  { type: 'contains', value: 'small assets' },
  { type: 'contains', value: 'Dust' },
  { type: 'contains', value: 'BNB Convert' },
]
