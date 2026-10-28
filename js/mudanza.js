// ================= v30.7.1 · 📦 MUDANZA: llevar CelebriDiseños a otro ordenador =================
// La dueña (12-10-2026): «quiero que hagas una copia de seguridad fácil de usar para poder mover todo mi programa en caso de cambiar
// de ordenador: cómo hacerlo, llevarme paso a paso, con sus archivos bien, todo puesto».
// 28-10-2026 · 🖥️ TRASLADO COMPLETO (solo administradoras: Configuración › Sistema › Trasladar a otro ordenador): «un botón de trasladar
// todo probado completo a otro ordenador que vaya a ser el siguiente administrador total … la torre se va a estropear pronto».
// Una carpeta (en un disco externo) con TODO ordenado por números: el programa, tus ajustes, tus carpetas de productos y las compartidas
// del taller, tus diseños, tus perfiles de Bambu, la IA, «Cómo nació» y tus claves (cifradas con la clave del traslado que eliges aquí),
// una guía paso a paso con tus datos y un «RESTAURAR_EN_EL_PC_NUEVO.bat» que lo coloca todo en el otro ordenador y lo deja de servidor.
// La copia la hace el programa del PC (desktop/host/mudanza.go y mudanza_traslado.go). Aquí no se borra ni se cambia nada.
import { h, mount, btn, modal, toast, inp, confirmDlg } from './ui.js';
import { desktop } from './desktop.js';
import { S } from './store.js';

const tam = b => b > 1073741824 ? (b / 1073741824).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' GB' : b > 1048576 ? Math.round(b / 1048576) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
// los ajustes de ESTE aparato que se llevan (temas, calibración de CelebriR8, menú…); nunca la sesión ni el nombre de este PC
export function ajustesDelAparato() {
  const o = {}, NO = /^cd\.(token|device|unlock|server$|sesion|iaServidor$|datosDe$)/;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith('cd.') || NO.test(k)) continue; const v = localStorage.getItem(k); if (v != null && v.length < 300000) o[k] = v; } } catch (e) { }
  return o;
}
// en el PC NUEVO, la primera vez que se abre el programa tras restaurar: se ponen los ajustes que venían en la copia (una sola vez)
export async function recogeAjustes() {
  if (!desktop.on || !desktop.mudanza) return false;
  try { if (sessionStorage.getItem('cd.mudanza.mirado')) return false; sessionStorage.setItem('cd.mudanza.mirado', '1'); } catch (e) { }
  let r; try { r = await desktop.mudanza('ajustes'); } catch (e) { return false; }
  if (!r || !r.ls) return false; let n = 0;
  for (const k in r.ls) { try { if (localStorage.getItem(k) == null) { localStorage.setItem(k, r.ls[k]); n++; } } catch (e) { } }
  try { sessionStorage.setItem('cd.mudanza.bienvenida', JSON.stringify({ de: r.de || '', n })); } catch (e) { }
  return n > 0;
}
export function bienvenidaMudanza() {
  let d = null; try { d = JSON.parse(sessionStorage.getItem('cd.mudanza.bienvenida') || 'null'); sessionStorage.removeItem('cd.mudanza.bienvenida'); } catch (e) { }
  if (d) toast('📦 Mudanza: he puesto tus ajustes' + (d.de ? ' del ordenador «' + d.de + '»' : '') + ' (temas, calibración de CelebriR8…). Sigue la guía desde el paso 5.', 'ok', 14000);
}

