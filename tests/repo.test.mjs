/* Coherencia del repositorio: build al día, CSP, i18n, versión y enlaces del README. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, BJ, I18N } from './_util.mjs';
import { build, VERSION } from '../scripts/build.mjs';

const html = build();

test('dist/index.html e index.html están al día con src/', () => {
  for (const f of ['dist/index.html', 'index.html']) assert.equal(readFileSync(join(ROOT, f), 'utf8'), html, `${f} desactualizado: npm run build`);
});

test('CSP estricta por hashes y sin recursos externos', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'sha256-[^']+'/);
  assert.doesNotMatch(csp, /'unsafe-eval'|script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /connect-src 'none'/);
  assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i);
  assert.doesNotMatch(html, /fonts\.googleapis|cdn\.|unpkg|jsdelivr/);
});

test('i18n: mismas claves y misma forma en español e inglés', () => {
  const forma = (o, p = '') => Object.entries(o).flatMap(([k, v]) => Array.isArray(v) ? [`${p}${k}[${v.length}]`] : v && typeof v === 'object' ? forma(v, `${p}${k}.`) : [`${p}${k}`]).sort();
  assert.deepEqual(forma(I18N.en), forma(I18N.es));
});

test('una sola versión: package.json, CHANGELOG y README', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(html.includes(`'${VERSION}'`), 'versión en el HTML');
  assert.match(readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8'), new RegExp(`## \\[${VERSION.replace(/\./g, '\\.')}\\]`));
  assert.ok(readFileSync(join(ROOT, 'README.md'), 'utf8').includes(VERSION), 'README sin la versión');
});

test('el README enlaza ficheros que existen y sus cifras cuadran con el código', () => {
  const md = readFileSync(join(ROOT, 'README.md'), 'utf8');
  for (const m of md.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)/g)) assert.ok(existsSync(join(ROOT, m[1])), `enlace roto ${m[1]}`);
  for (const [k, v] of Object.entries(BJ.PESOS)) assert.ok(md.includes(`| ${v} |`), `peso ${k} en el README`);
  assert.ok(md.includes(`${BJ.UMBRAL_APTO}`), 'umbral en el README');
});

test('autoría y licencia', () => {
  assert.match(readFileSync(join(ROOT, 'LICENSE'), 'utf8'), /Yoandy Ramírez Delgado/);
  assert.match(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).author, /Yoandy Ramírez Delgado/);
});

test('GitHub Pages: index.html es la aplicación (en main y en dist/) y bluejr.html redirige a ella', () => {
  const app = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.match(app, /<script id="datos-empresa"|const BJ = /, 'la raíz es la aplicación, no una redirección');
  assert.doesNotMatch(app, /http-equiv="refresh"/);
  assert.ok(existsSync(join(ROOT, '.nojekyll')), 'sin Jekyll: se sirve tal cual');
  for (const f of ['bluejr.html', 'dist/bluejr.html']) {
    const r = readFileSync(join(ROOT, f), 'utf8');
    assert.match(r, /http-equiv="refresh" content="0; url=index\.html"/, f);
    assert.match(r, /<a href="index\.html">/, f);
    assert.match(r, /rel="canonical" href="https:\/\/heindall92\.github\.io\/Blue-Jr\/"/, f);
    const style = r.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.ok(r.includes(`'sha256-${createHash('sha256').update(style, 'utf8').digest('base64')}'`), `${f}: CSP con el hash del estilo`);
  }
});
