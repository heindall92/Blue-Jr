# Contribuir

Las propuestas de casos nuevos son lo más útil. Un buen caso:

1. Ocurre en Norte Logística y usa solo datos ficticios (RFC 5737, 10.20.0.0/16, `.example`).
2. Se resuelve leyendo sus registros: la señal contiene todas las respuestas de los datos clave.
3. Enseña una decisión de nivel 1 (veredicto y acción) con una explicación de dos o tres frases, en español y en inglés.
4. Pasa `npm test`, que comprueba la integridad de los 40 casos.

Abre una incidencia con la propuesta antes de escribir código. Desarrollo:

```bash
npm ci
npm run build      # genera index.html y dist/index.html (y la redirección bluejr.html)
npm test           # motor, casos y coherencia del repositorio
npm run test:e2e   # navegador y axe (PW_CHROMIUM=/ruta/chrome si hace falta)
```
