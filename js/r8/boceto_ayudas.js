// ================= 14-10-2026 · 🧲 LAS AYUDAS DEL BOCETO (como en Fusion) =================
// La dueña (14-10-2026): «en studio para trabajar es muy incómodo, las líneas no tienen asistencia para ponerlas exactas, unir dos líneas».
// Al mover el ratón (o el lápiz) por el boceto, el punto se ENGANCHA solo a lo que hay cerca, y se enseña a qué:
//   ■ un punto (esquina, final de línea) · ⊙ un centro · △ la mitad de un lado · ✕ el cruce de dos líneas · ◆ sobre una línea
//   ─ horizontal · │ vertical · ⟂ perpendicular · ∥ paralela a la anterior · 45° · y las líneas de puntos de «alineado con…».
// Con Mayús: ángulos de 15 en 15. Con Ctrl (o Alt): sin ayudas, a pulso. Lo que no engancha a nada cae en la cuadrícula (si está
// puesta) y los largos salen REDONDOS (34 mm, no 34,01).
// Y las LÍNEAS ABIERTAS: una línea ya no se cierra sola al terminarla (como en Fusion). Las que se tocan por sus puntas se UNEN solas
// en una; si la línea vuelve a su primer punto, se cierra y ya es una forma que se puede extruir.
// Todo son cuentas sin pantalla (se prueban con node: test/unit/boceto_ayudas.mjs).

export const TIPOS = { punto: '■ Punto', fin: '■ Final de línea', cerrar: '● Cerrar aquí', centro: '⊙ Centro', mitad: '△ Mitad', cuadrante: '■ Punto del círculo', cruce: '✕ Cruce', sobre: '◆ Sobre la línea', h: '─ Horizontal', v: '│ Vertical', perp: '⟂ Perpendicular', par: '∥ Paralela', ang: '∠', alin: '⋯ Alineado', rejilla: '' };

const num = (v, d = 0) => { const x = Number(v); return isFinite(x) ? x : d; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r2 = x => Math.round(x * 100) / 100;
const gira = (p, ang, c) => { const a = (ang || 0) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return [c[0] + p[0] * cs - p[1] * sn, c[1] + p[0] * sn + p[1] * cs]; };
// lo más cerca de q en el segmento a-b → { p, d, t }
export function cerca(q, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)), p = [a[0] + t * dx, a[1] + t * dy]; return { p, d: dist(p, q), t }; }
// cruce de dos segmentos (con un pelín de margen en las puntas) → punto o null
export function cruza(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den, e = 1e-6;
  return t >= -e && t <= 1 + e && u >= -e && u <= 1 + e ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}
