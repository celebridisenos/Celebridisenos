// ================= 👗 CelebriDREW · el SIMULADOR en su propio hilo (la pantalla nunca se queda congelada) =================
// Mensajes que recibe:  { tipo: 'avatar', med, sexo, pelo }  · { tipo: 'pelo', estilo } · { tipo: 'prenda', prenda, tela, conservar }  · { tipo: 'pausa' | 'sigue' }
//                       { tipo: 'arrastre', i, p } (i = -1 suelta) · { tipo: 'mapa', si } · { tipo: 'viento', v } · { tipo: 'revestir' }
// Mensajes que manda:   'avatar' (malla y medidas) · 'modelo' (forma de la tela) · 'pos' (posiciones, cada fotograma) · 'estado' · 'error'
import * as A from './avatar.js';
import * as TL from './tela.js';
import * as MH from './mh.js';
import * as PL from './pelo.js';

let cab = null, pelo = 'no'; // (18-10) el PELO del avatar choca con la CAPUCHA: se apoya en él y no lo atraviesa (el resto de la prenda queda por debajo del pelo)
let C = null, R = null, Rp = null, S = null, sim = null, ultimaPrenda = null, corre = true, mapa = false, cuadro = 0, quieta = 0, enVuelo = 0, tela = null;
const manda = (m, tr) => self.postMessage(m, tr || []);
function montar(prenda, conservar) {
  const S2 = TL.monta(prenda, C, R, { h: 14, tela: tela || undefined, Rp }), sim2 = TL.simulador(S2, { grosor: C.premium ? 3 : 2.5 }); // (16-10: era 6,5 mm para que el pecho no asomara, pero eso son 4 cm de contorno de más: la cinturilla tiraba y la falda se arrugaba. Ahora el pecho del maniquí sale alisado de MH.construye (liso) y basta con 3 mm)
  // (18-10) se hereda la forma de la prenda anterior SOLO si se simuló en ESTE cuerpo: al cambiar de chica a chico o de talla, la tela vieja
  //  está donde estaban los brazos del cuerpo de antes y el brazo nuevo quedaba FUERA del tubo de la manga (la manga encima del brazo, como una
  //  cinta, y la piel al aire por debajo; las costuras, cerradas). En un cuerpo nuevo la prenda se coloca alrededor de él y se cose desde cero
  //  (y solo si ya estaba COSIDA: heredar una prenda a medio coser y darla por puesta saltaba el cosido poco a poco)
  let heredado = 0; if (conservar && S && S.C === C && sim && sim.cosida) { heredado = TL.hereda(S2, S); if (heredado > 0.6) sim2.yaPuesta(); }
  S = S2; sim = sim2; quieta = 0; cuadro = 0; foto = null;
  const T = TL.topologia(S); manda({ tipo: 'modelo', topo: T, pos: S.pos.slice(), heredado, gen });
}
// ================= 20-10-2026 · EL CONJUNTO (ella: «no deja vestir todo el maniquí, solo una cosa, no dos») =================
// Las prendas que se dejan PUESTAS (ya colocadas) pasan a ser parte de lo que la tela no atraviesa: en la rejilla de distancias del cuerpo,
// cada punto de la prenda puesta es una bolita de GROSOR mm; la prenda nueva se apoya encima (como una chaqueta sobre una camiseta).
let R0 = null, puestas = []; const GROSOR_PUESTA = 9;
function ponPrendaEnRejilla(R, pos, gro) {
  const { x0, y0, z0, nx, ny, nz, paso, d } = R, rad = gro + 2 * paso, at = (i, j, k) => (k * ny + j) * nx + i;
  for (let q = 0; q < pos.length; q += 3) { const x = pos[q], y = pos[q + 1], z = pos[q + 2];
    const i0 = Math.max(0, Math.floor((x - rad - x0) / paso)), i1 = Math.min(nx - 1, Math.ceil((x + rad - x0) / paso)), j0 = Math.max(0, Math.floor((y - rad - y0) / paso)), j1 = Math.min(ny - 1, Math.ceil((y + rad - y0) / paso)), k0 = Math.max(0, Math.floor((z - rad - z0) / paso)), k1 = Math.min(nz - 1, Math.ceil((z + rad - z0) / paso));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = x0 + i * paso - x, dy = y0 + j * paso - y, dz = z0 + k * paso - z, dd = Math.sqrt(dx * dx + dy * dy + dz * dz) - gro, r = at(i, j, k); if (dd < d[r]) d[r] = dd; } }
}
function aplicaPuestas() {
  if (!R || !R0) return; R.d.set(R0); puestas.forEach(p => ponPrendaEnRejilla(R, p.pos, p.grosor || GROSOR_PUESTA));
  if (Rp) { Rp.d0 = R.d.slice(); PL.ponEnRejilla(Rp, pelo, cab); } // (la capucha: cuerpo + prendas puestas + pelo)
}
let gen = 0; // (16-10: el turno del último encargo de la pantalla; vuelve con el «modelo» para que no cuente como colocada una prenda vieja)
self.onmessage = async e => { const m = e.data; if (m.gen !== undefined) gen = m.gen;
  try {
    if (m.tipo === 'avatar') {
      // el cuerpo REALISTA (MakeHuman, premium) por defecto; si faltara su archivo, el maniquí sencillo (y se dice)
      const t0 = performance.now(); let M, aviso = null, premium = false;
      let J = null; if (m.premium !== false) { try { const D = await MH.carga(); C = MH.construye(D, m.med, { sexo: m.sexo, peso: m.peso, musculo: m.musculo }); J = MH.juntasDe(D, C.pos); /* (18-10: los ojos, la boca… para que el avatar tenga cara; y el esqueleto para la pasarela) */ /* (17-10: el músculo de los cuerpos de la biblioteca: atlética, atlético) */ R = MH.rejilla(C, 9); M = MH.malla(C); /* (el pecho ya viene alisado de MH.construye: el cuerpo que se ve es el mismo con el que choca la tela) */ premium = true; } catch (x) { aviso = 'Cuerpo realista no disponible (' + (x.message || x) + '): se usa el maniquí sencillo.'; } }
      if (!premium) { C = A.construye(m.med, { sexo: m.sexo }); R = A.rejilla(C, 8); M = A.malla(C, R); }
      cab = PL.cabezaDe(M.pos, C.H); if (m.pelo) pelo = m.pelo; R0 = R.d.slice(); puestas = []; Rp = Object.assign({}, R, { d: R.d.slice() }); PL.ponEnRejilla(Rp, pelo, cab); // (la misma cabeza que mide la vista para pintar el pelo; Rp = cuerpo + pelo, solo para la capucha)
      manda({ tipo: 'avatar', malla: M, H: C.H, juntas: J, medido: C.medido, objetivo: C.objetivo, desvio: C.desvio, fuera: C.fuera || [], med: C.med, niveles: C.niveles, premium, aviso, ms: Math.round(performance.now() - t0) }, [M.pos.buffer, M.nor.buffer, M.idx.buffer]);
      if (ultimaPrenda) montar(ultimaPrenda, true);
    } else if (m.tipo === 'prenda') { ultimaPrenda = m.prenda; if (m.tela !== undefined) tela = m.tela; if (C) montar(m.prenda, m.conservar); }
    else if (m.tipo === 'revestir') { if (C && ultimaPrenda) { S = null; montar(ultimaPrenda, false); } }
    else if (m.tipo === 'pelo') { pelo = m.estilo || 'no'; if (Rp && cab) { PL.ponEnRejilla(Rp, pelo, cab); if (sim) { quieta = 0; foto = null; } } }
    else if (m.tipo === 'puestas') { puestas = m.lista || []; aplicaPuestas(); if (C && ultimaPrenda) montar(ultimaPrenda, true); } // (20-10: el CONJUNTO)
    else if (m.tipo === 'pausa') corre = false;
    else if (m.tipo === 'sigue') { corre = true; quieta = 0; foto = null; }
    else if (m.tipo === 'arrastre') { if (sim) { sim.arrastre = m.i >= 0 ? { i: m.i, p: m.p } : null; quieta = 0; foto = null; } }
    else if (m.tipo === 'mapa') { mapa = !!m.si; }
    else if (m.tipo === 'viento') { if (sim) { sim.viento = m.v || 0; quieta = 0; } }
    else if (m.tipo === 'listo') enVuelo = Math.max(0, enVuelo - 1);
  } catch (x) { manda({ tipo: 'error', msg: x.message || String(x), drew: !!x.drew }); }
};
// el bucle: ~60 pasos por segundo mientras haya algo que mover. QUIETA (16-10): se compara dónde está cada punto con dónde estaba hace
// 30 pasos (medio segundo): si en dos tandas seguidas nada se ha movido más de 0,6 mm, la prenda está COLOCADA y se descansa (antes se
// miraba el último paso, y los temblores numéricos de 0,1 mm, invisibles, hacían que no parara nunca)
let foto = null;
function bucle() {
  const t0 = performance.now();
  if (sim && corre && quieta < 90) {
    sim.paso(1 / 60, 10); cuadro++;
    if (cuadro % 30 === 0) { let m = 0; if (foto && foto.length === S.pos.length) for (let i = 0; i < S.pos.length; i += 3) { const d = (S.pos[i] - foto[i]) ** 2 + (S.pos[i + 1] - foto[i + 1]) ** 2 + (S.pos[i + 2] - foto[i + 2]) ** 2; if (d > m) m = d; } else m = 1e9;
      quieta = Math.sqrt(m) < 0.6 && sim.cosida && sim.t > 2 ? quieta + 45 : 0; foto = S.pos.slice(); }
    // (16-10, iPad: el ÚLTIMO fotograma, el de «quieta», se manda SIEMPRE: si la pantalla iba por detrás —enVuelo 2, aparato lento— se
    //  perdía y el bucle ya no volvía a avisar: la prenda se quedaba en «🍃 cayendo» para siempre aunque estuviera colocada)
    if (enVuelo < 2 || quieta >= 90) { enVuelo++; const p = S.pos.slice(); const msg = { tipo: 'pos', pos: p, t: sim.t, cosida: sim.cosida, quieta: quieta >= 90 }; const tr = [p.buffer];
      if (mapa && cuadro % 6 === 0) { const es = sim.estira(); msg.estira = es; tr.push(es.buffer); }
      manda(msg, tr); }
    if (cuadro % 30 === 0) { const ab = sim.abiertas(), d = sim.dentro(); manda({ tipo: 'estado', abiertas: ab, dentro: d, t: sim.t, cosida: sim.cosida, quieta: quieta >= 90 }); }
  }
  setTimeout(bucle, Math.max(0, 16 - (performance.now() - t0)));
}
bucle();
manda({ tipo: 'hola' });
