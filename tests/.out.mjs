// tests/simulator.test.ts
import assert from "node:assert/strict";
import test from "node:test";

// src/boards/arduino-uno.ts
import * as THREE2 from "three";
import { RoundedBoxGeometry as RoundedBoxGeometry2 } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// src/core/board-builder.ts
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
var MAT = {
  icBody: () => new THREE.MeshStandardMaterial({ color: 1184791, roughness: 0.42, metalness: 0.12 }),
  metal: () => new THREE.MeshStandardMaterial({ color: 14014944, roughness: 0.22, metalness: 0.88 }),
  brushedMetal: () => new THREE.MeshStandardMaterial({ color: 12765135, roughness: 0.34, metalness: 0.82 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 15120436, roughness: 0.22, metalness: 0.92 }),
  copper: () => new THREE.MeshStandardMaterial({ color: 13597760, roughness: 0.28, metalness: 0.86 }),
  headerPlastic: () => new THREE.MeshStandardMaterial({ color: 1053205, roughness: 0.52, metalness: 0.05 }),
  shieldCan: () => new THREE.MeshStandardMaterial({ color: 12765393, roughness: 0.26, metalness: 0.86 })
};
function createSilkCanvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
function createPcbBase(w, h, d, color, holes = []) {
  const grp = new THREE.Group();
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(0.16, h * 0.48));
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);
  const ringGeo = new THREE.CylinderGeometry(0.2, 0.2, h + 0.016, 22);
  const holeGeo = new THREE.CylinderGeometry(0.11, 0.11, h + 0.036, 18);
  const holeMat = new THREE.MeshStandardMaterial({ color: 1316377, roughness: 0.85 });
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
function createUnoNotchedPcb(color, holes, bumpMap) {
  const grp = new THREE.Group();
  const shape = new THREE.Shape();
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
    bevelSegments: 3
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.064, 0);
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
    bumpScale: bumpMap ? 0.012 : 0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);
  const ringGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.176, 22);
  const holeGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.196, 18);
  const holeMat = new THREE.MeshStandardMaterial({ color: 1316377, roughness: 0.85 });
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
function createMetalCrystal(label = "16.000") {
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
    ctx.fillStyle = "#d5d9e0";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
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
function createGlowSprite(colorHex, size = 0.42) {
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
    transparent: true
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}
function createDetailedUsbB() {
  const grp = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.98, 1.18, 3, 0.04), MAT.metal());
  shell.position.y = 0.49;
  shell.castShadow = true;
  const slotMat = new THREE.MeshStandardMaterial({ color: 6054507, roughness: 0.6, metalness: 0.4 });
  for (const sz of [-0.26, 0.26]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.16), slotMat);
    slot.position.set(0.05, 0.985, sz);
    grp.add(slot);
  }
  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.72, 0.88),
    new THREE.MeshStandardMaterial({ color: 592396, roughness: 0.95 })
  );
  cavity.position.set(-0.71, 0.49, 0);
  const tongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.24, 0.42),
    new THREE.MeshStandardMaterial({ color: 15857145, roughness: 0.45 })
  );
  tongue.position.set(-0.73, 0.49, 0);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.03, 1.24), MAT.brushedMetal());
  lip.position.set(-0.75, 0.49, 0);
  grp.add(shell, cavity, tongue, lip);
  return grp;
}
function createDetailedDcJack() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(1.38, 0.92, 0.88, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: 1447964, roughness: 0.45, metalness: 0.08 })
  );
  body.position.y = 0.46;
  body.castShadow = true;
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.16, 20),
    new THREE.MeshStandardMaterial({ color: 328966, roughness: 0.9 })
  );
  bore.rotation.z = Math.PI / 2;
  bore.position.set(-0.64, 0.46, 0);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 14), MAT.metal());
  pin.rotation.z = Math.PI / 2;
  pin.position.set(-0.6, 0.46, 0);
  grp.add(body, bore, pin);
  return grp;
}
function createElectrolyticCap() {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.46), MAT.headerPlastic());
  base.position.y = 0.035;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.52, 24), MAT.metal());
  can.position.y = 0.31;
  can.castShadow = true;
  const topTex = createSilkCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#d5d9e0";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#121417";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, -Math.PI * 0.65, Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(70,75,85,0.45)";
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
    new THREE.MeshStandardMaterial({ color: 1184791, roughness: 0.4 })
  );
  stripe.position.y = 0.31;
  grp.add(base, can, topCap, stripe);
  return grp;
}
function createSmdPassive(colorHex = 1711136) {
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
function createDipChip(w, h, d, pinPairs, label = "ATMEGA328P-PU") {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.035), MAT.icBody());
  body.position.y = h * 0.5 + 0.07;
  body.castShadow = true;
  grp.add(body);
  const notch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16),
    new THREE.MeshStandardMaterial({ color: 1053205, roughness: 0.8 })
  );
  notch.position.set(-w * 0.5 + 0.04, h + 0.065, 0);
  grp.add(notch);
  const tex = createSilkCanvasTexture(512, 128, (ctx, cw, ch) => {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#cfd5df";
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cw / 2, ch / 2 - 10);
    ctx.fillStyle = "#8b95a5";
    ctx.font = "20px monospace";
    ctx.fillText("ATMEL \xB7 16 MHz AVR", cw / 2, ch / 2 + 24);
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
  const stepX = w * 0.88 / Math.max(1, pinPairs - 1);
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
function createFemaleHeaderRow(pins, pinAnchors, orientation = "horizontal") {
  const grp = new THREE.Group();
  if (pins.length === 0) return grp;
  const pitch = 0.254;
  const count = pins.length;
  const len = count * pitch + 0.06;
  const boxGeo = orientation === "horizontal" ? new RoundedBoxGeometry(len, 0.36, 0.24, 2, 0.02) : new RoundedBoxGeometry(0.24, 0.36, len, 2, 0.02);
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
  const socketMat = new THREE.MeshStandardMaterial({ color: 328966, roughness: 0.95 });
  const rimGeo = new THREE.BoxGeometry(0.15, 0.015, 0.15);
  const rimMat = new THREE.MeshStandardMaterial({ color: 2895928, roughness: 0.45 });
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
        color: 16171265,
        emissive: 13934599,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0
      })
    );
    anchor.position.set(p.localPos[0], p.localPos[1] + 0.07, p.localPos[2]);
    anchor.userData = { pinId: p.id, pinDef: p };
    grp.add(anchor);
    pinAnchors.set(p.id, anchor);
  }
  return grp;
}
function createMalePinRow(pins, pinAnchors) {
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
        color: 16171265,
        emissive: 13934599,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0
      })
    );
    anchor.position.set(p.localPos[0], p.localPos[1] + 0.15, p.localPos[2]);
    anchor.userData = { pinId: p.id, pinDef: p };
    grp.add(base, shaft, anchor);
    pinAnchors.set(p.id, anchor);
  }
  return grp;
}
function createSmdLed(colorHex) {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.1,
    roughness: 0.18
  });
  return new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.075, 0.1, 2, 0.015), mat);
}
function createTactileButton(capColor = 12597547) {
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
function tagPart(obj, partId, partMeshes) {
  obj.userData.partId = partId;
  obj.traverse((child) => {
    child.userData.partId = partId;
  });
  partMeshes.set(partId, obj);
}

// src/boards/arduino-uno.ts
var UNO_W = 6.86;
var UNO_D = 5.33;
var PCB_H = 0.16;
var HEADER_Y = PCB_H * 0.5 + 0.34;
function makeDigitalPins() {
  const defs = [
    ["SCL", "SCL (A5)", "com", false, "Reloj I2C (compartido con A5)"],
    ["SDA", "SDA (A4)", "com", false, "Datos I2C (compartido con A4)"],
    ["AREF", "AREF", "ana", false, "Voltaje de referencia anal\xF3gica"],
    ["GND_TOP", "GND", "gnd", false, "Tierra (0 V)"],
    ["D13", "D13 (LED L)", "dig", false, "Pin digital 13 \xB7 conectado al LED integrado L y SCK SPI"],
    ["D12", "D12 (MISO)", "dig", false, "Pin digital 12 \xB7 MISO SPI"],
    ["D11", "~D11 (PWM)", "dig", true, "Pin digital 11 con PWM (~) y MOSI SPI"],
    ["D10", "~D10 (PWM)", "dig", true, "Pin digital 10 con PWM (~) y SS SPI"],
    ["D9", "~D9 (PWM)", "dig", true, "Pin digital 9 con PWM (~)"],
    ["D8", "D8", "dig", false, "Pin digital 8"],
    ["D7", "D7", "dig", false, "Pin digital 7"],
    ["D6", "~D6 (PWM)", "dig", true, "Pin digital 6 con PWM (~)"],
    ["D5", "~D5 (PWM)", "dig", true, "Pin digital 5 con PWM (~)"],
    ["D4", "D4", "dig", false, "Pin digital 4"],
    ["D3", "~D3 (PWM / INT1)", "dig", true, "Pin digital 3 con PWM (~) e interrupci\xF3n externa INT1"],
    ["D2", "D2 (INT0)", "dig", false, "Pin digital 2 con interrupci\xF3n externa INT0 (ideal sensor \xF3ptico)"],
    ["D1", "D1 (TX)", "com", false, "Transmisi\xF3n Serial UART (TX) \u2014 evitar si usas Monitor Serial"],
    ["D0", "D0 (RX)", "com", false, "Recepci\xF3n Serial UART (RX) \u2014 evitar si usas Monitor Serial"]
  ];
  return defs.map(([id, label, category, pwm, description], idx) => {
    const gap = idx >= 10 ? 0.16 : 0;
    const x = -1.6 + idx * 0.254 + gap;
    return {
      id,
      label,
      category,
      voltage: category === "gnd" ? 0 : 5,
      localPos: [x, HEADER_Y, -2.34],
      pwm,
      interrupt: id === "D2" || id === "D3",
      i2c: id === "SDA" ? "SDA" : id === "SCL" ? "SCL" : void 0,
      uart: id === "D0" ? "RX" : id === "D1" ? "TX" : void 0,
      description
    };
  });
}
function makePowerAndAnalogPins() {
  const powerDefs = [
    ["IOREF", "IOREF", "pwr", 5, "Referencia l\xF3gica de la placa (5 V en Uno R3)"],
    ["RESET", "RESET", "ctl", 5, "Reinicia el microcontrolador al conectarse a GND"],
    ["3V3", "3.3V", "pwr", 3.3, "Salida regulada de 3.3 V (m\xE1x. 50 mA)"],
    ["5V", "5V", "pwr", 5, "Alimentaci\xF3n principal regulada de 5 V"],
    ["GND_1", "GND", "gnd", 0, "Tierra (0 V) \u2014 referencia com\xFAn de todo el circuito"],
    ["GND_2", "GND", "gnd", 0, "Tierra (0 V) \u2014 segunda toma de masa"],
    ["VIN", "VIN", "pwr", 9, "Entrada de voltaje externo (7\u201312 V) antes del regulador"]
  ];
  const analogDefs = [
    ["A0", "A0", 0, "Entrada anal\xF3gica 0 (10 bits: 0\u20131023) o digital D14"],
    ["A1", "A1", 1, "Entrada anal\xF3gica 1 (10 bits: 0\u20131023) o digital D15"],
    ["A2", "A2", 2, "Entrada anal\xF3gica 2 (10 bits: 0\u20131023) o digital D16"],
    ["A3", "A3", 3, "Entrada anal\xF3gica 3 (10 bits: 0\u20131023) o digital D17"],
    ["A4", "A4 (SDA)", 4, "Entrada anal\xF3gica 4 y l\xEDnea de datos I2C (SDA)"],
    ["A5", "A5 (SCL)", 5, "Entrada anal\xF3gica 5 y reloj I2C (SCL)"]
  ];
  const powerPins = powerDefs.map(([id, label, category, voltage, description], i) => ({
    id,
    label,
    category,
    voltage,
    localPos: [-0.72 + i * 0.254, HEADER_Y, 2.34],
    description
  }));
  const analogPins = analogDefs.map(([id, label, ch, description], i) => ({
    id,
    label,
    category: ch >= 4 ? "com" : "ana",
    voltage: 5,
    analogChannel: ch,
    i2c: ch === 4 ? "SDA" : ch === 5 ? "SCL" : void 0,
    localPos: [1.34 + i * 0.254, HEADER_Y, 2.34],
    description
  }));
  return [...powerPins, ...analogPins];
}
var UNO_PINS = [...makeDigitalPins(), ...makePowerAndAnalogPins()];
var UNO_PARTS = [
  {
    id: "mcu",
    num: 1,
    name: "Microcontrolador ATmega328P",
    category: "CEREBRO",
    summary: "Chip principal DIP de 28 pines a 16 MHz. Almacena y ejecuta tu c\xF3digo C++ (.ino).",
    localPos: [1.1, 0.36, 0.72],
    size: [2.7, 0.45, 0.78],
    quizHint: "Busca el circuito integrado largo y negro con 28 patas en z\xF3calo."
  },
  {
    id: "usb",
    num: 2,
    name: "Puerto USB-B",
    category: "CONEXI\xD3N",
    summary: "Conecta el Arduino al computador para cargar programas, usar el Monitor Serial y alimentar a 5 V.",
    localPos: [-2.85, 0.56, -0.78],
    size: [1.5, 1, 1.2],
    quizHint: "Es el conector met\xE1lico cuadrado grande en el borde izquierdo."
  },
  {
    id: "jack",
    num: 3,
    name: "Conector DC (7\u201312 V)",
    category: "ALIMENTACI\xD3N",
    summary: "Entrada de barril para bater\xEDas o fuente externa de 7 a 12 V (centro positivo).",
    localPos: [-2.75, 0.52, 1.52],
    size: [1.35, 0.95, 0.9],
    quizHint: "Conector cil\xEDndrico negro ubicado en la esquina inferior izquierda."
  },
  {
    id: "usb_bridge",
    num: 4,
    name: "Puente USB ATmega16U2",
    category: "COMUNICACI\xD3N",
    summary: "Traduce los datos USB del PC a comunicaci\xF3n serie UART para programar el chip principal.",
    localPos: [-1.52, 0.2, -0.68],
    size: [0.58, 0.2, 0.58],
    quizHint: "Peque\xF1o chip cuadrado negro cerca del puerto USB."
  },
  {
    id: "regulator",
    num: 5,
    name: "Regulador 5 V (NCP1117)",
    category: "ALIMENTACI\xD3N",
    summary: "Reduce los 7\u201312 V del conector DC o VIN a unos estables 5 V para toda la placa.",
    localPos: [-1.62, 0.24, 1.48],
    size: [0.6, 0.25, 0.45],
    quizHint: "Regulador con pesta\xF1a met\xE1lica junto al conector de alimentaci\xF3n DC."
  },
  {
    id: "caps",
    num: 6,
    name: "Capacitores electrol\xEDticos (47 \xB5F)",
    category: "FILTRADO",
    summary: "Suavizan picos de voltaje cuando se activan LEDs, servos o sensores.",
    localPos: [-1.05, 0.36, 1.45],
    size: [0.46, 0.55, 0.85],
    quizHint: "Dos cilindros plateados verticales cerca del regulador de voltaje."
  },
  {
    id: "crystal",
    num: 7,
    name: "Cristal de cuarzo 16 MHz",
    category: "RELOJ",
    summary: "Marca el pulso exacto de 16 millones de ciclos por segundo para delay() y millis().",
    localPos: [-0.88, 0.22, -0.05],
    size: [0.52, 0.22, 0.28],
    quizHint: "C\xE1psula met\xE1lica ovalada cerca del centro izquierdo."
  },
  {
    id: "reset",
    num: 8,
    name: "Bot\xF3n RESET",
    category: "CONTROL",
    summary: "Reinicia el sketch desde el principio sin borrar la memoria Flash.",
    localPos: [-2.78, 0.24, -2.02],
    size: [0.4, 0.28, 0.4],
    quizHint: "Bot\xF3n t\xE1ctil rojo/met\xE1lico en la esquina superior izquierda."
  },
  {
    id: "headers_dig",
    num: 9,
    name: "Cabecera Digital (D0\u2013D13)",
    category: "ENTRADAS / SALIDAS",
    summary: "14 pines digitales (5 V) para leer botones/sensores o controlar LEDs y servos (~ PWM).",
    localPos: [0.65, 0.32, -2.34],
    size: [4.8, 0.45, 0.3],
    quizHint: "Fila superior larga de conectores negros."
  },
  {
    id: "headers_pwr",
    num: 10,
    name: "Cabecera de Potencia y Anal\xF3gicos (A0\u2013A5)",
    category: "ENERG\xCDA / ANAL\xD3GICO",
    summary: "Pines 3.3V, 5V, GND, VIN y 6 entradas anal\xF3gicas (A0\u2013A5, con SDA/SCL para I2C).",
    localPos: [0.98, 0.32, 2.34],
    size: [4.1, 0.45, 0.3],
    quizHint: "Fila inferior de conectores negros (energ\xEDa y entradas anal\xF3gicas)."
  },
  {
    id: "led_l",
    num: 11,
    name: 'LED integrado "L" (Pin D13)',
    category: "INDICADOR",
    summary: "LED amarillo/\xE1mbar conectado internamente al pin D13 para pruebas r\xE1pidas sin cablear.",
    localPos: [-0.45, 0.14, -1.35],
    size: [0.22, 0.14, 0.16],
    quizHint: "Peque\xF1o LED SMD amarillo junto a la cabecera digital superior."
  },
  {
    id: "led_on",
    num: 12,
    name: 'LED de encendido "ON"',
    category: "INDICADOR",
    summary: "Se ilumina en verde cuando la placa recibe alimentaci\xF3n correcta de 5 V.",
    localPos: [2.35, 0.14, -1.05],
    size: [0.22, 0.14, 0.16],
    quizHint: "Peque\xF1o LED verde en el costado derecho de la placa."
  },
  {
    id: "icsp",
    num: 13,
    name: "Conector ICSP (6 pines)",
    category: "PROGRAMACI\xD3N / SPI",
    summary: "Conector de 2\xD73 pines para grabar bootloader o acceder al bus SPI (MOSI, MISO, SCK).",
    localPos: [2.85, 0.25, 0.05],
    size: [0.46, 0.35, 0.65],
    quizHint: "Bloque de 6 pines met\xE1licos en el borde derecho."
  }
];
function buildUno3D() {
  const group = new THREE2.Group();
  const partMeshes = /* @__PURE__ */ new Map();
  const pinAnchors = /* @__PURE__ */ new Map();
  const holes = [
    [-2.05, -2.25],
    [-1.95, 2.25],
    [2.9, -1.75],
    [2.9, 1.95]
  ];
  const bumpTex = createSilkCanvasTexture(1024, 796, (ctx, w, h) => {
    ctx.fillStyle = "#404040";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c8c8c8";
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
  const pcb = createUnoNotchedPcb(33418, holes, bumpTex);
  group.add(pcb);
  const toPxX = (wx) => (wx + 3.43) / UNO_W * 2048;
  const toPxY = (wz) => (wz + 2.665) / UNO_D * 1592;
  const silkTex = createSilkCanvasTexture(2048, 1592, (ctx) => {
    ctx.clearRect(0, 0, 2048, 1592);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
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
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px sans-serif";
    ctx.fillText("ARDUINO", 1020, 480);
    ctx.font = "900 110px sans-serif";
    ctx.fillText("UNO", 1030, 585);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(1285, 512, 74, 72);
    ctx.font = "bold 34px monospace";
    ctx.fillText("R3", 1300, 560);
    ctx.fillStyle = "#f6c101";
    ctx.font = "bold 26px monospace";
    ctx.fillText("LICEO SAN NICOL\xC1S \xB7 GEOGO", 1025, 634);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px monospace";
    ctx.fillText("DIGITAL (PWM ~)", 1110, 222);
    ctx.fillText("POWER", 935, 1380);
    ctx.fillText("ANALOG IN", 1480, 1380);
    const topShort = {
      SCL: "SCL",
      SDA: "SDA",
      AREF: "AREF",
      GND_TOP: "GND",
      D13: "13",
      D12: "12",
      D11: "~11",
      D10: "~10",
      D9: "~9",
      D8: "8",
      D7: "7",
      D6: "~6",
      D5: "~5",
      D4: "4",
      D3: "~3",
      D2: "2",
      D1: "TX1",
      D0: "RX0"
    };
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    for (const p of UNO_PINS) {
      const px = toPxX(p.localPos[0]);
      if (p.localPos[2] < 0) {
        ctx.fillText(topShort[p.id] ?? p.id, px, 178);
      } else {
        const botShort = {
          IOREF: "IOR",
          RESET: "RST",
          "3V3": "3.3V",
          "5V": "5V",
          GND_1: "GND",
          GND_2: "GND",
          VIN: "VIN",
          A0: "A0",
          A1: "A1",
          A2: "A2",
          A3: "A3",
          A4: "A4",
          A5: "A5"
        };
        ctx.fillText(botShort[p.id] ?? p.id, px, 1435);
      }
    }
    ctx.textAlign = "left";
    ctx.font = "bold 24px monospace";
    ctx.fillText("ON", toPxX(2.42), toPxY(-1.02));
    ctx.fillText("L", toPxX(-0.74), toPxY(-1.32));
    ctx.fillText("TX", toPxX(-0.78), toPxY(-0.99));
    ctx.fillText("RX", toPxX(-0.78), toPxY(-0.75));
    ctx.fillText("RESET", toPxX(-2.52), toPxY(-2.02));
    ctx.fillText("ICSP", toPxX(2.58), toPxY(0.55));
  });
  const silkPlane = new THREE2.Mesh(
    new THREE2.PlaneGeometry(UNO_W - 0.08, UNO_D - 0.08),
    new THREE2.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silkPlane.rotation.x = -Math.PI / 2;
  silkPlane.position.y = PCB_H * 0.5 + 5e-3;
  group.add(silkPlane);
  const smdPositions = [
    [-1.4, -1.35, 0],
    [-1.12, -1.35, 0],
    [-0.18, -1.35, Math.PI / 2],
    [0.12, -1.35, Math.PI / 2],
    [1.82, -1.06, 0],
    [2.05, -1.06, 0],
    [-0.45, 1.38, 0],
    [0.08, 1.48, Math.PI / 2]
  ];
  for (const [sx, sz, rot] of smdPositions) {
    const smd = createSmdPassive(rot === 0 ? 1777188 : 9134649);
    smd.position.set(sx, PCB_H * 0.5 + 0.028, sz);
    smd.rotation.y = rot;
    group.add(smd);
  }
  const polyfuse = new THREE2.Group();
  const pfBody = new THREE2.Mesh(
    new RoundedBoxGeometry2(0.46, 0.08, 0.24, 2, 0.02),
    new THREE2.MeshStandardMaterial({ color: 1332013, roughness: 0.35 })
  );
  const pfCapL = new THREE2.Mesh(new THREE2.BoxGeometry(0.08, 0.085, 0.25), MAT.gold());
  pfCapL.position.x = -0.22;
  const pfCapR = pfCapL.clone();
  pfCapR.position.x = 0.22;
  polyfuse.add(pfBody, pfCapL, pfCapR);
  polyfuse.position.set(-1.98, PCB_H * 0.5 + 0.04, -0.22);
  group.add(polyfuse);
  const lm358 = new THREE2.Mesh(new RoundedBoxGeometry2(0.38, 0.09, 0.28, 2, 0.015), MAT.icBody());
  lm358.position.set(-0.52, PCB_H * 0.5 + 0.045, -0.14);
  const diodeM7 = new THREE2.Mesh(new RoundedBoxGeometry2(0.36, 0.11, 0.2, 2, 0.02), MAT.icBody());
  diodeM7.position.set(-1.78, PCB_H * 0.5 + 0.055, 2.02);
  group.add(lm358, diodeM7);
  const mcuGroup = new THREE2.Group();
  const socket = new THREE2.Mesh(new RoundedBoxGeometry2(3.58, 0.13, 0.96, 2, 0.02), MAT.headerPlastic());
  socket.position.y = 0.065;
  const dip = createDipChip(3.42, 0.25, 0.72, 14, "ATMEGA328P-PU");
  dip.position.y = 0.09;
  mcuGroup.add(socket, dip);
  mcuGroup.position.set(1.1, PCB_H * 0.5, 0.72);
  tagPart(mcuGroup, "mcu", partMeshes);
  group.add(mcuGroup);
  const usbMesh = createDetailedUsbB();
  usbMesh.position.set(-2.9, PCB_H * 0.5, -0.78);
  tagPart(usbMesh, "usb", partMeshes);
  group.add(usbMesh);
  const jackMesh = createDetailedDcJack();
  jackMesh.position.set(-2.78, PCB_H * 0.5, 1.52);
  tagPart(jackMesh, "jack", partMeshes);
  group.add(jackMesh);
  const bridgeGrp = new THREE2.Group();
  const bridge = new THREE2.Mesh(new RoundedBoxGeometry2(0.56, 0.11, 0.56, 2, 0.015), MAT.icBody());
  bridge.position.y = 0.055;
  bridgeGrp.add(bridge);
  for (let i = -3; i <= 3; i++) {
    const p1 = new THREE2.Mesh(new THREE2.BoxGeometry(0.04, 0.03, 0.08), MAT.metal());
    p1.position.set(i * 0.068, 0.015, 0.29);
    const p2 = p1.clone();
    p2.position.z = -0.29;
    bridgeGrp.add(p1, p2);
  }
  bridgeGrp.position.set(-1.48, PCB_H * 0.5, -0.82);
  bridgeGrp.rotation.y = Math.PI / 4;
  tagPart(bridgeGrp, "usb_bridge", partMeshes);
  group.add(bridgeGrp);
  const regGrp = new THREE2.Group();
  const regBody = new THREE2.Mesh(new RoundedBoxGeometry2(0.46, 0.15, 0.44, 2, 0.02), MAT.icBody());
  const regTab = new THREE2.Mesh(new THREE2.BoxGeometry(0.24, 0.09, 0.44), MAT.metal());
  regTab.position.x = -0.26;
  for (let i = -1; i <= 1; i++) {
    const leg = new THREE2.Mesh(new THREE2.BoxGeometry(0.18, 0.04, 0.06), MAT.metal());
    leg.position.set(0.28, -0.04, i * 0.14);
    regGrp.add(leg);
  }
  regGrp.add(regBody, regTab);
  regGrp.position.set(-1.78, PCB_H * 0.5 + 0.075, 1.46);
  tagPart(regGrp, "regulator", partMeshes);
  group.add(regGrp);
  const capsGrp = new THREE2.Group();
  const c1 = createElectrolyticCap();
  c1.position.set(0, 0, -0.27);
  const c2 = createElectrolyticCap();
  c2.position.set(0, 0, 0.27);
  capsGrp.add(c1, c2);
  capsGrp.position.set(-1.1, PCB_H * 0.5, 1.45);
  tagPart(capsGrp, "caps", partMeshes);
  group.add(capsGrp);
  const crystal = createMetalCrystal("16.000");
  crystal.position.set(-1.22, PCB_H * 0.5, 0.14);
  tagPart(crystal, "crystal", partMeshes);
  group.add(crystal);
  const resetBtn = createTactileButton(14868440);
  resetBtn.position.set(-2.82, PCB_H * 0.5, -2.08);
  tagPart(resetBtn, "reset", partMeshes);
  group.add(resetBtn);
  const topPinsLeft = UNO_PINS.filter((p) => p.localPos[2] < 0).slice(0, 10);
  const topPinsRight = UNO_PINS.filter((p) => p.localPos[2] < 0).slice(10);
  const botPowerPins = UNO_PINS.filter((p) => p.localPos[2] > 0 && p.localPos[0] < 1.1);
  const botAnalogPins = UNO_PINS.filter((p) => p.localPos[2] > 0 && p.localPos[0] >= 1.1);
  const topHeaderGrp = new THREE2.Group();
  topHeaderGrp.add(createFemaleHeaderRow(topPinsLeft, pinAnchors, "horizontal"));
  topHeaderGrp.add(createFemaleHeaderRow(topPinsRight, pinAnchors, "horizontal"));
  tagPart(topHeaderGrp, "headers_dig", partMeshes);
  group.add(topHeaderGrp);
  const botHeaderGrp = new THREE2.Group();
  botHeaderGrp.add(createFemaleHeaderRow(botPowerPins, pinAnchors, "horizontal"));
  botHeaderGrp.add(createFemaleHeaderRow(botAnalogPins, pinAnchors, "horizontal"));
  tagPart(botHeaderGrp, "headers_pwr", partMeshes);
  group.add(botHeaderGrp);
  const icspUsb = new THREE2.Group();
  const icspPinGeo = new THREE2.CylinderGeometry(0.028, 0.028, 0.34, 10);
  const icspBase = new THREE2.Mesh(new THREE2.BoxGeometry(0.76, 0.08, 0.52), MAT.headerPlastic());
  icspBase.position.y = 0.04;
  icspUsb.add(icspBase);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const p = new THREE2.Mesh(icspPinGeo, MAT.gold());
      p.position.set((c - 1) * 0.254, 0.17, (r - 0.5) * 0.254);
      icspUsb.add(p);
    }
  }
  icspUsb.position.set(-1.58, PCB_H * 0.5, -1.72);
  group.add(icspUsb);
  const ledL = createSmdLed(16171265);
  ledL.position.set(-0.56, PCB_H * 0.5 + 0.038, -1.35);
  tagPart(ledL, "led_l", partMeshes);
  group.add(ledL);
  const ledOn = createSmdLed(3066993);
  ledOn.position.set(2.28, PCB_H * 0.5 + 0.038, -1.06);
  ledOn.material.emissiveIntensity = 1.2;
  const onGlow = createGlowSprite(3066993, 0.44);
  onGlow.position.set(0, 0.06, 0);
  ledOn.add(onGlow);
  tagPart(ledOn, "led_on", partMeshes);
  group.add(ledOn);
  const ledTx = createSmdLed(15965202);
  ledTx.position.set(-0.56, PCB_H * 0.5 + 0.038, -1.02);
  const ledRx = createSmdLed(15965202);
  ledRx.position.set(-0.56, PCB_H * 0.5 + 0.038, -0.78);
  group.add(ledTx, ledRx);
  const icspGrp = new THREE2.Group();
  const icspBaseR = new THREE2.Mesh(new THREE2.BoxGeometry(0.52, 0.08, 0.76), MAT.headerPlastic());
  icspBaseR.position.y = 0.04;
  icspGrp.add(icspBaseR);
  const pinGeo = new THREE2.CylinderGeometry(0.03, 0.03, 0.36, 10);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const p = new THREE2.Mesh(pinGeo, MAT.gold());
      p.position.set((c - 0.5) * 0.254, 0.18, (r - 1) * 0.254);
      icspGrp.add(p);
    }
  }
  icspGrp.position.set(2.88, PCB_H * 0.5, 0.06);
  tagPart(icspGrp, "icsp", partMeshes);
  group.add(icspGrp);
  const originalY = /* @__PURE__ */ new Map();
  const targetY = /* @__PURE__ */ new Map();
  const targetVisible = /* @__PURE__ */ new Map();
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
    setPartAssembled(partId, assembled) {
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
    tickAnimation(dt) {
      const alpha = 1 - Math.exp(-10 * dt);
      partMeshes.forEach((obj, id) => {
        const ty = targetY.get(id) ?? obj.position.y;
        obj.position.y += (ty - obj.position.y) * alpha;
        if (!targetVisible.get(id) && Math.abs(obj.position.y - ty) < 0.08) {
          obj.visible = false;
        }
      });
    },
    highlightPart(partId) {
      partMeshes.forEach((obj, id) => {
        obj.traverse((child) => {
          const m = child.material;
          if (m && "emissive" in m) {
            if (id === partId) {
              m.emissive.setHex(13934599);
              m.emissiveIntensity = 0.45;
            } else if (child !== ledOn && child !== ledL) {
              m.emissive.setHex(0);
              m.emissiveIntensity = 0;
            }
          }
        });
      });
    }
  };
}
var ARDUINO_UNO_SPEC = {
  id: "uno",
  indexLabel: "01 / 02",
  eyebrow: "ARDUINO \xB7 2010 \xB7 L\xD3GICA 5 V",
  name: "Arduino Uno R3",
  tagline: "La placa base donde comienza el aprendizaje de electr\xF3nica y rob\xF3tica de campo.",
  levelLabel: "Nivel Inicial \xB7 5 V",
  logicVoltage: 5,
  summary: "Microcontrolador ATmega328P de 8 bits robusto, l\xF3gica tolerante de 5 V y conectores hembra listos para protoboard sin soldadura. Ideal como paso previo al armado real en el taller de Tecnolog\xEDa Geogo.",
  clock: "16 MHz",
  flash: "32 KB",
  ram: "2 KB",
  gpioSummary: "14 + 6",
  priceRef: "~$25 USD",
  specs: [
    { label: "Microcontrolador", value: "ATmega328P (AVR 8 bits)" },
    { label: "Frecuencia de reloj", value: "16 MHz" },
    { label: "Memoria Flash", value: "32 KB (0.5 KB bootloader)" },
    { label: "SRAM / EEPROM", value: "2 KB / 1 KB" },
    { label: "Pines digitales", value: "14 (6 con salida PWM ~)" },
    { label: "Entradas anal\xF3gicas", value: "6 (ADC 10 bits: 0\u20131023)" },
    { label: "Voltaje l\xF3gico", value: "5 V" },
    { label: "Alimentaci\xF3n externa", value: "USB 5 V o Jack 7\u201312 V" },
    { label: "Corriente m\xE1x. por pin", value: "20 mA recomendados (40 mA m\xE1x.)" },
    { label: "Interfaces", value: "UART, I\xB2C (A4/A5), SPI" }
  ],
  strengths: [
    "L\xF3gica de 5 V muy robusta: soporta mejor peque\xF1os errores iniciales que placas de 3.3 V.",
    "Microcontrolador ATmega328P en z\xF3calo DIP: si se da\xF1a en taller puede reemplazarse.",
    "Compatible directo con la gran mayor\xEDa de m\xF3dulos del Kit Arduino XL.",
    "Ecosistema enorme de librer\xEDas y ejemplos reproducibles en cualquier computador del Liceo."
  ],
  pitfalls: [
    "Nunca exigir m\xE1s de 20 mA por pin: usa resistencias de 220 \u03A9 en LEDs y drivers para motores.",
    "Sensores modernos de 3.3 V (como BMP280, BME280 o NRF24L01) requieren conversor Level Shifter 5 V \u2194 3.3 V en se\xF1ales.",
    "No alimentar motores o servos de carga alta directamente desde el pin 5 V del Arduino; usa fuente externa compartiendo GND.",
    "Los pines D0 (RX) y D1 (TX) comparten el puerto USB: ev\xEDtalos si usas Monitor Serial."
  ],
  pinGroups: [
    {
      title: "Alimentaci\xF3n (Power)",
      body: "5V y 3.3V entregan energ\xEDa regulada para sensores. GND es la tierra com\xFAn (0 V) indispensable en todo circuito."
    },
    {
      title: "Pines digitales y PWM (~)",
      body: "D0\u2013D13 leen o escriben estados HIGH (5 V) / LOW (0 V). Los marcados con ~ (3, 5, 6, 9, 10, 11) generan PWM para brillo y servos."
    },
    {
      title: "Entradas anal\xF3gicas (A0\u2013A5)",
      body: "Convierten voltajes continuos entre 0 V y 5 V en n\xFAmeros de 0 a 1023 con analogRead()."
    },
    {
      title: "Buses e Interrupciones",
      body: "I\xB2C en A4 (SDA) y A5 (SCL); interrupciones r\xE1pidas en D2 (INT0) y D3 (INT1) para encoders \xF3pticos."
    }
  ],
  firstCodeTitle: "Primer sketch: baliza en LED integrado (D13)",
  firstCode: `// Baliza b\xE1sica en Arduino Uno R3 \u2014 Tecnolog\xEDa Geogo
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
    "Balizas de se\xF1alizaci\xF3n, sem\xE1foros y control de acceso con pulsadores.",
    "Lectura de sensores anal\xF3gicos y ultras\xF3nicos HC-SR04 para per\xEDmetros.",
    "Estaciones de campo BME280 / CO\u2082 usando Level Shifter hacia pantallas LCD I\xB2C.",
    "Tac\xF3metros con sensores \xF3pticos rotativos aprovechando D2/D3 (attachInterrupt)."
  ],
  facts: [
    '"Uno" significa uno en italiano: conmemor\xF3 el lanzamiento de Arduino 1.0.',
    "Naci\xF3 en Ivrea, Italia, para que estudiantes pudieran prototipar electr\xF3nica sin costos altos.",
    "Su dise\xF1o de hardware abierto permite usar placas originales o compatibles en el taller."
  ],
  pins: UNO_PINS,
  parts: UNO_PARTS,
  build3D: buildUno3D
};

// src/boards/esp32-devkit.ts
import * as THREE3 from "three";
import { RoundedBoxGeometry as RoundedBoxGeometry3 } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
var ESP_W = 5.15;
var ESP_D = 2.8;
var PCB_H2 = 0.16;
var PIN_Y = PCB_H2 * 0.5 + 0.08;
function makeEspPins() {
  const leftLabels = [
    ["EN", "EN", "ctl", 3.3, "Habilitaci\xF3n / Reset del ESP32"],
    ["VP", "GPIO36 (VP)", "ana", 3.3, "Entrada anal\xF3gica ADC1_0 (solo entrada)"],
    ["VN", "GPIO39 (VN)", "ana", 3.3, "Entrada anal\xF3gica ADC1_3 (solo entrada)"],
    ["G34", "GPIO34", "ana", 3.3, "ADC1_6 (solo entrada, sin pull-up interno)"],
    ["G35", "GPIO35", "ana", 3.3, "ADC1_7 (solo entrada)"],
    ["G32", "GPIO32", "ana", 3.3, "Digital / PWM / ADC1_4 / Touch9"],
    ["G33", "GPIO33", "ana", 3.3, "Digital / PWM / ADC1_5 / Touch8"],
    ["G25", "GPIO25 (DAC1)", "ana", 3.3, "Digital / PWM / DAC1"],
    ["G26", "GPIO26 (DAC2)", "ana", 3.3, "Digital / PWM / DAC2"],
    ["G27", "GPIO27", "dig", 3.3, "Digital / PWM / Touch7"],
    ["G14", "GPIO14", "dig", 3.3, "Digital / PWM / HSPI SCK"],
    ["G12", "GPIO12", "dig", 3.3, "Digital / PWM (precauci\xF3n en arranque)"],
    ["G13", "GPIO13", "dig", 3.3, "Digital / PWM / HSPI MOSI"],
    ["GND_1", "GND", "gnd", 0, "Tierra com\xFAn (0 V)"],
    ["VIN", "VIN (5V)", "pwr", 5, "Entrada 5 V regulada hacia 3.3 V"]
  ];
  const rightLabels = [
    ["G23", "GPIO23 (MOSI)", "com", 3.3, "SPI VSPI MOSI / Digital / PWM"],
    ["G22", "GPIO22 (SCL)", "com", 3.3, "Reloj I\xB2C por defecto (SCL)"],
    ["TX0", "GPIO1 (TX0)", "com", 3.3, "Serial0 TX"],
    ["RX0", "GPIO3 (RX0)", "com", 3.3, "Serial0 RX"],
    ["G21", "GPIO21 (SDA)", "com", 3.3, "Datos I\xB2C por defecto (SDA)"],
    ["G19", "GPIO19 (MISO)", "com", 3.3, "SPI VSPI MISO / Digital"],
    ["G18", "GPIO18 (SCK)", "com", 3.3, "SPI VSPI SCK / Digital"],
    ["G5", "GPIO5 (SS)", "com", 3.3, "SPI VSPI SS / Digital"],
    ["G17", "GPIO17 (TX2)", "com", 3.3, "UART2 TX (ideal sensor CO\u2082 MH-Z19)"],
    ["G16", "GPIO16 (RX2)", "com", 3.3, "UART2 RX (ideal sensor CO\u2082 MH-Z19)"],
    ["G4", "GPIO4", "dig", 3.3, "Digital / PWM / Touch0"],
    ["G2", "GPIO2 (LED)", "dig", 3.3, "LED azul integrado en placa + Digital/PWM"],
    ["G15", "GPIO15", "dig", 3.3, "Digital / PWM"],
    ["GND_2", "GND", "gnd", 0, "Tierra com\xFAn (0 V)"],
    ["3V3", "3.3V", "pwr", 3.3, "Salida regulada 3.3 V para sensores"]
  ];
  const pins = [];
  leftLabels.forEach(([id, label, category, voltage, description], idx) => {
    const x = -1.78 + idx * 0.254;
    pins.push({
      id,
      label,
      category,
      voltage,
      localPos: [x, PIN_Y, -1.16],
      pwm: category === "dig" || category === "com",
      i2c: id === "G21" ? "SDA" : id === "G22" ? "SCL" : void 0,
      description
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
      pwm: category === "dig" || category === "com",
      i2c: id === "G21" ? "SDA" : id === "G22" ? "SCL" : void 0,
      description
    });
  });
  return pins;
}
var ESP_PINS = makeEspPins();
var ESP_PARTS = [
  {
    id: "wroom",
    num: 1,
    name: "M\xF3dulo ESP-WROOM-32",
    category: "PROCESADOR + RF",
    summary: "Doble n\xFAcleo Xtensa LX6 a 240 MHz con radio Wi-Fi y Bluetooth bajo blindaje met\xE1lico.",
    localPos: [1.35, 0.3, 0],
    size: [1.85, 0.4, 1.85],
    quizHint: "Caja met\xE1lica cuadrada grande en el lado derecho."
  },
  {
    id: "antenna",
    num: 2,
    name: "Antena PCB 2.4 GHz",
    category: "COMUNICACI\xD3N",
    summary: "Trazo de cobre en meandro para transmisi\xF3n inal\xE1mbrica Wi-Fi y BLE.",
    localPos: [2.25, 0.14, 0],
    size: [0.55, 0.15, 1.8],
    quizHint: "Zona con pista dorada en zig-zag en el extremo derecho."
  },
  {
    id: "usb_micro",
    num: 3,
    name: "Puerto Micro-USB",
    category: "CONEXI\xD3N",
    summary: "Alimenta la placa a 5 V y permite subir c\xF3digo y leer datos por Serial.",
    localPos: [-2.35, 0.28, 0],
    size: [0.65, 0.35, 0.8],
    quizHint: "Conector met\xE1lico plano en el borde izquierdo."
  },
  {
    id: "cp2102",
    num: 4,
    name: "Puente USB CP2102",
    category: "COMUNICACI\xD3N",
    summary: "Convierte la se\xF1al USB a UART para flashear el ESP32.",
    localPos: [-1.45, 0.18, 0.15],
    size: [0.5, 0.2, 0.5],
    quizHint: "Chip negro cuadrado peque\xF1o cerca del conector Micro-USB."
  },
  {
    id: "ams1117",
    num: 5,
    name: "Regulador 3.3 V (AMS1117)",
    category: "ALIMENTACI\xD3N",
    summary: "Convierte los 5 V del USB o VIN en 3.3 V estables para el procesador.",
    localPos: [-1.4, 0.22, -0.58],
    size: [0.58, 0.22, 0.42],
    quizHint: "Regulador negro con pesta\xF1a met\xE1lica junto al Micro-USB."
  },
  {
    id: "btn_boot",
    num: 6,
    name: "Bot\xF3n BOOT",
    category: "CONTROL",
    summary: "Permite poner el ESP32 en modo descarga de firmware.",
    localPos: [-2.12, 0.22, 0.65],
    size: [0.35, 0.26, 0.35],
    quizHint: "Uno de los dos pulsadores junto al puerto Micro-USB."
  },
  {
    id: "btn_en",
    num: 7,
    name: "Bot\xF3n EN (Reset)",
    category: "CONTROL",
    summary: "Reinicia el microcontrolador ESP32.",
    localPos: [-2.12, 0.22, -0.65],
    size: [0.35, 0.26, 0.35],
    quizHint: "Bot\xF3n t\xE1ctil junto al regulador y al puerto USB."
  },
  {
    id: "led_gpio2",
    num: 8,
    name: "LED azul integrado (GPIO2)",
    category: "INDICADOR",
    summary: "LED azul conectado a GPIO2 para pruebas sin cables externos.",
    localPos: [-0.25, 0.14, 0.55],
    size: [0.22, 0.14, 0.16],
    quizHint: "Peque\xF1o LED azul SMD cerca del centro de la placa."
  },
  {
    id: "headers_esp",
    num: 9,
    name: "Tiras de pines 30 GPIO (3.3 V)",
    category: "ENTRADAS / SALIDAS",
    summary: "Doble fila de 15 pines macho compatibles con protoboard (l\xF3gica estricta 3.3 V).",
    localPos: [0, 0.14, 0],
    size: [3.85, 0.4, 2.5],
    quizHint: "Las dos hileras largas de pines dorados en los bordes superior e inferior."
  }
];
function buildEsp323D() {
  const group = new THREE3.Group();
  const partMeshes = /* @__PURE__ */ new Map();
  const pinAnchors = /* @__PURE__ */ new Map();
  const pcb = createPcbBase(ESP_W, PCB_H2, ESP_D, 1645860, [
    [-2.3, -1.18],
    [-2.3, 1.18],
    [2.3, -1.18],
    [2.3, 1.18]
  ]);
  group.add(pcb);
  const silkTex = createSilkCanvasTexture(1024, 560, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("ESP32 DEVKIT V1 \xB7 3.3V", 210, 290);
    ctx.fillStyle = "#f6c101";
    ctx.font = "bold 16px monospace";
    ctx.fillText("SAN NICOL\xC1S \xB7 GEOGO", 210, 318);
    ctx.strokeStyle = "#d4a007";
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
  const silk = new THREE3.Mesh(
    new THREE3.PlaneGeometry(ESP_W - 0.1, ESP_D - 0.1),
    new THREE3.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = PCB_H2 * 0.5 + 5e-3;
  group.add(silk);
  const wroom = new THREE3.Mesh(new RoundedBoxGeometry3(1.75, 0.34, 1.8, 2, 0.04), MAT.shieldCan());
  wroom.position.set(1.22, PCB_H2 * 0.5 + 0.17, 0);
  wroom.castShadow = true;
  tagPart(wroom, "wroom", partMeshes);
  group.add(wroom);
  const ant = new THREE3.Mesh(
    new THREE3.BoxGeometry(0.45, 0.04, 1.7),
    new THREE3.MeshStandardMaterial({ color: 13934599, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.35 })
  );
  ant.position.set(2.3, PCB_H2 * 0.5 + 0.02, 0);
  tagPart(ant, "antenna", partMeshes);
  group.add(ant);
  const usb = new THREE3.Mesh(new RoundedBoxGeometry3(0.65, 0.28, 0.78, 2, 0.04), MAT.metal());
  usb.position.set(-2.35, PCB_H2 * 0.5 + 0.14, 0);
  tagPart(usb, "usb_micro", partMeshes);
  group.add(usb);
  const cp = new THREE3.Mesh(new THREE3.BoxGeometry(0.48, 0.1, 0.48), MAT.icBody());
  cp.position.set(-1.45, PCB_H2 * 0.5 + 0.05, 0.15);
  tagPart(cp, "cp2102", partMeshes);
  group.add(cp);
  const reg = new THREE3.Mesh(new THREE3.BoxGeometry(0.54, 0.14, 0.4), MAT.icBody());
  reg.position.set(-1.4, PCB_H2 * 0.5 + 0.07, -0.58);
  tagPart(reg, "ams1117", partMeshes);
  group.add(reg);
  const btnBoot = createTactileButton();
  btnBoot.scale.setScalar(0.8);
  btnBoot.position.set(-2.12, PCB_H2 * 0.5, 0.65);
  tagPart(btnBoot, "btn_boot", partMeshes);
  group.add(btnBoot);
  const btnEn = createTactileButton();
  btnEn.scale.setScalar(0.8);
  btnEn.position.set(-2.12, PCB_H2 * 0.5, -0.65);
  tagPart(btnEn, "btn_en", partMeshes);
  group.add(btnEn);
  const ledBlue = createSmdLed(3900150);
  ledBlue.position.set(-0.25, PCB_H2 * 0.5 + 0.035, 0.55);
  tagPart(ledBlue, "led_gpio2", partMeshes);
  group.add(ledBlue);
  const ledPwr = createSmdLed(15158332);
  ledPwr.position.set(-0.25, PCB_H2 * 0.5 + 0.035, -0.55);
  ledPwr.material.emissiveIntensity = 0.7;
  group.add(ledPwr);
  const pinHeaders = createMalePinRow(ESP_PINS, pinAnchors);
  tagPart(pinHeaders, "headers_esp", partMeshes);
  group.add(pinHeaders);
  const originalY = /* @__PURE__ */ new Map();
  const targetY = /* @__PURE__ */ new Map();
  const targetVisible = /* @__PURE__ */ new Map();
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
    setPartAssembled(partId, assembled) {
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
    tickAnimation(dt) {
      const alpha = 1 - Math.exp(-10 * dt);
      partMeshes.forEach((obj, id) => {
        const ty = targetY.get(id) ?? obj.position.y;
        obj.position.y += (ty - obj.position.y) * alpha;
        if (!targetVisible.get(id) && Math.abs(obj.position.y - ty) < 0.08) {
          obj.visible = false;
        }
      });
    },
    highlightPart(partId) {
      partMeshes.forEach((obj, id) => {
        obj.traverse((child) => {
          const m = child.material;
          if (m && "emissive" in m) {
            if (id === partId) {
              m.emissive.setHex(13934599);
              m.emissiveIntensity = 0.45;
            } else if (child !== ledPwr && child !== ledBlue) {
              m.emissive.setHex(0);
              m.emissiveIntensity = 0;
            }
          }
        });
      });
    }
  };
}
var ESP32_SPEC = {
  id: "esp32",
  indexLabel: "02 / 02",
  eyebrow: "ESPRESSIF \xB7 2016 \xB7 L\xD3GICA 3.3 V",
  name: "ESP32 DevKit V1",
  tagline: "Doble n\xFAcleo, Wi-Fi y Bluetooth integrados para telemetr\xEDa Geogo de alto rendimiento.",
  levelLabel: "Nivel Intermedio \xB7 3.3 V",
  logicVoltage: 3.3,
  summary: "Placa potente de 32 bits ideal para estaciones meteorol\xF3gicas BME280, lectura de CO\u2082 y enlaces inal\xE1mbricos. Recuerda que sus pines trabajan estrictamente a 3.3 V: usa Level Shifter si conectas sensores de 5 V.",
  clock: "240 MHz",
  flash: "4 MB",
  ram: "520 KB",
  gpioSummary: "30 pines",
  priceRef: "~$8 USD",
  specs: [
    { label: "Procesador", value: "Xtensa LX6 Dual-Core 32 bits" },
    { label: "Frecuencia de reloj", value: "Hasta 240 MHz" },
    { label: "Memoria Flash / SRAM", value: "4 MB / 520 KB" },
    { label: "Conectividad nativa", value: "Wi-Fi 802.11 b/g/n + Bluetooth BLE" },
    { label: "ADC Anal\xF3gico", value: "12 bits (0\u20134095) en GPIO32\u201339" },
    { label: "Voltaje l\xF3gico estricto", value: "3.3 V (NO tolera 5 V directo)" },
    { label: "Interfaces", value: "I\xB2C (21/22), SPI, 3\xD7 UART, PWM, DAC, Touch" },
    { label: "LED integrado", value: "GPIO2 (azul)" }
  ],
  strengths: [
    "Mucha mayor memoria y velocidad que Arduino Uno para pantallas OLED/LCD y sensores complejos.",
    "Compatible nativo a 3.3 V con m\xF3dulos BMP280, BME280 y transceptores NRF24L01 sin conversor.",
    "Resoluci\xF3n anal\xF3gica de 12 bits (0\u20134095) para lecturas finas de CO\u2082 o luminosidad."
  ],
  pitfalls: [
    "\xA1Alerta de voltaje! Aplicar 5 V directo a un pin GPIO puede da\xF1ar permanentemente el chip: usa Level Shifter.",
    "Los pines GPIO34, GPIO35, GPIO36 (VP) y GPIO39 (VN) son solo entrada (no sirven como OUTPUT).",
    "Al usar Wi-Fi, algunos pines de ADC2 dejan de estar disponibles; prefiere ADC1 (GPIO32\u201339)."
  ],
  pinGroups: [
    {
      title: "Alimentaci\xF3n",
      body: "VIN recibe 5 V externos; el pin 3V3 entrega 3.3 V regulados. Comparte siempre GND."
    },
    {
      title: "I\xB2C y UART2",
      body: "I\xB2C por defecto en GPIO21 (SDA) y GPIO22 (SCL). UART2 en GPIO16/17 para m\xF3dulos CO\u2082."
    },
    {
      title: "ADC de 12 bits y DAC",
      body: "Lee valores de 0 a 4095; incluye dos salidas anal\xF3gicas reales DAC en GPIO25 y GPIO26."
    }
  ],
  firstCodeTitle: "Primer sketch: parpadeo y lectura de voltaje en ESP32",
  firstCode: `// Prueba inicial ESP32 DevKit V1 \u2014 Tecnolog\xEDa Geogo
const int LED_PIN = 2; // LED azul integrado en GPIO2

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("ESP32 activo \xB7 L\xF3gica 3.3 V");
  delay(400);

  digitalWrite(LED_PIN, LOW);
  delay(400);
}`,
  highlights: [
    "Estaciones de telemetr\xEDa ambiental con BME280 y sensor de CO\u2082.",
    "Sistemas inal\xE1mbricos con Wi-Fi, Bluetooth o enlaces RF.",
    "Procesamiento r\xE1pido de encoders \xF3pticos rotativos y pantallas."
  ],
  facts: [
    "Su antena en meandro est\xE1 grabada directamente en el cobre del circuito impreso.",
    "A pesar de tener 240 MHz y Wi-Fi, suele ser m\xE1s econ\xF3mico que un Arduino Uno original."
  ],
  pins: ESP_PINS,
  parts: ESP_PARTS,
  build3D: buildEsp323D
};

// src/boards/registry.ts
var BOARD_REGISTRY = {
  uno: ARDUINO_UNO_SPEC,
  esp32: ESP32_SPEC
};
function getBoardSpec(id) {
  return BOARD_REGISTRY[id];
}

// src/lab/components/catalog.ts
import * as THREE4 from "three";
import { RoundedBoxGeometry as RoundedBoxGeometry4 } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
var RESISTOR_DIGIT_COLORS = [
  1315860,
  // 0 Negro
  8143640,
  // 1 Café
  14427686,
  // 2 Rojo
  16347926,
  // 3 Naranja
  15381256,
  // 4 Amarillo
  1483594,
  // 5 Verde
  2450411,
  // 6 Azul
  9647082,
  // 7 Violeta
  6583435,
  // 8 Gris
  16317180
  // 9 Blanco
];
function resistorBandsForOhms(ohms) {
  const safe = Math.max(10, Math.min(99e5, Math.round(ohms || 220)));
  const exp = Math.floor(Math.log10(safe)) - 1;
  const sig = Math.round(safe / Math.pow(10, Math.max(0, exp)));
  const d1 = Math.min(9, Math.max(0, Math.floor(sig / 10)));
  const d2 = Math.min(9, Math.max(0, sig % 10));
  const mult = Math.min(9, Math.max(0, exp));
  return [
    RESISTOR_DIGIT_COLORS[d1],
    RESISTOR_DIGIT_COLORS[d2],
    RESISTOR_DIGIT_COLORS[mult],
    13934599
    // Tolerancia 5% dorado
  ];
}
var COMPONENT_CATALOG = [
  {
    type: "level-shifter",
    category: "Prototipado e Interfaz",
    name: "Level Shifter 4 ch",
    shortDesc: "Conversor l\xF3gico bidireccional 5 V \u2194 3.3 V para proteger m\xF3dulos de 3.3 V.",
    voltageBadge: "5V/3.3V",
    defaultProps: {},
    pins: [
      { id: "HV", label: "HV (5V)", category: "pwr", localPos: [-0.45, 0.2, -0.48] },
      { id: "HV1", label: "HV1", category: "com", localPos: [-0.15, 0.2, -0.48] },
      { id: "HV2", label: "HV2", category: "com", localPos: [0.15, 0.2, -0.48] },
      { id: "GND_H", label: "GND", category: "gnd", localPos: [0.45, 0.2, -0.48] },
      { id: "LV", label: "LV (3.3V)", category: "pwr", localPos: [-0.45, 0.2, 0.48], maxVoltage: 3.6 },
      { id: "LV1", label: "LV1", category: "com", localPos: [-0.15, 0.2, 0.48], maxVoltage: 3.6 },
      { id: "LV2", label: "LV2", category: "com", localPos: [0.15, 0.2, 0.48], maxVoltage: 3.6 },
      { id: "GND_L", label: "GND", category: "gnd", localPos: [0.45, 0.2, 0.48] }
    ]
  },
  {
    type: "resistor",
    category: "Pasivos y B\xE1sicos",
    name: "Resistencia",
    shortDesc: "Valor configurable (\u03A9 / k\u03A9) con c\xF3digo de colores 3D. Encaja en protoboard.",
    voltageBadge: "Pasivo",
    defaultProps: { ohms: 220 },
    pins: [
      { id: "P1", label: "Terminal 1", category: "dig", localPos: [-0.508, 0.08, 0] },
      { id: "P2", label: "Terminal 2", category: "dig", localPos: [0.508, 0.08, 0] }
    ]
  },
  {
    type: "button",
    category: "Pasivos y B\xE1sicos",
    name: "Pulsador t\xE1ctil",
    shortDesc: "Interruptor moment\xE1neo (paso 2 columnas). Haz clic sobre \xE9l para cerrar el circuito.",
    voltageBadge: "Pasivo",
    defaultProps: {},
    pins: [
      { id: "A", label: "Terminal A", category: "dig", localPos: [-0.254, 0.08, 0] },
      { id: "B", label: "Terminal B", category: "dig", localPos: [0.254, 0.08, 0] }
    ]
  },
  {
    type: "potentiometer",
    category: "Pasivos y B\xE1sicos",
    name: "Potenci\xF3metro",
    shortDesc: "Perilla anal\xF3gica con resistencia total configurable (1 k\u03A9\u2013100 k\u03A9).",
    voltageBadge: "5V/3.3V",
    defaultProps: { maxOhms: 1e4 },
    pins: [
      { id: "VCC", label: "VCC", category: "pwr", localPos: [-0.254, 0.14, 0.52] },
      { id: "SIG", label: "SIG (Cursor)", category: "ana", localPos: [0, 0.14, 0.52] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.254, 0.14, 0.52] }
    ]
  },
  {
    type: "led",
    category: "Salidas y Pantallas",
    name: "LED 5 mm",
    shortDesc: "Color configurable (rojo, verde, amarillo, azul, blanco). Encaja en protoboard.",
    voltageBadge: "5V/3.3V",
    defaultProps: { color: "red" },
    pins: [
      { id: "A", label: "\xC1nodo (+)", category: "dig", localPos: [-0.127, 0.08, 0] },
      { id: "K", label: "C\xE1todo (-)", category: "gnd", localPos: [0.127, 0.08, 0] }
    ]
  },
  {
    type: "rgb-led",
    category: "Salidas y Pantallas",
    name: "LED RGB 5 mm (C\xE1todo com\xFAn)",
    shortDesc: "Mezcla millones de colores por PWM en canales R, G y B. Encaja en 4 columnas.",
    voltageBadge: "5V/3.3V",
    defaultProps: {},
    pins: [
      { id: "R", label: "Rojo (R)", category: "dig", localPos: [-0.381, 0.08, 0] },
      { id: "K", label: "C\xE1todo (-)", category: "gnd", localPos: [-0.127, 0.08, 0] },
      { id: "G", label: "Verde (G)", category: "dig", localPos: [0.127, 0.08, 0] },
      { id: "B", label: "Azul (B)", category: "dig", localPos: [0.381, 0.08, 0] }
    ]
  },
  {
    type: "buzzer",
    category: "Salidas y Pantallas",
    name: "Buzzer piezoel\xE9ctrico",
    shortDesc: "Emite pitidos y melod\xEDas reales con tone(pin, frecuencia). Encaja en protoboard.",
    voltageBadge: "5V/3.3V",
    defaultProps: {},
    pins: [
      { id: "SIG", label: "Se\xF1al (+)", category: "dig", localPos: [-0.254, 0.08, 0] },
      { id: "GND", label: "GND (-)", category: "gnd", localPos: [0.254, 0.08, 0] }
    ]
  },
  {
    type: "lcd-i2c",
    category: "Salidas y Pantallas",
    name: "Pantalla LCD 16\xD72 (I\xB2C)",
    shortDesc: "Display de 2 l\xEDneas \xD7 16 caracteres conectado por bus I\xB2C.",
    voltageBadge: "5V",
    defaultProps: { i2cAddr: "0x27" },
    pins: [
      { id: "GND", label: "GND", category: "gnd", localPos: [-0.45, 0.2, 0.95] },
      { id: "VCC", label: "VCC (5V)", category: "pwr", localPos: [-0.15, 0.2, 0.95] },
      { id: "SDA", label: "SDA", category: "com", localPos: [0.15, 0.2, 0.95] },
      { id: "SCL", label: "SCL", category: "com", localPos: [0.45, 0.2, 0.95] }
    ]
  },
  {
    type: "ultrasonic",
    category: "Sensores Kit XL y Geogo",
    name: "Ultras\xF3nico HC-SR04",
    shortDesc: "Mide distancia de 2 cm a 400 cm por eco ultras\xF3nico.",
    voltageBadge: "5V",
    defaultProps: {},
    pins: [
      { id: "VCC", label: "VCC (5V)", category: "pwr", localPos: [-0.38, 0.24, 0.36] },
      { id: "TRIG", label: "TRIG", category: "dig", localPos: [-0.127, 0.24, 0.36] },
      { id: "ECHO", label: "ECHO", category: "dig", localPos: [0.127, 0.24, 0.36] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.38, 0.24, 0.36] }
    ]
  },
  {
    type: "dht11",
    category: "Sensores Kit XL y Geogo",
    name: "Sensor Clima DHT11",
    shortDesc: "Mide temperatura ambiente (\xB0C) y humedad relativa (%) por bus digital de 1 hilo.",
    voltageBadge: "5V/3.3V",
    defaultProps: {},
    pins: [
      { id: "VCC", label: "VCC", category: "pwr", localPos: [-0.254, 0.16, 0.56] },
      { id: "DATA", label: "DATA (Se\xF1al)", category: "dig", localPos: [0, 0.16, 0.56] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.254, 0.16, 0.56] }
    ]
  },
  {
    type: "ldr",
    category: "Sensores Kit XL y Geogo",
    name: "Sensor de Luz (LDR)",
    shortDesc: "Fotorresistencia con salida anal\xF3gica proporcional a la luz.",
    voltageBadge: "5V/3.3V",
    defaultProps: {},
    pins: [
      { id: "VCC", label: "VCC", category: "pwr", localPos: [-0.254, 0.14, 0.46] },
      { id: "AO", label: "AO (Anal\xF3gico)", category: "ana", localPos: [0, 0.14, 0.46] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.254, 0.14, 0.46] }
    ]
  },
  {
    type: "bme280",
    category: "Sensores Kit XL y Geogo",
    name: "Bar\xF3metro BME280 / BMP280",
    shortDesc: "Modelo seleccionable (BME280/BMP280). Presi\xF3n, altitud, temp y humedad (3.3 V).",
    voltageBadge: "3.3V",
    defaultProps: { model: "BME280" },
    pins: [
      { id: "VCC", label: "VCC (3.3V)", category: "pwr", localPos: [-0.38, 0.16, 0.48], maxVoltage: 3.6 },
      { id: "GND", label: "GND", category: "gnd", localPos: [-0.13, 0.16, 0.48] },
      { id: "SCL", label: "SCL (3.3V)", category: "com", localPos: [0.13, 0.16, 0.48], maxVoltage: 3.6 },
      { id: "SDA", label: "SDA (3.3V)", category: "com", localPos: [0.38, 0.16, 0.48], maxVoltage: 3.6 }
    ]
  },
  {
    type: "co2-sensor",
    category: "Sensores Kit XL y Geogo",
    name: "Sensor de CO\u2082 (ppm)",
    shortDesc: "Mide concentraci\xF3n de CO\u2082 (400\u20135000 ppm) para monitoreo ambiental.",
    voltageBadge: "5V",
    defaultProps: {},
    pins: [
      { id: "VCC", label: "VCC (5V)", category: "pwr", localPos: [-0.28, 0.16, 0.62] },
      { id: "AO", label: "AO (ppm)", category: "ana", localPos: [0, 0.16, 0.62] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.28, 0.16, 0.62] }
    ]
  },
  {
    type: "optical-encoder",
    category: "Sensores Kit XL y Geogo",
    name: "Sensor \xD3ptico Rotativo",
    shortDesc: "Encoder de ranura con disco codificado; genera pulsos digitales de RPM.",
    voltageBadge: "5V/3.3V",
    defaultProps: { slots: 20 },
    pins: [
      { id: "VCC", label: "VCC", category: "pwr", localPos: [-0.28, 0.16, 0.52] },
      { id: "DO", label: "DO (Pulsos)", category: "dig", localPos: [0, 0.16, 0.52] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.28, 0.16, 0.52] }
    ]
  },
  {
    type: "rf-pair",
    category: "Sensores Kit XL y Geogo",
    name: "M\xF3dulo Transmisor RF 433 MHz",
    shortDesc: "Transmite tramas de telemetr\xEDa inal\xE1mbrica desde el pin DATA.",
    voltageBadge: "5V/3.3V",
    defaultProps: { freqMhz: 433 },
    pins: [
      { id: "DATA", label: "DATA", category: "com", localPos: [-0.26, 0.16, 0.48] },
      { id: "VCC", label: "VCC", category: "pwr", localPos: [0, 0.16, 0.48] },
      { id: "GND", label: "GND", category: "gnd", localPos: [0.26, 0.16, 0.48] }
    ]
  },
  {
    type: "servo",
    category: "Actuadores",
    name: "Micro Servo SG90",
    shortDesc: "Actuador de precisi\xF3n controlado de 0\xB0 a 180\xB0 mediante <Servo.h>.",
    voltageBadge: "5V",
    defaultProps: {},
    pins: [
      { id: "GND", label: "GND (Caf\xE9)", category: "gnd", localPos: [-1.72, 0.2, 0.25] },
      { id: "VCC", label: "VCC (Rojo)", category: "pwr", localPos: [-1.72, 0.2, 0] },
      { id: "SIG", label: "SIG (Naranja)", category: "ctl", localPos: [-1.72, 0.2, -0.25] }
    ]
  }
];
function getCatalogItem(type) {
  return COMPONENT_CATALOG.find((c) => c.type === type) ?? COMPONENT_CATALOG[0];
}

// src/lab/missions.ts
var MISSIONS = [
  {
    id: "baliza-led",
    title: '1. Baliza de Se\xF1alizaci\xF3n ("Hola, LED")',
    difficulty: "Inicial",
    duration: "5 min",
    boardId: "uno",
    description: "Arma tu primer circuito sobre la protoboard: encaja una resistencia de 220 \u03A9 y un LED rojo, y luego lleva la se\xF1al digital D13 y el retorno a tierra por el riel negativo (-).",
    useBreadboard: true,
    components: [
      {
        uid: "r1",
        type: "resistor",
        position: [1.5, 0.28, -0.87],
        props: { ohms: 220 },
        snapHole: "c8",
        label: "Resistencia 220 \u03A9",
        placementHint: "Protoboard c8\u2013c12 (limita la corriente del LED)"
      },
      {
        uid: "led1",
        type: "led",
        position: [2.5, 0.28, -0.63],
        props: { color: "red" },
        snapHole: "b12",
        label: "LED 5 mm Rojo",
        placementHint: "Protoboard b12\u2013b13 (\xE1nodo en col. 12 junto a R1)"
      }
    ],
    steps: [
      {
        from: "board:D13",
        to: "bb:e8",
        label: "Arduino D13 \u2192 Protoboard e8",
        explanation: "Lleva 5 V al orificio libre e8 (misma columna 8 que la entrada de la resistencia en c8).",
        color: "#2563eb"
      },
      {
        from: "bb:e13",
        to: "bb:top-13",
        label: "Protoboard e13 \u2192 Riel negativo (-) top-13",
        explanation: "Conecta la columna 13 del c\xE1todo del LED (b13) al riel azul negativo (-) de la protoboard.",
        color: "#22201c"
      },
      {
        from: "bb:top-2",
        to: "board:GND_TOP",
        label: "Riel negativo (-) top-2 \u2192 Arduino GND",
        explanation: "Cierra la tierra com\xFAn de toda la fila azul (-) con el pin GND del Arduino.",
        color: "#22201c"
      }
    ],
    learnPoints: [
      "Un pin digital alterna entre 0 V (LOW) y 5 V (HIGH).",
      "Toda protoboard une verticalmente los 5 puntos de una misma columna (a\u2013e).",
      "La resistencia de 220 \u03A9 limita la corriente para proteger el LED en el circuito real."
    ],
    code: `// Misi\xF3n 1: Baliza de se\xF1alizaci\xF3n \u2014 Liceo San Nicol\xE1s
