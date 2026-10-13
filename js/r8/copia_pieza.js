// ================= 13-10-2026 · 🧩 COPIAR CUALQUIER PIEZA desde una foto (y rehacer EXACTOS los dientes en línea) =================
// La dueña: «tiene que funcionar cualquier pieza, que pueda replicar una copia para tener repuesto» y «que pueda con sierras de calar,
// peine metálico: tiene que conseguir calcar o replicar esos objetos».
// De la foto de FRENTE (silueta, en píxeles) se saca:
//  · el CONTORNO y sus AGUJEROS (los redondos se rehacen como círculos perfectos, de la medida que tú midas);
//  · el EJE LARGO de la pieza (para la flecha del largo total, que es lo que da la escala exacta);
//  · los BORDES CON DIENTES QUE SE REPITEN (sierra, peine, cremallera, lima, rueda de clip…): se cuentan, se mide el PASO con todos
//    ellos a la vez (recta de mínimos cuadrados por las puntas: mucho más fino que medir uno) y se rehacen TODOS IGUALES con el diente
//    medio (la mediana de todos), así salen perfectos aunque la foto o el original tengan dientes gastados o torcidos. Si mides con el
//    calibre de la punta 1 a la punta n+1, ese paso manda.
// Luego, con tus medidas (largo, grosor, agujeros) se construye la pieza a escala exacta (Manifold).
import * as N from './nucleo.js';

export const areaDe = r => area(r);
const area = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; };
const mediana = L => { const s = L.filter(x => isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
function circuloDe(P) { // Kåsa: el círculo que mejor pasa por los puntos
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = P.length;
  P.forEach(([x, y]) => { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; });
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [sxz, syz, sz];
  const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const D = det(A); if (Math.abs(D) < 1e-12) return null; const s = [0, 1, 2].map(k => det(A.map((f, i) => f.map((v, j) => j === k ? b[i] : v))) / D);
  const c = [s[0] / 2, s[1] / 2], r = Math.sqrt(s[2] + c[0] * c[0] + c[1] * c[1]); return { c, r, desv: Math.max(...P.map(p => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - r))) };
}
// los puntos del contorno, cada poco (para que los tramos largos cuenten lo que miden)
function densa(r, paso) { const o = []; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / paso)); for (let k = 0; k < n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; }
const rota = (p, c, s, o) => [(p[0] - o[0]) * c + (p[1] - o[1]) * s, -(p[0] - o[0]) * s + (p[1] - o[1]) * c];

