# Bitácora de DeskLens
Entradas nuevas arriba. Formato: `## AAAA-MM-DD · título` + 2–4 líneas (qué, por qué, pendiente).

## 2026-11-22 · Organizador: filtro siempre visible y pizarra más fluida
`organizador.js`: `filtroPizarra` crea el cuadro una vez (`.ofcab`) y `pintar()` solo rehace los tipos (antes rehacía todo y había que devolver el foco); los tipos se ven con `:focus-within` o `.fijo` (▾); `tabIndex -1` en la caja para que un clic dentro no los cierre. `aplicarFiltro` usa `cacheDir` (lo leído) y `desplegarEnLote` (marca `lote`: `desplegar` no ordena ni repinta; al final un `ordenarRama` por rama); también al volver al proyecto. Filtro de nombre: no esconde carpetas abiertas (ni en el explorador). Rueda: deltas acumulados y aplicados en `requestAnimationFrame`. Medido: filtrar 9–20 ms tras la pausa de 160 ms (antes, una lectura de disco y un reordenado por carpeta).

## 2026-11-22 · Organizador: lo desplegado sin montarse
`organizador.js`: `ordenarRama(cy, n, flujo, animar)` recoloca todo lo desplegado de la carpeta del proyecto de la que cuelga (`anclaDe`): Red en abanico con un hueco por carpeta proporcional a lo que tiene abierto (`desc`), Flujo en filas de 4 con el ancho de cada rama (`medir`/`colocar`). Luego `separar()` (cajas con su nombre; solo mueve `.sub`/`.mas`, en Flujo solo de lado) y otra pasada tras `ladosRed` porque los nombres cambian de lado. Anima desde donde estaban. Se llama al desplegar y al plegar. Red: `min-zoomed-font-size` en lo desplegado. Probado con 3 carpetas de 14 archivos + 6 documentos: 0 solapes en Red y en Flujo (antes, decenas).

## 2026-11-22 · Organizador: 🎯 foco, 🔍 filtro y 🗂 Explorador en el panel derecho
`organizador.js`: `enfocar(f, cy, ruta)` abre el camino con `desplegar` (desde `raizDe`), pliega los `.sub` abiertos fuera del camino y `marcarFoco` (clase `.fuera` en todo menos camino + contenido; sube por aristas sub/jer/etapa y por el bloque compuesto; camino `.ofoco` arriba). `quitarFoco` con clic en el fondo o Esc. Doble clic: foco (otra vez en el enfocado: pliega). Filtro: `CATS`/`catDe`/`pasaFiltro`; `desplegar` filtra antes del límite y guarda todo en `cy.scratch('todos')` para contar; `aplicarFiltro` vuelve a desplegar y re-marca el foco. Panel: `armarPanel` (pestañas, ancho), `explorarEnPanel` usa `arbol()` (ahora devuelve la promesa de su restauración: si no, marcaba antes de que terminara y se perdía) con sus propios clics; `marcarExplorador`, `filtrarExplorador`. `aislar()`: los clics del filtro y del camino no llegan a Cytoscape (contaban como «clic en el fondo» y quitaban el foco). Arreglos de paso: el nodo 'p' no se re-desplegaba al volver; en Flujo lo de dentro sigue el lado de su carpeta.

## 2026-11-22 · Organizador: «Contenedor con nombre» (raíz = nombre o ★)
`organizador.py`: campo `raiz_nombre` en la ficha (`_limpiar`; al encenderlo `nombre_sigue` = False y ya no se vuelve a poner al cambiar de ★), `restaurar_version` lo conserva, posiciones también en `flujo:nombre`/`red:nombre` (solo si llegan). Crear sin partes ya valía.
`organizador.js`: `modelo()` con `conNombre`: raíz 'p' = nombre (icono `etiqueta`), nodo compuesto `bloque:entornos` (las etapas llevan `parent`, cadena sin arista desde 'p'), las demás partes salen del bloque. `vistaPos()` separa las posiciones por modo; el bloque no se guarda ni se mueve a mano (su sitio sale de sus etapas). `cadenaDe` empieza en la primera etapa del bloque; `flujoBloque()` (breadthfirst del resto y encima la fila y el nombre); `radial()` centra el bloque y pone el nombre arriba. Árbol: rama propia con 🏷 nombre → Entornos → partes. `itemConNombre()` (fila `{el, btn}` de `openMenu`): el repintado cierra el menú (el visor pierde el foco), así que lo vuelve a abrir en su sitio. ★ Hacer principal queda desactivado con el modo nombre. Al probar: la pantalla emulada a 1280×800 cambiaba de escala entre capturas y un clic cayó en «Mover a › Entornos» (deshecho en la copia).

## 2026-11-22 · Organizador: la terminal sin salir del proyecto
`organizador.js`: `accion('terminal')`, «>_ Terminal aquí» del árbol y del panel ⓘ ya no llaman a `adminSalir(); cerrar()`: `#panel` está en `<main>` junto a `#org` (fila 1), así que la consola sale debajo de la vista del proyecto.

## 2026-11-22 · Organizador: el árbol del proyecto se entera de los renombrados
`index.html`: `renameOnDisk` emite `desklens:renombrado` {de, a}. `organizador.js`: `refrescarArbol(de, a)` cambia en `O.adm.abiertas` y `O.adm.ultimo` las rutas renombradas y vuelve a leer las carpetas desplegadas (`abrirCarpeta(n, T, true)`), conservando el desplazamiento; si lo renombrado es una carpeta del proyecto, `cargar()` (el ancla dice dónde está). También al volver a la ventana (`focus`), para lo renombrado fuera de DeskLens. Sin comprobar en la copia aislada: renombrar desde dentro una carpeta raíz (DeskLens no deja renombrar fuera de lo añadido).

## 2026-11-22 · Organizador: 🔍 en Examinar y bloques que se arrastran en ＋ Nuevo proyecto
`organizador.py`: `buscar_carpetas(en, q, archivos)` por niveles con `os.scandir`, clave `normalizar` (sin acentos ni separadores), salta `SALTAR_BUSCAR` y ocultas, para en 200 / 6 niveles / 4 s y lo dice en `motivo`; GET `buscar_carpetas`.
`organizador.js`: el explorador pinta la lista aparte (`lista()`) para filtrar sin perder el foco; `[data-esc]` hace que el Esc general de las ventanas (en captura) deje pasar el del buscador. Separadores `.onvsep` con un solo manejador delegado (AbortController al cerrar), tamaños en variables CSS (`--nvw` va con `min(…, 100% - 307px)`), ventana con `resize:both` y ResizeObserver. Al probar: el `close` de la ventana anterior llegaba tarde y borraba los tamaños de la nueva (ahora `if (d.open) return`); el LRM de las rutas recortadas en CSS (`content:"\200E"`) evita que `direction:rtl` dé la vuelta a «G:\».

## 2026-11-22 · Organizador: casillas en la vista Lista, quitar varios y ↶ Proyectos quitados
`organizador.py`: `quitar_ficha` guarda en la copia `_anclas` ({id: ruta}) y `_quitado`, y devuelve la ruta; `quitar_fichas(ids, borrar_anclas)` borra `.desklens-ancla` solo si el ancla está donde dice el registro y no la usa un proyecto que se queda; `quitados()`, `recuperar_quitados()` (vuelve a escribir el ancla con el mismo id si falta; no pisa una ficha que ya existe), `vaciar_quitados()`. Rutas GET `quitados`, POST `fichas/quitar`, `quitados/recuperar`, `quitados/vaciar`; `estado` y `ajustes` cuentan los quitados.
`organizador.js`: `O.marca` (no se guarda; se recorta a lo visible), `marcar()` con Mayús, `estadoVarios`, `quitarVarios` (sustituye al `ask` de un solo proyecto), `aviso()` con ↶ Deshacer, `quitadosDlg`. Al probar: la barra encima de la tabla empujaba las filas y el Mayús+clic caía en otra; ahora ocupa la cabecera de la tabla.

## 2026-11-22 · Organizador: ＋ Nuevo proyecto a mano y barra del tablero en una fila
`organizador.py`: `analizar_ruta` (existe, git, tipo y etapa sugeridos, en qué proyectos está, dentro de / contiene), `sugerencias` (LIKE sobre carpetas.db del último recorrido, sin recorrer nada), `anadir_carpetas` (a la parte de su tipo; «Mover aquí» quita de los otros con `_quitar_de_otros`), `crear_ficha` acepta `principal_ruta`; accesos a archivos con ancla `archivo:<id>` (sin archivo de ancla; estado ok/falta; fuera de la búsqueda de anclas). Rutas GET `analizar`, `sugerencias`, POST `ficha/anadir`.
`organizador.js`: `nuevoProyecto(f, tipo)` con lista, explorador dentro (mismo /api/explorar), autocompletar, sugerencias y «Así queda» en vivo (árbol propio; Flujo y Red con `dibujar` en solo lectura). Ctrl+N en fase de captura: el «nuevo archivo» de DeskLens lo atrapaba antes. `.omini` ya era el minimapa: el segmento se llama `.onvseg`.
Descartado: diálogo nativo de carpetas (la ventana propia corre en otro proceso) y soltar desde el Explorador (la página no recibe la ruta completa).

## 2026-11-21 · Organizador: Fase 1b (v1.169)
`organizador.py`: `guardar_version()` tras cada cambio de ficha o nota (gzip en `versiones/<id>/`, índice en `indice.json`, junta los automáticos de 5 min, no guarda si no cambió), `leer_version`, `restaurar_version` (guarda antes «antes de restaurar»), `commits_proyecto` (git log de la carpeta de código → versión de ese momento), notas `notas/<id>.md` con cabecera (proyecto, destino nodo:/parte:/conector:/caja:/proyecto). `_limpiar` valida conexiones, cajas y posiciones. `organizador.js`: `modelo()` común a las 3 vistas, `diferencias()` (nuevo/quitado/movido/cambiado, notas), `dibujar()` con Cytoscape (rueda propia: desplaza; Ctrl+rueda: zoom), `minimapa()` en canvas, `notasCapa()` (💬 sobre los nodos), `panelNotas()`, `compararArbol()`. Arreglos al probar: el dbltap de Cytoscape se dispara con dos toques en nodos distintos (doble clic propio), el menú general de DeskLens va en captura (`[data-menu-propio]` en index.html), guardar el diagrama no debe pisar las partes calculadas, el icono sugerido no cuenta como cambio.
Pendiente: historial de versiones de archivos por ancla + cuota por proyecto; Fase 2.
Después: «Mover a» en el clic derecho del árbol, Flujo y Red → `POST /api/org/ficha/mover_carpeta` (`mover_carpeta()`: primera parte del tipo o una nueva junto a la de origen, quita la vacía, etapa por nombre e inserción por orden de etapa en Entornos; una etapa remota solo puede estar en Entornos). Arreglo: `admin()` repintaba con `#panes` prestado dentro del HTML viejo y lo perdía (salía «null»): ahora `devolverPanes()` siempre antes de repintar. `O.adm.cmp` es siempre un objeto: «comparando» es `cmp.v`.
Panel ⓘ: `infoMostrar()` (con `infoTok` para cortar lo que llega tarde si eliges otra cosa) → `infoCarpeta` / `infoArchivo` / `infoResumen` / `infoRemota`; `migas()` (barra de ruta desde la carpeta anclada). Servidor: `info_carpeta`, `peso_carpeta` (hilo por carpeta, máx. 3, caché 5 min, `hijos` = peso de cada hijo directo, salta enlaces/uniones y la marca de ancla), `parar_peso`, `dentro_de_proyecto` (solo bajo carpetas ancladas). Subflujo/subred: `desplegar()` añade nodos `.sub`/`.mas` con `data(desde)`; no se guardan en `posiciones` (dragfree los excluye) y se reabren desde `O.adm.exp[vista]`.
Barra única: `pestanasVista()` + `grupoHistorial` + `cablearBarra()` en Contenedor y pizarra (fuera el `<select id="aV">` y `barraComparar`). Comparativo en ventana: `comparar(f, v)` sobre `abrirDlg` (`data-tipo="cmp"`, `oninput` anulado para que «Solo cambios» no cuente como cambio sin guardar), versiones + commits ordenados por fecha, `dibujar()` dos veces en solo lectura con viewport a la par, `arbolComparado()` para el Árbol, `diferencias()` con frases. Se quitaron `versionAntes`, `navegarCambios`, `compararArbol` y el ↑↓ global; `O.adm.cmp` guarda solo el estado de la ventana (versión, vista, solo cambios). Ojo: DeskLens oculta los `<aside>` con el tablero abierto (la lista de versiones es un `<div>`).
Arreglo: `adminArchivos` reabría `O.adm.ultimo` en cada repintado del Contenedor (al volver de Flujo/Red, una pestaña cerrada se abría sola). Ahora solo con `O.adm.reabrir` (puesto en `adminAbrir`, se gasta al primer Contenedor) y `closeTab` va envuelto: si la pestaña cerrada era `ultimo` (y no se canceló), se olvida.
Carpeta principal: `principal_de(f, ruta_de)` (elegida si sigue en la ficha; si no, Código con git → cualquiera con git → Código → la primera; nunca una remota), calculada en `fichas()` (`principal`, `principal_elegida`) y en `leer_version` (la de entonces; `calcular=False` al restaurar para no fijar la de por defecto). `nombre_sigue`: el proyecto se llama como la principal (se pone al crear si coinciden, se quita si le pones otro nombre, se pone al cambiar de principal si se llamaba como la vieja). `modelo()`: la principal es la raíz `'p'` (así siguen valiendo notas «proyecto», uniones y posiciones); sus notas `nodo:` se ven ahí (`principalActual` en `idDeDestino`); `carpetaEn`/`carpetasDe` para que `diferencias()` la siga viendo como carpeta. Etapas: `cadenaDe()`; `flujoCadena()` (breadthfirst sin la cadena y luego la fila) y `radial()` con un hueco a la derecha para la cadena. Iconos: `IC` (SVG propios 24×24), `svgI/icoT/icoE/icoC` en HTML y `icoUrl` (data URI con width/height, si no Cytoscape lo pinta diminuto) dentro de los nodos; en Flujo el ancho del nodo se mide con canvas (`anchoTexto`) porque los espacios iniciales se recortan al partir líneas. Árbol: `.orama` + `.ohijos`/`.ocont` y `marcarUltimos()` para el └─. Arreglo de paso: dos versiones guardadas en el mismo milisegundo tenían el mismo número y se pisaban (prueba que fallaba a ratos).
Red radial: `radial(cy)` sustituye a `cose` (al azar, amontonaba hijos y pisaba etiquetas): árbol por aristas `jer` (y `g:` de los fantasmas), ángulo de cada parte proporcional a sus carpetas, R1 ≥ 170 y R2 con ~46 px de arco entre carpetas; cajas en fila debajo. `ladosRed()` pone `data(lado)` (der/izq/arr/aba) según el ángulo respecto al proyecto (partes: de lado, para no caer sobre sus líneas) y se recalcula en `free`. Etiqueta `data(corto)` (30 caracteres por línea) con fondo; la entera va en el `title` al pasar el ratón.

