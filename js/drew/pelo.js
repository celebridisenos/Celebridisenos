// ================= 👗 CelebriDREW · el PELO del avatar: su forma, para VERLO (vista3d.js) y para que la TELA no lo atraviese (tela_worker.js) =================
// (18-10-2026) La capucha se apoyaba en la PIEL de la cabeza y el pelo esculpido (un casquete un 4–7 % más grande que la cabeza, con su moño)
// asomaba por encima de la tela: manchas blancas en la coronilla y, debajo, la franja de capucha de la frente, que parecía una venda en los ojos.
// Ahora el pelo cuenta como cuerpo para la tela: la capucha se apoya EN el pelo (y el moño o la coleta la abomban por detrás, como de verdad).
// Todo sale de lo mismo, así lo que se ve y lo que choca nunca se separan: la cabeza (elipsoide de lo de arriba de la malla), la línea donde
// nace el pelo (según el peinado), el grosor del casquete y las piezas sueltas (moño, nudo, coleta).

// la CABEZA del cuerpo: el elipsoide de lo que hay por encima del cuello, medido en la malla que se ve
export function cabezaDe(pos, Hh) {
  let top = -Infinity; for (let i = 1; i < pos.length; i += 3) top = Math.max(top, pos[i]); const alto = Hh || top, yb0 = top - 0.075 * alto, yb1 = top - 0.04 * alto;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, sx = 0, n = 0;
  for (let i = 0; i < pos.length; i += 3) { const y = pos[i + 1]; if (y < yb0 || y > yb1) continue; const x = pos[i], z = pos[i + 2]; if (Math.abs(x) > 0.08 * alto) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); sx += x; n++; }
  if (!n) return null; const rx = (x1 - x0) / 2, rz = (z1 - z0) / 2, ry = 0.066 * alto; return { c: [sx / n, top - ry, (z0 + z1) / 2], r: [rx, ry, rz], alto };
}
// la línea del pelo: hasta qué ángulo desde la coronilla llega (en grados), según hacia dónde (f = 1 delante, 0 a los lados, −1 detrás)
export const LINEA = { corto: f => (f >= 0 ? 86 - 28 * f : 86 + 16 * -f), mono: f => (f >= 0 ? 90 - 31 * f : 90 + 24 * -f), coleta: f => (f >= 0 ? 90 - 31 * f : 90 + 24 * -f),
  melena: f => (f > 0.55 ? 118 - 60 * (f - 0.55) / 0.45 : f >= 0 ? 122 : 122 + 12 * -f) };
// cuánto más grande que la cabeza es el casquete
export const grosorPelo = E => (E === 'corto' ? 1.045 : 1.07);
// la melena cae recta: lo de abajo se separa algo más de la cabeza (volumen) y baja un poco (en la esfera unidad, antes de escalar)
export function deformaMelena(x, y, z) { if (y >= 0) return [x, y, z]; const t = Math.min(1, -y); return [x * (1 + 0.18 * t), y * 1.15, z * (1 + 0.08 * t)]; }
// las piezas sueltas, en mm desde el centro de la cabeza: bolas (c, radio, escala) y la coleta (un huso que cae hacia la espalda)
export function extras(E, r) {
  const B = [];
  if (E === 'mono') B.push({ tipo: 'bola', rad: 0.46 * r[0], c: [0, 0.42 * r[1], -0.95 * r[2]], s: [1, 0.92, 0.85] });
  if (E === 'coleta') {
    B.push({ tipo: 'bola', rad: 0.26 * r[0], c: [0, 0.22 * r[1], -1.02 * r[2]], s: [1, 1, 1] });
    const L = 1.55 * r[1], c = [0, 0.22 * r[1] - L / 2, -1.12 * r[2]], rot = -0.18, cy = Math.cos(rot) * L / 2, sz = Math.sin(rot) * L / 2;
    B.push({ tipo: 'coleta', L, c, rot, ra: 0.2 * r[0], rb: 0.06 * r[0], a: [c[0], c[1] + cy, c[2] + sz], b: [c[0], c[1] - cy, c[2] - sz] });
  }
  return B;
}

