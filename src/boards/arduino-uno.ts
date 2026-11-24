import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BoardPartDef, BoardSpec, BuiltBoard3D, PinDef } from '../types';
import {
  MAT,
  createDetailedDcJack,
  createDetailedUsbB,
  createDipChip,
  createElectrolyticCap,
  createFemaleHeaderRow,
  createGlowSprite,
  createMetalCrystal,
  createSilkCanvasTexture,
  createSmdLed,
  createSmdPassive,
  createTactileButton,
  createUnoNotchedPcb,
  tagPart,
} from '../core/board-builder';

// Dimensiones normalizadas: 6.86 x 5.33 cm -> 6.86 x 5.33 unidades (1 unidad = 1 cm)
const UNO_W = 6.86;
const UNO_D = 5.33;
const PCB_H = 0.16;
const HEADER_Y = PCB_H * 0.5 + 0.34;

function makeDigitalPins(): PinDef[] {
  // Fila superior (z = -2.38): SCL, SDA, AREF, GND, D13..D8, D7..D0
  const defs: Array<[string, string, PinDef['category'], boolean, string]> = [
    ['SCL', 'SCL (A5)', 'com', false, 'Reloj I2C (compartido con A5)'],
    ['SDA', 'SDA (A4)', 'com', false, 'Datos I2C (compartido con A4)'],
    ['AREF', 'AREF', 'ana', false, 'Voltaje de referencia analógica'],
    ['GND_TOP', 'GND', 'gnd', false, 'Tierra (0 V)'],
    ['D13', 'D13 (LED L)', 'dig', false, 'Pin digital 13 · conectado al LED integrado L y SCK SPI'],
    ['D12', 'D12 (MISO)', 'dig', false, 'Pin digital 12 · MISO SPI'],
    ['D11', '~D11 (PWM)', 'dig', true, 'Pin digital 11 con PWM (~) y MOSI SPI'],
    ['D10', '~D10 (PWM)', 'dig', true, 'Pin digital 10 con PWM (~) y SS SPI'],
    ['D9', '~D9 (PWM)', 'dig', true, 'Pin digital 9 con PWM (~)'],
    ['D8', 'D8', 'dig', false, 'Pin digital 8'],
    ['D7', 'D7', 'dig', false, 'Pin digital 7'],
    ['D6', '~D6 (PWM)', 'dig', true, 'Pin digital 6 con PWM (~)'],
    ['D5', '~D5 (PWM)', 'dig', true, 'Pin digital 5 con PWM (~)'],
    ['D4', 'D4', 'dig', false, 'Pin digital 4'],
    ['D3', '~D3 (PWM / INT1)', 'dig', true, 'Pin digital 3 con PWM (~) e interrupción externa INT1'],
    ['D2', 'D2 (INT0)', 'dig', false, 'Pin digital 2 con interrupción externa INT0 (ideal sensor óptico)'],
    ['D1', 'D1 (TX)', 'com', false, 'Transmisión Serial UART (TX) — evitar si usas Monitor Serial'],
    ['D0', 'D0 (RX)', 'com', false, 'Recepción Serial UART (RX) — evitar si usas Monitor Serial'],
  ];

  // Dos bloques separados por un hueco estándar (entre D8 y D7)
  return defs.map(([id, label, category, pwm, description], idx) => {
    const gap = idx >= 10 ? 0.16 : 0;
    const x = -1.6 + idx * 0.254 + gap;
    return {
      id,
      label,
      category,
      voltage: category === 'gnd' ? 0 : 5,
      localPos: [x, HEADER_Y, -2.34],
      pwm,
      interrupt: id === 'D2' || id === 'D3',
      i2c: id === 'SDA' ? 'SDA' : id === 'SCL' ? 'SCL' : undefined,
      uart: id === 'D0' ? 'RX' : id === 'D1' ? 'TX' : undefined,
      description,
    };
  });
}

