/* Revisión del agente de IA (nivel 1,5) y triaje rápido diario.
 * La revisión entrena el trabajo que la IA está dejando al nivel 1: auditar veredictos ajenos.
 * El triaje rápido es el hábito diario: diez alertas ya vistas, decididas en segundos, con repaso espaciado. */

const REVISION = DATOS.revision;
const REV = Object.fromEntries(REVISION.casos.map((c) => [c.id, c]));
const MOTIVOS = BJ.ERRORES_IA;
const revResp = (id) => S.revisiones[id] || (S.revisiones[id] = { dictamen: null, motivo: null, accion: null, cuando: null });
const revCerrada = (id) => S.revisiones[id]?.cerrado === true;

/* XP y racha cuentan toda la práctica: tickets, revisiones y la primera ronda diaria del triaje rápido. */
function entradasXp() {
  const rapido = Object.entries(S.rapido).map(([d, x]) => ({ nota: x.aciertos * BJ.XP_RAPIDO, cuando: d + 'T12:00:00Z' }));
  // Cada pregunta al N2 resta XP a su ticket (nunca nota); cada mensaje completo suma.
  const tickets = Object.entries(S.respuestas).map(([id, x]) => (typeof x.nota === 'number' ? { nota: Math.max(0, x.nota - BJ.COSTE_N2 * (S.n2[id]?.length || 0)), cuando: x.cuando } : x));
  const mensajes = Object.values(S.mensajes).flatMap((m) => (m.ok || []).map(() => ({ nota: BJ.XP_MENSAJE, cuando: m.cuando })));
  return [...tickets, ...Object.values(S.revisiones), ...rapido, ...mensajes];
}
const cazados = () => REVISION.casos.filter((c) => c.error !== null && revCerrada(c.id) && S.revisiones[c.id].dictamen === 'rechazar').length;
const rapidoPerfecto = () => Object.values(S.rapido).some((x) => x.total === BJ.RAPIDO_N && x.aciertos === x.total);

/* ---------- Registros de solo lectura (revisión y triaje rápido) ---------- */
function lineasLectura(lineas) {
  return `<ol class="lineas lectura">${lineas.map((l) => `<li><span class="linea"><span class="l-t num">${l.t}</span><span class="l-s">${esc(l.s)}</span><span class="l-m">${esc(l.m)}</span></span></li>`).join('')}</ol>`;
}

