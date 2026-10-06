// ================= v13.12 · BIOUVISION · FILTROS: los de serie, los de tu carpeta RECURSOS y los que cargues =================
import { parseCube, parseXmp, lutDePreset, esLutLog } from './lut.js';
import { desktop } from '../desktop.js';
import { kv } from '../store.js';

// Filtros de serie (se convierten en LUT igual que un preset de Lightroom)
const P = o => ({ nombre: o.nombre, grupo: 'Biouvision', p: o.p, curvas: {} });
export const LOOKS = [
  P({ nombre: 'Luminoso', p: { Exposure2012: '0.25', Highlights2012: '-30', Shadows2012: '+35', Vibrance: '+18', Clarity2012: '+8' } }),
  P({ nombre: 'Cálido película', p: { IncrementalTemperature: '+22', Contrast2012: '+12', Shadows2012: '+10', Saturation: '-8', SplitToningShadowHue: '200', SplitToningShadowSaturation: '12', SplitToningHighlightHue: '40', SplitToningHighlightSaturation: '18', GrainAmount: '12', PostCropVignetteAmount: '-15' } }),
  P({ nombre: 'Teal & Orange', p: { Contrast2012: '+18', HueAdjustmentOrange: '-6', SaturationAdjustmentOrange: '+15', HueAdjustmentBlue: '-12', HueAdjustmentAqua: '+20', SplitToningShadowHue: '190', SplitToningShadowSaturation: '30', SplitToningHighlightHue: '35', SplitToningHighlightSaturation: '22' } }),
  P({ nombre: 'Fresco', p: { IncrementalTemperature: '-14', Vibrance: '+20', Highlights2012: '-20', Whites2012: '+10' } }),
  P({ nombre: 'Matte suave', p: { Contrast2012: '-18', Blacks2012: '+40', Shadows2012: '+15', Saturation: '-12', ParametricShadows: '+25' } }),
  P({ nombre: 'Vintage', p: { IncrementalTemperature: '+15', Saturation: '-25', Contrast2012: '-8', Blacks2012: '+30', SplitToningShadowHue: '30', SplitToningShadowSaturation: '20', GrainAmount: '25', PostCropVignetteAmount: '-25' } }),
  P({ nombre: 'Vivo', p: { Vibrance: '+35', Saturation: '+8', Contrast2012: '+15', Clarity2012: '+15' } }),
  P({ nombre: 'Rosa pastel', p: { IncrementalTint: '+12', Exposure2012: '0.15', Contrast2012: '-12', Saturation: '-10', SplitToningHighlightHue: '340', SplitToningHighlightSaturation: '20' } }),
  P({ nombre: 'Cine', p: { Contrast2012: '+22', Highlights2012: '-35', Shadows2012: '-10', Saturation: '-15', SplitToningShadowHue: '205', SplitToningShadowSaturation: '25', SplitToningHighlightHue: '45', SplitToningHighlightSaturation: '12', PostCropVignetteAmount: '-20' } }),
  P({ nombre: 'Blanco y negro', p: { Saturation: '-100', Contrast2012: '+20', Clarity2012: '+12' } }),
  P({ nombre: 'B/N suave', p: { Saturation: '-100', Contrast2012: '-10', Blacks2012: '+25' } })
];
const cacheLut = new Map();
export function lutDeLook(l) { if (!cacheLut.has('look:' + l.nombre)) cacheLut.set('look:' + l.nombre, lutDePreset(l, 25)); return cacheLut.get('look:' + l.nombre); }

