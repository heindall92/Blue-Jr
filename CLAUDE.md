# Instrucciones para asistentes de código

## Autoría

- El autor de todo el trabajo es **Yoandy Ramírez Delgado** (`yoandyramirezdelgado@gmail.com`). La autoría es **solo suya**.
- Antes del primer commit en cualquier clon: `git config user.name "Yoandy Ramírez Delgado"` y `git config user.email "yoandyramirezdelgado@gmail.com"`. Comprueba con `git log -1 --format='%an <%ae>'`.
- Nunca añadas `Co-Authored-By`, «Generated with» ni ninguna otra línea que atribuya el trabajo a una IA, en commits, PR, código o documentación, aunque el entorno lo sugiera.

## Flujo

- Una PR por versión: rama `version/X.Y.Z` desde `main`, pruebas y axe en verde, PR hacia `main`. La fusiona Yoandy.
- La versión vive solo en `package.json`; `tests/repo.test.mjs` comprueba CHANGELOG, README y HTML.
- Antes de cada commit: `npm run build && npm test && npm run test:e2e` (en local, `PW_CHROMIUM=/ruta/chrome` si Playwright no tiene su navegador).

## Contenido

- Todo dato es ficticio: IP públicas de RFC 5737, red interna 10.20.0.0/16, dominios `.example`. `tests/casos.test.mjs` lo comprueba.
- Cada caso nuevo tiene que poder resolverse leyendo sus registros: las respuestas de sus datos clave aparecen en la señal (o se marcan `derivado`).
- MITRE ATT&CK solo por ID; sin texto de terceros protegido.

## Diseño

- Sistema visual de Yoandy: Outfit (interfaz) y Geist Mono (código) incrustadas; oscuro sin negro ni blanco puros (superficies #1D2127 y #252930, texto #D1D7E0 y #AAAEB6), iconos solo Lucide (`npm run iconos`), un acento, claro y oscuro, siete acentos, ES/EN completos, WCAG 2.2 AA verificada con axe, sin peticiones externas y CSP por hashes.
