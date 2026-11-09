/* BlueJr · motor
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

  /** Deja solo lo que BlueJr sabe leer, con tipos, longitudes y listas permitidas. Recalcula la nota. */
  function sanearEstado(bruto, indice) {
    const out = { v: 1, perfil: { nombre: '' }, respuestas: {}, relevos: {} };
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

  function insignias(turnos, respuestas = {}, hoy) {
    const casos = turnos.flatMap((t) => t.casos);
    const hechos = casos.filter((c) => typeof respuestas[c.id]?.nota === 'number');
    const r = (c) => respuestas[c.id];
    const p = progreso(respuestas, hoy);
    const lista = [
      ['primer', hechos.length >= 1],
      ['perfecto', hechos.some((c) => r(c).nota === 100)],
      ['sin_alarma', hechos.filter((c) => c.veredicto !== 'vp' && r(c).veredicto === c.veredicto).length >= 3],
      ['contencion', hechos.filter((c) => c.accion === 'contener' && r(c).accion === 'contener').length >= 5],
      ['turno', turnos.some((t) => resumenTurno(t, respuestas).apto)],
      ['racha3', p.racha >= 3],
      ['semana', hechos.length === casos.length && casos.length > 0]
    ];
    return lista.map(([id, ok]) => ({ id, ok }));
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

  return { META_DIARIA, NIVELES, progreso, insignias, entidades, PESOS, UMBRAL_APTO, TICKET_MIN, VEREDICTOS, ACCIONES, SEVERIDADES, COMPETENCIAS, LIMITES, semilla, azar, registros, normalizar, camposDe, campoBien, clavesEn, corregir, resumenTurno, historial, safeParse, sanearEstado, celdaCsv, HORA };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BJ;
