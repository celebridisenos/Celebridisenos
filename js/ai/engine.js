// ================= Motor del asistente de IA LOCAL =================
// Pregunta → entender → buscar datos reales (con permisos) → biblioteca (RAG) →
// cálculos exactos → el modelo local redacta la respuesta citando fuentes.
// Si el modelo no está disponible, el "modo básico" responde con los mismos datos
// (sin redactar). Nunca inventa: si no hay dato, lo dice.
import { S, api, can, pull } from '../store.js';
import { desktop } from '../desktop.js';
import { localStatus } from './models.js';
import { salesCalc, isPriceObjection, eur } from './calc.js';
import { search, norm } from './rag.js';

export const NO_DATA = 'No encuentro ese dato en la información disponible.';
const LABEL = { buscar_pedidos: 'Pedidos', ver_pedido: 'Pedido', buscar_clientes: 'Clientes', ver_cliente: 'Cliente', buscar_productos: 'Productos', consejo_precio: 'Costes y precios', listar_tareas: 'Tareas', crear_tarea: 'Propuesta de tarea', proponer_cambio: 'Propuesta de cambio', estadisticas: 'Ventas y estadísticas', calendario_redes: 'Calendario de redes', noticias_recientes: 'Noticias', buscar_archivos: 'Archivos', stock: 'Stock', proponer_memoria: 'Memoria' };
export const toolLabel = n => LABEL[n] || n;

