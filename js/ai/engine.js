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
import { isBriefQuestion, briefText, objetivos, objetivoTexto } from './celebrity.js';

export const NO_DATA = 'No encuentro ese dato en la información disponible.';
const LABEL = { buscar_pedidos: 'Pedidos', ver_pedido: 'Pedido', buscar_clientes: 'Clientes', ver_cliente: 'Cliente', buscar_productos: 'Productos', consejo_precio: 'Costes y precios', listar_tareas: 'Tareas', crear_tarea: 'Propuesta de tarea', proponer_cambio: 'Propuesta de cambio', estadisticas: 'Ventas y estadísticas', calendario_redes: 'Calendario de redes', noticias_recientes: 'Noticias', buscar_archivos: 'Archivos', stock: 'Stock', proponer_memoria: 'Memoria', crear_objetivo: 'Propuesta de objetivo' };
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
  // Objetivos: "objetivo: publicar 3 productos hoy", "pon como objetivo vender 200 € este mes"
  const ob = /objetivo/.test(norm(question)) && /(\d+(?:[.,]\d+)?)/.exec(norm(question));
  if (ob && /(pon|crea|nuevo|marca|fija|quiero|objetivo:|objetivo de)/.test(norm(question))) {
    const qn = norm(question), tipo = /(public|subir|post|redes)/.test(qn) ? 'publicar' : /(vend|venta|factur|€|euros)/.test(qn) ? 'ventas' : /pedido/.test(qn) ? 'pedidos' : /tarea/.test(qn) ? 'tareas' : /producto/.test(qn) ? 'productos' : '';
    if (tipo) add('crear_objetivo', { tipo, meta: Number(ob[1].replace(',', '.')), periodo: /semana/.test(qn) ? 'semana' : /mes/.test(qn) ? 'mes' : 'dia' });
  }
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
  // v10: la biblioteca solo se consulta si hace falta (consejos, cómo…, o no hay datos que buscar)
  const needDocs = !calls.length || /(como|consejo|ideas?|respond|contest|objecion|caro|negoci|mensaje|email|escrib|redact|descripcion|vender mas|estrategia|por que)/.test(norm(question));
  if (needDocs) jobs.push(search(question, { k: 3, allowed: ctx.allowed || null }).then(d => { out.docs = d.map(x => Object.assign({}, x, { texto: String(x.texto).slice(0, 900) })); }).catch(e => { out.ragError = e.message; }));
  await Promise.all(jobs);
  if (wantsWeb(question)) await webLookup(question, out, onStatus);
  out.calc = salesCalc(question, { iva: S.cfg && S.cfg.precios ? S.cfg.precios.iva : 0.21 });
  out.objecion = isPriceObjection(question);
  out.memoria = ctx.memoria || [];
  out.ms = Date.now() - t0;
  return out;
}
// ---------- v10: herramienta de Internet (solo si se pide y con permiso; queda registrada) ----------
export const wantsWeb = q => /(internet|en la web|busca(r)? en (google|la red)|online|precio(s)? actual|cuanto cuesta (el|un) envio|gastos? de envio|tarifa|correos|seur|mrw|gls|nacex|packlink|ups|dhl|precio de mercado|competencia)/.test(norm(q));
async function webLookup(question, out, onStatus) {
  out.web = [];
  if (!desktop.on) { out.webNota = 'La búsqueda en Internet solo está disponible en el programa del PC.'; return; }
  if (!can('ia.internet')) { out.webNota = 'Buscar en Internet requiere el permiso «Celeby Nova puede buscar en Internet».'; return; }
  onStatus && onStatus('Buscando en Internet…');
  try {
    const qq = String(question).replace(/(busca(r)? en (internet|google|la web)|en internet|por favor)/gi, '').trim() + ' España';
    const r = await desktop.webBuscar(qq);
    const top = (r.resultados || []).slice(0, 4);
    const pages = await Promise.all(top.slice(0, 2).map(x => Promise.race([desktop.webLeer(x.url), new Promise((_, rej) => setTimeout(() => rej(new Error('lenta')), 9000))]).then(p => p.texto).catch(() => '')));
    top.forEach((x, i) => out.web.push({ ref: 'W' + (i + 1), titulo: x.titulo, url: x.url, texto: ((pages[i] || '').slice(0, 1600) || x.resumen || '') }));
    out.webQuery = qq;
  } catch (e) { out.webNota = 'No se pudo buscar en Internet: ' + e.message; }
}
function contextText(g) {
  const parts = [];
  g.results.forEach((r, i) => { r.ref = 'T' + (i + 1); parts.push('[T' + (i + 1) + '] ' + toolLabel(r.nombre) + ': ' + compact(r.resultado)); });
  if (g.calc) parts.push('CÁLCULOS EXACTOS (cópialos tal cual, no recalcules):\n' + g.calc.lineas.map(l => '- ' + l).join('\n'));
  g.docs.forEach((d, i) => { d.ref = 'D' + (i + 1); parts.push('[D' + (i + 1) + '] ' + d.titulo + (d.seccion ? ' › ' + d.seccion : '') + ':\n' + d.texto); });
  (g.web || []).forEach(w => parts.push('[' + w.ref + '] INTERNET · ' + w.titulo + ' (' + w.url + '):\n' + w.texto));
  if (g.webNota) parts.push('INTERNET: ' + g.webNota);
  if (g.memoria.length) parts.push('MEMORIA (datos guardados por el equipo; tenlos en cuenta):\n' + g.memoria.map(m => '- ' + (m.ambito === 'usuario' ? '[preferencia de ' + ((m.autor) || 'esta persona') + '] ' : m.ambito === 'empresa' ? '[empresa] ' : '[privado] ') + m.texto).join('\n'));
  return parts.join('\n\n');
}
// v11.8: «Mensaje corto» o «Mensaje ampliado» (lo elige cada persona en Celeby Nova)
export function respStyle() { try { return localStorage.getItem('cd.nova.estilo') === 'ampliado' ? 'ampliado' : 'corto'; } catch (e) { return 'corto'; } }
export function setRespStyle(v) { try { localStorage.setItem('cd.nova.estilo', v === 'ampliado' ? 'ampliado' : 'corto'); } catch (e) { } }
function systemPrompt(ctx) {
  const emp = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'la empresa';
  const u = ctx.usuario || { nombre: S.me && S.me.nombre, rol: '' };
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return ['Eres CELEBY NOVA, la gestora interna de ' + emp + ' (negocio español de impresión 3D y venta online: Vinted, Wallapop, Etsy, Instagram, TikTok, WhatsApp). No eres un chatbot genérico: conoces pedidos, tareas, productos, stock y objetivos, y dices qué hacer.',
    'Hablas con ' + (u.nombre || 'una persona del equipo') + (u.rol ? ' (' + u.rol + ')' : '') + '. Hoy es ' + hoy + '.',
    'REGLAS OBLIGATORIAS:',
    '1. Los datos del negocio (pedidos, clientes, precios, costes, fechas, estados, ventas, stock, tareas) SOLO pueden salir del CONTEXTO. Nunca inventes cifras, nombres, fechas ni estados.',
    '2. Si el dato que piden no está en el CONTEXTO, responde: "' + NO_DATA + '" y di brevemente qué has buscado.',
    '3. Si hay CÁLCULOS EXACTOS, usa esos números tal cual. Si piden un precio con un porcentaje de ganancia, explica la diferencia entre margen y recargo con los dos resultados.',
    '4. Para consejos de venta, negociación, objeciones, mensajes o emails usa la BIBLIOTECA [D…] y tu conocimiento general, dejando claro que es una recomendación. Da varias opciones cuando te pidan respuestas a clientes.',
    '5. Cita las fuentes entre corchetes al final de la frase: [T1] para datos, [D1] para biblioteca.',
    '6. No puedes cambiar ni borrar nada. Si procede un cambio, di "Te propongo…" y explica que hay que confirmarlo con el botón.',
    '7. Si una herramienta dice "Sin permiso", explica que esa información requiere autorización de una administradora.',
    respStyle() === 'ampliado'
      ? '8. ESTILO (MENSAJE AMPLIADO): español de España, claro y ordenado. Explica con detalle: contexto, cifras del CONTEXTO, causas registradas y pasos a seguir, en párrafos cortos o viñetas. Sin relleno ni introducciones; no inventes nada para alargar.'
      : '8. ESTILO (MENSAJE CORTO): español de España, natural y directo. Respuestas CORTAS: 1-3 frases o viñetas breves. Nada de introducciones ("Claro", "Aquí tienes", "Actualmente…"), no repitas la pregunta, no expliques lo obvio. Ejemplo bueno: "Hoy faltan 3 productos. Publica 2 y revisa los mensajes." Solo te extiendes si te piden un texto largo (descripción, mensaje, email).',
    '9. Importes con coma decimal y €.',
    '10. Datos de INTERNET [W…]: úsalos solo si aparecen en el texto, cita la web y da un rango (p. ej. "Envío estimado España: 4–7 €") y de qué depende (peso, medidas, destino, transportista). Si no aparece el dato, dilo; nunca inventes precios.',
    '11. DESCRIPCIONES DE PRODUCTO: céntrate en el producto (qué es, características, materiales, uso, detalles, ventajas y acabado). No hables de quién lo hizo: nada de «he creado», «he fabricado», «he diseñado» ni «fabricado por nosotros».'].join('\n');
}

