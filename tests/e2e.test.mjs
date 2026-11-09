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
  // El foco llega a la pestaña en el siguiente fotograma: sin esperar, la flecha puede caer fuera.
  await p.waitForFunction(() => document.activeElement?.getAttribute('role') === 'tab');
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.getAttribute('[role=tab][aria-selected=true]', 'data-tab'), 'decidir');
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
  const restos = /\b(Turno|Turnos|Alerta|Historial|Cerrar|Buscar|Veredicto|Acción|Ayuda|Registros|Guardar|Empezar|Superado|Pendiente|Verdadero|Benigno|Escalar|Contener|Competencias|Exportar|Importar|Borrar|Glosario|Atajos|Revisión|Aprobar|Rechazar|Triaje|Racha|Insignias|Tareas)\b/;
  const visible = () => p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('.logs, .evidencias code, script, dialog:not([open])').forEach((n) => n.remove()); return c.innerText; });
  for (const h of ['turnos', 'T2', 'historial', 'revision', 'rapido']) {
    await ir(p, h);
    const t = await visible();
    assert.doesNotMatch(t, restos, `${h}: ${t.match(restos)?.[0]}`);
  }
  await ir(p, 'T2');
  await p.click('[data-veredicto="fp"]'); await p.click('[data-accion="cerrar"]'); await p.click('[data-cerrar-ticket]');
  assert.doesNotMatch(await visible(), restos);
  await p.click('[data-ayuda]');
  for (const tab of ['guia', 'decidir', 'metodo', 'datos', 'atajos', 'glosario', 'acerca']) {
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
  // Sistema en oscuro y oscuro guardado de una visita anterior: la carga empieza igualmente en claro.
  // Las preferencias se siembran una sola vez y se recarga: sembrarlas en cada carga (con sessionStorage
  // como marca) fallaba a veces, porque en file:// sessionStorage no siempre sobrevive a la recarga.
  const p = await pagina({ reducedMotion: 'reduce' });
  await ir(p, 'turnos');
  await p.evaluate(() => localStorage.setItem('bluejr-prefs', JSON.stringify({ lang: 'es', theme: 'dark', accent: 'azul', lateral: true })));
  await p.reload(); await p.waitForSelector('.portada');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bluejr-prefs') || '{}').theme), 'dark', 'la preferencia oscura estaba guardada');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light', 'empieza en claro');
  assert.equal(await p.getAttribute('[data-tema]', 'aria-checked'), 'false');
  await p.click('[data-tema]');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'dark', 'el interruptor pasa a oscuro');
  await p.evaluate(() => { location.hash = '#historial'; }); await p.waitForSelector('.vista');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'dark', 'navegar dentro de la aplicación conserva la elección');
  await p.evaluate(() => { location.hash = '#turnos'; }); await p.waitForSelector('.portada');
  await p.click('[data-accent-pick="verde"]');
  assert.equal(await p.getAttribute('html', 'data-accent'), 'verde');
  await p.reload(); await p.waitForSelector('.vista');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light', 'al recargar vuelve a claro');
  assert.equal(await p.getAttribute('html', 'data-accent'), 'verde', 'el acento se conserva');
  const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.turno-card')).animationDuration);
  assert.ok(parseFloat(dur) < 0.01, dur);
  await p.context().close();
});

test('movimiento: la entrada termina antes de 450 ms y solo al cambiar de vista', async () => {
  const p = await pagina();
  await ir(p, 'turnos');
  const fin = () => p.evaluate(() => Math.max(0, ...document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity && a.effect?.target?.closest?.('#main') && !a.effect.target.closest('.flujo')).map((a) => a.effect.getComputedTiming().endTime)));
  await p.click('.lat-nav a[href="#historial"]');
  // Mide cuando el historial ya ha sustituido a la portada (en una máquina lenta la ruta tarda más).
  await p.waitForFunction(() => UI.vistaAnimada === 'historial');
  const t = await fin();
  assert.ok(t > 0 && t <= 450, `termina a los ${t} ms`);
  assert.equal(await p.evaluate(() => MOV.ENTRADA_MAX_MS <= 450), true);
  // Repintar sin cambiar de vista (p. ej. cambiar el idioma) no vuelve a animar la entrada.
  await p.waitForTimeout(500);
  await p.click('[data-lang="en"]');
  assert.equal(await fin(), 0);
  await p.context().close();
});

