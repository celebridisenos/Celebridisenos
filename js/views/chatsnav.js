// ================= 💬 NAVEGADOR PROPIO DE CHATS (02-11-2026, Biou: «ese tema es muy importante, un navegador propio») =================
// La barra de pestañas y el panel de productos de la ventana de chats (--chats, desktop/host/chats_windows.go). Las páginas de
// Facebook, Vinted… son ventanas de verdad colocadas en el «hueco»: lo que se pinte aquí debajo no se ve, y por eso los avisos van en
// el panel y no en toasts ni ventanitas. Fuera de esa ventana (window.chatsOrden no existe) el panel sigue copiando al portapapeles.
// «Adjuntar» pega en el chat abierto, como él con Ctrl + V. NUNCA envía: el mensaje lo manda él.
// 04-11-2026 · «📤 Subir» (subir_anuncio.js): abre «subir producto» de la plataforma y rellena fotos, título, descripción y precio.
// PUBLICAR lo pulsa él. Y la idea «💤 dormidos»: lo subido hace 3 semanas o más se marca para volver a subirlo.
import { h, mount, btn, inp, empty } from '../ui.js';
import { S } from '../store.js';
import { desktop } from '../desktop.js';
import { CHATS, mensajeCatalogo, urlTienda } from '../chats_menu.js';
import { SUBIR, MAX_FOTOS, textoAnuncio, fotoParaAnuncio, guionRellenar, apuntaSubido, diasSubido, DIAS_DORMIDO } from '../subir_anuncio.js';
import { fotoDe, fotoImg, fotoAlPortapapeles, textoVenta, eurTxt, HIDDEN } from './responder.js';
import { previewUrl, filesOf } from '../files.js';
import { precioDe, medidas, colores } from '../catalogo_pdf.js';

const CL = window.CL;
const espera = ms => new Promise(r => setTimeout(r, ms));
const orden = o => (window.chatsOrden ? window.chatsOrden(o) : Promise.resolve());
const enVentana = () => typeof window.chatsOrden === 'function';

