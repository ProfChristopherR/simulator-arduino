// Gestor de librerías Arduino/ESP32 con caché persistente en navegador (localStorage)

export interface ArduinoLibraryDef {
  id: string;
  name: string;
  header: string;
  version: string;
  author: string;
  category: 'Sensores' | 'Pantallas' | 'Actuadores' | 'Comunicación' | 'Sistema';
  description: string;
  preinstalled: boolean;
  types: string[];
  snippetInclude: string;
}

const STORAGE_KEY = 'geogo_installed_libs_v1';

export const LIBRARY_CATALOG: ArduinoLibraryDef[] = [
  {
    id: 'servo',
    name: 'Servo',
    header: 'Servo.h',
    version: '1.2.2',
    author: 'Arduino',
    category: 'Actuadores',
    description: 'Control preciso de servomotores SG90/MG995 de 0° a 180°.',
    preinstalled: true,
    types: ['Servo'],
    snippetInclude: '#include <Servo.h>',
  },
  {
    id: 'wire',
    name: 'Wire (I²C)',
    header: 'Wire.h',
    version: '1.0.0',
    author: 'Arduino Core',
    category: 'Comunicación',
    description: 'Comunicación por bus I²C (SDA/SCL) con pantallas y sensores.',
    preinstalled: true,
    types: ['TwoWire'],
    snippetInclude: '#include <Wire.h>',
  },
  {
    id: 'spi',
    name: 'SPI',
    header: 'SPI.h',
    version: '1.0.0',
    author: 'Arduino Core',
    category: 'Comunicación',
    description: 'Bus síncrono de alta velocidad para RFID, matrices y memorias.',
    preinstalled: true,
    types: ['SPISettings'],
    snippetInclude: '#include <SPI.h>',
  },
  {
    id: 'eeprom',
    name: 'EEPROM',
    header: 'EEPROM.h',
    version: '2.0.0',
    author: 'Arduino Core',
    category: 'Sistema',
    description: 'Lectura y escritura persistente de datos en memoria no volátil.',
    preinstalled: true,
    types: [],
    snippetInclude: '#include <EEPROM.h>',
  },
  {
    id: 'liquidcrystal-i2c',
    name: 'LiquidCrystal_I2C',
    header: 'LiquidCrystal_I2C.h',
    version: '1.1.4',
    author: 'Frank de Brabander',
    category: 'Pantallas',
    description: 'Controla pantallas LCD 16×2 y 20×4 con módulo adaptador I²C.',
    preinstalled: true,
    types: ['LiquidCrystal_I2C'],
    snippetInclude: '#include <LiquidCrystal_I2C.h>',
  },
  {
    id: 'dht',
    name: 'DHT sensor library',
    header: 'DHT.h',
    version: '1.4.6',
    author: 'Adafruit',
    category: 'Sensores',
    description: 'Lectura de temperatura y humedad en sensores DHT11 y DHT22.',
    preinstalled: true,
    types: ['DHT'],
    snippetInclude: '#include <DHT.h>',
  },
  {
    id: 'bme280',
    name: 'Adafruit BME280',
    header: 'Adafruit_BME280.h',
    version: '2.2.4',
    author: 'Adafruit',
    category: 'Sensores',
    description: 'Barómetro, temperatura, humedad y altitud por I²C/SPI.',
    preinstalled: true,
    types: ['Adafruit_BME280'],
    snippetInclude: '#include <Adafruit_BME280.h>',
  },
  {
    id: 'bmp280',
    name: 'Adafruit BMP280',
    header: 'Adafruit_BMP280.h',
    version: '2.6.8',
    author: 'Adafruit',
    category: 'Sensores',
    description: 'Sensor barométrico de presión y temperatura de precisión.',
    preinstalled: true,
    types: ['Adafruit_BMP280'],
    snippetInclude: '#include <Adafruit_BMP280.h>',
  },
  // Librerías instalables en caché temporal
  {
    id: 'stepper',
    name: 'Stepper',
    header: 'Stepper.h',
    version: '1.1.3',
    author: 'Arduino',
    category: 'Actuadores',
    description: 'Control de motores paso a paso unipolares como 28BYJ-48 + ULN2003.',
    preinstalled: false,
    types: ['Stepper'],
    snippetInclude: '#include <Stepper.h>',
  },
  {
    id: 'accelstepper',
    name: 'AccelStepper',
    header: 'AccelStepper.h',
    version: '1.64.0',
    author: 'Mike McCauley',
    category: 'Actuadores',
    description: 'Movimiento con aceleración suave para motores paso a paso.',
    preinstalled: false,
    types: ['AccelStepper'],
    snippetInclude: '#include <AccelStepper.h>',
  },
  {
    id: 'irremote',
    name: 'IRremote',
    header: 'IRremote.h',
    version: '4.4.1',
    author: 'shirriff / ArminJo',
    category: 'Sensores',
    description: 'Decodifica comandos del control remoto infrarrojo con VS1838B.',
    preinstalled: false,
    types: ['IRrecv'],
    snippetInclude: '#include <IRremote.h>',
  },
  {
    id: 'mfrc522',
    name: 'MFRC522 (RFID)',
    header: 'MFRC522.h',
    version: '1.4.11',
    author: 'GithubCommunity',
    category: 'Sensores',
    description: 'Lectura de tarjetas y llaveros RFID 13.56 MHz en módulo RC522.',
    preinstalled: false,
    types: ['MFRC522'],
    snippetInclude: '#include <MFRC522.h>',
  },
  {
    id: 'ledcontrol',
    name: 'LedControl (Matriz 8×8)',
    header: 'LedControl.h',
    version: '1.0.6',
    author: 'Eberhard Fahle',
    category: 'Pantallas',
    description: 'Controla matrices LED 8×8 MAX7219 y displays multiplexados.',
    preinstalled: false,
    types: ['LedControl'],
    snippetInclude: '#include <LedControl.h>',
  },
  {
    id: 'sevseg',
    name: 'SevSeg (7 Segmentos)',
    header: 'SevSeg.h',
    version: '3.7.1',
    author: 'Dean Reading',
    category: 'Pantallas',
    description: 'Muestra números y decimales en displays de 7 segmentos.',
    preinstalled: false,
    types: ['SevSeg'],
    snippetInclude: '#include <SevSeg.h>',
  },
  {
    id: 'newping',
    name: 'NewPing (HC-SR04)',
    header: 'NewPing.h',
    version: '1.9.7',
    author: 'Tim Eckel',
    category: 'Sensores',
    description: 'Lectura rápida en centímetros para sensores ultrasónicos HC-SR04.',
    preinstalled: false,
    types: ['NewPing'],
    snippetInclude: '#include <NewPing.h>',
  },
  {
    id: 'ssd1306',
    name: 'Adafruit SSD1306 (OLED)',
    header: 'Adafruit_SSD1306.h',
    version: '2.5.13',
    author: 'Adafruit',
    category: 'Pantallas',
    description: 'Gráficos y texto en pantallas OLED I²C 128×64 de 0.96".',
    preinstalled: false,
    types: ['Adafruit_SSD1306'],
    snippetInclude: '#include <Adafruit_SSD1306.h>',
  },
  {
    id: 'adafruit-gfx',
    name: 'Adafruit GFX Library',
    header: 'Adafruit_GFX.h',
    version: '1.11.11',
    author: 'Adafruit',
    category: 'Pantallas',
    description: 'Primitivas gráficas base (rectángulos, círculos y fuentes) para OLED/TFT.',
    preinstalled: false,
    types: [],
    snippetInclude: '#include <Adafruit_GFX.h>',
  },
  {
    id: 'neopixel',
    name: 'Adafruit NeoPixel',
    header: 'Adafruit_NeoPixel.h',
    version: '1.12.3',
    author: 'Adafruit',
    category: 'Pantallas',
    description: 'Control de tiras y anillos LED RGB direccionables WS2812B.',
    preinstalled: false,
    types: ['Adafruit_NeoPixel'],
    snippetInclude: '#include <Adafruit_NeoPixel.h>',
  },
  {
    id: 'liquidcrystal',
    name: 'LiquidCrystal (Paralelo)',
    header: 'LiquidCrystal.h',
    version: '1.0.7',
    author: 'Arduino',
    category: 'Pantallas',
    description: 'Control directo de pantallas LCD 16×2 mediante 6 pines digitales.',
    preinstalled: false,
    types: ['LiquidCrystal'],
    snippetInclude: '#include <LiquidCrystal.h>',
  },
  {
    id: 'rtclib',
    name: 'RTClib (Reloj DS3231)',
    header: 'RTClib.h',
    version: '2.1.4',
    author: 'Adafruit',
    category: 'Sensores',
    description: 'Fecha y hora exacta en tiempo real para datalogging Geogo.',
    preinstalled: false,
    types: ['RTC_DS3231'],
    snippetInclude: '#include <RTClib.h>',
  },
  {
    id: 'wifi',
    name: 'WiFi (ESP32)',
    header: 'WiFi.h',
    version: '3.0.0',
    author: 'Espressif',
    category: 'Comunicación',
    description: 'Conectividad Wi-Fi Station/AP nativa para placas ESP32.',
    preinstalled: false,
    types: [],
    snippetInclude: '#include <WiFi.h>',
  },
  {
    id: 'softwareserial',
    name: 'SoftwareSerial',
    header: 'SoftwareSerial.h',
    version: '1.0.0',
    author: 'Arduino',
    category: 'Comunicación',
    description: 'Emula puertos serie UART adicionales en pines digitales (ej. Bluetooth HC-05).',
    preinstalled: false,
    types: ['SoftwareSerial'],
    snippetInclude: '#include <SoftwareSerial.h>',
  },
];

