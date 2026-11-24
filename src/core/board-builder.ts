import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { PinDef } from '../types';

export function setupStudioRenderer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.PMREMGenerator {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  // Mantener ambiente controlado para que los negros sean profundos y las sombras destaquen
  scene.environmentIntensity = 0.28;
  return pmrem;
}

export const MAT = {
  icBody: () =>
    new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.42, metalness: 0.12 }),
  metal: () =>
    new THREE.MeshStandardMaterial({ color: 0xd5d9e0, roughness: 0.22, metalness: 0.88 }),
  brushedMetal: () =>
    new THREE.MeshStandardMaterial({ color: 0xc2c7cf, roughness: 0.34, metalness: 0.82 }),
  gold: () =>
    new THREE.MeshStandardMaterial({ color: 0xe6b834, roughness: 0.22, metalness: 0.92 }),
  copper: () =>
    new THREE.MeshStandardMaterial({ color: 0xcf7c40, roughness: 0.28, metalness: 0.86 }),
  headerPlastic: () =>
    new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.52, metalness: 0.05 }),
  shieldCan: () =>
    new THREE.MeshStandardMaterial({ color: 0xc2c8d1, roughness: 0.26, metalness: 0.86 }),
};

export function createSilkCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createPcbBase(
  w: number,
  h: number,
  d: number,
  color: number,
  holes: Array<[number, number]> = []
): THREE.Group {
  const grp = new THREE.Group();
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(0.16, h * 0.48));
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);

  const ringGeo = new THREE.CylinderGeometry(0.2, 0.2, h + 0.016, 22);
  const holeGeo = new THREE.CylinderGeometry(0.11, 0.11, h + 0.036, 18);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.85 });
  const padMat = MAT.gold();

  for (const [hx, hz] of holes) {
    const pad = new THREE.Mesh(ringGeo, padMat);
    pad.position.set(hx, 0, hz);
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(hx, 0, hz);
    grp.add(pad, hole);
  }
  return grp;
}

/**
 * Contorno PCB real del Arduino Uno R3 con las dos muescas diagonales en el borde derecho
 * y mapeo UV normalizado [0..1] para bumpMap de pistas de cobre.
 */
export function createUnoNotchedPcb(
  color: number,
  holes: Array<[number, number]>,
  bumpMap?: THREE.Texture
): THREE.Group {
  const grp = new THREE.Group();
  const shape = new THREE.Shape();
  // En 2D (sx, sy) -> al rotar -90° en X: X = sx, Z = -sy
  shape.moveTo(-3.43, -2.665);
  shape.lineTo(3.2, -2.665);
  shape.lineTo(3.43, -2.42);
  shape.lineTo(3.43, -1.55);
  shape.lineTo(3.22, -1.3);
  shape.lineTo(3.22, 1.3);
  shape.lineTo(3.43, 1.55);
  shape.lineTo(3.43, 2.665);
  shape.lineTo(-3.43, 2.665);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.128,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.064, 0);

  // Normalizar UVs para bumpMap 1:1 con el plano superior
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    uv.setXY(i, (vx + 3.43) / 6.86, 1 - (vz + 2.665) / 5.33);
  }
  uv.needsUpdate = true;

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0.06,
    clearcoat: 0.55,
    clearcoatRoughness: 0.24,
    bumpMap: bumpMap ?? null,
    bumpScale: bumpMap ? 0.012 : 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);

  const ringGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.176, 22);
  const holeGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.196, 18);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.85 });
  const padMat = MAT.gold();

  for (const [hx, hz] of holes) {
    const pad = new THREE.Mesh(ringGeo, padMat);
    pad.position.set(hx, 0, hz);
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(hx, 0, hz);
    grp.add(pad, hole);
  }
  return grp;
}

export function createMetalCrystal(label = '16.000'): THREE.Group {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(0.58, 0.04, 0.28, 2, 0.04),
    MAT.brushedMetal()
  );
  base.position.y = 0.02;
  const cap = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.16, 0.22, 3, 0.08),
    MAT.metal()
  );
  cap.position.y = 0.11;
  cap.castShadow = true;

  const tex = createSilkCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d5d9e0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
  });
  const topLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.14),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  topLabel.rotation.x = -Math.PI / 2;
  topLabel.position.y = 0.192;
  grp.add(base, cap, topLabel);
  return grp;
}

