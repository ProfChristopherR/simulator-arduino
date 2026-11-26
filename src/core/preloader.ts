// Coreografía de cierre de pantalla de carga: barra al 100%, fusión con el aro turquesa y pop-up del logo

export function runPreloaderFinish(): void {
  const pre = document.getElementById('app-preloader');
  if (!pre || pre.dataset.closing === '1') return;
  pre.dataset.closing = '1';

  const bar = pre.querySelector<HTMLElement>('.pl-bar-fill');
  if (bar) {
    bar.style.animation = 'none';
    bar.style.width = '100%';
    bar.style.transform = 'none';
  }

  window.setTimeout(() => {
    pre.classList.add('is-unifying');
    window.setTimeout(() => {
      pre.classList.add('is-pop');
      window.setTimeout(() => {
        pre.classList.add('is-done');
        window.setTimeout(() => pre.remove(), 480);
      }, 360);
    }, 380);
  }, 240);
}
