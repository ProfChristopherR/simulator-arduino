export type PinoutBoardTab = 'uno' | 'esp32' | 'esp32_shield';

export type TagKind = 'power' | 'arduino' | 'mcu' | 'pwm' | 'adc' | 'comm' | 'int' | 'nc';

export interface PinTag {
  text: string;
  kind: TagKind;
}

export interface PinoutRowSpec {
  id: string;
  title: string;
  voltage: string;
  safety: 'safe' | 'warn-3v3' | 'gnd' | 'nc';
  tags: PinTag[];
  description: string;
  codeExample: string;
}

export const TAG_PALETTE: Record<
  TagKind,
  { label: string; fill: string; text: string; stroke?: string }
> = {
  power: { label: 'Energía (Power)', fill: '#4e8bc9', text: '#ffffff' },
  arduino: { label: 'Pines Arduino / GPIO', fill: '#16bfb5', text: '#0d1b1e' },
  mcu: { label: 'Registro MCU / Hardware', fill: '#e88635', text: '#151515' },
  pwm: { label: 'PWM (~)', fill: '#e0469b', text: '#ffffff' },
  adc: { label: 'ADC (Analógico)', fill: '#ffffff', text: '#151515', stroke: '#475569' },
  comm: { label: 'Comunicación (I²C / SPI / UART)', fill: '#82c941', text: '#151515' },
  int: { label: 'Interrupción / Touch', fill: '#facc15', text: '#151515' },
  nc: { label: 'NC / Solo entrada', fill: '#df4b37', text: '#ffffff' },
};

function pillWidth(text: string): number {
  return Math.max(36, Math.round(text.length * 7.6 + 15));
}

function renderTagPill(tag: PinTag, x: number, yCenter: number): { svg: string; w: number } {
  const pal = TAG_PALETTE[tag.kind];
  const w = pillWidth(tag.text);
  const h = 19;
  const stroke = pal.stroke ?? pal.fill;
  const svg = `
    <g class="po-tag" data-tag-kind="${tag.kind}">
      <rect x="${x}" y="${yCenter - h / 2}" width="${w}" height="${h}" rx="3.5" fill="${pal.fill}" stroke="${stroke}" stroke-width="1.2" />
      <text x="${x + w / 2}" y="${yCenter + 3.6}" text-anchor="middle" fill="${pal.text}" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="700">${tag.text}</text>
    </g>
  `;
  return { svg, w };
}

function rowMatchesFilter(tags: PinTag[], activeFilter: 'all' | TagKind): boolean {
  if (activeFilter === 'all') return true;
  return tags.some((t) => t.kind === activeFilter);
}

/** Dibuja una fila con línea horizontal hacia la izquierda (padX -> izq) o derecha (padX -> der). */
function renderPinRowSvg(opts: {
  row: PinoutRowSpec;
  side: 'left' | 'right';
  padX: number;
  padY: number;
  lineEndX: number;
  rowY?: number;
  selectedId: string;
  activeFilter: 'all' | TagKind;
}): string {
  const { row, side, padX, padY, lineEndX, selectedId, activeFilter } = opts;
  const ry = opts.rowY ?? padY;
  const match = rowMatchesFilter(row.tags, activeFilter);
  const isSel = row.id === selectedId;
  const gap = 4;

  let pillsSvg = '';
  let minX = lineEndX;
  let maxX = lineEndX;

  if (side === 'right') {
    let cx = lineEndX + 4;
    for (const t of row.tags) {
      const { svg, w } = renderTagPill(t, cx, ry);
      pillsSvg += svg;
      cx += w + gap;
    }
    maxX = cx;
  } else {
    let cx = lineEndX - 4;
    for (const t of row.tags) {
      const w = pillWidth(t.text);
      const { svg } = renderTagPill(t, cx - w, ry);
      pillsSvg += svg;
      cx -= w + gap;
    }
    minX = cx;
  }

  const leaderPath =
    Math.abs(ry - padY) < 0.5
      ? `M${padX},${padY} L${lineEndX},${ry}`
      : `M${padX},${padY} L${side === 'left' ? padX - 18 : padX + 18},${padY} L${lineEndX},${ry}`;

  const selHighlight = isSel
    ? `<rect x="${minX - 4}" y="${ry - 12.5}" width="${maxX - minX + 8}" height="25" rx="6" fill="rgba(0,194,181,0.16)" stroke="#00c2b5" stroke-width="2" />`
    : '';

  const padDotColor = isSel ? '#00c2b5' : TAG_PALETTE[row.tags[0]?.kind ?? 'arduino'].fill;

  return `
    <g class="po-row ${isSel ? 'is-selected' : ''} ${match ? '' : 'is-dimmed'}" data-pin-row="${row.id}" tabindex="0" role="button" aria-label="${row.title}">
      ${selHighlight}
      <path d="${leaderPath}" fill="none" stroke="${isSel ? '#00786f' : '#475569'}" stroke-width="${isSel ? 2.2 : 1.3}" />
      <circle cx="${padX}" cy="${padY}" r="${isSel ? 5 : 3.5}" fill="${padDotColor}" stroke="#0f172a" stroke-width="1.2" />
      ${pillsSvg}
    </g>
  `;
}

/* =========================================================================
 * 1. ARDUINO UNO R3 — PINOUT DE REFERENCIA VERTICAL
 * ========================================================================= */
