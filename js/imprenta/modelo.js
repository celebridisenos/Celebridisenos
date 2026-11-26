// ================= 25-11-2026 · 🖨️ IMPRENTA · el MODELO de una pieza (contrato común del Estudio) =================
// Una pieza (tarjeta, pegatina, etiqueta, cartel…) es un objeto JSON con su tamaño REAL en milímetros y una lista de CAPAS.
// Todo lo demás (editor, hoja de corte, PDF, impresora, biblioteca, juegos) lee y escribe esta misma forma. Aquí no hay
// nada de pantalla: se puede probar con node.
//
//   doc = {
//     v: 1, id, nombre, tipo,             // tipo: 'tarjeta' | 'pegatina' | 'etiqueta' | 'cartel' | 'folleto' | 'juego' | 'envio' | 'libre'
//     w, h,                               // tamaño FINAL (al cortar) en mm
//     sangrado,                           // mm que el fondo sale por fuera del corte (0 = sin sangrado)
//     seguridad,                          // mm por dentro del corte donde no debe ir texto (guía; no se imprime)
//     forma, radio,                       // 'rect' | 'redondo' (esquinas de radio mm) | 'circulo' | 'ovalo'
//     fondo,                              // '#hex' | { tipo: 'degradado', a: '#hex', b: '#hex', ang: grados }
//     capas: [capa],                      // de abajo arriba (la última se pinta encima)
//     dorso: null | { fondo, capas },     // la otra cara (doble cara), mismas medidas
//     meta: { estilo, material, mensajeId, aprobado, notas, creado, cambiado }
//   }
//   capa = { id, t, nombre, x, y, w, h, rot, op, oculta, bloqueada, ...lo de su tipo }
//     x, y = esquina de arriba a la izquierda de la caja, en mm desde la esquina del CORTE (puede ser negativo: entra en el sangrado)
//     rot  = grados, girando sobre el centro de la caja · op = 0…1
//   t = 'texto':  texto, fuente, peso, tam (pt), color, alin ('izq'|'centro'|'der'), vAlin ('arriba'|'centro'|'abajo'),
//                 interlinea (×tam), espaciado (milésimas de em), mayus, cursiva, ajustar (encoge la letra hasta que quepa),
//                 curva (mm de radio: >0 por arriba del círculo, <0 por abajo, 0 recto), porRellenar (true: falta un dato real tuyo),
//                 adorno (true: letra decorativa que puede salirse del corte a propósito)
//   t = 'imagen': src (dataURL · 'logo:celebri' · 'logo:celebri-blanco' · 'logo:celebri-grafito' · 'logo:celebri-circulo'),
//                 ajuste ('cubrir'|'contener'|'estirar'), radio (mm), hueco (qué foto va aquí, si aún no la hay)
//   t = 'forma':  forma ('rect'|'elipse'|'linea'|'triangulo'|'estrella'|'rombo'), relleno ('#hex'|''), borde ('#hex'|''), grosor (mm), radio (mm)
//   t = 'qr':     datos, clase ('interno'|'comercial'), color, fondoQr, margen (módulos de blanco alrededor, 0…4)
//   t = 'dibujo': trazos: [{ p: [[x,y]…] en mm desde la esquina de la caja, cerrado, grosor (mm), color, relleno }], w0, h0 (caja original:
//                 si la caja cambia de tamaño, el dibujo se estira con ella)

export const VERSION = 1;
export const PT_MM = 25.4 / 72;                 // 1 punto tipográfico en mm
export const mm2px = (mm, dpi) => mm / 25.4 * dpi;
export const r2 = v => Math.round(v * 100) / 100;

// La familia visual del ecosistema (FAMILIA_VISUAL.md) + lo que piden las piezas impresas
export const COLORES = {
  grafito: '#1F2328', carbon: '#2B3036', piedra: '#8A8F98', hueso: '#F6F5F2', blanco: '#FFFFFF',
  turquesa: '#00A6A6', turquesaLogo: '#00CDE6', ambar: '#E0922F', lila: '#7B61C9', pizarra: '#4A6FA5',
  pino: '#0F3D2E', oro: '#C9A227', arandano: '#8E1B2E', negro: '#000000'
};
// Letras que lleva CD dentro (todas OFL). Manrope solo si la sesión de CD la ha metido (si no, se pinta con Inter).
export const FUENTES = [
  { id: 'Inter', t: 'Inter (limpia)', pesos: [200, 300, 400, 500, 600] },
  { id: 'Manrope', t: 'Manrope (la del ecosistema)', pesos: [400, 500, 600, 700, 800] },
  { id: 'Instrument Serif', t: 'Instrument Serif (revista, cursiva)', pesos: [400], cursiva: true },
  { id: 'Great Vibes', t: 'Great Vibes (ligada, solo portadas)', pesos: [400] },
  { id: 'monospace', t: 'Mono (técnica)', pesos: [400, 700] }
];

