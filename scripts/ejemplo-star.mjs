#!/usr/bin/env node
/* Blue-Jr · ejemplo del formato compartido con Astrolabio
 * Genera tests/fixtures/historias-blue-jr.json: dos tickets cerrados (uno defendido, otro fallado) exportados
 * como historias STAR. El mismo archivo está en el repositorio de Astrolabio, que prueba a importarlo.
 * Uso: node scripts/ejemplo-star.mjs [--check] */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const BJ = require('../src/engine/bluejr-engine.js');
const leer = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const TURNOS = [1, 2, 3, 4, 5].map((i) => leer(`src/data/t${i}.json`));
const caso = (id) => TURNOS.flatMap((t) => t.casos.map((c) => ({ ...c, t }))).find((c) => c.id === id);
// Versión fija: el ejemplo describe el formato, que nació en la 0.6.0. Así una versión nueva de Blue-Jr
// no obliga a tocar el ejemplo en Astrolabio; solo un cambio en las historias lo hace.
const VERSION = '0.6.0';

export function ejemplo() {
  const a = caso('T1-01'), b = caso('T1-02');
  const respA = { veredicto: 'vp', accion: 'contener', nota: 100, cerrado: true, cuando: '2026-11-09T08:20:00.000Z', evidencias: [], ticket: 'Fuerza bruta contra la VPN desde 203.0.113.45 que termina en login OK de r.ibanez y acceso SMB a SRV-FS01. Cuenta deshabilitada, IP bloqueada y escalado a N2.' };
  const defA = Object.fromEntries(BJ.preguntasDefensa(a, respA).map((p) => [p.id, BJ.modeloDefensa(p, a, 'es')]));
  const respB = { veredicto: 'vp', accion: 'escalar', nota: 75, cerrado: true, cuando: '2026-11-09T08:40:00.000Z', evidencias: [], ticket: 'Barrido de puertos desde una IP externa contra la IP pública; solo responden 80 y 443. Lo escalo por si es la antesala de un ataque.' };
  const defB = Object.fromEntries(BJ.preguntasDefensa(b, respB).map((p) => [p.id, BJ.modeloDefensa(p, b, 'es')]));
  const historias = [
    BJ.historiaStar(a, respA, { lang: 'es', turno: { n: 1, dia: a.t.dia }, defensa: { ...defA, ok: BJ.PREGUNTAS_DEF.slice() }, mensajes: ['n2'] }),
    BJ.historiaStar(b, respB, { lang: 'es', turno: { n: 1, dia: b.t.dia }, defensa: { ...defB, ok: BJ.PREGUNTAS_DEF.slice() } })
  ];
  return BJ.sobreHistorias(historias, VERSION, '2026-11-09T09:00:00.000Z');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = new URL('../tests/fixtures/historias-blue-jr.json', import.meta.url);
  const texto = JSON.stringify(ejemplo(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(destino, 'utf8') !== texto) { console.error('✗ tests/fixtures/historias-blue-jr.json no coincide con el motor: ejecuta node scripts/ejemplo-star.mjs y cópialo a Astrolabio'); process.exit(1); }
    console.log('✓ ejemplo STAR al día');
  } else { writeFileSync(destino, texto); console.log('✓ tests/fixtures/historias-blue-jr.json'); }
}
