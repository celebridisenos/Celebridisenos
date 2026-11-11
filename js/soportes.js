// ================= 11-11-2026 · 🪄 MENOS SOPORTES: las cuentas (sin pantalla: se prueban en test/unit/soportes.mjs) =================
// Biou: «nuestro programa tiene que tener la capacidad de arreglar las piezas sin soportes o lo mínimo o que se quiten superficial».
// La torre LAMINA la pieza con SU Bambu en varias posturas (desktop/host/soportes.go) y aquí se elige la mejor:
//   1. que no se caiga (apoya lo bastante para lo alta que es);
//   2. la de MENOS gramos de soporte (lo que se diferencia en menos de 0,3 g cuenta como igual);
//   3. a igualdad, la que tarda menos; y después, la que apoya más en la cama.
//   «Como está» gana a las demás si empata con la mejor: el diseño ya venía pensado así (fuerza, caras que se ven, encajes).

// el orden de probarlas (las de 45° solo si con las otras no se libra del soporte)
export const POSTURAS = [
  { k: 'tal', t: 'Como está' }, { k: 'bambu', t: 'La que elige tu Bambu' }, { k: 'x180', t: 'Boca abajo' }, { k: 'x90', t: 'Tumbada' },
  { k: 'x-90', t: 'Tumbada al revés' }, { k: 'y90', t: 'De lado' }, { k: 'y-90', t: 'Del otro lado' },
  { k: 'x45', t: 'Inclinada 45° (1)', inclinada: true }, { k: 'x-45', t: 'Inclinada 45° (2)', inclinada: true },
  { k: 'y45', t: 'Inclinada 45° (3)', inclinada: true }, { k: 'y-45', t: 'Inclinada 45° (4)', inclinada: true },
];
export const TOLERANCIA_G = 0.3;

const n = v => { const x = Number(v); return isFinite(x) ? x : 0; };
const valida = m => m && m.ok && !m.error && n(m.gramos) > 0;

// a < 0 si a es mejor que b
export function compara(a, b) {
  if (!!a.seCae !== !!b.seCae) return a.seCae ? 1 : -1;
  const ds = n(a.soporte) - n(b.soporte);
  if (Math.abs(ds) >= TOLERANCIA_G) return ds;
  if ((a.postura === 'tal') !== (b.postura === 'tal')) {
    const t = a.postura === 'tal' ? a : b, o = t === a ? b : a;
    if (n(t.segundos) <= n(o.segundos) * 1.15) return t === a ? -1 : 1; // «como está» vale si no tarda mucho más
  }
  const dt = n(a.segundos) - n(b.segundos);
  if (Math.abs(dt) > Math.max(60, 0.05 * Math.max(n(a.segundos), n(b.segundos)))) return dt;
  return n(b.apoyo) - n(a.apoyo);
}

// resultados (los de la torre, en cualquier orden) → la lista ordenada, la mejor, «como está» y lo que se ahorra
export function ordena(resultados) {
  const L = (resultados || []).filter(valida).slice().sort(compara);
  const mejor = L[0] || null, tal = L.find(m => m.postura === 'tal') || null;
  const ahorroG = mejor && tal ? Math.max(0, Math.round((n(tal.soporte) - n(mejor.soporte)) * 10) / 10) : 0;
  const ahorroMin = mejor && tal ? Math.round((n(tal.segundos) - n(mejor.segundos)) / 60) : 0;
  return { lista: L, mejor, tal, ahorroG, ahorroMin, sinSoporte: !!mejor && n(mejor.soporte) < 0.05 };
}

// ¿hace falta probar las inclinadas? solo si con las rectas todavía hay soporte (o todas se caen)
export function faltanInclinadas(resultados) {
  const o = ordena(resultados);
  return !o.mejor || o.mejor.seCae || n(o.mejor.soporte) >= TOLERANCIA_G;
}

// en palabras, para él
export function resumen(o) {
  if (!o.mejor) return 'Tu Bambu no ha podido laminarla en ninguna postura.';
  const g = v => String(Math.round(n(v) * 10) / 10).replace('.', ',') + ' g';
  if (o.mejor.postura === 'tal') return n(o.mejor.soporte) < 0.05 ? 'Ya está bien puesta: sale sin soportes tal como está.' : n(o.mejor.soporte) < TOLERANCIA_G ? 'Ya está bien puesta: apenas lleva soporte (' + g(o.mejor.soporte) + ') tal como está.' : 'Como está ya es la que menos soporte gasta (' + g(o.mejor.soporte) + '). Girarla no lo mejora: si quieres menos, hay que cambiar la pieza.';
  const ant = o.tal ? (n(o.tal.soporte) < 0.05 ? 'sin soportes' : g(o.tal.soporte) + ' de soporte') : '';
  const des = n(o.mejor.soporte) < 0.05 ? 'SIN soportes' : 'solo ' + g(o.mejor.soporte) + ' de soporte';
  return '«' + o.mejor.nombre + '»: ' + des + (ant ? ' (como está: ' + ant + ')' : '') + '.' + (o.ahorroG > 0 ? ' Ahorras ' + g(o.ahorroG) + ' de plástico' + (o.ahorroMin > 0 ? ' y ' + o.ahorroMin + ' min.' : '.') : '');
}
