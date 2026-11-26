import { formatOhms } from '../lab/components/catalog';

export interface ColorBandInfo {
  key: string;
  name: string;
  hex: string;
  textColor: string;
  digit: number | null;
  multiplier: number | null;
  multLabel: string;
  tolerancePct: number | null;
  tolLabel: string;
}

export const COLOR_TABLE: ColorBandInfo[] = [
  { key: 'black', name: 'Negro', hex: '#1c1917', textColor: '#ffffff', digit: 0, multiplier: 1, multLabel: '× 1 Ω', tolerancePct: null, tolLabel: '—' },
  { key: 'brown', name: 'Café', hex: '#7c4318', textColor: '#ffffff', digit: 1, multiplier: 10, multLabel: '× 10 Ω', tolerancePct: 1, tolLabel: '± 1%' },
  { key: 'red', name: 'Rojo', hex: '#dc2626', textColor: '#ffffff', digit: 2, multiplier: 100, multLabel: '× 100 Ω', tolerancePct: 2, tolLabel: '± 2%' },
  { key: 'orange', name: 'Naranja', hex: '#f97316', textColor: '#ffffff', digit: 3, multiplier: 1000, multLabel: '× 1 kΩ', tolerancePct: null, tolLabel: '—' },
  { key: 'yellow', name: 'Amarillo', hex: '#eab308', textColor: '#1c1917', digit: 4, multiplier: 10_000, multLabel: '× 10 kΩ', tolerancePct: null, tolLabel: '—' },
  { key: 'green', name: 'Verde', hex: '#16a34a', textColor: '#ffffff', digit: 5, multiplier: 100_000, multLabel: '× 100 kΩ', tolerancePct: 0.5, tolLabel: '± 0.5%' },
  { key: 'blue', name: 'Azul', hex: '#2563eb', textColor: '#ffffff', digit: 6, multiplier: 1_000_000, multLabel: '× 1 MΩ', tolerancePct: 0.25, tolLabel: '± 0.25%' },
  { key: 'violet', name: 'Violeta', hex: '#9333ea', textColor: '#ffffff', digit: 7, multiplier: 10_000_000, multLabel: '× 10 MΩ', tolerancePct: 0.1, tolLabel: '± 0.1%' },
  { key: 'gray', name: 'Gris', hex: '#64748b', textColor: '#ffffff', digit: 8, multiplier: null, multLabel: '—', tolerancePct: 0.05, tolLabel: '± 0.05%' },
  { key: 'white', name: 'Blanco', hex: '#f8fafc', textColor: '#1c1917', digit: 9, multiplier: null, multLabel: '—', tolerancePct: null, tolLabel: '—' },
  { key: 'gold', name: 'Dorado', hex: '#d4a007', textColor: '#1c1917', digit: null, multiplier: 0.1, multLabel: '× 0.1 Ω', tolerancePct: 5, tolLabel: '± 5%' },
  { key: 'silver', name: 'Plateado', hex: '#94a3b8', textColor: '#1c1917', digit: null, multiplier: 0.01, multLabel: '× 0.01 Ω', tolerancePct: 10, tolLabel: '± 10%' },
];

export interface ResistorBandsInput {
  mode: 4 | 5;
  d1: number;
  d2: number;
  d3?: number;
  multKey: string;
  tolKey: string;
}

export function getColorByKey(key: string): ColorBandInfo {
  return COLOR_TABLE.find((c) => c.key === key) ?? COLOR_TABLE[0];
}

export function getColorByDigit(digit: number): ColorBandInfo {
  const safe = Math.max(0, Math.min(9, Math.round(digit)));
  return COLOR_TABLE.find((c) => c.digit === safe) ?? COLOR_TABLE[0];
}

export function bandsToOhms(bands: ResistorBandsInput): {
  ohms: number;
  tolerancePct: number;
  minOhms: number;
  maxOhms: number;
} {
  const multInfo = getColorByKey(bands.multKey);
  const tolInfo = getColorByKey(bands.tolKey);
  const mult = multInfo.multiplier ?? 1;
  const sig =
    bands.mode === 5
      ? bands.d1 * 100 + bands.d2 * 10 + (bands.d3 ?? 0)
      : bands.d1 * 10 + bands.d2;
  const raw = sig * mult;
  const ohms = Math.round(raw * 1000) / 1000;
  const tolerancePct = tolInfo.tolerancePct ?? 5;
  const minOhms = Math.round(ohms * (1 - tolerancePct / 100) * 1000) / 1000;
  const maxOhms = Math.round(ohms * (1 + tolerancePct / 100) * 1000) / 1000;
  return { ohms, tolerancePct, minOhms, maxOhms };
}

