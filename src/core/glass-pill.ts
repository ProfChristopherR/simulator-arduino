// Efecto glassy deslizante estilo V10 para barras de herramientas (X/Y multi-fila)

export function attachSlidingGlassPill(
  container: HTMLElement | null,
  pill: HTMLElement | null,
  itemSelector: string
): () => void {
  if (!container || !pill) return () => {};

  let hoveredEl: HTMLElement | null = null;

  const moveTo = (el: HTMLElement | null) => {
    if (!el || container.offsetParent === null) {
      pill.classList.remove('is-visible');
      return;
    }
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.width <= 0 || eRect.height <= 0) {
      pill.classList.remove('is-visible');
      return;
    }
    pill.style.width = `${eRect.width}px`;
    pill.style.height = `${eRect.height}px`;
    pill.style.transform = `translate3d(${eRect.left - cRect.left}px, ${eRect.top - cRect.top}px, 0)`;
    pill.classList.add('is-visible');
  };

  const syncIdle = () => {
    if (hoveredEl) {
      moveTo(hoveredEl);
      return;
    }
    const active = container.querySelector<HTMLElement>(`${itemSelector}.is-active`);
    moveTo(active);
  };

  const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
  items.forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      hoveredEl = btn;
      moveTo(btn);
    });
    btn.addEventListener('focus', () => {
      hoveredEl = btn;
      moveTo(btn);
    });
  });

  container.addEventListener('mouseleave', () => {
    hoveredEl = null;
    syncIdle();
  });

  window.addEventListener('resize', syncIdle);
  requestAnimationFrame(syncIdle);
  return syncIdle;
}
