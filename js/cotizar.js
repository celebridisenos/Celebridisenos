// ================= 10-11-2026 · 💶 COTIZAR UN PRODUCTO: más TAMAÑO, más PESO (resistencia) o mejor ACABADO =================
// Biou: «tengo clientes que me preguntan si puede pesar más para más resistencia, mejor calidad, o más grande, y cuánto saldría, y
// nunca sé qué responder… siempre con sus recomendaciones: no recomiendo pasar de esto si quiero un 10, 20, 30, 40 % de peso».
// Aquí van SOLO las cuentas (sin pantalla: se prueban solas en test/unit/cotizar.mjs). La ventana está en views/cotizar_ui.js.
//
// De dónde sale cada número (la verdad siempre):
//   · MEDIDO: con el programa del PC y el 3D del producto, la torre LAMINA la pieza con SU Bambu Studio tal como se ha pedido
//     (desktop/host/acabado.go → /local/cotizar-medir). Eso manda siempre.
//   · ESTIMADO: si no se puede laminar (móvil, tablet, producto sin 3D), con estas cuentas CALIBRADAS el 10-11-2026 contra 366
//     laminados de su Bambu (10 productos suyos × 5 acabados, 3 impresoras, paredes, relleno y tamaño). Error medido: ver CALIBRADO.
//   · El punto de partida es el producto tal como lo vende hoy: sus gramos y horas de la calculadora = acabado NORMAL al 100 %.

// ---------- sus impresoras (las tres SIN AMS) ----------
// P1P: 236 mm de ancho útil y no 256: tiene una esquina prohibida en la cama (una base de 250 no entraba; LEEME parte 3).
// tiempo = lo que tarda cada una respecto a la A1 mini con el mismo trabajo (medido: mediana de los laminados de calibración).
export const IMPRESORAS = [
  { k: 'a1m', nombre: 'A1 mini', x: 180, y: 180, z: 180, color: '#0ea5e9', tiempo: 1 },
  { k: 'p1p', nombre: 'P1P', x: 236, y: 236, z: 256, color: '#f97316', tiempo: 0.918 }, // medido: de 0,87 a 1,10 (50 laminados)
  { k: 'a1', nombre: 'A1', x: 256, y: 256, z: 256, color: '#16a34a', tiempo: 1.04, nueva: true }, // medido: de 0,96 a 1,08 (50)
];
export const impPorK = k => IMPRESORAS.find(I => I.k === k) || IMPRESORAS[0];

// ---------- los 5 acabados (los mismos ajustes que desktop/host/acabado.go: si cambias uno, cambia el otro) ----------
// g = gramos de más o de menos que pone la capa (además de lo que cambian paredes y relleno); t = tiempo frente al Normal, tal cual.
// 13-11-2026: Normal y Máxima con 4 paredes y 25 % cúbico, Premium con 5 y 30 % (piezas que no se rompen). t medido OTRA VEZ frente
// al Normal nuevo con su Bambu en la A1 mini, con las 3 piezas de test/unit/cotizar.mjs (CELEBRI_SOLO=unit y CELEBRI_SOLO=acab):
// Prueba 0,47 · 0,61 · 0,65; Rápida 0,69 · 0,82 · 0,80; Máxima 1,81 · 1,64 · 1,70; Premium 2,23 · 1,70 · 1,89.
// 12-11-2026 (noche): medido OTRA VEZ con las recetas de calidad (pared de fuera lenta, tiempo mínimo por capa): 6 productos suyos
// laminados en la A1 mini con las recetas de antes y las de ahora, más las 3 piezas de test/unit/cotizar.mjs (mediana; entre
// paréntesis, el más bajo y el más alto).
export const ACABADOS = [
  { k: 'prueba', e: '🧪', nombre: 'Prueba', para: 'Para ver si encaja o si gusta. No para vender.', capa: 0.28, paredes: 2, relleno: 10, color: '#0891b2', g: 1.01, t: 0.58 }, // t de 0,47 a 0,65 (la receta no cambió; el Normal sí: la pieza grande, el árbol, es la más baja)
  { k: 'rapida', e: '🏃', nombre: 'Rápida', para: 'Cuando hay prisa. Se notan algo las capas.', capa: 0.24, paredes: 2, relleno: 15, color: '#d97706', g: 1.025, t: 0.72 }, // t de 0,69 a 0,82 en las 3 piezas; en 6 productos, frente al Normal de la 60.12.3, 0,70
  { k: 'normal', e: '⭐', nombre: 'Normal', para: 'La de vender cada día. Buen equilibrio.', capa: 0.2, paredes: 4, relleno: 25, color: '#7c3aed', g: 1, t: 1 },
  { k: 'maxima', e: '💎', nombre: 'Máxima calidad', para: 'Muy lisa y con todo el detalle. Tarda bastante más.', capa: 0.12, paredes: 4, relleno: 25, color: '#2563eb', g: 0.98, t: 1.7 }, // t de 1,64 a 1,81 (13-11)
  { k: 'premium', e: '👑', nombre: 'Premium top', para: 'La mejor: lisa, más fuerte y la cara de arriba planchada.', capa: 0.12, paredes: 5, relleno: 30, planchado: true, color: '#db2777', g: 1, t: 1.89 }, // t de 1,70 a 2,23 (13-11; capa fina + planchar)
];
// lo que se le dice en la tarjeta del acabado (sale de t, medido)
const tiempoDe = t => Math.abs(t - 1) < 0.03 ? '⏱️ El tiempo de siempre' : t < 1 ? '⏱️ Un ' + Math.round((1 - t) * 100) + ' % menos de tiempo' : t < 1.95 ? '⏱️ Un ' + Math.round((t - 1) * 100) + ' % más de tiempo' : '⏱️ Unas ' + String(Math.round(t * 10) / 10).replace('.', ',') + ' veces el tiempo';
ACABADOS.forEach(a => { a.tiempo = tiempoDe(a.t); });
export const acabadoPorK = k => ACABADOS.find(a => a.k === k) || ACABADOS[2];

