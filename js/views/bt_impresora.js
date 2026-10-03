// ================= v13.2 · Impresora de etiquetas por BLUETOOTH (PC y móvil) =================
// Asistente: (1) empareja la impresora, (2) elige el puerto (PC) o conecta (móvil Android), (3) imprime una prueba de cada
// idioma de impresora y marca la que salió bien. Nada se da por bueno sin que la persona vea la etiqueta impresa.
import { h, mount, btn, toast, pill, modal } from '../ui.js';
import { desktop } from '../desktop.js';
import * as RP from '../rawprint.js';
import * as L from '../labels.js';

const card = (title, ...kids) => h('div.card.col', title ? h('h3', title) : null, ...kids);

export function btCard(c, save) {
  const bt = c.bt, pc = desktop.on;
  const quitar = () => { delete c.bt; if (c.vinculo && String(c.vinculo.etiquetas || '').startsWith('Bluetooth ·')) delete c.vinculo.etiquetas; save('Impresora Bluetooth quitada'); };
  const body = [];
  if (!pc && !RP.webBtOk()) {
    body.push(h('p.small.muted', 'Este navegador no puede hablar con la impresora por Bluetooth (en iPhone/iPad no es posible; en Android hace falta Chrome). No pasa nada: cuando un pedido llega a «Empaquetar», el PC con el programa abierto imprime la etiqueta por Bluetooth él solo.'));
  } else {
    body.push(h('p.small.muted', pc
      ? 'Para imprimir en la impresora de etiquetas sin cable. Windows crea un puerto Bluetooth al emparejarla y el programa le manda la etiqueta directamente.'
      : 'Imprime desde este móvil directamente por Bluetooth (Android + Chrome, impresoras con Bluetooth de bajo consumo). Si tu impresora no lo admite, la etiqueta se imprime desde el PC.'));
    if (bt && bt.lang) body.push(h('div.row.wrap', pill('✔ ' + (bt.nombre || bt.port || 'Impresora') + ' · idioma ' + RP.langName(bt.lang), 'ok'), bt.port ? pill(bt.port, '') : null));
    body.push(h('div.row.wrap',
      btn(bt && bt.lang ? 'Volver a configurar' : 'Configurar la impresora Bluetooth', () => wizard(c, save), { cls: bt && bt.lang ? 'sm ghost' : 'primary', icon: 'bluetooth' }),
      bt && bt.lang ? btn('Imprimir una etiqueta de prueba', async ev => { const b = ev.target.closest('button'); b.disabled = true; try { await enviar(bt, RP.testCanvas('✔', RP.langName(bt.lang))); toast('Prueba enviada', 'ok'); } catch (e) { toast(e.message, 'bad', 9000); } b.disabled = false; }, { cls: 'sm', icon: 'printer' }) : null,
      bt && bt.lang ? btn('Quitar', quitar, { cls: 'sm ghost' }) : null));
  }
  return card('🔵 Impresora de etiquetas por Bluetooth', ...body);
}

async function enviar(bt, canvas) {
  const bytes = RP.encode(bt.lang, canvas, { wmm: 100, hmm: 150, copies: 1 });
  if (desktop.on) await desktop.rawPrint(bt.port, bytes); else await RP.btSend(bytes);
}

