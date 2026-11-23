# Novedades de DeskLens
Cada cambio es una versión nueva, la más reciente arriba. El número de la primera es el que sale en ⓘ (arriba en la cinta).

## v1.167 · 2026-11-21 · 🗂 Proyectos: el organizador que une las partes de cada proyecto (Fase 1a)
- Icono nuevo en la cinta, 🗂 **Proyectos** (Ctrl+Shift+O): un tablero con una tarjeta por proyecto (estado, avance, partes, rama y cambios de git) y botones para abrir la carpeta, VS Code, Claude (con todas las partes del proyecto), la terminal y su web. Filtros por estado, orden y vista en tarjetas o lista.
- **Buscar en discos**: marcas tus discos y DeskLens recorre solo los nombres de las carpetas (sin leer ni indexar nada) y propone qué carpetas forman cada proyecto (por ejemplo homeshape + su material en H: + su web en htdocs + sus respaldos). Confirmas con ✓/✗ (clic en cualquier parte de la tarjeta, o ☑ Todos / ☐ Ninguno) y **Ver detalles** abre el editor de jerarquía: arrastras carpetas entre partes, a «Sin proyecto» o a otro proyecto (Ctrl: compartirla). No se mueve ningún archivo.
- Cada carpeta lleva un **ancla** (archivo oculto `.desklens-ancla` con solo un id): si la mueves, DeskLens la vuelve a encontrar (al instante dentro del mismo disco; recorriendo los discos marcados si fue a otro). Las que no aparecen salen en ⚠ con su última ruta y un botón para buscarlas, con el progreso de cada disco.
- 💽 Discos para anclas, con las carpetas excluidas de cada uno (las de Windows ya vienen puestas; se pueden quitar, añadir y restaurar). 📋 Actividad: todo lo que hace el organizador, dónde y cuándo.
- El ancla no ensucia git: va a `.git/info/exclude` (solo en este PC; se puede apagar). Al anclar una carpeta web, avisa.
- «Añadir proyecto» ya no acepta un disco entero (lo indexaría todo): ofrece usarlo para buscar anclas. Avisa antes de añadir carpetas de sistema como C:\Users.
- Los proyectos que ya tenías en DeskLens se pueden convertir en fichas con un clic.
- Una carpeta enviada a la papelera ya no se toma como «movida»: sale 🗑 en la papelera (con su nombre y ruta de antes), con Abrir la papelera o Quitar del proyecto; si la restauras vuelve sola, y si vacías la papelera queda como eliminada.
- **Clic en una tarjeta: la vista del proyecto.** Arriba, estado y avance (clic en la barra), git y botones. Pestañas: **Archivos** (un solo árbol con todas las carpetas del proyecto por partes, G:, H:, htdocs…, y el visor/editor de DeskLens de siempre a la derecha; buscar por nombre dentro del proyecto; clic derecho: Explorador, terminal o quitar del proyecto), **Ficha**, **Git** (abre la vista Git de DeskLens en la carpeta de código), **Estado** (git, copia y tamaño de cada carpeta; solo informa). Historial y Notas llegan en las fases siguientes.
- Las ventanas del organizador no bloquean la pantalla: un clic fuera (o Esc) las cierra. Solo preguntan si escribiste algo sin guardar.

## v1.169 · 2026-11-21 · Proyectos en Flujo y Red, notas en nodos, historial y comparativo (Fase 1b)
- **Vista ⇢ Flujo y ◉ Red** en la pestaña Archivos de cada proyecto (el selector junto al buscador): pizarra sin límites; arrastrar para moverse, rueda para subir y bajar, Ctrl+rueda para el zoom, 0 para ver todo y un minimapa. Cada nodo que mueves queda en su sitio (por vista y por proyecto).
- **Conectores tuyos**: ⟶ Conectar (o la tecla C), clic en un nodo y luego en otro, con etiqueta («usa», «se publica en»…). Clic en un conector: etiqueta, color, dirección o borrar. **Cajas libres** con doble clic en un espacio vacío. Doble clic en una carpeta: la abre en el Contenedor.
- **Notas en nodos y conectores**: clic derecho › 💬 Notas. Se escriben en Markdown, las casillas se marcan con un clic y el nodo lleva 💬 con el número; al pasar el ratón se ven en un cuadro flotante.
- **Historial de la estructura** (pestaña Historial): cada cambio queda guardado solo (siempre, sin cuota), con 🏷 Guardar versión con nombre y los commits del código como marcas. Restaurar crea un punto nuevo.
- **⇆ Comparar con** una versión en las tres vistas: 🟢 nuevo, 🔴 quitado (como fantasma), 🟠 movido (con flecha desde su sitio de antes), 🔵 cambiado; lo demás atenuado. Encima o Lado a lado (zoom a la par), Solo cambios y ↑ ↓ para saltar de un cambio a otro.

