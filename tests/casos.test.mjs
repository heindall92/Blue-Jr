/* Integridad del contenido: cada caso tiene que poder resolverse leyendo sus registros. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BJ, CASOS, TURNOS, leerJson } from './_util.mjs';

const bil = (o) => o && typeof o.es === 'string' && o.es.trim() && typeof o.en === 'string' && o.en.trim();
const texto = (c) => (c.logs.map((l) => l.join(' ')).join('\n') + '\n' + c.resumen.es).toLowerCase();

test('5 turnos de 8 casos con ID únicos y ordenados por hora', () => {
  assert.equal(TURNOS.length, 5);
  for (const t of TURNOS) {
    assert.equal(t.casos.length, 8, t.id);
    assert.ok(bil(t.dia) && bil(t.tema), t.id);
    const horas = t.casos.map((c) => c.hora);
    assert.deepEqual(horas, [...horas].sort(), `${t.id} fuera de orden`);
    t.casos.forEach((c, i) => assert.equal(c.id, `${t.id}-0${i + 1}`));
  }
  assert.equal(new Set(CASOS.map((c) => c.id)).size, 40);
});

test('cada caso tiene sus campos con valores permitidos y textos bilingües', () => {
  for (const c of CASOS) {
    assert.ok(BJ.VEREDICTOS.includes(c.veredicto), c.id);
    assert.ok(BJ.ACCIONES.includes(c.accion), c.id);
    assert.ok(BJ.SEVERIDADES.includes(c.sev), c.id);
    assert.match(c.hora, /^(0[89]|1[0-4]):[0-5]\d$/, c.id);
    for (const k of ['regla', 'titulo', 'resumen', 'explica']) assert.ok(bil(c[k]), `${c.id}.${k}`);
    assert.ok(c.logs.length >= 3, c.id);
    for (const l of c.logs) assert.ok(Array.isArray(l) && l.length === 3 && BJ.HORA.test(l[0]), `${c.id} línea mal formada`);
    assert.ok(c.campos.length >= 1, c.id);
    for (const f of c.campos) assert.ok(bil(f.label) && f.ok.length, `${c.id}.${f.id}`);
    assert.ok(c.claves.length >= 2, c.id);
    assert.ok(c.competencias.length && c.competencias.every((k) => BJ.COMPETENCIAS.includes(k)), c.id);
    if (c.mitre) assert.match(c.mitre, /^T\d{4}(\.\d{3})?$/, c.id);
  }
});

test('las respuestas de los campos están en los registros (salvo las deducidas)', () => {
  for (const c of CASOS) for (const f of c.campos.filter((x) => !x.derivado)) {
    assert.ok(f.ok.some((o) => texto(c).includes(o.toLowerCase())), `${c.id}.${f.id}: «${f.ok[0]}» no aparece en los registros`);
  }
});

test('las claves del ticket aparecen en el caso', () => {
  for (const c of CASOS) for (const k of c.claves) assert.ok(texto(c).includes(k.toLowerCase()) || c.explica.es.toLowerCase().includes(k.toLowerCase()), `${c.id}: clave «${k}»`);
});

test('mezcla de veredictos realista: hay falsos positivos y benignos en cada turno o casi', () => {
  const n = (v) => CASOS.filter((c) => c.veredicto === v).length;
  assert.ok(n('fp') >= 4 && n('benigno') >= 8 && n('vp') <= 28, `${n('vp')}/${n('fp')}/${n('benigno')}`);
  for (const t of TURNOS) assert.ok(t.casos.some((c) => c.veredicto !== 'vp'), t.id);
  for (const a of BJ.ACCIONES) assert.ok(CASOS.some((c) => c.accion === a), a);
});

test('solo datos de documentación: IP públicas RFC 5737, red interna 10.20/16 y dominios .example', () => {
  const ip = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
  const permitida = (a, b, c) => (a === 10 && b === 20) || (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
  const todo = JSON.stringify([...TURNOS, leerJson('src/data/empresa.json'), leerJson('src/data/revision.json')]);
  for (const m of todo.matchAll(ip)) assert.ok(permitida(+m[1], +m[2], +m[3]), `IP no permitida ${m[0]}`);
  // eicar.com es el nombre del fichero de prueba EICAR, no un dominio.
  for (const m of todo.matchAll(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(com|net|org|es|io|ru|cn)\b/gi)) if (m[0].toLowerCase() !== 'eicar.com') assert.fail(`dominio real ${m[0]}`);
});

test('las referencias cruzadas entre casos existen', () => {
  const ids = new Set(CASOS.map((c) => c.id));
  for (const c of CASOS) for (const m of `${c.explica.es} ${c.explica.en}`.matchAll(/\bT[1-5]-0[1-8]\b/g)) assert.ok(ids.has(m[0]), `${c.id} cita ${m[0]}`);
});

/* ---------- Guías de investigación y árbol de decisión ---------- */
const GUIAS = leerJson('src/data/guias.json');