// (28-10) en el PC NUEVO: las claves que venían cifradas esperan la CLAVE DEL TRASLADO (solo una administradora las pone)
export async function clavesPendientes(forzar) {
  if (!desktop.on || !desktop.mudanza) return false;
  let r; try { r = await desktop.mudanza('claves'); } catch (e) { return false; }
  if (!r || !r.pendiente) { if (forzar) toast('No hay claves del traslado esperando en este ordenador.', 'ok'); return false; }
  const clave = inp({ type: 'password', autocomplete: 'off', placeholder: 'La clave que pusiste al preparar el traslado', 'data-k': 'clave-traslado' });
  const msg = h('p.small.bad-t', { role: 'alert' });
  const fecha = r.fecha ? new Date(r.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const m = modal('🔐 Tus claves del traslado', h('div.col', { style: { gap: '10px' } },
    h('p', 'Han llegado cifradas desde el ordenador ', h('b', '«' + (r.de || 'anterior') + '»'), fecha ? ' (copia del ' + fecha + ')' : '', '. Escribe la ', h('b', 'clave del traslado'), ' para ponerlas en su sitio en este ordenador:'),
    h('ul.small', { style: { margin: 0 } }, (r.que || []).map(x => h('li', x))),
    clave, msg,
    h('p.tiny.muted', 'Se vuelven a guardar cifradas con Windows para este ordenador. Lo que ya hubiera aquí no se cambia.')),
  close => [btn('No las quiero', async () => {
    if (!await confirmDlg('¿Apartar las claves del traslado?', 'No se pondrán en este ordenador (siguen en el disco del traslado, por si cambias de idea).', 'Apartarlas')) return;
    try { await desktop.mudanza('claves', { apartar: true }); close(); toast('Claves del traslado apartadas.', 'ok'); } catch (e) { msg.textContent = e.message; }
  }, { cls: 'ghost sm' }), h('span.grow'), btn('Más tarde', close), btn('🔐 Ponerlas', async ev => {
    const b = ev.currentTarget; msg.textContent = '';
    if (!clave.value) { msg.textContent = 'Escribe la clave del traslado.'; return; }
    b.disabled = true;
    try {
      const x = await desktop.mudanza('claves', { clave: clave.value });
      close();
      toast('✅ Puestas: ' + (x.puestas || []).join(' · ') + ((x.avisos || []).length ? ' · ⚠️ ' + x.avisos.join(' ') : ''), 'ok', 16000);
    } catch (e) { msg.textContent = e.message; clave.select(); }
    finally { b.disabled = false; }
  }, { cls: 'primary traslado-poner' })], { size: 'narrow' });
  setTimeout(() => clave.focus(), 60);
  return m;
}

export async function dialogoMudanza() {
  if (!desktop.on || !desktop.mudanza) return toast('El traslado se prepara desde el programa del PC (no desde el móvil ni el navegador).', 'warn', 8000);
  const cuerpo = h('div.mud'), m = modal('🖥️ Trasladar TODO a otro ordenador', cuerpo, null, { size: 'wide' });
  let E = null, destino = '', libre = 0, tic = null, vivo = true, primera = true;
  const elegidas = new Set(), extras = new Map(); // extras: id → { ruta, nombre, compartida }
  const clave1 = inp({ type: 'password', autocomplete: 'new-password', placeholder: 'Mínimo 8 letras o números', 'data-k': 'clave1' });
  const clave2 = inp({ type: 'password', autocomplete: 'new-password', placeholder: 'Repítela', 'data-k': 'clave2' });
  clave1.addEventListener('input', () => pintaPie()); clave2.addEventListener('input', () => pintaPie());
  const cierra = m.close; m.close = () => { vivo = false; clearInterval(tic); cierra(); };
  const pide = async () => { try { E = await desktop.mudanza('estado'); } catch (e) { E = { error: e.message, partes: [] }; } };
  const deLista = id => (E.partes || []).find(x => x.id === id) || (E.compartidas || []).find(x => x.id === id && x.medido);
  const tamDe = id => { const p = deLista(id); if (p) return p.bytes || 0; const t = (E.tamanos || {})[id]; return t ? t[1] || 0 : 0; };
  const medido = id => { const p = deLista(id); if (p) return !!p.medido; return !!(E.tamanos || {})[id]; };
  const total = () => (E.partes || []).filter(p => p.fijo || elegidas.has(p.id)).reduce((a, p) => a + (p.bytes || 0), 0) + [...extras.keys()].filter(id => elegidas.has(id)).reduce((a, id) => a + tamDe(id), 0);
  const conClaves = () => elegidas.has('claves') && (E.partes || []).some(p => p.id === 'claves');
  const claveMal = () => !conClaves() ? '' : clave1.value.length < 8 ? 'La clave del traslado tiene que tener al menos 8 letras o números.' : clave1.value !== clave2.value ? 'Las dos claves no son iguales.' : '';
  const pie = h('div.col', { style: { gap: '8px' } });
  function pintaPie() {
    if (!E || E.activa) return;
    const cabe = !libre || total() / 1e9 < libre - 0.3, cm = claveMal();
    mount(pie,
      h('div.mud-dest', h('b', '¿Dónde la guardo?'), h('code', destino || 'Elige un disco externo (o un USB grande)'), btn('📂 Elegir', async () => { try { const r = await desktop.mudanza('elegir', {}); if (r && r.carpeta) { destino = r.carpeta; libre = r.libre_gb || 0; pintaPie(); } } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm mud-elegir' })),
      h('p.small' + (cabe ? '.muted' : '.bad-t'), 'Ocupará unos ' + tam(total()) + (libre ? ' · en ese disco quedan ' + libre.toLocaleString('es-ES') + ' GB libres' + (cabe ? '' : ': NO cabe, quita algo de lo opcional o elige otro disco') : '') + (E.midiendo ? ' (aún estoy midiendo)' : '') + '.'),
      cm && (clave1.value || clave2.value) ? h('p.small.bad-t.mud-clave-mal', cm) : null,
      h('div.row', { style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Cancelar', () => m.close()), btn('🖥️ Preparar el traslado', async () => {
        if (!destino) return toast('Elige primero dónde guardarlo.', 'warn');
        if (claveMal()) return toast(claveMal(), 'warn');
        try {
          await desktop.mudanza('empezar', { destino, partes: [...elegidas].filter(id => !id.startsWith('carpeta:')), carpetas: [...extras.entries()].filter(([id]) => elegidas.has(id)).map(([, x]) => x.ruta), clave: conClaves() ? clave1.value : '', ajustes: ajustesDelAparato(), usuario: (S.me && S.me.usuario) || '' });
          await pide(); pinta(); sigue();
        } catch (e) { toast(e.message, 'bad', 9000); }
      }, { cls: 'primary mud-empezar', disabled: !destino || !cabe || !!cm })));
  }
  const fila = (id, titulo, nota, bytes, estaMedido, fijo, opc) => h('label.mud-parte' + (fijo ? '.fijo' : ''), h('input', { type: 'checkbox', checked: fijo || elegidas.has(id), disabled: fijo, 'data-parte': id, onchange: e => { if (e.target.checked) elegidas.add(id); else elegidas.delete(id); pinta(); } }),
    h('div', h('b', titulo), nota ? h('small', nota) : null, opc ? h('small.mud-opc', opc) : null), h('span.mud-tam', estaMedido ? tam(bytes || 0) : 'midiendo…'));
  function pinta() {
    if (!vivo) return;
    if (E.activa || (E.hecho && E.carpeta)) return pintaAvance();
    if (primera) { // en el traslado completo sale marcado todo lo de la empresa (lo que pesa mucho se puede quitar)
      primera = false;
      (E.partes || []).forEach(p => { if (p.marcada) elegidas.add(p.id); });
      (E.compartidas || []).forEach(c => { extras.set(c.id, { ruta: c.ruta, nombre: c.nombre, compartida: true, esProductos: c.esProductos, disco: c.discoEntero }); if (!c.discoEntero) elegidas.add(c.id); });
    }
    const foco = document.activeElement === clave1 || document.activeElement === clave2 ? document.activeElement : null, sel = foco ? foco.selectionStart : 0; // (mientras mide, la ventana se repinta: lo que escribes no se pierde)
    const partes = E.partes || [], prodAqui = partes.some(p => p.id === 'productos');
    const prodFalta = E.productosConfigurada && !prodAqui && !E.productosEnRed;
    mount(cuerpo,
      h('p', 'Se prepara ', h('b', 'una carpeta con todo'), ' para que otro ordenador sea el ', h('b', 'nuevo servidor y administrador'), '. En el otro ordenador solo hay que hacer doble clic en «RESTAURAR_EN_EL_PC_NUEVO». ', h('b', 'Aquí no se borra ni se cambia nada.')),
      h('div.mud-nota', '💡 Tus pedidos, clientes, productos y facturas están en tu Google: en el ordenador nuevo aparecen solos al entrar con tu usuario. Esta copia lleva todo lo que vive en ESTE ordenador.'),
      prodFalta ? h('div.mud-ojo.mud-prod-falta', h('b', '⚠️ Tu carpeta de productos no está ahora mismo: '), h('code', E.productosConfigurada), ' no existe en este momento (¿un disco desenchufado?). Conéctalo y vuelve a abrir esta ventana para que vaya en la copia.') : null,
      prodAqui && /^\\\\/.test(E.productosConfigurada || '') ? h('p.small.muted', '📁 Tus carpetas de productos (' + E.productosConfigurada + ') están en ESTE ordenador aunque los demás las vean por la red: van en la copia.') : null,
      E.productosEnRed ? h('p.small.muted', '📁 Tus carpetas de productos están en otro ordenador de la red (' + E.productos + '): no hace falta copiarlas; el ordenador nuevo las ve igual.') : null,
      h('div.mud-partes', partes.map(p => fila(p.id, p.titulo, p.nota, p.bytes, p.medido, p.fijo, p.grande && !p.fijo ? 'Pesa mucho: quítala si no cabe' : ''))),
      conClaves() ? h('div.mud-claves', { style: { display: 'grid', gap: '6px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--line-2)' } },
        h('b', '🔐 Clave del traslado'), h('small', 'Inventa una clave y apúntala en papel: el ordenador nuevo te la pedirá para poner tus claves guardadas. Sin ella, el archivo cifrado no sirve de nada (por eso puede ir en un disco externo).'),
        h('div.row.wrap', { style: { gap: '8px' } }, clave1, clave2)) : null,
      h('div.mud-partes', h('b', { style: { marginTop: '4px' } }, '📂 Otras carpetas'),
        (E.compartidas || []).length ? h('small.muted', 'Las que ESTE ordenador comparte en la red del taller (en el nuevo, el restaurador las puede compartir igual):') : null,
        [...extras.entries()].map(([id, x]) => fila(id, (x.compartida ? '🔗 ' : '📁 ') + x.nombre, x.ruta + (x.disco ? ' · es un DISCO ENTERO' : '') + (x.esProductos ? ' · es tu carpeta de productos: aquí va solo lo que arriba no (00_SISTEMA, con tus versiones)' : ''), tamDe(id), medido(id), false, '')),
        (E.compartidasAusentes || []).length ? h('small.muted.mud-ausentes', '⚠️ Compartidas pero sin disco ahora mismo (no se pueden llevar): ' + E.compartidasAusentes.join(' · ')) : null,
        h('div', btn('➕ Añadir otra carpeta', async () => { try { const r = await desktop.mudanza('elegir-carpeta', {}); if (r && r.carpeta) { if (!extras.has(r.id)) extras.set(r.id, { ruta: r.carpeta, nombre: r.nombre }); elegidas.add(r.id); pinta(); sigue(); } } catch (e) { toast(e.message, 'bad'); } }, { cls: 'sm mud-otra' }))),
      pie);
    pintaPie();
    if (foco) { foco.focus(); try { foco.setSelectionRange(sel, sel); } catch (e) { } }
  }
  function pintaAvance() {
    if (E.activa) return mount(cuerpo, h('div.mud-prog', h('b', E.fase || 'Copiando…'), h('div.mud-barra', h('span', { style: { width: (E.pct || 0) + '%' } })), h('small.muted', (E.pct || 0) + ' % · ' + (E.txt || ''))), h('p.small.muted', 'Puedes seguir trabajando: la copia va por detrás. No desconectes el disco hasta que ponga «terminada».'),
      h('div.row', { style: { justifyContent: 'flex-end' } }, btn('Cancelar la copia', () => desktop.mudanza('cancelar', {}).catch(() => { }), { cls: 'sm ghost' })));
    if (!E.ok) return mount(cuerpo, h('p.bad-t', '⚠️ ' + (E.error || 'La copia no ha terminado.')), h('div.row', { style: { justifyContent: 'flex-end' } }, btn('Volver a intentarlo', () => { E.hecho = false; E.carpeta = ''; E.activa = false; pinta(); }, { cls: 'primary' })));
    const conCl = (E.resumen || []).some(r => r.id === 'claves');
    mount(cuerpo, h('div.mud-hecho', h('h3', (E.avisos || []).length ? '⚠️ Copia terminada, con avisos' : '✅ Copia terminada y comprobada'), h('p', 'Está en ', h('code', E.carpeta), '.'),
      h('table.mud-tabla', (E.resumen || []).map(r => h('tr', h('td', r.bien ? '✅' : '⚠️'), h('td', h('b', r.carpeta)), h('td', r.titulo), h('td', r.archivos + ' archivos · ' + tam(r.bytes || 0))))),
      (E.avisos || []).length ? h('div.mud-ojo', h('b', '⚠️ Mira esto:'), h('ul', E.avisos.map(a => h('li', a)))) : null,
      conCl ? h('div.mud-nota', '🔐 Tus claves van cifradas con la ', h('b', 'clave del traslado'), '. Apúntala: el ordenador nuevo te la pedirá.') : null,
      h('p', h('b', 'Ahora: '), 'lleva el disco al ordenador nuevo y haz doble clic en «RESTAURAR_EN_EL_PC_NUEVO». La guía «LEEME_PASO_A_PASO» (dentro de la carpeta) explica cada paso, también lo de los otros ordenadores del taller.'),
      h('div.row', { style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Hacer otra copia', () => { E.hecho = false; E.carpeta = ''; pinta(); }, { cls: 'ghost' }), btn('📂 Abrir la carpeta y la guía', () => desktop.mudanza('abrir', {}).catch(e => toast(e.message, 'bad')), { cls: 'primary mud-abrir' }))));
  }
  function sigue() { clearInterval(tic); tic = setInterval(async () => { if (!vivo) return clearInterval(tic); const firma = () => JSON.stringify([E.activa, E.pct, E.fase, E.txt, E.midiendo, (E.partes || []).map(p => p.bytes), E.tamanos]); const antes = firma(); await pide(); if (firma() !== antes) pinta(); if (!E.activa && !E.midiendo) clearInterval(tic); }, 1500); }
  mount(cuerpo, h('p.muted', 'Mirando qué hay en este ordenador…'));
  await pide(); if (E.hecho && !E.activa) { E.hecho = false; E.carpeta = ''; } // (una copia anterior ya terminada no tapa la pantalla de empezar)
  pinta(); sigue();
  return m;
}

// Configuración › Sistema › «Trasladar a otro ordenador» (solo administradoras: lo comprueba config.js)
export function seccionTraslado(b, card) {
  if (!desktop.on || !desktop.mudanza) {
    b.append(card(null, h('p', 'El traslado a otro ordenador se prepara desde el ', h('b', 'programa del ordenador'), ' (el que tiene los datos, las impresoras y la IA), no desde el móvil ni el navegador.')));
    return;
  }
  b.append(
    card('🖥️ Trasladar TODO a otro ordenador', h('p', { style: { margin: 0 } }, 'Para cuando este ordenador se vaya a jubilar o se estropee: prepara en un disco externo ', h('b', 'todo lo que vive en este ordenador'), ' para que otro sea el nuevo servidor y administrador.'),
      h('ul.small', { style: { margin: '4px 0' } }, h('li', 'El programa, tus ajustes y las copias de tus datos'), h('li', 'Tus carpetas de productos y las carpetas que este ordenador comparte en la red del taller (y las que tú añadas)'), h('li', 'Tus diseños de CelebriR8 y tus perfiles de Bambu Studio'), h('li', 'La IA (fotos, 3D y texto) y «Cómo nació tu pieza»'), h('li', 'Tus claves guardadas, cifradas con una clave que eliges tú')),
      h('p.small.muted', { style: { margin: 0 } }, 'Aquí no se borra ni se cambia nada. Comprueba la copia al terminar, y el ordenador nuevo la vuelve a comprobar archivo por archivo.'),
      h('div', btn('🖥️ Preparar el traslado', () => dialogoMudanza(), { cls: 'primary cfg-traslado' }))),
    card('Cómo es (3 pasos)', h('ol', { style: { margin: 0, paddingLeft: '20px' } },
      h('li', h('b', 'Aquí: '), '«Preparar el traslado» → elige un disco externo → espera a que ponga «terminada».'),
      h('li', h('b', 'En el ordenador nuevo: '), 'conecta el disco y haz doble clic en «RESTAURAR_EN_EL_PC_NUEVO». Lo instala y lo coloca todo; al final te ofrece compartir las carpetas en la red.'),
      h('li', h('b', 'Entra '), 'con tu usuario y pon la ', h('b', 'clave del traslado'), '. Después, en los otros ordenadores del taller cambia la carpeta de productos a la del nuevo (lo explica la guía).'))),
    card('¿Es este el ordenador NUEVO?', h('p.small.muted', { style: { margin: 0 } }, 'Si ya has restaurado aquí un traslado y quedaron claves por poner:'), h('div', btn('🔐 Poner las claves del traslado', () => clavesPendientes(true), { cls: 'sm traslado-claves' }))));
}
