# Seguridad

## Cómo informar

Si encuentras un problema de seguridad en Blue-Jr, escribe a **yoandyramirezdelgado@gmail.com** con los pasos para reproducirlo. Respondo en un plazo de 7 días. No abras una incidencia pública hasta que esté corregido.

## Alcance

Blue-Jr es un HTML autocontenido que funciona sin servidor:

- **Sin red.** La CSP (`default-src 'none'`, `connect-src 'none'`) impide cualquier petición; el e2e bloquea toda URL que no sea `file:`, `data:` o `blob:` y la cuenta como fallo.
- **Sin código de terceros en ejecución.** Scripts y estilos en línea autorizados por hash SHA-256; ni CDN ni fuentes remotas.
- **Entrada hostil por defecto.** La importación usa `safeParse` (descarta `__proto__`, `constructor` y `prototype`) y `sanearEstado` (tipos, listas permitidas, longitudes y nota recalculada: una copia no puede inventarse notas). Todo texto se escapa antes de llegar al HTML; una prueba de mutación confirma que el e2e detecta una inyección si se rompe el escapado.
- **Datos locales.** El progreso vive en `localStorage` de tu navegador; Blue-Jr no tiene cuentas ni telemetría.
- **Exportaciones que decides tú.** El historial, la copia, las historias STAR y el PDF se generan en el navegador y se descargan como archivo (`blob:`) o con el diálogo de impresión: nada se envía. Las respuestas de «Defiende tu ticket» se sanean al importar y su estado «completo» se recalcula.

## Lo que Blue-Jr no hace

No es una plataforma SIEM, no analiza registros reales y no sustituye la formación oficial ni la experiencia en un SOC. Los casos son ficticios.
