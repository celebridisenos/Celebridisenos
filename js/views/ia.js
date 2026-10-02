// ================= Asistente de IA LOCAL: conversación, biblioteca, memoria y actividad =================
import { h, mount, icon, btn, toast, fdt, fdate, pill, sel, sw, modal, field, inp, area, confirmDlg, ago } from '../ui.js';
import { S, can, api, mutate, kv, upsertLocal, removeLocal, emit, pull } from '../store.js';
import { go, handleError } from '../app.js';
import { desktop } from '../desktop.js';
import { ask, toolLabel, NO_DATA, respStyle, setRespStyle } from '../ai/engine.js';
import { objetivos, objetivoTexto, brief } from '../ai/celebrity.js';
import { localStatus } from '../ai/models.js';
import { baseDocs, search, ragStatus, ensureIndex, startEmbedder } from '../ai/rag.js';
import { extractText, DOC_TYPES } from '../ai/extract.js';
import { uploadFile } from '../files.js';
const CL = window.CL;

// ---------- Texto con formato sencillo (seguro: sin HTML del modelo) ----------
export function richText(text, onRef) {
  const box = h('div.rich');
  let list = null;
  String(text || '').split('\n').forEach(line => {
    const li = /^\s*(?:[-•*]|\d+[.)])\s+(.*)/.exec(line);
    const hd = /^\s*#{1,4}\s+(.*)/.exec(line);
    const el = li ? h('li') : hd ? h('div.bold') : h('p');
    inline(li ? li[1] : hd ? hd[1] : line, el, onRef);
    if (li) { if (!list) { list = h('ul'); box.appendChild(list); } list.appendChild(el); }
    else { list = null; if (line.trim() || box.lastChild && box.lastChild.tagName !== 'BR') box.appendChild(line.trim() ? el : h('br')); }
  });
  return box;
}
function inline(s, el, onRef) {
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[(?:T|D|M|C)\d*\])/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) el.appendChild(document.createTextNode(s.slice(i, m.index)));
    const t = m[0];
    if (t.startsWith('**')) el.appendChild(h('b', t.slice(2, -2)));
    else if (t.startsWith('`')) el.appendChild(h('code', t.slice(1, -1)));
    else if (t.startsWith('[')) el.appendChild(h('button.ref', { onclick: () => onRef && onRef(t.slice(1, -1)) }, t.slice(1, -1)));
    else el.appendChild(h('i', t.slice(1, -1)));
    i = m.index + t.length;
  }
  if (i < s.length) el.appendChild(document.createTextNode(s.slice(i)));
}

const SUGG = [
  ['¿Qué hay hoy?', null],
  ['Este producto me cuesta 12 € y quiero ganar un 40 %. ¿Qué precio pongo?', null],
  ['El cliente dice que 30 € es demasiado caro. ¿Qué le respondo?', null],
  ['¿Qué pedidos vencen esta semana?', 'pedidos.ver'],
  ['Resúmeme las ventas de este mes', 'informes.ver'],
  ['¿Qué clientes frecuentes llevan tiempo sin comprar?', 'clientes.ver'],
  ['Redacta un mensaje de seguimiento para un cliente que compró la semana pasada', null],
  ['¿Qué tareas tengo pendientes?', 'tareas.ver']
];

