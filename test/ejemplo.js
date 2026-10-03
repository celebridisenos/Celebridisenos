// Datos de EJEMPLO solo para pruebas locales (nunca se publican): productos ficticios, fotos generadas
// (cuadros de color) y una configuración de envíos de prueba. SIN descuentos: las campañas las crea cada prueba.
import zlib from 'node:zlib';

// PNG mínimo generado en memoria (degradado + círculo), para no depender de fotos reales
export function pngDemo(w, h, c1, c2) {
  const hexRgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = hexRgb(c1), b = hexRgb(c2), raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = (x + y) / (w + h), inC = (x - w / 2) ** 2 + (y - h / 2) ** 2 < (w / 4) ** 2, o = y * (w * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = inC ? 255 - Math.round(a[k] * 0.3) : Math.round(a[k] * (1 - t) + b[k] * t);
    }
  }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = buf => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const foto = (c1, c2) => ({ mime: 'image/png', ancho: 600, alto: 600, datos: pngDemo(600, 600, c1, c2).toString('base64') });

export const CONFIG_PRUEBA = {
  tienda: { nombre: 'CelebriDiseños', lema: 'Diseños impresos en 3D, hechos a tu medida', color: '#e0457b', instagram: 'celebridisenos_prueba' },
  whatsapp: { numero: '+34600000000', mensaje: 'Hola, tengo una pregunta' },
  quienes: { titulo: 'Hacemos realidad tus ideas', texto: 'Texto de prueba.', puntos: [{ icono: '🎨', titulo: 'Personalización', texto: 'A tu gusto.' }] },
  legal: { titular: '', nif: '', direccion: '', email: '', devolucionesDias: '14' },
  categorias: ['Hogar', 'Accesorios', 'Repuestos'],
  envios: {
    paises: ['ES', 'PT'], gratisDesdeCent: 6000, gratisOpcion: 'estandar',
    opciones: [
      { id: 'economico', nombre: 'Económico', descripcion: 'Recogida en taquilla', transportista: 'InPost', plazo: '3–5 días', confirmado: true, paises: ['ES'], tramos: [{ hastaG: 1000, cent: 433 }, { hastaG: 5000, cent: 579 }] },
      { id: 'estandar', nombre: 'Estándar', descripcion: 'A domicilio', transportista: 'Correos', plazo: '2–4 días', confirmado: true, tramos: [{ hastaG: 1000, cent: 1365 }, { hastaG: 5000, cent: 1710 }] },
      { id: 'rapido', nombre: 'Rápido', descripcion: 'A domicilio, prioritario', transportista: 'Correos', plazo: '1–2 días', confirmado: false, tramos: [{ hastaG: 1000, cent: 1535 }] }
    ]
  }
};

export const PRODUCTOS_PRUEBA = [
  { producto: { id: 'p_maceta', nombre: 'Maceta Luna', descripcion: 'Maceta con forma de luna.\nIdeal para suculentas.', caracteristicas: [['Material', 'PLA'], ['Medidas', '15 × 10 × 8 cm']], categoria: 'Hogar', precio_cent: 1800, destacado: true, personalizable: true, peso_g: 450, variantes: [{ nombre: 'Color', valores: ['Blanco', 'Rosa', 'Negro'] }], stock: null, plazo_dias: 3, orden: 1 }, fotos: [foto('#f7c6d9', '#e0457b'), foto('#ffffff', '#c9c9c9')] },
  { producto: { id: 'p_lampara', nombre: 'Lámpara Nube', descripcion: 'Lámpara LED con forma de nube.', caracteristicas: [['Luz', 'LED cálida']], categoria: 'Hogar', precio_cent: 3200, novedad: true, peso_g: 700, variantes: [{ nombre: 'Color', valores: ['Blanco', 'Azul'] }], stock: 5, orden: 2 }, fotos: [foto('#cfe8ff', '#5b8def')] },
  { producto: { id: 'p_llavero', nombre: 'Llavero personalizado', descripcion: 'Con tu nombre.', categoria: 'Accesorios', precio_cent: 600, peso_g: 40, stock: null, orden: 3 }, fotos: [foto('#fff1b8', '#f2b705')] },
  { producto: { id: 'p_soporte', nombre: 'Soporte de auriculares', descripcion: 'Para el escritorio.', categoria: 'Accesorios', precio_cent: 1400, peso_g: 300, stock: 2, destacado: true, orden: 4 }, fotos: [foto('#d9f7e8', '#22a06b')] },
  { producto: { id: 'p_clip', nombre: 'Clip de repuesto', descripcion: 'Repuesto para persianas.', categoria: 'Repuestos', precio_cent: 300, peso_g: 10, stock: null, orden: 5, relacionados: ['p_soporte'] }, fotos: [foto('#eeeeee', '#888888')] },
  { producto: { id: 'p_organizador', nombre: 'Organizador de escritorio', descripcion: 'Agotado ahora mismo.', categoria: 'Hogar', precio_cent: 2200, peso_g: 600, stock: 0, orden: 6 }, fotos: [foto('#ead7ff', '#8a4fff')] }
];

export async function ejemplo(s) {
  const r = await s.interno('POST', '/api/interno/config', { config: CONFIG_PRUEBA });
  if (r.status !== 200) throw new Error('config ' + JSON.stringify(r));
  for (const p of PRODUCTOS_PRUEBA) { const x = await s.interno('POST', '/api/interno/producto', p); if (x.status !== 200) throw new Error('producto ' + JSON.stringify(x)); }
}
