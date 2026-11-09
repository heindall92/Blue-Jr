/* Eventos y arranque. Un único delegado por tipo de evento: la interfaz se repinta por zonas. */

function pintar() {
  const r = ruta();
  aplicarTema();
  pintarLateral(); pintarBarra(); pintarAbajo();
  if (r.vista === 'turno') { UI.ultimoTurno = r.turno; escribir('bluejr-ultimo', r.turno); }
  const main = $('#main');
  main.innerHTML = `<div class="vista">${r.vista === 'turno' ? vTurno(r.turno) : r.vista === 'historial' ? vHistorial() : r.vista === 'revision' ? vRevision() : r.vista === 'rapido' ? vRapido() : vTurnos()}</div>`;
  const titulo = r.vista === 'turno' ? `${T('turno_n', { n: r.turno.slice(1) })} · ${diaDe(turnoDe(r.turno))}` : r.vista === 'historial' ? T('nav_historial') : r.vista === 'revision' ? T('rev_corto') : r.vista === 'rapido' ? T('rap_titulo') : T('nav_turnos');
  document.title = `${titulo} · Blue-Jr`;
  $('.saltar').textContent = T('saltar');
  // La entrada solo se reproduce al cambiar de vista (y al arrancar), no en cada repintado.
  const clave = r.vista + (r.turno || '');
  if (clave !== UI.vistaAnimada) { UI.vistaAnimada = clave; $('#main .vista').classList.add('entrando'); MOV.vista($('#main .vista')); MOV.contar($('#main')); }
  else for (const el of $$('#main [data-cuenta]')) el.textContent = num(Number(el.dataset.cuenta)) + (el.dataset.sufijo || '');
  if (r.vista === 'turnos') iniciarFlujo();
}

