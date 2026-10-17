// ================= 👗 CelebriDREW · EDITOR 2D del patrón (SVG, en milímetros) =================
// La mesa es un pliego en mm (Y hacia abajo); cada pieza se dibuja con sus coordenadas (Y hacia arriba) dentro de un grupo
// «translate(ox, oy) scale(1, −1)»: lo que se ve son las medidas de verdad. Herramientas (ctx.modo):
//   elegir  · tocar una pieza la elige; arrastrarla la mueve por la mesa (no cambia su forma); arrastrar un PUNTO o un TIRADOR de curva
//             la cambia (al soltar se apunta como edición: sobrevive a cambiar las medidas)
//   anadir  · tocar un borde de la pieza elegida pone un punto ahí        · quitar · tocar un punto lo quita
//   curva   · tocar un tramo lo pasa de recta a curva (y al revés)        · medir  · dos toques: la distancia en cm
//   piquete · (16-10) tocar un borde pone un PIQUETE ahí y su PAREJA en el borde con el que se cose (en su sitio proporcional, como los
//             casa la validación); tocar uno que ya está lo quita (con su pareja). En el doblez no se ponen.
// Al arrastrar un punto: Mayús = solo en horizontal o en vertical (recto); con el IMÁN (ctx.iman) cae en la cuadrícula de 5 mm.
// La rueda acerca y aleja; arrastrar el fondo mueve la vista. Mientras se arrastra un punto se ven los largos de sus dos tramos.
// 17-10 · iPad («va mal en la tablet»): DOS DEDOS = pellizcar para acercar/alejar y arrastrar para mover la vista; en pantallas táctiles los
// puntos, tiradores y bordes se cogen desde 22 px; las herramientas de tocar actúan al LEVANTAR el dedo (sin arrastrar). ctx.cotas = el
// largo de CADA borde escrito en la pieza («📐 Medidas»). zoom(k) / encuadraPieza(nombre) para los botones.
import * as G from './geom.js';
import * as Z from './pieza.js';
import { lineaCorte } from './margen.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}, ...k) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([x, v]) => { if (v != null) e.setAttribute(x, v); }); k.forEach(c => c && e.appendChild(c)); return e; };
const camino = (P, cerrado = true) => P.length ? 'M' + P.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + (cerrado ? 'Z' : '') : '';
// el largo desde el principio de una polilínea hasta el punto de ella más cercano a p
const largoHasta = (L, p) => { let mejor = { d: Infinity, s: 0 }, acc = 0; for (let i = 1; i < L.length; i++) { const r = G.distAPolilinea(p, [L[i - 1], L[i]]); if (r.d < mejor.d) mejor = { d: r.d, s: acc + G.dist(L[i - 1], r.p) }; acc += G.dist(L[i - 1], L[i]); } return mejor.s; };
// la PAREJA de un piquete en el borde con el que se cose (la misma cuenta que valida.js para ver si casan) → [{ pieza (nombre), borde, d }]
export function piquetePar(prenda, pz, bid, d, quitar) {
  const out = []; (prenda.costuras || []).forEach(c => { if (c.tipo === 'espejo' || (c.a.pieza === c.b.pieza && c.a.borde === c.b.borde)) return;
    const lado = c.a.pieza === pz.id && c.a.borde === bid ? 'a' : c.b.pieza === pz.id && c.b.borde === bid ? 'b' : null; if (!lado) return;
    const pa = prenda.piezas.find(p => p.id === c.a.pieza), pb = prenda.piezas.find(p => p.id === c.b.pieza); if (!pa || !pb) return;
    const La = Z.bordeLargo(pa, c.a.borde), Lb = Z.bordeLargo(pb, c.b.borde), ratio = c.ratio || 1; let otra, ob, od;
    if (lado === 'a') { const s2 = (c.a.inv ? La - d : d) * ratio; od = c.b.inv ? Lb - s2 : s2; otra = pb; ob = c.b.borde; } else { const s2 = (c.b.inv ? Lb - d : d) / ratio; od = c.a.inv ? La - s2 : s2; otra = pa; ob = c.a.borde; }
    if (quitar) { const q = otra.piquetes.filter(x => x.borde === ob).sort((u, v) => Math.abs(u.d - od) - Math.abs(v.d - od))[0]; if (q && Math.abs(q.d - od) < 4) out.push({ pieza: otra.nombre, borde: ob, d: q.d }); }
    else if (od >= 0 && od <= Z.bordeLargo(otra, ob)) out.push({ pieza: otra.nombre, borde: ob, d: Math.round(od * 10) / 10 }); });
  return out;
}
const tramoD = g => g.c1 ? `M${g.a[0]} ${g.a[1]}C${g.c1[0]} ${g.c1[1]} ${g.c2[0]} ${g.c2[1]} ${g.b[0]} ${g.b[1]}` : `M${g.a[0]} ${g.a[1]}L${g.b[0]} ${g.b[1]}`;

