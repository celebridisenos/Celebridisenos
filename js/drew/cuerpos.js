// ================= 👗 CelebriDREW · BIBLIOTECA DE CUERPOS y PELO (17-10-2026) =================
// Ella: «más avatares, no solo chicos: también mujeres». El avatar ya podía ser de mujer, pero salía calvo y sin elegir: parecía un chico.
// Aquí: cuerpos de mujer y de hombre listos con un toque (de las tablas de tallas de tallas.js, cambiando lo que hace falta: altura, cadera…),
// el peinado que se pone por defecto, sus colores, un dibujito para cada uno y la lectura de un avatar de CLO 3D (.avs) para confirmar.
// Sin pantalla: se prueba en Node (test/unit/drew_cuerpos.mjs).
import { TABLAS } from './tallas.js';
import { desdeTabla, compruebaMedidas } from './avatar.js';

// cambia = las medidas (cm) que se cambian sobre la talla; musculo 0–1 (cuerpo realista)
export const CUERPOS = [
  { id: 'm_petite', sexo: 'mujer', t: 'Mujer petite', d: '1,55 m · talla S', talla: 'S', pelo: 'melena', cambia: { altura: 155, entrepierna: 70, brazo: 55, espalda: 38.5 } },
  { id: 'm_estandar', sexo: 'mujer', t: 'Mujer', d: '1,65 m · talla M', talla: 'M', pelo: 'mono', cambia: { altura: 165 } },
  { id: 'm_alta', sexo: 'mujer', t: 'Mujer alta', d: '1,78 m · talla M', talla: 'M', pelo: 'coleta', cambia: { altura: 178, entrepierna: 84, brazo: 64, espalda: 43 } },
  { id: 'm_curvy', sexo: 'mujer', t: 'Mujer curvy', d: '1,65 m · cadera ancha', talla: 'L', pelo: 'melena', cambia: { altura: 165, pecho: 98, cintura: 76, cadera: 112 } },
  { id: 'm_atletica', sexo: 'mujer', t: 'Mujer atlética', d: '1,70 m · talla M', talla: 'M', pelo: 'coleta', musculo: 0.75, cambia: { altura: 170, entrepierna: 79, hombros: 41, cintura: 66, biceps: 29.5 } },
  { id: 'm_grande', sexo: 'mujer', t: 'Mujer talla grande', d: '1,71 m · talla XXL', talla: 'XXL', pelo: 'mono', cambia: { altura: 171 } }, // (a 1,65 m, los hombros y el cuello de la tabla XXL no se alcanzan)
  { id: 'h_delgado', sexo: 'hombre', t: 'Hombre delgado', d: '1,75 m · talla S', talla: 'S', pelo: 'corto', cambia: { altura: 175 } },
  { id: 'h_estandar', sexo: 'hombre', t: 'Hombre', d: '1,78 m · talla M', talla: 'M', pelo: 'corto', cambia: { altura: 178 } },
  { id: 'h_atletico', sexo: 'hombre', t: 'Hombre atlético', d: '1,82 m · talla L', talla: 'L', pelo: 'corto', musculo: 0.8, cambia: { altura: 182, entrepierna: 85, cintura: 84, hombros: 49, biceps: 36 } },
  { id: 'h_grande', sexo: 'hombre', t: 'Hombre talla grande', d: '1,83 m · talla XXL', talla: 'XXL', pelo: 'corto', cambia: { altura: 183, hombros: 50 } },
];
// las medidas (cm) de un cuerpo de la biblioteca → { med, sexo, talla, musculo, pelo }
export function cuerpo(id) {
  const C = CUERPOS.find(x => x.id === id); if (!C) throw new Error('No existe ese cuerpo.');
  const T = TABLAS[C.sexo].tallas.find(x => x.t === C.talla) || TABLAS[C.sexo].tallas[2], med = Object.assign(desdeTabla(C.sexo, T.v), C.cambia);
  return { med, sexo: C.sexo, talla: C.talla, musculo: C.musculo != null ? C.musculo : 0.5, pelo: C.pelo };
}
export const PEINADOS = [['mono', 'Moño'], ['coleta', 'Coleta'], ['melena', 'Melena'], ['corto', 'Corto'], ['no', 'Sin pelo']];
export const COLORES_PELO = [['igual', 'Como el maniquí', '#e9e4dd'], ['#1f1a17', 'Negro', '#1f1a17'], ['#4a3020', 'Castaño', '#4a3020'], ['#b8915a', 'Rubio', '#b8915a'], ['#8e3b1f', 'Pelirrojo', '#8e3b1f'], ['#9a9a9a', 'Gris', '#9a9a9a']];
export const peinadoDe = A => (A && A.pelo) || (A && A.sexo === 'hombre' ? 'corto' : 'mono');

