// ================= Configuración: todo lo ajustable, sin tocar código =================
import { h, mount, icon, btn, modal, toast, fdt, ago, pill, empty, field, inp, sel, area, sw, confirmDlg, promptDlg, avatar, eur, copyText } from '../ui.js';
import { S, can, api, pull, logout, emit, APP_VERSION, kv, dropQueue } from '../store.js';
import { go, handleError, requestAccess, applyTheme, roleName, lockBox, start } from '../app.js';
import { desktop } from '../desktop.js';
import { connectTelegram } from './notificaciones.js';
import { dropZone } from '../files.js';
import { accionTxt, resumenDetalle } from './pedidos.js';
import { qrSvg } from '../qr.js';

const SECTIONS = [
  { k: 'perfil', t: 'Mi perfil', i: 'user' },
  { k: 'dispositivo', t: 'Este dispositivo', i: 'phone' },
  { k: 'movil', t: 'Instalar en el móvil', i: 'phone' },
  { k: 'empresa', t: 'Empresa', i: 'store', p: 'config.editar' },
  { k: 'usuarios', t: 'Usuarios', i: 'users', p: 'usuarios.admin' },
  { k: 'roles', t: 'Roles y permisos', i: 'shield', p: 'usuarios.admin' },
  { k: 'solicitudes', t: 'Solicitudes de acceso', i: 'key', p: 'usuarios.admin' },
  { k: 'pedidos', t: 'Pedidos', i: 'truck', p: 'config.editar' },
  { k: 'clientes', t: 'Clientes', i: 'star', p: 'config.editar' },
  { k: 'precios', t: 'Precios y comisiones', i: 'euro', p: 'config.editar' },
  { k: 'ia', t: 'Asistente IA', i: 'sparkles', p: 'config.editar' },
  { k: 'avisos', t: 'Notificaciones', i: 'bell', p: 'config.editar' },
  { k: 'redes', t: 'Redes sociales', i: 'calendar', p: 'config.editar' },
  { k: 'seguridad', t: 'Seguridad', i: 'lock', p: 'config.editar' },
  { k: 'copias', t: 'Copias de seguridad', i: 'archive', p: 'copias.admin' },
  { k: 'importar', t: 'Importar del programa anterior', i: 'upload', p: 'config.editar' },
  { k: 'papelera', t: 'Papelera', i: 'trash' },
  { k: 'auditoria', t: 'Auditoría', i: 'history' },
  { k: 'conexiones', t: 'Comprobar conexiones', i: 'refresh', p: 'config.ver' }
];

export function render(el, params) {
  let sec = (params && params[0]) || 'perfil';
  const nav = h('div.list.boxed', { style: { alignSelf: 'start' } });
  const body = h('div.col', { style: { gap: 'var(--gap)', minWidth: 0 } });
  const mobileSel = h('select.inp.show-m', { style: { marginBottom: '12px' }, onchange: e => go('config/' + e.target.value) });
  el.append(h('div.page-head', h('h1', 'Configuración')), mobileSel, h('div.grid', { style: { gridTemplateColumns: window.innerWidth <= 860 ? '1fr' : '240px minmax(0, 1fr)' } }, h('div.hide-m', nav), body));
  const draw = () => {
    const vis = SECTIONS.filter(s => !s.p || can(s.p) || ['solicitudes', 'usuarios', 'roles'].includes(s.k) && false);
    mount(nav, SECTIONS.map(s => h('div.item' + (sec === s.k ? '.sel' : ''), { onclick: () => go('config/' + s.k) }, icon(s.i, 's'), h('span.grow', s.t), s.p && !can(s.p) ? icon('lock', 's') : null,
      s.k === 'solicitudes' && can('usuarios.admin') && S.t.solicitudes.filter(x => x.estado === 'pendiente').length ? h('span.pill.bad', String(S.t.solicitudes.filter(x => x.estado === 'pendiente').length)) : null)));
    mount(mobileSel, SECTIONS.map(s => h('option', { value: s.k, selected: s.k === sec }, s.t + (s.p && !can(s.p) ? ' 🔒' : ''))));
    const s = SECTIONS.find(x => x.k === sec) || SECTIONS[0];
    if (s.p && !can(s.p)) return mount(body, lockBox(s.p, 'configuración: ' + s.t));
    mount(body, h('h2', s.t));
    try { const r = SEC[s.k](body); if (r && r.then) r.catch(e => body.appendChild(h('p.bad-t', e.message))); } catch (e) { body.appendChild(h('p.bad-t', e.message)); }
  };
  draw();
  return { params: p => { sec = (p && p[0]) || 'perfil'; draw(); }, update: () => { if (['usuarios', 'solicitudes', 'papelera'].includes(sec)) return; const nb = nav; mount(nb, SECTIONS.map(s => h('div.item' + (sec === s.k ? '.sel' : ''), { onclick: () => go('config/' + s.k) }, icon(s.i, 's'), h('span.grow', s.t), s.p && !can(s.p) ? icon('lock', 's') : null))); } };
}

