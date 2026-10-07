// ================= Pago con Stripe Checkout (proveedor reconocido) =================
// La tarjeta / Bizum se introducen en la página de Stripe: esta web NUNCA ve ni guarda números de tarjeta, CVV ni
// contraseñas de pago. Aquí solo se crea la sesión de pago con los importes calculados en el servidor y se recibe
// el aviso firmado de Stripe (webhook) cuando el pago se completa.
import { hmacHex, sameStr } from './seguridad.js';

export const pagoActivo = env => !!(env.STRIPE_SECRET_KEY && /^(sk|rk)_(live|test)_/.test(env.STRIPE_SECRET_KEY) && env.STRIPE_WEBHOOK_SECRET);
export const modoPrueba = env => /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '');

function form(obj, pre, out = []) {
  Object.entries(obj).forEach(([k, v]) => {
    const key = pre ? pre + '[' + k + ']' : k;
    if (v === undefined || v === null) return;
    if (typeof v === 'object') form(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  });
  return out.join('&');
}

export async function crearSesion(env, pedido, origin, tiendaNombre) {
  const items = pedido.lineas.map(l => ({
    quantity: l.cant,
    price_data: { currency: 'eur', unit_amount: l.unidadCent, product_data: { name: (l.nombre + (Object.keys(l.variante || {}).length ? ' · ' + Object.values(l.variante).join(' / ') : '')).slice(0, 250) } }
  }));
  if (pedido.envioCent > 0) items.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: pedido.envioCent, product_data: { name: ('Envío: ' + pedido.envio.nombre).slice(0, 250) } } });
  // descuento por cantidad (promoción real): cupón de UN solo uso por pedido, para que Stripe cobre exactamente el total calculado aquí
  let discounts;
  if (pedido.descuentoCent > 0) {
    const cr = await fetch('https://api.stripe.com/v1/coupons', { method: 'POST', body: form({ id: 'w-' + pedido.id.toLowerCase(), amount_off: pedido.descuentoCent, currency: 'eur', duration: 'once', max_redemptions: 1, name: ('Promoción: ' + (pedido.descuentoNombre || 'descuento')).slice(0, 40) }),
      headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': 'cupon-' + pedido.id, 'Stripe-Version': '2024-06-20' } });
    const cj = await cr.json().catch(() => ({}));
    if (!cr.ok || !cj.id) { const err = new Error('PAGO_NO_DISPONIBLE'); err.detalle = 'cupon_' + ((cj.error && cj.error.type) || cr.status); throw err; }
    discounts = { 0: { coupon: cj.id } };
  }
  const body = form({
    mode: 'payment', discounts, expires_at: Math.floor(Date.now() / 1000) + 31 * 60, locale: 'es', customer_email: pedido.cliente.email, client_reference_id: pedido.id,
    success_url: origin + '/gracias.html?p=' + pedido.token, cancel_url: origin + '/cesta.html?cancelado=1',
    metadata: { pedido: pedido.id }, payment_intent_data: { metadata: { pedido: pedido.id }, description: (tiendaNombre || 'Pedido web') + ' ' + pedido.id },
    line_items: Object.fromEntries(items.map((x, i) => [i, x]))
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', body,
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': 'sesion-' + pedido.id, 'Stripe-Version': '2024-06-20' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url || !j.id) { const err = new Error('PAGO_NO_DISPONIBLE'); err.detalle = (j.error && j.error.type) || 'http_' + r.status; throw err; }
  return { id: j.id, url: j.url };
}

// Firma del webhook: cabecera «Stripe-Signature: t=…,v1=…». HMAC-SHA256 de «t.cuerpo» con el secreto del webhook.
export async function verificarWebhook(env, raw, cabecera, tolerancia = 300) {
  if (!env.STRIPE_WEBHOOK_SECRET) return { ok: false, motivo: 'webhook_no_configurado' };
  const parts = String(cabecera || '').split(',').map(x => x.trim().split('=')), t = (parts.find(x => x[0] === 't') || [])[1], v1 = parts.filter(x => x[0] === 'v1').map(x => x[1]);
  if (!/^\d+$/.test(t || '') || !v1.length) return { ok: false, motivo: 'firma_mal_formada' };
  if (Math.abs(Date.now() / 1000 - Number(t)) > tolerancia) return { ok: false, motivo: 'firma_caducada' };
  const exp = await hmacHex(env.STRIPE_WEBHOOK_SECRET, t + '.' + raw);
  return v1.some(s => sameStr(s, exp)) ? { ok: true } : { ok: false, motivo: 'firma_incorrecta' };
}
