import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createSilkCanvasTexture } from '../core/board-builder';
import type { PinDef } from '../types';

// Protoboard estándar 830 puntos: 63 columnas (0.22u pitch para ajuste visual limpio en la mesa)
const COLS = 30; // Compacto de 30 columnas (400 pts) en escala 1u=1cm para excelente visibilidad 3D
const PITCH = 0.254;
const BB_W = 8.4;
const BB_H = 0.42;
const BB_D = 5.4;

export interface Breadboard3D {
  group: THREE.Group;
  holeAnchors: Map<string, THREE.Object3D>;
  holeDefs: Map<string, PinDef>;
  getTrackId: (holeId: string) => string;
  getConnectedHoles: (holeId: string) => string[];
  highlightTrack: (holeId: string | null) => void;
}

export function buildBreadboard3D(): Breadboard3D {
  const group = new THREE.Group();
  const holeAnchors = new Map<string, THREE.Object3D>();
  const holeDefs = new Map<string, PinDef>();
  const trackToHoles = new Map<string, string[]>();
  const holeToTrack = new Map<string, string>();
  const holeMeshes = new Map<string, THREE.Mesh>();

  // Cuerpo plástico ABS blanco cálido
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(BB_W, BB_H, BB_D, 2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.52, metalness: 0.02 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Canal central DIP
  const channel = new THREE.Mesh(
    new THREE.BoxGeometry(BB_W - 0.3, 0.04, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xded9cc, roughness: 0.7 })
  );
  channel.position.y = BB_H * 0.5 - 0.01;
  group.add(channel);

  // Serigrafía de filas, columnas y líneas +/-
  const silkTex = createSilkCanvasTexture(1024, 660, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    // Líneas rieles superior
    ctx.strokeStyle = '#c8402f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(46, 36);
    ctx.lineTo(w - 46, 36);
    ctx.stroke();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(46, 108);
    ctx.lineTo(w - 46, 108);
    ctx.stroke();

    // Líneas rieles inferior
    ctx.strokeStyle = '#c8402f';
    ctx.beginPath();
    ctx.moveTo(46, h - 108);
    ctx.lineTo(w - 46, h - 108);
    ctx.stroke();

    ctx.strokeStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(46, h - 36);
    ctx.lineTo(w - 46, h - 36);
    ctx.stroke();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#c8402f';
    ctx.fillText('+', 18, 52);
    ctx.fillText('+', 18, h - 92);
    ctx.fillStyle = '#2563eb';
    ctx.fillText('-', 20, 100);
    ctx.fillText('-', 20, h - 22);

    ctx.fillStyle = '#4a463d';
    ctx.font = 'bold 16px monospace';
    for (let c = 1; c <= COLS; c += 5) {
      const px = 64 + (c - 1) * ((w - 128) / (COLS - 1));
      ctx.fillText(String(c), px - 6, 152);
      ctx.fillText(String(c), px - 6, h - 138);
    }
  });
  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(BB_W, BB_D),
    new THREE.MeshBasicMaterial({ map: silkTex, transparent: true })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = BB_H * 0.5 + 0.004;
  group.add(silk);

  const holeGeo = new THREE.BoxGeometry(0.11, 0.03, 0.11);
  const baseHoleMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.85 });
  const anchorGeo = new THREE.SphereGeometry(0.075, 8, 8);

  const registerHole = (
    id: string,
    label: string,
    trackId: string,
    x: number,
    z: number,
    category: PinDef['category']
  ) => {
    const holeMesh = new THREE.Mesh(holeGeo, baseHoleMat.clone());
    holeMesh.position.set(x, BB_H * 0.5 + 0.01, z);
    group.add(holeMesh);
    holeMeshes.set(id, holeMesh);

    const anchor = new THREE.Mesh(
      anchorGeo,
      new THREE.MeshStandardMaterial({ color: 0xd4a007, transparent: true, opacity: 0 })
    );
    anchor.position.set(x, BB_H * 0.5 + 0.08, z);
    anchor.userData = { bbHoleId: id, trackId };
    group.add(anchor);
    holeAnchors.set(id, anchor);

    holeToTrack.set(id, trackId);
    const list = trackToHoles.get(trackId) ?? [];
    list.push(id);
    trackToHoles.set(trackId, list);

    holeDefs.set(id, {
      id,
      label,
      category,
      voltage: 0,
      localPos: [x, BB_H * 0.5 + 0.08, z],
      description: `Protoboard punto ${label} (pista ${trackId})`,
    });
  };

  const startX = -((COLS - 1) * PITCH) / 2;

  // Rieles de alimentación superior e inferior (25 puntos en grupos de 5 con saltos)
  for (let c = 0; c < COLS; c++) {
    if (c % 6 === 5) continue; // separación visual estilo protoboard
    const colNum = c + 1;
    const x = startX + c * PITCH;
    registerHole(`top+${colNum}`, `Riel Sup + (${colNum})`, 'rail_top_plus', x, -2.15, 'pwr');
    registerHole(`top-${colNum}`, `Riel Sup - (${colNum})`, 'rail_top_minus', x, -1.85, 'gnd');
    registerHole(`bot+${colNum}`, `Riel Inf + (${colNum})`, 'rail_bot_plus', x, 1.85, 'pwr');
    registerHole(`bot-${colNum}`, `Riel Inf - (${colNum})`, 'rail_bot_minus', x, 2.15, 'gnd');
  }

  // Zonas centrales a-e (arriba) y f-j (abajo)
  const topRows = ['e', 'd', 'c', 'b', 'a'];
  const botRows = ['f', 'g', 'h', 'i', 'j'];

  for (let c = 0; c < COLS; c++) {
    const colNum = c + 1;
    const x = startX + c * PITCH;
    topRows.forEach((row, rIdx) => {
      const z = -1.35 + rIdx * 0.24;
      registerHole(`${row}${colNum}`, `${row}${colNum}`, `top_${colNum}`, x, z, 'dig');
    });
    botRows.forEach((row, rIdx) => {
      const z = 0.39 + rIdx * 0.24;
      registerHole(`${row}${colNum}`, `${row}${colNum}`, `bot_${colNum}`, x, z, 'dig');
    });
  }

  return {
    group,
    holeAnchors,
    holeDefs,
    getTrackId(holeId: string) {
      return holeToTrack.get(holeId) ?? holeId;
    },
    getConnectedHoles(holeId: string) {
      const tr = holeToTrack.get(holeId);
      return tr ? trackToHoles.get(tr) ?? [holeId] : [holeId];
    },
    highlightTrack(holeId: string | null) {
      holeMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x1b1c1f);
        mat.emissive.setHex(0x000000);
      });
      if (!holeId) return;
      const track = holeToTrack.get(holeId);
      if (!track) return;
      for (const id of trackToHoles.get(track) ?? []) {
        const m = holeMeshes.get(id);
        if (m) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x2c7a4b);
          mat.emissive.setHex(0x2c7a4b);
          mat.emissiveIntensity = 0.7;
        }
      }
    },
  };
}