/* ---------- Vista: revisión del agente ---------- */
function vRevision() {
  if (!UI.rev || !REV[UI.rev]) UI.rev = (REVISION.casos.find((c) => !revCerrada(c.id)) || REVISION.casos[0]).id;
  const hechas = REVISION.casos.filter((c) => revCerrada(c.id)).length;
  const paneles = ['cola', 'caso', 'ticket'];
  const cola = REVISION.casos.map((c) => {
    const r = S.revisiones[c.id];
    const act = UI.rev === c.id;
    const estado = revCerrada(c.id) ? `${ic(r.nota >= BJ.UMBRAL_APTO ? 'circle-check' : 'circle-x', r.nota >= BJ.UMBRAL_APTO ? 'ok' : 'ko')}${r.nota}` : '';
    return `<li><button type="button" class="cola-item${act ? ' activa' : ''}" data-rev="${c.id}"${act ? ' aria-current="true"' : ''}>
      <span class="ci-fila"><span class="num hora">${c.hora}</span>${sevChip(c.sev)}<span class="ci-estado num">${estado}</span></span>
      <span class="ci-titulo">${esc(L(c.titulo))}</span>
      <span class="ci-id num">${c.id} · ${ic('bot')}<b class="acc acc-${c.agente.accion}">${esc(T('acciones.' + c.agente.accion))}</b></span></button></li>`;
  }).join('');
  return cabecera(T('rev_ante'), 'bot', T('rev_titulo'), T('rev_entradilla'), `<span class="pildora num">${esc(T('rev_hechas', { a: hechas, b: REVISION.casos.length }))}</span>`)
    + `<div class="rev-aviso" data-entra>${ic('lightbulb')}<p>${esc(T('rev_aviso'))}</p></div>`
    + `<div class="seg-movil" role="group" aria-label="${esc(T('paneles'))}">${paneles.map((p) => `<button type="button" data-panel="${p}" aria-pressed="${UI.panel === p}">${esc(T(p === 'cola' ? 'rev_seg_cola' : p === 'caso' ? 'caso' : 'rev_seg_informe'))}</button>`).join('')}</div>`
    + `<div class="puesto rev" data-panel-activo="${UI.panel}">
        <section class="panel cola" data-entra aria-labelledby="rcola-t"><h2 id="rcola-t" class="panel-t">${ic('inbox')}${esc(T('rev_cola'))}</h2><ol class="cola-lista">${cola}</ol></section>
        <section class="panel caso" data-entra id="rcaso" aria-labelledby="caso-t">${panelRevCaso(REV[UI.rev])}</section>
        <section class="panel ticket" data-entra id="rinforme" aria-labelledby="informe-t">${panelInforme(REV[UI.rev])}</section>
      </div>`;
}
function panelRevCaso(c) {
  return `<div class="alerta">
      <div class="alerta-cab"><span class="num id">${c.id}</span>${sevChip(c.sev)}<span class="pildora fina">${ic('clock')}<span class="num">${c.hora}</span></span><span class="pildora fina">${ic('server')}${esc(c.fuente)}</span></div>
      <h2 id="caso-t">${esc(L(c.titulo))}</h2>
      <p class="regla"><span>${esc(T('regla'))}</span> ${esc(L(c.regla))}</p>
      <p class="resumen">${esc(L(c.resumen))}</p>
    </div>
    <div class="logs-cab"><h3>${ic('terminal')}${esc(T('registros'))}</h3><span class="num cuenta-lineas">${esc(T('registros_n', { a: BJ.registros(c).length, b: BJ.registros(c).length }))}</span></div>
    <div class="logs" tabindex="0" role="region" aria-label="${esc(T('registros'))}">${lineasLectura(BJ.registros(c))}</div>`;
}
function panelInforme(c) {
  const a = c.agente;
  const r = revResp(c.id);
  const hecha = revCerrada(c.id);
  const op = (grupo, lista, valor, etq, desc) => `<div class="opciones" role="radiogroup" aria-labelledby="${grupo}-t">${lista.map((v) => `<button type="button" role="radio" class="opcion" data-${grupo}="${v}" aria-checked="${valor === v}" tabindex="${valor === v || (!valor && v === lista[0]) ? 0 : -1}"${hecha ? ' disabled' : ''}><b>${esc(etq(v))}</b><small>${esc(desc(v))}</small></button>`).join('')}</div>`;
  const listo = r.dictamen === 'aprobar' || (r.dictamen === 'rechazar' && r.motivo && r.accion);
  return `<h2 id="informe-t" class="panel-t">${ic('bot')}${esc(T('rev_informe'))} <span class="num id">${c.id}</span></h2>
    <div class="informe">
      <div class="inf-cab"><span class="pildora">${esc(T('veredictos.' + a.veredicto))}</span><b class="acc acc-${a.accion}">${esc(T('acciones.' + a.accion))}</b></div>
      <div class="confianza"><span>${esc(T('rev_confianza'))}</span><div class="barra-prog fina" role="img" aria-label="${esc(T('rev_confianza'))}: ${a.confianza} %"><i style="width:${a.confianza}%"></i></div><b class="num">${a.confianza} %</b></div>
      <p class="inf-razon">${esc(L(a.razonamiento))}</p>
      <p class="etq">${ic('list-checks')}${esc(T('rev_comprobo'))}</p>
      <ul class="inf-comp">${a.comprobaciones.map((x) => `<li>${ic('check')}${esc(L(x))}</li>`).join('')}</ul>
    </div>
    <div class="ticket-f">
      <fieldset><legend id="dictamen-t">${esc(T('rev_tu'))}</legend>${op('dictamen', BJ.DICTAMENES, r.dictamen, (v) => T('dictamen.' + v), (v) => T('dictamen_desc.' + v))}</fieldset>
      ${r.dictamen === 'rechazar' ? `<fieldset><legend id="motivo-t">${esc(T('rev_motivo'))}</legend>${op('motivo', MOTIVOS, r.motivo, (v) => T('motivo.' + v), (v) => T('motivo_desc.' + v))}</fieldset>
      <fieldset><legend id="raccion-t">${esc(T('rev_accion'))}</legend>${op('raccion', BJ.ACCIONES, r.accion, (v) => T('acciones.' + v), (v) => T('acciones_desc.' + v))}</fieldset>` : ''}
      ${hecha ? resultadoRevHtml(c) : `<div class="ticket-pie"><span class="nota">${listo ? '' : esc(T('rev_falta'))}</span><button type="button" class="btn" data-enviar-rev${listo ? '' : ' disabled'}>${ic('send')}${esc(T('rev_enviar'))}</button></div>`}
    </div>`;
}
function resultadoRevHtml(c) {
  const res = BJ.corregirRevision(c, S.revisiones[c.id]);
  const nombre = (k, v) => (v == null ? T('sin_respuesta') : k === 'dictamen' ? T('dictamen.' + v) : k === 'motivo' ? T('motivo.' + v) : T('acciones.' + v));
  const filas = res.criterios.map((k) => {
    const ok = k.puntos === k.peso;
    const na = c.error === null && k.id !== 'dictamen';
    const det = ok || na ? '' : `<small>${esc(T('tu_respuesta', { v: nombre(k.id, k.valor) }))} · ${esc(T('esperado', { v: nombre(k.id, k.esperado) }))}</small>`;
    return `<li class="${ok ? 'ok' : 'ko'}">${ic(ok ? 'circle-check' : 'circle-x')}<span class="crit"><b>${esc(T('rcrit.' + k.id))}</b>${det}</span><span class="num">${esc(T('puntos', { a: k.puntos, b: k.peso }))}</span></li>`;
  }).join('');
  const sig = REVISION.casos.find((x) => !revCerrada(x.id));
  return `<div class="resultado ${res.nota >= BJ.UMBRAL_APTO ? 'ok' : 'ko'}" tabindex="-1" id="resultado">
      <div class="res-cab"><p class="etq">${esc(c.error ? T('rev_erro', { m: T('motivo.' + c.error) }) : T('rev_acerto'))}</p><p class="nota-grande num">${res.nota}<span>/100</span></p></div>
      <ul class="criterios">${filas}</ul>
      <h3>${esc(T('explicacion'))}</h3><p class="explica">${esc(L(c.explica))}</p>
      <div class="ticket-pie"><button type="button" class="btn sec" data-rev-repetir="${c.id}">${ic('rotate-ccw')}${esc(T('reintentar'))}</button>${sig ? `<button type="button" class="btn" data-rev="${sig.id}">${esc(T('siguiente'))}${ic('chevron-right')}</button>` : ''}</div>
    </div>`;
}
function abrirRev(id) {
  UI.rev = id; UI.panel = 'caso';
  $('#rcaso').innerHTML = panelRevCaso(REV[id]);
  $('#rinforme').innerHTML = panelInforme(REV[id]);
  $$('[data-rev]').forEach((b) => { if (!b.closest('.cola')) return; const a = b.dataset.rev === id; b.classList.toggle('activa', a); a ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
  $('.puesto')?.setAttribute('data-panel-activo', 'caso');
  $$('[data-panel]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === 'caso'));
  const h = $('#caso-t'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
function enviarRevision() {
  const c = REV[UI.rev]; const r = revResp(c.id);
  if (!(r.dictamen === 'aprobar' || (r.dictamen === 'rechazar' && r.motivo && r.accion))) return;
  const antes = progresoActual();
  if (r.dictamen === 'aprobar') { r.motivo = null; r.accion = null; }
  r.cerrado = true; r.cuando = new Date().toISOString();
  const res = BJ.corregirRevision(c, r); r.nota = res.nota;
  guardar();
  pintar();
  UI.panel = 'ticket'; $('.puesto')?.setAttribute('data-panel-activo', 'ticket');
  $$('[data-panel]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === 'ticket'));
  avisosXp(antes, progresoActual(), c.id, r.nota, T('xp_rev', { n: r.nota, id: c.id }));
  if (res.cazado) avisar(T('rev_cazado'), 'bot');
  $('#resultado')?.focus({ preventScroll: true });
}

/* ---------- Vista: triaje rápido ---------- */
function nuevaRonda() {
  const casos = TURNOS.flatMap((t) => t.casos);
  const lista = BJ.sesionRapida(casos, cerradas(), S.repaso, hoyLocal()).map((c) => c.id);
  // Las que ya venían de un repaso anterior se marcan como tal (se fija al empezar la ronda).
  UI.rapido = { lista, repaso: lista.filter((id) => S.repaso[id]), i: 0, aciertos: 0, fallos: [], respuesta: null, t0: Date.now(), ms: 0, fin: false };
}
function vRapido() {
  const disponibles = Object.values(cerradas()).length;
  const cab = cabecera(T('rap_ante'), 'zap', T('rap_titulo'), T('rap_entradilla'));
  if (disponibles < 3) return cab + `<section class="panel vacio-grande" data-entra>${ic('lock')}<h2>${esc(T('rap_bloqueado'))}</h2><p>${esc(T('rap_bloqueado_txt', { n: 3 - disponibles }))}</p><a class="btn" href="#T1">${ic('play')}${esc(T('hero_empezar'))}</a></section>`;
  if (!UI.rapido) nuevaRonda();
  const R = UI.rapido;
  if (R.fin) return cab + resumenRapido();
  const c = CASOS[R.lista[R.i]];
  const resp = R.respuesta;
  const botones = BJ.ACCIONES.map((a, k) => {
    const estado = resp ? (a === c.accion ? ' correcta' : a === resp ? ' incorrecta' : '') : '';
    return `<button type="button" class="rap-op${estado}" data-rapido="${a}"${resp ? ' disabled' : ''}><kbd>${k + 1}</kbd><b>${esc(T('acciones.' + a))}</b><small>${esc(T('acciones_desc.' + a))}</small></button>`;
  }).join('');
  const primera = (txt) => (txt.match(/^.*?[.!?](\s|$)/) || [txt])[0].trim();
  return cab + `<section class="rapido panel" data-entra aria-labelledby="rap-t">
      <div class="rap-cab"><span class="pildora num">${esc(T('rap_n', { a: R.i + 1, b: R.lista.length }))}</span><div class="barra-prog fina" aria-hidden="true"><i style="width:${(R.i / R.lista.length) * 100}%"></i></div><span class="pildora num">${ic('circle-check')}${R.aciertos}</span></div>
      <div class="alerta"><div class="alerta-cab"><span class="num id">${c.id}</span>${sevChip(c.sev)}<span class="pildora fina">${ic('server')}${esc(c.fuente)}</span>${R.repaso.includes(c.id) ? `<span class="pildora fina">${ic('rotate-ccw')}${esc(T('rap_repaso'))}</span>` : ''}</div>
        <h2 id="rap-t">${esc(L(c.titulo))}</h2><p class="resumen">${esc(L(c.resumen))}</p></div>
      <div class="logs rap-logs" tabindex="0" role="region" aria-label="${esc(T('registros'))}">${lineasLectura(c.logs.map(([t, s, m]) => ({ t, s, m })))}</div>
      <p class="etq">${esc(T('rap_pregunta'))}</p>
      <div class="rap-ops" role="group" aria-labelledby="rap-t">${botones}</div>
      ${resp ? `<div class="rap-fb ${resp === c.accion ? 'ok' : 'ko'}" role="status">${ic(resp === c.accion ? 'circle-check' : 'circle-x')}<div><b>${esc(resp === c.accion ? T('rap_bien') : T('rap_mal', { a: T('acciones.' + c.accion) }))}</b><p>${esc(primera(L(c.explica)))}</p></div>
        <button type="button" class="btn" data-rapido-sig>${esc(R.i + 1 < R.lista.length ? T('siguiente') : T('rap_ver'))}${ic('chevron-right')}<kbd>↵</kbd></button></div>` : ''}
    </section>`;
}
function resumenRapido() {
  const R = UI.rapido;
  const hoy = hoyLocal();
  const primera = S.rapido[hoy];
  const vuelven = R.fallos.length;
  return `<section class="rapido panel rap-fin" data-entra aria-labelledby="rapf-t">
      ${ic(R.aciertos === R.lista.length ? 'trophy' : 'zap', 'rap-fin-ic')}
      <h2 id="rapf-t" class="num">${esc(T('rap_resultado', { a: R.aciertos, b: R.lista.length }))}</h2>
      <p>${esc(T('rap_tiempo', { s: Math.round(R.ms / R.lista.length / 100) / 10 }))}</p>
      <p class="nota">${esc(primera && primera.ms === R.ms ? T('rap_xp', { n: R.aciertos * BJ.XP_RAPIDO }) : T('rap_xp_ya'))}</p>
      ${vuelven ? `<p>${esc(T('rap_vuelven', { n: vuelven }))}</p>` : ''}
      <div class="fila-der"><a class="btn sec" href="#turnos">${esc(T('rap_volver'))}</a><button type="button" class="btn" data-rapido-otra>${ic('rotate-ccw')}${esc(T('rap_otra'))}</button></div>
    </section>`;
}
function responderRapido(a) {
  const R = UI.rapido; if (!R || R.respuesta || R.fin) return;
  const c = CASOS[R.lista[R.i]];
  const ok = a === c.accion;
  R.respuesta = a; R.ms += Date.now() - R.t0;
  if (ok) R.aciertos++; else R.fallos.push(c.id);
  S.repaso[c.id] = BJ.repasar(S.repaso[c.id], ok, hoyLocal());
  guardar(); repintarRapido();
  $('[data-rapido-sig]')?.focus();
}
function siguienteRapido() {
  const R = UI.rapido; if (!R || !R.respuesta) return;
  if (R.i + 1 < R.lista.length) { R.i++; R.respuesta = null; R.t0 = Date.now(); repintarRapido(); return $('[data-rapido]')?.focus(); }
  R.fin = true;
  const hoy = hoyLocal();
  if (!S.rapido[hoy]) {
    // Solo la primera ronda del día da XP: repetir sirve para repasar, no para inflar.
    const antes = progresoActual();
    S.rapido[hoy] = { aciertos: R.aciertos, total: R.lista.length, ms: R.ms };
    guardar(); repintarRapido();
    avisosXp(antes, progresoActual(), '', 0, T('xp_rap', { n: R.aciertos * BJ.XP_RAPIDO, a: R.aciertos, b: R.lista.length }));
  } else repintarRapido();
  $('#rapf-t')?.focus();
}
function repintarRapido() { const v = $('#main .vista'); if (v) { v.innerHTML = vRapido(); $$('#main [data-entra]').forEach((x) => x.removeAttribute('data-entra')); } pintarLateral(); }

/* ---------- Tarjetas de la portada ---------- */
function modosHtml() {
  const hechas = REVISION.casos.filter((c) => revCerrada(c.id)).length;
  const hoy = S.rapido[hoyLocal()];
  const pendientes = Object.values(S.repaso).filter((e) => e.proximo <= hoyLocal()).length;
  const bloqueado = Object.values(cerradas()).length < 3;
  return `<div class="modos">
      <a class="modo modo-rap" data-entra href="#rapido"><span class="modo-ic" aria-hidden="true">${ic('zap')}</span><div><p class="etq">${esc(T('modo_rap_ante'))}</p><h3>${esc(T('rap_titulo'))}</h3>
        <p>${esc(bloqueado ? T('modo_rap_bloq') : hoy ? T('modo_rap_hecho', { a: hoy.aciertos, b: hoy.total }) : pendientes ? T('modo_rap_pend', { n: pendientes }) : T('modo_rap_txt'))}</p></div>${ic('chevron-right', 'modo-fl')}</a>
      <a class="modo modo-rev" data-entra href="#revision"><span class="modo-ic" aria-hidden="true">${ic('bot')}</span><div><p class="etq">${esc(T('modo_rev_ante'))}</p><h3>${esc(T('rev_corto'))}</h3>
        <p>${esc(T('modo_rev_txt', { a: hechas, b: REVISION.casos.length }))}</p></div>${ic('chevron-right', 'modo-fl')}</a>
    </div>`;
}