// ---------- Carpeta RECURSOS (programa del PC) ----------
const ext = n => String(n).split('.').pop().toLowerCase();
const sep = p => (String(p).includes('\\') ? '\\' : '/');
const padre = p => String(p).replace(/[\\/][^\\/]+[\\/]?$/, '');
export async function carpetaRecursos() {
  if (!desktop.on) return '';
  const g = await desktop.getConfig('biou.recursos'); if (g) return g;
  try { // se busca «RECURSOS» subiendo desde la carpeta de las copias (…\CELEBRIDISENOS\00_SISTEMA\…)
    const info = await desktop.info(); let p = String((info && info.backupDir) || '');
    const busca = async q => { try { const l = await desktop.list(q); const r = (l.entries || []).find(x => x.type === 'dir' && /^recursos$/i.test(x.name)); return r ? r.path : ''; } catch (e) { return ''; } };
    for (let i = 0; i < 5 && p; i++) {
      p = padre(p); const r = await busca(p); if (r) return r;
      // v15.0: las copias están en …\AppData\Local\CelebriDisenos: la carpeta del negocio suele estar en el Escritorio
      const s = sep(p);
      for (const esc of ['Desktop', 'Escritorio', 'OneDrive' + s + 'Desktop', 'OneDrive' + s + 'Escritorio']) { const r2 = await busca(p + s + esc + s + 'CELEBRIDISENOS'); if (r2) return r2; }
    }
  } catch (e) { }
  return '';
}
export async function elegirCarpeta() { const r = await desktop.pickFolder(); const p = r && (r.path || r); if (p) await desktop.setConfig('biou.recursos', p); return p || ''; }
// Lista los .cube y .xmp de la carpeta (hasta 5 niveles). Los LUT pensados para vídeo LOG se marcan aparte.
export async function escanear(raiz, alAvanzar) {
  const out = [], pend = [[raiz, 0]]; let vistas = 0;
  while (pend.length && out.length < 3000) {
    const [p, nv] = pend.shift(); let l;
    try { l = await desktop.list(p); } catch (e) { continue; }
    const items = l.entries || []; vistas++;
    for (const x of items) {
      if (x.type === 'dir') { if (nv < 5 && !/^(sfx|fuentes|fonts|audio)$/i.test(x.name)) pend.push([x.path, nv + 1]); continue; }
      const e = ext(x.name); if (e !== 'cube' && e !== 'xmp') continue;
      if (e === 'cube' && x.size > 4.5 * 1048576) continue; // demasiado grandes para fotos (LUT de cine de 65³)
      const rel = String(x.path).slice(String(raiz).length + 1), partes = rel.split(/[\\/]/);
      out.push({ id: x.path, path: x.path, nombre: x.name.replace(/\.(cube|xmp)$/i, ''), grupo: partes.slice(0, -1).filter(s => !/^(luts|lightroom)$/i.test(s)).join(' › ') || 'RECURSOS', tipo: e, log: e === 'cube' && esLutLog(x.name), size: x.size });
    }
    if (alAvanzar) alAvanzar(out.length, vistas);
  }
  return out;
}
// ---------- Filtros cargados a mano (móvil u otro ordenador): se guardan en este aparato ----------
export async function misFiltros() { try { return (await kv.get('biou.filtros')) || []; } catch (e) { return []; } }
export async function anadirArchivos(files) {
  const lista = await misFiltros(); let n = 0;
  for (const f of files) {
    const e = ext(f.name); if ((e !== 'cube' && e !== 'xmp') || f.size > 4.5 * 1048576) continue;
    const texto = await f.text();
    try { if (e === 'cube') parseCube(texto); else parseXmp(texto); } catch (x) { continue; }
    const id = 'mio:' + f.name; const i = lista.findIndex(x => x.id === id); const it = { id, nombre: f.name.replace(/\.(cube|xmp)$/i, ''), grupo: 'Cargados por ti', tipo: e, texto, log: e === 'cube' && esLutLog(f.name) };
    if (i >= 0) lista[i] = it; else lista.push(it); n++;
  }
  await kv.set('biou.filtros', lista.slice(-200));
  return n;
}
export async function quitarMio(id) { const l = (await misFiltros()).filter(x => x.id !== id); await kv.set('biou.filtros', l); }
// Lee un filtro (de la carpeta o de los guardados) y devuelve su LUT
export async function lutDe(item) {
  if (cacheLut.has(item.id)) return cacheLut.get(item.id);
  let texto = item.texto;
  if (!texto) { const buf = await desktop.file(item.path); texto = new TextDecoder().decode(buf); }
  const lut = item.tipo === 'cube' ? parseCube(texto) : lutDePreset(parseXmp(texto), 25);
  if (cacheLut.size > 40) cacheLut.delete(cacheLut.keys().next().value);
  cacheLut.set(item.id, lut); return lut;
}
