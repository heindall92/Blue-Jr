/* Vistas: inicio (turnos), puesto de trabajo del turno e historial. */

function cabecera(ante, icono, titulo, entradilla, extra = '') {
  return `<header class="pag-cab"><p class="ante">${ic(icono)}${esc(ante)}</p><div class="pag-fila"><h1>${esc(titulo)}</h1>${extra}</div>${entradilla ? `<p class="entradilla">${esc(entradilla)}</p>` : ''}</header>`;
}
const cerradas = () => Object.fromEntries(Object.entries(S.respuestas).filter(([, v]) => v.cerrado));
const sevChip = (s) => `<span class="sev sev-${s}">${esc(T('sev.' + s))}</span>`;

/* ---------- Inicio ---------- */
function vTurnos() {
  const resp = cerradas();
  const tarjetas = TURNOS.map((t, i) => {
    const r = BJ.resumenTurno(t, resp);
    const sev = BJ.SEVERIDADES.map((s) => [s, t.casos.filter((c) => c.sev === s).length]).filter(([, n]) => n);
    const boton = r.completo ? T('repasar') : r.hechos ? T('continuar') : T('empezar');
    const estado = r.completo ? `<span class="estado ${r.apto ? 'ok' : 'ko'}">${ic(r.apto ? 'circle-check' : 'circle-x')}${esc(r.apto ? T('apto') : T('no_apto', { n: BJ.UMBRAL_APTO }))}</span>` : `<span class="estado">${esc(T('progreso', { a: r.hechos, b: r.total }))}</span>`;
    return `<li class="turno-card" style="--i:${i}">
      <div class="tc-cab"><span class="tc-num num">${numTurno(t)}</span><div><p class="ante">${esc(diaDe(t))}</p><h2>${esc(L(t.tema))}</h2></div></div>
      ${regleta(t, true)}
      <div class="tc-sev">${sev.map(([s, n]) => `<span class="sev sev-${s}">${esc(T('sev.' + s))} <b class="num">${n}</b></span>`).join('')}</div>
      <div class="barra-prog" role="img" aria-label="${esc(T('progreso', { a: r.hechos, b: r.total }))}"><i style="width:${(r.hechos / r.total) * 100}%"></i></div>
      <div class="tc-pie">${estado}${r.hechos ? `<span class="nota-media num">${esc(T('nota_media'))} <b>${r.media}</b></span>` : ''}<a class="btn${r.hechos && !r.completo ? '' : r.completo ? ' sec' : ''}" href="#${t.id}">${esc(boton)}${ic('chevron-right')}</a></div>
    </li>`;
  }).join('');
  return cabecera(T('inicio_ante'), 'calendar-clock', T('inicio_titulo'), T('inicio_entradilla'), `<span class="pildora">${ic('info')}${esc(T('inicio_aviso'))}</span>`)
    + `<ol class="turnos-lista">${tarjetas}</ol>`;
}

/* ---------- Regleta del turno: la firma visual de BlueJr ----------
 * Una línea de tiempo de 08:00 a 14:30 con una marca por alerta. El tamaño dice la severidad,
 * el relleno dice si está cerrada y su nota; cada marca es un botón de 24 px que abre la alerta. */
const INI = 8 * 60, FIN = 14.5 * 60;
const posHora = (h) => { const [a, b] = h.split(':').map(Number); return ((a * 60 + b - INI) / (FIN - INI)) * 100; };
function regleta(t, compacta = false) {
  const horas = [8, 9, 10, 11, 12, 13, 14];
  const marcas = t.casos.map((c) => {
    const n = notaDe(c.id);
    const cls = n == null ? 'abierta' : n >= BJ.UMBRAL_APTO ? 'bien' : 'mal';
    const label = `${c.id} · ${c.hora} · ${T('sev.' + c.sev)} · ${L(c.titulo)} · ${n == null ? T('estado_abierta') : T('estado_cerrada', { n })}`;
    const act = !compacta && UI.caso === c.id ? ' aria-current="true"' : '';
    return compacta
      ? `<span class="marca s-${c.sev} ${cls}" style="left:${posHora(c.hora)}%" title="${esc(label)}"></span>`
      : `<button type="button" class="marca s-${c.sev} ${cls}" style="left:${posHora(c.hora)}%" data-caso="${c.id}" aria-label="${esc(label)}"${act}></button>`;
  }).join('');
  return `<div class="regleta${compacta ? ' compacta' : ''}"${compacta ? ' aria-hidden="true"' : ` role="group" aria-label="${esc(T('regleta'))}"`}><div class="eje">${horas.map((h) => `<span class="tick" style="left:${posHora(h + ':00')}%"><span class="num">${String(h).padStart(2, '0')}:00</span></span>`).join('')}</div>${marcas}</div>`;
}

