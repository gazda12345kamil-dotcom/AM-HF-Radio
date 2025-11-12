# 📻 AM/HF Radio (Direct Sampling)

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%205-c51a4a.svg)](https://www.raspberrypi.com/)
[![RTL-SDR](https://img.shields.io/badge/RTL--SDR-Blog%20V4-orange.svg)](https://www.rtl-sdr.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Profesjonalny odbiornik AM/HF napisany w Pythonie z nowoczesnym interfejsem graficznym. Wykorzystuje tryb **Direct Sampling** odbiornika **RTL-SDR Blog V4** do odbioru fal krótkich i średnich. Zoptymalizowany pod **Raspberry Pi 5**.

![Interfejs Radia AM/HF](https://via.placeholder.com/800x450/1a1a1a/00d9ff?text=AM+HF+Radio+Interface)

-----

## ✨ Funkcje

- 📻 **Pełne pasmo HF/MW/LW** (500 kHz - 30 MHz)
- 🎙️ **Demodulacja AM** z detekcją obwiedni
- 📡 **Tryb Direct Sampling** (Q-branch) dla RTL-SDR V4
- 🔍 **Inteligentny skaner automatyczny** z wykrywaniem szczytów
- 💾 **Pamięć stacji** z trwałym zapisem (JSON)
- 📊 **S-Meter** do monitorowania mocy kanału
- 🎚️ **Ręczna i automatyczna kontrola wzmocnienia (AGC)**
- ⏺️ **Nagrywanie audio** do plików WAV
- 🎨 **Nowoczesny ciemny interfejs** zbudowany w CustomTkinter
- ⚡ **Zoptymalizowana wydajność** dla Raspberry Pi 5
- 🔊 **Filtr pasmowy 9 kHz** dla stacji AM
- 🚫 **Filtr DC Blocker** do usuwania składowej stałej

-----

## 🎯 Platforma docelowa: Raspberry Pi 5

Ten projekt został stworzony i przetestowany specjalnie dla **Raspberry Pi 5** z systemem **Raspberry Pi OS (Bookworm)**. Wymaga **RTL-SDR Blog V4** z funkcją Direct Sampling.

-----

## ⚠️ Wymagania sprzętowe (Krytyczne!)

### RTL-SDR Blog V4 - Wymagany oryginał!

**BARDZO WAŻNE:** Ten program **wymaga oryginalnego RTL-SDR Blog V4** z obsługą Direct Sampling. Starsze wersje (V3 i wcześniejsze) oraz podróbki **nie będą działać** z tym oprogramowaniem!

#### Dlaczego tylko V4?

- ✅ **Direct Sampling Mode** - umożliwia odbiór HF (0.5-30 MHz) bez konwertera
- ✅ **Ulepszona filtracja** - lepsza jakość sygnału
- ✅ **Stabilniejsze wzmocnienie** - szczególnie ważne dla HF
- ✅ **Bias-T** - zasilanie aktywnych anten (opcjonalne)

#### Gdzie kupić oryginał:

- 🛒 **Oficjalna lista sprzedawców:** <https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/>

#### Jak rozpoznać oryginalny V4:

- ✅ Metalowa obudowa (niebieska lub srebrna)
- ✅ Wyraźne logo “RTL-SDR Blog V4” na obudowie
- ✅ Złącze antenowe SMA (antena przykręcana)
- ✅ Cena rynkowa: około $35-45 USD (ok. 140-180 PLN)

-----

## 🚀 Instalacja (Raspberry Pi 5)

### ⚠️ Uwaga: Instalacja identyczna jak dla wersji FM!

**Jeśli już zainstalowałeś sterowniki i biblioteki dla odbiornika FM, możesz pominąć kroki instalacji i przejść od razu do uruchomienia!**

Pełna instrukcja instalacji sterowników RTL-SDR Blog V4 i bibliotek Python znajduje się w repozytorium wersji FM:

🔗 **[Instrukcja instalacji - Global FM Radio](https://github.com/gazda12345kamil-dotcom/Global-FM-Radio)**

### Skrócona instrukcja (jeśli instalujesz po raz pierwszy):

#### 1. Aktualizacja systemu

```bash
sudo apt update
sudo apt upgrade -y
```

#### 2. Instalacja sterowników RTL-SDR V4

```bash
# Usuń stare sterowniki
sudo apt purge -y ^librtlsdr* ^rtl-sdr*
sudo rm -rvf /usr/lib/librtlsdr* /usr/include/rtl-sdr* /usr/local/lib/librtlsdr* /usr/local/include/rtl-sdr* /usr/local/include/rtl_* /usr/local/bin/rtl_*

# Zainstaluj narzędzia kompilacji
sudo apt-get install -y libusb-1.0-0-dev git cmake pkg-config build-essential
sudo apt-get install -y libportaudio2 portaudio19-dev python3-pip

# Pobierz i skompiluj sterowniki
git clone https://github.com/rtlsdrblog/rtl-sdr-blog
cd rtl-sdr-blog/
mkdir build
cd build
cmake ../ -DINSTALL_UDEV_RULES=ON
make

# Zainstaluj
sudo make install
sudo ldconfig

# Zablokuj domyślny sterownik DVB
echo 'blacklist dvb_usb_rtl28xxu' | sudo tee /etc/modprobe.d/blacklist-rtl-sdr.conf

# Restart
sudo reboot
```

#### 3. Sprawdzenie instalacji

```bash
rtl_test -t
```

#### 4. Instalacja bibliotek Python

```bash
pip install pyrtlsdr
pip install sounddevice
pip install numpy
pip install scipy
pip install customtkinter
pip install soundfile
```

-----

## 🎮 Uruchomienie

1. Upewnij się, że RTL-SDR V4 jest podłączony
1. Podłącz antenę HF (np. długi przewód, antena teleskopowa lub dipol)
1. Uruchom skrypt:

```bash
python3 Radio_HF:MW.py
```

-----

## 📖 Instrukcja obsługi

### Podstawowe sterowanie

- **▶️ START RADIO** - Uruchamia odbiornik w trybie Direct Sampling
- **<< / >>** - Zmiana częstotliwości o ±5 kHz
- **< / >** - Zmiana częstotliwości o ±1 kHz
- **Pole MHz** - Bezpośrednie wprowadzanie częstotliwości

### Skaner stacji

- **Skanuj Pasmo AM ▶** - Uruchamia automatyczne skanowanie
- Skaner wykrywa stacje powyżej -65 dBm (próg dostosowany do HF)
- Automatycznie zatrzymuje się na wykrytych stacjach na 5 sekund
- Wznawia skanowanie, gdy sygnał zanika
- Zakres skanowania: 1.6 - 30 MHz

### Popularne pasma AM/HF

|Pasmo  |Zakres         |Opis                          |
|-------|---------------|------------------------------|
|MW (AM)|530 - 1700 kHz |Rozgłośnie AM (fale średnie)  |
|160m   |1.8 - 2.0 MHz  |Krótkofalarstwo               |
|80m    |3.5 - 4.0 MHz  |Krótkofalarstwo               |
|60m    |5.3 - 5.4 MHz  |Krótkofalarstwo               |
|49m    |5.9 - 6.2 MHz  |Rozgłośnie międzynarodowe     |
|40m    |7.0 - 7.3 MHz  |Krótkofalarstwo + Broadcasting|
|31m    |9.4 - 9.9 MHz  |Rozgłośnie międzynarodowe     |
|25m    |11.6 - 12.1 MHz|Rozgłośnie międzynarodowe     |
|22m    |13.5 - 13.8 MHz|Rozgłośnie międzynarodowe     |
|19m    |15.1 - 15.8 MHz|Rozgłośnie międzynarodowe     |
|16m    |17.5 - 17.9 MHz|Rozgłośnie międzynarodowe     |
|15m    |21.0 - 21.5 MHz|Krótkofalarstwo               |
|13m    |21.4 - 21.8 MHz|Rozgłośnie międzynarodowe     |
|11m    |25.6 - 26.1 MHz|Rozgłośnie międzynarodowe     |

### Zapisywanie stacji

1. Nastroić na wybraną stację
1. Wpisać nazwę w pole tekstowe (np. “Polskie Radio 1”)
1. Kliknąć **Zapisz bieżącą**
1. Zapisane stacje pojawiają się na liście poniżej
1. Kliknięcie stacji na liście automatycznie się na nią stroi
1. Stacje zapisują się w pliku `hf_stations.json`

### S-Meter

Pokazuje moc kanału (po filtracji pasmowej) w skali S0-S9 oraz w dBm:

- **S0-S4:** Słaby sygnał (zielony)
- **S5-S6:** Średni sygnał (pomarańczowy)
- **S7-S9:** Mocny sygnał (czerwony)

**Uwaga:** Sygnały HF są zazwyczaj słabsze niż FM!

### Kontrola wzmocnienia

- **Auto Gain (AGC)** - Automatyczne dostosowanie wzmocnienia (zalecane dla HF)
- **Suwak Gain** - Ręczna regulacja (0-49.6 dB)

### Nagrywanie

1. Kliknąć **⏺️ RECORD** aby rozpocząć
1. Kliknąć **⏹️ STOP REC** aby zakończyć
1. Pliki zapisują się jako `recording_AM_YYYYMMDD_HHMMSS.wav`

-----

## 🔧 Rozwiązywanie problemów

### Radio się nie uruchamia lub brak dźwięku

```bash
# Sprawdź czy urządzenie jest wykryte
lsusb | grep RTL

# Test sterownika
rtl_test -t
```

### Błąd “Direct Sampling not supported”

**Sprawdź czy masz RTL-SDR Blog V4!** Starsze wersje nie obsługują Direct Sampling.

### Słaby sygnał lub tylko szumy

- ✅ **Antena to klucz!** Fale HF wymagają DŁUGIEJ anteny (kilka metrów)
- ✅ Podłącz długi przewód (3-10m) jako prowizoryczną antenę
- ✅ Umieść antenę jak najwyżej i z dala od źródeł zakłóceń (komputery, zasilacze)
- ✅ Włącz AGC lub zwiększ Gain ręcznie
- ✅ Spróbuj o zmierzchu lub w nocy (lepsza propagacja HF)
- ✅ Użyj zewnętrznej, uziemionej anteny długodrutowej

### Zakłócenia i szumy

- ⚠️ HF jest bardzo wrażliwe na zakłócenia z urządzeń elektronicznych
- Wyłącz pobliskie zasilacze impulsowe, ładowarki, LED
- Oddal RTL-SDR od komputera za pomocą przedłużacza USB
- Spróbuj w innej lokalizacji (z dala od zabudowań)

-----

## 📊 Specyfikacja techniczna

|Parametr                 |Wartość                      |
|-------------------------|-----------------------------|
|Pasmo odbioru            |500 kHz - 30 MHz             |
|Tryb Direct Sampling     |Q-branch                     |
|Częstotliwość próbkowania|288 kHz                      |
|Częstotliwość audio      |48 kHz                       |
|Demodulacja              |AM (Envelope Detection)      |
|Szerokość pasma AM       |9 kHz                        |
|Filtr DC Blocker         |HPF @ 50 Hz                  |
|Zakres wzmocnienia       |0 - 49.6 dB (29 kroków) + AGC|
|Format nagrań            |WAV (48 kHz, mono, float32)  |

-----

## 🔬 Jak działa Direct Sampling?

RTL-SDR Blog V4 ma specjalny tryb **Direct Sampling**, który pozwala ominąć tuner RF i podłączyć sygnał bezpośrednio do przetwornika ADC. To umożliwia odbiór niskich częstotliwości (HF) bez potrzeby zewnętrznego konwertera.

```
Tradycyjny odbiór FM:
Antena → Tuner RF → Mikser → IF → ADC → USB

Direct Sampling (HF):
Antena → ADC (bezpośrednio) → USB
```

-----

## 📁 Struktura plików

```
.
├── Radio_HF:MW.py        # Główny skrypt aplikacji
├── hf_stations.json      # Zapisane stacje (tworzone automatycznie)
├── recording_AM_*.wav    # Nagrania audio (tworzone przy nagrywaniu)
└── README.md             # Ten plik
```

-----

## 📚 Przydatne zasoby

- 📖 **RTL-SDR Blog V4 Guide:** <https://www.rtl-sdr.com/rtl-sdr-blog-v-4-dongles-user-guide/>
- 📡 **Direct Sampling Mode:** <https://www.rtl-sdr.com/rtl-sdr-direct-sampling-mode/>
- 🌍 **Harmonogramy stacji HF:** <http://short-wave.info/>
- 📻 **Pasma krótkofalarskie:** <https://www.arrl.org/band-plan>

-----

## 🤝 Współpraca

Zapraszamy do zgłaszania błędów i propozycji ulepszeń poprzez Issues lub Pull Requests!

-----

## 📝 Licencja

Ten projekt jest udostępniony na licencji MIT. Zobacz plik `LICENSE` po szczegóły.

-----

## 🙏 Podziękowania

- **RTL-SDR Blog** za wspaniały sprzęt i sterowniki z Direct Sampling
- **pyrtlsdr** za bibliotekę Python
- **CustomTkinter** za nowoczesne komponenty GUI
- Społeczność **Raspberry Pi** za wsparcie
- Społeczność **krótkofalarstwa** za pomoc w testach

-----

## 🔗 Powiązane projekty

- 📻 **[Global FM Radio](https://github.com/gazda12345kamil-dotcom/Global-FM-Radio)** - Wersja FM tego samego projektu

-----

## 📧 Kontakt

Masz pytania? Otwórz Issue na GitHubie!

-----

**Dobrej zabawy z falami krótkimi! 📻📡**