const UNO_LEFT_ROWS: PinoutRowSpec[] = [
  {
    id: 'uno_nc',
    title: 'NC (Not Connected)',
    voltage: 'Sin conexión',
    safety: 'nc',
    tags: [{ text: 'NC', kind: 'nc' }],
    description: 'Pin reservado en el estándar Arduino R3 sin conexión eléctrica interna. No conectes cables aquí.',
    codeExample: '// Pin NC sin función eléctrica: dejar libre.',
  },
  {
    id: 'uno_ioref',
    title: 'IOREF (Referencia Lógica 5 V)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [{ text: 'IOREF', kind: 'power' }],
    description: 'Informa a los shields compatibles a qué voltaje lógico opera la placa (5 V en Arduino Uno R3).',
    codeExample: '// Referencia pasiva automática para shields.',
  },
  {
    id: 'uno_rst',
    title: 'RESET / PC6',
    voltage: '5 V (Activo BAJO)',
    safety: 'safe',
    tags: [
      { text: 'RESET', kind: 'power' },
      { text: 'PC6', kind: 'mcu' },
    ],
    description: 'Reinicia el microcontrolador ATmega328P al llevar este pin brevemente a GND (0 V).',
    codeExample: '// Conectar un pulsador entre RESET y GND reinicia el programa.',
  },
  {
    id: 'uno_3v3',
    title: '3.3V (Salida Regulada)',
    voltage: '3.3 V (máx. 50 mA)',
    safety: 'safe',
    tags: [{ text: '3.3V', kind: 'power' }],
    description: 'Entrega 3.3 V regulados para alimentar sensores modernos como BME280, OLED o NRF24L01.',
    codeExample: '// Usa 3.3V para VCC de sensores 3.3V + Level Shifter en señales.',
  },
  {
    id: 'uno_5v',
    title: '5V (Salida Regulada Principal)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [{ text: '5V', kind: 'power' }],
    description: 'Fuente regulada de 5 V para protoboard, pantallas LCD I²C, potenciómetros, servos pequeños y relés.',
    codeExample: '// Alimenta sensores de 5 V conectando VCC a 5V y GND a GND.',
  },
  {
    id: 'uno_gnd1',
    title: 'GND (Tierra Común)',
    voltage: '0 V',
    safety: 'gnd',
    tags: [{ text: 'GND', kind: 'power' }],
    description: 'Referencia de 0 V. Todos los GND de la placa están unidos entre sí para cerrar cada circuito.',
    codeExample: '// Todo circuito requiere cerrar el retorno hacia GND.',
  },
  {
    id: 'uno_gnd2',
    title: 'GND (Tierra Común Auxiliar)',
    voltage: '0 V',
    safety: 'gnd',
    tags: [{ text: 'GND', kind: 'power' }],
    description: 'Segundo terminal de tierra en el bloque POWER para conectar el riel negativo azul de la protoboard.',
    codeExample: '// Cable negro recomendado: GND -> riel "-" de la protoboard.',
  },
  {
    id: 'uno_vin',
    title: 'VIN (Entrada Externa 7–12 V)',
    voltage: '7–12 V DC',
    safety: 'safe',
    tags: [{ text: 'VIN', kind: 'power' }],
    description: 'Permite alimentar Arduino desde batería o fuente externa pasando por el regulador de 5 V.',
    codeExample: '// Conecta positivo de batería 9 V a VIN y negativo a GND.',
  },
  {
    id: 'uno_a0',
    title: 'A0 / PC0 (Entrada Analógica 0)',
    voltage: '0–5 V (10 bits)',
    safety: 'safe',
    tags: [
      { text: 'A0', kind: 'adc' },
      { text: 'PC0', kind: 'mcu' },
    ],
    description: 'Entrada analógica de 10 bits (0 a 1023). También puede usarse como pin digital adicional (D14).',
    codeExample: 'int val = analogRead(A0); // Devuelve 0..1023',
  },
  {
    id: 'uno_a1',
    title: 'A1 / PC1 (Entrada Analógica 1)',
    voltage: '0–5 V (10 bits)',
    safety: 'safe',
    tags: [
      { text: 'A1', kind: 'adc' },
      { text: 'PC1', kind: 'mcu' },
    ],
    description: 'Ideal para leer sensores resistivos como LDR (fotoresistencia), potenciómetros o humedad de suelo.',
    codeExample: 'int luz = analogRead(A1);',
  },
  {
    id: 'uno_a2',
    title: 'A2 / PC2 (Entrada Analógica 2)',
    voltage: '0–5 V (10 bits)',
    safety: 'safe',
    tags: [
      { text: 'A2', kind: 'adc' },
      { text: 'PC2', kind: 'mcu' },
    ],
    description: 'Tercer canal del conversor ADC interno del ATmega328P. También soporta E/S digital.',
    codeExample: 'int sensor = analogRead(A2);',
  },
  {
    id: 'uno_a3',
    title: 'A3 / PC3 (Entrada Analógica 3)',
    voltage: '0–5 V (10 bits)',
    safety: 'safe',
    tags: [
      { text: 'A3', kind: 'adc' },
      { text: 'PC3', kind: 'mcu' },
    ],
    description: 'Canal ADC de 10 bits para sensores analógicos o ejes X/Y de joysticks.',
    codeExample: 'int joyX = analogRead(A3);',
  },
  {
    id: 'uno_a4_l',
    title: 'A4 / SDA / PC4 (Datos I²C)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'A4', kind: 'adc' },
      { text: 'SDA', kind: 'comm' },
      { text: 'PC4', kind: 'mcu' },
    ],
    description: 'Doble función: entrada analógica A4 o línea de datos SDA del bus I²C (LCD 16×2, OLED, BME280).',
    codeExample: '#include <Wire.h>\nWire.begin(); // Usa A4 (SDA) y A5 (SCL)',
  },
  {
    id: 'uno_a5_l',
    title: 'A5 / SCL / PC5 (Reloj I²C)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'A5', kind: 'adc' },
      { text: 'SCL', kind: 'comm' },
      { text: 'PC5', kind: 'mcu' },
    ],
    description: 'Doble función: entrada analógica A5 o reloj sincronizador SCL del bus I²C.',
    codeExample: '#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);',
  },
];

const UNO_RIGHT_ROWS: PinoutRowSpec[] = [
  {
    id: 'uno_scl_r',
    title: 'SCL / A5 (Duplicado I²C Superior)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'A5', kind: 'adc' },
      { text: 'SCL', kind: 'comm' },
      { text: 'PC5', kind: 'mcu' },
    ],
    description: 'Conectado internamente a A5 para que los shields Arduino R3 accedan al reloj I²C desde la fila superior.',
    codeExample: 'Wire.begin(); // Comparte bus con A5 inferior',
  },
  {
    id: 'uno_sda_r',
    title: 'SDA / A4 (Duplicado I²C Superior)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'A4', kind: 'adc' },
      { text: 'SDA', kind: 'comm' },
      { text: 'PC4', kind: 'mcu' },
    ],
    description: 'Conectado internamente a A4 (SDA) para módulos I²C y shields Arduino R3.',
    codeExample: 'Wire.begin(); // Comparte bus con A4 inferior',
  },
  {
    id: 'uno_aref',
    title: 'AREF (Referencia Analógica)',
    voltage: '0–5 V',
    safety: 'safe',
    tags: [{ text: 'AREF', kind: 'power' }],
    description: 'Voltaje de referencia externo opcional para calibrar el rango máximo del conversor ADC (A0–A5).',
    codeExample: 'analogReference(EXTERNAL);',
  },
  {
    id: 'uno_gnd_top',
    title: 'GND Superior (Tierra Digital)',
    voltage: '0 V',
    safety: 'gnd',
    tags: [{ text: 'GND', kind: 'power' }],
    description: 'Terminal GND ubicado junto a D13 muy práctico para cerrar rápidamente el circuito de un LED.',
    codeExample: '// LED: ánodo vía 220 Ω -> D13, cátodo -> GND superior.',
  },
  {
    id: 'uno_d13',
    title: 'D13 / SCK / PB5 (LED Integrado L)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D13', kind: 'arduino' },
      { text: 'SCK', kind: 'comm' },
      { text: 'PB5', kind: 'mcu' },
    ],
    description: 'Controla el LED amarillo "L" integrado en la placa y funciona como reloj SCK del bus SPI.',
    codeExample: 'pinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);',
  },
  {
    id: 'uno_d12',
    title: 'D12 / MISO / PB4 (SPI)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D12', kind: 'arduino' },
      { text: 'MISO', kind: 'comm' },
      { text: 'PB4', kind: 'mcu' },
    ],
    description: 'Pin digital y entrada de datos MISO del bus SPI (lectores RFID RC522, tarjetas SD, radio RF).',
    codeExample: 'pinMode(12, INPUT_PULLUP);',
  },
  {
    id: 'uno_d11',
    title: 'D11 (~PWM) / MOSI / PB3',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D11', kind: 'arduino' },
      { text: 'MOSI', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PB3', kind: 'mcu' },
    ],
    description: 'Pin digital con modulación PWM (~) de 8 bits y salida MOSI del bus SPI.',
    codeExample: 'analogWrite(11, 180); // Brillo o velocidad PWM',
  },
  {
    id: 'uno_d10',
    title: 'D10 (~PWM) / SS / PB2',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D10', kind: 'arduino' },
      { text: 'SS', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PB2', kind: 'mcu' },
    ],
    description: 'Soporta PWM (~) y selección de esclavo SS (Slave Select / SDA en lectores RFID-RC522).',
    codeExample: 'MFRC522 rfid(10, 9); // SS=D10, RST=D9',
  },
  {
    id: 'uno_d9',
    title: 'D9 (~PWM) / PB1',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D9', kind: 'arduino' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PB1', kind: 'mcu' },
    ],
    description: 'Pin PWM ideal para servomotores SG90/MG996R, LEDs atenuables y canales RGB.',
    codeExample: 'Servo miServo;\nmiServo.attach(9);\nmiServo.write(90);',
  },
  {
    id: 'uno_d8',
    title: 'D8 / PB0',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D8', kind: 'arduino' },
      { text: 'PB0', kind: 'mcu' },
    ],
    description: 'Pin digital de propósito general muy usado para buzzer pasivo (tone) o lectura de sensores.',
    codeExample: 'tone(8, 440, 250); // Nota La 440 Hz',
  },
  {
    id: 'uno_d7',
    title: 'D7 / PD7',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D7', kind: 'arduino' },
      { text: 'PD7', kind: 'mcu' },
    ],
    description: 'Entrada/salida digital de propósito general para relés, interruptores o segmentos de display.',
    codeExample: 'digitalWrite(7, HIGH);',
  },
  {
    id: 'uno_d6',
    title: 'D6 (~PWM) / PD6',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D6', kind: 'arduino' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PD6', kind: 'mcu' },
    ],
    description: 'Pin digital con salida PWM (~) para variar intensidad o controlar puente H.',
    codeExample: 'analogWrite(6, 128);',
  },
  {
    id: 'uno_d5',
    title: 'D5 (~PWM) / PD5',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D5', kind: 'arduino' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PD5', kind: 'mcu' },
    ],
    description: 'Pin digital con salida PWM (~) hardware controlada por Timer0.',
    codeExample: 'analogWrite(5, 255);',
  },
  {
    id: 'uno_d4',
    title: 'D4 / PD4',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D4', kind: 'arduino' },
      { text: 'PD4', kind: 'mcu' },
    ],
    description: 'Entrada/salida digital estándar ideal para pulsadores o sensor DHT11/DHT22.',
    codeExample: 'DHT dht(4, DHT11);',
  },
  {
    id: 'uno_d3',
    title: 'D3 (~PWM) / INT1 / PD3',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D3', kind: 'arduino' },
      { text: 'INT1', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'PD3', kind: 'mcu' },
    ],
    description: 'Uno de los dos pines con interrupción externa hardware (INT1) además de soportar PWM (~).',
    codeExample: 'attachInterrupt(digitalPinToInterrupt(3), miISR, RISING);',
  },
  {
    id: 'uno_d2',
    title: 'D2 / INT0 / PD2',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D2', kind: 'arduino' },
      { text: 'INT0', kind: 'int' },
      { text: 'PD2', kind: 'mcu' },
    ],
    description: 'Pin clásico de interrupción externa rápida (INT0) usado en encoders ópticos, botones críticos o PIR.',
    codeExample: 'attachInterrupt(digitalPinToInterrupt(2), contarPulso, FALLING);',
  },
  {
    id: 'uno_d1',
    title: 'D1 / TX / PD1 (Transmisión Serial)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D1', kind: 'arduino' },
      { text: 'TX', kind: 'comm' },
      { text: 'PD1', kind: 'mcu' },
    ],
    description: 'Transmite datos USB Serial hacia el computador. Evita usarlo para LEDs si utilizas Serial.begin().',
    codeExample: 'Serial.println("Transmitiendo por TX (D1)");',
  },
  {
    id: 'uno_d0',
    title: 'D0 / RX / PD0 (Recepción Serial)',
    voltage: '5.0 V',
    safety: 'safe',
    tags: [
      { text: 'D0', kind: 'arduino' },
      { text: 'RX', kind: 'comm' },
      { text: 'PD0', kind: 'mcu' },
    ],
    description: 'Recibe datos Serial por USB/UART. Desconecta cables en D0/D1 al cargar sketches en placa real.',
    codeExample: 'if (Serial.available()) { char c = Serial.read(); }',
  },
];