- **🚦 Entornos** (tipo de parte nuevo): las etapas del despliegue en orden, 🧪 Pruebas → ✅ Calidad → 🌍 Producción. Cada etapa es una carpeta o una **etapa remota** (nombre + dirección, p. ej. el VPS). En Flujo van en fila unidas por «pasa a»; en el editor de jerarquía se elige la etapa y se ordenan con ↑ ↓. Las carpetas «…_calidad», «…_pruebas», «vps_…» se proponen como Entornos, ya no como Respaldos.
- **Clic derecho › Mover a** (en el árbol, en Flujo y en Red): pasa una carpeta a otra parte del proyecto (💻 Código, 🚦 Entornos, 🎬 Material…) sin abrir el editor. Si no hay parte de ese tipo se crea, y la que queda vacía se quita. Al entrar en Entornos toma la etapa por el nombre y se coloca en su sitio (pruebas → calidad → producción). Solo cambia la ficha: nada se mueve en el disco, y queda en el Historial.
- Arreglo: al cambiar algo del proyecto con el visor abierto a la derecha, el visor ya no se queda en «null».
- **Panel ⓘ Información** en Flujo y Red (y con clic derecho › ⓘ Información en el árbol): un clic en cualquier nodo muestra su ruta como barra pulsable, peso, fechas, git, ancla, proyectos y notas, con su contenido en lista (filtro y orden por nombre, peso o fecha). El peso se calcula aparte, con su avance y ✕ Detener. En un archivo: sus datos y una vista previa. En una parte o en el proyecto: el peso total y el estado de cada carpeta. Tecla I para abrirlo o cerrarlo, Esc para cerrarlo; su ancho se cambia arrastrando el borde.
- **Doble clic en una carpeta** de Flujo o Red: su contenido se despliega ahí mismo (12 elementos y «… N más»); otro doble clic lo pliega. Doble clic en un archivo: se abre en una pestaña. Lo desplegado y el panel se recuerdan por proyecto.
- **★ Carpeta principal**: el proyecto ya no es un nombre suelto con todo debajo; su carpeta principal es la raíz. Por defecto es la que usa git o la de 💻 Código; se cambia con clic derecho › ★ Hacer principal (en el árbol, Flujo o Red). El proyecto se llama como ella mientras no le pongas otro nombre en la Ficha.
- **Entornos como iguales**: las etapas salen de la principal en fila (Pruebas → Calidad → Producción), del mismo tamaño y unidas por «pasa a» con línea gruesa; las demás partes (Material, Respaldos, Web…) salen de ella con línea gris fina («contiene»). En Flujo, la fila va a su derecha; en Red, en línea recta desde el centro; en la tarjeta, «★ principal → etapas».
- **Iconos monocromos**: dibujos de línea de un solo color (con el color del tipo en el trazo) en el árbol, las tarjetas, el panel ⓘ, los menús y dentro de los nodos de Flujo y Red. Los iconos que elegiste a mano se muestran con su equivalente.
- **Árbol del Contenedor con líneas de jerarquía** (│ ├─ └─) en gris; las etapas, con línea gruesa verde; al pasar el ratón, el camino hasta la principal se pinta del color del tema.
- **Una sola barra en la vista del proyecto**: la vista se elige con pestañas (🗂 Contenedor · ⇢ Flujo · ◉ Red) en vez de un desplegable, y los botones tienen nombres claros: ⟶ Unir, ▭ Nota libre, ▴ Plegar todo, ↺ Ordenar, ⇆ Comparar…, 🏷 Guardar versión. Con la ventana estrecha quedan en su icono (el texto sale al pasar el ratón). Los «conectores» se llaman ahora **uniones** y las «cajas», **notas libres**.
- **⇆ Comparar…** abre una ventana como la comparación de git: a la izquierda las versiones (🏷 con nombre, ⎇ commits, · automáticas); a la derecha Antes | Ahora lado a lado en Flujo, Red o Árbol, con zoom a la par; y abajo los cambios escritos en frases («homeshape_calidad: de Respaldos a Entornos»). Clic en un cambio, o ↑ ↓, lo señala en los dos lados. Desde ahí, ↶ Restaurar esta versión. El botón ⇆ Comparar de la pestaña Historial abre la misma ventana.
- **Barra del tablero en una sola fila**: el estado es un desplegable con su número (Todos · Activo · Pausado…), el orden va en ↕, la vista en ▦ ☰ y ⚠ 💽 📋 ⚙ quedan como iconos. Todo lo de crear está en **＋ Nuevo ▾**: Nuevo proyecto… (Ctrl+N), Buscar en discos… y Convertir proyectos de DeskLens.
- **＋ Nuevo proyecto a mano**: escribe o pega una ruta (con autocompletado) y pulsa Enter, o usa **📁 Examinar…** (un explorador dentro de la ventana para marcar varias carpetas), **＋ Archivo…** o **☁ Etapa remota…**. La primera carpeta es la ★ (si después llega una con git, te propone pasarla a ella); el tipo se adivina por el nombre y se cambia en cada fila. Avisa si una carpeta ya está en otro proyecto (Compartir o Mover aquí) o cuelga de otra. Abajo, **sugerencias** con nombre parecido de tus discos, al instante (de lo que guardó el último 🔍 Buscar en discos). A la derecha, **Así queda**: el árbol, el Flujo o la Red en vivo; lo nuevo parpadea. Crear y abrir (Ctrl+Enter) o Crear y seguir con otro.
- **＋ Añadir carpetas…** dentro de un proyecto: clic derecho en el fondo o en una parte del Contenedor, de Flujo o de Red abre la misma ventana para ese proyecto.
- **Archivos sueltos como accesos ↗** (p. ej. un PDF de requisitos que vive en Descargas): salen en el árbol, en Flujo y en Red; un clic lo abre. No llevan ancla: si lo mueves, sale en ⚠.
- **Tarjetas del tablero, solo lo necesario**: nombre (con ☐ N si hay pendientes), ruta de la carpeta principal (recortada por el principio; entera al pasar el ratón), 💾 peso de todas sus carpetas (se calcula aparte y se guarda un día; ⋯ › Recalcular peso), 🕘 la última vez que entraste (y desde qué equipo, si compartes), fecha de creación y, compartiendo, 🖧 los equipos. Se quedan 📂 (abre la carpeta principal) y VS; Claude, terminal y web pasan al ⋯. El estado sigue en el color de la franja. La vista ☰ Lista tiene las mismas columnas, y el orden ↕ suma Última entrada, Peso y Creado.
- **＋ Nuevo proyecto avisa si una carpeta no admite el ancla** (la raíz de Google Drive, una carpeta de solo lectura, una unidad de red sin permiso): la fila sale en rojo con el motivo y tres salidas, 🔗 Usar sin ancla · Elegir «Mi unidad» · 📁 Examinar dentro. No se crea nada hasta resolverlo: ya no queda un proyecto vacío (pasaba con «Google Drive - Mi Carolina»). Igual en ＋ Añadir carpetas.
- **🔗 Carpetas sin ancla («por ruta»)**: se usan como las demás (árbol, Flujo, Red, Explorador, abrir y editar), pero no se escribe nada en ellas; si las mueves o renombras salen en ⚠. Clic derecho: «🔗 Quitar ancla (seguir por ruta)…» o «⚓ Poner ancla».
- **Cada proyecto, sus pestañas**: al entrar en un proyecto (🗂 Proyectos) se guardan aparte las pestañas de DeskLens normal y se abren las que dejaste en ese proyecto (la primera vez, ninguna); al salir vuelven las de siempre, tal como estaban. Lo escrito sin guardar no se pierde.
- **Dentro de un proyecto solo se abre lo suyo** (o lo que arrastras a sus pestañas). Un archivo de fuera te saca del proyecto sin preguntar (todo queda guardado) y se abre en DeskLens normal.
- **Los archivos de fuera ya no van solos a 📌 Sueltos** (al arrastrarlos a la ventana o abrirlos desde Windows): se abren y se pueden editar, y el Explorador de DeskLens se abre en su carpeta con el archivo marcado. Para dejarlo en Sueltos: **doble clic en el título de su pestaña** («📌 añadido a Sueltos»).
- **🖧 Compartir entre equipos** (⚙ Ajustes › 🗂 Proyectos): eliges una carpeta compartida de tu red (p. ej. `\\SERVIDOR\DeskLens`) y el nombre de este equipo. Antes de unirte, un resumen dice qué proyectos hay allí, cuáles tienes aquí y qué pasará; nada se borra. Allí quedan las fichas, notas, pendientes e historial, comunes a todos los equipos; cada equipo sigue con sus discos y ajustes. Las carpetas que están en otro equipo salen como «🖧 en PC-CASA» (en el árbol, Flujo, Red y la tarjeta), no como «⚠ no encontrada». En la barra del tablero, 🖧 con el nombre de este equipo. «Dejar de compartir» se trae una copia.
- **☑ Pendientes del proyecto** (pestaña nueva, con su número): una lista sencilla, sin fechas ni responsables. Cada pendiente es un cuadro de texto grande, de varias líneas (Ctrl+Enter lo añade o lo guarda; clic en el texto para cambiarlo). ☐ lo da por hecho y baja a «Hechos» con su fecha. ⠿ (o Alt+↑ ↓) cambia el orden. ⋯ › Unir a una carpeta: sale el botón 📁 para ir a ella y, en Flujo y Red, ☐ con el número en esa carpeta. En la tarjeta del tablero se ve «☐ N pendientes · el primero»; en la vista Lista, una columna ☐; y en MAPA.md, para la IA. Solo se guarda en la ficha.
- Los cuadros de las notas (💬) son más grandes.
- **🚦 Ordenar entornos**: clic derecho en Entornos o en una etapa (Contenedor, Flujo o Red) › 🚦 Ordenar entornos…. Las etapas salen en tarjetas que se arrastran por ⠿ (o ↑ ↓, Alt+↑ ↓) para el orden de la cadena; cada una con su etapa (Pruebas, Calidad, Producción u Otra…). Las que no tenían etapa (salía «Etapa») lo avisan y proponen una. ⋯ saca una carpeta de Entornos (a Código, Material…) o la quita del proyecto. «Así queda» en vivo, ↕ Ordenar por etapa y Guardar (Ctrl+Enter); solo cambia la ficha.
- Arreglo: guardar en 🧩 Editar jerarquía con un acceso ↗ a un archivo ya no falla.
- **Filtro más directo y más rápido**: el cuadro «🔍 Filtrar lo desplegado…» está siempre a la vista; al entrar en él salen los tipos (▾ los deja fijos). Al escribir, el dibujo cambia al momento: ya no vuelve a leer las carpetas del disco. Las carpetas abiertas no se esconden con el filtro de nombre, así se buscan los archivos que tienen dentro.
- **Pizarra más fluida**: la rueda y el zoom se aplican una vez por cuadro de pantalla (antes, una vez por cada aviso de la rueda), y al volver al proyecto o al filtrar lo desplegado se ordena de una sola vez.
- **Lo desplegado ya no se monta**: en Red, cada carpeta abierta tiene su propio hueco en el abanico (según lo que tiene dentro) y sus archivos no se mezclan con los de la vecina; en Flujo se ordena como árbol, en filas de 4 bajo su carpeta. Lo que aún se toque se aparta lo justo, con una animación corta. Las carpetas y partes del proyecto no se mueven (no se desordena). En Red, al alejar, los nombres de lo desplegado se esconden para no tacharse.
- **🎯 Foco en Red y Flujo**: doble clic en una carpeta la despliega y la enfoca: su camino y su contenido en color, lo demás opaco; doble clic en una de dentro baja un nivel (las hermanas se pliegan). Arriba se lee el camino (homeshape › calidad › shape), y cada tramo se puede pulsar. Clic en el fondo o Esc: todo vuelve a su color (lo desplegado se queda). Doble clic en un archivo: se enfoca (se abre con doble clic en el explorador o con «Abrir en pestaña» del panel ⓘ).
- **🗂 Explorador en el panel derecho** (pestañas ⓘ Info · 🗂 Explorador): el árbol del proyecto sigue al foco (abre el camino, marca lo enfocado y pone lo demás en gris). Un clic en una carpeta o archivo del explorador lo enfoca también en el dibujo; ▸/▾ solo abre o cierra.
- **🔍 Filtro flotante** arriba a la izquierda de Red y Flujo: tipos de lo desplegado con su número (📁 Carpetas, ⚙ Código y scripts, 📄 Documentos, 🖼 Imágenes, 🎬 Vídeo y audio, 🗜 Comprimidos, 💾 Bases de datos, Otros) y un cuadro de nombre. Afecta al dibujo y al explorador; con filtro, el límite de 12 va después de filtrar. Se recuerda por proyecto.
- Arreglo: lo desplegado desde la carpeta ★ vuelve a abrirse al volver al proyecto; en Flujo, lo de dentro sigue abriéndose hacia el mismo lado (ya no tapa la raíz).
- **Contenedor con nombre**: clic derecho en el fondo o en la raíz (Contenedor, Flujo o Red) › interruptor «Contenedor con nombre». Encendido, la raíz del proyecto es su nombre (🏷), no la ★ carpeta principal; las etapas se juntan en un bloque 🚦 Entornos (Pruebas → Calidad → …) y las demás partes salen de ese bloque. Apagado, vuelve la ★ como estaba. Se guarda en cada proyecto y en el Historial; lo que muevas a mano se recuerda aparte en cada modo.
- **＋ Nuevo proyecto solo con el nombre**: sin añadir carpetas, escribe el nombre y Crear; nace con «Contenedor con nombre» y las carpetas se añaden después.
- Arreglo: **>_ Terminal** (en el proyecto, en su clic derecho, en el panel ⓘ o en la tarjeta) ya no te saca al Explorador: la consola de DeskLens se abre abajo y sigues en el proyecto o en el tablero.
- Arreglo: al cambiar el nombre de un archivo o carpeta (F2 en el árbol de DeskLens o Ctrl+F2 en su pestaña), el árbol del proyecto en 🗂 Proyectos se actualiza al momento, sin plegar lo que tenías abierto. Si lo renombras en el Explorador de Windows, se actualiza al volver a DeskLens.
- **🔍 Buscador en 📁 Examinar** (＋ Nuevo proyecto y ＋ Añadir carpetas): al escribir filtra la carpeta abierta sin tener en cuenta mayúsculas ni acentos, con lo que coincide resaltado. Con **☐ subcarpetas** y Enter busca también más abajo (hasta 6 niveles y 200 resultados, sin node_modules, .git ni carpetas de sistema), con ✕ Detener; cada resultado dice en qué subcarpeta está. **Ctrl+F** lleva al buscador (abre el explorador si está cerrado), ↓ baja a la lista, Espacio marca, Enter entra y Esc borra paso a paso antes de cerrar la ventana.
- **Bloques que se arrastran** en esa ventana: el ancho entre «Añadir» y «Así queda», el alto del explorador, el ancho de su lateral y el alto de «En el proyecto»; también la esquina de la ventana. Doble clic en un separador: su tamaño de antes; con el teclado, Tab y flechas. Los tamaños se recuerdan para todos los proyectos.
- Arreglo: las rutas recortadas salían al revés («\:G» en vez de «G:\»).
- **Casillas y acciones en la vista ☰ Lista**: marca proyectos (Mayús+clic marca un tramo, la casilla de arriba marca todo lo que está a la vista, Ctrl+A también) y la cabecera de la tabla se vuelve la barra de acciones: **Estado ▾** para todos, **📂 Abrir carpetas** (5 como mucho) y **🗑 Quitar…** (Supr). Esc desmarca. Cada fila tiene su **⋯** con Abrir proyecto, Ficha, Estado, Fijar y Quitar.
- **🗑 Quitar del organizador** dice qué pasa y dónde: la ficha va a `quitados` y tus carpetas no se tocan. Las anclas se quedan (al volver a crear el proyecto se reconocen solas), salvo que marques «Borrar también las anclas», que enseña cada ruta antes; la de una carpeta que sigue en otro proyecto nunca se borra. Al terminar, **↶ Deshacer** durante unos segundos.
- **↶ Proyectos quitados** (en ＋ Nuevo ▾, en ⚙ Ajustes › 🗂 Proyectos y en la pantalla vacía): recuperar uno, los marcados, o vaciar (lo único que borra de verdad). Al recuperar, si se borró el ancla de una carpeta, vuelve con el mismo id.
- El aviso «Tienes N proyecto(s) en DeskLens sin ficha» se cierra con ✕ y ya no vuelve a salir, salvo que aparezca otro proyecto sin ficha. Se pueden convertir igual desde 🔍 Buscar en discos.
- Arreglo: un archivo abierto desde Flujo o Red que cerraste ya no se vuelve a abrir solo al regresar al Contenedor. El último archivo del proyecto se reabre solo al entrar al proyecto, y si cierras su pestaña se olvida.
- **◉ Red ordenada en forma de sol**: el proyecto en el centro, las partes en un anillo y sus carpetas en abanico por fuera, cada una en el trozo de su parte (más carpetas, más espacio). Las etiquetas van hacia fuera, con fondo para que ninguna línea las tache; los nombres largos se recortan con «…» y salen enteros al pasar el ratón. Lo que moviste a mano se respeta; **↺ Reacomodar** vuelve al orden en sol.
- Pizarra: sin el recuadro gris al moverse ni el círculo gris al pulsar el fondo.
- **Vuelve donde lo dejaste**: si cerraste DeskLens con el tablero abierto, al abrirlo vuelve al mismo proyecto, pestaña y vista; y 🗂 te lleva al último proyecto en el que estabas (← Tablero para ver todos).
- **Moverse en Flujo y Red más fluido**: el resaltado de vecinos espera a que el ratón se quede quieto, y el minimapa y los 💬 ya no se redibujan en cada fotograma.

