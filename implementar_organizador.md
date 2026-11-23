# Implementar el organizador de proyectos (módulo de DeskLens)
Plan del módulo que une las partes de cada proyecto repartidas en G:, H: y `C:\xampp\htdocs`. Aquí solo se guarda lo que tiene el **ok** del usuario. Se construye fase a fase al final.

Leyenda: ✅ aprobado · ⏳ propuesto, espera ok · ❌ descartado

## Decisiones generales
- ✅ **Opción B «Hub»:** no se mueve ningún archivo; DeskLens une las partes de cada proyecto. (2026-11-20)
  - El Hub ya no es una carpeta de accesos directos: es DeskLens mismo (ficha + anclas + diagrama). (2026-11-21)
- ✅ **Dentro de DeskLens, pero aislado en su propia carpeta** (reconfirmado 2026-11-21). Un proyecto aparte duplicaría la ventana, el servidor, el explorador, Git, el buscador y la lista de proyectos; mezclarlo en `desklens.pyw` (~5 500 líneas) e `index.html` (~10 300) lo volvería difícil de mantener.

```
G:\Atril\
 ├─ desklens.pyw              ← solo un enchufe: «cargar el módulo si existe»
 ├─ index.html                ← solo el icono 🗂 Proyectos
 └─ organizador\              ← todo lo nuevo
     ├─ organizador.py        anclas, recorrido de discos, relaciones, fichas
     ├─ organizador.js        tablero, diagrama, arrastrar y soltar
     ├─ organizador.css
     └─ test_organizador.py   pruebas propias
```

  - Si el módulo falla, DeskLens sigue funcionando.
  - Se apaga en ⚙ Ajustes › «Organizador de proyectos».
  - Reusa la ventana, el explorador, Git, el buscador, la consola y la IA.
  - Si un día crece mucho, la carpeta `organizador\` se lleva a otro proyecto sin desarmar DeskLens.
- ✅ **Lo primero:** que DeskLens no se abra con Edge → hecho en v1.166, ventana propia con pywebview. (2026-11-20)
- ✅ **Se trabaja por fases**, y cada pieza se dibuja y espera el ok antes de construirse.

## Fase 1 · Base
Alcance aprobado (tabla completa en `bitacora.md` › Pendientes):

| # | Función | Acción concreta | Estado |
|---|---|---|---|
| 1 | Ficha por proyecto | `proyecto.json`: nombre, estado, %, partes (código, material, web, BD) | ✅ «Ficha del proyecto» |
| 2 | Proyecto con varias carpetas | Unir G:, H: y htdocs en un solo árbol | ✅ «Vista de administración» |
| 3 | Tablero de tarjetas | Una tarjeta por proyecto con estado y barra de % | ✅ «Tablero de proyectos» |
| 4 | Git de un vistazo | Rama, cambios pendientes y botón «Activar git» | ✅ «Tablero de proyectos» |
| 5 | Botones rápidos | Abrir carpeta, VS Code, Claude, terminal, localhost | ✅ «Tablero de proyectos» |
| 8 | Filtros | Activo / Pausado / Terminado / Archivo | ✅ «Tablero de proyectos» |

### ✅ Ancla: cada parte sigue unida al proyecto aunque se mueva (ok 2026-11-21)
Cada carpeta de un proyecto lleva un archivo oculto `.desklens-ancla` con un id único y nada más (no dice a qué proyecto pertenece). La ficha guarda **el id**; la ruta es solo «la última vez que la vi». Si la carpeta se mueve, DeskLens busca el id y actualiza la ruta sola.

```
G:\homeshape\.desklens-ancla                    id 7f3a…
H:\Videos - Material HomeShape\.desklens-ancla  id 91bd…
```

Probado en este PC (2026-11-21): mover dentro del mismo disco conserva el ID de NTFS; **a otro disco no**. El archivo ancla sí viaja siempre → el ancla no puede depender solo de Windows.

| Punto | Cómo |
|---|---|
| Búsqueda | 1) última ruta conocida → 2) ID de NTFS (mismo disco) → 3) recorrer los discos agregados |
| Discos agregados | Solo **para buscar anclas**: no se indexa su contenido |
| No se recorre | `Windows`, `Program Files`, `node_modules`, `vendor`, `$RECYCLE.BIN`, `.git` |
| Copias | Dos carpetas con la misma ancla → pregunta cuál es la buena («¿esta es una copia?») |
| Git | El ancla es un archivo de texto pequeño: se sube o se ignora, a elección |
| Disco desconectado | «⚠ no disponible (disco F: no conectado)»; la parte no se borra de la ficha |
| Archivos sueltos | Se anclan por la carpeta que los contiene |
| Ancla borrada | Aviso «no encuentro esta parte» y se reasigna con un clic |
| DeskLens cerrado al mover | Se entera al abrir: al instante si la ruta sigue, unos segundos si recorre discos |
| Red y USB | Igual, mientras estén conectados al buscar |

### ✅ Cambiar el «+» de agregar proyecto (necesario para el ancla; ok 2026-11-21)
Hoy «+» añade la carpeta como proyecto (`add_paths`) y eso **indexa todo su contenido** (FTS, PDF y Word), pone un vigilante de cambios en todas sus subcarpetas y deja que la ventana lea cualquier archivo dentro (`allowed`). Con un disco entero (por ejemplo `C:\`, 576 GB) sería un índice enorme, miles de avisos de cambios y acceso a todo el disco.

Propuesta:
- **Bloquear un disco entero como proyecto** (C:\, D:\, G:\…). Explicar por qué con `ask()` y ofrecer «Agregar como disco para buscar anclas».
- **Discos para anclas** aparte, en su propia lista de ⚙ Ajustes: sin índice, sin vigilante y sin abrir archivos; solo se recorren para encontrar `.desklens-ancla`.
- Aviso también para carpetas muy grandes o de sistema (`C:\Users`, `C:\Windows`, `Program Files`) antes de indexarlas.
- ✅ **Decidido:** los discos enteros (C: incluido) entran **solo como discos para anclas**. Nunca se indexan.

### ✅ Anclas no encontradas y discos agregados (ok 2026-11-21)
Dos iconos nuevos en la barra del organizador:

```
  … Vista: [▦ Tarjetas ▾]        [⚠ 3]  [💽 5]  [+ Buscar en discos]
```

**⚠ Alertas: anclas no encontradas**
```
┌ ⚠ No encontradas (3) ───────────────────────────────────────────────────────────┐
│ Proyecto    Parte        Última ruta                       Vista por última vez │
│ homeshape   🎬 Material   H:\Homeshape\videos               hace 3 días  [Buscar] │
│ ICFV        🌐 Web        C:\xampp\htdocs\icfv              ayer         [Buscar] │
│ curso-wp    📄 Docs       E:\cursos\wp  (E: no conectado)   hace 2 sem.  [Buscar] │
│                                                                                  │
│ [Buscar todas en todos los discos]                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Buscando 3 anclas…                                                  [Detener]    │
│  G:  ██████████ listo   2,7 s   ✓ 1 encontrada → G:\Archivo\videos               │
│  H:  ██████████ listo   0,9 s                                                    │
│  C:  ████▌░░░░░ 48 %    1 min 50 s · faltan ~2 min · 241 000 carpetas            │
│  D:  ░░░░░░░░░░ en espera                                                        │
│  E:  ✗ no conectado                                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- **Solo busca el ancla, no indexa nada:** recorre nombres de carpetas buscando el archivo exacto `.desklens-ancla`; al verlo comprueba que sea archivo (no carpeta), que mida pocos bytes y que su **id** dentro coincida. No abre ni lee ningún otro archivo.
- **Orden para que sea rápido:** 1) ID de NTFS (instantáneo si se movió dentro del mismo disco) → 2) el disco donde estaba → 3) los demás discos, de menor a mayor tiempo medido.
- **Un solo recorrido para todas:** si faltan 3, se buscan las 3 a la vez; se para en cuanto aparecen todas.
- **Progreso visible:** barra por disco, carpetas recorridas, tiempo y lo que falta (estimado con lo que tardó la última vez). Se puede **Detener**; sigue en segundo plano si cierras la ventana de alertas.
- Al encontrarla: actualiza la ruta en `anclas.json` y avisa «✓ Material de homeshape está ahora en G:\Archivo\videos». Si encuentra **dos** con el mismo id (una copia), pregunta cuál es la buena (como ya está aprobado).
- Se salta Windows, Program Files, AppData, $Recycle.Bin y System Volume Information.
- El ⚠ también se revisa solo al abrir DeskLens y al conectar un disco (solo pasos 1 y 2, rápidos).

**💽 Discos agregados**
```
┌ 💽 Discos para anclas ────────────────────────────────────────────┐
│ ☑ G:  Proyectos     931 GB   conectado     último recorrido 2,7 s │
│ ☑ H:  Materiales    1,8 TB   conectado     0,9 s                  │
│ ☑ C:  Sistema       576 GB   conectado     ~4 min                 │
│ ☐ D:  Datos         465 GB   conectado     2,6 s                  │
│ ☑ E:  Respaldo USB  1 TB     no conectado                         │
│ [+ Añadir disco]                  Saltar también: [carpetas…]     │
└───────────────────────────────────────────────────────────────────┘
```
- ☑/☐ marca en qué discos se busca; **quitar** un disco no borra anclas ni fichas.
- Cada disco se reconoce por su **número de serie**, no por la letra: si E: vuelve como F:, sigue siendo el mismo.
- «Saltar también» permite excluir carpetas enormes que sabes que no tienen proyectos (ver abajo).

**🚫 Carpetas excluidas por disco** (✅ ok 2026-11-21)
Cada disco de la lista tiene su icono 🚫 con el número de excluidas: `☑ C:  Sistema  576 GB  conectado  ~4 min  [🚫 9]`

```
┌ 🚫 Excluidas en C: (Sistema · serie 4A1F-22C0) ─────────────────────────┐
│ Predeterminadas                                                        │
│  🔒 C:\Windows                                              [quitar]    │
│  🔒 C:\Program Files                                        [quitar]    │
│  🔒 C:\Program Files (x86)                                  [quitar]    │
│  🔒 C:\ProgramData                                          [quitar]    │
│  🔒 C:\Users\*\AppData                                      [quitar]    │
│  🔒 $Recycle.Bin · System Volume Information · Recovery · PerfLogs      │
│ Tuyas                                                                  │
│  📁 C:\Users\Cesar\Videos\Capturas                          [quitar]    │
│ [+ Añadir carpeta…]   [Restaurar predeterminadas]                      │
│ Último recorrido con estas exclusiones: 3 min 50 s                     │
└────────────────────────────────────────────────────────────────────────┘
```

