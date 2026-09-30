// ================= Primera conexión, configuración inicial y entrada =================
import { h, mount, icon, btn, field, inp, sel, toast, avatar, initials } from '../ui.js';
import { S, api, setServer, afterLogin, pull, login, passHash, checkNewPassword } from '../store.js';
import { rolePicker, ROLE_INFO } from '../roles.js';
import { iaSetupStep } from '../ai/models.js';
import { desktop } from '../desktop.js';

function page(...kids) { return h('div.center-page', ...kids); }
function logo() { let src = 'icons/icon-192.png'; try { src = localStorage.getItem('cd.logo') || src; } catch (e) { } return h('div.brand', { style: { padding: '0 0 12px' } }, h('div.logo', h('img', { src, alt: '', style: { objectFit: 'contain' } })), h('div', h('b', 'CelebriDiseños'), h('small', 'Gestión del negocio'))); }
function errBox() { return h('p.bad-t', { role: 'alert' }); }

// ---------- 0. Conectar con el servidor ----------
export function renderConnect(app, done) {
  const params = new URLSearchParams(location.search);
  const url = inp({ placeholder: 'https://script.google.com/macros/s/…/exec', value: params.get('s') || '', autocomplete: 'off' });
  const msg = errBox();
  const b = btn('Conectar', async () => {
    msg.textContent = '';
    const v = url.value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(v) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(v)) { msg.textContent = 'La dirección debe ser la de la aplicación web de Google (termina en /exec).'; return; }
    b.disabled = true; b.textContent = 'Comprobando…';
    try {
      await setServer(v);
      const st = await api('sys.estado', {}, { token: '' });
      toast('Conectado con el servidor ' + (st.empresa ? 'de ' + st.empresa : ''), 'ok');
      history.replaceState(null, '', location.pathname + location.hash);
      done();
    } catch (e) { msg.textContent = 'No he podido conectar: ' + e.message; b.disabled = false; b.textContent = 'Conectar'; }
  }, { cls: 'primary' });
  url.addEventListener('keydown', e => { if (e.key === 'Enter') b.click(); });
  mount(app, page(h('div.card.auth-card.col', { style: { padding: '28px' } }, logo(),
    h('h2', 'Conectar con vuestro servidor'),
    h('p.muted', 'Pega la dirección de la aplicación web de Google que creasteis al instalar (la guía lo explica paso a paso). Solo hay que hacerlo una vez en cada dispositivo.'),
    field('Dirección del servidor', url), msg, b,
    h('p.tiny.muted', 'En el móvil también puedes escanear el código QR que aparece en el ordenador, en Configuración > Móvil.'))));
  if (url.value) b.click();
}

// ---------- Entrar ----------
export function renderLogin(app, done, st) {
  const last = localStorage.getItem('cd.lastUser') || '';
  const u = inp({ placeholder: 'Tu usuario', value: last, autocomplete: 'username', autocapitalize: 'off' });
  const p = inp({ type: 'password', placeholder: 'Tu contraseña', autocomplete: 'current-password' });
  const msg = errBox();
  const b = btn('Entrar', async () => {
    msg.textContent = '';
    if (!u.value || !p.value) { msg.textContent = 'Escribe tu usuario y tu contraseña.'; return; }
    b.disabled = true; b.textContent = 'Entrando…';
    try {
      await login(u.value.trim(), p.value);
      done();
    } catch (e) { msg.textContent = e.code === 'NET' ? 'Sin conexión: para entrar la primera vez necesitas Internet.' : e.message; b.disabled = false; b.textContent = 'Entrar'; p.value = ''; p.focus(); }
  }, { cls: 'primary' });
  [u, p].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') b.click(); }));
  mount(app, page(h('div.card.auth-card.col', { style: { padding: '28px' } }, logo(),
    h('h2', 'Hola de nuevo 👋'), h('p.muted', st && st.empresa ? 'Entra en ' + st.empresa : 'Entra con tu usuario'),
    last ? h('div.row', avatar({ nombre: last }), h('div.grow', h('div.bold', last), h('button.btn.ghost.sm', { onclick: () => { u.value = ''; u.focus(); } }, 'No soy yo'))) : null,
    field('Usuario', u, null, last ? 'hidden' : ''), field('Contraseña', p), msg, b,
    h('p.tiny.muted', '¿Has olvidado la contraseña? Pide a una administradora que te ponga una nueva desde Configuración > Usuarios.'),
    h('button.btn.ghost.sm', { onclick: async () => { await setServer(''); done(); } }, 'Cambiar de servidor'))));
  setTimeout(() => (last ? p : u).focus(), 50);
}