## v1.168 · 2026-11-21 · Proyectos: cada uno recuerda su vista, índice por tipo, Ajustes, Ctrl+E, mapa para la IA y respaldo
- **Cada proyecto recuerda su vista**: pestaña, búsqueda, ancho del árbol, carpetas abiertas, dónde estabas y el último archivo (al volver se abre solo).
- **Índice por tipo de parte**: las carpetas de los proyectos entran al buscador de DeskLens según su tipo (código, web y documentos: todo; material: nombres y texto de PDF y Word; respaldos y bases de datos: nada, solo se ven). Si cambias el modo, se vuelven a leer.
- **⚙ Ajustes › 🗂 Proyectos**: todo el organizador en un solo apartado (encendido, discos, índice por tipo, anclas en git, historial por defecto, respaldo diario, mapa para la IA, datos y actividad). El ⚙ del tablero abre ahí.
- **Ctrl+E**: lo abierto, agrupado por proyecto (sin guardar y en pantalla marcados); escribiendo busca proyectos, carpetas, archivos y acciones (VS Code, Claude, terminal…). Supr cierra la pestaña elegida.
- **MAPA.md** (historial/organizador): cada proyecto con sus partes y la ruta actual de cada carpeta, al día solo. Con una línea en tu CLAUDE.md («Copiar texto para CLAUDE.md» en Ajustes), basta decir «lee mi DeskLens» o «mis anclas».
- **Respaldo diario** de los datos del organizador en el disco que elijas (DeskLens-respaldo\organizador\<fecha>, guarda las últimas N), con «Copiar ahora» y «Abrir carpeta».

## v1.166 · 2026-11-20 · DeskLens se abre en su propia ventana, sin Edge
- DeskLens ya no abre Edge: tiene su propia ventana de Windows, con su icono en la barra de tareas, sin pestañas ni barra de direcciones del navegador.
- Recuerda dónde y de qué tamaño la dejaste. Si falta el componente de la ventana propia (el instalador lo ofrece), se abre con el navegador como antes. Se elige en ⚙ Ajustes › General › Ventana de DeskLens.
- Crear un PDF ya no falla a veces cuando Edge tarda en escribirlo.

## v1.165 · 2026-11-20 · El visor de código ya no se come líneas vacías y el editor abre donde leías
- En algunos archivos (por ejemplo un .bat con una línea vacía después de `echo.` o de `)`), el visor dejaba esas líneas vacías sin altura: veías menos líneas que en el editor y los números no coincidían. Ahora el visor muestra exactamente las mismas líneas y números que el editor.
- Al pasar a editar, el editor se abre en la línea que pulsaste o seleccionaste en el visor (si sigue a la vista), con el cursor ahí; si no elegiste ninguna, en la primera que se veía. Antes volvía a la línea 1.
- Al volver del editor al visor (con o sin guardar) también se queda en la misma zona.