/* =========================================================================
 * 2. ESP32 DEVKIT V1 (30 PINES) — PINOUT DE REFERENCIA VERTICAL
 * ========================================================================= */
const ESP_LEFT_ROWS: PinoutRowSpec[] = [
  {
    id: 'esp_en',
    title: 'EN (Chip Enable / Reset)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [{ text: 'EN', kind: 'power' }],
    description: 'Habilita el chip ESP32 (HIGH = encendido). Pulsarlo a tierra reinicia la placa.',
    codeExample: '// Conectado al botón EN de la placa (activo en BAJO).',
  },
  {
    id: 'esp_vp',
    title: 'GPIO36 (VP / ADC1_0 · Solo entrada)',
    voltage: '0–3.3 V (INPUT ONLY)',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO36', kind: 'arduino' },
      { text: 'ADC1_0', kind: 'adc' },
      { text: 'INPUT', kind: 'nc' },
    ],
    description: 'Canal analógico ADC1 de 12 bits (0–4095). No tiene pull-up/down interno ni funciona como salida.',
    codeExample: 'int raw = analogRead(36); // Lee 0..4095 a 3.3 V máx.',
  },
  {
    id: 'esp_vn',
    title: 'GPIO39 (VN / ADC1_3 · Solo entrada)',
    voltage: '0–3.3 V (INPUT ONLY)',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO39', kind: 'arduino' },
      { text: 'ADC1_3', kind: 'adc' },
      { text: 'INPUT', kind: 'nc' },
    ],
    description: 'Canal analógico ADC1 inmune a interferencia Wi-Fi. Solo lectura; nunca usarlo con OUTPUT.',
    codeExample: 'int v = analogRead(39);',
  },
  {
    id: 'esp_g34',
    title: 'GPIO34 (ADC1_6 · Solo entrada)',
    voltage: '0–3.3 V (INPUT ONLY)',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO34', kind: 'arduino' },
      { text: 'ADC1_6', kind: 'adc' },
      { text: 'INPUT', kind: 'nc' },
    ],
    description: 'Entrada analógica y digital recomendada incluso con Wi-Fi activo. No soporta digitalWrite ni PWM.',
    codeExample: 'int hum = analogRead(34);',
  },
  {
    id: 'esp_g35',
    title: 'GPIO35 (ADC1_7 · Solo entrada)',
    voltage: '0–3.3 V (INPUT ONLY)',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO35', kind: 'arduino' },
      { text: 'ADC1_7', kind: 'adc' },
      { text: 'INPUT', kind: 'nc' },
    ],
    description: 'Entrada analógica 12 bits de ADC1 ideal para LDR o potenciómetros alimentados a 3.3 V.',
    codeExample: 'int pot = analogRead(35);',
  },
  {
    id: 'esp_g32',
    title: 'GPIO32 (ADC1_4 / Touch9 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO32', kind: 'arduino' },
      { text: 'ADC1_4', kind: 'adc' },
      { text: 'TOUCH9', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Pin completo bidireccional: soporta lectura analógica segura con Wi-Fi, sensor táctil capacitivo y PWM.',
    codeExample: 'int t = touchRead(32); // Mide toque capacitivo',
  },
  {
    id: 'esp_g33',
    title: 'GPIO33 (ADC1_5 / Touch8 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO33', kind: 'arduino' },
      { text: 'ADC1_5', kind: 'adc' },
      { text: 'TOUCH8', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Entrada/salida muy versátil para sensores analógicos, PWM, LEDs o relés a 3.3 V.',
    codeExample: 'analogWrite(33, 180);',
  },
  {
    id: 'esp_g25',
    title: 'GPIO25 (DAC1 / ADC2_8 / PWM)',
    voltage: '0–3.3 V Analógico Real',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO25', kind: 'arduino' },
      { text: 'DAC1', kind: 'mcu' },
      { text: 'ADC2_8', kind: 'adc' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Conversor digital-analógico real (DAC de 8 bits): genera voltaje continuo real entre 0 V y 3.3 V.',
    codeExample: 'dacWrite(25, 128); // Genera ~1.65 V reales',
  },
  {
    id: 'esp_g26',
    title: 'GPIO26 (DAC2 / ADC2_9 / PWM)',
    voltage: '0–3.3 V Analógico Real',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO26', kind: 'arduino' },
      { text: 'DAC2', kind: 'mcu' },
      { text: 'ADC2_9', kind: 'adc' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Segundo canal DAC real para síntesis de audio o señales analógicas puras sin PWM.',
    codeExample: 'dacWrite(26, 200);',
  },
  {
    id: 'esp_g27',
    title: 'GPIO27 (Touch7 / PWM / ADC2_7)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO27', kind: 'arduino' },
      { text: 'TOUCH7', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'ADC2_7', kind: 'adc' },
    ],
    description: 'Pin GPIO recomendado para salidas digitales, servomotores, ultrasonido o botones.',
    codeExample: 'pinMode(27, OUTPUT); digitalWrite(27, HIGH);',
  },
  {
    id: 'esp_g14',
    title: 'GPIO14 (HSPI CLK / Touch6 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO14', kind: 'arduino' },
      { text: 'HSPICLK', kind: 'comm' },
      { text: 'TOUCH6', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Emite breve señal PWM durante el arranque antes de estabilizarse como GPIO normal.',
    codeExample: 'pinMode(14, OUTPUT);',
  },
  {
    id: 'esp_g12',
    title: 'GPIO12 (HSPI MISO · Strapping Boot)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO12', kind: 'arduino' },
      { text: 'BOOT!', kind: 'mcu' },
      { text: 'TOUCH5', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Pin de arranque (strapping): si está en HIGH al encender puede fallar el boot de Flash.',
    codeExample: '// Úsalo preferentemente como OUTPUT o evita pull-up fuerte.',
  },
  {
    id: 'esp_g13',
    title: 'GPIO13 (HSPI MOSI / Touch4 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO13', kind: 'arduino' },
      { text: 'HSPID', kind: 'comm' },
      { text: 'TOUCH4', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Pin digital limpio de propósito general con soporte PWM, SPI secundario y Touch.',
    codeExample: 'pinMode(13, OUTPUT); digitalWrite(13, HIGH);',
  },
  {
    id: 'esp_gnd1',
    title: 'GND (Tierra Común Izquierda)',
    voltage: '0 V',
    safety: 'gnd',
    tags: [{ text: 'GND', kind: 'power' }],
    description: 'Tierra de referencia de 0 V unida al plano GND de toda la placa y puerto USB.',
    codeExample: '// Unir GND con la protoboard y fuentes externas.',
  },
  {
    id: 'esp_vin',
    title: 'VIN (Entrada 5 V hacia Regulador)',
    voltage: '5.0 V entrada',
    safety: 'safe',
    tags: [{ text: 'VIN', kind: 'power' }],
    description: 'Alimenta la placa con 5 V externos cuando no usas USB. El AMS1117 los reduce internamente a 3.3 V.',
    codeExample: '// Ojo: VIN espera 5 V; los pines GPIO siguen siendo de 3.3 V.',
  },
];

