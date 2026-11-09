/* Blue-Jr · motor
 * Funciones puras y deterministas, sin DOM: generan los registros de cada caso, corrigen los tickets
 * y resumen el historial. La interfaz solo las consume; las pruebas unitarias las cargan con require(). */
const BJ = (() => {
  'use strict';

  /* ---------- Constantes (la ayuda y el README se generan o se comprueban contra ellas) ---------- */
  const PESOS = Object.freeze({ veredicto: 40, accion: 25, campos: 25, ticket: 10 });
  const UMBRAL_APTO = 70; // nota mínima de un turno para darlo por superado
  const TICKET_MIN = 60; // caracteres mínimos del resumen del ticket
  const VEREDICTOS = Object.freeze(['vp', 'fp', 'benigno']);
  const ACCIONES = Object.freeze(['cerrar', 'escalar', 'contener']);
  const SEVERIDADES = Object.freeze(['critica', 'alta', 'media', 'baja']);
  const COMPETENCIAS = Object.freeze(['triaje', 'logs', 'correo', 'endpoint', 'red', 'identidad', 'respuesta', 'comunicacion']);
  const LIMITES = Object.freeze({ ticket: 4000, campo: 200, relevo: 4000, evidencias: 20, nombre: 80 });

  /* ---------- Azar determinista: la misma semilla da siempre los mismos registros ---------- */
  function semilla(texto) {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function azar(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- Ruido: actividad normal de Norte Logística alrededor de cada alerta ---------- */
  const USUARIOS = ['a.garcia', 'l.moreno', 'p.sanz', 'm.ortega', 'j.romero', 'h.diaz', 'r.ibanez', 'c.prieto', 'e.navas'];
  const EQUIPOS = [['PC-ALM-014', '10.20.2.14'], ['PC-ALM-021', '10.20.2.21'], ['PC-FIN-003', '10.20.3.33'], ['PC-FIN-007', '10.20.3.41'], ['PC-MKT-002', '10.20.4.12'], ['PC-SOP-002', '10.20.6.8'], ['PC-ALM-009', '10.20.2.9']];
  const SITIOS = ['intranet.nortelogistica.example', 'erp.nortelogistica.example', 'outlook.office.example', 'teams.office.example', 'www.transportes-ibarra.example', 'maps.example', 'docs.proveedor.example', 'tracking.paqueteria.example'];
  const EXTERNAS = ['192.0.2.33', '192.0.2.71', '198.51.100.12', '198.51.100.45', '203.0.113.20', '203.0.113.64'];
  const PROCESOS = [['chrome.exe', 'explorer.exe'], ['OUTLOOK.EXE', 'explorer.exe'], ['Teams.exe', 'explorer.exe'], ['EXCEL.EXE', 'explorer.exe'], ['svchost.exe', 'services.exe'], ['OneDrive.exe', 'explorer.exe'], ['msedge.exe', 'explorer.exe']];
  const ASUNTOS = ['Albarán 4471', 'Ruta de mañana', 'Reunión semanal', 'Inventario noviembre', 'RE: Pedido 8812', 'Turnos de diciembre', 'Factura 2026-1162'];
  const APPS = ['Outlook', 'Teams', 'SharePoint', 'OneDrive'];
  const RUTAS = ['/', '/pedidos?id=1188', '/seguimiento/ES88231', '/contacto', '/static/app.js', '/api/estado', '/login'];
  const SERVIDORES = ['SRV-FS01', 'SRV-DC01', 'SRV-SQL01', 'SRV-BKP01'];
  const SERVICIOS = ['cifs/SRV-FS01', 'HTTP/intranet', 'MSSQLSvc/SRV-SQL01:1433', 'ldap/SRV-DC01', 'host/PC-FIN-003'];

  const PLANTILLAS = {
    fw: (r, e) => `ALLOW tcp ${e(EQUIPOS)[1]}:${49152 + Math.floor(r() * 16000)} -> ${e(EXTERNAS)}:${e([443, 443, 443, 80, 53])}`,
    win: (r, e) => { const q = e(EQUIPOS); return r() < 0.7 ? `EventID=4624 LogonType=3 TargetUserName=${e(USUARIOS)} WorkstationName=${q[0]} IpAddress=${q[1]}` : `EventID=4634 LogonType=3 TargetUserName=${e(USUARIOS)}`; },
    dc: (r, e) => r() < 0.6 ? `EventID=4769 ServiceName=${e(SERVICIOS)} TargetUserName=${e(USUARIOS)} IpAddress=${e(EQUIPOS)[1]} TicketEncryptionType=0x12` : `EventID=4768 TargetUserName=${e(USUARIOS)} IpAddress=${e(EQUIPOS)[1]} PreAuthType=2 TicketEncryptionType=0x12`,
    proxy: (r, e) => `user=${e(USUARIOS)} GET https://${e(SITIOS)}/ 200 bytes=${1000 + Math.floor(r() * 90000)}`,
    dns: (r, e) => `query A ${e(SITIOS)} from ${e(EQUIPOS)[1]} NOERROR`,
    mail: (r, e) => `delivered from=${e(['avisos', 'pedidos', 'rrhh', 'logistica'])}@${e(['transportes-ibarra.example', 'nortelogistica.example', 'paqueteria.example'])} to=${e(USUARIOS)}@nortelogistica.example subject='${e(ASUNTOS)}' spf=pass dkim=pass`,
    edr: (r, e) => { const p = e(PROCESOS); return `process=${p[0]} parent=${p[1]} user=${e(USUARIOS)} host=${e(EQUIPOS)[0]} verdict=clean`; },
    vpn: (r, e) => `login OK user=${e(USUARIOS)} src=${e(EXTERNAS)} assigned=10.20.200.${10 + Math.floor(r() * 200)}`,
    entra: (r, e) => `SignIn result=success user=${e(USUARIOS)}@nortelogistica.example app=${e(APPS)} ip=192.0.2.1 geo=Madrid,ES mfa=satisfied`,
    web: (r, e) => `${e(EXTERNAS)} - - "GET ${e(RUTAS)} HTTP/1.1" 200 ${300 + Math.floor(r() * 9000)} "-" "Mozilla/5.0"`,
    waf: (r, e) => `pass GET ${e(RUTAS)} from ${e(EXTERNAS)} rule=- status=200`
  };
  const ORIGEN = { fw: 'fw01', win: 'win', dc: 'dc', proxy: 'proxy01', dns: 'dns', mail: 'mail', edr: 'edr', vpn: 'vpn01', entra: 'entra', web: 'web-SRV-WEB01', waf: 'waf' };

  const aSeg = (h) => { const [a, b, c = 0] = String(h).split(':').map(Number); return a * 3600 + b * 60 + c; };
  const aHora = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

  /** Registros del caso: la señal del caso mezclada con ruido determinista y ordenada por hora. */
  function registros(caso) {
    const r = azar(semilla(caso.id));
    const senal = caso.logs.map(([t, s, m], i) => ({ t, s, m, senal: true, n: i }));
    // El ruido nunca reutiliza a las personas ni a los equipos del caso: no debe parecer evidencia.
    const texto = senal.map((l) => l.m + ' ' + l.s).join(' ').toLowerCase();
    const ajeno = (v) => !texto.includes(String(v).toLowerCase());
    const filtra = (lista) => { const f = lista.filter((x) => (Array.isArray(x) ? x.every(ajeno) : ajeno(x))); return f.length ? f : lista; };
    const usuarios = filtra(USUARIOS), equipos = filtra(EQUIPOS);
    const e = (lista) => { const l = lista === USUARIOS ? usuarios : lista === EQUIPOS ? equipos : lista; return l[Math.floor(r() * l.length)]; };
    const tiempos = senal.map((l) => aSeg(l.t));
    const ini = Math.min(...tiempos) - 300, fin = Math.max(...tiempos) + 120;
    const fuentes = (caso.ruido && caso.ruido.fuentes || []).filter((f) => PLANTILLAS[f]);
    const ruido = [];
    for (let i = 0; fuentes.length && i < (caso.ruido.n || 0); i++) {
      const f = e(fuentes);
      const m = PLANTILLAS[f](r, e);
      const s = f === 'win' ? 'win-' + e(SERVIDORES) : ORIGEN[f];
      ruido.push({ t: aHora(ini + Math.floor(r() * (fin - ini))), s, m, senal: false, n: 100 + i });
    }
    return [...senal, ...ruido].sort((a, b) => a.t.localeCompare(b.t) || a.n - b.n);
  }

  /* ---------- Corrección ---------- */
  const normalizar = (v) => String(v ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.;,]+$/, '').replace(/^["'«]+|["'»]+$/g, '');
  const padreMitre = (id) => String(id).split('.')[0];

  /** Campos que hay que rellenar: los del caso y, si tiene técnica, el ID de MITRE ATT&CK. */
  function camposDe(caso) {
    const c = caso.campos.slice();
    if (caso.mitre) {
      const ok = [caso.mitre, padreMitre(caso.mitre), ...(caso.mitreAlt || []), ...(caso.mitreAlt || []).map(padreMitre)];
      c.push({ id: 'mitre', label: { es: 'Técnica MITRE ATT&CK (ID)', en: 'MITRE ATT&CK technique (ID)' }, ok: [...new Set(ok)], derivado: true, mitre: true });
    }
    return c;
  }

  const campoBien = (campo, valor) => {
    const v = normalizar(valor);
    if (!v) return false;
    return campo.ok.some((o) => normalizar(o) === v || (campo.mitre && v.toUpperCase() === String(o).toUpperCase()));
  };

  /** Palabras clave del caso que aparecen en el resumen del ticket. */
  function clavesEn(caso, texto) {
    const t = normalizar(texto);
    return caso.claves.map((k) => ({ clave: k, ok: t.includes(normalizar(k)) }));
  }

  /**
   * Corrige un ticket. Devuelve la nota (0-100), el detalle por criterio y lo esperado.
   * Ticket: la mitad de los puntos por llegar a TICKET_MIN caracteres y la otra mitad por citar
   * al menos la mitad de las claves del caso (IP, cuenta, equipo, cambio…).
   */
  function corregir(caso, resp = {}) {
    const campos = camposDe(caso);
    const detalleCampos = campos.map((c) => ({ id: c.id, label: c.label, valor: String(resp.campos?.[c.id] ?? ''), ok: campoBien(c, resp.campos?.[c.id]), esperado: c.ok[0] }));
    const aciertoCampos = campos.length ? detalleCampos.filter((d) => d.ok).length / campos.length : 1;
    const texto = String(resp.ticket ?? '');
    const claves = clavesEn(caso, texto);
    const necesarias = Math.ceil(caso.claves.length / 2);
    const largo = texto.trim().length >= TICKET_MIN;
    const citas = claves.filter((k) => k.ok).length >= necesarias;
    const criterios = [
      { id: 'veredicto', peso: PESOS.veredicto, puntos: resp.veredicto === caso.veredicto ? PESOS.veredicto : 0, esperado: caso.veredicto, valor: resp.veredicto ?? null },
      { id: 'accion', peso: PESOS.accion, puntos: resp.accion === caso.accion ? PESOS.accion : 0, esperado: caso.accion, valor: resp.accion ?? null },
      { id: 'campos', peso: PESOS.campos, puntos: Math.round(PESOS.campos * aciertoCampos), detalle: detalleCampos },
      { id: 'ticket', peso: PESOS.ticket, puntos: (largo ? PESOS.ticket / 2 : 0) + (citas ? PESOS.ticket / 2 : 0), largo, citas, claves, necesarias }
    ];
    const nota = criterios.reduce((s, c) => s + c.puntos, 0);
    return { id: caso.id, nota, criterios, apto: nota >= UMBRAL_APTO };
  }

  /* ---------- Turnos e historial ---------- */
  function resumenTurno(turno, respuestas = {}) {
    const notas = turno.casos.map((c) => respuestas[c.id]?.nota).filter((n) => typeof n === 'number');
    const hechos = notas.length;
    const media = hechos ? Math.round(notas.reduce((s, n) => s + n, 0) / hechos) : 0;
    const veredictos = turno.casos.filter((c) => respuestas[c.id]?.nota !== undefined && respuestas[c.id]?.veredicto === c.veredicto).length;
    return { id: turno.id, total: turno.casos.length, hechos, media, completo: hechos === turno.casos.length, apto: hechos === turno.casos.length && media >= UMBRAL_APTO, veredictos };
  }

  function historial(turnos, respuestas = {}) {
    const casos = turnos.flatMap((t) => t.casos);
    const hechos = casos.filter((c) => typeof respuestas[c.id]?.nota === 'number');
    const comp = Object.fromEntries(COMPETENCIAS.map((k) => [k, { casos: 0, puntos: 0 }]));
    for (const c of hechos) for (const k of c.competencias) if (comp[k]) { comp[k].casos++; comp[k].puntos += respuestas[c.id].nota; }
    const competencias = COMPETENCIAS.map((k) => ({ id: k, casos: comp[k].casos, total: casos.filter((c) => c.competencias.includes(k)).length, media: comp[k].casos ? Math.round(comp[k].puntos / comp[k].casos) : null }));
    const bien = (k) => hechos.filter((c) => respuestas[c.id][k] === c[k]).length;
    const escaladosNecesarios = casos.filter((c) => c.accion !== 'cerrar');
    return {
      tickets: hechos.length,
      total: casos.length,
      media: hechos.length ? Math.round(hechos.reduce((s, c) => s + respuestas[c.id].nota, 0) / hechos.length) : 0,
      precisionVeredicto: hechos.length ? Math.round((bien('veredicto') / hechos.length) * 100) : 0,
      precisionAccion: hechos.length ? Math.round((bien('accion') / hechos.length) * 100) : 0,
      // Amenazas que no se dejaron pasar: casos que pedían escalar o contener y se cerraron.
      cerradosPorError: hechos.filter((c) => c.accion !== 'cerrar' && respuestas[c.id].accion === 'cerrar').length,
      escaladosNecesarios: escaladosNecesarios.length,
      turnos: turnos.map((t) => resumenTurno(t, respuestas)),
      competencias
    };
  }

  /* ---------- Entrada hostil: importación del historial ---------- */
  function safeParse(texto) {
    try {
      return { ok: true, valor: JSON.parse(String(texto), (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v)) };
    } catch { return { ok: false, valor: null }; }
  }
  const corta = (v, n) => String(v ?? '').slice(0, n);
  const HORA = /^\d{2}:\d{2}:\d{2}$/;

  /** Deja solo lo que Blue-Jr sabe leer, con tipos, longitudes y listas permitidas. Recalcula la nota. */
  function sanearEstado(bruto, indice, indiceRev = {}) {
    const out = { v: 1, perfil: { nombre: '' }, respuestas: {}, relevos: {}, revisiones: {}, repaso: {}, rapido: {}, mensajes: {}, n2: {}, defensas: {} };
    if (!bruto || typeof bruto !== 'object') return out;
    out.perfil.nombre = corta(bruto.perfil?.nombre, LIMITES.nombre);
    const resp = bruto.respuestas && typeof bruto.respuestas === 'object' ? bruto.respuestas : {};
    for (const [id, r] of Object.entries(resp)) {
      const caso = indice[id];
      if (!caso || !r || typeof r !== 'object') continue;
      const campos = {};
      for (const c of camposDe(caso)) if (r.campos && typeof r.campos[c.id] === 'string') campos[c.id] = corta(r.campos[c.id], LIMITES.campo);
      const limpio = {
        veredicto: VEREDICTOS.includes(r.veredicto) ? r.veredicto : null,
        accion: ACCIONES.includes(r.accion) ? r.accion : null,
        campos,
        ticket: corta(r.ticket, LIMITES.ticket),
        evidencias: Array.isArray(r.evidencias) ? r.evidencias.filter((x) => Number.isInteger(x) && x >= 0 && x < 1000).slice(0, LIMITES.evidencias) : [],
        cuando: typeof r.cuando === 'string' && !Number.isNaN(Date.parse(r.cuando)) ? r.cuando : null
      };
      if (r.cerrado === true && limpio.veredicto && limpio.accion) { limpio.cerrado = true; limpio.nota = corregir(caso, limpio).nota; }
      out.respuestas[id] = limpio;
    }
    const rel = bruto.relevos && typeof bruto.relevos === 'object' ? bruto.relevos : {};
    for (const [id, t] of Object.entries(rel)) if (/^T[1-9]$/.test(id) && typeof t === 'string') out.relevos[id] = corta(t, LIMITES.relevo);
    const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    const fecha = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
    for (const [id, r] of Object.entries(obj(bruto.revisiones))) {
      const item = indiceRev[id];
      if (!item || !r || typeof r !== 'object') continue;
      const limpio = {
        dictamen: DICTAMENES.includes(r.dictamen) ? r.dictamen : null,
        motivo: ERRORES_IA.includes(r.motivo) ? r.motivo : null,
        accion: ACCIONES.includes(r.accion) ? r.accion : null,
        cuando: typeof r.cuando === 'string' && !Number.isNaN(Date.parse(r.cuando)) ? r.cuando : null
      };
      // La nota se recalcula siempre: una copia no puede traer una revisión aprobada a mano.
      if (r.cerrado === true && limpio.dictamen) { limpio.cerrado = true; limpio.nota = corregirRevision(item, limpio).nota; }
      out.revisiones[id] = limpio;
    }
    for (const [id, e] of Object.entries(obj(bruto.repaso))) {
      if (!indice[id] || !e || !Number.isInteger(e.caja) || e.caja < 0 || e.caja >= CAJAS.length || !fecha(e.proximo)) continue;
      out.repaso[id] = { caja: e.caja, proximo: e.proximo };
    }
    for (const [d, x] of Object.entries(obj(bruto.rapido)).slice(0, 400)) {
      if (!fecha(d) || !x || typeof x !== 'object') continue;
      const total = x.total, aciertos = x.aciertos, ms = x.ms;
      if (!Number.isInteger(total) || total < 1 || total > RAPIDO_N || !Number.isInteger(aciertos) || aciertos < 0 || aciertos > total) continue;
      out.rapido[d] = { aciertos, total, ms: Number.isInteger(ms) && ms >= 0 && ms <= 3600000 ? ms : 0 };
    }
    for (const [id, m] of Object.entries(obj(bruto.mensajes))) {
      const caso = indice[id];
      if (!caso || !m || typeof m !== 'object') continue;
      const limpio = {};
      for (const tipo of TIPOS_MENSAJE) if (typeof m[tipo] === 'string') limpio[tipo] = corta(m[tipo], LIMITES.ticket);
      // Si el mensaje está completo se recalcula aquí; una copia no puede traer «completo» sin el texto.
      limpio.ok = TIPOS_MENSAJE.filter((tipo) => limpio[tipo] && corregirMensaje(tipo, limpio[tipo], caso).completo);
      limpio.cuando = typeof m.cuando === 'string' && !Number.isNaN(Date.parse(m.cuando)) ? m.cuando : null;
      out.mensajes[id] = limpio;
    }
    for (const [id, lista] of Object.entries(obj(bruto.n2))) {
      const caso = indice[id];
      if (!caso || !Array.isArray(lista)) continue;
      const ids = camposDe(caso).map((c) => c.id);
      const vistas = new Set();
      out.n2[id] = [];
      for (const x of lista) {
        if (!x || !PREGUNTAS_N2.includes(x.tipo) || vistas.has(x.tipo)) continue;
        vistas.add(x.tipo);
        // Se guarda la respuesta tal como era al preguntar: preguntar no puede servir para probar respuestas gratis.
        if (x.tipo === 'decision') out.n2[id].push({ tipo: 'decision', v: x.v === true || x.v === false ? x.v : null });
        else if (x.tipo === 'falta') out.n2[id].push({ tipo: 'falta', campos: Array.isArray(x.campos) ? x.campos.filter((c) => ids.includes(c)) : [] });
        else out.n2[id].push({ tipo: 'inicio' });
      }
    }
    for (const [id, d] of Object.entries(obj(bruto.defensas))) {
      const caso = indice[id];
      const r = out.respuestas[id];
      // Solo hay entrevista de tickets cerrados, y las preguntas dependen de lo que se decidió.
      if (!caso || !r?.cerrado || !d || typeof d !== 'object') continue;
      const limpio = {};
      for (const p of preguntasDefensa(caso, r)) if (typeof d[p.id] === 'string') limpio[p.id] = corta(d[p.id], LIMITES.ticket);
      limpio.ok = preguntasDefensa(caso, r).filter((p) => limpio[p.id] && corregirDefensa(p, limpio[p.id], caso).completo).map((p) => p.id);
      limpio.cuando = typeof d.cuando === 'string' && !Number.isNaN(Date.parse(d.cuando)) ? d.cuando : null;
      out.defensas[id] = limpio;
    }
    return out;
  }

  /** Celda CSV a prueba de fórmulas (=, +, -, @, tabulador o retorno al inicio). */
  const celdaCsv = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

  /* ---------- Práctica: XP, racha, niveles e insignias ----------
   * Todo se deriva de los tickets cerrados (nota y fecha): no hay contador que guardar, inflar ni sanear. */
  const META_DIARIA = 150; // XP del día para cumplir la meta (unos dos tickets)
  const NIVELES = Object.freeze([
    { id: 'becario', xp: 0 }, { id: 'practicas', xp: 400 }, { id: 'n1', xp: 1200 }, { id: 'senior', xp: 2400 }, { id: 'n2', xp: 3400 }
  ]);
  const DIA_MS = 86400000;
  const diaIso = (d) => new Date(d).toISOString().slice(0, 10);
  const diaAntes = (iso, n = 1) => diaIso(Date.parse(iso + 'T00:00:00Z') - n * DIA_MS);

  function progreso(respuestas = {}, hoy = diaIso(Date.now())) {
    const cerradas = Object.values(respuestas).filter((r) => r && typeof r.nota === 'number');
    const xp = cerradas.reduce((a, r) => a + r.nota, 0);
    const porDia = {};
    for (const r of cerradas) if (r.cuando) { const d = r.cuando.slice(0, 10); porDia[d] = (porDia[d] || 0) + r.nota; }
    // La racha cuenta días seguidos con al menos un ticket; si hoy aún no hay, se mira desde ayer.
    let d = porDia[hoy] ? hoy : diaAntes(hoy), racha = 0;
    while (porDia[d] !== undefined) { racha++; d = diaAntes(d); }
    let i = 0;
    while (i + 1 < NIVELES.length && xp >= NIVELES[i + 1].xp) i++;
    const nivel = NIVELES[i], sig = NIVELES[i + 1] || null;
    return {
      xp, xpHoy: porDia[hoy] || 0, meta: META_DIARIA, racha, dias: Object.keys(porDia).length,
      nivel: nivel.id, nivelN: i + 1, siguiente: sig && sig.id, faltan: sig ? sig.xp - xp : 0,
      pctNivel: sig ? Math.round(((xp - nivel.xp) / (sig.xp - nivel.xp)) * 100) : 100
    };
  }

  function insignias(turnos, respuestas = {}, hoy, extra = {}) {
    const casos = turnos.flatMap((t) => t.casos);
    const hechos = casos.filter((c) => typeof respuestas[c.id]?.nota === 'number');
    const r = (c) => respuestas[c.id];
    const racha = Number.isInteger(extra.racha) ? extra.racha : progreso(respuestas, hoy).racha;
    const lista = [
      ['primer', hechos.length >= 1],
      ['perfecto', hechos.some((c) => r(c).nota === 100)],
      ['sin_alarma', hechos.filter((c) => c.veredicto !== 'vp' && r(c).veredicto === c.veredicto).length >= 3],
      ['contencion', hechos.filter((c) => c.accion === 'contener' && r(c).accion === 'contener').length >= 5],
      ['turno', turnos.some((t) => resumenTurno(t, respuestas).apto)],
      ['racha3', racha >= 3],
      ['revisor', (extra.cazados || 0) >= 3],
      ['rapido', extra.rapidoPerfecto === true],
      ['comunicador', (extra.mensajes || 0) >= 5],
      ['entrevista', (extra.defensas || 0) >= 3],
      ['semana', hechos.length === casos.length && casos.length > 0]
    ];
    return lista.map(([id, ok]) => ({ id, ok }));
  }

  /* ---------- Revisión del agente de IA (nivel 1,5) ----------
   * Un agente ya ha resuelto la alerta; el analista aprueba o rechaza su trabajo y, si lo rechaza,
   * dice qué falló y qué acción tocaba. */
  const ERRORES_IA = Object.freeze(['contexto', 'omision', 'alucinacion', 'persona', 'fuente']);
  const DICTAMENES = Object.freeze(['aprobar', 'rechazar']);
  const PESOS_REV = Object.freeze({ dictamen: 60, motivo: 25, accion: 15 });
  function corregirRevision(item, r = {}) {
    const bien = item.error === null;
    const dictamen = r.dictamen === (bien ? 'aprobar' : 'rechazar');
    // Si el agente acertó y se aprueba, no hay motivo ni acción que corregir: se dan por buenos.
    const motivo = bien ? dictamen : dictamen && r.motivo === item.error;
    const accion = bien ? dictamen : dictamen && r.accion === item.accion;
    const criterios = [
      { id: 'dictamen', peso: PESOS_REV.dictamen, puntos: dictamen ? PESOS_REV.dictamen : 0, esperado: bien ? 'aprobar' : 'rechazar', valor: r.dictamen ?? null },
      { id: 'motivo', peso: PESOS_REV.motivo, puntos: motivo ? PESOS_REV.motivo : 0, esperado: item.error, valor: r.motivo ?? null },
      { id: 'accion', peso: PESOS_REV.accion, puntos: accion ? PESOS_REV.accion : 0, esperado: item.accion, valor: r.accion ?? null }
    ];
    return { nota: criterios.reduce((a, c) => a + c.puntos, 0), criterios, cazado: !bien && dictamen };
  }

  /* ---------- Triaje rápido con repaso espaciado ----------
   * Lo que se falla vuelve mañana; lo que se acierta, cada vez más tarde (1, 2, 4, 7 y 14 días). */
  const CAJAS = Object.freeze([1, 2, 4, 7, 14]);
  const RAPIDO_N = 10;
  const XP_RAPIDO = 5; // XP por acierto en la primera ronda del día
  function repasar(entrada, acierto, hoy) {
    // Una alerta nueva acertada empieza en la segunda caja: solo lo fallado vuelve mañana.
    const caja = acierto ? Math.min((entrada && Number.isInteger(entrada.caja) ? entrada.caja : 0) + 1, CAJAS.length - 1) : 0;
    return { caja, proximo: diaAntes(hoy, -CAJAS[caja]) };
  }
  function sesionRapida(casos, respuestas = {}, repaso = {}, hoy, n = RAPIDO_N) {
    const cerrados = casos.filter((c) => typeof respuestas[c.id]?.nota === 'number');
    const r = azar(semilla('rapido-' + hoy));
    const mezcla = cerrados.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
    const toca = (c) => repaso[c.id] && repaso[c.id].proximo <= hoy;
    const fallado = (c) => !repaso[c.id] && respuestas[c.id].accion !== c.accion;
    const nuevo = (c) => !repaso[c.id];
    const orden = [
      ...mezcla.filter(toca).sort((a, b) => repaso[a.id].proximo.localeCompare(repaso[b.id].proximo)),
      ...mezcla.filter((c) => fallado(c)),
      ...mezcla.filter((c) => nuevo(c) && !fallado(c)),
      ...mezcla.filter((c) => repaso[c.id] && !toca(c))
    ];
    return [...new Set(orden)].slice(0, n);
  }

  /* ---------- Comunicar: mensajes corregidos en local ----------
   * Dos mensajes por ticket cerrado: el escalado a N2 (técnico) y el aviso a dirección (llano).
   * Se corrigen con criterios comprobables, en español o en inglés; no valoran el estilo, sino que
   * estén las piezas que un N2 o una directora necesitan para actuar. */
  const TIPOS_MENSAJE = Object.freeze(['n2', 'dir']);
  const XP_MENSAJE = 10; // por cada mensaje que cumple todos los criterios
  const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const RE = {
    hora: /\b([01]?\d|2[0-3]):[0-5]\d\b/,
    accion: /\b(deshabilit|aisl|bloque|revoc|cort|elimin|purg|restablec|cambi|escal|investig|revis|contien|conten|disabl|isolat|block|revok|kill|remov|purg|reset|chang|escalat|investigat|review|contain)\w*/,
    urgencia: /\b(critica|critico|alta|alto|media|medio|baja|bajo|urgente|prioridad|critical|high|medium|low|urgent|priority|p[1-4])\b/,
    jerga: /\b(eventid|logontype|targetusername|subjectusername|sha256|hash|ioc|ttp|mitre|t\d{4}(?:\.\d{3})?|lsass|ntlm|kerberos|payload|powershell|cmd\.exe|udp|tcp|smb|rdp|dns|edr|siem|waf)\b|\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    impacto: /\b(client|dato|servicio|factur|pedido|nomina|operaci|reputaci|multa|ley|rgpd|dinero|pago|transferencia|venta|negocio|empleado|customer|data|service|invoice|order|payroll|operation|reputation|fine|law|gdpr|money|payment|transfer|sale|business|employee)\w*/,
    situacion: /\b(contenid|controlad|bloquead|aislad|investig|equipo de seguridad|soc|contained|under control|blocked|isolated|investigat|security team)\w*/,
    peticion: /\b(necesit|pedimos|decid|autoriz|aprob|llam|confirm|recomend|os pido|le pido|need|ask|decide|authori|approv|call|confirm|recommend|please)\w*/
  };
  const palabras = (t) => (String(t ?? '').trim().match(/\S+/g) || []).length;
  function corregirMensaje(tipo, texto, caso) {
    const t = plano(texto);
    const citadas = caso.claves.filter((k) => t.includes(plano(k)));
    // Lo que pasó: dos palabras con contenido del título o de la regla, o el ID de la técnica.
    const VACIAS = new Set(['contra', 'desde', 'hacia', 'entre', 'sobre', 'durante', 'otros', 'otras', 'unos', 'from', 'after', 'about', 'their', 'there', 'other', 'within']);
    const terminos = [...new Set(plano(`${caso.titulo?.es} ${caso.titulo?.en} ${caso.regla?.es} ${caso.regla?.en}`).match(/[a-z0-9]{5,}/g) || [])].filter((w) => !VACIAS.has(w));
    const nTerm = terminos.filter((w) => t.includes(w)).length;
    const que = nTerm >= 2 || (caso.mitre && t.includes(plano(caso.mitre).split('.')[0]));
    const n = palabras(texto);
    const criterios = tipo === 'n2' ? [
      ['que', que],
      ['cuando', RE.hora.test(t)],
      ['quien', citadas.length >= 1],
      ['evidencia', citadas.length >= Math.min(2, caso.claves.length)],
      ['accion', RE.accion.test(t)],
      ['urgencia', RE.urgencia.test(t)]
    ] : [
      ['llano', n > 0 && !RE.jerga.test(t)],
      ['impacto', RE.impacto.test(t)],
      ['situacion', RE.situacion.test(t)],
      ['peticion', RE.peticion.test(t)],
      ['breve', n >= 25 && n <= 120]
    ];
    const lista = criterios.map(([id, ok]) => ({ id, ok: !!ok }));
    return { criterios: lista, completo: lista.every((c) => c.ok), palabras: n, citadas };
  }

  /** Mensaje de ejemplo para un caso escalado: se construye con los datos del caso y cumple su propia corrección. */
  function modeloMensaje(tipo, caso, lang = 'es') {
    const es = lang === 'es';
    const sev = { critica: es ? 'crítica' : 'critical', alta: es ? 'alta' : 'high', media: es ? 'media' : 'medium', baja: es ? 'baja' : 'low' }[caso.sev];
    const L = (o) => (o ? o[lang] ?? o.es : '');
    if (tipo === 'n2') {
      const ev = caso.logs.filter(([, , m]) => caso.claves.some((k) => m.includes(k))).slice(0, 2).map(([t, h, m]) => `${t} ${h} ${m}`);
      const accion = caso.accion === 'contener'
        ? (es ? 'He aplicado la contención del playbook y lo escalo para que revises el alcance.' : 'I have applied the playbook containment and I am escalating it so you can scope it.')
        : (es ? 'No contengo: lo escalo para que decidáis con quien corresponda.' : 'I am not containing it: I am escalating it so you can decide with whoever is responsible.');
      return es
        ? `Prioridad ${sev}. ${L(caso.titulo)} (${L(caso.regla)}), a las ${caso.hora}. Datos clave: ${caso.claves.join(', ')}. Evidencia: ${ev.join(' | ')}. ${accion}`
        : `Priority ${sev}. ${L(caso.titulo)} (${L(caso.regla)}), at ${caso.hora}. Key facts: ${caso.claves.join(', ')}. Evidence: ${ev.join(' | ')}. ${accion}`;
    }
    if (caso.accion === 'contener') return es
      ? `Esta mañana, a las ${caso.hora}, hemos detectado un acceso o un programa no autorizado en un equipo de la empresa. El equipo de seguridad ya lo ha bloqueado y está investigando si ha afectado a datos de clientes o al servicio. Os pediremos que confirméis cualquier corte que afecte a la operación.`
      : `This morning, at ${caso.hora}, we detected unauthorised access or software on a company computer. The security team has already blocked it and is investigating whether customer data or the service were affected. We will ask you to confirm any shutdown that affects operations.`;
    return es
      ? `Esta mañana, a las ${caso.hora}, hemos visto una situación que puede afectar a datos de la empresa o de clientes y que necesita la decisión de un responsable. El equipo de seguridad lo está investigando con discreción. Necesitamos que autoricéis la revisión con Recursos Humanos y Asesoría Jurídica.`
      : `This morning, at ${caso.hora}, we saw a situation that may affect company or customer data and needs a manager's decision. The security team is investigating it discreetly. We need you to authorise the review with HR and Legal.`;
  }

  /* ---------- Defiende tu ticket: la entrevista sobre tus propios casos (0.6.0) ----------
   * Tres preguntas por ticket cerrado, como las de una entrevista técnica de SOC. Si la decisión fue
   * correcta, hay que defenderla frente a la alternativa; si fue un error, reconocerlo y decir qué harías ahora. */
  const PREGUNTAS_DEF = Object.freeze(['veredicto', 'accion', 'evidencia']);
  const XP_DEFENSA = 15; // por ticket con las tres respuestas completas
  const ALTERNATIVA = Object.freeze({ veredicto: { vp: 'fp', fp: 'vp', benigno: 'vp' }, accion: { contener: 'escalar', escalar: 'contener', cerrar: 'escalar' } });
  const NOMBRA = {
    vp: /\b(verdadero positivo|true positive|vp|tp|ataque|attack|malicios\w*)\b/,
    fp: /\b(falso positivo|false positive|fp)\b/,
    benigno: /\b(benign\w*)\b/,
    contener: /\b(conten\w*|contien\w*|contuv\w*|contain\w*)\b/,
    escalar: /\b(escal\w*|n2|tier 2|nivel 2)\b/,
    cerrar: /\b(cerr\w*|cierr\w*|clos\w*)\b/
  };
  const RE_DEF = {
    porque: /\b(porque|ya que|puesto que|dado que|debido a|por eso|por lo que|asi que|because|since|due to|therefore|that is why|so i)\b/,
    riesgo: /\b(riesgo|impacto|dano|propag\w*|negocio|urgen\w*|servicio|usuario\w*|datos|tiempo|minutos?|risk\w*|impact\w*|damage|spread\w*|business|urgent\w*|service|users?|data|time|minutes?)\b/,
    reconoce: /\b(me equivoque|equivoc\w*|error|falle|se me paso|no vi|no mire|confundi|mistake|wrong|missed|overlooked|misread)\b/,
    ahora: /\b(ahora|la proxima|en adelante|a partir de ahora|next time|now i|from now|going forward|in future)\b/
  };
  const DEF_PALABRAS = Object.freeze({ min: 15, max: 150 });
  const horaCorta = (h) => String(h).slice(0, 5);
  /** Primera línea del caso que contiene un dato clave: es la evidencia que se cita en los modelos. */
  const lineaClave = (caso) => caso.logs.find(([, , m]) => caso.claves.some((k) => m.includes(k))) || [caso.hora, caso.fuente, ''];

  /** Las tres preguntas de la entrevista para un ticket cerrado, según lo que se decidió. */
  function preguntasDefensa(caso, resp = {}) {
    return PREGUNTAS_DEF.map((id) => {
      if (id === 'evidencia') return { id, modo: 'defiende' };
      const tu = resp[id] ?? null, sol = caso[id];
      return tu === sol ? { id, modo: 'defiende', tu, alt: ALTERNATIVA[id][tu] } : { id, modo: 'error', tu, sol };
    });
  }

  /** Corrige una respuesta de la entrevista con criterios comprobables en local, como los mensajes. */
  function corregirDefensa(pregunta, texto, caso) {
    const t = plano(texto);
    const n = palabras(texto);
    const citadas = caso.claves.filter((k) => t.includes(plano(k)));
    const breve = n >= DEF_PALABRAS.min && n <= DEF_PALABRAS.max;
    let criterios;
    if (pregunta.modo === 'error') criterios = [['reconoce', RE_DEF.reconoce.test(t)], ['dato', citadas.length >= 1], ['ahora', RE_DEF.ahora.test(t)], ['breve', breve]];
    else if (pregunta.id === 'evidencia') criterios = [['dato', citadas.length >= 1], ['cuando', RE.hora.test(t)], ['porque', RE_DEF.porque.test(t)], ['breve', breve]];
    else criterios = [
      ['porque', RE_DEF.porque.test(t)],
      [pregunta.id === 'veredicto' ? 'dato' : 'riesgo', pregunta.id === 'veredicto' ? citadas.length >= 1 : RE_DEF.riesgo.test(t)],
      ['alternativa', NOMBRA[pregunta.alt].test(t)],
      ['breve', breve]
    ];
    const lista = criterios.map(([id, ok]) => ({ id, ok: !!ok }));
    return { criterios: lista, completo: lista.every((c) => c.ok), palabras: n, citadas };
  }

  const NOMBRES = {
    es: { vp: 'verdadero positivo', fp: 'falso positivo', benigno: 'benigno', contener: 'contener', escalar: 'escalar', cerrar: 'cerrar' },
    en: { vp: 'true positive', fp: 'false positive', benigno: 'benign', contener: 'contain', escalar: 'escalate', cerrar: 'close' }
  };
  /** Respuesta de ejemplo construida con los datos del caso; cumple su propia corrección en los dos idiomas. */
  function modeloDefensa(pregunta, caso, lang = 'es') {
    const es = lang === 'es';
    const N = NOMBRES[es ? 'es' : 'en'];
    const [h, origen] = lineaClave(caso);
    const hora = horaCorta(h);
    const datos = caso.claves.slice(0, 2).join(es ? ' y ' : ' and ');
    if (pregunta.modo === 'error') return es
      ? `Me equivoqué: elegí ${N[pregunta.tu] ?? 'nada'} y lo correcto era ${N[pregunta.sol]}. Se me pasó ${datos} a las ${hora}, que cambia la lectura del caso. Ahora, antes de decidir, compruebo ese dato y lo cito en el ticket.`
      : `I got it wrong: I chose ${N[pregunta.tu] ?? 'nothing'} and the right answer was ${N[pregunta.sol]}. I missed ${datos} at ${hora}, which changes how the case reads. Now I check that fact before deciding and quote it in the ticket.`;
    if (pregunta.id === 'evidencia') return es
      ? `Le daría la línea de ${origen} de las ${hora}. Es suficiente porque ahí aparece ${datos}, que es lo que decide el caso, y el N2 puede comprobarla en un minuto.`
      : `I would give them the ${origen} line at ${hora}. It is enough because it shows ${datos}, which is what decides the case, and tier 2 can check it in a minute.`;
    if (pregunta.id === 'veredicto') {
      const porque = {
        vp: es ? `Descarté falso positivo porque la regla no saltó por ruido: hay actividad concreta que encaja con un ataque.` : `I ruled out a false positive because the rule did not fire on noise: there is concrete activity that fits an attack.`,
        fp: es ? `Descarté verdadero positivo porque no hay nada malicioso detrás: la regla salta por cómo está ajustada.` : `I ruled out a true positive because there is nothing malicious behind it: the rule fires because of how it is tuned.`,
        benigno: es ? `Descarté verdadero positivo porque la actividad es real pero esperada y está autorizada.` : `I ruled out a true positive because the activity is real but expected and authorised.`
      }[pregunta.tu];
      return es
        ? `Lo clasifiqué como ${N[pregunta.tu]} porque el registro de ${origen} de las ${hora} lo muestra con ${datos}. ${porque}`
        : `I classified it as a ${N[pregunta.tu]} because the ${origen} log at ${hora} shows it with ${datos}. ${porque}`;
    }
    return {
      contener: es ? `Contuve porque el riesgo era inmediato: con ${datos} el daño podía propagarse en minutos. Escalar sin contener habría dejado la puerta abierta mientras el N2 lo revisaba, así que contuve primero y escalé después.`
        : `I contained it because the risk was immediate: with ${datos} the damage could spread within minutes. Escalating without containing would have left the door open while tier 2 reviewed it, so I contained first and escalated afterwards.`,
      escalar: es ? `Escalé y no contuve porque contener tiene impacto en el negocio y con ${datos} la decisión no me correspondía a mí. El riesgo no era inmediato, así que se lo pasé al N2 con la evidencia.`
        : `I escalated and did not contain it because containment has a business impact and, with ${datos}, the decision was not mine to make. The risk was not immediate, so I passed it to tier 2 with the evidence.`,
      cerrar: es ? `Lo cerré sin escalar porque no había riesgo: ${datos} explica la alerta y no hay nada más detrás. Escalarlo habría hecho perder tiempo al N2 con ruido.`
        : `I closed it without escalating because there was no risk: ${datos} explains the alert and there is nothing else behind it. Escalating it would have wasted tier 2's time with noise.`
    }[pregunta.tu];
  }

  /* ---------- Del ticket a la entrevista: historia STAR para Astrolabio ----------
   * Formato compartido del ecosistema («yrd-ecosistema», tipo «historias»): Astrolabio la suma a las tuyas. */
  const COMP_ASTROLABIO = Object.freeze({ triaje: 'analisis', logs: 'analisis', correo: 'analisis', identidad: 'analisis', endpoint: 'problemas', red: 'problemas', respuesta: 'presion', comunicacion: 'comunicacion' });
  const STAR_LIMITES = Object.freeze({ titulo: 120, bloque: 4000, competencias: 6 });
  const idHistoria = (caso) => 'bluejr-' + caso.id.toLowerCase();

  /** Convierte un ticket cerrado en una historia STAR con lo que hizo el analista y lo que salió. */
  function historiaStar(caso, resp, extra = {}) {
    const lang = extra.lang === 'en' ? 'en' : 'es';
    const es = lang === 'es';
    const L = (o) => (o ? o[lang] ?? o.es : '');
    const N = NOMBRES[lang];
    const punto = (x) => (/[.!?…]$/.test(String(x).trim()) ? '' : '.');
    const corte = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
    const t = extra.turno || {};
    const lineas = registros(caso);
    const ev = (resp.evidencias || []).map((n) => lineas.find((l) => l.n === n)).filter(Boolean);
    const sev = { critica: es ? 'crítica' : 'critical', alta: es ? 'alta' : 'high', media: es ? 'media' : 'medium', baja: es ? 'baja' : 'low' }[caso.sev];
    const def = extra.defensa || {};
    const defOk = new Set(def.ok || []);
    const bienV = resp.veredicto === caso.veredicto, bienA = resp.accion === caso.accion;
    const verbo = { es: { contener: 'contener y escalar', escalar: 'escalar al N2', cerrar: 'cerrarlo' }, en: { contener: 'contain and escalate it', escalar: 'escalate it to tier 2', cerrar: 'close it' } }[lang][resp.accion];
    const s = es
      ? `En Blue-Jr, un simulador de SOC, hice el turno ${t.n ?? ''} (${L(t.dia).toLowerCase()}) como analista N1 de Norte Logística, una empresa ficticia. A las ${caso.hora} saltó una alerta de ${caso.fuente}: «${L(caso.titulo)}». ${L(caso.resumen)}`
      : `In Blue-Jr, a SOC simulator, I worked shift ${t.n ?? ''} (${L(t.dia)}) as a tier 1 analyst at Norte Logística, a made-up company. At ${caso.hora} a ${caso.fuente} alert fired: «${L(caso.titulo)}». ${L(caso.resumen)}`;
    const tarea = es
      ? `Tenía que decidir si era real, qué hacer y dejarlo documentado en el ticket para el siguiente nivel. Severidad ${sev}; regla «${L(caso.regla)}».`
      : `I had to decide whether it was real, what to do and document it in the ticket for the next tier. Severity ${sev}; rule «${L(caso.regla)}».`;
    const a = [
      ev.length ? (es ? `Revisé los registros y fijé ${ev.length === 1 ? 'una línea' : ev.length + ' líneas'} como evidencia: ${ev.slice(0, 3).map((l) => `${l.t} ${l.s} ${l.m}`).join(' | ')}.` : `I went through the logs and pinned ${ev.length === 1 ? 'one line' : ev.length + ' lines'} as evidence: ${ev.slice(0, 3).map((l) => `${l.t} ${l.s} ${l.m}`).join(' | ')}.`)
        : (es ? 'Revisé los registros del caso.' : 'I went through the case logs.'),
      es ? `Lo clasifiqué como ${N[resp.veredicto]} y decidí ${verbo}.` : `I classified it as a ${N[resp.veredicto]} and decided to ${verbo}.`,
      String(resp.ticket || '').trim() ? (es ? `Mi resumen del ticket: «${String(resp.ticket).trim()}»${punto(resp.ticket)}` : `My ticket summary: «${String(resp.ticket).trim()}»${punto(resp.ticket)}`) : '',
      bienA && defOk.has('accion') && def.accion ? (es ? `Por qué lo decidí así: ${def.accion.trim()}` : `Why I decided that: ${def.accion.trim()}`) : '',
      (extra.mensajes || []).length ? (es ? `Además escribí ${extra.mensajes.map((m) => (m === 'n2' ? 'el escalado al N2' : 'el aviso a dirección')).join(' y ')}.` : `I also wrote ${extra.mensajes.map((m) => (m === 'n2' ? 'the escalation to tier 2' : 'the update for management')).join(' and ')}.`) : ''
    ].filter(Boolean).join(' ');
    const fallos = [!bienV && (es ? `el veredicto (era ${N[caso.veredicto]})` : `the verdict wrong (it was a ${N[caso.veredicto]})`), !bienA && (es ? `la acción (había que ${N[caso.accion]})` : `the action wrong (it needed to ${N[caso.accion]})`)].filter(Boolean);
    const r = (es ? `La corrección automática le dio ${resp.nota}/100. ` : `The automatic grading gave it ${resp.nota}/100. `)
      + (fallos.length ? (es ? `Fallé ${fallos.join(' y ')}. ` : `I got ${fallos.join(' and ')}. `) : (es ? 'Acerté el veredicto y la acción. ' : 'I got the verdict and the action right. '))
      + L(caso.explica);
    const error = !bienV ? 'veredicto' : !bienA ? 'accion' : null;
    const leccion = error && defOk.has(error) && def[error] ? def[error].trim()
      : (es ? 'Qué me llevo: ' : 'What I take away: ') + (L(caso.explica).match(/^[^.]+\./)?.[0] || L(caso.explica));
    const comps = [...new Set([...caso.competencias.map((k) => COMP_ASTROLABIO[k]).filter(Boolean), ...((extra.mensajes || []).length ? ['comunicacion'] : [])])].slice(0, STAR_LIMITES.competencias);
    const dia = typeof resp.cuando === 'string' && /^\d{4}-\d{2}-\d{2}/.test(resp.cuando) ? resp.cuando.slice(0, 10) : diaIso(Date.now());
    return {
      id: idHistoria(caso),
      titulo: corte(`${L(caso.titulo)} (${caso.id}, Blue-Jr)`, STAR_LIMITES.titulo),
      tipo: 'real',
      s: corte(s, STAR_LIMITES.bloque), t: corte(tarea, STAR_LIMITES.bloque), a: corte(a, STAR_LIMITES.bloque), r: corte(r, STAR_LIMITES.bloque), l: corte(leccion, STAR_LIMITES.bloque),
      competencias: comps,
      creada: dia, editada: dia
    };
  }
  /** Sobre del ecosistema que entiende Astrolabio (y cualquier herramienta de la familia). */
  function sobreHistorias(historias, appVersion, exportado = new Date().toISOString()) {
    return { formato: 'yrd-ecosistema', version: 1, tipo: 'historias', app: 'blue-jr', appVersion: String(appVersion), exportado, datos: { historias } };
  }

  /* ---------- Pregunta al N2: pistas del propio caso, con coste ----------
   * Tres preguntas por turno. Cada una resta XP al ticket (nunca nota): enseña cuándo merece la pena pedir ayuda. */
  const PREGUNTAS_N2 = Object.freeze(['inicio', 'falta', 'decision']);
  const LIMITE_N2 = 3;
  const COSTE_N2 = 10;
  function pistaN2(tipo, caso, resp = {}) {
    if (tipo === 'inicio') {
      // La primera línea de la señal que contiene un dato clave: dónde mirar, sin decir qué significa.
      const l = caso.logs.find(([, , m]) => caso.claves.some((k) => m.includes(k))) || caso.logs[0];
      return { tipo, hora: l[0], fuente: l[1] };
    }
    if (tipo === 'falta') {
      const r = resp.campos || {};
      return { tipo, campos: camposDe(caso).filter((c) => !campoBien(c, r[c.id])).map((c) => c.id) };
    }
    return { tipo, v: resp.veredicto ? resp.veredicto === caso.veredicto : null };
  }

  /* ---------- Entidades de los registros (como los «campos interesantes» de un SIEM) ----------
   * Cuentas, IP y equipos con su número de apariciones, para pivotar sobre ellos. */
  const RE_CUENTA = /\b(?:user|TargetUserName|SubjectUserName|from|to|initiatedBy)=([^\s,;]+)/g;
  const RE_IP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const RE_EQUIPO = /\b(?:host|WorkstationName|device)=([^\s,;]+)/g;
  function entidades(lineas, max = 5) {
    const cuenta = { cuentas: new Map(), ips: new Map(), equipos: new Map() };
    const suma = (m, v) => { if (v && v !== '-') m.set(v, (m.get(v) || 0) + 1); };
    for (const l of lineas) {
      for (const [, v] of l.m.matchAll(RE_CUENTA)) suma(cuenta.cuentas, v);
      for (const [v] of l.m.matchAll(RE_IP)) suma(cuenta.ips, v);
      for (const [, v] of l.m.matchAll(RE_EQUIPO)) suma(cuenta.equipos, v);
      suma(cuenta.equipos, l.s);
    }
    const top = (m) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max);
    return { cuentas: top(cuenta.cuentas), ips: top(cuenta.ips), equipos: top(cuenta.equipos) };
  }

  return { PREGUNTAS_DEF, XP_DEFENSA, DEF_PALABRAS, preguntasDefensa, corregirDefensa, modeloDefensa, COMP_ASTROLABIO, STAR_LIMITES, idHistoria, historiaStar, sobreHistorias, TIPOS_MENSAJE, XP_MENSAJE, corregirMensaje, modeloMensaje, PREGUNTAS_N2, LIMITE_N2, COSTE_N2, pistaN2, ERRORES_IA, DICTAMENES, PESOS_REV, corregirRevision, CAJAS, RAPIDO_N, XP_RAPIDO, repasar, sesionRapida, META_DIARIA, NIVELES, progreso, insignias, entidades, PESOS, UMBRAL_APTO, TICKET_MIN, VEREDICTOS, ACCIONES, SEVERIDADES, COMPETENCIAS, LIMITES, semilla, azar, registros, normalizar, camposDe, campoBien, clavesEn, corregir, resumenTurno, historial, safeParse, sanearEstado, celdaCsv, HORA };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BJ;