## v1.164 · 2026-11-19 · Guardados aparte: verlos claros y recuperarlos sin sustos
- Al pulsar un guardado, abajo se ve con una banda ámbar «📦 Guardado aparte · «nombre»», una frase que dice que no es un commit y sus botones: ↩ Recuperar, ↩ Recuperar y dejar copia y 🗑 Borrar. Ya no se confunde con un commit (sin hash ni menú de commit) y en el historial no queda ningún commit marcado.
- Antes de recuperar, DeskLens mira si algún archivo del guardado tiene cambios tuyos ahora. Si es así, lo muestra en una tabla y ofrece: ✓ Hacer commit de mis cambios (con mensaje) o 📦 Guardar los míos aparte; después recupera.
- Si al recuperar un archivo choca (cambió en un commit después de apartarlo), se abre la pantalla de elegir versión: «Dejar mi cambio» o «Dejar lo guardado». Mientras tanto, un aviso en la columna de cambios con «⚔ Ver y elegir» y «↶ Deshacer la recuperación». El guardado se conserva hasta que lo resuelvas; al terminar, DeskLens ofrece borrarlo.
- Si git no puede recuperar nada, ya no deja archivos nuevos a medias y lo explica en español.
- La lista de archivos de un guardado ya muestra también los archivos nuevos (antes, un guardado con solo archivos nuevos salía vacío: «Este commit no cambia archivos»). La frase de arriba es más corta: «Cambios a medias de «pruebas», apartados ahora. No es un commit.»

## v1.163 · 2026-11-19 · Guardar versión: qué marca cada versión
- Nueva lista «¿Qué marca?», la primera de la ventana: ✅ Versión funcional · 🧩 Fin de un módulo (pide cuál) · 📦 Entrega al cliente · 🚀 Puesta en producción · 💾 Respaldo antes de un cambio grande · ✎ Otro (lo escribes). Se guarda al principio de la nota de la versión.
- En el panel izquierdo, cada versión lleva el icono de lo que marca (🧩 v1.0.0) y, al pasar el ratón, su nota completa.
- «Tipo» pasa a llamarse «Número» (🔧 Corrección, ✨ Mejora, 🔺 Cambio grande, según la regla estándar X.Y.Z). La primera versión muestra una sola opción: «⭐ Primera versión → v1.0.0».
- La ventana tiene la misma altura en sus tres pestañas, para que el botón no se mueva.
- Con un commit de mensaje muy largo, la ventana ya no se ensancha ni sale una barra de desplazamiento abajo.
- En Git a pantalla completa, «Traer», «Subir» y «Fusionar» pasan de la barra de arriba a debajo del commit, iguales.

## v1.162 · 2026-11-19 · Git: crear una versión, paso a paso y sin saber de números
- «🏷 Guardar versión» (antes «Versión») abre una ventana con tres pestañas. **Versión**: eliges el tipo de cambio en una lista (🔧 Corrección, ✨ Mejora o 🚀 Cambio grande) y propone el número siguiente (v1.0.1, v1.1.0, v2.0.0, siguiendo el formato de tu última versión; la primera es v1.0.0); nombre con aviso al momento («✓ libre», «⚠ ya existe», «⚠ sin espacios»), nota y «Subirla también al servidor». Avisa si hay archivos sin commit, que no entran.
- **Qué incluye (N)**: los commits desde la última versión de esa rama; «📋 Usar como nota» los copia en la nota.
- **Avanzado**: en qué commit ponerla (los 20 más recientes) y el comando de git que se ejecutará, con botón para copiarlo.
- El botón de la barra se llama «🏷 Guardar versión» y el de la ventana dice qué hará: «🏷 Guardar v1.1.0».

## v1.161 · 2026-11-19 · Git: apartar solo los archivos que elijas
- «📦 Apartar» abre una ventana con tus archivos con cambios en una tabla, cada uno con su casilla (todos marcados al abrir; «Todos» marca o desmarca). Se apartan solo los marcados y los demás siguen en tu rama; la línea de abajo lo dice («Se apartan 3 archivos; los otros 2 siguen en tu rama») y el botón cuántos.
- Clic derecho en un archivo de la columna de cambios: «📦 Apartar este archivo…» abre la misma ventana con solo ese archivo marcado (también «Abrir» y «Comparar versiones»).
- «Sin servidor» en la barra ya no sale en verde.
- El nombre es obligatorio: sin nombre, «Apartar» se apaga y la línea de abajo pide escribirlo.

## v1.160 · 2026-11-19 · Git: todas las acciones arriba, en español, y la columna de cambios en cajas
- La barra de arriba de Git tiene todas las acciones con su nombre en español y el de git entre [ ]: ⇣ Traer [pull], ⇡ Subir [push], ⟳ Comprobar [fetch], ⤵ Fusionar [merge], 📦 Apartar [stash], 🏷 Versión [tag] y ⎇ Nueva rama [branch]. Con poco ancho se esconden los [ ] y la barra usa dos líneas.
- Al lado, el estado del servidor: «✓ Al día · hace 1 min» o «↑2 por subir». «Subir 2» se pinta en morado y «Traer 3» en azul cuando hay algo pendiente; lo que no se puede, sale apagado y dice por qué.
- Nuevo: 📦 **Apartar** guarda tus cambios sin commit con un nombre ya puesto, sin cambiar de rama. 🏷 **Versión** pone un nombre fijo («v1.0», propone el siguiente número) a tu último commit, con nota opcional y la casilla «Subirla también al servidor».
- La columna derecha va en cajas como el panel izquierdo: ✎ Commit (el botón dice qué hará: «Commit de 4 archivos en «pruebas»»), ✓ Preparados y ✎ Cambios, con «− Todos» / «＋ Todos» siempre a la vista y la carpeta de cada archivo a la derecha. En pantalla completa, «Sincronizar» y «Fusionar» de la columna pasan a la barra; en el panel pequeño siguen ahí.

## v1.159 · 2026-11-19 · Git: cambiar de rama con cambios sin commit, más claro
- Al cambiar de rama con cambios sin commit sale una ventana con el título «⎇ Cambiar de «pruebas» a «main»», tus archivos en una tabla (estado, archivo, carpeta, +/−) y tres opciones en una fila:
  - 📦 **Guardarlos aparte** (elegida al abrir): con un nombre ya puesto («pruebas · 19 nov 10:42») que puedes cambiar; aparece así en «Guardados aparte».
  - 🧳 **Llevarlos a «main»**: siguen contigo en la otra rama.
  - ✓ **Commit primero**: escribes el mensaje ahí mismo y el botón «✓ Commit y cambiar a «main»» hace las dos cosas. Si el commit falla, no se cambia de rama.
- Enter aplica la opción elegida; Esc o «Cancelar» no cambian nada.

## v1.158 · 2026-11-19 · Git: clic cambia de rama, doble clic la compara con la tuya
- En el panel izquierdo de Git, un clic en una rama cambia a ella. Si tienes cambios sin commit, antes pregunta: guardarlos aparte o llevarlos contigo.
- Doble clic abre «⇆ Comparar»: arriba, en dos columnas, los commits que solo tiene esa rama y los que solo tienes tú; abajo, los archivos distintos, con dónde cambió cada uno («Cambió en»: en la otra, en la tuya o ⚠ en las 2, que puede chocar al fusionar). Un clic en un commit muestra solo sus archivos (Ctrl+clic: varios; «✕ Ver todos» vuelve). «Ver» abre el archivo en dos columnas: tu rama | la otra, o antes | después del commit elegido. Abajo: fusionar esa rama o cambiar a ella. Solo mira: no cambia nada hasta pulsar una acción.
- Lo que antes hacía el clic (ver su último commit en el historial) está ahora en el clic derecho, junto a «Comparar».

## v1.157 · 2026-11-19 · Git: el panel izquierdo en cajas
- Ramas, Guardados aparte y Versiones [tags] van cada una en su caja, con una banda de título (icono, nombre, número y ⓘ con la explicación). Un clic en la banda pliega la caja.
- Dentro, filas como las del explorador: la rama en la que estás con fondo morado y raya a la izquierda; a la derecha, en columna, su estado con un símbolo de color: ✓ al día (verde), ↑ por subir (morado), ↓ por traer (azul), 💻 solo en tu PC, ☁ en el servidor, 📂 abierta en otra carpeta (ámbar). Al pasar el ratón se explica.
- Las ramas con «/» («feature/pagos», «claude/…») se agrupan en una carpeta que se abre y se cierra; así los nombres largos ya no se amontonan.
- Las cajas vacías dicen solo «Ninguno»; la explicación está en el ⓘ.

## v1.156 · 2026-11-19 · Git: guardados y versiones siempre a la vista
- En el panel izquierdo de Git, «Cambios guardados aparte» y «Versiones marcadas [tags]» se ven aunque estén vacías, con una frase que dice para qué sirven. Antes solo aparecían si ya había alguno, y no se sabía que existían.
- «Versiones marcadas» lleva «[tags]» en el título: es el nombre que les da git. Crear guardados y versiones llegará más adelante.