export function render(el, params) {
  document.body.classList.add('tv-on'); // sin menú ni barra del programa, ni se bloquea
  let activa = '';
  const tabs = {};
  const estado = h('div.chn-estado', { role: 'status' }, 'Abre el chat y pulsa 📎 en un producto.');
  const aviso = (t, cls = '') => { estado.textContent = t; estado.className = 'chn-estado ' + cls; };

  const ponActiva = k => {
    activa = k;
    Object.keys(tabs).forEach(x => tabs[x].b.classList.toggle('on', x === k));
    const c = CHATS.find(x => x.k === k);
    mount(titulo, c ? h('h2', 'Abriendo ' + c.t + '…') : h('h2', 'Elige arriba dónde quieres contestar'));
    if (c) document.title = c.t + ' · Chats';
    if (k) orden({ A: 'tab', Sitio: k });
    if (pintaListo) pinta(); // (los 📤 / 💤 de cada producto son de la plataforma abierta)
  };
  let pintaListo = false;
  const titulo = h('div');
  const hueco = h('div.chn-hueco', h('div', titulo,
    h('p.muted', 'La primera vez entra con tu cuenta en su página: se queda guardada y el programa no ve tu contraseña.'),
    enVentana() ? null : h('p.small.warn-t', 'Esta pantalla se usa desde el botón «💬 Chats» del programa del PC.')));

  const aCasa = () => {
    try { localStorage.setItem('cd.aCasa', String(Date.now())); } catch (e) { } // (la ventana principal lo oye y se va a Inicio)
    if (enVentana()) orden({ A: 'casa' }); else location.hash = '#/inicio';
  };
  const barra = h('div.chn-barra', h('button.chn-casa', { type: 'button', onclick: aCasa, title: 'Volver a Inicio de CelebriDiseños (los chats se quedan abiertos, abajo en la barra de Windows)' }, '🏠 Inicio'), CHATS.map(c => {
    const num = h('span.chn-num', { hidden: true });
    const b = h('button.chn-tab', { type: 'button', style: '--c:' + c.c, 'data-k': c.k, onclick: () => ponActiva(c.k) }, h('span.chn-logo', c.l), c.t, num);
    tabs[c.k] = { b, num };
    return b;
  }), h('div.chn-nav',
    btn('←', () => orden({ A: 'atras' }), { cls: 'sm ghost', title: 'Atrás, en esta página' }),
    btn('⟳', () => orden({ A: 'recargar' }), { cls: 'sm ghost', title: 'Volver a cargar esta página' }),
    btn('✉️', () => orden({ A: 'inicio' }), { cls: 'sm ghost', title: 'Volver a los mensajes de esta plataforma' })));

  // 📎 adjuntar: la foto y después el texto con el precio de hoy, en el chat abierto
  const haySitio = () => { if (activa || !enVentana()) return true; aviso('Primero elige arriba una plataforma.', 'bad'); return false; };
  const fin = () => aviso(enVentana() ? '✅ Pegado en el chat abierto. Revísalo y pulsa ENVIAR tú. ¿No sale? Pincha en el chat y pulsa Ctrl + V. ¿No sale la foto? Pulsa ⬇️ y adjúntala con el clip del chat.' : '📋 Copiado: pégalo en el chat con Ctrl + V.', 'ok');
  async function pegaFoto(p) {
    const f = fotoDe(p);
    if (!f) { aviso('«' + (p.nombre || 'Pieza') + '» no tiene foto todavía.', 'bad'); return false; }
    aviso('Preparando la foto…');
    try { await fotoAlPortapapeles(f); } catch (e) { aviso('No se ha podido copiar la foto (' + (e.message || e) + ').', 'bad'); return false; }
    await orden({ A: 'pegar' });
    return true;
  }
  // algunas webs no dejan pegar fotos (hay que usar su clip): la foto se guarda en Descargas con el nombre del producto
  async function guardaFoto(p) {
    const f = fotoDe(p);
    if (!f) return aviso('«' + (p.nombre || 'Pieza') + '» no tiene foto todavía.', 'bad');
    try {
      const u = await previewUrl(f), b = await (await fetch(u)).blob(), url = URL.createObjectURL(b);
      const a = h('a', { href: url, download: String(p.nombre || 'foto').replace(/[\\/:*?"<>|]/g, ' ') + '.' + (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg') });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      aviso('⬇️ Foto guardada en Descargas: pulsa el clip del chat y elígela.', 'ok');
    } catch (e) { aviso('No se ha podido guardar la foto (' + (e.message || e) + ').', 'bad'); }
  }
  async function pegaTexto(t) {
    if (enVentana()) await orden({ A: 'pegarTexto', Texto: t });
    else await navigator.clipboard.writeText(t);
  }
  async function adjunta(p, que) {
    if (!haySitio()) return;
    const conFoto = que === 'texto' || await pegaFoto(p);
    if (que === 'foto' && !conFoto) return;
    if (que === 'todo' && conFoto) await espera(900); // (que la página haya cogido la foto antes de pegar el texto)
    if (que !== 'foto') await pegaTexto(textoVenta(p));
    if (conFoto) fin(); else aviso('💬 Va el texto, pero SIN foto: este producto no tiene o no se ha podido copiar.', 'bad');
  }

  // ---------- 📤 SUBIR a la plataforma abierta (rellena; publicar lo pulsa él) ----------
  let subiendo = null;
  const nombreSitio = k => (CHATS.find(x => x.k === k) || {}).t || k;
  const enlace = p => { const w = p.web || {}, u = urlTienda(); return w.publicado && w.url && u ? u + w.url : ''; };
  async function subir(p) {
    if (!enVentana()) return aviso('«Subir» se usa desde la ventana de 💬 Chats del programa del PC.', 'bad');
    if (!activa) return aviso('Primero elige arriba la plataforma donde lo quieres subir.', 'bad');
    const s = SUBIR[activa];
    if (!s) return aviso('En ' + nombreSitio(activa) + ' todavía no sé rellenar el anuncio: súbelo a mano (con 📎 tienes la foto y el texto).', 'bad');
    aviso('Preparando las fotos de «' + (p.nombre || 'Pieza') + '»…');
    const fotos = [];
    for (const f of filesOf('productos', p.id).filter(a => a.tipo === 'foto').slice(0, MAX_FOTOS)) { try { const u = await previewUrl(f); if (u) fotos.push(await fotoParaAnuncio(u)); } catch (e) { } }
    const d = Object.assign(textoAnuncio(p, { precio: precioDe(p), medidas: medidas(p), colores: colores(p), enlace: enlace(p) }), { fotos });
    subiendo = { id: p.id, sitio: activa };
    await orden({ A: 'subir', Sitio: activa, Texto: guionRellenar(d, s.ruta) });
    aviso('📤 Abriendo «subir producto» en ' + s.t + (fotos.length ? ' con ' + fotos.length + (fotos.length === 1 ? ' foto' : ' fotos') : ' (este producto no tiene fotos)') + '… Si te pide entrar con tu cuenta, entra: luego se rellena solo.');
  }
  // lo que cuenta la página (desktop/host/chats_windows.go → MessageCallback «subir:…»)
  window.chatsSubido = (k, m) => {
    m = String(m || '');
    if (m === 'espera') return aviso('🔐 ' + nombreSitio(k) + ': entra con tu cuenta. En cuanto salga la página de subir producto, se rellena sola.');
    if (m === 'nada') return aviso('😕 No encuentro las casillas del anuncio en ' + nombreSitio(k) + ' (habrán cambiado su página). Rellénalo a mano: con 📎 tienes la foto y el texto.', 'bad');
    if (m.indexOf('ok:') === 0) {
      const [hecho, falta] = m.slice(3).split('|falta:');
      if (subiendo && subiendo.sitio === k) { apuntaSubido(subiendo.id, k); subiendo = null; pinta(); }
      aviso('✅ ' + nombreSitio(k) + ': puesto ' + (hecho || '').split(',').filter(Boolean).join(', ') + '.' + (falta ? ' Falta ' + falta.split(',').join(', ') + ': ponlo tú.' : '') + ' Elige la categoría y el estado, revísalo y pulsa PUBLICAR tú.', 'ok');
    }
  };
  let soloDormidos = false;
  const chipDormidos = h('button.chip.chn-dorm', { type: 'button', 'aria-pressed': 'false', onclick: () => { soloDormidos = !soloDormidos; chipDormidos.setAttribute('aria-pressed', String(soloDormidos)); chipDormidos.classList.toggle('on', soloDormidos); pinta(); } });

  const buscador = inp({ type: 'search', placeholder: '🔎 Busca tu producto…', class: 'inp', 'aria-label': 'Buscar producto' });
  const lista = h('div.chn-lista');
  function pinta() {
    const q = buscador.value;
    const vivos = (S.t.productos || []).filter(p => !HIDDEN.includes(String(p.estado || '').toLowerCase()));
    // 💤 los que llevan 3 semanas o más subidos en la plataforma abierta
    const dormidos = activa && SUBIR[activa] ? vivos.filter(p => { const d = diasSubido(p.id, activa); return d !== null && d >= DIAS_DORMIDO; }) : [];
    chipDormidos.hidden = !dormidos.length && !soloDormidos;
    chipDormidos.textContent = '💤 Dormidos en ' + nombreSitio(activa) + ' (' + dormidos.length + ')';
    const L = (soloDormidos ? dormidos : vivos)
      .filter(p => !q || (CL.matches ? CL.matches([p.nombre, p.sku, p.categoria, p.color, p.material].join(' '), q) : String(p.nombre || '').toLowerCase().includes(q.toLowerCase())))
      .slice(0, 60);
    if (!L.length) return mount(lista, empty('box', 'Sin productos', soloDormidos ? 'Nada dormido: todo lo subido es reciente.' : q ? 'Nada con «' + q + '».' : 'Cuando tengas productos aparecen aquí.'));
    mount(lista, L.map(p => {
      const f = fotoDe(p), pr = precioDe(p), dias = activa ? diasSubido(p.id, activa) : null;
      return h('div.chn-p', { 'data-id': p.id },
        h('div.chn-foto', f ? fotoImg(f, p) : h('span.tiny.muted', 'Sin foto')),
        h('div', h('b', { title: p.nombre || '' }, p.nombre || 'Pieza'), h('span.chn-precio', pr > 0 ? eurTxt(pr) : 'Sin precio puesto'),
          dias !== null ? h('span.chn-subido' + (dias >= DIAS_DORMIDO ? '.dormido' : ''), dias >= DIAS_DORMIDO ? '💤 Subido hace ' + dias + ' días: bórralo allí y vuelve a subirlo' : '📤 Subido ' + (dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : 'hace ' + dias + ' días')) : null),
        h('div.chn-acc',
          btn('📎 Adjuntar', () => adjunta(p, 'todo'), { cls: 'sm primary', title: 'Pega la foto y el texto con el precio de hoy en el chat abierto. Enviar lo pulsas tú.' }),
          btn('📤 Subir', () => subir(p), { cls: 'sm chn-subir', title: 'Abre «subir producto» en esta plataforma y le pone las fotos, el título, la descripción y el precio. PUBLICAR lo pulsas tú.' }),
          btn('🖼️', () => adjunta(p, 'foto'), { cls: 'sm ghost', title: 'Solo la foto' }),
          btn('💬', () => adjunta(p, 'texto'), { cls: 'sm ghost', title: 'Solo el texto con el precio' }),
          btn('⬇️', () => guardaFoto(p), { cls: 'sm ghost', title: 'Guardar la foto en Descargas, para adjuntarla con el clip del chat' })));
    }));
  }
  buscador.addEventListener('input', pinta);
  const panel = h('aside.chn-panel', h('h3', '📎 Adjuntar o 📤 subir producto'), buscador, h('div.chn-dorm-caja', chipDormidos), lista,
    h('div.col', { style: { gap: '6px' } }, estado,
      btn('📤 Catálogo al día', async () => { if (!haySitio()) return; await pegaTexto(mensajeCatalogo()); fin(); }, { title: 'Pega el enlace de tu web: siempre tiene los productos y precios de hoy' })));

  el.append(h('div.chn', barra, hueco, panel));

  // el hueco, en píxeles de verdad, para colocar encima la página
  const mideHueco = () => {
    const r = hueco.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    orden({ A: 'hueco', X: Math.round(r.left * d), Y: Math.round(r.top * d), W: Math.round(r.width * d), H: Math.round(r.height * d) });
  };
  const ro = new ResizeObserver(mideHueco);
  ro.observe(hueco);
  mideHueco();

  // los mensajes sin leer de cada pestaña (lo que la página pone en su título: «(3) Messenger»)
  window.chatsTitulo = (k, t) => {
    const x = tabs[k], m = /^\s*\((\d+)\+?\)/.exec(String(t || ''));
    if (x) { x.num.hidden = !m; x.num.textContent = m ? m[1] : ''; }
  };

  async function abreTodos() {
    const orden1 = CHATS.map(c => c.k);
    ponActiva(orden1[0]);
    for (const k of orden1.slice(1)) { await espera(1500); if (vivo) orden({ A: 'cargar', Sitio: k }); }
  }
  const pide = s => { if (s === 'todos') abreTodos(); else ponActiva(tabs[s] ? s : ''); };

  let vivo = true, x0 = window.screenX, y0 = window.screenY;
  const reloj = setInterval(() => {
    if (window.screenX !== x0 || window.screenY !== y0) { x0 = window.screenX; y0 = window.screenY; orden({ A: 'movida' }); }
  }, 500);
  // desde el programa han pedido otra plataforma: se cambia y se trae la ventana delante
  const recados = enVentana() && desktop.on ? setInterval(async () => {
    try { const r = await desktop.redesPendiente(); if (r && r.sitio) { pide(r.sitio); orden({ A: 'traer' }); } } catch (e) { }
  }, 500) : 0;

  pintaListo = true;
  pinta();
  pide(params && params[0]);
  return {
    update: pinta,
    params: p => pide(p && p[0]),
    destroy: () => { vivo = false; ro.disconnect(); clearInterval(reloj); clearInterval(recados); delete window.chatsTitulo; delete window.chatsSubido; document.body.classList.remove('tv-on'); }
  };
}