test('guías: cada caso está en exactamente una familia y todo es bilingüe', () => {
  const vistos = new Map();
  for (const f of GUIAS.familias) {
    assert.ok(bil(f.titulo) && bil(f.que), f.id);
    for (const k of ['triaje', 'fp', 'analisis']) { assert.ok(f[k].length >= 1, `${f.id}.${k}`); f[k].forEach((x, i) => assert.ok(bil(x), `${f.id}.${k}[${i}]`)); }
    assert.ok(f.respuesta.length >= 2, `${f.id}: al menos dos salidas`);
    for (const r of f.respuesta) { assert.ok(bil(r.si) && bil(r.porque), f.id); assert.ok(BJ.ACCIONES.includes(r.accion), `${f.id}: ${r.accion}`); }
    for (const id of f.casos) { assert.ok(!vistos.has(id), `${id} en ${vistos.get(id)} y ${f.id}`); vistos.set(id, f.id); }
  }
  assert.deepEqual([...vistos.keys()].sort(), CASOS.map((c) => c.id).sort());
});

test('guías: la respuesta de cada caso está entre las salidas que enseña su familia', () => {
  // La guía no da la solución, pero nunca puede dejar fuera la acción correcta.
  for (const f of GUIAS.familias) for (const id of f.casos) {
    const c = CASOS.find((x) => x.id === id);
    assert.ok(f.respuesta.some((r) => r.accion === c.accion), `${id}: ${c.accion} no aparece en la guía de ${f.id}`);
  }
});

test('guías: no citan casos ni datos concretos de ningún caso', () => {
  const texto = JSON.stringify({ ...GUIAS, familias: GUIAS.familias.map(({ casos, ...f }) => f) });
  for (const c of CASOS) {
    assert.ok(!texto.includes(c.id), `la guía cita ${c.id}`);
    // Los nombres de campo que salen en los registros de muchos casos (LogonType, EventID…) son vocabulario, no pistas.
    const comun = (k) => CASOS.filter((x) => x.logs.some((l) => l.join(' ').includes(k))).length >= 3;
    for (const k of c.claves) if (k.length > 5 && !/^T\d{4}/.test(k) && !comun(k)) assert.ok(!texto.includes(k), `la guía cita «${k}» de ${c.id}`);
  }
});

test('árbol de decisión: todas las ramas llegan a un resultado válido y bilingüe', () => {
  const D = GUIAS.decision;
  for (const [k, p] of Object.entries(D.preguntas)) assert.ok(bil(p) && bil(p.ayuda), k);
  for (const [k, r] of Object.entries(D.resultados)) {
    assert.ok(bil(r) && bil(r.ejemplo), k);
    assert.ok(BJ.VEREDICTOS.includes(r.veredicto) && BJ.ACCIONES.includes(r.accion), k);
  }
  // Las cinco salidas cubren las tres acciones y los tres veredictos.
  const res = Object.values(D.resultados);
  assert.deepEqual([...new Set(res.map((r) => r.accion))].sort(), [...BJ.ACCIONES].sort());
  assert.deepEqual([...new Set(res.map((r) => r.veredicto))].sort(), [...BJ.VEREDICTOS].sort());
});

/* ---------- Turno de revisión del agente de IA ---------- */
const REVISION = leerJson('src/data/revision.json');

test('revisión: diez alertas bilingües, aciertos y errores del agente mezclados, todos los tipos de error', () => {
  const casos = REVISION.casos;
  assert.equal(casos.length, 10);
  assert.equal(new Set(casos.map((c) => c.id)).size, 10);
  assert.deepEqual(casos.map((c) => c.hora), [...casos.map((c) => c.hora)].sort());
  for (const c of casos) {
    assert.ok(bil(c.titulo) && bil(c.regla) && bil(c.resumen) && bil(c.explica) && bil(c.agente.razonamiento), c.id);
    assert.ok(BJ.VEREDICTOS.includes(c.veredicto) && BJ.ACCIONES.includes(c.accion), c.id);
    assert.ok(BJ.VEREDICTOS.includes(c.agente.veredicto) && BJ.ACCIONES.includes(c.agente.accion), c.id);
    assert.ok(c.agente.confianza >= 50 && c.agente.confianza <= 99, c.id);
    c.agente.comprobaciones.forEach((x) => assert.ok(bil(x), c.id));
    for (const l of c.logs) assert.ok(Array.isArray(l) && l.length === 3 && BJ.HORA.test(l[0]), `${c.id} línea mal formada`);
    if (c.error === null) assert.ok(c.agente.veredicto === c.veredicto && c.agente.accion === c.accion, `${c.id}: si acierta, coincide`);
    else { assert.ok(BJ.ERRORES_IA.includes(c.error), c.id); assert.ok(c.agente.veredicto !== c.veredicto || c.agente.accion !== c.accion, `${c.id}: si se equivoca, la decisión no coincide`); }
  }
  const errores = casos.filter((c) => c.error).map((c) => c.error);
  assert.ok(casos.filter((c) => !c.error).length >= 3, 'hay aciertos que aprobar');
  for (const e of BJ.ERRORES_IA) assert.ok(errores.includes(e), `falta un caso de ${e}`);
});

test('revisión: el agente solo cita lo que existe en los registros, salvo cuando alucina', () => {
  for (const c of REVISION.casos) {
    const texto = c.logs.map((l) => l.join(' ')).join('\n');
    const existe = texto.includes(c.agente.cita);
    if (c.error === 'alucinacion') assert.ok(!existe, `${c.id}: la cita inventada no puede estar en los registros`);
    else assert.ok(existe, `${c.id}: «${c.agente.cita}» no aparece en los registros`);
  }
});
