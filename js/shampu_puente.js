// ================= 17-11-2026 · 🤖 PUENTE DE SHAMPÚ (en el PC que está en casa) =================
// Desde la calle el móvil no puede hablar con Shampú: está en la wifi de casa. El programa del PC de casa (la torre o el portátil) hace de puente:
// pregunta al servidor de Google si alguien quiere ver a Shampú (shampu.puente), le pregunta a Shampú por la red de casa y sube lo que ve.
//   · nadie mirando: una pregunta al servidor cada 15 s y el estado de Shampú (sin foto) una vez por minuto;
//   · alguien mirando: estado + foto pequeña de la cámara cada ~3 s, las impresoras cada 10 s, las fotos cada 30 s, y hace sus órdenes.
// Una sola ventana por PC (navigator.locks) y un solo PC a la vez (el servidor le dice «ceder» al segundo). El ESP32 nunca recibe dos preguntas a la vez.
import { S, api, can } from './store.js';
import { desktop } from './desktop.js';

export const PUENTE = { estado: 'apagado', mirando: false, error: '', vueltas: 0, ordenes: 0 }; // para la pantalla y las pruebas
window.__shampuPuente = PUENTE;

let on = false;
export function startShampuPuente() {
  if (on || !desktop.on || !desktop.shampu) return;
  on = true;
  if (navigator.locks && navigator.locks.request) { navigator.locks.request('cd-shampu-puente', () => new Promise(() => bucle())).catch(() => bucle()); return; }
  bucle();
}

// La foto de la cámara, pequeña para que viaje rápido (≈ 15–30 KB)
export async function fotoPequena(blob, maxLado = 480, calidad = 0.62) {
  const bm = await createImageBitmap(blob);
  const k = Math.min(1, maxLado / Math.max(bm.width, bm.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k));
  c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); if (bm.close) bm.close();
  let url = c.toDataURL('image/jpeg', calidad);
  if (url.length > 90000) url = c.toDataURL('image/jpeg', 0.45);
  return url;
}
async function traer(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('Shampú no da la foto (' + r.status + ')'); return r.blob(); }

function bucle() {
  const Sh = desktop.shampu, hechas = new Map(); // id → resultado (para no repetir una orden si se perdió la respuesta)
  let pendientes = [], ultEstado = 0, ultImp = 0, ultLista = 0, imp = null, lista = null, veo = false; // veo: este PC llega a Shampú (el portátil fuera de casa, no)
  const vuelta = async () => {
    let espera = 15000;
    try {
      if (!(S.token && can('ia.servidor') && localStorage.getItem('cd.shampuPuente') !== '0')) { PUENTE.estado = 'apagado'; return; }
      const ahora = Date.now(), resultados = {}, fotos = {};
      // 1) las órdenes que trajo la vuelta anterior
      for (const o of pendientes.splice(0)) {
        if (hechas.has(o.id)) { resultados[o.id] = hechas.get(o.id); continue; }
        let r;
        try {
          if (o.foto) fotos[o.foto] = await fotoPequena(await traer(Sh.fUrl(o.foto)), 1024, 0.72);
          else if (o.pantalla !== undefined) fotos['pantalla_' + o.id + '.jpg'] = await fotoPequena(await traer(Sh.pantallaUrl(o.pantalla, o.e)), 480, 0.85); // lo que enseña su pantalla
          else await Sh.orden({ o: o.o, vol: o.vol, lamp: o.lamp, brillo: o.brillo, di: o.di, pc: o.pc, alerta: o.alerta, c: o.c });
          r = { ok: true };
        } catch (e) { r = { ok: false, error: e.message || String(e) }; }
        hechas.set(o.id, r); resultados[o.id] = r; PUENTE.ordenes++;
        if (hechas.size > 60) hechas.delete(hechas.keys().next().value);
      }
      // 2) lo que ve Shampú (si alguien mira, todo; si no, solo el estado cada minuto)
      let snap = null;
      if (PUENTE.mirando || ahora - ultEstado > 60000 || Object.keys(resultados).length) {
        const e = await Sh.estado().catch(err => ({ ok: false, error: err.message }));
        ultEstado = ahora; veo = !!e.ok;
        if (!e.ok) snap = { t: new Date().toISOString(), ok: false, error: e.error || 'Shampú no contesta' };
        else {
          if (PUENTE.mirando && ahora - ultImp > 10000) { const x = await Sh.imp().catch(() => null); if (x && x.ok) imp = x.impresoras; ultImp = ahora; }
          if ((PUENTE.mirando || !lista) && ahora - ultLista > 30000) { const x = await Sh.lista().catch(() => null); if (x && x.ok) lista = x.fotos.slice(0, 60); ultLista = ahora; }
          snap = { t: new Date().toISOString(), ok: true, estado: e.estado, impresoras: imp, fotos: lista };
          if (PUENTE.mirando) { try { snap.foto = await fotoPequena(await traer(Sh.fotoUrl())); snap.fotoT = new Date().toISOString(); } catch (err) { snap.fotoError = err.message; } }
        }
      }
      const r = await api('shampu.puente', { dispositivo: S.device, snap, fotos, resultados, sinShampu: !veo }, { quiet: true, timeout: 30000 });
      PUENTE.vueltas++; PUENTE.error = '';
      if (r && r.ceder) { PUENTE.estado = 'otro PC (' + r.puente + ')'; PUENTE.mirando = false; espera = 30000; return; }
      PUENTE.estado = veo ? 'puente' : 'puente (sin ver a Shampú)'; PUENTE.mirando = !!(r && r.mira);
      pendientes = (r && r.ordenes) || [];
      espera = pendientes.length ? 300 : PUENTE.mirando ? 2500 : 15000;
    } catch (e) {
      PUENTE.error = e.message || String(e);
      if (/Acción desconocida/.test(PUENTE.error)) { PUENTE.estado = 'servidor viejo (falta pegar el 18.9.0)'; espera = 600000; } // sin el servidor nuevo no se insiste
      else espera = 30000;
    } finally { setTimeout(vuelta, espera); }
  };
  setTimeout(vuelta, 7000);
}
