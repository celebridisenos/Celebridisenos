// ================= v12.3 · Tarjeta de resultados para redes =================
// Genera una imagen (PNG, 1080×1350 · formato Instagram) con TUS cifras reales del periodo. Los ingresos NO se
// enseñan salvo que lo marques (por defecto solo salen pedidos, piezas y horas, que es lo que apetece compartir).
import { h, modal, btn, toast, eur, field, inp, sw } from './ui.js';
import { S, can } from './store.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const pad = v => String(v).padStart(2, '0');
const W = 1080, H = 1350;

export function periodos(hoy) {
  hoy = hoy || S.hoy || CL.today();
  const y = n(hoy.slice(0, 4)), m = n(hoy.slice(5, 7));
  const mesTxt = (yy, mm) => new Date(yy, mm - 1, 15).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const last = (yy, mm) => new Date(yy, mm, 0).getDate();
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const sem = CL.periodRange('semana', hoy);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return [
    { k: 'mes', t: cap(mesTxt(y, m)), desde: y + '-' + pad(m) + '-01', hasta: hoy },
    { k: 'semana', t: 'Esta semana', desde: sem.desde, hasta: hoy },
    { k: 'pasado', t: cap(mesTxt(py, pm)), desde: py + '-' + pad(pm) + '-01', hasta: py + '-' + pad(pm) + '-' + pad(last(py, pm)) }
  ];
}

// Cifras reales del periodo (función pura: se puede probar sin pantalla)
export function cifras(per, S_) {
  S_ = S_ || S;
  const cp = S_.cfg.pedidos, inR = d => d && String(d).slice(0, 10) >= per.desde && String(d).slice(0, 10) <= per.hasta;
  const peds = S_.t.pedidos.filter(o => inR(o.fecha) && !CL.stateOf(cp, o.estado).cancelled);
  const enviados = peds.filter(o => { const ph = CL.phaseOf(cp, o.estado); return ph === 'enviado' || ph === 'entregado'; }).length;
  const jobs = (S_.t.trabajos || []).filter(j => j.estado === 'Terminado' && inR(j.fin || j.inicio));
  const piezas = jobs.reduce((a, j) => a + (n(j.cantidad) || 1), 0);
  const horas = Math.round(jobs.reduce((a, j) => a + n(j.horas), 0));
  const por = {};
  peds.forEach(o => { const k = String(o.producto || '').trim(); if (k) por[k] = (por[k] || 0) + (n(o.cantidad) || 1); });
  const top = Object.entries(por).sort((a, b) => b[1] - a[1])[0] || null;
  const clientes = new Set(peds.map(o => CL.norm(o.cliente)).filter(Boolean)).size;
  return { pedidos: peds.length, enviados, piezas, horas, ventas: Math.round(peds.reduce((a, o) => a + CL.orderTotal(o), 0) * 100) / 100, top: top ? { nombre: top[0], uds: top[1] } : null, clientes };
}