export function render(el, params) {
  const st = { tab: params && params[0] === 'biblioteca' ? 'biblioteca' : params && params[0] === 'memoria' ? 'memoria' : params && params[0] === 'actividad' ? 'actividad' : params && params[0] === 'objetivos' ? 'objetivos' : params && params[0] === 'revisar' ? 'revisar' : params && params[0] === 'operar' ? 'operar' : 'chat', msgs: [], busy: false, ctrl: null, voz: localStorage.getItem('cd.voz') === '1' };
  const head = h('div.page-head', h('div', h('h1.celeb-title', '✨ Celeby Nova'), h('div.muted.small', 'Tu gestora: responde con los datos reales del programa, dice de dónde sale cada cifra y avisa si algo no cuadra. Si no lo sabe, lo dice. Privada: funciona en vuestros ordenadores.')), h('div.right.row', btn('Responder a un cliente', () => import('./respuestas.js').then(m => m.replyAssistant()), { icon: 'msg', cls: 'primary' })));
  if (st.tab === 'operar' && !(desktop.on && can('config.ver'))) st.tab = 'chat';
  const status = h('div.ia-status');
  const tabs = h('div.tabs');
  const body = h('div');
  el.append(head, status, tabs, body);
  drawStatus();
  // v11: al abrir Celebrity el modelo local se precarga en segundo plano (la primera respuesta sale antes)
  if (desktop.on) import('../ai/engine.js').then(m => m.warmUp()).catch(() => { });
  function drawTabs() {
    const T = [['chat', 'Conversación'], ['revisar', '🔎 Abogado del dato'], ['objetivos', 'Objetivos'], ['biblioteca', 'Biblioteca'], ['memoria', 'Memoria y aprendizaje'], ['actividad', 'Actividad']];
    if (desktop.on && can('config.ver')) T.push(['operar', '🤖 Operar en el PC']); // v11.5: el antiguo CelebryNova, dentro de Celeby Nova
    mount(tabs, T.map(t => h('button' + (st.tab === t[0] ? '.on' : ''), { onclick: () => { st.tab = t[0]; history.replaceState(null, '', '#/ia' + (t[0] === 'chat' ? '' : '/' + t[0])); drawTabs(); show(); } }, t[1])));
  }
  async function drawStatus() {
    const s = await localStatus().catch(() => ({}));
    if (!s.disponible && S.online) { try { S.iaServidor = await api('ia.servidor', {}, { timeout: 8000 }); } catch (e) { } }
    mount(status, s.disponible ? h('span', pill('IA local activa', 'ok'), ' ', h('span.small.muted', s.modelo + ' en este PC')) :
      S.iaServidor ? h('span', pill('IA del equipo', 'info'), ' ', h('span.small.muted', 'responde ' + S.iaServidor.dispositivo + (S.iaServidor.modelo ? ' (' + S.iaServidor.modelo + ')' : ''))) :
        h('span', pill('Modo básico', 'warn'), ' ', h('span.small.muted', (s.motivo || 'Sin modelo de IA disponible ahora') + ' Busca y calcula, pero no redacta.'), ' ', can('config.ver') && desktop.on ? h('a', { href: '#/config/ia' }, 'Configurar IA local') : null));
  }
  function show() {
    if (st.novaCtl && st.novaCtl.destroy) { st.novaCtl.destroy(); st.novaCtl = null; }
    if (st.tab === 'revisar') return revisar(body);
    if (st.tab === 'operar') { mount(body); import('./celebrynova.js').then(m => { if (st.tab === 'operar') st.novaCtl = m.render(body, { embebido: true }); }); return; }
    if (st.tab === 'chat') chat(); else if (st.tab === 'objetivos') objetivosView(body); else if (st.tab === 'biblioteca') biblioteca(body); else if (st.tab === 'memoria') memoria(body); else actividad(body);
  }

  // ======================= Conversación =======================
  const key = 'chat.' + S.me.id;
  let log, ta, sendB, stopB, sugg;
  function chat() {
    log = h('div.chat-log', { role: 'log', 'aria-live': 'polite' });
    ta = h('textarea', { placeholder: 'Pregunta lo que necesites: precios, márgenes, pedidos, clientes, cómo responder a un cliente…', rows: 1, 'aria-label': 'Pregunta' });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micB = SR ? btn('', () => dictate(SR, micB), { cls: 'ghost icon', icon: 'mic', title: 'Dictar' }) : null;
    sendB = btn('', () => send(), { cls: 'primary icon', icon: 'send', title: 'Enviar' });
    stopB = btn('Parar', () => st.ctrl && st.ctrl.abort(), { cls: 'sm hidden' });
    sugg = h('div.suggest');
    const opts = h('div.row.wrap.small', { style: { marginBottom: '8px' } },
      h('label.check', sw(st.voz, v => { st.voz = v; localStorage.setItem('cd.voz', v ? '1' : '0'); if (!v && window.speechSynthesis) speechSynthesis.cancel(); }), 'Leer respuestas en voz alta'),
      btn('Nueva conversación', () => { st.msgs = []; kv.set(key, []); drawLog(); }, { cls: 'ghost sm', icon: 'refresh' }),
      // v11.8: mensaje corto o ampliado (también en las preguntas rápidas)
      h('div.seg.sm.estilo', { title: 'Cómo de largas quieres las respuestas' }, [['corto', 'Mensaje corto'], ['ampliado', 'Mensaje ampliado']].map(([k, t]) => h('button' + (respStyle() === k ? '.on' : ''), { onclick: ev => { setRespStyle(k); ev.target.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === ev.target)); drawLog(); } }, t))));
    // v11.5: «Ahora mismo» (avisos reales) y PREGUNTAS RÁPIDAS debajo de la conversación (sin IA, con datos reales)
    const now = nowNotices();
    const quick = h('div.rapidas', h('div.lbl', { style: { margin: '10px 0 6px' } }, '⚡ PREGUNTAS RÁPIDAS · responden al momento con tus datos'),
      h('div.chips', CL.RAPIDAS.map(([id, t]) => h('button.chip', { onclick: () => runRapid(id, t) }, t))));
    mount(body, opts, now.length ? h('div.card.flat', { style: { marginBottom: '10px' } }, h('div.lbl', { style: { marginBottom: '4px' } }, '🔔 AHORA MISMO'), h('div.col', { style: { gap: '4px' } }, now.map(x => h('a.small', { href: '#/' + x.enlace }, x.t)))) : null,
      h('div.chat', log, sugg, h('div.chat-in', micB, ta, stopB, sendB)), quick);
    kv.get(key).then(v => { st.msgs = (v || []).slice(-40); drawLog(); });
    setTimeout(() => ta.focus(), 50);
  }
  function drawLog() {
    mount(sugg, st.msgs.length ? null : SUGG.filter(s => !s[1] || can(s[1])).map(s => h('button', { onclick: () => send(s[0]) }, s[0])));
    if (!st.msgs.length) mount(log, h('div.empty', icon('sparkles'), h('h3', 'Hola, soy Celeby Nova'), h('p', 'Pregúntame qué hay hoy, cómo van los objetivos, precios y márgenes, pedidos, clientes o cómo responder a un cliente. Si no tengo un dato, te lo digo.')));
    else mount(log, st.msgs.map(bubble));
    log.scrollTop = log.scrollHeight;
  }
  function bubble(m) {
    if (m.role === 'user') return h('div.msg.me', m.content);
    if (m.card) return h('div.msg.ai.rapid', rapidCard(m.card, r => { m.card = r; save(); drawLog(); }));
    if (m.pending && !m.content) return h('div.msg.ai', h('span.row', h('span.sync.busy', { style: { padding: 0 } }, h('span.dot'), m.status || 'Un momento…')));
    const refOpen = ref => { const f = (m.fuentes || []).find(x => x.ref === ref); if (f && f.docId) openDoc(f.docId); else if (f) toast(f.titulo, 'info'); };
    return h('div.msg.ai' + (m.error ? '.err' : ''), m.error ? h('span.bad-t', m.content) : richText(m.content, refOpen),
      m.pending ? h('div.tiny.muted', m.status || '…') : null,
      !m.pending && m.fuentes && m.fuentes.length ? h('div.sources', h('span.tiny.muted', 'Fuentes: '), m.fuentes.map(f => h('button.src.' + f.tipo, { title: f.titulo, onclick: () => f.docId ? openDoc(f.docId) : f.url ? desktop.openUrl(f.url) : null }, (f.ref ? f.ref + ' · ' : '') + f.titulo + (f.error ? ' ⚠️' : '')))) : null,
      !m.pending && m.modo ? h('div.tiny.muted.mode', m.modo === 'celebrity' ? '✨ Celeby Nova · al instante' : m.modo === 'local' ? '🧠 IA local · ' + m.modelo + (m.cache ? ' · ya lo sabía' : '') : m.modo === 'equipo' ? '🖥️ Respondido por ' + (m.servidor || 'el PC servidor') + (m.modelo ? ' · ' + m.modelo : '') : '⚙️ Modo básico (sin redacción)' + (m.motivoBasico ? ' — ' + m.motivoBasico : ''), m.ms ? ' · ' + (m.ms / 1000).toFixed(1).replace('.', ',') + ' s' : '') : null,
      (m.acciones || []).map(a => proposal(a)));
  }
  function proposal(a) {
    const what = a.entidad === 'memoria' ? 'Guardar en la memoria de la IA' : a.nueva ? a.titulo : 'Cambiar ' + a.titulo;
    return h('div.proposal', h('div.bold', '📝 Propuesta: ' + what),
      a.entidad !== 'memoria' && !a.nueva ? h('ul.small', Object.keys(a.cambios).map(k => h('li', k + ': "' + (a.orig[k] ?? '') + '" → "' + a.cambios[k] + '"'))) : h('p.small', a.cambios.texto || a.cambios.titulo || ''),
      a.motivo ? h('p.tiny.muted', a.motivo) : null,
      a.estado ? h('p.small', a.estado === 'aplicada' ? '✅ Hecho' : 'Descartada') : h('div.row',
        btn('Confirmar', () => applyProposal(a), { cls: 'primary sm', icon: 'check' }),
        btn('Descartar', () => { a.estado = 'descartada'; save(); drawLog(); }, { cls: 'sm' })));
  }
  async function applyProposal(a) {
    const msg = a.entidad === 'memoria' ? 'La IA recordará: "' + a.cambios.texto + '". ¿Confirmas?' : a.nueva ? 'Voy a crear: ' + a.titulo + '. ¿Confirmas?' : 'Voy a modificar ' + a.titulo + ' (' + Object.keys(a.cambios).join(', ') + '). ¿Confirmas?';
    if (!await confirmDlg('Confirmar acción de la IA', msg, 'Sí, hacerlo')) return;
    try {
      if (a.entidad === 'memoria') { const r = await api('memoria.guardar', a.cambios); upsertLocal('memoria', r); }
      else if (a.entidad === 'objetivos') { S.cfg = await api('objetivos.guardar', { objetivo: a.cambios }); }
      else if (a.nueva && a.entidad === 'tareas') { const r = await mutate('tareas.guardar', { datos: Object.assign({}, a.cambios, { origen: 'ia' }) }, { onlineOnly: true, label: 'Tarea propuesta por la IA' }); if (r && r.id) upsertLocal('tareas', r); }
      else {
        const action = { pedidos: 'pedidos.guardar', clientes: 'clientes.guardar', productos: 'productos.guardar', tareas: 'tareas.guardar' }[a.entidad];
        const r = await mutate(action, { id: a.id, datos: a.cambios, orig: a.orig }, { onlineOnly: true, label: 'Propuesta IA' });
        if (r && r.id) upsertLocal(a.entidad, r);
      }
      a.estado = 'aplicada'; save(); emit(); drawLog(); toast('Hecho', 'ok');
    } catch (e) { handleError(e); }
  }
  const save = () => kv.set(key, st.msgs.filter(m => !m.pending).slice(-40));
  // v11.5: pregunta rápida → respuesta calculada con los datos (sin IA y sin inventar)
  function runRapid(id, texto, opts) {
    const R = CL.rapid(id, S.t, S.cfg, Object.assign({ hoy: S.hoy, verCostes: can('productos.costes') }, opts || {}));
    st.msgs.push({ role: 'user', content: texto || R.titulo }, { role: 'assistant', card: R, content: R.titulo + ': ' + R.valor });
    save(); drawLog();
  }
  async function send(text) {
    const q = (text || ta.value).trim();
    if (!q || st.busy) return;
    const rid = CL.rapidMatch(q);
    if (rid) { ta.value = ''; runRapid(rid, q); return; }
    ta.value = ''; ta.style.height = 'auto';
    const history = st.msgs.filter(m => !m.pending && !m.error).slice(-8).map(m => ({ role: m.role, content: m.content }));
    st.msgs.push({ role: 'user', content: q });
    const pend = { role: 'assistant', pending: true, content: '', status: 'Pensando…' };
    st.msgs.push(pend); st.busy = true; sendB.disabled = true; stopB.classList.remove('hidden'); drawLog();
    st.ctrl = new AbortController();
    let raf = 0;
    const redraw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const last = log.lastChild; if (last) last.replaceWith(bubble(pend)); log.scrollTop = log.scrollHeight; }); };
    try {
      const r = await ask(q, history, { signal: st.ctrl.signal, onToken: t => { pend.content = t; redraw(); }, onStatus: s => { pend.status = s; redraw(); } });
      Object.assign(pend, { pending: false, content: r.texto || NO_DATA, fuentes: r.fuentes, acciones: r.acciones, modo: r.modo, modelo: r.modelo, servidor: r.servidor, ms: r.ms, motivoBasico: r.motivoBasico });
      if (r.modo === 'local' || (r.herramientas || []).some(x => /^internet/.test(x))) api('ia.registrar', { tipo: 'local', resumen: q, herramientas: r.herramientas || [], acciones: r.acciones || [] }).catch(() => { });
      if (st.voz && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(pend.content.replace(/[*#_`]|\[[TDMC]\d*\]/g, '')); u.lang = 'es-ES'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    } catch (e) {
      if (e.name === 'AbortError') Object.assign(pend, { pending: false, content: (pend.content || '') + '\n\n_(Detenido)_' });
      else Object.assign(pend, { pending: false, error: true, content: e.message });
    }
    st.busy = false; st.ctrl = null; sendB.disabled = false; stopB.classList.add('hidden');
    save(); drawLog(); drawStatus();
  }
  function dictate(SR, micB) {
    const r = new SR(); r.lang = 'es-ES'; r.interimResults = false;
    micB.classList.add('primary');
    r.onresult = e => { ta.value = (ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript; ta.focus(); };
    r.onend = () => micB.classList.remove('primary');
    r.onerror = e => { micB.classList.remove('primary'); if (e.error !== 'no-speech') toast('No he podido escucharte (' + e.error + ')', 'warn'); };
    r.start();
  }

  drawTabs(); show();
  const stT = setInterval(() => { if (!document.body.contains(status)) return clearInterval(stT); if (!st.busy) drawStatus(); }, 15000);
  return { update: () => { if (st.tab === 'biblioteca' || st.tab === 'memoria') { /* se refresca al volver */ } },
    params: p => { let t = (p && p[0]) || 'chat'; if (!['chat', 'revisar', 'operar', 'objetivos', 'biblioteca', 'memoria', 'actividad'].includes(t)) t = 'chat'; if (t === 'operar' && !(desktop.on && can('config.ver'))) t = 'chat'; if (t !== st.tab) { st.tab = t; drawTabs(); show(); } },
    destroy: () => { if (st.novaCtl && st.novaCtl.destroy) st.novaCtl.destroy(); } };
}

// ======================= Ver un documento =======================
export async function openDoc(id) {
  const box = h('div.doc-view', h('p.muted', 'Cargando…'));
  modal('Documento', box, null, { size: 'wide' });
  try {
    let d = (await baseDocs()).find(x => x.id === id), text;
    if (d) text = await (await fetch('biblioteca/' + d.archivo)).text();
    else { d = (S.t.biblioteca || []).find(x => x.id === id) || { titulo: 'Documento' }; text = (await api('biblioteca.texto', { id })).texto; }
    mount(box, h('h3', d.titulo), h('p.tiny.muted', [d.categoria, d.propietario ? 'de ' + d.propietario : 'Biblioteca base', d.actualizado ? 'actualizado ' + fdate(d.actualizado) : ''].filter(Boolean).join(' · ')), richText(text.replace(/^# .*\n>.*\n/, '')));
  } catch (e) { mount(box, h('p.bad-t', e.message)); }
}

// ======================= Biblioteca =======================
export function biblioteca(body) {
  const q = inp({ placeholder: 'Prueba la búsqueda: "cómo responder si dicen que es caro", "margen del 40 %"…' });
  const res = h('div');
  const status = h('p.tiny.muted');
  const list = h('div');
  const fileIn = h('input', { type: 'file', multiple: true, accept: DOC_TYPES.map(e => '.' + e).join(','), style: { display: 'none' }, onchange: () => { addFiles([...fileIn.files]); fileIn.value = ''; } });
  const drop = h('div.dropzone', { ondragover: e => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'), ondrop: e => { e.preventDefault(); drop.classList.remove('over'); addFiles([...e.dataTransfer.files]); } },
    icon('upload'), h('div', h('b', 'Añadir documentos a la biblioteca'), h('div.tiny.muted', 'Arrastra aquí o pulsa. PDF, Word, Excel, CSV, TXT, Markdown e imágenes (OCR). Se leen en tu dispositivo y se indexan para la IA.')), fileIn);
  drop.addEventListener('click', e => { if (e.target === fileIn) return; fileIn.click(); });
  const progress = h('div');
  mount(body, h('div.row.wrap', drop, btn('Escribir una nota', () => noteForm(), { icon: 'edit' })), progress,
    h('div.card', h('h3', '🔎 Probar la búsqueda inteligente'), h('div.row', q, btn('Buscar', run, { cls: 'primary', icon: 'search' })), res, status), list);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  async function run() {
    if (!q.value.trim()) return;
    mount(res, h('p.muted', 'Buscando…'));
    const r = await search(q.value.trim(), { k: 5 });
    mount(res, r.length ? h('div.list.boxed', r.map(x => h('div.item', { onclick: () => openDoc(x.docId) }, icon('file'), h('div.grow', h('div.bold', x.titulo + (x.seccion ? ' › ' + x.seccion : '')), h('div.tiny.muted', x.texto.slice(0, 180) + '…')), pill(Math.round(x.score * 100) + ' %')))) : h('p.muted', NO_DATA));
    drawStatus();
  }
  function drawStatus() { const s = ragStatus(); mount(status, 'Índice: ' + s.docs + ' documentos · ' + s.chunks + ' fragmentos · búsqueda por significado: ' + (s.modelo ? s.vectores + '/' + s.chunks + ' (' + s.modelo + ')' : 'no disponible en este dispositivo (se usa búsqueda por palabras)') + (s.error ? ' · ⚠️ ' + s.error : '')); }
  ensureIndex().then(drawStatus).catch(() => { });
  // Mientras se calculan los vectores en segundo plano, el estado se actualiza solo
  const tmr = setInterval(() => { if (!document.body.contains(status)) return clearInterval(tmr); drawStatus(); }, 2000);

  async function drawList() {
    const own = (S.t.biblioteca || []).slice().sort((a, b) => String(b.actualizado || b.creado).localeCompare(String(a.actualizado || a.creado)));
    const base = await baseDocs();
    const cats = {};
    base.forEach(d => { (cats[d.categoria] = cats[d.categoria] || []).push(d); });
    const admin = can('config.editar');
    const visPill = d => d.visibilidad === 'privado' ? pill('🔒 Solo ' + (d.propietarioId === S.me.id ? 'yo' : d.propietario), 'warn') : d.visibilidad === 'roles' ? pill('Roles: ' + d.roles) : pill('Toda la empresa', 'info');
    const estPill = d => d.estado === 'Indexado' ? pill('Indexado', 'ok') : d.estado === 'Error' || d.estado === 'Sin texto' ? pill(d.estado, 'bad') : pill(d.estado || 'Pendiente', 'warn');
    mount(list,
      h('div.card', h('h3', 'Documentos de la empresa y personales (' + own.length + ')'),
        own.length ? h('div.table-wrap', h('table.table', h('thead', h('tr', ['Documento', 'Categoría', 'Añadido por', 'Fecha', 'Estado', 'Acceso', 'Actualizado', ''].map(t => h('th', t)))),
          h('tbody', own.map(d => h('tr', h('td', h('a', { href: 'javascript:void 0', onclick: () => openDoc(d.id) }, d.titulo), d.error ? h('div.tiny.bad-t', d.error) : null, d.tipo ? h('div.tiny.muted', d.tipo.toUpperCase() + (d.caracteres ? ' · ' + (d.caracteres < 1000 ? d.caracteres + ' caracteres' : Math.round(d.caracteres / 1000) + ' mil caracteres') : '')) : null),
            h('td', d.categoria), h('td', d.propietario), h('td', fdate(d.creado)), h('td', estPill(d)), h('td', visPill(d)), h('td', d.actualizado ? ago(d.actualizado) : ''),
            h('td.row', btn('', () => metaForm(d), { cls: 'ghost sm icon', icon: 'edit', title: 'Editar datos' }), btn('', async () => {
              if (!await confirmDlg('Borrar documento', '"' + d.titulo + '" irá a la papelera y la IA dejará de consultarlo.', 'Borrar', true)) return;
              try { await api('biblioteca.borrar', { id: d.id }); removeLocal('biblioteca', d.id); emit(); drawList(); toast('Documento en la papelera', 'ok'); } catch (e) { handleError(e); }
            }, { cls: 'ghost sm icon', icon: 'trash', title: 'Borrar' })))))))
          : h('p.muted', 'Todavía no hay documentos propios. Añade vuestros procedimientos, catálogos, tarifas de proveedores, políticas…')),
      h('div.card', h('h3', '📚 Biblioteca base (' + base.length + ' documentos)'), h('p.small.muted', 'Conocimiento inicial sobre ventas, productos, clientes, pedidos, empresa y conocimiento general, adaptado a vuestro negocio. ' + (admin ? 'Puedes desactivar los que no queráis que use la IA.' : '')),
        Object.keys(cats).map(c => h('details.more', h('summary', c + ' (' + cats[c].length + ')'), h('div.in.list', cats[c].map(d => h('div.item', h('a.grow', { href: 'javascript:void 0', onclick: () => openDoc(d.id) }, d.titulo), admin ? h('label.check.tiny', sw(d.activo, v => toggleBase(d.id, v)), d.activo ? 'Activo' : 'Desactivado') : (d.activo ? null : pill('Desactivado'))))))))
    );
  }
  async function toggleBase(id, on) {
    const cfg = Object.assign({}, S.cfg.biblioteca);
    const set = new Set(cfg.baseDesactivados || []);
    if (on) set.delete(id); else set.add(id);
    cfg.baseDesactivados = [...set];
    try { const r = await api('config.guardar', { clave: 'biblioteca', valor: cfg }); S.cfg = Object.assign(S.cfg, r); toast('Guardado', 'ok'); } catch (e) { handleError(e); }
  }
  function visFields(d) {
    const canShare = can('biblioteca.editar');
    const vis = sel([{ v: 'privado', t: '🔒 Solo yo' }].concat(canShare ? [{ v: 'empresa', t: 'Toda la empresa' }, { v: 'roles', t: 'Solo algunos roles' }] : []), d.visibilidad || 'privado');
    const roles = inp({ value: d.roles || '', placeholder: 'admin, responsable, ventas' });
    const rf = field('Roles que pueden verlo (separados por comas)', roles, 'Ids de rol: admin, responsable, ventas, soporte, trabajador, usuario', 'hidden');
    const sync = () => rf.classList.toggle('hidden', vis.value !== 'roles');
    vis.addEventListener('change', sync); sync();
    return { vis, roles, els: [field('¿Quién puede verlo?', vis, canShare ? '' : 'Para compartir con la empresa hace falta el permiso "Añadir y editar documentos de la biblioteca".'), rf] };
  }
  function metaFields(d) {
    const t = inp({ value: d.titulo || '' });
    const cat = sel((S.cfg.biblioteca && S.cfg.biblioteca.categorias) || ['Empresa'], d.categoria || 'Empresa');
    const et = inp({ value: d.etiquetas || '', placeholder: 'proveedor, tarifas, 2026…' });
    const rev = inp({ type: 'number', min: 0, value: d.revisarDias || '', placeholder: '0 = no avisar' });
    const v = visFields(d);
    return { t, cat, et, rev, v, els: [field('Título', t), field('Categoría', cat), field('Etiquetas', et), field('Avisar para revisarlo cada (días)', rev), ...v.els] };
  }
  function metaForm(d) {
    const f = metaFields(d);
    modal('Datos del documento', h('div.form', ...f.els), close => [btn('Cancelar', close), btn('Guardar', async () => {
      try { const r = await api('biblioteca.guardar', { id: d.id, titulo: f.t.value, categoria: f.cat.value, etiquetas: f.et.value, revisarDias: +f.rev.value || 0, visibilidad: f.v.vis.value, roles: f.v.roles.value }); upsertLocal('biblioteca', r); emit(); close(); drawList(); toast('Guardado', 'ok'); } catch (e) { handleError(e); }
    }, { cls: 'primary' })]);
  }
  function noteForm() {
    const txt = area({ rows: 12, placeholder: 'Escribe aquí el procedimiento, la política, la información interna…' });
    const f = metaFields({ categoria: 'Empresa' });
    modal('Nueva nota para la biblioteca', h('div.col', h('div.form', ...f.els), field('Contenido', txt)), close => [btn('Cancelar', close), btn('Guardar', async () => {
      if (!f.t.value.trim()) return toast('Pon un título', 'warn');
      try { const r = await api('biblioteca.guardar', { titulo: f.t.value, categoria: f.cat.value, etiquetas: f.et.value, revisarDias: +f.rev.value || 0, visibilidad: f.v.vis.value, roles: f.v.roles.value, texto: txt.value, tipo: 'nota', origen: 'nota' }); upsertLocal('biblioteca', r); emit(); close(); drawList(); toast('Nota guardada e indexada', 'ok'); } catch (e) { handleError(e); }
    }, { cls: 'primary' })], { size: 'wide' });
  }
  async function addFiles(files) {
    for (const file of files) {
      const row = h('div.card.flat', h('div.row', icon('file'), h('b.grow', file.name), h('span.tiny.muted.st', 'Preparando…')));
      progress.appendChild(row);
      const stEl = row.querySelector('.st');
      try {
        const ex = await extractText(file, s => { stEl.textContent = s; });
        stEl.textContent = 'Texto extraído: ' + (ex.texto || '').length.toLocaleString('es-ES') + ' caracteres';
        const f = metaFields({ titulo: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), categoria: 'Empresa' });
        const ok = await new Promise(res => modal('Añadir "' + file.name + '"', h('div.col', ex.aviso ? h('p.warn-t', ex.aviso) : null, h('div.form', ...f.els), h('details.more', h('summary', 'Ver el texto extraído'), h('pre.small', { style: { maxHeight: '240px', overflow: 'auto', whiteSpace: 'pre-wrap' } }, (ex.texto || '(sin texto)').slice(0, 5000)))),
          close => [btn('Cancelar', () => { res(false); close(); }), btn('Añadir e indexar', () => { res(true); close(); }, { cls: 'primary' })], { size: 'wide', onclose: () => res(false) }));
        if (!ok) { row.remove(); continue; }
        stEl.textContent = 'Guardando el original en Drive…';
        let archivo = null;
        try { archivo = await uploadFile(file, { entidad: 'biblioteca', visibilidad: f.v.vis.value === 'privado' ? 'privado' : 'equipo' }, p => { stEl.textContent = 'Subiendo ' + Math.round(p * 100) + ' %'; }); } catch (e) { console.warn('original', e); }
        stEl.textContent = 'Indexando…';
        const r = await api('biblioteca.guardar', { titulo: f.t.value, categoria: f.cat.value, etiquetas: f.et.value, revisarDias: +f.rev.value || 0, visibilidad: f.v.vis.value, roles: f.v.roles.value, texto: ex.texto || '', tipo: file.name.split('.').pop().toLowerCase(), origen: 'documento', archivoId: archivo ? archivo.id : '' }, { timeout: 180000 });
        upsertLocal('biblioteca', r); emit();
        stEl.textContent = r.estado === 'Indexado' ? '✅ Indexado' : '⚠️ ' + (r.error || r.estado);
        setTimeout(() => row.remove(), 4000);
        drawList(); ensureIndex().then(() => { drawStatus(); startEmbedder(); });
      } catch (e) { stEl.textContent = '❌ ' + e.message; stEl.classList.add('bad-t'); }
    }
  }
  drawList();
}

// ======================= Memoria =======================
export function memoria(body) {
  const list = h('div');
  const txt = area({ rows: 3, placeholder: 'Ej.: "Prefiero respuestas cortas" · "Los pedidos a Canarias van por Correos" · "Cerramos la segunda quincena de agosto"' });
  const amb = sel([{ v: 'usuario', t: 'Solo para mí (mis preferencias)' }].concat(can('memoria.empresa') ? [{ v: 'empresa', t: 'Para toda la empresa' }] : []).concat([{ v: 'privada', t: 'Privada: solo para las personas que elija' }]), 'usuario');
  const who = h('div.row.wrap.hidden', (S.t.usuarios || []).filter(u => u.id !== S.me.id && u.activo !== false).map(u => h('label.check', h('input', { type: 'checkbox', value: u.id }), u.nombre)));
  amb.addEventListener('change', () => who.classList.toggle('hidden', amb.value !== 'privada'));
  // v11.5: qué ha aprendido, de dónde, cuándo y con qué confianza (sin porcentajes inventados)
  const mem = S.t.memoria || [], last = mem.slice().sort((a, b) => String(b.creado).localeCompare(String(a.creado)))[0];
  const learned = h('div.card.flat', { style: { marginBottom: '12px' } }, h('b', '📚 Qué ha aprendido Celeby Nova'),
    h('div.facts', { style: { marginTop: '6px' } }, h('div.fact', h('div.l', 'Conocimientos guardados'), h('div.v', String(mem.length))),
      h('div.fact', h('div.l', 'De la empresa'), h('div.v', String(mem.filter(m => m.ambito === 'empresa').length))), h('div.fact', h('div.l', 'Preferencias'), h('div.v', String(mem.filter(m => m.ambito === 'usuario').length))),
      h('div.fact', h('div.l', 'Último'), h('div.v.small', last ? fdt(last.creado) + ' · ' + (last.autor || '') : '—'))),
    h('p.tiny.muted', 'Cada recuerdo dice QUÉ aprendió, DE QUIÉN salió y CUÁNDO. Confianza: confirmado por una persona (la IA nunca guarda nada sin que lo confirmes). Los procedimientos del operador del PC tienen su confianza por evidencias en «Operar en el PC».'));
  mount(body, learned, h('div.card.col', h('h3', '🧠 Memoria de la IA'),
    h('p.small.muted', 'La conversación actual se recuerda sola. Aquí guardas lo que la IA debe tener siempre en cuenta. Cada recuerdo respeta los permisos: tus preferencias solo las usa tu IA; los privados, solo quien elijas.'),
    field('Qué debe recordar', txt), field('Para quién', amb), who,
    btn('Guardar recuerdo', async () => {
      if (!txt.value.trim()) return;
      const vp = [...who.querySelectorAll('input:checked')].map(x => x.value).concat(amb.value === 'privada' ? [S.me.id] : []);
      try { const r = await api('memoria.guardar', { ambito: amb.value, texto: txt.value, visiblePara: vp.join(',') }); upsertLocal('memoria', r); emit(); txt.value = ''; draw(); toast('La IA lo recordará', 'ok'); } catch (e) { handleError(e); }
    }, { cls: 'primary', icon: 'check' })), list);
  function draw() {
    const all = (S.t.memoria || []).slice().reverse();
    const grp = [['usuario', 'Mis preferencias', m => m.ambito === 'usuario' && m.userId === S.me.id], ['empresa', 'Memoria de la empresa', m => m.ambito === 'empresa'], ['privada', 'Privada', m => m.ambito === 'privada'], ['otros', 'Preferencias de otras personas (administración)', m => m.ambito === 'usuario' && m.userId !== S.me.id]];
    mount(list, grp.map(([k, t, f]) => { const xs = all.filter(f); return xs.length ? h('div.card', h('h3', t + ' (' + xs.length + ')'), h('div.list.boxed', xs.map(m => h('div.item', h('div.grow', h('div', m.texto), h('div.tiny.muted', (m.autor || '') + ' · ' + fdate(m.creado) + (m.ambito === 'privada' ? ' · visible para: ' + String(m.visiblePara).split(',').map(id => ((S.t.usuarios || []).find(u => u.id === id) || { nombre: id }).nombre).join(', ') : ''))),
      (m.userId === S.me.id || can('documentos.todos') || (m.ambito === 'empresa' && can('memoria.empresa'))) ? btn('', async () => { if (!await confirmDlg('Olvidar', '¿Borrar este recuerdo? Irá a la papelera.', 'Borrar', true)) return; try { await api('memoria.borrar', { id: m.id }); removeLocal('memoria', m.id); emit(); draw(); } catch (e) { handleError(e); } }, { cls: 'ghost sm icon', icon: 'trash' }) : null)))) : null; }),
      all.length ? null : h('p.muted', 'Todavía no hay recuerdos guardados.'));
  }
  draw();
}

// ======================= Actividad =======================
async function actividad(body) {
  mount(body, h('p.muted', 'Cargando…'));
  try {
    const rows = await api('ia.actividad', { limite: 150 });
    mount(body, h('p.small.muted', 'Aquí queda todo lo que hace la IA: consultas, respuestas del PC servidor y revisiones automáticas (cada 15 minutos revisa pedidos, plazos, stock, precios y tareas, y avisa sin molestar).'),
      rows.length ? h('div.timeline', rows.map(r => h('div.tl', h('span.b', { style: r.error ? { borderColor: 'var(--bad)' } : r.tipo === 'auto' ? { borderColor: 'var(--info)' } : {} }), h('div',
        h('div.small', h('b', fdt(r.fecha)), ' · ', r.tipo === 'auto' ? pill('Automática', 'info') : r.tipo === 'equipo' ? pill('IA del equipo') : pill(r.usuario || 'IA'), r.herramientas ? h('span.tiny.muted', ' · consultó: ' + String(r.herramientas).split(', ').map(toolLabel).join(', ')) : null),
        h('div', r.resumen), (r.acciones || []).length ? h('ul.small', r.acciones.map(a => h('li', a.texto || (a.tipo === 'propuesta' ? 'Propuso: ' + a.titulo : a.tipo)))) : null,
        r.error ? h('div.small.bad-t', 'No pudo terminar: ' + r.error) : null)))) : h('p.muted', 'Todavía no hay actividad.'));
  } catch (e) { mount(body, h('p.bad-t', e.message)); }
}

// ======================= v10 · Objetivos que controla Celebrity =======================
const PER = { dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes' };
function objetivosView(body) {
  const draw = () => {
    const list = objetivos(), b = brief();
    const canEdit = can('objetivos.gestionar');
    const fmt = (v, t) => t === 'ventas' ? v.toFixed(2).replace('.', ',') + ' €' : String(v);
    mount(body, h('div.card.celeb-card', h('div.bold', '✨ ' + b.next)),
      list.length ? h('div.obj-list', list.map(o => h('div.obj' + (o.p.hecho ? '.done' : ''), h('div.row', h('div.grow', h('div.tiny.muted', PER[o.periodo] || ''), h('div.bold', objetivoTexto(o))),
        h('div.obj-n', fmt(o.p.valor, o.tipo), h('small', ' / ' + fmt(o.p.meta, o.tipo))), o.p.hecho ? h('span', '✓') : null,
        canEdit ? btn('', async () => { if (!await confirmDlg('Quitar objetivo', '«' + objetivoTexto(o) + '» dejará de controlarse.', 'Quitar', true)) return; try { S.cfg = await api('objetivos.guardar', { quitar: o.id }); emit(); draw(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'ghost icon sm', icon: 'x', title: 'Quitar' }) : null),
        h('div.progress', h('span', { style: { width: Math.round(o.p.pct * 100) + '%' } }))))) : h('div.card', h('p.muted', 'Todavía no hay objetivos. ' + (canEdit ? 'Crea uno aquí o díselo a Celebrity: «objetivo: publicar 3 productos hoy».' : 'Una administradora puede crearlos.'))),
      canEdit ? h('div.card', h('h3', 'Nuevo objetivo'), newForm()) : null);
  };
  function newForm() {
    const tipo = sel(Object.entries(window.CL.OBJ_TIPOS).map(([v, t]) => ({ v, t })), 'publicar');
    const meta = inp({ type: 'number', min: 1, value: 3 }), per = sel([{ v: 'dia', t: 'Hoy (cada día)' }, { v: 'semana', t: 'Esta semana' }, { v: 'mes', t: 'Este mes' }], 'dia');
    const tit = inp({ placeholder: 'Opcional, p. ej. Publicar 3 productos' });
    return h('div.form', field('Qué', tipo), field('Meta', meta), field('Periodo', per), field('Nombre', tit),
      btn('Crear objetivo', async () => { try { S.cfg = await api('objetivos.guardar', { objetivo: { tipo: tipo.value, meta: Number(meta.value), periodo: per.value, titulo: tit.value.trim() } }); emit(); toast('Objetivo creado', 'ok'); draw(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary' }));
  }
  draw();
}

// ================= v11.5 · Celeby Nova: tarjetas de respuesta con datos reales =================
const EST = { confirmado: ['🟢', 'CONFIRMADO', 'ok'], manual: ['🟡', 'INTRODUCIDO A MANO', 'warn'], estimado: ['🟠', 'ESTIMADO', 'warn'], pendiente: ['🔴', 'PENDIENTE DE VERIFICAR', 'bad'], info: ['ℹ️', 'INFORMACIÓN', ''] };
const NIV = { bad: '🔴', warn: '🟠', info: '🟡' };
export function rapidCard(R, onChange) {
  const e = EST[R.estado] || EST.info, CL = window.CL;
  const pick = R.necesita === 'pedido' ? h('div.row.wrap', { style: { marginTop: '6px' } }, h('select.inp', { onchange: ev => { if (ev.target.value) onChange && onChange(CL.rapid('coste_pedido', S.t, S.cfg, { hoy: S.hoy, pedidoId: ev.target.value, verCostes: can('productos.costes') })); } },
    h('option', { value: '' }, 'Elige un pedido…'), (R.lista || []).map(x => h('option', { value: x.id }, x.t)))) : null;
  return h('div.rapid-card',
    h('div.row.wrap', h('b.grow', R.titulo), h('span', { title: 'Calidad del dato' }, pill(e[0] + ' ' + e[1], e[2]))),
    h('div', { style: { fontSize: '20px', fontWeight: 700, margin: '6px 0' } }, R.valor),
    pick,
    R.filas && R.filas.length && respStyle() === 'corto' ? h('details', h('summary.small', 'Ver el detalle (' + R.filas.length + ')'), h('div.list', R.filas.map(f => h('div.item', { style: { cursor: 'default' } }, h('span', (EST[f.estado] || EST.info)[0]), h('span.grow.small', f.t, f.nota ? h('span.tiny.muted', ' · ' + f.nota) : null), h('b.small', f.v))))) :
    R.filas && R.filas.length ? h('div.list', R.filas.map(f => h('div.item', { style: { cursor: 'default' } }, h('span', (EST[f.estado] || EST.info)[0]), h('span.grow.small', f.t, f.nota ? h('span.tiny.muted', ' · ' + f.nota) : null), h('b.small', f.v)))) : null,
    R.avisos && R.avisos.length ? h('div', R.avisos.map(a => h('p.tiny.warn-t', '⚠️ ' + a))) : null,
    R.id === 'raro' && R.lista.length ? h('div.list', R.lista.map(x => h('a.item', { href: x.enlace ? '#/' + x.enlace : null }, h('span', NIV[x.nivel] || '•'), h('span.grow.small', x.t, x.d ? h('div.tiny.muted', x.d) : null)))) : null,
    R.origen || (R.id !== 'raro' && R.lista && R.lista.length && !pick) ? h('details', h('summary.small', '¿De dónde sale esta cifra?'), R.origen ? h('p.tiny.muted', R.origen) : null,
      R.id !== 'raro' && !pick ? h('div.list', (R.lista || []).slice(0, 40).map(x => h(x.enlace ? 'a.item' : 'div.item', { href: x.enlace ? '#/' + x.enlace : null }, x.estado ? h('span', (EST[x.estado] || EST.info)[0]) : null, h('span.grow.small', x.t), x.d ? h('span.tiny', x.d) : null))) : null) : null,
    R.enlace ? h('a.small', { href: '#/' + R.enlace }, 'Abrir →') : null);
}
// «Ahora mismo»: avisos reales del día (sin inventar)
function nowNotices() {
  const CL = window.CL, out = [], cp = S.cfg.pedidos;
  const emq = (S.t.pedidos || []).filter(o => CL.phaseOf(cp, o.estado) === 'empaquetar').length;
  if (emq) out.push({ t: '📦 Tienes ' + emq + ' pedido(s) pendientes de empaquetar', enlace: 'embalaje' });
  (S.t.trabajos || []).filter(j => j.estado === 'Imprimiendo').forEach(j => { const p = (S.t.impresoras || []).find(x => x.id === j.impresoraId); out.push({ t: '🖨️ La ' + (p ? p.nombre : 'impresora') + ' está imprimiendo «' + j.titulo + '»', enlace: 'taller' }); });
  const hace = Date.now() - 2 * 3600000;
  (S.t.trabajos || []).filter(j => j.estado === 'Terminado' && j.fin && new Date(j.fin).getTime() > hace).forEach(j => { const p = (S.t.impresoras || []).find(x => x.id === j.impresoraId); out.push({ t: '✅ La ' + (p ? p.nombre : 'impresora') + ' ha terminado «' + j.titulo + '»', enlace: 'taller' }); });
  const av = Number((S.cfg.embalaje || {}).avisoCajas || 0);
  (S.t.materiales || []).filter(m => m.tipo === 'caja' && m.stock !== '' && m.stock !== undefined && CL.norm(m.activo) !== 'no').forEach(m => { const min = m.stockMin !== '' && m.stockMin !== undefined ? Number(m.stockMin) : av; if (Number(m.stock) <= min) out.push({ t: '📦 Quedan ' + m.stock + ' ' + m.nombre, enlace: 'embalaje/cajas' }); });
  const nv = (S.t.trabajos || []).filter(j => j.estado === 'Terminado' && !j.valoracion && j.fin && new Date(j.fin).getTime() > Date.now() - 14 * 86400000).length;
  if (nv) out.push({ t: '❓ Tienes ' + nv + ' impresión(es) pendiente(s) de revisar («¿Cómo salió?»)', enlace: 'taller' });
  const al = (S.t.trabajos || []).filter(j => j.alerta && j.alerta.texto && (j.estado === 'Imprimiendo' || j.estado === 'En cola'));
  al.forEach(j => out.push({ t: '⚠️ ' + (j.alerta.impresora || 'Impresora') + ': ' + j.alerta.texto, enlace: 'taller' }));
  return out.slice(0, 8);
}
// 🔎 Abogado del dato: la verdad según los datos registrados (lo bueno, lo malo, lo que falta y lo que no cuadra)
function revisar(body) {
  const CL = window.CL, R = CL.rapid('raro', S.t, S.cfg, { hoy: S.hoy, verCostes: can('productos.costes') });
  const ped = (S.t.pedidos || []).filter(o => !CL.stateOf(S.cfg.pedidos, o.estado).cancelled), mats = (S.t.materiales || []).filter(m => CL.norm(m.activo) !== 'no');
  const costOf = CL.costIndex(S.t, S.cfg.precios || {}), prof = ped.map(o => CL.orderProfit(o, S.t, S.cfg, costOf));
  const cnt = st => mats.filter(m => CL.matCost(m).estado === st).length;
  const q = [['🟢 Pedidos con envío y comisión reales', prof.filter(p => !p.envioEstimado && !p.comisionEstimada).length], ['🟠 Pedidos con envío o comisión ESTIMADOS', prof.filter(p => p.envioEstimado || p.comisionEstimada).length],
    ['🔴 Pedidos SIN coste de fabricación', prof.filter(p => !p.conCoste).length], ['🟢 Materiales con precio CONFIRMADO', cnt('confirmado')], ['🟠 Materiales ESTIMADOS u ORIENTATIVOS', cnt('estimado') + cnt('orientativo')],
    ['🔴 Materiales PENDIENTES', cnt('pendiente') + cnt('revisar')], ['🟠 Pérdidas con coste ESTIMADO', (S.t.fallos || []).length]];
  mount(body,
    h('div.card.flat', { style: { marginBottom: '12px' } }, h('b', '«Quiero que me digas la verdad según los datos registrados.»'),
      h('p.small.muted', 'Celeby Nova revisa primero; tú confirmas. Muestra lo que está a favor y en contra, lo que falta y lo que no cuadra. Nunca oculta ingresos, nunca inventa gastos y nunca cambia un importe por su cuenta.')),
    h('div.row', { style: { marginBottom: '10px' } }, btn('Volver a revisar', () => revisar(body), { icon: 'refresh', cls: 'sm' })),
    h('div.card', rapidCard(R)),
    h('div.card', { style: { marginTop: '12px' } }, h('h3', 'Calidad de los datos'), h('div.list', q.map(([t, v]) => h('div.item', { style: { cursor: 'default' } }, h('span.grow.small', t), h('b', String(v))))),
      h('p.tiny.muted', '🟢 CONFIRMADO · 🟡 INTRODUCIDO A MANO · 🟠 ESTIMADO · 🔴 PENDIENTE DE VERIFICAR. Una estimación nunca se presenta como dato real.')));
}
