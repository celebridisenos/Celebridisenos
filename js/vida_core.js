// ================= v13.6 · VIDA — lógica compartida (servidor + app) =================
// El SERVIDOR es quien aplica todas las acciones y guarda la partida (server/31_vida.gs); la app usa este mismo archivo
// solo para dibujar (edad, etapa, necesidades al momento, catálogo). Así nadie puede darse dinero tocando el JavaScript.
// REGLA DEL TIEMPO: 1 día real = 1 año de vida del personaje. Las necesidades bajan con el tiempo real.
// TODO ES DATOS: casas, muebles, ropa, coches, mascotas, trabajos, eventos e historia inicial están en tablas de aquí abajo:
// para ampliar el juego se añaden filas, no código. ES5 puro (como shared/logic.js).
var VIDA = (function () {
  var DIA = 86400000, HORA = 3600000, MIN = 60000;
  var NEC = ['hambre', 'energia', 'diversion', 'higiene', 'social'];
  var NEC_TXT = { hambre: 'Comida', energia: 'Energía', diversion: 'Diversión', higiene: 'Higiene', social: 'Amigos' };
  var BAJA_HORA = { hambre: 7, energia: 5, diversion: 6, higiene: 4, social: 3 }; // puntos que baja cada hora real

  // ---------- Etapas de la vida ----------
  var ETAPAS = [
    { id: 'bebe', t: 'Bebé', desde: 0 }, { id: 'nino', t: 'Infancia', desde: 3 }, { id: 'adolescente', t: 'Adolescencia', desde: 12 },
    { id: 'joven', t: 'Juventud', desde: 18 }, { id: 'adulto', t: 'Edad adulta', desde: 30 }, { id: 'mayor', t: 'Madurez', desde: 65 }
  ];
  function edad(s, now) { return Math.max(0, (now - s.nacido) / DIA); }
  function etapa(e) { var r = ETAPAS[0]; for (var i = 0; i < ETAPAS.length; i++) if (e >= ETAPAS[i].desde) r = ETAPAS[i]; return r; }

  // ---------- Historia inicial: 4 decisiones. La última (la estrella) decide si nace chico o chica ----------
  var HISTORIA = [
    { id: 'lugar', texto: 'Una noche de octubre, en algún lugar de España, alguien está a punto de nacer. ¿Dónde?', opciones: [
      { t: 'En una ciudad junto al mar', ciudad: 'Valencia', rasgo: { social: 1 }, pelo: '#3b2a20' },
      { t: 'En la gran ciudad', ciudad: 'Madrid', rasgo: { cerebro: 1 }, pelo: '#1d1a24' },
      { t: 'En un pueblo de montaña', ciudad: 'un pueblo de Asturias', rasgo: { energia: 1 }, pelo: '#7a4a2a' },
      { t: 'En una ciudad con mucho sol', ciudad: 'Sevilla', rasgo: { creatividad: 1 }, pelo: '#5a3220' }] },
    { id: 'familia', texto: '¿Cómo es tu familia?', opciones: [
      { t: 'Tienen un pequeño taller de impresión 3D', familia: 'media', dinero: 300, rasgo: { creatividad: 2 } },
      { t: 'Son médicos y siempre están estudiando', familia: 'acomodada', dinero: 600, rasgo: { cerebro: 2 } },
      { t: 'Una familia numerosa y muy ruidosa', familia: 'humilde', dinero: 120, rasgo: { social: 2 } },
      { t: 'Viajan mucho y nunca se están quietos', familia: 'media', dinero: 300, rasgo: { energia: 2 } }] },
    { id: 'primer', texto: 'La comadrona sonríe: «¡Qué bebé tan…!»', opciones: [
      { t: '…curioso: mira todo con los ojos muy abiertos', rasgo: { cerebro: 1 }, ojos: '#3b82f6' },
      { t: '…risueño: no para de reír', rasgo: { social: 1 }, ojos: '#a16207' },
      { t: '…fuerte: agarra el dedo con fuerza', rasgo: { energia: 1 }, ojos: '#16a34a' },
      { t: '…tranquilo: escucha la música de la radio', rasgo: { creatividad: 1 }, ojos: '#7c3aed' }] },
    { id: 'estrella', texto: 'Justo al nacer cae una estrella fugaz. ¿Hacia dónde cae?', opciones: [
      { t: 'Hacia el mar 🌊', sexo: 'chica', aviso: '¡Es una niña!' },
      { t: 'Hacia las montañas ⛰️', sexo: 'chico', aviso: '¡Es un niño!' }] }
  ];
  var NOMBRES = { chica: ['Lucía', 'Sofía', 'Martina', 'Valeria', 'Alba', 'Noa', 'Carla', 'Emma', 'Julia', 'Aitana'], chico: ['Hugo', 'Leo', 'Mateo', 'Martín', 'Lucas', 'Pablo', 'Álex', 'Daniel', 'Marco', 'Izan'] };
  var PIELES = ['#fde7d6', '#f6d2b8', '#e9b892', '#c98e62', '#8d5a3b'];

  // ---------- Catálogo ----------
  // precio en monedas de la Vida; fichas = artículo PREMIUM (se paga con fichas ⏱, no con monedas). edad = edad mínima.
  var CASAS = [
    { id: 'familia', t: 'Casa de tu familia', precio: 0, huecos: 3, edad: 0, d: 'Tu cuarto en casa de la familia.' },
    { id: 'habitacion', t: 'Habitación alquilada', precio: 600, huecos: 4, edad: 18, d: 'Pequeña, pero es tuya.' },
    { id: 'estudio', t: 'Estudio en el centro', precio: 3500, huecos: 6, edad: 18, d: 'Luminoso y cerca de todo.' },
    { id: 'piso', t: 'Piso con balcón', precio: 12000, huecos: 8, edad: 18, d: 'Dos habitaciones y balcón con plantas.' },
    { id: 'casa', t: 'Casa con jardín', precio: 30000, huecos: 11, edad: 18, d: 'Jardín para la mascota y mucho espacio.' },
    { id: 'atico', t: 'Ático con vistas', fichas: 60, huecos: 13, edad: 18, d: 'PREMIUM · terraza con vistas a toda la ciudad.' }
  ];
  var MUEBLES = [
    { id: 'cama', t: 'Cama sencilla', precio: 60, bono: { energia: 5 }, i: '🛏️' },
    { id: 'cama_grande', t: 'Cama grande y mullida', precio: 350, bono: { energia: 15 }, i: '🛌' },
    { id: 'escritorio', t: 'Escritorio', precio: 120, bono: { estudio: 10 }, i: '🗄️' },
    { id: 'estanteria', t: 'Estantería de libros', precio: 90, bono: { estudio: 5 }, i: '📚' },
    { id: 'sofa', t: 'Sofá', precio: 250, bono: { diversion: 6, social: 4 }, i: '🛋️' },
    { id: 'tele', t: 'Televisión', precio: 300, bono: { diversion: 10 }, i: '📺' },
    { id: 'consola', t: 'Videoconsola', precio: 420, bono: { diversion: 15 }, i: '🎮' },
    { id: 'nevera', t: 'Nevera llena', precio: 320, bono: { hambre: 10 }, i: '🧊' },
    { id: 'cocina', t: 'Cocina completa', precio: 700, bono: { hambre: 18 }, i: '🍳' },
    { id: 'banera', t: 'Bañera', precio: 480, bono: { higiene: 15 }, i: '🛁' },
    { id: 'planta', t: 'Planta grande', precio: 30, bono: { diversion: 2 }, i: '🪴' },
    { id: 'alfombra', t: 'Alfombra suave', precio: 70, bono: { social: 2 }, i: '🟫' },
    { id: 'guitarra', t: 'Guitarra', precio: 180, bono: { diversion: 8 }, i: '🎸' },
    { id: 'lampara_luna', t: 'Lámpara luna', fichas: 15, bono: { energia: 6, diversion: 4 }, i: '🌙' },
    { id: 'impresora3d', t: 'Impresora 3D', fichas: 25, bono: { diversion: 10, estudio: 10 }, i: '🖨️' },
    { id: 'acuario', t: 'Acuario', fichas: 20, bono: { diversion: 8, social: 4 }, i: '🐠' }
  ];
  // ropa: parte = top | bajo | zapatos | accesorio ; color = el del dibujo
  var ROPA = [
    { id: 'top_blanca', t: 'Camiseta blanca', parte: 'top', precio: 0, color: '#f8fafc' },
    { id: 'top_rosa', t: 'Camiseta rosa', parte: 'top', precio: 20, color: '#f472b6' },
    { id: 'top_azul', t: 'Sudadera azul', parte: 'top', precio: 45, color: '#3b82f6', estilo: 'sudadera' },
    { id: 'top_amarilla', t: 'Jersey mostaza', parte: 'top', precio: 40, color: '#eab308' },
    { id: 'top_uniforme', t: 'Uniforme marinero', parte: 'top', precio: 60, color: '#1e3a8a', estilo: 'marinero' },
    { id: 'top_chaqueta', t: 'Chaqueta vaquera', parte: 'top', precio: 80, color: '#60a5fa', estilo: 'chaqueta' },
    { id: 'top_kimono', t: 'Kimono de sakura', parte: 'top', fichas: 20, color: '#fbcfe8', estilo: 'kimono' },
    { id: 'bajo_vaquero', t: 'Vaqueros', parte: 'bajo', precio: 0, color: '#1e40af' },
    { id: 'bajo_falda', t: 'Falda de cuadros', parte: 'bajo', precio: 35, color: '#b91c1c', estilo: 'falda' },
    { id: 'bajo_negro', t: 'Pantalón negro', parte: 'bajo', precio: 30, color: '#111827' },
    { id: 'bajo_corto', t: 'Pantalón corto', parte: 'bajo', precio: 20, color: '#65a30d', estilo: 'corto' },
    { id: 'zap_deportivas', t: 'Deportivas', parte: 'zapatos', precio: 0, color: '#e5e7eb' },
    { id: 'zap_botas', t: 'Botas', parte: 'zapatos', precio: 55, color: '#78350f' },
    { id: 'zap_rojas', t: 'Zapatillas rojas', parte: 'zapatos', precio: 45, color: '#dc2626' },
    { id: 'acc_gafas', t: 'Gafas redondas', parte: 'accesorio', precio: 25, color: '#111827', estilo: 'gafas' },
    { id: 'acc_lazo', t: 'Lazo grande', parte: 'accesorio', precio: 15, color: '#ec4899', estilo: 'lazo' },
    { id: 'acc_gorra', t: 'Gorra', parte: 'accesorio', precio: 20, color: '#16a34a', estilo: 'gorra' },
    { id: 'acc_cascos_gato', t: 'Cascos con orejas de gato', parte: 'accesorio', fichas: 15, color: '#a855f7', estilo: 'gato' }
  ];
  var PEINADOS = { chica: ['largo', 'coletas', 'media', 'mono'], chico: ['corto', 'flequillo', 'despeinado', 'largo'] };
  var COCHES = [
    { id: 'bici', t: 'Bicicleta', precio: 150, edad: 8, bono: 5, i: '🚲' },
    { id: 'patinete', t: 'Patinete eléctrico', precio: 350, edad: 14, bono: 8, i: '🛴' },
    { id: 'coche_usado', t: 'Coche de segunda mano', precio: 4500, edad: 18, carne: true, bono: 15, i: '🚗' },
    { id: 'coche_nuevo', t: 'Coche nuevo', precio: 16000, edad: 18, carne: true, bono: 22, i: '🚙' },
    { id: 'deportivo', t: 'Deportivo rosa', fichas: 80, edad: 18, carne: true, bono: 30, i: '🏎️' }
  ];
  var MASCOTAS = [
    { id: 'pez', t: 'Pez', precio: 30, edad: 4, i: '🐟' },
    { id: 'conejo', t: 'Conejo', precio: 80, edad: 6, i: '🐰' },
    { id: 'gato', t: 'Gato', precio: 150, edad: 6, i: '🐱' },
    { id: 'perro', t: 'Perro', precio: 200, edad: 8, i: '🐶' },
    { id: 'loro', t: 'Loro', precio: 260, edad: 10, i: '🦜' },
    { id: 'zorro', t: 'Zorrito de fuego', fichas: 40, edad: 6, i: '🦊', d: 'PREMIUM · un zorro mágico que brilla de noche.' }
  ];
  // juego = minijuego del turno: calculo | memoria | reflejos | orden | patron
  var TRABAJOS = [
    { id: 'canguro', t: 'Canguro', edad: 14, estudios: 0, sueldo: 12, juego: 'memoria', i: '🍼' },
    { id: 'folletos', t: 'Repartir folletos', edad: 14, estudios: 0, sueldo: 10, juego: 'reflejos', i: '📄' },
    { id: 'camarero', t: 'Camarero/a', edad: 16, estudios: 5, sueldo: 22, juego: 'orden', i: '☕' },
    { id: 'cajero', t: 'Cajero/a', edad: 16, estudios: 10, sueldo: 25, juego: 'calculo', i: '🧾' },
    { id: 'repartidor', t: 'Repartidor/a', edad: 18, estudios: 10, sueldo: 30, juego: 'memoria', vehiculo: true, i: '📦' },
    { id: 'cocinero', t: 'Cocinero/a', edad: 18, estudios: 25, sueldo: 36, juego: 'orden', i: '👩‍🍳' },
    { id: 'maker', t: 'Diseñador/a 3D', edad: 18, estudios: 40, sueldo: 46, juego: 'reflejos', i: '🖨️' },
    { id: 'programador', t: 'Programador/a', edad: 18, estudios: 60, sueldo: 60, juego: 'patron', i: '💻' },
    { id: 'veterinario', t: 'Veterinario/a', edad: 22, estudios: 75, sueldo: 70, juego: 'memoria', mascota: true, i: '🐾' },
    { id: 'medico', t: 'Médico/a', edad: 24, estudios: 85, sueldo: 85, juego: 'orden', i: '🩺' }
  ];
  var ACCIONES = {
    comer: { t: 'Comer', nec: 'hambre', mas: 40, cd: 20, coste: 6, i: '🍝' },
    dormir: { t: 'Dormir', nec: 'energia', mas: 65, cd: 180, coste: 0, i: '😴' },
    ducha: { t: 'Ducharse', nec: 'higiene', mas: 60, cd: 60, coste: 0, i: '🚿' },
    ocio: { t: 'Divertirse', nec: 'diversion', mas: 38, cd: 30, coste: 0, i: '🎈' },
    amigos: { t: 'Quedar con amigos', nec: 'social', mas: 42, cd: 60, coste: 8, i: '🧋' }
  };
  // Eventos: uno como mucho cada 6 h reales. ef = efectos (dinero, necesidades, salud, estudios, rasgo)
  var EVENTOS = [
    { id: 'cartera', edad: [8, 99], t: 'Encuentras una cartera en la calle con 50 monedas y un DNI.', o: [{ t: 'La llevo a la policía', ef: { social: 10, rasgo: 'social' }, r: 'La dueña te lo agradece muchísimo.' }, { t: 'Me quedo el dinero', ef: { dinero: 50, salud: -5 }, r: 'Tienes el dinero… y un poco de mala conciencia.' }] },
    { id: 'concierto', edad: [12, 99], t: 'Unos amigos te invitan a un concierto esta noche (20 monedas).', o: [{ t: '¡Vamos!', ef: { dinero: -20, diversion: 30, social: 25, energia: -15 }, r: '¡Noche inolvidable!' }, { t: 'Mejor me quedo', ef: { energia: 15 }, r: 'Descansas bien.' }] },
    { id: 'examen', edad: [6, 25], t: 'Mañana hay examen sorpresa.', o: [{ t: 'Estudio esta noche', ef: { estudios: 4, energia: -15 }, r: 'Sabes casi todas las respuestas.' }, { t: 'Confío en mi suerte', ef: { diversion: 10, estudios: -1 }, r: 'Regular… la próxima vez estudias.' }] },
    { id: 'lluvia', edad: [3, 99], t: 'Te pilla una tormenta sin paraguas.', o: [{ t: 'Corro a casa', ef: { higiene: -20, energia: -5 }, r: 'Llegas empapado/a.' }, { t: 'Bailo bajo la lluvia', ef: { diversion: 25, higiene: -30, salud: -3 }, r: '¡Momento de película!' }] },
    { id: 'vecina', edad: [10, 99], t: 'Tu vecina mayor necesita ayuda con la compra.', o: [{ t: 'La ayudo', ef: { social: 15, energia: -8, dinero: 5 }, r: 'Te da las gracias y un bizcocho.' }, { t: 'Tengo prisa', ef: {}, r: 'Otra vez será.' }] },
    { id: 'concurso', edad: [8, 99], t: 'Hay un concurso de dibujo en el barrio.', o: [{ t: 'Me apunto', ef: { diversion: 15, dinero: 30, rasgo: 'creatividad' }, r: '¡Segundo premio! 30 monedas.' }, { t: 'No me apetece', ef: {}, r: 'Lo ves desde fuera.' }] },
    { id: 'resfriado', edad: [0, 99], t: 'Te notas la garganta rara…', o: [{ t: 'Me tomo algo caliente y descanso', ef: { energia: 10, salud: 5 }, r: 'Al día siguiente estás mejor.' }, { t: 'Sigo como si nada', ef: { salud: -10 }, r: 'Te pasas el día estornudando.' }] },
    { id: 'oferta', edad: [16, 99], t: 'Ves unas zapatillas de oferta en una tienda.', o: [{ t: 'Me las compro (40)', ef: { dinero: -40, diversion: 12 }, r: 'Te quedan genial.' }, { t: 'Ahorro', ef: { dinero: 0 }, r: 'Tu hucha te lo agradece.' }] },
    { id: 'cumple_amigo', edad: [5, 99], t: 'Es el cumpleaños de tu mejor amigo/a.', o: [{ t: 'Le hago un regalo (15)', ef: { dinero: -15, social: 25 }, r: '¡Le encanta!' }, { t: 'Le felicito con un mensaje', ef: { social: 5 }, r: 'Algo es algo.' }] },
    { id: 'deporte', edad: [6, 70], t: 'Te proponen apuntarte a un equipo de baloncesto.', o: [{ t: 'Me apunto', ef: { energia: -10, salud: 8, social: 10, rasgo: 'energia' }, r: 'Ganas en forma y amigos.' }, { t: 'Prefiero el sofá', ef: { diversion: 8 }, r: 'Sofá y serie.' }] },
    { id: 'curso', edad: [16, 99], t: 'Hay un curso online de diseño 3D por 60 monedas.', o: [{ t: 'Lo hago', ef: { dinero: -60, estudios: 6, rasgo: 'cerebro' }, r: 'Aprendes un montón.' }, { t: 'Ahora no', ef: {}, r: 'Quizá más adelante.' }] },
    { id: 'premio', edad: [10, 99], t: 'Te toca un pequeño sorteo del barrio.', o: [{ t: '¡Genial!', ef: { dinero: 80, diversion: 10 }, r: '+80 monedas.' }] },
    { id: 'mascota_triste', edad: [6, 99], mascota: true, t: 'Tu mascota está algo triste hoy.', o: [{ t: 'Paso la tarde con ella', ef: { mascota: 30, diversion: 10 }, r: 'Vuelve a estar contenta.' }, { t: 'Le compro un juguete (15)', ef: { dinero: -15, mascota: 40 }, r: '¡Le encanta su juguete!' }] },
    { id: 'mudanza_amigo', edad: [8, 99], t: 'Un amigo se muda y te pide ayuda.', o: [{ t: 'Ayudo con las cajas', ef: { energia: -20, social: 20 }, r: 'Acabáis con pizza.' }, { t: 'Le mando ánimo', ef: { social: 3 }, r: 'Lo entiende.' }] },
    { id: 'bebe_paseo', edad: [0, 3], t: 'Tu familia te lleva al parque en el carrito.', o: [{ t: 'Mirar los patos 🦆', ef: { diversion: 20 }, r: '¡Patos!' }, { t: 'Echarse una siesta', ef: { energia: 20 }, r: 'Qué bien se duerme al sol.' }] },
    { id: 'bebe_palabra', edad: [1, 3], t: 'Hoy podrías decir tu primera palabra…', o: [{ t: '«¡Mamá!»', ef: { social: 15 }, r: '¡Todos aplauden!' }, { t: '«¡Agua!»', ef: { hambre: 10, rasgo: 'cerebro' }, r: 'Práctico y directo.' }] },
    { id: 'jubilacion', edad: [65, 120], t: 'Te ofrecen dar clases en el centro cultural.', o: [{ t: 'Acepto', ef: { social: 20, dinero: 40 }, r: 'Tus alumnos te adoran.' }, { t: 'Prefiero descansar', ef: { energia: 20 }, r: 'Te lo has ganado.' }] }
  ];
  // ---------- v13.9 · EL BARRIO: comida de verdad, sitios del mundo, premios y escenas VIP ----------
  // ef = lo que sube o baja (necesidades, salud). Precio en monedas (de pequeño paga la familia).
  var COMIDA = [
    { id: 'manzana', t: 'Manzana', i: '🍎', precio: 2, ef: { hambre: 12, salud: 2 }, en: ['mercado'] },
    { id: 'croissant', t: 'Cruasán', i: '🥐', precio: 4, ef: { hambre: 20, energia: 6 }, en: ['mercado', 'cafe'] },
    { id: 'zumo', t: 'Zumo de naranja', i: '🧃', precio: 3, ef: { energia: 12, salud: 1 }, en: ['mercado', 'cafe'] },
    { id: 'bocadillo', t: 'Bocadillo de tortilla', i: '🥪', precio: 6, ef: { hambre: 38 }, en: ['mercado', 'cafe'] },
    { id: 'ensalada', t: 'Ensalada', i: '🥗', precio: 7, ef: { hambre: 30, salud: 4 }, en: ['mercado'] },
    { id: 'pizza', t: 'Pizza', i: '🍕', precio: 10, ef: { hambre: 45, diversion: 6 }, en: ['mercado'] },
    { id: 'hamburguesa', t: 'Hamburguesa', i: '🍔', precio: 10, ef: { hambre: 50, salud: -2 }, en: ['mercado'] },
    { id: 'paella', t: 'Paella', i: '🥘', precio: 14, ef: { hambre: 55, social: 8 }, en: ['mercado'] },
    { id: 'sushi', t: 'Sushi', i: '🍣', precio: 16, ef: { hambre: 48, salud: 4 }, en: ['mercado'] },
    { id: 'chocolate', t: 'Chocolate con churros', i: '🍫', precio: 6, ef: { hambre: 22, diversion: 10 }, en: ['cafe'] },
    { id: 'cafe', t: 'Café con leche', i: '☕', precio: 2, ef: { energia: 16 }, en: ['cafe'], edad: 14 },
    { id: 'helado', t: 'Helado', i: '🍦', precio: 4, ef: { diversion: 15, hambre: 8 }, en: ['parque', 'cafe'] }
  ];
  // Los sitios del barrio (el mapa los coloca; aquí está lo que se puede hacer dentro)
  var LUGARES = [
    { id: 'casa', t: 'Tu casa', i: '🏠' }, { id: 'mercado', t: 'Mercado La Huerta', i: '🛒' }, { id: 'cafe', t: 'Cafetería Nube', i: '☕' },
    { id: 'parque', t: 'Parque del Sol', i: '🌳' }, { id: 'tienda', t: 'Tienda de moda', i: '👗' }, { id: 'escuela', t: 'Escuela y oficinas', i: '🏫' },
    { id: 'gimnasio', t: 'Gimnasio', i: '💪' }, { id: 'salud', t: 'Centro de salud', i: '🩺' }, { id: 'vip', t: 'Club Estrella VIP', i: '🌟' }, { id: 'plaza', t: 'Plaza del cofre', i: '🎁' }
  ];
  var VIP_FICHAS = 3, MONEDAS_DIA = 8;
  var CAT = { casas: CASAS, muebles: MUEBLES, ropa: ROPA, coches: COCHES, mascotas: MASCOTAS, trabajos: TRABAJOS, comida: COMIDA };
  function buscar(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function err(msg) { var e = new Error(msg); e.code = 'VALIDATION'; throw e; }
  function diario(s, now, txt) { s.diario = (s.diario || []).concat([{ t: now, x: txt }]).slice(-40); }

  // ---------- Nacer ----------
  function nacer(resp, nombre, now, rnd) {
    rnd = rnd || Math.random;
    if (!resp || resp.length !== HISTORIA.length) err('Completa la historia para nacer.');
    var s = { v: 1, nacido: now, t: now, rasgos: { creatividad: 2, cerebro: 2, social: 2, energia: 2 }, dinero: 0, estudios: 0, salud: 100,
      necesidades: { hambre: 80, energia: 80, diversion: 80, higiene: 80, social: 80 }, casa: 'familia', muebles: {}, inventario: ['top_blanca', 'bajo_vaquero', 'zap_deportivas'],
      ropa: { top: 'top_blanca', bajo: 'bajo_vaquero', zapatos: 'zap_deportivas', accesorio: '' }, coche: '', carne: false, mascota: null, trabajo: null, turno: null,
      historia: [], diario: [], ultimoEvento: now, evento: null, cd: {}, premium: [], stats: { turnos: 0, ganado: 0, estudios: 0, eventos: 0 } };
    var piel = PIELES[Math.floor(rnd() * PIELES.length)], pelo = '#3b2a20', ojos = '#6b4f2a';
    for (var i = 0; i < HISTORIA.length; i++) {
      var o = HISTORIA[i].opciones[resp[i]]; if (!o) err('Respuesta no válida en la historia.');
      s.historia.push(o.t);
      if (o.rasgo) for (var k in o.rasgo) s.rasgos[k] += o.rasgo[k];
      if (o.ciudad) s.ciudad = o.ciudad; if (o.familia) s.familia = o.familia; if (o.dinero) s.dinero = o.dinero;
      if (o.pelo) pelo = o.pelo; if (o.ojos) ojos = o.ojos; if (o.sexo) s.sexo = o.sexo;
    }
    var limpio = String(nombre || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().substring(0, 20);
    s.nombre = limpio || NOMBRES[s.sexo][Math.floor(rnd() * NOMBRES[s.sexo].length)];
    var pe = PEINADOS[s.sexo];
    s.aspecto = { piel: piel, pelo: pelo, ojos: ojos, peinado: pe[Math.floor(rnd() * pe.length)] };
    diario(s, now, (s.sexo === 'chica' ? 'Nace ' : 'Nace ') + s.nombre + ' en ' + s.ciudad + '. ' + (s.sexo === 'chica' ? '¡Es una niña!' : '¡Es un niño!'));
    return s;
  }

  // ---------- Paso del tiempo (se aplica antes de cada acción y al leer) ----------
  function bono(s, nec) {
    var b = 0, ms = s.muebles || {};
    for (var k in ms) { var m = buscar(MUEBLES, ms[k]); if (m && m.bono && m.bono[nec]) b += m.bono[nec]; }
    return b;
  }
  function tick(s, now) {
    var dt = Math.max(0, Math.min(now - (s.t || now), 30 * DIA)), h = dt / HORA;
    if (h <= 0) return s;
    var bajas = 0;
    NEC.forEach(function (n) { var v = s.necesidades[n] - BAJA_HORA[n] * h * (n === 'energia' && s.rasgos.energia > 5 ? 0.8 : 1); s.necesidades[n] = clamp(v); if (s.necesidades[n] < 15) bajas++; });
    s.salud = clamp(s.salud + (bajas ? -2.5 * bajas * h : (NEC.every(function (n) { return s.necesidades[n] >= 50; }) ? 1.5 * h : 0)));
    if (s.mascota) { s.mascota.hambre = clamp(s.mascota.hambre - 5 * h); s.mascota.feliz = clamp(s.mascota.feliz - (s.mascota.hambre < 20 ? 6 : 3) * h); }
    s.t = now;
    // un evento como mucho cada 6 h reales (si no hay otro pendiente)
    return s;
  }
  function eventoNuevo(s, now, rnd) {
    if (s.evento || now - (s.ultimoEvento || 0) < 6 * HORA) return null;
    var e = edad(s, now), lista = EVENTOS.filter(function (x) { return e >= x.edad[0] && e <= x.edad[1] && (!x.mascota || s.mascota); });
    if (!lista.length) return null;
    var ev = lista[Math.floor((rnd || Math.random)() * lista.length)];
    s.evento = ev.id; s.ultimoEvento = now;
    return ev;
  }
  function aplicar(s, ef) {
    if (!ef) return;
    if (ef.dinero) s.dinero = Math.max(0, s.dinero + ef.dinero);
    NEC.forEach(function (n) { if (ef[n]) s.necesidades[n] = clamp(s.necesidades[n] + ef[n]); });
    if (ef.salud) s.salud = clamp(s.salud + ef.salud);
    if (ef.estudios) s.estudios = clamp(s.estudios + ef.estudios);
    if (ef.rasgo) s.rasgos[ef.rasgo] = Math.min(10, s.rasgos[ef.rasgo] + 1);
    if (ef.mascota && s.mascota) s.mascota.feliz = clamp(s.mascota.feliz + ef.mascota);
  }
  function evento(s, opcion, now) {
    var ev = buscar(EVENTOS, s.evento); if (!ev) err('No hay ningún suceso pendiente.');
    var o = ev.o[Math.round(Number(opcion))]; if (!o) err('Opción no válida.');
    if (o.ef && o.ef.dinero < 0 && s.dinero < -o.ef.dinero) err('No tienes monedas suficientes para eso.');
    aplicar(s, o.ef); s.evento = null; s.stats.eventos++;
    diario(s, now, ev.t + ' → ' + o.t + '. ' + o.r);
    return o.r;
  }

  // ---------- Acciones ----------
  function cooldown(s, k, min, now) {
    var ult = (s.cd || {})[k] || 0, falta = ult + min * MIN - now;
    if (falta > 0) err('Aún no: podrás dentro de ' + (falta > HORA ? Math.ceil(falta / HORA) + ' h' : Math.ceil(falta / MIN) + ' min') + '.');
    s.cd = s.cd || {}; s.cd[k] = now;
  }
  function pagar(s, precio) { if (s.dinero < precio) err('Te faltan ' + (precio - s.dinero) + ' monedas.'); s.dinero -= precio; }
  // Devuelve { msg, fichas } — si «fichas» > 0 el SERVIDOR debe cobrarlas antes de guardar (artículo premium)
  function accion(s, tipo, id, now) {
    var e = edad(s, now), out = { msg: '', fichas: 0 };
    if (ACCIONES[tipo]) {
      var a = ACCIONES[tipo]; cooldown(s, tipo, a.cd, now);
      var coste = e < 18 ? 0 : a.coste; // de pequeño paga la familia
      pagar(s, coste);
      s.necesidades[a.nec] = clamp(s.necesidades[a.nec] + a.mas + bono(s, a.nec));
      if (tipo === 'dormir') s.salud = clamp(s.salud + 4);
      out.msg = a.i + ' ' + a.t + (coste ? ' (−' + coste + ' monedas)' : '');
      return out;
    }
    var it;
    switch (tipo) {
      case 'medico':
        if (s.salud >= 70) err('Estás bien de salud: no hace falta ir al médico.');
        pagar(s, e < 18 ? 0 : 40); s.salud = clamp(s.salud + 45); out.msg = '🩺 El médico te pone a punto.'; diario(s, now, 'Visita al médico.'); return out;
      case 'comprar':
        it = buscar(MUEBLES, id) || buscar(ROPA, id); if (!it) err('Ese artículo no existe.');
        if ((s.inventario || []).indexOf(id) >= 0) err('Ya lo tienes.');
        if (it.fichas) out.fichas = it.fichas; else { if (e < 3) err('Eres demasiado pequeño/a para comprar.'); pagar(s, it.precio); }
        s.inventario.push(id); if (it.fichas) s.premium.push(id);
        out.msg = 'Has comprado: ' + it.t; diario(s, now, 'Compra: ' + it.t + '.'); return out;
      case 'equipar':
        it = buscar(ROPA, id); if (!it) err('Esa prenda no existe.');
        if (s.inventario.indexOf(id) < 0) err('Primero cómprala.');
        if (it.parte === 'accesorio' && s.ropa.accesorio === id) s.ropa.accesorio = ''; else s.ropa[it.parte] = id;
        out.msg = 'Te has cambiado de ropa.'; return out;
      case 'colocar': // id = «hueco:mueble» o «hueco:» para quitar
        var p = String(id || '').split(':'), hueco = Number(p[0]), mueble = p[1] || '', casa = buscar(CASAS, s.casa);
        if (!(hueco >= 0 && hueco < casa.huecos)) err('Ese hueco no existe en tu casa.');
        if (mueble && (!buscar(MUEBLES, mueble) || s.inventario.indexOf(mueble) < 0)) err('Primero compra ese mueble.');
        for (var k in s.muebles) if (s.muebles[k] === mueble && mueble) delete s.muebles[k];
        if (mueble) s.muebles[hueco] = mueble; else delete s.muebles[hueco];
        out.msg = mueble ? 'Mueble colocado.' : 'Hueco libre.'; return out;
      case 'casa':
        it = buscar(CASAS, id); if (!it) err('Esa casa no existe.');
        if (e < it.edad) err('Necesitas tener ' + it.edad + ' años para independizarte.');
        if (s.casa === id) err('Ya vives aquí.');
        if ((s.casasCompradas || []).indexOf(id) < 0) { if (it.fichas) out.fichas = it.fichas; else pagar(s, it.precio); s.casasCompradas = (s.casasCompradas || []).concat([id]); if (it.fichas) s.premium.push(id); }
        // los muebles que no caben vuelven al inventario (siguen siendo tuyos)
        for (var hk in s.muebles) if (Number(hk) >= it.huecos) delete s.muebles[hk];
        s.casa = id; out.msg = '🏠 ¡Te mudas a: ' + it.t + '!'; diario(s, now, 'Se muda a: ' + it.t + '.'); return out;
      case 'coche':
        it = buscar(COCHES, id); if (!it) err('Ese vehículo no existe.');
        if (e < it.edad) err('Necesitas ' + it.edad + ' años.');
        if (it.carne && !s.carne) err('Primero saca el carné (autoescuela).');
        if (s.coche === id) err('Ya lo tienes.');
        if (it.fichas) out.fichas = it.fichas; else pagar(s, it.precio);
        if (it.fichas) s.premium.push(id);
        s.coche = id; out.msg = it.i + ' ¡Estrenas ' + it.t + '!'; diario(s, now, 'Estrena: ' + it.t + '.'); return out;
      case 'adoptar':
        it = buscar(MASCOTAS, id); if (!it) err('Esa mascota no existe.');
        if (s.mascota) err('Ya tienes una mascota: cuídala bien.');
        if (e < it.edad) err('Necesitas ' + it.edad + ' años para cuidarla.');
        if (it.fichas) out.fichas = it.fichas; else pagar(s, it.precio);
        if (it.fichas) s.premium.push(id);
        s.mascota = { tipo: id, nombre: '', hambre: 80, feliz: 80, desde: now }; out.msg = it.i + ' ¡Bienvenida a casa!'; diario(s, now, 'Adopta un ' + it.t.toLowerCase() + '.'); return out;
      case 'mascota_nombre':
        if (!s.mascota) err('No tienes mascota.');
        s.mascota.nombre = String(id || '').replace(/[<>"'`\\]/g, '').trim().substring(0, 16); out.msg = 'Nombre puesto.'; return out;
      case 'mascota_comer':
        if (!s.mascota) err('No tienes mascota.'); cooldown(s, 'mcomer', 30, now); pagar(s, e < 18 ? 0 : 3);
        s.mascota.hambre = clamp(s.mascota.hambre + 50); s.mascota.feliz = clamp(s.mascota.feliz + 5); out.msg = '🥣 Ñam.'; return out;
      case 'mascota_jugar':
        if (!s.mascota) err('No tienes mascota.'); cooldown(s, 'mjugar', 30, now);
        s.mascota.feliz = clamp(s.mascota.feliz + 35); s.necesidades.diversion = clamp(s.necesidades.diversion + 10); out.msg = '🎾 ¡Qué bien lo pasáis!'; return out;
      case 'trabajo':
        it = buscar(TRABAJOS, id); if (!it) err('Ese trabajo no existe.');
        if (e < it.edad) err('Necesitas tener ' + it.edad + ' años.');
        if (s.estudios < it.estudios) err('Necesitas ' + it.estudios + ' de estudios (tienes ' + s.estudios + '). Estudia un poco más.');
        if (s.trabajo && s.trabajo.id === id) err('Ya trabajas de esto.');
        s.trabajo = { id: id, nivel: 1, buenos: 0, turnos: 0 }; out.msg = '💼 ¡Te contratan de ' + it.t + '!'; diario(s, now, 'Empieza a trabajar de ' + it.t + '.'); return out;
      case 'dimitir':
        if (!s.trabajo) err('No tienes trabajo.');
        diario(s, now, 'Deja el trabajo de ' + buscar(TRABAJOS, s.trabajo.id).t + '.'); s.trabajo = null; out.msg = 'Has dejado el trabajo.'; return out;
      // ---- v13.9 · el barrio ----
      case 'comida':
        it = buscar(COMIDA, id); if (!it) err('Esa comida no existe.');
        if (it.edad && e < it.edad) err('Eso es para mayores de ' + it.edad + '.');
        cooldown(s, 'comida', 8, now); pagar(s, e < 18 ? 0 : it.precio);
        aplicar(s, it.ef); s.stats.comidas = (s.stats.comidas || 0) + 1;
        if (!(s.probado || []).includes(id)) { s.probado = (s.probado || []).concat([id]); diario(s, now, 'Prueba por primera vez: ' + it.t + ' ' + it.i + '.'); }
        out.msg = it.i + ' ¡Qué rico! ' + it.t + (e >= 18 ? ' (−' + it.precio + ' monedas)' : ''); return out;
      case 'parque':
        cooldown(s, 'parque', 30, now); aplicar(s, { diversion: 30, social: 10, energia: -5 });
        if (s.mascota) { s.mascota.feliz = clamp(s.mascota.feliz + 20); }
        out.msg = '🌳 Un paseo por el parque' + (s.mascota ? ' con tu mascota' : '') + '.'; return out;
      case 'gym':
        if (e < 12) err('El gimnasio es a partir de 12 años.');
        cooldown(s, 'gym', 60, now); pagar(s, e < 18 ? 0 : 5); aplicar(s, { energia: -15, salud: 8, diversion: 8 });
        s.stats.gym = (s.stats.gym || 0) + 1; out.msg = '💪 ¡Buen entrenamiento! (+8 salud)'; return out;
      case 'vip':
        if (e < 18) err('El Club Estrella VIP es para mayores de 18.');
        cooldown(s, 'vip', 360, now); out.fichas = VIP_FICHAS; aplicar(s, { diversion: 55, social: 35, energia: -10 });
        s.stats.vip = (s.stats.vip || 0) + 1; diario(s, now, '🌟 Noche VIP en el Club Estrella: alfombra roja, luces y foto con famosos.');
        out.msg = '🌟 ¡Noche VIP inolvidable!'; out.escena = 'vip'; return out;
      case 'cofre': {
        var dia = new Date(now + 2 * HORA).toISOString().slice(0, 10), ayer = new Date(now + 2 * HORA - DIA).toISOString().slice(0, 10);
        s.cofre = s.cofre || { dia: '', racha: 0 };
        if (s.cofre.dia === dia) err('El cofre de hoy ya está abierto. ¡Vuelve mañana!');
        s.cofre.racha = s.cofre.dia === ayer ? s.cofre.racha + 1 : 1; s.cofre.dia = dia;
        var premio = Math.min(100, 15 + 10 * s.cofre.racha); s.dinero += premio;
        aplicar(s, { diversion: 10 });
        out.msg = '🎁 ¡Cofre del día! +' + premio + ' monedas · racha de ' + s.cofre.racha + (s.cofre.racha === 1 ? ' día' : ' días'); out.premio = premio;
        if (s.cofre.racha % 7 === 0) diario(s, now, '🏆 ¡Una semana entera abriendo el cofre!');
        return out; }
      case 'recoger': {
        var hoy = new Date(now + 2 * HORA).toISOString().slice(0, 10), n2 = Math.round(Number(id));
        if (!(n2 >= 0 && n2 < MONEDAS_DIA)) err('Esa moneda no existe.');
        s.recogidas = s.recogidas && s.recogidas.dia === hoy ? s.recogidas : { dia: hoy, ids: [] };
        if (s.recogidas.ids.indexOf(n2) >= 0) err('Esa moneda ya la cogiste.');
        s.recogidas.ids.push(n2); s.dinero += 3; out.msg = '🪙 +3 monedas'; return out; }
      case 'peinado':
        if (PEINADOS[s.sexo].indexOf(id) < 0) err('Peinado no válido.'); pagar(s, e < 12 ? 0 : 15); s.aspecto.peinado = id; out.msg = '💇 ¡Nuevo look!'; return out;
    }
    err('Acción desconocida.');
  }

  // ---------- Turnos con minijuego (trabajo, estudio, autoescuela) ----------
  var JUEGOS = ['calculo', 'memoria', 'reflejos', 'orden', 'patron'];
  function empezarTurno(s, tipo, now, rnd) {
    var e = edad(s, now), juego, t;
    if (s.turno && now - s.turno.t0 < 15 * MIN) err('Ya tienes un turno empezado.');
    if (tipo === 'trabajo') {
      if (!s.trabajo) err('Primero busca un trabajo.');
      t = buscar(TRABAJOS, s.trabajo.id); juego = t.juego;
      cooldown(s, 'trabajo', 30, now);
      if (s.necesidades.energia < 15) err('Estás sin energía: duerme antes de trabajar.');
    } else if (tipo === 'estudio') {
      if (e < 3) err('Eres un bebé: primero a jugar y a dormir.');
      if (e >= 30) err('Ya has terminado tus estudios (aunque nunca es tarde para leer).');
      cooldown(s, 'estudio', 45, now);
      juego = JUEGOS[Math.floor((rnd || Math.random)() * JUEGOS.length)];
    } else if (tipo === 'carne') {
      if (e < 18) err('El carné se saca con 18 años.');
      if (s.carne) err('Ya tienes carné.');
      cooldown(s, 'carne', 60, now); pagar(s, 120);
      juego = 'reflejos';
    } else err('Turno no válido.');
    s.turno = { tipo: tipo, juego: juego, t0: now, token: Math.floor((rnd || Math.random)() * 1e9).toString(36) + now.toString(36) };
    return s.turno;
  }
  function terminarTurno(s, token, puntos, now) {
    var tr = s.turno;
    if (!tr || tr.token !== String(token)) err('Ese turno ya no es válido.');
    var seg = (now - tr.t0) / 1000;
    if (seg < 8) err('Demasiado rápido: juega el turno completo.');
    s.turno = null;
    var p = Math.max(0, Math.min(100, Math.round(Number(puntos) || 0)));
    if (seg > 15 * 60) p = 0; // se dejó a medias
    var r = { puntos: p, msg: '' };
    if (tr.tipo === 'trabajo') {
      var t = buscar(TRABAJOS, s.trabajo.id), coche = buscar(COCHES, s.coche);
      var paga = Math.round(t.sueldo * (1 + 0.15 * (s.trabajo.nivel - 1)) * (0.4 + 0.8 * p / 100) * (1 + ((t.vehiculo && coche) ? coche.bono / 100 : 0)) * (t.mascota && s.mascota ? 1.1 : 1));
      s.dinero += paga; s.trabajo.turnos++; s.stats.turnos++; s.stats.ganado += paga;
      if (p >= 60) s.trabajo.buenos++;
      s.necesidades.energia = clamp(s.necesidades.energia - 15); s.necesidades.hambre = clamp(s.necesidades.hambre - 10);
      r.paga = paga; r.msg = '💼 Turno terminado: +' + paga + ' monedas.';
      if (s.trabajo.buenos >= 6 && s.trabajo.nivel < 5) { s.trabajo.nivel++; s.trabajo.buenos = 0; r.ascenso = s.trabajo.nivel; r.msg += ' ⭐ ¡Ascenso a nivel ' + s.trabajo.nivel + '!'; diario(s, now, '¡Ascenso! Nivel ' + s.trabajo.nivel + ' de ' + t.t + '.'); }
    } else if (tr.tipo === 'estudio') {
      var sube = Math.max(1, Math.round((1 + p / 25) * (1 + bono(s, 'estudio') / 100) * (s.rasgos.cerebro > 5 ? 1.25 : 1)));
      s.estudios = clamp(s.estudios + sube); s.stats.estudios++;
      s.necesidades.energia = clamp(s.necesidades.energia - 8);
      if (edad(s, now) < 18) s.dinero += 3; // paga semanal
      r.estudios = sube; r.msg = '📚 Estudios +' + sube + (edad(s, now) < 18 ? ' (y +3 monedas de paga)' : '') + '.';
    } else if (tr.tipo === 'carne') {
      if (p >= 70) { s.carne = true; r.msg = '🚗 ¡Aprobado! Ya tienes carné.'; diario(s, now, 'Aprueba el carné de conducir.'); } else r.msg = 'Suspendido (' + p + '/100). Puedes repetir dentro de 1 h.';
    }
    return r;
  }

  // ---------- Datos para la pantalla ----------
  function resumen(s, now) {
    var e = edad(s, now);
    return { edad: Math.floor(e), edadExacta: e, etapa: etapa(e), proximoCumple: s.nacido + (Math.floor(e) + 1) * DIA };
  }
  function trabajosPosibles(s, now) {
    var e = edad(s, now);
    return TRABAJOS.map(function (t) { var falta = []; if (e < t.edad) falta.push(t.edad + ' años'); if (s.estudios < t.estudios) falta.push(t.estudios + ' de estudios'); return { id: t.id, t: t.t, i: t.i, sueldo: t.sueldo, juego: t.juego, ok: !falta.length, falta: falta }; });
  }
  return {
    DIA: DIA, HORA: HORA, NEC: NEC, NEC_TXT: NEC_TXT, ETAPAS: ETAPAS, HISTORIA: HISTORIA, NOMBRES: NOMBRES, CAT: CAT, ACCIONES: ACCIONES, EVENTOS: EVENTOS, PEINADOS: PEINADOS, JUEGOS: JUEGOS,
    buscar: buscar, edad: edad, etapa: etapa, nacer: nacer, tick: tick, eventoNuevo: eventoNuevo, evento: evento, accion: accion, empezarTurno: empezarTurno, terminarTurno: terminarTurno,
    resumen: resumen, trabajosPosibles: trabajosPosibles, bono: bono, COMIDA: COMIDA, LUGARES: LUGARES, VIP_FICHAS: VIP_FICHAS, MONEDAS_DIA: MONEDAS_DIA
  };
})();
if (typeof module !== 'undefined') module.exports = VIDA;
