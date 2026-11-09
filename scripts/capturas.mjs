#!/usr/bin/env node
/* Capturas del README (oscuro, claro y móvil) con un turno a medias, generadas desde dist/index.html.
 * Uso: npm run capturas   (PW_CHROMIUM=/ruta/chrome para usar un Chromium ya instalado) */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './build.mjs';

const URL_APP = 'file://' + join(ROOT, 'dist/index.html');
const OUT = join(ROOT, 'docs/capturas');
mkdirSync(OUT, { recursive: true });

// Estado de ejemplo: tres alertas del lunes cerradas (dos hoy y una ayer, una de ellas mal) y la cuarta a medio rellenar.
const HOY = new Date().toISOString();
const AYER = new Date(Date.now() - 86400000).toISOString();
const ESTADO = {
  perfil: { nombre: 'Ana Prueba' },
  respuestas: {
    'T1-01': { veredicto: 'vp', accion: 'contener', campos: { ip: '203.0.113.45', usuario: 'r.ibanez', mitre: 'T1110.001' }, ticket: 'Fuerza bruta contra la VPN desde 203.0.113.45 que termina en login OK de r.ibanez y acceso SMB a SRV-FS01. Cuenta deshabilitada, sesión cortada e IP bloqueada; escalado a N2.', evidencias: [5, 6], cerrado: true, cuando: AYER },
    'T1-02': { veredicto: 'vp', accion: 'cerrar', campos: { ip: '198.51.100.23', abiertos: '80,443', mitre: 'T1595' }, ticket: 'Escaneo desde 198.51.100.23 contra la IP pública; solo responden 80 y 443 (portal). Ruido de Internet bloqueado por el perímetro. Se cierra.', evidencias: [], cerrado: true, cuando: HOY },
    'T1-03': { veredicto: 'vp', accion: 'contener', campos: { fichero: 'eicar.com', ticket: '' }, ticket: 'Malware detectado en PC-ALM-014.', evidencias: [], cerrado: true, cuando: HOY },
    'T1-04': { veredicto: 'vp', accion: null, campos: { cuenta: 'soporte$' }, ticket: '', evidencias: [0, 3] }
  },
  relevos: {}
};

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function captura(nombre, { ancho = 1440, alto = 900, tema = 'light', hash = 'turnos', caso, panel, lang = 'es', acento = 'azul', compacto = false, estado = ESTADO, antes }) {
  const movil = ancho < 900;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema === 'dark' ? 'dark' : 'light', locale: lang === 'es' ? 'es-ES' : 'en-GB', deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript(([s, pr]) => { localStorage.setItem('bluejr-v1', JSON.stringify(s)); localStorage.setItem('bluejr-prefs', JSON.stringify(pr)); }, [estado, { lang, theme: tema, accent: acento, lateral: !compacto }]);
  await p.goto(`${URL_APP}#${hash}`); await p.waitForSelector('.vista');
  if (tema === 'dark' && (await p.getAttribute('html', 'data-theme')) !== 'dark') await p.click('[data-tema]');
  if (caso) { if (movil) await p.click('[data-panel="cola"]'); await p.click(`.cola [data-caso="${caso}"]`); }
  if (panel) await p.click(`[data-panel="${panel}"]`);
  if (antes) await antes(p);
  if (nombre.startsWith('resultado')) await p.evaluate(() => { const r = document.querySelector('#resultado'); r.closest('.ticket').scrollTop = r.offsetTop - 80; });
  await p.mouse.move(ancho - 5, alto - 5);
  await p.waitForTimeout(hash === 'turnos' ? 2900 : 900); // en la portada, que la consola llegue a una señal
  await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await p.screenshot({ path: join(OUT, nombre) });
  await ctx.close();
  console.log(`✓ docs/capturas/${nombre}`);
}
// La portada del README es la de alguien que llega por primera vez: sin tickets.
await captura('portada-claro.png', { estado: { perfil: {}, respuestas: {}, relevos: {} } });
await captura('portada-oscuro.png', { tema: 'dark' });
await captura('turno-claro.png', { hash: 'T1', caso: 'T1-04' });
await captura('turno-oscuro.png', { tema: 'dark', hash: 'T1', caso: 'T1-04' });
await captura('resultado-oscuro.png', { tema: 'dark', hash: 'T1', caso: 'T1-03' });
await captura('guia-claro.png', { hash: 'T1', caso: 'T1-01', antes: async (p) => { await p.click('#guia summary'); await p.click('[data-guia-tab="respuesta"]'); await p.click('[data-pivote="203.0.113.45"]'); await p.evaluate(() => { const g = document.querySelector('#guia'); scrollTo(0, g.getBoundingClientRect().top + scrollY - 110); }); } });
await captura('guia-oscuro.png', { tema: 'dark', hash: 'T1', caso: 'T1-04', antes: async (p) => { await p.click('#guia summary'); } });
await captura('decidir-claro.png', { hash: 'T1', caso: 'T1-04', antes: async (p) => { await p.click('.decidir-b'); await p.waitForSelector('#dlg-ayuda[open] .d-preg'); for (const r of ['si', 'si', 'no']) await p.click(`#panel-ayuda .d-preg [data-decidir="${r}"]`); } });
await captura('revision-claro.png', { hash: 'revision', antes: async (p) => { await p.click('.cola [data-rev="R-04"]'); await p.click('[data-dictamen="rechazar"]'); await p.click('[data-motivo="alucinacion"]'); await p.click('[data-raccion="contener"]'); await p.evaluate(() => scrollTo(0, 0)); } });
await captura('revision-oscuro.png', { tema: 'dark', hash: 'revision', antes: async (p) => { await p.click('.cola [data-rev="R-07"]'); await p.click('[data-dictamen="aprobar"]'); await p.click('[data-enviar-rev]'); await p.evaluate(() => scrollTo(0, 0)); } });
await captura('rapido-oscuro.png', { tema: 'dark', hash: 'rapido', antes: async (p) => { await p.keyboard.press('3'); } });
await captura('historial-claro.png', { hash: 'historial' });
await captura('historial-oscuro.png', { tema: 'dark', hash: 'historial' });
await captura('ingles-claro.png', { lang: 'en' });
await captura('lateral-compacto-oscuro.png', { tema: 'dark', hash: 'T1', caso: 'T1-01', compacto: true });
await captura('acento-verde.png', { acento: 'verde', hash: 'historial' });
await captura('acento-orquidea.png', { tema: 'dark', acento: 'orquidea', hash: 'historial' });
await captura('acento-solar.png', { acento: 'solar', hash: 'historial' });
await captura('movil-claro.png', { ancho: 390, alto: 844 });
await captura('movil-oscuro.png', { ancho: 390, alto: 844, tema: 'dark', hash: 'T1', caso: 'T1-04' });
await captura('movil-en.png', { ancho: 390, alto: 844, lang: 'en', hash: 'T1', caso: 'T1-01', panel: 'ticket' });
await browser.close();
