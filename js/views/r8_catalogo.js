// ================= v20 · 🛍️ CelebriR8 · EL CATÁLOGO (pantalla) =================
// Tarjetas con la pieza en 3D de verdad (se dibuja aquí mismo, no son fotos), por apartados. Al tocar una: se ve grande,
// se cambian sus medidas y su color, y se prepara para la Bambu (con el asistente) o se abre en el Estudio para seguir
// añadiéndole cosas. Lo mismo para las FUNDAS: eliges el móvil y ves todos los estilos con ese móvil.
import { h, mount, btn, toast, modal } from '../ui.js';
import * as CK from '../r8/cults_catalogo.js'; // 14-10-2026 (tarde) · 🛒 la ficha para Cults de cada diseño y «📦 Exportar todo»
import * as CU from '../r8/cults.js';
import * as N from '../r8/nucleo.js';
import { crearEscena, miniatura, COLORES, ACABADOS } from '../r8/escena3d.js';
import { MOVILES } from '../r8/moviles.js';
import { mesa } from '../r8/mesa.js'; // v30: tocar, mover, duplicar y copiar la pieza en la cama
import * as CA from '../r8/cat_anima.js'; // 18-10-2026 · 🎬 animar cualquier diseño (qué gira, qué orbita, qué se ondula, qué se abre)