const int PIN_BALIZA = 13;

void setup() {
  pinMode(PIN_BALIZA, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(PIN_BALIZA, HIGH);
  Serial.println("Baliza: ENCENDIDA");
  delay(500);

  digitalWrite(PIN_BALIZA, LOW);
  Serial.println("Baliza: APAGADA");
  delay(500);
}`
  },
  {
    id: "semaforo-peatonal",
    title: "2. Sem\xE1foro Vial de 3 Luces",
    difficulty: "Inicial",
    duration: "8 min",
    boardId: "uno",
    description: "Controla tres LEDs independientes (rojo, amarillo y verde) protegidos por resistencias de 220 \u03A9 y compartiendo el riel negativo com\xFAn (-) de la protoboard.",
    useBreadboard: true,
    components: [
      { uid: "r1", type: "resistor", position: [0.4, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c2", label: "Resistencia 220 \u03A9 (Rojo)", placementHint: "Protoboard c2\u2013c6" },
      { uid: "led1", type: "led", position: [1.1, 0.28, -0.63], props: { color: "red" }, snapHole: "b6", label: "LED Rojo", placementHint: "Protoboard b6\u2013b7" },
      { uid: "r2", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9 (Amarillo)", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led2", type: "led", position: [2.9, 0.28, -0.63], props: { color: "yellow" }, snapHole: "b14", label: "LED Amarillo", placementHint: "Protoboard b14\u2013b15" },
      { uid: "r3", type: "resistor", position: [4.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c18", label: "Resistencia 220 \u03A9 (Verde)", placementHint: "Protoboard c18\u2013c22" },
      { uid: "led3", type: "led", position: [4.9, 0.28, -0.63], props: { color: "green" }, snapHole: "b22", label: "LED Verde", placementHint: "Protoboard b22\u2013b23" }
    ],
    steps: [
      { from: "board:D13", to: "bb:e2", label: "Arduino D13 \u2192 Protoboard e2", explanation: "Se\xF1al para luz roja.", color: "#c8402f" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Se\xF1al para luz amarilla.", color: "#d4a007" },
      { from: "board:D11", to: "bb:e18", label: "Arduino D11 \u2192 Protoboard e18", explanation: "Se\xF1al para luz verde.", color: "#2c7a4b" },
      { from: "bb:e7", to: "bb:top-7", label: "Protoboard e7 \u2192 Riel (-) top-7", explanation: "C\xE1todo rojo a tierra com\xFAn.", color: "#22201c" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo amarillo a tierra com\xFAn.", color: "#22201c" },
      { from: "bb:e23", to: "bb:top-23", label: "Protoboard e23 \u2192 Riel (-) top-23", explanation: "C\xE1todo verde a tierra com\xFAn.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_TOP", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Un solo cable lleva toda la fila negativa a GND.", color: "#22201c" }
    ],
    learnPoints: [
      "El riel negativo (-) permite compartir una sola conexi\xF3n de tierra entre m\xFAltiples LEDs.",
      "Cada LED debe llevar su propia resistencia limitadora en serie."
    ],
    code: `// Misi\xF3n 2: Sem\xE1foro Vial \u2014 Liceo San Nicol\xE1s
const int ROJO = 13;
const int AMARILLO = 12;
const int VERDE = 11;

void setup() {
  pinMode(ROJO, OUTPUT);
  pinMode(AMARILLO, OUTPUT);
  pinMode(VERDE, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(VERDE, HIGH);
  digitalWrite(AMARILLO, LOW);
  digitalWrite(ROJO, LOW);
  Serial.println("Sem\xE1foro: VERDE");
  delay(1200);

  digitalWrite(VERDE, LOW);
  digitalWrite(AMARILLO, HIGH);
  Serial.println("Sem\xE1foro: AMARILLO");
  delay(600);

  digitalWrite(AMARILLO, LOW);
  digitalWrite(ROJO, HIGH);
  Serial.println("Sem\xE1foro: ROJO");
  delay(1200);
}`
  },
  {
    id: "pulsador-led",
    title: "3. Control con Pulsador T\xE1ctil (Entrada Digital)",
    difficulty: "Inicial",
    duration: "7 min",
    boardId: "uno",
    description: "Lee un pulsador encajado en la protoboard con resistencia pull-up interna (INPUT_PULLUP) para encender un LED verde sin usar buzzer.",
    useBreadboard: true,
    components: [
      { uid: "btn1", type: "button", position: [0.6, 0.28, -0.87], snapHole: "c3", label: "Pulsador t\xE1ctil", placementHint: "Protoboard c3\u2013c5 (2 columnas de separaci\xF3n)" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "green" }, snapHole: "b14", label: "LED 5 mm Verde", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:D2", to: "bb:e3", label: "Arduino D2 \u2192 Protoboard e3", explanation: "Conecta el terminal A del pulsador a D2 con INPUT_PULLUP.", color: "#2563eb" },
      { from: "bb:e5", to: "bb:top-5", label: "Protoboard e5 \u2192 Riel (-) top-5", explanation: "El terminal B del pulsador cierra hacia tierra al presionarlo.", color: "#22201c" },
      { from: "board:D8", to: "bb:e10", label: "Arduino D8 \u2192 Protoboard e10", explanation: "Env\xEDa se\xF1al desde D8 hacia la resistencia de 220 \u03A9.", color: "#2c7a4b" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo del LED verde hacia tierra com\xFAn.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_TOP", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Cierra la tierra com\xFAn de la protoboard con Arduino GND.", color: "#22201c" }
    ],
    learnPoints: [
      "Con INPUT_PULLUP el pin lee HIGH en reposo y LOW al presionar el pulsador.",
      "Al hacer clic en el bot\xF3n 3D solo se escucha su clic pl\xE1stico mec\xE1nico, pues no hay buzzer conectado."
    ],
    code: `// Misi\xF3n 3: Control con Pulsador \u2014 Tecnolog\xEDa Geogo
const int PIN_BOTON = 2;
const int PIN_LED = 8;

void setup() {
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(PIN_BOTON) == LOW) {
    digitalWrite(PIN_LED, HIGH);
    Serial.println("Bot\xF3n PRESIONADO -> LED encendido");
  } else {
    digitalWrite(PIN_LED, LOW);
  }
  delay(80);
}`
  },
  {
    id: "acceso-pulsador",
    title: "4. Control de Acceso (Pulsador + LED + Buzzer)",
    difficulty: "Inicial",
    duration: "9 min",
    boardId: "uno",
    description: "A\xF1ade un buzzer piezoel\xE9ctrico sobre la protoboard para confirmar con luz verde y tono audible de 880 Hz cuando se presiona el bot\xF3n de acceso.",
    useBreadboard: true,
    components: [
      { uid: "btn1", type: "button", position: [0.6, 0.28, -0.87], snapHole: "c3", label: "Pulsador t\xE1ctil", placementHint: "Protoboard c3\u2013c5" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "green" }, snapHole: "b14", label: "LED Verde", placementHint: "Protoboard b14\u2013b15" },
      { uid: "buz1", type: "buzzer", position: [4.6, 0.28, -0.87], snapHole: "c20", label: "Buzzer piezoel\xE9ctrico", placementHint: "Protoboard c20\u2013c22 (+ en col. 20, - en col. 22)" }
    ],
    steps: [
      { from: "board:D2", to: "bb:e3", label: "Arduino D2 \u2192 Protoboard e3", explanation: "Lectura del pulsador en D2 (INPUT_PULLUP).", color: "#2563eb" },
      { from: "bb:e5", to: "bb:top-5", label: "Protoboard e5 \u2192 Riel (-) top-5", explanation: "Terminal B del pulsador a tierra.", color: "#22201c" },
      { from: "board:D8", to: "bb:e10", label: "Arduino D8 \u2192 Protoboard e10", explanation: "Salida digital D8 hacia resistencia de 220 \u03A9.", color: "#2c7a4b" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo del LED verde al riel negativo.", color: "#22201c" },
      { from: "board:D9", to: "bb:e20", label: "Arduino D9 \u2192 Protoboard e20", explanation: "Se\xF1al tone() hacia el terminal (+) del buzzer en col. 20.", color: "#d4a007" },
      { from: "bb:e22", to: "bb:top-22", label: "Protoboard e22 \u2192 Riel (-) top-22", explanation: "Terminal (-) del buzzer al riel negativo.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_TOP", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Retorno com\xFAn de todo el circuito hacia GND.", color: "#22201c" }
    ],
    learnPoints: [
      "tone(pin, 880) genera una onda cuadrada de 880 Hz solo si el buzzer est\xE1 cableado al pin y a GND.",
      'Mant\xE9n pulsado el bot\xF3n en el panel "Pru\xE9balo" o haz clic sobre \xE9l en el 3D.'
    ],
    code: `// Misi\xF3n 4: Control de Acceso \u2014 Tecnolog\xEDa Geogo
const int PIN_BOTON = 2;
const int PIN_LED = 8;
const int PIN_BUZZER = 9;

void setup() {
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(PIN_BOTON) == LOW) {
    digitalWrite(PIN_LED, HIGH);
    tone(PIN_BUZZER, 880);
    Serial.println("ACCESO AUTORIZADO");
  } else {
    digitalWrite(PIN_LED, LOW);
    noTone(PIN_BUZZER);
  }
  delay(80);
}`
  },
  {
    id: "brillo-pwm",
    title: "5. Regulador de Brillo PWM con Potenci\xF3metro",
    difficulty: "Inicial",
    duration: "8 min",
    boardId: "uno",
    description: "Mide el giro de un potenci\xF3metro en A0 (0\u20131023) y usa analogWrite() en el pin PWM ~D9 para regular gradualmente la intensidad de un LED azul.",
    useBreadboard: true,
    components: [
      { uid: "pot1", type: "potentiometer", position: [1, 0, -3.5], label: "Potenci\xF3metro 10 k\u03A9", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "blue" }, snapHole: "b14", label: "LED Azul", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energiza el riel positivo superior a 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Energiza el riel negativo com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:pot1:VCC", label: "Riel (+) top+4 \u2192 Potenci\xF3metro VCC", explanation: "Extremo positivo del divisor resistivo.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:pot1:GND", label: "Riel (-) top-4 \u2192 Potenci\xF3metro GND", explanation: "Extremo negativo.", color: "#22201c" },
      { from: "board:A0", to: "comp:pot1:SIG", label: "Arduino A0 \u2192 Potenci\xF3metro SIG", explanation: "Voltaje variable 0\u20135 V le\xEDdo por el ADC.", color: "#2c7a4b" },
      { from: "board:D9", to: "bb:e10", label: "Arduino ~D9 \u2192 Protoboard e10", explanation: "Salida PWM (~D9) hacia la resistencia.", color: "#d4a007" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo del LED azul al riel negativo.", color: "#22201c" }
    ],
    learnPoints: [
      "El ADC lee de 0 a 1023, mientras analogWrite() acepta valores PWM de 0 a 255.",
      "Solo los pines marcados con ~ (3, 5, 6, 9, 10, 11) soportan PWM por hardware en Uno."
    ],
    code: `// Misi\xF3n 5: Regulador de brillo PWM \u2014 Liceo San Nicol\xE1s
