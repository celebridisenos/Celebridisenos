// ================= 50.3 · ✍️ DESCRIPCIONES DE VENTA: todos los productos, uno por uno, y a la web de una vez =================
// Ella (14-10-2026): «todos los productos tienen que tener descripción breve: míralos uno por uno y ponles descripción de venta
// ganadora corta, título y descripción muy corta con palabras clave y algún que otro emoji, no mucho texto, que no suene a IA» y
// «los productos del programa y los publicas directamente a la web».
//  · Los 13 que ya estaban en la web los escribí MIRANDO SU FOTO uno por uno (PACK, por su código). Los demás salen de lo que se sabe
//    del producto (si ya tienen un texto suyo corto, se respeta; si es largo, se acorta por una frase entera) y se retocan aquí mismo.
//  · Título corto (es el NOMBRE del producto: al cambiarlo, el programa se lleva con él los pedidos, el stock y la calculadora), dos
//    líneas con uno o dos emojis y, debajo, los DATOS que pone el programa (medidas, colores con su círculo y material): no se inventan.
//  · Para Google: un título y una frase con las palabras que la gente busca (no se ven en la ficha, sí en el buscador).
//  · «Aplicar» guarda en el programa y vuelve a publicar en la web los que ya estaban, con sus MISMAS fotos, precio y todo lo demás.
//    Los que aún no están en la web no se publican solos (antes hay que elegir fotos y precio en su ficha): se dice cuáles son.
import { h, mount, btn, toast, inp, area } from './ui.js';
import { S, can, api, pull } from './store.js';
import { filesOf, fetchFile, previewUrl } from './files.js';
import { circuloDe } from './colores.js';