// ---------- lo calibrado (10-11-2026) ----------
// Ajustado el 10-11-2026 con 366 laminados de SU Bambu Studio (desktop/host/calibra_cotizador_test.go con CELEBRI_CALIBRA):
// pared: grosor de la «cáscara» = kw · paredes + c0 (mm), sobre la superficie de la pieza; relleno: el % de dentro que es plástico (× ki).
// tiempo (A1 mini, Normal): segundos ≈ ts · mm³ de cáscara + ti · mm³ de relleno + tc · capas + t0.
// Error medido de las PROPORCIONES (lo que usa: «cuántas veces más que ahora»):
//   gramos con más fuerza: 4 % de media (máx. 15 %) · gramos con otro tamaño (75–200 %): 3,5 % (máx. 10 %)
//   tiempo con más fuerza: 8 % de media (máx. 40 %) · tiempo con otro tamaño: 5 % (máx. 18 %)
// tn (12-11-2026 noche) = el Normal de ahora frente al de antes: 1,29 veces (de 1,10 a 1,45; 9 productos suyos). Las horas guardadas de cada producto
// salieron con el de antes; las que escribe él a mano (de su Bambu, con el de ahora) no llevan tn.
// 13-11-2026 · el Normal FUERTE (60.12.6: 4 paredes, 25 % cúbico, 220 °C) tarda ×1,04 el de la 60.12.3 (de 1,01 a 1,08; 7 productos
// suyos en la A1 mini) → tn = 1,29 × 1,04 = 1,34. Sus gramos: ×1,17 a ×1,40 (los cuenta razonGramos por paredes y relleno).
export const CALIBRADO = { kw: 0.22, c0: 0.6, ki: 1.25, fi: 0.773, ts: 0.0676, ti: 0.1655, tc: 4.53, t0: 1165, tn: 1.34,
  errorG: 4, errorGmax: 15, errorT: 8, errorTmax: 40, piezas: 10, laminados: 366 };
export const DENS = { PLA: 1.24, PETG: 1.27, TPU: 1.21, ABS: 1.04, ASA: 1.07 };

const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const num = v => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };

// ¿Cabe la pieza (medidas en mm, ya a su tamaño) en esa impresora? Se puede girar SOBRE LA CAMA (ancho ↔ fondo), pero el alto es el
// de imprimir (tumbarla o ponerla de pie cambia cómo sale: eso no se decide aquí).
export function cabeEn(I, m) {
  if (!m) return true;
  const p = [num(m.x), num(m.y)].sort((a, b) => b - a), c = [I.x, I.y].sort((a, b) => b - a);
  return p[0] <= c[0] && p[1] <= c[1] && num(m.z) <= I.z;
}