test('lateral plegable: botón y tecla [, persistente y desplegable al pasar el ratón', async () => {
  const p = await pagina();
  await ir(p, 'T2');
  const ancho = () => p.evaluate(() => document.querySelector('#lateral').getBoundingClientRect().width);
  const lleno = await ancho();
  await p.keyboard.press('[');
  await p.mouse.move(900, 600);
  await p.waitForTimeout(450);
  assert.ok(await ancho() < 100, 'en carril');
  assert.equal(await p.getAttribute('[data-alternar-lateral]', 'aria-expanded'), 'false');
  await p.reload(); await p.waitForSelector('.vista');
  await p.mouse.move(900, 600);
  await p.waitForTimeout(450);
  assert.ok(await ancho() < 100, 'sigue en carril tras recargar');
  // Los enlaces conservan su nombre accesible en carril.
  assert.match(await p.getAttribute('.lat-nav a[href="#T2"]', 'title'), /Martes/);
  await p.mouse.move(40, 300); await p.waitForTimeout(450);
  assert.ok(await ancho() > 200, 'se despliega al pasar el ratón');
  await p.mouse.move(900, 600); await p.waitForTimeout(450);
  await p.click('[data-alternar-lateral]'); await p.mouse.move(900, 600); await p.waitForTimeout(450);
  assert.ok(Math.abs(await ancho() - lleno) < 2, 'vuelve a completo');
  await p.context().close();
});

test('portada: sin consola, cifras contadas y estático con movimiento reducido', async () => {
  const p = await pagina();
  const c = INDICE['T1-02'];
  await p.addInitScript(([id, r]) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ respuestas: { [id]: { ...r, cerrado: true, cuando: new Date().toISOString() } } })); }, [c.id, respuestaPerfecta(c)]);
  await ir(p, 'turnos');
  assert.equal(await p.locator('.flujo, .en-directo').count(), 0, 'la portada no muestra la consola de demostración');
  assert.equal(await p.locator('.stats > .stat').count(), 4, 'las cuatro tarjetas ocupan la fila');
  const caja = (s) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, s);
  assert.deepEqual(await caja('[data-tema]'), await caja('.idioma'), 'el interruptor de tema mide lo mismo que el selector de idioma');
  await p.waitForTimeout(1500); // las cifras terminan de contarse
  assert.equal(await p.locator('.stat-v [data-cuenta]').first().textContent(), '1');
  assert.match(await p.textContent('.stat-c.sube'), /1 hoy/);
  assert.match(await p.textContent('.portada .btn'), /turno 1/);
  // Ilustración: la del tema activo, incrustada (data:), decorativa, con el aro del ojo sobre el dibujo
  // y el texto sin pisar la figura en escritorio.
  const arte = () => p.evaluate(() => {
    const f = document.querySelector('.p-fondo'), o = document.querySelector('.p-ojo').getBoundingClientRect(), r = f.getBoundingClientRect();
    const t = document.querySelector('.p-txt').getBoundingClientRect();
    return { img: getComputedStyle(f).backgroundImage.slice(0, 27), ox: (o.x + o.width / 2 - r.x) / r.width, oy: (o.y + o.height / 2 - r.y) / r.height, hueco: r.x + r.width * 0.5 - t.right };
  });
  const oscuro = await arte();
  assert.equal(oscuro.img, 'url("data:image/webp;base64');
  assert.ok(Math.abs(oscuro.ox - 0.584) < 0.01 && Math.abs(oscuro.oy - 0.244) < 0.01, `ojo sobre el aro: ${JSON.stringify(oscuro)}`);
  assert.ok(oscuro.hueco > 0, `el texto no pisa la figura: ${oscuro.hueco}`);
  assert.equal(await p.getAttribute('.p-arte', 'aria-hidden'), 'true');
  const fondoOscuro = await p.evaluate(() => getComputedStyle(document.querySelector('.p-fondo')).backgroundImage);
  await p.click('[data-tema]');
  const fondoClaro = await p.evaluate(() => getComputedStyle(document.querySelector('.p-fondo')).backgroundImage);
  assert.notEqual(fondoClaro, fondoOscuro, 'cada tema tiene su ilustración');
  assert.match(await p.textContent('#reloj'), /\d\d:\d\d|14:30/);
  await p.context().close();
  const q = await pagina({ reducedMotion: 'reduce' });
  await ir(q, 'turnos');
  await q.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const vis = await q.evaluate(() => ['.p-fondo', '.p-ojo'].map((s) => getComputedStyle(document.querySelector(s)).opacity));
  assert.deepEqual(vis, ['1', '1'], 'con movimiento reducido la ilustración aparece entera sin esperas');
  await q.context().close();
});

