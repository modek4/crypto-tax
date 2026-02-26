# PL PIT-38 Crypto Tax Calculator
Skrypt Python do automatycznego wyliczania przychodów i kosztów z handlu kryptowalutami na giełdzie Binance, zgodnie z polskimi przepisami podatkowymi (PIT-38, sekcja E).
Wersja webowa [tutaj](https://modek4.github.io/crypto-tax/)

## Kluczowe funkcjonalności
- **Zgodność z NBP**: Automatyczne pobieranie kursów walut z [API NBP](https://api.nbp.pl/) z dnia roboczego poprzedzającego transakcję (Art. 11 ust. 1 w zw. z Art. 17 ust. 1 ustawy o PIT).
- **Inteligentne filtrowanie**: Segregacja transakcji na przychody/koszty (FIAT/Stablecoin) i neutralne (krypto-krypto).
- **Obsługa prowizji**: Wycena prowizji (Transaction Fee) w PLN - FIAT wg NBP, krypto wg Binance API.
- **Stablecoiny**: USDT/USDC/FDUSD/BUSD/DAI = 1:1 USD.
- **Raport Excel**: Przychody (34), Koszty (35), Ignorowane, Podsumowanie z podatkiem 19%.

## Ustawienia domyślne
Wewnątrz skryptu możesz skonfigurować następujące parametry:
```python
# Aktualizuj ten rok, jeśli chcesz rozliczyć inny. Pamiętaj, że musisz mieć CSV z tym rokiem, a jeśli ktoś ma inny format dat, to trzeba będzie dopasować DATE_FORMATS.
TARGET_YEAR = 2025
# Plik CSV z Binance, można go pobrać stąd https://www.binance.com/pl/my/download-center, przykład utworzenia poprawnego pliku csv w README.
CSV_FILE = "Binance.csv"
# Nazwa pliku wynikowego, można zmienić, ale lepiej zostawić z rokiem, żeby łatwo było znaleźć. Jeśli ktoś chce inny format, to trzeba będzie dopasować też nagłówki w CSV_FIELDS.
OUTPUT_FILE = f"Binance_PIT38_BEZPIECZNE_{TARGET_YEAR}.xlsx"
# Binance ma różne formaty dat w zależności od źródła, więc próbujemy kilka. Jeśli ktoś ma inny format, to trzeba będzie dodać.
DATE_FORMATS = ["%y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"]
# Klucze to nazwy kolumn z CSV, wartości to polskie nagłówki. Jeśli ktoś ma inne nagłówki, to trzeba będzie je tu dopasować.
CSV_FIELDS = {
    "time": "Czas",
    "operation": "Operacja",
    "asset": "Moneta",
    "change": "Zmień",
    "account": "Konto"
}
# Jeśli ktoś ma koszty z poprzednich lat, to można je tu dodać, żeby odjąć od przychodów i obniżyć podatek. Jeśli nie, to zostawiamy 0.
CARRIED_COSTS_FROM_PREVIOUS_YEARS = 0.0
# Dla uproszczenia zakładam, że wszystkie transakcje są w PLN lub stablecoinach, a jeśli nie, to próbuję wycenić fee na USD i przeliczyć na PLN. Jeśli ktoś ma dużo transakcji w innych walutach, to trzeba będzie dodać więcej logiki.
FIAT_CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CHF"]
# Binance ma tylko kilka stablecoinów, więc jeśli ktoś używa innych, to trzeba będzie dodać ręcznie
STABLECOINS = ["USDT", "USDC", "FDUSD", "BUSD", "DAI"]
# NBP API ma limity i może zwracać 404 dla weekendów/świąt, dlatego szukamy kursu z kilku dni wstecz
NBP_API = "https://api.nbp.pl/api/exchangerates/rates/a"
# Binance API do pobierania cen, jeśli ktoś chce użyć innego źródła, to trzeba będzie dopasować URL i parametry
BINANCE_KLINES = "https://api.binance.com/api/v3/klines"
```

## Instalacja i uruchomienie
1. Klonowanie repozytorium:
```bash
git clone https://github.com/modek4/crypto-tax.git
cd crypto-tax
```
2. Instalacja zależności:
```bash
pip install -r requirements.txt
```
3. Przygotowanie danych:
    1. Zaloguj się na Binance.
    2. Wyeksportuj pełną historię: Waluta -> Raporty podatkowe -> Generuj wszystkie instrukcje (Generate All Statements).
    3. Upewnij się, że plik CSV ma nagłówki: **Czas, Operacja, Moneta, Zmień, Konto**.
    4. Umieść plik w folderze ze skryptem i **nazwij go zgodnie z CSV_FILE**.

4. Uruchom
```bash
python pit38_crypto.py
```

5. Otwórz wygenerowany plik Excel i przepisz wartości z zakładki Podsumowanie do swojego zeznania PIT-38.
    1. Przychód -> Pole 34
    2. Koszty -> Pole 35
    3. Koszty z lat ubiegłych -> Pole 36 (wpisz ręcznie, jeśli przenosisz stratę z roku poprzedniego).

## Logika podatkowa (Art. 11a i 17 ust. 1 ustawy o PIT)
- **Moment podatkowy**: Przychód/Koszt powstaje tylko w momencie zamiany krypto na walutę FIAT (PLN, EUR, USD) lub Stablecoin.
- **Neutralność Krypto-Krypto**: Zamiana np. BTC na ETH jest ignorowana (brak obowiązku podatkowego w Polsce).
- **Kursy walut**: Skrypt automatycznie szuka kursu NBP z dnia poprzedzającego. Jeśli transakcja była w poniedziałek, pobierze kurs z piątku.
- **Prowizje (Fees)**: Prowizje w walutach FIAT/Stable są doliczane do kosztów. Prowizje w BNB ("Pay fees in BNB") są pomijane przez brak kursów NBP dla BNB (bezpieczne zaniżenie kosztów).
- **Transfery**: Przesunięcia między portfelami (np. Spot do Futures) są ignorowane.

## ⚠️ Disclaimer
1. Jeśli uważasz, że dane są rozbierzne, sprawdź w zakładce "Pominięte", czy nie znajdują się tam transakcje **Binance Convert**, które mogły zawierać wymianę do FIAT.
2. Skrypt jest narzędziem pomocniczym udostępnionym na zasadach "as is". Autor nie bierze odpowiedzialności za ewentualne błędy w rozliczeniach. **Zaleca się wyrywkową weryfikację kursów NBP z raportem Excel.**
