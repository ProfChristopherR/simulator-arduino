import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT, createGlowSprite, createSilkCanvasTexture } from '../../core/board-builder';
import type { ComponentPinDef, ComponentType, PlacedComponent } from '../../types';

export interface ComponentCatalogItem {
  type: ComponentType;
  category:
    | 'Prototipado e Interfaz'
    | 'Pasivos y Básicos'
    | 'Salidas y Pantallas'
    | 'Sensores Kit XL y Geogo'
    | 'Actuadores';
  name: string;
  shortDesc: string;
  voltageBadge: '5V' | '3.3V' | '5V/3.3V' | 'Pasivo';
  keywords?: string[];
  defaultProps: Record<string, number | string | boolean>;
  pins: ComponentPinDef[];
}

export interface BuiltComponent3D {
  group: THREE.Group;
  pinAnchors: Map<string, THREE.Object3D>;
  selectionRing: THREE.Mesh;
  updateVisual?: (
    state: Record<string, number | boolean | string>,
    props: Record<string, number | string | boolean>
  ) => void;
}

export const LED_COLORS: Record<string, { label: string; hex: number }> = {
  red: { label: 'Rojo', hex: 0xe11d48 },
  green: { label: 'Verde', hex: 0x22c55e },
  yellow: { label: 'Amarillo', hex: 0xfacc15 },
  blue: { label: 'Azul', hex: 0x3b82f6 },
  orange: { label: 'Naranja', hex: 0xff7a1a },
  white: { label: 'Blanco', hex: 0xf8fafc },
};

const RESISTOR_DIGIT_COLORS = [
  0x141414, // 0 Negro
  0x7c4318, // 1 Café
  0xdc2626, // 2 Rojo
  0xf97316, // 3 Naranja
  0xeab308, // 4 Amarillo
  0x16a34a, // 5 Verde
  0x2563eb, // 6 Azul
  0x9333ea, // 7 Violeta
  0x64748b, // 8 Gris
  0xf8fafc, // 9 Blanco
];

export function resistorBandsForOhms(ohms: number): [number, number, number, number] {
  const safe = Math.max(10, Math.min(9_900_000, Math.round(ohms || 220)));
  const exp = Math.floor(Math.log10(safe)) - 1;
  const sig = Math.round(safe / Math.pow(10, Math.max(0, exp)));
  const d1 = Math.min(9, Math.max(0, Math.floor(sig / 10)));
  const d2 = Math.min(9, Math.max(0, sig % 10));
  const mult = Math.min(9, Math.max(0, exp));
  return [
    RESISTOR_DIGIT_COLORS[d1],
    RESISTOR_DIGIT_COLORS[d2],
    RESISTOR_DIGIT_COLORS[mult],
    0xd4a007,
  ];
}

export function formatOhms(ohms: number): string {
  if (ohms >= 1_000_000) return `${+(ohms / 1_000_000).toFixed(2)} MΩ`;
  if (ohms >= 1000) return `${+(ohms / 1000).toFixed(2)} kΩ`;
  return `${Math.round(ohms)} Ω`;
}

