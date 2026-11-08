/* Utilidades compartidas por las pruebas. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const BJ = require('../src/engine/bluejr-engine.js');
export const leerJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
export const TURNOS = [1, 2, 3, 4, 5].map((i) => leerJson(`src/data/t${i}.json`));
export const CASOS = TURNOS.flatMap((t) => t.casos);
export const INDICE = Object.fromEntries(CASOS.map((c) => [c.id, c]));
export const I18N = vm.runInNewContext(readFileSync(join(ROOT, 'src/app/00-i18n.js'), 'utf8') + '\n;I18N');

/** Respuesta perfecta para un caso: la usan varias pruebas como referencia. */
export function respuestaPerfecta(c) {
  const campos = Object.fromEntries(BJ.camposDe(c).map((f) => [f.id, f.ok[0]]));
  const ticket = `Revisado el caso ${c.id}. Evidencias: ${c.claves.join(', ')}. Se documenta la decisión con detalle suficiente.`;
  return { veredicto: c.veredicto, accion: c.accion, campos, ticket };
}

/** Lanzador de Chromium: en local usa el del entorno si se indica en PW_CHROMIUM. */
export async function lanzar() {
  const { chromium } = await import('playwright');
  return chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
}
export const URL_APP = 'file://' + join(ROOT, 'dist/index.html');