function makePowerAndAnalogPins(): PinDef[] {
  // Fila inferior (z = +2.34): IOREF, RESET, 3.3V, 5V, GND, GND2, VIN | A0..A5
  const powerDefs: Array<[string, string, PinDef['category'], number, string]> = [
    ['IOREF', 'IOREF', 'pwr', 5, 'Referencia lógica de la placa (5 V en Uno R3)'],
    ['RESET', 'RESET', 'ctl', 5, 'Reinicia el microcontrolador al conectarse a GND'],
    ['3V3', '3.3V', 'pwr', 3.3, 'Salida regulada de 3.3 V (máx. 50 mA)'],
    ['5V', '5V', 'pwr', 5, 'Alimentación principal regulada de 5 V'],
    ['GND_1', 'GND', 'gnd', 0, 'Tierra (0 V) — referencia común de todo el circuito'],
    ['GND_2', 'GND', 'gnd', 0, 'Tierra (0 V) — segunda toma de masa'],
    ['VIN', 'VIN', 'pwr', 9, 'Entrada de voltaje externo (7–12 V) antes del regulador'],
  ];

  const analogDefs: Array<[string, string, number, string]> = [
    ['A0', 'A0', 0, 'Entrada analógica 0 (10 bits: 0–1023) o digital D14'],
    ['A1', 'A1', 1, 'Entrada analógica 1 (10 bits: 0–1023) o digital D15'],
    ['A2', 'A2', 2, 'Entrada analógica 2 (10 bits: 0–1023) o digital D16'],
    ['A3', 'A3', 3, 'Entrada analógica 3 (10 bits: 0–1023) o digital D17'],
    ['A4', 'A4 (SDA)', 4, 'Entrada analógica 4 y línea de datos I2C (SDA)'],
    ['A5', 'A5 (SCL)', 5, 'Entrada analógica 5 y reloj I2C (SCL)'],
  ];

  const powerPins: PinDef[] = powerDefs.map(([id, label, category, voltage, description], i) => ({
    id,
    label,
    category,
    voltage,
    localPos: [-0.72 + i * 0.254, HEADER_Y, 2.34],
    description,
  }));

  const analogPins: PinDef[] = analogDefs.map(([id, label, ch, description], i) => ({
    id,
    label,
    category: ch >= 4 ? 'com' : 'ana',
    voltage: 5,
    analogChannel: ch,
    i2c: ch === 4 ? 'SDA' : ch === 5 ? 'SCL' : undefined,
    localPos: [1.34 + i * 0.254, HEADER_Y, 2.34],
    description,
  }));

  return [...powerPins, ...analogPins];
}

const UNO_PINS: PinDef[] = [...makeDigitalPins(), ...makePowerAndAnalogPins()];

