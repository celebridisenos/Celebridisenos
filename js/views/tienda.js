// ================= v12 · 🛍️ Tienda web de CelebriDiseños (sustituye a THE NOORKO) =================
// La tienda es un proyecto INDEPENDIENTE (Cloudflare). Desde aquí se publica lo que tú decides y se traen los
// pedidos pagados; todo pasa por el servidor de Google con claves firmadas. La web nunca ve nada interno.
import { h, mount, btn, modal, toast, pill, empty, field, inp, sel, area, sw, confirmDlg, eur, copyText, fdt, ago } from '../ui.js';
import { S, can, api, pull, emit } from '../store.js';
import { go, handleError } from '../app.js';
import { filesOf, fetchFile, previewUrl } from '../files.js';
import { prepararModelo, leerCDM } from '../modelo3d.js';
import { viewer } from '../stl.js';

const CL = window.CL;
const card = (title, ...kids) => h('div.card.col', title ? h('h3', title) : null, ...kids);
const T = () => JSON.parse(JSON.stringify((S.cfg && S.cfg.tienda) || {}));
const web = p => (p && p.web && typeof p.web === 'object' ? p.web : {});
// v16.2 · Cómo está un producto en la tienda, para verlo sin entrar: publicado · agotado (stock contado a 0) · alguna vez publicado
export function estadoWeb(p) {
  const w = web(p), contado = w.stockModo === 'contado';
  return { publicado: !!w.publicado, antes: !!w.publicadoEn, agotado: !!w.publicado && contado && !(Number(w.stock) > 0), contado, stock: contado ? Math.max(0, Number(w.stock) || 0) : null,
    cambios: !!w.publicado && String(p.actualizado || '') > String(w.publicadoEn || ''), url: w.url || '' };
}
const n = v => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const PAISES = [['ES', 'España'], ['PT', 'Portugal'], ['FR', 'Francia'], ['IT', 'Italia'], ['DE', 'Alemania'], ['AD', 'Andorra']];

// ---------- Página (menú → Tienda web) ----------
export function render(el, params) {
  el.append(h('div.page-head', h('div', h('h1', '🛍️ Tienda web'), h('div.muted.small', 'Tu tienda online de CelebriDiseños: publica productos, crea campañas REALES (CELEBRY DAY…), configura envíos y recibe los pedidos pagados aquí, como «Tienda web».'))));
  const body = h('div.col', { style: { gap: 'var(--gap)' } });
  el.append(body);
  panel(body, (params && params[0]) || 'resumen');
}
// También como sección de Configuración
export function tiendaConfig(b) { panel(b, 'resumen'); }

function panel(root, tab0) {
  if (!can('tienda.gestionar')) { mount(root, empty('store', 'Solo para quien gestiona la tienda', 'Pide el permiso «Gestionar la tienda web» a una administradora.')); return; }
  let tab = tab0;
  const tabs = h('div.tabs'), body = h('div.col', { style: { gap: 'var(--gap)' } });
  const TABS = [['resumen', 'Resumen'], ['conexion', 'Conexión'], ['datos', 'Datos y margen'], ['campanas', '✨ Campañas'], ['envios', 'Envíos'], ['textos', 'Quiénes somos y legal'], ['ideas', '💡 Ideas']];
  const draw = () => { mount(tabs, TABS.map(([k, t]) => h('button' + (tab === k ? '.on' : ''), { onclick: () => { tab = k; draw(); } }, t))); mount(body); SECS[tab](body, draw); };
  mount(root, tabs, body);
  draw();
}

// Guarda la configuración y, si la tienda está conectada, la publica (con avisos de lo que falta)
async function guardar(valor, publicar = true, confirmar = false) {
  if (!confirmar) { const r = await api('tienda.guardar', { valor }); S.cfg.tienda = r.tienda; emit(); }
  if (!publicar) { toast('Guardado', 'ok'); return; }
  try {
    const p = await api('tienda.configPublicar', { confirmar }, { timeout: 60000 });
    toast('Guardado y publicado en la tienda', 'ok');
    if (p.avisos && p.avisos.length) modal('Publicado, pero revisa esto', h('ul', p.avisos.map(a => h('li', a))), c => [btn('Entendido', c, { cls: 'primary' })]);
  } catch (e) {
    // el descuento web daría pérdidas o bajaría del margen mínimo: la decisión es de la dueña
    if (e.code === 'MARGEN') { if (await confirmDlg('Revisa el margen del descuento web', e.message, 'Publicar así (lo decido yo)', true)) return guardar(valor, publicar, true); toast('Guardado en el programa, pero NO publicado: el descuento web no se aplica en la tienda.', 'warn', 9000); return; }
    toast('Guardado en el programa. No se pudo publicar en la tienda: ' + e.message, 'warn', 9000);
  }
}

