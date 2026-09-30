// ================= Cálculos comerciales exactos =================
// Los números NUNCA los calcula el modelo de IA: se calculan aquí con fórmulas exactas
// y la IA solo los explica. Así "me cuesta 12 € y quiero ganar un 40 %" siempre da bien.
const CL = (typeof window !== 'undefined' && window.CL) || (typeof globalThis !== 'undefined' && globalThis.CL);

const num = s => parseFloat(String(s).replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
export const eur = x => (Math.round(x * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const pct = x => (Math.round(x * 1000) / 10).toLocaleString('es-ES') + ' %';
const NUM = '(\\d+(?:[.,]\\d+)?)';
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Precios "psicológicos" cercanos (x,90 / x,95 / redondo) sin bajar del precio mínimo
function roundings(p) {
  const out = new Set();
  const f = Math.floor(p);
  [f + 0.9, f + 0.95, Math.ceil(p), f + 1.9].forEach(v => { if (v >= p - 0.005) out.add(Math.round(v * 100) / 100); });
  return [...out].sort((a, b) => a - b).slice(0, 3);
}

// Devuelve { lineas: [...], datos: {...}, tipo } o null si la pregunta no pide cálculos
export function salesCalc(question, opts = {}) {
  const q = norm(question).replace(/(\d)\s*(eur|euros|€)/g, '$1 €');
  const iva = opts.iva ?? 0.21;
  const lines = [], datos = {};
  let tipo = null;
  const mCost = q.match(new RegExp('(?:cuesta|coste|costo|me sale|fabricar(?:lo|la)?|producir(?:lo|la)?|hacer(?:lo|la)?|compr(?:o|e|ado)|pago)[^\\d]{0,25}' + NUM + '\\s*€?'));
  const mPctAll = [...q.matchAll(new RegExp(NUM + '\\s*(?:%|por ?ciento)', 'g'))].map(m => num(m[1]));
  const wantsGain = /(ganar|margen|beneficio|recargo|markup|sobre el coste|incrementar|subir)/.test(q);
  const mPrice = q.match(new RegExp('(?:precio|vendo|vender(?:lo|la)?|lo vendo|a|por|pvp|cobro|cobrar)\\s*(?:de|a|en|por)?\\s*' + NUM + '\\s*€'));
  const mDisc = q.match(new RegExp('(?:descuento|rebaja|dto\\.?|rebajar|descontar)[^\\d]{0,20}' + NUM + '\\s*(%|por ?ciento|€)?'));
  const mUnits = q.match(new RegExp(NUM + '\\s*(?:unidades|uds?\\.?|piezas|figuras|macetas)[^\\d]{0,20}(?:a|por|de)\\s*' + NUM + '\\s*€'));

  // 1) Coste + margen/recargo → precio
  if (mCost && mPctAll.length && wantsGain) {
    const cost = num(mCost[1]), p = mPctAll[0] / 100;
    if (p > 0 && p < 1) {
      tipo = 'precio';
      const byMargin = cost / (1 - p), byMarkup = cost * (1 + p);
      const explicitMarkup = /(recargo|markup|sobre el coste|encima del coste|incrementar|subir)/.test(q);
      datos.coste = cost; datos.porcentaje = p; datos.precioMargen = Math.round(byMargin * 100) / 100; datos.precioRecargo = Math.round(byMarkup * 100) / 100;
      const first = explicitMarkup ? 'recargo' : 'margen';
      const lm = `Si quieres que el ${pct(p)} del PRECIO DE VENTA sea beneficio (margen): ${eur(cost)} ÷ (1 − ${pct(p).replace(' %', '')}/100) = ${eur(byMargin)}. Ganas ${eur(byMargin - cost)} por unidad.`;
      const lr = `Si quieres sumar un ${pct(p)} SOBRE EL COSTE (recargo): ${eur(cost)} × ${(1 + p).toLocaleString('es-ES')} = ${eur(byMarkup)}. Ganas ${eur(byMarkup - cost)} por unidad, que es un margen real del ${pct((byMarkup - cost) / byMarkup)} sobre el precio.`;
      lines.push(first === 'margen' ? lm : lr, first === 'margen' ? lr : lm);
      const main = first === 'margen' ? byMargin : byMarkup;
      datos.redondeos = roundings(main);
      lines.push(`Precios redondeados que respetan ese objetivo: ${datos.redondeos.map(eur).join(' · ')}.`);
      if (opts.ivaIncluido !== false && /iva/.test(q)) lines.push(`Con IVA (${pct(iva)}): ${eur(main * (1 + iva))}.`);
    }
  }
  // 2) Precio + coste → margen y recargo reales
  if (!tipo && mCost && mPrice) {
    const cost = num(mCost[1]), price = num(mPrice[1]);
    if (price > 0) {
      tipo = 'margen';
      datos.coste = cost; datos.precio = price; datos.beneficio = price - cost; datos.margen = (price - cost) / price;
      lines.push(`Vendiendo a ${eur(price)} con un coste de ${eur(cost)}: beneficio ${eur(price - cost)} por unidad.`);
      lines.push(`Margen sobre el precio: ${pct((price - cost) / price)} · Recargo sobre el coste: ${cost > 0 ? pct((price - cost) / cost) : '—'}.`);
      if (price < cost) lines.push('⚠️ Estás vendiendo POR DEBAJO del coste: pierdes ' + eur(cost - price) + ' por unidad.');
    }
  }
  // 3) Descuento
  if (mDisc) {
    const base = mPrice ? num(mPrice[1]) : (q.match(new RegExp(NUM + '\\s*€')) ? num(q.match(new RegExp(NUM + '\\s*€'))[1]) : null);
    const isPct = mDisc[2] ? !/€/.test(mDisc[2]) : true;
    const d = num(mDisc[1]);
    if (base && d > 0) {
      tipo = tipo || 'descuento';
      const final = isPct ? base * (1 - d / 100) : base - d;
      datos.precioBase = base; datos.precioConDescuento = Math.round(final * 100) / 100;
      lines.push(`Precio con descuento: ${eur(base)} − ${isPct ? d.toLocaleString('es-ES') + ' %' : eur(d)} = ${eur(final)}${isPct ? '' : ' (' + pct(d / base) + ' de descuento)'}.`);
      if (mCost) {
        const cost = num(mCost[1]);
        lines.push(`Con un coste de ${eur(cost)} te quedaría un beneficio de ${eur(final - cost)} (margen ${pct((final - cost) / final)}).`);
        if (final < cost) lines.push('⚠️ Con ese descuento vendes por debajo del coste.');
      }
    }
  }
  // 4) Unidades × precio
  if (mUnits) {
    const u = num(mUnits[1]), p = num(mUnits[2]);
    tipo = tipo || 'total';
    datos.unidades = u; datos.total = Math.round(u * p * 100) / 100;
    lines.push(`${u.toLocaleString('es-ES')} unidades × ${eur(p)} = ${eur(u * p)}.`);
  }
  // 5) IVA
  if (!tipo && /iva/.test(q) && q.match(new RegExp(NUM + '\\s*€'))) {
    const v = num(q.match(new RegExp(NUM + '\\s*€'))[1]);
    tipo = 'iva';
    if (/(sin iva|quitar|base)/.test(q)) lines.push(`${eur(v)} con IVA → base sin IVA: ${eur(v / (1 + iva))} (IVA ${pct(iva)}: ${eur(v - v / (1 + iva))}).`);
    else lines.push(`${eur(v)} sin IVA → con IVA (${pct(iva)}): ${eur(v * (1 + iva))}.`);
  }
  return tipo ? { tipo, lineas: lines, datos } : null;
}

// ¿Es una objeción de precio? ("30 € es demasiado caro")
export function isPriceObjection(question) {
  const q = norm(question);
  return /(caro|carisimo|mucho dinero|demasiado|rebaja|me lo dejas|mas barato|regate|descuento|no me llega|presupuesto)/.test(q) && /(cliente|dice|me dice|comenta|responde|contestar|responder|que le digo|como le)/.test(q);
}