/* Repintados parciales del puesto de trabajo: no se pierde el foco ni el desplazamiento de los registros. */
function pintarCaso() {
  const c = CASOS[UI.caso];
  $('#caso').innerHTML = panelCaso(c);
  $('#ticket').innerHTML = panelTicket(c);
  $$('.cola-item').forEach((b) => { const a = b.dataset.caso === UI.caso; b.classList.toggle('activa', a); a ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
  $$('.regleta .marca[data-caso]').forEach((b) => (b.dataset.caso === UI.caso ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
}
function pintarLineas() { const c = CASOS[UI.caso]; $('#logs').innerHTML = lineasHtml(c); }
function pintarTicket() { $('#ticket').innerHTML = panelTicket(CASOS[UI.caso]); }

function abrirCaso(id, foco = true) {
  if (!CASOS[id]) return;
  UI.caso = id; UI.filtro = ''; UI.fuente = null; UI.panel = 'caso'; UI.msgRevisado = null;
  if (ruta().turno !== CASOS[id].turno) { location.hash = CASOS[id].turno; return; }
  pintarCaso();
  $('.puesto')?.setAttribute('data-panel-activo', 'caso');
  $$('[data-panel]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === 'caso'));
  const h = $('#caso-t');
  if (foco && h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

function cerrarTicket() {
  const c = CASOS[UI.caso];
  const r = respuesta(c.id);
  if (!r.veredicto || !r.accion) return;
  const antes = progresoActual();
  r.cerrado = true;
  r.cuando = new Date().toISOString();
  r.nota = BJ.corregir(c, r).nota;
  guardar();
  const scroll = scrollY;
  pintar();
  scrollTo(0, scroll);
  // La XP del ticket descuenta lo que costaron las preguntas al N2; la nota no cambia.
  avisosXp(antes, progresoActual(), c.id, r.nota, T('xp_ganado', { x: Math.max(0, r.nota - BJ.COSTE_N2 * (S.n2[c.id]?.length || 0)), n: r.nota, id: c.id }));
  UI.panel = 'ticket';
  $('.puesto')?.setAttribute('data-panel-activo', 'ticket');
  $$('[data-panel]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === 'ticket'));
  $('#resultado')?.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('button, a');
  if (!b) { if (e.target.tagName === 'DIALOG') cerrarDialogo(e.target); return; }
  const d = b.dataset;
  if ('cerrarDlg' in d) return cerrarDialogo(b.closest('dialog'));
  if ('ayuda' in d) return abrirAyuda();
  if ('buscar' in d) return abrirBusqueda();
  if ('perfil' in d) return abrirPerfil();
  if (d.tab) { tabAyuda = d.tab; pintarAyuda(); return $('#tab-' + d.tab).focus(); }
  if (d.lang) { P.lang = d.lang; guardarPrefs(); return pintar(); }
  if ('tema' in d) { P.theme = temaActual() === 'dark' ? 'light' : 'dark'; guardarPrefs(); aplicarTema(); return b.setAttribute('aria-checked', temaActual() === 'dark'); }
  if (d.accentPick) { P.accent = d.accentPick; guardarPrefs(); aplicarTema(); return $$('[data-accent-pick]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.accentPick === P.accent)); }
  if ('alternarLateral' in d) return alternarLateral(b);
  if (d.q !== undefined) return elegirBusqueda(+d.q);
  if (d.casoIr) { UI.caso = d.casoIr; return; }
  if (d.caso) return abrirCaso(d.caso);
  if (d.panel) { UI.panel = d.panel; $('.puesto').setAttribute('data-panel-activo', d.panel); return $$('[data-panel]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.panel === d.panel)); }
  if (d.pivote !== undefined) {
    UI.filtro = UI.filtro === d.pivote ? '' : d.pivote; UI.investigado.add(UI.caso);
    $('#filtro').value = UI.filtro;
    $$('[data-pivote]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.pivote === UI.filtro));
    pintarLineas(); return actualizarTareas();
  }
  if (d.msgTipo) { UI.msgTipo = d.msgTipo; repintarComunica(); return $(`[data-msg-tipo="${d.msgTipo}"]`)?.focus(); }
  if ('msgRevisar' in d) return revisarMensaje();
  if (d.n2) return preguntarN2(d.n2);
  if (d.rev) return abrirRev(d.rev);
  if (d.dictamen || d.motivo || d.raccion) {
    const k = d.dictamen ? 'dictamen' : d.motivo ? 'motivo' : 'raccion';
    const r = revResp(UI.rev); r[k === 'raccion' ? 'accion' : k] = d[k]; guardar();
    $('#rinforme').innerHTML = panelInforme(REV[UI.rev]);
    return $(`[data-${k}="${d[k]}"]`)?.focus();
  }
  if ('enviarRev' in d) return enviarRevision();
  if (d.revRepetir) { const r = revResp(d.revRepetir); delete r.cerrado; delete r.nota; guardar(); $('#rinforme').innerHTML = panelInforme(REV[d.revRepetir]); pintarLateral(); return $('[data-dictamen]')?.focus(); }
  if (d.rapido) return responderRapido(d.rapido);
  if ('rapidoSig' in d) return siguienteRapido();
  if ('rapidoOtra' in d) { nuevaRonda(); repintarRapido(); return $('[data-rapido]')?.focus(); }
  if (d.guiaTab) { UI.guiaTab = d.guiaTab; const g = $('#guia'); g.outerHTML = guiaHtml(CASOS[UI.caso]); return $(`[data-guia-tab="${d.guiaTab}"]`)?.focus(); }
  if ('decidirAbrir' in d) { camino = []; return abrirAyuda('decidir'); }
  if (d.decidir) {
    camino = d.decidir === 'reset' ? [] : [...camino, d.decidir];
    $('#panel-ayuda').innerHTML = decidirHtml();
    return ($('#panel-ayuda [data-decidir="si"]') || $('#panel-ayuda [data-decidir="reset"]'))?.focus();
  }
  if (d.fuente !== undefined) { UI.investigado.add(UI.caso); UI.fuente = d.fuente || null; $$('.chips [data-fuente]').forEach((x) => x.setAttribute('aria-pressed', (x.dataset.fuente || null) === UI.fuente)); return pintarLineas(); }
  if (d.linea !== undefined) {
    const r = respuesta(UI.caso); const n = +d.linea;
    r.evidencias = r.evidencias.includes(n) ? r.evidencias.filter((x) => x !== n) : [...r.evidencias, n].slice(0, BJ.LIMITES.evidencias);
    guardar(); pintarLineas(); pintarTicket();
    return $(`[data-linea="${n}"]`)?.focus();
  }
  if (d.veredicto || d.accion) {
    const k = d.veredicto ? 'veredicto' : 'accion';
    respuesta(UI.caso)[k] = d[k]; guardar(); pintarTicket();
    return $(`[data-${k}="${d[k]}"]`)?.focus();
  }
  if ('cerrarTicket' in d) return cerrarTicket();
  if (d.reintentar) {
    // La entrevista depende de lo que se decidió: al reabrir el ticket, se empieza de cero.
    const r = respuesta(d.reintentar); delete r.cerrado; delete r.nota; delete S.defensas[d.reintentar]; guardar();
    pintar(); return $('[data-veredicto]')?.focus();
  }
  if (d.guardarRelevo) { S.relevos[d.guardarRelevo] = $('#relevo').value.slice(0, BJ.LIMITES.relevo); guardar(); return avisar(T('relevo_guardado')); }
  if ('exportarMd' in d) return descargar(`bluejr-historial-${new Date().toISOString().slice(0, 10)}.md`, historialMd(), 'text/markdown;charset=utf-8');
  if ('exportarJson' in d) return descargar(`bluejr-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'bluejr', version: VERSION, ...S }, null, 2), 'application/json');
  if (d.defP) { UI.defP = d.defP; UI.defRevisado = null; repintarDefiende(); return $(`[data-def-p="${d.defP}"]`)?.focus(); }
  if ('defRevisar' in d) return revisarDefensa();
  if (d.star) return exportarStar([d.star]);
  if ('starTodas' in d) return exportarStar(Object.keys(CASOS).filter(cerrado));
  if ('imprimir' in d) return imprimirHistorial();
  if ('importar' in d) return $('#archivo').click();
  if ('borrar' in d) {
    if (!UI.borrarArmado) { UI.borrarArmado = true; b.lastChild.textContent = T('borrar_confirmar'); setTimeout(() => { UI.borrarArmado = false; if (document.contains(b)) b.lastChild.textContent = T('borrar'); }, 4000); return; }
    UI.borrarArmado = false; S = BJ.sanearEstado(null, CASOS, REV_INDICE); UI.rapido = null; guardar(); pintar(); return avisar(T('borrado'));
  }
});

function alternarLateral(b = $('[data-alternar-lateral]')) {
  P.lateral = !P.lateral; guardarPrefs();
  document.body.classList.toggle('lateral-compacto', !P.lateral);
  b?.setAttribute('aria-expanded', P.lateral);
  setTimeout(MOV.indicador, 320);
}

/* Desde el historial, el enlace de un ticket abre su turno con esa alerta seleccionada. */
document.addEventListener('click', (e) => { const a = e.target.closest('[data-caso-ir]'); if (a) UI.caso = a.dataset.casoIr; }, true);

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q') return buscar(t.value);
  if (t.id === 'filtro') {
    UI.filtro = t.value; if (t.value.trim()) UI.investigado.add(UI.caso);
    $$('[data-pivote]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.pivote === UI.filtro));
    pintarLineas(); return actualizarTareas();
  }
  if (t.dataset.campo) { respuesta(UI.caso).campos[t.dataset.campo] = t.value.slice(0, BJ.LIMITES.campo); guardar(); return actualizarTareas(); }
  if (t.id === 'def-texto') { editarDefensa(t.value); $('#def-palabras').textContent = T('com_palabras', { n: (t.value.trim().match(/\S+/g) || []).length }); return; }
  if (t.id === 'msg-texto') { msgDe(UI.caso)[UI.msgTipo] = t.value.slice(0, BJ.LIMITES.ticket); guardar(); $('#msg-palabras').textContent = T('com_palabras', { n: (t.value.trim().match(/\S+/g) || []).length }); return; }
  if (t.id === 'texto-ticket') { respuesta(UI.caso).ticket = t.value.slice(0, BJ.LIMITES.ticket); guardar(); $('#cuenta-ticket').textContent = T('caracteres', { n: t.value.trim().length, m: BJ.TICKET_MIN }); actualizarTareas(); }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'f-perfil') { S.perfil.nombre = String(new FormData(e.target).get('nombre') || '').trim().slice(0, BJ.LIMITES.nombre); guardar(); pintarLateral(); }
});

$('#archivo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) return avisar(T('import_error'));
  const r = BJ.safeParse(await f.text());
  if (!r.ok || !r.valor || r.valor.app !== 'bluejr') return avisar(T('import_error'));
  S = BJ.sanearEstado(r.valor, CASOS, REV_INDICE); UI.rapido = null; guardar(); pintar();
  avisar(T('importado', { n: Object.values(S.respuestas).filter((x) => x.cerrado).length }));
});

document.addEventListener('keydown', (e) => {
  const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return abrirBusqueda(); }
  if (e.target.id === 'q') {
    if (e.key === 'ArrowDown') { e.preventDefault(); return moverBusqueda(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); return moverBusqueda(-1); }
    if (e.key === 'Enter') { e.preventDefault(); return elegirBusqueda(activo); }
  }
  // Pestañas de la ayuda: flechas, Inicio y Fin.
  if (e.target.getAttribute('role') === 'tab' && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const i = TABS.indexOf(tabAyuda);
    tabAyuda = TABS[e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length];
    pintarAyuda(); return $('#tab-' + tabAyuda).focus();
  }
  // Grupos de radio (veredicto y acción): flechas para moverse y elegir.
  if (e.target.getAttribute('role') === 'radio' && (e.target.dataset.veredicto || e.target.dataset.accion) && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    const k = e.target.dataset.veredicto ? 'veredicto' : 'accion';
    const lista = k === 'veredicto' ? BJ.VEREDICTOS : BJ.ACCIONES;
    const i = lista.indexOf(e.target.dataset[k]);
    const v = lista[(i + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1) + lista.length) % lista.length];
    respuesta(UI.caso)[k] = v; guardar(); pintarTicket();
    return $(`[data-${k}="${v}"]`)?.focus();
  }
  if (e.target.getAttribute('role') === 'radio' && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
    const k = ['dictamen', 'motivo', 'raccion'].find((x) => e.target.dataset[x]);
    if (k) {
      e.preventDefault();
      const lista = k === 'dictamen' ? BJ.DICTAMENES : k === 'motivo' ? BJ.ERRORES_IA : BJ.ACCIONES;
      const v = lista[(lista.indexOf(e.target.dataset[k]) + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1) + lista.length) % lista.length];
      const r = revResp(UI.rev); r[k === 'raccion' ? 'accion' : k] = v; guardar();
      $('#rinforme').innerHTML = panelInforme(REV[UI.rev]);
      return $(`[data-${k}="${v}"]`)?.focus();
    }
  }
  if (enCampo || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  if (ruta().vista === 'rapido' && UI.rapido && !UI.rapido.fin) {
    if (['1', '2', '3'].includes(e.key) && !UI.rapido.respuesta) { e.preventDefault(); return responderRapido(BJ.ACCIONES[+e.key - 1]); }
    if (e.key === 'Enter' && UI.rapido.respuesta && !e.target.closest('button, a')) { e.preventDefault(); return siguienteRapido(); }
  }
  if (e.key === '?') { e.preventDefault(); return abrirAyuda(); }
  if (e.key === '[' && matchMedia('(min-width: 901px)').matches) { e.preventDefault(); return alternarLateral(); }
  if (e.key === '/' && $('#filtro')) { e.preventDefault(); return $('#filtro').focus(); }
  if ((e.key === 'j' || e.key === 'k') && ruta().vista === 'turno') {
    const casos = turnoDe(ruta().turno).casos;
    const i = casos.findIndex((c) => c.id === UI.caso);
    const sig = casos[Math.min(casos.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))];
    if (sig) { abrirCaso(sig.id, false); $(`.cola-item[data-caso="${sig.id}"]`)?.focus(); }
  }
});

document.addEventListener('toggle', (e) => { if (e.target.id === 'guia') UI.guia = e.target.open; }, true);

addEventListener('hashchange', () => { pintar(); $('#main').focus({ preventScroll: true }); scrollTo(0, 0); });
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (!P.theme) pintar(); });
matchMedia('(max-width: 900px)').addEventListener?.('change', () => { if (ruta().vista === 'turno') pintar(); });

if (TEST) window.__BJ__ = { S: () => S, UI, CASOS, BJ, pintar };
pintar();
// Tras la primera carga, el lateral ya no repite su entrada al repintarse.
setTimeout(() => document.body.classList.add('ya-cargado'), 700);