const UNO_PARTS: BoardPartDef[] = [
  {
    id: 'mcu',
    num: 1,
    name: 'Microcontrolador ATmega328P',
    category: 'CEREBRO',
    summary: 'Chip principal DIP de 28 pines a 16 MHz. Almacena y ejecuta tu código C++ (.ino).',
    localPos: [1.1, 0.36, 0.72],
    size: [2.7, 0.45, 0.78],
    quizHint: 'Busca el circuito integrado largo y negro con 28 patas en zócalo.',
  },
  {
    id: 'usb',
    num: 2,
    name: 'Puerto USB-B',
    category: 'CONEXIÓN',
    summary: 'Conecta el Arduino al computador para cargar programas, usar el Monitor Serial y alimentar a 5 V.',
    localPos: [-2.85, 0.56, -0.78],
    size: [1.5, 1.0, 1.2],
    quizHint: 'Es el conector metálico cuadrado grande en el borde izquierdo.',
  },
  {
    id: 'jack',
    num: 3,
    name: 'Conector DC (7–12 V)',
    category: 'ALIMENTACIÓN',
    summary: 'Entrada de barril para baterías o fuente externa de 7 a 12 V (centro positivo).',
    localPos: [-2.75, 0.52, 1.52],
    size: [1.35, 0.95, 0.9],
    quizHint: 'Conector cilíndrico negro ubicado en la esquina inferior izquierda.',
  },
  {
    id: 'usb_bridge',
    num: 4,
    name: 'Puente USB ATmega16U2',
    category: 'COMUNICACIÓN',
    summary: 'Traduce los datos USB del PC a comunicación serie UART para programar el chip principal.',
    localPos: [-1.52, 0.2, -0.68],
    size: [0.58, 0.2, 0.58],
    quizHint: 'Pequeño chip cuadrado negro cerca del puerto USB.',
  },
  {
    id: 'regulator',
    num: 5,
    name: 'Regulador 5 V (NCP1117)',
    category: 'ALIMENTACIÓN',
    summary: 'Reduce los 7–12 V del conector DC o VIN a unos estables 5 V para toda la placa.',
    localPos: [-1.62, 0.24, 1.48],
    size: [0.6, 0.25, 0.45],
    quizHint: 'Regulador con pestaña metálica junto al conector de alimentación DC.',
  },
  {
    id: 'caps',
    num: 6,
    name: 'Capacitores electrolíticos (47 µF)',
    category: 'FILTRADO',
    summary: 'Suavizan picos de voltaje cuando se activan LEDs, servos o sensores.',
    localPos: [-1.05, 0.36, 1.45],
    size: [0.46, 0.55, 0.85],
    quizHint: 'Dos cilindros plateados verticales cerca del regulador de voltaje.',
  },
  {
    id: 'crystal',
    num: 7,
    name: 'Cristal de cuarzo 16 MHz',
    category: 'RELOJ',
    summary: 'Marca el pulso exacto de 16 millones de ciclos por segundo para delay() y millis().',
    localPos: [-0.88, 0.22, -0.05],
    size: [0.52, 0.22, 0.28],
    quizHint: 'Cápsula metálica ovalada cerca del centro izquierdo.',
  },
  {
    id: 'reset',
    num: 8,
    name: 'Botón RESET',
    category: 'CONTROL',
    summary: 'Reinicia el sketch desde el principio sin borrar la memoria Flash.',
    localPos: [-2.78, 0.24, -2.02],
    size: [0.4, 0.28, 0.4],
    quizHint: 'Botón táctil rojo/metálico en la esquina superior izquierda.',
  },
  {
    id: 'headers_dig',
    num: 9,
    name: 'Cabecera Digital (D0–D13)',
    category: 'ENTRADAS / SALIDAS',
    summary: '14 pines digitales (5 V) para leer botones/sensores o controlar LEDs y servos (~ PWM).',
    localPos: [0.65, 0.32, -2.34],
    size: [4.8, 0.45, 0.3],
    quizHint: 'Fila superior larga de conectores negros.',
  },
  {
    id: 'headers_pwr',
    num: 10,
    name: 'Cabecera de Potencia y Analógicos (A0–A5)',
    category: 'ENERGÍA / ANALÓGICO',
    summary: 'Pines 3.3V, 5V, GND, VIN y 6 entradas analógicas (A0–A5, con SDA/SCL para I2C).',
    localPos: [0.98, 0.32, 2.34],
    size: [4.1, 0.45, 0.3],
    quizHint: 'Fila inferior de conectores negros (energía y entradas analógicas).',
  },
  {
    id: 'led_l',
    num: 11,
    name: 'LED integrado "L" (Pin D13)',
    category: 'INDICADOR',
    summary: 'LED amarillo/ámbar conectado internamente al pin D13 para pruebas rápidas sin cablear.',
    localPos: [-0.45, 0.14, -1.35],
    size: [0.22, 0.14, 0.16],
    quizHint: 'Pequeño LED SMD amarillo junto a la cabecera digital superior.',
  },
  {
    id: 'led_on',
    num: 12,
    name: 'LED de encendido "ON"',
    category: 'INDICADOR',
    summary: 'Se ilumina en verde cuando la placa recibe alimentación correcta de 5 V.',
    localPos: [2.35, 0.14, -1.05],
    size: [0.22, 0.14, 0.16],
    quizHint: 'Pequeño LED verde en el costado derecho de la placa.',
  },
  {
    id: 'icsp',
    num: 13,
    name: 'Conector ICSP (6 pines)',
    category: 'PROGRAMACIÓN / SPI',
    summary: 'Conector de 2×3 pines para grabar bootloader o acceder al bus SPI (MOSI, MISO, SCK).',
    localPos: [2.85, 0.25, 0.05],
    size: [0.46, 0.35, 0.65],
    quizHint: 'Bloque de 6 pines metálicos en el borde derecho.',
  },
];

