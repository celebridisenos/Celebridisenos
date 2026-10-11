// ================= v30.2 · 🎁 🌈 COLORES POR CAPAS (multicolor SIN AMS, con una sola bobina cada vez) =================
// La impresora se PARA a la altura que digas, cambias el filamento y sigue: un QR negro sobre blanco, un nombre de otro color, un
// llavero de dos tonos… Aquí se eligen las alturas (con el perfil de la pieza: dónde cambia su forma) y se calcula la CAPA EXACTA
// de su Bambu Studio (primera capa 0,20 mm y luego la altura de capa del perfil), con el número y la altura que ella verá en la
// barra de capas de la vista previa. Lo que se comprobó con su Bambu Studio de verdad (línea de órdenes, 11-10-2026):
//  · la capa y su altura salen IGUAL que en el G-code laminado (pruebas: test/e2e_v302_regalos.js);
//  · su Bambu NO lee las pausas guardadas dentro de un 3MF que no es proyecto suyo: el archivo las lleva igualmente (por si una
//    versión nueva las lee), pero la pausa se pone a mano en 10 segundos: clic derecho en la barra de capas → «Añadir pausa».
import { h, mount } from '../ui.js';

export const COLORES = [['#f4f4f0', 'Blanco'], ['#1b1b1f', 'Negro'], ['#e63946', 'Rojo'], ['#ffb703', 'Amarillo'], ['#2a9d8f', 'Verde'], ['#3a86ff', 'Azul'], ['#ff70a6', 'Rosa'], ['#9b5de5', 'Morado'], ['#c0c0c0', 'Plata'], ['#d4a017', 'Oro']];
const nombreColor = c => (COLORES.find(x => x[0].toLowerCase() === String(c || '').toLowerCase()) || [0, 'otro color'])[1];
const f2 = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f1 = x => (Math.round(x * 10) / 10).toLocaleString('es-ES');

// La capa de Bambu Studio en la que EMPIEZA el color nuevo: la primera cuyo corte (a media capa) queda por encima de «z».
// Capa 1 = 0,20 mm (primera capa) · capa k = 0,20 + (k − 1) × capa. Devuelve { capa, z: altura que pone la barra, desde }.
export function capaDe(z, capa = 0.16, primera = 0.2) {
  const zc = k => k === 1 ? primera : primera + (k - 1) * capa, mitad = k => k === 1 ? primera / 2 : zc(k) - capa / 2;
  let k = 1; while (mitad(k) <= z + 1e-6 && k < 100000) k++;
  return { capa: k, z: Math.round(zc(k) * 1000) / 1000, desde: Math.round((k === 1 ? 0 : zc(k - 1)) * 1000) / 1000 };
}
// altura de capa de un perfil por su nombre («0.16mm Optimal @BBL P1P» → 0,16)
export const capaPerfil = nombre => { const m = /(\d+(?:\.\d+)?)\s*mm/i.exec(String(nombre || '')); const v = m ? Number(m[1]) : 0.16; return v > 0.04 && v < 0.5 ? v : 0.16; };

