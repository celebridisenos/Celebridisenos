// ================= 📱 MIS CUENTAS (02-11-2026, Biou: «control de móviles, teléfonos, cuenta Vinted y qué banco está, para tener un orden…
// el control de quién está vendiendo y quién no»; «tiene que haber un botón + siempre, y que lo pregunte») =================
// Son las mismas «cuentas de venta» de Configuración (cuentas.js), con su móvil, su número y su banco: el pedido dice desde qué cuenta se
// vendió, y de ahí sale quién vende. El teléfono y el banco solo se le mandan a quien puede editar la configuración (36_cuentas.gs).
// ⚠️ Ningún dato de sus cuentas va en este código: la app se publica. Las de partida las deja un archivo local de la torre (cuentas-inicio).
import { h, mount, btn, inp, sel, area, toast, modal, confirmDlg, copyText, empty, eur } from '../ui.js';
import { S, api, configGuardada } from '../store.js';
import { desktop } from '../desktop.js';
import { cuentasVenta, textoCuenta, PLATAFORMAS, EMOJI } from '../cuentas.js';

const CL = window.CL;
const VERSION_MINIMA = [18, 5];
export function servidorAlDia(v = (S.cfg || {}).version) {
  const p = String(v || '').split('.').map(Number);
  return p[0] > VERSION_MINIMA[0] || (p[0] === VERSION_MINIMA[0] && p[1] >= VERSION_MINIMA[1]);
}
// las de partida entran sin pisar lo que ya esté apuntado, salvo el correo, que es el último que dijo: la misma cuenta es la del mismo nombre,
// el mismo correo o la que se llamaba como dice «antes» (y entonces toma el nombre nuevo sin perder sus ventas)
export function mezclaInicio(lista, inicio) {
  const out = lista.map(c => Object.assign({}, c));
  (inicio || []).forEach(n => {
    const antes = (n.antes || []).map(a => CL.norm(a));
    const x = out.find(c => CL.norm(c.nombre) === CL.norm(n.nombre) || (c.correo && n.correo && CL.norm(c.correo) === CL.norm(n.correo)) || antes.includes(CL.norm(textoCuenta(c))));
    if (!x) { out.push(Object.assign({}, n)); return; }
    Object.keys(n).forEach(k => { if (x[k] === undefined || x[k] === '' || x[k] === null || (k === 'correo' && n[k])) x[k] = n[k]; });
    if (antes.length) { x.nombre = n.nombre; x.antes = [...new Set([...(x.antes || []), ...n.antes])]; }
  });
  return out;
}
const finIban = v => { const s = String(v || '').replace(/\s/g, ''); return s.length > 8 ? '•••• ' + s.slice(-4) : s ? 'acaba en ' + s : ''; };
export function faltaDe(c) {
  const f = [];
  if (!c.telefono) f.push('Falta el número');
  else if (!c.verificado) f.push('Falta verificar el número');
  if (!c.banco && !c.iban) f.push('Falta la cuenta bancaria');
  return f;
}
const textosDe = c => [textoCuenta(c), ...(c.antes || [])]; // (los pedidos guardan el texto: el nombre que tenía la cuenta al venderse)
// cuánto ha vendido cada cuenta, con los pedidos que dicen desde cuál se vendió (los cancelados no cuentan)
export function ventasDe(c, hoy = S.hoy) {
  const txts = textosDe(c), mes = String(hoy).slice(0, 7);
  const L = (S.t.pedidos || []).filter(o => txts.includes(o.cuenta) && !o.eliminado && CL.phaseOf(S.cfg.pedidos, o.estado) !== 'cancelado');
  const ultima = L.reduce((m, o) => String(o.fecha || '') > m ? String(o.fecha) : m, '');
  const dias = ultima ? Math.floor((new Date(hoy) - new Date(ultima.slice(0, 10))) / 86400000) : null;
  const delMes = L.filter(o => String(o.fecha || '').slice(0, 7) === mes);
  return { total: L.length, mes: delMes.length, euros: delMes.reduce((s, o) => s + CL.orderTotal(o), 0), ultima: ultima.slice(0, 10), vende: dias !== null && dias <= 30 };
}

