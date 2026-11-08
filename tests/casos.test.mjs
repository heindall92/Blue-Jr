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
  const todo = JSON.stringify([...TURNOS, leerJson('src/data/empresa.json')]);
  for (const m of todo.matchAll(ip)) assert.ok(permitida(+m[1], +m[2], +m[3]), `IP no permitida ${m[0]}`);
  // eicar.com es el nombre del fichero de prueba EICAR, no un dominio.
  for (const m of todo.matchAll(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(com|net|org|es|io|ru|cn)\b/gi)) if (m[0].toLowerCase() !== 'eicar.com') assert.fail(`dominio real ${m[0]}`);
});

test('las referencias cruzadas entre casos existen', () => {
  const ids = new Set(CASOS.map((c) => c.id));
  for (const c of CASOS) for (const m of `${c.explica.es} ${c.explica.en}`.matchAll(/\bT[1-5]-0[1-8]\b/g)) assert.ok(ids.has(m[0]), `${c.id} cita ${m[0]}`);
});
