import './styles/tokens.css';
import './styles/layout.css';
import './styles/clases.css';

import { ARDUINO_UNO_SPEC } from './boards/arduino-uno';
import { ESP32_SPEC } from './boards/esp32-devkit';
import { resistorBandsForOhms, formatOhms } from './lab/components/catalog';
import type { BoardId, PinCategory, PinDef } from './types';

function hexCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function mVar(sym: string, sub?: string): string {
  return `<span class="math-var">${sym}${sub ? `<sub>${sub}</sub>` : ''}</span>`;
}

function mFrac(numHtml: string, denHtml: string): string {
  return `<span class="math-frac"><span class="math-num">${numHtml}</span><span class="math-den">${denHtml}</span></span>`;
}

function mEq(innerHtml: string): string {
  return `<span class="math-eq">${innerHtml}</span>`;
}

/* =========================================================================
 * MÓDULO 1: Electricidad en 30 segundos (Voltaje, Corriente, Resistencia)
 * ========================================================================= */
function mountModElectricidad(): void {
  const root = document.getElementById('root-mod-electricidad')!;
  let volts = 5;
  let ohms = 330;

  root.innerHTML = `
    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Circuito animado en vivo</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 560 270" aria-label="Diagrama animado de voltaje, corriente y resistencia">
            <rect x="65" y="45" width="430" height="180" rx="18" fill="none" stroke="#334155" stroke-width="10" />
            <rect id="el-flow-line" class="electron-flow" x="65" y="45" width="430" height="180" rx="18"
              fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />

            <g transform="translate(24, 92)">
              <rect x="0" y="0" width="82" height="86" rx="10" fill="#0f172a" stroke="#ff7a1a" stroke-width="2.5" />
              <text x="41" y="28" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="13" font-weight="bold">FUENTE</text>
              <text id="el-svg-v" x="41" y="54" text-anchor="middle" fill="#fff" font-family="monospace" font-size="20" font-weight="bold">5.0 V</text>
              <text x="41" y="74" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">Presión (V)</text>
            </g>

            <g transform="translate(215, 22)">
              <rect x="0" y="0" width="130" height="46" rx="10" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="el-res-neck" x="14" y="15" width="102" height="16" rx="4" fill="#991b1b" opacity="0.55" />
              <text id="el-svg-r" x="65" y="28" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="13" font-weight="bold">330 Ω</text>
            </g>

            <g transform="translate(460, 102)">
              <circle id="el-bulb-glow" cx="35" cy="34" r="38" fill="#facc15" opacity="0.3" />
              <circle id="el-bulb-core" cx="35" cy="34" r="22" fill="#facc15" stroke="#fff" stroke-width="2" />
              <text x="35" y="76" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">CARGA</text>
            </g>

            <text id="el-svg-i" x="280" y="205" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="15" font-weight="bold">
              Corriente I = 15.2 mA
            </text>
          </svg>
        </div>
      </div>

      <div class="viz-card">
        <h3>Ajusta la presión y el freno</h3>
        <div class="ctrl-group">
          <label class="ctrl-label" for="el-v-range"><span>Voltaje (Presión)</span><span id="el-v-lbl">5.0 V</span></label>
          <input id="el-v-range" type="range" min="1.5" max="12" step="0.5" value="5" />
        </div>
        <div class="ctrl-group">
          <label class="ctrl-label" for="el-r-range"><span>Resistencia (Oposición)</span><span id="el-r-lbl">330 Ω</span></label>
          <input id="el-r-range" type="range" min="100" max="2000" step="10" value="330" />
        </div>

        <div class="kpi-trio">
          <div class="kpi-box"><span>Voltaje (V)</span><strong id="el-kpi-v">5.0 V</strong></div>
          <div class="kpi-box"><span>Resistencia (R)</span><strong id="el-kpi-r">330 Ω</strong></div>
          <div class="kpi-box"><span>Corriente (I)</span><strong id="el-kpi-i">15.2 mA</strong></div>
        </div>

        <div class="math-eq-box is-light" id="el-math-live"></div>

        <div class="rule-card is-good" style="margin-top:0">
          <strong>Analogía hidráulica</strong>
          El <b>Voltaje</b> es la presión de la bomba, la <b>Corriente</b> es el caudal por la tubería y la <b>Resistencia</b> estrecha el paso para proteger los componentes.
        </div>
      </div>
    </div>
  `;

  const update = () => {
    const ma = (volts / ohms) * 1000;
    const speedSec = Math.max(0.22, Math.min(3.4, 24 / Math.max(2, ma)));
    const flow = document.getElementById('el-flow-line') as HTMLElement;
    flow.style.setProperty('--flow-speed', `${speedSec.toFixed(2)}s`);

    document.getElementById('el-v-lbl')!.textContent = `${volts.toFixed(1)} V`;
    document.getElementById('el-r-lbl')!.textContent = formatOhms(ohms);
    document.getElementById('el-svg-v')!.textContent = `${volts.toFixed(1)} V`;
    document.getElementById('el-svg-r')!.textContent = formatOhms(ohms);
    document.getElementById('el-svg-i')!.textContent = `Corriente I = ${ma.toFixed(1)} mA`;

    document.getElementById('el-kpi-v')!.textContent = `${volts.toFixed(1)} V`;
    document.getElementById('el-kpi-r')!.textContent = formatOhms(ohms);
    document.getElementById('el-kpi-i')!.textContent = `${ma.toFixed(1)} mA`;

    document.getElementById('el-math-live')!.innerHTML = mEq(
      `${mVar('I')} <span class="math-op">=</span> ${mFrac(mVar('V'), mVar('R'))} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${volts.toFixed(1)} V</span>`, `<span class="math-val">${ohms} Ω</span>`)} <span class="math-op">=</span> <span class="math-val">${ma.toFixed(1)} mA</span>`
    );

    const glow = document.getElementById('el-bulb-glow')!;
    glow.setAttribute('opacity', String(Math.min(0.85, 0.12 + ma / 45)));
    const neck = document.getElementById('el-res-neck')!;
    const neckH = Math.max(4, Math.round(28 - (ohms / 2000) * 22));
    neck.setAttribute('height', String(neckH));
    neck.setAttribute('y', String(23 - neckH / 2));
  };

  document.getElementById('el-v-range')?.addEventListener('input', (e) => {
    volts = Number((e.target as HTMLInputElement).value);
    update();
  });
  document.getElementById('el-r-range')?.addEventListener('input', (e) => {
    ohms = Number((e.target as HTMLInputElement).value);
    update();
  });
  update();
}

/* =========================================================================
 * MÓDULO 2: Ley de Ohm (Ecuaciones directas) + Laboratorio LED con falla real
 * ========================================================================= */
type LedKey = 'red' | 'yellow' | 'green' | 'blue';
type OhmTarget = 'I' | 'V' | 'R' | 'R_LED';

function mountModOhm(): void {
  const root = document.getElementById('root-mod-ohm')!;
  let eqFocus: OhmTarget = 'R_LED';
  let sourceV = 5;
  let ledKey: LedKey = 'red';
  let ohms = 220;
  let ledState: 'ok' | 'overloading' | 'burned' = 'ok';
  let burnTimer: number | null = null;

  const LED_META: Record<LedKey, { name: string; vf: number; color: string }> = {
    red: { name: 'Rojo (2.0 V)', vf: 2.0, color: '#ef4444' },
    yellow: { name: 'Amarillo (2.1 V)', vf: 2.1, color: '#facc15' },
    green: { name: 'Verde (2.2 V)', vf: 2.2, color: '#22c55e' },
    blue: { name: 'Azul / Blanco (3.2 V)', vf: 3.2, color: '#3b82f6' },
  };

  root.innerHTML = `
    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Ecuaciones fundamentales de la Ley de Ohm</h3>
        <div class="ohm-eq-grid" id="ohm-eq-cards">
          <button type="button" class="ohm-eq-card" data-ohm-eq="V">
            <span class="ohm-eq-tag">Despejar Voltaje</span>
            ${mEq(`${mVar('V')} <span class="math-op">=</span> ${mVar('I')} <span class="math-op">·</span> ${mVar('R')}`)}
          </button>
          <button type="button" class="ohm-eq-card" data-ohm-eq="I">
            <span class="ohm-eq-tag">Despejar Corriente</span>
            ${mEq(`${mVar('I')} <span class="math-op">=</span> ${mFrac(mVar('V'), mVar('R'))}`)}
          </button>
          <button type="button" class="ohm-eq-card" data-ohm-eq="R">
            <span class="ohm-eq-tag">Despejar Resistencia</span>
            ${mEq(`${mVar('R')} <span class="math-op">=</span> ${mFrac(mVar('V'), mVar('I'))}`)}
          </button>
          <button type="button" class="ohm-eq-card is-active" data-ohm-eq="R_LED">
            <span class="ohm-eq-tag">Resistencia para LED</span>
            ${mEq(`${mVar('R', 'LED')} <span class="math-op">=</span> ${mFrac(`${mVar('V', 'fuente')} <span class="math-op">−</span> ${mVar('V', 'LED')}`, mVar('I', 'deseada'))}`)}
          </button>
        </div>

        <div class="math-eq-box" id="ohm-formula-live"></div>
        <p id="ohm-formula-desc" style="margin:0;font-size:.88rem;color:var(--ink-2)"></p>

        <div class="rule-card is-good" style="margin-top:auto">
          <strong>Regla de oro en Arduino</strong>
          Un LED estándar trabaja seguro entre <b>10 mA y 20 mA</b> (0.010 A – 0.020 A). Sobre <b>30 mA</b> el chip interno se sobrecalienta y se destruye irreversiblemente.
        </div>
      </div>

      <div class="viz-card">
        <h3>Laboratorio de LED + Resistencia real</h3>
        <div class="ctrl-group">
          <span class="ctrl-label"><span>Fuente de alimentación</span></span>
          <div class="pill-row">
            ${[3.3, 5, 9, 12].map((v) => `<button type="button" class="seg-btn ${v === 5 ? 'is-active' : ''}" data-src-v="${v}">${v} V</button>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <span class="ctrl-label"><span>Color del LED (Caída V<sub>LED</sub>)</span></span>
          <div class="pill-row">
            ${Object.entries(LED_META).map(([k, info]) => `<button type="button" class="seg-btn ${k === 'red' ? 'is-active' : ''}" data-led-k="${k}">${info.name}</button>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <label class="ctrl-label" for="ohm-r-slider"><span>Resistencia en serie</span><span id="ohm-r-val">220 Ω</span></label>
          <input id="ohm-r-slider" type="range" min="33" max="2200" step="10" value="220" />
        </div>

        <div class="svg-stage">
          <svg viewBox="0 0 460 175" aria-label="Simulador de LED con animación de quema y código de colores">
            <line x1="25" y1="92" x2="435" y2="92" stroke="#475569" stroke-width="5" />
            <line id="ohm-flow" class="electron-flow" x1="25" y1="92" x2="435" y2="92" stroke="#38bdf8" stroke-width="3" />

            <!-- Resistencia SVG 4 bandas -->
            <g transform="translate(82, 66)">
              <rect x="0" y="8" width="142" height="36" rx="16" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="ohm-b0" x="26" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b1" x="50" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b2" x="74" y="8" width="11" height="36" fill="#7c4318" />
              <rect id="ohm-b3" x="104" y="8" width="11" height="36" fill="#d4a007" />
              <text id="ohm-svg-res-lbl" x="71" y="64" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="12">220 Ω · ±5%</text>
            </g>

            <!-- LED animado + sobrecarga + humo -->
            <g transform="translate(316, 38)">
              <circle id="ohm-led-halo" cx="44" cy="54" r="48" fill="#ef4444" opacity="0.4" />
              <circle id="ohm-led-dome" cx="44" cy="54" r="24" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <!-- Chispas de sobrecarga -->
              <g id="ohm-sparks" opacity="0">
                <path class="led-spark" d="M44 18 L48 34 L64 26 L52 40 L70 46 L52 52 L60 68 L44 58 L28 68 L36 52 L18 46 L36 40 L24 26 L40 34 Z" fill="#fef08a" />
              </g>
              <!-- Humo y filamento roto al quemarse -->
              <g id="ohm-smoke-grp" opacity="0">
                <circle class="led-smoke" cx="34" cy="24" r="8" fill="#94a3b8" />
                <circle class="led-smoke" cx="50" cy="18" r="10" fill="#64748b" style="animation-delay:0.4s" />
                <path d="M32 44 L42 54 L36 62 M56 44 L46 54 L52 64" stroke="#f87171" stroke-width="2.5" fill="none" />
              </g>
              <text id="ohm-led-ma" x="44" y="114" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="12" font-weight="bold">13.6 mA</text>
            </g>
          </svg>
        </div>

        <div id="ohm-safety-banner" class="status-banner is-ok">Corriente segura (13.6 mA) — Brillo óptimo sin dañar el LED.</div>
        <button type="button" class="btn-replace-led" id="btn-replace-led" hidden>Reemplazar LED quemado</button>
      </div>
    </div>
  `;

  const renderFormula = () => {
    const meta = LED_META[ledKey];
    const vDrop = Math.max(0, sourceV - meta.vf);
    const ma = ledState === 'burned' ? 0 : (vDrop / ohms) * 1000;
    const recOhms = Math.max(47, Math.round(vDrop / 0.015));

    const box = document.getElementById('ohm-formula-live')!;
    const desc = document.getElementById('ohm-formula-desc')!;

    if (eqFocus === 'V') {
      box.innerHTML = mEq(`${mVar('V', 'R')} <span class="math-op">=</span> ${mVar('I')} <span class="math-op">·</span> ${mVar('R')} <span class="math-op">=</span> <span class="math-val">${(ma / 1000).toFixed(3)} A</span> <span class="math-op">·</span> <span class="math-val">${ohms} Ω</span> <span class="math-op">=</span> <span class="math-val">${((ma / 1000) * ohms).toFixed(2)} V</span>`);
      desc.textContent = 'Calcula la caída de tensión en la resistencia limitadora al multiplicar la corriente por el valor en ohmios.';
    } else if (eqFocus === 'I') {
      box.innerHTML = mEq(`${mVar('I')} <span class="math-op">=</span> ${mFrac(`${mVar('V', 'fuente')} <span class="math-op">−</span> ${mVar('V', 'LED')}`, mVar('R'))} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${vDrop.toFixed(1)} V</span>`, `<span class="math-val">${ohms} Ω</span>`)} <span class="math-op">=</span> <span class="math-val">${ma.toFixed(1)} mA</span>`);
      desc.textContent = 'Permite comprobar cuántos miliamperios circulan por el LED antes de energizar el circuito real.';
    } else if (eqFocus === 'R') {
      box.innerHTML = mEq(`${mVar('R')} <span class="math-op">=</span> ${mFrac(mVar('V', 'R'), mVar('I'))} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${vDrop.toFixed(1)} V</span>`, `<span class="math-val">${Math.max(0.001, ma / 1000).toFixed(3)} A</span>`)} <span class="math-op">=</span> <span class="math-val">${ohms} Ω</span>`);
      desc.textContent = 'Si conoces el voltaje sobrante y la corriente medida, obtienes exactamente la resistencia presente.';
    } else {
      box.innerHTML = mEq(`${mVar('R', 'rec')} <span class="math-op">=</span> ${mFrac(`${mVar('V', 'fuente')} <span class="math-op">−</span> ${mVar('V', 'LED')}`, '<span class="math-val">0.015 A</span>')} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${sourceV} V − ${meta.vf} V</span>`, '<span class="math-val">0.015 A</span>')} <span class="math-op">≈</span> <span class="math-val">${recOhms} Ω</span>`);
      desc.textContent = 'Con esta ecuación calculas la resistencia mínima recomendada para fijar unos seguros 15 mA.';
    }
  };

  const applyVisuals = () => {
    const meta = LED_META[ledKey];
    const vDrop = Math.max(0, sourceV - meta.vf);
    const ma = (vDrop / ohms) * 1000;
    const recOhms = Math.max(47, Math.round(vDrop / 0.015));

    const bands = resistorBandsForOhms(ohms);
    bands.forEach((hex, i) => {
      document.getElementById(`ohm-b${i}`)?.setAttribute('fill', hexCss(hex));
    });
    document.getElementById('ohm-r-val')!.textContent = formatOhms(ohms);
    document.getElementById('ohm-svg-res-lbl')!.textContent = `${formatOhms(ohms)} · ±5%`;

    const flow = document.getElementById('ohm-flow') as HTMLElement;
    const halo = document.getElementById('ohm-led-halo')!;
    const dome = document.getElementById('ohm-led-dome')!;
    const sparks = document.getElementById('ohm-sparks')!;
    const smoke = document.getElementById('ohm-smoke-grp')!;
    const banner = document.getElementById('ohm-safety-banner')!;
    const replaceBtn = document.getElementById('btn-replace-led') as HTMLButtonElement;
    const maText = document.getElementById('ohm-led-ma')!;

    if (ledState === 'ok' && ma > 30) {
      ledState = 'overloading';
      if (burnTimer) clearTimeout(burnTimer);
      burnTimer = window.setTimeout(() => {
        ledState = 'burned';
        applyVisuals();
      }, 650);
    }

    if (ledState === 'overloading') {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', '0.18s');
      halo.setAttribute('fill', '#fef08a');
      halo.setAttribute('opacity', '0.95');
      dome.setAttribute('fill', '#ffffff');
      sparks.setAttribute('opacity', '1');
      smoke.setAttribute('opacity', '0');
      maText.textContent = `${ma.toFixed(1)} mA ¡SOBRECARGA!`;
      banner.className = 'status-banner is-bad';
      banner.textContent = `¡Sobrecorriente extrema (${ma.toFixed(1)} mA)! El LED está brillando al máximo antes de fundirse...`;
      replaceBtn.hidden = true;
    } else if (ledState === 'burned') {
      flow.classList.add('is-stopped');
      halo.setAttribute('opacity', '0');
      dome.setAttribute('fill', '#1f2937');
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '1');
      maText.textContent = '0.0 mA (Abierto)';
      banner.className = 'status-banner is-bad';
      banner.textContent = `¡LED QUEMADO! Aunque subas la resistencia a ${recOhms} Ω, el componente ya se dañó. Pulsa "Reemplazar LED".`;
      replaceBtn.hidden = false;
    } else if (vDrop <= 0.1) {
      flow.classList.add('is-stopped');
      halo.setAttribute('opacity', '0');
      dome.setAttribute('fill', '#475569');
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '0');
      maText.textContent = '0.0 mA';
      banner.className = 'status-banner is-warn';
      banner.textContent = `Voltaje insuficiente (${sourceV} V < ${meta.vf} V del LED). El LED no alcanza a conducir.`;
      replaceBtn.hidden = true;
    } else if (ma > 20) {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', '0.45s');
      halo.setAttribute('fill', meta.color);
      halo.setAttribute('opacity', '0.78');
      dome.setAttribute('fill', meta.color);
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '0');
      maText.textContent = `${ma.toFixed(1)} mA`;
      banner.className = 'status-banner is-warn';
      banner.textContent = `Al límite del pin Arduino (${ma.toFixed(1)} mA). Sube a ≥ ${recOhms} Ω para trabajar seguro bajo 20 mA.`;
      replaceBtn.hidden = true;
    } else {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', `${Math.max(0.45, Math.min(2.6, 18 / Math.max(1, ma))).toFixed(2)}s`);
      halo.setAttribute('fill', meta.color);
      halo.setAttribute('opacity', String(Math.min(0.75, 0.18 + ma / 25)));
      dome.setAttribute('fill', meta.color);
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '0');
      maText.textContent = `${ma.toFixed(1)} mA`;
      banner.className = 'status-banner is-ok';
      banner.textContent = `Corriente segura (${ma.toFixed(1)} mA) — Brillo óptimo y pin protegido.`;
      replaceBtn.hidden = true;
    }

    renderFormula();
  };

  root.querySelectorAll<HTMLButtonElement>('[data-ohm-eq]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-ohm-eq]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      eqFocus = btn.dataset.ohmEq as OhmTarget;
      renderFormula();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-src-v]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-src-v]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      sourceV = Number(btn.dataset.srcV);
      applyVisuals();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-led-k]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-led-k]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      ledKey = btn.dataset.ledK as LedKey;
      applyVisuals();
    });
  });

  document.getElementById('ohm-r-slider')?.addEventListener('input', (e) => {
    ohms = Number((e.target as HTMLInputElement).value);
    applyVisuals();
  });

  document.getElementById('btn-replace-led')?.addEventListener('click', () => {
    if (burnTimer) clearTimeout(burnTimer);
    ledState = 'ok';
    applyVisuals();
  });

  applyVisuals();
}

