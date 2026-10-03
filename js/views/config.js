// ================= Configuración: todo lo ajustable, sin tocar código =================
import { h, mount, icon, btn, modal, toast, fdt, ago, pill, empty, field, inp, sel, area, sw, confirmDlg, promptDlg, avatar, eur, copyText } from '../ui.js';
import { S, can, api, pull, logout, emit, APP_VERSION, kv, dropQueue, passHashes, checkNewPassword, user } from '../store.js';
import { rolePicker } from '../roles.js';
import { iaPanel } from '../ai/models.js';
import { biblioteca as bibliotecaView, memoria as memoriaView } from './ia.js';
import { go, handleError, requestAccess, applyTheme, roleName, lockBox, start, THEMES, isAdminUser } from '../app.js';
import { desktop } from '../desktop.js';
import { connectTelegram } from './notificaciones.js';
import { dropZone } from '../files.js';
import { accionTxt, resumenDetalle } from './pedidos.js';
import { qrSvg } from '../qr.js';

const SECTIONS = [
  { g: 'Personal' },
  { k: 'perfil', t: 'Mi perfil', i: 'user' },
  { k: 'dispositivo', t: 'Este dispositivo', i: 'phone' },
  { k: 'movil', t: 'Instalar en el móvil', i: 'phone' },
  { g: 'Empresa y equipo' },
  { k: 'empresa', t: 'Empresa y logo', i: 'store', p: 'config.editar' },
  { k: 'usuarios', t: 'Usuarios', i: 'users', p: 'usuarios.admin' },
  { k: 'roles', t: 'Roles y permisos', i: 'shield', p: 'usuarios.admin' },
  { k: 'solicitudes', t: 'Solicitudes de acceso', i: 'key', p: 'usuarios.admin' },
  { k: 'actividad', t: 'Horarios y conexiones', i: 'history', p: 'actividad.ver' },
  { k: 'tienda', t: 'Tienda web', i: 'store', p: 'tienda.gestionar' }, // v12: sustituye a «Espacios (THE NOORKO)»
  { g: 'Negocio' },
  { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'config.editar' },
  { k: 'clientes', t: 'Clientes', i: 'star', p: 'config.editar' },
  { k: 'precios', t: 'Precios y comisiones', i: 'euro', p: 'config.editar' },
  { k: 'alertas', t: 'Alertas inteligentes', i: 'alert', p: 'config.editar' },
  { k: 'facturacion', t: 'Facturación y presupuestos', i: 'file', p: 'config.editar' },
  { k: 'taller', t: 'Taller y filamento', i: 'cube', p: 'config.editar' },
  { k: 'anuncios', t: 'Anuncios (reglas de plataformas)', i: 'sparkles', p: 'config.editar' },
  { k: 'etiquetas', t: 'Centro de impresión', i: 'printer' },
  { k: 'juego', t: 'Motivación y juego', i: 'star', p: 'config.editar' },
  { g: 'Inteligencia artificial' },
  { k: 'ia', t: 'IA local y modelos', i: 'sparkles' },
  { k: 'biblioteca', t: 'Biblioteca y documentos', i: 'file' },
  { k: 'memoria', t: 'Memoria de la IA', i: 'history' },
  { g: 'Conexiones' },
  { k: 'automatizaciones', t: 'Automatizaciones (reglas de avisos)', i: 'sparkles', p: 'config.editar' },
  { k: 'avisos', t: 'Telegram y avisos', i: 'bell', p: 'config.editar' },
  { k: 'plataformas', t: 'Avisos de Wallapop y plataformas', i: 'bell', p: 'config.editar' }, // v12.2
  { k: 'redes', t: 'Redes (TikTok, Instagram…)', i: 'calendar' },
  { k: 'github', t: 'GitHub y actualizaciones', i: 'download' },
  { g: 'Sistema' },
  { k: 'seguridad', t: 'Seguridad', i: 'lock', p: 'config.editar' },
  { k: 'copias', t: 'Copias de seguridad', i: 'archive', p: 'copias.admin' },
  { k: 'importar', t: 'Importar del programa anterior', i: 'upload', p: 'config.editar' },
  { k: 'papelera', t: 'Papelera', i: 'trash' },
  { k: 'auditoria', t: 'Auditoría', i: 'history' },
  { k: 'conexiones', t: 'Estado del sistema', i: 'refresh', p: 'config.ver' }
];

export function render(el, params) {
  let sec = (params && params[0]) || 'perfil';
  const nav = h('div.list.boxed', { style: { alignSelf: 'start' } });
  const body = h('div.col', { style: { gap: 'var(--gap)', minWidth: 0 } });
  const mobileSel = h('select.inp.show-m', { style: { marginBottom: '12px' }, onchange: e => go('config/' + e.target.value) });
  el.append(h('div.page-head', h('h1', 'Configuración')), mobileSel, h('div.grid', { style: { gridTemplateColumns: window.innerWidth <= 860 ? '1fr' : '240px minmax(0, 1fr)' } }, h('div.hide-m', nav), body));
  const draw = () => {
    const vis = SECTIONS.filter(s => !s.p || can(s.p) || ['solicitudes', 'usuarios', 'roles'].includes(s.k) && false);
    mount(nav, SECTIONS.map(s => s.g ? h('div.grp-t', s.g) : h('div.item' + (sec === s.k ? '.sel' : ''), { onclick: () => go('config/' + s.k) }, icon(s.i, 's'), h('span.grow', s.t), s.p && !can(s.p) ? icon('lock', 's') : null,
      s.k === 'solicitudes' && can('usuarios.admin') && S.t.solicitudes.filter(x => x.estado === 'pendiente').length ? h('span.pill.bad', String(S.t.solicitudes.filter(x => x.estado === 'pendiente').length)) : null)));
    mount(mobileSel, SECTIONS.map(s => s.g ? h('optgroup', { label: s.g }) : h('option', { value: s.k, selected: s.k === sec }, s.t + (s.p && !can(s.p) ? ' 🔒' : ''))));
    const s = SECTIONS.find(x => x.k === sec) || SECTIONS[1];
    if (s.p && !can(s.p)) return mount(body, lockBox(s.p, 'configuración: ' + s.t));
    mount(body, h('h2', s.t));
    try { const r = SEC[s.k](body); if (r && r.then) r.catch(e => body.appendChild(h('p.bad-t', e.message))); } catch (e) { body.appendChild(h('p.bad-t', e.message)); }
  };
  draw();
  return { params: p => { sec = (p && p[0]) || 'perfil'; draw(); }, update: () => { } };
}

// v10.8: resumen de la mañana (Telegram y avisos)
function resumenCard(c) {
  const hora = sel(Array.from({ length: 17 }, (_, i) => ({ v: i + 6, t: (i + 6) + ':00' })), c.horaResumen ?? 9);
  let on = c.resumenDiario !== false, foto = c.fotoListo !== false;
  const out = h('div.inv-msg', { style: { display: 'none' } });
  return card('☀️ Resumen de la mañana', h('p.small.muted', 'Cada día, a la hora que elijas, cada persona recibe (en la app y en Telegram si lo tiene conectado) lo importante: pedidos que vencen, qué imprime cada impresora, filamento bajo, tareas y presupuestos pendientes. Solo ve lo que su rol le permite.'),
    h('label.check', sw(on, v => { on = v; }), 'Enviar el resumen de la mañana'), field('Hora', hora),
    h('label.check', sw(foto, v => { foto = v; }), '📸 Al terminar una pieza, mandar una foto de la cámara por Telegram (con el mensaje para el cliente ya escrito)'),
    h('div.row.wrap', btn('Guardar', () => saveCfg('notificaciones', Object.assign(JSON.parse(JSON.stringify(S.cfg.notificaciones)), { resumenDiario: on, horaResumen: Number(hora.value), fotoListo: foto })), { cls: 'primary' }),
      btn('Probar ahora (a mí)', async () => { try { const r = await api('resumen.probar', {}); out.style.display = ''; out.textContent = r.texto || '(vacío)'; toast('Enviado a tus avisos' + (S.me.telegramId ? ' y a Telegram' : ''), 'ok'); } catch (e) { handleError(e); } }, { icon: 'send' })), out);
}

// Guarda una sección de configuración del servidor
async function saveCfg(clave, valor) {
  try { S.cfg = await api('config.guardar', { clave, valor }); emit(); toast('Configuración guardada', 'ok'); return true; }
  catch (e) { handleError(e, 'configuración'); return false; }
}
// v10.6: volver a la versión anterior del programa (se guarda al actualizar)
function rollbackBox(r) {
  if (!r || !r.anterior) return null;
  return h('div.row.wrap', { style: { marginBottom: '8px' } }, h('span.small.muted.grow', 'Versión anterior guardada: ' + r.anterior + '. Si la nueva te da problemas, puedes volver a ella.'),
    btn('Volver a la ' + r.anterior, async ev => { if (!await confirmDlg('¿Volver a la versión ' + r.anterior + '?', 'El programa se cerrará y se abrirá con la versión anterior. Tus datos no cambian (están en Google).', 'Volver')) return; ev.target.closest('button').disabled = true; try { await desktop.volverAnterior(); toast('Volviendo a la versión ' + r.anterior + '…', 'ok'); } catch (e) { toast(e.message, 'bad'); ev.target.closest('button').disabled = false; } }, { cls: 'sm', icon: 'history' }));
}
function card(title, ...kids) { return h('div.card.col', title ? h('h3', title) : null, ...kids); }

