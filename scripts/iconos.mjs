#!/usr/bin/env node
/* Regenera src/app/02-icons.js con el trazo interior de los iconos Lucide que usa BlueJr.
 * Fuente: el paquete lucide-static (devDependency, licencia ISC). Uso: node scripts/iconos.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export const ICONOS = ['radar', 'calendar-clock', 'siren', 'award', 'search', 'sun', 'moon', 'circle-help', 'panel-left', 'palette', 'user', 'x', 'check', 'circle-check', 'circle-x', 'arrow-up-right', 'lock', 'archive', 'file-text', 'download', 'upload', 'rotate-ccw', 'chevron-right', 'chevron-left', 'clock', 'server', 'filter', 'terminal', 'flag', 'keyboard', 'book-open', 'info', 'github', 'mail', 'play', 'list', 'triangle-alert', 'inbox', 'send', 'pin', 'target', 'scroll-text', 'zap', 'flame', 'trophy', 'compass', 'split', 'crosshair', 'list-checks', 'circle', 'lightbulb', 'bot'];
const require = createRequire(import.meta.url);
const dir = join(dirname(require.resolve('lucide-static/package.json')), 'icons');
const out = {};
for (const n of ICONOS) {
  const svg = readFileSync(join(dir, `${n}.svg`), 'utf8');
  out[n] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').trim();
}
const body = `/* Iconos Lucide (ISC, https://lucide.dev) · generado por scripts/iconos.mjs, no editar a mano */\nconst ICONOS = ${JSON.stringify(out)};\nconst ic = (n, cls = '') => \`<svg class="ic\${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">\${ICONOS[n] || ''}</svg>\`;\n`;
writeFileSync(new URL('../src/app/02-icons.js', import.meta.url), body);
console.log(`✓ ${ICONOS.length} iconos en src/app/02-icons.js`);
