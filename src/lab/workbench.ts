import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

import { getBoardSpec } from '../boards/registry';
import { audio } from '../core/audio';
import { createSilkCanvasTexture, setupStudioRenderer } from '../core/board-builder';
import { setSlotIcon } from '../core/icons';
import { lofi, type LofiState } from '../core/lofi';
import type {
  BoardId,
  BoardSpec,
  BuiltBoard3D,
  ComponentType,
  PinCategory,
  PlacedComponent,
  WireDef,
} from '../types';
import { buildBreadboard3D, type Breadboard3D } from './breadboard';
import {
  COMPONENT_CATALOG,
  LED_COLORS,
  buildComponent3D,
  formatOhms,
  getCatalogItem,
  renderComponentThumbnails,
  type BuiltComponent3D,
} from './components/catalog';
import { MISSIONS } from './missions';
import {
  THROUGH_HOLE_TYPES,
  analyzeNetlist,
  type NetlistAnalysis,
} from './netlist';
import { ArduinoCompileError, ArduinoRuntime } from './simulator/runtime';
import { getInstalledLibraryIds, installLibrary, searchLibraries, uninstallLibrary } from './simulator/libraries';
import { ViewCubeGizmo, type CubeViewPreset } from './view-cube';
import { animateWireMesh, buildJumperWireMesh } from './wiring';

const COMPLETED_STORAGE_KEY = 'geogo_completed_missions_v1';

const CODE_THEME = HighlightStyle.define([
  { tag: tags.keyword, color: '#93c5fd' },
  { tag: tags.typeName, color: '#fbbf24' },
  { tag: tags.number, color: '#fca5a5' },
  { tag: tags.string, color: '#86efac' },
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#f9a8d4' },
]);

const CAT_COLORS: Record<PinCategory, string> = {
  pwr: '#e04f3d',
  gnd: '#6b7280',
  dig: '#3b82f6',
  ana: '#22c55e',
  com: '#a855f7',
  ctl: '#f59e0b',
};

interface PinTargetInfo {
  endpoint: string;
  obj: THREE.Object3D;
  shortLabel: string;
  title: string;
  desc: string;
  owner: string;
  category: PinCategory;
}

type DragTarget =
  | { kind: 'board' }
  | { kind: 'breadboard' }
  | { kind: 'comp'; uid: string };

export class WorkbenchController {
  private host: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private boardId: BoardId = 'uno';
  private boardSpec: BoardSpec = getBoardSpec('uno');
  private builtBoard: BuiltBoard3D | null = null;
  private boardGroup = new THREE.Group();

  private showBreadboard = true;
  private breadboard: Breadboard3D;
  private bbGroup = new THREE.Group();

  private components: PlacedComponent[] = [];
  private builtComponents = new Map<string, BuiltComponent3D>();
  private compGroup = new THREE.Group();

  private selectedTarget: DragTarget | null = null;
  private draggingTarget: DragTarget | null = null;
  private dragOffset = new THREE.Vector3();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragMoved = false;

  private wires: WireDef[] = [];
  private wireGroup = new THREE.Group();
  private activeWireColor = '#c8402f';
  private pendingPinStart: string | null = null;