## v1.155 · 2026-11-18 · Git: un proyecto por pestaña
- En Git a pantalla completa, arriba hay una pestaña por proyecto con git, con su resumen siempre a la vista: ↓ por traer (azul), ↑ por subir (morado), cambios sin commit (ámbar) o ✓ al día, y la rama debajo. Al pasar el ratón se ve todo: carpeta, rama, servidor y cada número explicado.
- La pestaña abierta se distingue de un vistazo: fondo de color, raya arriba y abajo y el nombre en el color de DeskLens.
- Un clic cambia de proyecto; la rueda del ratón mueve la barra de lado. El ▾ del final abre la lista de siempre, también con los proyectos sin git.
- El selector «Estás en» del panel izquierdo ya no hace falta en pantalla completa: lo dice la pestaña. En el panel pequeño sigue la lista.

## v1.154 · 2026-11-18 · DeskLens se siente menos «navegador» y con icono nítido
- La ventana usa un perfil propio de Edge, sin extensiones, traductor, barra lateral ni sincronización: arranca más ligera. Tus pestañas y preferencias pasan solas al perfil nuevo la próxima vez que abras DeskLens.
- Las teclas y gestos del navegador que no sirven aquí ya no hacen nada: F5, Ctrl+D/H/J/U, zoom de Edge con Ctrl+rueda, Alt+← fuera de DeskLens…
- Icono nuevo nítido en la ventana, la barra de tareas y el acceso directo (`icono/desklens.ico`).

## v1.153 · 2026-11-18 · Git: panel «Dónde estoy» más claro
- El panel izquierdo de Git muestra **Ramas** en una sola lista, con 💻 si está en tu PC y ☁ si está en el servidor. Debajo, solo si los hay, **Cambios guardados aparte** (stash) y **Versiones marcadas** (etiquetas), cada uno con una línea que explica para qué sirve.
- Un clic en una rama o versión la marca en el historial sin cambiar nada; para cambiar de rama, doble clic. Un clic en un guardado muestra sus archivos, y con clic derecho se recupera (quitándolo o dejando copia) o se borra.
- Cada sección se pliega con un clic en su título, y con más de 10 ramas aparece un filtro.

## v1.152 · 2026-11-18 · Git se abre directo a pantalla completa
- Si dejaste Git a pantalla completa, al entrar en ⎇ (o al abrir DeskLens) aparece así desde el primer momento, sin pasar un segundo por el panel pequeño.

## v1.151 · 2026-11-18 · Fusionar: qué archivos trae cada commit
- En Fusionar / Pull, «Ver: Por commit» muestra cada commit que llega como encabezado verde y, debajo, los archivos que cambió, con sus +/− y «👁 Ver cambios» (antes y después de ese commit).
- Un archivo que choca con lo tuyo lleva ⚠ y «Ir a decidir». «Por archivo» sigue siendo la lista de siempre, y lo elegido se recuerda.

## v1.150 · 2026-11-18 · Guardar ya no avisa de cambios que no existen
- Guardar mientras sigues escribiendo (o guardar dos veces seguidas) ya no muestra «Cambió en el disco» ni «Conflicto»: era tu propio guardado, que DeskLens tomaba por un cambio de otro programa.
- Si otro programa cambia de verdad el archivo, sigue avisando como siempre.

## v1.149 · 2026-11-18 · Escribir con la barra de buscar abierta ya no salta
- Con Ctrl+F abierto en el editor, escribir en otra parte ya no lleva el cursor a lo buscado ni escribe encima: solo se actualizan las marcas y la cuenta.

## v1.148 · 2026-11-17 · Al abrir un resultado del buscador se marcan todas las palabras
- Buscar «mujer divorciada» y abrir un resultado marca las dos palabras en el documento, no solo la primera, y empieza en el fragmento que pulsaste.
- Al borde derecho de la lectura sale una rayita por cada coincidencia, para ver si hay más y dónde están; con un clic saltas a ella. La cuenta «3 de 14» sigue en la barrita de buscar.

## v1.147 · 2026-11-17 · Varios archivos a la vez en el explorador
- Shift+clic marca un tramo, Ctrl+clic suma o quita uno, Shift+↑↓ amplía y Esc deja de marcar.
- Clic derecho sobre lo marcado: abrir todos (o en un grupo de pestañas nuevo), quitar de archivos sueltos, copiar rutas, copiar o mover a otra carpeta y enviar a la papelera. Supr también envía la selección a la papelera, después de preguntar y mostrar la lista.

## v1.146 · 2026-11-17 · El aviso de recuperación ya no bloquea
- Lo recuperado sin guardar se avisa en una tarjeta arriba a la derecha, sin bloquear la ventana: una tabla con archivo, último cambio y peso; un clic en una fila abre ese archivo.
- Se cierra con un clic en cualquier otro sitio o sola a los 10 segundos («Se cierra en N s», con una barrita); con el ratón encima la cuenta se para.

## v1.145 · 2026-11-17 · Accesos por teclado en Ajustes
- ⚙ Ajustes tiene al final de la columna «⌨ Accesos por teclado»: los 48 atajos de DeskLens agrupados (General, Editor, Árbol, PDF, Depurar, Git y chat), con cada tecla dibujada y lo que hace.
- El buscador de Ajustes también los filtra, por la tecla o por lo que hacen («duplicar», «ctrl d»). Solo son para consultar.

## v1.144 · 2026-11-17 · Cambiar el nombre de una pestaña (Ctrl+F2)
- Clic derecho en una pestaña → «✎ Cambiar nombre…», o Ctrl+F2 en la que ves: el nombre se escribe en la propia pestaña (Enter guarda, Esc cancela).
- Una pestaña «nuevo N» sin guardar solo cambia de nombre en DeskLens: con extensión (por ejemplo «notas.py») el editor pasa a colorear ese lenguaje sin perder ↶, se recuerda si DeskLens se cierra y «Guardar» ya propone ese nombre.
- Un archivo ya guardado se renombra en el disco, como F2 en el árbol.

## v1.143 · 2026-11-17 · El «+» de las pestañas despliega sus opciones
- El «+» de la barra de pestañas ya no abre directamente «Añadir proyecto»: despliega un menú con 📄 Archivo nuevo (Ctrl+N), 🌐 Pestaña web y 📁 Añadir proyecto o archivos…. El botón 🌐 aparte desaparece.

## v1.142 · 2026-11-16 · Ventana del índice más clara
- Arriba, una tarjeta dice si el índice está al día (con la última pasada, cuánto duró y cuándo será la próxima) o indexando (con barra de progreso y el archivo que lee).
- «Cómo funciona» explica en tres pasos qué hace el índice; una sola barra de colores con su leyenda muestra cuántos archivos tienen texto, cuántos solo nombre, PDF y errores.
- «Por tipo» en dos columnas con barritas; los errores con el nombre entero, su carpeta, un botón 📁 y el motivo en español.
- El título y el botón «Cerrar» quedan siempre a la vista: solo se desplaza el contenido.

## v1.141 · 2026-11-16 · El filtro del explorador ya no se queda «Buscando…»
- A veces el filtro tardaba unos 7 segundos: cada vez que cambiaba algo en el índice, rehacía su lista de nombres antes de responder. Ahora responde al momento con la lista que tenía y la pone al día por detrás.
- Los archivos internos de git (`.git`) ya no entran al índice cuando cambian (antes el vigilante los añadía cada vez que git traía cambios).

## v1.140 · 2026-11-16 · Ctrl+Shift+F desde el buscador Ctrl+F
- Con el buscador Ctrl+F abierto, Ctrl+Shift+F ya no se queda bloqueado: abre 🔍 Buscar con el mismo texto y busca en todos los proyectos. Sin el buscador abierto, lleva el texto seleccionado (si es de una línea).

## v1.139 · 2026-11-16 · Filtro del explorador al instante
- El filtro del árbol (Ctrl+F en el explorador) busca en el índice en vez de recorrer el disco: en un proyecto de 200 000 archivos pasa de 4 s o más a menos de medio segundo.
- Una ✕ al final del campo lo borra y vuelve el árbol entero.
- En 🔍 Buscar, los resultados se agrupan con el nombre que le diste al proyecto en DeskLens, no con el de la carpeta.

## v1.138 · 2026-11-15 · Guardar un «nuevo» más cómodo
- El nombre y la extensión van por separado: la extensión es una lista con todas las de texto (.txt, .md, .csv, .json, .py, .html, .sql…) y .docx/.pdf aparte. Por defecto, .txt. Si escribes «informe.md» en el nombre, la lista pasa sola a .md.
- La carpeta se elige en una lista con buscador (escribe para filtrar; ↑↓ y Enter).
- Nuevo botón «Examinar…»: abre un explorador de carpetas (lugares, proyectos, unidades, «Subir») para guardar en cualquier carpeta. Si está fuera de tus proyectos, el archivo queda añadido como suelto.
- Debajo se ve la ruta completa con la que se guardará.

## v1.137 · 2026-11-15 · Commits que llegan, numerados
- En Fusionar / Pull, la lista «Commits que llegan» lleva delante el número de fila (1 = el más reciente), como las otras dos listas. Si hay más de los que se muestran, la última línea dice cuáles faltan («… y 14 más (del 21 al 34)»).

