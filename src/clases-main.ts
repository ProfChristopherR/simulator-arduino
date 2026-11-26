import './styles/tokens.css';
import './styles/layout.css';
import './styles/clases.css';

import { ARDUINO_UNO_SPEC } from './boards/arduino-uno';
import { ESP32_SPEC } from './boards/esp32-devkit';
import { hydrateIcons, setSlotIcon } from './core/icons';
import { lofi } from './core/lofi';
import { runPreloaderFinish } from './core/preloader';
import {
  TAG_PALETTE,
  findPinoutRowById,
  renderPinoutPosterSvg,
  type PinoutBoardTab,
  type PinoutRowSpec,
  type TagKind,
} from './education/pinout-diagrams';
import { resistorBandsForOhms, formatOhms } from './lab/components/catalog';
import { mountGravityWaterAnalogy, type GravityWaterAnalogyHandle } from './education/water-analogy';
import type { BoardId } from './types';

hydrateIcons(document);

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
 * MÓDULO 1: Electricidad (Definiciones, Analogía del Agua, Potencia y Falla)
 * ========================================================================= */
function mountModElectricidad(): void {
  const root = document.getElementById('root-mod-electricidad')!;
  let volts = 5;
  let ohms = 220;
  let valveClosed = false;
  let ratedW = 0.25;
  let ledState: 'ok' | 'overloading' | 'burned' = 'ok';
  let resState: 'ok' | 'overheating' | 'burned' = 'ok';
  let failTimer: number | null = null;
  let waterHandle: GravityWaterAnalogyHandle | null = null;

  const WATT_RATINGS: Array<{ w: number; label: string; width: number }> = [
    { w: 0.125, label: '1/8 W', width: 92 },
    { w: 0.25, label: '1/4 W', width: 112 },
    { w: 0.5, label: '1/2 W', width: 128 },
    { w: 1.0, label: '1 W', width: 144 },
  ];

  root.innerHTML = `
    <div class="concept-def-grid">
      <article class="concept-def-card">
        <div class="concept-def-head">
          <strong>Voltaje (${mVar('V')})</strong>
          <span class="concept-unit-badge">Voltios (V)</span>
        </div>
        <p>Es la diferencia de potencial o fuerza que empuja a los electrones para que recorran un circuito.</p>
        <div class="concept-def-analogy">Analogía del agua: Altura / presión del estanque.</div>
      </article>
      <article class="concept-def-card">
        <div class="concept-def-head">
          <strong>Corriente (${mVar('I')})</strong>
          <span class="concept-unit-badge">Amperios (A / mA)</span>
        </div>
        <p>Cantidad de carga eléctrica (electrones) que pasa por un punto del cable cada segundo.</p>
        <div class="concept-def-analogy">Analogía del agua: Caudal de litros por segundo.</div>
      </article>
      <article class="concept-def-card">
        <div class="concept-def-head">
          <strong>Resistencia (${mVar('R')})</strong>
          <span class="concept-unit-badge">Ohmios (Ω)</span>
        </div>
        <p>Oposición que presenta un material o componente al paso de la corriente eléctrica.</p>
        <div class="concept-def-analogy">Analogía del agua: Válvula o estrechamiento del tubo.</div>
      </article>
      <article class="concept-def-card is-accent">
        <div class="concept-def-head">
          <strong>Potencia (${mVar('P')})</strong>
          <span class="concept-unit-badge">Watts (W)</span>
        </div>
        <p>Energía eléctrica transformada en luz o calor por segundo (${mEq(`${mVar('P')} = ${mVar('V')} · ${mVar('I')}`)}). Las resistencias soportan 1/8 W, 1/4 W, 1/2 W o 1 W antes de quemarse.</p>
        <div class="concept-def-analogy">Analogía del agua: Fuerza que hace girar la turbina.</div>
      </article>
    </div>

    <div class="dual-sim-grid">
      <!-- Simulación 1: Analogía hidráulica por gravedad pura (Canvas 3 niveles) -->
      <div class="viz-card">
        <h3>Analogía del agua en vivo (Sistema por gravedad)</h3>
        <div id="water-analogy-host"></div>
      </div>

      <!-- Simulación 2: Circuito eléctrico con LED + Resistencia con potencia -->
      <div class="viz-card">
        <h3>Circuito eléctrico real (LED + Resistencia)</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 540 280" aria-label="Circuito animado con LED y resistencia con límite de potencia">
            <rect x="65" y="48" width="410" height="175" rx="18" fill="none" stroke="#334155" stroke-width="10" />
            <rect id="el-flow-line" class="electron-flow" x="65" y="48" width="410" height="175" rx="18"
              fill="none" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" />

            <!-- Fuente -->
            <g transform="translate(24, 92)">
              <rect x="0" y="0" width="84" height="86" rx="10" fill="#0f172a" stroke="#00c2b5" stroke-width="2.5" />
              <text x="42" y="26" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="12" font-weight="bold">FUENTE</text>
              <text id="el-svg-v" x="42" y="54" text-anchor="middle" fill="#fff" font-family="monospace" font-size="20" font-weight="bold">5.0 V</text>
              <text x="42" y="74" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">Presión (V)</text>
            </g>

            <!-- Resistencia con 4 bandas + calor / quema -->
            <g transform="translate(200, 18)">
              <rect id="el-res-glow" x="-6" y="4" width="124" height="44" rx="18" fill="#ef4444" opacity="0" />
              <rect id="el-res-body" x="0" y="10" width="112" height="32" rx="14" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="el-rb0" x="20" y="10" width="9" height="32" fill="#dc2626" />
              <rect id="el-rb1" x="39" y="10" width="9" height="32" fill="#dc2626" />
              <rect id="el-rb2" x="58" y="10" width="9" height="32" fill="#7c4318" />
              <rect id="el-rb3" x="82" y="10" width="9" height="32" fill="#d4a007" />
              <g id="el-res-sparks" opacity="0">
                <path class="led-spark" d="M56 -4 L62 12 L78 8 L66 22 L80 32 L62 34 L56 48 L48 34 L30 32 L44 22 L32 8 L48 12 Z" fill="#fb923c" />
              </g>
              <g id="el-res-smoke" opacity="0">
                <circle class="led-smoke" cx="44" cy="4" r="9" fill="#94a3b8" />
                <circle class="led-smoke" cx="68" cy="2" r="11" fill="#64748b" style="animation-delay:0.35s" />
                <path d="M36 16 L52 26 L44 36 M74 16 L60 26 L68 38" stroke="#f87171" stroke-width="2.5" fill="none" />
              </g>
              <text id="el-svg-r" x="56" y="60" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11.5" font-weight="bold">220 Ω · 1/4 W</text>
            </g>

            <!-- LED con sobrebrillo / chispas / humo -->
            <g transform="translate(442, 102)">
              <circle id="el-bulb-glow" cx="32" cy="34" r="40" fill="#ef4444" opacity="0.35" />
              <circle id="el-bulb-core" cx="32" cy="34" r="22" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <g id="el-led-sparks" opacity="0">
                <path class="led-spark" d="M32 2 L36 18 L52 10 L40 24 L58 30 L40 36 L48 52 L32 42 L16 52 L24 36 L6 30 L24 24 L12 10 L28 18 Z" fill="#fef08a" />
              </g>
              <g id="el-led-smoke" opacity="0">
                <circle class="led-smoke" cx="24" cy="6" r="8" fill="#94a3b8" />
                <circle class="led-smoke" cx="40" cy="2" r="10" fill="#64748b" style="animation-delay:0.4s" />
                <path d="M22 26 L32 34 L26 42 M42 26 L32 34 L38 44" stroke="#f87171" stroke-width="2.5" fill="none" />
              </g>
              <text x="32" y="76" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED (2.0 V)</text>
            </g>

            <text id="el-svg-i" x="270" y="198" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="14" font-weight="bold">
              I = 13.6 mA · P(R) = 0.041 W
            </text>
          </svg>
        </div>

        <!-- Controles, indicadores y estado directamente debajo del circuito real -->
        <div class="el-panel-under">
          <div style="display:grid;gap:10px">
            <div class="ctrl-group">
              <label class="ctrl-label" for="el-v-range"><span>Voltaje de fuente (${mVar('V')})</span><span id="el-v-lbl">5.0 V</span></label>
              <input id="el-v-range" type="range" min="0" max="10" step="0.5" value="5" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="el-r-range"><span>Resistencia (${mVar('R')})</span><span id="el-r-lbl">220 Ω</span></label>
              <input id="el-r-range" type="range" min="22" max="2000" step="10" value="220" />
            </div>
            <div class="ctrl-group">
              <span class="ctrl-label"><span>Potencia nominal de la resistencia</span><span id="el-w-lbl">1/4 W (0.250 W)</span></span>
              <div class="pill-row">
                ${WATT_RATINGS.map((wr) => `<button type="button" class="seg-btn ${wr.w === 0.25 ? 'is-active' : ''}" data-el-watt="${wr.w}">${wr.label}</button>`).join('')}
              </div>
            </div>
          </div>

          <div class="kpi-trio">
            <div class="kpi-box"><span>Corriente (${mVar('I')})</span><strong id="el-kpi-i">13.6 mA</strong></div>
            <div class="kpi-box"><span>Potencia en R (${mVar('P', 'R')})</span><strong id="el-kpi-pr">0.041 W</strong></div>
            <div class="kpi-box"><span>Potencia total (${mVar('P')})</span><strong id="el-kpi-pt">0.068 W</strong></div>
          </div>

          <div class="power-meter-wrap">
            <div class="power-meter-head">
              <span>Carga térmica de la resistencia</span>
              <span id="el-watt-pct">16% de 0.250 W</span>
            </div>
            <div class="power-meter-bar">
              <div class="power-meter-fill" id="el-watt-fill" style="width:16%;background:#16a34a"></div>
            </div>
          </div>

          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
            <div id="el-safety-banner" class="status-banner is-ok" style="flex:1">Circuito operando en rango seguro.</div>
            <button type="button" class="btn-replace-led" id="el-replace-btn" hidden>Reemplazar componentes quemados</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ecuaciones matemáticas abajo a ancho completo -->
    <div class="viz-card" style="margin-top:14px;padding:12px 16px">
      <div class="math-eq-box is-light" id="el-math-live"></div>
    </div>
  `;

  const update = (syncWater = true) => {
    const vLed = 2.0;
    const vRes = Math.max(0, volts - vLed);
    const rawAmps = valveClosed ? 0 : vRes / ohms;
    const rawMa = rawAmps * 1000;
    const rawPr = valveClosed ? 0 : rawAmps * rawAmps * ohms;
    const rawPt = volts * rawAmps;

    const triggerFail = (kind: 'led' | 'res') => {
      if (failTimer) clearTimeout(failTimer);
      failTimer = window.setTimeout(() => {
        if (kind === 'led') ledState = 'burned';
        else resState = 'burned';
        update();
      }, 650);
    };

    if (ledState === 'ok' && rawMa > 30) {
      ledState = 'overloading';
      triggerFail('led');
    } else if (resState === 'ok' && rawPr > ratedW) {
      resState = 'overheating';
      triggerFail('res');
    }

    const circuitOpen = valveClosed || ledState === 'burned' || resState === 'burned' || vRes <= 0.05;
    const activeAmps = circuitOpen ? 0 : rawAmps;
    const activeMa = activeAmps * 1000;
    const activePr = activeAmps * activeAmps * ohms;
    const activePt = volts * activeAmps;
    const wMeta = WATT_RATINGS.find((x) => Math.abs(x.w - ratedW) < 0.001) ?? WATT_RATINGS[1];

    // Bandas dinámicas de la resistencia
    const bands = resistorBandsForOhms(ohms);
    bands.forEach((hex, i) => {
      document.getElementById(`el-rb${i}`)?.setAttribute('fill', hexCss(hex));
    });

    // Etiquetas
    document.getElementById('el-v-lbl')!.textContent = `${volts.toFixed(1)} V`;
    document.getElementById('el-r-lbl')!.textContent = valveClosed ? '∞ Ω (Llave cerrada)' : formatOhms(ohms);
    document.getElementById('el-w-lbl')!.textContent = `${wMeta.label} (${ratedW.toFixed(3)} W)`;
    document.getElementById('el-svg-v')!.textContent = `${volts.toFixed(1)} V`;
    document.getElementById('el-svg-r')!.textContent = valveClosed ? '∞ Ω · Abierto' : `${formatOhms(ohms)} · ${wMeta.label}`;
    document.getElementById('el-svg-i')!.textContent = circuitOpen && (ledState === 'burned' || resState === 'burned' || valveClosed)
      ? '0.0 mA · CIRCUITO ABIERTO'
      : `I = ${activeMa.toFixed(1)} mA · P(R) = ${activePr.toFixed(3)} W`;

    document.getElementById('el-kpi-i')!.textContent = `${activeMa.toFixed(1)} mA`;
    document.getElementById('el-kpi-pr')!.textContent = `${activePr.toFixed(3)} W`;
    document.getElementById('el-kpi-pt')!.textContent = `${activePt.toFixed(3)} W`;

    const pct = Math.min(200, Math.round((rawPr / ratedW) * 100));
    const fillBar = document.getElementById('el-watt-fill') as HTMLElement;
    fillBar.style.width = `${Math.min(100, pct)}%`;
    fillBar.style.background = pct > 100 ? '#dc2626' : pct > 70 ? '#f59e0b' : '#16a34a';
    document.getElementById('el-watt-pct')!.textContent = `${pct}% de ${ratedW.toFixed(3)} W`;

    // Fórmulas limpias
    document.getElementById('el-math-live')!.innerHTML = mEq(
      `${mVar('I')} = ${mFrac(`${mVar('V')} − ${mVar('V', 'LED')}`, mVar('R'))} = <span class="math-val">${activeMa.toFixed(1)} mA</span>` +
        ` &nbsp;|&nbsp; ${mVar('P', 'R')} = ${mVar('I')}<sup>2</sup> · ${mVar('R')} = <span class="math-val">${activePr.toFixed(3)} W</span>`
    );

    if (syncWater && waterHandle) {
      waterHandle.syncFromElectric(volts, ohms, valveClosed);
    }

    const elFlow = document.getElementById('el-flow-line') as HTMLElement;
    if (circuitOpen) {
      elFlow.classList.add('is-stopped');
    } else {
      const spd = Math.max(0.22, Math.min(3.2, 22 / Math.max(1.5, activeMa)));
      elFlow.classList.remove('is-stopped');
      elFlow.style.setProperty('--flow-speed', `${spd.toFixed(2)}s`);
    }

    // Estados LED y Resistencia
    const bulbGlow = document.getElementById('el-bulb-glow')!;
    const bulbCore = document.getElementById('el-bulb-core')!;
    const ledSparks = document.getElementById('el-led-sparks')!;
    const ledSmoke = document.getElementById('el-led-smoke')!;
    const resGlow = document.getElementById('el-res-glow')!;
    const resBody = document.getElementById('el-res-body')!;
    const resSparks = document.getElementById('el-res-sparks')!;
    const resSmoke = document.getElementById('el-res-smoke')!;
    const banner = document.getElementById('el-safety-banner')!;
    const replaceBtn = document.getElementById('el-replace-btn') as HTMLButtonElement;

    resBody.setAttribute('width', String(wMeta.width));

    if (ledState === 'burned') {
      bulbGlow.setAttribute('opacity', '0');
      bulbCore.setAttribute('fill', '#1f2937');
      ledSparks.setAttribute('opacity', '0');
      ledSmoke.setAttribute('opacity', '1');
    } else if (ledState === 'overloading') {
      bulbGlow.setAttribute('fill', '#fef08a');
      bulbGlow.setAttribute('opacity', '0.96');
      bulbCore.setAttribute('fill', '#ffffff');
      ledSparks.setAttribute('opacity', '1');
      ledSmoke.setAttribute('opacity', '0');
    } else {
      bulbGlow.setAttribute('fill', '#ef4444');
      bulbGlow.setAttribute('opacity', activeAmps > 0 ? String(Math.min(0.82, 0.16 + activeMa / 28)) : '0');
      bulbCore.setAttribute('fill', activeAmps > 0 ? '#ef4444' : '#475569');
      ledSparks.setAttribute('opacity', '0');
      ledSmoke.setAttribute('opacity', '0');
    }

    if (resState === 'burned') {
      resGlow.setAttribute('opacity', '0');
      resBody.setAttribute('fill', '#1c1917');
      resSparks.setAttribute('opacity', '0');
      resSmoke.setAttribute('opacity', '1');
    } else if (resState === 'overheating') {
      resGlow.setAttribute('opacity', '0.88');
      resBody.setAttribute('fill', '#fb923c');
      resSparks.setAttribute('opacity', '1');
      resSmoke.setAttribute('opacity', '0');
    } else {
      resBody.setAttribute('fill', '#dec8a0');
      resGlow.setAttribute('opacity', pct > 70 ? String(Math.min(0.45, (pct - 70) / 80)) : '0');
      resSparks.setAttribute('opacity', '0');
      resSmoke.setAttribute('opacity', '0');
    }

    if (ledState === 'burned' || resState === 'burned') {
      banner.className = 'status-banner is-bad';
      banner.textContent = resState === 'burned'
        ? `¡RESISTENCIA QUEMADA! Superó su límite de ${wMeta.label} (${rawPr.toFixed(3)} W > ${ratedW.toFixed(3)} W). Sube el wattaje o la resistencia y reemplaza el componente.`
        : `¡LED QUEMADO por sobrecorriente (${rawMa.toFixed(1)} mA > 30 mA)! Sube la resistencia y pulsa "Reemplazar componentes quemados".`;
      replaceBtn.hidden = false;
    } else if (ledState === 'overloading' || resState === 'overheating') {
      banner.className = 'status-banner is-bad';
      banner.textContent = resState === 'overheating'
        ? `¡Sobrecalentamiento térmico (${rawPr.toFixed(3)} W > ${wMeta.label})! La resistencia está a punto de quemarse...`
        : `¡Sobrecorriente extrema en LED (${rawMa.toFixed(1)} mA)! Fundiéndose...`;
      replaceBtn.hidden = true;
    } else if (valveClosed) {
      banner.className = 'status-banner is-warn';
      banner.textContent = 'Llave de paso totalmente cerrada (0%): resistencia infinita (∞ Ω), circuito abierto.';
      replaceBtn.hidden = true;
    } else if (vRes <= 0.05) {
      banner.className = 'status-banner is-warn';
      banner.textContent = volts === 0
        ? 'Sin altura de agua (0.0 m / 0.0 V): estanque vacío, presión y caudal nulos.'
        : `Voltaje insuficiente (${volts.toFixed(1)} V ≤ 2.0 V) para encender el LED.`;
      replaceBtn.hidden = true;
    } else if (rawMa > 20 || pct > 70) {
      banner.className = 'status-banner is-warn';
      banner.textContent = pct > 70
        ? `Advertencia térmica: la resistencia trabaja al ${pct}% de su capacidad (${wMeta.label}).`
        : `Corriente alta para el LED (${rawMa.toFixed(1)} mA). Recomendado mantener bajo 20 mA.`;
      replaceBtn.hidden = true;
    } else {
      banner.className = 'status-banner is-ok';
      banner.textContent = `Funcionamiento óptimo: ${activeMa.toFixed(1)} mA en el LED y ${activePr.toFixed(3)} W en resistencia de ${wMeta.label}.`;
      replaceBtn.hidden = true;
    }
  };

  const vSliderEl = document.getElementById('el-v-range') as HTMLInputElement | null;
  const rSliderEl = document.getElementById('el-r-range') as HTMLInputElement | null;

  waterHandle = mountGravityWaterAnalogy(document.getElementById('water-analogy-host')!, {
    initialVolts: volts,
    initialOhms: ohms,
    onInput: (nextV, nextR, nextClosed) => {
      volts = nextV;
      ohms = nextR;
      valveClosed = nextClosed;
      if (vSliderEl) vSliderEl.value = String(volts);
      if (rSliderEl) rSliderEl.value = String(Math.min(2000, Math.max(22, ohms)));
      update(false);
    },
  });

  vSliderEl?.addEventListener('input', (e) => {
    volts = Number((e.target as HTMLInputElement).value);
    update(true);
  });
  rSliderEl?.addEventListener('input', (e) => {
    ohms = Number((e.target as HTMLInputElement).value);
    valveClosed = false;
    update(true);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-el-watt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-el-watt]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      ratedW = Number(btn.dataset.elWatt);
      update();
    });
  });
  document.getElementById('el-replace-btn')?.addEventListener('click', () => {
    if (failTimer) clearTimeout(failTimer);
    ledState = 'ok';
    resState = 'ok';
    update();
  });

  update();
}

