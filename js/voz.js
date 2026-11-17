// ================= v12.3 · Voz del taller =================
// Te avisa HABLANDO (con la voz en español de tu equipo, sin internet ni servicios externos) cuando:
// entra un pedido, termina o falla una impresión, un pedido queda listo para enviar o llega un aviso importante
// (Wallapop/Vinted, incidencia, urgente). Apagada de fábrica y solo en ESTE dispositivo. No lee datos de contacto.
import { h, btn, toast } from './ui.js';
import { S, can, on } from './store.js';

const CL = window.CL;
const KEY = 'cd.voz';
const IMPORTANTES = { plataforma: 1, urgente: 1, incidencia: 1, seguridad: 1 };
export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
export function vozOn() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }

let cola = [], hablando = false;
function elegirVoz() {
  const vs = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  return vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
}
export function decir(texto) {
  if (!hayVoz() || !texto) return false;
  cola.push(String(texto).slice(0, 220));
  if (cola.length > 4) cola = cola.slice(-3).concat([]); // si hay demasiados a la vez, se conservan los últimos
  siguiente();
  return true;
}
function siguiente() {
  if (hablando || !cola.length) return;
  const t = cola.shift(); hablando = true;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'es-ES'; const v = elegirVoz(); if (v) u.voice = v;
  u.rate = 1; u.volume = 1;
  const fin = () => { hablando = false; siguiente(); };
  u.onend = fin; u.onerror = fin;
  try { speechSynthesis.speak(u); } catch (e) { fin(); }
}
export function setVoz(v) {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { }
  if (v) { if (!hayVoz()) { toast('Este dispositivo no tiene voz instalada', 'warn'); return false; } iniciarVoz(); escanear(true); decir('Voz del taller activada.'); } else { cola = []; try { speechSynthesis.cancel(); } catch (e) { } hablando = false; }
  return true;
}
// Botón reutilizable (Hoy, pantalla TV, paleta)
export function botonVoz(onChange) {
  if (!hayVoz()) return null;
  const b = btn('', () => { const v = !vozOn(); if (setVoz(v)) { pintar(); toast(v ? '🔊 Voz del taller activada' : '🔇 Voz del taller apagada'); onChange && onChange(v); } }, { cls: 'ghost' });
  const pintar = () => { b.textContent = vozOn() ? '🔊 Voz activa' : '🔇 Voz apagada'; b.setAttribute('aria-pressed', vozOn() ? 'true' : 'false'); b.title = 'Te aviso hablando de pedidos nuevos, impresiones y avisos importantes (solo en este dispositivo)'; };
  pintar();
  return b;
}

// ---------- Detección de novedades (sin aviso de lo que ya estaba al abrir) ----------
const vistos = { ped: new Set(), noti: new Set(), job: new Map(), listo: new Set(), listo0: false };
let armado = false, iniciado = false, pendiente = null;
const nombreImp = id => { const p = (S.t.impresoras || []).find(x => x.id === id); return p ? p.nombre : 'la impresora'; };
const limpio = s => String(s || '').replace(/[^\p{L}\p{N}\s.,:'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
function escanear(silencioso) {
  const frases = [];
  if (can('pedidos.ver')) {
    S.t.pedidos.forEach(o => {
      if (!vistos.ped.has(o.id)) { vistos.ped.add(o.id); if (!silencioso && !CL.stateOf(S.cfg.pedidos, o.estado).cancelled) frases.push('Nuevo pedido número ' + limpio(o.numero) + ': ' + (Number(o.cantidad) > 1 ? o.cantidad + ' ' : '') + limpio(o.producto)); }
      const ph = CL.phaseOf(S.cfg.pedidos, o.estado);
      if (ph === 'listo' && !vistos.listo.has(o.id)) { vistos.listo.add(o.id); if (!silencioso && vistos.listo0) frases.push('El pedido ' + limpio(o.numero) + ' está listo para enviar'); }
      if (ph !== 'listo') vistos.listo.delete(o.id);
    });
    vistos.listo0 = true;
  }
  if (can('taller.ver')) {
    (S.t.trabajos || []).forEach(j => {
      const prev = vistos.job.get(j.id); vistos.job.set(j.id, j.estado);
      if (silencioso || prev === undefined || prev === j.estado) return;
      if (j.estado === 'Terminado') frases.push('Impresión terminada en ' + limpio(nombreImp(j.impresoraId)) + ': ' + limpio(j.titulo));
      else if (j.estado === 'Fallido') frases.push('Atención: ha fallado una impresión en ' + limpio(nombreImp(j.impresoraId)));
    });
  }
  (S.t.notificaciones || []).forEach(nt => {
    if (vistos.noti.has(nt.id)) return; vistos.noti.add(nt.id);
    if (silencioso || nt.leida || !IMPORTANTES[nt.tipo]) return;
    frases.push('Aviso: ' + limpio(nt.titulo));
  });
  return frases;
}
export function iniciarVoz() {
  if (iniciado) return; iniciado = true;
  escanear(true); armado = true; // lo que ya existe al activar NO se lee
  on(() => { if (!vozOn() || !armado) return; clearTimeout(pendiente); pendiente = setTimeout(() => { escanear(false).forEach(decir); }, 400); });
}
export function startVoz() { if (vozOn() && hayVoz()) iniciarVoz(); }
export const _t = { escanear, vistos };
