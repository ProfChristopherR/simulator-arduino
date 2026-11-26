import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BoardPartDef, BoardSpec, BuiltBoard3D, PinDef } from '../types';
import {
  MAT,
  createMalePinRow,
  createPcbBase,
  createSilkCanvasTexture,
  createSmdLed,
  createTactileButton,
  tagPart,
} from '../core/board-builder';

const ESP_W = 5.15;
const ESP_D = 2.8;
const PCB_H = 0.16;
const PIN_Y = PCB_H * 0.5 + 0.08;

function makeEspPins(): PinDef[] {
  const leftLabels: Array<[string, string, PinDef['category'], number, string]> = [
    ['EN', 'EN', 'ctl', 3.3, 'Habilitación / Reset del ESP32'],
    ['VP', 'GPIO36 (VP)', 'ana', 3.3, 'Entrada analógica ADC1_0 (solo entrada)'],
    ['VN', 'GPIO39 (VN)', 'ana', 3.3, 'Entrada analógica ADC1_3 (solo entrada)'],
    ['G34', 'GPIO34', 'ana', 3.3, 'ADC1_6 (solo entrada, sin pull-up interno)'],
    ['G35', 'GPIO35', 'ana', 3.3, 'ADC1_7 (solo entrada)'],
    ['G32', 'GPIO32', 'ana', 3.3, 'Digital / PWM / ADC1_4 / Touch9'],
    ['G33', 'GPIO33', 'ana', 3.3, 'Digital / PWM / ADC1_5 / Touch8'],
    ['G25', 'GPIO25 (DAC1)', 'ana', 3.3, 'Digital / PWM / DAC1'],
    ['G26', 'GPIO26 (DAC2)', 'ana', 3.3, 'Digital / PWM / DAC2'],
    ['G27', 'GPIO27', 'dig', 3.3, 'Digital / PWM / Touch7'],
    ['G14', 'GPIO14', 'dig', 3.3, 'Digital / PWM / HSPI SCK'],
    ['G12', 'GPIO12', 'dig', 3.3, 'Digital / PWM (precaución en arranque)'],
    ['G13', 'GPIO13', 'dig', 3.3, 'Digital / PWM / HSPI MOSI'],
    ['GND_1', 'GND', 'gnd', 0, 'Tierra común (0 V)'],
    ['VIN', 'VIN (5V)', 'pwr', 5, 'Entrada 5 V regulada hacia 3.3 V'],
  ];

  const rightLabels: Array<[string, string, PinDef['category'], number, string]> = [
    ['G23', 'GPIO23 (MOSI)', 'com', 3.3, 'SPI VSPI MOSI / Digital / PWM'],
    ['G22', 'GPIO22 (SCL)', 'com', 3.3, 'Reloj I²C por defecto (SCL)'],
    ['TX0', 'GPIO1 (TX0)', 'com', 3.3, 'Serial0 TX'],
    ['RX0', 'GPIO3 (RX0)', 'com', 3.3, 'Serial0 RX'],
    ['G21', 'GPIO21 (SDA)', 'com', 3.3, 'Datos I²C por defecto (SDA)'],
    ['G19', 'GPIO19 (MISO)', 'com', 3.3, 'SPI VSPI MISO / Digital'],
    ['G18', 'GPIO18 (SCK)', 'com', 3.3, 'SPI VSPI SCK / Digital'],
    ['G5', 'GPIO5 (SS)', 'com', 3.3, 'SPI VSPI SS / Digital'],
    ['G17', 'GPIO17 (TX2)', 'com', 3.3, 'UART2 TX (ideal sensor CO₂ MH-Z19)'],
    ['G16', 'GPIO16 (RX2)', 'com', 3.3, 'UART2 RX (ideal sensor CO₂ MH-Z19)'],
    ['G4', 'GPIO4', 'dig', 3.3, 'Digital / PWM / Touch0'],
    ['G2', 'GPIO2 (LED)', 'dig', 3.3, 'LED azul integrado en placa + Digital/PWM'],
    ['G15', 'GPIO15', 'dig', 3.3, 'Digital / PWM'],
    ['GND_2', 'GND', 'gnd', 0, 'Tierra común (0 V)'],
    ['3V3', '3.3V', 'pwr', 3.3, 'Salida regulada 3.3 V para sensores'],
  ];

  const pins: PinDef[] = [];
  leftLabels.forEach(([id, label, category, voltage, description], idx) => {
    const x = -1.78 + idx * 0.254;
    pins.push({
      id,
      label,
      category,
      voltage,
      localPos: [x, PIN_Y, -1.16],
      pwm: category === 'dig' || category === 'com',
      i2c: id === 'G21' ? 'SDA' : id === 'G22' ? 'SCL' : undefined,
      description,
    });
  });

  rightLabels.forEach(([id, label, category, voltage, description], idx) => {
    const x = -1.78 + idx * 0.254;
    pins.push({
      id,
      label,
      category,
      voltage,
      localPos: [x, PIN_Y, 1.16],
      pwm: category === 'dig' || category === 'com',
      i2c: id === 'G21' ? 'SDA' : id === 'G22' ? 'SCL' : undefined,
      description,
    });
  });

  return pins;
}

