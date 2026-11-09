/* Núcleo: datos, estado persistido, preferencias y utilidades compartidas por la interfaz. */
const DATOS = JSON.parse(document.getElementById('datos').textContent);
const EMPRESA = DATOS.empresa;
const TURNOS = ['t1', 't2', 't3', 't4', 't5'].map((k) => DATOS[k]);
const REV_INDICE = Object.fromEntries(DATOS.revision.casos.map((c) => [c.id, c]));
const CASOS = Object.fromEntries(TURNOS.flatMap((t) => t.casos.map((c) => [c.id, { ...c, turno: t.id }])));
const VERSION = '__APP_VERSION__';
const ACENTOS = ['rosa', 'solar', 'glaciar', 'orquidea', 'verde', 'azul', 'rojo'];
const REPO = 'https://github.com/heindall92/Blue-Jr';
const TEST = /[?&]test\b/.test(location.search);

/* ---------- Almacenamiento: siempre envuelto, la app funciona aunque falle ---------- */
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado o cuota llena */ } };
const CLAVE = 'bluejr-v1';
const CLAVE_PREFS = 'bluejr-prefs';

function cargarEstado() {
  const r = BJ.safeParse(leer(CLAVE));
  return r.ok ? BJ.sanearEstado(r.valor, CASOS, REV_INDICE) : BJ.sanearEstado(null, CASOS, REV_INDICE);
}
let S = cargarEstado();
const guardar = () => escribir(CLAVE, JSON.stringify(S));

const prefsIni = (() => { const r = BJ.safeParse(leer(CLAVE_PREFS)); return r.ok && r.valor && typeof r.valor === 'object' ? r.valor : {}; })();
const P = {
  lang: prefsIni.lang === 'en' || prefsIni.lang === 'es' ? prefsIni.lang : (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en',
  // Cada carga empieza en claro, sin mirar el sistema ni la sesión anterior; el interruptor cambia el tema durante la visita.
  theme: 'light',
  accent: ACENTOS.includes(prefsIni.accent) ? prefsIni.accent : 'azul',
  lateral: prefsIni.lateral !== false
};
const guardarPrefs = () => escribir(CLAVE_PREFS, JSON.stringify(P));

/* ---------- Estado de la interfaz (no se guarda) ---------- */
const UI = { turno: null, caso: null, filtro: '', fuente: null, panel: 'caso', ultimoTurno: leer('bluejr-ultimo') || 'T1', borrarArmado: false, vistaAnimada: null, guia: null, guiaTab: 'triaje', investigado: new Set(), rev: null, rapido: null, msgTipo: null, msgRevisado: null };

/* ---------- Textos ---------- */
const T = (k, vars) => {
  let v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), I18N[P.lang]);
  if (v == null) v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), I18N.es) ?? k;
  return typeof v === 'string' && vars ? v.replace(/\{(\w+)\}/g, (_, n) => (vars[n] ?? '')) : v;
};
const L = (o) => (o && typeof o === 'object' ? o[P.lang] ?? o.es : o ?? '');
const locale = () => (P.lang === 'es' ? 'es-ES' : 'en-GB');
const num = (n) => new Intl.NumberFormat(locale()).format(n);
const pct = (n) => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(n / 100);

/* Escapado central: todo texto que viene de datos o del usuario pasa por aquí antes de ir al HTML. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Tema y acento ---------- */
const raiz = document.documentElement;
const temaSistema = () => (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const temaActual = () => P.theme || temaSistema();
function aplicarTema() {
  raiz.dataset.theme = temaActual();
  raiz.dataset.accent = P.accent;
  raiz.lang = P.lang;
}

/* ---------- Avisos ---------- */
function avisar(texto, icono = 'circle-check') {
  const caja = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${ic(icono)}<span></span>`;
  t.querySelector('span').textContent = texto;
  caja.append(t);
  while (caja.children.length > 3) caja.firstElementChild.remove();
  setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 300); }, 4000);
}

/* ---------- Descargas (sin servidor: un enlace a un Blob) ---------- */
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.hidden = true;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  avisar(T('exportado', { f: nombre }));
}

/* ---------- Utilidades de dominio ---------- */
const turnoDe = (id) => TURNOS.find((t) => t.id === id);
const respuesta = (id) => S.respuestas[id] || (S.respuestas[id] = { veredicto: null, accion: null, campos: {}, ticket: '', evidencias: [], cuando: null });
const cerrado = (id) => S.respuestas[id]?.cerrado === true;
const notaDe = (id) => (cerrado(id) ? S.respuestas[id].nota : null);
const diaDe = (t) => L(t.dia);
const numTurno = (t) => t.id.slice(1);
