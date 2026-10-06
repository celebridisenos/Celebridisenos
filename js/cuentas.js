// ================= v14.1 · MIS CUENTAS DE VENTA =================
// Varias cuentas de Vinted, Wallapop… Se apuntan una vez (Configuración → Mis cuentas de venta) y se usan en:
//   · el pedido («Cuenta de venta»), que sale en la ficha, en la lista y en la etiqueta interna del paquete;
//   · la bandeja de correos: el correo de cada cuenta → su nombre.
import { h, btn, inp, sel, toast } from './ui.js';
import { S, api, pull } from './store.js';

const CL = window.CL;
export const PLATAFORMAS = ['Vinted', 'Wallapop', 'Etsy', 'eBay', 'Instagram', 'TikTok', 'Milanuncios', 'Tienda web', 'Otra'];
export const EMOJI = { Vinted: '🟦', Wallapop: '🟢', Etsy: '🟠', eBay: '🔵', Instagram: '📸', TikTok: '🎵', Milanuncios: '🟧', 'Tienda web': '🛍️', Otra: '🔖' };
export const cuentasVenta = () => (S.cfg && Array.isArray(S.cfg.cuentasVenta)) ? S.cfg.cuentasVenta : [];
export const textoCuenta = c => c ? c.plataforma + ' · ' + c.nombre : '';
export const emojiCuenta = txt => { const p = String(txt || '').split(' · ')[0]; return EMOJI[p] || '🔖'; };

// Desplegable para el pedido. Guarda el TEXTO («Vinted · Ana»): si un día se borra la cuenta, el pedido no pierde el dato.
export function cuentaSelect(valor, canal) {
  const lista = cuentasVenta();
  const s = h('select.inp', { 'aria-label': 'Cuenta de venta' });
  s.append(h('option', { value: '' }, lista.length ? '— Sin indicar —' : '— (aún no hay cuentas apuntadas) —'));
  const grupos = {};
  lista.forEach(c => { (grupos[c.plataforma] = grupos[c.plataforma] || []).push(c); });
  // las de la plataforma del canal elegido, primero
  const orden = Object.keys(grupos).sort((a, b) => (b === canal) - (a === canal));
  orden.forEach(p => s.append(h('optgroup', { label: (EMOJI[p] || '') + ' ' + p }, grupos[p].map(c => h('option', { value: textoCuenta(c), 'data-id': c.id }, c.nombre + (c.correo ? ' (' + c.correo + ')' : ''))))));
  if (valor && !lista.some(c => textoCuenta(c) === valor)) s.append(h('option', { value: valor }, valor));
  s.value = valor || '';
  return s;
}

// Configuración → Mis cuentas de venta
export function editorCuentas(alGuardar) {
  const lista = JSON.parse(JSON.stringify(cuentasVenta()));
  const caja = h('div');
  const pinta = () => {
    caja.replaceChildren(
      h('div.list.boxed.cv-lista', lista.length ? lista.map((c, i) => {
        const pl = sel(PLATAFORMAS.map(p => ({ v: p, t: (EMOJI[p] || '') + ' ' + p })), c.plataforma || 'Vinted'); pl.setAttribute('aria-label', 'Plataforma');
        const no = inp({ value: c.nombre || '', placeholder: 'Nombre (p. ej. Ana, Tienda 2)', 'aria-label': 'Nombre de la cuenta', maxlength: 30 });
        const co = inp({ value: c.correo || '', type: 'email', placeholder: 'Correo de esa cuenta (para la bandeja)', 'aria-label': 'Correo de la cuenta' });
        pl.onchange = () => { c.plataforma = pl.value; }; no.oninput = () => { c.nombre = no.value; }; co.oninput = () => { c.correo = co.value; };
        return h('div.item.cv-fila', { style: { cursor: 'default', gap: '8px', flexWrap: 'wrap' } }, pl, no, co, btn('Quitar', () => { lista.splice(i, 1); pinta(); }, { cls: 'sm ghost' }));
      }) : h('p.small.muted', { style: { padding: '8px' } }, 'Aún no hay cuentas. Pulsa «+ Añadir cuenta».')),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '8px' } },
        btn('+ Añadir cuenta', () => { lista.push({ plataforma: 'Vinted', nombre: '', correo: '' }); pinta(); setTimeout(() => { const x = caja.querySelectorAll('input[aria-label="Nombre de la cuenta"]'); if (x.length) x[x.length - 1].focus(); }, 0); }, { cls: 'sm' }),
        btn('Guardar cuentas', async ev => {
          const b = ev.currentTarget; b.disabled = true;
          try { const r = await api('cuentas.guardar', { cuentas: lista.filter(c => String(c.nombre || c.correo || '').trim()) }); S.cfg.cuentasVenta = r.cuentas; lista.splice(0, lista.length, ...JSON.parse(JSON.stringify(r.cuentas))); pinta(); toast('Cuentas guardadas (' + r.cuentas.length + ')', 'ok'); pull().catch(() => { }); alGuardar && alGuardar(r.cuentas); }
          catch (e) { toast(e.message, 'bad'); } finally { b.disabled = false; }
        }, { cls: 'primary sm' })));
  };
  pinta();
  return caja;
}
export { CL };
