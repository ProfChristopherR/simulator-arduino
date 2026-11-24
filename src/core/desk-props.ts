import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT, createSilkCanvasTexture } from './board-builder';

/**
 * Escenario realista de escritorio de electrónica (tapete ESD azul-gris con grilla métrica,
 * mesa de madera cálida, puntas de multímetro, carrete de estaño, cable USB, LED suelto,
 * pinzas metálicas y esquina de protoboard).
 */
export function createWorkbenchEnvironment(): THREE.Group {
  const env = new THREE.Group();
  env.position.y = -0.14;

  // 1. Mesa de madera cálida de fondo
  const woodTex = createSilkCanvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#d9c19c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(155, 118, 72, 0.08)' : 'rgba(255, 245, 224, 0.07)';
      ctx.fillRect(0, (i / 180) * h, w, 4 + (i % 5));
    }
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 2);

  const woodDesk = new THREE.Mesh(
    new THREE.BoxGeometry(64, 0.8, 44),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78, metalness: 0.02 })
  );
  woodDesk.position.set(0, -0.45, -2);
  woodDesk.receiveShadow = true;
  env.add(woodDesk);

  // 2. Tapete de corte / ESD azul-gris con grilla métrica nítida
  const matTex = createSilkCanvasTexture(2048, 1360, (ctx, w, h) => {
    ctx.fillStyle = '#6f818c';
    ctx.fillRect(0, 0, w, h);

    // Sutil textura mate
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < 600; i++) {
      ctx.fillRect((i * 197) % w, (i * 313) % h, 3, 3);
    }

    const pad = 76;
    const step = 64;
    ctx.strokeStyle = 'rgba(235, 244, 248, 0.24)';
    ctx.lineWidth = 2;
    for (let x = pad; x <= w - pad; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
    }
    for (let y = pad; y <= h - pad; y += step) {
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    // Marco exterior y marcas de ángulo
    ctx.strokeStyle = 'rgba(235, 244, 248, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    ctx.fillStyle = 'rgba(235, 244, 248, 0.35)';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('ESD WORK MAT · LICEO SAN NICOLÁS · GEOGO', pad + 18, h - pad - 18);
  });

  const esdMat = new THREE.Mesh(
    new RoundedBoxGeometry(34, 0.08, 22, 2, 0.03),
    new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.86, metalness: 0.03 })
  );
  esdMat.position.set(0.5, -0.02, 1.5);
  esdMat.receiveShadow = true;
  env.add(esdMat);

  // 3. Carrete de soldadura (arriba-centro)
  const spool = new THREE.Group();
  const flangeGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.14, 32);
  const flangeMat = new THREE.MeshStandardMaterial({ color: 0xebe8e0, roughness: 0.42 });
  const fBot = new THREE.Mesh(flangeGeo, flangeMat);
  fBot.position.y = 0.07;
  const fTop = new THREE.Mesh(flangeGeo, flangeMat);
  fTop.position.y = 2.05;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 1.9, 28), MAT.brushedMetal());
  core.position.y = 1.06;
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 2.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.8 })
  );
  hole.position.y = 1.06;
  // Hilo de estaño saliendo del carrete
  const solderCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.15, 0.5, 0.2),
    new THREE.Vector3(2.2, 0.15, 1.3),
    new THREE.Vector3(3.6, 0.06, 1.9),
  ]);
  const solderWire = new THREE.Mesh(
    new THREE.TubeGeometry(solderCurve, 20, 0.035, 8, false),
    MAT.metal()
  );
  spool.add(fBot, fTop, core, hole, solderWire);
  spool.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  spool.position.set(0.4, 0.02, -7.2);
  env.add(spool);

  // 4. Multímetro amarillo (esquina superior derecha) + puntas de prueba roja y negra
  const multi = new THREE.Mesh(
    new RoundedBoxGeometry(4.6, 1.15, 6.2, 3, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd9a834, roughness: 0.48 })
  );
  multi.position.set(10.8, 0.58, -5.8);
  multi.rotation.y = -0.22;
  multi.castShadow = true;
  env.add(multi);

  const makeProbe = (colorHex: number, x: number, z: number, rotY: number) => {
    const grp = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 3.8, 16),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.42 })
    );
    handle.rotation.z = Math.PI / 2;
    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 })
    );
    guard.rotation.z = Math.PI / 2;
    guard.position.x = -1.6;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 1.2, 12), MAT.metal());
    tip.rotation.z = Math.PI / 2;
    tip.position.x = -2.45;
    const leadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.9, 0, 0),
      new THREE.Vector3(4.2, -0.05, 0.4),
      new THREE.Vector3(7.0, -0.08, 1.2),
    ]);
    const lead = new THREE.Mesh(
      new THREE.TubeGeometry(leadCurve, 18, 0.095, 10, false),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55 })
    );
    grp.add(handle, guard, tip, lead);
    grp.position.set(x, 0.28, z);
    grp.rotation.y = rotY;
    grp.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    return grp;
  };
  env.add(makeProbe(0xb84035, 6.2, -4.4, -0.58));
  env.add(makeProbe(0x282b30, 7.6, -5.0, -0.52));

  // 5. Cable USB blanco + LED rojo suelto (izquierda)
  const usbProp = new THREE.Group();
  const plugBody = new THREE.Mesh(
    new RoundedBoxGeometry(1.5, 0.52, 0.72, 2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xe6e1d6, roughness: 0.48 })
  );
  const plugTip = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.24, 0.48, 2, 0.03), MAT.metal());
  plugTip.position.x = 0.95;
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.75, 0, 0),
    new THREE.Vector3(-3.4, -0.05, 0.6),
    new THREE.Vector3(-7.2, -0.06, 1.9),
  ]);
  const cord = new THREE.Mesh(
    new THREE.TubeGeometry(cordCurve, 22, 0.14, 10, false),
    new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.55 })
  );
  usbProp.add(plugBody, plugTip, cord);
  usbProp.position.set(-5.8, 0.28, 2.2);
  usbProp.rotation.y = 0.18;
  usbProp.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  env.add(usbProp);

  // LED rojo suelto sobre el tapete
  const looseLed = new THREE.Group();
  const ledMat = new THREE.MeshPhysicalMaterial({
    color: 0xd93829,
    roughness: 0.18,
    clearcoat: 0.7,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), ledMat);
  dome.position.x = -0.3;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 18), ledMat);
  cyl.rotation.z = Math.PI / 2;
  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), MAT.metal());
  leg1.rotation.z = Math.PI / 2;
  leg1.position.set(0.95, 0, 0.07);
  const leg2 = leg1.clone();
  leg2.position.set(0.85, 0, -0.07);
  looseLed.add(dome, cyl, leg1, leg2);
  looseLed.position.set(-5.5, 0.26, -0.2);
  looseLed.rotation.y = 0.28;
  looseLed.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  env.add(looseLed);

  // 6. Esquina de protoboard blanca con cable jumper (abajo-derecha)
  const miniBb = new THREE.Group();
  const bbBody = new THREE.Mesh(
    new RoundedBoxGeometry(5.6, 0.42, 3.8, 2, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5 })
  );
  bbBody.position.y = 0.21;
  bbBody.castShadow = true;
  bbBody.receiveShadow = true;
  miniBb.add(bbBody);

  const wireCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0.12, -0.4),
    new THREE.Vector3(-2.6, 1.0, -0.6),
    new THREE.Vector3(-1.1, 0.46, -0.3),
  ]);
  const jWire = new THREE.Mesh(
    new THREE.TubeGeometry(wireCurve, 18, 0.06, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.5 })
  );
  jWire.castShadow = true;
  miniBb.add(jWire);
  miniBb.position.set(8.6, 0.02, 4.4);
  miniBb.rotation.y = 0.12;
  env.add(miniBb);

  return env;
}