export function createGlowSprite(colorHex: number, size = 0.42): THREE.Sprite {
  const tex = createSilkCanvasTexture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    const c = new THREE.Color(colorHex);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.45)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  const mat = new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

export function createDetailedUsbB(): THREE.Group {
  const grp = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.98, 1.18, 3, 0.04), MAT.metal());
  shell.position.y = 0.49;
  shell.castShadow = true;

  // Dos ranuras superiores troqueladas características del conector USB-B real
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x5c626b, roughness: 0.6, metalness: 0.4 });
  for (const sz of [-0.26, 0.26]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.16), slotMat);
    slot.position.set(0.05, 0.985, sz);
    grp.add(slot);
  }

  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.72, 0.88),
    new THREE.MeshStandardMaterial({ color: 0x090a0c, roughness: 0.95 })
  );
  cavity.position.set(-0.71, 0.49, 0);

  const tongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.24, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45 })
  );
  tongue.position.set(-0.73, 0.49, 0);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.03, 1.24), MAT.brushedMetal());
  lip.position.set(-0.75, 0.49, 0);

  grp.add(shell, cavity, tongue, lip);
  return grp;
}

export function createDetailedDcJack(): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(1.38, 0.92, 0.88, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.45, metalness: 0.08 })
  );
  body.position.y = 0.46;
  body.castShadow = true;

  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.16, 20),
    new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 })
  );
  bore.rotation.z = Math.PI / 2;
  bore.position.set(-0.64, 0.46, 0);

  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 14), MAT.metal());
  pin.rotation.z = Math.PI / 2;
  pin.position.set(-0.6, 0.46, 0);

  grp.add(body, bore, pin);
  return grp;
}

export function createElectrolyticCap(): THREE.Group {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.46), MAT.headerPlastic());
  base.position.y = 0.035;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.52, 24), MAT.metal());
  can.position.y = 0.31;
  can.castShadow = true;

  // Tapa superior real con media luna negra de polaridad negativa y marca en K/cruz
  const topTex = createSilkCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d5d9e0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#121417';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, -Math.PI * 0.65, Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,75,85,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.52, h * 0.2);
    ctx.lineTo(w * 0.52, h * 0.8);
    ctx.moveTo(w * 0.52, h * 0.5);
    ctx.lineTo(w * 0.85, h * 0.25);
    ctx.moveTo(w * 0.52, h * 0.5);
    ctx.lineTo(w * 0.85, h * 0.75);
    ctx.stroke();
  });
  const topCap = new THREE.Mesh(
    new THREE.CircleGeometry(0.205, 24),
    new THREE.MeshBasicMaterial({ map: topTex })
  );
  topCap.rotation.x = -Math.PI / 2;
  topCap.position.y = 0.572;

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.214, 0.214, 0.5, 16, 1, true, -0.45, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.4 })
  );
  stripe.position.y = 0.31;
  grp.add(base, can, topCap, stripe);
  return grp;
}

export function createSmdPassive(colorHex = 0x1a1c20): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.055, 0.09),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 })
  );
  const capA = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.094), MAT.metal());
  capA.position.x = -0.085;
  const capB = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.094), MAT.metal());
  capB.position.x = 0.085;
  grp.add(body, capA, capB);
  return grp;
}

export function createDipChip(
  w: number,
  h: number,
  d: number,
  pinPairs: number,
  label = 'ATMEGA328P-PU'
): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.035), MAT.icBody());
  body.position.y = h * 0.5 + 0.07;
  body.castShadow = true;
  grp.add(body);

  // Muesca semicircular de orientación Pin 1
  const notch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16),
    new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.8 })
  );
  notch.position.set(-w * 0.5 + 0.04, h + 0.065, 0);
  grp.add(notch);

  const tex = createSilkCanvasTexture(512, 128, (ctx, cw, ch) => {
    ctx.fillStyle = '#1a1c20';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#cfd5df';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cw / 2, ch / 2 - 10);
    ctx.fillStyle = '#8b95a5';
    ctx.font = '20px monospace';
    ctx.fillText('ATMEL · 16 MHz AVR', cw / 2, ch / 2 + 24);
  });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.84, d * 0.58),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = h + 0.072;
  grp.add(plate);

  const legGeo = new THREE.BoxGeometry(0.055, 0.14, 0.05);
  const legMat = MAT.metal();
  const startX = -w * 0.44;
  const stepX = (w * 0.88) / Math.max(1, pinPairs - 1);
  for (let i = 0; i < pinPairs; i++) {
    const lx = startX + i * stepX;
    const legTop = new THREE.Mesh(legGeo, legMat);
    legTop.position.set(lx, 0.07, -d * 0.52);
    const legBot = new THREE.Mesh(legGeo, legMat);
    legBot.position.set(lx, 0.07, d * 0.52);
    grp.add(legTop, legBot);
  }
  return grp;
}