/* =========================================================================
 * MÓDULO 2: Ley de Ohm (Ecuaciones directas) + Laboratorio LED con falla real
 * ========================================================================= */
type LedKey = 'red' | 'yellow' | 'green' | 'blue';
type OhmTarget = 'I' | 'V' | 'R' | 'R_LED' | 'P';

function mountModOhm(): void {
  const root = document.getElementById('root-mod-ohm')!;
  let eqFocus: OhmTarget = 'R_LED';
  let sourceV = 5;
  let ledKey: LedKey = 'red';
  let ohms = 220;
  let ratedW = 0.25;
  let ledState: 'ok' | 'overloading' | 'burned' = 'ok';
  let resState: 'ok' | 'overheating' | 'burned' = 'ok';
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
        <h3>Ecuaciones fundamentales de la Ley de Ohm y Potencia</h3>
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
          <button type="button" class="ohm-eq-card" data-ohm-eq="P" style="grid-column:span 2">
            <span class="ohm-eq-tag">Potencia en la Resistencia (Watts)</span>
            ${mEq(`${mVar('P', 'R')} <span class="math-op">=</span> ${mVar('V', 'R')} <span class="math-op">·</span> ${mVar('I')} <span class="math-op">=</span> ${mVar('I')}<sup>2</sup> <span class="math-op">·</span> ${mVar('R')}`)}
          </button>
        </div>

        <div class="math-eq-box" id="ohm-formula-live"></div>
        <p id="ohm-formula-desc" style="margin:0;font-size:.88rem;color:var(--ink-2)"></p>

        <div class="rule-card is-good" style="margin-top:auto">
          <strong>Regla de oro en Arduino</strong>
          Un LED trabaja seguro entre <b>10 mA y 20 mA</b> (sobre 30 mA se funde). Y una resistencia estándar de <b>1/4 W (0.25 W)</b> se quema si disipa más calor del que soporta.
        </div>
      </div>

      <div class="viz-card">
        <h3>Laboratorio de LED + Resistencia con potencia</h3>
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
          <span class="ctrl-label"><span>Potencia nominal de la resistencia</span><span id="ohm-w-lbl">1/4 W</span></span>
          <div class="pill-row">
            ${[
              { w: 0.125, l: '1/8 W' },
              { w: 0.25, l: '1/4 W' },
              { w: 0.5, l: '1/2 W' },
              { w: 1.0, l: '1 W' },
            ].map((x) => `<button type="button" class="seg-btn ${x.w === 0.25 ? 'is-active' : ''}" data-ohm-w="${x.w}">${x.l}</button>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <label class="ctrl-label" for="ohm-r-slider"><span>Resistencia en serie</span><span id="ohm-r-val">220 Ω</span></label>
          <input id="ohm-r-slider" type="range" min="22" max="2200" step="10" value="220" />
        </div>

        <div class="svg-stage">
          <svg viewBox="0 0 460 175" aria-label="Simulador de LED y resistencia con animación de sobrecarga">
            <line x1="25" y1="92" x2="435" y2="92" stroke="#475569" stroke-width="5" />
            <line id="ohm-flow" class="electron-flow" x1="25" y1="92" x2="435" y2="92" stroke="#38bdf8" stroke-width="3" />

            <!-- Resistencia SVG 4 bandas + sobrecalentamiento -->
            <g transform="translate(82, 66)">
              <rect id="ohm-res-glow" x="-6" y="2" width="154" height="48" rx="20" fill="#ef4444" opacity="0" />
              <rect id="ohm-res-body" x="0" y="8" width="142" height="36" rx="16" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="ohm-b0" x="26" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b1" x="50" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b2" x="74" y="8" width="11" height="36" fill="#7c4318" />
              <rect id="ohm-b3" x="104" y="8" width="11" height="36" fill="#d4a007" />
              <g id="ohm-res-sparks" opacity="0">
                <path class="led-spark" d="M71 -6 L77 10 L94 6 L81 20 L95 30 L77 32 L71 48 L63 32 L45 30 L59 20 L46 6 L63 10 Z" fill="#fb923c" />
              </g>
              <g id="ohm-res-smoke" opacity="0">
                <circle class="led-smoke" cx="56" cy="2" r="9" fill="#94a3b8" />
                <circle class="led-smoke" cx="82" cy="-2" r="11" fill="#64748b" style="animation-delay:0.35s" />
              </g>
              <text id="ohm-svg-res-lbl" x="71" y="64" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11.5">220 Ω · 1/4 W</text>
            </g>

            <!-- LED animado + sobrecarga + humo -->
            <g transform="translate(316, 38)">
              <circle id="ohm-led-halo" cx="44" cy="54" r="48" fill="#ef4444" opacity="0.4" />
              <circle id="ohm-led-dome" cx="44" cy="54" r="24" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <g id="ohm-sparks" opacity="0">
                <path class="led-spark" d="M44 18 L48 34 L64 26 L52 40 L70 46 L52 52 L60 68 L44 58 L28 68 L36 52 L18 46 L36 40 L24 26 L40 34 Z" fill="#fef08a" />
              </g>
              <g id="ohm-smoke-grp" opacity="0">
                <circle class="led-smoke" cx="34" cy="24" r="8" fill="#94a3b8" />
                <circle class="led-smoke" cx="50" cy="18" r="10" fill="#64748b" style="animation-delay:0.4s" />
                <path d="M32 44 L42 54 L36 62 M56 44 L46 54 L52 64" stroke="#f87171" stroke-width="2.5" fill="none" />
              </g>
              <text id="ohm-led-ma" x="44" y="114" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="11.5" font-weight="bold">13.6 mA</text>
            </g>
          </svg>
        </div>

        <div id="ohm-safety-banner" class="status-banner is-ok">Corriente segura (13.6 mA) — Brillo óptimo sin dañar componentes.</div>
        <button type="button" class="btn-replace-led" id="btn-replace-led" hidden>Reemplazar componentes quemados</button>
      </div>
    </div>
  `;

  const renderFormula = () => {
    const meta = LED_META[ledKey];
    const vDrop = Math.max(0, sourceV - meta.vf);
    const broken = ledState === 'burned' || resState === 'burned';
    const amps = broken ? 0 : vDrop / ohms;
    const ma = amps * 1000;
    const pr = amps * amps * ohms;
    const recOhms = Math.max(47, Math.round(vDrop / 0.015));

    const box = document.getElementById('ohm-formula-live')!;
    const desc = document.getElementById('ohm-formula-desc')!;

    if (eqFocus === 'V') {
      box.innerHTML = mEq(`${mVar('V', 'R')} <span class="math-op">=</span> ${mVar('I')} <span class="math-op">·</span> ${mVar('R')} <span class="math-op">=</span> <span class="math-val">${amps.toFixed(3)} A</span> <span class="math-op">·</span> <span class="math-val">${ohms} Ω</span> <span class="math-op">=</span> <span class="math-val">${(amps * ohms).toFixed(2)} V</span>`);
      desc.textContent = 'Calcula la caída de tensión en la resistencia limitadora al multiplicar la corriente por el valor en ohmios.';
    } else if (eqFocus === 'I') {
      box.innerHTML = mEq(`${mVar('I')} <span class="math-op">=</span> ${mFrac(`${mVar('V', 'fuente')} <span class="math-op">−</span> ${mVar('V', 'LED')}`, mVar('R'))} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${vDrop.toFixed(1)} V</span>`, `<span class="math-val">${ohms} Ω</span>`)} <span class="math-op">=</span> <span class="math-val">${ma.toFixed(1)} mA</span>`);
      desc.textContent = 'Permite comprobar cuántos miliamperios circulan por el LED antes de energizar el circuito real.';
    } else if (eqFocus === 'R') {
      box.innerHTML = mEq(`${mVar('R')} <span class="math-op">=</span> ${mFrac(mVar('V', 'R'), mVar('I'))} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${vDrop.toFixed(1)} V</span>`, `<span class="math-val">${Math.max(0.001, amps).toFixed(3)} A</span>`)} <span class="math-op">=</span> <span class="math-val">${ohms} Ω</span>`);
      desc.textContent = 'Si conoces el voltaje sobrante y la corriente medida, obtienes exactamente la resistencia presente.';
    } else if (eqFocus === 'P') {
      box.innerHTML = mEq(`${mVar('P', 'R')} <span class="math-op">=</span> ${mVar('I')}<sup>2</sup> <span class="math-op">·</span> ${mVar('R')} <span class="math-op">=</span> <span class="math-val">(${amps.toFixed(3)} A)<sup>2</sup></span> <span class="math-op">·</span> <span class="math-val">${ohms} Ω</span> <span class="math-op">=</span> <span class="math-val">${pr.toFixed(3)} W</span>`);
      desc.textContent = `Compara esta potencia disipada contra el límite elegido (${ratedW} W). Si lo supera, la resistencia se quema.`;
    } else {
      box.innerHTML = mEq(`${mVar('R', 'rec')} <span class="math-op">=</span> ${mFrac(`${mVar('V', 'fuente')} <span class="math-op">−</span> ${mVar('V', 'LED')}`, '<span class="math-val">0.015 A</span>')} <span class="math-op">=</span> ${mFrac(`<span class="math-val">${sourceV} V − ${meta.vf} V</span>`, '<span class="math-val">0.015 A</span>')} <span class="math-op">≈</span> <span class="math-val">${recOhms} Ω</span>`);
      desc.textContent = 'Con esta ecuación calculas la resistencia mínima recomendada para fijar unos seguros 15 mA.';
    }
  };

  const applyVisuals = () => {
    const meta = LED_META[ledKey];
    const vDrop = Math.max(0, sourceV - meta.vf);
    const amps = vDrop / ohms;
    const ma = amps * 1000;
    const pr = amps * amps * ohms;
    const recOhms = Math.max(47, Math.round(vDrop / 0.015));
    const wTag = ratedW === 0.125 ? '1/8 W' : ratedW === 0.25 ? '1/4 W' : ratedW === 0.5 ? '1/2 W' : '1 W';

    const bands = resistorBandsForOhms(ohms);
    bands.forEach((hex, i) => {
      document.getElementById(`ohm-b${i}`)?.setAttribute('fill', hexCss(hex));
    });
    document.getElementById('ohm-r-val')!.textContent = formatOhms(ohms);
    document.getElementById('ohm-w-lbl')!.textContent = `${wTag} (${ratedW.toFixed(3)} W)`;
    document.getElementById('ohm-svg-res-lbl')!.textContent = `${formatOhms(ohms)} · ${wTag} · ${pr.toFixed(2)}W`;

    const flow = document.getElementById('ohm-flow') as HTMLElement;
    const halo = document.getElementById('ohm-led-halo')!;
    const dome = document.getElementById('ohm-led-dome')!;
    const sparks = document.getElementById('ohm-sparks')!;
    const smoke = document.getElementById('ohm-smoke-grp')!;
    const rGlow = document.getElementById('ohm-res-glow')!;
    const rBody = document.getElementById('ohm-res-body')!;
    const rSparks = document.getElementById('ohm-res-sparks')!;
    const rSmoke = document.getElementById('ohm-res-smoke')!;
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
    } else if (resState === 'ok' && pr > ratedW) {
      resState = 'overheating';
      if (burnTimer) clearTimeout(burnTimer);
      burnTimer = window.setTimeout(() => {
        resState = 'burned';
        applyVisuals();
      }, 700);
    }

    const broken = ledState === 'burned' || resState === 'burned';
    if (broken) flow.classList.add('is-stopped');
    else if (vDrop > 0.1) flow.classList.remove('is-stopped');

    if (ledState === 'overloading') {
      flow.style.setProperty('--flow-speed', '0.18s');
      halo.setAttribute('fill', '#fef08a');
      halo.setAttribute('opacity', '0.95');
      dome.setAttribute('fill', '#ffffff');
      sparks.setAttribute('opacity', '1');
      smoke.setAttribute('opacity', '0');
    } else if (ledState === 'burned') {
      halo.setAttribute('opacity', '0');
      dome.setAttribute('fill', '#1f2937');
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '1');
    } else if (vDrop <= 0.1 || resState === 'burned') {
      halo.setAttribute('opacity', '0');
      dome.setAttribute('fill', '#475569');
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '0');
    } else {
      halo.setAttribute('fill', meta.color);
      halo.setAttribute('opacity', String(Math.min(0.8, 0.18 + ma / 25)));
      dome.setAttribute('fill', meta.color);
      sparks.setAttribute('opacity', '0');
      smoke.setAttribute('opacity', '0');
    }

    if (resState === 'overheating') {
      rGlow.setAttribute('opacity', '0.88');
      rBody.setAttribute('fill', '#fb923c');
      rSparks.setAttribute('opacity', '1');
      rSmoke.setAttribute('opacity', '0');
    } else if (resState === 'burned') {
      rGlow.setAttribute('opacity', '0');
      rBody.setAttribute('fill', '#1c1917');
      rSparks.setAttribute('opacity', '0');
      rSmoke.setAttribute('opacity', '1');
    } else {
      rGlow.setAttribute('opacity', pr > ratedW * 0.7 ? '0.35' : '0');
      rBody.setAttribute('fill', '#dec8a0');
      rSparks.setAttribute('opacity', '0');
      rSmoke.setAttribute('opacity', '0');
    }

    if (broken) {
      maText.textContent = '0.0 mA (Abierto)';
      banner.className = 'status-banner is-bad';
      banner.textContent = resState === 'burned'
        ? `¡RESISTENCIA QUEMADA (${pr.toFixed(2)} W > ${wTag})! El exceso de potencia la fundió. Reemplaza componentes.`
        : `¡LED QUEMADO (${ma.toFixed(1)} mA > 30 mA)! Sube a ≥ ${recOhms} Ω y pulsa "Reemplazar componentes quemados".`;
      replaceBtn.hidden = false;
    } else if (ledState === 'overloading' || resState === 'overheating') {
      maText.textContent = `${ma.toFixed(1)} mA ¡SOBRECARGA!`;
      banner.className = 'status-banner is-bad';
      banner.textContent = resState === 'overheating'
        ? `¡Sobrecalentamiento (${pr.toFixed(2)} W > ${wTag})! La resistencia está ardiendo...`
        : `¡Sobrecorriente extrema (${ma.toFixed(1)} mA)! El LED está brillando antes de fundirse...`;
      replaceBtn.hidden = true;
    } else if (vDrop <= 0.1) {
      flow.classList.add('is-stopped');
      maText.textContent = '0.0 mA';
      banner.className = 'status-banner is-warn';
      banner.textContent = `Voltaje insuficiente (${sourceV} V < ${meta.vf} V del LED).`;
      replaceBtn.hidden = true;
    } else if (ma > 20 || pr > ratedW * 0.7) {
      flow.style.setProperty('--flow-speed', '0.45s');
      maText.textContent = `${ma.toFixed(1)} mA`;
      banner.className = 'status-banner is-warn';
      banner.textContent = pr > ratedW * 0.7
        ? `Resistencia caliente (${pr.toFixed(3)} W de ${ratedW} W). Considera usar una de mayor potencia.`
        : `Al límite del pin Arduino (${ma.toFixed(1)} mA). Sube a ≥ ${recOhms} Ω para trabajar bajo 20 mA.`;
      replaceBtn.hidden = true;
    } else {
      flow.style.setProperty('--flow-speed', `${Math.max(0.45, Math.min(2.6, 18 / Math.max(1, ma))).toFixed(2)}s`);
      maText.textContent = `${ma.toFixed(1)} mA`;
      banner.className = 'status-banner is-ok';
      banner.textContent = `Seguro: ${ma.toFixed(1)} mA en LED · ${pr.toFixed(3)} W en resistencia ${wTag}.`;
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

  root.querySelectorAll<HTMLButtonElement>('[data-ohm-w]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-ohm-w]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      ratedW = Number(btn.dataset.ohmW);
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
    resState = 'ok';
    applyVisuals();
  });

  applyVisuals();
}