| Regla | Cómo funciona |
|---|---|
| Dónde se guarda | `historial/organizador/discos.json`, por **número de serie** del disco (no por letra). No se escribe nada en el disco mismo: la raíz de C:\ pide permisos de administrador y un USB podría ser de solo lectura |
| Predeterminadas en C: | Windows, Program Files, Program Files (x86), ProgramData, AppData de cada usuario, $Recycle.Bin, System Volume Information, Recovery, PerfLogs |
| Predeterminadas en todos los discos | $Recycle.Bin, System Volume Information y, dentro de cualquier carpeta, `.git`, `node_modules` y `__pycache__` (nunca tienen anclas y son lentas de recorrer) |
| Quitar una predeterminada | Se puede; queda marcada para no volver sola. **Restaurar predeterminadas** las devuelve |
| Añadir | Con el selector de carpetas o pegando la ruta; también clic derecho en una carpeta de la búsqueda → «Excluir de la búsqueda» |
| Comodín | `*` para «cualquier usuario» (`C:\Users\*\AppData`) |
| Al cambiar | Se borra el tiempo estimado de ese disco y se mide de nuevo en el siguiente recorrido |

### ✅ Flujo de arranque: de los discos a los proyectos (ok 2026-11-21)
1. Icono **Proyectos** vacío → lista de **todos los discos**, como «Este equipo» de Windows: nombre, letra y barra de usado/libre.
2. **✓ en los discos de trabajo.**
3. DeskLens recorre **solo los nombres de las carpetas** (sin leer archivos ni indexar) y **relaciona por nombre** (`homeshape` ↔ `Videos - Material HomeShape` ↔ `homeshape_calidad`).
4. Propone una **red de relaciones** al estilo Obsidian, con nombre y ruta de cada carpeta.
5. **✓ / ✗** a cada relación propuesta → al confirmar se crea la ficha y se ponen las anclas.
   - ✅ **Cada proyecto lleva siempre «Ver detalles»** (con el número de coincidencias). Abre el **editor de jerarquía** de ese proyecto; **«← Regresar»** vuelve a la red **recordando lo marcado y lo movido**, y se continúa con los demás.

### ✅ Editor de jerarquía (pantalla reutilizable, ok 2026-11-21)
La misma pantalla sirve en el arranque y después en la vista de administración del proyecto.
- **Diagrama** del proyecto: proyecto → partes (código, material, web, respaldos…) → carpetas, con nombre y ruta.
- **Arrastrar y soltar** para cambiar la jerarquía: soltar una carpeta sobre otra parte la hace hija de esa parte; soltarla en «Sin proyecto» la desliga; soltarla sobre otro proyecto (panel izquierdo) la pasa a ese proyecto.
- **✓ / ✗** en cada carpeta (incluida o no) y **+ Parte** para crear una parte nueva (por ejemplo «Respaldos»).
- ✅ Cambiar la jerarquía **solo cambia la ficha** (relaciones y anclas): **no mueve archivos en el disco**. Mover de verdad es otra acción de la vista de administración, con confirmación. (confirmado 2026-11-21)
- ✅ **Carpetas compartidas:** una misma carpeta puede estar en varios proyectos (ver abajo).

```
┌─ homeshape · 12 coincidencias ───────────────────────────────── [← Regresar] ┐
│ PROYECTOS      │  DIAGRAMA (arrastra para cambiar la jerarquía)   [+ Parte]  │
│ ● homeshape ◄  │                                                             │
│ ● Biblia       │                  ┌──────────────┐                           │
│ ● ICFV         │                  │ ● homeshape  │                           │
│ ● DeskLens     │                  │ G:\homeshape │                           │
│                │                  └──────┬───────┘                           │
│ ────────────── │        ┌────────────────┼─────────────────┐                 │
│ SIN PROYECTO   │   ┌────┴─────┐     ┌────┴─────┐      ┌────┴──────┐          │
│ ☐ homeshape -  │   │ 💻 Código │     │ 🎬 Material│      │ 🗄 Respaldos│          │
│   backup docx  │   └────┬─────┘     └────┬─────┘      └────┬──────┘          │
│   G:\…         │   ☑ homeshape     ☑ Videos - Material  ☑ homeshape_calidad   │
│                │     G:\homeshape    H:\Videos - Mat…     G:\homeshape_cal…   │
│                │                   ☑ Curriculo          ☑ homeshape-respaldos │
│                │                     H:\Curriculo         G:\homeshape-resp…  │
│                │                   ☑ Manual_Tutor HS.mp4                      │
│                │                     H:\ (archivo suelto)                     │
├────────────────┴─────────────────────────────────────────────────────────────┤
│ ✋ Arrastrando «homeshape-respaldos» → suelta sobre una parte, otro proyecto   │
│    o «Sin proyecto»                                      8 de 12 elegidas    │
└──────────────────────────────────────────────────────────────────────────────┘
```
6. Desde ahí empieza la **administración** (agregar, quitar, mover). Es **otra vista** por desarrollar: administrar y ver cada proyecto.

Medido en este PC (2026-11-21), recorriendo solo carpetas y saltando las de sistema (`Windows`, `Program Files`, `AppData`, `node_modules`…):

| Disco | Usado | Carpetas | Tiempo |
|---|---|---|---|
| G: (SSD) | 26 / 240 GB | 12 075 | 2,7 s |
| H: (NVMe) | 30 / 250 GB | 1 317 | 0,9 s |
| D: (HDD) | 11 / 476 GB | 1 555 | 2,6 s |
| E: (HDD) | 268 / 524 GB | 2 060 | 14 s |
| F: (HDD 1 TB) | 167 / 1000 GB | 312 | 0,9 s |
| **C: (SSD 1 TB)** | 620 / 959 GB | **503 385** | **≈ 4 min** (`Users`: 484 000 carpetas, 247 s) |

Conclusiones:
- El tiempo depende de **cuántas carpetas** hay, no del tamaño del disco: F: con 1 TB tarda menos de 1 s.
- C: entero es viable, pero **la primera vez** tarda unos 4 min: se recorre en segundo plano con barra de progreso y se puede seguir usando DeskLens.
- La lista de carpetas se guarda (SQLite): las siguientes veces solo se repasa lo cambiado.
- Para C: se saltan además las carpetas de herramientas dentro de `Users` (`.cache`, `.npm`, `.nuget`, `.vscode`, etc.), que son la mayor parte y nunca son proyectos.
- Relación por nombre: solo con palabras de 4 letras o más, sin mayúsculas, tildes ni separadores (`HomeShape` = `homeshape` = `home_shape`); siempre se propone y el usuario confirma.
- Ancla que se movió **dentro del mismo disco**: se encuentra al instante por el ID de NTFS, sin recorrer nada.

### ✅ Carpetas compartidas entre proyectos (ok 2026-11-21)
Una carpeta de recursos (por ejemplo `H:\Recursos\Logos`) puede estar en **varios proyectos** a la vez. El ancla solo tiene un id; cada ficha que la use apunta a ese mismo id.

| Acción en el editor de jerarquía | Resultado |
|---|---|
| Arrastrar | **Mueve** la carpeta a otra parte o a otro proyecto |
| **Ctrl + arrastrar** sobre otro proyecto | **La comparte**: queda en los dos |
| Quitar de un proyecto | Solo sale de ese; los demás la conservan |
| Mover la carpeta en el disco (vista de administración) | Avisa: «La usan 3 proyectos: homeshape, Biblia, ICFV» |

En el diagrama se marca con 🔗 y «en 3 proyectos»; al pasar el ratón se ven cuáles.

### ✅ Ficha del proyecto (punto 1, ok 2026-11-21)
Tres piezas separadas, para que una carpeta compartida o movida se actualice **una sola vez**:

| Pieza | Dónde | Qué guarda |
|---|---|---|
| Ancla | `.desklens-ancla` (oculto) dentro de cada carpeta | Solo `{"id", "creada"}` |
| Registro de anclas | `historial/organizador/anclas.json` | id → última ruta, disco (serie del volumen), ID de NTFS, última vez vista |
| Ficha | `historial/organizador/proyectos/<id>.json` | El proyecto: datos, partes y los ids de sus anclas (nunca rutas) |

`historial/` ya está fuera de Git: las fichas no se mezclan con el código de DeskLens. Copia de respaldo con «Exportar fichas».

```json
{
  "id": "homeshape",
  "nombre": "homeshape",
  "estado": "activo",                 // activo · pausado · terminado · archivo
  "avance": 90,                       // 0–100, a mano
  "descripcion": "Plataforma de homeschooling cristiano",
  "tecnologia": ["Laravel", "PostgreSQL"],
  "color": "#7c5cff",
  "enlaces": [
    {"nombre": "Local", "url": "http://localhost/homeshape"},
    {"nombre": "Producción", "url": "https://…"}
  ],
  "nota": "01 Tecnología/Proyectos/homeshape",   // nota del vault de Obsidian (opcional)
  "partes": [
    {"nombre": "Código",    "tipo": "codigo",    "carpetas": [{"ancla": "7f3a…", "activa": true}]},
    {"nombre": "Material",  "tipo": "material",  "carpetas": [{"ancla": "91bd…", "activa": true},
                                                              {"ancla": "5c2e…", "activa": true, "icono": "📚"}]},
    {"nombre": "Respaldos", "tipo": "respaldos", "carpetas": [{"ancla": "a04f…", "activa": false}]}
  ],
  "historial": {"dias": 7, "mb": 200},          // cuota del proyecto (buzón)
  "conexiones": [{"de": "91bd…", "a": "web", "etiqueta": "se publica en", "color": "#e0a030"}],
  "cajas": [{"id": "c1", "texto": "Grabar → Editar → Subir"}],
  "posiciones": {"flujo": {}, "red": {}},          // dónde dejaste cada nodo y el zoom
  "creado": "2026-11-21", "actualizado": "2026-11-21"
}
```

- **Tipos de parte:** `codigo` 💻 · `material` 🎬 · `web` 🌐 · `respaldos` 🗄 · `base_datos` 🛢 · `documentos` 📄 · `otro` 📁. El nombre de la parte es libre.
- **No se guarda** (se calcula al abrir): estado de Git, tamaño, si el disco está conectado, en cuántos proyectos está cada carpeta.
- **Fases posteriores:** `pendientes` (Fase 2) y `servicios` (Fase 3) se añaden a la ficha cuando lleguen.
- La ficha se edita desde la ventana (formulario y editor de jerarquía), no a mano.
- Campos añadidos por lo aprobado después: `icono` en cada carpeta (vacío = sugerido por nombre), `historial` (cuota), `conexiones`, `cajas` y `posiciones` (vistas Flujo y Red). Cada cambio de la ficha entra en su historial propio.

