# PIT-38 Crypto — Binance
## ➡️ [OPEN ME](https://modek4.github.io/crypto-tax/) ⬅️

> README and Code Comments in Polish, because tax settlements in Poland

Aplikacja webowa do rozliczania podatku PIT-38 od zysków z kryptowalut na Binance.
Działa w 100% lokalnie w przeglądarce — żadne dane nie są wysyłane na serwer.
Wersja w pythonie do odpalenia lokalnie na branchu python.

## Technologie

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS**
- **SheetJS (xlsx)**
- **NBP API** kursy walut (tabela A, kurs z dnia poprzedzającego transakcję)
- **Binance Klines API** (wycena kryptowalut 1h świece)

## Podstawa prawna
> PRZECZYTAJ MNIE CAŁEGO, ZANIM UŻYJESZ
### Art. 17 ust. 1f updof  — definicja odpłatnego zbycia waluty wirtualnej
Przez odpłatne zbycie waluty wirtualnej rozumie się wymianę waluty wirtualnej na prawny środek płatniczy, towar, usługę lub prawo majątkowe inne niż waluta wirtualna lub regulowanie innych zobowiązań walutą wirtualną.
### Art. 17 ust. 1g updof  — kwalifikacja jako kapitały pieniężne
Przepis ust. 1 pkt 11 stosuje się również do przychodów uzyskanych w ramach prowadzonej działalności gospodarczej, z wyjątkiem działalności, o której mowa w art. 2 ust. 1 pkt 12 ustawy o przeciwdziałaniu praniu pieniędzy oraz finansowaniu terroryzmu, zaliczanej do przychodów z pozarolniczej działalności gospodarczej.
### Art. 22 ust. 14-16 updof — koszty uzyskania przychodu
#### 14.
Koszty uzyskania przychodów z tytułu odpłatnego zbycia waluty wirtualnej stanowią udokumentowane wydatki bezpośrednio poniesione na nabycie waluty wirtualnej oraz koszty związane ze zbyciem waluty wirtualnej, w tym udokumentowane wydatki poniesione na rzecz podmiotów, o których mowa w art. 2 ust. 1 pkt 12 ustawy o przeciwdziałaniu praniu pieniędzy oraz finansowaniu terroryzmu
#### 15.
Koszty uzyskania przychodów, o których mowa w ust. 14, są potrącane w tym roku podatkowym, w którym zostały poniesione, z zastrzeżeniem ust. 16.
#### 16.
Nadwyżka kosztów uzyskania przychodów, o których mowa w ust. 14, nad przychodami z odpłatnego zbycia waluty wirtualnej uzyskanymi w roku podatkowym powiększa koszty uzyskania przychodów z tytułu odpłatnego zbycia waluty wirtualnej poniesione w następnym roku podatkowym.
### Art. 30b ust. 1a/1b updof — stawka 19%, definicja dochodu
#### 1a.
Od dochodów uzyskanych z odpłatnego zbycia walut wirtualnych podatek dochodowy wynosi 19% uzyskanego dochodu.
#### 1b.
Dochodem z odpłatnego zbycia walut wirtualnych jest osiągnięta w roku podatkowym różnica między sumą przychodów uzyskanych z tytułu odpłatnego zbycia walut wirtualnych a kosztami uzyskania przychodów określonymi na podstawie art. 22 ust. 14-16.
### Art. 30b ust. 5d updof  — zakaz łączenia z innymi kapitałami
Dochodów z odpłatnego zbycia walut wirtualnych nie łączy się z dochodami opodatkowanymi na zasadach określonych w ust. 1 oraz w art. 27 lub art. 30c.
### Art. 30b ust. 6/6a updof — obowiązek złożenia PIT-38
#### 6.
Po zakończeniu roku podatkowego podatnik jest obowiązany w zeznaniu, o którym mowa w art. 45 ust. 1a pkt 1, wykazać uzyskane w roku podatkowym dochody, o których mowa w ust. 1 i 1a, i obliczyć należny podatek dochodowy.
#### 6a.
W zeznaniu, o którym mowa w art. 45 ust. 1a pkt 1, podatnik wykazuje koszty uzyskania przychodów, o których mowa w art. 22 ust. 14-16, także wtedy, gdy w roku podatkowym nie uzyskał przychodów z odpłatnego zbycia walut wirtualnych.

### CAŁOŚĆ PRAWA PODATKOWEGO 2026.01.01:
https://przepisy.gofin.pl/przepisy,4,16,13,700,,20260101,ustawa-z-dnia-26071991-r-o-podatku-dochodowym-od-osob.html

## Uruchomienie lokalne

```bash
git clone https://github.com/modek4/crypto-tax
cd crypto-tax
npm install
npm run dev
```

## Jak pobrać plik CSV z Binance

1. Zaloguj się na Binance
2. Przejdź do **[Download Center](https://www.binance.com/pl/my/download-center)**
3. Wybierz **"Generate all statements"**
4. Wybierz rok i kliknij **Generate**
5. Pobierz plik `.csv` i usuń zbędne nagłówki (przykładowy plik Example.csv)
6. Wrzuć do aplikacji

## Ważne uwagi

- Futures i Margin **nie są obsługiwane** — wymagają osobnej analizy prawnej
- Nadwyżkę kosztów z danego roku wpisz jako "Koszty przeniesione" w kolejnym roku
- Zawsze zweryfikuj wynik z doradcą podatkowym przed złożeniem PIT-38