function buildUno3D(): BuiltBoard3D {
  const group = new THREE.Group();
  const partMeshes = new Map<string, THREE.Object3D>();
  const pinAnchors = new Map<string, THREE.Object3D>();

  const holes: Array<[number, number]> = [
    [-2.05, -2.25],
    [-1.95, 2.25],
    [2.9, -1.75],
    [2.9, 1.95],
  ];

  // Mapa de relieve (bumpMap) para pistas reales de cobre bajo la máscara teal
  const bumpTex = createSilkCanvasTexture(1024, 796, (ctx, w, h) => {
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      const x = 320 + i * 38;
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 220);
      ctx.lineTo(x - 18, 250);
      ctx.lineTo(x - 18, 490);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = 680 + i * 38;
      ctx.beginPath();
      ctx.moveTo(x, 560);
      ctx.lineTo(x, 740);
      ctx.stroke();
    }
  });

  // PCB contorno real muescado Arduino Uno R3
  const pcb = createUnoNotchedPcb(0x00828a, holes, bumpTex);
  group.add(pcb);

  const toPxX = (wx: number) => ((wx + 3.43) / UNO_W) * 2048;
  const toPxY = (wz: number) => ((wz + 2.665) / UNO_D) * 1592;

  const silkTex = createSilkCanvasTexture(2048, 1592, (ctx) => {
    ctx.clearRect(0, 0, 2048, 1592);

    // Marco fino interior siguiendo el borde muescado
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(2016, 32);
    ctx.lineTo(2016, 320);
    ctx.lineTo(1960, 390);
    ctx.lineTo(1960, 1170);
    ctx.lineTo(2016, 1240);
    ctx.lineTo(2016, 1500);
    ctx.lineTo(1960, 1560);
    ctx.lineTo(32, 1560);
    ctx.closePath();
    ctx.stroke();

    // Logotipo ARDUINO UNO en zona superior derecha despejada (sin obstáculos)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px sans-serif';
    ctx.fillText('ARDUINO', 1020, 480);
    ctx.font = '900 110px sans-serif';
    ctx.fillText('UNO', 1030, 585);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(1285, 512, 74, 72);
    ctx.font = 'bold 34px monospace';
    ctx.fillText('R3', 1300, 560);

    ctx.fillStyle = '#f6c101';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('LICEO SAN NICOLÁS · GEOGO', 1025, 634);

    // Etiquetas de bloques de cabeceras
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('DIGITAL (PWM ~)', 1110, 222);
    ctx.fillText('POWER', 935, 1380);
    ctx.fillText('ANALOG IN', 1480, 1380);

    // Nombres de pines alineados pixel-perfect con los 3D sockets
    const topShort: Record<string, string> = {
      SCL: 'SCL', SDA: 'SDA', AREF: 'AREF', GND_TOP: 'GND',
      D13: '13', D12: '12', D11: '~11', D10: '~10', D9: '~9', D8: '8',
      D7: '7', D6: '~6', D5: '~5', D4: '4', D3: '~3', D2: '2', D1: 'TX1', D0: 'RX0',
    };
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    for (const p of UNO_PINS) {
      const px = toPxX(p.localPos[0]);
      if (p.localPos[2] < 0) {
        ctx.fillText(topShort[p.id] ?? p.id, px, 178);
      } else {
        const botShort: Record<string, string> = {
          IOREF: 'IOR', RESET: 'RST', '3V3': '3.3V', '5V': '5V',
          GND_1: 'GND', GND_2: 'GND', VIN: 'VIN',
          A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5',
        };
        ctx.fillText(botShort[p.id] ?? p.id, px, 1435);
      }
    }

    ctx.textAlign = 'left';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ON', toPxX(2.42), toPxY(-1.02));
    ctx.fillText('L', toPxX(-0.74), toPxY(-1.32));
    ctx.fillText('TX', toPxX(-0.78), toPxY(-0.99));
    ctx.fillText('RX', toPxX(-0.78), toPxY(-0.75));
    ctx.fillText('RESET', toPxX(-2.52), toPxY(-2.02));
    ctx.fillText('ICSP', toPxX(2.58), toPxY(0.55));
  });

  const silkPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(UNO_W - 0.08, UNO_D - 0.08),
    new THREE.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silkPlane.rotation.x = -Math.PI / 2;
  silkPlane.position.y = PCB_H * 0.5 + 0.005;
  group.add(silkPlane);

  // Componentes SMD realistas (0805 resistencias/capacitores + LM358 + Diodo M7 + Polyfuse)
  const smdPositions: Array<[number, number, number]> = [
    [-1.4, -1.35, 0],
    [-1.12, -1.35, 0],
    [-0.18, -1.35, Math.PI / 2],
    [0.12, -1.35, Math.PI / 2],
    [1.82, -1.06, 0],
    [2.05, -1.06, 0],
    [-0.45, 1.38, 0],
    [0.08, 1.48, Math.PI / 2],
  ];
  for (const [sx, sz, rot] of smdPositions) {
    const smd = createSmdPassive(rot === 0 ? 0x1b1e24 : 0x8b6239);
    smd.position.set(sx, PCB_H * 0.5 + 0.028, sz);
    smd.rotation.y = rot;
    group.add(smd);
  }

  // Fusible PTC Polyfuse (verde-dorado) junto al puerto USB-B
  const polyfuse = new THREE.Group();
  const pfBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.46, 0.08, 0.24, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.35 })
  );
  const pfCapL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.085, 0.25), MAT.gold());
  pfCapL.position.x = -0.22;
  const pfCapR = pfCapL.clone();
  pfCapR.position.x = 0.22;
  polyfuse.add(pfBody, pfCapL, pfCapR);
  polyfuse.position.set(-1.98, PCB_H * 0.5 + 0.04, -0.22);
  group.add(polyfuse);

  // Amplificador operacional LM358 (SOIC-8) y Diodo de protección M7
  const lm358 = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.09, 0.28, 2, 0.015), MAT.icBody());
  lm358.position.set(-0.52, PCB_H * 0.5 + 0.045, -0.14);
  const diodeM7 = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.11, 0.2, 2, 0.02), MAT.icBody());
  diodeM7.position.set(-1.78, PCB_H * 0.5 + 0.055, 2.02);
  group.add(lm358, diodeM7);

  // 1. MCU ATmega328P + zócalo DIP-28
  const mcuGroup = new THREE.Group();
  const socket = new THREE.Mesh(new RoundedBoxGeometry(3.58, 0.13, 0.96, 2, 0.02), MAT.headerPlastic());
  socket.position.y = 0.065;
  const dip = createDipChip(3.42, 0.25, 0.72, 14, 'ATMEGA328P-PU');
  dip.position.y = 0.09;
  mcuGroup.add(socket, dip);
  mcuGroup.position.set(1.1, PCB_H * 0.5, 0.72);
  tagPart(mcuGroup, 'mcu', partMeshes);
  group.add(mcuGroup);

  // 2. Puerto USB-B detallado con cavidad interior y ranuras troqueladas
  const usbMesh = createDetailedUsbB();
  usbMesh.position.set(-2.9, PCB_H * 0.5, -0.78);
  tagPart(usbMesh, 'usb', partMeshes);
  group.add(usbMesh);

  // 3. Conector DC Jack detallado con pin central
  const jackMesh = createDetailedDcJack();
  jackMesh.position.set(-2.78, PCB_H * 0.5, 1.52);
  tagPart(jackMesh, 'jack', partMeshes);
  group.add(jackMesh);

  // 4. ATmega16U2 QFN-32 con pads metálicos visibles
  const bridgeGrp = new THREE.Group();
  const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.11, 0.56, 2, 0.015), MAT.icBody());
  bridge.position.y = 0.055;
  bridgeGrp.add(bridge);
  for (let i = -3; i <= 3; i++) {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.08), MAT.metal());
    p1.position.set(i * 0.068, 0.015, 0.29);
    const p2 = p1.clone();
    p2.position.z = -0.29;
    bridgeGrp.add(p1, p2);
  }
  bridgeGrp.position.set(-1.48, PCB_H * 0.5, -0.82);
  bridgeGrp.rotation.y = Math.PI / 4;
  tagPart(bridgeGrp, 'usb_bridge', partMeshes);
  group.add(bridgeGrp);

  // 5. Regulador NCP1117
  const regGrp = new THREE.Group();
  const regBody = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.15, 0.44, 2, 0.02), MAT.icBody());
  const regTab = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.44), MAT.metal());
  regTab.position.x = -0.26;
  for (let i = -1; i <= 1; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), MAT.metal());
    leg.position.set(0.28, -0.04, i * 0.14);
    regGrp.add(leg);
  }
  regGrp.add(regBody, regTab);
  regGrp.position.set(-1.78, PCB_H * 0.5 + 0.075, 1.46);
  tagPart(regGrp, 'regulator', partMeshes);
  group.add(regGrp);

  // 6. Capacitores 47uF realistas con media luna negra de polaridad
  const capsGrp = new THREE.Group();
  const c1 = createElectrolyticCap();
  c1.position.set(0, 0, -0.27);
  const c2 = createElectrolyticCap();
  c2.position.set(0, 0, 0.27);
  capsGrp.add(c1, c2);
  capsGrp.position.set(-1.1, PCB_H * 0.5, 1.45);
  tagPart(capsGrp, 'caps', partMeshes);
  group.add(capsGrp);

  // 7. Cristal 16.000 MHz metálico con serigrafía
  const crystal = createMetalCrystal('16.000');
  crystal.position.set(-1.22, PCB_H * 0.5, 0.14);
  tagPart(crystal, 'crystal', partMeshes);
  group.add(crystal);

  // 8. Botón RESET en esquina superior izquierda
  const resetBtn = createTactileButton(0xe2dfd8);
  resetBtn.position.set(-2.82, PCB_H * 0.5, -2.08);
  tagPart(resetBtn, 'reset', partMeshes);
  group.add(resetBtn);

  // 9 & 10. Cabeceras hembra divididas en sus 4 bloques reales (10 + 8 arriba, 7 + 6 abajo)
  const topPinsLeft = UNO_PINS.filter((p) => p.localPos[2] < 0).slice(0, 10);
  const topPinsRight = UNO_PINS.filter((p) => p.localPos[2] < 0).slice(10);
  const botPowerPins = UNO_PINS.filter((p) => p.localPos[2] > 0 && p.localPos[0] < 1.1);
  const botAnalogPins = UNO_PINS.filter((p) => p.localPos[2] > 0 && p.localPos[0] >= 1.1);

  const topHeaderGrp = new THREE.Group();
  topHeaderGrp.add(createFemaleHeaderRow(topPinsLeft, pinAnchors, 'horizontal'));
  topHeaderGrp.add(createFemaleHeaderRow(topPinsRight, pinAnchors, 'horizontal'));
  tagPart(topHeaderGrp, 'headers_dig', partMeshes);
  group.add(topHeaderGrp);

  const botHeaderGrp = new THREE.Group();
  botHeaderGrp.add(createFemaleHeaderRow(botPowerPins, pinAnchors, 'horizontal'));
  botHeaderGrp.add(createFemaleHeaderRow(botAnalogPins, pinAnchors, 'horizontal'));
  tagPart(botHeaderGrp, 'headers_pwr', partMeshes);
  group.add(botHeaderGrp);

  // Segundo conector ICSP (para el puente USB ATmega16U2) con base plástica negra
  const icspUsb = new THREE.Group();
  const icspPinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.34, 10);
  const icspBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.52), MAT.headerPlastic());
  icspBase.position.y = 0.04;
  icspUsb.add(icspBase);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const p = new THREE.Mesh(icspPinGeo, MAT.gold());
      p.position.set((c - 1) * 0.254, 0.17, (r - 0.5) * 0.254);
      icspUsb.add(p);
    }
  }
  icspUsb.position.set(-1.58, PCB_H * 0.5, -1.72);
  group.add(icspUsb);

  // 11 & 12. LEDs integrados con halo luminoso real
  const ledL = createSmdLed(0xf6c101);
  ledL.position.set(-0.56, PCB_H * 0.5 + 0.038, -1.35);
  tagPart(ledL, 'led_l', partMeshes);
  group.add(ledL);

  const ledOn = createSmdLed(0x2ecc71);
  ledOn.position.set(2.28, PCB_H * 0.5 + 0.038, -1.06);
  (ledOn.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
  const onGlow = createGlowSprite(0x2ecc71, 0.44);
  onGlow.position.set(0, 0.06, 0);
  ledOn.add(onGlow);
  tagPart(ledOn, 'led_on', partMeshes);
  group.add(ledOn);

  const ledTx = createSmdLed(0xf39c12);
  ledTx.position.set(-0.56, PCB_H * 0.5 + 0.038, -1.02);
  const ledRx = createSmdLed(0xf39c12);
  ledRx.position.set(-0.56, PCB_H * 0.5 + 0.038, -0.78);
  group.add(ledTx, ledRx);

  // 13. Conector ICSP derecho 2x3 con base plástica negra
  const icspGrp = new THREE.Group();
  const icspBaseR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.76), MAT.headerPlastic());
  icspBaseR.position.y = 0.04;
  icspGrp.add(icspBaseR);
  const pinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const p = new THREE.Mesh(pinGeo, MAT.gold());
      p.position.set((c - 0.5) * 0.254, 0.18, (r - 1) * 0.254);
      icspGrp.add(p);
    }
  }
  icspGrp.position.set(2.88, PCB_H * 0.5, 0.06);
  tagPart(icspGrp, 'icsp', partMeshes);
  group.add(icspGrp);

  // Animación suave de ensamblaje/desarme
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
    leds: { power: ledOn, builtin: ledL, tx: ledTx, rx: ledRx },
    buttons: { reset: resetBtn },
    setPartAssembled(partId: string, assembled: boolean) {
      const obj = partMeshes.get(partId);
      if (!obj) return;
      const oy = originalY.get(partId) ?? 0;
      targetVisible.set(partId, assembled);
      if (assembled) {
        obj.visible = true;
        obj.position.y = oy + 1.35;
        targetY.set(partId, oy);
      } else {
        targetY.set(partId, oy + 1.35);
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
            } else if (child !== ledOn && child !== ledL) {
              m.emissive.setHex(0x000000);
              m.emissiveIntensity = 0;
            }
          }
        });
      });
    },
  };
}