const ESP_RIGHT_ROWS: PinoutRowSpec[] = [
  {
    id: 'esp_g23',
    title: 'GPIO23 (VSPI MOSI / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO23', kind: 'arduino' },
      { text: 'MOSI', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Línea principal MOSI del bus VSPI de alta velocidad para pantallas TFT, RFID RC522 y microSD.',
    codeExample: 'SPI.begin(); // MOSI por defecto en GPIO23',
  },
  {
    id: 'esp_g22',
    title: 'GPIO22 (I²C SCL por defecto)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO22', kind: 'arduino' },
      { text: 'SCL', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Reloj SCL por defecto del bus I²C en Arduino-ESP32 para sensores BME280, OLED SSD1306 y MPU6050.',
    codeExample: 'Wire.begin(21, 22); // SDA=21, SCL=22',
  },
  {
    id: 'esp_tx0',
    title: 'GPIO1 (TX0 / UART0)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO1', kind: 'arduino' },
      { text: 'TX0', kind: 'comm' },
    ],
    description: 'Salida serial principal conectada al chip CP2102 hacia el USB. Úsalo solo si no usas Serial.',
    codeExample: 'Serial.begin(115200); // Imprime hacia la PC vía TX0',
  },
  {
    id: 'esp_rx0',
    title: 'GPIO3 (RX0 / UART0)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO3', kind: 'arduino' },
      { text: 'RX0', kind: 'comm' },
    ],
    description: 'Recepción serial principal desde el puente USB CP2102. Emite HIGH durante el arranque.',
    codeExample: 'if (Serial.available()) { ... }',
  },
  {
    id: 'esp_g21',
    title: 'GPIO21 (I²C SDA por defecto)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO21', kind: 'arduino' },
      { text: 'SDA', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Datos SDA por defecto del bus I²C en ESP32 DevKit V1. Muy limpio para cualquier entrada/salida.',
    codeExample: 'Wire.begin(21, 22); // SDA en GPIO21',
  },
  {
    id: 'esp_g19',
    title: 'GPIO19 (VSPI MISO / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO19', kind: 'arduino' },
      { text: 'MISO', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Línea de retorno MISO del bus VSPI y pin digital/PWM limpio y libre de conflictos de arranque.',
    codeExample: 'pinMode(19, INPUT);',
  },
  {
    id: 'esp_g18',
    title: 'GPIO18 (VSPI SCK / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO18', kind: 'arduino' },
      { text: 'SCK', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Reloj SCK por defecto del bus VSPI de ESP32. Excelente también para sensores digitales.',
    codeExample: 'SPI.begin(18, 19, 23, 5);',
  },
  {
    id: 'esp_g5',
    title: 'GPIO5 (VSPI SS / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO5', kind: 'arduino' },
      { text: 'SS', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Chip Select (CS/SS) predeterminado de VSPI. Adecuado para relés, servos y controladores PWM.',
    codeExample: 'pinMode(5, OUTPUT);',
  },
  {
    id: 'esp_g17',
    title: 'GPIO17 (UART2 TX2 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO17', kind: 'arduino' },
      { text: 'TX2', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Transmisión serie secundaria Serial2 ideal para sensores de CO₂ MH-Z19, GPS o módulos GSM.',
    codeExample: 'Serial2.begin(9600, SERIAL_8N1, 16, 17);',
  },
  {
    id: 'esp_g16',
    title: 'GPIO16 (UART2 RX2 / PWM)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO16', kind: 'arduino' },
      { text: 'RX2', kind: 'comm' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Recepción serie secundaria Serial2 sin interferir con el monitor serial USB.',
    codeExample: 'Serial2.begin(9600, SERIAL_8N1, 16, 17);',
  },
  {
    id: 'esp_g4',
    title: 'GPIO4 (Touch0 / PWM / ADC2_0)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO4', kind: 'arduino' },
      { text: 'TOUCH0', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'ADC2_0', kind: 'adc' },
    ],
    description: 'Pin GPIO muy confiable para sensores DHT11, pulsadores, servos o detección táctil.',
    codeExample: 'DHT dht(4, DHT11);',
  },
  {
    id: 'esp_g2',
    title: 'GPIO2 (LED Azul Integrado / Touch2)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO2', kind: 'arduino' },
      { text: 'LED', kind: 'mcu' },
      { text: 'TOUCH2', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
    ],
    description: 'Conectado al LED azul integrado en la DevKit V1. Debe mantenerse libre de pull-up fuerte en flash.',
    codeExample: 'pinMode(2, OUTPUT);\ndigitalWrite(2, HIGH); // Enciende LED azul',
  },
  {
    id: 'esp_g15',
    title: 'GPIO15 (Touch3 / PWM / Boot)',
    voltage: '3.3 V',
    safety: 'warn-3v3',
    tags: [
      { text: 'GPIO15', kind: 'arduino' },
      { text: 'TOUCH3', kind: 'int' },
      { text: 'PWM', kind: 'pwm' },
      { text: 'BOOT!', kind: 'mcu' },
    ],
    description: 'Pin digital y PWM funcional; controla mensajes de depuración ROM al iniciar.',
    codeExample: 'pinMode(15, OUTPUT);',
  },
  {
    id: 'esp_gnd2',
    title: 'GND (Tierra Común Derecha)',
    voltage: '0 V',
    safety: 'gnd',
    tags: [{ text: 'GND', kind: 'power' }],
    description: 'Terminal GND directo junto al pin 3V3 para cerrar fácilmente la alimentación de módulos I²C.',
    codeExample: '// Conecta VCC a 3.3V y GND al terminal adjunto.',
  },
  {
    id: 'esp_3v3',
    title: '3.3V (Salida Regulada Principal)',
    voltage: '3.3 V (hasta ~600 mA)',
    safety: 'safe',
    tags: [{ text: '3.3V', kind: 'power' }],
    description: 'Salida estable de 3.3 V desde el AMS1117 para alimentar BME280, OLED, LDR y sensores a 3.3 V.',
    codeExample: '// Alimenta sensores de 3.3 V directamente aquí.',
  },
];

