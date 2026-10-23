// ================= 14-10-2026 (tarde) · 🛒 VENDER EN CULTS los diseños del CATÁLOGO de CelebriR8 (los 312) =================
// Ella: «si puedes añadir más cosas para vender en Cults y precio de venta, te lo agradecería; todo funcional».
// Cada diseño, con su título en inglés (lo que más se busca en Cults) y en español, sus etiquetas, la categoría de Cults y un precio
// ORIENTATIVO por tipo (no hay datos públicos fiables de ventas por tipo de pieza). Lo demás (medidas, piezas, soportes, modo jarrón,
// TPU…) sale del propio diseño: no se inventa. Las «ayudas para diseñar» (agujero de tornillo, alojamiento de tuerca…) no son para
// vender; las probetas para calibrar, GRATIS (traen gente a tu perfil).
import { CATEGORIAS, NOTAS, euros, notaPrecio, limpio, tituloCults, notaTitulo } from './cults.js';

// por categoría del catálogo: [categoría de Cults, precio orientativo (€), etiquetas de base]
const CAT = {
  cuqui: ['home', 1.99, 'kawaii, cute, cuqui, regalo'], organizar: ['home', 1.99, 'organizer, organizador, storage, desk'], hogar: ['home', 1.49, 'home, hogar, practical, útil'],
  taller: ['tools', 1.99, 'workshop, taller, tool holder, garage'], macetas: ['home', 1.79, 'planter, maceta, plant pot, succulent'], jarrones: ['home', 1.49, 'vase, jarrón, home decor, decoración'],
  vasos: ['home', 1.49, 'candle holder, portavelas, decor, decoración'], lamparas: ['home', 2.49, 'lamp, lámpara, lampshade, led'], deco: ['art', 1.99, 'sculpture, escultura, decor, art'],
  calados: ['home', 1.49, 'pattern, calado, decor, decoración'], regalos: ['gadget', 1.49, 'gift, regalo, personalized, personalizado'], juegos: ['game', 2.49, 'game, juego, puzzle, fidget'],
  gaming: ['gadget', 1.99, 'gaming, gamer, desk setup, setup'], mascotas: ['home', 1.99, 'pet, mascota'], movil: ['gadget', 1.99, 'phone case, funda móvil'],
  mecanica: ['tools', 1.99, 'mechanical, mecánica, engineering, parametric'], rc: ['gadget', 2.49, 'rc car, rc parts, repuesto rc, 1/10'], componentes: ['tools', 0, 'parametric'],
  miniaturas: ['art', 1.99, 'dollhouse, miniature, casa de muñecas, 1:12'], ninos: ['game', 1.99, 'kids, niños, toy, juguete'], navidad: ['home', 1.79, 'christmas, navidad, xmas, ornament'],
  adultos: ['art', 2.49, 'decor, sculpture, escultura, gift'], jovenes: ['gadget', 1.99, 'room decor, teen, regalo, gift'], cuadros: ['art', 1.79, 'wall art, silhouette, silueta, cuadro'],
  halloween: ['home', 1.79, 'halloween, spooky, decoración'], bebes: ['home', 1.79, 'baby, bebé, baptism, bautizo'], canicas: ['game', 2.49, 'marble run, canicas, marble, juego'],
  ciencia: ['various', 2.49, 'science, ciencia, education, stem'], frikis: ['game', 1.99, 'tabletop, rpg, dnd, rol'], oficina: ['home', 1.79, 'office, oficina, desk organizer, escritorio'],
  juguetes: ['game', 3.99, 'model kit, maqueta, kit, toy'], flores: ['home', 1.49, 'flower, flor, gift, regalo'], empresas: ['home', 1.99, 'business, negocio, restaurant, hostelería'],
  kits: ['game', 0.99, 'card kit, kids craft, manualidad, niños'],
  compatibles: ['tools', 1.49, 'compatible, replacement part, spare part, repuesto, parametric'], // 17-10-2026
  impresora3d: ['tools', 1.49, '3d printer accessory, bambu lab, a1 mini, a1, p1p, upgrade'] // 17-10-2026 noche
};
// los que NO son para vender (ayudas para diseñar: se restan o se añaden a otra pieza) y los que van GRATIS
const AYUDA = new Set(['tornillo', 'tuerca', 'inserto', 'iman', 'colgar', 'patronHuecos', 'anilla', 'rodamiento', 'roscaBote']);
const GRATIS = new Set(['pruebaPrecision', 'pruebaRodImpreso', 'plantillaRodamientos']);
// el precio de los que se salen de su grupo (kits grandes, mecanismos, chasis…)
const PRECIO = {
  ruedaGinebra: 2.99, bielaManivela: 2.49, levaCorazon: 1.99, yugoEscoces: 2.49, direccionCoche: 2.99, expositorMecheros: 1.99, // 18-10-2026 · mecanismos que se mueven
  hormigueroTorre: 4.99, // 18-10-2026 (noche) · hormiguero en torre (kits inicio, grande, premium)
  biciPro: 6.99, // 19-10-2026 · bicicleta PRO por piezas (4 estilos)
  motoPro: 7.99, // 19-10-2026 · moto PRO con motor N20
  cocheDrift: 9.99, // 19-10-2026 · coche RC de drift: el kit entero
  camionRC: 14.99, // 20-10-2026 (noche) · camión RC 1/10 por piezas: 3 estilos, diferencial, suspensión, manual con tornillería
  aerobarcoRC: 8.99, // 20-10-2026 · aerobarco RC: el kit entero (casco estanco, torre, protector, timones)
  rascacielosGiro: 3.49, rascacielosArtDeco: 3.49, estadioPremium: 5.99, // 21-10-2026 · arquitectura premium
  carruselEsmaltes: 5.99, expositorUnas: 3.49, organizadorLoto: 3.49, // 21-10-2026 · manicura premium
  clickerMuelle: 2.49, // 21-10-2026 · clicker antiestrés con muelles de boli (5 formas)
  soporteDualSense: 4.99, // 21-10-2026 · soporte premium para el mando (placas con silueta + barras, 4 montajes)
  lanzabolas: 6.99, // 21-10-2026 · lanzabolas de muelle que funciona (juguete de bolas blandas o premium de 6 mm), con manual y prueba de encaje
  lanzabolasCompeticion: 7.99, lanzabolasTactica: 7.99, lanzabolasFutura: 7.99, // 21-10 (tarde) · los otros 3 modelos (la misma mecánica, otro cuerpo)
  avionetaRC: 8.99, // 21-10-2026 · avioneta RC entrenadora: fuselaje y cola impresos + plano de corte de las alas de cartón pluma (precio como el aerobarco: se puede cambiar)
  organizadorCilindros: 3.99, // 19-10-2026 · caja organizadora de alojamientos
  limpiaBrochas4en1: 5.99, // 21-10-2026 · limpiador de brochas 4 en 1 con depósito, botón de muelle (válvula de pinza), cubeta y cajón
  robotBicha: 14.99, robotCelebriBot3: 9.99, robotCelebriBot2: 7.99, // 22-10-2026 · los robots (todas sus piezas, pruebas de encaje y la guía): precio orientativo, se puede cambiar · (tarde: BICHA sustituye al Guardián)
  rotulaTimelapse: 3.49, pinzaBobina: 0.99, rackPlacas: 1.49, rodillosBobina: 1.99, gridfinityPro: 1.99, gridfinityPuntas: 1.49, gridfinityBasePro: 0.99, skadisGancho: 0.99, skadisBalda: 1.99, skadisPorta: 1.49, goproTripode: 1.49, goproBrazo: 0.99, aspiradora: 1.49, soporteBalda: 0.99, ganchoPuerta: 1.29, tiburonFlexi: 2.99, serpienteFlexi: 2.99, fundaMecheroPro: 1.49, ceniceroMoai: 2.99, ceniceroVolcan: 2.49, // 17-10-2026 tarde
  dragonFlexi: 3.99, pulpoFlexi: 2.99, pezFlexi: 2.49, lagartijaFlexi: 2.49, aranaFlexi: 2.99, ajoloteFlexi: 2.49, cajaRegalo: 2.49, huevoSorpresa: 1.99, bolaNavidadAbre: 1.99, bolaPremios: 1.99, pastilleroGiratorio: 1.99, cajaGiratoria: 1.99, cajaDientes: 1.99, deckBox: 1.99, fantasmaVela: 1.99, calderoCaramelos: 2.49, lapidaHalloween: 1.49, arbolEspiral: 1.49, cakeTopper: 1.99, placaNacimiento: 2.49, cartelPuerta: 1.99, peanasMiniaturas: 1.49, contadorVida: 1.99, solidosPlatonicos: 2.49, moebius: 1.49, setGeometria: 2.49, bumeran: 1.99, silbato: 0.99, yoyo: 1.49, catapulta: 2.49, huchaRemolino: 3.49, marcapaginas: 1.49, servilleteroCalado: 1.49, estacionEsquejes: 1.99, macetaPared: 1.49, expositorPendientes: 1.99, numeroMesa: 1.49, deshojador: 0.99, exprimidor: 1.99, abrebotellas: 1.49, anilloFidget: 1.99,
  cajaEngranajes: 2.99, mesaEngranajes: 2.49, rodamientoPlanetario: 2.99, corazonEngranajes: 2.49, llaveroEngranajes: 1.99, juegoEngranajesMotor: 1.99, casaMunecas: 4.99, hormiguero: 3.49, hormigaNido: 2.99,
  calendarioAdviento: 3.99, cajoneraDoble: 2.99, bicicletaKit: 4.99, motoKit: 4.99, miniTaladro: 5.99, pieDeRey: 4.99, chasisBuggy: 5.99, chasisBanera: 4.99, chasisDoble: 4.99, chasisCrawler: 4.99,
  esquinaDel: 3.49, esquinaTras: 3.49, diferencial: 2.99, reductora: 2.99, difRectos: 2.99, spool: 1.99, cardan: 2.49, torreCanicas: 2.99, torreZigzag: 2.99, cuatroEnLinea: 2.99, damas: 1.99,
  deslizante15: 1.99, serpiente: 1.99, escritorioModular: 2.99, lavaPincelesPro: 2.49, rielPared: 2.49, jarronLujo: 2.49, vasoPremium: 1.99, macetaPremium: 2.49, jarronPremium: 2.49, tensegridad: 1.99,
  pajaroEquilibrista: 1.49, spinner: 1.49, siluetaPared: 1.99, cosmeticosGiratorio: 2.99, organizadorMaquillaje: 1.99, organizadorCorazon: 2.49, estanteriaArcos: 2.49, farolNavidad: 2.49,
  belenPeana: 2.49, casitaNavidad: 2.49, titiritero: 2.99, columpioLuna: 2.99, pensadores: 2.49, parejaCisnes: 1.99, moleculas: 2.99, relojSol: 2.49, adnModelo: 1.99, dadosRol: 1.99,
  cajaBisagra: 2.49, cofreBisagra: 2.49, joyeroBisagra: 1.99, estucheBisagra: 1.99, botiquinBisagra: 1.99, bisagraImpresa: 0.99, bisagraFuerte: 1.49, mangoPuntas: 1.99, tornilloTuerca: 1.49,
  cajaBayoneta: 2.49, macetaAutorriego: 2.49, boteRosca: 1.99, relojPared: 1.99, gridfinityBase: 0.99, gridfinityCaja: 0.99, placaQR: 1.99, funda: 1.99, rodamientoImpreso: 1.99, rodamientoPestana: 1.99,
  acopleGarras: 1.99, cajaCorredera: 1.49, lampNube: 2.49, lampBase: 1.99, lampAro: 0.99, elevadorPortatil: 1.99, estacionCarga: 2.49, seisEnUno: 1.99, calendario: 1.99, molino: 1.99, mancala: 1.99,
  solitario: 1.49, senku: 1.99, tresEnRaya: 1.49, tangram: 1.49, cuboSoma: 1.99, espirografo: 1.99, arcoirisApilable: 1.99, peonza: 0.99, dado: 0.99, laberinto: 1.49, laberintoCircular: 1.99,
  torreDados: 2.49, bandejaDados: 1.49, miniCasita: 1.99, miniPuerta: 1.49, portarrollosMini: 0.99, ruedaDrift: 2.49, llantaRC: 1.99, neumaticoRC: 1.99, adaptadorHex: 0.99, adaptadorEje: 1.49,
  hexRueda: 0.99, precarga: 0.99, postesCarroceria: 0.99, separador: 0.99, perillaD: 0.99, escuadra: 0.99, engranaje: 1.49, galgaRadios: 1.49, pinzas: 1.49, cucharaMedidora: 1.49
};
// título en inglés · etiquetas propias (se suman a las de su grupo)
const T = {
  // 18-10-2026 · mecanismos que se mueven (cada uno con su vídeo del movimiento en «📦 Exportar todo») y el expositor de mecheros
  hormigueroTorre: ['Vertical Ant Farm Tower – Stackable Formicarium with Outworld', 'ant farm, formicarium, ant nest, vertical, stackable, outworld, hormiguero, colonia, science kit, STEM'],
  robotBicha: ['BICHA Home Robot – Raspberry Pi 5 AI Robot, 7" Touch Screen, Moving Head', 'robot, home robot, raspberry pi 5, ai robot, touch screen, face recognition, voice assistant, servo, st3215, desk robot, robot kit'],
  robotCelebriBot3: ['CelebriBot 3 Desk Robot – Round Touch Display, Camera with Eyelid, Moving Head', 'desk robot, robot kit, esp32s3, round display, ai assistant, moving head, sc09, camera robot, desktop companion, voice assistant'],
  robotCelebriBot2: ['CelebriBot 2 Desk Robot – XIAO ESP32S3 Assistant with Moving Head & Display', 'desk robot, robot kit, esp32s3, xiao, ai assistant, moving head, mg90s, camera robot, desktop companion, voice assistant'],
  limpiaBrochas4en1: ['Brush Cleaning Station 4-in-1 – Push-Button Water Tank, Scrub Pad, Comb & Drawer', 'brush cleaner, makeup brush cleaner, paint brush washer, brush cleaning station, water dispenser, push button valve, spring valve, artist tools, limpiador de brochas'],
  organizadorCilindros: ['Custom Holder Organizer – 4-in-1 Hair Dryer Brush, Cordless Drill & Bits', 'organizer, hair dryer holder, airwrap organizer, drill holder, bit holder, tool caddy, custom organizer, organizador'],
  cocheDrift: ['RC Drift Car Kit 1/16 – Ackermann Steering, 9:1 Gearbox, Spool, Drift Wheels', 'rc drift car, rc kit, 3d printed rc, 1/16 drift, sg90 steering, 370 motor, spool, drift tires, chassis, ackermann'],
  camionRC: ['RC Truck Kit 1/10 – Stadium/Short Course/Monster, Diff, 540 Motor', 'rc truck, 1/10 rc, stadium truck, short course, monster truck, rc kit, 3d printed rc, bevel differential, independent suspension, oil shocks, 540 motor, bearings, camion rc'],
  aerobarcoRC: ['RC Airboat Kit – Watertight Hull, 370/Brushless Motor, Prop Guard, Twin Rudders', /* (20-10: tenía 86 letras; Cults admite 80) */ 'rc airboat, rc boat, 3d printed boat, airboat kit, swamp boat, air rudder, prop guard, sg90, 370 motor, brushless, petg, watertight hull, barco rc, aerodeslizador'],
  lanzabolas: ['Spring Soft-Ball Blaster – Working Slide, Sear & Magazine, Orange Tip', 'toy blaster, spring blaster, soft ball, gel ball, airsoft, slide action, working trigger, magazine, orange tip, prop, lanzabolas, pistola de juguete, juguete'],
  lanzabolasCompeticion: ['Competition Spring Blaster – Orange Compensator, Magwell, Working Slide', 'toy blaster, spring blaster, competition, compensator, magwell, beavertail, soft ball, airsoft, slide action, orange tip, lanzabolas, pistola de juguete'],
  lanzabolasTactica: ['Tactical Spring Blaster – Round Guard, Palm Swell, Lanyard Loop, Orange Tip', 'toy blaster, spring blaster, tactical, fde, lanyard loop, palm swell, soft ball, airsoft, slide action, orange tip, lanzabolas, pistola de juguete'],
  lanzabolasFutura: ['Angular Spring Blaster – Futuristic Body, Chevron Serrations, Working Slide', 'toy blaster, spring blaster, futuristic, angular, sci-fi, chevron, soft ball, airsoft, slide action, orange tip, lanzabolas, pistola de juguete'],
  avionetaRC: ['RC Trainer Plane Kit – Printed Fuselage, Foam Board Wings, 2212 Brushless', 'rc plane, rc airplane, trainer plane, high wing, foam board, depron, 3d printed fuselage, 2212 brushless, sg90 servo, wing plans, aeromodelo, avioneta rc'],
  soporteDualSense: ['Premium PS5 Controller Stand – Dragon Claw, Wave, Wing or Minimal, Headset Hook', 'ps5 controller stand, dualsense holder, controller holder, headset stand, gaming setup, dragon claw, desk organizer, ps4, xbox controller, switch pro, wall mount, soporte mando'],
  clickerMuelle: ['Fidget Clicker with Pen Springs – Cat Paw, Gamepad, Heart, Mini Keyboard, Cloud', 'fidget clicker, fidget toy, clicky, stress relief, anxiety toy, pen spring, cat paw, gamepad, heart, keyboard, cloud, desk toy, antiestres'],
  carruselEsmaltes: ['Rotating Nail Polish Carousel – Tiered, Spins on 608-Type Bearings, Up to 40', 'nail polish organizer, nail polish rack, rotating organizer, carousel, manicure, nail salon, polish holder, bearing, organizador esmaltes'],
  rascacielosGiro: ['Twisting Skyscraper Model & Lamp – Square, Triangle, Hex or Trefoil Plan', 'skyscraper, twisted tower, architecture model, desk decor, led lamp, city, building, modern architecture, rascacielos'],
  rascacielosArtDeco: ['Art Deco Skyscraper Model – Setback Tiers, Pilasters, Crown and Spire', 'art deco, skyscraper, architecture model, 1930s, building, tower, desk decor, new york style, rascacielos'],
  estadioPremium: ['Football Stadium Model – Tiered Stands, Cantilever Roof, Floodlights, Pitch', 'stadium model, football stadium, soccer, architecture model, pitch, floodlights, gift for fans, estadio'],
  expositorUnas: ['Nail Swatch Display Stand – Numbered Tiers for Tip Sticks, Salon Name Sign', 'nail swatch, nail tips display, color chart, nail salon, swatch stand, manicure display, expositor uñas'],
  organizadorLoto: ['Lotus Manicure Organizer – Brush & File Cup with Petal Compartments', 'manicure organizer, nail tools holder, brush holder, lotus, flower organizer, makeup organizer, desk organizer, organizador manicura'],
  motoPro: ['Motorized Motorcycle Kit – N20 Motor, Real Chain, Suspension, Disc Brakes', 'motorcycle model, motorbike kit, n20 motor, working chain, sprocket, swingarm, tpu, naked bike, motocross, moto, maqueta'],
  biciPro: ['Working Bicycle Model Kit – Real Chain, Steering, Disc Brakes, 4 Styles', 'bicycle model, bike kit, working chain, sprocket, TPU chain, disc brake, steering fork, mtb, road bike, bmx, bicicleta, maqueta'],
  ruedaGinebra: ['Geneva Drive Mechanism – Intermittent Motion Desk Toy', 'geneva drive, geneva mechanism, maltese cross, cruz de malta, intermittent motion, desk toy, kinetic'],
  bielaManivela: ['Crank and Piston Mechanism – How an Engine Works', 'crank slider, piston, connecting rod, biela, engine model, kinetic, desk toy'],
  levaCorazon: ['Heart Cam and Follower – Uniform Motion Mechanism', 'heart cam, cam follower, leva, uniform motion, kinetic, mechanism'],
  yugoEscoces: ['Scotch Yoke Mechanism – Perfect Back-and-Forth Motion', 'scotch yoke, yugo escocés, sine motion, reciprocating, kinetic, desk toy'],
  direccionCoche: ['Rack and Pinion Car Steering with Wheel – STEM Model', 'rack and pinion, car steering, steering wheel, dirección, involute gear, cremallera'],
  expositorMecheros: ['Lighter Display Stand for Shop Counter – BIC or Clipper', 'lighter display, lighter stand, expositor mecheros, shop display, counter display, bic, clipper'],
  // 17-10-2026 · los nuevos (figuras articuladas, cajas, Halloween, bebés, juguetes, ciencia, frikis, casa)
  dragonFlexi: ['Articulated Dragon with Wings – Print in Place Flexi', 'flexi dragon, articulated dragon, print in place, dragón articulado, fidget toy, dragon'],
  pulpoFlexi: ['Articulated Octopus – Print in Place Flexi Toy', 'flexi octopus, articulated octopus, print in place, pulpo articulado, sea animal, fidget'],
  pezFlexi: ['Articulated Fish or Fish Skeleton – Print in Place', 'flexi fish, articulated fish, fish skeleton, print in place, pez articulado, fidget'],
  lagartijaFlexi: ['Articulated Gecko – Print in Place Flexi Lizard', 'flexi gecko, articulated lizard, print in place, lagartija, reptile, fidget'],
  aranaFlexi: ['Articulated Spider – Print in Place Halloween Flexi', 'flexi spider, articulated spider, halloween, print in place, araña articulada, spooky'],
  ajoloteFlexi: ['Articulated Axolotl – Cute Print in Place Flexi', 'flexi axolotl, axolotl, ajolote, articulated, print in place, kawaii'],
  cajaRegalo: ['Gift Box with Bow – Lid Fits Over the Top', 'gift box, caja regalo, present box, bow, lazo, birthday, christmas gift'],
  huevoSorpresa: ['Surprise Egg Box – Two Halves that Click Shut', 'surprise egg, easter egg, huevo sorpresa, money gift, proposal, regalo'],
  bolaNavidadAbre: ['Openable Christmas Ornament – Gift Inside', 'christmas ornament, bola navidad, openable ornament, money gift, gift card, xmas'],
  bolaPremios: ['Treat Ball for Small Dogs and Cats', 'treat ball, dog toy, cat toy, pelota premios, treat dispenser, pet'],
  pastilleroGiratorio: ['Rotating Weekly Pill Box – 7 Days', 'pill box, pastillero, pill organizer, weekly, rotating, medicine'],
  cajaGiratoria: ['Swivel Lid Box with Click – Engraved Name', 'swivel box, rotating lid, caja tapa giratoria, storage box, personalized, gift box'],
  cajaDientes: ['Baby Tooth Box – Tooth Fairy Keepsake', 'tooth box, tooth fairy, caja dientes de leche, ratoncito pérez, keepsake, kids'],
  deckBox: ['Deck Box for Sleeved Cards – Telescoping Lid', 'deck box, card box, tcg, trading cards, caja cartas, sleeves, tabletop'],
  fantasmaVela: ['Ghost Tea Light Holder – Halloween LED Lantern', 'ghost, fantasma, halloween, tea light, led candle, cute ghost, spooky decor'],
  calderoCaramelos: ['Witch Cauldron Candy Bowl with Handle', 'cauldron, caldero, halloween, candy bowl, witch, trick or treat'],
  lapidaHalloween: ['Halloween Tombstone with Custom Name', 'tombstone, lápida, halloween, rip, graveyard, personalized'],
  arbolEspiral: ['Spiral Christmas Tree – Vase Mode', 'christmas tree, árbol navidad, spiral tree, vase mode, xmas decor, led'],
  cakeTopper: ['Custom Cake Topper – Name or Phrase in One Piece', 'cake topper, personalized, birthday, wedding, baptism, comunión, tarta'],
  placaNacimiento: ['Baby Birth Announcement Plaque – Name, Date, Weight', 'birth announcement, baby plaque, placa nacimiento, newborn, nursery, personalized'],
  cartelPuerta: ['Kids Door Name Sign – Cloud, Star or Rainbow', 'door sign, name sign, cartel puerta, kids room, nursery, rainbow'],
  peanasMiniaturas: ['Textured Miniature Bases 25–50 mm, Magnet Ready', 'miniature bases, wargaming, tabletop rpg, peanas, textured bases, dungeon'],
  contadorVida: ['Life Counter 00–99 with Click Dials', 'life counter, card games, tcg, contador vidas, dial, tabletop'],
  solidosPlatonicos: ['Platonic Solids Set with Labeled Stand', 'platonic solids, geometry, math, education, sólidos platónicos, stem, classroom'],
  moebius: ['Möbius Strip Sculpture', 'mobius strip, möbius, math art, topology, sculpture, desk decor'],
  setGeometria: ['School Geometry Set – Ruler, Set Squares, Protractor', 'geometry set, ruler, protractor, set square, escuadra, cartabón, school'],
  bumeran: ['Indoor Boomerang – 3 Blades, Right or Left Handed', 'boomerang, bumerán, indoor boomerang, flying toy, kids'],
  silbato: ['Keychain Whistle – Chamber Whistle', 'whistle, silbato, keychain, emergency whistle, sports, llavero'],
  yoyo: ['Threaded Yo-Yo with Coin Weights', 'yoyo, yo-yo, yoyó, classic toy, kids, coin weight'],
  catapulta: ['Desk Catapult with Rubber Band', 'catapult, catapulta, desk toy, office toy, physics, kids'],
  huchaRemolino: ['Coin Vortex Bank – Gravity Well Spiral Funnel', 'coin funnel, vortex bank, hucha, money box, gravity well, spiral'],
  marcapaginas: ['Custom Bookmark with Cut-out Pattern and Name', 'bookmark, marcapáginas, personalized, voronoi, book lover, gift'],
  servilleteroCalado: ['Napkin Holder with Cut-out Pattern', 'napkin holder, servilletero, kitchen, table decor, honeycomb'],
  estacionEsquejes: ['Plant Propagation Station for Test Tubes', 'propagation station, test tube, plant cuttings, esquejes, hydroponic, plant lover'],
  macetaPared: ['Wall Planter – Half Hexagon, Round or Faceted', 'wall planter, maceta pared, hexagon planter, wall decor, cachepot'],
  expositorPendientes: ['Earring Display Stand – Tree or Frame', 'earring display, expositor pendientes, jewelry stand, market stall, shop display'],
  numeroMesa: ['Table Number Sign for Weddings and Restaurants', 'table number, wedding, número mesa, restaurant, event decor, sign'],
  deshojador: ['Herb Stripper – 9 Hole Sizes', 'herb stripper, kitchen tool, deshojador, kale, rosemary, cooking'],
  exprimidor: ['Citrus Juicer with Cup – Lemon Squeezer', 'citrus juicer, exprimidor, lemon squeezer, kitchen, juice'],
  abrebotellas: ['Coin Bottle Opener Keychain', 'bottle opener, abrebotellas, keychain, coin, llavero, gift'],
  anilloFidget: ['Spinner Ring – Print in Place Fidget Ring', 'spinner ring, fidget ring, anillo antiestrés, print in place, ring'],
  macetaAnimal: ['Cute Animal Planter – Cat, Bear, Bunny or Frog', 'animal planter, succulent pot, cat planter'], figuraInflada: ['Puffy Inflated Emoji Figure', 'inflated, puffy, emoji, balloon'],
  nubeEstante: ['Cloud Wall Shelf for Kids Room', 'cloud shelf, estante nube, nursery, wall shelf'], conejoLapicero: ['Pen Holder with Ears – Bunny, Cat or Bear', 'pen holder, lapicero, bunny, desk'],
  setaLampara: ['Mushroom LED Tea Light Lamp', 'mushroom lamp, seta, tea light, night light'], cajaCorazon: ['Heart Box with Fitted Lid', 'heart box, caja corazón, valentine, gift box'],
  gridfinityPro: ['Gridfinity Bin PRO – Stacking Lip, Scoop, Label, Dividers', 'gridfinity, bin, stacking lip, scoop, label, 42mm, organizer'], gridfinityPuntas: ['Gridfinity 1/4" Hex Bit Holder', 'gridfinity, bit holder, hex bits, screwdriver bits, porta puntas'], gridfinityBasePro: ['Gridfinity Baseplate – Official Profile', 'gridfinity, baseplate, drawer, cajón'],
  skadisGancho: ['IKEA SKÅDIS Hook – Secure, No Wobble', 'skadis, ikea, pegboard hook, gancho, tablero'], skadisBalda: ['IKEA SKÅDIS Shelf with Clips', 'skadis, ikea, pegboard shelf, balda, organizer'], skadisPorta: ['IKEA SKÅDIS Tool Holder – Screwdrivers, Pens', 'skadis, ikea, tool holder, screwdriver holder, pegboard'],
  goproTripode: ['GoPro to Tripod 1/4" Adapter (captive nut)', 'gopro, tripod adapter, 1/4-20, mount, adaptador trípode'], goproBrazo: ['GoPro Extension Arm 3-2 Fingers', 'gopro, extension arm, mount, brazo'],
  aspiradora: ['Vacuum Hose Adapter – Custom Diameters (32/35 mm)', 'vacuum adapter, adaptador aspiradora, hose adapter, 32mm, 35mm'], soporteBalda: ['Shelf Support Pin 5 mm (also 6 / 6.35)', 'shelf pin, soporte balda, shelf support, furniture spare part'], ganchoPuerta: ['Over the Door Hook – Custom Door Thickness', 'over door hook, gancho puerta, towel hook, coat hook'],
  tiburonFlexi: ['Articulated Shark – Print in Place Flexi', 'flexi shark, articulated, print in place, tiburón, fidget'], serpienteFlexi: ['Articulated Cobra Snake – Print in Place Flexi', 'flexi snake, cobra, articulated, print in place, serpiente'],
  rotulaTimelapse: ['Timelapse Ball Head Stand – Phone, GoPro & 1/4" Camera (Bambu A1 mini, P1P)', 'timelapse, phone holder, gopro mount, ball head, camera mount, bambu lab, a1 mini'], pinzaBobina: ['Bird Filament Clip – Holds the Filament End on the Spool', 'filament clip, spool clip, bird, bambu, filament holder'], rackPlacas: ['Build Plate Rack – A1 mini (180) and A1 / P1P (256)', 'build plate holder, bambu lab, a1 mini, p1p, pei plate, rack'], rodillosBobina: ['Spool Roller Holder with Filament Guide (Bambu A1 mini, A1, P1P, Dry Box)', 'spool holder, spool roller, filament, bambu lab, a1 mini, dry box, external spool'],
  fundaMecheroPro: ['Lighter Case – BIC Mini, Slim, Maxi or Clipper (fits for real)', 'lighter case, bic mini, clipper, funda mechero, voronoi'], ceniceroMoai: ['Moai Ashtray – Smoke Comes Out of His Mouth', 'moai, ashtray, cenicero, smoke, easter island, tealight cup'], ceniceroVolcan: ['Volcano Ashtray – Smoke from the Crater', 'volcano, ashtray, cenicero, smoke, lava'],
  gridfinityCaja: ['Gridfinity Bin – Custom Size', 'gridfinity, bin, 42mm, cubeta'], gridfinityBase: ['Gridfinity Baseplate – Custom Size', 'gridfinity, baseplate, drawer, cajón'],
  cajonOrganizador: ['Custom Drawer Organizer with Dividers', 'drawer organizer, organizador cajón, dividers, separadores'], portaboligrafos: ['Pen Holder – Round or Hexagonal Pattern', 'pen holder, portabolígrafos, pencil cup, desk'],
  organizadorCables: ['Desk Edge Cable Comb', 'cable management, cable comb, peine cables, desk'], bandejaLlaves: ['Catch-All Key Tray', 'key tray, vaciabolsillos, valet tray, ring dish'],
  panalPared: ['Hexagon Honeycomb Wall Shelf', 'honeycomb shelf, panal, hexagon, wall decor'], boteRosca: ['Screw-Top Jar with Printed Thread', 'screw jar, bote rosca, container, threaded'],
  soporteDestornilladores: ['Screwdriver Holder – Wall or Pegboard', 'screwdriver holder, destornilladores, pegboard, wall mount'], llavesAllen: ['Allen Key Holder 1.5–10 mm', 'allen key, hex key, llaves allen, holder'],
  organizadorBrocas: ['Stepped Drill Bit Organizer with Sizes', 'drill bit organizer, brocas, drill holder'], ganchoTablero: ['Pegboard Hook 1 inch (25.4 mm)', 'pegboard hook, gancho, tablero perforado'],
  cajaTornillos: ['Screw Box with Scoop Compartments', 'screw box, caja tornillos, hardware organizer'], macetaBola: ['Ball Planter with Pattern', 'ball planter, maceta bola, sphere pot'],
  macetaFacetada: ['Low Poly Faceted Planter', 'low poly planter, geometric, maceta facetada'], macetaAutorriego: ['Self-Watering Planter with Wick', 'self watering, autorriego, planter, reservoir'],
  macetaColgante: ['Hanging Planter – 3 Cord Holes', 'hanging planter, maceta colgante, macrame'], jarronOndas: ['Twisted Wave Vase (Vase Mode)', 'wave vase, vase mode, spiral'],
  jarronEspiral: ['Twisted Star Spiral Vase', 'spiral vase, star vase, vase mode'], jarronFacetado: ['Low Poly Diamond Vase', 'low poly vase, faceted, diamond'],
  jarronBurbujas: ['Stacked Bubble Vase', 'bubble vase, burbujas, modern vase'], jarronCalado: ['Pierced Pattern Decorative Vase', 'pierced vase, calado, decorative'],
  vasoOndas: ['Wave Cup – Pencil Cup or Candle Holder', 'wave cup, vaso, pencil cup'], taza: ['Mug with Handle – Pen Holder', 'mug, taza, pen holder'],
  portavelas: ['Pierced LED Candle Holder', 'candle holder, led candle, calado'], lamparaCalada: ['Patterned Cylinder Lampshade', 'lampshade, pantalla, light pattern'],
  lamparaEsfera: ['Pierced Sphere Table Lamp', 'sphere lamp, ball lamp, table lamp'], lamparaLamas: ['Twisted Fin Lamp', 'fin lamp, twisted, modern lamp'],
  cuerpoLampara: ['Lamp Base with Cable Channel', 'lamp base, pie lámpara, cable'], nudo: ['Infinite Trefoil Knot Sculpture', 'trefoil knot, math art, nudo'],
  ola: ['Standing Wave Ribbon Sculpture', 'wave sculpture, ribbon, minimal'], letraGrande: ['Standing Letter or Name for Shelves and Weddings', 'standing letter, name sign, wedding, letra'],
  esferaVoronoi: ['Voronoi Decorative Sphere', 'voronoi, sphere, bola, decor'], placaCalada: ['Pierced Pattern Panel – Wall or Lamp', 'pattern panel, celosía, wall panel'],
  posavasosCalado: ['Patterned Coaster Set', 'coaster set, posavasos, pattern'], cajaCalada: ['Pierced Pattern Basket Box', 'basket, cesta, pattern box'],
  colgadorLlaves: ['Key Holder with Name and Hooks', 'key holder, colgador llaves, name, hooks'], relojPared: ['Wall Clock for Quartz Movement', 'wall clock, reloj, quartz'],
  clipBolsas: ['Bag Clip for Chips and Coffee', 'bag clip, pinza bolsas, kitchen'], salvamanteles: ['Hexagon or Round Trivet', 'trivet, salvamanteles, hot pot'],
  marcoFotos: ['Photo Frame with Stand', 'photo frame, marco fotos, picture frame'], llaveroNombre: ['Name Keychain', 'name keychain, llavero nombre, custom'],
  placaQR: ['QR Code Keychain or Sign – Wi-Fi, Web, Instagram', 'qr code, wifi qr, llavero qr, sign'], corazonNombres: ['Heart with Two Names', 'heart names, valentine, aniversario, couple'],
  bolaNavidad: ['Christmas Ball Ornament with Name', 'christmas ball, bola navidad, name ornament'], imanNevera: ['Fridge Magnet Holder', 'fridge magnet, imán nevera, magnet'],
  spinner: ['Fidget Spinner for 608 Bearings', 'fidget spinner, 608 bearing, spinner'], dado: ['Classic Six-Sided Dice', 'dice, dado, d6, board game'],
  laberinto: ['Pocket Maze Puzzle', 'pocket maze, laberinto, travel game'], torreDados: ['Dice Tower with Ramps and Tray', 'dice tower, torre dados, tabletop, dnd'],
  soporteMando: ['Controller Stand for One or Two Gamepads', 'controller stand, soporte mando, gamepad'], soporteSwitch: ['Game Cartridge and SD Card Organizer', 'cartridge holder, switch games, sd card, organizer'],
  soporteAuriculares: ['Desk Headphone Stand', 'headphone stand, soporte auriculares, headset'], soporteMovil: ['Phone or Tablet Stand with Cable Slot', 'phone stand, soporte móvil, tablet stand'],
  placaCollar: ['Pet ID Tag with Name and Phone', 'pet tag, placa collar, dog tag, cat tag'], funda: ['Phone Case – 44 Phones, 33 Styles', 'phone case, funda móvil, tpu case'],
  engranaje: ['Parametric Spur Gear – Involute Teeth', 'spur gear, engranaje, involute, gear'], perillaD: ['D-Shaft Knob – Potentiometer, Oven, Fan', 'knob, d shaft, perilla, potentiometer'],
  separador: ['Custom Spacer and Washer', 'spacer, washer, separador, arandela'], escuadra: ['Right Angle Bracket with Holes', 'bracket, escuadra, angle bracket'],
  diferencial: ['RC Bevel Gear Differential Set', 'rc differential, diferencial, bevel gears'], reductora: ['Planetary Gearbox – Sun, Planets, Ring', 'planetary gearbox, reductora, planetary gear'],
  pinonCorona: ['RC Pinion and Spur Gear 48P / 32P', 'pinion, spur gear, piñón, corona, 48p'], hexRueda: ['RC 12 mm Wheel Hex', 'wheel hex, hexágono rueda, 12mm hex'],
  trapecio: ['RC Suspension Arm (A-Arm)', 'suspension arm, trapecio, a-arm'], torreAmort: ['RC Shock Tower', 'shock tower, torre amortiguadores'], precarga: ['RC Shock Preload Clips', 'preload clips, shock spacers, precarga'],
  chasisPlaca: ['RC Flat Chassis Plate', 'rc chassis, chasis, plate'], llantaRC: ['RC Wheel Rim 1.9 / 2.2 / 2.8 / 3.8', 'rc wheel, llanta, rim, crawler'], neumaticoRC: ['RC Tire (TPU) – 6 Tread Patterns', 'rc tire, neumático, tpu tire'],
  adaptadorHex: ['RC Wheel Hex Adapter 12 to 17 mm', 'hex adapter, 17mm, 12mm'], mangueta: ['RC Steering Knuckle with Bearings', 'steering knuckle, mangueta, rc steering'],
  acopleGarras: ['Jaw Shaft Coupling with TPU Spider', 'jaw coupling, acoplamiento, shaft coupler'], bisagraImpresa: ['Print-in-Place Hinge', 'print in place, hinge, bisagra'],
  clipTubo: ['Snap-On Tube Clip', 'tube clip, pipe clip, clip tubo'], abrazadera: ['Two-Part Pipe Clamp', 'pipe clamp, abrazadera, tube clamp'],
  cajaCorredera: ['Sliding Lid Box', 'sliding lid box, caja corredera, box'], esquinaDel: ['RC Front Corner Set – Arm, C-Hub, Knuckle', 'rc front end, c hub, knuckle'],
  esquinaTras: ['RC Rear Corner Set – Arm and Hub Carrier', 'rc rear hub, hub carrier, toe'], palier: ['RC Dogbone Driveshaft', 'dogbone, palier, driveshaft'],
  riostra: ['RC Center Brace', 'chassis brace, riostra'], balancines: ['RC Bellcrank Steering Set', 'bellcrank, steering, balancines'],
  bielaRotula: ['RC Turnbuckles and Ball Ends', 'ball end, rótula, turnbuckle'], tornillo: ['Screw Hole (Design Helper)', ''], tuerca: ['Nut Trap (Design Helper)', ''], inserto: ['Heat-Set Insert Hole (Design Helper)', ''],
  iman: ['Magnet Pocket (Design Helper)', ''], rodamiento: ['Metal Bearing Seat (Design Helper)', ''], rodamientoImpreso: ['Print-in-Place Roller Bearing', 'printed bearing, rodamiento impreso, print in place'],
  pruebaPrecision: ['Printer Precision Test – Calibration Coupon', 'calibration, test print, tolerance test, calibración'], pruebaRodImpreso: ['Printed Bearing Tolerance Test', 'tolerance test, bearing test, calibration'],
  plantillaRodamientos: ['Metal Bearing Fit Template', 'bearing fit, tolerance, template'], colgar: ['Keyhole Hanger Slot (Design Helper)', ''], patronHuecos: ['Hole Pattern (Design Helper)', ''],
  roscaBote: ['Screw Thread (Design Helper)', ''], anilla: ['Keyring Loop (Design Helper)', ''], spool: ['RC Locked Differential (Spool)', 'spool, locked diff, drift, crawler'],
  difRectos: ['RC Spur Gear Differential', 'spur differential, planetary diff, rc diff'], brazoServo: ['Servo Horn and Servo Saver', 'servo horn, servo saver, brazo servo'],
  soporteServo: ['Servo Mount – Custom Size', 'servo mount, soporte servo'], postesCarroceria: ['RC Body Posts', 'body posts, postes carrocería'], parachoques: ['RC Bumper Front or Rear', 'rc bumper, parachoques'],
  aleron: ['RC Rear Wing with Gurney', 'rc wing, alerón, spoiler'], sujetaBateria: ['RC Battery Strap Bridge', 'battery holder, sujeta batería, battery strap'],
  copaSalida: ['RC Outdrive Cup', 'outdrive, copa salida, dogbone cup'], cardan: ['Universal Joint (Cardan)', 'universal joint, cardan, u joint'],
  soporteMotor: ['RC Motor Mount 540 / 380 with Slots', 'motor mount, 540 motor, soporte motor'], jarronLujo: ['Luxury Vase – 5 Shapes × 6 Textures', 'luxury vase, textured vase, jarrón lujo'],
  tornilloTuerca: ['Printable Bolt and Nut', 'bolt and nut, tornillo, tuerca, thread'], miniPuerta: ['Miniature Opening Door', 'mini door, dollhouse door, puerta'],
  miniMesa: ['Miniature Table', 'mini table, dollhouse furniture'], miniTaburete: ['Miniature Stool', 'mini stool, dollhouse'], miniEstanteria: ['Miniature Bookcase', 'mini bookcase, dollhouse shelf'],
  miniCasita: ['Miniature House with Removable Roof', 'mini house, casita, village'], trianguloImposible: ['Impossible Triangle Illusion', 'penrose triangle, optical illusion, impossible'],
  pajaroEquilibrista: ['Balancing Bird on Fingertip', 'balancing bird, pájaro equilibrista, physics toy'], tensegridad: ['Floating Tensegrity Table', 'tensegrity, floating table, illusion'],
  piedrasZen: ['Zen Balancing Stones', 'zen stones, cairn, meditation'], animalChibi: ['Chibi Animal Figure – 7 Animals', 'chibi, kawaii animal, figure, low poly'],
  navidadChibi: ['Chibi Christmas Figure – Santa, Snowman, Reindeer', 'chibi christmas, santa, snowman'], fantasiaChibi: ['Chibi Fantasy Creature – Dragon, T-Rex, Robot', 'chibi dragon, t-rex, robot, monster'],
  pensadores: ['Nordic Abstract Figures – See, Hear, Speak No Evil', 'abstract figure, nordic, thinker, three wise'], parejaCisnes: ['Swan Couple Heart Sculpture', 'swans heart, wedding, love, cisnes'],
  macetaBalon: ['Sports Ball Planter with Your Text', 'ball planter, basketball, tennis, custom text'], copoNieve: ['Snowflake Ornament – Every Number Unique', 'snowflake, copo nieve, ornament'],
  estrellaArbol: ['Christmas Tree Topper Star', 'tree topper, star, estrella árbol'], lamparaLuna: ['Moon Lamp with Craters', 'moon lamp, lámpara luna, night light'],
  posavasosVinilo: ['Vinyl Record Coasters with Box', 'vinyl coasters, record, posavasos vinilo, music'], organizadorMaquillaje: ['Tiered Makeup Organizer', 'makeup organizer, maquillaje, lipstick, brushes'],
  siluetaPared: ['Wall Silhouette Decor – 28 Designs', 'wall silhouette, wall art, silueta pared'], arbolPareja: ['Love Tree with Couple and Names', 'love tree, wedding, couple, names'],
  silCaballos: ['Horse Silhouettes', 'horse, caballo, equestrian'], silCiervos: ['Deer and Reindeer Silhouettes', 'deer, ciervo, reindeer'], silFlores: ['Flower Silhouettes – Lotus, Rose, Vines', 'lotus, rose, floral'],
  silBaile: ['Dance and Music Silhouettes', 'ballet, dancer, music, saxophone'], silDeporte: ['Sports Silhouettes – Football, Cycling, Motocross, BMX', 'football, cycling, motocross, bmx'],
  silViajes: ['Travel Silhouettes – Ships, Planes, Cities', 'travel, ship, plane, skyline'], silSalvajes: ['Wild Animal Silhouettes', 'lion, elephant, giraffe, wolf'],
  silHalloween: ['Halloween Silhouettes', 'pumpkin, witch, bat, haunted house'], silBebes: ['Baby, Baptism and Communion Silhouettes', 'baptism, communion, stork, angel'],
  silMascotas: ['Pet Silhouettes – Cats, Dogs, Rabbits', 'cat, dog, rabbit, pet lover'], mandalaRelieve: ['Relief Mandala Coaster or Wall Art', 'mandala, coaster, two colors'],
  arcoirisApilable: ['Montessori Stacking Rainbow', 'montessori, stacking rainbow, arcoíris'], tangram: ['Tangram Puzzle with Frame Box', 'tangram, puzzle, educational'],
  cuboSoma: ['Soma Cube 3D Puzzle', 'soma cube, 3d puzzle, brain teaser'], tresEnRaya: ['Travel Tic-Tac-Toe', 'tic tac toe, tres en raya, travel game'],
  peonza: ['Spinning Top', 'spinning top, peonza, toy'], laberintoCircular: ['Circular Marble Maze – Every Number Unique', 'marble maze, circular maze, laberinto'],
  torreCanicas: ['Spiral Marble Tower', 'marble tower, spiral, marble run'], senku: ['Peg Solitaire Marble Game', 'peg solitaire, senku, marble game'],
  adnModelo: ['DNA Double Helix Model', 'dna model, double helix, adn, biology'], moleculas: ['Molecule Model Kit – C, O, H, N', 'molecule kit, chemistry, química'],
  relojSol: ['Sundial for Your Latitude', 'sundial, reloj sol, astronomy'], dadosRol: ['RPG Dice Set D4–D20', 'rpg dice, d20, dnd dice, dados rol'],
  bandejaDados: ['Hexagonal Dice Tray', 'dice tray, bandeja dados, tabletop'], torreZigzag: ['Stackable Zigzag Marble Run', 'marble run, stackable, zigzag'],
  cuatroEnLinea: ['Connect Four Game with Release Bar', 'connect four, cuatro en línea, board game'], damas: ['Checkers Board with 24 Pieces', 'checkers, damas, board game'],
  serpiente: ['Articulated Flexi Snake – Print in Place', 'flexi, articulated snake, print in place'], deslizante15: ['15 Sliding Puzzle', 'sliding puzzle, 15 puzzle, brain teaser'],
  cosmeticosGiratorio: ['Rotating Makeup Organizer', 'rotating organizer, makeup, brushes'], estacionCarga: ['Charging Station for Phones and Tablet', 'charging station, phone dock, cable'],
  rielPared: ['Wall Rail System with Hanging Modules', 'wall rail, french cleat, hooks, modular'], cajaEngranajes: ['Gearbox Demonstrator with Crank (9:1)', 'gearbox, demonstrator, stem, gears'],
  soporteMotorDC: ['DC Motor Mount – N20, 130, 280, 370, 540, 775', 'dc motor mount, n20, robotics'], soporteServoPro: ['Pro Servo Mount – Micro to Giant', 'servo mount, robotics, bracket'],
  adaptadorEje: ['Shaft to 12 mm Hex Wheel Adapter (3–6 mm)', 'hex adapter, shaft coupler, 12mm hex'], ruedaDrift: ['RC Drift Wheel with Hard Tire', 'drift wheel, rc drift, 1/10'],
  rodamientoPestana: ['Printed Flange Bearing (2 or 4 Bolt)', 'flange bearing, pillow block, printed bearing'], cajaBayoneta: ['Bayonet Lock Box with Padlock Eye', 'bayonet box, twist lock, container'],
  chasisBuggy: ['RC 2WD Buggy Chassis (Rear Motor)', 'buggy chassis, 2wd, rc buggy'], rodamientoPlanetario: ['Planetary Gear Bearing Fidget – Print in Place', 'gear bearing, planetary, fidget'],
  corazonEngranajes: ['Gear Heart with Your Names', 'gear heart, valentine, names, engranajes'], mesaEngranajes: ['Desk Gear Toy with Crank', 'desk toy, gears, crank'],
  llaveroEngranajes: ['Spinning Gear Keychain with Name', 'gear keychain, fidget keychain, name'], juegoEngranajesMotor: ['Motor Gears for Arduino – TT, N20, NEMA 17, 28BYJ-48', 'arduino gears, robotics, nema 17'],
  espirografo: ['Spirograph Drawing Set', 'spirograph, drawing toy, kids art'], casaMunecas: ['Dollhouse Furniture Set – 13 Pieces, 3 Scales', 'dollhouse furniture, miniature, 1:12'],
  hormiguero: ['Ant Farm Formicarium – Nest and Outworld', 'ant farm, formicarium, hormiguero'], cajoneraDoble: ['Stackable Two-Drawer Unit', 'drawer unit, cajonera, stackable'],
  macetaPlato: ['Planter with Drainage and Saucer', 'planter, drainage, saucer, plato'], casitaNavidad: ['Christmas Village LED Houses', 'christmas village, led house, belén'],
  adornoNombre: ['Personalized Christmas Ornament with Name', 'name ornament, christmas, personalized'], calendarioAdviento: ['Advent Calendar Tree – 24 Drawers', 'advent calendar, christmas, drawers'],
  farolNavidad: ['Christmas Lantern with Glowing Silhouettes', 'christmas lantern, farol, led'], belenPeana: ['Nativity Scene Light Box', 'nativity, belén, light box'],
  calabazaHalloween: ['Halloween Pumpkin for LED Candle', 'pumpkin, jack o lantern, calabaza'], organizadorCorazon: ['Heart Makeup Organizer', 'heart organizer, makeup, brushes'],
  estanteriaArcos: ['Two-Tier Rainbow Arch Shelf', 'arch shelf, rainbow, estantería'], fundaMechero: ['Lighter Case with Your Text', 'lighter case, funda mechero, custom'],
  titiritero: ['Puppeteer Hand with Marionette Sculpture', 'puppeteer, marionette, desk sculpture'], columpioLuna: ['Girl on a Star Swing Sculpture', 'moon swing, star, girl, decor'],
  vasoPremium: ['Premium Textured Cup – Quilted, Fluted, Spiral', 'textured cup, pencil cup, quilted'], macetaPremium: ['Premium Textured Planter with Saucer', 'premium planter, textured, saucer'],
  jarronPremium: ['Premium Textured Vase', 'premium vase, textured, quilted'], mangoPuntas: ['1/4 inch Bit Screwdriver Handle with Storage', 'bit driver, screwdriver handle, 1/4 hex'],
  soportePuntas: ['Tiered Bit Holder', 'bit holder, hex bits, organizer'], galgaRadios: ['Radius Gauge Set', 'radius gauge, galga, measuring'],
  pinzas: ['One-Piece Precision Tweezers', 'tweezers, pinzas, precision'], exprimeTubos: ['Tube Squeezer', 'tube squeezer, toothpaste, exprime tubos'],
  asaBolsas: ['Shopping Bag Carry Handle', 'bag handle, grocery, asa bolsas'], cucharaMedidora: ['Exact Measuring Spoon', 'measuring spoon, cuchara medidora, kitchen'],
  embudo: ['Vented Funnel', 'funnel, embudo, kitchen'], jabonera: ['Draining Soap Dish', 'soap dish, jabonera, bathroom'], cierraBolsas: ['Bag Sealer with Screw Cap', 'bag sealer, cierra bolsas, pour spout'],
  pieDeRey: ['Pro Vernier Caliper with Springs', 'caliper, vernier, pie de rey, measuring'], cajaBisagra: ['Print-in-Place Hardware Box with Hinge', 'hinged box, print in place, screws'],
  cofreBisagra: ['Print-in-Place Plank Chest with Latch', 'treasure chest, cofre, print in place'], joyeroBisagra: ['Hinged Jewelry Box with Name', 'jewelry box, joyero, ring box'],
  estucheBisagra: ['Hinged Pencil Case', 'pencil case, estuche, brushes'], botiquinBisagra: ['Hinged First Aid Box', 'first aid, botiquín, pill box'],
  chasisBanera: ['RC Tub Chassis 1/10 to 1/28', 'tub chassis, rc chassis, chasis bañera'], chasisDoble: ['RC Double Deck Chassis – Touring / Drift', 'touring chassis, drift chassis'],
  chasisCrawler: ['RC Crawler Ladder Frame Chassis', 'crawler chassis, ladder frame, scx24'], bicicletaKit: ['Bicycle Model Kit – Wheels Turn', 'bicycle kit, model kit, bici'],
  motoKit: ['Motorcycle Model Kit – Wheels Turn', 'motorcycle kit, model kit, moto'], miniTaladro: ['Mini Drill Press for Rotary Tool', 'drill press, rotary tool, mini taladro'],
  portarrollosMini: ['Miniature Kitchen Roll Holder', 'dollhouse kitchen, miniature'], bisagraFuerte: ['Heavy-Duty Two-Leaf Hinge', 'hinge, heavy duty, bisagra'],
  cajaCajon: ['Box with Drawer', 'drawer box, caja cajón, storage'], cajaLados: ['Hexagonal Box with Lid', 'hexagon box, octagon box, caja hexagonal'],
  cubetaApilable: ['Stackable Parts Bin', 'stackable bin, cubeta, parts bin'], pomoMueble: ['Drawer Knob – Mushroom, Ball or Cylinder', 'drawer knob, pomo, furniture'],
  asaMueble: ['Bridge Drawer Pull Handle', 'drawer pull, handle, tirador'], jarronBambu: ['Bamboo Vase', 'bamboo vase, jarrón bambú, vase mode'], jarronGajos: ['Pumpkin Lobe Vase', 'lobed vase, pumpkin vase'],
  jarronTorcido: ['Twisted Prism Vase', 'twisted vase, prism'], jarronBotella: ['Bottle Bud Vase', 'bud vase, bottle vase'], vasoFacetado: ['Faceted Cup', 'faceted cup, low poly, pencil cup'],
  vasoTorcido: ['Twisted Cup – Pencil or Brush Holder', 'twisted cup, brush holder'], cuencoOndas: ['Wave Bowl – Fruit Bowl or Catch-All', 'wave bowl, fruit bowl, centerpiece'],
  estrellaPared: ['Faceted Relief Star', 'star decor, estrella, nursery'], diamanteDeco: ['Faceted Decorative Diamond with Stand', 'diamond, gem, decor'],
  arcoIris: ['Nested Rainbow Arches', 'rainbow, stacking, decor'], espiralViento: ['Wind Spinner Spiral', 'wind spinner, spiral, garden'],
  velaFacetada: ['Faceted Tea Light Holder', 'tea light, faceted, candle'], velaCandelero: ['Taper Candle Holder', 'taper candle, candlestick, candelero'],
  velaTrio: ['Three-Step Candle Holder Trio', 'candle trio, centerpiece'], velaPlato: ['Pillar Candle Plate', 'candle plate, pillar candle'],
  velaFarol: ['Gothic Window Lantern', 'lantern, gothic, farol'], velaCorazon: ['Heart Tea Light Holder', 'heart candle, valentine'],
  velaCentro: ['Flower Candle Centerpiece (3–6 candles)', 'centerpiece, candles, wedding'], velaBandeja: ['Candle Tray with Lighter Slot', 'candle tray, lighter'],
  velaAdaptador: ['Candle Adapter – Tea Light or Taper', 'candle adapter, candlestick'], velaEstrellas: ['Star Pattern Candle Shade', 'star candle, light pattern'],
  velaLoto: ['Lotus Flower Candle Holder', 'lotus candle, flor de loto'], lampPliegues: ['Pleated Pendant Lampshade', 'pleated lamp, pendant, lampshade'],
  lampDiamante: ['Faceted Diamond Lampshade', 'diamond lampshade, faceted'], lampTulipa: ['Twisted Tulip Lampshade', 'tulip lamp, twisted'],
  lampCelosia: ['Lattice Lampshade', 'lattice lamp, shadow pattern'], lampBase: ['Geometric Base for Exposed Bulb', 'bulb base, geometric lamp'],
  lampAro: ['Lampshade Reducer Ring E27 to E14 / B22', 'reducer ring, e27, e14, b22'], lampNube: ['LED Wall Light – Cloud, Moon, Heart or Star', 'led wall light, cloud lamp, halo'],
  ratonExpositor: ['Mouse Display Stand', 'mouse stand, gaming mouse, display'], ratonBungee: ['Mouse Cable Bungee', 'mouse bungee, cable, esports'],
  ratonFunda: ['Desk Side Mouse Holder', 'mouse holder, desk mount'], ratonDock: ['Mouse Dock with USB Receiver Slot', 'mouse dock, usb receiver'],
  reposaMunecas: ['Mouse Wrist Rest', 'wrist rest, reposamuñecas, ergonomic'], portaEstropajo: ['Sponge Holder with Drip Tray', 'sponge holder, kitchen sink'],
  ganchoPuerta: ['Over-the-Door Hook', 'door hook, gancho puerta'], topePuerta: ['Door Stop Wedge', 'door stop, tope puerta'], portallaves: ['Wall Key Holder with Hooks', 'key hooks, colgador'],
  escurreCubiertos: ['Cutlery Drainer with Tray', 'cutlery drainer, kitchen'], ganchosS: ['S Hooks', 's hooks, ganchos'], pinzaMantel: ['Tablecloth Clip', 'tablecloth clip, terrace'],
  cepillosDientes: ['Toothbrush Holder', 'toothbrush holder, bathroom'], calendario: ['Perpetual Cube Calendar', 'perpetual calendar, desk calendar'],
  placaNombre: ['Desk Name Plate', 'name plate, nameplate, office'], seisEnUno: ['6-in-1 Desk Organizer', 'desk organizer, all in one'],
  portaNotas: ['Sticky Note Holder', 'sticky notes, post-it holder'], cuelgaAuriculares: ['Clamp-On Headphone Hanger', 'headphone hanger, desk clamp'],
  sujetalibros: ['Honeycomb Bookend', 'bookend, sujetalibros'], elevadorPortatil: ['Foldable X Laptop Stand', 'laptop stand, portable'],
  tulipan: ['Tulip Flower', 'tulip, tulipán'], margarita: ['Daisy Flower', 'daisy, margarita'], girasol: ['Sunflower', 'sunflower, girasol'], rosa: ['Rose Flower', 'rose, rosa'],
  florMaceta: ['Little Flower in a Pot', 'flower pot, desk flower'], hormigaForrajeo: ['Ant Outworld for Test Tube Setup', 'ant outworld, test tube, ants'],
  hormigaNido: ['Modular Ant Nest', 'ant nest, formicarium, modular'], hormigaConectores: ['Formicarium Connectors and Feeder', 'formicarium, connectors, feeder'],
  pincelLavador: ['Paint Brush Washer', 'brush washer, painting, miniatures'], pincelSoporte: ['Paint Brush Holder', 'brush holder, painting'],
  papeleraMesa: ['Desk Trash Bin with Bag Ring', 'trash bin, papelera'], papeleraColgar: ['Cabinet Door Hanging Bin', 'hanging bin, kitchen'],
  molino: ['Nine Men\'s Morris Game', 'nine mens morris, molino, board game'], solitario: ['Peg Solitaire Board', 'peg solitaire, solitario'], mancala: ['Mancala Board Game', 'mancala, board game'],
  portaCartas: ['Playing Card Holder', 'card holder, kids, cards'], tarjetero: ['Business Card Holder with Your Name', 'business card holder, tarjetero'],
  cenicero: ['Windproof Ashtray', 'ashtray, cenicero, terrace'], posavasos: ['Branded Coasters with Holder', 'coasters, branded, logo'],
  portaCarta: ['Table Menu, Price or QR Stand', 'menu stand, qr stand, table number'], botePropinas: ['Tip Jar or Money Box', 'tip jar, money box, hucha'],
  lavaPincelesPro: ['Pro Brush Washer – 4 Parts', 'brush washer, painting station'], escritorioModular: ['Modular Dovetail Desk Organizer', 'modular organizer, dovetail, desk'],
  tarjetaAvion: ['Card Kit – Airplane', 'card kit, airplane, avión'], tarjetaDino: ['Card Kit – Dinosaur', 'card kit, dinosaur'], tarjetaPeonza: ['Card Kit – Spinning Top', 'card kit, spinning top'],
  tarjetaCohete: ['Card Kit – Rocket', 'card kit, rocket'], tarjetaCoche: ['Card Kit – Car', 'card kit, car'], tarjetaVelero: ['Card Kit – Sailboat', 'card kit, sailboat'],
  tarjetaHeli: ['Card Kit – Helicopter', 'card kit, helicopter'], tarjetaTortuga: ['Card Kit – Turtle', 'card kit, turtle'], tarjetaEstrella: ['Card Kit – 3D Star', 'card kit, star, christmas'],
  tarjetaArbol: ['Card Kit – 3D Tree', 'card kit, tree, christmas']
};
// la primera frase en inglés (la que engancha), por grupo: corta y sin adornos
const GANCHO = {
  cuqui: 'A cute little piece that makes any shelf or desk smile.', organizar: 'Everything in its place: a tidy, practical organizer.', hogar: 'A small everyday helper for the house that just works.',
  taller: 'Keep your workshop tools in order and always at hand.', macetas: 'A planter that looks good and keeps your plants happy.', jarrones: 'A decorative vase that prints fast and looks premium.',
  vasos: 'Warm light and clean lines for your table or shelf.', lamparas: 'A lamp design that draws beautiful light patterns.', deco: 'A striking decor piece that gets people talking.',
  calados: 'Light and shadow through an elegant cut-out pattern.', regalos: 'A personal gift that is quick to print and easy to love.', juegos: 'A classic game or fidget, ready to play straight off the printer.',
  gaming: 'A clean upgrade for your gaming desk setup.', mascotas: 'Made for pets and their people.', movil: 'A phone case that fits and protects.',
  mecanica: 'A precise mechanical part with real tolerances.', rc: 'An RC part designed to fit and take a beating.', componentes: 'A parametric helper for your own designs.',
  miniaturas: 'Tiny details for your dollhouse or diorama.', ninos: 'A toy for kids that is fun to print and safe to play with.', navidad: 'Festive decor for the tree, the window or the table.',
  adultos: 'An elegant sculpture for a living room or a special gift.', jovenes: 'Room decor with personality, ready to customize.', cuadros: 'Wall art that turns a blank wall into a statement.',
  halloween: 'Spooky decor that glows with an LED candle.', bebes: 'A keepsake for christenings, communions and new babies.', canicas: 'Marble fun: watch them roll, again and again.',
  ciencia: 'Learn by holding it: a science model for class or home.', frikis: 'Gear for your tabletop and role-playing nights.', oficina: 'A smarter, tidier desk in one print.',
  juguetes: 'A model kit to print, assemble and play with.', flores: 'Flowers that never wilt: a sweet gift for anyone.', empresas: 'A practical piece for shops, bars and restaurants, with your brand.',
  kits: 'A flat card kit that pops out and assembles into a 3D toy.'
};
// lo que dice cada «uso» (para la descripción) · [es, en]
const USO = { jarron: ['🏺 Modo jarrón (una sola pared): rápido y sin costuras', '🏺 Vase mode (single wall): fast and seamless'], flexible: ['🪢 Para TPU (flexible)', '🪢 Made for TPU (flexible)'],
  encaje: ['🧩 Piezas que encajan: comprobadas montadas', '🧩 Parts that fit together: checked assembled'], funcional: ['💪 Pensada para usarse a diario', '💪 Built for everyday use'], pieza: ['🔩 Medidas exactas (paramétrico)', '🔩 Exact dimensions (parametric)'], mecanica: ['⚙️ Mecanismo que funciona', '⚙️ Working mechanism'] };

