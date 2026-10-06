// ================= v13.12 · MI PUESTO DEL MERCADO 🧺 (sustituye a la «Subasta de encargos») =================
// El dueño pidió cambiar la subasta: «no se entiende, no compras nada real, solo puntos».
// Ahora: tienes un puesto en el mercadillo del barrio. Llegan clientes (dibujados en pixel, como en Vida) y te piden cosas.
// Tocas lo que piden para meterlo en su bolsa y pulsas «Cobrar». Rápido = propina. 90 segundos por partida.
// Lo que ganas va DE VERDAD a la hucha de tu personaje de Vida (3 partidas pagadas al día; el servidor lo comprueba).
import { h, btn, toast } from '../ui.js';
import { pon, llamar, cargando, cabecera, fiesta } from './kit.js';
import * as PXL from './vida_pixel.js';

export const meta = { id: 'puesto', titulo: 'Mi puesto del mercado', emoji: '🧺', desc: 'Atiende a los clientes de tu puesto. Lo que ganas va a tu personaje de Vida.' };

const PRODUCTOS = [
  { id: 'lechuga', i: '🥬', t: 'Lechuga' }, { id: 'zanahoria', i: '🥕', t: 'Zanahoria' }, { id: 'tomate', i: '🍅', t: 'Tomate' }, { id: 'fresa', i: '🍓', t: 'Fresas' },
  { id: 'maiz', i: '🌽', t: 'Maíz' }, { id: 'girasol', i: '🌻', t: 'Girasol' }, { id: 'calabaza', i: '🎃', t: 'Calabaza' }, { id: 'manzana', i: '🍎', t: 'Manzana' },
  { id: 'pan', i: '🥖', t: 'Pan' }, { id: 'queso', i: '🧀', t: 'Queso' }, { id: 'huevos', i: '🥚', t: 'Huevos' }, { id: 'miel', i: '🍯', t: 'Miel' }
];
const NOMBRES = ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Martina', 'Leo', 'Valeria', 'Pablo', 'Carmen', 'Álex', 'Noa', 'Dani', 'Abuela Pepa', 'Don Ramón', 'Irene', 'Bruno'];
const FRASES = ['¡Hola! Quería…', '¡Buenas! Me pones…', 'Vengo a por…', 'Para la cena necesito…', '¿Tienes…?', 'Ponme, por favor…'];
const PIELES = ['#f6d2b8', '#eac4a4', '#d9a77f', '#b77b55', '#8d5a3b', '#5c3a24'], PELOS = ['#3b2a20', '#111827', '#a16207', '#f59e0b', '#b91c1c', '#6b7280', '#e5e7eb', '#7c3aed'];
const ROPAS = ['#ef4444', '#f59e0b', '#22c55e', '#0ea5e9', '#6366f1', '#ec4899', '#14b8a6', '#f8fafc', '#1f2937'], PEINADOS = ['largo', 'coletas', 'media', 'mono', 'corto', 'flequillo', 'despeinado'];
const DURACION = 90;
const azar = a => a[Math.floor(Math.random() * a.length)];

function retrato(look) {
  const sp = PXL.personaje(look, 'd', 0), c = document.createElement('canvas'); c.width = sp.width * 6; c.height = sp.height * 6;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sp, 0, 0, c.width, c.height); c.className = 'pu-pj'; return c;
}

