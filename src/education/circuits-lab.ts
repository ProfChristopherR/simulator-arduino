import { formatOhms, resistorBandsForOhms } from '../lab/components/catalog';

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

export interface MixedCircuitResult {
  r23: number;
  rEq: number;
  iTotalMa: number;
  vR1: number;
  vA: number;
  i2Ma: number;
  i3Ma: number;
}

export function solveMixedResistors(
  volts: number,
  r1: number,
  r2: number,
  r3: number
): MixedCircuitResult {
  const r23 = (r2 * r3) / (r2 + r3);
  const rEq = r1 + r23;
  const iTotalA = volts / rEq;
  const vR1 = iTotalA * r1;
  const vA = iTotalA * r23;
  const i2A = vA / r2;
  const i3A = vA / r3;
  return {
    r23,
    rEq,
    iTotalMa: iTotalA * 1000,
    vR1,
    vA,
    i2Ma: i2A * 1000,
    i3Ma: i3A * 1000,
  };
}

export interface MultiSourceResult {
  v2Eff: number;
  vA: number;
  i1Ma: number;
  i2Ma: number;
  i3Ma: number;
}

export function solveMultiSourceCircuit(
  v1: number,
  v2: number,
  v2Inverted: boolean,
  r1: number,
  r2: number,
  r3: number
): MultiSourceResult {
  const v2Eff = v2Inverted ? -v2 : v2;
  const gTot = 1 / r1 + 1 / r2 + 1 / r3;
  const vA = (v1 / r1 + v2Eff / r2) / gTot;
  const i1A = (v1 - vA) / r1;
  const i2A = (v2Eff - vA) / r2;
  const i3A = vA / r3;
  return {
    v2Eff,
    vA,
    i1Ma: i1A * 1000,
    i2Ma: i2A * 1000,
    i3Ma: i3A * 1000,
  };
}

function svgResistorHoriz(cx: number, cy: number, name: string, ohms: number, open = false): string {
  const bands = resistorBandsForOhms(ohms);
  return `
    <g transform="translate(${cx - 34}, ${cy - 14})">
      <rect x="0" y="0" width="68" height="28" rx="9" fill="${open ? '#334155' : '#dec8a0'}" stroke="${open ? '#ef4444' : '#94a3b8'}" stroke-width="2" />
      <rect x="10" y="0" width="7" height="28" fill="${open ? '#475569' : hexCss(bands[0])}" />
      <rect x="22" y="0" width="7" height="28" fill="${open ? '#475569' : hexCss(bands[1])}" />
      <rect x="34" y="0" width="7" height="28" fill="${open ? '#475569' : hexCss(bands[2])}" />
      <rect x="50" y="0" width="6" height="28" fill="${open ? '#475569' : hexCss(bands[3])}" />
      ${open ? `<line x1="20" y1="-4" x2="48" y2="32" stroke="#ef4444" stroke-width="3" />` : ''}
      <text x="34" y="42" text-anchor="middle" fill="${open ? '#fca5a5' : '#e2e8f0'}" font-family="monospace" font-size="10.5" font-weight="bold">${name} · ${formatOhms(ohms)}</text>
    </g>
  `;
}

function svgResistorVert(cx: number, cy: number, name: string, ohms: number, open = false): string {
  const bands = resistorBandsForOhms(ohms);
  return `
    <g transform="translate(${cx - 14}, ${cy - 28})">
      <rect x="0" y="0" width="28" height="56" rx="8" fill="${open ? '#334155' : '#dec8a0'}" stroke="${open ? '#ef4444' : '#94a3b8'}" stroke-width="2" />
      <rect x="0" y="9" width="28" height="6" fill="${open ? '#475569' : hexCss(bands[0])}" />
      <rect x="0" y="19" width="28" height="6" fill="${open ? '#475569' : hexCss(bands[1])}" />
      <rect x="0" y="29" width="28" height="6" fill="${open ? '#475569' : hexCss(bands[2])}" />
      <rect x="0" y="41" width="28" height="5" fill="${open ? '#475569' : hexCss(bands[3])}" />
      ${open ? `<line x1="-4" y1="16" x2="32" y2="40" stroke="#ef4444" stroke-width="3" />` : ''}
      <text x="14" y="70" text-anchor="middle" fill="${open ? '#fca5a5' : '#e2e8f0'}" font-family="monospace" font-size="10.5" font-weight="bold">${name} (${formatOhms(ohms)})</text>
    </g>
  `;
}

