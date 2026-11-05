// ================= ⭐ RESEÑAS DE TUS CLIENTES (01-11-2026, pedido por Biou) =================
// Él: «que las reseñas estén automatizadas: las que vaya subiendo yo como foto en el apartado “subir reseñas”, que de ahí las coja y las
// suba a la web… más satisfacción, más confianza… un globito flotante de reseñas positivas, para que la gente vea que es legítimo».
// · Pegas (Ctrl+V) o eliges la CAPTURA de la reseña de Vinted, Wallapop… → sale SOLA en tu web, en el globito de abajo a la izquierda.
// · Antes de subirla puedes TAPAR el nombre o la foto del comprador (pasas el ratón por encima y se pixela).
// · Plataforma y estrellas ya vienen puestas (Vinted, 5): un clic y subida. El texto es opcional (es lo que dice el globito).
// Las capturas viven en la tienda (servidor 18.4 + tienda 4.2): aquí se leen de allí y se manda el conjunto al cambiar algo.
import { h, mount, btn, toast, inp, empty, confirmDlg, modal } from '../ui.js';
import { S, api, can } from '../store.js';
import { go } from '../app.js';
import { webPhoto } from './tienda.js';

export const PLATAFORMAS = [['vinted', 'Vinted', '#09b1ba'], ['wallapop', 'Wallapop', '#13c1ac'], ['facebook', 'Facebook', '#1877f2'], ['milanuncios', 'Milanuncios', '#f05a28'], ['opla', 'Opla', '#7c3aed'], ['web', 'Mi web', '#0fb5d4'], ['whatsapp', 'WhatsApp', '#25d366'], ['otra', 'Otra', '#64748b']];
const nomPlat = k => (PLATAFORMAS.find(p => p[0] === k) || [k, k])[1];
const hoy = () => new Date().toISOString().slice(0, 10);
const nuevoId = () => 'rs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const VIEJO = e => /Acción desconocida: tienda\.resenas/.test((e && e.message) || '');
const MSJ_VIEJO = 'Tu servidor de Google aún es el antiguo: para subir reseñas pega el Servidor.gs nuevo (18.4.0). Carpeta de la versión → LEEME.';

// la lista que se manda a la tienda: las que ya están (solo con su id de foto) + las nuevas (con la foto reducida)
export const paraEnviar = L => L.map(r => ({ id: r.id, estrellas: r.estrellas, plataforma: r.plataforma, autor: r.autor || '', texto: r.texto || '', fecha: r.fecha || '', foto: r.nueva ? r.nueva : { id: r.foto } }));