/* =========================================================================
 * MÓDULO 3: Diagramas Eléctricos y Simbología Electrónica (Teoría + Animación)
 * ========================================================================= */
function mountModDiagramas(): void {
  const root = document.getElementById('root-mod-diagramas');
  if (!root) return;

  type SymId = 'fuente' | 'resistor' | 'diodo' | 'led' | 'switch' | 'pot' | 'cap' | 'npn' | 'nodos';
  interface SymDef {
    id: SymId;
    label: string;
    title: string;
    pins: string;
    theory: string;
    arduinoTip: string;
    actionLabel: string;
    theorySvg: string;
    renderAnim: (alt: boolean, sliderVal: number) => { svg: string; status: string };
  }

  const SYMBOLS: SymDef[] = [
    {
      id: 'fuente',
      label: 'Fuente DC / GND',
      title: 'Fuente de alimentación DC y Tierra (GND)',
      pins: '+ (VCC / 5V / 3.3V) · − (GND / 0 V)',
      theory: 'La pila o fuente DC entrega voltaje continuo. La línea larga representa el polo positivo (+) y la corta el negativo (−). El símbolo de tierra (GND) es el punto de referencia de 0 V común para todo el circuito.',
      arduinoTip: 'En Arduino todos los GND deben estar unidos entre sí (protoboard, sensores y fuentes externas) para que compartan la misma referencia.',
      actionLabel: 'Alternar 5 V / 3.3 V',
      theorySvg: `
        <svg viewBox="0 0 260 110" aria-label="Símbolo Fuente DC y Tierra GND">
          <line x1="25" y1="55" x2="66" y2="55" stroke="#151515" stroke-width="3"/>
          <line x1="66" y1="28" x2="66" y2="82" stroke="#dc2626" stroke-width="4"/>
          <line x1="80" y1="41" x2="80" y2="69" stroke="#151515" stroke-width="4"/>
          <line x1="80" y1="55" x2="122" y2="55" stroke="#151515" stroke-width="3"/>
          <text x="54" y="24" fill="#dc2626" font-family="monospace" font-size="13" font-weight="bold">+</text>
          <text x="86" y="24" fill="#151515" font-family="monospace" font-size="13" font-weight="bold">−</text>
          <text x="72" y="99" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">Fuente DC</text>
          <line x1="195" y1="26" x2="195" y2="62" stroke="#151515" stroke-width="3"/>
          <line x1="173" y1="62" x2="217" y2="62" stroke="#151515" stroke-width="3.5"/>
          <line x1="181" y1="71" x2="209" y2="71" stroke="#151515" stroke-width="3.5"/>
          <line x1="189" y1="80" x2="201" y2="80" stroke="#151515" stroke-width="3.5"/>
          <text x="195" y="99" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">Tierra (GND)</text>
        </svg>`,
      renderAnim: (alt) => {
        const v = alt ? '3.3 V' : '5.0 V';
        const col = alt ? '#8b5cf6' : '#ef4444';
        return {
          svg: `
            <svg viewBox="0 0 380 180">
              <rect x="48" y="34" width="284" height="106" rx="14" fill="none" stroke="#334155" stroke-width="6"/>
              <rect class="electron-flow" style="--flow-speed:${alt ? '1.35s' : '0.85s'}" x="48" y="34" width="284" height="106" rx="14" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
              <g transform="translate(22,56)">
                <rect x="0" y="0" width="54" height="62" rx="8" fill="#0f172a" stroke="${col}" stroke-width="2.5"/>
                <line x1="18" y1="14" x2="18" y2="48" stroke="${col}" stroke-width="3.5"/>
                <line x1="34" y1="22" x2="34" y2="40" stroke="#94a3b8" stroke-width="3.5"/>
                <text x="27" y="-8" text-anchor="middle" fill="#fff" font-family="monospace" font-size="12" font-weight="bold">${v}</text>
              </g>
              <g transform="translate(304,68)">
                <line x1="26" y1="0" x2="26" y2="26" stroke="#38bdf8" stroke-width="3"/>
                <line x1="10" y1="26" x2="42" y2="26" stroke="#fff" stroke-width="3"/>
                <line x1="15" y1="33" x2="37" y2="33" stroke="#fff" stroke-width="3"/>
                <line x1="21" y1="40" x2="31" y2="40" stroke="#fff" stroke-width="3"/>
                <text x="26" y="56" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11">GND 0V</text>
              </g>
            </svg>`,
          status: `Fuente configurada en ${v} respecto a GND (0 V). Los sensores 3.3 V (como BME280 o ESP32) requieren lógica de 3.3 V.`,
        };
      },
    },
    {
      id: 'resistor',
      label: 'Resistencia',
      title: 'Resistencia (Norma ANSI zigzag y IEC rectangular)',
      pins: 'Sin polaridad (P1 y P2 son equivalentes)',
      theory: 'Limita la corriente y divide voltajes. En esquemas americanos (ANSI) se dibuja como un zigzag; en esquemas europeos/internacionales (IEC) como un rectángulo.',
      arduinoTip: 'No tiene polaridad: da igual en qué sentido la insertes en la protoboard.',
      actionLabel: 'Alternar norma ANSI / IEC',
      theorySvg: `
        <svg viewBox="0 0 260 110" aria-label="Símbolo de resistencia ANSI e IEC">
          <path d="M22 44 L44 44 L50 30 L60 58 L70 30 L80 58 L90 30 L100 44 L120 44" fill="none" stroke="#151515" stroke-width="3" stroke-linejoin="round"/>
          <text x="71" y="84" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">ANSI (Zigzag)</text>
          <line x1="144" y1="44" x2="164" y2="44" stroke="#151515" stroke-width="3"/>
          <rect x="164" y="31" width="52" height="26" fill="none" stroke="#00c2b5" stroke-width="3"/>
          <line x1="216" y1="44" x2="238" y2="44" stroke="#151515" stroke-width="3"/>
          <text x="190" y="84" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">IEC (Rectángulo)</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <line x1="28" y1="90" x2="128" y2="90" stroke="#38bdf8" stroke-width="5"/>
            <line class="electron-flow" style="--flow-speed:0.7s" x1="28" y1="90" x2="128" y2="90" stroke="#fff" stroke-width="2.5"/>
            ${
              alt
                ? `<rect x="128" y="66" width="124" height="48" rx="4" fill="#1e293b" stroke="#00c2b5" stroke-width="3.5"/>
                   <text x="190" y="95" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">IEC · 220 Ω</text>`
                : `<path d="M128 90 L146 90 L158 62 L176 118 L194 62 L212 118 L230 62 L242 90 L252 90" fill="none" stroke="#00c2b5" stroke-width="4" stroke-linejoin="round"/>
                   <text x="190" y="144" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">ANSI · 220 Ω</text>`
            }
            <line x1="252" y1="90" x2="352" y2="90" stroke="#38bdf8" stroke-width="5"/>
            <line class="electron-flow" style="--flow-speed:1.5s" x1="252" y1="90" x2="352" y2="90" stroke="#7dd3fc" stroke-width="2.5"/>
            <text x="78" y="68" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="11">Alta presión</text>
            <text x="302" y="68" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="11">Corriente frenada</text>
          </svg>`,
        status: alt
          ? 'Norma IEC: rectángulo estándar usado en Europa y planos industriales.'
          : 'Norma ANSI/IEEE: línea zigzag clásica muy común en tutoriales de Arduino.',
      }),
    },
    {
      id: 'diodo',
      label: 'Diodo',
      title: 'Diodo Rectificador (Válvula antirretorno eléctrica)',
      pins: 'Ánodo (+) → Cátodo (−, franja plateada)',
      theory: 'Permite el paso de corriente en un único sentido (desde Ánodo hacia Cátodo, siguiendo la flecha del triángulo) y bloquea por completo la corriente en sentido inverso.',
      arduinoTip: 'Si lo conectas al revés no conduce; úsalo en paralelo con relés o motores (diodo flyback) para proteger el Arduino de picos inversos.',
      actionLabel: 'Invertir polaridad del diodo',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <line x1="40" y1="55" x2="106" y2="55" stroke="#151515" stroke-width="3"/>
          <polygon points="106,33 106,77 148,55" fill="#151515"/>
          <line x1="150" y1="31" x2="150" y2="79" stroke="#dc2626" stroke-width="5"/>
          <line x1="150" y1="55" x2="218" y2="55" stroke="#151515" stroke-width="3"/>
          <text x="64" y="42" fill="#151515" font-family="monospace" font-size="12" font-weight="bold">Ánodo (+)</text>
          <text x="160" y="42" fill="#dc2626" font-family="monospace" font-size="12" font-weight="bold">Cátodo (−)</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <rect x="44" y="40" width="292" height="100" rx="14" fill="none" stroke="#334155" stroke-width="6"/>
            <rect class="electron-flow ${alt ? 'is-stopped' : ''}" style="--flow-speed:0.9s" x="44" y="40" width="292" height="100" rx="14" fill="none" stroke="${alt ? '#ef4444' : '#22c55e'}" stroke-width="3.5"/>
            <g transform="translate(154,18)">
              ${
                alt
                  ? `<line x1="10" y1="4" x2="10" y2="40" stroke="#ef4444" stroke-width="5"/>
                     <polygon points="54,4 54,40 12,22" fill="#475569"/>
                     <text x="34" y="-4" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="11" font-weight="bold">INVERSA (BLOQUEA)</text>`
                  : `<polygon points="10,4 10,40 52,22" fill="#22c55e"/>
                     <line x1="54" y1="4" x2="54" y2="40" stroke="#fff" stroke-width="5"/>
                     <text x="34" y="-4" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="11" font-weight="bold">DIRECTA (CONDUCE →)</text>`
              }
            </g>
            <text x="190" y="102" text-anchor="middle" fill="${alt ? '#fca5a5' : '#86efac'}" font-family="monospace" font-size="13" font-weight="bold">
              ${alt ? '0.0 mA — La barrera detiene los electrones' : 'Corriente fluyendo por el triángulo →'}
            </text>
          </svg>`,
        status: alt
          ? 'Polarización INVERSA: la barra vertical (Cátodo) apunta contra el positivo y bloquea la corriente (0 mA).'
          : 'Polarización DIRECTA: el Ánodo recibe (+) y el Cátodo (−); la corriente cruza con ~0.7 V de caída.',
      }),
    },
    {
      id: 'led',
      label: 'LED',
      title: 'Diodo Emisor de Luz (LED)',
      pins: 'Ánodo (pata larga +) · Cátodo (pata corta / lado plano −)',
      theory: 'Es un diodo especial que emite fotones de luz cuando circula corriente en sentido directo. Las dos flechas saliendo del triángulo representan la emisión de luz.',
      arduinoTip: 'Siempre exige resistencia en serie (220 Ω – 330 Ω en 5 V). Si lo conectas invertido no enciende.',
      actionLabel: 'Invertir LED (+ / −)',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <line x1="40" y1="62" x2="104" y2="62" stroke="#151515" stroke-width="3"/>
          <polygon points="104,40 104,84 144,62" fill="#ef4444"/>
          <line x1="146" y1="38" x2="146" y2="86" stroke="#151515" stroke-width="4.5"/>
          <line x1="146" y1="62" x2="215" y2="62" stroke="#151515" stroke-width="3"/>
          <path d="M126 32 L144 14 M140 14 L144 14 L144 18" stroke="#00c2b5" stroke-width="2.5" fill="none"/>
          <path d="M142 36 L160 18 M156 18 L160 18 L160 22" stroke="#00c2b5" stroke-width="2.5" fill="none"/>
          <text x="64" y="49" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">Ánodo +</text>
          <text x="158" y="49" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">Cátodo −</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <rect x="44" y="46" width="292" height="94" rx="14" fill="none" stroke="#334155" stroke-width="6"/>
            <rect class="electron-flow ${alt ? 'is-stopped' : ''}" style="--flow-speed:0.85s" x="44" y="46" width="292" height="94" rx="14" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
            <g transform="translate(160,18)">
              ${
                !alt
                  ? `<circle cx="30" cy="28" r="34" fill="#ef4444" opacity="0.38"/>
                     <polygon points="10,10 10,46 48,28" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
                     <line x1="50" y1="10" x2="50" y2="46" stroke="#fff" stroke-width="4"/>
                     <path d="M24 2 L38 -12 M34 -12 L38 -12 L38 -8" stroke="#fef08a" stroke-width="2.5" fill="none"/>
                     <path d="M40 6 L54 -8 M50 -8 L54 -8 L54 -4" stroke="#fef08a" stroke-width="2.5" fill="none"/>`
                  : `<line x1="10" y1="10" x2="10" y2="46" stroke="#94a3b8" stroke-width="4"/>
                     <polygon points="50,10 50,46 12,28" fill="#475569"/>`
              }
            </g>
            <text x="190" y="108" text-anchor="middle" fill="${alt ? '#fca5a5' : '#fef08a'}" font-family="monospace" font-size="13" font-weight="bold">
              ${alt ? 'LED apagado (polaridad invertida)' : '¡LED encendido emitiendo luz!'}
            </text>
          </svg>`,
        status: alt
          ? 'Cátodo conectado al positivo: el LED actúa como barrera cerrada y no emite luz.'
          : 'Ánodo a +5 V (vía R) y Cátodo a GND: emite luz continua de ~15 mA.',
      }),
    },
    {
      id: 'switch',
      label: 'Interruptor',
      title: 'Interruptor / Pulsador NA (Normalmente Abierto)',
      pins: 'Entrada COM y Salida NO (cierra el contacto al presionar)',
      theory: 'Abre o cierra físicamente un camino conductor. Cuando está abierto hay un espacio de aire (resistencia infinita = 0 A). Al cerrarlo, los electrones circulan.',
      arduinoTip: 'Para leer un pulsador en Arduino usa siempre INPUT_PULLUP o resistencia externa para evitar lecturas locas (pin flotante).',
      actionLabel: 'Abrir / Cerrar interruptor',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <line x1="35" y1="60" x2="98" y2="60" stroke="#151515" stroke-width="3.5"/>
          <circle cx="98" cy="60" r="5" fill="#151515"/>
          <line x1="98" y1="60" x2="156" y2="32" stroke="#00c2b5" stroke-width="4" stroke-linecap="round"/>
          <circle cx="160" cy="60" r="5" fill="#151515"/>
          <line x1="160" y1="60" x2="225" y2="60" stroke="#151515" stroke-width="3.5"/>
          <text x="130" y="92" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">Circuito abierto (0 A)</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <rect x="44" y="42" width="292" height="96" rx="14" fill="none" stroke="#334155" stroke-width="6"/>
            <rect class="electron-flow ${alt ? '' : 'is-stopped'}" style="--flow-speed:0.85s" x="44" y="42" width="292" height="96" rx="14" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
            <rect x="148" y="24" width="84" height="36" fill="#181818"/>
            <circle cx="152" cy="42" r="6" fill="#00c2b5"/>
            <circle cx="228" cy="42" r="6" fill="#00c2b5"/>
            <line x1="152" y1="42" x2="228" y2="${alt ? '42' : '16'}" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
            <text x="190" y="98" text-anchor="middle" fill="${alt ? '#86efac' : '#cbd5e1'}" font-family="monospace" font-size="13" font-weight="bold">
              ${alt ? 'CERRADO → Paso libre de corriente' : 'ABIERTO → Camino cortado (0 mA)'}
            </text>
          </svg>`,
        status: alt
          ? 'Contacto cerrado: el lazo queda completo y la carga recibe corriente.'
          : 'Contacto abierto: el puente metálico está levantado; no hay circulación.',
      }),
    },
    {
      id: 'pot',
      label: 'Potenciómetro',
      title: 'Potenciómetro (Divisor de tensión variable)',
      pins: 'Extremo A (5V) · Cursor Central (Salida A0) · Extremo B (GND)',
      theory: 'Es una resistencia con un tercer contacto móvil (flecha). Al girar la perilla, desplazas la flecha y entregas un voltaje analógico proporcional entre 0 V y 5 V.',
      arduinoTip: 'Conecta el pin central a A0–A5 para leer valores de 0 a 1023 con analogRead().',
      actionLabel: 'Mover cursor',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <path d="M40 62 L66 62 L74 44 L86 80 L98 44 L110 80 L122 44 L134 80 L144 62 L175 62" fill="none" stroke="#151515" stroke-width="3"/>
          <line x1="108" y1="16" x2="108" y2="39" stroke="#00c2b5" stroke-width="3.5"/>
          <polygon points="101,35 115,35 108,46" fill="#00c2b5"/>
          <text x="195" y="42" fill="#00c2b5" font-family="monospace" font-size="11" font-weight="bold">Cursor (A0)</text>
          <text x="108" y="99" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">5V — [R] — GND</text>
        </svg>`,
      renderAnim: (_alt, pct) => {
        const vOut = (pct / 100) * 5;
        const xWiper = 95 + (pct / 100) * 190;
        return {
          svg: `
            <svg viewBox="0 0 380 180">
              <text x="68" y="88" text-anchor="end" fill="#f87171" font-family="monospace" font-size="12" font-weight="bold">0 V</text>
              <line x1="76" y1="84" x2="95" y2="84" stroke="#64748b" stroke-width="4"/>
              <rect x="95" y="64" width="190" height="40" rx="6" fill="#1e293b" stroke="#94a3b8" stroke-width="2.5"/>
              <line x1="285" y1="84" x2="306" y2="84" stroke="#ef4444" stroke-width="4"/>
              <text x="314" y="88" fill="#f87171" font-family="monospace" font-size="12" font-weight="bold">5.0 V</text>
              <g transform="translate(${xWiper}, 26)">
                <line x1="0" y1="0" x2="0" y2="32" stroke="#00c2b5" stroke-width="4"/>
                <polygon points="-7,28 7,28 0,40" fill="#00c2b5"/>
                <text x="0" y="-6" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="12" font-weight="bold">${vOut.toFixed(2)} V</text>
              </g>
              <text x="190" y="142" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="13" font-weight="bold">
                analogRead(A0) = ${Math.round((pct / 100) * 1023)}
              </text>
            </svg>`,
          status: `Cursor al ${pct}%: divide la tensión entregando ${vOut.toFixed(2)} V en el pin central.`,
        };
      },
    },
    {
      id: 'cap',
      label: 'Condensador',
      title: 'Condensador / Capacitor (Almacén rápido de energía)',
      pins: 'No polarizado (cerámico) o Polarizado (+ / −, electrolítico)',
      theory: 'Dos placas paralelas separadas por un aislante. Almacena energía en un campo eléctrico y suaviza caídas bruscas de voltaje como un pequeño estanque auxiliar.',
      arduinoTip: 'Un condensador electrolítico de 100 µF cerca del servo evita que el Arduino se reinicie cuando el motor arranca.',
      actionLabel: 'Cargar / Descargar capacitor',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <line x1="40" y1="55" x2="112" y2="55" stroke="#151515" stroke-width="3"/>
          <line x1="112" y1="26" x2="112" y2="84" stroke="#151515" stroke-width="4"/>
          <line x1="128" y1="26" x2="128" y2="84" stroke="#151515" stroke-width="4"/>
          <line x1="128" y1="55" x2="205" y2="55" stroke="#151515" stroke-width="3"/>
          <text x="120" y="102" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11">Placas separadas (C)</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <rect x="64" y="42" width="252" height="96" rx="14" fill="none" stroke="#334155" stroke-width="6"/>
            <rect x="166" y="18" width="48" height="48" fill="#181818"/>
            <line x1="176" y1="20" x2="176" y2="66" stroke="${alt ? '#22c55e' : '#94a3b8'}" stroke-width="5"/>
            <line x1="204" y1="20" x2="204" y2="66" stroke="${alt ? '#38bdf8' : '#94a3b8'}" stroke-width="5"/>
            ${alt ? '<text x="162" y="34" fill="#fca5a5" font-family="monospace" font-size="14" font-weight="bold">+</text><text x="210" y="34" fill="#7dd3fc" font-family="monospace" font-size="14" font-weight="bold">−</text>' : ''}
            <rect x="115" y="104" width="150" height="16" rx="8" fill="#1e293b" stroke="#475569"/>
            <rect x="117" y="106" width="${alt ? '146' : '16'}" height="12" rx="6" fill="${alt ? '#22c55e' : '#64748b'}"/>
            <text x="190" y="92" text-anchor="middle" fill="#fff" font-family="monospace" font-size="12" font-weight="bold">
              ${alt ? 'CARGADO: 5.0 V almacenados entre placas' : 'DESCARGADO: 0.0 V en espera'}
            </text>
          </svg>`,
        status: alt
          ? 'Las cargas (+) y (−) se acumulan en placas opuestas manteniendo 5.0 V disponibles al instante.'
          : 'Sin voltaje aplicado las placas están neutras (0.0 V).',
      }),
    },
    {
      id: 'npn',
      label: 'Transistor NPN',
      title: 'Transistor NPN (Interruptor electrónico controlado por Base)',
      pins: 'Base (B · señal Arduino) · Colector (C · carga) · Emisor (E · GND)',
      theory: 'Una corriente minúscula que entra por la Base (pin Arduino) abre el camino principal para que una corriente mucho mayor pase del Colector al Emisor.',
      arduinoTip: 'Indispensable para encender motores DC, tiras LED o relés de 12 V que quemarían un pin de 40 mA del Arduino.',
      actionLabel: 'Activar / Apagar Base (pin 9)',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <circle cx="130" cy="55" r="34" fill="none" stroke="#151515" stroke-width="2.5"/>
          <line x1="60" y1="55" x2="118" y2="55" stroke="#00c2b5" stroke-width="3.5"/>
          <line x1="118" y1="35" x2="118" y2="75" stroke="#151515" stroke-width="5"/>
          <line x1="118" y1="45" x2="152" y2="20" stroke="#151515" stroke-width="3"/>
          <line x1="118" y1="65" x2="152" y2="90" stroke="#151515" stroke-width="3"/>
          <polygon points="140,86 152,90 147,78" fill="#151515"/>
          <text x="52" y="45" fill="#00c2b5" font-family="monospace" font-size="11" font-weight="bold">B</text>
          <text x="158" y="24" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">C</text>
          <text x="158" y="96" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">E</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <circle cx="190" cy="90" r="52" fill="#0f172a" stroke="#475569" stroke-width="2.5"/>
            <line x1="176" y1="58" x2="176" y2="122" stroke="#fff" stroke-width="6"/>
            <!-- Base -->
            <line x1="42" y1="90" x2="176" y2="90" stroke="${alt ? '#00c2b5' : '#475569'}" stroke-width="4"/>
            <line class="electron-flow ${alt ? '' : 'is-stopped'}" style="--flow-speed:1.2s" x1="42" y1="90" x2="176" y2="90" stroke="#5ef2e6" stroke-width="2.5"/>
            <!-- Colector -> Emisor -->
            <line x1="176" y1="74" x2="264" y2="26" stroke="${alt ? '#22c55e' : '#475569'}" stroke-width="6"/>
            <line x1="176" y1="106" x2="264" y2="154" stroke="${alt ? '#22c55e' : '#475569'}" stroke-width="6"/>
            <line class="electron-flow ${alt ? '' : 'is-stopped'}" style="--flow-speed:0.45s" x1="264" y1="26" x2="176" y2="74" stroke="#86efac" stroke-width="3"/>
            <line class="electron-flow ${alt ? '' : 'is-stopped'}" style="--flow-speed:0.45s" x1="176" y1="106" x2="264" y2="154" stroke="#86efac" stroke-width="3"/>
            <text x="52" y="75" fill="#5ef2e6" font-family="monospace" font-size="11">Base: ${alt ? '5 V (2 mA)' : '0 V (0 mA)'}</text>
            <text x="276" y="34" fill="#86efac" font-family="monospace" font-size="11">Colector (Carga)</text>
            <text x="276" y="156" fill="#cbd5e1" font-family="monospace" font-size="11">Emisor (GND)</text>
          </svg>`,
        status: alt
          ? 'Base activada (HIGH): 2 mA en Base permiten conducir 500+ mA entre Colector y Emisor.'
          : 'Base en LOW (0 V): el transistor está en corte; la carga permanece apagada.',
      }),
    },
    {
      id: 'nodos',
      label: 'Nodos y Cruces',
      title: '¿Cuándo dos cables están conectados en un plano?',
      pins: 'Punto negro (Nodo = SÍ hay unión) · Sin punto o puente (Cruce = NO se tocan)',
      theory: 'En los diagramas eléctricos los cables se cruzan visualmente. Solo existe conexión eléctrica real donde hay un punto sólido (nodo). Si no hay punto, los cables pasan uno encima del otro aislados.',
      arduinoTip: 'Antes de armar una protoboard real, marca los nodos de tu plano para saber qué puntos comparten el mismo potencial.',
      actionLabel: 'Cambiar cruce ↔ nodo unido',
      theorySvg: `
        <svg viewBox="0 0 260 110">
          <line x1="30" y1="55" x2="110" y2="55" stroke="#151515" stroke-width="3"/>
          <line x1="70" y1="20" x2="70" y2="90" stroke="#151515" stroke-width="3"/>
          <circle cx="70" cy="55" r="6" fill="#00c2b5"/>
          <text x="70" y="103" text-anchor="middle" fill="#151515" font-family="monospace" font-size="10.5">CON NODO (Unidos)</text>
          <line x1="150" y1="55" x2="230" y2="55" stroke="#151515" stroke-width="3"/>
          <path d="M190 20 L190 45 A10 10 0 0 1 190 65 L190 90" fill="none" stroke="#151515" stroke-width="3"/>
          <text x="190" y="103" text-anchor="middle" fill="#151515" font-family="monospace" font-size="10.5">CRUCE (Sin unión)</text>
        </svg>`,
      renderAnim: (alt) => ({
        svg: `
          <svg viewBox="0 0 380 180">
            <line x1="56" y1="90" x2="324" y2="90" stroke="#38bdf8" stroke-width="5"/>
            <line class="electron-flow" style="--flow-speed:0.9s" x1="56" y1="90" x2="324" y2="90" stroke="#fff" stroke-width="2.5"/>
            <line x1="190" y1="22" x2="190" y2="158" stroke="${alt ? '#38bdf8' : '#64748b'}" stroke-width="5"/>
            ${alt ? '<line class="electron-flow" style="--flow-speed:0.9s" x1="190" y1="22" x2="190" y2="158" stroke="#fff" stroke-width="2.5"/><circle cx="190" cy="90" r="10" fill="#00c2b5" stroke="#fff" stroke-width="2"/>' : '<path d="M190 74 A16 16 0 0 1 190 106" fill="#181818" stroke="#94a3b8" stroke-width="5"/>'}
            <text x="190" y="172" text-anchor="middle" fill="${alt ? '#5ef2e6' : '#cbd5e1'}" font-family="monospace" font-size="12" font-weight="bold">
              ${alt ? 'NODO UNIDO: ambos cables comparten la señal' : 'CRUCE AISLADO: señales independientes'}
            </text>
          </svg>`,
        status: alt
          ? 'Con punto de nodo: la corriente se reparte por ambas líneas.'
          : 'Sin punto de nodo (puente): los dos cables no tienen contacto eléctrico entre sí.',
      }),
    },
  ];

  let activeId: SymId = 'fuente';
  let altMode = false;
  let potPct = 50;

  // Estado del laboratorio completo
  let labSwitchClosed = true;
  let labDiodeForward = true;
  let labFocusText = 'Haz clic sobre cualquier símbolo del esquema (Fuente, Interruptor S1, R1, Diodo o LED) para leer su función.';

  root.innerHTML = `
    <div class="diag-symbol-tabs" id="diag-sym-tabs">
      ${SYMBOLS.map((s, i) => `<button type="button" class="seg-btn ${i === 0 ? 'is-active' : ''}" data-diag-sym="${s.id}">${s.label}</button>`).join('')}
    </div>

    <div class="viz-grid-2">
      <div class="viz-card" id="diag-theory-card"></div>
      <div class="viz-card" id="diag-anim-card"></div>
    </div>

    <div class="diag-lab-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h3 style="margin:0;font-family:var(--serif);font-size:1.35rem;color:var(--navy)">
            Laboratorio: Lee un diagrama eléctrico completo
          </h3>
          <p style="margin:2px 0 0;font-size:.86rem;color:var(--ink-2)">
            Acciona el interruptor S1, invierte el diodo protector D1 o toca cualquier componente del plano.
          </p>
        </div>
        <div class="pill-row">
          <button type="button" class="seg-btn is-active" id="diag-lab-sw">Interruptor S1: CERRADO</button>
          <button type="button" class="seg-btn is-active" id="diag-lab-d">Diodo D1: DIRECTO</button>
        </div>
      </div>

      <div class="svg-stage">
        <svg viewBox="0 0 680 235" aria-label="Diagrama esquemático interactivo completo">
          <!-- Lazo de circuito -->
          <rect x="88" y="42" width="504" height="145" rx="12" fill="none" stroke="#475569" stroke-width="5"/>
          <rect id="diag-lab-flow" class="electron-flow" x="88" y="42" width="504" height="145" rx="12" fill="none" stroke="#38bdf8" stroke-width="3"/>

          <!-- Fuente 5V -->
          <g class="diag-clickable" data-lab-part="fuente" transform="translate(56, 82)">
            <rect x="0" y="0" width="64" height="68" rx="8" fill="#181818" stroke="#00c2b5" stroke-width="2"/>
            <line x1="16" y1="24" x2="48" y2="24" stroke="#ef4444" stroke-width="4"/>
            <line x1="22" y1="36" x2="42" y2="36" stroke="#cbd5e1" stroke-width="3.5"/>
            <text x="32" y="57" text-anchor="middle" fill="#fff" font-family="monospace" font-size="11" font-weight="bold">5 V DC</text>
          </g>

          <!-- Interruptor S1 -->
          <g class="diag-clickable" data-lab-part="s1" transform="translate(178, 18)">
            <rect x="0" y="6" width="88" height="38" rx="6" fill="#181818"/>
            <circle cx="16" cy="24" r="5" fill="#00c2b5"/>
            <circle cx="72" cy="24" r="5" fill="#00c2b5"/>
            <line id="diag-lab-blade" x1="16" y1="24" x2="72" y2="24" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
            <text x="44" y="56" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="11" font-weight="bold">S1</text>
          </g>

          <!-- Resistencia R1 -->
          <g class="diag-clickable" data-lab-part="r1" transform="translate(332, 16)">
            <rect x="0" y="8" width="106" height="36" rx="6" fill="#181818"/>
            <path d="M4 26 L18 26 L25 14 L35 38 L45 14 L55 38 L65 14 L75 38 L83 26 L102 26" fill="none" stroke="#dec8a0" stroke-width="3.5"/>
            <text x="53" y="58" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11" font-weight="bold">R1 · 220 Ω</text>
          </g>

          <!-- Diodo D1 -->
          <g class="diag-clickable" data-lab-part="d1" transform="translate(556, 82)">
            <rect x="-12" y="-4" width="88" height="72" rx="8" fill="#181818"/>
            <g id="diag-lab-diode-gfx"></g>
            <text x="32" y="60" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="11" font-weight="bold">D1 (1N4007)</text>
          </g>

          <!-- LED1 en rama inferior -->
          <g class="diag-clickable" data-lab-part="led1" transform="translate(320, 160)">
            <rect x="0" y="0" width="90" height="54" rx="8" fill="#181818"/>
            <circle id="diag-lab-led-glow" cx="45" cy="27" r="24" fill="#ef4444" opacity="0.45"/>
            <polygon points="24,14 24,40 50,27" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
            <line x1="52" y1="14" x2="52" y2="40" stroke="#fff" stroke-width="3.5"/>
            <text x="45" y="62" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="11" font-weight="bold">LED1</text>
          </g>

          <!-- Símbolo GND -->
          <g class="diag-clickable" data-lab-part="gnd" transform="translate(174, 187)">
            <line x1="20" y1="0" x2="20" y2="16" stroke="#94a3b8" stroke-width="3"/>
            <line x1="6" y1="16" x2="34" y2="16" stroke="#fff" stroke-width="3"/>
            <line x1="11" y1="22" x2="29" y2="22" stroke="#fff" stroke-width="3"/>
            <line x1="16" y1="28" x2="24" y2="28" stroke="#fff" stroke-width="3"/>
            <text x="46" y="23" fill="#94a3b8" font-family="monospace" font-size="11">GND (0 V)</text>
          </g>
        </svg>
      </div>

      <div id="diag-lab-banner" class="status-banner is-ok">${labFocusText}</div>
    </div>
  `;

  const renderSym = () => {
    const def = SYMBOLS.find((s) => s.id === activeId) ?? SYMBOLS[0];
    const tCard = document.getElementById('diag-theory-card')!;
    const aCard = document.getElementById('diag-anim-card')!;
    tCard.innerHTML = `
      <h3>${def.title}</h3>
      <div class="svg-stage is-light">${def.theorySvg}</div>
      <div class="diag-meta-box">
        <div><strong>Terminales:</strong> ${def.pins}</div>
        <div><strong>Cómo funciona:</strong> ${def.theory}</div>
      </div>
      <div class="rule-card is-good" style="margin-top:auto">
        <strong>En el taller con Arduino</strong>
        ${def.arduinoTip}
      </div>
    `;

    const anim = def.renderAnim(altMode, potPct);
    aCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <h3>Comportamiento animado</h3>
        ${
          def.id === 'pot'
            ? `<span style="font-family:var(--mono);font-size:.78rem;color:var(--accent-ink);font-weight:700">${potPct}%</span>`
            : `<button type="button" class="seg-btn is-active" id="diag-anim-action">${def.actionLabel}</button>`
        }
      </div>
      ${
        def.id === 'pot'
          ? `<div class="ctrl-group"><input id="diag-pot-slider" type="range" min="0" max="100" value="${potPct}" /></div>`
          : ''
      }
      <div class="svg-stage">${anim.svg}</div>
      <div class="status-banner is-ok">${anim.status}</div>
    `;

    document.getElementById('diag-anim-action')?.addEventListener('click', () => {
      altMode = !altMode;
      renderSym();
    });
    document.getElementById('diag-pot-slider')?.addEventListener('input', (e) => {
      potPct = Number((e.target as HTMLInputElement).value);
      renderSym();
    });
  };

  const renderLab = () => {
    const flow = document.getElementById('diag-lab-flow') as HTMLElement;
    const blade = document.getElementById('diag-lab-blade')!;
    const diodeGfx = document.getElementById('diag-lab-diode-gfx')!;
    const ledGlow = document.getElementById('diag-lab-led-glow')!;
    const banner = document.getElementById('diag-lab-banner')!;

    const conducting = labSwitchClosed && labDiodeForward;
    blade.setAttribute('y2', labSwitchClosed ? '24' : '8');
    diodeGfx.innerHTML = labDiodeForward
      ? `<polygon points="16,12 48,12 32,40" fill="#22c55e"/><line x1="16" y1="42" x2="48" y2="42" stroke="#fff" stroke-width="4"/>`
      : `<line x1="16" y1="12" x2="48" y2="12" stroke="#ef4444" stroke-width="4"/><polygon points="16,42 48,42 32,14" fill="#64748b"/>`;

    flow.classList.toggle('is-stopped', !conducting);
    flow.style.setProperty('--flow-speed', '0.85s');
    ledGlow.setAttribute('opacity', conducting ? '0.68' : '0');

    const swBtn = document.getElementById('diag-lab-sw')!;
    const dBtn = document.getElementById('diag-lab-d')!;
    swBtn.textContent = `Interruptor S1: ${labSwitchClosed ? 'CERRADO' : 'ABIERTO'}`;
    swBtn.classList.toggle('is-active', labSwitchClosed);
    dBtn.textContent = `Diodo D1: ${labDiodeForward ? 'DIRECTO' : 'INVERTIDO'}`;
    dBtn.classList.toggle('is-active', labDiodeForward);

    if (!labSwitchClosed) {
      banner.className = 'status-banner is-warn';
      banner.textContent = `Circuito abierto en S1 → 0 mA. Cierra el interruptor para completar la malla.`;
    } else if (!labDiodeForward) {
      banner.className = 'status-banner is-bad';
      banner.textContent = `El diodo D1 está en polarización inversa → bloquea la corriente y LED1 no enciende.`;
    } else {
      banner.className = 'status-banner is-ok';
      banner.textContent = `¡Circuito activo (~10 mA)! ${labFocusText}`;
    }
  };

  root.querySelectorAll<HTMLButtonElement>('[data-diag-sym]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-diag-sym]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeId = btn.dataset.diagSym as SymId;
      altMode = false;
      renderSym();
    });
  });

  document.getElementById('diag-lab-sw')?.addEventListener('click', () => {
    labSwitchClosed = !labSwitchClosed;
    renderLab();
  });
  document.getElementById('diag-lab-d')?.addEventListener('click', () => {
    labDiodeForward = !labDiodeForward;
    renderLab();
  });

  const PART_TIPS: Record<string, string> = {
    fuente: 'Fuente DC 5 V: suministra la presión eléctrica entre el terminal positivo y GND.',
    s1: 'Interruptor S1: permite abrir o cerrar manualmente el lazo de corriente.',
    r1: 'Resistencia R1 (220 Ω): limita los miliamperios para proteger tanto a D1 como a LED1.',
    d1: 'Diodo D1: asegura que la corriente solo viaje en sentido horario (protección contra inversión de pila).',
    led1: 'LED1: convierte parte de la energía en luz roja cuando recibe corriente directa segura.',
    gnd: 'GND (0 V): cierra el circuito devolviendo los electrones hacia la fuente.',
  };
  root.querySelectorAll<SVGElement>('[data-lab-part]').forEach((el) => {
    el.addEventListener('click', () => {
      labFocusText = PART_TIPS[el.dataset.labPart ?? ''] ?? labFocusText;
      renderLab();
    });
  });

  renderSym();
  renderLab();
}

