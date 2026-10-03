// ================= v13 · Estantería: tu tienda web como un mundo virtual =================
// Los productos que YA están subidos a la tienda web (publicados de verdad), colocados en estanterías, como en una tienda:
//   · cada estantería es una categoría; cada producto está en su balda con su foto y su precio
//   · caminas por el pasillo con las flechas, arrastrando o con el dedo; al pasar, las estanterías se giran hacia ti (3D con CSS, sin WebGL: va fluido en cualquier PC)
//   · 🧊 si tiene vista 3D en la web · «Agotado» / «Quedan N» salen del stock REAL (solo si controlas su stock)
//   · pulsas un producto y se abre su ficha. Nada inventado: si no hay foto, se ve el hueco con su nombre.
import { h, mount, btn, empty, eur, icon } from '../ui.js';
import { S, byId, on } from '../store.js';
import { go } from '../app.js';
import { filesOf } from '../files.js';

const CL = window.CL;
const POR_BALDA = 3, BALDAS = 3;
const pretty = s => String(s || '').replace(/^\d+_/, '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()).trim();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Foto del producto (la miniatura que ya guarda el programa); null si no hay ninguna
export function fotoDe(p) {
  const ids = ((p.web && p.web.fotos) || []).concat(p.fotoId ? [p.fotoId] : []);
  for (const id of ids) { const a = byId('archivos', id); if (a && a.miniatura) return a.miniatura; }
  try { const a = filesOf('productos', p.id).find(x => x.miniatura); return a ? a.miniatura : null; } catch (e) { return null; }
}

// Productos publicados en la tienda web, con lo que hace falta para colocarlos (puro: se prueba sin pantalla)
export function productosEnTienda(productos, nivel) {
  return (productos || []).filter(p => p && p.web && p.web.publicado).map(p => {
    const lv = nivel ? nivel(p.nombre) : null;
    const precio = Number(p.web.precio) || Number(p.precio) || 0;
    return {
      id: p.id, nombre: p.nombre || '(sin nombre)', categoria: pretty(p.subcategoria || p.categoria) || 'Sin categoría', precio,
      tiene3d: !!p.web.modelo, publicadoEn: p.web.publicadoEn || '',
      agotado: !!(lv && lv.controlado && lv.disponible <= 0), quedan: lv && lv.controlado && lv.bajo && lv.disponible > 0 ? lv.disponible : 0, p
    };
  });
}

// Reparte por estanterías: una por categoría (si hay más de 9, otra igual a continuación)
export function colocar(items) {
  const cats = {}; items.forEach(x => { (cats[x.categoria] = cats[x.categoria] || []).push(x); });
  const orden = Object.keys(cats).sort((a, b) => cats[b].length - cats[a].length || a.localeCompare(b, 'es'));
  const units = [];
  orden.forEach(c => {
    const l = cats[c].slice().sort((a, b) => String(b.publicadoEn).localeCompare(String(a.publicadoEn)) || a.nombre.localeCompare(b.nombre, 'es'));
    const por = POR_BALDA * BALDAS;
    for (let i = 0; i < l.length; i += por) {
      const trozo = l.slice(i, i + por), baldas = [];
      for (let j = 0; j < trozo.length; j += POR_BALDA) baldas.push(trozo.slice(j, j + POR_BALDA));
      units.push({ categoria: c, parte: Math.floor(i / por) + 1, total: Math.ceil(l.length / por), baldas, n: l.length });
    }
  });
  return units;
}

export function render(el) {
  const reducido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const calcular = () => {
    let nivel = null;
    try { const L = CL.stockLevels({ productos: S.t.productos, stock: S.t.stock, fabricacion: S.t.fabricacion || [], pedidos: S.t.pedidos }, S.cfg.pedidos); nivel = n => L.of(n); } catch (e) { }
    return productosEnTienda(S.t.productos, nivel);
  };
  let todos = calcular();
  const shopUrl = (S.cfg && S.cfg.tienda && S.cfg.tienda.url) || '';
  const wrap = h('div.est');
  const head = h('div.page-head', h('h1', '🏬 Estantería'), h('span.muted.tiny', 'Tu tienda web, como si entraras en ella'));
  el.append(head, wrap);

  if (!todos.length) {
    wrap.append(h('div.card', empty('store', 'Todavía no hay productos en la tienda web', 'Cuando publiques un producto en la tienda web, aparecerá aquí en su estantería, con su foto y su precio.',
      S.t.productos.length ? btn('Ir a Tienda web', () => go('tienda'), { cls: 'primary', icon: 'store' }) : btn('Crear un producto', () => go('productos/nuevo'), { cls: 'primary', icon: 'plus' }))));
    return {};
  }

  let q = '';
  const chips = h('div.seg.est-chips'), info = h('div.est-info'), search = h('input.est-q', { type: 'search', placeholder: 'Buscar en la tienda…', 'aria-label': 'Buscar productos en la estantería', oninput: e => { q = e.target.value.trim().toLowerCase(); dibujar(); } });
  const wall = h('div.est-wall'), floor = h('div.est-floor'), lamps = h('div.est-lamps');
  const row = h('div.est-row'), track = h('div.est-track', { tabindex: '0', role: 'region', 'aria-label': 'Estanterías de la tienda. Usa las flechas del teclado, arrastra o desliza para caminar por el pasillo.' }, row);
  const prev = h('button.est-go.izq', { type: 'button', 'aria-label': 'Caminar a la izquierda', onclick: () => andar(-1) }, '‹'), next = h('button.est-go.der', { type: 'button', 'aria-label': 'Caminar a la derecha', onclick: () => andar(1) }, '›');
  const stage = h('div.est-stage', wall, lamps, track, floor, prev, next);
  const bar = h('div.row.wrap.est-bar', search, h('div.grow'),
    shopUrl ? h('a.btn.ghost', { href: shopUrl, target: '_blank', rel: 'noopener' }, icon('external', 's'), h('span', ' Abrir la tienda web')) : null,
    btn('⛶ Pantalla completa', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => { }); }, { cls: 'ghost' }));
  wrap.append(bar, chips, stage, info);

  const andar = d => { const w = Math.max(240, track.clientWidth * 0.8); track.scrollBy({ left: d * w, behavior: reducido ? 'auto' : 'smooth' }); };

  function producto(x) {
    const foto = fotoDe(x.p);
    const det = [x.nombre, x.precio ? eur(x.precio) : '', x.tiene3d ? 'con vista 3D' : '', x.agotado ? 'agotado' : x.quedan ? 'quedan ' + x.quedan : ''].filter(Boolean).join(' · ');
    return h('button.est-prod' + (x.agotado ? '.agotado' : ''), { type: 'button', title: det, 'aria-label': det + '. Abrir la ficha.', 'data-id': x.id, onclick: () => go('productos/' + x.id) },
      h('span.est-ph', foto ? h('img', { src: foto, alt: '', loading: 'lazy', draggable: 'false' }) : h('span.est-sin', x.nombre.slice(0, 1).toUpperCase())),
      x.tiene3d ? h('span.est-b3', { title: 'Tiene vista 3D en la web' }, '🧊 3D') : null,
      x.agotado ? h('span.est-ag', 'Agotado') : x.quedan ? h('span.est-ag.poco', 'Quedan ' + x.quedan) : null,
      h('span.est-nom', x.nombre), h('span.est-pre', x.precio ? eur(x.precio) : '—'));
  }
  function unidad(u, i) {
    return h('section.est-unit', { 'data-cat': u.categoria, 'aria-label': 'Estantería ' + u.categoria },
      h('div.est-sign', u.categoria, u.total > 1 ? h('small', ' ' + u.parte + '/' + u.total) : null),
      h('div.est-body', u.baldas.map(b => h('div.est-balda', h('div.est-items', b.map(producto)), h('div.est-board')))));
  }

  let units = [], visibles = [];
  function dibujar() {
    const n3d = todos.filter(x => x.tiene3d).length, nAg = todos.filter(x => x.agotado).length;
    visibles = todos.filter(x => !q || (x.nombre + ' ' + x.categoria).toLowerCase().includes(q));
    units = colocar(visibles);
    const cats = []; units.forEach(u => { if (!cats.includes(u.categoria)) cats.push(u.categoria); });
    mount(row, units.length ? units.map(unidad) : h('div.est-nada', 'Ningún producto coincide con «' + q + '».'));
    mount(chips, cats.map(c => h('button', { onclick: () => { const u = row.querySelector('.est-unit[data-cat="' + (window.CSS && CSS.escape ? CSS.escape(c) : c) + '"]'); if (u) track.scrollTo({ left: u.offsetLeft - 24, behavior: reducido ? 'auto' : 'smooth' }); } }, c + ' ' + visibles.filter(x => x.categoria === c).length)));
    mount(info, h('span', h('b', visibles.length), visibles.length === 1 ? ' producto en la tienda web' : ' productos en la tienda web'), ' · ', h('span', h('b', units.length), units.length === 1 ? ' estantería' : ' estanterías'),
      n3d ? h('span', ' · 🧊 ', h('b', n3d), ' con vista 3D') : null, nAg ? h('span', ' · ', h('b', nAg), nAg === 1 ? ' agotado' : ' agotados') : null);
    pasear();
  }

  // Al caminar, cada estantería se gira hacia ti según lo lejos que esté del centro (perspectiva real con CSS) y el fondo se mueve más despacio (profundidad)
  let raf = 0;
  function pasear() {
    raf = 0;
    const w = track.clientWidth || 1, c = track.scrollLeft + w / 2;
    row.querySelectorAll('.est-unit').forEach(u => {
      const off = (u.offsetLeft + u.offsetWidth / 2 - c) / w;
      u.style.setProperty('--ry', reducido ? '0deg' : clamp(-off * 15, -24, 24).toFixed(2) + 'deg');
      u.style.setProperty('--tz', reducido ? '0px' : (-Math.min(1.4, Math.abs(off)) * 70).toFixed(1) + 'px');
    });
    stage.style.setProperty('--sh', stage.clientHeight + 'px'); // las estanterías se ajustan a la altura disponible (nunca se salen por arriba)
    stage.style.setProperty('--sx', (-track.scrollLeft * 0.22).toFixed(1) + 'px');
    prev.classList.toggle('off', track.scrollLeft < 8); next.classList.toggle('off', track.scrollLeft > track.scrollWidth - w - 8);
  }
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pasear); };
  track.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); andar(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); andar(-1); } else if (e.key === 'Home') track.scrollTo({ left: 0 }); else if (e.key === 'End') track.scrollTo({ left: track.scrollWidth }); });
  // arrastrar con el ratón (con el dedo ya se desliza solo); un clic sin arrastrar abre el producto
  let dr = null, movido = 0;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; dr = { x: e.clientX, l: track.scrollLeft }; movido = 0; });
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
  function onMove(e) { if (!dr) return; const d = e.clientX - dr.x; movido = Math.max(movido, Math.abs(d)); if (movido > 6) { track.classList.add('arrastrando'); track.scrollLeft = dr.l - d; } }
  function onUp() { dr = null; track.classList.remove('arrastrando'); }
  track.addEventListener('click', e => { if (movido > 6) { e.preventDefault(); e.stopPropagation(); movido = 0; } }, true);
  // el cielo del escaparate sigue al ratón un poco (solo en pantallas con ratón y sin «reducir movimiento»)
  if (!reducido) stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = stage.getBoundingClientRect(); stage.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3)); });

  dibujar();
  // si cambia algo (se publica o se agota un producto) la estantería se rehace sola
  const firma = () => S.t.productos.map(p => p.id + (p.web && p.web.publicado ? '1' : '0') + ((p.web && p.web.precio) || p.precio || '')).join('|') + ':' + (S.meta.productos && S.meta.productos.hash) + ':' + (S.meta.pedidos && S.meta.pedidos.hash) + ':' + (S.meta.archivos && S.meta.archivos.hash);
  let f0 = firma();
  const off = on(() => { const f = firma(); if (f === f0) return; f0 = f; todos = calcular(); if (todos.length) dibujar(); else go('estanteria'); });
  window.__estanteria = { productos: () => visibles.map(x => ({ id: x.id, nombre: x.nombre, categoria: x.categoria, tiene3d: x.tiene3d, agotado: x.agotado, quedan: x.quedan })), estanterias: () => units.map(u => ({ categoria: u.categoria, baldas: u.baldas.length, n: u.baldas.reduce((a, b) => a + b.length, 0) })) };
  return { destroy() { off(); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); window.removeEventListener('resize', pedir); if (raf) cancelAnimationFrame(raf); delete window.__estanteria; } };
}
