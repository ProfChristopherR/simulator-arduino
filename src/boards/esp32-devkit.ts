import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BoardPartDef, BoardSpec, BuiltBoard3D, PinDef } from '../types';
import {
  MAT,
  createGlowSprite,
  createMalePinRow,
  createPcbBase,
  createSilkCanvasTexture,
  createSmdLed,
  createSmdPassive,
  createTactileButton,
  tagPart,
} from '../core/board-builder';
import { ESP32_SHIELD_LIFT_Y, buildEsp32Shield3D } from './esp32-shield';

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

function createDetailedWroomModule(): THREE.Group {
  const grp = new THREE.Group();

  // Sub-PCB portador oscuro del módulo ESP-WROOM-32
  const carrier = new THREE.Mesh(
    new RoundedBoxGeometry(2.38, 0.08, 1.84, 2, 0.02),
    new THREE.MeshPhysicalMaterial({ color: 0x161b22, roughness: 0.42, clearcoat: 0.35 })
  );
  carrier.position.y = 0.04;
  carrier.castShadow = true;
  grp.add(carrier);

  // Pads almenados dorados (castellated half-holes) en los 3 bordes del módulo
  const padMat = MAT.gold();
  const padGeoH = new THREE.BoxGeometry(0.06, 0.09, 0.09);
  for (let i = 0; i < 14; i++) {
    const px = -1.04 + i * 0.145;
    const pTop = new THREE.Mesh(padGeoH, padMat);
    pTop.position.set(px, 0.045, -0.92);
    const pBot = new THREE.Mesh(padGeoH, padMat);
    pBot.position.set(px, 0.045, 0.92);
    grp.add(pTop, pBot);
  }
  const padGeoV = new THREE.BoxGeometry(0.09, 0.09, 0.06);
  for (let i = 0; i < 10; i++) {
    const pz = -0.68 + i * 0.15;
    const pLeft = new THREE.Mesh(padGeoV, padMat);
    pLeft.position.set(-1.19, 0.045, pz);
    grp.add(pLeft);
  }

  // Escudo metálico RF biselado con serigrafía láser Espressif
  const can = new THREE.Mesh(
    new RoundedBoxGeometry(1.72, 0.28, 1.72, 3, 0.04),
    MAT.shieldCan()
  );
  can.position.set(-0.22, 0.21, 0);
  can.castShadow = true;
  grp.add(can);

  const labelTex = createSilkCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#c2c8d1';
    ctx.fillRect(0, 0, w, h);

    // Borde sutil grabado
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.38)';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Emblema circular estilo Espressif
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, 130, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2 - 8, 138, 22, -Math.PI * 0.2, Math.PI * 1.15);
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(w / 2 + 16, 114, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP-WROOM-32', w / 2, 234);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Wi-Fi + BLE · 2.4GHz', w / 2, 276);
    ctx.font = '18px monospace';
    ctx.fillText('ISM 2400-2483.5 MHz', w / 2, 326);
    ctx.fillText('802.11 b/g/n · 4MB FLASH', w / 2, 356);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('CE   FCC   RoHS', w / 2, 424);
  });

  const labelPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.56, 1.56),
    new THREE.MeshBasicMaterial({ map: labelTex })
  );
  labelPlate.rotation.x = -Math.PI / 2;
  labelPlate.position.set(-0.22, 0.352, 0);
  grp.add(labelPlate);

  return grp;
}

function createMeanderAntenna3D(): THREE.Group {
  const grp = new THREE.Group();
  const traceMat = MAT.gold();
  const h = 0.028;
  const w = 0.065;

  // Trazo de antena 2.4 GHz meandro tridimensional en cobre dorado
  const segments: Array<[number, number, number, number]> = [
    [0, -0.58, 0.38, w],
    [0.19, -0.45, w, 0.32],
    [0.02, -0.31, 0.34, w],
    [-0.14, -0.18, w, 0.32],
    [0.02, -0.04, 0.34, w],
    [0.19, 0.1, w, 0.34],
    [0.02, 0.24, 0.34, w],
    [-0.14, 0.38, w, 0.34],
    [0.02, 0.52, 0.34, w],
    [0.19, 0.64, w, 0.26],
    [0.0, 0.75, 0.38, w],
  ];

  for (const [sx, sz, sw, sd] of segments) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sw, h, sd), traceMat);
    bar.position.set(sx, h * 0.5, sz);
    grp.add(bar);
  }

  // Plano de acople plateado en la raíz de la antena
  const feed = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.14), MAT.metal());
  feed.position.set(-0.2, h * 0.5, -0.58);
  grp.add(feed);

  // Hitbox invisible limpio para raycasting de Quiz y Ensamblaje
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 1.66),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  hit.position.set(0.02, 0.06, 0.06);
  grp.add(hit);

  return grp;
}

