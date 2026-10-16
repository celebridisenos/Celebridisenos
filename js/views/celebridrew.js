// ================= 👗 CelebriDREW · la pantalla (ropa en 3D, como CLO3D, dentro de CelebriDiseños) =================
// A la izquierda, la biblioteca (prenda, avatar, tela, exportar); en el centro, el 3D (el avatar con la prenda cosida y cayendo de verdad)
// y a su lado el PATRÓN 2D. Lo que se cambia en el 2D (un punto, una curva, una medida) se ve en el 3D EN DIRECTO: la prenda nueva sale
// ya puesta desde la anterior y se recoloca sola. La simulación va en su propio hilo (drew/tela_worker.js): la pantalla no se congela.
// Todo se guarda en este aparato (IndexedDB). Lo estimado se dice estimado; la validación geométrica no sustituye una prueba con tela.
import { h, mount, btn, toast, modal, confirmDlg, debounce } from '../ui.js';
import { go } from '../app.js';
import * as BL from '../drew/bloques/index.js';
import * as Z from '../drew/pieza.js';
import * as G from '../drew/geom.js';
import * as PR from '../drew/proyecto.js';
import * as EX from '../drew/exporta.js';
import * as TA from '../drew/tallas.js';
import { valida, ESTADOS } from '../drew/valida.js';
import { editor2d } from '../drew/editor2d.js';
import { vista3d, PIELES, ASPECTO } from '../drew/vista3d.js';
import { CAMPOS, base as baseAvatar, estimaPorPeso, desdeTabla, cuerpoParaPrenda, imc } from '../drew/avatar.js';
import { TELAS } from '../drew/tela.js';
import { DISENOS, precio, eur, PRECIO_TELA, POR_DEFECTO } from '../drew/disenos.js'; // 16-10: diseños listos (un clic y vestido) y el precio estimado
import { TIPOS as TIPOS_COSTURA, tipoDe, edicionesTipo } from '../drew/montaje.js'; // 16-10: el tipo de cada costura (cambia sus márgenes y sale en el PDF)
import * as IU from '../drew/inspira_ui.js'; import * as INS from '../drew/foto/inspira.js'; // 16-10: 🌐 diseñar desde una imagen (internet, revista…)
import * as CU from '../drew/calibra_ui.js'; import { impresora as impresoraCalibrada, pct } from '../drew/calibra.js'; // 16-10: pestaña 📷 Foto (guía, medir con un folio A4, calibrar la impresora)