// ---------- ANALIZAR la silueta (en píxeles de la foto de frente) ----------
// pz = { fuera: [[x,y]], agujeros: [[[x,y]]] } · → { theta, o, largo, ancho, agujeros: [{ c, r, redondo, anillo }], dientes: [...] }
export function analiza(pz) {
  const D = densa(pz.fuera, 1); let mx = 0, my = 0; D.forEach(p => { mx += p[0]; my += p[1]; }); mx /= D.length; my /= D.length;
  let sxx = 0, syy = 0, sxy = 0; D.forEach(([x, y]) => { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); });
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(theta), s = Math.sin(theta), o = [mx, my];
  // la silueta girada: el eje largo en X
  const R = pz.fuera.map(p => rota(p, c, s, o)), xs = R.map(p => p[0]), ys = R.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const agujeros = pz.agujeros.map(a => { const k = circuloDe(densa(a, 1)); return { anillo: a.map(p => rota(p, c, s, o)), c: k ? rota(k.c, c, s, o) : null, r: k ? k.r : 0, redondo: !!k && k.desv < Math.max(1.2, 0.06 * k.r) }; }).filter(a => Math.abs(area(a.anillo)) > 6);
  return { theta, o, R, x0, x1, y0, y1, largo: x1 - x0, ancho: y1 - y0, agujeros, dientes: [arriba(R, x0, x1, 1), arriba(R, x0, x1, -1)].filter(Boolean) };
}
// el borde de arriba (lado = 1) o el de abajo (lado = −1) a lo largo de X: ¿tiene dientes que se repiten?
function arriba(R, x0, x1, lado) {
  const n = 2000, dx = (x1 - x0) / n, y = new Float64Array(n + 1).fill(NaN);
  for (let i = 0; i <= n; i++) { const X = x0 + i * dx; let best = NaN; for (let k = 0, j = R.length - 1; k < R.length; j = k++) { const p = R[k], q = R[j]; if ((p[0] > X) !== (q[0] > X)) { const Y = (p[1] + (X - p[0]) * (q[1] - p[1]) / (q[0] - p[0])) * lado; if (!(best >= Y)) best = Y; } } y[i] = best; }
  for (let i = 0; i <= n; i++) if (isNaN(y[i])) y[i] = i ? y[i - 1] : y[1];
  // autocorrelación de la PENDIENTE (quita la forma general y deja lo que se repite)
  // (los dos extremos de la pieza dan un salto enorme que taparía la repetición: se dejan fuera el 2 % de cada punta y los saltos
  // más grandes que 4 veces el 95 % de los demás se recortan)
  const d0 = Array.from({ length: n }, (_, i) => (i < n * 0.02 || i > n * 0.98) ? 0 : y[i + 1] - y[i]), ad = d0.map(Math.abs).filter(x => x > 1e-9).sort((a, b) => a - b), tope = ad.length ? 4 * ad[Math.floor(ad.length * 0.95)] : 0;
  const d1 = d0.map(x => Math.max(-tope, Math.min(tope, x)));
  // suavizada (±4 muestras): con dientes de cantos rectos (un peine) la pendiente son picos finísimos que no casan entre un diente y el
  // siguiente por media muestra, y la repetición «buena» se escondía
  const d = d1.map((_, i) => { let s = 0, w = 0; for (let k = -4; k <= 4; k++) { const j = i + k; if (j >= 0 && j < n) { const p = 5 - Math.abs(k); s += d1[j] * p; w += p; } } return s / w; });
  const m = d.reduce((a, b) => a + b, 0) / n, v = d.map(x => x - m), E = v.reduce((a, b) => a + b * b, 0); if (!(E > 1e-6)) return null;
  // el PASO: el primer pico de la autocorrelación que llega al 70 % del más alto (así no se toma el doble del paso por el paso)
  const ac = new Float64Array(Math.floor(n / 4)); for (let L = 2; L < ac.length; L++) { let s = 0; for (let i = 0; i + L < n; i++) s += v[i] * v[i + L]; ac[L] = s / E * n / (n - L); }
  let maxAc = 0; for (let L = 3; L < ac.length - 1; L++) if (ac[L] > ac[L - 1] && ac[L] >= ac[L + 1]) maxAc = Math.max(maxAc, ac[L]);
  let mejor = null; if (maxAc > 0.35) for (let L = 3; L < ac.length - 1; L++) if (ac[L] > ac[L - 1] && ac[L] >= ac[L + 1] && ac[L] >= 0.7 * maxAc) { mejor = { L, s: ac[L] }; break; }
  if (!mejor) return null;
  // las PUNTAS: el máximo de cada trozo de un paso. El borde casi nunca sale recto del todo en la foto (medio grado basta para que las
  // puntas de una punta parezcan más bajas que las de la otra): se traza una RECTA POR LAS PUNTAS y cada diente se mide desde ella.
  const P = mejor.L, Xs = i => x0 + i * dx;
  const puntasDe = yy => { const L = []; for (let i = 0; i <= n; i++) { let es = true; for (let k = Math.max(0, i - Math.floor(P / 2)); k <= Math.min(n, i + Math.floor(P / 2)); k++) if (yy[k] > yy[i]) { es = false; break; } if (es && (!L.length || i - L[L.length - 1] > P / 2)) L.push(i); } return L; };
  const recta = (I, yy) => { const mx = I.reduce((a, i) => a + Xs(i), 0) / I.length, my = I.reduce((a, i) => a + yy[i], 0) / I.length, sxx = I.reduce((a, i) => a + (Xs(i) - mx) ** 2, 0); const a = sxx > 0 ? I.reduce((a2, i) => a2 + (Xs(i) - mx) * (yy[i] - my), 0) / sxx : 0; return { a, b: my - a * mx }; };
  // 1.ª pasada: la inclinación media de todo el borde; 2.ª: la recta por las puntas que sobresalen
  const r0 = recta(Array.from({ length: n + 1 }, (_, i) => i), y), y1 = y.map((v2, i) => v2 - r0.a * Xs(i));
  let pu = puntasDe(y1); const altas = pu.filter(i => y1[i] > mediana(pu.map(j => y1[j])) - 0.25 * (Math.max(...y1) - Math.min(...y1))); if (altas.length < 5) return null;
  const tr = recta(altas, y), yd = y.map((v2, i) => v2 - (tr.a * Xs(i) + tr.b)); // ahora las puntas están en ≈ 0 y los valles por debajo
  const puntas = puntasDe(yd);
  const hondo = puntas.slice(1).map((p, k) => Math.min(...Array.from(yd.subarray(puntas[k], p + 1)))); if (puntas.length < 5) return null;
  const alto = mediana(puntas.map(i => yd[i])), fondo = mediana(hondo), amp = alto - fondo; if (!(amp > 1.5)) return null;
  // cada diente, por el CENTRO de su parte alta (lo que pasa del 70 % de su altura): en una sierra es casi la punta; en un peine, el
  // centro de la púa plana (su «punto más alto» saltaba de un lado a otro de la púa con medio grado de giro)
  const umbral = fondo + 0.7 * amp, buenas = []; let ini = -1;
  for (let i = 0; i <= n + 1; i++) { const dentro = i <= n && yd[i] > umbral; if (dentro && ini < 0) ini = i; if (!dentro && ini >= 0) { buenas.push((ini + i - 1) / 2); ini = -1; } }
  if (buenas.length < 5) return null;
  // el paso de verdad: la distancia más repetida entre dientes seguidos (la autocorrelación solo era para empezar; con dientes desiguales
  // a veces se queda con el de 2, 3 o 4 dientes)
  const P2 = mediana(buenas.slice(1).map((x, k) => x - buenas[k])); if (!(P2 > 2)) return null;
  // el tramo SEGUIDO más largo de dientes al paso
  const tramos = []; let t = [buenas[0]]; for (let k = 1; k < buenas.length; k++) { if (Math.abs(buenas[k] - buenas[k - 1] - P2) < 0.35 * P2) t.push(buenas[k]); else { tramos.push(t); t = [buenas[k]]; } } tramos.push(t);
  const T = tramos.sort((a, b) => b.length - a.length)[0]; if (T.length < 5) return null;
  // el paso fino: recta de mínimos cuadrados (número de punta → dónde está)
  const k = T.map((_, i) => i), X = T.map(i => x0 + i * dx), mk = (k.length - 1) / 2, mX = X.reduce((a, b) => a + b, 0) / X.length;
  const paso = k.reduce((s, ki, i) => s + (ki - mk) * (X[i] - mX), 0) / k.reduce((s, ki) => s + (ki - mk) ** 2, 0), x00 = mX - paso * mk;
  // el diente medio: la mediana, en 64 trozos de un paso, de todos los dientes del tramo (de valle a valle, con la punta en medio)
  const B = 64, bins = Array.from({ length: B }, () => []);
  for (let i = 0; i <= n; i++) { const X0 = x0 + i * dx, u = (X0 - x00) / paso + 0.5; if (u < 0 || u >= T.length) continue; bins[Math.min(B - 1, Math.floor((u % 1) * B))].push(yd[i]); }
  const perfil = bins.map(b => mediana(b)); if (perfil.some(x => !isFinite(x))) return null;
  // (perfil, fondo y alto van medidos desde la recta de las puntas: Y = valor + ta·x + tb)
  return { lado, n: T.length, paso, xIni: x00 - paso / 2, xFin: x00 + paso * (T.length - 0.5), perfil, fondo: Math.min(...perfil), alto: Math.max(...perfil), ta: tr.a, tb: tr.b, correlacion: mejor.s };
}

