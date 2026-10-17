// ================= 16-10-2026 · ENCARGOS NUEVOS PARA EL PC (desde el iPad y el móvil) =================
// Ella: «tiene que funcionar en la iPad sí o sí». Lo que el iPad no puede hacer solo, se lo encarga al PC del taller (trabajospc.js):
//   · modo 'vision'   → CelebriDREW «Diseñar desde una imagen»: el PC mira la foto con su IA de visión (drew/foto/vision_pc.js);
//   · modo 'catalogo' → «📄 Exportar catálogo»: el PC hace el PDF con Edge sin ventana y se lo devuelve (catalogo_exporta.js).
// El servidor de Google (18.0.0) solo admite encargos fondo / caras / reel / render / restaurar y no conviene obligarla a pegar uno
// nuevo: estos viajan como «caras» (ninguna pantalla lo usaba como encargo; avisa con un «✅ Encargo listo» neutro y borra sola la
// foto o la página de trabajo y el resultado cuando el iPad lo ha recibido).
import { registrarTrabajo } from './trabajospc.js';
import { desktop } from './desktop.js';

registrarTrabajo('caras', async () => desktop.on, async (job, progreso) => {
  const modo = (job.entrada || {}).modo;
  if (modo === 'vision') return (await import('./drew/foto/vision_pc.js')).atiende(job, progreso);
  if (modo === 'catalogo') return (await import('./catalogo_exporta.js')).atiendePC(job, progreso);
  throw new Error('Este PC no sabe hacer ese encargo (' + (modo || 'sin modo') + ').');
});
