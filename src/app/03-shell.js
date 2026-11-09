/* Armazón: barra lateral, barra superior, barra inferior en móvil, ayuda, búsqueda y perfil. */

/* ---------- Rutas: #turnos, #historial, #T1…#T5 ---------- */
function ruta() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (/^T[1-5]$/.test(h)) return { vista: 'turno', turno: h };
  if (h === 'historial') return { vista: 'historial' };
  if (h === 'revision') return { vista: 'revision' };
  if (h === 'rapido') return { vista: 'rapido' };
  return { vista: 'turnos' };
}

function logo() {
  return `<span class="logo">${ic('radar')}</span>`;
}

function pintarLateral() {
  const r = ruta();
  const actual = (v) => (v ? ' aria-current="page"' : '');
  const cerr = Object.fromEntries(Object.entries(S.respuestas).filter(([, v]) => v.cerrado));
  const turnos = TURNOS.map((t, i) => {
    const res = BJ.resumenTurno(t, cerr);
    const estado = res.completo ? (res.apto ? 'ok' : 'ko') : res.hechos ? 'medio' : '';
    const nombre = `${T('turno_n', { n: numTurno(t) })} · ${diaDe(t)}`;
    return `<li style="--i:${i + 1}"><a href="#${t.id}" class="sub" title="${esc(nombre)}"${actual(r.vista === 'turno' && r.turno === t.id)}><span class="punto ${estado}" aria-hidden="true"><b class="num">${numTurno(t)}</b></span><span class="txt">${esc(nombre)}</span><span class="cuenta num">${res.hechos}/${res.total}</span></a></li>`;
  }).join('');
  // Cada sección tiene su propio gesto en el icono al pasar el ratón (data-anim).
  $('#lateral').innerHTML = `
    <div class="lat-cab">${logo()}<div class="marca-txt"><b>Blue-Jr</b><span>${esc(T('submarca'))}</span></div></div>
    <nav aria-label="${esc(T('nav_secciones'))}" class="lat-nav">
      <span class="lat-ind" aria-hidden="true"></span>
      <a href="#turnos" data-anim="reloj" style="--i:0" title="${esc(T('nav_turnos'))}"${actual(r.vista === 'turnos')}>${ic('calendar-clock')}<span class="txt">${esc(T('nav_turnos'))}</span></a>
      <ul>${turnos}</ul>
      <a href="#rapido" data-anim="rayo" style="--i:6" title="${esc(T('rap_titulo'))}"${actual(r.vista === 'rapido')}>${ic('zap')}<span class="txt">${esc(T('rap_titulo'))}</span></a>
      <a href="#revision" data-anim="bot" style="--i:7" title="${esc(T('rev_corto'))}"${actual(r.vista === 'revision')}>${ic('bot')}<span class="txt">${esc(T('rev_corto'))}</span></a>
      <a href="#historial" data-anim="medalla" style="--i:8" title="${esc(T('nav_historial'))}"${actual(r.vista === 'historial')}>${ic('award')}<span class="txt">${esc(T('nav_historial'))}</span></a>
    </nav>
    <div class="lat-pie">
      <div class="acentos" role="group" aria-label="${esc(T('acento'))}">${ACENTOS.map((a) => `<button type="button" class="acento-b" data-accent-pick="${a}" aria-pressed="${P.accent === a}" title="${esc(T('acentos.' + a))}" aria-label="${esc(T('acentos.' + a))}"></button>`).join('')}</div>
      <button type="button" class="cuenta-b" data-perfil title="${esc(S.perfil.nombre || T('perfil_sin'))}">
        <span class="avatar" aria-hidden="true">${S.perfil.nombre ? esc(iniciales(S.perfil.nombre)) : ic('user')}</span>
        <span class="cuenta-txt"><b>${esc(S.perfil.nombre || T('perfil_sin'))}</b><small>${esc(T('niveles.' + progresoActual().nivel))} · <span class="num">${esc(T('xp_total', { n: num(progresoActual().xp) }))}</span></small></span>
      </button>
    </div>`;
  document.body.classList.toggle('lateral-compacto', !P.lateral);
  requestAnimationFrame(MOV.indicador);
}
const iniciales = (n) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function pintarBarra() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  $('#barra').innerHTML = `
    <div class="barra-in">
      <button type="button" class="icono-b solo-escritorio" data-alternar-lateral aria-label="${esc(T('lateral_alternar'))}" aria-expanded="${P.lateral}" title="${esc(T('lateral_alternar'))} ( [ )">${ic('panel-left')}</button>
      <a href="#turnos" class="marca-movil">${logo()}<b>Blue-Jr</b></a>
      <span class="hueco"></span>
      <button type="button" class="buscar-b" data-buscar aria-label="${esc(T('buscar'))}">${ic('search')}<span class="txt">${esc(T('buscar'))}</span><kbd>${mac ? '⌘K' : 'Ctrl K'}</kbd></button>
      <div class="idioma" role="group" aria-label="${esc(T('idioma'))}">
        <button type="button" data-lang="es" aria-pressed="${P.lang === 'es'}">ES</button><button type="button" data-lang="en" aria-pressed="${P.lang === 'en'}">EN</button>
      </div>
      <button type="button" class="interruptor" role="switch" aria-checked="${temaActual() === 'dark'}" aria-label="${esc(T('tema'))}" data-tema>
        <span class="pista">${ic('sun')}${ic('moon')}</span><span class="perilla"></span>
      </button>
      <button type="button" class="icono-b" data-ayuda aria-label="${esc(T('ayuda'))}">${ic('circle-help')}</button>
    </div>`;
}