// El «perfil» de la pieza: área de su corte cada poco (para ver dónde cambia la forma y proponer ahí el cambio de color)
export function perfil(m, N, pasos = 64) {
  const b = N.caja(m), z0 = b.min[2], alto = Math.max(0.2, b.max[2] - z0), L = [];
  for (let i = 0; i < pasos; i++) { const z = z0 + (i + 0.5) * alto / pasos; let a = 0; try { a = m.slice(z).area(); } catch (e) { a = 0; } L.push({ z: z - z0, a }); }
  // propuestas: donde el área cambia de golpe (más de un 30 %), redondeado a la décima
  const prop = []; for (let i = 1; i < L.length; i++) { const a = L[i - 1].a, c = L[i].a, mx = Math.max(a, c); if (mx > 1 && Math.abs(a - c) / mx > 0.3) { const z = Math.round(((L[i - 1].z + L[i].z) / 2) * 10) / 10; if (!prop.some(p => Math.abs(p - z) < alto / 20)) prop.push(z); } }
  return { L, alto, prop: prop.slice(0, 6) };
}
// el bloque del asistente. est = { cambios: [{ z, color }], base } (se guarda con las respuestas del asistente)
export function bloque(est, o) {
  const { perf, capa, alGuardar, colorBase } = o; const alto = perf ? perf.alto : 50;
  const lista = () => (est.cambios || []).slice().sort((a, b) => a.z - b.z);
  const caja = h('details.cc' + ((est.cambios || []).length ? '' : ''), { open: !!(est.cambios || []).length, 'data-cc': '1' });
  const pinta = () => {
    const L = lista(), mx = Math.max(1, ...(perf ? perf.L.map(x => x.a) : [1]));
    // el perfil de la pieza (barras = área a cada altura) con las bandas de color
    const W = 120, H = 150, bandas = [{ z: 0, color: est.base || colorBase || '#f4f4f0' }].concat(L);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'cc-svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('aria-label', 'Los colores, de abajo arriba (toca para poner un cambio a esa altura)');
    svg.innerHTML = bandas.map((b, i) => { const z1 = i + 1 < bandas.length ? bandas[i + 1].z : alto, y0 = H - (z1 / alto) * H, y1 = H - (b.z / alto) * H; return '<rect x="0" y="' + y0.toFixed(1) + '" width="' + W + '" height="' + Math.max(0.5, y1 - y0).toFixed(1) + '" fill="' + b.color + '" opacity=".9"/>'; }).join('')
      + (perf ? perf.L.map(p => { const y = H - (p.z / alto) * H, w = (p.a / mx) * (W - 10); return '<rect x="' + ((W - w) / 2).toFixed(1) + '" y="' + (y - H / perf.L.length / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (H / perf.L.length + 0.4).toFixed(1) + '" fill="rgba(0,0,0,.28)"/>'; }).join('') : '')
      + L.map(c => { const y = H - (c.z / alto) * H; return '<line x1="0" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#ff7a1a" stroke-width="1.6" stroke-dasharray="4 2"/>'; }).join('');
    svg.addEventListener('click', e => { const r = svg.getBoundingClientRect(), z = Math.round((1 - (e.clientY - r.top) / r.height) * alto * 10) / 10; if (z > 0.2 && z < alto) añade(z); });
    const filas = L.map((c, i) => { const K = capaDe(c.z, capa);
      return h('div.cc-fila', { 'data-cc-i': String(i) },
        h('label.cc-z', 'A ', h('input.inp', { type: 'number', min: 0.2, max: alto, step: 0.1, value: c.z, 'data-k': 'ccZ', onchange: e => { c.z = Math.max(0.2, Math.min(alto, Number(String(e.target.value).replace(',', '.')) || c.z)); guarda(); } }), ' mm →'),
        h('div.cc-cols', COLORES.map(([col, t]) => h('button.cc-col' + (col === c.color ? '.on' : ''), { type: 'button', title: t, 'data-col': col, style: { background: col }, onclick: () => { c.color = col; guarda(); } }))),
        h('div.cc-capa', '⏸ Pausa en la ', h('b', 'capa ' + K.capa), ' (en la barra pone ', h('b', f2(K.z) + ' mm'), ') → pon el ', h('b', nombreColor(c.color).toLowerCase())),
        h('button.cc-quita', { type: 'button', title: 'Quitar este cambio', onclick: () => { est.cambios = (est.cambios || []).filter(x => x !== c); guarda(); } }, '🗑'));
    });
    const props = perf ? perf.prop.filter(z => !L.some(c => Math.abs(c.z - z) < 0.3)) : [];
    mount(caja, h('summary', '🌈 Colores por capas (sin AMS) 🎁', L.length ? h('span.cc-n', L.length + ' cambio' + (L.length > 1 ? 's' : '')) : null),
      h('p.small.muted', 'Con UNA bobina cada vez: la impresora se para a la altura que digas, cambias el filamento y sigue. Toca el dibujo (a la altura que quieras) o usa las propuestas.'),
      h('div.cc-cuerpo', svg, h('div.cc-der',
        h('div.cc-base', 'Empieza en ', h('div.cc-cols', COLORES.map(([col, t]) => h('button.cc-col' + (col === (est.base || colorBase) ? '.on' : ''), { type: 'button', title: t, 'data-colbase': col, style: { background: col }, onclick: () => { est.base = col; guarda(); } })))),
        filas.length ? filas : h('p.small.muted', 'Sin cambios: sale de un color.'),
        props.length ? h('div.cc-props', h('small', '💡 Donde cambia la forma:'), props.map(z => h('button.btn.sm.ghost.cc-prop', { type: 'button', 'data-z': String(z), onclick: () => añade(z) }, '＋ a ' + f1(z) + ' mm'))) : null,
        h('button.btn.sm.cc-mas', { type: 'button', onclick: () => añade(Math.round(alto / 2 * 10) / 10) }, '＋ Cambio de color'))),
      // v30.2.1 · en el PC, la pausa la pone su propio Bambu Studio (bambu_pausas.go); en el móvil o la tablet, a mano
      L.length && o.conBambu && o.modo !== 'normal' ? h('div.cc-como.cc-auto', h('b', '✅ La pausa la pone TU Bambu Studio solo:'),
        h('ol', h('li', 'Pulsa ', h('b', '«🖨️ Abrir en Bambu Studio con la pausa puesta»'), ' (abajo). Se abre como proyecto suyo, con la marca en la barra de capas (capa ' + L.map(c => capaDe(c.z, capa).capa).join(', ') + ').'),
          h('li', 'Dale a ', h('b', 'Laminar placa'), ' e ', h('b', 'Imprimir'), ' como siempre.'),
          o.modo === 'ams' ? h('li', 'Cuando se pare: en la pantalla de la impresora, ', h('b', 'Filamento'), ' → elige la ranura del AMS con el color nuevo → ', h('b', 'Cargar'), ' → ', h('b', 'Reanudar'), '.')
            : h('li', 'Cuando se pare: en la pantalla de la impresora, ', h('b', 'Filamento → Descargar'), ', pon la bobina nueva, ', h('b', 'Cargar'), ' (que purgue un poco) y ', h('b', 'Reanudar'), '.')),
        h('small.muted', 'Comprobado con tu Bambu Studio: la parada va al empezar esa capa, antes de imprimir nada de ella.'))
      : L.length && o.modo !== 'normal' ? h('div.cc-como', h('b', '📋 Cómo se hace en Bambu Studio (10 segundos):'),
        h('ol', h('li', 'Ábrelo y dale a ', h('b', 'Laminar placa'), '.'),
          h('li', 'En la vista previa, sube la ', h('b', 'barra de capas'), ' de la derecha hasta la capa que pone arriba (' + L.map(c => capaDe(c.z, capa).capa).join(', ') + ').'),
          h('li', 'Clic derecho en el circulito → ', h('b', '«Añadir pausa»'), ' (con AMS: «Cambiar el filamento»). Sale una marca en la barra.'),
          h('li', 'Imprime. Cuando se pare: cambia el filamento (descarga, carga el nuevo y que purgue un poco) y dale a ', h('b', 'continuar'), '.')),
        h('small.muted', 'Calculado con capas de ' + f2(capa) + ' mm (primera de 0,20), como el perfil de arriba. Si cambias la altura de capa en Bambu, el número de capa cambia: aquí se actualiza solo si cambias el acabado.')) : null);
    window.__r8cc = { cambios: L.map(c => Object.assign({ color: c.color }, capaDe(c.z, capa), { zPieza: c.z })), capa, base: est.base || colorBase, props: perf ? perf.prop : [] };
  };
  const guarda = () => { alGuardar && alGuardar(); pinta(); };
  function añade(z) { est.cambios = (est.cambios || []).concat([{ z, color: (est.cambios || []).length % 2 ? '#f4f4f0' : '#1b1b1f' }]); caja.open = true; guarda(); }
  pinta(); return caja;
}
// para el 3MF: las pausas en la altura de su capa (Bambu: tipo 1 = pausa, con el G-code de pausa de sus impresoras)
export const paraArchivo = (cambios, capa) => (cambios || []).slice().sort((a, b) => a.z - b.z).map(c => ({ z: capaDe(c.z, capa).z, color: c.color }));