// ---------- 1) Entender la pregunta y decidir qué datos consultar ----------
export function plan(question, ctx = {}) {
  const q = norm(question), calls = [], add = (nombre, args) => { if (calls.length < 6 && !calls.some(c => c.nombre === nombre && JSON.stringify(c.args) === JSON.stringify(args))) calls.push({ nombre, args }); };
  const me = ctx.usuario ? ctx.usuario.nombre : (S.me && S.me.nombre);
  const has = re => re.test(q);
  // Recordar / crear tarea (propuestas que la persona confirma)
  const mem = /^(?:por favor,?\s*)?(?:recuerda|apunta en (?:la )?memoria|guarda en (?:la )?memoria|no olvides)\s+(?:que\s+)?(.{4,})/i.exec(String(question).trim());
  if (mem) add('proponer_memoria', { texto: mem[1].replace(/[.?!]+$/, ''), ambito: /(empresa|equipo|todos|todas)/.test(norm(mem[1])) ? 'empresa' : 'usuario' });
  const task = /(?:crea|crear|anade|añade|apunta|pon)\s+(?:una\s+)?tarea\s+(?:para\s+|de\s+|:\s*)?(.{4,})/i.exec(String(question));
  if (task) add('crear_tarea', { titulo: task[1].replace(/[.?!]+$/, '').slice(0, 150), responsable: /\b(para mi|me)\b/.test(q) ? me : '' });
  // Referencias concretas
  const num = /(?:pedido|n[ºo°]\.?|numero|#)\s*#?\s*(\d{2,7})\b/.exec(q);
  if (num) add('ver_pedido', { ref: num[1] });
  const track = /\b([a-z]{2}\d{9}[a-z]{2}|[a-z0-9]{12,})\b/i.exec(String(question));
  if (track && /\d/.test(track[1]) && /[a-z]/i.test(track[1])) add('ver_pedido', { ref: track[1] });
  const clients = (S.t.clientes || []).filter(c => c.nombre && norm(c.nombre).length >= 3 && new RegExp('\\b' + norm(c.nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q)).slice(0, 2);
  clients.forEach(c => add('ver_cliente', { ref: c.nombre }));
  // Nombres propios que no están en la lista local (p. ej. un cliente recién creado en otro dispositivo)
  if (!clients.length && has(/(cliente|telefono|movil|direccion|email|correo|compr|pedido|pedidos de|gast)/)) {
    const names = (String(question).match(/(?:^|[^.?!¿¡]\s)([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+)*)/g) || []).map(x => x.replace(/^[^A-ZÁÉÍÓÚÑ]+/, '').trim()).filter(x => x.length > 2 && !/^(Qué|Que|Cuál|Cuanto|Cuánto|Cómo|Como|Dime|Hay|Este|Esta|El|La|Los|Las|Me|Mi)$/.test(x));
    if (names[0]) add('ver_cliente', { ref: names[0] });
  }
  const prods = (S.t.productos || []).filter(p => p.nombre && norm(p.nombre).length >= 4 && q.includes(norm(p.nombre))).sort((a, b) => b.nombre.length - a.nombre.length).slice(0, 2);
  const priceWords = has(/(precio|cobrar|vender|vendo|cuanto pido|coste|margen|beneficio|etsy|vinted|wallapop)/);
  prods.forEach(p => { add('buscar_productos', { texto: p.nombre }); if (priceWords) add('consejo_precio', { producto: p.nombre }); });
  // Temas
  const atencion = has(/(atencion|resumen del dia|que hay hoy|como vamos hoy|que tengo hoy|prioridad(es)? de hoy|que hago primero)/);
  if (atencion) { add('buscar_pedidos', { urgentes: true, limite: 10 }); add('listar_tareas', { estado: 'abiertas', vencidas: true }); add('estadisticas', { periodo: 'hoy' }); }
  if (!num && has(/(pedido|envio|enviar|entrega|vence|vencid|urgente|retras|plazo|seguimiento|fabric|empaquet|incidencia|por enviar)/)) {
    const a = { limite: 15 };
    if (has(/(urgente|vencid|retras)/)) a.urgentes = true;
    if (has(/(vence|venceran|esta semana|pronto|proxim|mañana|manana)/)) a.proximos_a_vencer = true;
    if (has(/incidencia/)) a.con_incidencia = true;
    if (has(/(pendiente|abierto|sin enviar|por enviar|en curso|fabric|empaquet)/)) a.solo_abiertos = true;
    if (clients[0]) a.texto = clients[0].nombre; else if (prods[0]) a.texto = prods[0].nombre;
    add('buscar_pedidos', a);
  }
  if (!clients.length && has(/(cliente|clientes|frecuente|inactiv|fidel|mejores compradores|recuperar)/)) add('buscar_clientes', { frecuentes: has(/(frecuente|fiel|mejores)/) || undefined, inactivos: has(/(inactiv|no compran|recuperar|hace tiempo)/) || undefined, necesitan_atencion: has(/(atencion|seguimiento)/) || undefined, limite: 15 });
  if (has(/(venta|vendid|factur|ingres|beneficio|ganad|estadistic|como vamos|resumen|informe|balance)/) && !priceWords || has(/(cuanto (hemos|he) (vendido|ganado|facturado))/)) {
    const periodo = has(/(mes pasado|mes anterior)/) ? 'mes_anterior' : has(/(semana pasada|semana anterior)/) ? 'semana_anterior' : has(/ayer/) ? 'ayer' : has(/\bhoy\b/) ? 'hoy' : has(/(este ano|este año|anual|\bano\b)/) ? 'año' : has(/(semana)/) ? 'semana' : has(/(siempre|total|historico)/) ? 'todo' : 'mes';
    add('estadisticas', { periodo });
  }
  if (!prods.length && priceWords && has(/(producto|figura|maceta|pieza|articulo)/)) add('buscar_productos', { limite: 10 });
  if (has(/(tarea|que tengo que hacer|pendientes mias|mis pendientes|to ?do)/) && !task) add('listar_tareas', { estado: 'abiertas', responsable: has(/\b(mis|tengo|mias|me toca)\b/) ? me : undefined, vencidas: has(/vencid/) || undefined });
  if (has(/(stock|existencia|inventario|reponer|nos queda|quedan .* (unidades|bobinas)|filamento)/)) add('stock', { solo_bajo: has(/(bajo|reponer|falta|poco)/) || undefined });
  if (has(/(redes|instagram|tiktok|publicacion|publicar|post|reel|contenido)/) && !has(/(como|ideas?|consejo|escribe|redacta)/)) add('calendario_redes', {});
  if (has(/(noticia|anuncio|novedad)/)) add('noticias_recientes', { limite: 5 });
  if (has(/(archivo|foto|video|stl|3mf|documento subido|imagen de)/)) add('buscar_archivos', { texto: prods[0] ? prods[0].nombre : '' });
  return calls;
}

// ---------- 2) Contexto: herramientas + cálculos + biblioteca + memoria ----------
function compact(o, max = 3500) {
  const s = JSON.stringify(o, (k, v) => (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) ? undefined : v);
  return s.length > max ? s.slice(0, max) + '…(recortado)' : s;
}
async function gather(question, ctx, onStatus) {
  const t0 = Date.now();
  const calls = plan(question, ctx);
  const out = { calls, results: [], acciones: [], calc: null, docs: [], memoria: [], fuentes: [] };
  onStatus && onStatus('Consultando datos…');
  const jobs = [];
  if (calls.length) jobs.push(ctx.tools(calls).then(r => { out.results = r.resultados || r; out.acciones = r.acciones || []; }).catch(e => { out.toolError = e.message; }));
  jobs.push(search(question, { k: 4, allowed: ctx.allowed || null }).then(d => { out.docs = d; }).catch(e => { out.ragError = e.message; }));
  await Promise.all(jobs);
  out.calc = salesCalc(question, { iva: S.cfg && S.cfg.precios ? S.cfg.precios.iva : 0.21 });
  out.objecion = isPriceObjection(question);
  out.memoria = ctx.memoria || [];
  out.ms = Date.now() - t0;
  return out;
}
function contextText(g) {
  const parts = [];
  g.results.forEach((r, i) => { r.ref = 'T' + (i + 1); parts.push('[T' + (i + 1) + '] ' + toolLabel(r.nombre) + ': ' + compact(r.resultado)); });
  if (g.calc) parts.push('CÁLCULOS EXACTOS (cópialos tal cual, no recalcules):\n' + g.calc.lineas.map(l => '- ' + l).join('\n'));
  g.docs.forEach((d, i) => { d.ref = 'D' + (i + 1); parts.push('[D' + (i + 1) + '] ' + d.titulo + (d.seccion ? ' › ' + d.seccion : '') + ':\n' + d.texto); });
  if (g.memoria.length) parts.push('MEMORIA (datos guardados por el equipo; tenlos en cuenta):\n' + g.memoria.map(m => '- ' + (m.ambito === 'usuario' ? '[preferencia de ' + ((m.autor) || 'esta persona') + '] ' : m.ambito === 'empresa' ? '[empresa] ' : '[privado] ') + m.texto).join('\n'));
  return parts.join('\n\n');
}
function systemPrompt(ctx) {
  const emp = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'la empresa';
  const u = ctx.usuario || { nombre: S.me && S.me.nombre, rol: '' };
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return ['Eres el asistente interno de ' + emp + ', un pequeño negocio español de impresión 3D y reventa que vende online (Vinted, Wallapop, Etsy, Instagram, TikTok, WhatsApp).',
    'Hablas con ' + (u.nombre || 'una persona del equipo') + (u.rol ? ' (' + u.rol + ')' : '') + '. Hoy es ' + hoy + '.',
    'REGLAS OBLIGATORIAS:',
    '1. Los datos del negocio (pedidos, clientes, precios, costes, fechas, estados, ventas, stock, tareas) SOLO pueden salir del CONTEXTO. Nunca inventes cifras, nombres, fechas ni estados.',
    '2. Si el dato que piden no está en el CONTEXTO, responde: "' + NO_DATA + '" y di brevemente qué has buscado.',
    '3. Si hay CÁLCULOS EXACTOS, usa esos números tal cual. Si piden un precio con un porcentaje de ganancia, explica la diferencia entre margen y recargo con los dos resultados.',
    '4. Para consejos de venta, negociación, objeciones, mensajes o emails usa la BIBLIOTECA [D…] y tu conocimiento general, dejando claro que es una recomendación. Da varias opciones cuando te pidan respuestas a clientes.',
    '5. Cita las fuentes entre corchetes al final de la frase: [T1] para datos, [D1] para biblioteca.',
    '6. No puedes cambiar ni borrar nada. Si procede un cambio, di "Te propongo…" y explica que hay que confirmarlo con el botón.',
    '7. Si una herramienta dice "Sin permiso", explica que esa información requiere autorización de una administradora.',
    '8. Responde en español de España, claro y breve. Usa viñetas para listas. Importes con coma decimal y €.'].join('\n');
}

// ---------- 3) Redactar con el modelo local (streaming) ----------
let defs = null;
async function toolDefs() {
  if (!defs) { try { const d = await api('ia.definiciones', {}); defs = d.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })); } catch (e) { defs = []; } }
  return defs;
}
async function runModel(question, history, g, ctx, { onToken, onStatus, signal, model }) {
  const tools = await toolDefs();
  const msgs = [{ role: 'system', content: systemPrompt(ctx) }]
    .concat((history || []).slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) })))
    .concat([{ role: 'user', content: 'CONTEXTO:\n' + (contextText(g) || '(vacío: no hay datos relacionados)') + '\n\nPREGUNTA: ' + question }]);
  let text = '';
  const extra = [];
  for (let round = 0; round < 3; round++) {
    let msg = { role: 'assistant', content: '', tool_calls: [] };
    text = '';
    let inThink = false;
    onStatus && onStatus(round ? 'Consultando más datos…' : 'Redactando…');
    await desktop.iaChat({ model, messages: msgs, tools: round < 2 ? tools : undefined, stream: true, think: false, keep_alive: '30m', options: { temperature: (S.cfg && S.cfg.ia && S.cfg.ia.temperatura) || 0.3, num_ctx: 8192 } }, ch => {
      const m = ch.message || {};
      if (m.tool_calls && m.tool_calls.length) msg.tool_calls.push(...m.tool_calls);
      if (m.content) {
        let c = m.content;
        // algunos modelos "piensan" en voz alta: se oculta
        if (c.includes('<think>')) { inThink = true; c = c.split('<think>')[0]; }
        if (inThink) { if (m.content.includes('</think>')) { inThink = false; c = m.content.split('</think>').pop(); } else c = ''; }
        if (c) { text += c; msg.content += c; onToken && onToken(text); }
      }
    }, signal);
    if (!msg.tool_calls.length) break;
    // El modelo pide más datos: se consultan con los permisos de quien pregunta
    msgs.push({ role: 'assistant', content: msg.content, tool_calls: msg.tool_calls });
    const calls = msg.tool_calls.slice(0, 4).map(c => ({ nombre: c.function.name, args: typeof c.function.arguments === 'string' ? JSON.parse(c.function.arguments || '{}') : (c.function.arguments || {}) }));
    const r = await ctx.tools(calls).catch(e => ({ resultados: calls.map(c => ({ nombre: c.nombre, resultado: { error: e.message } })) }));
    const res = r.resultados || r;
    (r.acciones || []).forEach(a => g.acciones.push(a));
    res.forEach((x, i) => { const ref = 'T' + (g.results.length + 1); x.ref = ref; g.results.push(x); extra.push(x); msgs.push({ role: 'tool', content: '[' + ref + '] ' + compact(x.resultado) }); });
  }
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ---------- 4) Modo básico (sin modelo): mismos datos, sin redactar ----------
function fmtTool(r) {
  const x = r.resultado || {};
  if (x.error) return '• ' + toolLabel(r.nombre) + ': ' + x.error;
  switch (r.nombre) {
    case 'buscar_pedidos': return x.encontrados ? '📦 ' + x.encontrados + ' pedido(s):\n' + x.pedidos.slice(0, 10).map(o => '• nº ' + o.numero + ' · ' + o.cliente + ' · ' + o.producto + ' · ' + o.estado + (o.plazo ? ' · ' + o.plazo : '')).join('\n') : '📦 Ningún pedido coincide.';
    case 'ver_pedido': return '📦 Pedido nº ' + x.numero + ': ' + [x.cliente, x.producto + ' ×' + (x.cantidad || 1), x.total !== undefined ? eur(+x.total || 0) : '', x.estado, x.plazo, x.seguimiento ? 'seguimiento ' + x.seguimiento : ''].filter(Boolean).join(' · ');
    case 'buscar_clientes': return x.encontrados ? '👥 ' + x.encontrados + ' cliente(s):\n' + x.clientes.slice(0, 10).map(c => '• ' + c.nombre + ' · ' + c.pedidos + ' pedidos · ' + eur(+c.gastado || 0) + (c.ultimoPedido ? ' · último ' + c.ultimoPedido : '')).join('\n') : '👥 Ningún cliente coincide.';
    case 'ver_cliente': return '👤 ' + x.cliente.nombre + ': ' + x.resumen.pedidos + ' pedidos, ' + eur(+x.resumen.gastado || 0) + (x.resumen.ultimo ? ', último el ' + x.resumen.ultimo : '') + (x.cliente.telefono ? ' · tel. ' + x.cliente.telefono : '') + (x.resumen.etiquetas && x.resumen.etiquetas.length ? ' · ' + x.resumen.etiquetas.join(', ') : '');
    case 'buscar_productos': return x.encontrados ? '🧊 ' + x.productos.slice(0, 8).map(p => p.nombre + (p.precio ? ' (' + eur(+p.precio) + ')' : '')).join(' · ') : '🧊 Ningún producto coincide.';
    case 'consejo_precio': { const c = x.calculo || x; return c.recomendado ? '💶 Precio recomendado: Wallapop ' + eur(c.recomendado.wallapop) + ' · Vinted ' + eur(c.recomendado.vinted) + ' · Etsy ' + eur(c.recomendado.etsy) + ' (mínimo ' + eur(c.minimo.wallapop) + '; coste ' + eur(c.desglose.costeTotal) + ')' : '💶 ' + compact(x, 400); }
    case 'estadisticas': return '📊 ' + (x.desde || '') + ' → ' + (x.hasta || '') + ': ' + (x.pedidos !== undefined ? x.pedidos + ' pedidos' : '') + (x.ventas !== undefined ? ' · ' + eur(x.ventas) + ' en ventas' : '') + (x.ahora ? ' · ahora: ' + x.ahora.abiertos + ' abiertos, ' + x.ahora.vencidos + ' vencidos, ' + x.ahora.urgentes + ' urgentes' : '') + (x.topProductos && x.topProductos.length ? '\n• Más vendidos: ' + x.topProductos.join(', ') : '');
    case 'listar_tareas': return x.encontradas ? '✅ ' + x.encontradas + ' tarea(s):\n' + x.tareas.slice(0, 10).map(t => '• ' + t.titulo + ' · ' + t.estado + (t.responsable ? ' · ' + t.responsable : '') + (t.fechaLimite ? ' · ' + t.fechaLimite : '')).join('\n') : '✅ No hay tareas que coincidan.';
    case 'stock': return x.encontrados ? '📦 Stock:\n' + x.stock.slice(0, 12).map(s => '• ' + s.producto + ': ' + s.unidades + (s.minimo ? ' (mín. ' + s.minimo + ')' : '') + (s.alerta ? ' ⚠️' : '')).join('\n') : '📦 Sin datos de stock que coincidan.';
    case 'calendario_redes': return (x.publicaciones || []).length ? '📱 Redes:\n' + x.publicaciones.slice(0, 10).map(p => '• ' + p.fecha + ' ' + p.red + ': ' + (p.titulo || '') + ' · ' + p.estado).join('\n') : '📱 No hay publicaciones en esas fechas.';
    case 'noticias_recientes': return (x.noticias || []).length ? '📰 ' + x.noticias.map(n => n.titulo + ' (' + n.fecha + ')').join(' · ') : '📰 Sin noticias.';
    case 'buscar_archivos': return x.encontrados ? '📁 ' + x.archivos.slice(0, 8).map(a => a.nombre).join(' · ') : '📁 Ningún archivo coincide.';
    case 'crear_tarea': case 'proponer_cambio': case 'proponer_memoria': return x.propuesto ? '📝 Te propongo el cambio de abajo: confírmalo con el botón.' : '';
  }
  return '• ' + toolLabel(r.nombre) + ': ' + compact(x, 500);
}
function basicAnswer(g) {
  const parts = [];
  if (g.calc) parts.push('🧮 ' + g.calc.lineas.join('\n'));
  g.results.forEach(r => { const t = fmtTool(r); if (t) parts.push(t); });
  if (g.docs.length && (!g.results.length || g.objecion)) parts.push('📚 De la biblioteca:\n' + g.docs.slice(0, 2).map(d => '**' + d.titulo + (d.seccion ? ' › ' + d.seccion : '') + '**\n' + d.texto.slice(0, 700) + (d.texto.length > 700 ? '…' : '')).join('\n\n'));
  if (!parts.length) return NO_DATA + ' He buscado en los datos de la empresa y en la biblioteca y no hay nada relacionado.';
  return parts.join('\n\n');
}