export function ohmsToBands(
  ohms: number,
  mode: 4 | 5,
  tolKey = mode === 5 ? 'brown' : 'gold'
): {
  d1: number;
  d2: number;
  d3?: number;
  multKey: string;
  tolKey: string;
  exactOhms: number;
  approximated: boolean;
} {
  const safe = Math.max(0.1, Math.min(999_000_000, Number(ohms) || 220));
  const multCandidates = COLOR_TABLE.filter((c) => c.multiplier !== null);

  let best: {
    d1: number;
    d2: number;
    d3?: number;
    multKey: string;
    exactOhms: number;
    err: number;
  } | null = null;

  for (const m of multCandidates) {
    const mult = m.multiplier!;
    const scaled = Math.round(safe / mult);
    if (mode === 4) {
      if (scaled >= 10 && scaled <= 99) {
        const d1 = Math.floor(scaled / 10);
        const d2 = scaled % 10;
        const exactOhms = Math.round(scaled * mult * 1000) / 1000;
        const err = Math.abs(exactOhms - safe) / safe;
        if (!best || err < best.err) {
          best = { d1, d2, multKey: m.key, exactOhms, err };
        }
      }
    } else {
      if (scaled >= 100 && scaled <= 999) {
        const d1 = Math.floor(scaled / 100);
        const d2 = Math.floor((scaled % 100) / 10);
        const d3 = scaled % 10;
        const exactOhms = Math.round(scaled * mult * 1000) / 1000;
        const err = Math.abs(exactOhms - safe) / safe;
        if (!best || err < best.err) {
          best = { d1, d2, d3, multKey: m.key, exactOhms, err };
        }
      }
    }
  }

  if (!best) {
    // Fallback por exponente
    const digitsCount = mode === 5 ? 3 : 2;
    const exp = Math.floor(Math.log10(safe)) - (digitsCount - 1);
    const multVal = Math.pow(10, Math.max(-2, Math.min(7, exp)));
    const closestMult = multCandidates.reduce((acc, cur) =>
      Math.abs(Math.log10(cur.multiplier!) - Math.log10(multVal)) <
      Math.abs(Math.log10(acc.multiplier!) - Math.log10(multVal))
        ? cur
        : acc
    );
    const maxSig = mode === 5 ? 999 : 99;
    const minSig = mode === 5 ? 100 : 10;
    const scaled = Math.max(minSig, Math.min(maxSig, Math.round(safe / closestMult.multiplier!)));
    const exactOhms = Math.round(scaled * closestMult.multiplier! * 1000) / 1000;
    if (mode === 5) {
      best = {
        d1: Math.floor(scaled / 100),
        d2: Math.floor((scaled % 100) / 10),
        d3: scaled % 10,
        multKey: closestMult.key,
        exactOhms,
        err: Math.abs(exactOhms - safe) / safe,
      };
    } else {
      best = {
        d1: Math.floor(scaled / 10),
        d2: scaled % 10,
        multKey: closestMult.key,
        exactOhms,
        err: Math.abs(exactOhms - safe) / safe,
      };
    }
  }

  return {
    d1: best.d1,
    d2: best.d2,
    d3: best.d3,
    multKey: best.multKey,
    tolKey,
    exactOhms: best.exactOhms,
    approximated: best.err > 0.001,
  };
}

function formatOhmsRich(ohms: number): string {
  if (ohms >= 1_000_000) return `${+(ohms / 1_000_000).toFixed(2)} MΩ`;
  if (ohms >= 1000) return `${+(ohms / 1000).toFixed(2)} kΩ`;
  if (ohms < 10) return `${+ohms.toFixed(2)} Ω`;
  return formatOhms(ohms);
}

