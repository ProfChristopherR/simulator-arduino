import { formatOhms } from '../lab/components/catalog';

export interface HydraulicState {
  heightMeters: number; // 0..10 m (= V)
  nivelAgua: number; // 0..1
  aperturaPct: number; // 0..100
  ohms: number; // 22..2200 or Infinity when apertura === 0
  flowAmps: number; // Real I = V / R
  flowMa: number; // mA (at 2.5 V / 220 Ω = 11.4 mA)
  flowLps: number; // Litros/seg para el diagrama hidráulico
  powerW: number; // Real P = V * I
  velocityNorm: number; // k * (nivelAgua / ohms), 0..1 visual speed
  rpm: number; // Giro mecánico de la rueda hidráulica
}

export function ohmsToAperturaPct(ohms: number, isClosed = false): number {
  if (isClosed || !Number.isFinite(ohms) || ohms > 5000) return 0;
  const clamped = Math.max(22, Math.min(2000, ohms));
  const pct = (Math.log(2200 / clamped) / Math.log(100)) * 100;
  return Math.max(1, Math.min(100, Math.round(pct)));
}

export function aperturaPctToOhms(aperturaPct: number): number {
  const pct = Math.max(0, Math.min(100, aperturaPct));
  if (pct <= 0) return Infinity;
  return Math.round(2200 * Math.pow(0.01, pct / 100));
}

export function computeHydraulicState(
  heightMeters: number,
  aperturaPct: number,
  overrideOhms?: number
): HydraulicState {
  const h = Math.max(0, Math.min(10, heightMeters));
  const nivelAgua = h / 10;
  const ap = Math.max(0, Math.min(100, aperturaPct));
  const closed = ap <= 0;

  const ohms = closed
    ? Infinity
    : overrideOhms && Number.isFinite(overrideOhms)
      ? Math.max(22, overrideOhms)
      : aperturaPctToOhms(ap);

  if (nivelAgua <= 0 || closed || !Number.isFinite(ohms)) {
    return {
      heightMeters: h,
      nivelAgua,
      aperturaPct: ap,
      ohms: closed ? Infinity : ohms,
      flowAmps: 0,
      flowMa: 0,
      flowLps: 0,
      powerW: 0,
      velocityNorm: 0,
      rpm: 0,
    };
  }

  // Ley de Ohm pura: I = V / R (ej. 2.5 V / 220 Ω = 11.36 mA -> 11.4 mA)
  const flowAmps = h / ohms;
  const flowMa = flowAmps * 1000;
  const powerW = h * flowAmps;

  // velocidad = k * (nivelAgua / resistencia), normalizada suavemente
  const k = 32;
  const velocityNorm = Math.min(1.6, Math.max(0.04, k * (nivelAgua / ohms)));
  const flowLps = Number((flowMa * 0.12).toFixed(2));
  const rpm = Math.round(Math.min(180, nivelAgua * velocityNorm * 145));

  return {
    heightMeters: h,
    nivelAgua,
    aperturaPct: ap,
    ohms,
    flowAmps,
    flowMa,
    flowLps,
    powerW,
    velocityNorm,
    rpm,
  };
}

interface DropParticle {
  // Segmento 0: horizontal antes/en/después válvula, Segmento 1: codo+caída libre
  phase: 'pipe' | 'fall';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  laneOffset: number; // -1..1 posición vertical normalizada en Tramo 1
  hitWheel: boolean;
}

