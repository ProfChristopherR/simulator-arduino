import { audio } from '../core/audio';
import type { HeroBoardViewer } from '../core/viewer';
import type { BoardPartDef, BoardSpec } from '../types';

// Orden técnico realista de soldadura: componentes bajos primero, conectores altos al final
const UNO_ASSEMBLY_ORDER = [
  'led_on',
  'led_l',
  'led_txrx',
  'crystal',
  'atmega16u2',
  'regulator',
  'caps',
  'reset_btn',
  'icsp',
  'mcu',
  'headers_dig',
  'headers_pwr',
  'headers_ana',
  'usb',
  'dc_jack',
];

const ESP_ASSEMBLY_ORDER = [
  'antenna',
  'led_gpio2',
  'cp2102',
  'ams1117',
  'btn_boot',
  'btn_en',
  'wroom',
  'usb_micro',
  'headers_esp',
];

export class PracticeController {
  private viewer: HeroBoardViewer;
  private spec: BoardSpec;

  private quizQuestions: BoardPartDef[] = [];
  private quizIndex = 0;
  private quizScore = 0;
  private quizAttempted = false;
  private quizUsedHint = false;
  private quizAwaitingNext = false;
  private quizActive = false;

  private assemblyParts: BoardPartDef[] = [];
  private assemblyPlaced = new Set<string>();
  private assemblySelectedId: string | null = null;
  private assemblyActive = false;
  private assemblyChallenge = false;
  private assemblySeconds = 0;
  private assemblyTimerId: number | null = null;
  private lastPlacedPart: BoardPartDef | null = null;

  constructor(viewer: HeroBoardViewer, initialSpec: BoardSpec) {
    this.viewer = viewer;
    this.spec = initialSpec;
    this.bindUI();
  }

  public setBoardSpec(spec: BoardSpec): void {
    this.spec = spec;
    this.stopQuiz();
    this.exitAssembly();
  }

  private syncHeroChrome(): void {
    const busy = this.quizActive || this.assemblyActive;
    const floatCard = document.getElementById('hero-card-float');
    const labelsCard = document.getElementById('hero-labels-card');
    const labelsBtn = document.getElementById('btn-hero-labels') as HTMLButtonElement | null;
    const boardDock = document.getElementById('hero-board-dock');
    const quizCard = document.getElementById('hero-quiz-card');
    const asmHud = document.getElementById('hero-assembly-hud');
    const asmTray = document.getElementById('hero-assembly-tray');
    const jumpQuiz = document.getElementById('btn-jump-quiz');
    const jumpAsm = document.getElementById('btn-jump-assemble');

    if (floatCard) floatCard.hidden = busy;
    if (labelsCard && busy) labelsCard.hidden = true;
    if (labelsBtn) {
      labelsBtn.disabled = this.quizActive;
      if (busy) {
        labelsBtn.classList.remove('is-active');
        labelsBtn.setAttribute('aria-pressed', 'false');
        this.viewer.setLabelsVisible(false);
      }
    }

    if (boardDock) boardDock.hidden = this.assemblyActive;
    if (quizCard) quizCard.hidden = !this.quizActive;
    if (asmHud) asmHud.hidden = !this.assemblyActive;
    if (asmTray) asmTray.hidden = !this.assemblyActive;

    jumpQuiz?.classList.toggle('is-active', this.quizActive);
    jumpAsm?.classList.toggle('is-active', this.assemblyActive);
  }