function rr(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, max, size, weight) { let s = size; do { ctx.font = weight + ' ' + s + 'px "Segoe UI Variable Display","Segoe UI",system-ui,sans-serif'; s -= 2; } while (ctx.measureText(text).width > max && s > 22); return s + 2; }
function loadImg(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function productoFoto(nombre) {
  const p = S.t.productos.find(x => CL.norm(x.nombre) === CL.norm(nombre));
  if (!p) return '';
  const f = p.fotoId ? S.t.archivos.find(a => a.id === p.fotoId) : S.t.archivos.find(a => a.entidad === 'productos' && a.entidadId === p.id && a.miniatura);
  return f && f.miniatura && /^data:image\//.test(f.miniatura) ? f.miniatura : '';
}

export async function pintar(canvas, per, opt) {
  opt = opt || {};
  const c = cifras(per), ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const css = getComputedStyle(document.documentElement);
  const brand = (css.getPropertyValue('--brand') || '#7c3aed').trim() || '#7c3aed', brand2 = (css.getPropertyValue('--brand-2') || '#c4478f').trim() || '#c4478f';
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, brand); g.addColorStop(1, brand2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // brillos suaves
  const rg = ctx.createRadialGradient(W * 0.85, H * 0.08, 10, W * 0.85, H * 0.08, 520); rg.addColorStop(0, 'rgba(255,255,255,.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  const rg2 = ctx.createRadialGradient(W * 0.05, H * 0.95, 10, W * 0.05, H * 0.95, 600); rg2.addColorStop(0, 'rgba(0,0,0,.28)'); rg2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
  const F = '"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
  // cabecera
  const empresa = (S.cfg.empresa && S.cfg.empresa.nombre) || 'Mi taller';
  ctx.font = '600 38px ' + F; ctx.globalAlpha = .9; ctx.fillText(empresa.toUpperCase(), 80, 120); ctx.globalAlpha = 1;
  ctx.font = '700 84px ' + F; ctx.fillText('Nuestro ' + (per.k === 'semana' ? 'resumen' : 'mes'), 80, 235);
  ctx.font = '500 52px ' + F; ctx.globalAlpha = .92; ctx.fillText(per.t, 80, 305); ctx.globalAlpha = 1;
  // tarjetas de cifras
  const cells = [[String(c.pedidos), c.pedidos === 1 ? 'pedido' : 'pedidos']];
  if (c.enviados) cells.push([String(c.enviados), c.enviados === 1 ? 'paquete enviado' : 'paquetes enviados']);
  if (c.piezas) cells.push([String(c.piezas), c.piezas === 1 ? 'pieza impresa' : 'piezas impresas']);
  if (c.horas) cells.push([String(c.horas), c.horas === 1 ? 'hora de impresión' : 'horas de impresión']);
  if (opt.ventas && c.ventas > 0) cells.push([eur(c.ventas), 'facturado']);
  if (c.clientes > 1) cells.push([String(c.clientes), 'clientes felices']);
  const cw = 440, chh = 178, gx = 40, gy = 30, x0 = 80, y0 = 370;
  cells.slice(0, 6).forEach((cell, i) => {
    const x = x0 + (i % 2) * (cw + gx), y = y0 + Math.floor(i / 2) * (chh + gy);
    ctx.fillStyle = 'rgba(255,255,255,.17)'; rr(ctx, x, y, cw, chh, 34); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; rr(ctx, x, y, cw, chh, 34); ctx.stroke();
    ctx.fillStyle = '#fff'; const s = fit(ctx, cell[0], cw - 60, 84, 800); ctx.font = '800 ' + s + 'px ' + F; ctx.fillText(cell[0], x + 32, y + 98);
    ctx.font = '500 32px ' + F; ctx.globalAlpha = .92; ctx.fillText(cell[1], x + 32, y + 146); ctx.globalAlpha = 1;
  });
  // producto estrella
  const rows = Math.ceil(Math.min(6, cells.length) / 2), yS = y0 + rows * (chh + gy) + 10;
  if (c.top) {
    const bh = 250; ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(ctx, 80, yS, W - 160, bh, 38); ctx.fill();
    const img = await loadImg(productoFoto(c.top.nombre)); let tx = 120;
    if (img) { ctx.save(); rr(ctx, 110, yS + 25, 200, 200, 26); ctx.clip(); const k = Math.max(200 / img.width, 200 / img.height); ctx.drawImage(img, 110 + (200 - img.width * k) / 2, yS + 25 + (200 - img.height * k) / 2, img.width * k, img.height * k); ctx.restore(); tx = 340; }
    ctx.fillStyle = brand; ctx.font = '700 30px ' + F; ctx.fillText('⭐ EL MÁS PEDIDO', tx, yS + 80);
    ctx.fillStyle = '#1d1a2b'; const s = fit(ctx, c.top.nombre, W - 80 - tx - 40, 56, 700); ctx.font = '700 ' + s + 'px ' + F; ctx.fillText(c.top.nombre, tx, yS + 150);
    ctx.fillStyle = '#6b6580'; ctx.font = '500 34px ' + F; ctx.fillText(c.top.uds + (c.top.uds === 1 ? ' unidad' : ' unidades'), tx, yS + 200);
  }
  // mensaje y pie
  const msg = String(opt.mensaje || '').trim() || 'Gracias por apoyar lo hecho a mano (y a capas).';
  ctx.fillStyle = '#fff'; ctx.font = '600 44px ' + F;
  const words = msg.split(/\s+/), lines = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > W - 160 && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 80, H - 150 + i * 56 - (Math.min(3, lines.length) - 1) * 28));
  ctx.font = '500 30px ' + F; ctx.globalAlpha = .85; ctx.fillText((S.cfg.empresa && S.cfg.empresa.web) || '', 80, H - 50); ctx.globalAlpha = 1;
  return c;
}

export function abrirTarjeta() {
  const pers = periodos();
  const st = { per: pers[0], ventas: false, mensaje: '' };
  const cv = h('canvas.tarjeta-cv', { width: W, height: H, 'aria-label': 'Vista previa de la tarjeta' });
  const render = () => pintar(cv, st.per, st).catch(e => console.error(e));
  const selP = h('select.inp', { onchange: e => { st.per = pers.find(p => p.k === e.target.value); render(); } }, pers.map(p => h('option', { value: p.k }, p.t)));
  const msg = inp({ placeholder: 'Gracias por apoyar lo hecho a mano (y a capas).', maxlength: 120, oninput: e => { st.mensaje = e.target.value; clearTimeout(msg._t); msg._t = setTimeout(render, 200); } });
  const money = can('informes.ver') ? h('label.check', sw(false, v => { st.ventas = v; render(); }), 'Enseñar también lo facturado (por defecto NO sale)') : null;
  const descargar = () => {
    cv.toBlob(b => {
      if (!b) return toast('No se pudo crear la imagen', 'bad');
      const a = h('a', { href: URL.createObjectURL(b), download: 'resumen_' + st.per.k + '_' + (S.hoy || '') + '.png' });
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      toast('Imagen guardada en Descargas');
    }, 'image/png');
  };
  const copiar = () => {
    if (!navigator.clipboard || !window.ClipboardItem) return toast('Tu navegador no deja copiar imágenes: usa Descargar', 'warn');
    cv.toBlob(b => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(() => toast('Imagen copiada: pégala en tu red'), () => toast('No se pudo copiar: usa Descargar', 'warn')), 'image/png');
  };
  const body = h('div.tarjeta-box',
    h('div.tarjeta-prev', cv),
    h('div.col.tarjeta-ctl', { style: { gap: '10px' } },
      h('p.small.muted', 'Imagen lista para Instagram o Wallapop con tus cifras reales. Los ingresos no salen salvo que lo marques.'),
      field('Periodo', selP), field('Mensaje final', msg), money,
      h('div.row.wrap', { style: { gap: '8px' } }, btn('Descargar PNG', descargar, { cls: 'primary', icon: 'download' }), btn('Copiar imagen', copiar))));
  modal('📸 Tarjeta para redes', body, null, { size: 'wide' });
  render();
}