test('entrenador: guía por pestañas, pivote por entidad y tareas que se marcan solas', async () => {
  const p = await pagina();
  await ir(p, 'T1');
  // Guía abierta mientras se aprende, con triaje, análisis y respuesta; la respuesta enseña todas las salidas.
  assert.equal(await p.getAttribute('#guia', 'open'), '');
  assert.match(await p.textContent('#guia summary'), /Identidad y accesos/);
  await p.click('[data-guia-tab="respuesta"]');
  assert.equal(await p.getAttribute('[data-guia-tab="respuesta"]', 'aria-pressed'), 'true');
  const acciones = await p.$$eval('.g-resp .acc', (xs) => xs.map((x) => x.textContent));
  assert.ok(acciones.includes('Contener y escalar') && acciones.includes('Cerrar'), acciones.join(', '));
  assert.ok(await p.evaluate(() => document.activeElement?.dataset.guiaTab === 'respuesta'), 'el foco sigue en la pestaña');
  // Pivotar: pulsar una IP filtra los registros por ella; volver a pulsarla quita el filtro.
  const total = await p.locator('#logs .linea').count();
  assert.equal(await p.locator('.tareas li.hecha').count(), 0);
  await p.click('[data-pivote="203.0.113.45"]');
  assert.equal(await p.inputValue('#filtro'), '203.0.113.45');
  const filtradas = await p.locator('#logs .linea').count();
  assert.ok(filtradas > 0 && filtradas < total, `${filtradas} de ${total}`);
  assert.equal(await p.locator('#logs .linea', { hasNotText: '203.0.113.45' }).count(), 0);
  assert.equal(await p.locator('.tareas li.hecha').count(), 1, 'investigar queda hecha');
  await p.click('[data-pivote="203.0.113.45"]');
  assert.equal(await p.locator('#logs .linea').count(), total);
  // Tareas: evidencia, veredicto, acción, datos y resumen.
  await p.click('#logs .linea >> nth=0');
  await p.click('[data-veredicto="vp"]');
  await p.click('[data-accion="contener"]');
  await p.fill('[data-campo="ip"]', '203.0.113.45');
  await p.fill('[data-campo="usuario"]', 'r.ibanez');
  await p.fill('[data-campo="mitre"]', 'T1110.001');
  assert.match(await p.textContent('.tareas .etq'), /5 de 6/);
  await p.fill('#texto-ticket', 'Fuerza bruta desde 203.0.113.45 que acaba en login OK de r.ibanez y acceso por SMB al servidor de ficheros.');
  assert.match(await p.textContent('.tareas .etq'), /6 de 6/);
  // Al cerrar, aviso de XP y la portada lo refleja (meta, racha, nivel).
  await p.click('[data-cerrar-ticket]');
  await p.waitForSelector('#resultado');
  assert.match(await p.textContent('#toasts'), /\+100 XP/);
  await p.click('a[href="#turnos"]');
  await p.waitForSelector('.practica');
  assert.match(await p.textContent('.pr-hoy'), /100 de 150 XP/);
  assert.match(await p.textContent('.pr-racha'), /1 día/);
  assert.match(await p.textContent('.pr-reto'), /T1-02/, 'la siguiente alerta es la primera pendiente');
  assert.match(await p.textContent('.cuenta-b small'), /100 XP/);
  await p.context().close();
});

