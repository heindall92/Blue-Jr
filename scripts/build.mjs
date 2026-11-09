#!/usr/bin/env node
/* Blue-Jr · build
 * Ensambla src/ en un único HTML autocontenido (dist/index.html) que funciona abriéndolo desde el disco
 * o desde GitHub Pages, sin pedir nada a terceros.
 *
 * Directivas de la plantilla (src/index.html), cada una en su propia línea:
 *   <!-- @inline ruta -->          inserta el fichero tal cual
 *   <!-- @data clave1 clave2 … -->  inserta {"clave1": src/data/clave1.json, …} en JSON compacto
 *   <!-- @modules carpeta -->       concatena los .js de la carpeta en orden alfabético
 *   <!-- @fonts -->                 @font-face de Geist y Geist Mono incrustadas (data:)
 *   <!-- @csp -->                   <meta> Content-Security-Policy con los hashes de los bloques en línea
 * Además sustituye __APP_VERSION__ por la versión de package.json (única fuente de versión).
 *
 * Uso:  node scripts/build.mjs [--out ruta] [--check]
 *   --check  no escribe nada: falla si el fichero no coincide con lo que se generaría. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const stripEnd = (s) => s.replace(/\n+$/, '');
export const VERSION = JSON.parse(rd('package.json')).version;

export function buildData(keys) {
  const o = {};
  for (const k of keys) {
    if (!/^[a-z0-9_-]+$/i.test(k)) throw new Error(`Clave de datos no válida: ${k}`);
    o[k] = JSON.parse(rd(`src/data/${k}.json`));
  }
  // Evita que una cadena con «</script>» cierre el bloque antes de tiempo.
  return JSON.stringify(o).replace(/<\/(script)/gi, '<\\/$1');
}

export function buildModules(dir) {
  const files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js')).sort();
  if (!files.length) throw new Error(`No hay módulos en ${dir}`);
  return files.map((f) => `/* ===== ${f} ===== */\n${stripEnd(rd(join(dir, f)))}`).join('\n');
}

export const FONTS = [
  { file: 'outfit-latin.woff2', family: 'Outfit', weight: '100 900' },
  { file: 'geist-mono-latin.woff2', family: 'Geist Mono', weight: '100 900' }
];
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
export function buildFonts() {
  return FONTS.map((f) => `@font-face { font-family: "${f.family}"; font-style: normal; font-display: swap; font-weight: ${f.weight};\n  src: url(data:font/woff2;base64,${readFileSync(join(ROOT, 'src/fonts', f.file)).toString('base64')}) format("woff2"); unicode-range: ${LATIN}; }`).join('\n');
}

/* Ilustraciones de la portada (WebP, 1600 px): una por acento y tema, incrustadas como variables CSS
 * (img-src solo admite data:). La lista de acentos sale de la aplicación, así que no hay dos listas que mantener.
 * Cada acento pone --portada-oscuro y --portada-claro, que son las que usa la hoja de estilos. */
export const ACENTOS = JSON.parse(rd('src/app/01-core.js').match(/const ACENTOS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
export const TEMAS_PORTADA = ['claro', 'oscuro'];
export const IMAGENES = ACENTOS.flatMap((a) => TEMAS_PORTADA.map((t) => ({ file: `portada-${a}-${t}.webp`, variable: `--portada-${a}-${t}` })));
export function buildImagenes() {
  const vars = IMAGENES.map((i) => {
    const ruta = join(ROOT, 'src/img', i.file);
    if (!existsSync(ruta)) throw new Error(`Falta la portada ${i.file} en src/img/`);
    return `${i.variable}: url(data:image/webp;base64,${readFileSync(ruta).toString('base64')});`;
  }).join(' ');
  // Azul por defecto primero: :root y [data-accent] pesan lo mismo, así que cada acento debe ir después.
  const regla = (sel, a) => `${sel} { --portada-oscuro: var(--portada-${a}-oscuro); --portada-claro: var(--portada-${a}-claro); }`;
  const porAcento = [regla(':root', 'azul'), ...ACENTOS.map((a) => regla(`[data-accent='${a}']`, a))].join('\n');
  return `:root { ${vars} }\n${porAcento}`;
}

/* CSP por <meta>: hashes SHA-256 de cada <script>/<style> en línea del documento final.
 * Va en <meta> porque GitHub Pages y el uso desde disco no permiten cabeceras HTTP. */
export function cspFor(html) {
  const h = (kind) => [...html.matchAll(new RegExp(`<${kind}>([\\s\\S]*?)</${kind}>`, 'g'))]
    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`).join(' ');
  return ["default-src 'none'", `script-src ${h('script')}`, `style-src ${h('style')}`, "style-src-attr 'unsafe-inline'",
    'img-src data: blob:', 'font-src data:', "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "manifest-src 'none'", "worker-src 'none'"].join('; ');
}

export function build({ csp = true } = {}) {
  const tpl = rd('src/index.html');
  const out = tpl.replace(/^[ \t]*<!-- @fonts -->$/m, () => buildFonts()).replace(/^[ \t]*<!-- @imagenes -->$/m, () => buildImagenes()).replace(/^[ \t]*(.*?)<!-- @(inline|data|modules) ([^>]+?) -->(.*)$/gm, (_, pre, kind, arg, post) => {
    const a = arg.trim();
    let body;
    if (kind === 'inline') {
      body = stripEnd(rd(a));
      if (/<\/(script|style)/i.test(body)) throw new Error(`${a} contiene una etiqueta de cierre que rompería el HTML`);
    } else if (kind === 'data') body = buildData(a.split(/\s+/));
    else body = buildModules(a);
    return pre + body + post;
  }).replaceAll('__APP_VERSION__', VERSION);
  const meta = csp ? `<meta http-equiv="Content-Security-Policy" content="${cspFor(out)}">` : '';
  const fin = out.replace(/^<!-- @csp -->\n/m, meta ? meta + '\n' : '');
  if (/<!-- @/.test(fin)) throw new Error('Quedan directivas sin resolver en la plantilla');
  if (/<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i.test(fin)) throw new Error('El HTML carga un recurso externo');
  return fin;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  // La aplicación es index.html (raíz de main y dist/ para gh-pages): una sola dirección, sin redirecciones.
  const outs = oi >= 0 ? [resolve(ROOT, args[oi + 1])] : [resolve(ROOT, 'dist/index.html'), resolve(ROOT, 'index.html')];
  const html = build();
  const sha = createHash('sha256').update(html).digest('hex').slice(0, 16);
  for (const outPath of outs) {
    if (args.includes('--check')) {
      const cur = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
      if (cur !== html) { console.error(`✗ ${outPath} está desactualizado: ejecuta «npm run build».`); process.exit(1); }
      console.log(`✓ ${outPath} al día (${(html.length / 1024).toFixed(0)} KB, sha256 ${sha}…)`);
    } else {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html);
      console.log(`✓ ${outPath} · ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB · sha256 ${sha}…`);
    }
  }
}
