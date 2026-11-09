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

## 0.4.0 · El nivel 1 en la era de la IA (hecho)

Sale de la [investigación de noviembre de 2026](docs/investigacion-juniors.md).

- [x] Turno de revisión del agente de IA: diez alertas con veredicto, acción, confianza, razonamiento y comprobaciones del agente; cuatro aciertos y seis errores típicos (contexto, omisión, alucinación, persona, fuente única).
- [x] Triaje rápido diario con repaso espaciado (1, 2, 4, 7 y 14 días); solo la primera ronda del día suma XP.
- [x] Insignias «Revisor de IA» y «Reflejos»; la XP y la racha cuentan toda la práctica.
- Aceptación cumplida: el agente solo cita lo que existe en los registros salvo cuando alucina, y hay al menos un caso de cada tipo de error (`tests/casos.test.mjs`); saneado de revisiones, repaso y triaje importados (`tests/engine.test.mjs`); e2e de la revisión y del triaje rápido; axe sin infracciones en las vistas nuevas.

## 0.5.0 · Comunicar y pedir ayuda (hecho)

- [x] «Comunícalo»: escalado a N2 (qué, cuándo, quién, evidencia, acción y prioridad) y aviso a dirección (sin jerga, impacto, situación, petición y brevedad), corregidos en local con una lista de criterios y un ejemplo por caso.
- [x] «Pregunta al N2»: tres preguntas por turno a una mentora, con coste en XP y respuesta congelada al preguntar.
- [x] Insignia «Comunicador» y mensajes completos en el historial exportable.
- Aceptación cumplida: cada criterio tiene prueba con un texto bueno y uno malo, y los ejemplos de los 27 casos escalados cumplen su propia corrección en los dos idiomas (`tests/engine.test.mjs`); nada sale del navegador; axe sin infracciones.

## 0.6.0 · Del ticket a la entrevista

- [ ] «Defiende tu ticket»: preguntas de entrevista sobre los propios casos (por qué escalaste y no contuviste).
- [ ] Exportar cada ticket como historia STAR para **Astrolabio** (formato JSON compartido y prueba en los dos repositorios).
- [ ] Historial en PDF de una página por turno.
- Aceptación: la importación en Astrolabio tiene prueba e2e y el PDF se verifica con `pdfinfo`.

## 0.7.0 · Contexto español

- [ ] Casos con RGPD (brecha de datos personales: aviso al DPD y notificación a la AEPD en 72 horas), ENS e INCIBE-CERT, enlazados con el ecosistema GRC.

## Más adelante

- Turnos con reloj (SLA por severidad y alertas que llegan mientras trabajas): baja de prioridad porque SOCSimulator y TryHackMe ya lo tienen.
- Segunda semana: nube y SaaS (Microsoft 365, AWS CloudTrail, Kubernetes, GitHub, Okta).
- Otros puestos de entrada: GRC junior y soporte y sistemas, con el mismo motor.
