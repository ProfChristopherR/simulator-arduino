import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CubeViewPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

export class ViewCubeGizmo {
  private host: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private cubeEl: HTMLElement;
  private onSelectView: (preset: CubeViewPreset) => void;
  private mat4 = new THREE.Matrix4();

  constructor(
    host: HTMLElement,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    onSelectView: (preset: CubeViewPreset) => void
  ) {
    this.host = host;
    this.camera = camera;
    this.controls = controls;
    this.onSelectView = onSelectView;

    this.host.innerHTML = `
      <div class="vc-wrap" title="Arrastra para orbitar la cámara o haz clic en una cara">
        <button type="button" class="vc-home-btn" data-vc-preset="iso" title="Vista isométrica 3/4">3/4</button>
        <div class="vc-scene">
          <div class="vc-cube" id="vc-cube-el">
            <button type="button" class="vc-face vc-front" data-vc-preset="front">FRO</button>
            <button type="button" class="vc-face vc-back" data-vc-preset="back">TRA</button>
            <button type="button" class="vc-face vc-right" data-vc-preset="right">DER</button>
            <button type="button" class="vc-face vc-left" data-vc-preset="left">IZQ</button>
            <button type="button" class="vc-face vc-top" data-vc-preset="top">SUP</button>
            <button type="button" class="vc-face vc-bottom" data-vc-preset="bottom">INF</button>
          </div>
        </div>
      </div>
    `;

    this.cubeEl = this.host.querySelector('#vc-cube-el')!;
    this.bindEvents();
  }

  private bindEvents(): void {
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const spherical = new THREE.Spherical();
    const offset = new THREE.Vector3();

    this.cubeEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dragging = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      this.cubeEl.setPointerCapture?.(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.hypot(dx, dy) > 2) moved = true;
      lastX = e.clientX;
      lastY = e.clientY;

      offset.copy(this.camera.position).sub(this.controls.target);
      spherical.setFromVector3(offset);
      spherical.theta -= dx * 0.012;
      spherical.phi = Math.max(0.08, Math.min(Math.PI * 0.48, spherical.phi - dy * 0.012));
      offset.setFromSpherical(spherical);
      this.camera.position.copy(this.controls.target).add(offset);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
    });

    window.addEventListener('pointerup', () => {
      dragging = false;
    });

    this.host.querySelectorAll<HTMLButtonElement>('[data-vc-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (moved) {
          moved = false;
          return;
        }
        const preset = btn.dataset.vcPreset as CubeViewPreset;
        if (preset) this.onSelectView(preset);
      });
    });
  }

  public syncFromCamera(): void {
    this.mat4.extractRotation(this.camera.matrixWorldInverse);
    const e = this.mat4.elements;
    // Invertimos eje Y CSS vs WebGL para sincronía visual intuitiva del cubo
    const cssMat = `matrix3d(${e[0]},${-e[1]},${e[2]},0,${-e[4]},${e[5]},${-e[6]},0,${e[8]},${-e[9]},${e[10]},0,0,0,0,1)`;
    this.cubeEl.style.transform = cssMat;
  }
}