function sources(g) {
  const f = [];
  g.results.forEach(r => f.push({ tipo: 'datos', ref: r.ref, titulo: toolLabel(r.nombre), error: !!(r.resultado && r.resultado.error) }));
  if (g.calc) f.push({ tipo: 'calculo', ref: 'C', titulo: 'Cálculo exacto' });
  g.docs.forEach(d => f.push({ tipo: d.origen === 'memoria' ? 'memoria' : 'doc', ref: d.ref, titulo: d.titulo + (d.seccion ? ' › ' + d.seccion : ''), docId: d.docId, origen: d.origen }));
  if (g.memoria.length) f.push({ tipo: 'memoria', ref: 'M', titulo: g.memoria.length + ' recuerdo(s)' });
  return f;
}

// ---------- Ejecutar en ESTE dispositivo (PC con modelo o modo básico) ----------
export async function answerHere(question, history, ctx, cbs = {}) {
  const t0 = Date.now();
  const g = await gather(question, ctx, cbs.onStatus);
  const st = cbs.forceBasic ? { disponible: false } : await localStatus();
  let texto = '', modo = 'basico', modelo = '';
  if (st.disponible) {
    try {
      texto = await runModel(question, history, g, ctx, Object.assign({}, cbs, { model: st.modelo }));
      modo = 'local'; modelo = st.modelo;
      if (!texto) texto = basicAnswer(g);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      texto = basicAnswer(g) + '\n\n_(La IA local no pudo redactar: ' + e.message + ')_';
    }
  } else texto = basicAnswer(g);
  const res = { texto, fuentes: sources(g), herramientas: g.results.map(r => r.nombre), acciones: g.acciones || [], modo, modelo, ms: Date.now() - t0, motivoBasico: st.disponible ? '' : (st.motivo || '') };
  return res;
}