export function render(el) {
  let inicio = null, guardando = false; // (las de partida, mientras el servidor no las pueda guardar)
  const cuerpo = h('div');
  const lista = () => inicio ? mezclaInicio(cuentasVenta(), inicio) : cuentasVenta();

  async function guarda(nueva) {
    const r = await api('cuentas.guardar', { cuentas: nueva });
    S.cfg.cuentasVenta = r.cuentas; configGuardada();
    return r.cuentas;
  }
  // ➕ / ✏️ una ventana que lo va preguntando
  function editor(c) {
    const es = !!c; c = c || { plataforma: 'Vinted' };
    const f = {
      plataforma: sel(PLATAFORMAS.map(p => ({ v: p, t: (EMOJI[p] || '') + ' ' + p })), c.plataforma || 'Vinted'),
      nombre: inp({ value: c.nombre || '', maxlength: 30, placeholder: 'Por ejemplo: Glamhome00', 'data-c': 'nombre' }),
      correo: inp({ value: c.correo || '', type: 'email', placeholder: 'El correo de esa cuenta', 'data-c': 'correo' }),
      movil: inp({ value: c.movil || '', maxlength: 40, placeholder: 'Por ejemplo: Samsung blanco', 'data-c': 'movil' }),
      telefono: inp({ value: c.telefono || '', type: 'tel', maxlength: 20, placeholder: 'Por ejemplo: 600 000 000', 'data-c': 'telefono' }),
      verificado: h('input', { type: 'checkbox', checked: !!c.verificado, 'data-c': 'verificado' }),
      banco: inp({ value: c.banco || '', maxlength: 40, placeholder: 'Por ejemplo: La Caixa', 'data-c': 'banco' }),
      titular: inp({ value: c.titular || '', maxlength: 60, placeholder: 'A nombre de quién está', 'data-c': 'titular' }),
      iban: inp({ value: c.iban || '', maxlength: 40, placeholder: 'El IBAN, o solo sus últimas cifras', 'data-c': 'iban' }),
      notas: area({ value: c.notas || '', rows: 2, maxlength: 200, placeholder: 'Lo que quieras recordar', 'data-c': 'notas' })
    };
    const preg = (t, x) => h('label.mc-preg', h('span', t), x);
    const m = modal(es ? '✏️ ' + (c.nombre || 'Cuenta') : '➕ Cuenta nueva', h('div.mc-form',
      preg('¿De qué plataforma es?', f.plataforma), preg('¿Cómo se llama la cuenta?', f.nombre), preg('¿Con qué correo entra?', f.correo),
      preg('¿En qué móvil está?', f.movil), preg('¿Qué número de teléfono tiene?', f.telefono),
      h('label.mc-check', f.verificado, ' El número ya está verificado'),
      preg('¿De qué banco es la cuenta?', f.banco), preg('¿A nombre de quién?', f.titular), preg('¿Cuál es el IBAN?', f.iban),
      preg('Notas', f.notas),
      es && textoCuenta(c) ? h('p.tiny.muted', 'Si le cambias el nombre, sus ventas de antes siguen contando aquí.') : null),
      close => [
        es && !inicio ? btn('Quitar', async () => {
          if (!await confirmDlg('Quitar ' + c.nombre, 'Los pedidos que ya tiene conservan el nombre de la cuenta. ¿Seguro?', 'Quitar', true)) return;
          try { await guarda(cuentasVenta().filter(x => x.id !== c.id)); close(); pinta(); toast('Cuenta quitada', 'ok'); } catch (e) { toast(e.message, 'bad'); }
        }, { cls: 'ghost' }) : null,
        btn('Cancelar', close),
        btn('Guardar', async ev => {
          const datos = { plataforma: f.plataforma.value, nombre: f.nombre.value.trim(), correo: f.correo.value.trim(), movil: f.movil.value.trim(), telefono: f.telefono.value.trim(), verificado: f.verificado.checked, banco: f.banco.value.trim(), titular: f.titular.value.trim(), iban: f.iban.value.trim(), notas: f.notas.value.trim() };
          if (!datos.nombre) { toast('Dime cómo se llama la cuenta', 'warn'); f.nombre.focus(); return; }
          if (!servidorAlDia()) { toast('Primero pega el Servidor.gs nuevo en tu Google: si no, el número y el banco no se guardan.', 'bad', 8000); return; }
          const b = ev.currentTarget; b.disabled = true;
          try {
            const base = lista();
            await guarda(es ? base.map(x => x.id === c.id && x.nombre === c.nombre ? Object.assign({}, x, datos, textoCuenta(datos) === textoCuenta(x) ? {} : { antes: [...new Set([...(x.antes || []), textoCuenta(x)])] }) : x) : base.concat([datos]));
            close(); pinta(); toast('✅ Cuenta guardada', 'ok');
          } catch (e) { toast(e.message, 'bad'); b.disabled = false; }
        }, { cls: 'primary' })
      ], { size: 'wide' });
    setTimeout(() => (es ? f.telefono : f.nombre).focus(), 40);
    return m;
  }

  function fila(ic, t, valor, copia) {
    return h('div.mc-fila', h('span.mc-ic', ic), h('span.mc-et', t), valor ? h('b.grow', valor) : h('span.grow.muted', '—'),
      copia ? h('button.btn.ghost.icon.sm', { type: 'button', title: 'Copiar', 'aria-label': 'Copiar ' + t, onclick: () => copyText(copia) }, '📋') : null);
  }
  function tarjeta(c) {
    const v = ventasDe(c), falta = faltaDe(c);
    return h('div.card.mc-c' + (v.vende ? '.vende' : ''), { 'data-cuenta': c.nombre },
      h('div.mc-cab', h('span.mc-pl', EMOJI[c.plataforma] || '🔖'), h('div.grow', h('h3', c.nombre), h('small.muted', c.plataforma)),
        h('span.mc-est', v.vende ? '🟢 Vendiendo' : '⚪ Sin ventas'), btn('✏️ Editar', () => editor(c), { cls: 'sm' })),
      h('div.mc-ventas',
        h('div', h('b', v.mes), h('small', 'ventas este mes')), h('div', h('b', eur(v.euros)), h('small', 'este mes')), h('div', h('b', v.total), h('small', 'ventas en total')),
        h('div', h('b', v.ultima ? v.ultima.split('-').reverse().join('/') : '—'), h('small', 'última venta'))),
      fila('✉️', 'Correo', c.correo, c.correo),
      fila('📱', 'Móvil', c.movil),
      fila('☎️', 'Número', c.telefono ? c.telefono + (c.verificado ? '  ✅' : '') : '', c.telefono),
      fila('🏦', 'Banco', [c.banco, c.titular].filter(Boolean).join(' · ')),
      fila('💳', 'IBAN', finIban(c.iban), c.iban),
      c.notas ? h('p.small.muted', c.notas) : null,
      falta.length ? h('div.mc-falta', falta.map(x => h('span', '⚠️ ' + x))) : h('div.mc-ok', '✅ Todo apuntado'));
  }
  function pinta() {
    const L = lista().slice().sort((a, b) => ventasDe(b).mes - ventasDe(a).mes || ventasDe(b).total - ventasDe(a).total);
    const vinted = L.filter(c => c.plataforma === 'Vinted').length, vendiendo = L.filter(c => ventasDe(c).vende).length, pendientes = L.filter(c => faltaDe(c).length).length;
    const validos = new Set(L.flatMap(textosDe));
    const sinCuenta = (S.t.pedidos || []).filter(o => !o.eliminado && CL.phaseOf(S.cfg.pedidos, o.estado) !== 'cancelado' && String(o.fecha || '').slice(0, 7) === String(S.hoy).slice(0, 7) && !validos.has(o.cuenta)).length;
    mount(cuerpo,
      !servidorAlDia() ? h('div.mc-aviso', h('b', '⚠️ Falta pegar el Servidor.gs nuevo en tu Google.'), ' Hasta entonces, el número, el móvil y el banco no se pueden guardar.' + (inicio ? ' Lo que ves está en este PC, esperando.' : '')) : null,
      h('div.mc-res', h('div', h('b', L.length), h('small', L.length === 1 ? 'cuenta' : 'cuentas')), h('div', h('b', vinted), h('small', 'de Vinted')), h('div.bien', h('b', vendiendo), h('small', 'vendiendo')), h('div' + (pendientes ? '.mal' : ''), h('b', pendientes), h('small', 'con algo pendiente'))),
      sinCuenta ? h('p.small.muted', '📝 Este mes hay ' + sinCuenta + (sinCuenta === 1 ? ' pedido' : ' pedidos') + ' sin decir de qué cuenta son: no cuentan aquí. Elige la «Cuenta de venta» al crear el pedido.') : null,
      L.length ? h('div.mc-lista', L.map(tarjeta)) : empty('box', 'Aún no hay cuentas', 'Pulsa «➕ Añadir cuenta» y te lo voy preguntando.'));
  }

  el.append(h('div.page-head', h('h1', '📱 Mis cuentas'), btn('➕ Añadir cuenta', () => editor(), { cls: 'primary mc-mas' })), cuerpo);
  pinta();

  // las de partida, en un archivo de la torre: se guardan en el servidor una vez y el archivo se borra
  async function traeInicio() {
    if (!desktop.on || guardando) return;
    let r; try { r = await desktop.cuentasInicio(); } catch (e) { return; }
    if (!r || !Array.isArray(r.cuentas) || !r.cuentas.length) return;
    inicio = r.cuentas;
    if (servidorAlDia()) {
      guardando = true;
      try { await guarda(mezclaInicio(cuentasVenta(), inicio)); inicio = null; await desktop.cuentasInicioHechas(); toast('✅ Tus cuentas ya están guardadas', 'ok'); }
      catch (e) { toast(e.message, 'bad'); } finally { guardando = false; }
    }
    pinta();
  }
  traeInicio();
  return { update: () => { pinta(); if (inicio && servidorAlDia()) traeInicio(); } };
}
