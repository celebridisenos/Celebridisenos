// ================= 11-11-2026 · 🪄 ZONAS DE COLOR AUTOMÁTICAS (las cuentas: sin pantalla, se prueban en test/unit/colores_zonas.mjs) =================
// Biou (11-11): «el abrir el taller de colores y pausa va fatal: no se selecciona lo que quiero ni pinta… mejóralo, un motor inteligente».
// Qué pasaba: al tocar la pieza se elegía UNA capa (0,2 mm) y «Pintar» pintaba solo esa rayita.
// Ahora el taller abre en MODO FÁCIL: la pieza viene ya partida en ZONAS (trozos de altura) y se pinta la zona entera de un toque.
// El «motor» mira la forma de la pieza y busca sus ESCALONES: las caras planas que miran arriba (una meseta: lo de encima es más
// estrecho, p. ej. la placa bajo unas letras en relieve) o abajo (un vuelo). Ahí es donde un cambio de color queda limpio.
// Es geometría, no una IA que adivina: lo que propone se ve en la pieza y se puede cambiar (cortar, unir, mover).
// Sin AMS el color solo puede cambiar POR ALTURAS (la impresora se para al empezar una capa): por eso las zonas son franjas.

const r3 = x => Math.round(x * 1000) / 1000;
// dónde EMPIEZA la capa k (= donde se para la impresora antes de hacerla); igual que en colores_taller.js
export const sueloCapa = (k, capa, primera = 0.2) => (k <= 1 ? 0 : r3(primera + (k - 2) * capa));
// la capa cuyo suelo queda más cerca de la altura z (nunca la 1: antes de la primera capa no se puede parar)
export const capaDeCorte = (z, n, capa, primera = 0.2) => Math.max(2, Math.min(n, 2 + Math.round((z - primera) / capa)));

// s = sopa (9 números por triángulo, Z arriba) → los escalones de la pieza, de abajo arriba:
// [{ capa, z, area (mm² de cara plana a esa altura), tipo: 'meseta' | 'vuelo' }]
export function cortesAuto(s, n, capa, primera = 0.2, max = 5) {
  if (!s || s.length < 9 || n < 3) return [];
  let z0 = Infinity, z1 = -Infinity; for (let i = 2; i < s.length; i += 3) { if (s[i] < z0) z0 = s[i]; if (s[i] > z1) z1 = s[i]; }
  const alto = z1 - z0, planos = new Map(); let huella = 0;
  for (let p = 0; p + 8 < s.length; p += 9) {
    const ux = s[p + 3] - s[p], uy = s[p + 4] - s[p + 1], uz = s[p + 5] - s[p + 2], vx = s[p + 6] - s[p], vy = s[p + 7] - s[p + 1], vz = s[p + 8] - s[p + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz), a = L / 2; if (!(a > 1e-9)) continue;
    const c = nz / L; if (c > 0) huella += a * c; // (lo que se ve desde arriba ≈ la planta de la pieza)
    if (Math.abs(c) < 0.985) continue; // solo caras casi horizontales (hasta unos 10°)
    const z = (s[p + 2] + s[p + 5] + s[p + 8]) / 3 - z0;
    if (z < primera * 0.5 || z > alto - capa * 0.5) continue; // ni la cara de la cama ni la de arriba del todo
    const k = capaDeCorte(z, n, capa, primera), o = planos.get(k) || { capa: k, arriba: 0, abajo: 0 }; if (c > 0) o.arriba += a; else o.abajo += a; planos.set(k, o);
  }
  // un escalón cuenta si su cara plana es al menos el 4 % de la planta (y 3 mm²): lo demás son detalles o ruido de la malla
  const minimo = Math.max(3, huella * 0.04);
  const C = [...planos.values()].map(o => ({ capa: o.capa, z: sueloCapa(o.capa, capa, primera), area: Math.round(Math.max(o.arriba, o.abajo) * 10) / 10, tipo: o.arriba >= o.abajo ? 'meseta' : 'vuelo' })).filter(o => o.area >= minimo && o.capa >= 2 && o.capa <= n);
  // los más grandes primero; dos escalones a menos de 3 capas son el mismo (una zona de 1 o 2 capas no se ve ni merece una parada)
  C.sort((a, b) => b.area - a.area); const out = [];
  for (const c of C) { if (out.length >= max) break; if (c.capa > n - 2 || out.some(o => Math.abs(o.capa - c.capa) < 3)) continue; out.push(c); }
  return out.sort((a, b) => a.capa - b.capa);
}

// cortes (capas donde empieza una zona) → las zonas, de abajo arriba: [{ a, b }] (capas, las dos incluidas)
export function zonasDe(cortes, n) {
  const B = [...new Set((cortes || []).map(k => Math.round(k)).filter(k => k >= 2 && k <= n))].sort((x, y) => x - y), Z = []; let a = 1;
  B.forEach(k => { Z.push({ a, b: k - 1 }); a = k; }); Z.push({ a, b: n }); return Z;
}
// en qué zona cae la capa k
export const zonaDeCapa = (Z, k) => Math.max(0, Z.findIndex(z => k >= z.a && k <= z.b));
// partir en N trozos iguales de altura → las capas de corte
export function cortesIguales(n, partes) { const out = []; for (let i = 1; i < partes; i++) { const k = 1 + Math.round(n * i / partes); if (k >= 2 && k <= n && !out.includes(k)) out.push(k); } return out; }

// combinaciones hechas: se reparten por las zonas de abajo arriba (y vuelven a empezar)
export const COMBOS = [
  ['Blanco y negro', ['#f4f4f0', '#1b1b1f']], ['Negro y oro', ['#1b1b1f', '#d4a017']], ['Blanco y rojo', ['#f4f4f0', '#e63946']],
  ['Azul y blanco', ['#3a86ff', '#f4f4f0']], ['Negro y blanco', ['#1b1b1f', '#f4f4f0']], ['Tres colores', ['#f4f4f0', '#1b1b1f', '#e63946']],
];
export const coloresDeCombo = (combo, nZonas) => Array.from({ length: nZonas }, (_, i) => combo[i % combo.length]);
// el nombre de una zona, para él
export const nombreZona = (i, total) => (total === 1 ? 'Toda la pieza' : i === 0 ? 'Zona 1 · abajo' : i === total - 1 ? 'Zona ' + (i + 1) + ' · arriba' : 'Zona ' + (i + 1));
