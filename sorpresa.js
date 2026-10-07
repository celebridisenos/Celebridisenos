// ================= v16.1 · 🎁 Un regalo =================
// Un botón 🎁 arriba (no tapa nada ni se abre solo). Al tocarlo: el regalo se abre con confeti y enseña
// «Tu taller en números» —solo con TUS datos reales, nada inventado—, lo que trae esta versión y un póster para guardar.
// Abierto una vez, el botón deja de latir y se queda en Ctrl+K → «Mi regalo».
import { h, mount, modal, btn, eur, toast, fdate } from './ui.js';
import { S, can, VEL } from './store.js';
import { desktop } from './desktop.js';

const CL = window.CL;
const CLAVE = 'cd.regalo', ESTA = '16.1';
const visto = () => { try { return localStorage.getItem(CLAVE) === ESTA; } catch (e) { return true; } };
const marcar = () => { try { localStorage.setItem(CLAVE, ESTA); } catch (e) { } };

// Lo que has hecho de verdad (de tus pedidos; los cancelados no cuentan)
export function numeros() {
  const est = k => ((S.cfg && S.cfg.pedidos.estados) || []).find(s => s.k === k) || {};
  const L = (S.t.pedidos || []).filter(o => !est(o.estado).cancelled);
  const uds = o => Number(o.cantidad) || 1;
  const porProd = {}; L.forEach(o => { const k = String(o.producto || '').trim(); if (k) porProd[k] = (porProd[k] || 0) + uds(o); });
  const estrella = Object.entries(porProd).sort((a, b) => b[1] - a[1])[0] || null;
  const fechas = L.map(o => String(o.fecha || o.creado || '').substring(0, 10)).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  const cobrados = L.filter(o => /^s/i.test(String(o.cobrado || '')));
  return {
    pedidos: L.length, piezas: L.reduce((s, o) => s + uds(o), 0),
    clientes: new Set(L.map(o => CL.norm(o.cliente)).filter(Boolean)).size,
    enviados: L.filter(o => est(o.estado).shipped).length,
    desde: fechas[0] || '', estrella,
    cobrado: can('productos.costes') && cobrados.length ? Math.round(cobrados.reduce((s, o) => s + CL.orderTotal(o), 0) * 100) / 100 : null
  };
}

export function botonRegalo() {
  if (visto()) return null;
  return h('button.btn.ghost.icon.icon-btn.regalo-btn', { type: 'button', title: 'Tienes un regalo 🎁', 'aria-label': 'Tienes un regalo', onclick: e => { e.currentTarget.remove(); abrirRegalo(); } }, h('span', { 'aria-hidden': 'true' }, '🎁'));
}

