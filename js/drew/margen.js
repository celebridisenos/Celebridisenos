// ================= 👗 CelebriDREW · MÁRGENES DE COSTURA y LÍNEA DE CORTE =================
// La línea de costura es el contorno de la pieza; la de CORTE es esa línea desplazada hacia fuera lo que mida el margen de CADA borde
// (costuras 10 mm, bajos 25–30, doblez 0…). Cada borde se desplaza por su lado (inglete en sus curvas) y dos bordes seguidos se unen
// por el cruce de sus rectas; si el cruce queda lejísimos (ángulo muy cerrado) se corta en chaflán; si los dos bordes siguen en línea
// con márgenes distintos (un costado que llega al bajo), se une con un escalón recto. Las pinzas se PUENTEAN (la línea de corte pasa por
// encima de su abertura, como cuando se marca con la pinza cerrada: aproximación documentada). Al final se quitan los lazos que deja
// una curva cóncava más cerrada que el margen y se comprueba que no se cruza.
import * as G from './geom.js';
import * as Z from './pieza.js';

// la línea de corte de la pieza (polígono cerrado, a izquierdas)
export function lineaCorte(pz, tol = 0.1) {
  // tramos seguidos con el mismo margen → «corridas»; las patas de las pinzas no cuentan
  const corr = [];
  pz.contorno.forEach(t => { if (Z.pinzaDe(pz, t.id)) { if (corr.length) corr[corr.length - 1].salto = true; return; } const B = Z.bordeDeTramo(pz, t.id), m = B ? Z.margenDe(pz, B.id) : pz.margen.def, g = Z.tramoGeo(pz, t);
    const u = corr[corr.length - 1]; if (u && u.m === m && !u.salto) u.tr.push(g); else corr.push({ m, tr: [g] }); });
  // si la primera y la última son del mismo margen y seguidas, se juntan
  if (corr.length > 1) { const a = corr[0], z = corr[corr.length - 1]; if (a.m === z.m && !z.salto && G.dist(z.tr[z.tr.length - 1].b, a.tr[0].a) < 1e-6) { a.tr = z.tr.concat(a.tr); corr.pop(); } }
  const runs = corr.map(c => ({ m: c.m, L: G.desfasaPolilinea(G.cadenaAplana(c.tr, tol), c.m) }));
  const out = [];
  for (let i = 0; i < runs.length; i++) {
    const A = runs[i], B = runs[(i + 1) % runs.length], a0 = A.L[A.L.length - 2], a1 = A.L[A.L.length - 1], b0 = B.L[0], b1 = B.L[1];
    out.push(...A.L.slice(i === 0 ? 0 : 1, -1));
    const x = G.cortaRectas(a0, a1, b0, b1), lim = 4 * Math.max(A.m, B.m, 1);
    const paralelas = Math.abs(G.cruz(G.norma(G.sub(a1, a0)), G.norma(G.sub(b1, b0)))) < 0.02;
    if (x && !paralelas && G.dist(x, a1) < lim && G.dist(x, b0) < lim) out.push(x); else out.push(a1, b0); // inglete · o escalón / chaflán
  }
  return limpiaLazos(G.quitaDobles(out));
}
// quitar los lazos pequeños: si el segmento i corta a otro j cercano, se salta lo de en medio
export function limpiaLazos(P, ventana = 400) {
  let L = P.slice(), cambio = true, vueltas = 0;
  while (cambio && vueltas++ < 50) { cambio = false; const n = L.length;
    fuera: for (let i = 0; i < n; i++) for (let k = 2; k < Math.min(ventana, n - 1); k++) { const j = (i + k) % n; if ((j + 1) % n === i) continue;
      const x = G.cruceSeg(L[i], L[(i + 1) % n], L[j], L[(j + 1) % n]); if (!x) continue;
      // se queda con el trozo más largo (el lazo es el corto)
      const corto = k <= n / 2; if (corto) { const nuevo = []; for (let q = 0; q < n; q++) { const dq = (q - i + n) % n; if (dq >= 1 && dq <= k) continue; nuevo.push(L[q]); if (q === i) nuevo.push(x.p); } L = nuevo; } else { const nuevo = [x.p]; for (let q = (i + 1) % n; q !== (j + 1) % n; q = (q + 1) % n) nuevo.push(L[q]); L = nuevo; }
      cambio = true; break fuera; } }
  return L;
}
// la tela que gasta la pieza (con su margen; si va al doblez o son dos, se cuenta entera)
export function areaTela(pz) { const a = Math.abs(G.area(lineaCorte(pz))); return a * (pz.corte.doblez ? 2 : 1) * (pz.corte.n || 1); }