const ESP_PINS = makeEspPins();

const ESP_PARTS: BoardPartDef[] = [
  {
    id: 'wroom',
    num: 1,
    name: 'Módulo ESP-WROOM-32',
    category: 'PROCESADOR + RF',
    summary: 'Doble núcleo Xtensa LX6 a 240 MHz con radio Wi-Fi y Bluetooth bajo blindaje metálico.',
    localPos: [1.35, 0.3, 0],
    size: [1.85, 0.4, 1.85],
    quizHint: 'Caja metálica cuadrada grande en el lado derecho.',
  },
  {
    id: 'antenna',
    num: 2,
    name: 'Antena PCB 2.4 GHz',
    category: 'COMUNICACIÓN',
    summary: 'Trazo de cobre en meandro para transmisión inalámbrica Wi-Fi y BLE.',
    localPos: [2.25, 0.14, 0],
    size: [0.55, 0.15, 1.8],
    quizHint: 'Zona con pista dorada en zig-zag en el extremo derecho.',
  },
  {
    id: 'usb_micro',
    num: 3,
    name: 'Puerto Micro-USB',
    category: 'CONEXIÓN',
    summary: 'Alimenta la placa a 5 V y permite subir código y leer datos por Serial.',
    localPos: [-2.35, 0.28, 0],
    size: [0.65, 0.35, 0.8],
    quizHint: 'Conector metálico plano en el borde izquierdo.',
  },
  {
    id: 'cp2102',
    num: 4,
    name: 'Puente USB CP2102',
    category: 'COMUNICACIÓN',
    summary: 'Convierte la señal USB a UART para flashear el ESP32.',
    localPos: [-1.45, 0.18, 0.15],
    size: [0.5, 0.2, 0.5],
    quizHint: 'Chip negro cuadrado pequeño cerca del conector Micro-USB.',
  },
  {
    id: 'ams1117',
    num: 5,
    name: 'Regulador 3.3 V (AMS1117)',
    category: 'ALIMENTACIÓN',
    summary: 'Convierte los 5 V del USB o VIN en 3.3 V estables para el procesador.',
    localPos: [-1.4, 0.22, -0.58],
    size: [0.58, 0.22, 0.42],
    quizHint: 'Regulador negro con pestaña metálica junto al Micro-USB.',
  },
  {
    id: 'btn_boot',
    num: 6,
    name: 'Botón BOOT',
    category: 'CONTROL',
    summary: 'Permite poner el ESP32 en modo descarga de firmware.',
    localPos: [-2.12, 0.22, 0.65],
    size: [0.35, 0.26, 0.35],
    quizHint: 'Uno de los dos pulsadores junto al puerto Micro-USB.',
  },
  {
    id: 'btn_en',
    num: 7,
    name: 'Botón EN (Reset)',
    category: 'CONTROL',
    summary: 'Reinicia el microcontrolador ESP32.',
    localPos: [-2.12, 0.22, -0.65],
    size: [0.35, 0.26, 0.35],
    quizHint: 'Botón táctil junto al regulador y al puerto USB.',
  },
  {
    id: 'led_gpio2',
    num: 8,
    name: 'LED azul integrado (GPIO2)',
    category: 'INDICADOR',
    summary: 'LED azul conectado a GPIO2 para pruebas sin cables externos.',
    localPos: [-0.25, 0.14, 0.55],
    size: [0.22, 0.14, 0.16],
    quizHint: 'Pequeño LED azul SMD cerca del centro de la placa.',
  },
  {
    id: 'led_pwr',
    num: 9,
    name: 'LED de encendido "PWR" (Rojo)',
    category: 'INDICADOR',
    summary: 'LED rojo que confirma alimentación activa de 3.3 V desde el regulador.',
    localPos: [-0.25, 0.14, -0.55],
    size: [0.22, 0.14, 0.16],
    quizHint: 'Pequeño LED rojo SMD frente al LED azul integrado.',
  },
  {
    id: 'headers_esp',
    num: 10,
    name: 'Tiras de pines 30 GPIO (3.3 V)',
    category: 'ENTRADAS / SALIDAS',
    summary: 'Doble fila de 15 pines macho compatibles con protoboard (lógica estricta 3.3 V).',
    localPos: [0, 0.14, 0],
    size: [3.85, 0.4, 2.5],
    quizHint: 'Las dos hileras largas de pines dorados en los bordes superior e inferior.',
  },
];