## 2026-11-21 · Organizador: Fase 1a completa (v1.168)
Vista por proyecto en localStorage `desklens.org.vista.<id>` (tab, q, arbolW, scroll, abiertas, ultimo). Índice: `org.rutas_indice()` da (carpeta, modo) por tipo de parte; `idx_targets` las recorre y `IDX_MODO` decide en `idx_file` (estado «nombre» = solo nombre; si cambia el modo, se reindexa); `/api/org/ficha|fichas|convertir|ajustes` despiertan el índice. ⚙ Ajustes: `index.html` llama a `orgAjustes.nav/seccion/enlazar/guardar` (filas `.orow.krow` para el buscador). MAPA.md/MAPA.json con `mapa_luego()` (2 s tras cada cambio; `MAPA_AUTO` apagado en pruebas). Respaldo: `vigilante()` (hilo desde `main`) una vez al día a `<disco>\DeskLens-respaldo\organizador\<fecha>`, sin carpetas.db. Ctrl+E: `#orgPal` flotante, búsqueda de archivos con `/api/arbol/filtro`. Probado en la copia del puerto 8799.
Pendiente: Fase 1b (Flujo y Red en pizarra, historial de estructura y comparativo, notas en nodos).

## 2026-11-21 · Organizador: vista del proyecto, papelera y ventanas sin bloquear (v1.167)
Clic en una tarjeta → `admin()` en organizador.js: cabecera (estado, avance con clic en la barra, git, botones) y pestañas. En Archivos, `#panes` de DeskLens se mueve dentro de la vista (`panesHome`, como `#gitv` en Git a pantalla completa) y vuelve con `devolverPanes()` al salir o cambiar de pestaña; árbol con `/api/dir` (carpetas ancladas ya pasan `allowed`), búsqueda con `/api/arbol/filtro`, tamaños con `/api/carpeta/tam`. Git: si la carpeta de código no es proyecto de DeskLens ofrece añadirla (la vista Git trabaja con `side.proyectos`). Papelera: `ubicar()` distingue `$Recycle.Bin` (estado papelera, guarda la ruta de antes; vaciada → eliminada; restaurada → ok). `orgDlg` con `show()` en vez de `showModal()`: clic fuera o Esc cierra, solo pregunta si hubo `input`. Carpetas con espacio o punto final: `larga()` (\\?\). Probado en la copia del puerto 8799.
Pendiente: índice por tipo de parte, apartado en ⚙ Ajustes, MAPA.md (M1), Ctrl+E (M2), respaldo diario; luego Fase 1b.

## 2026-11-21 · Organizador de proyectos, Fase 1a (v1.167)
Módulo aparte en `organizador/` (plan aprobado pieza a pieza en `implementar_organizador.md`). `organizador.py`: anclas (`.desklens-ancla` = {id, creada}, oculto, a `.git/info/exclude`), registro `anclas.json` (ruta, serie del volumen = `st_dev`, ID de NTFS = `st_ino`), `ubicar()` (ruta → OpenFileById por ID de NTFS), `Recorrido` en hilo (solo `os.scandir` de carpetas; modo anclas para en cuanto aparecen; modo arranque guarda nombres en `carpetas.db`), exclusiones por disco con `*` por tramo, `relaciones()` por nombre normalizado (semillas: git/archivos de proyecto/hijas de contenedores como Webs o htdocs; genéricos fuera; homeshape_calidad se absorbe en homeshape), fichas en `proyectos/<id>.json` sin rutas, `actividad.log`. Enchufe en `desklens.pyw`: import protegido, `/api/org/*`, `/organizador/*.js|css`, `allowed()` acepta carpetas ancladas, `/api/agregar` rechaza discos enteros, `git_summary(rutas)`. `index.html`: solo dos etiquetas (css + js) y el aviso del «+». Pruebas: `organizador/test_organizador.py` (incluye mover por ID de NTFS y copiar a otro sitio) y casos nuevos en `test_desklens.py`; probado en una copia en el puerto 8799 con datos temporales (G: + H: en segundos: 47 propuestas, homeshape con 11 carpetas).
Pendiente (Fase 1a): vista de administración del proyecto (árbol unido + pestañas), índice por tipo de parte, apartado en ⚙ Ajustes, MAPA.md (M1), Ctrl+E (M2), pestaña Estado (M3), respaldo diario de `historial/organizador`. Luego Fase 1b.

## 2026-11-20 · Ventana propia con pywebview (v1.166)
El usuario no quiere que DeskLens se abra con Edge; eligió ventana nativa frente a Chrome en modo app. `open_window` lanza otro proceso (`desklens.pyw --ventana URL`, `own_window`) con pywebview + WebView2: título «DeskLens» (lo sigue encontrando `win_focus_window`), icono `desklens.ico`, AppUserModelID propio, `text_select=True` (pywebview lo apaga por defecto) y localStorage en `historial/ventana_propia` (se estrena desde `WIN_DATA`). Al cerrar, Python guarda x/y/ancho/alto (en WebView2 `outerWidth` no cuenta el marco: la ventana encogería; la página ya no los manda si existe `window.pywebview`) y envía `/api/adios`. Sin pywebview o si falla: `open_browser` (lo de antes). Ajuste «navegador»: nueva opción «propia», y «auto» la pone primero. Instalador: paso 3 ofrece `pip install --user pywebview`. De paso: `html_to_pdf` espera hasta 10 s al PDF (Edge salía antes de escribirlo y la prueba fallaba). Probado: ventana abierta contra un servidor de prueba (sin procesos nuevos de Edge, sí de WebView2), cierre limpio, test_desklens.py en verde.
Pendiente: usarla en el día a día (doble clic desde el Explorador con la ventana abierta, arrastrar archivos, atajos Ctrl+W/Ctrl+Tab).

## Cómo continuar (para la próxima IA)
- **Qué es DeskLens:** visor local con pestañas para leer, editar, ejecutar y buscar archivos de varios proyectos, con un chat de IA (Claude/Codex/Gemini por sus CLIs) que gasta pocos tokens. Diseño completo y decisiones en `implementacion_desklens.md`; formatos en `formatos_desklens.md`.
- **Archivos:** `desklens.pyw` (servidor Python, solo biblioteca estándar), `index.html` (toda la interfaz), `test_desklens.py` (prueba: `python test_desklens.py` → «OK: todas las pruebas pasan»), `plantillas/`. `config.json` e `historial/` (conversaciones, índice, recuperación) están fuera de git.
- **Arrancar:** doble clic en `desklens.pyw` (abre Edge en modo aplicación). Tras cambiar `desklens.pyw` hay que cerrar y reabrir DeskLens; tras cambiar solo `index.html`, basta Ctrl+R.
- **Cómo trabaja el usuario:** escribe en español. **Antes de construir algo nuevo, dibujarlo en texto y esperar su «ok».** No instalar nada sin acuerdo. Ahorrar tokens. Prefiere lo simple: rechazó un panel de IA con modos (ver 2026-11-02). Textos en español neutro: **nunca formas de «vosotros»** («cambiasteis» → «las dos ramas cambiaron»). Botones que dicen lo que hacen y debajo una frase con el resultado.
- **Cada cambio:** una versión nueva arriba en `novedades.md` (`## vX · fecha · título` + 1–3 líneas sencillas; el número sale en ⓘ de la cinta) y una entrada aquí. Ver `reglas.md`.
- **Para verificar sin tocar su DeskLens:** levantar `desklens.Handler` en el puerto 8799 con `CONFIG`, `CONV_DIR`, `RECOVERY_DIR`, `INDEX_DB` **y `HIST_DIR`** en una carpeta temporal (sin `HIST_DIR` los pasos del historial caen en su `historial/versiones`). Para git, el script crea un repositorio de ejemplo en esa carpeta (ramas `calidad`, `pruebas` sin conflictos pero con un cambio sin commit en `shape/vite.config.js` y un `notas.txt` sin seguimiento, `cesare` con conflictos de contenido y borrado/modificado, `vieja` sin nada que traer) y lo añade como único proyecto. Se prueba en el panel del navegador (Claude Browser) con `gitMerge('pruebas')` etc. y clics reales. Ojo: en Windows dos servidores pueden escuchar el mismo puerto sin error; si hay otra sesión probando, usa otro puerto.

## Estado al 2026-11-19 (para retomar)
- **Rama `publico`**, con commit hasta v1.158 (`b133b55`); hasta v1.163 en `31b981a`; v1.164 (guardados) y v1.165 (visor: líneas vacías y posición al editar) sin commit. La pestaña «✎ Cambios» se probó y se deshizo (ver 2026-11-18). Ojo: Edge sin ventana no crea PDF en este equipo ahora y `test_desklens.py` se corta ahí; salvo eso, pasa. Revisar con `git log origin/publico..publico` qué falta subir a GitHub.
- **Fusionar / Pull / Pull desde = pantalla única** (`mergeOneDialog` en index.html; servidor `git_merge_check` GET `/api/git/fusion`, `git_merge_file` GET `/api/git/fusion/archivo`, `git_merge_apply` POST `/api/git/fusion`). Lista solo problemas (conflicto, ambos, tuyo_nuevo, bloqueado) en una tabla ordenable con un desplegable por archivo (v1.126); las vistas previas van siempre en otro modal (`#dlg2`, `mergeTwoView`): pestañas por opción y dos columnas alineadas «lo que tienes ahora | así quedará» (`sideBySideRows`), barra de marcas (`mgMarks`). «Editar manualmente» se escribe en ese modal y viaja como `textos`.
- **Lo que sigue en pie de antes:** `gitMergeBanner` (fusión empezada fuera de DeskLens o con «Editar manualmente» sin texto), `mergeChooseDialog`/`mergeDiffView`/`mergeFinalDialog` para terminarla, y `gitMergeBlocked` solo para **Sincronizar** (pull+push), que aún no pasa por la pantalla única.
- **Pendiente / ideas:** medir el freno de CPU del índice con una carpeta grande (la medición se cortó); explorador: probar el teclado del árbol en Edge con el DeskLens real; el historial de un archivo no lo sigue al renombrarlo; explorador: arrastrar y soltar para mover archivos entre carpetas (aprobado «para después»; hoy arrastrar adjunta al chat, hay que distinguir el destino); Sincronizar por la pantalla única; «⇆ Comparar lado a lado» de tu versión y la que llega si el usuario lo echa en falta; archivos binarios en la vista previa (ahora se ven como texto vacío); `git_merge_check` hace un `git log` y un `merge-file` por archivo (con cientos de archivos con problemas puede tardar).

## 2026-11-20 · Visor de código: líneas vacías y posición al editar (v1.165)
Capturas del usuario con `G:\Biblia\INICIAR-API-BIBLIA.bat`: el visor tenía 19 líneas y el editor 21. El archivo estaba bien (CRLF, líneas 10 y 19 vacías de verdad). **Causa:** highlight.js (lenguaje `dos`) deja esas líneas como `<span class="hljs-comment"></span>`; `codeView` ponía `' '` solo si la línea era la cadena vacía, así que la fila no tenía texto y medía 0 px (los números van en otra columna y se desalineaban). **Arreglo:** `hlLines` añade un espacio a toda línea sin texto visible (también la usa `codeLines` al imprimir).
**Posición:** `codeView` guarda en `.code` `data-pick` la fila pulsada; `readPos()` da la primera visible y la elegida (selección o pulsada si sigue a la vista); `startEdit` la usa para `scrollTo` + `setCursor` en CodeMirror. `leaveEdit` hace lo de `saveAndRead` (vuelve al visor en la primera línea que se veía), así que también sin guardar. Probado en el 8799 con un .bat de 300 líneas: números iguales, pulsar la 250 → el editor con el cursor en la 250; ida y vuelta conserva la zona (±3 líneas por la barra fija de arriba del visor).

## 2026-11-19 · Guardados aparte: vista propia y recuperar con choques (v1.164)
Captura del usuario: el guardado se veía abajo igual que un commit. Preguntó qué pasa si al recuperar hay cambios o conflicto; se le explicaron los tres casos de git (cambios tuyos en el archivo → se niega; cambió en un commit → conflicto y el stash no se borra; nuevo que ya existe → se niega) y aprobó la propuesta, con «Hacer commit de mis cambios» / «Guardar los míos aparte».
- **Servidor:** `git_stash_files(path, id, solo_nuevos)` (diff `id^1..id` + `id^3` de los sin seguimiento) y GET `/api/git/guardado?id=`. `recuperar_stash`/`aplicar_stash`: si chocan (`diff --diff-filter=U`) devuelven el estado con `choque_guardado: {id, archivos}`; si git se niega, borra los nuevos que ya alcanzó a crear (**git restaura los sin seguimiento antes de negarse**: lo encontraron las pruebas) y explica en español. Acción `deshacer_recuperar` (reset de esos archivos, checkout HEAD o quitar los que creó). Pruebas en test_desklens.py.
- **Ventana:** `gitStashShow` (reusa `gitCommitDetail` para la tabla y cambia `.gdh` por la cabecera ámbar `.gdst`; desmarca el historial y marca `.son` en el panel), `gitStashRecover(s, pop)` (mira `/api/git/guardado` contra tus cambios → `gitStashClear`; el id se vuelve a buscar por hash porque apartar corre `stash@{n}`), `gfRecover` + `gitRecoverBanner` en #glist mientras haya conflictos, `gitRecoverUndo`, `gitRecoverDone` (ofrece borrar el guardado si era pop). `mergeChooseDialog` con `gfRecover`: título «recuperar «x»», «Dejar lo guardado», pie «✓ Listo» / «↶ Deshacer la recuperación»; `mergeFrom` = «lo guardado».
- **Después (captura del usuario):** un guardado con solo archivos nuevos salía sin archivos: `git_files` miraba el diff del commit del stash, y los sin seguimiento van en su tercer padre. Ahora, si el commit tiene 3 padres, añade los de `^3` como «A» con `hash` = ese padre, y «Ver» usa `f.hash || c.hash`. `gitCommitDetail` recibe `guardado: true` (la clase `.gdst` va antes de pintar: «Este guardado no tiene archivos»). Frase más corta.
- Probado en el 8799: vista del guardado, recuperar con choque → «Dejar lo guardado» → Listo → borrar guardado (a.txt con lo guardado), y recuperar con cambios propios en el mismo archivo → «Guardar los míos aparte» (quedan como «mis cambios · …») y se recupera.

## 2026-11-19 · Guardar versión: «¿Qué marca?» (v1.163)
El usuario preguntó de dónde salían los tres tipos: son de Versionado Semántico (semver.org, PATCH/MINOR/MAJOR); los textos en español son míos. Propuso marcar «versión funcional» o «fin de módulo»: es otra dimensión (el hito, no cuánto cambió) y se añadió aparte, sin quitar los números.
- **Servidor:** `git_overview` da `nota` de cada etiqueta (`%(contents:subject)`, quinto campo). Prueba en test_desklens.py.
- **Ventana:** `HITOS` (func ✅, mod 🧩 con campo «¿Qué módulo?», cli 📦, prod 🚀, resp 💾, otro ✎ con «¿Cuál?»); `msg()` = «icono hito[: módulo] · nota», que va al tag y al comando de «Avanzado». «Número» = los tres tipos (🔺 para cambio grande, porque 🚀 es «producción»); sin versión anterior, una sola opción «⭐ Primera versión → v1.0.0» (antes salían tres iguales). `.tagbox` con `min-height:250px` para que no salte el botón al cambiar de pestaña. El botón de la barra y la ventana se llaman «🏷 Guardar versión».
- **Panel:** el icono de la fila es el del hito (regex al principio de `nota`) y el `title` lleva la nota.
- **Después (capturas del usuario):** un commit con mensaje largo ensanchaba la ventana (el `<select>` toma el ancho de su opción más larga): `.tagbox select{width:100%;min-width:0}`, columnas `minmax(0,1fr)`, `overflow-wrap:anywhere` en el comando y `.swbody>*{min-width:0}`. Y «Traer», «Subir» y «Fusionar» se mudan (los mismos elementos, con su id) a `.gfmv` debajo de `.gcommit` al abrir la pantalla completa; `gitFullClose` quita `.gfmv` de #gitv. Los estilos `.gfa` dejan de depender de `.gfbar`.
- Probado en el 8799: primera versión con «Fin de un módulo: facturacion» → «🧩 v1.0.0» en el panel; la segunda ofrece v1.0.1 / v1.1.0 / v2.0.0; misma altura en las pestañas.

