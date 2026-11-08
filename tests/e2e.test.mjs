/* Pruebas de extremo a extremo sobre el HTML compilado, con la red bloqueada. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lanzar, URL_APP, BJ, INDICE, respuestaPerfecta } from './_util.mjs';

let navegador;
before(async () => { navegador = await lanzar(); });
after(async () => { await navegador?.close(); });

async function pagina(opc = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'es-ES', acceptDownloads: true, ...opc });
  const p = await ctx.newPage();
  const fallos = [];
  p.on('pageerror', (e) => fallos.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') fallos.push('console: ' + m.text()); });
  await p.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : (fallos.push('red: ' + r.request().url()), r.abort())));
  p.fallos = fallos;
  return p;
}
const ir = async (p, hash) => { await p.goto(`${URL_APP}?test#${hash}`); await p.waitForSelector('.vista'); };
const desborda = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test('carga sin errores ni peticiones externas en todas las vistas', async () => {
  const p = await pagina();
  for (const h of ['turnos', 'T1', 'T3', 'T5', 'historial']) {
    await ir(p, h);
    assert.equal(await p.locator('h1').count(), 1, `${h}: un h1`);
    assert.match(await p.title(), /BlueJr$/);
  }
  assert.deepEqual(p.fallos, []);
  await p.context().close();
});

test('resolver T1-01 desde la interfaz: veredicto, acción, datos, evidencia, ticket y nota 100', async () => {
  const p = await pagina();
  await ir(p, 'T1');
  const c = INDICE['T1-01'];
  const r = respuestaPerfecta(c);
  await p.click('[data-veredicto="vp"]');
  await p.click('[data-accion="contener"]');
  for (const [id, v] of Object.entries(r.campos)) await p.fill(`[data-campo="${id}"]`, v);
  // Filtra los registros y fija como evidencia el «login OK» del atacante.
  await p.fill('#filtro', 'login OK user=r.ibanez');
  assert.equal(await p.locator('.linea').count(), 1);
  await p.click('.linea');
  assert.equal(await p.locator('.evidencias li').count(), 1);
  await p.fill('#texto-ticket', r.ticket);
  await p.click('[data-cerrar-ticket]');
  await p.waitForSelector('#resultado');
  assert.match(await p.textContent('.nota-grande'), /^100/);
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('bluejr-v1')));
  assert.equal(s.respuestas['T1-01'].nota, 100);
  assert.equal(s.respuestas['T1-01'].evidencias.length, 1);
  assert.match(await p.textContent('.lat-nav a[href="#T1"]'), /1\/8/);
  // Tras recargar, el turno abre la primera alerta pendiente; T1-01 sigue cerrada y bloqueada.
  await p.reload(); await p.waitForSelector('.vista');
  assert.equal(await p.getAttribute('.cola-item.activa', 'data-caso'), 'T1-02');
  await p.click('[data-caso="T1-01"]'); await p.waitForSelector('#resultado');
  assert.ok(await p.locator('[data-veredicto="vp"]').isDisabled());
  assert.deepEqual(p.fallos, []);
  await p.context().close();
});

test('una decisión equivocada se explica: nota, lo esperado y la explicación', async () => {
  const p = await pagina();
  await ir(p, 'T1');
  await p.click('[data-caso="T1-05"]');
  await p.click('[data-veredicto="vp"]');
  await p.click('[data-accion="contener"]');
  await p.click('[data-cerrar-ticket]');
  const txt = await p.textContent('#resultado');
  assert.match(txt, /Esperado: Falso positivo/);
  assert.match(txt, /VPN/);
  assert.ok(Number(await p.textContent('.nota-grande').then((t) => t.match(/\d+/)[0])) < BJ.UMBRAL_APTO);
  await p.click('[data-reintentar="T1-05"]');
  assert.equal(await p.locator('[data-cerrar-ticket]').count(), 1);
  await p.context().close();
});

test('teclado: Ctrl K busca y abre una alerta; J/K recorren la cola; / enfoca el filtro', async () => {
  const p = await pagina();
  await ir(p, 'turnos');
  await p.keyboard.press('Control+k');
  await p.waitForSelector('#q');
  // Busca por la regla, no por la técnica: la búsqueda nunca desvela la respuesta.
  await p.keyboard.type('cifrado débil');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#caso-t');
  assert.match(await p.textContent('#caso-t'), /tickets para todos los servicios/);
  assert.match(p.url(), /#T5$/);
  await p.locator('body').click({ position: { x: 5, y: 600 } });
  await p.keyboard.press('j');
  assert.equal(await p.getAttribute('.cola-item.activa', 'data-caso'), 'T5-02');
  await p.keyboard.press('k');
  assert.equal(await p.getAttribute('.cola-item.activa', 'data-caso'), 'T5-01');
  await p.keyboard.press('/');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'filtro');
  // Veredicto con flechas (grupo de radio).
  await p.focus('[data-veredicto]');
  await p.keyboard.press('ArrowDown');
  assert.equal(await p.getAttribute('[role=radio][aria-checked=true][data-veredicto]', 'data-veredicto'), 'fp');
  await p.context().close();
});

test('ayuda: pestañas con flechas y fórmula generada desde las constantes', async () => {
  const p = await pagina();
  await ir(p, 'turnos');
  await p.keyboard.press('?');
  await p.waitForSelector('#dlg-ayuda[open] [role=tab]');
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.getAttribute('[role=tab][aria-selected=true]', 'data-tab'), 'metodo');
  for (const [k, v] of Object.entries(BJ.PESOS)) assert.equal(await p.textContent(`[data-peso="${k}"]`), String(v));
  await p.keyboard.press('End');
  assert.equal(await p.getAttribute('[role=tab][aria-selected=true]', 'data-tab'), 'acerca');
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#dlg-ayuda[open]').count(), 0);
  await p.context().close();
});

test('inglés completo: ninguna vista deja texto de interfaz en español', async () => {
  const p = await pagina({ locale: 'en-GB' });
  await p.addInitScript(() => localStorage.setItem('bluejr-prefs', JSON.stringify({ lang: 'en' })));
  const restos = /\b(Turno|Turnos|Alerta|Historial|Cerrar|Buscar|Veredicto|Acción|Ayuda|Registros|Guardar|Empezar|Superado|Pendiente|Verdadero|Benigno|Escalar|Contener|Competencias|Exportar|Importar|Borrar|Glosario|Atajos)\b/;
  const visible = () => p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('.logs, .evidencias code, script, dialog:not([open])').forEach((n) => n.remove()); return c.innerText; });
  for (const h of ['turnos', 'T2', 'historial']) {
    await ir(p, h);
    const t = await visible();
    assert.doesNotMatch(t, restos, `${h}: ${t.match(restos)?.[0]}`);
  }
  await ir(p, 'T2');
  await p.click('[data-veredicto="fp"]'); await p.click('[data-accion="cerrar"]'); await p.click('[data-cerrar-ticket]');
  assert.doesNotMatch(await visible(), restos);
  await p.click('[data-ayuda]');
  for (const tab of ['guia', 'metodo', 'datos', 'atajos', 'glosario', 'acerca']) {
    await p.click(`[data-tab="${tab}"]`);
    const t = await p.evaluate(() => { const d = document.querySelector('#dlg-ayuda').cloneNode(true); d.querySelectorAll('.inventario dt').forEach((n) => n.remove()); return d.innerText; });
    assert.doesNotMatch(t, restos, `ayuda/${tab}: ${t.match(restos)?.[0]}`);
  }
  await p.context().close();
});

test('historial: exporta Markdown con el ticket y la copia JSON se puede importar', async () => {
  const p = await pagina();
  const c = INDICE['T2-07'];
  await p.addInitScript(([id, r]) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ perfil: { nombre: 'Ana Prueba' }, respuestas: { [id]: { ...r, cerrado: true } }, relevos: { T2: 'Dominio norte-logistica.example bloqueado.' } })); }, [c.id, respuestaPerfecta(c)]);
  await ir(p, 'historial');
  assert.match(await p.textContent('.kpis'), /1\/40/);
  const [md] = await Promise.all([p.waitForEvent('download'), p.click('[data-exportar-md]')]);
  const texto = readFileSync(await md.path(), 'utf8');
  assert.match(texto, /Ana Prueba/);
  assert.match(texto, /### T2-07 .* 100\/100/);
  assert.match(texto, /norte-logistica\.example bloqueado/);
  const [js] = await Promise.all([p.waitForEvent('download'), p.click('[data-exportar-json]')]);
  const copia = readFileSync(await js.path(), 'utf8');
  // Borrar (dos pulsaciones) y volver a importar la copia.
  await p.click('[data-borrar]'); await p.click('[data-borrar]');
  assert.match(await p.textContent('.kpis'), /0\/40/);
  const dir = mkdtempSync(join(tmpdir(), 'bj-'));
  writeFileSync(join(dir, 'copia.json'), copia);
  await p.setInputFiles('#archivo', join(dir, 'copia.json'));
  await p.waitForFunction(() => /1\/40/.test(document.querySelector('.kpis').textContent));
  assert.deepEqual(p.fallos, []);
  await p.context().close();
});

test('importación hostil: JSON roto, prototipo contaminado y HTML no ejecutan nada', async () => {
  const p = await pagina();
  await ir(p, 'historial');
  const dir = mkdtempSync(join(tmpdir(), 'bj-'));
  writeFileSync(join(dir, 'roto.json'), '{"app":"bluejr", roto');
  await p.setInputFiles('#archivo', join(dir, 'roto.json'));
  await p.waitForSelector('.toast');
  const malo = { app: 'bluejr', __proto__: { contaminado: 1 }, perfil: { nombre: '<img src=x onerror="window.__xss=1">' }, respuestas: { 'T1-01': { veredicto: 'vp', accion: 'cerrar', cerrado: true, ticket: '<script>window.__xss=2</script>', campos: { ip: '"><svg onload=window.__xss=3>' } } } };
  writeFileSync(join(dir, 'malo.json'), JSON.stringify(malo).replace('"perfil"', '"__proto__":{"contaminado":1},"perfil"'));
  await p.setInputFiles('#archivo', join(dir, 'malo.json'));
  await p.waitForFunction(() => /1\/40/.test(document.querySelector('.kpis').textContent));
  await ir(p, 'T1');
  await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__xss), undefined);
  assert.equal(await p.evaluate(() => ({}).contaminado), undefined);
  assert.equal(await p.locator('.lateral img, .lateral svg[onload]').count(), 0);
  await p.context().close();
});

test('relevo: al cerrar las ocho alertas aparece el informe de relevo y se guarda', async () => {
  const p = await pagina();
  const turno = ['T3-01', 'T3-02', 'T3-03', 'T3-04', 'T3-05', 'T3-06', 'T3-07', 'T3-08'];
  const resp = Object.fromEntries(turno.map((id) => [id, { ...respuestaPerfecta(INDICE[id]), cerrado: true }]));
  await p.addInitScript((r) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ respuestas: r })); }, resp);
  await ir(p, 'T3');
  assert.match(await p.textContent('.relevo'), /Superado/);
  await p.fill('#relevo', 'PC-FIN-007 y SRV-FS01 aislados; soporte$ deshabilitada.');
  await p.click('[data-guardar-relevo]');
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('bluejr-v1')));
  assert.match(s.relevos.T3, /soporte\$/);
  assert.match(await p.textContent('.lat-nav a[href="#T3"]'), /8\/8/);
  await p.context().close();
});

test('móvil 390 px: sin desbordes, barra inferior y paneles del turno', async () => {
  const p = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const h of ['turnos', 'T4', 'historial']) {
    await ir(p, h);
    assert.ok(await desborda(p) <= 0, `${h} desborda`);
    assert.ok(await p.locator('#abajo').isVisible());
  }
  await ir(p, 'T4');
  assert.ok(await p.locator('.caso').isVisible());
  assert.ok(!(await p.locator('.cola').isVisible()));
  await p.click('[data-panel="ticket"]');
  assert.ok(await p.locator('.ticket').isVisible());
  // Ningún texto visible se sale de la pantalla.
  const fuera = await p.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && e.offsetParent && (r.right > innerWidth + 1 || r.left < -1); }).length);
  assert.equal(fuera, 0);
  await p.context().close();
});

test('tema, acento y movimiento reducido', async () => {
  const p = await pagina({ reducedMotion: 'reduce' });
  await ir(p, 'turnos');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'dark');
  await p.click('[data-tema]');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
  await p.click('[data-accent-pick="verde"]');
  assert.equal(await p.getAttribute('html', 'data-accent'), 'verde');
  await p.reload(); await p.waitForSelector('.vista');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
  const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.turno-card')).animationDuration);
  assert.ok(parseFloat(dur) < 0.01, dur);
  await p.context().close();
});