const int PIN_POT = A0;
const int PIN_LED = 9;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(PIN_POT);
  int pwm = map(lectura, 0, 1023, 0, 255);
  analogWrite(PIN_LED, pwm);

  Serial.print("ADC: ");
  Serial.print(lectura);
  Serial.print(" -> PWM: ");
  Serial.println(pwm);
  delay(120);
}`
  },
  {
    id: "mezcla-rgb",
    title: "6. Baliza RGB Multicolor (PWM 3 Canales)",
    difficulty: "Inicial",
    duration: "10 min",
    boardId: "uno",
    description: "Conecta un LED RGB de c\xE1todo com\xFAn con 3 resistencias de 220 \u03A9 dispuestas en paralelo por columna y mezcla colores primarios con ~D9, ~D10 y ~D11.",
    useBreadboard: true,
    components: [
      { uid: "rgb1", type: "rgb-led", position: [2.8, 0.28, -0.63], snapHole: "b14", label: "LED RGB 5 mm", placementHint: "Protoboard b14\u2013b17 (R=14, K=15, G=16, B=17)" },
      { uid: "r1", type: "resistor", position: [1.8, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9 (Canal R)", placementHint: "Protoboard c10\u2013c14" },
      { uid: "r2", type: "resistor", position: [3.2, 0.28, -1.1], props: { ohms: 220 }, snapHole: "d16", label: "Resistencia 220 \u03A9 (Canal G)", placementHint: "Protoboard d16\u2013d20" },
      { uid: "r3", type: "resistor", position: [3.6, 0.28, -0.39], props: { ohms: 220 }, snapHole: "a17", label: "Resistencia 220 \u03A9 (Canal B)", placementHint: "Protoboard a17\u2013a21" }
    ],
    steps: [
      { from: "board:D9", to: "bb:e10", label: "Arduino ~D9 \u2192 Protoboard e10", explanation: "Canal Rojo del LED RGB a trav\xE9s de R1.", color: "#c8402f" },
      { from: "board:D10", to: "bb:e20", label: "Arduino ~D10 \u2192 Protoboard e20", explanation: "Canal Verde del LED RGB a trav\xE9s de R2.", color: "#2c7a4b" },
      { from: "board:D11", to: "bb:e21", label: "Arduino ~D11 \u2192 Protoboard e21", explanation: "Canal Azul del LED RGB a trav\xE9s de R3.", color: "#2563eb" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo com\xFAn (K) del LED RGB a tierra.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_TOP", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Retorno com\xFAn hacia Arduino GND.", color: "#22201c" }
    ],
    learnPoints: [
      "Un LED RGB combina tres diodos internos (Rojo, Verde, Azul) en un mismo encapsulado difuso.",
      "Combinando PWM en R+G obtenemos amarillo; G+B cian; R+B magenta."
    ],
    code: `// Misi\xF3n 6: Mezcla RGB \u2014 Liceo San Nicol\xE1s