export const COMPONENT_CATALOG: ComponentCatalogItem[] = [
  {
    type: 'level-shifter',
    category: 'Prototipado e Interfaz',
    name: 'Level Shifter 4 ch',
    shortDesc: 'Conversor lógico bidireccional 5 V ↔ 3.3 V para proteger módulos de 3.3 V.',
    voltageBadge: '5V/3.3V',
    keywords: ['nivel', 'conversor', 'voltaje', '3.3v', '5v', 'i2c'],
    defaultProps: {},
    pins: [
      { id: 'HV', label: 'HV (5V)', category: 'pwr', localPos: [-0.45, 0.2, -0.48] },
      { id: 'HV1', label: 'HV1', category: 'com', localPos: [-0.15, 0.2, -0.48] },
      { id: 'HV2', label: 'HV2', category: 'com', localPos: [0.15, 0.2, -0.48] },
      { id: 'GND_H', label: 'GND', category: 'gnd', localPos: [0.45, 0.2, -0.48] },
      { id: 'LV', label: 'LV (3.3V)', category: 'pwr', localPos: [-0.45, 0.2, 0.48], maxVoltage: 3.6 },
      { id: 'LV1', label: 'LV1', category: 'com', localPos: [-0.15, 0.2, 0.48], maxVoltage: 3.6 },
      { id: 'LV2', label: 'LV2', category: 'com', localPos: [0.15, 0.2, 0.48], maxVoltage: 3.6 },
      { id: 'GND_L', label: 'GND', category: 'gnd', localPos: [0.45, 0.2, 0.48] },
    ],
  },
  {
    type: 'resistor',
    category: 'Pasivos y Básicos',
    name: 'Resistencia',
    shortDesc: 'Valor configurable (Ω / kΩ) con código de colores 3D. Encaja en protoboard.',
    voltageBadge: 'Pasivo',
    keywords: ['ohm', 'limitadora', 'pullup', 'pulldown', '220', '10k'],
    defaultProps: { ohms: 220 },
    pins: [
      { id: 'P1', label: 'Terminal 1', category: 'dig', localPos: [-0.508, 0.08, 0] },
      { id: 'P2', label: 'Terminal 2', category: 'dig', localPos: [0.508, 0.08, 0] },
    ],
  },
  {
    type: 'ldr',
    category: 'Pasivos y Básicos',
    name: 'Fotorresistencia LDR (GL5528)',
    shortDesc: 'Resistencia dependiente de la luz de 2 pines (sin PCB). Encaja en protoboard.',
    voltageBadge: 'Pasivo',
    keywords: ['luz', 'fotoresistor', 'cds', 'luminosidad', 'sensor'],
    defaultProps: {},
    pins: [
      { id: 'P1', label: 'Terminal 1', category: 'ana', localPos: [-0.254, 0.08, 0] },
      { id: 'P2', label: 'Terminal 2', category: 'ana', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'capacitor',
    category: 'Pasivos y Básicos',
    name: 'Capacitor Electrolítico',
    shortDesc: 'Filtra picos de voltaje y estabiliza alimentación (µF configurable). Polarizado.',
    voltageBadge: 'Pasivo',
    keywords: ['condensador', 'uf', 'filtro', 'energia'],
    defaultProps: { uF: 100 },
    pins: [
      { id: 'POS', label: 'Positivo (+)', category: 'pwr', localPos: [-0.127, 0.08, 0] },
      { id: 'NEG', label: 'Negativo (-)', category: 'gnd', localPos: [0.127, 0.08, 0] },
    ],
  },
  {
    type: 'diode',
    category: 'Pasivos y Básicos',
    name: 'Diodo Rectificador 1N4007',
    shortDesc: 'Permite el paso de corriente en un solo sentido (Ánodo → Cátodo con banda gris).',
    voltageBadge: 'Pasivo',
    keywords: ['rectificador', 'proteccion', 'flyback', '1n4007'],
    defaultProps: {},
    pins: [
      { id: 'A', label: 'Ánodo (+)', category: 'dig', localPos: [-0.381, 0.08, 0] },
      { id: 'K', label: 'Cátodo (-)', category: 'gnd', localPos: [0.381, 0.08, 0] },
    ],
  },
  {
    type: 'transistor-npn',
    category: 'Pasivos y Básicos',
    name: 'Transistor NPN (2N2222)',
    shortDesc: 'Amplifica o conmuta cargas mayores desde un pin digital (Emisor, Base, Colector).',
    voltageBadge: '5V/3.3V',
    keywords: ['bjt', 'npn', '2n2222', 'bc547', 'conmutador', 'driver'],
    defaultProps: {},
    pins: [
      { id: 'E', label: 'Emisor (E)', category: 'gnd', localPos: [-0.254, 0.08, 0] },
      { id: 'B', label: 'Base (B)', category: 'ctl', localPos: [0, 0.08, 0] },
      { id: 'C', label: 'Colector (C)', category: 'dig', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'button',
    category: 'Pasivos y Básicos',
    name: 'Pulsador táctil',
    shortDesc: 'Interruptor momentáneo (paso 2 columnas). Haz clic sobre él para cerrar el circuito.',
    voltageBadge: 'Pasivo',
    keywords: ['boton', 'pushbutton', 'switch'],
    defaultProps: {},
    pins: [
      { id: 'A', label: 'Terminal A', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'B', label: 'Terminal B', category: 'dig', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'slide-switch',
    category: 'Pasivos y Básicos',
    name: 'Interruptor Deslizante SPDT',
    shortDesc: 'Selector fijo de 2 posiciones (COM conecta con C1 o C2). Clic en el deslizador.',
    voltageBadge: 'Pasivo',
    keywords: ['interruptor', 'switch', 'palanca', 'spdt'],
    defaultProps: {},
    pins: [
      { id: 'C1', label: 'Terminal 1', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'COM', label: 'Común (COM)', category: 'ctl', localPos: [0, 0.08, 0] },
      { id: 'C2', label: 'Terminal 2', category: 'dig', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'potentiometer',
    category: 'Pasivos y Básicos',
    name: 'Potenciómetro',
    shortDesc: 'Perilla analógica girable directo en el 3D o barra (1 kΩ–100 kΩ).',
    voltageBadge: '5V/3.3V',
    keywords: ['perilla', 'dial', 'analogico', 'divisor'],
    defaultProps: { maxOhms: 10000 },
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.254, 0.14, 0.52] },
      { id: 'SIG', label: 'SIG (Cursor)', category: 'ana', localPos: [0, 0.14, 0.52] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.254, 0.14, 0.52] },
    ],
  },
  {
    type: 'led',
    category: 'Salidas y Pantallas',
    name: 'LED 5 mm',
    shortDesc: 'Color configurable con iluminación real sobre protoboard. Encaja en protoboard.',
    voltageBadge: '5V/3.3V',
    keywords: ['diodo', 'luz', 'indicador', 'baliza'],
    defaultProps: { color: 'red' },
    pins: [
      { id: 'A', label: 'Ánodo (+)', category: 'dig', localPos: [-0.127, 0.08, 0] },
      { id: 'K', label: 'Cátodo (-)', category: 'gnd', localPos: [0.127, 0.08, 0] },
    ],
  },
  {
    type: 'rgb-led',
    category: 'Salidas y Pantallas',
    name: 'LED RGB 5 mm (Cátodo común)',
    shortDesc: 'Mezcla millones de colores por PWM en canales R, G y B. Encaja en 4 columnas.',
    voltageBadge: '5V/3.3V',
    keywords: ['multicolor', 'rgb', 'pwm'],
    defaultProps: {},
    pins: [
      { id: 'R', label: 'Rojo (R)', category: 'dig', localPos: [-0.381, 0.08, 0] },
      { id: 'K', label: 'Cátodo (-)', category: 'gnd', localPos: [-0.127, 0.08, 0] },
      { id: 'G', label: 'Verde (G)', category: 'dig', localPos: [0.127, 0.08, 0] },
      { id: 'B', label: 'Azul (B)', category: 'dig', localPos: [0.381, 0.08, 0] },
    ],
  },
  {
    type: 'buzzer',
    category: 'Salidas y Pantallas',
    name: 'Buzzer piezoeléctrico',
    shortDesc: 'Emite pitidos y melodías reales con tone(pin, frecuencia). Encaja en protoboard.',
    voltageBadge: '5V/3.3V',
    keywords: ['zumbador', 'sonido', 'alarma', 'tone'],
    defaultProps: {},
    pins: [
      { id: 'SIG', label: 'Señal (+)', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'GND', label: 'GND (-)', category: 'gnd', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'seven-seg',
    category: 'Salidas y Pantallas',
    name: 'Display 7 Segmentos',
    shortDesc: 'Muestra números del 0 al 9 y punto decimal iluminando segmentos A–G.',
    voltageBadge: '5V/3.3V',
    keywords: ['digito', 'numero', 'contador', 'sevseg'],
    defaultProps: {},
    pins: [
      { id: 'A', label: 'Seg A', category: 'dig', localPos: [-0.5, 0.16, -0.58] },
      { id: 'B', label: 'Seg B', category: 'dig', localPos: [-0.25, 0.16, -0.58] },
      { id: 'COM', label: 'Común (GND)', category: 'gnd', localPos: [0, 0.16, -0.58] },
      { id: 'F', label: 'Seg F', category: 'dig', localPos: [0.25, 0.16, -0.58] },
      { id: 'G', label: 'Seg G', category: 'dig', localPos: [0.5, 0.16, -0.58] },
      { id: 'E', label: 'Seg E', category: 'dig', localPos: [-0.5, 0.16, 0.58] },
      { id: 'D', label: 'Seg D', category: 'dig', localPos: [-0.16, 0.16, 0.58] },
      { id: 'C', label: 'Seg C', category: 'dig', localPos: [0.16, 0.16, 0.58] },
      { id: 'DP', label: 'Punto DP', category: 'dig', localPos: [0.5, 0.16, 0.58] },
    ],
  },
  {
    type: 'led-matrix',
    category: 'Salidas y Pantallas',
    name: 'Matriz LED 8×8 (MAX7219)',
    shortDesc: 'Panel de 64 LEDs controlables por SPI (LedControl.h) para iconos y texto.',
    voltageBadge: '5V',
    keywords: ['matriz', '8x8', 'max7219', 'ledcontrol', 'pantalla'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.5, 0.18, 0.92] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.25, 0.18, 0.92] },
      { id: 'DIN', label: 'DIN', category: 'com', localPos: [0, 0.18, 0.92] },
      { id: 'CS', label: 'CS', category: 'com', localPos: [0.25, 0.18, 0.92] },
      { id: 'CLK', label: 'CLK', category: 'com', localPos: [0.5, 0.18, 0.92] },
    ],
  },
  {
    type: 'lcd-i2c',
    category: 'Salidas y Pantallas',
    name: 'Pantalla LCD 16×2 (I²C)',
    shortDesc: 'Display de 2 líneas × 16 caracteres conectado por bus I²C.',
    voltageBadge: '5V',
    keywords: ['display', 'lcd', 'texto', 'i2c'],
    defaultProps: { i2cAddr: '0x27' },
    pins: [
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.45, 0.2, 0.95] },
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.15, 0.2, 0.95] },
      { id: 'SDA', label: 'SDA', category: 'com', localPos: [0.15, 0.2, 0.95] },
      { id: 'SCL', label: 'SCL', category: 'com', localPos: [0.45, 0.2, 0.95] },
    ],
  },
  {
    type: 'oled-i2c',
    category: 'Salidas y Pantallas',
    name: 'Pantalla OLED 0.96" (SSD1306)',
    shortDesc: 'Pantalla gráfica de alto contraste 128×64 por bus I²C (3.3 V / 5 V).',
    voltageBadge: '5V/3.3V',
    keywords: ['oled', 'ssd1306', 'graficos', 'pantalla', 'i2c'],
    defaultProps: {},
    pins: [
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.38, 0.18, 0.62] },
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.13, 0.18, 0.62] },
      { id: 'SCL', label: 'SCL', category: 'com', localPos: [0.13, 0.18, 0.62] },
      { id: 'SDA', label: 'SDA', category: 'com', localPos: [0.38, 0.18, 0.62] },
    ],
  },
  {
    type: 'ultrasonic',
    category: 'Sensores Kit XL y Geogo',
    name: 'Ultrasónico HC-SR04',
    shortDesc: 'Mide distancia de 2 cm a 400 cm por eco ultrasónico.',
    voltageBadge: '5V',
    keywords: ['distancia', 'sonar', 'eco', 'newping'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.38, 0.24, 0.36] },
      { id: 'TRIG', label: 'TRIG', category: 'dig', localPos: [-0.127, 0.24, 0.36] },
      { id: 'ECHO', label: 'ECHO', category: 'dig', localPos: [0.127, 0.24, 0.36] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.38, 0.24, 0.36] },
    ],
  },
  {
    type: 'dht11',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor Clima DHT11',
    shortDesc: 'Mide temperatura ambiente (°C) y humedad relativa (%) por bus digital de 1 hilo.',
    voltageBadge: '5V/3.3V',
    keywords: ['temperatura', 'humedad', 'clima'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.254, 0.16, 0.56] },
      { id: 'DATA', label: 'DATA (Señal)', category: 'dig', localPos: [0, 0.16, 0.56] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.254, 0.16, 0.56] },
    ],
  },
  {
    type: 'pir-sensor',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor Movimiento PIR (HC-SR501)',
    shortDesc: 'Detecta movimiento infrarrojo pasivo de personas o animales (salida HIGH).',
    voltageBadge: '5V',
    keywords: ['movimiento', 'presencia', 'alarma', 'pir'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.254, 0.18, 0.62] },
      { id: 'OUT', label: 'OUT (Digital)', category: 'dig', localPos: [0, 0.18, 0.62] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.254, 0.18, 0.62] },
    ],
  },
  {
    type: 'soil-moisture',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor Humedad de Suelo',
    shortDesc: 'Sonda higrómetro para riego automático en huertos escolares (salida AO / DO).',
    voltageBadge: '5V/3.3V',
    keywords: ['agua', 'planta', 'riego', 'tierra', 'higrometro'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.38, 0.16, 0.58] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.13, 0.16, 0.58] },
      { id: 'DO', label: 'DO (Digital)', category: 'dig', localPos: [0.13, 0.16, 0.58] },
      { id: 'AO', label: 'AO (Analógico)', category: 'ana', localPos: [0.38, 0.16, 0.58] },
    ],
  },
  {
    type: 'joystick',
    category: 'Sensores Kit XL y Geogo',
    name: 'Joystick Analógico KY-023',
    shortDesc: 'Palanca de 2 ejes (VRX, VRY) + pulsador central (SW). Arrastra el stick en 3D.',
    voltageBadge: '5V/3.3V',
    keywords: ['stick', 'mando', 'palanca', 'ejes', 'ky-023'],
    defaultProps: {},
    pins: [
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.5, 0.18, 0.62] },
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.25, 0.18, 0.62] },
      { id: 'VRX', label: 'VRX (Eje X)', category: 'ana', localPos: [0, 0.18, 0.62] },
      { id: 'VRY', label: 'VRY (Eje Y)', category: 'ana', localPos: [0.25, 0.18, 0.62] },
      { id: 'SW', label: 'SW (Botón)', category: 'dig', localPos: [0.5, 0.18, 0.62] },
    ],
  },
  {
    type: 'ir-receiver',
    category: 'Sensores Kit XL y Geogo',
    name: 'Receptor Infrarrojo IR (VS1838B)',
    shortDesc: 'Decodifica señales de 38 kHz del control remoto (IRremote.h). Encaja en protoboard.',
    voltageBadge: '5V/3.3V',
    keywords: ['infrarrojo', 'ir', 'vs1838b', 'remoto'],
    defaultProps: {},
    pins: [
      { id: 'OUT', label: 'OUT (Señal)', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0, 0.08, 0] },
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'ir-remote',
    category: 'Sensores Kit XL y Geogo',
    name: 'Control Remoto IR',
    shortDesc: 'Emisor infrarrojo inalámbrico con botones numerados para enviar comandos al receptor IR.',
    voltageBadge: 'Pasivo',
    keywords: ['control', 'remoto', 'infrarrojo', 'botones'],
    defaultProps: {},
    pins: [],
  },
  {
    type: 'rfid-rc522',
    category: 'Sensores Kit XL y Geogo',
    name: 'Lector RFID RC522 (13.56 MHz)',
    shortDesc: 'Lee tarjetas y llaveros sin contacto por SPI (estrictamente 3.3 V).',
    voltageBadge: '3.3V',
    keywords: ['tarjeta', 'llavero', 'nfc', 'acceso', 'rc522', 'spi'],
    defaultProps: {},
    pins: [
      { id: 'SDA', label: 'SDA (SS)', category: 'com', localPos: [-0.75, 0.18, 0.88], maxVoltage: 3.6 },
      { id: 'SCK', label: 'SCK', category: 'com', localPos: [-0.5, 0.18, 0.88], maxVoltage: 3.6 },
      { id: 'MOSI', label: 'MOSI', category: 'com', localPos: [-0.25, 0.18, 0.88], maxVoltage: 3.6 },
      { id: 'MISO', label: 'MISO', category: 'com', localPos: [0, 0.18, 0.88], maxVoltage: 3.6 },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.25, 0.18, 0.88] },
      { id: 'RST', label: 'RST', category: 'ctl', localPos: [0.5, 0.18, 0.88], maxVoltage: 3.6 },
      { id: '3V3', label: '3.3V', category: 'pwr', localPos: [0.75, 0.18, 0.88], maxVoltage: 3.6 },
    ],
  },
  {
    type: 'gas-mq2',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor Gas y Humo MQ-2',
    shortDesc: 'Detecta GLP, propano, metano y humo mediante malla calentadora (salida AO / DO).',
    voltageBadge: '5V',
    keywords: ['gas', 'humo', 'mq2', 'metano', 'seguridad'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.38, 0.18, 0.56] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.13, 0.18, 0.56] },
      { id: 'DO', label: 'DO (Digital)', category: 'dig', localPos: [0.13, 0.18, 0.56] },
      { id: 'AO', label: 'AO (Analógico)', category: 'ana', localPos: [0.38, 0.18, 0.56] },
    ],
  },
  {
    type: 'sound-sensor',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor de Sonido (Micrófono)',
    shortDesc: 'Capta aplausos y nivel acústico ambiental con salida analógica y comparador.',
    voltageBadge: '5V/3.3V',
    keywords: ['microfono', 'aplauso', 'ruido', 'decibeles'],
    defaultProps: {},
    pins: [
      { id: 'AO', label: 'AO (Analógico)', category: 'ana', localPos: [-0.38, 0.16, 0.48] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.13, 0.16, 0.48] },
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [0.13, 0.16, 0.48] },
      { id: 'DO', label: 'DO (Digital)', category: 'dig', localPos: [0.38, 0.16, 0.48] },
    ],
  },
  {
    type: 'bme280',
    category: 'Sensores Kit XL y Geogo',
    name: 'Barómetro BME280 / BMP280',
    shortDesc: 'Modelo seleccionable (BME280/BMP280). Presión, altitud, temp y humedad (3.3 V).',
    voltageBadge: '3.3V',
    keywords: ['presion', 'barometro', 'altitud', 'i2c'],
    defaultProps: { model: 'BME280' },
    pins: [
      { id: 'VCC', label: 'VCC (3.3V)', category: 'pwr', localPos: [-0.38, 0.16, 0.48], maxVoltage: 3.6 },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.13, 0.16, 0.48] },
      { id: 'SCL', label: 'SCL (3.3V)', category: 'com', localPos: [0.13, 0.16, 0.48], maxVoltage: 3.6 },
      { id: 'SDA', label: 'SDA (3.3V)', category: 'com', localPos: [0.38, 0.16, 0.48], maxVoltage: 3.6 },
    ],
  },
  {
    type: 'co2-sensor',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor de CO₂ (ppm)',
    shortDesc: 'Mide concentración de CO₂ (400–5000 ppm) para monitoreo ambiental.',
    voltageBadge: '5V',
    keywords: ['aire', 'dioxido', 'geogo', 'calidad'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.28, 0.16, 0.62] },
      { id: 'AO', label: 'AO (ppm)', category: 'ana', localPos: [0, 0.16, 0.62] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.28, 0.16, 0.62] },
    ],
  },
  {
    type: 'optical-encoder',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor Óptico Rotativo',
    shortDesc: 'Encoder de ranura con disco codificado; genera pulsos digitales de RPM.',
    voltageBadge: '5V/3.3V',
    keywords: ['rpm', 'velocidad', 'tacometro', 'rueda'],
    defaultProps: { slots: 20 },
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.28, 0.16, 0.52] },
      { id: 'DO', label: 'DO (Pulsos)', category: 'dig', localPos: [0, 0.16, 0.52] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.28, 0.16, 0.52] },
    ],
  },
  {
    type: 'rf-pair',
    category: 'Sensores Kit XL y Geogo',
    name: 'Módulo Transmisor RF 433 MHz',
    shortDesc: 'Transmite tramas de telemetría inalámbrica desde el pin DATA.',
    voltageBadge: '5V/3.3V',
    keywords: ['radio', 'inalambrico', 'telemetria', '433'],
    defaultProps: { freqMhz: 433 },
    pins: [
      { id: 'DATA', label: 'DATA', category: 'com', localPos: [-0.26, 0.16, 0.48] },
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [0, 0.16, 0.48] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.26, 0.16, 0.48] },
    ],
  },
  {
    type: 'servo',
    category: 'Actuadores',
    name: 'Micro Servo SG90',
    shortDesc: 'Actuador de precisión controlado de 0° a 180° mediante la librería Servo.h.',
    voltageBadge: '5V',
    keywords: ['motor', 'brazo', 'angulo', 'sg90'],
    defaultProps: {},
    pins: [
      { id: 'GND', label: 'GND (Café)', category: 'gnd', localPos: [-1.72, 0.2, 0.25] },
      { id: 'VCC', label: 'VCC (Rojo)', category: 'pwr', localPos: [-1.72, 0.2, 0.0] },
      { id: 'SIG', label: 'SIG (Naranja)', category: 'ctl', localPos: [-1.72, 0.2, -0.25] },
    ],
  },
  {
    type: 'dc-motor',
    category: 'Actuadores',
    name: 'Motor DC con Rueda (TT)',
    shortDesc: 'Motorreductor amarillo clásico de robótica móvil que gira según PWM/dirección.',
    voltageBadge: '5V',
    keywords: ['motor', 'rueda', 'robot', 'dc'],
    defaultProps: {},
    pins: [
      { id: 'M_POS', label: 'Terminal (+)', category: 'pwr', localPos: [-0.88, 0.2, -0.15] },
      { id: 'M_NEG', label: 'Terminal (-)', category: 'gnd', localPos: [-0.88, 0.2, 0.15] },
    ],
  },
  {
    type: 'stepper-28byj',
    category: 'Actuadores',
    name: 'Motor Paso a Paso (28BYJ-48)',
    shortDesc: 'Motor de pasos unipolar de alta precisión; úsalo con el driver ULN2003.',
    voltageBadge: '5V',
    keywords: ['stepper', 'pasos', '28byj', 'precision'],
    defaultProps: {},
    pins: [
      { id: 'IN1', label: 'Bobina 1 (Azul)', category: 'dig', localPos: [-0.5, 0.18, 0.86] },
      { id: 'IN2', label: 'Bobina 2 (Rosa)', category: 'dig', localPos: [-0.25, 0.18, 0.86] },
      { id: 'IN3', label: 'Bobina 3 (Amarillo)', category: 'dig', localPos: [0, 0.18, 0.86] },
      { id: 'IN4', label: 'Bobina 4 (Naranja)', category: 'dig', localPos: [0.25, 0.18, 0.86] },
      { id: 'VCC', label: 'VCC (Rojo 5V)', category: 'pwr', localPos: [0.5, 0.18, 0.86] },
    ],
  },
  {
    type: 'uln2003-driver',
    category: 'Actuadores',
    name: 'Driver Motor ULN2003',
    shortDesc: 'Placa controladora con 4 LEDs de fase (A/B/C/D) para motor paso a paso 28BYJ-48.',
    voltageBadge: '5V',
    keywords: ['driver', 'uln2003', 'stepper', 'pasos'],
    defaultProps: {},
    pins: [
      { id: 'IN1', label: 'IN1', category: 'dig', localPos: [-0.45, 0.18, 0.72] },
      { id: 'IN2', label: 'IN2', category: 'dig', localPos: [-0.2, 0.18, 0.72] },
      { id: 'IN3', label: 'IN3', category: 'dig', localPos: [0.05, 0.18, 0.72] },
      { id: 'IN4', label: 'IN4', category: 'dig', localPos: [0.3, 0.18, 0.72] },
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.45, 0.18, -0.72] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.45, 0.18, -0.72] },
    ],
  },
  {
    type: 'relay-5v',
    category: 'Actuadores',
    name: 'Módulo Relé 5 V (1 Canal)',
    shortDesc: 'Interruptor electromecánico aislado (COM, NO, NC) activado por señal digital IN.',
    voltageBadge: '5V',
    keywords: ['rele', 'relay', 'potencia', 'interruptor'],
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.75, 0.18, -0.25] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.75, 0.18, 0] },
      { id: 'IN', label: 'IN (Control)', category: 'ctl', localPos: [-0.75, 0.18, 0.25] },
      { id: 'NO', label: 'NO (Norm. Abierto)', category: 'dig', localPos: [0.82, 0.25, -0.25] },
      { id: 'COM', label: 'COM (Común)', category: 'ctl', localPos: [0.82, 0.25, 0] },
      { id: 'NC', label: 'NC (Norm. Cerrado)', category: 'dig', localPos: [0.82, 0.25, 0.25] },
    ],
  },
];

