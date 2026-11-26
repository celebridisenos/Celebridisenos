// ================= 26-11-2026 · 🖨️ IMPRENTA · «Tu Epson»: la pantalla para imprimir bonito con la ET-2860 =================
// Biou (26-11): «quiero implementar esto y que se vea bien» + su sí a acabarlo e instalarlo. Junta en una sola pantalla:
//   1) elegir el papel por su nombre («Foto brillante · Alta» por defecto, «Normal · Estándar» para borradores) y comprobarlo
//      con la Epson SIN gastar papel (epson.js → POST /local/imprenta/validar);
//   2) una HOJA DE PRUEBA de recortables (tarjetas, pegatinas, coleccionables) con las marcas de corte negras, la raya del borde,
//      un parche de negro puro y la regla de 50 mm: se ve en pantalla, se guarda en PDF y, solo si Biou lo confirma, 1 hoja a la Epson;
//   3) el asistente de CALIBRAR (calibrar.js), con su almacén de perfiles en el host.
// NADA se imprime sin confirmDlg (dice cuántas hojas y de qué papel) y el host vuelve a parar si la Epson cambiaría algo (409).
// Para enchufarla en el menú (lo hace la sesión de CD, app.js): epson: () => import('./imprenta/vista_epson.js')  → render(el)
import * as EP from './epson.js';
import * as M from './modelo.js';
import * as H from './hoja.js';

// ---------- hablar con el host (/local/imprenta/…, misma llave que desktop.js) ----------
const host = () => (typeof window !== 'undefined' && window.__HOST__) || null;
async function llamar(ruta, opts = {}) {
  const hh = host(); if (!hh) throw new Error('Esto solo se puede en el programa del PC de la Epson');
  let r; try { r = await fetch('/local/imprenta/' + ruta, Object.assign({}, opts, { cache: 'no-store', headers: Object.assign({ 'X-Host-Key': hh.key }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}) })); }
  catch (e) { throw new Error('Sin conexión con el programa de este PC. Ciérralo y ábrelo otra vez.'); }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) { const e = new Error((j && j.error) || ('Error local ' + r.status)); e.status = r.status; e.datos = j; throw e; }
  return j;
}
export const api = {
  capacidades: () => llamar('capacidades?printer=' + encodeURIComponent(EP.IMPRESORA)),
  validar: cuerpo => llamar('validar', { method: 'POST', body: JSON.stringify(cuerpo) }),
  imprimir: cuerpo => llamar('imprimir', { method: 'POST', body: JSON.stringify(cuerpo) }),
  leer: (tipo, id) => llamar('leer?tipo=' + encodeURIComponent(tipo) + '&id=' + encodeURIComponent(id)),
  guardar: (tipo, id, obj) => llamar('guardar?tipo=' + encodeURIComponent(tipo) + '&id=' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify(obj) })
};