// v11.5: el mismo Centro de impresión se abre desde Impresión (taller) → «Etiquetas e impresoras de papel»
export const printCenter = (b, reload) => SEC.etiquetas(b, reload);
const SEC = {
  // v11: impresoras detectadas en este PC, impresora por plantilla, tamaños y calibración
  async etiquetas(b, reload) {
    const L = await import('../labels.js');
    const CI = await import('./centro_impresion.js');
    const c = await CI.render(b, L, () => (reload ? reload() : SEC_RELOAD()));
    const list = L.realPrinters(await L.printers());
    const rows = Object.keys(L.TEMPLATES).map(k => {
      const t = L.TEMPLATES[k], s = L.sizeOf(k, c), auto = L.pickPrinter(k, list, Object.assign({}, c, { impresora: {} }));
      const pr = sel([{ v: '', t: 'Automática' + (auto ? ' (' + auto.name + ')' : '') }].concat(list.map(p => ({ v: p.name, t: p.name }))), (c.impresora || {})[k] || '');
      const w = inp({ type: 'number', min: 20, max: 210, value: s.w, style: { width: '76px' } }), hh = inp({ type: 'number', min: 20, max: 300, value: s.h, style: { width: '76px' } });
      pr.onchange = () => { c.impresora = c.impresora || {}; if (pr.value) c.impresora[k] = pr.value; else delete c.impresora[k]; };
      const sz = () => { c.tam = c.tam || {}; c.tam[k] = { w: Number(w.value) || t.w, h: Number(hh.value) || t.h }; };
      w.onchange = sz; hh.onchange = sz;
      return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } }, h('div.grow', { style: { minWidth: '180px' } }, h('b', t.t), h('div.tiny.muted', t.d)), h('div.row', w, '×', hh, h('span.small', 'mm')), desktop.on ? h('div', { style: { minWidth: '220px' } }, pr) : null);
    });
    const offs = list.map(p => {
      const a = (c.ajuste || {})[p.name] || {};
      const x = inp({ type: 'number', step: 0.5, value: a.x || 0, style: { width: '80px' } }), y = inp({ type: 'number', step: 0.5, value: a.y || 0, style: { width: '80px' } });
      const upd = () => { c.ajuste = c.ajuste || {}; c.ajuste[p.name] = { x: Number(x.value) || 0, y: Number(y.value) || 0 }; };
      x.onchange = upd; y.onchange = upd;
      return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } }, h('span.grow', p.name), h('span.small', '→'), x, h('span.small', 'mm'), h('span.small', '↓'), y, h('span.small', 'mm'),
        btn('Hoja de prueba', async () => { await L.saveLabelCfg(c); L.printLabels('qr', [{ qr: 'CelebriDisenos-calibracion', titulo: 'Debe medir 40 × 40 mm' }], { printer: p.name }); }, { cls: 'sm ghost', icon: 'printer' }));
    });
    b.append(card('Plantillas', h('p.small.muted', 'Tamaño de cada etiqueta e impresora. "Automática": envíos a la impresora de etiquetas 10×15; si no hay, a la de folios a tamaño real (varias por hoja).'), h('div.list.boxed', rows)),
      desktop.on && list.length ? card('Calibración', h('p.small.muted', 'Si la etiqueta sale desplazada, corrige aquí los milímetros (→ derecha, ↓ abajo) e imprime la hoja de prueba: el cuadrado debe medir exactamente 40 × 40 mm.'), h('div.list.boxed', offs)) : null,
      btn('Guardar', async () => { await L.saveLabelCfg(c); toast('Impresoras y etiquetas guardadas en este ' + (desktop.on ? 'ordenador' : 'dispositivo'), 'ok'); }, { cls: 'primary' }));
    function SEC_RELOAD() { go('config/perfil'); setTimeout(() => go('config/etiquetas'), 30); }
  },
  // v12: Tienda web (sustituye a THE NOORKO). Lo de THE NOORKO no se borra: aquí se dice dónde está.
  tienda(b) {
    const pbox = h('div.col', { style: { gap: 'var(--gap)' } }), rbox = h('div.col'); b.append(pbox, rbox);
    import('./tienda.js').then(m => m.tiendaConfig(pbox)).catch(e => pbox.appendChild(h('p.bad-t', e.message)));
    if (can('config.editar')) api('espacios.retirados', {}, { quiet: true }).then(l => { l.forEach(w => rbox.appendChild(card('🗄️ ' + w.nombre + ' (retirado)', h('p.small', 'Ya no se usa como espacio de trabajo: lo sustituye la Tienda web. ', h('b', 'Sus datos no se han borrado'), '.'), w.libro ? h('a.small', { href: w.libro, target: '_blank', rel: 'noopener' }, 'Abrir su libro de Google (solo lectura recomendada) ↗') : h('p.small.muted', 'Nunca llegó a crearse su libro: no había datos.')))); }).catch(() => { });
  },

  // v11: MOTOR DE REGLAS — "Cuando pasa esto → avisar por…" (campana · Telegram · ventana flotante)
  automatizaciones(b) {
    const R = [['pedido_nuevo', '🛒 Entra un pedido nuevo'], ['pedido_web', '🛍️ Entra un pedido pagado en la tienda web'], ['reserva_wa', '⏳ Un pedido de la web por WhatsApp está a punto de caducar sin confirmar'], ['urgente', '⏰ Un pedido urgente, vence hoy o se ha vencido'], ['incidencia', '⚠️ Se marca una incidencia en un pedido'], ['pedido', '📦 Te asignan un pedido o cambia uno tuyo'],
      ['impresion_terminada', '🖨️ Una impresora debería haber terminado'], ['filamento_bajo', '🧵 Queda poco filamento / hay que comprar'], ['stock', '📦 Un producto baja del stock mínimo'], ['tarea', '✅ Te asignan una tarea o vence'],
      ['plataforma', '🟢 Llega un aviso de Wallapop, Vinted… (por email)'], ['mencion', '📣 Alguien te menciona en el chat (@nombre)'], ['mensaje_chat', '💬 Llega un mensaje al chat del equipo'], ['resumen', '☀️ Resumen de la mañana']];
    const c = JSON.parse(JSON.stringify(S.cfg.automatizaciones || {}));
    const tg = !!S.cfg.secretos.telegram;
    const rows = R.map(([k, t]) => {
      const r = c[k] = Object.assign({ app: true, telegram: true, popup: false }, c[k] || {});
      const tog = (f, dis) => h('label.switch' + (dis ? '.dis' : ''), { title: dis || '' }, h('input', { type: 'checkbox', checked: !!r[f], disabled: !!dis, onchange: e => { r[f] = e.target.checked; } }), h('span'));
      return h('tr', h('td', t), h('td.c', k === 'mensaje_chat' ? h('span.tiny.muted', '—') : tog('app')), h('td.c', k === 'mensaje_chat' ? h('span.tiny.muted', '—') : tog('telegram', tg ? '' : 'Configura antes el bot de Telegram')), h('td.c', tog('popup')));
    });
    b.append(h('p.small.muted', 'Cada fila es una regla: cuando pasa eso, avisa por donde marques. "Ventana" es el aviso flotante pequeño dentro de la app (cada persona puede apagarlos en su perfil).'),
      h('div.card', h('div.table-wrap', h('table.t.rules', h('thead', h('tr', h('th', 'Cuando…'), h('th.c', 'Campana'), h('th.c', 'Telegram'), h('th.c', 'Ventana'))), h('tbody', rows)))),
      h('div.row', btn('Guardar reglas', () => saveCfg('automatizaciones', Object.assign(c, { _editado: true })), { cls: 'primary' }), btn('Probar ventana', () => import('../popups.js').then(m => m.popup({ titulo: '🖨️ La P1P debería haber terminado', texto: 'Maceta Luna × 2 · márcala como terminada', enlace: 'hoy' }, true)), { cls: 'ghost' })));
  },
  perfil(b) {
    // v11: avisos flotantes de este dispositivo
    import('../popups.js').then(PM => {
      const p = PM.popupPrefs();
      const pos = sel([{ v: 'br', t: 'Abajo a la derecha' }, { v: 'tr', t: 'Arriba a la derecha' }, { v: 'bl', t: 'Abajo a la izquierda' }, { v: 'tl', t: 'Arriba a la izquierda' }], p.pos);
      const dur = sel([{ v: 4000, t: '4 segundos' }, { v: 6000, t: '6 segundos' }, { v: 10000, t: '10 segundos' }, { v: 20000, t: '20 segundos' }], String(p.ms));
      const op = inp({ type: 'range', min: 55, max: 100, step: 5, value: Math.round(p.opacity * 100) });
      let onV = p.on, snd = p.sound;
      const save = () => { PM.savePopupPrefs({ on: onV, pos: pos.value, ms: Number(dur.value), opacity: Number(op.value) / 100, sound: snd }); };
      [pos, dur, op].forEach(x => x.addEventListener('change', save));
      b.append(card('Avisos flotantes (este dispositivo)', h('label.check', sw(onV, v => { onV = v; save(); }), 'Mostrar ventanitas de aviso (chat, pedidos nuevos, impresiones…)'), h('label.check', sw(snd, v => { snd = v; save(); }), 'Con sonido suave'),
        h('div.form', field('Dónde', pos), field('Cuánto duran', dur), field('Transparencia', op, 'Más a la izquierda = más transparente')),
        btn('Probar', () => { save(); PM.popup({ titulo: '💬 Laura', texto: '¿Imprimo hoy la maceta luna blanca?', enlace: 'chat' }, true); }, { cls: 'sm', icon: 'bell' })));
    });
    const u = S.me;
    const nombre = inp({ value: u.nombre }), color = inp({ type: 'color', value: u.color || '#7c3aed', style: { width: '60px', padding: '2px' } });
    const pick = async k => { applyTheme(k); u.tema = k; try { await api('usuarios.editar', { id: u.id, tema: k }); } catch (e) { handleError(e); } SEC.perfil(mount(b, h('h2', 'Mi perfil'))) || null; };
    const tema = h('div.col', { style: { gap: '10px' } },
      h('div.seg', THEMES.filter(t => !t.premium).map(t => h('button' + ((u.tema || 'claro') === t.k ? '.on' : ''), { onclick: () => pick(t.k) }, t.t))),
      isAdminUser() ? h('div', h('div.lbl', { style: { margin: '4px 0 6px' } }, 'TEMAS PREMIUM · administradoras'),
        h('div.theme-cards', THEMES.filter(t => t.premium).map(t => h('button.theme-card.' + t.k + ((u.tema || '') === t.k ? '.on' : ''), { onclick: () => pick(t.k) }, h('span.sw'), h('b', t.t), h('span.tiny', t.d))))) : null);
    const foto = dropZone('foto', { title: 'Foto de perfil', single: true, multiple: false, entidad: 'usuarios', entidadId: u.id, onchange: items => { if (items.some(i => i.state === 'subido')) { toast('Foto actualizada', 'ok'); pull(); } } });
    const p1 = inp({ type: 'password', autocomplete: 'current-password' }), p2 = inp({ type: 'password', autocomplete: 'new-password' }), p3 = inp({ type: 'password', autocomplete: 'new-password' });
    const sessions = h('div');
    b.append(card(null, h('div.row', avatar(u, 'l'), h('div', h('h3', u.nombre), h('div.muted', u.usuario + ' · ' + roleName(u.rol)))),
      h('div.form', field('Nombre que ven los demás', nombre), field('Mi color', color)), btn('Guardar', async () => { try { const r = await api('usuarios.editar', { id: u.id, nombre: nombre.value.trim(), color: color.value }); Object.assign(S.me, r); emit(); toast('Perfil guardado', 'ok'); } catch (e) { handleError(e); } }, { cls: 'primary' })),
      card('Apariencia', tema, h('p.small.muted', 'Cada persona elige su tema; se aplica en todos sus dispositivos.')),
      card(null, foto.el),
      card('Cambiar contraseña', h('div.form', field('Contraseña actual', p1), h('div'), field('Nueva contraseña', p2, 'Mínimo 6 caracteres'), field('Repite la nueva', p3)),
        btn('Cambiar contraseña', async () => { const er = checkNewPassword(p2.value, p3.value); if (er) return toast(er, 'bad'); try { const act = await passHashes(p1.value); await api('usuarios.editar', Object.assign({ id: u.id }, await passHashes(p2.value), { phActual: act.ph, ph3Actual: act.ph3, passwordActual: p1.value })); p1.value = p2.value = p3.value = ''; toast('Contraseña cambiada', 'ok'); } catch (e) { toast(e.message, 'bad'); } })),
      card('Avisos en el móvil (Telegram)', S.cfg.secretos.telegram ? (u.telegram ? h('div.row', h('span.ok-t', '✅ Conectado'), btn('Desconectar', async () => { await api('telegram.desconectar', {}); u.telegram = false; emit(); toast('Telegram desconectado'); }, { cls: 'sm' })) : btn('Conectar mi Telegram', connectTelegram, { cls: 'primary' })) : h('p.small.muted', 'Una administradora tiene que configurar primero el bot de Telegram.')),
      card('Sesiones abiertas', sessions),
      btn('Cerrar sesión en este dispositivo', async () => { await logout(); start(); }, { icon: 'logout', cls: 'danger' }));
    api('usuarios.sesiones', {}).then(list => mount(sessions, h('div.list', list.map(s => h('div.item', { style: { cursor: 'default' } }, icon('phone', 's'), h('div.grow', h('div', s.dispositivo || 'Dispositivo', s.actual ? pill('Este', 'brand') : null), h('div.tiny.muted', 'Desde ' + fdt(s.creado) + ' · activo ' + ago(s.visto)))))),
      list.length > 1 ? btn('Cerrar las demás sesiones', async () => { await api('usuarios.cerrarSesiones', {}); toast('Sesiones cerradas', 'ok'); SEC.perfil(mount(b, h('h2', 'Mi perfil'))); }, { cls: 'sm' }) : null)).catch(() => { });
  },
  async dispositivo(b) {
    b.append(card(null, h('dl.kv', h('dt', 'Versión de la app'), h('dd', APP_VERSION), h('dt', 'Dispositivo'), h('dd', S.device), h('dt', 'Servidor'), h('dd', h('span.small', S.server.replace(/(macros\/s\/.{8}).+(\/exec)/, '$1…$2'))), h('dt', 'Última sincronización'), h('dd', S.lastSync ? ago(S.lastSync) : '—'), h('dt', 'Cambios sin enviar'), h('dd', String(S.queue.length))),
      h('div.row.wrap', btn('Sincronizar ahora', () => pull(true).then(() => toast('Datos actualizados', 'ok')), { icon: 'refresh' }),
        S.queue.length ? btn('Descartar cambios pendientes', async () => { if (await confirmDlg('Descartar cambios', 'Se perderán ' + S.queue.length + ' cambios hechos sin conexión que no se han podido enviar. ¿Seguro?', 'Descartar', true)) { await dropQueue(); toast('Descartados'); } }, { cls: 'danger' }) : null)));
    if (!desktop.on) return b.append(h('p.small.muted', 'Las opciones de carpetas, copias locales e IA local están en el programa de escritorio de Windows.'));
    const root = inp({ value: (await desktop.getConfig('productRoot')) || '', placeholder: 'C:\\Users\\…\\Desktop\\CELEBRIDISENOS o \\\\PC1\\CELEBRIDISENOS' });
    const info = await desktop.info().catch(() => ({}));
    const upd = h('div');
    b.append(card('Carpeta de productos de este ordenador', h('p.small.muted', 'Donde están las carpetas de productos y STL. En el segundo ordenador, pon la ruta de red a la carpeta del primero (p. ej. \\\\NOMBRE-PC\\CELEBRIDISENOS).'), field('Ruta', root),
      h('div.row', btn('Elegir…', async () => { const r = await desktop.pickFolder().catch(e => toast(e.message, 'bad')); if (r && r.path) root.value = r.path; }, { icon: 'folder' }), btn('Guardar', async () => { try { await desktop.list(root.value.trim()); await desktop.setConfig('productRoot', root.value.trim()); toast('Carpeta guardada', 'ok'); } catch (e) { toast('No puedo abrir esa carpeta: ' + e.message, 'bad'); } }, { cls: 'primary' }))),
      card('Copias locales en este PC', h('p.small.muted', 'Cada día se guarda aquí una copia de todos los datos (por si algún día fallara Google). Carpeta: ' + (info.backupDir || '—')), h('div.row', btn('Hacer copia ahora', async () => { try { await desktop.backup(await api('copias.exportar', {})); toast('Copia local guardada', 'ok'); } catch (e) { handleError(e); } }, { icon: 'archive' }), info.backupDir ? btn('Abrir carpeta', () => desktop.open(info.backupDir), { icon: 'folder' }) : null)),
      card('Actualizaciones', upd, (() => { const repo = inp({ placeholder: 'usuario/celebridisenos' }); desktop.getConfig('updateRepo').then(v => { repo.value = v || ''; }); return h('details.more', h('summary', 'Dónde buscar las versiones nuevas'), h('div.in.col', field('Repositorio de GitHub (usuario/repositorio)', repo, 'Lo explica la guía (Parte D). Solo hay que ponerlo una vez en cada PC.'), btn('Guardar', async () => { await desktop.setConfig('updateRepo', repo.value.trim()); toast('Guardado', 'ok'); }, { cls: 'sm' }))); })())
      , card('IA local', h('p.small', 'El motor de IA, los modelos y el hardware de este PC se gestionan en ', h('a', { href: '#/config/ia' }, 'Configuración → IA local y modelos'), '.')));
    mount(upd, h('p.small.muted', 'Versión instalada: ' + (info.version || '?') + ' · comprobando…'));
    desktop.update().then(r => mount(upd, rollbackBox(r), r.nueva ? h('div.col', h('p', '🎉 Nueva versión disponible: ' + r.version), r.notas ? h('p.small.muted', r.notas) : null, btn('Actualizar ahora', async ev => { ev.target.closest('button').disabled = true; try { await desktop.applyUpdate(); toast('Actualizando… el programa se reiniciará', 'ok'); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'download' })) : h('p.small', '✅ Tienes la última versión (' + (info.version || '') + ').')))
      .catch(e => mount(upd, h('p.small.muted', 'No se pudo comprobar: ' + e.message)));
  },
  movil(b) {
    // Una dirección de la página del código (github.com/…) no sirve para instalar: se usa la publicada
    const saved = localStorage.getItem('cd.appUrl') || '';
    const base = (S.cfg.appUrl || (saved && !/^https:\/\/github\.com\//i.test(saved) ? saved : '') || (location.protocol === 'https:' ? location.origin + location.pathname : '') || (S.cfg.invitaciones && S.cfg.invitaciones.appUrl)) || '';
    const urlI = inp({ value: base, placeholder: 'https://vuestro-usuario.github.io/celebridisenos/' });
    const qrBox = h('div');
    const drawQr = () => {
      const u = urlI.value.trim();
      if (!/^https:\/\//.test(u)) return mount(qrBox, h('p.small.muted', 'Escribe la dirección donde está publicada la app (la guía explica cómo publicarla gratis en GitHub).'));
      localStorage.setItem('cd.appUrl', u);
      const link = u + (u.includes('?') ? '&' : '?') + 's=' + encodeURIComponent(S.server);
      mount(qrBox, h('div.row.wrap.top', { style: { gap: '20px' } }, h('div', { html: qrSvg(link, 5), style: { background: '#fff', padding: '8px', borderRadius: '12px', lineHeight: 0 } }),
        h('div.col.grow', h('ol', { style: { paddingLeft: '18px', margin: 0 } }, h('li', 'Abre la cámara del móvil y apunta a este código.'), h('li', 'Toca el enlace que aparece.'), h('li', 'Entra con tu usuario y contraseña.'), h('li', 'Instálala: en iPhone, Compartir → "Añadir a pantalla de inicio". En Android, menú ⋮ → "Instalar aplicación".')),
          h('div.row.wrap', btn('Copiar enlace', () => copyText(link), { icon: 'copy', cls: 'sm' }), navigator.share ? btn('Compartir', () => navigator.share({ title: 'CelebriDiseños', url: link }).catch(() => { }), { icon: 'send', cls: 'sm' }) : null))));
    };
    urlI.addEventListener('change', drawQr);
    b.append(card(null, h('p', 'La app del móvil es la misma que la del ordenador, con los mismos datos. Se instala desde el navegador con su propio icono y funciona sin conexión.'), field('Dirección de la app', urlI), qrBox));
    drawQr();
  },
  empresa(b) {
    const e = S.cfg.empresa;
    const f = { nombre: inp({ value: e.nombre }), email: inp({ value: e.email, type: 'email' }), telefono: inp({ value: e.telefono }), web: inp({ value: e.web }) };
    let logo = e.logo || '';
    const prev = h('div.logo-prev');
    const drawLogo = () => mount(prev, h('img', { src: logo || 'icons/icon-192.png', alt: 'Logo' }), h('div.tiny.muted', logo ? 'Tu logo' : 'Logo provisional (sin logo propio)'));
    drawLogo();
    const fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', style: { display: 'none' }, onchange: async () => { const file = fi.files[0]; fi.value = ''; if (!file) return; try { logo = await logoDataUrl(file); drawLogo(); toast('Logo listo: pulsa Guardar', 'ok'); } catch (err) { toast(err.message, 'bad'); } } });
    b.append(card('Logo de la empresa', h('div.row.wrap', prev, h('div.col', h('p.small.muted', 'Se usa en la barra lateral, en la pantalla de entrada y en los informes. PNG con fondo transparente o SVG, cuadrado. Se ajusta solo al tamaño.'), h('div.row.wrap', btn(logo ? 'Cambiar logo' : 'Subir logo', () => fi.click(), { icon: 'upload' }), btn('Quitar logo', () => { logo = ''; drawLogo(); }, { cls: 'ghost' }), fi)))),
      card('Datos', h('div.form', field('Nombre', f.nombre), field('Email', f.email), field('Teléfono', f.telefono), field('Web / tienda', f.web))),
      btn('Guardar', async () => { if (await saveCfg('empresa', Object.assign({}, e, Object.fromEntries(Object.keys(f).map(k => [k, f[k].value.trim()])), { logo }))) { try { localStorage.setItem('cd.logo', logo); } catch (x) { } } }, { cls: 'primary' }));
  },
  async usuarios(b) {
    const box = h('div');
    const invBox = h('div');
    b.append(h('div.row.wrap', btn('🎟️ Invitar a alguien', () => inviteForm(), { cls: 'primary' }), btn('Nuevo usuario', () => userForm(), { icon: 'plus' })),
      h('p.tiny.muted', 'Con una invitación, la persona instala el programa en cualquier PC (o abre el enlace en el móvil), pega el mensaje y elige su propia contraseña.'), box, invBox);
    // v10: contraseñas olvidadas → código de un solo uso (la contraseña nunca se ve)
    const recBox = h('div'); b.insertBefore(recBox, box);
    const drawRec = async () => {
      let list = []; try { list = await api('usuarios.recuperaciones', {}); } catch (e) { }
      const pend = list.filter(r => r.estado === 'pendiente');
      mount(recBox, pend.length ? h('div.card', { style: { marginBottom: '14px', borderColor: 'var(--warn)' } }, h('b', '🔑 Han olvidado su contraseña'),
        h('div.list', pend.map(r => h('div.item', { style: { cursor: 'default' } }, h('div.grow', h('b', r.usuario), h('div.tiny.muted', ago(r.creado))), btn('Dar código', () => giveCode(r.userId), { cls: 'primary sm' }))))) : null);
    };
    async function giveCode(userId) {
      try {
        const r = await api('usuarios.codigoRecuperacion', { userId });
        modal('Código de recuperación', h('div.col', h('p.small', 'Dáselo a ', h('b', r.usuario), ' en persona o por teléfono. Con él elegirá una contraseña NUEVA en "¿Has olvidado tu contraseña?". Caduca en ' + r.minutos + ' minutos y sirve una sola vez.'), h('div.inv-code', r.codigo), h('p.tiny.muted', 'Nadie puede ver la contraseña antigua ni la nueva.')), close => [btn('Copiar', () => copyText(r.codigo), { icon: 'copy' }), btn('Hecho', close, { cls: 'primary' })], { size: 'narrow' });
        drawRec();
      } catch (e) { toast(e.message, 'bad'); }
    }
    const drawInv = async () => {
      let list = [];
      try { list = await api('invitaciones.lista', {}); } catch (e) { return mount(invBox); }
      if (!list.length) return mount(invBox);
      const tone = { pendiente: 'brand', usada: 'ok', caducada: '', anulada: 'bad' };
      mount(invBox, h('h3', { style: { margin: '18px 0 6px' } }, 'Invitaciones'), h('div.list.boxed', list.slice(0, 20).map(x => h('div.item', { style: { cursor: 'default' } },
        h('div.grow', h('div.bold', x.nombre, ' ', pill(x.estado, tone[x.estado])), h('div.tiny.muted', x.rolNombre + ' · …' + x.pista + ' · por ' + x.creadoPor + ' ' + ago(x.creado) + (x.estado === 'usada' ? ' · usuario "' + x.usuario + '" desde ' + (x.dispositivo || '?') : x.estado === 'pendiente' ? ' · caduca ' + fdt(x.caduca) : ''))),
        x.estado === 'pendiente' ? btn('Anular', async () => { try { await api('invitaciones.anular', { id: x.id }); toast('Invitación anulada', 'ok'); drawInv(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm danger' }) : null))));
    };
    function inviteForm() {
      const roles = S._roles || [];
      const f = { nombre: inp({ placeholder: 'Ej.: Marta López' }), rol: rolePicker(roles, 'trabajador'), horas: sel([{ v: 24, t: '1 día' }, { v: 48, t: '2 días' }, { v: 168, t: '1 semana' }], 48) };
      modal('🎟️ Invitar a alguien', h('div.form', field('Nombre', f.nombre), field('Rol', f.rol, 'Lo que podrá ver y hacer. Se puede cambiar después.', 'full'), field('La invitación caduca en', f.horas)),
        close => [h('span.grow'), btn('Cancelar', close), btn('Crear invitación', async ev => {
          const bt = ev.target.closest('button');
          if (!f.nombre.value.trim()) return toast('Escribe el nombre', 'bad');
          bt.disabled = true;
          try { const r = await api('invitaciones.crear', { nombre: f.nombre.value.trim(), rol: f.rol.value, horas: Number(f.horas.value) }); close(); showInvite(r); drawInv(); }
          catch (e) { bt.disabled = false; toast(e.message, 'bad'); }
        }, { cls: 'primary' })], { size: 'wide' });
      setTimeout(() => f.nombre.focus(), 50);
    }
    function showInvite(r) {
      const appUrl = String(r.appUrl || S.cfg.appUrl || '').replace(/\/?$/, '/');
      const link = appUrl + '?s=' + encodeURIComponent(S.server) + '&inv=' + r.codigo;
      const cad = new Date(r.invitacion.caduca).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const text = '¡Hola ' + r.invitacion.nombre.split(' ')[0] + '! Te invito a ' + (r.empresa || 'CelebriDiseños') + ' 🎉\n\n' +
        '💻 En el ordenador:\n1. Descarga e instala el programa: ' + r.descarga + '\n2. Ábrelo y pulsa «Tengo una invitación».\n3. Pega ESTE MENSAJE ENTERO y elige tu usuario y contraseña.\n\n' +
        '📱 En el móvil: abre este enlace:\n' + link + '\n\n' +
        'Código: ' + r.codigo + '\nServidor: ' + S.server + '\n(Sirve una sola vez y caduca el ' + cad + '.)';
      modal('Invitación para ' + r.invitacion.nombre, h('div.col',
        h('p.small', 'Manda este mensaje a ', h('b', r.invitacion.nombre), ' (WhatsApp, Telegram o email). ', h('b', 'El código solo se ve ahora:'), ' si lo pierdes, anula esta invitación y crea otra.'),
        h('div.inv-code', r.codigo),
        h('div.row.wrap.top', { style: { gap: '16px' } }, h('div', { html: qrSvg(link, 4), style: { background: '#fff', padding: '8px', borderRadius: '12px', lineHeight: 0 }, title: 'Para el móvil: escanear con la cámara' }),
          h('div.col.grow', h('div.inv-msg', text), h('p.tiny.muted', 'El QR es para el móvil: se escanea con la cámara y se une directamente.')))),
        close => [btn('Copiar mensaje', () => copyText(text), { icon: 'copy', cls: 'primary' }),
          navigator.share ? btn('Compartir', () => navigator.share({ title: 'Invitación a ' + (r.empresa || 'CelebriDiseños'), text }).catch(() => { }), { icon: 'send' }) : null,
          btn('WhatsApp', () => desktop.openUrl('https://wa.me/?text=' + encodeURIComponent(text))),
          h('span.grow'), btn('Hecho', close)], { size: 'wide' });
    }
    const drawU = async () => {
      const list = await api('usuarios.lista', {});
      mount(box, h('div.list.boxed', list.map(u => h('div.item', { onclick: () => userForm(u) }, avatar(u), h('div.grow', h('div.bold', u.nombre, !u.activo ? pill('Desactivado') : null, u.bloqueadoHasta && u.bloqueadoHasta > new Date().toISOString() ? pill('Bloqueado', 'bad') : null), h('div.tiny.muted', u.usuario + ' · ' + roleName(u.rol) + ' · último acceso ' + (u.ultimoAcceso ? ago(u.ultimoAcceso) : 'nunca'))), icon('right', 's')))));
    };
    function userForm(u) {
      const isNew = !u;
      u = u || { rol: 'trabajador', activo: true };
      const roles = S._roles || [];
      const f = { nombre: inp({ value: u.nombre || '' }), usuario: inp({ value: u.usuario || '', disabled: !isNew, autocapitalize: 'off' }), rol: rolePicker(roles, u.rol), password: inp({ type: 'password', placeholder: isNew ? 'Contraseña inicial' : 'Déjalo vacío para no cambiarla', autocomplete: 'new-password' }) };
      if (isNew) f.nombre.addEventListener('input', () => { f.usuario.value = f.nombre.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.'); });
      let activo = u.activo !== false;
      modal(isNew ? 'Nuevo usuario' : u.nombre, h('div.col', h('div.form', field('Nombre', f.nombre), field('Usuario', f.usuario), field(isNew ? 'Contraseña' : 'Nueva contraseña', f.password, isNew ? 'Mínimo 6 caracteres. Podrá cambiarla desde su perfil.' : ''), field('Rol', f.rol, 'Qué puede ver y hacer. Los permisos de cada rol se ajustan en Roles y permisos.', 'full')), !isNew ? h('label.check', sw(activo, v => { activo = v; }), 'Usuario activo (si lo desactivas, no podrá entrar y se cierran sus sesiones)') : null),
        close => [!isNew && u.id !== S.me.id ? btn('Eliminar usuario', () => { close(); delUser(u); }, { cls: 'ghost danger', icon: 'trash' }) : null, !isNew ? btn('Código de recuperación', () => { close(); giveCode(u.id); }, { cls: 'ghost', icon: 'key' }) : null, !isNew ? btn('Cerrar sus sesiones', async () => { await api('usuarios.cerrarSesiones', { userId: u.id }); toast('Sesiones cerradas', 'ok'); }, { cls: 'ghost' }) : null, h('span.grow'), btn('Cancelar', close), btn('Guardar', async () => {
          try {
            if (f.password.value || isNew) { const er = checkNewPassword(f.password.value); if (er) return toast(er, 'bad'); }
            if (isNew) await api('usuarios.crear', { nombre: f.nombre.value.trim(), usuario: f.usuario.value.trim(), rol: f.rol.value, ...(await passHashes(f.password.value)) });
            else { const d = { id: u.id, nombre: f.nombre.value.trim(), rol: f.rol.value, activo }; if (f.password.value) Object.assign(d, await passHashes(f.password.value)); await api('usuarios.editar', d); }
            close(); toast('Usuario guardado', 'ok'); drawU(); pull();
          } catch (e) { toast(e.message, 'bad'); }
        }, { cls: 'primary' })], { size: 'wide' });
    }
    // v11.8: eliminar sin perder nada (pedidos, ventas, gastos, documentos, movimientos y auditoría se quedan)
    function delUser(u) {
      const conf = inp({ placeholder: u.usuario, autocapitalize: 'off', autocomplete: 'off' }), anon = h('input', { type: 'checkbox' }), motivo = inp({ placeholder: 'Opcional' });
      modal('Eliminar a ' + u.nombre, h('div.col',
        h('p.small', 'Pierde el ACCESO: no podrá entrar, se cierran sus sesiones y se borran su contraseña, su Telegram y su foto. Deja de salir en las listas.'),
        h('p.small.ok-t', '✓ NO se borra nada del negocio: sus pedidos, ventas, gastos, documentos, movimientos y la auditoría se conservan (con su nombre, que es lo que pasó).'),
        h('p.tiny.muted', 'Si solo quieres que no entre durante un tiempo, mejor «Desactivar» (se puede volver a activar).'),
        h('label.check', anon, 'Anonimizar su nombre en la ficha de usuario (los registros antiguos no se reescriben)'),
        field('Motivo', motivo), field('Para confirmar, escribe su usuario: ' + u.usuario, conf)),
      close => [btn('Cancelar', close), btn('Eliminar acceso', async () => {
        try { await api('usuarios.eliminar', { id: u.id, confirmar: conf.value.trim(), anonimizar: anon.checked, motivo: motivo.value }); close(); toast('Acceso eliminado. Sus registros se conservan.', 'ok'); drawU(); pull(); }
        catch (e) { toast(e.message, 'bad'); }
      }, { cls: 'danger' })], { size: 'narrow' });
    }
    S._roles = (await api('roles.lista', {})).roles;
    await drawU();
    drawInv();
    drawRec();
  },
  async roles(b) {
    const r = await api('roles.lista', {});
    const box = h('div.col');
    b.append(h('p.small.muted', 'Marca qué puede hacer cada rol. El rol Administrador siempre lo puede todo. Los cambios se aplican al momento en todos los dispositivos.'), box, btn('Nuevo rol', async () => { const n = await promptDlg('Nuevo rol', 'Nombre del rol', '', { placeholder: 'Ej.: Ayudante de producción' }); if (!n) return; try { await api('roles.guardar', { nombre: n, permisos: ['pedidos.ver', 'tareas.ver', 'noticias.ver'] }); SEC.roles(mount(b, h('h2', 'Roles y permisos'))); } catch (e) { toast(e.message, 'bad'); } }, { icon: 'plus' }));
    const groups = {};
    Object.keys(r.permisos).forEach(p => { const g = p.split('.')[0]; (groups[g] = groups[g] || []).push(p); });
    r.roles.forEach(role => {
      const perms = new Set(role.permisos);
      const all = perms.has('*');
      box.appendChild(h('details.more', h('summary', role.nombre, all ? pill('Todo', 'brand') : pill(role.permisos.length + ' permisos')), h('div.in',
        all ? h('p.small.muted', 'Acceso total. No se puede limitar.') : h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' } }, Object.keys(groups).map(g => h('div', h('div.lbl', { style: { margin: '8px 0 4px', textTransform: 'capitalize' } }, g), groups[g].map(p => h('label.check.small', { style: { padding: '3px 0' } }, h('input', { type: 'checkbox', checked: perms.has(p), onchange: e => { e.target.checked ? perms.add(p) : perms.delete(p); } }), r.permisos[p]))))),
        !all ? btn('Guardar ' + role.nombre, async () => { try { await api('roles.guardar', { id: role.id, nombre: role.nombre, permisos: [...perms] }); toast('Permisos guardados', 'ok'); pull(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'check' }) : null)));
    });
  },
  solicitudes(b) {
    const list = S.t.solicitudes.slice().sort((a, c) => String(c.creado).localeCompare(String(a.creado)));
    const pend = list.filter(s => s.estado === 'pendiente'), rest = list.filter(s => s.estado !== 'pendiente');
    const dur = sel([{ v: 30, t: '30 minutos' }, { v: 60, t: '1 hora' }, { v: 240, t: '4 horas' }, { v: 1440, t: '1 día' }, { v: 10080, t: '1 semana' }], 60);
    b.append(card('Pendientes (' + pend.length + ')', pend.length ? h('div.col', field('Duración del acceso si apruebas', dur), h('div.list.boxed', pend.map(s => h('div.item', { style: { cursor: 'default' } }, avatar(s.usuario), h('div.grow', h('div.bold', s.usuario + ' pide: ' + (S.cfg.permisos[s.permiso] || s.permiso)), h('div.tiny.muted', fdt(s.creado) + (s.seccion ? ' · ' + s.seccion : '') + (s.accion ? ' · ' + s.accion : '')), s.motivo ? h('div.small', '"' + s.motivo + '"') : null),
      btn('Rechazar', () => resolve(s, false), { cls: 'sm' }), btn('Aprobar', () => resolve(s, true), { cls: 'primary sm' }))))) : h('p.muted.small', 'No hay solicitudes pendientes.')),
      card('Historial', rest.length ? h('div.list', rest.slice(0, 100).map(s => h('div.item', { style: { cursor: 'default' } }, h('div.grow', h('div.small', h('b', s.usuario), ' · ' + (S.cfg.permisos[s.permiso] || s.permiso)), h('div.tiny.muted', fdt(s.creado) + ' · ' + s.estado + (s.resueltoPor ? ' por ' + s.resueltoPor : '') + (s.caduca ? ' · hasta ' + fdt(s.caduca) : ''))),
        pill(s.estado, s.estado === 'aprobada' ? 'ok' : s.estado === 'rechazada' ? 'bad' : ''), s.estado === 'aprobada' && s.caduca > new Date().toISOString() ? btn('Retirar ya', async () => { await api('solicitudes.revocar', { id: s.id }); toast('Acceso retirado', 'ok'); pull(); }, { cls: 'sm danger' }) : null))) : h('p.muted.small', 'Sin historial.')));
    async function resolve(s, ok) { try { await api('solicitudes.resolver', { id: s.id, aprobar: ok, minutos: Number(dur.value) }); toast(ok ? 'Acceso concedido' : 'Solicitud rechazada', 'ok'); await pull(); SEC.solicitudes(mount(b, h('h2', 'Solicitudes de acceso'))); } catch (e) { toast(e.message, 'bad'); } }
  },
  pedidos(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.pedidos));
    const plazo = inp({ type: 'number', min: 0, value: c.plazoDias }), aviso = inp({ type: 'number', min: 0, value: c.avisoDias });
    const canales = area({ value: c.canales.join('\n'), style: { minHeight: '120px' } }), envios = area({ value: c.envios.join('\n'), style: { minHeight: '120px' } });
    let auto = !!c.autoTareas;
    const states = h('div.list.boxed', c.estados.map(s => { const col = inp({ type: 'color', value: s.c, style: { width: '46px', padding: '2px', minHeight: '32px' }, oninput: e => { s.c = e.target.value; } }); return h('div.item', { style: { cursor: 'default' } }, col, h('span.grow', s.k), s.hint ? h('span.tiny.muted', s.hint) : null); }));
    b.append(card('Plazos', h('div.form', field('Plazo por defecto (días)', plazo, 'Se propone al crear un pedido'), field('Avisar cuando queden (días)', aviso, '"Próximo a vencer"')), h('label.check', sw(auto, v => { auto = v; }), 'Crear una tarea automática cuando un pedido esté a punto de vencer')),
      card('Estados', h('p.small.muted', 'Los nombres de los estados son fijos para que el Sheet, el móvil y la IA hablen el mismo idioma. Puedes cambiar sus colores.'), states),
      card('Listas', h('div.form', field('Canales / tiendas (uno por línea)', canales), field('Métodos de envío (uno por línea)', envios))),
      btn('Guardar', () => saveCfg('pedidos', Object.assign(c, { plazoDias: Number(plazo.value) || 0, avisoDias: Number(aviso.value) || 0, autoTareas: auto, canales: lines(canales.value), envios: lines(envios.value) })), { cls: 'primary' }));
  },
  clientes(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.clientes));
    const f = { minPedidos: inp({ type: 'number', min: 0, value: c.frecuente.minPedidos }), minGasto: inp({ type: 'number', min: 0, value: c.frecuente.minGasto }), modo: sel([{ v: 'o', t: 'Basta con cumplir una' }, { v: 'y', t: 'Tiene que cumplir las dos' }], c.frecuente.modo), ventana: inp({ type: 'number', min: 0, value: c.frecuente.ventanaDias }),
      alto: inp({ type: 'number', min: 0, value: c.altoValor.minGasto }), inactivo: inp({ type: 'number', min: 0, value: c.inactivoDias }), incid: inp({ type: 'number', min: 1, value: c.incidenciasAviso }) };
    const extra = h('div.list.boxed');
    const drawExtra = () => mount(extra, c.camposExtra.length ? c.camposExtra.map((x, i) => h('div.item', { style: { cursor: 'default' } }, h('span.grow', x.nombre), pill({ texto: 'Texto', si_no: 'Sí/No', numero: 'Número', fecha: 'Fecha' }[x.tipo]), btn('', () => { c.camposExtra.splice(i, 1); drawExtra(); }, { cls: 'ghost icon sm', icon: 'x' }))) : h('div.item.muted.small', 'Sin campos personalizados'));
    drawExtra();
    b.append(card('¿Cuándo es un cliente frecuente?', h('div.form', field('Nº mínimo de pedidos', f.minPedidos, '0 = no se usa'), field('Gasto mínimo (€)', f.minGasto, '0 = no se usa'), field('Regla', f.modo), field('Contar solo los últimos (días)', f.ventana, '0 = desde siempre')),
      h('p.small.muted', 'Se aplica al momento en la app y en la columna "Cliente habitual" del Sheet.')),
      card('Otras etiquetas', h('div.form', field('"Alto valor" a partir de (€)', f.alto), field('"Hace tiempo que no compra" tras (días)', f.inactivo), field('Avisar con incidencias ≥', f.incid))),
      card('Campos personalizados de la ficha', h('p.small.muted', 'Añade datos propios, como "Color favorito" o "Cliente VIP". Aparecen en "Información adicional".'), extra,
        btn('Añadir campo', async () => { const n = await promptDlg('Nuevo campo', 'Nombre del campo', '', { placeholder: 'Color favorito' }); if (!n) return; const t = await new Promise(res => { const s = sel([{ v: 'texto', t: 'Texto' }, { v: 'si_no', t: 'Sí / No' }, { v: 'numero', t: 'Número' }, { v: 'fecha', t: 'Fecha' }], 'texto'); modal('Tipo de "' + n + '"', field('Tipo', s), cl => [btn('Añadir', () => { res(s.value); cl(); }, { cls: 'primary' })], { size: 'narrow', onclose: () => res(null) }); }); if (!t) return; c.camposExtra.push({ id: n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'), nombre: n, tipo: t }); drawExtra(); }, { icon: 'plus', cls: 'sm' })),
      btn('Guardar', () => saveCfg('clientes', Object.assign(c, { frecuente: { minPedidos: Number(f.minPedidos.value) || 0, minGasto: Number(f.minGasto.value) || 0, modo: f.modo.value, ventanaDias: Number(f.ventana.value) || 0 }, altoValor: { minGasto: Number(f.alto.value) || 0 }, inactivoDias: Number(f.inactivo.value) || 0, incidenciasAviso: Number(f.incid.value) || 2 })), { cls: 'primary' }));
  },
  precios(b) {
    if (!S.cfg.precios) return b.append(lockBox('productos.costes', 'precios'));
    const c = JSON.parse(JSON.stringify(S.cfg.precios));
    let fromSheet = !!c.desdeSheet;
    const L = [['iva', 'IVA', '%'], ['margen', 'Margen objetivo', '%'], ['margenMin', 'Margen mínimo (regateo)', '%'], ['segundaMano', 'Descuento 2ª mano', '%'], ['manoObraHora', 'Mano de obra (€/h) · solo si indicas trabajo adicional', '€'], ['luzHora', 'Luz por hora de impresora (€/h)', '€'], ['costeKg', 'Filamento por defecto (€/kg)', '€'], ['vinted', 'Comisión Vinted', '%'], ['etsyVenta', 'Etsy: comisión venta', '%'], ['etsyPago', 'Etsy: procesamiento pago', '%'], ['etsyFijo', 'Etsy: fijo por pago (€)', '€'], ['etsyReg', 'Etsy: coste regulatorio', '%'], ['etsyAnuncioUSD', 'Etsy: anuncio ($)', '$'], ['usdEur', 'Cambio USD → EUR', ''], ['embalaje', 'Embalaje por unidad (€)', '€'], ['envio', 'Envío que pagáis vosotros (€)', '€']];
    const f = {};
    L.forEach(x => { f[x[0]] = inp({ type: 'number', step: 'any', value: x[2] === '%' ? +(c[x[0]] * 100).toFixed(3) : c[x[0]] }); });
    b.append(card(null, h('label.check', sw(fromSheet, v => { fromSheet = v; }), 'Usar los valores de la hoja "Configuracion" del Google Sheet (recomendado: así el Excel y la app calculan igual)'),
      btn('Leer ahora del Sheet', async () => { try { await api('precios.recargar', {}); await pull(true); toast('Precios actualizados desde el Sheet', 'ok'); SEC.precios(mount(b, h('h2', 'Precios y comisiones'))); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm', icon: 'refresh' })),
      card('Valores', h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' } }, L.map(x => field(x[1] + (x[2] === '%' ? ' (%)' : ''), f[x[0]]))), h('p.small.muted', 'Si usas el Sheet, estos valores se leen de allí y cambiarlos aquí no tiene efecto.')),
      btn('Guardar', () => { const v = Object.assign({}, c, { desdeSheet: fromSheet }); L.forEach(x => { const n = Number(f[x[0]].value); v[x[0]] = x[2] === '%' ? n / 100 : n; }); saveCfg('precios', v); }, { cls: 'primary' }));
    // v10: formato del SKU automático
    const sk = S.cfg.sku || {};
    const fmt = inp({ value: sk.formato || '{CAT}-{NUM4}', placeholder: '{MARCA}-{CAT}-{NUM3}' }), marca = inp({ value: sk.marca || '', placeholder: 'Ej.: CELEBRI' });
    const ej = h('b'), upd = () => { ej.textContent = (fmt.value || '{CAT}-{NUM4}').replace(/\{MARCA\}/g, (marca.value || 'MARCA').toUpperCase()).replace(/\{CAT\}/g, 'TSH').replace(/\{AÑO\}/g, String(new Date().getFullYear())).replace(/\{NUM3\}/g, '001').replace(/\{NUM4\}/g, '0001'); };
    [fmt, marca].forEach(x => x.addEventListener('input', upd)); upd();
    b.append(card('Código SKU de los productos nuevos', h('div.form', field('Formato', fmt, 'Piezas: {MARCA} {CAT} (3 letras de la categoría) {AÑO} {NUM3} {NUM4}'), field('Marca', marca)),
      h('p.small', 'Ejemplo: ', ej), h('p.small.muted', 'Solo afecta a los productos nuevos. Los que ya existen conservan su código. Nunca se repite.'),
      btn('Guardar formato', () => saveCfg('sku', { formato: fmt.value.trim() || '{CAT}-{NUM4}', marca: marca.value.trim().toUpperCase() }), { cls: 'primary' })));
    // v11: centro financiero (impuestos estimados)
    const fz = Object.assign({ repercuteIva: true, irpf: 0.2 }, S.cfg.finanzas || {});
    let rep = fz.repercuteIva !== false;
    const irpf = inp({ type: 'number', min: 0, max: 50, step: 1, value: Math.round(fz.irpf * 100) });
    b.append(card('Impuestos estimados (centro financiero)', h('label.check', sw(rep, v => { rep = v; }), 'Mis precios incluyen IVA que pago a Hacienda (autónomo en régimen general)'),
      h('div.form', field('IRPF que reservo (%)', irpf, 'Para calcular el beneficio neto. Lo habitual: 20 % (15 % los primeros años).')), h('p.small.muted', 'Son estimaciones para saber cuánto te queda de verdad. No sustituyen a tu gestor.'),
      btn('Guardar', () => saveCfg('finanzas', { repercuteIva: rep, irpf: (Number(irpf.value) || 0) / 100 }), { cls: 'primary' })));
  },
  ia(b) {
    const panel = h('div');
    b.append(h('p.small.muted', 'Vuestra IA funciona en vuestros ordenadores con modelos abiertos (Ollama). No necesita ninguna clave ni cuenta externa y los datos no salen de casa.'), panel);
    iaPanel(panel);
    if (!can('config.editar')) return;
    const c = JSON.parse(JSON.stringify(S.cfg.ia));
    let semanal = c.informeSemanal !== false, equipo = c.servidorEquipo !== false;
    const perfil = sel([{ v: 'auto', t: 'Automático según el hardware (recomendado)' }, { v: 'rapido', t: 'Rápido' }, { v: 'equilibrado', t: 'Equilibrado' }, { v: 'inteligente', t: 'Inteligente' }], c.perfil || 'auto');
    const temp = sel([{ v: 0.1, t: 'Muy precisa (0,1)' }, { v: 0.3, t: 'Equilibrada (0,3)' }, { v: 0.6, t: 'Más creativa para textos (0,6)' }], c.temperatura || 0.3);
    b.append(card('Ajustes para todo el equipo', h('div.form', field('Modelo por defecto en los PC', perfil, 'Cada PC puede elegir el suyo arriba.'), field('Estilo de las respuestas', temp)),
      h('label.check', sw(equipo, v => { equipo = v; }), 'Permitir que un PC con IA responda a los móviles y a los ordenadores sin IA'),
      h('label.check', sw(semanal, v => { semanal = v; }), 'Enviar un informe semanal los lunes (solo con datos reales)'),
      h('p.small.muted', 'Las revisiones automáticas cada 15 minutos (plazos, stock, precios bajo coste, tareas, redes) funcionan siempre, aunque no haya IA: son reglas fijas y fiables.'),
      btn('Guardar', () => saveCfg('ia', Object.assign(c, { perfil: perfil.value, temperatura: Number(temp.value), servidorEquipo: equipo, informeSemanal: semanal })), { cls: 'primary' })));
  },
  biblioteca(b) { const box = h('div'); b.append(box); bibliotecaView(box); },
  memoria(b) { const box = h('div'); b.append(box); memoriaView(box); },
  alertas(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.alertas || {}));
    const f = { margen: inp({ type: 'number', min: 0, max: 90, value: Math.round((c.margenMinimo ?? 0.15) * 100) }), inactivo: inp({ type: 'number', min: 1, value: c.clienteInactivoDias || 120 }), caida: inp({ type: 'number', min: 5, max: 90, value: Math.round((c.caidaVentas ?? 0.25) * 100) }) };
    let stock = c.stockBajo !== false;
    b.append(card(null, h('p.small.muted', 'Las alertas aparecen en el Inicio y, las importantes, como aviso. Nunca cambian datos: solo avisan.'),
      h('div.form', field('Avisar si el margen baja del (%)', f.margen), field('Cliente inactivo tras (días sin comprar)', f.inactivo), field('Avisar si las ventas caen más de un (%)', f.caida, 'Últimos 30 días frente a los 30 anteriores')),
      h('label.check', sw(stock, v => { stock = v; }), 'Avisar de stock bajo (pestaña Stock: disponible por debajo del mínimo)'),
      h('p.small', 'También se avisa de: precios por debajo del coste, pedidos vencidos o sin revisar, números de pedido repetidos, documentos pendientes de revisar y otras anomalías.'),
      btn('Guardar', () => saveCfg('alertas', { margenMinimo: (Number(f.margen.value) || 0) / 100, clienteInactivoDias: Number(f.inactivo.value) || 120, caidaVentas: (Number(f.caida.value) || 25) / 100, stockBajo: stock }), { cls: 'primary' })));
  },
  facturacion(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.facturacion || {}));
    const F = [['razonSocial', 'Nombre o razón social *', 'Tal como aparece en Hacienda'], ['nif', 'NIF / CIF *', ''], ['direccion', 'Dirección', 'Calle, número, piso'], ['cp', 'Código postal', ''], ['ciudad', 'Ciudad', ''], ['provincia', 'Provincia', ''], ['email', 'Email para facturas', ''], ['telefono', 'Teléfono', '']];
    const f = {}; F.forEach(([k]) => { f[k] = inp({ value: c[k] || '' }); });
    const iva = sel([{ v: 0.21, t: '21 %' }, { v: 0.10, t: '10 %' }, { v: 0.04, t: '4 %' }, { v: 0, t: '0 %' }], Number(c.tipoIva ?? 0.21));
    const val = inp({ type: 'number', min: 1, max: 365, value: c.validezPresupuesto || 15 });
    const pie = area({ value: c.pie || '', placeholder: 'Ej.: Inscrita en… · IBAN para transferencias… · Régimen de…' });
    const cond = area({ value: c.condiciones || '' });
    b.append(card(null, h('p.small.muted', 'Salen en las facturas, los presupuestos y como remitente en las etiquetas de envío. Los precios de la app llevan el IVA incluido.'),
      h('div.form', F.map(([k, l, hint]) => field(l, f[k], hint || null)), field('IVA de tus ventas', iva), field('Validez de los presupuestos (días)', val), field('Pie de las facturas', pie, null, 'full'), field('Condiciones de los presupuestos', cond, null, 'full')),
      h('p.tiny.muted', 'Numeración: F2026-0001 (factura completa, con NIF del cliente), FS2026-0001 (simplificada, sin NIF) y R2026-0001 (rectificativas). Consulta con tu gestor si necesitas otra serie.'),
      btn('Guardar', () => { const v = {}; F.forEach(([k]) => { v[k] = f[k].value.trim(); }); if (v.nif) v.nif = v.nif.toUpperCase().replace(/[\s-]/g, ''); saveCfg('facturacion', Object.assign(c, v, { tipoIva: Number(iva.value), validezPresupuesto: Number(val.value) || 15, pie: pie.value.trim(), condiciones: cond.value.trim() })); }, { cls: 'primary' })));
  },
  taller(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.taller || {}));
    const a1 = inp({ type: 'number', min: 0, step: 10, value: c.avisoGramos ?? 150 }), a2 = inp({ type: 'number', min: 0, step: 50, value: c.avisoColorGramos ?? 300 });
    b.append(card(null, h('p.small.muted', 'Cuándo avisar de que queda poco filamento. Al bajar del mínimo de un color, se añade solo a la lista de la compra.'),
      h('div.form', field('Avisar cuando a una bobina le queden (g)', a1), field('Comprar cuando de un color queden en total (g)', a2)),
      btn('Guardar', () => saveCfg('taller', { avisoGramos: Number(a1.value) || 0, avisoColorGramos: Number(a2.value) || 0 }), { cls: 'primary' })),
      card('Impresoras y bobinas', h('p.small', 'Se gestionan en el menú ', h('a', { href: '#/taller' }, 'Taller 3D'), '.')));
  },
  juego(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.gamificacion || { puntos: {}, recompensas: [] }));
    let on = c.activa !== false;
    const P = c.puntos || {};
    const L = [['pedido', 'Por pedido creado'], ['porCadaDiezEuros', 'Por cada 10 € vendidos'], ['tarea', 'Por tarea completada'], ['tareaUrgente', 'Por tarea urgente completada'], ['publicacion', 'Por publicación en redes'], ['noticia', 'Por noticia publicada'], ['comentario', 'Por comentario'], ['diaActivo', 'Por día con actividad']];
    const f = {}; L.forEach(x => { f[x[0]] = inp({ type: 'number', min: 0, value: P[x[0]] ?? '' }); });
    const rec = area({ value: (c.recompensas || []).join('\n'), rows: 8 });
    const objP = inp({ type: 'number', min: 0, value: c.objetivoMensualPedidos || 0 }), objV = inp({ type: 'number', min: 0, value: c.objetivoMensualVentas || 0 });
    b.append(card(null, h('label.check', sw(on, v => { on = v; }), 'Mostrar motivación, niveles, insignias y ranking en el Inicio'), h('p.small.muted', 'Solo es un juego: sin dinero real. Los puntos se calculan con la actividad real (pedidos, tareas, redes…), así que no se pueden inflar.')),
      card('Puntos (XP)', h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' } }, L.map(x => field(x[1], f[x[0]])))),
      card('Objetivos del equipo este mes', h('div.form', field('Pedidos', objP, '0 = sin objetivo'), field('Ventas (€)', objV, '0 = sin objetivo'))),
      card('Recompensas virtuales al subir de nivel (una por línea)', rec, h('p.small.muted', 'Al subir de nivel sale una ruleta y toca una de estas. Ponedlas a vuestro gusto.')),
      btn('Guardar', () => saveCfg('gamificacion', { activa: on, puntos: Object.fromEntries(L.map(x => [x[0], Number(f[x[0]].value) || 0])), recompensas: lines(rec.value), objetivoMensualPedidos: Number(objP.value) || 0, objetivoMensualVentas: Number(objV.value) || 0 }), { cls: 'primary' }));
  },
  async github(b) {
    b.append(card('Cómo llegan las actualizaciones', h('p.small', 'Las versiones nuevas del programa se publican en vuestro repositorio de GitHub (Releases). Cada PC comprueba si hay una nueva, la descarga, verifica su huella SHA-256 y se reinicia. Si algo falla, sigue funcionando la versión anterior.'), h('p.small', 'La app del móvil se actualiza sola desde GitHub Pages al abrirla.')));
    if (!desktop.on) return b.append(h('p.small.muted', 'La comprobación de versiones del programa se hace desde el PC.'));
    const repo = inp({ placeholder: 'usuario/celebridisenos', value: (await desktop.getConfig('updateRepo')) || '' });
    const upd = h('div');
    const info = await desktop.info().catch(() => ({}));
    b.append(card('Repositorio', field('Repositorio de GitHub (usuario/repositorio)', repo, 'Solo hay que ponerlo una vez en cada PC.'), btn('Guardar', async () => { await desktop.setConfig('updateRepo', repo.value.trim()); toast('Guardado', 'ok'); check(); }, { cls: 'primary sm' })), card('Versión', upd));
    function check() {
      mount(upd, h('p.small.muted', 'Versión instalada: ' + (info.version || '?') + ' · comprobando…'));
      desktop.update().then(r => mount(upd, rollbackBox(r), r.nueva ? h('div.col', h('p', '🎉 Nueva versión disponible: ' + r.version), r.notas ? h('p.small.muted', r.notas) : null, btn('Actualizar ahora', async ev => { ev.target.closest('button').disabled = true; try { await desktop.applyUpdate(); toast('Actualizando… el programa se reiniciará', 'ok'); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'download' })) : h('p.small', '✅ Tienes la última versión (' + (info.version || '') + ').')))
        .catch(e => mount(upd, h('p.small.muted', 'No se pudo comprobar: ' + e.message)));
    }
    check();
  },
  avisos(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.notificaciones));
    const tok = inp({ type: 'password', placeholder: S.cfg.secretos.telegram ? '•••• (guardado)' : '123456789:AA…', autocomplete: 'off' });
    const res = h('p.small');
    const tog = (k, t) => h('label.check', sw(c[k], v => { c[k] = v; }), t);
    b.append(card('Bot de Telegram', h('p.small.muted', 'Crea un bot con @BotFather en Telegram (/newbot) y pega aquí su token. Después, cada persona conecta su Telegram desde su perfil.'), h('p', S.cfg.secretos.telegram ? '✅ Bot configurado.' : 'Sin configurar (opcional).'), field('Token del bot', tok), res,
      btn('Guardar y probar', async () => { if (!tok.value.trim()) return; try { const r = await api('config.secreto', { nombre: 'telegram', valor: tok.value.trim() }); tok.value = ''; res.textContent = r.error ? '⚠️ ' + r.error : '✅ Bot ' + r.prueba; await pull(); } catch (e) { res.textContent = e.message; } }, { cls: 'primary' })),
      card('Qué avisos llegan a Telegram', tog('telegram', 'Enviar avisos a Telegram'), tog('pedidosUrgentes', 'Pedidos vencidos o a punto de vencer'), tog('tareas', 'Tareas asignadas y vencidas'), tog('seguridad', 'Alertas de seguridad y solicitudes de acceso'), tog('taller', 'Taller: impresora terminada y filamento bajo'), tog('stock', 'Stock por debajo del mínimo'), h('p.small.muted', 'Dentro de la app (campana) aparecen siempre todos.'),
        btn('Guardar', () => saveCfg('notificaciones', c), { cls: 'primary' })),
      resumenCard(c));
  },
  // v12.2: Wallapop, Vinted… no tienen API para vendedores, pero SIEMPRE mandan un email de aviso. Aquí se leen (solo lectura) y saltan al programa.
  async plataformas(b) {
    let st;
    try { st = await api('plataformas.estado', {}); } catch (e) { b.append(h('p.bad-t', e.message)); return; }
    const c = JSON.parse(JSON.stringify(st.config));
    const info = h('div.small');
    const pinta = (s) => {
      info.replaceChildren();
      info.append(h('div', s.config.activo ? (s.disparador ? '🟢 Activo: se revisa el correo cada 5 minutos.' : '🟡 Activo, pero falta el reloj automático: pulsa Guardar otra vez.') : '⚪ Apagado.'),
        s.ultima ? h('div.muted', 'Última revisión correcta: ' + fdt(s.ultima) + ' (' + ago(s.ultima) + ')') : h('div.muted', 'Aún no se ha revisado nada.'),
        s.error ? h('div.bad-t', { role: 'alert' }, '⚠️ ' + s.error) : null);
    };
    pinta(st);
    const reglas = h('div.list.boxed');
    const dibuja = () => {
      reglas.replaceChildren(...c.reglas.map((r, i) => {
        const nom = inp({ value: r.nombre, 'aria-label': 'Nombre de la plataforma', style: { maxWidth: '140px' } }), dom = inp({ value: r.remitente, 'aria-label': 'Dominio del remitente de ' + r.nombre, placeholder: 'wallapop.com' });
        nom.oninput = () => { r.nombre = nom.value; }; dom.oninput = () => { r.remitente = dom.value; };
        return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap', gap: '8px' } }, h('label.switch', { title: 'Revisar esta plataforma' }, h('input', { type: 'checkbox', checked: !!r.activa, 'aria-label': 'Revisar ' + r.nombre, onchange: e => { r.activa = e.target.checked; } }), h('span')), nom, h('span.small.muted', 'emails de'), dom,
          btn('Quitar', () => { c.reglas.splice(i, 1); dibuja(); }, { cls: 'sm ghost' }));
      }));
    };
    dibuja();
    const act = h('label.check', sw(!!c.activo, v => { c.activo = v; }), 'Leer los emails de aviso y convertirlos en notificaciones');
    const dias = sel([1, 2, 3, 7, 14].map(n => ({ v: n, t: 'Últimos ' + n + (n === 1 ? ' día' : ' días') })), String(c.dias)); dias.onchange = () => { c.dias = Number(dias.value); };
    b.append(
      card('Avisos de Wallapop, Vinted, Etsy, eBay…', h('p.small.muted', 'Estas plataformas no dejan que otros programas lean sus mensajes, pero siempre te mandan un email («tienes un mensaje», «han reservado tu artículo»). El programa lee esos emails de tu Gmail y te avisa al instante en la campana, en una ventanita y en Telegram.'),
        act, h('div.form', field('Buscar en el correo', dias)), h('h4', 'Plataformas'), reglas,
        h('div.row.wrap', btn('+ Otra plataforma', () => { c.reglas.push({ id: 'p' + (c.reglas.length + 1), nombre: 'Otra', remitente: '', emoji: '🔔', activa: true }); dibuja(); }, { cls: 'sm ghost' }),
          btn('Guardar', async () => { try { const r = await api('plataformas.guardar', { valor: c }); Object.assign(c, r.config); dibuja(); await pull(); pinta(Object.assign({}, st, { config: r.config, disparador: r.disparador, error: r.error })); st.config = r.config; st.disparador = r.disparador; toast('Guardado', 'ok'); } catch (e) { handleError(e); } }, { cls: 'primary' }),
          btn('Revisar ahora', async ev => { const bt = ev.target.closest('button'); bt.disabled = true; try { const r = await api('plataformas.revisar', {}); const s2 = await api('plataformas.estado', {}); st = s2; pinta(s2); toast(r.error ? 'No se pudo revisar' : (r.nuevos ? r.nuevos + ' aviso(s) nuevo(s)' : 'Nada nuevo en el correo'), r.error ? 'bad' : 'ok'); await pull(); } catch (e) { handleError(e); } bt.disabled = false; }, { icon: 'refresh' })), info),
      card('Cómo activarlo (una sola vez)',
        h('ol.small', { style: { paddingLeft: '18px', lineHeight: 1.7 } },
          h('li', 'En Wallapop/Vinted, deja activados los avisos por email (Ajustes > Notificaciones) con el correo de Gmail que usa este programa.'),
          h('li', 'Entra en Apps Script (el proyecto del servidor), abre «Configuración del proyecto», marca «Mostrar el archivo appsscript.json» y sustituye su contenido por el archivo ', h('b', 'appsscript_con_correo.json'), ' de la carpeta del servidor. Después pega el nuevo Servidor.gs.'),
          h('li', 'Elige la función ', h('b', 'autorizarCorreo'), ', pulsa Ejecutar y acepta el permiso de Google (solo lectura de Gmail).'),
          h('li', 'Vuelve aquí, activa el interruptor y pulsa Guardar. Pulsa «Revisar ahora» para comprobar que no da error.')),
        h('p.small.muted', 'Seguridad: solo lectura (no envía, no borra, no marca). Solo se leen emails cuyo remitente es de ese dominio y que no fallan la comprobación DKIM/SPF; en el aviso los enlaces del email se ocultan para que nadie te cuele un enlace falso. Los avisos de antes de activarlo no se repiten. Nunca crea pedidos solo: avisa y decides tú. Si tu Gmail es otro, reenvía allí los avisos (Gmail > Ajustes > Reenvío) con el filtro «de: wallapop.com».'),
        h('p.small.muted', 'Límite honesto: Google revisa los disparadores como mucho cada pocos minutos, así que el aviso llega con 5 minutos de retraso como máximo, no al segundo.')));
  },
  async redes(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.redes));
    if (desktop.on) b.append(await appsCard(c.accesos.map(a => a.red)));
    else b.append(card('En el móvil', h('p.small', 'En el móvil, los enlaces de Instagram, TikTok o WhatsApp abren directamente su app si está instalada.')));
    if (!can('config.editar')) return;
    const goal = inp({ type: 'number', min: 0, value: c.objetivoSemanal });
    const list = h('div.col');
    const drawL = () => mount(list, c.accesos.map((a, i) => h('div.row.wrap', inp({ value: a.red, style: { width: '140px' }, oninput: e => { a.red = e.target.value; } }), h('div.grow', inp({ value: a.web, placeholder: 'https://…', oninput: e => { a.web = e.target.value; } })), btn('', () => { c.accesos.splice(i, 1); drawL(); }, { cls: 'ghost icon sm', icon: 'x' }))));
    drawL();
    b.append(card('Redes del equipo (enlaces web)', h('p.small.muted', 'Se usan como alternativa cuando un PC no tiene la aplicación instalada, y en el móvil. No se guardan contraseñas de redes.'), list, btn('Añadir red', () => { c.accesos.push({ red: '', web: 'https://', app: '' }); drawL(); }, { icon: 'plus', cls: 'sm' })),
      card('Objetivo', field('Publicaciones por semana', goal)), btn('Guardar', () => saveCfg('redes', Object.assign(c, { objetivoSemanal: Number(goal.value) || 0, accesos: c.accesos.filter(a => a.red && a.web) })), { cls: 'primary' }));
  },
  seguridad(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.seguridad));
    const f = { bloqueoMin: inp({ type: 'number', min: 0, value: c.bloqueoMin || 0 }), sesionDias: inp({ type: 'number', min: 1, value: c.sesionDias }), intentos: inp({ type: 'number', min: 3, value: c.intentos }), bloqueoIntentosMin: inp({ type: 'number', min: 1, value: c.bloqueoIntentosMin }), solicitudCaducaHoras: inp({ type: 'number', min: 1, value: c.solicitudCaducaHoras }) };
    b.append(card(null, h('div.form', field('Bloquear pantalla tras (minutos sin usar)', f.bloqueoMin, '0 = no bloquear (entrar directamente al abrir la app)'), field('La sesión caduca a los (días)', f.sesionDias), field('Intentos de contraseña antes de bloquear', f.intentos), field('Bloqueo tras fallos (minutos)', f.bloqueoIntentosMin), field('Las solicitudes de acceso caducan a las (horas)', f.solicitudCaducaHoras))),
      card('Cómo se protegen los datos', h('ul.small', { style: { margin: 0, paddingLeft: '18px' } }, h('li', 'Contraseñas: se protegen en tu dispositivo (PBKDF2, 150.000 vueltas) y el servidor solo guarda una huella con sal propia. La contraseña nunca viaja ni se guarda.'), h('li', 'La sesión se recuerda en cada dispositivo (en el PC, cifrada con Windows) y se renueva sola al usarla. Se puede cerrar a distancia desde Mi perfil o Usuarios.'), h('li', 'El token de Telegram está en el almacén protegido de Google. No hay claves de IA: la IA es local.'), h('li', 'Documentos y memoria privados: el servidor solo entrega a cada persona lo que puede ver; la IA tampoco puede saltárselo.'), h('li', 'Cada acción queda en la auditoría: quién, cuándo y qué cambió.'), h('li', 'Los permisos se comprueban en el servidor: aunque alguien manipule la app, no puede saltárselos.'))),
      btn('Guardar', () => saveCfg('seguridad', Object.fromEntries(Object.keys(f).map(k => [k, Number(f[k].value)]))), { cls: 'primary' }));
    // v11.3: bloqueo de emergencia, credenciales a revisar y registro de seguridad
    const sec = h('div.col', { style: { gap: '12px' } }, h('p.muted', 'Cargando seguridad…'));
    b.append(sec);
    const drawSec = async () => {
      let st = null, reg = [];
      try { if (can('usuarios.admin')) st = await api('seguridad.estado', {}); } catch (e) { }
      try { if (can('auditoria.ver')) reg = await api('seguridad.registro', { limite: 150 }); } catch (e) { }
      const motivo = inp({ placeholder: 'Motivo (p. ej. acceso desconocido)' }), conf = inp({ placeholder: st && st.bloqueo.activo ? 'Escribe DESBLOQUEAR' : 'Escribe BLOQUEAR' });
      const cs = h('input', { type: 'checkbox', checked: true }), ops = h('input', { type: 'checkbox', checked: true }), sy = h('input', { type: 'checkbox' });
      const NV = { alerta: ['🚨', 'bad'], aviso: ['⚠️', 'warn'], info: ['', ''] };
      mount(sec,
        st ? card('🚨 BLOQUEO DE EMERGENCIA', st.bloqueo.activo
          ? h('div.col', h('p.bad-t.bold', 'ACTIVO desde ' + fdt(st.bloqueo.desde) + ' por ' + st.bloqueo.por + ' · ' + st.bloqueo.motivo), h('p.small', 'Solo las administradoras pueden entrar.' + (st.bloqueo.bloquearOperaciones ? ' Borrar, restaurar, importar y cambios de permisos están bloqueados.' : '') + (st.bloqueo.pararSync ? ' La sincronización automática con el Sheet está parada.' : '')),
            field('Para desactivarlo', conf), btn('Desactivar el bloqueo', async () => { try { await api('seguridad.bloqueo', { activar: false, confirmar: conf.value }); toast('Bloqueo desactivado', 'ok'); drawSec(); } catch (e) { handleError(e); } }, { cls: 'primary' }))
          : h('div.col', h('p.small', 'Úsalo si sospechas que alguien ha entrado sin permiso. Solo administradoras. Lo comprueba el servidor: no se puede saltar desde la app.'),
            field('Motivo', motivo), h('label.row', cs, h('span.small', 'Cerrar TODAS las sesiones abiertas (menos la tuya)')), h('label.row', ops, h('span.small', 'Bloquear operaciones delicadas (borrar, restaurar copias, importar, permisos)')), h('label.row', sy, h('span.small', 'Parar la sincronización automática con el Sheet')),
            field('Para confirmar', conf), btn('ACTIVAR BLOQUEO DE EMERGENCIA', async () => { try { const r = await api('seguridad.bloqueo', { activar: true, confirmar: conf.value, motivo: motivo.value, cerrarSesiones: cs.checked, bloquearOperaciones: ops.checked, pararSync: sy.checked }); toast('Bloqueo activado · ' + r.sesionesCerradas + ' sesiones cerradas', 'warn', 6000); drawSec(); } catch (e) { handleError(e); } }, { cls: 'danger solid' })),
          h('p.tiny.muted', 'Última semana: ' + st.semana.alertas + ' alertas · ' + st.semana.avisos + ' avisos · ' + st.semana.fallos + ' entradas fallidas · ' + st.sesionesAbiertas + ' sesiones abiertas · administradoras: ' + st.administradoras.join(', '))) : null,
        st ? card('🔑 Credenciales a revisar si hay un incidente', h('p.tiny.muted', 'Nunca se muestran sus valores: solo dónde están y qué hacer.'), h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Qué'), h('th', 'Dónde'), h('th', 'Qué hacer'))), h('tbody', st.credenciales.map(c => h('tr', { style: { cursor: 'default' } }, h('td.bold.small', c.tipo), h('td.small', c.donde), h('td.small', c.accion))))))) : null,
        can('auditoria.ver') ? card('🛡️ Registro de seguridad (' + reg.length + ')', reg.length ? h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Cuándo'), h('th', 'Qué'), h('th.hide-m', 'Quién'), h('th', 'Detalle'), h('th.hide-m', 'Resultado'))),
          h('tbody', reg.map(r => h('tr', { style: { cursor: 'default' } }, h('td.small', fdt(r.fecha)), h('td', pill((NV[r.nivel] || NV.info)[0] + ' ' + r.tipo.replace(/_/g, ' '), (NV[r.nivel] || NV.info)[1])), h('td.hide-m.small', r.usuario || '—'), h('td.small', r.detalle), h('td.hide-m.small.muted', r.resultado)))))) : h('p.small.muted', 'Sin eventos todavía.'),
          h('p.tiny.muted', 'Aquí nunca aparecen contraseñas, tokens ni claves. Qué hacer ante cada alerta: docs/SEGURIDAD.md → «Respuesta a incidentes».')) : null);
    };
    drawSec();
  },
  // v11.3: reglas de cada plataforma para el asistente de anuncios (se cambian aquí si la plataforma las cambia)
  anuncios(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.anuncios || {})); c.plataformas = c.plataformas || {};
    const def = sel([['etsy', 'Etsy'], ['wallapop', 'Wallapop'], ['vinted', 'Vinted'], ['general', 'General']].map(([v, t]) => ({ v, t })), c.plataforma || 'etsy');
    const marcas = area({ value: (c.marcasExtra || []).join(', '), rows: 2, placeholder: 'Marcas o personajes a vigilar además de la lista de fábrica' });
    const rows = ['etsy', 'wallapop', 'vinted', 'general'].map(k => {
      const base = window.LST.rules(k, {}), cur = c.plataformas[k] || {};
      const f = {}; ['tituloMax', 'etiquetasMax', 'etiquetaMaxLen', 'descMax', 'fotosMin'].forEach(x => { f[x] = inp({ type: 'number', min: 0, value: cur[x] ?? '', placeholder: String(base[x] ?? '') }); });
      f.fuente = inp({ value: cur.fuente ?? '', placeholder: base.fuente || 'De dónde sale (web oficial…)' }); f.revisado = inp({ type: 'date', value: cur.revisado ?? '', placeholder: base.revisado || '' });
      return { k, t: base.t, f };
    });
    b.append(card(null, h('p.small', 'El asistente de anuncios usa estas reglas. Si la plataforma cambia sus límites, cámbialos aquí (vacío = valor de fábrica, que se ve en gris). Apunta de dónde lo sacas y cuándo lo revisaste.'),
      field('Plataforma por defecto', def), field('Marcas y personajes a vigilar (propiedad intelectual)', marcas, 'Separados por comas. Se suman a la lista de fábrica.')),
      ...rows.map(r => card(r.t, h('div.form', field('Título: máx. caracteres', r.f.tituloMax), field('Nº máx. de etiquetas (0 = no usa)', r.f.etiquetasMax), field('Caracteres por etiqueta', r.f.etiquetaMaxLen), field('Descripción: máx. caracteres (0 = sin límite)', r.f.descMax), field('Fotos mínimas', r.f.fotosMin), field('Fuente', r.f.fuente), field('Revisado el', r.f.revisado)))),
      btn('Guardar', () => {
        const pl = {}; rows.forEach(r => { const o = {}; Object.entries(r.f).forEach(([k, i]) => { if (i.value !== '') o[k] = i.type === 'number' ? Number(i.value) : i.value; }); if (Object.keys(o).length) pl[r.k] = o; });
        saveCfg('anuncios', { plataforma: def.value, plataformas: pl, marcasExtra: marcas.value.split(',').map(x => x.trim()).filter(Boolean), categoriasExtra: c.categoriasExtra || [] });
      }, { cls: 'primary' }));
  },
  async copias(b) {
    const box = h('div');
    b.append(card(null, h('p.small', 'Cada noche se hace una copia automática de todo (se guardan las de los últimos 30 días y una por semana de los últimos 3 meses). Antes de operaciones delicadas también se hace una copia. Todas están en vuestro Google Drive, carpeta "Copias de seguridad".'),
      h('div.row.wrap', btn('Hacer copia ahora', async ev => { ev.target.closest('button').disabled = true; try { await api('copias.crear', { motivo: 'manual' }, { timeout: 180000 }); toast('Copia creada', 'ok'); drawB(); } catch (e) { toast(e.message, 'bad'); } finally { ev.target.closest('button').disabled = false; } }, { cls: 'primary', icon: 'archive' }),
        can('datos.exportar') ? btn('Exportación completa (JSON)', async ev => { ev.target.closest('button').disabled = true; try { const d = await api('copias.exportar', { textos: true }, { timeout: 280000 }); const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })), download: 'celebridisenos_completo_' + S.hoy + '.json' }); document.body.appendChild(a); a.click(); a.remove(); toast('Exportado: usuarios, pedidos, clientes, productos, tareas, biblioteca, memoria y configuración', 'ok'); } catch (e) { toast(e.message, 'bad'); } finally { ev.target.closest('button').disabled = false; } }, { icon: 'download' }) : null,
        desktop.on && can('datos.exportar') ? btn('Copia en este PC ahora', async () => { try { await desktop.backup(await api('copias.exportar', { textos: true }, { timeout: 280000 })); toast('Copia local guardada', 'ok'); } catch (e) { handleError(e); } }, { icon: 'archive' }) : null),
      h('p.tiny.muted', 'Nunca se pierde: usuarios, pedidos, clientes, productos, documentos y su texto, configuración, biblioteca y memoria. Los PC guardan además una copia local diaria.')), box);
    const drawB = async () => {
      mount(box, h('p.muted', 'Cargando copias…'));
      const list = await api('copias.lista', {});
      mount(box, card('Copias disponibles (' + list.length + ')', list.length ? h('div.list', list.map(x => h('div.item', { style: { cursor: 'default' } }, icon('archive', 's'), h('div.grow', h('div.bold', x.fecha), h('div.tiny.muted', (x.manual ? 'Manual' : 'Automática') + ' · ' + x.motivo + ' · ' + Object.keys(x.archivos).join(' + '))), btn('Comprobar', async ev => { const bt = ev.target.closest('button'); bt.disabled = true; try { const r = await api('copias.verificar', { grupo: x.grupo }, { timeout: 120000 }); modal(r.ok ? '✅ Copia correcta' : '⚠️ Problemas en la copia', h('div.col', r.libros.map(l => h('div', h('b', l.libro === 'negocio' ? 'Sheet de negocio' : 'Sistema'), h('p.small', (l.hojas || 0) + ' hojas · ' + Object.keys(l.filas || {}).map(k => k + ': ' + l.filas[k] + ' filas').join(' · ')), (l.problemas || []).length ? h('ul.small.bad-t', l.problemas.map(p => h('li', p))) : h('p.small.ok-t', 'Se abre bien y tiene todas las hojas clave.'))))); } catch (e) { toast(e.message, 'bad'); } bt.disabled = false; }, { cls: 'sm ghost' }), btn('Restaurar…', () => restore(x), { cls: 'sm' })))) : h('p.muted', 'Aún no hay copias.')));
    };
    function restore(x) {
      const libro = sel([{ v: 'negocio', t: 'Solo el Sheet de negocio (pedidos, clientes, productos…)' }, { v: 'sistema', t: 'Solo el sistema (tareas, noticias, usuarios…)' }, { v: 'ambos', t: 'Todo' }], 'negocio');
      const conf = inp({ placeholder: 'Escribe RESTAURAR' });
      modal('Restaurar copia del ' + x.fecha, h('div.col', h('p', 'Los datos actuales se sustituirán por los de esta copia. Antes se hará automáticamente una copia del estado actual, así que siempre podrás volver atrás.'), field('Qué restaurar', libro), field('Para confirmar, escribe RESTAURAR', conf)), close => [btn('Cancelar', close), btn('Restaurar', async ev => {
        ev.target.closest('button').disabled = true;
        try { await api('copias.restaurar', { grupo: x.grupo, libro: libro.value, confirmar: conf.value.trim().toUpperCase() }, { timeout: 300000 }); close(); await pull(true); toast('Copia restaurada', 'ok'); drawB(); } catch (e) { toast(e.message, 'bad'); ev.target.closest('button').disabled = false; }
      }, { cls: 'danger solid' })], { size: 'narrow' });
    }
    await drawB();
  },
  // v10: Horarios y conexiones (Activo = usando la app · Ausente = abierta sin usar · Desconectado)
  async actividad(b) {
    const box = h('div'), hist = h('div');
    const dur = s => { s = Math.round(Number(s) || 0); const hh = Math.floor(s / 3600), mm = Math.round((s % 3600) / 60); return hh ? hh + ' h ' + mm + ' min' : mm + ' min'; };
    const EST = { activo: ['on', 'Activo'], ausente: ['away', 'Ausente'], desconectado: ['idle', 'Desconectado'] };
    b.append(h('p.small.muted', '"Activo" significa usando la app (ratón, teclado o pantalla en los últimos 2 minutos). "Ausente": la app está abierta pero sin usar. Se actualiza cada 30 segundos.'), box, h('h3', { style: { margin: '18px 0 8px' } }, 'Historial (7 días)'), hist);
    const draw = async () => {
      let r; try { r = await api('actividad.estado', { dias: 7 }); } catch (e) { return mount(box, h('p.bad-t', e.message)); }
      mount(box, h('div.list.boxed', r.usuarios.map(u => h('div.item', { style: { cursor: 'default' } }, h('span.av-wrap', avatar(user(u.id) || u), h('span.st-dot.' + EST[u.estado][0])),
        h('div.grow', h('div.bold', u.nombre, ' ', h('span.tiny.muted', EST[u.estado][1] + (u.dispositivo ? ' · ' + u.dispositivo : ''))),
          h('div.tiny.muted', (u.desde ? 'Conectado desde las ' + new Date(u.desde).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' · ' : '') + 'Última señal: ' + (u.ultima ? ago(u.ultima) : 'nunca'))),
        h('div.right.tiny', h('div', 'Hoy conectado: ', h('b', dur(u.hoyConectadoSeg))), h('div', 'Hoy activo: ', h('b', dur(u.hoyActivoSeg))))))));
      mount(hist, r.historial.length ? h('div.list.boxed', r.historial.slice(0, 100).map(x => h('div.item', { style: { cursor: 'default' } }, h('div.grow', h('b', x.usuario), h('span.tiny.muted', ' · ' + (x.dispositivo || ''))),
        h('div.tiny.muted', new Date(x.inicio).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' → ' + new Date(x.fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })),
        h('div.tiny', dur(x.conectadoSeg) + ' conectado · ' + dur(x.activoSeg) + ' activo')))) : h('p.muted.small', 'Todavía no hay sesiones terminadas.'));
    };
    await draw();
    const t = setInterval(() => { if (!document.body.contains(box)) return clearInterval(t); draw(); }, 30000);
  },
  async papelera(b) {
    const list = await api('papelera.lista', {});
    b.append(h('p.small.muted', 'Lo que se borra viene aquí y se puede recuperar. ' + (can('papelera.admin') ? 'Ves la papelera de todo el equipo.' : 'Ves lo que has borrado tú.')),
      list.length ? h('div.list.boxed', list.map(x => h('div.item', { style: { cursor: 'default' } }, icon('trash', 's'), h('div.grow', h('div.bold.ellipsis', x.titulo || x.entidad), h('div.tiny.muted', 'Borrado por ' + x.borradoPor + ' · ' + fdt(x.fecha))),
        btn('Restaurar', async () => { try { await api('papelera.restaurar', { id: x.id }); toast('Restaurado', 'ok'); await pull(); SEC.papelera(mount(b, h('h2', 'Papelera'))); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm', icon: 'refresh' }),
        can('papelera.admin') ? btn('', async () => { if (!await confirmDlg('Eliminar para siempre', '«' + (x.titulo || x.entidad) + '» se eliminará definitivamente. No se podrá recuperar.', 'Eliminar', true)) return; try { await api('papelera.eliminar', { id: x.id }); toast('Eliminado', 'ok'); SEC.papelera(mount(b, h('h2', 'Papelera'))); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'ghost icon sm danger', icon: 'trash', title: 'Eliminar para siempre' }) : null))) : h('div.card', empty('trash', 'La papelera está vacía')),
      can('papelera.admin') && list.length ? btn('Vaciar lo de hace más de 30 días', async () => { if (!await confirmDlg('Vaciar papelera', 'Se eliminará para siempre lo que lleve más de 30 días en la papelera.', 'Vaciar', true)) return; const n = await api('papelera.vaciar', { dias: 30 }); toast(n + ' elementos eliminados', 'ok'); SEC.papelera(mount(b, h('h2', 'Papelera'))); }, { cls: 'danger' }) : null);
  },
  async auditoria(b) {
    const q = inp({ type: 'search', placeholder: 'Buscar: persona, acción, pedido…' });
    const box = h('div');
    const all = can('auditoria.ver');
    b.append(h('p.small.muted', all ? 'Registro de todo lo que ocurre: accesos, cambios, borrados, permisos y errores.' : 'Tu actividad. Para ver la de todo el equipo se necesita permiso.'), q, box);
    const drawA = async () => {
      mount(box, h('p.muted', 'Cargando…'));
      const r = await api('auditoria.lista', { q: q.value });
      mount(box, r.filas.length ? h('div.table-wrap', h('table.t', h('thead', h('tr', h('th', 'Cuándo'), h('th', 'Quién'), h('th', 'Qué'), h('th', 'Dónde'), h('th.hide-m', 'Detalle'))), h('tbody', r.filas.map(a => h('tr', { style: { cursor: 'default' } }, h('td.nowrap.small', fdt(a.fecha)), h('td', a.usuario), h('td', accionTxt(a.accion)), h('td.small', a.entidad), h('td.hide-m.tiny.muted', { style: { maxWidth: '420px' } }, resumenDetalle(a.detalle))))))) : h('p.muted', 'Sin resultados.'));
    };
    let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(drawA, 400); });
    await drawA();
  },
  async conexiones(b) {
    b.append(h('p', btn('Abrir el Centro de diagnóstico completo', () => go('estado'), { cls: 'primary', icon: 'shield' })));
    const box = h('div.checklist', h('p.muted', 'Comprobando…'));
    b.append(card(null, box), can('config.editar') ? card('Reparar el Google Sheet', h('p.small.muted', 'Vuelve a añadir columnas que falten, corrige fórmulas y listas desplegables. Hace una copia antes. Úsalo si alguien ha cambiado la estructura del Sheet.'), btn('Reparar Sheet', async ev => { ev.target.closest('button').disabled = true; try { const r = await api('sys.repararSheet', {}, { timeout: 300000 }); modal('Sheet revisado', h('ul', r.map(x => h('li', x)))); } catch (e) { toast(e.message, 'bad'); } finally { ev.target.closest('button').disabled = false; } }, { icon: 'refresh' })) : null);
    const r = await api('sys.comprobar', {}, { timeout: 120000 });
    mount(box, r.map(c => h('div.ck', h('span.st.' + (c.ok ? 'ok' : /opcional|Sin configurar/.test(c.detalle) ? 'wait' : 'bad'), c.ok ? '✓' : /opcional|Sin configurar/.test(c.detalle) ? '–' : '!'), h('div.grow', h('div.bold', c.nombre), h('div.tiny.muted', c.detalle)))));
  }
};
// CSV con comillas y BOM (formato del programa anterior)
function parseCsv(txt) {
  txt = txt.replace(/^\ufeff/, '');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === ';' && !txt.slice(0, 200).includes(',')) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(x => x !== '')) rows.push(row);
  const head = rows.shift() || [];
  return rows.map(r => Object.fromEntries(head.map((k, i) => [k.trim(), (r[i] || '').trim()])));
}
SEC.importar = async function (b) {
  const res = h('div');
  b.append(card(null, h('p', 'Trae los productos, tareas y contenidos de redes del programa anterior (el de PowerShell). Se puede repetir sin duplicar nada, y antes se hace una copia de seguridad.'), res));
  const data = { productos: [], tareas: [], redes: [] };
  const show = () => mount(res, h('div.facts', h('div.fact', h('div.l', 'Productos'), h('div.v', String(data.productos.length))), h('div.fact', h('div.l', 'Tareas'), h('div.v', String(data.tareas.length))), h('div.fact', h('div.l', 'Redes'), h('div.v', String(data.redes.length)))),
    btn('Importar ahora', async ev => { ev.target.closest('button').disabled = true; try { const r = await api('importar.v8', data, { timeout: 300000 }); toast('Importado: ' + r.productos + ' productos, ' + r.tareas + ' tareas, ' + r.redes + ' de redes (' + r.omitidos + ' ya estaban)', 'ok', 9000); pull(true); } catch (e) { toast(e.message, 'bad'); ev.target.closest('button').disabled = false; } }, { cls: 'primary', icon: 'upload' }));
  const readTxt = async p => new TextDecoder('utf-8').decode(await desktop.file(p));
  if (desktop.on) {
    const root = await desktop.getConfig('productRoot');
    if (!root) return mount(res, h('p.warn-t', 'Primero indica la carpeta de productos en Configuración > Este dispositivo.'));
    const sep = root.includes('\\') ? '\\' : '/';
    const dir = root + sep + '00_SISTEMA' + sep + 'EXCEL' + sep;
    try { data.productos = parseCsv(await readTxt(dir + 'PRODUCTOS.csv')); } catch (e) { }
    try { data.tareas = JSON.parse(await readTxt(dir + 'TAREAS.json')); if (!Array.isArray(data.tareas)) data.tareas = [data.tareas]; } catch (e) { }
    try { data.redes = parseCsv(await readTxt(dir + 'REDES.csv')); } catch (e) { }
    show();
  } else {
    const fi = h('input', { type: 'file', multiple: true, accept: '.csv,.json', onchange: async e => { for (const f of e.target.files) { const t = await f.text(); if (/TAREAS/i.test(f.name)) data.tareas = JSON.parse(t); else if (/REDES/i.test(f.name)) data.redes = parseCsv(t); else if (/PRODUCTOS/i.test(f.name)) data.productos = parseCsv(t); } show(); } });
    mount(res, h('p.small.muted', 'Elige PRODUCTOS.csv, TAREAS.json y REDES.csv de la carpeta 00_SISTEMA\\EXCEL:'), fi);
  }
};
function lines(t) { return t.split('\n').map(x => x.trim()).filter(Boolean); }