const ULTIMO = 'cd.drew.ultimo';
const COLOR_DE = { camiseta: '#5f7ea8', sudadera: '#8a6fa8', falda: '#b0705f', pantalon: 'natural', vestido: '#7a2b3a' }; // (el pantalón, vaquero con su color de verdad) // (que la tela se distinga del maniquí)
const COLORES = ['#efece6', '#1f1f24', '#9aa3ad', '#3f5a7d', '#b59b74', '#7a2b3a', '#2f5d50', '#c9a0b6', '#e8c547', '#d96c4f', '#6b4fa0', '#f2d0c4'];
const descarga = (datos, nombre, tipo) => { const b = datos instanceof Blob ? datos : new Blob([datos], { type: tipo || 'application/octet-stream' }), u = URL.createObjectURL(b), a = h('a', { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); };
const limpio = s => String(s || 'prenda').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'prenda';

function proyectoNuevo(k = 'camiseta') {
  const P = PR.nuevo(BL.BLOQUES[k].t);
  Object.assign(P, { k, opciones: BL.opcionesPorDefecto(k), ajuste: 'normal', autoAjuste: true, porPlantilla: {},
    avatar: { sexo: 'mujer', via: 'talla', talla: 'M', med: desdeTabla('mujer', TA.TABLAS.mujer.tallas.find(t => t.t === 'M').v), piel: 'maniqui' },
    tela: { def: null, color: COLOR_DE[k] || '#5f7ea8', porPieza: {} }, disp: {} });
  return P;
}

export function render(root) {
  if (!document.querySelector('link[href$="css/drew.css"]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: 'css/drew.css' }));
  // 16-10 · ella: «el programa se tiene que ver a tamaño completo, dejando una pequeña pestaña si quieres volver al menú principal»
  document.body.classList.add('dw-solo');
  const pestanaMenu = h('button.dw-volver', { type: 'button', title: 'Volver al menú principal de CelebriDiseños', onclick: () => go('') }, '☰ Menú');
  document.body.appendChild(pestanaMenu);
  const st = { P: null, hist: PR.historial(), pest: 'prenda', V: null, sel: null, modo: 'elegir', mapa: false, tirar: false, verAv: true, topo: null, Sv: null, med3d: null, niveles: null, est3d: null, cosida: false, quieta: false, avatarOk: false, vivo: true, errorPrenda: null };
  // ---------- el esqueleto ----------
  const nombre = h('input.dw-nombre', { 'aria-label': 'Nombre de la prenda', onchange: e => { st.P.nombre = e.target.value.trim() || 'Prenda'; guarda(); } });
  const bDeshacer = btn('↶', () => deshacer(), { cls: 'ghost', title: 'Deshacer (Ctrl+Z)' }), bRehacer = btn('↷', () => rehacer(), { cls: 'ghost', title: 'Rehacer (Ctrl+Y)' });
  // 16-10 · ATELIER: la cara propia de CelebriDREW (marfil y tinta; «☾» la pone de noche y se recuerda en este aparato)
  let temaNoche = false; try { temaNoche = localStorage.getItem('cd.drew.tema') === 'noche'; } catch (e) { }
  document.body.classList.toggle('dw-noche-on', temaNoche); /* (las ventanas van fuera de .dw: el tema de noche les llega por el body) */
  const bTema = btn(temaNoche ? '☀' : '☾', () => { temaNoche = !temaNoche; raiz.classList.toggle('dw-noche', temaNoche); document.body.classList.toggle('dw-noche-on', temaNoche); bTema.querySelector('span').textContent = temaNoche ? '☀' : '☾'; try { localStorage.setItem('cd.drew.tema', temaNoche ? 'noche' : 'dia'); } catch (e) { } }, { cls: 'ghost', title: 'Atelier de día / de noche' });
  const cab = h('div.dw-cab', h('h1.dw-marca', 'Celebri', h('b', 'DREW'), h('small', 'atelier 3D')), nombre, bDeshacer, bRehacer, h('div.esp'), bTema,
    btn('📂 Mis prendas', () => misPrendas(), { cls: 'ghost' }), btn('＋ Nueva', () => nueva(), { cls: 'ghost' }), btn('🎬 Vídeo 7 s', () => video7(), { cls: 'ghost', title: 'Un vídeo vertical de 7 segundos de la prenda girando, para redes (V)' }), btn('📄 PDF para imprimir', () => exporta('pdf'), { cls: 'primary', title: 'Patrón completo con manual (Ctrl+P)' }),
    btn('⛶', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Este navegador no deja ponerla a pantalla completa', 'bad')); }, { cls: 'ghost', title: 'Pantalla completa (F11)' }), btn('⌨', () => atajos(), { cls: 'ghost', title: 'Atajos de teclado (?)' }));
  const pestanas = h('div.dw-pest', { role: 'tablist' }), panel = h('div.dw-panel');
  const lado = h('div.dw-lado', pestanas, panel);
  // 3D
  const lienzo3 = h('div.dw-lienzo'), aviso3 = h('div.dw-aviso3d', 'Preparando el avatar…'), leyenda = h('div.dw-leyenda', { style: { display: 'none' } }, h('div', h('i', { style: { background: '#4fc75a' } }), 'Suelta'), h('div', h('i', { style: { background: '#f2c84a' } }), 'Justa (5 %)'), h('div', h('i', { style: { background: '#f04a2c' } }), 'Tira (10 % o más)'), h('div', h('i', { style: { background: '#5a8cf2' } }), 'Arrugada'));
  const barra3 = h('div.dw-barra'), ven3 = h('div.dw-ven.v3', barra3, h('div', { style: { position: 'relative', minHeight: 0 } }, lienzo3, aviso3, leyenda));
  // 2D
  const lienzo2 = h('div.dw-lienzo'), barra2 = h('div.dw-barra'), ficha = h('div.dw-ficha', { style: { display: 'none' } });
  const ven2 = h('div.dw-ven.v2', barra2, h('div', { style: { position: 'relative', minHeight: 0 } }, lienzo2, ficha));
  const divisor = h('div.dw-divisor', { title: 'Arrastra para cambiar el tamaño' }), vistas = h('div.dw-vistas', ven3, divisor, ven2);
  const pie = h('div.dw-pie');
  const raiz = h('div.dw.dw-atelier' + (temaNoche ? '.dw-noche' : ''), cab, h('div.dw-cuerpo', lado, vistas), pie);
  mount(root, raiz);
  // el divisor entre el 3D y el 2D
  divisor.addEventListener('pointerdown', ev => { divisor.setPointerCapture(ev.pointerId); const r = vistas.getBoundingClientRect(), mv = e => { const f = Math.max(0.25, Math.min(0.75, (e.clientX - r.left) / r.width)); vistas.style.setProperty('--dw-izq', (f / (1 - f)).toFixed(3) + 'fr'); }, up = () => { divisor.removeEventListener('pointermove', mv); divisor.removeEventListener('pointerup', up); }; divisor.addEventListener('pointermove', mv); divisor.addEventListener('pointerup', up); });

  // ---------- 3D ----------
  const V = vista3d(lienzo3);
  // ---------- el hilo de la simulación ----------
  const W = new Worker(new URL('../drew/tela_worker.js', import.meta.url), { type: 'module' });
  W.onerror = e => { aviso3.textContent = '⚠️ La simulación 3D no ha podido arrancar: ' + (e.message || 'error'); };
  W.onmessage = e => { const m = e.data; if (!st.vivo) return;
    if (m.tipo === 'avatar') { V.ponAvatar({ H: m.H }, m.malla); st.med3d = { medido: m.medido, objetivo: m.objetivo, desvio: m.desvio, ms: m.ms, premium: m.premium, fuera: m.fuera }; if (m.aviso) toast(m.aviso, 'bad', 8000); st.niveles = m.niveles; st.avatarOk = true; V.piel(st.P.avatar.piel); V.verAvatar(st.verAv);
      aviso3.textContent = 'Avatar listo (' + (m.ms / 1000).toFixed(1) + ' s). Cosiendo la prenda…'; if (st.P.autoAjuste) { ajustaAlAvatar(); regenera(true); } else mandaPrenda(true); if (st.pest === 'avatar') pintaPanel(); }
    else if (m.tipo === 'modelo') { st.topo = m.topo; st.Sv = { P: m.topo.P.map(p => ({ off: p.off, n: p.n, tri: p.tri, tela: p.tela, pz: { nombre: p.nombre } })), uv: m.topo.uv, pos: new Float32Array(m.pos), pares: m.topo.pares };
      V.ponTela(st.Sv, { colores: coloresPiezas() }); V.actualizaTela(null); V.resalta(st.sel); if (m.topo.avisos.length) console.warn('CelebriDREW 3D:', m.topo.avisos); st.cosida = false; st.quieta = false; pintaPie(); }
    else if (m.tipo === 'pos') { if (st.Sv) { st.Sv.pos.set(m.pos); V.actualizaTela(st.mapa ? (m.estira || undefined) : undefined); } st.cosida = m.cosida; st.quieta = m.quieta; W.postMessage({ tipo: 'listo' }); if (m.quieta) pintaPie(); }
    else if (m.tipo === 'estado') { st.est3d = m; st.cosida = m.cosida; pintaPie(); }
    else if (m.tipo === 'error') { toast((m.drew ? '' : 'Simulación: ') + m.msg, 'bad', 8000); aviso3.textContent = '⚠️ ' + m.msg; }
  };
  const mandaAvatar = () => { st.avatarOk = false; aviso3.textContent = 'Ajustando el avatar a sus medidas…'; aviso3.style.display = ''; W.postMessage({ tipo: 'avatar', med: st.P.avatar.med, sexo: st.P.avatar.sexo, peso: st.P.avatar.via === 'peso' ? st.P.avatar.peso : null, premium: st.P.avatar.realista !== false }); };
  const telasPorPieza = () => { const P = st.P, o = {}; (P.prenda ? P.prenda.piezas : []).forEach(pz => { const k = P.tela.porPieza[pz.nombre] || P.tela.def; if (k) o[pz.nombre] = k; }); return Object.keys(o).length ? o : null; };
  // (el color «natural» solo existe en las telas fotografiadas con su color de verdad: vaquero, cuero, ante; en las demás, su color típico)
  const coloresPiezas = () => { const P = st.P, o = {}, def = P.tela.def || (P.prenda && P.prenda.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina');
    (P.prenda ? P.prenda.piezas : []).forEach(pz => { const c = (P.tela.colorPieza && P.tela.colorPieza[pz.nombre]) || P.tela.color, k = P.tela.porPieza[pz.nombre] || def; o[pz.nombre] = c === 'natural' && !(ASPECTO[k] && ASPECTO[k].natural) ? (TELAS[k] || TELAS.punto).color : c; }); return o; };
  const mandaPrenda = conservar => { if (!st.P.prenda) return; W.postMessage({ tipo: 'prenda', prenda: JSON.parse(JSON.stringify(st.P.prenda)), tela: telasPorPieza(), conservar }); };

  // ---------- 2D ----------
  const ctx = { prenda: null, disp: {}, sel: {}, modo: 'elegir',
    estadoPieza: id => { const x = st.V && st.V.piezas.find(p => p.id === id); return !x ? 'ok' : x.E.length ? 'mal' : x.A.length ? 'ojo' : 'ok'; },
    onEdit: (e, que) => edita(e, que), onSelect: s => { const pz = st.P.prenda.piezas.find(p => p.id === s.pieza); elige(pz ? pz.nombre : null, s); },
    alMoverPieza: () => { st.P.disp = ctx.disp; guarda(); }, alMedir: d => toast('📏 ' + G.cm(d, 2) + ' cm', 'ok', 4000), aviso: t => toast(t, 'bad', 5000) };
  try { ctx.iman = localStorage.getItem('cd.drew.iman') === '1'; } catch (e) { ctx.iman = false; }
  const iman = () => { ctx.iman = !ctx.iman; try { localStorage.setItem('cd.drew.iman', ctx.iman ? '1' : '0'); } catch (e) { } pintaBarra2(); toast(ctx.iman ? '🧲 Imán: los puntos caen en la cuadrícula de 5 mm' : 'Imán quitado: los puntos van libres', 'ok', 3500); };
  const ED = editor2d(lienzo2, ctx);
  let piezasVistas = '', encuadrado = false;
  new ResizeObserver(() => { const r = lienzo2.getBoundingClientRect(); if (r.width > 50 && r.height > 50 && !encuadrado && ctx.prenda) { encuadrado = true; ED.encuadra(); } }).observe(lienzo2);

  // ---------- el proyecto ----------
  // dónde está cada pieza en la mesa del 2D (se recuerda por su nombre; las nuevas, a la derecha de las que ya había)
  function colocaPiezas() { const P = st.P, pr = P.prenda; if (!pr) return; P.disp = P.disp || {}; const C = EX.coloca(pr, 1400, 40), hay = Object.keys(P.disp).length;
    let x0 = 0; if (hay) Object.entries(P.disp).forEach(([n, d]) => { const pz = pr.piezas.find(q => q.nombre === n); x0 = Math.max(x0, d[0] + (pz ? Z.caja(pz).x1 : 300) + 60); });
    C.items.forEach(it => { if (P.disp[it.pz.nombre]) return; const b = it.d.caja; P.disp[it.pz.nombre] = [x0 + it.x - b.x0, it.y + b.y1]; });
    ctx.disp = P.disp; }
  function ajustaAlAvatar() { const P = st.P; if (!st.niveles) return; let M; try { M = TA.medidasPrenda(P.k, cuerpoParaPrenda(P.avatar.med, st.niveles), { ajuste: P.ajuste, manga: P.opciones.mangaTipo, escote: P.opciones.escote }); } catch (e) { return; }
    Object.entries(M).forEach(([k, v]) => { const x = P.medidas[k]; if (!x || x.origen !== 'usuario') P.medidas[k] = { v, origen: 'calculada', confianza: 1 }; }); }
  function regenera(conservar = true, sinMandar) {
    const P = st.P; st.errorPrenda = null;
    try { const { prenda, fallos } = PR.generaPrenda(P, P.k, P.opciones); prenda.talla = P.avatar.via === 'talla' ? P.avatar.talla : null; st.V = valida(prenda); prenda.validacion = ESTADOS[st.V.estado].t;
      if (fallos.length) toast('Algunos cambios a mano ya no se pueden aplicar: ' + fallos.map(f => f.motivo).join(' · '), 'bad', 9000); }
    catch (e) { st.errorPrenda = e.message; toast(e.message, 'bad', 9000); pintaPie(); return false; }
    ctx.prenda = P.prenda; colocaPiezas(); if (st.sel) { const pz = P.prenda.piezas.find(p => p.nombre === st.sel); ctx.sel = pz ? Object.assign({}, ctx.sel, { pieza: pz.id }) : {}; if (!pz) st.sel = null; }
    ED.pinta(); const firma = P.prenda.piezas.map(p => p.nombre).join('|'); if (firma !== piezasVistas) { piezasVistas = firma; if (lienzo2.getBoundingClientRect().height > 50) { encuadrado = true; ED.encuadra(); } else encuadrado = false; }
    pintaFicha(); pintaPie(); if (st.pest === 'prenda') pintaPanel(); nombre.value = P.nombre;
    if (!sinMandar) mandaPrenda(conservar); guarda(); return true;
  }
  const guarda = debounce(() => { if (!st.P) return; PR.guarda(st.P).then(() => { try { localStorage.setItem(ULTIMO, st.P.id); } catch (e) { } }).catch(e => console.warn('No se pudo guardar', e)); }, 1200);
  function cambia(que, fn, opts = {}) { st.hist.apunta(st.P, que); fn(); if (opts.avatar) mandaAvatar(); else regenera(opts.conservar !== false); }
  function edita(e, que) { cambia(que, () => { st.P.ediciones.push(...[].concat(e)); }); } // (16-10: un piquete y su pareja = un solo paso de Ctrl+Z)
  function deshacer() { const r = st.hist.deshacer(st.P); if (!r) return toast('No hay nada que deshacer'); const avAntes = JSON.stringify(st.P.avatar); st.P = r.P; toast('↶ ' + r.que); if (JSON.stringify(st.P.avatar) !== avAntes) mandaAvatar(); regenera(true); }
  function rehacer() { const r = st.hist.rehacer(st.P); if (!r) return toast('No hay nada que rehacer'); const avAntes = JSON.stringify(st.P.avatar); st.P = r.P; toast('↷ ' + r.que); if (JSON.stringify(st.P.avatar) !== avAntes) mandaAvatar(); regenera(true); }
  function elige(nombrePz, s) { st.sel = nombrePz; const pz = nombrePz && st.P.prenda.piezas.find(p => p.nombre === nombrePz); ctx.sel = pz ? Object.assign({ pieza: pz.id }, s || {}) : {}; V.resalta(nombrePz); ED.pinta(); pintaFicha(); if (st.pest === 'tela') pintaPanel(); }
  function abre(P) { st.P = P; st.hist = PR.historial(); st.sel = null; ctx.sel = {}; ctx.disp = P.disp || {}; nombre.value = P.nombre; regenera(false, true); mandaAvatar(); ED.encuadra(); pintaPanel(); }
  async function nueva() { const k = await eligePlantilla(); if (!k) return; const P = proyectoNuevo(k); P.avatar = JSON.parse(JSON.stringify(st.P.avatar)); abre(P); toast('👗 ' + BL.BLOQUES[k].t + ' nueva, ajustada a tu avatar'); }
  function eligePlantilla() { return new Promise(res => { let ok = false; const m = modal('¿Qué prenda?', h('div.dw-plantillas', Object.values(BL.BLOQUES).map(D => h('button', { onclick: () => { ok = true; m.close(); res(D.k); } }, h('b', D.e), D.t))), null, { size: 'narrow', onclose: () => { if (!ok) res(null); } }); }); }
  async function misPrendas() {
    const L = await PR.lista(); const cuerpo = h('div');
    const pinta = L2 => mount(cuerpo, L2.length ? L2.map(x => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--line)' } }, h('div', { style: { flex: 1 } }, h('b', x.nombre), h('div.dw-ayuda', { style: { margin: 0 } }, new Date(x.modificado).toLocaleString('es-ES') + (x.estado ? ' · ' + x.estado : ''))),
      btn('Abrir', async () => { m.close(); abre(await PR.abrir(x.id)); }, { cls: 'primary sm' }), btn('🗑', async () => { if (x.id === st.P.id) return toast('Es la que tienes abierta'); if (await confirmDlg('¿Borrar «' + x.nombre + '»?', 'Se borra de este aparato.', 'Borrar', true)) { await PR.borra(x.id); pinta((await PR.lista())); } }, { cls: 'ghost sm', title: 'Borrar' }))) : h('p.dw-ayuda', 'Todavía no hay prendas guardadas.'));
    const m = modal('📂 Mis prendas (en este aparato)', cuerpo, null, { size: 'narrow' }); pinta(L);
  }

  // ---------- la barra del 3D ----------
  // un botón de barra: «icono palabra» → <i>icono</i><span.l>palabra</span> (la palabra se esconde si la ventana es estrecha; el título lo explica)
  function botonBarra(t, on, fn, title) { const m = /^(\S+)\s+(.+)$/.exec(t), ic = m && !/^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(m[1]) ? m[1] : null, txt = ic ? m[2] : t;
    return h('button' + (on ? '.on' : ''), { type: 'button', title: title || txt, 'aria-label': title || txt, onclick: fn }, ic ? h('i', ic) : null, /^\S+$/.test(t) && !/^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) ? h('i', t) : h(ic ? 'span.l' : 'span', txt)); } /* (sin icono, la palabra no se esconde nunca) */
  function pintaBarra3() {
    const b = (t, on, fn, title) => botonBarra(t, on, fn, title);
    mount(barra3, h('span.tit', '3D'),
      b(st.pausa ? '▶ Simular' : '⏸ Pausar', st.pausa, () => { st.pausa = !st.pausa; W.postMessage({ tipo: st.pausa ? 'pausa' : 'sigue' }); pintaBarra3(); }, 'Parar o seguir la simulación de la tela'),
      b('🪡 Vestir de nuevo', false, () => { W.postMessage({ tipo: 'revestir' }); }, 'Coloca las piezas otra vez alrededor del cuerpo y las cose desde cero'),
      h('span.sep'),
      b('🌡 Ajuste', st.mapa, () => { st.mapa = !st.mapa; leyenda.style.display = st.mapa ? '' : 'none'; W.postMessage({ tipo: 'mapa', si: st.mapa }); if (!st.mapa) { V.actualizaTela(null); Object.entries(coloresPiezas()).forEach(([n, c]) => V.colorTela(c, n)); } else W.postMessage({ tipo: 'sigue' }); pintaBarra3(); }, 'Mapa de ajuste: dónde tira la tela (rojo) y dónde va suelta (verde)'),
      b('✋ Tirar de la tela', st.tirar, () => { st.tirar = !st.tirar; pintaBarra3(); toast(st.tirar ? '✋ Coge la tela con el ratón y tira: se estira como la de verdad' : 'Vuelves a girar la vista con el ratón', 'ok', 4000); }, 'Coger la tela con el ratón y estirarla'),
      b('🧍 Avatar', st.verAv, () => { st.verAv = !st.verAv; V.verAvatar(st.verAv); pintaBarra3(); }, 'Ver u ocultar el avatar'),
      b('↻ Girar', V.gira, () => { V.gira = !V.gira; pintaBarra3(); }, 'Que gire sola, como en un escaparate'),
      h('span.sep'), b('Frente', false, () => V.vista('frente')), b('Lado', false, () => V.vista('izq')), b('Espalda', false, () => V.vista('espalda')),
      h('span.sep'), b('📸', false, () => { const u = V.foto(1600, 2000); descarga(dataURLaBlob(u), limpio(st.P.nombre) + '_3d.png'); toast('📸 Foto guardada en Descargas', 'ok'); }, 'Guardar una foto del 3D (PNG)'));
  }
  // tocar en el 3D: elegir pieza · con «Tirar», arrastrar la tela
  let tir = null, abajo = null;
  lienzo3.addEventListener('pointerdown', ev => { abajo = [ev.clientX, ev.clientY]; if (!st.tirar || ev.button !== 0) return; const t = V.toca(ev); if (!t) return;
    ev.stopPropagation(); ev.preventDefault(); V.ctl.enabled = false; tir = t; lienzo3.setPointerCapture(ev.pointerId); W.postMessage({ tipo: 'sigue' }); W.postMessage({ tipo: 'arrastre', i: t.i, p: [t.punto.x, t.punto.y, t.punto.z] }); elige(t.nombre); }, true);
  lienzo3.addEventListener('pointermove', ev => { if (!tir) return; const p = V.enPlano(ev, tir.punto); if (p) W.postMessage({ tipo: 'arrastre', i: tir.i, p }); });
  const suelta = ev => { if (tir) { tir = null; V.ctl.enabled = true; W.postMessage({ tipo: 'arrastre', i: -1 }); return; } if (abajo && ev && Math.hypot(ev.clientX - abajo[0], ev.clientY - abajo[1]) < 4) { const t = V.toca(ev); elige(t ? t.nombre : null); } abajo = null; };
  lienzo3.addEventListener('pointerup', suelta); lienzo3.addEventListener('pointercancel', () => suelta());

  // ---------- la barra del 2D ----------
  function pintaBarra2() {
    const b = (t, modo, title) => botonBarra(t, ctx.modo === modo, () => { ctx.modo = modo; ED.borraMedida(); pintaBarra2(); }, title);
    mount(barra2, h('span.tit', 'Patrón 2D'), b('↖ Elegir', 'elegir', 'Tocar una pieza la elige; arrastrarla la mueve. Arrastra un punto o un tirador para cambiar la forma'),
      b('＋ Punto', 'anadir', 'Toca un borde de la pieza elegida para poner un punto'), b('－ Punto', 'quitar', 'Toca un punto para quitarlo'),       b('⌒ Curva', 'curva', 'Toca un tramo para pasarlo de recto a curvo (y al revés)'), b('📏 Medir', 'medir', 'Dos toques: la distancia en cm'),
      b('⊥ Piquete', 'piquete', 'Toca un borde: pone un piquete ahí y su pareja en la pieza con la que se cose (P). Toca uno que ya está para quitarlo'),
      h('span.sep'), botonBarra('🧲 Imán', !!ctx.iman, iman, 'Imán: al arrastrar, los puntos caen en la cuadrícula de 5 mm (I). Mayús mientras arrastras = recto'), botonBarra('⤢ Encajar', false, () => ED.encuadra(), 'Ver todas las piezas'));
  }

  // ---------- la ficha de la pieza elegida (en el 2D) ----------
  function pintaFicha() {
    const P = st.P, pz = st.sel && P.prenda && P.prenda.piezas.find(p => p.nombre === st.sel); if (!pz) { ficha.style.display = 'none'; return; }
    const D = Z.datos(pz), cos = (P.prenda.costuras || []).filter(c => c.a.pieza === pz.id || c.b.pieza === pz.id), R = st.V && st.V.costuras || [];
    const corte = pz.corte.doblez ? 'Cortar ' + (pz.corte.n || 1) + ' al doblez' : pz.corte.espejo ? 'Cortar ' + (pz.corte.n || 2) + ' (una en espejo)' : 'Cortar ' + (pz.corte.n || 1);
    // (16-10) medidas ESCRITAS: mover el punto elegido tantos cm (→ y ↑) y el largo exacto de un borde recto
    const pt = ctx.sel && ctx.sel.pieza === pz.id && ctx.sel.punto && pz.puntos[ctx.sel.punto], cmIn = (ph, title) => h('input.dw-ficha-cm', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: ph, title }); /* (texto: así vale la coma, «0,5») */
    const mueve = pt ? (() => { const ix = cmIn('0', 'Hacia la derecha (+) o la izquierda (−), en cm'), iy = cmIn('0', 'Hacia arriba (+) o abajo (−), en cm'), va = () => { const dx = Math.round(Number(String(ix.value || 0).replace(',', '.')) * 10), dy = Math.round(Number(String(iy.value || 0).replace(',', '.')) * 10); if (!dx && !dy) return toast('Escribe cuántos cm moverlo', 'info'); edita({ op: 'muevePunto', pieza: pz.nombre, args: { punto: ctx.sel.punto, dx, dy } }, 'Mover «' + pt.n + '» ' + G.cm(dx) + ' / ' + G.cm(dy) + ' cm'); };
      [ix, iy].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') va(); }));
      return h('div.dw-ficha-pt', h('div', h('b', '● ' + pt.n), h('small', ' en (' + G.cm(pt.x) + ', ' + G.cm(pt.y) + ') cm')), h('div.dw-ficha-mueve', h('label', '→', ix), h('label', '↑', iy), h('span.u', 'cm'), btn('Mover', va, { cls: 'ghost sm' }))); })() : null;
    const recto = B => { const b = pz.bordes.find(x => x.id === B.id); return b && b.tramos.length === 1 && !(Z.tramoPorId(pz, b.tramos[0]) || {}).c1; };
    const largoIn = B => h('input.dw-ficha-cm.dw-ficha-largo', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(Math.round(B.largo) / 10).replace('.', ','), title: 'Escribe el largo exacto (cm): se mueve la punta final del borde', onchange: e => { const mm = Math.round(Number(String(e.target.value).replace(',', '.')) * 10); if (!(mm > 5)) { e.target.value = String(Math.round(B.largo) / 10).replace('.', ','); return toast('Un largo en cm, mayor que 0,5', 'bad'); } edita({ op: 'largoBorde', pieza: pz.nombre, args: { borde: B.id, mm } }, 'Largo de «' + B.n + '» a ' + G.cm(mm) + ' cm'); } });
    mount(ficha, h('button.dw-x', { onclick: () => elige(null), title: 'Cerrar' }, '✕'), h('h4', pz.nombre), h('div.dw-ayuda', { style: { margin: '0 0 6px' } }, corte + ' · ' + G.cm(D.ancho) + ' × ' + G.cm(D.alto) + ' cm · ' + (Math.abs(D.area) / 100).toFixed(0) + ' cm²'), mueve,
      h('div', { style: { fontWeight: 700, fontSize: '12px', margin: '6px 0 2px' } }, 'Bordes y márgenes de costura'),
      D.bordes.map(B => h('div.dw-fila', h('label', B.n, recto(B) ? h('small.dw-ficha-l', largoIn(B), ' cm · ') : null, h('small', (recto(B) ? '' : G.cm(B.largo, 1) + ' cm · ') + ({ costura: 'se cose', bajo: 'bajo', remate: 'remate', doblez: 'al doblez', abierto: 'abierto', aplicado: 'pespunteado encima' }[B.tipo] || B.tipo))),
        B.tipo === 'doblez' ? h('span.u', 'sin margen') : h('span.dw-num', h('input', { type: 'number', min: 0, max: 60, step: 1, value: B.margen, onchange: e => { const mm = Math.max(0, Math.min(60, Number(e.target.value) || 0)); edita({ op: 'margen', pieza: pz.nombre, args: { borde: B.id, mm } }, 'Margen de «' + B.n + '»'); } }), h('span.u', 'mm')))),
      cos.length ? h('div', { style: { fontWeight: 700, fontSize: '12px', margin: '8px 0 2px' } }, 'Se cose con') : null,
      cos.map(c => { const r = R.find(x => x.id === c.id) || {}, otra = P.prenda.piezas.find(p => p.id === (c.a.pieza === pz.id ? c.b.pieza : c.a.pieza)), tipo = tipoDe(P.prenda, c, P.tiposCostura);
        // (si no se ha elegido, se dice la típica de la tela con el margen que tiene AHORA el patrón, no el del tipo)
        const elegido = P.tiposCostura && P.tiposCostura[c.id], mA = Z.margenDe(P.prenda.piezas.find(p => p.id === c.a.pieza), c.a.borde);
        const sel = h('select.dw-tipo', { 'data-costura': c.id, title: TIPOS_COSTURA[tipo].d, onchange: e => { const t = e.target.value; if (!t) return; cambia('Costura «' + c.n + '»: ' + TIPOS_COSTURA[t].t, () => { P.tiposCostura = Object.assign({}, P.tiposCostura, { [c.id]: t }); P.ediciones.push(...edicionesTipo(P.prenda, c, t)); }); } },
          elegido ? null : h('option', { value: '', selected: true }, 'Costura: ' + TIPOS_COSTURA[tipo].corto + ' (margen ' + G.cm(mA) + ' cm) · elegir otra…'),
          Object.entries(TIPOS_COSTURA).map(([k, T]) => h('option', { value: k, selected: !!elegido && k === tipo }, T.t + ' · margen ' + G.cm(T.margen) + ' cm')));
        return h('div.dw-ayuda', { style: { margin: '2px 0' } }, sel, ' ', (r.ok === false ? '✘ ' : '✔ ') + c.n + (otra && otra !== pz ? ' (' + otra.nombre + ')' : '') + (r.La ? ' · ' + G.cm(r.La, 1) + ' / ' + G.cm(r.Lb, 1) + ' cm' : '')); }),
      pz.meta.notas.length ? h('div.dw-ayuda', pz.meta.notas.join(' ')) : null);
    ficha.style.display = '';
  }

  // ---------- la barra de abajo ----------
  function pintaPie() {
    const P = st.P; if (!P) return; const V2 = st.V, e = V2 && ESTADOS[V2.estado], d = st.est3d;
    const ab = d ? d.abiertas.filter(a => a.max > 6) : null;
    mount(pie, st.errorPrenda ? h('span.dw-est.borrador', '⚠️ ' + st.errorPrenda) : e ? h('span.dw-est.' + V2.estado, { title: e.d }, e.t) : null,
      V2 ? h('span', V2.E.length ? h('span.dw-mal', V2.E.length + ' error(es) · ') : null, V2.A.length ? h('span.dw-ojo', V2.A.length + ' aviso(s)') : h('span.dw-ok', 'sin avisos')) : null,
      h('span', '3D: ', !st.avatarOk ? 'preparando el avatar…' : !st.topo ? 'cosiendo…' : !st.cosida ? h('b', '🪡 cosiendo') : st.quieta ? h('span.dw-ok', '✔ colocada') : h('b', '🍃 cayendo')),
      ab ? h('span', ab.length ? h('span.dw-ojo', '🧵 ' + ab.length + ' costura(s) sin cerrar del todo') : h('span.dw-ok', '🧵 costuras cerradas')) : null,
      d && d.dentro && d.dentro.n ? h('span.dw-ojo', '⚠️ ' + d.dentro.n + ' punto(s) de tela dentro del cuerpo') : null,
      h('span', { style: { marginLeft: 'auto', color: 'var(--muted)' } }, 'La comprobación geométrica no sustituye una prueba con tela.'));
    if (st.avatarOk && st.cosida) aviso3.style.display = 'none';
  }

  // ---------- la biblioteca (izquierda) ----------
  const PEST = [['prenda', '👗', 'Prenda'], ['avatar', '🧍', 'Avatar'], ['tela', '🧵', 'Tela'], ['foto', '📷', 'Foto'], ['exportar', '⬇', 'Exportar']];
  function pintaPestanas() { mount(pestanas, PEST.map(([k, e, t]) => h('button' + (st.pest === k ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': st.pest === k ? 'true' : 'false', onclick: () => { st.pest = k; pintaPestanas(); pintaPanel(); } }, h('b', e), t))); }
  function pintaPanel() { const f = { prenda: panelPrenda, avatar: panelAvatar, tela: panelTela, foto: panelFoto, exportar: panelExportar }[st.pest]; mount(panel, f()); }
  const irA = k => { st.pest = k; pintaPestanas(); pintaPanel(); };
  // 📷 FOTO (drew/calibra_ui.js): qué foto sirve, MEDIR con una foto calibrada con un folio A4 (y llevar la medida a la prenda), calibrar la IMPRESORA
  function panelFoto() { return CU.panelFoto(opFoto()); }
  // (16-10) 👗 lo que trae «Crear el patrón» desde la foto (drew/foto/desde_foto.js aProyecto): una prenda NUEVA con la plantilla, sus opciones
  // y cada medida con su estado (vista / supuesta / por confirmar), el avatar de ahora y sin «calcular para el avatar» (las medidas son las de
  // la prenda de la foto). Si la prenda abierta ya salió de esa misma foto, se ACTUALIZA (Ctrl+Z lo deshace) y se respetan sus cambios a mano.
  function deFoto(A) {
    const mismo = !!(st.P && st.P.deFoto && st.P.deFoto.id === A.deFoto.id);
    const pon = P => { Object.assign(P, { k: A.k, opciones: Object.assign(BL.opcionesPorDefecto(A.k), A.opciones), autoAjuste: false, medidas: JSON.parse(JSON.stringify(A.medidas)), deFoto: A.deFoto, diseno: null }); };
    if (mismo) cambia('Patrón de la foto (actualizado)', () => pon(st.P), { conservar: false });
    else { const P = proyectoNuevo(A.k); P.avatar = JSON.parse(JSON.stringify(st.P.avatar)); pon(P); P.nombre = A.nombre; abre(P); }
    st.pest = 'prenda'; pintaPestanas(); pintaPanel(); setTimeout(() => ED.encuadra(), 60);
    return st.errorPrenda ? { ok: false, error: st.errorPrenda } : { ok: true, valida: st.V ? ESTADOS[st.V.estado].t : null };
  }
  // (16-10) 🌐 lo que trae «Diseñar desde una imagen» (drew/inspira_ui.js): una prenda NUEVA con la plantilla, sus opciones y el ajuste que
  // lee la IA (o que dice ella), las medidas del CUERPO del avatar con ese ajuste, y encima lo que manda la imagen (largo en SUS niveles,
  // manga al codo o 3/4, vuelo de la silueta, tirantes, escote) marcado «🌐 imagen». Lo que el patrón no hace se queda dicho en la ficha.
  function deImagen(D, L, extra = {}) {
    if (!st.niveles) return { ok: false, error: 'El avatar aún se está preparando: espera un momento.' };
    const P = proyectoNuevo(D.k); P.avatar = JSON.parse(JSON.stringify(st.P.avatar)); P.nombre = D.nombre;
    Object.assign(P, { opciones: Object.assign(BL.opcionesPorDefecto(D.k), D.opciones), ajuste: D.ajuste, autoAjuste: true, diseno: null,
      deImagen: { fecha: new Date().toISOString(), modelo: L.modelo || null, lee: Object.fromEntries(Object.entries(L.campos).map(([c, x]) => [c, x.v])), detalles: L.detalles || [], hace: D.hace, noHace: D.noHace } });
    let M; try { M = TA.medidasPrenda(D.k, cuerpoParaPrenda(P.avatar.med, st.niveles), { ajuste: P.ajuste, manga: P.opciones.mangaTipo, escote: P.opciones.escote }); } catch (e) { return { ok: false, error: e.message }; }
    Object.entries(M).forEach(([k, v]) => { P.medidas[k] = { v, origen: 'calculada', confianza: 1 }; });
    const X = INS.medidas(D, P.avatar.med, st.niveles, M);
    Object.entries(X).forEach(([k, v]) => { P.medidas[k] = { v, origen: 'usuario', confianza: 0.6, imagen: true, como: 'De la imagen, en el cuerpo de tu avatar (cámbialo si la quieres distinta)' }; });
    if (extra.color && /^#[0-9a-f]{6}$/i.test(extra.color)) P.tela.color = extra.color; // (la tela, del color de la prenda de la foto)
    abre(P); st.pest = 'prenda'; pintaPestanas(); pintaPanel(); setTimeout(() => ED.encuadra(), 60);
    return st.errorPrenda ? { ok: false, error: st.errorPrenda } : { ok: true, valida: st.V ? ESTADOS[st.V.estado].t : null };
  }
  const desdeImagen = () => IU.abre({ crear: deImagen, listo: () => !!st.niveles });
  const opFoto = () => ({ descarga, repinta: () => { if (st.pest === 'foto') pintaPanel(); }, crearPatron: deFoto, desdeImagen, esDeFoto: id => !!(st.P && st.P.deFoto && st.P.deFoto.id === id),
    medidas: () => { const D = st.P && BL.BLOQUES[st.P.k]; return D ? { t: D.t, lista: D.medidas.map(m => ({ k: m.k, t: m.t, min: m.min, max: m.max })) } : null; },
    ponMedida: (k, mm) => { const D = BL.BLOQUES[st.P.k], m = D && D.medidas.find(x => x.k === k), v = Math.round(mm); if (!m) return { ok: false, error: 'Esa medida no es de esta prenda.' };
      if (!(v >= m.min && v <= m.max)) return { ok: false, error: '«' + m.t + '»: ' + G.cm(v) + ' cm se sale de lo que admite esta plantilla (' + G.cm(m.min) + '–' + G.cm(m.max) + ' cm). ¿Es la medida que toca?' };
      cambia(m.t + ' (de la foto)', () => { st.P.medidas[k] = { v, origen: 'usuario', confianza: 1, foto: true }; }); return { ok: true }; } });
  const ORIG = { usuario: 'tuya', ia: 'foto', calculada: 'avatar', plantilla: 'plantilla', verificada: 'comprobada' };
  // (16-10) la etiqueta de una medida: las de la foto dicen si se VIERON, se SUPUSIERON (no se ven) o hay que CONFIRMARLAS (se confirma tocándola)
  const etiqueta = x => x.imagen ? ['ia', '🌐 imagen'] : x.foto && x.origen === 'ia' && x.estado === 'confirmar' ? ['confirmar', '⚠ confirmar'] : x.foto && x.estado === 'inferido' && x.origen === 'plantilla' ? ['supuesta', '💭 supuesta'] : x.foto && x.mano ? ['ia', '✋ foto'] : x.foto ? [x.origen === 'usuario' ? 'usuario' : 'ia', '📷 foto'] : [x.origen, ORIG[x.origen] || x.origen];
  function bannerFoto() {
    const P = st.P, d = P.deFoto; if (!d) return null; const L = Object.values(P.medidas || {}), n = f => L.filter(f).length, conf = n(x => x.foto && x.estado === 'confirmar' && x.origen === 'ia'), U = CU.ultimaFoto();
    return h('div.dw-defoto', h('b', '📷 Patrón sacado de una foto'), h('span', [n(x => x.foto && x.origen !== 'plantilla') + ' medidas de la foto', n(x => x.foto && x.origen === 'plantilla') + ' supuestas', conf ? conf + ' por confirmar ⚠' : ''].filter(Boolean).join(' · ') + ' · recorte ' + (/^ia/.test(d.recorte || '') ? 'con IA' : 'por colores')),
      conf ? h('small', 'Lo marcado ⚠ se ha medido pero no es fiable: mira la foto y toca «⚠ confirmar» si está bien, o escribe tu medida.') : null,
      U && U.FP && U.FP.id === d.id ? h('a', { href: '#', onclick: e => { e.preventDefault(); CU.calibrador(null, opFoto(), 'patron'); } }, 'Ver la foto y sus puntos') : null);
  }
  function bannerImagen() { const d = st.P.deImagen; if (!d) return null;
    return h('div.dw-defoto', h('b', '🌐 Diseñada desde una imagen'), h('span', (d.modelo ? 'Leída por la IA del PC (' + d.modelo + ')' : 'Contada por ti') + ' · las medidas «🌐 imagen» salen de la foto en el cuerpo de tu avatar.'),
      d.noHace && d.noHace.length ? h('small', 'Todavía no lo hace el patrón: ' + d.noHace.join(' · ')) : null); }
  function panelPrenda() {
    const P = st.P, D = BL.BLOQUES[P.k];
    return [h('h3', '✨ Diseños listos'), h('div.dw-ayuda', 'Un clic y el avatar sale vestido, a SU medida. Luego cámbialo todo.'),
      h('div.dw-disenos', DISENOS.map(Dz => h('button' + (P.diseno === Dz.id ? '.on' : ''), { type: 'button', title: Dz.d, 'data-diseno': Dz.id, onclick: () => aplicaDiseno(Dz) }, h('b', Dz.e), h('span', Dz.t)))),
      btn('🌐 Desde una imagen (internet, revista…)', desdeImagen, { cls: 'ghost dw-desde-imagen', title: 'La IA del PC lee la prenda de la foto y hace su patrón a la medida de tu avatar' }),
      h('h3', 'Plantilla'), h('div.dw-plantillas', Object.values(BL.BLOQUES).map(B => h('button' + (B.k === P.k ? '.on' : ''), { type: 'button', onclick: () => cambiaPlantilla(B.k) }, h('b', B.e), B.t))),
      (D.opciones || []).length ? h('h3', 'Cómo es') : null,
      (D.opciones || []).map(O => h('div.dw-fila', h('label', O.t), h('select.dw-sel', { onchange: e => cambia(O.t, () => { P.opciones[O.k] = e.target.value; if (P.autoAjuste) ajustaAlAvatar(); }) }, O.ops.map(([v, t]) => h('option', { value: v, selected: P.opciones[O.k] === v }, t))))),
      h('h3', 'Medidas de la prenda'), bannerFoto(), bannerImagen(),
      h('label.dw-ayuda', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('input', { type: 'checkbox', checked: P.autoAjuste, onchange: e => cambia('Ajustar al avatar', () => { P.autoAjuste = e.target.checked; if (P.autoAjuste) ajustaAlAvatar(); }) }), 'Calcularlas para el cuerpo del avatar'),
      P.autoAjuste ? h('div.dw-chips', Object.entries(TA.AJUSTES).map(([k, t]) => h('button.dw-chip' + (P.ajuste === k ? '.on' : ''), { type: 'button', onclick: () => cambia('Ajuste ' + t, () => { P.ajuste = k; Object.keys(P.medidas).forEach(m => { if (P.medidas[m].origen === 'calculada') delete P.medidas[m]; }); ajustaAlAvatar(); }) }, t))) : null,
      h('div.dw-ayuda', 'Lo que mide la prenda ACABADA (cuerpo + holgura). Cambia un número y míralo en el 3D al momento.'),
      D.medidas.map(m => { const x = P.medidas[m.k] || { v: m.v, origen: 'plantilla' };
        const [cl, tx] = etiqueta(x), chip = cl === 'confirmar' ? h('button.dw-org.confirmar', { type: 'button', title: (x.como || '') + ' · Tócalo si la has mirado y está bien', onclick: () => cambia('Confirmar «' + m.t + '»', () => { P.medidas[m.k] = Object.assign({}, x, { estado: 'observado', confirmada: true }); }) }, tx) : h('span.dw-org.' + cl, { title: x.como || '' }, tx);
        return h('div.dw-fila', h('label', { title: m.ayuda || '' }, m.t, h('small', chip)),
          h('span.dw-num', h('input', { type: 'number', step: 0.5, min: m.min / 10, max: m.max / 10, value: (Math.round(x.v) / 10).toString(), onchange: e => { const v = Math.round(Number(String(e.target.value).replace(',', '.')) * 10); if (!(v >= m.min && v <= m.max)) { toast('«' + m.t + '»: entre ' + G.cm(m.min) + ' y ' + G.cm(m.max) + ' cm', 'bad'); e.target.value = (x.v / 10).toString(); return; } cambia(m.t, () => { P.medidas[m.k] = { v, origen: 'usuario', confianza: 1 }; }); } }), h('span.u', 'cm'))); }),
      h('h3', 'Comprobación del patrón'), panelValida(),
      P.ediciones.length ? [h('h3', 'Cambios a mano (' + P.ediciones.length + ')'), h('div.dw-ayuda', 'Se vuelven a aplicar cuando cambian las medidas.'), btn('Quitar todos los cambios a mano', () => cambia('Quitar cambios a mano', () => { P.ediciones = []; }), { cls: 'ghost sm' })] : null];
  }
  function panelValida() { const V2 = st.V; if (!V2) return null; const e = ESTADOS[V2.estado];
    return h('div', h('div', h('b', e.t)), h('div.dw-ayuda', e.d), V2.E.map(x => h('div.dw-ayuda.dw-mal', '✘ ' + x.n + ': ' + x.t + (x.d ? ' — ' + x.d : ''))), V2.A.slice(0, 8).map(x => h('div.dw-ayuda', '⚠️ ' + (x.n ? x.n + ': ' : '') + x.t + (x.d ? ' — ' + x.d : '')))); }
  // un DISEÑO LISTO: plantilla + cómo es + ajuste + tela y color (+ largos); las medidas, del cuerpo del avatar
  function aplicaDiseno(Dz) { const P = st.P; cambia('Diseño «' + Dz.t + '»', () => { P.porPlantilla[P.k] = { medidas: P.medidas, ediciones: P.ediciones, opciones: P.opciones, disp: P.disp, tela: JSON.parse(JSON.stringify(P.tela)) };
      P.k = Dz.k; P.diseno = Dz.id; P.opciones = Object.assign(BL.opcionesPorDefecto(Dz.k), Dz.opciones); P.ajuste = Dz.ajuste; P.autoAjuste = true; P.ediciones = []; P.disp = {}; ctx.disp = P.disp; st.sel = null; P.nombre = Dz.t;
      P.medidas = {}; Object.entries(Dz.medidas || {}).forEach(([m, v]) => { P.medidas[m] = { v, origen: 'usuario', confianza: 1 }; }); P.tela = { def: Dz.tela, color: Dz.color, porPieza: {} }; ajustaAlAvatar(); }, { conservar: false });
    setTimeout(() => ED.encuadra(), 50); toast(Dz.e + ' ' + Dz.t + ': se está cosiendo en tu avatar…', 'ok', 4000); }
  function cambiaPlantilla(k) { const P = st.P; if (k === P.k) return; cambia('Plantilla ' + BL.BLOQUES[k].t, () => { P.porPlantilla[P.k] = { medidas: P.medidas, ediciones: P.ediciones, opciones: P.opciones, disp: P.disp, tela: JSON.parse(JSON.stringify(P.tela)) };
      const g = P.porPlantilla[k] || {}; P.k = k; P.medidas = g.medidas || {}; P.ediciones = g.ediciones || []; P.opciones = g.opciones || BL.opcionesPorDefecto(k); P.disp = g.disp || {}; ctx.disp = P.disp; st.sel = null; if (P.nombre === 'Prenda nueva' || Object.values(BL.BLOQUES).some(B => B.t === P.nombre)) P.nombre = BL.BLOQUES[k].t;
      // (16-10: cada prenda RECUERDA su tela y su color; la primera vez, los suyos de siempre: antes la organza de la falda pasaba a la sudadera)
      P.tela = g.tela ? JSON.parse(JSON.stringify(g.tela)) : { def: null, color: COLOR_DE[k] || '#5f7ea8', porPieza: {} }; if (P.autoAjuste) ajustaAlAvatar(); }, { conservar: false }); setTimeout(() => ED.encuadra(), 50); }
  function panelAvatar() {
    const P = st.P, A = P.avatar, M = st.med3d, campos = CAMPOS.filter(c => !(A.sexo === 'hombre' && c[0] === 'bajoPecho'));
    const ponMed = (med, via, que, extra) => cambia(que, () => { A.med = med; A.via = via; Object.assign(A, extra || {}); }, { avatar: true });
    const altura = h('input', { type: 'number', min: 120, max: 215, step: 1, value: A.med.altura }), peso = h('input', { type: 'number', min: 30, max: 200, step: 0.5, value: A.peso || '' , placeholder: 'kg' });
    return [h('h3', 'Cuerpo'), h('div.dw-chips', [[true, '✨ Realista (premium)'], [false, '◻️ Maniquí sencillo']].map(([k, t]) => h('button.dw-chip' + ((A.realista !== false) === k ? '.on' : ''), { type: 'button', title: k ? 'Cuerpo humano de verdad (MakeHuman, uso comercial libre), a tus medidas' : 'Más rápido; mide igual de exacto', onclick: () => { if ((A.realista !== false) === k) return; cambia(t, () => { A.realista = k; }, { avatar: true }); } }, t))),
      h('div.dw-chips', { style: { marginTop: '6px' } }, [['mujer', '👩 Mujer'], ['hombre', '👨 Hombre']].map(([k, t]) => h('button.dw-chip' + (A.sexo === k ? '.on' : ''), { type: 'button', onclick: () => { if (A.sexo === k) return; const T0 = TA.TABLAS[k].tallas.find(t => t.t === (A.talla || 'M')) || TA.TABLAS[k].tallas[2]; ponMed(desdeTabla(k, T0.v), 'talla', 'Avatar ' + t, { sexo: k, talla: T0.t }); } }, t))),
      h('h3', '⚡ Rápido: altura y peso'), h('div.dw-ayuda', 'Para empezar en un momento. Es una ESTIMACIÓN (± 3–5 cm en los contornos): para que la prenda quede como en la persona, pon abajo sus medidas con la cinta.'),
      h('div.dw-fila', h('label', 'Altura'), h('span.dw-num', altura, h('span.u', 'cm'))), h('div.dw-fila', h('label', 'Peso'), h('span.dw-num', peso, h('span.u', 'kg'))),
      btn('Hacer el avatar', () => { const al = Number(altura.value), pe = Number(peso.value); if (!(al >= 120 && al <= 215)) return toast('La altura, entre 120 y 215 cm', 'bad'); if (!(pe >= 30 && pe <= 200)) return toast('El peso, entre 30 y 200 kg', 'bad'); const i = imc(al, pe); if (i < 15 || i > 45) toast('Con ' + al + ' cm y ' + pe + ' kg el cuerpo sale fuera de lo habitual: revisa los datos.', 'bad'); ponMed(estimaPorPeso({ sexo: A.sexo, altura: al, peso: pe }), 'peso', 'Avatar por altura y peso', { peso: pe }); }, { cls: 'primary sm' }),
      h('h3', '📏 Por talla'), h('div.dw-chips', TA.TABLAS[A.sexo].tallas.map(T => h('button.dw-chip' + (A.via === 'talla' && A.talla === T.t ? '.on' : ''), { type: 'button', onclick: () => ponMed(desdeTabla(A.sexo, T.v), 'talla', 'Avatar talla ' + T.t, { talla: T.t }) }, T.t))),
      h('div.dw-ayuda', TA.TABLAS[A.sexo].t + ': tabla europea típica. Se puede cambiar cualquier medida abajo.'),
      h('h3', '✍️ Con cinta métrica (cm)'), h('div.dw-ayuda', 'Pasa el ratón por cada nombre para ver cómo se mide. El avatar se corrige solo hasta medir lo que pones.'),
      campos.map(([k, t, , , ay]) => h('div.dw-fila', h('label', { title: ay }, t, M && M.medido && M.medido[k] != null ? h('small', 'el avatar mide ' + M.medido[k].toFixed(1) + ' cm ' + (Math.abs(M.medido[k] - M.objetivo[k]) < 0.5 ? '✔' : '⚠️')) : null),
        h('span.dw-num', h('input', { type: 'number', step: 0.5, value: A.med[k], onchange: e => { const v = Number(String(e.target.value).replace(',', '.')); if (!(v >= 0)) return; const med = Object.assign({}, A.med, { [k]: v }); ponMed(med, 'cm', t + ' del avatar'); } }), h('span.u', 'cm')))),
      M ? h('div.dw-medido', (M.premium ? '✨ Cuerpo realista. ' : '') + 'Comprobado: el avatar mide lo pedido con un desvío máximo de ' + (M.desvio || 0).toFixed(1) + ' cm (cada contorno medido como con una cinta).' + (M.fuera && M.fuera.length ? ' ⚠️ No llega a: ' + M.fuera.join(', ') + ' (medidas fuera de lo que admite el cuerpo).' : '')) : null,
      h('h3', 'Aspecto'), h('div.dw-chips', Object.entries(PIELES).map(([k, [c, t]]) => h('button.dw-chip' + (A.piel === k ? '.on' : ''), { type: 'button', title: t, onclick: () => { A.piel = k; V.piel(k); guarda(); pintaPanel(); } }, h('span', { style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: c, marginRight: '5px', verticalAlign: '-1px', border: '1px solid var(--line-2)' } }), t)))];
  }
  function panelTela() {
    const P = st.P, pz = st.sel, def = P.tela.def || (P.prenda && P.prenda.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina');
    const ponTela = (k, soloPieza) => cambia('Tela ' + TELAS[k].t, () => { if (soloPieza) P.tela.porPieza[soloPieza] = k; else { P.tela.def = k; P.tela.porPieza = {}; if (ASPECTO[k] && ASPECTO[k].natural) { P.tela.color = 'natural'; P.tela.colorPieza = {}; } else if (P.tela.color === 'natural') P.tela.color = COLOR_DE[P.k] || '#5f7ea8'; } });
    const ponColor = (c, soloPieza) => { if (soloPieza) { P.tela.colorPieza = P.tela.colorPieza || {}; P.tela.colorPieza[soloPieza] = c; } else { P.tela.color = c; P.tela.colorPieza = {}; } const C = coloresPiezas(); Object.entries(C).forEach(([n, x]) => V.colorTela(x, n)); guarda(); pintaPanel(); };
    return [h('h3', 'Tejido de toda la prenda'), h('div.dw-ayuda', 'Cambia cómo cae, cuánto da de sí y cuánto pesa (como las propiedades físicas de CLO).'),
      h('div.dw-chips', Object.entries(TELAS).map(([k, T]) => h('button.dw-chip' + (def === k && !P.tela.porPieza[pz] ? '.on' : ''), { type: 'button', title: 'Da de sí hasta un ' + Math.round(T.tope * 100) + ' % · ' + T.gm2 + ' g/m²', onclick: () => ponTela(k) }, T.t))),
      h('h3', 'Color'), h('div.dw-chips', h('button.dw-chip' + (P.tela.color === 'natural' ? '.on' : ''), { type: 'button', title: 'El color de verdad de la tela (el de la foto del tejido)', onclick: () => ponColor('natural') }, '🧵 Natural'), COLORES.map(c => h('button.dw-chip', { type: 'button', title: c, style: { width: '30px', height: '30px', padding: 0, background: c, borderColor: P.tela.color === c ? 'var(--brand)' : 'var(--line-2)', borderWidth: P.tela.color === c ? '3px' : '1px' }, onclick: () => ponColor(c) })), h('input', { type: 'color', value: P.tela.color === 'natural' ? '#888888' : P.tela.color, title: 'Otro color', onchange: e => ponColor(e.target.value) })),
      pz ? [h('h3', 'Solo «' + pz + '»'), h('div.dw-chips', Object.entries(TELAS).map(([k, T]) => h('button.dw-chip' + (P.tela.porPieza[pz] === k ? '.on' : ''), { type: 'button', onclick: () => ponTela(k, pz) }, T.t))),
        h('div', { style: { marginTop: '6px' } }, h('input', { type: 'color', value: ((P.tela.colorPieza && P.tela.colorPieza[pz]) || P.tela.color).replace('natural', '#888888'), onchange: e => ponColor(e.target.value, pz) }), h('span.dw-ayuda', ' color solo de esta pieza'))] : h('div.dw-ayuda', 'Elige una pieza (en el 2D o tocándola en el 3D) para darle otra tela o color.'),
      h('h3', '🌡 Mapa de ajuste'), h('div.dw-ayuda', 'En la barra del 3D, «🌡 Ajuste» pinta dónde tira la tela: verde = suelta, amarillo = justa (5 %), rojo = tira (10 % o más). Es lo que se estira la tela sobre el avatar, calculado en la simulación.')];
  }
  function panelExportar() {
    const ok = st.V && st.V.ok;
    return [h('h3', 'Para hacer la prenda de verdad'), !ok ? h('div.dw-ayuda.dw-mal', 'El patrón tiene errores: arréglalos antes de imprimir.') : null,
      h('div', { style: { display: 'grid', gap: '6px' } },
        btn('📄 Patrón completo para imprimir en casa (A4)', () => exporta('pdf'), { cls: 'primary', title: 'Portada con el 3D y las medidas, piezas con sus medidas, montaje paso a paso, detalles y el patrón a tamaño real numerado' }), btn('🖨 Patrón completo en hoja grande (A0, copistería)', () => exporta('a0')), btn('📐 Solo el patrón (A4, sin manual)', () => exporta('patron')),
        btn('✏️ DXF (programas de patronaje y plóter)', () => exporta('dxf')), btn('🖼 SVG a tamaño real', () => exporta('svg')), btn('📋 Ficha técnica', () => exporta('ficha')),
        btn('📸 Foto del 3D (PNG)', () => { const u = V.foto(1600, 2000); descarga(dataURLaBlob(u), limpio(st.P.nombre) + '_3d.png'); }), btn('💾 Copia del proyecto (.drew.json)', () => exporta('json')),
        h('label.btn', { style: { cursor: 'pointer' } }, '📂 Abrir un proyecto .drew.json', h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const j = EX.leeProyecto(await f.text()); j.id = Z.nid('pr'); abre(Object.assign(proyectoNuevo(j.k || 'camiseta'), j)); toast('Proyecto abierto'); } catch (x) { toast(x.message, 'bad'); } } }))),
      h('div.dw-ayuda', { style: { marginTop: '10px' } }, 'Imprime SIEMPRE al 100 % («tamaño real», sin «ajustar a la página») y mide el cuadrado de 5 × 5 cm de la primera hoja antes de cortar.'),
      (() => { const I = impresoraCalibrada(); return I ? h('div.dw-ayuda.dw-bien', '🖨 Tu impresora está calibrada (a lo ancho ' + pct(I.x) + ', a lo alto ' + pct(I.y) + '): los PDF A4 salen ya corregidos. ', h('a', { href: '#', onclick: e => { e.preventDefault(); irA('foto'); } }, 'Ver')) : h('div.dw-ayuda', '🖨 Impresora sin calibrar. ', h('a', { href: '#', onclick: e => { e.preventDefault(); irA('foto'); } }, 'Calibrarla (2 minutos)'), ' y tus patrones salen al milímetro.'); })(),
      panelPrecio()];
  }
  // 💶 COSTE Y PRECIO (estimado): tela del patrón × su €/m + mercería + horas de costura × €/h; precio = coste × margen (sus números se guardan aquí)
  const leeLS = (k, d) => { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return Object.assign({}, d); } };
  function panelPrecio() {
    const P = st.P; if (!P.prenda) return null; const precios = leeLS('cd.drew.precios', PRECIO_TELA), cfg = leeLS('cd.drew.cfgPrecio', POR_DEFECTO);
    let R; try { R = precio(P.prenda, { tela: P.tela.def, precios, cfg, tipos: P.tiposCostura }); } catch (e) { return h('div.dw-ayuda', 'No se puede calcular el precio: ' + e.message); }
    const guardaN = (clave, obj, k2, v) => { obj[k2] = v; try { localStorage.setItem(clave, JSON.stringify(obj)); } catch (e) { } pintaPanel(); };
    const num = (v, fn, paso = 0.5) => h('input', { type: 'number', step: paso, min: 0, value: String(Math.round(v * 100) / 100), onchange: e => { const x = Number(String(e.target.value).replace(',', '.')); if (x >= 0) fn(x); } });
    const fila = (t, v, extra) => h('div.dw-fila', h('label', t, extra ? h('small', extra) : null), h('b', { style: { textAlign: 'right' } }, v));
    return h('div.dw-precio', h('h3', '💶 Coste y precio (estimado)'),
      fila('Tela: ' + R.telaT, eur(R.tela), String(R.metros.toFixed(2)).replace('.', ',') + ' m × ' + eur(R.eurM) + '/m (ancho 150 cm, calculado con las piezas)'),
      fila('Mercería', eur(R.merceria), 'hilo, cremallera, botón, entretela…'),
      fila('Costura', eur(R.mano), Math.round(R.minutos) + ' min (cortar + ' + R.pasos + ' pasos) a ' + eur(R.cfg.horaCostura) + '/h'),
      h('div.dw-fila.dw-total', h('label', h('b', 'Coste')), h('b', eur(R.coste))), h('div.dw-fila.dw-total', h('label', h('b', 'Precio de venta'), h('small', '× ' + String(R.cfg.margen).replace('.', ',') + ' de margen')), h('b.dw-ok', eur(R.venta))),
      h('details', h('summary.dw-ayuda', 'Mis precios (se guardan en este aparato)'),
        h('div.dw-fila', h('label', 'Esta tela (' + R.telaT + '), €/m'), num(R.eurM, x => guardaN('cd.drew.precios', precios, R.telaK, x))),
        h('div.dw-fila', h('label', 'Hora de costura, €'), num(cfg.horaCostura, x => guardaN('cd.drew.cfgPrecio', cfg, 'horaCostura', x))),
        h('div.dw-fila', h('label', 'Margen (× el coste)'), num(cfg.margen, x => guardaN('cd.drew.cfgPrecio', cfg, 'margen', x), 0.1))),
      h('div.dw-ayuda', 'Es una ESTIMACIÓN: el consumo sale del patrón real; los precios por defecto son orientativos de tienda: pon los tuyos.'));
  }
  function exporta(que) {
    const P = st.P, pr = P.prenda; if (!pr) return; const n = limpio(P.nombre);
    try {
      if (que === 'pdf' || que === 'a0') { pdfCompleto(que === 'a0' ? 'a0' : 'a4'); return; }
      if (que === 'patron') { const R = EX.pdf(pr, { formato: 'a4' }); descarga(new Blob([R.bytes], { type: 'application/pdf' }), n + '_solo_patron_A4.pdf'); toast('📄 Solo el patrón: ' + R.hojas + ' hoja(s) A4. Imprime al 100 %.', 'ok', 7000); }
      else if (que === 'dxf') { descarga(EX.dxf(pr), n + '.dxf', 'application/dxf'); toast('✏️ DXF guardado (en mm)', 'ok'); }
      else if (que === 'svg') { descarga(EX.svg(pr), n + '.svg', 'image/svg+xml'); toast('🖼 SVG guardado (1 unidad = 1 mm)', 'ok'); }
      else if (que === 'ficha') { descarga(EX.fichaTecnica(pr, Object.assign({}, st.V, { estadoT: ESTADOS[st.V.estado].t })), n + '_ficha.html', 'text/html'); toast('📋 Ficha técnica guardada', 'ok'); }
      else if (que === 'json') { descarga(EX.proyectoJSON(P), n + '.drew.json', 'application/json'); toast('💾 Proyecto guardado', 'ok'); }
    } catch (e) { toast('No se pudo exportar: ' + e.message, 'bad'); }
  }
  // 🎬 VÍDEO DE 7 SEGUNDOS para redes (ella: «recuerda siempre implementar un pequeño vídeo de 7 segundos para redes sociales»):
  // vertical 720 × 1280, la cámara da una vuelta entera a la prenda (encuadrada), con su nombre y la marca; MP4 si el navegador sabe, si no WebM.
  async function video7() {
    if (st.grabando) return; if (!window.MediaRecorder) return toast('Este navegador no sabe grabar vídeo', 'bad'); st.grabando = true;
    // 16-10 · ella: «no se ve 4K, sube resolución, puedes utilizar la gráfica» → 4K vertical (2160×3840) si la gráfica lo codifica; si no, Full HD
    let Wv = 1080, Hv = 1920; try { if (window.VideoEncoder && (await VideoEncoder.isConfigSupported({ codec: 'avc1.640033', width: 2160, height: 3840, bitrate: 30e6, framerate: 30 })).supported) { Wv = 2160; Hv = 3840; } } catch (e) { }
    const k = Wv / 720, c2 = h('canvas', { width: Wv, height: Hv }), g = c2.getContext('2d'), tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const cam0 = V.cam.position.clone(), tgt0 = V.ctl.target.clone(), gira0 = V.gira, s0 = V.ren.getSize(new V.T.Vector2()), pr0 = V.ren.getPixelRatio(); V.gira = false;
    try {
      let empresa = 'CelebriDiseños'; try { const { S } = await import('../store.js'); empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || empresa; } catch (e) { }
      // encuadre VERTICAL (9:16) de la prenda entera con aire: la distancia la marca lo que más ocupe (alto, o ancho con el campo estrecho)
      // (ella: «en el maniquí no se ve completo» → de la cabeza a los pies, con aire arriba y sitio abajo para el rótulo)
      let T0 = V.ctl.target.clone(), R0 = 2600, yC = 1100; try { const B = new V.T.Box3().setFromObject(V.grupoTela); if (st.verAv) B.union(new V.T.Box3().setFromObject(V.grupoAv)); if (!B.isEmpty()) { const hB = B.max.y - B.min.y, wB = B.max.x - B.min.x, tg = Math.tan(V.cam.fov * Math.PI / 360);
        R0 = Math.max(hB * 0.66 / tg, wB * 0.56 / (tg * Wv / Hv)); T0 = new V.T.Vector3((B.min.x + B.max.x) / 2, (B.min.y + B.max.y) / 2 - hB * 0.07, (B.min.z + B.max.z) / 2); yC = T0.y + R0 * 0.06; } } catch (e) { }
      V.ren.setPixelRatio(1); V.ren.setSize(Wv, Hv, false); V.cam.aspect = Wv / Hv; V.cam.updateProjectionMatrix(); const tapa = h('div.dw-grabando', h('i'), 'Haciendo el vídeo de 7 s en ' + (Wv >= 2160 ? '4K' : 'Full HD') + '…', h('small', 'la vista vuelve sola al terminar')); lienzo3.parentNode.appendChild(tapa); st.tapa = tapa;
      const fondo = g.createLinearGradient(0, 0, 0, Hv); fondo.addColorStop(0, '#f6f3ee'); fondo.addColorStop(1, '#e2dbd0'); const N = 210;
      const dibuja = f => { const t = f / N, a = (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)) * Math.PI * 2; // (arranca y frena suave)
        V.cam.position.set(T0.x + Math.sin(a) * R0, yC, T0.z + Math.cos(a) * R0); V.ctl.target.copy(T0); V.cam.lookAt(T0); V.pinta();
        g.fillStyle = fondo; g.fillRect(0, 0, Wv, Hv); g.drawImage(V.lienzo, 0, 0, Wv, Hv);
        const al = Math.min(1, t * 4) * Math.min(1, (1 - t) * 6 + 0.35); g.globalAlpha = al; g.fillStyle = 'rgba(20,16,30,.62)'; g.fillRect(0, Hv - 190 * k, Wv, 190 * k); g.fillStyle = '#fff'; g.textAlign = 'center';
        g.font = '800 ' + Math.round(54 * k) + 'px system-ui, sans-serif'; g.fillText(st.P.nombre || 'Mi prenda', Wv / 2, Hv - 112 * k); g.font = '600 ' + Math.round(30 * k) + 'px system-ui, sans-serif'; g.fillText(empresa + ' · diseñado con CelebriDREW', Wv / 2, Hv - 62 * k); g.globalAlpha = 1; };
      // 1º, fotograma a fotograma con su hora (drew/video_mp4.js): dura 7,0 s exactos y va suave aunque el ordenador vaya justo
      let blob = null, via = 'exacto'; try { const { mp4DeLienzo } = await import('../drew/video_mp4.js'); blob = await mp4DeLienzo(c2, N, 30, async f => { dibuja(f); if (f % 6 === 5) await new Promise(r => setTimeout(r, 0)); }, Wv >= 2160 ? 30e6 : 12e6); } catch (e) { blob = null; }
      if (!blob && st.vivo) { // 2º, si este navegador no sabe: grabando la pantalla en directo (si el ordenador no llega a 30 por segundo, dura algo más)
        via = 'directo'; const flujo = c2.captureStream(0), pista = flujo.getVideoTracks()[0], rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo, videoBitsPerSecond: 6e6 } : undefined), trozos = [], fin = new Promise(r => { rec.onstop = r; });
        rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); }; rec.start(250); const t0 = performance.now();
        for (let f = 0; f < N && st.vivo; f++) { dibuja(f); if (pista.requestFrame) pista.requestFrame(); const espera = t0 + (f + 1) * 1000 / 30 - performance.now(); await new Promise(r => espera > 1 ? setTimeout(r, espera) : requestAnimationFrame(r)); }
        await new Promise(r => setTimeout(r, 250)); rec.stop(); await fin; blob = new Blob(trozos, { type: /mp4/.test(tipo) ? 'video/mp4' : 'video/webm' }); }
      if (!st.vivo || !blob) return; const mp4 = /mp4/.test(blob.type); window.__drew_video = { bytes: blob.size, tipo: blob.type, via, ancho: Wv, alto: Hv };
      if (!st.vivo) return; descarga(blob, limpio(st.P.nombre) + '_7s.' + (mp4 ? 'mp4' : 'webm')); toast('🎬 Vídeo de 7 s en Descargas (' + (mp4 ? 'MP4' : 'WebM') + ' ' + (Wv >= 2160 ? '4K' : 'Full HD') + ' vertical, para Reels, TikTok y Stories)', 'ok', 6000);
    } catch (e) { toast('No se pudo grabar el vídeo: ' + e.message, 'bad', 7000); }
    finally { V.ren.setPixelRatio(pr0); V.ren.setSize(s0.x, s0.y, false); V.cam.aspect = s0.x / s0.y; V.cam.updateProjectionMatrix(); V.cam.position.copy(cam0); V.ctl.target.copy(tgt0); V.ctl.update(); V.gira = gira0; V.marca(); st.grabando = false; if (st.tapa) { st.tapa.remove(); st.tapa = null; } }
  }
  // 📄 el PATRÓN COMPLETO (drew/pdf_montaje.js): portada con el 3D, piezas con medidas, montaje paso a paso, detalles y el patrón en hojas
  async function pdfCompleto(formato) {
    const P = st.P, pr = P.prenda, n = limpio(P.nombre), A = P.avatar || {}; if (!st.V || !st.V.ok) { if (!(await confirmDlg('El patrón tiene errores', 'Puedes sacar el PDF igualmente, pero revisa antes lo que sale en rojo.', 'Sacarlo igual'))) return; }
    toast('📄 Preparando el PDF (fotos del 3D, piezas, montaje y patrón)…', 'info', 3000);
    const cam = V.cam.position.clone(), tgt = V.ctl.target.clone(), gira = V.gira; V.gira = false;
    // (la cámara, encuadrada a la PRENDA: si no, el cuerpo entero deja la ropa pequeña)
    let cerca = null; try { const B = new V.T.Box3().setFromObject(V.grupoTela); if (!B.isEmpty()) cerca = { y: (B.min.y + B.max.y) / 2, d: Math.max(B.max.y - B.min.y, (B.max.x - B.min.x) * 0.8) * 2.9 }; } catch (e) { cerca = null; }
    const foto = vk => { V.vista(vk, cerca); const u = V.foto(600, 760), im = new Image(); return new Promise(res => { im.onload = () => { const c = document.createElement('canvas'); c.width = 600; c.height = 760; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 600, 760); g.drawImage(im, 0, 0); const b = atob(c.toDataURL('image/jpeg', 0.88).split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); res({ jpg: a, w: 600, h: 760, t: vk === 'frente' ? 'Delante' : 'Detrás' }); }; im.onerror = () => res(null); im.src = u; }); };
    let fotos = []; try { fotos = [await foto('frente'), await foto('espalda')].filter(Boolean); } catch (e) { fotos = []; } finally { V.cam.position.copy(cam); V.ctl.target.copy(tgt); V.ctl.update(); V.gira = gira; V.marca(); }
    let empresa = 'CelebriDiseños'; try { const { S } = await import('../store.js'); empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || empresa; } catch (e) { }
    try { const { pdfMontaje } = await import('../drew/pdf_montaje.js'), td = P.tela.def || (pr.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina');
      const R = pdfMontaje(Object.assign({}, pr, { nombre: P.nombre, validacion: st.V ? ESTADOS[st.V.estado].t : '' }), { formato, fotos, empresa, talla: A.via === 'talla' ? A.talla : null, cuerpo: A.med, tela: TELAS[td], tipos: P.tiposCostura });
      descarga(new Blob([R.bytes], { type: 'application/pdf' }), n + '_patron_completo_' + (formato === 'a0' ? 'A0' : 'A4') + '.pdf');
      window.__drew_pdf = { paginas: R.paginas, hojas: R.hojas, pasos: R.pasos, fotos: fotos.length, bytes: R.bytes.length }; window.__drew_pdfBytes = R.bytes; // (para las pruebas)
      toast('📄 Patrón completo en Descargas: ' + R.paginas + ' páginas (' + R.hojas + ' hoja' + (R.hojas > 1 ? 's' : '') + ' de patrón ' + (formato === 'a0' ? 'A0' : 'A4') + ', ' + R.pasos + ' pasos de montaje). Tela: ' + String(R.consumo.m.toFixed(2)).replace('.', ',') + ' m. Imprime al 100 %.', 'ok', 9000);
    } catch (e) { toast('No se pudo hacer el PDF: ' + e.message, 'bad', 8000); }
  }
  const dataURLaBlob = u => { const [a, b] = u.split(','), bin = atob(b), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: (/:(.*?);/.exec(a) || [])[1] || 'image/png' }); };
  // ATAJOS (ella: «atajos de letras»): con Ctrl, deshacer / rehacer / PDF; sin Ctrl, las herramientas (si no se está escribiendo en una casilla)
  const modo = m => { ctx.modo = m; ED.borraMedida(); pintaBarra2(); };
  const ATAJOS = [['E', 'Elegir y mover (2D)', () => modo('elegir')], ['A', 'Añadir un punto', () => modo('anadir')], ['Q', 'Quitar un punto', () => modo('quitar')], ['C', 'Recta ↔ curva', () => modo('curva')], ['M', 'Medir', () => modo('medir')],
    ['P', 'Poner o quitar un piquete (con su pareja)', () => modo('piquete')], ['I', 'Imán a la cuadrícula de 5 mm', () => iman()], ['F', 'Ver todas las piezas (2D)', () => ED.encuadra()], ['S', 'Simular / pausar la tela', () => { st.pausa = !st.pausa; W.postMessage({ tipo: st.pausa ? 'pausa' : 'sigue' }); pintaBarra3(); }], ['R', 'Girar el maniquí', () => { V.gira = !V.gira; pintaBarra3(); }],
    ['1', 'Vista de frente', () => V.vista('frente')], ['2', 'Vista de lado', () => V.vista('izq')], ['3', 'Vista de espalda', () => V.vista('espalda')], ['V', 'Vídeo de 7 s para redes', () => video7()], ['Esc', 'Soltar la herramienta y la pieza', () => { modo('elegir'); elige(null); }], ['?', 'Ver los atajos', () => atajos()]];
  function atajos() { modal('⌨ Atajos de teclado', h('div', h('div.dw-atajos', ATAJOS.map(([k, t]) => h('div', h('kbd', k), h('span', t))), [['Ctrl Z', 'Deshacer'], ['Ctrl Y', 'Rehacer'], ['Ctrl P', 'Patrón completo en PDF'], ['Mayús', 'Arrastrar un punto en recto'], ['Rueda', 'Acercar / alejar (2D y 3D)']].map(([k, t]) => h('div', h('kbd', k), h('span', t)))), h('p.dw-ayuda', 'Las letras funcionan cuando no estás escribiendo en una casilla.')), null, { size: 'narrow' }); }
  const tecla = e => { if (!st.vivo || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || e.target.isContentEditable) return; const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) { if (k === 'z') { e.preventDefault(); deshacer(); } else if (k === 'y') { e.preventDefault(); rehacer(); } else if (k === 'p') { e.preventDefault(); exporta('pdf'); } return; }
    if (e.altKey || document.querySelector('.modal-back, .modal')) return; const A = ATAJOS.find(([x]) => x.toLowerCase() === (e.key === 'Escape' ? 'esc' : k)); if (A) { e.preventDefault(); A[2](); } };
  document.addEventListener('keydown', tecla);

  // ---------- arrancar: la última prenda de este aparato, o una camiseta para su avatar ----------
  pintaPestanas(); pintaBarra3(); pintaBarra2();
  (async () => { let P = null; try { const id = localStorage.getItem(ULTIMO); if (id) P = await PR.abrir(id); } catch (e) { P = null; }
    if (!P || !P.avatar || !P.k) P = proyectoNuevo('camiseta'); abre(P); setTimeout(() => ED.encuadra(), 80); })();
  window.__drew = { get st() { return st; }, V, ED, W, ctx }; // (para las pruebas)
  return { destroy() { st.vivo = false; document.body.classList.remove('dw-solo', 'dw-noche-on'); pestanaMenu.remove(); document.removeEventListener('keydown', tecla); try { W.terminate(); } catch (e) { } V.destroy(); ED.destroy(); delete window.__drew; } };
}
