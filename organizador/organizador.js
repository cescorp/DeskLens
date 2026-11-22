// Organizador de proyectos (módulo de DeskLens; plan en implementar_organizador.md, Fase 1a).
// Pantallas: tablero de proyectos, flujo de arranque (discos → recorrido → relaciones por nombre), editor de jerarquía,
// discos y exclusiones, anclas no encontradas, actividad y ajustes. No mueve archivos: solo cambia fichas y anclas.
// Usa lo que ya da DeskLens (api, ask, flash, esc, iconBtn, LS, openMenu, openTerminal, KEYS…): este archivo se carga
// después de su script. Si falta (carpeta organizador/ borrada), DeskLens sigue igual: no hay icono ni atajo.
(() => {
  const TIPO = { codigo: ['💻', 'Código'], entornos: ['🚦', 'Entornos'], material: ['🎬', 'Material'], web: ['🌐', 'Web'], respaldos: ['🗄', 'Respaldos'],
    base_datos: ['🛢', 'Base de datos'], documentos: ['📄', 'Documentos'], otro: ['📁', 'Otro'] };
  const ESTADO = { activo: ['●', 'Activo'], pausado: ['◐', 'Pausado'], terminado: ['✓', 'Terminado'], archivo: ['▣', 'Archivo'] };
  const BORRADA = { papelera: 'en la papelera', eliminada: 'eliminada' }; // carpetas borradas: no «movidas»
  // 🚦 Entornos: etapas del despliegue, en el orden en que pasan (pruebas → calidad → producción)
  const ETAPAS = ['Pruebas', 'Calidad', 'Producción'], ETAPA_ICO = { Pruebas: '🧪', Calidad: '✅', 'Producción': '🌍' };
  const icoEtapa = e => ETAPA_ICO[e] || '🔹';
  const ordenEtapa = e => { const i = ETAPAS.indexOf(e); return i < 0 ? 9 : i; };
  // la misma sugerencia que el servidor: «homeshape_calidad» → Calidad (al pasar una carpeta a Entornos)
  const etapaSugerida = n => { n = plainTxt(n || '').replace(/[^a-z0-9]/g, '');
    return /prueba|test|dev|desarrollo|local/.test(n) ? 'Pruebas' : /calidad|qa|staging|preprod/.test(n) ? 'Calidad' : /produccion|prod|vps|live|deploy|servidor/.test(n) ? 'Producción' : ''; };
  const ICONOS = ['📁', '💻', '🎬', '🎵', '🖼', '📚', '📄', '🌐', '🗄', '🛢', '📝', '⭐', '🔧', '📦'];
  // ---------- iconos monocromos: dibujos de línea (24×24) que toman el color del texto; el tipo pone su color al trazo ----------
  const IC = {
    carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    codigo: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    entornos: '<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="M7.2 12h2.6M14.2 12h2.6"/>',
    pruebas: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.4 15h9.2"/>',
    calidad: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
    produccion: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3"/>',
    material: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l3-4h4l-3 4M10 7l3-4h4l-3 4M10.5 11v6l5-3z"/>',
    respaldos: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    base_datos: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    web: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
    documentos: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
    principal: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    notas: '<path d="M4 5h16v11H9l-5 4z"/>',
    musica: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    imagen: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
    libros: '<path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 3 15.5-3.5 1z"/>',
    nota: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
    herramienta: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    caja: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  };
  IC.otro = IC.carpeta;
  const EMO = { '📁': 'carpeta', '💻': 'codigo', '🎬': 'material', '🎵': 'musica', '🖼': 'imagen', '📚': 'libros', '📄': 'documentos', '🌐': 'web',
    '🗄': 'respaldos', '🛢': 'base_datos', '📝': 'nota', '⭐': 'principal', '🔧': 'herramienta', '📦': 'caja', '🌍': 'produccion', '🚦': 'entornos', '🧪': 'pruebas', '✅': 'calidad' };
  const ICO_NOM = { '📁': 'Carpeta', '💻': 'Código', '🎬': 'Vídeo', '🎵': 'Música', '🖼': 'Imagen', '📚': 'Libros', '📄': 'Documento', '🌐': 'Web',
    '🗄': 'Respaldo', '🛢': 'Base de datos', '📝': 'Nota', '⭐': 'Estrella', '🔧': 'Herramienta', '📦': 'Paquete' };
  const COLT = { entornos: '#2a9d8f', codigo: '#7c5cdb', material: '#d08a2c', web: '#2f7fd8', respaldos: '#8a8a8a', base_datos: '#3f9a5b', documentos: '#b05a8a', otro: '#8f8f8f' }; // = COL de la pizarra
  const icoKey = e => EMO[e] || (IC[e] ? e : 'carpeta');
  const icoKeyEtapa = e => ({ Pruebas: 'pruebas', Calidad: 'calidad', 'Producción': 'produccion' })[e] || 'entornos';
  const svgI = (k, color = '', titulo = '') => `<svg class="oi" viewBox="0 0 24 24" aria-hidden="${titulo ? 'false' : 'true'}"${color ? ` style="color:${color}"` : ''}>${titulo ? `<title>${esc(titulo)}</title>` : ''}${IC[icoKey(k)]}</svg>`;
  const icoT = t => svgI(t, COLT[t], TIPO[t]?.[1]); // el de un tipo de parte, con su color
  const icoE = e => svgI(icoKeyEtapa(e), COLT.entornos, e || 'Etapa'); // el de una etapa
  const icoC = (c, tipo) => c.estado === 'remota' || c.remota ? svgI('produccion', COLT.entornos) : tipo === 'entornos' ? icoE(c.etapa) : svgI(c.icono || c.icoAuto || 'carpeta', COLT[tipo]); // el de una carpeta
  const icoUrlCache = new Map(); // para Flujo y Red (dibujo dentro del nodo)
  const icoUrl = (k, color) => { const key = k + color; if (!icoUrlCache.has(key)) icoUrlCache.set(key, 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[icoKey(k)]}</svg>`)); return icoUrlCache.get(key); };
  const O = { st: null, git: {}, pantalla: 'tablero', props: null, jer: null, poll: null,
    filtro: LS('desklens.org.filtro') || 'todos', orden: LS('desklens.org.orden') || 'actividad', vista: LS('desklens.org.vista') || 'tarjetas', q: '', marca: new Set(), ultMarca: '', foco: null };
  const on = () => document.body.classList.contains('orgfull');
  const root = Object.assign(document.createElement('div'), { id: 'org' });
  document.querySelector('main').append(root);
  // una carpeta del editor de jerarquía soltada fuera de una zona: no hace nada (sin el aviso general de DeskLens)
  root.addEventListener('drop', e => { if (e.dataTransfer.types.includes('text/desklens-org')) { e.preventDefault(); e.stopPropagation(); } });
  const dlg = Object.assign(document.createElement('dialog'), { id: 'orgDlg' });
  document.body.append(dlg);
  const fmtGB = n => n >= 1e12 ? (n / 1e12).toFixed(1).replace('.', ',') + ' TB' : Math.round(n / 1e9) + ' GB';
  const fmtS = s => s == null ? '—' : s < 60 ? `${String(s).replace('.', ',')} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  const hace = iso => { if (!iso) return ''; const m = (Date.now() - new Date(iso)) / 6e4; return m < 1 ? 'ahora' : m < 60 ? `hace ${Math.round(m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
  const err = e => flash('⚠ ' + (e?.message || e));

  // ---------- icono en la cinta, atajo y entrar/salir ----------
  I.org = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>';
  const btn = iconBtn('org', 'Proyectos: tablero del organizador · Ctrl+Shift+O', () => on() ? cerrar() : abrir());
  btn.dataset.v = 'o';
  ($('#ribbon [data-v=g]') || $('#ribbon .sp')).after(btn);
  // otra vista de la cinta (Explorador, Buscar, Git) sale del tablero antes de abrirse
  $('#ribbon').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b !== btn && b.dataset.v && on()) cerrar(); }, true);
  KEYS.push(['Proyectos', [['Ctrl+Shift+O', 'Abrir o cerrar el tablero de proyectos'], ['Ctrl+N (en el tablero)', '＋ Nuevo proyecto'],
    ['Enter (en la ruta de ＋ Nuevo proyecto)', 'Añadir la ruta escrita o pegada'], ['Ctrl+O (en ＋ Nuevo proyecto)', '📁 Examinar'],
    ['Supr (en la lista de ＋ Nuevo proyecto)', 'Quitar la fila elegida'], ['Ctrl+Enter (en ＋ Nuevo proyecto)', 'Crear y abrir (o Añadir al proyecto)'],
    ['Ctrl+F (en ＋ Nuevo proyecto)', '🔍 Buscar en el explorador (lo abre si está cerrado)'], ['Enter (en el 🔍 con «subcarpetas»)', 'Buscar también dentro de las subcarpetas'],
    ['↑ ↓ · Espacio · Enter (en el explorador)', 'Moverse por la lista · marcar · entrar en la carpeta'], ['Flechas (en un separador)', 'Agrandar o achicar el bloque (Mayús: más rápido); doble clic: tamaño de antes'],
    ['Espacio (vista ☰ Lista)', 'Marcar o desmarcar la fila con el foco'], ['Mayús+clic en una casilla (vista ☰ Lista)', 'Marcar desde la última marcada hasta esta'],
    ['Ctrl+A (vista ☰ Lista)', 'Marcar todos los proyectos a la vista'], ['Supr (vista ☰ Lista)', '🗑 Quitar los marcados…'], ['Esc (con proyectos marcados)', 'Desmarcar todo'], ['Esc', 'Salir del tablero de proyectos (o volver al tablero desde un proyecto o desde el editor de jerarquía)']]]);
  addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); on() ? cerrar() : abrir(); }
    else if (e.key === 'Escape' && on() && !document.querySelector('dialog[open]') && !$('#menu')) {
      if (O.pantalla === 'jerarquia') O.jer.volver(); else if (O.pantalla === 'proyecto') { if (!e.target.closest?.('#panes')) adminSalir(); } else if (O.pantalla === 'arranque' && O.st?.fichas.length) { O.pantalla = 'tablero'; pintar(); } else cerrar();
    }
  });
  addEventListener('keydown', e => { // Ctrl+N en el tablero: ＋ Nuevo proyecto (antes que el «nuevo archivo» de DeskLens)
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n' && on() && O.pantalla === 'tablero' && !document.querySelector('dialog[open]')) { e.preventDefault(); e.stopImmediatePropagation(); nuevoProyecto(); }
  }, true);
  addEventListener('keydown', e => { // vista ☰ Lista: Ctrl+A marca todo, Supr quita los marcados, Esc desmarca, Espacio marca la fila
    if (!on() || O.pantalla !== 'tablero' || O.vista !== 'lista' || document.querySelector('dialog[open]') || $('#menu')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]') && !e.target.closest('.olist')) return;
    const k = e.key, stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.ctrlKey && !e.shiftKey && !e.altKey && k.toLowerCase() === 'a') { stop(); filtradas().forEach(f => O.marca.add(f.id)); tablero(); }
    else if (k === 'Delete' && O.marca.size) { stop(); quitarVarios([...O.marca]); }
    else if (k === 'Escape' && O.marca.size) { stop(); O.marca.clear(); tablero(); }
    else if (k === ' ' && e.target.closest?.('tr[data-id]')) { stop(); marcar(e.target.closest('tr[data-id]').dataset.id, false); }
  }, true);
  // Dónde lo dejaste: si el tablero quedó abierto y en qué proyecto. Al abrir 🗂 (y al arrancar DeskLens) se vuelve ahí;
  // la pestaña, la vista (Contenedor, Flujo, Red), el zoom y lo abierto de cada proyecto los guarda su propia vista.
  const donde = () => { try { return JSON.parse(LS('desklens.org.donde') || '{}'); } catch { return {}; } };
  const guardarDonde = () => LS('desklens.org.donde', JSON.stringify({ abierto: on(), proyecto: O.pantalla === 'proyecto' ? O.adm?.id || '' : '' }));
  async function abrir() {
    if (typeof gitFullOn === 'function' && gitFullOn()) gitFullClose(true);
    document.body.classList.add('orgfull');
    if (!O.st) root.innerHTML = '<p class="oempty">Cargando proyectos…</p>';
    const d = donde();
    await cargar();
    const f = d.proyecto && O.pantalla === 'tablero' && O.st?.fichas.find(x => x.id === d.proyecto);
    if (f) adminAbrir(f); // el proyecto donde estabas, con su pestaña y su vista
    guardarDonde();
  }
  function cerrar() { devolverPanes(); document.body.classList.remove('orgfull'); pararPoll(); guardarDonde(); }
  async function cargar() {
    try { O.st = await api('/api/org/estado'); }
    catch (e) { root.innerHTML = `<p class="oempty">⚠ ${esc(e.message)}</p>`; return; }
    insignia();
    if (O.st.recorrido?.activo && O.pantalla === 'tablero' && !O.st.fichas.length) O.pantalla = 'arranque';
    pintar();
    gitTarjetas();
  }
  function insignia() {
    btn.querySelector('.obadge')?.remove();
    if (O.st?.alertas) btn.insertAdjacentHTML('beforeend', `<span class="obadge" title="Anclas no encontradas">${O.st.alertas}</span>`);
  }
  function pintar() {
    if (O.pantalla === 'arranque') return arranque();
    if (O.pantalla === 'jerarquia') return O.jer.pintar();
    if (O.pantalla === 'proyecto' && O.adm) return admin();
    devolverPanes();
    tablero();
  }

  // ---------- tablero ----------
  const codigoDe = f => f.partes.flatMap(p => p.carpetas.map(c => ({ ...c, tipo: p.tipo }))).find(c => c.tipo === 'codigo' && c.estado !== 'falta' && c.estado !== 'desconectado');
  async function gitTarjetas() { // rama y cambios de la carpeta de código de cada ficha (en paralelo, sin frenar el tablero)
    const rutas = (O.st?.fichas || []).map(codigoDe).filter(c => c?.git).map(c => c.ruta);
    if (!rutas.length) return;
    try {
      const r = await api('/api/git/resumen?rutas=' + encodeURIComponent(rutas.join('|')));
      r.forEach(g => O.git[g.ruta] = g);
      if (on() && O.pantalla === 'tablero') tablero();
    } catch {}
  }
  function filtradas() {
    const q = O.q.toLowerCase();
    let fs = O.st.fichas.filter(f => (O.filtro === 'todos' ? f.estado !== 'archivo' : f.estado === O.filtro)
      && (!q || [f.nombre, f.descripcion, ...(f.tecnologia || [])].join(' ').toLowerCase().includes(q)));
    const by = { actividad: (a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''), nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      avance: (a, b) => b.avance - a.avance, estado: (a, b) => Object.keys(ESTADO).indexOf(a.estado) - Object.keys(ESTADO).indexOf(b.estado) };
    return fs.sort((a, b) => (b.fijado - a.fijado) || by[O.orden](a, b));
  }
  const ORDENES = [['actividad', 'Última actividad'], ['nombre', 'Nombre'], ['avance', 'Avance'], ['estado', 'Estado']];
  function barra() { // una sola fila (aprobado 2026-11-22): estado en desplegable, orden e iconos compactos, ＋ Nuevo ▾
    const n = k => O.st.fichas.filter(f => k === 'todos' ? f.estado !== 'archivo' : f.estado === k).length;
    const est = O.filtro === 'todos' ? 'Todos' : `${ESTADO[O.filtro][0]} ${ESTADO[O.filtro][1]}`;
    const ord = ORDENES.find(o => o[0] === O.orden)?.[1] || '';
    return `<div class="obar otab"><h2>🗂 Proyectos</h2>
      <button class="obtn osel" id="oEst" title="Qué proyectos se ven (por estado)">${est} <b>${n(O.filtro)}</b> ▾</button>
      <input type="search" id="oQ" placeholder="🔍 Filtrar…" value="${esc(O.q)}" title="Filtrar por nombre, descripción o tecnología">
      <span class="sp"></span>
      <button class="obtn osel" id="oOrd" title="Orden de los proyectos">↕ <span>${ord}</span> ▾</button>
      <span class="oseg" title="Ver en tarjetas o en lista"><button data-v="tarjetas" class="${O.vista !== 'lista' ? 'on' : ''}" title="Tarjetas">▦</button><button data-v="lista" class="${O.vista === 'lista' ? 'on' : ''}" title="Lista">☰</button></span>
      <span class="osepv"></span>
      <button class="obtn oico ${O.st.alertas ? 'warn' : ''}" id="oAl" title="Anclas no encontradas: ${O.st.alertas}">⚠${O.st.alertas ? ' ' + O.st.alertas : ''}</button>
      <button class="obtn oico" id="oDi" title="Discos donde se buscan anclas: ${O.st.discos_activos} marcado(s)">💽 ${O.st.discos_activos}</button>
      <button class="obtn oico" id="oAc" title="Actividad: qué está pasando y dónde">📋${O.st.recorrido?.activo ? ' ⟳' : ''}</button>
      <button class="obtn oico" id="oAj" title="Ajustes del organizador">⚙</button>
      <button class="obtn primary" id="oNuevo" title="Nuevo proyecto (Ctrl+N), buscar en discos o convertir los de DeskLens">＋ Nuevo ▾</button></div>`;
  }
  function tarjeta(f) {
    const cuenta = {}; f.partes.forEach(p => cuenta[p.tipo] = (cuenta[p.tipo] || 0) + p.carpetas.length);
    // ★ la carpeta principal y, en fila, sus entornos (iguales a ella: pruebas → calidad → producción)
    const todas = f.partes.flatMap(p => p.carpetas), pr = todas.find(c => c.ancla === f.principal);
    const etapas = f.partes.filter(p => p.tipo === 'entornos').flatMap(p => p.carpetas).filter(c => c.ancla !== f.principal);
    const fila = pr ? `<div class="ogit ofila" title="La carpeta principal${etapas.length ? ' y sus entornos, en orden' : ''}">${svgI('principal', 'var(--accent)', 'Carpeta principal')}<b>${esc(pr.nombre)}</b>${etapas.map(c => `<span class="oflecha">→</span>${icoE(c.etapa)}<span>${esc(c.nombre)}</span>`).join('')}</div>` : '';
    const c = codigoDe(f), g = c && O.git[c.ruta];
    const git = !c ? '' : !c.git ? '⎇ sin git' : !g ? '⎇ …' : g.rama == null ? '⎇ sin git'
      : `⎇ ${esc(g.rama)} · ${g.cambios ? `${g.cambios} cambio${g.cambios > 1 ? 's' : ''}` : 'al día'}${g.adelante ? ` · ↑${g.adelante}` : ''}${g.atras ? ` · ↓${g.atras}` : ''}`;
    const web = (f.enlaces || [])[0];
    return `<div class="ocard oestado-${f.estado}" data-id="${f.id}" style="${f.color ? `--oc:${esc(f.color)}` : ''}">
      <h3>${f.fijado ? '⭐' : ''}<span>${esc(f.nombre)}</span></h3>
      <div class="oest">${ESTADO[f.estado][0]} ${ESTADO[f.estado][1]} <span class="obarp"><i style="width:${f.avance}%"></i></span> ${f.avance}%</div>
      ${f.descripcion ? `<div class="odesc">${esc(f.descripcion)}</div>` : ''}
      ${f.tecnologia?.length ? `<div class="otec">${esc(f.tecnologia.join(' · '))}</div>` : ''}
      <div class="opartes">${Object.entries(cuenta).filter(([, n]) => n).map(([t, n]) => `<span title="${TIPO[t][1]}">${icoT(t)}${n}</span>`).join('')}${f.papelera ? `<span class="owarn" title="Carpetas enviadas a la papelera o eliminadas">🗑 ${f.papelera} en la papelera</span>` : ''}${f.avisos - f.papelera ? `<span class="owarn" title="Partes no encontradas">⚠ ${f.avisos - f.papelera}</span>` : ''}</div>
      ${fila}
      ${git ? `<div class="ogit">${git}</div>` : ''}
      <div class="ogit">${esc(f.actualizado || '')}</div>
      <div class="oact"><button data-a="carpeta" title="Abrir la carpeta de código en el Explorador">📂</button><button data-a="vscode" title="Abrir en VS Code">VS</button>
        <button data-a="claude" title="Claude con todas las partes del proyecto (--add-dir)">✦</button><button data-a="terminal" title="Terminal en la carpeta de código">&gt;_</button>
        ${web ? `<button data-a="web" title="${esc(web.nombre)}: ${esc(web.url)}">🌐</button>` : ''}<span class="sp"></span><button data-a="menu" title="Más acciones">⋯</button></div></div>`;
  }
  function tablero() {
    if (!O.st.fichas.length) { O.pantalla = 'arranque'; return arranque(); }
    const fs = filtradas();
    // El aviso se cierra con ✕ y no vuelve, salvo que aparezca otro proyecto sin ficha que no estaba al cerrarlo.
    let cerrados = []; try { cerrados = JSON.parse(LS('desklens.org.avisoSinFicha') || '[]'); } catch {}
    const sinFicha = O.st.sin_convertir || [], avisar = sinFicha.some(x => !cerrados.includes(x));
    const banner = avisar ? `<div class="obanner">Tienes <b>${sinFicha.length}</b> proyecto(s) en DeskLens sin ficha.<span class="sp"></span><button class="obtn primary" id="oConv">Convertirlos en fichas</button><button class="obtn oxban" id="oConvX" title="Cerrar este aviso (vuelve solo si aparece otro proyecto sin ficha; también puedes convertirlos desde 🔍 Buscar en discos)">✕</button></div>` : '';
    // Casillas (aprobado 2026-11-22): solo cuenta lo que está a la vista; lo marcado no se guarda (al salir se desmarca)
    const vis = new Set(fs.map(f => f.id)); [...O.marca].forEach(i => vis.has(i) || O.marca.delete(i));
    const nm = O.marca.size, todos = fs.length && nm === fs.length;
    // con algo marcado, la cabecera de la tabla se vuelve la barra de acciones (no empuja las filas: Mayús+clic cae donde apuntas)
    const acciones = O.vista === 'lista' && nm ? `<div class="oselbar" role="toolbar"><b>${nm} marcado${nm > 1 ? 's' : ''}</b>
      ${todos ? '' : `· <a href="#" id="oMt">Marcar todos (${fs.length})</a>`}<span class="sp"></span>
      <button class="obtn osel" id="oMe" title="Cambiar el estado de los marcados">Estado ▾</button>
      <button class="obtn" id="oMc" title="Abrir en el Explorador la carpeta principal de cada uno (5 como mucho)">📂 Abrir carpetas</button>
      <button class="obtn odanger" id="oMq" title="Quitar del organizador (Supr). No se borra nada del disco">🗑 Quitar…</button>
      <button class="obtn oico" id="oMx" title="Desmarcar todo (Esc)">✕</button></div>` : '';
    const cuerpo = !fs.length ? '<p class="oempty">Ningún proyecto con este filtro.</p>' : O.vista === 'lista'
      ? `<table class="olist"><thead><tr><th class="ock"><input type="checkbox" id="oCkT" title="Marcar todos los que están a la vista (Ctrl+A)" ${todos ? 'checked' : ''}></th>${acciones ? `<th colspan="7" class="oselth">${acciones}</th>` : '<th>Proyecto</th><th>Estado</th><th>Avance</th><th>Partes</th><th>Git</th><th>Actualizado</th><th></th>'}</tr></thead><tbody>${fs.map(f => {
        const c = codigoDe(f), g = c && O.git[c.ruta];
        return `<tr data-id="${f.id}" tabindex="0" class="${O.marca.has(f.id) ? 'omarc' : ''}"><td class="ock"><input type="checkbox" data-ck ${O.marca.has(f.id) ? 'checked' : ''} title="Marcar (Mayús+clic: desde la última marcada)"></td><td>${f.fijado ? '⭐ ' : ''}<b>${esc(f.nombre)}</b></td><td>${ESTADO[f.estado].join(' ')}</td><td>${f.avance}%</td>
          <td>${f.partes.map(p => icoT(p.tipo)).join(' ')}${f.papelera ? ` <span class="owarn">🗑 ${f.papelera}</span>` : ''}${f.avisos - f.papelera ? ` <span class="owarn">⚠ ${f.avisos - f.papelera}</span>` : ''}</td><td>${g?.rama ? `⎇ ${esc(g.rama)}${g.cambios ? ` · ${g.cambios}` : ''}` : ''}</td><td>${esc(f.actualizado || '')}</td>
          <td class="omas"><button class="obtn oico" data-a="menu" title="Acciones de este proyecto">⋯</button></td></tr>`; }).join('')}</tbody></table>`
      : `<div class="ocards">${fs.map(tarjeta).join('')}</div>`;
    root.innerHTML = barra() + `<div class="obody">${banner}${cuerpo}</div>`;
    const ckT = root.querySelector('#oCkT'); if (ckT) { ckT.indeterminate = nm > 0 && !todos; ckT.onclick = e => { e.stopPropagation(); fs.forEach(f => todos ? O.marca.delete(f.id) : O.marca.add(f.id)); tablero(); }; }
    root.querySelector('#oMt')?.addEventListener('click', e => { e.preventDefault(); fs.forEach(f => O.marca.add(f.id)); tablero(); });
    root.querySelector('#oMx')?.addEventListener('click', () => { O.marca.clear(); tablero(); });
    root.querySelector('#oMq')?.addEventListener('click', () => quitarVarios([...O.marca]));
    root.querySelector('#oMe')?.addEventListener('click', e => openMenu(e.currentTarget, Object.keys(ESTADO).map(k => [`${ESTADO[k][0]} ${ESTADO[k][1]}`, () => estadoVarios([...O.marca], k)])));
    root.querySelector('#oMc')?.addEventListener('click', async () => {
      const cs = [...O.marca].map(i => O.st.fichas.find(f => f.id === i)).map(f => f && (codigoDe(f) || f.partes.flatMap(p => p.carpetas).find(c => c.ancla === f.principal && c.ruta))).filter(Boolean);
      for (const c of cs.slice(0, 5)) await api('/api/mostrar', { ruta: c.ruta }).catch(err);
      flash(cs.length > 5 ? `📂 Abiertas 5 de ${cs.length} carpetas (5 como mucho a la vez)` : `📂 ${cs.length} carpeta(s) abiertas en el Explorador`);
    });
    const nEst = k => O.st.fichas.filter(f => k === 'todos' ? f.estado !== 'archivo' : f.estado === k).length;
    root.querySelector('#oEst').onclick = e => openMenu(e.currentTarget, ['todos', ...Object.keys(ESTADO)].map(k => [k === 'todos' ? 'Todos' : ESTADO[k][1],
      () => { O.filtro = k; LS('desklens.org.filtro', k); tablero(); }, { html: `${O.filtro === k ? '✓' : '<span style="visibility:hidden">✓</span>'} ${k === 'todos' ? 'Todos (sin Archivo)' : ESTADO[k].join(' ')} <b style="opacity:.6">${nEst(k)}</b>` }]));
    root.querySelector('#oOrd').onclick = e => openMenu(e.currentTarget, ORDENES.map(([v, t]) => [t, () => { O.orden = v; LS('desklens.org.orden', v); tablero(); },
      { html: `${O.orden === v ? '✓' : '<span style="visibility:hidden">✓</span>'} ${t}` }]));
    root.querySelectorAll('.oseg [data-v]').forEach(b => b.onclick = () => { O.vista = b.dataset.v; LS('desklens.org.vista', O.vista); tablero(); });
    root.querySelector('#oNuevo').onclick = e => menuNuevo(e.currentTarget, sinFicha);
    const q = root.querySelector('#oQ'); q.oninput = () => { O.q = q.value; const pos = q.selectionStart; tablero(); const n = root.querySelector('#oQ'); n.focus(); n.setSelectionRange(pos, pos); };
    root.querySelector('#oAl').onclick = alertasDlg; root.querySelector('#oDi').onclick = discosDlg;
    root.querySelector('#oAc').onclick = actividadDlg; root.querySelector('#oAj').onclick = ajustesDlg;
    root.querySelector('#oConv')?.addEventListener('click', convertir);
    root.querySelector('#oConvX')?.addEventListener('click', () => { LS('desklens.org.avisoSinFicha', JSON.stringify(sinFicha)); tablero(); });
    root.querySelectorAll('[data-id]').forEach(el => el.onclick = e => {
      if (e.target.closest('.ock')) { e.preventDefault(); return marcar(el.dataset.id, e.shiftKey, fs); }
      const f = O.st.fichas.find(x => x.id === el.dataset.id), a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return adminAbrir(f); // clic en la tarjeta: la vista de administración del proyecto
      e.stopPropagation(); accion(a, f, e.target.closest('button'));
    });
    root.querySelectorAll('tr[data-id]').forEach(tr => tr.onkeydown = e => { if (e.key === 'Enter' && e.target === tr) tr.click(); });
    if (O.foco) root.querySelector(`tr[data-id="${O.foco}"]`)?.focus();
  }
  function marcar(id, rango, fs = filtradas()) { // casilla de la lista; Mayús: desde la última marcada hasta esta
    const ids = fs.map(f => f.id), a = ids.indexOf(O.ultMarca), b = ids.indexOf(id);
    if (rango && a >= 0 && b >= 0) ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(i => O.marca.add(i));
    else O.marca.has(id) ? O.marca.delete(id) : O.marca.add(id);
    O.ultMarca = id; O.foco = id; tablero(); O.foco = null;
  }
  async function estadoVarios(ids, k) {
    try { for (const id of ids) await api('/api/org/ficha/guardar', { id, estado: k }); flash(`✓ ${ids.length} proyecto(s) en ${ESTADO[k][1]}`); } catch (e) { err(e); }
    await cargar();
  }
  // 🗑 Quitar del organizador (uno o varios). Dice qué pasa y dónde; las anclas solo se borran si se marca, y nunca
  // la de una carpeta que sigue en un proyecto que se queda. Se deshace al momento o desde ↶ Proyectos quitados.
  async function quitarVarios(ids) {
    const fs = ids.map(i => O.st.fichas.find(f => f.id === i)).filter(Boolean); if (!fs.length) return;
    const quedan = new Map(); O.st.fichas.filter(f => !ids.includes(f.id)).forEach(f => f.partes.forEach(p => p.carpetas.forEach(c => quedan.set(c.ancla, f.nombre))));
    const anc = new Map(); fs.forEach(f => f.partes.forEach(p => p.carpetas.forEach(c => { if (/^[0-9a-f]{32}$/.test(c.ancla) && c.ruta) anc.set(c.ancla, { ruta: c.ruta, otro: quedan.get(c.ancla) }); })));
    const bor = [...anc.values()].filter(a => !a.otro), comp = [...anc.values()].filter(a => a.otro), n = fs.length, pl = n > 1 ? 's' : '';
    const d = abrirDlg(`🗑 Quitar ${n} proyecto${pl} del organizador`, `<p class="oqnom">${fs.map(f => `<b>${esc(f.nombre)}</b>`).join(' · ')}</p>
      <p class="ohint">Qué pasa:</p><ul class="oque"><li>La${pl} ${n} ficha${pl} pasa${n > 1 ? 'n' : ''} a <code>${esc(O.st.quitados_dir || 'quitados')}</code> (se pueden recuperar)</li>
      <li>Tus carpetas y archivos <b>no se tocan</b></li><li>Las anclas se quedan: al volver a crearlos se reconocen solas</li></ul>
      ${bor.length ? `<label class="oqanc"><input type="checkbox" id="oqA"> Borrar también las anclas de sus ${bor.length} carpeta${bor.length > 1 ? 's' : ''}</label>
        <p class="ohint">Solo el archivo oculto .desklens-ancla de cada una; perderás el seguimiento si se mueven antes de volver a crearlos.</p>
        <ul class="oqrutas" id="oqR" hidden>${bor.map(a => `<li><code>${esc(a.ruta)}\\.desklens-ancla</code></li>`).join('')}</ul>` : ''}
      ${comp.length ? `<p class="ohint">Conservan su ancla porque siguen en otro proyecto: ${comp.map(a => `<code>${esc(a.ruta)}</code> (${esc(a.otro)})`).join(', ')}</p>` : ''}`,
      { ancho: 620, pie: `<span class="sp"></span><button class="obtn" id="oqC">Cancelar</button><button class="obtn odanger" id="oqOk">🗑 Quitar ${n} proyecto${pl}</button>` });
    d.oninput = null; // marcar la casilla no es «escribir algo sin guardar»
    const ck = d.querySelector('#oqA');
    ck?.addEventListener('change', () => { d.querySelector('#oqR').hidden = !ck.checked; d.querySelector('#oqOk').textContent = `🗑 Quitar ${n} proyecto${pl}${ck.checked ? ` y ${bor.length} ancla${bor.length > 1 ? 's' : ''}` : ''}`; });
    d.querySelector('#oqC').onclick = () => cerrarDlg();
    d.querySelector('#oqC').focus();
    d.querySelector('#oqOk').onclick = async () => {
      let r; try { r = await api('/api/org/fichas/quitar', { ids: fs.map(f => f.id), borrar_anclas: !!ck?.checked }); } catch (e) { return err(e); }
      d.close(); fs.forEach(f => O.marca.delete(f.id));
      r.avisos?.forEach(a => flash('⚠ ' + a));
      await cargar();
      aviso(`✓ ${r.quitados.length} proyecto${r.quitados.length > 1 ? 's' : ''} quitado${r.quitados.length > 1 ? 's' : ''}${r.anclas_borradas.length ? ` y ${r.anclas_borradas.length} ancla(s) borrada(s)` : ''} · copias en quitados\\`,
        '↶ Deshacer', () => recuperar(r.quitados.map(x => x.archivo)));
    };
  }
  function aviso(texto, boton, fn) { // aviso abajo con un botón (Deshacer), unos segundos
    document.querySelector('.otoast')?.remove();
    const t = document.createElement('div'); t.className = 'otoast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span>${esc(texto)}</span>${boton ? `<button class="obtn">${esc(boton)}</button>` : ''}<button class="obtn oico" title="Cerrar">✕</button>`;
    document.body.append(t);
    const fuera = () => t.remove(), tm = setTimeout(fuera, 10000);
    t.querySelector('.oico').onclick = () => { clearTimeout(tm); fuera(); };
    if (boton) t.querySelector('.obtn').onclick = () => { clearTimeout(tm); fuera(); fn(); };
  }
  async function recuperar(archivos) {
    document.querySelector('.otoast')?.remove(); // su «Deshacer» ya no tendría qué deshacer
    let r; try { r = await api('/api/org/quitados/recuperar', { archivos }); } catch (e) { return err(e); }
    r.avisos.forEach(a => flash('⚠ ' + a));
    if (r.recuperados.length) flash(`↶ ${r.recuperados.length} proyecto(s) de vuelta en el tablero`);
    if (O.pantalla === 'arranque' && r.recuperados.length) { O.pantalla = 'tablero'; O.props = null; }
    await cargar();
    return r;
  }
  async function quitadosDlg() { // ↶ Proyectos quitados: recuperar o vaciar (lo único que borra de verdad)
    let r; try { r = await api('/api/org/quitados'); } catch (e) { return err(e); }
    const q = r.quitados;
    const d = abrirDlg(`↶ Proyectos quitados (${q.length})`, `<p class="ohint">Fichas quitadas del tablero, en <code>${esc(r.carpeta)}</code>. Recuperar devuelve la ficha y, si se borró el ancla de alguna carpeta, la vuelve a poner con el mismo id. Las carpetas nunca se tocan.</p>
      ${q.length ? `<table class="olist oqt"><thead><tr><th class="ock"><input type="checkbox" id="oqT" title="Marcar todos"></th><th>Proyecto</th><th>Carpetas</th><th>Quitado</th><th></th></tr></thead><tbody>${q.map(x => `<tr data-q="${esc(x.archivo)}">
        <td class="ock"><input type="checkbox" data-ck ${x.existe ? 'disabled' : ''}></td><td><b>${esc(x.nombre)}</b>${x.existe ? ' <small class="owarn">ya está en el tablero</small>' : ''}</td><td>${x.carpetas}</td>
        <td>${esc(x.quitado.replace('T', ' ').slice(0, 16))}</td><td><button class="obtn" data-r ${x.existe ? 'disabled' : ''}>↶ Recuperar</button></td></tr>`).join('')}</tbody></table>` : '<p class="oempty">No hay proyectos quitados.</p>'}`,
      { ancho: 680, pie: q.length ? `<button class="obtn odanger" id="oqV" title="Borra de verdad las copias (las carpetas no se tocan)">Vaciar quitados…</button><span class="sp"></span><button class="obtn primary" id="oqRm" disabled>↶ Recuperar marcados</button>` : '' });
    d.oninput = null;
    const cks = () => [...d.querySelectorAll('tr[data-q] [data-ck]:checked')].map(i => i.closest('tr').dataset.q);
    const cuenta = () => { const n = cks().length, b = d.querySelector('#oqRm'); if (b) { b.disabled = !n; b.textContent = `↶ Recuperar marcados${n ? ` (${n})` : ''}`; } };
    d.querySelectorAll('[data-ck]').forEach(i => i.onchange = cuenta);
    d.querySelector('#oqT')?.addEventListener('change', e => { d.querySelectorAll('[data-ck]:not(:disabled)').forEach(i => i.checked = e.target.checked); cuenta(); });
    const hecho = async a => { await recuperar(a); quitadosDlg(); };
    d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => hecho([b.closest('tr').dataset.q]));
    d.querySelector('#oqRm')?.addEventListener('click', () => hecho(cks()));
    d.querySelector('#oqV')?.addEventListener('click', async () => {
      if (await ask('Vaciar quitados', `Se borran de verdad las ${q.length} copia(s) de ${r.carpeta}. Tus carpetas y sus anclas no se tocan. No se puede deshacer.`, ['Vaciar', 'Cancelar'], { danger: true }) !== 'Vaciar') return;
      try { const x = await api('/api/org/quitados/vaciar', {}); flash(`🗑 ${x.borrados} copia(s) borrada(s)`); await cargar(); quitadosDlg(); } catch (e) { err(e); }
    });
  }
  async function accion(a, f, b) {
    const c = codigoDe(f) || f.partes.flatMap(p => p.carpetas).find(x => (x.estado === 'ok' || x.estado === 'movida') && !x.acceso);
    try {
      if (a === 'menu') return openMenu(b, [['📂 Abrir proyecto', () => adminAbrir(f)], ['📋 Ficha… (nombre, descripción…)', () => fichaDlg(f)], ['🧩 Editar jerarquía…', () => editarFicha(f)], '-',
        ...Object.keys(ESTADO).map(k => [`${ESTADO[k][0]} ${ESTADO[k][1]}`, () => guardar(f.id, { estado: k }), { disabled: f.estado === k }]),
        '-', [f.fijado ? '☆ Quitar de arriba' : '⭐ Fijar arriba', () => guardar(f.id, { fijado: !f.fijado })],
        [`🗑 Quitar del organizador…`, () => quitar(f), { danger: true }]]);
      if (!c) return flash('Ninguna carpeta del proyecto está disponible');
      if (a === 'carpeta') await api('/api/mostrar', { ruta: c.ruta });
      else if (a === 'terminal') { cerrar(); openTerminal(c.ruta); }
      else if (a === 'web') { cerrar(); openTab('web:' + f.enlaces[0].url, true); }
      else { const r = await api('/api/org/lanzar', { programa: a, id: f.id }); flash(a === 'claude' ? `✦ Claude en ${r.carpeta}${r.otras.length ? ` + ${r.otras.length} carpeta(s)` : ''}` : `VS Code: ${r.carpeta}`); }
    } catch (e) { err(e); }
  }
  async function guardar(id, cambios) {
    try { const r = await api('/api/org/ficha/guardar', { id, ...cambios }); r.avisos?.forEach(a => flash('⚠ ' + a)); await cargar(); return r.ficha; }
    catch (e) { err(e); }
  }
  const quitar = f => quitarVarios([f.id]);
  const buscarEnDiscos = () => { O.pantalla = 'arranque'; O.props = null; arranque(); };
  function menuNuevo(b, sinFicha = O.st?.sin_convertir || []) {
    openMenu(b, [['＋ Nuevo proyecto…', () => nuevoProyecto(), { html: '＋ Nuevo proyecto… <small style="opacity:.6">Ctrl+N</small>' }],
      ['🔍 Buscar en discos…', buscarEnDiscos],
      [`⇪ Convertir proyectos de DeskLens (${sinFicha.length})`, convertir, { disabled: !sinFicha.length }], '-',
      [`↶ Proyectos quitados (${O.st?.quitados || 0})…`, quitadosDlg, { disabled: !O.st?.quitados }]]);
  }

  // ---------- ＋ Nuevo proyecto · ＋ Añadir carpetas (aprobado 2026-11-22) ----------
  // A la izquierda se añade (ruta escrita o pegada, 📁 Examinar, ＋ Archivo, ☁ Etapa remota, sugerencias por nombre);
  // a la derecha se ve en vivo cómo queda (Árbol · Flujo · Red). Con `f`, añade a ese proyecto. No se mueve ningún archivo.
  const ORD_ETAPA = { Pruebas: 0, Calidad: 1, 'Producción': 2 };
  const padreDe = r => String(r || '').replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '') + '\\'; // la carpeta de arriba (la ruta entera, al pasar el ratón)
  const normRuta = r => String(r || '').replace(/[\\/]+$/, '').toLowerCase();
  // Separador que se arrastra (↔ o ↕). Doble clic: su tamaño de antes. Teclado: Tab y flechas (Mayús: más).
  const sep = (k, eje, t) => `<div class="onvsep" data-sep="${k}" data-eje="${eje}" tabindex="0" role="separator" aria-orientation="${eje === 'x' ? 'vertical' : 'horizontal'}" title="${t}: arrastra · doble clic: tamaño de antes"></div>`;
  function nuevoProyecto(f = null, tipoInicial = '') {
    if (f) f = O.st.fichas.find(x => x.id === f.id) || f;
    const N = { nombre: '', tocado: false, estado: 'activo', items: [], principal: '', vista: LS('desklens.org.nuevo.vista') || 'arbol', nuevo: '', propuesta: '', exp: null, sug: null };
    const cys = [], limpiarCy = () => { while (cys.length) { try { cys.pop().destroy(); } catch {} } };
    const d = abrirDlg(f ? `＋ Añadir carpetas · ${esc(f.nombre)}` : '＋ Nuevo proyecto', `<div class="onv">
      ${f ? '' : `<div class="onvtop"><label>Nombre <input id="nvN" placeholder="Se llama como la ★ mientras no le pongas otro" spellcheck="false"></label>
        <small id="nvNs" class="osmall"></small><span class="sp"></span>
        <label>Estado <select id="nvE">${Object.entries(ESTADO).map(([k, v]) => `<option value="${k}">${v.join(' ')}</option>`).join('')}</select></label></div>`}
      <div class="onvizq">
        <h5>Añadir</h5>
        <div class="onvruta"><input id="nvR" list="nvRL" placeholder="Escribe o pega una ruta (G:\\www\\proyecto) y pulsa Enter" spellcheck="false" autocomplete="off"><datalist id="nvRL"></datalist>
          <button class="obtn" id="nvX" title="Elegir carpetas (Ctrl+O)">📁 Examinar…</button><button class="obtn" id="nvA" title="Un archivo suelto (p. ej. un PDF de requisitos): entra como acceso ↗">＋ Archivo…</button>
          <button class="obtn" id="nvRem" title="Una etapa que no es una carpeta de este PC (p. ej. el VPS)">☁ Etapa remota…</button></div>
        <div id="nvExp" hidden></div>
        <h5>En el proyecto <span id="nvC" class="osmall"></span></h5>
        <div id="nvL" class="onvl"></div>${sep('lh', 'y', 'Alto de la lista «En el proyecto»')}
        <h5>Sugerencias <small id="nvSi" class="osmall"></small><span class="sp"></span><button class="obtn" id="nvSt" hidden>＋ Añadir todas</button></h5>
        <div id="nvS" class="onvl"></div>
      </div>
      ${sep('w', 'x', 'Ancho de «Añadir» y «Así queda»')}<div class="onvder">
        <div class="onvdh"><b>Así queda</b><span class="sp"></span><span class="oseg">${[['arbol', '🗂 Árbol'], ['flujo', '⇢ Flujo'], ['red', '◉ Red']].map(([v, t]) => `<button data-nv="${v}">${t}</button>`).join('')}</span></div>
        <div id="nvV" class="onvv"></div>
        <div id="nvRes" class="osmall"></div>
      </div></div>`, { ancho: 1240,
      pie: `<span id="nvPie" class="osmall"></span><span class="sp"></span><button class="obtn" id="nvCan">Cancelar</button>
        ${f ? '<button class="obtn primary" id="nvOk" title="Ctrl+Enter">Añadir al proyecto</button>' : '<button class="obtn" id="nvOtro">Crear y seguir con otro</button><button class="obtn primary" id="nvOk" title="Ctrl+Enter">Crear y abrir</button>'}` });
    d.dataset.tipo = 'nuevo'; d.oninput = null; // solo pregunta al cerrar si añadiste algo
    const $n = q => d.querySelector(q);
    // ---- separadores y tamaño de la ventana (aprobado 2026-11-22): se guardan y valen para todos los proyectos ----
    const TAM_K = 'desklens.org.nuevo.tam', VARS = ['--nvw', '--nvdh', '--nvexh', '--nvlh', '--nvexs'], ac = new AbortController();
    let tam = {}; try { tam = JSON.parse(LS(TAM_K) || '{}') || {}; } catch {}
    const guardarTam = () => LS(TAM_K, JSON.stringify(tam));
    const estrecha = () => matchMedia('(max-width:980px)').matches;
    const SEP = {
      w: () => estrecha() ? { v: '--nvdh', el: '.onvder', eje: 'y', signo: -1, min: 220, max: innerHeight - 120 }
        : { v: '--nvw', el: '.onvizq', eje: 'x', signo: 1, min: 340, max: Math.max(340, $n('.onv').clientWidth - 300) },
      exh: () => ({ v: '--nvexh', el: '.onvexc', eje: 'y', signo: 1, min: 110, max: 900 }),
      lh: () => ({ v: '--nvlh', el: '#nvL', eje: 'y', signo: 1, min: 46, max: 1400 }),
      exs: () => ({ v: '--nvexs', el: '.onvexs', eje: 'x', signo: 1, min: 80, max: 420 }),
    };
    const ajustarCy = () => cys.forEach(c => { try { c.resize(); } catch {} });
    const valor = (v, px) => v === '--nvw' ? `min(${px}px, calc(100% - 307px))` : px + 'px'; // «Así queda» nunca baja de 300 px aunque achiques la ventana
    const fijar = (c, px) => { px = Math.round(Math.max(c.min, Math.min(c.max, px))); tam[c.v] = px; d.style.setProperty(c.v, valor(c.v, px)); ajustarCy(); };
    for (const v of VARS) if (tam[v]) d.style.setProperty(v, valor(v, tam[v]));
    if (/^\d+(\.\d+)?px$/.test(tam.ventW || '')) d.style.width = `min(${tam.ventW}, calc(100vw - 32px))`;
    if (/^\d+(\.\d+)?px$/.test(tam.ventH || '')) d.style.height = `min(${tam.ventH}, calc(100vh - 24px))`;
    d.addEventListener('pointerdown', e => {
      const s = e.target.closest('.onvsep'); if (!s || e.button) return;
      const c = SEP[s.dataset.sep](), el = $n(c.el); if (!el) return;
      e.preventDefault();
      const ini = c.eje === 'x' ? el.offsetWidth : el.offsetHeight, p0 = c.eje === 'x' ? e.clientX : e.clientY;
      s.setPointerCapture(e.pointerId); s.classList.add('on'); document.body.classList.add(c.eje === 'x' ? 'onvarrx' : 'onvarry');
      const mover = ev => fijar(c, ini + c.signo * ((c.eje === 'x' ? ev.clientX : ev.clientY) - p0));
      const soltar = () => { s.removeEventListener('pointermove', mover); s.classList.remove('on'); document.body.classList.remove('onvarrx', 'onvarry'); guardarTam(); };
      s.addEventListener('pointermove', mover); s.addEventListener('lostpointercapture', soltar, { once: true });
    }, { signal: ac.signal });
    d.addEventListener('dblclick', e => {
      const s = e.target.closest('.onvsep'); if (!s) return;
      const c = SEP[s.dataset.sep](); delete tam[c.v]; d.style.removeProperty(c.v); guardarTam(); ajustarCy(); flash('Tamaño de antes');
    }, { signal: ac.signal });
    d.addEventListener('keydown', e => {
      const s = e.target.closest?.('.onvsep'); if (!s) return;
      const c = SEP[s.dataset.sep](), el = $n(c.el), paso = e.shiftKey ? 64 : 16;
      const dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[e.key];
      if (!el || !dir || (c.eje === 'x') !== (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      e.preventDefault(); e.stopPropagation();
      fijar(c, (c.eje === 'x' ? el.offsetWidth : el.offsetHeight) + c.signo * dir * paso); guardarTam();
    }, { signal: ac.signal });
    const ro = new ResizeObserver(() => { // el borde de la ventana: si lo arrastraste, se recuerda su tamaño
      if (/^\d+(\.\d+)?px$/.test(d.style.width) && /^\d+(\.\d+)?px$/.test(d.style.height)) { tam.ventW = d.style.width; tam.ventH = d.style.height; guardarTam(); }
      ajustarCy();
    });
    ro.observe(d);
    d.onclose = () => { if (d.open) return; // el «close» de la ventana anterior llega tarde, con esta ya abierta: no es para ella
      pararPoll(); limpiarCy(); delete d.dataset.tipo; d.onkeydown = null; ac.abort(); ro.disconnect(); VARS.forEach(v => d.style.removeProperty(v)); d.style.height = ''; };
    const existentes = () => f ? f.partes.flatMap(p => p.carpetas.map(c => ({ c, p }))) : [];
    const yaEsta = ruta => N.items.find(it => normRuta(it.ruta) === normRuta(ruta)) || existentes().find(x => normRuta(x.c.ruta) === normRuta(ruta));
    const principalIt = () => N.items.find(it => normRuta(it.ruta) === normRuta(N.principal));
    const nombreAuto = () => principalIt()?.nombre || '';
    const marcarCambios = () => { if (N.items.length) d.dataset.cambios = '1'; else delete d.dataset.cambios; };
    const valorTipo = it => it.tipo === 'entornos' ? 'entornos|' + (it.etapa || 'Pruebas') : it.tipo;
    const opcionesTipo = it => Object.entries(TIPO).flatMap(([t, [, nom]]) => t === 'entornos' ? (it.archivo ? [] : Object.keys(ORD_ETAPA).map(e => [`entornos|${e}`, `Entornos · ${e}`])) : it.remota ? [] : [[t, nom]]);

    // ---- añadir ----
    async function anadir(ruta, { tipo = '', archivo = false, accion = '', silencio = false } = {}) {
      ruta = String(ruta || '').trim().replace(/^"(.*)"$/, '$1');
      if (!ruta) return;
      const ya = yaEsta(ruta);
      if (ya) { if (!silencio) flash(ya.c ? `«${ya.c.nombre}» ya es parte de «${f.nombre}»` : `«${ya.nombre}» ya está en la lista`); return; }
      let a;
      try { a = await api('/api/org/analizar?ruta=' + encodeURIComponent(ruta)); } catch (e) { return flash('⚠ ' + e.message); }
      if (!a.existe) return flash(`⚠ No existe: ${a.ruta}`);
      if (a.error) return flash('⚠ ' + a.error);
      if (yaEsta(a.ruta)) return;
      if (f && a.proyectos.some(x => x.id === f.id)) return flash(`«${a.nombre}» ya es parte de «${f.nombre}»`);
      const esArchivo = !a.dir;
      let t = tipo || tipoInicial || a.tipo || 'otro';
      if (esArchivo && t === 'entornos') t = 'documentos';
      const it = { ruta: a.ruta, nombre: a.nombre, dir: a.dir, archivo: esArchivo, tipo: t, etapa: t === 'entornos' ? a.etapa || 'Pruebas' : '', git: a.git, info: a,
        accion: accion || 'compartir' };
      N.items.push(it);
      if (!f && !principalIt() && it.dir) N.principal = it.ruta; // la primera carpeta es la ★
      else if (!f && it.git && !principalIt()?.git && !N.propuesta) N.propuesta = it.ruta; // llegó una con git: se propone como ★
      N.nuevo = it.ruta;
      if (archivo && !esArchivo) flash('Era una carpeta: se añadió como carpeta');
      marcarCambios(); pintar(); sugerir();
    }
    function quitarIt(it) {
      N.items = N.items.filter(x => x !== it);
      if (normRuta(N.principal) === normRuta(it.ruta)) N.principal = f ? '' : N.items.find(x => x.dir && !x.remota)?.ruta || '';
      if (N.propuesta === it.ruta) N.propuesta = '';
      marcarCambios(); pintar(); sugerir();
    }
    // ---- la lista «En el proyecto» ----
    function avisosDe(it) {
      const a = it.info || {}, out = [];
      const otros = (a.proyectos || []).filter(x => !f || x.id !== f.id);
      if (otros.length) out.push(`<span class="owarn">🔗 ya está en ${otros.map(x => `«${esc(x.nombre)}»`).join(', ')}</span>
        <span class="oseg onvseg"><button data-acc="compartir" class="${it.accion !== 'mover' ? 'on' : ''}" title="Queda en los dos proyectos">Compartir</button><button data-acc="mover" class="${it.accion === 'mover' ? 'on' : ''}" title="Se quita del otro proyecto al crear (solo la ficha)">Mover aquí</button></span>`);
      const padre = N.items.find(x => x !== it && x.dir && normRuta(it.ruta).startsWith(normRuta(x.ruta) + '\\'));
      if (padre) out.push(`<span class="owarn">ⓘ está dentro de «${esc(padre.nombre)}», ya añadida</span>`);
      const ajeno = x => !f || (x.ids || []).some(i => i !== f.id); // lo de este mismo proyecto no es aviso
      for (const x of (a.dentro_de || []).filter(ajeno)) out.push(`<span>ⓘ cuelga de ${esc(x.ruta)} (de ${x.proyectos.map(n => `«${esc(n)}»`).join(', ')})</span>`);
      const cont = (a.contiene || []).filter(ajeno);
      if (cont.length) out.push(`<span title="${esc(cont.map(x => x.ruta).join(' · '))}">ⓘ contiene ${cont.length} elemento(s) de otros proyectos</span>`);
      if (it.archivo) out.push('<span>↗ acceso a un archivo: no lleva ancla; si lo mueves, sale en ⚠</span>');
      if (it.remota) out.push(`<span>☁ ${esc(it.remota.url || 'sin dirección')}</span>`);
      return out.length ? `<div class="onvav">${out.join('')}</div>` : '';
    }
    function pintarLista() {
      const L = $n('#nvL');
      const viejas = existentes().map(({ c, p }) => `<div class="onvfila oviejo" title="${esc(c.ruta)}"><span class="onvst">${c.ancla === f.principal ? svgI('principal', 'var(--accent)', 'Carpeta principal') : ''}</span>${icoC(c, p.tipo)}<span class="onvr"><b>${esc(c.nombre)}</b><small class="onvpadre">${esc(padreDe(c.ruta))}</small></span><small>${esc(p.nombre)}${c.etapa ? ' · ' + esc(c.etapa) : ''}</small><small class="osmall">ya en el proyecto</small></div>`).join('');
      L.innerHTML = (viejas ? `<details class="onvviejas"><summary>${existentes().length} ya en el proyecto</summary>${viejas}</details>` : '')
        + (N.items.map((it, i) => {
          const pr = normRuta(it.ruta) === normRuta(N.principal);
          const ico = it.remota ? svgI('produccion', COLT.entornos) : it.archivo ? svgI('documentos', COLT[it.tipo]) : it.tipo === 'entornos' ? icoE(it.etapa) : svgI(icoKey(it.info?.icono) || 'carpeta', COLT[it.tipo]);
          return `<div class="onvfila ${it.ruta === N.nuevo ? 'onvflash' : ''}" data-i="${i}" tabindex="0" title="${esc(it.ruta)}">
            <button class="onvst ${pr ? 'on' : ''}" data-star ${it.dir && !it.remota ? '' : 'disabled'} title="${pr ? 'Carpeta principal (la raíz del proyecto)' : it.dir && !it.remota ? 'Hacerla la carpeta principal ★' : 'Solo una carpeta de este PC puede ser la principal'}">${pr ? svgI('principal', 'var(--accent)') : '☆'}</button>
            ${ico}<span class="onvr"><b>${esc(it.nombre)}</b>${it.git ? ' <span title="Repositorio git">⎇</span>' : ''}${it.archivo ? ' <span title="Acceso a un archivo">↗</span>' : ''}<small class="onvpadre">${esc(it.remota ? it.remota.url || 'sin dirección' : padreDe(it.ruta))}</small></span>
            <select data-tipo title="Tipo de parte">${opcionesTipo(it).map(([v, t]) => `<option value="${v}" ${valorTipo(it) === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <button class="ic" data-x title="Quitar de la lista (Supr)">✕</button>${avisosDe(it)}</div>`;
        }).join('') || `<p class="ohint">${f ? 'Añade carpetas o archivos: escribe o pega una ruta, usa 📁 Examinar o elige de las sugerencias.' : 'Empieza por la carpeta principal del proyecto (la del código o la que usa git): escribe o pega su ruta, o usa 📁 Examinar. La primera carpeta que añadas será la ★.'}</p>`)
        + (N.propuesta && principalIt() && normRuta(N.propuesta) !== normRuta(N.principal) && yaEsta(N.propuesta) ? `<div class="obanner onvprop">⎇ «${esc(yaEsta(N.propuesta).nombre)}» usa git. ¿Es ella la carpeta principal?<span class="sp"></span><button class="obtn" id="nvProp">★ Hacerla principal</button><button class="ic" id="nvPropX" title="No">✕</button></div>` : '');
      $n('#nvC').textContent = N.items.length ? `(${N.items.length} nueva${N.items.length > 1 ? 's' : ''})` : '';
      L.querySelectorAll('.onvfila[data-i]').forEach(el => {
        const it = N.items[+el.dataset.i];
        el.querySelector('[data-x]').onclick = () => quitarIt(it);
        el.querySelector('[data-star]').onclick = () => { N.principal = it.ruta; N.propuesta = ''; pintar(); sugerir(); };
        el.querySelector('[data-tipo]').onchange = e => { const [t, et] = e.target.value.split('|'); it.tipo = t; it.etapa = et || ''; N.nuevo = it.ruta; pintar(); };
        el.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { it.accion = b.dataset.acc; pintar(); });
        el.onkeydown = e => { if (e.key === 'Delete' && !e.target.closest('select')) { e.preventDefault(); quitarIt(it); setTimeout(() => $n('.onvfila[data-i]')?.focus(), 0); } };
      });
      $n('#nvProp')?.addEventListener('click', () => { N.principal = N.propuesta; N.propuesta = ''; pintar(); sugerir(); });
      $n('#nvPropX')?.addEventListener('click', () => { N.propuesta = ''; pintar(); });
    }
    // ---- «Así queda»: la ficha como quedaría ----
    function fichaVista() {
      const partes = f ? f.partes.map(p => ({ ...p, carpetas: p.carpetas.map(c => ({ ...c })) })) : [];
      const parteDe = t => partes.find(p => p.tipo === t) || (partes.push({ nombre: TIPO[t][1], tipo: t, carpetas: [] }), partes.at(-1));
      N.items.forEach((it, i) => parteDe(it.tipo).carpetas.push({ ancla: 'nv' + i, nombre: it.nombre, ruta: it.ruta, estado: it.remota ? 'remota' : 'ok', remota: it.remota,
        icono: it.archivo ? '📄' : it.info?.icono || '📁', icono_propio: false, etapa: it.etapa, git: it.git, proyectos: [], acceso: it.archivo, _nuevo: it.ruta === N.nuevo }));
      for (const p of partes) if (p.tipo === 'entornos') p.carpetas.sort((a, b) => (ORD_ETAPA[a.etapa] ?? 9) - (ORD_ETAPA[b.etapa] ?? 9));
      const iPr = N.items.findIndex(it => normRuta(it.ruta) === normRuta(N.principal));
      const nombre = f ? f.nombre : N.nombre.trim() || nombreAuto() || 'Proyecto nuevo';
      return { id: '_nuevo', nombre, principal: iPr >= 0 ? 'nv' + iPr : f?.principal || '', partes, posiciones: {}, cajas: [], conexiones: [] };
    }
    function arbolVista(F, T) {
      T.className = 'onvv otl';
      const todas = F.partes.flatMap(p => p.carpetas.map(c => ({ c, p }))), pr = todas.find(x => x.c.ancla === F.principal);
      if (!pr) { T.innerHTML = '<p class="ohint" style="padding:16px">Aquí se verá el proyecto: la ★ arriba, sus etapas en fila y las demás partes colgando de ella.</p>'; return; }
      const fila = ({ c, p }) => { const esP = c.ancla === F.principal;
        return `<div class="onodo raiz ${c._nuevo ? 'onvflash' : ''} ${esP ? 'oprincipal' : ''}" title="${esc(c.ruta || '')}"><span class="otw"></span>${esP ? svgI('principal', 'var(--accent)', 'Carpeta principal') : ''}${c.acceso ? svgI('documentos', COLT[p.tipo]) : icoC(c, p.tipo)}<span class="onom">${esc(c.nombre)}</span>${c.acceso ? '<small>↗ acceso</small>' : ''}${esP ? '<small>principal</small>' : p.tipo === 'entornos' ? `<small>${esc(c.etapa || '')}</small>` : ''}${c.git ? '<span title="git">⎇</span>' : ''}</div>`; };
      const etapas = todas.filter(x => x.p.tipo === 'entornos' && x.c.ancla !== F.principal);
      const cadena = i => i >= etapas.length ? '' : `<div class="orama oetapa">${fila(etapas[i])}<div class="ohijos">${cadena(i + 1)}</div></div>`;
      const partes = F.partes.map(p => ({ p, cs: p.carpetas.filter(c => c.ancla !== F.principal) })).filter(x => x.p.tipo !== 'entornos' && x.cs.length);
      T.innerHTML = `<div class="orama oraiz">${fila(pr)}<div class="ohijos">${cadena(0)}${partes.map(({ p, cs }) => `<div class="orama"><div class="onodo oparten"><span class="otw"></span>${icoT(p.tipo)}<span class="onom">${esc(p.nombre)}</span><small>${cs.length}</small></div>
        <div class="ohijos">${cs.map(c => `<div class="orama">${fila({ c, p })}</div>`).join('')}</div></div>`).join('')}</div></div>`;
      marcarUltimos(T);
    }
    let tokV = 0;
    async function pintarVista() {
      const V = $n('#nvV'), F = fichaVista(), t = ++tokV;
      d.querySelectorAll('[data-nv]').forEach(b => b.classList.toggle('on', b.dataset.nv === N.vista));
      const n = F.partes.reduce((s, p) => s + p.carpetas.length, 0), git = F.partes.flatMap(p => p.carpetas).filter(c => c.git).length;
      $n('#nvRes').textContent = n ? `${n} elemento(s) en ${F.partes.filter(p => p.carpetas.length).length} parte(s)${git ? ` · ${git} con git` : ''}` : '';
      limpiarCy();
      if (N.vista === 'arbol' || !F.principal) return arbolVista(F, V);
      V.className = 'onvv onvcy'; V.innerHTML = '';
      try { await cargarCy(); } catch (e) { V.innerHTML = `<p class="oempty">⚠ ${esc(e.message)}</p>`; return; }
      if (t !== tokV || !d.open) return;
      const M = modelo(F, c => c, []), cy = dibujar(V, M, N.vista, null, null, F, true);
      cys.push(cy); cy.fit(undefined, 24); if (cy.zoom() > 1.1) { cy.zoom(1.1); cy.center(); }
      const k = N.items.findIndex(it => it.ruta === N.nuevo), el = k < 0 ? null : cy.getElementById(normRuta(N.items[k].ruta) === normRuta(N.principal) ? 'p' : 'n:nv' + k);
      if (el?.length) { el.addClass('c-nuevo'); setTimeout(() => { try { el.removeClass('c-nuevo'); } catch {} }, 1600); }
    }
    function pintar() {
      if (!f) {
        const auto = nombreAuto(), inN = $n('#nvN');
        if (!N.tocado) { N.nombre = auto; if (document.activeElement !== inN) inN.value = auto; }
        $n('#nvNs').textContent = N.tocado ? (auto && N.nombre !== auto ? '✎ nombre propio' : '') : auto ? '↺ sigue a la ★' : '';
      }
      pintarLista(); pintarVista();
      const n = N.items.filter(it => it.dir && !it.remota).length, acc = N.items.filter(it => it.archivo).length, rem = N.items.filter(it => it.remota).length;
      $n('#nvPie').textContent = N.items.length ? `Se pondrá un ancla oculta en ${n} carpeta(s)${acc ? ` · ${acc} acceso(s) a archivos` : ''}${rem ? ` · ${rem} etapa(s) remota(s)` : ''}. No se mueve ni copia ningún archivo.` : 'No se mueve ni copia ningún archivo: solo se crea la ficha y se pone un ancla oculta en cada carpeta.';
      $n('#nvOk').disabled = !N.items.length || (!f && !principalIt());
      if ($n('#nvOtro')) $n('#nvOtro').disabled = $n('#nvOk').disabled;
      setTimeout(() => { if (N.nuevo) { N.nuevo = ''; d.querySelectorAll('.onvflash').forEach(x => x.classList.remove('onvflash')); } }, 1600);
    }
    // ---- sugerencias por nombre (de lo que guardó el último recorrido de discos; al instante) ----
    let tS, tokS = 0;
    function sugerir() {
      clearTimeout(tS);
      tS = setTimeout(async () => {
        const nombre = f ? f.nombre : N.nombre.trim() || nombreAuto(), t = ++tokS, S = $n('#nvS');
        if (!nombre) { S.innerHTML = '<p class="ohint">Cuando haya nombre o ★, aquí salen las carpetas con nombre parecido de tus discos.</p>'; $n('#nvSi').textContent = ''; $n('#nvSt').hidden = true; return; }
        const excl = [...N.items.map(it => it.ruta), ...existentes().map(x => x.c.ruta)].filter(Boolean).join('|');
        let r; try { r = await api(`/api/org/sugerencias?nombre=${encodeURIComponent(nombre)}&excluir=${encodeURIComponent(excl)}`); } catch (e) { S.innerHTML = `<p class="owarn">⚠ ${esc(e.message)}</p>`; return; }
        if (t !== tokS || !d.open) return;
        const vistos = r.discos.filter(x => x.visto);
        $n('#nvSi').textContent = `parecidas a «${nombre}»` + (vistos.length ? ` · según el recorrido de ${vistos.map(x => `${x.letra} (${x.visto.slice(0, 10)})`).join(', ')}` : '');
        const lista = r.carpetas.filter(x => !yaEsta(x.ruta));
        $n('#nvSt').hidden = lista.filter(x => !x.proyectos.length).length < 2;
        S.innerHTML = (r.aviso ? `<p class="ohint">${esc(r.aviso)}${/Buscar en discos/.test(r.aviso) ? ' <button class="obtn" id="nvBd">🔍 Buscar en discos</button>' : ''}</p>` : '')
          + (lista.map((x, i) => `<div class="onvfila onvsug" data-s="${i}" title="${esc(x.ruta)}"><span class="onvst"></span>${x.tipo === 'entornos' ? icoE(x.etapa) : icoT(x.tipo)}<span class="onvr"><b>${esc(x.nombre)}</b>${x.git ? ' ⎇' : ''}<small class="onvpadre">${esc(padreDe(x.ruta))}</small></span>
              <small>${esc(x.tipo === 'entornos' ? 'Entornos · ' + (x.etapa || 'Pruebas') : TIPO[x.tipo][1])}?${x.fecha ? ' · modif. ' + esc(x.fecha.replace('T', ' ')) : ''}</small>
              ${x.proyectos.length ? `<span class="owarn" title="Ya es parte de otro proyecto">🔗 ${x.proyectos.map(p => esc(p.nombre)).join(', ')}</span><button class="obtn" data-sc>Compartir</button><button class="obtn" data-sm>Mover aquí</button>` : '<button class="obtn" data-sa>＋ Añadir</button>'}</div>`).join('')
          || (r.aviso ? '' : '<p class="ohint">No hay carpetas con nombre parecido en los discos recorridos.</p>'));
        S.querySelectorAll('[data-s]').forEach(el => {
          const x = lista[+el.dataset.s], add = accion => anadir(x.ruta, { tipo: x.tipo, accion });
          el.querySelector('[data-sa]')?.addEventListener('click', () => add());
          el.querySelector('[data-sc]')?.addEventListener('click', () => add('compartir'));
          el.querySelector('[data-sm]')?.addEventListener('click', () => add('mover'));
        });
        $n('#nvBd')?.addEventListener('click', () => { delete d.dataset.cambios; cerrarDlg(); buscarEnDiscos(); });
        $n('#nvSt').onclick = async () => { for (const x of lista.filter(x => !x.proyectos.length)) await anadir(x.ruta, { tipo: x.tipo, silencio: true }); };
      }, 250);
    }
    // ---- 📁 Examinar (explorador dentro de la ventana; el mismo /api/explorar de DeskLens) ----
    // 🔍 al escribir filtra la carpeta abierta (sin mayúsculas ni acentos); con «subcarpetas» y Enter busca en vivo debajo
    // (hasta 6 niveles, 200 resultados, 4 s; sin node_modules, .git ni carpetas de sistema). Aprobado 2026-11-22.
    const sinAc = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const claveN = t => sinAc(t).replace(/[^a-z0-9]/g, '');
    const resaltar = (n, q) => { // la parte que coincide, en <mark> (si coincide tal cual, sin contar acentos)
      const k = sinAc(q.trim()); if (!k || [...n].length !== n.length) return esc(n);
      const a = [...n].map(sinAc); if (a.some(c => c.length !== 1)) return esc(n);
      const i = a.join('').indexOf(k); return i < 0 ? esc(n) : `${esc(n.slice(0, i))}<mark>${esc(n.slice(i, i + k.length))}</mark>${esc(n.slice(i + k.length))}`;
    };
    async function explorar(modo, ruta) {
      const X = $n('#nvExp');
      if (modo === false) { X.hidden = true; N.exp = null; return; }
      const E = N.exp = { modo, marcadas: new Set(N.exp?.modo === modo ? N.exp.marcadas : []), q: '', res: null, buscando: false, tok: 0, sub: LS('desklens.org.nuevo.sub') === '1' };
      let ex;
      try { ex = await api('/api/explorar?ruta=' + encodeURIComponent(ruta ?? LS('desklens.org.nuevo.ruta') ?? '')); } catch (e) { try { ex = await api('/api/explorar?ruta='); } catch { return flash('⚠ ' + e.message); } }
      if (N.exp !== E) return;
      if (ex.ruta) LS('desklens.org.nuevo.ruta', ex.ruta);
      const items = ex.items.filter(i => i.dir || modo === 'archivo');
      const link = (ico, r, n) => `<a data-go="${esc(r)}" title="${esc(r)}">${ico} ${esc(n)}</a>`;
      const marc = modo === 'archivo' ? 'os' : 'as';
      X.hidden = false;
      X.innerHTML = `<div class="onvexp"><div class="onvexb"><button class="obtn" data-up ${ex.padre === null ? 'disabled' : ''} title="Subir">↑</button><span class="onvexr" title="${esc(ex.ruta || '')}">${esc(ex.ruta || 'Este equipo')}</span>
          <input type="search" class="onvexq" placeholder="🔍 Buscar… (Ctrl+F)" spellcheck="false" autocomplete="off" ${ex.ruta ? '' : 'disabled'} title="Al escribir filtra esta carpeta · ↓ baja a la lista · Esc borra">
          <label class="onvexsub" title="Con esto marcado, Enter busca también dentro de las subcarpetas (hasta 6 niveles)"><input type="checkbox" data-sub ${E.sub ? 'checked' : ''} ${ex.ruta ? '' : 'disabled'}> subcarpetas</label>
          <button class="ic" data-cerrar title="Cerrar el explorador">✕</button></div>
        <div class="onvexc"><div class="onvexs">${ex.lugares.map(x => link('🏠', x.ruta, x.nombre)).join('')}${ex.proyectos.length ? '<h6>Proyectos de DeskLens</h6>' + ex.proyectos.map(x => link('📁', x.ruta, x.nombre)).join('') : ''}<h6>Unidades</h6>${ex.unidades.map(u => link('💽', u, u)).join('')}</div>
          ${sep('exs', 'x', 'Ancho del lateral')}<div class="onvexl" title="${modo === 'archivo' ? 'Márcalos · doble clic en una carpeta: entrar' : 'Márcalas · clic en el nombre: entrar'} · ↑ ↓ moverse · Espacio marcar · Enter entrar"></div></div>
        ${sep('exh', 'y', 'Alto del explorador')}
        <div class="onvexf">${modo === 'dir' && ex.ruta ? `<button class="obtn" data-aqui title="${esc(ex.ruta)}">＋ Añadir «${esc(ex.ruta.split(/[\\/]/).filter(Boolean).pop() || ex.ruta)}»</button>` : ''}<span class="sp"></span>
          <button class="obtn primary" data-marc ${E.marcadas.size ? '' : 'disabled'}>＋ Añadir marcad${marc} (${E.marcadas.size})</button></div></div>`;
      X.querySelectorAll('[data-go]').forEach(a => a.onclick = () => explorar(modo, a.dataset.go));
      X.querySelector('[data-up]').onclick = () => explorar(modo, ex.padre ?? '');
      X.querySelector('[data-cerrar]').onclick = () => explorar(false);
      X.querySelector('[data-aqui]')?.addEventListener('click', () => anadir(ex.ruta).then(() => explorar(modo, ex.ruta)));
      const L = X.querySelector('.onvexl'), btnM = X.querySelector('[data-marc]'), inQ = X.querySelector('.onvexq'), ckS = X.querySelector('[data-sub]');
      const contar = () => { btnM.disabled = !E.marcadas.size; btnM.textContent = `＋ Añadir marcad${marc} (${E.marcadas.size})`; };
      const relPadre = r => { const t = r.slice(ex.ruta.replace(/[\\/]+$/, '').length).replace(/^[\\/]+/, ''); const k = t.search(/[\\/][^\\/]*$/); return k < 0 ? '' : t.slice(0, k) + '\\'; };
      const fila = (x, i, conRuta) => {
        const ya = yaEsta(x.ruta), marcable = ex.ruta && (modo === 'archivo' ? !x.dir : x.dir), rp = conRuta ? relPadre(x.ruta) : '';
        return `<div class="onvexi ${x.atenuada ? 'gris' : ''}" data-e="${i}" tabindex="-1"><input type="checkbox" tabindex="-1" ${!marcable || ya ? 'disabled' : ''} ${ya ? 'checked' : E.marcadas.has(x.ruta) ? 'checked' : ''}>
          <span class="onvexn" ${x.dir ? 'data-entra' : ''} title="${esc(x.ruta)}">${x.dir ? '📁' : fileIcon ? fileIcon(x.nombre) : '📄'} ${resaltar(x.nombre, E.q)}${rp ? `<small class="onvpadre"> ${esc(rp)}</small>` : ''}</span>${x.tipo?.length ? `<small>${esc(x.tipo.join(' · '))}</small>` : ''}${ya ? '<small>✓ en la lista</small>' : ''}</div>`;
      };
      const entrar = x => x.dir && explorar(modo, x.ruta), aqui = ex.ruta ? ex.ruta.split(/[\\/]/).filter(Boolean).pop() || ex.ruta : '';
      function lista() {
        const q = E.q.trim(), res = E.res;
        X.querySelector('.onvexp').toggleAttribute('data-esc', !!(q || res || E.buscando)); // Esc borra esto antes de cerrar la ventana
        if (E.buscando) {
          L.innerHTML = `<p class="onvexst">⟳ Buscando «${esc(q)}» en «${esc(aqui)}» y sus subcarpetas… <button class="obtn" data-det>✕ Detener</button></p>`;
          L.querySelector('[data-det]').onclick = () => { E.tok++; E.buscando = false; lista(); inQ.focus(); };
          return;
        }
        let vis, pie = '';
        if (res) { vis = res.resultados.filter(x => x.dir || modo === 'archivo'); pie = `${vis.length} encontrad${marc} en «${aqui}» y sus subcarpetas${res.motivo ? ' · ' + res.motivo : ''} · Esc: volver a la carpeta`; }
        else { const k = claveN(q); vis = k ? items.filter(x => claveN(x.nombre).includes(k)) : items; if (k) pie = `${vis.length} de ${items.length} en «${aqui}»${E.sub ? ' · Enter: buscar también en las subcarpetas' : ''} · Esc borra el filtro`; }
        E.vis = vis;
        L.innerHTML = vis.map((x, i) => fila(x, i, !!res)).join('')
          + (vis.length ? '' : `<p class="ohint">${q ? `Nada con ese nombre ${res ? 'en las subcarpetas' : 'aquí'}.${E.sub && !res ? ' Pulsa Enter para buscar en las subcarpetas.' : !E.sub ? ' Marca «subcarpetas» y pulsa Enter para buscar más abajo.' : ''}` : 'No hay nada aquí.'}</p>`)
          + (pie ? `<p class="onvexst">${esc(pie)}</p>` : '');
        L.querySelectorAll('[data-e]').forEach(el => {
          const x = vis[+el.dataset.e], cb = el.querySelector('input');
          cb.onchange = () => { cb.checked ? E.marcadas.add(x.ruta) : E.marcadas.delete(x.ruta); contar(); };
          const n = el.querySelector('[data-entra]');
          if (n) { if (modo === 'archivo') n.ondblclick = () => entrar(x); else n.onclick = () => entrar(x); }
          else el.querySelector('.onvexn').onclick = () => { if (!cb.disabled) { cb.checked = !cb.checked; cb.onchange(); } };
        });
      }
      async function buscarSub() {
        const t = ++E.tok; E.buscando = true; E.res = null; lista();
        let r; try { r = await api(`/api/org/buscar_carpetas?en=${encodeURIComponent(ex.ruta)}&q=${encodeURIComponent(E.q)}&archivos=${modo === 'archivo' ? 1 : 0}`); }
        catch (e) { r = { resultados: [], motivo: '⚠ ' + e.message }; }
        if (N.exp !== E || E.tok !== t) return; // detenida, u otra carpeta
        E.buscando = false; E.res = r; lista();
      }
      inQ.oninput = () => { E.q = inQ.value; E.res = null; if (E.buscando) { E.tok++; E.buscando = false; } lista(); };
      inQ.onkeydown = e => {
        if (e.key === 'Escape' && (E.res || E.buscando || inQ.value)) { e.preventDefault(); e.stopPropagation(); if (E.res || E.buscando) { E.tok++; E.buscando = false; E.res = null; } else { inQ.value = E.q = ''; } lista(); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (E.sub && inQ.value.trim()) buscarSub(); else L.querySelector('.onvexi')?.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); L.querySelector('.onvexi')?.focus(); }
      };
      ckS.onchange = () => { E.sub = ckS.checked; LS('desklens.org.nuevo.sub', E.sub ? '1' : '0'); if (E.sub && E.q.trim()) buscarSub(); else { E.res = null; lista(); } inQ.focus(); };
      L.onkeydown = e => { // ↑ ↓ entre filas (↑ en la primera: al buscador) · Espacio marca · Enter entra en la carpeta
        const rows = [...L.querySelectorAll('.onvexi')], i = rows.indexOf(e.target.closest?.('.onvexi'));
        if (i < 0) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const j = i + (e.key === 'ArrowDown' ? 1 : -1); j < 0 ? inQ.focus() : rows[Math.min(j, rows.length - 1)].focus(); }
        else if (e.key === ' ') { e.preventDefault(); const cb = rows[i].querySelector('input'); if (!cb.disabled) { cb.checked = !cb.checked; cb.onchange(); } }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); entrar(E.vis[i]); }
        else if (e.key === 'Escape' && (E.q || E.res)) { e.preventDefault(); e.stopPropagation(); inQ.focus(); inQ.onkeydown(e); }
      };
      lista();
      btnM.onclick = async () => { const rs = [...E.marcadas]; E.marcadas.clear(); for (const r of rs) await anadir(r, { archivo: modo === 'archivo', silencio: true }); explorar(modo, ex.ruta); };
    }
    // ---- la ruta escrita: autocompletar con las carpetas de su carpeta de arriba ----
    const inR = $n('#nvR'), cacheEx = new Map(); let tR;
    inR.oninput = () => { clearTimeout(tR); tR = setTimeout(async () => {
      const v = inR.value.trim().replace(/^"|"$/g, ''), k = v.lastIndexOf('\\'); if (k < 2) return;
      const padre = v.slice(0, k + 1);
      let ex = cacheEx.get(padre.toLowerCase());
      if (!ex) { try { ex = await api('/api/explorar?ruta=' + encodeURIComponent(padre)); cacheEx.set(padre.toLowerCase(), ex); } catch { return; } }
      $n('#nvRL').innerHTML = ex.items.filter(x => x.dir && x.ruta.toLowerCase().startsWith(v.toLowerCase())).slice(0, 40).map(x => `<option value="${esc(x.ruta)}">`).join('');
    }, 180); };
    inR.onkeydown = e => { if (e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); const v = inR.value; inR.value = ''; anadir(v); } };
    $n('#nvX').onclick = () => N.exp?.modo === 'dir' ? explorar(false) : explorar('dir');
    $n('#nvA').onclick = () => N.exp?.modo === 'archivo' ? explorar(false) : explorar('archivo');
    $n('#nvRem').onclick = async () => {
      const nombre = await ask('Etapa remota', 'Nombre (p. ej. «VPS producción»):', ['Siguiente', 'Cancelar'], { input: '' }); if (!nombre?.trim()) return;
      const url = await ask('Etapa remota', 'Dirección: https://… o ssh usuario@servidor (opcional):', ['Añadir', 'Cancelar'], { input: '' }); if (url === null) return;
      const it = { ruta: 'remota:' + nombre.trim(), nombre: nombre.trim(), remota: { nombre: nombre.trim(), url: url.trim() }, tipo: 'entornos', etapa: 'Producción', info: {}, accion: 'compartir' };
      N.items.push(it); N.nuevo = it.ruta; marcarCambios(); pintar();
    };
    if (!f) {
      $n('#nvN').oninput = e => { N.nombre = e.target.value; N.tocado = !!N.nombre.trim() && N.nombre.trim() !== nombreAuto(); if (!N.nombre.trim()) N.tocado = false; pintar(); sugerir(); };
      $n('#nvE').onchange = e => { N.estado = e.target.value; };
    }
    d.querySelectorAll('[data-nv]').forEach(b => b.onclick = () => { N.vista = b.dataset.nv; LS('desklens.org.nuevo.vista', N.vista); pintarVista(); });
    d.onkeydown = e => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); if (!$n('#nvOk').disabled) enviar(false); }
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); e.stopPropagation(); explorar('dir'); }
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); e.stopPropagation(); (N.exp ? Promise.resolve() : explorar('dir')).then(() => { const q = $n('.onvexq'); q?.focus(); q?.select(); }); }
    };
    // ---- crear o añadir ----
    async function enviar(seguir) {
      const ok = $n('#nvOk'); ok.disabled = true;
      const movidas = {};
      for (const it of N.items) { const otros = (it.info?.proyectos || []).filter(x => !f || x.id !== f.id).map(x => x.id); if (it.accion === 'mover' && otros.length) movidas[it.ruta] = otros; }
      const carpeta = it => it.remota ? { remota: it.remota, etapa: it.etapa } : it.archivo ? { archivo: { ruta: it.ruta } } : { ruta: it.ruta, ...(it.tipo === 'entornos' ? { etapa: it.etapa } : {}) };
      try {
        let r;
        if (f) r = await api('/api/org/ficha/anadir', { id: f.id, carpetas: N.items.map(it => ({ ...carpeta(it), tipo: it.tipo })), principal_ruta: N.principal || '', carpetas_movidas: movidas });
        else {
          const partes = [];
          for (const it of N.items) { const p = partes.find(x => x.tipo === it.tipo) || (partes.push({ nombre: TIPO[it.tipo][1], tipo: it.tipo, carpetas: [] }), partes.at(-1)); p.carpetas.push(carpeta(it)); }
          for (const p of partes) if (p.tipo === 'entornos') p.carpetas.sort((a, b) => (ORD_ETAPA[a.etapa] ?? 9) - (ORD_ETAPA[b.etapa] ?? 9));
          r = await api('/api/org/ficha/crear', { nombre: N.nombre.trim() || nombreAuto(), estado: N.estado, partes, principal_ruta: N.principal, carpetas_movidas: movidas });
        }
        r.avisos?.forEach(a => flash('⚠ ' + a));
        flash(f ? `✓ ${N.items.length} añadida(s) a «${f.nombre}» (nada se movió en el disco)` : `✓ Proyecto «${r.ficha.nombre}» creado (nada se movió en el disco)`);
        delete d.dataset.cambios; d.close();
        await cargar();
        if (f) return;
        if (seguir) return nuevoProyecto();
        const nueva = O.st.fichas.find(x => x.id === r.ficha.id); if (nueva) adminAbrir(nueva);
      } catch (e) { ok.disabled = false; err(e); }
    }
    $n('#nvOk').onclick = () => enviar(false);
    $n('#nvOtro')?.addEventListener('click', () => enviar(true));
    $n('#nvCan').onclick = () => cerrarDlg();
    pintar(); sugerir();
    setTimeout(() => (f ? inR : $n('#nvR')).focus(), 30);
    return d;
  }

  async function convertir() {
    const n = O.st.sin_convertir.length;
    if (await ask('Convertir en fichas', `Cada uno de los ${n} proyecto(s) de DeskLens pasa a una ficha con su carpeta como parte 💻 Código, y se le pone su ancla (.desklens-ancla). La barra lateral sigue igual.`, ['Convertir', 'Cancelar']) !== 'Convertir') return;
    try { const r = await api('/api/org/convertir', { rutas: O.st.sin_convertir }); r.avisos.forEach(a => flash('⚠ ' + a)); flash(`✓ ${r.fichas.length} ficha(s) creada(s)`); await cargar(); }
    catch (e) { err(e); }
  }

  // ---------- diálogos ----------
  function abrirDlg(titulo, html, { ancho, pie = '' } = {}) {
    dlg.style.width = ancho ? `min(${ancho}px, calc(100vw - 32px))` : ''; dlg.style.height = ''; // el alto que dejó ＋ Nuevo proyecto
    dlg.innerHTML = `<header><b>${titulo}</b><button class="ic" title="Cerrar">✕</button></header><div class="odb">${html}</div>${pie ? `<footer>${pie}</footer>` : ''}`;
    dlg.querySelector('header button').onclick = () => cerrarDlg();
    dlg.onclose = () => pararPoll();
    delete dlg.dataset.cambios; delete dlg.dataset.tipo; dlg.onkeydown = null; // lo que dejó otra ventana (p. ej. ⇆ Comparar)
    dlg.oninput = () => { dlg.dataset.cambios = '1'; }; // algo escrito sin guardar: solo entonces se pregunta al cerrar
    if (!dlg.open) dlg.show(); // sin bloquear la pantalla (no showModal): un clic fuera la cierra
    return dlg;
  }
  // Cerrar la ventana del organizador. Solo bloquea si hay una necesidad: cambios escritos sin guardar.
  let preguntando = false;
  async function cerrarDlg() {
    if (!dlg.open || preguntando) return;
    if (dlg.dataset.cambios) {
      preguntando = true;
      const r = await ask('Cambios sin guardar', 'Escribiste cambios que no se han guardado.', ['Descartar', 'Seguir editando'], { danger: true });
      preguntando = false;
      if (r !== 'Descartar') return void dlg.querySelector('textarea, input, select')?.focus(); // se sigue editando: el foco vuelve a la ventana (así Esc vuelve a funcionar)
    }
    dlg.close();
  }
  // clic fuera de la ventana (y fuera de un menú o de una pregunta abiertos encima): se cierra
  document.addEventListener('pointerdown', e => {
    if (dlg.open && !dlg.contains(e.target) && !e.target.closest('#ask, #menu')) cerrarDlg();
  }, true);
  addEventListener('keydown', e => { // Esc la cierra (sin showModal el navegador no lo hace solo)
    if (e.key === 'Escape' && dlg.open && !$('#ask')?.open && !$('#menu') && !e.target.closest?.('[data-esc]')) { e.preventDefault(); e.stopPropagation(); cerrarDlg(); } // [data-esc]: ese bloque usa Esc (p. ej. borrar el 🔍)
  }, true);
  // formulario de la ficha: lo usan la ventana «Ficha» (⋯ del tablero) y la pestaña Ficha de la vista del proyecto
  function fichaCampos(f) {
    const partes = f.partes.map(p => `<div>${TIPO[p.tipo][0]} <b>${esc(p.nombre)}</b> ${p.carpetas.map(c => `<div class="osmall" style="margin-left:22px">${esc(c.icono || '📁')} ${esc(c.ruta)} ${c.estado === 'ok' ? '' : c.estado === 'movida' ? '↷ movida' : `<span class="owarn">${BORRADA[c.estado] ? `🗑 ${BORRADA[c.estado]}${c.eliminada ? ' · ' + hace(c.eliminada) : ''}` : c.estado === 'desconectado' ? '⚠ disco no conectado' : '⚠ no encontrada'}</span>`}${c.proyectos.length > 1 ? ` · 🔗 ${c.proyectos.length} proyectos` : ''}</div>`).join('')}</div>`).join('');
    return `<div class="oform">
      <label>Nombre</label><input id="fN" value="${esc(f.nombre)}">
      <label>Estado</label><select id="fE">${Object.entries(ESTADO).map(([k, v]) => `<option value="${k}" ${f.estado === k ? 'selected' : ''}>${v.join(' ')}</option>`).join('')}</select>
      <label>Avance</label><span><input id="fA" type="range" min="0" max="100" value="${f.avance}" style="width:200px;vertical-align:middle"> <b id="fAv">${f.avance}%</b></span>
      <label>Descripción</label><textarea id="fD">${esc(f.descripcion || '')}</textarea>
      <label>Tecnología</label><input id="fT" value="${esc((f.tecnologia || []).join(', '))}" placeholder="Laravel, PostgreSQL">
      <label>Color</label><input id="fC" type="color" value="${esc(f.color || '#7c5cdb')}" style="width:60px;padding:2px">
      <label>Enlaces</label><textarea id="fL" placeholder="Local | http://localhost/proyecto">${esc((f.enlaces || []).map(e => `${e.nombre} | ${e.url}`).join('\n'))}</textarea>
      <label>Nota del vault</label><input id="fV" value="${esc(f.nota || '')}" placeholder="01 Tecnología/Proyectos/${esc(f.nombre)}">
      <label>Historial</label><span>Guardar por <input id="fHd" type="number" min="1" max="365" value="${f.historial?.dias ?? 7}" style="width:64px"> días · cuota <input id="fHm" type="number" min="0" max="100000" value="${f.historial?.mb ?? 200}" style="width:80px"> MB <small>(0 = sin versiones)</small></span>
      <div class="oancho"><h4 style="margin:10px 0 4px">Partes</h4>${partes || '<small>Sin partes</small>'}</div></div>`;
  }
  function fichaDatos(d) {
    const v = id => d.querySelector(id).value;
    const enlaces = v('#fL').split('\n').map(l => l.split('|').map(s => s.trim())).filter(x => x[0] || x[1]).map(([nombre, url]) => url ? { nombre, url } : { nombre: 'Enlace', url: nombre });
    return { nombre: v('#fN'), estado: v('#fE'), avance: +v('#fA'), descripcion: v('#fD'), color: v('#fC'), nota: v('#fV'),
      tecnologia: v('#fT').split(',').map(s => s.trim()).filter(Boolean), enlaces, historial: { dias: +v('#fHd'), mb: +v('#fHm') } };
  }
  function fichaDlg(f) {
    const d = abrirDlg(`📋 Ficha · ${esc(f.nombre)}`, fichaCampos(f),
      { pie: `<button class="obtn" id="fJer">🧩 Editar jerarquía…</button><span class="sp"></span><button class="obtn" id="fX">Cancelar</button><button class="obtn primary" id="fOk">Guardar</button>` });
    d.querySelector('#fA').oninput = e => d.querySelector('#fAv').textContent = e.target.value + '%';
    d.querySelector('#fX').onclick = () => dlg.close();
    d.querySelector('#fJer').onclick = () => { dlg.close(); editarFicha(f); };
    d.querySelector('#fOk').onclick = async () => { if (await guardar(f.id, fichaDatos(d))) dlg.close(); };
  }
  async function discosDlg() {
    let ds;
    try { ds = (await api('/api/org/discos')).discos; } catch (e) { return err(e); }
    const fila = d => `<tr data-s="${d.serie}"><td><input type="checkbox" ${d.activo ? 'checked' : ''} ${d.conectado ? '' : 'disabled'}></td>
      <td><b>${esc(d.letra)}</b> ${esc(d.nombre || '')}<br><small>serie ${d.serie}</small></td>
      <td>${d.conectado ? `${fmtGB(d.total)} <small>(${fmtGB(d.libre)} libres)</small>` : '<span class="owarn">no conectado</span>'}</td>
      <td>${d.ultimo_s != null ? `${fmtS(d.ultimo_s)} <small>· ${d.carpetas} carpetas</small>` : '<small>sin medir</small>'}</td>
      <td><button class="obtn" data-ex>🚫 ${d.predeterminadas.length + d.propias.length}</button></td></tr>`;
    const d = abrirDlg('💽 Discos para anclas', `<p class="ohint">En los discos marcados se buscan las anclas (.desklens-ancla) cuando una carpeta no está donde estaba. Solo se recorren nombres de carpetas: no se indexa ni se abre nada. Quitar un disco no borra anclas ni fichas. Cada disco se reconoce por su número de serie, no por la letra.</p>
      <table><thead><tr><th>☑</th><th>Disco</th><th>Tamaño</th><th>Último recorrido</th><th>Excluidas</th></tr></thead><tbody>${ds.map(fila).join('')}</tbody></table>`, { ancho: 760 });
    d.querySelectorAll('tr[data-s]').forEach(tr => {
      const s = tr.dataset.s, disco = ds.find(x => x.serie === s);
      tr.querySelector('input').onchange = async e => { try { await api('/api/org/disco', { serie: s, activo: e.target.checked }); O.st && (O.st.discos_activos += e.target.checked ? 1 : -1); } catch (x) { err(x); } };
      tr.querySelector('[data-ex]').onclick = () => excluidasDlg(disco);
    });
  }
  function excluidasDlg(disco) {
    const r = disco.letra || '';
    const pinta = () => {
      const d = abrirDlg(`🚫 Excluidas en ${esc(r)} ${esc(disco.nombre || '')} <small>· serie ${disco.serie}</small>`, `<p class="ohint">Carpetas que no se recorren al buscar anclas (rutas dentro del disco; <code>*</code> = cualquier nombre, p. ej. <code>Users\\*\\AppData</code>). Se guarda en historial/organizador/discos.json. Siempre se saltan además .git, node_modules, __pycache__ y vendor.</p>
        <h4>Predeterminadas</h4><ul class="oexl">${disco.predeterminadas.map(x => `<li>🔒<span>${esc(r + x)}</span><button class="obtn" data-q="${esc(x)}">quitar</button></li>`).join('') || '<li><small>Ninguna</small></li>'}</ul>
        <h4>Tuyas</h4><ul class="oexl">${disco.propias.map(x => `<li>📁<span>${esc(r + x)}</span><button class="obtn" data-p="${esc(x)}">quitar</button></li>`).join('') || '<li><small>Ninguna</small></li>'}</ul>
        <div style="display:flex;gap:8px"><input id="exN" placeholder="${esc(r)}carpeta\\que\\saltar" style="flex:1;font:inherit;padding:5px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)"><button class="obtn" id="exA">+ Añadir</button></div>`,
      { ancho: 680, pie: `<button class="obtn" id="exR">Restaurar predeterminadas</button><span class="sp"></span><button class="obtn" id="exV">← Discos</button>` });
      const guarda = async cambios => { try { const x = (await api('/api/org/disco', { serie: disco.serie, ...cambios })).disco; Object.assign(disco, x); pinta(); } catch (e) { err(e); } };
      const quitadas = () => (disco.quitadas ||= []); // las ya quitadas (guardadas) + las de ahora
      d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { quitadas().push(b.dataset.q); guarda({ quitadas: quitadas() }); });
      d.querySelectorAll('[data-p]').forEach(b => b.onclick = () => guarda({ propias: disco.propias.filter(x => x !== b.dataset.p) }));
      d.querySelector('#exA').onclick = () => { let v = d.querySelector('#exN').value.trim(); if (!v) return; if (r && v.toLowerCase().startsWith(r.toLowerCase())) v = v.slice(r.length); guarda({ propias: [...disco.propias, v] }); };
      d.querySelector('#exR').onclick = () => { disco.quitadas = []; guarda({ restaurar: true }); };
      d.querySelector('#exV').onclick = discosDlg;
    };
    pinta();
  }
  async function alertasDlg() {
    let al;
    try { al = (await api('/api/org/alertas')).alertas; } catch (e) { return err(e); }
    const estado = a => BORRADA[a.estado] ? `<span class="owarn">🗑 ${BORRADA[a.estado]}${a.eliminada ? ' · ' + hace(a.eliminada) : ''}</span>`
      : a.estado === 'desconectado' ? '<span class="owarn">disco no conectado</span>' : 'no está en su sitio';
    const acciones = a => BORRADA[a.estado] ? `${a.estado === 'papelera' ? '<button class="obtn" data-pap>Abrir la papelera</button> ' : ''}<button class="obtn" data-q="${a.id}" data-f="${a.proyecto_id}">Quitar del proyecto</button>`
      : `<button class="obtn" data-b="${a.id}" ${a.estado === 'desconectado' ? 'disabled title="Conecta el disco"' : ''}>Buscar</button>`;
    const buscables = al.filter(a => a.estado === 'falta');
    const d = abrirDlg(`⚠ No encontradas (${al.length})`, (al.length ? `<table><thead><tr><th>Proyecto</th><th>Parte</th><th>Última ruta</th><th>Estado</th><th>Vista</th><th></th></tr></thead><tbody>${al.map(a => `<tr>
      <td>${esc(a.proyecto)}</td><td>${icoT(a.tipo)} ${esc(a.parte)}</td><td>${esc(a.ruta)}</td><td>${estado(a)}</td><td>${hace(a.visto)}</td>
      <td style="white-space:nowrap">${acciones(a)}</td></tr>`).join('')}</tbody></table>` : '<p>✓ Todas las anclas están en su sitio.</p>')
      + '<div id="oProg"></div>', { ancho: 980, pie: buscables.length ? '<button class="obtn primary" id="alT">Buscar todas en todos los discos</button>' : '' });
    d.querySelectorAll('[data-pap]').forEach(b => b.onclick = () => api('/api/org/papelera', {}).catch(err));
    d.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
      try { await api('/api/org/ficha/quitar_carpeta', { id: b.dataset.f, ancla: b.dataset.q }); await cargar(); alertasDlg(); } catch (e) { err(e); }
    });
    const buscar = async ids => {
      try { await api('/api/org/recorrido/iniciar', { modo: 'anclas', buscar: ids }); vigilar(d.querySelector('#oProg'), alertasDlg); }
      catch (e) { err(e); }
    };
    d.querySelectorAll('[data-b]').forEach(b => b.onclick = () => buscar([b.dataset.b]));
    d.querySelector('#alT')?.addEventListener('click', () => buscar(buscables.map(a => a.id)));
    if (O.st?.recorrido?.activo) vigilar(d.querySelector('#oProg'), alertasDlg);
  }
  // Progreso del recorrido en vivo (barra por disco, carpetas, tiempo y lo que falta); al terminar llama a `fin`
  function progresoHTML(r) {
    const fila = d => {
      const pct = d.estado === 'listo' ? 100 : d.antes ? Math.min(99, Math.round(100 * d.carpetas / d.antes)) : null;
      const falta = d.estado === 'recorriendo' && d.estimado && pct ? ` · faltan ~${fmtS(Math.max(0, Math.round(d.estimado - d.segundos)))}` : '';
      const txt = { espera: 'en espera', desconectado: '✗ no conectado', omitido: 'no hizo falta', detenido: 'detenido', listo: `listo · ${fmtS(d.segundos)}`,
        recorriendo: `${pct != null ? pct + ' % · ' : ''}${fmtS(d.segundos)}${falta} · ${d.carpetas.toLocaleString('es')} carpetas` }[d.estado];
      return `<b>${esc(d.letra)}</b><span class="obarp"><i style="width:${pct ?? (d.estado === 'recorriendo' ? 50 : 0)}%"></i></span><span>${d.estado === 'listo' ? '✓' : d.estado === 'recorriendo' ? '⟳' : ''}</span><span class="osmall">${txt}</span>`;
    };
    const enc = Object.entries(r.encontradas || {});
    return `<h4 style="margin:14px 0 6px">${r.activo ? `⟳ Recorriendo… (${fmtS(r.segundos)})` : r.detenido ? '■ Detenido' : '✓ Recorrido terminado'}
      ${r.activo ? '<button class="obtn" id="oStop" style="float:right">■ Detener</button>' : ''}</h4>
      <div class="oprog">${r.discos.map(fila).join('')}</div>
      ${r.modo === 'anclas' && enc.length ? `<p>✓ ${enc.length} encontrada(s): ${enc.map(([, ruta]) => esc(ruta)).join(' · ')}</p>` : ''}
      ${Object.keys(r.copias || {}).length ? `<p class="owarn">⚠ Hay carpetas con la misma ancla (una copia): ${Object.values(r.copias).map(l => l.map(esc).join(' = ')).join(' · ')}</p>` : ''}
      <p class="ohint">Puedes cerrar esto y seguir usando DeskLens: el recorrido sigue en segundo plano (📋 Actividad).</p>`;
  }
  function pararPoll() { clearInterval(O.poll); O.poll = null; }
  function vigilar(box, fin) {
    pararPoll();
    const tick = async () => {
      let r; try { r = (await api('/api/org/recorrido')).recorrido; } catch { return pararPoll(); }
      if (!r || !box.isConnected) return pararPoll();
      box.innerHTML = progresoHTML(r);
      box.querySelector('#oStop')?.addEventListener('click', () => api('/api/org/recorrido/detener', {}));
      if (!r.activo) { pararPoll(); if (O.st) O.st.recorrido = r; await cargar(); fin?.(r); }
    };
    tick(); O.poll = setInterval(tick, 700);
  }
  async function actividadDlg() {
    let a;
    try { a = await api('/api/org/actividad'); } catch (e) { return err(e); }
    const ico = { ok: '✓', aviso: '⚠', error: '✗' };
    const d = abrirDlg('📋 Actividad del organizador', `<p class="ohint">Todo lo que hace el organizador: qué, dónde y cuándo (últimos 30 días, en historial/organizador/actividad.log).</p>
      <table><tbody>${a.en_curso.map(x => `<tr><td>⟳</td><td>ahora</td><td>${esc(x.texto)}</td><td><small>${esc(x.ruta)}</small></td></tr>`).join('')}
      ${a.lineas.map(x => `<tr><td class="${x.estado === 'ok' ? '' : 'owarn'}">${ico[x.estado] || '·'}</td><td style="white-space:nowrap">${hace(x.t)}</td><td>${esc(x.texto)}</td>
        <td>${x.ruta ? `<a href="#" data-r="${esc(x.ruta)}" title="Mostrar en el Explorador"><small>${esc(x.ruta)}</small></a>` : ''}</td></tr>`).join('') || '<tr><td>Sin actividad todavía.</td></tr>'}</tbody></table>`,
    { ancho: 900, pie: '<button class="obtn" id="acL">Limpiar</button><span class="sp"></span><button class="obtn" id="acR">↻ Actualizar</button>' });
    d.querySelectorAll('[data-r]').forEach(l => l.onclick = e => { e.preventDefault(); api('/api/mostrar', { ruta: l.dataset.r }).catch(() => flash('Esa ruta no se puede mostrar desde DeskLens')); });
    d.querySelector('#acR').onclick = actividadDlg;
    d.querySelector('#acL').onclick = async () => { if (await ask('Limpiar actividad', 'Se borra el registro de actividad del organizador.', ['Limpiar', 'Cancelar'], { danger: true }) === 'Limpiar') { await api('/api/org/actividad/limpiar', {}); actividadDlg(); } };
  }
  // ⚙ Ajustes › 🗂 Proyectos: el apartado del organizador dentro de los Ajustes de DeskLens (index.html llama a
  // orgAjustes.nav/seccion/enlazar/guardar si existe). Cada opción dice qué hace y dónde escribe; nada a escondidas.
  const AJ_G = '🗂 Proyectos';
  async function ajustesDlg() { // el ⚙ del tablero abre Ajustes justo en este apartado
    await settingsDialog();
    $('#dlg')?.querySelector(`section[data-g="${AJ_G}"]`)?.scrollIntoView({ block: 'start' });
  }
  const fila = (t, etiqueta, html) => `<div class="orow krow" data-t="${esc(plainTxt(t + ' proyectos organizador'))}"><label>${etiqueta}</label><div>${html}</div></div>`;
  window.orgAjustes = {
    nav: () => `<a data-g="${AJ_G}">${AJ_G}<span></span></a>`,
    seccion: () => `<section data-g="${AJ_G}" class="oajustes"><h4>${AJ_G}</h4>${fila('cargando', 'Organizador', '<small>Cargando…</small>')}</section>`,
    async enlazar(d) {
      const S = d.querySelector(`section[data-g="${AJ_G}"]`); if (!S) return;
      let a; try { a = await api('/api/org/ajustes'); } catch (e) { S.querySelector('small').textContent = '⚠ ' + e.message; return; }
      const modos = [['todo', 'Todo el contenido'], ['nombres_pdf', 'Nombres + texto de PDF y Word'], ['nombres', 'Solo nombres'], ['no', 'No se indexa']];
      const r = a.respaldo, act = a.discos.filter(x => x.activo).length, mapa = a.mapa_ruta.replace(/\\/g, '/');
      const b = (id, t) => `<button type="button" class="obtn" id="${id}">${t}</button>`;
      S.innerHTML = `<h4>${AJ_G}</h4>
        ${fila('encendido tablero', 'Organizador', `<label><input type="checkbox" id="og_en" ${a.encendido ? 'checked' : ''}> encendido</label><small>Icono 🗂 en la cinta · Ctrl+Shift+O</small>`)}
        ${fila('discos anclas exclusiones', 'Discos', `${act} disco(s) para buscar anclas ${b('og_di', '💽 Abrir')}<small>Solo se recorren nombres de carpetas; cada disco con sus 🚫 exclusiones (discos.json).</small>`)}
        ${fila('indice tipo parte material codigo web', 'Índice por tipo', Object.keys(TIPO).map(t => `<div class="oline"><span>${icoT(t)} ${TIPO[t][1]}</span>${t === 'respaldos' || t === 'base_datos' ? '<small>No se indexan (solo se ven)</small>'
          : `<select data-ot="${t}">${modos.filter(m => m[0] !== 'no' || t === 'otro').map(([v, n]) => `<option value="${v}" ${a.indice[t] === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</div>`).join('') + '<small>Se aplica al guardar: el índice de DeskLens vuelve a leer esas carpetas.</small>')}
        ${fila('anclas git web exclude', 'Anclas', `<label><input type="checkbox" id="og_git" ${a.ignorar_git ? 'checked' : ''}> Ignorar en git (.git/info/exclude, solo este PC)</label>
          <label><input type="checkbox" id="og_web" ${a.avisar_web ? 'checked' : ''}> Avisar al anclar una carpeta web (htdocs, www…)</label>`)}
        ${fila('historial versiones cuota dias mb', 'Historial', `Por defecto: <input type="number" id="og_hd" min="1" max="365" value="${a.historial_dias}"> días · <input type="number" id="og_hm" min="0" max="100000" value="${a.historial_mb}"> MB por proyecto<small>Cada proyecto lo cambia en su ficha.</small>`)}
        ${fila('respaldo copia diaria disco', 'Respaldo diario', `<select id="og_rd"><option value="">— sin respaldo —</option>${a.discos.filter(x => x.conectado || x.serie === r.disco).map(x => `<option value="${x.serie}" ${r.disco === x.serie ? 'selected' : ''}>${esc(x.letra)} ${esc(x.nombre || '')}${x.conectado ? '' : ' (no conectado)'}</option>`).join('')}</select>
          · guardar <input type="number" id="og_rn" min="1" max="365" value="${r.guardar}"> copias ${b('og_ra', 'Copiar ahora')} ${r.ruta ? b('og_rc', 'Abrir carpeta') : ''}
          <small>${r.ultimo ? `Última: ${esc(r.ultimo.replace('T', ' '))} ✓ → ${esc(r.ruta)}. ` : 'Todavía no hay respaldo. '}Copia fichas, anclas, discos, ajustes y actividad en &lt;disco&gt;\\DeskLens-respaldo\\organizador\\&lt;fecha&gt;, una vez al día.</small>`)}
        ${fila('mapa ia claude anclas', 'Mapa para IA', `<label><input type="checkbox" id="og_mp" ${a.mapa ? 'checked' : ''}> Mantener MAPA.md al día</label> ${b('og_mv', 'Ver mapa')} ${b('og_mc', 'Copiar texto para CLAUDE.md')}
          <small>${esc(a.mapa_ruta)}${a.mapa_fecha ? ' · actualizado ' + hace(a.mapa_fecha) : ''}. Con ese texto en tu CLAUDE.md, «lee mi DeskLens» o «mis anclas» basta para que la IA sepa dónde está cada parte.</small>`)}
        ${fila('datos carpeta fichas', 'Datos', `<code>${esc(a.datos)}</code> · ${a.n_fichas} ficha(s) · ${a.n_anclas} ancla(s) ${b('og_dc', 'Abrir carpeta')}`)}
        ${fila('quitados recuperar papelera fichas', 'Quitados', `${a.n_quitados} proyecto(s) quitado(s) del tablero ${b('og_qu', '↶ Ver quitados')}<small>Se recuperan con sus anclas; solo «Vaciar quitados» borra las copias.</small>`)}
        ${fila('actividad registro', 'Actividad', `Todo lo que hace el organizador, dónde y cuándo ${b('og_ac', '📋 Ver actividad')}`)}`;
      const salir = async fn => { d.close(); if (!on()) await abrir(); fn(); }; // de Ajustes (modal) a una ventana del organizador
      S.querySelector('#og_di').onclick = () => salir(discosDlg);
      S.querySelector('#og_ac').onclick = () => salir(actividadDlg);
      S.querySelector('#og_qu').onclick = () => salir(quitadosDlg);
      S.querySelector('#og_ra').onclick = async () => {
        try { await guardarAj(d); const x = await api('/api/org/respaldo/ahora', {}); flash(`✓ Respaldo en ${x.ruta}`); window.orgAjustes.enlazar(d); }
        catch (e) { ask('Respaldo', e.message, ['Entendido']); }
      };
      S.querySelector('#og_rc')?.addEventListener('click', () => api('/api/org/abrir_datos', { cual: 'respaldo' }).catch(err));
      S.querySelector('#og_dc').onclick = () => api('/api/org/abrir_datos', {}).catch(err);
      S.querySelector('#og_mv').onclick = async () => { try { const x = await api('/api/org/mapa', {}); d.close(); cerrar(); openTab(x.ruta || a.mapa_ruta, true); } catch (e) { err(e); } };
      S.querySelector('#og_mc').onclick = () => copyText(`## DeskLens (mis proyectos y anclas)\nMapa: ${mapa}\nCuando diga «lee mi DeskLens» o «mis anclas», lee el mapa y usa las rutas actuales.\n`, '✓ Copiado: pégalo en tu CLAUDE.md');
      d.dispatchEvent(new Event('input')); // que Ajustes vuelva a contar las filas de este apartado
    },
    guardar: d => guardarAj(d),
  };
  async function guardarAj(d) {
    const S = d.querySelector(`section[data-g="${AJ_G}"]`); if (!S || !S.querySelector('#og_en')) return;
    const v = id => S.querySelector('#' + id), indice = {};
    S.querySelectorAll('[data-ot]').forEach(x => indice[x.dataset.ot] = x.value);
    await api('/api/org/ajustes', { encendido: v('og_en').checked, ignorar_git: v('og_git').checked, avisar_web: v('og_web').checked, indice,
      historial_dias: +v('og_hd').value, historial_mb: +v('og_hm').value, respaldo_disco: v('og_rd').value, respaldo_guardar: +v('og_rn').value, mapa: v('og_mp').checked });
    btn.hidden = !v('og_en').checked; // apagado: sin icono en la cinta
    if (on()) cargar();
  }

  // ---------- flujo de arranque: discos → recorrido → relaciones (✓/✗) → fichas ----------
  async function arranque() {
    const pasos = n => `<div class="osteps">${['1 Discos', '2 Recorrido', '3 Relaciones', '4 Fichas'].map((t, i) => i + 1 === n ? `<b>${t}</b>` : t).join(' › ')}</div>`;
    const atras = O.st?.fichas.length ? '<button class="obtn" id="oVolver">← Tablero</button>' : '';
    const cab = `<div class="obar"><h2>🗂 Proyectos · Buscar en discos</h2><span class="sp"></span>${atras}<button class="obtn" id="oNv2" title="＋ Nuevo proyecto a mano (Ctrl+N)">＋ Nuevo proyecto</button>${O.st?.quitados ? `<button class="obtn" id="oQu2" title="Recuperar proyectos quitados">↶ Quitados (${O.st.quitados})</button>` : ''}<button class="obtn" id="oAc2">📋</button></div>`;
    const enlazar = () => { root.querySelector('#oVolver')?.addEventListener('click', () => { O.pantalla = 'tablero'; pintar(); }); root.querySelector('#oAc2').onclick = actividadDlg;
      root.querySelector('#oNv2').onclick = () => nuevoProyecto(); root.querySelector('#oQu2')?.addEventListener('click', quitadosDlg); };
    if (O.props) return relacionesPintar(cab, pasos(3), enlazar);
    if (O.st?.recorrido?.activo) {
      root.innerHTML = cab + `<div class="obody">${pasos(2)}<div id="oProg"></div></div>`; enlazar();
      return vigilar(root.querySelector('#oProg'), r => r.modo === 'arranque' && !r.detenido ? cargarRelaciones() : arranque());
    }
    let ds;
    try { ds = (await api('/api/org/discos')).discos.filter(d => d.conectado); } catch (e) { return err(e); }
    const vacio = !O.st?.fichas.length;
    root.innerHTML = cab + `<div class="obody">${pasos(1)}
      ${vacio ? '<div class="oempty" style="margin:10px auto 20px"><h3>Aún no hay proyectos en el organizador</h3>Marca los discos donde trabajas. DeskLens recorre <b>solo los nombres de las carpetas</b> (sin leer archivos ni indexar), propone qué carpetas forman cada proyecto y tú confirmas.</div>' : '<p class="ohint">Marca los discos donde buscar proyectos. Solo se recorren nombres de carpetas: no se lee ni se indexa nada.</p>'}
      ${O.st?.sin_convertir?.length ? `<div class="obanner">Tienes <b>${O.st.sin_convertir.length}</b> proyecto(s) en DeskLens: también se tendrán en cuenta como semillas.<span class="sp"></span><button class="obtn" id="oConv2">Solo convertirlos en fichas</button></div>` : ''}
      <div class="odisks">${ds.map(d => `<label class="odisk"><input type="checkbox" data-s="${d.serie}" ${d.activo ? 'checked' : ''}>
        <span><span class="oname">${esc(d.letra)} ${esc(d.nombre || '')}</span><br><small>${fmtGB(d.total - d.libre)} usados de ${fmtGB(d.total)}</small></span>
        <small>${d.ultimo_s != null ? '≈ ' + fmtS(d.ultimo_s) : d.predeterminadas.includes('Windows') ? 'sistema: varios min' : ''}</small>
        <span class="obarp" style="grid-column:1/-1"><i style="width:${d.total ? Math.round(100 * (d.total - d.libre) / d.total) : 0}%"></i></span></label>`).join('')}</div>
      <p class="ohint">Se saltan las carpetas de sistema y de herramientas (Windows, Program Files, AppData, node_modules…). Ajustables en 💽 › 🚫 de cada disco.</p>
      <div class="ofoot"><span id="oSel"></span><span class="sp"></span><button class="obtn" id="oExc">🚫 Exclusiones…</button><button class="obtn primary" id="oGo">Buscar proyectos</button></div></div>`;
    enlazar();
    const sel = () => [...root.querySelectorAll('.odisks input:checked')].map(i => i.dataset.s);
    const cuenta = () => { root.querySelector('#oSel').textContent = `${sel().length} disco(s) marcado(s)`; root.querySelector('#oGo').disabled = !sel().length; };
    root.querySelectorAll('.odisks input').forEach(i => i.onchange = cuenta); cuenta();
    root.querySelector('#oExc').onclick = discosDlg;
    root.querySelector('#oConv2')?.addEventListener('click', convertir);
    root.querySelector('#oGo').onclick = async () => {
      try {
        for (const i of root.querySelectorAll('.odisks input')) await api('/api/org/disco', { serie: i.dataset.s, activo: i.checked });
        O.st.recorrido = (await api('/api/org/recorrido/iniciar', { modo: 'arranque', series: sel() })).recorrido;
        arranque();
      } catch (e) { err(e); }
    };
  }
  async function cargarRelaciones() {
    try {
      const { proyectos } = await api('/api/org/relaciones');
      // modelo común con el editor de jerarquía: proyecto → partes por tipo → carpetas (incluida ✓/✗)
      O.props = proyectos.map(p => {
        const partes = {};
        p.carpetas.forEach(c => (partes[c.tipo] ||= { nombre: TIPO[c.tipo][1], tipo: c.tipo, carpetas: [] }).carpetas.push({ ruta: c.ruta, nombre: c.nombre, icono: c.icono, incluida: true, anclada: c.anclada, etapa: c.etapa || '' }));
        partes.entornos?.carpetas.sort((a, b) => ordenEtapa(a.etapa) - ordenEtapa(b.etapa)); // pruebas → calidad → producción
        const yaTodo = p.carpetas.every(c => c.anclada);
        return { nombre: p.nombre, elegido: !yaTodo && (p.git || p.coincidencias >= 2), ya: yaTodo, git: p.git, partes: Object.values(partes), sin: [], recortadas: p.recortadas };
      });
      O.pantalla = 'arranque'; arranque();
    } catch (e) { err(e); }
  }
  function redSVG(p) { // mini red estilo Obsidian: el proyecto en el centro y sus carpetas alrededor
    const todas = p.partes.flatMap(pt => pt.carpetas.filter(c => c.incluida).map(c => ({ ...c, tipo: pt.tipo }))), MAX = 18;
    const cs = todas.slice(0, MAX), resto = todas.length - cs.length;
    const W = 360, H = 190, cx = W / 2, cy = H / 2, n = cs.length;
    const col = { codigo: '#7c5cdb', material: '#d08a2c', web: '#2f7fd8', respaldos: '#8a8a8a', base_datos: '#3f9a5b', documentos: '#b05a8a', otro: '#999' };
    const pts = cs.map((c, i) => { const a = -Math.PI / 2 + 2 * Math.PI * i / Math.max(n, 1); return { c, x: cx + Math.cos(a) * (W / 2 - 70), y: cy + Math.sin(a) * (H / 2 - 22) }; });
    const corta = s => s.length > 22 ? s.slice(0, 21) + '…' : s;
    return `<svg viewBox="0 0 ${W} ${H}">${pts.map(q => `<line x1="${cx}" y1="${cy}" x2="${q.x}" y2="${q.y}"/>`).join('')}
      ${pts.map(q => `<g class="on"><title>${esc(q.c.ruta)}</title><circle cx="${q.x}" cy="${q.y}" r="6" fill="${col[q.c.tipo]}"/><text x="${q.x + (q.x < cx ? -9 : 9)}" y="${q.y + 4}" text-anchor="${q.x < cx ? 'end' : 'start'}">${esc(q.c.icono || '')} ${esc(corta(q.c.nombre))}</text></g>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="11" fill="var(--accent)"/><text x="${cx}" y="${cy + 26}" text-anchor="middle" style="font-weight:600">${esc(corta(p.nombre))}</text>
      ${resto > 0 ? `<text x="${W - 4}" y="${H - 4}" text-anchor="end" style="fill:var(--muted)">+${resto} más (Ver detalles)</text>` : ''}</svg>`;
  }
  function relacionesPintar(cab, pasos, enlazar) {
    const total = p => p.partes.reduce((n, pt) => n + pt.carpetas.length, 0) + p.sin.length;
    const incl = p => p.partes.reduce((n, pt) => n + pt.carpetas.filter(c => c.incluida).length, 0);
    root.innerHTML = cab + `<div class="obody">${pasos}
      <p class="ohint">Proyectos propuestos por nombre (${O.props.length}). Marca ✓ los que quieras, cambia el nombre y usa <b>Ver detalles</b> para mover carpetas entre partes o quitarlas. Con <b>Agregar proyectos</b> se crea la ficha de cada uno y se pone un ancla en cada carpeta; no se mueve nada.</p>
      ${O.props.length ? `<div class="oprops">${O.props.map((p, i) => `<div class="oprop ${p.elegido ? '' : 'off'}" data-i="${i}">
        <header><input type="checkbox" ${p.elegido ? 'checked' : ''} title="Crear la ficha de este proyecto"><input type="text" value="${esc(p.nombre)}" title="Nombre del proyecto">${p.git ? '<small title="Tiene git o ya era proyecto de DeskLens">⎇</small>' : ''}</header>
        ${redSVG(p)}
        <footer>${p.ya ? '✓ ya en el organizador · ' : ''}${incl(p)} de ${total(p)} carpetas${p.recortadas ? ` (+${p.recortadas} sin mostrar)` : ''}<span class="sp"></span><button class="obtn" data-det>${total(p)} coincidencias · Ver detalles</button></footer></div>`).join('')}</div>`
        : '<p class="oempty">No se encontraron proyectos por nombre en esos discos. Puedes convertir tus proyectos de DeskLens o añadir carpetas desde el editor de jerarquía.</p>'}
      <div class="ofoot"><button class="obtn" id="oOtra">← Elegir otros discos</button><span class="sp"></span>
        <button class="obtn" id="oTodos" title="Marcar todos los proyectos propuestos">☑ Todos</button><button class="obtn" id="oNinguno" title="Desmarcar todos">☐ Ninguno</button>
        <span id="oN"></span><button class="obtn primary" id="oCrear">Agregar proyectos</button></div></div>`;
    enlazar();
    const cuenta = () => { const n = O.props.filter(p => p.elegido).length; root.querySelector('#oN').textContent = `${n} de ${O.props.length} elegidos`; root.querySelector('#oCrear').disabled = !n; };
    root.querySelectorAll('.oprop').forEach(el => {
      const p = O.props[+el.dataset.i];
      const marcar = v => { p.elegido = v; el.querySelector('input[type=checkbox]').checked = v; el.classList.toggle('off', !v); cuenta(); };
      el.querySelector('input[type=checkbox]').onchange = e => marcar(e.target.checked);
      // clic en cualquier parte de la tarjeta marca o desmarca (menos el nombre, la casilla y «Ver detalles»)
      el.onclick = e => { if (!e.target.closest('button, input')) marcar(!p.elegido); };
      el._marcar = marcar;
      el.querySelector('input[type=text]').oninput = e => p.nombre = e.target.value;
      el.querySelector('[data-det]').onclick = () => jerarquia(O.props, +el.dataset.i, { volver: () => { O.pantalla = 'arranque'; arranque(); } });
    });
    cuenta();
    root.querySelector('#oOtra').onclick = () => { O.props = null; arranque(); };
    root.querySelector('#oTodos').onclick = () => root.querySelectorAll('.oprop').forEach(el => el._marcar(true));
    root.querySelector('#oNinguno').onclick = () => root.querySelectorAll('.oprop').forEach(el => el._marcar(false));
    root.querySelector('#oCrear').onclick = async () => {
      const fichas = O.props.filter(p => p.elegido).map(p => ({ nombre: p.nombre.trim() || 'Sin nombre',
        partes: p.partes.map(pt => ({ nombre: pt.nombre, tipo: pt.tipo, carpetas: pt.carpetas.filter(c => c.incluida).map(c => ({ ruta: c.ruta, icono: c.icono, ...(pt.tipo === 'entornos' ? { etapa: c.etapa } : {}) })) })).filter(pt => pt.carpetas.length) }));
      // se ve que está trabajando (poner cientos de anclas tarda unos segundos) y al final un resumen con los avisos
      const b = root.querySelector('#oCrear'), n = fichas.reduce((s, f) => s + f.partes.reduce((t, p) => t + p.carpetas.length, 0), 0);
      b.disabled = true; b.textContent = `Agregando ${fichas.length} proyecto(s) · ${n} carpetas…`; document.body.style.cursor = 'progress';
      try {
        const r = await api('/api/org/fichas/crear', { fichas });
        O.props = null; O.pantalla = 'tablero'; await cargar();
        abrirDlg(`✓ ${r.fichas.length} proyecto(s) agregado(s)`, `<p>Cada proyecto tiene su ficha y cada carpeta su ancla (.desklens-ancla, oculta). No se movió ningún archivo.</p>
          ${r.avisos.length ? `<h4>⚠ Avisos (${r.avisos.length})</h4><ul>${r.avisos.map(a => `<li><small>${esc(a)}</small></li>`).join('')}</ul>` : ''}
          <p class="ohint">Todo queda anotado en 📋 Actividad.</p>`, { pie: '<button class="obtn primary" id="okA">Entendido</button>' }).querySelector('#okA').onclick = () => dlg.close();
      } catch (e) {
        b.disabled = false; b.textContent = 'Agregar proyectos';
        ask('No se pudieron agregar los proyectos', e.message, ['Entendido']); // a la vista, no solo en la barra de abajo
      } finally { document.body.style.cursor = ''; }
    };
  }

  // ---------- editor de jerarquía (reutilizable: arranque y fichas) ----------
  // proyectos: [{nombre, partes:[{nombre, tipo, carpetas:[{ruta|ancla, nombre, icono, incluida}]}], sin:[carpetas]}]
  // Arrastrar una carpeta: a otra parte la mueve; a «Sin proyecto» la desliga; a otro proyecto (izquierda) la pasa.
  // Ctrl al soltar sobre otro proyecto: la comparte (queda en los dos). Solo cambia la ficha: nunca mueve archivos.
  function jerarquia(proyectos, idx, { volver, guardar: alGuardar }) {
    let drag = null;
    O.pantalla = 'jerarquia';
    O.jer = { pintar, volver };
    function quitarDe(p, c) { p.partes.forEach(pt => pt.carpetas = pt.carpetas.filter(x => x !== c)); p.sin = p.sin.filter(x => x !== c); }
    function pintar() {
      const p = proyectos[idx];
      const n = p.partes.reduce((s, pt) => s + pt.carpetas.length, 0), k = p.partes.reduce((s, pt) => s + pt.carpetas.filter(c => c.incluida).length, 0);
      // carpeta enviada a la papelera o eliminada: nombre y ruta de ANTES, en rojo tenue, con qué pasó y qué hacer
      const fold = c => BORRADA[c.estado] ? `<div class="ofold odel" draggable="true" title="${esc(c.ruta || '')}"><input type="checkbox" ${c.incluida ? 'checked' : ''} title="Incluida en el proyecto"><span class="oico">🗑</span>
          <div><b>${esc(c.nombre)} <span class="owarn">⚠ ${BORRADA[c.estado]}</span></b><small>estaba en ${esc(c.ruta || '')}</small>${c.eliminada ? `<small>eliminada ${hace(c.eliminada)}</small>` : ''}
          <span class="obts">${c.estado === 'papelera' ? '<button class="obtn" data-pap>🗑 Abrir la papelera</button>' : ''}<button class="obtn" data-quit>Quitar</button></span></div></div>`
        : `<div class="ofold ${c.incluida ? '' : 'no'}" draggable="true" title="${esc(c.ruta || '')}"><input type="checkbox" ${c.incluida ? 'checked' : ''} title="Incluida en el proyecto"><span class="oico" title="Cambiar icono">${c.remota ? svgI('produccion', COLT.entornos) : svgI(c.icono || 'carpeta')}</span><div><b>${esc(c.nombre)}</b><small>${esc(c.ruta || c.remota?.url || '')}</small>
          ${c._etapa ? `<span class="oetapa">${c._n}. <select data-et title="Etapa">${[...new Set([...ETAPAS, c.etapa || ''])].filter(Boolean).map(e => `<option ${e === c.etapa ? 'selected' : ''}>${esc(e)}</option>`).join('')}<option value="__otra">Otra…</option></select>
            <button class="obtn" data-up title="Antes">↑</button><button class="obtn" data-dn title="Después">↓</button></span>` : ''}</div></div>`;
      root.innerHTML = `<div class="obar"><h2>🧩 ${esc(p.nombre)} · ${n} ${alGuardar ? 'carpetas' : 'coincidencias'}</h2><span class="sp"></span>
        ${alGuardar ? '<button class="obtn primary" id="jG">Guardar</button>' : ''}<button class="obtn" id="jV">← Regresar</button></div>
        <div class="ojerwrap"><div class="ojer"><nav><h5>Proyectos</h5>${proyectos.map((x, i) => `<div class="oproj ${i === idx ? 'on' : ''}" data-p="${i}">● ${esc(x.nombre)}</div>`).join('')}
          <h5>Sin proyecto</h5><div class="osin">${p.sin.map(fold).join('') || '<small>Suelta aquí lo que no es de este proyecto</small>'}</div></nav>
          <section><div class="oroot">● <b>${esc(p.nombre)}</b><small>${p.partes.length} parte(s)</small></div><div class="ovline"></div>
            <div class="oparts">${p.partes.map((pt, j) => { if (pt.tipo === 'entornos') pt.carpetas.forEach((c, k) => Object.assign(c, { _etapa: true, _n: k + 1, etapa: c.etapa || etapaSugerida(c.nombre) || 'Pruebas' })); else pt.carpetas.forEach(c => { c._etapa = false; }); return `<div class="opart" data-j="${j}"><h4>${icoT(pt.tipo)} <input value="${esc(pt.nombre)}" style="width:100px;font:inherit;border:1px solid transparent;background:none;color:var(--ink)" title="Nombre de la parte">
              <select title="Tipo de parte">${Object.entries(TIPO).map(([t, v]) => `<option value="${t}" ${pt.tipo === t ? 'selected' : ''}>${v[1]}</option>`).join('')}</select><span class="sp"></span>${pt.carpetas.length ? '' : '<button class="ic" data-del title="Quitar la parte vacía">✕</button>'}</h4>
              ${pt.carpetas.map(fold).join('') || '<small>Suelta aquí carpetas</small>'}${pt.tipo === 'entornos' ? '<button class="obtn" data-rem title="Una etapa que no es una carpeta de este PC (p. ej. el VPS)">+ Etapa remota</button>' : ''}</div>`; }).join('')}
              <button class="obtn" id="jP" style="align-self:center">+ Parte</button></div></section></div>
        <div class="ostatus" id="jS"><span>Arrastra una carpeta a otra parte, a «Sin proyecto» o a otro proyecto (Ctrl: compartirla). Solo cambia la ficha; no se mueven archivos.</span><span class="sp"></span><span>${k} de ${n} elegidas</span></div></div>`;
      root.querySelector('#jV').onclick = O.jer.volver;
      root.querySelector('#jG')?.addEventListener('click', () => alGuardar(proyectos));
      root.querySelector('#jP').onclick = () => { p.partes.push({ nombre: 'Otra', tipo: 'otro', carpetas: [] }); pintar(); };
      root.querySelectorAll('.oproj').forEach(el => el.onclick = () => { idx = +el.dataset.p; pintar(); });
      // cada carpeta: ✓/✗, icono y arrastre
      const vincula = (el, c) => {
        el.querySelector('input').onchange = e => { c.incluida = e.target.checked; pintar(); };
        if (BORRADA[c.estado]) { // 🗑 Abrir la papelera (para restaurar desde Windows) · Quitar (de la ficha, al Guardar)
          el.querySelector('[data-pap]')?.addEventListener('click', () => api('/api/org/papelera', {}).catch(err));
          el.querySelector('[data-quit]').onclick = () => { quitarDe(p, c); pintar(); flash('Se quitará al pulsar Guardar'); };
        } else el.querySelector('.oico').onclick = e => openMenu(e.target, ICONOS.map(ic => [ICO_NOM[ic], () => { c.icono = ic; pintar(); }, { html: `${svgI(ic)} ${ICO_NOM[ic]}` }]));
        const pt = p.partes.find(x => x.carpetas.includes(c));
        el.querySelector('[data-et]')?.addEventListener('change', async e => {
          if (e.target.value !== '__otra') { c.etapa = e.target.value; return; }
          const n = await ask('Etapa', 'Nombre de la etapa (p. ej. «Demo», «Cliente»):', ['Usar', 'Cancelar'], { input: '' });
          if (n?.trim()) c.etapa = n.trim(); pintar();
        });
        const mover = d => { const k = pt.carpetas.indexOf(c), j = k + d; if (j < 0 || j >= pt.carpetas.length) return; [pt.carpetas[k], pt.carpetas[j]] = [pt.carpetas[j], pt.carpetas[k]]; pintar(); };
        el.querySelector('[data-up]')?.addEventListener('click', () => mover(-1));
        el.querySelector('[data-dn]')?.addEventListener('click', () => mover(1));
        el.ondragstart = e => { drag = c; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/desklens-org', '1'); root.querySelector('#jS').firstChild.textContent = `✋ Arrastrando «${c.nombre}» → suelta sobre una parte, otro proyecto o «Sin proyecto»`; };
        el.ondragend = () => { drag = null; el.classList.remove('drag'); };
        el.ondrop = e => e.stopPropagation(); // soltarla sobre sí misma o sobre otra carpeta: nada
      };
      const els = [...root.querySelectorAll('.osin .ofold')]; p.sin.forEach((c, i) => vincula(els[i], c));
      root.querySelectorAll('.opart').forEach(box => {
        const pt = p.partes[+box.dataset.j];
        [...box.querySelectorAll('.ofold')].forEach((el, i) => vincula(el, pt.carpetas[i]));
        box.querySelector('h4 input').oninput = e => pt.nombre = e.target.value;
        box.querySelector('h4 select').onchange = e => { pt.tipo = e.target.value; if (Object.values(TIPO).some(v => v[1] === pt.nombre) || pt.nombre === 'Otra') pt.nombre = TIPO[pt.tipo][1]; pintar(); };
        box.querySelector('[data-del]')?.addEventListener('click', () => { p.partes.splice(+box.dataset.j, 1); pintar(); });
        box.querySelector('[data-rem]')?.addEventListener('click', async () => { // etapa remota: nombre + dirección (VPS, servidor…)
          const nombre = await ask('Etapa remota', 'Nombre (p. ej. «VPS producción»):', ['Siguiente', 'Cancelar'], { input: '' }); if (!nombre?.trim()) return;
          const url = await ask('Etapa remota', 'Dirección: https://… o ssh usuario@servidor (opcional):', ['Añadir', 'Cancelar'], { input: '' }); if (url === null) return;
          pt.carpetas.push({ ancla: '', remota: { nombre: nombre.trim(), url: url.trim() }, nombre: nombre.trim(), ruta: url.trim(), estado: 'remota', incluida: true, etapa: 'Producción' });
          pintar();
        });
        zona(box, () => { quitarDe(p, drag); drag.incluida = true; pt.carpetas.push(drag); });
      });
      zona(root.querySelector('.osin'), () => { quitarDe(p, drag); drag.incluida = false; p.sin.push(drag); });
      root.querySelectorAll('.oproj').forEach(el => {
        const i = +el.dataset.p; if (i === idx) return;
        zona(el, e => {
          const dest = proyectos[i], copia = { ...drag, incluida: true }, tipo = tipoDe(p, drag) || 'otro'; // el tipo, antes de quitarla
          if (!e.ctrlKey) quitarDe(p, drag);
          const pt = dest.partes.find(x => x.tipo === tipo) || (dest.partes.push({ nombre: TIPO[tipo][1], tipo, carpetas: [] }), dest.partes.at(-1));
          pt.carpetas.push(e.ctrlKey ? copia : Object.assign(drag, { incluida: true }));
          flash(`${e.ctrlKey ? '🔗 Compartida con' : '→ Pasada a'} «${dest.nombre}»`);
        });
      });
    }
    const tipoDe = (p, c) => p.partes.find(pt => pt.carpetas.includes(c))?.tipo;
    function zona(el, alSoltar) {
      el.ondragover = e => { if (!drag) return; e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; el.classList.add('drop'); };
      el.ondragleave = () => el.classList.remove('drop');
      el.ondrop = e => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); if (!drag) return; alSoltar(e); drag = null; pintar(); }; // stop: sin el aviso general de DeskLens
    }
    pintar();
  }
  // Editar la jerarquía de una ficha existente: las demás fichas a la izquierda (para pasar o compartir carpetas)
  function editarFicha(f) {
    const modelo = O.st.fichas.map(x => ({ id: x.id, nombre: x.nombre, sin: [], partes: x.partes.map(pt => ({ nombre: pt.nombre, tipo: pt.tipo,
      carpetas: pt.carpetas.map(c => ({ ancla: c.ancla, ruta: c.ruta, nombre: c.nombre, icono: c.icono, incluida: c.activa !== false, _ico: c.icono, _propio: c.icono_propio,
        estado: c.estado, eliminada: c.eliminada, etapa: c.etapa || '', remota: c.remota })) })) }));
    const original = JSON.stringify(modelo);
    jerarquia(modelo, O.st.fichas.indexOf(f), {
      volver: async () => {
        if (JSON.stringify(modelo) !== original && await ask('Cambios sin guardar', 'La jerarquía tiene cambios sin guardar.', ['Descartar', 'Seguir editando'], { danger: true }) !== 'Descartar') return;
        O.pantalla = O.adm ? 'proyecto' : 'tablero'; pintar();
      },
      guardar: async ms => {
        try {
          const antes = JSON.parse(original);
          for (const [i, m] of ms.entries()) {
            const limpio = x => JSON.stringify(x, (k, v) => k === '_etapa' || k === '_n' ? undefined : v);
            if (limpio(m) === limpio(antes[i])) continue; // solo las fichas que cambiaron
            await api('/api/org/ficha/guardar', { id: m.id, partes: m.partes.map(pt => ({ nombre: pt.nombre, tipo: pt.tipo,
              carpetas: pt.carpetas.map(c => ({ ...(c.ancla ? { ancla: c.ancla } : {}), activa: c.incluida, ...(c.remota ? { remota: c.remota } : c.icono !== c._ico || c._propio ? { icono: c.icono } : {}),
                ...(pt.tipo === 'entornos' ? { etapa: c.etapa || '' } : {}) })) })) });
          }
          flash('✓ Jerarquía guardada (solo la ficha: no se movió ningún archivo)');
          O.pantalla = O.adm ? 'proyecto' : 'tablero'; await cargar();
        } catch (e) { err(e); }
      },
    });
  }

  // ---------- vista de administración del proyecto (clic en una tarjeta) ----------
  // Arriba: nombre, estado ▾, avance (clic en la barra), tecnología, git y botones. Pestañas: Archivos · Ficha · Git ·
  // Estado · Historial · Notas. En Archivos, el árbol une todas las carpetas del proyecto (G:, H:, htdocs…) por partes y a
  // la derecha va el visor/editor de DeskLens de siempre (#panes se presta aquí y se devuelve al salir).
  let panesHome = null;
  const TABS = [['archivos', 'Archivos'], ['ficha', 'Ficha'], ['git', 'Git'], ['estado', 'Estado'], ['historial', 'Historial'], ['notas', 'Notas']];
  function adminAbrir(f) {
    // cada proyecto recuerda su vista: pestaña, búsqueda, ancho del árbol, carpetas abiertas, desplazamiento y último archivo
    let v = {};
    try { v = JSON.parse(LS('desklens.org.vista.' + f.id) || '{}'); } catch {}
    O.adm = { id: f.id, tab: v.tab || 'archivos', q: v.q || '', arbolW: v.arbolW || 320, scroll: v.scroll || 0, ultimo: v.ultimo || '',
      abiertas: new Set(v.abiertas || JSON.parse(LS('desklens.org.abiertas.' + f.id) || '[]')),
      vista: v.vista || 'contenedor', cmp: v.cmp || { v: '', modo: 'encima', solo: false }, cam: v.cam || {}, mini: v.mini ?? true, notaAbierta: v.notaAbierta || '', notas: [],
      reabrir: true, // su último archivo se abre al entrar (una vez)
      info: { abierto: false, sel: null, ancho: 380, ...(v.info || {}) }, exp: { flujo: [], red: [], ...(v.exp || {}) } }; // ⓘ panel y carpetas desplegadas en Flujo/Red
    api('/api/org/notas?id=' + encodeURIComponent(f.id)).then(r => { if (O.adm?.id !== f.id) return; O.adm.notas = r.notas; if (r.notas.length && O.pantalla === 'proyecto') admin(); }).catch(() => {});
    O.pantalla = 'proyecto'; pintar(); guardarDonde();
  }
  function devolverPanes() { // el visor vuelve a su sitio de DeskLens
    if (!panesHome) return;
    panesHome.parent.insertBefore($('#panes'), panesHome.next); panesHome = null;
    document.body.classList.remove('orgadm');
  }
  function adminSalir() { devolverPanes(); O.adm = null; O.pantalla = 'tablero'; pintar(); guardarDonde(); }
  const vivas = f => f.partes.flatMap(p => p.carpetas.filter(c => c.estado === 'ok' || c.estado === 'movida').map(c => ({ ...c, tipo: p.tipo, parte: p.nombre })));
  function admin() {
    const f = O.st.fichas.find(x => x.id === O.adm.id);
    if (!f) return adminSalir();
    const c = codigoDe(f), g = c && O.git[c.ruta], web = (f.enlaces || [])[0];
    const git = !c ? '' : !c.git ? '⎇ sin git' : !g ? '⎇ …' : g.rama == null ? '⎇ sin git' : `⎇ ${esc(g.rama)} · ${g.cambios ? `${g.cambios} cambio${g.cambios > 1 ? 's' : ''}` : 'al día'}${g.adelante ? ` · ↑${g.adelante}` : ''}${g.atras ? ` · ↓${g.atras}` : ''}`;
    devolverPanes(); // antes de repintar: si no, el visor prestado se va con el HTML viejo (y sale «null»); Contenedor lo vuelve a pedir abajo
    root.innerHTML = `<div class="obar oadmbar" style="--oc:${esc(f.color || 'var(--accent)')}">
        <button class="obtn" id="aT" title="Volver al tablero (Esc)">← Tablero</button>
        <h2><span class="ocol"></span>${esc(f.nombre)}</h2>
        <select id="aE" title="Estado">${Object.entries(ESTADO).map(([k, v]) => `<option value="${k}" ${f.estado === k ? 'selected' : ''}>${v.join(' ')}</option>`).join('')}</select>
        <span class="obarp oclic" id="aA" title="Clic para cambiar el avance"><i style="width:${f.avance}%"></i></span><b>${f.avance}%</b>
        ${f.tecnologia?.length ? `<span class="osmall">${esc(f.tecnologia.join(' · '))}</span>` : ''}<span class="osmall">${git}</span>
        <span class="sp"></span>
        <span class="oact"><button data-a="carpeta" title="Abrir la carpeta de código en el Explorador">📂</button><button data-a="vscode" title="Abrir en VS Code">VS</button>
          <button data-a="claude" title="Claude con todas las partes del proyecto">✦</button><button data-a="terminal" title="Terminal en la carpeta de código">&gt;_</button>
          ${web ? `<button data-a="web" title="${esc(web.nombre)}: ${esc(web.url)}">🌐 ${esc(web.url.replace(/^https?:\/\//, ''))}</button>` : ''}</span></div>
      <nav class="otabs">${TABS.map(([k, t]) => `<button data-t="${k}" class="${O.adm.tab === k ? 'on' : ''}">${t}</button>`).join('')}</nav>
      <div class="oadmbody" id="aB"></div>`;
    root.querySelector('#aT').onclick = adminSalir;
    root.querySelector('#aE').onchange = e => guardar(f.id, { estado: e.target.value });
    root.querySelector('#aA').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); guardar(f.id, { avance: Math.round((e.clientX - r.left) / r.width * 20) * 5 }); };
    root.querySelectorAll('.oadmbar .oact button').forEach(b => b.onclick = () => accion(b.dataset.a, f, b));
    root.querySelectorAll('.otabs button').forEach(b => b.onclick = () => { O.adm.tab = b.dataset.t; guardarVista(); admin(); });
    const archivos = O.adm.vista === 'contenedor' ? adminArchivos : adminPizarra;
    ({ archivos, ficha: adminFicha, git: adminGit, estado: adminEstado, historial: adminHistorial }[O.adm.tab] || adminLuego)(f, root.querySelector('#aB'));
  }

  // Archivos: árbol unido por partes (carpetas que se abren al pulsar) + visor de DeskLens a la derecha
  function adminArchivos(f, B) {
    B.innerHTML = `<div class="obarra">${pestanasVista('contenedor')}${grupoHistorial}<span class="sp"></span></div><div class="oadm"><div class="oarbol">
        <div class="oaq"><input type="search" id="aQ" placeholder="Buscar en el proyecto…" value="${esc(O.adm.q)}"></div>
        <div id="aTree" class="otree"></div>
        <button class="obtn" id="aJ">🧩 Editar jerarquía</button></div>
      <div class="ores" title="Arrastra para cambiar el ancho"></div><div class="oslot"></div><div class="oinfo oflota" id="pI" hidden></div></div>`;
    // el visor de DeskLens se presta a esta vista (mismas pestañas, editor, PDF, Word…)
    if (!panesHome) { const p = $('#panes'); panesHome = { parent: p.parentNode, next: p.nextSibling }; }
    B.querySelector('.oslot').append($('#panes'));
    document.body.classList.add('orgadm');
    B.querySelector('.oadm').style.setProperty('--arbolW', O.adm.arbolW + 'px');
    B.querySelector('.ores').onpointerdown = e => { // ancho del árbol: arrastrando el borde (se recuerda)
      const box = B.querySelector('.oadm'), x0 = e.clientX, w0 = box.querySelector('.oarbol').offsetWidth;
      const mv = ev => box.style.setProperty('--arbolW', Math.max(220, Math.min(700, w0 + ev.clientX - x0)) + 'px');
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); O.adm.arbolW = parseInt(box.style.getPropertyValue('--arbolW')); guardarVista(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
    B.querySelector('#aJ').onclick = () => { devolverPanes(); editarFicha(f); };
    cablearBarra(f, B);
    const T = B.querySelector('#aTree');
    T.dataset.menuPropio = '1'; // el árbol del proyecto tiene su propio menú (clic derecho)
    const q = B.querySelector('#aQ');
    let tq;
    q.oninput = () => { O.adm.q = q.value; guardarVista(); clearTimeout(tq); tq = setTimeout(() => O.adm.q.trim() ? buscarEn(f, T) : arbol(f, T), 250); };
    let ts; T.onscroll = () => { clearTimeout(ts); ts = setTimeout(() => { O.adm.scroll = T.scrollTop; guardarVista(); }, 300); };
    O.adm.q.trim() ? buscarEn(f, T) : arbol(f, T);
    // al volver al proyecto: su último archivo, si lo que se ve ahora no es de este proyecto
    const dentro = r => r && vivas(f).some(c => r.toLowerCase().startsWith(c.ruta.toLowerCase()));
    // solo una vez al entrar al proyecto (no cada vez que vuelves al Contenedor desde Flujo o Red)
    if (O.adm.reabrir && O.adm.ultimo && !dentro(typeof cur === 'string' ? cur : '')) openTab(O.adm.ultimo, true);
    O.adm.reabrir = false;
  }
  const guardarVista = () => O.adm && LS('desklens.org.vista.' + O.adm.id, JSON.stringify({ tab: O.adm.tab, q: O.adm.q, arbolW: O.adm.arbolW,
    scroll: O.adm.scroll, ultimo: O.adm.ultimo, abiertas: [...O.adm.abiertas], vista: O.adm.vista, cmp: O.adm.cmp, cam: O.adm.cam, mini: O.adm.mini,
    notaAbierta: O.adm.notaAbierta, info: O.adm.info, exp: O.adm.exp }));
  const guardarAbiertas = guardarVista;
  // cerrar la pestaña del último archivo del proyecto lo olvida: no vuelve a abrirse solo
  if (typeof closeTab === 'function') {
    const cerrarPestana = closeTab;
    closeTab = async function (ruta, ...resto) {
      const r = await cerrarPestana.call(this, ruta, ...resto);
      if (O.adm?.ultimo === ruta && !tabs.includes(ruta)) { O.adm.ultimo = ''; guardarVista(); }
      return r;
    };
  }
  const abrirArchivo = (ruta, fijo) => { O.adm.ultimo = ruta; guardarVista(); openTab(ruta, fijo); }; // se recuerda el último por proyecto
  // Árbol del Contenedor: la carpeta principal ★ es la raíz. De ella salen, con línea gruesa, las etapas de Entornos en
  // cadena (calidad cuelga de la principal y producción de calidad); luego su propio contenido (al desplegarla) y, con
  // líneas grises, las demás partes con sus carpetas. Las líneas (│ ├─ └─) las pone el CSS (.otl); al pasar el ratón,
  // el camino hasta la raíz se pinta del color del tema.
  function arbol(f, T) {
    T.classList.add('otl');
    const donde = new Map(); f.partes.forEach((p, j) => p.carpetas.forEach((c, k) => donde.set(c.ancla, { c, p, j, k })));
    const nNotas = a => (O.adm.notas || []).filter(n => n.destino === 'nodo:' + a || (a === f.principal && n.destino === 'proyecto')).length;
    const fila = ({ c, p, j, k }, extra = '') => {
      const borrada = BORRADA[c.estado], viva = c.estado === 'ok' || c.estado === 'movida', principal = c.ancla === f.principal;
      if (c.estado === 'remota') return `<div class="onodo raiz oremota" data-j="${j}" data-k="${k}" data-url="${esc(c.ruta)}" title="Etapa remota · ${esc(c.ruta || 'sin dirección')}">
        <span class="otw"></span>${icoC(c, p.tipo)}<span class="onom">${esc(c.nombre)}</span><small>${esc(c.etapa || '')} · ${esc(c.ruta || 'sin dirección')}</small></div>`;
      if (String(c.ancla).startsWith('archivo:')) return `<div class="onodo raiz oacceso ${viva ? '' : 'gris'}" data-j="${j}" data-k="${k}" data-ruta="${esc(c.ruta)}" title="Acceso a un archivo · ${esc(c.ruta)}">
        <span class="otw"></span>${svgI('documentos', COLT[p.tipo])}<span class="onom">${esc(c.nombre)}</span><span title="Acceso: no lleva ancla">↗</span>${viva ? '' : '<span class="owarn">⚠ no está</span>'}</div>`;
      const nn = nNotas(c.ancla);
      const marcas = `${nn ? `<span class="onotat" title="${nn} nota(s): se ven y editan en Flujo o Red">${svgI('notas')}${nn}</span>` : ''}${c.git ? '<span title="Repositorio git">⎇</span>' : ''}${c.proyectos.length > 1 ? `<span title="Compartida con ${c.proyectos.length - 1} proyecto(s) más">🔗</span>` : ''}${borrada ? `<span class="owarn">🗑 ${borrada}</span>` : c.estado === 'desconectado' ? '<span class="owarn">⚠ no conectado</span>' : c.estado === 'falta' ? '<span class="owarn">⚠ no encontrada</span>' : ''}`;
      const det = [principal ? 'principal' : '', p.tipo === 'entornos' ? c.etapa || 'Etapa' : ''].filter(Boolean).join(' · ');
      return `<div class="onodo raiz ${viva ? '' : 'gris'} ${principal ? 'oprincipal' : ''}" data-j="${j}" data-k="${k}" data-ruta="${esc(c.ruta)}" data-dir="1" title="${esc(c.ruta)}">
        <span class="otw">${viva ? (O.adm.abiertas.has(c.ruta) ? '▾' : '▸') : ''}</span>${principal ? svgI('principal', 'var(--accent)', 'Carpeta principal') : ''}${icoC(c, p.tipo)}<span class="onom">${esc(c.nombre)}</span>${marcas}${det ? `<small>${esc(det)}</small>` : ''}</div>${extra}`;
    };
    const pr = donde.get(f.principal);
    if (!pr) { T.innerHTML = '<p class="ohint">El proyecto no tiene carpetas: añádelas con clic derecho › ＋ Añadir carpetas…</p>'; return; }
    // etapas (sin la principal), en cadena: cada una cuelga de la anterior
    const etapas = f.partes.filter(p => p.tipo === 'entornos').flatMap(p => p.carpetas).filter(c => c.ancla !== f.principal).map(c => donde.get(c.ancla));
    const cadena = i => i >= etapas.length ? '' : `<div class="orama oetapa">${fila(etapas[i], `<div class="ohijos">${etapas[i].c.estado === 'remota' ? '' : `<div class="ocont" data-de="${esc(etapas[i].c.ruta)}"></div>`}${cadena(i + 1)}</div>`)}</div>`;
    // las demás partes (sin la principal), cada una con sus carpetas
    const partes = f.partes.map((p, j) => ({ p, j, cs: p.carpetas.filter(c => c.ancla !== f.principal) })).filter(x => x.p.tipo !== 'entornos' && x.cs.length);
    T.innerHTML = `<div class="orama oraiz">${fila(pr, `<div class="ohijos">${cadena(0)}<div class="ocont" data-de="${esc(pr.c.ruta)}"></div>
      ${partes.map(({ p, j, cs }) => `<div class="orama"><div class="onodo oparten" data-parte="${j}"><span class="otw"></span>${icoT(p.tipo)}<span class="onom">${esc(p.nombre)}</span><small>${cs.length}</small></div>
        <div class="ohijos">${cs.map(c => `<div class="orama">${fila(donde.get(c.ancla), `<div class="ohijos ocont" data-de="${esc(c.ruta)}"></div>`)}</div>`).join('')}</div></div>`).join('')}</div>`)}</div>`;
    marcarUltimos(T);
    T.onmouseover = e => { // el camino hasta la raíz, en color
      const n = e.target.closest('.onodo');
      T.querySelectorAll('.ocamino').forEach(x => x.classList.remove('ocamino'));
      for (let o = n?.closest('.orama'); o && T.contains(o); o = o.parentElement.closest('.orama')) o.classList.add('ocamino');
    };
    T.onmouseleave = () => T.querySelectorAll('.ocamino').forEach(x => x.classList.remove('ocamino'));
    T.onclick = e => {
      const n = e.target.closest('.onodo'); if (!n || n.classList.contains('gris') || n.classList.contains('oparten')) return;
      if (n.classList.contains('oremota')) { const u = n.dataset.url; if (/^https?:\/\//.test(u)) openTab('web:' + u, true); else if (u) copyText(u, '✓ Copiado: ' + u); return; }
      if (n.dataset.dir) abrirCarpeta(n, T); else abrirArchivo(n.dataset.ruta, false);
    };
    T.ondblclick = e => { const n = e.target.closest('.onodo'); if (n && !n.dataset.dir) abrirArchivo(n.dataset.ruta, true); };
    T.oncontextmenu = e => {
      const n = e.target.closest('.onodo');
      if (!n || n.classList.contains('oparten')) { // el fondo o una parte: añadir
        e.preventDefault(); e.stopPropagation();
        const pt = n ? f.partes[+n.dataset.parte] : null;
        return openMenu({ x: e.clientX, y: e.clientY }, [{ head: pt ? pt.nombre : f.nombre }, [pt ? `＋ Añadir carpetas a ${pt.nombre}…` : '＋ Añadir carpetas…', () => nuevoProyecto(f, pt?.tipo || '')]]);
      }
      if (n.classList.contains('gris') && !n.classList.contains('raiz')) return;
      e.preventDefault(); e.stopPropagation(); // sin el menú general de DeskLens encima
      const ruta = n.dataset.ruta, dir = !!n.dataset.dir, raiz = n.classList.contains('raiz');
      const c = raiz ? f.partes[+n.dataset.j].carpetas[+n.dataset.k] : null;
      const remota = n.classList.contains('oremota'), panelI = document.querySelector('#pI');
      openMenu({ x: e.clientX, y: e.clientY }, [
        ['ⓘ Información', () => infoMostrar(f, panelI, remota ? { tipo: 'remota', ancla: c.ancla } : { tipo: dir ? 'carpeta' : 'archivo', ruta }), { disabled: n.classList.contains('gris') && !remota }],
        ...(remota ? [{ head: c.nombre }] : [['📂 Mostrar en el Explorador', () => api('/api/mostrar', { ruta }).catch(err), { disabled: n.classList.contains('gris') }],
        ...(dir ? [['>_ Terminal aquí', () => { adminSalir(); cerrar(); openTerminal(ruta); }, { disabled: n.classList.contains('gris') }]] : [['Abrir', () => abrirArchivo(ruta, true)]])]),
        ...(raiz && !remota && !n.classList.contains('oacceso') && c.ancla !== f.principal ? ['-', hacerPrincipalItem(f, c.ancla, c.nombre)] : []),
        ...(raiz ? menuMover(f, c.ancla, f.partes[+n.dataset.j].tipo) : []),
        ...(raiz ? ['-', ['Quitar del proyecto…', async () => {
          if (await ask('Quitar del proyecto', `«${c.nombre}» deja de ser parte de «${f.nombre}». No se borra nada del disco.`, ['Quitar', 'Cancelar'], { danger: true }) !== 'Quitar') return;
          try { await api('/api/org/ficha/quitar_carpeta', { id: f.id, ancla: c.ancla }); await cargar(); } catch (x) { err(x); }
        }, { danger: true }]] : [])]);
    };
    const abrir = [...O.adm.abiertas].map(r => T.querySelector(`.onodo[data-ruta="${CSS.escape(r)}"]`)).filter(Boolean).map(n => abrirCarpeta(n, T, true));
    Promise.all(abrir).then(() => setTimeout(() => { T.scrollTop = O.adm.scroll; }, 50)); // donde lo dejaste
  }
  // ★ Hacer principal: esa carpeta pasa a ser la raíz del proyecto (solo la ficha; queda en el Historial)
  const hacerPrincipalItem = (f, ancla, nombre) => ['★ Hacer principal', async () => {
    try { await api('/api/org/ficha/guardar', { id: f.id, principal: ancla }); flash(`★ «${nombre}» es ahora la carpeta principal (nada se movió en el disco)`); await cargar(); } catch (x) { err(x); }
  }, { html: `${svgI('principal', 'var(--accent)')} Hacer principal`, title: 'La raíz del proyecto: de ella salen sus entornos y sus partes' }];
  // «Mover a» (clic derecho en el árbol, Flujo y Red): pasa la carpeta a otra parte; solo la ficha, nada en el disco
  function menuMover(f, ancla, tipoActual) {
    const remota = String(ancla).startsWith('remota:'), acceso = String(ancla).startsWith('archivo:');
    return ['-', { head: 'Mover a' }, ...Object.entries(TIPO).filter(([t]) => t !== tipoActual).map(([t, [, nom]]) => [nom, async () => {
      try {
        const r = await api('/api/org/ficha/mover_carpeta', { id: f.id, ancla, tipo: t, nombre: nom });
        const c = r.ficha.partes.find(p => p.tipo === t)?.carpetas.find(x => x.ancla === ancla);
        flash(`✓ Pasada a ${nom}${t === 'entornos' && c?.etapa ? ` · etapa ${c.etapa}` : ''} (solo la ficha: nada se movió en el disco)`);
        await cargar();
      } catch (x) { err(x); }
    }, { disabled: remota && t !== 'entornos' || acceso && t === 'entornos', html: `${svgI(t, COLT[t])} ${nom}` }])];
  }
  const marcarUltimos = T => T.querySelectorAll('.ohijos').forEach(h => {
    const hs = [...h.querySelectorAll(':scope > .orama, :scope > .ocont > .orama')];
    hs.forEach((o, i) => o.classList.toggle('oult', i === hs.length - 1));
  });
  async function abrirCarpeta(n, T, restaurar = false) {
    const ruta = n.dataset.ruta, hijos = n.parentElement.querySelector(':scope > .ocont, :scope > .ohijos > .ocont') || n.nextElementSibling, abierta = O.adm.abiertas.has(ruta) && !restaurar;
    if (abierta) { O.adm.abiertas.delete(ruta); hijos.innerHTML = ''; n.querySelector('.otw').textContent = '▸'; marcarUltimos(T); return guardarAbiertas(); }
    O.adm.abiertas.add(ruta); guardarAbiertas(); n.querySelector('.otw').textContent = '▾';
    let items;
    try { items = await api('/api/dir?ruta=' + encodeURIComponent(ruta)); } catch (e) { hijos.innerHTML = `<div class="osmall owarn" style="padding-left:24px">⚠ ${esc(e.message)}</div>`; return; }
    hijos.innerHTML = items.filter(i => i.nombre !== '.desklens-ancla').map(i => `<div class="orama"><div class="onodo" data-ruta="${esc(i.ruta)}" ${i.dir ? 'data-dir="1"' : ''} title="${esc(i.ruta)}">
      <span class="otw">${i.dir ? '▸' : ''}</span>${fileIcon(i.nombre, i.dir)}<span class="onom">${esc(i.nombre)}</span>${i.git && i.git !== 'limpio' ? `<span class="ogitpt" title="${esc(i.git)}">●</span>` : ''}</div>${i.dir ? `<div class="ohijos ocont" data-de="${esc(i.ruta)}"></div>` : ''}</div>`).join('')
      || `<div class="orama"><div class="osmall ovacia">(vacía)</div></div>`;
    marcarUltimos(T);
    const sub = [...O.adm.abiertas].filter(r => r.startsWith(ruta + '\\') || r.startsWith(ruta + '/')).map(r => hijos.querySelector(`.onodo[data-ruta="${CSS.escape(r)}"]`)).filter(m => m && m.parentElement.parentElement === hijos);
    await Promise.all(sub.map(m => abrirCarpeta(m, T, true))); // las de dentro también, antes de volver al desplazamiento guardado
  }
  // Buscar en el proyecto: por nombre en todas sus carpetas (el mismo filtro que Ctrl+F del árbol de DeskLens)
  async function buscarEn(f, T) {
    const raices = vivas(f).map(c => c.ruta);
    T.innerHTML = '<p class="ohint">Buscando…</p>';
    try {
      const r = await api('/api/arbol/filtro?q=' + encodeURIComponent(O.adm.q) + '&raices=' + encodeURIComponent(raices.join('|')));
      const base = ruta => raices.find(x => ruta.toLowerCase().startsWith(x.toLowerCase())) || '';
      T.innerHTML = (r.items || []).filter(i => !i.ruta.endsWith('.desklens-ancla')).map(i => `<div class="onodo" data-ruta="${esc(i.ruta)}" ${i.dir ? 'data-dir="1"' : ''} title="${esc(i.ruta)}">${fileIcon(i.nombre || i.ruta.split(/[\\/]/).pop(), i.dir)}
        <span class="onom">${esc(i.nombre || i.ruta.split(/[\\/]/).pop())}</span><small>${esc(i.ruta.slice(base(i.ruta).length - base(i.ruta).split(/[\\/]/).pop().length))}</small></div>`).join('')
        + (r.mas ? '<p class="ohint">Hay más resultados: escribe algo más concreto.</p>' : '') || '<p class="ohint">Sin resultados.</p>';
      T.onclick = e => { const n = e.target.closest('.onodo'); if (!n) return; n.dataset.dir ? api('/api/mostrar', { ruta: n.dataset.ruta }).catch(err) : abrirArchivo(n.dataset.ruta, false); };
      T.ondblclick = e => { const n = e.target.closest('.onodo'); if (n && !n.dataset.dir) abrirArchivo(n.dataset.ruta, true); };
      T.oncontextmenu = null;
    } catch (e) { T.innerHTML = `<p class="owarn">⚠ ${esc(e.message)}</p>`; }
  }

  // Ficha: el mismo formulario que la ventana «Ficha», aquí en su pestaña
  function adminFicha(f, B) {
    B.innerHTML = `<div class="opage">${fichaCampos(f)}<div class="ofoot"><button class="obtn" id="fJer">🧩 Editar jerarquía…</button><span class="sp"></span><span class="osmall" id="fM"></span><button class="obtn primary" id="fOk">Guardar</button></div></div>`;
    B.querySelector('#fA').oninput = e => B.querySelector('#fAv').textContent = e.target.value + '%';
    B.oninput = () => B.querySelector('#fM').textContent = 'Cambios sin guardar';
    B.querySelector('#fJer').onclick = () => editarFicha(f);
    B.querySelector('#fOk').onclick = async () => { if (await guardar(f.id, fichaDatos(B))) flash('✓ Ficha guardada'); };
  }
  // Git: el de la carpeta de código, en la vista Git de DeskLens (que trabaja con sus proyectos)
  function adminGit(f, B) {
    const c = codigoDe(f), g = c && O.git[c.ruta], esProyecto = c && side?.proyectos?.some(p => p.ruta.toLowerCase() === c.ruta.toLowerCase());
    B.innerHTML = `<div class="opage">${!c ? '<p>Este proyecto no tiene una parte 💻 Código disponible.</p>' : !c.git
      ? `<p>La carpeta de código <code>${esc(c.ruta)}</code> no usa git.</p><p class="ohint">Para empezar a usarlo: añádela a DeskLens y en la vista Git sale el asistente «Empezar a usar git aquí».</p>`
      : `<p>⎇ <b>${esc(g?.rama || '…')}</b> ${g ? `· ${g.cambios ? g.cambios + ' cambio(s) sin commit' : 'sin cambios'}${g.remota ? ` · ↔ ${esc(g.remota)}` : ' · sin servidor'}${g.adelante ? ` · ↑${g.adelante} por subir` : ''}${g.atras ? ` · ↓${g.atras} por traer` : ''}` : ''}</p><p class="osmall">${esc(c.ruta)}</p>`}
      ${c ? `<p style="margin-top:14px">${esProyecto ? '<button class="obtn primary" id="gA">Abrir en la vista Git de DeskLens</button>' : '<button class="obtn primary" id="gP">Añadir la carpeta de código a DeskLens y abrir Git</button><br><small>La vista Git trabaja con los proyectos de la barra lateral; añadirla también la indexa.</small>'}</p>` : ''}</div>`;
    const ir = () => { LS('desklens.git.repo', c.ruta); adminSalir(); cerrar(); sideView('g', true); };
    B.querySelector('#gA')?.addEventListener('click', ir);
    B.querySelector('#gP')?.addEventListener('click', async () => { try { await api('/api/agregar', { tipo: 'proyectos', rutas: [c.ruta] }); await loadSide(); ir(); } catch (e) { err(e); } });
  }
  // Estado (M3): de cada carpeta, si tiene git, si tiene copia y cuánto ocupa. Solo informa: no copia nada.
  async function adminEstado(f, B) {
    const filas = f.partes.flatMap(p => p.carpetas.map(c => ({ ...c, tipo: p.tipo, parte: p.nombre })));
    const hayResp = f.partes.some(p => p.tipo === 'respaldos' && p.carpetas.some(c => c.estado === 'ok' || c.estado === 'movida'));
    B.innerHTML = `<div class="opage"><table class="olist"><thead><tr><th>Parte</th><th>Carpeta</th><th>Git</th><th>Copia</th><th>Tamaño</th></tr></thead><tbody>${filas.map((c, i) => `<tr>
      <td>${icoT(c.tipo)} ${esc(c.parte)}</td><td><span title="${esc(c.ruta)}">${icoC(c, c.tipo)} ${esc(c.nombre)}</span><br><small>${esc(c.ruta)}</small></td>
      <td data-g="${i}">${c.git ? '⎇ …' : '—'}</td><td data-c="${i}">…</td><td data-t="${i}">${c.estado === 'ok' || c.estado === 'movida' ? '…' : '—'}</td></tr>`).join('')}</tbody></table>
      <p id="eR" class="ohint"></p><p class="ohint">Historial de versiones: cuota ${f.historial?.dias ?? 7} días · ${f.historial?.mb ?? 200} MB (se empieza a usar con la Fase 1b). Solo informa: no copia nada.</p></div>`;
    const gits = filas.filter(c => c.git).map(c => c.ruta);
    let gs = {};
    if (gits.length) try { (await api('/api/git/resumen?rutas=' + encodeURIComponent(gits.join('|')))).forEach(g => gs[g.ruta] = g); } catch {}
    let sinCopia = 0, sinGit = 0;
    filas.forEach((c, i) => {
      const td = k => B.querySelector(`[data-${k}="${i}"]`), g = gs[c.ruta];
      if (!td('c')) return;
      if (c.git) td('g').innerHTML = g?.rama ? `⎇ ${esc(g.rama)}${g.cambios ? ` · ${g.cambios} cambio(s)` : ' ✓'}` : '⎇';
      else if (c.tipo === 'codigo' || c.tipo === 'web') { td('g').innerHTML = '<span class="owarn">⚠ sin git</span>'; sinGit++; }
      let copia;
      if (BORRADA[c.estado]) copia = `<span class="owarn">🗑 ${BORRADA[c.estado]}</span>`;
      else if (c.estado === 'desconectado') copia = '<span class="owarn">⚠ disco no conectado</span>';
      else if (c.estado === 'remota') copia = '— (etapa remota)';
      else if (c.tipo === 'respaldos') copia = '— (es la copia)';
      else if (g?.remota && !g.adelante) copia = `✓ subido (${esc(g.remota)})`;
      else if (g?.remota && g.adelante) { copia = `<span class="owarn">⚠ ↑${g.adelante} sin subir</span>`; sinCopia++; }
      else if (hayResp) copia = '✓ hay 🗄 Respaldos';
      else { copia = '<span class="owarn">⚠ sin copia</span>'; sinCopia++; }
      td('c').innerHTML = copia;
    });
    B.querySelector('#eR').textContent = `Resumen: ${sinCopia ? `${sinCopia} ⚠ sin copia` : '✓ todo con copia'} · ${sinGit ? `${sinGit} sin git` : 'git en orden'} · ${f.avisos ? `${f.avisos} carpeta(s) no disponibles` : 'todas las carpetas en su sitio'}`;
    filas.forEach(async (c, i) => { // tamaño de cada carpeta (como mucho 1,5 s cada una: «más de…» si no terminó)
      if (c.estado !== 'ok' && c.estado !== 'movida') return;
      try { const s = await api('/api/carpeta/tam?seg=1.5&ruta=' + encodeURIComponent(c.ruta)); const td = B.querySelector(`[data-t="${i}"]`); if (td) td.textContent = (s.parcial ? 'más de ' : '') + fmtSize(s.tam); } catch {}
    });
  }
  function adminLuego(f, B) {
    B.innerHTML = `<div class="opage"><p class="ohint">${O.adm.tab === 'historial' ? 'El historial de la estructura (comparar con versiones anteriores en las 3 vistas) llega en la Fase 1b.' : 'Las notas ancladas (a carpetas, archivos, páginas y párrafos) llegan en la Fase 2.'}</p></div>`;
  }

  // ===================== Fase 1b: Flujo y Red en pizarra, notas en nodos, historial y comparativo =====================
  // Los tres modos de ver (Contenedor, Flujo, Red) usan el mismo modelo: proyecto → partes → carpetas, más los conectores
  // y cajas que dibujas tú. Nada de esto mueve archivos: solo cambia la ficha (y queda en su historial).
  let cyCarga = null;
  const cargarCy = () => cyCarga ||= new Promise((res, rej) => { // Cytoscape solo cuando se abre Flujo o Red
    if (window.cytoscape) return res();
    const s = Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js' });
    s.onload = () => res(); s.onerror = () => { cyCarga = null; rej(new Error('No se pudo cargar la librería de diagramas (Cytoscape). ¿Hay internet?')); };
    document.head.append(s);
  });
  const COL = { entornos: '#2a9d8f', codigo: '#7c5cdb', material: '#d08a2c', web: '#2f7fd8', respaldos: '#8a8a8a', base_datos: '#3f9a5b', documentos: '#b05a8a', otro: '#8f8f8f' };
  const CAMBIO = { nuevo: ['#2e9e5b', '🟢', 'nuevo'], quitado: ['#d24a4a', '🔴', 'quitado'], movido: ['#e0a030', '🟠', 'movido'], cambiado: ['#3d7fd9', '🔵', 'cambiado'] };
  const destinoDe = id => id === 'p' ? 'proyecto' : id.startsWith('n:') ? 'nodo:' + id.slice(2) : id.startsWith('c:') ? 'conector:' + id.slice(2) : id; // parte:j · caja:x
  const idDeDestino = d => d === 'proyecto' || (principalActual && d === 'nodo:' + principalActual) ? 'p' : d.startsWith('nodo:') ? 'n:' + d.slice(5) : d.startsWith('conector:') ? 'c:' + d.slice(9) : d;

  // modelo común: de la ficha actual (con rutas y estados) o de una versión guardada (con el nombre de cada ancla)
  // La carpeta principal ★ ES el proyecto: es la raíz (id 'p', así siguen valiendo notas, uniones y posiciones del
  // proyecto). De ella salen en cadena las etapas de Entornos (iguales entre sí: «pasa a») y, con línea gris
  // («contiene»), las demás partes con sus carpetas. Sin carpetas: el nombre del proyecto, como antes.
  function modelo(ficha, datosDe, notasL) {
    const m = { nodos: new Map(), aristas: new Map(), notas: notasL || [], pos: ficha.posiciones || {} };
    const anc = ficha.principal || '', pr = ficha.partes.flatMap(p => p.carpetas.map(c => ({ c, p }))).find(x => x.c.ancla === anc);
    const nodoCarpeta = (c, p, id) => {
      const d = datosDe(c);
      const marca = BORRADA[d.estado] ? '🗑 ' : d.estado === 'falta' || d.estado === 'desconectado' ? '⚠ ' : '';
      const et = p.tipo === 'entornos' ? `${c.etapa || 'Etapa'}\n` : '';
      return { id, label: `${et}${marca}${d.nombre}`, ico: d.estado === 'remota' ? 'produccion' : p.tipo === 'entornos' ? icoKeyEtapa(c.etapa) : icoKey(c.icono || d.icono), clase: 'carpeta', tipo: p.tipo, parte: p.nombre, etapa: c.etapa || '',
        icono: c.icono_propio === false ? '' : c.icono || '', // solo el elegido a mano (el sugerido no es un cambio)
        icoAuto: d.icono || '', nombre: d.nombre, ruta: d.ruta, estado: d.estado || 'ok', compartida: (d.proyectos || []).length > 1, ancla: c.ancla,
        ...(String(c.ancla).startsWith('archivo:') || c.acceso ? { acceso: true, ico: 'documentos', label: `↗ ${marca}${d.nombre}` } : {}) };
    };
    if (pr) { const n = nodoCarpeta(pr.c, pr.p, 'p'); m.nodos.set('p', { ...n, ico: 'principal', clase: 'proyecto', principal: true, proyecto: ficha.nombre }); } // su icono es la ★
    else m.nodos.set('p', { id: 'p', label: ficha.nombre, ico: 'principal', clase: 'proyecto' });
    const alias = id => pr && id === 'n:' + anc ? 'p' : id; // lo que apuntaba a la carpeta principal apunta a la raíz
    // etapas de Entornos (sin la principal): en cadena desde la raíz, en su orden
    let antes = 'p';
    for (const p of ficha.partes.filter(p => p.tipo === 'entornos')) for (const c of p.carpetas) {
      if (c.ancla === anc) continue;
      const id = 'n:' + c.ancla;
      m.nodos.set(id, { ...nodoCarpeta(c, p, id), cadena: true });
      m.aristas.set(`e:${antes}>${id}`, { id: `e:${antes}>${id}`, source: antes, target: id, label: 'pasa a', clase: 'etapa' });
      antes = id;
    }
    // las demás partes salen de la raíz («contiene»); una parte que solo tenía la principal no se dibuja
    ficha.partes.forEach((p, j) => {
      const resto = p.carpetas.filter(c => c.ancla !== anc);
      if (p.tipo === 'entornos' || !resto.length) return;
      const pid = 'parte:' + j;
      m.nodos.set(pid, { id: pid, label: p.nombre, ico: p.tipo, clase: 'parte', tipo: p.tipo, clave: p.nombre });
      m.aristas.set(`h:p>${pid}`, { id: `h:p>${pid}`, source: 'p', target: pid, clase: 'jer' });
      for (const c of resto) {
        const id = 'n:' + c.ancla;
        m.nodos.set(id, nodoCarpeta(c, p, id));
        m.aristas.set(`h:${pid}>${id}`, { id: `h:${pid}>${id}`, source: pid, target: id, clase: 'jer' });
      }
    });
    for (const b of ficha.cajas || []) m.nodos.set('caja:' + b.id, { id: 'caja:' + b.id, label: b.texto, clase: 'caja', color: b.color, texto: b.texto });
    for (const c of ficha.conexiones || []) { const de = alias(c.de), a = alias(c.a); if (m.nodos.has(de) && m.nodos.has(a) && de !== a)
      m.aristas.set('c:' + c.id, { id: 'c:' + c.id, source: de, target: a, label: c.etiqueta, color: c.color || '#e0a030', dir: c.dir || '→', clase: 'tuya' }); }
    return m;
  }
  // la carpeta de una ficha en un modelo, aunque sea la principal (que se dibuja como la raíz 'p')
  const carpetaEn = (M, id) => M.nodos.get(id) || (M.nodos.get('p')?.ancla && 'n:' + M.nodos.get('p').ancla === id ? { ...M.nodos.get('p'), id } : null);
  const carpetasDe = M => [...M.nodos.values()].filter(n => n.clase === 'carpeta').concat(M.nodos.get('p')?.ancla ? [{ ...M.nodos.get('p'), id: 'n:' + M.nodos.get('p').ancla }] : []);
  let principalActual = ''; // sus notas «nodo:» se ven en la raíz, junto a las del proyecto
  const modeloActual = f => { principalActual = f.principal || ''; return modelo(f, c => c, O.adm?.notas); };
  const modeloVersion = s => modelo(s.ficha, c => ({ nombre: s.anclas[c.ancla]?.nombre || '?', ruta: s.anclas[c.ancla]?.ruta || '', estado: 'ok' }), s.notas);

  // qué cambió de A (antes) a B (ahora): id → {t: nuevo|quitado|movido|cambiado, txt}; los quitados llevan «antes:» delante
  function diferencias(A, B) {
    const out = new Map(), por = (m, cl) => [...m.nodos.values()].filter(n => n.clase === cl);
    // txt: el cambio en una frase, para la lista de ⇆ Comparar
    const nom = (M, id) => M.nodos.get(id)?.nombre || M.nodos.get(id)?.label || id;
    for (const n of carpetasDe(B)) {
      const a = carpetaEn(A, n.id);
      if (!a) out.set(n.id, { t: 'nuevo', txt: `Carpeta nueva: ${n.nombre} (en ${n.parte})` });
      else if (a.parte !== n.parte) out.set(n.id, { t: 'movido', txt: `${n.nombre}: de ${a.parte} a ${n.parte}`, antesParte: a.parte });
      else if (a.icono !== n.icono || a.nombre !== n.nombre || a.etapa !== n.etapa) out.set(n.id, { t: 'cambiado', txt: `${n.nombre}: ${[
        a.icono !== n.icono ? 'icono cambiado' : '', a.nombre !== n.nombre ? `antes se llamaba «${a.nombre}»` : '',
        a.etapa !== n.etapa ? `etapa ${a.etapa || '—'} → ${n.etapa || '—'}` : ''].filter(Boolean).join(' · ')}` });
    }
    for (const a of carpetasDe(A)) if (!carpetaEn(B, a.id)) out.set('antes:' + a.id, { t: 'quitado', txt: `Carpeta quitada: ${a.nombre} (estaba en ${a.parte})`, nodo: a });
    const rA = A.nodos.get('p'), rB = B.nodos.get('p');
    if (rA?.ancla && rB?.ancla && rA.ancla !== rB.ancla) out.set('p', { t: 'cambiado', txt: `Carpeta principal ★: antes ${rA.nombre}, ahora ${rB.nombre}` });
    const pb = new Map(por(B, 'parte').map(n => [n.clave, n])), pa = new Map(por(A, 'parte').map(n => [n.clave, n]));
    for (const [k, n] of pb) if (!pa.has(k)) out.set(n.id, { t: 'nuevo', txt: `Parte nueva: ${n.label}` });
    for (const [k, a] of pa) if (!pb.has(k)) out.set('antes:' + a.id, { t: 'quitado', txt: `Parte quitada: ${a.label}`, nodo: a });
    for (const n of por(B, 'caja')) { const a = A.nodos.get(n.id); if (!a) out.set(n.id, { t: 'nuevo', txt: `Nota libre nueva: «${n.texto}»` }); else if (a.texto !== n.texto || a.color !== n.color) out.set(n.id, { t: 'cambiado', txt: `Nota libre cambiada: «${n.texto}»` }); }
    for (const a of por(A, 'caja')) if (!B.nodos.has(a.id)) out.set('antes:' + a.id, { t: 'quitado', txt: `Nota libre quitada: «${a.texto}»`, nodo: a });
    for (const [id, e] of B.aristas) if (e.clase === 'tuya') { const a = A.aristas.get(id), que = `«${e.label || '—'}» (${nom(B, e.source)} → ${nom(B, e.target)})`;
      if (!a) out.set(id, { t: 'nuevo', txt: `Unión nueva: ${que}` }); else if (a.label !== e.label || a.color !== e.color || a.dir !== e.dir || a.source !== e.source || a.target !== e.target) out.set(id, { t: 'cambiado', txt: `Unión cambiada: ${que}` }); }
    for (const [id, a] of A.aristas) if (a.clase === 'tuya' && !B.aristas.has(id)) out.set('antes:' + id, { t: 'quitado', txt: `Unión quitada: «${a.label || '—'}» (${nom(A, a.source)} → ${nom(A, a.target)})`, arista: a });
    const na = new Map(A.notas.map(n => [n.id, n])), nb = new Map(B.notas.map(n => [n.id, n])), en = (M, d) => nom(M, idDeDestino(d)) === 'p' ? 'el proyecto' : nom(M, idDeDestino(d));
    out.notas = new Map(); // destino → nuevo|cambiado|quitado (para el color de 💬)
    for (const [id, n] of nb) { const a = na.get(id); if (!a || a.texto !== n.texto) { out.notas.set(idDeDestino(n.destino), a ? 'cambiado' : 'nuevo'); out.set('nota:' + id, { t: a ? 'cambiado' : 'nuevo', txt: `💬 Nota ${a ? 'cambiada' : 'nueva'} en ${en(B, n.destino)}`, de: idDeDestino(n.destino) }); } }
    for (const [id, a] of na) if (!nb.has(id)) { out.notas.set(idDeDestino(a.destino), 'quitado'); out.set('nota:' + id, { t: 'quitado', txt: `💬 Nota borrada de ${en(A, a.destino)}`, de: idDeDestino(a.destino) }); }
    return out;
  }
  function resumen(dif) {
    const c = { nuevo: 0, quitado: 0, movido: 0, cambiado: 0 };
    for (const [, v] of dif) c[v.t]++;
    return dif.size ? Object.entries(c).filter(([, n]) => n).map(([t, n]) => `${CAMBIO[t][1]} ${n} ${CAMBIO[t][2]}${n > 1 ? 's' : ''}`).join(' · ') : '✓ Sin cambios entre las dos';
  }

  // ---------- barra única de la vista del proyecto: vista (pestañas) e historial ----------
  const VISTAS = [['contenedor', '🗂', 'Contenedor'], ['flujo', '⇢', 'Flujo'], ['red', '◉', 'Red']];
  const pestanasVista = v => `<div class="oseg" role="tablist" title="Cómo ver el proyecto">${VISTAS.map(([k, i, t]) =>
    `<button role="tab" class="${v === k ? 'on' : ''}" aria-selected="${v === k}" data-vista="${k}" title="Vista ${t}">${i} <span>${t}</span></button>`).join('')}</div>`;
  const grupoHistorial = `<span class="osepv"></span><button class="obtn" data-h="comparar" title="Compara la estructura de ahora con una versión anterior (en una ventana)">⇆ <span>Comparar…</span></button>
    <button class="obtn" data-h="guardar" title="Guarda cómo está ahora la estructura, con un nombre">🏷 <span>Guardar versión</span></button>`;
  function cablearBarra(f, B) {
    B.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { if (O.adm.vista === b.dataset.vista) return; O.adm.vista = b.dataset.vista; guardarVista(); admin(); });
    B.querySelector('[data-h="comparar"]').onclick = () => comparar(f);
    B.querySelector('[data-h="guardar"]').onclick = () => guardarVersionNombre(f);
  }
  async function guardarVersionNombre(f) {
    const n = await ask('Guardar versión', 'Nombre de la versión (p. ej. «v3 · antes de reorganizar material»):', ['Guardar', 'Cancelar'], { input: '' });
    if (!n?.trim()) return;
    try { await api('/api/org/version/nombre', { id: f.id, nombre: n.trim() }); flash(`🏷 Versión «${n.trim()}» guardada`); if (O.adm?.tab === 'historial') admin(); } catch (e) { err(e); }
  }

  // ---------- ⇆ Comparar la estructura: una ventana como la comparación de git ----------
  // Izquierda: las versiones (🏷 con nombre, ⎇ commits, · automáticas). Derecha: Antes | Ahora lado a lado (Flujo, Red o
  // Árbol, con zoom y desplazamiento a la par) y debajo los cambios en frases: clic o ↑ ↓ para ir a cada uno.
  const fechaV = s => String(s || '').replace('T', ' ').slice(0, 16);
  async function cargarVersion(v) {
    O.adm.cache ||= {};
    return O.adm.cache[v] ||= modeloVersion(await api(`/api/org/version?id=${encodeURIComponent(O.adm.id)}&v=${encodeURIComponent(v)}`));
  }
  function arbolComparado(M, dif, antes) { // el árbol de una versión, con las marcas de color (data-k: la clave del cambio)
    const clave = id => antes && dif.has('antes:' + id) ? 'antes:' + id : id;
    const marca = id => { const d = dif.get(clave(id)); return d && (antes ? d.t !== 'nuevo' : d.t !== 'quitado') ? 'oc-' + d.t : 'oc-ctx'; };
    return [...M.nodos.values()].filter(n => n.clase === 'parte').map(p => `<div class="oparte"><div class="ophead ${marca(p.id)}" data-k="${esc(clave(p.id))}">${icoT(p.tipo)} ${esc(p.label)}</div>
      ${[...M.nodos.values()].filter(n => n.clase === 'carpeta' && n.parte === p.clave).map(n => `<div class="onodo raiz ${marca(n.id)}" data-k="${esc(clave(n.id))}" title="${esc(n.ruta || '')}">
        <span class="otw"></span><span>${svgI(n.ico || 'carpeta', COLT[n.tipo])}</span><span class="onom">${esc(n.nombre)}</span>${n.etapa ? `<small>${icoE(n.etapa)} ${esc(n.etapa)}</small>` : ''}</div>`).join('') || '<div class="osmall" style="padding:2px 12px">(sin carpetas)</div>'}</div>`).join('')
      || '<p class="ohint">Sin partes.</p>';
  }
  async function comparar(f, elegida) {
    const d = abrirDlg(`⇆ Comparar la estructura · ${esc(f.nombre)}`, '<p class="ohint">Cargando versiones…</p>', { ancho: 1500,
      pie: '<button class="obtn" id="kRes" title="La estructura vuelve a como estaba en esa versión (antes se guarda la de ahora)">↶ Restaurar esta versión…</button><span class="sp"></span><button class="obtn primary" id="kX">Cerrar</button>' });
    d.dataset.tipo = 'cmp'; d.oninput = null; // marcar «Solo cambios» no es un cambio sin guardar
    const cys = [];
    const limpiar = () => { while (cys.length) { try { cys.pop().destroy(); } catch {} } };
    d.onclose = () => { pararPoll(); limpiar(); delete d.dataset.tipo; d.onkeydown = null; };
    d.querySelector('#kX').onclick = () => cerrarDlg();
    let vs;
    try { vs = await api('/api/org/versiones?id=' + encodeURIComponent(f.id)); } catch (e) { d.querySelector('.odb').innerHTML = `<p class="owarn">⚠ ${esc(e.message)}</p>`; return; }
    const linea = [
      ...vs.versiones.map(v => ({ v: v.v, fecha: v.fecha, ico: v.auto ? '·' : '🏷', txt: v.auto ? String(v.resumen || 'Cambio').replace('conectores', 'uniones').replace(/ · 0 (uniones|notas)/g, '') : v.nombre, sub: v.auto ? 'automática' : 'con nombre' })),
      ...vs.commits.filter(c => c.v).map(c => ({ v: c.v, fecha: c.fecha, ico: '⎇', txt: `${c.corto} · ${c.titulo}`, sub: 'commit del código' })),
    ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    if (!linea.length) { d.querySelector('.odb').innerHTML = '<p class="ohint">Todavía no hay versiones: se crean solas con cada cambio de la estructura.</p>'; return; }
    const cmp = O.adm.cmp;
    cmp.vista ||= O.adm.vista === 'contenedor' ? 'arbol' : O.adm.vista;
    let sel = Math.max(0, linea.findIndex(l => l.v === (elegida || cmp.v)));
    if (!elegida && !cmp.v && linea.length > 1) sel = 1; // la más nueva suele ser la de ahora mismo
    d.querySelector('.odb').innerHTML = `<div class="ocmp">
      <div class="ocmpv"><div class="ocmpvi oahora"><span>●</span><b>Ahora</b><small>lo que ves</small></div>
        ${linea.map((l, i) => `<button class="ocmpvi" data-i="${i}" title="${esc(l.txt)}"><span>${l.ico}</span><b>${esc(l.txt)}</b><small>${fechaV(l.fecha)} · ${l.sub}</small></button>`).join('')}</div>
      <section class="ocmpd">
        <div class="ocmpbar2">${`<div class="oseg">${[['flujo', '⇢ Flujo'], ['red', '◉ Red'], ['arbol', '🗂 Árbol']].map(([k, t]) => `<button data-cv="${k}" class="${cmp.vista === k ? 'on' : ''}">${t}</button>`).join('')}</div>`}
          <label><input type="checkbox" id="kS" ${cmp.solo ? 'checked' : ''}> Solo cambios</label><span class="sp"></span><span id="kR" class="osmall"></span></div>
        <div class="ocmplados"><div class="ocmplado"><span class="oetq">Antes · <span id="kA"></span></span><div class="ocmplz" id="kcA"></div></div>
          <div class="ocmplado"><span class="oetq">Ahora</span><div class="ocmplz" id="kcB"></div></div></div>
        <div class="ocmpcam"><div class="ocmpcab"><b id="kN">Cambios</b><span class="osmall">Clic en uno, o ↑ ↓, para ir a él en los dos lados</span></div><div class="ocmplista"></div></div>
      </section></div>`;
    const $d = q => d.querySelector(q), lista = $d('.ocmplista');
    let tok = 0, cambios = [], actual = -1, ir = () => {};
    async function pintar() {
      const t = ++tok, l = linea[sel];
      cmp.v = l.v; guardarVista();
      d.querySelectorAll('.ocmpvi[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === sel));
      $d('#kA').textContent = `${l.ico === '·' ? '' : l.ico + ' '}${l.txt.slice(0, 40)} · ${fechaV(l.fecha)}`;
      $d('#kR').textContent = 'Cargando…';
      let A;
      try { A = await cargarVersion(l.v); } catch (e) { $d('#kR').textContent = '⚠ ' + e.message; return; }
      if (t !== tok || !d.open) return;
      const N = modeloActual(f), dif = diferencias(A, N), cA = $d('#kcA'), cB = $d('#kcB');
      $d('#kR').textContent = resumen(dif);
      limpiar(); cA.innerHTML = cB.innerHTML = ''; cA.className = cB.className = 'ocmplz';
      if (cmp.vista === 'arbol') {
        cA.classList.add('otree'); cB.classList.add('otree');
        cA.classList.toggle('osolo', !!cmp.solo); cB.classList.toggle('osolo', !!cmp.solo);
        cA.innerHTML = arbolComparado(A, dif, true); cB.innerHTML = arbolComparado(N, dif, false);
        ir = k => { for (const c of [cA, cB]) { const el = c.querySelector(`[data-k="${CSS.escape(k)}"]`) || c.querySelector(`[data-k="${CSS.escape(k.replace(/^antes:/, ''))}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.remove('oc-flash'); void el.offsetWidth; el.classList.add('oc-flash'); } } };
      } else {
        try { await cargarCy(); } catch (e) { cB.innerHTML = `<p class="oempty">⚠ ${esc(e.message)}</p>`; return; }
        if (t !== tok || !d.open) return;
        const cyA = dibujar(cA, A, cmp.vista, null, null, f, true), cyB = dibujar(cB, N, cmp.vista, dif, A, f, true);
        cys.push(cyA, cyB);
        cyA.batch(() => { // antes: lo quitado en rojo y lo movido o cambiado en su color; lo demás atenuado
          cyA.elements().addClass('c-ctx');
          for (const [k, x] of dif) { const el = cyA.getElementById(k.replace(/^antes:/, '')); if (el.length && x.t !== 'nuevo') el.removeClass('c-ctx').addClass('c-' + x.t); }
        });
        for (const cy of [cyA, cyB]) { cy.fit(undefined, 30); if (cy.zoom() > 1.2) { cy.zoom(1.2); cy.center(); } }
        let sinc = false; // zoom y desplazamiento a la par
        const par = (a, b) => a.on('viewport', () => { if (sinc) return; sinc = true; b.viewport({ zoom: a.zoom(), pan: a.pan() }); sinc = false; });
        par(cyB, cyA); par(cyA, cyB); cyA.viewport({ zoom: cyB.zoom(), pan: cyB.pan() });
        ir = k => {
          const enB = cyB.getElementById(k), enA = cyA.getElementById(k.replace(/^antes:/, ''));
          const el = enB.length ? enB : enA; if (!el.length) return;
          (enB.length ? cyB : cyA).animate({ center: { eles: el }, zoom: Math.max(cyB.zoom(), 1) }, { duration: 250 });
          for (const e of [enA, enB]) if (e.length) e.flashClass('destello', 900);
        };
      }
      cambios = [...dif].map(([k, x]) => ({ k: k.startsWith('nota:') ? x.de : k, x }));
      $d('#kN').textContent = cambios.length ? `Cambios (${cambios.length})` : 'Cambios';
      lista.innerHTML = cambios.map((c, j) => `<div class="ocmpc" data-j="${j}"><span>${CAMBIO[c.x.t][1]}</span>${esc(c.x.txt)}</div>`).join('')
        || '<p class="ohint">✓ Esta versión es igual a la de ahora. Elige otra a la izquierda.</p>';
      actual = -1;
    }
    const paso = j => { if (!cambios.length) return; actual = (j + cambios.length) % cambios.length;
      lista.querySelectorAll('.ocmpc').forEach(r => r.classList.toggle('on', +r.dataset.j === actual));
      lista.querySelector(`[data-j="${actual}"]`)?.scrollIntoView({ block: 'nearest' }); ir(cambios[actual].k); };
    lista.onclick = e => { const r = e.target.closest('.ocmpc'); if (r) paso(+r.dataset.j); };
    d.querySelector('.ocmpv').onclick = e => { const b = e.target.closest('.ocmpvi[data-i]'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; pintar(); } };
    d.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => { cmp.vista = b.dataset.cv; d.querySelectorAll('[data-cv]').forEach(x => x.classList.toggle('on', x === b)); guardarVista(); pintar(); });
    $d('#kS').onchange = e => { cmp.solo = e.target.checked; guardarVista(); pintar(); };
    d.onkeydown = e => { // ↑ ↓: cambio anterior / siguiente (fuera de cuadros de texto)
      if (e.target.closest('input, textarea, select') || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault(); paso(actual + (e.key === 'ArrowDown' ? 1 : -1));
    };
    $d('#kRes').onclick = async () => {
      const l = linea[sel];
      if (await ask('Restaurar versión', `La estructura (partes, carpetas, uniones, notas libres, posiciones y notas) vuelve a como estaba en «${l.txt}» (${fechaV(l.fecha)}). Antes se guarda la de ahora como versión «antes de restaurar». No se mueve ningún archivo.`, ['Restaurar', 'Cancelar']) !== 'Restaurar') return;
      try { await api('/api/org/version/restaurar', { id: f.id, v: l.v }); O.adm.cache = {}; dlg.close(); flash('↶ Estructura restaurada'); await cargar(); } catch (e) { err(e); }
    };
    pintar();
  }

  // ---------- Flujo y Red: pizarra sin límites ----------
  let cyActual = null;
  async function adminPizarra(f, B) {
    const vista = O.adm.vista;
    // una sola barra: vista (pestañas) · dibujar · historial · ver. En ventana estrecha los botones quedan en su icono
    B.innerHTML = `<div class="opiz"><div class="opizbar obarra">${pestanasVista(vista)}<span class="osepv"></span>
        <button class="obtn" id="pC" title="Une dos nodos con una flecha: clic en uno y luego en otro (C)">⟶ <span>Unir</span></button>
        <button class="obtn" id="pK" title="Un recuadro con texto en la pizarra, sin carpeta (también: doble clic en un espacio vacío)">▭ <span>Nota libre</span></button>
        <button class="obtn" id="pP" title="Cierra todas las carpetas desplegadas con doble clic">▴ <span>Plegar todo</span></button>
        <button class="obtn" id="pR" title="Vuelve a colocar todo solo; lo que moviste a mano queda en el Historial">↺ <span>Ordenar</span></button>
        ${grupoHistorial}
        <span class="sp"></span><span class="osmall opistat" id="pS" hidden></span>
        <button class="obtn ${O.adm.info.abierto ? 'primary' : ''}" id="pI1" title="Panel de información de lo que eliges (I)&#10;Pizarra: arrastra para moverte · rueda: subir y bajar · Ctrl+rueda: zoom · 0: ver todo · C: unir">ⓘ</button>
        <button class="obtn" id="pM" title="Mostrar u ocultar el minimapa">🗺</button>
        <button class="obtn" id="pF" title="Ver todo (0)">⤢ <span>Ver todo</span></button><button class="obtn" id="pZm" title="Alejar">−</button><span id="pZ" class="osmall">100 %</span><button class="obtn" id="pZp" title="Acercar">+</button></div>
      <div class="opizcuerpo"><div class="olienzos"><div class="olienzo" id="cyA"></div></div><div class="oinfo" id="pI" hidden></div><div class="onotas" id="pN" hidden></div></div></div>`;
    cablearBarra(f, B);
    try { await cargarCy(); } catch (e) { B.querySelector('.olienzos').innerHTML = `<p class="oempty">⚠ ${esc(e.message)}</p>`; return; }
    const N = modeloActual(f);
    const lienzos = B.querySelector('.olienzos');
    const cy = dibujar(lienzos.querySelector('#cyA'), N, vista, null, null, f);
    cyActual = cy;
    // vista guardada por proyecto: zoom y posición de cada vista
    const cam = O.adm.cam?.[vista];
    const encuadrar = () => { cy.fit(undefined, 40); if (cy.zoom() > 1.2) { cy.zoom(1.2); cy.center(); } }; // pocos nodos: sin acercar de más
    if (cam) cy.viewport(cam); else encuadrar();
    B.querySelector('#pF').onclick = encuadrar;
    const zoomTxt = () => B.querySelector('#pZ').textContent = Math.round(cy.zoom() * 100) + ' %';
    let tc; cy.on('viewport', () => { zoomTxt(); clearTimeout(tc); tc = setTimeout(() => { (O.adm.cam ||= {})[vista] = { zoom: cy.zoom(), pan: cy.pan() }; guardarVista(); }, 400); });
    zoomTxt();
    B.querySelector('#pZm').onclick = () => cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    B.querySelector('#pZp').onclick = () => cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    B.querySelector('#pR').onclick = async () => {
      if (await ask('Ordenar', `Todo se vuelve a colocar solo en ${vista === 'flujo' ? 'Flujo' : 'Red'}. Las posiciones que diste a mano quedan en el Historial (se pueden recuperar).`, ['Ordenar', 'Cancelar']) !== 'Ordenar') return;
      const pos = { ...(f.posiciones || {}) }; pos[vista] = {}; await guardarDiagrama(f, { posiciones: pos }); admin();
    };
    // minimapa (se recuerda si está a la vista)
    const mini = minimapa(lienzos.querySelector('#cyA'), cy);
    mini.hidden = O.adm.mini === false;
    B.querySelector('#pM').onclick = () => { mini.hidden = !mini.hidden; O.adm.mini = !mini.hidden; guardarVista(); };
    // conectar: clic en un nodo y luego en otro
    let conectar = false, origen = null;
    const modoC = v => { conectar = v; origen = null; cy.nodes().removeClass('origen'); B.querySelector('#pC').classList.toggle('primary', v); const s = B.querySelector('#pS'); s.hidden = !v; s.textContent = v ? '⟶ Clic en el primero y luego en el segundo (Esc: cancelar)' : ''; };
    B.querySelector('#pC').onclick = () => modoC(!conectar);
    B.querySelector('#pP').onclick = () => { // plegar todo lo desplegado en esta vista
      cy.remove('.sub, .mas'); cy.nodes('.abierta').removeClass('abierta'); O.adm.exp[vista] = []; guardarVista();
    };
    B.querySelector('#pK').onclick = () => nuevaCaja(f, cy, { x: cy.width() / 2, y: cy.height() / 2 });
    cy.on('tap', 'node', async e => {
      const n = e.target;
      if (!conectar || n.hasClass('fantasma')) return;
      if (!origen) { origen = n; n.addClass('origen'); return; }
      if (origen.id() === n.id()) return;
      const de = origen.id(); modoC(false);
      const etiqueta = await ask('Nueva unión', `De «${cy.getElementById(de).data('label')}» a «${n.data('label')}». Etiqueta (p. ej. «usa», «genera», «se publica en»):`, ['Crear', 'Cancelar'], { input: '' });
      if (etiqueta === null) return;
      await guardarDiagrama(f, { conexiones: [...(f.conexiones || []), { id: 'c' + Date.now().toString(36), de, a: n.id(), etiqueta: etiqueta.trim(), color: '#e0a030', dir: '→' }] });
      admin();
    });
    // doble clic en un espacio vacío (en el mismo sitio: dos clics seguidos en nodos distintos no cuentan): caja nueva
    let fondo = 0; cy.on('tap', e => { fondo = e.target === cy ? Date.now() : 0; });
    lienzos.querySelector('#cyA').addEventListener('dblclick', ev => {
      if (conectar || Date.now() - fondo > 500) return;
      const r = ev.currentTarget.getBoundingClientRect(); nuevaCaja(f, cy, { x: ev.clientX - r.left, y: ev.clientY - r.top });
    });
    // clic: su información en el panel ⓘ. Doble clic (dos clics en el MISMO nodo; el dbltap de Cytoscape no mira si es el
    // mismo) en una carpeta: despliega o pliega su contenido ahí mismo (subflujo · subred); en un archivo: lo abre en una pestaña
    const panel = B.querySelector('#pI');
    let ultimo = { id: '', t: 0 };
    cy.on('tap', 'node', e => {
      const n = e.target, doble = ultimo.id === n.id() && Date.now() - ultimo.t < 450;
      ultimo = { id: n.id(), t: Date.now() };
      if (conectar || n.hasClass('fantasma') || n.data('clase') === 'caja') return;
      if (n.data('clase') === 'mas') return infoMostrar(f, panel, { tipo: 'carpeta', ruta: n.data('ruta') });
      const sel = selDeNodo(n);
      if (sel) infoMostrar(f, panel, sel);
      if (!doble) return;
      if ((sel?.tipo === 'carpeta' || n.data('principal')) && n.data('ruta') && (n.data('clase') === 'sub' || ['ok', 'movida'].includes(n.data('estado')))) desplegar(f, cy, n);
      else if (sel?.tipo === 'archivo') abrirEnContenedor(sel.ruta);
    });
    cy.on('cxttap', 'node, edge', e => menuElemento(f, cy, e.target, e.originalEvent));
    cy.on('cxttap', e => { if (e.target === cy) openMenu({ x: e.originalEvent?.clientX ?? 200, y: e.originalEvent?.clientY ?? 200 }, [{ head: f.nombre }, ['＋ Añadir carpetas…', () => nuevoProyecto(f)]]); });
    cy.on('tap', 'edge[clase="tuya"], node[clase="caja"]', e => { if (!conectar) menuElemento(f, cy, e.target, e.originalEvent); });
    let tp; cy.on('dragfree', 'node', () => { clearTimeout(tp); tp = setTimeout(() => { // posiciones de esta vista, en la ficha
      const pos = { ...(f.posiciones || {}) }; pos[vista] = {};
      cy.nodes().not('.fantasma, .sub').forEach(n => { pos[vista][n.id()] = n.position(); }); // lo desplegado no se guarda: se recoloca al abrir
      guardarDiagrama(f, { posiciones: pos });
    }, 600); });
    if (vista === 'red') { // pasar el ratón: resalta sus vecinos
      let th, movido = 0, atenuado = false;
      const limpiar = () => { clearTimeout(th); if (atenuado) { cy.batch(() => cy.elements('.atenuado').removeClass('atenuado')); atenuado = false; } };
      cy.on('viewport', () => { movido = Date.now(); limpiar(); });
      cy.on('mouseover', 'node', e => { clearTimeout(th); th = setTimeout(() => { // el ratón se quedó encima (no solo pasó al moverte)
        if (Date.now() - movido < 300) return;
        const v = e.target.closedNeighborhood(); cy.batch(() => cy.elements().not(v).addClass('atenuado')); atenuado = true;
      }, 180); });
      cy.on('mouseout', 'node', limpiar);
      cy.on('grab', limpiar);
    }
    // teclado de la pizarra (solo con la vista a la vista y sin escribir en un cuadro)
    B.querySelector('.opiz').tabIndex = 0;
    B.querySelector('.opiz').onkeydown = e => {
      if (e.target.closest('input, textarea, select')) return;
      const k = e.key, paso = 60;
      if (k === '0') { cy.fit(undefined, 40); if (cy.zoom() > 1.2) { cy.zoom(1.2); cy.center(); } }
      else if (k === 'c' || k === 'C') modoC(!conectar);
      else if (k === 'Escape' && conectar) { e.stopPropagation(); modoC(false); }
      else if ((k === 'i' || k === 'I') && !e.ctrlKey && !e.altKey) infoAlternar(f, panel, B);
      else if (k === 'Escape' && !panel.hidden) { e.stopPropagation(); infoAlternar(f, panel, B, false); }
      else if (k.startsWith('Arrow')) cy.panBy({ x: k === 'ArrowLeft' ? paso : k === 'ArrowRight' ? -paso : 0, y: k === 'ArrowUp' ? paso : k === 'ArrowDown' ? -paso : 0 });
      else if (k === 'Delete') { const s = cy.$(':selected').filter('[clase="tuya"], [clase="caja"]'); if (s.length) borrarElementos(f, s); }
      else return;
      e.preventDefault();
    };
    notasCapa(f, cy, lienzos.querySelector('#cyA'), B.querySelector('#pN'), null);
    B.querySelector('#pI1').onclick = () => infoAlternar(f, panel, B);
    for (const r of [...(O.adm.exp[vista] || [])].sort((a, b) => a.length - b.length)) { // lo que dejaste desplegado
      const n = cy.nodes().filter(x => x.data('ruta') === r && (x.data('clase') === 'carpeta' || x.data('dir')));
      if (n.length) await desplegar(f, cy, n[0], true);
    }
    if (O.adm.info.abierto) infoMostrar(f, panel, O.adm.info.sel || { tipo: 'proyecto' });
  }
  // dibuja un modelo en un lienzo; con «dif», marca los cambios y añade los quitados como fantasma
  // ancho del texto de un nodo (la línea más larga), con la misma letra que usa la pizarra
  const medidor = document.createElement('canvas').getContext('2d');
  function anchoTexto(t, clase) {
    const [tam, peso] = clase === 'proyecto' ? [14, 700] : clase === 'parte' ? [12, 600] : [12, 400];
    medidor.font = `${peso} ${tam}px "Segoe UI", system-ui, sans-serif`;
    // con espacios, la pizarra parte la línea a los 170 px (text-max-width); sin espacios no puede: va entera
    return Math.max(10, ...String(t || '').split('\n').map(l => { const w = medidor.measureText(l).width; return /\s/.test(l.trim()) ? Math.min(170, w) : w; }));
  }
  const corto = t => String(t || '').split('\n').map(l => [...l].length > 30 ? [...l].slice(0, 29).join('') + '…' : l).join('\n'); // nombres largos con «…» (entero al pasar el ratón)
  function dibujar(cont, M, vista, dif, A, f, soloLectura = false) {
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
    const els = [];
    const kDif = n => n.id === 'p' && n.ancla && !dif.has('p') ? 'n:' + n.ancla : n.id; // la raíz es la carpeta principal
    for (const n of M.nodos.values()) els.push({ group: 'nodes', data: { ...n }, classes: [n.clase, n.cadena ? 'cadena' : '', n.principal ? 'principal' : '', dif ? (dif.has(kDif(n)) ? 'c-' + dif.get(kDif(n)).t : 'c-ctx') : ''].join(' ') });
    for (const e of M.aristas.values()) els.push({ group: 'edges', data: { ...e, label: e.label || '' }, classes: [e.clase, e.dir === '↔' ? 'doble' : e.dir === '—' ? 'sin' : '', dif ? (dif.has(e.id) ? 'c-' + dif.get(e.id).t : 'c-ctx') : ''].join(' ') });
    if (dif && A) { // quitados: fantasma donde estaban; movidos: flecha tenue desde su parte de antes
      const parteAhora = clave => [...M.nodos.values()].find(n => n.clase === 'parte' && n.clave === clave)?.id;
      for (const [k, d] of dif) {
        if (d.t === 'quitado' && d.nodo) {
          els.push({ group: 'nodes', data: { ...d.nodo, id: k, label: d.nodo.label }, classes: `${d.nodo.clase} fantasma c-quitado`, position: A.pos?.[vista]?.[d.nodo.id] });
          const padre = d.nodo.clase === 'carpeta' ? parteAhora(d.nodo.parte) || 'p' : 'p';
          if (d.nodo.clase !== 'caja') els.push({ group: 'edges', data: { id: 'g:' + k, source: padre, target: k }, classes: 'fantasma c-quitado' });
        } else if (d.t === 'quitado' && d.arista && M.nodos.has(d.arista.source) && M.nodos.has(d.arista.target)) {
          els.push({ group: 'edges', data: { ...d.arista, id: k, label: d.arista.label || '' }, classes: 'tuya fantasma c-quitado' });
        } else if (d.t === 'movido') {
          const de = parteAhora(d.antesParte), a = M.nodos.has(k) ? k : M.nodos.get('p')?.ancla === k.slice(2) ? 'p' : '';
          if (de && a) els.push({ group: 'edges', data: { id: 'm:' + k, source: de, target: a }, classes: 'fantasma c-movido' });
        }
      }
    }
    const pos = M.pos?.[vista] || {}, conPos = els.filter(e => e.group === 'nodes' && pos[e.data.id]).length, nNodos = els.filter(e => e.group === 'nodes').length;
    for (const e of els) if (e.group === 'nodes' && pos[e.data.id]) e.position = { ...pos[e.data.id] };
    const flujo = vista === 'flujo';
    for (const e of els) if (e.group === 'nodes') { // Red: nombre corto; Flujo: hueco a la izquierda para el icono
      e.data.corto = corto(e.data.label);
      if (e.data.ico && flujo) e.data.anchoF = anchoTexto(e.data.label, e.data.clase) + 22; // + el hueco del icono (a la izquierda)
    }
    const lado = (l, est) => ({ selector: `node[lado="${l}"]`, style: est });
    const cy = cytoscape({
      container: cont, elements: els, wheelSensitivity: 0.3, userZoomingEnabled: false, boxSelectionEnabled: false, autoungrabify: soloLectura,
      // sin «imagen al moverse» (textureOnViewport): dejaba ver un recuadro gris (la sombra) al desplazarse
      layout: { name: 'preset' }, // el acomodo va aparte, sin las flechas «pasa a» (si no, cada etapa bajaría un nivel)
      style: [
        { selector: 'core', style: { 'active-bg-opacity': 0, 'selection-box-opacity': 0 } }, // sin el círculo gris al pulsar el fondo
        { selector: 'node', style: { label: 'data(label)', 'font-size': 12, 'font-family': 'Segoe UI, system-ui, sans-serif', color: css('--ink'), 'text-wrap': 'wrap', 'text-max-width': 170,
          'background-color': n => COL[n.data('tipo')] || '#8f8f8f', 'border-width': 1, 'border-color': css('--line') } },
        { selector: 'node.carpeta', style: flujo ? { shape: 'round-rectangle', width: 'label', height: 'label', padding: 8, 'text-valign': 'center', 'background-opacity': .18, 'border-color': n => COL[n.data('tipo')] || '#8f8f8f', 'border-width': 1.5 }
          : { shape: 'ellipse', width: 20, height: 20, 'text-valign': 'bottom', 'text-margin-y': 4 } },
        { selector: 'node.parte', style: flujo ? { shape: 'round-rectangle', width: 'label', height: 'label', padding: 10, 'text-valign': 'center', 'font-weight': 600, 'background-opacity': .3, 'border-color': n => COL[n.data('tipo')] || '#8f8f8f', 'border-width': 2 }
          : { shape: 'ellipse', width: 26, height: 26, 'text-valign': 'bottom', 'text-margin-y': 4, 'font-weight': 600 } },
        { selector: 'node.proyecto', style: { shape: flujo ? 'round-rectangle' : 'ellipse', width: flujo ? 'label' : 32, height: flujo ? 'label' : 32, padding: 12, 'background-color': css('--accent'), 'background-opacity': flujo ? .25 : 1,
          'border-color': css('--accent'), 'border-width': 2, 'font-size': 14, 'font-weight': 700, 'text-valign': flujo ? 'center' : 'bottom', 'text-margin-y': flujo ? 0 : 5 } },
        // ★ la carpeta principal: doble borde; las etapas, del mismo tamaño que ella (son iguales)
        { selector: 'node.principal', style: { 'border-style': 'double', 'border-width': 5, ...(flujo ? { padding: 14 } : { width: 38, height: 38 }) } },
        { selector: 'node.cadena', style: flujo ? { padding: 14, 'font-size': 13, 'border-width': 2 } : { width: 30, height: 30 } },
        // iconos monocromos dibujados en el nodo: en Flujo a la izquierda del nombre (con el color del tipo); en Red, en blanco dentro del círculo
        { selector: 'node[ico]', style: flujo
          ? { width: 'data(anchoF)', 'text-margin-x': 11, 'background-image': n => icoUrl(n.data('ico'), n.data('clase') === 'proyecto' ? css('--ink') : COL[n.data('tipo')] || '#8f8f8f'),
            'background-width': 15, 'background-height': 15, 'background-position-x': '0px', 'background-position-y': '50%', 'background-repeat': 'no-repeat', 'background-clip': 'none', 'background-image-containment': 'over' }
          : { 'background-image': n => icoUrl(n.data('ico'), '#ffffff'), 'background-width': '60%', 'background-height': '60%', 'background-repeat': 'no-repeat' } },
        // lo desplegado con doble clic (subflujo · subred): más pequeño y con borde punteado
        { selector: 'node.sub, node.mas', style: flujo ? { label: 'data(corto)', shape: 'round-rectangle', width: 'label', height: 'label', padding: 5, 'font-size': 11, 'text-valign': 'center',
          'background-opacity': .06, 'border-style': 'dashed', 'border-color': n => COL[n.data('tipo')] || '#8f8f8f' }
          : { label: 'data(corto)', shape: 'ellipse', width: 8, height: 8, 'font-size': 10, 'background-color': n => COL[n.data('tipo')] || '#8f8f8f', 'background-opacity': .55 } },
        ...(flujo ? [{ selector: 'node.sub[ico]', style: { width: 'data(anchoF)', 'text-margin-x': 11 } }] : []),
        { selector: 'node.subarch', style: flujo ? { 'border-style': 'dotted', 'border-color': css('--line') } : { 'background-color': css('--muted') } },
        { selector: 'node.mas', style: { 'font-style': 'italic', color: css('--muted') } },
        { selector: 'edge.sub', style: { width: 1, 'line-color': css('--line'), 'line-style': 'dashed' } },
        { selector: 'node.abierta', style: { 'border-width': 3, 'border-style': 'double' } },
        ...(flujo ? [] : [ // Red: etiqueta corta, con fondo (una línea no la tacha) y hacia fuera del centro
          { selector: 'node.carpeta, node.parte, node.sub, node.mas', style: { label: 'data(corto)', 'text-background-color': css('--bg'), 'text-background-opacity': .85, 'text-background-padding': 2, 'text-background-shape': 'roundrectangle', 'text-max-width': 400 } },
          lado('der', { 'text-halign': 'right', 'text-valign': 'center', 'text-margin-x': 6, 'text-margin-y': 0, 'text-justification': 'left' }),
          lado('izq', { 'text-halign': 'left', 'text-valign': 'center', 'text-margin-x': -6, 'text-margin-y': 0, 'text-justification': 'right' }),
          lado('arr', { 'text-halign': 'center', 'text-valign': 'top', 'text-margin-y': -4 }),
          lado('aba', { 'text-halign': 'center', 'text-valign': 'bottom', 'text-margin-y': 4 }),
        ]),
        { selector: 'node.caja', style: { shape: 'round-rectangle', width: 'label', height: 'label', padding: 10, 'background-color': n => n.data('color') || '#e8d9a8', 'background-opacity': .85, 'border-color': '#b59a4a', 'text-valign': 'center', color: '#222' } },
        { selector: 'edge', style: { width: 1.2, 'line-color': css('--faint'), 'curve-style': 'bezier', 'target-arrow-shape': 'none' } },
        { selector: 'edge.jer', style: { 'line-color': css('--muted'), 'line-opacity': .55, width: 1.2 } }, // «contiene»: fina y gris
        { selector: 'edge.tuya', style: { width: 2.2, 'line-color': e => e.data('color') || '#e0a030', 'target-arrow-color': e => e.data('color') || '#e0a030', 'source-arrow-color': e => e.data('color') || '#e0a030',
          'target-arrow-shape': 'triangle', label: 'data(label)', 'font-size': 11, color: css('--ink'), 'text-background-color': css('--bg'), 'text-background-opacity': .9, 'text-background-padding': 2 } },
        { selector: 'edge.tuya.doble', style: { 'source-arrow-shape': 'triangle' } },
        { selector: 'edge.tuya.sin', style: { 'target-arrow-shape': 'none' } },
        { selector: 'edge.etapa', style: { width: 2.5, 'line-color': '#2a9d8f', 'target-arrow-color': '#2a9d8f', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
          label: 'data(label)', 'font-size': 10, color: css('--muted'), 'text-background-color': css('--bg'), 'text-background-opacity': .9, 'text-background-padding': 2 } },
        { selector: '.origen', style: { 'border-color': '#e0a030', 'border-width': 4 } },
        { selector: ':selected', style: { 'border-color': css('--accent'), 'border-width': 3, 'line-color': css('--accent') } },
        { selector: '.atenuado', style: { opacity: .15 } },
        { selector: '.c-ctx', style: { opacity: O.adm?.cmp?.solo ? 0 : .3 } },
        { selector: '.c-nuevo', style: { 'border-color': CAMBIO.nuevo[0], 'border-width': 4, 'line-color': CAMBIO.nuevo[0] } },
        { selector: '.c-quitado', style: { 'border-color': CAMBIO.quitado[0], 'border-width': 3, 'border-style': 'dashed', 'line-color': CAMBIO.quitado[0], 'line-style': 'dashed', opacity: .75, 'text-decoration': 'line-through' } },
        { selector: '.c-movido', style: { 'border-color': CAMBIO.movido[0], 'border-width': 4, 'line-color': CAMBIO.movido[0] } },
        { selector: 'edge.c-movido', style: { 'line-style': 'dashed', opacity: .6, 'target-arrow-shape': 'triangle', 'target-arrow-color': CAMBIO.movido[0] } },
        { selector: '.c-cambiado', style: { 'border-color': CAMBIO.cambiado[0], 'border-width': 4, 'line-color': CAMBIO.cambiado[0] } },
        { selector: '.destello', style: { 'overlay-color': css('--accent'), 'overlay-opacity': .25, 'overlay-padding': 8 } },
      ],
    });
    cont._cy = cy; // para inspeccionar desde la consola si hace falta
    cy.scratch('soloLectura', soloLectura);
    if (conPos < nNodos) flujo ? flujoCadena(cy) : radial(cy);
    cont.dataset.menuPropio = '1'; // DeskLens no pone su menú general aquí: lo pone la pizarra
    new ResizeObserver(() => cy.resize()).observe(cont); // panel de notas abierto, ventana más ancha…: el dibujo se ajusta
    cont.addEventListener('contextmenu', e => e.preventDefault());
    if (conPos && conPos < nNodos) for (const e of els) if (e.group === 'nodes' && pos[e.data.id]) cy.getElementById(e.data.id).position(pos[e.data.id]);
    if (!flujo) { // Red: cada etiqueta hacia fuera del centro (también tras mover un nodo a mano)
      ladosRed(cy);
      cy.on('free', 'node', e => ladosRed(cy, e.target.id() === 'p' ? null : e.target));
      cy.on('mouseover', 'node', e => { cont.title = e.target.data('label') !== e.target.data('corto') ? e.target.data('label') : ''; });
      cy.on('mouseout', 'node', () => { cont.title = ''; });
    }
    // rueda: desplaza (Shift: a los lados); Ctrl+rueda: zoom hacia el ratón
    cont.addEventListener('wheel', ev => {
      ev.preventDefault();
      if (ev.ctrlKey) { const r = cont.getBoundingClientRect(); cy.zoom({ level: Math.min(4, Math.max(.1, cy.zoom() * (ev.deltaY < 0 ? 1.12 : 1 / 1.12))), renderedPosition: { x: ev.clientX - r.left, y: ev.clientY - r.top } }); }
      else cy.panBy(ev.shiftKey ? { x: -ev.deltaY, y: 0 } : { x: -ev.deltaX, y: -ev.deltaY });
    }, { passive: false });
    return cy;
  }
  // ---------- subflujo · subred: doble clic en una carpeta despliega su contenido ahí mismo (12 + «… N más») ----------
  const bajo = (r, base) => { const a = String(r || '').toLowerCase(), b = String(base || '').toLowerCase(); return a === b || a.startsWith(b + '\\') || a.startsWith(b + '/'); };
  const SUB_MAX = 12;
  async function desplegar(f, cy, n, restaurar = false) {
    if (!n?.length && !n?.id) return;
    const ruta = n.data('ruta'), vista = O.adm.vista, exp = O.adm.exp[vista] ||= [];
    const ya = cy.nodes().filter(x => x.data('desde') && bajo(x.data('desde'), ruta));
    if (ya.length) { // abierta: se pliega (con lo de dentro)
      if (restaurar) return;
      cy.remove(ya); n.removeClass('abierta');
      O.adm.exp[vista] = exp.filter(r => !bajo(r, ruta)); return guardarVista();
    }
    let items;
    try { items = (await api('/api/dir?ruta=' + encodeURIComponent(ruta))).filter(i => i.nombre !== '.desklens-ancla'); }
    catch (e) { if (!restaurar) err(e); return; }
    if (cy.destroyed() || !n.inside()) return;
    const ver = items.slice(0, SUB_MAX), resto = items.length - ver.length, tipo = n.data('tipo');
    const nuevos = ver.map(i => ({ id: 's:' + i.ruta, label: i.nombre, ruta: i.ruta, dir: !!i.dir, cls: i.dir ? 'sub subdir' : 'sub subarch', clase: 'sub', ico: i.dir ? 'carpeta' : 'documentos' }));
    if (resto > 0 || !items.length) nuevos.push({ id: 'mas:' + ruta, label: items.length ? `… ${resto} más` : '(vacía)', ruta, cls: 'mas', clase: 'mas' });
    const p0 = n.position(), c = cy.getElementById('p').position(), k = nuevos.length, flujo = vista === 'flujo';
    const raiz = n.id() === 'p', arriba = raiz ? -1 : 1; // la principal despliega hacia arriba (abajo están sus partes y a la derecha sus etapas)
    const a = raiz ? -Math.PI / 2 : Math.atan2(p0.y - c.y, p0.x - c.x), abanico = Math.min(Math.PI * .95, .3 * k), R = 110 + (k > 8 ? 40 : 0), cols = Math.min(4, k);
    cy.batch(() => nuevos.forEach((d, j) => {
      const pos = flujo ? { x: p0.x + (j % cols - (cols - 1) / 2) * 175, y: p0.y + arriba * (80 + Math.floor(j / cols) * 46) }
        : (an => ({ x: p0.x + R * Math.cos(an), y: p0.y + R * Math.sin(an) }))(k === 1 ? a : a - abanico / 2 + abanico * (j + .5) / k);
      cy.add({ group: 'nodes', data: { id: d.id, label: d.label, corto: corto(d.label), ruta: d.ruta, dir: d.dir, clase: d.clase, tipo, desde: ruta,
        ...(flujo && d.ico ? { ico: d.ico, anchoF: anchoTexto(corto(d.label)) + 22 } : {}) }, classes: d.cls, position: pos }); // en Red son puntos: sin icono
      cy.add({ group: 'edges', data: { id: 'se:' + d.id, source: n.id(), target: d.id, label: '' }, classes: 'sub' });
    }));
    n.addClass('abierta');
    if (!flujo) ladosRed(cy);
    if (!restaurar && !exp.includes(ruta)) { exp.push(ruta); guardarVista(); }
  }
  function abrirEnContenedor(ruta) { // el visor de DeskLens vive en la vista Contenedor
    O.adm.vista = 'contenedor'; O.adm.ultimo = ruta; guardarVista(); admin(); openTab(ruta, true);
  }

  // ---------- ⓘ Panel de información: lo que eliges en Flujo, Red o el árbol (carpeta, archivo, parte o proyecto) ----------
  const fFecha = t => t ? new Date(t * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const cuenta = (n, uno, varios) => `${(n || 0).toLocaleString()} ${n === 1 ? uno : varios}`;
  const raizDe = (f, ruta) => vivas(f).filter(c => bajo(ruta, c.ruta)).sort((a, b) => b.ruta.length - a.ruta.length)[0];
  function selDeNodo(n) {
    const clase = n.data('clase');
    if (clase === 'proyecto') return { tipo: 'proyecto' };
    if (clase === 'parte') return { tipo: 'parte', clave: n.data('clave') };
    if (clase === 'carpeta') return n.data('estado') === 'remota' ? { tipo: 'remota', ancla: n.id().slice(2) } : n.data('acceso') ? { tipo: 'archivo', ruta: n.data('ruta') } : { tipo: 'carpeta', ruta: n.data('ruta'), ancla: n.id().slice(2) };
    if (clase === 'sub') return { tipo: n.data('dir') ? 'carpeta' : 'archivo', ruta: n.data('ruta') };
    return null;
  }
  function infoAlternar(f, panel, B, abrir = panel.hidden) {
    if (abrir) return infoMostrar(f, panel, O.adm.info.sel || { tipo: 'proyecto' });
    infoTok++; panel.hidden = true; O.adm.info.abierto = false; guardarVista();
    document.querySelector('#pI1')?.classList.remove('primary');
  }
  let infoTok = 0;
  async function infoMostrar(f, panel, sel) {
    if (!panel) return;
    const tok = ++infoTok, vivo = () => tok === infoTok && panel.isConnected && !panel.hidden;
    Object.assign(O.adm.info, { abierto: true, sel }); guardarVista();
    document.querySelector('#pI1')?.classList.add('primary');
    panel.hidden = false; panel.style.width = O.adm.info.ancho + 'px';
    panel.innerHTML = `<div class="oires" title="Arrastra para cambiar el ancho"></div><header><b>ⓘ Información</b><button class="ic" title="Cerrar (Esc)">✕</button></header><div class="oicuerpo" tabindex="-1"><p class="ohint">Cargando…</p></div>`;
    panel.querySelector('header button').onclick = () => infoAlternar(f, panel, null, false);
    panel.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); infoAlternar(f, panel, null, false); } };
    panel.querySelector('.oires').onpointerdown = e => { // ancho del panel: arrastrando su borde izquierdo (se recuerda por proyecto)
      const x0 = e.clientX, w0 = panel.offsetWidth;
      const mv = ev => { panel.style.width = Math.max(280, Math.min(800, w0 - (ev.clientX - x0))) + 'px'; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); O.adm.info.ancho = panel.offsetWidth; guardarVista(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
    const cuerpo = panel.querySelector('.oicuerpo'), titulo = panel.querySelector('header b');
    const ir = s => infoMostrar(f, panel, s);
    try {
      if (sel.tipo === 'proyecto' || sel.tipo === 'parte') await infoResumen(f, sel, cuerpo, titulo, vivo, ir);
      else if (sel.tipo === 'remota') infoRemota(f, sel, cuerpo, titulo);
      else if (sel.tipo === 'carpeta') await infoCarpeta(f, sel.ruta, cuerpo, titulo, vivo, ir);
      else await infoArchivo(f, sel.ruta, cuerpo, titulo, vivo);
    } catch (e) { if (vivo()) cuerpo.innerHTML = `<p class="owarn">⚠ ${esc(e.message)}</p><p class="ohint">${esc(sel.ruta || '')}</p>`; }
  }
  // barra de ruta: lo de encima de la carpeta del proyecto en gris; desde ella, cada tramo se puede pulsar
  function migas(f, ruta, ir, cuerpo) {
    const r = raizDe(f, ruta);
    if (!r) return `<div class="omigas">📍 ${esc(ruta)}</div>`;
    const s = r.ruta.includes('\\') ? '\\' : '/', encima = r.ruta.slice(0, r.ruta.length - r.nombre.length).split(/[\\/]/).filter(Boolean);
    const tramos = [[r.nombre, r.ruta]];
    let acc = r.ruta;
    for (const x of ruta.slice(r.ruta.length).split(/[\\/]/).filter(Boolean)) { acc += s + x; tramos.push([x, acc]); }
    setTimeout(() => cuerpo.querySelectorAll('.omigas [data-ir]').forEach(a => a.onclick = () => ir({ tipo: 'carpeta', ruta: a.dataset.ir })));
    return `<div class="omigas" title="${esc(ruta)}">📍 ${encima.map(p => `<span class="ogris">${esc(p)}</span> › `).join('')}${tramos.map(([n, rr], i) => i === tramos.length - 1 ? `<b>${esc(n)}</b>` : `<a data-ir="${esc(rr)}">${esc(n)}</a> › `).join('')}</div>`;
  }
  const botonesRuta = (ruta, dir) => `<div class="oiacc"><button class="obtn" data-ac="copiar" title="Copiar la ruta">📋 Copiar</button><button class="obtn" data-ac="explorador">📂 Explorador</button>
    ${dir ? '<button class="obtn" data-ac="terminal" title="Terminal en esta carpeta">>_ Terminal</button>' : '<button class="obtn primary" data-ac="abrir" title="Abrir en una pestaña (doble clic)">Abrir en pestaña</button>'}</div>`;
  function accionesRuta(cuerpo, ruta) {
    cuerpo.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => ({
      copiar: () => copyText(ruta, '✓ Ruta copiada'), explorador: () => api('/api/mostrar', { ruta }).catch(err),
      terminal: () => { adminSalir(); cerrar(); openTerminal(ruta); }, abrir: () => abrirEnContenedor(ruta) }[b.dataset.ac]()));
  }
  const filas = l => `<dl class="oidl">${l.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
  function textoPeso(p) {
    if (!p) return '';
    if (p.estado === 'en_cola') return '<span class="ogris">en cola…</span>';
    if (p.estado === 'error') return `<span class="owarn">⚠ ${esc(p.error || 'error')}</span>`;
    const base = `<b>${fmtSize(p.bytes || 0)}</b>`;
    if (p.estado === 'calculando') return `${base} <span class="ogris">calculando… ${(p.archivos || 0).toLocaleString()} archivos</span> <button class="obtn" data-parar title="Detener el cálculo">✕ Detener</button><div class="oibar"><i></i></div>`;
    if (p.estado === 'detenido') return `${base} <span class="ogris">(detenido: es lo sumado hasta ahí)</span> <button class="obtn" data-otra>↻ Calcular</button>`;
    return base + (p.sin_acceso ? ` <span class="ogris" title="Elementos que no se pudieron leer">· ${p.sin_acceso} sin acceso</span>` : '');
  }

  async function infoCarpeta(f, ruta, cuerpo, titulo, vivo, ir) {
    const enc = encodeURIComponent(ruta);
    const [m, todos] = await Promise.all([api('/api/org/carpeta?ruta=' + enc), api('/api/dir?ruta=' + enc)]);
    if (!vivo()) return;
    const items = todos.filter(i => i.nombre !== '.desklens-ancla'), r = raizDe(f, ruta), esRaiz = r && r.ruta.toLowerCase() === ruta.toLowerCase();
    const nn = esRaiz ? (O.adm.notas || []).filter(n => n.destino === 'nodo:' + r.ancla).length : 0, g = esRaiz && O.git[r.ruta];
    const nd = items.filter(i => i.dir).length;
    titulo.textContent = `ⓘ ${m.nombre}`;
    cuerpo.innerHTML = migas(f, ruta, ir, cuerpo) + botonesRuta(ruta, true) + filas([
      ['Tipo', `${svgI('carpeta')} Carpeta${r ? ` · ${icoT(r.tipo)} ${esc(r.parte)}` : ''}${esRaiz && r.tipo === 'entornos' ? ` · ${icoE(r.etapa)} ${esc(r.etapa || '')}` : ''}${esRaiz && r.ancla === f.principal ? ` · ${svgI('principal', 'var(--accent)')} principal` : ''}`],
      ['Peso', `<span id="iP">${textoPeso(m.peso)}</span>`],
      ['Contiene', `<span id="iC">${cuenta(nd, 'carpeta', 'carpetas')} · ${cuenta(items.length - nd, 'archivo', 'archivos')} aquí</span>`],
      ['Modificada', fFecha(m.modificado)], ['Creada', fFecha(m.creado)], ['Atributos', esc(m.atributos.join(', '))],
      ['Git', g?.rama ? `⎇ ${esc(g.rama)} · ${g.cambios ? `${g.cambios} cambio${g.cambios > 1 ? 's' : ''}` : 'al día'}` : m.git ? '⎇ repositorio git' : ''],
      ['Ancla', esRaiz ? '✓ anclada (se sigue aunque la muevas)' : r ? `dentro de «${esc(r.nombre)}»` : ''],
      ['Proyectos', esRaiz && r.proyectos.length > 1 ? `🔗 ${r.proyectos.map(id => esc(O.st.fichas.find(x => x.id === id)?.nombre || id)).join(', ')}` : ''],
      ['Notas', nn ? `💬 ${nn}` : ''],
    ]) + `<div class="oicab"><b>Contenido (${items.length})</b><span class="sp"></span><input type="search" placeholder="Filtrar…" class="oifil"></div>
      <div class="oiord">Orden: ${[['nombre', 'Nombre'], ['peso', 'Peso'], ['fecha', 'Fecha']].map(([k, t]) => `<button class="obtn ${(O.adm.info.orden || 'nombre') === k ? 'primary' : ''}" data-or="${k}">${t}</button>`).join('')}</div>
      <div class="oilista"></div>`;
    accionesRuta(cuerpo, ruta);
    let peso = m.peso, filtro = '';
    const lista = cuerpo.querySelector('.oilista');
    const pintarLista = () => {
      const pesoDe = i => i.dir ? peso?.hijos?.[i.nombre] : i.tam, orden = O.adm.info.orden || 'nombre';
      const ver = items.filter(i => plainTxt(i.nombre).includes(plainTxt(filtro)))
        .sort(orden === 'peso' ? (a, b) => (pesoDe(b) || 0) - (pesoDe(a) || 0) : orden === 'fecha' ? (a, b) => b.fecha - a.fecha : (a, b) => (b.dir - a.dir) || a.nombre.localeCompare(b.nombre));
      lista.innerHTML = ver.map(i => `<div class="oifila" data-r="${esc(i.ruta)}" ${i.dir ? 'data-d="1"' : ''} title="${esc(i.ruta)}">${fileIcon(i.nombre, i.dir)}<span class="onom">${esc(i.nombre)}</span>
        <small>${pesoDe(i) != null ? fmtSize(pesoDe(i)) : i.dir ? (peso?.estado === 'calculando' || peso?.estado === 'en_cola' ? '…' : '') : ''}</small><small>${i.fecha ? new Date(i.fecha * 1000).toLocaleDateString([], { dateStyle: 'short' }) : ''}</small></div>`).join('')
        || `<p class="ohint">${items.length ? 'Nada coincide.' : '(vacía)'}</p>`;
    };
    pintarLista();
    cuerpo.querySelector('.oifil').oninput = e => { filtro = e.target.value; pintarLista(); };
    cuerpo.querySelectorAll('[data-or]').forEach(b => b.onclick = () => { O.adm.info.orden = b.dataset.or; guardarVista(); cuerpo.querySelectorAll('[data-or]').forEach(x => x.classList.toggle('primary', x === b)); pintarLista(); });
    lista.onclick = e => { const x = e.target.closest('.oifila'); if (x) ir({ tipo: x.dataset.d ? 'carpeta' : 'archivo', ruta: x.dataset.r }); };
    lista.ondblclick = e => { const x = e.target.closest('.oifila'); if (x && !x.dataset.d) abrirEnContenedor(x.dataset.r); };
    // el peso llega poco a poco (el servidor lo calcula aparte): se refresca hasta que termina o eliges otra cosa
    const pintarPeso = () => {
      const el = cuerpo.querySelector('#iP'); if (!el) return;
      el.innerHTML = textoPeso(peso);
      el.querySelector('[data-parar]')?.addEventListener('click', () => api('/api/org/peso/parar', { ruta }).catch(err));
      el.querySelector('[data-otra]')?.addEventListener('click', () => ir({ tipo: 'carpeta', ruta }));
      if (peso.estado === 'listo') cuerpo.querySelector('#iC').textContent = `${cuenta(peso.carpetas, 'carpeta', 'carpetas')} · ${cuenta(peso.archivos, 'archivo', 'archivos')} (con lo de dentro)`;
      pintarLista();
    };
    while (vivo() && (peso.estado === 'calculando' || peso.estado === 'en_cola')) {
      await espera(700); if (!vivo()) return;
      peso = await api('/api/org/peso?ruta=' + enc); if (!vivo()) return;
      pintarPeso();
    }
    if (vivo()) pintarPeso();
  }

  async function infoArchivo(f, ruta, cuerpo, titulo, vivo) {
    const m = await api('/api/info?ruta=' + encodeURIComponent(ruta));
    if (!vivo()) return;
    titulo.textContent = `ⓘ ${m.nombre}`;
    const ext = (m.extension || '').toLowerCase(), img = /^\.(png|jpe?g|gif|webp|bmp|svg)$/.test(ext), txt = !!m.codificacion;
    const gt = m.git?.estado && m.git.estado !== 'limpio' ? esc((typeof GIT_TXT !== 'undefined' && GIT_TXT[m.git.estado]) || m.git.estado) : '';
    cuerpo.innerHTML = migas(f, ruta, s => infoMostrar(f, cuerpo.closest('.oinfo'), s), cuerpo) + botonesRuta(ruta, false) + filas([
      ['Tamaño', `<b>${fmtSize(m.tam)}</b>${ext ? ` · ${esc(ext.slice(1).toUpperCase())}` : ''}${txt ? ` · ${esc(m.codificacion)} · ${esc(m.eol)} · ${(m.lineas || 0).toLocaleString()} líneas` : ''}`],
      ['Modificado', fFecha(m.modificado)], ['Creado', fFecha(m.creado)], ['Atributos', esc((m.atributos || []).join(', '))], ['Git', gt ? `● ${gt}` : ''],
      ...Object.entries(m.doc || {}).filter(([, v]) => v != null && v !== '').slice(0, 6).map(([k, v]) => [k, esc(String(v))]),
    ]) + `<div class="oicab"><b>Vista previa</b></div><div class="oiprev">${img ? `<img src="${esc(raw(ruta))}" alt="">` : txt ? '<p class="ohint">Cargando…</p>' : '<p class="ohint">Sin vista previa aquí: ábrelo en una pestaña.</p>'}</div>`;
    accionesRuta(cuerpo, ruta);
    if (!txt || img) return;
    const a = await api('/api/abrir?ruta=' + encodeURIComponent(ruta));
    if (!vivo()) return;
    const lineas = String(a.texto || '').split('\n');
    cuerpo.querySelector('.oiprev').innerHTML = `<pre>${esc(lineas.slice(0, 200).join('\n'))}</pre>${lineas.length > 200 ? `<p class="ohint">… ${lineas.length - 200} líneas más: ábrelo en una pestaña.</p>` : ''}`;
  }

  function infoRemota(f, sel, cuerpo, titulo) {
    const c = f.partes.flatMap(p => p.carpetas).find(x => x.ancla === sel.ancla);
    if (!c) { cuerpo.innerHTML = '<p class="ohint">Esa etapa ya no está en el proyecto.</p>'; return; }
    titulo.textContent = `ⓘ ${c.nombre}`;
    cuerpo.innerHTML = filas([['Tipo', `${svgI('produccion', COLT.entornos)} Etapa remota (sin carpeta en este PC)`], ['Etapa', `${icoE(c.etapa)} ${esc(c.etapa || '')}`], ['Dirección', c.ruta ? `<code>${esc(c.ruta)}</code>` : 'sin dirección']])
      + (c.ruta ? `<div class="oiacc"><button class="obtn" data-c>📋 Copiar</button>${/^https?:\/\//.test(c.ruta) ? '<button class="obtn primary" data-w>🌐 Abrir</button>' : ''}</div>` : '');
    cuerpo.querySelector('[data-c]')?.addEventListener('click', () => copyText(c.ruta, '✓ Copiado'));
    cuerpo.querySelector('[data-w]')?.addEventListener('click', () => { adminSalir(); cerrar(); openTab('web:' + c.ruta, true); });
  }

  // proyecto o parte: sus carpetas con estado y peso (se suman al llegar) y, en Entornos, la fila de etapas
  async function infoResumen(f, sel, cuerpo, titulo, vivo, ir) {
    const partes = sel.tipo === 'parte' ? f.partes.filter(p => p.nombre === sel.clave) : f.partes;
    if (!partes.length) { cuerpo.innerHTML = '<p class="ohint">Esa parte ya no está en el proyecto.</p>'; return; }
    titulo.textContent = sel.tipo === 'parte' ? `ⓘ ${partes[0].nombre}` : `ⓘ ${f.nombre}`;
    const est = c => c.estado === 'remota' ? '' : c.estado === 'ok' || c.estado === 'movida' ? '✓' : BORRADA[c.estado] ? '🗑' : '⚠';
    const vivasAqui = partes.flatMap(p => p.carpetas.filter(c => c.estado === 'ok' || c.estado === 'movida'));
    const total = partes.reduce((s, p) => s + p.carpetas.length, 0), pr = f.partes.flatMap(p => p.carpetas).find(c => c.ancla === f.principal);
    cuerpo.innerHTML = filas([
      ['Tipo', sel.tipo === 'parte' ? `Parte ${icoT(partes[0].tipo)} ${TIPO[partes[0].tipo][1]}` : `Proyecto · ${f.partes.length} parte${f.partes.length === 1 ? '' : 's'}`],
      ...(sel.tipo === 'proyecto' && pr ? [['Principal', `${svgI('principal', 'var(--accent)')} <a class="oenl" data-pr="${esc(pr.ruta)}">${esc(pr.nombre)}</a> <span class="ogris">${f.principal_elegida ? '(elegida)' : '(por defecto: git o código)'}</span>`]] : []),
      ['Peso total', '<span id="iT">…</span>'], ['Carpetas', `${total} (${vivasAqui.length} a la vista)`],
      ...(sel.tipo === 'proyecto' ? [['Estado', esc((ESTADO[f.estado] || ['', f.estado || ''])[1])], ['Avance', `${f.avance || 0} %`]] : []),
    ]) + partes.map(p => `<div class="oicab"><b>${icoT(p.tipo)} ${esc(p.nombre)}</b></div>
      ${p.tipo === 'entornos' && p.carpetas.length ? `<div class="oietapas">${p.carpetas.map(c => `${icoE(c.etapa)} ${esc(c.nombre)}`).join(' <span>→</span> ')}</div>` : ''}
      <div class="oilista">${p.carpetas.map(c => `<div class="oifila" ${c.estado === 'remota' ? `data-rem="${esc(c.ancla)}"` : `data-r="${esc(c.ruta)}"`} title="${esc(c.ruta)}"><span>${est(c)}</span>${icoC(c, p.tipo)}<span class="onom">${esc(c.nombre)}</span>
        <small data-p="${esc(c.ruta)}"></small></div>`).join('') || '<p class="ohint">(sin carpetas)</p>'}</div>`).join('');
    cuerpo.querySelectorAll('.oifila').forEach(x => x.onclick = () => ir(x.dataset.rem ? { tipo: 'remota', ancla: x.dataset.rem } : { tipo: 'carpeta', ruta: x.dataset.r }));
    cuerpo.querySelector('[data-pr]')?.addEventListener('click', e => ir({ tipo: 'carpeta', ruta: e.currentTarget.dataset.pr }));
    const pesos = new Map(vivasAqui.map(c => [c.ruta, null]));
    while (vivo()) {
      for (const r of pesos.keys()) if (!['listo', 'detenido', 'error'].includes(pesos.get(r)?.estado)) {
        try { pesos.set(r, await api('/api/org/peso?ruta=' + encodeURIComponent(r))); } catch { pesos.set(r, { estado: 'error' }); }
        if (!vivo()) return;
      }
      const sum = [...pesos.values()].reduce((s, p) => s + (p?.bytes || 0), 0), falta = [...pesos.values()].some(p => !p || p.estado === 'calculando' || p.estado === 'en_cola');
      cuerpo.querySelector('#iT').innerHTML = `<b>${fmtSize(sum)}</b>${falta ? ' <span class="ogris">calculando…</span><div class="oibar"><i></i></div>' : ''}`;
      cuerpo.querySelectorAll('[data-p]').forEach(s => { const p = pesos.get(s.dataset.p); s.textContent = p?.bytes != null ? fmtSize(p.bytes) + (p.estado === 'calculando' ? '…' : '') : ''; });
      if (!falta) return;
      await espera(800);
    }
  }

  // Red radial: el proyecto en el centro, las partes en un anillo y sus carpetas en abanico por fuera, dentro del trozo de su
  // parte (más carpetas, más ángulo: nada se amontona). Las cajas van en fila debajo. Sin azar: siempre sale igual.
  function radial(cy) {
    const padre = new Map(), hijos = new Map();
    cy.edges().forEach(e => { if (e.hasClass('jer') || e.id().startsWith('g:')) { padre.set(e.target().id(), e.source().id()); (hijos.get(e.source().id()) || hijos.set(e.source().id(), []).get(e.source().id())).push(e.target().id()); } });
    const partes = (hijos.get('p') || []), peso = id => Math.max(1, (hijos.get(id) || []).length), total = partes.reduce((s, id) => s + peso(id), 0) || 1;
    const hojas = partes.reduce((s, id) => s + (hijos.get(id) || []).length, 0);
    const R1 = Math.max(170, partes.length * 70 / (2 * Math.PI)), R2 = Math.max(R1 + 160, hojas * 46 / (2 * Math.PI)); // 46 px entre carpetas vecinas
    const P = new Map([['p', { x: 0, y: 0 }]]);
    // las etapas (iguales a la principal): en línea recta hacia la derecha; las partes, en abanico por el resto del círculo
    const cadena = cadenaDe(cy);
    cadena.forEach((id, k) => P.set(id, { x: R1 + k * 210, y: 0 }));
    const hueco = cadena.length ? .5 : 0, giro = 2 * Math.PI - 2 * hueco;
    let a0 = cadena.length ? hueco : -Math.PI / 2 - Math.PI * peso(partes[0] || '') / total; // sin etapas: la primera parte arriba
    for (const id of partes) {
      const tramo = giro * peso(id) / total, medio = a0 + tramo / 2, hs = hijos.get(id) || [];
      P.set(id, { x: R1 * Math.cos(medio), y: R1 * Math.sin(medio) });
      hs.forEach((h, k) => { const a = hs.length === 1 ? medio : a0 + tramo * (k + .5) / hs.length; P.set(h, { x: R2 * Math.cos(a), y: R2 * Math.sin(a) }); });
      a0 += tramo;
    }
    let x = -R2, y = R2 + 120; // cajas y sueltos: en fila debajo
    cy.nodes().forEach(n => { if (!P.has(n.id())) { P.set(n.id(), { x, y }); x += 220; if (x > R2) { x = -R2; y += 90; } } });
    cy.batch(() => cy.nodes().forEach(n => n.position(P.get(n.id()))));
  }
  // la cadena de etapas desde la raíz, en orden (sigue las flechas «pasa a»)
  function cadenaDe(cy) {
    const out = []; let n = cy.getElementById('p');
    for (let i = 0; i < 50 && n.length; i++) { const e = n.outgoers('edge.etapa'); if (!e.length) break; n = e[0].target(); out.push(n.id()); }
    return out;
  }
  // Flujo: árbol de arriba abajo desde la principal; las etapas en fila a su derecha, a su misma altura
  function flujoCadena(cy) {
    const cad = cy.collection(cadenaDe(cy).map(id => cy.getElementById(id)));
    cy.elements().not(cad).not('edge.etapa').layout({ name: 'breadthfirst', directed: true, roots: ['p'], spacingFactor: 1.15, avoidOverlap: true }).run();
    const p = cy.getElementById('p').position(), ancho = n => Math.max(200, n.outerWidth() + 90);
    let x = p.x + ancho(cy.getElementById('p')) / 2;
    cad.forEach(n => { x += ancho(n) / 2; n.position({ x, y: p.y }); x += ancho(n) / 2; });
  }
  function ladosRed(cy, solo) {
    const c = cy.getElementById('p').position() || { x: 0, y: 0 };
    cy.batch(() => (solo ? solo : cy.nodes('.carpeta, .parte, .sub, .mas')).forEach(n => {
      const p = n.position(), dx = p.x - c.x, dy = p.y - c.y, r = Math.hypot(dx, dy) || 1;
      // carpetas: hacia fuera; partes: de lado (hacia fuera sigue la línea a sus carpetas y hacia dentro la del centro);
      // etapas: debajo (a los lados están las flechas «pasa a»)
      n.data('lado', n.hasClass('cadena') ? 'aba' : n.hasClass('parte') ? (Math.abs(dx) > Math.abs(dy) ? (dy < 0 ? 'arr' : 'aba') : 'der')
        : dx / r > .35 ? 'der' : dx / r < -.35 ? 'izq' : dy < 0 ? 'arr' : 'aba');
    }));
  }
  function minimapa(cont, cy) {
    const c = Object.assign(document.createElement('canvas'), { className: 'omini', width: 180, height: 120, title: 'Minimapa: clic o arrastra para ir' });
    cont.append(c);
    const g = c.getContext('2d');
    let caja = null;
    const pintar = () => {
      const bb = cy.elements().boundingBox(); if (!isFinite(bb.w) || !bb.w) return;
      const ex = cy.extent(), x1 = Math.min(bb.x1, ex.x1), y1 = Math.min(bb.y1, ex.y1), w = Math.max(bb.x2, ex.x2) - x1, h = Math.max(bb.y2, ex.y2) - y1;
      const k = Math.min(c.width / w, c.height / h); caja = { x1, y1, k };
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(128,128,128,.6)';
      cy.nodes().forEach(n => { const p = n.position(); g.fillRect((p.x - x1) * k - 1.5, (p.y - y1) * k - 1.5, 3, 3); });
      g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c5cdb'; g.lineWidth = 1.5;
      g.strokeRect((ex.x1 - x1) * k, (ex.y1 - y1) * k, ex.w * k, ex.h * k);
    };
    let raf; cy.on('viewport position add remove', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pintar); }); pintar();
    const ir = ev => { if (!caja) return; const r = c.getBoundingClientRect(), mx = (ev.clientX - r.left) / caja.k + caja.x1, my = (ev.clientY - r.top) / caja.k + caja.y1;
      cy.pan({ x: cy.width() / 2 - mx * cy.zoom(), y: cy.height() / 2 - my * cy.zoom() }); };
    c.onpointerdown = ev => { ev.stopPropagation(); ir(ev); c.setPointerCapture(ev.pointerId); c.onpointermove = ir; c.onpointerup = () => { c.onpointermove = null; }; };
    return c;
  }
  async function guardarDiagrama(f, cambios) { // conectores, cajas o posiciones: se guarda sin repintar todo el proyecto
    try { // solo lo del diagrama: las partes de f traen rutas y estados calculados, la respuesta no
      const r = await api('/api/org/ficha/guardar', { id: f.id, ...cambios });
      for (const k of ['conexiones', 'cajas', 'posiciones', 'actualizado']) f[k] = r.ficha[k];
      O.adm.cache = {}; return r.ficha;
    } catch (e) { err(e); }
  }
  async function nuevaCaja(f, cy, rp) {
    const t = await ask('Nota libre', 'Texto del recuadro (pasos o ideas, p. ej. «Grabar → Editar → Subir»):', ['Crear', 'Cancelar'], { input: '' });
    if (!t?.trim()) return;
    const id = 'b' + Date.now().toString(36), m = cy.pan(), z = cy.zoom();
    const pos = { ...(f.posiciones || {}) }; pos[O.adm.vista] = { ...(pos[O.adm.vista] || {}), ['caja:' + id]: { x: (rp.x - m.x) / z, y: (rp.y - m.y) / z } };
    await guardarDiagrama(f, { cajas: [...(f.cajas || []), { id, texto: t.trim(), color: '' }], posiciones: pos });
    admin();
  }
  async function borrarElementos(f, s) {
    const cx = new Set(s.filter('[clase="tuya"]').map(e => e.id().slice(2))), cj = new Set(s.filter('[clase="caja"]').map(n => n.id().slice(5)));
    if (await ask('Borrar', `Se borra${cx.size + cj.size > 1 ? 'n' : ''} ${[cx.size ? `${cx.size} unión(es)` : '', cj.size ? `${cj.size} nota(s) libre(s)` : ''].filter(Boolean).join(' y ')} del diagrama (queda en el historial).`, ['Borrar', 'Cancelar'], { danger: true }) !== 'Borrar') return;
    await guardarDiagrama(f, { conexiones: (f.conexiones || []).filter(c => !cx.has(c.id) && !cj.has(c.de.slice(5)) && !cj.has(c.a.slice(5))), cajas: (f.cajas || []).filter(b => !cj.has(b.id)) });
    admin();
  }
  function menuElemento(f, cy, el, ev) {
    const id = el.id(), clase = el.data('clase'), x = { x: ev?.clientX ?? 200, y: ev?.clientY ?? 200 };
    if (el.hasClass('fantasma')) return;
    const panelI = document.querySelector('#pI');
    if (clase === 'sub' || clase === 'mas') { // lo desplegado (subflujo · subred): no lleva notas ni «Mover a»
      const r = el.data('ruta'), dir = clase === 'mas' || el.data('dir');
      return openMenu(x, [{ head: el.data('label') }, ['ⓘ Información', () => infoMostrar(f, panelI, { tipo: dir ? 'carpeta' : 'archivo', ruta: r })],
        ['📂 Mostrar en el Explorador', () => api('/api/mostrar', { ruta: r }).catch(err)],
        clase === 'mas' ? ['▴ Plegar', () => desplegar(f, cy, cy.nodes().filter(n => n.data('ruta') === r && n.data('clase') !== 'mas')[0])]
          : dir ? ['▾ Desplegar o plegar (doble clic)', () => desplegar(f, cy, el)] : ['Abrir en una pestaña (doble clic)', () => abrirEnContenedor(r)]]);
    }
    const notas = ['💬 Notas…', () => panelNotas(f, id)];
    if (clase === 'tuya') {
      const c = (f.conexiones || []).find(k => 'c:' + k.id === id); if (!c) return;
      const cambia = async cam => { await guardarDiagrama(f, { conexiones: f.conexiones.map(k => k === c ? { ...k, ...cam } : k) }); admin(); };
      return openMenu(x, [{ head: `Unión «${c.etiqueta || '—'}»` }, notas, ['✎ Cambiar etiqueta…', async () => { const t = await ask('Etiqueta', 'Etiqueta de la unión:', ['Guardar', 'Cancelar'], { input: c.etiqueta }); if (t !== null) cambia({ etiqueta: t.trim() }); }],
        '-', ...[['#e0a030', 'Ámbar'], ['#2f7fd8', 'Azul'], ['#2e9e5b', 'Verde'], ['#d24a4a', 'Rojo'], ['#7c5cdb', 'Morado']].map(([col, n]) => [`● ${n}`, () => cambia({ color: col }), { html: `<span style="color:${col}">●</span> ${n}` }]),
        '-', ['→ Una dirección', () => cambia({ dir: '→' })], ['↔ Las dos', () => cambia({ dir: '↔' })], ['— Sin flecha', () => cambia({ dir: '—' })],
        '-', ['🗑 Borrar unión', () => borrarElementos(f, el), { danger: true }]]);
    }
    if (clase === 'caja') {
      const b = (f.cajas || []).find(k => 'caja:' + k.id === id); if (!b) return;
      const cambia = async cam => { await guardarDiagrama(f, { cajas: f.cajas.map(k => k === b ? { ...k, ...cam } : k) }); admin(); };
      return openMenu(x, [{ head: 'Nota libre' }, notas, ['✎ Cambiar texto…', async () => { const t = await ask('Nota libre', 'Texto:', ['Guardar', 'Cancelar'], { input: b.texto }); if (t?.trim()) cambia({ texto: t.trim() }); }],
        '-', ...[['#e8d9a8', 'Arena'], ['#bfe3c9', 'Verde'], ['#c7dcf5', 'Azul'], ['#f3c6c6', 'Rosa']].map(([col, n]) => [n, () => cambia({ color: col }), { html: `<span style="color:${col}">■</span> ${n}` }]),
        '-', ['🗑 Borrar nota libre', () => borrarElementos(f, el), { danger: true }]]);
    }
    const ruta = el.data('ruta');
    const viva = ruta && el.data('estado') !== 'remota';
    const sel = selDeNodo(el);
    openMenu(x, [{ head: el.data('label') }, ...(sel ? [['ⓘ Información', () => infoMostrar(f, panelI, sel)]] : []), notas,
      ...(clase === 'carpeta' && viva && !el.data('acceso') && !el.cy().scratch('soloLectura') ? [['▾ Desplegar o plegar (doble clic)', () => desplegar(f, cy, el)]] : []),
      ...(el.data('acceso') && viva ? [['Abrir en una pestaña (doble clic)', () => abrirEnContenedor(ruta)]] : []), ...(viva ? [['📂 Mostrar en el Explorador', () => api('/api/mostrar', { ruta }).catch(err)], ['🗂 Ver en el Contenedor', () => { O.adm.vista = 'contenedor'; O.adm.abiertas.add(ruta); guardarVista(); admin(); }]] : []),
      ...(clase === 'carpeta' && viva && !el.data('acceso') && !el.cy().scratch('soloLectura') ? ['-', hacerPrincipalItem(f, id.slice(2), el.data('nombre'))] : []),
      ...((clase === 'parte' || clase === 'proyecto') && !el.cy().scratch('soloLectura') ? ['-', ['＋ Añadir carpetas…', () => nuevoProyecto(f, clase === 'parte' ? el.data('tipo') : '')]] : []),
      ...(clase === 'carpeta' && !el.cy().scratch('soloLectura') ? menuMover(f, id.slice(2), el.data('tipo')) : [])]);
  }

  // ---------- notas en nodos y conectores: 💬 con su número, cuadro flotante al pasar el ratón y panel para editar ----------
  const mdHtml = t => DOMPurify.sanitize(marked.parse(t || ''));
  function notasCapa(f, cy, cont, panel, dif) {
    const capa = Object.assign(document.createElement('div'), { className: 'onotacapa' }); cont.append(capa);
    const porDestino = new Map();
    for (const n of O.adm.notas || []) { const id = idDeDestino(n.destino); (porDestino.get(id) || porDestino.set(id, []).get(id)).push(n); }
    const botones = [];
    for (const [id, ns] of porDestino) { // se crean una sola vez
      const el = cy.getElementById(id); if (!el.length) continue;
      const b = Object.assign(document.createElement('button'), { className: 'onotab' + (dif?.notas?.has(id) ? ' n-' + dif.notas.get(id) : ''), textContent: `💬 ${ns.length}` });
      b.onclick = () => panelNotas(f, id);
      b.onmouseenter = () => flotante(b, ns, f, id); b.onmouseleave = () => setTimeout(() => { if (!document.querySelector('.onotaflo:hover')) document.querySelector('.onotaflo')?.remove(); }, 150);
      capa.append(b); botones.push([el, b]);
    }
    const colocar = () => { // al moverse solo cambian de sitio (transform: sin recalcular la página)
      for (const [el, b] of botones) {
        const p = el.isEdge() ? el.renderedMidpoint() : { x: el.renderedBoundingBox().x2, y: el.renderedBoundingBox().y1 };
        b.style.transform = `translate(${p.x}px, ${p.y}px) translate(-30%, -60%)`; b.hidden = el.style('display') === 'none';
      }
    };
    let raf; if (botones.length) cy.on('viewport position', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(colocar); }); colocar();
    if (O.adm.notaAbierta) panelNotas(f, O.adm.notaAbierta, panel);
  }
  function flotante(b, ns, f, id) {
    document.querySelector('.onotaflo')?.remove();
    const d = Object.assign(document.createElement('div'), { className: 'onotaflo' });
    d.innerHTML = `<header>💬 ${ns.length} nota${ns.length > 1 ? 's' : ''}</header>${ns.slice(0, 3).map(n => `<div class="onotamd">${mdHtml(n.texto)}</div><small>${esc(n.cambiada.replace('T', ' ').slice(0, 16))}</small>`).join('')}
      ${ns.length > 3 ? `<small>+${ns.length - 3} más</small>` : ''}<footer><button class="obtn" data-a>Abrir</button><button class="obtn" data-n>+ Nota</button></footer>`;
    const r = b.getBoundingClientRect();
    d.style.left = Math.min(innerWidth - 340, r.left) + 'px'; d.style.top = Math.min(innerHeight - 260, r.bottom + 6) + 'px';
    d.onmouseleave = () => d.remove();
    d.querySelector('[data-a]').onclick = () => { d.remove(); panelNotas(f, id); };
    d.querySelector('[data-n]').onclick = () => { d.remove(); panelNotas(f, id, null, true); };
    document.body.append(d);
  }
  function panelNotas(f, id, panel = document.querySelector('#pN'), nueva = false) {
    if (!panel) return;
    O.adm.notaAbierta = id; guardarVista();
    const ns = (O.adm.notas || []).filter(n => idDeDestino(n.destino) === id), el = cyActual?.getElementById(id);
    const titulo = id === 'p' ? f.nombre : el?.length ? (el.data('label') || 'Unión') : id;
    panel.hidden = false;
    panel.innerHTML = `<header><b>💬 Notas · ${esc(titulo)}</b><button class="ic" title="Cerrar">✕</button></header>
      <div class="onotalista">${ns.map(n => `<article data-id="${n.id}"><div class="onotamd">${mdHtml(n.texto)}</div>
        <footer><small>${esc(n.cambiada.replace('T', ' ').slice(0, 16))}</small><span class="sp"></span><button class="obtn" data-e>✎</button><button class="obtn" data-b title="Borrar">🗑</button></footer></article>`).join('') || '<p class="ohint">Sin notas todavía.</p>'}</div>
      <div class="onotanueva"><textarea placeholder="Escribir nota… (Markdown: **negrita**, - [ ] tarea, [[enlace]])">${''}</textarea><button class="obtn primary">Guardar nota</button></div>`;
    panel.querySelector('header button').onclick = () => { panel.hidden = true; O.adm.notaAbierta = ''; guardarVista(); };
    const ta = panel.querySelector('.onotanueva textarea');
    if (nueva) ta.focus();
    const recargar = async () => { O.adm.notas = (await api('/api/org/notas?id=' + encodeURIComponent(f.id))).notas; O.adm.cache = {}; admin(); };
    panel.querySelector('.onotanueva button').onclick = async () => {
      if (!ta.value.trim()) return;
      try { await api('/api/org/nota/guardar', { proyecto: f.id, destino: destinoDe(id), texto: ta.value }); await recargar(); } catch (e) { err(e); }
    };
    panel.querySelectorAll('article').forEach(a => {
      const n = ns.find(x => x.id === a.dataset.id);
      a.querySelectorAll('input[type=checkbox]').forEach((cb, i) => { cb.disabled = false; cb.onchange = async () => { // marcar tareas con un clic
        let k = -1; const texto = n.texto.replace(/^(\s*[-*] \[)([ xX])(\])/gm, (m, a1, x, a3) => (++k === i ? a1 + (cb.checked ? 'x' : ' ') + a3 : m));
        try { await api('/api/org/nota/guardar', { proyecto: f.id, destino: n.destino, texto, id: n.id }); n.texto = texto; } catch (e) { err(e); }
      }; });
      a.querySelector('[data-e]').onclick = () => {
        a.innerHTML = `<textarea>${esc(n.texto)}</textarea><footer><span class="sp"></span><button class="obtn" data-x>Cancelar</button><button class="obtn primary" data-g>Guardar</button></footer>`;
        a.querySelector('[data-x]').onclick = () => panelNotas(f, id, panel);
        a.querySelector('[data-g]').onclick = async () => { try { await api('/api/org/nota/guardar', { proyecto: f.id, destino: n.destino, texto: a.querySelector('textarea').value, id: n.id }); await recargar(); } catch (e) { err(e); } };
      };
      a.querySelector('[data-b]').onclick = async () => {
        if (await ask('Borrar nota', 'La nota se borra (queda en el historial del proyecto).', ['Borrar', 'Cancelar'], { danger: true }) !== 'Borrar') return;
        try { await api('/api/org/nota/borrar', { proyecto: f.id, id: n.id }); await recargar(); } catch (e) { err(e); }
      };
    });
  }

  // ---------- pestaña Historial: versiones de la estructura y commits del código ----------
  async function adminHistorial(f, B) {
    B.innerHTML = '<div class="opage"><p class="ohint">Cargando…</p></div>';
    let r; try { r = await api('/api/org/versiones?id=' + encodeURIComponent(f.id)); } catch (e) { B.innerHTML = `<div class="opage"><p class="owarn">⚠ ${esc(e.message)}</p></div>`; return; }
    const fecha = s => s.replace('T', ' ').slice(0, 16);
    const lineas = [...r.versiones.map(v => ({ fecha: v.fecha, html: `${v.auto ? '·' : '🏷'} <b>${v.auto ? 'Automática' : esc(v.nombre)}</b><small>${esc(v.resumen)}</small>`, v: v.v })),
      ...r.commits.map(c => ({ fecha: c.fecha, html: `⎇ <b>${esc(c.corto)}</b> ${esc(c.titulo)}<small>commit del código${c.v ? '' : ' · sin estructura guardada antes'}</small>`, v: c.v }))]
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    B.innerHTML = `<div class="opage"><div class="ofoot" style="margin:0 0 12px"><b>Historial de la estructura</b><span class="sp"></span><button class="obtn primary" id="hG">🏷 Guardar versión</button></div>
      <p class="ohint">Partes, carpetas, iconos, conectores, cajas, posiciones y notas. Se guarda siempre (no tiene cuota ni se borra). Restaurar crea un punto nuevo: lo de ahora no se pierde.</p>
      <table class="olist"><tbody>${lineas.map((l, i) => `<tr><td style="white-space:nowrap">${fecha(l.fecha)}</td><td>${l.html}</td><td style="white-space:nowrap">${l.v ? `<button class="obtn" data-c="${l.v}">⇆ Comparar</button> <button class="obtn" data-r="${l.v}">↶ Restaurar…</button>` : ''}</td></tr>`).join('')
        || '<tr><td>Todavía no hay versiones: se crean solas con cada cambio.</td></tr>'}</tbody></table>
      <p class="ohint">El historial de versiones de los archivos (con la cuota de ${f.historial?.dias ?? 7} días · ${f.historial?.mb ?? 200} MB) sigue siendo el de DeskLens por archivo.</p></div>`;
    B.querySelector('#hG').onclick = async () => {
      const n = await ask('Guardar versión', 'Nombre de la versión:', ['Guardar', 'Cancelar'], { input: '' });
      if (n?.trim()) try { await api('/api/org/version/nombre', { id: f.id, nombre: n.trim() }); adminHistorial(f, B); } catch (e) { err(e); }
    };
    B.querySelectorAll('[data-c]').forEach(b => b.onclick = () => comparar(f, b.dataset.c)); // el mismo modal de ⇆ Comparar…
    B.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
      if (await ask('Restaurar versión', 'La estructura (partes, carpetas, uniones, notas libres, posiciones y notas) vuelve a como estaba. Antes se guarda la de ahora como versión «antes de restaurar». No se mueve ningún archivo.', ['Restaurar', 'Cancelar']) !== 'Restaurar') return;
      try { await api('/api/org/version/restaurar', { id: f.id, v: b.dataset.r }); O.adm.cache = {}; flash('↶ Estructura restaurada'); await cargar(); } catch (e) { err(e); }
    });
  }

  // ---------- Ctrl+E: lo abierto, agrupado por proyecto, y buscar en todo (M2, como el Ctrl+E de DBeaver) ----------
  // Sin escribir: las pestañas abiertas agrupadas por proyecto (el de la pestaña que ves, primero). ↑ ↓ y Enter para ir,
  // Supr cierra la pestaña. Escribiendo: filtra lo abierto y busca también proyectos, carpetas, archivos y acciones.
  const pal = Object.assign(document.createElement('div'), { id: 'orgPal', hidden: true });
  document.body.append(pal);
  let palSel = 0, palItems = [], palT;
  KEYS.push(['Pizarra (Flujo y Red)', [['Arrastrar en un espacio vacío', 'Mover la pizarra'], ['Rueda · Shift+rueda', 'Mover arriba/abajo · a los lados'],
    ['Ctrl+rueda', 'Zoom hacia el ratón'], ['0', 'Ver todo'], ['Flechas', 'Mover la pizarra'], ['C', 'Unir: clic en un nodo y luego en otro'],
    ['Doble clic en un espacio vacío', 'Nota libre'], ['Supr', 'Borrar la unión o la nota libre elegida'],
    ['Clic en un nodo', 'Su información en el panel ⓘ'], ['Doble clic en una carpeta', 'Desplegar o plegar su contenido ahí mismo (12 + «… N más»)'],
    ['Doble clic en un archivo', 'Abrirlo en una pestaña'], ['I', 'Abrir o cerrar el panel ⓘ Información'], ['Esc (con el panel abierto)', 'Cerrar el panel ⓘ'], ['↑ / ↓ (en ⇆ Comparar)', 'Cambio anterior / siguiente']]]);
  KEYS.push(['Proyectos · Ctrl+E', [['Ctrl+E', 'Lo abierto, agrupado por proyecto; escribiendo, busca proyectos, carpetas, archivos y acciones'],
    ['↑ / ↓ · Enter', 'Moverse y abrir'], ['Supr', 'Cerrar la pestaña elegida (en la lista de abiertos)'], ['Esc', 'Cerrar la lista']]]);
  addEventListener('keydown', e => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e' && btn && !btn.hidden) { e.preventDefault(); e.stopPropagation(); pal.hidden ? paleta() : palCerrar(); }
  }, true);
  const proyectoDe = ruta => { // ficha (o proyecto de DeskLens) a la que pertenece una ruta
    const low = (ruta || '').toLowerCase();
    for (const f of O.st?.fichas || []) for (const p of f.partes) for (const c of p.carpetas)
      if (c.ruta && (low === c.ruta.toLowerCase() || low.startsWith(c.ruta.toLowerCase() + '\\'))) return { clave: 'f:' + f.id, nombre: f.nombre, tipo: p.tipo, f };
    const d = side?.proyectos?.find(x => low.startsWith(x.ruta.toLowerCase() + '\\'));
    return d ? { clave: 'd:' + d.ruta, nombre: d.nombre } : { clave: '', nombre: 'Sin proyecto' };
  };
  async function paleta() {
    if (!O.st) try { O.st = await api('/api/org/estado'); } catch {}
    pal.innerHTML = `<input id="palQ" placeholder="Abierto por proyecto · escribe para buscar proyectos, carpetas, archivos y acciones" autocomplete="off" spellcheck="false"><div id="palL"></div>
      <footer>↑ ↓ moverse · Enter abrir · Supr cerrar pestaña · Esc salir</footer>`;
    pal.hidden = false; palSel = 0;
    const q = pal.querySelector('#palQ');
    q.oninput = () => { palSel = 0; palPintar(q.value); clearTimeout(palT); if (q.value.trim().length >= 2) palT = setTimeout(() => palArchivos(q.value), 250); };
    q.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, Math.min(palItems.length - 1, palSel + (e.key === 'ArrowDown' ? 1 : -1))); palMarcar(); }
      else if (e.key === 'Enter') { e.preventDefault(); palItems[palSel]?.ir(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); palCerrar(); }
      else if (e.key === 'Delete' && !q.value && palItems[palSel]?.tab) { e.preventDefault(); const t = palItems[palSel].tab; closeTab(t).then(() => palPintar('')); }
    };
    palPintar(''); q.focus();
  }
  function palCerrar() { pal.hidden = true; clearTimeout(palT); }
  document.addEventListener('pointerdown', e => { if (!pal.hidden && !pal.contains(e.target)) palCerrar(); }, true);
  function palPintar(texto, archivos = []) {
    const w = plainTxt(texto.trim()).split(/\s+/).filter(Boolean), ok = s => w.every(x => plainTxt(s).includes(x));
    const grupos = new Map(), actual = proyectoDe(cur).clave;
    for (const t of tabs) {
      if (!ok(tabName(t) + ' ' + t)) continue;
      const p = proyectoDe(t), e = typeof edits !== 'undefined' && edits.get(t);
      (grupos.get(p.clave) || grupos.set(p.clave, { nombre: p.nombre, items: [] }).get(p.clave)).items.push({
        tab: t, html: `${fileIcon(tabName(t), false)}<b>${esc(tabName(t))}</b><small>${p.tipo ? `${icoT(p.tipo)} ${TIPO[p.tipo][1]}` : ''}</small>${e && isDirty(e) ? '<em>● sin guardar</em>' : ''}${t === cur ? '<em>en pantalla</em>' : ''}`,
        ir: () => { palCerrar(); if (on()) cerrar(); openTab(t, true); } });
    }
    const orden = [...grupos.keys()].sort((a, b) => (b === actual) - (a === actual) || (a === '') - (b === ''));
    palItems = [];
    let html = orden.map(k => { const g = grupos.get(k); palItems.push(...g.items); return `<h5>${k ? '● ' : ''}${esc(g.nombre)}</h5>${g.items.map(() => '<div class="palit"></div>').join('')}`; }).join('');
    if (w.length) { // también: proyectos, carpetas y acciones
      const otros = [];
      for (const f of O.st?.fichas || []) {
        if (ok(f.nombre + ' ' + (f.descripcion || '') + ' ' + (f.tecnologia || []).join(' '))) {
          otros.push({ html: `🗂 <b>${esc(f.nombre)}</b><small>proyecto · ${ESTADO[f.estado][1]}</small>`, ir: () => { palCerrar(); if (!on()) abrir().then(() => adminAbrir(f)); else adminAbrir(f); } });
          for (const [a, t] of [['vscode', 'Abrir en VS Code'], ['claude', 'Claude con todo el proyecto'], ['terminal', 'Terminal']])
            otros.push({ html: `⚡ <b>${esc(f.nombre)}</b> · ${t}<small>acción</small>`, ir: () => { palCerrar(); accion(a, f, null); } });
        }
        for (const p of f.partes) for (const c of p.carpetas) if (c.nombre && ok(c.nombre + ' ' + p.nombre))
          otros.push({ html: `${icoC(c, p.tipo)} <b>${esc(c.nombre)}</b><small>${esc(f.nombre)} › ${icoT(p.tipo)} ${esc(p.nombre)}</small>`,
            ir: () => { palCerrar(); api('/api/mostrar', { ruta: c.ruta }).catch(err); } });
      }
      for (const [t, fn] of [['Tablero de proyectos', () => { if (!on()) abrir(); }], ['Buscar proyectos en los discos', async () => { if (!on()) await abrir(); O.pantalla = 'arranque'; O.props = null; arranque(); }], ['Actividad del organizador', async () => { if (!on()) await abrir(); actividadDlg(); }]])
        if (ok(t)) otros.push({ html: `⚡ <b>${t}</b><small>acción</small>`, ir: () => { palCerrar(); fn(); } });
      otros.push(...archivos);
      if (otros.length) { html += '<h5>Resultados</h5>' + otros.map(() => '<div class="palit"></div>').join(''); palItems.push(...otros); }
    }
    const L = pal.querySelector('#palL');
    L.innerHTML = html || `<p class="ohint">${w.length ? 'Sin resultados.' : 'No hay pestañas abiertas.'}</p>`;
    L.querySelectorAll('.palit').forEach((el, i) => { el.innerHTML = palItems[i].html; el.onclick = () => palItems[i].ir(); el.onmousemove = () => { palSel = i; palMarcar(); }; });
    palMarcar();
  }
  const palMarcar = () => pal.querySelectorAll('.palit').forEach((el, i) => { el.classList.toggle('on', i === palSel); if (i === palSel) el.scrollIntoView({ block: 'nearest' }); });
  async function palArchivos(texto) { // archivos por nombre en las carpetas de todos los proyectos
    const raices = (O.st?.fichas || []).flatMap(f => vivas(f).map(c => c.ruta));
    if (!raices.length) return;
    try {
      const r = await api('/api/arbol/filtro?q=' + encodeURIComponent(texto) + '&raices=' + encodeURIComponent([...new Set(raices)].join('|')));
      if (pal.hidden || pal.querySelector('#palQ').value !== texto) return;
      palPintar(texto, (r.items || []).filter(i => !i.dir && !i.ruta.endsWith('.desklens-ancla')).slice(0, 30).map(i => {
        const p = proyectoDe(i.ruta), n = i.ruta.split(/[\\/]/).pop();
        return { html: `${fileIcon(n, false)}<b>${esc(n)}</b><small>${esc(p.nombre)} · ${esc(i.ruta)}</small>`, ir: () => { palCerrar(); if (on()) cerrar(); openTab(i.ruta, true); } };
      }));
    } catch {}
  }

  // insignia de alertas al arrancar DeskLens (sin abrir el tablero)
  api('/api/org/estado').then(s => {
    O.st = s; insignia(); btn.hidden = !s.ajustes.encendido; // apagado en Ajustes: sin icono
    // DeskLens se cerró con el tablero abierto: vuelve tal cual (salvo si se abrió para ver un archivo desde Windows)
    if (s.ajustes.encendido && donde().abierto && !/[?&](abrir|nueva)=/.test(location.search)) abrir();
  }).catch(() => {});
})();