export function render(el) {
  const st = { url: '', lista: [], cargando: true, error: '', sinResenas: false };
  const estado = h('div.rs-estado'), rejilla = h('div.rs-grid');
  const elegir = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: () => { [...elegir.files].forEach(f => preparar(f)); elegir.value = ''; } });
  const zona = h('button.rs-zona', { type: 'button', onclick: () => elegir.click(),
    ondragover: e => { e.preventDefault(); zona.classList.add('on'); }, ondragleave: () => zona.classList.remove('on'),
    ondrop: e => { e.preventDefault(); zona.classList.remove('on'); [...e.dataTransfer.files].filter(f => /^image\//.test(f.type)).forEach(f => preparar(f)); } },
    h('span.rs-zona-e', '📸'), h('b', 'Sube la captura de la reseña'), h('span', 'Pégala aquí con Ctrl + V, arrástrala o pulsa para elegirla'), h('small', 'Sale sola en tu web, en el globito de confianza'));
  el.append(h('div.page-head', h('div', h('h1', '⭐ Reseñas de tus clientes'), h('div.muted.small', 'Lo que suba aquí sale SOLO en tu tienda web, en un globito flotante. Así la gente ve que es todo de verdad.'))),
    h('div.rs-top', zona, estado), elegir, h('h3.rs-tit', 'En tu web ahora'), rejilla);
  // pegar con Ctrl + V en cualquier sitio de esta pantalla
  const pegar = e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])].filter(x => /^image\//.test(x.type)); if (!f.length || document.querySelector('.modal')) return; e.preventDefault(); f.forEach(x => preparar(x)); };
  document.addEventListener('paste', pegar);

  async function carga() {
    st.cargando = true; pintaEstado();
    try { const r = await api('tienda.resenas', {}, { timeout: 45000 }); Object.assign(st, { url: r.url || '', lista: (r.resenas || []).map(x => Object.assign({}, x)), sinResenas: !!r.sinResenas, conectada: r.conectada !== false, error: '' }); }
    catch (e) { st.error = VIEJO(e) ? MSJ_VIEJO : (e.message || String(e)); }
    st.cargando = false; pintaEstado(); pinta();
  }
  function pintaEstado() {
    const n = st.lista.length, media = n ? Math.round(st.lista.reduce((s, r) => s + (Number(r.estrellas) || 5), 0) / n * 10) / 10 : 0;
    mount(estado, st.cargando ? h('p.muted.small', 'Mirando tu web…')
      : st.error ? h('div.rs-aviso', '🟡 ', st.error)
      : !st.url ? h('div.rs-aviso', '🟡 Tu tienda web aún no está conectada. ', btn('Conectarla', () => go('tienda/conexion'), { cls: 'sm' }))
      : st.sinResenas ? h('div.rs-aviso', '🟡 Tu tienda web es la de antes: para que salgan las reseñas hay que publicar la tienda 4.2.0 (PUBLICAR_TIENDA.bat). Las que subas se guardan en cuanto esté.')
      : h('div.rs-num', h('b', n ? '★ ' + String(media).replace('.', ',') : '—'), h('span', n === 1 ? '1 reseña en tu web' : n + ' reseñas en tu web'), st.url ? h('a.small', { href: st.url, target: '_blank', rel: 'noopener' }, 'Ver mi web ↗') : null));
  }
  function pinta() {
    if (!st.lista.length) return mount(rejilla, st.cargando ? null : empty('star', 'Todavía no hay reseñas en tu web', 'Sube la primera captura: en cuanto la subas, sale el globito en tu tienda.'));
    mount(rejilla, st.lista.map(r => h('div.rs-card', { 'data-id': r.id },
      h('img', { src: st.url + '/api/img/' + r.foto, alt: 'Reseña de ' + nomPlat(r.plataforma), loading: 'lazy' }),
      h('div.rs-card-pie', h('b.rs-est', '★'.repeat(r.estrellas || 5)), h('span.rs-chip', nomPlat(r.plataforma)), r.texto ? h('span.rs-card-tx', '«' + r.texto + '»') : null,
        can('tienda.gestionar') ? btn('Quitar', () => quitar(r), { cls: 'sm ghost danger', title: 'Que deje de salir en tu web' }) : null))));
  }
  async function publica(lista, msg) {
    const r = await api('tienda.resenasPublicar', { resenas: paraEnviar(lista) }, { timeout: 120000 });
    toast(msg, 'ok', 6000); await carga(); return r;
  }
  async function quitar(r) {
    if (!await confirmDlg('Quitar esta reseña', 'Dejará de salir en tu web. ¿Seguro?', 'Quitar', true)) return;
    try { await publica(st.lista.filter(x => x.id !== r.id), 'Reseña quitada de tu web'); } catch (e) { toast(VIEJO(e) ? MSJ_VIEJO : e.message, 'bad', 9000); }
  }
  // ---- la ventanita de UNA reseña: tapar el nombre, plataforma, estrellas y subir ----
  async function preparar(file) {
    if (st.error === MSJ_VIEJO) return toast(MSJ_VIEJO, 'warn', 9000);
    if (!st.url) return toast('Conecta antes tu tienda web (Tienda web → Conexión).', 'warn', 7000);
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { return toast('Esa imagen no se puede abrir. Prueba con otra captura (PNG o JPG).', 'warn'); }
    const max = 1400, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = h('canvas.rs-lienzo'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
    // 🙈 tapar: se arrastra un rectángulo y se pixela esa parte (el original no se guarda en ningún sitio)
    let ini = null, tapadas = 0;
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
    const marco = h('div.rs-marco');
    cv.onpointerdown = e => { ini = pos(e); cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!ini) return; const b = cv.getBoundingClientRect(), [x, y] = pos(e), k = b.width / cv.width; Object.assign(marco.style, { display: 'block', left: (Math.min(ini[0], x) * k) + 'px', top: (Math.min(ini[1], y) * k) + 'px', width: (Math.abs(x - ini[0]) * k) + 'px', height: (Math.abs(y - ini[1]) * k) + 'px' }); };
    cv.onpointerup = e => { if (!ini) return; const [x, y] = pos(e); pixela(Math.min(ini[0], x), Math.min(ini[1], y), Math.abs(x - ini[0]), Math.abs(y - ini[1])); ini = null; marco.style.display = 'none'; };
    function pixela(x, y, w, hh) {
      if (w < 6 || hh < 6) return; const t = Math.max(8, Math.round(Math.min(cv.width, cv.height) / 45));
      for (let i = x; i < x + w; i += t) for (let j = y; j < y + hh; j += t) { const p = cx.getImageData(Math.floor(i), Math.floor(j), 1, 1).data; cx.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; cx.fillRect(Math.floor(i), Math.floor(j), t, t); }
      tapadas++; tapTxt.textContent = '🙈 Tapado ' + tapadas + (tapadas === 1 ? ' trozo' : ' trozos') + ' · ';
    }
    const tapTxt = h('span');
    const r = { id: nuevoId(), estrellas: 5, plataforma: 'vinted', autor: '', texto: '', fecha: hoy() };
    const plats = h('div.rs-plats', PLATAFORMAS.map(([k, t, c]) => h('button.rs-plat' + (k === r.plataforma ? '.on' : ''), { type: 'button', 'data-k': k, style: '--c:' + c, onclick: e => { r.plataforma = k; plats.querySelectorAll('.rs-plat').forEach(b => b.classList.toggle('on', b.dataset.k === k)); } }, t)));
    const estr = h('div.rs-estrellas', [1, 2, 3, 4, 5].map(n => h('button.rs-star' + (n <= r.estrellas ? '.on' : ''), { type: 'button', 'aria-label': n + (n === 1 ? ' estrella' : ' estrellas'), 'data-n': n, onclick: () => { r.estrellas = n; estr.querySelectorAll('.rs-star').forEach(b => b.classList.toggle('on', Number(b.dataset.n) <= n)); } }, '★')));
    const texto = inp({ placeholder: 'Opcional: lo que dice, para el globito. Ej.: «Precioso, llegó rapidísimo»', maxlength: 300, 'aria-label': 'Lo que dice la reseña' });
    const autor = inp({ placeholder: 'Opcional: nombre (ej.: Laura)', maxlength: 40, 'aria-label': 'Nombre del cliente' });
    const m = modal('⭐ Subir esta reseña a tu web', h('div.rs-dlg',
      h('div.rs-dlg-foto', h('div.rs-lienzo-caja', cv, marco), h('p.tiny.muted', tapTxt, '¿Sale el nombre o la foto del comprador? Pasa el ratón por encima con el botón pulsado y se tapa.')),
      h('div.rs-dlg-datos', h('div.lbl', '¿De dónde es?'), plats, h('div.lbl', 'Estrellas'), estr, h('div.lbl', 'Lo que dice (opcional)'), texto, autor,
        h('p.tiny.muted', 'Solo se sube la captura (como queda aquí) y lo que escribas. Nada más.'))),
    close => [btn('Cancelar', close), btn('✅ Subir a mi web', async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Subiendo…';
      try {
        const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
        const nueva = await webPhoto(blob, 1200);
        r.texto = texto.value.trim(); r.autor = autor.value.trim(); r.nueva = nueva;
        await publica([r].concat(st.lista), '⭐ ¡Subida! Ya sale en tu web.');
        close();
      } catch (e) { b.disabled = false; b.textContent = '✅ Subir a mi web'; toast(VIEJO(e) ? MSJ_VIEJO : 'No se pudo subir: ' + (e.message || e), 'bad', 9000); }
    }, { cls: 'primary rs-subir' })], { size: 'wide' });
    window.__rsDlg = { r, cv, pixela, close: m.close }; // (para las pruebas)
  }
  carga();
  return { destroy: () => document.removeEventListener('paste', pegar) };
}