/* ---------- Puesto de trabajo del turno ---------- */
function vTurno(id) {
  const t = turnoDe(id);
  if (!UI.caso || CASOS[UI.caso]?.turno !== id) UI.caso = (t.casos.find((c) => !cerrado(c.id)) || t.casos[0]).id;
  const r = BJ.resumenTurno(t, cerradas());
  const relevo = r.completo ? `<section class="relevo panel" aria-labelledby="relevo-t">
      <div class="relevo-cab"><h2 id="relevo-t">${ic(r.apto ? 'circle-check' : 'circle-x')}${esc(T('relevo_titulo'))}</h2><span class="estado ${r.apto ? 'ok' : 'ko'}">${esc(T('relevo_media', { n: r.media }))} · ${esc(r.apto ? T('apto') : T('no_apto', { n: BJ.UMBRAL_APTO }))}</span></div>
      <label class="campo">${esc(T('relevo'))}<textarea id="relevo" rows="3" maxlength="${BJ.LIMITES.relevo}" placeholder="${esc(T('relevo_ph'))}">${esc(S.relevos[id] || '')}</textarea></label>
      <div class="fila-der"><button type="button" class="btn" data-guardar-relevo="${id}">${ic('send')}${esc(T('guardar'))}</button></div></section>` : '';
  const paneles = ['cola', 'caso', 'ticket'];
  return cabecera(T('turno_ante', { n: numTurno(t), dia: diaDe(t).toUpperCase() }), 'siren', L(t.tema), '', `<span class="pildora num">${esc(T('progreso', { a: r.hechos, b: r.total }))}</span>`)
    // En pantallas estrechas las marcas quedarían a menos de 24 px: la regleta es solo visual y se navega con la cola.
    + regleta(t, matchMedia('(max-width: 900px)').matches)
    + relevo
    + `<div class="seg-movil" role="group" aria-label="${esc(T('paneles'))}">${paneles.map((p) => `<button type="button" data-panel="${p}" aria-pressed="${UI.panel === p}">${esc(T(p === 'cola' ? 'cola' : p === 'caso' ? 'caso' : 'ticket'))}</button>`).join('')}</div>`
    + `<div class="puesto" data-panel-activo="${UI.panel}">
        <section class="panel cola" aria-labelledby="cola-t"><h2 id="cola-t" class="panel-t">${ic('inbox')}${esc(T('cola'))}</h2><ol class="cola-lista">${t.casos.map(itemCola).join('')}</ol></section>
        <section class="panel caso" id="caso" aria-labelledby="caso-t">${panelCaso(CASOS[UI.caso])}</section>
        <section class="panel ticket" id="ticket" aria-labelledby="ticket-t">${panelTicket(CASOS[UI.caso])}</section>
      </div>`;
}

function itemCola(c) {
  const n = notaDe(c.id);
  const act = UI.caso === c.id;
  return `<li><button type="button" class="cola-item${act ? ' activa' : ''}" data-caso="${c.id}"${act ? ' aria-current="true"' : ''} aria-label="${esc(T('cola_ir', { id: c.id }))}: ${esc(L(c.titulo))}">
    <span class="ci-fila"><span class="num hora">${c.hora}</span>${sevChip(c.sev)}<span class="ci-estado num">${n == null ? '' : `${ic(n >= BJ.UMBRAL_APTO ? 'circle-check' : 'circle-x', n >= BJ.UMBRAL_APTO ? 'ok' : 'ko')}${n}`}</span></span>
    <span class="ci-titulo">${esc(L(c.titulo))}</span><span class="ci-id num">${c.id} · ${esc(c.fuente)}</span></button></li>`;
}

