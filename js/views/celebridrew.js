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
import { TIPOS as TIPOS_COSTURA, tipoDe, edicionesTipo, pasos as pasosMontaje } from '../drew/montaje.js'; // 16-10: el tipo de cada costura (cambia sus márgenes y sale en el PDF)
import * as IU from '../drew/inspira_ui.js'; import * as INS from '../drew/foto/inspira.js'; // 16-10: 🌐 diseñar desde una imagen (internet, revista…)
import * as CUE from '../drew/cuerpos.js';
import * as MI from '../drew/manual_ia.js'; import { desktop } from '../desktop.js'; // 17-10 noche: 🤖 el manual fácil (con la IA del PC o sin ella) y la exportación completa en una carpeta
import * as MA from '../drew/marca.js'; // 17-10 noche: 🏷️ su marca THE NOORKO (paleta, medidas de estampado, sus diseños) y el 📚 catálogo de modelos hecho con sus planos
import * as PZU from '../drew/piezas_ui.js'; // 17-10: 🧩 monta tu sudadera (piezas que se arrastran) y la cremallera pintada en el 3D // 17-10: biblioteca de cuerpos (mujeres y hombres), pelo y el avatar de CLO (.avs)
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
  const TIPO_MODELO = 'text/x-drew-modelo', TIPO_DISENO = 'text/x-drew-diseno'; // (17-10 noche: lo que se arrastra al avatar)
  const st = { marca: { mirada: false, base: null, disenos: [] }, grupoCat: 'basicos', P: null, hist: PR.historial(), pest: 'prenda', V: null, sel: null, modo: 'elegir', mapa: false, tirar: false, verAv: true, topo: null, Sv: null, med3d: null, niveles: null, est3d: null, cosida: false, quieta: false, avatarOk: false, vivo: true, errorPrenda: null };
  try { st.facil = localStorage.getItem('cd.drew.facil') === '1'; } catch (e) { st.facil = false; } // (17-10 noche: 🧸 el modo fácil se recuerda en este aparato)
  // ---------- el esqueleto ----------
  const nombre = h('input.dw-nombre', { 'aria-label': 'Nombre de la prenda', onchange: e => { st.P.nombre = e.target.value.trim() || 'Prenda'; guarda(); } });
  // 17-10-2026 · 📏 LA TALLA de la prenda acabada, siempre a la vista junto al nombre (ella: «tiene que decir la talla aprox. del proyecto
  // final o poner la talla en CelebriDREW»). Tocándola se va a «📏 Talla» de la pestaña Prenda, donde se hace en otra talla.
  const chipTalla = h('button.dw-talla', { type: 'button', title: 'Talla aproximada de la prenda acabada · tócala para hacerla en otra talla', onclick: () => { irA('prenda'); setTimeout(() => { const x = panel.querySelector('.dw-sec-talla'); if (x) x.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); } });
  const bDeshacer = btn('↶', () => deshacer(), { cls: 'ghost', title: 'Deshacer (Ctrl+Z)' }), bRehacer = btn('↷', () => rehacer(), { cls: 'ghost', title: 'Rehacer (Ctrl+Y)' });
  // 16-10 · ATELIER: la cara propia de CelebriDREW (marfil y tinta; «☾» la pone de noche y se recuerda en este aparato)
  let temaNoche = false; try { temaNoche = localStorage.getItem('cd.drew.tema') === 'noche'; } catch (e) { }
  document.body.classList.toggle('dw-noche-on', temaNoche); /* (las ventanas van fuera de .dw: el tema de noche les llega por el body) */
  const bTema = btn(temaNoche ? '☀' : '☾', () => { temaNoche = !temaNoche; raiz.classList.toggle('dw-noche', temaNoche); document.body.classList.toggle('dw-noche-on', temaNoche); bTema.querySelector('span').textContent = temaNoche ? '☀' : '☾'; try { localStorage.setItem('cd.drew.tema', temaNoche ? 'noche' : 'dia'); } catch (e) { } }, { cls: 'ghost', title: 'Atelier de día / de noche' });
  // (17-10, iPad) los botones de la cabecera: icono + palabra; si no cabe (iPad, ventana estrecha) queda el icono y la palabra en el título
  let bFacil = null; const bc = (ic, t, fn, o = {}) => { const b = btn('', fn, Object.assign({ cls: 'ghost', title: t }, o)); b.append(h('i.ic', ic), h('span.l', ' ' + t)); return b; };
  // 18-10-2026 · ella: «los menús mejor organizados, muy feo». La cabecera va POR GRUPOS, cada uno con su nombre encima: la prenda (nombre, talla,
  // deshacer) · Modo · Archivo · Exportar · Vista. Los botones son los mismos de siempre (y hacen lo mismo).
  const grupo = (t, ...L) => h('div.dw-g', { 'data-t': t, role: 'group', 'aria-label': t }, ...L);
  const cab = h('div.dw-cab', h('h1.dw-marca', 'Celebri', h('b', 'DREW'), h('small', 'atelier 3D')), grupo('Prenda', nombre, chipTalla, bDeshacer, bRehacer), h('div.esp'),
    grupo('Modo', (bFacil = bc('🧸', 'Fácil', () => ponFacil(!st.facil), { title: 'Modo fácil: arrastra un modelo al avatar, elige chica o chico, la talla, el color y tus diseños, y exporta' }))),
    grupo('Archivo', bc('📂', 'Mis prendas', () => misPrendas()), bc('＋', 'Nueva', () => nueva())),
    grupo('Exportar', bc('🎬', 'Vídeo 7 s', () => video7(), { title: 'Un vídeo vertical de 7 segundos de la prenda girando, para redes (V)' }),
      (() => { const b = btn('', () => exporta('pdf'), { cls: 'primary', title: 'Patrón completo con manual (Ctrl+P)' }); b.append(h('i.ic', '📄'), h('span', ' PDF'), h('span.l', ' para imprimir')); return b; })()),
    grupo('Vista', bTema, btn('⛶', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Este navegador no deja ponerla a pantalla completa', 'bad')); }, { cls: 'ghost', title: 'Pantalla completa (F11)' }), btn('⌨', () => atajos(), { cls: 'ghost', title: 'Atajos de teclado (?)' })));
  const pestanas = h('div.dw-pest', { role: 'tablist' }), panel = h('div.dw-panel');
  const lado = h('div.dw-lado', pestanas, panel);
  // 3D
  const lienzo3 = h('div.dw-lienzo'), aviso3 = h('div.dw-aviso3d', 'Preparando el avatar…'), leyenda = h('div.dw-leyenda', { style: { display: 'none' } }, h('div', h('i', { style: { background: '#4fc75a' } }), 'Suelta'), h('div', h('i', { style: { background: '#f2c84a' } }), 'Justa (5 %)'), h('div', h('i', { style: { background: '#f04a2c' } }), 'Tira (10 % o más)'), h('div', h('i', { style: { background: '#5a8cf2' } }), 'Arrugada'));
  const barra3 = h('div.dw-barra'), ven3 = h('div.dw-ven.v3', barra3, h('div', { style: { position: 'relative', minHeight: 0 } }, lienzo3, aviso3, leyenda));
  // 2D
  const lienzo2 = h('div.dw-lienzo'), barra2 = h('div.dw-barra'), ficha = h('div.dw-ficha', { style: { display: 'none' } });
  const pista = h('div.dw-pista', { 'aria-live': 'polite' }), cruceta = h('div.dw-cruceta', { style: { display: 'none' } }); /* (17-10: qué hace la herramienta y flechas para el dedo) */
  const ven2 = h('div.dw-ven.v2', barra2, h('div', { style: { position: 'relative', minHeight: 0 } }, lienzo2, pista, cruceta, ficha));
  const divisor = h('div.dw-divisor', { title: 'Arrastra para cambiar el tamaño' }), vistas = h('div.dw-vistas', ven3, divisor, ven2);
  const pie = h('div.dw-pie');
  const cuerpo = h('div.dw-cuerpo', lado, vistas);
  const raiz = h('div.dw.dw-atelier' + (temaNoche ? '.dw-noche' : '') + (st.facil ? '.dw-facil' : ''), cab, cuerpo, pie); if (st.facil) { vistas.classList.add('solo3d'); bFacil.classList.add('on'); }
  // (17-10, iPad) PLEGAR la biblioteca (quedan sus iconos: tocar uno la abre) y ver solo el 3D o solo el patrón en grande
  try { const pg = localStorage.getItem('cd.drew.plegado'); st.plegado = pg ? pg === '1' : window.innerWidth < 900 || (window.innerWidth < 1300 && matchMedia('(pointer: coarse)').matches); } /* (en el iPad, plegada de entrada: el 3D y el patrón tienen el doble de sitio) */ catch (e) { st.plegado = false; }
  cuerpo.classList.toggle('plegado', st.plegado);
  const plega = v => { st.plegado = v; cuerpo.classList.toggle('plegado', v); try { localStorage.setItem('cd.drew.plegado', v ? '1' : '0'); } catch (e) { } pintaPestanas(); };
  // (17-10 noche) 🧸 MODO FÁCIL (ella: «fácil, que pueda diseñar también aparte, estilo principiante, arrastrando, para complementar el avatar, pero
  // tallas reales»): la biblioteca se vuelve 5 pasos grandes (para quién y talla · la prenda del catálogo, arrastrándola · color · tus diseños ·
  // exportar) y se ve solo el 3D; el patrón 2D sigue debajo, intacto, y vuelve con «Modo completo». Es la MISMA prenda: nada se pierde.
  const ponFacil = v => { st.facil = v; raiz.classList.toggle('dw-facil', v); bFacil.classList.toggle('on', v); try { localStorage.setItem('cd.drew.facil', v ? '1' : '0'); } catch (e) { }
    vistas.classList.toggle('solo3d', v || st.solo === '3d'); vistas.classList.toggle('solo2d', !v && st.solo === '2d'); if (v && st.plegado) plega(false); pintaPestanas(); pintaPanel(); requestAnimationFrame(() => requestAnimationFrame(() => ED.encuadra())); };
  const soloVista = k => { st.solo = st.solo === k ? null : k; vistas.classList.toggle('solo2d', st.solo === '2d'); vistas.classList.toggle('solo3d', st.solo === '3d'); pintaBarra2(); pintaBarra3(); requestAnimationFrame(() => requestAnimationFrame(() => ED.encuadra())); };
  mount(root, raiz);
  // el divisor entre el 3D y el 2D
  divisor.addEventListener('pointerdown', ev => { divisor.setPointerCapture(ev.pointerId); const r = vistas.getBoundingClientRect(), mv = e => { const f = Math.max(0.25, Math.min(0.75, (e.clientX - r.left) / r.width)); vistas.style.setProperty('--dw-izq', (f / (1 - f)).toFixed(3) + 'fr'); }, up = () => { divisor.removeEventListener('pointermove', mv); divisor.removeEventListener('pointerup', up); }; divisor.addEventListener('pointermove', mv); divisor.addEventListener('pointerup', up); });

  // ---------- 3D ----------
  const V = vista3d(lienzo3);
  // (17-10) soltar una pieza de «Monta tu sudadera» encima del 3D o del patrón
  [lienzo3, lienzo2].forEach(z => { const zona = z.closest('.dw-ven') || z.parentElement || z;
    zona.addEventListener('dragover', e => { const ty = [...(e.dataTransfer.types || [])]; if (!ty.includes(PZU.TIPO_ARRASTRE) && !ty.includes(TIPO_MODELO) && !ty.includes(TIPO_DISENO)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zona.classList.add('dw-soltar'); });
    zona.addEventListener('dragleave', e => { if (!zona.contains(e.relatedTarget)) zona.classList.remove('dw-soltar'); });
    zona.addEventListener('drop', e => { const d = e.dataTransfer.getData(PZU.TIPO_ARRASTRE), mo = e.dataTransfer.getData(TIPO_MODELO), di = e.dataTransfer.getData(TIPO_DISENO); zona.classList.remove('dw-soltar'); document.body.classList.remove('dw-arrastrando');
      if (mo) { e.preventDefault(); const m = modeloPorId(mo); if (m) aplicaDiseno(m); return; } // (17-10 noche) un MODELO del catálogo soltado en el avatar: sale en 3D a su medida
      if (di) { e.preventDefault(); disenoAEstampado(JSON.parse(di)); return; } // (17-10 noche) uno de SUS diseños soltado en la prenda: estampado
      if (!d) return; e.preventDefault(); const [k, v] = d.split(':'); ponPiezaSud(k, v); }); });
  // ---------- el hilo de la simulación ----------
  const W = new Worker(new URL('../drew/tela_worker.js', import.meta.url), { type: 'module' });
  W.onerror = e => { aviso3.textContent = '⚠️ La simulación 3D no ha podido arrancar: ' + (e.message || 'error'); };
  W.onmessage = e => { const m = e.data; if (!st.vivo) return;
    if (m.tipo === 'avatar') { V.ponAvatar({ H: m.H }, m.malla); st.med3d = { medido: m.medido, objetivo: m.objetivo, desvio: m.desvio, ms: m.ms, premium: m.premium, fuera: m.fuera }; if (m.aviso) toast(m.aviso, 'bad', 8000); st.niveles = m.niveles; st.avatarOk = true; V.piel(st.P.avatar.piel); V.ponPelo(CUE.peinadoDe(st.P.avatar), st.P.avatar.peloColor || 'igual'); V.verAvatar(st.verAv);
      aviso3.textContent = 'Avatar listo (' + (m.ms / 1000).toFixed(1) + ' s). Cosiendo la prenda…'; if (st.P.autoAjuste) { ajustaAlAvatar(); regenera(true); } else mandaPrenda(true); if (st.pest === 'avatar' || st.facil) pintaPanel(); }
    else if (m.tipo === 'modelo') { st.topo = m.topo; st.Sv = { P: m.topo.P.map(p => ({ off: p.off, n: p.n, tri: p.tri, tela: p.tela, pz: { nombre: p.nombre } })), uv: m.topo.uv, pos: new Float32Array(m.pos), pares: m.topo.pares };
      V.ponTela(st.Sv, { colores: coloresPiezas(), estampados: estampadosVista() }); V.actualizaTela(null); V.resalta(st.sel); if (m.topo.avisos.length) console.warn('CelebriDREW 3D:', m.topo.avisos); if (m.gen === undefined || m.gen === st.gen) st.espera3d = false; /* (solo la prenda del último encargo) */ st.cosida = false; st.quieta = false; pintaPie(); }
    // (16-10, iPad: mientras el hilo no ha montado la prenda nueva —espera3d—, lo que aún llegue de la anterior NO cuenta como «colocada»:
    //  al crear el vestido desde una imagen, el pie decía «✔ colocada» con la camiseta de antes mientras el avatar se ajustaba)
    else if (m.tipo === 'pos') { if (st.Sv) { st.Sv.pos.set(m.pos); V.actualizaTela(st.mapa ? (m.estira || undefined) : undefined); } if (!st.espera3d) { st.cosida = m.cosida; st.quieta = m.quieta; } W.postMessage({ tipo: 'listo' }); if (m.quieta) pintaPie(); }
    else if (m.tipo === 'estado') { if (!st.espera3d) { st.est3d = m; st.cosida = m.cosida; st.quieta = !!m.quieta; } pintaPie(); }
    else if (m.tipo === 'error') { st.espera3d = false; toast((m.drew ? '' : 'Simulación: ') + m.msg, 'bad', 8000); aviso3.textContent = '⚠️ ' + m.msg; }
  };
  // (lo que hay en 3D ya no es lo que se pide: cada encargo lleva su turno —gen— y solo el «modelo» de ESE turno vuelve a dar por buena la tela)
  const espera3d = () => { st.gen = (st.gen || 0) + 1; st.espera3d = true; st.cosida = false; st.quieta = false; pintaPie(); return st.gen; };
  const mandaAvatar = () => { const gen = espera3d(); st.avatarOk = false; aviso3.textContent = 'Ajustando el avatar a sus medidas…'; aviso3.style.display = ''; W.postMessage({ tipo: 'avatar', gen, med: st.P.avatar.med, sexo: st.P.avatar.sexo, musculo: st.P.avatar.musculo, peso: st.P.avatar.via === 'peso' ? st.P.avatar.peso : null, premium: st.P.avatar.realista !== false, pelo: CUE.peinadoDe(st.P.avatar) }); };
  const telasPorPieza = () => { const P = st.P, o = {}; (P.prenda ? P.prenda.piezas : []).forEach(pz => { const k = P.tela.porPieza[pz.nombre] || P.tela.def; if (k) o[pz.nombre] = k; }); return Object.keys(o).length ? o : null; };
  // (el color «natural» solo existe en las telas fotografiadas con su color de verdad: vaquero, cuero, ante; en las demás, su color típico)
  const coloresPiezas = () => { const P = st.P, o = {}, def = P.tela.def || (P.prenda && P.prenda.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina');
    (P.prenda ? P.prenda.piezas : []).forEach(pz => { const c = (P.tela.colorPieza && P.tela.colorPieza[pz.nombre]) || P.tela.color, k = P.tela.porPieza[pz.nombre] || def; o[pz.nombre] = c === 'natural' && !(ASPECTO[k] && ASPECTO[k].natural) ? (TELAS[k] || TELAS.punto).color : c; }); return o; };
  const mandaPrenda = conservar => { if (!st.P.prenda) return; const gen = espera3d(); W.postMessage({ tipo: 'prenda', gen, prenda: JSON.parse(JSON.stringify(st.P.prenda)), tela: telasPorPieza(), conservar }); };

  // ---------- 2D ----------
  const ctx = { prenda: null, disp: {}, sel: {}, modo: 'elegir',
    estadoPieza: id => { const x = st.V && st.V.piezas.find(p => p.id === id); return !x ? 'ok' : x.E.length ? 'mal' : x.A.length ? 'ojo' : 'ok'; },
    onEdit: (e, que) => edita(e, que), onSelect: s => { const pz = st.P.prenda.piezas.find(p => p.id === s.pieza); elige(pz ? pz.nombre : null, s); },
    alMoverPieza: () => { st.P.disp = ctx.disp; guarda(); }, alMedir: d => toast('📏 ' + G.cm(d, 2) + ' cm', 'ok', 4000), aviso: t => toast(t, 'bad', 5000) };
  try { ctx.iman = localStorage.getItem('cd.drew.iman') === '1'; } catch (e) { ctx.iman = false; }
  const iman = () => { ctx.iman = !ctx.iman; try { localStorage.setItem('cd.drew.iman', ctx.iman ? '1' : '0'); } catch (e) { } pintaBarra2(); toast(ctx.iman ? '🧲 Imán: los puntos caen en la cuadrícula de 5 mm' : 'Imán quitado: los puntos van libres', 'ok', 3500); };
  try { ctx.cotas = localStorage.getItem('cd.drew.cotas') === '1'; } catch (e) { ctx.cotas = false; }
  const cotas = () => { ctx.cotas = !ctx.cotas; try { localStorage.setItem('cd.drew.cotas', ctx.cotas ? '1' : '0'); } catch (e) { } ED.pinta(); pintaBarra2(); };
  const TACTIL = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const AYUDA2 = { elegir: 'Toca una pieza para elegirla · arrastra un punto ● o un tirador ■ para cambiar la forma', anadir: 'Toca un borde de la pieza: pone un punto ahí', quitar: 'Toca un punto para quitarlo',
    curva: 'Toca un tramo: pasa de recto a curvo (y al revés)', medir: 'Toca dos sitios: sale la distancia en cm', piquete: 'Toca un borde: piquete ahí y en su pareja (tocar uno lo quita)' };
  function pintaAyuda2() { const pz = st.sel && st.P && st.P.prenda && st.P.prenda.piezas.find(p => p.nombre === st.sel), pt = pz && ctx.sel && ctx.sel.punto && pz.puntos[ctx.sel.punto], B = pz && ctx.sel && ctx.sel.borde && Z.bordePorId(pz, ctx.sel.borde), el = ctx.modo === 'elegir';
    pista.textContent = (el && pt ? '● ' + pt.n + ': arrástralo o muévelo con las flechas' : el && B ? '▬ ' + B.n + ': en la ficha se mueve entero (alargar, ensanchar)' : AYUDA2[ctx.modo] || '') + (TACTIL ? ' · dos dedos: acercar y mover' : ' · rueda: acercar · arrastrar el fondo: mover');
    if (el && pt) { const k = pz.nombre + '|' + ctx.sel.punto; if (k !== st.ultPunto && fichaEstrecha() && !st.fichaMini) { st.fichaMini = true; ficha.classList.add('mini'); pintaFicha(); } st.ultPunto = k; pintaCruceta(pz, pt); } /* (patrón estrecho: al elegir un punto la ficha se encoge, que no tape las flechas) */
    else { cruceta.style.display = 'none'; st.ultPunto = null; } }
  // las FLECHAS para mover el punto elegido con el dedo (cada toque: 1 mm, 5 mm o 1 cm; un toque = un Ctrl+Z)
  let pasoCruceta = 1;
  function pintaCruceta(pz, pt) { const id = ctx.sel.punto, mv = (dx, dy) => edita({ op: 'muevePunto', pieza: pz.nombre, args: { punto: id, dx: dx * pasoCruceta, dy: dy * pasoCruceta } }, 'Mover «' + pt.n + '» ' + (pasoCruceta >= 10 ? '1 cm' : pasoCruceta + ' mm'));
    const f = (t, dx, dy, tl, cls) => h('button.' + cls, { type: 'button', title: tl, 'aria-label': tl, onclick: () => mv(dx, dy) }, t);
    mount(cruceta, h('div.dw-cr-t', '● ' + pt.n), h('div.dw-cr-g', f('↑', 0, 1, 'Subir el punto', 'ar'), f('←', -1, 0, 'A la izquierda', 'iz'),
      h('button.pa', { type: 'button', title: 'Cuánto se mueve en cada toque (toca para cambiar)', onclick: () => { pasoCruceta = pasoCruceta === 1 ? 5 : pasoCruceta === 5 ? 10 : 1; pintaCruceta(pz, pt); } }, pasoCruceta >= 10 ? '1 cm' : pasoCruceta + ' mm'),
      f('→', 1, 0, 'A la derecha', 'de'), f('↓', 0, -1, 'Bajar el punto', 'ab')));
    cruceta.style.display = ''; }
  // (17-10) MOVER UN BORDE ENTERO: sus puntos se trasladan en paralelo hacia FUERA de la pieza (mm > 0) o hacia dentro → ediciones muevePunto
  function desplazaBorde(pz, bid, mm) { const B = Z.bordePorId(pz, bid), L = Z.bordePolilinea(pz, bid); if (!B || !L || L.length < 2) return [];
    const t = G.norma(G.sub(L[L.length - 1], L[0])), c = Z.caja(pz), mid = L[Math.floor(L.length / 2)]; let n = [-t[1], t[0]];
    if ((mid[0] - (c.x0 + c.x1) / 2) * n[0] + (mid[1] - (c.y0 + c.y1) / 2) * n[1] < 0) n = [-n[0], -n[1]];
    const ids = []; B.tramos.forEach(tid => { const tr = Z.tramoPorId(pz, tid); if (tr) [tr.a, tr.b].forEach(id => { if (!ids.includes(id)) ids.push(id); }); });
    return ids.map(id => ({ op: 'muevePunto', pieza: pz.nombre, args: { punto: id, dx: Math.round(n[0] * mm * 10) / 10, dy: Math.round(n[1] * mm * 10) / 10 } })); }
  // la PAREJA de un borde: el borde de la otra pieza con el que se cose
  function parejasDe(prenda, pz, bid) { const out = []; (prenda.costuras || []).forEach(c => { if (c.tipo === 'espejo') return; const yo = c.a.pieza === pz.id && c.a.borde === bid ? 'a' : c.b.pieza === pz.id && c.b.borde === bid ? 'b' : null; if (!yo) return;
      const o = yo === 'a' ? c.b : c.a; if (o.pieza === pz.id && o.borde === bid) return; const opz = prenda.piezas.find(p => p.id === o.pieza), ob = opz && Z.bordePorId(opz, o.borde);
      if (ob && ob.tipo !== 'doblez' && !out.some(x => x.pz === opz && x.borde === o.borde)) out.push({ pz: opz, borde: o.borde, n: ob.n }); }); return out; }
  const ED = editor2d(lienzo2, ctx);
  let piezasVistas = '', encuadrado = false, cortesVistos = '';
  new ResizeObserver(() => { const r = lienzo2.getBoundingClientRect(); if (r.width > 50 && r.height > 50 && !encuadrado && ctx.prenda) { encuadrado = true; ED.encuadra(); } }).observe(lienzo2);

  // ---------- el proyecto ----------
  // dónde está cada pieza en la mesa del 2D (se recuerda por su nombre; las nuevas, a la derecha de las que ya había)
  function colocaPiezas() { const P = st.P, pr = P.prenda; if (!pr) return; P.disp = P.disp || {}; const C = EX.coloca(pr, 1400, 40), hay = Object.keys(P.disp).length;
    let x0 = 0; if (hay) Object.entries(P.disp).forEach(([n, d]) => { const pz = pr.piezas.find(q => q.nombre === n); x0 = Math.max(x0, d[0] + (pz ? Z.caja(pz).x1 : 300) + 60); });
    C.items.forEach(it => { if (P.disp[it.pz.nombre]) return; const b = it.d.caja; P.disp[it.pz.nombre] = [x0 + it.x - b.x0, it.y + b.y1]; });
    ctx.disp = P.disp; }
  function tallaPrenda() { const P = st.P; if (!P || !P.medidas) return null; const A = TA.tallaAprox(P.k, P.medidas, P.ajuste || 'normal', (P.avatar && P.avatar.sexo) || 'mujer'); if (!A) return null;
    const exacta = P.avatar.via === 'talla' && P.avatar.talla === A.t && !A.fuera; return Object.assign(A, { texto: TA.textoTalla(A, exacta), exacta }); }
  function ajustaAlAvatar() { const P = st.P; if (!st.niveles) return; let M; try { M = TA.medidasPrenda(P.k, cuerpoParaPrenda(P.avatar.med, st.niveles), { ajuste: P.ajuste, manga: P.opciones.mangaTipo, escote: P.opciones.escote }); } catch (e) { return; }
    const E = P.escala || {}; // (17-10 noche: los modelos del catálogo con largo PROPORCIONAL al cuerpo: el cropped es un 78 % del largo de su talla)
    Object.entries(M).forEach(([k, v]) => { const x = P.medidas[k]; if (!x || x.origen !== 'usuario') P.medidas[k] = { v: E[k] ? Math.round(v * E[k]) : v, origen: 'calculada', confianza: 1 }; }); }
  function regenera(conservar = true, sinMandar) {
    const P = st.P; st.errorPrenda = null;
    try { const { prenda, fallos } = PR.generaPrenda(P, P.k, P.opciones); { const T = tallaPrenda(); prenda.talla = T ? T.texto : (P.avatar.via === 'talla' ? P.avatar.talla : null); } st.V = valida(prenda); // (17-10: la talla que sale de verdad) prenda.validacion = ESTADOS[st.V.estado].t;
      if (fallos.length) toast('Algunos cambios a mano ya no se pueden aplicar: ' + fallos.map(f => f.motivo).join(' · '), 'bad', 9000); }
    catch (e) { st.errorPrenda = e.message; toast(e.message, 'bad', 9000); pintaPie(); return false; }
    ctx.prenda = P.prenda; ctx.estampados = estampadosVista(); colocaPiezas(); if (st.sel) { const pz = P.prenda.piezas.find(p => p.nombre === st.sel); ctx.sel = pz ? Object.assign({}, ctx.sel, { pieza: pz.id }) : {}; if (!pz) st.sel = null; }
    ED.pinta(); const firma = P.prenda.piezas.map(p => p.nombre).join('|'); if (firma !== piezasVistas) { piezasVistas = firma; if (lienzo2.getBoundingClientRect().height > 50) { encuadrado = true; ED.encuadra(); } else encuadrado = false; }
    pintaFicha(); pintaAyuda2(); pintaPie(); if (st.pest === 'prenda' || st.facil) pintaPanel(); nombre.value = P.nombre;
    // (17-10) si cambian las PIEZAS o cómo se cortan (al doblez ↔ dos piezas: poner una cremallera, quitar la capucha…), se cose DESDE CERO:
    // heredar la posición de la prenda anterior dejaba la nueva abierta y «cayendo» para siempre (la mitad nueva del delantero no se cosía)
    const corte = P.prenda.piezas.map(p => p.nombre + ':' + (p.corte.doblez ? 'd' : (p.corte.n || 1) + (p.corte.espejo ? 'e' : ''))).join('|'), otraForma = corte !== cortesVistos; cortesVistos = corte;
    if (!sinMandar) mandaPrenda(conservar && !otraForma); guarda(); return true;
  }
  const guarda = debounce(() => { if (!st.P) return; PR.guarda(st.P).then(() => { try { localStorage.setItem(ULTIMO, st.P.id); } catch (e) { } }).catch(e => console.warn('No se pudo guardar', e)); }, 1200);
  function cambia(que, fn, opts = {}) { st.hist.apunta(st.P, que); fn(); if (opts.avatar) mandaAvatar(); else regenera(opts.conservar !== false); }
  // (17-10) 🖼 ESTAMPADOS: imágenes (con transparencia) o letras encima de una pieza: { id, img (en P.imagenes: así el deshacer no carga con
  // ellas), pieza, x (mm desde el centro), y (mm desde el bajo), w, h, nombre }. Se ven en el 3D (vista3d.ponEstampados), en el 2D y en el PDF.
  // Moverlos o cambiarles el tamaño NO vuelve a coser la prenda (solo se repinta).
  function estUrl(E) { const i = ((st.P && st.P.imagenes) || []).find(q => q.id === E.img); return i && i.datos; }
  // (la altura se guarda como en una ficha técnica: «yc» = cuánto queda el CENTRO por debajo del cuello en el hombro de la pieza; para pintar, y desde el bajo)
  function topePieza(nombre) { const pz = ((st.P && st.P.prenda && st.P.prenda.piezas) || []).find(p => p.nombre === nombre || p.nombre.startsWith(nombre + ' (')); if (!pz) return null; const q = pz.puntos && pz.puntos.hps; return q ? q.y : Z.caja(pz).y1; }
  function estampadosVista() { return ((st.P && st.P.estampados) || []).map(E => { const t = topePieza(E.pieza); return Object.assign({}, E, { url: estUrl(E), y: E.yc != null && t != null ? t - E.yc : E.y }); }).filter(E => E.url && isFinite(E.y)).concat(PZU.adornos(st.P)); }
  function ponEstampadosVista() { ctx.estampados = estampadosVista(); V.ponEstampados(ctx.estampados); ED.pinta(); }
  function cambiaEst(que, fn) { st.hist.apunta(st.P, que); fn(); ponEstampadosVista(); guarda(); if (st.pest === 'tela' || st.facil) pintaPanel(); } // (17-10 noche: en el modo fácil, el paso 4 enseña los estampados)
  function nuevaImagen(datos, tipo) { const id = 'im' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); st.P.imagenes = st.P.imagenes || []; st.P.imagenes.push({ id, datos, tipo: tipo || 'estampado' }); return id; }
  // la pieza DELANTERA de la prenda (la del pecho) y dónde va un estampado de pecho en ella (un 72 % de su alto, centrado)
  // (17-10 noche) la ESPALDA de cualquier prenda: «Espalda» o, en el vestido, «Cuerpo espalda» (antes, en el vestido iba a una pieza que no existe)
  function piezaEspalda() { const L = (st.P.prenda && st.P.prenda.piezas) || [], pz = L.find(p => /^(Cuerpo espalda|Espalda)/.test(p.nombre)); return pz ? pz.nombre.replace(/ \(.*\)$/, '') : piezaDelantera(); }
  function piezaDelantera() { const L = (st.P.prenda && st.P.prenda.piezas) || [], pz = L.find(p => /^(Cuerpo delantero|Delantero)/.test(p.nombre)) || L[0]; return pz ? pz.nombre.replace(/ \(.*\)$/, '') : 'Delantero'; }
  function sitioPecho(nombre) { const pz = ((st.P.prenda && st.P.prenda.piezas) || []).find(p => p.nombre === nombre || p.nombre.startsWith(nombre + ' (')); if (!pz) return { x: 0, ancho: 500 };
    const b = Z.caja(pz); return { x: 0, ancho: pz.corte && pz.corte.doblez ? 2 * (b.x1 - b.x0) : (b.x1 - b.x0) }; }
  // de RGBA (la foto de producto) a PNG
  function rgbaAPng(rgba, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0); return c.toDataURL('image/png'); }
  function anadeEstampado(datos, o = {}) { const im = new Image(); im.onload = () => { const pieza = o.pieza || piezaDelantera(), S = sitioPecho(pieza), w = o.w || Math.round(Math.min(260, 0.34 * S.ancho)), h = o.h || Math.round(w * im.naturalHeight / Math.max(1, im.naturalWidth));
      cambiaEst(o.que || 'Estampado nuevo', () => { const img = nuevaImagen(datos); st.P.estampados = (st.P.estampados || []).concat([{ id: 'es' + Date.now().toString(36), img, pieza, x: o.x != null ? o.x : S.x, yc: o.yc != null ? o.yc : Math.round(80 + h / 2), w, h, nombre: o.nombre || 'Estampado' }]); }); }; /* (de pecho: su borde de arriba a 8 cm del cuello en el hombro, lo típico) */
    im.onerror = () => toast('No se puede leer esa imagen.', 'bad'); im.src = datos; }
  // letras → PNG con fondo transparente (fuente gruesa, el color elegido)
  function letrasAPng(texto, color) { const c = document.createElement('canvas'), g = c.getContext('2d'), px = 220, f = '900 ' + px + 'px "Montserrat", "Arial Black", system-ui, sans-serif'; g.font = f;
    const L = String(texto).split(/\n/), w = Math.ceil(Math.max(...L.map(t => g.measureText(t).width)) + px * 0.3), h = Math.ceil(L.length * px * 1.12 + px * 0.2); c.width = w; c.height = h; g.font = f; g.fillStyle = color || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    L.forEach((t, i) => g.fillText(t, w / 2, px * 0.6 + i * px * 1.12)); return c.toDataURL('image/png'); }
  function edita(e, que) { cambia(que, () => { st.P.ediciones.push(...[].concat(e)); }); } // (16-10: un piquete y su pareja = un solo paso de Ctrl+Z)
  function deshacer() { const r = st.hist.deshacer(st.P); if (!r) return toast('No hay nada que deshacer'); const avAntes = JSON.stringify(st.P.avatar); st.P = r.P; toast('↶ ' + r.que); if (JSON.stringify(st.P.avatar) !== avAntes) mandaAvatar(); regenera(true); }
  function rehacer() { const r = st.hist.rehacer(st.P); if (!r) return toast('No hay nada que rehacer'); const avAntes = JSON.stringify(st.P.avatar); st.P = r.P; toast('↷ ' + r.que); if (JSON.stringify(st.P.avatar) !== avAntes) mandaAvatar(); regenera(true); }
  function elige(nombrePz, s) { st.sel = nombrePz; const pz = nombrePz && st.P.prenda.piezas.find(p => p.nombre === nombrePz); ctx.sel = pz ? Object.assign({ pieza: pz.id }, s || {}) : {}; V.resalta(nombrePz); ED.pinta(); pintaFicha(); pintaAyuda2(); if (st.pest === 'tela') pintaPanel(); }
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
    const g3 = (t, ...L) => h('span.dw-bg', { title: t, role: 'group', 'aria-label': t }, ...L); // (18-10: por grupos: simulación · ver · tela · cámara)
    mount(barra3, h('span.tit', '3D'), g3('Simulación',
      b(st.pausa ? '▶ Simular' : '⏸ Pausar', st.pausa, () => { st.pausa = !st.pausa; W.postMessage({ tipo: st.pausa ? 'pausa' : 'sigue' }); pintaBarra3(); }, 'Parar o seguir la simulación de la tela'),
      b('🪡 Vestir de nuevo', false, () => { W.postMessage({ tipo: 'revestir', gen: st.P.prenda ? espera3d() : st.gen }); }, 'Coloca las piezas otra vez alrededor del cuerpo y las cose desde cero')), g3('Ver y tocar la tela',
      b('🌡 Ajuste', st.mapa, () => { st.mapa = !st.mapa; leyenda.style.display = st.mapa ? '' : 'none'; W.postMessage({ tipo: 'mapa', si: st.mapa }); if (!st.mapa) { V.actualizaTela(null); Object.entries(coloresPiezas()).forEach(([n, c]) => V.colorTela(c, n)); } else W.postMessage({ tipo: 'sigue' }); pintaBarra3(); }, 'Mapa de ajuste: dónde tira la tela (rojo) y dónde va suelta (verde)'),
      b('✋ Tirar de la tela', st.tirar, () => { st.tirar = !st.tirar; pintaBarra3(); toast(st.tirar ? '✋ Coge la tela con el dedo o el ratón y tira: se estira como la de verdad' : 'Vuelves a girar la vista', 'ok', 4000); }, 'Coger la tela con el dedo o el ratón y estirarla'),
      b('🧍 Avatar', st.verAv, () => { st.verAv = !st.verAv; V.verAvatar(st.verAv); pintaBarra3(); }, 'Ver u ocultar el avatar'),
      b('↻ Girar', V.gira, () => { V.gira = !V.gira; pintaBarra3(); }, 'Que gire sola, como en un escaparate')),
      g3('Cámara', b('Frente', false, () => V.vista('frente')), b('Lado', false, () => V.vista('izq')), b('Espalda', false, () => V.vista('espalda')),
      b('⛶ Grande', st.solo === '3d', () => soloVista('3d'), 'Ver el 3D en grande (el patrón se esconde; vuelve con el mismo botón)'),
      b('📸', false, () => { const u = V.foto(1600, 2000); descarga(dataURLaBlob(u), limpio(st.P.nombre) + '_3d.png'); toast('📸 Foto guardada en Descargas', 'ok'); }, 'Guardar una foto del 3D (PNG)')));
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
    const g2 = (t, ...L) => h('span.dw-bg', { title: t, role: 'group', 'aria-label': t }, ...L); // (18-10: herramientas · ayudas · vista)
    mount(barra2, h('span.tit', 'Patrón 2D'), g2('Herramientas', b('↖ Elegir', 'elegir', 'Tocar una pieza la elige; arrastrarla la mueve. Arrastra un punto o un tirador para cambiar la forma'),
      b('＋ Punto', 'anadir', 'Toca un borde de la pieza elegida para poner un punto'), b('－ Punto', 'quitar', 'Toca un punto para quitarlo'),       b('⌒ Curva', 'curva', 'Toca un tramo para pasarlo de recto a curvo (y al revés)'), b('📏 Medir', 'medir', 'Dos toques: la distancia en cm'),
      b('⊥ Piquete', 'piquete', 'Toca un borde: pone un piquete ahí y su pareja en la pieza con la que se cose (P). Toca uno que ya está para quitarlo')),
      g2('Ayudas', botonBarra('🧲 Imán', !!ctx.iman, iman, 'Imán: al arrastrar, los puntos caen en la cuadrícula de 5 mm (I). Mayús mientras arrastras = recto'), botonBarra('📐 Medidas', !!ctx.cotas, cotas, 'El largo de cada borde escrito en las piezas (K)')),
      g2('Vista', botonBarra('⊕ Acercar', false, () => ED.zoom(1 / 1.4), 'Acercar (también: pellizcar con dos dedos o la rueda del ratón)'), botonBarra('⊖ Alejar', false, () => ED.zoom(1.4), 'Alejar'),
      botonBarra('⤢ Encajar', false, () => (st.sel ? ED.encuadraPieza(st.sel) : ED.encuadra()), 'Encajar: la pieza elegida o, sin elegir, todas (F)'), botonBarra('⛶ Grande', st.solo === '2d', () => soloVista('2d'), 'Ver el patrón en grande (el 3D se esconde; vuelve con el mismo botón)')));
    pintaAyuda2();
  }

  // ---------- la ficha de la pieza elegida (en el 2D) ----------
  function pintaFicha() {
    const P = st.P, pz = st.sel && P.prenda && P.prenda.piezas.find(p => p.nombre === st.sel); if (!pz) { ficha.style.display = 'none'; return; }
    if (st.fichaMini === undefined && fichaEstrecha()) st.fichaMini = true;
    const D = Z.datos(pz), cos = (P.prenda.costuras || []).filter(c => c.a.pieza === pz.id || c.b.pieza === pz.id), R = st.V && st.V.costuras || [];
    const corte = pz.corte.doblez ? 'Cortar ' + (pz.corte.n || 1) + ' al doblez' : pz.corte.espejo ? 'Cortar ' + (pz.corte.n || 2) + ' (una en espejo)' : 'Cortar ' + (pz.corte.n || 1);
    // (16-10) medidas ESCRITAS: mover el punto elegido tantos cm (→ y ↑) y el largo exacto de un borde recto
    const pt = ctx.sel && ctx.sel.pieza === pz.id && ctx.sel.punto && pz.puntos[ctx.sel.punto], cmIn = (ph, title) => h('input.dw-ficha-cm', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: ph, title }); /* (texto: así vale la coma, «0,5») */
    const mueve = pt ? (() => { const ix = cmIn('0', 'Hacia la derecha (+) o la izquierda (−), en cm'), iy = cmIn('0', 'Hacia arriba (+) o abajo (−), en cm'), va = () => { const dx = Math.round(Number(String(ix.value || 0).replace(',', '.')) * 10), dy = Math.round(Number(String(iy.value || 0).replace(',', '.')) * 10); if (!dx && !dy) return toast('Escribe cuántos cm moverlo', 'info'); edita({ op: 'muevePunto', pieza: pz.nombre, args: { punto: ctx.sel.punto, dx, dy } }, 'Mover «' + pt.n + '» ' + G.cm(dx) + ' / ' + G.cm(dy) + ' cm'); };
      [ix, iy].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') va(); }));
      return h('div.dw-ficha-pt', h('div', h('b', '● ' + pt.n), h('small', ' en (' + G.cm(pt.x) + ', ' + G.cm(pt.y) + ') cm')), h('div.dw-ficha-mueve', h('label', '→', ix), h('label', '↑', iy), h('span.u', 'cm'), btn('Mover', va, { cls: 'ghost sm' }))); })() : null;
    const Bsel = ctx.sel && ctx.sel.pieza === pz.id && ctx.sel.borde && pz.bordes.find(b => b.id === ctx.sel.borde);
    const mueveBorde = !Bsel ? null : Bsel.tipo === 'doblez' ? h('div.dw-ayuda', 'El doblez no se mueve: es el centro de la pieza.') : (() => {
      const par = parejasDe(P.prenda, pz, Bsel.id), chk = h('input', { type: 'checkbox', checked: true }), ent = cmIn('1', 'Cuántos cm: hacia fuera (+) o hacia dentro (−)');
      const va = cm => { if (!cm) return toast('Escribe cuántos cm', 'info'); const E = desplazaBorde(pz, Bsel.id, cm * 10); if (chk.checked) par.forEach(x => E.push(...desplazaBorde(x.pz, x.borde, cm * 10)));
        edita(E, (cm > 0 ? 'Sacar ' : 'Meter ') + '«' + Bsel.n + '» ' + String(Math.abs(cm)).replace('.', ',') + ' cm' + (chk.checked && par.length ? ' (y su pareja)' : '')); };
      ent.addEventListener('keydown', e => { if (e.key === 'Enter') va(Number(String(ent.value || 0).replace(',', '.'))); });
      return h('div.dw-ficha-borde', h('div', h('b', '▬ Mover «' + Bsel.n + '» entero'), h('small', ' hacia fuera = más grande (alargar el bajo, ensanchar el costado); hacia dentro = más pequeño')),
        h('div.dw-ficha-bbtns', [-1, -0.5, 0.5, 1].map(v => btn((v > 0 ? '+' : '−') + String(Math.abs(v)).replace('.', ',') + ' cm', () => va(v), { cls: 'ghost sm' })), ent, btn('Mover', () => va(Number(String(ent.value || 0).replace(',', '.'))), { cls: 'ghost sm' })),
        par.length ? h('label.dw-ficha-par', chk, ' lo mismo en su pareja: ' + par.map(x => '«' + x.n + '» de ' + x.pz.nombre).join(', ')) : null); })();
    const recto = B => { const b = pz.bordes.find(x => x.id === B.id); return b && b.tramos.length === 1 && !(Z.tramoPorId(pz, b.tramos[0]) || {}).c1; };
    const largoIn = B => h('input.dw-ficha-cm.dw-ficha-largo', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(Math.round(B.largo) / 10).replace('.', ','), title: 'Escribe el largo exacto (cm): se mueve la punta final del borde', onchange: e => { const mm = Math.round(Number(String(e.target.value).replace(',', '.')) * 10); if (!(mm > 5)) { e.target.value = String(Math.round(B.largo) / 10).replace('.', ','); return toast('Un largo en cm, mayor que 0,5', 'bad'); } edita({ op: 'largoBorde', pieza: pz.nombre, args: { borde: B.id, mm } }, 'Largo de «' + B.n + '» a ' + G.cm(mm) + ' cm'); } });
    mount(ficha, h('button.dw-x', { onclick: () => elige(null), title: 'Cerrar' }, '✕'), h('button.dw-x.dw-mini', { onclick: () => { st.fichaMini = !st.fichaMini; ficha.classList.toggle('mini', st.fichaMini); pintaFicha(); }, title: st.fichaMini ? 'Abrir la ficha' : 'Encoger la ficha (ver el patrón)' }, st.fichaMini ? '▴' : '▾'), h('h4', { onclick: () => { if (st.fichaMini) { st.fichaMini = false; ficha.classList.remove('mini'); pintaFicha(); } } }, pz.nombre), h('div.dw-ayuda', { style: { margin: '0 0 6px' } }, corte + ' · ' + G.cm(D.ancho) + ' × ' + G.cm(D.alto) + ' cm · ' + (Math.abs(D.area) / 100).toFixed(0) + ' cm²'), mueve,
      h('div', { style: { fontWeight: 700, fontSize: '12px', margin: '6px 0 2px' } }, 'Bordes y márgenes de costura'),
      mueveBorde, D.bordes.map(B => h('div.dw-fila.dw-fila-borde' + (Bsel && Bsel.id === B.id ? '.on' : ''), { title: 'Toca para elegir este borde (se ve en el patrón y se puede mover entero)', onclick: e => { if (e.target.closest('input, select, button')) return; elige(pz.nombre, { pieza: pz.id, borde: B.id }); } }, h('label', B.n, recto(B) ? h('small.dw-ficha-l', largoIn(B), ' cm · ') : null, h('small', (recto(B) ? '' : G.cm(B.largo, 1) + ' cm · ') + ({ costura: 'se cose', bajo: 'bajo', remate: 'remate', doblez: 'al doblez', abierto: 'abierto', aplicado: 'pespunteado encima' }[B.tipo] || B.tipo))),
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
    ficha.classList.toggle('mini', !!st.fichaMini); ficha.style.display = '';
  }
  // (17-10, iPad) si el patrón es estrecho (tablet, 3D al lado), la ficha sale ENCOGIDA: si no, tapa la pieza que se está tocando
  const fichaEstrecha = () => { const r = ven2.getBoundingClientRect(); return r.width > 0 && r.width < 640; };

  // ---------- la barra de abajo ----------
  function pintaPie() {
    const P = st.P; if (!P) return; const V2 = st.V, e = V2 && ESTADOS[V2.estado], d = st.est3d, T = st.errorPrenda ? null : tallaPrenda();
    const ab = d ? d.abiertas.filter(a => a.max > 6) : null;
    mount(pie, st.errorPrenda ? h('span.dw-est.borrador', '⚠️ ' + st.errorPrenda) : e ? h('span.dw-est.' + V2.estado, { title: e.d }, e.t) : null,
      V2 ? h('span', V2.E.length ? h('span.dw-mal', V2.E.length + ' error(es) · ') : null, V2.A.length ? h('span.dw-ojo', V2.A.length + ' aviso(s)') : h('span.dw-ok', 'sin avisos')) : null,
      h('span', '3D: ', !st.avatarOk ? 'preparando el avatar…' : !st.topo ? 'cosiendo…' : !st.cosida ? h('b', '🪡 cosiendo') : st.quieta ? h('span.dw-ok', '✔ colocada') : h('b', '🍃 cayendo')),
      ab ? h('span', ab.length ? h('span.dw-ojo', '🧵 ' + ab.length + ' costura(s) sin cerrar del todo') : h('span.dw-ok', '🧵 costuras cerradas')) : null,
      d && d.dentro && d.dentro.n ? h('span.dw-ojo', '⚠️ ' + d.dentro.n + ' punto(s) de tela dentro del cuerpo') : null,
      T ? h('span.dw-talla-pie', { title: 'Le va a un ' + T.clave + ' de ' + T.desde + ' a ' + T.hasta + ' cm (tabla de ' + T.tabla + ')' }, '📏 Talla ' + T.texto) : null,
      h('span', { style: { marginLeft: 'auto', color: 'var(--muted)' } }, 'La comprobación geométrica no sustituye una prueba con tela.'));
    chipTalla.textContent = T ? '📏 ' + T.texto : ''; chipTalla.style.display = T ? '' : 'none';
    if (st.avatarOk && st.cosida) aviso3.style.display = 'none';
  }

  // ---------- la biblioteca (izquierda) ----------
  const PEST = [['prenda', '👗', 'Prenda'], ['avatar', '🧍', 'Avatar'], ['tela', '🧵', 'Tela'], ['foto', '📷', 'Foto'], ['exportar', '⬇', 'Exportar']];
  function pintaPestanas() { if (st.facil) return mount(pestanas, h('button.on', { type: 'button', role: 'tab', 'aria-selected': 'true', title: 'Modo fácil' }, h('b', '🧸'), 'Fácil'), h('button.dw-facil-salir', { type: 'button', title: 'Volver al modo completo (con el patrón 2D y todas las herramientas)', onclick: () => ponFacil(false) }, h('b', '🧑‍🎨'), 'Completo'));
    mount(pestanas, PEST.map(([k, e, t]) => h('button' + (st.pest === k && !st.plegado ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': st.pest === k ? 'true' : 'false', onclick: () => { st.pest = k; if (st.plegado) plega(false); pintaPestanas(); pintaPanel(); } }, h('b', e), t)),
    h('button.dw-plegar', { type: 'button', title: st.plegado ? 'Abrir la biblioteca' : 'Plegar la biblioteca: más sitio para el 3D y el patrón', 'aria-label': st.plegado ? 'Abrir la biblioteca' : 'Plegar la biblioteca', onclick: () => plega(!st.plegado) }, h('b', st.plegado ? '»' : '«'), st.plegado ? 'Abrir' : 'Plegar')); }
  function pintaPanel() { if (st.facil) return mount(panel, panelFacil()); const f = { prenda: panelPrenda, avatar: panelAvatar, tela: panelTela, foto: panelFoto, exportar: panelExportar }[st.pest]; mount(panel, f()); }
  const irA = k => { st.pest = k; pintaPestanas(); pintaPanel(); };
  // 📷 FOTO (drew/calibra_ui.js): qué foto sirve, MEDIR con una foto calibrada con un folio A4 (y llevar la medida a la prenda), calibrar la IMPRESORA
  function panelFoto() { return CU.panelFoto(opFoto()); }
  // (16-10) 👗 lo que trae «Crear el patrón» desde la foto (drew/foto/desde_foto.js aProyecto): una prenda NUEVA con la plantilla, sus opciones
  // y cada medida con su estado (vista / supuesta / por confirmar), el avatar de ahora y sin «calcular para el avatar» (las medidas son las de
  // la prenda de la foto). Si la prenda abierta ya salió de esa misma foto, se ACTUALIZA (Ctrl+Z lo deshace) y se respetan sus cambios a mano.
  function deFoto(A) {
    const mismo = !!(st.P && st.P.deFoto && st.P.deFoto.id === A.deFoto.id);
    const pon = P => { Object.assign(P, { k: A.k, opciones: Object.assign(BL.opcionesPorDefecto(A.k), A.opciones), autoAjuste: false, medidas: JSON.parse(JSON.stringify(A.medidas)), deFoto: A.deFoto, diseno: null });
      // (17-10) la FOTO DE PRODUCTO trae también el color de la prenda y su estampado del pecho (recortado, con fondo transparente)
      if (A.color && /^#[0-9a-f]{6}$/i.test(A.color)) { P.tela = P.tela || { def: null, porPieza: {} }; P.tela.color = A.color; P.tela.colorPieza = {}; }
      if (A.estampado) { const E = A.estampado, datos = E.url || rgbaAPng(E.rgba, E.pw, E.ph), img = 'im' + Date.now().toString(36); P.imagenes = (P.imagenes || []).filter(i => !(i.tipo === 'estampado' && i.deFoto)).concat([{ id: img, datos, tipo: 'estampado', deFoto: true }]);
        P.estampados = (P.estampados || []).filter(x => !x.deFoto).concat([{ id: 'es' + img, img, pieza: E.pieza, x: E.x, yc: E.yc, y: E.y, w: E.w, h: E.h, nombre: 'Estampado de la foto', deFoto: true }]); } };
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
  // (17-10) + la COPIA EXACTA de una foto de producto: crea la prenda como «desde una foto» (con su color y su estampado); cuerpo(k, ajuste) = las
  // medidas de esa prenda en el avatar con esa holgura (de ahí sale la escala «a mi talla»)
  const desdeImagen = () => IU.abre({ crear: deImagen, listo: () => !!st.niveles, crearExacta: A => deFoto(A),
    cuerpo: (k, ajuste) => TA.medidasPrenda(k, cuerpoParaPrenda(st.P.avatar.med, st.niveles), { ajuste, manga: 'larga' }) });
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
  // (17-10) 🧩 MONTA TU SUDADERA: tarjetas de piezas que se arrastran al 3D o al patrón (o se tocan)
  function ponPiezaSud(k, v) { const P = st.P, G2 = PZU.GRUPOS.find(g => g[0] === k), op = G2 && G2[2].find(x => x[0] === v); if (!op || P.k !== 'sudadera' || P.opciones[k] === v) return;
    const auto = !P.nombre || P.nombre === 'Prenda' || P.nombre === BL.BLOQUES.sudadera.t || P.nombre === PZU.nombreSudadera(P.opciones); // (el nombre, solo si no lo ha escrito ella)
    cambia(G2[1] + ': ' + op[1], () => { P.opciones[k] = v; if (auto) P.nombre = PZU.nombreSudadera(P.opciones); if (P.autoAjuste) ajustaAlAvatar(); }); if (!st.errorPrenda) toast('🧩 ' + G2[1] + ': ' + op[1].toLowerCase(), 'ok', 2200); }
  function montaSudadera() {
    const P = st.P, tarjeta = (k, v, t) => { const b = h('button.dw-ptile' + (P.opciones[k] === v ? '.on' : ''), { type: 'button', draggable: 'true', 'data-k': k, 'data-v': v, title: 'Arrástrala a la prenda o tócala', onclick: () => ponPiezaSud(k, v),
        ondragstart: e => { e.dataTransfer.setData(PZU.TIPO_ARRASTRE, k + ':' + v); e.dataTransfer.setData('text/plain', t); e.dataTransfer.effectAllowed = 'copy'; document.body.classList.add('dw-arrastrando'); }, ondragend: () => document.body.classList.remove('dw-arrastrando') });
      b.innerHTML = PZU.icono(k, v); b.append(h('span', t)); return b; };
    return [h('h3', '🧩 Monta tu sudadera'), h('div.dw-ayuda', 'Arrastra una pieza a la prenda (al 3D o al patrón) o tócala: se cambia y se vuelve a coser. Ctrl+Z la deshace.'),
      h('div.dw-piezas', PZU.GRUPOS.map(([k, t, ops]) => h('div.dw-pgrupo', h('b', t), h('div.dw-ptiles', ops.map(([v, tt]) => tarjeta(k, v, tt))))))];
  }
  // 17-10-2026 · 📏 TALLA: qué talla sale (y a qué cuerpo le va) y hacerla en otra talla con un toque
  function seccionTalla() {
    const P = st.P, A = P.avatar, T = tallaPrenda(), tabla = TA.TABLAS[A.sexo] || TA.TABLAS.mujer, cm = x => String(x).replace('.', ','), aMano = !P.autoAjuste;
    return h('div.dw-sec-talla', h('h3', '📏 Talla'),
      T ? h('div.dw-talla-txt', h('b', 'Sale una talla ' + T.texto + ' de ' + T.tabla), h('span', ' · le va a un ' + T.clave + ' de ' + cm(T.desde) + ' a ' + cm(T.hasta) + ' cm (la prenda mide ' + cm(T.prenda) + ' cm de ' + T.clave + ' con el ajuste «' + (TA.AJUSTES[P.ajuste] || 'Normal').toLowerCase() + '»).'))
        : h('div.dw-ayuda', 'Pon las medidas de la prenda para saber su talla.'),
      h('div.dw-ayuda', aMano ? 'Esta prenda va a medida (de la foto o escrita a mano): tocando una talla, el avatar se pone en esa talla para ver cómo le queda. Para rehacerla en esa talla, marca abajo «Calcularlas para el cuerpo del avatar».' : 'Hacerla en otra talla (el avatar se pone en esa talla y la prenda se recalcula):'),
      h('div.dw-chips', tabla.tallas.map(X => h('button.dw-chip' + (T && T.t === X.t ? '.on' : ''), { type: 'button', 'data-talla': X.t, onclick: () => hazTalla(X) }, X.t))));
  }
  function hazTalla(X) { const A = st.P.avatar; if (A.via === 'talla' && A.talla === X.t) return;
    cambia('Prenda en talla ' + X.t, () => { A.med = desdeTabla(A.sexo, X.v); A.via = 'talla'; A.talla = X.t; delete A.musculo; delete A.cuerpo; }, { avatar: true }); toast('📏 Talla ' + X.t + ': ajustando el avatar y la prenda…', 'ok', 2500); }
  // ---------- 17-10 noche · 📚 CATÁLOGO DE MODELOS (hechos con SUS planos de NOORKO1) y 🏷️ SU MARCA ----------
  // su carpeta NOORKO1 en el PC: se busca una vez; sin PC (móvil, iPad) los modelos salen igual, sin la miniatura de su plano
  function modeloPorId(id) { return MA.MODELOS.find(m => m.id === id) || DISENOS.find(d => d.id === id) || null; }
  function cargaMarca() { if (st.marca.mirada) return; st.marca.mirada = true;
    (async () => { const b = await MA.carpeta(); st.marca.base = (await MA.existe(b)) ? b : null; if (st.marca.base) { try { st.marca.disenos = await MA.imagenes(st.marca.base, ['DISEÑOS', 'LOGO'], 60); } catch (e) { st.marca.disenos = []; } }
      if (st.P && (st.pest === 'prenda' || st.pest === 'tela' || st.facil)) pintaPanel(); })(); }
  async function disenoAEstampado(d) { try { anadeEstampado(await MA.aDataUrl(d.ruta), { nombre: d.nombre, que: 'Tu diseño «' + d.nombre + '»' }); } catch (e) { toast('No puedo leer ese diseño: ' + e.message, 'bad', 6000); } }
  function catalogoModelos() {
    cargaMarca(); const P = st.P, g = st.grupoCat || 'basicos', base = st.marca.base, chico = P.avatar.sexo === 'hombre', q = (st.buscaCat || '').trim().toLowerCase();
    const sinTilde = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // (18-10: el buscador mira en TODOS los grupos)
    const L0 = q ? DISENOS.concat(MA.MODELOS).filter(m => sinTilde(m.t + ' ' + (m.d || '') + ' ' + (m.g || '')).includes(sinTilde(q))) : g === 'basicos' ? DISENOS : MA.MODELOS.filter(m => m.g === g), L = L0.filter(m => !(chico && m.para === 'mujer'));
    const tarjeta = m => { const b = h('button.dw-modelo' + (P.diseno === m.id ? '.on' : ''), { type: 'button', draggable: 'true', 'data-modelo': m.id, 'data-diseno': m.id, title: (m.d || '') + (m.para ? ' · pensado para mujer' : '') + ' · tócalo o arrástralo al avatar', onclick: () => aplicaDiseno(m),
        ondragstart: e => { e.dataTransfer.setData(TIPO_MODELO, m.id); e.dataTransfer.setData('text/plain', m.t); e.dataTransfer.effectAllowed = 'copy'; document.body.classList.add('dw-arrastrando'); }, ondragend: () => document.body.classList.remove('dw-arrastrando') });
      b.append(base && m.ref ? h('img', { src: MA.urlDe(MA.rutaPlano(base, m.ref)), alt: '', loading: 'lazy', draggable: 'false' }) : h('b.dw-modelo-e', m.e || '👗'), h('span', m.t)); if (m.para) b.append(h('i.dw-modelo-para', { title: 'Pensado para mujer' }, '♀')); return b; }; // (append(null) escribía «null» debajo de cada nombre)
    return [h('h3', '📚 Catálogo de modelos (' + (MA.MODELOS.length + DISENOS.length) + ')'),
      h('div.dw-ayuda', (base ? 'Hechos con tus planos de NOORKO1, en los colores de THE NOORKO. ' : '') + 'Tócalo o ARRÁSTRALO al avatar: sale en 3D a su medida y en su talla (chico o chica: el avatar).'),
      h('div.dw-busca-cat', h('input.inp', { type: 'search', placeholder: '🔎 Buscar: sudadera, crop, falda, vestido…', value: st.buscaCat || '', 'aria-label': 'Buscar modelo', oninput: e => { st.buscaCat = e.target.value; const c = e.target.selectionStart; pintaPanel(); const i = panel.querySelector('.dw-busca-cat input'); if (i) { i.focus(); try { i.setSelectionRange(c, c); } catch (x) { } } } })),
      q ? h('div.dw-ayuda', L.length ? L.length + ' modelo(s) con «' + st.buscaCat.trim() + '»' : 'Ningún modelo con «' + st.buscaCat.trim() + '»') : h('div.dw-chips.dw-grupos', [['basicos', '✨ Básicos']].concat(MA.GRUPOS).map(([k, t]) => h('button.dw-chip' + (g === k ? '.on' : ''), { type: 'button', 'data-grupo': k, onclick: () => { st.grupoCat = k; pintaPanel(); } }, t))),
      L.length < L0.length ? h('div.dw-ayuda.dw-solo-chica', '♀ ' + (L0.length - L.length) + ' modelo(s) de este grupo son de chica: salen con el avatar de chica.') : null,
      h('div.dw-modelos.dw-disenos', L.map(tarjeta))];
  }
  function panelPrenda() {
    const P = st.P, D = BL.BLOQUES[P.k];
    return [catalogoModelos(),
      btn('🌐 Desde una imagen (internet, revista…)', desdeImagen, { cls: 'ghost dw-desde-imagen', title: 'La IA del PC lee la prenda de la foto y hace su patrón a la medida de tu avatar' }),
      h('h3', 'Plantilla'), h('div.dw-plantillas', Object.values(BL.BLOQUES).map(B => h('button' + (B.k === P.k ? '.on' : ''), { type: 'button', onclick: () => cambiaPlantilla(B.k) }, h('b', B.e), B.t))),
      P.k === 'sudadera' ? montaSudadera() : null,
      seccionTalla(),
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
  function aplicaDiseno(Dz) { const P = st.P; if (Dz.para === 'mujer' && P.avatar.sexo === 'hombre') { toast('«' + Dz.t + '» es un modelo de chica: pon el avatar de chica (👩) para hacerlo.', 'bad', 6000); return; } cambia('Diseño «' + Dz.t + '»', () => { P.porPlantilla[P.k] = { medidas: P.medidas, ediciones: P.ediciones, opciones: P.opciones, disp: P.disp, tela: JSON.parse(JSON.stringify(P.tela)) };
      P.k = Dz.k; P.diseno = Dz.id; P.escala = Dz.escala || null; P.refPlano = Dz.ref || null; P.opciones = Object.assign(BL.opcionesPorDefecto(Dz.k), Dz.opciones); P.ajuste = Dz.ajuste; P.autoAjuste = true; P.ediciones = []; P.disp = {}; ctx.disp = P.disp; st.sel = null; P.nombre = Dz.t;
      P.medidas = {}; Object.entries(Dz.medidas || {}).forEach(([m, v]) => { P.medidas[m] = { v, origen: 'usuario', confianza: 1 }; }); P.tela = { def: Dz.tela, color: Dz.color, porPieza: {} }; ajustaAlAvatar(); }, { conservar: false });
    setTimeout(() => ED.encuadra(), 50); toast(Dz.e + ' ' + Dz.t + ': se está cosiendo en tu avatar…', 'ok', 4000); }
  function cambiaPlantilla(k) { const P = st.P; if (k === P.k) return; cambia('Plantilla ' + BL.BLOQUES[k].t, () => { P.porPlantilla[P.k] = { medidas: P.medidas, ediciones: P.ediciones, opciones: P.opciones, disp: P.disp, tela: JSON.parse(JSON.stringify(P.tela)) };
      const g = P.porPlantilla[k] || {}; P.k = k; P.escala = null; P.refPlano = null; P.medidas = g.medidas || {}; P.ediciones = g.ediciones || []; P.opciones = g.opciones || BL.opcionesPorDefecto(k); P.disp = g.disp || {}; ctx.disp = P.disp; st.sel = null; if (P.nombre === 'Prenda nueva' || Object.values(BL.BLOQUES).some(B => B.t === P.nombre)) P.nombre = BL.BLOQUES[k].t;
      // (16-10: cada prenda RECUERDA su tela y su color; la primera vez, los suyos de siempre: antes la organza de la falda pasaba a la sudadera)
      P.tela = g.tela ? JSON.parse(JSON.stringify(g.tela)) : { def: null, color: COLOR_DE[k] || '#5f7ea8', porPieza: {} }; if (P.autoAjuste) ajustaAlAvatar(); }, { conservar: false }); setTimeout(() => ED.encuadra(), 50); }
  function panelAvatar() {
    const P = st.P, A = P.avatar, M = st.med3d, campos = CAMPOS.filter(c => !(A.sexo === 'hombre' && c[0] === 'bajoPecho'));
    const ponMed = (med, via, que, extra) => cambia(que, () => { A.med = med; A.via = via; delete A.musculo; delete A.cuerpo; Object.assign(A, extra || {}); }, { avatar: true });
    // (17-10) 👥 la BIBLIOTECA DE CUERPOS: mujeres y hombres listos con un toque (con su peinado); 📥 el avatar de CLO 3D (.avs) a confirmar
    const ponCuerpo = C => { const X = CUE.cuerpo(C.id); ponMed(X.med, 'cuerpo', C.t, { sexo: X.sexo, talla: X.talla, musculo: X.musculo, pelo: X.pelo, cuerpo: C.id }); };
    const biblioteca = h('div.dw-cbib', CUE.CUERPOS.map(C => { const b = h('button.dw-cbib-c' + (A.via === 'cuerpo' && A.cuerpo === C.id ? '.on' : ''), { type: 'button', 'data-cuerpo': C.id, title: C.t + ' · ' + C.d, onclick: () => ponCuerpo(C) }); b.innerHTML = CUE.dibujo(C); b.append(h('b', C.t), h('small', C.d)); return b; }));
    const desdeCLO = () => { const i = h('input', { type: 'file', accept: '.avs', style: { display: 'none' }, onchange: async e => { const f = e.target.files[0]; i.remove(); if (!f) return; const L = CUE.leeAvs(await f.arrayBuffer());
        if (!L) return toast('No he podido leer ese archivo de CLO (.avs).', 'bad', 8000); confirmaCLO(L, f.name); } }); document.body.append(i); i.click(); };
    const confirmaCLO = (L, nombre) => { const sexo = L.sexo || A.sexo, inp = k => h('input', { type: 'number', step: 0.5, value: L[k], 'data-clo': k }), F = { altura: inp('altura'), pecho: inp('pecho'), cintura: inp('cintura'), cadera: inp('cadera') };
      const m = modal('📥 Avatar de CLO 3D', h('div.dw-clo', h('div.dw-ayuda', 'He leído «' + nombre + '»' + (L.plantilla ? ' (plantilla ' + L.plantilla + ')' : '') + '. CLO no dice qué es cada número: esto es lo que he podido leer. CONFÍRMALO con tu cinta (o corrígelo) antes de usarlo; el resto de medidas sale de la talla más parecida.'),
        ['altura', 'pecho', 'cintura', 'cadera'].map(k => h('div.dw-fila', h('label', { altura: 'Altura', pecho: 'Pecho / busto', cintura: 'Cintura', cadera: 'Cadera' }[k]), h('span.dw-num', F[k], h('span.u', 'cm'))))),
        [btn('Cancelar', () => m.close(), { cls: 'ghost' }), btn('✔ Usar este avatar', () => { const o = Object.fromEntries(Object.entries(F).map(([k, x]) => [k, Number(String(x.value).replace(',', '.'))]));
          try { const X = CUE.desdeConfirmadas(sexo, o); m.close(); ponMed(X.med, 'clo', 'Avatar de CLO', { sexo, talla: X.talla, pelo: sexo === 'hombre' ? 'corto' : 'mono' }); toast('📥 Avatar de CLO puesto: ' + o.altura + ' cm · ' + o.pecho + '/' + o.cintura + '/' + o.cadera, 'ok', 6000); } catch (x) { toast(x.message, 'bad', 8000); } }, { cls: 'primary dw-clo-usar' })]); };
    const ponPelo = (estilo, color) => { st.hist.apunta(st.P, 'Pelo del avatar'); if (estilo) A.pelo = estilo; if (color) A.peloColor = color; V.ponPelo(CUE.peinadoDe(A), A.peloColor || 'igual'); W.postMessage({ tipo: 'pelo', estilo: CUE.peinadoDe(A) }); /* (18-10: la tela choca con el pelo) */ guarda(); pintaPanel(); };
    const altura = h('input', { type: 'number', min: 120, max: 215, step: 1, value: A.med.altura }), peso = h('input', { type: 'number', min: 30, max: 200, step: 0.5, value: A.peso || '' , placeholder: 'kg' });
    return [h('h3', '👥 Biblioteca de cuerpos'), h('div.dw-ayuda', 'Un toque y el avatar cambia: mujeres y hombres de varias alturas y tallas. Luego ajusta lo que quieras con la cinta.'), biblioteca,
      btn('📥 Avatar de CLO 3D (.avs)…', desdeCLO, { cls: 'ghost sm dw-clo-btn', title: 'Lee las medidas de un avatar guardado en CLO 3D (las confirmas antes de usarlas)' }),
      h('h3', 'Cuerpo'), h('div.dw-chips', [[true, '✨ Realista (premium)'], [false, '◻️ Maniquí sencillo']].map(([k, t]) => h('button.dw-chip' + ((A.realista !== false) === k ? '.on' : ''), { type: 'button', title: k ? 'Cuerpo humano de verdad (MakeHuman, uso comercial libre), a tus medidas' : 'Más rápido; mide igual de exacto', onclick: () => { if ((A.realista !== false) === k) return; cambia(t, () => { A.realista = k; }, { avatar: true }); } }, t))),
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
      h('h3', 'Aspecto'), h('div.dw-chips', Object.entries(PIELES).map(([k, [c, t]]) => h('button.dw-chip' + (A.piel === k ? '.on' : ''), { type: 'button', title: t, onclick: () => { A.piel = k; V.piel(k); guarda(); pintaPanel(); } }, h('span', { style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: c, marginRight: '5px', verticalAlign: '-1px', border: '1px solid var(--line-2)' } }), t))),
      h('h3', '💇 Pelo'), h('div.dw-chips', CUE.PEINADOS.map(([k, t]) => h('button.dw-chip' + (CUE.peinadoDe(A) === k ? '.on' : ''), { type: 'button', 'data-pelo': k, onclick: () => ponPelo(k) }, t))),
      h('div.dw-chips', { style: { marginTop: '6px' } }, CUE.COLORES_PELO.map(([k, t, c]) => h('button.dw-chip.dw-pelo-c' + ((A.peloColor || 'igual') === k ? '.on' : ''), { type: 'button', title: t, 'data-pelo-color': k, onclick: () => ponPelo(null, k) }, h('span', { style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: c, marginRight: '5px', verticalAlign: '-1px', border: '1px solid var(--line-2)' } }), t)))];
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
      h('h3', '🏷️ Paleta ' + MA.MARCA.nombre), h('div.dw-chips.dw-marca-pal', MA.MARCA.colores.map(c => h('button.dw-chip', { type: 'button', 'data-color': c.hex, title: c.t + ' · ' + c.uso + (pz ? ' (solo «' + pz + '»)' : ''), style: { width: '34px', height: '34px', padding: 0, background: c.hex, borderColor: (P.tela.color || '').toLowerCase() === c.hex.toLowerCase() ? 'var(--brand)' : 'var(--line-2)', borderWidth: '2px' }, onclick: () => ponColor(c.hex, pz || null) }))),
      h('div.dw-ayuda', 'Tu libro de marca: base Negro Carbón · detalles en Gris Acero · UN solo punto de rojo · cian para bordados mínimos · off-white para letras. ' + (pz ? 'Con «' + pz + '» elegida, el color va solo a esa pieza.' : 'Elige una pieza para darle otro color (puños, bolsillo…).')),
      h('h3', '🖼 Estampados'), h('div.dw-ayuda', 'Una imagen (mejor PNG con fondo transparente) o unas letras sobre una pieza. Se ven en el 3D, en el patrón y en el PDF. Las que vienen de una foto de producto ya salen recortadas.'),
      (() => { cargaMarca(); const L = st.marca.disenos || []; if (!st.marca.base || !L.length) return null;
        return h('div', h('div.dw-ayuda', '🎨 Tus diseños (NOORKO1): tócalo o arrástralo a la prenda.'), h('div.dw-misdisenos', L.map(d => { const b = h('button.dw-midiseno', { type: 'button', draggable: 'true', title: d.nombre, 'data-ruta': d.ruta, onclick: () => disenoAEstampado(d),
          ondragstart: e => { e.dataTransfer.setData(TIPO_DISENO, JSON.stringify({ ruta: d.ruta, nombre: d.nombre })); e.dataTransfer.setData('text/plain', d.nombre); e.dataTransfer.effectAllowed = 'copy'; document.body.classList.add('dw-arrastrando'); }, ondragend: () => document.body.classList.remove('dw-arrastrando') });
          b.append(h('img', { src: MA.urlDe(d.ruta), alt: '', loading: 'lazy', draggable: 'false' })); return b; }))); })(),
      h('div.dw-ests', (P.estampados || []).map((E, i) => { const mueve = (dx, dy, k) => cambiaEst(k ? 'Tamaño del estampado' : 'Mover el estampado', () => { const x = st.P.estampados[i]; if (k) { x.w = Math.max(10, Math.round(x.w * k)); x.h = Math.max(10, Math.round(x.h * k)); } else { x.x += dx; if (x.yc != null) x.yc -= dy; else x.y += dy; } });
        // (17-10 noche) las medidas de SU libro de marca: espalda 40 × 50, pecho 30 × 30, logo de pecho izquierdo 12 × 12 (cabe entero, sin deformarse)
        const deMarca = h('div.dw-chips.dw-estam-marca', MA.MARCA.estampados.map(Mm => h('button.dw-chip', { type: 'button', 'data-medida': Mm.k, title: 'Como en tu libro de marca: ' + Mm.t, onclick: () => colocaDeMarca(i, Mm) }, Mm.t)));
        return h('div.dw-estam', { 'data-est': E.id }, h('img', { src: estUrl(E), alt: '' }), h('div.dw-estam-t', h('b', E.nombre || 'Estampado ' + (i + 1)), h('small', E.pieza + ' · ' + G.cm(E.w) + ' × ' + G.cm(E.h) + ' cm'), deMarca),
          h('div.dw-estam-b', [['◀', 'Mover 1 cm a la izquierda', () => mueve(-10, 0)], ['▲', 'Subir 1 cm', () => mueve(0, 10)], ['▼', 'Bajar 1 cm', () => mueve(0, -10)], ['▶', 'Mover 1 cm a la derecha', () => mueve(10, 0)], ['−', 'Más pequeño', () => mueve(0, 0, 0.9)], ['+', 'Más grande', () => mueve(0, 0, 1.1)], ['✕', 'Quitar el estampado', () => cambiaEst('Quitar estampado', () => { st.P.estampados.splice(i, 1); })]]
            .map(([t, ti, f]) => h('button.dw-estam-bt', { type: 'button', title: ti, 'aria-label': ti, onclick: f }, t)))); })),
      h('div.dw-chips', { style: { marginTop: '6px' } }, btn('🖼 Añadir una imagen…', () => { const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; i.remove(); if (!f) return; const r = new FileReader(); r.onload = () => anadeEstampado(r.result, { nombre: f.name.replace(/\.[^.]+$/, '') }); r.readAsDataURL(f); } }); document.body.append(i); i.click(); }, { cls: 'ghost dw-est-img' })),
      (() => { const tx = h('input.dw-estam-txt', { type: 'text', placeholder: 'Escribe unas letras (p. ej. NOORKO)', maxlength: 40 }), co = h('input', { type: 'color', value: '#ffffff', title: 'Color de las letras' });
        return h('div.dw-chips', { style: { marginTop: '6px', alignItems: 'center' } }, tx, co, btn('Aa Estampar letras', () => { const t = tx.value.trim(); if (!t) return toast('Escribe primero las letras.', 'bad'); anadeEstampado(letrasAPng(t, co.value), { nombre: '«' + t + '»', que: 'Letras «' + t + '»' }); }, { cls: 'ghost dw-est-letras' })); })(),
      h('h3', '🌡 Mapa de ajuste'), h('div.dw-ayuda', 'En la barra del 3D, «🌡 Ajuste» pinta dónde tira la tela: verde = suelta, amarillo = justa (5 %), rojo = tira (10 % o más). Es lo que se estira la tela sobre el avatar, calculado en la simulación.')];
  }
  // ---------- 17-10 noche · 🧸 EL PANEL FÁCIL (5 pasos) ----------
  function ponCuerpoFacil(sexo, t) { const P = st.P, A = P.avatar, tabla = TA.TABLAS[sexo] || TA.TABLAS.mujer, X = tabla.tallas.find(x => x.t === t) || tabla.tallas.find(x => x.t === 'M') || tabla.tallas[2];
    if (A.sexo === sexo && A.via === 'talla' && A.talla === X.t) return; const cur = modeloPorId(P.diseno);
    cambia((sexo === 'hombre' ? 'Chico' : 'Chica') + ', talla ' + X.t, () => { A.sexo = sexo; A.med = desdeTabla(sexo, X.v); A.via = 'talla'; A.talla = X.t; delete A.musculo; delete A.cuerpo; }, { avatar: true });
    // (un modelo de chica no se queda puesto en un chico: se cambia por el más parecido del mismo grupo)
    if (sexo === 'hombre' && cur && cur.para === 'mujer') { const otro = MA.MODELOS.find(m => m.k === cur.k && m.g === cur.g && !m.para) || MA.MODELOS.find(m => m.k === cur.k && !m.para); if (otro) { aplicaDiseno(otro); toast('«' + cur.t + '» es de chica: para chico va «' + otro.t + '».', 'ok', 6000); } }
    else toast('📏 ' + (sexo === 'hombre' ? 'Chico' : 'Chica') + ', talla ' + X.t + ': ajustando el avatar y la prenda…', 'ok', 2500); }
  function panelFacil() {
    const P = st.P, A = P.avatar, T = st.errorPrenda ? null : tallaPrenda(), sexo = A.sexo === 'hombre' ? 'hombre' : 'mujer', tabla = TA.TABLAS[sexo], tAv = A.via === 'talla' ? A.talla : null;
    const paso = (n, t, ...c) => h('section.dw-fpaso', { 'data-paso': n }, h('h3.dw-fpaso-t', h('i', n), t), ...c);
    const ponColor = c => { P.tela.color = c; P.tela.colorPieza = {}; Object.entries(coloresPiezas()).forEach(([n, x]) => V.colorTela(x, n)); guarda(); pintaPanel(); };
    const col = (c, t) => h('button.dw-chip.dw-fcolor' + ((P.tela.color || '').toLowerCase() === c.toLowerCase() ? '.on' : ''), { type: 'button', 'data-color': c, title: t || c, style: { background: c }, onclick: () => ponColor(c) });
    cargaMarca(); const L = st.marca.disenos || [];
    return [h('div.dw-facil-cab', h('b', '🧸 Modo fácil'), h('span', 'Arrastra un modelo al avatar, elige la talla y el color, pon tus diseños y llévatela. Las tallas son de verdad.')),
      paso('1', '¿Para quién y qué talla?',
        h('div.dw-chips.dw-fsexo', [['mujer', '👩 Chica'], ['hombre', '👨 Chico']].map(([k, t]) => h('button.dw-chip' + (sexo === k ? '.on' : ''), { type: 'button', 'data-sexo': k, onclick: () => ponCuerpoFacil(k, tAv || 'M') }, t))),
        h('div.dw-chips.dw-ftallas', tabla.tallas.map(X => h('button.dw-chip' + (tAv === X.t ? '.on' : ''), { type: 'button', 'data-talla': X.t, onclick: () => ponCuerpoFacil(sexo, X.t) }, X.t))),
        h('div.dw-ayuda', A.via === 'talla' ? 'El avatar es una ' + (sexo === 'hombre' ? 'chico' : 'chica') + ' de talla ' + tAv + ' (tabla europea).' : 'El avatar va con sus propias medidas (las cambias en «Modo completo» → Avatar).', T ? h('b', ' La prenda sale una talla ' + T.texto + '.') : null)),
      paso('2', 'Elige la prenda', catalogoModelos()),
      paso('3', 'El color', h('div.dw-chips.dw-fcolores', MA.MARCA.colores.map(c => col(c.hex, c.t + ' · ' + c.uso)), COLORES.map(c => col(c)), h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(P.tela.color || '') ? P.tela.color : '#888888', title: 'Otro color', onchange: e => ponColor(e.target.value) }))),
      paso('4', 'Tus diseños', h('div.dw-ayuda', st.marca.base && L.length ? 'Toca uno o ARRÁSTRALO a la prenda. Luego elige dónde va: espalda, pecho o logo.' : 'Pon una imagen (mejor PNG sin fondo) y elige dónde va.'),
        st.marca.base && L.length ? h('div.dw-misdisenos', L.slice(0, 24).map(d => { const b = h('button.dw-midiseno', { type: 'button', draggable: 'true', title: d.nombre, 'data-ruta': d.ruta, onclick: () => disenoAEstampado(d),
          ondragstart: e => { e.dataTransfer.setData(TIPO_DISENO, JSON.stringify({ ruta: d.ruta, nombre: d.nombre })); e.dataTransfer.setData('text/plain', d.nombre); e.dataTransfer.effectAllowed = 'copy'; document.body.classList.add('dw-arrastrando'); }, ondragend: () => document.body.classList.remove('dw-arrastrando') });
          b.append(h('img', { src: MA.urlDe(d.ruta), alt: '', loading: 'lazy', draggable: 'false' })); return b; })) : null,
        btn('🖼 Poner una imagen…', () => { const i = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: e => { const f = e.target.files[0]; i.remove(); if (!f) return; const r = new FileReader(); r.onload = () => anadeEstampado(r.result, { nombre: f.name.replace(/\.[^.]+$/, '') }); r.readAsDataURL(f); } }); document.body.append(i); i.click(); }, { cls: 'ghost sm dw-fimagen' }),
        (P.estampados || []).map((E, i) => h('div.dw-festam', { 'data-est': E.id }, h('img', { src: estUrl(E), alt: '' }), h('div', h('b', E.nombre || 'Estampado'), h('small', E.pieza + ' · ' + G.cm(E.w) + ' × ' + G.cm(E.h) + ' cm'),
          h('div.dw-chips.dw-estam-marca', MA.MARCA.estampados.map(Mm => h('button.dw-chip', { type: 'button', 'data-medida': Mm.k, onclick: () => colocaDeMarca(i, Mm) }, Mm.t)), h('button.dw-chip', { type: 'button', title: 'Quitar', onclick: () => cambiaEst('Quitar estampado', () => { st.P.estampados.splice(i, 1); }) }, '✕')))))),
      paso('5', 'Llévatela', bloqueExportar())];
  }
  // un estampado a una de las medidas de su libro de marca (espalda 40 × 50, pecho 30 × 30, logo de pecho izquierdo 12 × 12), sin deformarlo
  function colocaDeMarca(i, Mm) { cambiaEst('Estampado: ' + Mm.t, () => { const x = st.P.estampados[i], ar = x.w / Math.max(1, x.h), w = Math.round(Math.min(Mm.w, Mm.h * ar)), hh = Math.round(w / ar);
    const pieza = Mm.pieza === 'espalda' ? piezaEspalda() : piezaDelantera();
    Object.assign(x, { pieza, w, h: hh, x: Mm.x || 0, yc: Math.round(Mm.yc0 + hh / 2) }); delete x.y; }); }
  // ---------- 📤 LAS DOS FORMAS DE EXPORTAR (ella: «PDF normal para imprimir y EXPORTACIÓN COMPLETA») + 🤖 el manual fácil ----------
  function estadoManual() { const P = st.P; if (!P || !P.prenda) return {}; const P0 = pasosMontaje(P.prenda, P.tiposCostura), M = P.manualIA, ok = !!(M && M.firma === MI.firma(P0) && M.pasos && M.pasos.length === P0.length);
    return { P0, ok, viejo: !!(M && !ok), n: P0.length, ia: !!(M && M.ia), M }; }
  function bloqueExportar() { const E = estadoManual();
    const tarjeta = (cls, ic, t, d, fn) => h('button.dw-exp.' + cls, { type: 'button', onclick: fn }, h('b.dw-exp-ic', ic), h('span', h('strong', t), h('small', d)));
    return h('div.dw-export', h('div.dw-export2',
        tarjeta('dw-exp-imprimir', '📄', 'PDF para imprimir', 'El patrón a tamaño real en hojas A4, con su manual. Se imprime al 100 %.', () => exporta('pdf')),
        tarjeta('dw-exp-completa', '📦', 'Exportación completa', 'Todo junto: el dossier A4 a todo color (ficha técnica, tallas XS–XXL, materiales, estampados, el patrón en mini y el manual), el PDF para imprimir, la ficha de fábrica, DXF, SVG, la foto 3D y el proyecto.', () => exportacionCompleta())),
      h('div.dw-manual-ia', h('div', h('b', '🤖 Manual fácil de costura'), ' ', E.ok ? h('span.dw-ok', '✔ listo (' + E.n + ' pasos, ' + (E.ia ? 'escrito con la IA y revisado' : 'sencillo') + '): va en la exportación completa') : E.viejo ? h('span.dw-ojo', '⚠️ la prenda ha cambiado: vuelve a hacerlo') : h('span.dw-ayuda', 'los pasos de costura explicados para quien empieza (con la IA de tu PC o sin ella).')),
        h('div.dw-chips', btn(E.ok ? '✏️ Revisarlo' : '✨ Hacer el manual fácil', () => manualFacil(), { cls: 'ghost sm dw-manual-btn' }), E.ok || E.viejo ? btn('Quitar', () => { st.hist.apunta(st.P, 'Quitar el manual fácil'); delete st.P.manualIA; guarda(); pintaPanel(); }, { cls: 'ghost sm dw-manual-quitar' }) : null))); }
  // el cuadro del manual: sale el SENCILLO (sin IA) para leerlo; «✨ Pedírselo a la IA» lo reescribe con la IA del PC; ella lo cambia y lo acepta
  async function manualFacil() {
    const P = st.P, E = estadoManual(); if (!E.P0) return; const P0 = E.P0, prev = E.ok ? E.M : null; let ia = !!(prev && prev.ia), modelo = prev ? prev.modelo || null : null, ctl = null;
    const cajas = P0.map((p, i) => h('textarea.dw-man-t', { rows: 3, 'data-paso': i, oninput: () => { cajas[i].dataset.mano = '1'; } }, prev ? prev.pasos[i] : MI.sencillo(p)));
    const estado = h('div.dw-ayuda.dw-man-estado', prev ? (prev.ia ? '🤖 Escrito con la IA de tu PC (' + (prev.modelo || 'local') + ') y revisado por ti.' : '📝 Manual sencillo (sin IA), revisado por ti.') : '📝 Este es el manual SENCILLO (sin IA). Léelo y cámbialo si quieres, o pulsa «✨ Pedírselo a la IA» para que lo reescriba la IA de tu PC.'), vivo = h('pre.dw-man-vivo', { style: { display: 'none' } });
    const bIA = btn('✨ Pedírselo a la IA', async () => { let S = null; try { const { localStatus } = await import('../ai/models.js'); S = await localStatus(); } catch (e) { S = null; }
      if (!S || !S.disponible || !S.modelo) { estado.textContent = '⚠️ La IA del PC no está lista' + (S && S.motivo ? ' (' + S.motivo + ')' : '') + '. Queda el manual sencillo: revísalo y úsalo.'; return; }
      bIA.disabled = true; estado.textContent = '✨ La IA de tu PC (' + S.modelo + ') está escribiendo el manual… puede tardar un minuto.'; vivo.style.display = ''; ctl = new AbortController();
      try { const R = await MI.escribe(P0, { chat: desktop.iaChat, modelo: S.modelo, prenda: { nombre: P.nombre, tela: ((TELAS[P.tela.def] || {}).t) || null }, onTexto: t => { vivo.textContent = t.slice(-300); }, signal: ctl.signal });
        R.pasos.forEach((t, i) => { cajas[i].value = t; delete cajas[i].dataset.mano; }); ia = true; modelo = S.modelo; estado.textContent = '🤖 Escrito por la IA de tu PC (' + S.modelo + '). LÉELO antes de usarlo: cambia lo que no te convenza.' + (R.avisos.length ? ' ⚠️ ' + R.avisos.join(' · ') : ''); }
      catch (e) { if (e && e.name === 'AbortError') return; estado.textContent = '⚠️ ' + (e.message || e) + ' Queda el manual sencillo: revísalo y úsalo.'; } finally { bIA.disabled = false; vivo.style.display = 'none'; ctl = null; } }, { cls: 'ghost dw-man-ia' });
    const m = modal('🤖 Manual fácil de costura · ' + (P.nombre || 'prenda'), h('div.dw-manual', estado, h('div.dw-chips', bIA, btn('📝 Volver al sencillo', () => { if (ctl) ctl.abort(); P0.forEach((p, i) => { cajas[i].value = MI.sencillo(p); }); ia = false; modelo = null; estado.textContent = '📝 Manual sencillo (sin IA).'; }, { cls: 'ghost sm' })), vivo,
        P0.map((p, i) => h('div.dw-man-paso', h('b', (i + 1) + '. ' + (p.titulo || 'Paso ' + (i + 1))), h('details', h('summary', 'Ver el paso original (de patronista)'), h('small', p.texto)), cajas[i]))),
      [btn('Cancelar', () => { if (ctl) ctl.abort(); m.close(); }, { cls: 'ghost' }), btn('✔ Usar este manual', () => { const T2 = cajas.map(c => c.value.replace(/\s+/g, ' ').trim()); const vacio = T2.findIndex(t => t.length < 10); if (vacio >= 0) return toast('El paso ' + (vacio + 1) + ' está vacío.', 'bad');
        st.hist.apunta(st.P, 'Manual fácil'); st.P.manualIA = { firma: MI.firma(P0), pasos: T2, ia, modelo, fecha: new Date().toISOString() }; guarda(); m.close(); toast('🤖 Manual listo: va en la exportación completa.', 'ok', 4000); pintaPanel(); }, { cls: 'primary dw-man-usar' })], { size: 'wide' });
    return m; }
  // las fotos del 3D (delante y detrás), encuadradas a la PRENDA, en JPEG; la cámara vuelve como estaba
  const aJpgDe = (src, w, hh, fondo = '#ffffff') => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w || im.naturalWidth; c.height = hh || im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = fondo; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); res({ jpg: a, w: c.width, h: c.height }); }; im.onerror = () => res(null); im.src = src; });
  async function fotosPrenda() { const cam = V.cam.position.clone(), tgt = V.ctl.target.clone(), gira = V.gira; V.gira = false; let cerca = null, fotos = [];
    try { const B = new V.T.Box3().setFromObject(V.grupoTela); if (!B.isEmpty()) cerca = { y: (B.min.y + B.max.y) / 2, d: Math.max(B.max.y - B.min.y, (B.max.x - B.min.x) * 0.8) * 2.9 }; } catch (e) { cerca = null; }
    try { for (const vk of ['frente', 'espalda']) { V.vista(vk, cerca); const f = await aJpgDe(V.foto(600, 760), 600, 760); if (f) fotos.push(Object.assign(f, { t: vk === 'frente' ? 'Delante' : 'Detrás' })); } } catch (e) { fotos = []; }
    finally { V.cam.position.copy(cam); V.ctl.target.copy(tgt); V.ctl.update(); V.gira = gira; V.marca(); } return fotos; }
  // 📦 LA EXPORTACIÓN COMPLETA: el dossier A4 (drew/dossier_pdf.js) + el PDF para imprimir + la ficha de fábrica + DXF + SVG + foto 3D + proyecto.
  // En el PC, todo en UNA carpeta (Descargas\CelebriDREW\<prenda> <fecha>) que se abre sola; en el móvil o el iPad, el dossier y el PDF para imprimir.
  async function exportacionCompleta() {
    const P = st.P, pr = P.prenda, A = P.avatar || {}; if (!pr || st.exportando) return;
    if (!st.V || !st.V.ok) { if (!(await confirmDlg('El patrón tiene errores', 'Puedes exportarlo igualmente, pero revisa antes lo que sale en rojo.', 'Exportar igual'))) return; }
    st.exportando = true; toast('📦 Preparando la exportación completa (fotos del 3D, dossier, patrón, ficha de fábrica)…', 'info', 5000);
    try {
      const n = limpio(P.nombre), Fi = P.ficha || {}, E = estadoManual(), td = P.tela.def || (pr.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina'), T = tallaPrenda() || {};
      let empresa = 'CelebriDiseños'; try { const { S } = await import('../store.js'); empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || empresa; } catch (e) { }
      const marca = Fi.marca || (P.refPlano ? MA.MARCA.nombre : empresa), fotos = await fotosPrenda();
      const est = []; for (const Es of (P.estampados || [])) { const url = estUrl(Es); if (!url) continue; const j = await aJpgDe(url, null, null, /^#[0-9a-f]{6}$/i.test(P.tela.color || '') ? P.tela.color : '#3a3a3a'); est.push(Object.assign({ nombre: Es.nombre, pieza: Es.pieza, w: Es.w, h: Es.h, x: Es.x, yc: Es.yc }, j ? { jpg: j.jpg, pw: j.w, ph: j.h } : {})); }
      let plano = null; if (P.refPlano && st.marca.base) { try { plano = await MA.planoAJpg(MA.urlDe(MA.rutaPlano(st.marca.base, P.refPlano)), P.tela.color); } catch (e) { plano = null; } }
      const modelo = modeloPorId(P.diseno), cuerpo = (A.sexo === 'hombre' ? 'Chico' : 'Chica') + (A.via === 'talla' && A.talla ? ' talla ' + A.talla : '') + (A.med && A.med.pecho ? ' · pecho ' + A.med.pecho + ' cm' : '');
      const comun = { nombre: P.nombre, marca, ref: Fi.ref, coleccion: Fi.coleccion, temporada: Fi.temporada, sexo: A.sexo, talla: T.t || (A.via === 'talla' ? A.talla : null), pechoCuerpo: A.med && A.med.pecho, ajuste: P.ajuste, opciones: P.opciones, tela: { t: (TELAS[td] || {}).t || td, color: P.tela.color }, fotos, estampados: est, tipos: P.tiposCostura };
      const { pdfDossier } = await import('../drew/dossier_pdf.js'), { pdfFicha } = await import('../drew/ficha_pdf.js'), { pdfMontaje } = await import('../drew/pdf_montaje.js');
      const D = pdfDossier(Object.assign({}, pr, { nombre: P.nombre }), Object.assign({}, comun, { descripcion: modelo && modelo.d, cuerpo, plano, planoRef: P.refPlano, manual: E.ok ? E.M.pasos : null, manualIA: E.ok && E.ia }));
      const R1 = pdfMontaje(Object.assign({}, pr, { nombre: P.nombre, validacion: st.V ? ESTADOS[st.V.estado].t : '' }), { formato: 'a4', fotos, empresa, talla: T.texto || (A.via === 'talla' ? A.talla : null), cuerpo: A.med, tela: TELAS[td], tipos: P.tiposCostura });
      const R2 = pdfFicha(Object.assign({}, pr, { nombre: P.nombre }), comun), pdf = b => new Blob([b], { type: 'application/pdf' });
      const archivos = [[n + ' - 1 EXPORTACION COMPLETA.pdf', pdf(D.bytes)], [n + ' - 2 patron para imprimir A4.pdf', pdf(R1.bytes)], [n + ' - 3 ficha tecnica fabrica.pdf', pdf(R2.bytes)],
        [n + ' - 4 patron.dxf', new Blob([EX.dxf(pr)], { type: 'application/dxf' })], [n + ' - 5 patron tamano real.svg', new Blob([EX.svg(pr)], { type: 'image/svg+xml' })], [n + ' - 6 foto 3D.png', dataURLaBlob(V.foto(1600, 2000))], [n + '.drew.json', new Blob([EX.proyectoJSON(P)], { type: 'application/json' })]];
      let carpeta = null; if (desktop.on) { try { const I = await desktop.info(), b = String((I && I.backupDir) || ''), i = b.toLowerCase().indexOf('\\appdata\\'); if (i > 0) { const d = new Date(), f2 = x => String(x).padStart(2, '0');
          carpeta = b.slice(0, i) + '\\Downloads\\CelebriDREW\\' + n + ' ' + d.getFullYear() + '-' + f2(d.getMonth() + 1) + '-' + f2(d.getDate()) + ' ' + f2(d.getHours()) + 'h' + f2(d.getMinutes());
          for (const [nom, bl] of archivos) await desktop.save(carpeta + '\\' + nom, bl, true); } } catch (e) { console.warn('Exportación completa: no se pudo guardar en la carpeta', e); carpeta = null; } }
      if (!carpeta) { for (const [nom, bl] of (desktop.on ? archivos : archivos.slice(0, 2))) { descarga(bl, nom); await new Promise(r => setTimeout(r, 350)); } }
      window.__drew_completa = { paginas: D.paginas, archivos: archivos.map(a => a[0]), carpeta, fotos: fotos.length, plano: !!plano, estampados: est.length, manual: E.ok ? (E.ia ? 'ia' : 'sencillo') : 'montaje', bytes: D.bytes.length, marca }; window.__drew_dossierBytes = D.bytes;
      if (carpeta) { toast('📦 Exportación completa: ' + archivos.length + ' archivos en Descargas › CelebriDREW (el dossier tiene ' + D.paginas + ' páginas). Te abro la carpeta.', 'ok', 9000); try { await desktop.open(carpeta); } catch (e) { } }
      else toast('📦 Exportación completa en Descargas: el dossier (' + D.paginas + ' páginas) y el PDF para imprimir' + (desktop.on ? ' y el resto de archivos' : ' (en el PC sale todo junto en una carpeta)') + '.', 'ok', 9000);
    } catch (e) { toast('No se pudo hacer la exportación completa: ' + e.message, 'bad', 9000); console.error(e); }
    finally { st.exportando = false; }
  }
  function panelExportar() {
    const ok = st.V && st.V.ok, Fi = st.P.ficha || {}, campo = (k, t, ph) => h('div.dw-fila', h('label', t), h('input.dw-ficha-in', { type: 'text', value: Fi[k] || '', placeholder: ph, 'data-ficha': k, onchange: e => { st.P.ficha = Object.assign({}, st.P.ficha, { [k]: e.target.value.trim() }); guarda(); } }));
    return [h('h3', '📤 Exportar'), bloqueExportar(), h('h3', '🏭 Ficha técnica para fábrica'), h('div.dw-ayuda', 'Como tu plantilla de «tech pack»: portada, vistas, avíos y lista de materiales, estampados, tabla de medidas de XS a XXL (graduada), montaje, etiquetas y embalaje. Se rellena sola con la prenda.'),
      campo('marca', 'Marca', 'p. ej. NOORKO'), campo('ref', 'Referencia', 'p. ej. NK-SUD-001'), campo('coleccion', 'Colección', 'p. ej. Invierno 2026'),
      btn('🏭 Ficha técnica para fábrica (PDF)', () => fichaFabrica(), { cls: 'primary dw-ficha-pdf', title: 'El tech pack completo de esta prenda, en PDF apaisado' }),
      h('h3', 'Para hacer la prenda de verdad'), !ok ? h('div.dw-ayuda.dw-mal', 'El patrón tiene errores: arréglalos antes de imprimir.') : null,
      h('div', { style: { display: 'grid', gap: '6px' } },
        btn('📄 Patrón completo para imprimir en casa (A4)', () => exporta('pdf'), { cls: 'primary', title: 'Portada con el 3D y las medidas, piezas con sus medidas, montaje paso a paso, detalles y el patrón a tamaño real numerado' }), btn('🖨 Patrón completo en hoja grande (A0, copistería)', () => exporta('a0')), btn('📐 Solo el patrón (A4, sin manual)', () => exporta('patron')),
        btn('✏️ DXF (programas de patronaje y plóter)', () => exporta('dxf')), btn('🖼 SVG a tamaño real', () => exporta('svg')), btn('📋 Ficha técnica sencilla (página web)', () => exporta('ficha')),
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
  // (17-10) 🏭 la FICHA TÉCNICA PARA FÁBRICA (drew/ficha_pdf.js): con las fotos del 3D (delante y detrás) y los estampados en JPEG
  async function fichaFabrica() {
    const P = st.P, pr = P.prenda, A = P.avatar || {}; if (!pr) return; toast('🏭 Preparando la ficha técnica (fotos del 3D, materiales, tallas)…', 'info', 3000);
    const cam = V.cam.position.clone(), tgt = V.ctl.target.clone(), gira = V.gira; V.gira = false; let cerca = null; try { const B = new V.T.Box3().setFromObject(V.grupoTela); if (!B.isEmpty()) cerca = { y: (B.min.y + B.max.y) / 2, d: Math.max(B.max.y - B.min.y, (B.max.x - B.min.x) * 0.8) * 2.9 }; } catch (e) { cerca = null; }
    const aJpg = (src, w, h) => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w || im.naturalWidth; c.height = h || im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); res({ jpg: a, w: c.width, h: c.height }); }; im.onerror = () => res(null); im.src = src; });
    let fotos = []; try { for (const vk of ['frente', 'espalda']) { V.vista(vk, cerca); const f = await aJpg(V.foto(600, 760), 600, 760); if (f) fotos.push(Object.assign(f, { t: vk === 'frente' ? 'Delante' : 'Detrás' })); } } catch (e) { fotos = []; } finally { V.cam.position.copy(cam); V.ctl.target.copy(tgt); V.ctl.update(); V.gira = gira; V.marca(); }
    const est = []; for (const E of (P.estampados || [])) { const url = estUrl(E); if (!url) continue; const j = await aJpg(url); est.push(Object.assign({ nombre: E.nombre, pieza: E.pieza, w: E.w, h: E.h, x: E.x, yc: E.yc }, j ? { jpg: j.jpg, pw: j.w, ph: j.h } : {})); }
    let empresa = 'CelebriDiseños'; try { const { S } = await import('../store.js'); empresa = (S.cfg && S.cfg.empresa && S.cfg.empresa.nombre) || empresa; } catch (e) { }
    try { const { pdfFicha } = await import('../drew/ficha_pdf.js'), td = P.tela.def || (pr.tejido === 'punto' ? (P.k === 'sudadera' ? 'felpa' : 'punto') : P.k === 'pantalon' ? 'denim' : 'gabardina'), Fi = P.ficha || {};
      const R = pdfFicha(Object.assign({}, pr, { nombre: P.nombre }), { nombre: P.nombre, marca: Fi.marca || empresa, ref: Fi.ref, coleccion: Fi.coleccion, temporada: Fi.temporada, sexo: A.sexo, talla: (tallaPrenda() || {}).t || (A.via === 'talla' ? A.talla : null), pechoCuerpo: A.med && A.med.pecho, ajuste: P.ajuste, opciones: P.opciones, tela: { t: (TELAS[td] || {}).t || td, color: P.tela.color }, fotos, estampados: est, tipos: P.tiposCostura });
      descarga(new Blob([R.bytes], { type: 'application/pdf' }), limpio(P.nombre) + '_ficha_tecnica.pdf'); window.__drew_ficha = { paginas: R.paginas, tallas: R.tallas, base: R.base, fotos: fotos.length, estampados: est.length, bytes: R.bytes.length };
      toast('🏭 Ficha técnica en Descargas: ' + R.paginas + ' páginas, tallas ' + R.tallas[0] + '–' + R.tallas[R.tallas.length - 1] + ' (muestra ' + R.base + ').', 'ok', 8000); }
    catch (e) { toast('No se pudo hacer la ficha técnica: ' + e.message, 'bad', 8000); }
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
      const R = pdfMontaje(Object.assign({}, pr, { nombre: P.nombre, validacion: st.V ? ESTADOS[st.V.estado].t : '' }), { formato, fotos, empresa, talla: (tallaPrenda() || {}).texto || (A.via === 'talla' ? A.talla : null), cuerpo: A.med, tela: TELAS[td], tipos: P.tiposCostura });
      descarga(new Blob([R.bytes], { type: 'application/pdf' }), n + '_patron_completo_' + (formato === 'a0' ? 'A0' : 'A4') + '.pdf');
      window.__drew_pdf = { paginas: R.paginas, hojas: R.hojas, pasos: R.pasos, fotos: fotos.length, bytes: R.bytes.length }; window.__drew_pdfBytes = R.bytes; // (para las pruebas)
      toast('📄 Patrón completo en Descargas: ' + R.paginas + ' páginas (' + R.hojas + ' hoja' + (R.hojas > 1 ? 's' : '') + ' de patrón ' + (formato === 'a0' ? 'A0' : 'A4') + ', ' + R.pasos + ' pasos de montaje). Tela: ' + String(R.consumo.m.toFixed(2)).replace('.', ',') + ' m. Imprime al 100 %.', 'ok', 9000);
    } catch (e) { toast('No se pudo hacer el PDF: ' + e.message, 'bad', 8000); }
  }
  const dataURLaBlob = u => { const [a, b] = u.split(','), bin = atob(b), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: (/:(.*?);/.exec(a) || [])[1] || 'image/png' }); };
  // ATAJOS (ella: «atajos de letras»): con Ctrl, deshacer / rehacer / PDF; sin Ctrl, las herramientas (si no se está escribiendo en una casilla)
  const modo = m => { ctx.modo = m; ED.borraMedida(); pintaBarra2(); };
  const ATAJOS = [['E', 'Elegir y mover (2D)', () => modo('elegir')], ['A', 'Añadir un punto', () => modo('anadir')], ['Q', 'Quitar un punto', () => modo('quitar')], ['C', 'Recta ↔ curva', () => modo('curva')], ['M', 'Medir', () => modo('medir')],
    ['P', 'Poner o quitar un piquete (con su pareja)', () => modo('piquete')], ['I', 'Imán a la cuadrícula de 5 mm', () => iman()], ['K', 'Medidas en los bordes (2D)', () => cotas()], ['F', 'Ver todas las piezas (2D)', () => ED.encuadra()], ['S', 'Simular / pausar la tela', () => { st.pausa = !st.pausa; W.postMessage({ tipo: st.pausa ? 'pausa' : 'sigue' }); pintaBarra3(); }], ['R', 'Girar el maniquí', () => { V.gira = !V.gira; pintaBarra3(); }],
    ['1', 'Vista de frente', () => V.vista('frente')], ['2', 'Vista de lado', () => V.vista('izq')], ['3', 'Vista de espalda', () => V.vista('espalda')], ['V', 'Vídeo de 7 s para redes', () => video7()], ['Esc', 'Soltar la herramienta y la pieza', () => { modo('elegir'); elige(null); }], ['?', 'Ver los atajos', () => atajos()]];
  function atajos() { modal('⌨ Atajos de teclado', h('div', h('div.dw-atajos', ATAJOS.map(([k, t]) => h('div', h('kbd', k), h('span', t))), [['Ctrl Z', 'Deshacer'], ['Ctrl Y', 'Rehacer'], ['Ctrl P', 'Patrón completo en PDF'], ['Mayús', 'Arrastrar un punto en recto'], ['Rueda', 'Acercar / alejar (2D y 3D)'], ['2 dedos', 'iPad: pellizcar = acercar, arrastrar = mover']].map(([k, t]) => h('div', h('kbd', k), h('span', t)))), h('p.dw-ayuda', 'Las letras funcionan cuando no estás escribiendo en una casilla.')), null, { size: 'narrow' }); }
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
