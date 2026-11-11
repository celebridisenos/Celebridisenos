// ================= 11-11-2026 · 🏷️ VARIANTES de un producto y 📱 «¿le sumo el móvil y la SIM?» por producto =================
// Biou: «me gustaría que estuviese dividido lo que cuesta hasta el móvil y sin el móvil… así si quiero aplicárselo o no… y si he
// cotizado una pieza y lo pongo a la venta tiene que estar registrado, es decir mismo producto pero diferente precio, dónde lo vendo».
// Dónde se guarda: en la configuración del negocio, sección «finanzas» (donde ya están el móvil y la SIM: gastosNegocio).
//   finanzas.variantes = [ { id, pid, f, n, esc, fz, w, i, ac, imp, med, g, h, de, pr, min, co, mv, d, nota, por } ]  (ver cotizar.js → nuevaVariante)
//   finanzas.sinMovil  = [ ids de producto a los que NO se les suma el móvil y la SIM al precio ]
// Así funciona YA, sin tocar el servidor de Google. La celda de Google admite 50.000 letras: se para a 40.000 con un aviso claro.
// Cada guardado lee antes la configuración más reciente (por si la otra persona ha cambiado algo) y cambia solo lo suyo.
// Los pedidos NO cambian: el móvil es un gasto real y se reparte entre todos los pedidos (orderCosts), lo sume o no el precio.
import { S, can, api, emit } from './store.js';

const MAX = 40000;
const fz = () => (S.cfg && S.cfg.finanzas) || {};
const lista = x => Array.isArray(x) ? x : [];
export const puedeGuardar = () => can('config.editar');
export const todasLasVariantes = () => lista(fz().variantes);
export const variantesDe = pid => todasLasVariantes().filter(v => v && v.pid === pid).sort((a, b) => String(b.f || '').localeCompare(String(a.f || '')) || String(b.id).localeCompare(String(a.id)));
export const sumaMovil = pid => !lista(fz().sinMovil).includes(pid);
// lo que se recupera del móvil y la SIM en cada pedido (0 si no hay gastos apuntados)
export function cuotaMovil() { try { const CL = window.CL; return CL && CL.cuotaNegocio ? CL.cuotaNegocio(S.cfg, S.t, '').cuota || 0 : 0; } catch (e) { return 0; } }
// para que la ficha se repinte cuando cambia algo de ESTE producto
export const firmaDe = pid => JSON.stringify([variantesDe(pid), sumaMovil(pid), cuotaMovil()]);

async function cambiaFinanzas(fn) {
  if (!puedeGuardar()) throw new Error('Para guardarlo hace falta el permiso «Cambiar la configuración».');
  let base = fz();
  try { const cf = await api('config.obtener', {}, { quiet: true }); if (cf && cf.finanzas) base = cf.finanzas; } catch (e) { }
  const nuevo = fn(JSON.parse(JSON.stringify(base || {})));
  if (JSON.stringify(nuevo).length > MAX) throw new Error('Ya hay muchas variantes guardadas y no caben más: borra alguna vieja y vuelve a probar.');
  const cfg = await api('config.guardar', { clave: 'finanzas', valor: nuevo });
  if (cfg && cfg.finanzas) S.cfg = cfg; else S.cfg.finanzas = nuevo;
  emit();
}
export function ponMovil(pid, si) {
  return cambiaFinanzas(f => { const L = lista(f.sinMovil).filter(x => x !== pid); if (!si) L.push(pid); f.sinMovil = L; return f; });
}
export function guardarVariante(v) {
  return cambiaFinanzas(f => { const L = lista(f.variantes).filter(x => x && x.id !== v.id); L.push(v); f.variantes = L; return f; });
}
export function borrarVariante(id) {
  return cambiaFinanzas(f => { f.variantes = lista(f.variantes).filter(x => x && x.id !== id); return f; });
}