// gramos (sin la densidad: mm³ de plástico) con esa geometría y esos ajustes. geo = { V (mm³), A (mm²) } a tamaño 100 %
export function plastico(geo, s, paredes, relleno) {
  const V = geo.V * s * s * s, A = geo.A * s * s, t = CALIBRADO.kw * paredes + CALIBRADO.c0;
  const cas = Math.min(V, A * t), dentro = Math.max(0, V - cas);
  return { cas, rell: dentro * Math.min(1, CALIBRADO.ki * relleno / 100), total: cas + dentro * Math.min(1, CALIBRADO.ki * relleno / 100) };
}
// Sin la forma de la pieza: una pieza «media» de las calibradas (la cáscara es la fracción fi del volumen con 3 paredes),
// del tamaño que dan sus gramos de ahora (Normal al 100 %). Sin gramos, una de 60 cm³.
export function geoMedia(gramos, material) {
  const C = CALIBRADO, t3 = C.kw * 3 + C.c0, dens = (DENS[material] || DENS.PLA) / 1000; // g/mm³
  const plast = gramos > 0 ? gramos / dens : 0, V = plast > 0 ? plast / (C.fi + (1 - C.fi) * Math.min(1, C.ki * 0.15)) : 60000;
  return { V, A: C.fi * V / t3, media: true };
}

// cuántas veces más plástico que el Normal al 100 %
function razonGramos(geo, s, paredes, relleno, acab) {
  const n = plastico(geo, 1, 3, 15).total, o = plastico(geo, s, paredes, relleno).total;
  return n > 0 ? o / n * (acab ? acab.g : 1) : 1;
}
// segundos en la A1 mini con capa de 0,2 (la cuenta calibrada); alto = mm de alto de la pieza al 100 %
export function segundosA1mini(geo, s, paredes, relleno, alto) {
  const C = CALIBRADO, o = plastico(geo, s, paredes, relleno);
  return C.ts * o.cas + C.ti * o.rell + C.tc * (alto * s / 0.2) + C.t0;
}
// cuántas veces más tiempo que el Normal al 100 % en la A1 mini: lo medido del acabado (t) × lo que cambian tamaño, paredes y relleno
function razonTiempo(geo, s, paredes, relleno, acab, alto) {
  const a = acab || acabadoPorK('normal');
  const t0 = segundosA1mini(geo, 1, a.paredes, a.relleno, alto), t1 = segundosA1mini(geo, s, paredes, relleno, alto);
  return a.t * (t0 > 0 ? t1 / t0 : 1);
}
// las horas de un producto como las tarda HOY el Normal (las guardadas son del de antes: × tn; las escritas a mano, tal cual)
export const horasNormal = b => num(b && b.horas) * (b && b.horasMano ? 1 : CALIBRADO.tn);

// ---------- más PESO = más resistencia: qué paredes y relleno ----------
// Primero paredes (es donde está la fuerza: la pieza se rompe por fuera), hasta 6; luego relleno. Devuelve el escalón más corto
// que llega al % pedido, y el «límite útil»: a partir de ahí solo se añade relleno, que casi no da resistencia y sí tiempo.
export const PASOS_FUERZA = [[3, 15], [4, 15], [4, 20], [5, 20], [5, 25], [6, 25], [6, 30], [6, 35], [6, 40], [6, 50], [6, 60], [6, 80], [6, 100]];
export const LIMITE_UTIL = [6, 30]; // 6 paredes y 30 %: más allá, poco más de fuerza y mucho más tiempo
export function ajustesFuerza(pct, geo, acab) {
  const a = acab || acabadoPorK('normal'), g = geo || geoMedia(), objetivo = 1 + Math.max(0, num(pct)) / 100;
  // el acabado ya trae sus paredes y relleno: los pasos empiezan desde ahí (nunca menos que lo del acabado)
  const pasos = PASOS_FUERZA.map(([w, i]) => [Math.max(w, a.paredes), Math.max(i, a.relleno)]);
  const base = razonGramos(g, 1, a.paredes, a.relleno);
  let elegido = null;
  for (const [w, i] of pasos) { const r = razonGramos(g, 1, w, i) / base; if (r >= objetivo - 0.02) { elegido = { paredes: w, relleno: i, razon: r }; break; } }
  const ult = pasos[pasos.length - 1], max = razonGramos(g, 1, ult[0], ult[1]) / base;
  const lim = razonGramos(g, 1, Math.max(LIMITE_UTIL[0], a.paredes), Math.max(LIMITE_UTIL[1], a.relleno)) / base;
  if (!elegido) elegido = { paredes: ult[0], relleno: ult[1], razon: max, noLlega: true };
  if (num(pct) <= 0) elegido = { paredes: a.paredes, relleno: a.relleno, razon: 1 };
  return Object.assign(elegido, { limitePct: Math.round((lim - 1) * 100), maxPct: Math.round((max - 1) * 100), pasaLimite: elegido.relleno > Math.max(LIMITE_UTIL[1], a.relleno) });
}