// ---------- CONSTRUIR la pieza ----------
// A = analiza(...) · med = { largo (mm, el total a lo largo del eje largo), grosor, agujeros: [d|null], pasoMm: [por cada borde con dientes, o null] }
// o = { regulariza: true }
export function construye(A, med, o = {}) {
  const k = med.largo / A.largo; if (!(k > 0)) N.mal('Falta el largo total (la flecha ①).');
  const aMm = p => [(p[0] - (A.x0 + A.x1) / 2) * k, -(p[1] - (A.y0 + A.y1) / 2) * k]; // (la foto va con la Y hacia abajo)
  let cs = N.cs([N.ccw(A.R.map(aMm))], 'Positive');
  // los dientes en línea, todos iguales. Cuentas: en la foto girada, el borde se midió como Y·lado (más = más hacia fuera). En mm:
  // y_mm = −(y_px − centro)·k, así que «hacia fuera» en mm es −lado. Se quita todo lo que hay del FONDO de los valles hacia fuera en
  // el tramo de los dientes y se pone la tira de dientes nuevos (que entra 0,3 mm en el cuerpo para que se suelden).
  if (o.regulariza !== false) A.dientes.forEach((D, i) => {
    const pasoMm = med.pasoMm && med.pasoMm[i] > 0 ? med.pasoMm[i] : D.paso * k, L = pasoMm * D.n;
    const cx = ((D.xIni + D.xFin) / 2 - (A.x0 + A.x1) / 2) * k, xa = cx - L / 2, yc = (A.y0 + A.y1) / 2;
    const xc = (A.x0 + A.x1) / 2, yMm = (v, xm) => -((v + D.ta * (xm / k + xc) + D.tb) * D.lado - yc) * k, fuera = -D.lado, nB = D.perfil.length; // (v: medido desde la recta de las puntas)
    const pts = []; for (let t = 0; t < D.n; t++) for (let b = 0; b < nB; b++) { const xm = xa + (t + b / nB) * pasoMm; pts.push([xm, yMm(D.perfil[b], xm)]); }
    const yG = xm => yMm(D.fondo, xm);
    pts.push([xa + L, yMm(D.perfil[0], xa + L)], [xa + L, yG(xa + L) - fuera * 0.3], [xa, yG(xa) - fuera * 0.3]);
    const m = 0.01, banda = [[xa - m, yG(xa - m)], [xa + L + m, yG(xa + L + m)], [xa + L + m, yG(xa + L) + fuera * 1e3], [xa - m, yG(xa) + fuera * 1e3]];
    cs = cs.subtract(N.cs([N.ccw(banda)], 'Positive')).add(N.cs([N.ccw(pts)], 'Positive'));
  });
  // los agujeros: los redondos, círculos perfectos de la medida que digas (o la de la foto); los demás, tal cual se ven
  const C = N.CSX();
  A.agujeros.forEach((h, i) => { const d = med.agujeros && med.agujeros[i] > 0 ? med.agujeros[i] : null;
    if (h.redondo && h.c) { const c = aMm(h.c), r = d ? d / 2 : h.r * k; cs = cs.subtract(C.circle(r, Math.max(48, Math.round(r * 12))).translate(c)); }
    else cs = cs.subtract(N.cs([N.ccw(h.anillo.map(aMm))], 'Positive')); });
  return cs.extrude(med.grosor || 3);
}