test('entrenador: el árbol «¿escalo o no?» llega a las cinco salidas y se reinicia', async () => {
  const p = await pagina();
  await ir(p, 'T1');
  await p.click('.decidir-b');
  await p.waitForSelector('#dlg-ayuda[open] .d-preg');
  assert.equal(await p.getAttribute('[role=tab][aria-selected=true]', 'data-tab'), 'decidir');
  const salidas = { 'si,si,si': 'Contener y escalar', 'si,si,no': 'Escalar a N2', 'si,no': 'Cerrar', 'no,si': 'Benigno', 'no,no': 'Falso positivo' };
  for (const [ruta, esperado] of Object.entries(salidas)) {
    for (const r of ruta.split(',')) await p.click(`#panel-ayuda .d-preg [data-decidir="${r}"]`);
    assert.match(await p.textContent('.d-res'), new RegExp(esperado), ruta);
    assert.equal(await p.locator('.d-camino li').count(), ruta.split(',').length);
    await p.click('.d-res [data-decidir="reset"]');
    assert.equal(await p.locator('.d-camino li').count(), 0);
  }
  // Con el contenido largo, solo se desplaza el cuerpo: las pestañas no encogen.
  for (const r of ['si', 'si', 'no']) await p.click(`#panel-ayuda .d-preg [data-decidir="${r}"]`);
  const alto = await p.evaluate(() => document.querySelector('#dlg-ayuda [role=tab]').getBoundingClientRect().height);
  assert.ok(alto >= 40, `pestañas a ${alto} px`);
  await p.context().close();
});

test('historial: insignias ganadas y pendientes', async () => {
  const p = await pagina();
  const c = INDICE['T1-01'];
  await p.addInitScript(([id, r]) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ respuestas: { [id]: { ...r, cerrado: true, cuando: new Date().toISOString() } } })); }, [c.id, respuestaPerfecta(c)]);
  await ir(p, 'historial');
  assert.equal(await p.locator('.insignias li').count(), 10);
  assert.equal(await p.locator('.insignias li.ok').count(), 2, 'primer ticket y ticket perfecto');
  assert.match(await p.textContent('.insignias-p .pildora'), /2 de 10/);
  await p.context().close();
});

