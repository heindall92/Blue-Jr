# Cambios

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).

## [0.6.3] - 2026-11-09

### Añadido
- Portada con una ilustración por acento y tema: 14 WebP de 1600 px en `src/img/portada-<acento>-<claro|oscuro>.webp`, incrustadas como variables CSS. `scripts/build.mjs` saca la lista de acentos de `src/app/01-core.js` y cada `[data-accent]` fija `--portada-oscuro` y `--portada-claro`.
- El brillo del ojo (`.p-ojo`) usa el color del aro de cada ilustración (`--ojo`), en vez de un azul fijo.
- En el móvil, «Ajustes» en la barra inferior (cinco botones) abre el perfil con el nombre y el color de acento: antes no se podía cambiar el acento ni el nombre en el móvil, porque estaban en la barra lateral oculta. El diálogo de perfil incluye los siete colores también en escritorio.
- Pruebas: una unitaria (cada portada existe, es WebP, pesa menos de 120 KB, está incrustada y con su regla; ninguna imagen suelta en la raíz) y dos e2e (14 combinaciones con el interruptor de tema y el selector de acento, ilustración y brillo del ojo; «Ajustes» en el móvil a 320 y 390 px). axe audita el diálogo de perfil también en el móvil.

### Cambiado
- Título de la portada en dos líneas: «Simulador SOC» (`hero_linea`) y «Blue-Jr» en Outfit de peso medio, más grande y en el color del acento, con la entrada palabra a palabra de siempre. El progreso de la semana abre la entradilla en negrita.
- El acento solar pasa de mostaza a naranja eléctrico: `#ff7a1a` en oscuro (7,4:1 sobre el fondo) y `#c43f00` en claro (5,2:1 con el texto blanco de los botones y 4,9:1 sobre el fondo).
- Las 12 imágenes originales subidas a la raíz del repositorio (unos 23 MB) se convierten y se mueven a `src/img/`; las dos azules pasan a llamarse `portada-azul-claro.webp` y `portada-azul-oscuro.webp`.
- El HTML pasa de unos 0,6 MB a 1,4 MB.

## [0.6.2] - 2026-11-09

### Corregido
- README: el subtítulo bajo el banner cerraba un `</p>` sin apertura y no salía centrado. Lleva su `<p align="center">` y una prueba comprueba que las etiquetas `<p>` del README están emparejadas.

## [0.6.1] - 2026-11-09

### Cambiado
- La aplicación compilada es `index.html` en la raíz y en `dist/`: `https://heindall92.github.io/Blue-Jr/` la abre directamente. `bluejr.html` se elimina y no queda ningún enlace a él ni a la dirección anterior al cambio de nombre (una prueba lo vigila). El progreso en `localStorage` es por dominio y no se pierde.

### Corregido
- Ctrl+P imprimía una página en blanco desde cualquier vista, y la hoja vieja del historial después de usar «Imprimir o guardar en PDF». Los estilos de impresión de la hoja solo se aplican con `body.imprimiendo`, que se pone al pulsar el botón y se quita, junto con la hoja, en `afterprint`.
- Una respuesta de «Defiende tu ticket» seguía contando como completa si se editaba después hasta dejar de cumplir los criterios (solo se corregía al recargar). Ahora deja de contar al escribir.
- El ejemplo compartido con Astrolabio lleva la versión del formato (0.6.0) y no la de la aplicación, para que cada versión de Blue-Jr no obligue a cambiarlo en los dos repositorios.
- Pruebas: las e2e de impresión y de la entrevista cubren los dos fallos (fallan con la 0.6.0).

## [0.6.0] - 2026-11-09

### Añadido
- «Defiende tu ticket» en el resultado de cada ticket cerrado: tres preguntas de entrevista según lo decidido (`BJ.preguntasDefensa`), corregidas en local con criterios en español y en inglés (`BJ.corregirDefensa`: el porqué, un dato del caso, el riesgo, la alternativa, la hora, reconocer el error, qué harías ahora y la extensión) y una respuesta de ejemplo construida con el caso (`BJ.modeloDefensa`). Las tres completas suman 15 XP; reabrir el ticket borra su entrevista.
- Historias STAR para Astrolabio (`BJ.historiaStar`, `BJ.sobreHistorias`): de un ticket desde su resultado o de todos desde Historial, con el resumen del ticket, la defensa, los mensajes completos y el resultado contado tal cual (también los fallos).
- Historial imprimible: una página A4 por turno con tickets cerrados (estilos `@media print`, sin librerías).
- Insignia «Lista para la entrevista» (tres tickets defendidos); paso nuevo en la guía de la ayuda.
- `scripts/ejemplo-star.mjs` y `tests/fixtures/historias-blue-jr.json`: el ejemplo del formato compartido, también en el repositorio de Astrolabio. `tests/fixtures/contrato-astrolabio.json` resume lo que Astrolabio acepta.
- Pruebas: 8 unitarias (`tests/entrevista.test.mjs`), 3 e2e y axe en «Defiende tu ticket». La CI instala `poppler-utils` para `pdfinfo` y `pdftotext`.

## [0.5.1] - 2026-11-09

### Cambiado
- El nombre visible pasa a ser «Blue-Jr» en la interfaz (barra lateral, cabecera móvil, título de la pestaña, ayuda, mensajes y historial exportado), en README, ROADMAP, SECURITY, la investigación y los SVG de cabecera y pie. El paquete npm pasa a `blue-jr`.
- La web y el repositorio apuntan a `https://heindall92.github.io/Blue-Jr/` y `https://github.com/heindall92/Blue-Jr` (también el comentario del flujo de Pages).