### ✅ Tablero de proyectos (punto 3, con 4, 5 y 8; ok 2026-11-21)
Se abre con el icono **🗂 Proyectos** de la barra lateral. Ocupa el centro (como la pantalla completa de Git) y usa el ancho en rejilla, según `reglas.md`.

```
┌─ 🗂 Proyectos ───────────────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar proyecto…        ]  [Activos 4] [Pausados 1] [Terminados 3] [Archivo 9] [Todos] │
│ Orden: [Última actividad ▾]   Vista: [▦ Tarjetas ▾]                    [+ Buscar en discos]│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌▌homeshape ────────── ⭐ ┐ ┌▌Biblia ────────────── ┐ ┌▌DeskLens ──────────── ⭐ ┐        │
│ │ ● Activo     ██████▉ 90%│ │ ● Activo    ████▉░ 70% │ │ ● Activo     █████▏ 85% │        │
│ │ Homeschooling cristiano │ │ API bíblica, consejería│ │ Visor/editor local     │        │
│ │ Laravel · PostgreSQL    │ │ Python · PostgreSQL    │ │ Python · JS            │        │
│ │ 💻1 🎬2 🗄1 🌐1          │ │ 💻1 📄1                 │ │ 💻1                     │        │
│ │ ⎇ main · 3 cambios · ↑2 │ │ ⎇ main · al día        │ │ ⎇ ventana-sin-edge · ↑1 │        │
│ │ hace 2 h                │ │ ayer                   │ │ hace 10 min            │        │
│ │ [📂][VS][✦][>_][🌐] [⋯] │ │ [📂][VS][✦][>_]    [⋯] │ │ [📂][VS][✦][>_]    [⋯] │        │
│ └─────────────────────────┘ └────────────────────────┘ └────────────────────────┘        │
│ ┌▌ICFV ───────────────────┐ ┌▌curso-wordpartnerds ──┐                                    │
│ │ ● Activo    ███░░░ 50%  │ │ ◐ Pausado  ██░░░░ 35%  │                                    │
│ │ 🌐1 🎬1  ⚠ H: no conect. │ │ 📄1                     │                                    │
│ │ ⎇ sin git [Activar git] │ │ ⎇ sin git [Activar git]│                                    │
│ └─────────────────────────┘ └────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Tarjeta:** franja del color del proyecto, nombre, ⭐ fijado arriba, estado, barra de avance, descripción, tecnología, partes con su número (⚠ si alguna no está disponible), Git y última actividad.
- **Git (punto 4):** rama, cambios sin commit, ↑ por subir / ↓ por traer; «sin git» con botón **Activar git** (el asistente que ya existe). Se calcula en paralelo, como `git_summary`.
- **Botones (punto 5):** 📂 abrir carpeta del código · VS Code · ✦ Claude · >_ terminal · 🌐 localhost (solo si la ficha tiene ese enlace). **⋯** = Ficha, Editar jerarquía, Notas (Fase 2), Cambiar estado, Quitar del organizador (no borra nada del disco).
- **Filtros (punto 8):** por estado con su número; «Archivo» oculto por defecto. Orden: última actividad, nombre, avance o estado. Se recuerdan.
- **Vistas en un combo (select)** con su icono: ▦ Tarjetas · ☰ Lista (una línea por proyecto, para muchos) · ◉ Red (diagrama de todos los proyectos y sus partes, estilo Obsidian). Se recuerda la elegida.
- **Clic en la tarjeta** → vista de administración del proyecto (otra pantalla, por diseñar).
- **Vacío** → el flujo de arranque (elegir discos).

### ✅ Vista de administración del proyecto (punto 2, ok 2026-11-21)
Se abre al hacer clic en una tarjeta del tablero. Une todas las carpetas del proyecto (G:, H:, htdocs…) en **un solo árbol**, agrupado por partes.

```
┌─ ← Tablero ─────────────────────────────────────────────────────────────────────────────────┐
│ ▌homeshape  ● Activo ▾  ██████▉ 90%   Laravel · PostgreSQL   ⎇ main · 3 cambios · ↑2        │
│ [📂][VS][✦][>_][🌐 localhost/homeshape]          [Archivos] [Ficha] [Git] [Historial] [Notas]│
├──────────────────────────────┬──────────────────────────────────────────────────────────────┤
│ Buscar en el proyecto… 🔍    │  📄 resources/views/inicio.blade.php                          │
│                              │  ────────────────────────────────────────────────────────    │
│ 💻 Código                    │   (el visor/editor de DeskLens que ya existe:                │
│  └ 📁 G:\homeshape     ⎇ ✓   │    código, PDF, Word, imágenes, vídeo…)                      │
│     ├ app/                   │                                                              │
│     ├ resources/  ●          │                                                              │
│     └ …                      │                                                              │
│ 🎬 Material                  │                                                              │
│  ├ 📁 H:\Homeshape\videos    │                                                              │
│  └ 📁 G:\biblia   🔗 compart.│                                                              │
│ 🌐 Web                       │                                                              │
│  └ 📁 C:\xampp\htdocs\hs     │                                                              │
│ 🗄 Respaldos                 │                                                              │
│  └ 📁 E:\resp\hs  ⚠ no conect│                                                              │
│                              │                                                              │
│ [Editar jerarquía]           │                                                              │
└──────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

| Pestaña | Qué muestra |
|---|---|
| **Archivos** (por defecto) | Árbol unido a la izquierda + visor/editor de DeskLens a la derecha. La búsqueda busca solo dentro de las carpetas del proyecto |
| **Ficha** | Nombre, estado, avance, descripción, tecnología, color, enlaces (localhost, repo, vault), cuota de historial |
| **Git** | El panel de git que ya tiene DeskLens, apuntando a la carpeta de código |
| **Historial** | Versiones guardadas de los archivos del proyecto, con la barra de cuota |
| **Notas** | Fase 2: notas ancladas del proyecto y su red |

- **Árbol:** cada parte con su icono y sus carpetas; ⎇ si es repo git · 🔗 si es carpeta compartida con otro proyecto · ⚠ si el disco no está conectado (se ve gris, con la última ruta) · ● archivos con cambios sin commit.
- **Editar jerarquía** abre el editor ya aprobado (solo cambia la ficha, nunca mueve archivos).
- **Clic derecho en una carpeta:** abrir en el Explorador, VS Code o terminal, y Quitar del proyecto (no borra nada).
- Estado y avance se cambian desde la cabecera (● Activo ▾ y clic en la barra).
- **← Tablero** vuelve, recordando filtros y vista.
- La pestaña **Archivos** tiene `Vista: [🗂 Contenedor ▾]` con tres opciones: 🗂 Contenedor (el árbol de arriba) · ⇢ Flujo · ◉ Red. Se recuerda la elegida.

#### ✅ Iconos de carpeta: sugeridos por nombre, cambiables (ok 2026-11-21)
| El nombre contiene | Icono sugerido |
|---|---|
| video, clases, grab | 🎬 |
| audio, musica, podcast | 🎵 |
| img, imagen, foto, diseño | 🖼 |
| doc, documentos, pdf, libro, biblia | 📚 |
| web, public, htdocs, www | 🌐 |
| src, app, codigo, repo con `.git` | 💻 |
| backup, respaldo, copia | 🗄 |
| db, sql, base | 🛢 |
| notas, apuntes | 📝 |
| (nada coincide) | 📁 |

- Clic en el icono → selector de iconos para cambiarlo. Se guarda en la ficha (`carpetas[].icono`); si no hay icono guardado, se usa el sugerido.
- La lista de palabras va en `organizador.py` y se puede ampliar.

### ✅ Vistas Flujo y Red, administrables (ok 2026-11-21)
Las dos usan **los mismos datos** (proyecto → partes → carpetas + conexiones tuyas); solo cambian el acomodo y el estilo. **Nunca mueven archivos.**

**⇢ Flujo** (diagrama de flujo, de arriba a abajo):
```
                 ┌──────────────┐
                 │ ▌homeshape   │
                 └──────┬───────┘
       ┌────────────────┼─────────────────┐
  ┌────▼────┐      ┌────▼─────┐      ┌────▼────┐
  │💻 Código │      │🎬 Material│      │🌐 Web    │
  └────┬────┘      └────┬─────┘      └────┬────┘
  📁 G:\homeshape  🎬 H:\…\videos ──«se publica en»──▶ 🌐 htdocs\hs
                   📚 G:\biblia 🔗
```

**◉ Red** (estilo Obsidian, nodos que se acomodan solos):
```
        🎬 videos ·───· 🎬 Material
                          \
   📚 biblia 🔗 ───────── ● homeshape ───── 💻 Código ─── 📁 G:\homeshape
        \                 /
         ● Curso bíblico  🌐 Web ─── 🌐 htdocs\hs
```

| Acción | Flujo | Red |
|---|---|---|
| Arrastrar un nodo | Lo coloca; la posición se guarda | Lo fija; los demás se reacomodan |
| Arrastrar desde el borde de un nodo a otro | Crea un **conector** con etiqueta («usa», «genera», «se publica en») | Igual |
| Clic en un conector | Cambiar etiqueta, color, dirección o borrarlo | Igual |
| Agregar caja libre | Pasos o ideas («Grabar → Editar → Subir») | Nodo idea |
| Doble clic en carpeta | Abre la vista Contenedor en esa carpeta | Igual |
| Pasar el ratón | — | Resalta sus vecinos |
| Botón «Reacomodar» | Vuelve al orden automático | Igual |

- ✅ **Pizarra sin límites** (ok 2026-11-21): Flujo y Red no se limitan al ancho de la pantalla; la pizarra se desplaza en cualquier dirección.

  | Gesto | Hace |
  |---|---|
  | Arrastrar en un espacio vacío (o espacio + arrastrar, o botón central) | Desplaza la pizarra |
  | Rueda del ratón | Desplaza arriba/abajo; con Shift, a los lados |
  | Ctrl + rueda (o pellizco en el touchpad) | Zoom hacia donde está el ratón |
  | Doble clic en un espacio vacío | Crea una caja libre ahí |
  | `0` / botón ⤢ | Ajustar todo a la pantalla |
  | Flechas | Mover la pizarra con el teclado |

  ```
  ┌──────────────────────────────────────────────── pizarra ─┐
  │                                                          │
  │        (nodos en cualquier lugar, sin borde)             │
  │                                          ┌─ minimapa ──┐ │
  │                                          │ ▫ ▫  ┌──┐   │ │
  │                                          │   ▫  │▓▓│ ▫ │ │
  │  [⤢] [−] 100 % [+]                       └──────┴──┴───┘ │
  └──────────────────────────────────────────────────────────┘
  ```
  - **Minimapa** abajo a la derecha: muestra toda la pizarra y el recuadro de lo visible; se arrastra para saltar. Se oculta con un clic.
  - Se recuerdan el zoom y la posición por proyecto y por vista.
  - Cytoscape.js ya trae desplazamiento y zoom; el minimapa es la extensión *cytoscape-navigator*.