interface SplashRipple {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export interface GravityWaterAnalogyHandle {
  syncFromElectric: (volts: number, ohms: number, isClosed: boolean) => void;
  destroy: () => void;
}

export function mountGravityWaterAnalogy(
  host: HTMLElement,
  opts: {
    initialVolts: number;
    initialOhms: number;
    onInput: (volts: number, ohms: number, isClosed: boolean) => void;
  }
): GravityWaterAnalogyHandle {
  host.innerHTML = `
    <div class="water-canvas-wrap">
      <canvas class="water-canvas" width="560" height="310" aria-label="Simulación hidráulica por gravedad pura"></canvas>
    </div>

    <div class="water-controls-grid">
      <div class="ctrl-group">
        <label class="ctrl-label" for="wa-height-range">
          <span>Altura de agua (<span class="math-var">Δh</span>)</span>
          <span id="wa-height-lbl">5.0 m (50%)</span>
        </label>
        <input id="wa-height-range" type="range" min="0" max="10" step="0.5" value="${opts.initialVolts}" />
      </div>
      <div class="ctrl-group">
        <label class="ctrl-label" for="wa-valve-range">
          <span>Apertura de llave (<span class="math-var">1/R</span>)</span>
          <span id="wa-valve-lbl">50% abierta</span>
        </label>
        <input id="wa-valve-range" type="range" min="0" max="100" step="1" value="${ohmsToAperturaPct(opts.initialOhms)}" />
      </div>
    </div>

    <div class="water-equiv-card" aria-label="Tabla de equivalencia Hidráulica a Electricidad">
      <div class="water-equiv-head">Tabla de equivalencia directa · Hidráulica ↔ Electricidad</div>
      <div class="water-equiv-table">
        <div class="water-equiv-row">
          <span class="weq-hydro">Altura del agua (<strong id="weq-h-val">5.0 m</strong>)</span>
          <span class="weq-arrow">↔</span>
          <span class="weq-elec">Voltaje (<span class="math-var">V</span>) = <strong id="weq-v-val">5.0 V</strong></span>
        </div>
        <div class="water-equiv-row">
          <span class="weq-hydro">Cierre de llave (<strong id="weq-close-val">50% cerrada</strong>)</span>
          <span class="weq-arrow">↔</span>
          <span class="weq-elec">Resistencia (<span class="math-var">R</span>) = <strong id="weq-r-val">220 Ω</strong></span>
        </div>
        <div class="water-equiv-row">
          <span class="weq-hydro">Caudal de agua (<strong id="weq-flow-val">2.7 L/s</strong>)</span>
          <span class="weq-arrow">↔</span>
          <span class="weq-elec">Corriente (<span class="math-var">I = V/R</span>) = <strong id="weq-i-val">22.7 mA</strong></span>
        </div>
        <div class="water-equiv-row">
          <span class="weq-hydro">Giro de la rueda (<strong id="weq-rpm-val">70 RPM</strong>)</span>
          <span class="weq-arrow">↔</span>
          <span class="weq-elec">Potencia (<span class="math-var">P = V·I</span>) = <strong id="weq-p-val">0.114 W</strong></span>
        </div>
      </div>
    </div>
  `;

  const canvas = host.querySelector<HTMLCanvasElement>('.water-canvas')!;
  const ctx = canvas.getContext('2d')!;
  const hSlider = host.querySelector<HTMLInputElement>('#wa-height-range')!;
  const vSlider = host.querySelector<HTMLInputElement>('#wa-valve-range')!;

  let heightMeters = opts.initialVolts;
  let aperturaPct = ohmsToAperturaPct(opts.initialOhms);
  let overrideOhms: number | undefined = opts.initialOhms;
  let state = computeHydraulicState(heightMeters, aperturaPct, overrideOhms);

  // Estado de animación
  let wheelAngle = 0;
  let weightLift = 0.12; // 0 (abajo) .. 1 (arriba junto a polea)
  let lowerFill = 0.24; // Nivel del estanque inferior (0.14 .. 0.72)
  let spawnAccum = 0;
  let simTime = 0;
  const drops: DropParticle[] = [];
  const ripples: SplashRipple[] = [];

  // Coordenadas lógicas fijas (560 x 310)
  const W = 560;
  const H = 310;
  const TANK_X = 36;
  const TANK_W = 90;
  const TANK_TOP = 44;
  const TANK_BOT = 162; // fondo interno estanque superior
  const PIPE_Y1 = 135;
  const PIPE_Y2 = 161;
  const PIPE_MID_Y = (PIPE_Y1 + PIPE_Y2) / 2; // 148
  const PIPE_H = PIPE_Y2 - PIPE_Y1; // 26
  const VALVE_X1 = 232;
  const VALVE_X2 = 300;
  const ELBOW_X = 342;
  const NOZZLE_END_Y = 180;
  const WHEEL_CX = 382;
  const WHEEL_CY = 214;
  const WHEEL_R = 33;
  const LOWER_X1 = 252;
  const LOWER_X2 = 528;
  const LOWER_TOP = 258;
  const LOWER_BOT = 296;

  // Sembrar gotas iniciales en Tramo 1 si hay agua
  for (let i = 0; i < 16; i++) {
    drops.push({
      phase: 'pipe',
      x: 132 + i * 11,
      y: PIPE_MID_Y + ((i % 3) - 1) * 5.5,
      vx: 0,
      vy: 0,
      r: 5.5,
      laneOffset: ((i % 3) - 1) * 0.65,
      hitWheel: false,
    });
  }

  const updateDomReadouts = () => {
    const hPct = Math.round(state.nivelAgua * 100);
    host.querySelector('#wa-height-lbl')!.textContent = `${state.heightMeters.toFixed(1)} m (${hPct}%)`;
    host.querySelector('#wa-valve-lbl')!.textContent =
      state.aperturaPct <= 0 ? '0% (Cerrada)' : `${Math.round(state.aperturaPct)}% abierta`;

    host.querySelector('#weq-h-val')!.textContent = `${state.heightMeters.toFixed(1)} m`;
    host.querySelector('#weq-v-val')!.textContent = `${state.heightMeters.toFixed(1)} V`;

    const closedPct = Math.round(100 - state.aperturaPct);
    host.querySelector('#weq-close-val')!.textContent = `${closedPct}% cerrada`;
    host.querySelector('#weq-r-val')!.textContent = Number.isFinite(state.ohms)
      ? formatOhms(state.ohms)
      : '∞ Ω (Abierto)';

    host.querySelector('#weq-flow-val')!.textContent = `${state.flowLps.toFixed(2)} L/s`;
    host.querySelector('#weq-i-val')!.textContent = `${state.flowMa.toFixed(1)} mA`;
    host.querySelector('#weq-rpm-val')!.textContent = `${state.rpm} RPM`;
    host.querySelector('#weq-p-val')!.textContent = `${state.powerW.toFixed(3)} W`;
  };

  hSlider.addEventListener('input', () => {
    heightMeters = Number(hSlider.value);
    state = computeHydraulicState(heightMeters, aperturaPct, overrideOhms);
    updateDomReadouts();
    opts.onInput(heightMeters, Number.isFinite(state.ohms) ? state.ohms : 2000, aperturaPct <= 0);
  });

  vSlider.addEventListener('input', () => {
    aperturaPct = Number(vSlider.value);
    overrideOhms = undefined;
    state = computeHydraulicState(heightMeters, aperturaPct);
    updateDomReadouts();
    opts.onInput(heightMeters, Number.isFinite(state.ohms) ? state.ohms : 2000, aperturaPct <= 0);
  });

  updateDomReadouts();

  let rafId = 0;
  let lastTs = performance.now();

  const drawFrame = (now: number) => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    simTime += dt;

    // DPR seguro para pantallas retina
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.round(W * dpr);
    const targetH = Math.round(H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Física por cuadro
    const velPx = state.velocityNorm * 135; // px/s en tramo normal
    const valveGap = (state.aperturaPct / 100) * PIPE_H;
    const isFlowing = state.nivelAgua > 0 && state.aperturaPct > 0;

    // Nivel de estanque inferior drena lentamente hacia equilibrio salvo cuando recibe chorro
    lowerFill = Math.max(0.16, lowerFill - dt * 0.014);

    if (isFlowing) {
      // Generación de gotas proporcional a velocidad y presión
      spawnAccum += dt * (4.5 + state.velocityNorm * 12);
      while (spawnAccum >= 1) {
        spawnAccum -= 1;
        const lane = ((Math.random() * 2 - 1) * 0.72);
        drops.push({
          phase: 'pipe',
          x: TANK_X + TANK_W,
          y: PIPE_MID_Y + lane * (PIPE_H * 0.34),
          vx: velPx,
          vy: 0,
          r: 4.8 + state.nivelAgua * 2.0,
          laneOffset: lane,
          hitWheel: false,
        });
      }
    } else if (state.nivelAgua <= 0) {
      // Si nivelAgua === 0, partículas en tubería frenan inmediatamente
      for (const p of drops) {
        if (p.phase === 'pipe') {
          p.vx = 0;
        }
      }
    }

    const lowerWaterTopY = LOWER_BOT - lowerFill * (LOWER_BOT - LOWER_TOP - 4);

    for (let i = drops.length - 1; i >= 0; i--) {
      const p = drops[i];
      if (p.phase === 'pipe') {
        if (!isFlowing) {
          p.vx = 0;
          // Quitar gotas colgantes si se vació el estanque arriba
          if (state.nivelAgua <= 0 && p.x > VALVE_X2) {
            p.phase = 'fall';
          }
          continue;
        }

        const inValve = p.x >= VALVE_X1 - 6 && p.x <= VALVE_X2 + 6;
        const speedFactor = inValve && valveGap > 1 ? Math.min(2.1, PIPE_H / Math.max(7, valveGap)) : 1;
        p.vx = velPx * speedFactor;
        p.x += p.vx * dt;

        // En Tramo 2 las partículas se estrechan / alinean al centro según espacio entre compuertas
        const allowedHalf = inValve
          ? Math.max(1.5, valveGap * 0.35)
          : PIPE_H * 0.35;
        const targetY = PIPE_MID_Y + p.laneOffset * allowedHalf;
        p.y += (targetY - p.y) * Math.min(1, dt * 14);

        if (p.x >= ELBOW_X - 2) {
          p.phase = 'fall';
          p.x = ELBOW_X + (Math.random() - 0.5) * 7;
          p.y = PIPE_MID_Y + 6;
          p.vx = (Math.random() - 0.5) * 14;
          p.vy = 45 + state.nivelAgua * 90;
        }
      } else {
        // Caída libre acelerada por gravedad en Tramo 3 sobre las paletas
        p.vy += 430 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Impacto sobre las paletas izquierdas de la rueda hidráulica
        const dx = p.x - WHEEL_CX;
        const dy = p.y - WHEEL_CY;
        const dist = Math.hypot(dx, dy);
        if (!p.hitWheel && dist <= WHEEL_R + 4 && dist >= WHEEL_R - 14 && dx < 12) {
          p.hitWheel = true;
          p.vx = -22 - Math.random() * 18;
          p.vy *= 0.45;
        }

        // Desaparecer al tocar superficie del estanque inferior haciéndolo subir levemente
        if (p.y >= lowerWaterTopY) {
          if (p.x >= LOWER_X1 + 6 && p.x <= LOWER_X2 - 6) {
            lowerFill = Math.min(0.74, lowerFill + 0.0022);
            if (ripples.length < 10) {
              ripples.push({ x: p.x, y: lowerWaterTopY, r: 2, alpha: 0.75 });
            }
          }
          drops.splice(i, 1);
        } else if (p.y > H + 12) {
          drops.splice(i, 1);
        }
      }
    }

    // Limitar partículas para rendimiento 60fps
    if (drops.length > 95) drops.splice(0, drops.length - 95);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += dt * 32;
      rp.alpha -= dt * 1.4;
      if (rp.alpha <= 0) ripples.splice(i, 1);
    }

    // Rotación de rueda proporcional a nivelAgua * velocidad (= V * I) + levantamiento de pesa
    const rotInc = dt * (state.nivelAgua * state.velocityNorm) * 7.2;
    wheelAngle += rotInc;
    if (isFlowing) {
      weightLift += dt * Math.min(0.32, state.nivelAgua * state.velocityNorm * 0.22);
      if (weightLift > 1) weightLift = 0.05;
    } else {
      // Cae suavemente al reposo si no hay par motor
      weightLift = Math.max(0.05, weightLift - dt * 0.08);
    }

    // =====================================================================
    // RENDERIZADO EN CANVAS OSCURO (SOLO VOCABULARIO HIDRÁULICO PURO)
    // =====================================================================
    ctx.fillStyle = '#11151c';
    ctx.fillRect(0, 0, W, H);

    // Cuadrícula sutil de laboratorio
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    for (let gx = 20; gx < W; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 20; gy < H; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // 1. ESTANQUE INFERIOR (Recipiente ancho abierto abajo a la derecha — SIN retorno)
    const lowerWaterH = Math.max(0, LOWER_BOT - lowerWaterTopY);
    if (lowerWaterH > 1) {
      const gradBot = ctx.createLinearGradient(0, lowerWaterTopY, 0, LOWER_BOT);
      gradBot.addColorStop(0, 'rgba(56, 189, 248, 0.78)');
      gradBot.addColorStop(1, 'rgba(29, 78, 216, 0.92)');
      ctx.fillStyle = gradBot;
      ctx.fillRect(LOWER_X1 + 3, lowerWaterTopY, LOWER_X2 - LOWER_X1 - 6, lowerWaterH - 2);

      // Olas suaves y ondas de salpicadura en la superficie
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(LOWER_X1 + 3, lowerWaterTopY);
      ctx.lineTo(LOWER_X2 - 3, lowerWaterTopY);
      ctx.stroke();

      for (const rp of ripples) {
        ctx.strokeStyle = `rgba(186, 230, 253, ${rp.alpha.toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Paredes en U abiertas arriba del estanque inferior
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(LOWER_X1, LOWER_TOP);
    ctx.lineTo(LOWER_X1, LOWER_BOT);
    ctx.lineTo(LOWER_X2, LOWER_BOT);
    ctx.lineTo(LOWER_X2, LOWER_TOP);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESTANQUE INFERIOR (DESCARGA)', (LOWER_X1 + LOWER_X2) / 2, LOWER_BOT - 7);

    // 2. TUBERÍA EN ESCALÓN (Tramo 1 -> Tramo 2 Válvula -> Tramo 3 Codo 90° vertical)
    ctx.fillStyle = '#1e293b';
    // Interior horizontal
    ctx.fillRect(TANK_X + TANK_W - 2, PIPE_Y1, ELBOW_X - (TANK_X + TANK_W) + 15, PIPE_H);
    // Interior vertical boquilla Tramo 3
    ctx.fillRect(ELBOW_X - 13, PIPE_Y1, 26, NOZZLE_END_Y - PIPE_Y1);

    // Agua de fondo tenue dentro del tramo 1 si hay agua arriba
    if (state.nivelAgua > 0) {
      ctx.fillStyle = `rgba(37, 99, 235, ${(0.28 + state.nivelAgua * 0.26).toFixed(2)})`;
      ctx.fillRect(TANK_X + TANK_W, PIPE_Y1 + 1, VALVE_X1 - (TANK_X + TANK_W), PIPE_H - 2);
      if (isFlowing) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.fillRect(VALVE_X1, PIPE_Y1 + 1, ELBOW_X - VALVE_X1 + 12, PIPE_H - 2);
        ctx.fillRect(ELBOW_X - 9, PIPE_Y1 + 1, 18, NOZZLE_END_Y - PIPE_Y1);
      }
    }

    // Paredes de tubería
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    // Pared superior Tramo 1 -> esquina externa codo -> bajada derecha Tramo 3
    ctx.moveTo(TANK_X + TANK_W, PIPE_Y1);
    ctx.lineTo(ELBOW_X + 13, PIPE_Y1);
    ctx.lineTo(ELBOW_X + 13, NOZZLE_END_Y);
    // Pared inferior Tramo 1 -> esquina interna codo -> bajada izquierda Tramo 3
    ctx.moveTo(TANK_X + TANK_W, PIPE_Y2);
    ctx.lineTo(ELBOW_X - 13, PIPE_Y2);
    ctx.lineTo(ELBOW_X - 13, NOZZLE_END_Y);
    ctx.stroke();

    // 3. PARTÍCULAS DE AGUA (Tramo 1 densas/grandes -> Tramo 2 estrechadas -> Tramo 3 caída libre)
    for (const p of drops) {
      if (p.phase === 'pipe' && state.nivelAgua <= 0) continue;
      if (p.phase === 'pipe') {
        const beforeValve = p.x < VALVE_X1;
        const inValve = p.x >= VALVE_X1 && p.x <= VALVE_X2;
        const rx = beforeValve ? p.r : Math.max(3.6, p.r * 0.85);
        const ry = inValve
          ? Math.max(2.0, Math.min(p.r, valveGap * 0.38))
          : beforeValve
            ? p.r
            : p.r * 0.82;
        ctx.fillStyle = beforeValve ? '#2563eb' : '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Gota alargada verticalmente por gravedad
        ctx.fillStyle = p.hitWheel ? '#7dd3fc' : '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 3.2, 5.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. VÁLVULA / LLAVE DE PASO EN TRAMO 2 (Compuertas que cierran hasta tocarse en 0%)
    const valveCx = (VALVE_X1 + VALVE_X2) / 2;
    ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(VALVE_X1, PIPE_Y1 - 10, VALVE_X2 - VALVE_X1, PIPE_H + 20, 6);
    ctx.fill();
    ctx.stroke();

    const gateReach = Math.max(0, (PIPE_H - valveGap) / 2);
    const gateW = 24;
    const gateX = valveCx - gateW / 2;
    ctx.fillStyle = state.aperturaPct <= 0 ? '#ef4444' : '#00c2b5';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    if (gateReach > 0.3) {
      // Compuerta superior
      ctx.fillRect(gateX, PIPE_Y1, gateW, gateReach);
      ctx.strokeRect(gateX, PIPE_Y1, gateW, gateReach);
      // Compuerta inferior
      ctx.fillRect(gateX, PIPE_Y2 - gateReach, gateW, gateReach);
      ctx.strokeRect(gateX, PIPE_Y2 - gateReach, gateW, gateReach);
    }
    // Tallo + manilla de llave arriba
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(valveCx, PIPE_Y1 - 10);
    ctx.lineTo(valveCx, PIPE_Y1 - 24);
    ctx.moveTo(valveCx - 14, PIPE_Y1 - 24);
    ctx.lineTo(valveCx + 14, PIPE_Y1 - 24);
    ctx.stroke();

    // 5. ESTANQUE SUPERIOR (Forma en U SIN tapa arriba + regla 0 m..10 m)
    if (state.nivelAgua > 0) {
      const fillH = state.nivelAgua * (TANK_BOT - TANK_TOP - 2);
      const waterY = TANK_BOT - fillH;
      const gradTop = ctx.createLinearGradient(0, waterY, 0, TANK_BOT);
      gradTop.addColorStop(0, '#38bdf8');
      gradTop.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = gradTop;
      ctx.fillRect(TANK_X + 2, waterY, TANK_W - 4, fillH);

      // Menisco animado arriba del agua
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let wx = TANK_X + 2; wx <= TANK_X + TANK_W - 2; wx += 4) {
        const wy = waterY + Math.sin(wx * 0.14 + simTime * 4) * (isFlowing ? 1.5 : 0.4);
        if (wx === TANK_X + 2) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VACÍO', TANK_X + TANK_W / 2, TANK_BOT - 12);
    }

    // Paredes en U abiertas arriba (con abertura de salida derecha para Tramo 1)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TANK_X, TANK_TOP);
    ctx.lineTo(TANK_X, TANK_BOT + 1);
    ctx.lineTo(TANK_X + TANK_W, TANK_BOT + 1);
    ctx.moveTo(TANK_X + TANK_W, TANK_TOP);
    ctx.lineTo(TANK_X + TANK_W, PIPE_Y1);
    ctx.stroke();

    // Escala graduada en metros (0 m a 10 m) en pared izquierda
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    for (let m = 0; m <= 10; m += 2) {
      const ty = TANK_BOT - (m / 10) * (TANK_BOT - TANK_TOP - 2);
      ctx.beginPath();
      ctx.moveTo(TANK_X - 5, ty);
      ctx.lineTo(TANK_X, ty);
      ctx.stroke();
      ctx.fillText(`${m} m`, TANK_X - 7, ty + 3);
    }

    // 6. RUEDA HIDRÁULICA (Derecha nivel medio) + CUERDA + PESA QUE SUBE
    ctx.save();
    ctx.translate(WHEEL_CX, WHEEL_CY);
    ctx.rotate(wheelAngle);

    // Aro exterior e interior
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
    ctx.stroke();

    // 8 paletas
    for (let b = 0; b < 8; b++) {
      const ang = (b * Math.PI) / 4;
      ctx.save();
      ctx.rotate(ang);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(WHEEL_R, 0);
      ctx.stroke();
      ctx.fillStyle = '#00c2b5';
      ctx.fillRect(WHEEL_R - 7, -3, 8, 6);
      ctx.restore();
    }
    // Eje central de la rueda
    ctx.fillStyle = '#eee3cc';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00c2b5';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Polea superior + cuerda enrollada desde el eje que levanta una pesa
    const PULLEY_X = 486;
    const PULLEY_Y = 126;
    const weightY = 236 - weightLift * 84; // Sube hacia 152 según el trabajo mecánico

    // Soporte de polea
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PULLEY_X, PULLEY_Y - 18);
    ctx.lineTo(PULLEY_X, PULLEY_Y);
    ctx.stroke();

    // Cuerda tensa desde eje rueda -> polea -> pesa
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WHEEL_CX + 4, WHEEL_CY - 4);
    ctx.lineTo(PULLEY_X - 6, PULLEY_Y);
    ctx.lineTo(PULLEY_X + 7, PULLEY_Y);
    ctx.lineTo(PULLEY_X + 7, weightY);
    ctx.stroke();

    // Rueda de polea
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(PULLEY_X, PULLEY_Y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pesa colgante que sube al girar
    const wBoxX = PULLEY_X + 7;
    ctx.fillStyle = '#e88635';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(wBoxX - 11, weightY, 22, 18, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#151515';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PESA', wBoxX, weightY + 12);

    // =====================================================================
    // 7. ETIQUETAS DENTRO DEL GRÁFICO OSCURO (100% HIDRÁULICAS, CERO ELÉCTRICAS)
    // =====================================================================
    ctx.textAlign = 'center';

    // Arriba izquierda: ALTURA DEL AGUA (Presión)
    ctx.fillStyle = '#5ef2e6';
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.fillText('ALTURA DEL AGUA (Presión)', TANK_X + TANK_W / 2 + 6, 20);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(`${state.heightMeters.toFixed(1)} m`, TANK_X + TANK_W / 2, 34);

    // Centro: LLAVE DE PASO (Oposición)
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.fillText('LLAVE DE PASO (Oposición)', valveCx, 90);
    ctx.fillStyle = state.aperturaPct <= 0 ? '#f87171' : '#cbd5e1';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(
      state.aperturaPct <= 0 ? 'Cerrada (0%)' : `Apertura: ${Math.round(state.aperturaPct)}%`,
      valveCx,
      192
    );

    // Chorro: CAUDAL (Litros/seg)
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.fillText('CAUDAL (Litros/seg)', ELBOW_X + 26, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11.5px "JetBrains Mono", monospace';
    ctx.fillText(`${state.flowLps.toFixed(2)} L/s`, ELBOW_X + 26, 72);

    // Rueda / Tacómetro: RUEDA HIDRÁULICA (Trabajo/seg)
    ctx.fillStyle = '#5ef2e6';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('RUEDA HIDRÁULICA', WHEEL_CX + 58, 92);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText('(Trabajo/seg)', WHEEL_CX + 58, 105);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.rpm} RPM`, PULLEY_X + 22, PULLEY_Y + 4);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`${state.powerW.toFixed(3)} W mec.`, PULLEY_X + 22, PULLEY_Y + 18);

    rafId = requestAnimationFrame(drawFrame);
  };

  rafId = requestAnimationFrame(drawFrame);

  return {
    syncFromElectric(volts: number, ohms: number, isClosed: boolean) {
      heightMeters = Math.max(0, Math.min(10, volts));
      overrideOhms = isClosed ? undefined : ohms;
      aperturaPct = isClosed ? 0 : ohmsToAperturaPct(ohms, false);
      hSlider.value = String(heightMeters);
      vSlider.value = String(aperturaPct);
      state = computeHydraulicState(heightMeters, aperturaPct, overrideOhms);
      updateDomReadouts();
    },
    destroy() {
      cancelAnimationFrame(rafId);
    },
  };
}
