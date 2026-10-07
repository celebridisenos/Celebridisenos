// ================= v11.2 · Centro de impresión =================
// Todas las impresoras en un sitio: las de Windows (con estado, papel, cola y errores), lo que hay en
// la red y por USB, y las Bambu Lab en vivo. Nunca se queda en «no encontrada»: se explica qué se
// buscó, qué falló, qué falta y qué hacer. La persona confirma cuál es cada una («Esta es mi Epson»).
import { h, mount, btn, toast, pill, icon, field, inp, sel, modal, confirmDlg } from '../ui.js';
import { S, can } from '../store.js';
import { desktop } from '../desktop.js';
import { btCard } from './bt_impresora.js';

const card = (title, ...kids) => h('div.card.col', title ? h('h3', title) : null, ...kids);
const estadoPill = p => pill(p.estado || 'Lista', p.offline ? 'bad' : p.problema ? 'warn' : /Imprimiendo|cola/.test(p.estado || '') ? 'brand' : 'ok');
const hhmm = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
export const BAMBU_PILL = { libre: 'ok', preparando: 'brand', imprimiendo: 'brand', pausada: 'warn', finalizada: 'ok', error: 'bad', sin_filamento: 'bad', desconectada: '' };

export function bambuLine(b) {
  if (!b) return null;
  const st = pill(b.estadoTexto || b.estado, BAMBU_PILL[b.estado] || '');
  const busy = ['imprimiendo', 'pausada', 'preparando'].includes(b.estado);
  return h('div.col', { style: { gap: '4px' } },
    h('div.row.wrap', st, b.trabajo ? h('b.small.ellipsis', b.trabajo) : null,
      busy ? h('span.small', b.pct + ' %' + (b.restanteMin ? ' · quedan ' + (b.restanteMin >= 60 ? Math.floor(b.restanteMin / 60) + ' h ' : '') + (b.restanteMin % 60) + ' min' : '') + (b.fin ? ' · termina a las ' + hhmm(b.fin) : '')) : null),
    busy ? h('div.bar', h('i', { style: { width: Math.max(0, Math.min(100, b.pct)) + '%' } })) : null,
    b.capas && busy ? h('div.tiny.muted', 'Capa ' + b.capa + ' de ' + b.capas + (b.boquilla ? ' · boquilla ' + Math.round(b.boquilla) + '° · cama ' + Math.round(b.cama) + '°' : '')) : null,
    b.errorTexto ? h('div.small.bad-t', '⚠️ ' + b.errorTexto) : null,
    !b.conectada && b.problema ? h('div.tiny.warn-t', b.problema) : null);
}