function panelCaso(c) {
  const lineas = BJ.registros(c);
  const fuentes = [...new Set(lineas.map((l) => l.s.replace(/^win-.*/, 'win')))];
  return `<div class="alerta">
      <div class="alerta-cab"><span class="num id">${c.id}</span>${sevChip(c.sev)}<span class="pildora fina">${ic('clock')}<span class="num">${c.hora}</span></span><span class="pildora fina">${ic('server')}${esc(c.fuente)}</span></div>
      <h2 id="caso-t">${esc(L(c.titulo))}</h2>
      <p class="regla"><span>${esc(T('regla'))}</span> ${esc(L(c.regla))}</p>
      <p class="resumen">${esc(L(c.resumen))}</p>
    </div>
    <div class="logs-cab"><h3>${ic('terminal')}${esc(T('registros'))}</h3><span class="num cuenta-lineas" id="cuenta-lineas"></span></div>
    <div class="logs-herr">
      <label class="filtro">${ic('filter')}<span class="sr-only">${esc(T('filtrar'))}</span><input id="filtro" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('filtrar_ph'))}" value="${esc(UI.filtro)}"></label>
      <div class="chips" role="group" aria-label="${esc(T('fuentes'))}"><button type="button" class="chip" data-fuente="" aria-pressed="${!UI.fuente}">${esc(T('todas'))}</button>${fuentes.map((f) => `<button type="button" class="chip" data-fuente="${esc(f)}" aria-pressed="${UI.fuente === f}">${esc(f)}</button>`).join('')}</div>
    </div>
    <div class="logs" id="logs" tabindex="0" role="region" aria-label="${esc(T('registros'))}">${lineasHtml(c, lineas)}</div>`;
}

function lineasHtml(c, lineas = BJ.registros(c)) {
  const q = BJ.normalizar(UI.filtro);
  const ev = new Set(respuesta(c.id).evidencias);
  const bloqueado = cerrado(c.id);
  const vis = lineas.filter((l) => (!UI.fuente || l.s.replace(/^win-.*/, 'win') === UI.fuente) && (!q || BJ.normalizar(`${l.t} ${l.s} ${l.m}`).includes(q)));
  queueMicrotask(() => { const el = $('#cuenta-lineas'); if (el) el.textContent = T('registros_n', { a: vis.length, b: lineas.length }); });
  if (!vis.length) return `<p class="vacio">${esc(T('sin_lineas'))}</p>`;
  const marcar = (txt) => { const e = esc(txt); if (!q) return e; const i = e.toLowerCase().indexOf(esc(q)); return i < 0 ? e : e.slice(0, i) + '<mark>' + e.slice(i, i + esc(q).length) + '</mark>' + e.slice(i + esc(q).length); };
  return `<ol class="lineas">${vis.map((l) => `<li><button type="button" class="linea${ev.has(l.n) ? ' fijada' : ''}" data-linea="${l.n}" aria-pressed="${ev.has(l.n)}"${bloqueado ? ' disabled' : ''} title="${esc(ev.has(l.n) ? T('desfijar') : T('fijar'))}"><span class="l-t num">${l.t}</span><span class="l-s">${esc(l.s)}</span><span class="l-m">${marcar(l.m)}</span>${ev.has(l.n) ? ic('pin', 'l-pin') : ''}</button></li>`).join('')}</ol>`;
}