function pintarAbajo() {
  const r = ruta();
  const turno = r.vista === 'turno' ? r.turno : UI.ultimoTurno;
  const it = (href, icono, txt, act) => `<a href="${href}"${act ? ' aria-current="page"' : ''}>${ic(icono)}<span>${esc(txt)}</span></a>`;
  $('#abajo').innerHTML = it('#turnos', 'calendar-clock', T('nav_turnos'), r.vista === 'turnos')
    + it('#' + turno, 'siren', `${T('nav_turno_actual')} ${turno.slice(1)}`, r.vista === 'turno')
    + it('#historial', 'award', T('nav_historial'), r.vista === 'historial')
    + `<button type="button" data-ayuda>${ic('circle-help')}<span>${esc(T('nav_ayuda'))}</span></button>`
    // En el móvil no hay barra lateral: el nombre y el color de acento se cambian desde aquí.
    + `<button type="button" data-perfil>${ic('palette')}<span>${esc(T('nav_ajustes'))}</span></button>`;
  $('#abajo').setAttribute('aria-label', T('nav_secciones'));
}

/* ---------- Diálogos: foco inicial, Escape y foco devuelto ---------- */
let focoPrevio = null;
function abrirDialogo(d, foco) {
  focoPrevio = document.activeElement;
  d.showModal();
  requestAnimationFrame(() => (foco ? d.querySelector(foco) : d.querySelector('[autofocus], button, input'))?.focus());
}
function cerrarDialogo(d) { if (d.open) d.close(); }
document.addEventListener('close', (e) => { if (e.target.tagName === 'DIALOG' && focoPrevio && document.contains(focoPrevio)) focoPrevio.focus(); }, true);

