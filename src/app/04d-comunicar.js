/* Comunicar y pedir ayuda.
 * «Comunícalo»: tras cerrar un ticket escalado, el mensaje a N2 y el aviso a dirección, corregidos en local.
 * «Pregunta al N2»: tres preguntas por turno a una mentora; cada una resta XP al ticket, nunca nota. */

const msgDe = (id) => S.mensajes[id] || (S.mensajes[id] = { ok: [], cuando: null });
const preguntasDe = (id) => S.n2[id] || [];
const preguntasTurno = (turnoId) => turnoDe(turnoId).casos.reduce((a, c) => a + preguntasDe(c.id).length, 0);
const mensajesCompletos = () => Object.values(S.mensajes).reduce((a, m) => a + (m.ok?.length || 0), 0);

/* ---------- Comunícalo ---------- */
function comunicaHtml(c) {
  if (c.accion === 'cerrar') return '';
  if (!UI.msgTipo) UI.msgTipo = 'n2';
  const m = msgDe(c.id);
  const tipo = UI.msgTipo;
  const texto = m[tipo] || '';
  const revisado = UI.msgRevisado === `${c.id}:${tipo}`;
  const res = revisado ? BJ.corregirMensaje(tipo, texto, c) : null;
  const lista = res ? `<ul class="criterios msg-crit" aria-live="polite">${res.criterios.map((k) => `<li class="${k.ok ? 'ok' : 'ko'}">${ic(k.ok ? 'circle-check' : 'circle-x')}<span class="crit"><b>${esc(T(`msg_crit.${tipo}.${k.id}`)[0])}</b>${k.ok ? '' : `<small>${esc(T(`msg_crit.${tipo}.${k.id}`)[1])}</small>`}</span></li>`).join('')}</ul>` : '';
  return `<section class="comunica" aria-labelledby="com-t">
      <h3 id="com-t">${ic('send')}${esc(T('com_titulo'))}</h3>
      <p class="nota">${esc(T('com_intro'))}</p>
      <div class="g-tabs" role="group" aria-label="${esc(T('com_titulo'))}">${BJ.TIPOS_MENSAJE.map((t) => `<button type="button" data-msg-tipo="${t}" aria-pressed="${tipo === t}">${ic(t === 'n2' ? 'send' : 'user')}${esc(T('com_tipo.' + t))}${m.ok.includes(t) ? ic('circle-check', 'ok') : ''}</button>`).join('')}</div>
      <p class="com-para">${esc(T('com_para.' + tipo))}</p>
      <label class="campo"><span class="sr-only">${esc(T('com_tipo.' + tipo))}</span><textarea id="msg-texto" rows="5" maxlength="${BJ.LIMITES.ticket}" placeholder="${esc(T('com_ph.' + tipo))}">${esc(texto)}</textarea><small class="num" id="msg-palabras">${esc(T('com_palabras', { n: (texto.trim().match(/\S+/g) || []).length }))}</small></label>
      <button type="button" class="btn sec com-revisar" data-msg-revisar>${ic('list-checks')}${esc(T('com_revisar'))}</button>
      <details class="com-ej"><summary>${esc(T('com_ejemplo'))}</summary><p>${esc(BJ.modeloMensaje(tipo, c, P.lang))}</p></details>
      ${lista}${res && res.completo ? `<p class="msg-ok">${ic('circle-check')}${esc(T('com_ok'))}</p>` : ''}
    </section>`;
}
function revisarMensaje() {
  const c = CASOS[UI.caso]; const tipo = UI.msgTipo; const m = msgDe(c.id);
  m[tipo] = $('#msg-texto').value.slice(0, BJ.LIMITES.ticket);
  const res = BJ.corregirMensaje(tipo, m[tipo], c);
  const antes = progresoActual();
  const nuevo = res.completo && !m.ok.includes(tipo);
  if (res.completo) { if (nuevo) m.ok.push(tipo); m.cuando = new Date().toISOString(); } else m.ok = m.ok.filter((t) => t !== tipo);
  UI.msgRevisado = `${c.id}:${tipo}`;
  guardar();
  repintarComunica();
  if (nuevo) avisosXp(antes, progresoActual(), '', 0, T('xp_msg', { n: BJ.XP_MENSAJE, t: T('com_tipo.' + tipo) }));
  $('.msg-crit')?.focus?.();
}
function repintarComunica() { const s = $('.comunica'); if (s) s.outerHTML = comunicaHtml(CASOS[UI.caso]); pintarLateral(); }

/* ---------- Pregunta al N2 ---------- */
function n2Html(c) {
  const hechas = preguntasDe(c.id);
  const quedan = Math.max(0, BJ.LIMITE_N2 - preguntasTurno(c.turno));
  const respuesta = (x) => {
    if (x.tipo === 'inicio') { const p = BJ.pistaN2('inicio', c); return T('n2_r.inicio', { f: p.fuente, h: p.hora }); }
    if (x.tipo === 'falta') return x.campos.length ? T('n2_r.falta', { c: x.campos.map((id) => L(BJ.camposDe(c).find((f) => f.id === id)?.label)).join(', ') }) : T('n2_r.falta_ok');
    return x.v === null ? T('n2_r.decision_nada') : x.v ? T('n2_r.decision_si') : T('n2_r.decision_no');
  };
  return `<section class="n2" aria-labelledby="n2-t">
      <div class="n2-cab"><span class="n2-av" aria-hidden="true">IS</span><div><h3 id="n2-t">${esc(T('n2_titulo'))}</h3><p class="nota">${esc(T(quedan === 1 ? 'n2_sub_1' : 'n2_sub', { n: quedan, c: BJ.COSTE_N2 }))}</p></div></div>
      ${hechas.length ? `<ul class="n2-hilo">${hechas.map((x) => `<li><b>${esc(T('n2_q.' + x.tipo))}</b><span>${esc(respuesta(x))}</span></li>`).join('')}</ul>` : ''}
      <div class="n2-qs">${BJ.PREGUNTAS_N2.filter((t) => !hechas.some((x) => x.tipo === t)).map((t) => `<button type="button" class="chip n2-q" data-n2="${t}"${quedan ? '' : ' disabled'}>${esc(T('n2_q.' + t))}</button>`).join('')}</div>
    </section>`;
}
function preguntarN2(tipo) {
  const c = CASOS[UI.caso];
  if (cerrado(c.id) || preguntasTurno(c.turno) >= BJ.LIMITE_N2 || preguntasDe(c.id).some((x) => x.tipo === tipo)) return;
  const p = BJ.pistaN2(tipo, c, respuesta(c.id));
  const guardada = tipo === 'decision' ? { tipo, v: p.v } : tipo === 'falta' ? { tipo, campos: p.campos } : { tipo };
  S.n2[c.id] = [...preguntasDe(c.id), guardada];
  guardar();
  const s = $('.n2'); if (s) s.outerHTML = n2Html(c);
  avisar(T('n2_coste', { n: BJ.COSTE_N2 }), 'user');
  $('.n2-hilo li:last-child')?.setAttribute('tabindex', '-1');
  $('.n2-hilo li:last-child')?.focus();
}