// ---------- Configuración inicial (instalación nueva) ----------
export function renderSetup(app, done) {
  const st = { step: 0, codigo: '', empresa: { nombre: 'CelebriDiseños', email: '', telefono: '', web: '' }, admin: { nombre: '', usuario: '', password: '', password2: '', color: '#7c3aed' }, negocioUrl: '', cambios: [], users: [], productRoot: '' };
  const STEPS = ['Bienvenida', 'Empresa', 'Administradora', 'Google Sheets', 'Usuarios', 'Roles', 'Almacenamiento', 'IA local', 'Avisos', 'Comprobar', 'Listo'];
  const card = h('div.card.wizard.col', { style: { padding: '28px' } });
  mount(app, page(card));
  const draw = () => {
    const bar = h('div.wiz-steps', STEPS.map((s, i) => h('div.st' + (i === st.step ? '.on' : i < st.step ? '.done' : ''), { title: s })));
    const body = h('div.col');
    const nav = h('div.row', { style: { marginTop: '8px' } });
    mount(card, logo(), bar, h('div.tiny.muted', 'Paso ' + (st.step + 1) + ' de ' + STEPS.length + ' · ' + STEPS[st.step]), body, nav);
    STEP_FNS[st.step](body, nav);
  };
  const next = () => { st.step++; draw(); };
  const back = () => { st.step--; draw(); };
  const msg = errBox();
  const STEP_FNS = [
    (b, n) => {
      const c = inp({ placeholder: 'Ej.: K7M2QXAB', value: st.codigo, style: { textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 } });
      mount(b, h('h1', 'Bienvenidas a vuestro nuevo sistema'), h('p', 'Vamos a dejarlo todo listo en unos minutos. Nada de lo que ya tenéis en Google Sheets se pierde: antes de tocar nada se hace una copia de seguridad.'),
        field('Código de instalación', c, 'Aparece en el editor de Apps Script al ejecutar "instalar" (la guía te lo muestra).'), msg);
      mount(n, h('span.grow'), btn('Empezar', () => { if (c.value.trim().length < 6) { msg.textContent = 'Escribe el código de instalación.'; return; } st.codigo = c.value.trim().toUpperCase(); msg.textContent = ''; next(); }, { cls: 'primary' }));
    },
    (b, n) => {
      const f = { nombre: inp({ value: st.empresa.nombre }), email: inp({ value: st.empresa.email, type: 'email' }), telefono: inp({ value: st.empresa.telefono }), web: inp({ value: st.empresa.web }) };
      mount(b, h('h2', 'Datos de la empresa'), h('div.form', field('Nombre de la empresa *', f.nombre, null, 'full'), field('Email (opcional)', f.email), field('Teléfono (opcional)', f.telefono), field('Web o tienda (opcional)', f.web, null, 'full')), msg);
      mount(n, btn('Atrás', back), h('span.grow'), btn('Siguiente', () => { if (!f.nombre.value.trim()) { msg.textContent = 'Escribe el nombre de la empresa.'; return; } Object.keys(f).forEach(k => st.empresa[k] = f[k].value.trim()); msg.textContent = ''; next(); }, { cls: 'primary' }));
    },
    (b, n) => {
      const f = { nombre: inp({ value: st.admin.nombre, placeholder: 'Adriana' }), usuario: inp({ value: st.admin.usuario, placeholder: 'adriana', autocapitalize: 'off' }), password: inp({ type: 'password', value: st.admin.password, autocomplete: 'new-password' }), password2: inp({ type: 'password', value: st.admin.password2, autocomplete: 'new-password' }) };
      f.nombre.addEventListener('input', () => { if (!st._userTouched) f.usuario.value = f.nombre.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.'); });
      f.usuario.addEventListener('input', () => { st._userTouched = true; });
      mount(b, h('h2', 'Administradora principal'), h('p.muted', 'Esta cuenta tendrá todos los permisos. Después podrás crear a Biou como segunda administradora.'),
        h('div.form', field('Nombre *', f.nombre), field('Usuario para entrar *', f.usuario), field('Contraseña *', f.password, 'Mínimo 6 caracteres. Mejor una frase fácil de recordar.'), field('Repite la contraseña *', f.password2)), msg);
      mount(n, btn('Atrás', back), h('span.grow'), btn('Siguiente', () => {
        Object.keys(f).forEach(k => st.admin[k] = f[k].value.trim());
        if (!st.admin.nombre || !st.admin.usuario) return msg.textContent = 'Rellena nombre y usuario.';
        const perr = checkNewPassword(st.admin.password, st.admin.password2);
        if (perr) return msg.textContent = perr;
        msg.textContent = ''; next();
      }, { cls: 'primary' }));
    },
    (b, n) => {
      const u = inp({ value: st.negocioUrl, placeholder: 'https://docs.google.com/spreadsheets/d/…/edit' });
      mount(b, h('h2', 'Conectar vuestro Google Sheets'), h('p', 'Pega el enlace de vuestro Sheet de negocio (el de Pedidos, Clientes, Productos…).'),
        field('Enlace del Google Sheet', u),
        h('div.card.flat', { style: { background: 'var(--surface-2)' } }, h('h4', 'Qué voy a hacer en el Sheet'), h('ul.small', { style: { margin: '6px 0 0', paddingLeft: '18px' } },
          h('li', 'Primero: copia de seguridad completa en Drive.'), h('li', 'Añadir columnas nuevas al final (canal, plazo, fecha límite, responsable…). Las técnicas quedan ocultas.'),
          h('li', 'Arreglar las fórmulas que solo contaban 55 pedidos / 40 productos.'), h('li', 'Actualizar la lista de estados de pedido y sus colores.'), h('li', 'No se borra ningún dato.'))), msg);
      const go2 = btn('Instalar y conectar', async () => {
        st.negocioUrl = u.value.trim();
        if (!/docs\.google\.com\/spreadsheets\/d\//.test(st.negocioUrl)) { msg.textContent = 'Pega el enlace completo del Google Sheet.'; return; }
        msg.textContent = ''; go2.disabled = true; go2.textContent = 'Preparando… (puede tardar un minuto)';
        try {
          const adm = { nombre: st.admin.nombre, usuario: st.admin.usuario, color: st.admin.color, ph: await passHash(st.admin.password) };
          const r = await api('setup.init', { codigo: st.codigo, empresa: st.empresa, admin: adm, negocioUrl: st.negocioUrl }, { token: '', timeout: 300000 });
          st.cambios = r.cambiosSheet || [];
          await afterLogin(r, st.admin.password);
          st.admin.password = st.admin.password2 = '';
          next();
        } catch (e) {
          go2.disabled = false; go2.textContent = 'Instalar y conectar';
          msg.textContent = e.message;
          if (e.code === 'AUTH' && /código/.test(e.message)) { st.step = 0; setTimeout(draw, 1500); }
        }
      }, { cls: 'primary' });
      mount(n, btn('Atrás', back), h('span.grow'), go2);
    },
    (b, n) => {
      const list = h('div.list.boxed');
      const drawList = () => mount(list, [{ nombre: S.me.nombre, rol: 'admin', usuario: S.me.usuario, yo: true }].concat(st.users).map(x => h('div.item', avatar(x), h('div.grow', h('div.bold', x.nombre + (x.yo ? ' (tú)' : '')), h('div.tiny.muted', x.usuario + ' · ' + ((ROLE_INFO[x.rol] || {}).t || x.rol))))));
      drawList();
      const f = { nombre: inp({ placeholder: 'Biou' }), usuario: inp({ placeholder: 'biou', autocapitalize: 'off' }), rol: rolePicker(null, 'admin'), password: inp({ type: 'password', autocomplete: 'new-password' }) };
      f.nombre.addEventListener('input', () => { f.usuario.value = f.nombre.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.'); });
      const addB = btn('Añadir usuario', async () => {
        msg.textContent = '';
        try {
          const perr = checkNewPassword(f.password.value);
          if (perr) { msg.textContent = perr; return; }
          const r = await api('usuarios.crear', { nombre: f.nombre.value.trim(), usuario: f.usuario.value.trim(), rol: f.rol.value, ph: await passHash(f.password.value) });
          st.users.push(Object.assign(r, {})); drawList(); Object.values(f).forEach(x => { if (x.tagName === 'INPUT') x.value = ''; });
          toast('Usuario ' + r.nombre + ' creado', 'ok');
        } catch (e) { msg.textContent = e.message; }
      }, { icon: 'plus' });
      mount(b, h('h2', 'Crear usuarios'), h('p.muted', 'Crea aquí a Biou y a cualquier persona del equipo. Cada una entra con su usuario y contraseña. Puedes hacerlo también más tarde.'), list,
        h('div.form', field('Nombre', f.nombre), field('Usuario', f.usuario), field('Contraseña inicial', f.password, 'Podrá cambiarla desde su perfil.'), field('Rol', f.rol, null, 'full')), addB, msg);
      mount(n, h('span.grow'), btn('Siguiente', next, { cls: 'primary' }));
    },
    (b, n) => {
      mount(b, h('h2', 'Roles y permisos'), h('p.muted', 'Estos son los roles de partida. Cada permiso se puede ajustar en Configuración > Roles y permisos.'),
        h('div.grid.g3', Object.keys(ROLE_INFO).map(k => h('div.card.flat', h('h4', ROLE_INFO[k].i + ' ' + ROLE_INFO[k].t), h('p.small.muted', { style: { marginTop: '6px' } }, ROLE_INFO[k].d)))),
        h('p.small', 'Si alguien intenta entrar en una zona sin permiso, puede pedir acceso: las administradoras reciben un aviso y lo aprueban por un tiempo limitado.'));
      mount(n, btn('Atrás', back), h('span.grow'), btn('Siguiente', next, { cls: 'primary' }));
    },
    (b, n) => {
      const pr = inp({ value: st.productRoot, placeholder: 'C:\\Users\\…\\Desktop\\CELEBRIDISENOS' });
      mount(b, h('h2', 'Almacenamiento'),
        h('div.card.flat', h('div.row', icon('folder'), h('div', h('b', 'Google Drive'), h('p.small.muted', 'Las fotos, vídeos y documentos de pedidos, clientes, noticias y redes se guardan en Drive, en la carpeta "CelebriDiseños (datos de la app)". Se ven desde el móvil.')))),
        desktop.on ? h('div.card.flat.col', h('div.row', icon('cube'), h('div', h('b', 'Carpeta de productos en este ordenador'), h('p.small.muted', 'Donde tenéis las carpetas por categoría con los STL. La app crea ahí las carpetas de los productos nuevos. En el segundo ordenador, pon la ruta de red a esta misma carpeta.'))),
          field('Ruta de la carpeta', pr), btn('Elegir carpeta…', async () => { try { const r = await desktop.pickFolder(); if (r && r.path) pr.value = r.path; } catch (e) { toast(e.message, 'bad'); } }, { icon: 'folder', cls: 'sm' }))
          : h('p.small.muted', 'La carpeta de productos del ordenador se configura desde el programa de escritorio.'), msg);
      mount(n, btn('Atrás', back), h('span.grow'), btn('Siguiente', async () => {
        if (desktop.on && pr.value.trim()) {
          try { await desktop.list(pr.value.trim()); await desktop.setConfig('productRoot', pr.value.trim()); st.productRoot = pr.value.trim(); }
          catch (e) { msg.textContent = 'No puedo abrir esa carpeta: ' + e.message; return; }
        }
        msg.textContent = ''; next();
      }, { cls: 'primary' }));
    },
    (b, n) => iaSetupStep(b, n, { next, back, msg }),
    (b, n) => {
      const k = inp({ type: 'password', placeholder: '123456789:AA…', autocomplete: 'off' });
      mount(b, h('h2', 'Avisos en el móvil (Telegram)'), h('p', 'Los avisos importantes (pedido urgente, incidencia, solicitud de acceso…) pueden llegar al móvil por Telegram al instante, aunque la app esté cerrada.'),
        h('ol.small', { style: { paddingLeft: '18px' } }, h('li', 'Abre Telegram y busca @BotFather.'), h('li', 'Escribe /newbot, ponle un nombre (p. ej. "Avisos CelebriDiseños") y un usuario que acabe en "bot".'), h('li', 'Copia el token que te da y pégalo aquí.'), h('li', 'Después, cada persona conecta su Telegram desde su perfil (un clic).')),
        field('Token del bot', k), h('p.small.muted', 'Los avisos también aparecen siempre dentro de la app (campana).'), msg);
      mount(n, btn('Atrás', back), h('span.grow'), btn('Saltar', next, { cls: 'ghost' }), btn('Guardar', async () => {
        if (!k.value.trim()) return next();
        try { const r = await api('config.secreto', { nombre: 'telegram', valor: k.value.trim() }); if (r.error) msg.textContent = r.error; else { toast('Bot conectado: ' + r.prueba, 'ok'); next(); } }
        catch (err) { msg.textContent = err.message; }
      }, { cls: 'primary' }));
    },
    (b, n) => {
      const list = h('div.checklist', h('div.ck', h('span.st.wait', '…'), h('span', 'Comprobando conexiones…')));
      mount(b, h('h2', 'Comprobar conexiones'), list);
      mount(n, h('span.grow'), btn('Siguiente', next, { cls: 'primary' }));
      api('sys.comprobar', {}).then(r => mount(list, r.map(c => h('div.ck', h('span.st.' + (c.ok ? 'ok' : (/opcional|Sin configurar/.test(c.detalle) ? 'wait' : 'bad')), c.ok ? '✓' : (/opcional|Sin configurar/.test(c.detalle) ? '–' : '!')), h('div.grow', h('div.bold', c.nombre), h('div.tiny.muted', c.detalle))))))
        .catch(e => mount(list, h('p.bad-t', e.message)));
    },
    (b, n) => {
      mount(b, h('div', { style: { fontSize: '48px' } }, '🎉'), h('h1', '¡Todo listo!'), h('p', 'El sistema ya está funcionando. Algunas ideas para empezar:'),
        h('ul', h('li', 'Crea vuestro primer pedido desde Pedidos > Nuevo.'), h('li', 'Instala la app en el móvil: Configuración > Móvil.'), h('li', 'En el segundo ordenador: instala el programa y entra con tu usuario (misma dirección de servidor).')),
        st.cambios.length ? h('details.more', h('summary', 'Cambios hechos en vuestro Google Sheet (' + st.cambios.length + ')'), h('div.in', h('ul.small', st.cambios.map(c => h('li', c))))) : null);
      mount(n, h('span.grow'), btn('Entrar en la app', async () => { await pull(true); location.hash = '#/inicio'; done(); }, { cls: 'primary' }));
    }
  ];
  draw();
}