const int R_PIN = 9;
const int G_PIN = 10;
const int B_PIN = 11;

void setColor(int r, int g, int b) {
  analogWrite(R_PIN, r);
  analogWrite(G_PIN, g);
  analogWrite(B_PIN, b);
}

void setup() {
  pinMode(R_PIN, OUTPUT);
  pinMode(G_PIN, OUTPUT);
  pinMode(B_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  setColor(255, 40, 0);
  Serial.println("Color: Rojo / Ambar");
  delay(700);
  setColor(0, 220, 120);
  Serial.println("Color: Cian Geogo");
  delay(700);
  setColor(180, 0, 255);
  Serial.println("Color: Violeta");
  delay(700);
}`
  },
  {
    id: "alarma-melodia",
    title: "7. Sirena y Melod\xEDa T\xE1ctica (Pulsador + Buzzer)",
    difficulty: "Intermedio",
    duration: "10 min",
    boardId: "uno",
    description: "Construye una sirena t\xE1ctil activada por bot\xF3n que ejecuta una secuencia de tonos musicales con tone(pin, frecuencia, duraci\xF3n) y luz amarilla sincronizada.",
    useBreadboard: true,
    components: [
      { uid: "btn1", type: "button", position: [0.6, 0.28, -0.87], snapHole: "c3", label: "Pulsador t\xE1ctil", placementHint: "Protoboard c3\u2013c5" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "yellow" }, snapHole: "b14", label: "LED Amarillo", placementHint: "Protoboard b14\u2013b15" },
      { uid: "buz1", type: "buzzer", position: [4.6, 0.28, -0.87], snapHole: "c20", label: "Buzzer piezoel\xE9ctrico", placementHint: "Protoboard c20\u2013c22" }
    ],
    steps: [
      { from: "board:D2", to: "bb:e3", label: "Arduino D2 \u2192 Protoboard e3", explanation: "Entrada de disparo con pulsador.", color: "#2563eb" },
      { from: "bb:e5", to: "bb:top-5", label: "Protoboard e5 \u2192 Riel (-) top-5", explanation: "Retorno del bot\xF3n al riel negativo.", color: "#22201c" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Se\xF1al luminosa hacia el LED amarillo.", color: "#d4a007" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" },
      { from: "board:D9", to: "bb:e20", label: "Arduino D9 \u2192 Protoboard e20", explanation: "Salida de audio para el buzzer.", color: "#7a4fb3" },
      { from: "bb:e22", to: "bb:top-22", label: "Protoboard e22 \u2192 Riel (-) top-22", explanation: "Terminal negativo del buzzer.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_TOP", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Tierra general.", color: "#22201c" }
    ],
    learnPoints: [
      "tone(pin, freq, duracion) permite definir la duraci\xF3n exacta de cada nota musical.",
      "Los ciclos for() simplifican reproducir arreglos completos de frecuencias."
    ],
    code: `// Misi\xF3n 7: Sirena T\xE1ctica \u2014 \xC1rea Premilitar
const int BTN = 2;
const int LED = 12;
const int BUZ = 9;
int notas[] = { 523, 659, 784, 1046 };

void setup() {
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(BTN) == LOW) {
    Serial.println("Activando secuencia sonora...");
    for (int i = 0; i < 4; i++) {
      digitalWrite(LED, HIGH);
      tone(BUZ, notas[i], 140);
      delay(160);
      digitalWrite(LED, LOW);
      delay(40);
    }
    noTone(BUZ);
  }
  delay(60);
}`
  },
  {
    id: "luz-nocturna-ldr",
    title: "8. Alumbrado Autom\xE1tico Nocturno (Sensor LDR)",
    difficulty: "Intermedio",
    duration: "10 min",
    boardId: "uno",
    description: "Usa una fotorresistencia (LDR) en A0 para medir la luz ambiental y encender autom\xE1ticamente un LED blanco cuando oscurece bajo el umbral configurado.",
    useBreadboard: true,
    components: [
      { uid: "ldr1", type: "ldr", position: [1.2, 0, -3.5], label: "Sensor de Luz (LDR)", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "white" }, snapHole: "b14", label: "LED Blanco", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Alimenta la barra positiva de 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Conecta la barra negativa com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:ldr1:VCC", label: "Riel (+) top+4 \u2192 LDR VCC", explanation: "Alimenta el m\xF3dulo LDR.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:ldr1:GND", label: "Riel (-) top-4 \u2192 LDR GND", explanation: "Masa del m\xF3dulo LDR.", color: "#22201c" },
      { from: "board:A0", to: "comp:ldr1:AO", label: "Arduino A0 \u2192 LDR AO", explanation: "Se\xF1al anal\xF3gica proporcional a la luz.", color: "#2c7a4b" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Control de encendido del foco blanco.", color: "#2563eb" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo del LED a tierra.", color: "#22201c" }
    ],
    learnPoints: [
      "Un umbral con hist\xE9resis o comparaci\xF3n directa permite automatizar luminarias sin intervenci\xF3n manual.",
      'Prueba bajar la luminosidad por debajo de 40 % en el control flotante "Pru\xE9balo".'
    ],
    code: `// Misi\xF3n 8: Alumbrado Nocturno con LDR \u2014 Liceo San Nicol\xE1s
const int PIN_LDR = A0;
const int PIN_FOCO = 12;