// v16 · IMPRIMIR DESDE EL MÓVIL: móvil → sistema → PC del taller → impresora. Se explica aquí y se ve si el PC está encendido.
async function puenteCard(reload) {
  const E = await import('../envio.js'), { api } = await import('../store.js');
  const estado = h('div.puente-estado', '…comprobando el PC del taller'), sel = E.destinoGuardado();
  const pend = E.encargosPendientes();
  const comprobar = async () => {
    try { const w = await api('pc.servidor', {}, { quiet: true }); mount(estado, w ? [h('b.ok-t', '🟢 PC del taller encendido'), h('span.small', ' · ' + (w.dispositivo || 'PC') + ' · lo que mandes sale al momento')] : [h('b.bad-t', '🔴 No veo el PC del taller'), h('span.small', ' · enciéndelo y abre el programa CelebriDiseños. Lo que mandes se queda en cola y sale en cuanto se abra.')]); }
    catch (e) { mount(estado, h('span.small.muted', 'No se pudo comprobar ahora (sin conexión).')); }
  };
  comprobar();
  const paso = (ic, t, s) => h('div.puente-p', h('span.ic', ic), h('b', t), h('span.tiny.muted', s));
  const elegir = v => { E.guardarDestino(v); toast(v === 'taller' ? 'Este aparato imprimirá siempre por el PC del taller' : v === 'aqui' ? 'Este aparato imprimirá aquí (PDF o Bluetooth)' : 'Preguntará cada vez', 'ok'); reload(); };
  return card('📱 Imprimir desde este aparato',
    h('p.small.muted', 'Un navegador de móvil no puede mandar una etiqueta a una impresora del taller por sí solo. Por eso el programa hace de puente: tú pulsas «Imprimir» aquí y la etiqueta sale en el taller.'),
    h('div.puente', paso('📱', 'Este aparato', 'pulsas Imprimir'), h('span.fl', '→'), paso('☁️', 'El sistema', 'guarda el encargo'), h('span.fl', '→'), paso('🖥️', 'PC del taller', 'con el programa abierto'), h('span.fl', '→'), paso('🖨️', 'Impresora', 'sale la etiqueta')),
    estado,
    pend.length ? h('p.small.warn-t', '⏳ ' + pend.length + (pend.length === 1 ? ' etiqueta esperando' : ' etiquetas esperando') + ' al PC del taller.') : null,
    h('div.lbl', { style: { marginTop: '6px' } }, 'Cuando pulse «Imprimir» en este aparato:'),
    h('div.seg', [['taller', '🖨️ Siempre en el PC del taller'], ['aqui', '📄 Aquí (PDF o Bluetooth)'], ['', 'Preguntarme']].map(x => h('button' + (sel === x[0] ? '.on' : ''), { type: 'button', onclick: () => elegir(x[0]) }, x[1]))),
    h('p.tiny.muted', 'No hace falta hacer nada más cada vez: el PC del taller coge solo los encargos mientras su programa esté abierto. Si quieres imprimir sin PC, usa la impresora Bluetooth de abajo.'),
    h('div.row', btn('Comprobar otra vez', comprobar, { cls: 'sm' })));
}
export async function render(b, L, reload) {
  const c = JSON.parse(JSON.stringify(await L.labelCfg()));
  c.vinculo = c.vinculo || {};
  if (!desktop.on) {
    b.append(card('Centro de impresión', h('p.small.muted', 'Abre CelebriDiseños desde el programa del PC para ver las impresoras, su estado y las Bambu Lab. En el móvil las etiquetas salen como PDF con el tamaño exacto (o directas por Bluetooth, si lo configuras abajo).')));
    b.append(await puenteCard(reload)); // v16: cómo imprime de verdad este aparato
    b.append(btCard(c, async msg => { await L.saveLabelCfg(c); await L.printers(true); toast(msg || 'Guardado en este móvil', 'ok'); reload(); }));
    return c;
  }
  const save = async msg => { await L.saveLabelCfg(c); toast(msg || 'Guardado en este ordenador', 'ok'); reload(); };
  // ---------- 1. Impresoras de Windows ----------
  let list = [];
  try { list = await L.printers(true); } catch (e) { }
  const real = L.realPrinters(list);
  const dups = list.filter(p => p.duplicadaDe);
  const role = p => p.name === c.vinculo.etiquetas ? 'etiquetas' : p.name === c.vinculo.folios ? 'folios' : '';
  b.append(card('🖨️ Impresoras de este ordenador',
    real.length ? h('div.list.boxed', real.map(p => {
      const r = role(p);
      return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap', alignItems: 'flex-start' } }, icon('printer', 's'),
        h('div.grow', { style: { minWidth: '220px' } },
          h('div.row.wrap', h('b', p.name), estadoPill(p), p.label ? pill(p.label4x6 ? 'Etiquetas 10×15' : 'Etiquetas', 'ok') : p.a4 ? pill('Folios A4') : null, p.default ? pill('Predeterminada', 'brand') : null,
            r === 'etiquetas' ? pill('✔ Tu impresora de etiquetas', 'ok') : r === 'folios' ? pill('✔ Tu impresora de folios', 'ok') : null),
          h('div.tiny.muted', [p.conexion, p.host ? 'IP ' + p.host : '', p.jobs ? p.jobs + ' en cola' : 'cola vacía', p.problema || ''].filter(Boolean).join(' · ')),
          h('div.tiny.muted', 'Papel: ' + ((p.papers || []).slice(0, 5).map(x => x.name).join(', ') || '—')),
          dups.filter(d => d.duplicadaDe === p.name).length ? h('div.tiny.muted', 'También aparece en Windows como «' + dups.filter(d => d.duplicadaDe === p.name).map(d => d.name).join('», «') + '» (es la misma impresora: se usa solo esta).') : null),
        h('div.row.wrap',
          r !== 'etiquetas' ? btn('Es mi impresora de etiquetas', () => { c.vinculo.etiquetas = p.name; save('«' + p.name + '» será la de etiquetas'); }, { cls: 'sm ghost' }) : null,
          r !== 'folios' ? btn('Es mi impresora de folios', () => { c.vinculo.folios = p.name; save('«' + p.name + '» será la de folios'); }, { cls: 'sm ghost' }) : null,
          btn('Hoja de prueba', async () => { await L.saveLabelCfg(c); L.printLabels('qr', [{ qr: 'CelebriDisenos-calibracion', titulo: 'Debe medir 40 × 40 mm' }], { printer: p.name }); }, { cls: 'sm', icon: 'printer' }),
          btn('Prueba de QR', async () => { await L.saveLabelCfg(c); L.labelDialog('qrtest', [L.dataFor('qrtest', {})], { printer: p.name }).catch(e => toast(e.message, 'bad')); }, { cls: 'sm ghost', icon: 'qr' })));
    })) : h('p.small.warn-t', 'Windows no tiene instalada ninguna impresora física en este ordenador. Pulsa «Buscar impresoras» para ver qué hay en la red y por USB.'),
    h('div.row.wrap', btn('Volver a leer', () => reload(), { cls: 'sm ghost', icon: 'refresh' }),
      btn('Añadir una impresora en Windows', () => desktop.openUrl('ms-settings:printers').catch(e => toast(e.message, 'bad')), { cls: 'sm ghost', icon: 'plus' }))));

  b.append(btCard(c, save));

  // ---------- 2. Buscar por todos los métodos ----------
  const found = h('div');
  const search = async () => {
    mount(found, h('p.small.muted', '🔎 Buscando en Windows, USB y en la red (unos 20-40 segundos)…'));
    let r;
    try { r = await desktop.discover(); } catch (e) { mount(found, h('p.bad-t', e.message)); return; }
    mount(found,
      h('h4', 'Qué se ha comprobado'),
      h('div.list.boxed', (r.diagnostico || []).map(d => h('div.item', { style: { cursor: 'default' } }, h('span', d.ok ? '✅' : '⚠️'),
        h('div.grow', h('b.small', d.metodo), h('div.tiny', d.detalle), d.falta ? h('div.tiny.warn-t', 'Qué falta: ' + d.falta) : null)))),
      h('h4', { style: { marginTop: '12px' } }, 'Aparatos encontrados en la red'),
      (r.dispositivos || []).length ? h('div.list.boxed', r.dispositivos.map(d => h('div.item', { style: { cursor: 'default' } }, icon(d.tipo === 'bambu' ? 'cube' : 'printer', 's'),
        h('div.grow', h('b.small', (d.modelo || 'Impresora sin identificar') + (d.nombre ? ' · ' + d.nombre : '')),
          h('div.tiny.muted', d.ip + ' · puertos ' + (d.puertos || []).join(', ') + (d.serie ? ' · nº de serie ' + d.serie : '') + ' · detectada por ' + (d.fuentes || []).join(', '))),
        d.tipo === 'bambu' ? pill('Bambu Lab') : d.enCola ? pill('En Windows: ' + d.enCola, 'ok') : h('div.col', { style: { alignItems: 'flex-end' } }, pill('No instalada en Windows', 'warn'),
          btn('Instalarla', () => modal('Instalar la impresora ' + d.ip, h('div.col', h('p', 'Está en la red pero Windows no la tiene. En «Impresoras y escáneres» pulsa «Agregar dispositivo»; si no sale, «Agregar manualmente» → «Agregar una impresora por dirección TCP/IP» y escribe ', h('b', d.ip), '.'),
            h('p.small.muted', 'Después vuelve aquí y pulsa «Volver a leer».')), close => [btn('Cerrar', close), btn('Abrir Impresoras y escáneres', () => { desktop.openUrl('ms-settings:printers'); close(); }, { cls: 'primary' })], { size: 'narrow' }), { cls: 'sm ghost' })))))
        : h('p.small.muted', 'Ningún aparato de impresión responde en la red local.'),
      (r.usb || []).some(u => u.estado !== 'OK') ? h('p.tiny.muted', { style: { marginTop: '8px' } }, 'Dispositivos USB con problemas: ' + r.usb.filter(u => u.estado !== 'OK').map(u => u.nombre).join('; ') + '. Si uno es una impresora, instala el driver de su fabricante o prueba otro cable/puerto.') : null,
      h('p.tiny.muted', 'Búsqueda hecha en ' + r.duracion + '.'));
  };
  b.append(card('🔎 Buscar impresoras (Windows, USB y red)', h('p.small.muted', 'Busca de todas las formas posibles: cola de Windows, dispositivos USB (aunque no tengan driver), red Wi-Fi/cable (puertos de impresora y Bambu Lab) y anuncios de la red. Si algo no aparece, te dice qué se intentó y qué falta.'),
    btn('Buscar impresoras', search, { cls: 'primary', icon: 'search' }), found));

  // ---------- 3. Bambu Lab ----------
  const bbox = h('div');
  let lastSig = '';
  const sigOf = l => JSON.stringify((l || []).map(x => Object.assign({}, x, { actualizado: 0 })));
  const drawBambu = async (pre) => {
    let r = pre;
    if (!r) try { r = await desktop.bambu(); } catch (e) { mount(bbox, h('p.bad-t', e.message)); return; }
    lastSig = sigOf(r.impresoras);
    const taller = (S.t.impresoras || []);
    mount(bbox,
      r.impresoras.length ? h('div.list.boxed', r.impresoras.map(x => {
        const asg = sel([{ v: '', t: '— Sin relacionar —' }].concat(taller.map(t => ({ v: t.id, t: t.nombre }))), x.impresoraId || '');
        asg.onchange = async () => { try { await desktop.bambuAccion({ accion: 'asignar', serial: x.serial, impresoraId: asg.value }); toast('Relacionada con el Taller', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
        return h('div.item', { style: { cursor: 'default', flexWrap: 'wrap', alignItems: 'flex-start' } }, icon('cube', 's'),
          h('div.grow', { style: { minWidth: '240px' } }, h('div.row.wrap', h('b', x.nombre || x.modelo), h('span.tiny.muted', x.ip + ' · ' + x.serial + (x.origenCodigo ? ' · código de ' + x.origenCodigo : ''))), bambuLine(x)),
          h('div.col', { style: { gap: '6px', minWidth: '200px' } }, h('span.tiny.muted', 'En el Taller es:'), asg,
            /^(01S|01P|030|039)/.test(x.serial) ? btn('📷 Ver cámara', () => import('../camaras.js').then(C => C.openCam(x.serial)), { cls: 'sm' }) : null,
            btn('Desvincular', async () => { if (!await confirmDlg('Desvincular', '¿Dejar de seguir la ' + (x.nombre || x.modelo) + '?', 'Desvincular', true)) return; await desktop.bambuAccion({ accion: 'desvincular', serial: x.serial }); drawBambu(); }, { cls: 'sm ghost danger' })));
      })) : h('p.small.muted', 'Todavía no hay ninguna Bambu Lab vinculada.'),
      h('p.tiny.muted', r.studio.leido ? 'Bambu Studio de este PC tiene el acceso de ' + r.studio.impresoras + ' impresora(s): se usa sin enseñarlo nunca.' : 'Bambu Studio no está en este PC: escribe el código de acceso de cada impresora a mano.'));
  };
  const ip = inp({ placeholder: 'IP, p. ej. 192.168.1.179' }), code = inp({ placeholder: 'Código de acceso (solo si no está en Bambu Studio)', type: 'password', autocomplete: 'off' }), name = inp({ placeholder: 'Nombre, p. ej. P1P' });
  const auto = async () => {
    mount(bbox, h('p.small.muted', '🔎 Buscando Bambu Lab en la red…'));
    try {
      const r = await desktop.bambuAccion({ accion: 'buscar' });
      toast(r.nuevas ? r.nuevas + ' Bambu Lab vinculada(s)' : (r.encontradas || []).length ? 'Ya estaban vinculadas' : 'No se ha encontrado ninguna', r.nuevas || (r.encontradas || []).length ? 'ok' : 'warn');
      await drawBambu();
      bbox.append(h('div.list.boxed', { style: { marginTop: '8px' } }, (r.diagnostico || []).map(d => h('div.item', { style: { cursor: 'default' } }, h('span', d.ok ? '✅' : '⚠️'), h('div.grow', h('b.small', d.metodo), h('div.tiny', d.detalle), d.falta ? h('div.tiny.warn-t', 'Qué falta: ' + d.falta) : null)))));
    } catch (e) { mount(bbox, h('p.bad-t', e.message)); }
  };
  b.append(card('🧊 Bambu Lab (en vivo por la red local)',
    h('p.small.muted', 'Estado real de cada impresora: libre, imprimiendo, pausada, finalizada, error o falta de filamento, con el trabajo, el %, el tiempo restante y la hora de fin. Al empezar y al terminar una impresión, el pedido se actualiza solo; si hay un error, te avisa. Solo se lee: CelebriDiseños no manda órdenes a la impresora.'),
    btn('Buscar y vincular automáticamente', auto, { cls: 'primary', icon: 'search' }), bbox,
    h('details', h('summary.small', 'Vincular a mano (si no aparece)'),
      h('div.form', field('IP de la impresora', ip, 'En la impresora: Ajustes → WLAN (o en el router).'), field('Código de acceso', code, 'Solo si Bambu Studio no está en este PC. Se guarda cifrado y nunca sale de aquí.'), field('Nombre', name)),
      btn('Probar y vincular', async () => { try { await desktop.bambuAccion({ accion: 'vincular', ip: ip.value, codigo: code.value, nombre: name.value }); code.value = ''; toast('Conectada ✔', 'ok'); drawBambu(); } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm primary' }))));
  drawBambu();
  // En vivo: se vuelve a leer cada 5 s mientras esta pantalla esté abierta (sin molestar si estás eligiendo algo)
  const live = setInterval(async () => {
    if (!bbox.isConnected) return clearInterval(live);
    if (bbox.contains(document.activeElement) || bbox.querySelector('.bad-t, p.small.muted:only-child')) return;
    try { const r = await desktop.bambu(); if (sigOf(r.impresoras) !== lastSig) drawBambu(r); } catch (e) { }
  }, 5000);
  return c;
}