/* =========================================================================
 * MÓDULO 3: Circuitos en Serie vs. Paralelo interactivos
 * ========================================================================= */
function mountModSerieParalelo(): void {
  const root = document.getElementById('root-mod-serie-paralelo')!;
  let seriesOpen = false;
  let parallelBranch1Open = false;
  let rVal = 220;

  root.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:.78rem;color:var(--navy);font-weight:700">Resistencias R₁ y R₂:</span>
      ${[220, 470, 1000].map((v) => `<button type="button" class="seg-btn ${v === 220 ? 'is-active' : ''}" data-sp-r="${v}">${formatOhms(v)}</button>`).join('')}
    </div>

    <div class="sp-compare-grid">
      <div class="viz-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3>Circuito en Serie (1 solo camino)</h3>
          <button type="button" class="seg-btn" id="btn-sp-series">Desconectar LED 1</button>
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 460 190" aria-label="Circuito animado en serie">
            <rect x="45" y="42" width="370" height="122" rx="14" fill="none" stroke="#334155" stroke-width="8" />
            <rect id="sp-ser-flow" class="electron-flow" x="45" y="42" width="370" height="122" rx="14"
              fill="none" stroke="#38bdf8" stroke-width="4" />
            <rect x="18" y="78" width="54" height="48" rx="8" fill="#0f172a" stroke="#ff7a1a" stroke-width="2" />
            <text x="45" y="107" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

            <g transform="translate(155, 22)">
              <circle id="sp-ser-led1" cx="22" cy="20" r="18" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 1</text>
            </g>
            <g transform="translate(295, 22)">
              <circle id="sp-ser-led2" cx="22" cy="20" r="18" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 2</text>
            </g>
          </svg>
        </div>
        <div class="math-eq-box is-light" id="sp-ser-eq"></div>
        <div id="sp-ser-msg" class="status-banner is-ok">Misma corriente en ambos LEDs; el voltaje se reparte entre ellos.</div>
      </div>

      <div class="viz-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3>Circuito en Paralelo (caminos independientes)</h3>
          <button type="button" class="seg-btn" id="btn-sp-par">Desconectar LED 1</button>
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 460 190" aria-label="Circuito animado en paralelo">
            <rect x="45" y="36" width="195" height="128" rx="12" fill="none" stroke="#334155" stroke-width="7" />
            <rect id="sp-par-flow1" class="electron-flow" x="45" y="36" width="195" height="128" rx="12"
              fill="none" stroke="#38bdf8" stroke-width="3.5" />
            <path d="M 240 36 L 395 36 Q 409 36 409 50 L 409 150 Q 409 164 395 164 L 240 164"
              fill="none" stroke="#334155" stroke-width="7" />
            <path id="sp-par-flow2" class="electron-flow" d="M 240 36 L 395 36 Q 409 36 409 50 L 409 150 Q 409 164 395 164 L 240 164"
              fill="none" stroke="#34d399" stroke-width="3.5" />

            <rect x="18" y="78" width="54" height="48" rx="8" fill="#0f172a" stroke="#ff7a1a" stroke-width="2" />
            <text x="45" y="107" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

            <g transform="translate(218, 78)">
              <circle id="sp-par-led1" cx="22" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 1</text>
            </g>
            <g transform="translate(387, 78)">
              <circle id="sp-par-led2" cx="22" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 2</text>
            </g>
          </svg>
        </div>
        <div class="math-eq-box is-light" id="sp-par-eq"></div>
        <div id="sp-par-msg" class="status-banner is-ok">Ambos reciben 5 V completos; si falla uno, el otro sigue funcionando.</div>
      </div>
    </div>
  `;

  const render = () => {
    const reqSer = rVal * 2;
    const reqPar = rVal / 2;
    const iSer = seriesOpen ? '0.0' : ((5 / reqSer) * 1000).toFixed(1);
    document.getElementById('sp-ser-eq')!.innerHTML = mEq(
      `${mVar('R', 'eq')} <span class="math-op">=</span> ${mVar('R', '1')} <span class="math-op">+</span> ${mVar('R', '2')} <span class="math-op">=</span> <span class="math-val">${formatOhms(reqSer)}</span> · ${mVar('I', 'T')} <span class="math-op">=</span> <span class="math-val">${iSer} mA</span>`
    );
    document.getElementById('sp-par-eq')!.innerHTML = mEq(
      `${mVar('R', 'eq')} <span class="math-op">=</span> ${mFrac(`${mVar('R', '1')} <span class="math-op">·</span> ${mVar('R', '2')}`, `${mVar('R', '1')} <span class="math-op">+</span> ${mVar('R', '2')}`)} <span class="math-op">=</span> <span class="math-val">${formatOhms(reqPar)}</span>`
    );

    const serFlow = document.getElementById('sp-ser-flow')!;
    const serL1 = document.getElementById('sp-ser-led1')!;
    const serL2 = document.getElementById('sp-ser-led2')!;
    const serMsg = document.getElementById('sp-ser-msg')!;
    const serBtn = document.getElementById('btn-sp-series')!;

    serFlow.classList.toggle('is-stopped', seriesOpen);
    serL1.setAttribute('fill', seriesOpen ? '#334155' : '#ef4444');
    serL2.setAttribute('fill', seriesOpen ? '#334155' : '#ef4444');
    serBtn.textContent = seriesOpen ? 'Reconectar LED 1' : 'Desconectar LED 1';
    serBtn.classList.toggle('is-active', seriesOpen);
    serMsg.className = `status-banner ${seriesOpen ? 'is-bad' : 'is-ok'}`;
    serMsg.textContent = seriesOpen
      ? 'Al abrir el LED 1 se corta el único camino: ambos LEDs se apagan.'
      : 'Misma corriente en ambos LEDs; el voltaje se reparte entre ellos.';

    const parF1 = document.getElementById('sp-par-flow1')!;
    const parL1 = document.getElementById('sp-par-led1')!;
    const parMsg = document.getElementById('sp-par-msg')!;
    const parBtn = document.getElementById('btn-sp-par')!;

    parF1.classList.toggle('is-stopped', parallelBranch1Open);
    parL1.setAttribute('fill', parallelBranch1Open ? '#334155' : '#22c55e');
    parBtn.textContent = parallelBranch1Open ? 'Reconectar LED 1' : 'Desconectar LED 1';
    parBtn.classList.toggle('is-active', parallelBranch1Open);
    parMsg.className = `status-banner ${parallelBranch1Open ? 'is-warn' : 'is-ok'}`;
    parMsg.textContent = parallelBranch1Open
      ? '¡Observa! Aunque LED 1 está abierto, LED 2 sigue encendido por su rama independiente.'
      : 'Ambos reciben 5 V completos; si falla uno, el otro sigue funcionando.';
  };

  document.getElementById('btn-sp-series')?.addEventListener('click', () => {
    seriesOpen = !seriesOpen;
    render();
  });
  document.getElementById('btn-sp-par')?.addEventListener('click', () => {
    parallelBranch1Open = !parallelBranch1Open;
    render();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-sp-r]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sp-r]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      rVal = Number(btn.dataset.spR);
      render();
    });
  });

  render();
}

/* =========================================================================
 * MÓDULO 4: Protoboard completa (Riel superior + inferior + Simulador cables)
 * ========================================================================= */
interface BbHoleMeta {
  id: string;
  track: string;
  cx: number;
  cy: number;
  railKind: 'plus' | 'minus' | 'signal';
}

function mountModProtoboard(): void {
  const root = document.getElementById('root-mod-protoboard')!;
  const cols = 16;
  const holes: BbHoleMeta[] = [];
  const colX = (c: number) => 76 + (c - 1) * 31;

  for (let c = 1; c <= cols; c++) {
    const x = colX(c);
    holes.push({ id: `tp${c}`, track: 'rail_top_plus', cx: x, cy: 34, railKind: 'plus' });
    holes.push({ id: `tm${c}`, track: 'rail_top_minus', cx: x, cy: 56, railKind: 'minus' });

    const topRows = ['a', 'b', 'c', 'd', 'e'];
    topRows.forEach((row, r) => {
      holes.push({ id: `${row}${c}`, track: `col_top_${c}`, cx: x, cy: 96 + r * 20, railKind: 'signal' });
    });

    const botRows = ['f', 'g', 'h', 'i', 'j'];
    botRows.forEach((row, r) => {
      holes.push({ id: `${row}${c}`, track: `col_bot_${c}`, cx: x, cy: 224 + r * 20, railKind: 'signal' });
    });

    holes.push({ id: `bp${c}`, track: 'rail_bot_plus', cx: x, cy: 334, railKind: 'plus' });
    holes.push({ id: `bm${c}`, track: 'rail_bot_minus', cx: x, cy: 356, railKind: 'minus' });
  }

  const SIGNAL_PALETTE = ['#16a34a', '#ff7a1a', '#9333ea', '#0d9488', '#db2777', '#ca8a04'];
  const wires: Array<{ from: string; to: string }> = [];
  let pendingStart: string | null = null;

  const colHeadersSvg = Array.from({ length: cols }, (_, i) => {
    const c = i + 1;
    const x = colX(c);
    return `
      <text x="${x}" y="80" text-anchor="middle" fill="#475569" font-family="monospace" font-size="10" font-weight="bold">${c}</text>
      <text x="${x}" y="319" text-anchor="middle" fill="#475569" font-family="monospace" font-size="10" font-weight="bold">${c}</text>
    `;
  }).join('');

  const rowLettersSvg = [
    ...['a', 'b', 'c', 'd', 'e'].map((ch, r) => {
      const y = 96 + r * 20 + 3.5;
      return `<text x="50" y="${y}" text-anchor="middle" fill="#1c2b5a" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>
              <text x="568" y="${y}" text-anchor="middle" fill="#1c2b5a" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>`;
    }),
    ...['f', 'g', 'h', 'i', 'j'].map((ch, r) => {
      const y = 224 + r * 20 + 3.5;
      return `<text x="50" y="${y}" text-anchor="middle" fill="#1c2b5a" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>
              <text x="568" y="${y}" text-anchor="middle" fill="#1c2b5a" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>`;
    }),
  ].join('');

  root.innerHTML = `
    <div class="viz-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <h3>Haz clic entre dos orificios para conectar un cable</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="seg-btn" id="bb-undo-wire">Deshacer cable</button>
          <button type="button" class="seg-btn" id="bb-clear-wires">Limpiar cables</button>
        </div>
      </div>

      <div id="bb-xray-info" class="status-banner is-ok" style="font-family:var(--mono);font-size:.8rem">
        Pasa el cursor para ver la lámina interna o haz clic en un pin para comenzar un cable.
      </div>

      <div class="svg-stage is-light">
        <svg viewBox="0 0 620 390" id="bb-svg" aria-label="Protoboard interactiva con rieles superior e inferior">
          <rect x="18" y="12" width="584" height="366" rx="14" fill="#f7f2ea" stroke="#b9b09f" stroke-width="3" />

          <!-- Rieles superior e inferior -->
          <line x1="56" y1="22" x2="564" y2="22" stroke="#dc2626" stroke-width="2.5" />
          <line x1="56" y1="67" x2="564" y2="67" stroke="#2563eb" stroke-width="2.5" />
          <text x="36" y="38" fill="#dc2626" font-family="monospace" font-weight="bold" font-size="16">+</text>
          <text x="36" y="61" fill="#2563eb" font-family="monospace" font-weight="bold" font-size="18">-</text>

          <line x1="56" y1="324" x2="564" y2="324" stroke="#dc2626" stroke-width="2.5" />
          <line x1="56" y1="368" x2="564" y2="368" stroke="#2563eb" stroke-width="2.5" />
          <text x="36" y="339" fill="#dc2626" font-family="monospace" font-weight="bold" font-size="16">+</text>
          <text x="36" y="361" fill="#2563eb" font-family="monospace" font-weight="bold" font-size="18">-</text>

          <!-- Canal central DIP -->
          <rect x="44" y="192" width="532" height="16" rx="4" fill="#ded7c8" />
          <text x="310" y="203.5" text-anchor="middle" fill="#645e52" font-family="monospace" font-size="10" font-weight="bold">CANAL CENTRAL AISLADO (a–e arriba · f–j abajo)</text>

          ${colHeadersSvg}
          ${rowLettersSvg}

          <!-- Capa de iluminado de pistas conectadas + Rayos X -->
          <g id="bb-tracks-overlay"></g>
          <rect id="bb-xray-bar" x="0" y="0" width="0" height="0" rx="6" fill="#ff7a1a" opacity="0.28" pointer-events="none" />

          <!-- Orificios -->
          <g id="bb-holes-layer">
            ${holes
              .map(
                (h) =>
                  `<circle class="bb-hole-dot" data-hole-id="${h.id}" cx="${h.cx}" cy="${h.cy}" r="5.2" fill="#1e293b" />`
              )
              .join('')}
          </g>

          <!-- Cables conectados -->
          <g id="bb-wires-layer" pointer-events="none"></g>
        </svg>
      </div>

      <div class="mini-rules">
        <div class="rule-card is-good"><strong>✓ Columnas de señal (a–e / f–j)</strong>Al conectar dos columnas, toda la columna de ambos lados comparte el mismo color de señal.</div>
        <div class="rule-card is-good"><strong>✓ Rieles + y - (arriba y abajo)</strong>Los rieles de potencia conservan siempre rojo (+) y azul (−) a lo largo de toda la fila.</div>
        <div class="rule-card is-bad"><strong>✗ ¡Atención con los puentes!</strong>El riel superior NO está conectado internamente al inferior salvo que pongas un cable puente entre ellos.</div>
      </div>
    </div>
  `;

  const infoEl = document.getElementById('bb-xray-info')!;
  const xrayBar = document.getElementById('bb-xray-bar')!;
  const tracksOverlay = document.getElementById('bb-tracks-overlay')!;
  const wiresLayer = document.getElementById('bb-wires-layer')!;

  const drawTrackHighlight = (track: string, color: string, opacity: number): string => {
    if (track === 'rail_top_plus') return `<rect x="64" y="25" width="490" height="17" rx="6" fill="${color}" opacity="${opacity}" />`;
    if (track === 'rail_top_minus') return `<rect x="64" y="48" width="490" height="17" rx="6" fill="${color}" opacity="${opacity}" />`;
    if (track === 'rail_bot_plus') return `<rect x="64" y="326" width="490" height="17" rx="6" fill="${color}" opacity="${opacity}" />`;
    if (track === 'rail_bot_minus') return `<rect x="64" y="348" width="490" height="17" rx="6" fill="${color}" opacity="${opacity}" />`;
    const mTop = /^col_top_(\d+)$/.exec(track);
    if (mTop) return `<rect x="${colX(Number(mTop[1])) - 9}" y="86" width="18" height="98" rx="6" fill="${color}" opacity="${opacity}" />`;
    const mBot = /^col_bot_(\d+)$/.exec(track);
    if (mBot) return `<rect x="${colX(Number(mBot[1])) - 9}" y="214" width="18" height="98" rx="6" fill="${color}" opacity="${opacity}" />`;
    return '';
  };

  const recomputeAndDraw = () => {
    // Union-find sobre tracks para asignar colores consistentes a redes conectadas
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r)!;
      return r;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    const usedTracks = new Set<string>();
    for (const w of wires) {
      const hA = holes.find((h) => h.id === w.from);
      const hB = holes.find((h) => h.id === w.to);
      if (!hA || !hB) continue;
      usedTracks.add(hA.track);
      usedTracks.add(hB.track);
      union(hA.track, hB.track);
    }

    // Determinar color por componente conexo
    const compTracks = new Map<string, string[]>();
    for (const tr of usedTracks) {
      const rootKey = find(tr);
      if (!compTracks.has(rootKey)) compTracks.set(rootKey, []);
      compTracks.get(rootKey)!.push(tr);
    }

    const compColor = new Map<string, string>();
    let sigIdx = 0;
    for (const [rootKey, list] of compTracks.entries()) {
      const hasPlus = list.some((t) => t.endsWith('_plus'));
      const hasMinus = list.some((t) => t.endsWith('_minus'));
      if (hasPlus && !hasMinus) {
        compColor.set(rootKey, '#dc2626');
      } else if (hasMinus && !hasPlus) {
        compColor.set(rootKey, '#2563eb');
      } else if (hasPlus && hasMinus) {
        compColor.set(rootKey, '#b91c1c');
      } else {
        compColor.set(rootKey, SIGNAL_PALETTE[sigIdx % SIGNAL_PALETTE.length]);
        sigIdx++;
      }
    }

    tracksOverlay.innerHTML = [...usedTracks]
      .map((tr) => drawTrackHighlight(tr, compColor.get(find(tr)) ?? '#16a34a', 0.34))
      .join('');

    wiresLayer.innerHTML = wires
      .map((w, idx) => {
        const hA = holes.find((h) => h.id === w.from)!;
        const hB = holes.find((h) => h.id === w.to)!;
        const col = compColor.get(find(hA.track)) ?? '#16a34a';
        const midX = (hA.cx + hB.cx) / 2;
        const arc = 26 + (idx % 3) * 12;
        const midY = Math.min(hA.cy, hB.cy) - arc;
        return `
          <path d="M ${hA.cx} ${hA.cy} Q ${midX} ${midY} ${hB.cx} ${hB.cy}"
            fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" opacity="0.95" />
          <circle cx="${hA.cx}" cy="${hA.cy}" r="3.5" fill="${col}" stroke="#fff" stroke-width="1.2" />
          <circle cx="${hB.cx}" cy="${hB.cy}" r="3.5" fill="${col}" stroke="#fff" stroke-width="1.2" />
        `;
      })
      .join('');

    root.querySelectorAll<SVGCircleElement>('[data-hole-id]').forEach((el) => {
      const isPending = el.dataset.holeId === pendingStart;
      el.setAttribute('stroke', isPending ? '#ff7a1a' : 'none');
      el.setAttribute('stroke-width', isPending ? '2.5' : '0');
    });
  };

  root.querySelectorAll<SVGCircleElement>('[data-hole-id]').forEach((dot) => {
    const hole = holes.find((h) => h.id === dot.dataset.holeId)!;
    dot.addEventListener('mouseenter', () => {
      if (hole.track === 'rail_top_plus' || hole.track === 'rail_bot_plus') {
        xrayBar.setAttribute('x', '64');
        xrayBar.setAttribute('y', hole.track === 'rail_top_plus' ? '25' : '326');
        xrayBar.setAttribute('width', '490');
        xrayBar.setAttribute('height', '17');
        infoEl.textContent = `Riel (+) ${hole.track.includes('top') ? 'superior' : 'inferior'}: toda la fila roja comparte alimentación positiva.`;
      } else if (hole.track === 'rail_top_minus' || hole.track === 'rail_bot_minus') {
        xrayBar.setAttribute('x', '64');
        xrayBar.setAttribute('y', hole.track === 'rail_top_minus' ? '48' : '348');
        xrayBar.setAttribute('width', '490');
        xrayBar.setAttribute('height', '17');
        infoEl.textContent = `Riel (-) ${hole.track.includes('top') ? 'superior' : 'inferior'}: toda la fila azul comparte Tierra (GND).`;
      } else if (hole.track.startsWith('col_top_')) {
        const col = hole.track.replace('col_top_', '');
        xrayBar.setAttribute('x', String(hole.cx - 9));
        xrayBar.setAttribute('y', '86');
        xrayBar.setAttribute('width', '18');
        xrayBar.setAttribute('height', '98');
        infoEl.textContent = `Columna ${col} superior (a${col}–e${col}): 5 puntos unidos verticalmente.`;
      } else {
        const col = hole.track.replace('col_bot_', '');
        xrayBar.setAttribute('x', String(hole.cx - 9));
        xrayBar.setAttribute('y', '214');
        xrayBar.setAttribute('width', '18');
        xrayBar.setAttribute('height', '98');
        infoEl.textContent = `Columna ${col} inferior (f${col}–j${col}): 5 puntos unidos verticalmente.`;
      }
    });

    dot.addEventListener('click', () => {
      if (!pendingStart) {
        pendingStart = hole.id;
        infoEl.textContent = `Origen fijado en "${hole.id}". Haz clic en el segundo orificio para cablear.`;
      } else if (pendingStart === hole.id) {
        pendingStart = null;
        infoEl.textContent = 'Selección de cable cancelada.';
      } else {
        wires.push({ from: pendingStart, to: hole.id });
        infoEl.textContent = `Cable conectado: ${pendingStart} → ${hole.id}. Observa cómo toda la pista comparte color.`;
        pendingStart = null;
      }
      recomputeAndDraw();
    });
  });

  document.getElementById('bb-undo-wire')?.addEventListener('click', () => {
    wires.pop();
    pendingStart = null;
    recomputeAndDraw();
  });

  document.getElementById('bb-clear-wires')?.addEventListener('click', () => {
    wires.length = 0;
    pendingStart = null;
    recomputeAndDraw();
  });
}

/* =========================================================================
 * MÓDULO 5: Pinout Visual con Forma Real de Arduino Uno R3 y ESP32 DevKit V1
 * ========================================================================= */
function mountModPinouts(): void {
  const root = document.getElementById('root-mod-pinouts')!;
  let activeBoard: BoardId = 'uno';
  let activeCat: 'all' | PinCategory = 'all';

  const CAT_COLORS: Record<PinCategory, string> = {
    pwr: '#e04f3d',
    gnd: '#475569',
    dig: '#2563eb',
    ana: '#16a34a',
    com: '#9333ea',
    ctl: '#ff7a1a',
  };

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div class="pill-row">
        <button type="button" class="seg-btn is-active" data-po-board="uno">Arduino Uno R3 (5 V)</button>
        <button type="button" class="seg-btn" data-po-board="esp32">ESP32 DevKit V1 (3.3 V)</button>
      </div>
      <div class="pill-row" id="po-filters">
        <button type="button" class="seg-btn is-active" data-po-cat="all">Todos</button>
        <button type="button" class="seg-btn" data-po-cat="pwr">Energía</button>
        <button type="button" class="seg-btn" data-po-cat="gnd">GND</button>
        <button type="button" class="seg-btn" data-po-cat="dig">Digital / PWM</button>
        <button type="button" class="seg-btn" data-po-cat="ana">Analógico</button>
        <button type="button" class="seg-btn" data-po-cat="com">I²C / SPI / UART</button>
      </div>
    </div>

    <div class="viz-grid-2">
      <div class="viz-card">
        <h3 id="po-board-title">Mapa interactivo: Arduino Uno R3</h3>
        <div class="svg-stage" id="po-svg-host"></div>
      </div>

      <div class="viz-card">
        <h3>Ficha del pin seleccionado</h3>
        <div class="math-eq-box" id="po-pin-name" style="min-height:54px;font-family:var(--mono);font-size:1.05rem;font-weight:700">Toca un pin en el diagrama</div>
        <div class="kpi-trio">
          <div class="kpi-box"><span>Categoría</span><strong id="po-pin-cat">—</strong></div>
          <div class="kpi-box"><span>Voltaje</span><strong id="po-pin-v">—</strong></div>
          <div class="kpi-box"><span>Extra</span><strong id="po-pin-extra">—</strong></div>
        </div>
        <p id="po-pin-desc" style="margin:0;color:var(--ink-2)">
          Haz clic sobre cualquier pin del contorno real para ver su función y qué sensores conectar sin riesgo.
        </p>

        <div class="mini-rules" style="margin-top:auto">
          <div class="rule-card is-good"><strong>✓ Pines PWM (~)</strong>Simulan brillo gradual o mueven servos (en Uno: 3, 5, 6, 9, 10, 11).</div>
          <div class="rule-card is-bad"><strong>✗ Cuidado 5 V ↔ 3.3 V</strong>En ESP32 o sensores BME280 (3.3 V) usa Level Shifter si vienes de 5 V.</div>
        </div>
      </div>
    </div>
  `;

  const showPin = (p: PinDef) => {
    document.getElementById('po-pin-name')!.textContent = p.label;
    document.getElementById('po-pin-cat')!.textContent = p.category.toUpperCase();
    document.getElementById('po-pin-v')!.textContent = `${p.voltage} V`;
    const extras = [p.pwm ? 'PWM ~' : '', p.i2c ? `I²C ${p.i2c}` : '', p.interrupt ? 'INT' : '']
      .filter(Boolean)
      .join(' · ') || 'Estándar';
    document.getElementById('po-pin-extra')!.textContent = extras;
    document.getElementById('po-pin-desc')!.textContent = p.description;
  };

  const renderBoardSvg = () => {
    const spec = activeBoard === 'uno' ? ARDUINO_UNO_SPEC : ESP32_SPEC;
    document.getElementById('po-board-title')!.textContent = `Mapa interactivo: ${spec.name} (${spec.logicVoltage} V)`;
    const host = document.getElementById('po-svg-host')!;
    const svgW = 680;
    const svgH = 340;

    if (activeBoard === 'uno') {
      // Mapeo fiel de coordenadas reales del Uno (-3.43..+3.43 en X, -2.665..+2.665 en Z)
      const px = (wx: number) => 110 + ((wx + 3.43) / 6.86) * 480;
      const py = (wz: number) => 50 + ((wz + 2.665) / 5.33) * 240;

      const pinsSvg = spec.pins
        .map((p) => {
          const x = px(p.localPos[0]);
          const y = py(p.localPos[2]);
          const isTop = p.localPos[2] < 0;
          const match = activeCat === 'all' || p.category === activeCat;
          const color = CAT_COLORS[p.category];
          const short = p.id.replace('_TOP', '').replace('_1', '').replace('_2', '').replace('D', '');
          return `
            <g class="pinout-dot" data-pin-id="${p.id}" opacity="${match ? 1 : 0.2}">
              <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${color}" stroke="#0f172a" stroke-width="1.8" />
              <text x="${x.toFixed(1)}" y="${(isTop ? y - 14 : y + 18).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="8.5" font-weight="bold">
                ${p.pwm ? `~${short}` : short}
              </text>
            </g>
          `;
        })
        .join('');

      host.innerHTML = `
        <svg viewBox="0 0 ${svgW} ${svgH}" aria-label="Pinout real Arduino Uno R3">
          <!-- Contorno PCB real con muescas derechas -->
          <polygon points="110,50 572,50 590,68 590,122 575,138 575,204 590,220 590,290 110,290"
            fill="#00828a" stroke="#ffb066" stroke-width="2" />
          <!-- Puerto USB-B izquierdo -->
          <rect x="74" y="90" width="68" height="54" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
          <text x="108" y="121" text-anchor="middle" fill="#1e293b" font-family="monospace" font-size="10" font-weight="bold">USB-B</text>
          <!-- Jack DC negro -->
          <rect x="78" y="216" width="66" height="44" rx="4" fill="#0f172a" stroke="#475569" stroke-width="2" />
          <text x="111" y="242" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="9">DC 7-12V</text>
          <!-- Botón Reset -->
          <rect x="132" y="64" width="22" height="22" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
          <text x="143" y="96" text-anchor="middle" fill="#fff" font-family="monospace" font-size="8">RST</text>
          <!-- Cristal 16 MHz y capacitores -->
          <rect x="242" y="150" width="32" height="14" rx="6" fill="#cbd5e1" />
          <circle cx="240" cy="222" r="11" fill="#cbd5e1" stroke="#0f172a" stroke-width="2" />
          <circle cx="240" cy="248" r="11" fill="#cbd5e1" stroke="#0f172a" stroke-width="2" />
          <!-- ATmega328P DIP-28 -->
          <rect x="332" y="182" width="188" height="38" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
          <text x="426" y="205" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="bold">ATmega328P-PU</text>
          <!-- Texto UNO -->
          <text x="420" y="126" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">ARDUINO UNO R3</text>
          <text x="420" y="146" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="11">LÓGICA 5 V · 16 MHz</text>
          <!-- Cabeceras hembra -->
          <rect x="220" y="54" width="330" height="22" rx="3" fill="#0f172a" opacity="0.7" />
          <rect x="285" y="264" width="265" height="22" rx="3" fill="#0f172a" opacity="0.7" />
          ${pinsSvg}
        </svg>
      `;
    } else {
      // ESP32 DevKit V1 contorno real angosto con WROOM-32 y antena meandro derecha
      const px = (wx: number) => 120 + ((wx + 2.575) / 5.15) * 460;
      const py = (wz: number) => 75 + ((wz + 1.4) / 2.8) * 190;

      const pinsSvg = spec.pins
        .map((p) => {
          const x = px(p.localPos[0]);
          const y = py(p.localPos[2]);
          const isTop = p.localPos[2] < 0;
          const match = activeCat === 'all' || p.category === activeCat;
          const color = CAT_COLORS[p.category];
          const short = p.id.replace('_1', '').replace('_2', '');
          return `
            <g class="pinout-dot" data-pin-id="${p.id}" opacity="${match ? 1 : 0.2}">
              <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${color}" stroke="#0f172a" stroke-width="1.8" />
              <text x="${x.toFixed(1)}" y="${(isTop ? y - 16 : y + 20).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="8.5" font-weight="bold">
                ${short}
              </text>
            </g>
          `;
        })
        .join('');

      host.innerHTML = `
        <svg viewBox="0 0 ${svgW} ${svgH}" aria-label="Pinout real ESP32 DevKit V1">
          <!-- PCB oscuro DevKit V1 -->
          <rect x="120" y="75" width="460" height="190" rx="10" fill="#181c24" stroke="#ffb066" stroke-width="2" />
          <!-- Micro-USB izquierdo -->
          <rect x="104" y="144" width="38" height="52" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
          <!-- Botones EN y BOOT -->
          <rect x="148" y="114" width="20" height="18" rx="3" fill="#e2e8f0" />
          <text x="158" y="142" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8">EN</text>
          <rect x="148" y="206" width="20" height="18" rx="3" fill="#e2e8f0" />
          <text x="158" y="198" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="8">BOOT</text>
          <!-- Shield ESP-WROOM-32 -->
          <rect x="368" y="114" width="150" height="112" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2" />
          <text x="443" y="166" text-anchor="middle" fill="#1e293b" font-family="monospace" font-size="12" font-weight="bold">ESP-WROOM-32</text>
          <text x="443" y="184" text-anchor="middle" fill="#475569" font-family="monospace" font-size="9">Wi-Fi + BLE · 3.3 V</text>
          <!-- Antena meandro dorada -->
          <path d="M528 122 H566 V142 H534 V162 H566 V182 H534 V202 H566 V220 H528" fill="none" stroke="#eab308" stroke-width="4" />
          <!-- Regulador AMS1117 -->
          <rect x="218" y="122" width="38" height="28" rx="3" fill="#0f172a" stroke="#64748b" />
          ${pinsSvg}
        </svg>
      `;
    }

    host.querySelectorAll<SVGGElement>('[data-pin-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const pin = spec.pins.find((p) => p.id === el.dataset.pinId);
        if (pin) showPin(pin);
      });
    });

    if (spec.pins[0]) showPin(spec.pins[0]);
  };

  root.querySelectorAll<HTMLButtonElement>('[data-po-board]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-po-board]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeBoard = btn.dataset.poBoard as BoardId;
      renderBoardSvg();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-po-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-po-cat]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCat = btn.dataset.poCat as typeof activeCat;
      renderBoardSvg();
    });
  });

  renderBoardSvg();
}