- **Dos clases de conector:** los de jerarquía (gris, salen de la ficha; editarlos = editor de jerarquía) y los tuyos (de color, solo relaciones).
- Las carpetas compartidas 🔗 unen proyectos solos en la Red, sin hacer nada.
- Se guarda en la ficha: `conexiones:[{de, a, etiqueta, color}]`, `cajas:[…]` y `posiciones:{flujo:{…}, red:{…}}`.
- **Librería:** Cytoscape.js (MIT, desde cdnjs como CodeMirror) para las dos vistas: acomodo en árbol para Flujo y por fuerzas para Red; extensión *edgehandles* para dibujar conectores. Dibuja en canvas: aguanta miles de nodos.

### ✅ Historial del proyecto, comparativo en las 3 vistas y notas en nodos (ok 2026-11-21)

**1. Historial de la estructura (siempre se guarda, sin tope ni días)**
Todo lo que cambia en la ficha queda en el historial: partes, carpetas, iconos, conectores, cajas, posiciones y notas de nodos.

| Punto del historial | Cuándo se crea | Ejemplo |
|---|---|---|
| Automático | Con cada cambio (los cambios de 5 minutos seguidos se juntan en uno) | «hace 2 h · +1 carpeta, 2 conectores» |
| Versión con nombre | Botón **Guardar versión**, como el que ya tiene DeskLens | «v3 · antes de reorganizar material» |
| Commit del proyecto | Se marca solo si la carpeta de código tiene git | «⎇ 3710d74 · Ventana propia…» → la estructura que había en ese momento |

- **Cómo se guarda: historial propio, sin git** (decidido 2026-11-21). DeskLens funciona sin git (en `instalar.ps1` git es solo «recomendado»), así que el historial no puede depender de él. Cada punto = una copia de la ficha en gzip en `historial/organizador/versiones/<id>/`, igual que hace hoy `historial/versiones`. Las versiones con nombre llevan su nombre y no se juntan.
- **Git solo opcional:** si la carpeta de código tiene git y está instalado, sus commits aparecen como marcas en la línea de tiempo para comparar «la estructura cuando hice tal commit». Sin git, todo lo demás funciona igual.
- **Peso:** una ficha ocupa 2–10 KB y comprimida 1–3 KB: 1 000 versiones ≈ 3 MB. Por eso **no tiene cuota ni se borra**.
- **Restaurar** una versión crea un punto nuevo; nunca se pierde la actual.

**2. Comparativo en las 3 vistas (Contenedor, Flujo y Red)**
Barra arriba de la vista: `⇆ Comparar con: [v3 · 10 nov ▾]   (●) Encima  ( ) Lado a lado   [☐ Solo cambios]   ↑ ↓ 4 cambios`

```
⇢ Flujo comparado con v3                     +2 carpetas · −1 · 1 movida · 2 conectores · 1 nota
                 ┌──────────────┐
                 │ ▌homeshape   │           (lo que no cambió, opaco al 30 %)
                 └──────┬───────┘
       ┌────────────────┼─────────────────┐
  ┌────▼────┐      ┌────▼─────┐      ┌────▼────┐
  │💻 Código │      │🎬 Material│      │🌐 Web    │
  └─────────┘      └────┬─────┘      └────┬────┘
              ┏━━━━━━━━━┻━━━━━━━━┓   ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
              ┃🟢 + 🎵 audios     ┃   ╎🔴 − 📁 viejo  ╎   (borrado: rojo, línea punteada)
              ┗━━━━━━━━━━━━━━━━━━┛   └╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
              🟠 📚 biblia  ↷ antes en Código  ·  🔵 icono 📁→📚  ·  💬 nota nueva
```

| Color | Significa |
|---|---|
| 🟢 verde, borde grueso | Nuevo (carpeta, parte, conector, caja, nota) |
| 🔴 rojo, punteado y tachado | Quitado (se ve como fantasma donde estaba) |
| 🟠 ámbar + flecha tenue desde su sitio anterior | Movido de parte o de posición |
| 🔵 azul | Cambió nombre, icono, etiqueta o color |
| Gris al 30 % | Sin cambios (contexto) |

- **Encima:** una sola vista con todo marcado. **Lado a lado:** antes | ahora, con desplazamiento y zoom sincronizados (como el comparador de versiones de DeskLens).
- **↑ ↓** salta de un cambio al siguiente y lo centra; **Solo cambios** oculta el contexto.
- En el **Contenedor** se marca igual en el árbol: `+` verde, `−` rojo tachado, `↷` ámbar con «antes en …».

**3. Notas y comentarios en nodos y conectores (uniones)**
```
                                         ┌ 💬 Notas · 📚 G:\biblia ──────────────┐
  📚 biblia 🔗 💬2 ──«usa»💬1── ● homeshape │ 2026-11-21  Textos para la lección 4 │
                                         │ 2026-11-18  ☐ Revisar traducción RVR │
                                         │ [Escribir nota…]  (Markdown, [[enlaces]]) │
                                         └───────────────────────────────────────┘
```
- Clic en un nodo o en un conector → panel lateral con sus notas, ordenadas por fecha; se pueden marcar tareas ☐/☑.
- El nodo o la unión muestra **💬 y el número** de notas.
- Se guardan en el mismo formato que las **notas ancladas** (Markdown en `historial/organizador/notas/`), anclada al nodo o al conector; así la Fase 2 solo las amplía a páginas y párrafos.
- Las notas entran en el historial y en el comparativo (💬 nueva, cambiada o borrada).

### ✅ Historial de versiones en todos los proyectos (ok 2026-11-21)
DeskLens ya guarda versiones de cada archivo en `historial/versiones` sin tocar su carpeta. Medido hoy: **25 MB** para 2 135 archivos (texto en gzip, imágenes en PNG, Word por cambios, PDF por páginas y notas), con tope de 1000 MB y borrado a los 7 días sin editar.

| Tipo de parte | ¿Versiones? |
|---|---|
| 💻 Código · 📄 Documentos · 🌐 Web | ✅ Sí: texto, Word, PDF (sus ediciones) e imágenes |
| 🎬 Material | Solo Word, PDF, texto e imágenes que se editen en DeskLens; **vídeo y audio no** (solo notas) |
| 🗄 Respaldos · 🛢 Base de datos | ❌ No (ya son copias) |

- **Mejora necesaria:** hoy cada historial se identifica por el **hash de la ruta**, así que se pierde si el archivo se mueve. Con el organizador se identifica por **ancla + ruta relativa**: el historial sigue al archivo aunque se mueva la carpeta.
- ✅ **Cuota por proyecto, como un buzón de correo:** cada proyecto tiene su propia cuota de **días** y de **MB**, que se cambia en su ficha.

  ```
  ┌ Ficha · homeshape ─────────────────────────────────────────┐
  │ Historial de versiones                                     │
  │   Guardar por: [ 7 ] días     Cuota: [ 200 ] MB            │
  │   Usado: ████████░░░░░░░░░░░░  48 MB de 200 MB  (24 %)     │
  │   [Vaciar historial del proyecto]                          │
  └────────────────────────────────────────────────────────────┘
  ```

  | Regla | Cómo funciona |
  |---|---|
  | Valores al crear el proyecto | **7 días y 200 MB** por defecto; se cambia en la ficha |
  | Días | Se borra el historial de un archivo de ese proyecto tras N días sin editarlo |
  | MB llena | Se borran primero las versiones **más antiguas de ese proyecto**; nunca las de otro |
  | Aviso | Al 90 % la barra se pone ámbar; al 100 % roja y aviso en el tablero |
  | Archivos sin proyecto | Siguen con el ajuste general (7 días, 1000 MB) |
  | 0 MB | El proyecto no guarda versiones |
- Los cambios hechos fuera de DeskLens siguen con su límite actual (solo texto de hasta 1 MB).
- Estimado: con todos los proyectos de código y documentos, entre 100 y 300 MB; dentro del tope de 1000 MB.

### ✅ Notas ancladas · Fase 2 (ok 2026-11-21)
Ideas, comentarios y apuntes que viven **en DeskLens** (no dentro de los archivos) y apuntan a un proyecto, una parte, una carpeta, un archivo o un **punto exacto** dentro de él. Si el archivo se pierde, se mueve o el disco se desconecta, **la nota sigue ahí**.

| Pieza | Dónde | Qué guarda |
|---|---|---|
| Nota | `historial/organizador/notas/<id>.md` | Texto en Markdown (compatible con Obsidian), con `[[enlaces]]` a otras notas |
| Destino de la nota | Cabecera de la nota | Ancla de la carpeta + ruta relativa del archivo + huella del archivo + punto exacto |

**Punto exacto según el tipo de archivo** (modelo W3C Web Annotation, el que usa Hypothesis):

| Archivo | Se ancla a | Cómo se reencuentra si el archivo cambia |
|---|---|---|
| PDF (visor pdf.js) | Página + texto seleccionado | Cita exacta + 32 letras antes y después; búsqueda aproximada si cambió |
| Word (docx-preview) | Párrafo + texto seleccionado | Igual: cita + contexto |
| Markdown, texto, código (CodeMirror) | Línea + texto seleccionado | Cita + contexto; la línea es solo una pista |
| Imagen | Rectángulo (x, y, ancho, alto en %) | No cambia si se redimensiona |
| Audio / vídeo | Minuto y segundo | — |
| Carpeta o archivo entero | El ancla o el archivo | Ancla → ruta relativa → ID de NTFS → nombre + tamaño |

✅ **Reanclaje por prioridad: 1) archivo → 2) página → 3) contexto.** La nota **nunca se suelta**: se queda en el último nivel que encontró y avisa qué falta.

| Encontró | Estado | Se muestra |
|---|---|---|
| Archivo + página + contexto | ✓ anclada | La nota en su sitio exacto |
| Archivo + página, sin contexto | ⚠ contexto no encontrado | La nota en esa página, con la cita guardada |
| Archivo, sin página | ⚠ página no encontrada | La nota en el archivo, con «estaba en la pág. 37» y la cita |
| Ni el archivo (o disco desconectado) | ⚠ archivo no encontrado | La nota sola, con la última ruta, página y cita |

