import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ExtraPinTarget, PinDef } from '../types';
import {
  MAT,
  createDetailedDcJack,
  createElectrolyticCap,
  createGlowSprite,
  createPcbBase,
  createSilkCanvasTexture,
  createSmdLed,
  createSmdPassive,
} from '../core/board-builder';

export const ESP32_SHIELD_LIFT_Y = 0.62;

const SHIELD_W = 6.9;
const SHIELD_D = 5.18;
const SHIELD_H = 0.16;
const SHIELD_OFFSET_X = -0.32;

const LEFT_PIN_SHORT = [
  'EN',
  'VP',
  'VN',
  'D34',
  'D35',
  'D32',
  'D33',
  'D25',
  'D26',
  'D27',
  'D14',
  'D12',
  'D13',
  'GND',
  'VIN',
];

const RIGHT_PIN_SHORT = [
  'D23',
  'D22',
  'TX0',
  'RX0',
  'D21',
  'D19',
  'D18',
  'D5',
  'TX2',
  'RX2',
  'D4',
  'D2',
  'D15',
  'GND',
  '3V3',
];

export interface BuiltEsp32Shield3D {
  group: THREE.Group;
  signalAnchors: Map<string, THREE.Object3D>;
  extraPinTargets: ExtraPinTarget[];
}