/* =========================================================================
 * MÓDULO 6: Resistencias Pull-Up, Pull-Down y Pin Flotante (Simulación en vivo)
 * ========================================================================= */
function mountModPullUp(): void {
  const root = document.getElementById('root-mod-pullup')!;
  let mode: 'floating' | 'pulldown' | 'pullup' = 'floating';
  let pressed = false;
  let noiseBoost = false;
  const history: number[] = Array(36).fill(0);

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div class="pill-row">
        <button type="button" class="seg-btn is-active" data-pu-mode="floating">1. Sin resistencia (Pin Flotante)</button>
        <button type="button" class="seg-btn" data-pu-mode="pulldown">2. Pull-Down (10 kΩ a GND)</button>
        <button type="button" class="seg-btn" data-pu-mode="pullup">3. Pull-Up (10 kΩ a 5 V / INPUT_PULLUP)</button>
      </div>
      <div class="pill-row">
        <button type="button" class="seg-btn" id="pu-btn-press">Presionar botón</button>
        <button type="button" class="seg-btn" id="pu-btn-noise">Acercar mano (Ruido)</button>
      </div>
    </div>

    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Esquema animado del pin digital D2</h3>
        <div class="svg-stage" id="pu-schematic"></div>
        <div id="pu-banner" class="status-banner is-bad"></div>
      </div>

      <div class="viz-card">
        <h3>Osciloscopio de lectura digitalRead(D2)</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 420 170" id="pu-scope-svg" aria-label="Osciloscopio de señal digital">
            <line x1="36" y1="32" x2="404" y2="32" stroke="#334155" stroke-dasharray="4 4" />
            <line x1="36" y1="132" x2="404" y2="132" stroke="#334155" stroke-dasharray="4 4" />
            <text x="8" y="36" fill="#86efac" font-family="monospace" font-size="11">5V</text>
            <text x="8" y="136" fill="#94a3b8" font-family="monospace" font-size="11">0V</text>
            <polyline id="pu-scope-line" fill="none" stroke="#ff7a1a" stroke-width="3.5" stroke-linejoin="round" points="" />
          </svg>
        </div>
        <div class="kpi-trio">
          <div class="kpi-box"><span>Estado leído</span><strong id="pu-kpi-state">INESTABLE</strong></div>
          <div class="kpi-box"><span>Voltaje D2</span><strong id="pu-kpi-v">? V</strong></div>
          <div class="kpi-box"><span>Consumo R</span><strong id="pu-kpi-ma">0.0 mA</strong></div>
        </div>
        <p id="pu-explain" style="margin:0;font-size:.86rem;color:var(--ink-2)"></p>
      </div>
    </div>
  `;

  const renderSchematic = () => {
    const host = document.getElementById('pu-schematic')!;
    const swClosed = pressed;
    const isFloat = mode === 'floating';
    const isDown = mode === 'pulldown';

    host.innerHTML = `
      <svg viewBox="0 0 500 210">
        <!-- Arduino MCU -->
        <rect x="20" y="55" width="115" height="100" rx="10" fill="#00828a" />
        <text x="77" y="98" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">PIN D2</text>
        <text x="77" y="122" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="11">${mode === 'pullup' ? 'INPUT_PULLUP' : 'INPUT'}</text>

        <!-- Línea hacia botón -->
        <line x1="135" y1="105" x2="290" y2="105" stroke="#38bdf8" stroke-width="5" />
        <!-- Pulsador -->
        <circle cx="290" cy="105" r="5" fill="#fff" />
        <circle cx="355" cy="105" r="5" fill="#fff" />
        <line x1="290" y1="105" x2="355" y2="${swClosed ? '105' : '78'}" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round" />

        ${
          isFloat
            ? `
              <!-- Botón va a 5V pero suelto queda al aire como antena -->
              <line x1="355" y1="105" x2="430" y2="105" stroke="#ef4444" stroke-width="5" />
              <text x="452" y="110" fill="#fca5a5" font-family="monospace" font-weight="bold">5 V</text>
              <text x="215" y="160" text-anchor="middle" fill="#f87171" font-family="monospace" font-size="12" font-weight="bold">¡CABLE SUELTO SIN REFERENCIA = ANTENA!</text>
            `
            : isDown
              ? `
                <line x1="355" y1="105" x2="430" y2="105" stroke="#ef4444" stroke-width="5" />
                <text x="452" y="110" fill="#fca5a5" font-family="monospace" font-weight="bold">5 V</text>
                <!-- R 10k a GND -->
                <line x1="210" y1="105" x2="210" y2="178" stroke="#94a3b8" stroke-width="4" />
                <rect x="184" y="125" width="52" height="28" rx="6" fill="#dec8a0" stroke="#785500" />
                <text x="210" y="143" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="11" font-weight="bold">10 kΩ</text>
                <text x="210" y="196" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-weight="bold">GND (0 V)</text>
              `
              : `
                <line x1="355" y1="105" x2="430" y2="105" stroke="#94a3b8" stroke-width="5" />
                <text x="455" y="110" fill="#cbd5e1" font-family="monospace" font-weight="bold">GND</text>
                <!-- R 10k a 5V -->
                <line x1="210" y1="34" x2="210" y2="105" stroke="#ef4444" stroke-width="4" />
                <rect x="184" y="50" width="52" height="28" rx="6" fill="#dec8a0" stroke="#785500" />
                <text x="210" y="68" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="11" font-weight="bold">10 kΩ</text>
                <text x="210" y="24" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-weight="bold">5 V</text>
              `
        }
      </svg>
    `;

    const banner = document.getElementById('pu-banner')!;
    const explain = document.getElementById('pu-explain')!;
    const pressBtn = document.getElementById('pu-btn-press')!;
    pressBtn.textContent = pressed ? 'Soltar botón' : 'Presionar botón';
    pressBtn.classList.toggle('is-active', pressed);

    if (mode === 'floating') {
      banner.className = pressed ? 'status-banner is-ok' : 'status-banner is-bad';
      banner.textContent = pressed
        ? 'Presionado: lee 5 V (HIGH), pero al soltar volverá a leer basura eléctrica.'
        : '¡Pin flotante! Al soltar el botón, el cable actúa como antena y dispara falsos HIGH/LOW.';
      explain.textContent =
        'Sin una resistencia que "tire" del voltaje hacia 0 V o 5 V cuando el interruptor está abierto, el pin queda flotando y capta estática del ambiente.';
    } else if (mode === 'pulldown') {
      banner.className = 'status-banner is-ok';
      banner.textContent = pressed
        ? 'Presionado: 5 V directos al pin (HIGH). La resistencia de 10 kΩ evita un cortocircuito a GND.'
        : 'En reposo: la resistencia de 10 kΩ fija firmemente 0 V (LOW) sin ruido.';
      explain.textContent =
        'En Pull-Down el pin lee LOW por defecto y HIGH al presionar. Sin la resistencia de 10 kΩ, conectar 5 V directo a GND quemaría la placa.';
    } else {
      banner.className = 'status-banner is-ok';
      banner.textContent = pressed
        ? 'Presionado: el botón conecta D2 a GND (LOW). A través de los 10 kΩ solo pasan 0.5 mA seguros.'
        : 'En reposo: la resistencia interna o externa a 5 V fija un HIGH estable sin ruido.';
      explain.textContent =
        'Pull-Up es el estándar en Arduino porque puedes usar la resistencia interna de 20 kΩ con pinMode(2, INPUT_PULLUP) sin agregar componentes extra.';
    }
  };

  window.setInterval(() => {
    let val = 0;
    if (mode === 'floating') {
      if (pressed) val = 1;
      else {
        const prob = noiseBoost ? 0.5 : 0.28;
        val = Math.random() < prob ? 1 : 0;
      }
    } else if (mode === 'pulldown') {
      val = pressed ? 1 : 0;
    } else {
      val = pressed ? 0 : 1;
    }

    history.shift();
    history.push(val);

    const pts = history
      .map((v, i) => {
        const x = 36 + (i * 368) / (history.length - 1);
        const y = v ? 32 : 132;
        return `${x.toFixed(1)},${y}`;
      })
      .join(' ');
    document.getElementById('pu-scope-line')?.setAttribute('points', pts);

    const stEl = document.getElementById('pu-kpi-state');
    const vEl = document.getElementById('pu-kpi-v');
    const maEl = document.getElementById('pu-kpi-ma');
    if (stEl && vEl && maEl) {
      if (mode === 'floating' && !pressed) {
        stEl.textContent = val ? 'RUIDO HIGH' : 'RUIDO LOW';
        vEl.textContent = val ? '~3.8 V' : '~1.1 V';
        maEl.textContent = '0.0 mA';
      } else {
        stEl.textContent = val ? 'HIGH (1)' : 'LOW (0)';
        vEl.textContent = val ? '5.0 V' : '0.0 V';
        maEl.textContent = pressed && mode !== 'floating' ? '0.5 mA' : '0.0 mA';
      }
    }
  }, 140);

  root.querySelectorAll<HTMLButtonElement>('[data-pu-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-pu-mode]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      mode = btn.dataset.puMode as typeof mode;
      renderSchematic();
    });
  });

  document.getElementById('pu-btn-press')?.addEventListener('click', () => {
    pressed = !pressed;
    renderSchematic();
  });

  document.getElementById('pu-btn-noise')?.addEventListener('click', (e) => {
    noiseBoost = !noiseBoost;
    (e.currentTarget as HTMLButtonElement).classList.toggle('is-active', noiseBoost);
  });

  renderSchematic();
}

/* =========================================================================
 * MÓDULO 7: Señal PWM vs. Bajar Voltaje con Resistencia + Diagramas rápidos
 * ========================================================================= */
function mountModPwm(): void {
  const root = document.getElementById('root-mod-pwm')!;
  let duty = 50;
  let slowMo = false;
  let simPhase = 0;

  root.innerHTML = `
    <div class="viz-card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <h3>Osciloscopio PWM y Voltaje Equivalente</h3>
        <button type="button" class="seg-btn" id="pwm-slow-btn">Cámara lenta (ver pulsos LED)</button>
      </div>

      <div class="ctrl-group">
        <label class="ctrl-label" for="pwm-duty-slider">
          <span id="pwm-lbl-arg">Ciclo de trabajo PWM: analogWrite(9, 128)</span>
          <span id="pwm-lbl-pct">50% · V_prom = 2.50 V</span>
        </label>
        <input id="pwm-duty-slider" type="range" min="0" max="100" step="5" value="50" />
      </div>

      <div class="svg-stage">
        <svg viewBox="0 0 600 175" id="pwm-scope-svg">
          <text x="16" y="34" fill="#94a3b8" font-family="monospace" font-size="11">5 V</text>
          <text x="16" y="130" fill="#94a3b8" font-family="monospace" font-size="11">0 V</text>
          <path id="pwm-wave-path" d="" fill="none" stroke="#22c55e" stroke-width="4" stroke-linejoin="round" />
          <line id="pwm-avg-line" x1="48" y1="82" x2="440" y2="82" stroke="#ff7a1a" stroke-width="2.5" stroke-dasharray="6 4" />
          <text id="pwm-avg-txt" x="48" y="156" fill="#ffb066" font-family="monospace" font-size="12" font-weight="bold">Voltaje promedio percibido: 2.50 V</text>

          <!-- LED y Servo en vivo -->
          <g transform="translate(495, 52)">
            <circle id="pwm-led-halo" cx="0" cy="0" r="28" fill="#38bdf8" opacity="0.4" />
            <circle id="pwm-led-core" cx="0" cy="0" r="16" fill="#38bdf8" stroke="#fff" stroke-width="2" />
            <text x="0" y="32" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="10">LED PWM</text>
          </g>
          <g transform="translate(555, 118)">
            <circle cx="0" cy="0" r="28" fill="#1d4ed8" stroke="#ffb066" stroke-width="2" />
            <g id="pwm-servo-arm" transform="rotate(0)">
              <rect x="-4" y="-34" width="8" height="38" rx="4" fill="#f8fafc" />
            </g>
            <text id="pwm-servo-txt" x="0" y="42" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10">90°</text>
          </g>
        </svg>
      </div>

      <div class="math-eq-box is-light" id="pwm-math-eq"></div>
    </div>

    <!-- Comparador PWM vs Bajar Voltaje -->
    <div class="sp-compare-grid">
      <div class="viz-card">
        <h3>Por qué SÍ usamos PWM (Conmutación Digital)</h3>
        <div class="rule-card is-good">
          <strong>1. Eficiencia ~95% (no desperdicia calor)</strong>
          El transistor interno está 100% abierto (0 A) o 100% cerrado (casi 0 V sobre él). No actúa como estufa.
        </div>
        <div class="rule-card is-good">
          <strong>2. Motores conservan su fuerza (Torque)</strong>
          Cada pulso entrega los 5 V completos de empuje para vencer la fricción inicial del motor, aunque gire lento.
        </div>
        <div class="rule-card is-good">
          <strong>3. Arduino no necesita DAC analógico</strong>
          Un pin digital solo sabe dar 0 V o 5 V; conmutando ~490 veces por segundo engaña al ojo y al motor.
        </div>
      </div>

      <div class="viz-card">
        <h3>Por qué NO solo bajamos el voltaje con una resistencia</h3>
        <div class="svg-stage" style="padding:10px">
          <svg viewBox="0 0 420 118" aria-label="Calor desperdiciado al bajar voltaje con resistencia">
            <rect x="20" y="34" width="76" height="46" rx="8" fill="#0f172a" stroke="#ef4444" stroke-width="2" />
            <text x="58" y="61" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-weight="bold">5.0 V</text>
            <line x1="96" y1="57" x2="310" y2="57" stroke="#94a3b8" stroke-width="5" />
            <rect x="148" y="39" width="106" height="36" rx="10" fill="#991b1b" stroke="#ff7a1a" stroke-width="2" />
            <text x="201" y="61" text-anchor="middle" fill="#fff" font-family="monospace" font-size="11" font-weight="bold">CALOR 🔥</text>
            <circle id="pwm-heat-glow" cx="201" cy="57" r="44" fill="#ef4444" opacity="0.25" />
            <rect x="310" y="34" width="90" height="46" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
            <text id="pwm-drop-v" x="355" y="61" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="12" font-weight="bold">2.5 V</text>
          </svg>
        </div>
        <div class="math-eq-box is-light" id="pwm-heat-eq"></div>
        <p style="margin:0;font-size:.84rem;color:var(--ink-2)">
          Si bajas de 5 V a 2.5 V con una resistencia en serie, la mitad de la energía de la batería se convierte en calor inútil y un motor DC ni siquiera logra arrancar a bajo voltaje.
        </p>
      </div>
    </div>
  `;

  const renderStatic = () => {
    const pwmVal = Math.round((duty / 100) * 255);
    const vAvg = (5 * duty) / 100;
    const angle = Math.round((duty / 100) * 180);
    const highW = Math.round((duty / 100) * 96);
    const yAvg = 128 - (duty / 100) * 96;

    const pathD = [0, 1, 2, 3]
      .map((c) => {
        const x0 = 48 + c * 96;
        if (duty === 0) return `M ${x0} 128 L ${x0 + 96} 128`;
        if (duty === 100) return `M ${x0} 32 L ${x0 + 96} 32`;
        const x1 = x0 + Math.max(4, highW);
        return `M ${x0} 128 L ${x0} 32 L ${x1} 32 L ${x1} 128 L ${x0 + 96} 128`;
      })
      .join(' ');

    document.getElementById('pwm-wave-path')!.setAttribute('d', pathD);
    document.getElementById('pwm-avg-line')!.setAttribute('y1', yAvg.toFixed(1));
    document.getElementById('pwm-avg-line')!.setAttribute('y2', yAvg.toFixed(1));
    document.getElementById('pwm-avg-txt')!.textContent = `Voltaje promedio percibido: ${vAvg.toFixed(2)} V`;
    document.getElementById('pwm-lbl-arg')!.textContent = `Ciclo de trabajo PWM: analogWrite(9, ${pwmVal})`;
    document.getElementById('pwm-lbl-pct')!.textContent = `${duty}% · V_prom = ${vAvg.toFixed(2)} V`;

    document.getElementById('pwm-servo-arm')!.setAttribute('transform', `rotate(${angle - 90})`);
    document.getElementById('pwm-servo-txt')!.textContent = `${angle}°`;
    document.getElementById('pwm-drop-v')!.textContent = `${vAvg.toFixed(1)} V`;
    document.getElementById('pwm-heat-glow')!.setAttribute('opacity', String(Math.max(0.08, (100 - duty) / 160)));

    document.getElementById('pwm-math-eq')!.innerHTML = mEq(
      `${mVar('V', 'prom')} <span class="math-op">=</span> <span class="math-val">5 V</span> <span class="math-op">·</span> ${mFrac('<span class="math-val">' + duty + '%</span>', '<span class="math-val">100%</span>')} <span class="math-op">=</span> <span class="math-val">${vAvg.toFixed(2)} V</span>`
    );

    const eff = duty;
    document.getElementById('pwm-heat-eq')!.innerHTML = mEq(
      `${mVar('P', 'calor')} <span class="math-op">=</span> (<span class="math-val">5 V</span> <span class="math-op">−</span> ${mVar('V', 'carga')}) <span class="math-op">·</span> ${mVar('I')} · <span class="math-val">Eficiencia lineal: ${eff}%</span>`
    );

    if (!slowMo) {
      const b = duty / 100;
      document.getElementById('pwm-led-halo')!.setAttribute('opacity', String(b * 0.78));
      document.getElementById('pwm-led-core')!.setAttribute('fill', b > 0.04 ? '#38bdf8' : '#334155');
    }
  };

  window.setInterval(() => {
    if (!slowMo) return;
    simPhase = (simPhase + 5) % 100;
    const isHigh = simPhase < duty;
    document.getElementById('pwm-led-halo')?.setAttribute('opacity', isHigh ? '0.85' : '0.04');
    document.getElementById('pwm-led-core')?.setAttribute('fill', isHigh ? '#38bdf8' : '#334155');
  }, 55);

  document.getElementById('pwm-duty-slider')?.addEventListener('input', (e) => {
    duty = Number((e.target as HTMLInputElement).value);
    renderStatic();
  });

  document.getElementById('pwm-slow-btn')?.addEventListener('click', (e) => {
    slowMo = !slowMo;
    (e.currentTarget as HTMLButtonElement).classList.toggle('is-active', slowMo);
    renderStatic();
  });

  renderStatic();
}

/* =========================================================================
 * MÓDULO 8: Cómo piensa Arduino + Guía completa de programación Arduino C++
 * ========================================================================= */
function mountModCodigo(): void {
  const root = document.getElementById('root-mod-codigo')!;
  const starter = `// Estructura básica de todo programa Arduino
void setup() {
  pinMode(13, OUTPUT);   // Se ejecuta 1 sola vez al encender
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH); // Se repite infinitamente
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`;

  const TOPICS: Array<{
    id: string;
    label: string;
    title: string;
    summary: string;
    bullets: string[];
    code: string;
  }> = [
    {
      id: 'libs',
      label: 'Librerías (#include)',
      title: 'Librerías: código ya probado para sensores y pantallas',
      summary: 'En vez de programar protocolos complejos desde cero, importamos librerías listas con #include <...>.',
      bullets: [
        'Wire.h y SPI.h manejan buses de comunicación entre chips.',
        'Servo.h, LiquidCrystal_I2C.h y DHT.h simplifican actuadores y sensores con 2 líneas.',
        'En nuestro simulador puedes buscar e instalar librerías en caché desde el botón "Librerías".',
      ],
      code: `#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2); // Creamos objeto lcd

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.print("Hola Liceo!");
}`,
    },
    {
      id: 'defs',
      label: 'Definiciones y Constantes',
      title: 'Definiciones (#define y const): nombra tus pines con claridad',
      summary: 'Evita números mágicos repartidos por el código; si cambias un cable de pin solo editas una línea.',
      bullets: [
        '#define reemplaza texto antes de compilar (no ocupa memoria RAM).',
        'const int es aún mejor: tiene tipo de dato estricto y evita modificar el número de pin por error.',
      ],
      code: `#define VELOCIDAD_SERIAL 9600
