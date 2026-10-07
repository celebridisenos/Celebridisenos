// ================= Notificaciones =================
import { h, mount, icon, btn, toast, ago, empty, pill } from '../ui.js';
import { S, api, emit, on, byId } from '../store.js';
import { go } from '../app.js';

const ICON = { urgente: '🔴', incidencia: '⚠️', tarea: '📋', noticia: '📰', comentario: '💬', mencion: '🗣️', solicitud: '🔑', seguridad: '🛡️', pedido: '📦', redes: '📱', informe: '📊', bienvenida: '👋' };
// v10: cada aviso lleva directamente a su contenido (noticia y comentario exacto, mensaje del chat…)
export function linkPath(enlace) {
  // v10.5: "noorko>producto:ID" → el aviso es de otro espacio: se cambia de espacio y se abre
  let m = String(enlace || '').match(/^([a-z]+)>(.*)$/);
  if (!m && S.ws !== 'principal' && /^(pedido|pedidos|producto|cliente|tarea|redes):?/.test(String(enlace || ''))) m = [null, 'principal', String(enlace)];
  if (m) { const p = linkPath(m[2]); if (m[1] !== S.ws) { import('../store.js').then(st => st.switchWs(m[1])).then(() => p && go(p)); return ''; } return p; }
  const [k, id, sub] = String(enlace || '').split(':');
  if (k === 'noticia' && sub) return 'noticias/' + id + '/' + sub;
  if (k === 'chat' && id) return 'chat/' + id;
  if (k === 'producto' && id) return 'productos/' + id;
  if (k === 'cliente' && id) return 'clientes/' + id;
  return { pedido: 'pedidos/' + id, tarea: 'tareas/' + id, noticia: 'noticias/' + id, redes: 'redes/' + id, solicitudes: 'config/solicitudes', auditoria: 'config/auditoria', copias: 'config/copias', informes: 'informes', pedidos: 'pedidos' }[k] || (k ? k : '');
}
async function markRead(ids, all) {
  const list = all ? S.t.notificaciones.filter(n => !n.leida) : S.t.notificaciones.filter(n => ids.includes(n.id));
  list.forEach(n => { n.leida = true; });
  emit();
  try { await api('notificaciones.leer', all ? { todas: true } : { ids }); } catch (e) { }
}

export function render(el) {
  const box = h('div');
  el.append(h('div.page-head', h('h1', 'Notificaciones'), btn('Marcar todo como leído', () => markRead([], true), { icon: 'check' })), telegramCta(), pushCta(), box);
  const draw = () => {
    const list = S.t.notificaciones.slice().sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
    if (!list.length) return mount(box, h('div.card', empty('bell', 'No tienes notificaciones', 'Aquí te avisaremos de pedidos urgentes, tareas, menciones, solicitudes…')));
    mount(box, h('div.list.boxed', list.slice(0, 200).map(n => h('div.item', { style: n.leida ? {} : { background: 'var(--brand-soft)' }, onclick: () => { markRead([n.id]); const p = linkPath(n.enlace); if (p) go(p); } },
      h('span', { style: { fontSize: '20px' } }, ICON[n.tipo] || '🔔'), h('div.grow', h('div' + (n.leida ? '' : '.bold'), n.titulo), n.texto ? h('div.small.muted', n.texto) : null, h('div.tiny.muted', ago(n.creado))), !n.leida ? h('span.pill.brand', 'Nueva') : null))));
  };
  draw();
  return { update: draw };
}
function telegramCta() {
  if (!S.cfg.secretos || !S.cfg.secretos.telegram) return null;
  if (S.me.telegram) return h('p.small.muted', { style: { marginBottom: '10px' } }, '✅ Telegram conectado: los avisos importantes te llegan también al móvil.');
  return h('div.card', { style: { marginBottom: '14px' } }, h('div.row.wrap', h('div.grow', h('b', 'Recibe los avisos importantes en el móvil'), h('p.small.muted', 'Conecta tu Telegram (un clic) para enterarte de pedidos urgentes o solicitudes aunque la app esté cerrada.')), btn('Conectar Telegram', connectTelegram, { cls: 'primary' })));
}
export async function connectTelegram() {
  try {
    const r = await api('telegram.codigo', {});
    window.open(r.enlace, '_blank', 'noopener');
    toast('Se abre Telegram: pulsa "Iniciar" en el chat del bot ' + r.bot + ' y vuelve aquí.', '', 9000);
    for (let i = 0; i < 20; i++) {
      await new Promise(res => setTimeout(res, 4000));
      const c = await api('telegram.comprobar', {});
      if (c.conectado) { S.me.telegram = true; emit(); toast('✅ Telegram conectado', 'ok'); return; }
    }
    toast('Aún no veo la conexión. Si ya pulsaste "Iniciar", espera un minuto y recarga.', 'warn');
  } catch (e) { toast(e.message, 'bad'); }
}
function pushCta() {
  if (!('Notification' in window) || Notification.permission !== 'default') return null;
  return h('div.card', { style: { marginBottom: '14px' } }, h('div.row.wrap', h('div.grow', h('b', 'Avisos del sistema'), h('p.small.muted', 'Permite que la app te muestre avisos en la pantalla mientras está abierta.')), btn('Permitir avisos', async e => { const r = await Notification.requestPermission(); e.target.closest('.card').remove(); if (r === 'granted') toast('Avisos activados', 'ok'); })));
}

// Avisos del sistema (Windows / Android) cuando llegan notificaciones nuevas con la app abierta
let seen = null;
export function watchNotifications() {
  on(() => {
    const unread = S.t.notificaciones.filter(n => !n.leida);
    if (seen === null) { seen = new Set(unread.map(n => n.id)); return; }
    const fresh = unread.filter(n => !seen.has(n.id));
    fresh.forEach(n => seen.add(n.id));
    if (!fresh.length || !('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible' && document.hasFocus()) return;
    fresh.slice(0, 3).forEach(n => {
      const opts = { body: n.texto || '', tag: n.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { path: linkPath(n.enlace) } };
      // En Android solo funcionan a través del service worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) { navigator.serviceWorker.ready.then(r => r.showNotification(n.titulo, opts)).catch(() => { }); return; }
      try {
        const x = new Notification(n.titulo, opts);
        x.onclick = () => { window.focus(); const p = linkPath(n.enlace); if (p) go(p); x.close(); };
      } catch (e) { }
    });
  });
}