function createMicroUsb3D(): THREE.Group {
  const grp = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.28, 0.78, 3, 0.03), MAT.metal());
  shell.position.y = 0.14;
  shell.castShadow = true;

  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.31, 0.84), MAT.brushedMetal());
  lip.position.set(-0.31, 0.145, 0);

  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.92 })
  );
  cavity.position.set(-0.28, 0.14, 0);

  const tongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.045, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  tongue.position.set(-0.28, 0.14, 0);

  // 4 pines SMD traseros de señal y alimentación USB
  const pinMat = MAT.metal();
  for (let i = 0; i < 5; i++) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.04), pinMat);
    pin.position.set(0.35, 0.02, -0.22 + i * 0.11);
    grp.add(pin);
  }

  grp.add(shell, lip, cavity, tongue);
  return grp;
}

function buildEsp323D(options?: { forWorkbench?: boolean; withShield?: boolean }): BuiltBoard3D {
  const group = new THREE.Group();
  const devkitGroup = new THREE.Group();
  if (options?.withShield) {
    devkitGroup.position.y = ESP32_SHIELD_LIFT_Y;
  }

  const partMeshes = new Map<string, THREE.Object3D>();
  const pinAnchors = new Map<string, THREE.Object3D>();

  const pcb = createPcbBase(ESP_W, PCB_H, ESP_D, 0x11151c, [
    [-2.35, -1.18],
    [-2.35, 1.18],
    [2.35, -1.18],
    [2.35, 1.18],
  ]);
  devkitGroup.add(pcb);

  const leftLabels = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND', 'VIN'];
  const rightLabels = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND', '3V3'];

  const silkTex = createSilkCanvasTexture(2048, 1120, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const toPxX = (wx: number) => ((wx + ESP_W * 0.5) / ESP_W) * w;
    const toPxY = (wz: number) => ((wz + ESP_D * 0.5) / ESP_D) * h;

    // Pistas de cobre sutiles bajo la máscara negra
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 15; i++) {
      const px = toPxX(-1.78 + i * 0.254);
      ctx.beginPath();
      ctx.moveTo(px, toPxY(-1.08));
      ctx.lineTo(px, toPxY(-0.82));
      ctx.moveTo(px, toPxY(1.08));
      ctx.lineTo(px, toPxY(0.82));
      ctx.stroke();
    }

    // Marcas de pines alrededor de las filas superior e inferior
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 21px monospace';
    for (let i = 0; i < 15; i++) {
      const px = toPxX(-1.78 + i * 0.254);

      ctx.save();
      ctx.translate(px, toPxY(-0.92));
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(leftLabels[i], 0, 7);
      ctx.restore();

      ctx.save();
      ctx.translate(px, toPxY(0.92));
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(rightLabels[i], 0, 7);
      ctx.restore();
    }

    // Etiquetas técnicas de botones, LEDs y placa
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EN', toPxX(-2.12), toPxY(-0.36));
    ctx.fillText('BOOT', toPxX(-2.12), toPxY(0.42));

    ctx.fillStyle = '#fda4af';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('PWR', toPxX(-0.25), toPxY(-0.4));

    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('D2', toPxX(-0.25), toPxY(0.42));

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32 DEVKIT V1', toPxX(-0.72), toPxY(-0.04));

    ctx.fillStyle = '#00c2b5';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('LÓGICA 3.3V · DUAL CORE', toPxX(-0.72), toPxY(0.14));

    ctx.fillStyle = '#f6c101';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('LICEO SAN NICOLÁS · GEOGO', toPxX(-0.72), toPxY(0.32));

    // Aros plateados alrededor de los 30 pines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    for (let i = 0; i < 15; i++) {
      const px = toPxX(-1.78 + i * 0.254);
      ctx.beginPath();
      ctx.arc(px, toPxY(-1.16), 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, toPxY(1.16), 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(ESP_W - 0.08, ESP_D - 0.08),
    new THREE.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = PCB_H * 0.5 + 0.005;
  devkitGroup.add(silk);

  // 1. Módulo ESP-WROOM-32 con sub-PCB almenado y escudo láser
  const wroom = createDetailedWroomModule();
  wroom.position.set(1.36, PCB_H * 0.5, 0);
  tagPart(wroom, 'wroom', partMeshes);
  devkitGroup.add(wroom);

  // 2. Antena PCB en meandro dorado 3D
  const ant = createMeanderAntenna3D();
  ant.position.set(2.26, PCB_H * 0.5 + 0.08, 0);
  tagPart(ant, 'antenna', partMeshes);
  devkitGroup.add(ant);

  // 3. Conector Micro-USB metálico hueco
  const usb = createMicroUsb3D();
  usb.position.set(-2.32, PCB_H * 0.5, 0);
  tagPart(usb, 'usb_micro', partMeshes);
  devkitGroup.add(usb);

  // 4. Puente USB-UART CP2102 QFN-28 con pines metálicos
  const cpGroup = new THREE.Group();
  const cpBody = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.09, 0.46, 2, 0.015), MAT.icBody());
  cpBody.position.y = 0.045;
  cpBody.castShadow = true;
  cpGroup.add(cpBody);
  const leadMat = MAT.metal();
  for (let i = 0; i < 7; i++) {
    const off = -0.15 + i * 0.05;
    const pN = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.05), leadMat);
    pN.position.set(off, 0.015, -0.245);
    const pS = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.05), leadMat);
    pS.position.set(off, 0.015, 0.245);
    const pW = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.025), leadMat);
    pW.position.set(-0.245, 0.015, off);
    const pE = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.025), leadMat);
    pE.position.set(0.245, 0.015, off);
    cpGroup.add(pN, pS, pW, pE);
  }
  cpGroup.position.set(-1.38, PCB_H * 0.5, 0.14);
  tagPart(cpGroup, 'cp2102', partMeshes);
  devkitGroup.add(cpGroup);

  // 5. Regulador AMS1117-3.3 SOT-223 con pestaña térmica y 3 pines
  const regGroup = new THREE.Group();
  const regBody = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.13, 0.26, 2, 0.02), MAT.icBody());
  regBody.position.set(0, 0.065, 0.04);
  regBody.castShadow = true;
  const regTab = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.18), MAT.metal());
  regTab.position.set(0, 0.045, -0.14);
  regGroup.add(regBody, regTab);
  for (const lx of [-0.14, 0, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.12), MAT.metal());
    leg.position.set(lx, 0.025, 0.2);
    regGroup.add(leg);
  }
  regGroup.position.set(-1.38, PCB_H * 0.5, -0.58);
  tagPart(regGroup, 'ams1117', partMeshes);
  devkitGroup.add(regGroup);

  // Pasivos SMD realistas (resistencias, capacitores cerámicos, diodo Schottky y transistores auto-reset)
  const smdPositions: Array<[number, number, number, number]> = [
    [-0.95, -0.56, 0x926239, 0],
    [-0.95, -0.4, 0x926239, 0],
    [-1.74, -0.52, 0x1a1c20, Math.PI / 2],
    [-1.74, 0.52, 0x1a1c20, Math.PI / 2],
    [-0.65, 0.58, 0x1f2937, 0],
    [-0.45, -0.56, 0x1f2937, 0],
    [-0.45, 0.56, 0x1f2937, 0],
  ];
  for (const [sx, sz, col, rot] of smdPositions) {
    const smd = createSmdPassive(col);
    smd.position.set(sx, PCB_H * 0.5 + 0.028, sz);
    smd.rotation.y = rot;
    devkitGroup.add(smd);
  }

  // 6 & 7. Botones BOOT y EN metálicos realistas
  const btnBoot = createTactileButton(0x1f2937);
  btnBoot.scale.setScalar(0.78);
  btnBoot.position.set(-2.12, PCB_H * 0.5, 0.65);
  tagPart(btnBoot, 'btn_boot', partMeshes);
  devkitGroup.add(btnBoot);

  const btnEn = createTactileButton(0xe2e8f0);
  btnEn.scale.setScalar(0.78);
  btnEn.position.set(-2.12, PCB_H * 0.5, -0.65);
  tagPart(btnEn, 'btn_en', partMeshes);
  devkitGroup.add(btnEn);

  // 8 & 9. LEDs SMD con halo de luz
  const ledBlue = createSmdLed(0x3b82f6);
  ledBlue.position.set(-0.25, PCB_H * 0.5 + 0.038, 0.55);
  tagPart(ledBlue, 'led_gpio2', partMeshes);
  devkitGroup.add(ledBlue);

  const ledPwr = createSmdLed(0xe74c3c);
  ledPwr.position.set(-0.25, PCB_H * 0.5 + 0.038, -0.55);
  (ledPwr.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
  const pwrGlow = createGlowSprite(0xef4444, 0.42);
  pwrGlow.position.set(-0.25, PCB_H * 0.5 + 0.14, -0.55);
  tagPart(ledPwr, 'led_pwr', partMeshes);
  devkitGroup.add(ledPwr, pwrGlow);

  // 10. Tiras de 2x15 pines macho dorados
  const pinHeaders = createMalePinRow(ESP_PINS, pinAnchors);
  tagPart(pinHeaders, 'headers_esp', partMeshes);
  devkitGroup.add(pinHeaders);

  group.add(devkitGroup);

  let extraPinTargets: BuiltBoard3D['extraPinTargets'] = undefined;
  if (options?.withShield) {
    const shield = buildEsp32Shield3D(ESP_PINS, { forWorkbench: options.forWorkbench });
    group.add(shield.group);
    if (options.forWorkbench) {
      shield.signalAnchors.forEach((anchor, pinId) => {
        pinAnchors.set(pinId, anchor);
      });
      extraPinTargets = shield.extraPinTargets;
    }
  }

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
    extraPinTargets,
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
              m.emissive.setHex(0x00c2b5);
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