test('revisión de IA: aprobar un acierto, cazar un error y la nota no se puede falsificar', async () => {
  const p = await pagina();
  await ir(p, 'revision');
  assert.equal(await p.locator('.cola [data-rev]').count(), 10);
  assert.match(await p.textContent('.pag-cab .pildora'), /0 de 10/);
  // R-01: el agente acierta; aprobar da 100.
  await p.click('.cola [data-rev="R-01"]');
  assert.equal(await p.locator('[data-motivo]').count(), 0, 'sin motivo hasta rechazar');
  await p.click('[data-dictamen="aprobar"]');
  await p.click('[data-enviar-rev]');
  assert.match(await p.textContent('#resultado .nota-grande'), /^100/);
  assert.match(await p.textContent('#toasts'), /\+100 XP · revisión R-01/);
  // R-04: el agente se inventa la evidencia. Rechazar con el motivo y la acción correctos.
  await p.click('.cola [data-rev="R-04"]');
  await p.click('[data-dictamen="rechazar"]');
  assert.equal(await p.locator('[data-motivo]').count(), 5);
  assert.ok(await p.isDisabled('[data-enviar-rev]'), 'falta el motivo y la acción');
  await p.click('[data-motivo="alucinacion"]');
  await p.focus('[data-raccion="cerrar"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  assert.equal(await p.getAttribute('[data-raccion="contener"]', 'aria-checked'), 'true', 'las flechas eligen la acción');
  await p.click('[data-enviar-rev]');
  assert.match(await p.textContent('#resultado'), /Se inventó evidencia/);
  assert.match(await p.textContent('#resultado .nota-grande'), /^100/);
  assert.match(await p.textContent('#toasts'), /Error del agente cazado/);
  // R-07: aprobar un veredicto equivocado puntúa 0 y lo explica.
  await p.click('.cola [data-rev="R-07"]');
  await p.click('[data-dictamen="aprobar"]'); await p.click('[data-enviar-rev]');
  assert.match(await p.textContent('#resultado .nota-grande'), /^0/);
  assert.match(await p.textContent('.pag-cab .pildora'), /3 de 10/);
  // Una copia importada no puede traer una revisión con nota inventada: se recalcula.
  const notas = await p.evaluate(() => { const S = window.__BJ__.S(); return [S.revisiones['R-01'].nota, S.revisiones['R-07'].nota]; });
  assert.deepEqual(notas, [100, 0]);
  await p.context().close();
});

test('triaje rápido: bloqueado al principio, diez alertas con teclas 1-2-3 y repaso de lo fallado', async () => {
  const p = await pagina();
  await ir(p, 'rapido');
  assert.equal(await p.locator('.vacio-grande').count(), 1, 'bloqueado sin tickets cerrados');
  await p.context().close();
  const q = await pagina();
  const ids = ['T1-01', 'T1-02', 'T1-03', 'T1-04', 'T1-05', 'T1-06', 'T1-07', 'T1-08', 'T2-01', 'T2-02', 'T2-03'];
  const resp = Object.fromEntries(ids.map((id) => [id, { ...respuestaPerfecta(INDICE[id]), cerrado: true, cuando: new Date(Date.now() - 86400000).toISOString() }]));
  await q.addInitScript((r) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ respuestas: r })); }, resp);
  await ir(q, 'rapido');
  assert.match(await q.textContent('.rap-cab'), /1 de 10/);
  let fallos = 0;
  for (let i = 0; i < 10; i++) {
    const id = await q.textContent('.rapido .alerta .id');
    // Acierta todas menos la primera, con el teclado.
    const bien = INDICE[id].accion;
    const elegida = i === 0 ? ['cerrar', 'escalar', 'contener'].find((a) => a !== bien) : bien;
    if (i === 0) fallos++;
    await q.keyboard.press(String(['cerrar', 'escalar', 'contener'].indexOf(elegida) + 1));
    assert.match(await q.textContent('.rap-fb'), i === 0 ? /Tocaba/ : /Correcto/);
    await q.keyboard.press('Enter');
  }
  assert.match(await q.textContent('.rap-fin'), /9 de 10 aciertos/);
  assert.match(await q.textContent('.rap-fin'), /\+45 XP/);
  assert.match(await q.textContent('.rap-fin'), /1 alertas volverán mañana|volverán mañana/);
  const S = await q.evaluate(() => window.__BJ__.S());
  const hoy = new Date().toISOString().slice(0, 10);
  assert.deepEqual(S.rapido[hoy], { aciertos: 9, total: 10, ms: S.rapido[hoy].ms });
  assert.equal(Object.values(S.repaso).filter((e) => e.caja === 0).length, fallos, 'lo fallado vuelve mañana');
  // Otra ronda: no vuelve a sumar XP del día.
  await q.click('[data-rapido-otra]');
  for (let i = 0; i < 10; i++) { await q.keyboard.press('1'); await q.keyboard.press('Enter'); }
  assert.match(await q.textContent('.rap-fin'), /Ronda de repaso/);
  assert.equal((await q.evaluate(() => window.__BJ__.S())).rapido[hoy].aciertos, 9);
  // La portada lo refleja.
  await q.click('a[href="#turnos"]');
  await q.waitForSelector('.modos');
  assert.match(await q.textContent('.modo-rap'), /Hecho hoy: 9 de 10/);
  await q.context().close();
});

