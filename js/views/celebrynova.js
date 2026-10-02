// ================= v11.1 · CelebryNova dentro de CelebriDiseños =================
// CelebryNova es el operador autónomo (aprende procedimientos, trabaja en el navegador y en Windows,
// se para ante lo desconocido). Tiene su propio motor y sus propios datos en CELEBRIDISENOS\CELEBRYNOVA;
// el programa lo arranca solo y aquí se ve su centro de control completo.
import { h, mount, btn, toast, icon, confirmDlg } from '../ui.js';
import { desktop } from '../desktop.js';

export function render(el) {
  const head = h('div.page-head', h('div', h('h2', '🤖 Operar en el PC'), h('div.muted.small', 'El operador de Celeby Nova: aprende cómo haces las cosas, las repite con tu permiso y se para si algo no lo entiende.')));
  const body = h('div');
  el.append(head, body);
  if (!desktop.on) {
    mount(body, h('div.card', h('h3', 'Solo en el programa del PC'), h('p.muted', 'CelebryNova trabaja en el ordenador (navegador y Windows). Ábrelo desde CelebriDiseños en el PC.')));
    return {};
  }
  let timer = null, alive = true;
  const stop = () => { alive = false; clearTimeout(timer); };
  async function refresh() {
    if (!alive) return;
    let st;
    try { st = await desktop.novaEstado(); } catch (e) { mount(body, h('div.card', h('p.bad-t', e.message))); return; }
    if (st.instalando) {
      mount(body, h('div.card.col', h('h3', '⏳ Instalando CelebryNova…'), h('p.muted', 'Se está descargando lo necesario y se están pasando sus pruebas automáticas. Tarda unos minutos; puedes seguir usando el programa.')));
      timer = setTimeout(refresh, 4000); return;
    }
    if (!st.instalado && st.remoto && !st.paquete) {
      mount(body, h('div.card.col', h('h3', 'CelebryNova trabaja en el ordenador principal'),
        h('p', 'Este PC usa la carpeta de productos de otro ordenador (', h('code', st.carpetaProductos), '). CelebryNova vive en ese ordenador, junto a la carpeta CELEBRIDISENOS, y trabaja desde allí.'),
        h('p.muted', 'Desde aquí puedes usar CelebriDiseños con normalidad. Para enseñarle o ver lo que hace, abre CelebriDiseños en el ordenador principal → menú CelebryNova.')));
      return;
    }
    if (!st.instalado) {
      mount(body, h('div.card.col', h('h3', 'CelebryNova no está instalado'),
        st.paquete ? [h('p', 'Está todo listo para instalarlo en ', h('code', st.carpeta), '.'), !st.python ? h('p.warn-t', 'Falta Python 3: instálalo desde python.org (marca «Add to PATH») y vuelve aquí.') : null,
          btn('Instalar CelebryNova', async () => { try { await desktop.novaInstalar(); refresh(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'primary', icon: 'download' })]
          : h('p.muted', 'No encuentro el paquete de CelebryNova en ' + st.carpeta + '.'),
        st.estadoInstalacion && st.estadoInstalacion !== 'OK' ? h('p.small.bad-t', st.estadoInstalacion) : null));
      return;
    }
    if (!st.enMarcha) {
      mount(body, h('div.card.col', h('h3', 'CelebryNova está parado'), h('p.muted', 'Normalmente arranca solo al abrir el programa.'),
        st.estadoInstalacion && st.estadoInstalacion !== 'OK' ? h('p.small.bad-t', 'Última instalación: ' + st.estadoInstalacion) : null,
        h('div.row', btn('Arrancar CelebryNova', async () => { mount(body, h('div.card', h('p.muted', 'Arrancando…'))); try { await desktop.novaArrancar(); } catch (e) { toast(e.message, 'bad'); } refresh(); }, { cls: 'primary', icon: 'play' }),
          st.paquete ? btn('Reinstalar / actualizar', async () => { try { await desktop.novaInstalar(); refresh(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'ghost' }) : null)));
      return;
    }
    let url;
    try { url = (await desktop.novaUrl()).url; } catch (e) { mount(body, h('div.card', h('p.muted', 'CelebryNova está arrancando…'))); timer = setTimeout(refresh, 1500); return; }
    head.replaceChildren(h('div', h('h2', '🤖 Operar en el PC'), h('div.muted.small', 'v' + (st.version || '') + ' · en segundo plano aunque cierres esta ventana · tus datos en ' + st.carpeta)),
      h('div.row', st.paquete ? btn('Actualizar', async () => { if (!await confirmDlg('Actualizar CelebryNova', 'CelebryNova se parará un momento para actualizarse y pasará sus pruebas. Tus procedimientos y su memoria no se tocan.', 'Actualizar')) return; try { await desktop.novaInstalar(); refresh(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'ghost sm', icon: 'refresh' }) : null));
    mount(body, h('iframe.nova-frame', { src: url, title: 'Centro de control de CelebryNova', allow: 'clipboard-write' }));
  }
  refresh();
  return { destroy: stop };
}

// ---------- «Publicar con CelebryNova» desde un producto ----------
// Elige uno de sus procedimientos APROBADOS y le pasa los datos del producto: título y descripción
// (los textos de venta de cada plataforma), precio, color, material, SKU y la carpeta de fotos.
const MAP = {
  titulo: (p, t) => t.titulo || p.nombre, nombre: p => p.nombre, descripcion: (p, t) => t.descripcion || p.descripcion || '',
  precio: (p, t) => String(t.precio || p.precio || ''), color: p => p.color || '', material: p => p.material || '', sku: p => p.sku || p.id,
  categoria: p => [p.categoria, p.subcategoria].filter(Boolean).join(' / '), medidas: p => p.tamano || '', tamano: p => p.tamano || '', tallas: p => p.tallas || '',
  fotos: p => p.ruta || '', carpeta: p => p.ruta || '', archivos: p => p.ruta || ''
};
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

export async function publishWithNova(p, modal, go) {
  if (!desktop.on) return toast('CelebryNova solo funciona en el programa del PC', 'bad');
  let procs;
  try { procs = (await desktop.novaApi('procedimientos')).filter(x => x.estado === 'aprobado'); } catch (e) { return toast('CelebryNova no está en marcha: ábrelo en Celeby Nova → Operar en el PC. (' + e.message + ')', 'bad'); }
  if (!procs.length) {
    return modal('Publicar con CelebryNova', h('div.col', h('p', 'CelebryNova todavía no sabe publicar en ninguna web.'), h('p.small.muted', 'Enséñaselo una vez: CelebryNova → Primeros pasos → «Mírame cómo lo hago».')),
      close => [btn('Cerrar', close), btn('Ir a CelebryNova', () => { close(); go('ia/operar'); }, { cls: 'primary' })], { size: 'narrow' });
  }
  const { generate } = await import('../docventa.js');
  let textos = {};
  try { textos = await generate(p); } catch (e) { }
  const params = proc => {
    const plat = norm((proc.plataformas || [])[0] || proc.nombre);
    const t = textos[['wallapop', 'vinted', 'etsy'].find(k => plat.includes(k))] || {};
    const out = {};
    (proc.parametros || []).forEach(x => { const f = MAP[norm(x.nombre)]; if (f) out[x.nombre] = f(p, t); });
    return out;
  };
  modal('Publicar «' + p.nombre + '» con CelebryNova', h('div.col',
    h('p.small.muted', 'Elige dónde. CelebryNova recibe el título, la descripción, el precio y la carpeta de fotos del producto, te pide permiso antes de publicar y se para si algo no lo entiende.'),
    h('div.list.boxed', procs.map(proc => {
      const pr = params(proc), miss = (proc.parametros || []).filter(x => x.requerido && !pr[x.nombre]).map(x => x.nombre);
      return h('div.item', { style: { cursor: 'default' } }, icon(proc.operador === 'navegador' ? 'link' : 'cube', 's'),
        h('div.grow', h('div.bold', proc.nombre), h('div.tiny.muted', 'Confianza ' + proc.confianza + (miss.length ? ' · te preguntará: ' + miss.join(', ') : ''))),
        btn('Enviar', async () => {
          try {
            await desktop.novaApi('procedimientos/' + proc.id + '/tarea', { objetivo: proc.nombre + ': ' + p.nombre, parametros: pr, origen: 'CelebriDiseños · producto ' + (p.sku || p.id) });
            toast('Enviado a CelebryNova', 'ok');
          } catch (e) { toast(e.message, 'bad'); }
        }, { cls: 'sm primary' }));
    }))),
  close => [btn('Cerrar', close), btn('Ver en CelebryNova', () => { close(); go('ia/operar'); }, { cls: 'ghost' })], { size: 'narrow' });
}