void setup() {
  pinMode(PIN_FOCO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int luz = analogRead(PIN_LDR);
  Serial.print("Nivel luz (0-1023): ");
  Serial.println(luz);

  if (luz < 420) {
    digitalWrite(PIN_FOCO, HIGH);
  } else {
    digitalWrite(PIN_FOCO, LOW);
  }
  delay(200);
}`
  },
  {
    id: "perimetro-ultrasonico",
    title: "9. Per\xEDmetro Ultras\xF3nico de Seguridad (HC-SR04)",
    difficulty: "Intermedio",
    duration: "12 min",
    boardId: "uno",
    description: "Detecta intrusiones a menos de 30 cm mediante pulsos ultras\xF3nicos HC-SR04 y dispara una alarma visual (LED rojo) y ac\xFAstica (buzzer) sobre la protoboard.",
    useBreadboard: true,
    components: [
      { uid: "us1", type: "ultrasonic", position: [1.5, 0, -3.5], label: "Sensor Ultras\xF3nico HC-SR04", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "red" }, snapHole: "b14", label: "LED Rojo", placementHint: "Protoboard b14\u2013b15" },
      { uid: "buz1", type: "buzzer", position: [4.6, 0.28, -0.87], snapHole: "c20", label: "Buzzer piezoel\xE9ctrico", placementHint: "Protoboard c20\u2013c22" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energiza el riel positivo de la protoboard.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Tierra com\xFAn del sistema.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:us1:VCC", label: "Riel (+) top+4 \u2192 HC-SR04 VCC", explanation: "Alimenta el m\xF3dulo ultras\xF3nico a 5 V.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:us1:GND", label: "Riel (-) top-4 \u2192 HC-SR04 GND", explanation: "Masa del HC-SR04.", color: "#22201c" },
      { from: "board:D6", to: "comp:us1:TRIG", label: "Arduino D6 \u2192 TRIG", explanation: "Dispara el pulso de 10 \xB5s.", color: "#2563eb" },
      { from: "board:D7", to: "comp:us1:ECHO", label: "Arduino D7 \u2192 ECHO", explanation: "Mide el tiempo de retorno del eco.", color: "#2c7a4b" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Activa LED rojo de alerta.", color: "#d4a007" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" },
      { from: "board:D9", to: "bb:e20", label: "Arduino D9 \u2192 Protoboard e20", explanation: "Alarma sonora en el buzzer.", color: "#7a4fb3" },
      { from: "bb:e22", to: "bb:top-22", label: "Protoboard e22 \u2192 Riel (-) top-22", explanation: "Retorno del buzzer a tierra.", color: "#22201c" }
    ],
    learnPoints: [
      "La f\xF3rmula distancia = duracion * 0.034 / 2 convierte el tiempo ida/vuelta del sonido a cent\xEDmetros.",
      'Acerca el deslizador de distancia bajo 30 cm en el widget "Pru\xE9balo" para activar la alarma.'
    ],
    code: `// Misi\xF3n 9: Per\xEDmetro Ultras\xF3nico \u2014 \xC1rea Premilitar
const int TRIG = 6;
const int ECHO = 7;
const int LED_ALERTA = 12;
const int BUZZER = 9;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_ALERTA, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracion = pulseIn(ECHO, HIGH);
  int distancia = duracion * 0.034 / 2;

  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.println(" cm");

  if (distancia > 0 && distancia < 30) {
    digitalWrite(LED_ALERTA, HIGH);
    tone(BUZZER, 1000);
  } else {
    digitalWrite(LED_ALERTA, LOW);
    noTone(BUZZER);
  }
  delay(150);
}`
  },
  {
    id: "barrera-servo",
    title: "10. Barrera de Control con Micro Servo SG90",
    difficulty: "Intermedio",
    duration: "10 min",
    boardId: "uno",
    description: "Controla con precisi\xF3n el \xE1ngulo de una barrera (0\xB0 a 180\xB0) mediante un potenci\xF3metro en A0 usando los rieles de alimentaci\xF3n de la protoboard.",
    useBreadboard: true,
    components: [
      { uid: "pot1", type: "potentiometer", position: [1.2, 0, 3.6], label: "Potenci\xF3metro 10 k\u03A9", placementHint: "Mesa inferior frente a la protoboard" },
      { uid: "srv1", type: "servo", position: [4.6, 0, 3.6], label: "Micro Servo SG90", placementHint: "Mesa inferior derecha" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Alimenta la barra positiva a 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Cierra la masa com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:pot1:VCC", label: "Riel (+) top+4 \u2192 Potenci\xF3metro VCC", explanation: "Extremo positivo del potenci\xF3metro.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:pot1:GND", label: "Riel (-) top-4 \u2192 Potenci\xF3metro GND", explanation: "Extremo negativo.", color: "#22201c" },
      { from: "board:A0", to: "comp:pot1:SIG", label: "Arduino A0 \u2192 Potenci\xF3metro SIG", explanation: "Lectura anal\xF3gica 0\u20131023.", color: "#2c7a4b" },
      { from: "bb:top+8", to: "comp:srv1:VCC", label: "Riel (+) top+8 \u2192 Servo VCC", explanation: "Alimentaci\xF3n del motor servo.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:srv1:GND", label: "Riel (-) top-8 \u2192 Servo GND", explanation: "Masa com\xFAn del servo.", color: "#22201c" },
      { from: "board:D9", to: "comp:srv1:SIG", label: "Arduino ~D9 \u2192 Servo SIG", explanation: "Se\xF1al PWM de \xE1ngulo.", color: "#d4a007" }
    ],
    learnPoints: [
      "map(lectura, 0, 1023, 0, 180) escala el ADC al rango mec\xE1nico del servo SG90.",
      "En montajes con varios servos de alta carga, recuerda usar una fuente externa compartiendo GND."
    ],
    code: `// Misi\xF3n 10: Barrera con Micro Servo SG90
#include <Servo.h>

Servo barrera;

void setup() {
  barrera.attach(9);
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(A0);
  int angulo = map(lectura, 0, 1023, 0, 180);
  barrera.write(angulo);

  Serial.print("Angulo barrera: ");
  Serial.println(angulo);
  delay(100);
}`
  },
  {
    id: "peaje-automatico",
    title: "11. Peaje Autom\xE1tico (HC-SR04 + Servo + LED)",
    difficulty: "Intermedio",
    duration: "14 min",
    boardId: "uno",
    description: "Cuando un veh\xEDculo se acerca a menos de 25 cm del sensor ultras\xF3nico, el servo levanta la barrera a 90\xB0 y enciende el LED verde de paso.",
    useBreadboard: true,
    components: [
      { uid: "us1", type: "ultrasonic", position: [1.5, 0, -3.5], label: "Sensor HC-SR04", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "srv1", type: "servo", position: [4.6, 0, 3.6], label: "Micro Servo SG90", placementHint: "Mesa inferior derecha" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "green" }, snapHole: "b14", label: "LED Verde", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energ\xEDa principal 5 V en protoboard.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Tierra com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:us1:VCC", label: "Riel (+) top+4 \u2192 HC-SR04 VCC", explanation: "Alimentaci\xF3n sensor.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:us1:GND", label: "Riel (-) top-4 \u2192 HC-SR04 GND", explanation: "Tierra sensor.", color: "#22201c" },
      { from: "board:D6", to: "comp:us1:TRIG", label: "Arduino D6 \u2192 TRIG", explanation: "Pulso de disparo.", color: "#2563eb" },
      { from: "board:D7", to: "comp:us1:ECHO", label: "Arduino D7 \u2192 ECHO", explanation: "Lectura de eco.", color: "#2c7a4b" },
      { from: "bb:top+8", to: "comp:srv1:VCC", label: "Riel (+) top+8 \u2192 Servo VCC", explanation: "Alimentaci\xF3n barrera.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:srv1:GND", label: "Riel (-) top-8 \u2192 Servo GND", explanation: "Tierra barrera.", color: "#22201c" },
      { from: "board:D9", to: "comp:srv1:SIG", label: "Arduino ~D9 \u2192 Servo SIG", explanation: "Control de apertura.", color: "#d4a007" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Indicador LED verde.", color: "#2c7a4b" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "Retorno LED a GND.", color: "#22201c" }
    ],
    learnPoints: [
      "Integra percepci\xF3n ultras\xF3nica con actuaci\xF3n mec\xE1nica automatizada.",
      "Observa las ondas verdes sobre el HC-SR04 y el giro de la barrera al bajar de 25 cm."
    ],
    code: `// Misi\xF3n 11: Peaje Autom\xE1tico \u2014 Liceo San Nicol\xE1s
#include <Servo.h>
Servo barrera;

const int TRIG = 6;
const int ECHO = 7;
const int LED_PASO = 12;

void setup() {
  barrera.attach(9);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_PASO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  int dist = pulseIn(ECHO, HIGH) * 0.034 / 2;

  if (dist > 0 && dist < 25) {
    barrera.write(95);
    digitalWrite(LED_PASO, HIGH);
    Serial.println("Peaje ABIERTO");
  } else {
    barrera.write(5);
    digitalWrite(LED_PASO, LOW);
  }
  delay(150);
}`
  },
  {
    id: "monitor-dht11",
    title: "12. Monitor de Clima con Sensor DHT11",
    difficulty: "Intermedio",
    duration: "10 min",
    boardId: "uno",
    description: "Mide temperatura y humedad relativa del aula usando el sensor digital DHT11 del Kit XL y enciende un LED naranja si supera 28 \xB0C.",
    useBreadboard: true,
    components: [
      { uid: "dht1", type: "dht11", position: [1.5, 0, -3.5], label: "Sensor Clima DHT11", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "orange" }, snapHole: "b14", label: "LED Naranja", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energiza el riel positivo.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Energiza el riel negativo.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:dht1:VCC", label: "Riel (+) top+4 \u2192 DHT11 VCC", explanation: "Alimentaci\xF3n 5 V al DHT11.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:dht1:GND", label: "Riel (-) top-4 \u2192 DHT11 GND", explanation: "Masa del DHT11.", color: "#22201c" },
      { from: "board:D4", to: "comp:dht1:DATA", label: "Arduino D4 \u2192 DHT11 DATA", explanation: "Bus digital de temperatura y humedad.", color: "#2563eb" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "Salida hacia el LED de alerta t\xE9rmica.", color: "#d4a007" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" }
    ],
    learnPoints: [
      "DHT11 transmite temperatura y humedad calibradas de f\xE1brica por un \xFAnico cable DATA.",
      'Ajusta la temperatura sobre 28 \xB0C en "Pru\xE9balo" para disparar el aviso t\xE9rmico.'
    ],
    code: `// Misi\xF3n 12: Monitor de Clima DHT11 \u2014 Kit XL
#include <DHT.h>

DHT dht(4, DHT11);
const int LED_CALOR = 12;

void setup() {
  dht.begin();
  pinMode(LED_CALOR, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  Serial.print("Temp: ");
  Serial.print(t);
  Serial.print(" C | Humedad: ");
  Serial.print(h);
  Serial.println(" %");

  digitalWrite(LED_CALOR, t >= 28.0 ? HIGH : LOW);
  delay(400);
}`
  },
  {
    id: "tablero-lcd-voltaje",
    title: "13. Volt\xEDmetro Digital en Pantalla LCD 16\xD72 (I\xB2C)",
    difficulty: "Intermedio",
    duration: "12 min",
    boardId: "uno",
    description: "Convierte la lectura ADC (0\u20131023) de un potenci\xF3metro a voltios reales (0.00\u20135.00 V) y mu\xE9stralos en vivo sobre la pantalla LCD 16\xD72 por bus I\xB2C.",
    useBreadboard: true,
    components: [
      { uid: "pot1", type: "potentiometer", position: [1.2, 0, -3.5], label: "Potenci\xF3metro 10 k\u03A9", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "lcd1", type: "lcd-i2c", position: [4, 0, 3.8], label: "Pantalla LCD 16\xD72 I\xB2C", placementHint: "Mesa inferior derecha" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Barra de 5 V compartida.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Barra de tierra compartida.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:pot1:VCC", label: "Riel (+) top+4 \u2192 Potenci\xF3metro VCC", explanation: "Referencia 5 V.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:pot1:GND", label: "Riel (-) top-4 \u2192 Potenci\xF3metro GND", explanation: "Referencia 0 V.", color: "#22201c" },
      { from: "board:A0", to: "comp:pot1:SIG", label: "Arduino A0 \u2192 Potenci\xF3metro SIG", explanation: "Entrada anal\xF3gica.", color: "#2c7a4b" },
      { from: "bb:top+8", to: "comp:lcd1:VCC", label: "Riel (+) top+8 \u2192 LCD VCC", explanation: "Alimentaci\xF3n 5 V del display.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:lcd1:GND", label: "Riel (-) top-8 \u2192 LCD GND", explanation: "Masa del display.", color: "#22201c" },
      { from: "board:SDA", to: "comp:lcd1:SDA", label: "Arduino SDA \u2192 LCD SDA", explanation: "Datos del bus I\xB2C.", color: "#2563eb" },
      { from: "board:SCL", to: "comp:lcd1:SCL", label: "Arduino SCL \u2192 LCD SCL", explanation: "Reloj del bus I\xB2C.", color: "#7a4fb3" }
    ],
    learnPoints: [
      "El bus I\xB2C controla una pantalla de 16\xD72 caracteres usando solo dos pines de datos (SDA y SCL).",
      "voltaje = lectura * (5.0 / 1023.0) transforma la escala entera de 10 bits a voltios."
    ],
    code: `// Misi\xF3n 13: Volt\xEDmetro Digital LCD I2C
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  float volt = raw * (5.0 / 1023.0);

  lcd.setCursor(0, 0);
  lcd.print("Voltimetro Geogo");
  lcd.setCursor(0, 1);
  lcd.print("V:" + String(volt, 2) + "V ADC:" + String(raw));
  Serial.println("Voltaje: " + String(volt, 2) + " V");
  delay(200);
}`
  },
  {
    id: "alerta-co2-lcd",
    title: "14. Monitor de CO\u2082 con Alarma y Pantalla LCD",
    difficulty: "Avanzado",
    duration: "15 min",
    boardId: "uno",
    description: "Mide la concentraci\xF3n ambiental de CO\u2082 (ppm), muestra el estado de ventilaci\xF3n en el LCD 16\xD72 y dispara alerta visual y sonora sobre 1200 ppm.",
    useBreadboard: true,
    components: [
      { uid: "co2_1", type: "co2-sensor", position: [1.2, 0, -3.5], label: "Sensor CO\u2082 (ppm)", placementHint: "Mesa superior izquierda" },
      { uid: "lcd1", type: "lcd-i2c", position: [4.2, 0, 3.8], label: "Pantalla LCD 16\xD72 I\xB2C", placementHint: "Mesa inferior derecha" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "red" }, snapHole: "b14", label: "LED Alarma Rojo", placementHint: "Protoboard b14\u2013b15" },
      { uid: "buz1", type: "buzzer", position: [4.6, 0.28, -0.87], snapHole: "c20", label: "Buzzer piezoel\xE9ctrico", placementHint: "Protoboard c20\u2013c22" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energ\xEDa general de 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Masa com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:co2_1:VCC", label: "Riel (+) top+4 \u2192 CO\u2082 VCC", explanation: "Calefactor/sensor CO\u2082 a 5 V.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:co2_1:GND", label: "Riel (-) top-4 \u2192 CO\u2082 GND", explanation: "Tierra sensor CO\u2082.", color: "#22201c" },
      { from: "board:A1", to: "comp:co2_1:AO", label: "Arduino A1 \u2192 CO\u2082 AO", explanation: "Lectura anal\xF3gica proporcional a ppm.", color: "#2c7a4b" },
      { from: "bb:top+8", to: "comp:lcd1:VCC", label: "Riel (+) top+8 \u2192 LCD VCC", explanation: "Alimentaci\xF3n LCD.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:lcd1:GND", label: "Riel (-) top-8 \u2192 LCD GND", explanation: "Masa LCD.", color: "#22201c" },
      { from: "board:SDA", to: "comp:lcd1:SDA", label: "Arduino SDA \u2192 LCD SDA", explanation: "Bus I\xB2C datos.", color: "#2563eb" },
      { from: "board:SCL", to: "comp:lcd1:SCL", label: "Arduino SCL \u2192 LCD SCL", explanation: "Bus I\xB2C reloj.", color: "#7a4fb3" },
      { from: "board:D12", to: "bb:e10", label: "Arduino D12 \u2192 Protoboard e10", explanation: "LED rojo de ventilaci\xF3n.", color: "#c8402f" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" },
      { from: "board:D9", to: "bb:e20", label: "Arduino D9 \u2192 Protoboard e20", explanation: "Alerta ac\xFAstica en el buzzer.", color: "#d4a007" },
      { from: "bb:e22", to: "bb:top-22", label: "Protoboard e22 \u2192 Riel (-) top-22", explanation: "Tierra buzzer.", color: "#22201c" }
    ],
    learnPoints: [
      "Por encima de 1200 ppm en una sala cerrada conviene activar ventilaci\xF3n.",
      'Revisa en la tabla del LCD c\xF3mo cambia de "AIRE OPTIMO" a "VENTILAR SALA".'
    ],
    code: `// Misi\xF3n 14: Monitor Ambiental de CO2 \u2014 Tecnolog\xEDa Geogo
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
const int PIN_CO2 = A1;
const int LED_ROJO = 12;
const int BUZ = 9;

void setup() {
  lcd.init();
  lcd.backlight();
  pinMode(LED_ROJO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(PIN_CO2);
  int ppm = map(raw, 0, 1023, 400, 3000);

  lcd.setCursor(0, 0);
  lcd.print("CO2: " + String(ppm) + " ppm");
  lcd.setCursor(0, 1);
  if (ppm >= 1200) {
    lcd.print("VENTILAR SALA!  ");
    digitalWrite(LED_ROJO, HIGH);
    tone(BUZ, 920);
  } else {
    lcd.print("AIRE OPTIMO     ");
    digitalWrite(LED_ROJO, LOW);
    noTone(BUZ);
  }
  Serial.println("CO2: " + String(ppm) + " ppm");
  delay(250);
}`
  },
  {
    id: "tacometro-optico",
    title: "15. Tac\xF3metro \xD3ptico Rotativo (Interrupci\xF3n INT0)",
    difficulty: "Avanzado",
    duration: "14 min",
    boardId: "uno",
    description: "Cuenta los pulsos del encoder \xF3ptico rotativo usando attachInterrupt() en el pin D2 (INT0) y visualiza las RPM estimadas en el display LCD I\xB2C.",
    useBreadboard: true,
    components: [
      { uid: "opt1", type: "optical-encoder", position: [1.2, 0, -3.5], label: "Sensor \xD3ptico Rotativo", placementHint: "Mesa superior sobre la protoboard" },
      { uid: "lcd1", type: "lcd-i2c", position: [4.2, 0, 3.8], label: "Pantalla LCD 16\xD72 I\xB2C", placementHint: "Mesa inferior derecha" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energ\xEDa principal 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Masa com\xFAn.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:opt1:VCC", label: "Riel (+) top+4 \u2192 Encoder VCC", explanation: "Alimenta el emisor infrarrojo.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:opt1:GND", label: "Riel (-) top-4 \u2192 Encoder GND", explanation: "Tierra del encoder.", color: "#22201c" },
      { from: "board:D2", to: "comp:opt1:DO", label: "Arduino D2 (INT0) \u2192 Encoder DO", explanation: "Pin de interrupci\xF3n r\xE1pida.", color: "#2563eb" },
      { from: "bb:top+8", to: "comp:lcd1:VCC", label: "Riel (+) top+8 \u2192 LCD VCC", explanation: "Alimenta la pantalla.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:lcd1:GND", label: "Riel (-) top-8 \u2192 LCD GND", explanation: "Tierra pantalla.", color: "#22201c" },
      { from: "board:SDA", to: "comp:lcd1:SDA", label: "Arduino SDA \u2192 LCD SDA", explanation: "Datos I\xB2C.", color: "#2c7a4b" },
      { from: "board:SCL", to: "comp:lcd1:SCL", label: "Arduino SCL \u2192 LCD SCL", explanation: "Reloj I\xB2C.", color: "#7a4fb3" }
    ],
    learnPoints: [
      "Las interrupciones por hardware (D2/D3 en Uno) capturan pulsos r\xE1pidos sin perder cuentas durante delay().",
      'Ajusta las RPM del disco ranurado en "Pru\xE9balo" y observa girar el disco 3D.'
    ],
    code: `// Misi\xF3n 15: Tac\xF3metro \xD3ptico \u2014 Tecnolog\xEDa Geogo
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
int pulsos = 0;

void contarPulso() {
  pulsos++;
}

void setup() {
  lcd.init();
  lcd.backlight();
  pinMode(2, INPUT);
  attachInterrupt(digitalPinToInterrupt(2), contarPulso, RISING);
  Serial.begin(9600);
}

void loop() {
  pulsos = 0;
  delay(400);
  int rpm = pulsos * 45;
  lcd.setCursor(0, 0);
  lcd.print("Tacometro Geogo ");
  lcd.setCursor(0, 1);
  lcd.print("Pulsos:" + String(pulsos) + " ~" + String(rpm) + "RPM");
  Serial.println("Pulsos ventana: " + String(pulsos));
}`
  },
  {
    id: "estacion-bme280",
    title: "16. Estaci\xF3n Geogo BME280 (Level Shifter + LCD)",
    difficulty: "Avanzado",
    duration: "18 min",
    boardId: "uno",
    description: "Protege el bar\xF3metro BME280 (3.3 V) conect\xE1ndolo al Arduino Uno (5 V) mediante el Level Shifter bidireccional 4 ch y muestra presi\xF3n y altitud en el LCD 16\xD72.",
    useBreadboard: true,
    components: [
      { uid: "lvl1", type: "level-shifter", position: [1.4, 0, -3.5], label: "Level Shifter 4 ch", placementHint: "Mesa superior izquierda (puente 5V \u2194 3.3V)" },
      { uid: "bme1", type: "bme280", position: [4.2, 0, -3.5], props: { model: "BME280" }, label: "Bar\xF3metro BME280 (3.3 V)", placementHint: "Mesa superior derecha" },
      { uid: "lcd1", type: "lcd-i2c", position: [3.4, 0, 3.8], label: "Pantalla LCD 16\xD72 I\xB2C", placementHint: "Mesa inferior derecha" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Uno 5V \u2192 Riel (+) top+2", explanation: "Barra de 5 V para el lado alto (HV) y LCD.", color: "#c8402f" },
      { from: "board:GND_1", to: "bb:top-2", label: "Uno GND \u2192 Riel (-) top-2", explanation: "Tierra com\xFAn de todo el sistema.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:lvl1:HV", label: "Riel (+) top+4 \u2192 Level Shifter HV", explanation: "Referencia de 5 V.", color: "#c8402f" },
      { from: "board:3V3", to: "comp:lvl1:LV", label: "Uno 3.3V \u2192 Level Shifter LV", explanation: "Referencia de 3.3 V.", color: "#d4a007" },
      { from: "bb:top-4", to: "comp:lvl1:GND_H", label: "Riel (-) top-4 \u2192 Level Shifter GND", explanation: "Masa del conversor.", color: "#22201c" },
      { from: "board:A4", to: "comp:lvl1:HV1", label: "Uno A4 (SDA 5V) \u2192 HV1", explanation: "L\xEDnea SDA lado 5 V.", color: "#2563eb" },
      { from: "board:A5", to: "comp:lvl1:HV2", label: "Uno A5 (SCL 5V) \u2192 HV2", explanation: "L\xEDnea SCL lado 5 V.", color: "#7a4fb3" },
      { from: "comp:lvl1:LV", to: "comp:bme1:VCC", label: "Level Shifter LV (3.3V) \u2192 BME280 VCC", explanation: "Alimenta el BME280 a 3.3 V seguros.", color: "#d4a007" },
      { from: "comp:lvl1:GND_L", to: "comp:bme1:GND", label: "Level Shifter GND \u2192 BME280 GND", explanation: "Masa com\xFAn del sensor.", color: "#22201c" },
      { from: "comp:lvl1:LV1", to: "comp:bme1:SDA", label: "LV1 (3.3V) \u2192 BME280 SDA", explanation: "SDA ya convertido a 3.3 V.", color: "#2563eb" },
      { from: "comp:lvl1:LV2", to: "comp:bme1:SCL", label: "LV2 (3.3V) \u2192 BME280 SCL", explanation: "SCL ya convertido a 3.3 V.", color: "#7a4fb3" },
      { from: "bb:top+8", to: "comp:lcd1:VCC", label: "Riel (+) top+8 \u2192 LCD VCC", explanation: "Alimenta el LCD (trabaja a 5 V).", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:lcd1:GND", label: "Riel (-) top-8 \u2192 LCD GND", explanation: "Masa del LCD.", color: "#22201c" },
      { from: "board:SDA", to: "comp:lcd1:SDA", label: "Uno SDA \u2192 LCD SDA", explanation: "Bus I\xB2C 5 V directo al LCD.", color: "#2563eb" },
      { from: "board:SCL", to: "comp:lcd1:SCL", label: "Uno SCL \u2192 LCD SCL", explanation: "Reloj I\xB2C 5 V directo al LCD.", color: "#7a4fb3" }
    ],
    learnPoints: [
      "El Level Shifter protege los pines SDA/SCL del BME280 bajando las se\xF1ales de 5 V a 3.3 V.",
      'Cambia la presi\xF3n atmosf\xE9rica en "Pru\xE9balo" para calcular la altitud barom\xE9trica en vivo.'
    ],
    code: `// Misi\xF3n 16: Estaci\xF3n Geogo BME280 + Level Shifter + LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_BME280.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_BME280 bme;

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  bme.begin(0x76);
}