// ---------- PDF sencillo: una imagen JPEG por página, a su tamaño real en mm (para guardar o mandar; nada vectorial) ----------
const enc = new TextEncoder();
export async function pdfSencillo(paginas) {
  const jpgs = await Promise.all(paginas.map(p => new Promise((res, rej) => p.canvas.toBlob(b => b ? b.arrayBuffer().then(a => res(new Uint8Array(a))) : rej(new Error('no se pudo hacer la imagen')), 'image/jpeg', 0.92))));
  const partes = [], offs = []; let n = 0;
  const pon = x => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); n += b.length; };
  const obj = (id, cuerpo) => { offs[id] = n; pon(id + ' 0 obj\n'); (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).forEach(pon); pon('\nendobj\n'); };
  const N = paginas.length, kids = paginas.map((_, i) => (3 + i * 3) + ' 0 R').join(' ');
  pon('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + N + ' >>');
  paginas.forEach((p, i) => {
    const pg = 3 + i * 3, ct = pg + 1, im = pg + 2, W = (p.wmm / 25.4 * 72).toFixed(3), Hh = (p.hmm / 25.4 * 72).toFixed(3), c = p.canvas;
    const flujo = 'q ' + W + ' 0 0 ' + Hh + ' 0 0 cm /Im0 Do Q';
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + Hh + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
    obj(ct, ['<< /Length ' + flujo.length + ' >>\nstream\n', flujo, '\nendstream']);
    obj(im, ['<< /Type /XObject /Subtype /Image /Width ' + c.width + ' /Height ' + c.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpgs[i].length + ' >>\nstream\n', jpgs[i], '\nendstream']);
  });
  const total = 3 + N * 3, xref = n;
  pon('xref\n0 ' + total + '\n0000000000 65535 f \n'); for (let i = 1; i < total; i++) pon(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  pon('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(partes, { type: 'application/pdf' });
}
function bajar(blob, nombre) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }
const b64 = canvas => { const u = canvas.toDataURL('image/png'); return u.slice(u.indexOf(',') + 1); };

// ---------- la hoja de prueba (recortables) ----------
export function hojaDePrueba() {
  const C = M.COLORES;
  const tarjeta = M.nuevoDoc({ id: 'prueba_tarjeta', tamano: 'visita', sangrado: 0, fondo: C.grafito, capas: [
    { t: 'texto', texto: 'CelebriDiseños', x: 6, y: 17, w: 73, h: 10, tam: 16, peso: 600, color: C.hueso, alin: 'centro' },
    { t: 'texto', texto: 'Hecho a mano en el taller', x: 6, y: 30, w: 73, h: 6, tam: 8, color: C.turquesaLogo, alin: 'centro' },
    { t: 'forma', forma: 'rect', x: 0, y: 49, w: 85, h: 6, relleno: C.turquesa }] });
  const pegatina = M.nuevoDoc({ id: 'prueba_pegatina', tamano: 'cierre40', sangrado: 0, fondo: C.turquesa, capas: [
    { t: 'texto', texto: 'Gracias', x: 4, y: 14, w: 32, h: 10, tam: 13, peso: 600, color: C.grafito, alin: 'centro' }] });
  const colec = M.nuevoDoc({ id: 'prueba_coleccion', tamano: 'coleccion', sangrado: 0, fondo: C.hueso, capas: [
    { t: 'forma', forma: 'rect', x: 5, y: 5, w: 53, h: 40, relleno: C.lila, radio: 2 },
    { t: 'forma', forma: 'rect', x: 5, y: 49, w: 53, h: 12, relleno: '#000000' },
    { t: 'texto', texto: 'Negro puro: tiene que salir NEGRO, no gris', x: 5, y: 63, w: 53, h: 6, tam: 6.5, color: C.grafito, alin: 'centro' },
    { t: 'texto', texto: 'Colección Taller · prueba', x: 5, y: 74, w: 53, h: 8, tam: 9, peso: 600, color: C.grafito, alin: 'centro' }] });
  const docs = [tarjeta, pegatina, colec];
  const rep = H.repartir([{ id: tarjeta.id, w: 85, h: 55, n: 4, sangrado: 0 }, { id: pegatina.id, w: 40, h: 40, n: 6, sangrado: 0, forma: 'circulo' }, { id: colec.id, w: 63, h: 88, n: 2, sangrado: 0, forma: 'redondo', radio: 3 }], { W: 210, H: 297, sep: 4, pie: 6 });
  return { docs, rep };
}

// ---------- pantalla ----------
const CSS = `
.imp-tu{color:#1F2328;max-width:1100px;margin:0 auto;padding:14px 18px 48px;font-family:Inter,Manrope,system-ui,sans-serif}
.imp-tu h2{font-size:24px;margin:0 0 4px}
.imp-tu-sub{color:#4A4F57;font-size:14px;margin:0 0 14px}
.imp-tu-bloque{background:#F6F5F2;border-radius:16px;padding:16px 18px;margin:14px 0}
.imp-tu-bloque h3{font-size:18px;margin:0 0 10px}
.imp-tu-hoja{display:grid;grid-template-columns:minmax(220px,420px) 1fr;gap:18px;align-items:start}
.imp-tu-hoja canvas{width:100%;height:auto;background:#fff;border:1px solid #8A8F98;box-shadow:0 2px 10px rgba(31,35,40,.18)}
.imp-tu-lista{margin:0 0 12px 18px;padding:0;font-size:14px;line-height:1.6}
.imp-tu-acc{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
.imp-tu-btn{border:0;border-radius:12px;padding:11px 18px;font:inherit;font-weight:800;cursor:pointer;background:#1F2328;color:#F6F5F2}
.imp-tu-btn.claro{background:#fff;color:#1F2328;box-shadow:0 0 0 2px #1F2328 inset}
.imp-tu-btn[disabled]{opacity:.35;cursor:default}
.imp-tu-estado{font-size:14px;margin:8px 0;min-height:20px}
.imp-tu-res{border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14px;border-left:6px solid #C0392B;background:#FBE9E7}
.imp-tu-res.ok{border-left-color:#00A6A6;background:#E3F6F6}
.imp-tu-res b{display:block;margin-bottom:4px}
.imp-tu-nota{font-size:13px;color:#4A4F57}
@media (max-width:720px){.imp-tu-hoja{grid-template-columns:1fr}}
`;

export async function render(el) {
  const U = await import('../ui.js');
  const { h, mount, toast, confirmDlg } = U;
  if (!document.getElementById('imp-tu-css')) { const s = document.createElement('style'); s.id = 'imp-tu-css'; s.textContent = CSS; document.head.appendChild(s); }
  const enPC = !!host(), { docs, rep } = hojaDePrueba();
  const S = { perfil: EP.perfilPorDefecto(), cargado: EP.perfilPorDefecto().papel, ocupado: false, estado: '', res: null };
  const zonaPanel = h('div'), zonaCal = h('div'), vista = h('canvas'), estado = h('div.imp-tu-estado'), resultado = h('div');
  const btnImp = h('button.imp-tu-btn', { type: 'button', disabled: !enPC, onclick: () => imprimirPrueba() }, 'Imprimir esta hoja (1 hoja)');
  const btnPdf = h('button.imp-tu-btn.claro', { type: 'button', onclick: () => guardarPdf() }, 'Guardar en PDF');
  const ponEstado = t => { estado.textContent = t || ''; };
  const ponRes = (ok, titulo, textos) => mount(resultado, h('div.imp-tu-res' + (ok ? '.ok' : ''), h('b', titulo), (textos || []).length ? h('ul', textos.map(t => h('li', t))) : null));

  mount(el, h('div.imp-tu',
    h('h2', 'Tu Epson'),
    h('p.imp-tu-sub', 'Epson ET-2860. Eliges el papel, la Epson lo comprueba antes y nada se imprime sin que digas sí.'),
    enPC ? null : h('div.imp-tu-res', h('b', 'Aquí no está la Epson'), 'Para comprobar e imprimir, abre CelebriDiseños en el PC de la Epson. Aquí puedes ver la hoja y guardarla en PDF.'),
    h('div.imp-tu-bloque', zonaPanel),
    h('div.imp-tu-bloque', h('h3', 'Hoja de prueba de recortables'),
      h('div.imp-tu-hoja', vista, h('div',
        h('ul.imp-tu-lista', h('li', 'Marcas negras en las 4 esquinas de cada pieza, por fuera.'), h('li', 'Raya fina justo en el borde: corta por ella.'),
          h('li', 'Parche de negro puro: tiene que salir negro, no gris.'), h('li', 'Regla abajo: si mide 50 mm justos, sale a tamaño real.')),
        h('div.imp-tu-acc', btnImp, btnPdf), estado, resultado,
        h('p.imp-tu-nota', 'Se pinta a ' + EP.perfilPorDefecto().dpi + ' ppp (A4 = ' + EP.pixelesHoja('psk:ISOA4', 600).w + ' × ' + EP.pixelesHoja('psk:ISOA4', 600).h + ' px) y se coloca a su tamaño en mm: nunca «ajustar a la página».')))),
    h('div.imp-tu-bloque', h('h3', 'Calibrar con hojas de prueba'),
      h('p.imp-tu-nota', 'Colores, grises, nitidez y márgenes. Imprimes, lo miras tú y eliges. Nada se da por bueno solo.'),
      h('div.imp-tu-acc', h('button.imp-tu-btn.claro', { type: 'button', onclick: () => abrirCalibrar() }, 'Abrir el asistente de calibrar')), zonaCal)));

  // 1) papel + comprobar
  await EP.panelImpresion(zonaPanel, api, { alCambiar: (p, cargado) => { S.perfil = p; S.cargado = cargado; mount(resultado); pintaVista(); } });
  // 2) la hoja en pantalla
  async function pintaVista() {
    const c = await H.canvasHoja(rep, 0, docs, { dpi: 72, regla: true, texto: S.perfil.t });
    vista.width = c.width; vista.height = c.height; vista.getContext('2d').drawImage(c, 0, 0);
  }
  await pintaVista();

  async function imprimirPrueba() {
    if (S.ocupado) return;
    const p = S.perfil, cargado = S.cargado, antes = EP.revisarAntes(p, cargado);
    if (!antes.ok) return ponRes(false, 'Así no se imprime', antes.bloqueos);
    const pp = EP.papel(cargado);
    const ok = await confirmDlg('¿Imprimo 1 hoja?', 'Vas a gastar 1 hoja A4 de ' + pp.t.toLowerCase() + ' y tinta, con «' + p.t + '». ¿La imprimo?', 'Sí, imprimir 1 hoja', false);
    if (!ok) return;
    S.ocupado = true; btnImp.disabled = true; mount(resultado);
    try {
      ponEstado('Preparando la hoja a ' + p.dpi + ' ppp…');
      const c = await H.canvasHoja(rep, 0, docs, { dpi: p.dpi, regla: true, texto: p.t });
      ponEstado('La Epson lo comprueba y la imprime…');
      const t = EP.ticketDe(p, { copias: 1, papelCargado: cargado });
      await api.imprimir(Object.assign({}, t, { paginas: [b64(c)], offx: 0, offy: 0, documento: 'Hoja de prueba ' + p.t, destino: 'impresora', confirmo: true, confirmarCopias: 1 }));
      ponEstado(''); ponRes(true, 'Mandada a la Epson', ['Cuando salga, mírala: negros negros, marcas en las esquinas y la regla de 50 mm.']);
      toast('Mandada a la Epson', 'ok');
    } catch (e) {
      ponEstado('');
      if (e.status === 409 && e.datos && (e.datos.cambios || e.datos.fotoComoNormal)) {
        const v = EP.leerValidacion(EP.ticketDe(p, { copias: 1, papelCargado: cargado }), { aceptado: e.datos.aceptado || {}, cambios: e.datos.cambios || [] });
        ponRes(false, 'No se ha impreso: la Epson cambiaría algo', v.textos.length ? v.textos : [e.message]);
      } else ponRes(false, 'No se ha impreso', [e.message || String(e)]);
    } finally { S.ocupado = false; btnImp.disabled = !enPC; }
  }
  async function guardarPdf() {
    try { ponEstado('Preparando el PDF…'); const c = await H.canvasHoja(rep, 0, docs, { dpi: 300, regla: true, texto: S.perfil.t }); bajar(await pdfSencillo([{ canvas: c, wmm: 210, hmm: 297 }]), 'Hoja de prueba recortables.pdf'); ponEstado(''); toast('PDF guardado', 'ok'); }
    catch (e) { ponEstado(''); toast('No se pudo hacer el PDF: ' + (e && e.message || e), 'bad'); }
  }
  // 3) calibrar (asistente de calibrar.js; los perfiles se guardan en el almacén del host)
  async function abrirCalibrar() {
    const CAL = await import('./calibrar.js');
    await CAL.renderCalibrar(zonaCal, {
      capacidades: async () => { if (!enPC) return null; try { return await api.capacidades(); } catch (e) { return null; } },
      imprimir: async (paginas, a) => api.imprimir({
        printer: EP.IMPRESORA, paginas: paginas.map(x => b64(x.canvas)), wmm: paginas[0].wmm, hmm: paginas[0].hmm, papel: (a.papel && a.papel.ticket) || 'psk:ISOA4',
        tipo: a.tipo, calidad: a.calidad, color: a.color === 'psk:Monochrome' ? 'mono' : 'color', copias: 1, offx: Number(a.offx) || 0, offy: Number(a.offy) || 0,
        documento: 'Calibrar', destino: 'impresora', confirmo: true, confirmarCopias: 1, papelCargado: (EP.papelDeTipo(a.tipo) || {}).id || '' }),
      exportarPdf: async (paginas, nombre) => bajar(await pdfSencillo(paginas), String(nombre || 'Prueba').replace(/[\\/:*?"<>|]+/g, ' ') + '.pdf'),
      leerPerfiles: async () => { if (!enPC) return []; try { const j = await api.leer('perfiles', 'calibrar'); return (j && j.lista) || []; } catch (e) { if (e.status === 404) return []; throw e; } },
      guardarPerfiles: async lista => { if (!enPC) throw new Error('Los perfiles se guardan en el PC de la Epson'); return api.guardar('perfiles', 'calibrar', { nombre: 'Perfiles de calibración', lista }); }
    });
  }
  return {};
}
