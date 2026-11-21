// Organizador de proyectos (módulo de DeskLens; plan en implementar_organizador.md, Fase 1a).
// Pantallas: tablero de proyectos, flujo de arranque (discos → recorrido → relaciones por nombre), editor de jerarquía,
// discos y exclusiones, anclas no encontradas, actividad y ajustes. No mueve archivos: solo cambia fichas y anclas.
// Usa lo que ya da DeskLens (api, ask, flash, esc, iconBtn, LS, openMenu, openTerminal, KEYS…): este archivo se carga
// después de su script. Si falta (carpeta organizador/ borrada), DeskLens sigue igual: no hay icono ni atajo.
(() => {
  const TIPO = { codigo: ['💻', 'Código'], material: ['🎬', 'Material'], web: ['🌐', 'Web'], respaldos: ['🗄', 'Respaldos'],
    base_datos: ['🛢', 'Base de datos'], documentos: ['📄', 'Documentos'], otro: ['📁', 'Otro'] };
  const ESTADO = { activo: ['●', 'Activo'], pausado: ['◐', 'Pausado'], terminado: ['✓', 'Terminado'], archivo: ['▣', 'Archivo'] };
  const BORRADA = { papelera: 'en la papelera', eliminada: 'eliminada' }; // carpetas borradas: no «movidas»
  const ICONOS = ['📁', '💻', '🎬', '🎵', '🖼', '📚', '📄', '🌐', '🗄', '🛢', '📝', '⭐', '🔧', '📦'];
  const O = { st: null, git: {}, pantalla: 'tablero', props: null, jer: null, poll: null,
    filtro: LS('desklens.org.filtro') || 'todos', orden: LS('desklens.org.orden') || 'actividad', vista: LS('desklens.org.vista') || 'tarjetas', q: '' };
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
  KEYS.push(['Proyectos', [['Ctrl+Shift+O', 'Abrir o cerrar el tablero de proyectos'], ['Esc', 'Salir del tablero de proyectos (o volver al tablero desde un proyecto o desde el editor de jerarquía)']]]);
  addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); on() ? cerrar() : abrir(); }
    else if (e.key === 'Escape' && on() && !document.querySelector('dialog[open]') && !$('#menu')) {
      if (O.pantalla === 'jerarquia') O.jer.volver(); else if (O.pantalla === 'proyecto') { if (!e.target.closest?.('#panes')) adminSalir(); } else if (O.pantalla === 'arranque' && O.st?.fichas.length) { O.pantalla = 'tablero'; pintar(); } else cerrar();
    }
  });
  async function abrir() {
    if (typeof gitFullOn === 'function' && gitFullOn()) gitFullClose(true);
    document.body.classList.add('orgfull');
    if (!O.st) root.innerHTML = '<p class="oempty">Cargando proyectos…</p>';
    await cargar();
  }
  function cerrar() { devolverPanes(); document.body.classList.remove('orgfull'); pararPoll(); }
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
  function barra() {
    const n = k => O.st.fichas.filter(f => k === 'todos' ? f.estado !== 'archivo' : f.estado === k).length;
    const chips = ['todos', ...Object.keys(ESTADO)].map(k => `<button data-f="${k}" class="${O.filtro === k ? 'on' : ''}">${k === 'todos' ? 'Todos' : ESTADO[k][1]}<b>${n(k)}</b></button>`).join('');
    return `<div class="obar"><h2>🗂 Proyectos</h2><div class="ochips">${chips}</div>
      <input type="search" id="oQ" placeholder="Filtrar proyectos…" value="${esc(O.q)}">
      <span class="sp"></span>
      <label>Orden <select id="oOrden">${[['actividad', 'Última actividad'], ['nombre', 'Nombre'], ['avance', 'Avance'], ['estado', 'Estado']].map(([v, t]) => `<option value="${v}" ${O.orden === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Vista <select id="oVista"><option value="tarjetas" ${O.vista === 'tarjetas' ? 'selected' : ''}>▦ Tarjetas</option><option value="lista" ${O.vista === 'lista' ? 'selected' : ''}>☰ Lista</option><option disabled>◉ Red (llega en la Fase 1b)</option></select></label>
      <button class="obtn ${O.st.alertas ? 'warn' : ''}" id="oAl" title="Anclas no encontradas">⚠ ${O.st.alertas}</button>
      <button class="obtn" id="oDi" title="Discos donde se buscan anclas">💽 ${O.st.discos_activos}</button>
      <button class="obtn" id="oAc" title="Actividad: qué está pasando y dónde">📋${O.st.recorrido?.activo ? ' ⟳' : ''}</button>
      <button class="obtn" id="oAj" title="Ajustes del organizador">⚙</button>
      <button class="obtn primary" id="oBuscar">+ Buscar en discos</button></div>`;
  }
  function tarjeta(f) {
    const cuenta = {}; f.partes.forEach(p => cuenta[p.tipo] = (cuenta[p.tipo] || 0) + p.carpetas.length);
    const c = codigoDe(f), g = c && O.git[c.ruta];
    const git = !c ? '' : !c.git ? '⎇ sin git' : !g ? '⎇ …' : g.rama == null ? '⎇ sin git'
      : `⎇ ${esc(g.rama)} · ${g.cambios ? `${g.cambios} cambio${g.cambios > 1 ? 's' : ''}` : 'al día'}${g.adelante ? ` · ↑${g.adelante}` : ''}${g.atras ? ` · ↓${g.atras}` : ''}`;
    const web = (f.enlaces || [])[0];
    return `<div class="ocard oestado-${f.estado}" data-id="${f.id}" style="${f.color ? `--oc:${esc(f.color)}` : ''}">
      <h3>${f.fijado ? '⭐' : ''}<span>${esc(f.nombre)}</span></h3>
      <div class="oest">${ESTADO[f.estado][0]} ${ESTADO[f.estado][1]} <span class="obarp"><i style="width:${f.avance}%"></i></span> ${f.avance}%</div>
      ${f.descripcion ? `<div class="odesc">${esc(f.descripcion)}</div>` : ''}
      ${f.tecnologia?.length ? `<div class="otec">${esc(f.tecnologia.join(' · '))}</div>` : ''}
      <div class="opartes">${Object.entries(cuenta).filter(([, n]) => n).map(([t, n]) => `<span title="${TIPO[t][1]}">${TIPO[t][0]}${n}</span>`).join('')}${f.papelera ? `<span class="owarn" title="Carpetas enviadas a la papelera o eliminadas">🗑 ${f.papelera} en la papelera</span>` : ''}${f.avisos - f.papelera ? `<span class="owarn" title="Partes no encontradas">⚠ ${f.avisos - f.papelera}</span>` : ''}</div>
      ${git ? `<div class="ogit">${git}</div>` : ''}
      <div class="ogit">${esc(f.actualizado || '')}</div>
      <div class="oact"><button data-a="carpeta" title="Abrir la carpeta de código en el Explorador">📂</button><button data-a="vscode" title="Abrir en VS Code">VS</button>
        <button data-a="claude" title="Claude con todas las partes del proyecto (--add-dir)">✦</button><button data-a="terminal" title="Terminal en la carpeta de código">&gt;_</button>
        ${web ? `<button data-a="web" title="${esc(web.nombre)}: ${esc(web.url)}">🌐</button>` : ''}<span class="sp"></span><button data-a="menu" title="Más acciones">⋯</button></div></div>`;
  }
  function tablero() {
    if (!O.st.fichas.length) { O.pantalla = 'arranque'; return arranque(); }
    const fs = filtradas();
    const banner = O.st.sin_convertir?.length ? `<div class="obanner">Tienes <b>${O.st.sin_convertir.length}</b> proyecto(s) en DeskLens sin ficha.<span class="sp"></span><button class="obtn primary" id="oConv">Convertirlos en fichas</button></div>` : '';
    const cuerpo = !fs.length ? '<p class="oempty">Ningún proyecto con este filtro.</p>' : O.vista === 'lista'
      ? `<table class="olist"><thead><tr><th>Proyecto</th><th>Estado</th><th>Avance</th><th>Partes</th><th>Git</th><th>Actualizado</th></tr></thead><tbody>${fs.map(f => {
        const c = codigoDe(f), g = c && O.git[c.ruta];
        return `<tr data-id="${f.id}"><td>${f.fijado ? '⭐ ' : ''}<b>${esc(f.nombre)}</b></td><td>${ESTADO[f.estado].join(' ')}</td><td>${f.avance}%</td>
          <td>${f.partes.map(p => TIPO[p.tipo][0]).join(' ')}${f.papelera ? ` <span class="owarn">🗑 ${f.papelera}</span>` : ''}${f.avisos - f.papelera ? ` <span class="owarn">⚠ ${f.avisos - f.papelera}</span>` : ''}</td><td>${g?.rama ? `⎇ ${esc(g.rama)}${g.cambios ? ` · ${g.cambios}` : ''}` : ''}</td><td>${esc(f.actualizado || '')}</td></tr>`; }).join('')}</tbody></table>`
      : `<div class="ocards">${fs.map(tarjeta).join('')}</div>`;
    root.innerHTML = barra() + `<div class="obody">${banner}${cuerpo}</div>`;
    root.querySelectorAll('.ochips button').forEach(b => b.onclick = () => { O.filtro = b.dataset.f; LS('desklens.org.filtro', O.filtro); tablero(); });
    const q = root.querySelector('#oQ'); q.oninput = () => { O.q = q.value; const pos = q.selectionStart; tablero(); const n = root.querySelector('#oQ'); n.focus(); n.setSelectionRange(pos, pos); };
    root.querySelector('#oOrden').onchange = e => { O.orden = e.target.value; LS('desklens.org.orden', O.orden); tablero(); };
    root.querySelector('#oVista').onchange = e => { O.vista = e.target.value; LS('desklens.org.vista', O.vista); tablero(); };
    root.querySelector('#oAl').onclick = alertasDlg; root.querySelector('#oDi').onclick = discosDlg;
    root.querySelector('#oAc').onclick = actividadDlg; root.querySelector('#oAj').onclick = ajustesDlg;
    root.querySelector('#oBuscar').onclick = () => { O.pantalla = 'arranque'; O.props = null; arranque(); };
    root.querySelector('#oConv')?.addEventListener('click', convertir);
    root.querySelectorAll('[data-id]').forEach(el => el.onclick = e => {
      const f = O.st.fichas.find(x => x.id === el.dataset.id), a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return adminAbrir(f); // clic en la tarjeta: la vista de administración del proyecto
      e.stopPropagation(); accion(a, f, e.target.closest('button'));
    });
  }
  async function accion(a, f, b) {
    const c = codigoDe(f) || f.partes.flatMap(p => p.carpetas).find(x => x.estado === 'ok' || x.estado === 'movida');
    try {
      if (a === 'menu') return openMenu(b, [['📋 Ficha…', () => fichaDlg(f)], ['🧩 Editar jerarquía…', () => editarFicha(f)], '-',
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
  async function quitar(f) {
    if (await ask('Quitar del organizador', `«${f.nombre}» deja de estar en el tablero. No se borra nada del disco: las carpetas y sus anclas se quedan donde están (la ficha se guarda en historial/organizador/quitados/).`, ['Quitar', 'Cancelar'], { danger: true }) !== 'Quitar') return;
    try { await api('/api/org/ficha/quitar', { id: f.id }); await cargar(); } catch (e) { err(e); }
  }
  async function convertir() {
    const n = O.st.sin_convertir.length;
    if (await ask('Convertir en fichas', `Cada uno de los ${n} proyecto(s) de DeskLens pasa a una ficha con su carpeta como parte 💻 Código, y se le pone su ancla (.desklens-ancla). La barra lateral sigue igual.`, ['Convertir', 'Cancelar']) !== 'Convertir') return;
    try { const r = await api('/api/org/convertir', { rutas: O.st.sin_convertir }); r.avisos.forEach(a => flash('⚠ ' + a)); flash(`✓ ${r.fichas.length} ficha(s) creada(s)`); await cargar(); }
    catch (e) { err(e); }
  }

  // ---------- diálogos ----------
  function abrirDlg(titulo, html, { ancho, pie = '' } = {}) {
    dlg.style.width = ancho ? `min(${ancho}px, calc(100vw - 32px))` : '';
    dlg.innerHTML = `<header><b>${titulo}</b><button class="ic" title="Cerrar">✕</button></header><div class="odb">${html}</div>${pie ? `<footer>${pie}</footer>` : ''}`;
    dlg.querySelector('header button').onclick = () => cerrarDlg();
    dlg.onclose = () => pararPoll();
    delete dlg.dataset.cambios;
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
    if (e.key === 'Escape' && dlg.open && !$('#ask')?.open && !$('#menu')) { e.preventDefault(); e.stopPropagation(); cerrarDlg(); }
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
      <td>${esc(a.proyecto)}</td><td>${TIPO[a.tipo][0]} ${esc(a.parte)}</td><td>${esc(a.ruta)}</td><td>${estado(a)}</td><td>${hace(a.visto)}</td>
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
  async function ajustesDlg() {
    let a;
    try { a = await api('/api/org/ajustes'); } catch (e) { return err(e); }
    const modos = [['todo', 'Todo el contenido'], ['nombres_pdf', 'Nombres + texto de PDF y Word'], ['nombres', 'Solo nombres'], ['no', 'No se indexa']];
    const d = abrirDlg('⚙ Ajustes › Proyectos', `<div class="oform">
      <label>Organizador</label><label><input type="checkbox" id="aEn" ${a.encendido ? 'checked' : ''}> encendido</label>
      <label>Anclas</label><div><label><input type="checkbox" id="aGit" ${a.ignorar_git ? 'checked' : ''}> Ignorar en git (.git/info/exclude, solo este PC)</label><label><input type="checkbox" id="aWeb" ${a.avisar_web ? 'checked' : ''}> Avisar al anclar una carpeta web (htdocs, www…)</label></div>
      <label>Índice por tipo</label><div>${Object.keys(TIPO).map(t => `<div style="display:flex;gap:8px;align-items:center;margin:2px 0"><span style="width:130px">${TIPO[t].join(' ')}</span>${t === 'respaldos' || t === 'base_datos' ? '<small>No se indexan (solo se ven)</small>'
        : `<select data-t="${t}">${modos.filter(m => m[0] !== 'no' || t === 'otro').map(([v, n]) => `<option value="${v}" ${a.indice[t] === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</div>`).join('')}
        <small>Se aplica al índice de las partes cuando llegue la vista de administración del proyecto.</small></div>
      <label>Historial</label><span>Por defecto: <input type="number" id="aHd" min="1" max="365" value="${a.historial_dias}" style="width:64px"> días · <input type="number" id="aHm" min="0" max="100000" value="${a.historial_mb}" style="width:80px"> MB por proyecto</span>
      <label>Datos</label><span><code>historial\\organizador\\</code> <small>fichas, anclas, discos y actividad</small></span>
      <label>Atajos</label><span>Ctrl+Shift+O tablero · Esc salir <small>(también en ⚙ Ajustes › Accesos por teclado › Proyectos)</small></span></div>`,
    { pie: '<span class="sp"></span><button class="obtn" id="aX">Cancelar</button><button class="obtn primary" id="aOk">Guardar</button>' });
    d.querySelector('#aX').onclick = () => dlg.close();
    d.querySelector('#aOk').onclick = async () => {
      const indice = {}; d.querySelectorAll('[data-t]').forEach(s => indice[s.dataset.t] = s.value);
      try {
        await api('/api/org/ajustes', { encendido: d.querySelector('#aEn').checked, ignorar_git: d.querySelector('#aGit').checked, avisar_web: d.querySelector('#aWeb').checked,
          indice, historial_dias: +d.querySelector('#aHd').value, historial_mb: +d.querySelector('#aHm').value });
        dlg.close(); flash('✓ Ajustes del organizador guardados'); cargar();
      } catch (e) { err(e); }
    };
  }

  // ---------- flujo de arranque: discos → recorrido → relaciones (✓/✗) → fichas ----------
  async function arranque() {
    const pasos = n => `<div class="osteps">${['1 Discos', '2 Recorrido', '3 Relaciones', '4 Fichas'].map((t, i) => i + 1 === n ? `<b>${t}</b>` : t).join(' › ')}</div>`;
    const atras = O.st?.fichas.length ? '<button class="obtn" id="oVolver">← Tablero</button>' : '';
    const cab = `<div class="obar"><h2>🗂 Proyectos · Buscar en discos</h2><span class="sp"></span>${atras}<button class="obtn" id="oAc2">📋</button></div>`;
    const enlazar = () => { root.querySelector('#oVolver')?.addEventListener('click', () => { O.pantalla = 'tablero'; pintar(); }); root.querySelector('#oAc2').onclick = actividadDlg; };
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
        p.carpetas.forEach(c => (partes[c.tipo] ||= { nombre: TIPO[c.tipo][1], tipo: c.tipo, carpetas: [] }).carpetas.push({ ruta: c.ruta, nombre: c.nombre, icono: c.icono, incluida: true, anclada: c.anclada }));
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
        partes: p.partes.map(pt => ({ nombre: pt.nombre, tipo: pt.tipo, carpetas: pt.carpetas.filter(c => c.incluida).map(c => ({ ruta: c.ruta, icono: c.icono })) })).filter(pt => pt.carpetas.length) }));
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
        : `<div class="ofold ${c.incluida ? '' : 'no'}" draggable="true" title="${esc(c.ruta || '')}"><input type="checkbox" ${c.incluida ? 'checked' : ''} title="Incluida en el proyecto"><span class="oico" title="Cambiar icono">${esc(c.icono || '📁')}</span><div><b>${esc(c.nombre)}</b><small>${esc(c.ruta || '')}</small></div></div>`;
      root.innerHTML = `<div class="obar"><h2>🧩 ${esc(p.nombre)} · ${n} ${alGuardar ? 'carpetas' : 'coincidencias'}</h2><span class="sp"></span>
        ${alGuardar ? '<button class="obtn primary" id="jG">Guardar</button>' : ''}<button class="obtn" id="jV">← Regresar</button></div>
        <div class="ojerwrap"><div class="ojer"><nav><h5>Proyectos</h5>${proyectos.map((x, i) => `<div class="oproj ${i === idx ? 'on' : ''}" data-p="${i}">● ${esc(x.nombre)}</div>`).join('')}
          <h5>Sin proyecto</h5><div class="osin">${p.sin.map(fold).join('') || '<small>Suelta aquí lo que no es de este proyecto</small>'}</div></nav>
          <section><div class="oroot">● <b>${esc(p.nombre)}</b><small>${p.partes.length} parte(s)</small></div><div class="ovline"></div>
            <div class="oparts">${p.partes.map((pt, j) => `<div class="opart" data-j="${j}"><h4>${TIPO[pt.tipo][0]} <input value="${esc(pt.nombre)}" style="width:100px;font:inherit;border:1px solid transparent;background:none;color:var(--ink)" title="Nombre de la parte">
              <select title="Tipo de parte">${Object.entries(TIPO).map(([t, v]) => `<option value="${t}" ${pt.tipo === t ? 'selected' : ''}>${v[1]}</option>`).join('')}</select><span class="sp"></span>${pt.carpetas.length ? '' : '<button class="ic" data-del title="Quitar la parte vacía">✕</button>'}</h4>
              ${pt.carpetas.map(fold).join('') || '<small>Suelta aquí carpetas</small>'}</div>`).join('')}
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
        } else el.querySelector('.oico').onclick = e => openMenu(e.target, ICONOS.map(ic => [ic, () => { c.icono = ic; pintar(); }]));
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
        estado: c.estado, eliminada: c.eliminada })) })) }));
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
            if (JSON.stringify(m) === JSON.stringify(antes[i])) continue; // solo las fichas que cambiaron
            await api('/api/org/ficha/guardar', { id: m.id, partes: m.partes.map(pt => ({ nombre: pt.nombre, tipo: pt.tipo,
              carpetas: pt.carpetas.map(c => ({ ancla: c.ancla, activa: c.incluida, ...(c.icono !== c._ico || c._propio ? { icono: c.icono } : {}) })) })) });
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
    O.adm = { id: f.id, tab: LS('desklens.org.tab') || 'archivos', q: '', abiertas: new Set(JSON.parse(LS('desklens.org.abiertas.' + f.id) || '[]')) };
    O.pantalla = 'proyecto'; pintar();
  }
  function devolverPanes() { // el visor vuelve a su sitio de DeskLens
    if (!panesHome) return;
    panesHome.parent.insertBefore($('#panes'), panesHome.next); panesHome = null;
    document.body.classList.remove('orgadm');
  }
  function adminSalir() { devolverPanes(); O.adm = null; O.pantalla = 'tablero'; pintar(); }
  const vivas = f => f.partes.flatMap(p => p.carpetas.filter(c => c.estado === 'ok' || c.estado === 'movida').map(c => ({ ...c, tipo: p.tipo, parte: p.nombre })));
  function admin() {
    const f = O.st.fichas.find(x => x.id === O.adm.id);
    if (!f) return adminSalir();
    const c = codigoDe(f), g = c && O.git[c.ruta], web = (f.enlaces || [])[0];
    const git = !c ? '' : !c.git ? '⎇ sin git' : !g ? '⎇ …' : g.rama == null ? '⎇ sin git' : `⎇ ${esc(g.rama)} · ${g.cambios ? `${g.cambios} cambio${g.cambios > 1 ? 's' : ''}` : 'al día'}${g.adelante ? ` · ↑${g.adelante}` : ''}${g.atras ? ` · ↓${g.atras}` : ''}`;
    if (O.adm.tab !== 'archivos') devolverPanes();
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
    root.querySelectorAll('.otabs button').forEach(b => b.onclick = () => { O.adm.tab = b.dataset.t; LS('desklens.org.tab', O.adm.tab); admin(); });
    ({ archivos: adminArchivos, ficha: adminFicha, git: adminGit, estado: adminEstado }[O.adm.tab] || adminLuego)(f, root.querySelector('#aB'));
  }

  // Archivos: árbol unido por partes (carpetas que se abren al pulsar) + visor de DeskLens a la derecha
  function adminArchivos(f, B) {
    B.innerHTML = `<div class="oadm"><div class="oarbol">
        <div class="oaq"><input type="search" id="aQ" placeholder="Buscar en el proyecto…" value="${esc(O.adm.q)}">
          <select id="aV" title="Vista"><option>🗂 Contenedor</option><option disabled>⇢ Flujo (Fase 1b)</option><option disabled>◉ Red (Fase 1b)</option></select></div>
        <div id="aTree" class="otree"></div>
        <button class="obtn" id="aJ">🧩 Editar jerarquía</button></div>
      <div class="ores" title="Arrastra para cambiar el ancho"></div><div class="oslot"></div></div>`;
    // el visor de DeskLens se presta a esta vista (mismas pestañas, editor, PDF, Word…)
    if (!panesHome) { const p = $('#panes'); panesHome = { parent: p.parentNode, next: p.nextSibling }; }
    B.querySelector('.oslot').append($('#panes'));
    document.body.classList.add('orgadm');
    const W = +LS('desklens.org.arbolW') || 320; B.querySelector('.oadm').style.setProperty('--arbolW', W + 'px');
    B.querySelector('.ores').onpointerdown = e => { // ancho del árbol: arrastrando el borde (se recuerda)
      const box = B.querySelector('.oadm'), x0 = e.clientX, w0 = box.querySelector('.oarbol').offsetWidth;
      const mv = ev => box.style.setProperty('--arbolW', Math.max(220, Math.min(700, w0 + ev.clientX - x0)) + 'px');
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); LS('desklens.org.arbolW', parseInt(box.style.getPropertyValue('--arbolW'))); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
    B.querySelector('#aJ').onclick = () => { devolverPanes(); editarFicha(f); };
    const T = B.querySelector('#aTree');
    const q = B.querySelector('#aQ');
    let tq;
    q.oninput = () => { O.adm.q = q.value; clearTimeout(tq); tq = setTimeout(() => O.adm.q.trim() ? buscarEn(f, T) : arbol(f, T), 250); };
    O.adm.q.trim() ? buscarEn(f, T) : arbol(f, T);
  }
  const guardarAbiertas = () => LS('desklens.org.abiertas.' + O.adm.id, JSON.stringify([...O.adm.abiertas]));
  function arbol(f, T) {
    T.innerHTML = f.partes.map((p, j) => `<div class="oparte"><div class="ophead">${TIPO[p.tipo][0]} ${esc(p.nombre)}</div>${p.carpetas.map((c, k) => {
      const borrada = BORRADA[c.estado], viva = c.estado === 'ok' || c.estado === 'movida';
      const marcas = `${c.git ? '<span title="Repositorio git">⎇</span>' : ''}${c.proyectos.length > 1 ? `<span title="Compartida con ${c.proyectos.length - 1} proyecto(s) más">🔗</span>` : ''}${borrada ? `<span class="owarn">🗑 ${borrada}</span>` : c.estado === 'desconectado' ? '<span class="owarn">⚠ no conectado</span>' : c.estado === 'falta' ? '<span class="owarn">⚠ no encontrada</span>' : ''}`;
      return `<div class="onodo raiz ${viva ? '' : 'gris'}" data-j="${j}" data-k="${k}" data-ruta="${esc(c.ruta)}" data-dir="1" title="${esc(c.ruta)}">
        <span class="otw">${viva ? (O.adm.abiertas.has(c.ruta) ? '▾' : '▸') : ''}</span><span>${esc(c.icono || '📁')}</span><span class="onom">${esc(c.nombre)}</span>${marcas}</div>
        <div class="ohijos" data-de="${esc(c.ruta)}"></div>`;
    }).join('') || '<div class="osmall" style="padding:2px 12px">(sin carpetas)</div>'}</div>`).join('') || '<p class="ohint">El proyecto no tiene carpetas: añádelas con 🧩 Editar jerarquía.</p>';
    T.onclick = e => {
      const n = e.target.closest('.onodo'); if (!n || n.classList.contains('gris')) return;
      if (n.dataset.dir) abrirCarpeta(n, T); else openTab(n.dataset.ruta, false);
    };
    T.ondblclick = e => { const n = e.target.closest('.onodo'); if (n && !n.dataset.dir) openTab(n.dataset.ruta, true); };
    T.oncontextmenu = e => {
      const n = e.target.closest('.onodo'); if (!n || n.classList.contains('gris') && !n.classList.contains('raiz')) return;
      e.preventDefault();
      const ruta = n.dataset.ruta, dir = !!n.dataset.dir, raiz = n.classList.contains('raiz');
      const c = raiz ? f.partes[+n.dataset.j].carpetas[+n.dataset.k] : null;
      openMenu({ x: e.clientX, y: e.clientY }, [
        ['📂 Mostrar en el Explorador', () => api('/api/mostrar', { ruta }).catch(err), { disabled: n.classList.contains('gris') }],
        ...(dir ? [['>_ Terminal aquí', () => { adminSalir(); cerrar(); openTerminal(ruta); }, { disabled: n.classList.contains('gris') }]] : [['Abrir', () => openTab(ruta, true)]]),
        ...(raiz ? ['-', ['Quitar del proyecto…', async () => {
          if (await ask('Quitar del proyecto', `«${c.nombre}» deja de ser parte de «${f.nombre}». No se borra nada del disco.`, ['Quitar', 'Cancelar'], { danger: true }) !== 'Quitar') return;
          try { await api('/api/org/ficha/quitar_carpeta', { id: f.id, ancla: c.ancla }); await cargar(); } catch (x) { err(x); }
        }, { danger: true }]] : [])]);
    };
    for (const r of O.adm.abiertas) { const n = T.querySelector(`.onodo[data-ruta="${CSS.escape(r)}"]`); if (n) abrirCarpeta(n, T, true); }
  }
  async function abrirCarpeta(n, T, restaurar = false) {
    const ruta = n.dataset.ruta, hijos = n.nextElementSibling, abierta = O.adm.abiertas.has(ruta) && !restaurar;
    if (abierta) { O.adm.abiertas.delete(ruta); hijos.innerHTML = ''; n.querySelector('.otw').textContent = '▸'; return guardarAbiertas(); }
    O.adm.abiertas.add(ruta); guardarAbiertas(); n.querySelector('.otw').textContent = '▾';
    let items;
    try { items = await api('/api/dir?ruta=' + encodeURIComponent(ruta)); } catch (e) { hijos.innerHTML = `<div class="osmall owarn" style="padding-left:24px">⚠ ${esc(e.message)}</div>`; return; }
    const nivel = (+n.dataset.nivel || 0) + 1;
    hijos.innerHTML = items.filter(i => i.nombre !== '.desklens-ancla').map(i => `<div class="onodo" style="padding-left:${8 + nivel * 14}px" data-ruta="${esc(i.ruta)}" data-nivel="${nivel}" ${i.dir ? 'data-dir="1"' : ''} title="${esc(i.ruta)}">
      <span class="otw">${i.dir ? '▸' : ''}</span>${fileIcon(i.nombre, i.dir)}<span class="onom">${esc(i.nombre)}</span>${i.git && i.git !== 'limpio' ? `<span class="ogitpt" title="${esc(i.git)}">●</span>` : ''}</div>${i.dir ? `<div class="ohijos" data-de="${esc(i.ruta)}"></div>` : ''}`).join('')
      || `<div class="osmall" style="padding-left:${8 + nivel * 14}px">(vacía)</div>`;
    for (const r of O.adm.abiertas) if (r.startsWith(ruta + '\\') || r.startsWith(ruta + '/')) { const m = hijos.querySelector(`.onodo[data-ruta="${CSS.escape(r)}"]`); if (m && m.parentElement === hijos) abrirCarpeta(m, T, true); }
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
      T.onclick = e => { const n = e.target.closest('.onodo'); if (!n) return; n.dataset.dir ? api('/api/mostrar', { ruta: n.dataset.ruta }).catch(err) : openTab(n.dataset.ruta, false); };
      T.ondblclick = e => { const n = e.target.closest('.onodo'); if (n && !n.dataset.dir) openTab(n.dataset.ruta, true); };
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
      <td>${TIPO[c.tipo][0]} ${esc(c.parte)}</td><td><span title="${esc(c.ruta)}">${esc(c.icono || '📁')} ${esc(c.nombre)}</span><br><small>${esc(c.ruta)}</small></td>
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

  // insignia de alertas al arrancar DeskLens (sin abrir el tablero)
  api('/api/org/estado').then(s => { O.st = s; insignia(); }).catch(() => {});
})();
