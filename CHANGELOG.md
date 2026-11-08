# Cambios

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).

## [0.2.1] - 2026-11-08

### Cambiado
- El icono de la marca pasa de escudo a radar (Lucide `radar`) en la barra lateral, el antetítulo de la portada, el favicon y la cabecera y el pie animados del README. El apartado de privacidad del README usa un candado.
- Se quita `shield-alert` de los iconos empaquetados: no se usaba.

### Corregido
- La prueba «la entrada termina antes de 450 ms» espera al cambio de vista antes de medir. Con el navegador sin interfaz de la CI medía la escena de la portada (1780 ms) en lugar de la entrada del historial.

## [0.2.0] - 2026-11-08

### Añadido

- Portada con escena ilustrada del amanecer en Norte Logística (inspirada en los carteles de risografía): el sol sale con trama de puntos, las ventanas de la sede se encienden una a una, la del SOC late con su etiqueta y la burbuja del último ticket, y un camión de reparto cruza la calle. Titular palabra a palabra y cuenta atrás hasta el turno de las 08:00.
- Con «reducir movimiento» las animaciones pierden también su retardo: nada queda oculto esperando.
- Portada nueva con una consola en directo: el ruido pasa, una línea se enciende como señal y se convierte en un ticket clasificado. Se pausa con la pestaña oculta y es estática con «reducir movimiento».
- Tarjetas de estadísticas (tickets cerrados, nota media, veredictos acertados y turnos superados) con icono en degradado, cifra que se cuenta al llegar y cambio del día; se elevan 5 px al pasar el ratón.
- Barra lateral plegable a un carril de iconos con el botón de la barra superior o la tecla `[`, persistente y desplegable por encima del contenido al pasar el ratón o con el teclado. Píldora de la sección activa que se desliza y gesto propio en el icono de cada sección.
- Módulo de movimiento (`src/app/02b-motion.js`) con la Web Animations API: entrada de cada vista en menos de 450 ms, como mucho 7 piezas escalonadas, solo transform y opacity, sin mover lo que tiene el foco y solo al cambiar de vista.
- README con cabecera y pie animados, tabla `cat bluejr.yaml`, capturas en claro, oscuro, inglés, tres acentos y móvil, diagramas Mermaid y bloque de autor.

### Cambiado

- Modo oscuro según la guía de superficies: sin negro ni blanco puros (superficies `#1D2127` y `#252930`, texto `#D1D7E0` y `#AAAEB6`) y profundidad con sombras en lugar de bordes.
- Tipografía Outfit en toda la interfaz; Geist Mono se mantiene para registros e identificadores.
- La auditoría axe y las capturas esperan solo a las animaciones finitas.

### Corregido

- Contraste de la etiqueta de severidad en la consola y de la barra inferior del móvil en modo claro.

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