function panelTicket(c) {
  const r = respuesta(c.id);
  const bloqueado = cerrado(c.id);
  const opciones = (grupo, lista, valor) => `<div class="opciones" role="radiogroup" aria-labelledby="${grupo}-t">${lista.map((v) => `<button type="button" role="radio" class="opcion" data-${grupo}="${v}" aria-checked="${valor === v}" tabindex="${valor === v || (!valor && v === lista[0]) ? 0 : -1}"${bloqueado ? ' disabled' : ''}><b>${esc(T(grupo === 'veredicto' ? 'veredictos.' + v : 'acciones.' + v))}</b><small>${esc(T(grupo === 'veredicto' ? 'veredictos_desc.' + v : 'acciones_desc.' + v))}</small></button>`).join('')}</div>`;
  const campos = BJ.camposDe(c).map((f) => `<label class="campo">${esc(L(f.label))}<input data-campo="${f.id}" value="${esc(r.campos[f.id] || '')}" maxlength="${BJ.LIMITES.campo}" autocomplete="off" spellcheck="false"${bloqueado ? ' readonly' : ''}></label>`).join('');
  const lineas = BJ.registros(c);
  const ev = r.evidencias.map((n) => lineas.find((l) => l.n === n)).filter(Boolean);
  const listo = r.veredicto && r.accion;
  return `<h2 id="ticket-t" class="panel-t">${ic('file-text')}${esc(T('ticket'))} <span class="num id">${c.id}</span></h2>
    <div class="ticket-f">
      <fieldset><legend id="veredicto-t">${esc(T('veredicto'))}</legend>${opciones('veredicto', BJ.VEREDICTOS, r.veredicto)}</fieldset>
      <fieldset><legend id="accion-t">${esc(T('accion'))}</legend>${opciones('accion', BJ.ACCIONES, r.accion)}</fieldset>
      <fieldset><legend>${esc(T('datos_clave'))}</legend><div class="campos">${campos}</div></fieldset>
      <div class="evidencias"><p class="etq">${ic('pin')}${esc(T('evidencias'))} <span class="num">${ev.length ? esc(T('evidencias_n', { n: ev.length })) : ''}</span></p>${ev.length ? `<ol>${ev.map((l) => `<li><code><span class="num">${l.t}</span> ${esc(l.s)} ${esc(l.m)}</code></li>`).join('')}</ol>` : `<p class="nota">${esc(T('evidencias_vacio'))}</p>`}</div>
      <label class="campo">${esc(T('resumen_ticket'))}<textarea id="texto-ticket" rows="5" maxlength="${BJ.LIMITES.ticket}" placeholder="${esc(T('resumen_ph'))}"${bloqueado ? ' readonly' : ''}>${esc(r.ticket)}</textarea><small class="num" id="cuenta-ticket">${esc(T('caracteres', { n: r.ticket.trim().length, m: BJ.TICKET_MIN }))}</small></label>
      ${bloqueado ? resultadoHtml(c) : `<div class="ticket-pie"><span class="nota" id="falta">${listo ? '' : esc(T('falta_elegir'))}</span><button type="button" class="btn" data-cerrar-ticket${listo ? '' : ' disabled'}>${ic('check')}${esc(T('cerrar_ticket'))}</button></div>`}
    </div>`;
}

function resultadoHtml(c) {
  const res = BJ.corregir(c, S.respuestas[c.id]);
  const nombre = (k, v) => (v == null ? T('sin_respuesta') : T((k === 'veredicto' ? 'veredictos.' : 'acciones.') + v));
  const filas = res.criterios.map((k) => {
    let det = '';
    if (k.id === 'veredicto' || k.id === 'accion') det = k.puntos ? '' : `<small>${esc(T('tu_respuesta', { v: nombre(k.id, k.valor) }))} · ${esc(T('esperado', { v: nombre(k.id, k.esperado) }))}</small>`;
    if (k.id === 'campos') det = k.detalle.filter((d) => !d.ok).map((d) => `<small>${esc(L(d.label))}: ${esc(T('esperado', { v: d.esperado }))}</small>`).join('');
    if (k.id === 'ticket') det = `${k.largo ? '' : `<small>${esc(T('ticket_largo'))}: ${BJ.TICKET_MIN}</small>`}${k.citas ? '' : `<small>${esc(T('ticket_citas', { n: k.necesarias, claves: c.claves.join(', ') }))}</small>`}`;
    const ok = k.puntos === k.peso;
    return `<li class="${ok ? 'ok' : 'ko'}">${ic(ok ? 'circle-check' : 'circle-x')}<span class="crit"><b>${esc(T('crit.' + k.id))}</b>${det}</span><span class="num">${esc(T('puntos', { a: k.puntos, b: k.peso }))}</span></li>`;
  }).join('');
  const t = turnoDe(c.turno);
  const sig = t.casos.find((x) => !cerrado(x.id));
  return `<div class="resultado ${res.apto ? 'ok' : 'ko'}" tabindex="-1" id="resultado">
      <div class="res-cab"><p class="etq">${esc(T('resultado'))}</p><p class="nota-grande num">${res.nota}<span>/100</span></p></div>
      <ul class="criterios">${filas}</ul>
      <h3>${esc(T('explicacion'))}</h3><p class="explica">${esc(L(c.explica))}</p>
      <div class="ticket-pie"><button type="button" class="btn sec" data-reintentar="${c.id}">${ic('rotate-ccw')}${esc(T('reintentar'))}</button>${sig ? `<button type="button" class="btn" data-caso="${sig.id}">${esc(T('siguiente'))}${ic('chevron-right')}</button>` : ''}</div>
    </div>`;
}