// ---------- la DISTANCIA al pelo (mm, con signo: negativa dentro) ----------
const dElipsoide = (px, py, pz, rx, ry, rz) => { const u = px / rx, v = py / ry, w = pz / rz, k0 = Math.sqrt(u * u + v * v + w * w), k1 = Math.sqrt((u / rx) ** 2 + (v / ry) ** 2 + (w / rz) ** 2); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1; };
function conoR(A, B, r1, r2, p) { // cono redondo de A (radio r1) a B (radio r2) (Í. Quílez)
  const ba = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], pa = [p[0] - A[0], p[1] - A[1], p[2] - A[2]], l2 = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const y = pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2], z = y - l2, xv = [pa[0] * l2 - ba[0] * y, pa[1] * l2 - ba[1] * y, pa[2] * l2 - ba[2] * y], x2 = xv[0] ** 2 + xv[1] ** 2 + xv[2] ** 2, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2; if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2; if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// → (x, y, z) => distancia, o null si el peinado no lleva pelo
export function distPelo(E, cab) {
  if (!cab || !E || E === 'no') return null;
  const g = grosorPelo(E), [cx, cy, cz] = cab.c, rx = cab.r[0] * g, ry = cab.r[1] * g, rz = cab.r[2] * g, rmin = Math.min(rx, ry, rz), lim = LINEA[E] || LINEA.corto, X = extras(E, cab.r);
  return (x, y, z) => {
    let u = (x - cx) / rx, v = (y - cy) / ry, w = (z - cz) / rz;
    if (E === 'melena' && v < 0) { const y0 = v / 1.15, t = Math.min(1, -y0); u /= 1 + 0.18 * t; w /= 1 + 0.08 * t; v = y0; }
    // el casquete es el elipsoide cortado por la línea del pelo: dentro del corte, la distancia al elipsoide; por debajo de la línea, hasta su
    // BORDE (sin el salto de «no hay pelo»: en la nuca y en la melena el borde queda separado de la piel y la tela se colaba por ahí)
    const k = Math.hypot(u, v, w); let d = -rmin;
    if (k > 1e-6) { const th = Math.acos(Math.max(-1, Math.min(1, v / k))) * 180 / Math.PI, f = w / Math.max(1e-6, Math.hypot(u, w)), dr = (k - 1) * rmin, da = (th - lim(f)) * Math.PI / 180 * rmin * Math.max(k, 0.3);
      d = da <= 0 ? dr : dr <= 0 ? da : Math.hypot(dr, da); }
    X.forEach(P => { const q = [x - cx - P.c[0], y - cy - P.c[1], z - cz - P.c[2]];
      d = Math.min(d, P.tipo === 'bola' ? dElipsoide(q[0], q[1], q[2], P.rad * P.s[0], P.rad * P.s[1], P.rad * P.s[2]) : conoR(P.a, P.b, P.ra, P.rb, [x - cx, y - cy, z - cz])); });
    return d;
  };
}
// puntos de la SUPERFICIE del pelo (mm, en el sitio del cuerpo): para comprobar que la rejilla no se queda corta y, en las pruebas, que no asoma
export function puntosPelo(E, cab, paso = 4) {
  if (!cab || !E || E === 'no') return [];
  const g = grosorPelo(E), lim = LINEA[E] || LINEA.corto, out = [], [cx, cy, cz] = cab.c;
  for (let th = 0; th <= 180; th += paso) for (let ph = 0; ph < 360; ph += th === 0 ? 360 : paso) {
    const st = Math.sin(th * Math.PI / 180); let x = st * Math.sin(ph * Math.PI / 180), y = Math.cos(th * Math.PI / 180), z = st * Math.cos(ph * Math.PI / 180);
    const f = z / Math.max(1e-6, Math.hypot(x, z)); if (th > lim(f)) continue; if (E === 'melena') [x, y, z] = deformaMelena(x, y, z);
    out.push([cx + x * cab.r[0] * g, cy + y * cab.r[1] * g, cz + z * cab.r[2] * g]); }
  extras(E, cab.r).forEach(P => {
    if (P.tipo === 'bola') { for (let th = 0; th <= 180; th += 12) for (let ph = 0; ph < 360; ph += 12) { const st = Math.sin(th * Math.PI / 180); out.push([cx + P.c[0] + P.rad * P.s[0] * st * Math.sin(ph * Math.PI / 180), cy + P.c[1] + P.rad * P.s[1] * Math.cos(th * Math.PI / 180), cz + P.c[2] + P.rad * P.s[2] * st * Math.cos(ph * Math.PI / 180)]); } }
    else for (let t = 0; t <= 1.0001; t += 0.1) { const rr = P.ra + (P.rb - P.ra) * t, a = [P.a[0] + (P.b[0] - P.a[0]) * t, P.a[1] + (P.b[1] - P.a[1]) * t, P.a[2] + (P.b[2] - P.a[2]) * t];
      for (let ph = 0; ph < 360; ph += 20) out.push([cx + a[0] + rr * Math.sin(ph * Math.PI / 180), cy + a[1], cz + a[2] + rr * Math.cos(ph * Math.PI / 180)]); }
  });
  return out;
}