Si el contexto aparece en **otra** página, se muestra como sugerencia («¿ahora está en la pág. 39?») y el usuario confirma; no se mueve sola.

Subred por archivo: cada archivo con notas abre su propio diagrama (archivo → notas → notas enlazadas → otros archivos); desde el proyecto se ve la red completa.

### ✅ Editor de notas al estilo Obsidian · Fase 2 (ok 2026-11-21)
Vale para las notas de DeskLens y para cualquier `.md` que se abra en DeskLens.

**1. Enlaces a carpetas y archivos con `[[ ]]`**
| Se escribe | Apunta a |
|---|---|
| `[[videos]]` | Carpeta anclada «videos» |
| `[[videos/clase1.mp4]]` | Archivo dentro de una carpeta anclada |
| `[[homeshape/videos/clase1.mp4]]` | Igual, con el proyecto delante si hay dos «videos» |
| `[[biblia/génesis.pdf#page=12]]` · `[[…mp4#t=1:20]]` · `[[…py#L10-20]]` | Página, minuto o líneas |
- Al escribir `[[` sale un buscador con notas, carpetas ancladas y archivos; se escribe la **ruta más corta que no se confunda** (como Obsidian).
- Por dentro, cada enlace se resuelve a **ancla + ruta relativa**: el texto se ve legible, pero sigue funcionando aunque la carpeta se mueva.

**2. Renombrar actualiza los enlaces**
- Renombrar una carpeta, archivo o nota **desde DeskLens** → actualiza todos los `[[ ]]` de las notas de DeskLens.
- Renombrado **fuera** (Explorador): la carpeta se reconoce por su ancla y el archivo por su ID de NTFS; DeskLens avisa «3 enlaces apuntan al nombre viejo · [Actualizar]».
- En notas del **vault**: muestra la lista de notas que cambiaría y pide ok antes de tocarlas.

**3. Editar de dos formas (y leer)**
```
┌ 📝 Ideas homeshape.md ───────────────────────────────────────────────────────┐
│ [✎ Fuente] [◐ En vivo] [👁 Lectura]   [⫴ Lado a lado]   B  I  [[ ]]  ▦  ☑  🖼  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Lecciones del curso                     ← en vivo: el título ya se ve grande  │
│ Grabar la **lección 4** con [[videos]]  ← solo la línea del cursor muestra    │
│ ☑ Revisar traducción                       los símbolos                       │
│ ┌──────────┬──────────┐                                                       │
│ │ Lección  │ Estado   │ ← tabla editable como tabla                           │
│ └──────────┴──────────┘                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```
| Botón | Qué hace |
|---|---|
| ✎ **Fuente** | Markdown con todos sus símbolos (el editor de hoy) |
| ◐ **En vivo** | Como Obsidian: se ve formateado y solo la línea del cursor muestra `**`, `##`, `[[ ]]` |
| 👁 **Lectura** | Sin editar; clic en enlaces y casillas |
| ⫴ **Lado a lado** | Fuente a la izquierda, vista a la derecha, con desplazamiento sincronizado (como `reglas.md`) |
| Ctrl+Alt+E | Alterna Fuente ↔ En vivo (Ctrl+E queda para el explorador de abiertos). Se recuerda el último modo por archivo |
- Barra pequeña (B, I, enlace, tabla, casilla, imagen) solo para quien no recuerde la sintaxis; todo se puede escribir a mano.
- **Técnica:** «En vivo» necesita **CodeMirror 6** (el de Obsidian), cargado desde jsDelivr solo para Markdown. El código sigue con CodeMirror 5. Es la pieza más grande de esta lista.

**4. Citar cualquier archivo completo con `![[ ]]` (solo lectura)**
| Se escribe | Se muestra dentro de la nota |
|---|---|
| `![[foto.png\|300]]` | La imagen, a 300 px |
| `![[génesis.pdf#page=12]]` | Esa página del PDF (visor de DeskLens) |
| `![[contrato.docx]]` | El Word (docx-preview) |
| `![[clase1.mp4#t=1:20]]` | El vídeo, empezando en 1:20 |
| `![[app.py#L10-20]]` | Esas líneas, con colores |
| `![[otra nota]]` · `![[otra nota#Título]]` | La nota o solo esa sección |
- Se ve en un recuadro con borde, el nombre arriba y **[↗ Abrir]**; dentro no se edita. Si no aparece: ⚠ como en las notas ancladas.

**5. Imágenes más fáciles de usar**
- **Pegar** (Ctrl+V) o **arrastrar** una imagen → se guarda en la carpeta de adjuntos de la nota y se inserta `![[…]]`.
- Arrastrar la esquina para cambiar el tamaño (escribe `|ancho`).
- Clic derecho: abrir en el visor de imágenes de DeskLens, copiar, cambiar nombre (actualiza enlaces).

**6. Notas en Flujo y Red: icono y cuadro flotante**
```
   📚 G:\biblia 🔗 ⦿2 ───«usa»⦿1─── ● homeshape
                   ▲
          ┌────────┴─────────────────────────────┐
          │ 💬 2 notas · 📚 biblia                │
          │ **Lección 4** usar [[génesis.pdf]]    │
          │ ☐ Revisar traducción RVR              │
          │ 21 nov · [Abrir] [+ Nota]             │
          └──────────────────────────────────────┘
```
- Icono de comentario en **color llamativo** (coral o ámbar, distinto del color del proyecto) con el número; aparece en nodos y en uniones.
- **Al pasar el ratón**: cuadro flotante con la nota ya formateada (Markdown, casillas, enlaces, imágenes pequeñas). Clic: panel completo para editar.
- Formatos de Obsidian: `#etiquetas`, `- [ ]` casillas, `> [!nota]` avisos, `[[enlaces]]` y `![[citas]]`. Sin comandos: todo con el icono.

**7. Tablas editables como tablas**
- En «En vivo» y «Lectura» la tabla se ve como cuadrícula: clic en una celda y se escribe.
- Tab / Shift+Tab: celda siguiente o anterior; Enter: fila nueva.
- Menú de la tabla: añadir o borrar fila o columna, mover, alinear izquierda/centro/derecha.
- Al guardar se escribe Markdown normal (`| a | b |`), con las columnas alineadas para que se lea bien también en Fuente y en Obsidian.

| Mejora | Viable | Esfuerzo |
|---|---|---|
| 1. `[[carpeta/archivo]]` | ✅ | Medio (buscador + resolución por ancla) |
| 2. Renombrar actualiza enlaces | ✅ | Medio |
| 3. Fuente / En vivo / Lectura / Lado a lado | ✅ | **Alto** (CodeMirror 6 para Markdown) |
| 4. `![[ ]]` de cualquier archivo | ✅ | Medio (usa los visores que ya existen) |
| 5. Imágenes: pegar, arrastrar, tamaño | ✅ | Bajo |
| 6. Icono y cuadro flotante | ✅ | Bajo |
| 7. Tablas como tablas | ✅ | Medio–alto |

### Ideas en estudio (sin ok todavía)
- ✅ **Red de proyectos, materiales y notas del vault:** cada ficha dice qué carpetas (anclas) y notas del vault usa, y DeskLens dibuja la red proyecto ↔ material ↔ notas. ✅ **Va en la Fase 2** (ok 2026-11-21), con las notas ancladas: mismo motor. Las notas del vault solo se leen; un clic las abre en Obsidian (`obsidian://open`). DeskLens no busca reemplazar a Obsidian.

## Revisión de huecos (2026-11-21)

| # | Hueco | Decisión |
|---|---|---|
| 1 | Qué se indexa de cada parte | ✅ ver abajo |
| 2 | Proyectos actuales de DeskLens | ✅ Al abrir el organizador la primera vez: «Tienes N proyectos en DeskLens · [Convertirlos en fichas]». Cada uno pasa a ficha con su carpeta como parte 💻 y su ancla. La barra lateral sigue igual |
| 3 | El ancla dentro de git y de htdocs | ✅ ver abajo |
| 4 | Respaldo de los datos del organizador | ✅ Copia diaria de `historial/organizador/` (fichas, anclas, notas, historial de estructura) a un disco agregado que elijas; se guardan las últimas 14. Más «Exportar fichas» a mano |
| 5 | Orden de construcción | ✅ Ancla → fichas → tablero → vista de administración → Flujo y Red → historial y comparativo |
| 6 | Fase 1 muy grande | ✅ Se divide: **1a** ancla, ficha, «+», alertas/discos, flujo de arranque, editor de jerarquía, tablero, administración · **1b** Flujo y Red en pizarra, historial de estructura, comparativo, notas en nodos |

### ✅ Hueco 1 · Qué se indexa de cada parte (ok 2026-11-21)
Ejemplo, homeshape:

| Parte | Carpeta | Contenido | Si se indexara todo |
|---|---|---|---|
| 💻 Código | G:\homeshape | 2 000 archivos, 30 MB | Normal (como hoy) |
| 🎬 Material | H:\Videos - Material HomeShape | 300 vídeos (400 GB) + 50 PDF | Recorre 400 GB y vigila miles de archivos; los vídeos no aportan texto |
| 🌐 Web | C:\xampp\htdocs\hs | 800 archivos | Normal |
| 🗄 Respaldos | E:\resp\hs | 40 copias .zip/.sql | Duplica todo lo del código en la búsqueda |

| Tipo de parte | Se indexa | Buscar «génesis» encuentra |
|---|---|---|
| 💻 Código · 🌐 Web · 📄 Documentos | Contenido completo (texto, PDF, Word) | `lecciones.php` línea 40 «Génesis 1:1» |
| 🎬 Material | Nombres de archivo + texto de PDF y Word; vídeo/audio/imagen solo por nombre | `Génesis_lección4.mp4` · `Guía Génesis.pdf` pág. 3 |
| 🗄 Respaldos · 🛢 Base de datos | **Nada**: solo se muestran (nombre, tamaño, fecha) en el árbol y en Estado | — |
- Cada parte tiene en la ficha una casilla para cambiarlo («Indexar contenido: sí / solo nombres / no»).

### ✅ Hueco 3 · El ancla dentro de git y de htdocs (ok 2026-11-21)
Ejemplo: se ancla `G:\homeshape` (repo git) y `C:\xampp\htdocs\hs`.