const SECS = {
  async resumen(b) {
    const st = h('div', h('p.muted', 'Comprobando la tienda…'));
    const pubs = S.t.productos.filter(p => web(p).publicado);
    b.append(card('Estado', st),
      card('Productos en la tienda (' + pubs.length + ')',
        pubs.length ? h('div.list.boxed', pubs.map(p => {
          const w = web(p), cambios = p.actualizado && w.publicadoEn && p.actualizado > w.publicadoEn;
          return h('div.item', { onclick: () => go('productos/' + p.id) }, h('div.grow', h('b', p.nombre), h('div.tiny.muted', eur(w.precio) + ' · publicado ' + ago(w.publicadoEn) + (w.publicadoPor ? ' por ' + w.publicadoPor : ''))),
            w.margen && w.margen.estado === 'perdida' ? pill('pierde dinero', 'bad') : w.margen && w.margen.estado === 'bajo' ? pill('margen bajo', 'warn') : w.margen && w.margen.estado === 'sin_datos' ? pill('sin coste', 'warn') : null,
            cambios ? pill('cambios sin publicar', 'warn') : null, w.destacado ? pill('destacado') : null);
        })) : h('p.muted.small', 'Todavía no hay productos publicados. Abre un producto → pestaña «Tienda web» → «Publicar en la tienda».'),
        h('div.row.wrap', btn('Ir a Productos', () => go('productos'), { cls: 'sm' }))));
    let r;
    try { r = await api('tienda.estado', {}, { timeout: 40000 }); } catch (e) { mount(st, h('p.bad-t', e.message)); return; }
    if (!r.configurada) {
      mount(st, h('p', pill('Sin conectar', 'warn'), ' La tienda aún no está conectada con el programa.'),
        h('ol.small', h('li', 'Publica la tienda en Cloudflare (lo explica la guía DESPLIEGUE de la carpeta de la tienda).'), h('li', 'Pestaña «Conexión»: pon su dirección y genera las dos claves.'), h('li', 'Pega las claves en Cloudflare y pulsa «Probar conexión».')),
        btn('Ir a Conexión', () => { const t = document.querySelector('.tabs button:nth-child(2)'); t && t.click(); }, { cls: 'primary sm' }));
      return;
    }
    const a = r.api || {};
    mount(st, h('div.row.wrap', r.conectada ? pill('🟢 Conectada', 'ok') : pill('🔴 Sin conexión', 'bad'), r.pedidosOk === false ? pill('Clave de pedidos no válida', 'bad') : null,
      a.pago ? (a.pago.activo ? pill(a.pago.prueba ? 'Pago en MODO PRUEBA' : 'Pago online activo', a.pago.prueba ? 'warn' : 'ok') : pill('Pedidos por WhatsApp: pagan por Bizum o en efectivo', 'ok')) : null),
      h('p.small', h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.url)),
      r.error ? h('p.bad-t.small', r.error) : null, r.errorPedidos ? h('p.bad-t.small', r.errorPedidos) : null,
      r.conectada ? h('div.facts', h('div.fact', h('div.l', 'Publicados en la web'), h('div.v', String(a.productos))), h('div.fact', h('div.l', 'Pedidos de la web por traer'), h('div.v', String(a.pedidosPendientes))),
        h('div.fact', h('div.l', 'Última importación'), h('div.v', r.ultimaImportacion ? ago(r.ultimaImportacion) : 'Nunca')),
        h('div.fact', h('div.l', 'Seguridad (24 h)'), h('div.v', (a.seguridad24h || []).length ? a.seguridad24h.map(x => x.tipo + ': ' + x.n).join(' · ') : 'Sin incidencias'))) : null,
      r.ultimoError ? h('p.small.warn-t', 'Último aviso de la importación automática: ' + r.ultimoError) : null,
      h('div.row.wrap', btn('🛒 Traer pedidos web ahora', async ev => {
        const bt = ev.target.closest('button'); bt.disabled = true;
        try { const x = await api('tienda.traerPedidos', {}, { timeout: 120000 }); toast(x.creados ? x.pedidosWeb + ' pedido(s) web traídos (' + x.creados + ' línea(s))' : 'No hay pedidos web nuevos', x.creados ? 'ok' : '', 6000); if (x.avisos && x.avisos.length) toast('⚠️ ' + x.avisos.join(' · '), 'warn', 10000); pull(); }
        catch (e) { handleError(e); } bt.disabled = false;
      }, { cls: 'primary sm' }), btn('📦 Publicar seguimiento a clientes', async ev => {
        const bt = ev.target.closest('button'); bt.disabled = true;
        try { const x = await api('tienda.seguimientoEnviar', {}, { timeout: 120000 }); toast(x.enviados ? 'Seguimiento publicado: ' + x.enviados + ' pedido(s)' : 'No hay pedidos web que publicar', x.enviados ? 'ok' : '', 6000); }
        catch (e) { handleError(e); } bt.disabled = false;
      }, { cls: 'sm', title: 'Tus clientes ven en ' + (r.url || '') + '/seguimiento en qué punto está su pedido. Se publica solo al cambiar el estado.' }), btn('Abrir la tienda', () => window.open(r.url, '_blank', 'noopener'), { cls: 'sm' }), h('span.tiny.muted', 'Los pedidos pagados llegan solos cada 15 minutos. Tus clientes ven su pedido en /seguimiento (se actualiza al cambiar el estado).')));
  },

  conexion(b, redraw) {
    const t = T(), url = inp({ value: t.url || '', placeholder: 'https://celebridisenos.pages.dev', 'aria-label': 'Dirección de la tienda' });
    const status = h('div');
    const probar = async () => { mount(status, h('p.muted.small', 'Probando…')); try { const r = await api('tienda.estado', {}, { timeout: 40000 }); mount(status, r.configurada ? (r.conectada && r.pedidosOk ? h('p.ok-t', '✓ Conectada: las dos claves funcionan.') : h('p.bad-t', r.error || r.errorPedidos || 'No conecta.')) : h('p.warn-t', 'Falta la dirección o alguna clave.')); } catch (e) { mount(status, h('p.bad-t', e.message)); } };
    b.append(card('Dirección de la tienda', field('Dirección pública (https://…)', url, 'La que te da Cloudflare (…pages.dev) o tu dominio propio.'),
      h('div.row.wrap', btn('Guardar dirección', async () => { try { await guardar(Object.assign(T(), { url: url.value.trim() }), false); } catch (e) { handleError(e); } }, { cls: 'primary sm' }), btn('Probar conexión', probar, { cls: 'sm' })), status),
      card('Claves de conexión (solo administradoras)',
        h('p.small', 'Son dos claves distintas: una para ', h('b', 'PUBLICAR'), ' productos y otra para leer los ', h('b', 'PEDIDOS'), ' (con datos de clientes). Se guardan en el servidor de Google y en Cloudflare, nunca en la app, en GitHub ni en los registros.'),
        h('p.small.muted', 'Si alguna vez crees que una clave se ha visto, genera unas nuevas: las antiguas dejan de valer en cuanto las cambies en los dos sitios.'),
        btn('🔑 Generar claves nuevas', genKeys, { cls: 'primary sm' })));
    probar();
  },

  datos(b) {
    const t = T(), wa = t.whatsapp || {};
    const f = { lema: inp({ value: t.lema || '' }), color: inp({ type: 'color', value: t.color || '#0fb5d4', style: { width: '64px', padding: '2px' } }), wa: inp({ value: wa.numero || '', placeholder: '+34 600 000 000', inputmode: 'tel' }), waMsg: inp({ value: wa.mensaje || '' }),
      ig: inp({ value: t.instagram || '', placeholder: 'usuario (sin @)' }), tt: inp({ value: t.tiktok || '', placeholder: 'usuario (sin @)' }), mm: inp({ type: 'number', min: 0, max: 89, step: '1', value: t.margenMinimo === null || t.margenMinimo === undefined ? '' : Math.round(t.margenMinimo * 100), placeholder: 'sin límite' }),
      peso: inp({ type: 'number', min: 0, value: t.pesoEmbalajeG ?? 150 }) };
    let auto = t.auto !== false;
    const dw = t.descuentoWeb || { activo: true, pct: 4, combinable: false };
    let dwOn = dw.activo !== false, dwComb = dw.combinable === true;
    const dwPct = inp({ type: 'number', min: 0, max: 30, step: '0.5', value: dw.pct ?? 4, 'aria-label': 'Descuento web (%)' });
    b.append(card('Tienda', h('div.form', field('Frase de la portada', f.lema), field('Color de la tienda', f.color), field('Instagram', f.ig), field('TikTok', f.tt))),
      card('💬 WhatsApp Business', h('div.form', field('Número (con prefijo)', f.wa, 'Sin número no aparece el botón: nunca hay botones vacíos.'), field('Mensaje inicial', f.waMsg))),
      card('🛒 Descuento por comprar en la web', h('div.form',
        h('label.check', sw(dwOn, v => { dwOn = v; }), 'Activo: quien compra en la web paga menos que por WhatsApp/Wallapop'),
        field('Descuento (%)', dwPct, 'Lo calcula el servidor de la tienda (nadie puede cambiarlo desde el navegador). Antes de publicar se comprueba tu margen con costes reales; si falta el coste de un producto se marca «Coste pendiente».'),
        h('label.check', sw(dwComb, v => { dwComb = v; }), 'Sumarlo a campañas y descuentos por cantidad (apagado = se aplica solo el mejor, nunca los dos)'))),
      card('📉 Margen mínimo de la tienda', field('Margen mínimo (%)', f.mm, 'Lo decides tú. Si una promoción o un precio lo baja, se avisa (no se cambia nada solo). Vacío = solo se avisa de PÉRDIDAS.')),
      card('Pedidos', field('Peso de caja y relleno que se suma a cada producto (g)', f.peso, 'Para calcular el envío por peso.'), h('label.check', sw(auto, v => { auto = v; }), 'Traer solos los pedidos pagados (cada 15 minutos)')),
      btn('Guardar y publicar', async () => {
        try { await guardar(Object.assign(T(), { lema: f.lema.value, color: f.color.value, instagram: f.ig.value, tiktok: f.tt.value, whatsapp: { numero: f.wa.value, mensaje: f.waMsg.value }, margenMinimo: f.mm.value === '' ? null : n(f.mm.value) / 100, pesoEmbalajeG: n(f.peso.value), auto, descuentoWeb: { activo: dwOn, pct: n(dwPct.value), combinable: dwComb } })); }
        catch (e) { handleError(e); }
      }, { cls: 'primary' }));
  },

  // ✨ Campañas (CELEBRY DAY…) y promociones REALES: nada se activa solo; sin valor = PENDIENTE = sin descuento
  campanas(b) {
    const t = T(), cs = JSON.parse(JSON.stringify(t.campanas || [])), ps = JSON.parse(JSON.stringify(t.promociones || []));
    const pubs = S.t.productos.filter(p => web(p).publicado);
    const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const z = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); };
    const fromLocal = v => v ? new Date(v).toISOString() : '';
    const dt = (o, k) => inp({ type: 'datetime-local', value: toLocal(o[k]), onchange: e => { o[k] = fromLocal(e.target.value); redraw(); } });
    const EST = { inactiva: ['Inactiva', ''], programada: ['Programada', 'warn'], activa: ['🟢 ACTIVA ahora', 'ok'], finalizada: ['Finalizada', ''] };
    const fmt = iso => iso ? new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const analisis = {};
    const box = h('div.col', { style: { gap: 'var(--gap)' } });
    const alcance = o => {
      const modo = o.incluidos && o.incluidos.length ? 'solo' : o.excluidos && o.excluidos.length ? 'menos' : 'todos';
      const lista = modo === 'todos' ? null : h('div.web-alcance', pubs.map(p => { const arr = modo === 'solo' ? o.incluidos : o.excluidos; return h('label.check', h('input', { type: 'checkbox', checked: arr.includes(p.id), onchange: e => { const i = arr.indexOf(p.id); if (e.target.checked && i < 0) arr.push(p.id); if (!e.target.checked && i >= 0) arr.splice(i, 1); } }), p.nombre); }));
      return h('div.col', sel([{ v: 'todos', t: 'Todos los productos publicados' }, { v: 'solo', t: 'Solo estos productos…' }, { v: 'menos', t: 'Todos menos estos…' }], modo, { onchange: e => { o.incluidos = []; o.excluidos = []; if (e.target.value === 'solo') o.incluidos = pubs.slice(0, 1).map(p => p.id); if (e.target.value === 'menos') o.excluidos = pubs.slice(0, 1).map(p => p.id); redraw(); } }), lista);
    };
    const TIPOS = [{ v: 'cantidad_porcentaje', t: 'Comprando N o más → % de descuento' }, { v: 'cantidad_importe', t: 'Comprando N o más → € de descuento' }, { v: 'porcentaje', t: '% de descuento en productos' }, { v: 'importe', t: '€ de descuento por producto' }];
    const promoCard = pr => {
      const pct = pr.tipo === 'porcentaje' || pr.tipo === 'cantidad_porcentaje', qty = pr.tipo.startsWith('cantidad');
      const val = inp({ type: 'number', min: 0, step: pct ? '0.5' : '0.01', value: pr.valor === null || pr.valor === undefined ? '' : pct ? pr.valor : pr.valor / 100, placeholder: 'PENDIENTE', oninput: e => { pr.valor = e.target.value === '' ? null : pct ? n(e.target.value) : Math.round(n(e.target.value) * 100); } });
      const a = analisis[pr.id];
      return h('div.card.flat.col', h('div.row.wrap', inp({ value: pr.nombre, 'aria-label': 'Nombre de la promoción', oninput: e => { pr.nombre = e.target.value; } }), pr.valor === null || pr.valor === undefined || pr.valor === '' ? pill('Descuento PENDIENTE: no se aplica', 'warn') : pr.activa ? pill('Activa', 'ok') : pill('Desactivada', ''), btn('', () => { ps.splice(ps.indexOf(pr), 1); redraw(); }, { cls: 'ghost icon sm', icon: 'trash', title: 'Quitar promoción' })),
        h('div.form', field('Tipo', sel(TIPOS, pr.tipo, { onchange: e => { pr.tipo = e.target.value; pr.valor = null; redraw(); } })), field(pct ? 'Descuento (%)' : 'Descuento (€)', val, 'Vacío = pendiente: no hay descuento.'),
          qty ? field('Cantidad mínima', inp({ type: 'number', min: 2, max: 100, value: pr.minimo || 3, oninput: e => { pr.minimo = n(e.target.value); } }), 'Unidades en el mismo pedido.') : null,
          field('Límite por pedido (€)', inp({ type: 'number', min: 0, step: '0.01', value: pr.limiteCent ? pr.limiteCent / 100 : '', placeholder: 'sin límite', oninput: e => { pr.limiteCent = e.target.value === '' ? null : Math.round(n(e.target.value) * 100); } })),
          !pr.campanaId ? field('Desde', dt(pr, 'inicio')) : null, !pr.campanaId ? field('Hasta', dt(pr, 'fin')) : null),
        field('Productos', alcance(pr)),
        h('div.row.wrap', h('label.check', sw(!!pr.combinable, v => { pr.combinable = v; }), 'Se puede combinar con otra promoción'), h('label.check', sw(!!pr.activa, v => { pr.activa = v; redraw(); }), 'Activa (si tiene valor)')),
        a ? h('div.web-m.' + (a.pendiente ? 'sin_datos' : a.perdida ? 'perdida' : a.bajo || a.sinDatos ? 'bajo' : 'ok'), h('div.small', a.texto), (a.filas || []).length ? h('details', h('summary.tiny', 'Ver producto a producto'), h('div.list', a.filas.map(f => h('div.item', h('span.grow', f.nombre), h('span.small', eur(f.precio) + ' → ' + eur(f.conDescuento)), h('span.tiny', f.texto))))) : null) : null);
    };
    // v16.2: redibujar SIN que la pantalla salte ni se pierda dónde estabas escribiendo
    const redraw = () => {
      const se = document.scrollingElement, y = se ? se.scrollTop : 0, act = document.activeElement, campos = () => [...box.querySelectorAll('input, select, textarea')];
      const idx = act && box.contains(act) ? campos().indexOf(act) : -1, sel0 = idx >= 0 && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
      pintarCamp();
      if (se && se.scrollTop !== y) se.scrollTop = y;
      if (idx >= 0) { const c = campos()[idx]; if (c) { try { c.focus({ preventScroll: true }); if (sel0 && c.setSelectionRange && /^(text|search|url|tel|password|)$/.test(c.type || '')) c.setSelectionRange(sel0[0], sel0[1]); } catch (e) { } } }
    };
    const pintarCamp = () => {
      mount(box,
        card(null, h('p.small', 'Una ', h('b', 'campaña'), ' dice CUÁNDO y CÓMO se ve la web; una ', h('b', 'promoción'), ' dice el descuento. La web solo se pone «de campaña» si la campaña está ', h('b', 'ACTIVADA'), ', dentro de sus fechas y con una promoción ', h('b', 'activa y con valor'), '. Al terminar, todo vuelve solo a la normalidad.'),
          h('p.tiny.muted', 'Nada se activa solo. Celeby Nova puede proponer ideas, pero no publica ni activa promociones. Antes de publicar se comprueba el margen con tus costes reales' + (t.margenMinimo === null || t.margenMinimo === undefined ? ' (no has configurado margen mínimo: solo se avisa de pérdidas).' : ' y tu margen mínimo del ' + Math.round(t.margenMinimo * 100) + ' %.'))),
        ...cs.map(c => {
          const st = CL.campaignState(c), e = EST[st.estado] || EST.inactiva, a = c.aspecto = c.aspecto || {};
          const per = c.tipo === 'periodica', frec = [3, 4, 7].includes(Number(c.cadaDias)) ? String(c.cadaDias) : c.cadaDias ? 'otra' : '';
          return h('div.card.col.web-camp', h('div.row.wrap', h('span', { style: { fontSize: '26px' } }, a.emoji || '✨'), inp({ value: c.nombre, 'aria-label': 'Nombre de la campaña', style: { fontWeight: '800', maxWidth: '260px' }, oninput: ev => { c.nombre = ev.target.value; } }), pill(e[0], e[1]),
              st.estado === 'activa' ? h('span.small', 'hasta ' + fmt(st.hasta)) : st.estado === 'programada' ? h('span.small', 'empieza ' + fmt(st.proxima)) : null, h('span.grow'),
              btn('Duplicar', () => duplicarCamp(c), { cls: 'ghost sm', icon: 'copy', title: 'Crear otra campaña igual (apagada) para cambiarle el nombre y las fechas' }),
              btn('', async () => { if (await confirmDlg('Quitar campaña', 'Se quita «' + c.nombre + '» y sus promociones (al publicar).', 'Quitar', true)) { cs.splice(cs.indexOf(c), 1); for (let i = ps.length - 1; i >= 0; i--) if (ps[i].campanaId === c.id) ps.splice(i, 1); redraw(); } }, { cls: 'ghost icon sm', icon: 'trash', title: 'Quitar campaña' })),
            field('Descripción', inp({ value: c.descripcion || '', oninput: ev => { c.descripcion = ev.target.value; } })),
            h('div.row.wrap', h('button.camp-sw' + (c.estado === 'lista' ? '.on' : ''), { type: 'button', role: 'switch', 'aria-checked': c.estado === 'lista' ? 'true' : 'false', 'aria-label': 'Campaña ' + c.nombre, onclick: () => alternar(c) }, h('i'), h('b', c.estado === 'lista' ? 'ACTIVADA' : 'DESACTIVADA')),
              h('span.small.muted', c.estado === 'lista' ? (st.estado === 'activa' ? 'En la web ahora mismo.' : st.estado === 'programada' ? 'Encendida: empezará sola en su fecha.' : st.estado === 'finalizada' ? 'Encendida, pero sus fechas ya pasaron.' : 'Encendida.') : 'Guardada. No se ve en la web hasta que la actives.'),
              h('span.small', '🧩 ' + afecta(c))),
            h('div.row.wrap', h('div.seg.sm', [['manual', 'Manual'], ['periodica', 'Periódica']].map(([k, tx]) => h('button' + (c.tipo === k ? '.on' : ''), { type: 'button', onclick: () => { c.tipo = k; redraw(); } }, tx)))),
            per ? h('div.form', field('Primera vez (inicio)', dt(c, 'inicio')), field('Frecuencia', sel([{ v: '', t: '— elige —' }, { v: '3', t: 'Cada 3 días' }, { v: '4', t: 'Cada 4 días' }, { v: '7', t: 'Una vez a la semana' }, { v: 'otra', t: 'Personalizada…' }], frec, { onchange: ev => { c.cadaDias = ev.target.value === 'otra' ? (c.cadaDias || 10) : ev.target.value; redraw(); } })),
                frec === 'otra' ? field('Cada cuántos días', inp({ type: 'number', min: 1, max: 365, value: c.cadaDias, oninput: ev => { c.cadaDias = n(ev.target.value); } })) : null,
                field('Duración (horas)', inp({ type: 'number', min: 1, value: c.duracionHoras || '', placeholder: 'p. ej. 24', oninput: ev => { c.duracionHoras = n(ev.target.value); } })), field('Repetir hasta (opcional)', dt(c, 'repetirHasta')))
              : h('div.form', field('Inicio', dt(c, 'inicio')), field('Fin', dt(c, 'fin'))),
            field('Productos de la campaña', alcance(c)),
            h('details', h('summary.small', '🎨 Aspecto de la web durante la campaña'), h('div.form', field('Icono', inp({ value: a.emoji || '✨', style: { width: '70px' }, oninput: ev => { a.emoji = ev.target.value; } })), field('Color 1', inp({ type: 'color', value: a.color || '#ff3d7f', oninput: ev => { a.color = ev.target.value; } })), field('Color 2', inp({ type: 'color', value: a.color2 || '#7b2cff', oninput: ev => { a.color2 = ev.target.value; } })),
              field('Título grande', inp({ value: a.titulo || '', placeholder: c.nombre, oninput: ev => { a.titulo = ev.target.value; } })), field('Mensaje', inp({ value: a.mensaje || '', oninput: ev => { a.mensaje = ev.target.value; } }))), h('label.check', sw(a.efectos !== false, v => { a.efectos = v; }), 'Animaciones suaves (se desactivan solas si el móvil pide «reducir movimiento»)')),
            h('b.small', 'Promociones de esta campaña'), ...ps.filter(pr => pr.campanaId === c.id).map(promoCard),
            btn('Añadir promoción', () => { ps.push({ id: c.id + '-' + Math.random().toString(36).slice(2, 7), campanaId: c.id, nombre: 'Nueva promoción', tipo: 'cantidad_porcentaje', valor: null, minimo: 3, limiteCent: null, incluidos: [], excluidos: [], combinable: false, activa: false }); redraw(); }, { cls: 'sm ghost', icon: 'plus' }));
        }),
        h('div.row.wrap', btn('Nueva campaña', () => { const id = 'camp' + Math.random().toString(36).slice(2, 6); cs.push({ id, nombre: 'Nueva campaña', descripcion: '', estado: 'borrador', tipo: 'manual', inicio: '', fin: '', cadaDias: '', duracionHoras: '', repetirHasta: '', incluidos: [], excluidos: [], aspecto: { color: '#ff3d7f', color2: '#7b2cff', emoji: '✨', titulo: '', mensaje: '', efectos: true } }); redraw(); }, { cls: 'sm', icon: 'plus' }),
          btn('Promoción sin campaña', () => { ps.push({ id: 'promo' + Math.random().toString(36).slice(2, 6), campanaId: '', nombre: 'Promoción', tipo: 'cantidad_porcentaje', valor: null, minimo: 3, limiteCent: null, incluidos: [], excluidos: [], combinable: false, inicio: '', fin: '', activa: false }); redraw(); }, { cls: 'sm ghost', icon: 'plus' })),
        ps.some(pr => !pr.campanaId) ? h('div.card.col', h('h3', 'Promociones sin campaña (con sus propias fechas)'), ...ps.filter(pr => !pr.campanaId).map(promoCard)) : null,
        h('div.row.wrap', btn('📊 Analizar el margen', async () => { try { const r = await api('tienda.promosAnalizar', { campanas: cs, promociones: ps }, { timeout: 60000 }); r.analisis.forEach(x => { analisis[x.id] = x; }); redraw(); } catch (e) { handleError(e); } }, { cls: 'sm' }),
          btn('Guardar y publicar', async ev => publicarCamp(ev, false), { cls: 'primary' })));
    };
    // v16.2 · ACTIVAR / DESACTIVAR de un toque: cambia el estado y lo publica en la tienda en el momento (no hay que ir a otra pantalla).
    //  · Activar una campaña manual sin fechas válidas la pone «desde ahora y hasta que la apagues» (como mucho 30 días).
    //  · Sus promociones con descuento puesto se encienden con ella; sin descuento puesto no hay rebaja (nada se inventa).
    const afecta = c => { const inc = c.incluidos || [], exc = c.excluidos || [], nn = pubs.filter(p => (!inc.length || inc.includes(p.id)) && !exc.includes(p.id)).length; return nn === pubs.length ? 'Afecta a los ' + nn + ' productos publicados' : 'Afecta a ' + nn + ' de ' + pubs.length + ' productos publicados'; };
    async function alternar(c) {
      const antes = JSON.stringify([cs, ps]);
      if (c.estado === 'lista') c.estado = 'pausada';
      else {
        if (c.tipo === 'periodica') { if (!c.inicio || !(n(c.cadaDias) > 0) || !(n(c.duracionHoras) > 0)) return toast('Para activarla pon antes: primera vez, frecuencia y duración (está justo debajo).', 'warn', 7000); }
        else { const ini = Date.parse(c.inicio), fin = Date.parse(c.fin), ya = Date.now(); if (!isFinite(ini) || !isFinite(fin) || fin <= ini || fin <= ya) { c.inicio = new Date(ya).toISOString(); c.fin = new Date(ya + 30 * 864e5).toISOString(); toast('Sin fechas válidas: queda activada desde AHORA hasta que la apagues (como mucho 30 días). Puedes cambiar las fechas debajo.', '', 8000); } }
        c.estado = 'lista';
        const suyas = ps.filter(pr => pr.campanaId === c.id), conValor = suyas.filter(pr => pr.valor !== null && pr.valor !== undefined && pr.valor !== '');
        conValor.forEach(pr => { pr.activa = true; });
        if (!conValor.length) toast('La campaña se enciende, pero ninguna de sus promociones tiene el descuento puesto: no habrá rebaja hasta que lo pongas.', 'warn', 9000);
      }
      redraw();
      const ok = await publicarCamp(null, false);
      if (!ok) { const o = JSON.parse(antes); cs.length = 0; o[0].forEach(x => cs.push(x)); ps.length = 0; o[1].forEach(x => ps.push(x)); redraw(); } // no se publicó: se deja como estaba
    }
    function duplicarCamp(c) {
      const id = 'camp' + Math.random().toString(36).slice(2, 6), copia = JSON.parse(JSON.stringify(c));
      Object.assign(copia, { id, nombre: (c.nombre + ' (copia)').substring(0, 40), estado: 'borrador' });
      cs.splice(cs.indexOf(c) + 1, 0, copia);
      ps.filter(pr => pr.campanaId === c.id).forEach(pr => ps.push(Object.assign(JSON.parse(JSON.stringify(pr)), { id: id + '-' + Math.random().toString(36).slice(2, 7), campanaId: id, activa: false })));
      redraw(); toast('Campaña duplicada (apagada). Cámbiale el nombre y actívala cuando quieras.', 'ok', 6000);
    }
    const publicarCamp = async (ev, confirmar) => {
      try {
        const r = await api('tienda.campanasPublicar', { campanas: cs, promociones: ps, confirmar }, { timeout: 90000 });
        S.cfg.tienda = r.tienda; emit();
        toast('Campañas publicadas' + (r.activas.length ? ' · ' + r.activas.length + ' promoción(es) en marcha ahora' : ' · ninguna promoción en marcha ahora'), 'ok', 7000);
        redraw();
        return true;
      } catch (e) {
        if (e.code === 'MARGEN') { (e.extra && e.extra.analisis || []).forEach(x => { analisis[x.id] = x; }); redraw(); if (await confirmDlg('Revisa el margen antes de publicar', e.message, 'Publicar así (lo decido yo)', true)) return publicarCamp(null, true); }
        else handleError(e);
        return false;
      }
    };
    b.append(box); redraw();
  },

  envios(b) {
    const t = T(), E = t.envios || { paises: ['ES'], opciones: [] };
    const paises = new Set(E.paises || ['ES']);
    const gratis = inp({ type: 'number', min: 0, step: '0.01', value: E.gratisDesde || '' , placeholder: '0 = nunca' }), gratisOp = sel([{ v: '', t: '—' }].concat(E.opciones.map(o => ({ v: o.id, t: o.nombre }))), E.gratisOpcion || '');
    const ops = E.opciones.map(o => JSON.parse(JSON.stringify(o)));
    const opBox = h('div.col');
    const drawOps = () => mount(opBox, ops.map((o, i) => {
      const tramos = h('div.col');
      const drawT = () => mount(tramos, o.tramos.map((tr, j) => h('div.row', field(j ? null : 'Hasta (g)', inp({ type: 'number', min: 1, value: tr.hastaG, oninput: e => { tr.hastaG = n(e.target.value); } })), field(j ? null : 'Precio (€, IVA incl.)', inp({ type: 'number', min: 0, step: '0.01', value: tr.precio, oninput: e => { tr.precio = n(e.target.value); } })),
        btn('', () => { o.tramos.splice(j, 1); drawT(); }, { cls: 'ghost icon sm', icon: 'trash', title: 'Quitar tramo' }))), btn('Añadir tramo de peso', () => { o.tramos.push({ hastaG: (o.tramos.at(-1) || { hastaG: 0 }).hastaG + 1000, precio: 0 }); drawT(); }, { cls: 'sm ghost', icon: 'plus' }));
      drawT();
      const conf = h('input', { type: 'checkbox', checked: !!o.confirmado, onchange: e => { o.confirmado = e.target.checked; } });
      return card(['Opción 1 · Económico', 'Opción 2 · Estándar', 'Opción 3 · Rápido'][i],
        h('div.form', field('Nombre en la web', inp({ value: o.nombre, oninput: e => { o.nombre = e.target.value; } })), field('Transportista', inp({ value: o.transportista, oninput: e => { o.transportista = e.target.value; } })),
          field('Descripción', inp({ value: o.descripcion, oninput: e => { o.descripcion = e.target.value; } })), field('Plazo', inp({ value: o.plazo, oninput: e => { o.plazo = e.target.value; } })),
          field('Solo a estos países (vacío = todos)', inp({ value: (o.paises || []).join(', '), placeholder: 'ES', oninput: e => { o.paises = e.target.value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean); } }))),
        o.confirmado ? pill('✅ CONFIRMADO: se ofrece en la web', 'ok') : pill('🟠 POR CONFIRMAR: no se ofrece en la web', 'warn'), tramos, o.referencia ? h('p.tiny.muted', '📎 Referencia (no es tu precio): ' + o.referencia) : null,
        h('label.check', conf, h('b', 'Confirmo que estos son MIS precios reales'), ' (sin esto, esta opción no aparece en la web)'));
    }));
    drawOps();
    // v16.2 · ⚡ Pedido urgente: el cliente paga un recargo y tú lo preparas antes. Llega marcado URGENTE.
    const U = Object.assign({ activo: false, precio: null, dias: 2 }, t.urgente || {});
    let urgOn = !!U.activo;
    const urgPrecio = inp({ type: 'number', min: 0, step: '0.5', value: U.precio ?? '', placeholder: 'Ej.: 5', 'aria-label': 'Recargo por urgencia (€)' }), urgDias = inp({ type: 'number', min: 0, max: 60, value: U.dias ?? 2, 'aria-label': 'Días máximos del pedido urgente' });
    const urgCard = card('⚡ Pedido urgente',
      h('label.check', sw(urgOn, v => { urgOn = v; }), h('b', 'Ofrecer «Lo necesito urgente» al pagar')),
      h('div.form', field('Recargo que paga el cliente (€)', urgPrecio, 'Sin precio no se ofrece: el programa no inventa el recargo.'), field('Lo preparas en (días, como máximo)', urgDias, 'Es lo que verá el cliente. 0 = «lo preparamos el primero».')),
      h('p.tiny.muted', 'El pedido llega con prioridad URGENTE, un aviso aparte y el recargo apuntado como cobrado. El plazo normal de cada producto se pone en su pestaña «Tienda web» («Días de fabricación»).'),
      btn('Guardar y publicar', async () => { try { if (urgOn && !(n(urgPrecio.value) > 0)) return toast('Pon el recargo en euros para poder ofrecerlo.', 'warn'); await guardar(Object.assign(T(), { urgente: { activo: urgOn, precio: urgPrecio.value === '' ? null : n(urgPrecio.value), dias: n(urgDias.value) } })); } catch (e) { handleError(e); } }, { cls: 'primary' }));
    b.append(card('Dónde envías', h('div.row.wrap', PAISES.map(([c, t]) => h('label.check', h('input', { type: 'checkbox', checked: paises.has(c), onchange: e => { e.target.checked ? paises.add(c) : paises.delete(c); } }), t))),
      h('div.form', field('Envío gratis desde (€)', gratis), field('En la opción', gratisOp)), h('p.tiny.muted', 'El cliente ve el precio del envío ANTES de pagar. Los precios de referencia (Correos 2026, InPost en Packlink) son orientativos: pon los tuyos y confírmalos.')),
      opBox, btn('Guardar y publicar', async () => { try { await guardar(Object.assign(T(), { envios: { paises: [...paises], gratisDesde: n(gratis.value), gratisOpcion: gratisOp.value, opciones: ops } })); } catch (e) { handleError(e); } }, { cls: 'primary' }));
    b.append(urgCard); // (debajo de los envíos)
    // v17.1 · PayPal: sale en la web como forma de pago. Se acuerda por WhatsApp al confirmar, igual que Bizum (la web no cobra sola).
    let ppOn = !!(t.pagos && t.pagos.paypal);
    b.append(card('💙 Cómo te pagan en la web', h('p.small', 'Bizum y efectivo están siempre: el cliente hace el pedido, lo confirmáis por WhatsApp y entonces paga. No da datos de tarjeta en ningún momento, y así lo dice la web («Compra tranquila»).'),
      h('label.check', sw(ppOn, v => { ppOn = v; }), h('b', 'Aceptar también PayPal')),
      h('p.tiny.muted', 'Actívalo solo si tienes cuenta de PayPal para cobrar. La web dirá «También puedes pagar con PayPal» y el pedido te llegará marcado como PayPal. El cobro lo pides tú desde tu PayPal al confirmar el pedido.'),
      btn('Guardar y publicar', async () => { try { await guardar(Object.assign(T(), { pagos: { paypal: ppOn } })); } catch (e) { handleError(e); } }, { cls: 'primary pp-guardar' })));
  },

  textos(b) {
    const t = T(), q = t.quienes || { puntos: [] }, L = t.legal || {};
    const tit = inp({ value: q.titulo || '' }), tx = area({ rows: 6, value: q.texto || '' });
    const puntos = (q.puntos || []).map(x => Object.assign({}, x)), pBox = h('div.col');
    const drawP = () => mount(pBox, puntos.map((x, i) => h('div.row', inp({ value: x.icono, style: { width: '56px' }, 'aria-label': 'Icono', oninput: e => { x.icono = e.target.value; } }), inp({ value: x.titulo, placeholder: 'Título', oninput: e => { x.titulo = e.target.value; } }), inp({ value: x.texto, placeholder: 'Texto', oninput: e => { x.texto = e.target.value; } }), btn('', () => { puntos.splice(i, 1); drawP(); }, { cls: 'ghost icon sm', icon: 'trash' }))), puntos.length < 9 ? btn('Añadir punto', () => { puntos.push({ icono: '⭐', titulo: '', texto: '' }); drawP(); }, { cls: 'sm ghost', icon: 'plus' }) : null);
    drawP();
    const lf = {}; [['titular', 'Titular (nombre o razón social)'], ['nif', 'NIF'], ['direccion', 'Domicilio'], ['email', 'Email de contacto'], ['telefono', 'Teléfono (opcional)'], ['registro', 'Datos registrales (si es sociedad)'], ['devolucionesDias', 'Días para devolver (mínimo 14)']].forEach(([k, l]) => { lf[k] = [l, inp({ value: L[k] || (k === 'devolucionesDias' ? '14' : '') })]; });
    const falta = ['titular', 'nif', 'direccion', 'email'].filter(k => !L[k]);
    b.append(card('Quiénes somos', field('Título', tit), field('Texto', tx), h('b.small', 'Puntos fuertes'), pBox),
      card('Datos legales de la tienda', falta.length ? h('p.warn-t.small', '🟠 Faltan: ' + falta.join(', ') + '. La web los muestra como «Pendiente de completar» (no se inventan).') : h('p.ok-t.small', '✓ Datos legales completos.'),
        h('div.form', Object.values(lf).map(([l, i]) => field(l, i))), h('p.tiny.muted', 'Con estos datos se rellenan el aviso legal, la privacidad, las cookies y las condiciones de venta. Revísalos con tu gestoría antes de vender.')),
      btn('Guardar y publicar', async () => {
        const legal = {}; Object.keys(lf).forEach(k => { legal[k] = lf[k][1].value; });
        try { await guardar(Object.assign(T(), { quienes: { titulo: tit.value, texto: tx.value, puntos }, legal })); } catch (e) { handleError(e); }
      }, { cls: 'primary' }));
  },

  ideas(b) {
    if (!can('productos.costes')) { b.append(card(null, h('p.muted', 'Las ideas usan costes y márgenes: necesitas el permiso de ver costes.'))); return; }
    const r = CL.webOpportunities(S.t, S.cfg, S.hoy);
    b.append(card('💡 Ideas para vender más (con tus datos reales)',
      r.aviso ? h('p.warn-t.small', r.aviso) : null,
      r.items.length ? h('div.list.boxed', r.items.map(x => h('div.item', { onclick: () => go(x.enlace) }, h('span', x.nivel === 'bad' ? '🔴' : x.nivel === 'warn' ? '🟠' : '💡'), h('div.grow', h('div', x.texto), h('div.tiny.muted', 'Origen: ' + x.origen))))) : h('p.muted.small', r.datosSuficientes ? 'Nada urgente: tus ofertas tienen margen y tus productos más vendidos están publicados.' : 'Aún no hay ideas: hacen falta más pedidos con coste.'),
      h('p.tiny.muted', 'Nunca se inventan ventas, clientes, márgenes ni conversiones. Para textos de campaña, pregunta a Celeby Nova: «¿Qué debería promocionar en la tienda web?».'),
      btn('Preguntar a Celeby Nova', () => go('ia'), { cls: 'sm' })));
  }
};