// ---------- lo escrito a mano (14-10-2026), mirando la foto de cada uno ----------
// sinMedidas: sus medidas guardadas no cuadran con la foto → no se ponen en el texto y se avisa para que las revise
export const PACK = {
  'HOG-0015': { titulo: 'Bandeja joyero con lazo', texto: 'Bandeja para anillos y pulseras, con arco para colgar un collar 💍\nPreciosa en el tocador o en la mesilla.', seoT: 'Bandeja joyero con lazo para anillos, pulseras y collares', seoD: 'Bandeja joyero con lazo y arco para colgar collares. Para el tocador o la mesilla. Hecha bajo pedido en 8 colores.' },
  'HOG-0019': { titulo: 'Cuadro árbol geométrico de pared', texto: 'Árbol de hexágonos para vestir una pared del salón o del dormitorio 🌳\nPlano y ligero: decora sin obras.', seoT: 'Cuadro árbol geométrico de hexágonos · decoración de pared', seoD: 'Cuadro de pared con árbol geométrico de hexágonos. Decoración moderna para salón, dormitorio o recibidor. 23 × 19,9 cm, en 6 colores.' },
  'HOG-0018': { titulo: 'Cubo infinito · ilusión óptica', texto: 'El cubo «imposible»: lo miras dos veces y sigue sin cuadrar 🌀\nDe escritorio o de estantería. Un regalo curioso.', seoT: 'Cubo infinito (cubo imposible) · ilusión óptica de escritorio', seoD: 'Cubo infinito o cubo imposible: una ilusión óptica para el escritorio o la estantería. 11,1 cm, en 6 colores. Un regalo original.' },
  'MAS-0001': { titulo: 'Dispensador de chuches para mascotas', texto: 'Rellena el rodillo de chuches: al girarlo, van cayendo 🐾\nJuego y premio a la vez para tu gato o tu perro.', seoT: 'Dispensador de chuches para gatos y perros · juguete', seoD: 'Juguete dispensador de chuches para mascotas: gira el rodillo y caen los premios. Para gatos y perros. En 6 colores.', sinMedidas: 'Sus medidas dicen 1,5 cm de alto y en la foto es bastante más alto: revísalas en su ficha.' },
  'MIN-0001': { titulo: 'Figura Crash low poly para pintar', texto: 'Figura low poly de 23 cm que llega en blanco, lista para pintarla a tu gusto 🎨\nPara coleccionistas y fans de los videojuegos.', seoT: 'Figura Crash low poly de 23 cm para pintar', seoD: 'Figura de Crash estilo low poly de 23 cm, sin pintar, lista para pintar a tu gusto. Para coleccionistas y fans de los videojuegos.' },
  'HOG-0023': { titulo: 'Figura minimalista con corazón', texto: 'Una figura sentada que guarda un corazón rojo entre las manos ❤️\nPara la mesilla, la estantería o para regalar a alguien especial.', seoT: 'Figura minimalista con corazón rojo · decoración y regalo', seoD: 'Figura decorativa minimalista sentada con un corazón rojo. Para mesilla, estantería o escritorio, y un regalo bonito. 15,2 cm de alto.' },
  'HOG-0006': { titulo: 'Organizador de baño de 2 niveles', texto: 'Arriba jabones y botes, abajo las toallas 🧼\nCompacto: para el lavabo, la encimera o la cocina.', seoT: 'Organizador de baño de 2 niveles para toallas y jabones', seoD: 'Organizador de baño de dos niveles: arriba jabones y botes, abajo las toallas. Compacto, para lavabo, encimera o cocina.' },
  'HOG-0014': { titulo: 'Cesta organizadora con lazo', texto: 'Cestita con lazo para perfumes, cremas o maquillaje 🎀\nOrdena y a la vez adorna el tocador.', seoT: 'Cesta organizadora con lazo para perfumes y maquillaje', seoD: 'Cesta organizadora con lazo para perfumes, cremas y maquillaje. Decora el tocador o el baño. 14 × 19 cm, en 6 colores.' },
  'HOG-0013': { titulo: 'Pareja de cisnes decorativos', texto: 'Pareja de cisnes para el salón o el dormitorio 🦢\nEn blanco y negro o en los colores que elijas. Un regalo bonito para parejas.', seoT: 'Pareja de cisnes decorativos · regalo para parejas', seoD: 'Pareja de cisnes decorativos para salón o dormitorio. En blanco y negro o en tus colores. Un regalo bonito para parejas y aniversarios.' },
  'HOG-0020': { titulo: 'Cuadro árbol en 3 paneles', texto: 'Un árbol en tres paneles para el cabecero, el salón o la entrada 🌳\nLlena una pared vacía en un momento.', seoT: 'Cuadro árbol en 3 paneles · decoración de pared moderna', seoD: 'Cuadro decorativo de árbol en tres paneles. Para cabecero, salón o recibidor. Plano y ligero, 25,4 × 17,2 cm, en 6 colores.' },
  'HOG-0012': { titulo: 'Copa decorativa «Vaso de almas»', texto: 'Una copa escultura: la forman dos rostros que se miran 🍷\nDecorativa, no es para beber. Llama la atención en cualquier estantería.', seoT: 'Copa decorativa de rostros «Vaso de almas» · escultura', seoD: 'Copa escultura formada por dos rostros. Pieza decorativa para estantería o escritorio, no apta para beber. 8 × 20 cm.' },
  'HOG-0005': { titulo: 'Vaso para cepillos de dientes con desagüe', texto: 'Cepillos y pasta en su sitio; el agua sale por abajo y no se encharca 🪥\nRayado y compacto para el lavabo.', seoT: 'Vaso para cepillos de dientes con desagüe · baño', seoD: 'Vaso porta cepillos de dientes con salida de agua: no se encharca. Para cepillos y pasta. Diseño rayado y compacto para el lavabo.' },
  'HOG-0007': { titulo: 'Organizador de maquillaje', texto: 'Brochas de pie, labiales y máscaras, cada uno en su hueco 💄\nEl tocador ordenado sin ocupar casi sitio.', seoT: 'Organizador de maquillaje con compartimentos para brochas', seoD: 'Organizador de maquillaje con compartimentos para brochas, labiales y máscaras. Compacto para el tocador o el baño.' }
};