const MINIS = new Map(); // miniaturas ya dibujadas (clave → dataURL)
// v20: las miniaturas se guardan en este aparato (IndexedDB «celebrir8_minis»): la primera vez se dibujan; las siguientes,
// salen al momento (antes el catálogo se paraba 2 s pintándolas). La clave lleva el color y la «huella» del diseño: si un
// diseño cambia en otra versión, su miniatura se vuelve a dibujar sola.
const BDM = 'celebrir8_minis';
const abreM = () => new Promise((res, rej) => { const r = indexedDB.open(BDM, 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function leeMinis(claves) { try { const db = await abreM(); const out = await Promise.all(claves.map(k => new Promise(res => { const q = db.transaction('m').objectStore('m').get(k); q.onsuccess = () => res([k, q.result]); q.onerror = () => res([k, null]); }))); db.close(); return out; } catch (e) { return []; } }
async function guardaMini(k, url) { try { const db = await abreM(); await new Promise(res => { const t = db.transaction('m', 'readwrite'); t.objectStore('m').put(url, k); t.oncomplete = res; t.onerror = res; }); db.close(); } catch (e) { } }
const huella = (K, k, color) => { const g = String(K.DISENOS[k].gen); let x = 0; for (let i = 0; i < g.length; i++) x = (x * 31 + g.charCodeAt(i)) | 0; return 'v51:' + k + ':' + (color || '') + ':' + (x >>> 0).toString(36); };
const C = { cat: '', abierto: null, v: {}, color: {}, acabado: {}, movil: 'iPhone 16', buscar: '' };

export async function montarCatalogo(el, ext = {}) {
  const raiz = h('div.r8c'), barra = h('div.r8c-barra'), rejilla = h('div.r8c-rejilla'), detalle = h('div.r8c-det');
  el.appendChild(raiz); mount(raiz, h('div.r8e-carga.r8c-carga', h('div.r8e-anillo'), h('b', 'Preparando el catálogo…')));
  await N.cargar(); const K = await import('../r8/catalogo.js'); let vivo = true; const SDF = await import('../r8/sdf.js').catch(() => null); // v30.3: miniaturas rápidas de las figuras esculpidas
  if (ext.cat !== undefined) C.cat = ext.cat; else if (C.cat === 'movil') C.cat = '';
  mount(raiz, barra, rejilla, detalle);
  const buscar = h('input.inp.r8c-buscar', { type: 'search', placeholder: '🔎 Buscar: maceta, gato, lámpara, organizador…', value: C.buscar, oninput: e => { C.buscar = e.target.value; pinta(); } });
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function pinta() {
    mount(barra, h('div.r8c-cats', K.CATEGORIAS.map(([k, t]) => h('button.r8c-cat' + (C.cat === k ? '.on' : ''), { type: 'button', 'data-cat': k, onclick: () => { C.cat = k; pinta(); } }, t, h('small', String(k ? K.porCategoria(k).length : Object.keys(K.DISENOS).length))))), buscar);
    let L = K.porCategoria(C.cat); const q = norm(C.buscar).trim(); if (q) L = L.filter(([k, d]) => norm(d.t + ' ' + d.d + ' ' + d.cat + ' ' + k + ' ' + (d.busca || '')).includes(q));
    if (C.cat === 'movil') { mount(rejilla, h('div.r8c-fundas-top', h('b', '📱 Las fundas tienen su propio taller'), h('small', 'Con el ajuste fino, la prueba de 5 g y las líneas azules.'), btn('Abrir el taller de fundas', () => ext.irA && ext.irA('fundas'), { cls: 'primary' }))); return; }
    // v20: piezas de máquina y de RC: se hacen con MEDIDAS (no con la IA de fotos) y son diseños propios
    const aviso = C.cat === 'rc' ? h('div.r8c-aviso', h('b', '🏎️ Repuestos de RC a tu medida'), h('small', 'Diseños propios: mide tu pieza con el calibre y cambia las medidas (las de serie son las habituales del RC). Puedes venderlos y decir «compatible con Tamiya / Traxxas…» si lo has comprobado, pero sin sus logotipos ni nombres en la pieza y sin que parezca un recambio original.'))
      : C.cat === 'mecanica' ? h('div.r8c-aviso', h('b', '⚙️ Piezas de máquina con medidas exactas'), h('small', 'Escribe las medidas de TU pieza (calibre); tus holguras de la Bambu (0,05 · 0,10 · 0,15) se suman solas. Para una pieza rota: cuenta dientes y mide el diámetro de fuera.')) : null;
    mount(rejilla, aviso, L.length ? L.map(([k, d]) => tarjeta(k, d)) : h('p.muted', 'No hay nada con esa palabra.'));
    dibujaMinis();
  }
  const tarjeta = (k, d) => h('button.r8c-tar' + (C.abierto === k ? '.on' : ''), { type: 'button', 'data-k': k, onclick: () => abre(k) }, (d.tambien || []).includes('pack60') ? h('i.r8c-regalo', { title: 'Del pack de 60' }, '🎁') : null, h('div.r8c-img', (MINIS.get(k) || d.mini) ? h('img', { src: MINIS.get(k) || d.mini, alt: d.t }) : h('span.r8c-emo', d.e)), h('b', d.t), h('small', d.d), h('span.r8c-uso', { funcional: '💪 Resistente', jarron: '🏺 Modo jarrón', encaje: '🧩 Encaja', flexible: '🪢 TPU', pieza: '🔩 Pieza', deco: '🎀 Decoración' }[d.uso] || ''));
  // las miniaturas se dibujan de una en una, sin bloquear la pantalla
  let cola = Promise.resolve();
  // v30.6.2: con una ventana abierta encima (preparar para la Bambu, el taller de colores…) las miniaturas ESPERAN: dibujarlas a la vez
  // hacía que esa ventana fuera a trompicones la primera vez que se entra al catálogo
  const libre = () => new Promise(r => { const mira = () => (!vivo || !document.querySelector('.overlay, .ct-fondo, .aj-vent-f') ? r() : setTimeout(mira, 400)); mira(); });
  async function dibujaMinis() {
    try { if (localStorage.getItem('cd.r8.sinMinis') === '1') return; } catch (e) { } // (las pruebas que no miran las miniaturas: en un PC sin tarjeta gráfica tardan minutos)
    const conFoto = k => !!(K.DISENOS[k] || {}).mini;   // (22-10: los robots traen su foto: no se fabrican aquí)
    const faltan = [...rejilla.querySelectorAll('.r8c-tar')].filter(b => !MINIS.has(b.dataset.k) && K.DISENOS[b.dataset.k] && !conFoto(b.dataset.k)).map(b => b.dataset.k);
    if (faltan.length) { const L = await leeMinis(faltan.map(k => huella(K, k, C.color[k] || K.DISENOS[k].color))); L.forEach(([hk, url], i) => { if (url && vivo) { const k = faltan[i]; MINIS.set(k, url); const img = rejilla.querySelector('[data-k="' + k + '"] .r8c-img'); if (img) mount(img, h('img', { src: url, alt: '' })); } }); }
    if (!vivo) return;
    [...rejilla.querySelectorAll('.r8c-tar')].filter(b => !MINIS.has(b.dataset.k) && !conFoto(b.dataset.k)).forEach(b => {
      const k = b.dataset.k; cola = cola.then(libre).then(() => new Promise(res => setTimeout(() => { if (!vivo || MINIS.has(k)) return res();
        try { if (SDF) SDF.ajustes.rapido = true; const hazV = () => N.aVista(K.genera(k, sinNombre(K, k))); let vis = N.enAparteDatos(hazV, 8); if (vis === undefined) vis = N.enAmbito(hazV); // (20-10: en el motor aparte; el principal no se llena)
          const url = miniatura(vis, C.color[k] || K.DISENOS[k].color, K.DISENOS[k].acabado || 'mate', 300); MINIS.set(k, url); guardaMini(huella(K, k, C.color[k] || K.DISENOS[k].color), url); const img = rejilla.querySelector('[data-k="' + k + '"] .r8c-img'); if (img) mount(img, h('img', { src: url, alt: '' })); }
        catch (e) { MINIS.set(k, ''); console.warn(k, e); } finally { if (SDF) SDF.ajustes.rapido = false; N.limpia(); } res(); }, 16)));
    });
  }
  // ---------- una pieza abierta ----------
  let escena = null, lienzo = null, tic = 0, info = null, MESA = null;
  let TAM0 = 0, AN = null, VEL = 1; const ANA = new Map(); // 18-10-2026 · 🎬 la animación que se ve y lo que se ha deducido de cada diseño (por sus medidas)
  function abre(k) {
    C.abierto = k; const D = K.DISENOS[k], v = C.v[k] = C.v[k] || K.valores(k);
    rejilla.querySelectorAll('.r8c-tar').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    if (MESA) { MESA.destruir(); MESA = null; } if (escena) { escena.destruir(); escena = null; }
    lienzo = h('canvas.r8c-cv', { 'aria-label': 'Vista 3D de ' + D.t }); info = h('div.r8c-info');
    const campos = h('div.r8c-campos'), color = C.color[k] || D.color || '#7c6cff', acab = C.acabado[k] || D.acabado || 'mate';
    mount(detalle, h('div.r8c-panel', h('div.r8c-vista', lienzo, info),
      h('div.r8c-lado', h('div.r8c-tit', h('span', D.e), h('div', h('b', D.t), h('small', D.d)), btn('✕', () => { C.abierto = null; mount(detalle); if (escena) { escena.destruir(); escena = null; } rejilla.querySelectorAll('.r8c-tar.on').forEach(b => b.classList.remove('on')); }, { cls: 'ghost sm', title: 'Cerrar' })),
        h('div.r8e-paleta', COLORES.map(([c, t]) => h('button' + (color === c ? '.on' : ''), { type: 'button', title: t, style: { background: c }, onclick: () => { C.color[k] = c; MINIS.delete(k); abre(k); } }))),
        h('select.inp', { 'aria-label': 'Acabado', onchange: e => { C.acabado[k] = e.target.value; genera(); } }, Object.entries(ACABADOS).map(([a, x]) => h('option', { value: a, selected: a === acab }, x.t))),
        campos, h('div.r8c-nota'),
        h('div.r8e-btns', btn('🖨️ Preparar para la Bambu', () => imprimir(k), { cls: 'primary r8c-imprimir' }), btn('🧰 Abrir en el Estudio', () => alEstudio(k), { cls: 'r8c-estudio', title: 'La pieza entera, con sus medidas para seguir cambiándolas' }), ext.irA ? btn('🛡️ ¿Aguanta?', () => aResistencia(k), { cls: 'r8c-fragil', title: 'Dónde se partiría con estas medidas y reforzarla tocando la zona' }) : null, K.PARTES && K.PARTES[k] && ext.alEstudioPiezas ? btn('🧩 Al Estudio por piezas (editar y abrir)', () => alEstudioPiezas(k), { cls: 'r8c-estudio-p', title: 'Cada parte suelta (base, tapa, cajón…): se editan una a una y en 🎬 Animar se abre y se cierra' }) : null),
        h('div.r8e-btns.r8c-manual-f', { hidden: true }, btn('📄 Manual de montaje (para el paquete)', () => manual(k), { cls: 'r8c-manual', title: 'Una hoja A4 con la foto, las piezas y los pasos: se imprime o se guarda en PDF' })),
        h('div.r8c-anim', h('div.r8c-anim-t', h('b', '🎬 Animación'), h('small.muted', 'para ver cómo es y cómo se mueve')),
          h('div.r8e-btns', btn('⚙️ Que se mueva', () => anima('mover'), { cls: 'sm r8c-an-mover', title: 'Lo que gira, engrana, orbita, se abre o se ondula, como de verdad' }), btn('🔄 Que gire', () => anima('girar'), { cls: 'sm r8c-an-girar', title: 'Da vueltas para verlo por todos lados' }), btn('💥 Desmontar y montar', () => anima('desmontar'), { cls: 'sm r8c-an-desmontar', title: 'Sus piezas se separan y se vuelven a juntar' }), btn('🔧 Montaje paso a paso', () => anima('montar'), { cls: 'sm r8c-an-montar', title: 'Pieza a pieza, en orden: cada una entra por donde cabe hasta su sitio (se puede pausar y repasar)' }), K.PARTES && K.PARTES[k] ? btn('🚪 Abrir y cerrar', () => anima('abrir'), { cls: 'sm r8c-an-abrir' }) : null),
          h('div.r8e-btns', h('select.inp.sm.r8c-an-vel', { 'aria-label': 'Velocidad', onchange: e => { VEL = Number(e.target.value) || 1; if (AN && AN.modo !== 'girar') anima(AN.modo); } }, [['0.5', '🐢 Despacio'], ['1', 'Normal'], ['2', '🐇 Deprisa']].map(([v2, t]) => h('option', { value: v2, selected: Number(v2) === VEL }, t))), btn('⏹ Parar', () => pararAnim(), { cls: 'sm ghost r8c-an-parar' }), btn('⏺ Grabar vídeo (8 s)', () => grabarAnim(), { cls: 'sm primary r8c-an-grabar', title: 'Lo que se ve, con la cámara girando despacio: para Instagram, TikTok o Cults' })),
          h('p.small.r8c-an-que')),
        h('div.r8e-btns.r8c-sorpresas', btn('📸 Escaparate', () => sorpresa('escaparate', k), { cls: 'r8c-escaparate', title: 'Foto de estudio y vídeo 360° para anunciarla antes de imprimirla' }), btn('🎬 Impresión fantasma', () => sorpresa('fantasma', k), { cls: 'r8c-fantasma', title: 'Mira cómo se imprimirá, capa a capa, con el tiempo estimado' })),
        h('div.r8c-cults', h('b', '🛒 Vender en Cults'), h('span.small.r8c-pvp', cultsLinea(k)),
          CK.esAyuda(k) ? null : h('div.r8e-btns', btn('🛒 Ficha para Cults', () => fichaCults(k), { cls: 'r8c-ficha', title: 'Título, descripción, parámetros, categoría, etiquetas y precio: cada cosa con su botón de copiar y una nota' }), btn('📦 Exportar todo', () => exportar(k), { cls: 'primary r8c-exportar', title: 'Un ZIP con el vídeo, 3 fotos, la ficha, el manual (si lleva) y el ZIP de las piezas para subir a Cults' }))))));
    mount(campos, camposDe(K, k, v, () => genera()));
    import('../r8/manual.js').then(MAN => { const f = detalle.querySelector('.r8c-manual-f'); if (f && C.abierto === k) f.hidden = !MAN.tieneManual(D, v); }).catch(() => { });
    detalle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try { escena = crearEscena(lienzo, { cama: 256, dia: document.documentElement.getAttribute('data-modo') === 'dia' }); MESA = mesa(escena, lienzo, { cama: 256 }); } catch (e) { mount(info, '⚠️ ' + e.message); }
    genera(true);
  }
  function genera(ya) {
    if (AN && escena) { escena.animar(null); escena.giraCamara(0); AN = null; pintaAn(); } // (al cambiar algo se vuelve a la pieza quieta)
    clearTimeout(tic); tic = setTimeout(() => {
      const k = C.abierto; if (!k || !escena) return; const D = K.DISENOS[k], v = C.v[k];
      try { const t0 = performance.now(), m = K.genera(k, v), I = N.info(m); const col1 = C.color[k] || D.color || '#7c6cff', aca = C.acabado[k] || D.acabado || 'mate', dc = D.dosColores && D.dosColores(v); let PV = [{ id: k, vista: N.aVista(m), color: col1, acabado: aca }];
        if (D.coloresVista) { try { const CV = N.enAmbito(() => (D.coloresVista(v, col1) || []).map(x => ({ vista: N.aVista(x.m), color: x.color }))); if (CV.length) PV = CV.map((x, i) => ({ id: k + (i ? '_' + i : ''), vista: x.vista, color: x.color || col1, acabado: aca })); } catch (x) { console.warn('colores', x); } } // 21-10: piezas de varios colores (la réplica negra con la punta naranja)
        if (dc) { try { const [sube, baja] = m.splitByPlane([0, 0, 1], N.caja(m).min[2] + dc.z); if (!sube.isEmpty() && !baja.isEmpty()) PV = [{ id: k, vista: N.aVista(baja), color: col1, acabado: aca }, { id: k + '_2', vista: N.aVista(sube), color: dc.color, acabado: aca }]; } catch (x) { console.warn('dos colores', x); } } // v30.2: el QR en negro sobre blanco (como saldrá con la pausa)
        escena.ponPartes(PV); { const t = Math.max(...I.dims), cambia = TAM0 && (t > TAM0 * 1.4 || t < TAM0 / 1.4); if (ya || cambia) escena.encuadrar('iso'); TAM0 = t; } // (19-10: si pasa a ser mucho más grande o más pequeña —«Verlo montado»—, la cámara se recoloca para verla entera)
        mount(info, h('span', I.dims.map(x => (Math.round(x * 10) / 10).toLocaleString('es-ES')).join(' × ') + ' mm'), h('span', Math.round(I.vol / 1000) + ' cm³'), h('span', Math.round(performance.now() - t0) + ' ms'));
        const nota = detalle.querySelector('.r8c-nota'); if (nota) mount(nota, (typeof D.soportes === 'function' ? D.soportes(v) : D.soportes) ? h('p.r8e-nota.r8c-sopn', '🌲 Lleva soportes (por su forma: asa, orejas, gancho…). Al prepararla para tu Bambu salen marcados los de árbol, que se quitan fácil.') : null, D.nota ? h('p.r8e-nota', typeof D.nota === 'function' ? D.nota(v) : D.nota) : null,
          D.enlaces ? h('div.r8e-btns.r8c-enlaces', D.enlaces(v).map(([t, u]) => btn(t, () => window.open(u, '_blank', 'noopener'), { cls: 'sm' }))) : null);   // 22-10: la guía y la compra de los robots
        window.__r8c = { k, dims: I.dims.map(x => Math.round(x * 10) / 10), vol: I.vol, piezas: m.decompose().length, valores: Object.assign({}, v) };
      } catch (e) { const msg = String(e.message || e), baja = /^⏳/.test(msg); mount(info, baja ? h('span.r8c-baja', msg) : h('span.r8e-mal', '⚠️ ' + msg)); window.__r8c = baja ? { k, cargando: true } : { k, error: msg }; }
      finally { N.limpia(); }
    }, ya ? 0 : 120);
  }
  async function imprimir(k) {
    const { modal } = await import('../ui.js'), A = await import('../r8/consejos3d.js'), d = await import('../desktop.js').catch(() => null), cuerpo = h('div.r8c-aj'); const D = K.DISENOS[k];
    modal('🖨️ ' + D.t + ' · preparar para tu Bambu', cuerpo, null, { size: 'wide' });
    const nombre = (D.t + '_' + Object.values(C.v[k] || {}).filter(x => typeof x === 'string' && x.length < 14 && /[a-z]/i.test(x)).slice(0, 1).join('')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 50);
    A.asistente(cuerpo, { clave: 'cat_' + k, partes: () => (MESA ? MESA.expande : x => x)([{ m: K.genera(k, C.v[k]), color: C.color[k] || D.color || '#7c6cff', nombre: D.t }]), N, uso: D.usoDe ? D.usoDe(C.v[k]) : D.uso === 'pieza' ? 'mecanica' : D.uso, /* v30.3: jarrón hueco = impresión normal */ texto: (D.campos || []).some(c => c.txt && C.v[k][c.k]), nombre, baja, cama: 256, forzar: D.bambu, cambios: D.dosColores ? [D.dosColores(C.v[k])] : null, colorBase: C.color[k] || D.color, /* v30.2 🌈 */ sinCalibrar: !!D.sinCalibrar, soportes: !!(typeof D.soportes === 'function' ? D.soportes(C.v[k]) : D.soportes), sinSoportes: D.sinSoportes || '', /* (20-10 noche: D.soportes puede depender de lo que se imprime: el camión, solo en la cama de las manguetas) */ /* v30.7 */ desktopAbrir: !!(d && d.desktop && d.desktop.on) });
  }
  // ---------- 14-10-2026 (tarde) · 🛒 VENDER EN CULTS: la ficha (cada campo con su nota al lado) y «📦 Exportar todo» ----------
  const LS_PV = 'cd.r8.cults.precios'; // los precios que ella pone (por diseño), en este aparato
  const misPrecios = () => { try { return JSON.parse(localStorage.getItem(LS_PV) || '{}') || {}; } catch (e) { return {}; } };
  function cultsLinea(k) { if (CK.esAyuda(k)) return 'Es una ayuda para diseñar (se resta o se añade a otra pieza): no se vende sola.'; const s = CK.precioDe(K, k), mio = misPrecios()[k]; return s === 0 ? 'Gratis: sube esta gratis, trae gente a tu perfil.' : CU.euros(mio || s) + (mio ? ' (el tuyo)' : ' (orientativo)'); }
  const infoDe = k => (window.__r8c && window.__r8c.k === k && !window.__r8c.error) ? window.__r8c : {};
  const copiar = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); } catch (e) { const t = h('textarea', { style: { position: 'fixed', left: '-9999px' } }); t.value = txt; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (x) { } t.remove(); } toast('📋 Copiado: ' + ok, 'ok', 2500); };
  function fichaCults(k) {
    let Fi; try { Fi = CK.ficha(K, k, C.v[k], infoDe(k), { precio: misPrecios()[k] }); } catch (e) { return toast('No he podido preparar la ficha: ' + (e.message || e), 'bad'); }
    if (window.__r8c) window.__r8c.ficha = Fi;
    const precio = Fi.gratis ? h('b', 'Gratis') : h('input.inp.r8cj-precio', { type: 'number', min: 0.5, max: 99, step: 0.01, value: Fi.precio, 'aria-label': 'Tu precio en Cults (€)', onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= 0.5 && v <= 99)) { toast('🛑 El precio, entre 0,50 y 99 €', 'warn'); e.target.value = Fi.precio; return; } const P = misPrecios(); if (v === Fi.sugerido) delete P[k]; else P[k] = v; try { localStorage.setItem(LS_PV, JSON.stringify(P)); } catch (x) { } const l = detalle.querySelector('.r8c-pvp'); if (l) l.textContent = cultsLinea(k); toast('💶 Precio para Cults: ' + CU.euros(v), 'ok', 2500); } });
    const cuerpo = h('div.r8cj-fichas', h('p.small.muted', { style: { margin: '0 0 8px' } }, 'Abre Cults → «Subir un diseño» y copia cada cosa en su sitio (📋). Las notas de la derecha son para ti. La ficha sale de ESTA variante: sus medidas, su color y su texto.'),
      Fi.campos.map(c => h('div.r8cj-fc', { 'data-campo': c.k },
        h('div.r8cj-fc-v', h('b', c.t), c.k === 'precio' ? h('div.row', precio, Fi.gratis ? null : h('small.muted', '€ · propuesto: ' + CU.euros(Fi.sugerido))) : h('textarea.inp', { readonly: true, rows: Math.min(14, Math.max(1, Math.ceil(c.v.length / 70) + (c.v.match(/\n/g) || []).length)), value: c.v }),
          btn('📋 Copiar', () => copiar(c.k === 'precio' ? (Fi.gratis ? '0' : String(Fi.precio).replace('.', ',')) : c.v, c.t), { cls: 'sm ghost r8cj-copia' })),
        h('small.r8cj-fc-nota', '📝 ' + c.nota))));
    modal('🛒 Ficha para Cults · ' + Fi.titulo.es, cuerpo, c => [btn('📦 Exportar todo', () => { c(); exportar(k); }, { cls: 'primary' }), btn('Cerrar', c, { cls: 'ghost' })], { size: 'wide' });
  }
  // 📦 un ZIP con el vídeo (6 s girando), 3 fotos, la ficha, el manual (si se monta) y, dentro, el ZIP que se sube TAL CUAL a Cults
  let exportando = false;
  async function exportar(k, o = {}) {
    if (exportando || !escena || C.abierto !== k) return; if (CK.esAyuda(k)) return toast('Es una ayuda para diseñar: no se vende sola.', 'warn');
    exportando = true; const D = K.DISENOS[k], v = C.v[k], bt = detalle.querySelector('.r8c-exportar'), paso = t => { if (bt) bt.textContent = '⏳ ' + t; }; if (bt) bt.disabled = true;
    const enc = new TextEncoder(), datos = async b => new Uint8Array(b instanceof Blob ? await b.arrayBuffer() : b), deFoto = u => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    const espera2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { zip } = await import('../r8/motor.js'), Fi = CK.ficha(K, k, v, infoDe(k), { precio: misPrecios()[k] }), base = Fi.nombreArchivo, A = [], dentro = [], color = C.color[k] || D.color || '#7c6cff';
      paso('Piezas…'); await espera2();
      // (un STL con todo tal como sale en la cama: en lo que se imprime YA MONTADO —bisagras, cadenas, rodamientos— no se puede separar)
      try { const X = N.enAmbito(() => { const m = K.genera(k, v); return [{ stl: new Uint8Array(N.stl(m, D.t)), tres: N.tresMF([{ m, color, nombre: D.t }], base) }]; })[0]; // (en su ámbito: no deja memoria ocupada)
        dentro.push({ nombre: base + '/' + base + '.stl', datos: X.stl });
        dentro.push({ nombre: base + '/' + base + '.3mf', datos: await datos(X.tres) });
      } finally { N.limpia(); }
      paso('Fotos…'); const fotos = [];
      for (const [n, dir] of [['01_portada.jpg', 'iso'], ['02_otro_lado.jpg', [-0.62, 0.95, 0.72]], ['03_desde_arriba.jpg', [0.15, -0.35, 1]]]) { escena.encuadrar(dir); await espera2(); fotos.push([n, escena.foto('image/jpeg', 0.9)]); }
      escena.encuadrar('iso'); fotos.forEach(([n, u]) => A.push({ nombre: 'FOTOS/' + n, datos: deFoto(u) }));
      paso('Manual…'); let manualHtml = null;
      try { const MAN = await import('../r8/manual.js'); if (MAN.tieneManual(D, v)) { const H = await MAN.hojaDe({ K, N, k, v, escena, color: C.color[k] || D.color, acabado: C.acabado[k] || 'mate' }); manualHtml = H && H.html; } } catch (e) { console.warn('manual', e); } finally { genera(true); await espera2(); }
      if (manualHtml) { dentro.push({ nombre: base + '/Manual_de_montaje.html', datos: enc.encode(manualHtml) }); A.push({ nombre: '3_Manual_de_montaje.html', datos: enc.encode(manualHtml) }); }
      dentro.push({ nombre: base + '/LEEME.txt', datos: enc.encode([Fi.titulo.en, Fi.titulo.es, '', Fi.descripcion.en, '', '———', '', Fi.descripcion.es, '', '© CelebriDiseños · uso personal: no se permite vender los archivos ni lo impreso sin permiso.'].join('\r\n')) });
      A.push({ nombre: '1_SUBIR_A_CULTS/' + base + '.zip', datos: await datos(zip(dentro)) });
      A.push({ nombre: '2_FICHA_PARA_CULTS.txt', datos: enc.encode(CU.fichaTexto(Fi)) });
      if (o.video !== false) { paso('Grabando el vídeo (6 s)…'); try { const V = await videoGiro(6); A.push({ nombre: 'VIDEO/' + base + '.' + V.ext, datos: await datos(V.blob) });
          try { const X = await analisisDe(k); if (X.hayMovimiento) { paso('Grabando el movimiento (6 s)…'); await anima('mover'); const V2 = (await fotogramas(6, AN && AN.fn, 0.35)) || await grabaLienzo(6, 0.35); A.push({ nombre: 'VIDEO/' + base + '_movimiento.' + V2.ext, datos: await datos(V2.blob) }); pararAnim(); } } catch (e2) { console.warn('vídeo del movimiento', e2); pararAnim(); } // (18-10-2026)
        } catch (e) { toast('El vídeo no ha podido grabarse (' + (e.message || e) + '): va todo lo demás.', 'warn', 7000); } }
      const todo = zip(A), n = base + '_CULTS.zip';
      window.__r8c = Object.assign(window.__r8c || {}, { exportado: { nombre: n, bytes: todo.size, archivos: A.map(a => a.nombre), dentro: dentro.map(a => a.nombre), precio: Fi.precio, gratis: Fi.gratis } });
      baja(todo, n);
      modal('📦 Exportado: ' + n, h('div', h('p', 'Está en tu carpeta de Descargas. Dentro:'), h('ul.small',
        h('li', h('b', '1_SUBIR_A_CULTS/' + base + '.zip'), ' → el archivo que subes a Cults TAL CUAL (el STL, el 3MF' + (manualHtml ? ', el manual' : '') + ').'),
        h('li', h('b', '2_FICHA_PARA_CULTS.txt'), ' → título, descripción, parámetros, categoría, etiquetas, precio (' + (Fi.gratis ? 'gratis' : CU.euros(Fi.precio)) + ') y tus notas.'),
        h('li', h('b', 'FOTOS/'), ' → 3 fotos (la 01 es la portada). Si la imprimes, añade una foto tuya: es lo que más vende.'),
        A.some(a => a.nombre.startsWith('VIDEO/')) ? h('li', h('b', 'VIDEO/'), ' → 6 s girando' + (A.some(a => /_movimiento\./.test(a.nombre)) ? ' y 6 s de cómo se mueve' : '') + ': para Instagram, TikTok o Wallapop.') : null)), c => [btn('Vale', c, { cls: 'primary' })]);
    } catch (e) { toast('No he podido exportar: ' + (e.message || e), 'bad', 9000); window.__r8c = Object.assign(window.__r8c || {}, { exportado: { error: e.message || String(e) } }); }
    finally { exportando = false; if (bt) { bt.disabled = false; bt.textContent = '📦 Exportar todo'; } }
  }
  // ================= 🎬 ANIMACIÓN (la dueña: «no puedo hacer animación desde catálogo, eso lo quiero para ver cada cosa») =================
  // Lo que se mueve se DEDUCE de las piezas sueltas de cada diseño (r8/cat_anima.js): no hace falta enseñárselo a cada uno.
  // (si el diseño tiene vista «Montado» —los kits, los engranajes en su placa—, se anima MONTADO: así se ve cómo se mueve de verdad)
  async function analisisDe(k) {
    const D = K.DISENOS[k], om = CA.opcionMontado(D), v = Object.assign({}, C.v[k], om ? { [om.k]: om.v } : {}), clave = k + '|' + JSON.stringify(v); if (ANA.has(clave)) return ANA.get(clave);
    let X; try { const monta = await CA.montadasFn(k), p = Object.assign({}, K.valores ? K.valores(k) : {}, v), haz = () => CA.analiza(N, monta(p) || K.genera(k, v), { pista: CA.PISTAS[k], cat: D.cat, k, t: D.t });
      X = N.enAparteDatos(haz); if (X === undefined) X = N.enAmbito(haz); } finally { N.limpia(); } // (20-10: en el motor aparte, que luego se tira: la memoria del principal no sube con cada animación)
    X.montado = !!om && v[om.k] !== (C.v[k] || {})[om.k]; ANA.set(clave, X); if (ANA.size > 30) ANA.delete(ANA.keys().next().value); return X;
  }
  // 20-10-2026 · los avisos de la animación van EN SU LÍNEA (debajo de los botones), no en un globo flotante encima de la pieza
  let AVISO_AN = null; const avisaAn = (t, tipo = 'warn') => { AVISO_AN = { t, tipo }; };
  const motorLleno = e => /memory|out of bounds|OOM|Aborted|allocation/i.test(String((e && e.message) || e)); // (el motor 3D sin memoria: decirlo en cristiano)
  const DIR_TXT = d => d[2] > 0 ? 'desde arriba' : d[2] < 0 ? 'desde abajo' : d[0] > 0 ? 'por la derecha' : d[0] < 0 ? 'por la izquierda' : d[1] > 0 ? 'por detrás' : 'por delante';
  function pintaMontaje(q) { // 20-10-2026 · 🔧 el paso que se ve, con ⏮ ⏯ ⏭ (para montarlo de verdad mirando la pantalla)
    const M = AN.M, R = AN.R, p = M.pasoEn(R.t), o = AN.orden[p], ir = n => { R.t = Math.max(0, Math.min(M.pasos - 1, n)) * M.S + 0.02; AN.pasoVisto = -1; };
    mount(q, h('div.r8c-montaje', h('b.r8c-mo-paso', '🔧 Paso ' + (p + 1) + ' de ' + M.pasos + ': ' + o.nombre), h('small', o.base ? 'La base: todo lo demás se monta encima o alrededor.' : 'Entra ' + DIR_TXT(o.dir) + '. El fantasma azul marca dónde encaja.'),
      h('div.r8e-btns', btn('⏮', () => ir(p - 1), { cls: 'sm r8c-mo-atras', title: 'Paso anterior' }), btn(R.pausa ? '▶ Seguir' : '⏸ Pausa', () => { R.pausa = !R.pausa; pintaAn(); }, { cls: 'sm r8c-mo-pausa' }), btn('⏭', () => ir(p + 1), { cls: 'sm r8c-mo-sig', title: 'Paso siguiente' }), btn('↺ Desde el principio', () => ir(0), { cls: 'sm ghost r8c-mo-inicio' }))));
  }
  function pintaAn() {
    const q0 = detalle.querySelector('.r8c-an-que'); if (q0 && AN && AN.modo === 'montar') { pintaMontaje(q0); return pintaAn2(); }
    const q = q0; if (q) mount(q, !AN && AVISO_AN ? h('span.r8c-an-aviso.' + AVISO_AN.tipo, { role: 'status' }, AVISO_AN.t) : AN ? (AN.modo === 'girar' ? '🔄 Dando vueltas.' : AN.modo === 'desmontar' ? '💥 ' + AN.X.n + ' piezas se separan y se vuelven a juntar.' : AN.modo === 'abrir' ? '🚪 Se abre y se cierra por su bisagra o su cajón.' : '⚙️ ' + (AN.X.notas || []).join('; ') + '.') + (AN && AN.X && AN.X.montado ? ' (Para verlo moverse lo he puesto MONTADO, con todas sus piezas.)' : '') : '');
    pintaAn2();
  }
  function pintaAn2() {
    detalle.querySelectorAll('.r8c-anim .r8e-btns button').forEach(b => b.classList.toggle('on', !!AN && b.classList.contains('r8c-an-' + AN.modo)));
    window.__r8c = Object.assign(window.__r8c || {}, { anim: AN ? { modo: AN.modo, piezas: AN.X ? AN.X.n : null, mov: AN.X ? Object.fromEntries(Object.entries(AN.X.mov || {}).map(([i, m]) => [i, m.tipo])) : null, cadena: AN.X && AN.X.cadena ? AN.X.cadena.orden.length : 0, montaje: AN.M ? { paso: AN.M.pasoEn(AN.R.t), pasos: AN.M.pasos, pausa: AN.R.pausa, t: AN.R.t, orden: AN.orden.map(o => ({ id: o.id, nombre: o.nombre, dir: o.dir })) } : null } : null });
  }
  const conMesa = fn => (MESA && MESA.anim ? MESA.anim(fn) : fn); // (la cama del catálogo dibuja cada pieza por copia: «id@copia»)
  function pararAnim() { if (!escena) return; const cambio = AN && AN.cambio; escena.animar(null); escena.giraCamara(0); AN = null; if (cambio) genera(); pintaAn(); }
  async function anima(modo) {
    const k = C.abierto; if (!k || !escena) return; const D = K.DISENOS[k], v = C.v[k], color = C.color[k] || D.color || '#7c6cff', acabado = C.acabado[k] || D.acabado || 'mate';
    escena.animar(null); escena.giraCamara(0); AVISO_AN = null;
    if (modo === 'girar') { if (AN && AN.cambio) genera(); AN = { modo }; escena.giraCamara(VEL); pintaAn(); return; }
    const q = detalle.querySelector('.r8c-an-que'); if (q) mount(q, '⏳ Mirando sus piezas…'); await new Promise(r => setTimeout(r, 30));
    try {
      if (modo === 'abrir') {
        const hazL = () => (K.partesDe(k, Object.assign({}, v)) || []).map((x, i) => ({ id: 'pa' + i, vista: N.aVista(N.deSopa(x.sopa)), bisagra: x.bisagra, desliza: x.desliza }));
        let L = N.enAparteDatos(hazL); if (L === undefined) L = N.enAmbito(hazL); N.limpia();
        if (!L.some(x => x.bisagra || x.desliza)) { avisaAn('🚪 Este no trae bisagra ni cajón: mira «🔄 Que gire».'); return pintaAn(); }
        escena.ponPartes(L.map(x => ({ id: x.id, vista: x.vista, color, acabado }))); const fn = conMesa(CA.animacionAbrir(L, VEL)); escena.animar(fn); AN = { modo, cambio: true, X: { n: L.length }, fn }; return pintaAn();
      }
      const X = await analisisDe(k);
      if (X.demasiadas) { avisaAn('Tiene ' + X.n + ' trozos sueltos (letras, detalles…): mira «🔄 Que gire».'); return pintaAn(); }
      if (modo === 'mover' && !X.hayMovimiento) { avisaAn('En este diseño no hay piezas que se muevan solas' + (X.n > 1 ? ': mira «💥 Desmontar y montar» o «🔄 Que gire».' : ': mira «🔄 Que gire».')); return pintaAn(); }
      if (modo === 'montar') { // 20-10-2026 · 🔧 montaje paso a paso, con su propio reloj (⏸ lo para; ⏮ ⏭ saltan de paso)
        if (X.n < 2) { avisaAn('Es de una sola pieza: no hay nada que montar. Mira «🔄 Que gire».'); return pintaAn(); }
        const orden = CA.ordenMontaje(X), M = CA.animacionMontaje(X, orden, VEL), R = { t: 0, ult: null, pausa: false };
        escena.ponPartes(X.piezas.map(p => ({ id: p.id, vista: p.vista, color: p.color || color, acabado })).concat(X.piezas.map(p => ({ id: 'g' + p.id, vista: p.vista, color: '#00c2d1', fantasma: true }))));
        AN = { modo, cambio: true, X, orden, M, R, pasoVisto: -1, fn: conMesa(M.fn) };
        const yo = AN; escena.animar(conMesa(tr => { if (R.ult != null && !R.pausa) R.t += tr - R.ult; R.ult = tr; const p = M.pasoEn(R.t); if (AN === yo && p !== yo.pasoVisto) { yo.pasoVisto = p; pintaAn(); } return M.fn(R.t); }));
        return pintaAn();
      }
      if (modo === 'desmontar' && X.n < 2) { avisaAn('Es de una sola pieza: no hay nada que desmontar. Mira «🔄 Que gire».'); return pintaAn(); }
      escena.ponPartes(X.piezas.map(p => ({ id: p.id, vista: p.vista, color: p.color || color, acabado }))); const fn = conMesa(CA.animacion(X, modo, VEL)); escena.animar(fn); AN = { modo, cambio: true, X, fn };
    } catch (e) { AN = null; avisaAn(motorLleno(e) ? '⚠️ El motor 3D se ha quedado sin memoria. Pulsa otra vez: lo hago con un motor nuevo.' : '⚠️ No he podido animarlo: ' + (e.message || e), 'bad'); console.warn('animación', e); }
    pintaAn();
  }
  // ⏺ 8 s de la animación que se esté viendo (o, si no hay ninguna, de lo que mejor lo enseña), con la cámara girando despacio
  async function grabarAnim() {
    const k = C.abierto; if (!k || !escena) return; const bt = detalle.querySelector('.r8c-an-grabar'); if (bt) { bt.disabled = true; bt.textContent = '⏺ Grabando…'; }
    try {
      if (!AN) { let X = null; try { X = await analisisDe(k); } catch (e) { } await anima(X && X.hayMovimiento ? 'mover' : X && X.n > 1 ? 'desmontar' : 'girar'); }
      const V = (await fotogramas(8, AN && AN.fn, AN && AN.modo !== 'girar' ? 0.35 : 1)) || await grabaLienzo(8, AN && AN.modo !== 'girar' ? 0.35 : 0), n = (K.DISENOS[k].t || k).replace(/[^\wáéíóúñü ]+/gi, '').trim().replace(/\s+/g, '_').slice(0, 40) + '_' + (AN ? AN.modo : 'giro') + '.' + V.ext;
      baja(V.blob, n); toast('🎬 Vídeo guardado: ' + n + ' (en Descargas)', 'ok', 7000); window.__r8c = Object.assign(window.__r8c || {}, { video: { nombre: n, bytes: V.blob.size } });
    } catch (e) { toast('No he podido grabar: ' + (e.message || e), 'bad', 8000); } finally { if (bt) { bt.disabled = false; bt.textContent = '⏺ Grabar vídeo (8 s)'; } }
  }
  // 18-10-2026 · VÍDEO FOTOGRAMA A FOTOGRAMA (como el de CelebriDREW): cada fotograma con su hora exacta → suave y entero aunque el
  // ordenador tarde en pintar (la grabación «en directo» se quedaba sin imágenes con las piezas pesadas). vueltas = lo que gira la cámara.
  async function fotogramas(dur, fn, vueltas = 0) {
    let V; try { V = await import('../drew/video_mp4.js'); } catch (e) { return null; } const fps = 30, n = Math.round(dur * fps);
    escena.animar(null); escena.giraCamara(0); escena.video(true);
    try { const blob = await V.mp4DeLienzo(lienzo, n, fps, f => escena.fotograma(fn, f / fps, vueltas * 2 * Math.PI * f / n)); return blob ? { blob, ext: 'mp4' } : null; }
    finally { escena.video(false); if (AN && AN.fn) escena.animar(AN.fn); else if (AN && AN.modo === 'girar') escena.giraCamara(VEL); }
  }
  async function grabaLienzo(dur, gira = 0) {
    if (!window.MediaRecorder || !lienzo.captureStream) throw new Error('este navegador no sabe grabar vídeo');
    const st = lienzo.captureStream(30), tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const rec = new MediaRecorder(st, tipo ? { mimeType: tipo, videoBitsPerSecond: 8e6 } : undefined), trozos = [], fin = new Promise(r => { rec.onstop = r; });
    rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
    try { lienzo.scrollIntoView({ block: 'nearest' }); } catch (e) { } // (si la vista queda fuera de la pantalla, el navegador no le pide imágenes)
    const giraba = AN && AN.modo === 'girar'; if (gira) escena.giraCamara(gira); rec.start(250); const tic2 = setInterval(() => escena.pide(), 30);
    try { await new Promise(r => setTimeout(r, dur * 1000)); } finally { clearInterval(tic2); rec.stop(); await fin; if (gira && !giraba) escena.giraCamara(0); }
    const mp4 = /mp4/.test(tipo), blob = new Blob(trozos, { type: mp4 ? 'video/mp4' : 'video/webm' }); if (!blob.size) throw new Error('no ha salido ninguna imagen (¿la vista estaba tapada?)'); return { blob, ext: mp4 ? 'mp4' : 'webm' };
  }
  // ⏺ 6 s de la pieza girando (lo que se ve en el 3D), en MP4 si el navegador sabe (si no, WebM)
  async function videoGiro(dur) {
    escena.encuadrar('iso'); const F = await fotogramas(dur, null, 1); if (F) return F; // (18-10-2026: fotograma a fotograma; si no se puede, en directo)
    if (!window.MediaRecorder || !lienzo.captureStream) throw new Error('este navegador no sabe grabar vídeo');
    const st = lienzo.captureStream(30), tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const rec = new MediaRecorder(st, tipo ? { mimeType: tipo, videoBitsPerSecond: 8e6 } : undefined), trozos = [], fin = new Promise(r => { rec.onstop = r; });
    rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
    escena.encuadrar('iso'); if (escena.giraCamara) escena.giraCamara(1); rec.start(250); const tic = setInterval(() => escena.pide(), 30);
    try { await new Promise(r => setTimeout(r, dur * 1000)); } finally { clearInterval(tic); rec.stop(); await fin; if (escena.giraCamara) escena.giraCamara(0); escena.encuadrar('iso'); }
    const mp4 = /mp4/.test(tipo); return { blob: new Blob(trozos, { type: mp4 ? 'video/mp4' : 'video/webm' }), ext: mp4 ? 'mp4' : 'webm' };
  }
  // v40 · 📄 el manual de montaje de los diseños que se montan (r8/manual.js)
  async function manual(k) { const MAN = await import('../r8/manual.js'); await MAN.abrirManual({ K, N, k, v: C.v[k], escena, color: C.color[k] || (K.DISENOS[k] || {}).color, acabado: C.acabado[k] || 'mate', alAcabar: () => genera(true) }); }
  // v30 · 🎁 las dos sorpresas: Escaparate e Impresión fantasma
  async function sorpresa(que, k) { const S = await import('../r8/sorpresas.js'), D = K.DISENOS[k]; let partes; try { partes = [{ vista: N.aVista(K.genera(k, C.v[k])), color: C.color[k] || D.color || '#7c6cff', acabado: C.acabado[k] || D.acabado || 'mate' }]; } catch (e) { return toast(e.message || String(e), 'bad'); } finally { N.limpia(); } S[que](partes, { nombre: D.t }); }
  function alEstudioPiezas(k) { try { const L = K.partesDe(k, Object.assign({}, C.v[k])); if (!L) return alEstudio(k); const col = C.color[k] || (K.DISENOS[k] || {}).color; ext.alEstudioPiezas(L.map((x, i) => Object.assign(x, { color: i ? aclara(col) : col })), (K.DISENOS[k] || {}).t); } catch (e) { toast(e.message || String(e), 'bad', 7000); } finally { N.limpia(); } }
  const aclara = c2 => { const m = /^#?([0-9a-f]{6})$/i.exec(c2 || ''); if (!m) return c2; const v = parseInt(m[1], 16), f = x => Math.min(255, Math.round(x + (255 - x) * 0.35)); return '#' + [v >> 16 & 255, v >> 8 & 255, v & 255].map(f).map(x => x.toString(16).padStart(2, '0')).join(''); };
  async function aResistencia(k) { try { const E = await import('../r8/estado.js'); E.ponEnMesa({ nombre: (K.DISENOS[k] || {}).t || k, origen: 'catalogo', stl: new Uint8Array(N.stl(K.genera(k, C.v[k]), k)) }); N.limpia(); ext.irA('fragil'); } catch (e) { N.limpia(); toast(e.message || String(e), 'bad', 7000); } }
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
  // v30.2 · abrir un diseño desde fuera (los regalos de la 30.2: «📱 Llavero con QR»)
  const abreDe = k => { if (!K.DISENOS[k]) return; C.cat = K.DISENOS[k].cat; C.buscar = ''; pinta(); abre(k); setTimeout(() => { const t = rejilla.querySelector('[data-k="' + k + '"]'); t && t.scrollIntoView({ block: 'center' }); }, 200); };
  window.__r8catAbre = abreDe; let pend = null; try { pend = localStorage.getItem('cd.r8.cat.abrir'); localStorage.removeItem('cd.r8.cat.abrir'); } catch (e) { }
  pinta(); if (pend && K.DISENOS[pend]) abreDe(pend); else if (C.abierto) abre(C.abierto);
  const alRobot = () => { const k = C.abierto; if (vivo && k && (K.DISENOS[k] || {}).robot && escena) genera(true); };   // 22-10: llegaron sus piezas (y se encuadra)
  window.addEventListener('r8-robots-listo', alRobot);
  return { destroy() { vivo = false; window.removeEventListener('r8-robots-listo', alRobot); if (window.__r8catAbre === abreDe) window.__r8catAbre = null; clearTimeout(tic); if (MESA) MESA.destruir(); if (escena) escena.destruir(); }, abre };
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
