/*
  AnnaSetu IoT Mess Hardware - ESP32 + MFRC522 RFID Reader Firmware
  -----------------------------------------------------------------
  Pins (ESP32 to MFRC522):
    3.3V  -> 3.3V
    RST   -> GPIO 22
    GND   -> GND
    MISO  -> GPIO 19 (SPI MISO)
    MOSI  -> GPIO 23 (SPI MOSI)
    SCK   -> GPIO 18 (SPI SCK)
    SDA/SS-> GPIO 21 (SPI SS)
    BUZZER-> GPIO 4 (Active HIGH)
    GREEN -> GPIO 2 (LED Indicator)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// WiFi Configuration
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// AnnaSetu Server Endpoints
const char* ANNASETU_API_URL = "http://192.168.1.100:8000/api/v1/hardware/rfid-tap";
const char* GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxqJcX-T2udEzwD4Asr6NHrlukLkAAGKYQmMXMbXiH6umGau63hX_GDixy1Q3Ar-Pyu/exec";
const char* DEVICE_KEY       = "dhruv";

// Pinout
#define SS_PIN    21
#define RST_PIN   22
#define BUZZER_PIN 4
#define LED_PIN    2

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  SPI.begin();
  rfid.PCD_Init();
  Serial.println("[INFO] MFRC522 RFID Reader Initialized.");

  // Connect to Wi-Fi
  Serial.print("[INFO] Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  digitalWrite(LED_PIN, HIGH);
  Serial.println("\n[INFO] WiFi Connected!");
  Serial.print("[INFO] IP Address: ");
  Serial.println(WiFi.localIP());

  // Startup chirp
  tone(BUZZER_PIN, 2000, 150);
}

void loop() {
  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Extract UID string
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidString += "0";
    uidString += String(rfid.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  Serial.println("\n==================================");
  Serial.print("[RFID SCAN] Card UID: ");
  Serial.println(uidString);

  // Success beep
  tone(BUZZER_PIN, 2500, 120);

  // Send to AnnaSetu Platform
  sendAttendance(uidString);

  // Halt card reading until card removed
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1200); // Debounce card taps
}

void sendAttendance(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected. Cannot send attendance.");
    return;
  }

  HTTPClient http;
  String jsonPayload = "{\"key\":\"" + String(DEVICE_KEY) + "\",\"uid\":\"" + uid + "\"}";

  // 1. Send to AnnaSetu FastAPI Server
  http.begin(ANNASETU_API_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);
  Serial.print("[AnnaSetu API] Response Code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("[AnnaSetu API] Response: " + response);
    // Double chirp for success
    tone(BUZZER_PIN, 3000, 80);
    delay(100);
    tone(BUZZER_PIN, 3500, 100);
  } else {
    Serial.printf("[AnnaSetu API] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();

  // 2. Also forward to Google Sheets Apps Script Webhook (Optional/Direct Sync)
  HTTPClient httpSheets;
  httpSheets.begin(GOOGLE_SHEETS_URL);
  httpSheets.addHeader("Content-Type", "application/json");
  httpSheets.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  int sheetsCode = httpSheets.POST(jsonPayload);
  Serial.print("[Google Sheets] Response Code: ");
  Serial.println(sheetsCode);
  httpSheets.end();
}