export function getCatalogItem(type: ComponentType): ComponentCatalogItem {
  return COMPONENT_CATALOG.find((c) => c.type === type) ?? COMPONENT_CATALOG[0];
}

function attachComponentPins(
  group: THREE.Group,
  comp: PlacedComponent,
  pins: ComponentPinDef[],
  pinAnchors: Map<string, THREE.Object3D>
): void {
  const pinShaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10);
  const anchorGeo = new THREE.SphereGeometry(0.088, 12, 12);
  const goldMat = MAT.gold();

  for (const p of pins) {
    const shaft = new THREE.Mesh(pinShaftGeo, goldMat);
    shaft.position.set(p.localPos[0], p.localPos[1] - 0.08, p.localPos[2]);
    group.add(shaft);

    const anchor = new THREE.Mesh(
      anchorGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf6c101,
        emissive: 0xd4a007,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
      })
    );
    anchor.position.set(p.localPos[0], p.localPos[1] + 0.06, p.localPos[2]);
    anchor.userData = {
      compUid: comp.uid,
      compPinId: p.id,
      pinDef: p,
    };
    group.add(anchor);
    pinAnchors.set(p.id, anchor);
  }
}

function makeModuleBoard(w: number, d: number, color: number, label: string): THREE.Group {
  const grp = new THREE.Group();
  const pcb = new THREE.Mesh(
    new RoundedBoxGeometry(w, 0.12, d, 3, 0.03),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.45 })
  );
  pcb.position.y = 0.12;
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  grp.add(pcb);

  if (label) {
    const tex = createSilkCanvasTexture(256, 128, (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cw / 2, ch / 2);
    });
    const silk = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.85, d * 0.45),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    silk.rotation.x = -Math.PI / 2;
    silk.position.y = 0.184;
    grp.add(silk);
  }
  return grp;
}