const int PIN_LED = 13;
const int PIN_BOTON = 2;
const float VOLTAJE_REF = 5.0;`,
    },
    {
      id: 'vars',
      label: 'Variables y Tipos',
      title: 'Variables: la memoria de trabajo de tu robot',
      summary: 'Guardan lecturas de sensores, contadores o textos que cambian mientras el programa corre.',
      bullets: [
        'int: enteros (-32,768 a 32,767 en Uno).',
        'float: decimales (temperatura 23.5 °C, voltaje 3.32 V).',
        'bool: verdadero/falso (true / false).',
        'unsigned long: tiempos grandes con millis() sin desbordarse.',
        'String y arreglos int notas[] = {523, 659}; para textos y listas.',
      ],
      code: `int contador = 0;
float temperatura = 22.8;
bool alarmaActiva = false;
unsigned long ultimoTiempo = 0;
int leds[] = {8, 9, 10};`,
    },
    {
      id: 'funcs',
      label: 'Funciones',
      title: 'Funciones propias: divide problemas grandes en bloques reutilizables',
      summary: 'Una función puede recibir parámetros (entradas) y opcionalmente devolver un resultado con return.',
      bullets: [
        'void indica que la función realiza una acción (ej. parpadear) sin devolver valor.',
        'int o float indica que devuelve un cálculo mediante return.',
      ],
      code: `void parpadear(int pin, int ms) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
  delay(ms);
}

