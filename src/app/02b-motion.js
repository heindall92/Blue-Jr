/* Movimiento (principios de Emil Kowalski), con la Web Animations API.
 * - Entrada de cada vista corta y acotada: la cabecera empieza ya, como mucho MAX_PIEZAS piezas
 *   escalonadas y todo termina antes de ENTRADA_MAX_MS. Nunca se esconde contenido esperando.
 * - Solo transform y opacity, ease-out fuerte y sin rebote; `fill: backwards` no retiene el
 *   estado final, así el hover y lo fijo siguen funcionando.
 * - Lo que tiene el foco no se mueve: si el foco está dentro, solo hay fundido.
 * - Con movimiento reducido no se anima nada y las cifras aparecen ya contadas. */
const MOV = (() => {
  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const DURACION = 240, PASO = 28, MAX_PIEZAS = 7;
  const ENTRADA_MAX_MS = (MAX_PIEZAS - 1) * PASO + 40 + DURACION;
  const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activas = [];

  function entrar(el, retraso, distancia, foco) {
    if (typeof el.animate !== 'function') return;
    const frames = foco ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(${distancia}px)` }, { opacity: 1, transform: 'translateY(0)' }];
    activas.push(el.animate(frames, { duration: DURACION, delay: retraso, easing: EASE, fill: 'backwards' }));
  }

  /** Entrada de una vista: la cabecera y las piezas marcadas con data-entra, en orden. */
  function vista(v) {
    activas.forEach((a) => a.cancel()); activas = [];
    if (!v || reducido()) return;
    const foco = v.contains(document.activeElement);
    const cab = v.querySelector('.pag-cab, .portada');
    if (cab) entrar(cab, 0, 8, foco);
    [...v.querySelectorAll('[data-entra]')].slice(0, MAX_PIEZAS).forEach((el, i) => entrar(el, 40 + i * PASO, 12, foco));
  }

  /** Cuenta una cifra hasta su valor (las que llevan data-cuenta). */
  function contar(raiz) {
    for (const el of raiz.querySelectorAll('[data-cuenta]')) {
      const fin = Number(el.dataset.cuenta), suf = el.dataset.sufijo || '';
      if (reducido() || !fin) { el.textContent = num(fin) + suf; continue; }
      const t0 = performance.now(), ms = 700;
      const paso = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = num(Math.round(fin * e)) + suf; if (k < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }
  }

  /** Píldora del lateral que se desliza hasta la sección activa (como layoutId). */
  let ultimaY = null;
  function indicador() {
    const nav = $('.lat-nav'), ind = $('.lat-ind'), act = $('.lat-nav a[aria-current="page"]');
    if (!nav || !ind) return;
    if (!act) { ind.style.opacity = '0'; return; }
    const y = act.offsetTop, h = act.offsetHeight;
    if (ultimaY == null || reducido()) { ind.style.transition = 'none'; ind.style.transform = `translateY(${y}px)`; ind.style.height = h + 'px'; ind.style.opacity = '1'; ultimaY = y; return; }
    ind.style.transition = 'none'; ind.style.transform = `translateY(${ultimaY}px)`; ind.style.height = h + 'px'; ind.style.opacity = '1';
    requestAnimationFrame(() => { ind.style.transition = ''; ind.style.transform = `translateY(${y}px)`; });
    ultimaY = y;
  }

  return { vista, contar, indicador, reducido, EASE, DURACION, MAX_PIEZAS, ENTRADA_MAX_MS };
})();