// Fallback en memoria para entornos sin localStorage (ej. pruebas en Node.js)
const memoryCache = new Set<string>();

function readCachedSet(): Set<string> {
  const base = new Set(LIBRARY_CATALOG.filter((l) => l.preinstalled).map((l) => l.id));
  memoryCache.forEach((id) => base.add(id));
  if (typeof window === 'undefined' || !window.localStorage) return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((id) => base.add(String(id)));
      }
    }
  } catch {}
  return base;
}

function writeCachedSet(ids: Set<string>): void {
  const custom = [...ids].filter((id) => {
    const def = LIBRARY_CATALOG.find((l) => l.id === id);
    return def && !def.preinstalled;
  });
  memoryCache.clear();
  custom.forEach((id) => memoryCache.add(id));
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {}
  }
}

export function getInstalledLibraryIds(): Set<string> {
  return readCachedSet();
}

export function findLibraryByHeader(headerName: string): ArduinoLibraryDef | undefined {
  const clean = headerName.replace(/[<>"'\s]/g, '').toLowerCase();
  return LIBRARY_CATALOG.find((l) => l.header.toLowerCase() === clean);
}

export function isLibraryInstalled(idOrHeader: string): boolean {
  const installed = readCachedSet();
  if (installed.has(idOrHeader)) return true;
  const byHdr = findLibraryByHeader(idOrHeader);
  return byHdr ? installed.has(byHdr.id) : false;
}

export function installLibrary(id: string): void {
  const set = readCachedSet();
  set.add(id);
  writeCachedSet(set);
}

export function uninstallLibrary(id: string): void {
  const def = LIBRARY_CATALOG.find((l) => l.id === id);
  if (def?.preinstalled) return;
  const set = readCachedSet();
  set.delete(id);
  memoryCache.delete(id);
  writeCachedSet(set);
}

export function searchLibraries(query: string): ArduinoLibraryDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return LIBRARY_CATALOG;
  return LIBRARY_CATALOG.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.header.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.author.toLowerCase().includes(q)
  );
}

export function getAllLibraryTypeNames(): string[] {
  const out: string[] = [];
  for (const lib of LIBRARY_CATALOG) {
    out.push(...lib.types);
  }
  return out;
}