function buildEsp323D(): BuiltBoard3D {
  const group = new THREE.Group();
  const partMeshes = new Map<string, THREE.Object3D>();
  const pinAnchors = new Map<string, THREE.Object3D>();

  const pcb = createPcbBase(ESP_W, PCB_H, ESP_D, 0x191d24, [
    [-2.3, -1.18],
    [-2.3, 1.18],
    [2.3, -1.18],
    [2.3, 1.18],
  ]);
  group.add(pcb);

  const silkTex = createSilkCanvasTexture(1024, 560, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ESP32 DEVKIT V1 · 3.3V', 210, 290);
    ctx.fillStyle = '#f6c101';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('SAN NICOLÁS · GEOGO', 210, 318);

    // Antena trazo
    ctx.strokeStyle = '#d4a007';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w - 95, 110);
    ctx.lineTo(w - 40, 110);
    ctx.lineTo(w - 40, 175);
    ctx.lineTo(w - 90, 175);
    ctx.lineTo(w - 90, 240);
    ctx.lineTo(w - 40, 240);
    ctx.lineTo(w - 40, 310);
    ctx.lineTo(w - 90, 310);
    ctx.stroke();
  });
  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(ESP_W - 0.1, ESP_D - 0.1),
    new THREE.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = PCB_H * 0.5 + 0.005;
  group.add(silk);

  // 1. Shield ESP-WROOM-32
  const wroom = new THREE.Mesh(new RoundedBoxGeometry(1.75, 0.34, 1.8, 2, 0.04), MAT.shieldCan());
  wroom.position.set(1.22, PCB_H * 0.5 + 0.17, 0);
  wroom.castShadow = true;
  tagPart(wroom, 'wroom', partMeshes);
  group.add(wroom);

  // 2. Antena hitbox
  const ant = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 1.7),
    new THREE.MeshStandardMaterial({ color: 0xd4a007, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.35 })
  );
  ant.position.set(2.3, PCB_H * 0.5 + 0.02, 0);
  tagPart(ant, 'antenna', partMeshes);
  group.add(ant);

  // 3. Micro-USB
  const usb = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.28, 0.78, 2, 0.04), MAT.metal());
  usb.position.set(-2.35, PCB_H * 0.5 + 0.14, 0);
  tagPart(usb, 'usb_micro', partMeshes);
  group.add(usb);

  // 4. CP2102
  const cp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.48), MAT.icBody());
  cp.position.set(-1.45, PCB_H * 0.5 + 0.05, 0.15);
  tagPart(cp, 'cp2102', partMeshes);
  group.add(cp);

  // 5. AMS1117
  const reg = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.4), MAT.icBody());
  reg.position.set(-1.4, PCB_H * 0.5 + 0.07, -0.58);
  tagPart(reg, 'ams1117', partMeshes);
  group.add(reg);

  // 6 & 7. Botones BOOT / EN
  const btnBoot = createTactileButton();
  btnBoot.scale.setScalar(0.8);
  btnBoot.position.set(-2.12, PCB_H * 0.5, 0.65);
  tagPart(btnBoot, 'btn_boot', partMeshes);
  group.add(btnBoot);

  const btnEn = createTactileButton();
  btnEn.scale.setScalar(0.8);
  btnEn.position.set(-2.12, PCB_H * 0.5, -0.65);
  tagPart(btnEn, 'btn_en', partMeshes);
  group.add(btnEn);

  // 8. LEDs
  const ledBlue = createSmdLed(0x3b82f6);
  ledBlue.position.set(-0.25, PCB_H * 0.5 + 0.035, 0.55);
  tagPart(ledBlue, 'led_gpio2', partMeshes);
  group.add(ledBlue);

  const ledPwr = createSmdLed(0xe74c3c);
  ledPwr.position.set(-0.25, PCB_H * 0.5 + 0.035, -0.55);
  (ledPwr.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
  tagPart(ledPwr, 'led_pwr', partMeshes);
  group.add(ledPwr);

  // 9. Pines macho
  const pinHeaders = createMalePinRow(ESP_PINS, pinAnchors);
  tagPart(pinHeaders, 'headers_esp', partMeshes);
  group.add(pinHeaders);

  const originalY = new Map<string, number>();
  const targetY = new Map<string, number>();
  const targetVisible = new Map<string, boolean>();
  partMeshes.forEach((obj, id) => {
    originalY.set(id, obj.position.y);
    targetY.set(id, obj.position.y);
    targetVisible.set(id, true);
  });

  return {
    group,
    partMeshes,
    pinAnchors,
    leds: { power: ledPwr, builtin: ledBlue },
    buttons: { reset: btnEn },
    setPartAssembled(partId: string, assembled: boolean) {
      const obj = partMeshes.get(partId);
      if (!obj) return;
      const oy = originalY.get(partId) ?? 0;
      targetVisible.set(partId, assembled);
      if (assembled) {
        obj.visible = true;
        obj.position.y = oy + 1.15;
        targetY.set(partId, oy);
      } else {
        targetY.set(partId, oy + 1.15);
      }
    },
    tickAnimation(dt: number) {
      const alpha = 1 - Math.exp(-10 * dt);
      partMeshes.forEach((obj, id) => {
        const ty = targetY.get(id) ?? obj.position.y;
        obj.position.y += (ty - obj.position.y) * alpha;
        if (!targetVisible.get(id) && Math.abs(obj.position.y - ty) < 0.08) {
          obj.visible = false;
        }
      });
    },
    highlightPart(partId: string | null) {
      partMeshes.forEach((obj, id) => {
        obj.traverse((child) => {
          const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m && 'emissive' in m) {
            if (id === partId) {
              m.emissive.setHex(0xd4a007);
              m.emissiveIntensity = 0.45;
            } else if (child !== ledPwr && child !== ledBlue) {
              m.emissive.setHex(0x000000);
              m.emissiveIntensity = 0;
            }
          }
        });
      });
    },
  };
}

