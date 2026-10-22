# 🎛️ AnnaSetu IoT Hardware & RFID Mess Check-In Station

This directory contains the physical hardware setup, microcontroller firmware, and Google Apps Script backend for the **AnnaSetu Smart Mess Monitoring System**.

---

## 📌 Hardware Components

1. **Microcontroller**: ESP32 Development Board (NodeMCU / DOIT ESP32 DevKit V1)
2. **RFID Reader**: MFRC522 13.56MHz RFID Module (SPI interface)
3. **Cards/Fobs**: 13.56 MHz Mifare Classic 1K RFID cards / tags
4. **Indicators**: Active Piezo Buzzer (5V/3.3V) & Green/Red LEDs
5. **Power**: 5V USB or 3.7V Li-Po battery pack

---

## 🔌 Wiring Pinout (ESP32 to MFRC522)

| MFRC522 Pin | ESP32 GPIO | Description |
| :--- | :--- | :--- |
| **VCC (3.3V)** | **3V3** | ⚠️ Do NOT connect to 5V (damages RC522) |
| **RST** | **GPIO 22** | Reset pin |
| **GND** | **GND** | Ground |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **SCK** | **GPIO 18** | SPI Serial Clock |
| **SDA / SS** | **GPIO 21** | SPI Slave Select |
| **Buzzer (+)**| **GPIO 4** | Active Buzzer (GND to GND) |
| **Green LED** | **GPIO 2** | Built-in or external indicator LED |

---

## ⚙️ Configuration & Credentials

In `esp32_rfid_firmware.ino` and `Code.gs`:
- **Device Security Key**: `dhruv`
- **Default Students Registered**:
  - `1E6B7E05`: Student 1 (Rohan)
  - `13CE022F`: Student 2 (Aayush)
- **Meal Schedule Windows (Asia/Kolkata)**:
  - **Breakfast**: 07:00 – 09:00
  - **Lunch**: 12:00 – 14:00
  - **Dinner**: 20:00 – 21:00

---

## 📡 Dual API Support

1. **AnnaSetu Local / Cloud API**:
   - URL: `http://<YOUR_IP>:8000/api/v1/hardware/rfid-tap`
   - Payload:
     ```json
     {
       "key": "dhruv",
       "uid": "1E6B7E05"
     }
     ```
2. **Google Apps Script Live Endpoint**:
   - Webhook URL: `https://script.google.com/macros/s/AKfycbxqJcX-T2udEzwD4Asr6NHrlukLkAAGKYQmMXMbXiH6umGau63hX_GDixy1Q3Ar-Pyu/exec`
