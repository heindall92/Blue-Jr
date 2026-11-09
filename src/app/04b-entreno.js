/* Entrenador: lo que convierte el simulador en práctica diaria.
 * Guía de investigación por familia de alertas (como las de Elastic Security), entidades para pivotar
 * (como los «campos interesantes» de Splunk), tareas del incidente (como en Sentinel), el árbol
 * «¿escalo o no?» y la práctica diaria: XP, racha, nivel e insignias, derivados de los tickets. */

const GUIAS = DATOS.guias;
const FAMILIA = Object.fromEntries(GUIAS.familias.flatMap((f) => f.casos.map((id) => [id, f])));
const hoyLocal = () => new Date().toISOString().slice(0, 10);
const progresoActual = () => BJ.progreso(entradasXp(), hoyLocal());

/* ---------- Guía de investigación ---------- */
const GUIA_TABS = [['triaje', 'list-checks'], ['analisis', 'search'], ['respuesta', 'split']];
function guiaHtml(c) {
  const f = FAMILIA[c.id];
  if (!f) return '';
  // Abierta por defecto mientras se aprende (menos de tres tickets cerrados); después, plegada.
  if (UI.guia === null) UI.guia = Object.values(S.respuestas).filter((r) => r.cerrado).length < 3;
  const lista = (xs, tag = 'ul') => `<${tag}>${xs.map((x) => `<li>${esc(L(x))}</li>`).join('')}</${tag}>`;
  const minus = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const resp = f.respuesta.map((r) => `<li><span class="g-si">${esc(T('guia_si'))} ${esc(minus(L(r.si)))}</span>
      <span class="g-entonces">${ic('chevron-right')}<b class="acc acc-${r.accion}">${esc(T('acciones.' + r.accion))}</b></span>
      <span class="g-porque">${esc(L(r.porque))}</span></li>`).join('');
  return `<details class="guia" id="guia"${UI.guia ? ' open' : ''}>
      <summary>${ic('compass')}<span><b>${esc(T('guia_titulo'))}</b><small>${esc(L(f.titulo))} · ${esc(T('guia_sub'))}</small></span>${ic('chevron-right', 'g-flecha')}</summary>
      <div class="guia-cuerpo">
        <p class="g-que">${esc(L(f.que))}</p>
        <div class="g-tabs" role="group" aria-label="${esc(T('guia_titulo'))}">${GUIA_TABS.map(([k, icono]) => `<button type="button" data-guia-tab="${k}" aria-pressed="${UI.guiaTab === k}">${ic(icono)}${esc(T('guia_tab.' + k))}</button>`).join('')}</div>
        <div class="g-panel">${UI.guiaTab === 'triaje' ? `<h3>${ic('list-checks')}${esc(T('guia_triaje'))}</h3>${lista(f.triaje, 'ol')}<h3>${ic('lightbulb')}${esc(T('guia_fp'))}</h3>${lista(f.fp)}`
          : UI.guiaTab === 'analisis' ? `<h3>${ic('search')}${esc(T('guia_analisis'))}</h3>${lista(f.analisis, 'ol')}`
          : `<h3>${ic('split')}${esc(T('guia_respuesta'))}</h3><ul class="g-resp">${resp}</ul>`}</div>
        <p class="nota">${esc(T('guia_nota'))} <button type="button" class="enlace" data-decidir-abrir>${esc(T('decidir_btn'))}</button></p>
      </div>
    </details>`;
}

/* ---------- Entidades para pivotar ---------- */
function entidadesHtml(lineas) {
  const e = BJ.entidades(lineas);
  const grupo = (k, icono) => e[k].length ? `<div class="ent-g"><span class="ent-t">${ic(icono)}${esc(T('ent_' + k))}</span>${e[k].map(([v, n]) => `<button type="button" class="chip ent" data-pivote="${esc(v)}" aria-pressed="${UI.filtro === v}" aria-label="${esc(T('pivotar', { v, n }))}"><span>${esc(v)}</span><b class="num">${n}</b></button>`).join('')}</div>` : '';
  return `<div class="entidades" role="group" aria-label="${esc(T('entidades'))}"><p class="ent-cab">${ic('crosshair')}${esc(T('entidades'))}</p>${grupo('cuentas', 'user')}${grupo('ips', 'server')}${grupo('equipos', 'terminal')}</div>`;
}