  private pinWorldTargets: PinTargetInfo[] = [];
  private hoveredPinObj: THREE.Object3D | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-99, -99);

  private currentMission = MISSIONS[0];
  private completedMissions = new Set<string>();
  private animToken = 0;

  private editorView: EditorView;
  private runtime: ArduinoRuntime | null = null;
  private isRunning = false;
  private netlist: NetlistAnalysis | null = null;
  private warnedNoI2c = false;

  // Marcadores guía: cableado (naranja) y colocación de pieza (azul/dorado)
  private guideBadgeEls: Array<{
    endpoint?: string;
    worldPos?: THREE.Vector3;
    badge: HTMLElement;
    ring: HTMLElement;
  }> = [];

  private pinStates = new Map<string, number>();
  private serialRxQueue: string[] = [];
  private rafId = 0;

  private viewCube: ViewCubeGizmo | null = null;
  private cameraTweenTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private paletteThumbs = new Map<ComponentType, string>();
  private activeKnobDrag: {
    uid: string;
    startX: number;
    startY: number;
    startVal: number;
    startValY: number;
    kind: 'pot' | 'joy';
  } | null = null;
  private lastIrCommand: number | null = null;
  private rfidCardPresent = false;
  private stepperAngleDeg = 0;

  private undoStack: Array<{
    components: PlacedComponent[];
    wires: WireDef[];
    boardPos: [number, number, number];
    boardRot: number;
    bbPos: [number, number, number];
    bbRot: number;
  }> = [];
  private redoStack: Array<{
    components: PlacedComponent[];
    wires: WireDef[];
    boardPos: [number, number, number];
    boardRot: number;
    bbPos: [number, number, number];
    bbRot: number;
  }> = [];

  constructor(host: HTMLElement) {
    this.host = host;
    this.loadCompletedMissions();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfd6c5);

    this.camera = new THREE.PerspectiveCamera(
      36,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      120
    );
    this.camera.position.set(-0.6, 14.5, 13.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    setupStudioRenderer(this.renderer, this.scene);

    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Mesa de trabajo 3D interactiva sobre tapete ESD. Arrastra placa, protoboard o sensores para moverlos.'
    );
    host.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(-0.6, 0, 0);
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;

    const hemi = new THREE.HemisphereLight(0xfffdf5, 0x5c6e7a, 0.45);
    const sun = new THREE.DirectionalLight(0xfff6e3, 2.05);
    sun.position.set(-8, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(0xd6e6ff, 0.24);
    fill.position.set(10, 6, -6);
    this.scene.add(hemi, sun, fill);

    this.buildEsdWorkbenchSurface();

    this.boardGroup.position.set(-5.4, 0.09, 0);
    this.bbGroup.position.set(3.2, 0.21, 0);
    this.breadboard = buildBreadboard3D();
    this.breadboard.group.traverse((c) => {
      if (!c.userData.bbHoleId) c.userData.dragKind = 'breadboard';
    });
    this.bbGroup.add(this.breadboard.group);

    this.scene.add(this.boardGroup, this.bbGroup, this.compGroup, this.wireGroup);

    const editorHost = document.getElementById('code-editor-host')!;
    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.currentMission.code,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          cpp(),
          syntaxHighlighting(CODE_THEME),
        ],
      }),
      parent: editorHost,
    });

    const vcHost = document.getElementById('wb-viewcube-host');
    if (vcHost) {
      this.viewCube = new ViewCubeGizmo(vcHost, this.camera, this.controls, (preset) => {
        this.setCameraPreset(preset);
      });
    }

    this.paletteThumbs = renderComponentThumbnails();
    this.renderPalette();
    this.renderLibraryDrawer();
    this.populateMissions();
    this.bindUI();
    this.bind3DEvents();
    this.setBoard('uno');
    this.loadMission(MISSIONS[0].id);
    this.animate();
  }

  private setCameraPreset(preset: CubeViewPreset): void {
    const target = new THREE.Vector3(-0.6, 0, 0);
    const map: Record<CubeViewPreset, THREE.Vector3> = {
      iso: new THREE.Vector3(-0.6, 14.5, 13.8),
      top: new THREE.Vector3(-0.6, 18.0, 0.05),
      bottom: new THREE.Vector3(-0.6, 3.2, -14.5),
      front: new THREE.Vector3(-0.6, 4.2, 16.5),
      back: new THREE.Vector3(-0.6, 4.2, -16.5),
      left: new THREE.Vector3(-17.0, 5.2, 0),
      right: new THREE.Vector3(15.8, 5.2, 0),
    };
    this.cameraTweenTarget = { pos: map[preset], look: target };
    this.controls.target.copy(target);
  }

  private guardNotRunning(actionLabel: string): boolean {
    if (!this.isRunning) return false;
    const hint = document.getElementById('wb-pin-hint');
    if (hint) {
      hint.textContent = `Simulación activa: detén la simulación antes de ${actionLabel} (sin hot-swap).`;
    }
    audio.playClick(300, 35);
    return true;
  }

  private loadCompletedMissions(): void {
    try {
      const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) list.forEach((id) => this.completedMissions.add(String(id)));
      }
    } catch {}
  }

  private markMissionCompleted(id: string): void {
    if (id === 'libre' || this.completedMissions.has(id)) return;
    this.completedMissions.add(id);
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify([...this.completedMissions]));
    } catch {}
    this.populateMissions();
    const sel = document.getElementById('mission-select') as HTMLSelectElement | null;
    if (sel) sel.value = this.currentMission.id;
  }

  private buildEsdWorkbenchSurface(): void {
    const wood = new THREE.Mesh(
      new THREE.BoxGeometry(56, 0.6, 38),
      new THREE.MeshStandardMaterial({ color: 0xd9c29e, roughness: 0.78 })
    );
    wood.position.set(0, -0.38, 0);
    wood.receiveShadow = true;
    this.scene.add(wood);

    const matTex = createSilkCanvasTexture(2048, 1360, (ctx, w, h) => {
      ctx.fillStyle = '#5e717d';
      ctx.fillRect(0, 0, w, h);
      const pad = 48;
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
      ctx.strokeStyle = 'rgba(235, 244, 248, 0.42)';
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    });

    const esdMat = new THREE.Mesh(
      new RoundedBoxGeometry(28, 0.08, 18, 2, 0.03),
      new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.85, metalness: 0.03 })
    );
    esdMat.position.set(0, -0.04, 0);
    esdMat.receiveShadow = true;
    this.scene.add(esdMat);
  }

  public setBoard(id: BoardId): void {
    this.stopSimulation();
    this.boardId = id;
    this.boardSpec = getBoardSpec(id);
    this.boardGroup.clear();
    this.builtBoard = this.boardSpec.build3D({ forWorkbench: true });
    this.builtBoard.group.traverse((c) => {
      if (!c.userData.pinId) c.userData.dragKind = 'board';
    });
    this.boardGroup.add(this.builtBoard.group);
    this.rebuildPinTargets();
    this.rebuildWires();
    this.updateDiagnostics();
    this.refreshGuideBadges();
  }

  private renderPalette(filterQuery = ''): void {
    const root = document.getElementById('wb-palette')!;
    const thumbs = this.paletteThumbs;
    const q = filterQuery.trim().toLowerCase();
    const categories = [
      'Prototipado e Interfaz',
      'Pasivos y Básicos',
      'Salidas y Pantallas',
      'Sensores Kit XL y Geogo',
      'Actuadores',
    ] as const;

    root.innerHTML = '';
    let totalShown = 0;

    for (const cat of categories) {
      const items = COMPONENT_CATALOG.filter((c) => {
        if (c.category !== cat) return false;
        if (!q) return true;
        const haystack = `${c.name} ${c.shortDesc} ${c.category} ${c.type} ${(c.keywords ?? []).join(' ')}`.toLowerCase();
        return haystack.includes(q);
      });
      if (items.length === 0) continue;
      totalShown += items.length;

      const sec = document.createElement('section');
      sec.innerHTML = `<h4 class="palette-group-title">${cat}</h4><div class="palette-items"></div>`;
      const list = sec.querySelector('.palette-items')!;

      for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-btn';
        const is33 = item.voltageBadge === '3.3V';
        const thumbUrl = thumbs.get(item.type) ?? '';
        btn.innerHTML = `
          <img class="palette-thumb" src="${thumbUrl}" alt="${item.name}" width="44" height="36" />
          <div class="palette-btn-body">
            <div class="palette-btn-head">
              <strong>${item.name}</strong>
              <span class="volt-tag ${is33 ? 'v33' : ''}">${item.voltageBadge}</span>
            </div>
            <small>${item.shortDesc}</small>
          </div>
        `;
        btn.addEventListener('click', () => {
          this.addComponentToBench(item.type);
        });
        list.appendChild(btn);
      }
      root.appendChild(sec);
    }

    if (totalShown === 0) {
      root.innerHTML = `<p class="palette-empty-note">No hay componentes que coincidan con "${filterQuery}".</p>`;
    }
  }

  private renderLibraryDrawer(query = ''): void {
    const listEl = document.getElementById('wb-lib-list');
    if (!listEl) return;
    const installed = getInstalledLibraryIds();
    const libs = searchLibraries(query);
    listEl.innerHTML = '';

    if (libs.length === 0) {
      listEl.innerHTML = `<p class="palette-empty-note">Sin resultados para "${query}".</p>`;
      return;
    }

    for (const lib of libs) {
      const isInst = installed.has(lib.id);
      const card = document.createElement('div');
      card.className = 'lib-item';
      card.innerHTML = `
        <div class="lib-item-top">
          <strong>${lib.name} <code>&lt;${lib.header}&gt;</code></strong>
          <span class="lib-ver">v${lib.version} · ${lib.author}</span>
        </div>
        <p>${lib.description}</p>
        <div class="lib-item-actions">
          <div>
            ${isInst ? `<span class="lib-badge">${lib.preinstalled ? 'Core incluida' : 'En caché local'}</span>` : ''}
          </div>
          <div style="display:flex;gap:5px">
            ${
              isInst
                ? `<button type="button" class="wb-mini-btn wb-mini-btn-primary" data-lib-include="${lib.id}">+ #include</button>`
                : ''
            }
            ${
              lib.preinstalled
                ? ''
                : isInst
                  ? `<button type="button" class="wb-mini-btn ci-btn-danger" data-lib-uninstall="${lib.id}">Quitar</button>`
                  : `<button type="button" class="wb-mini-btn wb-mini-btn-primary" data-lib-install="${lib.id}">Instalar en caché</button>`
            }
          </div>
        </div>
      `;
      listEl.appendChild(card);
    }

    listEl.querySelectorAll<HTMLButtonElement>('[data-lib-install]').forEach((btn) => {
      btn.addEventListener('click', () => {
        installLibrary(btn.dataset.libInstall!);
        audio.playSuccess();
        const searchVal = (document.getElementById('wb-lib-search') as HTMLInputElement | null)?.value ?? '';
        this.renderLibraryDrawer(searchVal);
      });
    });

    listEl.querySelectorAll<HTMLButtonElement>('[data-lib-uninstall]').forEach((btn) => {
      btn.addEventListener('click', () => {
        uninstallLibrary(btn.dataset.libUninstall!);
        audio.playClick(400, 30);
        const searchVal = (document.getElementById('wb-lib-search') as HTMLInputElement | null)?.value ?? '';
        this.renderLibraryDrawer(searchVal);
      });
    });

    listEl.querySelectorAll<HTMLButtonElement>('[data-lib-include]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lib = searchLibraries('').find((l) => l.id === btn.dataset.libInclude);
        if (!lib) return;
        const cur = this.editorView.state.doc.toString();
        if (!cur.includes(lib.header)) {
          this.editorView.dispatch({
            changes: { from: 0, to: 0, insert: `${lib.snippetInclude}\n` },
          });
        }
        audio.playSnapClick();
      });
    });
  }

  private populateMissions(): void {
    const sel = document.getElementById('mission-select') as HTMLSelectElement;
    const prev = sel.value;
    sel.innerHTML = '';

    const groups: Array<{ label: string; match: (d: string, id: string) => boolean }> = [
      { label: 'Inicial · Arduino Uno R3', match: (d, id) => d === 'Inicial' && id !== 'libre' },
      { label: 'Intermedio · Sensores y Actuadores', match: (d) => d === 'Intermedio' },
      { label: 'Avanzado · Tecnología Geogo', match: (d) => d === 'Avanzado' },
      { label: 'ESP32 DevKit V1 (3.3 V)', match: (d) => d.startsWith('ESP32') },
      { label: 'Laboratorio Abierto', match: (_d, id) => id === 'libre' },
    ];

    for (const g of groups) {
      const og = document.createElement('optgroup');
      og.label = g.label;
      for (const m of MISSIONS.filter((x) => g.match(x.difficulty, x.id))) {
        const opt = document.createElement('option');
        opt.value = m.id;
        const doneMark = this.completedMissions.has(m.id) ? '✓ ' : '';
        opt.textContent = `${doneMark}${m.title}`;
        og.appendChild(opt);
      }
      if (og.children.length > 0) sel.appendChild(og);
    }

    if (prev) sel.value = prev;
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', () => this.loadMission(sel.value));
    }

    const totalGuided = MISSIONS.filter((m) => m.id !== 'libre').length;
    const progEl = document.getElementById('mission-progress');
    if (progEl) {
      progEl.textContent = `${this.completedMissions.size} / ${totalGuided} completadas`;
    }
  }

  /** Carga una misión con MESA LIMPIA (Fase 1: Colocar piezas -> Fase 2: Cablear) */
  public loadMission(missionId: string): void {
    this.animToken++;
    this.stopSimulation();
    const m = MISSIONS.find((x) => x.id === missionId) ?? MISSIONS[0];
    this.currentMission = m;

    const sel = document.getElementById('mission-select') as HTMLSelectElement;
    sel.value = m.id;
    document.getElementById('mission-meta')!.textContent = `${m.difficulty} · ${m.duration}`;

    this.boardGroup.position.set(-5.4, 0.09, 0);
    this.boardGroup.rotation.y = 0;
    this.bbGroup.position.set(3.2, 0.21, 0);
    this.bbGroup.rotation.y = 0;

    if (m.boardId !== this.boardId) {
      this.setBoard(m.boardId);
    }

    this.showBreadboard = m.useBreadboard;
    this.bbGroup.visible = this.showBreadboard;
    document.getElementById('wb-toggle-bb-btn')?.setAttribute('aria-pressed', String(this.showBreadboard));

    // Mesa limpia al iniciar cada misión para guiar paso a paso
    this.components = [];
    this.wires = [];
    this.pendingPinStart = null;
    this.selectTarget(null);

    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: m.code },
    });
    document.getElementById('code-filename')!.textContent = `${m.id}.ino`;

    const isFree = m.id === 'libre';
    const placeBtn = document.getElementById('wb-place-all-btn') as HTMLButtonElement | null;
    const wireBtn = document.getElementById('wb-autowire-btn') as HTMLButtonElement | null;
    if (placeBtn) placeBtn.hidden = isFree;
    if (wireBtn) wireBtn.hidden = isFree;

    const statusText = document.getElementById('wb-sim-status-text');
    if (statusText) {
      statusText.textContent = isFree
        ? 'Laboratorio Libre listo'
        : 'Mesa limpia · Fase 1: Colocar piezas';
    }

    const hint = document.getElementById('wb-pin-hint');
    if (hint) {
      hint.textContent = isFree
        ? 'Añade componentes desde la izquierda y traza cables entre sus pines.'
        : 'Paso 1: coloca los componentes con "Colocar piezas" o uno a uno desde el panel derecho.';
    }

    this.rebuildComponents();
    this.rebuildWires();
    this.renderStepsPanel();
    this.renderEnvControls();
    this.renderTryItCard();
    this.updateDiagnostics();
    this.refreshGuideBadges();
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Coloca un componente especificado por la misión con animación de caída y encaje en protoboard */
  public placeMissionComponent(uid: string, animate = true): PlacedComponent | null {
    const existing = this.components.find((c) => c.uid === uid);
    if (existing) return existing;

    const spec = this.currentMission.components.find((c) => c.uid === uid);
    if (!spec) return null;

    const item = getCatalogItem(spec.type);
    const comp: PlacedComponent = {
      uid: spec.uid,
      type: spec.type,
      name: spec.label ?? item.name,
      position: [...spec.position],
      rotationY: spec.rotationY ?? 0,
      props: { ...item.defaultProps, ...(spec.props ?? {}) },
      state: this.defaultComponentState(spec.type),
    };
    this.components.push(comp);
    this.rebuildComponents();

    if (THROUGH_HOLE_TYPES.has(comp.type)) {
      this.snapComponentToBreadboard(comp, spec.snapHole);
    }
    this.rebuildPinTargets();

    const built = this.builtComponents.get(comp.uid);
    if (animate && built) {
      const targetY = comp.position[1];
      built.group.position.y = targetY + 1.85;
      const start = performance.now();
      const dur = 260;
      const animDrop = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        built.group.position.y = targetY + (1 - eased) * 1.85;
        if (t < 1) {
          requestAnimationFrame(animDrop);
        } else {
          built.group.position.y = targetY;
          audio.playSnapClick();
        }
      };
      requestAnimationFrame(animDrop);
    } else {
      audio.playSnapClick();
    }

    this.renderStepsPanel();
    this.renderEnvControls();
    this.renderTryItCard();
    this.updateDiagnostics();
    this.refreshGuideBadges();
    return comp;
  }

  private async placeAllMissionComponents(): Promise<void> {
    if (this.guardNotRunning('colocar piezas')) return;
    const token = this.animToken;
    const missing = this.currentMission.components.filter(
      (mc) => !this.components.some((c) => c.uid === mc.uid)
    );
    if (missing.length === 0) return;

    this.pushHistory();
    for (let i = 0; i < missing.length; i++) {
      if (token !== this.animToken) return;
      this.placeMissionComponent(missing[i].uid, true);
      if (i < missing.length - 1) {
        await new Promise((r) => setTimeout(r, 230));
      }
    }
    if (token === this.animToken) {
      const st = document.getElementById('wb-sim-status-text');
      if (st) st.textContent = 'Fase 2: Cablear el circuito';
    }
  }

  private async autoWireMission(): Promise<void> {
    if (this.guardNotRunning('cablear el circuito')) return;
    const token = this.animToken;
    this.pushHistory();

    // Fase 1 automática si faltan componentes
    const missingComps = this.currentMission.components.filter(
      (mc) => !this.components.some((c) => c.uid === mc.uid)
    );
    for (const mc of missingComps) {
      if (token !== this.animToken) return;
      this.placeMissionComponent(mc.uid, true);
      await new Promise((r) => setTimeout(r, 210));
    }

    // Fase 2 animada: agregar cada cable pendiente uno por uno
    const analysis = analyzeNetlist(this.boardSpec, this.components, this.wires);
    for (let idx = 0; idx < this.currentMission.steps.length; idx++) {
      if (token !== this.animToken) return;
      const step = this.currentMission.steps[idx];
      if (analysis.areConnected(step.from, step.to)) continue;
      const wireId = `auto_${idx}_${Date.now().toString(36)}`;
      this.wires.push({
        id: wireId,
        from: step.from,
        to: step.to,
        color: step.color,
      });
      this.rebuildWires(wireId);
      audio.playSnapClick();
      this.renderStepsPanel();
      this.updateDiagnostics();
      this.refreshGuideBadges();
      await new Promise((r) => setTimeout(r, 175));
    }

    if (token === this.animToken) {
      audio.playSuccess();
      const hint = document.getElementById('wb-pin-hint');
      if (hint) hint.textContent = '¡Circuito completado! Pulsa "Ejecutar" para simularlo.';
    }
  }

  private captureSnapshot() {
    return {
      components: JSON.parse(JSON.stringify(this.components)) as PlacedComponent[],
      wires: JSON.parse(JSON.stringify(this.wires)) as WireDef[],
      boardPos: [this.boardGroup.position.x, this.boardGroup.position.y, this.boardGroup.position.z] as [number, number, number],
      boardRot: this.boardGroup.rotation.y,
      bbPos: [this.bbGroup.position.x, this.bbGroup.position.y, this.bbGroup.position.z] as [number, number, number],
      bbRot: this.bbGroup.rotation.y,
    };
  }

  private pushHistory(): void {
    this.undoStack.push(this.captureSnapshot());
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = [];
  }

  private restoreSnapshot(snap: ReturnType<WorkbenchController['captureSnapshot']>): void {
    this.components = JSON.parse(JSON.stringify(snap.components));
    this.wires = JSON.parse(JSON.stringify(snap.wires));
    this.boardGroup.position.set(...snap.boardPos);
    this.boardGroup.rotation.y = snap.boardRot;
    this.bbGroup.position.set(...snap.bbPos);
    this.bbGroup.rotation.y = snap.bbRot;
    this.selectTarget(null);
    this.rebuildComponents();
    this.rebuildWires();
    this.renderStepsPanel();
    this.renderEnvControls();
    this.renderTryItCard();
    this.updateDiagnostics();
    this.refreshGuideBadges();
  }

  public undo(): void {
    if (this.guardNotRunning('deshacer cambios')) return;
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.captureSnapshot());
    this.restoreSnapshot(prev);
    audio.playSnapClick();
    const hint = document.getElementById('wb-pin-hint');
    if (hint) hint.textContent = 'Deshacer aplicado (Ctrl+Z).';
  }

  public redo(): void {
    if (this.guardNotRunning('rehacer cambios')) return;
    const nxt = this.redoStack.pop();
    if (!nxt) return;
    this.undoStack.push(this.captureSnapshot());
    this.restoreSnapshot(nxt);
    audio.playSnapClick();
    const hint = document.getElementById('wb-pin-hint');
    if (hint) hint.textContent = 'Rehacer aplicado (Ctrl+Y).';
  }

  /** Encaja físicamente y eléctricamente un componente through-hole en los orificios de la protoboard */
  private snapComponentToBreadboard(comp: PlacedComponent, forcedFirstHole?: string): boolean {
    if (!this.showBreadboard || !THROUGH_HOLE_TYPES.has(comp.type)) {
      comp.breadboardMount = undefined;
      return false;
    }
    const built = this.builtComponents.get(comp.uid);
    if (!built) return false;

    const item = getCatalogItem(comp.type);
    if (item.pins.length === 0) return false;

    this.scene.updateMatrixWorld(true);
    const holeEntries: Array<{ id: string; pos: THREE.Vector3 }> = [];
    this.breadboard.holeAnchors.forEach((anchor, id) => {
      const p = new THREE.Vector3();
      anchor.getWorldPosition(p);
      holeEntries.push({ id, pos: p });
    });

    const firstPin = item.pins[0];
    const firstAnchor = built.pinAnchors.get(firstPin.id);
    if (!firstAnchor) return false;
    const firstWorld = new THREE.Vector3();
    firstAnchor.getWorldPosition(firstWorld);

    let bestHole: { id: string; pos: THREE.Vector3 } | null = null;
    if (forcedFirstHole) {
      bestHole = holeEntries.find((h) => h.id === forcedFirstHole) ?? null;
    } else {
      let bestDist = 0.55;
      for (const h of holeEntries) {
        const d = Math.hypot(h.pos.x - firstWorld.x, h.pos.z - firstWorld.z);
        if (d < bestDist) {
          bestDist = d;
          bestHole = h;
        }
      }
    }

    if (!bestHole) {
      comp.breadboardMount = undefined;
      return false;
    }

    const dx = bestHole.pos.x - firstWorld.x;
    const dz = bestHole.pos.z - firstWorld.z;
    const targetY = this.bbGroup.position.y + 0.21;
    comp.position = [comp.position[0] + dx, targetY, comp.position[2] + dz];
    built.group.position.set(...comp.position);
    this.scene.updateMatrixWorld(true);

    const matchedPins: Record<string, string> = {};
    for (const pin of item.pins) {
      const a = built.pinAnchors.get(pin.id);
      if (!a) continue;
      const wp = new THREE.Vector3();
      a.getWorldPosition(wp);
      let nearId: string | null = null;
      let nearD = 0.22;
      for (const h of holeEntries) {
        const d = Math.hypot(h.pos.x - wp.x, h.pos.z - wp.z);
        if (d < nearD) {
          nearD = d;
          nearId = h.id;
        }
      }
      if (nearId) matchedPins[pin.id] = nearId;
    }

    if (Object.keys(matchedPins).length > 0) {
      comp.breadboardMount = { pins: matchedPins };
      return true;
    }
    comp.breadboardMount = undefined;
    return false;
  }

  private defaultComponentState(type: ComponentType): Record<string, number | boolean | string> {
    switch (type) {
      case 'button': return { pressed: false };
      case 'slide-switch': return { position: 0 };
      case 'potentiometer': return { value: 512 };
      case 'joystick': return { x: 512, y: 512, pressed: false };
      case 'ultrasonic': return { distanceCm: 45, active: false };
      case 'ldr': return { lightPct: 60 };
      case 'pir-sensor': return { motion: false };
      case 'soil-moisture': return { moisturePct: 45 };
      case 'gas-mq2': return { gasLevel: 180 };
      case 'sound-sensor': return { soundLevel: 25 };
      case 'dht11': return { tempC: 23.0, humidity: 52 };
      case 'bme280': return { tempC: 21.5, pressureHpa: 1013.25, humidity: 54 };
      case 'co2-sensor': return { ppm: 480 };
      case 'optical-encoder': return { rpm: 180, pulse: 0 };
      case 'servo': return { angle: 90, targetAngle: 90 };
      case 'dc-motor': return { speed: 0 };
      case 'stepper-28byj': return { stepAngle: 0 };
      case 'uln2003-driver': return { phaseMask: 0 };
      case 'relay-5v': return { active: false };
      case 'seven-seg': return { mask: 0, active: false };
      case 'led-matrix': return { rows: '0,0,0,0,0,0,0,0' };
      case 'oled-i2c': return { text: 'OLED 128x64\nGeogo I2C listo' };
      case 'rfid-rc522': return { cardPresent: false };
      case 'ir-receiver': return { rxFlashUntil: 0 };
      case 'ir-remote': return { lastCmd: 0x45, txFlashUntil: 0 };
      case 'rgb-led': return { r: 0, g: 0, b: 0 };
      case 'lcd-i2c': return { line0: 'Liceo San Nicolas', line1: 'Tecnologia Geogo', powered: true };
      default: return {};
    }
  }

  private addComponentToBench(type: ComponentType): void {
    if (this.guardNotRunning('añadir componentes')) return;
    this.pushHistory();
    const item = getCatalogItem(type);
    // Si la misión actual pide este tipo de pieza y aún falta, vincular su uid para validar pasos
    const pendingSpec = this.currentMission.components.find(
      (mc) => mc.type === type && !this.components.some((c) => c.uid === mc.uid)
    );

    const idx = this.components.length;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = pendingSpec ? pendingSpec.position[0] : -1.2 + col * 2.4;
    const z = pendingSpec ? pendingSpec.position[2] : row % 2 === 0 ? -4.2 : 4.2;
    const uid = pendingSpec?.uid ?? `c_${Date.now().toString(36)}_${idx}`;

    const comp: PlacedComponent = {
      uid,
      type,
      name: pendingSpec?.label ?? item.name,
      position: [x, pendingSpec ? pendingSpec.position[1] : 0.0, z],
      rotationY: pendingSpec?.rotationY ?? 0,
      props: { ...item.defaultProps, ...(pendingSpec?.props ?? {}) },
      state: this.defaultComponentState(type),
    };
    this.components.push(comp);
    this.rebuildComponents();

    if (pendingSpec && THROUGH_HOLE_TYPES.has(type)) {
      this.snapComponentToBreadboard(comp, pendingSpec.snapHole);
      this.rebuildPinTargets();
    }

    this.selectTarget({ kind: 'comp', uid });
    this.renderStepsPanel();
    this.renderEnvControls();
    this.renderTryItCard();
    this.updateDiagnostics();
    this.refreshGuideBadges();

    if (pendingSpec) {
      const hint = document.getElementById('wb-pin-hint');
      if (hint) {
        hint.textContent = `Añadido ${comp.name} (${pendingSpec.placementHint ?? 'en mesa'}).`;
      }
    }
  }

  private selectTarget(target: DragTarget | null): void {
    this.selectedTarget = target;
    const selectedUid = target?.kind === 'comp' ? target.uid : null;
    this.builtComponents.forEach((built, id) => {
      built.selectionRing.visible = id === selectedUid;
    });
    this.renderComponentInspector();
  }

  private rotateSelectedTarget(): void {
    if (this.guardNotRunning('rotar piezas')) return;
    if (!this.selectedTarget) return;
    this.pushHistory();
    if (this.selectedTarget.kind === 'board') {
      this.boardGroup.rotation.y = (this.boardGroup.rotation.y + Math.PI / 2) % (Math.PI * 2);
      this.rebuildWires();
      audio.playSnapClick();
      return;
    }
    if (this.selectedTarget.kind === 'breadboard') {
      this.bbGroup.rotation.y = (this.bbGroup.rotation.y + Math.PI / 2) % (Math.PI * 2);
      this.rebuildWires();
      audio.playSnapClick();
      return;
    }
    const selUid = this.selectedTarget.uid;
    const comp = this.components.find((c) => c.uid === selUid);
    const built = this.builtComponents.get(selUid);
    if (!comp || !built) return;
    comp.rotationY = (comp.rotationY + Math.PI / 2) % (Math.PI * 2);
    built.group.rotation.y = comp.rotationY;
    this.rebuildWires();
    audio.playSnapClick();
  }

  private deleteSelectedComponent(): void {
    if (this.guardNotRunning('eliminar componentes')) return;
    if (this.selectedTarget?.kind !== 'comp') return;
    this.pushHistory();
    const uid = this.selectedTarget.uid;
    this.components = this.components.filter((c) => c.uid !== uid);
    this.wires = this.wires.filter(
      (w) => !w.from.startsWith(`comp:${uid}:`) && !w.to.startsWith(`comp:${uid}:`)
    );
    this.selectTarget(null);
    this.rebuildComponents();
    this.rebuildWires();
    this.renderStepsPanel();
    this.renderEnvControls();
    this.renderTryItCard();
    this.updateDiagnostics();
    this.refreshGuideBadges();
    audio.playClick(380, 40);
  }

  private renderComponentInspector(): void {
    const box = document.getElementById('wb-comp-inspector')!;
    if (this.selectedTarget?.kind !== 'comp') {
      box.hidden = true;
      return;
    }
    const selUid = this.selectedTarget.uid;
    const comp = this.components.find((c) => c.uid === selUid);
    if (!comp) {
      box.hidden = true;
      return;
    }

    let propsHtml = '';
    if (comp.type === 'resistor') {
      const ohms = Number(comp.props.ohms ?? 220);
      const presets = [100, 220, 330, 1000, 4700, 10000];
      const estMa = ((5 - 2) / ohms) * 1000;
      propsHtml = `
        <div class="ci-field">
          <label for="ci-res-val">Resistencia (${formatOhms(ohms)})</label>
          <div class="ci-row">
            <input id="ci-res-val" class="ci-input" type="number" min="10" max="1000000" step="10" value="${ohms}" />
          </div>
          <div class="ci-presets">
            ${presets
          .map(
            (v) =>
              `<button type="button" class="ci-chip ${ohms === v ? 'is-active' : ''}" data-res-preset="${v}">${formatOhms(v)}</button>`
          )
          .join('')}
          </div>
          <div class="ci-ohm-note">Corriente LED (5 V): ~${estMa.toFixed(1)} mA ${estMa > 22 ? '(alta)' : '(segura)'}</div>
        </div>
      `;
    } else if (comp.type === 'led') {
      const cur = String(comp.props.color ?? 'red');
      propsHtml = `
        <div class="ci-field">
          <label for="ci-led-color">Color del LED</label>
          <select id="ci-led-color" class="ci-select">
            ${Object.entries(LED_COLORS)
          .map(
            ([k, info]) =>
              `<option value="${k}" ${cur === k ? 'selected' : ''}>${info.label}</option>`
          )
          .join('')}
          </select>
        </div>
      `;
    } else if (comp.type === 'potentiometer') {
      const maxOhms = Number(comp.props.maxOhms ?? 10000);
      propsHtml = `
        <div class="ci-field">
          <label for="ci-pot-max">Resistencia total</label>
          <select id="ci-pot-max" class="ci-select">
            ${[1000, 10000, 50000, 100000]
          .map((v) => `<option value="${v}" ${maxOhms === v ? 'selected' : ''}>${formatOhms(v)}</option>`)
          .join('')}
          </select>
        </div>
      `;
    } else if (comp.type === 'bme280') {
      const model = String(comp.props.model ?? 'BME280');
      propsHtml = `
        <div class="ci-field">
          <label for="ci-bme-model">Modelo de sensor</label>
          <select id="ci-bme-model" class="ci-select">
            <option value="BME280" ${model === 'BME280' ? 'selected' : ''}>BME280 (Presión + Temp + Humedad)</option>
            <option value="BMP280" ${model === 'BMP280' ? 'selected' : ''}>BMP280 (Presión + Temp)</option>
          </select>
        </div>
      `;
    } else {
      const holeStr = comp.breadboardMount
        ? `Encajado en ${Object.values(comp.breadboardMount.pins).join(', ')}`
        : 'Arrastra la pieza con el mouse · Tecla R para rotar.';
      propsHtml = `<p class="placed-list-chip" style="margin:0">${holeStr}</p>`;
    }

    box.hidden = false;
    box.innerHTML = `
      <div class="ci-head">
        <strong>${comp.name}</strong>
        <button type="button" class="ci-close" id="ci-close-btn" aria-label="Cerrar inspector">&times;</button>
      </div>
      ${propsHtml}
      <div class="ci-actions">
        <button type="button" class="wb-mini-btn" id="ci-rotate-btn" title="Rotar 90° (Tecla R)">Rotar 90°</button>
        <button type="button" class="wb-mini-btn ci-btn-danger" id="ci-delete-btn" title="Eliminar (Supr)">Eliminar</button>
      </div>
    `;

    box.querySelector('#ci-close-btn')?.addEventListener('click', () => this.selectTarget(null));
    box.querySelector('#ci-rotate-btn')?.addEventListener('click', () => this.rotateSelectedTarget());
    box.querySelector('#ci-delete-btn')?.addEventListener('click', () => this.deleteSelectedComponent());

    const applyProp = (key: string, val: number | string) => {
      if (this.guardNotRunning('modificar valores del hardware')) return;
      comp.props[key] = val;
      this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      this.updateDiagnostics();
      this.renderComponentInspector();
    };

    box.querySelector<HTMLInputElement>('#ci-res-val')?.addEventListener('change', (e) => {
      const v = Math.max(10, Number((e.target as HTMLInputElement).value) || 220);
      applyProp('ohms', v);
    });
    box.querySelectorAll<HTMLButtonElement>('[data-res-preset]').forEach((btn) => {
      btn.addEventListener('click', () => applyProp('ohms', Number(btn.dataset.resPreset)));
    });
    box.querySelector<HTMLSelectElement>('#ci-led-color')?.addEventListener('change', (e) => {
      applyProp('color', (e.target as HTMLSelectElement).value);
    });
    box.querySelector<HTMLSelectElement>('#ci-pot-max')?.addEventListener('change', (e) => {
      applyProp('maxOhms', Number((e.target as HTMLSelectElement).value));
    });
    box.querySelector<HTMLSelectElement>('#ci-bme-model')?.addEventListener('change', (e) => {
      comp.props.model = (e.target as HTMLSelectElement).value;
      this.rebuildComponents();
      this.selectTarget({ kind: 'comp', uid: comp.uid });
    });
  }

  private rebuildComponents(): void {
    this.compGroup.clear();
    this.builtComponents.clear();
    const selUid = this.selectedTarget?.kind === 'comp' ? this.selectedTarget.uid : null;
    for (const comp of this.components) {
      const built = buildComponent3D(comp);
      built.selectionRing.visible = comp.uid === selUid;
      built.updateVisual?.(comp.state, comp.props);
      this.builtComponents.set(comp.uid, built);
      this.compGroup.add(built.group);
    }
    this.rebuildPinTargets();
  }

  private rebuildPinTargets(): void {
    this.pinWorldTargets = [];
    this.scene.updateMatrixWorld(true);

    if (this.builtBoard) {
      for (const pin of this.boardSpec.pins) {
        const anchor = this.builtBoard.pinAnchors.get(pin.id);
        if (anchor) {
          this.pinWorldTargets.push({
            endpoint: `board:${pin.id}`,
            obj: anchor,
            shortLabel: pin.id,
            title: pin.label,
            desc: pin.description,
            owner: this.boardSpec.name,
            category: pin.category,
          });
        }
      }
    }

    if (this.showBreadboard) {
      this.breadboard.holeAnchors.forEach((anchor, holeId) => {
        const def = this.breadboard.holeDefs.get(holeId);
        this.pinWorldTargets.push({
          endpoint: `bb:${holeId}`,
          obj: anchor,
          shortLabel: holeId,
          title: `Protoboard ${holeId}`,
          desc: def?.description ?? 'Punto de conexión en protoboard',
          owner: 'Protoboard 830 pts',
          category: def?.category ?? 'dig',
        });
      });
    }

    for (const comp of this.components) {
      const built = this.builtComponents.get(comp.uid);
      const item = getCatalogItem(comp.type);
      if (!built) continue;
      for (const p of item.pins) {
        const anchor = built.pinAnchors.get(p.id);
        if (anchor) {
          this.pinWorldTargets.push({
            endpoint: `comp:${comp.uid}:${p.id}`,
            obj: anchor,
            shortLabel: p.id,
            title: p.label,
            desc: p.maxVoltage ? `Máximo ${p.maxVoltage} V (usar Level Shifter con 5 V)` : `Pin ${p.label} de ${item.name}`,
            owner: item.name,
            category: p.category,
          });
        }
      }
    }
  }

  private rebuildWires(animateWireId?: string): void {
    this.wireGroup.clear();
    this.scene.updateMatrixWorld(true);
    const map = new Map<string, THREE.Object3D>();
    for (const t of this.pinWorldTargets) map.set(t.endpoint, t.obj);

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    this.wires.forEach((w, idx) => {
      const objA = map.get(w.from);
      const objB = map.get(w.to);
      if (!objA || !objB) return;
      objA.getWorldPosition(pA);
      objB.getWorldPosition(pB);
      const grp = buildJumperWireMesh(pA, pB, w.color, idx, w.id);
      this.wireGroup.add(grp);
      if (animateWireId && w.id === animateWireId) {
        animateWireMesh(grp, 240);
      }
    });
  }

  private showPlacementGuide(specUid: string): void {
    const layer = document.getElementById('wb-guide-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.guideBadgeEls = [];

    const spec = this.currentMission.components.find((c) => c.uid === specUid);
    if (!spec) return;

    this.scene.updateMatrixWorld(true);
    let worldPos = new THREE.Vector3(...spec.position);
    if (spec.snapHole && this.showBreadboard) {
      const anchor = this.breadboard.holeAnchors.get(spec.snapHole);
      if (anchor) anchor.getWorldPosition(worldPos);
    }

    const ring = document.createElement('div');
    ring.className = 'wb-place-ring';
    const badge = document.createElement('div');
    badge.className = 'wb-place-badge';
    badge.textContent = spec.snapHole ? `Colocar en ${spec.snapHole}` : `Colocar ${spec.label ?? spec.type}`;
    layer.append(ring, badge);
    this.guideBadgeEls.push({ worldPos, badge, ring });
  }

  private refreshGuideBadges(forcedPair?: [string, string]): void {
    const layer = document.getElementById('wb-guide-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.guideBadgeEls = [];

    // Si aún faltan componentes de la misión y no se forzó un par de cables, guiar Fase 1
    if (!forcedPair && this.currentMission.components.length > 0) {
      const nextMissing = this.currentMission.components.find(
        (mc) => !this.components.some((c) => c.uid === mc.uid)
      );
      if (nextMissing) {
        this.showPlacementGuide(nextMissing.uid);
        return;
      }
    }

    const analysis = analyzeNetlist(this.boardSpec, this.components, this.wires);
    let pair: [string, string] | null = forcedPair ?? null;
    if (!pair) {
      const nextStep = this.currentMission.steps.find((s) => !analysis.areConnected(s.from, s.to));
      if (nextStep) pair = [nextStep.from, nextStep.to];
    }
    if (!pair) return;

    for (const ep of pair) {
      const target = this.pinWorldTargets.find((t) => t.endpoint === ep);
      if (!target) continue;

      const ring = document.createElement('div');
      ring.className = 'wb-guide-ring';
      const badge = document.createElement('div');
      badge.className = 'wb-guide-badge';
      badge.textContent = target.shortLabel;
      layer.appendChild(ring);
      layer.appendChild(badge);
      this.guideBadgeEls.push({ endpoint: ep, badge, ring });
    }
  }

  private updateGuideBadgePositions(): void {
    if (this.guideBadgeEls.length === 0) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const pos = new THREE.Vector3();

    for (const item of this.guideBadgeEls) {
      if (item.worldPos) {
        pos.copy(item.worldPos);
      } else if (item.endpoint) {
        const target = this.pinWorldTargets.find((t) => t.endpoint === item.endpoint);
        if (!target) continue;
        target.obj.getWorldPosition(pos);
      } else {
        continue;
      }
      pos.project(this.camera);
      if (pos.z > 1) {
        item.badge.style.display = 'none';
        item.ring.style.display = 'none';
        continue;
      }
      const x = (pos.x * 0.5 + 0.5) * w;
      const y = (-pos.y * 0.5 + 0.5) * h;
      item.badge.style.display = 'block';
      item.ring.style.display = 'block';
      item.badge.style.left = `${x}px`;
      item.badge.style.top = `${y}px`;
      item.ring.style.left = `${x}px`;
      item.ring.style.top = `${y}px`;
    }
  }

  private showHoverTooltip(
    clientX: number,
    clientY: number,
    data: { title: string; desc: string; sub: string; dotColor?: string } | null
  ): void {
    const tip = document.getElementById('wb-hover-tooltip')!;
    if (!data) {
      tip.hidden = true;
      return;
    }
    const stageRect = this.host.getBoundingClientRect();
    const x = Math.min(stageRect.width - 270, Math.max(12, clientX - stageRect.left + 16));
    const y = Math.min(stageRect.height - 96, Math.max(12, clientY - stageRect.top + 16));
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.innerHTML = `
      <div class="wht-head">
        ${data.dotColor ? `<span class="wht-dot" style="background:${data.dotColor}"></span>` : ''}
        <span>${data.title}</span>
      </div>
      <div class="wht-desc">${data.desc}</div>
      <div class="wht-sub">${data.sub}</div>
    `;
    tip.hidden = false;
  }

  private syncFullscreenUI(isFs: boolean): void {
    const btn = document.getElementById('wb-fullscreen-btn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isFs));
    const label = btn.querySelector('span:last-child');
    if (label) label.textContent = isFs ? 'Salir' : 'Pantalla completa';
    const slot = btn.querySelector('.icon-slot');
    if (slot) setSlotIcon(slot, isFs ? 'minimize-2' : 'maximize-2');
    setTimeout(() => {
      const w = Math.max(1, this.host.clientWidth);
      const h = Math.max(1, this.host.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }, 60);
  }

  private bindUI(): void {
    document.getElementById('wb-run-btn')?.addEventListener('click', () => {
      if (this.isRunning) this.stopSimulation();
      else this.startSimulation();
    });

    document.getElementById('wb-place-all-btn')?.addEventListener('click', () => {
      this.placeAllMissionComponents();
    });

    document.getElementById('wb-autowire-btn')?.addEventListener('click', () => {
      this.autoWireMission();
    });

    document.getElementById('wb-palette-search')?.addEventListener('input', (e) => {
      this.renderPalette((e.target as HTMLInputElement).value);
    });

    const libDrawer = document.getElementById('wb-lib-drawer');
    document.getElementById('btn-toggle-libs')?.addEventListener('click', () => {
      if (!libDrawer) return;
      libDrawer.hidden = !libDrawer.hidden;
      if (!libDrawer.hidden) {
        this.renderLibraryDrawer((document.getElementById('wb-lib-search') as HTMLInputElement | null)?.value ?? '');
      }
    });
    document.getElementById('btn-close-libs')?.addEventListener('click', () => {
      if (libDrawer) libDrawer.hidden = true;
    });
    document.getElementById('wb-lib-search')?.addEventListener('input', (e) => {
      this.renderLibraryDrawer((e.target as HTMLInputElement).value);
    });

    document.getElementById('wb-clear-wires-btn')?.addEventListener('click', () => {
      if (this.guardNotRunning('quitar cables')) return;
      this.animToken++;
      this.pushHistory();
      this.wires = [];
      this.pendingPinStart = null;
      this.rebuildWires();
      this.renderStepsPanel();
      this.updateDiagnostics();
      this.refreshGuideBadges();
      audio.playClick(420, 40);
    });

    document.getElementById('wb-topview-btn')?.addEventListener('click', () => {
      this.setCameraPreset('top');
    });

    document.getElementById('wb-sound-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const next = !audio.enabled;
      audio.setEnabled(next);
      btn.setAttribute('aria-pressed', String(next));
      const slot = btn.querySelector('.icon-slot');
      if (slot) setSlotIcon(slot, next ? 'volume-2' : 'volume-x');
    });

    document.getElementById('wb-lofi-btn')?.addEventListener('click', () => {
      lofi.toggle();
    });
    document.getElementById('wb-lofi-prev')?.addEventListener('click', () => lofi.prev());
    document.getElementById('wb-lofi-next')?.addEventListener('click', () => lofi.next());
    document.getElementById('wb-lofi-pause')?.addEventListener('click', () => {
      const st = lofi.getState();
      if (st.playing) lofi.pause();
      else lofi.resume();
    });

    document.getElementById('wb-fullscreen-btn')?.addEventListener('click', async () => {
      const shell = document.getElementById('workbench-shell')!;
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen().catch(() => { });
        shell.classList.remove('is-fullscreen');
        this.syncFullscreenUI(false);
      } else if (shell.requestFullscreen) {
        try {
          await shell.requestFullscreen();
          shell.classList.add('is-fullscreen');
          this.syncFullscreenUI(true);
        } catch {
          const fs = shell.classList.toggle('is-fullscreen');
          this.syncFullscreenUI(fs);
        }
      } else {
        const fs = shell.classList.toggle('is-fullscreen');
        this.syncFullscreenUI(fs);
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const shell = document.getElementById('workbench-shell');
      if (!shell) return;
      const active = document.fullscreenElement === shell;
      shell.classList.toggle('is-fullscreen', active);
      this.syncFullscreenUI(active);
    });

    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        if (this.selectedTarget) this.rotateSelectedTarget();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedTarget?.kind === 'comp') this.deleteSelectedComponent();
      } else if (e.key === 'Escape') {
        this.pendingPinStart = null;
        this.selectTarget(null);
      }
    });

    document.getElementById('wb-toggle-bb-btn')?.addEventListener('click', (e) => {
      if (this.guardNotRunning('ocultar o mover la protoboard')) return;
      this.showBreadboard = !this.showBreadboard;
      this.bbGroup.visible = this.showBreadboard;
      (e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(this.showBreadboard));
      this.rebuildPinTargets();
      this.rebuildWires();
    });

    document.getElementById('wb-reset-bench-btn')?.addEventListener('click', () => {
      if (this.guardNotRunning('limpiar la mesa')) return;
      this.loadMission('libre');
    });

    // Guardar y Abrir circuitos .json
    document.getElementById('wb-save-json-btn')?.addEventListener('click', () => {
      const payload = {
        version: 1,
        boardId: this.boardId,
        missionId: this.currentMission.id,
        showBreadboard: this.showBreadboard,
        components: this.components,
        wires: this.wires,
        code: this.editorView.state.doc.toString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circuito-geogo-${this.currentMission.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      audio.playSuccess();
    });

    const jsonInput = document.getElementById('wb-load-json-input') as HTMLInputElement | null;
    document.getElementById('wb-load-json-btn')?.addEventListener('click', () => {
      if (this.guardNotRunning('abrir otro proyecto')) return;
      jsonInput?.click();
    });
    jsonInput?.addEventListener('change', async () => {
      const file = jsonInput.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        this.animToken++;
        this.stopSimulation();
        if (data.boardId && data.boardId !== this.boardId) this.setBoard(data.boardId);
        if (typeof data.showBreadboard === 'boolean') {
          this.showBreadboard = data.showBreadboard;
          this.bbGroup.visible = this.showBreadboard;
        }
        this.components = Array.isArray(data.components) ? data.components : [];
        this.wires = Array.isArray(data.wires) ? data.wires : [];
        if (typeof data.code === 'string') {
          this.editorView.dispatch({
            changes: { from: 0, to: this.editorView.state.doc.length, insert: data.code },
          });
        }
        this.rebuildComponents();
        this.rebuildWires();
        this.renderStepsPanel();
        this.renderEnvControls();
        this.renderTryItCard();
        this.updateDiagnostics();
        this.refreshGuideBadges();
        audio.playSuccess();
      } catch {
        audio.playError();
      }
      jsonInput.value = '';
    });

    document.querySelectorAll<HTMLButtonElement>('[data-wire-color]').forEach((sw) => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('[data-wire-color]').forEach((x) => x.classList.remove('is-active'));
        sw.classList.add('is-active');
        this.activeWireColor = sw.dataset.wireColor ?? '#2563eb';
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.wb-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab!;
        document.querySelectorAll('.wb-tab').forEach((t) => {
          t.classList.toggle('is-active', t.getAttribute('data-tab') === key);
          t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === key));
        });
        document.querySelectorAll('.wb-panel').forEach((p) => {
          p.classList.toggle('is-active', p.getAttribute('data-panel') === key);
        });
      });
    });

    document.getElementById('btn-reset-code')?.addEventListener('click', () => {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: this.currentMission.code },
      });
      document.getElementById('code-error-box')!.hidden = true;
      audio.playSnapClick();
    });

    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      const code = this.editorView.state.doc.toString();
      navigator.clipboard?.writeText(code).catch(() => { });
      const btn = document.getElementById('btn-copy-code')!;
      btn.textContent = 'Copiado';
      setTimeout(() => {
        btn.innerHTML = `<span class="icon-slot" data-icon="copy"></span> Copiar`;
        const slot = btn.querySelector('.icon-slot');
        if (slot) setSlotIcon(slot, 'copy');
      }, 1400);
    });

    document.getElementById('btn-download-ino')?.addEventListener('click', () => {
      const code = this.editorView.state.doc.toString();
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentMission.id || 'sketch_geogo'}.ino`;
      a.click();
      URL.revokeObjectURL(url);
      audio.playSuccess();
    });

    document.getElementById('btn-clear-serial')?.addEventListener('click', () => {
      document.getElementById('serial-output')!.textContent = '';
    });

    document.getElementById('serial-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('serial-input') as HTMLInputElement;
      if (input.value) {
        this.serialRxQueue.push(input.value);
        this.appendSerial(`> ${input.value}\n`);
        input.value = '';
      }
    });
  }

  public syncLofiState(st: LofiState): void {
    const active = st.playing || st.paused;
    const wBtn = document.getElementById('wb-lofi-btn');
    const wCtrls = document.getElementById('wb-lofi-controls');
    const wPauseSlot = document.querySelector('#wb-lofi-pause .icon-slot');
    if (wBtn) {
      wBtn.classList.toggle('is-active', st.playing);
      wBtn.classList.toggle('is-paused', st.paused);
      wBtn.setAttribute('aria-pressed', String(st.playing));
      wBtn.title = active ? `${st.trackTitle} (${st.trackIndex + 1}/${st.totalTracks})` : 'Música ambiental Lofi aleatoria';
    }
    if (wCtrls) wCtrls.hidden = !active;
    if (wPauseSlot) setSlotIcon(wPauseSlot, st.playing ? 'pause' : 'play');
  }

  private toggleButtonState(comp: PlacedComponent): void {
    comp.state.pressed = !comp.state.pressed;
    this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
    // Sonido mecánico limpio de microinterruptor — NUNCA un pitido tonal
    audio.playSwitchClick();
    this.updateDiagnostics();
    this.syncHardwareVisuals();
    this.renderEnvControls();
    this.renderTryItCard();
  }

  private toggleSwitchState(comp: PlacedComponent): void {
    comp.state.position = Number(comp.state.position ?? 0) === 1 ? 0 : 1;
    this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
    audio.playSwitchClick();
    this.updateDiagnostics();
    this.syncHardwareVisuals();
    this.renderEnvControls();
    this.renderTryItCard();
  }

  private triggerIrCode(cmd: number): void {
    this.lastIrCommand = cmd;
    const now = performance.now();
    for (const comp of this.components) {
      if (comp.type === 'ir-remote') {
        comp.state.lastCmd = cmd;
        comp.state.txFlashUntil = now + 260;
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      } else if (comp.type === 'ir-receiver') {
        comp.state.rxFlashUntil = now + 260;
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      }
    }
    audio.playClick(980, 20);
  }

  private removeWireById(wireId: string): void {
    if (this.guardNotRunning('quitar cables')) return;
    if (!this.wires.some((w) => w.id === wireId)) return;
    this.pushHistory();
    this.wires = this.wires.filter((w) => w.id !== wireId);
    this.rebuildWires();
    this.renderStepsPanel();
    this.updateDiagnostics();
    this.refreshGuideBadges();
    audio.playClick(380, 30);
    const hint = document.getElementById('wb-pin-hint');
    if (hint) hint.textContent = 'Cable retirado. Ctrl+Z para deshacer.';
  }

  private bind3DEvents(): void {
    const canvas = this.renderer.domElement;
    const hint = document.getElementById('wb-pin-hint')!;
    const hitPoint = new THREE.Vector3();

    const updatePointer = (cx: number, cy: number) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
    };

    let downPos = { x: 0, y: 0 };

    canvas.addEventListener('contextmenu', (e) => {
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const wireHits = this.raycaster.intersectObjects(this.wireGroup.children, true);
      const hitWire = wireHits.find((h) => h.object.userData?.wireId);
      if (hitWire) {
        e.preventDefault();
        this.removeWireById(hitWire.object.userData.wireId);
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      downPos = { x: e.clientX, y: e.clientY };
      this.dragMoved = false;
      this.cameraTweenTarget = null;
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const pinHits = this.raycaster.intersectObjects(
        this.pinWorldTargets.map((t) => t.obj),
        false
      );
      if (pinHits.length > 0) return;

      const compHits = this.raycaster.intersectObjects(this.compGroup.children, true);
      const interactiveHit = compHits.find((h) => h.object.userData?.interactiveCompUid);
      if (interactiveHit) {
        const uid = interactiveHit.object.userData.interactiveCompUid as string;
        const action = interactiveHit.object.userData.action as string;
        const comp = this.components.find((c) => c.uid === uid);
        if (comp && action === 'rotate-pot') {
          this.activeKnobDrag = {
            uid,
            startX: e.clientX,
            startY: e.clientY,
            startVal: Number(comp.state.value ?? 512),
            startValY: 0,
            kind: 'pot',
          };
          this.controls.enabled = false;
          canvas.style.cursor = 'ew-resize';
          return;
        }
        if (comp && action === 'move-joystick') {
          this.activeKnobDrag = {
            uid,
            startX: e.clientX,
            startY: e.clientY,
            startVal: Number(comp.state.x ?? 512),
            startValY: Number(comp.state.y ?? 512),
            kind: 'joy',
          };
          this.controls.enabled = false;
          canvas.style.cursor = 'move';
          return;
        }
        if (comp && (action === 'toggle-button' || action === 'toggle-switch') && this.isRunning) {
          if (action === 'toggle-button') this.toggleButtonState(comp);
          else this.toggleSwitchState(comp);
          return;
        }
      }

      // Bloqueo estricto durante simulación: no se pueden mover componentes, placas ni protoboard
      if (this.isRunning) {
        const anyHit =
          compHits.length > 0 ||
          this.raycaster.intersectObjects(this.boardGroup.children, true).length > 0 ||
          (this.showBreadboard && this.raycaster.intersectObjects(this.bbGroup.children, true).length > 0);
        if (anyHit) {
          hint.textContent = 'Simulación activa: detén la simulación para mover piezas o cablear (sin hot-swap).';
        }
        return;
      }

      const dragComp = compHits.find((h) => h.object.userData?.draggableCompUid);
      if (dragComp) {
        const uid = dragComp.object.userData.draggableCompUid as string;
        const comp = this.components.find((c) => c.uid === uid);
        if (comp && this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint)) {
          this.draggingTarget = { kind: 'comp', uid };
          this.dragOffset.set(comp.position[0] - hitPoint.x, 0, comp.position[2] - hitPoint.z);
          this.controls.enabled = false;
          this.selectTarget(this.draggingTarget);
          canvas.style.cursor = 'grabbing';
          return;
        }
      }

      const boardHits = this.raycaster.intersectObjects(this.boardGroup.children, true);
      if (boardHits.length > 0 && this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint)) {
        this.draggingTarget = { kind: 'board' };
        this.dragOffset.set(this.boardGroup.position.x - hitPoint.x, 0, this.boardGroup.position.z - hitPoint.z);
        this.controls.enabled = false;
        this.selectTarget(this.draggingTarget);
        canvas.style.cursor = 'grabbing';
        return;
      }

      if (this.showBreadboard) {
        const bbHits = this.raycaster.intersectObjects(this.bbGroup.children, true);
        if (bbHits.length > 0 && this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint)) {
          this.draggingTarget = { kind: 'breadboard' };
          this.dragOffset.set(this.bbGroup.position.x - hitPoint.x, 0, this.bbGroup.position.z - hitPoint.z);
          this.controls.enabled = false;
          this.selectTarget(this.draggingTarget);
          canvas.style.cursor = 'grabbing';
        }
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.activeKnobDrag) {
        this.showHoverTooltip(0, 0, null);
        const comp = this.components.find((c) => c.uid === this.activeKnobDrag!.uid);
        if (comp) {
          const dx = e.clientX - this.activeKnobDrag.startX;
          const dy = e.clientY - this.activeKnobDrag.startY;
          if (this.activeKnobDrag.kind === 'pot') {
            const val = Math.max(0, Math.min(1023, Math.round(this.activeKnobDrag.startVal + dx * 4)));
            comp.state.value = val;
            hint.textContent = `${comp.name}: ${val} / 1023 (${Math.round((val / 1023) * 100)}%)`;
          } else {
            comp.state.x = Math.max(0, Math.min(1023, Math.round(this.activeKnobDrag.startVal + dx * 5)));
            comp.state.y = Math.max(0, Math.min(1023, Math.round(this.activeKnobDrag.startValY + dy * 5)));
            hint.textContent = `Joystick X:${comp.state.x} Y:${comp.state.y}`;
          }
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderTryItCard();
          this.renderEnvControls();
        }
        return;
      }

      if (this.draggingTarget) {
        this.showHoverTooltip(0, 0, null);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint)) {
          const rawX = Math.max(-11.5, Math.min(11.5, hitPoint.x + this.dragOffset.x));
          const rawZ = Math.max(-7.5, Math.min(7.5, hitPoint.z + this.dragOffset.z));
          const snapX = Math.round(rawX * 8) / 8;
          const snapZ = Math.round(rawZ * 8) / 8;
          if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) {
            if (!this.dragMoved) this.pushHistory();
            this.dragMoved = true;
          }

          if (this.draggingTarget.kind === 'board') {
            this.boardGroup.position.set(snapX, 0.09, snapZ);
            hint.textContent = `Moviendo ${this.boardSpec.name} · Tecla R para rotar`;
          } else if (this.draggingTarget.kind === 'breadboard') {
            this.bbGroup.position.set(snapX, 0.21, snapZ);
            hint.textContent = `Moviendo Protoboard · Tecla R para rotar`;
          } else {
            const dragUid = this.draggingTarget.uid;
            const comp = this.components.find((c) => c.uid === dragUid);
            const built = this.builtComponents.get(dragUid);
            if (comp && built) {
              const bx = this.bbGroup.position.x;
              const bz = this.bbGroup.position.z;
              const onBb = this.showBreadboard && Math.abs(snapX - bx) < 4.2 && Math.abs(snapZ - bz) < 2.7;
              const snapY = onBb ? 0.28 : 0.0;
              comp.position = [snapX, snapY, snapZ];
              built.group.position.set(snapX, snapY, snapZ);
              hint.textContent = `Moviendo ${comp.name} · Tecla R para rotar`;
            }
          }
          this.rebuildWires();
        }
        return;
      }

      const objs = this.pinWorldTargets.map((t) => t.obj);
      const hits = this.raycaster.intersectObjects(objs, false);

      if (this.hoveredPinObj) {
        ((this.hoveredPinObj as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0;
        this.hoveredPinObj = null;
      }

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const target = this.pinWorldTargets.find((t) => t.obj === hitObj);
        if (target) {
          this.hoveredPinObj = hitObj;
          ((hitObj as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.95;
          canvas.style.cursor = 'pointer';
          this.showHoverTooltip(e.clientX, e.clientY, {
            title: target.title,
            desc: target.desc,
            sub: target.owner,
            dotColor: CAT_COLORS[target.category],
          });

          if (target.endpoint.startsWith('bb:')) {
            this.breadboard.highlightTrack(target.endpoint.slice(3));
          } else {
            this.breadboard.highlightTrack(null);
          }
          return;
        }
      }

      this.breadboard.highlightTrack(null);

      const compHits = this.raycaster.intersectObjects(this.compGroup.children, true);
      const hoverDrag = compHits.find((h) => h.object.userData?.draggableCompUid);
      if (hoverDrag) {
        const comp = this.components.find((c) => c.uid === hoverDrag.object.userData.draggableCompUid);
        canvas.style.cursor = 'move';
        if (comp) {
          this.showHoverTooltip(e.clientX, e.clientY, {
            title: comp.name,
            desc: comp.type === 'button' ? 'clic para accionar · arrastra para mover' : 'arrastra para mover · R rota · clic para configurar',
            sub: 'Componente de taller',
          });
        }
        return;
      }

      const wireHits = this.raycaster.intersectObjects(this.wireGroup.children, true);
      if (wireHits.find((h) => h.object.userData?.wireId)) {
        canvas.style.cursor = 'pointer';
        this.showHoverTooltip(e.clientX, e.clientY, {
          title: 'Cable Jumper',
          desc: 'Clic derecho para retirar este cable',
          sub: 'Conexión de protoboard',
        });
        return;
      }

      if (this.raycaster.intersectObjects(this.boardGroup.children, true).length > 0) {
        canvas.style.cursor = 'move';
        this.showHoverTooltip(e.clientX, e.clientY, {
          title: this.boardSpec.name,
          desc: 'arrastra para mover · R rota',
          sub: `Lógica ${this.boardSpec.logicVoltage} V`,
        });
        return;
      }

      if (this.showBreadboard && this.raycaster.intersectObjects(this.bbGroup.children, true).length > 0) {
        canvas.style.cursor = 'move';
        this.showHoverTooltip(e.clientX, e.clientY, {
          title: 'Protoboard 830 pts',
          desc: 'arrastra para mover · R rota · pasa sobre un punto para ver su pista',
          sub: 'Placa de proyectos',
        });
        return;
      }

      this.showHoverTooltip(0, 0, null);
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('pointerleave', () => {
      this.showHoverTooltip(0, 0, null);
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.activeKnobDrag) {
        this.activeKnobDrag = null;
        this.controls.enabled = true;
        canvas.style.cursor = 'grab';
        return;
      }

      if (this.draggingTarget) {
        const prev = this.draggingTarget;
        this.draggingTarget = null;
        this.controls.enabled = true;
        canvas.style.cursor = 'grab';
        if (this.dragMoved) {
          if (prev.kind === 'comp') {
            const comp = this.components.find((c) => c.uid === prev.uid);
            if (comp) {
              const snapped = this.snapComponentToBreadboard(comp);
              if (snapped) {
                audio.playSnapClick();
                const holes = Object.values(comp.breadboardMount?.pins ?? {}).join(', ');
                hint.textContent = `${comp.name} encajado en protoboard (${holes}). Ctrl+Z para deshacer.`;
              }
            }
          }
          this.rebuildPinTargets();
          this.rebuildWires();
          this.renderStepsPanel();
          this.updateDiagnostics();
          this.refreshGuideBadges();
          return;
        }
        if (prev.kind === 'comp') {
          const comp = this.components.find((c) => c.uid === prev.uid);
          if (comp?.type === 'button') {
            this.toggleButtonState(comp);
          } else if (comp?.type === 'slide-switch') {
            this.toggleSwitchState(comp);
          } else if (comp?.type === 'ir-remote') {
            this.triggerIrCode(0x45);
          }
        }
        return;
      }

      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const objs = this.pinWorldTargets.map((t) => t.obj);
      const pinHits = this.raycaster.intersectObjects(objs, false);
      if (pinHits.length > 0) {
        if (this.guardNotRunning('cablear pines')) return;
        const hitObj = pinHits[0].object;
        const target = this.pinWorldTargets.find((t) => t.obj === hitObj);
        if (!target) return;

        if (!this.pendingPinStart) {
          this.pendingPinStart = target.endpoint;
          hint.textContent = `Origen fijado (${target.title}). Haz clic en el pin de destino.`;
          audio.playClick(760, 30);
        } else if (this.pendingPinStart !== target.endpoint) {
          this.pushHistory();
          const wireId = `w_${Date.now().toString(36)}`;
          this.wires.push({
            id: wireId,
            from: this.pendingPinStart,
            to: target.endpoint,
            color: this.activeWireColor,
          });
          this.pendingPinStart = null;
          this.rebuildWires(wireId);
          this.renderStepsPanel();
          this.updateDiagnostics();
          this.refreshGuideBadges();
          audio.playSnapClick();
          hint.textContent = 'Conectado. Haz clic en otro pin para añadir el siguiente cable.';
        } else {
          this.pendingPinStart = null;
          hint.textContent = 'Selección de cable cancelada.';
        }
      } else {
        this.selectTarget(null);
      }
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

  private renderStepsPanel(): void {
    const panel = document.getElementById('wb-panel-steps')!;
    const m = this.currentMission;
    const analysis = analyzeNetlist(this.boardSpec, this.components, this.wires);

    const totalComps = m.components.length;
    const placedComps = m.components.filter((mc) => this.components.some((c) => c.uid === mc.uid)).length;
    const totalSteps = m.steps.length;
    const wiredSteps = m.steps.filter((s) => analysis.areConnected(s.from, s.to)).length;
    const allPlaced = placedComps === totalComps;
    const allWired = wiredSteps === totalSteps;
    const totalTasks = totalComps + totalSteps;
    const doneTasks = placedComps + wiredSteps;
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 100;

    const runBtn = document.getElementById('wb-run-btn');
    if (runBtn) runBtn.classList.toggle('is-ready', totalSteps > 0 && allPlaced && allWired && !this.isRunning);

    if (m.id === 'libre') {
      panel.innerHTML = `
        <h3 class="mission-title">${m.title}</h3>
        <p class="mission-desc">${m.description}</p>
        <p class="mission-desc">Añade sensores desde la paleta izquierda, arrástralos sobre la mesa o protoboard, configura sus valores y traza cables libremente.</p>
        <div class="learn-box">
          <h4>Consejos del laboratorio</h4>
          <ul>${m.learnPoints.map((pt) => `<li>${pt}</li>`).join('')}</ul>
        </div>
      `;
      return;
    }

    const phase1Html = `
      <div class="step-phase-header">
        <span>Fase 1 · Colocar piezas</span>
        <span>${placedComps} / ${totalComps}</span>
      </div>
      <div class="step-list">
        ${m.components
        .map((mc) => {
          const isPlaced = this.components.some((c) => c.uid === mc.uid);
          const item = getCatalogItem(mc.type);
          return `
              <div class="step-item ${isPlaced ? 'is-done' : ''}">
                <div class="step-item-head">
                  <span>${mc.label ?? item.name}</span>
                  <span>${isPlaced ? 'Colocado' : 'Pendiente'}</span>
                </div>
                <div>${mc.placementHint ?? 'En la mesa de trabajo'}</div>
                ${
                  !isPlaced
                    ? `<div class="step-inline-actions">
                        <button type="button" class="step-show-btn" data-show-comp="${mc.uid}">Muéstrame</button>
                        <button type="button" class="wb-mini-btn" data-place-comp="${mc.uid}">Colocar</button>
                      </div>`
                    : ''
                }
              </div>
            `;
        })
        .join('')}
      </div>
    `;

    const phase2Html = `
      <div class="step-phase-header">
        <span>Fase 2 · Cablear el circuito</span>
        <span>${wiredSteps} / ${totalSteps}</span>
      </div>
      <div class="step-list">
        ${m.steps
        .map((s, idx) => {
          const done = analysis.areConnected(s.from, s.to);
          return `
              <div class="step-item ${done ? 'is-done' : ''}">
                <div class="step-item-head">
                  <span>Paso ${idx + 1}: ${s.label}</span>
                  <span>${done ? 'Conectado' : 'Pendiente'}</span>
                </div>
                <div>${s.explanation}</div>
                ${
                  !done
                    ? `<div class="step-inline-actions">
                        <button type="button" class="step-show-btn" data-show-step="${idx}">Muéstrame</button>
                        <button type="button" class="wb-mini-btn" data-wire-step="${idx}">Conectar</button>
                      </div>`
                    : ''
                }
              </div>
            `;
        })
        .join('')}
      </div>
    `;

    const readyBanner =
      allPlaced && allWired
        ? `<div class="step-ready-banner">
            <span>¡Circuito completo! Listo para probar.</span>
            <button type="button" class="wb-mini-btn wb-mini-btn-primary" id="step-run-inline-btn">Ejecutar</button>
          </div>`
        : '';

    panel.innerHTML = `
      <h3 class="mission-title">${m.title}</h3>
      <p class="mission-desc">${m.description}</p>
      <div class="step-progress-wrap">
        <div class="step-progress-head">
          <span>Progreso del armado</span>
          <span>${pct}% (${doneTasks}/${totalTasks})</span>
        </div>
        <div class="step-progress-bar"><div class="step-progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${readyBanner}
      ${phase1Html}
      ${phase2Html}
      <div class="learn-box">
        <h4>Lo que aprendes en esta misión</h4>
        <ul>${m.learnPoints.map((pt) => `<li>${pt}</li>`).join('')}</ul>
      </div>
    `;

    panel.querySelector('#step-run-inline-btn')?.addEventListener('click', () => {
      if (!this.isRunning) this.startSimulation();
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-show-comp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.showComp!;
        this.showPlacementGuide(uid);
        audio.playClick(740, 30);
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-place-comp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.guardNotRunning('colocar piezas')) return;
        this.pushHistory();
        this.placeMissionComponent(btn.dataset.placeComp!, true);
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-show-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.showStep);
        const step = m.steps[idx];
        if (!step) return;
        this.refreshGuideBadges([step.from, step.to]);
        audio.playClick(740, 30);
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-wire-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.guardNotRunning('cablear el circuito')) return;
        const idx = Number(btn.dataset.wireStep);
        const step = m.steps[idx];
        if (!step) return;
        this.pushHistory();
        // Si alguno de los extremos pertenece a una pieza no colocada aún, colocarla automáticamente
        for (const ep of [step.from, step.to]) {
          if (ep.startsWith('comp:')) {
            const uid = ep.split(':')[1];
            if (!this.components.some((c) => c.uid === uid)) {
              this.placeMissionComponent(uid, false);
            }
          } else if (ep.startsWith('bb:')) {
            // Colocar piezas through-hole pendientes para habilitar sus orificios
            for (const mc of m.components) {
              if (THROUGH_HOLE_TYPES.has(mc.type) && !this.components.some((c) => c.uid === mc.uid)) {
                this.placeMissionComponent(mc.uid, false);
              }
            }
          }
        }
        const wireId = `step_${idx}_${Date.now().toString(36)}`;
        this.wires.push({ id: wireId, from: step.from, to: step.to, color: step.color });
        this.rebuildWires(wireId);
        this.renderStepsPanel();
        this.updateDiagnostics();
        this.refreshGuideBadges();
        audio.playSnapClick();
      });
    });
  }

  /** Tarjeta flotante "Pruébalo" directamente sobre el lienzo 3D */
  private renderTryItCard(): void {
    const card = document.getElementById('wb-tryit-card');
    if (!card) return;

    const interactive = this.components.filter((c) =>
      [
        'button',
        'slide-switch',
        'potentiometer',
        'joystick',
        'ultrasonic',
        'ldr',
        'dht11',
        'bme280',
        'co2-sensor',
        'optical-encoder',
        'pir-sensor',
        'soil-moisture',
        'gas-mq2',
        'sound-sensor',
        'ir-remote',
        'rfid-rc522',
      ].includes(c.type)
    );
    if (interactive.length === 0) {
      card.hidden = true;
      card.innerHTML = '';
      return;
    }

    card.hidden = false;
    card.innerHTML = `<span class="tryit-eyebrow">Pruébalo en vivo</span>`;

    for (const comp of interactive.slice(0, 3)) {
      const wrap = document.createElement('div');
      wrap.className = 'tryit-item';

      if (comp.type === 'button') {
        wrap.innerHTML = `
          <div class="tryit-row">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${comp.state.pressed ? 'is-active' : ''}">
              ${comp.state.pressed ? 'Presionado (LOW)' : 'Presionar'}
            </button>
          </div>`;
        wrap.querySelector('button')?.addEventListener('click', () => this.toggleButtonState(comp));
      } else if (comp.type === 'slide-switch') {
        const pos = Number(comp.state.position ?? 0);
        wrap.innerHTML = `
          <div class="tryit-row">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${pos === 1 ? 'is-active' : ''}">
              ${pos === 1 ? 'Posición C2' : 'Posición C1'}
            </button>
          </div>`;
        wrap.querySelector('button')?.addEventListener('click', () => this.toggleSwitchState(comp));
      } else if (comp.type === 'potentiometer') {
        const val = Number(comp.state.value ?? 512);
        wrap.innerHTML = `
          <div class="tryit-row"><span>${comp.name}</span><span>${val} / 1023</span></div>
          <input type="range" min="0" max="1023" value="${val}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.value = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v} / 1023`;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderEnvControls();
        });
      } else if (comp.type === 'joystick') {
        const x = Number(comp.state.x ?? 512);
        const y = Number(comp.state.y ?? 512);
        wrap.innerHTML = `
          <div class="tryit-row"><span>Joystick X / Y</span><span>${x} · ${y}</span></div>
          <input type="range" min="0" max="1023" value="${x}" data-joy="x" />
          <input type="range" min="0" max="1023" value="${y}" data-joy="y" />`;
        wrap.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
          inp.addEventListener('input', () => {
            comp.state[inp.dataset.joy!] = Number(inp.value);
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
            this.renderEnvControls();
            wrap.querySelector('.tryit-row span:last-child')!.textContent = `${comp.state.x} · ${comp.state.y}`;
          });
        });
      } else if (comp.type === 'pir-sensor') {
        const mot = Boolean(comp.state.motion);
        wrap.innerHTML = `
          <div class="tryit-row">
            <span>Movimiento PIR</span>
            <button type="button" class="wb-mini-btn ${mot ? 'is-active' : ''}">
              ${mot ? 'Detectado (HIGH)' : 'Simular paso'}
            </button>
          </div>`;
        wrap.querySelector('button')?.addEventListener('click', () => {
          comp.state.motion = !comp.state.motion;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderTryItCard();
          this.renderEnvControls();
        });
      } else if (comp.type === 'ir-remote') {
        wrap.innerHTML = `
          <div class="tryit-row">
            <span>Control IR</span>
            <button type="button" class="wb-mini-btn wb-mini-btn-primary">Enviar PWR (0x45)</button>
          </div>`;
        wrap.querySelector('button')?.addEventListener('click', () => this.triggerIrCode(0x45));
      } else if (comp.type === 'rfid-rc522') {
        wrap.innerHTML = `
          <div class="tryit-row">
            <span>Tarjeta RFID</span>
            <button type="button" class="wb-mini-btn ${this.rfidCardPresent ? 'is-active' : ''}">
              ${this.rfidCardPresent ? 'Presente (Retirar)' : 'Acercar tarjeta'}
            </button>
          </div>`;
        wrap.querySelector('button')?.addEventListener('click', () => {
          this.rfidCardPresent = !this.rfidCardPresent;
          comp.state.cardPresent = this.rfidCardPresent;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderTryItCard();
        });
      } else if (comp.type === 'soil-moisture' || comp.type === 'gas-mq2' || comp.type === 'sound-sensor') {
        const key = comp.type === 'soil-moisture' ? 'moisturePct' : comp.type === 'gas-mq2' ? 'gasLevel' : 'soundLevel';
        const max = comp.type === 'gas-mq2' ? 1023 : 100;
        const unit = comp.type === 'gas-mq2' ? 'ppm' : '%';
        const v = Number(comp.state[key] ?? 40);
        wrap.innerHTML = `
          <div class="tryit-row"><span>${comp.name}</span><span>${v} ${unit}</span></div>
          <input type="range" min="0" max="${max}" value="${v}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const val = Number((e.target as HTMLInputElement).value);
          comp.state[key] = val;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${val} ${unit}`;
          this.renderEnvControls();
        });
      } else if (comp.type === 'ultrasonic') {
        const d = Number(comp.state.distanceCm ?? 45);
        wrap.innerHTML = `
          <div class="tryit-row"><span>Distancia HC-SR04</span><span>${d} cm</span></div>
          <input type="range" min="2" max="250" value="${d}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.distanceCm = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v} cm`;
          this.renderEnvControls();
        });
      } else if (comp.type === 'ldr') {
        const l = Number(comp.state.lightPct ?? 60);
        wrap.innerHTML = `
          <div class="tryit-row"><span>Luz ambiente</span><span>${l}%</span></div>
          <input type="range" min="0" max="100" value="${l}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.lightPct = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v}%`;
          this.renderEnvControls();
        });
      } else if (comp.type === 'dht11' || comp.type === 'bme280') {
        const t = Number(comp.state.tempC ?? 22);
        wrap.innerHTML = `
          <div class="tryit-row"><span>Temp. ${comp.type.toUpperCase()}</span><span>${t} °C</span></div>
          <input type="range" min="-10" max="50" step="0.5" value="${t}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.tempC = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v} °C`;
          this.renderEnvControls();
        });
      } else if (comp.type === 'co2-sensor') {
        const ppm = Number(comp.state.ppm ?? 480);
        wrap.innerHTML = `
          <div class="tryit-row"><span>CO₂ ambiente</span><span>${ppm} ppm</span></div>
          <input type="range" min="400" max="3000" step="20" value="${ppm}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.ppm = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v} ppm`;
          this.renderEnvControls();
        });
      } else if (comp.type === 'optical-encoder') {
        const rpm = Number(comp.state.rpm ?? 180);
        wrap.innerHTML = `
          <div class="tryit-row"><span>Velocidad disco</span><span>${rpm} RPM</span></div>
          <input type="range" min="0" max="600" step="10" value="${rpm}" />`;
        wrap.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.rpm = v;
          wrap.querySelector('.tryit-row span:last-child')!.textContent = `${v} RPM`;
          this.renderEnvControls();
        });
      }
      card.appendChild(wrap);
    }
  }

  private renderEnvControls(): void {
    const root = document.getElementById('wb-env-controls')!;
    if (this.components.length === 0) {
      root.innerHTML = '<p class="placed-list-chip">Aún no hay sensores o componentes en la mesa.</p>';
      return;
    }

    root.innerHTML = '';
    for (const comp of this.components) {
      const card = document.createElement('div');
      card.className = 'env-card';

      if (comp.type === 'button') {
        card.innerHTML = `
          <div class="env-card-head">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${comp.state.pressed ? 'is-active' : ''}">
              ${comp.state.pressed ? 'Presionado (LOW)' : 'Presionar'}
            </button>
          </div>`;
        card.querySelector('button')?.addEventListener('click', () => this.toggleButtonState(comp));
      } else if (comp.type === 'potentiometer') {
        const val = Number(comp.state.value ?? 512);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name} (${formatOhms(Number(comp.props.maxOhms ?? 10000))})</span><span>${val}</span></div>
          <label><span>Posición ADC</span><span>${Math.round((val / 1023) * 100)}%</span></label>
          <input type="range" min="0" max="1023" value="${val}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.value = v;
          card.querySelector('.env-card-head span:last-child')!.textContent = String(v);
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderTryItCard();
        });
      } else if (comp.type === 'ultrasonic') {
        const d = Number(comp.state.distanceCm ?? 45);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${d} cm</span></div>
          <label><span>Distancia objeto</span><span>2–250 cm</span></label>
          <input type="range" min="2" max="250" value="${d}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.distanceCm = v;
          card.querySelector('.env-card-head span:last-child')!.textContent = `${v} cm`;
          this.renderTryItCard();
        });
      } else if (comp.type === 'ldr') {
        const l = Number(comp.state.lightPct ?? 60);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${l}% luz</span></div>
          <input type="range" min="0" max="100" value="${l}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.lightPct = v;
          card.querySelector('.env-card-head span:last-child')!.textContent = `${v}% luz`;
          this.renderTryItCard();
        });
      } else if (comp.type === 'dht11') {
        const t = Number(comp.state.tempC ?? 23);
        const h = Number(comp.state.humidity ?? 52);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${t}°C · ${h}%</span></div>
          <label><span>Temperatura (°C)</span><span>${t}°C</span></label>
          <input type="range" min="0" max="50" step="0.5" value="${t}" data-k="tempC" />
          <label><span>Humedad (%)</span><span>${h}%</span></label>
          <input type="range" min="20" max="90" step="1" value="${h}" data-k="humidity" />`;
        card.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
          inp.addEventListener('input', () => {
            comp.state[inp.dataset.k!] = Number(inp.value);
            this.renderEnvControls();
            this.renderTryItCard();
          });
        });
      } else if (comp.type === 'bme280') {
        const t = Number(comp.state.tempC ?? 21.5);
        const p = Number(comp.state.pressureHpa ?? 1013);
        const h = Number(comp.state.humidity ?? 54);
        card.innerHTML = `
          <div class="env-card-head"><span>${String(comp.props.model ?? 'BME280')}</span><span>${t}°C · ${p} hPa</span></div>
          <label><span>Temperatura (°C)</span><span>${t}°C</span></label>
          <input type="range" min="-10" max="50" step="0.5" value="${t}" data-k="tempC" />
          <label><span>Presión (hPa)</span><span>${p} hPa</span></label>
          <input type="range" min="850" max="1050" step="1" value="${p}" data-k="pressureHpa" />
          <label><span>Humedad (%)</span><span>${h}%</span></label>
          <input type="range" min="10" max="95" step="1" value="${h}" data-k="humidity" />`;
        card.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
          inp.addEventListener('input', () => {
            comp.state[inp.dataset.k!] = Number(inp.value);
            this.renderEnvControls();
            this.renderTryItCard();
          });
        });
      } else if (comp.type === 'co2-sensor') {
        const ppm = Number(comp.state.ppm ?? 480);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${ppm} ppm</span></div>
          <input type="range" min="400" max="3000" step="20" value="${ppm}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.ppm = v;
          card.querySelector('.env-card-head span:last-child')!.textContent = `${v} ppm`;
          this.renderTryItCard();
        });
      } else if (comp.type === 'optical-encoder') {
        const rpm = Number(comp.state.rpm ?? 180);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${rpm} RPM</span></div>
          <input type="range" min="0" max="600" step="10" value="${rpm}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          comp.state.rpm = v;
          card.querySelector('.env-card-head span:last-child')!.textContent = `${v} RPM`;
          this.renderTryItCard();
        });
      } else if (comp.type === 'slide-switch') {
        const pos = Number(comp.state.position ?? 0);
        card.innerHTML = `
          <div class="env-card-head">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${pos === 1 ? 'is-active' : ''}">${pos === 1 ? 'C2 activo' : 'C1 activo'}</button>
          </div>`;
        card.querySelector('button')?.addEventListener('click', () => this.toggleSwitchState(comp));
      } else if (comp.type === 'pir-sensor') {
        const mot = Boolean(comp.state.motion);
        card.innerHTML = `
          <div class="env-card-head">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${mot ? 'is-active' : ''}">${mot ? 'Detectado' : 'Sin movimiento'}</button>
          </div>`;
        card.querySelector('button')?.addEventListener('click', () => {
          comp.state.motion = !comp.state.motion;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderEnvControls();
          this.renderTryItCard();
        });
      } else if (comp.type === 'joystick') {
        const x = Number(comp.state.x ?? 512);
        const y = Number(comp.state.y ?? 512);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>X:${x} Y:${y}</span></div>
          <label><span>Eje X (VRX)</span><span>${x}</span></label>
          <input type="range" min="0" max="1023" value="${x}" data-joy="x" />
          <label><span>Eje Y (VRY)</span><span>${y}</span></label>
          <input type="range" min="0" max="1023" value="${y}" data-joy="y" />`;
        card.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
          inp.addEventListener('input', () => {
            comp.state[inp.dataset.joy!] = Number(inp.value);
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
            this.renderEnvControls();
            this.renderTryItCard();
          });
        });
      } else if (comp.type === 'soil-moisture' || comp.type === 'gas-mq2' || comp.type === 'sound-sensor') {
        const key = comp.type === 'soil-moisture' ? 'moisturePct' : comp.type === 'gas-mq2' ? 'gasLevel' : 'soundLevel';
        const max = comp.type === 'gas-mq2' ? 1023 : 100;
        const unit = comp.type === 'gas-mq2' ? 'ppm' : '%';
        const v = Number(comp.state[key] ?? 40);
        card.innerHTML = `
          <div class="env-card-head"><span>${comp.name}</span><span>${v} ${unit}</span></div>
          <input type="range" min="0" max="${max}" value="${v}" />`;
        card.querySelector('input')?.addEventListener('input', (e) => {
          const val = Number((e.target as HTMLInputElement).value);
          comp.state[key] = val;
          card.querySelector('.env-card-head span:last-child')!.textContent = `${val} ${unit}`;
          this.renderTryItCard();
        });
      } else if (comp.type === 'ir-remote') {
        card.innerHTML = `
          <div class="env-card-head">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn wb-mini-btn-primary">Enviar comando 0x45</button>
          </div>`;
        card.querySelector('button')?.addEventListener('click', () => this.triggerIrCode(0x45));
      } else if (comp.type === 'rfid-rc522') {
        card.innerHTML = `
          <div class="env-card-head">
            <span>${comp.name}</span>
            <button type="button" class="wb-mini-btn ${this.rfidCardPresent ? 'is-active' : ''}">${this.rfidCardPresent ? 'Retirar tarjeta' : 'Acercar tarjeta'}</button>
          </div>`;
        card.querySelector('button')?.addEventListener('click', () => {
          this.rfidCardPresent = !this.rfidCardPresent;
          comp.state.cardPresent = this.rfidCardPresent;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          this.renderEnvControls();
          this.renderTryItCard();
        });
      } else {
        card.innerHTML = `<div class="env-card-head"><span>${comp.name}</span><span class="placed-list-chip">Clic en 3D para editar</span></div>`;
      }

      root.appendChild(card);
    }
  }

  private updateDiagnostics(): NetlistAnalysis {
    const analysis = analyzeNetlist(this.boardSpec, this.components, this.wires);
    this.netlist = analysis;

    const banner = document.getElementById('wb-alert-banner')!;
    if (analysis.diagnostics.length > 0) {
      const first = analysis.diagnostics[0];
      banner.hidden = false;
      banner.classList.toggle('is-warn', first.level === 'warn');
      banner.innerHTML = `<strong>${first.title}:</strong> ${first.detail}`;
    } else {
      banner.hidden = true;
    }
    return analysis;
  }

  private appendSerial(txt: string): void {
    const out = document.getElementById('serial-output')!;
    out.textContent += txt;
    if (out.textContent.length > 8000) out.textContent = out.textContent.slice(-6000);
    out.scrollTop = out.scrollHeight;
  }

  public async startSimulation(): Promise<void> {
    const analysis = this.updateDiagnostics();
    const statusPill = document.getElementById('wb-sim-status')!;
    const statusText = document.getElementById('wb-sim-status-text')!;
    const errBox = document.getElementById('code-error-box')!;
    errBox.hidden = true;
    this.warnedNoI2c = false;

    if (analysis.hasShortCircuit) {
      statusPill.className = 'wb-status-pill is-error';
      statusText.textContent = 'Cortocircuito detectado';
      audio.playError();
      return;
    }

    this.pinStates.clear();
    this.isRunning = true;
    this.stepperAngleDeg = 0;
    document.getElementById('workbench-shell')?.classList.add('is-simulating');
    const lockBtnIds = ['wb-place-all-btn', 'wb-autowire-btn', 'wb-clear-wires-btn', 'wb-toggle-bb-btn', 'wb-reset-bench-btn', 'wb-load-json-btn'];
    lockBtnIds.forEach((id) => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el) el.disabled = true;
    });

    const runBtn = document.getElementById('wb-run-btn')!;
    runBtn.classList.remove('is-ready');
    runBtn.classList.add('is-running');
    runBtn.querySelector('span:last-child')!.textContent = 'Detener';
    const slot = runBtn.querySelector('.icon-slot');
    if (slot) setSlotIcon(slot, 'square');

    statusPill.className = 'wb-status-pill is-running';
    statusText.textContent = `Simulando (circuito bloqueado) · ${this.boardSpec.name}`;

    // Registrar progreso si el circuito de la misión está completo y seguro
    const m = this.currentMission;
    if (
      m.id !== 'libre' &&
      !analysis.hasVoltageDanger &&
      m.components.every((mc) => this.components.some((c) => c.uid === mc.uid)) &&
      m.steps.every((s) => analysis.areConnected(s.from, s.to))
    ) {
      this.markMissionCompleted(m.id);
    }

    const code = this.editorView.state.doc.toString();

    this.runtime = new ArduinoRuntime({
      boardId: this.boardId,
      onDigitalWrite: (pin, val) => {
        this.pinStates.set(pin, val);
        this.syncHardwareVisuals();
      },
      onAnalogWrite: (pin, val) => {
        this.pinStates.set(pin, val / 255);
        this.syncHardwareVisuals();
      },
      onDigitalRead: (pin) => this.readDigitalFromHardware(pin),
      onAnalogRead: (pin) => this.readAnalogFromHardware(pin),
      onPulseIn: (pin) => this.readPulseInFromHardware(pin),
      onTone: (pin, freq, duration) => {
        let played = false;
        for (const comp of this.components) {
          if (comp.type !== 'buzzer' || !this.netlist) continue;
          const sig = this.netlist.findBoardSignalPin(comp.uid, 'SIG');
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'SIG', 'GND');
          if (sig.boardPinId === pin && pwr.hasGnd && freq > 0) {
            comp.state.freq = freq;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
            audio.playTone(freq, duration);
            played = true;
          }
        }
        if (!played) audio.stopTone();
      },
      onNoTone: () => {
        audio.stopTone();
        for (const comp of this.components) {
          if (comp.type === 'buzzer') {
            comp.state.freq = 0;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          }
        }
      },
      onSerialBegin: () => this.appendSerial(`[Serial iniciado en ${this.boardSpec.name}]\n`),
      onSerialPrint: (txt, nl) => this.appendSerial(nl ? `${txt}\n` : txt),
      onSerialAvailable: () => this.serialRxQueue.length,
      onSerialReadString: () => this.serialRxQueue.shift() ?? '',
      onServoWrite: (pin, angle) => {
        for (const comp of this.components) {
          if (comp.type !== 'servo' || !this.netlist) continue;
          const sig = this.netlist.findBoardSignalPin(comp.uid, 'SIG');
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
          if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
            comp.state.targetAngle = angle;
          }
        }
      },
      onLcdUpdate: (line0, line1, backlight) => {
        if (!this.netlist) return;
        for (const comp of this.components) {
          if (comp.type !== 'lcd-i2c') continue;
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
          const i2c = this.netlist.checkI2CConnection(comp.uid, 'SDA', 'SCL');
          if ((pwr.vccVoltage ?? 0) >= 4.5 && pwr.hasGnd && i2c.connected) {
            comp.state.line0 = line0;
            comp.state.line1 = line1;
            comp.state.powered = backlight;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          }
        }
      },
      onOledUpdate: (text) => {
        if (!this.netlist) return;
        for (const comp of this.components) {
          if (comp.type !== 'oled-i2c') continue;
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
          const i2c = this.netlist.checkI2CConnection(comp.uid, 'SDA', 'SCL');
          if (pwr.vccVoltage && pwr.hasGnd && i2c.connected) {
            comp.state.text = text;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          }
        }
      },
      onMatrixUpdate: (rows) => {
        for (const comp of this.components) {
          if (comp.type !== 'led-matrix') continue;
          comp.state.rows = rows.join(',');
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
        }
      },
      onSevenSegUpdate: (mask, active) => {
        for (const comp of this.components) {
          if (comp.type !== 'seven-seg') continue;
          comp.state.mask = mask;
          comp.state.active = active;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
        }
      },
      onStepperStep: (deltaSteps, phaseMask) => {
        this.stepperAngleDeg += deltaSteps * 1.8;
        for (const comp of this.components) {
          if (comp.type === 'stepper-28byj') {
            comp.state.stepAngle = this.stepperAngleDeg;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          } else if (comp.type === 'uln2003-driver') {
            comp.state.phaseMask = phaseMask;
            this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
          }
        }
      },
      onIrPoll: (pin) => {
        if (this.lastIrCommand === null) return null;
        for (const comp of this.components) {
          if (comp.type !== 'ir-receiver' || !this.netlist) continue;
          const sig = this.netlist.findBoardSignalPin(comp.uid, 'OUT');
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
          if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
            const cmd = this.lastIrCommand;
            this.lastIrCommand = null;
            return cmd;
          }
        }
        return null;
      },
      onRfidCheck: () => ({
        present: this.rfidCardPresent && this.components.some((c) => c.type === 'rfid-rc522'),
        uid: [0x12, 0x34, 0xab, 0xcd],
      }),
      onSonarPing: (_trig, echo) => {
        const comp = this.components.find(
          (c) => c.type === 'ultrasonic' && this.netlist?.findBoardSignalPin(c.uid, 'ECHO').boardPinId === echo
        );
        return comp ? Number(comp.state.distanceCm ?? 45) : 0;
      },
      onBmeRead: () => {
        const bme = this.components.find((c) => c.type === 'bme280');
        if (!bme || !this.netlist) {
          return { tempC: 0, pressureHpa: 0, humidity: 0, altitudeM: 0 };
        }
        const pwr = this.netlist.checkPowerSupply(bme.uid, 'VCC', 'GND');
        const i2c = this.netlist.checkI2CConnection(bme.uid, 'SDA', 'SCL');
        if (!pwr.vccVoltage || !pwr.hasGnd || !i2c.connected) {
          if (!this.warnedNoI2c) {
            this.warnedNoI2c = true;
            this.appendSerial('[Aviso: BME280 sin alimentación 3.3V/GND o sin conexión I2C SDA/SCL]\n');
          }
          return { tempC: 0, pressureHpa: 0, humidity: 0, altitudeM: 0 };
        }
        const tempC = Number(bme.state.tempC ?? 21.5);
        const pressureHpa = Number(bme.state.pressureHpa ?? 1013.25);
        const humidity = Number(bme.state.humidity ?? 54);
        const altitudeM = 44330 * (1 - Math.pow(pressureHpa / 1013.25, 0.1903));
        return { tempC, pressureHpa, humidity, altitudeM };
      },
      onDhtRead: (pin) => {
        if (!this.netlist) return { tempC: 0, humidity: 0 };
        for (const comp of this.components) {
          if (comp.type !== 'dht11') continue;
          const sig = this.netlist.findBoardSignalPin(comp.uid, 'DATA');
          const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
          if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
            return {
              tempC: Number(comp.state.tempC ?? 23),
              humidity: Number(comp.state.humidity ?? 52),
            };
          }
        }
        return { tempC: 0, humidity: 0 };
      },
    });

    this.syncHardwareVisuals();
    try {
      await this.runtime.start(code);
    } catch (err: any) {
      this.stopSimulation();
      statusPill.className = 'wb-status-pill is-error';
      statusText.textContent = 'Error en el código';
      errBox.hidden = false;
      const msg =
        err instanceof ArduinoCompileError
          ? `Línea ${err.line}: ${err.message}`
          : String(err?.message ?? err);
      errBox.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = msg;
      errBox.appendChild(span);

      if (err instanceof ArduinoCompileError && err.missingLibraryId) {
        const libId = err.missingLibraryId;
        const fixBtn = document.createElement('button');
        fixBtn.type = 'button';
        fixBtn.className = 'wb-mini-btn wb-mini-btn-primary';
        fixBtn.style.alignSelf = 'flex-start';
        fixBtn.textContent = 'Instalar en caché y reintentar';
        fixBtn.addEventListener('click', () => {
          installLibrary(libId);
          this.renderLibraryDrawer();
          this.startSimulation();
        });
        errBox.appendChild(fixBtn);
      }
      audio.playError();
    }
  }

  public stopSimulation(): void {
    this.isRunning = false;
    this.runtime?.stop();
    this.runtime = null;
    audio.stopTone();

    document.getElementById('workbench-shell')?.classList.remove('is-simulating');
    const lockBtnIds = ['wb-place-all-btn', 'wb-autowire-btn', 'wb-clear-wires-btn', 'wb-toggle-bb-btn', 'wb-reset-bench-btn', 'wb-load-json-btn'];
    lockBtnIds.forEach((id) => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el) el.disabled = false;
    });

    const runBtn = document.getElementById('wb-run-btn');
    if (runBtn) {
      runBtn.classList.remove('is-running');
      runBtn.querySelector('span:last-child')!.textContent = 'Ejecutar';
      const slot = runBtn.querySelector('.icon-slot');
      if (slot) setSlotIcon(slot, 'play');
    }

    const statusPill = document.getElementById('wb-sim-status');
    const statusText = document.getElementById('wb-sim-status-text');
    if (statusPill && statusText) {
      statusPill.className = 'wb-status-pill';
      statusText.textContent = 'Simulación detenida';
    }

    this.pinStates.clear();
    this.syncHardwareVisuals();
  }

  private readDigitalFromHardware(pin: string): 0 | 1 {
    if (!this.netlist) return 0;
    for (const comp of this.components) {
      if (comp.type === 'button') {
        const connA = this.netlist.findBoardSignalPin(comp.uid, 'A');
        const connB = this.netlist.findBoardSignalPin(comp.uid, 'B');
        if (connA.boardPinId === pin || connB.boardPinId === pin) {
          const gndA =
            this.netlist.checkPowerSupply(comp.uid, 'A', 'B').hasGnd ||
            this.netlist.checkPowerSupply(comp.uid, 'B', 'A').hasGnd;
          if (gndA) return comp.state.pressed ? 0 : 1;
          return comp.state.pressed ? 1 : 0;
        }
      }
      if (comp.type === 'optical-encoder') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'DO');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
          const rpm = Number(comp.state.rpm ?? 0);
          return rpm > 0 && Math.floor(performance.now() / Math.max(20, 6000 / rpm)) % 2 === 0 ? 1 : 0;
        }
      }
      if (comp.type === 'pir-sensor') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'OUT');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
          return comp.state.motion ? 1 : 0;
        }
      }
      if (comp.type === 'joystick') {
        const sw = this.netlist.findBoardSignalPin(comp.uid, 'SW');
        if (sw.boardPinId === pin) return comp.state.pressed ? 0 : 1;
      }
      if (comp.type === 'soil-moisture') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'DO');
        if (sig.boardPinId === pin) return Number(comp.state.moisturePct ?? 45) < 30 ? 1 : 0;
      }
      if (comp.type === 'gas-mq2') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'DO');
        if (sig.boardPinId === pin) return Number(comp.state.gasLevel ?? 180) > 450 ? 1 : 0;
      }
      if (comp.type === 'sound-sensor') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'DO');
        if (sig.boardPinId === pin) return Number(comp.state.soundLevel ?? 25) > 60 ? 1 : 0;
      }
    }
    return 0;
  }

  private readAnalogFromHardware(pin: string): number {
    if (!this.netlist) return 0;
    const maxVal = this.boardId === 'esp32' ? 4095 : 1023;
    for (const comp of this.components) {
      if (comp.type === 'potentiometer') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'SIG');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
          return Math.round((Number(comp.state.value ?? 512) / 1023) * maxVal);
        }
      }
      if (comp.type === 'ldr') {
        // Modelo real de 2 patitas: detecta conexión al pin analógico en divisor de voltaje
        const s1 = this.netlist.findBoardSignalPin(comp.uid, 'P1');
        const s2 = this.netlist.findBoardSignalPin(comp.uid, 'P2');
        const pwr1 = this.netlist.checkPowerSupply(comp.uid, 'P1', 'P2');
        const pwr2 = this.netlist.checkPowerSupply(comp.uid, 'P2', 'P1');
        if (
          s1.boardPinId === pin ||
          s2.boardPinId === pin ||
          pwr1.vccVoltage ||
          pwr2.vccVoltage
        ) {
          return Math.round((Number(comp.state.lightPct ?? 60) / 100) * maxVal);
        }
      }
      if (comp.type === 'joystick') {
        const sx = this.netlist.findBoardSignalPin(comp.uid, 'VRX');
        const sy = this.netlist.findBoardSignalPin(comp.uid, 'VRY');
        if (sx.boardPinId === pin) return Math.round((Number(comp.state.x ?? 512) / 1023) * maxVal);
        if (sy.boardPinId === pin) return Math.round((Number(comp.state.y ?? 512) / 1023) * maxVal);
      }
      if (comp.type === 'soil-moisture') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'AO');
        if (sig.boardPinId === pin) return Math.round((Number(comp.state.moisturePct ?? 45) / 100) * maxVal);
      }
      if (comp.type === 'gas-mq2') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'AO');
        if (sig.boardPinId === pin) return Math.round((Number(comp.state.gasLevel ?? 180) / 1023) * maxVal);
      }
      if (comp.type === 'sound-sensor') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'AO');
        if (sig.boardPinId === pin) return Math.round((Number(comp.state.soundLevel ?? 25) / 100) * maxVal);
      }
      if (comp.type === 'co2-sensor') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'AO');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        if (sig.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
          const ppm = Number(comp.state.ppm ?? 480);
          return Math.round(((ppm - 400) / 2600) * maxVal);
        }
      }
    }
    return 0;
  }

  private readPulseInFromHardware(pin: string): number {
    if (!this.netlist) return 0;
    for (const comp of this.components) {
      if (comp.type === 'ultrasonic') {
        const echo = this.netlist.findBoardSignalPin(comp.uid, 'ECHO');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        if (echo.boardPinId === pin && pwr.vccVoltage && pwr.hasGnd) {
          const dist = Number(comp.state.distanceCm ?? 45);
          return Math.round((dist * 2) / 0.034);
        }
      }
    }
    return 0;
  }

  private syncHardwareVisuals(): void {
    const builtinPin = this.boardId === 'uno' ? 'D13' : 'G2';
    const builtinVal = this.pinStates.get(builtinPin) ?? 0;
    if (this.builtBoard?.leds.builtin) {
      const bm = this.builtBoard.leds.builtin.material as THREE.MeshStandardMaterial;
      bm.emissiveIntensity = 0.12 + builtinVal * 2.4;
      const glow = this.builtBoard.leds.builtin.userData?.glowSprite as THREE.Sprite | undefined;
      if (glow) {
        glow.visible = builtinVal > 0.05;
        (glow.material as THREE.SpriteMaterial).opacity = builtinVal * 0.9;
      }
    }

    for (const comp of this.components) {
      if (!this.netlist) continue;
      if (comp.type === 'led') {
        const sig = this.netlist.findBoardSignalPin(comp.uid, 'A');
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'A', 'K');
        let brightness = 0;
        if (pwr.hasGnd) {
          if (sig.boardPinId) {
            brightness = this.pinStates.get(sig.boardPinId) ?? 0;
          } else if (pwr.vccVoltage) {
            brightness = 1;
          }
        }
        comp.state.brightness = brightness;
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      } else if (comp.type === 'rgb-led') {
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'R', 'K');
        if (pwr.hasGnd) {
          const rPin = this.netlist.findBoardSignalPin(comp.uid, 'R').boardPinId;
          const gPin = this.netlist.findBoardSignalPin(comp.uid, 'G').boardPinId;
          const bPin = this.netlist.findBoardSignalPin(comp.uid, 'B').boardPinId;
          comp.state.r = rPin ? (this.pinStates.get(rPin) ?? 0) : 0;
          comp.state.g = gPin ? (this.pinStates.get(gPin) ?? 0) : 0;
          comp.state.b = bPin ? (this.pinStates.get(bPin) ?? 0) : 0;
        } else {
          comp.state.r = 0;
          comp.state.g = 0;
          comp.state.b = 0;
        }
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      } else if (comp.type === 'dc-motor') {
        const posPin = this.netlist.findBoardSignalPin(comp.uid, 'M_POS').boardPinId;
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'M_POS', 'M_NEG');
        let spd = 0;
        if (pwr.hasGnd) {
          if (posPin) spd = this.pinStates.get(posPin) ?? 0;
          else if (pwr.vccVoltage) spd = 1;
        }
        comp.state.speed = this.isRunning ? spd : 0;
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      } else if (comp.type === 'relay-5v') {
        const inPin = this.netlist.findBoardSignalPin(comp.uid, 'IN').boardPinId;
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        const nextActive = Boolean(this.isRunning && pwr.vccVoltage && pwr.hasGnd && inPin && (this.pinStates.get(inPin) ?? 0) > 0.5);
        if (nextActive !== Boolean(comp.state.active)) {
          comp.state.active = nextActive;
          audio.playSwitchClick();
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
        }
      } else if (comp.type === 'ultrasonic') {
        const pwr = this.netlist.checkPowerSupply(comp.uid, 'VCC', 'GND');
        comp.state.active = this.isRunning && Boolean(pwr.vccVoltage && pwr.hasGnd);
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      }
    }
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    for (const comp of this.components) {
      if (
        comp.type === 'optical-encoder' ||
        comp.type === 'ultrasonic' ||
        comp.type === 'buzzer' ||
        comp.type === 'dc-motor' ||
        comp.type === 'ir-remote' ||
        comp.type === 'ir-receiver'
      ) {
        this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
      } else if (comp.type === 'servo') {
        const target = Number(comp.state.targetAngle ?? comp.state.angle ?? 90);
        const cur = Number(comp.state.angle ?? 90);
        if (Math.abs(target - cur) > 0.25) {
          comp.state.angle = cur + (target - cur) * 0.16;
          this.builtComponents.get(comp.uid)?.updateVisual?.(comp.state, comp.props);
        }
      }
    }
    if (this.cameraTweenTarget) {
      this.camera.position.lerp(this.cameraTweenTarget.pos, 0.14);
      this.controls.target.lerp(this.cameraTweenTarget.look, 0.14);
      if (this.camera.position.distanceTo(this.cameraTweenTarget.pos) < 0.04) {
        this.camera.position.copy(this.cameraTweenTarget.pos);
        this.cameraTweenTarget = null;
      }
    }
    this.controls.update();
    this.viewCube?.syncFromCamera();
    this.updateGuideBadgePositions();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.stopSimulation();
    this.renderer.dispose();
  }
}
