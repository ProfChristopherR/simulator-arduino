import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT, createSilkCanvasTexture } from '../../core/board-builder';
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
  orange: { label: 'Naranja', hex: 0xf97316 },
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
    0xd4a007, // Tolerancia 5% dorado
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
    defaultProps: { ohms: 220 },
    pins: [
      { id: 'P1', label: 'Terminal 1', category: 'dig', localPos: [-0.508, 0.08, 0] },
      { id: 'P2', label: 'Terminal 2', category: 'dig', localPos: [0.508, 0.08, 0] },
    ],
  },
  {
    type: 'button',
    category: 'Pasivos y Básicos',
    name: 'Pulsador táctil',
    shortDesc: 'Interruptor momentáneo (paso 2 columnas). Haz clic sobre él para cerrar el circuito.',
    voltageBadge: 'Pasivo',
    defaultProps: {},
    pins: [
      { id: 'A', label: 'Terminal A', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'B', label: 'Terminal B', category: 'dig', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'potentiometer',
    category: 'Pasivos y Básicos',
    name: 'Potenciómetro',
    shortDesc: 'Perilla analógica con resistencia total configurable (1 kΩ–100 kΩ).',
    voltageBadge: '5V/3.3V',
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
    shortDesc: 'Color configurable (rojo, verde, amarillo, azul, blanco). Encaja en protoboard.',
    voltageBadge: '5V/3.3V',
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
    defaultProps: {},
    pins: [
      { id: 'SIG', label: 'Señal (+)', category: 'dig', localPos: [-0.254, 0.08, 0] },
      { id: 'GND', label: 'GND (-)', category: 'gnd', localPos: [0.254, 0.08, 0] },
    ],
  },
  {
    type: 'lcd-i2c',
    category: 'Salidas y Pantallas',
    name: 'Pantalla LCD 16×2 (I²C)',
    shortDesc: 'Display de 2 líneas × 16 caracteres conectado por bus I²C.',
    voltageBadge: '5V',
    defaultProps: { i2cAddr: '0x27' },
    pins: [
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [-0.45, 0.2, 0.95] },
      { id: 'VCC', label: 'VCC (5V)', category: 'pwr', localPos: [-0.15, 0.2, 0.95] },
      { id: 'SDA', label: 'SDA', category: 'com', localPos: [0.15, 0.2, 0.95] },
      { id: 'SCL', label: 'SCL', category: 'com', localPos: [0.45, 0.2, 0.95] },
    ],
  },
  {
    type: 'ultrasonic',
    category: 'Sensores Kit XL y Geogo',
    name: 'Ultrasónico HC-SR04',
    shortDesc: 'Mide distancia de 2 cm a 400 cm por eco ultrasónico.',
    voltageBadge: '5V',
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
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.254, 0.16, 0.56] },
      { id: 'DATA', label: 'DATA (Señal)', category: 'dig', localPos: [0, 0.16, 0.56] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.254, 0.16, 0.56] },
    ],
  },
  {
    type: 'ldr',
    category: 'Sensores Kit XL y Geogo',
    name: 'Sensor de Luz (LDR)',
    shortDesc: 'Fotorresistencia con salida analógica proporcional a la luz.',
    voltageBadge: '5V/3.3V',
    defaultProps: {},
    pins: [
      { id: 'VCC', label: 'VCC', category: 'pwr', localPos: [-0.254, 0.14, 0.46] },
      { id: 'AO', label: 'AO (Analógico)', category: 'ana', localPos: [0, 0.14, 0.46] },
      { id: 'GND', label: 'GND', category: 'gnd', localPos: [0.254, 0.14, 0.46] },
    ],
  },
  {
    type: 'bme280',
    category: 'Sensores Kit XL y Geogo',
    name: 'Barómetro BME280 / BMP280',
    shortDesc: 'Modelo seleccionable (BME280/BMP280). Presión, altitud, temp y humedad (3.3 V).',
    voltageBadge: '3.3V',
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
    shortDesc: 'Actuador de precisión controlado de 0° a 180° mediante <Servo.h>.',
    voltageBadge: '5V',
    defaultProps: {},
    pins: [
      { id: 'GND', label: 'GND (Café)', category: 'gnd', localPos: [-1.72, 0.2, 0.25] },
      { id: 'VCC', label: 'VCC (Rojo)', category: 'pwr', localPos: [-1.72, 0.2, 0.0] },
      { id: 'SIG', label: 'SIG (Naranja)', category: 'ctl', localPos: [-1.72, 0.2, -0.25] },
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

  // Anillo de selección sutil (visible cuando se selecciona para mover/configurar)
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.74, 32),
    new THREE.MeshBasicMaterial({
      color: 0x0b1c3d,
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
    const getHex = (props: Record<string, any>) =>
      LED_COLORS[String(props.color ?? 'red')]?.hex ?? 0xe11d48;
    const mat = new THREE.MeshPhysicalMaterial({
      color: getHex(comp.props),
      emissive: getHex(comp.props),
      emissiveIntensity: 0.08,
      roughness: 0.12,
      transmission: 0.35,
      thickness: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 22, 16), mat);
    dome.position.y = 0.46;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.25, 22), mat);
    cyl.position.y = 0.33;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 22), mat);
    rim.position.y = 0.2;
    group.add(dome, cyl, rim);

    updateVisual = (st, props) => {
      const hex = getHex(props);
      const burned = Boolean(st.burned);
      const level = Number(st.brightness ?? 0);
      if (burned) {
        mat.color.setHex(0x2a2422);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      } else {
        mat.color.setHex(hex);
        mat.emissive.setHex(hex);
        mat.emissiveIntensity = 0.08 + level * 1.9;
      }
    };
  } else if (comp.type === 'rgb-led') {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x111827,
      emissiveIntensity: 0.15,
      roughness: 0.22,
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
    group.add(bar, dome, cyl, rim);

    updateVisual = (st) => {
      const r = Math.max(0, Math.min(1, Number(st.r ?? 0)));
      const g = Math.max(0, Math.min(1, Number(st.g ?? 0)));
      const b = Math.max(0, Math.min(1, Number(st.b ?? 0)));
      const peak = Math.max(r, g, b);
      if (peak > 0.02) {
        const mix = new THREE.Color(r, g, b);
        mat.color.copy(mix);
        mat.emissive.copy(mix);
        mat.emissiveIntensity = 0.35 + peak * 1.65;
      } else {
        mat.color.setHex(0xf1f5f9);
        mat.emissive.setHex(0x111827);
        mat.emissiveIntensity = 0.08;
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

    const applyBands = (props: Record<string, any>) => {
      const colors = resistorBandsForOhms(Number(props.ohms ?? 220));
      colors.forEach((hex, idx) => bandMats[idx].color.setHex(hex));
    };
    applyBands(comp.props);
    updateVisual = (_st, props) => applyBands(props);
  } else if (comp.type === 'button') {
    // Cuerpo compacto alineado a paso exacto de protoboard (2 columnas = 0.508)
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.16, 0.54, 2, 0.03), MAT.headerPlastic());
    base.position.y = 0.16;
    base.castShadow = true;
    const topPlate = new THREE.Mesh(new BoxGeometryFallback(0.56, 0.04, 0.46), MAT.shieldCan());
    topPlate.position.y = 0.245;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.15, 22),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.34 })
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
      (cap.material as THREE.MeshStandardMaterial).color.setHex(st.pressed ? 0x2563eb : 0x1e3a5f);
    };
  } else if (comp.type === 'potentiometer') {
    const pcb = makeModuleBoard(0.95, 1.15, 0x1e3a5f, 'POT');
    const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 24), MAT.metal());
    dialBase.position.set(0, 0.26, -0.08);
    const knob = new THREE.Group();
    knob.position.set(0, 0.44, -0.08);
    const knobCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.28, 24), MAT.icBody());
    const pointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf6c101 })
    );
    pointer.position.set(0, 0.15, -0.08);
    knob.add(knobCyl, pointer);
    group.add(pcb, dialBase, knob);
    updateVisual = (st) => {
      const val = Number(st.value ?? 512);
      knob.rotation.y = (val / 1023 - 0.5) * Math.PI * 1.5;
    };
  } else if (comp.type === 'buzzer') {
    // Cuerpo elevado con patitas en paso 0.508 para encajar limpio en protoboard
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
      new THREE.MeshBasicMaterial({ color: 0xf6c101, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.445;
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10);
    for (const lx of [-0.254, 0.254]) {
      const leg = new THREE.Mesh(legGeo, MAT.metal());
      leg.position.set(lx, 0.07, 0);
      group.add(leg);
    }
    group.add(cyl, hole, ring);
    updateVisual = (st) => {
      const active = Number(st.freq ?? 0) > 0;
      (ring.material as THREE.MeshBasicMaterial).color.setHex(active ? 0x22c55e : 0xf6c101);
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
  } else if (comp.type === 'ldr') {
    const pcb = makeModuleBoard(0.95, 0.95, 0x0b1c3d, 'LDR');
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.35 })
    );
    disc.position.set(0, 0.22, -0.1);
    group.add(pcb, disc);
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
    if (!child.userData.compPinId) {
      child.userData.draggableCompUid = comp.uid;
    }
  });

  attachComponentPins(group, comp, item.pins, pinAnchors);
  return { group, pinAnchors, selectionRing, updateVisual };
}

class BoxGeometryFallback extends THREE.BoxGeometry {}

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

  renderer.dispose();
  return map;
}