### Corregido
- En el móvil, la barra superior encogía el botón de buscar hasta 22 px a 360 px de ancho (ya pasaba antes del cambio de nombre; con el guion, la marca además se partía en dos líneas). Ahora los botones no se encogen, la marca no se corta y, por debajo de 430 px, se muestra solo el logo y el nombre queda para los lectores de pantalla. Prueba e2e nueva en 320, 390 y 430 px.

### Sin cambios a propósito
- Las claves de `localStorage`, el nombre del archivo `bluejr.html` y los nombres de las copias exportadas: cambiarlos rompería el progreso guardado y los enlaces existentes.

## [0.5.0] - 2026-11-09

### Añadido
- «Comunícalo» en el resultado de cada ticket escalado: mensaje a N2 y aviso a dirección, corregidos en local (`BJ.corregirMensaje`) con criterios comprobables en español y en inglés, y un ejemplo construido con los datos del caso (`BJ.modeloMensaje`). Cada mensaje completo suma 10 XP y se incluye en el historial exportable.
- «Pregunta al N2» en el ticket abierto: tres preguntas por turno (por dónde empezar, qué dato falta, si el veredicto va bien), con pistas del propio caso (`BJ.pistaN2`). Cada pregunta resta 10 XP al ticket, nunca nota, y la respuesta se guarda tal como era al preguntar.
- Insignia «Comunicador»; saneado de mensajes y preguntas importados (lo completo se recalcula).
- Pruebas: 5 unitarias y 2 e2e nuevas; axe en «Comunícalo» y «Pregunta al N2».

### Corregido
- El aviso de XP al cerrar un ticket descuenta lo que costaron las preguntas al N2.

## [0.4.0] - 2026-11-09

### Añadido
- Turno de revisión del agente de IA (nivel 1,5), en `#revision`: diez alertas resueltas por un agente con su veredicto, acción, confianza, razonamiento y comprobaciones; se aprueban o se rechazan diciendo qué falló y qué acción tocaba. Datos en `src/data/revision.json`; corrección en `BJ.corregirRevision`.
- Triaje rápido diario, en `#rapido`: diez alertas ya trabajadas, decididas con 1, 2 y 3, con repaso espaciado de lo fallado (`BJ.repasar`, `BJ.sesionRapida`). Solo la primera ronda del día suma XP.
- Tarjetas de los dos modos en la portada y enlaces en el lateral; insignias «Revisor de IA» y «Reflejos»; la XP y la racha cuentan revisiones y triaje rápido.
- Saneado de revisiones, repaso y triaje importados: las notas se recalculan y se descarta lo que no encaja.
- `docs/investigacion-juniors.md`: la investigación que orienta la hoja de ruta.
- Pruebas: 7 unitarias y 2 e2e nuevas; axe en las vistas nuevas y en la pestaña «¿Escalo?».

### Cambiado
- Hoja de ruta reordenada según la investigación: comunicación y «Pregunta al N2» (0.5.0), entrevista y Astrolabio (0.6.0), contexto español (0.7.0); los turnos con reloj bajan de prioridad.

## [0.3.0] - 2026-11-09

### Añadido
- Guía de investigación en cada alerta, una por familia de detección (identidad y accesos, correo, equipos, red, web, fuga de datos y directorio activo), con triaje, falsos positivos habituales, análisis y respuesta según lo que se encuentre. Se pliega y se abre en pestañas. Datos en `src/data/guias.json`.
- Árbol «¿Escalo o no?» en la ayuda y desde el ticket: tres preguntas, cinco salidas con su porqué y un ejemplo que no está en ningún turno.
- Entidades para pivotar: cuentas, IP y equipos de los registros con su número de apariciones; al pulsar uno se filtran los registros.
- Tareas del incidente en el ticket, que se marcan solas.
- Práctica diaria en la portada (meta de XP, racha, nivel y siguiente alerta), nivel y XP en el lateral, avisos de XP al cerrar e insignias en el historial. Todo se deriva de los tickets (`BJ.progreso`, `BJ.insignias`).
- Pruebas: 9 unitarias (XP, racha, niveles, insignias, entidades, cobertura de las guías, sin datos de casos, árbol) y 3 e2e.

### Corregido
- En móvil, el campo que recibe el foco (por ejemplo, el filtro) quedaba detrás de la barra inferior: ahora el desplazamiento respeta las dos barras fijas.
- Las capturas en oscuro salían en claro desde que la aplicación arranca siempre en claro: el script pulsa el interruptor.
- Pruebas más robustas: la de la ayuda espera a que el foco llegue a la pestaña y la de movimiento reducido, a que terminen las animaciones de 0,01 ms.

## [0.2.1] - 2026-11-08

### Añadido
- Portada ilustrada con el analista de guardia, en versión clara y oscura según el tema (WebP de 1600 px incrustados: 45 y 77 KB). Texto a la izquierda; al cargar, la ilustración entra y el aro del ojo se enciende y late. En tableta y móvil la figura pasa arriba. Sustituye a la escena SVG del amanecer.
- `index.html` y `.nojekyll` en la raíz de `main`: GitHub Pages abre la aplicación aunque esté configurado para servir `main` en lugar de `gh-pages`. Prueba en `tests/repo.test.mjs`.

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