/* ---------- Tareas del incidente ---------- */
function tareasDe(c) {
  const r = respuesta(c.id);
  const campos = BJ.camposDe(c);
  return [
    ['investigar', UI.investigado.has(c.id)],
    ['evidencia', r.evidencias.length > 0],
    ['veredicto', !!r.veredicto],
    ['accion', !!r.accion],
    ['datos', campos.every((f) => String(r.campos[f.id] || '').trim())],
    ['ticket', r.ticket.trim().length >= BJ.TICKET_MIN]
  ];
}
function tareasHtml(c) {
  const t = tareasDe(c);
  const hechas = t.filter(([, ok]) => ok).length;
  return `<div class="tareas" id="tareas"><p class="etq">${ic('list-checks')}${esc(T('tareas'))} <span class="num">${esc(T('tareas_n', { a: hechas, b: t.length }))}</span></p>
      <div class="barra-prog fina" aria-hidden="true"><i style="width:${(hechas / t.length) * 100}%"></i></div>
      <ul>${t.map(([k, ok]) => `<li class="${ok ? 'hecha' : ''}">${ic(ok ? 'circle-check' : 'circle')}<span>${esc(T('tarea.' + k, { m: BJ.TICKET_MIN }))}</span><span class="sr-only">${esc(ok ? T('hecha') : T('pendiente'))}</span></li>`).join('')}</ul></div>`;
}
function actualizarTareas() { const el = $('#tareas'); if (el && UI.caso && !cerrado(UI.caso)) el.outerHTML = tareasHtml(CASOS[UI.caso]); }

/* ---------- ¿Escalo o no? Árbol de decisión ---------- */
// Cada paso es una pregunta; cada respuesta lleva a otra pregunta o a un resultado.
const ARBOL = {
  malicioso: { si: 'efecto', no: 'real' },
  real: { si: '=benigno', no: '=fp' },
  efecto: { si: 'compromiso', no: '=bloqueado' },
  compromiso: { si: '=contener', no: '=escalar' }
};
let camino = [];
function decidirHtml() {
  const D = GUIAS.decision;
  let paso = 'malicioso';
  const hechos = camino.map((resp) => { const p = paso; paso = ARBOL[p][resp]; return [p, resp]; });
  const preguntas = hechos.map(([p, resp]) => `<li class="d-hecha"><span>${esc(L(D.preguntas[p]))}</span><b>${esc(T(resp === 'si' ? 'decidir_si' : 'decidir_no'))}</b></li>`).join('');
  let actual;
  if (paso.startsWith('=')) {
    const res = D.resultados[paso.slice(1)];
    actual = `<div class="d-res" role="status"><p class="etq">${esc(T('decidir_resultado'))}</p>
        <p class="d-par"><span class="pildora">${esc(T('veredictos.' + res.veredicto))}</span><b class="acc acc-${res.accion}">${esc(T('acciones.' + res.accion))}</b></p>
        <p>${esc(L(res))}</p><p class="nota"><b>${esc(T('decidir_ejemplo'))}:</b> ${esc(L(res.ejemplo))}</p>
        <button type="button" class="btn sec peq" data-decidir="reset">${ic('rotate-ccw')}${esc(T('decidir_otra'))}</button></div>`;
  } else {
    const q = D.preguntas[paso];
    actual = `<div class="d-preg"><p class="etq">${esc(T('decidir_paso', { n: camino.length + 1 }))}</p><p class="d-q" id="d-q">${esc(L(q))}</p><p class="nota">${esc(L(q.ayuda))}</p>
        <div class="d-botones" role="group" aria-labelledby="d-q"><button type="button" class="btn" data-decidir="si">${esc(T('decidir_si'))}</button><button type="button" class="btn sec" data-decidir="no">${esc(T('decidir_no'))}</button>${camino.length ? `<button type="button" class="btn sec" data-decidir="reset">${ic('rotate-ccw')}${esc(T('decidir_otra'))}</button>` : ''}</div></div>`;
  }
  const tabla = ['contener', 'escalar', 'bloqueado', 'benigno', 'fp'].map((k) => { const r = D.resultados[k]; return `<tr><th scope="row"><b class="acc acc-${r.accion}">${esc(T('acciones.' + r.accion))}</b><small>${esc(T('veredictos.' + r.veredicto))}</small></th><td>${esc(L(r))}<small>${esc(L(r.ejemplo))}</small></td></tr>`; }).join('');
  return `<p>${esc(T('decidir_intro'))}</p><ol class="d-camino">${preguntas}</ol>${actual}
    <h3>${esc(T('decidir_tabla'))}</h3><table class="tabla-dec"><tbody>${tabla}</tbody></table>`;
}