const tactil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
export function editor2d(cont, ctx) {
  const svg = el('svg', { class: 'dw-svg', role: 'application', 'aria-label': 'Patrón en 2D: piezas a tamaño real' }), capa = el('g'), sobre = el('g', { class: 'dw-sobre' });
  svg.append(el('defs', {}, el('pattern', { id: 'dwcuad', width: 10, height: 10, patternUnits: 'userSpaceOnUse' }, el('path', { d: 'M10 0L0 0 0 10', class: 'dw-cuad' }))), el('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: 'url(#dwcuad)', class: 'dw-fondo' }), capa, sobre);
  cont.appendChild(svg);
  let vb = { x: -50, y: -50, w: 1600, h: 1000 }, arr = null, medida = [];
  const ponVB = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const aMesa = ev => { const r = svg.getBoundingClientRect(); return [vb.x + (ev.clientX - r.left) / r.width * vb.w, vb.y + (ev.clientY - r.top) / r.height * vb.h]; };
  const esc = () => vb.w / Math.max(1, svg.getBoundingClientRect().width); // mm por píxel de pantalla
  const disp = pz => { const d = ctx.disp[pz.nombre]; return d || [0, 0]; };
  const aPieza = (pz, m) => { const [ox, oy] = disp(pz); return [m[0] - ox, oy - m[1]]; };
  function encuadra(soloNombre) { const P = ctx.prenda; if (!P || !P.piezas.length) return; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    P.piezas.filter(pz => !soloNombre || pz.nombre === soloNombre).forEach(pz => { const [ox, oy] = disp(pz), b = Z.caja(pz); x0 = Math.min(x0, ox + b.x0 - 20); x1 = Math.max(x1, ox + b.x1 + 20); y0 = Math.min(y0, oy - b.y1 - 20); y1 = Math.max(y1, oy - b.y0 + 20); });
    const r = svg.getBoundingClientRect(), asp = (r.height || 600) / (r.width || 900), w = Math.max(x1 - x0, (y1 - y0) / asp), hh = w * asp; vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - hh / 2, w, h: hh }; ponVB(); pinta(); } /* (17-10: centrado; antes quedaba pegado arriba con hueco debajo) */
  function pinta() {
    while (capa.firstChild) capa.removeChild(capa.firstChild); while (sobre.firstChild) sobre.removeChild(sobre.firstChild);
    const P = ctx.prenda; if (!P) return; const s = esc(), sel = ctx.sel || {}, T = tactil(); /* (con el dedo, todo se coge desde más lejos) */
    P.piezas.slice().sort((a, b) => (a.id === sel.pieza) - (b.id === sel.pieza)).forEach(pz => { // (16-10: la ELEGIDA la última = encima: si se solapa con otra, sus puntos se pueden tocar)
      const [ox, oy] = disp(pz), elegida = sel.pieza === pz.id, g = el('g', { transform: `translate(${ox} ${oy}) scale(1 -1)`, class: 'dw-pieza' + (elegida ? ' on' : ''), 'data-pieza': pz.id });
      let corte = []; try { corte = lineaCorte(pz); } catch (e) { }
      const est = (ctx.estadoPieza && ctx.estadoPieza(pz.id)) || 'ok';
      g.append(el('path', { d: camino(corte), class: 'dw-corte ' + est, 'data-pieza': pz.id, 'data-que': 'pieza' }), el('path', { d: camino(Z.contorno(pz)), class: 'dw-costura', 'pointer-events': 'none' }));
      pz.internas.forEach(i => { if (i.tipo === 'boton') g.append(el('circle', { cx: i.pts[0][0], cy: i.pts[0][1], r: 4, class: 'dw-int' })); else g.append(el('path', { d: camino(i.pts, false), class: 'dw-int ' + i.tipo, 'pointer-events': 'none' })); });
      pz.piquetes.forEach(q => { const Q = Z.piqueteEn(pz, q); if (!Q) return; const m = Z.margenDe(pz, q.borde) || 5; [((q.n || 1) === 2 ? [-1.5, 1.5] : [0])].flat().forEach(o => { const b = G.suma(Q.p, G.esc(Q.tg, o)); g.append(el('path', { d: camino([G.suma(b, G.esc(Q.fuera, m)), G.suma(b, G.esc(Q.fuera, Math.max(0, m - 6)))], false), class: 'dw-piq' })); }); });
      if (pz.corte.doblez) { const L = Z.bordePolilinea(pz, pz.corte.doblez); g.append(el('path', { d: camino(L, false), class: 'dw-dob', 'pointer-events': 'none' })); }
      // los bordes (para elegirlos) y, en la elegida, sus tramos, puntos y tiradores
      pz.bordes.forEach(B => { const L = Z.bordePolilinea(pz, B.id); g.append(el('path', { d: camino(L, false), class: 'dw-borde' + (sel.borde === B.id && elegida ? ' on' : '') + ' t-' + B.tipo, 'data-pieza': pz.id, 'data-borde': B.id, 'data-que': 'borde', 'stroke-width': Math.max(1.5, (T ? 18 : 7) * s) })); });
      if (elegida) {
        pz.contorno.forEach(t => { const gt = Z.tramoGeo(pz, t); g.append(el('path', { d: tramoD(gt), class: 'dw-tramo' + (sel.tramo === t.id ? ' on' : ''), 'data-pieza': pz.id, 'data-tramo': t.id, 'data-que': 'tramo', 'stroke-width': Math.max(1.5, (T ? 18 : 9) * s) }));
          if (gt.c1) [['c1', gt.a, gt.c1], ['c2', gt.b, gt.c2]].forEach(([k, an, c]) => { g.append(el('line', { x1: an[0], y1: an[1], x2: c[0], y2: c[1], class: 'dw-tir-l' }), el('circle', { cx: c[0], cy: c[1], r: (T ? 22 : 9) * s, class: 'dw-zona', fill: 'rgba(0,0,0,0)', 'pointer-events': 'all', 'data-pieza': pz.id, 'data-tramo': t.id, 'data-k': k, 'data-que': 'tirador' }), el('rect', { x: c[0] - (T ? 5 : 3.2) * s, y: c[1] - (T ? 5 : 3.2) * s, width: (T ? 10 : 6.4) * s, height: (T ? 10 : 6.4) * s, class: 'dw-tir', 'data-pieza': pz.id, 'data-tramo': t.id, 'data-k': k, 'data-que': 'tirador' })); }); });
        Object.entries(pz.puntos).forEach(([id, q]) => g.append(el('circle', { cx: q.x, cy: q.y, r: (T ? 22 : 9) * s, class: 'dw-zona', fill: 'rgba(0,0,0,0)', 'pointer-events': 'all', 'data-pieza': pz.id, 'data-punto': id, 'data-que': 'punto' })));
        Object.entries(pz.puntos).forEach(([id, q]) => g.append(el('circle', { cx: q.x, cy: q.y, r: (T ? 7 : 4.5) * s, class: 'dw-punto' + (sel.punto === id ? ' on' : ''), 'data-pieza': pz.id, 'data-punto': id, 'data-que': 'punto' }, el('title', {}, document.createTextNode(q.n + ' (' + G.cm(q.x) + ', ' + G.cm(q.y) + ') cm')))));
      }
      capa.appendChild(g);
      if (ctx.cotas) { const bb = Z.caja(pz), cx0 = (bb.x0 + bb.x1) / 2, cy0 = (bb.y0 + bb.y1) / 2;
        pz.bordes.forEach(B => { const L = Z.bordePolilinea(pz, B.id); if (!L || L.length < 2) return; let tot = 0; for (let i = 1; i < L.length; i++) tot += G.dist(L[i - 1], L[i]); if (tot < 15) return;
          let acc = 0, pm = L[0], tg = [1, 0]; for (let i = 1; i < L.length; i++) { const d = G.dist(L[i - 1], L[i]); if (d > 0 && acc + d >= tot / 2) { const f = (tot / 2 - acc) / d; pm = [L[i - 1][0] + (L[i][0] - L[i - 1][0]) * f, L[i - 1][1] + (L[i][1] - L[i - 1][1]) * f]; tg = [(L[i][0] - L[i - 1][0]) / d, (L[i][1] - L[i - 1][1]) / d]; break; } acc += d; }
          let n = [-tg[1], tg[0]]; if ((pm[0] - cx0) * n[0] + (pm[1] - cy0) * n[1] > 0) n = [-n[0], -n[1]]; /* (n hacia DENTRO de la pieza: la cifra no pisa la pieza de al lado) */
          const off = 15 * s, ct = el('text', { x: ox + pm[0] + n[0] * off, y: oy - (pm[1] + n[1] * off), class: 'dw-cota' + (elegida ? ' on' : ''), 'font-size': 11.5 * s, 'stroke-width': 3 * s, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' });
          ct.textContent = G.cm(tot, 1) + ' cm'; capa.appendChild(ct); }); }
      const b = Z.caja(pz), t = el('text', { x: ox + (b.x0 + b.x1) / 2, y: oy - (b.y0 + b.y1) / 2, class: 'dw-nombre', 'font-size': Math.max(8, Math.min(28, b.w / 9)) }); t.textContent = pz.nombre + (pz.corte.n > 1 ? ' ×' + pz.corte.n : ''); capa.appendChild(t);
    });
    if (medida.length) { const [a, b] = medida; sobre.append(el('circle', { cx: a[0], cy: a[1], r: 4 * s, class: 'dw-med' })); if (b) { sobre.append(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dw-med' }), el('circle', { cx: b[0], cy: b[1], r: 4 * s, class: 'dw-med' })); const t = el('text', { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 - 8 * s, class: 'dw-medt', 'font-size': 14 * s }); t.textContent = G.cm(G.dist(a, b), 2) + ' cm'; sobre.append(t); } }
    if (arr && arr.etiquetas) arr.etiquetas.forEach(([p, txt]) => { const t = el('text', { x: p[0], y: p[1], class: 'dw-medt', 'font-size': 13 * s }); t.textContent = txt; sobre.append(t); });
  }
  // ---------- ratón, DEDOS y lápiz ----------
  const qué = ev => { const t = ev.target.closest && ev.target.closest('[data-que]'); return t ? Object.assign({}, t.dataset) : null; };
  const dedos = new Map(); let gesto = null;
  const entreDedos = () => { const [a, b] = [...dedos.values()]; return { d: Math.hypot(b[0] - a[0], b[1] - a[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; };
  // lo que se estaba arrastrando vuelve a su sitio (al apoyar el segundo dedo, o si el sistema cancela el toque); la vista se queda donde está
  function deshaz() { const a = arr; arr = null; if (!a) return;
    if (a.tipo === 'punto') Z.ponPunto(a.pz, a.id, a.p0[0], a.p0[1]);
    else if (a.tipo === 'tirador' && a.t0) { const t = Z.tramoPorId(a.pz, a.tramo); if (t) { t.c1 = a.t0.c1; t.c2 = a.t0.c2; } }
    else if (a.tipo === 'pieza') ctx.disp[a.pz.nombre] = a.d0;
    pinta(); }
  // las herramientas de TOCAR: ¿esta herramienta hace algo con lo que hay debajo del dedo?
  const deTocar = (modo, q) => modo === 'medir' || (q && ((modo === 'anadir' && (q.que === 'tramo' || q.que === 'borde')) || (modo === 'quitar' && q.que === 'punto') || (modo === 'piquete' && (q.que === 'tramo' || q.que === 'borde')) || (modo === 'curva' && q.que === 'tramo')));
  function toca({ m, q, pz, modo }) { const P = ctx.prenda;
    if (modo === 'medir') { medida = medida.length === 1 ? [medida[0], m] : [m]; pinta(); if (medida.length === 2 && ctx.alMedir) ctx.alMedir(G.dist(medida[0], medida[1])); return; }
    if (!pz) return;
    if (modo === 'anadir' && (q.que === 'tramo' || q.que === 'borde') && pz) { const p = aPieza(pz, m); let mejor = null;
      pz.contorno.forEach(t => { const g = Z.tramoGeo(pz, t), L = G.cadenaAplana([g], 0.2); const d = G.distAPolilinea(p, L); if (!mejor || d.d < mejor.d) { let s = 0; for (let i = 1; i < L.length; i++) { if (G.distAPolilinea(d.p, [L[i - 1], L[i]]).d < 1e-6) { s += G.dist(L[i - 1], d.p); break; } s += G.dist(L[i - 1], L[i]); } mejor = { d: d.d, t: t.id, s }; } });
      if (mejor) ctx.onEdit({ op: 'partir', pieza: pz.nombre, args: { tramo: mejor.t, s: mejor.s, id: 'u' + Date.now().toString(36), tid: 'v' + Date.now().toString(36) } }, 'Añadir un punto'); return; }
    if (modo === 'quitar' && q.que === 'punto' && pz) { ctx.onEdit({ op: 'quitarPunto', pieza: pz.nombre, args: { punto: q.punto } }, 'Quitar un punto'); return; }
    if (modo === 'piquete' && (q.que === 'tramo' || q.que === 'borde') && pz) { const B = q.que === 'borde' ? Z.bordePorId(pz, q.borde) : Z.bordeDeTramo(pz, q.tramo); if (!B) return;
      if (B.tipo === 'doblez') { if (ctx.aviso) ctx.aviso('En el doblez no se ponen piquetes: la tela no se corta ahí.'); return; }
      const d = largoHasta(Z.bordePolilinea(pz, B.id), aPieza(pz, m)), ya = pz.piquetes.find(x => x.borde === B.id && Math.abs(x.d - d) < Math.max(6, 10 * esc())), pares = piquetePar(P, pz, B.id, ya ? ya.d : d, !!ya);
      if (ya) ctx.onEdit([{ op: 'quitaPiquete', pieza: pz.nombre, args: { borde: B.id, d: ya.d } }].concat(pares.map(x => ({ op: 'quitaPiquete', pieza: x.pieza, args: { borde: x.borde, d: x.d } }))), 'Quitar un piquete' + (pares.length ? ' (y su pareja)' : ''));
      else ctx.onEdit([{ op: 'piquete', pieza: pz.nombre, args: { borde: B.id, d: Math.round(d * 10) / 10 } }].concat(pares.map(x => ({ op: 'piquete', pieza: x.pieza, args: { borde: x.borde, d: x.d } }))), 'Piquete en «' + B.n + '»' + (pares.length ? ' y su pareja en «' + pares.map(x => x.pieza).join('», «') + '»' : ''));
      return; }
    if (modo === 'curva' && q.que === 'tramo' && pz) { const t = Z.tramoPorId(pz, q.tramo); ctx.onEdit({ op: t.c1 ? 'aRecta' : 'aCurva', pieza: pz.nombre, args: { tramo: q.tramo } }, t.c1 ? 'Tramo a recta' : 'Tramo a curva'); return; }
  }
  function down(ev) {
    if (ev.button > 0) return; try { svg.setPointerCapture(ev.pointerId); } catch (e) { }
    dedos.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (dedos.size >= 2) { if (!gesto) { deshaz(); const E = entreDedos(); gesto = { d0: Math.max(20, E.d), c0: E.c, vb0: Object.assign({}, vb) }; } return; }
    if (gesto) return;
    const m = aMesa(ev), q = qué(ev), P = ctx.prenda, pz = q && P && P.piezas.find(p => p.id === q.pieza), modo = ctx.modo || 'elegir';
    if (deTocar(modo, q)) { arr = { tipo: 'toque', m, q, pz, modo, xy: [ev.clientX, ev.clientY], vb0: Object.assign({}, vb) }; return; }
    if (!q) { arr = { tipo: 'vista', m0: [ev.clientX, ev.clientY], vb0: Object.assign({}, vb) }; return; }
    const xy0 = [ev.clientX, ev.clientY], muerto = ev.pointerType === 'mouse' ? 2 : 8; /* (el dedo tiembla: hasta 8 px no se mueve nada; un toque no cambia el patrón) */
    if (q.que === 'punto' && pz) { const pt = pz.puntos[q.punto]; arr = { tipo: 'punto', pz, id: q.punto, m0: m, p0: [pt.x, pt.y], xy0, muerto }; ctx.onSelect({ pieza: pz.id, punto: q.punto }); return; }
    if (q.que === 'tirador' && pz) { const t = Z.tramoPorId(pz, q.tramo); arr = { tipo: 'tirador', xy0, muerto, pz, tramo: q.tramo, k: q.k, m0: m, t0: t ? { c1: t.c1 && t.c1.slice(), c2: t.c2 && t.c2.slice() } : null }; return; }
    if (q.que === 'borde' && pz && ctx.sel && ctx.sel.pieza === pz.id) { ctx.onSelect({ pieza: pz.id, borde: q.borde }); return; }
    if (q.que === 'tramo' && pz) { ctx.onSelect({ pieza: pz.id, tramo: q.tramo, borde: (Z.bordeDeTramo(pz, q.tramo) || {}).id }); return; }
    if (pz) { ctx.onSelect({ pieza: pz.id }); arr = { tipo: 'pieza', pz, m0: m, d0: disp(pz).slice(), xy0, muerto }; }
  }
  function move(ev) {
    if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (gesto) { if (dedos.size < 2) return; const E = entreDedos(), r = svg.getBoundingClientRect(), v0 = gesto.vb0, k = Math.max(40 / v0.w, Math.min(30000 / v0.w, gesto.d0 / Math.max(20, E.d)));
      const mx = v0.x + (gesto.c0[0] - r.left) / r.width * v0.w, my = v0.y + (gesto.c0[1] - r.top) / r.height * v0.h, w = v0.w * k, hh = v0.h * k; /* (lo que estaba bajo los dedos sigue bajo los dedos) */
      vb = { x: mx - (E.c[0] - r.left) / r.width * w, y: my - (E.c[1] - r.top) / r.height * hh, w, h: hh }; ponVB(); pinta(); return; }
    if (!arr) return;
    if (arr.tipo === 'toque') { if (Math.hypot(ev.clientX - arr.xy[0], ev.clientY - arr.xy[1]) < 10) return; arr = { tipo: 'vista', m0: arr.xy, vb0: arr.vb0 }; } /* (si se arrastra, no era un toque: mueve la vista) */
    if (arr.xy0) { if (Math.hypot(ev.clientX - arr.xy0[0], ev.clientY - arr.xy0[1]) < arr.muerto) return; arr.xy0 = null; }
    const m = aMesa(ev);
    if (arr.tipo === 'vista') { const r = svg.getBoundingClientRect(); vb.x = arr.vb0.x - (ev.clientX - arr.m0[0]) / r.width * vb.w; vb.y = arr.vb0.y - (ev.clientY - arr.m0[1]) / r.height * vb.h; ponVB(); return; }
    if (arr.tipo === 'pieza') { ctx.disp[arr.pz.nombre] = [arr.d0[0] + m[0] - arr.m0[0], arr.d0[1] + m[1] - arr.m0[1]]; arr.movido = true; pinta(); return; }
    if (arr.tipo === 'punto') { let dx = m[0] - arr.m0[0], dy = -(m[1] - arr.m0[1]);
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; } // (Mayús: recto)
      if (ctx.iman) { dx = Math.round((arr.p0[0] + dx) / 5) * 5 - arr.p0[0]; dy = Math.round((arr.p0[1] + dy) / 5) * 5 - arr.p0[1]; } // (imán: la cuadrícula de 5 mm de la pieza)
      Z.ponPunto(arr.pz, arr.id, arr.p0[0] + dx, arr.p0[1] + dy); arr.dx = dx; arr.dy = dy;
      const [ox, oy] = disp(arr.pz); arr.etiquetas = arr.pz.contorno.filter(t => t.a === arr.id || t.b === arr.id).map(t => { const g = Z.tramoGeo(arr.pz, t), c = G.tramoPunto(g, 0.5); return [[ox + c[0], oy - c[1]], G.cm(G.tramoLargo(g), 2) + ' cm']; }); pinta(); return; }
    if (arr.tipo === 'tirador') { const p = aPieza(arr.pz, m); if (ctx.iman) { p[0] = Math.round(p[0] / 5) * 5; p[1] = Math.round(p[1] / 5) * 5; } Z.ponTirador(arr.pz, arr.tramo, arr.k, p[0], p[1]); arr.xy = p; pinta(); }
  }
  function up(ev) {
    dedos.delete(ev.pointerId); if (gesto) { if (!dedos.size) gesto = null; return; }
    const a = arr; arr = null; if (!a) return;
    if (a.tipo === 'toque') { toca(a); return; }
    if (a.tipo === 'punto' && (a.dx || a.dy)) { Z.ponPunto(a.pz, a.id, a.p0[0], a.p0[1]); ctx.onEdit({ op: 'muevePunto', pieza: a.pz.nombre, args: { punto: a.id, dx: a.dx, dy: a.dy } }, 'Mover el punto «' + a.pz.puntos[a.id].n + '»'); return; }
    if (a.tipo === 'tirador' && a.xy) { ctx.onEdit({ op: 'ponTirador', pieza: a.pz.nombre, args: { tramo: a.tramo, k: a.k, x: a.xy[0], y: a.xy[1] } }, 'Cambiar una curva'); return; }
    if (a.tipo === 'pieza' && a.movido && ctx.alMoverPieza) ctx.alMoverPieza();
    pinta();
  }
  function rueda(ev) { ev.preventDefault(); const m = aMesa(ev), k = Math.exp(ev.deltaY * 0.0015); vb.x = m[0] - (m[0] - vb.x) * k; vb.y = m[1] - (m[1] - vb.y) * k; vb.w *= k; vb.h *= k; ponVB(); pinta(); }
  // los botones de acercar / alejar (alrededor del centro de la vista)
  function zoom(k) { const r = svg.getBoundingClientRect(), mx = vb.x + vb.w / 2, my = vb.y + vb.h / 2; k = Math.max(40 / vb.w, Math.min(30000 / vb.w, k)); vb = { x: mx - vb.w * k / 2, y: my - vb.h * k / 2, w: vb.w * k, h: vb.h * k }; if (!r.width) return; ponVB(); pinta(); }
  const cancela = ev => { dedos.delete(ev.pointerId); if (gesto) { if (!dedos.size) gesto = null; return; } deshaz(); };
  svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', cancela); svg.addEventListener('wheel', rueda, { passive: false });
  svg.addEventListener('gesturestart', e => e.preventDefault()); /* (Safari: que el pellizco no amplíe la página entera) */
  const ro = new ResizeObserver(() => { const r = svg.getBoundingClientRect(); if (r.width) { vb.h = vb.w * r.height / r.width; ponVB(); } }); ro.observe(svg);
  ponVB();
  return { pinta, encuadra, encuadraPieza: n => encuadra(n), zoom, svg, borraMedida() { medida = []; pinta(); }, get vista() { return Object.assign({}, vb); }, destroy() { ro.disconnect(); svg.remove(); } };
}