// Papeles de la Epson ET-2860 (leídos de SU controlador el 25-11-2026: PrintCapabilities). Sin borde: NO. Doble cara automática: NO.
// Margen que la impresora no pinta: 3 mm por cada lado (zona imprimible 204 × 291 en A4).
export const PAPELES = [
  { id: 'A4', t: 'A4', w: 210, h: 297, ticket: 'psk:ISOA4' },
  { id: 'A5', t: 'A5', w: 148, h: 210, ticket: 'psk:ISOA5' },
  { id: 'A6', t: 'A6', w: 105, h: 148, ticket: 'psk:ISOA6' },
  { id: '10x15', t: '10 × 15 cm (foto)', w: 101.6, h: 152.4, ticket: 'ns0000:Fullsize4x6' },
  { id: '13x18', t: '13 × 18 cm (foto)', w: 127, h: 177.8, ticket: 'psk:NorthAmerica5x7' },
  { id: 'postal', t: 'Postal 100 × 148', w: 100, h: 148, ticket: 'ns0000:Postcard100x148' },
  { id: 'carta', t: 'Carta (EE. UU.)', w: 215.9, h: 279.4, ticket: 'psk:NorthAmericaLetter' }
];
export const MARGEN_EPSON = 3; // mm (controlador: ImageableArea origen 3 mm, 204 × 291 en A4)
export const papel = id => PAPELES.find(p => p.id === id) || PAPELES[0];

// Tamaños de pieza habituales (mm)
export const TAMANOS = [
  { id: 'visita', t: 'Tarjeta de visita 85 × 55', w: 85, h: 55, tipo: 'tarjeta' },
  { id: 'a7', t: 'Tarjeta A7 105 × 74', w: 105, h: 74, tipo: 'tarjeta' },
  { id: 'cuadrada', t: 'Tarjeta cuadrada 70 × 70', w: 70, h: 70, tipo: 'tarjeta' },
  { id: 'postal', t: 'Postal A6 148 × 105', w: 148, h: 105, tipo: 'tarjeta' },
  { id: 'cierre40', t: 'Pegatina de cierre Ø 40', w: 40, h: 40, tipo: 'pegatina', forma: 'circulo' },
  { id: 'cierre50', t: 'Pegatina de cierre Ø 50', w: 50, h: 50, tipo: 'pegatina', forma: 'circulo' },
  { id: 'colgante', t: 'Etiqueta colgante 50 × 90', w: 50, h: 90, tipo: 'etiqueta', forma: 'redondo', radio: 4 },
  { id: 'expo', t: 'Etiqueta de exposición 60 × 40', w: 60, h: 40, tipo: 'etiqueta' },
  { id: 'coleccion', t: 'Coleccionable 63 × 88', w: 63, h: 88, tipo: 'tarjeta', forma: 'redondo', radio: 3 },
  { id: 'a6', t: 'Folleto A6 105 × 148', w: 105, h: 148, tipo: 'folleto' },
  { id: 'a5', t: 'Folleto A5 148 × 210', w: 148, h: 210, tipo: 'folleto' },
  { id: 'mostrador', t: 'Cartel de mostrador A5', w: 148, h: 210, tipo: 'cartel' },
  { id: 'a4', t: 'Cartel A4 210 × 297', w: 210, h: 297, tipo: 'cartel' }
];

let serie = 0;
export function nuevoId(pref) { serie = (serie + 1) % 1e6; return (pref || 'c') + Date.now().toString(36) + serie.toString(36) + Math.floor(Math.random() * 1296).toString(36); }

