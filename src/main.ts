import './styles/tokens.css';
import './styles/layout.css';
import './styles/workbench.css';

import { BOARD_REGISTRY, getBoardSpec } from './boards/registry';
import { attachSlidingGlassPill } from './core/glass-pill';
import { hydrateIcons, setSlotIcon } from './core/icons';
import { lofi } from './core/lofi';
import { runPreloaderFinish } from './core/preloader';
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
  let esp32ShieldOn = false;

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

  // Glassy Navbar V10: píldora deslizante con resorte en desktop
  const mainNav = document.getElementById('main-nav');
  const navPill = document.getElementById('nav-glass-pill') as HTMLElement | null;
  if (mainNav && navPill) {
    const topNavLinks = Array.from(mainNav.querySelectorAll<HTMLAnchorElement>(':scope > a, :scope > .nav-dropdown-wrap > a'));
    let activeNavEl: HTMLAnchorElement | null = topNavLinks[0] ?? null;

    const moveNavPill = (el: HTMLElement | null) => {
      if (!el || mainNav.offsetParent === null) {
        navPill.classList.remove('is-visible');
        return;
      }
      const navRect = mainNav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      navPill.style.width = `${elRect.width}px`;
      navPill.style.transform = `translate3d(${elRect.left - navRect.left}px, 0, 0)`;
      navPill.classList.add('is-visible');
    };

    topNavLinks.forEach((link) => {
      link.addEventListener('mouseenter', () => moveNavPill(link));
      link.addEventListener('focus', () => moveNavPill(link));
    });
    mainNav.addEventListener('mouseleave', () => moveNavPill(activeNavEl));
    window.addEventListener('resize', () => moveNavPill(activeNavEl));

    if ('IntersectionObserver' in window) {
      const secIds = ['hero', 'mesa-trabajo', 'leccion', 'practica', 'comparar'];
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const targetLink = topNavLinks.find((a) => a.dataset.navSection === entry.target.id);
              if (targetLink) {
                activeNavEl = targetLink;
                topNavLinks.forEach((a) => a.classList.toggle('is-nav-active', a === targetLink));
                moveNavPill(activeNavEl);
              }
            }
          }
        },
        { rootMargin: '-35% 0px -50% 0px', threshold: 0.05 }
      );
      secIds.forEach((id) => {
        const sec = document.getElementById(id);
        if (sec) obs.observe(sec);
      });
    }
    requestAnimationFrame(() => moveNavPill(activeNavEl));
  }

  // Micro-animaciones GPU sutiles al revelar secciones
  const revealTargets = document.querySelectorAll<HTMLElement>(
    '.section-intro-head, .pillar, .lesson-preview-card, .practice-card'
  );
  revealTargets.forEach((el) => el.classList.add('reveal-up'));
  if ('IntersectionObserver' in window) {
    const revObs = new IntersectionObserver(
      (entries, observer) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    revealTargets.forEach((el) => revObs.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

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
  lofi.restoreFromSession();

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

  function syncHeroShieldBtn(): void {
    const shieldBtn = document.getElementById('btn-hero-shield') as HTMLButtonElement | null;
    if (!shieldBtn) return;
    shieldBtn.hidden = activeBoard !== 'esp32';
    shieldBtn.classList.toggle('is-active', esp32ShieldOn && activeBoard === 'esp32');
    shieldBtn.setAttribute('aria-pressed', String(esp32ShieldOn && activeBoard === 'esp32'));
  }

  function selectBoard(id: BoardId): void {
    activeBoard = id;
    const spec = getBoardSpec(id);
    const useShield = id === 'esp32' && esp32ShieldOn;

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

    syncHeroShieldBtn();
    showHeroPartToast(id, null);
    viewer.setBoard(spec, { withShield: useShield });
    renderHeroLabelsList(id);
    practice.setBoardSpec(spec);
    workbench.setBoard(id, useShield);
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

  document.getElementById('btn-hero-shield')?.addEventListener('click', () => {
    if (activeBoard !== 'esp32') return;
    esp32ShieldOn = !esp32ShieldOn;
    syncHeroShieldBtn();
    viewer.setBoard(getBoardSpec('esp32'), { withShield: esp32ShieldOn });
    workbench.setEsp32Shield(esp32ShieldOn);
  });

  document.getElementById('btn-jump-quiz')?.addEventListener('click', () => {
    practice.startQuiz();
  });

  document.getElementById('btn-jump-assemble')?.addEventListener('click', () => {
    practice.startAssembly();
  });

  selectBoard('uno');

  // Activar "Rotar" en el visor 3D por defecto
  viewer.setAutoRotate(true);

  // Efecto glassy deslizante en barra inferior del Hero
  attachSlidingGlassPill(
    document.getElementById('hero-toolbar'),
    document.getElementById('hero-toolbar-pill'),
    '.tool-btn'
  );

  // Finalizar pantalla de carga con unificación de círculo Turquesa + pop-up del logo
  requestAnimationFrame(() => requestAnimationFrame(() => runPreloaderFinish()));
  window.setTimeout(runPreloaderFinish, 1400);
}

bootstrap();
