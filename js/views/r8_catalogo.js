// ================= v20 · 🛍️ CelebriR8 · EL CATÁLOGO (pantalla) =================
// Tarjetas con la pieza en 3D de verdad (se dibuja aquí mismo, no son fotos), por apartados. Al tocar una: se ve grande,
// se cambian sus medidas y su color, y se prepara para la Bambu (con el asistente) o se abre en el Estudio para seguir
// añadiéndole cosas. Lo mismo para las FUNDAS: eliges el móvil y ves todos los estilos con ese móvil.
import { h, mount, btn, toast } from '../ui.js';
import * as N from '../r8/nucleo.js';
import { crearEscena, miniatura, COLORES, ACABADOS } from '../r8/escena3d.js';
import { MOVILES } from '../r8/moviles.js';

const MINIS = new Map(); // miniaturas ya dibujadas (clave → dataURL)
// v20: las miniaturas se guardan en este aparato (IndexedDB «celebrir8_minis»): la primera vez se dibujan; las siguientes,
// salen al momento (antes el catálogo se paraba 2 s pintándolas). La clave lleva el color y la «huella» del diseño: si un
// diseño cambia en otra versión, su miniatura se vuelve a dibujar sola.
const BDM = 'celebrir8_minis';
const abreM = () => new Promise((res, rej) => { const r = indexedDB.open(BDM, 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function leeMinis(claves) { try { const db = await abreM(); const out = await Promise.all(claves.map(k => new Promise(res => { const q = db.transaction('m').objectStore('m').get(k); q.onsuccess = () => res([k, q.result]); q.onerror = () => res([k, null]); }))); db.close(); return out; } catch (e) { return []; } }
async function guardaMini(k, url) { try { const db = await abreM(); await new Promise(res => { const t = db.transaction('m', 'readwrite'); t.objectStore('m').put(url, k); t.oncomplete = res; t.onerror = res; }); db.close(); } catch (e) { } }
const huella = (K, k, color) => { const g = String(K.DISENOS[k].gen); let x = 0; for (let i = 0; i < g.length; i++) x = (x * 31 + g.charCodeAt(i)) | 0; return 'v20:' + k + ':' + (color || '') + ':' + (x >>> 0).toString(36); };
const C = { cat: '', abierto: null, v: {}, color: {}, acabado: {}, movil: 'iPhone 16', buscar: '' };

export async function montarCatalogo(el, ext = {}) {
  const raiz = h('div.r8c'), barra = h('div.r8c-barra'), rejilla = h('div.r8c-rejilla'), detalle = h('div.r8c-det');
  el.appendChild(raiz); mount(raiz, h('div.r8e-carga.r8c-carga', h('div.r8e-anillo'), h('b', 'Preparando el catálogo…')));
  await N.cargar(); const K = await import('../r8/catalogo.js'); let vivo = true;
  if (ext.cat !== undefined) C.cat = ext.cat; else if (C.cat === 'movil') C.cat = '';
  mount(raiz, barra, rejilla, detalle);
  const buscar = h('input.inp.r8c-buscar', { type: 'search', placeholder: '🔎 Buscar: maceta, gato, lámpara, organizador…', value: C.buscar, oninput: e => { C.buscar = e.target.value; pinta(); } });
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function pinta() {
    mount(barra, h('div.r8c-cats', K.CATEGORIAS.map(([k, t]) => h('button.r8c-cat' + (C.cat === k ? '.on' : ''), { type: 'button', 'data-cat': k, onclick: () => { C.cat = k; pinta(); } }, t, h('small', String(k ? K.porCategoria(k).length : Object.keys(K.DISENOS).length))))), buscar);
    let L = K.porCategoria(C.cat); const q = norm(C.buscar).trim(); if (q) L = L.filter(([k, d]) => norm(d.t + ' ' + d.d + ' ' + d.cat + ' ' + k).includes(q));
    if (C.cat === 'movil') { mount(rejilla, h('div.r8c-fundas-top', h('b', '📱 Las fundas tienen su propio taller'), h('small', 'Con el ajuste fino, la prueba de 5 g y las líneas azules.'), btn('Abrir el taller de fundas', () => ext.irA && ext.irA('fundas'), { cls: 'primary' }))); return; }
    // v20: piezas de máquina y de RC: se hacen con MEDIDAS (no con la IA de fotos) y son diseños propios
    const aviso = C.cat === 'rc' ? h('div.r8c-aviso', h('b', '🏎️ Repuestos de RC a tu medida'), h('small', 'Diseños propios: mide tu pieza con el calibre y cambia las medidas (las de serie son las habituales del RC). Puedes venderlos y decir «compatible con Tamiya / Traxxas…» si lo has comprobado, pero sin sus logotipos ni nombres en la pieza y sin que parezca un recambio original.'))
      : C.cat === 'mecanica' ? h('div.r8c-aviso', h('b', '⚙️ Piezas de máquina con medidas exactas'), h('small', 'Escribe las medidas de TU pieza (calibre); tus holguras de la Bambu (0,05 · 0,10 · 0,15) se suman solas. Para una pieza rota: cuenta dientes y mide el diámetro de fuera.')) : null;
    mount(rejilla, aviso, L.length ? L.map(([k, d]) => tarjeta(k, d)) : h('p.muted', 'No hay nada con esa palabra.'));
    dibujaMinis();
  }
  const tarjeta = (k, d) => h('button.r8c-tar' + (C.abierto === k ? '.on' : ''), { type: 'button', 'data-k': k, onclick: () => abre(k) }, h('div.r8c-img', MINIS.get(k) ? h('img', { src: MINIS.get(k), alt: d.t }) : h('span.r8c-emo', d.e)), h('b', d.t), h('small', d.d), h('span.r8c-uso', { funcional: '💪 Resistente', jarron: '🏺 Modo jarrón', encaje: '🧩 Encaja', flexible: '🪢 TPU', pieza: '🔩 Pieza', deco: '🎀 Decoración' }[d.uso] || ''));
  // las miniaturas se dibujan de una en una, sin bloquear la pantalla
  let cola = Promise.resolve();
  async function dibujaMinis() {
    const faltan = [...rejilla.querySelectorAll('.r8c-tar')].filter(b => !MINIS.has(b.dataset.k) && K.DISENOS[b.dataset.k]).map(b => b.dataset.k);
    if (faltan.length) { const L = await leeMinis(faltan.map(k => huella(K, k, C.color[k] || K.DISENOS[k].color))); L.forEach(([hk, url], i) => { if (url && vivo) { const k = faltan[i]; MINIS.set(k, url); const img = rejilla.querySelector('[data-k="' + k + '"] .r8c-img'); if (img) mount(img, h('img', { src: url, alt: '' })); } }); }
    if (!vivo) return;
    [...rejilla.querySelectorAll('.r8c-tar')].filter(b => !MINIS.has(b.dataset.k)).forEach(b => {
      const k = b.dataset.k; cola = cola.then(() => new Promise(res => setTimeout(() => { if (!vivo || MINIS.has(k)) return res();
        try { const m = K.genera(k, sinNombre(K, k)), url = miniatura(N.aVista(m), C.color[k] || K.DISENOS[k].color, K.DISENOS[k].acabado || 'mate', 300); MINIS.set(k, url); guardaMini(huella(K, k, C.color[k] || K.DISENOS[k].color), url); const img = rejilla.querySelector('[data-k="' + k + '"] .r8c-img'); if (img) mount(img, h('img', { src: url, alt: '' })); }
        catch (e) { MINIS.set(k, ''); console.warn(k, e); } finally { N.limpia(); } res(); }, 16)));
    });
  }
  // ---------- una pieza abierta ----------
  let escena = null, lienzo = null, tic = 0, info = null;
  function abre(k) {
    C.abierto = k; const D = K.DISENOS[k], v = C.v[k] = C.v[k] || K.valores(k);
    rejilla.querySelectorAll('.r8c-tar').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    if (escena) { escena.destruir(); escena = null; }
    lienzo = h('canvas.r8c-cv', { 'aria-label': 'Vista 3D de ' + D.t }); info = h('div.r8c-info');
    const campos = h('div.r8c-campos'), color = C.color[k] || D.color || '#7c6cff', acab = C.acabado[k] || D.acabado || 'mate';
    mount(detalle, h('div.r8c-panel', h('div.r8c-vista', lienzo, info),
      h('div.r8c-lado', h('div.r8c-tit', h('span', D.e), h('div', h('b', D.t), h('small', D.d)), btn('✕', () => { C.abierto = null; mount(detalle); if (escena) { escena.destruir(); escena = null; } rejilla.querySelectorAll('.r8c-tar.on').forEach(b => b.classList.remove('on')); }, { cls: 'ghost sm', title: 'Cerrar' })),
        h('div.r8e-paleta', COLORES.map(([c, t]) => h('button' + (color === c ? '.on' : ''), { type: 'button', title: t, style: { background: c }, onclick: () => { C.color[k] = c; MINIS.delete(k); abre(k); } }))),
        h('select.inp', { 'aria-label': 'Acabado', onchange: e => { C.acabado[k] = e.target.value; genera(); } }, Object.entries(ACABADOS).map(([a, x]) => h('option', { value: a, selected: a === acab }, x.t))),
        campos, h('div.r8c-nota'),
        h('div.r8e-btns', btn('🖨️ Preparar para la Bambu', () => imprimir(k), { cls: 'primary r8c-imprimir' }), btn('🧰 Abrir en el Estudio', () => alEstudio(k), { cls: 'r8c-estudio' })))));
    mount(campos, camposDe(K, k, v, () => genera()));
    detalle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try { escena = crearEscena(lienzo, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); } catch (e) { mount(info, '⚠️ ' + e.message); }
    genera(true);
  }
  function genera(ya) {
    clearTimeout(tic); tic = setTimeout(() => {
      const k = C.abierto; if (!k || !escena) return; const D = K.DISENOS[k], v = C.v[k];
      try { const t0 = performance.now(), m = K.genera(k, v), I = N.info(m); escena.ponPartes([{ id: k, vista: N.aVista(m), color: C.color[k] || D.color || '#7c6cff', acabado: C.acabado[k] || D.acabado || 'mate' }]); if (ya) escena.encuadrar('iso');
        mount(info, h('span', I.dims.map(x => (Math.round(x * 10) / 10).toLocaleString('es-ES')).join(' × ') + ' mm'), h('span', Math.round(I.vol / 1000) + ' cm³'), h('span', Math.round(performance.now() - t0) + ' ms'));
        const nota = detalle.querySelector('.r8c-nota'); if (nota) mount(nota, D.nota ? h('p.r8e-nota', typeof D.nota === 'function' ? D.nota(v) : D.nota) : null);
        window.__r8c = { k, dims: I.dims.map(x => Math.round(x * 10) / 10), vol: I.vol, piezas: m.decompose().length, valores: Object.assign({}, v) };
      } catch (e) { mount(info, h('span.r8e-mal', '⚠️ ' + (e.message || e))); window.__r8c = { k, error: e.message }; }
      finally { N.limpia(); }
    }, ya ? 0 : 120);
  }
  async function imprimir(k) {
    const { modal } = await import('../ui.js'), A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null), cuerpo = h('div.r8c-aj'); const D = K.DISENOS[k];
    modal('🖨️ ' + D.t + ' · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
    const nombre = (D.t + '_' + Object.values(C.v[k] || {}).filter(x => typeof x === 'string' && x.length < 14 && /[a-z]/i.test(x)).slice(0, 1).join('')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 50);
    A.asistente(cuerpo, { clave: 'cat_' + k, partes: () => [{ m: K.genera(k, C.v[k]), color: C.color[k] || D.color || '#7c6cff', nombre: D.t }], N, uso: D.uso === 'pieza' ? 'funcional' : D.uso, texto: (D.campos || []).some(c => c.txt && C.v[k][c.k]), nombre, baja, cama: 256, desktopAbrir: !!(d && d.desktop && d.desktop.on) });
  }
  function alEstudio(k) { if (ext.alEstudio) ext.alEstudio(k, Object.assign({}, C.v[k]), { color: C.color[k], acabado: C.acabado[k] }); }
  function baja(blob, nombre) { const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); window.__r8c && (window.__r8c.bajado = { nombre, bytes: blob.size }); }

  // ---------- FUNDAS: elige el móvil y mira todos los estilos ----------
  function pintaFundas() {
    const marcas = [...new Set(MOVILES.map(m => m[0]))], sel = h('select.inp.r8c-movil', { 'aria-label': 'Móvil', onchange: e => { C.movil = e.target.value; MINIS.forEach((_, k) => { if (k.startsWith('funda:')) MINIS.delete(k); }); pintaFundas(); } }, marcas.map(mc => h('optgroup', { label: mc }, MOVILES.filter(m => m[0] === mc).map(m => h('option', { value: m[1], selected: C.movil === m[1] }, m[1])))));
    const F = K.DISENOS.funda, estilos = (F.campos.find(c => c.k === 'estilo') || {}).ops || [];
    mount(rejilla, h('div.r8c-fundas-top', h('b', '📱 ¿Qué móvil?'), sel, h('small', MOVILES.length + ' móviles con sus medidas oficiales · ' + estilos.length + ' estilos. Toca uno para verlo en grande.')),
      estilos.map(([k, t]) => h('button.r8c-tar.r8c-funda', { type: 'button', 'data-k': 'funda:' + C.movil + ':' + k, onclick: () => { C.v.funda = Object.assign(C.v.funda || K.valores('funda'), { modelo: C.movil, estilo: k }); abre('funda'); } }, h('div.r8c-img', MINIS.get('funda:' + C.movil + ':' + k) ? h('img', { src: MINIS.get('funda:' + C.movil + ':' + k), alt: t }) : h('span.r8c-emo', '📱')), h('b', t), h('small', C.movil))));
    [...rejilla.querySelectorAll('.r8c-funda')].forEach(b => { const kk = b.dataset.k; if (MINIS.has(kk)) return; const [, mov, est] = kk.split(':');
      cola = cola.then(() => new Promise(res => setTimeout(() => { if (!vivo) return res(); try { const m = K.genera('funda', { modelo: mov, estilo: est, txt: est.startsWith('nombre') ? 'Lucía' : est.startsWith('figura') ? '🦋' : '' }).rotate([180, 0, 0]); const url = miniatura(N.aVista(m), '#1b1b1d', 'mate', 260); MINIS.set(kk, url); const img = b.querySelector('.r8c-img'); if (img) mount(img, h('img', { src: url, alt: '' })); } catch (e) { MINIS.set(kk, ''); } finally { N.limpia(); } res(); }, 16))); });
  }
  pinta(); if (C.abierto) abre(C.abierto);
  return { destroy() { vivo = false; clearTimeout(tic); if (escena) escena.destruir(); }, abre };
}
// los textos de ejemplo no se dibujan en la miniatura si cuestan (se usan los de serie)
function sinNombre(K, k) { return {}; }
// los campos de un diseño (números con barra, desplegables, casillas, textos)
export function camposDe(K, k, v, cambia) {
  return (K.DISENOS[k].campos || []).map(c => {
    if (c.chk) return h('label.check.r8e-c', h('input', { type: 'checkbox', checked: !!v[c.k], 'data-k': c.k, onchange: e => { v[c.k] = e.target.checked; cambia(); } }), c.t);
    if (c.txt) return h('label.r8e-c.col', h('span', c.t), h('input.inp', { type: 'text', value: v[c.k] || '', maxlength: 40, 'data-k': c.k, oninput: e => { v[c.k] = e.target.value; cambia(); } }), c.ayuda ? h('small.muted', c.ayuda) : null);
    if (c.ops) return h('label.r8e-c.col', h('span', c.t), h('select.inp', { 'data-k': c.k, onchange: e => { v[c.k] = e.target.value; cambia(); } }, c.ops.map(([a, t]) => h('option', { value: a, selected: String(v[c.k]) === String(a) }, t))));
    const r = h('input', { type: 'range', min: c.min, max: c.max, step: c.paso, value: v[c.k], 'aria-label': c.t }), n = h('input.inp', { type: 'number', min: c.min, max: c.max, step: c.paso, value: v[c.k], 'data-k': c.k, 'aria-label': c.t });
    const pon = (x, de) => { let y = Number(String(x).replace(',', '.')); if (!isFinite(y)) return; y = Math.max(c.min, Math.min(c.max, y)); v[c.k] = y; if (de !== r) r.value = y; if (de !== n) n.value = y; cambia(); };
    r.oninput = () => pon(r.value, r); n.oninput = () => pon(n.value, n); n.onchange = () => { n.value = v[c.k]; };
    return h('label.r8e-c.r8e-num', h('span', c.t), r, h('span.r8e-n', n, c.u ? h('i', c.u) : null));
  });
}
