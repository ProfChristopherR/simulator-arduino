export interface CapacitorAnimHandle {
  setCharging: (charging: boolean) => void;
  destroy: () => void;
}

interface ElectronDot {
  /** Posición normalizada 0..1 a lo largo del lazo de carga */
  s: number;
}

/**
 * Simulación animada de carga/descarga de un condensador conectado a una pila 5 V.
 * Los electrones (e⁻) salen de la placa izquierda (+), pasan por la pila (+ -> −)
 * y se acumulan progresivamente en la placa derecha (−), frenando al llenarse.
 */
export function mountCapacitorCanvas(
  host: HTMLElement,
  initialCharging: boolean
): CapacitorAnimHandle {
  host.innerHTML = `
    <div style="background:#11151c;border-radius:10px;overflow:hidden;border:1px solid rgba(238,227,204,0.12)">
      <canvas class="cap-canvas" width="380" height="205" style="display:block;width:100%;height:auto;aspect-ratio:380/205" aria-label="Carga lenta del condensador con pila 5 V"></canvas>
    </div>
  `;

  const canvas = host.querySelector<HTMLCanvasElement>('.cap-canvas')!;
  const ctx = canvas.getContext('2d')!;

  let charging = initialCharging;
  let charge = initialCharging ? 0.08 : 0.0; // 0..1 (equivale a 0.0 V .. 5.0 V)
  let rafId = 0;
  let lastTs = performance.now();

  const electrons: ElectronDot[] = Array.from({ length: 14 }, (_, i) => ({
    s: i / 14,
  }));

  const W = 380;
  const H = 205;

  // Puntos del circuito cerrado en el canvas:
  // Capacitor arriba centro: x=244 (placa + izq x=230, placa - der x=258)
  // Pila a la izquierda: x=68 (polo + arriba y=64, polo - abajo y=108)
  // Interruptor S1 arriba izquierda: x=122..162, y=42
  // Camino físico de los electrones durante la CARGA:
  //   Placa + (230,42) -> arriba izq (162..122..68,42) -> entra por polo + pila (68,64)
  //   -> atraviesa pila -> sale polo - (68,108) -> baja (68,144) -> derecha (258,144) -> sube a Placa - (258,68)
  function pointOnLoop(s: number): { x: number; y: number } {
    const pts: Array<[number, number]> = [
      [230, 42],
      [68, 42],
      [68, 144],
      [258, 144],
      [258, 56],
    ];
    const segLens: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      segLens.push(len);
      total += len;
    }
    let dist = (((s % 1) + 1) % 1) * total;
    for (let i = 0; i < segLens.length; i++) {
      if (dist <= segLens[i] || i === segLens.length - 1) {
        const t = Math.max(0, Math.min(1, dist / segLens[i]));
        return {
          x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
          y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
        };
      }
      dist -= segLens[i];
    }
    return { x: pts[0][0], y: pts[0][1] };
  }

  const drawFrame = (now: number) => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    // Curva exponencial RC lenta (~3.5 s)
    if (charging) {
      charge = Math.min(1, charge + (1 - charge) * dt * 0.72 + (charge < 0.995 ? dt * 0.04 : 0));
      if (charge > 0.996) charge = 1;
    } else {
      charge = Math.max(0, charge - Math.max(0.03, charge) * dt * 1.15);
    }

    // Rapidez de flujo de electrones: máxima al iniciar carga, 0 cuando está cargado al 100%
    const flowSpeed = charging ? Math.max(0, (1 - charge) * 0.58) : charge > 0.01 ? -charge * 0.65 : 0;
    for (const e of electrons) {
      e.s = (((e.s + flowSpeed * dt) % 1) + 1) % 1;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(W * dpr);
    const th = Math.round(H * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#11151c';
    ctx.fillRect(0, 0, W, H);

    // Cables del lazo principal
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(230, 42);
    ctx.lineTo(164, 42);
    ctx.moveTo(124, 42);
    ctx.lineTo(68, 42);
    ctx.lineTo(68, 74);
    ctx.moveTo(68, 100);
    ctx.lineTo(68, 144);
    ctx.lineTo(258, 144);
    ctx.lineTo(258, 42);
    ctx.stroke();

    // Lazo secundario de descarga cuando S1 cambia a descarga
    ctx.strokeStyle = !charging ? '#f59e0b' : '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(144, 144);
    ctx.lineTo(144, 58);
    ctx.stroke();
    ctx.setLineDash([]);

    // Interruptor S1
    ctx.fillStyle = '#00c2b5';
    ctx.beginPath();
    ctx.arc(164, 42, 4, 0, Math.PI * 2);
    ctx.arc(124, 42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(164, 42);
    if (charging) {
      ctx.lineTo(124, 42);
    } else {
      ctx.lineTo(144, 58);
    }
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(charging ? 'S1 (PILA)' : 'S1 (DESCARGA)', 144, 24);

    // Pila / Fuente 5 V (polo + arriba largo rojo, polo - abajo corto gris)
    ctx.fillStyle = '#181e28';
    ctx.strokeStyle = charging ? '#00c2b5' : '#475569';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(42, 62, 52, 50, 7);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(52, 78);
    ctx.lineTo(84, 78);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(59, 94);
    ctx.lineTo(77, 94);
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('+', 49, 75);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('−', 49, 102);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('PILA 5V', 14, 90);

    // Electrones (e⁻) viajando cuando hay flujo
    if (Math.abs(flowSpeed) > 0.012) {
      for (const e of electrons) {
        const pt = charging
          ? pointOnLoop(e.s)
          : {
              x: 258 - e.s * 114,
              y: e.s < 0.5 ? 144 : 144 - (e.s - 0.5) * 204,
            };
        // Solo mostrar dentro del rango visible
        const drawX = charging ? pt.x : e.s < 0.35 ? 258 : e.s < 0.7 ? 258 - ((e.s - 0.35) / 0.35) * 114 : 144 + ((e.s - 0.7) / 0.3) * 86;
        const drawY = charging ? pt.y : e.s < 0.35 ? 54 + (e.s / 0.35) * 90 : e.s < 0.7 ? 144 : 144 - ((e.s - 0.7) / 0.3) * 102;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('−', drawX, drawY + 2.6);
      }
    }

    // Condensador: Placa izquierda (+) y Placa derecha (−)
    ctx.fillStyle = '#181818';
    ctx.fillRect(222, 16, 44, 52);

    // Campo eléctrico tenue entre placas
    if (charge > 0.05) {
      ctx.strokeStyle = `rgba(34, 197, 94, ${(charge * 0.42).toFixed(2)})`;
      ctx.lineWidth = 1.4;
      for (let fy = 26; fy <= 58; fy += 8) {
        ctx.beginPath();
        ctx.moveTo(234, fy);
        ctx.lineTo(254, fy);
        ctx.stroke();
      }
    }

    // Placa izquierda (+)
    ctx.strokeStyle = charge > 0.05 ? '#ef4444' : '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(230, 18);
    ctx.lineTo(230, 66);
    ctx.stroke();

    // Placa derecha (−)
    ctx.strokeStyle = charge > 0.05 ? '#38bdf8' : '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(258, 18);
    ctx.lineTo(258, 66);
    ctx.stroke();

    // Cargas acumuladas (+ izq, e⁻ der) visibles según porcentaje de carga
    const slots = Math.round(charge * 6);
    for (let i = 0; i < slots; i++) {
      const cy = 22 + i * 8;
      // + salen electrones en placa izquierda
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 10.5px monospace';
      ctx.fillText('+', 216, cy + 3);
      // e⁻ acumulados en placa derecha
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(272, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText('−', 272, cy + 2.8);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('CONDENSADOR', 324, 34);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8.8px "JetBrains Mono", monospace';
    ctx.fillText(charging ? 'e⁻ salen de +' : 'Neutralizando', 324, 48);
    ctx.fillText(charging ? 'y cargan −' : 'placas...', 324, 60);

    // Barra de voltaje V_C acumulado
    const volts = charge * 5.0;
    const pct = Math.round(charge * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(
      charge >= 0.99
        ? `CARGADO: ${volts.toFixed(1)} V (${pct}%)`
        : charging
          ? `CARGANDO POR LA PILA: ${volts.toFixed(1)} V (${pct}%)`
          : charge > 0.02
            ? `DESCARGANDO: ${volts.toFixed(1)} V (${pct}%)`
            : 'DESCARGADO: 0.0 V (0%)',
      200,
      168
    );

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(108, 178, 184, 14, 7);
    ctx.fill();
    ctx.stroke();

    if (charge > 0.01) {
      ctx.fillStyle = charge >= 0.98 ? '#22c55e' : '#00c2b5';
      ctx.beginPath();
      ctx.roundRect(110, 180, Math.max(8, 180 * charge), 10, 5);
      ctx.fill();
    }

    rafId = requestAnimationFrame(drawFrame);
  };

  rafId = requestAnimationFrame(drawFrame);

  return {
    setCharging(nextCharging: boolean) {
      charging = nextCharging;
    },
    destroy() {
      cancelAnimationFrame(rafId);
    },
  };
}