// la recta o + t·u (t > 0) contra el segmento a-b → { p, t } o null
function rayoSeg(o, u, a, b) { const s = [b[0] - a[0], b[1] - a[1]], den = u[0] * s[1] - u[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((a[0] - o[0]) * s[1] - (a[1] - o[1]) * s[0]) / den, w = ((a[0] - o[0]) * u[1] - (a[1] - o[1]) * u[0]) / den; return t > 1e-6 && w >= -1e-6 && w <= 1 + 1e-6 ? { p: [o[0] + t * u[0], o[1] + t * u[1]], t } : null; }
const difAng = (a, b) => { let d = ((a - b) % 360 + 360) % 360; return d > 180 ? 360 - d : d; };

// ---------- lo que hay en el boceto para engancharse: puntos clave (K) y tramos (S) ----------
// F = las formas · contornoDe = el de nucleo.js · ex = { f } (esa forma entera fuera: se está moviendo) o { f, k } (solo su punto k: se
// está arrastrando ese punto, y con él sus dos lados)
export function geometria(F, contornoDe, ex = null) {
  const K = [], S = [];
  F.forEach((f, i) => {
    if (!f || (ex && ex.f === i && ex.k == null)) return;
    const vk = ex && ex.f === i ? ex.k : -1;
    if (f.t === 'linea' || f.t === 'trazo') {
      const P = f.pts || [], n = P.length, abierta = f.t === 'trazo' || !!f.abierta || n < 3, densa = !!f.suave || f.t === 'trazo';
      P.forEach((q, k) => { if (k === vk) return; const punta = abierta && (k === 0 || k === n - 1); if (densa && !punta) return; K.push({ q: [q[0], q[1]], tipo: punta ? 'fin' : 'punto', f: i, k }); });
      const m = abierta ? n - 1 : n;
      for (let k = 0; k < m; k++) { const k2 = (k + 1) % n; if (k === vk || k2 === vk) continue; const a = P[k], b = P[k2]; S.push({ a, b, f: i }); if (!densa) K.push({ q: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], tipo: 'mitad', f: i }); }
      return;
    }
    const c = [num(f.x), num(f.y)];
    K.push({ q: c, tipo: 'centro', f: i });
    if (f.t === 'texto') return;
    const R = contornoDe(f)[0] || [];
    for (let k = 0; k < R.length; k++) S.push({ a: R[k], b: R[(k + 1) % R.length], f: i });
    const esquinas = (f.t === 'rect' && num(f.r) < 0.05) || f.t === 'poligono' || f.t === 'estrella';
    if (esquinas) R.forEach((q, k) => { K.push({ q: [q[0], q[1]], tipo: 'punto', f: i, k }); if (f.t !== 'estrella') { const b = R[(k + 1) % R.length]; K.push({ q: [(q[0] + b[0]) / 2, (q[1] + b[1]) / 2], tipo: 'mitad', f: i }); } });
    if (f.t === 'rect' && num(f.r) >= 0.05) [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([u, v]) => K.push({ q: gira([u * num(f.w) / 2, v * num(f.h) / 2], f.ang, c), tipo: 'mitad', f: i }));
    if (f.t === 'circulo') { const r = num(f.d) / 2; [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([u, v]) => K.push({ q: [c[0] + u * r, c[1] + v * r], tipo: 'cuadrante', f: i })); }
    if (f.t === 'elipse') [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([u, v]) => K.push({ q: gira([u * num(f.w) / 2, v * num(f.h) / 2], f.ang, c), tipo: 'cuadrante', f: i }));
    if (f.t === 'ranura') { const e = Math.max(0, num(f.l) - num(f.w)) / 2; [-1, 1].forEach(s => K.push({ q: gira([s * e, 0], f.ang, c), tipo: 'centro', f: i })); }
  });
  return { K, S };
}