// Logo: se reduce en el propio dispositivo para que pese poco (se guarda en la configuración)
async function logoDataUrl(file) {
  if (!/^image\//.test(file.type)) throw new Error('Elige una imagen (PNG, JPG, WEBP o SVG).');
  if (file.size > 8 * 1048576) throw new Error('La imagen pesa demasiado (máximo 8 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen.')); i.src = url; });
    for (const size of [256, 192, 128, 96]) {
      const k = Math.min(1, size / Math.max(img.naturalWidth || size, img.naturalHeight || size));
      const w = Math.max(1, Math.round((img.naturalWidth || size) * k)), hh = Math.max(1, Math.round((img.naturalHeight || size) * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
      cv.getContext('2d').drawImage(img, 0, 0, w, hh);
      for (const type of ['image/webp', 'image/png']) { const d = cv.toDataURL(type, 0.92); if (d.startsWith('data:' + type) && d.length < 38000) return d; }
    }
    throw new Error('El logo tiene demasiado detalle. Prueba con una versión más sencilla.');
  } finally { URL.revokeObjectURL(url); }
}

// Apps instaladas en ESTE PC para abrir cada red (TikTok, Instagram…)
export async function appsCard(redes) {
  const box = h('div.col');
  const names = [...new Set(['Instagram', 'TikTok'].concat(redes || [], (S.cfg && S.cfg.redesLista) || [], ['Opla']))].filter(Boolean);
  let apps = {};
  try { apps = JSON.parse((await desktop.getConfig('apps')) || '{}'); } catch (e) { apps = {}; }
  const save = async () => { await desktop.setConfig('apps', JSON.stringify(apps)); };
  let found = [];
  async function draw() {
    const rows = [];
    for (const red of names) {
      const t = apps[red];
      let ok = null;
      if (t) { try { ok = (await desktop.appsComprobar(t)).existe; } catch (e) { ok = null; } }
      const det = found.filter(f => f.red.toLowerCase() === red.toLowerCase());
      const drop = h('div.dropzone.sm', { title: 'Arrastra aquí el .exe o su acceso directo',
        ondragover: e => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
        ondrop: async e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (!f) return; try { const r = await desktop.appsBuscar(f.name); if (!r.rutas.length) return toast('No encuentro "' + f.name + '" en las carpetas habituales. Usa "Elegir .exe…".', 'warn', 7000); apps[red] = r.rutas[0]; await save(); toast(red + ': ' + r.rutas[0], 'ok'); draw(); } catch (err) { toast(err.message, 'bad'); } } }, icon('upload', 's'), h('span.tiny', 'Arrastra el .exe aquí'));
      rows.push(h('div.item.app-row', h('div.grow', h('div.bold', red), t ? h('div.tiny' + (ok === false ? '.bad-t' : '.muted'), (ok === false ? '⚠️ No se encuentra la aplicación. Selecciona nuevamente el archivo .exe. · ' : '') + (t.startsWith('shell:') ? 'App de Microsoft Store' : t)) : h('div.tiny.muted', 'Sin configurar: se abrirá la web.'),
        det.length && !t ? h('div.row.wrap', det.map(d => btn('Usar ' + d.nombre, async () => { apps[red] = d.destino; await save(); draw(); }, { cls: 'sm' }))) : null),
        drop,
        btn('Elegir .exe…', async () => { try { const r = await desktop.appsElegir(); if (r.ruta) { apps[red] = r.ruta; await save(); toast('Guardado', 'ok'); draw(); } } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm', icon: 'folder' }),
        t ? btn('Probar', async () => { try { await desktop.appsAbrir(t); } catch (e) { toast(e.message, 'bad', 8000); draw(); } }, { cls: 'sm' }) : null,
        t ? btn('', async () => { delete apps[red]; await save(); draw(); }, { cls: 'ghost sm icon', icon: 'x', title: 'Quitar' }) : null));
    }
    mount(box, h('p.small.muted', 'Al pulsar una red (TikTok, Instagram, Wallapop, Vinted, Opla, Etsy…) se abrirá la aplicación instalada en este PC. Pulsa "Detectar", o arrastra aquí su icono del escritorio (.exe o acceso directo). Si deja de existir, se avisa y se abre la web.'),
      h('div.row', btn('Detectar apps instaladas', async () => {
        try {
          found = await desktop.appsDetectar(names);
          // Las que no estaban configuradas se ponen solas (la primera encontrada de cada red)
          const nuevas = [];
          for (const red of names) { if (apps[red]) continue; const f = found.find(x => x.red.toLowerCase() === red.toLowerCase()); if (f) { apps[red] = f.destino; nuevas.push(red); } }
          if (nuevas.length) await save();
          toast(nuevas.length ? 'Configuradas: ' + nuevas.join(', ') : found.length ? 'Ya estaban configuradas' : 'No se han encontrado apps. Arrastra su acceso directo del escritorio.', nuevas.length ? 'ok' : 'warn', 6000);
          draw();
        } catch (e) { toast(e.message, 'bad'); }
      }, { icon: 'search', cls: 'sm' })),
      h('div.list.boxed', rows));
  }
  draw();
  return card('Aplicaciones de este PC', box);
}