/* ---------- Historial ---------- */
function vHistorial() {
  const h = BJ.historial(TURNOS, cerradas());
  const kpi = (t, v, cls = '') => `<div class="kpi ${cls}"><span>${esc(t)}</span><b class="num">${v}</b></div>`;
  const comp = h.competencias.map((c) => `<li><span class="c-nom">${esc(T('comp.' + c.id))}</span><span class="c-barra" role="img" aria-label="${esc(T('comp.' + c.id))}: ${c.media == null ? esc(T('sin_datos')) : c.media + '/100'}"><i style="width:${c.media ?? 0}%"></i></span><span class="num c-val">${c.media == null ? '—' : c.media}</span><small class="num">${esc(T('comp_casos', { a: c.casos, b: c.total }))}</small></li>`).join('');
  const turnos = h.turnos.map((r) => { const t = turnoDe(r.id); return `<li><a href="#${t.id}"><span class="tc-num num">${numTurno(t)}</span><span><b>${esc(diaDe(t))}</b> · ${esc(L(t.tema))}</span><span class="num">${esc(T('progreso', { a: r.hechos, b: r.total }))}</span><span class="estado ${r.completo ? (r.apto ? 'ok' : 'ko') : ''}">${r.hechos ? r.media : '—'}</span></a></li>`; }).join('');
  const tickets = Object.values(CASOS).filter((c) => cerrado(c.id));
  return cabecera(T('hist_ante'), 'award', T('hist_titulo'), T('hist_entradilla'))
    + `<div class="kpis">${kpi(T('kpi_tickets'), `${h.tickets}<small>/${h.total}</small>`)}${kpi(T('kpi_media'), h.tickets ? h.media : '—')}${kpi(T('kpi_veredicto'), h.tickets ? pct(h.precisionVeredicto) : '—')}${kpi(T('kpi_errores'), h.cerradosPorError, h.cerradosPorError ? 'aviso' : '')}</div>
    <div class="hist-rej">
      <section class="panel" aria-labelledby="comp-t"><h2 id="comp-t" class="panel-t">${ic('target')}${esc(T('competencias_titulo'))}</h2><p class="nota">${esc(T('competencias_nota'))}</p><ul class="competencias">${comp}</ul></section>
      <section class="panel" aria-labelledby="ht-t"><h2 id="ht-t" class="panel-t">${ic('calendar-clock')}${esc(T('turnos_titulo'))}</h2><ul class="hist-turnos">${turnos}</ul>
        <h2 class="panel-t sep">${ic('archive')}${esc(T('datos_titulo'))}</h2>
        <div class="acciones-datos"><button type="button" class="btn" data-exportar-md>${ic('download')}${esc(T('exportar_md'))}</button><button type="button" class="btn sec" data-exportar-json>${ic('download')}${esc(T('exportar_json'))}</button><button type="button" class="btn sec" data-importar>${ic('upload')}${esc(T('importar'))}</button><button type="button" class="btn peligro" data-borrar>${ic('rotate-ccw')}${esc(UI.borrarArmado ? T('borrar_confirmar') : T('borrar'))}</button></div>
      </section>
    </div>
    <section class="panel" aria-labelledby="tk-t"><h2 id="tk-t" class="panel-t">${ic('scroll-text')}${esc(T('tickets_titulo'))}</h2>${tickets.length ? `<ul class="hist-tickets">${tickets.map((c) => { const r = S.respuestas[c.id]; return `<li><a href="#${c.turno}" data-caso-ir="${c.id}"><span class="num id">${c.id}</span><span class="ht-tit">${esc(L(c.titulo))}</span><span class="ht-dec">${esc(T('veredictos.' + r.veredicto))} · ${esc(T('acciones.' + r.accion))}</span><span class="num nota-chip ${r.nota >= BJ.UMBRAL_APTO ? 'ok' : 'ko'}">${r.nota}</span></a></li>`; }).join('')}</ul>` : `<p class="vacio">${esc(T('sin_tickets'))}</p>`}</section>`;
}

