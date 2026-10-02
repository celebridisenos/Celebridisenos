// ================= ✨ CELEBRITY · coordinadora interna =================
// Celebrity no es solo un chat: cada día resume qué hay que hacer, controla los objetivos y
// recomienda el siguiente paso. Todo con datos reales y con los permisos de quien pregunta.
// El resumen del día se calcula al instante (sin esperar al modelo de IA).
import { S, can, dash, unreadCount, timing } from '../store.js';

const CL = window.CL;
export const NAME = 'Celeby Nova';

// Objetivos con su progreso (solo datos reales)
export function objetivos() {
  const lista = (S.cfg && S.cfg.objetivos && S.cfg.objetivos.lista) || [];
  const data = { redes: S.t.redes, pedidos: S.t.pedidos, tareas: S.t.tareas, productos: S.t.productos };
  return lista.map(o => Object.assign({}, o, { p: CL.objectiveProgress(o, data, S.cfg, S.hoy) }));
}
export function objetivoTexto(o) {
  if (o.titulo) return o.titulo;
  const per = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' }[o.periodo] || '';
  const m = o.meta;
  return ({ publicar: 'Hacer ' + m + ' publicaciones', pedidos: 'Conseguir ' + m + ' pedidos', ventas: 'Vender ' + String(m).replace('.', ',') + ' €', tareas: 'Completar ' + m + ' tareas', productos: 'Crear ' + m + ' productos' }[o.tipo] || (o.tipo + ' ' + m)) + ' ' + per;
}

// Resumen del día: frases cortas, lo más importante primero, y el siguiente paso
export function brief() {
  const d = dash();
  const items = [];
  const add = (n, txt, path, peso) => { if (n > 0) items.push({ n, txt, path, peso }); };
  if (can('pedidos.ver')) {
    add(d.pedidos.vencidos.length, d.pedidos.vencidos.length === 1 ? 'pedido vencido' : 'pedidos vencidos', 'pedidos/?f=vencidos', 100);
    const hoy = d.pedidos.proximos.filter(id => { const o = S.t.pedidos.find(x => x.id === id); return o && timing(o).nivel === 'today'; }).length;
    add(hoy, hoy === 1 ? 'pedido vence hoy' : 'pedidos vencen hoy', 'pedidos/?f=hoy', 90);
    add(d.pedidos.incidencias.length, d.pedidos.incidencias.length === 1 ? 'pedido con incidencia' : 'pedidos con incidencia', 'pedidos/?f=incidencias', 80);
    add(d.pedidos.enviar, d.pedidos.enviar === 1 ? 'pedido listo para enviar' : 'pedidos listos para enviar', 'pedidos/?f=enviar', 60);
  }
  if (can('tareas.ver')) add(d.tareas.mias, d.tareas.mias === 1 ? 'tarea tuya pendiente' : 'tareas tuyas pendientes', 'tareas/?f=mias', 50);
  if (can('chat.usar')) add(S.chatUnread || 0, (S.chatUnread || 0) === 1 ? 'mensaje sin leer en el chat' : 'mensajes sin leer en el chat', 'chat', 55);
  add(unreadCount(), unreadCount() === 1 ? 'aviso sin leer' : 'avisos sin leer', 'notificaciones', 40);
  if (can('redes.ver')) { add(d.redes.hoy.length, d.redes.hoy.length === 1 ? 'publicación prevista hoy' : 'publicaciones previstas hoy', 'redes', 58); add(d.redes.sinPreparar, 'publicaciones próximas sin preparar', 'redes', 30); }
  items.sort((a, b) => b.peso - a.peso);
  const objs = objetivos();
  // Siguiente paso: lo más urgente, o el objetivo que falta
  let next = '';
  const top = items[0];
  const pend = objs.find(o => !o.p.hecho);
  if (top && top.peso >= 80) next = 'Empieza por ' + (top.n === 1 ? 'el ' : 'los ') + top.txt.replace(/^pedidos? /, m => m) + '.';
  else if (pend) next = 'Te falta' + (pend.p.meta - pend.p.valor === 1 ? '' : 'n') + ' ' + fmtN(pend.p.meta - pend.p.valor, pend.tipo) + ' para «' + objetivoTexto(pend) + '».';
  else if (top) next = 'Siguiente: ' + top.n + ' ' + top.txt + '.';
  else next = objs.length ? 'Objetivos cumplidos. Buen trabajo.' : 'Todo al día.';
  return { items, objetivos: objs, next };
}
function fmtN(v, tipo) { return tipo === 'ventas' ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' €' : String(v); }

// Texto corto (para responder en el chat de Celebrity sin esperar al modelo)
export function briefText() {
  const b = brief();
  const lines = ['Hoy:'];
  if (!b.items.length) lines.push('• Nada urgente.');
  b.items.slice(0, 6).forEach(i => lines.push('• ' + i.n + ' ' + i.txt));
  b.objetivos.forEach(o => lines.push('• Objetivo: ' + objetivoTexto(o) + ' → ' + fmtN(o.p.valor, o.tipo) + ' / ' + fmtN(o.p.meta, o.tipo) + (o.p.hecho ? ' ✓' : '')));
  lines.push(b.next);
  return lines.join('\n');
}
export const isBriefQuestion = q => !/\b(pon|pones|crea|crear|nuevo|nueva|marca|fija|cambia|quita|borra)\b/.test(String(q).toLowerCase()) && /\b(resumen( del dia| de hoy)?|que (hay|tengo|toca|hago) (hoy|ahora|primero)|como vamos( hoy)?|prioridad(es)?( de hoy)?|objetivos?( de hoy)?|que (me )?falta( hoy)?|buenos dias)\b/.test(String(q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