/* ---------- Centro de ayuda ---------- */
const TABS = ['guia', 'decidir', 'metodo', 'datos', 'atajos', 'glosario', 'acerca'];
let tabAyuda = 'guia';
function abrirAyuda(tab) {
  if (tab) tabAyuda = tab;
  pintarAyuda();
  abrirDialogo($('#dlg-ayuda'), '[role=tab][aria-selected=true]');
}
function pintarAyuda() {
  const d = $('#dlg-ayuda');
  d.setAttribute('aria-labelledby', 'ayuda-t');
  d.innerHTML = `
    <div class="dlg-cab"><h2 id="ayuda-t">${esc(T('ayuda_titulo'))}</h2><button type="button" class="icono-b" data-cerrar-dlg aria-label="${esc(T('cerrar'))}">${ic('x')}</button></div>
    <div class="tabs" role="tablist" aria-label="${esc(T('ayuda_titulo'))}">${TABS.map((t) => `<button type="button" role="tab" id="tab-${t}" aria-controls="panel-ayuda" aria-selected="${t === tabAyuda}" tabindex="${t === tabAyuda ? 0 : -1}" data-tab="${t}">${esc(T('tab_' + t))}</button>`).join('')}</div>
    <div class="dlg-cuerpo" id="panel-ayuda" role="tabpanel" aria-labelledby="tab-${tabAyuda}" tabindex="0">${panelAyuda(tabAyuda)}</div>
    <div class="dlg-pie"><span>${esc(T('pie_ayuda'))}</span><button type="button" class="btn" data-cerrar-dlg>${esc(T('entendido'))}</button></div>`;
}
function panelAyuda(t) {
  if (t === 'guia') return `<ol class="pasos">${T('guia_pasos').map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ol><p class="nota">${esc(T('guia_por_que'))}</p>`;
  if (t === 'decidir') return decidirHtml();
  if (t === 'metodo') {
    const filas = [['veredicto', 'metodo_veredicto'], ['accion', 'metodo_accion'], ['campos', 'metodo_campos'], ['ticket', 'metodo_ticket']];
    return `<p>${esc(T('metodo_intro'))}</p><table class="tabla-pesos"><tbody>${filas.map(([k, txt]) => `<tr><td>${esc(T(txt, { m: BJ.TICKET_MIN }))}</td><td class="num" data-peso="${k}">${BJ.PESOS[k]}</td></tr>`).join('')}<tr class="total"><td>Total</td><td class="num">${Object.values(BJ.PESOS).reduce((a, b) => a + b, 0)}</td></tr></tbody></table>
      <p>${esc(T('metodo_apto', { n: BJ.UMBRAL_APTO }))}</p><p>${esc(T('metodo_veredictos'))}</p><p>${esc(T('metodo_mitre'))}</p>`;
  }
  if (t === 'datos') return `<h3>${esc(T('datos_empresa'))}</h3><p>${esc(L(EMPRESA.aviso))}</p>
      <h3>${esc(T('datos_inventario'))}</h3><dl class="inventario">${EMPRESA.inventario.map((i) => `<div><dt><code>${esc(i.host)}</code> <span class="num">${esc(i.ip)}</span></dt><dd>${esc(L(i.rol))}</dd></div>`).join('')}</dl>
      <h3>${esc(T('datos_personas'))}</h3><dl class="inventario">${EMPRESA.personas.map((i) => `<div><dt><code>${esc(i.usuario)}</code></dt><dd>${esc(L(i.rol))}</dd></div>`).join('')}</dl>
      <p>${esc(T('datos_registros'))}</p><p>${esc(T('datos_privacidad'))}</p>`;
  if (t === 'atajos') return `<dl class="atajos">${T('atajos').map(([k, v]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  if (t === 'glosario') return `<dl class="glosario">${T('glosario').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  const eco = [['rosetta', 'Rosetta Multinorma', 'rosetta_multinorma'], ['studio', 'ENS Compliance Studio', 'grc_ens_compliance_studio'], ['kairos', 'KAIROS', 'kairos'], ['ctem', 'CTEM-Nexus', 'ctem-nexus'], ['adaud', 'ENS AD Auditor', 'ens_ad-auditor'], ['argos', 'ARGOS', 'argos-grc'], ['astrolabio', 'Astrolabio', 'astrolabio']];
  return `<div class="autor"><span class="avatar grande" aria-hidden="true">YR</span><div><b>Yoandy Ramírez Delgado</b><span>${esc(T('acerca_autor_rol'))}</span>
      <p class="enlaces"><a href="https://github.com/heindall92" rel="noopener" target="_blank">${ic('github')}GitHub</a><a href="mailto:yoandyramirezdelgado@gmail.com">${ic('mail')}yoandyramirezdelgado@gmail.com</a></p></div></div>
    <h3>${esc(T('acerca_herramienta'))}</h3><p>${esc(T('acerca_version', { v: VERSION }))}</p><p class="nota">${esc(T('acerca_aviso'))}</p>
    <h3>${esc(T('acerca_ecosistema'))}</h3><ul class="eco">${eco.map(([k, n, r]) => `<li><div><b>${esc(n)}</b><span>${esc(T('eco.' + k))}</span></div><a class="btn sec peq" href="https://github.com/heindall92/${r}" rel="noopener" target="_blank">${ic('github')}${esc(T('codigo'))}</a></li>`).join('')}</ul>
    <h3>${esc(T('acerca_dudas'))}</h3><p class="enlaces"><a href="${REPO}/issues/new" rel="noopener" target="_blank">${ic('flag')}${esc(T('acerca_incidencia'))}</a><a href="mailto:yoandyramirezdelgado@gmail.com?subject=Blue-Jr">${ic('send')}${esc(T('acerca_escribir'))}</a></p>`;
}

/* ---------- Búsqueda (Ctrl K) ---------- */
let resultados = [], activo = 0;
function abrirBusqueda() {
  const d = $('#dlg-buscar');
  d.setAttribute('aria-label', T('buscar'));
  d.innerHTML = `<div class="buscar-cab">${ic('search')}<input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(T('buscar_ph'))}" aria-label="${esc(T('buscar_ph'))}" aria-controls="q-res" role="combobox" aria-expanded="true" aria-autocomplete="list"><kbd>Esc</kbd></div><div id="q-res" class="q-res" role="listbox" aria-label="${esc(T('buscar'))}"></div>`;
  buscar('');
  abrirDialogo(d, '#q');
}
function buscar(q) {
  const n = BJ.normalizar(q);
  const casa = (t) => !n || BJ.normalizar(t).includes(n);
  const sec = [['#turnos', T('nav_turnos'), 'calendar-clock'], ['#historial', T('nav_historial'), 'award'], ...TURNOS.map((t) => ['#' + t.id, `${T('turno_n', { n: numTurno(t) })} · ${diaDe(t)} · ${L(t.tema)}`, 'siren'])].filter(([, t]) => casa(t)).map(([href, t, i]) => ({ g: 'secciones', href, t, i }));
  const alertas = Object.values(CASOS).filter((c) => casa(`${c.id} ${L(c.titulo)} ${L(c.regla)}`)).slice(0, n ? 12 : 6).map((c) => ({ g: 'alertas', href: '#' + c.turno, caso: c.id, t: `${c.id} · ${L(c.titulo)}`, i: 'siren' }));
  const glos = n ? T('glosario').filter(([k, v]) => casa(k + ' ' + v)).slice(0, 6).map(([k]) => ({ g: 'glosario', tab: 'glosario', t: k, i: 'book-open' })) : [];
  resultados = [...sec, ...alertas, ...glos];
  activo = 0;
  const caja = $('#q-res');
  if (!resultados.length) { caja.innerHTML = `<p class="vacio">${esc(T('buscar_vacio'))}</p>`; return; }
  let html = '', g = '';
  resultados.forEach((r, i) => {
    if (r.g !== g) { g = r.g; html += `<div class="q-grupo" role="presentation">${esc(T('buscar_grupo_' + g))}</div>`; }
    html += `<div class="q-item" role="option" id="q-${i}" aria-selected="${i === activo}" data-q="${i}">${ic(r.i)}<span>${esc(r.t)}</span></div>`;
  });
  caja.innerHTML = html;
  $('#q')?.setAttribute('aria-activedescendant', 'q-0');
}
function moverBusqueda(d) {
  if (!resultados.length) return;
  activo = (activo + d + resultados.length) % resultados.length;
  $$('.q-item').forEach((el, i) => el.setAttribute('aria-selected', i === activo));
  $('#q').setAttribute('aria-activedescendant', 'q-' + activo);
  $('#q-' + activo)?.scrollIntoView({ block: 'nearest' });
}
function elegirBusqueda(i) {
  const r = resultados[i]; if (!r) return;
  cerrarDialogo($('#dlg-buscar'));
  if (r.tab) return abrirAyuda(r.tab);
  if (r.caso) { UI.caso = r.caso; UI.panel = 'caso'; }
  if (location.hash === r.href) pintar(); else location.hash = r.href;
}

/* ---------- Perfil ---------- */
function abrirPerfil() {
  const d = $('#dlg-perfil');
  d.setAttribute('aria-labelledby', 'perfil-t');
  d.innerHTML = `<form method="dialog" class="perfil-f" id="f-perfil"><div class="dlg-cab"><h2 id="perfil-t">${esc(T('perfil_titulo'))}</h2><button type="button" class="icono-b" data-cerrar-dlg aria-label="${esc(T('cerrar'))}">${ic('x')}</button></div>
    <div class="dlg-cuerpo"><label class="campo">${esc(T('perfil'))}<input name="nombre" maxlength="${BJ.LIMITES.nombre}" autocomplete="name" value="${esc(S.perfil.nombre)}"></label><p class="nota">${esc(T('perfil_ayuda'))}</p>
      <h3 id="acento-t" class="dlg-sub">${esc(T('acento'))}</h3>
      <div class="acentos dlg-acentos" role="group" aria-labelledby="acento-t">${ACENTOS.map((a) => `<button type="button" class="acento-b" data-accent-pick="${a}" aria-pressed="${P.accent === a}" title="${esc(T('acentos.' + a))}" aria-label="${esc(T('acentos.' + a))}"></button>`).join('')}</div>
      <p class="nota">${esc(T('acento_ayuda'))}</p></div>
    <div class="dlg-pie"><button type="button" class="btn sec" data-cerrar-dlg>${esc(T('cancelar'))}</button><button type="submit" class="btn">${esc(T('guardar'))}</button></div></form>`;
  abrirDialogo(d, 'input');
}