// Claves: se generan en este dispositivo, se enseñan UNA vez para pegarlas en Cloudflare y se guardan en el servidor
function genKeys() {
  const mk = () => { const b = new Uint8Array(36); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const kp = mk(), kd = mk(), sal = mk();
  const row = (name, v) => h('div.card.flat.col', h('b', name), h('code.small', { style: { wordBreak: 'break-all' } }, v), btn('Copiar', () => { copyText(v); toast('Copiada', 'ok'); }, { cls: 'sm' }));
  modal('Claves nuevas de la tienda', h('div.col',
    h('p.small', '1. En Cloudflare: ', h('b', 'Workers y Pages → tu tienda → Configuración → Variables y secretos → Añadir'), '. Crea DOS variables de tipo ', h('b', 'Secreto'), ':'),
    row('CLAVE_PUBLICAR', kp), row('CLAVE_PEDIDOS', kd), row('SAL_REGISTRO (solo en Cloudflare)', sal),
    h('p.tiny.muted', 'SAL_REGISTRO sirve para que el registro de seguridad de la tienda no guarde las IP en claro. El programa no la necesita y no la guarda.'),
    h('p.small', '2. Vuelve aquí y pulsa «Guardar en el programa». 3. Pulsa «Probar conexión».'),
    h('p.small.warn-t', 'Estas claves no se vuelven a mostrar. No las envíes por chat ni las guardes en documentos.')),
  close => [btn('Cancelar', close), btn('Guardar en el programa', async () => {
    try { await api('tienda.claves', { clavePublicar: kp, clavePedidos: kd }); close(); toast('Claves guardadas en el servidor', 'ok'); } catch (e) { handleError(e); }
  }, { cls: 'primary' })], { sticky: true });
}

// ---------- Pestaña «Tienda web» del producto ----------
const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function webPhoto(blob, max = 1200) {
  const bmp = await createImageBitmap(blob), s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let out = await new Promise(r => c.toBlob(r, 'image/webp', 0.85)), mime = 'image/webp';
  if (!out || out.type !== 'image/webp') { out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); mime = 'image/jpeg'; }
  return { mime, datos: await toB64(out), ancho: c.width, alto: c.height };
}
export function productoWeb(el, p) {
  const w = web(p), t = T(), gest = can('tienda.gestionar');
  const head = h('div.row.wrap', w.publicado ? pill('🟢 En la tienda', 'ok') : pill('No publicado', ''), w.publicado && p.actualizado > w.publicadoEn ? pill('Hay cambios sin publicar', 'warn') : null,
    w.publicado && w.url ? h('a.small', { href: w.url, target: '_blank', rel: 'noopener' }, 'Ver en la tienda ↗') : null, w.publicadoEn ? h('span.tiny.muted', 'Publicado ' + fdt(w.publicadoEn) + (w.publicadoPor ? ' por ' + w.publicadoPor : '')) : null);
  if (!gest) { mount(el, head, h('p.muted.small', 'Para publicar o cambiar este producto en la tienda hace falta el permiso «Gestionar la tienda web».')); return; }
  if (!t.url) { mount(el, head, empty('store', 'La tienda aún no está conectada', 'Configúrala en Tienda web → Conexión.', btn('Ir a Tienda web', () => go('tienda'), { cls: 'primary' }))); return; }
  const st = (() => { try { return CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos }, S.cfg.pedidos).of(p.nombre); } catch (e) { return null; } })();
  const f = {
    precio: inp({ type: 'number', min: 0, step: '0.01', value: w.precio ?? p.precio ?? '' }),
    negMin: inp({ type: 'number', min: 0, step: '0.01', value: w.negMin ?? '', placeholder: 'Vacío = precio fijo' }),
    cat: inp({ value: w.categoria ?? p.categoria ?? '' }), desc: area({ rows: 5, value: w.descripcion ?? p.descripcion ?? '' }),
    colores: inp({ value: ((w.variantes || []).find(v => /^color$/i.test(v.nombre)) || { valores: [] }).valores.join(', ') || (String(p.color || '').includes(',') ? p.color : ''), placeholder: 'Blanco, Negro, Rosa (vacío = sin elegir color)' }),
    peso: inp({ type: 'number', min: 0, value: w.pesoG || (n(p.pesoG) ? n(p.pesoG) + n(t.pesoEmbalajeG ?? 150) : '') }),
    stock: inp({ type: 'number', min: 0, value: w.stock ?? (st && st.disponible !== undefined ? Math.max(0, st.disponible) : 0) }), plazo: inp({ type: 'number', min: 0, max: 60, value: w.plazoDias ?? 3 })
  };
  let modo = w.stockModo || 'pedido', destacado = !!w.destacado, novedad = !!w.novedad, personalizable = !!w.personalizable;
  const car = (w.caracteristicas && w.caracteristicas.length ? w.caracteristicas : [p.material ? ['Material', p.material] : null, p.tamano ? ['Medidas', p.tamano] : null].filter(Boolean)).map(x => x.slice());
  const carBox = h('div.col');
  const drawCar = () => mount(carBox, car.map((x, i) => h('div.row', inp({ value: x[0], placeholder: 'Característica', oninput: e => { x[0] = e.target.value; } }), inp({ value: x[1], placeholder: 'Valor', oninput: e => { x[1] = e.target.value; } }), btn('', () => { car.splice(i, 1); drawCar(); }, { cls: 'ghost icon sm', icon: 'trash' }))), btn('Añadir característica', () => { car.push(['', '']); drawCar(); }, { cls: 'sm ghost', icon: 'plus' }));
  drawCar();
  // fotos del producto (las tuyas): eliges cuáles y en qué orden; la primera es la principal
  const fotos = filesOf('productos', p.id).filter(a => a.tipo === 'foto');
  let elegidas = (w.fotos || []).filter(id => fotos.some(a => a.id === id));
  if (!elegidas.length) elegidas = fotos.slice().sort((a, b) => (b.id === p.fotoId) - (a.id === p.fotoId)).map(a => a.id).slice(0, 8);
  const fotosBox = h('div');
  const drawF = () => mount(fotosBox, fotos.length ? h('div.web-fotos', fotos.map(a => { const i = elegidas.indexOf(a.id); return h('button.web-foto' + (i >= 0 ? '.on' : ''), { type: 'button', title: a.nombre, onclick: () => { i >= 0 ? elegidas.splice(i, 1) : elegidas.push(a.id); drawF(); } }, (() => { const im = h('img', { alt: a.nombre, src: a.miniatura || '' }); previewUrl(a).then(u => { if (u) im.src = u; }).catch(() => { }); return im; })(), i >= 0 ? h('span.n', i === 0 ? '★ 1' : String(i + 1)) : null); })) : h('p.warn-t.small', 'Este producto no tiene fotos. Súbelas en la pestaña de fotos: la tienda solo usa TUS fotos.'));
  drawF();
  // v12.8 · vista 3D en la web: eliges el STL real del producto y se prepara una versión ligera (nada inventado)
  const STL_OK = ['stl', '3mf', 'obj'], extN = x => String(x || '').split('.').pop().toLowerCase();
  const modelos = filesOf('productos', p.id).filter(a => a.tipo === 'stl' && STL_OK.includes(extN(a.nombre)) && !(Number(a.tamano) > 60 * 1048576));
  let sel3d = w.modelo && modelos.some(a => a.id === w.modelo.archivoId) ? w.modelo.archivoId : '', listo = null, vista3d = null;
  const box3d = h('div.col');
  const preparar3d = async () => {
    const a = modelos.find(x => x.id === sel3d); if (!a) return null;
    const pr = await prepararModelo(await (await fetchFile(a)).arrayBuffer(), a.nombre);
    listo = { archivoId: a.id, nombre: a.nombre, prep: pr }; return listo;
  };
  const draw3d = () => {
    if (vista3d) { try { vista3d.destroy(); } catch (e) { } vista3d = null; }
    const estado = w.modelo ? h('p.small', '🧊 Ahora en la tienda: ', h('b', w.modelo.nombre || 'modelo'), ' · ' + (w.modelo.tris || '?').toLocaleString('es-ES') + ' triángulos · ' + (w.modelo.kb || '?') + ' KB') : h('p.tiny.muted', 'Ahora la ficha no tiene vista 3D (solo fotos).');
    const selEl = sel([{ v: '', t: 'Sin vista 3D en la web' }].concat(modelos.map(a => ({ v: a.id, t: a.nombre }))), sel3d);
    selEl.addEventListener('change', () => { sel3d = selEl.value; listo = null; draw3d(); });
    const out = h('div.col');
    if (sel3d) {
      out.append(btn(listo ? 'Preparar de nuevo' : 'Preparar y previsualizar', async ev => {
        const b = ev.target.closest('button'); b.disabled = true; toast('Preparando el modelo ligero…');
        try {
          const r = await preparar3d(); if (!r) return; const pr = r.prep;
          const c = h('canvas.stl-view'); mount(out, h('p.small', '✅ Listo: ', h('b', pr.tris.toLocaleString('es-ES') + ' triángulos'), pr.original > pr.tris ? ' (de ' + Math.round(pr.original).toLocaleString('es-ES') + ' del original: se simplifica el detalle fino)' : '', ' · ', pr.kb + ' KB · ' + pr.dims.map(x => x.toFixed(1)).join(' × ') + ' mm'), c, h('p.tiny.muted', 'Así lo verá el cliente: una vista orientativa de la forma. Color y acabado reales, en tus fotos. Se publica al pulsar «Publicar / Actualizar en la tienda».'));
          vista3d = viewer(c, leerCDM(pr.bytes).pos);
        } catch (e) { handleError(e); } finally { b.disabled = false; }
      }, { cls: 'sm', icon: 'cube' }));
      if (!listo && w.modelo && w.modelo.archivoId === sel3d) out.append(h('p.tiny.muted', 'Este modelo ya está publicado. Solo hace falta prepararlo de nuevo si has cambiado el archivo STL.'));
    }
    mount(box3d, estado, modelos.length ? field('Modelo 3D que verá el cliente', selEl) : h('p.tiny.muted', 'Para ofrecer vista 3D sube el STL (o 3MF) del producto en la pestaña «Fotos, vídeos y STL».'), out);
  };
  draw3d();
  // margen en vivo
  const mBox = h('div.web-margen');
  let mt = null;
  const margen = () => { clearTimeout(mt); mt = setTimeout(async () => {
    if (!can('productos.costes')) { mount(mBox, h('p.tiny.muted', 'El margen lo comprueba el servidor al publicar.')); return; }
    try {
      const r = await api('tienda.margen', { productoId: p.id, precio: n(f.precio.value), minimo: n(f.negMin.value) > 0 ? n(f.negMin.value) : undefined }, { quiet: true });
      const line = (t, m) => m ? h('div.web-m.' + m.estado, h('b', t + ' ' + eur(m.precio)), h('div.small', m.texto), m.coste !== undefined ? h('div.tiny.muted', 'Coste: fabricación ' + eur(m.fabricacion) + ' + embalaje ' + eur(m.embalaje) + ' + comisión del pago ' + eur(m.comision) + ' = ' + eur(m.coste)) : null,
        m.precioMinimo ? h('div.tiny.muted', (m.minimo === null ? 'Precio mínimo sin perder dinero: ' : 'Precio mínimo para mantener tu margen del ' + Math.round(m.minimo * 100) + ' %: ') + eur(m.precioMinimo)) : null, (m.avisos || []).map(a => h('div.tiny.warn-t', a))) : null;
      mount(mBox, line('Precio en la web', r.normal), r.minimo ? line('Si negocian y llegan al mínimo', r.minimo) : null);
    } catch (e) { mount(mBox, h('p.tiny.bad-t', e.message)); }
  }, 350); };
  f.precio.addEventListener('input', margen); f.negMin.addEventListener('input', margen); margen();
  const modoSel = h('div.seg.sm', [['pedido', 'Bajo pedido'], ['contado', 'Stock contado']].map(([k, tx]) => h('button' + (modo === k ? '.on' : ''), { type: 'button', onclick: ev => { modo = k; ev.target.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === ev.target)); stockRow.hidden = modo !== 'contado'; } }, tx)));
  const stockRow = field('Unidades a la venta en la web', f.stock, st ? 'Disponible ahora en el programa: ' + st.disponible : ''); stockRow.hidden = modo !== 'contado';
  const datos = () => ({ precio: n(f.precio.value), negMin: f.negMin.value === '' ? null : n(f.negMin.value), personalizable, categoria: f.cat.value, descripcion: f.desc.value,
    caracteristicas: car.filter(x => x[0] && x[1]), variantes: f.colores.value.trim() ? [{ nombre: 'Color', valores: f.colores.value.split(',').map(x => x.trim()).filter(Boolean) }] : [],
    stockModo: modo, stock: n(f.stock.value), pesoG: n(f.peso.value), plazoDias: n(f.plazo.value), destacado, novedad });
  const publicar = async (ev, confirmar) => {
    const bt = ev && ev.target && ev.target.closest('button'); if (bt) bt.disabled = true;
    try {
      if (!elegidas.length) throw new Error('Elige al menos una foto (la primera será la principal).');
      toast('Preparando las fotos para la web…');
      const ph = [];
      for (const id of elegidas.slice(0, 10)) { const a = fotos.find(x => x.id === id); ph.push(await webPhoto(await fetchFile(a))); }
      // vista 3D: sin elegir = se quita la que hubiera; la misma de antes y sin cambios = se conserva; si no, se prepara y se envía
      let modelo, modeloInfo;
      if (!sel3d) { if (w.modelo) modelo = null; }
      else if (!(w.modelo && w.modelo.archivoId === sel3d) || listo) {
        if (!listo || listo.archivoId !== sel3d) { toast('Preparando el modelo 3D…'); await preparar3d(); }
        modelo = { datos: listo.prep.datos }; modeloInfo = { archivoId: listo.archivoId, nombre: listo.nombre, tris: listo.prep.tris, kb: listo.prep.kb };
      }
      const r = await api('tienda.publicar', Object.assign({ productoId: p.id, web: datos(), fotos: ph, archivos: elegidas.slice(0, 10), confirmarMargen: !!confirmar }, modelo !== undefined ? { modelo, modeloInfo } : {}), { timeout: 180000 });
      toast('Publicado en la tienda: ' + (r.web.url || ''), 'ok', 7000); (r.avisos || []).forEach(a => toast(a, 'warn', 12000)); pull();
    } catch (e) {
      if (e.code === 'MARGEN') { if (await confirmDlg('Revisa el margen', e.message, 'Publicar igualmente', e.extra && e.extra.margen && e.extra.margen.estado === 'perdida')) return publicar(null, true); }
      else handleError(e);
    } finally { if (bt) bt.disabled = false; }
  };
  // v16.2 · PUBLICAR arriba, grande. Republicar = el mismo botón: reutiliza fotos, descripción, precio, categoría y todo lo guardado.
  const ew = estadoWeb(p);
  const retirar = async () => { if (!await confirmDlg('Retirar de la tienda', 'Deja de verse y venderse en la web. La publicación NO se pierde: se guarda entera y se puede republicar con un botón.', 'Retirar', true)) return; try { await api('tienda.retirar', { productoId: p.id }); toast('Retirado de la tienda. Puedes republicarlo cuando quieras.', 'ok'); pull(); } catch (e) { handleError(e); } };
  const arriba = h('div.web-top' + (ew.publicado ? '.on' : ''),
    h('div.grow', h('b', ew.agotado ? '🔴 AGOTADO en la web' : ew.publicado ? '🟢 Publicado en la web' : ew.antes ? '⚪ Retirado de la web' : '⚪ Todavía no está en la web'),
      h('span', ew.agotado ? 'Sigue publicado y se ve como agotado. Pon unidades abajo y pulsa Actualizar.' : ew.publicado ? (ew.cambios ? 'Has cambiado cosas desde la última vez: pulsa Actualizar.' : 'Todo al día.') : ew.antes ? 'Está guardado tal cual lo dejaste: fotos, texto, precio y categoría.' : 'Revisa el precio y las fotos de abajo y publica.')),
    btn(ew.publicado ? '⟳ ACTUALIZAR EN LA WEB' : ew.antes ? '🔁 REPUBLICAR' : '🛍️ PUBLICAR EN WEB', publicar, { cls: 'primary web-pub' }),
    ew.publicado ? btn('Retirar', retirar, { cls: 'ghost danger sm' }) : null);
  mount(el, head, arriba,
    h('div.card.col', h('h3', 'Precio'), h('div.form', field('Precio en la web (€, IVA incl.)', f.precio), field('Precio mínimo para negociar (€)', f.negMin, 'El asistente de la tienda nunca bajará de aquí. Solo lo sabe el servidor de la tienda; el cliente no lo ve. Vacío = precio fijo.')), mBox, h('p.tiny.muted', 'Los descuentos no se ponen aquí: se crean con una campaña o promoción REAL en Tienda web → ✨ Campañas (y se quitan solas al terminar).')),
    h('div.card.col', h('h3', 'Ficha en la web'), h('div.form', field('Categoría', f.cat), field('Colores a elegir', f.colores)), field('Descripción', f.desc), h('b.small', 'Características'), carBox,
      h('div.row.wrap', h('label.check', sw(destacado, v => { destacado = v; }), '⭐ Destacado'), h('label.check', sw(novedad, v => { novedad = v; }), '✨ Novedad'), h('label.check', sw(personalizable, v => { personalizable = v; }), '🎨 Personalizable'))),
    h('div.card.col', h('h3', 'Disponibilidad y envío'), modoSel, stockRow, h('div.form', field('Días de fabricación (bajo pedido)', f.plazo), field('Peso con embalaje (g)', f.peso, 'Para calcular el envío. Incluye caja y relleno.'))),
    h('div.card.col', h('h3', 'Fotos (' + elegidas.length + ' elegidas)'), h('p.tiny.muted', 'Pulsa para elegir y ordenar. Se reducen a 1200 px antes de subirlas (la original no cambia).'), fotosBox),
    h('div.card.col', h('h3', '🧊 Vista 3D en la web (opcional)'), h('p.tiny.muted', 'El cliente podrá girar el producto antes de pedirlo. Se usa tu STL real, aligerado para que cargue rápido en el móvil.'), box3d),
    h('div.row.wrap', btn(w.publicado ? 'Actualizar en la tienda' : 'Publicar en la tienda', publicar, { cls: 'primary', icon: 'send' }),
      w.publicado ? btn('Retirar de la tienda', retirar, { cls: 'ghost danger' }) : null));
  return { publicar };
}
