// ================= v15.4 · BIOUVISION · comparar ANTES / DESPUÉS =================
// Dos fotos una encima de otra y una línea que se arrastra (ratón, dedo o flechas del teclado).
// Con la 🔍 lupa se ve la foto nueva a tamaño real (los detalles del 4K) al pasar por encima.
import { h } from '../ui.js';

export function comparador(antes, despues, { inicio = 0.5, etiquetas = ['Antes', 'Después'], demo = false } = {}) {
  const imgA = h('img.bc-img', { src: antes, alt: etiquetas[0], draggable: 'false' });
  const imgD = h('img.bc-img', { src: despues, alt: etiquetas[1], draggable: 'false' });
  const capa = h('div.bc-capa', imgD);
  const mango = h('div.bc-mango', '⟷');
  const linea = h('div.bc-linea', mango);
  const lupa = h('div.bc-lupa');
  const caja = h('div.bc', { tabindex: 0, role: 'slider', 'aria-label': 'Comparar antes y después (flechas izquierda y derecha)', 'aria-valuemin': 0, 'aria-valuemax': 100 },
    imgA, capa, linea, lupa, h('span.bc-et.izq', etiquetas[0]), h('span.bc-et.der', etiquetas[1]));
  let p = inicio, arrastra = false, conLupa = false, auto = 0;
  const pon = v => {
    p = Math.max(0, Math.min(1, v));
    capa.style.clipPath = 'inset(0 0 0 ' + (p * 100).toFixed(2) + '%)';
    linea.style.left = (p * 100).toFixed(2) + '%';
    caja.setAttribute('aria-valuenow', Math.round(p * 100));
  };
  // la parte de la caja donde se ve la foto (object-fit: contain)
  const zonaFoto = () => {
    const r = caja.getBoundingClientRect(), nw = imgD.naturalWidth || 1, nh = imgD.naturalHeight || 1, k = Math.min(r.width / nw, r.height / nh);
    return { r, x: (r.width - nw * k) / 2, y: (r.height - nh * k) / 2, w: nw * k, h: nh * k, k, nw, nh };
  };
  const desdeX = e => { const r = caja.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  const pintaLupa = e => {
    const z = zonaFoto(), x = e.clientX - z.r.left, y = e.clientY - z.r.top;
    const dentro = x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
    lupa.classList.toggle('ver', conLupa && dentro);
    if (!conLupa || !dentro) return;
    const fx = (x - z.x) / z.w, fy = (y - z.y) / z.h, R = lupa.offsetWidth / 2, ladoAntes = fx < p;
    const src = ladoAntes ? imgA : imgD, nw = src.naturalWidth || z.nw, nh = src.naturalHeight || z.nh;
    const esc = Math.max(1, Math.min(4, z.nw / z.w)); // a tamaño real de la foto nueva (sin pasar de ×4)
    const bw = z.w * esc, bh = z.h * esc;
    lupa.style.left = (x - R) + 'px'; lupa.style.top = (y - R) + 'px';
    lupa.style.backgroundImage = 'url("' + src.src + '")';
    lupa.style.backgroundSize = bw + 'px ' + bh + 'px';
    lupa.style.backgroundPosition = (R - fx * bw) + 'px ' + (R - fy * bh) + 'px';
    void nw; void nh;
  };
  caja.addEventListener('pointerdown', e => { if (conLupa && e.pointerType === 'mouse') return; arrastra = true; parar(); caja.setPointerCapture(e.pointerId); pon(desdeX(e)); });
  caja.addEventListener('pointermove', e => { if (arrastra) pon(desdeX(e)); pintaLupa(e); });
  caja.addEventListener('pointerup', () => { arrastra = false; });
  caja.addEventListener('pointercancel', () => { arrastra = false; });
  caja.addEventListener('pointerleave', () => lupa.classList.remove('ver'));
  caja.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); parar(); pon(p + (e.key === 'ArrowLeft' ? -0.05 : 0.05)); }
    else if (e.key === 'Home') { e.preventDefault(); pon(0); } else if (e.key === 'End') { e.preventDefault(); pon(1); }
  });
  // en la portada se mueve sola, despacio, hasta que la tocas
  const parar = () => { if (auto) { cancelAnimationFrame(auto); auto = 0; caja.classList.remove('auto'); } };
  if (demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    caja.classList.add('auto'); const t0 = performance.now();
    const paso = t => { pon(0.5 + 0.38 * Math.sin((t - t0) / 1900)); auto = requestAnimationFrame(paso); };
    auto = requestAnimationFrame(paso);
  }
  pon(p);
  return {
    el: caja,
    lupa(on) { conLupa = on === undefined ? !conLupa : !!on; caja.classList.toggle('con-lupa', conLupa); if (!conLupa) lupa.classList.remove('ver'); return conLupa; },
    cambiar(a, d) { if (a) imgA.src = a; if (d) imgD.src = d; },
    poner: pon, parar
  };
}