// ---------- ENGANCHAR un punto ----------
// q (mm) · o = { G (de geometria), tol (mm: unos 10 píxeles), paso (cuadrícula en mm, 0 = sin), ayudas (false = solo cuadrícula),
//   libre (Ctrl/Alt: tal cual), desde (el punto anterior de la línea que se dibuja), previo ([a, b]: el lado anterior), propios (los
//   puntos ya puestos de la línea que se dibuja: el primero sirve para CERRAR), mayus (ángulos de 15 en 15) }
// → { q, tipo, ref?, guias: [[a, b]…], angulo? }
export function atrae(q, o = {}) {
  const tol = o.tol || 1, R = (p, tipo, extra) => Object.assign({ q: [r2(p[0]), r2(p[1])], tipo, guias: [] }, extra || {});
  const rej = p => (o.paso ? [Math.round(p[0] / o.paso) * o.paso, Math.round(p[1] / o.paso) * o.paso] : p);
  if (o.libre) return R(q, null);
  if (o.ayudas === false) return R(rej(q), o.paso ? 'rejilla' : null);
  const G = o.G || { K: [], S: [] }, prop = o.propios || [];
  const K = G.K.concat(prop.map((p, k) => ({ q: p, tipo: k === 0 && prop.length > 2 ? 'cerrar' : 'punto', propio: k }))).filter(P => !(o.desde && P.propio === prop.length - 1));
  const S = G.S.concat(prop.slice(1).map((p, k) => ({ a: prop[k], b: p, propio: true })).slice(0, -1)); // (el último lado puesto no: es de donde sale)
  // 1) un PUNTO cerca (las puntas de las líneas sueltas y el «cerrar» pesan más: son las que se quieren unir)
  const peso = { fin: 0.8, cerrar: 0.75, punto: 1, centro: 1, cuadrante: 1.15, mitad: 1.2 };
  let best = null, bd = Infinity;
  for (const P of K) { const d = dist(P.q, q) * (peso[P.tipo] || 1); if (d < tol && d < bd) { bd = d; best = P; } }
  if (best) return R(best.q, best.tipo, { ref: best });
  // los tramos que pasan cerca
  const cer = []; for (const s of S) { const c = cerca(q, s.a, s.b); if (c.d < tol * 1.6) cer.push(Object.assign({ c }, s)); if (cer.length > 60) break; }
  // 2) un CRUCE de dos líneas
  let cz = null, cd = tol;
  for (let i = 0; i < cer.length; i++) for (let j = i + 1; j < cer.length; j++) { if (cer[i].f != null && cer[i].f === cer[j].f && !cer[i].propio) continue; const p = cruza(cer[i].a, cer[i].b, cer[j].a, cer[j].b); if (p && dist(p, q) < cd) { cd = dist(p, q); cz = p; } }
  if (cz) return R(cz, 'cruce');
  // 3) la DIRECCIÓN desde el punto anterior: horizontal, vertical, ⟂ / ∥ al lado anterior, 45°, o de 15 en 15 con Mayús
  if (o.desde && dist(q, o.desde) > tol * 0.6) {
    const v = [q[0] - o.desde[0], q[1] - o.desde[1]], L = Math.hypot(v[0], v[1]), deg = Math.atan2(v[1], v[0]) * 180 / Math.PI, cands = [];
    const mete = (ang, tipo, tolA, pri) => cands.push({ ang, tipo, tolA, pri });
    [0, 90, 180, 270].forEach(a => mete(a, a % 180 ? 'v' : 'h', 3.5, 0));
    if (o.previo) { const pa = Math.atan2(o.previo[1][1] - o.previo[0][1], o.previo[1][0] - o.previo[0][0]) * 180 / Math.PI; [90, -90].forEach(x => mete(pa + x, 'perp', 3, 1)); [0, 180].forEach(x => mete(pa + x, 'par', 3, 1)); }
    [45, 135, 225, 315].forEach(a => mete(a, 'ang', 2.5, 2));
    if (o.mayus) mete(Math.round(deg / 15) * 15, 'ang', 7.6, 3);
    let el = null;
    for (const c of cands) { const d = difAng(deg, c.ang); if (d > c.tolA || L * Math.sin(d * Math.PI / 180) > tol * 3) continue; if (!el || d < el.d - 0.05 || (Math.abs(d - el.d) <= 0.05 && c.pri < el.pri)) el = Object.assign({ d }, c); }
    if (el) {
      const u = [Math.cos(el.ang * Math.PI / 180), Math.sin(el.ang * Math.PI / 180)], extra = { angulo: ((Math.round(el.ang) % 360) + 360) % 360 };
      // a) donde la dirección CRUZA una línea que hay cerca
      let rc = null; for (const s of cer) { const r = rayoSeg(o.desde, u, s.a, s.b); if (r && dist(r.p, q) < tol && (!rc || dist(r.p, q) < dist(rc.p, q))) rc = r; }
      // b) donde la dirección queda ALINEADA (misma x o misma y) con otro punto
      let al = null; for (const P of K) { if (dist(P.q, o.desde) < 1e-6) continue;
        if (Math.abs(u[0]) > 0.2) { const t = (P.q[0] - o.desde[0]) / u[0]; if (t > 0) { const p = [o.desde[0] + u[0] * t, o.desde[1] + u[1] * t], d = dist(p, q); if (d < tol && Math.abs(p[1] - P.q[1]) > 1e-6 && (!al || d < al.d)) al = { p, d, P }; } }
        if (Math.abs(u[1]) > 0.2) { const t = (P.q[1] - o.desde[1]) / u[1]; if (t > 0) { const p = [o.desde[0] + u[0] * t, o.desde[1] + u[1] * t], d = dist(p, q); if (d < tol && Math.abs(p[0] - P.q[0]) > 1e-6 && (!al || d < al.d)) al = { p, d, P }; } } }
      if (rc && (!al || dist(rc.p, q) <= al.d)) return R(rc.p, 'cruce', Object.assign(extra, { guias: [[o.desde, rc.p]], dir: el.tipo }));
      if (al) return R(al.p, el.tipo, Object.assign(extra, { guias: [[o.desde, al.p], [al.P.q, al.p]], alineado: al.P }));
      let t = v[0] * u[0] + v[1] * u[1]; if (o.paso) t = Math.max(o.paso, Math.round(t / o.paso) * o.paso);
      const p = [o.desde[0] + u[0] * t, o.desde[1] + u[1] * t];
      return R(p, el.tipo, Object.assign(extra, { guias: [[o.desde, p]] }));
    }
  }
  // 4) SOBRE una línea (se queda pegado a ella)
  let sb = null; for (const s of cer) if (s.c.d < tol && (!sb || s.c.d < sb.c.d)) sb = s;
  if (sb) return R(sb.c.p, 'sobre', { ref: sb });
  // 5) ALINEADO con otro punto (misma x, misma y): las líneas de puntos de Fusion
  const KA = o.desde ? K.concat([{ q: o.desde, tipo: 'punto' }]) : K;
  let ax = null, ay = null;
  for (const P of KA) { const dx = Math.abs(P.q[0] - q[0]), dy = Math.abs(P.q[1] - q[1]); if (dx < tol * 0.7 && dy > tol && (!ax || dx < ax.d)) ax = { P, d: dx }; if (dy < tol * 0.7 && dx > tol && (!ay || dy < ay.d)) ay = { P, d: dy }; }
  if (ax || ay) { const g = rej(q), p = [ax ? ax.P.q[0] : g[0], ay ? ay.P.q[1] : g[1]]; return R(p, 'alin', { guias: [ax ? [ax.P.q, p] : null, ay ? [ay.P.q, p] : null].filter(Boolean) }); }
  // 6) la cuadrícula
  return R(rej(q), o.paso ? 'rejilla' : null);
}