export function mountCircuitsLab(root: HTMLElement): void {
  // Parte 1: Serie vs Paralelo (solo resistencias)
  let spVolts = 9;
  let spOhms = 220;
  let serOpen = false;
  let parOpen = false;

  // Parte 2: Circuito Mixto (R1 en serie con R2 || R3)
  let mxVolts = 9;
  let mxR1 = 220;
  let mxR2 = 470;
  let mxR3 = 470;

  // Parte 3: Múltiples fuentes DC (V1, V2 y 3 resistencias R1, R2, R3)
  let msV1 = 9;
  let msV2 = 5;
  let msV2Inv = false;
  let msR1 = 220;
  let msR2 = 220;
  let msR3 = 470;

  root.innerHTML = `
    <!-- SECCIÓN 1: SERIE VS PARALELO SOLO CON RESISTENCIAS -->
    <div class="circuits-block">
      <div class="circuits-toolbar">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="cb-lbl">Fuente V:</span>
          ${[5, 9, 12].map((v) => `<button type="button" class="seg-btn ${v === 9 ? 'is-active' : ''}" data-sp-v="${v}">${v} V</button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="cb-lbl">Resistencias R₁ y R₂:</span>
          ${[220, 470, 1000].map((v) => `<button type="button" class="seg-btn ${v === 220 ? 'is-active' : ''}" data-sp-r="${v}">${formatOhms(v)}</button>`).join('')}
        </div>
      </div>

      <div class="sp-compare-grid">
        <div class="viz-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <h3>Circuito en Serie (solo resistencias)</h3>
            <button type="button" class="seg-btn" id="btn-sp-series">Abrir rama R₁</button>
          </div>
          <div class="svg-stage" id="sp-ser-stage"></div>
          <div class="math-eq-box is-light" id="sp-ser-eq"></div>
          <div id="sp-ser-msg" class="status-banner is-ok"></div>
        </div>

        <div class="viz-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <h3>Circuito en Paralelo (solo resistencias)</h3>
            <button type="button" class="seg-btn" id="btn-sp-par">Abrir rama R₁</button>
          </div>
          <div class="svg-stage" id="sp-par-stage"></div>
          <div class="math-eq-box is-light" id="sp-par-eq"></div>
          <div id="sp-par-msg" class="status-banner is-ok"></div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2: CIRCUITO MIXTO (R1 + [R2 || R3]) -->
    <div class="viz-card circuits-block">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <h3>Circuito Mixto (R₁ en serie con grupo R₂ ∥ R₃)</h3>
          <p class="cb-sub">Primero reduce las resistencias paralelas R₂ ∥ R₃ y luego suma en serie con R₁ para hallar la corriente total.</p>
        </div>
      </div>

      <div class="mixed-grid">
        <div>
          <div class="svg-stage" id="mx-stage"></div>
          <div class="circuits-sliders">
            <div class="ctrl-group">
              <label class="ctrl-label" for="mx-v"><span>Fuente (${mVar('V')})</span><span id="mx-v-lbl">9.0 V</span></label>
              <input id="mx-v" type="range" min="3" max="12" step="1" value="9" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="mx-r1"><span>Resistencia serie (${mVar('R', '1')})</span><span id="mx-r1-lbl">220 Ω</span></label>
              <input id="mx-r1" type="range" min="100" max="1000" step="10" value="220" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="mx-r2"><span>Rama izquierda (${mVar('R', '2')})</span><span id="mx-r2-lbl">470 Ω</span></label>
              <input id="mx-r2" type="range" min="100" max="1000" step="10" value="470" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="mx-r3"><span>Rama derecha (${mVar('R', '3')})</span><span id="mx-r3-lbl">470 Ω</span></label>
              <input id="mx-r3" type="range" min="100" max="1000" step="10" value="470" />
            </div>
          </div>
        </div>

        <div class="eq-step-list">
          <div class="math-eq-box is-light" id="mx-eq-1"></div>
          <div class="math-eq-box is-light" id="mx-eq-2"></div>
          <div class="math-eq-box is-light" id="mx-eq-3"></div>
          <div class="kpi-trio">
            <div class="kpi-box"><span>Caída en ${mVar('R', '1')}</span><strong id="mx-kpi-vr1">4.35 V</strong></div>
            <div class="kpi-box"><span>Voltaje Nodo A (${mVar('R', '2')}∥${mVar('R', '3')})</span><strong id="mx-kpi-va">4.65 V</strong></div>
            <div class="kpi-box"><span>${mVar('I', '2')} + ${mVar('I', '3')} = ${mVar('I', 'T')}</span><strong id="mx-kpi-it">19.8 mA</strong></div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 3: CIRCUITO CON MÚLTIPLES FUENTES (V1 y V2 + KIRCHHOFF) -->
    <div class="viz-card circuits-block">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <h3>Circuito con Múltiples Fuentes (Superposición y Ley de Nodos)</h3>
          <p class="cb-sub">Dos fuentes DC (${mVar('V', '1')} y ${mVar('V', '2')}) empujan corriente hacia el mismo nodo A y se reparten por la resistencia central R₃.</p>
        </div>
        <button type="button" class="seg-btn" id="ms-inv-btn">Polaridad V₂: Normal (+ arriba)</button>
      </div>

      <div class="mixed-grid">
        <div>
          <div class="svg-stage" id="ms-stage"></div>
          <div class="circuits-sliders">
            <div class="ctrl-group">
              <label class="ctrl-label" for="ms-v1"><span>Fuente izquierda (${mVar('V', '1')})</span><span id="ms-v1-lbl">9.0 V</span></label>
              <input id="ms-v1" type="range" min="0" max="12" step="0.5" value="9" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="ms-v2"><span>Fuente derecha (${mVar('V', '2')})</span><span id="ms-v2-lbl">+5.0 V</span></label>
              <input id="ms-v2" type="range" min="0" max="12" step="0.5" value="5" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label" for="ms-r3"><span>Resistencia central compartida (${mVar('R', '3')})</span><span id="ms-r3-lbl">470 Ω</span></label>
              <input id="ms-r3" type="range" min="100" max="1000" step="10" value="470" />
            </div>
          </div>
        </div>

        <div class="eq-step-list">
          <div class="math-eq-box is-light" id="ms-eq-node"></div>
          <div class="math-eq-box is-light" id="ms-eq-kcl"></div>
          <div class="kpi-trio">
            <div class="kpi-box"><span>Corriente ${mVar('I', '1')} (${mVar('V', '1')} → A)</span><strong id="ms-kpi-i1">—</strong></div>
            <div class="kpi-box"><span>Corriente ${mVar('I', '2')} (${mVar('V', '2')} → A)</span><strong id="ms-kpi-i2">—</strong></div>
            <div class="kpi-box"><span>Corriente ${mVar('I', '3')} (Por ${mVar('R', '3')})</span><strong id="ms-kpi-i3">—</strong></div>
          </div>
          <div id="ms-banner" class="status-banner is-ok"></div>
        </div>
      </div>
    </div>
  `;

  const renderSerieParalelo = () => {
    const reqSer = spOhms * 2;
    const reqPar = spOhms / 2;
    const iSerMa = serOpen ? 0 : (spVolts / reqSer) * 1000;
    const iPar1Ma = parOpen ? 0 : (spVolts / spOhms) * 1000;
    const iPar2Ma = (spVolts / spOhms) * 1000;
    const iParTotMa = iPar1Ma + iPar2Ma;

    document.getElementById('sp-ser-stage')!.innerHTML = `
      <svg viewBox="0 0 460 190" aria-label="Circuito en serie con resistencias">
        <rect x="48" y="42" width="364" height="118" rx="14" fill="none" stroke="#334155" stroke-width="8" />
        <rect class="electron-flow ${serOpen ? 'is-stopped' : ''}" style="--flow-speed:${Math.max(0.35, 18 / Math.max(2, iSerMa)).toFixed(2)}s"
          x="48" y="42" width="364" height="118" rx="14" fill="none" stroke="#38bdf8" stroke-width="4" />
        <rect x="18" y="76" width="58" height="50" rx="8" fill="#0f172a" stroke="#00c2b5" stroke-width="2" />
        <text x="47" y="106" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">${spVolts} V</text>
        ${svgResistorHoriz(176, 42, 'R₁', spOhms, serOpen)}
        ${svgResistorHoriz(322, 42, 'R₂', spOhms, false)}
      </svg>
    `;

    document.getElementById('sp-par-stage')!.innerHTML = `
      <svg viewBox="0 0 460 190" aria-label="Circuito en paralelo con resistencias">
        <rect x="48" y="34" width="186" height="128" rx="12" fill="none" stroke="#334155" stroke-width="7" />
        <rect class="electron-flow ${parOpen ? 'is-stopped' : ''}" style="--flow-speed:0.75s"
          x="48" y="34" width="186" height="128" rx="12" fill="none" stroke="#38bdf8" stroke-width="3.5" />
        <path d="M 234 34 L 386 34 Q 400 34 400 48 L 400 148 Q 400 162 386 162 L 234 162"
          fill="none" stroke="#334155" stroke-width="7" />
        <path class="electron-flow" style="--flow-speed:0.75s"
          d="M 234 34 L 386 34 Q 400 34 400 48 L 400 148 Q 400 162 386 162 L 234 162"
          fill="none" stroke="#34d399" stroke-width="3.5" />
        <rect x="18" y="74" width="58" height="50" rx="8" fill="#0f172a" stroke="#00c2b5" stroke-width="2" />
        <text x="47" y="104" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">${spVolts} V</text>
        ${svgResistorVert(234, 96, 'R₁', spOhms, parOpen)}
        ${svgResistorVert(400, 96, 'R₂', spOhms, false)}
      </svg>
    `;

    document.getElementById('sp-ser-eq')!.innerHTML = mEq(
      `${mVar('R', 'eq')} = ${mVar('R', '1')} + ${mVar('R', '2')} = <span class="math-val">${formatOhms(reqSer)}</span> · ${mVar('I', 'T')} = <span class="math-val">${iSerMa.toFixed(1)} mA</span>`
    );
    document.getElementById('sp-par-eq')!.innerHTML = `
      ${mEq(`${mVar('R', 'eq')} = ${mFrac(`${mVar('R', '1')} · ${mVar('R', '2')}`, `${mVar('R', '1')} + ${mVar('R', '2')}`)} = <span class="math-val">${parOpen ? formatOhms(spOhms) : formatOhms(reqPar)}</span>`)}
      <div class="pwm-eff-badge">${mVar('I', 'T')} = ${iPar1Ma.toFixed(1)} + ${iPar2Ma.toFixed(1)} = <strong>${iParTotMa.toFixed(1)} mA</strong></div>
    `;

    const serBtn = document.getElementById('btn-sp-series')!;
    const parBtn = document.getElementById('btn-sp-par')!;
    serBtn.textContent = serOpen ? 'Reconectar R₁' : 'Abrir rama R₁';
    serBtn.classList.toggle('is-active', serOpen);
    parBtn.textContent = parOpen ? 'Reconectar R₁' : 'Abrir rama R₁';
    parBtn.classList.toggle('is-active', parOpen);

    const serMsg = document.getElementById('sp-ser-msg')!;
    serMsg.className = `status-banner ${serOpen ? 'is-bad' : 'is-ok'}`;
    serMsg.textContent = serOpen
      ? 'Circuito abierto en R₁ → 0.0 mA en todo el lazo porque solo existe un camino.'
      : `Misma corriente (${iSerMa.toFixed(1)} mA) en ambas resistencias; se reparten ${(spVolts / 2).toFixed(2)} V cada una.`;

    const parMsg = document.getElementById('sp-par-msg')!;
    parMsg.className = `status-banner ${parOpen ? 'is-warn' : 'is-ok'}`;
    parMsg.textContent = parOpen
      ? `R₁ abierta, pero R₂ mantiene los ${spVolts} V completos y sigue conduciendo ${iPar2Ma.toFixed(1)} mA.`
      : `Ambas resistencias reciben ${spVolts} V y la corriente total se suma (${iParTotMa.toFixed(1)} mA).`;
  };

  const renderMixed = () => {
    const res = solveMixedResistors(mxVolts, mxR1, mxR2, mxR3);
    document.getElementById('mx-v-lbl')!.textContent = `${mxVolts.toFixed(1)} V`;
    document.getElementById('mx-r1-lbl')!.textContent = formatOhms(mxR1);
    document.getElementById('mx-r2-lbl')!.textContent = formatOhms(mxR2);
    document.getElementById('mx-r3-lbl')!.textContent = formatOhms(mxR3);

    document.getElementById('mx-stage')!.innerHTML = `
      <svg viewBox="0 0 480 215" aria-label="Circuito mixto con resistencias">
        <!-- Lazo izquierdo V -> R1 -> Nodo A -->
        <path d="M52 175 L52 46 L278 46" fill="none" stroke="#334155" stroke-width="7"/>
        <path class="electron-flow" style="--flow-speed:${Math.max(0.35, 16 / res.iTotalMa).toFixed(2)}s"
          d="M52 175 L52 46 L278 46" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
        <!-- Rama R2 -->
        <path d="M278 46 L278 175 L52 175" fill="none" stroke="#334155" stroke-width="6"/>
        <path class="electron-flow" style="--flow-speed:${Math.max(0.4, 14 / res.i2Ma).toFixed(2)}s"
          d="M278 46 L278 175 L52 175" fill="none" stroke="#00c2b5" stroke-width="3"/>
        <!-- Rama R3 -->
        <path d="M278 46 L418 46 L418 175 L278 175" fill="none" stroke="#334155" stroke-width="6"/>
        <path class="electron-flow" style="--flow-speed:${Math.max(0.4, 14 / res.i3Ma).toFixed(2)}s"
          d="M278 46 L418 46 L418 175 L278 175" fill="none" stroke="#34d399" stroke-width="3"/>

        <!-- Fuente DC -->
        <rect x="24" y="88" width="56" height="50" rx="8" fill="#0f172a" stroke="#00c2b5" stroke-width="2.2"/>
        <text x="52" y="118" text-anchor="middle" fill="#5ef2e6" font-family="monospace" font-size="14" font-weight="bold">${mxVolts} V</text>

        <!-- Nodo A -->
        <circle cx="278" cy="46" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2"/>
        <text x="278" y="30" text-anchor="middle" fill="#facc15" font-family="monospace" font-size="10.5" font-weight="bold">Nodo A (${res.vA.toFixed(2)} V)</text>

        ${svgResistorHoriz(165, 46, 'R₁', mxR1)}
        ${svgResistorVert(278, 110, 'R₂', mxR2)}
        ${svgResistorVert(418, 110, 'R₃', mxR3)}

        <text x="165" y="198" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="11" font-weight="bold">I_T = ${res.iTotalMa.toFixed(1)} mA · I₂ = ${res.i2Ma.toFixed(1)} mA · I₃ = ${res.i3Ma.toFixed(1)} mA</text>
      </svg>
    `;

    document.getElementById('mx-eq-1')!.innerHTML = mEq(
      `1) ${mVar('R', '23')} = ${mFrac(`${mVar('R', '2')} · ${mVar('R', '3')}`, `${mVar('R', '2')} + ${mVar('R', '3')}`)} = <span class="math-val">${formatOhms(Math.round(res.r23))}</span>`
    );
    document.getElementById('mx-eq-2')!.innerHTML = mEq(
      `2) ${mVar('R', 'eq')} = ${mVar('R', '1')} + ${mVar('R', '23')} = <span class="math-val">${formatOhms(Math.round(res.rEq))}</span>`
    );
    document.getElementById('mx-eq-3')!.innerHTML = mEq(
      `3) ${mVar('I', 'T')} = ${mFrac(mVar('V'), mVar('R', 'eq'))} = <span class="math-val">${res.iTotalMa.toFixed(1)} mA</span>`
    );
    document.getElementById('mx-kpi-vr1')!.textContent = `${res.vR1.toFixed(2)} V`;
    document.getElementById('mx-kpi-va')!.textContent = `${res.vA.toFixed(2)} V`;
    document.getElementById('mx-kpi-it')!.textContent = `${res.iTotalMa.toFixed(1)} mA`;
  };

  const renderMultiSource = () => {
    const res = solveMultiSourceCircuit(msV1, msV2, msV2Inv, msR1, msR2, msR3);
    document.getElementById('ms-v1-lbl')!.textContent = `${msV1.toFixed(1)} V`;
    document.getElementById('ms-v2-lbl')!.textContent = `${msV2Inv ? '−' : '+'}${msV2.toFixed(1)} V`;
    document.getElementById('ms-r3-lbl')!.textContent = formatOhms(msR3);

    const dir1 = res.i1Ma >= 0 ? '→' : '←';
    const dir2 = res.i2Ma >= 0 ? '←' : '→';
    const dir3 = res.i3Ma >= 0 ? '↓' : '↑';

    document.getElementById('ms-stage')!.innerHTML = `
      <svg viewBox="0 0 480 215" aria-label="Circuito con dos fuentes de voltaje">
        <!-- Malla izquierda y derecha -->
        <path d="M52 174 L52 46 L428 46 L428 174 L52 174" fill="none" stroke="#334155" stroke-width="7"/>
        <line x1="240" y1="46" x2="240" y2="174" stroke="#334155" stroke-width="7"/>

        <!-- Flujo animado en ramas -->
        <path class="electron-flow ${Math.abs(res.i1Ma) < 0.2 ? 'is-stopped' : ''}" style="--flow-speed:${Math.max(0.35, 16 / Math.max(2, Math.abs(res.i1Ma))).toFixed(2)}s"
          d="${res.i1Ma >= 0 ? 'M52 174 L52 46 L240 46' : 'M240 46 L52 46 L52 174'}" fill="none" stroke="#38bdf8" stroke-width="3.2"/>
        <path class="electron-flow ${Math.abs(res.i2Ma) < 0.2 ? 'is-stopped' : ''}" style="--flow-speed:${Math.max(0.35, 16 / Math.max(2, Math.abs(res.i2Ma))).toFixed(2)}s"
          d="${res.i2Ma >= 0 ? 'M428 174 L428 46 L240 46' : 'M240 46 L428 46 L428 174'}" fill="none" stroke="#fbbf24" stroke-width="3.2"/>
        <line class="electron-flow ${Math.abs(res.i3Ma) < 0.2 ? 'is-stopped' : ''}" style="--flow-speed:${Math.max(0.35, 16 / Math.max(2, Math.abs(res.i3Ma))).toFixed(2)}s"
          x1="240" y1="${res.i3Ma >= 0 ? 46 : 174}" x2="240" y2="${res.i3Ma >= 0 ? 174 : 46}" stroke="#34d399" stroke-width="3.2"/>

        <!-- Fuente V1 (izq) -->
        <rect x="22" y="88" width="60" height="50" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2"/>
        <text x="52" y="109" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="10" font-weight="bold">V₁ (+)</text>
        <text x="52" y="126" text-anchor="middle" fill="#fff" font-family="monospace" font-size="13" font-weight="bold">${msV1.toFixed(1)} V</text>

        <!-- Fuente V2 (der) -->
        <rect x="398" y="88" width="60" height="50" rx="8" fill="#0f172a" stroke="${msV2Inv ? '#ef4444' : '#fbbf24'}" stroke-width="2.2"/>
        <text x="428" y="109" text-anchor="middle" fill="${msV2Inv ? '#fca5a5' : '#fde047'}" font-family="monospace" font-size="10" font-weight="bold">V₂ (${msV2Inv ? '−' : '+'})</text>
        <text x="428" y="126" text-anchor="middle" fill="#fff" font-family="monospace" font-size="13" font-weight="bold">${msV2.toFixed(1)} V</text>

        <!-- Nodo A -->
        <circle cx="240" cy="46" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2"/>
        <text x="240" y="28" text-anchor="middle" fill="#facc15" font-family="monospace" font-size="10.5" font-weight="bold">Nodo A = ${res.vA.toFixed(2)} V · GND = 0 V</text>

        ${svgResistorHoriz(146, 46, 'R₁', msR1)}
        ${svgResistorHoriz(334, 46, 'R₂', msR2)}
        ${svgResistorVert(240, 112, 'R₃', msR3)}

        <text x="146" y="198" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="10.5" font-weight="bold">${dir1} I₁=${Math.abs(res.i1Ma).toFixed(1)}mA</text>
        <text x="240" y="198" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="10.5" font-weight="bold">${dir3} I₃=${Math.abs(res.i3Ma).toFixed(1)}mA</text>
        <text x="334" y="198" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10.5" font-weight="bold">${dir2} I₂=${Math.abs(res.i2Ma).toFixed(1)}mA</text>
      </svg>
    `;

    document.getElementById('ms-eq-node')!.innerHTML = mEq(
      `${mVar('V', 'A')} = ${mFrac(`${mVar('V', '1')}/${mVar('R', '1')} + ${mVar('V', '2')}/${mVar('R', '2')}`, `1/${mVar('R', '1')} + 1/${mVar('R', '2')} + 1/${mVar('R', '3')}`)} = <span class="math-val">${res.vA.toFixed(2)} V</span>`
    );
    document.getElementById('ms-eq-kcl')!.innerHTML = mEq(
      `Kirchhoff (Nodo A): ${mVar('I', '1')} + ${mVar('I', '2')} = ${mVar('I', '3')} → <span class="math-val">${res.i1Ma.toFixed(1)} + ${res.i2Ma.toFixed(1)} = ${res.i3Ma.toFixed(1)} mA</span>`
    );
    document.getElementById('ms-kpi-i1')!.textContent = `${res.i1Ma.toFixed(1)} mA`;
    document.getElementById('ms-kpi-i2')!.textContent = `${res.i2Ma.toFixed(1)} mA`;
    document.getElementById('ms-kpi-i3')!.textContent = `${res.i3Ma.toFixed(1)} mA`;

    const banner = document.getElementById('ms-banner')!;
    if (res.i2Ma < 0) {
      banner.className = 'status-banner is-warn';
      banner.textContent = msV2Inv
        ? `V₂ está invertida (${res.v2Eff.toFixed(1)} V): absorbe corriente desde el nodo A mientras V₁ alimenta ambas ramas.`
        : `V₁ (${msV1} V) supera a V_A (${res.vA.toFixed(2)} V) > V₂ (${msV2} V): parte de I₁ fluye hacia V₂.`;
    } else if (res.i1Ma < 0) {
      banner.className = 'status-banner is-warn';
      banner.textContent = `V₂ supera al nodo A y empuja corriente inversa hacia V₁ (${res.i1Ma.toFixed(1)} mA).`;
    } else {
      banner.className = 'status-banner is-ok';
      banner.textContent = `Ambas fuentes aportan corriente positiva al nodo A y se suman en R₃ (${res.i3Ma.toFixed(1)} mA).`;
    }
  };

  // Listeners Serie/Paralelo
  root.querySelectorAll<HTMLButtonElement>('[data-sp-v]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-sp-v]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      spVolts = Number(btn.dataset.spV);
      renderSerieParalelo();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-sp-r]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-sp-r]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      spOhms = Number(btn.dataset.spR);
      renderSerieParalelo();
    });
  });
  document.getElementById('btn-sp-series')?.addEventListener('click', () => {
    serOpen = !serOpen;
    renderSerieParalelo();
  });
  document.getElementById('btn-sp-par')?.addEventListener('click', () => {
    parOpen = !parOpen;
    renderSerieParalelo();
  });

  // Listeners Mixto
  document.getElementById('mx-v')?.addEventListener('input', (e) => {
    mxVolts = Number((e.target as HTMLInputElement).value);
    renderMixed();
  });
  document.getElementById('mx-r1')?.addEventListener('input', (e) => {
    mxR1 = Number((e.target as HTMLInputElement).value);
    renderMixed();
  });
  document.getElementById('mx-r2')?.addEventListener('input', (e) => {
    mxR2 = Number((e.target as HTMLInputElement).value);
    renderMixed();
  });
  document.getElementById('mx-r3')?.addEventListener('input', (e) => {
    mxR3 = Number((e.target as HTMLInputElement).value);
    renderMixed();
  });

  // Listeners Múltiples Fuentes
  document.getElementById('ms-v1')?.addEventListener('input', (e) => {
    msV1 = Number((e.target as HTMLInputElement).value);
    renderMultiSource();
  });
  document.getElementById('ms-v2')?.addEventListener('input', (e) => {
    msV2 = Number((e.target as HTMLInputElement).value);
    renderMultiSource();
  });
  document.getElementById('ms-r3')?.addEventListener('input', (e) => {
    msR3 = Number((e.target as HTMLInputElement).value);
    renderMultiSource();
  });
  document.getElementById('ms-inv-btn')?.addEventListener('click', (e) => {
    msV2Inv = !msV2Inv;
    const b = e.currentTarget as HTMLButtonElement;
    b.classList.toggle('is-active', msV2Inv);
    b.textContent = msV2Inv ? 'Polaridad V₂: Invertida (− arriba)' : 'Polaridad V₂: Normal (+ arriba)';
    renderMultiSource();
  });

  renderSerieParalelo();
  renderMixed();
  renderMultiSource();
}