// Contexto por defecto: la persona que está usando la app
export function myContext() {
  return {
    usuario: { nombre: S.me && S.me.nombre, rol: '' },
    tools: calls => api('ia.herramientas', { llamadas: calls }).then(list => ({ resultados: list, acciones: list.flatMap(x => x.acciones || []) })),
    allowed: null,
    // la memoria (preferencias propias, datos de empresa y privados visibles) va siempre en el contexto
    memoria: (S.t.memoria || []).filter(m => m.ambito !== 'usuario' || m.userId === (S.me && S.me.id)).slice(-25)
  };
}

// ---------- Punto de entrada: decide dónde se responde ----------
// local (este PC) → equipo (el PC servidor responde por Google) → básico (aquí, sin modelo)
export async function ask(question, history, cbs = {}) {
  const st = await localStatus();
  if (st.disponible) return answerHere(question, history, myContext(), cbs);
  // ¿Hay ahora mismo un PC atendiendo? (consulta rápida para no depender de la última sincronización)
  if (S.online) { try { S.iaServidor = await api('ia.servidor', {}, { timeout: 8000 }); } catch (e) { } }
  if (S.iaServidor && S.online) {
    try { return await askTeam(question, history, cbs); }
    catch (e) { if (e.name === 'AbortError') throw e; cbs.onStatus && cbs.onStatus('El PC servidor no ha respondido: uso el modo básico.'); }
  }
  const res = await answerHere(question, history, myContext(), Object.assign({}, cbs, { forceBasic: true }));
  if (!desktop.on && !S.iaServidor) res.motivoBasico = 'Ningún PC con IA local está atendiendo ahora (abre la app en el PC servidor para respuestas redactadas).';
  return res;
}
// El PC servidor responde (móvil, portátil sin modelo)
async function askTeam(question, history, cbs) {
  cbs.onStatus && cbs.onStatus('Enviando la pregunta a ' + S.iaServidor.dispositivo + '…');
  const j = await api('ia.cola.crear', { pregunta: question, historial: (history || []).slice(-6), contexto: decodeURIComponent(location.hash.slice(2)).split('?')[0] });
  const t0 = Date.now();
  for (;;) {
    if (cbs.signal && cbs.signal.aborted) { api('ia.cola.cancelar', { id: j.id }).catch(() => { }); throw new DOMException('cancelado', 'AbortError'); }
    await new Promise(r => setTimeout(r, 1500));
    const st = await api('ia.cola.estado', { id: j.id });
    if (st.estado === 'hecha' && st.respuesta) return Object.assign({ modo: 'equipo', servidor: st.respuesta.servidor }, st.respuesta);
    if (st.estado === 'error') throw new Error(st.error || 'Error en el PC servidor');
    cbs.onStatus && cbs.onStatus(st.estado === 'procesando' ? 'Pensando en ' + (st.servidor ? st.servidor.dispositivo : 'el PC servidor') + '…' : 'En cola…');
    if (Date.now() - t0 > 150000) { api('ia.cola.cancelar', { id: j.id }).catch(() => { }); throw new Error('El PC servidor tarda demasiado.'); }
  }
}

