import './styles/tokens.css';
import './styles/layout.css';
import './styles/workbench.css';

import { BOARD_REGISTRY, getBoardSpec } from './boards/registry';
import { hydrateIcons, setSlotIcon } from './core/icons';
import { lofi } from './core/lofi';
import { HeroBoardViewer, type CameraPreset } from './core/viewer';
import { renderCompareTable } from './education/compare';
import { PracticeController } from './education/practice';
import { mountResistorCalculator } from './education/resistor-calc';
import { WorkbenchController } from './lab/workbench';
import type { BoardId } from './types';

function bootstrap(): void {
  hydrateIcons(document);

  let activeBoard: BoardId = 'uno';
  let labelsMode = false;

  const heroHost = document.getElementById('hero-canvas-host')!;
  const wbHost = document.getElementById('wb-canvas-host')!;
  const compareRoot = document.getElementById('compare-root')!;
  const boardThumbnails = new Map<BoardId, string>();

  const viewer = new HeroBoardViewer(heroHost, {
    onPartSelected: (partId) => {
      showHeroPartToast(activeBoard, partId);
      highlightLabelListItem(partId);
      practice.handleHeroPartClick(partId);
    },
    onPartHover: (partId) => {
      if (partId) {
        showHeroPartToast(activeBoard, partId);
        highlightLabelListItem(partId);
      }
    },
    onFootprintSelected: (partId) => {
      practice.handleHeroFootprintClick(partId);
    },
  });

  for (const [id, spec] of Object.entries(BOARD_REGISTRY)) {
    const img = document.querySelector<HTMLImageElement>(`[data-board-thumb="${id}"]`);
    try {
      const url = HeroBoardViewer.renderBoardThumbnail(spec);
      boardThumbnails.set(id as BoardId, url);
      if (img) img.src = url;
    } catch {
      // Fallback silencioso si WebGL limita contextos simultáneos
    }
  }

  const practice = new PracticeController(viewer, getBoardSpec(activeBoard));
  const workbench = new WorkbenchController(wbHost);

  const resCalcRoot = document.getElementById('resistor-calc-root');
  if (resCalcRoot) mountResistorCalculator(resCalcRoot);

  const headerEl = document.getElementById('top');
  const syncHeaderScroll = () => {
    if (!headerEl) return;
    headerEl.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', syncHeaderScroll, { passive: true });
  syncHeaderScroll();

  const mobBtn = document.getElementById('mobile-nav-toggle') as HTMLButtonElement | null;
  const mobDrawer = document.getElementById('mobile-nav-drawer') as HTMLElement | null;
  if (mobBtn && mobDrawer) {
    const closeMob = () => {
      mobDrawer.hidden = true;
      mobBtn.setAttribute('aria-expanded', 'false');
    };
    mobBtn.addEventListener('click', () => {
      const opening = mobDrawer.hidden;
      mobDrawer.hidden = !opening;
      mobBtn.setAttribute('aria-expanded', String(opening));
    });
    mobDrawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMob));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobDrawer.hidden) closeMob();
    });
  }

  document.getElementById('header-lofi-btn')?.addEventListener('click', () => {
    lofi.toggle();
  });
  document.getElementById('header-lofi-prev')?.addEventListener('click', () => lofi.prev());
  document.getElementById('header-lofi-next')?.addEventListener('click', () => lofi.next());
  document.getElementById('header-lofi-pause')?.addEventListener('click', () => {
    const st = lofi.getState();
    if (st.playing) lofi.pause();
    else lofi.resume();
  });

  lofi.subscribe((st) => {
    const active = st.playing || st.paused;
    const hBtn = document.getElementById('header-lofi-btn');
    const hCtrls = document.getElementById('header-lofi-controls');
    const hPauseSlot = document.querySelector('#header-lofi-pause .icon-slot');
    if (hBtn) {
      hBtn.classList.toggle('is-playing', st.playing);
      hBtn.classList.toggle('is-paused', st.paused);
      hBtn.setAttribute('aria-pressed', String(st.playing));
      hBtn.title = active ? `${st.trackTitle} (${st.trackIndex + 1}/${st.totalTracks})` : 'Activar música ambiental Lofi aleatoria';
    }
    if (hCtrls) hCtrls.hidden = !active;
    if (hPauseSlot) setSlotIcon(hPauseSlot, st.playing ? 'pause' : 'play');
    workbench.syncLofiState(st);
  });

  function highlightLabelListItem(partId: string | null): void {
    document.querySelectorAll<HTMLElement>('.hero-label-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.partId === partId);
    });
  }

  function renderHeroLabelsList(boardId: BoardId): void {
    const list = document.getElementById('hero-labels-list')!;
    const spec = getBoardSpec(boardId);
    list.innerHTML = '';
    for (const part of spec.parts) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hero-label-item';
      btn.dataset.partId = part.id;
      btn.innerHTML = `<span class="hero-label-num">${part.num}</span><span>${part.name}</span>`;
      btn.addEventListener('mouseenter', () => {
        viewer.highlightCallout(part.id);
        showHeroPartToast(boardId, part.id);
      });
      btn.addEventListener('click', () => {
        viewer.focusPart(part.id);
        showHeroPartToast(boardId, part.id);
        highlightLabelListItem(part.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
  }

  function showHeroPartToast(boardId: BoardId, partId: string | null): void {
    const toast = document.getElementById('hero-part-toast')!;
    if (!partId) {
      toast.hidden = true;
      return;
    }
    const spec = getBoardSpec(boardId);
    const part = spec.parts.find((p) => p.id === partId);
    if (!part) {
      toast.hidden = true;
      return;
    }
    toast.hidden = false;
    document.getElementById('hero-part-category')!.textContent = part.category;
    document.getElementById('hero-part-name')!.textContent = `${part.num}. ${part.name}`;
    document.getElementById('hero-part-desc')!.textContent = part.summary;
  }

  function selectBoard(id: BoardId): void {
    activeBoard = id;
    const spec = getBoardSpec(id);

    document.getElementById('hero-eyebrow')!.textContent = spec.eyebrow;
    document.getElementById('hero-index')!.textContent = spec.indexLabel;
    document.getElementById('hero-title')!.textContent = spec.name;
    document.getElementById('hero-tagline')!.textContent = spec.tagline;
    document.getElementById('hero-level')!.textContent = spec.levelLabel;
    document.getElementById('hero-summary')!.textContent = spec.summary;

    document.querySelectorAll<HTMLElement>('[data-board-select]').forEach((btn) => {
      const match = btn.dataset.boardSelect === id;
      btn.classList.toggle('is-active', match);
      if (btn.getAttribute('role') === 'tab') {
        btn.setAttribute('aria-selected', String(match));
      }
    });

    showHeroPartToast(id, null);
    viewer.setBoard(spec);
    renderHeroLabelsList(id);
    practice.setBoardSpec(spec);
    workbench.setBoard(id);
    renderCompareTable(compareRoot, id, boardThumbnails, (chosenId) => selectBoard(chosenId));
  }

  document.querySelectorAll<HTMLElement>('[data-board-select]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.boardSelect as BoardId;
      if (id) selectBoard(id);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      viewer.setPreset(btn.dataset.view as CameraPreset);
    });
  });

  document.getElementById('btn-hero-rotate')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const active = btn.classList.toggle('is-active');
    btn.setAttribute('aria-pressed', String(active));
    viewer.setAutoRotate(active);
  });

  document.getElementById('btn-hero-labels')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    labelsMode = btn.classList.toggle('is-active');
    btn.setAttribute('aria-pressed', String(labelsMode));
    viewer.setLabelsVisible(labelsMode);
    document.getElementById('hero-card-details')!.hidden = labelsMode;
    document.getElementById('hero-labels-card')!.hidden = !labelsMode;
  });

  document.getElementById('btn-jump-quiz')?.addEventListener('click', () => {
    practice.startQuiz();
  });

  document.getElementById('btn-jump-assemble')?.addEventListener('click', () => {
    practice.startAssembly();
  });

  selectBoard('uno');
}

bootstrap();
