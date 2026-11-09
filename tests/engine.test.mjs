import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BJ, CASOS, INDICE, TURNOS, respuestaPerfecta } from './_util.mjs';

test('los pesos suman 100 y el umbral está dentro', () => {
  assert.equal(Object.values(BJ.PESOS).reduce((a, b) => a + b, 0), 100);
  assert.ok(BJ.UMBRAL_APTO > 0 && BJ.UMBRAL_APTO <= 100);
});

test('una respuesta perfecta saca 100 en los 40 casos', () => {
  for (const c of CASOS) assert.equal(BJ.corregir(c, respuestaPerfecta(c)).nota, 100, c.id);
});

test('una respuesta vacía saca 0 y no lanza', () => {
  for (const c of CASOS) assert.equal(BJ.corregir(c, {}).nota, 0, c.id);
  assert.equal(BJ.corregir(CASOS[0]).nota, 0);
});

test('fallar el veredicto resta exactamente su peso', () => {
  const c = INDICE['T1-01'];
  const r = { ...respuestaPerfecta(c), veredicto: 'fp' };
  assert.equal(BJ.corregir(c, r).nota, 100 - BJ.PESOS.veredicto);
});

test('fallar la acción resta exactamente su peso', () => {
  const c = INDICE['T1-02'];
  assert.equal(BJ.corregir(c, { ...respuestaPerfecta(c), accion: 'contener' }).nota, 100 - BJ.PESOS.accion);
});

test('los campos puntúan en proporción a los aciertos', () => {
  const c = INDICE['T1-01']; // ip, usuario y mitre
  const r = respuestaPerfecta(c);
  r.campos.ip = '0.0.0.0';
  const res = BJ.corregir(c, r);
  assert.equal(res.criterios.find((k) => k.id === 'campos').puntos, Math.round(BJ.PESOS.campos * 2 / 3));
});

test('la comparación de campos ignora mayúsculas, espacios y puntuación final', () => {
  const c = INDICE['T1-04'];
  const f = BJ.camposDe(c).find((x) => x.id === 'equipo');
  assert.ok(BJ.campoBien(f, '  pc-fin-007. '));
  assert.ok(!BJ.campoBien(f, 'PC-FIN-008'));
  assert.ok(!BJ.campoBien(f, ''));
});

test('MITRE acepta la subtécnica, la técnica padre y las alternativas declaradas', () => {
  const c = INDICE['T1-01'];
  const m = BJ.camposDe(c).find((x) => x.id === 'mitre');
  for (const v of ['T1110.001', 't1110.001', 'T1110']) assert.ok(BJ.campoBien(m, v), v);
  assert.ok(!BJ.campoBien(m, 'T1110.003'));
  const dns = BJ.camposDe(INDICE['T4-05']).find((x) => x.id === 'mitre');
  assert.ok(BJ.campoBien(dns, 'T1071.004') && BJ.campoBien(dns, 'T1048'));
});

test('los casos sin técnica no piden ID de MITRE', () => {
  for (const c of CASOS.filter((x) => !x.mitre)) assert.ok(!BJ.camposDe(c).some((f) => f.id === 'mitre'), c.id);
});

test('el ticket: mitad por longitud, mitad por citar la mitad de las claves', () => {
  const c = INDICE['T1-04']; // 3 claves: hacen falta 2
  const base = respuestaPerfecta(c);
  const t = (ticket) => BJ.corregir(c, { ...base, ticket }).criterios.find((k) => k.id === 'ticket').puntos;
  assert.equal(t('corto'), 0);
  assert.equal(t('x'.repeat(BJ.TICKET_MIN)), BJ.PESOS.ticket / 2);
  assert.equal(t('soporte$ en PC-FIN-007'), BJ.PESOS.ticket / 2);
  assert.equal(t('Cuenta soporte$ creada en PC-FIN-007 sin cambio aprobado; se escala a nivel 2 con prioridad.'), BJ.PESOS.ticket);
});

test('los registros son deterministas, ordenados y contienen toda la señal', () => {
  for (const c of CASOS) {
    const a = BJ.registros(c), b = BJ.registros(c);
    assert.deepEqual(a, b, c.id);
    assert.equal(a.filter((l) => l.senal).length, c.logs.length, c.id);
    for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].t <= a[i].t, `${c.id} desordenado`);
    assert.ok(a.every((l) => BJ.HORA.test(l.t)), c.id);
    assert.equal(new Set(a.map((l) => l.n)).size, a.length, `${c.id} índices repetidos`);
  }
});