export function mountResistorCalculator(root: HTMLElement): void {
  let mode: 4 | 5 = 4;
  let d1 = 2;
  let d2 = 2;
  let d3 = 0;
  let multKey = 'brown';
  let tolKey = 'gold';
  let approximated = false;

  const QUICK_E12 = [100, 220, 330, 470, 1000, 2200, 4700, 10_000, 100_000, 1_000_000];
  const digitColorsD1 = COLOR_TABLE.filter((c) => c.digit !== null && c.digit >= 1);
  const digitColorsAll = COLOR_TABLE.filter((c) => c.digit !== null);
  const multColors = COLOR_TABLE.filter((c) => c.multiplier !== null);
  const tolColors = COLOR_TABLE.filter((c) => c.tolerancePct !== null);

  root.innerHTML = `
    <div class="res-calc-head">
      <div class="section-intro-head">
        <span class="section-num">HERRAMIENTA INTERACTIVA · IEC 60062</span>
        <h2>Calculadora Bidireccional de Resistencias</h2>
        <p>
          Elige los colores de las bandas para descubrir los ohmios, o escribe un valor en Ω / kΩ / MΩ
          para ver qué bandas de color debes buscar en tu kit físico.
        </p>
      </div>
      <div class="res-mode-switch" role="group" aria-label="Número de bandas">
        <button type="button" class="seg-btn is-active" data-rc-mode="4">4 Bandas (Común 5%)</button>
        <button type="button" class="seg-btn" data-rc-mode="5">5 Bandas (Precisión 1%)</button>
      </div>
    </div>

    <div class="res-calc-card">
      <div class="res-preview-stage">
        <svg viewBox="0 0 640 160" class="res-svg-big" aria-label="Vista previa de resistencia con código de colores">
          <defs>
            <linearGradient id="rc-body-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f2e4c9" />
              <stop offset="35%" stop-color="#e2cca5" />
              <stop offset="100%" stop-color="#c3a776" />
            </linearGradient>
            <linearGradient id="rc-blue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="40%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#1d4ed8" />
            </linearGradient>
          </defs>
          <!-- Alambres terminales -->
          <line x1="20" y1="80" x2="620" y2="80" stroke="#94a3b8" stroke-width="10" stroke-linecap="round" />
          <line x1="20" y1="77" x2="620" y2="77" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" />
          <!-- Cuerpo cerámico -->
          <path id="rc-body-shape" d="M 145 40 Q 175 34 210 44 L 430 44 Q 465 34 495 40 Q 515 50 515 80 Q 515 110 495 120 Q 465 126 430 116 L 210 116 Q 175 126 145 120 Q 125 110 125 80 Q 125 50 145 40 Z"
            fill="url(#rc-body-grad)" stroke="#8b7048" stroke-width="2" />
          <!-- Bandas dinámicas -->
          <rect id="rc-band-1" x="182" y="39" width="22" height="82" rx="3" fill="#dc2626" />
          <rect id="rc-band-2" x="234" y="44" width="22" height="72" rx="3" fill="#dc2626" />
          <rect id="rc-band-3" x="286" y="44" width="22" height="72" rx="3" fill="#1c1917" opacity="0" />
          <rect id="rc-band-m" x="338" y="44" width="22" height="72" rx="3" fill="#7c4318" />
          <rect id="rc-band-t" x="446" y="39" width="22" height="82" rx="3" fill="#d4a007" />
        </svg>

        <div class="res-readout-box">
          <span class="res-readout-tag">VALOR NOMINAL</span>
          <strong class="res-readout-val" id="rc-readout-val">220 Ω ± 5%</strong>
          <span class="res-readout-range" id="rc-readout-range">Rango real: 209 Ω – 231 Ω</span>
          <span class="res-readout-note" id="rc-readout-note" hidden></span>
        </div>
      </div>

      <!-- Entrada Valor -> Colores -->
      <div class="res-input-bar">
        <div class="res-input-group">
          <label for="rc-val-input">Capacidad / Resistencia deseada</label>
          <div class="res-input-row">
            <input id="rc-val-input" type="number" min="0.1" max="999" step="any" value="220" />
            <select id="rc-unit-select" aria-label="Unidad de resistencia">
              <option value="1" selected>Ω</option>
              <option value="1000">kΩ</option>
              <option value="1000000">MΩ</option>
            </select>
            <select id="rc-tol-select" aria-label="Tolerancia">
              ${tolColors.map((t) => `<option value="${t.key}" ${t.key === 'gold' ? 'selected' : ''}>${t.tolLabel} (${t.name})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="res-quick-chips">
          <span class="rc-chips-lbl">Valores de taller:</span>
          ${QUICK_E12.map((v) => `<button type="button" class="ci-chip" data-rc-quick="${v}">${formatOhmsRich(v)}</button>`).join('')}
        </div>
      </div>

      <!-- Selectores Colores -> Valor -->
      <div class="res-bands-grid" id="rc-bands-grid"></div>
    </div>

    <!-- Tabla completa de código de colores -->
    <details class="res-table-details" open>
      <summary>Tabla completa del código de colores IEC 60062</summary>
      <div class="res-table-wrap">
        <table class="res-color-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Banda 1 / 2 / 3 (Dígito)</th>
              <th>Multiplicador</th>
              <th>Tolerancia</th>
            </tr>
          </thead>
          <tbody>
            ${COLOR_TABLE.map(
              (c) => `
                <tr>
                  <td>
                    <span class="rc-swatch-cell">
                      <i style="background:${c.hex};border-color:${c.key === 'white' ? '#cbd5e1' : 'transparent'}"></i>
                      <strong>${c.name}</strong>
                    </span>
                  </td>
                  <td>${c.digit !== null ? c.digit : '—'}</td>
                  <td>${c.multLabel}</td>
                  <td>${c.tolLabel}</td>
                </tr>
              `
            ).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;

  const syncInputFromOhms = (ohms: number) => {
    const inp = root.querySelector<HTMLInputElement>('#rc-val-input')!;
    const unitSel = root.querySelector<HTMLSelectElement>('#rc-unit-select')!;
    const tolSel = root.querySelector<HTMLSelectElement>('#rc-tol-select')!;
    let unit = 1;
    let display = ohms;
    if (ohms >= 1_000_000) {
      unit = 1_000_000;
      display = +(ohms / 1_000_000).toFixed(3);
    } else if (ohms >= 1000) {
      unit = 1000;
      display = +(ohms / 1000).toFixed(3);
    } else {
      display = +ohms.toFixed(2);
    }
    inp.value = String(display);
    unitSel.value = String(unit);
    tolSel.value = tolKey;
  };

  const renderBandsSelectors = () => {
    const grid = root.querySelector<HTMLElement>('#rc-bands-grid')!;
    grid.className = `res-bands-grid ${mode === 5 ? 'is-5band' : 'is-4band'}`;

    const makeCol = (
      title: string,
      items: ColorBandInfo[],
      isSelected: (c: ColorBandInfo) => boolean,
      subLabel: (c: ColorBandInfo) => string,
      onPick: (c: ColorBandInfo) => void
    ) => {
      const col = document.createElement('div');
      col.className = 'rc-band-col';
      col.innerHTML = `<span class="rc-col-title">${title}</span><div class="rc-color-list"></div>`;
      const list = col.querySelector('.rc-color-list')!;
      for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `rc-color-btn ${isSelected(item) ? 'is-selected' : ''}`;
        btn.innerHTML = `
          <span class="rc-dot" style="background:${item.hex};${item.key === 'white' ? 'border:1px solid #cbd5e1' : ''}"></span>
          <span class="rc-cname">${item.name}</span>
          <span class="rc-cval">${subLabel(item)}</span>
        `;
        btn.addEventListener('click', () => onPick(item));
        list.appendChild(btn);
      }
      return col;
    };

    grid.innerHTML = '';
    grid.appendChild(
      makeCol(
        'Banda 1 (1er dígito)',
        digitColorsD1,
        (c) => c.digit === d1,
        (c) => String(c.digit),
        (c) => {
          d1 = c.digit ?? 1;
          approximated = false;
          updateAll(true);
        }
      )
    );
    grid.appendChild(
      makeCol(
        'Banda 2 (2do dígito)',
        digitColorsAll,
        (c) => c.digit === d2,
        (c) => String(c.digit),
        (c) => {
          d2 = c.digit ?? 0;
          approximated = false;
          updateAll(true);
        }
      )
    );
    if (mode === 5) {
      grid.appendChild(
        makeCol(
          'Banda 3 (3er dígito)',
          digitColorsAll,
          (c) => c.digit === d3,
          (c) => String(c.digit),
          (c) => {
            d3 = c.digit ?? 0;
            approximated = false;
            updateAll(true);
          }
        )
      );
    }
    grid.appendChild(
      makeCol(
        'Multiplicador',
        multColors,
        (c) => c.key === multKey,
        (c) => c.multLabel.replace('× ', '×'),
        (c) => {
          multKey = c.key;
          approximated = false;
          updateAll(true);
        }
      )
    );
    grid.appendChild(
      makeCol(
        'Tolerancia',
        tolColors,
        (c) => c.key === tolKey,
        (c) => c.tolLabel,
        (c) => {
          tolKey = c.key;
          approximated = false;
          updateAll(true);
        }
      )
    );
  };

  const updateAll = (pushToInput: boolean) => {
    const res = bandsToOhms({ mode, d1, d2, d3, multKey, tolKey });
    const c1 = getColorByDigit(d1);
    const c2 = getColorByDigit(d2);
    const c3 = getColorByDigit(d3);
    const cm = getColorByKey(multKey);
    const ct = getColorByKey(tolKey);

    const b1 = root.querySelector('#rc-band-1')!;
    const b2 = root.querySelector('#rc-band-2')!;
    const b3 = root.querySelector('#rc-band-3')!;
    const bm = root.querySelector('#rc-band-m')!;
    const bt = root.querySelector('#rc-band-t')!;
    const bodyShape = root.querySelector('#rc-body-shape')!;

    bodyShape.setAttribute('fill', mode === 5 ? 'url(#rc-blue-grad)' : 'url(#rc-body-grad)');
    b1.setAttribute('fill', c1.hex);
    b2.setAttribute('fill', c2.hex);
    if (mode === 5) {
      b3.setAttribute('opacity', '1');
      b3.setAttribute('fill', c3.hex);
      b2.setAttribute('x', '228');
      b3.setAttribute('x', '274');
      bm.setAttribute('x', '320');
    } else {
      b3.setAttribute('opacity', '0');
      b2.setAttribute('x', '234');
      bm.setAttribute('x', '296');
    }
    bm.setAttribute('fill', cm.hex);
    bt.setAttribute('fill', ct.hex);

    root.querySelector('#rc-readout-val')!.textContent = `${formatOhmsRich(res.ohms)} ± ${res.tolerancePct}%`;
    root.querySelector('#rc-readout-range')!.textContent = `Rango real: ${formatOhmsRich(res.minOhms)} – ${formatOhmsRich(res.maxOhms)}`;
    const noteEl = root.querySelector<HTMLElement>('#rc-readout-note')!;
    if (approximated) {
      noteEl.hidden = false;
      noteEl.textContent = `Aproximado al valor comercial más cercano en ${mode} bandas.`;
    } else {
      noteEl.hidden = true;
    }

    if (pushToInput) {
      syncInputFromOhms(res.ohms);
    }
    root.querySelectorAll<HTMLButtonElement>('[data-rc-quick]').forEach((btn) => {
      btn.classList.toggle('is-active', Math.abs(Number(btn.dataset.rcQuick) - res.ohms) < 0.5);
    });
    renderBandsSelectors();
  };

  const applyOhmsInput = (rawOhms: number) => {
    const conv = ohmsToBands(rawOhms, mode, tolKey);
    d1 = conv.d1;
    d2 = conv.d2;
    d3 = conv.d3 ?? 0;
    multKey = conv.multKey;
    approximated = conv.approximated;
    updateAll(false);
  };

  root.querySelectorAll<HTMLButtonElement>('[data-rc-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-rc-mode]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const curOhms = bandsToOhms({ mode, d1, d2, d3, multKey, tolKey }).ohms;
      mode = Number(btn.dataset.rcMode) === 5 ? 5 : 4;
      if (mode === 5 && tolKey === 'gold') tolKey = 'brown';
      if (mode === 4 && tolKey === 'brown') tolKey = 'gold';
      applyOhmsInput(curOhms);
      syncInputFromOhms(bandsToOhms({ mode, d1, d2, d3, multKey, tolKey }).ohms);
    });
  });

  const valInput = root.querySelector<HTMLInputElement>('#rc-val-input')!;
  const unitSel = root.querySelector<HTMLSelectElement>('#rc-unit-select')!;
  const tolSel = root.querySelector<HTMLSelectElement>('#rc-tol-select')!;

  const onManualInput = () => {
    const num = Number(valInput.value);
    if (!Number.isFinite(num) || num <= 0) return;
    applyOhmsInput(num * Number(unitSel.value));
  };

  valInput.addEventListener('input', onManualInput);
  unitSel.addEventListener('change', onManualInput);
  tolSel.addEventListener('change', () => {
    tolKey = tolSel.value;
    approximated = false;
    updateAll(false);
  });

  root.querySelectorAll<HTMLButtonElement>('[data-rc-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetOhms = Number(btn.dataset.rcQuick);
      applyOhmsInput(targetOhms);
      syncInputFromOhms(bandsToOhms({ mode, d1, d2, d3, multKey, tolKey }).ohms);
    });
  });

  updateAll(true);
}