## v1.136 · 2026-11-15 · Vuelven los atajos de VS Code al editor
- Alt+↑/↓ mover línea, Shift+Alt+↑/↓ duplicarla, Ctrl+Alt+↑/↓ cursor extra, Ctrl+D siguiente coincidencia, Ctrl+Shift+L todas, Ctrl+Shift+K borrar línea, Esc volver a un cursor y Alt+Z ajuste de línea funcionan otra vez en el editor de archivos. Se habían perdido al añadir el plegado de bloques (v1.96).

## v1.135 · 2026-11-15 · Git: la lista de proyectos ya no sale cortada
- La primera vez que se abría la lista de «Proyecto» en Git, al llegar el estado de cada proyecto (rama, cambios, por subir) se ensanchaba y se salía por la izquierda de la ventana. Ahora se vuelve a colocar al ensancharse.

## v1.134 · 2026-11-15 · Cerrar grupo pide confirmación
- «Cerrar el grupo» pregunta antes «¿Seguro de cerrar el grupo «nombre»?» con la lista de sus pestañas; Esc o Cancelar no cierra nada.

## v1.133 · 2026-11-15 · Grupos de pestañas, como en Chrome
- Las pestañas se juntan solas por proyecto, con una etiqueta de color delante («Atril», «homeshape»…) y una raya del mismo color debajo: se sabe de qué proyecto es cada `vite.config.js` o `.gitignore`. Se puede apagar en ⚙ Ajustes.
- Clic en la etiqueta: oculta o muestra las pestañas del grupo (plegado se ve «homeshape 2»). Si abres un archivo de un grupo plegado, se despliega solo; Ctrl+Tab salta los grupos plegados.
- Clic derecho en la etiqueta: cambiar nombre, color (8 colores), mover el grupo al otro lado, desagrupar o cerrar el grupo.
- Clic derecho en una pestaña: añadirla a un grupo nuevo (con el nombre que quieras, mezclando proyectos), a otro grupo, o quitarla del suyo. Arrastrar una pestaña junto a otras la mete en su grupo; arrastrar la etiqueta mueve el grupo entero.

## v1.132 · 2026-11-14 · Explorador más ágil
- Una carpeta que ya abriste antes se despliega al instante con lo que tenía y se pone al día sola un momento después; antes esperaba al servidor (en un repositorio grande, a git).
- Pasar el ratón por el árbol ya no calcula lo que ocupa cada carpeta: solo se calcula si te quedas encima, una carpeta a la vez y como mucho 1,5 s («ocupa más de…» si es enorme). Antes, recorrer el árbol lanzaba muchos cálculos que hacían esperar a los clics.
- El fondo de borde a borde solo se dibuja en la fila del ratón, la abierta y la del teclado, no en todas.

## v1.131 · 2026-11-14 · El árbol con aspecto de explorador
- Letra de Windows (Segoe UI), nombres en negro y filas más compactas, sin esquinas redondeadas.
- El archivo abierto se marca de borde a borde con un fondo azul marino suave y una raya azul marino a la izquierda; la carpeta elegida ya no lleva la raya morada.
- «▾ PROYECTOS» y «▾ SUELTOS» son barras que se quedan arriba al desplazarse y se pliegan con un clic. Los botones (nuevo archivo, nueva carpeta, añadir, filtrar, plegar, .bak) van a la derecha de «PROYECTOS» y aparecen al pasar el ratón por el panel.
- Proyectos en negrita y separados por una línea fina; líneas guía más suaves; barra de desplazamiento fina que solo se ve al pasar el ratón.

## v1.130 · 2026-11-14 · Carpetas en azul marino
- Los iconos de carpeta del árbol pasan del amarillo del Explorador de Windows al azul marino de DeskLens (el mismo de la línea guía y de fusionar), en tema claro y oscuro.

## v1.129 · 2026-11-14 · Explorador: teclado, iconos, contador y filtro
- Teclado en el árbol (clic en una fila primero): ↑ ↓ para moverse, → abre una carpeta o entra en ella, ← la cierra o sube a la carpeta madre, Inicio/Fin, AvPág/RePág, Enter abre. Si escribes letras, salta al nombre que empieza así («sca» → «SCAN…»).
- F2 cambia el nombre en la misma fila: Enter guarda, Esc cancela. Supr envía a la papelera (pregunta antes).
- Cada tipo de archivo tiene su icono y su color (PDF rojo, Word azul, Excel verde, imagen, código, comprimido…), y las carpetas se ven abiertas o cerradas.
- Al final de cada carpeta se ve cuántas carpetas y archivos tiene dentro, contados como en YouTube (999 · 1 K · 1,5 K · 1,2 M), o «vacía». Si estrechas la barra lateral, el contador se oculta.
- Al pasar el ratón: el tamaño y la fecha de cada archivo; en las carpetas, lo que tienen dentro y cuánto ocupan.
- La línea guía del nivel donde estás se pinta en azul marino.
- 🔎 arriba o Ctrl+F en el árbol: filtra por nombre, también dentro de carpetas cerradas (sin importar tildes ni mayúsculas). Con ↓ pasas a la lista; Esc lo cierra.
- Nuevo ajuste «Carpetas compactas» (apagado): una carpeta que solo tiene otra carpeta dentro se muestra junto a ella, «recursos / solo / honda».

## v1.128 · 2026-11-14 · Fusionar: «Se fusionan sin problemas» en una barra verde y pestaña elegida sin fondo
- «Se unen solos» pasa a llamarse «✓ Se fusionan sin problemas», con la frase «git los junta automáticamente: no hay nada que elegir».
- Es una barra con fondo verde suave: se nota que está todo bien, y un clic en cualquier parte de la barra abre o cierra la lista.
- La pestaña elegida al ver un archivo ya no lleva fondo verde: queda blanca, con el borde y el título en verde.
- Las dos listas (los archivos por decidir y los que se fusionan sin problemas) llevan una primera columna «#» con el número de cada fila.
- «👁 Ver cambios» de un archivo que se fusiona sin problemas enseña dos columnas, «lo que tienes ahora | así quedará», con una frase arriba: si solo cambió la otra rama, si las dos cambiaron partes distintas (git junta las dos), si llega nuevo o si se borra.
- La barra de cambios de la derecha es más ancha y hace de barra de desplazamiento: marca con un recuadro el trozo que se ve, se puede arrastrar, y una línea cambiada sale mitad roja, mitad verde.

## v1.127 · 2026-11-14 · Fusionar: la opción elegida se ve en verde
- La pestaña de la opción elegida se marca en verde fuerte (fondo, borde y título).
- Con una opción ya elegida, el botón de arriba dice «✓ Guardar y volver», en verde y más grande; «Guardar y volver a la lista» de «Editar manualmente» también va en verde.

## v1.126 · 2026-11-14 · Fusionar: los archivos por decidir en una tabla
- En vez de una tarjeta grande por archivo, una tabla: archivo, ubicación, qué pasa y una lista para elegir cómo queda. Un clic en el título de una columna la ordena; si la ubicación es larga se ve su final.
- «Ver y elegir» ahora se llama «Ver detalles» (elegir ya se puede desde la tabla). Los commits que llegan van plegados.
- «Falta decidir N archivos» sale en rojo y no deja fusionar hasta decidirlos todos.

## v1.125 · 2026-11-14 · Historial de lo que cambia fuera de DeskLens
- Lo que cambias con otros programas o con una IA en tus proyectos y sueltos queda en el historial del archivo como «📂 Cambiado fuera de DeskLens». En Windows se guarda cuando el archivo lleva 10 segundos sin cambiar (si la IA escribe muchas veces seguidas, queda un solo paso); lo que pase con DeskLens cerrado se anota en el siguiente repaso.
- Solo texto de hasta 1 MB, sin carpetas generadas (node_modules, vendor, dist, build…). Para no llenar el disco se quedan todos los de la última hora, uno por hora del último día y uno por día de antes; y al pasar del tope de MB se borran primero los pasos más viejos de todos los archivos, no el historial entero de uno.
- Tres ajustes nuevos en «Historial de cambios»: activarlo, los segundos de espera y el tamaño máximo.

## v1.124 · 2026-11-14 · Git más ágil al elegir proyecto y rama
- La lista de «Proyecto» se abre al instante con el último estado conocido y se pone al día sola en un momento; revisar el estado de todos los proyectos es unas 5 veces más rápido.
- Al elegir un proyecto se marca con ⏳ enseguida; mientras carga, la lista de ramas no responde a clics.
- Las ramas van siempre en orden alfabético: la actual ya no sube arriba al cambiar, así no se da clic derecho a la equivocada.