export function createFemaleHeaderRow(
  pins: PinDef[],
  pinAnchors: Map<string, THREE.Object3D>,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): THREE.Group {
  const grp = new THREE.Group();
  if (pins.length === 0) return grp;

  const pitch = 0.254;
  const count = pins.length;
  const len = count * pitch + 0.06;
  const boxGeo =
    orientation === 'horizontal'
      ? new RoundedBoxGeometry(len, 0.36, 0.24, 2, 0.02)
      : new RoundedBoxGeometry(0.24, 0.36, len, 2, 0.02);

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of pins) {
    cx += p.localPos[0];
    cy += p.localPos[1];
    cz += p.localPos[2];
  }
  cx /= count;
  cy /= count;
  cz /= count;

  const housing = new THREE.Mesh(boxGeo, MAT.headerPlastic());
  housing.position.set(cx, cy - 0.15, cz);
  housing.castShadow = true;
  grp.add(housing);

  const socketGeo = new THREE.BoxGeometry(0.11, 0.03, 0.11);
  const socketMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });
  const rimGeo = new THREE.BoxGeometry(0.15, 0.015, 0.15);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.45 });
  const pinTargetGeo = new THREE.SphereGeometry(0.088, 12, 12);

  for (const p of pins) {
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(p.localPos[0], p.localPos[1] + 0.022, p.localPos[2]);
    const hole = new THREE.Mesh(socketGeo, socketMat);
    hole.position.set(p.localPos[0], p.localPos[1] + 0.028, p.localPos[2]);
    grp.add(rim, hole);

    const anchor = new THREE.Mesh(
      pinTargetGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf6c101,
        emissive: 0xd4a007,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
      })
    );
    anchor.position.set(p.localPos[0], p.localPos[1] + 0.07, p.localPos[2]);
    anchor.userData = { pinId: p.id, pinDef: p };
    grp.add(anchor);
    pinAnchors.set(p.id, anchor);
  }

  return grp;
}

export function createMalePinRow(
  pins: PinDef[],
  pinAnchors: Map<string, THREE.Object3D>
): THREE.Group {
  const grp = new THREE.Group();
  const plasticGeo = new THREE.BoxGeometry(0.22, 0.11, 0.22);
  const pinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.38, 10);
  const targetGeo = new THREE.SphereGeometry(0.088, 12, 12);
  const goldMat = MAT.gold();
  const plasticMat = MAT.headerPlastic();

  for (const p of pins) {
    const base = new THREE.Mesh(plasticGeo, plasticMat);
    base.position.set(p.localPos[0], p.localPos[1] - 0.14, p.localPos[2]);
    const shaft = new THREE.Mesh(pinGeo, goldMat);
    shaft.position.set(p.localPos[0], p.localPos[1] - 0.03, p.localPos[2]);

    const anchor = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf6c101,
        emissive: 0xd4a007,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
      })
    );
    anchor.position.set(p.localPos[0], p.localPos[1] + 0.15, p.localPos[2]);
    anchor.userData = { pinId: p.id, pinDef: p };

    grp.add(base, shaft, anchor);
    pinAnchors.set(p.id, anchor);
  }
  return grp;
}

export function createSmdLed(colorHex: number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.1,
    roughness: 0.18,
  });
  return new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.075, 0.1, 2, 0.015), mat);
}

export function createTactileButton(capColor = 0xc0392b): THREE.Group {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.13, 0.36, 2, 0.02), MAT.metal());
  base.position.y = 0.065;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.105, 0.13, 18),
    new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.38 })
  );
  cap.position.y = 0.17;
  grp.add(base, cap);
  return grp;
}

export function tagPart(
  obj: THREE.Object3D,
  partId: string,
  partMeshes: Map<string, THREE.Object3D>
): void {
  obj.userData.partId = partId;
  obj.traverse((child) => {
    child.userData.partId = partId;
  });
  partMeshes.set(partId, obj);
}