/* =========================================================================
 * MAPA DE INSPECTOR POR ID
 * ========================================================================= */
const ALL_ROWS: PinoutRowSpec[] = [
  ...UNO_LEFT_ROWS,
  ...UNO_RIGHT_ROWS,
  ...ESP_LEFT_ROWS,
  ...ESP_RIGHT_ROWS,
];

export function findPinoutRowById(id: string): PinoutRowSpec | undefined {
  return ALL_ROWS.find((r) => r.id === id);
}

/* =========================================================================
 * RENDERIZADORES SVG COMPLETOS ESTILO REFERENCIA
 * ========================================================================= */
function renderArduinoUnoPoster(selectedId: string, activeFilter: 'all' | TagKind): string {
  const bx = 420;
  const by = 148;
  const bw = 280;
  const bh = 408;

  // Coordenadas Y de los bancos de pines izquierdo y derecho sobre la placa vertical
  const leftStartPowerY = 236;
  const leftGapAnalogs = 24;
  const step = 19.5;

  const leftCoords: Array<{ y: number; row: PinoutRowSpec }> = UNO_LEFT_ROWS.map((row, idx) => {
    const extraGap = idx >= 8 ? leftGapAnalogs : 0;
    return { y: leftStartPowerY + idx * step + extraGap, row };
  });

  const rightStartY = 186;
  const rightCoords: Array<{ y: number; row: PinoutRowSpec }> = UNO_RIGHT_ROWS.map((row, idx) => {
    const gapAfterD8 = idx >= 10 ? 14 : 0;
    return { y: rightStartY + idx * step + gapAfterD8, row };
  });

  const leftSvg = leftCoords
    .map(({ y, row }) =>
      renderPinRowSvg({
        row,
        side: 'left',
        padX: bx + 11,
        padY: y,
        lineEndX: bx - 46,
        rowY: y,
        selectedId,
        activeFilter,
      })
    )
    .join('');

  const rightSvg = rightCoords
    .map(({ y, row }) =>
      renderPinRowSvg({
        row,
        side: 'right',
        padX: bx + bw - 11,
        padY: y,
        lineEndX: bx + bw + 46,
        rowY: y,
        selectedId,
        activeFilter,
      })
    )
    .join('');

  return `
    <svg class="pinout-svg" viewBox="0 0 1120 790" role="img" aria-label="Diagrama Pinout Arduino Uno R3">
      <defs>
        <pattern id="po-grid-uno" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.9" fill="rgba(21,21,21,0.12)" />
        </pattern>
        <clipPath id="loupe-clip-16u2"><circle cx="945" cy="108" r="42" /></clipPath>
        <clipPath id="loupe-clip-icsp"><circle cx="560" cy="686" r="44" /></clipPath>
      </defs>

      <rect width="1120" height="790" rx="16" fill="#fcfaf4" />
      <rect width="1120" height="790" rx="16" fill="url(#po-grid-uno)" />

      <!-- Título estilo referencia -->
      <text x="560" y="48" text-anchor="middle" fill="#151515" font-family="'Space Grotesk', sans-serif" font-size="30" font-weight="800" letter-spacing="0.02em">
        ARDUINO UNO R3 · PINOUT
      </text>
      <text x="560" y="70" text-anchor="middle" fill="#00786f" font-family="'JetBrains Mono', monospace" font-size="11.5" font-weight="700" letter-spacing="0.08em">
        ATMEGA328P · LÓGICA 5 V · RELOJ 16 MHz · HAZ CLIC EN CUALQUIER PIN
      </text>

      <!-- Callouts superiores (DC Jack, USB-B, Botón Reset) -->
      <g class="po-callout">
        <text x="456" y="106" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">Jack DC 2.1 mm</text>
        <text x="456" y="120" text-anchor="middle" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="10">(7–12 V)</text>
        <line x1="456" y1="125" x2="456" y2="146" stroke="#c8402f" stroke-width="1.8" />

        <text x="598" y="106" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">Puerto USB Type-B</text>
        <text x="598" y="120" text-anchor="middle" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="10">(5 V + Serial)</text>
        <line x1="598" y1="125" x2="598" y2="142" stroke="#c8402f" stroke-width="1.8" />

        <text x="692" y="106" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">Botón RESET</text>
        <line x1="690" y1="112" x2="679" y2="156" stroke="#c8402f" stroke-width="1.8" />
      </g>

      <!-- Cuerpo PCB Arduino Uno R3 vertical detallado -->
      <g id="po-uno-board">
        <!-- Contorno PCB teal con muesca inferior derecha -->
        <polygon points="${bx},${by} ${bx + bw},${by} ${bx + bw},${by + bh - 18} ${bx + bw - 16},${by + bh} ${bx + 76},${by + bh} ${bx + 60},${by + bh - 14} ${bx + 16},${by + bh - 14} ${bx},${by + bh - 28}"
          fill="#00868f" stroke="#0f3d42" stroke-width="2.2" />

        <!-- Pistas sutiles decorativas -->
        <g stroke="rgba(94,242,230,0.22)" stroke-width="1.8" fill="none">
          <path d="M445,250 V480 L470,505 H580" />
          <path d="M675,200 V495 L635,515" />
          <path d="M510,235 H600 V385" />
        </g>

        <!-- 4 agujeros de montaje dorados -->
        <circle cx="${bx + 18}" cy="${by + 104}" r="6.5" fill="#1e293b" stroke="#e6b834" stroke-width="2.6" />
        <circle cx="${bx + bw - 18}" cy="${by + 16}" r="6.5" fill="#1e293b" stroke="#e6b834" stroke-width="2.6" />
        <circle cx="${bx + 84}" cy="${by + bh - 16}" r="6.5" fill="#1e293b" stroke="#e6b834" stroke-width="2.6" />
        <circle cx="${bx + bw - 34}" cy="${by + bh - 16}" r="6.5" fill="#1e293b" stroke="#e6b834" stroke-width="2.6" />

        <!-- Puerto DC negro (arriba izq) -->
        <rect x="${bx + 14}" y="${by - 12}" width="46" height="72" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
        <circle cx="${bx + 37}" cy="${by + 4}" r="9" fill="#090a0c" />
        <circle cx="${bx + 37}" cy="${by + 4}" r="3" fill="#cbd5e1" />

        <!-- Puerto USB Type-B metálico (arriba centro-der) -->
        <rect x="${bx + 146}" y="${by - 20}" width="64" height="84" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
        <rect x="${bx + 156}" y="${by + 18}" width="44" height="36" rx="2" fill="#94a3b8" opacity="0.6" />
        <text x="${bx + 178}" y="${by + 40}" text-anchor="middle" fill="#1e293b" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">USB</text>

        <!-- Botón Reset esquina superior derecha -->
        <rect x="${bx + bw - 36}" y="${by + 8}" width="24" height="24" rx="4" fill="#e2e8f0" stroke="#475569" stroke-width="1.5" />
        <circle cx="${bx + bw - 24}" cy="${by + 20}" r="6.5" fill="#d9462f" />

        <!-- Regulador de voltaje AMS1117 / NCP1117 -->
        <rect x="${bx + 80}" y="${by + 22}" width="38" height="24" rx="2" fill="#111827" stroke="#64748b" />
        <rect x="${bx + 90}" y="${by + 14}" width="18" height="9" fill="#cbd5e1" />

        <!-- Dos condensadores electrolíticos plateados -->
        <circle cx="${bx + 54}" cy="${by + 102}" r="14" fill="#e2e8f0" stroke="#475569" stroke-width="1.8" />
        <path d="M460,250 A14,14 0 0,1 488,250" fill="#1e293b" />
        <circle cx="${bx + 54}" cy="${by + 136}" r="14" fill="#e2e8f0" stroke="#475569" stroke-width="1.8" />
        <path d="M460,284 A14,14 0 0,1 488,284" fill="#1e293b" />

        <!-- Cristal 16 MHz -->
        <rect x="${bx + 128}" y="${by + 96}" width="18" height="38" rx="9" fill="#cbd5e1" stroke="#64748b" stroke-width="1.6" />
        <text x="${bx + 137}" y="${by + 118}" text-anchor="middle" fill="#334155" font-family="monospace" font-size="7" font-weight="700">16</text>

        <!-- ATmega16U2 QFN -->
        <rect x="${bx + 162}" y="${by + 86}" width="26" height="26" rx="2" fill="#111827" stroke="#64748b" />

        <!-- LEDs de estado TX, RX, L, ON -->
        <rect x="${bx + 150}" y="${by + 136}" width="11" height="7" rx="1.5" fill="#fbbf24" />
        <text x="${bx + 166}" y="${by + 142}" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="700">L</text>
        <rect x="${bx + 150}" y="${by + 154}" width="11" height="7" rx="1.5" fill="#fbbf24" />
        <text x="${bx + 166}" y="${by + 160}" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="700">TX</text>
        <rect x="${bx + 150}" y="${by + 168}" width="11" height="7" rx="1.5" fill="#fbbf24" />
        <text x="${bx + 166}" y="${by + 174}" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="700">RX</text>
        <rect x="${bx + 216}" y="${by + 152}" width="11" height="7" rx="1.5" fill="#4ade80" />
        <text x="${bx + 216}" y="${by + 170}" fill="#ffffff" font-family="monospace" font-size="7.5" font-weight="700">ON</text>

        <!-- Logo UNO vertical blanco -->
        <g transform="translate(${bx + 184}, ${by + 266}) rotate(90)">
          <rect x="-46" y="-22" width="92" height="44" rx="12" fill="none" stroke="#ffffff" stroke-width="2.5" />
          <text x="0" y="-2" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', sans-serif" font-size="14" font-weight="800">ARDUINO</text>
          <text x="0" y="14" text-anchor="middle" fill="#bef8f4" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700">UNO R3</text>
        </g>

        <!-- Microcontrolador ATmega328P DIP-28 vertical -->
        <rect x="${bx + 88}" y="${by + 210}" width="46" height="162" rx="4" fill="#12161d" stroke="#475569" stroke-width="1.8" />
        <g transform="translate(${bx + 111}, ${by + 291}) rotate(-90)">
          <text x="0" y="4" text-anchor="middle" fill="#e2e8f0" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700">ATMEGA328P-PU</text>
        </g>

        <!-- ICSP inferior en la placa -->
        <rect x="${bx + 122}" y="${by + bh - 34}" width="36" height="24" rx="2" fill="#111827" stroke="#64748b" />
        <text x="${bx + 112}" y="${by + bh - 18}" text-anchor="end" fill="#ffffff" font-family="monospace" font-size="8" font-weight="700">ICSP</text>

        <!-- Regletas negras izquierda (POWER / ANALOG) y derecha (DIGITAL) -->
        <rect x="${bx + 4}" y="${leftStartPowerY - 11}" width="16" height="${8 * step + 6}" rx="2" fill="#15181e" />
        <rect x="${bx + 4}" y="${leftStartPowerY + 8 * step + leftGapAnalogs - 11}" width="16" height="${6 * step + 6}" rx="2" fill="#15181e" />
        <rect x="${bx + bw - 20}" y="${rightStartY - 11}" width="16" height="${10 * step + 6}" rx="2" fill="#15181e" />
        <rect x="${bx + bw - 20}" y="${rightStartY + 10 * step + 14 - 11}" width="16" height="${8 * step + 6}" rx="2" fill="#15181e" />

        <!-- Textos serigrafiados junto a pines dentro de la PCB -->
        <text x="${bx + 26}" y="${leftStartPowerY + 3 * step}" fill="#e2e8f0" font-family="monospace" font-size="8" font-weight="700">POWER</text>
        <text x="${bx + 26}" y="${leftStartPowerY + 10.5 * step + leftGapAnalogs}" fill="#e2e8f0" font-family="monospace" font-size="8" font-weight="700">ANALOG</text>
        <text x="${bx + bw - 28}" y="${rightStartY + 9 * step}" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="8" font-weight="700">DIGITAL (~PWM)</text>
      </g>

      <!-- Pines y etiquetas izquierda/derecha interactivos -->
      ${leftSvg}
      ${rightSvg}

      <!-- Lupa superior derecha: ICSP ATmega16U2 -->
      <g class="po-loupe">
        <line x1="${bx + 216}" y1="${by + 68}" x2="904" y2="108" stroke="#df4b37" stroke-width="1.8" />
        <circle cx="945" cy="108" r="44" fill="#007f88" stroke="#0f3d42" stroke-width="2.2" />
        <rect x="927" y="84" width="36" height="48" rx="3" fill="#15181e" />
        <circle cx="936" cy="94" r="4" fill="#e6b834" />
        <circle cx="954" cy="94" r="4" fill="#e6b834" />
        <circle cx="936" cy="108" r="4" fill="#e6b834" />
        <circle cx="954" cy="108" r="4" fill="#e6b834" />
        <circle cx="936" cy="122" r="4" fill="#e6b834" />
        <circle cx="954" cy="122" r="4" fill="#e6b834" />
        ${renderTagPill({ text: 'GND', kind: 'power' }, 856, 86).svg}
        ${renderTagPill({ text: '5V', kind: 'power' }, 856, 126).svg}
        ${renderTagPill({ text: 'D10', kind: 'arduino' }, 996, 86).svg}
        ${renderTagPill({ text: 'D11', kind: 'arduino' }, 996, 126).svg}
        <text x="945" y="168" text-anchor="middle" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">ICSP 16U2</text>
      </g>

      <!-- Lupa inferior central: Conector ICSP principal (2x3 pines SPI + Reset) -->
      <g class="po-loupe">
        <line x1="${bx + 140}" y1="${by + bh - 12}" x2="560" y2="640" stroke="#df4b37" stroke-width="2" />
        <circle cx="560" cy="686" r="46" fill="#007f88" stroke="#0f3d42" stroke-width="2.4" />
        <rect x="532" y="666" width="56" height="40" rx="3" fill="#15181e" />
        <circle cx="543" cy="677" r="4" fill="#e6b834" />
        <circle cx="560" cy="677" r="4" fill="#e6b834" />
        <circle cx="577" cy="677" r="4" fill="#e6b834" />
        <circle cx="543" cy="695" r="4" fill="#e6b834" />
        <circle cx="560" cy="695" r="4" fill="#e6b834" />
        <circle cx="577" cy="695" r="4" fill="#e6b834" />
        <!-- Etiquetas del ICSP alrededor de la lupa -->
        ${renderTagPill({ text: 'RESET', kind: 'power' }, 440, 666).svg}
        ${renderTagPill({ text: 'GND', kind: 'power' }, 446, 706).svg}
        ${renderTagPill({ text: 'MISO · D12', kind: 'comm' }, 614, 666).svg}
        ${renderTagPill({ text: 'MOSI · D11', kind: 'comm' }, 614, 706).svg}
        ${renderTagPill({ text: 'SCK · D13', kind: 'arduino' }, 520, 622).svg}
        ${renderTagPill({ text: '5V', kind: 'power' }, 542, 746).svg}
      </g>

      ${renderLegendBlock(34, 594)}
    </svg>
  `;
}