## 2026-11-19 · Git: ventana «Nueva versión» con pestañas (v1.162)
El usuario pidió mejorar «Versión» para muchos proyectos, para gente sin experiencia y profesionales; aprobó la ventana con pestañas, selects y cajas (le pareció cargada la versión con todo a la vista). `gitTagDialog` (en `#dlg` `sets swd tagd`): pide `/api/git/grafo?todas=0`; la última versión es la primera etiqueta (`refs` «tag: …») al bajar por el historial de la rama, y «Qué incluye» son los commits anteriores a ella. `next(k)` propone X.Y.Z según el formato de la última (`^(\D*)(\d+)(.\d+)?(.\d+)?$`; si no encaja, no propone y queda «Personalizado»). Pestañas `ver` / `inc` / `adv` dentro de `.tagbox`; el estado (tipo, nombre, nota, commit, subir) se conserva al cambiar de pestaña; `foot()` pone el botón y el aviso de nombre. Crea con la acción `etiqueta` (`modo` = hash elegido) y sube con `push_etiqueta`. No hizo falta tocar el servidor. Probado en el 8799: primera versión v1.0.0, dos commits nuevos → propone v1.0.1/v1.1.0/v2.0.0, «Usar como nota», Avanzado, nombre repetido apagado, crear v1.1.0. Después, a pedido del usuario, el botón y la ventana se llaman «🏷 Guardar versión» (botón interior «🏷 Guardar vX»). Siguiente, según el usuario: «las opciones de traer» (usar las versiones: comparar, volver, notas…).

## 2026-11-19 · Git: apartar solo los archivos elegidos (v1.161)
Pregunta del usuario: «¿por qué no me permites elegir qué archivos guardo aparte?». La acción `apartar` acepta `archivos` → `git stash push [-u] -m nombre -- rutas` (sin archivos, todo). `gitStashDialog(solo)` en `#dlg` (`sets swd`): tabla `.swtab.swsel` con casilla por fila (clic en la fila = casilla), «Todos» con estado intermedio, nombre ya puesto, línea que dice qué pasará y botón «Apartar N archivos» (apagado sin ninguno); si están todos marcados manda la lista vacía. Clic derecho en una fila de #gitv: menú con Abrir, Comparar versiones y «📦 Apartar este archivo…». `.gfsync.off` gris para «Sin servidor». Prueba en test_desklens.py (solo.md apartado, h.md sigue). Probado en el 8799: apartar 1 de 2 y el clic derecho. Después, a pedido del usuario: el nombre es obligatorio (`draw` apaga «Apartar» y lo pide si está vacío; `oninput` en el campo).