// ---------- la cuenta entera ----------
// e = { base: { gramos, horas, medidas {x,y,z} mm (100 %) | null, geo {V,A} | null, material, imp }, acabado, imp, escala (%), fuerza (% más de peso) }
// base.imp = la impresora de esas horas (no se sabe cuál: la que sale al abrir); cambiar de impresora cambia el tiempo frente a esa.
// Devuelve gramos y horas ESTIMADOS de esa opción, los ajustes que la consiguen, las medidas nuevas y dónde cabe.
export function estimar(e) {
  const b = e.base || {}, a = acabadoPorK(e.acabado), I = impPorK(e.imp), s = Math.min(10, Math.max(0.1, (num(e.escala) || 100) / 100));
  const geo = b.geo && b.geo.V > 0 && b.geo.A > 0 ? b.geo : geoMedia(num(b.gramos), b.material);
  const alto = b.medidas && num(b.medidas.z) > 0 ? num(b.medidas.z) : (geo.h > 0 ? geo.h : Math.cbrt(geo.V));
  let f = ajustesFuerza(e.fuerza, geo, a);
  if (num(e.paredes) > 0 && num(e.relleno) > 0) { // paredes y relleno puestos a mano (pruebas, o lo que ya se laminó)
    const w = num(e.paredes), i = num(e.relleno), r0 = razonGramos(geo, 1, a.paredes, a.relleno);
    f = Object.assign({}, f, { paredes: w, relleno: i, razon: razonGramos(geo, 1, w, i) / r0, noLlega: false, pasaLimite: i > Math.max(LIMITE_UTIL[1], a.relleno) });
  }
  // 13-11-2026: los gramos guardados del producto son del Normal de antes (3 paredes, 15 %); los que escribe él a mano (de su Bambu,
  // con el Normal de ahora) ya llevan sus 4 paredes y 25 %: esos no se vuelven a subir (como las horas: horasMano no lleva tn)
  const nN = acabadoPorK('normal'), ref = b.gramosMano ? razonGramos(geo, 1, nN.paredes, nN.relleno) : 1;
  const rg = razonGramos(geo, s, f.paredes, f.relleno, a) / ref, rt = razonTiempo(geo, s, f.paredes, f.relleno, a, alto) * I.tiempo / impPorK(b.imp || I.k).tiempo;
  const g0 = num(b.gramos), h0 = horasNormal(b);
  const m = b.medidas && num(b.medidas.x) > 0 ? { x: r1(num(b.medidas.x) * s), y: r1(num(b.medidas.y) * s), z: r1(num(b.medidas.z) * s) } : null;
  return {
    gramos: g0 > 0 ? r1(g0 * rg) : 0, horas: h0 > 0 ? r2(h0 * rt) : 0, razonG: rg, razonT: rt,
    ajustes: { capa: a.capa, paredes: f.paredes, relleno: f.relleno, planchado: !!a.planchado }, fuerza: f,
    medidas: m, caben: IMPRESORAS.filter(J => cabeEn(J, m)).map(J => J.k), de: b.geo && b.geo.V > 0 ? 'forma' : 'media', escala: Math.round(s * 100),
  };
}

// la impresora que mejor le va: la más rápida en la que cabe (si cabe en todas, la P1P; si no cabe en la mini, A1 o P1P)
export function mejorImpresora(medidas) {
  const caben = IMPRESORAS.filter(I => cabeEn(I, medidas));
  if (!caben.length) return null;
  return caben.slice().sort((a, b) => a.tiempo - b.tiempo)[0].k;
}

