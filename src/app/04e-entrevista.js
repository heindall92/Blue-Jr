/* Del ticket a la entrevista.
 * «Defiende tu ticket»: tres preguntas de entrevista sobre la decisión del propio analista, corregidas en local.
 * Historias STAR para Astrolabio (formato «yrd-ecosistema») e historial imprimible de una página por turno. */

const defensaDe = (id) => S.defensas[id] || (S.defensas[id] = { ok: [], cuando: null });
const defensasCompletas = () => Object.values(S.defensas).filter((d) => d.ok?.length === BJ.PREGUNTAS_DEF.length).length;
const nombreDecision = (k, v) => T((k === 'veredicto' ? 'veredictos.' : 'acciones.') + v);

/** Texto de la pregunta según lo que se decidió: defender la decisión o reconocer el error. */
function textoPregunta(p, c) {
  if (p.modo === 'error') return T('def_q.error', { id: c.id, tu: nombreDecision(p.id, p.tu), que: T('def_que.' + p.id), sol: nombreDecision(p.id, p.sol) });
  if (p.id === 'veredicto') return T('def_q.veredicto', { id: c.id, tu: nombreDecision('veredicto', p.tu), alt: nombreDecision('veredicto', p.alt) });
  if (p.id === 'accion') return T('def_q.accion.' + p.tu);
  return T('def_q.evidencia');
}

/* ---------- Defiende tu ticket ---------- */
function defiendeHtml(c) {
  if (!cerrado(c.id)) return '';
  const preguntas = BJ.preguntasDefensa(c, S.respuestas[c.id]);
  if (!preguntas.some((p) => p.id === UI.defP)) UI.defP = preguntas[0].id;
  const p = preguntas.find((x) => x.id === UI.defP);
  const d = S.defensas[c.id] || { ok: [] };
  const texto = d[p.id] || '';
  const revisado = UI.defRevisado === `${c.id}:${p.id}`;
  const res = revisado ? BJ.corregirDefensa(p, texto, c) : null;
  const lista = res ? `<ul class="criterios def-crit" aria-live="polite">${res.criterios.map((k) => `<li class="${k.ok ? 'ok' : 'ko'}">${ic(k.ok ? 'circle-check' : 'circle-x')}<span class="crit"><b>${esc(T('def_crit.' + k.id)[0])}</b>${k.ok ? '' : `<small>${esc(T('def_crit.' + k.id)[1])}</small>`}</span></li>`).join('')}</ul>` : '';
  return `<section class="defiende" aria-labelledby="def-t">
      <div class="n2-cab"><span class="n2-av def-av" aria-hidden="true">DV</span><div><h3 id="def-t">${ic('mic')}${esc(T('def_titulo'))}</h3><p class="nota">${esc(T('def_sub'))}</p></div></div>
      <div class="g-tabs" role="group" aria-label="${esc(T('def_titulo'))}">${preguntas.map((x) => `<button type="button" data-def-p="${x.id}" aria-pressed="${x.id === p.id}">${esc(T('def_tab.' + x.id))}${(d.ok || []).includes(x.id) ? ic('circle-check', 'ok') : ''}</button>`).join('')}</div>
      <p class="def-q" id="def-q">${esc(textoPregunta(p, c))}</p>
      <label class="campo"><span class="sr-only">${esc(textoPregunta(p, c))}</span><textarea id="def-texto" rows="4" maxlength="${BJ.LIMITES.ticket}" aria-describedby="def-q" placeholder="${esc(T(p.modo === 'error' ? 'def_ph_error' : 'def_ph'))}">${esc(texto)}</textarea><small class="num" id="def-palabras">${esc(T('com_palabras', { n: (texto.trim().match(/\S+/g) || []).length }))}</small></label>
      <button type="button" class="btn sec com-revisar" data-def-revisar>${ic('list-checks')}${esc(T('def_revisar'))}</button>
      <details class="com-ej"><summary>${esc(T('def_ejemplo'))}</summary><p>${esc(BJ.modeloDefensa(p, c, P.lang))}</p></details>
      ${lista}${res && res.completo ? `<p class="msg-ok">${ic('circle-check')}${esc(T('def_ok'))}</p>` : ''}
      <div class="def-pie"><span class="nota num">${esc(T('def_hecha', { n: (d.ok || []).length }))}</span><button type="button" class="btn sec" data-star="${c.id}">${ic('star')}${esc(T('star_uno'))}</button></div>
    </section>`;
}
function revisarDefensa() {
  const c = CASOS[UI.caso];
  const p = BJ.preguntasDefensa(c, S.respuestas[c.id]).find((x) => x.id === UI.defP);
  if (!p) return;
  const d = defensaDe(c.id);
  d[p.id] = $('#def-texto').value.slice(0, BJ.LIMITES.ticket);
  const res = BJ.corregirDefensa(p, d[p.id], c);
  const antes = progresoActual();
  const completaAntes = d.ok.length === BJ.PREGUNTAS_DEF.length;
  d.ok = res.completo ? [...new Set([...d.ok, p.id])] : d.ok.filter((x) => x !== p.id);
  const completa = d.ok.length === BJ.PREGUNTAS_DEF.length;
  if (completa && !completaAntes) d.cuando = new Date().toISOString();
  UI.defRevisado = `${c.id}:${p.id}`;
  guardar();
  repintarDefiende();
  if (completa && !completaAntes) avisosXp(antes, progresoActual(), '', 0, T('xp_def', { n: BJ.XP_DEFENSA, id: c.id }));
}
function repintarDefiende() { const s = $('.defiende'); if (s) s.outerHTML = defiendeHtml(CASOS[UI.caso]); pintarLateral(); }