/* ---------- Práctica diaria (portada) ---------- */
function anillo(pct) {
  const r = 26, c = 2 * Math.PI * r;
  return `<svg class="anillo" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="a-fondo"/><circle cx="32" cy="32" r="${r}" class="a-valor" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, pct))).toFixed(1)}"/></svg>`;
}
function siguienteAlerta() {
  const casos = TURNOS.flatMap((t) => t.casos);
  const pendiente = casos.find((c) => !cerrado(c.id));
  if (pendiente) return { c: pendiente, repaso: false };
  const peor = [...casos].sort((a, b) => notaDe(a.id) - notaDe(b.id))[0];
  return { c: peor, repaso: true };
}
function practicaHtml() {
  const p = progresoActual();
  const cumplida = p.xpHoy >= p.meta;
  const { c, repaso } = siguienteAlerta();
  const nombreNivel = T('niveles.' + p.nivel);
  return `<section class="practica" aria-labelledby="practica-t"><h2 id="practica-t" class="sec-t">${ic('zap')}${esc(T('practica_t'))}</h2>
    <div class="pr-fila">
      <div class="pr-card pr-hoy" data-entra>${anillo(p.xpHoy / p.meta)}<div><p class="stat-t">${esc(T('hoy_t'))}</p><p class="pr-v num">${esc(T('hoy_v', { a: num(p.xpHoy), b: num(p.meta) }))}</p><p class="stat-c${cumplida ? ' sube' : ''}">${esc(cumplida ? T('meta_ok') : T('meta_falta', { n: num(p.meta - p.xpHoy) }))}</p></div></div>
      <div class="pr-card pr-racha${p.racha ? ' viva' : ''}" data-entra><span class="pr-ic" aria-hidden="true">${ic('flame')}</span><div><p class="stat-t">${esc(T('racha_t'))}</p><p class="pr-v num">${esc(T(p.racha === 1 ? 'racha_1' : 'racha_n', { n: p.racha }))}</p><p class="stat-c">${esc(p.racha ? T('racha_sub') : T('racha_sub_0'))}</p></div></div>
      <div class="pr-card pr-nivel" data-entra><span class="pr-ic" aria-hidden="true">${ic('trophy')}</span><div class="pr-niv"><p class="stat-t">${esc(T('nivel_t', { n: p.nivelN }))} · <span class="num">${esc(T('xp_total', { n: num(p.xp) }))}</span></p><p class="pr-v">${esc(nombreNivel)}</p>
        <div class="barra-prog" role="img" aria-label="${esc(p.siguiente ? T('nivel_faltan', { n: num(p.faltan), s: T('niveles.' + p.siguiente) }) : T('nivel_max'))}"><i style="width:${p.pctNivel}%"></i></div>
        <p class="stat-c">${esc(p.siguiente ? T('nivel_faltan', { n: num(p.faltan), s: T('niveles.' + p.siguiente) }) : T('nivel_max'))}</p></div></div>
      <a class="pr-card pr-reto" data-entra href="#${CASOS[c.id].turno}" data-caso-ir="${c.id}"><div><p class="stat-t">${ic('siren')}${esc(repaso ? T('reto_repaso') : T('reto_t'))}</p>
        <p class="pr-reto-t">${esc(L(c.titulo))}</p><p class="pr-reto-m"><span class="num">${c.id}</span>${sevChip(c.sev)}<span>${esc(FAMILIA[c.id] ? L(FAMILIA[c.id].titulo) : '')}</span></p></div>
        <span class="btn peq">${esc(T('reto_btn'))}${ic('chevron-right')}</span></a>
    </div>
    ${modosHtml()}</section>`;
}

/* ---------- Insignias (historial) ---------- */
const ICONO_INSIGNIA = { primer: 'flag', perfecto: 'target', sin_alarma: 'filter', contencion: 'lock', turno: 'award', racha3: 'flame', semana: 'trophy', revisor: 'bot', rapido: 'zap', comunicador: 'send', entrevista: 'mic' };
function insigniasHtml() {
  const lista = BJ.insignias(TURNOS, cerradas(), hoyLocal(), { racha: progresoActual().racha, cazados: cazados(), rapidoPerfecto: rapidoPerfecto(), mensajes: mensajesCompletos(), defensas: defensasCompletas() });
  const n = lista.filter((x) => x.ok).length;
  return `<section class="panel insignias-p" data-entra aria-labelledby="ins-t"><h2 id="ins-t" class="panel-t">${ic('trophy')}${esc(T('insignias_t'))} <span class="pildora num">${esc(T('tareas_n', { a: n, b: lista.length }))}</span></h2>
    <ul class="insignias">${lista.map(({ id, ok }) => { const [nombre, como] = T('insignias.' + id); return `<li class="${ok ? 'ok' : ''}"><span class="ins-ic" aria-hidden="true">${ic(ICONO_INSIGNIA[id])}</span><b>${esc(nombre)}</b><small>${esc(como)}</small><span class="sr-only">${esc(ok ? T('conseguida') : T('pendiente'))}</span></li>`; }).join('')}</ul></section>`;
}

/* ---------- Avisos de XP al cerrar un ticket ---------- */
function avisosXp(antes, despues, id, nota, texto) {
  avisar(texto || T('xp_ganado', { x: nota, n: nota, id }), 'zap');
  if (despues.nivelN > antes.nivelN) avisar(T('subes', { n: T('niveles.' + despues.nivel) }), 'trophy');
  if (antes.xpHoy < despues.meta && despues.xpHoy >= despues.meta) avisar(T('meta_cumplida'), 'circle-check');
  if (despues.racha > antes.racha && despues.racha > 1) avisar(T('racha_aviso', { n: despues.racha }), 'flame');
}