// ---------- el pelo en la REJILLA de choque de la tela (la del cuerpo se guarda: cambiar de peinado no la estropea) ----------
// R = { x0, y0, z0, nx, ny, nz, paso, d, tope } (mh.js / avatar.js). Devuelve cuántos nudos han cambiado.
export function ponEnRejilla(R, E, cab) {
  if (!R) return 0; if (!R.d0) R.d0 = R.d.slice(); else R.d.set(R.d0);
  const f = distPelo(E, cab); if (!f) return 0;
  const { x0, y0, z0, nx, ny, nz, paso, d } = R, M = Math.max(...cab.r), mx = 1.6 * M + 2 * R.tope, at = (i, j, k) => (k * ny + j) * nx + i;
  const rango = (o, a, b) => [Math.max(0, Math.floor((a - o) / paso)), Math.min(Math.round((b - o) / paso) + 1, 1e9)];
  const [i0, i1] = rango(x0, cab.c[0] - mx, cab.c[0] + mx), [j0, j1] = rango(y0, cab.c[1] - 2.4 * cab.r[1] - R.tope, cab.c[1] + 1.3 * cab.r[1] + R.tope), [k0, k1] = rango(z0, cab.c[2] - mx, cab.c[2] + mx);
  let n = 0;
  for (let k = k0; k < Math.min(nz, k1); k++) for (let j = j0; j < Math.min(ny, j1); j++) for (let i = i0; i < Math.min(nx, i1); i++) {
    const r = at(i, j, k), dh = Math.max(-400, Math.min(R.tope, f(x0 + i * paso, y0 + j * paso, z0 + k * paso))); if (dh < d[r]) { d[r] = dh; n++; } }
  // como en la piel (mh.js · rejilla): entre nudo y nudo la distancia se interpola y, en el borde del pelo y en el moño, quedaría algo corta;
  // para cada punto de la superficie del pelo que la rejilla vea «fuera», se bajan sus 8 nudos lo que sobra
  const P = puntosPelo(E, cab, 2);
  for (let vuelta = 0; vuelta < 4; vuelta++) { let malos = 0;
    for (const [x, y, z] of P) { const fx = (x - x0) / paso, fy = (y - y0) / paso, fz = (z - z0) / paso, i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
      if (i < 0 || j < 0 || k < 0 || i >= nx - 1 || j >= ny - 1 || k >= nz - 1) continue; const u = fx - i, v = fy - j, w = fz - k; let s = 0;
      for (let c = 0; c < 2; c++) for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) s += d[at(i + a, j + b, k + c)] * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
      const sobra = s + 0.6; if (sobra <= 0) continue; malos++;
      for (let c = 0; c < 2; c++) for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) d[at(i + a, j + b, k + c)] -= sobra; }
    if (!malos) break; }
  return n;
}