function renderEsp32Poster(
  selectedId: string,
  activeFilter: 'all' | TagKind,
  withShield: boolean
): string {
  const step = 28;
  const startY = 178;

  // Coordenadas centrales: en modo Shield dibujamos el Breakout ancho detrás de la DevKit
  const bx = 468;
  const by = 136;
  const bw = 184;
  const bh = 466;

  const shX = 410;
  const shY = 104;
  const shW = 300;
  const shH = 528;

  const leftPadX = withShield ? shX + 18 : bx + 11;
  const rightPadX = withShield ? shX + shW - 18 : bx + bw - 11;
  const leftLineEnd = withShield ? shX - 30 : bx - 42;
  const rightLineEnd = withShield ? shX + shW + 30 : bx + bw + 42;

  const leftSvg = ESP_LEFT_ROWS.map((row, idx) =>
    renderPinRowSvg({
      row,
      side: 'left',
      padX: leftPadX,
      padY: startY + idx * step,
      lineEndX: leftLineEnd,
      rowY: startY + idx * step,
      selectedId,
      activeFilter,
    })
  ).join('');

  const rightSvg = ESP_RIGHT_ROWS.map((row, idx) =>
    renderPinRowSvg({
      row,
      side: 'right',
      padX: rightPadX,
      padY: startY + idx * step,
      lineEndX: rightLineEnd,
      rowY: startY + idx * step,
      selectedId,
      activeFilter,
    })
  ).join('');

  const shieldLayer = withShield
    ? `
      <!-- SHIELD DE PRUEBAS BREAKOUT 30P DETRÁS DEL ESP32 -->
      <g id="po-esp32-shield-bg">
        <rect x="${shX}" y="${shY}" width="${shW}" height="${shH}" rx="14" fill="#151b22" stroke="#00c2b5" stroke-width="2.4" />
        <!-- 4 perforaciones doradas -->
        <circle cx="${shX + 14}" cy="${shY + 14}" r="5.5" fill="#0f172a" stroke="#e6b834" stroke-width="2.2" />
        <circle cx="${shX + shW - 14}" cy="${shY + 14}" r="5.5" fill="#0f172a" stroke="#e6b834" stroke-width="2.2" />
        <circle cx="${shX + 14}" cy="${shY + shH - 14}" r="5.5" fill="#0f172a" stroke="#e6b834" stroke-width="2.2" />
        <circle cx="${shX + shW - 14}" cy="${shY + shH - 14}" r="5.5" fill="#0f172a" stroke="#e6b834" stroke-width="2.2" />

        <!-- 3 hileras exteriores G - V - S codificadas por color (izq y der) -->
        ${ESP_LEFT_ROWS.map((_, idx) => {
          const py = startY + idx * step;
          return `
            <rect x="${shX + 12}" y="${py - 6}" width="12" height="12" rx="2" fill="#eab308" stroke="#151515" />
            <rect x="${shX + 26}" y="${py - 6}" width="12" height="12" rx="2" fill="#dc2626" stroke="#151515" />
            <rect x="${shX + 40}" y="${py - 6}" width="12" height="12" rx="2" fill="#262b34" stroke="#94a3b8" />
            <circle cx="${shX + 18}" cy="${py}" r="2.6" fill="#facc15" />
            <circle cx="${shX + 32}" cy="${py}" r="2.6" fill="#fef2f2" />
            <circle cx="${shX + 46}" cy="${py}" r="2.6" fill="#cbd5e1" />
          `;
        }).join('')}
        ${ESP_RIGHT_ROWS.map((_, idx) => {
          const py = startY + idx * step;
          return `
            <rect x="${shX + shW - 52}" y="${py - 6}" width="12" height="12" rx="2" fill="#262b34" stroke="#94a3b8" />
            <rect x="${shX + shW - 38}" y="${py - 6}" width="12" height="12" rx="2" fill="#dc2626" stroke="#151515" />
            <rect x="${shX + shW - 24}" y="${py - 6}" width="12" height="12" rx="2" fill="#eab308" stroke="#151515" />
            <circle cx="${shX + shW - 46}" cy="${py}" r="2.6" fill="#cbd5e1" />
            <circle cx="${shX + shW - 32}" cy="${py}" r="2.6" fill="#fef2f2" />
            <circle cx="${shX + shW - 18}" cy="${py}" r="2.6" fill="#facc15" />
          `;
        }).join('')}

        <!-- Encabezados G / V / S encima de los rieles -->
        <text x="${shX + 18}" y="${startY - 22}" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10" font-weight="800">S</text>
        <text x="${shX + 32}" y="${startY - 22}" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="10" font-weight="800">V</text>
        <text x="${shX + 46}" y="${startY - 22}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="800">G</text>

        <text x="${shX + shW - 46}" y="${startY - 22}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="10" font-weight="800">G</text>
        <text x="${shX + shW - 32}" y="${startY - 22}" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="10" font-weight="800">V</text>
        <text x="${shX + shW - 18}" y="${startY - 22}" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10" font-weight="800">S</text>

        <!-- Pie inferior del Shield: DC Jack, Selector 3.3V/5V y USB-C -->
        <rect x="${shX + 66}" y="${shY + shH - 36}" width="44" height="38" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="1.6" />
        <text x="${shX + 88}" y="${shY + shH - 13}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="8" font-weight="700">DC 9V</text>

        <rect x="${shX + 126}" y="${shY + shH - 26}" width="42" height="16" rx="3" fill="#facc15" stroke="#151515" />
        <text x="${shX + 147}" y="${shY + shH - 15}" text-anchor="middle" fill="#151515" font-family="monospace" font-size="8" font-weight="800">3V3/5V</text>

        <rect x="${shX + 190}" y="${shY + shH - 32}" width="44" height="32" rx="6" fill="#cbd5e1" stroke="#475569" stroke-width="1.6" />
        <text x="${shX + 212}" y="${shY + shH - 13}" text-anchor="middle" fill="#1e293b" font-family="monospace" font-size="8" font-weight="700">USB-C</text>
      </g>
    `
    : '';

  const titleMain = withShield ? 'ESP32 + SHIELD DE PRUEBAS · PINOUT' : 'ESP32 DEVKIT V1 (30 PINES) · PINOUT';
  const titleSub = withShield
    ? 'CABECERAS TRIPLES G (TIERRA) · V (VOLTAJE 3.3V/5V) · S (SEÑAL GPIO) · JACK DC 6.5-12 V'
    : 'DOBLE NÚCLEO 240 MHz · WI-FI + BLE · LÓGICA ESTRICTA 3.3 V (NO APLICAR 5 V A GPIO)';

  const extraShieldCallout = withShield
    ? `
      <g transform="translate(836, 608)">
        <rect x="0" y="0" width="254" height="122" rx="12" fill="#f7f1e4" stroke="#00786f" stroke-width="1.6" />
        <text x="14" y="22" fill="#151515" font-family="'Space Grotesk', sans-serif" font-size="13" font-weight="800">Regla G - V - S del Shield</text>
        <circle cx="22" cy="44" r="6" fill="#181b20" stroke="#94a3b8" />
        <text x="36" y="48" fill="#151515" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700">G (Negro) = GND común (0 V)</text>
        <circle cx="22" cy="68" r="6" fill="#dc2626" />
        <text x="36" y="72" fill="#151515" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700">V (Rojo) = 3.3 V (der) / 5 V (izq)</text>
        <circle cx="22" cy="92" r="6" fill="#eab308" />
        <text x="36" y="96" fill="#151515" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700">S (Amarillo) = Pin GPIO exacto</text>
        <text x="14" y="114" fill="#00786f" font-family="'DM Sans', sans-serif" font-size="10" font-weight="700">Conecta servo/sensor directo en tira de 3 pines.</text>
      </g>
    `
    : `
      <g transform="translate(836, 616)">
        <rect x="0" y="0" width="254" height="106" rx="12" fill="#fef2f2" stroke="#df4b37" stroke-width="1.6" />
        <text x="14" y="24" fill="#991b1b" font-family="'Space Grotesk', sans-serif" font-size="13" font-weight="800">Regla de Oro ESP32</text>
        <text x="14" y="46" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11" font-weight="600">• Lógica 3.3 V: usa Level Shifter si vienes de 5 V.</text>
        <text x="14" y="66" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11" font-weight="600">• GPIO 34, 35, 36 y 39 son SOLO ENTRADA.</text>
        <text x="14" y="86" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11" font-weight="600">• Usa ADC1 (32–39) si activas Wi-Fi.</text>
      </g>
    `;

  return `
    <svg class="pinout-svg" viewBox="0 0 1120 760" role="img" aria-label="Diagrama Pinout ${titleMain}">
      <defs>
        <pattern id="po-grid-esp" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.9" fill="rgba(21,21,21,0.12)" />
        </pattern>
      </defs>

      <rect width="1120" height="760" rx="16" fill="#fcfaf4" />
      <rect width="1120" height="760" rx="16" fill="url(#po-grid-esp)" />

      <text x="560" y="44" text-anchor="middle" fill="#151515" font-family="'Space Grotesk', sans-serif" font-size="28" font-weight="800" letter-spacing="0.02em">
        ${titleMain}
      </text>
      <text x="560" y="66" text-anchor="middle" fill="#00786f" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="0.06em">
        ${titleSub}
      </text>

      <!-- Callout superior Antena RF -->
      <text x="560" y="96" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">
        Antena PCB 2.4 GHz (Wi-Fi + BLE)
      </text>

      ${shieldLayer}

      <!-- PCB central vertical ESP32 DevKit V1 -->
      <g id="po-esp32-board">
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="#161b22" stroke="#00c2b5" stroke-width="2" />
        <!-- Antena dorada superior -->
        <rect x="${bx + 26}" y="${by + 6}" width="132" height="38" rx="3" fill="#11151c" stroke="#334155" />
        <path d="M${bx + 42},${by + 38} V${by + 14} H${bx + 58} V${by + 36} H${bx + 74} V${by + 14} H${bx + 90} V${by + 36} H${bx + 106} V${by + 14} H${bx + 122} V${by + 36} H${bx + 138} V${by + 14}"
          fill="none" stroke="#e6b834" stroke-width="3.6" stroke-linecap="square" />

        <!-- Escudo metálico ESP-WROOM-32 -->
        <rect x="${bx + 26}" y="${by + 46}" width="132" height="146" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="1.8" />
        <text x="560" y="${by + 114}" text-anchor="middle" fill="#1e293b" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="800">ESP-WROOM-32</text>
        <text x="560" y="${by + 134}" text-anchor="middle" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">240 MHz · 4 MB</text>

        <!-- Regulador AMS1117 & Puente USB CP2102 -->
        <rect x="${bx + 36}" y="${by + 242}" width="32" height="40" rx="3" fill="#0f172a" stroke="#64748b" />
        <text x="${bx + 52}" y="${by + 294}" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="7.5">1117</text>
        <rect x="${bx + 86}" y="${by + 278}" width="38" height="38" rx="3" fill="#0f172a" stroke="#64748b" />
        <text x="${bx + 105}" y="${by + 328}" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="7.5">CP2102</text>

        <!-- LEDs PWR Rojo & GPIO2 Azul -->
        <rect x="${bx + 44}" y="${by + 210}" width="10" height="7" rx="1.5" fill="#ef4444" />
        <text x="${bx + 60}" y="${by + 216}" fill="#fda4af" font-family="monospace" font-size="7.5" font-weight="700">PWR</text>
        <rect x="${bx + 128}" y="${by + 210}" width="10" height="7" rx="1.5" fill="#38bdf8" />
        <text x="${bx + 112}" y="${by + 216}" fill="#7dd3fc" font-family="monospace" font-size="7.5" font-weight="700">D2</text>

        <!-- Botones EN (izq abajo) y BOOT (der abajo) + Micro-USB -->
        <rect x="${bx + 28}" y="${by + bh - 56}" width="24" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" />
        <text x="${bx + 40}" y="${by + bh - 62}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="8" font-weight="700">EN</text>

        <rect x="${bx + bw - 52}" y="${by + bh - 56}" width="24" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" />
        <text x="${bx + bw - 40}" y="${by + bh - 62}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="8" font-weight="700">BOOT</text>

        <rect x="${bx + 68}" y="${by + bh - 28}" width="48" height="36" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="1.8" />
        <text x="560" y="${by + bh - 8}" text-anchor="middle" fill="#1e293b" font-family="monospace" font-size="8.5" font-weight="800">USB</text>
      </g>

      ${leftSvg}
      ${rightSvg}

      <!-- Callouts inferiores -->
      ${
        !withShield
          ? `
            <text x="560" y="636" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">
              Puerto Micro-USB (5 V + Serial) · Botón EN (Reset) · Botón BOOT (Flasheo)
            </text>
          `
          : `
            <text x="560" y="662" text-anchor="middle" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="700">
              Entrada Jack DC 2.1 mm · Selector 3.3 V / 5 V · Puerto USB-C 5 V
            </text>
          `
      }

      ${renderLegendBlock(34, 608)}
      ${extraShieldCallout}
    </svg>
  `;
}

