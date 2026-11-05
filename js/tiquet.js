// 🧾 TÍQUET DE COMPRA → PRECIO Y TIPO (01-11-2026, pedido por Biou)
// Haces una foto del tíquet de embalaje/material y el programa saca solo el PRECIO total y el TIPO
// (sobre, caja, kraft, precinto, relleno, burbuja). Usa el lector de letras del PC (Windows.Media.Ocr,
// gratis y sin internet) que ya tiene el programa (desktop.ocr). Si algo falla, el carrito sigue igual:
// solo hay que escribir el precio a mano.
import { desktop } from './desktop.js';
import { toast } from './ui.js';

const UNIDAD = /^\s*(uds?\b|unidad|x\b|cm|mm|m\b|ml|cl|l\b|kg|gr?\b|%|piezas?|pcs?)/i;
function precioDe(txt) {
  const re = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|\d+,\d{1,2}|\d+\.\d{1,2}|\d+)(?:\s*(?:€|eur|euros))?/gi;
  const out = []; let m;
  while ((m = re.exec(txt)) !== null) {
    const resto = txt.slice(m.index + m[0].length), antes = txt.slice(0, m.index), tenia = /€|eur/i.test(m[0]);
    if (!tenia && UNIDAD.test(resto)) continue;        // "50 uds", "25x18", "1 m" -> cantidad/medida, no precio
    if (/x\s*$/i.test(antes) && !tenia) continue;      // segundo número de "25x18x10"
    let s = m[1];
    if (s.includes(',')) s = s.replace(/[.\s]/g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length === 1 && /\.\d{1,2}$/.test(s)) { }
    else s = s.replace(/[.\s]/g, '');
    const v = parseFloat(s);
    if (!isNaN(v)) out.push({ v, tenia });
  }
  return out;
}
const TIPOS = [
  ['sobre', /\bsobre(s)?\b|bolsa(s)?|mailer|acolchad/i],
  ['caja', /\bcaja(s)?\b|cart[oó]n|\bbox\b/i],
  ['kraft', /\bkraft\b|papel\s*kraft/i],
  ['precinto', /precinto|cinta\s*(de\s*)?embalar|adhesiv|\btape\b/i],
  ['relleno', /relleno|papel\s*(de\s*)?relleno|\bfill\b/i],
  ['burbuja', /burbuja|bubble|pluriball|pl[aá]stico de burbuja/i],
];
const MALA = /sub\s*total|base imponible|efectivo|cambio|entregad|devol|cantidad|art[ií]culos|unidades|\biva\b|descuento/i;
const BUENA = /\btotal\b|importe|\bprecio\b|a pagar|cobrar|pagado/i;

export function parseTiquet(lineas) {
  const L = (lineas || []).map(s => String(s).trim()).filter(Boolean);
  const texto = L.join('\n');
  let precio = null;
  for (const l of L) {                                  // 1) la línea de "total/precio/a pagar" (saltando subtotal/efectivo/cambio/iva)
    if (BUENA.test(l) && !MALA.test(l)) { const p = precioDe(l); if (p.length) { precio = p[p.length - 1].v; break; } }
  }
  if (precio == null) {                                 // 2) si no, el importe mayor (mejor con €)
    const todos = precioDe(texto).filter(x => x.v > 0 && x.v < 100000), conEuro = todos.filter(x => x.tenia);
    const cand = (conEuro.length ? conEuro : todos).sort((a, b) => b.v - a.v);
    if (cand.length) precio = cand[0].v;
  }
  let tipo = 'otro';
  for (const [t, re] of TIPOS) if (re.test(texto)) { tipo = t; break; }
  return { precio: precio == null ? null : Math.round(precio * 100) / 100, tipo };
}

// Lee una imagen (File/Blob) con el OCR del PC y devuelve { precio, tipo }
export async function leeTiquet(blob) {
  const r = await desktop.ocr(blob);
  return parseTiquet((r && r.lineas) || []);
}

// Botón listo para el carrito: al elegir/hacer la foto, llama onResult({precio, tipo}).
// Devuelve null si no estamos en el PC (el OCR solo corre ahí) para no enseñar un botón que no haría nada.
export function botonFotoTiquet(onResult) {
  if (!desktop || !desktop.on) return null;
  const file = document.createElement('input');
  file.type = 'file'; file.accept = 'image/*'; file.capture = 'environment'; file.style.display = 'none';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn sm alm2-foto-tiquet'; b.textContent = '📸 Foto del tíquet';
  b.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    const antes = b.textContent; b.disabled = true; b.textContent = 'Leyendo el tíquet…';
    try {
      const r = await leeTiquet(f);
      if (r && r.precio != null) {
        onResult(r);
        toast('🧾 Leído del tíquet: ' + r.precio + ' €' + (r.tipo && r.tipo !== 'otro' ? ' · ' + r.tipo : '') + '. Repásalo por si acaso.', 'ok', 6000);
      } else {
        toast('No he pillado el precio en la foto. Escríbelo a mano (o prueba con una foto más recta y clara).', 'warn', 7000);
      }
    } catch (e) {
      toast('No pude leer la foto (' + (e.message || e) + '). Escribe el precio a mano.', 'warn', 7000);
    } finally { b.disabled = false; b.textContent = antes; }
  });
  const wrap = document.createElement('span'); wrap.className = 'alm2-foto-wrap';
  wrap.appendChild(b); wrap.appendChild(file);
  return wrap;
}
