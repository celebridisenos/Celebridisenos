// ================= Seguridad de la API (defensiva) =================
// · Firmas HMAC-SHA256 para el programa interno (dos claves separadas: PUBLICAR y PEDIDOS)
// · Marca de tiempo (±5 min) y nonce de un solo uso: una petición copiada no se puede repetir
// · Límite de peticiones por IP y por acción
// · Registro de seguridad SIN datos personales (la IP se guarda como huella con sal)
// Ningún secreto vive en el código: llegan como variables de entorno del proveedor (env.CLAVE_PUBLICAR…).

const enc = new TextEncoder();
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function sha256hex(data) { return hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data)); }
export async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, typeof msg === 'string' ? enc.encode(msg) : msg));
}
// comparación en tiempo constante (no se filtra cuántos caracteres coinciden)
export function sameStr(a, b) {
  a = String(a || ''); b = String(b || '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
export function randomId(n = 16) { const b = new Uint8Array(n); crypto.getRandomValues(b); return hex(b); }
export const nowIso = () => new Date().toISOString();

export const KEYS = { pub: { env: 'CLAVE_PUBLICAR', nombre: 'publicar' }, ped: { env: 'CLAVE_PEDIDOS', nombre: 'pedidos' } };
export const MAX_SKEW = 5 * 60 * 1000;
// Mensaje firmado: MÉTODO \n RUTA \n MARCA DE TIEMPO \n NONCE \n SHA-256 DEL CUERPO
export const signingString = (method, path, ts, nonce, bodyHash) => [method.toUpperCase(), path, ts, nonce, bodyHash].join('\n');

// Comprueba la firma de una petición interna. Devuelve { ok, motivo, key }
export async function verifyInternal(req, env, bodyBytes, needed) {
  const keyId = req.headers.get('X-Celebri-Clave') || '', ts = req.headers.get('X-Celebri-Ts') || '', nonce = req.headers.get('X-Celebri-Nonce') || '', firma = req.headers.get('X-Celebri-Firma') || '';
  const k = KEYS[keyId];
  if (!k || (needed && !needed.includes(keyId))) return { ok: false, motivo: 'clave_no_permitida' };
  const secret = env[k.env];
  if (!secret || String(secret).length < 32) return { ok: false, motivo: 'clave_no_configurada', config: true };
  if (!/^\d{13}$/.test(ts) || Math.abs(Date.now() - Number(ts)) > MAX_SKEW) return { ok: false, motivo: 'hora_fuera_de_margen' };
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return { ok: false, motivo: 'nonce_invalido' };
  if (!/^[0-9a-f]{64}$/.test(firma)) return { ok: false, motivo: 'firma_mal_formada' };
  const url = new URL(req.url);
  const expected = await hmacHex(secret, signingString(req.method, url.pathname + url.search, ts, nonce, await sha256hex(bodyBytes)));
  if (!sameStr(expected, firma)) return { ok: false, motivo: 'firma_incorrecta' };
  // nonce de un solo uso (los antiguos se borran solos)
  try {
    await env.DB.prepare('INSERT INTO nonces (n, ts) VALUES (?, ?)').bind(keyId + ':' + nonce, Date.now()).run();
  } catch (e) { return { ok: false, motivo: 'nonce_repetido' }; }
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM nonces WHERE ts < ?').bind(Date.now() - 2 * MAX_SKEW).run();
  return { ok: true, key: keyId };
}

export const clientIp = req => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')?.split(',')[0].trim() || '0.0.0.0';
// Huella de la IP con sal (si no hay sal configurada, se deriva de la clave de pedidos; nunca se guarda la IP en claro)
export async function ipHash(req, env) { return (await sha256hex((env.SAL_REGISTRO || env.CLAVE_PEDIDOS || 'sin-sal') + '|' + clientIp(req))).slice(0, 16); }

// Límite de peticiones: n por ventana de «seg» segundos para (acción, IP). Devuelve true si se permite.
// ATÓMICO (dos peticiones a la vez no se cuelan) y barato: una petición ya bloqueada no escribe nada en la base de datos,
// así nadie puede agotar las escrituras gratuitas de D1 insistiendo.
export async function rateLimit(env, accion, ipH, n, seg) {
  const w = Math.floor(Date.now() / 1000 / seg), clave = accion + ':' + ipH;
  const up = await env.DB.prepare('UPDATE limites SET n = n + 1 WHERE clave = ? AND ventana = ? AND n < ?').bind(clave, w, n).run();
  if (up.meta && up.meta.changes) return true;
  const nueva = await env.DB.prepare('INSERT INTO limites (clave, ventana, n) VALUES (?, ?, 1) ON CONFLICT(clave) DO UPDATE SET ventana = excluded.ventana, n = 1 WHERE limites.ventana <> excluded.ventana').bind(clave, w).run();
  return !!(nueva.meta && nueva.meta.changes);
}

// ¿Ya ha superado el límite? (sin contar esta petición) — para bloquear tras muchos intentos fallidos
export async function isLimited(env, accion, ipH, n, seg) {
  const w = Math.floor(Date.now() / 1000 / seg), row = await env.DB.prepare('SELECT ventana, n FROM limites WHERE clave = ?').bind(accion + ':' + ipH).first();
  return !!row && row.ventana === w && row.n >= n;
}

// Registro de seguridad: tipo, ruta, huella de IP y un detalle CORTO sin datos personales ni secretos
export async function secLog(env, req, tipo, detalle) {
  try {
    const url = new URL(req.url);
    await env.DB.prepare('INSERT INTO seguridad (ts, tipo, ruta, ip, detalle) VALUES (?, ?, ?, ?, ?)').bind(nowIso(), String(tipo).slice(0, 40), url.pathname.slice(0, 80), await ipHash(req, env), String(detalle || '').replace(/[^\w .:,=-]/g, '').slice(0, 120)).run();
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM seguridad WHERE ts < ?").bind(new Date(Date.now() - 90 * 864e5).toISOString()).run();
  } catch (e) { /* el registro nunca rompe la petición */ }
}

// Cabeceras de seguridad comunes
export const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none'
};