// Guarda una sección de configuración del servidor
async function saveCfg(clave, valor) {
  try { S.cfg = await api('config.guardar', { clave, valor }); emit(); toast('Configuración guardada', 'ok'); return true; }
  catch (e) { handleError(e, 'configuración'); return false; }
}
function card(title, ...kids) { return h('div.card.col', title ? h('h3', title) : null, ...kids); }

const SEC = {
  perfil(b) {
    const u = S.me;
    const nombre = inp({ value: u.nombre }), color = inp({ type: 'color', value: u.color || '#7c3aed', style: { width: '60px', padding: '2px' } });
    const tema = h('div.seg', [['claro', '☀️ Claro'], ['rosa', '🌸 Rosa sweet'], ['oscuro', '🌙 Oscuro'], ['sistema', '💻 Como Windows']].map(t => h('button' + ((u.tema || 'claro') === t[0] ? '.on' : ''), { onclick: async () => { applyTheme(t[0]); u.tema = t[0]; try { await api('usuarios.editar', { id: u.id, tema: t[0] }); } catch (e) { } SEC.perfil(mount(b, h('h2', 'Mi perfil'))) || null; } }, t[1])));
    const foto = dropZone('foto', { title: 'Foto de perfil', single: true, multiple: false, entidad: 'usuarios', entidadId: u.id, onchange: items => { if (items.some(i => i.state === 'subido')) { toast('Foto actualizada', 'ok'); pull(); } } });
    const p1 = inp({ type: 'password', autocomplete: 'current-password' }), p2 = inp({ type: 'password', autocomplete: 'new-password' }), p3 = inp({ type: 'password', autocomplete: 'new-password' });
    const sessions = h('div');
    b.append(card(null, h('div.row', avatar(u, 'l'), h('div', h('h3', u.nombre), h('div.muted', u.usuario + ' · ' + roleName(u.rol)))),
      h('div.form', field('Nombre que ven los demás', nombre), field('Mi color', color)), btn('Guardar', async () => { try { const r = await api('usuarios.editar', { id: u.id, nombre: nombre.value.trim(), color: color.value }); Object.assign(S.me, r); emit(); toast('Perfil guardado', 'ok'); } catch (e) { handleError(e); } }, { cls: 'primary' })),
      card('Apariencia', tema, h('p.small.muted', 'Cada persona elige su tema; se aplica en todos sus dispositivos.')),
      card(null, foto.el),
      card('Cambiar contraseña', h('div.form', field('Contraseña actual', p1), h('div'), field('Nueva contraseña', p2, 'Mínimo 6 caracteres'), field('Repite la nueva', p3)),
        btn('Cambiar contraseña', async () => { if (p2.value !== p3.value) return toast('Las contraseñas nuevas no coinciden', 'bad'); try { await api('usuarios.editar', { id: u.id, password: p2.value, passwordActual: p1.value }); p1.value = p2.value = p3.value = ''; toast('Contraseña cambiada', 'ok'); } catch (e) { toast(e.message, 'bad'); } })),
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
      card('Actualizaciones', upd, (() => { const repo = inp({ placeholder: 'usuario/celebridisenos' }); desktop.getConfig('updateRepo').then(v => { repo.value = v || ''; }); return h('details.more', h('summary', 'Dónde buscar las versiones nuevas'), h('div.in.col', field('Repositorio de GitHub (usuario/repositorio)', repo, 'Lo explica la guía (Parte D). Solo hay que ponerlo una vez en cada PC.'), btn('Guardar', async () => { await desktop.setConfig('updateRepo', repo.value.trim()); toast('Guardado', 'ok'); }, { cls: 'sm' }))); })()),
      card('IA local (opcional)', h('div', h('p.small.muted', 'Estado: ' + (info.ai ? info.ai : 'no instalada')), h('p.small', 'La IA local funciona sin Internet y sin enviar datos fuera, pero es menos lista que Claude. Solo tiene sentido si el ordenador tiene 16 GB de RAM o más. La guía explica cómo instalarla (Ollama).'))));
    mount(upd, h('p.small.muted', 'Versión instalada: ' + (info.version || '?') + ' · comprobando…'));
    desktop.update().then(r => mount(upd, r.nueva ? h('div.col', h('p', '🎉 Nueva versión disponible: ' + r.version), r.notas ? h('p.small.muted', r.notas) : null, btn('Actualizar ahora', async ev => { ev.target.closest('button').disabled = true; try { await desktop.applyUpdate(); toast('Actualizando… el programa se reiniciará', 'ok'); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'download' })) : h('p.small', '✅ Tienes la última versión (' + (info.version || '') + ').')))
      .catch(e => mount(upd, h('p.small.muted', 'No se pudo comprobar: ' + e.message)));
  },
  movil(b) {
    const base = (S.cfg.appUrl || localStorage.getItem('cd.appUrl') || (location.protocol === 'https:' ? location.origin + location.pathname : '')) || '';
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
    b.append(card(null, h('div.form', field('Nombre', f.nombre), field('Email', f.email), field('Teléfono', f.telefono), field('Web / tienda', f.web)),
      btn('Guardar', () => saveCfg('empresa', Object.assign({}, e, Object.fromEntries(Object.keys(f).map(k => [k, f[k].value.trim()])))), { cls: 'primary' })));
  },
  async usuarios(b) {
    const box = h('div');
    b.append(h('div.row', btn('Nuevo usuario', () => userForm(), { cls: 'primary', icon: 'plus' })), box);
    const drawU = async () => {
      const list = await api('usuarios.lista', {});
      mount(box, h('div.list.boxed', list.map(u => h('div.item', { onclick: () => userForm(u) }, avatar(u), h('div.grow', h('div.bold', u.nombre, !u.activo ? pill('Desactivado') : null, u.bloqueadoHasta && u.bloqueadoHasta > new Date().toISOString() ? pill('Bloqueado', 'bad') : null), h('div.tiny.muted', u.usuario + ' · ' + roleName(u.rol) + ' · último acceso ' + (u.ultimoAcceso ? ago(u.ultimoAcceso) : 'nunca'))), icon('right', 's')))));
    };
    function userForm(u) {
      const isNew = !u;
      u = u || { rol: 'trabajador', activo: true };
      const roles = S._roles || [];
      const f = { nombre: inp({ value: u.nombre || '' }), usuario: inp({ value: u.usuario || '', disabled: !isNew, autocapitalize: 'off' }), rol: sel(roles.map(r => ({ v: r.id, t: r.nombre })), u.rol), password: inp({ type: 'password', placeholder: isNew ? 'Contraseña inicial' : 'Déjalo vacío para no cambiarla', autocomplete: 'new-password' }) };
      let activo = u.activo !== false;
      modal(isNew ? 'Nuevo usuario' : u.nombre, h('div.col', h('div.form', field('Nombre', f.nombre), field('Usuario', f.usuario), field('Rol', f.rol), field(isNew ? 'Contraseña' : 'Nueva contraseña', f.password)), !isNew ? h('label.check', sw(activo, v => { activo = v; }), 'Usuario activo (si lo desactivas, no podrá entrar y se cierran sus sesiones)') : null),
        close => [!isNew ? btn('Cerrar sus sesiones', async () => { await api('usuarios.cerrarSesiones', { userId: u.id }); toast('Sesiones cerradas', 'ok'); }, { cls: 'ghost' }) : null, h('span.grow'), btn('Cancelar', close), btn('Guardar', async () => {
          try {
            if (isNew) await api('usuarios.crear', { nombre: f.nombre.value.trim(), usuario: f.usuario.value.trim(), rol: f.rol.value, password: f.password.value });
            else { const d = { id: u.id, nombre: f.nombre.value.trim(), rol: f.rol.value, activo }; if (f.password.value) d.password = f.password.value; await api('usuarios.editar', d); }
            close(); toast('Usuario guardado', 'ok'); drawU(); pull();
          } catch (e) { toast(e.message, 'bad'); }
        }, { cls: 'primary' })]);
    }
    S._roles = (await api('roles.lista', {})).roles;
    await drawU();
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
        btn('Añadir campo', async () => { const n = await promptDlg('Nuevo campo', 'Nombre del campo', '', { placeholder: 'Color favorito' }); if (!n) return; const t = await new Promise(res => { const s = sel([{ v: 'texto', t: 'Texto' }, { v: 'si_no', t: 'Sí / No' }, { v: 'numero', t: 'Número' }, { v: 'fecha', t: 'Fecha' }], 'texto'); modal('Tipo de "' + n + '"', field('Tipo', s), cl => [btn('Añadir', () => { cl(); res(s.value); }, { cls: 'primary' })], { size: 'narrow', onclose: () => res(null) }); }); if (!t) return; c.camposExtra.push({ id: n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_'), nombre: n, tipo: t }); drawExtra(); }, { icon: 'plus', cls: 'sm' })),
      btn('Guardar', () => saveCfg('clientes', Object.assign(c, { frecuente: { minPedidos: Number(f.minPedidos.value) || 0, minGasto: Number(f.minGasto.value) || 0, modo: f.modo.value, ventanaDias: Number(f.ventana.value) || 0 }, altoValor: { minGasto: Number(f.alto.value) || 0 }, inactivoDias: Number(f.inactivo.value) || 0, incidenciasAviso: Number(f.incid.value) || 2 })), { cls: 'primary' }));
  },
  precios(b) {
    if (!S.cfg.precios) return b.append(lockBox('productos.costes', 'precios'));
    const c = JSON.parse(JSON.stringify(S.cfg.precios));
    let fromSheet = !!c.desdeSheet;
    const L = [['iva', 'IVA', '%'], ['margen', 'Margen objetivo', '%'], ['margenMin', 'Margen mínimo (regateo)', '%'], ['segundaMano', 'Descuento 2ª mano', '%'], ['manoObraHora', 'Mano de obra (€/h)', '€'], ['luzHora', 'Luz por hora de impresora (€/h)', '€'], ['costeKg', 'Filamento por defecto (€/kg)', '€'], ['vinted', 'Comisión Vinted', '%'], ['etsyVenta', 'Etsy: comisión venta', '%'], ['etsyPago', 'Etsy: procesamiento pago', '%'], ['etsyFijo', 'Etsy: fijo por pago (€)', '€'], ['etsyReg', 'Etsy: coste regulatorio', '%'], ['etsyAnuncioUSD', 'Etsy: anuncio ($)', '$'], ['usdEur', 'Cambio USD → EUR', '']];
    const f = {};
    L.forEach(x => { f[x[0]] = inp({ type: 'number', step: 'any', value: x[2] === '%' ? +(c[x[0]] * 100).toFixed(3) : c[x[0]] }); });
    b.append(card(null, h('label.check', sw(fromSheet, v => { fromSheet = v; }), 'Usar los valores de la hoja "Configuracion" del Google Sheet (recomendado: así el Excel y la app calculan igual)'),
      btn('Leer ahora del Sheet', async () => { try { await api('precios.recargar', {}); await pull(true); toast('Precios actualizados desde el Sheet', 'ok'); SEC.precios(mount(b, h('h2', 'Precios y comisiones'))); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm', icon: 'refresh' })),
      card('Valores', h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' } }, L.map(x => field(x[1] + (x[2] === '%' ? ' (%)' : ''), f[x[0]]))), h('p.small.muted', 'Si usas el Sheet, estos valores se leen de allí y cambiarlos aquí no tiene efecto.')),
      btn('Guardar', () => { const v = Object.assign({}, c, { desdeSheet: fromSheet }); L.forEach(x => { const n = Number(f[x[0]].value); v[x[0]] = x[2] === '%' ? n / 100 : n; }); saveCfg('precios', v); }, { cls: 'primary' }));
  },
  ia(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.ia));
    const key = inp({ type: 'password', placeholder: S.cfg.secretos.ia ? '•••••••••• (guardada)' : 'sk-ant-…', autocomplete: 'off' });
    const model = sel([{ v: 'claude-sonnet-5-5', t: 'Claude Sonnet (equilibrado, recomendado)' }, { v: 'claude-opus-5-5', t: 'Claude Opus (el más listo, más caro)' }, { v: 'claude-haiku-4-5-20251001', t: 'Claude Haiku (rápido y barato)' }], c.modelo);
    let semanal = !!c.informeSemanal;
    const res = h('p.small');
    b.append(card('Clave de Claude', h('p.small.muted', 'Se guarda cifrada en vuestro servidor de Google. Nunca se muestra ni aparece en los registros. Se consigue en console.anthropic.com > API Keys.'),
      h('p', S.cfg.secretos.ia ? '✅ Hay una clave guardada.' : '⚠️ No hay clave: el asistente no funcionará.'), field(S.cfg.secretos.ia ? 'Sustituir clave' : 'Clave', key), res,
      h('div.row', btn('Guardar y probar', async () => { if (!key.value.trim()) return; res.textContent = 'Probando…'; try { const r = await api('config.secreto', { nombre: 'ia', valor: key.value.trim() }); key.value = ''; res.textContent = r.error ? '⚠️ Guardada, pero la prueba falló: ' + r.error : '✅ ' + r.prueba; await pull(); } catch (e) { res.textContent = e.message; } }, { cls: 'primary' }),
        S.cfg.secretos.ia ? btn('Quitar clave', async () => { if (await confirmDlg('Quitar clave', 'El asistente dejará de funcionar hasta que pongas otra.', 'Quitar', true)) { await api('config.secreto', { nombre: 'ia', valor: '' }); await pull(); toast('Clave quitada'); } }, { cls: 'danger' }) : null)),
      card('Modelo y automatismos', field('Modelo', model), h('label.check', sw(semanal, v => { semanal = v; }), 'Enviar un informe semanal los lunes (redactado por la IA solo con datos reales)'),
        h('p.small.muted', 'Las revisiones automáticas cada 15 minutos (plazos, urgencias, tareas, redes) no gastan IA: son reglas fijas y fiables.'),
        btn('Guardar', () => saveCfg('ia', Object.assign(c, { modelo: model.value, informeSemanal: semanal })), { cls: 'primary' })));
  },
  avisos(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.notificaciones));
    const tok = inp({ type: 'password', placeholder: S.cfg.secretos.telegram ? '•••• (guardado)' : '123456789:AA…', autocomplete: 'off' });
    const res = h('p.small');
    const tog = (k, t) => h('label.check', sw(c[k], v => { c[k] = v; }), t);
    b.append(card('Bot de Telegram', h('p.small.muted', 'Crea un bot con @BotFather en Telegram (/newbot) y pega aquí su token. Después, cada persona conecta su Telegram desde su perfil.'), h('p', S.cfg.secretos.telegram ? '✅ Bot configurado.' : 'Sin configurar (opcional).'), field('Token del bot', tok), res,
      btn('Guardar y probar', async () => { if (!tok.value.trim()) return; try { const r = await api('config.secreto', { nombre: 'telegram', valor: tok.value.trim() }); tok.value = ''; res.textContent = r.error ? '⚠️ ' + r.error : '✅ Bot ' + r.prueba; await pull(); } catch (e) { res.textContent = e.message; } }, { cls: 'primary' })),
      card('Qué avisos llegan a Telegram', tog('telegram', 'Enviar avisos a Telegram'), tog('pedidosUrgentes', 'Pedidos vencidos o a punto de vencer'), tog('tareas', 'Tareas asignadas y vencidas'), tog('seguridad', 'Alertas de seguridad y solicitudes de acceso'), h('p.small.muted', 'Dentro de la app (campana) aparecen siempre todos.'),
        btn('Guardar', () => saveCfg('notificaciones', c), { cls: 'primary' })));
  },
  redes(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.redes));
    const goal = inp({ type: 'number', min: 0, value: c.objetivoSemanal });
    const list = h('div.col');
    const drawL = () => mount(list, c.accesos.map((a, i) => h('div.row.wrap', inp({ value: a.red, style: { width: '140px' }, oninput: e => { a.red = e.target.value; } }), h('div.grow', inp({ value: a.web, placeholder: 'https://…', oninput: e => { a.web = e.target.value; } })), inp({ value: a.app || '', placeholder: 'app (opcional)', title: 'Nombre del protocolo de la app de escritorio: whatsapp, tiktok…', style: { width: '140px' }, oninput: e => { a.app = e.target.value; } }), btn('', () => { c.accesos.splice(i, 1); drawL(); }, { cls: 'ghost icon sm', icon: 'x' }))));
    drawL();
    b.append(card('Accesos rápidos', h('p.small.muted', 'En el ordenador, si la app de escritorio está instalada (WhatsApp, TikTok…) se abre la app; si no, la web. No se guardan contraseñas de redes: cada una se abre con la sesión de vuestro navegador.'), list, btn('Añadir acceso', () => { c.accesos.push({ red: '', web: 'https://', app: '' }); drawL(); }, { icon: 'plus', cls: 'sm' })),
      card('Objetivo', field('Publicaciones por semana', goal)), btn('Guardar', () => saveCfg('redes', Object.assign(c, { objetivoSemanal: Number(goal.value) || 0, accesos: c.accesos.filter(a => a.red && a.web) })), { cls: 'primary' }));
  },
  seguridad(b) {
    const c = JSON.parse(JSON.stringify(S.cfg.seguridad));
    const f = { bloqueoMin: inp({ type: 'number', min: 1, value: c.bloqueoMin }), sesionDias: inp({ type: 'number', min: 1, value: c.sesionDias }), intentos: inp({ type: 'number', min: 3, value: c.intentos }), bloqueoIntentosMin: inp({ type: 'number', min: 1, value: c.bloqueoIntentosMin }), solicitudCaducaHoras: inp({ type: 'number', min: 1, value: c.solicitudCaducaHoras }) };
    b.append(card(null, h('div.form', field('Bloquear pantalla tras (minutos sin usar)', f.bloqueoMin), field('La sesión caduca a los (días)', f.sesionDias), field('Intentos de contraseña antes de bloquear', f.intentos), field('Bloqueo tras fallos (minutos)', f.bloqueoIntentosMin), field('Las solicitudes de acceso caducan a las (horas)', f.solicitudCaducaHoras))),
      card('Cómo se protegen los datos', h('ul.small', { style: { margin: 0, paddingLeft: '18px' } }, h('li', 'Contraseñas guardadas como huella PBKDF2 (nunca en texto).'), h('li', 'Claves de IA y Telegram en el almacén protegido de Google; en el PC la sesión se cifra con Windows.'), h('li', 'Cada acción queda en la auditoría: quién, cuándo y qué cambió.'), h('li', 'Los permisos se comprueban en el servidor: aunque alguien manipule la app, no puede saltárselos.'))),
      btn('Guardar', () => saveCfg('seguridad', Object.fromEntries(Object.keys(f).map(k => [k, Number(f[k].value)]))), { cls: 'primary' }));
  },
  async copias(b) {
    const box = h('div');
    b.append(card(null, h('p.small', 'Cada noche se hace una copia automática de todo (se guardan las de los últimos 30 días y una por semana de los últimos 3 meses). Antes de operaciones delicadas también se hace una copia. Todas están en vuestro Google Drive, carpeta "Copias de seguridad".'),
      h('div.row.wrap', btn('Hacer copia ahora', async ev => { ev.target.closest('button').disabled = true; try { await api('copias.crear', { motivo: 'manual' }, { timeout: 180000 }); toast('Copia creada', 'ok'); drawB(); } catch (e) { toast(e.message, 'bad'); } finally { ev.target.closest('button').disabled = false; } }, { cls: 'primary', icon: 'archive' }),
        can('datos.exportar') ? btn('Descargar todo (JSON)', async () => { try { const d = await api('copias.exportar', {}, { timeout: 180000 }); const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })), download: 'celebridisenos_' + S.hoy + '.json' }); document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast(e.message, 'bad'); } }, { icon: 'download' }) : null)), box);
    const drawB = async () => {
      mount(box, h('p.muted', 'Cargando copias…'));
      const list = await api('copias.lista', {});
      mount(box, card('Copias disponibles (' + list.length + ')', list.length ? h('div.list', list.map(x => h('div.item', { style: { cursor: 'default' } }, icon('archive', 's'), h('div.grow', h('div.bold', x.fecha), h('div.tiny.muted', (x.manual ? 'Manual' : 'Automática') + ' · ' + x.motivo + ' · ' + Object.keys(x.archivos).join(' + '))), btn('Restaurar…', () => restore(x), { cls: 'sm' })))) : h('p.muted', 'Aún no hay copias.')));
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
  async papelera(b) {
    const list = await api('papelera.lista', {});
    b.append(h('p.small.muted', 'Lo que se borra viene aquí y se puede recuperar. ' + (can('papelera.admin') ? 'Ves la papelera de todo el equipo.' : 'Ves lo que has borrado tú.')),
      list.length ? h('div.list.boxed', list.map(x => h('div.item', { style: { cursor: 'default' } }, icon('trash', 's'), h('div.grow', h('div.bold.ellipsis', x.titulo || x.entidad), h('div.tiny.muted', 'Borrado por ' + x.borradoPor + ' · ' + fdt(x.fecha))),
        btn('Restaurar', async () => { try { await api('papelera.restaurar', { id: x.id }); toast('Restaurado', 'ok'); await pull(); SEC.papelera(mount(b, h('h2', 'Papelera'))); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm', icon: 'refresh' })))) : h('div.card', empty('trash', 'La papelera está vacía')),
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
