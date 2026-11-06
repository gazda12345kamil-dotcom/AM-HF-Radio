# Uczciwy Mechanik

Aplikacja internetowa (działa na telefonie i komputerze), która pomaga nie przepłacać u mechanika.

- **Sprawdź wycenę** – zrób zdjęcie wyceny lub faktury z warsztatu albo wpisz pozycje ręcznie. Aplikacja porówna każdą pozycję z typowymi cenami części i robocizny w Polsce, wyjaśni prostym językiem, co to za naprawa, czy jest pilna i czy można jeszcze jeździć, oraz podpowie, o co zapytać mechanika.
- **Sprawdź auto** – wpisz numer VIN: aplikacja sprawdzi, czy jest poprawny, odczyta producenta, kraj i możliwy rok modelowy, pobierze dane z darmowej bazy NHTSA i pokaże, gdzie za darmo sprawdzić historię auta (historiapojazdu.gov.pl, UFG). Do tego lista kontrolna przed zakupem.
- **Historia** – zapisane sprawdzenia, suma wycen i możliwe przepłaty.
- **Cennik** – plany z limitem sprawdzeń zdjęć miesięcznie.

## Uruchomienie

Potrzebny jest Node.js 20 lub nowszy.

```bash
npm install
cp .env.example .env.local   # opcjonalnie – bez klucza działa tryb demo
npm run dev                  # http://localhost:3000
```

Inne polecenia:

```bash
npm test         # testy
npm run lint     # sprawdzenie typów
npm run build    # wersja produkcyjna
npm start        # uruchomienie wersji produkcyjnej
npm run build:static  # wersja testowa w jednym pliku: dist-static/index.html
```

## Wersja testowa w jednym pliku

`npm run build:static` buduje całą aplikację do jednego pliku HTML (`dist-static/index.html`), który działa bez serwera: ocena cen i VIN liczone są w przeglądarce, a odczyt zdjęć jest w trybie demo. Kod w katalogu `static/` podmienia tylko połączenie z serwerem (`src/lib/api.ts` → `static/api-local.ts`) i nawigację Next.js na nawigację po `#adresach`.

## Podłączenie AI (OpenRouter)

Bez klucza aplikacja działa w **trybie demo**: zamiast odczytu zdjęcia pokazuje przykładową wycenę. Ręczne sprawdzanie wycen i VIN działa w pełni bez AI.

1. Załóż klucz na https://openrouter.ai/keys
2. W pliku `.env.local` (lokalnie) albo w ustawieniach hostingu wpisz:
   ```
   OPENROUTER_API_KEY=twój_klucz
   OPENROUTER_MODEL=anthropic/claude-sonnet-5.5
   ```
   Model musi obsługiwać obrazy. Dokładną nazwę sprawdź na https://openrouter.ai/models.
3. Uruchom aplikację ponownie.

AI tylko **odczytuje** zdjęcie (pozycje i kwoty). Ocena cen jest liczona przez aplikację na podstawie bazy cen, więc wynik jest powtarzalny i nie zależy od „humoru” modelu.

## Baza cen

Plik `src/lib/pricing/data.ts` zawiera **startową, orientacyjną** bazę ok. 25 typowych napraw: ceny części (zł brutto, auto klasy średniej), czas pracy w roboczogodzinach, stawki godzinowe (warsztat niezależny i ASO) oraz mnożniki dla klasy auta.

Żeby podpiąć prawdziwe cenniki (hurtownie części, katalogi czasów napraw), wystarczy podmienić dane w tym pliku albo wczytywać je z bazy danych – reszta aplikacji się nie zmienia.

## Jak liczona jest ocena

Dla każdej pozycji: typowa cena = części × mnożnik klasy + roboczogodziny × stawka warsztatu.

| Ocena | Kiedy |
|---|---|
| Taniej niż zwykle | poniżej 85% dolnej granicy |
| Uczciwa cena | w typowym przedziale |
| Trochę drożej | do 20% powyżej górnej granicy (albo sama robocizna lub części są zawyżone) |
| Drogo | ponad 20% powyżej górnej granicy |

## Struktura

```
src/app/            ekrany (start, wycena, auto, historia, cennik) i API
src/app/api/        analyze – ocena wyceny, vin – sprawdzanie VIN, status – czy AI jest podłączone
src/lib/pricing/    baza cen i silnik oceny
src/lib/ai/         odczyt zdjęć przez OpenRouter + tryb demo
src/lib/vin.ts      dekoder VIN
src/lib/plans.ts    plany i limity
src/lib/analyze-request.ts  wspólna logika oceny (serwer i wersja testowa)
static/             wersja testowa w jednym pliku
src/components/     wspólne elementy wyglądu
tests/              testy
```

## Czego jeszcze nie ma (kolejne kroki)

- **Konta użytkowników** – teraz historia i licznik sprawdzeń są zapisywane tylko w przeglądarce, na jednym urządzeniu.
- **Płatności** – plany są opisane w cenniku, ale nie da się ich jeszcze kupić. Limit zdjęć jest liczony w przeglądarce; serwer dodatkowo ogranicza liczbę sprawdzeń z jednego adresu IP dziennie (`DAILY_LIMIT_PER_IP`).
- **Pliki PDF** – na razie tylko zdjęcia.
- **Prawdziwe cenniki** – zamiast bazy startowej.

## Zastrzeżenie

Oceny cen są szacunkami i nie zastępują opinii mechanika ani porady prawnej.
