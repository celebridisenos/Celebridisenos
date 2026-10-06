// ================= v13.7 · PEDIDOS WEB: las solicitudes de la tienda, con su estado y sus acciones =================
// · Lista con filtros por estado (con contador), búsqueda y señal clara de los NUEVOS.
// · Ficha: cliente y contacto, productos, envío, forma de pago, líneas en «Pedidos», historial y comunicaciones.
// · Acciones según el estado (las valida el SERVIDOR con su máquina de estados): Aprobar, Rechazar (con motivo), En espera,
//   Pasar a producción, Completar, Cancelar. Cada cambio se publica en la tienda al momento y el cliente lo ve.
// · Abrir un pedido NUEVO lo marca «En revisión» (el cliente ve que lo estamos mirando).
import { h, mount, btn, modal, drawer, toast, eur, fdt, ago, pill, empty, inp, area, debounce, confirmDlg, icon, copyText } from '../ui.js';
import { S, can, api, pull, pwFilas, upsertLocal, removeLocal, emit } from '../store.js';
import { go, handleError } from '../app.js';
import { sonidoActivo, sonidoPedidoWeb } from '../popups.js';
import { miniPedido } from '../fotopedido.js'; // v13.10: foto de cada producto pedido

const CL = window.CL;
const COLOR = { nuevo: '#e0457b', en_revision: '#f59e0b', aprobado: '#10b981', en_espera: '#8b5cf6', procesando: '#3b82f6', completado: '#64748b', rechazado: '#ef4444', cancelado: '#94a3b8' };
const ICONO = { nuevo: '🆕', en_revision: '🔎', aprobado: '✅', en_espera: '⏳', procesando: '🖨️', completado: '📦', rechazado: '⛔', cancelado: '✖️' };
const FILTROS = [
  { k: 'pendientes', t: 'Pendientes', f: r => CL.PW_PENDIENTES.includes(r.efectivo) },
  { k: 'nuevo', t: 'Nuevos', f: r => r.efectivo === 'nuevo' },
  { k: 'en_revision', t: 'En revisión', f: r => r.efectivo === 'en_revision' },
  { k: 'aprobado', t: 'Aprobados', f: r => r.efectivo === 'aprobado' },
  { k: 'en_espera', t: 'En espera', f: r => r.efectivo === 'en_espera' },
  { k: 'procesando', t: 'Procesando', f: r => r.efectivo === 'procesando' },
  { k: 'completado', t: 'Completados', f: r => r.efectivo === 'completado' },
  { k: 'cerrados', t: 'Rechazados / cancelados', f: r => r.efectivo === 'rechazado' || r.efectivo === 'cancelado' },
  { k: 'todos', t: 'Todos', f: () => true }
];
const COM_NOMBRE = { recibido: 'Solicitud recibida', aprobado: 'Pedido aprobado', en_espera: 'En espera', enviado: '🚚 En camino (con seguimiento)', rechazado: 'Rechazado', cancelado: 'Cancelado' };
export const estadoPill = e => { const x = h('span.pw-estado', { 'data-estado': e }, (ICONO[e] || '') + ' ' + (CL.PW_NOMBRE[e] || e).toUpperCase()); x.style.setProperty('--c', COLOR[e] || '#888'); return x; };
const prods = r => (r.lineas || []).map(l => l.cant + ' × ' + l.nombre).join(', ');
async function abrirUrl(url) { try { const { desktop } = await import('../desktop.js'); if (desktop.on) return desktop.openUrl(url); } catch (e) { } window.open(url, '_blank', 'noopener'); }

