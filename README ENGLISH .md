# 📻 AM/HF Radio (Direct Sampling)

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%205-c51a4a.svg)](https://www.raspberrypi.com/)
[![RTL-SDR](https://img.shields.io/badge/RTL--SDR-Blog%20V4-orange.svg)](https://www.rtl-sdr.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Professional AM/HF radio receiver written in Python with a modern GUI. Uses **Direct Sampling** mode of the **RTL-SDR Blog V4** to receive shortwave and mediumwave bands. Optimized for **Raspberry Pi 5**.

![AM/HF Radio Interface](https://via.placeholder.com/800x450/1a1a1a/00d9ff?text=AM+HF+Radio+Interface)

-----

## ✨ Features

- 📻 **Full HF/MW/LW Band Coverage** (500 kHz - 30 MHz)
- 🎙️ **AM Demodulation** with envelope detection
- 📡 **Direct Sampling Mode** (Q-branch) for RTL-SDR V4
- 🔍 **Intelligent Auto-Scanner** with peak detection
- 💾 **Station Memory** with persistent storage (JSON)
- 📊 **S-Meter** for channel power monitoring
- 🎚️ **Manual & Auto Gain Control (AGC)**
- ⏺️ **Audio Recording** to WAV files
- 🎨 **Modern Dark UI** built with CustomTkinter
- ⚡ **Optimized Performance** for Raspberry Pi 5
- 🔊 **9 kHz Bandpass Filter** for AM stations
- 🚫 **DC Blocker Filter** to remove DC offset

-----

## 🎯 Target Platform: Raspberry Pi 5

This project was developed and tested specifically for **Raspberry Pi 5** running **Raspberry Pi OS (Bookworm)**. Requires **RTL-SDR Blog V4** with Direct Sampling capability.

-----

## ⚠️ Hardware Requirements (Critical!)

### RTL-SDR Blog V4 - Original Required!

**VERY IMPORTANT:** This program **requires the genuine RTL-SDR Blog V4** with Direct Sampling support. Older versions (V3 and earlier) and counterfeits **will not work** with this software!

#### Why V4 Only?

- ✅ **Direct Sampling Mode** - enables HF reception (0.5-30 MHz) without upconverter
- ✅ **Improved Filtering** - better signal quality
- ✅ **More Stable Gain** - especially important for HF
- ✅ **Bias-T** - powers active antennas (optional)

#### Where to Buy Original:

- 🛒 **Official Sellers List:** <https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/>

#### How to Identify Original V4:

- ✅ Metal enclosure (blue or silver)
- ✅ Clear “RTL-SDR Blog V4” logo on the case
- ✅ SMA antenna connector (screw-on)
- ✅ Market price: approximately $35-45 USD

-----

## 🚀 Installation (Raspberry Pi 5)

### ⚠️ Note: Installation identical to FM version!

**If you’ve already installed drivers and Python libraries for the FM receiver, you can skip the installation steps and go directly to running the application!**

Full installation instructions for RTL-SDR Blog V4 drivers and Python libraries can be found in the FM version repository:

🔗 **[Installation Guide - Global FM Radio](https://github.com/gazda12345kamil-dotcom/Global-FM-Radio)**

### Quick Guide (if installing for the first time):

#### 1. System Update

```bash
sudo apt update
sudo apt upgrade -y
```

#### 2. Install RTL-SDR V4 Drivers

```bash
# Remove old drivers
sudo apt purge -y ^librtlsdr* ^rtl-sdr*
sudo rm -rvf /usr/lib/librtlsdr* /usr/include/rtl-sdr* /usr/local/lib/librtlsdr* /usr/local/include/rtl-sdr* /usr/local/include/rtl_* /usr/local/bin/rtl_*

# Install build tools
sudo apt-get install -y libusb-1.0-0-dev git cmake pkg-config build-essential
sudo apt-get install -y libportaudio2 portaudio19-dev python3-pip

# Download and compile drivers
git clone https://github.com/rtlsdrblog/rtl-sdr-blog
cd rtl-sdr-blog/
mkdir build
cd build
cmake ../ -DINSTALL_UDEV_RULES=ON
make

# Install
sudo make install
sudo ldconfig

# Blacklist default DVB driver
echo 'blacklist dvb_usb_rtl28xxu' | sudo tee /etc/modprobe.d/blacklist-rtl-sdr.conf

# Reboot
sudo reboot
```

#### 3. Verify Installation

```bash
rtl_test -t
```

#### 4. Install Python Libraries

```bash
pip install pyrtlsdr
pip install sounddevice
pip install numpy
pip install scipy
pip install customtkinter
pip install soundfile
```

-----

## 🎮 Running the Application

1. Ensure RTL-SDR V4 is connected
1. Connect HF antenna (e.g., long wire, telescopic antenna, or dipole)
1. Run the script:

```bash
python3 Radio_HF:MW.py
```

-----

## 📖 User Guide

### Basic Controls

- **▶️ START RADIO** - Starts receiver in Direct Sampling mode
- **<< / >>** - Change frequency by ±5 kHz
- **< / >** - Change frequency by ±1 kHz
- **MHz Field** - Direct frequency input

### Station Scanner

- **Scan AM Band ▶** - Starts automatic scanning
- Scanner detects stations above -65 dBm (threshold adjusted for HF)
- Automatically pauses on detected stations for 5 seconds
- Resumes scanning when signal fades
- Scan range: 1.6 - 30 MHz

### Popular AM/HF Bands

|Band   |Range          |Description                        |
|-------|---------------|-----------------------------------|
|MW (AM)|530 - 1700 kHz |AM broadcast stations (medium wave)|
|160m   |1.8 - 2.0 MHz  |Amateur radio                      |
|80m    |3.5 - 4.0 MHz  |Amateur radio                      |
|60m    |5.3 - 5.4 MHz  |Amateur radio                      |
|49m    |5.9 - 6.2 MHz  |International broadcasting         |
|40m    |7.0 - 7.3 MHz  |Amateur radio + Broadcasting       |
|31m    |9.4 - 9.9 MHz  |International broadcasting         |
|25m    |11.6 - 12.1 MHz|International broadcasting         |
|22m    |13.5 - 13.8 MHz|International broadcasting         |
|19m    |15.1 - 15.8 MHz|International broadcasting         |
|16m    |17.5 - 17.9 MHz|International broadcasting         |
|15m    |21.0 - 21.5 MHz|Amateur radio                      |
|13m    |21.4 - 21.8 MHz|International broadcasting         |
|11m    |25.6 - 26.1 MHz|International broadcasting         |

### Saving Stations

1. Tune to desired station
1. Enter name in text field (e.g., “BBC World Service”)
1. Click **Save Current**
1. Saved stations appear in the list below
1. Clicking a station in the list tunes to it automatically
1. Stations are saved in `hf_stations.json` file

### S-Meter

Shows channel power (after bandpass filtering) in S0-S9 scale and dBm:

- **S0-S4:** Weak signal (green)
- **S5-S6:** Medium signal (orange)
- **S7-S9:** Strong signal (red)

**Note:** HF signals are typically weaker than FM!

### Gain Control

- **Auto Gain (AGC)** - Automatic gain adjustment (recommended for HF)
- **Gain Slider** - Manual control (0-49.6 dB)

### Recording

1. Click **⏺️ RECORD** to start
1. Click **⏹️ STOP REC** to finish
1. Files are saved as `recording_AM_YYYYMMDD_HHMMSS.wav`

-----

## 🔧 Troubleshooting

### Radio won’t start or no audio

```bash
# Check if device is detected
lsusb | grep RTL

# Test driver
rtl_test -t
```

### Error “Direct Sampling not supported”

**Check if you have RTL-SDR Blog V4!** Older versions don’t support Direct Sampling.

### Weak signal or only noise

- ✅ **Antenna is key!** HF waves require a LONG antenna (several meters)
- ✅ Connect a long wire (3-10m) as a makeshift antenna
- ✅ Place antenna as high as possible and away from interference sources (computers, power supplies)
- ✅ Enable AGC or increase Gain manually
- ✅ Try at dusk or night (better HF propagation)
- ✅ Use an external, grounded long-wire antenna

### Interference and noise

- ⚠️ HF is very susceptible to interference from electronic devices
- Turn off nearby switching power supplies, chargers, LEDs
- Move RTL-SDR away from computer using USB extension cable
- Try in a different location (away from buildings)

-----

## 📊 Technical Specifications

|Parameter           |Value                       |
|--------------------|----------------------------|
|Reception Band      |500 kHz - 30 MHz            |
|Direct Sampling Mode|Q-branch                    |
|Sample Rate         |288 kHz                     |
|Audio Rate          |48 kHz                      |
|Demodulation        |AM (Envelope Detection)     |
|AM Bandwidth        |9 kHz                       |
|DC Blocker Filter   |HPF @ 50 Hz                 |
|Gain Range          |0 - 49.6 dB (29 steps) + AGC|
|Recording Format    |WAV (48 kHz, mono, float32) |

-----

## 🔬 How Direct Sampling Works

RTL-SDR Blog V4 has a special **Direct Sampling** mode that allows bypassing the RF tuner and connecting the signal directly to the ADC converter. This enables reception of low frequencies (HF) without the need for an external upconverter.

```
Traditional FM Reception:
Antenna → RF Tuner → Mixer → IF → ADC → USB

Direct Sampling (HF):
Antenna → ADC (directly) → USB
```

-----

## 📁 File Structure

```
.
├── Radio_HF:MW.py        # Main application script
├── hf_stations.json      # Saved stations (created automatically)
├── recording_AM_*.wav    # Audio recordings (created when recording)
└── README.md             # This file
```

-----

## 📚 Useful Resources

- 📖 **RTL-SDR Blog V4 Guide:** <https://www.rtl-sdr.com/rtl-sdr-blog-v-4-dongles-user-guide/>
- 📡 **Direct Sampling Mode:** <https://www.rtl-sdr.com/rtl-sdr-direct-sampling-mode/>
- 🌍 **HF Station Schedules:** <http://short-wave.info/>
- 📻 **Amateur Radio Bands:** <https://www.arrl.org/band-plan>

-----

## 🤝 Contributing

Bug reports and feature requests are welcome via Issues or Pull Requests!

-----

## 📝 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

-----

## 🙏 Acknowledgments

- **RTL-SDR Blog** for excellent hardware and drivers with Direct Sampling
- **pyrtlsdr** for the Python library
- **CustomTkinter** for modern GUI components
- **Raspberry Pi** community for support
- **Amateur radio** community for help with testing

-----

## 🔗 Related Projects

- 📻 **[Global FM Radio](https://github.com/gazda12345kamil-dotcom/Global-FM-Radio)** - FM version of this project

-----

## 📧 Contact

Have questions? Open an Issue on GitHub!

-----

**Happy shortwave listening! 📻📡**