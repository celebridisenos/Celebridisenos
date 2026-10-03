// ================= v12.3 · Pantalla TV del taller =================
// Para una tele o una tablet colgada en el taller. Solo lectura (sin botones peligrosos), se actualiza sola
// y NO se bloquea. Muestra el reloj, las impresoras con su progreso, lo que hay que enviar hoy y el avance de la meta
// (solo en %, nunca importes: la pantalla la puede ver cualquiera que pase por el taller).
import { h, mount, btn, toast, ago } from '../ui.js';
import { S, can, timing } from '../store.js';
import { go } from '../app.js';
import { bambuFor } from '../bambu.js';
import { anillo, resumenMes } from '../premium.js';
import { botonVoz } from '../voz.js';

const CL = window.CL;
const n = v => Number(v) || 0;
const ph = o => CL.phaseOf(S.cfg.pedidos, o.estado);

export function render(el) {
  document.body.classList.add('tv-on');
  const root = h('div.tv');
  el.appendChild(root);
  let T = null, wake = null, alive = true;
  const reloj = h('div.tv-hora'), fecha = h('div.tv-fecha');
  const cuerpo = h('div.tv-cuerpo');
  const salir = btn('Salir', () => go('hoy'), { cls: 'ghost sm', icon: 'x' });
  const full = btn('Pantalla completa', () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { toast('No se pudo', 'warn'); } }, { cls: 'ghost sm' });
  const vozB = botonVoz();
  const empresa = (S.cfg.empresa && S.cfg.empresa.nombre) || 'Taller';
  mount(root, h('header.tv-top', h('div', reloj, fecha), h('div.tv-marca', h('b', empresa), h('span', 'Taller en directo')), h('div.tv-ctl', vozB, full, salir)), cuerpo);

  const tickReloj = () => {
    const d = new Date();
    reloj.textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const f = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    fecha.textContent = f.charAt(0).toUpperCase() + f.slice(1);
  };
  const draw = async () => {
    if (!alive) return;
    T = T || await import('./taller.js');
    const imps = T.printers();
    const abiertos = S.t.pedidos.map(o => ({ o, t: timing(o) })).filter(x => x.t.abierto);
    const porImprimir = abiertos.filter(x => ph(x.o) === 'confirmado').length;
    const preparando = abiertos.filter(x => ph(x.o) === 'postpro' || ph(x.o) === 'empaquetar').length;
    const listos = abiertos.filter(x => ph(x.o) === 'listo').sort((a, b) => String(a.t.limite || '9').localeCompare(String(b.t.limite || '9')));
    const vencidos = abiertos.filter(x => x.t.nivel === 'late').length;

    const tarjetaImp = p => {
      const cur = T.nowOf(p.id), q = T.queueOf(p.id), live = bambuFor(p.id);
      let pc = 0, titulo = '', sub = '', cls = 'libre';
      if (cur) {
        const finP = T.liveFin(p.id) || cur.finPrevisto, t0 = new Date(cur.inicio).getTime(), t1 = new Date(finP).getTime();
        pc = live && live.conectada && live.pct !== undefined && live.pct !== '' ? Math.max(0, Math.min(1, n(live.pct) / 100)) : Math.max(0, Math.min(1, (Date.now() - t0) / Math.max(1, t1 - t0)));
        const tarde = t1 < Date.now();
        titulo = cur.titulo; sub = tarde ? '⏰ Debería haber terminado' : 'Quedan ' + T.hrs((t1 - Date.now()) / 3600000) + ' · ' + T.whenTxt(finP); cls = tarde ? 'tarde' : 'imprime';
      } else if (T.liveFin(p.id)) { titulo = 'Imprimiendo (lanzado desde la impresora)'; sub = 'Termina ' + T.whenTxt(T.liveFin(p.id)); cls = 'imprime'; pc = live && live.pct ? n(live.pct) / 100 : 0; }
      else if (p.estado === 'Mantenimiento') { titulo = '🔧 En mantenimiento'; cls = 'mant'; }
      else { titulo = q.length ? 'Libre · siguiente: ' + q[0].titulo : '💤 Libre'; }
      return h('div.tv-imp.' + cls, anillo(pc, 118, cur || cls === 'imprime' ? Math.round(pc * 100) + '%' : '·', ''), h('div.tv-imp-t', h('b', p.nombre), h('div.tv-imp-n.ellipsis2', titulo), sub ? h('div.tv-imp-s', sub) : null, q.length ? h('span.tv-cola', q.length + ' en cola') : null));
    };
    const R = can('informes.ver') ? resumenMes() : null;
    const ult = S.t.pedidos.filter(o => o.creado && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled).sort((a, b) => String(b.creado).localeCompare(String(a.creado)))[0];
    mount(cuerpo,
      h('section.tv-imps', imps.length ? imps.map(tarjetaImp) : h('p.tv-vacio', 'Añade tus impresoras en Impresión para verlas aquí.')),
      h('aside.tv-lado',
        h('div.tv-kpis',
          h('div.tv-k', h('b', String(porImprimir)), h('span', 'por imprimir')),
          h('div.tv-k', h('b', String(preparando)), h('span', 'preparando')),
          h('div.tv-k' + (listos.length ? '.ok' : ''), h('b', String(listos.length)), h('span', 'para enviar')),
          h('div.tv-k' + (vencidos ? '.bad' : ''), h('b', String(vencidos)), h('span', 'vencidos'))),
        listos.length ? h('div.tv-lista', h('h3', '📦 Salen hoy'), listos.slice(0, 6).map(x => h('div.tv-li', h('b', 'nº ' + x.o.numero), h('span.ellipsis', (n(x.o.cantidad) > 1 ? x.o.cantidad + ' × ' : '') + x.o.producto), h('small', x.t.texto)))) : h('div.tv-lista', h('h3', '📦 Salen hoy'), h('p.tv-vacio', 'Nada pendiente de enviar. ✅')),
        R && R.meta > 0 ? h('div.tv-meta', anillo(R.pct, 110, Math.round(R.pct * 100) + '%', 'meta'), h('div', h('b', 'Meta del mes'), h('div.small', R.pedidos + ' pedidos este mes'), R.pct >= 1 ? h('div.small', '🎉 ¡Conseguida!') : null)) : (R ? h('div.tv-meta', h('div', h('b', R.pedidos + ' pedidos este mes'), h('div.small', 'Pon una meta en Configuración → Juego'))) : null),
        ult ? h('div.tv-ult', '🛒 Último pedido ', h('b', ago(ult.creado)), ' · ', ult.producto) : null));
  };
  tickReloj(); draw();
  const t1 = setInterval(tickReloj, 10000), t2 = setInterval(() => { if (document.body.dataset.view === 'tv') draw(); }, 15000);
  // la pantalla no se apaga mientras esta vista esté abierta (si el dispositivo lo permite)
  const pedirWake = async () => { try { if (navigator.wakeLock && alive && !document.hidden) wake = await navigator.wakeLock.request('screen'); } catch (e) { } };
  pedirWake(); const vis = () => { if (!document.hidden) pedirWake(); }; document.addEventListener('visibilitychange', vis);
  return {
    update: draw,
    destroy: () => { alive = false; clearInterval(t1); clearInterval(t2); document.removeEventListener('visibilitychange', vis); try { wake && wake.release(); } catch (e) { } document.body.classList.remove('tv-on'); if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { } } }
  };
}
