# =============================================================================
# KONFIGURACJA — dostosuj do swojego przypadku
# =============================================================================

# Rok podatkowy do rozliczenia
TARGET_YEAR = 2025

# Ścieżka do pliku CSV pobranego z Binance (Szczegóły w README)
# https://www.binance.com/pl/my/download-center
CSV_FILE = "Binance.csv"

# Separator w pliku CSV (Binance używa przecinka lub średnika)
CSV_SEPARATOR = ";"

# Nazwa pliku wynikowego
OUTPUT_FILE = f"Binance_PIT38_{TARGET_YEAR}.xlsx"

# Możliwe formaty dat w eksporcie Binance
# Jeśli Twój plik ma inny format, dodaj go tutaj. Skrypt będzie próbował je wszystkie.
DATE_FORMATS = [
    "%Y-%m-%d %H:%M:%S",   # najczęstszy format Binance
    "%y-%m-%d %H:%M:%S",   # format skrócony
    "%d-%m-%Y %H:%M:%S",   # format europejski
    "%d-%m-%y %H:%M:%S",
    "%m/%d/%Y %H:%M:%S",
]

# Nazwy kolumn w CSV Binance (standard "Generate All Statements")
# Jeśli Twój plik ma inne nagłówki, zmień tu
# Kod dostosowuje się do polskich i angielskich nagłówków, ale jeśli masz inne, to trzeba będzie je tu dopasować.
CSV_FIELDS = {
    "time":      "UTC_Time",    # PL: "Czas"        EN: "UTC_Time"
    "operation": "Operation",   # PL: "Operacja"    EN: "Operation"
    "asset":     "Coin",        # PL: "Moneta"      EN: "Coin"
    "change":    "Change",      # PL: "Zmień"       EN: "Change"
    "account":   "Account",     # PL: "Konto"       EN: "Account"
    "remark":    "Remark",      # PL: "Uwagi"       EN: "Remark"
}

# Nadwyżka kosztów NIEODLICZONA z poprzednich lat podatkowych (art. 22 ust. 16 updof)
# To specyficzna nadwyżka, która powiększa koszty tego roku.
# Jeśli rozliczasz pierwszy rok: zostaw 0.0
CARRIED_COSTS_FROM_PREVIOUS_YEARS = 0.0

# Waluty fiducjarne (fiat) — wymiana krypto→fiat to ZDARZENIE PODATKOWE
FIAT_CURRENCIES = {"PLN", "EUR", "USD", "GBP", "CHF", "BIDR", "BRL", "AUD", "TRY", "RUB", "UAH", "NGN", "ZAR"}

# Stablecoiny — na gruncie polskiego prawa (stanowisko KIS 2024/2025)
# Wymiana krypto→stablecoin jest NEUTRALNA podatkowo (tak jak krypto→krypto)
# UWAGA: To może się zmienić — zależy co stwierdzi KIS!
STABLECOINS = {"USDT", "USDC", "FDUSD", "BUSD", "DAI", "TUSD", "USDP", "GUSD", "PYUSD"}

# URL API
NBP_API_BASE    = "https://api.nbp.pl/api/exchangerates/rates/a"
BINANCE_KLINES  = "https://api.binance.com/api/v3/klines"

# =============================================================================
# KLASYFIKACJA OPERACJI BINANCE
# =============================================================================

# Operacje generujące KOSZT NABYCIA (fiat wychodzi, krypto wchodzi)
# lub PRZYCHÓD ZE SPRZEDAŻY (krypto wychodzi, fiat wchodzi)
TRADE_OPS = {
    "Transaction Spend",         # wydatek przy zakupie
    "Transaction Revenue",       # przychód ze sprzedaży
    "Transaction Related",       # powiązana z transakcją (stara nazwa)
    "Binance Convert",           # konwersja (może być krypto→krypto lub krypto→fiat)
    "Buy",                       # zakup krypto za fiat
    "Sell",                      # sprzedaż krypto za fiat
    "Large OTC trading",         # handel OTC
    "P2P Trading",               # handel P2P
    "Fiat Deposit",              # wpłata fiat (razem z Buy może tworzyć koszt)
    "Fiat Withdraw",             # wypłata fiat
}

# Operacje generujące PRZYCHÓD PODLEGAJĄCY OPODATKOWANIU
# (wartość krypto w dniu otrzymania = przychód + staje się kosztem przy sprzedaży)
# Podstawa: art. 17 ust. 1f updof — "inne formy uzyskania walut wirtualnych"
# UWAGA: Polskie organy podatkowe coraz częściej kwalifikują staking jako przychód
TAXABLE_INCOME_OPS = {
    # Staking / Staking Rewards
    "ETH 2.0 Staking Rewards",
    "Staking Rewards",
    "DOT Staking Rewards",
    "SOL Staking Rewards",
    "ADA Staking Rewards",
    # Simple Earn (Savings)
    "Simple Earn Flexible Interest",
    "Simple Earn Locked Rewards",
    "Simple Earn Flexible Airdrop",
    "Savings Interest",
    "Savings Distribution",
    # Launchpool
    "Launchpool Earnings",
    "Launchpool Earnings Distribution",
    "Launchpool Interest",
    # Referrals i cashback
    "Referral Kickback",
    "Commission History",
    "Commission Rebate",
    "Cash Voucher distribution",
    # Airdrop i dystrybucje
    "Distribution",              # ogólna dystrybucja (airdrop, HODLer rewards)
    "Mission Reward Distribution",
    "Crypto Box",                # Red Packet, skrzynka krypto
    # Inne dochody
    "Token Swap Restitution",
    "Alpha 2.0 Tokens Distribution",
    "Binance Convert Bonus",
    "Auto-Invest Transaction",   # tylko jeśli wchodzi krypto
}

# Operacje techniczne (freezing/unfreezing, transfery wewnętrzne) — NEUTRALNE
TECHNICAL_OPS = {
    "Freeze",
    "Unfreeze",
    "Savings purchase",
    "Savings Principal redemption",
    "POS savings purchase",
    "POS savings redemption",
    "Simple Earn Flexible Subscription",
    "Simple Earn Flexible Redemption",
    "Simple Earn Locked Subscription",
    "Simple Earn Locked Redemption",
    "Liquid Swap Add",
    "Liquid Swap Remove",
    "Liquid Swap Rewards",
    "transfer_in",
    "transfer_out",
    "Main and Funding Account Transfer",
    "Fiat Deposit",
    "Deposit",
    "Withdraw",
    "Card Cashback",
    "NFT Transaction",
    "NFT Gas Fee",
    "Super BNB Mining",
    "Pool Distribution",        # Mining pool — osobna kwestia prawna, tu pomijamy
    "Dual Investment Subscribe",
    "Dual Investment Settlement",
    "Dual Investment Auto Compound",
}

# URL do pobrania danych z Binance (instrukcje w README)
BINANCE_DOWNLOAD_URL = "https://www.binance.com/pl/my/download-center"