export function render(el, params) {
  const st = { f: 'pendientes', q: '' };
  let estado = null, openId = null, dr = null;
  const search = inp({ type: 'search', placeholder: 'Buscar por nº W-…, cliente, email, teléfono o producto…', 'aria-label': 'Buscar pedidos web' });
  search.addEventListener('input', debounce(() => { st.q = search.value; drawList(); }, 120));
  const chips = h('div.seg.pw-filtros'), listBox = h('div'), barra = h('div.pw-barra');
  const emailBox = h('div.pw-email'); // v13.10: emails a los clientes (cómo activarlos y prueba)
  el.append(h('div.page-head', h('div.grow', h('h1', 'Pedidos web'), h('p.muted.small', 'Solicitudes de la tienda. Respóndelas en 24–48 horas: el cliente ve al momento lo que decidas.')),
    btn('Traer ahora', traer, { icon: 'refresh', title: 'Comprobar si hay pedidos nuevos en la tienda' })),
    barra, emailBox, h('div.row.wrap', { style: { margin: '10px 0' } }, h('div.inp-icon.grow', icon('search', 's'), search)), chips, listBox);

  async function traer(ev) {
    const b = ev && ev.currentTarget; if (b) b.disabled = true;
    try { const x = await api('tienda.traerPedidos', {}, { timeout: 120000 }); toast(x.creados ? x.pedidosWeb + ' pedido(s) web nuevo(s)' : 'No hay pedidos web nuevos', x.creados ? 'ok' : '', 5000); await pull(); }
    catch (e) { handleError(e); } finally { if (b) b.disabled = false; }
  }
  async function cargarEstado() {
    try { estado = await api('pedidosWeb.estado', { urlPrograma: localStorage.getItem('cd.server') || '' }, { quiet: true, timeout: 60000 }); } catch (e) { estado = { error: e.message || String(e) }; }
    drawBarra();
  }
  function drawEmail() {
    if (!estado || estado.error || !estado.email) return mount(emailBox);
    const ok = estado.email.activo && estado.email.permiso;
    const probar = can('pedidos.editar') ? btn('✉️ Mandarme un email de prueba', async ev => {
      const b = ev.currentTarget; b.disabled = true;
      try { const r = await api('pedidosWeb.probarEmail', {}, { timeout: 60000 }); toast('✉️ Email de prueba enviado a ' + r.a + '. Mira tu bandeja (y la carpeta de spam).', 'ok', 8000); }
      catch (e) { handleError(e); } finally { b.disabled = false; }
    }, { cls: 'sm' + (ok ? ' ghost' : '') }) : null;
    if (ok) return mount(emailBox, h('div.row.wrap.small', { style: { gap: '8px', alignItems: 'center', margin: '6px 0' } }, h('span.ok-t', '✅ Tus clientes reciben un email al hacer el pedido, al aprobarlo y cuando sale el paquete (con su número de seguimiento y un botón «Ver mi pedido»).'), probar));
    mount(emailBox, h('div.card.flat.pw-email-off', { style: { borderColor: 'var(--warn, #f59e0b)', margin: '8px 0' } },
      h('b', '✉️ Tus clientes todavía NO reciben emails de su pedido'),
      !estado.email.activo ? h('p.small', 'Están apagados. Pulsa «Emails: sí» arriba para encenderlos.') : h('div.small',
        h('p', { style: { margin: '4px 0' } }, 'Falta darle permiso al programa para enviar emails desde tu cuenta de Google. Es una sola vez (3 minutos):'),
        h('ol', { style: { margin: '0 0 6px', paddingLeft: '20px' } },
          h('li', 'En script.google.com abre el proyecto → ⚙️ Configuración del proyecto → marca «Mostrar el archivo de manifiesto appsscript.json». Abre appsscript.json, bórralo y pega el appsscript.json de la carpeta de la versión → Ctrl+S.'),
          h('li', 'Arriba, en la lista de funciones, elige «activarEmails» → Ejecutar → acepta los permisos de Google (enviar correo como tú).'),
          h('li', 'Implementar → Gestionar implementaciones → ✏️ → Versión: «Nueva versión» → Implementar.')),
        h('p.tiny.muted', { style: { margin: 0 } }, 'Después pulsa «Mandarme un email de prueba». Google deja enviar unos 100 emails al día en cuentas gratuitas.')),
      probar));
  }
  function drawBarra() {
    drawEmail();
    if (!estado) return mount(barra, h('span.tiny.muted', 'Comprobando la conexión con la tienda…'));
    if (estado.error) return mount(barra, h('span.pw-ind.bad', '⚠️ ' + estado.error));
    const tgF = (estado.telegram.ultimos || []).filter(x => !x.ok).slice(-1)[0];
    const ind = (cls, txt, title) => h('span.pw-ind.' + cls, { title: title || '' }, txt);
    mount(barra,
      ind(estado.tienda ? 'ok' : 'bad', estado.tienda ? '🛍️ Tienda conectada' : '🛍️ Tienda sin conectar', estado.ultimoError || ''),
      ind(estado.avisoRegistrado ? 'ok' : 'warn', estado.avisoRegistrado ? '⚡ Aviso al momento: activo' : '⚡ Aviso al momento: sin activar (llegan cada 15 min)', estado.ultimoAviso ? 'Último aviso de la tienda: ' + fdt(estado.ultimoAviso.en) : 'La tienda todavía no ha avisado nunca'),
      ind(!estado.telegram.bot ? 'bad' : tgF ? 'bad' : estado.telegram.conectado ? 'ok' : 'warn', !estado.telegram.bot ? '✈️ Telegram sin configurar' : tgF ? '✈️ Telegram: último envío FALLÓ' : estado.telegram.conectado ? '✈️ Telegram conectado' : '✈️ Tu Telegram no está conectado', tgF ? tgF.a + ': ' + tgF.error : ''),
      ind(estado.email.activo && estado.email.permiso ? 'ok' : 'warn', estado.email.activo ? (estado.email.permiso ? '✉️ Emails al cliente: activos' : '✉️ Emails al cliente: falta el permiso de correo') : '✉️ Emails al cliente: apagados'),
      estado.ultimaImport ? h('span.tiny.muted', 'Última revisión ' + ago(estado.ultimaImport)) : null,
      h('span.grow'),
      btn(sonidoActivo() ? '🔔 Sonido' : '🔕 Sin sonido', ev => { try { localStorage.setItem('cd.pw.sonido', sonidoActivo() ? '0' : '1'); } catch (e) { } if (sonidoActivo()) sonidoPedidoWeb(true); ev.currentTarget.querySelector('span').textContent = sonidoActivo() ? '🔔 Sonido' : '🔕 Sin sonido'; }, { cls: 'sm ghost', title: 'Sonido al llegar un pedido web' }),
      'Notification' in window && Notification.permission === 'default' ? btn('Avisos del sistema', async ev => { const b = ev.currentTarget; try { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Avisos del sistema activados en este aparato' : 'No se han permitido los avisos del sistema', r === 'granted' ? 'ok' : 'warn'); } catch (e) { } b.remove(); }, { cls: 'sm ghost', title: 'Aviso de Windows/del móvil al llegar un pedido web aunque la app esté detrás' }) : null,
      estado.telegram.bot && estado.telegram.conectado ? btn('Probar Telegram', async () => { try { await api('telegram.probar', {}); toast('Mensaje de prueba enviado a tu Telegram', 'ok'); } catch (e) { handleError(e); } cargarEstado(); }, { cls: 'sm ghost' }) : null,
      can('tienda.gestionar') && estado.tienda ? btn('Probar aviso', async () => {
        try { const r = await api('pedidosWeb.probarAviso', { urlPrograma: localStorage.getItem('cd.server') || '' }, { timeout: 90000 }); toast(r.prueba && r.prueba.ok ? '✅ La tienda puede avisar al programa al momento' : '⚠️ La tienda no ha podido avisar: ' + ((r.prueba && r.prueba.motivo) || r.motivo || 'sin respuesta'), r.prueba && r.prueba.ok ? 'ok' : 'warn', 8000); }
        catch (e) { handleError(e); } cargarEstado();
      }, { cls: 'sm ghost', title: 'La tienda manda un aviso de prueba firmado al programa' }) : null,
      can('config.editar') ? btn(estado.cfg.emailCliente ? 'Emails: sí' : 'Emails: no', async () => { try { await api('pedidosWeb.config', { emailCliente: !estado.cfg.emailCliente }); } catch (e) { handleError(e); } cargarEstado(); }, { cls: 'sm ghost', title: 'Enviar al cliente un email al recibir, aprobar o rechazar su pedido' }) : null);
  }
  function filas() { return pwFilas().sort((a, b) => String(b.creado).localeCompare(String(a.creado))); }
  function drawChips() {
    const all = filas();
    mount(chips, FILTROS.map(x => { const n = all.filter(x.f).length; return h('button' + (st.f === x.k ? '.on' : ''), { 'data-f': x.k, onclick: () => { st.f = x.k; drawChips(); drawList(); } }, x.t + ' ', h('span.c' + (n && (x.k === 'pendientes' || x.k === 'nuevo') ? '.bad' : ''), String(n))); }));
  }
  function drawList() {
    const fl = FILTROS.find(x => x.k === st.f), all = filas();
    const rows = all.filter(r => fl.f(r) && (!st.q || CL.matches([r.id, r.cliente, r.email, r.telefono, prods(r), r.metodo].join(' '), st.q)));
    if (!all.length) return mount(listBox, h('div.card', empty('store', 'Aún no hay pedidos web', 'Cuando alguien haga un pedido en la tienda aparecerá aquí al momento, con aviso en la app y por Telegram.')));
    if (!rows.length) return mount(listBox, h('div.card', empty('search', st.f === 'pendientes' && !st.q ? '🎉 No hay pedidos web pendientes' : 'Ningún pedido web con este filtro')));
    mount(listBox, h('div.list.boxed.pw-lista', rows.slice(0, 300).map(r => h('div.item.pw-item' + (r.efectivo === 'nuevo' ? '.nuevo' : ''), { 'data-id': r.id, onclick: () => go('pedidosweb/' + encodeURIComponent(r.id)) },
      h('div.grow', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, estadoPill(r.efectivo), h('b', r.id), r.tienda === 'pendiente' ? h('span.pw-warn', { title: r.tiendaError || '' }, '⚠️ la tienda no se ha enterado') : null),
        h('div.ellipsis', h('b', r.cliente), ' · ', prods(r)),
        h('div.tiny.muted', [ago(r.creado), r.metodo, r.telefono && r.telefono !== '•••' ? r.telefono : '', r.email && r.email !== '•••' ? r.email : ''].filter(Boolean).join(' · '))),
      h('div.bold.nowrap', eur(r.total))))));
  }
  function applyParams(p) {
    const id = (p || []).find(x => x && !x.startsWith('?')) || '';
    drawChips(); drawList();
    if (id && (id !== openId || !document.querySelector('.drawer'))) {
      if (dr) { const viejo = dr; dr = null; viejo.close(); } // una sola ficha abierta a la vez
      openId = id; const mio = ficha(id, () => { if (dr === mio) { openId = null; dr = null; history.replaceState(null, '', '#/pedidosweb'); } }); dr = mio;
    } else if (!id && dr) { const viejo = dr; dr = null; openId = null; viejo.close(); }
  }
  drawBarra(); cargarEstado(); applyParams(params);
  const tEst = setInterval(() => { if (document.visibilityState === 'visible') cargarEstado(); }, 120000);
  return { params: applyParams, update: () => { drawChips(); drawList(); if (dr) dr.update(); }, destroy: () => { clearInterval(tEst); if (dr) dr.close(); } };
}

// ---------- Ficha de un pedido web ----------
function ficha(id, onClose) {
  let ctl, ocupado = false, abierto = false;
  const res = { update: () => { }, close: () => ctl && ctl.close() };
  ctl = drawer((d, close) => {
    const closeAll = () => { close(); onClose(); };
    const draw = () => {
      const r = pwFilas().find(x => x.id === id);
      if (!r) return mount(d, h('div.drawer-h', h('h2.grow', 'Pedido web'), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })), h('div.drawer-b', empty('search', 'No encuentro este pedido web', 'Puede que todavía no haya llegado. Pulsa «Traer ahora» en Pedidos web.')));
      const e = r.efectivo, editar = can('pedidos.editar');
      const acciones = Object.keys(CL.PW_ACCIONES).filter(k => k !== 'revisar' && CL.PW_ACCIONES[k].desde.includes(e));
      const tel = r.telefono && r.telefono !== '•••' ? r.telefono : '', email = r.email && r.email !== '•••' ? r.email : '';
      const waTxt = { nuevo: '¡Hola {n}! Hemos recibido tu pedido {id}. Lo estamos revisando y te respondemos enseguida.', en_revision: '¡Hola {n}! Estamos revisando tu pedido {id}.', aprobado: '¡Hola {n}! Tu pedido {id} está aprobado ✅. Total {t}. ¿Te paso los datos para el pago por {m}?', en_espera: '¡Hola {n}! Tu pedido {id} está aprobado y en espera. Te aviso en cuanto empecemos.', procesando: '¡Hola {n}! Ya estamos fabricando tu pedido {id}.', completado: '¡Hola {n}! Tu pedido {id} ya está en camino / entregado. ¡Gracias!', rechazado: 'Hola {n}, sobre tu pedido {id}: ', cancelado: 'Hola {n}, sobre tu pedido {id}: ' }[e]
        .replace('{n}', String(r.cliente || '').split(/\s+/)[0]).replace('{id}', r.id).replace('{t}', eur(r.total)).replace('{m}', String(r.metodo || '').toLowerCase());
      const wa = tel ? CL.waLink(tel, waTxt) : '';
      const com = r.comunicaciones || {};
      mount(d,
        h('div.drawer-h', h('div.grow', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, estadoPill(e), h('h2', { style: { margin: 0 } }, r.id)), h('div.tiny.muted', 'Hecho en la web ' + fdt(r.creado) + ' · llegó ' + ago(r.recibido))), btn('', closeAll, { cls: 'ghost icon', icon: 'x' })),
        h('div.drawer-b.col.pw-ficha', { style: { gap: '14px' } },
          r.tienda === 'pendiente' ? h('div.pw-aviso.warn', '⚠️ El último cambio está guardado aquí, pero la tienda todavía no lo sabe: ', r.tiendaError || 'sin respuesta', '. Se reintenta solo cada 15 min. ', btn('Reintentar ahora', async () => { try { await api('pedidosWeb.publicar', { id }); await pull(); toast('Publicado en la tienda', 'ok'); } catch (er) { handleError(er); } }, { cls: 'sm' })) : null,
          editar && acciones.length ? h('div.pw-acciones', acciones.map(k => { const b = btn(CL.PW_ACCIONES[k].t, () => accion(k), { cls: k === 'aprobar' ? 'primary' : k === 'rechazar' || k === 'cancelar' ? 'danger' : '' }); b.dataset.accion = k; return b; })) : null,
          h('section.card.pw-cli', h('h3', '👤 ' + r.cliente),
            tel ? h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('span', '📞 ' + tel), wa ? btn('WhatsApp', () => abrirUrl(wa), { cls: 'sm', icon: 'msg', title: waTxt }) : null, h('a.btn.sm.ghost', { href: 'tel:' + tel.replace(/[^\d+]/g, '') }, 'Llamar')) : h('div.tiny.muted', r.telefono === '•••' ? 'Teléfono oculto (necesitas permiso para ver clientes)' : 'Sin teléfono'),
            email ? h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } }, h('span', '✉️ ' + email), btn('Copiar', () => copyText(email), { cls: 'sm ghost' })) : null,
            r.direccion && r.direccion !== '•••' ? h('div', '🏠 ' + r.direccion) : null,
            r.clienteId ? h('a.tiny', { href: '#/clientes/' + r.clienteId }, 'Ver ficha del cliente →') : null),
          h('section.card', h('h3', '📦 Qué ha pedido'),
            h('div.pw-lineas', (r.lineas || []).map(l => h('div.row', { style: { gap: '8px', alignItems: 'center' } }, miniPedido({ productoId: l.id || l.productoId, producto: l.nombre }, 40), h('span.grow', l.cant + ' × ' + l.nombre + (l.variante && Object.keys(l.variante).length ? ' (' + Object.entries(l.variante).map(([k, v]) => k + ': ' + v).join(', ') + ')' : '')), h('b', eur(l.total))))),
            h('div.row', { style: { borderTop: '1px solid var(--line)', paddingTop: '8px', marginTop: '6px' } }, h('span.grow', '🚚 ' + (r.envio || 'Envío')), h('b', 'Total ' + eur(r.total))),
            h('div', '💶 ' + r.metodo), r.nota ? h('div.pw-nota', '📝 Nota del cliente: ' + r.nota) : null,
            r.lineasProg.length ? h('div.tiny', 'En Pedidos: ', r.lineasProg.map((o, i) => [i ? ' · ' : '', h('a', { href: '#/pedidos/' + o.id }, 'nº ' + o.numero + ' (' + o.estado + ')')])) : null),
          r.notaCliente ? h('div.pw-aviso', '💬 Mensaje que ve el cliente: ', h('b', r.notaCliente)) : null,
          h('section.card', h('h3', '✉️ Comunicaciones al cliente'), h('p.tiny.muted', 'Cada una se envía UNA sola vez. El estado lo ve siempre en la web, en «Seguir mi pedido».'),
            Object.keys(COM_NOMBRE).filter(k => com[k] || k === e || (k === 'recibido')).map(k => {
              const c = com[k];
              return h('div.row.pw-com', h('span.grow', COM_NOMBRE[k]), c ? (c.ok ? h('span.ok-t', '✓ enviado ' + ago(c.en)) : h('span.warn-t', '✗ no enviado: ' + (c.motivo || '?'))) : h('span.muted.tiny', '—'),
                c && !c.ok && editar && c.motivo !== 'antiguo' ? btn('Reenviar', async () => { try { const x = await api('pedidosWeb.reenviar', { id, clave: k }); upsertLocal('pedidosWeb', x.row); emit(); toast(x.comunicacion.ok ? 'Email enviado' : 'No se pudo: ' + x.comunicacion.motivo, x.comunicacion.ok ? 'ok' : 'warn', 6000); } catch (er) { handleError(er); } }, { cls: 'sm ghost' }) : null);
            })),
          h('section.card', h('h3', '🕒 Historial'), h('ol.pw-hist', (r.historial || []).slice().reverse().map(x => h('li', h('b', CL.PW_NOMBRE[x.estado] || x.estado), ' · ', fdt(x.en), ' · ', x.por, x.nota ? h('div.tiny.muted', x.nota) : null)))),
          editar ? notaInterna(r) : null,
          // v13.10: borrar del todo un pedido web terminado (cancelado o rechazado) y sus líneas → a la Papelera
          can('pedidos.borrar') && ['cancelado', 'rechazado'].includes(e) ? h('section.card.pw-borrar', h('div.row.wrap', { style: { gap: '8px', alignItems: 'center' } },
            h('span.grow.small', '🗑️ Quitarlo de la lista con todo su contenido (' + (r.lineasProg.length ? r.lineasProg.length + (r.lineasProg.length === 1 ? ' pedido' : ' pedidos') + ' en Pedidos' : 'sin pedidos') + '). Va a la Papelera: se puede recuperar.'),
            btn('Borrar pedido web', async () => {
              if (!await confirmDlg('Borrar ' + r.id, 'Se borra el pedido web y ' + (r.lineasProg.length ? 'sus ' + r.lineasProg.length + ' pedido(s) en Pedidos' : 'su ficha') + '. Todo va a la Papelera (se puede recuperar). El cliente sigue viendo en la web que está ' + (CL.PW_NOMBRE[e] || e).toLowerCase() + '.', 'Borrar', true)) return;
              try {
                const x = await api('pedidosWeb.borrar', { id }); removeLocal('pedidosWeb', id); (x.pedidos || []).forEach(pid => removeLocal('pedidos', pid)); emit(); toast('🗑️ ' + id + ' borrado (está en la Papelera)', 'ok'); closeAll();
                // v14.1: si al cliente ya no le queda ninguna venta, se ofrece borrar también su ficha y su historial
                const cli = (S.t.clientes || []).find(c => c.id === r.clienteId || CL.norm(c.nombre) === CL.norm(r.cliente));
                if (cli && can('clientes.borrar') && !S.t.pedidos.some(o => (o.clienteId === cli.id || CL.norm(o.cliente) === CL.norm(cli.nombre)) && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled)) {
                  const C = await import('./clientes.js'); await C.delClient(cli, {}, null);
                }
              }
              catch (err) { handleError(err); }
            }, { cls: 'danger sm' }))) : null));
    };
    const notaInterna = r => { const ta = area({ rows: 2, placeholder: 'Nota interna (no la ve el cliente)', value: r.nota || '' }); return h('section.card', h('h3', '🗒️ Nota del equipo'), ta, h('div.row', { style: { marginTop: '6px' } }, btn('Guardar nota', async () => { try { const x = await api('pedidosWeb.nota', { id, nota: ta.value }); upsertLocal('pedidosWeb', x); emit(); toast('Nota guardada', 'ok'); } catch (er) { handleError(er); } }, { cls: 'sm' }))); };
    async function accion(k) {
      if (ocupado) return;
      const def = CL.PW_ACCIONES[k], r = pwFilas().find(x => x.id === id);
      let motivo = '', notaCliente = '';
      if (k === 'rechazar' || k === 'cancelar') {
        const v = await pedirTexto(def.t + ' ' + id, 'Motivo (el cliente lo verá en la web' + ' y en el email):', true, k === 'cancelar' ? 'Las líneas del pedido se cancelarán y se liberará lo apartado en la tienda.' : '');
        if (v === null) return; motivo = v;
      } else if (k === 'espera') {
        const v = await pedirTexto('Poner en espera ' + id, 'Mensaje para el cliente (opcional):', false, ''); if (v === null) return; notaCliente = v;
      } else if (k === 'completar') {
        if (!(await confirmDlg('Marcar completado', 'Todas las líneas del pedido pasarán a «entregado».', 'Marcar completado'))) return;
      }
      ocupado = true;
      try {
        const x = await api('pedidosWeb.accion', { id, accion: k, motivo, notaCliente, version: r ? r.version : undefined }, { timeout: 120000 });
        upsertLocal('pedidosWeb', x.row); emit();
        const partes = [x.sinCambios ? 'Ya estaba así' : '✅ ' + CL.PW_NOMBRE[x.estado]];
        if (!x.sinCambios) partes.push(x.tienda && x.tienda.ok ? 'el cliente ya lo ve en la web' : '⚠️ la tienda no responde (se reintentará)');
        if (x.comunicacion && !x.sinCambios) partes.push(x.comunicacion.ok ? 'email enviado' : 'email no enviado (' + (x.comunicacion.motivo || '') + ')');
        toast(partes.join(' · '), x.tienda && x.tienda.ok === false ? 'warn' : 'ok', 7000);
        pull();
      } catch (er) { handleError(er); if (er && er.code === 'CONFLICT') pull(); }
      finally { ocupado = false; }
    }
    draw();
    res.update = draw;
    // abrir = «en revisión» si era NUEVO (lo decide el servidor; quien solo puede ver no cambia nada)
    if (!abierto) { abierto = true; const r0 = pwFilas().find(x => x.id === id); if (r0 && r0.efectivo === 'nuevo' && can('pedidos.editar')) api('pedidosWeb.abrir', { id }, { quiet: true }).then(x => { if (x && x.row) { upsertLocal('pedidosWeb', x.row); emit(); } }).catch(() => { }); }
  });
  return res;
}
function pedirTexto(titulo, etiqueta, obligatorio, aviso) {
  return new Promise(res => {
    const ta = area({ rows: 3, maxlength: 300, 'aria-label': etiqueta }), err = h('div.tiny.warn-t');
    let hecho = false;
    const m = modal(titulo, h('div.col', h('label', etiqueta), ta, aviso ? h('p.tiny.muted', aviso) : null, err), close => [
      btn('Volver', () => { hecho = true; close(); res(null); }),
      btn('Confirmar', () => { const v = ta.value.trim(); if (obligatorio && v.length < 3) { err.textContent = 'Escribe el motivo.'; return; } hecho = true; close(); res(v); }, { cls: 'primary' })], { size: 'narrow', onclose: () => { if (!hecho) res(null); } });
    setTimeout(() => ta.focus(), 50);
    return m;
  });
}
