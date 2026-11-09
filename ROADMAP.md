# Hoja de ruta

BlueJr resuelve un problema: **la paradoja de la experiencia** del primer empleo en un SOC. Cada versión se mide por si acerca a un junior a poder decir «esto lo he hecho».

## 0.1.0 · Primera semana (hecho)

- [x] Cinco turnos de ocho alertas con registros, ruido y una intrusión enlazada.
- [x] Ticket corregido con nota, lo esperado y explicación; relevo de turno.
- [x] Historial exportable en Markdown y copia JSON importable y saneada.
- [x] ES/EN, claro y oscuro, móvil, CSP por hashes, axe sin infracciones.

## 0.2.0 · Portada, movimiento y modo oscuro (hecho)

- [x] Portada con consola en directo y tarjetas de estadísticas.
- [x] Movimiento acotado: entrada en menos de 450 ms, comprobado en el e2e.
- [x] Lateral plegable con píldora deslizante y gesto por sección.
- [x] Oscuro sin negro ni blanco puros y tipografía Outfit; axe sin infracciones.

## 0.3.0 · El entrenador (hecho)

- [x] Guía de investigación por familia de alertas (triaje, falsos positivos, análisis y respuesta), inspirada en las de Elastic Security.
- [x] Árbol «¿escalo o no?» con las cinco salidas de un nivel 1, su porqué y un ejemplo ajeno a los casos.
- [x] Entidades para pivotar (cuentas, IP y equipos) y tareas del incidente que se marcan solas.
- [x] Práctica diaria: XP, meta, racha, niveles, insignias y siguiente alerta, derivados de los tickets.
- Aceptación cumplida: ninguna guía cita datos de un caso y la acción correcta de cada caso está entre las salidas de su guía (`tests/casos.test.mjs`); el e2e recorre guía, pivote, tareas, XP, las cinco salidas del árbol e insignias; axe sin infracciones.

## 0.4.0 · Presión de verdad

- [ ] Modo turno con reloj: SLA por severidad (crítica 15 min, alta 1 h) y alertas que llegan mientras trabajas.
- [ ] Indicador de tiempo hasta la decisión en el historial.
- Aceptación: el e2e simula un turno completo con reloj acelerado y comprueba los SLA incumplidos.

## 0.5.0 · Segunda semana: nube y SaaS

- [ ] Cinco turnos nuevos (Microsoft 365, AWS CloudTrail, Kubernetes, GitHub, Okta) con la misma empresa.
- Aceptación: `tests/casos.test.mjs` pasa con 80 casos; ningún caso sin al menos una decisión de no escalar en su turno.

## 0.6.0 · Del ticket a la entrevista

- [ ] Historial en PDF de una página por turno.
- [ ] Exportar cada ticket como historia STAR para **Astrolabio** (formato JSON compartido y prueba en los dos repositorios).
- Aceptación: el PDF se verifica con `pdfinfo` y la importación en Astrolabio tiene prueba e2e.

## 0.7.0 · Otros puestos de entrada

- [ ] Rol GRC junior (evidencias, riesgos y controles) y rol de soporte y sistemas, con el mismo motor.