float aVoltios(int lecturaAdc) {
  return lecturaAdc * (5.0 / 1023.0);
}`,
    },
    {
      id: 'conds',
      label: 'Condicionales (if / switch)',
      title: 'Condicionales: toma de decisiones según sensores',
      summary: 'Comparan lecturas con ==, !=, <, >, <=, >= y combinan condiciones con && (Y) o || (O).',
      bullets: [
        'if / else if / else evalúa condiciones en orden.',
        'switch / case selecciona limpiamente entre múltiples estados discretos (ej. menús o botones IR).',
      ],
      code: `int distancia = 18;

if (distancia > 0 && distancia < 25) {
  digitalWrite(LED_ROJO, HIGH);
} else {
  digitalWrite(LED_ROJO, LOW);
}

switch (modo) {
  case 1: Serial.println("Modo Patulla"); break;
  case 2: Serial.println("Modo Alarma"); break;
  default: Serial.println("En espera"); break;
}`,
    },
    {
      id: 'loops',
      label: 'Bucles (for / while)',
      title: 'Bucles o Loops: repetir acciones sin copiar código',
      summary: 'Además del loop() infinito principal, usamos for y while para recorrer pines o esperar eventos.',
      bullets: [
        'for (int i = 0; i < 5; i++) repite un número exacto de veces.',
        'while (condicion) repite mientras la condición siga siendo verdadera.',
        'break sale de golpe del bucle; continue salta a la siguiente vuelta.',
      ],
      code: `// Encender en secuencia 3 LEDs o variar brillo PWM