export function buildComponent3D(comp: PlacedComponent): BuiltComponent3D {
  const item = getCatalogItem(comp.type);
  const group = new THREE.Group();
  const pinAnchors = new Map<string, THREE.Object3D>();
  let updateVisual: BuiltComponent3D['updateVisual'];

  group.position.set(...comp.position);
  group.rotation.y = comp.rotationY;

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.74, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1c2b5a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.025;
  selectionRing.visible = false;
  group.add(selectionRing);

  if (comp.type === 'led') {
    const getHex = (props: Record<string, unknown>) =>
      LED_COLORS[String(props.color ?? 'red')]?.hex ?? 0xe11d48;
    const initHex = getHex(comp.props);
    const mat = new THREE.MeshPhysicalMaterial({
      color: initHex,
      emissive: initHex,
      emissiveIntensity: 0.08,
      roughness: 0.14,
      transmission: 0.32,
      thickness: 0.42,
      transparent: true,
      opacity: 0.92,
    });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 22, 16), mat);
    dome.position.y = 0.46;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), coreMat);
    core.position.y = 0.42;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.25, 22), mat);
    cyl.position.y = 0.33;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 22), mat);
    rim.position.y = 0.2;

    const glow = createGlowSprite(initHex, 1.35);
    glow.position.set(0, 0.48, 0);
    glow.visible = false;

    const ptLight = new THREE.PointLight(initHex, 0, 3.6, 2);
    ptLight.position.set(0, 0.54, 0);
    ptLight.castShadow = false;

    const legGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.2, 10);
    const legA = new THREE.Mesh(legGeo, MAT.metal());
    legA.position.set(-0.127, 0.1, 0);
    const legK = new THREE.Mesh(legGeo, MAT.metal());
    legK.position.set(0.127, 0.1, 0);

    group.add(legA, legK, dome, core, cyl, rim, glow, ptLight);

    updateVisual = (st, props) => {
      const hex = getHex(props);
      const burned = Boolean(st.burned);
      const level = Math.max(0, Math.min(1, Number(st.brightness ?? 0)));
      if (burned) {
        mat.color.setHex(0x2a2422);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
        coreMat.opacity = 0;
        glow.visible = false;
        ptLight.intensity = 0;
      } else {
        mat.color.setHex(hex);
        mat.emissive.setHex(hex);
        mat.emissiveIntensity = level > 0.02 ? 0.65 + level * 3.2 : 0.06;
        coreMat.opacity = level > 0.02 ? 0.25 + level * 0.72 : 0.08;
        (glow.material as THREE.SpriteMaterial).color.setHex(hex);
        (glow.material as THREE.SpriteMaterial).opacity = level * 0.92;
        glow.visible = level > 0.02;
        const sc = 0.95 + level * 0.85;
        glow.scale.set(sc, sc, 1);
        ptLight.color.setHex(hex);
        ptLight.intensity = level * 4.2;
      }
    };
  } else if (comp.type === 'rgb-led') {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x111827,
      emissiveIntensity: 0.12,
      roughness: 0.2,
      transmission: 0.28,
      thickness: 0.35,
      transparent: true,
      opacity: 0.94,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 16), mat);
    dome.position.y = 0.49;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 22), mat);
    cyl.position.y = 0.36;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.055, 22), mat);
    rim.position.y = 0.23;
    const legGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.22, 10);
    for (const lx of [-0.381, -0.127, 0.127, 0.381]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.11, 0);
      group.add(leg);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.035, 0.04), MAT.metal());
    bar.position.y = 0.21;
    const glow = createGlowSprite(0xffffff, 1.4);
    glow.position.set(0, 0.5, 0);
    glow.visible = false;
    const ptLight = new THREE.PointLight(0xffffff, 0, 3.6, 2);
    ptLight.position.set(0, 0.56, 0);
    ptLight.castShadow = false;
    group.add(bar, dome, cyl, rim, glow, ptLight);

    updateVisual = (st) => {
      const r = Math.max(0, Math.min(1, Number(st.r ?? 0)));
      const g = Math.max(0, Math.min(1, Number(st.g ?? 0)));
      const b = Math.max(0, Math.min(1, Number(st.b ?? 0)));
      const peak = Math.max(r, g, b);
      if (peak > 0.02) {
        const mix = new THREE.Color(r, g, b);
        mat.color.copy(mix);
        mat.emissive.copy(mix);
        mat.emissiveIntensity = 0.8 + peak * 3.1;
        (glow.material as THREE.SpriteMaterial).color.copy(mix);
        (glow.material as THREE.SpriteMaterial).opacity = peak * 0.9;
        glow.visible = true;
        ptLight.color.copy(mix);
        ptLight.intensity = peak * 4.0;
      } else {
        mat.color.setHex(0xf1f5f9);
        mat.emissive.setHex(0x111827);
        mat.emissiveIntensity = 0.08;
        glow.visible = false;
        ptLight.intensity = 0;
      }
    };
  } else if (comp.type === 'resistor') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.46, 16),
      new THREE.MeshStandardMaterial({ color: 0xdec8a0, roughness: 0.45 })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.17;
    const capL = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xdec8a0, roughness: 0.45 })
    );
    capL.position.set(-0.22, 0.17, 0);
    const capR = capL.clone();
    capR.position.set(0.22, 0.17, 0);

    const bandMats = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 }));
    bandMats.forEach((bm, idx) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.044, 16), bm);
      band.rotation.z = Math.PI / 2;
      band.position.set(-0.145 + idx * 0.095, 0.17, 0);
      group.add(band);
    });
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.016, 10), MAT.metal());
    wire.rotation.z = Math.PI / 2;
    wire.position.y = 0.17;
    const legGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10);
    const legL = new THREE.Mesh(legGeo, MAT.metal());
    legL.position.set(-0.508, 0.06, 0);
    const legR = new THREE.Mesh(legGeo, MAT.metal());
    legR.position.set(0.508, 0.06, 0);
    group.add(wire, legL, legR, body, capL, capR);

    const applyBands = (props: Record<string, unknown>) => {
      const colors = resistorBandsForOhms(Number(props.ohms ?? 220));
      colors.forEach((hex, idx) => bandMats[idx].color.setHex(hex));
    };
    applyBands(comp.props);
    updateVisual = (_st, props) => applyBands(props);
  } else if (comp.type === 'ldr') {
    // Modelo fiel GL5528: disco cerámico beige plano + serigrafía zigzag terracota CdS + epoxi + 2 patitas verticales
    const ceramic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.09, 24),
      new THREE.MeshStandardMaterial({ color: 0xefe3c8, roughness: 0.45 })
    );
    ceramic.position.y = 0.31;
    ceramic.castShadow = true;

    const cdsTex = createSilkCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#efe3c8';
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 114, 0, Math.PI * 2);
      ctx.fillStyle = '#d9b589';
      ctx.fill();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const rows = [-64, -38, -12, 14, 40, 66];
      rows.forEach((ry, i) => {
        const y = h / 2 + ry;
        const xA = w / 2 - 74;
        const xB = w / 2 + 74;
        if (i === 0) ctx.moveTo(xA, y);
        else ctx.lineTo(i % 2 === 0 ? xA : xB, y);
        ctx.lineTo(i % 2 === 0 ? xB : xA, y);
      });
      ctx.stroke();
    });
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.225, 24),
      new THREE.MeshPhysicalMaterial({ map: cdsTex, roughness: 0.16, clearcoat: 0.85 })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.358;

    const legGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.32, 10);
    const legL = new THREE.Mesh(legGeo, MAT.metal());
    legL.position.set(-0.254, 0.15, 0);
    const legR = new THREE.Mesh(legGeo, MAT.metal());
    legR.position.set(0.254, 0.15, 0);
    const leadBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.508, 10), MAT.metal());
    leadBar.rotation.z = Math.PI / 2;
    leadBar.position.y = 0.28;

    group.add(leadBar, legL, legR, ceramic, face);
  } else if (comp.type === 'capacitor') {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.46, 22),
      new THREE.MeshStandardMaterial({ color: 0x161b26, roughness: 0.32, metalness: 0.25 })
    );
    can.position.y = 0.34;
    can.castShadow = true;
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.02, 22), MAT.metal());
    topCap.position.y = 0.57;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.203, 0.203, 0.44, 14, 1, true, -0.35, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    stripe.position.y = 0.34;
    stripe.rotation.y = Math.PI * 0.5;
    const legGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 10);
    const l1 = new THREE.Mesh(legGeo, MAT.metal());
    l1.position.set(-0.127, 0.08, 0);
    const l2 = new THREE.Mesh(legGeo, MAT.metal());
    l2.position.set(0.127, 0.08, 0);
    group.add(l1, l2, can, topCap, stripe);
  } else if (comp.type === 'diode') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.088, 0.38, 16),
      new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.42 })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.17;
    const kBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.091, 0.091, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.35 })
    );
    kBand.rotation.z = Math.PI / 2;
    kBand.position.set(0.11, 0.17, 0);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.762, 10), MAT.metal());
    wire.rotation.z = Math.PI / 2;
    wire.position.y = 0.17;
    const legGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.2, 10);
    const legL = new THREE.Mesh(legGeo, MAT.metal());
    legL.position.set(-0.381, 0.07, 0);
    const legR = new THREE.Mesh(legGeo, MAT.metal());
    legR.position.set(0.381, 0.07, 0);
    group.add(wire, legL, legR, body, kBand);
  } else if (comp.type === 'transistor-npn') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.32, 18, 1, false, 0, Math.PI),
      MAT.icBody()
    );
    body.position.y = 0.34;
    body.castShadow = true;
    const flatBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.05), MAT.icBody());
    flatBack.position.set(0, 0.34, 0.02);
    const legGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10);
    for (const lx of [-0.254, 0, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.11, 0);
      group.add(leg);
    }
    group.add(body, flatBack);
  } else if (comp.type === 'button') {
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.16, 0.54, 2, 0.03), MAT.headerPlastic());
    base.position.y = 0.16;
    base.castShadow = true;
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.46), MAT.shieldCan());
    topPlate.position.y = 0.245;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.15, 22),
      new THREE.MeshStandardMaterial({ color: 0x1c2b5a, roughness: 0.34 })
    );
    cap.position.y = 0.32;
    cap.userData = { interactiveCompUid: comp.uid, action: 'toggle-button' };
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10);
    for (const lx of [-0.254, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.05, 0);
      group.add(leg);
    }
    group.add(base, topPlate, cap);
    updateVisual = (st) => {
      cap.position.y = st.pressed ? 0.27 : 0.32;
      (cap.material as THREE.MeshStandardMaterial).color.setHex(st.pressed ? 0xff7a1a : 0x1c2b5a);
    };
  } else if (comp.type === 'slide-switch') {
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.18, 0.32, 2, 0.02), MAT.metal());
    housing.position.y = 0.2;
    housing.castShadow = true;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.16), MAT.icBody());
    slot.position.y = 0.295;
    const slider = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.16, 0.18, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.3 })
    );
    slider.position.set(-0.12, 0.36, 0);
    slider.userData = { interactiveCompUid: comp.uid, action: 'toggle-switch' };
    const legGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.16, 10);
    for (const lx of [-0.254, 0, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.08, 0);
      group.add(leg);
    }
    group.add(housing, slot, slider);
    updateVisual = (st) => {
      const pos = Number(st.position ?? 0);
      slider.position.x = pos === 1 ? 0.12 : -0.12;
    };
  } else if (comp.type === 'potentiometer') {
    const pcb = makeModuleBoard(0.95, 1.15, 0x1c2b5a, 'POT');
    const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 24), MAT.metal());
    dialBase.position.set(0, 0.26, -0.08);
    const knob = new THREE.Group();
    knob.position.set(0, 0.44, -0.08);
    const knobCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.28, 24), MAT.icBody());
    const pointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xff7a1a })
    );
    pointer.position.set(0, 0.15, -0.08);
    knobCyl.userData = { interactiveCompUid: comp.uid, action: 'rotate-pot' };
    pointer.userData = { interactiveCompUid: comp.uid, action: 'rotate-pot' };
    knob.add(knobCyl, pointer);
    group.add(pcb, dialBase, knob);
    updateVisual = (st) => {
      const val = Number(st.value ?? 512);
      knob.rotation.y = (val / 1023 - 0.5) * Math.PI * 1.5;
    };
  } else if (comp.type === 'buzzer') {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 28), MAT.icBody());
    cyl.position.y = 0.29;
    cyl.castShadow = true;
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x090b0f, roughness: 0.8 })
    );
    hole.position.y = 0.442;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.145, 20),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.445;

    const wave1 = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.33, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    wave1.rotation.x = -Math.PI / 2;
    wave1.position.y = 0.56;
    wave1.visible = false;

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10);
    for (const lx of [-0.254, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.07, 0);
      group.add(leg);
    }
    group.add(cyl, hole, ring, wave1);
    updateVisual = (st) => {
      const active = Number(st.freq ?? 0) > 0;
      (ring.material as THREE.MeshBasicMaterial).color.setHex(active ? 0x22c55e : 0xff7a1a);
      wave1.visible = active;
      if (active) {
        const phase = (performance.now() * 0.008) % 1;
        const sc = 0.8 + phase * 1.1;
        wave1.scale.set(sc, sc, 1);
        wave1.position.y = 0.48 + phase * 0.32;
        (wave1.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.85;
      }
    };
  } else if (comp.type === 'seven-seg') {
    selectionRing.scale.set(1.3, 1.3, 1);
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.28, 1.35, 2, 0.03), MAT.icBody());
    body.position.y = 0.2;
    body.castShadow = true;
    const segMat = () =>
      new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0xef4444, emissiveIntensity: 0.05 });
    const mats: Record<string, THREE.MeshStandardMaterial> = {};
    const specs: Array<[string, number, number, number, number]> = [
      ['A', 0, -0.38, 0.42, 0.09],
      ['G', 0, 0, 0.42, 0.09],
      ['D', 0, 0.38, 0.42, 0.09],
      ['F', -0.22, -0.19, 0.09, 0.32],
      ['B', 0.22, -0.19, 0.09, 0.32],
      ['E', -0.22, 0.19, 0.09, 0.32],
      ['C', 0.22, 0.19, 0.09, 0.32],
      ['DP', 0.38, 0.4, 0.09, 0.09],
    ];
    for (const [key, x, z, w, d] of specs) {
      const m = segMat();
      mats[key] = m;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), m);
      seg.position.set(x, 0.34, z);
      group.add(seg);
    }
    group.add(body);
    updateVisual = (st) => {
      const mask = Number(st.mask ?? 0b0111111); // Por defecto '0' tenue o apagado
      const active = Boolean(st.active);
      const bits: Record<string, number> = { A: 1, B: 2, C: 4, D: 8, E: 16, F: 32, G: 64, DP: 128 };
      for (const k of Object.keys(mats)) {
        const on = active && Boolean(mask & bits[k]);
        mats[k].color.setHex(on ? 0xff4d4d : 0x334155);
        mats[k].emissiveIntensity = on ? 2.1 : 0.04;
      }
    };
  } else if (comp.type === 'led-matrix') {
    selectionRing.scale.set(1.6, 1.6, 1);
    const pcb = makeModuleBoard(1.55, 1.95, 0xb91c1c, '');
    const housing = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.24, 1.38, 2, 0.02), MAT.icBody());
    housing.position.set(0, 0.28, -0.12);
    const dots: THREE.MeshStandardMaterial[][] = [];
    const dotGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12);
    for (let r = 0; r < 8; r++) {
      const rowMats: THREE.MeshStandardMaterial[] = [];
      for (let c = 0; c < 8; c++) {
        const dm = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          emissive: 0xef4444,
          emissiveIntensity: 0.04,
          roughness: 0.25,
        });
        const dot = new THREE.Mesh(dotGeo, dm);
        dot.position.set(-0.56 + c * 0.16, 0.405, -0.68 + r * 0.16);
        group.add(dot);
        rowMats.push(dm);
      }
      dots.push(rowMats);
    }
    group.add(pcb, housing);
    updateVisual = (st) => {
      const rowsStr = String(st.rows ?? '');
      const rows = rowsStr ? rowsStr.split(',').map(Number) : [0, 0, 0, 0, 0, 0, 0, 0];
      for (let r = 0; r < 8; r++) {
        const val = rows[r] ?? 0;
        for (let c = 0; c < 8; c++) {
          const on = Boolean((val >> (7 - c)) & 1);
          dots[r][c].color.setHex(on ? 0xff4d4d : 0xd1d5db);
          dots[r][c].emissiveIntensity = on ? 2.0 : 0.03;
        }
      }
    };
  } else if (comp.type === 'lcd-i2c') {
    selectionRing.scale.set(2.3, 1.7, 1);
    const pcb = makeModuleBoard(2.9, 1.9, 0x0b5345, '');
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.65, 0.26, 1.35, 3, 0.03), MAT.icBody());
    bezel.position.set(0, 0.28, -0.1);
    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 512;
    lcdCanvas.height = 192;
    const ctx = lcdCanvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(lcdCanvas);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 0.96),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.415, -0.1);
    group.add(pcb, bezel, screen);

    const drawLcd = (line0: string, line1: string, backlight: boolean) => {
      ctx.fillStyle = backlight ? '#2774c4' : '#1b3552';
      ctx.fillRect(0, 0, 512, 192);
      ctx.strokeStyle = '#10243d';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 504, 184);
      ctx.fillStyle = backlight ? '#f8fafc' : '#64748b';
      ctx.font = 'bold 34px monospace';
      ctx.fillText(line0.slice(0, 16).padEnd(16, ' '), 22, 74);
      ctx.fillText(line1.slice(0, 16).padEnd(16, ' '), 22, 138);
      tex.needsUpdate = true;
    };
    drawLcd('Liceo San Nicolas', 'Tecnologia Geogo', true);

    updateVisual = (st) => {
      drawLcd(String(st.line0 ?? ''), String(st.line1 ?? ''), Boolean(st.powered ?? true));
    };
  } else if (comp.type === 'oled-i2c') {
    selectionRing.scale.set(1.4, 1.4, 1);
    const pcb = makeModuleBoard(1.32, 1.4, 0x1d4ed8, '');
    const glass = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.08, 0.9, 2, 0.015), MAT.icBody());
    glass.position.set(0, 0.22, -0.1);
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 128;
    const ctx = cvs.getContext('2d')!;
    const tex = new THREE.CanvasTexture(cvs);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.64),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.265, -0.1);
    group.add(pcb, glass, screen);

    const drawOled = (linesStr: string) => {
      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, 0, 256, 128);
      const lines = linesStr.split('\n');
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 20px monospace';
      ctx.fillText((lines[0] ?? 'SSD1306 OLED').slice(0, 18), 10, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px monospace';
      (lines.slice(1, 5)).forEach((ln, idx) => {
        ctx.fillText(ln.slice(0, 20), 10, 56 + idx * 22);
      });
      tex.needsUpdate = true;
    };
    drawOled('OLED 128x64\nGeogo I2C listo');
    updateVisual = (st) => drawOled(String(st.text ?? 'OLED 128x64\nGeogo I2C listo'));
  } else if (comp.type === 'ultrasonic') {
    selectionRing.scale.set(1.5, 1.1, 1);
    const pcb = makeModuleBoard(1.95, 0.96, 0x2449a8, '');
    const usSilk = createSilkCanvasTexture(512, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 128, 92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(384, 128, 92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('T', 26, 232);
      ctx.fillText('R', 466, 232);
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('HC-SR04', 256, 178);
    });
    const silkMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.92),
      new THREE.MeshBasicMaterial({ map: usSilk, transparent: true })
    );
    silkMesh.rotation.x = -Math.PI / 2;
    silkMesh.position.y = 0.186;
    group.add(pcb, silkMesh);

    const meshTex = createSilkCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1b1d20';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#383d45';
      for (let y = 6; y < h; y += 8) {
        for (let x = 6; x < w; x += 8) {
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    const barrelMat = MAT.brushedMetal();
    const grilleMat = new THREE.MeshStandardMaterial({ map: meshTex, roughness: 0.7, metalness: 0.4 });
    for (const cx of [-0.48, 0.48]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.54, 28), barrelMat);
      barrel.position.set(cx, 0.44, -0.04);
      barrel.castShadow = true;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.032, 12, 28), barrelMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(cx, 0.71, -0.04);
      const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 24), grilleMat);
      grille.position.set(cx, 0.695, -0.04);
      group.add(barrel, rim, grille);
    }
    const xtal = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.16, 0.18, 2, 0.06), MAT.metal());
    xtal.position.set(0, 0.26, -0.22);
    xtal.castShadow = true;
    const hdr = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.14, 0.16), MAT.headerPlastic());
    hdr.position.set(0, 0.22, 0.36);
    hdr.castShadow = true;

    const waveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    waveRing.rotation.x = -Math.PI / 2;
    waveRing.position.set(-0.48, 0.73, -0.04);
    waveRing.visible = false;
    group.add(xtal, hdr, waveRing);

    updateVisual = (st) => {
      const active = Boolean(st.active);
      waveRing.visible = active;
      if (active) {
        const pulse = 1 + 0.45 * ((Math.sin(performance.now() * 0.01) + 1) * 0.5);
        waveRing.scale.set(pulse, pulse, 1);
      }
    };
  } else if (comp.type === 'dht11') {
    const pcb = makeModuleBoard(1.05, 1.32, 0x1e293b, '');
    const grilleTex = createSilkCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#075985';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillRect(34 + c * 52, 34 + r * 40, 32, 24);
        }
      }
    });
    const cage = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.32, 0.88, 2, 0.04),
      new THREE.MeshPhysicalMaterial({ map: grilleTex, roughness: 0.36, clearcoat: 0.35 })
    );
    cage.position.set(0, 0.32, -0.14);
    cage.castShadow = true;
    const hdr = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.16), MAT.headerPlastic());
    hdr.position.set(0, 0.22, 0.52);
    group.add(pcb, cage, hdr);
  } else if (comp.type === 'pir-sensor') {
    selectionRing.scale.set(1.4, 1.4, 1);
    const pcb = makeModuleBoard(1.35, 1.35, 0x15803d, '');
    const dome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.46, 1),
      new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.45, flatShading: true, clearcoat: 0.25 })
    );
    dome.position.set(0, 0.34, -0.06);
    dome.castShadow = true;
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.05 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), ledMat);
    led.position.set(0.45, 0.2, 0.45);
    group.add(pcb, dome, led);
    updateVisual = (st) => {
      const motion = Boolean(st.motion);
      ledMat.emissiveIntensity = motion ? 2.2 : 0.05;
    };
  } else if (comp.type === 'soil-moisture') {
    selectionRing.scale.set(1.5, 1.5, 1);
    const pcb = makeModuleBoard(1.05, 1.25, 0x1e293b, 'SOIL');
    const forkMat = new THREE.MeshStandardMaterial({ color: 0xe6b834, roughness: 0.28, metalness: 0.85 });
    const forkL = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.06, 0.95, 2, 0.02), forkMat);
    forkL.position.set(-0.22, 0.14, -0.95);
    const forkR = forkL.clone();
    forkR.position.set(0.22, 0.14, -0.95);
    group.add(pcb, forkL, forkR);
  } else if (comp.type === 'joystick') {
    selectionRing.scale.set(1.5, 1.5, 1);
    const pcb = makeModuleBoard(1.32, 1.42, 0x111827, 'JOY');
    const gimbal = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.34, 0.74, 2, 0.03), MAT.metal());
    gimbal.position.set(0, 0.32, -0.1);
    const stickPivot = new THREE.Group();
    stickPivot.position.set(0, 0.46, -0.1);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 14), MAT.icBody());
    shaft.position.y = 0.16;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 })
    );
    cap.position.y = 0.36;
    cap.userData = { interactiveCompUid: comp.uid, action: 'move-joystick' };
    shaft.userData = { interactiveCompUid: comp.uid, action: 'move-joystick' };
    stickPivot.add(shaft, cap);
    group.add(pcb, gimbal, stickPivot);
    updateVisual = (st) => {
      const vx = Number(st.x ?? 512);
      const vy = Number(st.y ?? 512);
      stickPivot.rotation.z = -((vx - 512) / 512) * 0.42;
      stickPivot.rotation.x = ((vy - 512) / 512) * 0.42;
    };
  } else if (comp.type === 'ir-receiver') {
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.38, 0.24, 2, 0.03), MAT.icBody());
    body.position.y = 0.32;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x090b10, roughness: 0.12, clearcoat: 0.9 })
    );
    dome.position.set(0, 0.34, 0.08);
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.18), MAT.metal());
    cage.position.set(0, 0.32, -0.02);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), ledMat);
    led.position.set(0, 0.52, 0);
    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 10);
    for (const lx of [-0.254, 0, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.1, 0);
      group.add(leg);
    }
    group.add(cage, body, dome, led);
    updateVisual = (st) => {
      ledMat.emissiveIntensity = Number(st.rxFlashUntil ?? 0) > performance.now() ? 2.4 : 0;
    };
  } else if (comp.type === 'ir-remote') {
    selectionRing.scale.set(1.5, 2.2, 1);
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.16, 2.25, 3, 0.04), MAT.icBody());
    body.position.y = 0.1;
    body.castShadow = true;
    const padTex = createSilkCanvasTexture(256, 512, (ctx, w, h) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);
      const btns = [
        ['PWR', '#dc2626'], ['VOL+', '#334155'], ['FUNC', '#334155'],
        ['⏮', '#334155'], ['⏯', '#2563eb'], ['⏭', '#334155'],
        ['1', '#1e293b'], ['2', '#1e293b'], ['3', '#1e293b'],
        ['4', '#1e293b'], ['5', '#1e293b'], ['6', '#1e293b'],
        ['7', '#1e293b'], ['8', '#1e293b'], ['9', '#1e293b'],
      ];
      btns.forEach(([lbl, col], i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const cx = 48 + c * 80;
        const cy = 70 + r * 84;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, cx, cy);
      });
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.08), new THREE.MeshBasicMaterial({ map: padTex }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.184;
    const irLedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xff2222, emissiveIntensity: 0.1 });
    const irLed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), irLedMat);
    irLed.position.set(0, 0.1, -1.14);
    group.add(body, face, irLed);
    updateVisual = (st) => {
      irLedMat.emissiveIntensity = Number(st.txFlashUntil ?? 0) > performance.now() ? 3.0 : 0.08;
    };
  } else if (comp.type === 'rfid-rc522') {
    selectionRing.scale.set(2.0, 1.8, 1);
    const pcb = makeModuleBoard(1.75, 1.95, 0x1d4ed8, '');
    const coilTex = createSilkCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        const p = 24 + i * 16;
        ctx.strokeRect(p, p, w - p * 2, h * 0.62 - p);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RFID-RC522', w / 2, h - 48);
    });
    const silk = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 1.88), new THREE.MeshBasicMaterial({ map: coilTex, transparent: true }));
    silk.rotation.x = -Math.PI / 2;
    silk.position.y = 0.185;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.38), MAT.icBody());
    chip.position.set(0, 0.21, 0.32);
    chip.rotation.y = Math.PI / 4;
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, transparent: true, opacity: 0.92 });
    const card = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.04, 0.78, 2, 0.02), cardMat);
    card.position.set(0, 0.36, -0.2);
    card.visible = false;
    group.add(pcb, silk, chip, card);
    updateVisual = (st) => {
      card.visible = Boolean(st.cardPresent);
    };
  } else if (comp.type === 'gas-mq2') {
    const pcb = makeModuleBoard(1.15, 1.25, 0x1d4ed8, 'MQ-2');
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.36, 22), MAT.brushedMetal());
    can.position.set(0, 0.35, -0.14);
    can.castShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.08, 22), MAT.icBody());
    cap.position.set(0, 0.56, -0.14);
    group.add(pcb, can, cap);
  } else if (comp.type === 'sound-sensor') {
    const pcb = makeModuleBoard(1.25, 1.0, 0xb91c1c, 'MIC');
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 20), MAT.metal());
    mic.position.set(0, 0.28, -0.18);
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 20), MAT.icBody());
    felt.position.set(0, 0.385, -0.18);
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.26), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    pot.position.set(0.32, 0.26, 0.1);
    group.add(pcb, mic, felt, pot);
  } else if (comp.type === 'dc-motor') {
    selectionRing.scale.set(1.8, 1.3, 1);
    const gearBox = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.55, 0.62, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }));
    gearBox.position.set(0, 0.3, 0);
    gearBox.castShadow = true;
    const motorCan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 20), MAT.metal());
    motorCan.rotation.z = Math.PI / 2;
    motorCan.position.set(-0.52, 0.3, 0);
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(0.45, 0.34, 0.55);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.28, 24), MAT.icBody());
    tire.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }));
    rim.rotation.x = Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.32), MAT.icBody());
    wheelPivot.add(tire, rim, spoke);
    group.add(gearBox, motorCan, wheelPivot);
    updateVisual = (st) => {
      const spd = Number(st.speed ?? 0);
      wheelPivot.rotation.z -= spd * 0.18;
    };
  } else if (comp.type === 'stepper-28byj') {
    selectionRing.scale.set(1.5, 1.5, 1);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.48, 28), MAT.metal());
    can.position.y = 0.28;
    can.castShadow = true;
    const ears = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.06, 0.28, 2, 0.02), MAT.metal());
    ears.position.y = 0.5;
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.22, 0.46, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35 }));
    cap.position.set(0, 0.22, 0.56);
    const shaftPivot = new THREE.Group();
    shaftPivot.position.set(0, 0.58, -0.14);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16), MAT.gold());
    const flag = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.06, 0.12, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xff7a1a }));
    flag.position.set(0.22, 0.08, 0);
    shaftPivot.add(shaft, flag);
    group.add(can, ears, cap, shaftPivot);
    updateVisual = (st) => {
      const deg = Number(st.stepAngle ?? 0);
      shaftPivot.rotation.y = (deg * Math.PI) / 180;
    };
  } else if (comp.type === 'uln2003-driver') {
    selectionRing.scale.set(1.4, 1.6, 1);
    const pcb = makeModuleBoard(1.25, 1.55, 0x1d4ed8, 'ULN2003');
    const ic = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.1, 0.72, 2, 0.02), MAT.icBody());
    ic.position.set(-0.1, 0.22, 0);
    const phaseMats = [0, 1, 2, 3].map((i) => {
      const m = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.06 });
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), m);
      led.position.set(0.38, 0.21, -0.25 + i * 0.16);
      group.add(led);
      return m;
    });
    group.add(pcb, ic);
    updateVisual = (st) => {
      const mask = Number(st.phaseMask ?? 0);
      phaseMats.forEach((m, i) => {
        m.emissiveIntensity = (mask >> i) & 1 ? 2.2 : 0.05;
      });
    };
  } else if (comp.type === 'relay-5v') {
    selectionRing.scale.set(1.7, 1.4, 1);
    const pcb = makeModuleBoard(1.65, 1.2, 0x1d4ed8, '');
    const cube = new THREE.Mesh(
      new RoundedBoxGeometry(0.75, 0.62, 0.62, 2, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 })
    );
    cube.position.set(0, 0.48, 0);
    cube.castShadow = true;
    const term = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.26, 0.78, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 })
    );
    term.position.set(0.62, 0.28, 0);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.05 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), ledMat);
    led.position.set(-0.55, 0.21, -0.35);
    group.add(pcb, cube, term, led);
    updateVisual = (st) => {
      ledMat.emissiveIntensity = Boolean(st.active) ? 2.2 : 0.05;
    };
  } else if (comp.type === 'level-shifter') {
    const pcb = makeModuleBoard(1.25, 1.1, 0x991b1b, 'LVL 5V-3V');
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.26), MAT.icBody());
    chip.position.y = 0.2;
    group.add(pcb, chip);
  } else if (comp.type === 'bme280') {
    const pcb = makeModuleBoard(1.05, 0.95, 0x5b21b6, String(comp.props.model ?? 'BME280'));
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.24), MAT.shieldCan());
    sensor.position.set(0, 0.22, -0.1);
    group.add(pcb, sensor);
  } else if (comp.type === 'co2-sensor') {
    const pcb = makeModuleBoard(1.15, 1.25, 0x166534, 'CO2 ppm');
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.36, 24), MAT.shieldCan());
    chamber.position.set(0, 0.36, -0.14);
    group.add(pcb, chamber);
  } else if (comp.type === 'optical-encoder') {
    const pcb = makeModuleBoard(1.1, 1.05, 0x0f172a, 'OPT RPM');
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.28), MAT.icBody());
    slot.position.set(0, 0.32, -0.16);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20),
      new THREE.MeshStandardMaterial({ color: 0xd4a007, roughness: 0.3, metalness: 0.5 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.42, -0.16);
    group.add(pcb, slot, wheel);
    updateVisual = (st) => {
      const rpm = Number(st.rpm ?? 0);
      wheel.rotation.x += (rpm / 60) * 0.12;
    };
  } else if (comp.type === 'rf-pair') {
    const pcb = makeModuleBoard(1.1, 1.0, 0x0c717c, 'RF 433');
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 10), MAT.copper());
    ant.position.set(0.32, 0.62, -0.22);
    group.add(pcb, ant);
  } else if (comp.type === 'servo') {
    selectionRing.scale.set(1.6, 1.1, 1);
    const sgBlue = new THREE.MeshPhysicalMaterial({
      color: 0x1652c8,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.55,
      transparent: true,
      opacity: 0.94,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.08, 0.64, 3, 0.04), sgBlue);
    body.position.y = 0.54;
    body.castShadow = true;

    const flange = new THREE.Mesh(new RoundedBoxGeometry(1.68, 0.12, 0.64, 2, 0.02), sgBlue);
    flange.position.y = 0.86;
    flange.castShadow = true;

    const capTop = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.22, 0.6, 2, 0.03), sgBlue);
    capTop.position.y = 1.14;
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24), sgBlue);
    turret.position.set(0.26, 1.3, 0);
    const turretSmall = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 18), sgBlue);
    turretSmall.position.set(-0.08, 1.28, 0);

    const labelTex = createSilkCanvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MICRO SERVO', w / 2, 34);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 46px monospace';
      ctx.fillText('SG90', w / 2, 84);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('9g', w / 2, 114);
    });
    const sticker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.42),
      new THREE.MeshBasicMaterial({ map: labelTex })
    );
    sticker.position.set(0, 0.44, 0.324);

    const armPivot = new THREE.Group();
    armPivot.position.set(0.26, 1.44, 0);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.38 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 20), hornMat);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.065, 0.17, 2, 0.03), hornMat);
    blade.position.x = 0.34;
    blade.castShadow = true;
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14), MAT.metal());
    armPivot.add(hub, blade, screw);

    const wireColors = [0x5c3a21, 0xc83228, 0xe87b1e];
    wireColors.forEach((hex, idx) => {
      const zOff = (idx - 1) * 0.08;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.58, 0.24, zOff),
        new THREE.Vector3(-1.05, 0.14, zOff * 1.4),
        new THREE.Vector3(-1.45, 0.14, zOff * 2.2),
      ]);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.032, 8, false),
        new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 })
      );
      tube.castShadow = true;
      group.add(tube);
    });

    const dupont = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.16, 0.68, 2, 0.02), MAT.headerPlastic());
    dupont.position.set(-1.66, 0.12, 0);
    dupont.castShadow = true;

    group.add(body, flange, capTop, turret, turretSmall, sticker, armPivot, dupont);
    updateVisual = (st) => {
      const angle = Number(st.angle ?? 90);
      armPivot.rotation.y = ((angle - 90) * Math.PI) / 180;
    };
  }

  group.traverse((child) => {
    if (!child.userData.compPinId && !child.userData.interactiveCompUid) {
      child.userData.draggableCompUid = comp.uid;
    } else if (child.userData.interactiveCompUid) {
      child.userData.draggableCompUid = comp.uid;
    }
  });

  attachComponentPins(group, comp, item.pins, pinAnchors);
  return { group, pinAnchors, selectionRing, updateVisual };
}

