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

// Estado de ejemplo: tres alertas del lunes cerradas, una de ellas mal, y la cuarta a medio rellenar.
const ESTADO = {
  perfil: { nombre: 'Ana Prueba' },
  respuestas: {
    'T1-01': { veredicto: 'vp', accion: 'contener', campos: { ip: '203.0.113.45', usuario: 'r.ibanez', mitre: 'T1110.001' }, ticket: 'Fuerza bruta contra la VPN desde 203.0.113.45 que termina en login OK de r.ibanez y acceso SMB a SRV-FS01. Cuenta deshabilitada, sesión cortada e IP bloqueada; escalado a N2.', evidencias: [5, 6], cerrado: true },
    'T1-02': { veredicto: 'vp', accion: 'cerrar', campos: { ip: '198.51.100.23', abiertos: '80,443', mitre: 'T1595' }, ticket: 'Escaneo desde 198.51.100.23 contra la IP pública; solo responden 80 y 443 (portal). Ruido de Internet bloqueado por el perímetro. Se cierra.', evidencias: [], cerrado: true },
    'T1-03': { veredicto: 'vp', accion: 'contener', campos: { fichero: 'eicar.com', ticket: '' }, ticket: 'Malware detectado en PC-ALM-014.', evidencias: [], cerrado: true },
    'T1-04': { veredicto: 'vp', accion: null, campos: { cuenta: 'soporte$' }, ticket: '', evidencias: [0, 3] }
  },
  relevos: {}
};

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function captura(nombre, { ancho, alto, tema, hash, caso, panel, completa = false }) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema, locale: 'es-ES', deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript((s) => { localStorage.setItem('bluejr-v1', JSON.stringify(s)); localStorage.setItem('bluejr-prefs', JSON.stringify({ lang: 'es' })); }, ESTADO);
  await p.goto(`${URL_APP}#${hash}`); await p.waitForSelector('.vista');
  if (caso) { if (ancho < 900) await p.click('[data-panel="cola"]'); await p.click(`.cola [data-caso="${caso}"]`); }
  if (panel) await p.click(`[data-panel="${panel}"]`);
  if (nombre.startsWith('resultado')) await p.evaluate(() => { const r = document.querySelector('#resultado'); r.closest('.ticket').scrollTop = r.offsetTop - 80; });
  await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await p.mouse.move(0, 0);
  await p.screenshot({ path: join(OUT, nombre), fullPage: completa });
  await ctx.close();
  console.log(`✓ docs/capturas/${nombre}`);
}
await captura('turno-oscuro.png', { ancho: 1440, alto: 900, tema: 'dark', hash: 'T1', caso: 'T1-04' });
await captura('resultado-oscuro.png', { ancho: 1440, alto: 900, tema: 'dark', hash: 'T1', caso: 'T1-03' });
await captura('inicio-claro.png', { ancho: 1440, alto: 900, tema: 'light', hash: 'turnos' });
await captura('historial-claro.png', { ancho: 1440, alto: 900, tema: 'light', hash: 'historial' });
await captura('movil-alerta.png', { ancho: 390, alto: 844, tema: 'dark', hash: 'T1', caso: 'T1-04' });
await captura('movil-ticket.png', { ancho: 390, alto: 844, tema: 'light', hash: 'T1', caso: 'T1-01', panel: 'ticket' });
await browser.close();