// ---------- LÍNEAS ABIERTAS ----------
const abierta = f => f && f.t === 'linea' && !!f.abierta;
// junta las líneas abiertas que se tocan por sus puntas; si una vuelve a su primer punto, se cierra (ya es una forma)
// → { unidas, cerradas } (cuántas)
export function unirAbiertas(F, eps = 0.02) {
  const r = { unidas: 0, cerradas: 0 }; let otra = true;
  while (otra) {
    otra = false;
    for (const f of F) if (abierta(f) && f.pts.length > 3 && dist(f.pts[0], f.pts[f.pts.length - 1]) < eps) { f.pts.pop(); delete f.abierta; r.cerradas++; }
    for (let i = 0; i < F.length && !otra; i++) for (let j = i + 1; j < F.length && !otra; j++) {
      const a = F[i], b = F[j]; if (!abierta(a) || !abierta(b)) continue;
      const A = a.pts, B = b.pts, aI = A[0], aF = A[A.length - 1], bI = B[0], bF = B[B.length - 1]; let L = null;
      if (dist(aF, bI) < eps) L = A.concat(B.slice(1)); else if (dist(aF, bF) < eps) L = A.concat(B.slice(0, -1).reverse());
      else if (dist(aI, bF) < eps) L = B.concat(A.slice(1)); else if (dist(aI, bI) < eps) L = B.slice().reverse().concat(A.slice(1));
      if (L) { a.pts = L.map(q => [q[0], q[1]]); F.splice(j, 1); r.unidas++; otra = true; }
    }
  }
  return r;
}
// la punta de otra línea abierta más cercana a una de las puntas de F[i] → { j, deFin (la punta de i: true = la última), aFin, d } o null
export function masCercana(F, i) {
  const f = F[i]; if (!abierta(f)) return null; const pi = [[f.pts[0], false], [f.pts[f.pts.length - 1], true]]; let m = null;
  F.forEach((g, j) => { if (j === i || !abierta(g)) return; [[g.pts[0], false], [g.pts[g.pts.length - 1], true]].forEach(([q, aFin]) => pi.forEach(([p, deFin]) => { const d = dist(p, q); if (!m || d < m.d) m = { j, deFin, aFin, d }; })); });
  return m;
}
// UNE F[i] con la línea abierta más cercana (con un lado nuevo entre las dos puntas, si no se tocan) → { d } o null
export function unirConCercana(F, i) {
  const m = masCercana(F, i); if (!m) return null; const f = F[i], g = F[m.j];
  const A = m.deFin ? f.pts : f.pts.slice().reverse(), B = m.aFin ? g.pts.slice().reverse() : g.pts;
  f.pts = (m.d < 0.02 ? A.concat(B.slice(1)) : A.concat(B)).map(q => [q[0], q[1]]); F.splice(m.j, 1); unirAbiertas(F); return { d: m.d };
}
// cierra una línea abierta (de su último punto al primero) → true si se ha podido
export function cierra(f) { if (!abierta(f) || f.pts.length < 3) return false; if (dist(f.pts[0], f.pts[f.pts.length - 1]) < 0.02) f.pts.pop(); if (f.pts.length < 3) return false; delete f.abierta; return true; }
// ENDEREZAR: los lados que van CASI en horizontal o en vertical (a menos de «tolG» grados) quedan rectos del todo → cuántos
export function endereza(f, tolG = 6) {
  if (!f || f.t !== 'linea' || f.suave) return 0; const P = f.pts, n = P.length, m = f.abierta ? n - 1 : n; let cuantos = 0;
  for (let pasada = 0; pasada < 3; pasada++) for (let k = 0; k < m; k++) {
    const a = P[k], b = P[(k + 1) % n], deg = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI), dh = Math.min(deg, 180 - deg), dv = Math.abs(90 - deg);
    if (dh > 1e-6 && dh < tolG) { const y = r2((a[1] + b[1]) / 2); a[1] = y; b[1] = y; if (!pasada) cuantos++; }
    else if (dv > 1e-6 && dv < tolG) { const x = r2((a[0] + b[0]) / 2); a[0] = x; b[0] = x; if (!pasada) cuantos++; }
  }
  return cuantos;
}

