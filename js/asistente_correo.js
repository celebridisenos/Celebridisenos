// ================= v15.1 · ASISTENTE «CONECTAR UNA CUENTA A LA BANDEJA» =================
// 4 pasos con «Siguiente →» y al final «Terminado»: 1 plataforma · 2 correo · 3 reenvío · 4 código y ✅ conectada.
// Letras grandes, una cosa por pantalla y un botón «Copiar» al lado de todo lo que hay que pegar.
// Por dentro usa la bandeja de la 14.1 (correo.conectar apunta la cuenta y enciende la bandeja; correo.codigo
// busca el código de Google de ESE correo en el Gmail del programa).
import { h, mount, btn, modal, toast, inp, copyText } from './ui.js';
import { api, pull, S, emit } from './store.js';

const PLATS = [
  { p: 'Vinted', e: '🟦', de: 'vinted.com' },
  { p: 'Wallapop', e: '🟢', de: 'wallapop.com' },
  { p: 'Etsy', e: '🟠', de: 'etsy.com' },
  { p: 'eBay', e: '🔵', de: 'ebay.com OR ebay.es' },
  { p: 'Milanuncios', e: '🟧', de: 'milanuncios.com' },
  { p: 'Otra', e: '🔖', de: '' }
];
const PASOS = ['Plataforma', 'Correo', 'Reenvío', 'Código'];
const tipoCorreo = e => /@(gmail|googlemail)\.com$/i.test(e) ? 'gmail' : /@(hotmail|outlook|live|msn)\.[a-z.]+$/i.test(e) ? 'outlook' : 'otro';
const abrir = u => { try { window.open(u, '_blank', 'noopener'); } catch (e) { } };

