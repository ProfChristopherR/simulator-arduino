import type { BoardSpec, PinCategory } from '../types';

const PIN_CATEGORY_META: Array<{ cat: PinCategory; label: string; color: string }> = [
  { cat: 'pwr', label: 'Alimentación (5V / 3.3V / VIN)', color: 'var(--k-pwr)' },
  { cat: 'gnd', label: 'Tierra (GND)', color: 'var(--k-gnd)' },
  { cat: 'dig', label: 'Digital / PWM (~)', color: 'var(--k-dig)' },
  { cat: 'ana', label: 'Analógico (ADC)', color: 'var(--k-ana)' },
  { cat: 'com', label: 'Buses (I²C / SPI / UART)', color: 'var(--k-com)' },
  { cat: 'ctl', label: 'Control / Reset', color: 'var(--k-ctl)' },
];

export function renderLesson(
  root: HTMLElement,
  spec: BoardSpec,
  onFocusPart: (partId: string) => void
): void {
  const colorOfCat = (cat: PinCategory) =>
    PIN_CATEGORY_META.find((m) => m.cat === cat)?.color ?? 'var(--navy)';

  root.innerHTML = `
    <header class="lesson-header">
      <span class="section-num">02 · LECCIÓN TÉCNICA DE LA PLACA</span>
      <h2>${spec.name}: lo que debes dominar antes de conectar</h2>
    </header>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>En resumen</h3>
        <p>${spec.eyebrow}</p>
      </div>
      <div>
        <p style="font-size:1.05rem;margin-top:0">${spec.summary}</p>
        <div class="stat-strip">
          <div class="stat-box"><span>Reloj</span><strong>${spec.clock}</strong></div>
          <div class="stat-box"><span>Flash</span><strong>${spec.flash}</strong></div>
          <div class="stat-box"><span>RAM</span><strong>${spec.ram}</strong></div>
          <div class="stat-box"><span>Pines I/O</span><strong>${spec.gpioSummary}</strong></div>
          <div class="stat-box"><span>Lógica</span><strong>${spec.logicVoltage} V</strong></div>
          <div class="stat-box"><span>Ref. Taller</span><strong>${spec.priceRef}</strong></div>
        </div>
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Especificaciones</h3>
        <p>Hoja técnica resumida</p>
      </div>
      <div class="specs-grid">
        ${spec.specs
          .map((s) => `<div class="spec-item"><span>${s.label}</span><strong>${s.value}</strong></div>`)
          .join('')}
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Qué hay en la placa</h3>
        <p>${spec.parts.length} bloques clave. Haz clic para enfocarlo en el visor 3D superior.</p>
      </div>
      <div class="parts-grid">
        ${spec.parts
          .map(
            (p) => `
          <button type="button" class="part-card" data-focus-part="${p.id}">
            <div class="part-card-head">
              <span class="part-num">${p.num}</span>
              <strong>${p.name}</strong>
            </div>
            <p>${p.summary}</p>
          </button>`
          )
          .join('')}
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Fortalezas y precauciones</h3>
        <p>Buenas prácticas del taller Geogo</p>
      </div>
      <div class="strengths-grid">
        <div class="strength-box is-good">
          <h4>Fortalezas</h4>
          <ul>${spec.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="strength-box is-warn">
          <h4>Cuidado con...</h4>
          <ul>${spec.pitfalls.map((s) => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Mapa de pines</h3>
        <p>Dónde conectar energía y sensores</p>
      </div>
      <div>
        <div class="specs-grid" style="margin-bottom:18px">
          ${spec.pinGroups
            .map((g) => `<div class="spec-item"><span>${g.title}</span><p style="margin:4px 0 0;font-size:.86rem">${g.body}</p></div>`)
            .join('')}
        </div>
        <div class="pin-table">
          ${spec.pins
            .slice(0, 24)
            .map(
              (pin) => `
            <div class="pin-chip" style="--pin-color:${colorOfCat(pin.category)}">
              <strong>${pin.label}</strong>
              <small>${pin.description}</small>
            </div>`
            )
            .join('')}
        </div>
        <div class="pin-legend">
          ${PIN_CATEGORY_META.map(
            (m) =>
              `<span class="pin-legend-item"><span class="pin-dot" style="background:${m.color}"></span>${m.label}</span>`
          ).join('')}
        </div>
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Primer código</h3>
        <p>Prueba base de funcionamiento</p>
      </div>
      <div class="first-code-box">
        <div class="first-code-bar">
          <span>${spec.firstCodeTitle}</span>
          <button type="button" class="wb-mini-btn" id="lesson-copy-code">Copiar código</button>
        </div>
        <pre><code>${spec.firstCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
      </div>
    </div>

    <div class="lesson-row">
      <div class="lesson-row-label">
        <h3>Dónde destaca</h3>
        <p>Aplicaciones en Tecnología Geogo</p>
      </div>
      <div class="specs-grid">
        ${spec.highlights.map((h) => `<div class="spec-item"><strong>${h}</strong></div>`).join('')}
      </div>
    </div>
  `;

  root.querySelectorAll<HTMLElement>('[data-focus-part]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.focusPart;
      if (id) {
        onFocusPart(id);
        document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  root.querySelector('#lesson-copy-code')?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(spec.firstCode).catch(() => {});
    const btn = e.currentTarget as HTMLButtonElement;
    btn.textContent = 'Copiado';
    setTimeout(() => (btn.textContent = 'Copiar código'), 1500);
  });
}