// ---------- Trabajador: este PC atiende las preguntas del equipo ----------
let workerOn = false;
export function startWorker() {
  if (workerOn || !desktop.on) return;
  workerOn = true;
  // v9.7: si no hay preguntas, se consulta cada vez con más calma (3 s → 6 s) para no cargar el PC ni la red
  let idle = 0;
  const loop = async () => {
    try {
      if (S.token && can('ia.servidor') && localStorage.getItem('cd.iaServidor') !== '0' && !(S.cfg && S.cfg.ia && S.cfg.ia.servidorEquipo === false)) {
        const st = await localStatus();
        if (st.disponible) {
          const job = await api('ia.cola.siguiente', { dispositivo: S.device, modelo: st.modelo });
          if (job) { idle = 0; await serveJob(job); setTimeout(loop, 300); return; }
        }
      }
    } catch (e) { console.warn('IA equipo', e.message); }
    idle = Math.min(idle + 1, 3);
    setTimeout(loop, (document.visibilityState === 'visible' ? 3000 : 5000) + idle * 1000);
  };
  setTimeout(loop, 4000);
}
async function serveJob(job) {
  const t0 = Date.now();
  try {
    // datos al día antes de responder (clientes o productos creados hace un momento en otro dispositivo)
    await Promise.race([pull(), new Promise(r => setTimeout(r, 6000))]).catch(() => { });
    const c = await api('ia.cola.contexto', { jobId: job.id });
    const ctx = {
      usuario: job.usuario,
      tools: calls => api('ia.cola.herramientas', { jobId: job.id, llamadas: calls }),
      allowed: new Set(c.documentos.map(d => d.id)),
      memoria: c.memoria || []
    };
    const res = await answerHere(job.pregunta, job.historial || [], ctx, {});
    res.ms = Date.now() - t0;
    await api('ia.cola.responder', { jobId: job.id, respuesta: res });
  } catch (e) {
    await api('ia.cola.responder', { jobId: job.id, error: e.message || String(e) }).catch(() => { });
  }
}