// Devuelve una promesa que se resuelve con true si se conectó alguna cuenta
export function abrirAsistenteCorreo(opts = {}) {
  return new Promise(resolve => {
    let paso = 0, st = null, conectada = false, conectadas = false, sondeo = null, intentos = 0;
    const d = { plataforma: opts.plataforma || '', dominio: '', correo: opts.correo || '', nombre: opts.nombre || '', codigo: null, llegan: false, verificado: false };
    const cuerpo = h('div.ac');
    const pie = h('div.ac-pie');
    const m = modal('📬 Conectar una cuenta a la bandeja', h('div', cuerpo), pie, { size: 'wide', onclose: () => { parar(); resolve(conectadas); } });
    m.el.classList.add('ac-modal');
    const parar = () => { if (sondeo) { clearTimeout(sondeo); sondeo = null; } };
    const plat = () => PLATS.find(x => x.p === d.plataforma) || PLATS[PLATS.length - 1];
    const filtroDe = () => plat().de || d.dominio;

    const barra = () => h('ol.ac-barra', { 'aria-label': 'Pasos' }, PASOS.map((t, i) => h('li' + (i < paso ? '.hecho' : i === paso ? '.ahora' : ''), { 'aria-current': i === paso ? 'step' : null }, h('b', i < paso ? '✓' : String(i + 1)), h('span', t))));
    const copiar = (texto, etiqueta) => h('div.ac-copiar', h('code', texto), btn('📋 Copiar', () => copyText(texto), { cls: 'primary', title: 'Copiar ' + (etiqueta || '') }));
    const piePasos = (sig, txtSig, extra) => mount(pie, paso > 0 && !conectada ? btn('← Atrás', () => { parar(); paso--; pinta(); }, { cls: 'ghost ac-atras' }) : h('span'), h('div.grow'), extra || null, sig ? btn(txtSig || 'Siguiente →', sig, { cls: 'primary ac-sig' }) : null);

    async function cargar() {
      mount(cuerpo, h('p.ac-grande', 'Un momento…'));
      try { st = await api('correo.asistente', {}); } catch (e) { mount(cuerpo, h('p.bad-t', e.message)); mount(pie, btn('Cerrar', m.close)); return; }
      pinta();
    }

    function pinta() {
      parar();
      if (!st.permiso) return pintaPermiso();
      [pinta1, pinta2, pinta3, pinta4][paso]();
      const f = cuerpo.querySelector('input'); if (f && paso === 1) setTimeout(() => f.focus(), 30);
    }

    // Antes de nada: el permiso de Google para leer el Gmail del programa (una sola vez, en el ordenador)
    function pintaPermiso() {
      mount(cuerpo, h('div.ac-aviso', h('h3', '🔑 Antes, un permiso de Google (solo una vez)'),
        h('p.ac-grande', 'El programa necesita permiso para leer los avisos que llegan a su Gmail. Se hace en el ordenador:'),
        h('ol.ac-lista',
          h('li', 'Abre ', h('b', 'script.google.com'), ' y entra en el proyecto de CelebriDiseños.'),
          h('li', 'Arriba, elige la función ', h('b', 'autorizarCorreo'), ' y pulsa ', h('b', 'Ejecutar'), '.'),
          h('li', 'Acepta lo que pida Google. Si sale «Google no ha verificado esta aplicación»: ', h('b', 'Configuración avanzada → Ir a CelebriDiseños'), '.')),
        h('p.small.muted', 'Si al ejecutar dice que falta el permiso de Gmail, primero pon el archivo appsscript_con_correo.json (lo explica el LEEME de la carpeta del programa).'),
        st.error ? h('p.small.warn-t', st.error) : null));
      piePasos(async ev => { const b = ev.currentTarget; b.disabled = true; await cargar(); if (st && !st.permiso) toast('Todavía no tiene el permiso. Revisa los pasos.', 'warn', 6000); }, '🔄 Ya lo he hecho, comprobar');
    }

    // 1 · ¿De qué plataforma es la cuenta?
    function pinta1() {
      const ya = (st.cuentas || []).filter(c => c.correo);
      mount(cuerpo, barra(), h('h3.ac-tit', '¿De qué plataforma es la cuenta?'),
        h('div.ac-plats', PLATS.map(x => h('button.ac-plat' + (d.plataforma === x.p ? '.on' : ''), { type: 'button', 'data-plat': x.p, 'aria-pressed': String(d.plataforma === x.p), onclick: () => { d.plataforma = x.p; pinta(); } }, h('span.e', x.e), h('span', x.p)))),
        !plat().de && d.plataforma ? h('div.ac-campo', h('label', '¿De qué web llegan sus avisos?'), (() => { const i = inp({ value: d.dominio, placeholder: 'milanuncios.com', 'aria-label': 'Web de la plataforma' }); i.oninput = () => { d.dominio = i.value.trim(); }; return i; })()) : null,
        ya.length ? h('div.ac-ya', h('h4', 'Cuentas que ya tienes'), ya.map(c => h('div.ac-ya-f', h('span', (PLATS.find(x => x.p === c.plataforma) || {}).e || '🔖', ' ', h('b', c.plataforma + ' · ' + c.nombre), ' ', h('span.muted', c.correo)), c.llegan ? h('span.ok-t', '✅ Conectada') : h('span.muted', 'Aún no ha llegado nada')))) : null);
      piePasos(() => {
        if (!d.plataforma) return toast('Toca una plataforma.', 'warn');
        if (!plat().de && !/\.[a-z]{2,}$/i.test(d.dominio)) return toast('Escribe la web (por ejemplo milanuncios.com).', 'warn');
        paso = 1; pinta();
      });
    }

    // 2 · El correo de esa cuenta (y un nombre para reconocerla)
    function pinta2() {
      const co = inp({ type: 'email', value: d.correo, placeholder: 'ana@gmail.com', 'aria-label': 'Correo de la cuenta', autocomplete: 'off' });
      const no = inp({ value: d.nombre, placeholder: 'Ana', 'aria-label': 'Nombre para reconocerla', maxlength: 30 });
      co.oninput = () => { d.correo = co.value.trim(); if (!no.dataset.tocado) { no.value = d.correo.split('@')[0] || ''; d.nombre = no.value; } };
      no.oninput = () => { d.nombre = no.value; no.dataset.tocado = '1'; };
      mount(cuerpo, barra(), h('h3.ac-tit', plat().e + ' ¿Qué correo usa tu cuenta de ' + d.plataforma + '?'),
        h('p.ac-grande', 'Es el correo al que te llegan los avisos de ' + d.plataforma + ' (ventas, mensajes…).'),
        h('div.ac-campo', h('label', 'Correo de la cuenta'), co),
        h('div.ac-campo', h('label', 'Un nombre para reconocerla'), no, h('span.hint', 'Por ejemplo «Ana» o «Tienda 2». Saldrá así en la bandeja y en los pedidos.')),
        h('p.small.muted', '🔒 No hace falta ninguna contraseña.'));
      piePasos(async ev => {
        const b = ev.currentTarget;
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.correo)) return toast('Escribe bien el correo (por ejemplo ana@gmail.com).', 'warn');
        b.disabled = true;
        try {
          const r = await api('correo.conectar', { plataforma: d.plataforma, dominio: d.dominio || plat().de.split(' OR ')[0], correo: d.correo, nombre: d.nombre });
          if (r.config) { S.cfg = r.config; emit(); }
          st.correoServidor = r.correoServidor || st.correoServidor; d.dominio = r.dominio; d.nombre = r.cuenta.nombre;
          paso = 2; pinta();
        } catch (e) { toast(e.message, 'bad', 7000); b.disabled = false; }
      });
    }

    // 3 · Que ese correo reenvíe los avisos al Gmail del programa
    function pinta3() {
      const t = tipoCorreo(d.correo), g = st.correoServidor || '(el Gmail del programa)';
      let pasos;
      if (t === 'gmail') pasos = [
        h('li', btn('🔗 Abrir los ajustes de reenvío de ' + d.correo, () => abrir('https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(d.correo) + '#settings/fwdandpop'), { cls: 'ac-enlace' }), h('div.tiny.muted', 'Si no se abre: Gmail → ⚙️ → Ver todos los ajustes → Reenvío y correo POP/IMAP.')),
        h('li', 'Pulsa ', h('b', 'Añadir una dirección de reenvío'), ' y pega esto:', copiar(g, 'el Gmail del programa')),
        h('li', 'Pulsa ', h('b', 'Siguiente'), ', luego ', h('b', 'Continuar'), ' y ', h('b', 'Aceptar'), '.'),
        h('li', 'Google manda un código. ', h('b', 'No lo busques: te sale aquí en el paso 4.'))];
      else if (t === 'outlook') pasos = [
        h('li', btn('🔗 Abrir las reglas de ' + d.correo, () => abrir('https://outlook.live.com/mail/0/options/mail/rules'), { cls: 'ac-enlace' }), h('div.tiny.muted', 'Si no se abre: Outlook → ⚙️ Configuración → Correo → Reglas.')),
        h('li', 'Pulsa ', h('b', 'Agregar nueva regla'), '. Nombre: ', h('b', 'Bandeja ' + d.plataforma), '.'),
        h('li', 'Condición: ', h('b', 'De'), ' → pega esto:', copiar(filtroDe().split(' OR ')[0], 'la web')),
        h('li', 'Acción: ', h('b', 'Reenviar a'), ' → pega esto:', copiar(g, 'el Gmail del programa')),
        h('li', 'Pulsa ', h('b', 'Guardar'), '.')];
      else pasos = [
        h('li', 'Entra en tu correo ', h('b', d.correo), ' y busca ', h('b', '«reenvío automático»'), ' o ', h('b', '«reglas»'), '.'),
        h('li', 'Haz que los correos que vienen ', h('b', 'de'), ' esta web:', copiar(filtroDe().split(' OR ')[0], 'la web')),
        h('li', 'se ', h('b', 'reenvíen'), ' a esta dirección:', copiar(g, 'el Gmail del programa')),
        h('li', 'Guarda. Si te piden un código de confirmación, saldrá aquí en el paso 4.')];
      mount(cuerpo, barra(), h('h3.ac-tit', '↪️ Que ' + d.correo + ' reenvíe los avisos al programa'),
        h('p.ac-grande', 'Hazlo en el correo de la cuenta. Ve paso a paso:'), h('ol.ac-lista', pasos));
      piePasos(() => { paso = 3; pinta(); });
    }

    // 4 · El código de Google (Gmail) y la regla para que SOLO pasen los avisos de la plataforma
    function pinta4() {
      const t = tipoCorreo(d.correo);
      if (conectada) return pintaFin();
      if (t !== 'gmail') {
        mount(cuerpo, barra(), h('h3.ac-tit', '🔎 ¿Te ha pedido un código?'),
          h('p.ac-grande', 'Hotmail y otros correos normalmente no piden código. Si te lo han pedido, lo verás aquí:'), zonaCodigo(),
          h('p.ac-grande', 'Si no te han pedido nada, ya está. Pulsa ', h('b', 'Terminado'), '.'));
        piePasos(() => { conectada = true; pinta(); }, '✅ Terminado');
        buscar(false);
        return;
      }
      if (!d.verificado) {
        mount(cuerpo, barra(), h('h3.ac-tit', '🔢 El código de Google'), zonaCodigo());
        piePasos(d.codigo ? () => { d.verificado = true; pinta(); } : null, 'Ya lo he pegado y verificado →');
        buscar(false);
        return;
      }
      // último: el filtro de Gmail para que solo se reenvíen los avisos de esta plataforma
      mount(cuerpo, barra(), h('h3.ac-tit', '🧹 Último: que solo pasen los avisos de ' + d.plataforma),
        h('p.ac-grande', 'Así tus correos personales no llegan al programa. En el Gmail de ' + d.correo + ':'),
        h('ol.ac-lista',
          h('li', btn('🔗 Abrir el buscador de filtros de Gmail', () => abrir('https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(d.correo) + '#create-filter/from=' + encodeURIComponent(filtroDe())), { cls: 'ac-enlace' }),
            h('div.tiny.muted', 'Si no se abre: en la barra de búsqueda de Gmail pulsa «Mostrar opciones de búsqueda» (a la derecha).')),
          h('li', 'En ', h('b', 'De'), ' tiene que poner esto:', copiar(filtroDe(), 'el remitente')),
          h('li', 'Pulsa ', h('b', 'Crear filtro'), ', marca ', h('b', 'Reenviarlo a'), ', elige ', h('b', st.correoServidor || 'el Gmail del programa'), ' y pulsa ', h('b', 'Crear filtro'), '.')));
      piePasos(() => { conectada = true; pinta(); }, '✅ Terminado');
    }

    function zonaCodigo() {
      const z = h('div.ac-codigo', { 'aria-live': 'polite' });
      const pintaZ = () => {
        if (d.codigo && d.codigo.codigo) mount(z, h('p.ac-grande', 'Ha llegado el código para ', h('b', d.correo), ':'), h('div.ac-num', d.codigo.codigo),
          h('div.row.wrap', { style: { gap: '10px', justifyContent: 'center' } }, btn('📋 Copiar el código', () => copyText(d.codigo.codigo), { cls: 'primary' }), d.codigo.enlace ? btn('🔗 O confirmar con el enlace de Google', () => abrir(d.codigo.enlace)) : null),
          h('p.ac-grande', 'Vuelve a la pantalla de Gmail donde lo pide, pégalo y pulsa ', h('b', 'Verificar'), '.'));
        else mount(z, h('div.ac-espera', h('span.ac-spin', { 'aria-hidden': 'true' }), h('span', 'Esperando el código de Google…')),
          h('p.small.muted', 'Llega en uno o dos minutos. Se busca solo; también puedes pulsar:'), btn('🔄 Buscar ahora', () => buscar(true), { cls: 'sm' }));
      };
      z.__pinta = pintaZ; pintaZ();
      return z;
    }
    async function buscar(manual) {
      parar();
      try {
        const r = await api('correo.codigo', { correo: d.correo, revisar: manual });
        if (!r.permiso) { st.permiso = false; st.error = r.error; return pinta(); }
        const nuevo = r.codigos && r.codigos[0];
        if (r.llegan) d.llegan = true;
        if (nuevo && (!d.codigo || d.codigo.codigo !== nuevo.codigo)) { d.codigo = nuevo; pinta(); return; }
        if (manual) toast(nuevo ? 'El código ya está en pantalla.' : 'Todavía no ha llegado. Espera un poco.', nuevo ? 'ok' : 'warn');
      } catch (e) { if (manual) toast(e.message, 'bad'); }
      if (paso === 3 && !conectada && !d.verificado && document.body.contains(m.el) && ++intentos < 60) sondeo = setTimeout(() => buscar(false), 15000);
    }

    function pintaFin() {
      mount(cuerpo, h('div.ac-fin', h('div.ac-ok', '✅'), h('h3', 'Cuenta conectada'),
        h('p.ac-grande', h('b', plat().e + ' ' + d.plataforma + ' · ' + d.nombre), ' (' + d.correo + ')'),
        h('p.ac-grande', 'Desde ahora sus avisos (ventas, mensajes, ofertas…) llegan a ', h('b', '📬 Bandeja de ventas'), '. El programa mira el correo cada 5 minutos.'),
        d.llegan ? h('p.ok-t', '✅ Ya ha llegado su primer aviso.') : h('p.small.muted', 'Cuando llegue el primer aviso, al lado de la cuenta pondrá «✅ Conectada».')));
      mount(pie, btn('➕ Conectar otra cuenta', () => { Object.assign(d, { plataforma: '', dominio: '', correo: '', nombre: '', codigo: null, llegan: false, verificado: false }); conectada = false; paso = 0; intentos = 0; cargar(); }, { cls: 'ghost' }), h('div.grow'),
        btn('Terminado', () => { pull().catch(() => { }); m.close(); }, { cls: 'primary ac-sig' }));
      conectadas = true;
    }
    cargar();
  });
}