void loop() {
  float temp = bme.readTemperature();
  float presion = bme.readPressure() / 100.0;
  float altitud = bme.readAltitude(1013.25);

  lcd.setCursor(0, 0);
  lcd.print("T:" + String(temp, 1) + "C P:" + String(int(presion)));
  lcd.setCursor(0, 1);
  lcd.print("Alt:" + String(int(altitud)) + "m Geogo");

  Serial.println("T:" + String(temp, 1) + " C | P:" + String(int(presion)) + " hPa | Alt:" + String(int(altitud)) + " m");
  delay(400);
}`
  },
  {
    id: "telemetria-rf433",
    title: "17. Enlace de Telemetr\xEDa RF 433 MHz + DHT11",
    difficulty: "Avanzado",
    duration: "14 min",
    boardId: "uno",
    description: "Captura temperatura y humedad con el sensor DHT11 y transmite paquetes de telemetr\xEDa por el m\xF3dulo RF 433 MHz se\xF1alizando cada env\xEDo con un LED azul.",
    useBreadboard: true,
    components: [
      { uid: "dht1", type: "dht11", position: [1.2, 0, -3.5], label: "Sensor Clima DHT11", placementHint: "Mesa superior izquierda" },
      { uid: "rf1", type: "rf-pair", position: [4.2, 0, -3.5], label: "Transmisor RF 433 MHz", placementHint: "Mesa superior derecha" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "blue" }, snapHole: "b14", label: "LED Azul TX", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:5V", to: "bb:top+2", label: "Arduino 5V \u2192 Riel (+) top+2", explanation: "Energ\xEDa general 5 V.", color: "#c8402f" },
      { from: "bb:top-2", to: "board:GND_1", label: "Riel (-) top-2 \u2192 Arduino GND", explanation: "Masa general.", color: "#22201c" },
      { from: "bb:top+4", to: "comp:dht1:VCC", label: "Riel (+) top+4 \u2192 DHT11 VCC", explanation: "Alimenta el DHT11.", color: "#c8402f" },
      { from: "bb:top-4", to: "comp:dht1:GND", label: "Riel (-) top-4 \u2192 DHT11 GND", explanation: "Tierra DHT11.", color: "#22201c" },
      { from: "board:D4", to: "comp:dht1:DATA", label: "Arduino D4 \u2192 DHT11 DATA", explanation: "Lectura clim\xE1tica.", color: "#2563eb" },
      { from: "bb:top+8", to: "comp:rf1:VCC", label: "Riel (+) top+8 \u2192 RF 433 VCC", explanation: "Alimentaci\xF3n del transmisor.", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:rf1:GND", label: "Riel (-) top-8 \u2192 RF 433 GND", explanation: "Tierra del transmisor.", color: "#22201c" },
      { from: "board:D11", to: "comp:rf1:DATA", label: "Arduino D11 \u2192 RF 433 DATA", explanation: "Modulaci\xF3n de trama RF.", color: "#7a4fb3" },
      { from: "board:D13", to: "bb:e10", label: "Arduino D13 \u2192 Protoboard e10", explanation: "Destello indicador de transmisi\xF3n.", color: "#2c7a4b" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "Retorno del LED a tierra.", color: "#22201c" }
    ],
    learnPoints: [
      "Un enlace ASK/OOK de 433 MHz modula pulsos digitales en el pin DATA para enviar telemetr\xEDa a distancia."
    ],
    code: `// Misi\xF3n 17: Telemetr\xEDa RF 433 MHz \u2014 Tecnolog\xEDa Geogo
#include <DHT.h>
DHT dht(4, DHT11);

const int RF_TX = 11;
const int LED_TX = 13;

void setup() {
  dht.begin();
  pinMode(RF_TX, OUTPUT);
  pinMode(LED_TX, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  digitalWrite(LED_TX, HIGH);
  digitalWrite(RF_TX, HIGH);
  delay(80);
  digitalWrite(RF_TX, LOW);
  digitalWrite(LED_TX, LOW);

  Serial.println("RF 433 TX -> T=" + String(t, 1) + "C H=" + String(int(h)) + "%");
  delay(450);
}`
  },
  {
    id: "esp32-baliza",
    title: "18. ESP32 DevKit V1 \u2014 Baliza con Pulsador a 3.3 V",
    difficulty: "ESP32 \xB7 3.3 V",
    duration: "8 min",
    boardId: "esp32",
    description: "Primer proyecto con ESP32 DevKit V1: lee un pulsador en GPIO4 y controla un LED azul en GPIO15 trabajando \xEDntegramente a 3.3 V.",
    useBreadboard: true,
    components: [
      { uid: "btn1", type: "button", position: [0.6, 0.28, -0.87], snapHole: "c3", label: "Pulsador t\xE1ctil", placementHint: "Protoboard c3\u2013c5" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "blue" }, snapHole: "b14", label: "LED Azul", placementHint: "Protoboard b14\u2013b15" }
    ],
    steps: [
      { from: "board:G4", to: "bb:e3", label: "ESP32 GPIO4 \u2192 Protoboard e3", explanation: "Lectura del bot\xF3n con INPUT_PULLUP.", color: "#2563eb" },
      { from: "bb:e5", to: "bb:top-5", label: "Protoboard e5 \u2192 Riel (-) top-5", explanation: "Cierre a tierra.", color: "#22201c" },
      { from: "board:G15", to: "bb:e10", label: "ESP32 GPIO15 \u2192 Protoboard e10", explanation: "Salida hacia la resistencia limitadora.", color: "#2c7a4b" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" },
      { from: "bb:top-2", to: "board:GND_2", label: "Riel (-) top-2 \u2192 ESP32 GND", explanation: "Tierra com\xFAn del ESP32.", color: "#22201c" }
    ],
    learnPoints: [
      "Los GPIO del ESP32 trabajan a 3.3 V nativos; utiliza siempre resistencias para proteger tus LEDs."
    ],
    code: `// Misi\xF3n 18: ESP32 \u2014 Baliza con Pulsador
const int BTN_PIN = 4;
const int LED_PIN = 15;

void setup() {
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  if (digitalRead(BTN_PIN) == LOW) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("ESP32: Baliza ACTIVA");
  } else {
    digitalWrite(LED_PIN, LOW);
  }
  delay(80);
}`
  },
  {
    id: "esp32-bme280-nativo",
    title: "19. ESP32 \u2014 Bar\xF3metro BME280 Directo a 3.3 V",
    difficulty: "ESP32 \xB7 3.3 V",
    duration: "10 min",
    boardId: "esp32",
    description: "Comprueba la gran ventaja del ESP32 en Tecnolog\xEDa Geogo: su bus I\xB2C (GPIO21 SDA / GPIO22 SCL) ya opera a 3.3 V, por lo que conecta directo al BME280 sin Level Shifter.",
    useBreadboard: true,
    components: [
      { uid: "bme1", type: "bme280", position: [2.8, 0, -3.5], props: { model: "BME280" }, label: "Bar\xF3metro BME280 (3.3 V)", placementHint: "Mesa superior sobre la protoboard" }
    ],
    steps: [
      { from: "board:3V3", to: "comp:bme1:VCC", label: "ESP32 3V3 \u2192 BME280 VCC", explanation: "Alimentaci\xF3n directa a 3.3 V.", color: "#d4a007" },
      { from: "board:GND_2", to: "comp:bme1:GND", label: "ESP32 GND \u2192 BME280 GND", explanation: "Masa com\xFAn.", color: "#22201c" },
      { from: "board:G21", to: "comp:bme1:SDA", label: "ESP32 GPIO21 (SDA) \u2192 BME280 SDA", explanation: "L\xEDnea SDA nativa 3.3 V.", color: "#2563eb" },
      { from: "board:G22", to: "comp:bme1:SCL", label: "ESP32 GPIO22 (SCL) \u2192 BME280 SCL", explanation: "L\xEDnea SCL nativa 3.3 V.", color: "#7a4fb3" }
    ],
    learnPoints: [
      "A diferencia del Arduino Uno (5 V), el ESP32 se comunica directamente a 3.3 V con m\xF3dulos modernos.",
      "Solo 4 cables bastan para telemetr\xEDa completa de presi\xF3n, temperatura, humedad y altitud."
    ],
    code: `// Misi\xF3n 19: ESP32 + BME280 Directo (3.3 V nativo)
#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  bme.begin(0x76);
}

void loop() {
  float t = bme.readTemperature();
  float p = bme.readPressure() / 100.0;
  float alt = bme.readAltitude(1013.25);

  Serial.println("ESP32 BME280 -> T=" + String(t, 1) + "C | P=" + String(int(p)) + " hPa | Alt=" + String(int(alt)) + "m");
  delay(400);
}`
  },
  {
    id: "esp32-estacion-geogo",
    title: "20. ESP32 \u2014 Estaci\xF3n Geogo Multifunci\xF3n (CO\u2082 + Luz)",
    difficulty: "ESP32 \xB7 3.3 V",
    duration: "15 min",
    boardId: "esp32",
    description: "Integra lectura ADC de 12 bits (0\u20134095) en GPIO34 (CO\u2082) y GPIO35 (Luz) con alarma sonora y luminosa en el ESP32 DevKit V1.",
    useBreadboard: true,
    components: [
      { uid: "ldr1", type: "ldr", position: [1, 0, -3.5], label: "Sensor de Luz (LDR)", placementHint: "Mesa superior izquierda" },
      { uid: "co2_1", type: "co2-sensor", position: [3.8, 0, -3.5], label: "Sensor CO\u2082 (ppm)", placementHint: "Mesa superior derecha" },
      { uid: "r1", type: "resistor", position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: "c10", label: "Resistencia 220 \u03A9", placementHint: "Protoboard c10\u2013c14" },
      { uid: "led1", type: "led", position: [2.9, 0.28, -0.63], props: { color: "red" }, snapHole: "b14", label: "LED Alarma Rojo", placementHint: "Protoboard b14\u2013b15" },
      { uid: "buz1", type: "buzzer", position: [4.6, 0.28, -0.87], snapHole: "c20", label: "Buzzer piezoel\xE9ctrico", placementHint: "Protoboard c20\u2013c22" }
    ],
    steps: [
      { from: "bb:top-2", to: "board:GND_2", label: "Riel (-) top-2 \u2192 ESP32 GND", explanation: "Tierra com\xFAn en el riel azul.", color: "#22201c" },
      { from: "board:3V3", to: "comp:ldr1:VCC", label: "ESP32 3V3 \u2192 LDR VCC", explanation: "Alimenta el LDR a 3.3 V seguros.", color: "#d4a007" },
      { from: "bb:top-4", to: "comp:ldr1:GND", label: "Riel (-) top-4 \u2192 LDR GND", explanation: "Masa del LDR.", color: "#22201c" },
      { from: "board:G35", to: "comp:ldr1:AO", label: "ESP32 GPIO35 \u2192 LDR AO", explanation: "ADC1_7 de 12 bits para luz.", color: "#2c7a4b" },
      { from: "board:VIN", to: "comp:co2_1:VCC", label: "ESP32 VIN (5V) \u2192 CO\u2082 VCC", explanation: "Energiza el m\xF3dulo CO\u2082 desde VIN (5 V).", color: "#c8402f" },
      { from: "bb:top-8", to: "comp:co2_1:GND", label: "Riel (-) top-8 \u2192 CO\u2082 GND", explanation: "Masa del sensor CO\u2082.", color: "#22201c" },
      { from: "board:G34", to: "comp:co2_1:AO", label: "ESP32 GPIO34 \u2192 CO\u2082 AO", explanation: "ADC1_6 de 12 bits para concentraci\xF3n CO\u2082.", color: "#2563eb" },
      { from: "board:G14", to: "bb:e10", label: "ESP32 GPIO14 \u2192 Protoboard e10", explanation: "LED de alerta por aire viciado.", color: "#c8402f" },
      { from: "bb:e15", to: "bb:top-15", label: "Protoboard e15 \u2192 Riel (-) top-15", explanation: "C\xE1todo LED a tierra.", color: "#22201c" },
      { from: "board:G13", to: "bb:e20", label: "ESP32 GPIO13 \u2192 Protoboard e20", explanation: "Se\xF1al al buzzer.", color: "#7a4fb3" },
      { from: "bb:e22", to: "bb:top-22", label: "Protoboard e22 \u2192 Riel (-) top-22", explanation: "Tierra del buzzer.", color: "#22201c" }
    ],
    learnPoints: [
      "El ESP32 posee ADC de 12 bits (0\u20134095), 4 veces m\xE1s resoluci\xF3n que Arduino Uno (0\u20131023).",
      "GPIO34 y GPIO35 son pines excelentes solo-entrada para sensores anal\xF3gicos incluso usando Wi-Fi."
    ],
    code: `// Misi\xF3n 20: Estaci\xF3n Geogo ESP32 (ADC 12 bits)
const int PIN_CO2 = 34;
const int PIN_LUZ = 35;
const int LED_ALERTA = 14;
const int BUZ = 13;