| Sin hacer nada | Qué pasa |
|---|---|
| `git status` | Sale `?? .desklens-ancla` en **cada** proyecto, para siempre |
| Si se hace commit | Se sube a GitHub; al clonar en otro sitio o copiar la carpeta, hay **dos carpetas con el mismo id** → «¿cuál es la buena?» sin razón |
| htdocs | `http://localhost/hs/.desklens-ancla` muestra `{"id":"91bd…"}`; si subes la carpeta por FTP, también va al servidor |

| Recomendado | Cómo |
|---|---|
| Git | **Predeterminado: sí** → DeskLens añade `.desklens-ancla` a `.git/info/exclude`: git la ignora **solo en este PC**, sin tocar tu `.gitignore` ni el repo. Se cambia en ⚙ Ajustes › Proyectos (general) y en la ficha (por proyecto) |
| htdocs | Aviso al anclar una carpeta web: «este archivo se puede ver desde el navegador» + opción de anclar la carpeta de arriba |
| Si alguien quiere subirla | Se puede quitar de `exclude` a mano (caso raro) |

## ✅ Mejoras aprobadas (ok 2026-11-21)

### ✅ M1 · «Lee mis anclas»: un mapa para la IA
Igual que hoy dices «lee mi vault», dirías **«lee mi DeskLens»** o **«lee mis anclas de homeshape»**, y la IA sabe a dónde ir y qué conectar solo leyendo un archivo.

- DeskLens escribe y mantiene al día **`historial/organizador/MAPA.md`** (y `MAPA.json` para programas). Se regenera con cada cambio de ficha o cuando un ancla se encuentra en otro sitio.
- En tu `CLAUDE.md` global se añade una sección (tú la apruebas), como la del vault:
  ```
  ## DeskLens (mis proyectos y anclas)
  Mapa: G:/Atril/historial/organizador/MAPA.md
  Cuando diga «lee mi DeskLens» o «mis anclas», lee el mapa y usa las rutas actuales.
  ```
- Ejemplo de `MAPA.md`:
  ```
  # Mapa de proyectos de DeskLens
  Generado: 2026-11-21 18:40 · Solo lectura: no muevas ni borres archivos .desklens-ancla

  ## homeshape  (● activo · 90 % · Laravel, PostgreSQL)
  Homeschooling cristiano. Nota del vault: [[01 Tecnología/Proyectos/homeshape]]
  | Parte | Ruta actual | Estado |
  |---|---|---|
  | 💻 Código | G:\homeshape | ⎇ main · 3 cambios |
  | 🎬 Material | G:\Archivo\videos  (antes H:\Homeshape\videos) | ✓ |
  | 📚 Material | G:\biblia  (compartida con: Curso bíblico) | ✓ |
  | 🌐 Web | C:\xampp\htdocs\hs  → http://localhost/hs | ✓ |
  | 🗄 Respaldos | E:\resp\hs | ⚠ disco no conectado |
  Conexiones: Material «se publica en» Web
  Notas: 4 (historial/organizador/notas/…)  · Pendientes: 2
  ```
- Sin credenciales, contraseñas ni IPs (mismas reglas que el vault).
- Funciona aunque DeskLens esté cerrado (es un archivo) y con cualquier IA que lea archivos.
- Junto con el botón ✦: abre Claude en la carpeta de código con `--add-dir` de cada parte, y ya entiende el proyecto entero.

### ✅ M2 · Ctrl+E: explorador de lo abierto, agrupado por proyecto (como DBeaver)
```
┌ Ctrl+E ───────────────────────────────────────────────────┐
│ > |                                                         │
│ ● homeshape                                                 │
│    📄 inicio.blade.php        💻 Código        ● sin guardar │
│    📕 Guía Génesis.pdf        🎬 Material      pág. 3        │
│    📝 Ideas homeshape.md      💬 nota                        │
│ ● DeskLens                                                  │
│    📄 desklens.pyw            💻 Código                      │
│ Sin proyecto                                                │
│    📄 notas sueltas.txt                                     │
│ ── al escribir, también busca ──────────────────────────────│
│    proyectos · partes · archivos · notas · acciones (⚡)     │
└─────────────────────────────────────────────────────────────┘
```
- Sin escribir: lo abierto, agrupado por proyecto (orden: último usado). ↑↓ y Enter para ir; Supr cierra la pestaña.
- Escribiendo: filtra lo abierto y además busca en todos los proyectos, partes, archivos, notas y acciones («⚡ Abrir homeshape en VS Code»).
- Ctrl+E está libre en DeskLens; el editor de notas usa Ctrl+Alt+E para Fuente ↔ En vivo.

### ✅ M3 · Pestaña «Estado» del proyecto
Nueva pestaña en la vista de administración (y vista «Estado de todos» en el tablero).
```
┌ homeshape · Estado ──────────────────────────────── revisado hace 1 min [↻] ┐
│ Parte          Ruta                    Git              Copia           Tamaño │
│ 💻 Código      G:\homeshape            ⎇ main ✓ subido   GitHub, hace 2 h  30 MB │
│ 🎬 Material    G:\Archivo\videos       —                ⚠ sin copia      400 GB │
│ 📚 Material    G:\biblia 🔗             —                ✓ E:\resp (1 d)   12 GB │
│ 🌐 Web         C:\xampp\htdocs\hs      ⚠ sin git         ✓ igual a Código 25 MB │
│ 🗄 Respaldos   E:\resp\hs              —                ⚠ no conectado     —    │
│ 🛢 BD          homeshape (PostgreSQL)  —                ⚠ último dump 9 d  —    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Resumen: 2 ⚠ sin copia · 1 sin git · historial 48/200 MB · 2 pendientes      │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Copia:** busca la misma carpeta (por nombre y tamaño, o por ancla) en otro disco, en la parte 🗄 Respaldos o en el remoto de git.
- Solo informa; no copia nada (copiar sería otra mejora, con confirmación).
- La tarjeta del tablero muestra un resumen: ✓ todo bien · ⚠ 2.

## ✅ Transparencia: ver siempre qué pasa y dónde (ok 2026-11-21)
Regla del módulo: **nada ocurre a escondidas**. Todo lo automático (buscar anclas, indexar, respaldos, mapa, cambios en `.git/info/exclude`) tiene un lugar donde se ve y una opción donde se cambia.

### ⚙ Ajustes › Proyectos (todas las opciones del organizador en un solo apartado)
```
┌ ⚙ Ajustes ─────────────┬────────────────────────────────────────────────────────────────────┐
│ General                │ 🗂 Proyectos                                                        │
│ Editor                 │                                                                    │
│ Git                    │ General       ☑ Organizador encendido                               │
│ IA                     │ Discos        5 discos para anclas · 9 exclusiones en C:  [Abrir 💽] │
│ ▶ 🗂 Proyectos          │ Índice        💻 Código ▾ todo · 🌐 Web ▾ todo · 📄 Docs ▾ todo       │
│ ⌨ Accesos por teclado  │               🎬 Material ▾ nombres + PDF/Word                       │
│                        │               🗄 Respaldos · 🛢 BD: no se indexan (solo se ven)       │
│                        │ Anclas        ☑ Ignorar en git (.git/info/exclude)  · ☑ Avisar en web │
│                        │ Historial     Por defecto: [7] días · [200] MB por proyecto          │
│                        │ Estructura    Historial de fichas: siempre (3 MB usados)             │
│                        │ Respaldo      Copia diaria de los datos en: [E: ▾] · guardar [14]    │
│                        │               Última: hoy 09:12 ✓  [Copiar ahora] [Abrir carpeta]    │
│                        │ Mapa para IA  ☑ Mantener MAPA.md  · G:\Atril\historial\organizador\  │
│                        │               Actualizado: hace 3 min  [Ver mapa] [Abrir carpeta]    │
│                        │ Datos         historial\organizador\ · 12 fichas · 34 anclas · 58 notas│
│                        │               [Exportar fichas] [Abrir carpeta]                      │
└────────────────────────┴────────────────────────────────────────────────────────────────────┘
```
- Lo de **cada proyecto** (cuota, índice de una parte, ignorar en git) se cambia en su ficha; aquí están los valores por defecto. Si un proyecto tiene un valor propio, la ficha lo marca «● propio» con un botón «Usar el general».
- Cada opción lleva debajo, en pequeño, **qué hace y dónde escribe** (estilo de DeskLens).

### 📋 Actividad del organizador (qué está pasando y dónde)
Icono en la barra del organizador (gira mientras hay algo en marcha) y sección «Actividad» al final de Ajustes › Proyectos.
```
┌ 📋 Actividad ────────────────────────────────────────────── [Solo en curso ☐] [Limpiar] ┐
│ ⟳ ahora    Buscando 2 anclas · C: 48 % · 1 min 50 s              [Detener]            │
│ ⟳ ahora    Indexando 🎬 Material de homeshape · H:\…\videos · 120/350 nombres        │
│ ✓ 09:40    Ancla encontrada · Material de homeshape → G:\Archivo\videos               │
│ ✓ 09:40    MAPA.md actualizado · G:\Atril\historial\organizador\MAPA.md               │
│ ✓ 09:12    Respaldo diario · 2,1 MB → E:\DeskLens-respaldo\2026-11-21                 │
│ ✓ ayer     .desklens-ancla añadida a G:\homeshape\.git\info\exclude                   │
│ ⚠ ayer     E: no conectado · respaldo pospuesto                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
- Cada línea dice **qué**, **dónde** (ruta con clic para abrirla) y **cuándo**; lo que está en curso se puede detener.
- Se guarda en `historial/organizador/actividad.log` (últimos 30 días).

### ⌨ Accesos por teclado: siempre en la lista, por secciones
Regla: **todo atajo nuevo se añade a `KEYS`** (⚙ Ajustes › Accesos por teclado), en su sección. Secciones nuevas:

| Sección | Atajo | Qué hace |
|---|---|---|
| Proyectos | Ctrl+E | Explorador de lo abierto, agrupado por proyecto, y búsqueda en todo |
| Proyectos | Ctrl+Shift+O | Abrir el tablero de proyectos |
| Proyectos | Ctrl+Alt+K | Comparar con una versión anterior (en Contenedor, Flujo o Red) |
| Pizarra (Flujo y Red) | Arrastrar / espacio + arrastrar | Mover la pizarra |
| Pizarra | Ctrl + rueda | Zoom |
| Pizarra | 0 | Ajustar todo a la pantalla |
| Pizarra | Flechas | Mover la pizarra |
| Pizarra | Supr | Borrar conector o caja elegida |
| Pizarra | ↑ / ↓ (comparando) | Cambio anterior / siguiente |
| Notas (Fase 2) | Ctrl+Alt+E | Fuente ↔ En vivo |
| Notas | `[[` · `![[` | Buscador para enlazar / citar |
| Tablas (Fase 2) | Tab · Shift+Tab · Enter | Celda siguiente · anterior · fila nueva |
- Antes de fijar cada atajo se comprueba que no choque con los de `KEYS`; los de esta tabla están libres hoy.

