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
            <!-- Cable base -->
            <rect x="65" y="45" width="430" height="180" rx="18" fill="none" stroke="#334155" stroke-width="10" />
            <!-- Flujo animado de corriente -->
            <rect id="el-flow-line" class="electron-flow" x="65" y="45" width="430" height="180" rx="18"
              fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />

            <!-- Batería / Fuente V -->
            <g transform="translate(24, 92)">
              <rect x="0" y="0" width="82" height="86" rx="10" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5" />
              <text x="41" y="28" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="13" font-weight="bold">FUENTE</text>
              <text id="el-svg-v" x="41" y="54" text-anchor="middle" fill="#fff" font-family="monospace" font-size="20" font-weight="bold">5.0 V</text>
              <text x="41" y="74" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">Presión (V)</text>
            </g>

            <!-- Resistencia (cuello de botella variable) -->
            <g transform="translate(215, 22)">
              <rect x="0" y="0" width="130" height="46" rx="10" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="el-res-neck" x="14" y="15" width="102" height="16" rx="4" fill="#991b1b" opacity="0.55" />
              <text id="el-svg-r" x="65" y="28" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="13" font-weight="bold">330 Ω</text>
            </g>

            <!-- Carga luminosa -->
            <g transform="translate(460, 102)">
              <circle id="el-bulb-glow" cx="35" cy="34" r="38" fill="#facc15" opacity="0.3" />
              <circle id="el-bulb-core" cx="35" cy="34" r="22" fill="#facc15" stroke="#fff" stroke-width="2" />
              <text x="35" y="76" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">CARGA</text>
            </g>

            <!-- Flecha de corriente -->
            <text id="el-svg-i" x="280" y="205" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="15" font-weight="bold">
              Corriente I = 15.2 mA
            </text>
          </svg>
        </div>
      </div>

      <div class="viz-card">
        <h3>Ajusta la fuente y el freno</h3>
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

        <div class="mini-rules" style="margin-top:0">
          <div class="rule-card is-good">
            <strong>Analogía del agua</strong>
            El <b>Voltaje</b> es la presión de la bomba, la <b>Corriente</b> es el caudal por la tubería y la <b>Resistencia</b> es una válvula que estrecha el paso.
          </div>
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
 * MÓDULO 2: Ley de Ohm interactiva + Laboratorio LED con bandas IEC
 * ========================================================================= */
type LedKey = 'red' | 'yellow' | 'green' | 'blue';