test('el ruido nunca cita personas, equipos ni IP de la señal', () => {
  for (const c of CASOS) {
    const senal = c.logs.map((l) => l[2]).join(' ');
    const entidades = [...senal.matchAll(/\b(?:[a-z]\.[a-z]+|PC-[A-Z]+-\d+|10\.20\.\d+\.\d+)\b/g)].map((m) => m[0]);
    for (const l of BJ.registros(c).filter((x) => !x.senal)) for (const e of entidades) assert.ok(!l.m.includes(e), `${c.id}: «${e}» en el ruido`);
  }
});

test('resumen de turno e historial', () => {
  const t = TURNOS[0];
  const resp = Object.fromEntries(t.casos.map((c, i) => [c.id, { ...respuestaPerfecta(c), nota: i < 4 ? 100 : 50 }]));
  const r = BJ.resumenTurno(t, resp);
  assert.deepEqual([r.hechos, r.media, r.completo, r.apto], [8, 75, true, true]);
  const h = BJ.historial(TURNOS, resp);
  assert.equal(h.tickets, 8);
  assert.equal(h.total, 40);
  assert.equal(h.precisionVeredicto, 100);
  assert.equal(h.competencias.length, BJ.COMPETENCIAS.length);
  const mal = { ...resp, 'T1-01': { ...resp['T1-01'], accion: 'cerrar' } };
  assert.equal(BJ.historial(TURNOS, mal).cerradosPorError, 1);
});

test('safeParse nunca lanza y descarta claves peligrosas', () => {
  assert.deepEqual(BJ.safeParse('{roto').ok, false);
  const r = BJ.safeParse('{"__proto__":{"x":1},"a":{"constructor":{"prototype":{"y":2}}}}');
  assert.ok(r.ok);
  assert.equal({}.x, undefined);
  assert.equal(Object.keys(r.valor).includes('__proto__'), false);
  assert.equal(r.valor.a.constructor, Object);
});

test('sanearEstado: tipos, listas permitidas, longitudes y nota recalculada', () => {
  const c = INDICE['T1-01'];
  const bruto = {
    perfil: { nombre: 'x'.repeat(500) },
    respuestas: {
      'T1-01': { ...respuestaPerfecta(c), cerrado: true, nota: 3, evidencias: [0, 1, 'a', -1, 5000], campos: { ip: '203.0.113.45', inventado: 'z', usuario: 7 } },
      'T9-99': { veredicto: 'vp' },
      'T1-02': { veredicto: 'hackeado', accion: 'borrar', cerrado: true, ticket: 42 }
    },
    relevos: { T1: 'ok', malo: 'no', T2: { x: 1 } }
  };
  const s = BJ.sanearEstado(bruto, INDICE);
  assert.equal(s.perfil.nombre.length, BJ.LIMITES.nombre);
  assert.equal(s.respuestas['T1-01'].nota, BJ.corregir(c, s.respuestas['T1-01']).nota);
  assert.deepEqual(s.respuestas['T1-01'].evidencias, [0, 1]);
  assert.deepEqual(Object.keys(s.respuestas['T1-01'].campos), ['ip']);
  assert.equal(s.respuestas['T9-99'], undefined);
  assert.equal(s.respuestas['T1-02'].veredicto, null);
  assert.equal(s.respuestas['T1-02'].cerrado, undefined);
  assert.deepEqual(s.relevos, { T1: 'ok' });
  assert.deepEqual(BJ.sanearEstado('basura', INDICE).respuestas, {});
});

