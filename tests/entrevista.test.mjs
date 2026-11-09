/* Del ticket a la entrevista: «Defiende tu ticket» e historias STAR para Astrolabio. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BJ, CASOS, INDICE, TURNOS, leerJson, respuestaPerfecta } from './_util.mjs';

const CONTRATO = leerJson('tests/fixtures/contrato-astrolabio.json');
const conAccion = (c, accion) => ({ ...respuestaPerfecta(c), accion });
const caso = (accion) => CASOS.find((c) => c.accion === accion);

test('preguntas: una decisión correcta se defiende frente a la alternativa y un error se reconoce', () => {
  const esc = caso('escalar');
  const ok = BJ.preguntasDefensa(esc, respuestaPerfecta(esc));
  assert.deepEqual(ok.map((p) => p.id), ['veredicto', 'accion', 'evidencia']);
  // El ejemplo de la hoja de ruta: «¿por qué escalaste y no contuviste?».
  assert.deepEqual(ok[1], { id: 'accion', modo: 'defiende', tu: 'escalar', alt: 'contener' });
  const mal = BJ.preguntasDefensa(esc, conAccion(esc, 'cerrar'));
  assert.deepEqual(mal[1], { id: 'accion', modo: 'error', tu: 'cerrar', sol: 'escalar' });
  assert.equal(mal[0].modo, 'defiende');
  for (const c of CASOS) for (const v of BJ.VEREDICTOS) for (const a of BJ.ACCIONES) {
    const ps = BJ.preguntasDefensa(c, { veredicto: v, accion: a });
    for (const p of ps.filter((x) => x.modo === 'defiende' && x.alt)) assert.notEqual(p.alt, p.tu, `${c.id}: la alternativa no puede ser lo que elegiste`);
  }
});

test('corrección de la defensa: cada criterio falla con su texto malo', () => {
  const c = INDICE['T1-01']; // contener; claves 203.0.113.45 y r.ibanez
  const acc = BJ.preguntasDefensa(c, respuestaPerfecta(c))[1];
  const bueno = 'Contuve porque el riesgo era inmediato: r.ibanez ya tenía sesión y el daño podía propagarse. Escalar sin contener dejaba la puerta abierta mientras el N2 lo miraba.';
  assert.ok(BJ.corregirDefensa(acc, bueno, c).completo);
  const falla = (texto, id) => assert.equal(BJ.corregirDefensa(acc, texto, c).criterios.find((k) => k.id === id).ok, false, id);
  falla(bueno.replace('porque', 'y'), 'porque');
  falla('Contuve porque r.ibanez tenía sesión abierta y era lo que tocaba hacer. Escalar sin contener dejaba la puerta abierta al atacante.', 'riesgo');
  falla(bueno.replace('Escalar sin contener dejaba la puerta abierta mientras el N2 lo miraba.', 'No había más que hacer.'), 'alternativa');
  falla('Contuve porque había riesgo y escalé.', 'breve');
  const ver = BJ.preguntasDefensa(c, respuestaPerfecta(c))[0];
  const v = 'Lo di por verdadero positivo porque tras los fallos hay un login OK de r.ibanez desde 203.0.113.45. No era un falso positivo: la regla no saltó por ruido.';
  assert.ok(BJ.corregirDefensa(ver, v, c).completo);
  assert.equal(BJ.corregirDefensa(ver, v.replaceAll('r.ibanez', 'la cuenta').replace('203.0.113.45', 'una IP'), c).criterios.find((k) => k.id === 'dato').ok, false);
  const ev = BJ.preguntasDefensa(c, respuestaPerfecta(c))[2];
  const e = 'Le daría la línea de las 08:05 de vpn01, porque ahí se ve el login OK de r.ibanez desde la misma IP que fallaba.';
  assert.ok(BJ.corregirDefensa(ev, e, c).completo);
  assert.equal(BJ.corregirDefensa(ev, e.replace('de las 08:05 ', ''), c).criterios.find((k) => k.id === 'cuando').ok, false);
  const err = BJ.preguntasDefensa(c, conAccion(c, 'cerrar'))[1];
  const r = 'Me equivoqué: lo cerré y había que contener. Se me pasó el login OK de r.ibanez a las 08:05. Ahora, antes de cerrar, busco si algún intento tuvo éxito.';
  assert.ok(BJ.corregirDefensa(err, r, c).completo);
  assert.equal(BJ.corregirDefensa(err, r.replace('Me equivoqué:', 'Bueno,').replace('Se me pasó', 'Estaba'), c).criterios.find((k) => k.id === 'reconoce').ok, false);
  assert.equal(BJ.corregirDefensa(err, r.replace('Ahora, antes de cerrar,', 'Antes de cerrar'), c).criterios.find((k) => k.id === 'ahora').ok, false);
});

test('respuestas de ejemplo: cumplen su propia corrección en los 40 casos, con cualquier decisión y en los dos idiomas', () => {
  let n = 0;
  for (const c of CASOS) for (const v of BJ.VEREDICTOS) for (const a of BJ.ACCIONES) for (const p of BJ.preguntasDefensa(c, { veredicto: v, accion: a })) for (const lang of ['es', 'en']) {
    const r = BJ.corregirDefensa(p, BJ.modeloDefensa(p, c, lang), c);
    assert.ok(r.completo, `${c.id} ${v}/${a} ${p.id} ${p.modo} ${lang}: ${r.criterios.filter((k) => !k.ok).map((k) => k.id)}`);
    n++;
  }
  assert.equal(n, CASOS.length * 9 * 3 * 2);
});

test('historia STAR: cumple lo que Astrolabio acepta en los 40 casos, en los dos idiomas y con textos al límite', () => {
  const re = new RegExp(CONTRATO.id, 'i');
  const fecha = new RegExp(CONTRATO.fecha);
  for (const t of TURNOS) for (const c of t.casos) for (const lang of ['es', 'en']) for (const largo of [false, true]) {
    const r = { ...respuestaPerfecta(c), cerrado: true, nota: 100, cuando: '2026-11-09T10:00:00Z', evidencias: [0, 1, 2, 3], ticket: largo ? 'x'.repeat(BJ.LIMITES.ticket) : respuestaPerfecta(c).ticket };
    const def = largo ? { accion: 'y'.repeat(BJ.LIMITES.ticket), ok: ['accion'] } : undefined;
    const h = BJ.historiaStar(c, r, { lang, turno: { n: 1, dia: t.dia }, defensa: def, mensajes: largo ? ['n2', 'dir'] : [] });
    assert.ok(re.test(h.id) && !['__proto__', 'constructor', 'prototype'].includes(h.id), h.id);
    assert.ok(h.titulo.length > 0 && h.titulo.length <= CONTRATO.limites.titulo, `${c.id} título`);
    for (const k of CONTRATO.bloques) assert.ok(typeof h[k] === 'string' && h[k].length > 0 && h[k].length <= CONTRATO.limites.bloque, `${c.id} ${k}`);
    assert.ok(CONTRATO.tipos.includes(h.tipo));
    assert.ok(h.competencias.length >= 1 && h.competencias.length <= CONTRATO.limites.competenciasPorHistoria);
    for (const k of h.competencias) assert.ok(CONTRATO.competencias.includes(k), `${c.id}: ${k} no es una competencia de Astrolabio`);
    assert.ok(fecha.test(h.creada) && fecha.test(h.editada));
  }
  const sobre = BJ.sobreHistorias([], '0.6.0', '2026-11-09T10:00:00.000Z');
  assert.deepEqual({ formato: sobre.formato, version: sobre.version, tipo: sobre.tipo }, { formato: CONTRATO.formato, version: CONTRATO.version, tipo: CONTRATO.tipo });
  assert.equal(sobre.app, 'blue-jr');
});

test('historia STAR: cuenta lo que hizo el analista y es honesta con los errores', () => {
  const c = INDICE['T1-01'];
  const r = { ...conAccion(c, 'escalar'), cerrado: true, nota: 75, cuando: '2026-11-09T10:00:00Z', ticket: 'Fuerza bruta desde 203.0.113.45 que acaba en login OK de r.ibanez.' };
  const h = BJ.historiaStar(c, r, { lang: 'es', turno: { n: 1, dia: TURNOS[0].dia }, defensa: { accion: 'Me equivoqué: escalé sin contener con r.ibanez dentro. Ahora contengo primero.', ok: ['accion'] }, mensajes: ['n2'] });
  assert.match(h.s, /simulador de SOC/);
  assert.match(h.s, /empresa ficticia/);
  assert.match(h.a, /Fuerza bruta desde 203\.0\.113\.45/);
  assert.match(h.a, /el escalado al N2/);
  assert.match(h.r, /75\/100/);
  assert.match(h.r, /Fallé la acción \(había que contener\)/);
  assert.equal(h.l, 'Me equivoqué: escalé sin contener con r.ibanez dentro. Ahora contengo primero.');
  assert.ok(h.competencias.includes('comunicacion'));
  // Una defensa sin completar no entra en la historia.
  const sin = BJ.historiaStar(c, { ...respuestaPerfecta(c), cerrado: true, nota: 100 }, { defensa: { accion: 'texto a medias', ok: [] } });
  assert.doesNotMatch(sin.a, /texto a medias/);
});

test('saneado: la entrevista solo existe para tickets cerrados y «completa» se recalcula', () => {
  const c = INDICE['T1-01'];
  const ok = BJ.preguntasDefensa(c, respuestaPerfecta(c));
  const textos = Object.fromEntries(ok.map((p) => [p.id, BJ.modeloDefensa(p, c, 'es')]));
  const s = BJ.sanearEstado({
    respuestas: { 'T1-01': { ...respuestaPerfecta(c), cerrado: true }, 'T1-02': { ...respuestaPerfecta(INDICE['T1-02']) } },
    defensas: {
      'T1-01': { ...textos, evidencia: 'nada', ok: ['veredicto', 'accion', 'evidencia', 'inventada'], cuando: 'no es fecha', __proto__: { x: 1 } },
      'T1-02': { veredicto: 'x', ok: ['veredicto'] },
      'T9-99': { ok: ['veredicto'] }
    }
  }, INDICE);
  assert.deepEqual(Object.keys(s.defensas), ['T1-01']);
  assert.deepEqual(s.defensas['T1-01'].ok, ['veredicto', 'accion']);
  assert.equal(s.defensas['T1-01'].cuando, null);
});

test('XP e insignia: la entrevista completa suma y «Lista para la entrevista» pide tres tickets', () => {
  assert.equal(BJ.XP_DEFENSA, 15);
  const ins = (n) => BJ.insignias(TURNOS, {}, '2026-11-09', { defensas: n }).find((x) => x.id === 'entrevista').ok;
  assert.equal(ins(2), false);
  assert.equal(ins(3), true);
});

test('el ejemplo compartido con Astrolabio (tests/fixtures/historias-blue-jr.json) es lo que genera el motor hoy', async () => {
  const { ejemplo } = await import('../scripts/ejemplo-star.mjs');
  assert.deepEqual(leerJson('tests/fixtures/historias-blue-jr.json'), JSON.parse(JSON.stringify(ejemplo())), 'ejecuta node scripts/ejemplo-star.mjs y copia el archivo a tests/fixtures/ de Astrolabio');
});