/* =========================================================================
 * MÓDULO 4: Circuitos en Serie vs. Paralelo interactivos
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
            <rect x="18" y="78" width="54" height="48" rx="8" fill="#0f172a" stroke="#00c2b5" stroke-width="2" />
            <text x="45" y="107" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

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

            <rect x="18" y="78" width="54" height="48" rx="8" fill="#0f172a" stroke="#00c2b5" stroke-width="2" />
            <text x="45" y="107" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

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

  const SIGNAL_PALETTE = ['#16a34a', '#00c2b5', '#9333ea', '#0d9488', '#db2777', '#ca8a04'];
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
      return `<text x="50" y="${y}" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>
              <text x="568" y="${y}" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>`;
    }),
    ...['f', 'g', 'h', 'i', 'j'].map((ch, r) => {
      const y = 224 + r * 20 + 3.5;
      return `<text x="50" y="${y}" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>
              <text x="568" y="${y}" text-anchor="middle" fill="#151515" font-family="monospace" font-size="11" font-weight="bold">${ch}</text>`;
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
          <rect id="bb-xray-bar" x="0" y="0" width="0" height="0" rx="6" fill="#00c2b5" opacity="0.28" pointer-events="none" />

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
      el.setAttribute('stroke', isPending ? '#00c2b5' : 'none');
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
 * MÓDULO 5: Pinout Visual de Referencia (Arduino Uno R3, ESP32 y Shield 30P)
 * ========================================================================= */
