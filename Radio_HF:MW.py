#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Aplikacja SDR do odbioru AM na falach krótkich/średnich (HF/MW)
Bazowane na "Final, Optimized FM-Only SDR Radio"
Wymaga RTL-SDR Blog V4 (dla Direct Sampling)
"""

import customtkinter as ctk
from rtlsdr import RtlSdr
import numpy as np
import sounddevice as sd
from scipy import signal
from scipy.signal import butter, lfilter, resample_poly
import threading
import queue
import time
from datetime import datetime
import soundfile as sf
import json 
import os 

# Konfiguracja CustomTkinter
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class SDRRadioHF(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Konfiguracja okna
        self.title("📻 AM/HF Radio (Direct Sampling)")
        self.geometry("1200x600") 
        
        # Zmienne SDR
        self.sdr = None
        self.is_running = False
        self.audio_queue = queue.Queue(maxsize=10)
        self.current_freq = 7.2e6 # Domyślnie pasmo 40m
        self.sample_rate = 288e3 
        self.audio_rate = 48000
        self.gain = 'auto' 
        self.volume = 0.5
        self.recording = False
        self.record_buffer = []
        
        # Tryb AM
        self.mode = "AM"
        self.am_bandwidth = 9000 # 9 kHz dla stacji AM
        
        # Zmienne optymalizacyjne
        self.current_dbm = -120.0 
        self.last_spectrum_update = 0 
        
        # Zmienne do obsługi stabilnego rozmiaru
        self.is_resizing = False
        self.resize_timer = None
        
        # Zmienne skanera
        self.is_scanning = False
        self.scan_thread = None
        self.scan_paused_on_freq = False 
        self.scan_pause_time = 0      
        
        # Logika zapisanych stacji (plik hf_stations.json)
        self.stations_file = "hf_stations.json"
        self.saved_stations = []
        self.load_stations_from_file() 
        
        # Filtry (zainicjowane w start_radio)
        self.am_b = None
        self.am_a = None
        self.dc_b = None
        self.dc_a = None
        
        self.setup_ui()
        self.update_s_meter()
        
        # Bindowanie zmiany rozmiaru okna
        self.bind("<Configure>", self.on_resize)
        
    def setup_ui(self):
        # Konfiguracja siatki (Grid)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0) 

        # === LEWA KOLUMNA (Spektrum i Stacje) ===
        left_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        left_frame.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        left_frame.grid_rowconfigure(1, weight=1) 
        left_frame.grid_columnconfigure(0, weight=1)

        # GÓRNY PANEL - Spektrum
        top_panel = ctk.CTkFrame(left_frame, corner_radius=15, fg_color=("#2b2b2b", "#1a1a1a"))
        top_panel.grid(row=0, column=0, sticky="ew", padx=5, pady=5)
        
        self.spectrum_canvas = ctk.CTkCanvas(
            top_panel, 
            bg="#0a0a0a", 
            highlightthickness=0,
            height=200 
        )
        self.spectrum_canvas.pack(fill="both", expand=True, padx=15, pady=15)
        
        # DOLNY PANEL - Panel zapisanych stacji
        bottom_panel = ctk.CTkFrame(left_frame, corner_radius=15, fg_color=("#2b2b2b", "#1a1a1a"))
        bottom_panel.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
        bottom_panel.grid_columnconfigure(0, weight=1)
        bottom_panel.grid_rowconfigure(2, weight=1) 

        ctk.CTkLabel(
            bottom_panel,
            text="💾 ZAPISANE STACJE HF/AM",
            font=ctk.CTkFont(size=18, weight="bold"), 
            text_color=("#00d9ff", "#00d9ff")
        ).grid(row=0, column=0, pady=10, padx=15)
        
        # Ramka do dodawania nowych stacji
        add_frame = ctk.CTkFrame(bottom_panel, fg_color="transparent")
        add_frame.grid(row=1, column=0, sticky="ew", padx=15, pady=(0, 10))
        add_frame.grid_columnconfigure(0, weight=1)
        
        self.station_name_entry = ctk.CTkEntry(
            add_frame,
            placeholder_text="Wpisz nazwę stacji (np. 'Polskie Radio 1')...",
            font=ctk.CTkFont(size=15) 
        )
        self.station_name_entry.grid(row=0, column=0, sticky="ew", padx=(0, 10))
        
        self.save_station_btn = ctk.CTkButton(
            add_frame,
            text="Zapisz bieżącą",
            width=120,
            font=ctk.CTkFont(size=14), 
            command=self.save_new_station
        )
        self.save_station_btn.grid(row=0, column=1, sticky="e")
        
        # Lista zapisanych stacji
        self.station_list_frame = ctk.CTkScrollableFrame(bottom_panel, corner_radius=10)
        self.station_list_frame.grid(row=2, column=0, sticky="nsew", padx=15, pady=(0, 15))
        
        self.populate_station_list() 
        
        # === PRAWA KOLUMNA (Kontrolki) ===
        right_frame = ctk.CTkScrollableFrame(self, corner_radius=15, width=300, fg_color=("#2b2b2b", "#1a1a1a"))
        right_frame.grid(row=0, column=1, sticky="ns", padx=(0, 10), pady=10)

        # KONTROLKI CZĘSTOTLIWOŚCI
        freq_display_frame = ctk.CTkFrame(right_frame, corner_radius=10, fg_color=("#000000", "#000000"), border_width=2, border_color=("#00d9ff", "#00d9ff"))
        freq_display_frame.pack(fill="x", padx=15, pady=15)
        
        self.freq_display = ctk.CTkLabel(
            freq_display_frame,
            text="7.200 MHz",
            font=ctk.CTkFont(size=32, weight="bold", family="Courier New"), 
            text_color=("#00ff00", "#00ff00")
        )
        self.freq_display.pack(pady=10)
        
        freq_controls = ctk.CTkFrame(right_frame, fg_color="transparent")
        freq_controls.pack(fill="x", pady=(0, 10), padx=15)
        
        # Zmienione kroki strojenia na kHz
        steps = [("<< -5k", -5e3), ("< -1k", -1e3), ("> +1k", 1e3), (">> +5k", 5e3)]
        btn_frame = ctk.CTkFrame(freq_controls, fg_color="transparent")
        btn_frame.pack()

        for text, step in steps:
            btn = ctk.CTkButton(
                btn_frame, text=text, width=60, height=30,
                command=lambda s=step: self.change_frequency(s), # Zmieniona komenda
                fg_color=("#1f6aa5", "#1f6aa5"), hover_color=("#144870", "#144870"),
                font=ctk.CTkFont(size=14)
            )
            btn.pack(side="left", padx=2)
        
        input_frame = ctk.CTkFrame(freq_controls, fg_color="transparent")
        input_frame.pack(fill="x", pady=10)
        
        ctk.CTkLabel(input_frame, text="MHz:", font=ctk.CTkFont(size=15, weight="bold")).pack(side="left")
        
        self.freq_entry = ctk.CTkEntry(
            input_frame, width=100, height=30,
            placeholder_text="7.200", font=ctk.CTkFont(size=15)
        )
        self.freq_entry.pack(side="left", padx=5, expand=True)
        
        ctk.CTkButton(
            input_frame, text="🎯 Ustaw", width=60, height=30,
            command=self.set_frequency_manual,
            fg_color=("#00d9ff", "#00d9ff"), text_color=("#000000", "#000000"),
            hover_color=("#00a8cc", "#00a8cc"), font=ctk.CTkFont(size=14)
        ).pack(side="left", padx=5)
        
        self.scan_button = ctk.CTkButton(
            right_frame, 
            text="Skanuj Pasmo AM ▶",
            height=40, 
            font=ctk.CTkFont(size=15, weight="bold"),
            command=self.toggle_scan,
            fg_color="#ff8800", hover_color="#cc6600"
        )
        self.scan_button.pack(fill="x", padx=15, pady=5) 
        
        # KONTROLKI S-METER
        smeter_frame = ctk.CTkFrame(right_frame, corner_radius=10, fg_color=("#1a1a1a", "#0f0f0f"))
        smeter_frame.pack(fill="x", padx=15, pady=10)
        ctk.CTkLabel(smeter_frame, text="📊 S-METER (Moc kanału)", font=ctk.CTkFont(size=16, weight="bold"), text_color=("#00d9ff", "#00d9ff")).pack(pady=(10, 5))
        self.s_meter_canvas = ctk.CTkCanvas(smeter_frame, bg="#000000", height=40, highlightthickness=0)
        self.s_meter_canvas.pack(fill="x", padx=15, pady=(0, 10))
        self.s_value_label = ctk.CTkLabel(smeter_frame, text="S0 | -120 dBm", font=ctk.CTkFont(size=18, weight="bold"), text_color=("#ffaa00", "#ffaa00"))
        self.s_value_label.pack(pady=(0, 10))
        
        # KONTROLKI AUDIO
        audio_frame = ctk.CTkFrame(right_frame, corner_radius=10, fg_color=("#1a1a1a", "#0f0f0f"))
        audio_frame.pack(fill="x", padx=15, pady=10)
        ctk.CTkLabel(audio_frame, text="🔊 AUDIO", font=ctk.CTkFont(size=16, weight="bold"), text_color=("#00d9ff", "#00d9ff")).pack(pady=(10, 5))

        vol_frame = ctk.CTkFrame(audio_frame, fg_color="transparent")
        vol_frame.pack(fill="x", padx=15, pady=5)
        ctk.CTkLabel(vol_frame, text="Vol:", font=ctk.CTkFont(size=14)).pack(side="left", padx=(0, 10))
        self.volume_slider = ctk.CTkSlider(vol_frame, from_=0, to=1, number_of_steps=100, command=self.set_volume, width=120)
        self.volume_slider.set(0.5)
        self.volume_slider.pack(side="left", fill="x", expand=True)
        self.volume_label = ctk.CTkLabel(vol_frame, text="50%", font=ctk.CTkFont(size=14, weight="bold"))
        self.volume_label.pack(side="left", padx=(10, 0))
        
        gain_frame = ctk.CTkFrame(audio_frame, fg_color="transparent")
        gain_frame.pack(fill="x", padx=15, pady=5)
        ctk.CTkLabel(gain_frame, text="Gain:", font=ctk.CTkFont(size=14)).pack(side="left", padx=(0, 10))
        self.gain_slider = ctk.CTkSlider(gain_frame, from_=0, to=49.6, number_of_steps=29, command=self.set_gain, width=120)
        self.gain_slider.set(30)
        self.gain_slider.pack(side="left", fill="x", expand=True)
        self.gain_label = ctk.CTkLabel(gain_frame, text="30 dB", font=ctk.CTkFont(size=14, weight="bold"))
        self.gain_label.pack(side="left", padx=(10, 0))
        
        # Przycisk AGC
        self.agc_checkbox = ctk.CTkCheckBox(
            audio_frame, 
            text="Auto Gain (AGC) - Zalecane dla HF", 
            command=self.toggle_agc,
            font=ctk.CTkFont(size=14)
        )
        self.agc_checkbox.pack(pady=10)
        self.agc_checkbox.select() # Domyślnie włączony

        # KONTROLKI GŁÓWNE
        controls_frame = ctk.CTkFrame(right_frame, fg_color="transparent")
        controls_frame.pack(fill="x", padx=15, pady=10)

        self.start_btn = ctk.CTkButton(
            controls_frame, text="▶️ START RADIO", height=50,
            font=ctk.CTkFont(size=18, weight="bold"), command=self.toggle_radio,
            fg_color=("#00ff00", "#00cc00"), text_color=("#000000", "#000000"),
            hover_color=("#00dd00", "#00aa00")
        )
        self.start_btn.pack(fill="x", pady=5)
        
        self.record_btn = ctk.CTkButton(
            controls_frame, text="⏺️ RECORD", height=40,
            font=ctk.CTkFont(size=16, weight="bold"), command=self.toggle_recording,
            fg_color=("#ff3333", "#cc0000"), hover_color=("#dd2222", "#aa0000")
        )
        self.record_btn.pack(fill="x", pady=5)
        
        status_frame = ctk.CTkFrame(controls_frame, corner_radius=10, fg_color=("#1a1a1a", "#0f0f0f"))
        status_frame.pack(fill="x", pady=10)
        ctk.CTkLabel(status_frame, text="STATUS", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=(10, 5))
        self.status_label = ctk.CTkLabel(
            status_frame, text="⚫ Offline", font=ctk.CTkFont(size=15, weight="bold"),
            text_color=("#ff3333", "#ff3333")
        )
        self.status_label.pack(pady=(0, 10))
        
        info_frame = ctk.CTkFrame(controls_frame, corner_radius=10, fg_color=("#1a1a1a", "#0f0f0f"))
        info_frame.pack(fill="x", pady=5)
        ctk.CTkLabel(info_frame, text="ℹ️ INFO", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=(10, 5))
        self.info_text = ctk.CTkTextbox(info_frame, height=100, font=ctk.CTkFont(size=12))
        self.info_text.pack(fill="x", expand=True, padx=10, pady=(0, 10))
        self.info_text.insert("1.0", "RTL-SDR V4 HF/AM Mode\nWaiting for start...\n")
        
        # Ustawienie początkowego stanu suwaka gain
        self.toggle_agc()
    
    # === FUNKCJE SKALOWANIA I TRYBÓW ===

    def toggle_agc(self):
        """Włącza/Wyłącza automatyczne wzmocnienie."""
        if self.agc_checkbox.get():
            self.gain = 'auto'
            self.gain_slider.configure(state="disabled")
            self.gain_label.configure(text="Auto")
            self.log_info("Wzmacniacz: Automatyczny (AGC)")
        else:
            self.gain_slider.configure(state="normal")
            self.gain = self.gain_slider.get()
            self.gain_label.configure(text=f"{self.gain:.1f} dB")
            self.log_info(f"Wzmacniacz: Ręczny ({self.gain} dB)")
        
        if self.is_running and self.sdr:
            try:
                self.sdr.gain = self.gain
            except Exception as e:
                print(f"Błąd ustawiania wzmocnienia: {e}")

    def on_resize(self, event):
        """Kluczowa funkcja stabilności: Pauzuje spektrum podczas zmiany rozmiaru."""
        if event.widget != self:
            return
            
        if not self.is_resizing: 
            self.is_resizing = True
            try:
                self.spectrum_canvas.delete("all") 
                canvas_width = self.spectrum_canvas.winfo_width()
                canvas_height = self.spectrum_canvas.winfo_height()
                if canvas_width > 1 and canvas_height > 1:
                    self.spectrum_canvas.create_text(
                        canvas_width / 2,
                        canvas_height / 2,
                        text="Zwalniam...",
                        fill="#555",
                        font=ctk.CTkFont(size=16)
                    )
            except Exception as e:
                print(f"Błąd czyszczenia canvas: {e}") 

        if self.resize_timer:
            self.after_cancel(self.resize_timer)
        
        self.resize_timer = self.after(400, self.on_resize_complete)

    def on_resize_complete(self):
        """Wywoływane po zakończeniu zmiany rozmiaru."""
        self.is_resizing = False
        self.resize_timer = None 
        self.log_info("Wznowiono rysowanie spektrum.")

    # === OBSŁUGA SKANERA ===
    
    def toggle_scan(self):
        """Uruchamia lub zatrzymuje skanowanie stacji."""
        if self.is_scanning:
            self.is_scanning = False
            self.scan_paused_on_freq = False 
            if self.scan_thread:
                try:
                    self.scan_thread.join(timeout=0.1) 
                except Exception as e:
                    print(f"Błąd przyłączania wątku skanera: {e}")
            self.scan_thread = None
            self.scan_button.configure(text="Skanuj Pasmo AM ▶")
            self.log_info("Skanowanie zatrzymane przez użytkownika.")
            return

        if not self.is_running:
            self.log_info("BŁĄD: Uruchom radio przed skanowaniem!")
            return
            
        self.is_scanning = True
        self.scan_paused_on_freq = False 
        self.scan_button.configure(text="Stop ■")
        self.log_info("Rozpoczynanie skanowania pasma HF/AM (1.6-30 MHz)...")
        
        self.scan_thread = threading.Thread(
            target=self.scan_worker, 
            args=(1.6e6, 30e6, 5e3, -65.0), # Próg -65dBm (HF jest o wiele cichsze)
            daemon=True
        )
        self.scan_thread.start()

    def scan_worker(self, f_min, f_max, f_step, threshold_dbm):
        """Wątek roboczy do skanowania stacji (logika peak-finding)."""
        freq = self.current_freq
        if not (f_min <= freq <= f_max):
             freq = f_min 
        
        squelch_threshold_dbm = threshold_dbm - 5.0 
        pause_duration = 5.0 

        last_dbm = -120.0
        is_climbing = False 

        while self.is_scanning:
            try:
                if self.scan_paused_on_freq:
                    # === FAZA PAUZY ===
                    time_elapsed = time.time() - self.scan_pause_time
                    
                    if self.current_dbm < squelch_threshold_dbm or time_elapsed > pause_duration:
                        self.scan_paused_on_freq = False
                        last_dbm = -120.0 
                        is_climbing = False 
                        self.after(0, self.log_info, f"Scan: Wznawiam skanowanie... (Sygnał: {self.current_dbm:.1f} dBm)")
                    else:
                        time.sleep(0.2) 
                        
                else:
                    # === FAZA SKANOWANIA ===
                    freq += f_step
                    if freq > f_max:
                        freq = f_min 
                    
                    self.after(0, self.set_frequency_from_thread, freq)
                    time.sleep(0.03) 
                    
                    current_dbm_val = self.current_dbm
                    
                    if current_dbm_val > last_dbm:
                        if current_dbm_val > threshold_dbm:
                            is_climbing = True
                    
                    if current_dbm_val < last_dbm:
                        if is_climbing:
                            peak_freq = freq - f_step
                            self.after(0, self.log_info, f"Scan: Znaleziono szczyt na {peak_freq/1e6:.3f} MHz ({last_dbm:.1f} dBm). Pauza.")
                            self.scan_paused_on_freq = True
                            self.scan_pause_time = time.time()
                            self.after(0, self.set_frequency_from_thread, peak_freq)
                            is_climbing = False 
                    
                    last_dbm = current_dbm_val
            
            except Exception as e:
                print(f"Błąd w pętli skanera: {e}")
                time.sleep(0.1)
                
        self.after(0, self.stop_scan_ui)


    def set_frequency_from_thread(self, freq):
        """Bezpieczna funkcja do ustawiania częstotliwości z wątku."""
        self.current_freq = freq
        self.update_freq_display() # Aktualizuj etykietę (pętla audio zmieni SDR)

    def stop_scan_ui(self):
        """Bezpieczna funkcja do aktualizacji UI po zakończeniu skanowania."""
        if self.is_scanning:
            self.is_scanning = False
        self.scan_button.configure(text="Skanuj Pasmo AM ▶")

    # === FUNKCJE ZARZĄDZANIA STACJAMI ===

    def load_stations_from_file(self):
        """Wczytuje stacje z pliku JSON. Dodano logowanie."""
        if os.path.exists(self.stations_file):
            try:
                with open(self.stations_file, 'r', encoding='utf-8') as f:
                    self.saved_stations = json.load(f)
                print(f"Wczytano {len(self.saved_stations)} stacji z {self.stations_file}")
            except json.JSONDecodeError:
                self.saved_stations = []
                print(f"BŁĄD: Plik {self.stations_file} jest uszkodzony. Start z pustą listą.")
        else:
            self.saved_stations = []
            print(f"Plik {self.stations_file} nie znaleziony. Start z pustą listą.")


    def save_stations_to_file(self):
        """Zapisuje stacje do pliku JSON. Dodano logowanie."""
        try:
            valid_stations = [
                s for s in self.saved_stations 
                if 'name' in s and 'freq' in s
            ]
            
            with open(self.stations_file, 'w', encoding='utf-8') as f:
                json.dump(valid_stations, f, indent=4, ensure_ascii=False)
            print(f"Zapisano {len(valid_stations)} stacji do {self.stations_file}")
        except IOError as e:
            print(f"BŁĄD zapisu do pliku {self.stations_file}: {e}")

    def populate_station_list(self):
        """Wypełnia listę stacji, czyszcząc ją z błędnych wpisów."""
        for widget in self.station_list_frame.winfo_children():
            widget.destroy()
        
        valid_stations = [
            s for s in self.saved_stations 
            if 'name' in s and 'freq' in s
        ]
        
        valid_stations.sort(key=lambda s: s['freq'])
        self.saved_stations = valid_stations 
        
        for station in self.saved_stations: 
            station_frame = ctk.CTkFrame(self.station_list_frame, fg_color="transparent")
            station_frame.pack(fill="x", pady=2)
            
            tune_btn = ctk.CTkButton(
                station_frame,
                text=f"📻 {station['name']} - {station['freq']:.3f} MHz", 
                height=40,
                font=ctk.CTkFont(size=14), 
                command=lambda s=station: self.tune_to_station(s),
                fg_color=("#1f6aa5", "#1f6aa5"),
                hover_color=("#00d9ff", "#00d9ff"),
                anchor="w"
            )
            tune_btn.pack(side="left", fill="x", expand=True, padx=(0, 5))
            
            delete_btn = ctk.CTkButton(
                station_frame,
                text="X",
                width=30,
                height=30,
                font=ctk.CTkFont(size=12, weight="bold"),
                command=lambda s=station: self.delete_station(s),
                fg_color=("#cc0000", "#aa0000"),
                hover_color=("#ff3333", "#ff3333")
            )
            delete_btn.pack(side="right")

    def save_new_station(self):
        name = self.station_name_entry.get()
        if not name:
            self.log_info("BŁĄD: Wpisz nazwę dla stacji!")
            return
            
        freq_mhz = round(self.current_freq / 1e6, 3) 
        
        for s in self.saved_stations:
            if s['name'] == name:
                self.log_info(f"BŁĄD: Stacja o nazwie '{name}' już istnieje.")
                return
            if 'freq' in s and s['freq'] == freq_mhz:
                self.log_info(f"BŁĄD: Stacja o częstotliwości {freq_mhz} MHz już istnieje.")
                return
        
        new_station = {"name": name, "freq": freq_mhz}
        self.saved_stations.append(new_station)
        
        self.log_info(f"Zapisano stację AM: {name} ({freq_mhz} MHz)")
        self.station_name_entry.delete(0, 'end') 
        self.populate_station_list() 
        
    def delete_station(self, station_to_delete):
        try:
            self.saved_stations.remove(station_to_delete)
            self.log_info(f"Usunięto stację: {station_to_delete['name']}")
            self.populate_station_list() 
        except ValueError:
            self.log_info("BŁĄD: Nie można usunąć stacji (już usunięta?).")

    def tune_to_station(self, station):
        if self.is_scanning: self.toggle_scan() 
        
        if 'freq' not in station:
            self.log_info(f"BŁĄD: Nie można wczytać stacji '{station.get('name')}', brak danych o częstotliwości.")
            return

        freq = station['freq']
        self.current_freq = freq * 1e6
        
        self.update_freq_display()
        self.log_info(f"Strojenie do: {station['name']} - {station['freq']} MHz")

    # === PODSTAWOWE FUNKCJE RADIA ===

    def change_frequency(self, step):
        if self.is_scanning: self.toggle_scan() 
        self.current_freq += step # Krok jest już w Hz
        # Limity dla LW/MW/HF
        self.current_freq = max(500e3, min(30e6, self.current_freq)) 
        self.update_freq_display()

    def set_frequency_manual(self):
        if self.is_scanning: self.toggle_scan() 
        try:
            freq_mhz = float(self.freq_entry.get())
            self.current_freq = freq_mhz * 1e6
            self.update_freq_display()
            self.log_info(f"Częstotliwość ustawiona na {freq_mhz} MHz")
        except ValueError:
            self.log_info("Nieprawidłowy format częstotliwości!")

    def update_freq_display(self):
        """Aktualizuje TYLKO etykietę GUI. Częstotliwość SDR jest ustawiana w pętli process_sdr."""
        freq_mhz = self.current_freq / 1e6
        self.freq_display.configure(text=f"{freq_mhz:.3f} MHz")

    def set_volume(self, value):
        self.volume = float(value)
        self.volume_label.configure(text=f"{int(value * 100)}%")

    def set_gain(self, value):
        """Ustawia ręczne wzmocnienie, jeśli AGC jest wyłączone."""
        if not self.agc_checkbox.get():
            self.gain = float(value)
            self.gain_label.configure(text=f"{self.gain:.1f} dB")
            if self.is_running and self.sdr:
                try:
                    self.sdr.gain = self.gain
                except Exception as e:
                    print(f"Błąd ustawiania wzmocnienia: {e}")


    def toggle_radio(self):
        if not self.is_running:
            self.start_radio()
        else:
            self.stop_radio()

    def start_radio(self):
        try:
            self.sdr = RtlSdr()
            
            # === KLUCZOWA ZMIANA DLA HF ===
            # Włącz tryb Direct Sampling (Q-branch)
            try:
                self.sdr.set_direct_sampling('q')
                self.log_info("Tryb 'Direct Sampling' (Q) włączony dla HF.")
            except Exception as e:
                self.log_info(f"Ostrzeżenie: Nie można ustawić trybu Direct Sampling: {e}")
            
            self.sdr.sample_rate = self.sample_rate
            self.sdr.center_freq = self.current_freq
            self.sdr.gain = self.gain 
            
            # Przygotuj filtry (rób to raz, aby było szybciej)
            self.precalculate_filters()
            
            self.is_running = True
            self.start_btn.configure(text="⏸️ STOP RADIO", fg_color=("#ff3333", "#cc0000"))
            self.status_label.configure(text="🟢 Online", text_color=("#00ff00", "#00ff00"))
            
            while not self.audio_queue.empty():
                self.audio_queue.get()
            
            self.processing_thread = threading.Thread(target=self.process_sdr, daemon=True)
            self.processing_thread.start()
            
            self.audio_thread = threading.Thread(target=self.play_audio, daemon=True)
            self.audio_thread.start()
            
            self.log_info("Radio AM/HF uruchomione!")
            
        except Exception as e:
            self.log_info(f"Błąd startu radia: {e}")
            self.log_info("Sprawdź, czy RTL-SDR jest podłączony i nie jest używany.")
            self.is_running = False

    def stop_radio(self):
        if self.is_scanning: self.toggle_scan() 
        self.is_running = False
        
        time.sleep(0.1) 
        
        if self.sdr:
            try:
                self.sdr.close()
            except Exception as e:
                print(f"Error closing SDR: {e}")
            self.sdr = None
        
        self.start_btn.configure(text="▶️ START RADIO", fg_color=("#00ff00", "#00cc00"))
        self.status_label.configure(text="⚫ Offline", text_color=("#ff3333", "#ff3333"))
        self.log_info("Radio stopped")

    def precalculate_filters(self):
        """Przygotowuje filtry AM i DC, aby nie liczyć ich w pętli."""
        # Filtr kanałowy AM (LPF @ 4.5kHz)
        nyq_rate = self.sample_rate / 2.0
        cutoff_hz = self.am_bandwidth / 2.0 # Np. 4500 Hz
        self.am_b, self.am_a = butter(8, cutoff_hz / nyq_rate, btype='low')
        
        # Filtr audio (DC Blocker, HPF @ 50Hz)
        audio_nyq = self.audio_rate / 2.0
        self.dc_b, self.dc_a = butter(4, 50 / audio_nyq, btype='high')


    # === GŁÓWNA PĘTLA PRZETWARZANIA ===

    def process_sdr(self):
        """Kluczowa pętla przetwarzania, z wbudowanym niezawodnym skanerem."""
        
        while self.is_running:
            try:
                # 1. Ustaw częstotliwość w tym wątku
                if self.sdr.center_freq != self.current_freq:
                    try:
                        self.sdr.center_freq = self.current_freq
                    except Exception as e:
                        print(f"Błąd ustawiania freq: {e}")
                                
                # 2. Odczytaj próbki (SZYBCIEJ)
                samples = self.sdr.read_samples(8 * 1024) 
                
                # 3. Demoduluj audio (i pobierz moc sygnału)
                audio, channel_dbm = self.am_demodulate(samples)
                
                # 4. Ustaw moc dla S-metra
                self.current_dbm = channel_dbm 
                
                # 5. Wrzuć do kolejki
                if self.is_running:
                    self.audio_queue.put(audio, timeout=0.5)
                
                # 6. Aktualizuj spektrum (jeśli można)
                now = time.time()
                if (now - self.last_spectrum_update > 0.1) and (not self.is_resizing): 
                    self.after(0, self.update_spectrum, samples)
                    self.last_spectrum_update = now

            except queue.Full:
                pass 
            except Exception as e:
                if self.is_running:
                    print(f"Błąd pętli SDR: {e}")
                break 

    # === NOWA FUNKCJA DEMODULACJI ===
    
    def am_demodulate(self, samples):
        """Demodulacja AM dla fal krótkich/średnich."""
        try:
            # === Krok 1: Filtracja kanałowa ===
            # Wybierz tylko 9kHz pasma wokół częstotliwości środkowej
            if self.am_b is None: self.precalculate_filters() # Na wszelki wypadek
            filtered_samples = lfilter(self.am_b, self.am_a, samples)
            
            # Oblicz moc dla S-metra (TERAZ, po filtracji)
            channel_dbm = 10 * np.log10(np.mean(np.abs(filtered_samples) ** 2) + 1e-10) - 30
            
            # === Krok 2: Demodulacja amplitudowa ===
            # Prosty detektor obwiedni (envelope detector)
            am_signal = np.abs(filtered_samples)
            
            # === Krok 3: Resampling / Decymacja do audio ===
            # Przejdź z 288e3 na 48e3 (współczynnik 6)
            # resample_poly jest wydajny i zawiera filtr antyaliasingowy
            audio = resample_poly(am_signal, 1, int(self.sample_rate / self.audio_rate))
            
            # === Krok 4: Filtracja audio (usunięcie DC) ===
            # Usuń składową stałą (DC offset) pozostałą po nośnej
            audio_no_dc = lfilter(self.dc_b, self.dc_a, audio)
            
            # === Krok 5: Normalizacja i głośność ===
            audio_max = np.max(np.abs(audio_no_dc))
            if audio_max > 1e-5: 
                audio = audio_no_dc / audio_max * self.volume
            else:
                audio = audio_no_dc * self.volume # Cisza
            
            if self.recording:
                self.record_buffer.extend(audio.tolist())
            
            return audio.astype(np.float32), channel_dbm
        
        except Exception as e:
            print(f"Błąd demodulacji AM: {e}")
            # Zwróć ciszę i minimalną moc
            return np.zeros(int(self.audio_rate / 20), dtype=np.float32), -120.0

    # === FUNKCJE AUDIO I WIDMA (BEZ WIĘKSZYCH ZMIAN) ===

    def play_audio(self):
        """Osobny wątek only do odtwarzania audio z kolejki."""
        try:
            stream = sd.OutputStream(samplerate=self.audio_rate, channels=1, dtype='float32', blocksize=int(self.audio_rate / 20)) 
            stream.start()
        except Exception as e:
            print(f"Błąd otwierania strumienia audio: {e}")
            self.log_info(f"Błąd audio: {e}")
            return
        
        while self.is_running:
            try:
                audio = self.audio_queue.get(timeout=1.0) 
                stream.write(audio)
                self.audio_queue.task_done()
            except queue.Empty:
                if not self.is_running:
                    break
                continue
            except Exception as e:
                print(f"Błąd odtwarzania audio: {e}")
                break
        
        try:
            stream.stop()
            stream.close()
        except Exception as e:
            print(f"Błąd zamykania strumienia audio: {e}")
            
    def update_spectrum(self, samples):
        """Rysuje spektrum ORAZ podziałkę częstotliwości."""
        if not self.is_running or self.is_resizing: 
            return
            
        try:
            fft = np.fft.fft(samples)
            fft_shifted = np.fft.fftshift(fft)
            magnitude = 20 * np.log10(np.abs(fft_shifted) + 1e-10)
            
            canvas = self.spectrum_canvas
            canvas.delete("all")
            
            width = canvas.winfo_width()
            height = canvas.winfo_height()
            
            if width > 1 and height > 1:
                
                # === 1. Konfiguracja skali ===
                scale_bottom_margin = 30 
                scale_y_position = height - scale_bottom_margin + 10 
                plot_height = height - 10 - scale_bottom_margin 
                
                center_freq = self.current_freq
                bw = self.sample_rate
                f_min = center_freq - (bw / 2)
                f_max = center_freq + (bw / 2)

                # === 2. Rysowanie podziałki i etykiet ===
                canvas.create_line(0, scale_y_position, width, scale_y_position, fill="#666666")

                # Dostosuj kroki podziałki dla HF (np. co 10kHz)
                tick_step = 10e3 # 10 kHz
                
                start_freq = (f_min // tick_step) * tick_step + tick_step

                current_f = start_freq
                while current_f < f_max:
                    x_pos = (current_f - f_min) / bw * width

                    if x_pos > 0 and x_pos < width:
                        
                        # Etykieta co 50 kHz
                        is_label_tick = np.isclose((current_f / 50e3) % 1.0, 0.0, atol=1e-5)

                        if is_label_tick: 
                            tick_height = 10
                            # Etykieta w MHz
                            label_text = f"{current_f / 1e6:.3f}" 
                            canvas.create_text(x_pos, scale_y_position + 10, text=label_text, fill="#AAAAAA", font=("Arial", 9), anchor="n")
                        else: # Kreska co 10 kHz
                            tick_height = 5
                        
                        canvas.create_line(x_pos, scale_y_position, x_pos, scale_y_position - tick_height, fill="#666666")

                    current_f += tick_step
                    
                # === 3. Rysowanie siatki tła (poziomej) ===
                for i in range(0, height - scale_bottom_margin, 40):
                    canvas.create_line(0, i, width, i, fill="#333333", dash=(2, 4))

                # === 4. Rysowanie wykresu FFT ===
                x_data = np.linspace(0, width, len(magnitude))
                y_data = magnitude
                
                y_min, y_max = np.min(y_data), np.max(y_data)
                scale = y_max - y_min
                if scale < 1e-5: scale = 1e-5
                
                y_norm = (y_data - y_min) / scale * plot_height
                
                points = []
                step = max(1, len(x_data) // (width * 2)) 
                for i in range(0, len(x_data), step):
                    plot_y = (height - scale_bottom_margin) - y_norm[i]
                    points.extend([x_data[i], plot_y])
                
                if len(points) > 2:
                    canvas.create_line(points, fill="#00ff00", width=1) 
                
                # === 5. Rysowanie znacznika środka ===
                center_x = width / 2
                canvas.create_line(center_x, scale_y_position, center_x, scale_y_position - 15, fill="#FF0000", width=2)
                canvas.create_line(center_x, 0, center_x, 10, fill="#FF0000", width=2) # Mały znacznik na górze
                
        except Exception as e:
            print(f"Błąd aktualizacji spektrum: {e}")

    # === RESZTA FUNKCJI (BEZ ZMIAN) ===
    
    def update_s_meter(self):
        """Aktualizuje S-metr na podstawie wartości z pętli process_sdr."""
        if self.is_running:
            dbm = self.current_dbm
            # Skala S dla HF jest inna (S9 = -73 dBm)
            s_value = int((dbm + 127) / 6) # Użyjemy tej samej skali co w FM dla uproszczenia
            s_value = max(0, min(9, s_value))
            
            self.s_value_label.configure(text=f"S{s_value} | {dbm:.1f} dBm")
            self.draw_s_meter(s_value)
        
        self.after(200, self.update_s_meter) # Aktualizuj S-metr co 200ms

    def draw_s_meter(self, s_value):
        canvas = self.s_meter_canvas
        canvas.delete("all")
        
        width = canvas.winfo_width()
        height = canvas.winfo_height()
        
        if width > 1 and height > 1:
            canvas.create_rectangle(10, 10, width - 10, height - 10, fill="#000000", outline="#333333")
            
            for i in range(10):
                x = 10 + (width - 20) * i / 9
                canvas.create_line(x, height - 20, x, height - 10, fill="#666666") 
                canvas.create_text(x, height - 25, text=f"S{i}", fill="#999999", font=("Arial", 8))
            
            bar_width = (width - 20) * s_value / 9
            color = "#00ff00" if s_value < 5 else "#ffaa00" if s_value < 7 else "#ff3333"
            canvas.create_rectangle(10, height - 18, 10 + bar_width, height - 12, fill=color, outline="")

    def toggle_recording(self):
        if not self.recording:
            self.recording = True
            self.record_buffer = []
            self.record_btn.configure(text="⏹️ STOP REC", fg_color=("#ffaa00", "#ff8800"))
            self.log_info("Recording started...")
        else:
            self.recording = False
            self.record_btn.configure(text="⏺️ RECORD", fg_color=("#ff3333", "#cc0000"))
            self.save_recording()

    def save_recording(self):
        if len(self.record_buffer) > 0:
            filename = f"recording_AM_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
            audio_data = np.array(self.record_buffer, dtype=np.float32)
            sf.write(filename, audio_data, int(self.audio_rate))
            self.log_info(f"Recording saved: {filename}")
            self.record_buffer = []

    def log_info(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        try:
            self.info_text.insert("end", f"[{timestamp}] {message}\n")
            self.info_text.see("end")
        except Exception as e:
            print(f"Błąd logowania do UI: {e}")

    def on_closing(self):
        """Wywoływane przy zamykaniu okna."""
        self.stop_radio()
        self.save_stations_to_file() 
        self.destroy()

if __name__ == "__main__":
    app = SDRRadioHF()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