## v1.123 · 2026-11-14 · El índice no molesta a otros programas y no se borra por error
- Nuevo ajuste «Uso máximo del procesador al indexar» (Índice, 20 % de entrada): indexar tarda más pero ya no frena a los demás programas. En Windows, además, el índice va en segundo plano (CPU y disco con prioridad baja). Los PDF también respetan ese límite.
- Si config.json falta o está vacío (por ejemplo, al moverlo a otra carpeta), el índice ya no se vacía. Lo de un proyecto en un disco desconectado también se conserva.
- config.json se lee aunque el Bloc de notas le haya puesto BOM; si está roto, se guarda una copia en config.roto.json antes de que se escriba encima.

## v1.122 · 2026-11-13 · Sombrear lo que seleccionas y ver los cambios al editar a mano
- Al seleccionar una palabra o trozo de una línea, todas sus apariciones se sombrean en amarillo: en el editor, en la lectura y en las comparaciones al fusionar (en el editor también se marcan en la barra de scroll).
- «Editar manualmente» colorea en verde las líneas distintas de lo que tienes ahora y pone una raya roja donde se quitó algo; la barra de la derecha lo resume y lleva a cada cambio.
- La barra de marcas de cambios es más ancha y se ve mejor.

## v1.121 · 2026-11-13 · Comparar en dos columnas al elegir versión
- Cada pestaña enseña dos columnas que se mueven juntas: a la izquierda lo que tienes ahora y a la derecha cómo quedará. En rojo lo que se quita y en verde lo que se añade.
- «Dejar mi cambio» también enseña los dos archivos, con el aviso «✓ Tu archivo no cambia».

## v1.120 · 2026-11-13 · Elegir versión en pestañas
- «👁 Ver y elegir» es ahora una ventana más pequeña con una pestaña por opción (Unificar cambios, Dejar mi cambio, Dejar cambio que llega, Editar manualmente): la que ves es la que eliges.
- Cada pestaña compara con lo que tienes ahora: en rojo lo que se quitaría de tu archivo y en verde lo que se añadiría («✓ Tu archivo no cambia» si nada cambia). Barra a la derecha con marcas de los cambios.
- «Editar manualmente» siempre disponible en los archivos de texto. Azul marino para lo elegido, más sobrio.

## v1.119 · 2026-11-13 · Elegir con un clic y editar manualmente al fusionar
- En «👁 Ver las dos», cada columna se resalta al pasar el ratón y se elige con un clic. Los cambios van en negrita, el resto más tenue, y cada columna se abre centrada en su primer cambio.
- Nombres más claros: «Dejar mi cambio», «Dejar cambio que llega», «Dejar los dos cambios» y «Editar manualmente».
- «Editar manualmente» se hace ahí mismo: empieza con los dos cambios juntos, «Guardar y volver a la lista» y se escribe al fusionar. Cada archivo de la lista muestra lo elegido («✓ Dejar mi cambio», «✎ Editado manualmente»).

## v1.118 · 2026-11-13 · Fusionar y traer cambios en una sola pantalla
- ⤵ Fusionar, Pull y «Pull desde» abren una sola pantalla que lo comprueba todo antes de tocar nada: los commits que llegan, los conflictos, tus cambios sin commit en archivos que también llegan, archivos nuevos tuyos con el mismo nombre y archivos abiertos en otro programa.
- Cada archivo con algo que elegir dice qué pasa y qué hará cada opción («Juntar las dos», «Quedarme con la mía», «Quedarme con la que llega», «Mezclar a mano», «Borrarlo»…). Las vistas previas se abren en otra ventana encima.
- «Fusionar» lo hace todo de una vez; solo «Mezclar a mano» abre el editor para terminar.

## v1.117 · 2026-11-13 · Vista previa de la fusión más clara
- Arriba, la respuesta en grande: «✅ Se puede fusionar sin problemas», «⚠️ Hay N archivos que tendrás que elegir» o «✅ Ya tienes todo».
- Se ven los commits que llegan (fecha, autor y mensaje) y cada archivo con lo que le pasará, en letra normal y con «👁 Ver cambios».

## v1.116 · 2026-11-13 · Fusionar con vista previa y conflictos explicados
- Antes de fusionar, una vista previa dice qué pasará con cada archivo (se une solo, llega nuevo, se borra o tendrás que elegir), sin tocar nada.
- Durante una fusión, la vista Git dice qué se fusiona y si hay conflictos, con «⚔ Ver y elegir», «✓ Confirmar la fusión» o «✕ Cancelar la fusión».
- Cada conflicto se resuelve con dos botones que dicen el resultado («Quedarme con MI versión», «Borrar el archivo»…); «👁 Ver diferencias» enseña las dos versiones y cómo quedará. Al final, un resumen antes de hacer el commit.

## v1.115 · 2026-11-13 · Historial de cada línea
- Al editar, a la derecha de la línea sale `[💾N ⎇N]`: cuántas veces cambió en disco y en commits de git. Al pulsarlo, el historial de esa línea en dos pestañas (💾 Ediciones en disco en azul, ⎇ Commits de git en morado) con el antes y después pintado.
- «⤢ Ver en su contexto»: el archivo entero en esa versión, con la línea resaltada y lo demás atenuado, ◀ ▶ entre versiones y ← Volver.
- «↩ Volver a esta versión» cambia solo esa línea en el editor; «⇆ Ver el commit entero» muestra sus archivos.

## v1.114 · 2026-11-13 · Línea sombreada, Guardar vuelve a lectura y Ctrl+A en casi todo
- Al pasar el ratón se sombrea la fila con su número, al leer y al editar; al editar, la línea del cursor queda marcada. En Markdown, tablas y cuadernos se sombrea el párrafo, la fila o la celda.
- El botón Guardar guarda y vuelve a lectura en la misma línea; Ctrl+S guarda sin salir de la edición.
- Ctrl+A también en la consola (su salida) y en el panel de IA (la conversación), nunca toda la ventana.

## v1.113 · 2026-11-13 · Ctrl+A selecciona solo el documento
- En lectura, Ctrl+A selecciona solo el texto del archivo abierto (sin árbol, pestañas ni números de línea); con la vista dividida, solo el lado activo.
- En cuadros de texto, el editor y la consola sigue como siempre.

## v1.112 · 2026-11-13 · Descartar un cambio desde el aviso de fusionar
- En la tabla de «No se puede fusionar», cada archivo tiene «↶ Descartar» (pide confirmación). Cuando ya no queda ninguno, se fusiona sola.

## v1.111 · 2026-11-13 · Fusionar con cambios sin commit: se explica y se resuelve
- Antes, merge o pull fallaban con «Your local changes… would be overwritten» y no decían qué hacer.
- Ahora sale una tabla con esos archivos (tus cambios, fecha, tamaño y qué hizo la otra rama), ordenable por columnas, y dos salidas que no pierden nada: «Commit y fusionar» o «Guardar aparte y fusionar».

## v1.110 · 2026-11-12 · Detalle del commit más compacto
- La cabecera ocupa dos líneas: título, autor, fecha, rama y archivos. El resto (mensaje completo, email, padres, ramas) se abre con «▸ Ver detalle» y se recuerda.
- Ver y Abrir pasan a la primera columna de la tabla de archivos.

## v1.109 · 2026-11-12 · «✅ En orden» también solo si lo pides
- Va con el mismo ajuste que «Sin reglas» y «Sin bitácora» (⚙ Ajustes › Bitácora).

## v1.108 · 2026-11-12 · Avisos «Sin reglas» y «Sin bitácora» solo si los pides
- Ya no salen por defecto. Se activan en ⚙ Ajustes › Bitácora.
- Sirven para trabajar con IA: `reglas.md` guarda las normas del proyecto y `bitacora.md` todo lo realizado, así un chat nuevo retoma el trabajo sin volver a explicarlo.

## v1.107 · 2026-11-12 · Novedades y número de versión
- Icono ⓘ arriba en la cinta con la versión de esta copia; al pulsarlo, la lista de versiones y qué trae cada una.
- Sirve para saber si una copia en otro equipo está al día: si el número no coincide, una de las dos es más vieja.

## v1.106 · 2026-11-11 · «Ver» de un commit ya no sale vacío
- Si el archivo no cambió después de ese commit, se compara el antes y el después del commit.

## v1.105 · 2026-11-07 · Máximo de pestañas de consola en Ajustes
- ⚙ Ajustes › Consola: cuántas pestañas se guardan (5 por defecto). Las que siguen en marcha nunca se quitan.

## v1.104 · 2026-11-07 · El servidor ya no se apaga con la ventana abierta
- Tras suspender el PC salía «Failed to fetch». Ahora solo se apaga al cerrar la ventana.

## v1.103 · 2026-11-05 · «Abrir con…» funciona con rutas con espacios