// ---------- Redactar un texto (redes, resúmenes de informes…) con la IA local ----------
// Solo con los datos que se le pasan en el propio encargo. En el móvil lo redacta el PC servidor.
export async function write(prompt, { onToken, signal } = {}) {
  const st = await localStatus();
  if (st.disponible) {
    let text = '';
    await desktop.iaChat({ model: st.modelo, stream: true, think: false, keep_alive: '30m', options: { temperature: 0.6, num_ctx: 8192 },
      messages: [{ role: 'system', content: 'Eres redactor/a de ' + ((S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'la empresa') + ', un pequeño negocio español de impresión 3D. Escribes en español de España, cercano y claro. Usa SOLO los datos que te den; no inventes cifras, precios ni características. Devuelve solo el texto pedido.' }, { role: 'user', content: prompt }] },
      ch => { const c = ch.message && ch.message.content; if (c) { text += c; onToken && onToken(text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')); } }, signal);
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }
  if (S.online) { try { S.iaServidor = await api('ia.servidor', {}, { timeout: 8000 }); } catch (e) { } }
  if (S.iaServidor && S.online) { const r = await askTeam(prompt, [], { signal }); return r.texto; }
  throw new Error('Para redactar textos hace falta la IA local (en el PC) o que el PC servidor de IA esté encendido con la app abierta.');
}