void setup() {
  pinMode(LED_ALERTA, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int ppm = map(analogRead(PIN_CO2), 0, 4095, 400, 3000);
  int luzPct = map(analogRead(PIN_LUZ), 0, 4095, 0, 100);

  Serial.println("CO2: " + String(ppm) + " ppm | Luz: " + String(luzPct) + "%");
  if (ppm >= 1400) {
    digitalWrite(LED_ALERTA, HIGH);
    tone(BUZ, 950, 150);
  } else {
    digitalWrite(LED_ALERTA, LOW);
    noTone(BUZ);
  }
  delay(350);
}`
  },
  {
    id: "libre",
    title: "Modo Laboratorio Libre (Kit XL + Geogo)",
    difficulty: "Libre",
    duration: "Ilimitado",
    boardId: "uno",
    description: "Mesa de trabajo abierta. A\xF1ade cualquier sensor (DHT11, BME280, CO\u2082, \xD3ptico Rotativo, RF, Ultras\xF3nico, LED RGB) o cambia entre Arduino Uno R3 y ESP32 para experimentar libremente.",
    useBreadboard: true,
    components: [],
    steps: [],
    learnPoints: [
      "Agrega componentes desde el cat\xE1logo de la izquierda.",
      "Haz clic en cualquier pin para trazar cables jumper con el color que elijas.",
      "Guarda tu circuito en .json o descarga tu sketch .ino para llevarlo al taller."
    ],
    code: `// Laboratorio Libre \u2014 Liceo Bicentenario San Nicol\xE1s
// \xC1rea Premilitar \xB7 Tecnolog\xEDa Geogo

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Laboratorio Geogo listo.");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(350);
  digitalWrite(LED_BUILTIN, LOW);
  delay(350);
}`
  }
];

// src/lab/netlist.ts
function computeSnappedPinsForHole(type, snapHole) {
  const m = /^([a-j])(\d+)$/.exec(snapHole);
  if (!m) return {};
  const row = m[1];
  const col = Number(m[2]);
  const offsets = {
    resistor: [["P1", 0], ["P2", 4]],
    led: [["A", 0], ["K", 1]],
    button: [["A", 0], ["B", 2]],
    buzzer: [["SIG", 0], ["GND", 2]],
    "rgb-led": [["R", 0], ["K", 1], ["G", 2], ["B", 3]]
  };
  const spec = offsets[type];
  if (!spec) return {};
  const out = {};
  for (const [pinId, delta] of spec) {
    const targetCol = col + delta;
    if (targetCol >= 1 && targetCol <= 30) {
      out[pinId] = `${row}${targetCol}`;
    }
  }
  return out;
}
function breadboardTrackOf(endpoint) {
  if (!endpoint.startsWith("bb:")) return null;
  const hole = endpoint.slice(3);
  if (hole.startsWith("top+")) return "bb:track:rail_top_plus";
  if (hole.startsWith("top-")) return "bb:track:rail_top_minus";
  if (hole.startsWith("bot+")) return "bb:track:rail_bot_plus";
  if (hole.startsWith("bot-")) return "bb:track:rail_bot_minus";
  const m = /^([a-j])(\d+)$/.exec(hole);
  if (!m) return null;
  const row = m[1];
  const col = m[2];
  const half = ["a", "b", "c", "d", "e"].includes(row) ? "top" : "bot";
  return `bb:track:${half}_${col}`;
}
function analyzeNetlist(board, components, wires) {
  const parent = /* @__PURE__ */ new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root);
    }
    let cur = x;
    while (cur !== root) {
      const nxt = parent.get(cur);
      parent.set(cur, root);
      cur = nxt;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const registerEndpoint = (ep) => {
    find(ep);
    const tr = breadboardTrackOf(ep);
    if (tr) union(ep, tr);
  };
  for (const p of board.pins) {
    registerEndpoint(`board:${p.id}`);
  }
  const gndBoardPins = board.pins.filter((p) => p.category === "gnd").map((p) => `board:${p.id}`);
  for (let i = 1; i < gndBoardPins.length; i++) {
    union(gndBoardPins[0], gndBoardPins[i]);
  }
  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    for (const p of item.pins) {
      const ep = `comp:${comp.uid}:${p.id}`;
      registerEndpoint(ep);
      const bbHole = comp.breadboardMount?.pins[p.id];
      if (bbHole) {
        const bbEp = `bb:${bbHole}`;
        registerEndpoint(bbEp);
        union(ep, bbEp);
      }
    }
    if (comp.type === "button" && comp.state.pressed) {
      union(`comp:${comp.uid}:A`, `comp:${comp.uid}:B`);
    }
    if (comp.type === "level-shifter") {
      union(`comp:${comp.uid}:GND_H`, `comp:${comp.uid}:GND_L`);
    }
  }
  for (const w of wires) {
    registerEndpoint(w.from);
    registerEndpoint(w.to);
    union(w.from, w.to);
  }
  const netOf = (ep) => find(ep);
  const areConnected = (a, b) => find(a) === find(b);
  const netAdj = /* @__PURE__ */ new Map();
  const addBridge = (epA, epB, kind, ohms) => {
    const nA = find(epA);
    const nB = find(epB);
    if (!netAdj.has(nA)) netAdj.set(nA, []);
    if (!netAdj.has(nB)) netAdj.set(nB, []);
    netAdj.get(nA).push({ toNet: nB, kind, ohms });
    netAdj.get(nB).push({ toNet: nA, kind, ohms });
  };
  for (const comp of components) {
    if (comp.type === "resistor") {
      const ohms = Math.max(1, Number(comp.props?.ohms ?? 220));
      addBridge(`comp:${comp.uid}:P1`, `comp:${comp.uid}:P2`, "resistor", ohms);
    } else if (comp.type === "level-shifter") {
      addBridge(`comp:${comp.uid}:HV1`, `comp:${comp.uid}:LV1`, "shifter");
      addBridge(`comp:${comp.uid}:HV2`, `comp:${comp.uid}:LV2`, "shifter");
    }
  }
  const diagnostics = [];
  let hasShortCircuit = false;
  let hasVoltageDanger = false;
  const gndNet = gndBoardPins.length > 0 ? find(gndBoardPins[0]) : null;
  const pwr5Pins = board.pins.filter((p) => p.category === "pwr" && p.voltage >= 4.5);
  const pwr33Pins = board.pins.filter((p) => p.category === "pwr" && p.voltage > 2.5 && p.voltage < 4);
  if (gndNet) {
    for (const p of [...pwr5Pins, ...pwr33Pins]) {
      if (find(`board:${p.id}`) === gndNet) {
        hasShortCircuit = true;
        diagnostics.push({
          level: "error",
          title: `Cortocircuito detectado (${p.label} conectado a GND)`,
          detail: `El pin de alimentaci\xF3n ${p.label} est\xE1 unido directamente a tierra (GND). Retira el cable en conflicto antes de ejecutar.`
        });
        break;
      }
    }
  }
  const highVoltageNets = /* @__PURE__ */ new Set();
  for (const p of pwr5Pins) highVoltageNets.add(find(`board:${p.id}`));
  if (board.logicVoltage === 5) {
    for (const p of board.pins) {
      if (p.category === "dig" || p.category === "ana" || p.category === "com") {
        highVoltageNets.add(find(`board:${p.id}`));
      }
    }
  }
  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    for (const pin of item.pins) {
      if (pin.maxVoltage && pin.maxVoltage < 4) {
        const net = find(`comp:${comp.uid}:${pin.id}`);
        if (highVoltageNets.has(net)) {
          hasVoltageDanger = true;
          diagnostics.push({
            level: "warn",
            title: `Sobrevoltaje 5 V en ${item.name} (${pin.label})`,
            detail: `Este m\xF3dulo trabaja a 3.3 V. Con\xE9ctalo al pin 3.3V y pasa las se\xF1ales SDA/SCL o datos a trav\xE9s del m\xF3dulo Level Shifter (HV \u2194 LV).`
          });
        }
      }
    }
  }
  const findBoardSignalPin = (compUid, pinId) => {
    const startNet = find(`comp:${compUid}:${pinId}`);
    const queue = [
      { net: startNet, ohms: 0, shifted: false }
    ];
    const visited = /* @__PURE__ */ new Set([startNet]);
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const bp of board.pins) {
        if ((bp.category === "dig" || bp.category === "ana" || bp.category === "com") && find(`board:${bp.id}`) === cur.net) {
          return {
            boardPinId: bp.id,
            viaResistorOhms: cur.ohms,
            viaLevelShifter: cur.shifted
          };
        }
      }
      for (const edge of netAdj.get(cur.net) ?? []) {
        if (!visited.has(edge.toNet)) {
          visited.add(edge.toNet);
          queue.push({
            net: edge.toNet,
            ohms: cur.ohms + (edge.ohms ?? 0),
            shifted: cur.shifted || edge.kind === "shifter"
          });
        }
      }
    }
    return { boardPinId: null, viaResistorOhms: 0, viaLevelShifter: false };
  };
  const findPowerVoltage = (startNet) => {
    const queue = [startNet];
    const visited = /* @__PURE__ */ new Set([startNet]);
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const p of pwr5Pins) {
        if (find(`board:${p.id}`) === cur) return 5;
      }
      for (const p of pwr33Pins) {
        if (find(`board:${p.id}`) === cur) return 3.3;
      }
      for (const edge of netAdj.get(cur) ?? []) {
        if (!visited.has(edge.toNet)) {
          visited.add(edge.toNet);
          queue.push(edge.toNet);
        }
      }
    }
    return null;
  };
  const checkPowerSupply = (compUid, vccPinId = "VCC", gndPinId = "GND") => {
    const vccVoltage = findPowerVoltage(find(`comp:${compUid}:${vccPinId}`));
    const gndCheckNet = find(`comp:${compUid}:${gndPinId}`);
    let hasGnd = gndNet !== null && gndCheckNet === gndNet;
    if (!hasGnd && gndNet) {
      for (const edge of netAdj.get(gndCheckNet) ?? []) {
        if (edge.toNet === gndNet) hasGnd = true;
      }
    }
    return { vccVoltage, hasGnd };
  };
  const checkI2CConnection = (compUid, sdaPinId = "SDA", sclPinId = "SCL") => {
    const sdaSig = findBoardSignalPin(compUid, sdaPinId);
    const sclSig = findBoardSignalPin(compUid, sclPinId);
    const sdaPin = board.pins.find((p) => p.id === sdaSig.boardPinId);
    const sclPin = board.pins.find((p) => p.id === sclSig.boardPinId);
    return {
      connected: sdaPin?.i2c === "SDA" && sclPin?.i2c === "SCL",
      viaLevelShifter: sdaSig.viaLevelShifter && sclSig.viaLevelShifter
    };
  };
  const checkLedChannel = (compUid, itemName, anodePinId, cathodePinId) => {
    const sig = findBoardSignalPin(compUid, anodePinId);
    const pwr = checkPowerSupply(compUid, anodePinId, cathodePinId);
    const anodeDirect5V = pwr5Pins.some((p) => find(`board:${p.id}`) === find(`comp:${compUid}:${anodePinId}`));
    const hasPathToGnd = pwr.hasGnd || findBoardSignalPin(compUid, cathodePinId).boardPinId !== null;
    if ((sig.boardPinId || anodeDirect5V) && hasPathToGnd) {
      let totalOhms = sig.viaResistorOhms;
      const kNet = find(`comp:${compUid}:${cathodePinId}`);
      for (const edge of netAdj.get(kNet) ?? []) {
        if (edge.kind === "resistor") totalOhms += edge.ohms ?? 0;
      }
      if (totalOhms === 0) {
        diagnostics.push({
          level: "warn",
          title: `${itemName} sin resistencia limitadora`,
          detail: `Conecta una resistencia de 220 \u03A9 en serie con el LED para evitar sobrecorriente al pasarlo al circuito real.`
        });
      }
    }
  };
  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    if (comp.type === "led") {
      checkLedChannel(comp.uid, item.name, "A", "K");
    } else if (comp.type === "rgb-led") {
      for (const ch of ["R", "G", "B"]) {
        checkLedChannel(comp.uid, `${item.name} (${ch})`, ch, "K");
      }
    }
  }
  return {
    diagnostics,
    hasShortCircuit,
    hasVoltageDanger,
    netOf,
    areConnected,
    findBoardSignalPin,
    checkPowerSupply,
    checkI2CConnection
  };
}

// src/lab/simulator/runtime.ts
var ArduinoCompileError = class extends Error {
  line;
  constructor(message, line = 1) {
    super(message);
    this.line = line;
  }
};
function stripPreprocessorAndComments(src) {
  const defines = /* @__PURE__ */ new Map();
  const includes = [];
  const lines = src.split(/\r?\n/);
  const outLines = [];
  let inBlockComment = false;
  for (const rawLine of lines) {
    let line = "";
    let i = 0;
    let inString = false;
    while (i < rawLine.length) {
      if (inBlockComment) {
        if (rawLine[i] === "*" && rawLine[i + 1] === "/") {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (!inString && rawLine[i] === "/" && rawLine[i + 1] === "*") {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (!inString && rawLine[i] === "/" && rawLine[i + 1] === "/") {
        break;
      }
      if (rawLine[i] === '"' && rawLine[i - 1] !== "\\") {
        inString = !inString;
      }
      line += rawLine[i++];
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("#include")) {
      includes.push(trimmed);
      outLines.push("");
      continue;
    }
    if (trimmed.startsWith("#define")) {
      const m = /^#define\s+([A-Za-z_]\w*)\s+(.+)$/.exec(trimmed);
      if (m) defines.set(m[1], m[2].trim());
      outLines.push("");
      continue;
    }
    outLines.push(line);
  }
  return { code: outLines.join("\n"), defines, includes };
}
function tokenize(src, defines) {
  const tokens = [];
  let i = 0;
  let line = 1;
  const twoCharOps = /* @__PURE__ */ new Set(["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "<<", ">>"]);
  const puncs = /* @__PURE__ */ new Set(["(", ")", "{", "}", "[", "]", ";", ",", ".", ":"]);
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let s = "";
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\" && i + 1 < src.length) {
          const esc = src[i + 1];
          s += esc === "n" ? "\n" : esc === "t" ? "	" : esc;
          i += 2;
        } else {
          if (src[i] === "\n") line++;
          s += src[i++];
        }
      }
      if (i >= src.length) throw new ArduinoCompileError('Cadena de texto sin comilla de cierre "', line);
      i++;
      tokens.push({ type: "str", value: s, line });
      continue;
    }
    if (ch === "'") {
      i++;
      const c = src[i] ?? "";
      i++;
      if (src[i] === "'") i++;
      tokens.push({ type: "char", value: c, line });
      continue;
    }
    if (/\d/.test(ch) || ch === "." && /\d/.test(src[i + 1] ?? "")) {
      let num = "";
      if (ch === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
        num = "0x";
        i += 2;
        while (i < src.length && /[0-9a-fA-F]/.test(src[i])) num += src[i++];
      } else {
        while (i < src.length && /[\d.]/.test(src[i])) num += src[i++];
      }
      tokens.push({ type: "num", value: num, line });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++];
      if (defines.has(id)) {
        const sub = tokenize(defines.get(id), /* @__PURE__ */ new Map());
        for (const t of sub) {
          if (t.type !== "eof") tokens.push({ ...t, line });
        }
      } else {
        tokens.push({ type: "id", value: id, line });
      }
      continue;
    }
    const two = src.slice(i, i + 2);
    if (twoCharOps.has(two)) {
      tokens.push({ type: "op", value: two, line });
      i += 2;
      continue;
    }
    if (puncs.has(ch)) {
      tokens.push({ type: "punc", value: ch, line });
      i++;
      continue;
    }
    if ("+-*/%<>=!&|^~?".includes(ch)) {
      tokens.push({ type: "op", value: ch, line });
      i++;
      continue;
    }
    throw new ArduinoCompileError(`Car\xE1cter inesperado "${ch}"`, line);
  }
  tokens.push({ type: "eof", value: "", line });
  return tokens;
}
var TYPE_KEYWORDS = /* @__PURE__ */ new Set([
  "void",
  "int",
  "long",
  "unsigned",
  "short",
  "byte",
  "float",
  "double",
  "bool",
  "boolean",
  "char",
  "String",
  "uint8_t",
  "uint16_t",
  "uint32_t",
  "Servo",
  "LiquidCrystal_I2C",
  "Adafruit_BME280",
  "Adafruit_BMP280",
  "DHT"
]);
var Parser = class {
  tokens;
  pos = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  peek(offset = 0) {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  next() {
    return this.tokens[this.pos++];
  }
  match(type, val) {
    const t = this.peek();
    if (t.type !== type) return false;
    if (val !== void 0 && t.value !== val) return false;
    this.pos++;
    return true;
  }
  expect(type, val, msg) {
    const t = this.peek();
    if (t.type !== type || t.value !== val) {
      throw new ArduinoCompileError(msg ?? `Se esperaba "${val}" y se encontr\xF3 "${t.value || "fin de archivo"}"`, t.line);
    }
    return this.next();
  }
  isTypeStart() {
    const t = this.peek();
    if (t.type !== "id") return false;
    if (t.value === "const" || t.value === "static") return true;
    return TYPE_KEYWORDS.has(t.value);
  }
  consumeType() {
    while (this.peek().type === "id" && (this.peek().value === "const" || this.peek().value === "static" || this.peek().value === "unsigned")) {
      this.next();
    }
    const base = this.next();
    return base.value;
  }
  parseProgram() {
    const globals = [];
    const funcs = /* @__PURE__ */ new Map();
    while (this.peek().type !== "eof") {
      if (this.isTypeStart()) {
        const typeName = this.consumeType();
        const nameTok = this.peek();
        if (nameTok.type !== "id") {
          throw new ArduinoCompileError(`Nombre de identificador inv\xE1lido "${nameTok.value}"`, nameTok.line);
        }
        const name = this.next().value;
        if (this.match("punc", "(")) {
          if (typeName === "LiquidCrystal_I2C" || typeName === "Servo" || typeName === "Adafruit_BME280" || typeName === "DHT") {
            const args = [];
            if (!this.match("punc", ")")) {
              do {
                args.push(this.parseExpr());
              } while (this.match("punc", ","));
              this.expect("punc", ")");
            }
            this.expect("punc", ";", 'Falta ";" al final de la declaraci\xF3n');
            globals.push({
              kind: "var",
              name,
              init: { kind: "call", callee: { kind: "var", name: `__ctor_${typeName}` }, args, line: nameTok.line },
              line: nameTok.line
            });
            continue;
          }
          const params = [];
          if (!this.match("punc", ")")) {
            do {
              if (this.isTypeStart()) this.consumeType();
              if (this.peek().type === "id") params.push(this.next().value);
              if (this.match("punc", "[")) this.match("punc", "]");
            } while (this.match("punc", ","));
            this.expect("punc", ")");
          }
          const body = this.parseBlock();
          funcs.set(name, { name, params, body });
          continue;
        }
        globals.push(this.finishVarDecl(typeName, name, nameTok.line));
        continue;
      }
      throw new ArduinoCompileError(`Instrucci\xF3n fuera de funci\xF3n no reconocida: "${this.peek().value}"`, this.peek().line);
    }
    return { globals, funcs };
  }
  finishVarDecl(typeName, name, line) {
    let isArray = false;
    if (this.match("punc", "[")) {
      isArray = true;
      if (!this.match("punc", "]")) {
        this.parseExpr();
        this.expect("punc", "]");
      }
    }
    let init;
    if (this.match("op", "=")) {
      if (this.match("punc", "{")) {
        const items = [];
        if (!this.match("punc", "}")) {
          do {
            items.push(this.parseExpr());
          } while (this.match("punc", ","));
          this.expect("punc", "}");
        }
        init = { kind: "array", items };
      } else {
        init = this.parseExpr();
      }
    } else if (typeName === "Servo" || typeName === "Adafruit_BME280" || typeName === "Adafruit_BMP280") {
      init = { kind: "call", callee: { kind: "var", name: `__ctor_${typeName}` }, args: [], line };
    }
    this.expect("punc", ";", 'Falta ";" al final de la declaraci\xF3n de variable');
    return { kind: "var", name, init, isArray, line };
  }
  parseBlock() {
    const start = this.expect("punc", "{");
    const body = [];
    while (!this.match("punc", "}")) {
      if (this.peek().type === "eof") {
        throw new ArduinoCompileError('Falta llave de cierre "}"', start.line);
      }
      body.push(this.parseStmt());
    }
    return { kind: "block", body };
  }
  parseStmt() {
    const t = this.peek();
    if (t.type === "punc" && t.value === "{") return this.parseBlock();
    if (this.match("punc", ";")) return { kind: "empty" };
    if (t.type === "id" && t.value === "if") {
      this.next();
      this.expect("punc", "(");
      const cond = this.parseExpr();
      this.expect("punc", ")");
      const then = this.parseStmt();
      let elseStmt;
      if (this.peek().type === "id" && this.peek().value === "else") {
        this.next();
        elseStmt = this.parseStmt();
      }
      return { kind: "if", cond, then, elseStmt, line: t.line };
    }
    if (t.type === "id" && t.value === "while") {
      this.next();
      this.expect("punc", "(");
      const cond = this.parseExpr();
      this.expect("punc", ")");
      const body = this.parseStmt();
      return { kind: "while", cond, body, line: t.line };
    }
    if (t.type === "id" && t.value === "for") {
      this.next();
      this.expect("punc", "(");
      let init;
      if (!this.match("punc", ";")) {
        if (this.isTypeStart()) {
          const tn = this.consumeType();
          const vname = this.next();
          init = this.finishVarDecl(tn, vname.value, vname.line);
        } else {
          init = { kind: "expr", expr: this.parseExpr(), line: t.line };
          this.expect("punc", ";");
        }
      }
      let cond;
      if (!this.match("punc", ";")) {
        cond = this.parseExpr();
        this.expect("punc", ";");
      }
      let step;
      if (!this.match("punc", ")")) {
        step = this.parseExpr();
        this.expect("punc", ")");
      }
      const body = this.parseStmt();
      return { kind: "for", init, cond, step, body, line: t.line };
    }
    if (t.type === "id" && t.value === "return") {
      this.next();
      let expr2;
      if (!this.match("punc", ";")) {
        expr2 = this.parseExpr();
        this.expect("punc", ";", 'Falta ";" despu\xE9s de return');
      }
      return { kind: "return", expr: expr2, line: t.line };
    }
    if (t.type === "id" && t.value === "break") {
      this.next();
      this.expect("punc", ";");
      return { kind: "break", line: t.line };
    }
    if (t.type === "id" && t.value === "continue") {
      this.next();
      this.expect("punc", ";");
      return { kind: "continue", line: t.line };
    }
    if (this.isTypeStart()) {
      const tn = this.consumeType();
      const vname = this.next();
      if (this.match("punc", "(")) {
        const args = [];
        if (!this.match("punc", ")")) {
          do {
            args.push(this.parseExpr());
          } while (this.match("punc", ","));
          this.expect("punc", ")");
        }
        this.expect("punc", ";");
        return {
          kind: "var",
          name: vname.value,
          init: { kind: "call", callee: { kind: "var", name: `__ctor_${tn}` }, args, line: vname.line },
          line: vname.line
        };
      }
      return this.finishVarDecl(tn, vname.value, vname.line);
    }
    const expr = this.parseExpr();
    this.expect("punc", ";", 'Falta punto y coma ";" al final de la instrucci\xF3n');
    return { kind: "expr", expr, line: t.line };
  }
  parseExpr() {
    return this.parseAssign();
  }
  parseAssign() {
    const left = this.parseTernary();
    const t = this.peek();
    if (t.type === "op" && ["=", "+=", "-=", "*=", "/="].includes(t.value)) {
      this.next();
      const right = this.parseAssign();
      return { kind: "assign", op: t.value, left, right };
    }
    return left;
  }
  parseTernary() {
    const cond = this.parseOr();
    if (this.match("op", "?")) {
      const a = this.parseExpr();
      this.expect("punc", ":");
      const b = this.parseTernary();
      return { kind: "ternary", cond, a, b };
    }
    return cond;
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.match("op", "||")) {
      left = { kind: "binary", op: "||", left, right: this.parseAnd() };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseEq();
    while (this.match("op", "&&")) {
      left = { kind: "binary", op: "&&", left, right: this.parseEq() };
    }
    return left;
  }
  parseEq() {
    let left = this.parseRel();
    while (this.peek().type === "op" && (this.peek().value === "==" || this.peek().value === "!=")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseRel() };
    }
    return left;
  }
  parseRel() {
    let left = this.parseAdd();
    while (this.peek().type === "op" && ["<", "<=", ">", ">="].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseAdd() };
    }
    return left;
  }
  parseAdd() {
    let left = this.parseMul();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseMul() };
    }
    return left;
  }
  parseMul() {
    let left = this.parseUnary();
    while (this.peek().type === "op" && ["*", "/", "%"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseUnary() };
    }
    return left;
  }
  parseUnary() {
    const t = this.peek();
    if (t.type === "op" && ["!", "-", "+", "++", "--"].includes(t.value)) {
      this.next();
      return { kind: "unary", op: t.value, arg: this.parseUnary(), prefix: true };
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match("punc", "(")) {
        const line = this.peek().line;
        const args = [];
        if (!this.match("punc", ")")) {
          do {
            args.push(this.parseExpr());
          } while (this.match("punc", ","));
          this.expect("punc", ")");
        }
        expr = { kind: "call", callee: expr, args, line };
      } else if (this.match("punc", ".")) {
        const prop = this.next();
        expr = { kind: "member", obj: expr, prop: prop.value };
      } else if (this.match("punc", "[")) {
        const index = this.parseExpr();
        this.expect("punc", "]");
        expr = { kind: "index", obj: expr, index };
      } else if (this.peek().type === "op" && (this.peek().value === "++" || this.peek().value === "--")) {
        const op = this.next().value;
        expr = { kind: "unary", op, arg: expr, prefix: false };
      } else {
        break;
      }
    }
    return expr;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.type === "num") {
      this.next();
      return { kind: "lit", value: t.value.startsWith("0x") ? parseInt(t.value, 16) : Number(t.value) };
    }
    if (t.type === "str") {
      this.next();
      return { kind: "lit", value: t.value };
    }
    if (t.type === "char") {
      this.next();
      return { kind: "lit", value: t.value.charCodeAt(0) };
    }
    if (t.type === "id") {
      this.next();
      if (t.value === "true") return { kind: "lit", value: true };
      if (t.value === "false") return { kind: "lit", value: false };
      return { kind: "var", name: t.value };
    }
    if (this.match("punc", "(")) {
      const expr = this.parseExpr();
      this.expect("punc", ")");
      return expr;
    }
    throw new ArduinoCompileError(`Expresi\xF3n inesperada "${t.value || "fin"}"`, t.line);
  }
};
var ReturnSignal = class {
  value;
  constructor(value) {
    this.value = value;
  }
};
var BreakSignal = class {
};
var ContinueSignal = class {
};
function normalizePinArg(raw, boardId) {
  if (typeof raw === "string") {
    if (/^\d+$/.test(raw)) return normalizePinArg(Number(raw), boardId);
    return raw.toUpperCase();
  }
  const n = Number(raw);
  if (boardId === "uno") {
    if (n >= 14 && n <= 19) return `A${n - 14}`;
    return `D${n}`;
  }
  return `G${n}`;
}
var ArduinoRuntime = class {
  bridge;
  funcs = /* @__PURE__ */ new Map();
  globalScope = /* @__PURE__ */ new Map();
  running = false;
  abortCtrl = null;
  startMs = 0;
  interrupts = /* @__PURE__ */ new Map();
  constructor(bridge) {
    this.bridge = bridge;
  }
  compile(source) {
    const { code, defines } = stripPreprocessorAndComments(source);
    const tokens = tokenize(code, defines);
    const parser = new Parser(tokens);
    const { globals, funcs } = parser.parseProgram();
    this.funcs = funcs;
    if (!funcs.has("setup")) {
      throw new ArduinoCompileError("El c\xF3digo debe incluir la funci\xF3n void setup() { ... }", 1);
    }
    if (!funcs.has("loop")) {
      throw new ArduinoCompileError("El c\xF3digo debe incluir la funci\xF3n void loop() { ... }", 1);
    }
    this.globalScope = /* @__PURE__ */ new Map();
    this.initBuiltins(this.globalScope);
    for (const g of globals) {
      if (g.kind === "var") {
        const val = g.init ? this.evalExprSync(g.init, this.globalScope) : 0;
        this.globalScope.set(g.name, val);
      }
    }
  }
  initBuiltins(scope) {
    const isUno = this.bridge.boardId === "uno";
    scope.set("HIGH", 1);
    scope.set("LOW", 0);
    scope.set("INPUT", "INPUT");
    scope.set("OUTPUT", "OUTPUT");
    scope.set("INPUT_PULLUP", "INPUT_PULLUP");
    scope.set("RISING", "RISING");
    scope.set("FALLING", "FALLING");
    scope.set("CHANGE", "CHANGE");
    scope.set("DHT11", 11);
    scope.set("LED_BUILTIN", isUno ? 13 : 2);
    scope.set("A0", isUno ? "A0" : "G36");
    scope.set("A1", isUno ? "A1" : "G39");
    scope.set("A2", isUno ? "A2" : "G34");
    scope.set("A3", isUno ? "A3" : "G35");
    scope.set("A4", isUno ? "A4" : "G32");
    scope.set("A5", isUno ? "A5" : "G33");
    scope.set("Serial", {
      begin: (baud) => this.bridge.onSerialBegin?.(Number(baud) || 9600),
      print: (v) => this.bridge.onSerialPrint?.(String(v ?? ""), false),
      println: (v = "") => this.bridge.onSerialPrint?.(String(v), true),
      available: () => this.bridge.onSerialAvailable?.() ?? 0,
      read: () => this.bridge.onSerialRead?.() ?? -1,
      readString: () => this.bridge.onSerialReadString?.() ?? ""
    });
    scope.set("Wire", {
      begin: () => {
      }
    });
    scope.set("__ctor_Servo", () => {
      let attachedPin = "D9";
      let currentAngle = 90;
      return {
        attach: (pin) => {
          attachedPin = normalizePinArg(pin, this.bridge.boardId);
        },
        write: (angle) => {
          currentAngle = Math.max(0, Math.min(180, Number(angle) || 0));
          this.bridge.onServoWrite?.(attachedPin, currentAngle);
        },
        read: () => currentAngle
      };
    });
    scope.set("__ctor_LiquidCrystal_I2C", () => {
      let lines = ["", ""];
      let cursorRow = 0;
      let cursorCol = 0;
      let backlight = true;
      const push = () => this.bridge.onLcdUpdate?.(lines[0], lines[1], backlight);
      return {
        init: () => push(),
        begin: () => push(),
        backlight: () => {
          backlight = true;
          push();
        },
        noBacklight: () => {
          backlight = false;
          push();
        },
        clear: () => {
          lines = ["", ""];
          cursorCol = 0;
          cursorRow = 0;
          push();
        },
        setCursor: (col, row) => {
          cursorCol = Math.max(0, Math.min(15, Number(col) || 0));
          cursorRow = Math.max(0, Math.min(1, Number(row) || 0));
        },
        print: (val) => {
          const text = String(val ?? "");
          const base = lines[cursorRow].padEnd(16, " ").split("");
          for (let i = 0; i < text.length && cursorCol + i < 16; i++) {
            base[cursorCol + i] = text[i];
          }
          lines[cursorRow] = base.join("").trimEnd();
          cursorCol = Math.min(16, cursorCol + text.length);
          push();
        }
      };
    });
    const makeBmeObj = () => ({
      begin: () => true,
      readTemperature: () => this.bridge.onBmeRead?.().tempC ?? 22.4,
      readPressure: () => (this.bridge.onBmeRead?.().pressureHpa ?? 1013.25) * 100,
      readHumidity: () => this.bridge.onBmeRead?.().humidity ?? 52,
      readAltitude: (seaLevel = 1013.25) => {
        const p = this.bridge.onBmeRead?.().pressureHpa ?? 1013.25;
        return 44330 * (1 - Math.pow(p / seaLevel, 0.1903));
      }
    });
    scope.set("__ctor_Adafruit_BME280", makeBmeObj);
    scope.set("__ctor_Adafruit_BMP280", makeBmeObj);
    scope.set("__ctor_DHT", (pinArg) => {
      const dhtPin = normalizePinArg(pinArg ?? 4, this.bridge.boardId);
      return {
        begin: () => {
        },
        readTemperature: () => this.bridge.onDhtRead?.(dhtPin)?.tempC ?? 22,
        readHumidity: () => this.bridge.onDhtRead?.(dhtPin)?.humidity ?? 52
      };
    });
  }
  async start(source) {
    this.stop();
    this.compile(source);
    this.running = true;
    this.startMs = performance.now();
    this.interrupts.clear();
    this.abortCtrl = new AbortController();
    const signal = this.abortCtrl.signal;
    try {
      await this.callUserFunc("setup", [], signal);
      while (this.running && !signal.aborted) {
        await this.checkInterrupts(signal);
        await this.callUserFunc("loop", [], signal);
        await this.sleep(16, signal);
      }
    } catch (err) {
      if (err?.name !== "AbortError") throw err;
    }
  }
  stop() {
    this.running = false;
    this.abortCtrl?.abort();
    this.abortCtrl = null;
    this.bridge.onNoTone?.("");
  }
  async checkInterrupts(signal) {
    for (const [pin, info] of this.interrupts.entries()) {
      const val = this.bridge.onDigitalRead?.(pin) ?? 0;
      if (val !== info.lastVal && val === 1) {
        info.lastVal = val;
        await this.callUserFunc(info.fnName, [], signal);
      } else {
        info.lastVal = val;
      }
    }
  }
  sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      const id = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, Math.max(0, ms));
      const onAbort = () => {
        clearTimeout(id);
        reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  findVarScope(name, scopes) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].has(name)) return scopes[i];
    }
    return scopes[0];
  }
  async callUserFunc(name, args, signal) {
    const fn = this.funcs.get(name);
    if (!fn) return void 0;
    const local = /* @__PURE__ */ new Map();
    fn.params.forEach((p, idx) => local.set(p, args[idx]));
    try {
      await this.execStmt(fn.body, [this.globalScope, local], signal);
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value;
      throw sig;
    }
    return void 0;
  }
  evalExprSync(expr, scope) {
    if (expr.kind === "lit") return expr.value;
    if (expr.kind === "var") return scope.get(expr.name);
    if (expr.kind === "array") return expr.items.map((x) => this.evalExprSync(x, scope));
    if (expr.kind === "call" && expr.callee.kind === "var") {
      const fn = scope.get(expr.callee.name);
      if (typeof fn === "function") {
        return fn(...expr.args.map((a) => this.evalExprSync(a, scope)));
      }
    }
    if (expr.kind === "unary" && expr.op === "-") {
      return -Number(this.evalExprSync(expr.arg, scope));
    }
    return 0;
  }
  async execStmt(stmt, scopes, signal) {
    if (!this.running || signal.aborted) return;
    switch (stmt.kind) {
      case "empty":
        return;
      case "block": {
        const blockScope = /* @__PURE__ */ new Map();
        const nextScopes = [...scopes, blockScope];
        for (const s of stmt.body) {
          await this.execStmt(s, nextScopes, signal);
        }
        return;
      }
      case "var": {
        const val = stmt.init ? await this.evalExpr(stmt.init, scopes, signal) : 0;
        scopes[scopes.length - 1].set(stmt.name, val);
        return;
      }
      case "expr":
        await this.evalExpr(stmt.expr, scopes, signal);
        return;
      case "if": {
        const c = await this.evalExpr(stmt.cond, scopes, signal);
        if (c) await this.execStmt(stmt.then, scopes, signal);
        else if (stmt.elseStmt) await this.execStmt(stmt.elseStmt, scopes, signal);
        return;
      }
      case "while": {
        let guard = 0;
        while (this.running && !signal.aborted && await this.evalExpr(stmt.cond, scopes, signal)) {
          try {
            await this.execStmt(stmt.body, scopes, signal);
          } catch (s) {
            if (s instanceof BreakSignal) break;
            if (s instanceof ContinueSignal) continue;
            throw s;
          }
          if (++guard % 200 === 0) await this.sleep(1, signal);
        }
        return;
      }
      case "for": {
        const loopScope = /* @__PURE__ */ new Map();
        const nextScopes = [...scopes, loopScope];
        if (stmt.init) await this.execStmt(stmt.init, nextScopes, signal);
        let guard = 0;
        while (this.running && !signal.aborted) {
          if (stmt.cond && !await this.evalExpr(stmt.cond, nextScopes, signal)) break;
          try {
            await this.execStmt(stmt.body, nextScopes, signal);
          } catch (s) {
            if (s instanceof BreakSignal) break;
            if (!(s instanceof ContinueSignal)) throw s;
          }
          if (stmt.step) await this.evalExpr(stmt.step, nextScopes, signal);
          if (++guard % 200 === 0) await this.sleep(1, signal);
        }
        return;
      }
      case "return":
        throw new ReturnSignal(stmt.expr ? await this.evalExpr(stmt.expr, scopes, signal) : void 0);
      case "break":
        throw new BreakSignal();
      case "continue":
        throw new ContinueSignal();
    }
  }
  async evalExpr(expr, scopes, signal) {
    switch (expr.kind) {
      case "lit":
        return expr.value;
      case "var":
        return this.findVarScope(expr.name, scopes).get(expr.name);
      case "array": {
        const out = [];
        for (const it of expr.items) out.push(await this.evalExpr(it, scopes, signal));
        return out;
      }
      case "index": {
        const arr = await this.evalExpr(expr.obj, scopes, signal);
        const idx = Number(await this.evalExpr(expr.index, scopes, signal));
        return Array.isArray(arr) ? arr[idx] : void 0;
      }
      case "member": {
        const obj = await this.evalExpr(expr.obj, scopes, signal);
        if (obj && typeof obj === "object") return obj[expr.prop];
        return void 0;
      }
      case "unary": {
        if (expr.op === "!") return !await this.evalExpr(expr.arg, scopes, signal);
        if (expr.op === "-") return -Number(await this.evalExpr(expr.arg, scopes, signal));
        if (expr.op === "+") return +Number(await this.evalExpr(expr.arg, scopes, signal));
        if ((expr.op === "++" || expr.op === "--") && expr.arg.kind === "var") {
          const sc = this.findVarScope(expr.arg.name, scopes);
          const cur = Number(sc.get(expr.arg.name) ?? 0);
          const nxt = expr.op === "++" ? cur + 1 : cur - 1;
          sc.set(expr.arg.name, nxt);
          return expr.prefix ? nxt : cur;
        }
        return 0;
      }
      case "binary": {
        if (expr.op === "&&") return Boolean(await this.evalExpr(expr.left, scopes, signal)) && Boolean(await this.evalExpr(expr.right, scopes, signal));
        if (expr.op === "||") return Boolean(await this.evalExpr(expr.left, scopes, signal)) || Boolean(await this.evalExpr(expr.right, scopes, signal));
        const l = await this.evalExpr(expr.left, scopes, signal);
        const r = await this.evalExpr(expr.right, scopes, signal);
        switch (expr.op) {
          case "+":
            return l + r;
          case "-":
            return l - r;
          case "*":
            return l * r;
          case "/":
            return r === 0 ? 0 : l / r;
          case "%":
            return l % r;
          case "==":
            return l == r;
          case "!=":
            return l != r;
          case "<":
            return l < r;
          case "<=":
            return l <= r;
          case ">":
            return l > r;
          case ">=":
            return l >= r;
        }
        return 0;
      }
      case "assign": {
        const val = await this.evalExpr(expr.right, scopes, signal);
        if (expr.left.kind === "var") {
          const sc = this.findVarScope(expr.left.name, scopes);
          const cur = sc.get(expr.left.name);
          const nxt = expr.op === "=" ? val : expr.op === "+=" ? cur + val : expr.op === "-=" ? cur - val : expr.op === "*=" ? cur * val : cur / val;
          sc.set(expr.left.name, nxt);
          return nxt;
        }
        if (expr.left.kind === "index") {
          const arr = await this.evalExpr(expr.left.obj, scopes, signal);
          const idx = Number(await this.evalExpr(expr.left.index, scopes, signal));
          if (Array.isArray(arr)) arr[idx] = val;
          return val;
        }
        return val;
      }
      case "ternary":
        return await this.evalExpr(expr.cond, scopes, signal) ? await this.evalExpr(expr.a, scopes, signal) : await this.evalExpr(expr.b, scopes, signal);
      case "call":
        return this.evalCall(expr.callee, expr.args, expr.line, scopes, signal);
    }
  }
  async evalCall(callee, argExprs, line, scopes, signal) {
    if (callee.kind === "member") {
      const obj = await this.evalExpr(callee.obj, scopes, signal);
      const args2 = [];
      for (const a of argExprs) args2.push(await this.evalExpr(a, scopes, signal));
      const fn = obj?.[callee.prop];
      if (typeof fn === "function") return fn(...args2);
      throw new ArduinoCompileError(`M\xE9todo desconocido "${callee.prop}"`, line);
    }
    if (callee.kind !== "var") return void 0;
    const name = callee.name;
    if (name === "attachInterrupt") {
      const pinArg = await this.evalExpr(argExprs[0], scopes, signal);
      const fnName = argExprs[1]?.kind === "var" ? argExprs[1].name : "";
      const pinId = normalizePinArg(pinArg, this.bridge.boardId);
      if (fnName) this.interrupts.set(pinId, { fnName, lastVal: 0 });
      return;
    }
    const args = [];
    for (const a of argExprs) args.push(await this.evalExpr(a, scopes, signal));
    switch (name) {
      case "pinMode":
        this.bridge.onPinMode?.(normalizePinArg(args[0], this.bridge.boardId), args[1]);
        return;
      case "digitalWrite":
        this.bridge.onDigitalWrite?.(normalizePinArg(args[0], this.bridge.boardId), args[1] ? 1 : 0);
        return;
      case "analogWrite":
        this.bridge.onAnalogWrite?.(normalizePinArg(args[0], this.bridge.boardId), Math.max(0, Math.min(255, Number(args[1]) || 0)));
        return;
      case "digitalRead":
        return this.bridge.onDigitalRead?.(normalizePinArg(args[0], this.bridge.boardId)) ?? 0;
      case "analogRead":
        return this.bridge.onAnalogRead?.(normalizePinArg(args[0], this.bridge.boardId)) ?? 0;
      case "pulseIn":
        return this.bridge.onPulseIn?.(normalizePinArg(args[0], this.bridge.boardId), args[1] ? 1 : 0) ?? 0;
      case "delay":
        await this.sleep(Math.max(0, Number(args[0]) || 0), signal);
        return;
      case "delayMicroseconds":
        await this.sleep(Math.max(0, (Number(args[0]) || 0) / 1e3), signal);
        return;
      case "millis":
        return Math.floor(performance.now() - this.startMs);
      case "micros":
        return Math.floor((performance.now() - this.startMs) * 1e3);
      case "tone":
        this.bridge.onTone?.(normalizePinArg(args[0], this.bridge.boardId), Number(args[1]) || 0, args[2]);
        return;
      case "noTone":
        this.bridge.onNoTone?.(normalizePinArg(args[0] ?? "", this.bridge.boardId));
        return;
      case "digitalPinToInterrupt":
        return args[0];
      case "map": {
        const [x, inMin, inMax, outMin, outMax] = args.map(Number);
        if (inMax === inMin) return outMin;
        return Math.round((x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin);
      }
      case "constrain": {
        const [x, lo, hi] = args.map(Number);
        return Math.max(lo, Math.min(hi, x));
      }
      case "min":
        return Math.min(Number(args[0]), Number(args[1]));
      case "max":
        return Math.max(Number(args[0]), Number(args[1]));
      case "abs":
        return Math.abs(Number(args[0]));
      case "pow":
        return Math.pow(Number(args[0]), Number(args[1]));
      case "sqrt":
        return Math.sqrt(Number(args[0]));
      case "random":
        return args.length === 1 ? Math.floor(Math.random() * Number(args[0])) : Math.floor(Number(args[0]) + Math.random() * (Number(args[1]) - Number(args[0])));
      case "String":
        if (args.length >= 2 && typeof args[0] === "number" && typeof args[1] === "number") {
          return Number(args[0]).toFixed(Math.max(0, Math.min(6, Math.trunc(args[1]))));
        }
        return String(args[0] ?? "");
      case "int":
        return Math.trunc(Number(args[0]) || 0);
      case "float":
        return Number(args[0]) || 0;
      default: {
        const ctor = this.findVarScope(name, scopes).get(name);
        if (typeof ctor === "function") return ctor(...args);
        if (this.funcs.has(name)) return this.callUserFunc(name, args, signal);
        throw new ArduinoCompileError(`Funci\xF3n no definida: "${name}()"`, line);
      }
    }
  }
};

// tests/simulator.test.ts
test("Netlist: breadboard column connects e5 and a5 with configurable resistor ohms", () => {
  const comps = [
    { uid: "r1", type: "resistor", position: [0, 0, 0], rotationY: 0, props: { ohms: 330 }, state: {} },
    { uid: "led1", type: "led", position: [1, 0, 0], rotationY: 0, props: { color: "green" }, state: {} }
  ];
  const wires = [
    { id: "w1", from: "board:D13", to: "bb:e5", color: "#2563eb" },
    { id: "w2", from: "bb:a5", to: "comp:r1:P1", color: "#d4a007" },
    { id: "w3", from: "comp:r1:P2", to: "comp:led1:A", color: "#c8402f" },
    { id: "w4", from: "comp:led1:K", to: "board:GND_TOP", color: "#22201c" }
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasShortCircuit, false);
  assert.equal(res.diagnostics.length, 0);
  const sig = res.findBoardSignalPin("led1", "A");
  assert.equal(sig.boardPinId, "D13");
  assert.equal(sig.viaResistorOhms, 330);
});
test("Netlist: Mission 1 snapped components on breadboard + negative rail GND", () => {
  const comps = [
    {
      uid: "r1",
      type: "resistor",
      position: [0, 0, 0],
      rotationY: 0,
      props: { ohms: 220 },
      breadboardMount: { pins: computeSnappedPinsForHole("resistor", "c8") },
      state: {}
    },
    {
      uid: "led1",
      type: "led",
      position: [1, 0, 0],
      rotationY: 0,
      props: { color: "red" },
      breadboardMount: { pins: computeSnappedPinsForHole("led", "b12") },
      state: {}
    }
  ];
  const wires = [
    { id: "w1", from: "board:D13", to: "bb:e8", color: "#2563eb" },
    { id: "w2", from: "bb:e13", to: "bb:top-13", color: "#22201c" },
    { id: "w3", from: "bb:top-2", to: "board:GND_TOP", color: "#22201c" }
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasShortCircuit, false);
  assert.equal(res.diagnostics.length, 0);
  const sig = res.findBoardSignalPin("led1", "A");
  assert.equal(sig.boardPinId, "D13");
  assert.equal(sig.viaResistorOhms, 220);
  const pwr = res.checkPowerSupply("led1", "A", "K");
  assert.equal(pwr.hasGnd, true);
});
test("Resistor color code computes IEC 4-band colors dynamically", () => {
  const b220 = resistorBandsForOhms(220);
  assert.deepEqual(b220, [14427686, 14427686, 8143640, 13934599]);
  const b10k = resistorBandsForOhms(1e4);
  assert.deepEqual(b10k, [8143640, 1315860, 16347926, 13934599]);
});
test("Netlist: detects 5V to GND short circuit", () => {
  const wires = [{ id: "w1", from: "board:5V", to: "board:GND_1", color: "#c8402f" }];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, [], wires);
  assert.equal(res.hasShortCircuit, true);
  assert.equal(res.diagnostics[0].level, "error");
});
test("Netlist: warns when BME280 (3.3V) is wired directly to Uno 5V I2C without Level Shifter", () => {
  const comps = [
    { uid: "bme1", type: "bme280", position: [0, 0, 0], rotationY: 0, props: { model: "BME280" }, state: {} }
  ];
  const wires = [
    { id: "w1", from: "board:3V3", to: "comp:bme1:VCC", color: "#d4a007" },
    { id: "w2", from: "board:GND_1", to: "comp:bme1:GND", color: "#22201c" },
    { id: "w3", from: "board:A4", to: "comp:bme1:SDA", color: "#2563eb" }
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, true);
});
test("Netlist: Level Shifter protects BME280 and validates I2C connection on Uno", () => {
  const comps = [
    { uid: "lvl1", type: "level-shifter", position: [0, 0, 0], rotationY: 0, props: {}, state: {} },
    { uid: "bme1", type: "bme280", position: [1, 0, 0], rotationY: 0, props: { model: "BME280" }, state: {} }
  ];
  const wires = [
    { id: "w1", from: "board:5V", to: "comp:lvl1:HV", color: "#c8402f" },
    { id: "w2", from: "board:3V3", to: "comp:lvl1:LV", color: "#d4a007" },
    { id: "w3", from: "board:A4", to: "comp:lvl1:HV1", color: "#2563eb" },
    { id: "w4", from: "board:A5", to: "comp:lvl1:HV2", color: "#7a4fb3" },
    { id: "w5", from: "comp:lvl1:LV1", to: "comp:bme1:SDA", color: "#2563eb" },
    { id: "w6", from: "comp:lvl1:LV2", to: "comp:bme1:SCL", color: "#7a4fb3" },
    { id: "w7", from: "comp:lvl1:LV", to: "comp:bme1:VCC", color: "#d4a007" },
    { id: "w8", from: "board:GND_1", to: "comp:bme1:GND", color: "#22201c" }
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, false);
  const sig = res.findBoardSignalPin("bme1", "SDA");
  assert.equal(sig.boardPinId, "A4");
  assert.equal(sig.viaLevelShifter, true);
  const i2c = res.checkI2CConnection("bme1", "SDA", "SCL");
  assert.equal(i2c.connected, true);
  assert.equal(i2c.viaLevelShifter, true);
});
test("Netlist: ESP32 native 3.3V works safely with BME280 without Level Shifter", () => {
  const comps = [
    { uid: "bme1", type: "bme280", position: [1, 0, 0], rotationY: 0, props: { model: "BMP280" }, state: {} }
  ];
  const wires = [
    { id: "w1", from: "board:3V3", to: "comp:bme1:VCC", color: "#d4a007" },
    { id: "w2", from: "board:GND_2", to: "comp:bme1:GND", color: "#22201c" },
    { id: "w3", from: "board:G21", to: "comp:bme1:SDA", color: "#2563eb" },
    { id: "w4", from: "board:G22", to: "comp:bme1:SCL", color: "#7a4fb3" }
  ];
  const res = analyzeNetlist(ESP32_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, false);
  assert.equal(res.checkI2CConnection("bme1", "SDA", "SCL").connected, true);
});
test("Netlist: RGB LED warns without series resistors and clears with 3 resistors", () => {
  const baseRgb = {
    uid: "rgb1",
    type: "rgb-led",
    position: [0, 0, 0],
    rotationY: 0,
    props: {},
    breadboardMount: { pins: computeSnappedPinsForHole("rgb-led", "b14") },
    state: {}
  };
  const unsafeRes = analyzeNetlist(ARDUINO_UNO_SPEC, [baseRgb], [
    { id: "w1", from: "board:D9", to: "bb:e14", color: "#c8402f" },
    { id: "w2", from: "bb:e15", to: "board:GND_TOP", color: "#22201c" }
  ]);
  assert.ok(unsafeRes.diagnostics.some((d) => d.level === "warn"));
});
test("ArduinoRuntime: compiles and runs setup/loop with Servo, BME280, DHT11, and Serial", async () => {
  const logs = [];
  let servoAngle = -1;
  let pin13 = 0;
  const rt = new ArduinoRuntime({
    boardId: "uno",
    onDigitalWrite: (pin, val) => {
      if (pin === "D13") pin13 = val;
    },
    onServoWrite: (_pin, angle) => {
      servoAngle = angle;
    },
    onSerialPrint: (t, nl) => logs.push(nl ? `${t}