// ---------- ASAS: los puntos que se agarran con el ratón para cambiar una forma (como en Fusion) ----------
// → [{ q, k }] · línea: cada punto · rectángulo: sus 4 esquinas · círculo, polígono y estrella: un punto en el borde (el tamaño)
export function asas(f) {
  if (!f) return [];
  if (f.t === 'linea' && !f.suave) return f.pts.map((q, k) => ({ q: [q[0], q[1]], k }));
  const c = [num(f.x), num(f.y)];
  if (f.t === 'rect') return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v], k) => ({ q: gira([u * num(f.w) / 2, v * num(f.h) / 2], f.ang, c), k }));
  if (f.t === 'circulo' || f.t === 'poligono' || f.t === 'estrella') return [{ q: gira([num(f.d) / 2, 0], f.t === 'circulo' ? 0 : f.ang, c), k: 'd' }];
  return [];
}
// mueve el asa k de la forma f (o = la forma como estaba al agarrarla) al punto q
export function mueveAsa(f, k, q, o) {
  if (f.t === 'linea') { f.pts[k] = [r2(q[0]), r2(q[1])]; return; }
  if (f.t === 'rect') { // la esquina de enfrente se queda quieta (en los ejes del propio rectángulo, aunque esté girado)
    const a = (o.ang || 0) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), c = [num(o.x), num(o.y)], loc = p => [(p[0] - c[0]) * cs + (p[1] - c[1]) * sn, -(p[0] - c[0]) * sn + (p[1] - c[1]) * cs];
    const sg = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k], fija = [-sg[0] * num(o.w) / 2, -sg[1] * num(o.h) / 2], m = loc(q);
    const w = Math.max(0.5, Math.abs(m[0] - fija[0])), hh = Math.max(0.5, Math.abs(m[1] - fija[1])), cl = [(m[0] + fija[0]) / 2, (m[1] + fija[1]) / 2], cg = gira(cl, o.ang, c);
    Object.assign(f, { w: r2(w), h: r2(hh), x: r2(cg[0]), y: r2(cg[1]) }); return;
  }
  if (k === 'd') f.d = r2(Math.max(0.5, 2 * dist(q, [num(o.x), num(o.y)])));
}
// ¿hay un asa debajo del ratón? (tol en mm) → { f, k, q } · primero las de la forma elegida
export function asaEn(F, q, tol, sel = -1) {
  const orden = sel >= 0 ? [sel].concat(F.map((_, i) => i).filter(i => i !== sel)) : F.map((_, i) => i); let m = null;
  for (const i of orden) { const L = (i === sel || (F[i] && F[i].t === 'linea')) ? asas(F[i]) : []; for (const a of L) { const d = dist(a.q, q); if (d < tol && (!m || d < m.d - 1e-9)) m = { f: i, k: a.k, q: a.q, d }; } if (m && i === sel) break; }
  return m;
}