export function buildEsp32Shield3D(
  espPins: PinDef[],
  options?: { forWorkbench?: boolean }
): BuiltEsp32Shield3D {
  const group = new THREE.Group();
  const signalAnchors = new Map<string, THREE.Object3D>();
  const extraPinTargets: ExtraPinTarget[] = [];

  // PCB base negro mate con 4 perforaciones doradas
  const pcb = createPcbBase(SHIELD_W, SHIELD_H, SHIELD_D, 0x14191f, [
    [-3.12, -2.28],
    [-3.12, 2.28],
    [3.12, -2.28],
    [3.12, 2.28],
  ]);
  pcb.position.x = SHIELD_OFFSET_X;
  group.add(pcb);

  // Serigrafía de alta resolución 2048x1536
  const silkTex = createSilkCanvasTexture(2048, 1536, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const toPxX = (wx: number) => ((wx - (SHIELD_OFFSET_X - SHIELD_W * 0.5)) / SHIELD_W) * w;
    const toPxY = (wz: number) => ((wz + SHIELD_D * 0.5) / SHIELD_D) * h;

    // Pistas sutiles de enrutamiento desde zócalo central hacia filas G-V-S
    ctx.strokeStyle = 'rgba(0, 194, 181, 0.22)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 15; i++) {
      const px = toPxX(-1.78 + i * 0.254);
      ctx.beginPath();
      ctx.moveTo(px, toPxY(-1.16));
      ctx.lineTo(px, toPxY(-1.66));
      ctx.moveTo(px, toPxY(1.16));
      ctx.lineTo(px, toPxY(1.66));
      ctx.stroke();
    }

    // Buses rojos V y negros G horizontales en los bordes
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(toPxX(-1.82), toPxY(-1.92));
    ctx.lineTo(toPxX(1.82), toPxY(-1.92));
    ctx.moveTo(toPxX(-1.82), toPxY(1.92));
    ctx.lineTo(toPxX(1.82), toPxY(1.92));
    ctx.stroke();

    // Título central de la placa Shield
    ctx.fillStyle = '#eee3cc';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32 EXPANSION SHIELD · 30P', toPxX(0.2), toPxY(0));
    ctx.fillStyle = '#00c2b5';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('LICEO SAN NICOLÁS · TECNOLOGÍA GEOGO', toPxX(0.2), toPxY(0) + 34);

    // Leyenda G - V - S en ambos extremos
    const sideMarks: Array<[string, number, string]> = [
      ['G', -2.18, '#cbd5e1'],
      ['V', -1.92, '#fca5a5'],
      ['S', -1.66, '#fde047'],
      ['S', 1.66, '#fde047'],
      ['V', 1.92, '#fca5a5'],
      ['G', 2.18, '#cbd5e1'],
    ];
    ctx.font = 'bold 28px monospace';
    for (const [ch, wz, color] of sideMarks) {
      ctx.fillStyle = color;
      ctx.fillText(ch, toPxX(2.14), toPxY(wz) + 10);
      ctx.fillText(ch, toPxX(-2.14), toPxY(wz) + 10);
    }

    // Numeración blanca de los 15+15 pines junto al bloque Signal (S)
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 15; i++) {
      const px = toPxX(-1.78 + i * 0.254);
      ctx.save();
      ctx.translate(px, toPxY(-1.42));
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(LEFT_PIN_SHORT[i], 0, 7);
      ctx.restore();

      ctx.save();
      ctx.translate(px, toPxY(1.42));
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(RIGHT_PIN_SHORT[i], 0, 7);
      ctx.restore();
    }

    // Etiquetas de potencia en costado izquierdo
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 21px monospace';
    ctx.fillText('DC 6.5-12V', toPxX(-3.5), toPxY(-2.0));
    ctx.fillText('3.3V / 5V', toPxX(-2.9), toPxY(-0.52));
    ctx.fillText('USB-C 5V', toPxX(-3.5), toPxY(1.88));
    ctx.fillStyle = '#4ade80';
    ctx.fillText('PWR', toPxX(-2.65), toPxY(0.86));
  });

  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(SHIELD_W - 0.08, SHIELD_D - 0.08),
    new THREE.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.set(SHIELD_OFFSET_X, SHIELD_H * 0.5 + 0.005, 0);
  group.add(silk);

  // Zócalos hembra centrales 2x15 para insertar la placa ESP32 DevKit V1
  const leftPins = espPins.filter((p) => p.localPos[2] < 0);
  const rightPins = espPins.filter((p) => p.localPos[2] > 0);

  const fHousingGeo = new RoundedBoxGeometry(3.92, 0.36, 0.24, 2, 0.02);
  const fSlotGeo = new THREE.BoxGeometry(0.11, 0.025, 0.11);
  const fHoleMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.92 });
  const fPlasticMat = MAT.headerPlastic();

  for (const rowZ of [-1.16, 1.16]) {
    const body = new THREE.Mesh(fHousingGeo, fPlasticMat);
    body.position.set(0, SHIELD_H * 0.5 + 0.18, rowZ);
    body.castShadow = true;
    group.add(body);
    for (let idx = 0; idx < 15; idx++) {
      const px = -1.78 + idx * 0.254;
      const hole = new THREE.Mesh(fSlotGeo, fHoleMat);
      hole.position.set(px, SHIELD_H * 0.5 + 0.365, rowZ);
      group.add(hole);
    }
  }

  // Cabeceras macho exteriores de 3 hileras G - V - S codificadas por color
  const baseGeo = new THREE.BoxGeometry(0.22, 0.11, 0.22);
  const shaftGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.36, 10);
  const targetGeo = new THREE.SphereGeometry(0.088, 12, 12);
  const goldMat = MAT.gold();
  const sigMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.42, metalness: 0.06 });
  const vccMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.06 });
  const gndMat = new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.52, metalness: 0.05 });

  const makeInvisibleAnchor = (endpoint: string) => {
    const m = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf6c101,
        emissive: 0xd4a007,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0,
      })
    );
    m.userData = { pinId: endpoint };
    return m;
  };

  const buildGvsBank = (pins: PinDef[], side: 'L' | 'R') => {
    const sign = side === 'L' ? -1 : 1;
    const rows: Array<{ kind: 'S' | 'V' | 'G'; z: number; mat: THREE.Material }> = [
      { kind: 'S', z: sign * 1.66, mat: sigMat },
      { kind: 'V', z: sign * 1.92, mat: vccMat },
      { kind: 'G', z: sign * 2.18, mat: gndMat },
    ];

    pins.forEach((pin, idx) => {
      const px = pin.localPos[0];

      for (const r of rows) {
        const base = new THREE.Mesh(baseGeo, r.mat);
        base.position.set(px, SHIELD_H * 0.5 + 0.055, r.z);
        const shaft = new THREE.Mesh(shaftGeo, goldMat);
        shaft.position.set(px, SHIELD_H * 0.5 + 0.18, r.z);
        group.add(base, shaft);

        if (options?.forWorkbench) {
          if (r.kind === 'S') {
            const anchor = makeInvisibleAnchor(pin.id);
            anchor.userData.pinDef = pin;
            anchor.position.set(px, SHIELD_H * 0.5 + 0.34, r.z);
            group.add(anchor);
            signalAnchors.set(pin.id, anchor);
          } else if (r.kind === 'V') {
            const is33 = side === 'R';
            const endpoint = `shield:${is33 ? 'V3' : 'V5'}:${side}${idx}`;
            const anchor = makeInvisibleAnchor(endpoint);
            anchor.position.set(px, SHIELD_H * 0.5 + 0.34, r.z);
            group.add(anchor);
            extraPinTargets.push({
              endpoint,
              obj: anchor,
              shortLabel: is33 ? '3.3V' : '5V',
              title: is33 ? `Riel Rojo V (3.3 V) · #${idx + 1}` : `Riel Rojo V (5 V VIN) · #${idx + 1}`,
              desc: is33
                ? 'Salida regulada de 3.3 V del Shield junto al pin de señal para sensores.'
                : 'Alimentación 5 V regulada desde DC Jack / USB-C del Shield (cuidado con lógica ESP32 a 3.3 V).',
              owner: 'Shield ESP32 (Breakout 30P)',
              category: 'pwr',
            });
          } else {
            const endpoint = `shield:G:${side}${idx}`;
            const anchor = makeInvisibleAnchor(endpoint);
            anchor.position.set(px, SHIELD_H * 0.5 + 0.34, r.z);
            group.add(anchor);
            extraPinTargets.push({
              endpoint,
              obj: anchor,
              shortLabel: 'GND',
              title: `Riel Negro G (GND) · ${side}${idx + 1}`,
              desc: 'Tierra común (0 V) en cabecera G-V-S del Shield ESP32.',
              owner: 'Shield ESP32 (Breakout 30P)',
              category: 'gnd',
            });
          }
        }
      }
    });
  };

  buildGvsBank(leftPins, 'L');
  buildGvsBank(rightPins, 'R');

  // Subsistema de alimentación izquierdo del Shield:
  // 1. Jack DC 2.1 mm (6.5 - 12 V)
  const dcJack = createDetailedDcJack();
  dcJack.scale.setScalar(0.84);
  dcJack.position.set(-3.26, SHIELD_H * 0.5, -1.24);
  group.add(dcJack);

  // 2. Puerto USB-C de alimentación
  const usbcOuter = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.24, 0.72, 3, 0.08), MAT.metal());
  usbcOuter.position.set(-3.46, SHIELD_H * 0.5 + 0.12, 1.2);
  usbcOuter.castShadow = true;
  const usbcCavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.12, 0.54),
    new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.9 })
  );
  usbcCavity.position.set(-3.69, SHIELD_H * 0.5 + 0.12, 1.2);
  const usbcTongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.04, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  usbcTongue.position.set(-3.68, SHIELD_H * 0.5 + 0.12, 1.2);
  group.add(usbcOuter, usbcCavity, usbcTongue);

  // 3. Regulador de potencia onboard (LM1117 / Step-Down) + condensadores electrolíticos
  const regBody = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.16, 0.54, 2, 0.02), MAT.icBody());
  regBody.position.set(-2.72, SHIELD_H * 0.5 + 0.08, 0.35);
  const regTab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.24), MAT.metal());
  regTab.position.set(-2.72, SHIELD_H * 0.5 + 0.05, 0.02);
  group.add(regBody, regTab);

  const cap1 = createElectrolyticCap();
  cap1.scale.setScalar(0.76);
  cap1.position.set(-3.16, SHIELD_H * 0.5, 0.15);
  const cap2 = createElectrolyticCap();
  cap2.scale.setScalar(0.72);
  cap2.position.set(-3.16, SHIELD_H * 0.5, 0.62);
  group.add(cap1, cap2);

  // 4. Jumper selector de voltaje 3.3V / 5V con capuchón amarillo
  for (const jz of [-0.48, -0.26, -0.04]) {
    const jPin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 8), goldMat);
    jPin.position.set(-2.55, SHIELD_H * 0.5 + 0.15, jz);
    group.add(jPin);
  }
  const jumperCap = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.22, 0.42, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
  );
  jumperCap.position.set(-2.55, SHIELD_H * 0.5 + 0.16, -0.37);
  group.add(jumperCap);

  // 5. LED de potencia verde + pasivos SMD
  const pwrLed = createSmdLed(0x22c55e);
  pwrLed.position.set(-2.54, SHIELD_H * 0.5 + 0.038, 1.05);
  (pwrLed.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
  const pwrGlow = createGlowSprite(0x22c55e, 0.38);
  pwrGlow.position.set(-2.54, SHIELD_H * 0.5 + 0.14, 1.05);
  group.add(pwrLed, pwrGlow);

  for (const [sx, sz] of [
    [-2.74, -0.78],
    [-2.54, 0.85],
    [-2.94, 1.38],
  ] as Array<[number, number]>) {
    const smd = createSmdPassive(0x2d241c);
    smd.position.set(sx, SHIELD_H * 0.5 + 0.028, sz);
    group.add(smd);
  }

  return { group, signalAnchors, extraPinTargets };
}