test('celdaCsv neutraliza fórmulas', () => {
  for (const v of ['=1+1', '+cmd', '-2', '@SUM(A1)']) assert.ok(BJ.celdaCsv(v).replace(/^"/, '').startsWith("'"), v);
  assert.equal(BJ.celdaCsv('a,b'), '"a,b"');
});

/* ---------- Práctica: XP, racha, nivel e insignias ---------- */
test('progreso: la XP es la suma de notas y la racha cuenta días seguidos', () => {
  const r = { a: { nota: 80, cuando: '2026-11-09T07:00:00Z' }, b: { nota: 90, cuando: '2026-11-08T10:00:00Z' }, c: { nota: 100, cuando: '2026-11-07T10:00:00Z' }, d: { nota: 70, cuando: '2026-11-05T10:00:00Z' } };
  const p = BJ.progreso(r, '2026-11-09');
  assert.equal(p.xp, 340);
  assert.equal(p.xpHoy, 80);
  assert.equal(p.racha, 3, 'el 6 no hubo tickets: la racha empieza el 7');
  // Si hoy aún no hay ticket, la racha sigue viva desde ayer; si pasa un día entero sin practicar, se rompe.
  assert.equal(BJ.progreso(r, '2026-11-10').racha, 3);
  assert.equal(BJ.progreso(r, '2026-11-11').racha, 0);
  assert.equal(BJ.progreso({}, '2026-11-09').racha, 0);
});

test('progreso: niveles en orden y la barra llega al 100 % en el último', () => {
  const xs = BJ.NIVELES.map((n) => n.xp);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
  assert.equal(xs[0], 0);
  assert.ok(xs.at(-1) <= CASOS.length * 100, 'el último nivel se puede alcanzar');
  const todo = Object.fromEntries(CASOS.map((c) => [c.id, { nota: 100, cuando: '2026-11-09T08:00:00Z' }]));
  const p = BJ.progreso(todo, '2026-11-09');
  assert.equal(p.nivel, BJ.NIVELES.at(-1).id);
  assert.equal(p.pctNivel, 100);
  assert.equal(p.siguiente, null);
  const casi = BJ.progreso({ a: { nota: 99, cuando: null } }, '2026-11-09');
  assert.equal(casi.nivel, 'becario'); assert.equal(casi.faltan, BJ.NIVELES[1].xp - 99); assert.equal(casi.xpHoy, 0);
});

test('progreso: los tickets reabiertos (sin nota) no cuentan', () => {
  assert.equal(BJ.progreso({ a: { veredicto: 'vp', cuando: '2026-11-09T07:00:00Z' } }, '2026-11-09').xp, 0);
});

test('insignias: se ganan con lo que piden y no antes', () => {
  assert.ok(BJ.insignias(TURNOS, {}, '2026-11-09').every((i) => !i.ok));
  const t1 = TURNOS[0];
  const resp = Object.fromEntries(t1.casos.map((c) => [c.id, { ...respuestaPerfecta(c), nota: 100, cuando: '2026-11-09T08:00:00Z' }]));
  const ok = Object.fromEntries(BJ.insignias(TURNOS, resp, '2026-11-09').map((i) => [i.id, i.ok]));
  assert.equal(ok.primer, true); assert.equal(ok.perfecto, true); assert.equal(ok.turno, true);
  assert.equal(ok.semana, false); assert.equal(ok.racha3, false);
  const fpBien = t1.casos.filter((c) => c.veredicto !== 'vp').length;
  assert.equal(ok.sin_alarma, fpBien >= 3);
});

test('entidades: cuentas, IP y equipos ordenados por apariciones', () => {
  const lineas = [
    { s: 'vpn01', m: 'login FAILED user=r.ibanez src=203.0.113.45' },
    { s: 'vpn01', m: 'login OK user=r.ibanez src=203.0.113.45 assigned=10.20.200.31' },
    { s: 'win-SRV-FS01', m: 'EventID=4624 TargetUserName=r.ibanez IpAddress=10.20.200.31 WorkstationName=PC-1 SubjectUserName=-' }
  ];
  const e = BJ.entidades(lineas);
  assert.deepEqual(e.cuentas, [['r.ibanez', 3]]);
  assert.deepEqual(e.ips, [['10.20.200.31', 2], ['203.0.113.45', 2]]);
  assert.deepEqual(e.equipos.map(([v]) => v), ['vpn01', 'PC-1', 'win-SRV-FS01']);
  // En todos los casos, la entidad principal del caso aparece entre las del caso.
  for (const c of CASOS) {
    const ent = BJ.entidades(BJ.registros(c), 50);
    const todas = [...ent.cuentas, ...ent.ips, ...ent.equipos].map(([v]) => v.toLowerCase());
    assert.ok(todas.length > 0, c.id);
  }
});

/* ---------- Revisión de IA y triaje rápido ---------- */
const REVISION = JSON.parse(readFileSync(new URL('../src/data/revision.json', import.meta.url), 'utf8'));

test('revisión: aprobar un acierto o rechazar un error con motivo y acción da 100; lo contrario, 0', () => {
  for (const it of REVISION.casos) {
    const perfecta = it.error === null ? { dictamen: 'aprobar' } : { dictamen: 'rechazar', motivo: it.error, accion: it.accion };
    assert.equal(BJ.corregirRevision(it, perfecta).nota, 100, it.id);
    assert.equal(BJ.corregirRevision(it, { dictamen: it.error === null ? 'rechazar' : 'aprobar' }).nota, 0, it.id);
  }
  const malo = REVISION.casos.find((x) => x.error);
  assert.equal(BJ.corregirRevision(malo, { dictamen: 'rechazar' }).nota, BJ.PESOS_REV.dictamen, 'detectar el error sin saber cuál');
  assert.equal(Object.values(BJ.PESOS_REV).reduce((a, b) => a + b, 0), 100);
});

test('repaso espaciado: fallar vuelve mañana y acertar aleja la siguiente vez hasta 14 días', () => {
  assert.deepEqual(BJ.repasar(undefined, false, '2026-11-09'), { caja: 0, proximo: '2026-11-10' });
  let e;
  const dias = [];
  for (let i = 0; i < 6; i++) { e = BJ.repasar(e, true, '2026-11-09'); dias.push(e.proximo); }
  assert.deepEqual(dias, ['2026-11-11', '2026-11-13', '2026-11-16', '2026-11-23', '2026-11-23', '2026-11-23']);
  assert.equal(BJ.repasar({ caja: 4, proximo: '2026-11-23' }, false, '2026-11-09').caja, 0);
});

test('triaje rápido: solo alertas cerradas, primero las que tocan repaso y luego las falladas', () => {
  const casos = CASOS.slice(0, 16);
  const resp = Object.fromEntries(casos.slice(0, 12).map((c, i) => [c.id, { nota: 80, accion: i === 5 ? 'cerrar' : c.accion }]));
  const repaso = { [casos[3].id]: { caja: 1, proximo: '2026-11-09' }, [casos[4].id]: { caja: 2, proximo: '2026-11-20' } };
  const s = BJ.sesionRapida(casos, resp, repaso, '2026-11-09');
  assert.equal(s.length, 10);
  assert.ok(s.every((c) => resp[c.id]), 'nunca enseña una alerta que no se ha trabajado');
  assert.equal(s[0].id, casos[3].id, 'primero lo que toca repasar hoy');
  if (casos[5].accion !== 'cerrar') assert.equal(s[1].id, casos[5].id, 'después lo que se falló en el turno');
  assert.deepEqual(BJ.sesionRapida(casos, resp, repaso, '2026-11-09').map((c) => c.id), s.map((c) => c.id), 'determinista por día');
  assert.equal(BJ.sesionRapida(casos, {}, {}, '2026-11-09').length, 0);
});

test('saneado: revisiones, repaso y triaje rápido hostiles se descartan y las notas se recalculan', () => {
  const indice = Object.fromEntries(CASOS.map((c) => [c.id, c]));
  const rev = Object.fromEntries(REVISION.casos.map((c) => [c.id, c]));
  const malo = REVISION.casos.find((x) => x.error);
  const s = BJ.sanearEstado({
    revisiones: { [malo.id]: { dictamen: 'aprobar', cerrado: true, nota: 100 }, 'R-99': { dictamen: 'aprobar', cerrado: true }, __proto__: { x: 1 } },
    repaso: { 'T1-01': { caja: 9, proximo: '2026-11-10' }, 'T1-02': { caja: 1, proximo: 'mañana' }, 'T1-03': { caja: 2, proximo: '2026-11-12' }, 'XX': { caja: 0, proximo: '2026-11-10' } },
    rapido: { '2026-11-09': { aciertos: 50, total: 10 }, '2026-11-08': { aciertos: 7, total: 10, ms: 1e12 }, 'ayer': { aciertos: 1, total: 1 } }
  }, indice, rev);
  assert.deepEqual(Object.keys(s.revisiones), [malo.id]);
  assert.equal(s.revisiones[malo.id].nota, 0, 'la nota se recalcula');
  assert.deepEqual(s.repaso, { 'T1-03': { caja: 2, proximo: '2026-11-12' } });
  assert.deepEqual(s.rapido, { '2026-11-08': { aciertos: 7, total: 10, ms: 0 } });
});

test('práctica: la XP suma tickets, revisiones y la primera ronda diaria del triaje rápido', () => {
  const entradas = [{ nota: 80, cuando: '2026-11-09T08:00:00Z' }, { nota: 100, cuando: '2026-11-08T08:00:00Z' }, { nota: 9 * BJ.XP_RAPIDO, cuando: '2026-11-07T12:00:00Z' }];
  const p = BJ.progreso(entradas, '2026-11-09');
  assert.equal(p.xp, 225);
  assert.equal(p.racha, 3, 'el triaje rápido también mantiene la racha');
  const ins = Object.fromEntries(BJ.insignias(TURNOS, {}, '2026-11-09', { racha: 3, cazados: 3, rapidoPerfecto: true }).map((i) => [i.id, i.ok]));
  assert.equal(ins.racha3, true); assert.equal(ins.revisor, true); assert.equal(ins.rapido, true);
});

/* ---------- Comunicar y Pregunta al N2 ---------- */
const C1 = INDICE['T1-01'];
const BUENO_N2 = 'Prioridad alta. A las 08:05 fuerza bruta contra la VPN desde 203.0.113.45 que termina en login OK de r.ibanez y acceso SMB a SRV-FS01. He deshabilitado la cuenta y bloqueado la IP; lo escalo para revisar el alcance.';
const BUENO_DIR = 'Esta mañana alguien de fuera consiguió entrar con la cuenta de un empleado de almacén. El equipo de seguridad ya ha bloqueado el acceso y está investigando si llegó a ver datos de clientes o pedidos. Necesitamos que confirméis si podemos cortar hoy su acceso remoto mientras termina la revisión.';
const crit = (tipo, texto) => Object.fromEntries(BJ.corregirMensaje(tipo, texto, C1).criterios.map((c) => [c.id, c.ok]));

test('mensaje a N2: un texto bueno cumple todo y cada criterio falla con su texto malo', () => {
  assert.ok(BJ.corregirMensaje('n2', BUENO_N2, C1).completo);
  assert.equal(crit('n2', 'A las 08:05 r.ibanez desde 203.0.113.45, deshabilitada. Prioridad alta.').que, false, 'sin decir qué pasó');
  assert.equal(crit('n2', BUENO_N2.replace('A las 08:05 ', '')).cuando, false, 'sin hora');
  assert.equal(crit('n2', 'Prioridad alta. A las 08:05 fuerza bruta contra la VPN. He deshabilitado la cuenta.').quien, false, 'sin datos del caso');
  assert.equal(crit('n2', 'Prioridad alta. A las 08:05 fuerza bruta contra la VPN de r.ibanez. He deshabilitado la cuenta.').evidencia, false, 'un solo dato');
  assert.equal(crit('n2', 'Prioridad alta. A las 08:05 fuerza bruta contra la VPN desde 203.0.113.45 a r.ibanez.').accion, false, 'sin acción');
  assert.equal(crit('n2', 'A las 08:05 fuerza bruta contra la VPN desde 203.0.113.45 a r.ibanez; deshabilito la cuenta mediante el playbook.').urgencia, false, '«mediante» no es «media»');
  assert.ok(BJ.corregirMensaje('n2', 'Priority high. At 08:05 VPN brute force from 203.0.113.45 ends in a login OK for r.ibanez. I disabled the account and I am escalating.', C1).completo, 'también en inglés');
});

test('aviso a dirección: lenguaje llano, impacto, situación, petición y brevedad', () => {
  assert.ok(BJ.corregirMensaje('dir', BUENO_DIR, C1).completo);
  assert.equal(crit('dir', BUENO_DIR.replace('alguien de fuera', 'la IP 203.0.113.45')).llano, false, 'una IP es jerga para dirección');
  assert.equal(crit('dir', BUENO_DIR + ' Técnica T1110.').llano, false, 'un ID de técnica también');
  assert.equal(crit('dir', 'Esta mañana alguien de fuera consiguió entrar con una cuenta. El equipo de seguridad ya lo ha bloqueado y lo está investigando a fondo con calma. Necesitamos que confirméis si podemos cortar hoy su acceso remoto mientras termina la revisión de todo.').impacto, false, 'sin impacto');
  assert.equal(crit('dir', 'Esta mañana alguien de fuera consiguió entrar con la cuenta de un empleado y pudo ver datos de clientes y pedidos de hoy. Necesitamos que confirméis si podemos cortar hoy su acceso remoto mientras termina la revisión de todo.').situacion, false, 'sin decir qué se hace');
  assert.equal(crit('dir', 'Esta mañana alguien de fuera consiguió entrar con la cuenta de un empleado. El equipo de seguridad ya ha bloqueado el acceso y está investigando si llegó a ver datos de clientes o pedidos de hoy.').peticion, false, 'sin petición');
  assert.equal(crit('dir', 'Hemos bloqueado un acceso; afecta a datos de clientes. Necesitamos vuestra decisión.').breve, false, 'demasiado corto');
});

test('mensajes de ejemplo: los de todos los casos escalados cumplen su propia corrección, en los dos idiomas', () => {
  for (const c of CASOS.filter((x) => x.accion !== 'cerrar')) for (const lang of ['es', 'en']) for (const tipo of BJ.TIPOS_MENSAJE) {
    const r = BJ.corregirMensaje(tipo, BJ.modeloMensaje(tipo, c, lang), c);
    assert.ok(r.completo, `${c.id} ${lang} ${tipo}: ${r.criterios.filter((x) => !x.ok).map((x) => x.id)}`);
  }
});

test('Pregunta al N2: pistas del caso sin dar la respuesta', () => {
  const ini = BJ.pistaN2('inicio', C1);
  assert.ok(C1.logs.some(([t, s, m]) => t === ini.hora && s === ini.fuente && C1.claves.some((k) => m.includes(k))), 'señala una línea con un dato clave');
  assert.deepEqual(BJ.pistaN2('falta', C1, { campos: { ip: '203.0.113.45' } }).campos, ['usuario', 'mitre']);
  assert.deepEqual(BJ.pistaN2('falta', C1, respuestaPerfecta(C1)).campos, []);
  assert.equal(BJ.pistaN2('decision', C1, {}).v, null);
  assert.equal(BJ.pistaN2('decision', C1, { veredicto: 'vp' }).v, true);
  assert.equal(BJ.pistaN2('decision', C1, { veredicto: 'fp' }).v, false);
  assert.equal(BJ.pistaN2('decision', C1, { veredicto: 'vp', accion: 'cerrar' }).accion, undefined, 'nunca dice la acción');
});

test('saneado: mensajes y preguntas al N2 importados se recalculan y se limpian', () => {
  const indice = Object.fromEntries(CASOS.map((c) => [c.id, c]));
  const s = BJ.sanearEstado({
    mensajes: { 'T1-01': { n2: BUENO_N2, dir: 'corto', ok: ['n2', 'dir'] }, 'T1-02': { ok: ['n2'] }, 'ZZ': { n2: BUENO_N2 } },
    n2: { 'T1-01': [{ tipo: 'inicio' }, { tipo: 'inicio' }, { tipo: 'decision', v: 'si' }, { tipo: 'falta', campos: ['usuario', '<img>'] }, { tipo: 'trampa' }], 'XX': [{ tipo: 'inicio' }] }
  }, indice, {});
  assert.deepEqual(s.mensajes['T1-01'].ok, ['n2'], 'solo cuenta lo que cumple de verdad');
  assert.deepEqual(s.mensajes['T1-02'].ok, [], 'sin texto no hay mensaje completo');
  assert.equal(s.mensajes.ZZ, undefined);
  assert.deepEqual(s.n2['T1-01'], [{ tipo: 'inicio' }, { tipo: 'decision', v: null }, { tipo: 'falta', campos: ['usuario'] }]);
  assert.equal(s.n2.XX, undefined);
  const ins = Object.fromEntries(BJ.insignias(TURNOS, {}, '2026-11-09', { mensajes: 5 }).map((i) => [i.id, i.ok]));
  assert.equal(ins.comunicador, true);
});