export function abrirRegalo() {
  marcar();
  const n = numeros(), nombre = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || 'Tu taller', yo = (S.me && S.me.nombre) || '';
  const cuerpo = h('div.regalo');
  const caja = h('button.regalo-caja', { type: 'button', 'aria-label': 'Abrir el regalo' }, h('span.tapa', '🎀'), h('span.cuerpo', '🎁'), h('small', 'Toca para abrirlo'));
  const m = modal('🎁 Un regalo para ' + (yo || 'ti'), cuerpo, close => [btn('A trabajar 🚀', close, { cls: 'primary' })], { size: 'wide' });
  mount(cuerpo, h('div.regalo-escena', caja));
  caja.onclick = async () => {
    caja.classList.add('abierta');
    import('./premium.js').then(P => P.confeti({ n: 220, ms: 3600 })).catch(() => { });
    await new Promise(r => setTimeout(r, 650));
    pintar();
  };
  const dato = (ic, v, t) => h('div.regalo-dato', h('i', ic), h('b', v), h('span', t));
  function pintar() {
    const media = VEL.n >= 3 ? VEL.total / VEL.n / 1000 : null;
    mount(cuerpo,
      h('div.regalo-carta',
        h('h3', nombre + ' en números'),
        n.pedidos ? h('div.regalo-datos',
          dato('📦', String(n.pedidos), n.pedidos === 1 ? 'pedido' : 'pedidos'),
          dato('🧩', String(n.piezas), n.piezas === 1 ? 'pieza hecha' : 'piezas hechas'),
          n.clientes ? dato('💜', String(n.clientes), n.clientes === 1 ? 'persona confió en ti' : 'personas confiaron en ti') : null,
          n.enviados ? dato('🚚', String(n.enviados), n.enviados === 1 ? 'paquete en camino o entregado' : 'paquetes en camino o entregados') : null,
          n.cobrado != null ? dato('💶', eur(n.cobrado), 'cobrados y apuntados') : null)
          : h('p.regalo-vacio', 'Tu primer pedido está al caer. Cuando llegue, aquí lo vamos a celebrar. 🎉'),
        n.estrella ? h('p.regalo-linea', '⭐ Tu pieza estrella: ', h('b', n.estrella[0]), ' (' + n.estrella[1] + (n.estrella[1] === 1 ? ' unidad' : ' unidades') + ')') : null,
        n.desde ? h('p.regalo-linea', '🗓️ Todo esto desde el ', h('b', fdate(n.desde)), '. Pieza a pieza.') : null),
      h('div.regalo-trae',
        h('h4', 'Y dentro de la caja…'),
        h('div.regalo-tres',
          h('div', h('i', '⚡'), h('b', 'Todo va más rápido'), h('span', 'Cada botón hace UN viaje al servidor en vez de dos, y el servidor abre cuatro veces menos hojas para lo mismo.' + (media ? ' Ahora mismo, en este aparato: ' + media.toFixed(1).replace('.', ',') + ' s de media por acción.' : ''))),
          h('div', h('i', '🪄'), h('b', 'Borrador mágico'), h('span', 'En Biouvision: pinta encima de un hilo, una mancha o un soporte de la foto… y desaparece.')),
          h('div', h('i', '🚀'), h('b', 'La tarjeta gráfica, a trabajar'), h('span', desktop.on ? 'Biouvision → ⚙️ Motores → ⚡ Turbo. Ampliar una foto a 4K puede ir más de diez veces más rápido.' : 'El PC del taller puede usar su tarjeta gráfica para las fotos: se activa allí, en Biouvision → ⚙️ Motores.')))),
      h('p.regalo-nota', 'Gracias por la paciencia de estos días. Este taller lo levantas tú, con cada pieza que sale de la impresora. Yo solo intento que el programa te estorbe menos. 💜'),
      n.pedidos ? h('div.row', { style: { justifyContent: 'center', gap: '10px', flexWrap: 'wrap' } }, btn('🖼️ Guardar mi póster', () => poster(n, nombre), { cls: 'primary' }), h('span.tiny.muted', 'Para tus historias o para colgarlo en el taller.')) : null);
  }
  return m;
}

// Póster 1080 × 1350 con tus números (para guardar o compartir)
async function poster(n, nombre) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2e1065'); gr.addColorStop(0.55, '#7c3aed'); gr.addColorStop(1, '#db2777'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.12; g.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((i * 263) % W, (i * 419) % H, 8 + (i * 37) % 60, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  const F = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = '600 34px ' + F; g.globalAlpha = 0.85; g.fillText('MI TALLER EN NÚMEROS', W / 2, 130); g.globalAlpha = 1;
  g.font = '800 76px ' + F; let t = nombre; while (g.measureText(t).width > W - 140 && t.length > 6) t = t.slice(0, -2); g.fillText(t === nombre ? t : t + '…', W / 2, 235);
  const filas = [['📦', n.pedidos, n.pedidos === 1 ? 'pedido' : 'pedidos'], ['🧩', n.piezas, n.piezas === 1 ? 'pieza hecha' : 'piezas hechas'], n.clientes ? ['💜', n.clientes, n.clientes === 1 ? 'persona confió en mí' : 'personas confiaron en mí'] : null, n.enviados ? ['🚚', n.enviados, n.enviados === 1 ? 'paquete enviado' : 'paquetes enviados'] : null].filter(Boolean);
  const alto = 190, y0 = 340 + (4 - filas.length) * alto / 2;
  filas.forEach((f, i) => {
    const y = y0 + i * alto;
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.roundRect(110, y, W - 220, alto - 30, 36); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '80px ' + F; g.fillText(f[0], 160, y + 108);
    g.font = '800 96px ' + F; g.fillText(String(f[1]), 290, y + 112);
    const x = 290 + g.measureText(String(f[1])).width + 28; g.font = '500 40px ' + F; g.globalAlpha = 0.92; g.fillText(f[2], x, y + 104); g.globalAlpha = 1;
  });
  g.textAlign = 'center'; g.fillStyle = '#fff';
  if (n.estrella) { g.font = '600 38px ' + F; let e = '⭐ Pieza estrella: ' + n.estrella[0]; while (g.measureText(e).width > W - 160 && e.length > 20) e = e.slice(0, -2); g.fillText(e, W / 2, 1150); }
  g.font = '500 32px ' + F; g.globalAlpha = 0.85; g.fillText((n.desde ? 'Desde el ' + fdate(n.desde) + ' · ' : '') + 'Pieza a pieza 💜', W / 2, 1245); g.globalAlpha = 1;
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mi_taller_en_numeros.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('🖼️ Póster guardado en tus descargas', 'ok');
}