// v10.6.1: limpia el "pensamiento en voz alta" de los modelos qwen3. Algunas versiones (qwen3:4b 2507)
// piensan aunque se pida think:false y lo escriben SIN la etiqueta <think> de apertura, solo con </think> al final.
const LEAK_RE = /^\s*(okay|ok[,.]|alright|all right|let me|let's|let us|first,|hmm|so,|so the user|the user|we need|i need|wait,)/i;
export function cleanThink(raw, done) {
  let t = String(raw || '');
  if (t.includes('</think>')) t = t.split('</think>').pop();
  t = t.replace(/<think>[\s\S]*?(<\/think>|$)/g, '');
  // razonamiento en inglés sin etiquetas: se oculta mientras llega; si termina sin respuesta, se descarta
  if (LEAK_RE.test(t)) return '';
  return done ? t.trim() : t;
}

// ---------- 3) Redactar con el modelo local (streaming) ----------
let defs = null;
async function toolDefs() {
  if (!defs) { try { const d = await api('ia.definiciones', {}); defs = d.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })); } catch (e) { defs = []; } }
  return defs;
}
async function runModel(question, history, g, ctx, { onToken, onStatus, signal, model }) {
  const tools = await toolDefs();
  const msgs = [{ role: 'system', content: systemPrompt(ctx) + '\n/no_think' }]
    .concat((history || []).slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) })))
    .concat([{ role: 'user', content: 'CONTEXTO:\n' + (contextText(g) || '(vacío: no hay datos relacionados)') + '\n\nPREGUNTA: ' + question }]);
  let text = '';
  const extra = [];
  for (let round = 0; round < 3; round++) {
    let msg = { role: 'assistant', content: '', tool_calls: [] };
    text = '';
    let raw = '';
    onStatus && onStatus(round ? 'Consultando más datos…' : 'Redactando…');
    // v10: si ya tenemos los datos (plan), no se mandan las herramientas: menos texto = respuesta más rápida
    const useTools = round < 2 && (!g.calls.length || round > 0) && tools.length;
    const longAnswer = /(descripcion|redacta|escribe|mensaje|email|correo|texto para|post|anuncio|guion)/.test(norm(question));
    await desktop.iaChat({ model, messages: msgs, tools: useTools ? tools : undefined, stream: true, think: false, keep_alive: '60m', options: { temperature: (S.cfg && S.cfg.ia && S.cfg.ia.temperatura) || 0.3, num_ctx: 6144, num_predict: longAnswer ? 700 : 320 } }, ch => {
      const m = ch.message || {};
      if (m.tool_calls && m.tool_calls.length) msg.tool_calls.push(...m.tool_calls);
      if (m.content) {
        // algunos modelos "piensan" en voz alta: se oculta (con o sin etiquetas <think>)
        raw += m.content;
        text = cleanThink(raw);
        msg.content = text;
        onToken && onToken(text);
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
  return cleanThink(text, true);
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
    case 'crear_tarea': case 'proponer_cambio': case 'proponer_memoria': case 'crear_objetivo': return x.propuesto ? '📝 Te propongo el cambio de abajo: confírmalo con el botón.' : '';
  }
  return '• ' + toolLabel(r.nombre) + ': ' + compact(x, 500);
}
function basicAnswer(g) {
  const parts = [];
  if (g.calc) parts.push('🧮 ' + g.calc.lineas.join('\n'));
  g.results.forEach(r => { const t = fmtTool(r); if (t) parts.push(t); });
  if (g.docs.length && (!g.results.length || g.objecion)) parts.push('📚 De la biblioteca:\n' + g.docs.slice(0, 2).map(d => '**' + d.titulo + (d.seccion ? ' › ' + d.seccion : '') + '**\n' + d.texto.slice(0, 700) + (d.texto.length > 700 ? '…' : '')).join('\n\n'));
  if ((g.web || []).length) parts.push('🌐 En Internet:\n' + g.web.map(w => '• ' + w.titulo + ' — ' + w.url).join('\n'));
  if (g.webNota) parts.push('🌐 ' + g.webNota);
  if (!parts.length) return NO_DATA + ' He buscado en los datos de la empresa y en la biblioteca y no hay nada relacionado.';
  return parts.join('\n\n');
}

function sources(g) {
  const f = [];
  g.results.forEach(r => f.push({ tipo: 'datos', ref: r.ref, titulo: toolLabel(r.nombre), error: !!(r.resultado && r.resultado.error) }));
  if (g.calc) f.push({ tipo: 'calculo', ref: 'C', titulo: 'Cálculo exacto' });
  g.docs.forEach(d => f.push({ tipo: d.origen === 'memoria' ? 'memoria' : 'doc', ref: d.ref, titulo: d.titulo + (d.seccion ? ' › ' + d.seccion : ''), docId: d.docId, origen: d.origen }));
  if (g.memoria.length) f.push({ tipo: 'memoria', ref: 'M', titulo: g.memoria.length + ' recuerdo(s)' });
  (g.web || []).forEach(w => f.push({ tipo: 'web', ref: w.ref, titulo: w.titulo, url: w.url }));
  return f;
}

// ---------- Ejecutar en ESTE dispositivo (PC con modelo o modo básico) ----------
const cache = new Map(); // pregunta + estado de los datos → respuesta (10 min)
export async function answerHere(question, history, ctx, cbs = {}) {
  const t0 = Date.now();
  // v10: "¿qué hay hoy?", "resumen", "objetivos"… → Celebrity responde al instante con datos reales
  if (isBriefQuestion(question) && String(question).length < 80 && !ctx.remoto) {
    return { texto: briefText(), fuentes: [{ tipo: 'datos', ref: 'Hoy', titulo: 'Resumen del día (datos reales)' }], herramientas: [], acciones: [], modo: 'celebrity', modelo: '', ms: Date.now() - t0 };
  }
  const ck = S.ws + '|' + respStyle() + '|' + norm(question) + '|' + (S.lastSync || '') + '|' + (history || []).length;
  const hit = !cbs.forceBasic && cache.get(ck);
  if (hit && Date.now() - hit.t < 600000) { cbs.onToken && cbs.onToken(hit.r.texto); return Object.assign({}, hit.r, { ms: Date.now() - t0, cache: true }); }
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
  const res = { texto, fuentes: sources(g), herramientas: g.results.map(r => r.nombre).concat((g.web || []).length ? ['internet: ' + g.webQuery] : []), acciones: g.acciones || [], modo, modelo, ms: Date.now() - t0, motivoBasico: st.disponible ? '' : (st.motivo || '') };
  if (modo === 'local' && !res.acciones.length) { cache.set(ck, { t: Date.now(), r: res }); if (cache.size > 60) cache.delete(cache.keys().next().value); }
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
  // el resumen del día se calcula en el propio dispositivo (con los permisos de quien pregunta)
  if (isBriefQuestion(question) && String(question).length < 80) return answerHere(question, history, myContext(), cbs);
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
async function askTeam(question, history, cbs, modo) {
  cbs.onStatus && cbs.onStatus('Enviando la pregunta a ' + S.iaServidor.dispositivo + '…');
  if (modo !== 'redactar') question = (respStyle() === 'ampliado' ? '[Responde con un MENSAJE AMPLIADO, detallado] ' : '[Responde con un MENSAJE CORTO, 1-3 frases] ') + question;
  const j = await api('ia.cola.crear', { pregunta: question, historial: (history || []).slice(-6), contexto: modo === 'redactar' ? 'redactar' : decodeURIComponent(location.hash.slice(2)).split('?')[0] });
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
// v10: el modelo se carga en memoria al abrir el programa: la primera pregunta ya no espera
export async function warmUp() {
  try { const st = await localStatus(); if (st.disponible) await desktop.iaChat({ model: st.modelo, messages: [], stream: true, keep_alive: '60m' }, () => { }); } catch (e) { }
}
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
      remoto: true,
      tools: calls => api('ia.cola.herramientas', { jobId: job.id, llamadas: calls }),
      allowed: new Set(c.documentos.map(d => d.id)),
      memoria: c.memoria || []
    };
    // v10.8: encargos de redacción (respuestas a clientes desde el móvil): texto directo, sin el modo "datos del negocio"
    const res = String(job.contexto || '') === 'redactar'
      ? { texto: await writeLocal(job.pregunta, await localStatus()), modo: 'local', fuentes: [], herramientas: [] }
      : await answerHere(job.pregunta, job.historial || [], ctx, {});
    res.ms = Date.now() - t0;
    await api('ia.cola.responder', { jobId: job.id, respuesta: res });
  } catch (e) {
    await api('ia.cola.responder', { jobId: job.id, error: e.message || String(e) }).catch(() => { });
  }
}

// ---------- Redactar un texto (redes, resúmenes de informes…) con la IA local ----------
// Solo con los datos que se le pasan en el propio encargo. En el móvil lo redacta el PC servidor.
async function writeLocal(prompt, st, onToken, signal) {
  let text = '';
  await desktop.iaChat({ model: st.modelo, stream: true, think: false, keep_alive: '30m', options: { temperature: 0.6, num_ctx: 8192 },
    messages: [{ role: 'system', content: 'Eres redactor/a de ' + ((S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'la empresa') + ', un pequeño negocio español de impresión 3D. Escribes en español de España, cercano y claro. Usa SOLO los datos que te den; no inventes cifras, precios ni características. Si describes un producto, céntrate en el producto (características, materiales, uso, detalles, acabado), no en quién lo hizo: nada de «he creado/fabricado/diseñado este producto». Devuelve solo el texto pedido.\n/no_think' }, { role: 'user', content: prompt }] },
    ch => { const c = ch.message && ch.message.content; if (c) { text += c; onToken && onToken(cleanThink(text)); } }, signal);
  return cleanThink(text, true);
}
export async function write(prompt, { onToken, signal, onStatus } = {}) {
  const st = await localStatus();
  if (st.disponible) return writeLocal(prompt, st, onToken, signal);
  if (S.online) { try { S.iaServidor = await api('ia.servidor', {}, { timeout: 8000 }); } catch (e) { } }
  if (S.iaServidor && S.online) { const r = await askTeam(prompt, [], { signal, onStatus }, 'redactar'); onToken && onToken(r.texto); return r.texto; }
  throw new Error('Para redactar textos hace falta la IA local (en el PC) o que el PC servidor de IA esté encendido con la app abierta.');
}