// el DIBUJITO de un cuerpo (SVG en texto): cabeza con su peinado, hombros, cintura, cadera y piernas a la proporción de sus medidas
export function dibujo(C, med) {
  const m = med || cuerpo(C.id).med, H = 92, s = H / 185, alto = m.altura * s, y0 = 100 - alto, cx = 30, hw = m.hombros * s * 0.62, ww = m.cintura * s * 0.21, hpw = m.cadera * s * 0.2, cab = alto * 0.068;
  const yC = y0 + cab * 2, yH = y0 + alto * 0.19, yW = y0 + alto * 0.39, yHp = y0 + alto * 0.5, yE = y0 + alto * 0.53, pie = 100, piern = hpw * 0.42;
  const cuerpoD = `M${cx - hw},${yH} L${cx - ww},${yW} L${cx - hpw},${yHp} L${cx - hpw * 0.9},${yE} L${cx - piern * 0.6},${pie} L${cx - 2},${pie} L${cx - 1},${yE + 6} L${cx + 1},${yE + 6} L${cx + 2},${pie} L${cx + piern * 0.6},${pie} L${cx + hpw * 0.9},${yE} L${cx + hpw},${yHp} L${cx + ww},${yW} L${cx + hw},${yH} L${cx + 4},${yC + 1} L${cx - 4},${yC + 1} Z`;
  const pelo = { mono: `<circle cx="${cx}" cy="${y0 + 1}" r="${cab * 0.55}"/>`, coleta: `<path d="M${cx + cab * 0.7},${y0 + cab} q${cab * 1.2},${cab} ${cab * 0.4},${cab * 2.6}" stroke="currentColor" stroke-width="${cab * 0.5}" fill="none" stroke-linecap="round"/>`,
    melena: `<path d="M${cx - cab * 1.05},${y0 + cab * 1.9} q0,${-cab * 2.1} ${cab * 1.05},${-cab * 2.1} q${cab * 1.05},0 ${cab * 1.05},${cab * 2.1} z"/>`, corto: '', no: '' }[C.pelo || 'no'] || '';
  return `<svg viewBox="0 0 60 104" width="60" height="104" aria-hidden="true"><g fill="currentColor"><circle cx="${cx}" cy="${y0 + cab}" r="${cab}"/>${pelo}<path d="${cuerpoD}"/></g></svg>`;
}

// ---------- un avatar de CLO 3D (.avs) ----------
// El .avs guarda las medidas del avatar de CLO como números (cm) detrás de «listFeatureValues». Su orden NO está documentado: se leen la
// ALTURA (el primer número entre 120 y 220) y los que en los avatares de mujer de CLO van detrás (pecho, cintura, cadera), y se enseñan para
// que ella los CONFIRME con su cinta antes de usarlos. → { altura, pecho, cintura, cadera, plantilla, todos } | null
export function leeAvs(buf) {
  const b = new Uint8Array(buf), txt = new TextDecoder('latin1').decode(b), i = txt.indexOf('listFeatureValues'); if (i < 0) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), f = o => (o + 4 <= b.length ? dv.getFloat32(o, true) : NaN);
  for (let ini = i + 17; ini < i + 17 + 4; ini++) { const V = []; for (let o = ini; o + 4 <= b.length && V.length < 160; o += 4) V.push(f(o));
    const k = V.findIndex(v => v > 120 && v < 220); if (k < 0) continue; const ok = n => isFinite(V[k + n]) && V[k + n] > 20 && V[k + n] < 200;
    if (!(ok(2) && ok(5) && ok(8))) continue; const r = v => Math.round(v * 10) / 10, m = /AvatarID[^A-Za-z0-9]*([0-9.]*_?[A-Za-z]+[A-Za-z_0-9]*)/.exec(txt);
    return { altura: r(V[k]), pecho: r(V[k + 2]), cintura: r(V[k + 5]), cadera: r(V[k + 8]), plantilla: m ? m[1] : '', sexo: /female/i.test(txt) ? 'mujer' : /male/i.test(txt) ? 'hombre' : null, todos: V.slice(k, k + 64).map(r) }; }
  return null;
}
// las medidas confirmadas (altura, pecho, cintura, cadera) → un avatar completo: lo demás, de la talla de su tabla más parecida, a su altura
export function desdeConfirmadas(sexo, o) {
  const L = TABLAS[sexo].tallas, T = L.reduce((a, t) => (Math.abs(t.v.pecho - o.pecho) + Math.abs(t.v.cadera - o.cadera) < Math.abs(a.v.pecho - o.pecho) + Math.abs(a.v.cadera - o.cadera) ? t : a), L[0]);
  const med = Object.assign(desdeTabla(sexo, T.v), { altura: o.altura, pecho: o.pecho, cintura: o.cintura, cadera: o.cadera }), k = o.altura / (desdeTabla(sexo, T.v).altura || o.altura);
  ['entrepierna', 'brazo', 'espalda'].forEach(c => { med[c] = Math.round(med[c] * k * 2) / 2; }); if (sexo === 'mujer') med.bajoPecho = Math.min(med.bajoPecho, o.pecho - 6);
  compruebaMedidas(med, sexo); return { med, talla: T.t };
}