// ---------- 🍪 CORTADOR DE GALLETAS / FONDANT desde una foto o un dibujo (la misma silueta) ----------
// La dueña: «piezas de corte … tiene que ser con cualquier foto». La silueta de fuera (y los huecos de dentro, que también cortan) se
// suaviza (quita el «diente de sierra» de los píxeles), se escala a tu medida y se hace la PARED: un filo fino abajo (corta limpio),
// la pared normal y un REBORDE arriba para apretar sin hacerte daño.
// o = { largo, alto, pared, filo, reborde (ancho), conReborde }
export function cortador(A, o) {
  const k = o.largo / A.largo; if (!(k > 0)) N.mal('Falta el tamaño (el largo de la forma).');
  const aMm = p => [(p[0] - (A.x0 + A.x1) / 2) * k, -(p[1] - (A.y0 + A.y1) / 2) * k];
  let cs = N.cs([N.ccw(A.R.map(aMm))].concat(A.agujeros.map(h => N.ccw(h.anillo.map(aMm)).reverse())), 'EvenOdd');
  const su = Math.max(0.25, o.largo / 250); cs = cs.offset(su, 'Round', 2, 16).offset(-2 * su, 'Round', 2, 16).offset(su, 'Round', 2, 16); // suavizar
  const t = o.pared || 1, filo = Math.max(0.4, Math.min(t, o.filo || 0.6)), H = o.alto || 12, hFilo = Math.min(3, H * 0.25);
  const anillo = (dentro, fuera) => cs.offset(fuera, 'Round', 2, 16).subtract(cs.offset(-dentro, 'Round', 2, 16));
  let m = anillo(0, filo).extrude(hFilo + 0.01).add(anillo(0, t).extrude(H - hFilo).translate([0, 0, hFilo]));
  if (o.conReborde !== false) m = m.add(anillo(0, t + (o.reborde || 3)).extrude(1.6).translate([0, 0, H - 1.6]));
  const perdido = Math.abs(cs.offset(-0.6, 'Round', 2, 16).offset(0.6, 'Round', 2, 16).area() - cs.area()) / Math.max(1, cs.area());
  return { m, k, finos: perdido > 0.02 };
}