// ---------- los CONSEJOS (siempre al menos uno, y con su porqué) ----------
// nivel: 'ok' ✅ · 'ojo' ⚠️ · 'no' ⛔
export function consejos(e, r) {
  const L = [], a = acabadoPorK(e.acabado), esc = num(e.escala) || 100, fz = num(e.fuerza) || 0, f = r.fuerza;
  // tamaño
  if (r.medidas) {
    const no = IMPRESORAS.filter(I => !r.caben.includes(I.k));
    if (!r.caben.length) L.push({ n: 'no', t: 'A este tamaño no cabe en ninguna de tus impresoras (mide ' + String(r1(Math.max(r.medidas.x, r.medidas.y, r.medidas.z) / 10)).replace('.', ',') + ' cm y la A1 llega a 25,6 cm). No lo recomiendo: habría que partirla en piezas y pegarla.' });
    else if (no.length) L.push({ n: 'ojo', t: 'A este tamaño no cabe en la ' + no.map(I => I.nombre).join(' ni en la ') + ': imprímela en la ' + IMPRESORAS.filter(I => r.caben.includes(I.k)).map(I => I.nombre).join(' o la ') + '.' });
  } else if (esc !== 100) L.push({ n: 'ojo', t: 'Este producto no tiene sus medidas en la ficha: no sé si a este tamaño cabe en la impresora. Escríbelas arriba, en «¿Cuánto mide ahora?».' });
  if (esc > 100) {
    const veces = r.razonG > 0 ? String(Math.round(r.razonG / Math.max(0.01, (fz ? r.fuerza.razon : 1)) * 10) / 10).replace('.', ',') : '';
    L.push({ n: esc > 200 ? 'ojo' : 'ok', t: 'Al ' + esc + ' % gasta unas ' + veces + ' veces el plástico (no ' + String(esc / 100).replace('.', ',') + '): al agrandar, el plástico crece más que el tamaño. ' + (esc > 200 ? 'Por encima del doble, el tiempo se dispara: cóbralo bien o pide señal.' : 'El precio ya lo lleva.') });
  }
  if (esc < 80) L.push({ n: 'ojo', t: 'Más pequeña del 80 %, los detalles finos, las letras y los encajes pueden no salir. Haz antes una de prueba.' });
  // peso / fuerza
  if (fz > 0) {
    if (f.noLlega) L.push({ n: 'no', t: 'Esta pieza no puede pesar un ' + fz + ' % más: como mucho un ' + f.maxPct + ' % (ya sale casi maciza). Si la quieren más fuerte, mejor en PETG o un poco más grande.' });
    else if (f.pasaLimite) L.push({ n: 'ojo', t: 'No recomiendo pasar de +' + f.limitePct + ' % de peso: hasta ahí la fuerza la dan las paredes; más allá solo se añade relleno, que casi no la hace más fuerte y alarga mucho la impresión. Solo cuéstale más.' });
    else L.push({ n: 'ok', t: 'Bien: +' + fz + ' % de peso con ' + f.paredes + ' paredes y ' + f.relleno + ' % de relleno. La fuerza está en las paredes, que es donde se rompe una pieza.' + (f.limitePct > fz ? ' Lo útil llega hasta +' + f.limitePct + ' %.' : '') });
  } else if (esc === 100 && e.acabado === 'normal') L.push({ n: 'ok', t: 'Así es como lo vendes ahora. Toca tamaño, peso o acabado y te digo cuánto cobrar.' });
  // acabado
  if (a.k === 'prueba') L.push({ n: 'ojo', t: 'La de prueba es para ver si encaja o si gusta: capa gruesa y poco relleno. No la vendas como acabada.' });
  if (a.k === 'rapida') L.push({ n: 'ok', t: 'Rápida: ahorra tiempo y se notan algo más las capas. Vale para piezas que no se miran de cerca.' });
  if (a.k === 'maxima') L.push({ n: 'ok', t: 'Máxima calidad: capa de 0,12. Se nota en curvas y figuras con detalle; en piezas planas o cajas casi no se ve y tarda mucho más.' });
  if (a.k === 'premium') L.push({ n: 'ok', t: 'Premium top: capa fina, 4 paredes, más relleno y la cara de arriba planchada (lisa). Para regalos y clientes que lo van a mirar de cerca. Tarda entre 1,9 y 2,9 veces lo normal según la pieza (más si tiene mucha cara de arriba que planchar).' });
  return L.length ? L : [{ n: 'ok', t: 'Sin pegas: se puede hacer así.' }];
}

// ---------- recordar la última elección (solo en este aparato; si falla, no pasa nada) ----------
export function recordar(k, v) { try { localStorage.setItem('cd.cotizar.' + k, String(v)); } catch (e) { } }
export function recordado(k) { try { return localStorage.getItem('cd.cotizar.' + k) || ''; } catch (e) { return ''; } }

