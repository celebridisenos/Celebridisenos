// ================= Roles: nombres, descripciones y selector =================
// El selector de rol es una rejilla de tarjetas (no un desplegable del sistema): se ve
// entero en cualquier tamaño de pantalla, nunca queda detrás de otros elementos y se
// maneja igual con ratón, teclado o dedo.
import { h } from './ui.js';
import { S } from './store.js';

export const ROLE_INFO = {
  admin: { t: 'Administrador', i: '👑', d: 'Todo: configuración, usuarios, copias, borrar, IA, biblioteca y redes.' },
  responsable: { t: 'Gerente', i: '🧭', d: 'Pedidos, clientes, productos y costes, tareas, noticias, redes, informes y biblioteca. Sin configuración ni borrados.' },
  ventas: { t: 'Ventas', i: '💬', d: 'Crear y seguir pedidos, clientes con sus datos, costes para dar precios, informes y preparar redes.' },
  soporte: { t: 'Soporte', i: '🛟', d: 'Atender pedidos e incidencias y ver datos de contacto de clientes. Sin costes ni informes de ventas.' },
  trabajador: { t: 'Empleado', i: '🛠️', d: 'Ver pedidos y cambiar su estado, tareas, subir fotos, noticias y chat. Sin datos personales ni costes.' },
  usuario: { t: 'Usuario', i: '👀', d: 'Solo consulta: pedidos, productos, tareas, noticias, biblioteca y chat. No puede cambiar nada.' }
};

export function roleLabel(id) {
  const r = (S._roles || []).find(x => x.id === id);
  return r ? r.nombre : (ROLE_INFO[id] ? ROLE_INFO[id].t : id);
}

// roles: [{id, nombre}] (si no se pasa, los de fábrica). Devuelve un elemento con .value
export function rolePicker(roles, value, onchange) {
  const list = (roles && roles.length ? roles : Object.keys(ROLE_INFO).map(id => ({ id, nombre: ROLE_INFO[id].t })));
  let cur = value || (list[0] && list[0].id);
  const name = 'rol_' + Math.random().toString(36).slice(2, 8);
  const box = h('div.role-picker', { role: 'radiogroup', 'aria-label': 'Rol' });
  const draw = () => {
    box.innerHTML = '';
    list.forEach(r => {
      const info = ROLE_INFO[r.id] || { i: '🔑', d: 'Rol personalizado: permisos definidos en Configuración > Roles y permisos.' };
      const inp = h('input', { type: 'radio', name, value: r.id, checked: r.id === cur, onchange: () => { cur = r.id; draw(); onchange && onchange(cur); } });
      box.appendChild(h('label.role-opt' + (r.id === cur ? '.on' : ''), inp, h('span.ri', info.i), h('span.rt', h('b', r.nombre), h('small', info.d))));
    });
  };
  draw();
  Object.defineProperty(box, 'value', { get: () => cur, set: v => { cur = v; draw(); } });
  return box;
}