function renderLegendBlock(x: number, y: number): string {
  const order: TagKind[] = ['power', 'arduino', 'mcu', 'pwm', 'adc', 'comm', 'int', 'nc'];
  return `
    <g transform="translate(${x}, ${y})">
      <text x="0" y="-8" fill="#151515" font-family="'Space Grotesk', sans-serif" font-size="12" font-weight="800" letter-spacing="0.04em">LEYENDA DE PINES (CLIC PARA FILTRAR)</text>
      ${order
        .map((kind, i) => {
          const pal = TAG_PALETTE[kind];
          const col = i >= 4 ? 196 : 0;
          const rowY = (i % 4) * 26 + 10;
          return `
            <g class="po-legend-item" data-po-legend="${kind}" style="cursor:pointer">
              <rect x="${col}" y="${rowY - 8}" width="38" height="16" rx="3.5" fill="${pal.fill}" stroke="${pal.stroke ?? pal.fill}" stroke-width="1.2" />
              <text x="${col + 46}" y="${rowY + 4}" fill="#151515" font-family="'DM Sans', sans-serif" font-size="11.5" font-weight="600">${pal.label}</text>
            </g>
          `;
        })
        .join('')}
    </g>
  `;
}

export function renderPinoutPosterSvg(
  board: PinoutBoardTab,
  selectedId: string,
  activeFilter: 'all' | TagKind
): { svgHtml: string; defaultPin: PinoutRowSpec } {
  if (board === 'uno') {
    return {
      svgHtml: renderArduinoUnoPoster(selectedId, activeFilter),
      defaultPin: UNO_RIGHT_ROWS[4], // D13 por defecto
    };
  }
  return {
    svgHtml: renderEsp32Poster(selectedId, activeFilter, board === 'esp32_shield'),
    defaultPin: ESP_RIGHT_ROWS[4], // GPIO21 SDA por defecto
  };
}
