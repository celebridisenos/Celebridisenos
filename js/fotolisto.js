// ================= v13.3 · «Pieza lista»: foto de la cámara de la impresora por Telegram =================
// Cuando una Bambu termina un trabajo, el programa del PC (una sola ventana, la «líder») saca una foto de su cámara y:
//  · la manda por Telegram a quien lo tenga conectado, con el nombre del pedido y un mensaje para el cliente ya escrito;
//  · la guarda en el pedido (como el botón «Foto al pedido»).
// Nada se envía al cliente: el mensaje queda listo para que lo mandes tú. Una vez por trabajo aunque haya dos ventanas.
import { S, api } from './store.js';
import { desktop } from './desktop.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

export function captionListo(impresora, job, pedido) {
  const nom = pedido && pedido.cliente ? String(pedido.cliente).trim().split(/\s+/)[0] : '';
  const prod = (pedido && pedido.producto) || job.titulo || 'pedido';
  return ('✅ ' + impresora + ': «' + (job.titulo || prod) + '» terminado' + (pedido ? '\nPedido nº ' + pedido.numero + (pedido.cliente ? ' · ' + pedido.cliente : '') : '') +
    (pedido ? '\n\n💬 Mensaje para el cliente (cópialo):\nHola' + (nom ? ' ' + nom : '') + ', ¡tu ' + prod + ' ya está hecho! 🎉 Así ha quedado 📸 En breve te lo preparo para enviar.' : '')).slice(0, 900);
}

// Devuelve { enviados, aviso, omitida, guardada }. Nunca lanza: una foto que no sale no debe parar el taller.
export async function fotoPiezaLista(b, job, pedido, impresora) {
  try {
    if (!desktop.on || !b || !b.serial || !job) return { omitida: 'sin cámara' };
    const nt = (S.cfg && S.cfg.notificaciones) || {};
    if (nt.fotoListo === false) return { omitida: 'desactivado' };
    let blob = null, ult = null;
    for (let i = 0; i < 16 && !blob; i++) {            // la primera petición despierta la cámara; la imagen llega en 1–10 s
      const r = await desktop.camaraFoto(b.serial);
      if (r.blob && r.edadMs < 20000) blob = r.blob; else { ult = r; if (r.estado === 'no_compatible') break; await sleep(1000); }
    }
    if (!blob) return { omitida: 'sin imagen' + (ult && ult.problema ? ': ' + ult.problema : '') };
    const out = { enviados: 0, aviso: '' };
    if (nt.telegram !== false) {
      try { Object.assign(out, await api('telegram.foto', { imagen: await b64(blob), texto: captionListo(impresora || b.nombre || b.modelo, job, pedido), clave: job.id, pedidoId: pedido ? pedido.id : '' }, { quiet: true })); }
      catch (e) { out.aviso = e.message; }
    }
    if (pedido && !out.duplicado) {
      try { const F = await import('./files.js'); await F.uploadFile(new File([blob], 'pieza_lista_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.jpg', { type: 'image/jpeg' }), { entidad: 'pedidos', entidadId: pedido.id, original: true }); out.guardada = true; } catch (e) { }
    }
    return out;
  } catch (e) { return { omitida: String(e.message || e) }; }
}