// ---------- los de la casa (para los que no están en el PACK): por el tipo de pieza ----------
const TIPOS = [
  [/organizador|caja|bandeja|joyero|cesta|estuche/, '🧺', 'Cada cosa en su sitio y a la vista.'],
  [/figura|busto|estatua|escultura|personaje|mu[nñ]eco/, '✨', 'Para la estantería, el escritorio o para regalar.'],
  [/cuadro|panel|pared|letrero|cartel/, '🖼️', 'Plano y ligero: decora la pared sin obras.'],
  [/maceta|macetero|planta|suculent|cactus/, '🌿', 'Para tus plantas, en la ventana o en la estantería.'],
  [/llavero/, '🔑', 'Un detalle pequeño para llevar siempre contigo.'],
  [/l[aá]mpara|luz|led/, '💡', 'Luz cálida para la mesilla o el salón.'],
  [/soporte|base|stand|porta/, '📱', 'Lo tienes a mano y la mesa despejada.'],
  [/vaso|copa|jarr[oó]n|florero/, '🏺', 'Decorativo y fácil de combinar.'],
  [/mascota|gat|perr/, '🐾', 'Para tu peludo.'],
  [/navidad|navide|bel[eé]n|reno|papa noel/, '🎄', 'Para la decoración de Navidad.'],
  [/halloween|calabaza|fantasma/, '🎃', 'Para un Halloween con estilo.'],
  [/im[aá]n|nevera/, '🧲', 'Alegra la nevera y sujeta las notas.'],
  [/coraz|amor|pareja|valent/, '❤️', 'Un detalle para alguien especial.'],
  [/.*/, '✨', 'Hecho bajo pedido, en el color que elijas.']
];
const sinTilde = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// el nombre, limpio: sin dobles espacios, sin TODO EN MAYÚSCULAS ni todo en minúsculas, con sus tildes de siempre
const TILDES = { arbol: 'árbol', trio: 'trío', organizacion: 'organización', decoracion: 'decoración', jardin: 'jardín', corazon: 'corazón', raton: 'ratón', camion: 'camión', leon: 'león', dragon: 'dragón', angel: 'ángel', lampara: 'lámpara', iman: 'imán', imanes: 'imanes', mini: 'mini', bano: 'baño', cafe: 'café', telefono: 'teléfono', movil: 'móvil', unicornio: 'unicornio' };
export function limpiaNombre(n) {
  let s = String(n || '').replace(/\s+/g, ' ').trim(); if (!s) return s;
  const letras = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  if (letras && (letras === letras.toUpperCase() || letras === letras.toLowerCase())) s = s.toLowerCase();
  s = s.split(' ').map(w => { const k = sinTilde(w); return TILDES[k] && w.toLowerCase() === k ? TILDES[k] : w; }).join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// un texto suyo largo, acortado por una frase ENTERA (nunca a media palabra); sin los datos del final (los pone el programa)
const DATOS_RE = /^\s*(?:🎨|📐|🧵|📏|🧩)\s*.*$/gmu;
export function acorta(t, max = 200) {
  const s = String(t || '').replace(DATOS_RE, '').replace(/\*\*/g, '').replace(/\n{2,}/g, '\n').trim(); if (s.length <= max) return s;
  // (por frases: se corta DESPUÉS de . ! ? o de un salto de línea; los «¿» y «¡» de dentro no cortan nada)
  const frases = s.split(/\n+/).flatMap(l => l.split(/(?<=[.!?…])\s+/)).map(f => f.trim()).filter(Boolean); let out = '';
  for (const f of frases) { const x = (out ? out + ' ' : '') + f; if (x.length > max) break; out = x; }
  return out || s.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

// ---------- los DATOS del final (de la ficha web o del producto: no se inventa nada) ----------
const web = p => (p && p.web && typeof p.web === 'object' ? p.web : {});
const car = (p, k) => { const c = (web(p).caracteristicas || []).find(x => x && new RegExp('^' + k, 'i').test(x[0])); return c ? String(c[1] || '').trim() : ''; };
export function coloresDe(p) {
  const v = (web(p).variantes || []).find(x => x && /^colou?r/i.test(x.nombre)); let L = v ? v.valores : String(p.color || '').split(/\s*[,/;]\s*/);
  return (L || []).map(x => String(x).trim()).filter(Boolean);
}
export function medidasDe(p) {
  const t = car(p, 'medida') || p.tamano || (p.dimX && p.dimY ? [p.dimX, p.dimY, p.dimZ].filter(Boolean).map(x => Math.round(x / 10 * 10) / 10).join(' × ') + ' cm' : '');
  if (!t) return '';
  const nums = (String(t).match(/\d+(?:[.,]\d+)?/g) || []).slice(0, 3); if (!nums.length) return '';
  const ud = /\bmm\b/i.test(t) ? 'mm' : 'cm'; // (sin unidad escrita: son cm; un objeto de decoración de 11 × 5 × 10 mm no existe)
  return nums.map(x => x.replace('.', ',')).join(' × ') + ' ' + ud;
}
export function pieDatos(p, conMedidas = true) {
  const L = [], m = conMedidas ? medidasDe(p) : '', mat = car(p, 'material') || p.material || '';
  if (m || mat) L.push([m ? '📐 ' + m : '', mat ? '🧵 ' + mat : ''].filter(Boolean).join(' · '));
  const col = coloresDe(p);
  if (col.length) L.push('🎨 ' + (col.length === 1 && /\p{Extended_Pictographic}/u.test(col[0]) ? col[0] : col.map(c => (/\p{Extended_Pictographic}/u.test(c) ? c : circuloDe(c) + ' ' + c.charAt(0).toUpperCase() + c.slice(1))).join(' · ')));
  return L.join('\n');
}

// ---------- la PROPUESTA de cada producto ----------
export function propuesta(p) {
  const P = PACK[p.id], pie = pieDatos(p, !(P && P.sinMedidas));
  if (P) return { titulo: P.titulo, texto: P.texto, pie, seoT: P.seoT, seoD: P.seoD, origen: 'Escrita mirando su foto', aviso: P.sinMedidas || '' };
  const titulo = limpiaNombre(p.nombre), suyo = String(web(p).descripcion || p.descripcion || '').trim();
  const k = sinTilde(titulo + ' ' + (p.categoria || '')), [, emo, frase] = TIPOS.find(([re]) => re.test(k));
  let texto = '', origen = '';
  if (suyo && acorta(suyo).length >= 25) { texto = acorta(suyo); origen = suyo.replace(DATOS_RE, '').trim().length > texto.length + 2 ? 'Tu texto, acortado' : 'Tu texto'; }
  const n = coloresDe(p).length;
  if (!texto) { texto = frase.replace(/\.$/, '') + ' ' + emo + (n > 1 ? '\nEn ' + n + ' colores.' : ''); origen = 'De la casa (retócala si quieres)'; }
  return { titulo, texto, pie, seoT: titulo.slice(0, 70), seoD: (texto.split('\n')[0].replace(/\p{Extended_Pictographic}/gu, '').trim() + (n > 1 ? ' En ' + n + ' colores.' : '') + ' Bajo pedido.').slice(0, 160), origen, aviso: '' };
}
export const completo = x => [String(x.texto || '').trim(), String(x.pie || '').trim()].filter(Boolean).join('\n\n');

// ---------- la PANTALLA (Tienda web → ✍️ Descripciones) ----------
export function panel(b) {
  const lista = (S.t.productos || []).filter(p => !/archiv|borrad/i.test(String(p.estado || ''))).slice()
    .sort((a, c) => (!!web(c).publicado - !!web(a).publicado) || (!!PACK[c.id] - !!PACK[a.id]) || String(a.nombre).localeCompare(String(c.nombre)));
  const items = lista.map(p => ({ p, x: propuesta(p), usar: true, est: null }));
  const enWeb = items.filter(i => web(i.p).publicado).length;
  const res = h('div.dv-res'), cab = h('div.dv-cab'), cuerpo = h('div.dv-lista');
  const pinta = () => {
    const n = items.filter(i => i.usar).length, nw = items.filter(i => i.usar && web(i.p).publicado).length;
    mount(cab, h('div.grow', h('b', '✍️ ' + items.length + ' productos · ' + enWeb + ' en la web'), h('p.small.muted', 'Título corto, dos líneas con uno o dos emojis y, debajo, sus datos (medidas, colores y material, que pone el programa). Retoca lo que quieras: lo que escribas aquí es lo que se guarda.')),
      btn('✅ Aplicar a ' + n + (nw ? ' y publicar ' + nw + ' en la web' : ''), aplicar, { cls: 'primary dv-aplicar', disabled: !n }));
  };
  const fila = it => {
    const p = it.p, x = it.x, w = web(p), foto = filesOf('productos', p.id).filter(a => a.tipo === 'foto').sort((a, c) => (c.id === p.fotoId) - (a.id === p.fotoId))[0];
    const img = h('div.dv-foto'); if (foto) Promise.resolve(previewUrl(foto)).then(u => { if (u) mount(img, h('img', { src: u, alt: '', loading: 'lazy' })); }).catch(() => { });
    const tit = inp({ value: x.titulo, maxlength: 60, 'aria-label': 'Título', oninput: e => { x.titulo = e.target.value; } });
    const tx = area({ rows: 3, value: x.texto, 'aria-label': 'Descripción', oninput: e => { x.texto = e.target.value; cuenta(); } });
    const st = inp({ value: x.seoT, maxlength: 70, 'aria-label': 'Título para Google', oninput: e => { x.seoT = e.target.value; } }), sd = area({ rows: 2, maxlength: 160, value: x.seoD, 'aria-label': 'Frase para Google', oninput: e => { x.seoD = e.target.value; } });
    const cnt = h('small.muted'), cuenta = () => { cnt.textContent = x.texto.length + ' letras' + (x.texto.length > 220 ? ' · ⚠️ largo: mejor menos de 200' : ''); }; cuenta();
    const chk = h('input', { type: 'checkbox', checked: it.usar, onchange: e => { it.usar = e.target.checked; el.classList.toggle('off', !it.usar); pinta(); } });
    const el = h('div.dv-it' + (it.usar ? '' : '.off'), { 'data-id': p.id }, img,
      h('div.dv-campos', h('div.row.wrap', h('label.check.small', chk, 'Usar'), h('span.tiny.muted', p.id + ' · antes: «' + p.nombre + '»'), w.publicado ? h('span.pill.ok.tiny', '🟢 en la web') : h('span.pill.tiny', 'no está en la web'), h('span.tiny.dv-origen', x.origen)),
        tit, tx, cnt, x.pie ? h('pre.dv-pie.small', x.pie) : null, x.aviso ? h('p.small.warn-t', '⚠️ ' + x.aviso) : null,
        h('details.dv-seo', h('summary.small', '🔎 Para Google (no se ve en la ficha)'), st, sd), it.est ? h('p.small.dv-est', it.est) : null));
    it.el = el; return el;
  };
  async function aplicar() {
    const L = items.filter(i => i.usar); if (!L.length) return;
    const bt = cab.querySelector('.dv-aplicar'); if (bt) bt.disabled = true;
    let bien = 0, pub = 0; const malos = [], sinWeb = [];
    const { webPhoto } = await import('./views/tienda.js');
    for (const it of L) {
      const p = it.p, x = it.x, marca = t => { it.est = t; const viejo = it.el; const nuevo = fila(it); viejo.replaceWith(nuevo); };
      try {
        marca('⏳ Guardando…');
        const titulo = String(x.titulo || '').replace(/\s+/g, ' ').trim(), desc = completo(x);
        if (!titulo) throw new Error('Le falta el título.');
        const datos = {}; if (titulo !== p.nombre) datos.nombre = titulo; if (desc !== String(p.descripcion || '')) datos.descripcion = desc;
        if (Object.keys(datos).length) await api('productos.guardar', { id: p.id, datos }, { timeout: 60000 });
        bien++;
        const w = web(p);
        if (!w.publicado) { sinWeb.push(titulo); marca('✅ Guardado en el programa (no está en la web)'); continue; }
        if (!can('tienda.gestionar')) { marca('✅ Guardado · para publicar hace falta el permiso «Gestionar la tienda web»'); continue; }
        marca('⏳ Publicando en la web (sus fotos de siempre)…');
        const fotos = filesOf('productos', p.id).filter(a => a.tipo === 'foto');
        let eleg = (w.fotos || []).filter(id => fotos.some(a => a.id === id)); if (!eleg.length) eleg = fotos.map(a => a.id).slice(0, 8);
        if (!eleg.length) throw new Error('Guardado, pero no tiene fotos para la web: publícalo desde su ficha.');
        const ph = []; for (const id of eleg.slice(0, 10)) ph.push(await webPhoto(await fetchFile(fotos.find(a => a.id === id))));
        const yaAcepto = !!(w.margen && w.margen.estado && w.margen.estado !== 'ok'); // (ya lo publicó así antes: su margen ya lo aceptó ella)
        const datosWeb = Object.assign({}, w, { descripcion: desc, seoTitulo: String(x.seoT || '').slice(0, 70), seoDesc: String(x.seoD || '').slice(0, 170) });
        await api('tienda.publicar', { productoId: p.id, web: datosWeb, fotos: ph, archivos: eleg.slice(0, 10), confirmarMargen: yaAcepto }, { timeout: 180000 });
        pub++; marca('🌐 Guardado y publicado en la web');
      } catch (e) { const m = e && e.code === 'MARGEN' ? 'su margen ha cambiado desde que lo publicaste: publícalo desde su ficha (te lo enseña)' : (e && e.message) || String(e); malos.push(p.nombre + ': ' + m); marca('⛔ ' + m); }
    }
    try { await pull(); } catch (e) { }
    mount(res, h('div.card.col', h('b', '✍️ Hecho: ' + bien + ' guardado' + (bien === 1 ? '' : 's') + ' en el programa · ' + pub + ' publicado' + (pub === 1 ? '' : 's') + ' en la web'),
      sinWeb.length ? h('p.small', 'No están en la web (no se publican solos: elige fotos y precio en su ficha → Tienda web): ' + sinWeb.join(', ') + '.') : null,
      malos.length ? h('div', malos.map(m => h('p.small.bad-t', '⛔ ' + m))) : null));
    toast(malos.length ? '⚠️ ' + malos.length + ' no se pudieron hacer (mira abajo)' : '✅ Descripciones guardadas' + (pub ? ' y ' + pub + ' publicadas en la web' : ''), malos.length ? 'warn' : 'ok', 8000);
    if (bt) bt.disabled = false; window.__descVenta = { bien, pub, malos, sinWeb };
  }
  pinta(); mount(cuerpo, items.map(fila));
  b.append(h('div.card.col.dv', cab, res, cuerpo));
  window.__descVentaItems = items;
}
