// ================= Asistente IA: consulta vuestros datos reales, no inventa =================
import { h, mount, icon, btn, toast, fdt, pill, empty, sel, eur, sw } from '../ui.js';
import { S, can, api, mutate, kv, byId, upsertLocal, emit } from '../store.js';
import { go, handleError } from '../app.js';
import { desktop } from '../desktop.js';

const LABEL = { buscar_pedidos: 'pedidos', ver_pedido: 'pedido', buscar_clientes: 'clientes', ver_cliente: 'cliente', buscar_productos: 'productos', consejo_precio: 'costes y precios', listar_tareas: 'tareas', crear_tarea: 'crear tarea', proponer_cambio: 'propuesta', estadisticas: 'estadísticas', calendario_redes: 'calendario de redes', noticias_recientes: 'noticias', buscar_archivos: 'archivos' };

export function render(el) {
  const st = { msgs: [], busy: false, tab: 'chat', voz: localStorage.getItem('cd.voz') === '1', motor: localStorage.getItem('cd.motor') || 'nube', localOk: false };
  const log = h('div.chat-log', { role: 'log', 'aria-live': 'polite' });
  const ta = h('textarea', { placeholder: 'Pregunta lo que necesites: "¿qué pedidos vencen esta semana?", "¿a qué precio vendo la maceta en Etsy?"…', rows: 1, 'aria-label': 'Pregunta' });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micB = SR ? btn('', dictate, { cls: 'ghost icon', icon: 'mic', title: 'Dictar' }) : null;
  const sendB = btn('', () => send(), { cls: 'primary icon', icon: 'send', title: 'Enviar' });
  const sugg = h('div.suggest');
  const chatBox = h('div.chat', log, sugg, h('div.chat-in', micB, ta, sendB));
  const actBox = h('div');
  const tabs = h('div.tabs');
  const opts = h('div.row.wrap.small', { style: { marginBottom: '8px' } });
  el.append(h('div.page-head', h('h1', 'Asistente IA'), h('span.muted.small', 'Solo responde con vuestros datos. Si algo no está, te lo dice.')), tabs, opts, chatBox, actBox);

  const key = 'chat.' + S.me.id;
  kv.get(key).then(v => { st.msgs = (v || []).slice(-40); drawLog(); });
  if (desktop.on) desktop.aiStatus().then(r => { st.localOk = !!(r && r.disponible); drawOpts(); }).catch(() => { });

  function drawTabs() { mount(tabs, [['chat', 'Conversación'], ['actividad', 'Actividad de la IA']].map(t => h('button' + (st.tab === t[0] ? '.on' : ''), { onclick: () => { st.tab = t[0]; drawTabs(); show(); } }, t[1]))); }
  function show() { chatBox.classList.toggle('hidden', st.tab !== 'chat'); opts.classList.toggle('hidden', st.tab !== 'chat'); actBox.classList.toggle('hidden', st.tab !== 'actividad'); if (st.tab === 'actividad') activity(); }
  function drawOpts() {
    mount(opts, h('label.check', sw(st.voz, v => { st.voz = v; localStorage.setItem('cd.voz', v ? '1' : '0'); if (!v) speechSynthesis.cancel(); }), 'Leer respuestas en voz alta'),
      st.localOk ? h('label.row', 'Motor:', sel([{ v: 'nube', t: 'Claude (nube, más listo)' }, { v: 'local', t: 'IA local de este PC (privada)' }], st.motor, { style: { width: 'auto', minHeight: '32px' }, onchange: e => { st.motor = e.target.value; localStorage.setItem('cd.motor', st.motor); } })) : null,
      st.msgs.length ? btn('Nueva conversación', () => { st.msgs = []; kv.set(key, []); drawLog(); }, { cls: 'ghost sm', icon: 'refresh' }) : null,
      S.cfg.secretos && !S.cfg.secretos.ia ? h('span.warn-t', '⚠️ La IA no está configurada todavía' + (can('config.editar') ? ' (Configuración > IA)' : '')) : null);
  }
  function suggestions() {
    const p = S.t.productos[S.t.productos.length - 1];
    const list = ['¿Qué necesita mi atención hoy?', '¿Qué pedidos vencen esta semana?', can('clientes.ver') ? '¿Qué clientes frecuentes no tienen pedido ahora?' : null, p && can('productos.costes') ? '¿A qué precio vendo "' + p.nombre + '" en Wallapop, Vinted y Etsy?' : null, can('informes.ver') ? 'Resúmeme las ventas de este mes' : null, '¿Qué tareas tengo pendientes?'].filter(Boolean);
    mount(sugg, st.msgs.length ? null : list.map(t => h('button', { onclick: () => send(t) }, t)));
  }
  function drawLog() {
    drawOpts(); suggestions();
    if (!st.msgs.length) mount(log, h('div.empty', icon('sparkles'), h('h3', '¿En qué te ayudo?'), h('p', 'Puedo buscar pedidos y clientes, calcular precios, resumir ventas, detectar retrasos y crear tareas. No invento: todo sale de vuestros datos.')));
    else mount(log, st.msgs.map(m => bubble(m)));
    log.scrollTop = log.scrollHeight;
  }
  function bubble(m) {
    if (m.role === 'user') return h('div.msg.me', m.content);
    if (m.pending) return h('div.msg.ai', h('span.row', h('span.sync.busy', { style: { padding: 0 } }, h('span.dot'), 'Consultando…')));
    return h('div.msg.ai', m.error ? h('span.bad-t', m.content) : m.content,
      m.tools && m.tools.length ? h('div.tools', '🔎 Consultado: ' + [...new Set(m.tools.map(t => LABEL[t] || t))].join(', ')) : null,
      (m.acciones || []).map(a => a.tipo === 'propuesta' ? proposal(a, m) : a.tipo === 'tarea_creada' ? h('div.tools', '✅ Tarea creada: ', h('a', { href: '#/tareas/' + a.id }, a.titulo)) : null));
  }
  function proposal(a, m) {
    const done = a.estado;
    return h('div.proposal', h('div.bold', 'Propuesta: ' + a.titulo), h('ul.small', { style: { margin: '6px 0', paddingLeft: '18px' } }, Object.keys(a.cambios).map(k => h('li', k + ': "' + (a.orig[k] ?? '') + '" → "' + a.cambios[k] + '"'))), a.motivo ? h('p.tiny.muted', a.motivo) : null,
      done ? h('p.small', done === 'aplicada' ? '✅ Aplicada' : 'Descartada') : h('div.row', btn('Aplicar', async () => {
        const action = { pedidos: 'pedidos.guardar', clientes: 'clientes.guardar', productos: 'productos.guardar', tareas: 'tareas.guardar' }[a.entidad];
        try { const r = await mutate(action, { id: a.id, datos: a.cambios, orig: a.orig }, { onlineOnly: true, label: 'Propuesta IA' }); if (r && r.id) { upsertLocal(a.entidad, r); emit(); } a.estado = 'aplicada'; kv.set(key, st.msgs); drawLog(); toast('Cambio aplicado', 'ok'); }
        catch (e) { handleError(e); }
      }, { cls: 'primary sm', icon: 'check' }), btn('Descartar', () => { a.estado = 'descartada'; kv.set(key, st.msgs); drawLog(); }, { cls: 'sm' })));
  }
  async function send(text) {
    const q = (text || ta.value).trim();
    if (!q || st.busy) return;
    if (!S.online) return toast('El asistente necesita conexión a Internet.', 'warn');
    ta.value = ''; ta.style.height = 'auto';
    st.msgs.push({ role: 'user', content: q });
    const pend = { role: 'assistant', pending: true };
    st.msgs.push(pend); st.busy = true; sendB.disabled = true; drawLog();
    const hist = st.msgs.filter(m => !m.pending && !m.error).slice(-14).map(m => ({ role: m.role, content: m.content }));
    const ctx = decodeURIComponent(location.hash.slice(2)).split('?')[0];
    try {
      const r = st.motor === 'local' && st.localOk ? await localRun(hist) : await api('ia.chat', { mensajes: hist, contexto: ctx }, { timeout: 180000 });
      Object.assign(pend, { pending: false, content: r.texto, tools: r.herramientas, acciones: r.acciones });
      if (st.voz && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(r.texto.replace(/[*#_`]/g, '')); u.lang = 'es-ES'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    } catch (e) { Object.assign(pend, { pending: false, error: true, content: e.message }); }
    st.busy = false; sendB.disabled = false;
    kv.set(key, st.msgs.slice(-40));
    drawLog();
  }
  // IA local (Ollama en este PC): el modelo corre aquí; los datos se consultan con las mismas herramientas y permisos del servidor
  async function localRun(hist) {
    const defs = await api('ia.definiciones', {});
    const tools = defs.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    const msgs = [{ role: 'system', content: defs.system }].concat(hist);
    const used = [], acciones = [];
    for (let i = 0; i < 6; i++) {
      const r = await desktop.ai({ messages: msgs, tools });
      const m = r.message || {};
      if (!m.tool_calls || !m.tool_calls.length) {
        api('ia.registrar', { tipo: 'local', resumen: hist[hist.length - 1].content, herramientas: used, acciones }).catch(() => { });
        return { texto: m.content || 'No encuentro esa información.', herramientas: used, acciones };
      }
      msgs.push(m);
      for (const c of m.tool_calls) {
        used.push(c.function.name);
        const out = await api('ia.herramienta', { nombre: c.function.name, args: typeof c.function.arguments === 'string' ? JSON.parse(c.function.arguments || '{}') : c.function.arguments });
        acciones.push(...(out.acciones || []));
        msgs.push({ role: 'tool', content: JSON.stringify(out.resultado).slice(0, 20000) });
      }
    }
    return { texto: 'La consulta era demasiado larga para la IA local.', herramientas: used, acciones };
  }
  function dictate() {
    const r = new SR(); r.lang = 'es-ES'; r.interimResults = false;
    micB.classList.add('primary');
    r.onresult = e => { ta.value = (ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript; ta.focus(); };
    r.onend = () => micB.classList.remove('primary');
    r.onerror = e => { micB.classList.remove('primary'); if (e.error !== 'no-speech') toast('No he podido escucharte (' + e.error + ')', 'warn'); };
    r.start();
  }
  async function activity() {
    mount(actBox, h('p.muted', 'Cargando…'));
    try {
      const rows = await api('ia.actividad', { limite: 150 });
      mount(actBox, h('p.small.muted', 'Aquí queda todo lo que hace la IA: consultas y revisiones automáticas (cada 15 minutos revisa pedidos, plazos, tareas y redes, y avisa sin molestar).'),
        rows.length ? h('div.timeline', rows.map(r => h('div.tl', h('span.b', { style: r.error ? { borderColor: 'var(--bad)' } : r.tipo === 'auto' ? { borderColor: 'var(--info)' } : {} }), h('div',
          h('div.small', h('b', fdt(r.fecha)), ' · ', r.tipo === 'auto' ? pill('Automática', 'info') : r.tipo === 'local' ? pill('IA local') : pill(r.usuario || 'IA'), r.tokens ? h('span.tiny.muted', ' · ' + r.tokens + ' tokens' + (r.coste ? ' · ~' + (r.coste * 0.92).toFixed(3) + ' €' : '')) : null),
          h('div', r.resumen), (r.acciones || []).length ? h('ul.small', { style: { margin: '4px 0', paddingLeft: '18px' } }, r.acciones.map(a => h('li', a.texto || (a.tipo === 'tarea_creada' ? 'Creó tarea: ' + a.titulo : a.tipo === 'propuesta' ? 'Propuso cambiar ' + a.titulo : a.tipo)))) : null,
          r.error ? h('div.small.bad-t', 'No pudo terminar: ' + r.error) : null)))) : h('p.muted', 'Todavía no hay actividad.'));
    } catch (e) { mount(actBox, h('p.bad-t', e.message)); }
  }
  drawTabs(); show(); drawLog();
  setTimeout(() => ta.focus(), 50);
  return { update: () => { } };
}