## Avance de la construcción
- **2026-11-21 · Fase 1a, parte 1 (v1.167, rama `organizador`):** hecho módulo `organizador/` con anclas, registro, ID de NTFS, discos y exclusiones, recorrido con progreso, relaciones por nombre, fichas, actividad, tablero (tarjetas/lista, filtros, orden, botones), flujo de arranque, editor de jerarquía (arrastrar, compartir con Ctrl), ⚠ alertas, 💽 discos, 🚫 exclusiones, 📋 actividad, ajustes propios, convertir proyectos actuales, «+» sin discos enteros, Ctrl+Shift+O en KEYS.
  - Ajuste tras probarlo con los discos reales: las hijas de carpetas contenedoras (`Webs`, `htdocs`, `Proyectos`…) son proyectos y lo de dentro no; más nombres genéricos (`classes`, `lib`, `assets`…); la mini red muestra hasta 18 carpetas.
- **2026-11-21 · Fase 1a, parte 2:** papelera (🗑 en la papelera / eliminada, nunca «movida»), ventanas sin bloquear (clic fuera o Esc; solo preguntan con cambios sin guardar), «Agregar proyectos» (carpetas con espacio final, fallos por carpeta con aviso, resumen), propuestas sin carpetas de otros proyectos y **vista de administración** (cabecera, pestañas Archivos/Ficha/Git/Estado, árbol unido con el visor de DeskLens prestado a la derecha, búsqueda por nombre, menú contextual, pestaña Estado = M3).
- **2026-11-21 · Fase 1a, parte 3 (v1.168):** vista guardada por proyecto (pestaña, búsqueda, ancho, carpetas abiertas, scroll, último archivo), índice por tipo de parte (`rutas_indice()` + `IDX_MODO` en el indexador), apartado en ⚙ Ajustes (enganche `orgAjustes`), MAPA.md + MAPA.json (M1), Ctrl+E (M2) y respaldo diario (hilo `vigilante`). **Fase 1a completa.**
- ~~**Falta de la Fase 1a:** índice por tipo de parte, apartado dentro de ⚙ Ajustes (hoy ⚙ propio del tablero), MAPA.md (M1), Ctrl+E (M2), pestaña Estado (M3), respaldo diario de los datos.~~ (hecho)

- **2026-11-21 · Fase 1b (v1.169):** Flujo y Red con Cytoscape 3.30.2 (se carga al abrirlas), posiciones por vista en la ficha, zoom/posición por proyecto, minimapa propio, conectores (modo Conectar: clic origen → clic destino, en vez de arrastrar desde el borde), cajas, notas en nodos y conectores (Markdown en `notas/`, 💬 + cuadro flotante + panel), historial de estructura (`versiones/<id>/`, 5 min, con nombre, commits como marcas, restaurar) y comparativo en las 3 vistas (encima, lado a lado, solo cambios, ↑↓). **Fase 1b completa.**
- Pendiente aparte: el historial de versiones **de archivos** por ancla + ruta relativa (que no se pierda al mover) con la cuota por proyecto; hoy sigue el de DeskLens por ruta.

### ✅ ＋ Nuevo proyecto a mano y barra del tablero en una fila (ok y hecho 2026-11-22)
- **Barra en una fila**: estado en desplegable con su número, ↕ orden, ▦ ☰ vista, ⚠ 💽 📋 ⚙ como iconos, **＋ Nuevo ▾** (Nuevo proyecto… · Buscar en discos… · Convertir proyectos de DeskLens).
- **Modal «Nuevo proyecto»** (no bloquea; pregunta solo si hay carpetas añadidas):
  - Arriba: nombre (sigue a la ★ mientras no se cambie) y estado.
  - Izquierda: ruta escrita o pegada (Enter añade), **📁 Examinar…** (explorador dentro del modal, con /api/explorar), ＋ Archivo… y ☁ Etapa remota…; lista «En el proyecto» con ★, tipo/etapa y ✕; avisos en la fila (ya en otro proyecto → Compartir / Mover aquí; dentro de otra añadida; no existe).
  - Sugerencias por nombre parecido, al instante, de los nombres guardados por el último recorrido de discos (con su fecha); ＋ Añadir / ＋ Añadir todas.
  - Derecha: **así queda**, en vivo (Árbol · Flujo · Red), lo nuevo parpadea.
  - Tipo sugerido por la ruta y el nombre; la primera carpeta es la ★ (si llega una con git, la propone).
  - Pie: cuántas anclas se pondrán; Crear y abrir · Crear y seguir con otro.
- **Dentro del proyecto**: clic derecho › ＋ Añadir carpetas… en Contenedor, Flujo y Red abre el mismo modal para ese proyecto.
- **Archivos sueltos** como accesos ↗ (ancla «archivo:<id>» en la ficha, sin archivo de ancla): si se mueven salen en ⚠.
- Teclas: Ctrl+N (nuevo, en Proyectos), Enter (añadir ruta), Supr (quitar fila), Ctrl+Enter (crear y abrir).
- Comprobado al construir: la ventana propia corre en otro proceso, así que Examinar usa el explorador de DeskLens; soltar carpetas desde el Explorador de Windows no da la ruta completa en la página.

### ✅ 🆕 Carpeta nueva · punto 11 de la Fase 2, lo mínimo (ok y hecho 2026-11-22)
- En ＋ Nuevo proyecto y ＋ Añadir carpetas: 🆕 Carpeta nueva… (nombre, dónde, ☐ git). Se crea al pulsar Crear; nunca sobre una que ya existe. Sin plantillas (descartadas).

### ✅ Tarjeta del tablero con solo lo necesario (ok y hecho 2026-11-22)
- Nombre (☐ N si hay pendientes), ruta principal (entera al pasar el ratón), 💾 peso, 🕘 última entrada (y equipo), ✚ creado, 🖧 equipos (si se comparte). Botones a la vista: 📂 (carpeta principal) y VS; lo demás en ⋯. Estado: color de la franja.
- Lista con las mismas columnas; orden por última entrada, peso y creación.

### ✅ Carpetas sin ancla (🔗 por ruta) y no crear proyectos a medias (ok y hecho 2026-11-22)
- A: al añadir una carpeta se comprueba si admite el ancla; si no, la fila lo dice en rojo con el motivo y «🔗 Usar sin ancla · Elegir «Mi unidad» · 📁 Examinar dentro…»; no se crea ni se añade nada mientras quede una así.
- B2: carpetas «🔗 por ruta»: como las demás, pero sin escribir nada en ellas; movidas o renombradas salen en ⚠. Clic derecho: Quitar ancla (seguir por ruta) / Poner ancla.

### ✅ Pestañas propias por proyecto y archivos de fuera (ok y hecho 2026-11-22)
- Al entrar en un proyecto se guardan las pestañas de DeskLens normal y se ponen las del proyecto (la primera vez, vacío); al salir, al revés. Por proyecto; lo escrito sin guardar no se pierde.
- Dentro del proyecto solo se abre lo suyo o lo arrastrado a sus pestañas; lo demás sale del proyecto sin preguntar y se abre en DeskLens normal.
- Archivos de fuera: no van solos a 📌 Sueltos; el Explorador de DeskLens se abre en su carpeta con el archivo marcado; doble clic en el título de la pestaña lo ancla en Sueltos.

### 🖧 Compartir entre equipos · camino B (elegido 2026-11-22; parte 1 hecha)
Ejemplo de uso: pruebas en una carpeta de red, calidad en un equipo, producción en otro y material en otro; 3 o 4 equipos por proyecto, en la misma red, con una carpeta compartida de Windows como carpeta común.
- ✅ **Parte 1:** carpeta común y nombre del equipo (⚙ Ajustes › Proyectos) con resumen antes de unirse; fichas, notas, pendientes, historial y quitados en la carpeta común; cada equipo publica dónde ve cada ancla; las carpetas de otro equipo salen «🖧 en PC-X» (no son alerta); 🖧 en la barra; dejar de compartir trae una copia.
- ⬜ **Parte 2:** buscar las anclas en carpetas de red (\\PC\recurso, unidades de red) desde 💽 Discos, para que esas carpetas se abran y se vean («🌐 en red»): Explorador, archivos, árbol; git solo de lectura por la red.
- ⬜ **Parte 3:** aviso si la misma ficha cambió en otro equipo mientras la tenías abierta, con ⇆ Comparar.
- ⬜ **Parte 4:** filtro del tablero por equipo.

### ✅ ☑ Pendientes simples · punto 7 de la Fase 2 (ok y hecho 2026-11-22)
- En la ficha (`pendientes`), sin fechas ni responsables. Pestaña ☑ Pendientes con su número; cuadros de texto grandes de varias líneas (también al editar); hechos plegados con su fecha; orden arrastrando; unir a una carpeta (📁 y ☐ en Flujo/Red).
- Tarjeta: «☐ N pendientes · el primero»; Lista: columna ☐; MAPA.md: los que faltan. Cuadros de notas más grandes.

### ✅ 🚦 Ordenar entornos (ok y hecho 2026-11-22)
- Clic derecho en el bloque/parte Entornos o en una etapa (Contenedor, Flujo, Red) › 🚦 Ordenar entornos….
- Tarjetas arrastrables por ⠿ (línea donde caerá), ↑ ↓, etapa por tarjeta (Pruebas, Calidad, Producción, Otra…), aviso «sin etapa», ⋯ Sacar de Entornos ▸ / Quitar del proyecto, «Así queda» en vivo, ↕ Ordenar por etapa, Cancelar / Guardar (Ctrl+Enter). Teclas ↑ ↓ y Alt+↑ ↓.

### ✅ Lo desplegado sin montarse (ok y hecho 2026-11-22)
- Sin física libre (no se desordena): lo del proyecto no se mueve; solo lo desplegado se ordena.
- Red: abanico desde su carpeta, hueco para cada carpeta abierta según lo suyo; líneas cortas. Flujo: árbol en filas de 4.
- Lo que aún se toque se aparta lo justo (contando el nombre), animado. Al alejar en Red, nombres de lo desplegado ocultos.