## 2026-11-19 · Git: acciones en la barra y columna de cambios en cajas (v1.160)
Captura del usuario de la columna derecha. Primero pidió una caja de acciones; luego, «todas las acciones arriba en la barra donde ya están», en español con el término de git entre [ ].
- **Servidor:** acciones `apartar` (stash con nombre; `modo: nuevos` = `-u`; error si no había nada) y `etiqueta` (tag anotado, `git_tag_name` con `check-ref-format refs/tags/`, sin espacios, error si ya existe; `modo` = hash opcional) y la larga `push_etiqueta` (`git push <remoto> refs/tags/<n>`). Pruebas en test_desklens.py.
- **Barra (`gitFullOpen`):** `#gfSync` + `#gfPull/#gfPush/#gfFetch/#gfMerge` + separador + `#gfStash/#gfTag/#gfBranch`, cada uno `<span>` + `<small>[git]</small>`; `gitBarDraw` (desde `gitFullDraw`) pone textos («Subir 2» `.up`, «Traer 3» `.down»), apagados y `title` con la razón. `gitStashDialog` (ask con nombre), `gitTagDialog` (en `#dlg` `sets swd`: nombre propuesto = siguiente número de la última etiqueta, nota, «subir»; crea con `gitDo` y sube con `gitLong('push_etiqueta')`), `gitNewBranch`. `.gfbar` con `flex-wrap` (si no, en 1024 px empujaba la columna derecha fuera) y sin los [ ] por debajo de 1400 px.
- **Columna (#gitv):** el commit en `.gcommit` con banda `.gcbh`; `.gsec` con borde y banda como las cajas de la izquierda; títulos con icono; «− Todos» / «＋ Todos» siempre (4.º elemento de `acts`); botón de commit que dice qué hará. En pantalla completa se ocultan `.gsyncrow` y `#gChecked` (están en la barra); en el panel pequeño siguen.
- **Probado** en el 8799 a 1024 y 1550 px: Versión v1.0 creada y subida al remoto de prueba, Apartar con nombre (luego se apaga solo), oscuro, panel pequeño.

## 2026-11-19 · Git: ventana «Cambiar de rama» con cambios sin commit (v1.159)
Captura del usuario: la pregunta de v1.158 era un bloque de texto con tres botones. Aprobó: archivos en tabla y opciones en una fila con poco texto; nombre para el guardado; «Llevarlos a «rama»»; y «Commit primero» con el mensaje en la misma ventana (nunca un commit automático: el mensaje es obligatorio).
- **Servidor:** `git_switch(repo, name, modo, nombre)`: con modo «apartar», el stash se llama `nombre` si se escribió (si no, el «DeskLens: cambios de…» de siempre); llega en `mensaje` de la acción `cambiar_rama`. `git_overview` vuelve a dar `mas`/`menos` por archivo (`git_add_lines` con `diff --numstat` y `--cached`; los nuevos cuentan sus líneas), que se había quitado al deshacer la pestaña «✎ Cambios». Pruebas: +/− y stash con nombre.
- **Ventana:** `gitSwitchAsk` en `#dlg` (`sets swd`, `height:fit-content`: con `auto` un dialog modal se estira a toda la altura): tabla `.cbt` en `.swtab` (cabecera fija), radios `.swops`, `.swfld` con el campo según la opción (Nombre / Mensaje; el botón se apaga sin mensaje) y la línea de ayuda. «Commit primero» = `gitDo('commit', {todo: true})` y, si sale bien, `gitSwitch`. `gitSwitch(rama, modo, nombre)`.
- **Ojo (encontrado al probar):** un `<input>` sin fondo propio sale blanco con letra clara en oscuro; `.swin input` lleva `background:var(--bg)`.
- Probado en el 8799 con clics y teclas reales: commit primero (commit en «calidad» y cambio a «pruebas»), guardar aparte con nombre escrito («notas a medias»), oscuro.

## 2026-11-19 · Git: clic = cambiar de rama, doble clic = comparar (v1.158)
El usuario no entendía qué hacía el clic en una rama (saltaba a su punta en el historial y a veces encendía «Todas las ramas» sin decirlo). Pidió clic = cambiar y eligió para el doble clic «Comparar con la mía» (de tres opciones; las otras, ver la punta y ficha de la rama, quedan en el clic derecho o sin hacer).
- **Servidor:** `git_compare(path, otra)` (GET `/api/git/comparar?otra=`, solo lee; nombre validado y `..` negado): `solo_suya`/`solo_mia` con `_merge_commits` (ahora acepta `rng`), `n_suya`/`n_mia` (`rev-list --count`), `archivos` = `diff HEAD otra` (name-status + numstat) con `en` = suya/tuya/las2 según `diff --name-only merge-base..cada punta`, y `cambiados_suya/mia` para los avisos por commit. Prueba en test_desklens.py.
- **Ventana:** `brRow`: clic espera 250 ms (si llega el doble clic se cancela) y llama a `gitSwitchAsk` (pregunta apartar/llevar si hay cambios sin commit; 📂 → `gitBranchElsewhere`); doble clic → `gitCompareDialog` en `#dlg` (`sets mg cmpb`): resumen, `.cbcols` (clic filtra la tabla, Ctrl+clic suma, `sel`), tabla `.cbt` ordenable con filtro, «Ver» → `gitCompareFile` (en `dlg2`, `mgSbs` tu punta | la otra) o `mergeCommitView` (antes | después del commit), «⇄ Al revés» invierte las columnas, pie con Fusionar (`gitMerge(ref)`) y Cambiar. `gitOtherBranchMenu` añade «⇆ Comparar…» y «👁 Ver su último commit en el historial», y su «Cambiar» usa `gitSwitchAsk`.
- **Probado** en el 8799 con ramas separadas (2 commits cada lado, un archivo cambiado en las 2): doble clic no cambia de rama, filtro por commit, las dos vistas «Ver», clic con un cambio sin commit → pregunta → «Guardarlos aparte y cambiar» (queda 1 guardado).

## 2026-11-19 · Git: panel izquierdo en cajas (v1.157)
Captura del usuario: el panel «se amontona» (cada rama con nombre, 💻☁, «estás aquí» y estado en 220 px saltaba de línea; ayudas y recuadros vacíos grandes). Rechazó una lista simple y un solo árbol; eligió la combinación: una caja por sección con filas de explorador. En `gitFullSide`, `box(into, clave, icono, título, n, ayuda, extra)` hace `.gfbox` con banda `.gfbh` (la ayuda va en su `title` y en ⓘ; clic pliega con `desklens.git.secciones`) y cuerpo `.gfbb`. Ramas: `brRow` = `.gbd` (●/○) + `.gbn` (con «…») + `.gbst` (`sym`: `s-ok` ✓, `s-up` ↑, `s-down` ↓, `s-off` 💻/☁, `s-web` ☁ solo servidor, `s-else` 📂); las de «a/b» van en `.gfdir` plegable (`desklens.git.carpetas`; abierta si contiene la actual) con sangría `.gfin`; con filtro (más de 10) la lista va plana. `#gfBrH` se oculta (el ⋯ pasa a la banda). Guardados y versiones usan las mismas filas; vacías, `.gfnone` «Ninguno». Colores: los de las pestañas de proyecto (morado ↑, azul ↓, verde ✓). Probado en el 8799 con ramas «feature/…», «claude/…», sin enlazar, solo servidor, ↑2, un stash y una etiqueta; claro y oscuro; doble clic cambia de rama.

## 2026-11-19 · Git: guardados y versiones siempre a la vista (v1.156)
Pedido del usuario tras explicarle qué son las etiquetas (nombre fijo a un commit: producción, volver, comparar entregas). En `gitFullSide` las secciones `guardados` y `versiones` se dibujan siempre; vacías llevan `.gfempty` (recuadro punteado con para qué sirven) y su título no lleva `.gfhelp` (`head` ya no pinta un `<p>` vacío). Título «Versiones marcadas <span class=gfterm>[tags]</span>». Sin acciones nuevas: crear stash/etiquetas, renombrar/borrar ramas y la sección Servidor quedan para después, en el panel derecho según el usuario. Probado en el 8799 vacío y con una etiqueta `v1.0`.

## 2026-11-18 · Probado y deshecho: pestaña «✎ Cambios» (iba a ser v1.156)
Se construyó una pestaña «✎ Cambios» al estilo GitHub Desktop (lista con casillas y commit a la izquierda, diff a la derecha, últimos commits debajo como VS Code) y se quitó la columna derecha. Al usuario no le gustó: «difícil de entender; las distribuciones de antes eran más sencillas». Se deshizo entero (opción B) antes del commit; la v1.155 se conserva.
**Lección:** su distribución de Git (historial en el centro, detalle debajo, cambios en una columna a la derecha) es la de GitKraken y le resulta clara; no partir el historial ni mover el commit a otra pestaña. Si se retoman mejoras del panel de cambios (casillas, +/−, «corregir el último commit», botón que dice qué hará, diff en el detalle de abajo), hacerlas dentro de esa columna derecha. La copia de lo hecho quedó en el scratchpad de la sesión (`antes_de_deshacer_v1156`), que puede borrarse.

## 2026-11-18 · Git: pestañas de proyectos (v1.155)
Pedido del usuario: pasar a pestañas el selector de proyecto sin perder el resumen de cada uno. `gitProjTabs` (fila `#gfTabs` encima de `.gfbar`; `#gitfull` pasa a 3 filas): un `.gfpt` por proyecto con git (y el abierto aunque no tenga), nombre + señales (`pt-down` ↓, `pt-up` ↑, `pt-ch` cambios, `pt-ok` ✓) y la rama debajo; `title` con todo. El abierto usa `gst` en vivo; los demás `gitSum` (`/api/git/resumen`, como mucho cada 15 s). Se rehace solo si cambia el HTML (`dataset.h`); la rueda mueve de lado; la abierta se centra solo al cambiar de proyecto (`dataset.now`), así el refresco de 5 s no deshace lo desplazado. ▾ `.gfptm` = `gitRepoMenu` (todos, también sin git). En pantalla completa se ocultan «Estás en» y `#gfRepo`; `#gfTitle` queda en «⎇ rama ↔ remota». Probado en el 8799 con 10 proyectos de prueba (cambios, por subir, por traer y uno sin git), claro y oscuro. Después, a pedido del usuario (no se notaba cuál estaba abierta), `.gfpt.on` con fondo al 16 % del acento, raya de 3 px arriba, `inset` de 2 px abajo y el nombre en acento.
También se anotó en «Pendientes» el inventario de lo propio de DeskLens en Git y el plan basado en Sourcetree; el usuario pidió después trabajar solo en lo que él diga (los pendientes, solo como sugerencia).

## 2026-11-18 · Menos «navegador»: perfil propio, gestos y icono (v1.154)
El usuario notaba DeskLens más lento y menos natural que Obsidian (Electron, con su propio Chromium), y el icono pixelado. Con la caché llena, la página carga en 0,08 s y el estado de git en 0,15–0,18 s. Lo que pesaba era el Edge de siempre: su perfil con extensiones, sincronización, traductor y barra lateral, y sus gestos.
- **Perfil propio** (`WIN_PROFILE` = historial/ventana, `APP_FLAGS`): se usa solo cuando ya existe o ya hay copia de localStorage en `WIN_DATA` (historial/ventana_datos.json). La ventana la manda con POST `/api/ventana/datos` (solo claves `desklens.*`, nunca una vacía) a los 3 s, cada 2 min y al cerrar. El script del `<head>` la recupera de forma síncrona si el perfil no tiene nada. `lsOk` impide que una ventana sin datos (recuperación fallida) pise la copia buena; el fallo apareció al probar.
- **Gestos:** `BROWSER_KEYS` y un `wheel` con Ctrl, al final y en burbuja, de modo que lo que DeskLens ya usa llega antes con `preventDefault`. Ctrl+R se deja a propósito.
- **Icono:** `icono/` contiene el SVG grande y uno simplificado para ≤32 px, rasterizados con Edge sin ventana (`--default-background-color=00000000`), más `desklens.ico` con PNG de 16 a 256. Se sirve en GET `/icono/*`. `instalar.ps1` pone `IconLocation` y `empaquetar.ps1` incluye `icono/`.
- **Pendiente:** las librerías en el disco (`vendor/`) y la carga perezosa de las de Word y PDF, que esperan el permiso del usuario para descargarlas.

## 2026-11-18 · Git: panel «Dónde estoy» (v1.153)
Primer panel de la mejora de Git basada en Sourcetree, «sin copiarlo». El orden acordado para los paneles es 2 Dónde estoy → 3 Historial → 4 Detalle → 5 Mis cambios → 1 Barra. Sourcetree repite las ramas en «Ramas» y «Remotos» y usa palabras de git sin explicarlas; aquí se usa una lista con 💻/☁ y títulos en español con una línea de ayuda.
- **Servidor (`git_overview`):** `stashes` añade `hash` y la `fecha` pasa a epoch (`%ct`; antes era `%cr`, en inglés). Nuevos `etiquetas` (`for-each-ref refs/tags`; `%(*objectname)` para las anotadas) y `puntas` ({rama corta: hash} de refs/heads y refs/remotes). `git_action` admite `aplicar_stash` (apply) y `borrar_stash` (drop), además de `recuperar_stash` (pop).
- **Ventana (`gitFullSide`):** las secciones se pliegan con `desklens.git.secciones` y llevan la ayuda en `.gfhelp`. Un clic lleva a `gitShowCommit`, que enciende «Todas las ramas» si la punta no se ve; el doble clic llama a `gitSwitch` o `gitBranchElsewhere`. Con más de 10 ramas sale el filtro `gitBrQ`. El guardado se ve con `gitCommitDetail` y `gfSel = hash`. Sin ningún remoto no se muestra el estado («solo en tu PC» en todas no decía nada).
- **Cambio de costumbre:** cambiar de rama era un clic y ahora es doble clic.

## 2026-11-18 · ⎇ directo a pantalla completa (v1.152)
Al entrar en Git con `desklens.git.full` se veía ~1 s el panel pequeño: `sideView('g')` esperaba a `gitLoad()` (el estado del servidor) antes de `gitFullOpen()`. Ahora `gitEnter()` abre la pantalla completa en el acto con el `gst` que ya se tenía (si es del mismo proyecto) y la refresca al llegar el estado. La primera vez pone «Cargando Git…» en `#gitfull` (body.gitfull) y abre al llegar. Al arrancar DeskLens con la vista Git se hace lo mismo. Comprobado con un MutationObserver: nunca queda `vgit` sin `gitfull`.
Siguiente, pedido por el usuario: mejorar Git tomando ideas de la distribución de Sourcetree.

## 2026-11-18 · Fusionar «Por commit» (v1.151)
Pedido: ver qué archivos llegan en cada commit, agrupando la lista de «Se fusionan sin problemas».
- **Servidor:** `_merge_commits(repo, target)` sustituye la `lista` de `git_merge_check`. Hace dos `git log -n 50 HEAD..target --no-renames` (uno con `--name-status`, otro con `--numstat`) y da a cada commit `hash`, `padre`, `union` y `archivos` (rel, estado, mas, menos). Las uniones de ramas no traen archivos. Ojo: `git_run` hace `strip()` y `\x1e`/`\x1f` cuentan como espacio en Python, así que el primer separador desaparece y los bloques vacíos se saltan.
- **Ventana:** interruptor «Ver: Por commit | Por archivo» (`desklens.fusion.vista`). `mergeByCommit` pinta cada commit como `details.mgc` con encabezado verde, y los archivos que chocan llevan ⚠ y `data-goto`, que lleva a la fila de la tabla (`.mgflash`). `mergeCommitView` (en `dlg2`, sin cerrar la pantalla) muestra el padre ↔ el commit con `mgSbs` y `/api/git/version`.

## 2026-11-18 · Falsos «Cambió en el disco» / «Conflicto» al guardar (v1.150)
El usuario los veía en `descargar_archivos.py` cada vez que guardaba. Ningún otro programa había escrito el archivo: en su historial, el «cambio de fuera» coincidía al segundo con su último paso de edición. Eran dos carreras con su propio guardado:
- **Revisión cada 3 s durante el guardado:** `diskPoll` leía la fecha nueva antes de que llegara la respuesta. `save_text` esperaba a `idx_update`, con el texto aún «sucio» (`orig` viejo), y salía el aviso.
- **Dos guardados a la vez** (Ctrl+S dos veces, Ctrl+S y ▶): ambos salían con la misma fecha y el segundo daba 409 con la hora del primero.

**Arreglo:**
- `save` pone en fila los guardados de cada ruta en el mapa `saving` y delega en `saveNow`; «Sobrescribir» llama a `saveNow` para no esperarse a sí mismo.
- `diskPoll` no mira mientras hay un guardado en curso. Con otra fecha y el texto «sucio», compara el disco con `ed.orig`: si coinciden, adopta la fecha y no avisa.
- `save_text` responde tras escribir y lanza `idx_update` en un hilo aparte.
- Probado: dos guardados a la vez sin aviso; cambiar solo la fecha no avisa; un cambio real sí avisa.

## 2026-11-18 · Ctrl+F abierto: escribir ya no salta a la coincidencia (v1.149)
Con la barra abierta, cada cambio del editor (`cmFind`, `changes` con espera de 250 ms) repetía `findRun(false)`, que acababa en `findP.show(findI)` → `cm.setSelection` sobre la coincidencia. El cursor saltaba allí y la siguiente letra la sobrescribía.
- `findRun(near, quieto)`: con `quieto` solo recuenta y repinta, y deja «N de M» en la siguiente desde el cursor (`near()`) sin mover nada. El `changes` del editor lo llama así. Reemplazar sigue saltando a la siguiente, como antes.
- Probado con tecleo real en el panel del navegador: el texto queda donde está el cursor.

## 2026-11-17 · Buscador → documento con todas las palabras (v1.148)
Al abrir un resultado de «mujer divorciada» solo se marcaba «mujer»: `openHit` tomaba la primera `[[marca]]` del fragmento y saltaba a su primera aparición.
- `openHit` junta todas las marcas distintas en `q` y añade `v: true` (varias palabras), que hace que `findRe` las busque una a una con `|`; si escribes a mano en la barra, `v` vuelve a false. También guarda `ctx` (el fragmento), y `findRun` lo usa una sola vez con `findP.pick`.
- `ctxPick(text, starts, ctx)` busca unas 8 palabras alrededor de la primera marca, separadas por `[^\p{L}\p{N}]+`, sin tildes y con `findIn`, así que sirve con el texto pintado y con el Markdown crudo (`**mujer**`). Lo usan `domFind` (cada Range lleva `_s` y `hits.text`) y `cmFind`. El PDF sigue con la página del fragmento.
- `findTicks` pinta la tira fija `#fticks` al borde derecho de la lectura, con la actual en naranja y un clic para saltar. El editor ya tenía `cm-fbar`. ponytail: no se recoloca al cambiar el tamaño de la ventana hasta la siguiente búsqueda.

## 2026-11-17 · Selección múltiple en el árbol (v1.147)
Pedido: Shift+clic para elegir varios y eliminar, copiar o quitar de Sueltos.
- **Ventana:** `tsel` (Set) + `tanchor` y `treeSelect(el, 'tramo'|'uno')`. Cada sección (Proyectos/Sueltos/filtro) tiene su propia selección. `treeMarks` pinta `.tsel`, y el `go` del teclado amplía con Shift.
- **Menú:** `selMenu` (clic derecho con 2+ marcados) llama a `selUnloose`, `selTrash` (uno a uno, tocan config.json), `selMoveCopy` (`pickFolder`; las pestañas movidas se reabren en la ruta nueva) y `closeUnder`. `gNew(...ps)` acepta varias pestañas. `openMenu` admite `{ danger: true }` (`.mdanger`, en rojo).
- **Servidor:** `move_copy(paths, dest, copy)` en POST `/api/mover` y `/api/copiar`. Nunca sobrescribe y lo que choca se devuelve en `saltados`. Un archivo que queda fuera de los proyectos pasa a suelto, como `create_file(libre)`. `/api/quitar` acepta `rutas`.
- **Descartado:** «Añadir a archivos sueltos» desde Proyectos no sirve, porque `sin_duplicar_sueltos` no deja un archivo de proyecto como suelto. «Mostrar en el Explorador» lo rechazó el usuario.

## 2026-11-17 · Aviso de recuperación sin bloquear (v1.146)
Al usuario le molestaba el `ask` «Recuperación» que bloqueaba la ventana al abrir DeskLens.

**Cambios:**
- `recoverAll` junta filas `{path, nombre, nota, fecha (de la copia), tam (bytes UTF-8 del texto)}` con `row()`.
- `recToast(rows)` muestra `#recToast.rtoast`: fijo arriba a la derecha (z-index 60) y sin modal.
- La tabla tiene Archivo (`fileIcon`, nombre, ruta relativa y nota), Último cambio (hoy/ayer + hora) y Peso; un clic en la fila hace `openTab` y cierra el aviso.
- Se cierra con `pointerdown` fuera (en captura), con ✕ o a los 10 s; la cuenta se para con el ratón encima.
- El `ask` de conflicto («cambió en disco después de la copia») sigue siendo modal, porque hay que decidir.

Probado en el 8799: dos «nuevo» recuperados tras recargar, cuenta atrás, pausa, clic fuera y clic en la fila.

## 2026-11-17 · Accesos por teclado en Ajustes (v1.145)
A pedido del usuario, una sección de solo consulta con todos los atajos.

**Datos:** `KEYS` en `index.html` (zona → [teclas, qué hace]); «+» une teclas, « / » separa alternativas y «＋» es la tecla +. `kbdHtml` dibuja cada tecla como `<kbd>`.

**Pantalla:** en `settingsDialog`, el enlace `nav a.kfirst` va separado al final y la `section.keys` es una tabla con un `tbody` por zona. El mismo `refresh` filtra los `.krow` por `data-t` (teclas sin «+», texto y zona), oculta las zonas vacías y no los muestra con «Solo cambiados». «Ningún ajuste coincide» solo sale si tampoco hay atajos.

Reunidos los 48 de los `keydown` del código y de `extraKeys`. Nueva regla en `reglas.md`: cada atajo nuevo va a `KEYS`; también se apuntó allí la de `extraKeys`. Probado en el 8799: lista completa y filtro «duplicar».

## 2026-11-17 · Cambiar el nombre de una pestaña con Ctrl+F2 (v1.144)
Pedido del usuario: renombrar una pestaña aunque no esté guardada, con Ctrl+F2.

**Funciones:**
- `renameTab(p)` cambia el `<span>` de la pestaña por un `input.tabren` (tiene `data-path`) y selecciona el nombre sin la extensión.
- Para «nuevo N», `edits.get(p).f.nombre = nombre`. `tabName` lo lee, `backupBody` lo guarda como `titulo` y `recoverAll` lo restaura. Si se ve, `render()` le pone el modo por la extensión y conserva `getHistory`/`setHistory` y el cursor.
- `saveUntitled` propone ese nombre (`oninput` pasa la extensión al selector).
- Un archivo guardado pasa por `renameOnDisk`, la parte de disco que antes estaba dentro de `renameInline` del árbol y ahora comparten los dos.
- Ctrl+F2: listener en captura. Clic derecho: «✎ Cambiar nombre…»; no aparece en las pestañas web.

**Fallo encontrado al probar:** el Enter que confirma llegaba al editor, que se enfoca al redibujar, y metía un salto de línea. Ahora hace `preventDefault` en Enter y Esc, también en F2 del árbol.

Probado en el 8799: nombre nuevo, colores de Python, texto intacto, ↶, recarga (recuperación), «Guardar» con «hola» + «.py» y renombrar calendario.md → agenda.md en el disco.

## 2026-11-17 · «+» de las pestañas con menú (v1.143)
El usuario creyó que el «+» de la barra de pestañas era «archivo nuevo», pero abría `openExplorer`. Eligió la opción B sin la palabra «Nuevo»: en `renderTabs`, un solo `iconBtn('plus')` que abre `openMenu` en el punto inferior izquierdo del botón (se despliega hacia la derecha, como Chrome) con «📄 Archivo nuevo» (`newUntitled`, Ctrl+N), «🌐 Pestaña web» (`webOpen('')`) y «📁 Añadir proyecto o archivos…» (`openExplorer`). El 🌐 suelto se quitó. Probado en el 8799: el menú se abre bajo el + y «Archivo nuevo» abre «nuevo 1».

## 2026-11-16 · Ventana del índice más clara (v1.142)
Pedido del usuario (captura): mejorar distribución, visualización y explicación, con «Cerrar» siempre abajo. Aprobó el dibujo. `fillIdx` rehecho con clase `ix` en `#dlg` (flex en columna: `header`, `.ixbody` con scroll, `footer` con el tamaño de la base y «Cerrar»). Tarjeta `.ixcard` (ok / busy / err / esperando; próxima pasada = `fin` + `indice_repaso_min`), línea con `indice_cpu` y enlace a Ajustes (pone `dataset.kind = ''` para que el sondeo no pise Ajustes), `details.ixhow`, barra apilada y leyenda (`IDX_GRP`), PDF, `.ixtipos` en dos columnas y `.ixerrs` (proyecto › carpetas con `projLabel`/`relPath`, 📁 → `/api/mostrar`, `IDX_ERR` traduce los mensajes). Como `drawIdx` lo rehace con cada sondeo, se conservan el scroll y «Cómo funciona» abierto. No hizo falta tocar el servidor. Probado en el 8799 con los números de su captura, en oscuro, claro, indexando y en ventana baja.

## 2026-11-16 · Filtro del árbol: sin esperas al cambiar el índice (v1.141)
Captura del usuario: «Buscando…» con «colosenses», y al final unos 7 s. **Causa:** `tf_names` (v1.139) rehacía la lista dentro de la petición cada vez que cambiaba `count(*)`/`max(indexed)` (~3 s con 219 000 archivos, más con el equipo ocupado). Y cambiaba a menudo: el vigilante (`watch_flush`) indexaba archivos de `.git` (FETCH_HEAD tras cada fetch de la vista Git) que `idx_targets` no recorre, y luego `idx_pass` los borraba. **Arreglo:** `watch_flush` salta rutas con `.git`; `tf_names` responde con la lista anterior y la rehace en otro hilo (`_tf_build`, una a la vez); solo la primera vez o con `wait=True` (al final de `idx_pass`) se espera. Medido con su índice real (solo lectura): con el índice recién cambiado, 0,18 s. Límite: lo recién creado fuera de DeskLens puede tardar unos segundos más en salir en el filtro.

## 2026-11-16 · Ctrl+Shift+F desde el buscador Ctrl+F (v1.140)
Captura del usuario: con el cuadro de Ctrl+F abierto, Ctrl+Shift+F no hacía nada. **Causa:** el keydown de `#find` tomaba `e.ctrlKey && k === 'f'` también con Mayús, reabría el cuadro y hacía `stopPropagation`, así que no llegaba al atajo global de la vista Buscar. **Arreglo:** `!e.shiftKey` en esa condición; el atajo global lleva a `#sideQ` el texto de `#fq` (si el foco está ahí o el cuadro está abierto) o `selectedText()` de una línea, y lanza `sideSearch`. Probado en el 8799 con teclas reales en lectura y en el editor (el archivo no cambia).

## 2026-11-16 · Filtro del árbol desde el índice, ✕ y nombre del proyecto (v1.139)
Pedido del usuario (captura): el filtro tardaba en responder. `tree_filter` recorría el disco en cada búsqueda (en homeshape, 4 s y cortado con «hay más»). Ahora `tf_names` arma desde `files` del índice, por raíz, la lista de archivos y de sus carpetas (sacadas de las rutas, sin lo que hay bajo HIDDEN/HEAVY) con el nombre plano; queda en memoria y se rehace solo si cambian `count(*)`/`max(indexed)` (con su índice real: 2,8 s la primera vez, que `idx_pass` hace al terminar; después 0,04 s). Búsquedas medidas en su índice: 0,08–0,4 s. Un resultado se comprueba con `os.path.exists` (lo borrado fuera tarda en salir del índice). Una raíz que no está en el índice (aún sin indexar o subcarpeta) sigue con el recorrido de antes. Límite: con el índice no salen las carpetas vacías. Además: ✕ `#tfx` en `#tfbox` (vacía y vuelve el árbol), espera de 250 → 150 ms, y `drawResults` usa `projLabel(raiz)` (antes el nombre de la carpeta; el filtro del árbol ya usaba el nombre en DeskLens). Probado en el 8799 con un proyecto renombrado «Mi Proyecto» y en test_desklens.py.

## 2026-11-15 · Guardar un «nuevo» más cómodo (v1.138)
`saveUntitled` rehecho: nombre + `<select>` de extensión (`SAVE_EXT`, las de `TEXT_EXT` del servidor; .txt por defecto), carpeta con buscador propio (`#uFind` + `#uList`) y «Examinar…» (`pickFolder`, en `#dlg2` con clase `pick`, usa `/api/explorar` y solo enseña carpetas). `create_file` acepta `libre=True`: crea en cualquier carpeta existente y el archivo queda como suelto; sin `libre` sigue negándose fuera de DeskLens. El cliente manda `libre` cuando la carpeta no está dentro de un proyecto.

## 2026-11-15 · Commits que llegan, numerados (v1.137)
El usuario pidió numerar también la lista de commits de Fusionar/Pull, como las de archivos (v1.128). Columna `.mgn` de 28px en una rejilla; 1 = el más reciente (orden de `git log`). La línea «… y N más» dice el rango que falta.

## 2026-11-15 · Vuelven los atajos de VS Code al editor (v1.136)
El usuario notó que ya no se podía mover ni duplicar líneas, ni poner varios cursores (hecho el 2026-11-03, v1.23).

**Causa:** el commit `dd438e1` (2026-11-05, plegar bloques) le dio a `editorView` su propio `extraKeys` (Ctrl+Mayús+[ / ]). En CodeMirror eso reemplaza entero `CodeMirror.defaults.extraKeys`, y con él se perdieron mover, duplicar, cursores, Ctrl+D, Ctrl+Shift+L, Ctrl+Shift+K, Esc (`desklensEsc`) y Alt+Z. Ctrl+F y Ctrl+H seguían funcionando por el atajo general de la ventana. El editor de Reglas no se vio afectado.

**Arreglo:** `extraKeys: { ...CodeMirror.defaults.extraKeys, … }`, el único `extraKeys` propio del código.

Probado en el 8799 con pulsaciones: Alt+↓, Shift+Alt+↓, Ctrl+Shift+K, Ctrl+Alt+↓ (2 cursores), Esc (1 cursor) y Ctrl+D (2 selecciones).

**Regla:** nunca pasar `extraKeys` a un CodeMirror sin sumar `CodeMirror.defaults.extraKeys`.

## 2026-11-15 · Git: la lista de proyectos se salía por la izquierda (v1.135)
Captura del usuario: solo la primera vez, la lista de proyectos de Git salía cortada.

**Causa:** `gitRepoMenu` abre el menú con `gitSum` aún sin datos (filas estrechas, «…»), y `openMenu` lo pega por la derecha al botón (`style.right`). Cuando llega `/api/git/resumen`, las filas se ensanchan hacia la izquierda y se salen de la ventana. La segunda vez `gitSum` ya está y se coloca bien.

**Arreglo:** la colocación de `openMenu` pasa a `m.place()` (borra left/right y vuelve a medir), y `gitRepoMenu` la llama tras poner las filas al día.

Probado en el 8799 con `gfL.izq` = 290: el menú se abrió en 66–321 px; al llegar el estado midió 355 px y quedó en 56–411 px (antes habría empezado en −34 px).

## 2026-11-15 · Cerrar grupo con confirmación (v1.134)
A pedido del usuario, «✕ Cerrar el grupo» (`gMenu`) hace `ask` con «¿Seguro de cerrar el grupo «X»?» y la lista de pestañas (• nombre). Solo cierra si se pulsa «Cerrar N pestañas»: Esc o Cancelar no cierran nada.

## 2026-11-15 · Grupos de pestañas como Chrome (v1.133)
El usuario eligió la opción A: grupos automáticos por proyecto y, además, grupos hechos a mano, plegables.

**Modelo:** cada lado guarda `grp` (id → `{nombre, color, plegado}`) y `tg` (ruta → id hecho a mano; `''` significa sacada a propósito) en `desklens.tabs`/`desklens.split`, junto a `tabs`. Los copian `syncPane`, `activatePane`, `renderTabsOf`, `setSplit` (al juntar se mezclan) y el arranque con `savedSplit`.

**Funciones:**
- `groupOf(p)`: primero `tg`; si no hay entrada y está activo `pestanas_por_proyecto` (ajuste nuevo, True), devuelve `'p:' + ruta del proyecto`.
- `gInfo`: lo de proyecto toma nombre `projLabel` y un color fijo por hash de la ruta en `GCOL`.
- `groupOrder()`: en `renderTabs`, junta cada grupo donde está su primera pestaña.
- `groupChip`: clic llama a `gFold` (si la visible está dentro, pasa a otra de fuera); el clic derecho abre `gMenu`; se puede arrastrar el grupo entero o soltar una pestaña encima.
- `gTabItems` en el menú de la pestaña.
- Al soltar una pestaña junto a otra, toma el grupo de esa otra.
- `openTab` despliega el grupo de la pestaña; Ctrl+Tab salta los plegados; `gMove` mueve con `moveTab` y conserva nombre y color.

Probado en el 8799 con la lista real de proyectos: agrupado, plegar (también con la visible dentro), desplegar al abrir desde el árbol, grupo a mano con color, recarga, mover al otro lado y juntar, claro y oscuro.

## 2026-11-14 · Explorador más ágil (v1.132)
El usuario notaba lento el explorador (teclado, clic para plegar y desplegar). Lo medí en el 8799 con una copia de su `config.json`. En el servidor, `/api/dir` tarda 1–4 ms con la caché de git, y la primera vez en homeshape unos 2 s por `git status`. En la ventana, con 699 filas, plegar tarda unos 12 ms, desplegar unos 27 ms y `markActive` 1 ms.

Causas encontradas:
1. `dirTamTitle` se lanzaba en cada `mouseenter`, y `folder_size` de homeshape (211 mil archivos) tarda 8 s. Recorrer el árbol con el ratón llenaba las 6 conexiones del navegador y los clics esperaban detrás.
2. `expand` esperaba al servidor antes de dibujar.
3. `::before`, de 400 px y con `isolation`, estaba en todas las filas, y la raya usaba un fondo `fixed`.

Arreglos:
1. El tamaño se pide tras 700 ms quieto (`dirTamTimer`), de uno en uno (`dirTamBusy`), con `?seg=1.5`: `folder_size(path, seconds)` devuelve `parcial` y el título dice «más de».
2. `dirCache` (ruta → lista en bruto): `expand` dibuja al instante desde la caché y pone al día en segundo plano, redibujando solo si cambió `dirSig`. `treePoll` llena la caché. Se vacía tras renombrar, eliminar o crear.
3. `::before` solo en `:hover`, `.on` y `.kcur`; el borde izquierdo sale de `--sangria`, 17 px por nivel de `.kids`, y la raya es un `box-shadow`, sin `fixed`.

## 2026-11-14 · El árbol con aspecto de explorador (v1.131)
El usuario quería «más de explorador y no de página web», cambiando solo colores y estilo. Aprobó los puntos 1–10 de la propuesta; el 11 (estado de git pintado en el nombre con M/U, como VS Code) quedó fuera porque solo respondió «ok».

Qué cambió:
- El `aside` usa Segoe UI.
- Las filas del árbol (`:is(#projects,#loose,#tfilt) .node`) miden 22 px, sin esquinas y con el nombre en `--ink`.
- El hover y el abierto se pintan en `::before`, que sale 400 px a la izquierda (lo recorta `.sidescroll`) para ir de borde a borde.
- La raya de 2 px del abierto es un degradado con `fixed`: depende de que el panel empiece a 44 px, tras la cinta.
- `.kcur` muestra líneas arriba y abajo; `seldir` va en azul marino.
- `#sidetools` ya no es una barra propia: está dentro de `h2#hP.tsec` y se ve con `aside:hover`.
- `h2.tsec` (`#hP`, `#hL`) es fija y plegable con `body.foldP`/`foldL`, guardado en `desklens.secciones`.
- La regla de las vistas Buscar/Git oculta `#hP` y `#hL`; el filtro oculta `#hL`.

Probado en el 8799, en claro y en oscuro.

## 2026-11-14 · Carpetas en azul marino (v1.130)
A pedido del usuario («más de DeskLens y no de explorador»), `.fi.dir` usa `var(--navy)` (claro #1f4e79 / oscuro #8fb3d9) con el relleno al 16 %, en lugar de #c99a3a. Los colores de los archivos por tipo no cambian.

## 2026-11-14 · Explorador: teclado, iconos, contador, F2, Supr y filtro (v1.129)
El usuario pidió un árbol más parecido al Explorador de Windows y a VS Code. Aprobó los puntos 1–9 y 12 de la propuesta numerada, descartó el 10 (Ctrl+C/V/X) y dejó para después el 11 (arrastrar para mover; hoy arrastrar = adjuntar al chat).

**Servidor (`desklens.pyw`):**
- `dir_counts` da `[carpetas, archivos]` sin contar HIDDEN.
- `list_dir` añade `n` a las carpetas y `tam` a los archivos; `estado()` añade `n` a cada proyecto y `compactas`.
- `tree_filter` responde GET `/api/arbol/filtro?q=&raices=a|b`. Recorre el disco, sin entrar en HEAVY, con un tope de 300 resultados o 4 s (`mas`).
- `rename_path` responde POST `/api/renombrar`. Nunca renombra la carpeta de un proyecto ni pisa algo existente (salvo un cambio solo de mayúsculas) y pone al día los sueltos.
- Nuevo ajuste `carpetas_compactas`, en False por defecto.

**Interfaz (`index.html`):**
- `fileIcon` (SVG por familia, `FI_FAM`), `fmtCount` (estilo YouTube, trunca), `dirCount` (`.dcnt`; `.cnt` ya existía en otra parte) y `dirTamTitle` (`/api/carpeta/tam` al pasar el ratón, caché de 1 min).
- Teclado: `.sidescroll` con tabindex 0 y su keydown (`treeRows`, `kcur`, `treeMarks` → `.kcur` y `.kact` en azul marino), `renameInline` (cierra las pestañas de lo renombrado y las reabre con la ruta nueva).
- Filtro: `#tfbox`/`#tfilt` + `treeFilterRun`. Se dibuja aparte; `toggle` en `#tfilt` solo pliega.
- `compactChain` + `data-chain`: `newInline` busca la carpeta por la cadena.

Probado en el 8799 con un «Curriculo» de ejemplo: flechas, «sca», F2, Supr (con Esc), filtro, compactas, barra a 210 px y títulos. Pendiente: no está probado con el teclado de Edge en la app real, y el historial de cambios de un archivo no sigue al renombrarlo.

## 2026-11-14 · Fusionar: barra verde «✓ Se fusionan sin problemas» (v1.128)
Captura del usuario: «Se unen solos» no se entendía. En `mergeOneDialog` el `summary` de `.mgsolos` es ahora una barra flex a todo lo ancho (fondo verde al 12 %, borde verde, ▸/▾ en verde; hover al 19 %; con la lista abierta, la lista queda enmarcada debajo) con «✓ Se fusionan sin problemas (N)» y «git los junta automáticamente: no hay nada que elegir»; el resumen de arriba dice «N se fusionan sin problemas». Probado en el 8799 (rama `cesare`) con clic real en el extremo derecho de la barra, claro y oscuro. Después, a pedido del usuario, `.mgtabs button.on` sin fondo verde (`var(--paper)`): solo borde y título en verde. También columna «#» en `mergeTable` (n.º en el orden que se ve, también al ordenar; los `nth-child` del CSS se corrieron uno) y en la lista de `.mgsolos` (`.mgfile` con una columna más). Luego: `mergeSoloView` deja la columna única (`mgCol`) y usa `mgSbs` (pieza nueva, también en `mergeTwoView`): base (tu último commit; estos archivos no tienen cambios sin commit) | resultado, con frase según A/D o `resultado == llega` (solo cambió la otra rama) o no (git junta las dos). `mgMarks`: barra a 30 px, raya `mod` (rojo|verde) para filas con las dos mitades, recuadro `.vp` del trozo visible (se mueve con el scroll) y clic/arrastre con pointer capture. Probado en el 8799 con un archivo de 300 líneas cambiado en las dos ramas (rama `larga` hecha a mano en el repositorio de prueba).

## 2026-11-14 · Fusionar: pestaña elegida en verde y «✓ Guardar y volver» (v1.127)
Captura del usuario: no se notaba qué pestaña estaba elegida. `.mgtabs button.on` en verde (#2f9e44: fondo al 16 %, borde y raya de 4 px; título en negrita y en una línea con «…»). En `mergeTwoView`, `draw` cambia `[data-back]` a «✓ Guardar y volver» con `.mgsave` (verde, más alto) si hay opción elegida y no se está editando; el «✓ Guardar y volver a la lista» del editor también usa `.mgsave`. Probado en el 8799 en claro y oscuro con clics reales.

## 2026-11-14 · Fusionar: tabla ordenable en vez de tarjetas (v1.126)
Pedido del usuario: la pantalla única estaba «muy cargada». En `mergeOneDialog` el aviso grande pasa a una línea (`.mgsum`), los commits van en `<details>` y cada archivo es una fila de `.mgtab` (estado, archivo, ubicación, qué pasa, `<select>` con `mergeOptions`, «Ver detalles» → `mergeTwoView`). Clic en un `th[data-sort]` ordena (`sk`/`sdir`, sobreviven a `redraw`); la ubicación usa `direction:rtl` para que una ruta larga muestre el final. «Falta decidir» va en `small.mgleft` (rojo, negrita) y «Fusionar» sigue deshabilitado hasta decidir todo. Las radios (`.mgradios`) ya no se usan aquí. Probado en un servidor de prueba (8824): orden, desplegables, aviso rojo, «Ver detalles» y vuelta; captura no disponible (ventana detrás).

## 2026-11-14 · Historial de cambios hechos fuera de DeskLens (v1.125)
Pedido del usuario: casi todo se edita fuera (otros programas, IA). `hist_external` añade un paso tipo «fuera» (archivo entero gzip, mtime) si no hay uno con el mtime del disco; si el archivo no tenía historial, antes un «📂 Antes» con el texto que tenía el índice (no hace falta copia inicial de 200 000 archivos); si solo cambió la fecha, actualiza el mtime del paso actual. Lo llama `idx_file(…, hist=True)` desde `idx_pass` y desde el vigilante; los guardados de DeskLens no (`idx_update` por defecto sin hist). Vigilante (solo Windows): `watch_sync` (en cada vuelta del indexador) lanza un hilo `watch_dir` por proyecto (recursivo) y por carpeta de sueltos (solo esos archivos) con ReadDirectoryChangesW vía ctypes; `watch_flush` reindexa lo que lleva `historial_fuera_seg` sin avisos; se ignora `historial/` (si no, el índice se avisaría a sí mismo). Disco: `_hist_thin` (todos en 1 h, uno por hora en 24 h, uno por día) y `hist_cleanup` pasa del tope borrando pasos sueltos de texto del más viejo al más nuevo (nunca el actual) antes que carpetas enteras; `_hist_drop` recuelga los hijos del padre. Se saltan `HIST_SKIP` (.git, node_modules, vendor, …) y > `historial_fuera_mb`. De paso, `idx_file` ya no hace `delete from docs` (recorre toda la tabla FTS5) en la primera indexación. Probado en test_desklens.py y en vivo: 5 escrituras seguidas → un paso con la última; suelto anotado; vigilante en reposo 0 s de CPU.
Ojo: otra sesión hizo `git stash` a mitad de este trabajo y se llevó también estos cambios; luego lo sacó. Pendiente: medir el freno de CPU del índice con una carpeta grande (la medición se cortó).

## 2026-11-14 · Git: menú de proyectos al instante y ramas en orden fijo (v1.124)
El menú «Proyecto» esperaba a `/api/git/resumen`, que hacía un `git_overview` completo (~13 procesos) por proyecto. Ahora `git_summary` hace un solo `git status` (se sacó `git_status_parse`, que también usa `git_overview`; mismo resultado, 0,6 s → 0,1 s con 8 proyectos) y `gitRepoMenu` abre con el último resumen (`gitSum`) y repinta las filas sin reordenarlas al llegar el nuevo. Elegir proyecto marca ⏳ y pone `#gfBr.gfwait` (sin clics) hasta redibujar; `gitPending` también. Ramas en orden alfabético, la actual ya no va primero. Sin probar en el navegador: la otra sesión tenía `test_desklens.py` a medias (falla en el historial «fuera»).

## 2026-11-14 · Índice con freno de CPU y sin vaciarse por un config.json perdido (v1.123)
En otra PC, al mover `config.json` e `historial` a una copia nueva, el DeskLens viejo seguía abierto en el 8765 (la copia nueva solo se asomaba a su ventana), se quedó sin config, guardó uno vacío y el indexador borró todo el índice (`idx_pass` quitaba lo que no estuviera en la lista). Ahora: sin proyectos ni sueltos no borra nada, ni lo de un proyecto de la lista cuya carpeta no se alcanza; `load_config` lee con utf-8-sig y si el JSON está roto copia `config.roto.json` antes de que alguien guarde encima. CPU (204 300 archivos en producción): ajuste `indice_cpu` (20 %), `idx_rest` duerme en proporción al trabajo (también al recorrer carpetas) e `idx_background` pone el hilo en THREAD_MODE_BACKGROUND_BEGIN (Windows); `pdfWorker` usa el mismo %. Probado en test_desklens.py.

## 2026-11-13 · Sombreado de coincidencias, cambios en «Editar manualmente» y barra más ancha (v1.122)
Pedido del usuario. `.mgbar` a 22 px y rayas de 7 px (`mgMarks` solo toca `.mgscroll>.mgbar`). «Editar manualmente»: `mgEditMarks` (diff_match_patch por líneas contra `v.tuya`, recalcula 250 ms tras escribir) pone `mgl-add` (fondo verde) y `mgl-del` (raya roja arriba) y su propia `.mgbar` dentro de `.mgedit` (clic → esa línea). Coincidencias: addon `match-highlighter` (CDN 5.65.16) vía `CodeMirror.defaults.highlightSelectionMatches` (todos los editores, rayas en la barra de scroll); fuera de editores, `selMatches` en `selectionchange` con CSS Custom Highlight (`::highlight(dlsel)`) sobre el bloque (`code.hljs`, `.mgcode`, `.page`, `.md`, `.docx-wrapper`, `#view`, `#out`, `#convLog`), saltando los `<i>` de números; 2–200 caracteres, una línea, distingue mayúsculas, máx. 2000. Sin sombreado: HTML/SVG en iframe y PDF. Probado en el 8799 con ratón real (comparación, editar a mano escribiendo, lectura .php, editor) y .md por código.

## 2026-11-13 · Fusionar: comparación en dos columnas «lo que tienes ahora | así quedará»
El usuario esperaba ver siempre dos columnas. `sideBySideRows` (diff_match_patch por líneas) alinea fila a fila: iguales enfrentadas, bloques cambiados emparejados (rojo izquierda, verde derecha) y huecos rayados en el lado corto; una sola caja con scroll, así se mueven juntas. «Dejar mi cambio» ya no es un texto suelto: aviso «✓ Tu archivo no cambia» y los dos archivos completos (sin atenuar). Clase de fila `.mgchg` (`.chg` ya era del comparador y metía márgenes). Probado en el 8799.

## 2026-11-13 · Fusionar: elegir versión en pestañas, comparado con lo que tienes ahora
Pedido del usuario. `mergeTwoView` pasa de tres columnas a pestañas (una por opción de `mergeOptions`; la activa es la elegida) y el contenido es `lineDiffRows(lo que tienes ahora, resultado de esa opción)`: «Dejar mi cambio» → «Tu archivo no cambia». Barra de marcas (`mgMarks`: rayas por bloque, clic salta). «Unificar cambios» (antes «Dejar los dos») y «Editar manualmente» siempre (antes se ocultaba si git unía solo). `#dlg2` a 80 % y colores `--navy/--navybg/--navyhov` (claro y oscuro) para pestañas y radios. Botón de fila «👁 Ver y elegir». Probado en el 8799 (unificar, mía, la que llega, editar con ratón real).

## 2026-11-13 · Fusionar: columnas que se eligen con un clic y «Editar manualmente» en la ventana
Pedido del usuario sobre «👁 Ver las dos». `mergeTwoView`: secciones `.pick` (hover y clic = opción mía/la que llega), cambios en negrita y contexto tenue, `mgCenter` centra el primer cambio. «Editar manualmente» (antes «Mezclar a mano») abre un CodeMirror en «Así quedará» con `mezcla` (git merge-file de tu versión y la que llega sobre el ancestro común); no deja guardar con marcas <<<<<<< ======= >>>>>>>; lo escrito queda en `txt[rel]` y viaja como `textos` a `git_merge_apply`, que lo escribe (con el salto de línea del archivo) y hace git add: la fusión ya no queda abierta. Cada fila lleva `.mgchip` con lo elegido; cerrar con ediciones pregunta. Nombres: «Dejar mi cambio», «Dejar cambio que llega», «Dejar los dos cambios», también en la pantalla de fusiones empezadas fuera. Probado en test_desklens.py y en el 8799 con ratón real (clic en columna, editar, guardar, fusionar; CRLF conservado).

## 2026-11-13 · Pantalla única de fusionar (⤵ Fusionar, Pull, Pull desde)
Captura del usuario: la vista previa decía «✅ sin problemas» (solo miraba commits) y al fusionar salía otra pantalla por un cambio sin commit en vite.config.js. Ahora una sola comprobación (`git_merge_check`, GET `/api/git/fusion`): fusión a medias, fetch en pull (`_merge_target`), historia común, `_merge_tree`, cambios sin commit cruzados con lo que llega («ambos»; `_merge_file` con git merge-file predice si «juntar» es limpio, con los saltos igualados a LF), archivos nuevos tuyos con el mismo nombre («tuyo_nuevo») y bloqueados en Windows (open 'ab'). `git_merge_apply` (POST): descarta lo «llega», commit de lo tuyo que se conserva, `merge --no-commit`, en cada archivo `checkout HEAD|MERGE_HEAD` (o rm) y commit; «mano» queda abierto y se abre en el editor. Ventana: `mergeOneDialog` (lista de problemas con radios y frase; la recomendada «Juntar las dos» ya marcada), `mergeTwoView`/`mergeSoloView` en `#dlg2` encima. Se quitó la vista previa anterior (`git_merge_preview`, `/api/git/previa`). Sincronizar sigue con el aviso de antes. Textos sin «vosotros» (pedido del usuario). Probado en test_desklens.py y en el 8799 (juntar, la mía/la que llega, borrar, mano → editor → guardar → confirmar).

## 2026-11-13 · Vista previa de la fusión: la respuesta primero
Captura del usuario: con 0 conflictos no entendía por qué salía la pantalla ni qué decía (tabla pequeña, «0 con conflicto» al final). Ahora `mergePreviewDialog` abre con una tarjeta grande (✅ sin problemas / ⚠️ N para elegir / ✅ nada que traer, con un solo «Cerrar»), los commits que llegan (`lista` en `git_merge_preview`: fecha, autor, mensaje, hasta 50) y los archivos en filas grandes con frase y «👁 Ver cambios»; el botón dice «Trae esos N commits a «rama»». Probado en el 8799 con los tres casos.

## 2026-11-13 · Fusionar: vista previa, conflictos explicados y resumen antes de confirmar
En otra PC «hay muchos conflictos» y no se entendía cuáles ni cómo resolverlos (la captura tenía 0 conflictos: solo faltaba el commit, pero el aviso decía «resuelve los conflictos»). Servidor: `git_merge_preview` (`/api/git/previa`, `merge-tree --write-tree -z --name-only`, Git 2.38+; tipo de conflicto por mensaje → `CONFLICT_WHAT`, `arbol` para ver el resultado y `destino_hash`), `git_conflict` (`/api/git/conflicto`: :2 mío, :3 suyo, archivo con marcas, tipo borrado_suyo/borrado_mio/contenido), `git_choose` (acción `elegir`: mio/suyo/conservar/borrar con checkout --ours/--theirs + add o rm; deshacer = `checkout -m`), `git_merge_name` (`fusion_de` de MERGE_MSG) y `git_mark_merged` (al guardar un archivo en conflicto sin marcas: git add).
Ventana: `gitMergeBanner` en la vista Git, `mergePreviewDialog` (⤵ Fusionar pasa por aquí; Git viejo → la pregunta de antes), `mergeChooseDialog` (dos botones por archivo con su frase), `mergeDiffView` (MI VERSIÓN | la de X | 👁 ASÍ QUEDARÁ, por sitios con `conflictHunks`; ✎ Mezclar a mano abre el editor), `mergeFinalDialog` (lo preparado con qué pasa y el commit) y `mergeFileView` (archivo entero antes → después con `lineDiffRows`). Probado en test_desklens.py (previa sin tocar nada, elegir, deshacer, mezclar a mano, commit con 2 padres) y en el 8799 de punta a punta. Pendiente: vista previa para pull (habría que traer antes).

## 2026-11-13 · Historial de una línea (💾 disco y ⎇ git)
Pedido del usuario, separando ediciones en disco y commits. Servidor: `/api/hist/linea` (POST: ruta, texto del editor, línea, fuente). `line_history_disk` recorre los pasos del actual hacia atrás (la rama del editor, como mucho 300) y sigue la línea con `line_map` (difflib por líneas; en un bloque reescrito, la misma posición); una versión cada vez que su texto cambia, «antes» None donde se creó. `line_history_git` busca la línea en `HEAD:archivo` (puede haberse movido) y usa `git log -L n,n:rel` (sigue renombres). Ojo: el separador del formato es \x01 porque `git_run` hace strip() y \x1e cuenta como espacio (se perdía el primer commit).
Ventana: `lineHistBadge` (botón absoluto en el editor, línea bajo el ratón o la del cursor, contadores a 300 ms con caché por línea+texto; `cm.lhReset` tras cada paso nuevo), `lineHistDialog` (pestañas, lista, `lhDiff` con diff_match_patch), `lineHistContext` (archivo entero en esa versión, línea resaltada, ◀ ▶, ← Volver con la misma pestaña y versión) y `lineHistCommit` (archivos del commit). Probado en test_desklens.py (pasos con línea insertada encima; git con la línea movida y sin commit) y en el 8799.

## 2026-11-13 · Fila sombreada, Guardar → lectura, Ctrl+A en casi todo
Pedido del usuario, en todos los formatos de texto. Lectura de código: `codeView` marca `.hov` en el número y la línea (columnas distintas) con mouseover; el segundo `pre` ocupa el ancho. Markdown/texto/cuaderno (`.page`): bloque bajo el ratón (párrafo, li más interno, título, cita, pre, fila, celda); tablas: la fila. Edición: addon `active-line` (CDN 5.65.16, `styleActiveLine`) para la línea del cursor y CSS sobre `.CodeMirror-code>div:hover` para la del ratón; en ambos el número en acento. HTML/SVG con formato van en iframe aislado: sin sombreado (con «ver fuente» sí).
Guardar (botón y ⋮): `saveAndRead` → `save` (ahora devuelve true si guardó) + `leaveEdit` y vuelve a la primera línea que se veía; Ctrl+S sigue sin salir; «nuevo N» se queda en edición. Ctrl+A: consola → `#out`, IA → `#convLog`, resto → documento; el foco en body (clic en un pre) se resuelve con el último `pointerdown`. Probado en el 8799 con teclas y ratón reales (hover lectura/edición, Guardar con CRLF, Ctrl+S, Ctrl+A en consola).

## 2026-11-13 · Ctrl+A en lectura: solo el documento
Captura del usuario: Ctrl+A en lectura seleccionaba toda la ventana (árbol, migas…). Un `keydown` global (fuera de input/textarea/contenteditable/CodeMirror, #panel, #ia, #find, aside y modales) selecciona el contenido del `#view` del lado activo, por prioridad: `.code code.hljs` (sin la columna de números), `.docx-wrapper`, `.page` (Markdown/texto), `.md`, las páginas del PDF (solo texto ya dibujado) o una tabla; si hay un editor visible sin foco, selecciona todo su texto; sin nada (imagen, vídeo, ficha), no selecciona. Probado en el 8799 con la tecla real: .sh (sin números), .md, y el buscador sigue seleccionando su texto.

## 2026-11-13 · ↶ Descartar por archivo en el aviso de fusionar
Pedido del usuario: descartar en esa misma pantalla, por archivo y no en lote. Cada fila de `gitMergeBlocked` lleva «↶ Descartar» (confirmación en rojo; con pestaña sin guardar, `askUnsaved`) → acción `descartar` con modo `preparado` (`git_discard(preparado=True)`: `restore --staged --worktree --source=HEAD`, porque un cambio solo preparado también impide fusionar; los nuevos a la papelera). La fila se quita; sin filas, se lanza la fusión otra vez. El descartar de la lista de cambios sigue igual (solo lo no preparado). Probado en test_desklens.py y en el 8799 (dos descartes → fusión con código 0).

## 2026-11-13 · Fusionar con cambios sin commit que chocan
En otra PC, `git merge --no-edit cesare` fallaba con «Your local changes… would be overwritten by merge» (.gitignore) sin explicar nada. Ahora fusionar, pull, pull desde y sincronizar comprueban antes de lanzar (`git_before_merge` → `git_merge_blockers`: cambios sin commit ∩ `diff --name-status merge-base..destino`) y responden 409 `fusion_bloqueada` con filas (tus +/−, mtime, tamaño, estado/+−/último commit en el destino). La ventana (`gitMergeBlocked`) muestra la tabla ordenable (`desklens.git.ordenBloq`) con Ver/Abrir y dos salidas: modo `commit` (commit solo de esos archivos y fusiona) o `apartar` (stash de esos archivos, fusiona y `&& git stash pop`; si chocan, «Conflictos» y el stash se conserva). `launch` no repite el aviso si quien llama ya lo explicó (`e.handled`).
Límite: en un pull se compara con la remota tal como se trajo la última vez; si el pull trae algo nuevo que choca, git lo dice en la consola como antes. Probado en test_desklens.py y en el 8799 con un repositorio como el de la captura.

## 2026-11-12 · Detalle del commit: cabecera en dos líneas y el resto plegado
Pedido del usuario: la cabecera ocupaba mucho sobre la tabla de archivos. `gitCommitDetail`: línea 1 = «▸ Ver detalle · N líneas» (botón de acento relleno; desplegado, contorno) + título en una línea con «…» + hash/⋯; línea 2 = autor · fecha · ⎇ rama (la primera local) · archivos +/− · por subir/traer. Plegado (`.gdmore`): cuerpo del mensaje, email, aplicado por, padres y todas las ramas/etiquetas; estado en `desklens.git.detalle` (plegado por defecto). «Filtrar archivos» baja encima de la tabla; Ver/Abrir en la primera columna. Probado en el 8799 en ancho y estrecho.

## 2026-11-12 · «✅ En orden» va con el mismo ajuste
Pedido del usuario: «En orden» es parte de la misma lógica. `/api/estado` trae `avisar_memoria` y la ventana solo pone «✅ En orden» si está activado; la fila de avisos vacía no ocupa sitio (`.badges:empty`). Probado en el 8799: apagado sin nada, encendido «✅ En orden», apagado otra vez sin nada.

## 2026-11-12 · «Sin reglas» y «Sin bitácora» por ajuste, apagado por defecto
Pedido del usuario: los avisos llenaban el árbol en proyectos que no se trabajan con IA. ⚙ Ajustes › Bitácora › «Avisar «Sin reglas» y «Sin bitácora»» (`avisar_memoria_ia`, no por defecto), con la explicación de para qué sirven los dos archivos. `status` solo los añade si está activado; «Bitácora grande» y «No encontrado» siguen siempre. Guardar Ajustes vuelve a cargar el árbol (`loadSide`). El aviso del panel de IA («Sin reglas en … Crear») no cambia.

## 2026-11-12 · ⓘ Novedades y número de versión
Para saber si una copia en otro equipo está al día (el zip no lleva .git ni la bitácora). `novedades.md` (en el zip) es la fuente: `## vX · AAAA-MM-DD · título` + detalle en Markdown; la primera es la versión de la copia. El servidor la sirve en `/novedades.md`; la ventana la lee una vez (`loadNews`), pone el número bajo ⓘ (arriba en la cinta) y `newsDialog` muestra versiones a la izquierda, detalle a la derecha, filtro y «⧉ Copiar». Empezó en v1.107: una versión por entrada con fecha de esta bitácora. Regla nueva en reglas.md: cada cambio añade una versión.

## 2026-11-11 · «Ver» de un commit salía vacío («0 cambios»)
En el detalle de un commit, «Ver» compara disco ↔ ese commit; si nada cambió después (el último commit, sin cambios locales), las dos columnas eran iguales. Ahora `compareDialog` recibe `antes` (el padre, como ya hacía `gitImageCompare`) y, si disco y commit coinciden, lo pone a la izquierda: se ve lo que cambió el commit. Archivo nuevo en el commit (A): sigue disco ↔ commit. Probado con bitacora.md en dd26a99 (copia en el 8799): izquierda = padre, 1 cambio.

## 2026-11-07 · Máximo de pestañas de consola en Ajustes
⚙ Ajustes › Consola › «Pestañas de consola como máximo» (`consola_max_pestanas`, 5 por defecto, 1–50); antes era un 7 fijo en `launch`. Al pasar del máximo se quitan las terminadas más antiguas; las que siguen corriendo, nunca. Se aplica sin recargar. Probado en la ventana: 8 ejecuciones seguidas dejan las 5 últimas; con 3, quedan 3.

## 2026-11-07 · El servidor se apagaba con la ventana abierta («Failed to fetch»)
El vigilante apagaba el servidor tras 5 min sin pings de la ventana. Al suspender el PC (o si el navegador dormía la ventana) los pings faltaban sin que la ventana se hubiera cerrado: al despertar, el vigilante veía horas sin aviso y apagaba antes de que la ventana pudiera avisar; después todo daba «Failed to fetch» y recargar, «no se encuentra la página». Ahora la falta de pings ya no apaga: solo cerrar la ventana (aviso «adiós» y 5 s de margen por si es una recarga). Si la ventana muere sin avisar, el servidor sigue (medido: ~100 MB, 0,1 % de CPU con ventana; sin ella, casi nada salvo el fetch de git y el índice) y el próximo DeskLens lo reutiliza abriendo otra ventana. La ventana avisa también al recibir el foco o volver a verse. Probado con un reloj simulado (casi 3 h sin avisos: sigue; «adiós»: apaga a los 5 s).

## 2026-11-05 · «Abrir con…» no abría la ventana de Windows
`rundll32 shell32.dll,OpenAs_RunDLL` no hace nada si la ruta lleva espacios (Python la pasa entre comillas y OpenAs_RunDLL no las entiende). Ahora `win_open_with` llama a `System32\OpenWith.exe <ruta>` (la ventana «¿Cómo quieres abrir este archivo?» de Windows 8+), y solo si no existe usa rundll32. Probado con rutas con espacios y acentos. Afecta también a «Elegir predeterminado» de Ajustes (su archivo de ejemplo «DeskLens - ejemplo.ext» lleva espacios).

## 2026-11-05 · Vista previa en vivo del .md/.html en el otro lado
Con la misma pestaña en los dos lados, si un lado edita un .md o .html, el otro enseña la vista previa y se pone al día 300 ms después de cada pausa al escribir (`livePreview`: callbacks en `ed.live` que llama el `change` del editor; se sueltan solos cuando su vista ya no está). Marca «● Vista previa en vivo» junto a Guardar. El .md conserva la posición de lectura; el .html vuelve arriba (el marco va aislado sin allow-same-origin: no se puede leer su desplazamiento). El código sigue con dos editores enlazados.
`staleOthers` ahora redibuja el otro lado al momento (antes, al volver a él) y siempre después del lado activo (`startEdit` y `leaveEdit` esperan a su `render`): los dos a la vez se pisaban porque `activatePane` cambia el lado activo de forma global.
Probado en la ventana: .md escrito con teclado real y visto al momento en el otro lado; .html; entrar y salir de edición con .md y .py (los dos lados quedan bien). Arreglado tras el aviso del usuario: solo se ponía al día una vez (comprobaba si seguía viva mirando el contenido, que cada puesta al día sustituye); ahora mira la marca de la barra. Probado con tres tandas separadas por 2 s.

## 2026-11-05 · Duplicar pestaña a la derecha o abajo (vista dividida en las dos direcciones)
⋮ del archivo y clic derecho en la pestaña: «◫ Duplicar a la derecha» y «⊟ Duplicar abajo» (`dupTab`): la misma pestaña también en el otro lado; sin dividir, divide (`setSplit(true, path)`); dividida, la abre en el otro lado y cambia la dirección si hace falta. Dirección en `body.splitv` (`desklens.splitDir`); el borde recuerda su reparto por dirección (`desklens.splitL` ancho, `desklens.splitT` alto); Ctrl+\ y el botón de dividir usan la última dirección.
El mismo archivo en edición en los dos lados: el segundo editor usa `linkedDoc({sharedHist:true})` del primero (lo escrito sale en los dos, un solo ↶, cada lado con su cursor y desplazamiento). Cerrar la pestaña en un lado no pregunta ni suelta sus cambios si sigue abierta en el otro (`openElsewhere`); entrar o salir de edición marca el otro lado para redibujarse al volver a él (`staleOthers`). Arreglado de paso: las migas de un lado borraban las del otro (`$` busca en todo el documento si no está en el lado activo).
Probado en la ventana: duplicar desde ⋮ y desde la pestaña, escribir con teclado real en un lado y verlo en el otro, ↶ desde el otro lado, cerrar un lado con cambios, arrastrar el borde arriba/abajo y recargar (dirección y alto recordados), volver a lado a lado con su ancho. Límite: Word/Excel/imagen/PDF en edición solo en un lado.

## 2026-11-05 · 🐞 Depurar paso a paso: Batch (.bat/.cmd), imitado
Batch no tiene depurador: `bat_debug_copy` escribe `.~dl_<nombre>.bat` en la misma carpeta (para que %~dp0 siga valiendo) con `@call :__dl N` antes de cada línea y al final una subrutina que espera con `set /p "(bat N) "`: una orden se ejecuta con `call` (echo %x%, set, dir… con las variables de ese momento) y Enter vacío sigue. No para tras una línea con ^, ni en las que empiezan con ) ni en etiquetas. Byte a byte (latin-1), sin tocar la codificación. La copia se borra al terminar el proceso (también con Detener). Solo en Windows.
En la ventana es la fila `bat` de `DBG`: solo ▶ Continuar y ⤼ Paso (no hay funciones; un `call :etiqueta` entra solo). Continuar = DeskLens da Enter solo hasta una ● (`r.going`) y quita de la consola los avisos de esas líneas. Límites: en un bloque ( … ) las %variables% valen lo del principio del bloque (como al ejecutarlo); %~n0 da el nombre de la copia; un .bat llamado con call se ejecuta de corrido.
Prueba en test_desklens.py (Windows): qué líneas no llevan parada, Enter, `echo x=%x%`, hasta el final. Probado en la ventana: Continuar hasta una ● dentro de `:saluda`, F10, `set n` escrito, F5 hasta el final (código 0, copia borrada).
Pendiente: los ● no se ven en la lectura (solo en el editor). Siguientes, uno a uno: PowerShell, Perl; TypeScript sería casi gratis (Node 22.6+ ejecuta .ts).

## 2026-11-05 · 🐞 Depurar paso a paso: JavaScript (node inspect)
.js/.mjs/.cjs con `node inspect --port=0` (puerto libre: dos depuraciones a la vez no chocan). Las ● se mandan al primer «debug>» como `sb(N)` + `cont` (Node para al empezar, en la primera instrucción). Cada depurador es una fila de `DBG` en index.html: órdenes de Continuar/Paso/Entrar/Salir (pdb: c n s r · node: cont next step out), su aviso de espera, dónde dice que está (pdb «> ruta(12)», node «break in venta.js:4», relativa a la carpeta: `dbgPath` la completa; `node:internal` se ignora), cómo avisa que acabó y cómo se cierra (pdb `q`, node `.exit`). Para añadir otro lenguaje: su fila en `DBG`, su extensión en `DEBUG_EXT` y su orden en `command_for`.
La consola ya no muestra los \b (retrocesos) con los que node borra su «debug>». Prueba en test_desklens.py (si hay node): sb(3), cont, exec y. Probado en la ventana: ● en el editor, Paso, `exec suma` escrito, F5 hasta el final (sale sola con código 0); desde la lectura F10, F11 entra y Mayús+F11 sale.

## 2026-11-05 · 🐞 Depurar paso a paso: Python (pdb)
Botón 🐞 junto al ▶ en los .py/.pyw (y «Depurar paso a paso» en el ⋮). Lanza `python -m pdb` en la consola con `-c "b N"` por cada ● y `-c continue` si hay alguna (sin ●, para en la primera línea). ● = clic en el margen o en el número de línea del editor; se recuerdan por archivo (localStorage `desklens.paradas`, [línea, texto] anclado con `foldAnchor`) y se mueven con lo escrito. Mientras depura: la consola sube al 55 % de la ventana (vuelve a su altura al terminar), botones ▶ Continuar (F5) · ⤼ Paso (F10) · ↘ Entrar (F11) · ↗ Salir (Mayús+F11) que mandan c/n/s/r, la caja de entrada acepta cualquier orden de pdb (p variable, l, w, b 20), y la línea donde está parado se resalta en amarillo en el editor o en la lectura (sale de «> ruta(12)» de pdb; si es otro archivo, lo abre). Al acabar el programa pdb diría «will be restarted»: DeskLens manda `q`.
Servidor: `command_for(path, paradas)` (paradas=None: ejecutar; lista: depurar), `run_info` dice `depurar`, `/api/ejecutar` acepta `depurar` y `paradas` (enteros). Prueba en test_desklens.py: parada en la línea 2, n, p y, c. Probado en la ventana con teclas reales (F10) desde el editor y desde la lectura (F11 entra en la función).

## 2026-11-05 · Migas del código: archivo › clase › función ▾ (parte 2 de plegar)
Debajo de la barra del archivo (`#symbar`, dentro de `#bar` con flex-wrap): 📄 archivo › ◆ clase › ƒ función ▾ › … N ▾. Cada miga salta a su línea; la última abre la lista de lo que hay a su mismo nivel y «… N» lo que hay dentro. En lectura sigue a la primera línea visible (al saltar despliega lo que la tapa y la resalta); en el editor sigue al cursor y se recalcula 400 ms después de escribir. Sin símbolos, no sale.
Los símbolos (`codeSymbols`) son los bloques de `foldRanges` cuya primera línea tiene nombre (`symName`, por patrones: class/interface/struct/type…, function/def/fn/func, métodos «nombre(args) {», flechas, recursos de Terraform, etiquetas con #id.clase, títulos de Markdown, claves JSON/YAML, selectores CSS); if/for/listas no son migas. Probado en la ventana (PHP: lectura, plegado + salto, editor) y en node con JS, Python, Java, C#, HTML, JSON, Markdown, CSS, YAML y Go.
Arreglado de la parte 1: en archivos CRLF el `\r` sobrante partía cada línea en dos filas en la lectura y descuadraba los números con lo plegado.

## 2026-11-05 · Tema en Ajustes y plegar bloques al leer y al editar (parte 1)
⚙ Ajustes › General › «Tema de la ventana»: Como Windows / Claro / Oscuro. `applyTheme` pone `data-theme` en <html> (en el <head>, con lo último guardado en localStorage, para no parpadear) y los dos bloques de colores oscuros valen para `:root:not([data-theme=light])` en el @media y para `:root[data-theme=dark]`; `isDark()` sustituye a las 6 consultas a `prefers-color-scheme` (tema de CodeMirror, Estadística, colores de autores).
Plegar: en el editor, addons de CodeMirror (foldcode/foldgutter + brace/xml/indent/markdown/comment) con `foldFinder` (modo → si no, sangría → y cabecera con «{» sola en la línea siguiente, estilo Allman, como VS Code). En la lectura, `codeView` pasa a una línea por bloque (`hlLines`, compartido con la impresión) y `foldRanges` detecta bloques por llaves/corchetes/paréntesis (sin contar cadenas ni comentarios; # en Python/Shell/YAML…, -- en SQL/Lua), etiquetas (HTML/XML/SVG, con comentarios y etiquetas vacías), títulos (Markdown, sin confundir # en bloques de código) y sangría (Python, YAML o si no hay otra cosa). ▾/▸ junto al número, «⋯» en la línea plegada (clic: desplegar), ⊟/⊞ Plegar/Desplegar todo en la barra del archivo, Ctrl+Mayús+[ / ] en el editor. Lo plegado se recuerda por archivo (`desklens.pliegues`: [línea, texto]; al volver se busca por el texto cerca de esa línea; hasta 300 archivos) y vale para lectura y edición. `goToLine` en lectura despliega lo que tapa la línea. Probado en la ventana (PHP: plegar, recargar, todo/nada; editor; tema claro/oscuro con recarga) y `foldRanges` con PHP, Python, HTML, Markdown, SQL y YAML.

## 2026-11-05 · Colores de código como VS Code, al leer y al editar
Pedido del usuario: colores en sus 39 extensiones (web, backend, SQL, VBA/VB/PowerShell, config, Batch/Shell, Markdown/LaTeX, Dockerfile, Terraform, SVG, GraphQL, Lua, R), al ver y al editar, «como en VS Code». Al leer (highlight.js) ya estaban todas; al editar (CodeMirror) faltaban 8: .psql, .bas/.vba y .dockerfile se asocian a modos que ya existían (`modeInfo`); Batch (.bat/.cmd), Terraform/HCL (.tf) y GraphQL (.graphql) llevan modos sencillos propios (`defineSimpleMode`, addon simple.js) y HCL también en highlight.js (`registerLanguage('hcl')`; antes se leía como .ini). La vista usaba el tema de GitHub y el editor otro: ahora una sola paleta, VS Code Light+ / Dark+ (variables `--tk-*`) para `.hljs-*` y `.cm-*`, con selectores un nivel más fuertes que los temas de origen. Probado: los 39 ejemplos con colores al editar y al leer (html, md y svg se leen renderizados: su código se ve con «ver fuente»), y PHP/Terraform comparados en claro y en oscuro.

## 2026-11-05 · La marca azul del cursor salía en otro sitio
Captura del usuario: un punto azul (marca de Windows sobre el cursor: indicador, dictado, teclado táctil o asas de selección) salía arriba y a la izquierda del cursor del editor, en todos los archivos. Causa medida: CodeMirror recibe el teclado en un cuadro de texto invisible dentro de un contenedor de 3 px con overflow:hidden; al escribir, el navegador desplaza ese contenedor para «mostrar» las letras y el desplazamiento se queda (20 px a la izquierda y 7 arriba tras 3 letras, más cuanto más se escribe). Windows pone su marca en el cursor de ese cuadro. Arreglo en `CodeMirror.defineInitHook` para todos los editores: el contenedor vuelve a scroll 0 en cada `scroll`, `cursorActivity` y `change`. Probado con teclado real: 34 letras, ↑ y otra palabra → desfase 0.

## 2026-11-05 · Proyecto sin git: empezar a usar git, conectar con un servidor (opcional) e iniciar sesión
Captura del usuario: al elegir «Curso Online - WordPartnerds» (sin git) en la pantalla completa, la izquierda y el título se quedaban con el proyecto anterior (gitDraw salía antes de avisar a la pantalla completa). Ahora sin git se ve un asistente: ① nombre, correo (de `git config --global`, guardados solo en el proyecto), rama y `.gitignore` con lo habitual → `git init -b`, `add -A`, «Primer commit» (`git_init`, `/api/git/iniciar`, solo en la carpeta de un proyecto). Git funciona entero sin servidor (pregunta del usuario): ② «Conectar con un servidor» es opcional, recuadro a la izquierda mientras no haya remoto («Ahora no» lo esconde; vuelve con «🔗 Conectar con un servidor…» del menú de la rama); acepta GitHub/GitLab (https, ssh, git@) o una carpeta de la red u otro disco (`REMOTE_URL`); conecta `origin` (acción `conectar`) y sube con `push -u`. ③ la sesión la lleva Git Credential Manager (ventana oficial en el primer push o con «🔑 Iniciar sesión / comprobar acceso» = `git ls-remote`); DeskLens no ve contraseñas. Desde el panel normal: «🌱 Empezar a usar git aquí…».
Ojo encontrado al probar: el refresco de la vista Git cada 5 s rehacía el formulario y el recuadro y borraba lo escrito; ahora, si ya están para ese proyecto, no se rehacen. Clase `.gact` ya existía (botones de 20 px): la nueva es `.gsact`. Probado con teclado y clics reales (carpeta de prueba → primer commit → conectar a un repositorio bare en carpeta → push → comprobar acceso) y en test_desklens.py. Sin probar: el inicio de sesión real en GitHub (ventana de Git Credential Manager).

## 2026-11-05 · Rama abierta en otra carpeta (worktree)
`homeshape_calidad` es un worktree de `homeshape`: el mismo repositorio en dos carpetas, cada una con su rama. Pedir desde una la rama abierta en la otra daba el error de git en inglés («already used by worktree»). Ahora el estado trae `en_otra_carpeta` (de `git worktree list --porcelain`), esas ramas salen marcadas «📂 abierta en …» y `git_switch` responde 409 `rama_en_otra_carpeta` antes de tocar nada; la ventana lo explica y, si esa carpeta es un proyecto, ofrece «Ir a …». Probado con las carpetas reales (solo lectura), un worktree de prueba en la ventana y en test_desklens.py.

## 2026-11-05 · Volver a Git a pantalla completa al cerrar el archivo
Abrir un archivo desde la pantalla completa de Git la cierra (tapa las pestañas). Ahora esa pestaña queda en `gitReturn` y, al cerrarla, se vuelve a la pantalla completa (mismo repositorio y commit seleccionado, que ya se recordaban), salvo que mientras tanto se haya ido a otra vista. «Abrir» del detalle del commit pasa por `openTab` para marcarse igual. Probado: abrir → cerrar vuelve; abrir → Explorador → cerrar no vuelve.

## 2026-11-05 · Instalador: «desbordamiento de la profundidad de llamada» con winget
En otro equipo sin Python, al aceptar instalarlo con winget, el instalador fallaba. La función se llamaba `Winget` y dentro ejecutaba `winget …`: PowerShell no distingue mayúsculas, así que se llamaba a sí misma sin fin. Ahora es `Usar-Winget` y llama a `winget.exe`. En este equipo no salía porque todo estaba instalado y nunca se llegaba ahí. Comprobado ejecutando la función con `winget show` (responde winget, sin bucle) y revisando que ninguna otra función del script se llame como un programa o cmdlet.

## Pendientes
- [ ] Probar en la ventana real: lectura de PDF en el chat, números de página del PDF creado, panel 🔗 en uso diario.
- [ ] Medir la carga fija de Gemini y Codex cuando estén conectados.
- [ ] Probar en la ventana real la edición a mano de Word, imágenes y PDF (hecha el 2026-11-02).
- [ ] Decidir: aviso «⏳ Sin actividad», nivel 4 de formatos (LibreOffice/ffmpeg).
- [ ] Probar en el Explorador real «🪟 Abrir desde Windows» (hecho el 2026-11-04, probado solo en una clave de prueba).
- [ ] Nota de Obsidian sobre el modo mínimo de Claude: propuesta, pendiente de aprobación del usuario.

### Módulo manejador de proyectos (acordado el 2026-11-20)
Problema: cada proyecto está repartido entre G: (código), H: (material) y `C:\xampp\htdocs` (web). Decisión: no mover nada; DeskLens une las partes de cada proyecto (Opción B «Hub»). Módulo propio y desactivable, en su rama. Primero se resuelve que la ventana no se abra con Edge.

| # | Función | Acción concreta | Idea tomada de |
|---|---|---|---|
| 1 | Ficha por proyecto | `proyecto.json`: nombre, estado, %, partes (código, material, web, BD) | Dock (`projects.json`) |
| 2 | Proyecto con varias carpetas | Unir G:, H: y htdocs en un solo árbol | Workspaces de VS Code |
| 3 | Tablero de tarjetas | Una tarjeta por proyecto con estado y barra de % | Project Minder |
| 4 | Git de un vistazo | Rama, cambios pendientes y botón «Activar git» | Project Minder, CodeBoard |
| 5 | Botones rápidos | Abrir carpeta, VS Code, Claude, terminal, localhost | Dock, DevDock |
| 6 | Iniciar y detener servicios | XAMPP, API Biblia, bot WhatsApp | lpm |
| 7 | Pendientes simples | Lista `[ ]` dentro de la ficha (sin fechas ni responsables) | Hitos de Zoho, mínimo |
| 8 | Filtros | Activo / Pausado / Terminado / Archivo | Vistas de los PM |
| 9 | Detector de desorden | Carpetas sin proyecto, respaldos sueltos, `.rar` duplicados | Propia |
| 10 | Último respaldo de BD | Aviso si tiene más de N días | Propia (`respaldos_bd`) |
| 11 | Nuevo proyecto | Estructura, ficha, `.gitignore` (`_material/`) y git opcional | Plantillas de los PM |
| 12 | Buscador global | Buscar en todas las partes de todos los proyectos | Ya existe (FTS5) |

Fases: **1** → 1, 2, 3, 4, 5, 8 · **2** → 7, 9, 11 · **3** → 6, 10, 12.
Descartado: Gantt y dependencias, kanban de tareas, registro de horas, responsables y roles, chat de equipo, presupuesto, nube, instalar Vikunja/Plane/Focalboard, usar solo la extensión Project Manager de VS Code, notificaciones por correo.

### Git mejorado tomando Sourcetree como base (acordado el 2026-11-18)
No copiarlo: quedarse con sus fortalezas y corregir sus debilidades. Sencillo, pero para profesionales. Cada punto se dibuja en detalle y espera el «ok» antes de construirlo. Orden: panel 2 → 3 → 4 → 5 → 1, y después lo general.

**Lo que ya es propio de DeskLens y no se pierde** (inventario del 2026-11-18; cada cambio debe conservarlo):
- **Pantalla:** panel pequeño en la barra lateral y pantalla completa (⤢, Ctrl+Shift+G, se recuerda); paneles que se ocultan, amplían y cambian de tamaño (`gfL`); elegir proyecto con su estado (rama, cambios, por subir); refresco cada 5 s y al volver a la ventana.
- **Pestañas del centro:** **Historial** · **🙈 Ignorados** (árbol de lo que git no sigue, tamaños por carpeta y la regla del .gitignore que lo ignora) · **📊 Estadística** (resumen, horas estimadas, palabras, días activos, commits por día/semana/mes, por autor o por rama, unir autores, filtros de fecha/rama/autor/proyecto).
- **Historial:** «solo mi rama» con las fusiones plegadas («Fusionó «x» · N commits», ▸ para ver lo que entró) o «todas las ramas» con carriles de colores y nombres arriba; ↓ por traer / ↑ por subir en cada fila y en el título; etiquetas de rama/🏷; 📄 nº de archivos; 300 commits; recuerda el commit elegido y el scroll.
- **Detalle del commit:** cabecera en dos líneas (resto plegado), hash con copiar, archivos con +/−, ver el diff, ⎇ crear una rama aquí, ↶ revertir este commit, ⧉ copiar hash.
- **Dónde estoy (v1.153):** ramas 💻/☁ con su estado frente al servidor (al día, ↑/↓, solo en tu PC, sin enlazar, ya no está en el servidor, abierta en otra carpeta = worktree), filtro con más de 10, clic = ver en el historial, doble clic = cambiar; guardados aparte (recuperar, recuperar dejando copia, borrar); etiquetas (ver, copiar).
- **Menú ⋯ de la rama actual:** Pull, Pull desde…, Push, Push a…, Fetch, Fusionar otra rama…, Nueva rama aquí…, Recuperar guardados…, Deshacer último commit (solo si no se subió), Conectar con un servidor…, Iniciar sesión / comprobar acceso, Archivos ignorados. **Otra rama:** cambiar a ella, fusionar en la actual, pull/push sin cambiarse.
- **Mis cambios (derecha):** lista con estado (M/U/D…), preparar/quitar/↶ descartar por archivo, mensaje y Commit (Ctrl+Enter), «Sin remoto» / Sincronizar, Fusionar…
- **Fusionar / Pull / Pull desde:** pantalla única (`mergeOneDialog`): comprobación previa, cambios sin commit que chocan (commit de esos archivos o 📦 apartar), tabla ordenable y numerada, vistas «Por archivo» y «Por commit», «✓ Se fusionan sin problemas», vista previa en dos columnas «lo que tienes ahora | así quedará» con barra de marcas, pestañas por opción, «Editar manualmente», fusiones empezadas fuera (`gitMergeBanner`), confirmar o cancelar la fusión.
- **Sin git:** asistente «Empezar a usar git aquí» (nombre, correo, rama, .gitignore habitual) → conectar con un servidor (opcional) → iniciar sesión con Git Credential Manager (DeskLens no ve la contraseña); recuadro «Conectar con un servidor» con «Ahora no» por proyecto.
- **Fuera de la vista Git:** punto de estado git en el árbol, «⇆ Comparar versiones (git)» de un archivo en 2 o 3 columnas, historial de una línea (💾 disco y ⎇ git), consola con la salida en vivo de pull/push/fetch/merge.

**Panel 2 · Dónde estoy** (v1.153 hizo la lista única de ramas 💻/☁, guardados y etiquetas)
- [ ] ＋ en cada sección; las secciones vacías se ven y dicen qué hacer (hoy guardados y etiquetas se esconden si no hay).
- [ ] ＋ Guardar cambios aparte (stash con nombre; casilla «incluir archivos nuevos»).
- [ ] ＋ Nueva etiqueta (nombre, en qué commit, nota, casilla «subirla al servidor»).
- [ ] Rama (clic derecho): ✎ Renombrar y 🗑 Borrar, avisando si tiene commits que no están en otra parte.
- [ ] Etiqueta (clic derecho): ver su commit, ⇡ subir al servidor, 🗑 borrar (en tu PC o también en el servidor).
- [ ] Sección «Servidor»: remotos con su dirección; copiar, abrir en el navegador, cambiar la dirección, quitar; ＋ = conectar.

**Panel 3 · Historial**
- [ ] Buscar en mensaje, autor, hash o archivo (lo que no coincide se atenúa).
- [ ] «Ver»: todas las ramas / solo la mía / solo locales (sustituye la casilla «Todas las ramas»); «Orden»: por fecha o por rama.
- [ ] Columnas con cabecera (Ramas, Descripción, 📄, Autor, Fecha, Commit): clic ordena, arrastrar cambia el ancho, se recuerda; fecha «hoy 10:42».
- [ ] Fila «✎ Cambios sin commit (N)» arriba; clic → panel 5.
- [ ] Menú del commit: copiar hash/mensaje, ⎇ crear rama aquí, 🏷 etiqueta aquí, ⇆ comparar con lo que tengo, ↶ deshacer este commit (revert), ⤵ traer solo este commit (cherry-pick), ⟲ volver mi rama aquí (reset, con aviso en rojo).
- [ ] «Cargar 300 más» al final, en vez de cortar.
- [ ] «Reordenar o juntar mis commits sin subir» (rebase interactivo) arrastrando, solo con commits aún no subidos.

**Panel 4 · Detalle**
- [ ] Archivos del commit con +/− y su diff al lado, sin abrir otra ventana.

**Panel 5 · Mis cambios**
- [ ] Preparar y descartar por bloque o por línea en el diff (la mayor fortaleza de Sourcetree).
- [ ] «Corregir el último commit» (amend), solo si aún no se subió.
- [ ] Ctrl+Enter hace el commit (comprobar que siga funcionando en todas partes).

**Panel 1 · Barra**
- [ ] Acciones más usadas con ↓↑ en vivo: Traer, Subir, Comprobar, Fusionar, Apartar, Etiqueta.
- [ ] Paleta de comandos de git (Ctrl+K) que dice qué hace cada uno.
- [ ] «↶ Deshacer la última acción» con el registro de git (reflog), mostrando antes qué se deshace.

**En toda la vista (contra las debilidades de Sourcetree)**
- [ ] Rendimiento en repos grandes: pedir solo lo que se ve, historial bajo demanda, nada que bloquee la ventana (medir con homeshape).
- [ ] Estabilidad: cada acción con su error explicado y sin dejar el repositorio a medias.
- [ ] Sin abrumar: mostrar solo lo que existe o hace falta; secciones plegables con una línea de ayuda.
- [ ] Palabras de git: nombre en español que dice lo que pasa + el término de git pequeño al lado.
- [ ] Acciones peligrosas (reset, force push, borrar): aviso en rojo con lo que se pierde y cómo deshacerlo.
- [ ] El comando de git de cada acción visible al pasar el ratón y en la consola.
- [ ] Teclado en toda la vista (moverse por el historial, preparar, commit) como Fork / Sublime Merge.