// forma de la pieza (volumen y superficie) a partir de lo que devuelve analizar3D
export function geoDe(A) { return A && A.volumenCm3 > 0 && A.areaCm2 > 0 ? { V: A.volumenCm3 * 1000, A: A.areaCm2 * 100, h: A.medidas && Number(A.medidas.z) > 0 ? Number(A.medidas.z) : 0 } : null; }


// ================= 11-11-2026 · 📐 MEDIDAS A MANO y 🏷️ VARIANTES (lo que se vende de un mismo producto, a otro precio y en otro sitio) =================
// Biou: «el cotizador me tiene que dejar también manualmente las medidas y que haga el cálculo, y si he cotizado una pieza y lo pongo a la
// venta tiene que estar registrado, es decir mismo producto pero diferente precio, dónde lo vendo…».
// Bambu agranda IGUAL en todo (--scale): al escribir UNA medida, las otras dos se ajustan solas. Devuelve el % entero (10–1000).
export function escalaParaMedida(base, eje, cm) {
  const b = base && num(base[eje]), v = num(cm) * 10;
  if (!(b > 0) || !(v > 0)) return 0;
  return Math.min(1000, Math.max(10, Math.round(v / b * 100)));
}
// las tres medidas escritas a mano (cm) → mm, solo si están las tres
export function medidasDeCm(x, y, z) {
  const m = { x: num(x) * 10, y: num(y) * 10, z: num(z) * 10 };
  return m.x > 0 && m.y > 0 && m.z > 0 ? { x: r1(m.x), y: r1(m.y), z: r1(m.z) } : null;
}
// dónde lo vende (las piezas impresas: Cults y MakerWorld venden ARCHIVOS, no piezas, y no van aquí)
export const SITIOS = [
  { k: 'tienda', e: '🛍️', t: 'Tienda web' }, { k: 'wallapop', e: '🟢', t: 'Wallapop' }, { k: 'vinted', e: '🟦', t: 'Vinted' },
  { k: 'etsy', e: '🟠', t: 'Etsy' }, { k: 'instagram', e: '📸', t: 'Instagram' }, { k: 'mano', e: '🤝', t: 'En mano o encargo' }, { k: 'otro', e: '➕', t: 'Otro' },
];
export const sitioPorK = k => SITIOS.find(x => x.k === k) || { k, e: '•', t: k };
// una variante es la misma si cambia lo mismo (tamaño, fuerza y acabado); la impresora es cómo se fabrica, no lo que se vende
export const claveVariante = v => [num(v.esc ?? v.escala) || 100, num(v.fz ?? v.fuerza) || 0, v.ac ?? v.acabado ?? 'normal'].join('|');
// en palabras, corto: «+20 % de tamaño · más fuerte (+20 %) · Premium top»
export function resumenVariante(v) {
  const esc = num(v.esc ?? v.escala) || 100, fz = num(v.fz ?? v.fuerza) || 0, a = acabadoPorK(v.ac ?? v.acabado);
  const L = [esc !== 100 ? (esc > 100 ? '+' + (esc - 100) : '−' + (100 - esc)) + ' % de tamaño' : '', fz > 0 ? 'más fuerte (+' + fz + ' %)' : '', a.k !== 'normal' ? a.nombre : ''].filter(Boolean);
  return L.length ? L.join(' · ') : 'Como se vende ahora';
}
// lo que se guarda (corto: va en la configuración del negocio, que tiene sitio limitado)
export function nuevaVariante(o) {
  const m = o.medidas;
  return { id: o.id || ('v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)), pid: o.pid, f: o.fecha, n: String(o.nombre || '').trim().slice(0, 60),
    esc: num(o.escala) || 100, fz: num(o.fuerza) || 0, w: num(o.paredes) || 0, i: num(o.relleno) || 0, ac: o.acabado || 'normal', imp: o.imp || '',
    med: m && num(m.x) > 0 ? [r1(num(m.x)), r1(num(m.y)), r1(num(m.z))] : null, g: r1(num(o.gramos)), h: r2(num(o.horas)), de: o.de === 'MEDIDO' ? 'M' : 'E',
    pr: r2(num(o.precio)), min: r2(num(o.minimo)), co: r2(num(o.coste)), mv: o.movil ? 1 : 0, d: (o.sitios || []).filter(Boolean).slice(0, 8),
    nota: String(o.nota || '').trim().slice(0, 140), por: String(o.por || '').slice(0, 30) };
}