test('Pregunta al N2: tres por turno, cuestan XP y la respuesta se queda como estaba al preguntar', async () => {
  const p = await pagina();
  await ir(p, 'T1');
  assert.match(await p.textContent('.n2 .nota'), /Te quedan 3 preguntas/);
  await p.click('[data-veredicto="fp"]');
  await p.click('[data-n2="decision"]');
  assert.match(await p.textContent('.n2-hilo'), /no marcaría ese veredicto/);
  await p.click('[data-veredicto="vp"]');
  assert.match(await p.textContent('.n2-hilo'), /no marcaría ese veredicto/, 'cambiar el veredicto no vuelve a preguntar gratis');
  assert.equal(await p.locator('[data-n2="decision"]').count(), 0);
  await p.click('[data-n2="inicio"]');
  assert.match(await p.textContent('.n2-hilo'), /vpn01 a las 08:0/);
  assert.match(await p.textContent('.n2 .nota'), /Te queda 1 pregunta/);
  // La tercera, en otra alerta del mismo turno; después no quedan.
  await p.click('.cola [data-caso="T1-02"]');
  await p.click('[data-n2="falta"]');
  assert.match(await p.textContent('.n2 .nota'), /Te quedan 0/);
  assert.ok(await p.isDisabled('[data-n2="inicio"]'));
  // Cerrar T1-01 con todo bien: 100 de nota, 80 de XP por las dos preguntas.
  await p.click('.cola [data-caso="T1-01"]');
  const r = respuestaPerfecta(INDICE['T1-01']);
  await p.click('[data-accion="contener"]');
  for (const [k, v] of Object.entries(r.campos)) await p.fill(`[data-campo="${k}"]`, v);
  await p.fill('#texto-ticket', r.ticket);
  await p.click('[data-cerrar-ticket]');
  await p.waitForSelector('#resultado');
  assert.match(await p.textContent('#resultado .nota-grande'), /^100/);
  assert.match(await p.textContent('#toasts'), /\+80 XP · ticket T1-01 cerrado con 100\/100/);
  await p.context().close();
});

test('Comunícalo: el mensaje a N2 y el aviso a dirección se corrigen, suman XP y van al historial', async () => {
  const p = await pagina();
  const c = INDICE['T1-01'], f = INDICE['T1-05'];
  await p.addInitScript(([a, b]) => { if (!localStorage.getItem('bluejr-v1')) localStorage.setItem('bluejr-v1', JSON.stringify({ respuestas: { 'T1-01': { ...a, cerrado: true, cuando: new Date().toISOString() }, 'T1-05': { ...b, cerrado: true, cuando: new Date().toISOString() } } })); }, [respuestaPerfecta(c), respuestaPerfecta(f)]);
  await ir(p, 'T1');
  await p.click('.cola [data-caso="T1-05"]');
  assert.equal(await p.locator('.comunica').count(), 0, 'un falso positivo cerrado no se escala ni se comunica');
  await p.click('.cola [data-caso="T1-01"]');
  await p.fill('#msg-texto', 'Login raro de r.ibanez, mirad');
  await p.click('[data-msg-revisar]');
  assert.ok(await p.locator('.msg-crit li.ko').count() >= 3);
  await p.fill('#msg-texto', 'Prioridad alta. A las 08:05 fuerza bruta contra la VPN desde 203.0.113.45 que termina en login OK de r.ibanez. He deshabilitado la cuenta y bloqueado la IP; lo escalo para revisar el alcance.');
  await p.click('[data-msg-revisar]');
  assert.equal(await p.locator('.msg-crit li.ko').count(), 0);
  assert.match(await p.textContent('#toasts'), /\+10 XP · Escalado a N2 completo/);
  await p.click('[data-msg-tipo="dir"]');
  await p.click('.com-ej summary');
  assert.doesNotMatch(await p.textContent('.com-ej p'), /\d+\.\d+\.\d+\.\d+/, 'el ejemplo para dirección no lleva IP');
  await p.fill('#msg-texto', await p.textContent('.com-ej p'));
  await p.click('[data-msg-revisar]');
  assert.equal(await p.locator('.msg-crit li.ko').count(), 0);
  assert.equal(await p.locator('[data-msg-tipo] .ic.ok').count(), 2);
  await ir(p, 'historial');
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('[data-exportar-md]')]);
  const md = readFileSync(await descarga.path(), 'utf8');
  assert.match(md, /Escalado a N2\*\*\n\n> Prioridad alta/);
  assert.match(md, /Aviso a dirección/);
  await p.context().close();
});