### ✅ 🎯 Foco en Red y Flujo · 🔍 filtro flotante · 🗂 Explorador en el panel derecho (ok y hecho 2026-11-22)
- Doble clic en carpeta o archivo: despliega el camino y enfoca (camino + contenido en color, lo demás opaco); hermanas plegadas; camino pulsable arriba. Clic en el fondo o Esc: sin foco (lo desplegado se queda).
- Panel derecho con pestañas ⓘ Info · 🗂 Explorador: el árbol sigue al foco (camino abierto, enfocado marcado, resto gris); clic en el explorador enfoca en el dibujo; clic sencillo en un nodo: ⓘ Info sin cambiar el foco.
- Filtro flotante por tipo y nombre, con números; vale para el dibujo y el explorador; el límite de 12 va después de filtrar; por proyecto.
- Cambio respecto al dibujo: el doble clic en un archivo ya no lo abre en una pestaña (lo enfoca); se abre con doble clic en el explorador o con «Abrir en pestaña» del panel ⓘ.

### ✅ Contenedor con nombre: raíz = nombre o ★ carpeta (ok y hecho 2026-11-22)
- Interruptor «Contenedor con nombre» en el clic derecho del fondo y de la raíz, en Contenedor, Flujo y Red (sin botón en la barra). El menú se queda abierto tras el cambio.
- Encendido: raíz 🏷 nombre; bloque 🚦 Entornos con las etapas en cadena; las demás partes salen del bloque. Sin entornos, salen del nombre. Apagado: raíz ★ como antes (la ★ se recuerda).
- Por proyecto (`raiz_nombre`), en el Historial; posiciones a mano aparte en cada modo. ★ Hacer principal desactivado con el modo nombre.
- ＋ Nuevo proyecto: sin carpetas se crea solo con el nombre y nace con el modo nombre; con carpetas, raíz ★.

### ✅ 🔍 Buscador en Examinar y bloques que se arrastran en ＋ Nuevo proyecto (ok y hecho 2026-11-22)
- 🔍 en la barra del explorador: filtra al escribir (sin mayúsculas, acentos ni separadores), resalta lo que coincide y dice «N de M en «carpeta»». ☐ subcarpetas (se recuerda) + Enter: `GET /api/org/buscar_carpetas` en vivo, por niveles, hasta 6 niveles / 200 / 4 s, sin node_modules, .git, ocultas ni de sistema; ✕ Detener; cada resultado con su subcarpeta debajo.
- Teclas: Ctrl+F (abre el explorador si hace falta), ↓ a la lista, ↑ ↓ entre filas, Espacio marca, Enter entra, Esc: resultados → filtro → cierra la ventana.
- Separadores: ancho Añadir | Así queda (en ventana estrecha, alto de Así queda), alto del explorador, ancho de su lateral, alto de «En el proyecto». Doble clic: tamaño de antes; Tab + flechas (Mayús: más). Ventana redimensionable por la esquina. Todo en `desklens.org.nuevo.tam`, igual para todos los proyectos.
- Arreglo: rutas recortadas con `direction:rtl` salían «\:G»; ahora llevan marcas LRM y se leen bien.

### ✅ Casillas y acciones en la vista Lista · Quitar varios · ↶ Proyectos quitados (ok y hecho 2026-11-22)
- **Lista con casillas**: clic marca, Mayús+clic marca un tramo, la casilla de la cabecera marca lo que está a la vista (respeta filtro y estado). Con algo marcado, la cabecera de la tabla se vuelve la barra: «N marcados · Marcar todos (n)» · Estado ▾ · 📂 Abrir carpetas (5 como mucho; abre la carpeta principal de cada uno en el Explorador) · 🗑 Quitar… · ✕. Lo marcado no se guarda.
- **⋯ en cada fila**: Abrir proyecto · Ficha… · Editar jerarquía… · Estado · Fijar · Quitar del organizador….
- Teclas (KEYS › Proyectos): Espacio marca la fila con el foco, Ctrl+A marca todo lo visible, Supr abre Quitar…, Esc desmarca (antes que salir del tablero).
- **Quitar del organizador** (uno o varios): ventana con qué pasa y dónde (la ficha a `quitados`, carpetas intactas, anclas se quedan). ☐ Borrar también las anclas (desmarcada; al marcarla enseña cada ruta; nunca la de una carpeta que sigue en un proyecto que se queda). Al terminar, aviso con ↶ Deshacer (10 s).
- **↶ Proyectos quitados** (＋ Nuevo ▾, ⚙ Ajustes › Proyectos, pantalla sin proyectos): ↶ Recuperar, ↶ Recuperar marcados, Vaciar quitados… (pregunta; lo único que borra de verdad). Recuperar vuelve a poner el ancla con el mismo id si se borró, y no pisa un proyecto que ya está en el tablero.
- Cambio respecto al dibujo: 📂 Abrir abre la carpeta principal de cada proyecto en el Explorador (la vista de proyecto es una a la vez).

### ✅ Carpeta principal, entornos como iguales, iconos monocromos y líneas en el árbol (ok y hecho 2026-11-22)
- La principal ★ es la raíz (por defecto git o Código; ★ Hacer principal en los menús). El proyecto se llama como ella salvo nombre puesto a mano.
- Entornos: en cadena desde la principal («pasa a», línea gruesa); las demás partes salen de ella («contiene», línea gris fina). Flujo: fila a la derecha; Red: línea recta desde el centro; tarjeta: «★ principal → etapas».
- Iconos de línea propios (SVG), un color con el del tipo en el trazo: árbol, tarjetas, panel ⓘ, menús y dentro de los nodos.
- Contenedor: líneas │ ├─ └─ grises, cadena de etapas gruesa y verde, camino resaltado al pasar el ratón.

### ✅ Barra única y ⇆ Comparar en ventana (ok y hecho 2026-11-22)
- Una barra: pestañas de vista (Contenedor · Flujo · Red) · ⟶ Unir · ▭ Nota libre · ▴ Plegar todo · ↺ Ordenar · ⇆ Comparar… · 🏷 Guardar versión · ⓘ 🗺 ⤢ zoom. Estrecha: solo iconos. «Conector» → unión, «caja» → nota libre (en menús, preguntas y teclas).
- ⇆ Comparar…: ventana con versiones (con nombre, commits, automáticas), Antes | Ahora en Flujo, Red o Árbol (zoom a la par), Solo cambios, lista de cambios en frases (clic o ↑↓ los señala en los dos lados) y ↶ Restaurar. Historial › ⇆ Comparar abre la misma. Ya no hay comparativo dentro de la pizarra ni del árbol.

### ✅ Panel ⓘ Información + subflujo · subred (ok 2026-11-21, hecho 2026-11-22)
- Clic en cualquier nodo (o clic derecho › ⓘ Información, también en el árbol del Contenedor): panel derecho con barra de ruta (pulsable desde la carpeta del proyecto), Copiar · Explorador · Terminal/Abrir, tipo, peso, contenido, fechas, atributos, git, ancla, proyectos y notas; lista del contenido con filtro y orden (nombre, peso, fecha). Archivo: datos de `/api/info` y vista previa (texto: 200 líneas; imágenes). Parte y proyecto: sus carpetas con estado, peso de cada una y total, y la fila de etapas en Entornos.
- Peso: `GET /api/org/carpeta` y `/api/org/peso` (en segundo plano, 3 a la vez, 5 min en memoria, peso de cada hijo directo, sin seguir enlaces ni uniones, sin contar `.desklens-ancla`), `POST /api/org/peso/parar`. Solo dentro de carpetas ancladas.
- Doble clic en carpeta: despliega ahí mismo (12 + «… N más», que abre la lista en el panel); en archivo: lo abre en una pestaña (Contenedor). Se recuerda por proyecto y vista qué quedó desplegado, si el panel estaba abierto, su ancho y lo último elegido. I abre/cierra el panel, Esc lo cierra.
- Diferencias con lo propuesto: la vista previa es propia del panel (texto e imágenes), no el visor completo de DeskLens; comparando no se despliega; falta el botón «Plegar todo» (va con el rediseño de las barras).

### Abrir carpetas dentro de Flujo y Red (subflujo · subred), propuesto 2026-11-21 (hecho arriba)
Hoy el doble clic en una carpeta salta al Contenedor (parece que «solo abre el explorador»). Propuesta: se abre **ahí mismo**.
- **Flujo → subflujo:** doble clic en 📁 despliega su contenido debajo, como ramas (carpetas primero). Más de 12 elementos: los 12 primeros y una caja «… 30 más» que se abre como **lista con buscador**.
- **Red → subred:** los hijos salen alrededor de la carpeta, más pequeños, como satélites.
- Doble clic otra vez: se pliega. Una subcarpeta se abre igual (un nivel más). Botón «Plegar todo».
- **Clic en un archivo:** vista previa en el panel derecho con el visor de DeskLens; doble clic: lo abre en una pestaña (Contenedor).
- Se recuerda por proyecto y por vista qué carpetas quedaron abiertas. Los archivos no se guardan en la ficha (se leen del disco al abrir).
- El comparativo marca solo lo de la ficha (carpetas, conectores, cajas, notas); el contenido desplegado sale en gris claro.

### ✅ Entornos del proyecto: pruebas → calidad → producción (VPS) (ok y hecho 2026-11-21, v1.169)
Hoy `homeshape_calidad` se propone como 🗄 Respaldos (la palabra «calidad» estaba en esa lista) y no hay forma de decir que es un paso del despliegue.
- Tipo de parte nuevo **🚦 Entornos**, con etapas **en orden**: 🧪 Pruebas → ✅ Calidad → 🌍 Producción (nombres cambiables).
- Cada etapa es una **carpeta anclada** o una **etapa remota** (nombre + dirección: `https://…`, `ssh usuario@vps`), porque el VPS no siempre es una carpeta de este PC.
- En **Flujo** las etapas van en fila, de izquierda a derecha, unidas por flechas «pasa a»; en **Red**, en cadena.
- Sugerencia por nombre: pruebas/test/dev → Pruebas; calidad/qa/staging → Calidad; produccion/prod/vps/live → Producción (ya no Respaldos).
- Tarjeta del tablero: «🧪→✅→🌍»; pestaña Estado: rama de git y último cambio de cada etapa.

## Fase 2 · Orden
Pendientes simples (7), detector de desorden (9), nuevo proyecto (11), **notas ancladas** (ver arriba).

## Fase 3 · Extras
Iniciar y detener servicios (6), aviso de último respaldo de BD (10), buscador global por proyecto (12).

## Descartado
❌ Gantt y dependencias · kanban de tareas · registro de horas · responsables y roles · chat de equipo · presupuesto · nube · instalar Vikunja, Plane o Focalboard · usar solo la extensión Project Manager de VS Code · notificaciones por correo.
