import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setupStudioRenderer } from './board-builder';
import { createWorkbenchEnvironment } from './desk-props';
import type { BoardSpec, BuiltBoard3D } from '../types';

export type CameraPreset = 'iso' | 'top' | 'bottom' | 'front';

export interface HeroViewerCallbacks {
  onPartSelected?: (partId: string | null) => void;
  onPartHover?: (partId: string | null) => void;
  onFootprintSelected?: (partId: string) => void;
}

export class HeroBoardViewer {
  private host: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private boardRoot = new THREE.Group();
  private built: BuiltBoard3D | null = null;
  private spec: BoardSpec | null = null;

  // Huellas y destellos dorados de soldadura en Modo Ensamblaje
  private footprintGroup = new THREE.Group();
  private footprintPads = new Map<string, { pad: THREE.Mesh; ring: THREE.Mesh; placed: boolean }>();
  private activeFootprintId: string | null = null;
  private assemblyChallenge = false;
  private solderFlashes: Array<{ mesh: THREE.Mesh; age: number; maxAge: number }> = [];
  private assemblyAnimTimer = 0;

  // Pines numerados con línea guía
  private calloutPins: Array<{
    partId: string;
    el: HTMLButtonElement;
    anchorPos: THREE.Vector3;
    headPos: THREE.Vector3;
    lineEl: SVGLineElement;
  }> = [];
  private svgOverlay: SVGSVGElement;