export const tieneFicha = k => !!T[k];
export const esAyuda = k => AYUDA.has(k);
export function precioDe(K, k) { const D = K.DISENOS[k] || {}; if (AYUDA.has(k) || GRATIS.has(k)) return 0; return PRECIO[k] || (CAT[D.cat] || [, 1.99])[1] || 1.99; }
const tagsDe = (K, k) => { const D = K.DISENOS[k] || {}, own = ((T[k] || [])[1] || '').split(',').map(x => x.trim()).filter(Boolean), base = ((CAT[D.cat] || [])[2] || '').split(',').map(x => x.trim()).filter(Boolean); return [...new Set(own.concat(base))].slice(0, 12); };
// la ficha de un diseño del catálogo (I = { dims, piezas } de lo que hay en pantalla · o = { precio: el suyo })
export function ficha(K, k, v, I = {}, o = {}) {
  const D = K.DISENOS[k]; if (!D) throw new Error('No encuentro ese diseño.');
  const en = (T[k] || [D.t])[0], es = D.t.replace(/\s*🎁\s*$/, ''), ayuda = AYUDA.has(k), gratis = GRATIS.has(k), sug = precioDe(K, k), precio = gratis || ayuda ? 0 : (Number(o.precio) > 0 ? Math.round(Number(o.precio) * 100) / 100 : sug);
  const cat = CATEGORIAS[(CAT[D.cat] || ['home'])[0]] || CATEGORIAS.home, tags = tagsDe(K, k), dims = (I.dims || []).map(x => Math.round(x)), nP = I.piezas || 1;
  const usos = USO[D.uso] ? [USO[D.uso]] : [], texto = (D.campos || []).some(c => c.txt);
  const lEs = [D.d + '.'].concat(usos.map(x => '✔ ' + x[0]), dims.length ? ['✔ 📏 ' + dims.join(' × ') + ' mm'] : [], ['✔ ' + (nP > 1 ? nP + ' piezas · ' : '') + (typeof D.soportes === 'function' ? 'casi todo SIN soportes (solo unas pocas piezas, con soportes de árbol)' : D.soportes ? 'con soportes de árbol (se quitan fácil)' : 'se imprime SIN soportes')], texto ? ['✔ ✏️ Personalizable (texto o nombre)'] : []);
  const lEn = [GANCHO[D.cat] || 'Original parametric design, checked before release.'].concat(usos.map(x => '✔ ' + x[1]), dims.length ? ['✔ 📏 ' + dims.join(' × ') + ' mm'] : [], ['✔ ' + (nP > 1 ? nP + ' parts · ' : '') + (typeof D.soportes === 'function' ? 'mostly NO supports (only a few parts need tree supports)' : D.soportes ? 'tree supports (easy to remove)' : 'prints with NO supports')], texto ? ['✔ ✏️ Customizable text or name'] : []);
  // (20-10 noche: antes TODO salía «3 paredes · relleno 15 %», también el camión RC y los engranajes: impreso así, se parte. Ahora, lo que pide cada uso
  // —lo mismo que pone el programa al exportar, consejos3d.claves—)
  const algunas = typeof D.soportes === 'function', sop = algunas ? 'soportes de árbol solo en las piezas que lo dicen' : D.soportes ? 'soportes de árbol' : 'SIN soportes', sopEn = algunas ? 'tree supports only on the parts marked so' : D.soportes ? 'tree supports' : 'NO supports', u = D.uso === 'pieza' ? 'mecanica' : D.uso;
  const imp = u === 'jarron' ? 'PLA · capa 0,2 mm · MODO JARRÓN (espiral) · boquilla 0,4' : u === 'flexible' ? 'TPU 95A · capa 0,2 mm · despacio (25–40 mm/s) · ' + sop
    : u === 'mecanica' ? 'PETG (o PA) · capa 0,16 mm · 6 paredes · 6 capas arriba y abajo · relleno 60 % giroide · ' + sop + ' · boquilla 0,4'
      : u === 'funcional' ? 'PETG o PLA · capa 0,2 mm · 4 paredes · relleno 30 % giroide · ' + sop + ' · boquilla 0,4'
        : u === 'encaje' ? 'PLA o PETG · capa 0,2 mm · 3 paredes · relleno 20 % · pared precisa · ' + sop + ' · boquilla 0,4'
          : 'PLA (o PETG) · capa 0,2 mm · 3 paredes · relleno 15 % · ' + sop + ' · boquilla 0,4';
  const impEn = u === 'jarron' ? 'PLA · 0.2 mm layers · VASE MODE (spiralize) · 0.4 nozzle' : u === 'flexible' ? 'TPU 95A · 0.2 mm layers · slow (25–40 mm/s) · ' + sopEn
    : u === 'mecanica' ? 'PETG (or PA) · 0.16 mm layers · 6 walls · 6 top/bottom layers · 60% gyroid infill · ' + sopEn + ' · 0.4 nozzle'
      : u === 'funcional' ? 'PETG or PLA · 0.2 mm layers · 4 walls · 30% gyroid infill · ' + sopEn + ' · 0.4 nozzle'
        : u === 'encaje' ? 'PLA or PETG · 0.2 mm layers · 3 walls · 20% infill · precise wall · ' + sopEn + ' · 0.4 nozzle'
          : 'PLA (or PETG) · 0.2 mm layers · 3 walls · 15% infill · ' + sopEn + ' · 0.4 nozzle';
  const descEs = lEs.join('\n') + '\n\nImpresión: ' + imp + '\n\nDiseño original de CelebriDiseños.', descEn = lEn.join('\n') + '\n\nPrint: ' + impEn + '\n\nOriginal design by CelebriDiseños.';
  const txt = (D.campos || []).filter(c => c.txt).map(c => String((v || {})[c.k] || '').trim()).find(Boolean) || '', base = limpio(es) + (txt ? '_' + limpio(txt).slice(0, 20) : ''); // (con su texto: cada nombre, su archivo)
  return {
    k, titulo: { es, en }, descripcion: { es: descEs, en: descEn }, etiquetas: tags, categoria: cat, precio, sugerido: sug, gratis, ayuda, nombreArchivo: base.replace(/_$/, '') || 'pieza',
    campos: [
      { k: 'titulo', t: 'Nombre (título)', v: tituloCults(en, es), nota: notaTitulo(en, es) },
      { k: 'descripcion', t: 'Descripción', v: descEn + '\n\n———\n\n' + descEs, nota: NOTAS.descripcion + (texto ? ' Lleva TEXTO: el STL sale con el que tengas puesto; en Cults puedes poner «personalizado bajo pedido».' : '') },
      { k: 'impresion', t: 'Parámetros de impresión 3D', v: impEn + '\n' + imp, nota: 'Lo que le sirve al que lo imprime. ' + (typeof D.soportes === 'function' ? 'Casi todo sin soportes; unas pocas piezas los llevan (lo dice el manual, pieza a pieza): dilo claro y no habrá quejas.' : D.soportes ? 'Esta pieza lleva soportes por su forma: dilo claro y no habrá quejas.' : '«Sin soportes» vende: esta pieza se imprime sin soportes.') },
      { k: 'categoria', t: 'Categoría', v: cat[1] + ' (' + cat[0] + ')', nota: NOTAS.categoria },
      { k: 'etiquetas', t: 'Etiquetas (palabras clave)', v: tags.join(', '), nota: NOTAS.etiquetas },
      { k: 'precio', t: 'Precio', v: ayuda ? 'No es para vender' : gratis ? 'Gratis' : euros(precio), nota: ayuda ? 'Es una AYUDA PARA DISEÑAR (se resta o se añade a otra pieza): no la subas sola a Cults.' : gratis ? NOTAS.gratis : notaPrecio(precio, sug) },
      { k: 'archivos', t: 'Archivos', v: base + '_STL.zip (' + (nP > 1 ? 'una pieza por archivo' : 'la pieza') + ') y ' + base + '.3mf', nota: NOTAS.archivos },
      { k: 'fotos', t: 'Fotos', v: '01_portada · 02_otro_lado · 03_desde_arriba', nota: NOTAS.fotos },
      { k: 'licencia', t: 'Pago / gratis y licencia', v: gratis ? 'Gratis · Pública · CC Atribución' : 'De pago · Pública', nota: gratis ? NOTAS.gratis : NOTAS.licencia }]
  };
}
