import { BOARD_REGISTRY, getBoardSpec } from '../boards/registry';
import type { BoardId } from '../types';

export function renderCompareTable(
  root: HTMLElement,
  activeBoardId: BoardId,
  thumbnails: Map<BoardId, string>,
  onSelectBoard: (id: BoardId) => void
): void {
  const boardIds = Object.keys(BOARD_REGISTRY) as BoardId[];
  const rowsHtml = boardIds.map((id) => {
    const spec = getBoardSpec(id);
    const active = id === activeBoardId;
    const thumb = thumbnails.get(id) ?? '';
    const mcu = spec.specs[0]?.value ?? '—';
    const adc = spec.specs.find((s) => s.label.toLowerCase().includes('adc') || s.label.toLowerCase().includes('analóg'))?.value ?? '—';
    const wifi = spec.id === 'esp32' ? 'Wi-Fi + BLE' : '— (USB Serial)';
    return `
      <tr class="compare-row ${active ? 'is-active' : ''}" data-compare-board="${id}" tabindex="0" role="button" aria-pressed="${active}">
        <td>
          <div class="compare-board-cell">
            ${thumb ? `<img class="compare-thumb" src="${thumb}" alt="${spec.name}" width="56" height="40" />` : ''}
            <div>
              <strong>${spec.name}</strong>
              ${active ? '<span class="compare-badge">EN LA MESA</span>' : `<small>${spec.levelLabel}</small>`}
            </div>
          </div>
        </td>
        <td><code>${mcu}</code></td>
        <td><strong>${spec.clock}</strong></td>
        <td>${spec.flash}</td>
        <td>${spec.ram}</td>
        <td>${spec.gpioSummary}</td>
        <td>${adc}</td>
        <td>${wifi}</td>
        <td><span class="compare-logic ${spec.logicVoltage === 3.3 ? 'is-33' : 'is-5v'}">${spec.logicVoltage} V</span></td>
        <td>${spec.priceRef}</td>
      </tr>
    `;
  }).join('');

  root.innerHTML = `
    <header class="section-intro-head">
      <span class="section-num">04 · COMPARAR PLACAS</span>
      <h2>Arduino Uno R3 vs. ESP32 DevKit V1</h2>
      <p>
        Los datos técnicos que deciden qué placa usar en cada proyecto de Tecnología Geogo.
        Haz clic en cualquier fila para cargarla en el visor 3D y en la mesa de trabajo.
      </p>
    </header>

    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Microcontrolador</th>
            <th>Reloj</th>
            <th>Flash</th>
            <th>RAM</th>
            <th>Pines I/O</th>
            <th>ADC Analógico</th>
            <th>Inalámbrico</th>
            <th>Lógica</th>
            <th>Ref. Taller</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <p class="compare-footnote">
      Regla de seguridad en el taller: el voltaje lógico define la tolerancia máxima de los pines GPIO —
      nunca conectes señales de 5 V directamente a una placa de 3.3 V sin usar un Level Shifter.
    </p>
  `;

  root.querySelectorAll<HTMLTableRowElement>('[data-compare-board]').forEach((row) => {
    const activate = () => {
      const id = row.dataset.compareBoard as BoardId;
      if (id) {
        onSelectBoard(id);
        document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    row.addEventListener('click', activate);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}