  private showLabels = false;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-99, -99);
  private callbacks: HeroViewerCallbacks;
  private tweenTargetPos: THREE.Vector3 | null = null;
  private tweenLookAt = new THREE.Vector3(0, 0, 0);
  private clock = new THREE.Clock();
  private rafId = 0;
  private lastHoveredPart: string | null = null;

  constructor(host: HTMLElement, callbacks: HeroViewerCallbacks = {}) {
    this.host = host;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfd6c5);
    this.scene.fog = new THREE.Fog(0xdfd6c5, 22, 48);

    this.camera = new THREE.PerspectiveCamera(
      34,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      100
    );
    this.camera.position.set(4.8, 5.1, 7.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    setupStudioRenderer(this.renderer, this.scene);

    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Visor 3D interactivo de la placa sobre escritorio de electrónica. Arrastra para girar o haz clic en un componente.'
    );
    host.appendChild(this.renderer.domElement);

    this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgOverlay.setAttribute('class', 'callout-svg-overlay');
    host.appendChild(this.svgOverlay);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 15.5;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.enablePan = false;

    const hemi = new THREE.HemisphereLight(0xfffcf5, 0x8b959e, 0.85);
    const sun = new THREE.DirectionalLight(0xfff7e6, 1.55);
    sun.position.set(-7, 13, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(0xd6e6ff, 0.45);
    fill.position.set(8, 5, -6);
    this.scene.add(hemi, sun, fill);

    this.scene.add(createWorkbenchEnvironment());
    this.boardRoot.add(this.footprintGroup);
    this.scene.add(this.boardRoot);

    this.bindEvents();
    this.animate();
  }

  public static renderBoardThumbnail(spec: BoardSpec): string {
    const size = 160;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(34, 1.4, 0.1, 40);
    cam.position.set(4.5, 4.8, 5.8);
    cam.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, Math.round(size / 1.4));
    setupStudioRenderer(renderer, scene);

    const hemi = new THREE.HemisphereLight(0xfffdf5, 0xaab4be, 1.0);
    const key = new THREE.DirectionalLight(0xfff7e8, 1.5);
    key.position.set(5, 9, 6);
    scene.add(hemi, key);

    const built = spec.build3D();
    scene.add(built.group);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.forceContextLoss();
    renderer.dispose();
    return url;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
      if (!this.built) return;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.footprintGroup.children.length > 0) {
        const fpHits = this.raycaster.intersectObjects(this.footprintGroup.children, true);
        const fp = fpHits.find((h) => h.object.userData?.footprintPartId);
        if (fp) {
          canvas.style.cursor = 'pointer';
          return;
        }
      }

      const hits = this.raycaster.intersectObjects(this.boardRoot.children, true);
      const hitPart = hits.find((h) => h.object.userData?.partId);
      const partId = hitPart?.object.userData?.partId ?? null;
      canvas.style.cursor = partId ? 'pointer' : 'grab';
      if (partId !== this.lastHoveredPart) {
        this.lastHoveredPart = partId;
        this.callbacks.onPartHover?.(partId);
      }
    });

    let downPos = { x: 0, y: 0 };
    canvas.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
      this.tweenTargetPos = null;
    });

    canvas.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6 || !this.built) return;
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.footprintGroup.children.length > 0) {
        const fpHits = this.raycaster.intersectObjects(this.footprintGroup.children, true);
        const fp = fpHits.find((h) => h.object.userData?.footprintPartId);
        if (fp) {
          this.callbacks.onFootprintSelected?.(fp.object.userData.footprintPartId);
          return;
        }
      }

      const hits = this.raycaster.intersectObjects(this.boardRoot.children, true);
      const hitPart = hits.find((h) => h.object.userData?.partId);
      const partId = hitPart?.object.userData?.partId ?? null;
      this.built.highlightPart?.(partId);
      this.callbacks.onPartSelected?.(partId);
    });

    const ro = new ResizeObserver(() => {
      const w = Math.max(1, this.host.clientWidth);
      const h = Math.max(1, this.host.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    ro.observe(this.host);
  }

  public setBoard(spec: BoardSpec): void {
    this.spec = spec;
    this.exitAssemblyVisuals();
    this.boardRoot.clear();
    this.boardRoot.add(this.footprintGroup);
    this.clearLabels();

    this.built = spec.build3D();
    this.built.group.position.y = 0.22;
    this.boardRoot.add(this.built.group);

    spec.parts.forEach((part, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'callout-pin';
      btn.textContent = String(part.num);
      btn.title = `${part.num}. ${part.name}`;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.focusPart(part.id);
        this.callbacks.onPartSelected?.(part.id);
      });
      this.host.appendChild(btn);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'callout-stem');
      this.svgOverlay.appendChild(line);

      const lift = 0.85 + (idx % 3) * 0.42;
      this.calloutPins.push({
        partId: part.id,
        el: btn,
        anchorPos: new THREE.Vector3(part.localPos[0], part.localPos[1] + 0.12, part.localPos[2]),
        headPos: new THREE.Vector3(part.localPos[0], part.localPos[1] + lift, part.localPos[2]),
        lineEl: line,
      });
    });

    this.setLabelsVisible(this.showLabels);
    this.setPreset('iso');
  }

  public setPreset(preset: CameraPreset): void {
    const map: Record<CameraPreset, THREE.Vector3> = {
      iso: new THREE.Vector3(4.8, 5.1, 7.2),
      top: new THREE.Vector3(-0.6, 9.6, 0.01),
      bottom: new THREE.Vector3(-0.6, 3.2, -7.8),
      front: new THREE.Vector3(-0.6, 2.2, 8.8),
    };
    this.tweenTargetPos = map[preset];
    this.tweenLookAt.set(-0.7, 0.1, 0);
  }

  public focusPart(partId: string): void {
    const part = this.spec?.parts.find((p) => p.id === partId);
    if (!part || !this.built) return;
    this.built.highlightPart?.(partId);
    this.calloutPins.forEach((p) => p.el.classList.toggle('is-active', p.partId === partId));
    this.tweenLookAt.set(part.localPos[0] - 0.5, part.localPos[1], part.localPos[2]);
    this.tweenTargetPos = new THREE.Vector3(
      part.localPos[0] + 2.2,
      part.localPos[1] + 3.1,
      part.localPos[2] + 3.4
    );
  }

  public highlightCallout(partId: string | null): void {
    this.built?.highlightPart?.(partId);
    this.calloutPins.forEach((p) => p.el.classList.toggle('is-active', p.partId === partId));
  }

  public setAutoRotate(val: boolean): void {
    this.controls.autoRotate = val;
    this.controls.autoRotateSpeed = 1.25;
  }

  public setLabelsVisible(val: boolean): void {
    this.showLabels = val;
    this.svgOverlay.style.display = val ? 'block' : 'none';
    for (const item of this.calloutPins) {
      item.el.style.display = val ? 'flex' : 'none';
    }
  }

  public setPartAssembled(partId: string, assembled: boolean): void {
    this.built?.setPartAssembled?.(partId, assembled);
  }

  public disassembleAll(): void {
    if (!this.spec) return;
    for (const p of this.spec.parts) this.built?.setPartAssembled?.(p.id, false);
  }

  public assembleAll(): void {
    if (!this.spec) return;
    for (const p of this.spec.parts) this.built?.setPartAssembled?.(p.id, true);
  }

  /** Inicia modo ensamblaje: crea huellas clicables sobre el PCB y desarma escalonadamente */
  public enterAssemblyVisuals(orderedPartIds: string[]): void {
    if (!this.spec) return;
    clearInterval(this.assemblyAnimTimer);
    this.footprintGroup.clear();
    this.footprintPads.clear();

    for (const part of this.spec.parts) {
      const w = Math.max(0.32, Math.min(3.2, part.size[0]));
      const d = Math.max(0.32, Math.min(2.4, part.size[2]));

      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({
          color: 0xd4a007,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(part.localPos[0], 0.105, part.localPos[2]);
      pad.userData.footprintPartId = part.id;

      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.02, d));
      const border = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xf6c101, transparent: true, opacity: 0.75 })
      );
      pad.add(border);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(w, d) * 0.42, Math.max(w, d) * 0.52, 28),
        new THREE.MeshBasicMaterial({
          color: 0xf6c101,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(part.localPos[0], 0.112, part.localPos[2]);
      ring.visible = false;

      this.footprintGroup.add(pad, ring);
      this.footprintPads.set(part.id, { pad, ring, placed: false });
    }

    // Desarmar escalonadamente desde las piezas más altas hacia las bajas
    const reverseIds = [...orderedPartIds].reverse();
    let idx = 0;
    this.assemblyAnimTimer = window.setInterval(() => {
      if (idx >= reverseIds.length) {
        clearInterval(this.assemblyAnimTimer);
        return;
      }
      this.setPartAssembled(reverseIds[idx], false);
      idx++;
    }, 38);

    this.setPreset('iso');
  }

  public setAssemblyHighlight(partId: string | null, challengeMode: boolean): void {
    this.activeFootprintId = partId;
    this.assemblyChallenge = challengeMode;
    this.footprintPads.forEach((entry, id) => {
      if (entry.placed) {
        entry.pad.visible = false;
        entry.ring.visible = false;
        return;
      }
      entry.pad.visible = true;
      const mat = entry.pad.material as THREE.MeshBasicMaterial;
      const isTarget = id === partId;
      if (challengeMode) {
        mat.color.setHex(0x94a3b8);
        mat.opacity = 0.14;
        entry.ring.visible = false;
      } else {
        mat.color.setHex(isTarget ? 0xf6c101 : 0x64748b);
        mat.opacity = isTarget ? 0.46 : 0.14;
        entry.ring.visible = isTarget;
      }
    });
  }

  public solderPart(partId: string): void {
    this.setPartAssembled(partId, true);
    const entry = this.footprintPads.get(partId);
    if (entry) {
      entry.placed = true;
      entry.pad.visible = false;
      entry.ring.visible = false;
    }

    const part = this.spec?.parts.find((p) => p.id === partId);
    if (part) {
      const flash = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.34, 28),
        new THREE.MeshBasicMaterial({
          color: 0xf6c101,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      flash.rotation.x = -Math.PI / 2;
      flash.position.set(part.localPos[0], 0.16, part.localPos[2]);
      this.boardRoot.add(flash);
      this.solderFlashes.push({ mesh: flash, age: 0, maxAge: 0.42 });
    }
  }

  public exitAssemblyVisuals(): void {
    clearInterval(this.assemblyAnimTimer);
    this.footprintGroup.clear();
    this.footprintPads.clear();
    this.activeFootprintId = null;
    this.assembleAll();
  }

  private clearLabels(): void {
    for (const item of this.calloutPins) {
      item.el.remove();
      item.lineEl.remove();
    }
    this.calloutPins = [];
  }

  private updateLabels(): void {
    if (!this.showLabels) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();

    for (const item of this.calloutPins) {
      a.copy(item.anchorPos).project(this.camera);
      b.copy(item.headPos).project(this.camera);
      if (a.z > 1 || b.z > 1) {
        item.el.style.display = 'none';
        item.lineEl.style.display = 'none';
        continue;
      }
      const ax = (a.x * 0.5 + 0.5) * w;
      const ay = (-a.y * 0.5 + 0.5) * h;
      const bx = (b.x * 0.5 + 0.5) * w;
      const by = (-b.y * 0.5 + 0.5) * h;

      item.el.style.display = 'flex';
      item.el.style.left = `${bx}px`;
      item.el.style.top = `${by}px`;

      item.lineEl.style.display = 'block';
      item.lineEl.setAttribute('x1', ax.toFixed(1));
      item.lineEl.setAttribute('y1', ay.toFixed(1));
      item.lineEl.setAttribute('x2', bx.toFixed(1));
      item.lineEl.setAttribute('y2', by.toFixed(1));
    }
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const alpha = 1 - Math.exp(-6.5 * dt);

    if (this.built) {
      this.built.group.position.y += (0 - this.built.group.position.y) * alpha;
      this.built.tickAnimation?.(dt);
    }

    // Pulso de huella activa
    if (this.activeFootprintId && !this.assemblyChallenge) {
      const active = this.footprintPads.get(this.activeFootprintId);
      if (active && !active.placed) {
        const s = 1 + 0.14 * Math.sin(performance.now() * 0.006);
        active.ring.scale.set(s, s, 1);
      }
    }

    // Animar destellos dorados al soldar
    for (let i = this.solderFlashes.length - 1; i >= 0; i--) {
      const f = this.solderFlashes[i];
      f.age += dt;
      const p = f.age / f.maxAge;
      const sc = 1 + p * 2.2;
      f.mesh.scale.set(sc, sc, 1);
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - p);
      if (p >= 1) {
        this.boardRoot.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this.solderFlashes.splice(i, 1);
      }
    }

    if (this.tweenTargetPos) {
      this.camera.position.lerp(this.tweenTargetPos, alpha);
      this.controls.target.lerp(this.tweenLookAt, alpha);
      if (this.camera.position.distanceTo(this.tweenTargetPos) < 0.03) {
        this.tweenTargetPos = null;
      }
    }

    this.controls.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    clearInterval(this.assemblyAnimTimer);
    this.clearLabels();
    this.renderer.dispose();
  }
}