export const ESP32_SPEC: BoardSpec = {
  id: 'esp32',
  indexLabel: '02 / 02',
  eyebrow: 'ESPRESSIF · 2016 · LÓGICA 3.3 V',
  name: 'ESP32 DevKit V1',
  tagline: 'Doble núcleo, Wi-Fi y Bluetooth integrados para telemetría Geogo de alto rendimiento.',
  levelLabel: 'Nivel Intermedio · 3.3 V',
  logicVoltage: 3.3,
  summary:
    'Placa potente de 32 bits ideal para estaciones meteorológicas BME280, lectura de CO₂ y enlaces inalámbricos. Recuerda que sus pines trabajan estrictamente a 3.3 V: usa Level Shifter si conectas sensores de 5 V.',
  clock: '240 MHz',
  flash: '4 MB',
  ram: '520 KB',
  gpioSummary: '30 pines',
  priceRef: '~$8 USD',
  specs: [
    { label: 'Procesador', value: 'Xtensa LX6 Dual-Core 32 bits' },
    { label: 'Frecuencia de reloj', value: 'Hasta 240 MHz' },
    { label: 'Memoria Flash / SRAM', value: '4 MB / 520 KB' },
    { label: 'Conectividad nativa', value: 'Wi-Fi 802.11 b/g/n + Bluetooth BLE' },
    { label: 'ADC Analógico', value: '12 bits (0–4095) en GPIO32–39' },
    { label: 'Voltaje lógico estricto', value: '3.3 V (NO tolera 5 V directo)' },
    { label: 'Interfaces', value: 'I²C (21/22), SPI, 3× UART, PWM, DAC, Touch' },
    { label: 'LED integrado', value: 'GPIO2 (azul)' },
  ],
  strengths: [
    'Mucha mayor memoria y velocidad que Arduino Uno para pantallas OLED/LCD y sensores complejos.',
    'Compatible nativo a 3.3 V con módulos BMP280, BME280 y transceptores NRF24L01 sin conversor.',
    'Resolución analógica de 12 bits (0–4095) para lecturas finas de CO₂ o luminosidad.',
  ],
  pitfalls: [
    '¡Alerta de voltaje! Aplicar 5 V directo a un pin GPIO puede dañar permanentemente el chip: usa Level Shifter.',
    'Los pines GPIO34, GPIO35, GPIO36 (VP) y GPIO39 (VN) son solo entrada (no sirven como OUTPUT).',
    'Al usar Wi-Fi, algunos pines de ADC2 dejan de estar disponibles; prefiere ADC1 (GPIO32–39).',
  ],
  pinGroups: [
    {
      title: 'Alimentación',
      body: 'VIN recibe 5 V externos; el pin 3V3 entrega 3.3 V regulados. Comparte siempre GND.',
    },
    {
      title: 'I²C y UART2',
      body: 'I²C por defecto en GPIO21 (SDA) y GPIO22 (SCL). UART2 en GPIO16/17 para módulos CO₂.',
    },
    {
      title: 'ADC de 12 bits y DAC',
      body: 'Lee valores de 0 a 4095; incluye dos salidas analógicas reales DAC en GPIO25 y GPIO26.',
    },
  ],
  firstCodeTitle: 'Primer sketch: parpadeo y lectura de voltaje en ESP32',
  firstCode: `// Prueba inicial ESP32 DevKit V1 — Tecnología Geogo
const int LED_PIN = 2; // LED azul integrado en GPIO2

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("ESP32 activo · Lógica 3.3 V");
  delay(400);

  digitalWrite(LED_PIN, LOW);
  delay(400);
}`,
  highlights: [
    'Estaciones de telemetría ambiental con BME280 y sensor de CO₂.',
    'Sistemas inalámbricos con Wi-Fi, Bluetooth o enlaces RF.',
    'Procesamiento rápido de encoders ópticos rotativos y pantallas.',
  ],
  facts: [
    'Su antena en meandro está grabada directamente en el cobre del circuito impreso.',
    'A pesar de tener 240 MHz y Wi-Fi, suele ser más económico que un Arduino Uno original.',
  ],
  pins: ESP_PINS,
  parts: ESP_PARTS,
  build3D: buildEsp323D,
};
