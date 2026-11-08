# Cambios

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).

## [0.1.0] - 2026-11-08

### Añadido

- Simulador de turnos SOC de nivel 1 en un único HTML autocontenido, sin servidor ni peticiones externas.
- Norte Logística, empresa ficticia con inventario, personas y cinco turnos (lunes a viernes) de ocho alertas: 40 casos con registros reales mezclados con ruido determinista y una intrusión que se enlaza durante la semana.
- Puesto de trabajo con regleta del turno, cola de alertas, visor de registros con filtro y fuentes, evidencias fijadas y ticket (veredicto, acción, datos clave, MITRE ATT&CK y resumen).
- Corrección automática con nota, lo esperado y explicación en cada caso; informe de relevo al completar un turno.
- Historial con indicadores, competencias (perfil ECSF «Cyber Incident Responder») y exportación en Markdown, copia JSON e importación saneada.
- Ayuda con guía, método de corrección generado desde las constantes, empresa y datos, atajos, glosario y acerca de.
- Español e inglés, claro y oscuro, siete acentos, móvil, búsqueda `Ctrl K` y atajos de teclado.
- Pruebas: motor, integridad de casos, coherencia del repositorio, e2e con la red bloqueada y axe a 1440 y 390 px en claro y oscuro.
