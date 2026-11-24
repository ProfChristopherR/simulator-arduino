import * as THREE from 'three';

export function buildJumperWireMesh(
  startWorld: THREE.Vector3,
  endWorld: THREE.Vector3,
  colorHex: string,
  wireIndex = 0,
  wireId?: string
): THREE.Group {
  const grp = new THREE.Group();
  const dist = startWorld.distanceTo(endWorld);
  const archHeight = Math.min(2.6, 0.55 + dist * 0.22 + (wireIndex % 4) * 0.14);

  const mid1 = new THREE.Vector3().lerpVectors(startWorld, endWorld, 0.22);
  mid1.y += archHeight;
  const mid2 = new THREE.Vector3().lerpVectors(startWorld, endWorld, 0.78);
  mid2.y += archHeight;

  const curve = new THREE.CatmullRomCurve3([startWorld.clone(), mid1, mid2, endWorld.clone()]);
  const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.036, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.42,
    metalness: 0.05,
  });
  const tube = new THREE.Mesh(tubeGeo, mat);
  tube.castShadow = true;
  if (wireId) tube.userData.wireId = wireId;

  // Capuchones plásticos en los extremos
  const capGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.2, 8);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.65 });
  const capA = new THREE.Mesh(capGeo, capMat);
  capA.position.copy(startWorld);
  const capB = new THREE.Mesh(capGeo, capMat);
  capB.position.copy(endWorld);
  if (wireId) {
    capA.userData.wireId = wireId;
    capB.userData.wireId = wireId;
  }

  grp.userData.wireTube = tube;
  grp.userData.capB = capB;
  grp.userData.totalIndices = tubeGeo.index ? tubeGeo.index.count : 0;

  grp.add(tube, capA, capB);
  return grp;
}

/** Anima suavemente el trazado del cable jumper a lo largo de la curva en Three.js */
export function animateWireMesh(grp: THREE.Group, durationMs = 240): void {
  const tube = grp.userData.wireTube as THREE.Mesh | undefined;
  const capB = grp.userData.capB as THREE.Mesh | undefined;
  const totalIndices = Number(grp.userData.totalIndices ?? 0);
  if (!tube || totalIndices <= 0) return;

  tube.geometry.setDrawRange(0, 0);
  if (capB) capB.visible = false;
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    tube.geometry.setDrawRange(0, Math.max(3, Math.floor(totalIndices * eased)));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      tube.geometry.setDrawRange(0, Infinity);
      if (capB) capB.visible = true;
    }
  };
  requestAnimationFrame(step);
}