## v1.102 · 2026-11-05 · Vista previa en vivo del .md/.html en el otro lado
- Con la misma pestaña en los dos lados, lo que escribes en uno se ve al momento en el otro.

## v1.101 · 2026-11-05 · Duplicar pestaña a la derecha o abajo

## v1.100 · 2026-11-05 · 🐞 Depurar paso a paso: Batch (.bat/.cmd)

## v1.99 · 2026-11-05 · 🐞 Depurar paso a paso: JavaScript

## v1.98 · 2026-11-05 · 🐞 Depurar paso a paso: Python
- Puntos de parada con clic en el margen; Continuar (F5), Paso (F10), Entrar (F11) y Salir (Mayús+F11).

## v1.97 · 2026-11-05 · Migas del código: archivo › clase › función

## v1.96 · 2026-11-05 · Tema claro/oscuro en Ajustes y plegar bloques de código

## v1.95 · 2026-11-05 · Colores de código como VS Code, al leer y al editar

## v1.94 · 2026-11-05 · La marca azul del cursor salía en otro sitio

## v1.93 · 2026-11-05 · Proyecto sin git: empezar a usar git y conectar con un servidor

## v1.92 · 2026-11-05 · Rama abierta en otra carpeta (worktree)

## v1.91 · 2026-11-05 · Volver a Git a pantalla completa al cerrar el archivo

## v1.90 · 2026-11-05 · Instalador: arreglado el error con winget

## v1.89 · 2026-11-05 · Empaquetar para otro equipo
- `empaquetar.bat` crea un .zip con solo lo necesario, sin tus datos.

## v1.88 · 2026-11-05 · Una ventana o varias

## v1.87 · 2026-11-05 · «Reiniciar ahora» y nunca dos servidores en el mismo puerto

## v1.86 · 2026-11-04 · «Ver» del detalle del commit: Disco (actual) a la izquierda

## v1.85 · 2026-11-04 · Día/Semana/Mes en el título del gráfico

## v1.84 · 2026-11-04 · «Unir autores»: ancho según los proyectos

## v1.83 · 2026-11-04 · «Unir autores» rehecho: filas por persona, columnas por proyecto

## v1.82 · 2026-11-04 · Estadística de varios proyectos juntos y «Unir autores»

## v1.81 · 2026-11-04 · Estadística: bloques que se arrastran y se pliegan

## v1.80 · 2026-11-04 · Estadística: los números no se salen de su tarjeta

## v1.79 · 2026-11-04 · 📊 Estadística (parte 2): palabras y horas por cambios

## v1.78 · 2026-11-04 · 📊 Estadística de Git (parte 1)

## v1.77 · 2026-11-04 · Nº de archivos en cada fila del historial de Git

## v1.76 · 2026-11-04 · Proyectos con el mismo nombre

## v1.75 · 2026-11-04 · Terminal para escribir órdenes

## v1.74 · 2026-11-04 · Consola: como mucho 7 pestañas

## v1.73 · 2026-11-04 · Abrir con… y DeskLens en Windows

## v1.72 · 2026-11-04 · La consola de git se oculta sola al terminar bien

## v1.71 · 2026-11-04 · Menú de ramas: Pull desde, Push a, clic derecho y Fusionar

## v1.70 · 2026-11-04 · Pestaña 🙈 Ignorados en Git

## v1.69 · 2026-11-04 · Panel de proyecto y ramas más claro

## v1.68 · 2026-11-04 · Comparador al instante y ⋮ más fácil de pulsar

## v1.67 · 2026-11-04 · Lista de versiones compacta

## v1.66 · 2026-11-04 · Pantalla de Git ajustable y recordada

## v1.65 · 2026-11-04 · Listas de commits más fáciles de leer

## v1.64 · 2026-11-04 · Historial de Git más sencillo

## v1.63 · 2026-11-04 · Todo clic responde al instante y Git más rápido

## v1.62 · 2026-11-04 · Dos sesiones en la misma carpeta

## v1.61 · 2026-11-04 · Detalle del commit: tabla ordenable y datos completos

## v1.60 · 2026-11-04 · Instalador: comandos visibles y sin winget

## v1.59 · 2026-11-04 · Cambiar de rama con cambios sin commit

## v1.58 · 2026-11-04 · Instalador para Windows

## v1.57 · 2026-11-04 · Git a pantalla completa con grafo

## v1.56 · 2026-11-04 · Git: Sincronizar y comprobar cambios solo

## v1.55 · 2026-11-04 · Atril pasa a llamarse DeskLens

## v1.54 · 2026-11-04 · Elegir el navegador de la ventana

## v1.53 · 2026-11-04 · Vista Git: commit, ramas, pull, push y merge

## v1.52 · 2026-11-04 · Ctrl+J para la IA, Ctrl+G ir a la línea

## v1.51 · 2026-11-04 · Revisión técnica y mejoras de uso

## v1.50 · 2026-11-03 · Código comentado

## v1.49 · 2026-11-03 · El documento se pintaba encima del panel de IA

## v1.48 · 2026-11-03 · Atajo para el panel de IA

## v1.47 · 2026-11-03 · Pestaña web: no se recarga al cambiar de pestaña

## v1.46 · 2026-11-03 · La ventana entera se desplazaba hacia un lado

## v1.45 · 2026-11-03 · Capturas para el README

## v1.44 · 2026-11-03 · Vista dividida, comparar archivos y pestaña web

## v1.43 · 2026-11-03 · Funciona en Windows, macOS y Linux

## v1.42 · 2026-11-03 · Avisos propios en lugar de los del navegador

## v1.41 · 2026-11-03 · Panel de IA sin 🧹 Limpiar

## v1.40 · 2026-11-03 · La IA recibe la página del PDF que se ve

## v1.39 · 2026-11-03 · Pestañas: Ctrl+W, Ctrl+Tab y arrastrar

## v1.38 · 2026-11-03 · PDF: hueco a la izquierda

## v1.37 · 2026-11-03 · PDF en blanco

## v1.36 · 2026-11-03 · Vista «Buscar» aparte

## v1.35 · 2026-11-03 · Clic derecho en pestañas

## v1.34 · 2026-11-03 · Imprimir

## v1.33 · 2026-11-03 · Clic derecho propio

## v1.32 · 2026-11-03 · Árbol y archivo abierto se actualizan solos

## v1.31 · 2026-11-03 · Orden del árbol por proyecto

## v1.30 · 2026-11-03 · Comparador: pestaña «Archivos»

## v1.29 · 2026-11-03 · Comparador: archivos de cada commit

## v1.28 · 2026-11-03 · Comparador: lista de cambios y mapa

## v1.27 · 2026-11-03 · Quién escribió cada línea en el comparador

## v1.26 · 2026-11-03 · Comparar versiones (git)

## v1.25 · 2026-11-03 · Buscar y reemplazar como VS Code

## v1.24 · 2026-11-03 · «Añadir proyecto o archivo suelto» rehecho

## v1.23 · 2026-11-03 · Atajos de edición de VS Code en el editor

## v1.22 · 2026-11-03 · ⚙ Ajustes rehecho a lo ancho, con filtro

## v1.21 · 2026-11-02 · Aviso «Cambios sin guardar»

## v1.20 · 2026-11-02 · Historial de cambios (↶ ↷) en disco

## v1.19 · 2026-11-02 · Visor de PDF propio

## v1.18 · 2026-11-02 · Editar PDF

## v1.17 · 2026-11-02 · Editar imágenes

## v1.16 · 2026-11-02 · Editar un Word a mano

## v1.15 · 2026-11-02 · Imágenes y cualquier archivo en el chat

## v1.14 · 2026-11-02 · Arrastrar al chat

## v1.13 · 2026-11-02 · Envío inmediato y cambios de la IA sin doble paso

## v1.12 · 2026-11-02 · Chat vinculado a la pestaña

## v1.11 · 2026-11-02 · Cambiar formato de un Word desde el chat

## v1.10 · 2026-11-02 · Buscador con Aa / nombre / contenido

## v1.9 · 2026-11-02 · Nuevo archivo/carpeta, «nuevo 1», recuperación y ⚙ Ajustes

## v1.8 · 2026-11-02 · Índice de búsqueda, git por archivo e (i) información

## v1.7 · 2026-11-02 · Crear .docx y .pdf desde el chat

## v1.6 · 2026-11-02 · Posición y tamaño de la ventana recordados

## v1.5 · 2026-11-02 · Panel de IA rehecho como un solo chat

## v1.4 · 2026-11-02 · Claude gasta muchos menos tokens fijos

## v1.3 · 2026-11-02 · Retoques de interfaz

## v1.2 · 2026-11-01 · Explorador, edición, plantillas, consola e IA

## v1.1 · 2026-10-31 · Primera versión
