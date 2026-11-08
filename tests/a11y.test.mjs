/* Accesibilidad con axe-core (WCAG 2.2 AA): vistas, estados y diálogos, en claro y oscuro, 1440 y 390 px. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { lanzar, URL_APP, INDICE, respuestaPerfecta } from './_util.mjs';

const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
let navegador;
before(async () => { navegador = await lanzar(); });
after(async () => { await navegador?.close(); });

async function auditar(p, donde, contexto = 'document') {
  // Espera a que terminen las animaciones de entrada: axe mide colores a mitad de un fundido.
  await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await p.addScriptTag({ path: AXE });
  const v = await p.evaluate(async ([ctx, reglas]) => {
    const r = await window.axe.run(ctx === 'document' ? document : document.querySelector(ctx), { runOnly: reglas });
    return r.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }, [contexto, REGLAS]);
  assert.deepEqual(v, [], `${donde}\n${v.join('\n')}`);
}

const ESTADO = (() => {
  const c = INDICE['T1-01'], m = INDICE['T1-05'];
  return { perfil: { nombre: 'Ana Prueba' }, respuestas: { 'T1-01': { ...respuestaPerfecta(c), cerrado: true, evidencias: [5] }, 'T1-05': { veredicto: 'vp', accion: 'contener', campos: {}, ticket: '', cerrado: true } }, relevos: {} };
})();

for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
  for (const tema of ['dark', 'light']) {
    test(`axe · ${ancho} px · ${tema}`, async () => {
      const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema, locale: 'es-ES', bypassCSP: true }); // solo para inyectar axe
      const p = await ctx.newPage();
      await p.addInitScript((s) => { localStorage.setItem('bluejr-v1', JSON.stringify(s)); }, ESTADO);
      for (const h of ['turnos', 'T1', 'historial']) {
        await p.goto(`${URL_APP}?test#${h}`); await p.waitForSelector('.vista');
        await auditar(p, `${h} ${ancho} ${tema}`);
      }
      // Resultado de un ticket fallado (colores de error) y panel del ticket en móvil.
      await p.goto(`${URL_APP}?test#T1`); await p.waitForSelector('.vista');
      if (ancho < 900) await p.click('[data-panel="cola"]');
      await p.click('.cola [data-caso="T1-05"]');
      if (ancho < 900) await p.click('[data-panel="ticket"]');
      await auditar(p, `resultado ${ancho} ${tema}`);
      if (ancho < 900) await p.click('[data-panel="caso"]');
      await p.fill('#filtro', 'vpn'); await auditar(p, `filtro ${ancho} ${tema}`);
      // Diálogos.
      await p.click('[data-ayuda] >> nth=0');
      for (const tab of ['guia', 'metodo', 'datos', 'atajos', 'glosario', 'acerca']) {
        await p.click(`[data-tab="${tab}"]`);
        await auditar(p, `ayuda/${tab} ${ancho} ${tema}`, '#dlg-ayuda');
      }
      await p.keyboard.press('Escape');
      await p.keyboard.press('Control+k'); await p.keyboard.type('dns');
      await auditar(p, `búsqueda ${ancho} ${tema}`, '#dlg-buscar');
      await p.keyboard.press('Escape'); // el primer Escape vacía el campo de búsqueda
      await p.keyboard.press('Escape');
      if (ancho > 900) { await p.click('[data-perfil]'); await auditar(p, `perfil ${ancho} ${tema}`, '#dlg-perfil'); }
      await ctx.close();
    });
  }
}