function wizard(c, save) {
  const pc = desktop.on;
  let port = (c.bt && c.bt.port) || '', nombre = (c.bt && c.bt.nombre) || '', listo = !pc && RP.btConnected();
  let closeW = () => { };
  const portsBox = h('div'), testsBox = h('div');
  const nombreFinal = () => nombre || port || 'impresora';
  const buscar = async () => {
    mount(portsBox, h('p.small.muted', 'Buscando puertos en Windows…'));
    let r; try { r = await desktop.puertos(); } catch (e) { mount(portsBox, h('p.small.warn-t', e.message)); return; }
    const ps = (r.puertos || []).slice().sort((a, b) => (b.bluetooth ? 1 : 0) - (a.bluetooth ? 1 : 0));
    if (!ps.length) { mount(portsBox, h('p.small.warn-t', 'Windows no tiene ningún puerto COM. Empareja la impresora (paso 1) y pulsa «Buscar» otra vez.')); return; }
    const bts = ps.filter(x => x.bluetooth);
    mount(portsBox,
      bts.length ? null : h('p.small.warn-t', 'No hay ningún puerto Bluetooth. ' + ((r.emparejados || []).length ? 'Windows sí ve estos aparatos emparejados: ' + r.emparejados.join(', ') + '. Si tu impresora está en la lista pero no tiene puerto, entra en su ficha de Bluetooth → «Más opciones de Bluetooth» → pestaña «Puertos COM» → Agregar → Saliente, y vuelve a buscar.' : 'Windows no ve ninguna impresora emparejada: enciéndela y empareja (paso 1).')),
      h('div.list.boxed', ps.map(p => h('label.item', { style: { cursor: 'pointer' } }, h('input', { type: 'radio', name: 'btport', checked: p.port === port, onchange: () => { port = p.port; nombre = p.dispositivo || ''; drawTests(); } }),
        h('div.grow', h('b', p.port), ' ', h('span.small', p.dispositivo || p.nombre), p.bluetooth ? ' ' : '', p.bluetooth ? pill('Bluetooth', 'brand') : null)))));
    drawTests();
  };
  const conectar = async ev => {
    const b = ev.target.closest('button'); b.disabled = true;
    try { nombre = await RP.btConnect(true); listo = true; toast('Conectada: ' + nombre, 'ok'); mount(portsBox, h('p.small', '✔ Conectada: ', h('b', nombre))); drawTests(); }
    catch (e) { if (e && e.name !== 'NotFoundError') toast(e.message || String(e), 'bad', 10000); }
    b.disabled = false;
  };
  const drawTests = () => {
    if (pc ? !port : !listo) { mount(testsBox, null); return; }
    mount(testsBox, h('h4', 'Paso 3 · Prueba qué idioma entiende tu impresora'),
      h('p.small.muted', 'Pon una etiqueta de 10 × 15 cm. Pulsa «Imprimir prueba» en cada una (puede tardar unos segundos) y marca la que salga con el texto legible y el recuadro entero. Las que no salgan bien, no pasa nada: se ignoran. Cada una dice PRUEBA y su número.'),
      h('div.list.boxed', RP.LANGS.map((l, i) => h('div.item', { style: { cursor: 'default', flexWrap: 'wrap' } },
        h('div.grow', { style: { minWidth: '200px' } }, h('b', 'Prueba ' + (i + 1) + ' · ' + l.t), h('div.tiny.muted', l.d)),
        h('div.row.wrap',
          btn('Imprimir prueba ' + (i + 1), async ev => { const b = ev.target.closest('button'); b.disabled = true; try { await enviar({ port, lang: l.k }, RP.testCanvas(i + 1, l.t + ' · ' + nombreFinal())); toast('Enviada la prueba ' + (i + 1) + '. Mira la impresora.', 'ok', 6000); } catch (e) { toast(e.message || String(e), 'bad', 10000); } b.disabled = false; }, { cls: 'sm', icon: 'printer' }),
          btn('✔ Salió bien', async () => { c.bt = { lang: l.k, nombre: nombreFinal() }; if (pc) c.bt.port = port; else c.bt.web = true; c.vinculo = c.vinculo || {}; c.vinculo.etiquetas = L.btPrinterName(c.bt); await save('Guardado: ' + nombreFinal() + ' imprimirá por Bluetooth (' + l.t + ')'); closeW(); }, { cls: 'sm primary' }))))),
      h('p.tiny.muted', 'Si ninguna sale bien: dime el modelo exacto de la impresora y el mensaje que ves; hay impresoras que solo imprimen con su propio controlador (en ese caso se instala el controlador y se elige el puerto Bluetooth en sus propiedades).'));
  };
  const pasos = pc
    ? [h('h4', 'Paso 1 · Empareja la impresora con Windows'), h('ol.small', h('li', 'Enciende la impresora (y que no esté conectada al móvil).'), h('li', 'Windows → Configuración → Bluetooth y dispositivos → Agregar dispositivo → Bluetooth.'), h('li', 'Elige tu impresora en la lista (suele llamarse como la marca o el modelo). Si pide un PIN: 0000 o 1234.')),
      h('h4', 'Paso 2 · Elige el puerto'), btn('Buscar puertos', buscar, { cls: 'sm', icon: 'refresh' }), portsBox]
    : [h('h4', 'Paso 1 · Enciende la impresora'), h('p.small', 'Que esté encendida, cerca y sin conectar con otro móvil.'), h('h4', 'Paso 2 · Conéctala'), btn('Elegir la impresora Bluetooth', conectar, { cls: 'sm primary', icon: 'bluetooth' }), portsBox];
  modal('Impresora de etiquetas por Bluetooth', h('div.col', ...pasos, testsBox), close => { closeW = close; return [btn('Cerrar', close)]; }, { size: 'wide' });
  if (pc && port) buscar();
}
