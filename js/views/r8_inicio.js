// ================= v20 · 🏠 CelebriR8 · INICIO =================
// La puerta de entrada: qué quieres hacer hoy (una FIGURA desde una foto o un REPUESTO con medidas: no es lo mismo y aquí
// se explica), las herramientas por tareas, lo que hay DE VERDAD en este PC (nada se da por instalado sin mirarlo), los
// modelos recientes y dónde quedan los archivos. Y el acceso permanente a «Aprender a utilizar CelebriR8».
import { h, mount, btn, toast } from '../ui.js';
import * as E from '../r8/estado.js';
import * as HF from '../r8/hfclave.js';

export async function montarInicio(el, ext = {}) {
  const d = await import('../desktop.js').catch(() => null), D = d && d.desktop, pc = !!(D && D.on);
  const ir = k => ext.irA && ext.irA(k);
  const sis = h('div.r8i-sis'), rec = h('div.r8i-rec'), arch = h('div.r8i-arch');
  // v30 · 🎯 tu calibre y tu impresora: cómo están y el botón para hacerlo (sale de r8/calibracion.js)
  function calibreTarjeta() {
    const caja = h('div.r8i-cal');
    const pinta = async () => { let A = null, cal = null; try { const CPR = await import('../r8/calibracion.js'); A = CPR.activa(); cal = CPR.guardado().calibre; } catch (e) { }
      mount(caja, h('button.r8i-gran.r8i-calb' + (A ? '.hecho' : ''), { type: 'button', 'data-ir': 'calibrar', onclick: () => import('../r8/calibracion_ui.js').then(m => m.abrir({ alCerrar: pinta })) },
        h('span', '🎯'), h('b', 'Calibra tu calibre y tu impresora'),
        h('small', (cal ? (cal.ok ? '✅ Tu calibre mide bien (' + cal.fecha + '). ' : '⚠️ Tu calibre se desvía ' + String(Math.round(cal.off * 100) / 100).replace('.', ',') + ' mm: se descuenta solo. ') : '1) Tu CALIBRE: ciérralo y mide una moneda de 1 € o 2 €. ') + (A ? '✅ Impresora calibrada: «' + A.clave + '» (' + A.fecha + '): todo lo que mandas a Bambu sale corregido solo.' : '2) Tu IMPRESORA: imprime la probeta (33 min, 12 g), mídela y escribe las medidas: desde ese momento tus piezas salen corregidas solas.')),
        h('i', A ? 'Ver o repetir' : 'Empezar (5 minutos + imprimir)'))); };
    pinta(); return caja;
  }
  const tarjeta = (k, ic, t, txt, extra) => h('button.r8i-t', { type: 'button', 'data-ir': k, onclick: () => ir(k) }, h('span.r8i-ic', ic), h('div', h('b', t), h('small', txt), extra || null));
  const raiz = h('div.r8i',
    h('section.r8i-hero',
      h('div.r8i-hero-t', h('span.r8p-marca', 'CELEBRIR8 · ESTUDIO 30'), h('h1', 'Del boceto, la foto o la medida, a la pieza impresa'),
        h('p', 'Crea figuras desde fotos, diseña repuestos con medidas reales, repara modelos con Blender sin abrirlo y prepáralos para tu Bambu. Todo desde aquí, gratis y en tu PC.'),
        h('div.r8p-btns', btn('❓ Aprender a utilizar CelebriR8', () => ext.visita && ext.visita(), { cls: 'primary r8i-aprender' }), btn('🧭 Mi primer proyecto (5 min)', () => import('../r8/visita.js').then(V => V.primerProyecto({ ir: ext.irA })), { cls: 'r8i-primer' })))),
    h('div.r8i-cols',
      h('div.r8i-main',
        h('h2.r8p-h', '¿Qué quieres hacer hoy?'),
        h('div.r8i-dos',
          h('button.r8i-gran', { type: 'button', 'data-ir': 'lab', onclick: () => ir('lab') }, h('span', '🧸'), h('b', 'Una figura desde una foto'), h('small', 'Para decorar o regalar: una persona, una mascota, un personaje. La IA imagina la forma; importa que se PAREZCA. La parte de atrás la inventa: siempre se revisa.'), h('i', 'Smart Lab · Foto → 3D')),
          h('button.r8i-gran.rep', { type: 'button', 'data-ir': 'precision', onclick: () => ir('precision') }, h('span', '⚙️'), h('b', 'Un repuesto con medidas'), h('small', 'Para que ENCAJE: un engranaje, un casquillo, un soporte. Se construye con tus medidas de calibre, no con IA. Lo que no sepas, el programa te lo pide; nunca se lo inventa.'), h('i', 'Precision Lab'))),
        calibreTarjeta(), // v30 · «te olvidaste lo de mi calibre»: aquí, a la vista
        h('h2.r8p-h', 'Herramientas'),
        h('div.r8i-tools',
          tarjeta('lab', '🧪', 'Smart Lab', 'Prueba los motores de IA instalados uno a uno y te dice cuál ha salido mejor y por qué.'),
          tarjeta('foto', '🪄', 'Foto → 3D', 'Figura, relieve, litofanía o figura inflada desde una foto, con un motor que elijas tú.'),
          tarjeta('precision', '📏', 'Precision Lab', 'Engranajes (rectos, helicoidales, cremalleras, coronas) y repuestos con medidas.'),
          tarjeta('taller', '🛠️', 'Blender Workshop', 'Comprueba y repara un modelo; puedes deshacerlo y volver al original.'),
          tarjeta('doctor', '🩺', 'Print Doctor', 'Revisión antes de imprimir: paredes, piezas sueltas, orientación, soportes y 3MF para Bambu.'),
          tarjeta('estudio', '🧰', 'Estudio', 'Diseña con formas, bocetos y operaciones, como en Fusion.'),
          tarjeta('cajas', '📦', 'Taller de cajas', 'Bisagras, cierres, pomos y puertas que arrastras: verde donde va bien, rojo donde no.'),
          tarjeta('catalogo', '🛍️', 'Catálogo', 'Más de 80 diseños propios listos para cambiar medidas.'),
          tarjeta('fundas', '📱', 'Fundas', '39 móviles con sus medidas oficiales y kit de prueba.'),
          tarjeta('plantillas', '📐', 'Plantillas', 'Las de siempre: caja, nombre, molde, tapón, prueba de holgura…'))),
      h('aside.r8i-lado',
        h('section.r8i-caja', h('h2.r8p-h', 'Tu PC ahora'), sis),
        h('section.r8i-caja', h('div.r8i-ct', h('h2.r8p-h', 'Recientes'), h('small.muted', 'en este aparato')), rec),
        h('section.r8i-caja', h('div.r8i-ct', h('h2.r8p-h', 'Tus archivos')), arch))));
  el.appendChild(raiz);

  let hf = null; // v20.1 · Hugging Face en un paso (una sola caja: se mueve al repintar)
  const fila = (ok, t, det) => h('div.r8i-f' + (ok === true ? '.ok' : ok === false ? '.no' : ''), h('span', ok === true ? '✅' : ok === false ? '⚪' : '⏳'), h('div', h('b', t), det ? h('small', det) : null));
  function pintaSis() {
    const S = E.SIS;
    if (!S.listo) return mount(sis, fila(null, 'Mirando qué hay instalado…'));
    if (!S.pc) return mount(sis, h('p.small.muted', 'Estás fuera del programa del PC (móvil o navegador). Aquí funcionan el Estudio, el Catálogo, el Precision Lab y el Print Doctor básico. La IA de fotos y Blender están en el PC del taller.'));
    const M = id => S.motores.find(m => m.id === id) || {}, tr = S.nube.trellis2 || {}, t = S.tarjeta;
    mount(sis,
      fila(!!t, t ? t.nombre.replace('NVIDIA GeForce ', '') : 'Sin tarjeta NVIDIA', t ? (t.libre_mb / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' GB libres de ' + Math.round(t.total_mb / 1024) + ' (Bambu Studio y el navegador también la usan)' : 'Los motores de IA locales necesitan una tarjeta NVIDIA'),
      fila(!!M('triposr').listo, 'TripoSR', M('triposr').listo ? 'Instalado · rápido (unos 20 s)' : 'No instalado'),
      fila(!!M('triposg').listo, 'TripoSG', M('triposg').listo ? 'Instalado · la mejor forma (4–6 min en la GTX 1660)' : 'No instalado'),
      fila(!!M('sf3d').listo, 'Stable Fast 3D', M('sf3d').listo ? 'Instalado' : 'Falta bajar su modelo (necesita tu sesión de Hugging Face)'),
      fila(!!tr.sesion, 'TRELLIS.2 (nube gratis)', tr.sesion ? 'Sesión de Hugging Face lista · 1–2 figuras al día' : 'Falta entrar en Hugging Face'),
      fila(!!S.blender, 'Blender' + (S.blenderVer ? ' ' + S.blenderVer : ''), S.blender ? 'Se usa solo, en segundo plano' : 'No encontrado (se busca en Archivos de programa)'),
      fila(!!S.bambu, 'Bambu Studio', S.bambu ? 'Los 3MF se abren directamente en él' : 'No encontrado'),
      hf || (hf = HF.cajaHF({ alCambiar: () => E.sistema(true).catch(() => { }) })),
      !S.python || !M('triposr').listo || !M('triposg').listo ? btn(S.python ? '⬇️ Completar el motor 3D' : '⬇️ Instalar el motor 3D en este PC', () => instalador(), { cls: 'sm primary r8i-instalar' }) : btn('🔧 Revisar la instalación del motor 3D', () => instalador(), { cls: 'sm ghost r8i-instalar' }),
      h('small.muted', 'Comprobado ahora mismo en este PC. 💳 Lo de pago (Meshy) no se usa.'));
  }
  async function pintaRec() {
    const L = await E.recientes();
    if (!L.length) return mount(rec, h('p.small.muted', 'Aún no hay modelos. Lo que generes, repares o diseñes en Precisión aparecerá aquí, aunque cierres el programa.'));
    mount(rec, L.slice(0, 6).map(x => h('div.r8i-r', h('div', h('b', x.nombre), h('small', (E.ORIGEN[x.origen] || x.origen) + ' · ' + E.fechaCorta(x.fecha) + (x.pasos.length ? ' · ' + x.pasos.length + ' cambio(s)' : ''))),
      h('div.r8i-ra', btn('🛠️', async () => { await E.abreReciente(x.id); ir('taller'); }, { cls: 'sm ghost', title: 'Abrir en Reparar' }), btn('🩺', async () => { await E.abreReciente(x.id); ir('doctor'); }, { cls: 'sm ghost', title: 'Abrir en Imprimir' })))));
  }
  async function pintaArch() {
    if (!pc || !D.r8Archivos) return mount(arch, h('p.small.muted', 'En el PC, todo lo que guarda CelebriR8 va a Documentos › CelebriDiseños_R8.'));
    try {
      const r = await D.r8Archivos(), L = r.archivos || [];
      mount(arch, h('p.small', 'Todo se guarda en ', h('b', 'Documentos › CelebriDiseños_R8'), ', en carpetas por tarea (SmartLab, Reparados, Repuestos, Imprimir, Informes).'),
        L.slice(0, 5).map(a => h('div.r8i-r', h('div', h('b', a.nombre), h('small', (a.donde === '.' ? 'CelebriDiseños_R8' : a.donde) + ' · ' + E.fechaCorta(a.fecha) + ' · ' + a.kb + ' KB')), h('div.r8i-ra', btn(/\.3mf$|\.stl$/i.test(a.nombre) ? 'Bambu' : 'Abrir', () => D.r8Abrir(a.ruta).then(x => toast('Abierto con ' + x.con, 'ok')).catch(e => toast(e.message, 'bad')), { cls: 'sm ghost' })))),
        btn('📂 Abrir la carpeta', () => D.r8Carpeta('').catch(e => toast(e.message, 'bad')), { cls: 'sm r8i-carpeta' }));
    } catch (e) { mount(arch, h('p.small.muted', 'No he podido mirar la carpeta: ' + e.message)); }
  }
  // ---------- ⬇️ el instalador del motor 3D (para el portátil o un PC nuevo) ----------
  async function instalador() {
    const { modal } = await import('../ui.js'), cuerpo = h('div.r8i-inst'); modal('⬇️ Motor 3D de CelebriR8', cuerpo, null, { size: 'wide' });
    const o = { fuente: '', TripoSR: true, TripoSG: true, InstalarPython: false, Prueba: true };
    let est = null; try { est = await D.motor3dInstalarEstado(); } catch (e) { }
    if (est && est.activa) return sigue(cuerpo);
    const S = E.SIS, M = id => S.motores.find(m => m.id === id) || {}, fila = (k, t, gb, lic, ya) => h('label.r8i-op', h('input', { type: 'checkbox', checked: o[k], 'data-op': k, onchange: e => { o[k] = e.target.checked; } }), h('div', h('b', t + (ya ? ' · ya está (se revisa)' : '')), h('small', gb + ' · ' + lic)));
    const carpeta = h('code.r8i-fuente', 'de internet (gratis)');
    mount(cuerpo,
      h('p', 'Se instala en ', h('b', (est && est.carpeta) || 'la carpeta del programa (motor3d)'), ' con su PROPIO Python: así ninguna actualización de otro programa lo rompe. Nunca se borra un modelo que ya esté: solo se copia o se baja lo que falta.'),
      h('div.r8i-ops', fila('TripoSR', 'TripoSR (rápido)', '1,6 GB', 'MIT: puedes vender lo que salga', !!M('triposr').listo), fila('TripoSG', 'TripoSG (la mejor forma)', '7,5 GB', 'MIT: puedes vender lo que salga', !!M('triposg').listo),
        h('label.r8i-op', h('input', { type: 'checkbox', checked: o.InstalarPython, onchange: e => { o.InstalarPython = e.target.checked; } }), h('div', h('b', 'Instalar Python 3.13 si falta'), h('small', 'Gratis (licencia PSF), solo para tu usuario, con winget. Si ya hay un Python 3.11–3.13, se usa ese.'))),
        h('label.r8i-op', h('input', { type: 'checkbox', checked: o.Prueba, onchange: e => { o.Prueba = e.target.checked; } }), h('div', h('b', 'Al acabar, hacer una figura de prueba'), h('small', 'Con TripoSR: así sabes que funciona de verdad.')))),
      h('div.r8p-sec', h('b', '¿De dónde lo saco?'), h('div.r8i-fuente-f', carpeta,
        btn('📂 Copiarlo de la torre o de un USB', async () => { try { const r = await D.motor3dElegirCarpeta(); if (!r.carpeta) return; if (!r.valida) toast('En esa carpeta no veo el motor 3D. Busca la carpeta «motor3d» de la torre (dentro de AppData › Roaming › CelebriDisenos).', 'warn', 9000); o.fuente = r.carpeta; mount(carpeta, r.carpeta); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm' }),
        btn('🌐 De internet', () => { o.fuente = ''; mount(carpeta, 'de internet (gratis)'); }, { cls: 'sm ghost' })),
        h('small.muted', 'Desde la torre por la red es lo más rápido (copia los modelos sin bajar nada). Desde internet se bajan de GitHub y Hugging Face (públicos y gratis; no hace falta cuenta). Las piezas de Python (unos 3 GB) se bajan siempre la primera vez.')),
      h('p.small.muted', '💽 Ocupa unos 5 GB + los modelos que elijas. Libre ahora: ' + (est ? Math.round(est.disco_libre_gb || 0) + ' GB' : '—') + '.'),
      h('div.r8p-btns', btn('⬇️ Instalar', async () => { try { await D.motor3dInstalar(o); sigue(cuerpo); } catch (e) { toast(e.message, 'bad', 8000); } }, { cls: 'primary r8i-empezar' })));
  }
  function sigue(cuerpo) {
    const barra = h('span'), fase = h('b'), txt = h('small.muted'), pasos = h('ol.r8i-pasos'), log = h('pre.r8i-log'), fin = h('div');
    mount(cuerpo, h('div.r8i-prog', fase, h('div.r8v-pbar.r8i-bar', barra), txt), pasos, h('details', h('summary', 'Ver el registro'), log), fin, h('div.r8p-btns', btn('Cancelar', () => D.motor3dInstalarCancelar().catch(() => { }), { cls: 'sm ghost r8i-cancelar' })));
    const T = E.tarea('Instalando el motor 3D');
    const tic = setInterval(async () => {
      let r; try { r = await D.motor3dInstalarEstado(); } catch (e) { return; }
      mount(fase, r.fase || '…'); barra.style.width = (r.pct || 0) + '%'; mount(txt, r.txt || ''); mount(pasos, (r.pasos || []).map(p => h('li', p))); mount(log, (r.log || []).join('\n')); T.avance(r.pct, r.fase);
      if (r.hecho) { clearInterval(tic); window.__r8inst = r;
        if (r.ok) { T.bien('motor 3D listo'); mount(fin, h('p.r8p-nota.bien', '✅ Instalado y probado. ', r.prueba ? 'Figura de prueba hecha en ' + r.prueba.total_s + ' s con ' + (r.prueba.dispositivo === 'cuda' ? 'la tarjeta gráfica' : 'el procesador') + '.' : '')); }
        else { T.mal(r.error); mount(fin, h('p.r8p-nota.mal', '⚠️ ' + r.error + ' (el registro completo queda en la carpeta del motor: instalacion.log)')); }
        E.sistema(true).catch(() => { }); }
    }, 1500);
  }
  const quita = [E.escucha('sistema', pintaSis), E.escucha('recientes', pintaRec)];
  pintaSis(); E.sistema().catch(() => { }); pintaRec(); pintaArch();
  return { destroy() { quita.forEach(f => f()); } };
}