export function nuevoDoc(o = {}) {
  const t = o.tamano ? TAMANOS.find(x => x.id === o.tamano) : null;
  const d = {
    v: VERSION, id: o.id || nuevoId('d'), nombre: o.nombre || (t ? t.t : 'Pieza nueva'), tipo: o.tipo || (t && t.tipo) || 'libre',
    w: num(o.w, t ? t.w : 85), h: num(o.h, t ? t.h : 55), sangrado: num(o.sangrado, 2), seguridad: num(o.seguridad, 3),
    forma: o.forma || (t && t.forma) || 'rect', radio: num(o.radio, t && t.radio != null ? t.radio : 0),
    fondo: o.fondo || COLORES.blanco, capas: (o.capas || []).map(c => nuevaCapa(c)), dorso: o.dorso ? { fondo: o.dorso.fondo || COLORES.blanco, capas: (o.dorso.capas || []).map(c => nuevaCapa(c)) } : null,
    meta: Object.assign({ estilo: '', material: '', mensajeId: '', aprobado: false, notas: '', creado: new Date().toISOString(), cambiado: new Date().toISOString() }, o.meta || {})
  };
  return d;
}
const num = (v, def) => { const n = Number(v); return v === '' || v === null || v === undefined || !isFinite(n) ? def : n; };

const BASE = { x: 0, y: 0, w: 20, h: 10, rot: 0, op: 1, oculta: false, bloqueada: false };
const DEF = {
  texto: { texto: 'Texto', fuente: 'Inter', peso: 500, tam: 10, color: COLORES.grafito, alin: 'izq', vAlin: 'arriba', interlinea: 1.2, espaciado: 0, mayus: false, cursiva: false, ajustar: true, curva: 0, porRellenar: false },
  imagen: { src: '', ajuste: 'contener', radio: 0, hueco: '' },
  forma: { forma: 'rect', relleno: COLORES.turquesa, borde: '', grosor: 0.3, radio: 0 },
  qr: { datos: '', clase: 'comercial', color: COLORES.grafito, fondoQr: COLORES.blanco, margen: 1 },
  dibujo: { trazos: [], w0: 0, h0: 0 }
};
export const TIPOS_CAPA = Object.keys(DEF);
export function nuevaCapa(c = {}) {
  const t = TIPOS_CAPA.includes(c.t) ? c.t : 'texto';
  const o = Object.assign({}, BASE, DEF[t], c, { t, id: c.id || nuevoId('c') });
  if (t === 'dibujo') { if (!o.w0) o.w0 = o.w; if (!o.h0) o.h0 = o.h; }
  if (!o.nombre) o.nombre = nombreCapa(o);
  return o;
}
export function nombreCapa(c) {
  if (c.t === 'texto') return (String(c.texto || '').split('\n')[0].slice(0, 28) || 'Texto vacío');
  return { imagen: String(c.src || '').startsWith('logo:') ? 'Logo' : 'Imagen', forma: 'Forma', qr: c.clase === 'interno' ? 'QR interno' : 'QR', dibujo: 'Dibujo' }[c.t] || 'Capa';
}
export const copia = o => JSON.parse(JSON.stringify(o));
export function duplicarCapa(c) { const n = copia(c); n.id = nuevoId('c'); n.x += 2; n.y += 2; return n; }

// Caja que ocupa una capa girada (para elegir con el ratón y para comprobar que no se sale)
export function cajaGirada(c) {
  const a = (Number(c.rot) || 0) * Math.PI / 180, cx = c.x + c.w / 2, cy = c.y + c.h / 2, co = Math.abs(Math.cos(a)), si = Math.abs(Math.sin(a));
  const W = c.w * co + c.h * si, H = c.w * si + c.h * co;
  return { x: cx - W / 2, y: cy - H / 2, w: W, h: H };
}
// ¿El punto (mm) cae dentro de la capa (teniendo en cuenta el giro)?
export function dentro(c, px, py) {
  const a = -(Number(c.rot) || 0) * Math.PI / 180, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const dx = px - cx, dy = py - cy, x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(x) <= c.w / 2 && Math.abs(y) <= c.h / 2;
}