  public handleHeroPartClick(partId: string | null): void {
    if (!partId || !this.quizActive || this.quizAwaitingNext) return;

    const target = this.quizQuestions[this.quizIndex];
    const fb = document.getElementById('hero-quiz-feedback')!;
    const skipBtn = document.getElementById('hero-quiz-skip') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('hero-quiz-next') as HTMLButtonElement | null;

    if (partId === target.id) {
      audio.playSuccess();
      const cleanFirstTry = !this.quizAttempted && !this.quizUsedHint;
      if (cleanFirstTry) this.quizScore++;
      fb.textContent = cleanFirstTry
        ? `¡Exacto! ${target.name} (+1 punto).`
        : `Correcto: ${target.name}.`;
      fb.className = 'hq-feedback is-ok';
      this.quizAwaitingNext = true;
      if (skipBtn) skipBtn.hidden = true;
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.textContent =
          this.quizIndex + 1 >= this.quizQuestions.length ? 'Ver resultado' : 'Siguiente →';
      }
      this.renderQuizHeader();
    } else {
      this.quizAttempted = true;
      audio.playError();
      const clicked = this.spec.parts.find((p) => p.id === partId);
      fb.textContent = `Eso es "${clicked?.name ?? partId}". Intenta de nuevo o pide una pista.`;
      fb.className = 'hq-feedback is-bad';
    }
  }

  public handleHeroFootprintClick(partId: string): void {
    if (!this.assemblyActive || !this.assemblySelectedId) return;
    if (this.assemblyPlaced.has(partId)) return;

    const hintEl = document.getElementById('hero-asm-feedback');
    if (partId === this.assemblySelectedId) {
      this.placeAssemblyPart(partId);
      if (hintEl) {
        hintEl.textContent = '';
        hintEl.className = 'ha-feedback';
      }
    } else {
      audio.playError();
      const clicked = this.spec.parts.find((p) => p.id === partId);
      const selected = this.spec.parts.find((p) => p.id === this.assemblySelectedId);
      if (hintEl) {
        hintEl.textContent = `Esa huella pertenece a "${clicked?.name ?? partId}". Busca la huella de "${selected?.name ?? ''}".`;
        hintEl.className = 'ha-feedback is-bad';
      }
    }
  }

  private bindUI(): void {
    // Botones de la sección inferior (hacen scroll al Hero y activan el modo)
    document.getElementById('btn-start-quiz')?.addEventListener('click', () => {
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
      this.startQuiz();
    });
    document.getElementById('btn-start-assembly')?.addEventListener('click', () => {
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
      this.startAssembly();
    });

    // Controles del Quiz integrado en el Hero
    document.getElementById('hero-quiz-hint')?.addEventListener('click', () => {
      const target = this.quizQuestions[this.quizIndex];
      if (!target || this.quizAwaitingNext) return;
      this.quizUsedHint = true;
      const fb = document.getElementById('hero-quiz-feedback')!;
      fb.textContent = `Pista: ${target.quizHint}`;
      fb.className = 'hq-feedback is-hint';
      (document.getElementById('hero-quiz-hint') as HTMLButtonElement).disabled = true;
      audio.playClick(700, 30);
    });

    document.getElementById('hero-quiz-skip')?.addEventListener('click', () => {
      const target = this.quizQuestions[this.quizIndex];
      if (!target || this.quizAwaitingNext) return;
      this.quizAttempted = true;
      this.viewer.focusPart(target.id);
      const fb = document.getElementById('hero-quiz-feedback')!;
      fb.textContent = `Respuesta: ${target.name} (resaltado en dorado en la placa).`;
      fb.className = 'hq-feedback is-hint';
      this.quizAwaitingNext = true;
      const skipBtn = document.getElementById('hero-quiz-skip') as HTMLButtonElement | null;
      const nextBtn = document.getElementById('hero-quiz-next') as HTMLButtonElement | null;
      if (skipBtn) skipBtn.hidden = true;
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.textContent =
          this.quizIndex + 1 >= this.quizQuestions.length ? 'Ver resultado' : 'Siguiente →';
      }
    });

    document.getElementById('hero-quiz-next')?.addEventListener('click', () => {
      if (this.quizIndex >= this.quizQuestions.length) {
        this.startQuiz();
        return;
      }
      this.quizIndex++;
      this.renderQuizStep();
    });

    document.getElementById('hero-quiz-exit')?.addEventListener('click', () => this.stopQuiz());

    // Controles del Ensamblaje 3D integrado en el Hero
    document.getElementById('hero-asm-challenge')?.addEventListener('click', (e) => {
      this.assemblyChallenge = !this.assemblyChallenge;
      const btn = e.currentTarget as HTMLButtonElement;
      btn.setAttribute('aria-pressed', String(this.assemblyChallenge));
      btn.textContent = `Desafío: ${this.assemblyChallenge ? 'ON' : 'OFF'}`;
      this.viewer.setAssemblyHighlight(this.assemblySelectedId, this.assemblyChallenge);
    });

    document.getElementById('hero-asm-hint')?.addEventListener('click', () => {
      if (!this.assemblySelectedId) return;
      this.viewer.focusPart(this.assemblySelectedId);
      const part = this.spec.parts.find((p) => p.id === this.assemblySelectedId);
      const fb = document.getElementById('hero-asm-feedback');
      if (fb && part) {
        fb.textContent = `Ubicación: ${part.quizHint}`;
        fb.className = 'ha-feedback is-hint';
      }
      audio.playClick(720, 30);
    });

    document.getElementById('hero-asm-auto')?.addEventListener('click', () => {
      if (!this.assemblySelectedId) return;
      this.placeAssemblyPart(this.assemblySelectedId);
    });

    document.getElementById('hero-asm-restart')?.addEventListener('click', () => {
      this.startAssembly();
    });

    document.getElementById('hero-asm-exit')?.addEventListener('click', () => {
      this.exitAssembly();
    });
  }

  public startQuiz(): void {
    this.exitAssembly();
    this.quizQuestions = this.spec.parts.slice(0, 6);
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizActive = true;
    this.syncHeroChrome();
    this.viewer.setPreset('iso');
    this.viewer.highlightCallout(null);
    this.renderQuizStep();
  }

  private renderQuizHeader(): void {
    const prog = document.getElementById('hero-quiz-progress');
    const scoreBadge = document.getElementById('hero-quiz-score');
    const dots = document.getElementById('hero-quiz-dots');
    const total = this.quizQuestions.length;
    if (prog) {
      prog.textContent =
        this.quizIndex >= total
          ? `QUIZ COMPLETADO · ${this.spec.name}`
          : `PREGUNTA ${this.quizIndex + 1} DE ${total}`;
    }
    if (scoreBadge) scoreBadge.textContent = `${this.quizScore} / ${total} pts`;
    if (dots) {
      dots.innerHTML = this.quizQuestions
        .map(
          (_q, idx) =>
            `<span class="q-dot ${idx < this.quizIndex ? 'is-done' : idx === this.quizIndex ? 'is-cur' : ''}"></span>`
        )
        .join('');
    }
  }

  private renderQuizStep(): void {
    const prompt = document.getElementById('hero-quiz-prompt')!;
    const fb = document.getElementById('hero-quiz-feedback')!;
    const hintBtn = document.getElementById('hero-quiz-hint') as HTMLButtonElement | null;
    const skipBtn = document.getElementById('hero-quiz-skip') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('hero-quiz-next') as HTMLButtonElement | null;

    this.viewer.highlightCallout(null);
    this.quizAttempted = false;
    this.quizUsedHint = false;
    this.quizAwaitingNext = false;
    this.renderQuizHeader();

    if (this.quizIndex >= this.quizQuestions.length) {
      const total = this.quizQuestions.length;
      prompt.textContent = `Obtuviste ${this.quizScore} de ${total} al primer intento en ${this.spec.name}.`;
      fb.textContent =
        this.quizScore >= 5
          ? '¡Excelente dominio anatómico de la placa!'
          : 'Repasa las tarjetas en Clases e inténtalo de nuevo.';
      fb.className = 'hq-feedback is-ok';
      if (hintBtn) hintBtn.hidden = true;
      if (skipBtn) skipBtn.hidden = true;
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.textContent = 'Reintentar';
      }
      return;
    }

    const q = this.quizQuestions[this.quizIndex];
    prompt.textContent = `Haz clic sobre: ${q.name}`;
    const sub = document.getElementById('hero-quiz-sub');
    if (sub) sub.textContent = q.summary;
    fb.textContent = '';
    fb.className = 'hq-feedback';

    if (hintBtn) {
      hintBtn.hidden = false;
      hintBtn.disabled = false;
    }
    if (skipBtn) skipBtn.hidden = false;
    if (nextBtn) nextBtn.hidden = true;
  }

  public stopQuiz(): void {
    this.quizActive = false;
    this.viewer.highlightCallout(null);
    this.syncHeroChrome();
  }

  public startAssembly(): void {
    this.stopQuiz();
    this.assemblyActive = true;
    this.assemblyPlaced.clear();
    this.assemblySeconds = 0;
    this.lastPlacedPart = null;

    const orderIds = this.spec.id === 'uno' ? UNO_ASSEMBLY_ORDER : ESP_ASSEMBLY_ORDER;
    const byId = new Map(this.spec.parts.map((p) => [p.id, p]));
    const ordered: BoardPartDef[] = [];
    for (const id of orderIds) {
      const p = byId.get(id);
      if (p) ordered.push(p);
    }
    for (const p of this.spec.parts) {
      if (!ordered.some((o) => o.id === p.id)) ordered.push(p);
    }
    this.assemblyParts = ordered;
    this.assemblySelectedId = ordered[0]?.id ?? null;

    if (this.assemblyTimerId !== null) clearInterval(this.assemblyTimerId);
    this.updateTimerText();
    this.assemblyTimerId = window.setInterval(() => {
      this.assemblySeconds++;
      this.updateTimerText();
    }, 1000);

    this.syncHeroChrome();
    this.viewer.enterAssemblyVisuals(ordered.map((p) => p.id));
    this.viewer.setAssemblyHighlight(this.assemblySelectedId, this.assemblyChallenge);
    this.renderAssemblyUI();
    audio.playSnapClick();
  }

  private updateTimerText(): void {
    const el = document.getElementById('hero-asm-timer');
    if (!el) return;
    const m = Math.floor(this.assemblySeconds / 60);
    const s = this.assemblySeconds % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  private placeAssemblyPart(partId: string): void {
    this.viewer.solderPart(partId);
    this.assemblyPlaced.add(partId);
    this.lastPlacedPart = this.assemblyParts.find((p) => p.id === partId) ?? null;
    audio.playSuccess();

    const next = this.assemblyParts.find((p) => !this.assemblyPlaced.has(p.id));
    this.assemblySelectedId = next?.id ?? null;
    this.viewer.setAssemblyHighlight(this.assemblySelectedId, this.assemblyChallenge);
    this.renderAssemblyUI();

    if (!next && this.assemblyTimerId !== null) {
      clearInterval(this.assemblyTimerId);
      this.assemblyTimerId = null;
    }
  }

  private renderAssemblyUI(): void {
    const total = this.assemblyParts.length;
    const done = this.assemblyPlaced.size;
    const pct = total > 0 ? Math.round((done / total) * 100) : 100;

    const progEl = document.getElementById('hero-asm-progress');
    const barEl = document.getElementById('hero-asm-bar-fill');
    const titleEl = document.getElementById('hero-asm-status');
    const learnTitle = document.getElementById('hero-asm-part-name');
    const learnBody = document.getElementById('hero-asm-part-desc');
    const trayEl = document.getElementById('hero-assembly-tray');
    const autoBtn = document.getElementById('hero-asm-auto') as HTMLButtonElement | null;

    if (progEl) progEl.textContent = `${done} / ${total} soldadas`;
    if (barEl) barEl.style.width = `${pct}%`;
    if (autoBtn) autoBtn.disabled = done >= total;

    const activePart = this.assemblyParts.find((p) => p.id === this.assemblySelectedId);
    if (titleEl) {
      titleEl.textContent =
        done === total
          ? `¡${this.spec.name} armada en ${document.getElementById('hero-asm-timer')?.textContent ?? ''}!`
          : `Siguiente pieza: ${activePart?.name ?? ''} — haz clic en su huella brillante sobre el PCB`;
    }

    const focusInfo = this.lastPlacedPart ?? activePart;
    if (learnTitle && learnBody && focusInfo) {
      learnTitle.textContent = this.lastPlacedPart
        ? `Soldado: ${focusInfo.name}`
        : `Por colocar: ${focusInfo.name}`;
      learnBody.textContent = focusInfo.summary;
    }

    if (trayEl) {
      trayEl.innerHTML = '';
      for (const part of this.assemblyParts) {
        const isPlaced = this.assemblyPlaced.has(part.id);
        const isSel = this.assemblySelectedId === part.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `assembly-pill ${isSel ? 'is-selected' : ''} ${isPlaced ? 'is-placed' : ''}`;
        btn.disabled = isPlaced;
        btn.innerHTML = `<span class="asm-num">${part.num}</span><span>${part.name.split('(')[0].trim()}</span>`;
        btn.title = isPlaced ? 'Soldado' : 'Clic para seleccionar · doble clic para soldar';
        btn.addEventListener('click', () => {
          if (this.assemblySelectedId === part.id) {
            this.placeAssemblyPart(part.id);
          } else {
            this.assemblySelectedId = part.id;
            this.viewer.setAssemblyHighlight(part.id, this.assemblyChallenge);
            this.renderAssemblyUI();
            audio.playClick(640, 25);
          }
        });
        trayEl.appendChild(btn);
      }
    }
  }

  public exitAssembly(): void {
    this.assemblyActive = false;
    if (this.assemblyTimerId !== null) {
      clearInterval(this.assemblyTimerId);
      this.assemblyTimerId = null;
    }
    this.viewer.exitAssemblyVisuals();
    this.syncHeroChrome();
  }
}