/** Renderiza miniaturas 3D reales en PNG para cada componente del catálogo */
export function renderComponentThumbnails(): Map<ComponentType, string> {
  const map = new Map<ComponentType, string>();
  if (typeof document === 'undefined') return map;

  const w = 96;
  const h = 76;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xfffdf5, 0x8a95a0, 1.15);
  const key = new THREE.DirectionalLight(0xfff7e6, 1.5);
  key.position.set(4, 7, 5);
  scene.add(hemi, key);

  const cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 30);

  for (const item of COMPONENT_CATALOG) {
    const dummy: PlacedComponent = {
      uid: `thumb_${item.type}`,
      type: item.type,
      name: item.name,
      position: [0, 0, 0],
      rotationY: 0,
      props: { ...item.defaultProps },
      state: {},
    };
    const built = buildComponent3D(dummy);
    scene.add(built.group);

    const box = new THREE.Box3().setFromObject(built.group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.8);
    cam.position.set(center.x + maxDim * 1.45, center.y + maxDim * 1.35, center.z + maxDim * 1.55);
    cam.lookAt(center);

    renderer.render(scene, cam);
    map.set(item.type, renderer.domElement.toDataURL('image/png'));
    scene.remove(built.group);
  }

  renderer.forceContextLoss();
  renderer.dispose();
  return map;
}