export function render(el) {
  let vivo = true, timers = [];
  const raiz = h('div.pu'); el.append(raiz);
  const limpiar = () => { timers.forEach(t => clearInterval(t)); timers = []; };

  async function inicio() {
    limpiar();
    pon(raiz, cargando('Montando el puesto…'));
    let info = null, sinVida = false;
    try { info = await llamar('vida.estado', {}, { silencio: true }); sinVida = !info || !info.vida; } catch (e) { sinVida = true; }
    if (!vivo) return;
    const nombre = info && info.vida ? info.vida.nombre : '';
    const hoy = info && info.vida && info.vida.puestoDia && info.vida.puestoDia.dia === new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10) ? info.vida.puestoDia.n : 0;
    pon(raiz, cabecera('🧺 Mi puesto del mercado', 'Atiende a tus clientes antes de que se cansen de esperar'),
      h('div.jg-card.pu-intro',
        h('div.pu-toldo'),
        h('ol.pu-pasos', h('li', '🙋 Llega un cliente y te dice lo que quiere (por ejemplo 🍅 × 2 y 🥖 × 1).'), h('li', '👆 Toca los productos de tu mostrador para meterlos en su bolsa (si te equivocas, toca lo de la bolsa para quitarlo).'), h('li', '💶 Pulsa «Cobrar». Si está bien, se va contento y llega otro. Si tarda mucho, se marcha enfadado.'), h('li', '⏱️ Tienes ' + DURACION + ' segundos. Cuanto más rápido atiendes, más propina.')),
        sinVida ? h('p.small.pu-aviso', '🌸 Aún no tienes personaje en Vida: puedes jugar, pero para cobrar de verdad crea tu personaje en el juego Vida.')
          : h('p.small.pu-aviso', '💰 Lo que ganes va a la hucha de ' + nombre + ' en Vida (3 monedas por cliente + propinas). Partidas que cobras hoy: ' + Math.max(0, 3 - hoy) + ' de 3.'),
        btn('▶️ Abrir el puesto', () => empezar(sinVida), { cls: 'primary pu-abrir' })));
  }

  async function empezar(sinVida) {
    let token = null;
    if (!sinVida) { try { const r = await llamar('vida.puesto', {}); token = r.puesto && r.puesto.token; } catch (e) { return; } }
    if (!vivo) return;
    let servidos = 0, propinas = 0, enfadados = 0, resta = DURACION, cliente = null, bolsa = {}, nivel = 1, fin = false;
    const reloj = h('b.pu-reloj', DURACION + ' s'), marcador = h('b.pu-marc', '😊 0'), dinero = h('b.pu-din', '💰 0');
    const zonaCliente = h('div.pu-cliente'), zonaBolsa = h('div.pu-bolsa'), paciencia = h('div.pu-pac', h('i'));
    const cobrar = btn('💶 Cobrar', () => cobrarCliente(), { cls: 'primary pu-cobrar' });
    const mostrador = h('div.pu-mostrador', PRODUCTOS.map(p => h('button.pu-prod', { type: 'button', 'data-prod': p.id, title: p.t, onclick: e => { if (fin || !cliente) return; bolsa[p.id] = (bolsa[p.id] || 0) + 1; salto(e.currentTarget); pintaBolsa(); } }, h('span.pu-prod-i', p.i), h('span.tiny', p.t))));
    pon(raiz, h('div.pu-juego', h('div.pu-barra', reloj, marcador, dinero, btn('✕', () => terminar(true), { cls: 'sm ghost', title: 'Cerrar el puesto' })),
      h('div.pu-escena', h('div.pu-toldo'), zonaCliente, paciencia), h('div.pu-zona-bolsa', h('div.lbl', '🛍️ Bolsa del cliente'), zonaBolsa, cobrar), mostrador));
    const salto = b => { b.classList.remove('pum'); void b.offsetWidth; b.classList.add('pum'); };
    function nuevoCliente() {
      const n = Math.min(4, 1 + Math.floor(nivel / 3) + (Math.random() < 0.35 ? 1 : 0)), pide = {};
      const cuantos = Math.min(PRODUCTOS.length, 6 + nivel);
      for (let i = 0; i < n; i++) { const p = PRODUCTOS[Math.floor(Math.random() * cuantos)]; pide[p.id] = (pide[p.id] || 0) + (Math.random() < 0.25 + nivel * 0.03 ? 2 : 1); }
      const look = { piel: azar(PIELES), pelo: azar(PELOS), peinado: azar(PEINADOS), top: azar(ROPAS), bajo: azar(ROPAS), zapatos: azar(ROPAS), nino: Math.random() < 0.15 };
      cliente = { nombre: azar(NOMBRES), frase: azar(FRASES), pide, look, t0: Date.now(), pac: Math.max(9000, 20000 - nivel * 900) };
      bolsa = {}; pintaCliente(); pintaBolsa();
    }
    function pintaCliente() {
      const c = cliente; if (!c) return zonaCliente.replaceChildren();
      zonaCliente.replaceChildren(h('div.pu-pj-caja.llega', retrato(c.look)), h('div.pu-bocadillo', h('div.small.muted', c.nombre + ': ' + c.frase),
        h('div.pu-pide', Object.entries(c.pide).map(([id, n]) => { const p = PRODUCTOS.find(x => x.id === id); return h('span.pu-pedido', { 'data-pide': id }, p.i, h('b', '× ' + n)); }))));
    }
    function pintaBolsa() {
      const items = Object.entries(bolsa).filter(([, n]) => n > 0);
      zonaBolsa.replaceChildren(...(items.length ? items.map(([id, n]) => { const p = PRODUCTOS.find(x => x.id === id), ok = cliente && cliente.pide[id] === n, mas = cliente && n > (cliente.pide[id] || 0);
        return h('button.pu-en-bolsa' + (ok ? '.ok' : mas ? '.mal' : ''), { type: 'button', title: 'Quitar uno', onclick: () => { bolsa[id]--; pintaBolsa(); } }, p.i, h('b', '× ' + n)); }) : [h('span.small.muted', 'Vacía: toca los productos de abajo')]));
      if (cliente) zonaCliente.querySelectorAll('.pu-pedido').forEach(x => x.classList.toggle('hecho', bolsa[x.dataset.pide] === cliente.pide[x.dataset.pide]));
    }
    function cobrarCliente() {
      if (fin || !cliente) return;
      const ok = Object.keys(cliente.pide).every(id => bolsa[id] === cliente.pide[id]) && Object.keys(bolsa).every(id => !bolsa[id] || cliente.pide[id] === bolsa[id]);
      if (!ok) { cliente.t0 -= cliente.pac * 0.25; zonaBolsa.classList.remove('tiembla'); void zonaBolsa.offsetWidth; zonaBolsa.classList.add('tiembla'); toast('🤔 Eso no es lo que ha pedido', 'warn', 1400); return; }
      const f = 1 - (Date.now() - cliente.t0) / cliente.pac, prop = f > 0.6 && propinas < 15 ? 1 : 0;
      servidos++; propinas += prop; nivel++;
      globo(prop ? '😄 ¡Gracias! +3 💰 +1 propina' : '🙂 ¡Gracias! +3 💰', 'bien');
      marca(); nuevoCliente();
    }
    function globo(txt, cls) { const g = h('div.pu-globo.' + cls, txt); raiz.querySelector('.pu-escena').appendChild(g); setTimeout(() => g.remove(), 1300); }
    const marca = () => { marcador.textContent = '😊 ' + servidos + (enfadados ? ' · 😤 ' + enfadados : ''); dinero.textContent = '💰 ' + (servidos * 3 + propinas); };
    nuevoCliente();
    timers.push(setInterval(() => {
      if (!vivo || fin) return;
      if (!raiz.isConnected) return limpiar();
      if (cliente) { const f = Math.max(0, 1 - (Date.now() - cliente.t0) / cliente.pac); paciencia.firstChild.style.width = (f * 100) + '%'; paciencia.classList.toggle('poca', f < 0.3);
        if (f <= 0) { enfadados++; globo('😤 ¡Me voy, qué lento!', 'mal'); marca(); nuevoCliente(); } }
    }, 100));
    timers.push(setInterval(() => { if (!vivo || fin) return; resta--; reloj.textContent = resta + ' s'; reloj.classList.toggle('poco', resta <= 10); if (resta <= 0) terminar(false); }, 1000));
    window.__cdPuesto = { get cliente() { return cliente; }, servir: () => { if (!cliente) return; bolsa = Object.assign({}, cliente.pide); pintaBolsa(); cobrarCliente(); }, acabar: () => { resta = 1; } };

    async function terminar(cerrado) {
      if (fin) return; fin = true; limpiar();
      let r = null;
      if (token) { try { r = await llamar('vida.puesto', { token, servidos, propinas }); } catch (e) { r = null; } }
      if (!vivo) return;
      if (r && r.monedas >= 30) fiesta(document.body);
      pon(raiz, cabecera('🧺 Cierre del puesto', cerrado ? 'Has cerrado antes de tiempo' : '¡Se acabó el tiempo!'),
        h('div.jg-card.pu-fin', h('div.jg-stats', h('div.jg-stat', h('b', String(servidos)), h('span', 'clientes contentos')), h('div.jg-stat', h('b', String(enfadados)), h('span', 'se fueron enfadados')), h('div.jg-stat', h('b', String(propinas)), h('span', 'propinas'))),
          r ? h('p.pu-cobro', r.msg || '') : token ? h('p.small.muted', 'No se ha podido cobrar esta partida.') : h('p.small.muted', 'Partida de prueba (sin personaje de Vida no se cobra).'),
          h('div.row.wrap', { style: { gap: '8px' } }, btn('🔁 Otra partida', () => empezar(!token), { cls: 'primary' }), btn('Volver', inicio, { cls: 'ghost' }))));
    }
  }
  inicio();
  return { destroy() { vivo = false; limpiar(); } };
}