// ¿Se distinguen? Contraste entre dos colores (1 = iguales … 21 = negro sobre blanco)
export function hex3(h) { let s = String(h || '').replace('#', ''); if (s.length === 3) s = s.replace(/./g, c => c + c); const n = parseInt(s, 16); return isFinite(n) && s.length === 6 ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [0, 0, 0]; }
export function contraste(a, b) {
  const L = h => { const v = hex3(h).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Los QR INTERNOS (los del taller): el sello «S1086» de ahora o el código «CEB-2026-000123» de antes. Nada más.
export const RX_SELLO = /^S\d{1,7}$/, RX_CEB = /^CEB-\d{4}-\d{6}$/;
export const esInterno = t => RX_SELLO.test(String(t || '')) || RX_CEB.test(String(t || ''));

// Revisión antes de imprimir: lo que se corta mal o no se lee. Devuelve [{ nivel: 'aviso'|'error', capa, cara, texto }]
// opts.tamImagen(src) → { w, h } en píxeles (si se sabe): así se avisa de una foto que saldría borrosa.
// opts.cajaTexto(capa) → la caja que ocupan de verdad las letras (si no, la caja entera de la capa).
export function revisar(doc, opts = {}) {
  const out = [], s = Number(doc.seguridad) || 0, redonda = doc.forma === 'circulo' || doc.forma === 'ovalo';
  const fuera = b => { // ¿se sale de la zona segura?
    if (!redonda) return b.x < s - 0.05 || b.y < s - 0.05 || b.x + b.w > doc.w - s + 0.05 || b.y + b.h > doc.h - s + 0.05;
    const rx = doc.w / 2 - s, ry = doc.h / 2 - s;
    return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].some(([x, y]) => { const dx = (x - doc.w / 2) / rx, dy = (y - doc.h / 2) / ry; return dx * dx + dy * dy > 1.01; });
  };
  [['frente', doc.capas || []], ['dorso', (doc.dorso && doc.dorso.capas) || []]].forEach(([cara, capas]) => capas.forEach(c => {
    if (c.oculta) return;
    const b = cajaGirada(c), pon = (nivel, texto) => out.push({ nivel, capa: c.id, cara, texto });
    if (c.t === 'texto' && String(c.texto || '').trim()) {
      const caja = opts.cajaTexto && !c.curva ? opts.cajaTexto(c) || b : b;
      if (!c.adorno && !c.curva && fuera(caja)) pon('aviso', '«' + nombreCapa(c) + '» está muy cerca del corte (' + s + ' mm): al recortar se puede comer.');
      if (Number(c.tam) < 5) pon('aviso', '«' + nombreCapa(c) + '» tiene la letra muy pequeña (' + c.tam + ' pt): en papel cuesta leerla.');
      if (c.porRellenar) pon('error', 'Falta rellenar «' + nombreCapa(c) + '».');
    }
    if (c.t === 'qr') {
      const d = String(c.datos || '').trim();
      if (!d) pon('error', 'Hay un QR sin contenido.');
      else if (c.clase === 'interno' && !esInterno(d)) pon('error', 'Un QR interno solo puede llevar el sello (S + nº) o el código CEB.');
      else if (c.clase === 'comercial' && esInterno(d)) pon('error', 'Un QR para clientes no puede llevar el sello de un pedido.');
      else if (c.clase === 'comercial' && !/^https:\/\//i.test(d)) pon('error', 'Un QR para clientes tiene que ser una dirección https.');
      if (Math.min(c.w, c.h) < 12) pon('aviso', 'Un QR de menos de 12 mm puede no leerse con el móvil.');
      const suma = h => hex3(h).reduce((x, y) => x + y);
      if (contraste(c.color || '#000', c.fondoQr || '#fff') < 4 || suma(c.color || '#000') > suma(c.fondoQr || '#fff')) pon('error', 'Ese QR no se va a leer: hace falta oscuro sobre claro.');
      if (b.x < 0 || b.y < 0 || b.x + b.w > doc.w || b.y + b.h > doc.h) pon('error', 'Un QR se sale del corte: no se podrá leer.');
    }
    if (c.t === 'imagen') {
      if (!c.src) pon(c.hueco ? 'error' : 'aviso', c.hueco ? 'Falta la foto: ' + c.hueco + '.' : 'Hay una imagen vacía.');
      else if (opts.tamImagen) { const t = opts.tamImagen(c.src); if (t && t.w) { const ppp = Math.round((c.ajuste === 'contener' ? Math.max(t.w / c.w, t.h / c.h) : Math.min(t.w / c.w, t.h / c.h)) * 25.4); if (ppp < 150) pon('aviso', 'Una imagen se verá borrosa en papel (' + ppp + ' ppp; lo bueno es 200 o más).'); } }
    }
  }));
  return out;
}

// ---------- Deshacer / rehacer ----------
export function historial(inicial, max = 80) {
  let L = [JSON.stringify(inicial)], i = 0;
  return {
    pon(doc) { const s = JSON.stringify(doc); if (s === L[i]) return false; L = L.slice(0, i + 1); L.push(s); if (L.length > max) L.shift(); i = L.length - 1; return true; },
    atras() { if (i > 0) { i--; return JSON.parse(L[i]); } return null; },
    adelante() { if (i < L.length - 1) { i++; return JSON.parse(L[i]); } return null; },
    get puedeAtras() { return i > 0; }, get puedeAdelante() { return i < L.length - 1; }, get largo() { return L.length; }
  };
}
// ---------- Guías que imantan: al mover una caja se pega a bordes, centros y zona segura de la pieza y de las demás capas ----------
// caja = {x,y,w,h} · devuelve { x, y, guias: [{ eje:'x'|'y', v }] }
export function imantar(caja, doc, otras = [], tol = 1) {
  const s = Number(doc.seguridad) || 0, vx = [0, s, doc.w / 2, doc.w - s, doc.w], vy = [0, s, doc.h / 2, doc.h - s, doc.h];
  otras.forEach(c => { const b = cajaGirada(c); vx.push(b.x, b.x + b.w / 2, b.x + b.w); vy.push(b.y, b.y + b.h / 2, b.y + b.h); });
  const busca = (p, t, vals) => { let m = null; for (const v of vals) for (const o of [t / 2, 0, t]) { const d = v - (p + o); if (Math.abs(d) <= tol && (!m || Math.abs(d) < Math.abs(m.d) - 1e-9)) m = { d, v }; } return m; };
  const ax = busca(caja.x, caja.w, vx), ay = busca(caja.y, caja.h, vy), guias = [];
  if (ax) guias.push({ eje: 'x', v: ax.v }); if (ay) guias.push({ eje: 'y', v: ay.v });
  return { x: caja.x + (ax ? ax.d : 0), y: caja.y + (ay ? ay.d : 0), guias };
}
// ---------- Cambiar el tamaño tirando de una esquina o un lado, aunque la capa esté girada ----------
// asa: combinación de 'n','s','e','o' ('ne','s'…) · dx, dy en mm de la pieza · proporcion: mantiene ancho/alto
export function redimensionar(c, asa, dx, dy, proporcion, min = 1) {
  const a = (Number(c.rot) || 0) * Math.PI / 180, lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
  let w = c.w, h = c.h; const ex = asa.includes('e') ? 1 : asa.includes('o') ? -1 : 0, ey = asa.includes('s') ? 1 : asa.includes('n') ? -1 : 0;
  if (ex) w = Math.max(min, c.w + lx * ex); if (ey) h = Math.max(min, c.h + ly * ey);
  if (proporcion && c.w && c.h) { const r = c.w / c.h; if (ex && ey) { if (w / r > h) h = w / r; else w = h * r; } else if (ex) h = w / r; else w = h * r; }
  // el lado contrario se queda quieto (también con giro)
  const sx = ex * (w - c.w) / 2, sy = ey * (h - c.h) / 2, cx = c.x + c.w / 2 + sx * Math.cos(a) - sy * Math.sin(a), cy = c.y + c.h / 2 + sx * Math.sin(a) + sy * Math.cos(a);
  return { x: r2(cx - w / 2), y: r2(cy - h / 2), w: r2(w), h: r2(h) };
}
// ---------- Orden de las capas ----------
export function mover(capas, id, a) { // a: 'arriba' | 'abajo' | 'frente' | 'fondo'
  const i = capas.findIndex(c => c.id === id); if (i < 0) return capas; const L = capas.slice(), [c] = L.splice(i, 1);
  L.splice({ arriba: Math.min(L.length, i + 1), abajo: Math.max(0, i - 1), frente: L.length, fondo: 0 }[a], 0, c); return L;
}
export const caraDe = (doc, cara) => cara === 'dorso' ? doc.dorso || { fondo: COLORES.blanco, capas: [] } : doc;

// Para guardar: quita lo que no hace falta y comprueba la forma básica
export function limpiar(doc) {
  const d = nuevoDoc(copia(doc));
  d.id = doc.id || d.id; d.meta.cambiado = new Date().toISOString();
  return d;
}
export function valido(doc) {
  return !!(doc && typeof doc === 'object' && Number(doc.w) > 0 && Number(doc.h) > 0 && Number(doc.w) <= 1000 && Number(doc.h) <= 1000 && Array.isArray(doc.capas));
}