function mountModPinouts(): void {
  const root = document.getElementById('root-mod-pinouts')!;
  let activeBoard: PinoutBoardTab = 'uno';
  let activeFilter: 'all' | TagKind = 'all';
  let selectedPinId = 'uno_d13';

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div class="pill-row">
        <button type="button" class="seg-btn is-active" data-po-board="uno">Arduino Uno R3 (5 V)</button>
        <button type="button" class="seg-btn" data-po-board="esp32">ESP32 DevKit V1 (30 pines)</button>
        <button type="button" class="seg-btn" data-po-board="esp32_shield">ESP32 + Shield de Pruebas</button>
      </div>
      <div class="pill-row" id="po-filters">
        <button type="button" class="seg-btn is-active" data-po-cat="all">Todos</button>
        <button type="button" class="seg-btn" data-po-cat="power">Power</button>
        <button type="button" class="seg-btn" data-po-cat="arduino">GPIO</button>
        <button type="button" class="seg-btn" data-po-cat="pwm">PWM ~</button>
        <button type="button" class="seg-btn" data-po-cat="adc">ADC</button>
        <button type="button" class="seg-btn" data-po-cat="comm">I²C / SPI / UART</button>
        <button type="button" class="seg-btn" data-po-cat="int">INT / Touch</button>
      </div>
    </div>

    <div class="pinout-sheet">
      <div class="pinout-scroll-wrap" id="po-svg-host"></div>
    </div>

    <div class="pinout-inspector-bar" id="po-inspector">
      <div class="poi-main">
        <div class="poi-tags" id="po-pin-tags"></div>
        <h3 class="poi-title" id="po-pin-name">—</h3>
        <p class="poi-desc" id="po-pin-desc"></p>
      </div>
      <div class="poi-meta">
        <div class="kpi-box"><span>Nivel lógico</span><strong id="po-pin-v">—</strong></div>
        <div class="kpi-box"><span>Código Arduino rápido</span><pre class="poi-code" id="po-pin-code">—</pre></div>
      </div>
    </div>
  `;

  const showPin = (row: PinoutRowSpec) => {
    selectedPinId = row.id;
    document.getElementById('po-pin-name')!.textContent = row.title;
    document.getElementById('po-pin-v')!.textContent = row.voltage;
    document.getElementById('po-pin-desc')!.textContent = row.description;
    document.getElementById('po-pin-code')!.textContent = row.codeExample;

    const tagsEl = document.getElementById('po-pin-tags')!;
    tagsEl.innerHTML = row.tags
      .map((t) => {
        const pal = TAG_PALETTE[t.kind];
        return `<span class="poi-pill" style="background:${pal.fill};color:${pal.text};border-color:${pal.stroke ?? pal.fill}">${t.text}</span>`;
      })
      .join('');
  };

  const renderPoster = () => {
    const host = document.getElementById('po-svg-host')!;
    const { svgHtml, defaultPin } = renderPinoutPosterSvg(activeBoard, selectedPinId, activeFilter);
    host.innerHTML = svgHtml;

    const currentRow = findPinoutRowById(selectedPinId) ?? defaultPin;
    showPin(currentRow);

    host.querySelectorAll<SVGGElement>('[data-pin-row]').forEach((el) => {
      const selectThisPin = () => {
        const id = el.dataset.pinRow;
        if (!id) return;
        const found = findPinoutRowById(id);
        if (!found) return;
        selectedPinId = found.id;
        renderPoster();
      };
      el.addEventListener('click', selectThisPin);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectThisPin();
        }
      });
    });

    host.querySelectorAll<SVGGElement>('[data-po-legend]').forEach((el) => {
      el.addEventListener('click', () => {
        const kind = el.dataset.poLegend as TagKind | undefined;
        if (!kind) return;
        activeFilter = activeFilter === kind ? 'all' : kind;
        root.querySelectorAll<HTMLButtonElement>('[data-po-cat]').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.poCat === activeFilter);
        });
        renderPoster();
      });
    });
  };

  root.querySelectorAll<HTMLButtonElement>('[data-po-board]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-po-board]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeBoard = btn.dataset.poBoard as PinoutBoardTab;
      selectedPinId = activeBoard === 'uno' ? 'uno_d13' : 'esp_g21';
      renderPoster();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-po-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-po-cat]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.poCat as typeof activeFilter;
      renderPoster();
    });
  });

  renderPoster();
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
            <polyline id="pu-scope-line" fill="none" stroke="#00c2b5" stroke-width="3.5" stroke-linejoin="round" points="" />
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
        <text x="77" y="122" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="11">${mode === 'pullup' ? 'INPUT_PULLUP' : 'INPUT'}</text>

        <!-- Línea hacia botón -->
        <line x1="135" y1="105" x2="290" y2="105" stroke="#38bdf8" stroke-width="5" />
        <!-- Pulsador -->
        <circle cx="290" cy="105" r="5" fill="#fff" />
        <circle cx="355" cy="105" r="5" fill="#fff" />
        <line x1="290" y1="105" x2="355" y2="${swClosed ? '105' : '78'}" stroke="#00c2b5" stroke-width="5" stroke-linecap="round" />

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
          <line id="pwm-avg-line" x1="48" y1="82" x2="440" y2="82" stroke="#00c2b5" stroke-width="2.5" stroke-dasharray="6 4" />
          <text id="pwm-avg-txt" x="48" y="156" fill="#5ef2e6" font-family="monospace" font-size="12" font-weight="bold">Voltaje promedio percibido: 2.50 V</text>

          <!-- LED y Servo en vivo -->
          <g transform="translate(495, 52)">
            <circle id="pwm-led-halo" cx="0" cy="0" r="28" fill="#38bdf8" opacity="0.4" />
            <circle id="pwm-led-core" cx="0" cy="0" r="16" fill="#38bdf8" stroke="#fff" stroke-width="2" />
            <text x="0" y="32" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="10">LED PWM</text>
          </g>
          <g transform="translate(555, 118)">
            <circle cx="0" cy="0" r="28" fill="#1d4ed8" stroke="#5ef2e6" stroke-width="2" />
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
            <rect x="148" y="39" width="106" height="36" rx="10" fill="#991b1b" stroke="#00c2b5" stroke-width="2" />
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
              <rect x="115" y="16" width="190" height="44" rx="22" fill="#151515" />
              <text x="210" y="43" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="13" font-weight="bold">1. Encendido / Reset</text>
            </g>
            <line x1="210" y1="60" x2="210" y2="92" stroke="#151515" stroke-width="3" />
            <g id="fl-setup" class="flow-node">
              <rect x="85" y="92" width="250" height="54" rx="10" fill="#2563eb" />
              <text x="210" y="116" text-anchor="middle" fill="#fff" font-family="monospace" font-size="14" font-weight="bold">2. setup() — 1 sola vez</text>
              <text x="210" y="135" text-anchor="middle" fill="#dbeafe" font-family="monospace" font-size="11">Configura pines y Serial</text>
            </g>
            <line x1="210" y1="146" x2="210" y2="180" stroke="#151515" stroke-width="3" />
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
mountModDiagramas();
mountModSerieParalelo();
mountModProtoboard();
mountModPinouts();
mountModPullUp();
mountModPwm();
mountModCodigo();

// Glassy Navbar V10 pill + Glassy Sidebar V10 rail + Scroll reveals + Preloader
const clasesNav = document.getElementById('clases-main-nav');
const clasesNavPill = document.getElementById('clases-nav-pill') as HTMLElement | null;
if (clasesNav && clasesNavPill) {
  const links = Array.from(clasesNav.querySelectorAll<HTMLAnchorElement>('a[data-nav-section]'));
  let activeLink: HTMLAnchorElement | null = links[0] ?? null;
  const movePill = (el: HTMLElement | null) => {
    if (!el || clasesNav.offsetParent === null) {
      clasesNavPill.classList.remove('is-visible');
      return;
    }
    const rN = clasesNav.getBoundingClientRect();
    const rE = el.getBoundingClientRect();
    clasesNavPill.style.width = `${rE.width}px`;
    clasesNavPill.style.transform = `translate3d(${rE.left - rN.left}px, 0, 0)`;
    clasesNavPill.classList.add('is-visible');
  };
  links.forEach((l) => {
    l.addEventListener('mouseenter', () => movePill(l));
    l.addEventListener('focus', () => movePill(l));
  });
  clasesNav.addEventListener('mouseleave', () => movePill(activeLink));
  window.addEventListener('resize', () => movePill(activeLink));

  const rail = document.getElementById('clases-glass-rail');
  const railToggle = document.getElementById('clases-rail-toggle');
  const railItems = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-rail-section]'));
  railToggle?.addEventListener('click', () => {
    if (!rail) return;
    const expanded = rail.classList.toggle('is-expanded');
    railToggle.setAttribute('aria-expanded', String(expanded));
  });

  if ('IntersectionObserver' in window) {
    const modObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.id;
            const match = links.find((a) => a.dataset.navSection === id);
            if (match) {
              activeLink = match;
              links.forEach((a) => a.classList.toggle('is-nav-active', a === match));
              movePill(activeLink);
            }
            railItems.forEach((r) => r.classList.toggle('is-active', r.dataset.railSection === id));
          }
        }
      },
      { rootMargin: '-32% 0px -55% 0px', threshold: 0.04 }
    );
    document.querySelectorAll<HTMLElement>('section.class-module[id]').forEach((sec) => modObs.observe(sec));
  }
  requestAnimationFrame(() => movePill(activeLink));
}

const revealCards = document.querySelectorAll<HTMLElement>('.concept-def-card, .viz-card, .prog-block-wrap, .diag-lab-wrap');
revealCards.forEach((el) => el.classList.add('reveal-up'));
if ('IntersectionObserver' in window) {
  const ro = new IntersectionObserver(
    (entries, observer) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          observer.unobserve(e.target);
        }
      }
    },
    { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
  );
  revealCards.forEach((el) => ro.observe(el));
} else {
  revealCards.forEach((el) => el.classList.add('is-in'));
}

const clasesMobBtn = document.getElementById('clases-mob-toggle') as HTMLButtonElement | null;
const clasesMobDrawer = document.getElementById('clases-mob-drawer') as HTMLElement | null;
if (clasesMobBtn && clasesMobDrawer) {
  const closeDrawer = () => {
    clasesMobDrawer.hidden = true;
    clasesMobBtn.setAttribute('aria-expanded', 'false');
  };
  clasesMobBtn.addEventListener('click', () => {
    const open = clasesMobDrawer.hidden;
    clasesMobDrawer.hidden = !open;
    clasesMobBtn.setAttribute('aria-expanded', String(open));
  });
  clasesMobDrawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !clasesMobDrawer.hidden) closeDrawer();
  });
}

document.getElementById('clases-lofi-btn')?.addEventListener('click', () => lofi.toggle());
document.getElementById('clases-lofi-prev')?.addEventListener('click', () => lofi.prev());
document.getElementById('clases-lofi-next')?.addEventListener('click', () => lofi.next());
document.getElementById('clases-lofi-pause')?.addEventListener('click', () => {
  const st = lofi.getState();
  if (st.playing) lofi.pause();
  else lofi.resume();
});

lofi.subscribe((st) => {
  const active = st.playing || st.paused;
  const cBtn = document.getElementById('clases-lofi-btn');
  const cCtrls = document.getElementById('clases-lofi-controls');
  const cPauseSlot = document.querySelector('#clases-lofi-pause .icon-slot');
  if (cBtn) {
    cBtn.classList.toggle('is-playing', st.playing);
    cBtn.classList.toggle('is-paused', st.paused);
    cBtn.setAttribute('aria-pressed', String(st.playing));
    cBtn.title = active ? `${st.trackTitle} (${st.trackIndex + 1}/${st.totalTracks})` : 'Activar música ambiental Lofi aleatoria';
  }
  if (cCtrls) cCtrls.hidden = !active;
  if (cPauseSlot) setSlotIcon(cPauseSlot, st.playing ? 'pause' : 'play');
});
lofi.restoreFromSession();

requestAnimationFrame(() => requestAnimationFrame(() => runPreloaderFinish()));
window.setTimeout(runPreloaderFinish, 1400);