for (int brillo = 0; brillo <= 255; brillo += 5) {
  analogWrite(9, brillo);
  delay(20);
}

while (digitalRead(2) == LOW) {
  // Espera mientras el botón siga presionado
  delay(10);
}`,
    },
  ];

  let activeTopicId = TOPICS[0].id;

  root.innerHTML = `
    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Ciclo de vida animado del programa</h3>
        <div class="svg-stage is-light">
          <svg viewBox="0 0 420 270" aria-label="Diagrama de flujo setup y loop">
            <g id="fl-boot" class="flow-node">
              <rect x="115" y="16" width="190" height="44" rx="22" fill="#1c2b5a" />
              <text x="210" y="43" text-anchor="middle" fill="#ffb066" font-family="monospace" font-size="13" font-weight="bold">1. Encendido / Reset</text>
            </g>
            <line x1="210" y1="60" x2="210" y2="92" stroke="#1c2b5a" stroke-width="3" />
            <g id="fl-setup" class="flow-node">
              <rect x="85" y="92" width="250" height="54" rx="10" fill="#2563eb" />
              <text x="210" y="116" text-anchor="middle" fill="#fff" font-family="monospace" font-size="14" font-weight="bold">2. setup() — 1 sola vez</text>
              <text x="210" y="135" text-anchor="middle" fill="#dbeafe" font-family="monospace" font-size="11">Configura pines y Serial</text>
            </g>
            <line x1="210" y1="146" x2="210" y2="180" stroke="#1c2b5a" stroke-width="3" />
            <g id="fl-loop" class="flow-node">
              <rect x="85" y="180" width="250" height="58" rx="10" fill="#16a34a" />
              <text x="210" y="205" text-anchor="middle" fill="#fff" font-family="monospace" font-size="14" font-weight="bold">3. loop() — Bucle infinito</text>
              <text x="210" y="224" text-anchor="middle" fill="#dcfce7" font-family="monospace" font-size="11">Lee sensores y actúa sin parar</text>
            </g>
            <path d="M 335 209 L 378 209 L 378 164 L 222 164" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6 4" />
          </svg>
        </div>
        <div class="cmd-grid">
          <div class="cmd-card"><code>pinMode(pin, modo)</code><span>Define INPUT, OUTPUT o INPUT_PULLUP.</span></div>
          <div class="cmd-card"><code>digitalWrite(pin, v)</code><span>Envía HIGH (5V/3.3V) o LOW (0V).</span></div>
          <div class="cmd-card"><code>analogRead(A0)</code><span>Lee voltaje continuo (0–1023 o 0–4095).</span></div>
          <div class="cmd-card"><code>millis() / delay(ms)</code><span>Mide milisegundos o pausa la ejecución.</span></div>
        </div>
      </div>

      <div class="viz-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3>Primer código listo para copiar</h3>
          <button type="button" class="seg-btn" id="clases-copy-btn">Copiar código</button>
        </div>
        <div class="first-code-box" style="flex:1">
          <pre><code>${starter.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>
        <a class="btn-primary btn-primary-accent" href="./index.html#mesa-trabajo" style="justify-content:center">
          Practicar en el Simulador 3D ahora →
        </a>
      </div>
    </div>

    <div class="prog-block-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <h3 style="margin:0;font-family:var(--serif);font-size:1.45rem;color:var(--navy)">
          Guía Esencial de Arduino C++
        </h3>
        <div class="pill-row" id="prog-topic-tabs">
          ${TOPICS.map((t, i) => `<button type="button" class="seg-btn ${i === 0 ? 'is-active' : ''}" data-prog-topic="${t.id}">${t.label}</button>`).join('')}
        </div>
      </div>
      <div class="prog-topic-grid" id="prog-topic-body"></div>
    </div>
  `;

  const renderTopic = () => {
    const t = TOPICS.find((x) => x.id === activeTopicId) ?? TOPICS[0];
    const body = document.getElementById('prog-topic-body')!;
    body.innerHTML = `
      <div class="prog-explain">
        <h4>${t.title}</h4>
        <p>${t.summary}</p>
        <ul class="prog-bullets">
          ${t.bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>
      </div>
      <div class="first-code-box">
        <div class="first-code-bar">
          <span>ejemplo_${t.id}.ino</span>
          <button type="button" class="seg-btn" id="prog-copy-snippet" style="padding:3px 10px;font-size:.72rem">Copiar ejemplo</button>
        </div>
        <pre><code>${t.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
      </div>
    `;
    document.getElementById('prog-copy-snippet')?.addEventListener('click', (e) => {
      navigator.clipboard?.writeText(t.code).catch(() => {});
      const btn = e.currentTarget as HTMLButtonElement;
      btn.textContent = '¡Copiado!';
      setTimeout(() => (btn.textContent = 'Copiar ejemplo'), 1400);
    });
  };

  root.querySelectorAll<HTMLButtonElement>('[data-prog-topic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-prog-topic]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeTopicId = btn.dataset.progTopic!;
      renderTopic();
    });
  });

  renderTopic();

  let step = 0;
  const nodes = ['fl-boot', 'fl-setup', 'fl-loop'];
  window.setInterval(() => {
    nodes.forEach((id, idx) => document.getElementById(id)?.classList.toggle('is-lit', idx === step));
    step = step === 0 ? 1 : 2;
  }, 1100);

  document.getElementById('clases-copy-btn')?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(starter).catch(() => {});
    const btn = e.currentTarget as HTMLButtonElement;
    btn.textContent = '¡Copiado!';
    setTimeout(() => (btn.textContent = 'Copiar código'), 1400);
  });
}

mountModElectricidad();
mountModOhm();
mountModSerieParalelo();
mountModProtoboard();
mountModPinouts();
mountModPullUp();
mountModPwm();
mountModCodigo();