function mountModOhm(): void {
  const root = document.getElementById('root-mod-ohm')!;
  let triangleFocus: 'V' | 'I' | 'R' = 'I';
  let sourceV = 5;
  let ledKey: LedKey = 'red';
  let ohms = 220;

  const LED_META: Record<LedKey, { name: string; vf: number; color: string }> = {
    red: { name: 'Rojo (2.0 V)', vf: 2.0, color: '#ef4444' },
    yellow: { name: 'Amarillo (2.1 V)', vf: 2.1, color: '#facc15' },
    green: { name: 'Verde (2.2 V)', vf: 2.2, color: '#22c55e' },
    blue: { name: 'Azul / Blanco (3.2 V)', vf: 3.2, color: '#3b82f6' },
  };

  root.innerHTML = `
    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Triángulo interactivo (toca una letra)</h3>
        <div class="svg-stage is-light">
          <svg viewBox="0 0 380 260" aria-label="Triángulo de la Ley de Ohm interactivo">
            <polygon points="190,22 340,235 40,235" fill="#f5efe2" stroke="#0b1c3d" stroke-width="4" stroke-linejoin="round" />
            <line x1="115" y1="130" x2="265" y2="130" stroke="#0b1c3d" stroke-width="3" />
            <line x1="190" y1="130" x2="190" y2="235" stroke="#0b1c3d" stroke-width="3" />

            <g id="tri-V" class="ohm-tri-btn">
              <circle cx="190" cy="84" r="30" fill="#0b1c3d" />
              <text x="190" y="93" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="26" font-weight="bold">V</text>
            </g>
            <g id="tri-I" class="ohm-tri-btn">
              <circle cx="136" cy="186" r="28" fill="#2563eb" />
              <text x="136" y="195" text-anchor="middle" fill="#fff" font-family="monospace" font-size="26" font-weight="bold">I</text>
            </g>
            <g id="tri-R" class="ohm-tri-btn">
              <circle cx="244" cy="186" r="28" fill="#c8402f" />
              <text x="244" y="195" text-anchor="middle" fill="#fff" font-family="monospace" font-size="26" font-weight="bold">R</text>
            </g>
          </svg>
        </div>
        <div class="formula-pill" id="ohm-formula-pill">I = V / R  (Corriente en Amperios)</div>
        <p id="ohm-formula-desc" style="margin:0;font-size:.86rem;color:var(--ink-2)">
          Tapa la letra que deseas calcular: lo que queda arriba divide a lo de abajo.
        </p>
      </div>

      <div class="viz-card">
        <h3>Laboratorio de LED + Resistencia real</h3>
        <div class="ctrl-group">
          <span class="ctrl-label"><span>Fuente de alimentación</span></span>
          <div class="pill-row" id="ohm-src-pills">
            ${[3.3, 5, 9, 12].map((v) => `<button type="button" class="seg-btn ${v === 5 ? 'is-active' : ''}" data-src-v="${v}">${v} V</button>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <span class="ctrl-label"><span>Color del LED (Caída Vf)</span></span>
          <div class="pill-row" id="ohm-led-pills">
            ${Object.entries(LED_META).map(([k, info]) => `<button type="button" class="seg-btn ${k === 'red' ? 'is-active' : ''}" data-led-k="${k}">${info.name}</button>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <label class="ctrl-label" for="ohm-r-slider"><span>Resistencia en serie</span><span id="ohm-r-val">220 Ω</span></label>
          <input id="ohm-r-slider" type="range" min="47" max="2200" step="10" value="220" />
        </div>

        <div class="svg-stage">
          <svg viewBox="0 0 460 155" aria-label="Simulador de LED y código de colores de resistencia">
            <line x1="25" y1="78" x2="435" y2="78" stroke="#475569" stroke-width="5" />
            <line id="ohm-flow" class="electron-flow" x1="25" y1="78" x2="435" y2="78" stroke="#38bdf8" stroke-width="3" />

            <!-- Resistencia SVG con 4 bandas dinámicas -->
            <g transform="translate(88, 52)">
              <rect x="0" y="8" width="142" height="36" rx="16" fill="#dec8a0" stroke="#785500" stroke-width="2" />
              <rect id="ohm-b0" x="26" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b1" x="50" y="8" width="11" height="36" fill="#dc2626" />
              <rect id="ohm-b2" x="74" y="8" width="11" height="36" fill="#7c4318" />
              <rect id="ohm-b3" x="104" y="8" width="11" height="36" fill="#d4a007" />
              <text id="ohm-svg-res-lbl" x="71" y="64" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="12">220 Ω · ±5%</text>
            </g>

            <!-- LED animado -->
            <g transform="translate(320, 26)">
              <circle id="ohm-led-halo" cx="44" cy="48" r="44" fill="#ef4444" opacity="0.4" />
              <circle id="ohm-led-dome" cx="44" cy="48" r="24" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <text id="ohm-led-burn" x="44" y="56" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="28" font-weight="bold" opacity="0">✕</text>
              <text id="ohm-led-ma" x="44" y="102" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="12" font-weight="bold">13.6 mA</text>
            </g>
          </svg>
        </div>

        <div id="ohm-safety-banner" class="status-banner is-ok">Corriente segura (13.6 mA) — Brillo óptimo sin dañar el pin ni el LED.</div>
        <div id="ohm-rec-note" style="font-family:var(--mono);font-size:.76rem;color:var(--ink-3)"></div>
      </div>
    </div>
  `;

  const renderTriangle = () => {
    const formulaMap = {
      V: ['V = I × R  (Voltaje = Corriente × Resistencia)', 'Úsalo para saber qué voltaje cae en una resistencia cuando conoces la corriente.'],
      I: ['I = (V_fuente - V_LED) / R  (Corriente en Amperios)', 'Con esta fórmula calculas los mA que circulan por tu circuito antes de encenderlo.'],
      R: ['R = (V_fuente - V_LED) / I_deseada  (Resistencia mínima Ω)', 'Así eliges la resistencia ideal (ej. para 15 mA = 0.015 A en un LED).'],
    };
    document.getElementById('ohm-formula-pill')!.textContent = formulaMap[triangleFocus][0];
    document.getElementById('ohm-formula-desc')!.textContent = formulaMap[triangleFocus][1];
  };

  const updateLed = () => {
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
    document.getElementById('ohm-led-ma')!.textContent = `${ma.toFixed(1)} mA`;

    const flow = document.getElementById('ohm-flow') as HTMLElement;
    const halo = document.getElementById('ohm-led-halo')!;
    const dome = document.getElementById('ohm-led-dome')!;
    const burn = document.getElementById('ohm-led-burn')!;
    const banner = document.getElementById('ohm-safety-banner')!;

    if (vDrop <= 0.1) {
      flow.classList.add('is-stopped');
      halo.setAttribute('opacity', '0');
      dome.setAttribute('fill', '#475569');
      burn.setAttribute('opacity', '0');
      banner.className = 'status-banner is-warn';
      banner.textContent = `Voltaje insuficiente (${sourceV} V < ${meta.vf} V del LED). El LED no alcanza a encender.`;
    } else if (ma > 30) {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', '0.25s');
      halo.setAttribute('opacity', '0.15');
      dome.setAttribute('fill', '#27272a');
      burn.setAttribute('opacity', '1');
      banner.className = 'status-banner is-bad';
      banner.textContent = `¡LED QUEMADO! (${ma.toFixed(1)} mA > 30 mA). Sube la resistencia a ≥ ${recOhms} Ω.`;
    } else if (ma > 20) {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', '0.45s');
      halo.setAttribute('fill', meta.color);
      halo.setAttribute('opacity', '0.7');
      dome.setAttribute('fill', meta.color);
      burn.setAttribute('opacity', '0');
      banner.className = 'status-banner is-warn';
      banner.textContent = `Al límite del pin Arduino (${ma.toFixed(1)} mA). Conviene usar ≥ ${recOhms} Ω para trabajar bajo 20 mA.`;
    } else {
      flow.classList.remove('is-stopped');
      flow.style.setProperty('--flow-speed', `${Math.max(0.45, Math.min(2.6, 18 / Math.max(1, ma))).toFixed(2)}s`);
      halo.setAttribute('fill', meta.color);
      halo.setAttribute('opacity', String(Math.min(0.75, 0.15 + ma / 25)));
      dome.setAttribute('fill', meta.color);
      burn.setAttribute('opacity', '0');
      banner.className = 'status-banner is-ok';
      banner.textContent = `Corriente segura (${ma.toFixed(1)} mA) — Brillo óptimo y pin protegido.`;
    }

    document.getElementById('ohm-rec-note')!.textContent =
      `Fórmula aplicada: R_rec = (${sourceV} V - ${meta.vf} V) / 0.015 A ≈ ${recOhms} Ω`;
  };

  (['V', 'I', 'R'] as const).forEach((k) => {
    document.getElementById(`tri-${k}`)?.addEventListener('click', () => {
      triangleFocus = k;
      renderTriangle();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-src-v]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-src-v]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      sourceV = Number(btn.dataset.srcV);
      updateLed();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-led-k]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-led-k]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      ledKey = btn.dataset.ledK as typeof ledKey;
      updateLed();
    });
  });

  document.getElementById('ohm-r-slider')?.addEventListener('input', (e) => {
    ohms = Number((e.target as HTMLInputElement).value);
    updateLed();
  });

  renderTriangle();
  updateLed();
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
      <span style="font-family:var(--mono);font-size:.78rem;color:var(--navy);font-weight:700">Resistencias R1 y R2:</span>
      ${[220, 470, 1000].map((v) => `<button type="button" class="seg-btn ${v === 220 ? 'is-active' : ''}" data-sp-r="${v}">${formatOhms(v)}</button>`).join('')}
    </div>

    <div class="sp-compare-grid">
      <div class="viz-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3>Circuito en Serie (1 solo camino)</h3>
          <button type="button" class="seg-btn" id="btn-sp-series">Desconectar LED 1</button>
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 460 210" aria-label="Circuito animado en serie">
            <rect x="45" y="42" width="370" height="128" rx="14" fill="none" stroke="#334155" stroke-width="8" />
            <rect id="sp-ser-flow" class="electron-flow" x="45" y="42" width="370" height="128" rx="14"
              fill="none" stroke="#38bdf8" stroke-width="4" />
            <rect x="18" y="82" width="54" height="48" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2" />
            <text x="45" y="111" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

            <g transform="translate(155, 22)">
              <circle id="sp-ser-led1" cx="22" cy="20" r="18" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 1</text>
            </g>
            <g transform="translate(295, 22)">
              <circle id="sp-ser-led2" cx="22" cy="20" r="18" fill="#ef4444" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 2</text>
            </g>
            <text id="sp-ser-eq" x="230" y="196" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="12"></text>
          </svg>
        </div>
        <div id="sp-ser-msg" class="status-banner is-ok">Misma corriente en ambos LEDs; el voltaje se reparte entre ellos.</div>
      </div>

      <div class="viz-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3>Circuito en Paralelo (caminos independientes)</h3>
          <button type="button" class="seg-btn" id="btn-sp-par">Desconectar LED 1</button>
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 460 210" aria-label="Circuito animado en paralelo">
            <!-- Rama 1 -->
            <rect x="45" y="36" width="195" height="136" rx="12" fill="none" stroke="#334155" stroke-width="7" />
            <rect id="sp-par-flow1" class="electron-flow" x="45" y="36" width="195" height="136" rx="12"
              fill="none" stroke="#38bdf8" stroke-width="3.5" />
            <!-- Rama 2 -->
            <path d="M 240 36 L 395 36 Q 409 36 409 50 L 409 158 Q 409 172 395 172 L 240 172"
              fill="none" stroke="#334155" stroke-width="7" />
            <path id="sp-par-flow2" class="electron-flow" d="M 240 36 L 395 36 Q 409 36 409 50 L 409 158 Q 409 172 395 172 L 240 172"
              fill="none" stroke="#34d399" stroke-width="3.5" />

            <rect x="18" y="82" width="54" height="48" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2" />
            <text x="45" y="111" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="14" font-weight="bold">5 V</text>

            <g transform="translate(218, 84)">
              <circle id="sp-par-led1" cx="22" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 1</text>
            </g>
            <g transform="translate(387, 84)">
              <circle id="sp-par-led2" cx="22" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="2" />
              <text x="22" y="54" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11">LED 2</text>
            </g>
            <text id="sp-par-eq" x="230" y="196" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="12"></text>
          </svg>
        </div>
        <div id="sp-par-msg" class="status-banner is-ok">Ambos reciben 5 V completos; si falla uno, el otro sigue funcionando.</div>
      </div>
    </div>
  `;

  const render = () => {
    const reqSer = rVal * 2;
    const reqPar = rVal / 2;
    document.getElementById('sp-ser-eq')!.textContent = `R_eq = R1 + R2 = ${formatOhms(reqSer)} · I_T = ${seriesOpen ? '0.0' : ((5 / reqSer) * 1000).toFixed(1)} mA`;
    document.getElementById('sp-par-eq')!.textContent = `R_eq = (R1×R2)/(R1+R2) = ${formatOhms(reqPar)} · V1 = V2 = 5 V`;

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
 * MÓDULO 4: Rayos X interactivos de la Protoboard
 * ========================================================================= */
function mountModProtoboard(): void {
  const root = document.getElementById('root-mod-protoboard')!;
  const cols = 16;

  let holesSvg = '';
  for (let c = 1; c <= cols; c++) {
    const x = 68 + (c - 1) * 32;
    // Rieles superior +/-
    holesSvg += `<circle class="bb-hole-dot" data-bb-zone="top-plus" cx="${x}" cy="34" r="5" fill="#1e293b" />`;
    holesSvg += `<circle class="bb-hole-dot" data-bb-zone="top-minus" cx="${x}" cy="58" r="5" fill="#1e293b" />`;
    // Zona a-e
    for (let r = 0; r < 5; r++) {
      const y = 96 + r * 20;
      holesSvg += `<circle class="bb-hole-dot" data-bb-zone="col-top-${c}" cx="${x}" cy="${y}" r="5" fill="#1e293b" />`;
    }
    // Zona f-j
    for (let r = 0; r < 5; r++) {
      const y = 216 + r * 20;
      holesSvg += `<circle class="bb-hole-dot" data-bb-zone="col-bot-${c}" cx="${x}" cy="${y}" r="5" fill="#1e293b" />`;
    }
  }

  root.innerHTML = `
    <div class="viz-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3>Toca o pasa el cursor sobre cualquier perforación</h3>
        <span id="bb-xray-info" class="formula-pill" style="font-size:.82rem;padding:6px 12px">
          Pasa sobre un orificio para revelar la pista metálica oculta
        </span>
      </div>

      <div class="svg-stage is-light">
        <svg viewBox="0 0 600 330" aria-label="Diagrama Rayos X de protoboard">
          <rect x="20" y="14" width="560" height="302" rx="14" fill="#f4f1e8" stroke="#c7bfae" stroke-width="3" />
          <line x1="48" y1="24" x2="562" y2="24" stroke="#c8402f" stroke-width="2.5" />
          <line x1="48" y1="70" x2="562" y2="70" stroke="#2563eb" stroke-width="2.5" />
          <text x="34" y="38" fill="#c8402f" font-family="monospace" font-weight="bold" font-size="16">+</text>
          <text x="35" y="62" fill="#2563eb" font-family="monospace" font-weight="bold" font-size="18">-</text>

          <!-- Canal central DIP -->
          <rect x="44" y="188" width="520" height="16" rx="4" fill="#ded9cc" />
          <text x="304" y="200" text-anchor="middle" fill="#6b6456" font-family="monospace" font-size="10">CANAL CENTRAL AISLADO (para chips y pulsadores)</text>

          <!-- Barra de cobre iluminada bajo demanda -->
          <rect id="bb-xray-bar" x="0" y="0" width="0" height="0" rx="6" fill="#f59e0b" opacity="0.35" />

          ${holesSvg}
        </svg>
      </div>

      <div class="mini-rules">
        <div class="rule-card is-good"><strong>✓ Conecta entre columnas</strong>Cada pata de una resistencia o LED va en una columna distinta (ej. col. 8 y col. 12).</div>
        <div class="rule-card is-good"><strong>✓ Cruza el canal central</strong>El canal divide a–e de f–j: ideal para chips DIP y pulsadores sin cortocircuito.</div>
        <div class="rule-card is-bad"><strong>✗ Error típico</strong>Poner las dos patas de un LED en la misma columna une á+ y k- en el mismo cobre y no enciende.</div>
      </div>
    </div>
  `;

  const bar = document.getElementById('bb-xray-bar')!;
  const info = document.getElementById('bb-xray-info')!;

  root.querySelectorAll<SVGCircleElement>('[data-bb-zone]').forEach((dot) => {
    const reveal = () => {
      const zone = dot.dataset.bbZone!;
      const cx = Number(dot.getAttribute('cx'));
      if (zone === 'top-plus') {
        bar.setAttribute('x', '56');
        bar.setAttribute('y', '26');
        bar.setAttribute('width', '504');
        bar.setAttribute('height', '16');
        info.textContent = 'Riel (+) superior: toda la fila roja comparte +5 V o +3.3 V horizontalmente.';
      } else if (zone === 'top-minus') {
        bar.setAttribute('x', '56');
        bar.setAttribute('y', '50');
        bar.setAttribute('width', '504');
        bar.setAttribute('height', '16');
        info.textContent = 'Riel (-) azul: toda la fila comparte Tierra (GND) horizontalmente.';
      } else if (zone.startsWith('col-top-')) {
        const col = zone.replace('col-top-', '');
        bar.setAttribute('x', String(cx - 9));
        bar.setAttribute('y', '86');
        bar.setAttribute('width', '18');
        bar.setAttribute('height', '98');
        info.textContent = `Columna ${col} superior (a${col}–e${col}): 5 orificios unidos verticalmente.`;
      } else if (zone.startsWith('col-bot-')) {
        const col = zone.replace('col-bot-', '');
        bar.setAttribute('x', String(cx - 9));
        bar.setAttribute('y', '206');
        bar.setAttribute('width', '18');
        bar.setAttribute('height', '98');
        info.textContent = `Columna ${col} inferior (f${col}–j${col}): 5 orificios unidos verticalmente (aislados de a–e).`;
      }
    };
    dot.addEventListener('mouseenter', reveal);
    dot.addEventListener('click', reveal);
  });
}

/* =========================================================================
 * MÓDULO 5: Pinout Visual Interactivo (Arduino Uno R3 & ESP32 DevKit V1)
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
    ctl: '#d97706',
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
        <div class="formula-pill" id="po-pin-name">Toca un pin en el diagrama</div>
        <div class="kpi-trio">
          <div class="kpi-box"><span>Categoría</span><strong id="po-pin-cat">—</strong></div>
          <div class="kpi-box"><span>Voltaje</span><strong id="po-pin-v">—</strong></div>
          <div class="kpi-box"><span>Extra</span><strong id="po-pin-extra">—</strong></div>
        </div>
        <p id="po-pin-desc" style="margin:0;color:var(--ink-2)">
          Haz clic sobre cualquier círculo de color para ver para qué sirve y qué sensores puedes conectar sin riesgo.
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

    // Ordenar pines arriba (z < 0) y abajo (z > 0)
    const topPins = spec.pins.filter((p) => p.localPos[2] < 0);
    const botPins = spec.pins.filter((p) => p.localPos[2] > 0);
    const maxLen = Math.max(topPins.length, botPins.length);
    const svgW = 640;
    const svgH = 290;

    const drawRow = (pins: PinDef[], y: number, labelY: number) =>
      pins
        .map((p, idx) => {
          const x = 90 + (idx * (svgW - 140)) / Math.max(1, pins.length - 1);
          const match = activeCat === 'all' || p.category === activeCat;
          const color = CAT_COLORS[p.category];
          return `
            <g class="pinout-dot" data-pin-id="${p.id}" opacity="${match ? 1 : 0.22}">
              <circle cx="${x}" cy="${y}" r="9" fill="${color}" stroke="#0f172a" stroke-width="2" />
              <text x="${x}" y="${labelY}" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="9.5" font-weight="bold">
                ${p.id.replace('_TOP', '').replace('_1', '').replace('_2', '')}
              </text>
            </g>
          `;
        })
        .join('');

    const pcbColor = activeBoard === 'uno' ? '#00828a' : '#1e242e';
    host.innerHTML = `
      <svg viewBox="0 0 ${svgW} ${svgH}" aria-label="Pinout interactivo de ${spec.name}">
        <!-- PCB -->
        <rect x="52" y="48" width="${svgW - 88}" height="194" rx="12" fill="${pcbColor}" stroke="#f6c101" stroke-width="2" />
        <!-- USB -->
        <rect x="26" y="106" width="44" height="78" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
        <text x="${svgW / 2 + 12}" y="148" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold">
          ${spec.name.toUpperCase()}
        </text>
        <text x="${svgW / 2 + 12}" y="170" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="12">
          LÓGICA ${spec.logicVoltage} V · ${maxLen} pines por fila
        </text>
        ${drawRow(topPins, 62, 34)}
        ${drawRow(botPins, 228, 260)}
      </svg>
    `;

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
 * MÓDULO 6: 5 Diagramas Esenciales Animados + Osciloscopio PWM
 * ========================================================================= */
type DiagTab = 'led' | 'button' | 'pot' | 'i2c' | 'pwm';

function mountModDiagramas(): void {
  const root = document.getElementById('root-mod-diagramas')!;
  let tab: DiagTab = 'led';
  let btnPressed = false;
  let duty = 50;

  const TABS: Array<{ id: DiagTab; label: string }> = [
    { id: 'led', label: '1. LED + 220 Ω' },
    { id: 'button', label: '2. Pulsador PULLUP' },
    { id: 'pot', label: '3. Sensor Analógico' },
    { id: 'i2c', label: '4. I²C + Level Shifter' },
    { id: 'pwm', label: '5. Onda PWM + Servo' },
  ];

  root.innerHTML = `
    <div class="pill-row" style="margin-bottom:16px" id="diag-tabs">
      ${TABS.map((t, i) => `<button type="button" class="seg-btn ${i === 0 ? 'is-active' : ''}" data-diag-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="viz-card" id="diag-stage"></div>
  `;

  const render = () => {
    const stage = document.getElementById('diag-stage')!;
    if (tab === 'led') {
      stage.innerHTML = `
        <h3>Salida Digital: Pin D13 → Resistencia 220 Ω → LED → GND</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 600 180">
            <rect x="24" y="45" width="120" height="90" rx="10" fill="#00828a" />
            <text x="84" y="88" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">UNO D13</text>
            <text x="84" y="112" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11">GND</text>
            <path d="M 144 82 L 480 82 L 480 112 L 144 112" fill="none" stroke="#334155" stroke-width="6" />
            <path class="electron-flow" d="M 144 82 L 480 82 L 480 112 L 144 112" fill="none" stroke="#38bdf8" stroke-width="3" />
            <rect x="215" y="68" width="90" height="28" rx="10" fill="#dec8a0" />
            <text x="260" y="86" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="12" font-weight="bold">220 Ω</text>
            <circle cx="410" cy="82" r="20" fill="#ef4444" stroke="#fff" stroke-width="2" />
            <text x="410" y="52" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="11">Ánodo (+) → Cátodo (-)</text>
          </svg>
        </div>
        <p style="margin:0;color:var(--ink-2)">La pata larga (ánodo +) recibe la señal tras la resistencia; la pata corta (cátodo -, borde plano) vuelve a GND.</p>
      `;
    } else if (tab === 'button') {
      stage.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h3>Entrada Digital con INPUT_PULLUP (sin resistencia externa)</h3>
          <button type="button" class="seg-btn ${btnPressed ? 'is-active' : ''}" id="diag-btn-test">
            ${btnPressed ? 'Soltar botón (actual: LOW)' : 'Mantener presionado'}
          </button>
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 600 180">
            <rect x="24" y="40" width="136" height="100" rx="10" fill="#00828a" />
            <text x="92" y="80" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">PIN D2</text>
            <text x="92" y="100" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="11">R_interna 20kΩ</text>
            <text x="92" y="122" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11">GND</text>
            <path d="M 160 76 L 340 76 M 410 76 L 470 76 L 470 122 L 160 122" fill="none" stroke="#334155" stroke-width="6" />
            <line x1="340" y1="76" x2="410" y2="${btnPressed ? '76' : '54'}" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" />
            <text x="375" y="158" text-anchor="middle" fill="${btnPressed ? '#4ade80' : '#93c5fd'}" font-family="monospace" font-size="14" font-weight="bold">
              digitalRead(2) devuelve: ${btnPressed ? 'LOW (0 V · Presionado)' : 'HIGH (5 V · Suelto)'}
            </text>
          </svg>
        </div>
        <p style="margin:0;color:var(--ink-2)">Usar <code>pinMode(2, INPUT_PULLUP)</code> activa una resistencia interna hacia 5 V: ahorra cables y evita lecturas flotantes.</p>
      `;
      document.getElementById('diag-btn-test')?.addEventListener('click', () => {
        btnPressed = !btnPressed;
        render();
      });
    } else if (tab === 'pot') {
      stage.innerHTML = `
        <h3>Entrada Analógica ADC (0–5 V → 0–1023)</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 600 180">
            <rect x="30" y="38" width="130" height="108" rx="10" fill="#00828a" />
            <text x="95" y="68" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="12">5V</text>
            <text x="95" y="96" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="13" font-weight="bold">A0 (ADC)</text>
            <text x="95" y="124" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="12">GND</text>
            <line x1="160" y1="64" x2="360" y2="64" stroke="#c8402f" stroke-width="5" />
            <line x1="160" y1="92" x2="360" y2="92" stroke="#22c55e" stroke-width="5" />
            <line x1="160" y1="120" x2="360" y2="120" stroke="#94a3b8" stroke-width="5" />
            <rect x="360" y="42" width="190" height="100" rx="12" fill="#1e3a5f" stroke="#fbbf24" stroke-width="2" />
            <text x="455" y="84" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">POT / LDR / CO₂</text>
            <text x="455" y="108" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="12">analogRead(A0) → 0..1023</text>
          </svg>
        </div>
        <p style="margin:0;color:var(--ink-2)">El terminal central entrega un voltaje continuo entre 0 V y 5 V que Arduino convierte en un número de 10 bits (0–1023).</p>
      `;
    } else if (tab === 'i2c') {
      stage.innerHTML = `
        <h3>Protección de Bus I²C: Arduino 5 V ↔ Level Shifter ↔ Sensor 3.3 V</h3>
        <div class="svg-stage">
          <svg viewBox="0 0 600 185">
            <rect x="20" y="40" width="130" height="105" rx="10" fill="#00828a" />
            <text x="85" y="75" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">UNO (5 V)</text>
            <text x="85" y="100" text-anchor="middle" fill="#93c5fd" font-family="monospace" font-size="11">A4 (SDA)</text>
            <text x="85" y="122" text-anchor="middle" fill="#d8b4fe" font-family="monospace" font-size="11">A5 (SCL)</text>

            <rect x="225" y="34" width="145" height="118" rx="10" fill="#991b1b" stroke="#fbbf24" stroke-width="2" />
            <text x="297" y="64" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold" font-size="12">LEVEL SHIFTER</text>
            <text x="297" y="92" text-anchor="middle" fill="#fef08a" font-family="monospace" font-size="11">HV (5V) ↔ LV (3.3V)</text>
            <text x="297" y="120" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="11">HV1/2 ↔ LV1/2</text>

            <rect x="440" y="40" width="140" height="105" rx="10" fill="#5b21b6" />
            <text x="510" y="75" text-anchor="middle" fill="#fff" font-family="monospace" font-weight="bold">BME280</text>
            <text x="510" y="102" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="11">Estrictamente 3.3 V</text>

            <line x1="150" y1="95" x2="225" y2="95" stroke="#3b82f6" stroke-width="4" />
            <line x1="150" y1="115" x2="225" y2="115" stroke="#a855f7" stroke-width="4" />
            <line x1="370" y1="95" x2="440" y2="95" stroke="#3b82f6" stroke-width="4" />
            <line x1="370" y1="115" x2="440" y2="115" stroke="#a855f7" stroke-width="4" />
          </svg>
        </div>
        <p style="margin:0;color:var(--ink-2)">Un ESP32 ya habla 3.3 V nativos y conecta directo; Arduino Uno (5 V) necesita el Level Shifter para no estresar el BME280/BMP280.</p>
      `;
    } else {
      // Osciloscopio PWM + Servo animado
      const highW = Math.round((duty / 100) * 90);
      const angle = Math.round((duty / 100) * 180);
      const pathD = [0, 1, 2, 3]
        .map((c) => {
          const x0 = 30 + c * 100;
          const x1 = x0 + Math.max(4, highW);
          const x2 = x0 + 100;
          return `M ${x0} 115 L ${x0} 45 L ${x1} 45 L ${x1} 115 L ${x2} 115`;
        })
        .join(' ');
      stage.innerHTML = `
        <div class="ctrl-group">
          <label class="ctrl-label" for="pwm-duty-slider">
            <span>Ciclo de trabajo PWM (analogWrite ${Math.round((duty / 100) * 255)})</span>
            <span>${duty}% · Servo ${angle}°</span>
          </label>
          <input id="pwm-duty-slider" type="range" min="0" max="100" step="5" value="${duty}" />
        </div>
        <div class="svg-stage">
          <svg viewBox="0 0 600 165">
            <text x="30" y="26" fill="#94a3b8" font-family="monospace" font-size="11">5 V (HIGH)</text>
            <text x="30" y="142" fill="#94a3b8" font-family="monospace" font-size="11">0 V (LOW)</text>
            <path d="${pathD}" fill="none" stroke="#22c55e" stroke-width="4" stroke-linejoin="round" />
            <!-- Servo indicador -->
            <g transform="translate(505, 85)">
              <circle cx="0" cy="0" r="46" fill="#1652c8" stroke="#fbbf24" stroke-width="2" />
              <g transform="rotate(${angle - 90})">
                <rect x="-7" y="-54" width="14" height="60" rx="7" fill="#f8fafc" />
                <circle cx="0" cy="0" r="9" fill="#94a3b8" />
              </g>
              <text x="0" y="64" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="12" font-weight="bold">${angle}°</text>
            </g>
          </svg>
        </div>
        <p style="margin:0;color:var(--ink-2)">PWM enciende y apaga el pin cientos de veces por segundo: mayor porcentaje encendido = más brillo en LEDs o mayor ángulo en servos.</p>
      `;
      document.getElementById('pwm-duty-slider')?.addEventListener('input', (e) => {
        duty = Number((e.target as HTMLInputElement).value);
        render();
      });
    }
  };

  root.querySelectorAll<HTMLButtonElement>('[data-diag-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-diag-tab]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      tab = btn.dataset.diagTab as typeof tab;
      render();
    });
  });

  render();
}

/* =========================================================================
 * MÓDULO 7: Flujo setup() -> loop() y funciones base
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

  root.innerHTML = `
    <div class="viz-grid-2">
      <div class="viz-card">
        <h3>Ciclo de vida animado del programa</h3>
        <div class="svg-stage is-light">
          <svg viewBox="0 0 420 270" aria-label="Diagrama de flujo setup y loop">
            <g id="fl-boot" class="flow-node">
              <rect x="115" y="16" width="190" height="44" rx="22" fill="#0b1c3d" />
              <text x="210" y="43" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="13" font-weight="bold">1. Encendido / Reset</text>
            </g>
            <line x1="210" y1="60" x2="210" y2="92" stroke="#0b1c3d" stroke-width="3" />
            <g id="fl-setup" class="flow-node">
              <rect x="85" y="92" width="250" height="54" rx="10" fill="#2563eb" />
              <text x="210" y="116" text-anchor="middle" fill="#fff" font-family="monospace" font-size="14" font-weight="bold">2. setup() — 1 sola vez</text>
              <text x="210" y="135" text-anchor="middle" fill="#dbeafe" font-family="monospace" font-size="11">Configura pines y Serial</text>
            </g>
            <line x1="210" y1="146" x2="210" y2="180" stroke="#0b1c3d" stroke-width="3" />
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
          <div class="cmd-card"><code>delay(ms)</code><span>Pausa en milisegundos (1000 = 1 s).</span></div>
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
        <a class="btn-primary" href="./index.html#mesa-trabajo" style="justify-content:center">
          Practicar en el Simulador 3D ahora →
        </a>
      </div>
    </div>
  `;

  let step = 0;
  const nodes = ['fl-boot', 'fl-setup', 'fl-loop'];
  window.setInterval(() => {
    nodes.forEach((id, idx) => document.getElementById(id)?.classList.toggle('is-lit', idx === step));
    step = step === 0 ? 1 : 2; // Tras pasar por boot->setup, gira en loop()
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
mountModDiagramas();
mountModCodigo();
