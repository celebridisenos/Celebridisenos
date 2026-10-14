// ================= 13-10-2026 · 📐 EL CONTORNO PARA CAD: DXF y SVG a escala real (mm) =================
// La dueña preguntó por apps como LensCAD / HelioCAD (no se han encontrado; las que sí existen, como Flatify, Photo2CAD o CadShot, hacen
// esto): de una foto de una pieza plana con una referencia sacan el CONTORNO a escala y lo dan en DXF para cualquier programa de CAD.
// Aquí la foto y la escala ya las pone el tapete de calco (r8/tapete.js); esto es la salida: el contorno de la pieza (con sus agujeros)
// en DXF (Fusion, FreeCAD, LibreCAD, cortadoras láser…) y en SVG (Inkscape, Bambu Studio, la propia CelebriR8), en milímetros.
// Los agujeros que son círculos de verdad salen como CÍRCULOS (con su centro y su radio exactos), no como polígonos.
// DXF de versión R12 (AC1009): el que abre cualquier programa.

const f = x => (Math.round(x * 10000) / 10000).toString();
const area = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; };
// ¿es un círculo? (por mínimos cuadrados; vale si ningún punto se aparta más de 0,02 mm y tiene bastantes lados)
export function comoCirculo(r, tol = 0.02) {
  if (r.length < 16) return null; let sx = 0, sy = 0; r.forEach(p => { sx += p[0]; sy += p[1]; }); const cx0 = sx / r.length, cy0 = sy / r.length;
  let Suu = 0, Svv = 0, Suv = 0, Suuu = 0, Svvv = 0, Suvv = 0, Svuu = 0;
  r.forEach(([x, y]) => { const u = x - cx0, v = y - cy0; Suu += u * u; Svv += v * v; Suv += u * v; Suuu += u * u * u; Svvv += v * v * v; Suvv += u * v * v; Svuu += v * u * u; });
  const D = Suu * Svv - Suv * Suv; if (Math.abs(D) < 1e-12) return null; const b1 = (Suuu + Suvv) / 2, b2 = (Svvv + Svuu) / 2, uc = (b1 * Svv - b2 * Suv) / D, vc = (Suu * b2 - Suv * b1) / D;
  const c = [cx0 + uc, cy0 + vc], R = Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / r.length), desv = Math.max(...r.map(p => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - R)));
  return desv <= tol ? { c, r: R } : null;
}
// anillos [[x, y]…] en mm (el de fuera y los agujeros) → texto DXF
export function dxf(anillos, o = {}) {
  const L = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'], capa = o.capa || 'CONTORNO';
  let circulos = 0;
  for (const r of anillos) { const C = o.circulos !== false ? comoCirculo(r) : null;
    if (C) { circulos++; L.push('0', 'CIRCLE', '8', capa, '10', f(C.c[0]), '20', f(C.c[1]), '30', '0', '40', f(C.r)); continue; }
    L.push('0', 'POLYLINE', '8', capa, '66', '1', '70', '1', '10', '0', '20', '0', '30', '0'); for (const p of r) L.push('0', 'VERTEX', '8', capa, '10', f(p[0]), '20', f(p[1]), '30', '0'); L.push('0', 'SEQEND', '8', capa); }
  L.push('0', 'ENDSEC', '0', 'EOF'); return { texto: L.join('\r\n') + '\r\n', circulos };
}
// → texto SVG (mm reales: width/height en mm, viewBox en mm; la Y del SVG va hacia abajo: se da la vuelta)
export function svg(anillos, o = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; anillos.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
  const m = 2, W = x1 - x0 + 2 * m, H = y1 - y0 + 2 * m, P = q => f(q[0] - x0 + m) + ' ' + f(y1 - q[1] + m);
  const d = anillos.map(r => 'M' + r.map(P).join(' L') + ' Z').join(' ');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + f(W) + 'mm" height="' + f(H) + 'mm" viewBox="0 0 ' + f(W) + ' ' + f(H) + '">\n<title>' + String(o.nombre || 'contorno').replace(/[<&>]/g, '') + ' · ' + f(x1 - x0) + ' × ' + f(y1 - y0) + ' mm · CelebriDiseños</title>\n<path d="' + d + '" fill="#2457d6" fill-opacity="0.15" stroke="#000" stroke-width="0.1" fill-rule="evenodd"/>\n</svg>\n';
}
// una pieza (Manifold) → los anillos de su HUELLA (cortada a 0,05 mm de la cama), en mm
export function huella(N, m) { const b = N.caja(m), sec = m.slice(b.min[2] + Math.min(0.05, (b.max[2] - b.min[2]) / 2)); return sec.toPolygons().map(r => r.map(p => [p[0], p[1]])).filter(r => r.length >= 3 && Math.abs(area(r)) > 1e-4); }
