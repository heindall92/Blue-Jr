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
  const c = INDICE['T1-01'], m = INDICE['T1-05'], d = INDICE['T1-02'];
  return { perfil: { nombre: 'Ana Prueba' }, respuestas: { 'T1-01': { ...respuestaPerfecta(c), cerrado: true, evidencias: [5] }, 'T1-05': { veredicto: 'vp', accion: 'contener', campos: {}, ticket: '', cerrado: true }, 'T1-02': { ...respuestaPerfecta(d), cerrado: true } }, relevos: {} };
})();

for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
  for (const tema of ['dark', 'light']) {
    test(`axe · ${ancho} px · ${tema}`, async () => {
      const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema, locale: 'es-ES', bypassCSP: true }); // solo para inyectar axe
      const p = await ctx.newPage();
      await p.addInitScript((s) => { localStorage.setItem('bluejr-v1', JSON.stringify(s)); }, ESTADO);
      for (const h of ['turnos', 'T1', 'historial', 'revision', 'rapido']) {
        await p.goto(`${URL_APP}?test#${h}`); await p.waitForSelector('.vista');
        if (await p.getAttribute('html', 'data-theme') !== tema) await p.click('[data-tema]'); // la carga empieza en claro
        await auditar(p, `${h} ${ancho} ${tema}`);
      }
      // Resultado de un ticket fallado (colores de error) y panel del ticket en móvil.
      await p.goto(`${URL_APP}?test#T1`); await p.waitForSelector('.vista');
      if (await p.getAttribute('html', 'data-theme') !== tema) await p.click('[data-tema]');
      if (ancho < 900) await p.click('[data-panel="cola"]');
      await p.click('.cola [data-caso="T1-05"]');
      if (ancho < 900) await p.click('[data-panel="ticket"]');
      await auditar(p, `resultado ${ancho} ${tema}`);
      if (ancho < 900) await p.click('[data-panel="caso"]');
      await p.fill('#filtro', 'vpn'); await auditar(p, `filtro ${ancho} ${tema}`);
      // Comunícalo (con la lista corregida) y Pregunta al N2 con respuestas.
      await p.goto(`${URL_APP}?test#T1`); await p.waitForSelector('.vista');
      if (await p.getAttribute('html', 'data-theme') !== tema) await p.click('[data-tema]');
      if (ancho < 900) await p.click('[data-panel="cola"]');
      await p.click('.cola [data-caso="T1-01"]');
      if (ancho < 900) await p.click('[data-panel="ticket"]');
      await p.fill('#msg-texto', 'Login raro de r.ibanez'); await p.click('[data-msg-revisar]');
      await auditar(p, `comunícalo ${ancho} ${tema}`);
      // Defiende tu ticket con la lista corregida (criterios cumplidos y sin cumplir).
      await p.click('[data-def-p="accion"]'); await p.fill('#def-texto', 'Contuve porque r.ibanez tenía sesión.'); await p.click('[data-def-revisar]');
      await auditar(p, `defiende tu ticket ${ancho} ${tema}`);
      if (ancho < 900) await p.click('[data-panel="cola"]');
      await p.click('.cola [data-caso="T1-03"]');
      if (ancho < 900) await p.click('[data-panel="ticket"]');
      await p.click('[data-n2="inicio"]'); await p.click('[data-n2="decision"]');
      await auditar(p, `pregunta al N2 ${ancho} ${tema}`);
      // Revisión de IA: rechazo con motivo y acción, y resultado.
      await p.goto(`${URL_APP}?test#revision`); await p.waitForSelector('.vista');
      if (await p.getAttribute('html', 'data-theme') !== tema) await p.click('[data-tema]');
      if (ancho < 900) await p.click('[data-panel="ticket"]');
      await p.click('[data-dictamen="rechazar"]');
      await auditar(p, `revisión abierta ${ancho} ${tema}`);
      await p.click('[data-motivo="omision"]'); await p.click('[data-raccion="cerrar"]'); await p.click('[data-enviar-rev]');
      await auditar(p, `revisión corregida ${ancho} ${tema}`);
      // Triaje rápido: respuesta y aviso.
      await p.goto(`${URL_APP}?test#rapido`); await p.waitForSelector('.rap-ops');
      await p.click('[data-rapido="escalar"]');
      await auditar(p, `triaje rápido ${ancho} ${tema}`);
      // Diálogos.
      await p.goto(`${URL_APP}?test#T1`); await p.waitForSelector('.vista');
      await p.click('[data-ayuda] >> nth=0');
      for (const tab of ['guia', 'decidir', 'metodo', 'datos', 'atajos', 'glosario', 'acerca']) {
        await p.click(`[data-tab="${tab}"]`);
        await auditar(p, `ayuda/${tab} ${ancho} ${tema}`, '#dlg-ayuda');
      }
      await p.keyboard.press('Escape');
      await p.keyboard.press('Control+k'); await p.keyboard.type('dns');
      await auditar(p, `búsqueda ${ancho} ${tema}`, '#dlg-buscar');
      await p.keyboard.press('Escape'); // el primer Escape vacía el campo de búsqueda
      await p.keyboard.press('Escape');
      // Perfil y color de acento: en escritorio desde la cuenta de la barra lateral; en el móvil, desde «Ajustes».
      await p.click(ancho > 900 ? '.cuenta-b' : '#abajo [data-perfil]'); await auditar(p, `perfil y acento ${ancho} ${tema}`, '#dlg-perfil');
      await ctx.close();
    });
  }
}