/* ---------- Exportaciones ---------- */
function historialMd() {
  const h = BJ.historial(TURNOS, cerradas());
  const fecha = new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const es = P.lang === 'es';
  const o = [];
  o.push(es ? '# Historial de turnos SOC · BlueJr' : '# SOC shift record · BlueJr', '');
  o.push(`**${S.perfil.nombre || (es ? 'Analista' : 'Analyst')}** · ${T('perfil_rol')} · ${fecha}`, '');
  o.push(`> ${es ? 'Simulación formativa de BlueJr con una empresa ficticia (Norte Logística). Las decisiones y los textos son del analista; la corrección es automática.' : 'BlueJr training simulation with a made-up company (Norte Logística). Decisions and texts are the analyst\'s; grading is automatic.'} ${REPO}`, '');
  o.push(`| ${T('kpi_tickets')} | ${T('kpi_media')} | ${T('kpi_veredicto')} | ${T('kpi_errores')} |`, '|---|---|---|---|', `| ${h.tickets}/${h.total} | ${h.media} | ${h.precisionVeredicto} % | ${h.cerradosPorError} |`, '');
  o.push(`## ${T('competencias_titulo')}`, '', `| ${es ? 'Competencia' : 'Competence'} | ${T('kpi_media')} | ${es ? 'Casos' : 'Cases'} |`, '|---|---|---|');
  for (const c of h.competencias) o.push(`| ${T('comp.' + c.id)} | ${c.media ?? '—'} | ${c.casos}/${c.total} |`);
  o.push('');
  for (const t of TURNOS) {
    const r = BJ.resumenTurno(t, cerradas());
    if (!r.hechos) continue;
    o.push(`## ${T('turno_n', { n: numTurno(t) })} · ${diaDe(t)} · ${L(t.tema)}`, '', `${T('progreso', { a: r.hechos, b: r.total })} · ${T('nota_media')} ${r.media}`, '');
    for (const c of t.casos.filter((x) => cerrado(x.id))) {
      const s = S.respuestas[c.id];
      const lineas = BJ.registros(c);
      o.push(`### ${c.id} · ${L(c.titulo)} · ${s.nota}/100`, '');
      o.push(`- ${T('veredicto')}: ${T('veredictos.' + s.veredicto)}`, `- ${T('accion')}: ${T('acciones.' + s.accion)}`);
      for (const f of BJ.camposDe(c)) if (s.campos[f.id]) o.push(`- ${L(f.label)}: \`${s.campos[f.id].replace(/`/g, "'")}\``);
      o.push('');
      if (s.ticket.trim()) o.push(...s.ticket.trim().split('\n').map((l) => '> ' + l), '');
      const ev = s.evidencias.map((n) => lineas.find((l) => l.n === n)).filter(Boolean);
      if (ev.length) o.push('```text', ...ev.map((l) => `${l.t} ${l.s} ${l.m}`), '```', '');
    }
    if (S.relevos[t.id]) o.push(`**${T('relevo')}**`, '', ...S.relevos[t.id].trim().split('\n').map((l) => '> ' + l), '');
  }
  return o.join('\n');
}