export const ARDUINO_UNO_SPEC: BoardSpec = {
  id: 'uno',
  indexLabel: '01 / 02',
  eyebrow: 'ARDUINO · 2010 · LÓGICA 5 V',
  name: 'Arduino Uno R3',
  tagline: 'La placa base donde comienza el aprendizaje de electrónica y robótica de campo.',
  levelLabel: 'Nivel Inicial · 5 V',
  logicVoltage: 5,
  summary:
    'Microcontrolador ATmega328P de 8 bits robusto, lógica tolerante de 5 V y conectores hembra listos para protoboard sin soldadura. Ideal como paso previo al armado real en el taller de Tecnología Geogo.',
  clock: '16 MHz',
  flash: '32 KB',
  ram: '2 KB',
  gpioSummary: '14 + 6',
  priceRef: '~$25 USD',
  specs: [
    { label: 'Microcontrolador', value: 'ATmega328P (AVR 8 bits)' },
    { label: 'Frecuencia de reloj', value: '16 MHz' },
    { label: 'Memoria Flash', value: '32 KB (0.5 KB bootloader)' },
    { label: 'SRAM / EEPROM', value: '2 KB / 1 KB' },
    { label: 'Pines digitales', value: '14 (6 con salida PWM ~)' },
    { label: 'Entradas analógicas', value: '6 (ADC 10 bits: 0–1023)' },
    { label: 'Voltaje lógico', value: '5 V' },
    { label: 'Alimentación externa', value: 'USB 5 V o Jack 7–12 V' },
    { label: 'Corriente máx. por pin', value: '20 mA recomendados (40 mA máx.)' },
    { label: 'Interfaces', value: 'UART, I²C (A4/A5), SPI' },
  ],
  strengths: [
    'Lógica de 5 V muy robusta: soporta mejor pequeños errores iniciales que placas de 3.3 V.',
    'Microcontrolador ATmega328P en zócalo DIP: si se daña en taller puede reemplazarse.',
    'Compatible directo con la gran mayoría de módulos del Kit Arduino XL.',
    'Ecosistema enorme de librerías y ejemplos reproducibles en cualquier computador del Liceo.',
  ],
  pitfalls: [
    'Nunca exigir más de 20 mA por pin: usa resistencias de 220 Ω en LEDs y drivers para motores.',
    'Sensores modernos de 3.3 V (como BMP280, BME280 o NRF24L01) requieren conversor Level Shifter 5 V ↔ 3.3 V en señales.',
    'No alimentar motores o servos de carga alta directamente desde el pin 5 V del Arduino; usa fuente externa compartiendo GND.',
    'Los pines D0 (RX) y D1 (TX) comparten el puerto USB: evítalos si usas Monitor Serial.',
  ],
  pinGroups: [
    {
      title: 'Alimentación (Power)',
      body: '5V y 3.3V entregan energía regulada para sensores. GND es la tierra común (0 V) indispensable en todo circuito.',
    },
    {
      title: 'Pines digitales y PWM (~)',
      body: 'D0–D13 leen o escriben estados HIGH (5 V) / LOW (0 V). Los marcados con ~ (3, 5, 6, 9, 10, 11) generan PWM para brillo y servos.',
    },
    {
      title: 'Entradas analógicas (A0–A5)',
      body: 'Convierten voltajes continuos entre 0 V y 5 V en números de 0 a 1023 con analogRead().',
    },
    {
      title: 'Buses e Interrupciones',
      body: 'I²C en A4 (SDA) y A5 (SCL); interrupciones rápidas en D2 (INT0) y D3 (INT1) para encoders ópticos.',
    },
  ],
  firstCodeTitle: 'Primer sketch: baliza en LED integrado (D13)',
  firstCode: `// Baliza básica en Arduino Uno R3 — Tecnología Geogo
void setup() {
  pinMode(LED_BUILTIN, OUTPUT); // Pin 13 como salida
  Serial.begin(9600);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("Baliza ENCENDIDA");
  delay(500);

  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("Baliza APAGADA");
  delay(500);
}`,
  highlights: [
    'Balizas de señalización, semáforos y control de acceso con pulsadores.',
    'Lectura de sensores analógicos y ultrasónicos HC-SR04 para perímetros.',
    'Estaciones de campo BME280 / CO₂ usando Level Shifter hacia pantallas LCD I²C.',
    'Tacómetros con sensores ópticos rotativos aprovechando D2/D3 (attachInterrupt).',
  ],
  facts: [
    '"Uno" significa uno en italiano: conmemoró el lanzamiento de Arduino 1.0.',
    'Nació en Ivrea, Italia, para que estudiantes pudieran prototipar electrónica sin costos altos.',
    'Su diseño de hardware abierto permite usar placas originales o compatibles en el taller.',
  ],
  pins: UNO_PINS,
  parts: UNO_PARTS,
  build3D: buildUno3D,
};
