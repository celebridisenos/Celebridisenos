// ================= 16-10-2026 · ENCARGOS NUEVOS PARA EL PC (desde el iPad y el móvil) =================
// Ella: «tiene que funcionar en la iPad sí o sí». Lo que el iPad no puede hacer solo, se lo encarga al PC del taller (trabajospc.js):
//   · modo 'catalogo' → «📄 Exportar catálogo»: el PC hace el PDF con Edge sin ventana y se lo devuelve (catalogo_exporta.js).
//   (28-10-2026: los encargos de CelebriDREW —«vision», «claude», «manual»— se quitaron con él)
// El servidor de Google (18.0.0) solo admite encargos fondo / caras / reel / render / restaurar y no conviene obligarla a pegar uno
// nuevo: estos viajan como «caras» (ninguna pantalla lo usaba como encargo; avisa con un «✅ Encargo listo» neutro y borra sola la
// foto o la página de trabajo y el resultado cuando el iPad lo ha recibido).
import { registrarTrabajo } from './trabajospc.js';
import { desktop } from './desktop.js';

registrarTrabajo('caras', async () => desktop.on, async (job, progreso) => {
  const modo = (job.entrada || {}).modo;
  if (modo === 'catalogo') return (await import('./catalogo_exporta.js')).atiendePC(job, progreso);
  if (['vision', 'claude', 'manual'].includes(modo)) throw new Error('Ese encargo era de CelebriDREW, que ya no está en el programa.');
  throw new Error('Este PC no sabe hacer ese encargo (' + (modo || 'sin modo') + ').');
});