` : t),
    onBmeRead: () => ({ tempC: 24.5, pressureHpa: 1010, humidity: 50, altitudeM: 28 }),
    onDhtRead: () => ({ tempC: 27.2, humidity: 61 })
  });
  const sketch = `
    #include <Servo.h>
    #include <Adafruit_BME280.h>
    #include <DHT.h>
    Servo s;
    Adafruit_BME280 bme;
    DHT dht(4, DHT11);
    void setup() {
      pinMode(13, OUTPUT);
      s.attach(9);
      Serial.begin(9600);
      bme.begin(0x76);
      dht.begin();
    }
    void loop() {
      digitalWrite(13, HIGH);
      s.write(map(512, 0, 1023, 0, 180));
      Serial.println(String(bme.readTemperature(), 1) + "|" + String(dht.readHumidity(), 0));
      delay(30);
    }
  `;
  const p = rt.start(sketch);
  await new Promise((r) => setTimeout(r, 60));
  rt.stop();
  await p;
  assert.equal(pin13, 1);
  assert.equal(servoAngle, 90);
  assert.ok(logs.some((l) => l.includes("24.5|61")));
});
test("All 20 guided missions: clean breadboard mounts, zero diagnostics, all wiring steps valid, and sketches compile", () => {
  const guided = MISSIONS.filter((m) => m.id !== "libre");
  assert.equal(guided.length, 20);
  const invalidRailCols = /* @__PURE__ */ new Set([6, 12, 18, 24, 30]);
  for (const m of guided) {
    const spec = getBoardSpec(m.boardId);
    const comps = m.components.map((c) => {
      const pins = c.snapHole ? computeSnappedPinsForHole(c.type, c.snapHole) : void 0;
      if (c.snapHole) {
        assert.ok(pins && Object.keys(pins).length > 0, `Invalid snapHole ${c.snapHole} in ${m.id}`);
      }
      return {
        uid: c.uid,
        type: c.type,
        name: c.label ?? c.type,
        position: [...c.position],
        rotationY: c.rotationY ?? 0,
        props: { ...c.props ?? {} },
        breadboardMount: pins ? { pins } : void 0,
        state: {}
      };
    });
    const wires = m.steps.map((s, idx) => {
      for (const ep of [s.from, s.to]) {
        const railMatch = /^bb:(?:top|bot)[+-](\d+)$/.exec(ep);
        if (railMatch) {
          const col = Number(railMatch[1]);
          assert.equal(invalidRailCols.has(col), false, `Mission ${m.id} uses nonexistent rail column ${ep}`);
        }
      }
      return { id: `w_${idx}`, from: s.from, to: s.to, color: s.color };
    });
    const res = analyzeNetlist(spec, comps, wires);
    assert.equal(res.hasShortCircuit, false, `Short circuit in mission ${m.id}`);
    assert.equal(res.hasVoltageDanger, false, `Voltage danger in mission ${m.id}`);
    assert.equal(
      res.diagnostics.length,
      0,
      `Diagnostics in mission ${m.id}: ${res.diagnostics.map((d) => d.title).join("; ")}`
    );
    for (const s of m.steps) {
      assert.equal(
        res.areConnected(s.from, s.to),
        true,
        `Step "${s.label}" disconnected in mission ${m.id}`
      );
    }
    const rt = new ArduinoRuntime({ boardId: m.boardId });
    rt.compile(m.code);
  }
});