/* ---------- Historias STAR para Astrolabio ---------- */
function historiaDe(id) {
  const c = CASOS[id];
  const t = turnoDe(c.turno);
  return BJ.historiaStar(c, S.respuestas[id], { lang: P.lang, turno: { n: numTurno(t), dia: t.dia }, defensa: S.defensas[id], mensajes: S.mensajes[id]?.ok || [] });
}
function exportarStar(ids) {
  const lista = ids.filter(cerrado);
  if (!lista.length) return;
  const sobre = BJ.sobreHistorias(lista.map(historiaDe), VERSION);
  const nombre = lista.length === 1 ? `bluejr-star-${lista[0]}.json` : `bluejr-historias-star-${new Date().toISOString().slice(0, 10)}.json`;
  descargar(nombre, JSON.stringify(sobre, null, 2), 'application/json');
}

/* ---------- Historial imprimible: una página por turno ---------- */
function impresionHtml() {
  const fecha = new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const hojas = TURNOS.map((t) => ({ t, r: BJ.resumenTurno(t, cerradas()) })).filter((x) => x.r.hechos);
  return hojas.map(({ t, r }, i) => {
    const casos = t.casos.filter((x) => cerrado(x.id));
    const res = (c) => S.respuestas[c.id];
    const v = casos.filter((c) => res(c).veredicto === c.veredicto).length;
    const a = casos.filter((c) => res(c).accion === c.accion).length;
    const defendidos = casos.filter((c) => S.defensas[c.id]?.ok?.length === BJ.PREGUNTAS_DEF.length).length;
    const relevo = (S.relevos[t.id] || '').trim();
    const [cA, cH, cV, cAc, cN] = T('pdf_cols');
    return `<section class="hoja">
        <header class="hoja-cab"><p class="hoja-marca">${ic('radar')}<b>Blue-Jr</b> · ${esc(T('pdf_titulo'))}</p><p>${esc(S.perfil.nombre || T('perfil_rol'))} · ${esc(fecha)}</p></header>
        <h1>${esc(T('turno_n', { n: numTurno(t) }))} · ${esc(diaDe(t))} · ${esc(L(t.tema))}</h1>
        <p class="hoja-res"><b>${esc(T('progreso', { a: r.hechos, b: r.total }))}</b> · ${esc(T('nota_media'))} <b>${r.media}</b>/100 · ${esc(T('pdf_aciertos', { v, a, n: casos.length }))}</p>
        <table><thead><tr><th>${esc(cA)}</th><th>${esc(cH)}</th><th>${esc(cV)}</th><th>${esc(cAc)}</th><th>${esc(cN)}</th></tr></thead><tbody>
        ${casos.map((c) => { const s = res(c); return `<tr><td><b>${c.id}</b> ${esc(L(c.titulo))}</td><td>${c.hora}</td><td class="${s.veredicto === c.veredicto ? '' : 'mal'}">${esc(T('veredictos.' + s.veredicto))}</td><td class="${s.accion === c.accion ? '' : 'mal'}">${esc(T('acciones.' + s.accion))}</td><td><b>${s.nota}</b></td></tr>`; }).join('')}
        </tbody></table>
        ${defendidos ? `<p class="hoja-res">${esc(T('pdf_defendidos', { n: defendidos }))}</p>` : ''}
        ${relevo ? `<h2>${esc(T('relevo'))}</h2><p class="hoja-relevo">${esc(relevo.length > 700 ? relevo.slice(0, 699) + '…' : relevo)}</p>` : ''}
        <footer class="hoja-pie"><span>${esc(T('pdf_aviso'))} ${esc(REPO)}</span><span>${esc(T('pdf_pie', { p: i + 1, t: hojas.length }))}</span></footer>
      </section>`;
  }).join('');
}
function imprimirHistorial() {
  let caja = $('#impresion');
  if (!caja) { caja = document.createElement('div'); caja.id = 'impresion'; document.body.append(caja); }
  caja.innerHTML = impresionHtml();
  if (!caja.children.length) return;
  window.print();
}
