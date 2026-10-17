# CelebriDREW · ropa en 3D dentro de CelebriDiseños

Encargo y estado: sección «👗 EN CURSO (16-10-2026)» al principio de `00_SISTEMA/PASE_A_OTRA_IA_V20.md`.

## Qué hay (cada archivo)
- `geom.js` · Bézier, largos, cruces, desfase (todo en mm, Y hacia arriba).
- `pieza.js` · el modelo de PIEZA (puntos, tramos, bordes con nombre, pinzas, piquetes, márgenes, corte) y sus ediciones.
- `margen.js` · línea de corte con margen por borde. `valida.js` · estados borrador → inicial → ensamblable → validado → revisado.
- `bloques/` · plantillas paramétricas (camiseta, sudadera, falda, pantalón, VESTIDO) y su registro (`index.js`).
- `tallas.js` · cuerpo vs prenda (+ holguras), gradación = volver a trazar. `exporta.js` + `pdf.js` · SVG 1:1, PDF A4/A0, DXF R12, ficha.
- `montaje.js` + `pdf_montaje.js` · tipos de costura, pasos de montaje y el PDF «patrón completo» (portada, piezas, hojas, montaje).
- `disenos.js` · 11 DISEÑOS LISTOS (un clic → plantilla + opciones + tela + color) y el PRECIO estimado (tela × €/m + mercería + horas × margen).
- `proyecto.js` · proyecto (IndexedDB), historial, versiones, ediciones que sobreviven al cambiar medidas.
- `foto/` · cadena foto → patrón por etapas (calidad, recorte, qué prenda es, rasgos, escala, medidas, patrón, validación).
  16-10: `foto/desde_foto.js` = la cadena con la foto ENDEREZADA por el folio (el folio se tapa con el color del fondo y es la ESCALA: sus dos
  lados); `analizaFoto` → FP, `rehaz` (tras arrastrar puntos), `enVivo` (mientras se arrastra), `cambiaCategoria`, `puntosMaquina`,
  `confirma`, `dibujo`, `superpone` (el patrón encima de la foto), `resumen`, `aProyecto` (lo que va a la prenda). `foto/puntos.js` = de qué
  PUNTOS sale cada medida (`DEF`: arriba / pantalón / falda / vestido) y `remide` (solo lo que usa el punto movido; queda «ajustada a mano»).
  `rasgos.js` ahora mide también VESTIDOS (`rasgosVestido`: cuerpo cortado en la cintura + falda), la axila sin mangas donde entra la sisa, la
  axila con mangas prolongando los bordes (el recorte cerraba la punta), la boca de la manga con esquinas de verdad, las esquinas del bajo
  aunque salga torcido, y no usa una manga cortada por el borde de la foto o DEBAJO del folio (`tocaTapa`, `M.tapas`).
- `editor2d.js` · editor SVG del patrón (elegir, mover piezas, puntos, curvas, añadir/quitar puntos, medir). 16-10: ⊥ PIQUETE (tecla P) con
  su PAREJA en la pieza con la que se cose (`piquetePar`, la misma cuenta que `valida.js`), quitar tocándolo (los dos), no en el doblez;
  🧲 IMÁN (tecla I, localStorage `cd.drew.iman`) = cuadrícula de 5 mm; Mayús al arrastrar = recto; la pieza elegida se dibuja la ÚLTIMA (sus
  puntos se pueden tocar aunque se solape con otra). En la ficha de la pieza: mover el punto elegido ESCRIBIENDO los cm y el LARGO exacto de
  un borde recto (op `largoBorde` en proyecto.js). Un piquete y su pareja = un solo Ctrl+Z (`edita` acepta varias ediciones).
- `avatar.js` · maniquí sencillo (función de distancia). `mh.js` · maniquí REALISTA (MakeHuman CC0) a medida + su rejilla de choque.
- `malla2d.js` · pieza → malla de triángulos. `tela.js` · la simulación (coser, caer, rozar, colocar). `tela_worker.js` · su hilo.
- `vista3d.js` · el 3D (three.js): estudio, telas con textura, vistas, foto. `video_mp4.js` · vídeo de 7 s vertical.
- `calibra.js` · CALIBRAR (sin pantalla, se prueba en Node): folio A4 que se encuentra solo (`detectaFolio`), `afinaQuad` (pega 4 esquinas
  aproximadas al borde del papel; si un lado no aparece busca 2,5× y 5× más ancho), `endereza` (foto sin perspectiva, mm/px sabidos; el marco
  quita lo que se ve más de 2 veces más pequeño que el folio; hasta 7 folios por lado; tope de SUPERFICIE 3000 × 3000 y lado largo hasta
  6000 px), la IMPRESORA (`hojaPrueba`, `hojaPrueba({ comprobar: true })` = ya
  corregida, `guardaImpresora` → localStorage `cd.drew.impresora`) y la `GUIA` de qué foto sirve.
- `calibra_ui.js` · la pestaña 📷 FOTO: guía con dibujos, «📐 Medir con una foto» (ventana: esquinas arrastrables con LUPA, ratón/dedo/lápiz,
  Mayús = fino, flechas o botones = 1 px, «🎯 Ajustar al borde», enderezar, medir con clic-clic o arrastrando, puntas que se mueven,
  «Llevar a la prenda» (contorno de prenda plana ×2; queda como medida tuya con «📷 foto»; Ctrl+Z la quita), foto con las medidas en PNG)
  y «🖨 Calibrar la impresora» (hoja de prueba → dos rayas → guardar → hoja de comprobación).
  16-10 · «👗 SACAR EL PATRÓN de una foto» (`calibrador(file, o, 'patron')`, modo `patron`): las mismas esquinas del folio → «Enderezar y sacar
  el patrón» → silueta (verde), el patrón encima a tamaño real (dorado, delantero; la falda en el vestido; en el pantalón no), puntos de
  colores (verde seguro, ámbar mírala, rojo dudoso, tinta = movido por ti) que se ARRASTRAN con lupa (ratón, dedo, lápiz; flechas 1 px,
  Mayús 10) y vuelven a medir en directo; lista con cada medida y su estado (👁 vista · ✋ ajustada · ✔ confirmada · 💭 supuesta · ⚠ por
  confirmar + «Está bien»), piezas vistas/supuestas, «¿qué prenda es?» (5 botones + otras; rehace los puntos sin recortar otra vez), recorte
  con la IA del PC si está (BiRefNet, `segmentaIA`) o por colores, IA de VISIÓN del PC (qwen2.5vl:3b, en segundo plano: lo que ve y «Usar…»;
  sus pistas de cuello/cierre/bolsillos entran en el patrón), avisos, «cómo lo ha hecho» (10 pasos con tiempo) y PNG con los puntos.
  «Crear el patrón» → `o.crearPatron` (celebridrew `deFoto`): prenda NUEVA «X de la foto» con el avatar de ahora, `autoAjuste: false`,
  cada medida con `foto, estado, mano, confirmada, como` (las supuestas como `origen: 'plantilla'`) y `P.deFoto`; si la abierta ya salió
  de esa foto, «Actualizar» la cambia (Ctrl+Z). En Prenda: aviso «📷 Patrón sacado de una foto» y etiquetas 📷 foto / 💭 supuesta /
  ⚠ confirmar (tocándola se confirma).
- Pantalla: `web/js/views/celebridrew.js` + `web/css/drew.css` (interfaz «ATELIER»: todo dentro de `.dw.dw-atelier`; noche = `.dw-noche`;
  las VENTANAS van fuera de `.dw`: toman la cara Atelier por `body.dw-solo .modal` y la noche por `body.dw-noche-on`). Pestañas: Prenda,
  Avatar, Tela, 📷 Foto, Exportar (Exportar dice si la impresora está calibrada y lleva a Foto).

- 17-10 · TABLET y 2D más fácil (`editor2d.js` + `views/celebridrew.js` + bloque «17-10 · TABLET» de `css/drew.css`): dos dedos = pellizcar
  y mover la vista; zonas de 44 px (`.dw-zona`) con `(pointer: coarse)`; zona muerta 8 px; herramientas de tocar al levantar el dedo;
  `ED.zoom(k)`, `ED.encuadraPieza(n)`; `ctx.cotas` (📐 Medidas, tecla K); línea de ayuda `.dw-pista`; flechas `.dw-cruceta` del punto elegido;
  ficha: tocar un borde lo elige y se MUEVE ENTERO (`desplazaBorde` + `parejasDe`, «lo mismo en su pareja»); ficha encogible (▾);
  biblioteca plegable (`cd.drew.plegado`); ⛶ Grande en cada barra (`.dw-vistas.solo2d/.solo3d`). Prueba: `node test/e2e_drew_tablet.js`.

## Cosas que NO hay que romper (aprendidas a golpes)
- 2D con el dedo: las herramientas de TOCAR (punto, quitar, curva, piquete, medir) van en `toca()` al LEVANTAR; si se ejecutan al bajar el
  dedo, apoyar el segundo dedo para acercar pone puntos sin querer. Al llegar el segundo dedo, `deshaz()` devuelve lo que se arrastraba.
- El WebKit de Playwright en Windows deja en blanco CUALQUIER lienzo WebGL que cambie de tamaño (comprobado con un cubo): no es fallo nuestro;
  para mirar el 3D en tablet usar Chromium con el dispositivo «iPad Pro 11» (`devices`, quitando `defaultBrowserType`).
- `mh.js` `rejilla()`: la rejilla de 9 mm se queda corta en lo que sobresale; por eso baja sus nudos hasta que NINGÚN punto de la piel quede
  fuera. Y `malla()` (lo que se ve) va 1 mm por dentro. Sin esto, el maniquí asoma por la tela (la «mota blanca» del pecho).
- `tela.js`: rigidez al estirar ≤ 0,85 (más vibra para siempre con la malla h 14); lo pegado no se «separa»; reposo tras caer.
- En línea de código con más cosas detrás, comentar con `/* */` y NUNCA con `//` (se come el resto: ya rompió dos veces).
- Calibrador: la captura del puntero va en la CAPA (el svg), que no se borra al repintar. Si se captura con un círculo y el repintado lo
  borra, el arrastre se corta al primer movimiento (así venía calibra_ui.js de la sesión cortada).
- La corrección de la impresora va en los PDF A4 (`nuevoPDF` la lee sola) y NO en los A0 (`escala: false`: los imprime la copistería).
  La escala del PDF se escribe con 6 decimales.
- `detectaFolio`: con la prenda ENTERA en la foto el folio es un 3–6 % de ella → umbrales también en los cuantiles 0,95 / 0,97 / 0,985; y
  `deforme(q)` descarta cuadriláteros que no pueden ser un folio (lados opuestos > 1,5× o ángulos fuera de 55–125°: un folio pegado a una
  mancha clara del fondo ganaba por área). Con un marco de 4 folios la manga de una camiseta de 1 m quedaba CORTADA al enderezar.
- Foto → patrón: el folio se TAPA (color del fondo) antes de recortar, o el papel blanco sería «otra prenda». Las medidas con puntos que
  tocan el folio pasan a «por confirmar». Los puntos de la derecha van al borde DERECHO de su píxel (+1): si no, al moverlos la medida
  saltaba 1 px. Las prendas de prueba sintéticas tienen que salir con la forma de la escena (sin estirarla) o el folio deja de parecerlo.
- `.btn.primary` del Atelier lleva `html body` delante: cada cara del programa (ui18/ui30/ui50) lo pinta con `html.uiXX[…]` y ganaba.
- Pantalla estrecha: la regla `.dw-atelier .dw-cuerpo/.dw-vistas` pisaba la de `@media (1100px)` y el 2D quedaba en una raya de 10 px.
  Ahora: ≤ 1100 px biblioteca de 300 px; de PIE (portrait) el 3D arriba y el patrón debajo; ≤ 700 px una columna.

- 16-10 · 🌐 DISEÑAR DESDE UNA IMAGEN: `foto/inspira.js` (puro: `lee` respuesta de la IA → lectura con dudas; `diseno` → plantilla,
  opciones, ajuste, qué hace / qué NO, ≤ 3 preguntas —largo y falda siempre si los puso la IA—; `medidas` → largos en los NIVELES del avatar,
  manga, vuelo con el `perfil` de la silueta, tirantes, escote; `silueta` → ancho del tramo central de la máscara), `foto/vision.js` (Ollama:
  qwen3-vl:4b Apache-2.0 primero; qwen2.5vl:3b solo uso no comercial), `foto/sam.js` + `foto/sam_worker.js` (SAM 2.1 tiny ONNX + ONNX Runtime
  Web, en su hilo; datos en `web/data/drew/ia/`, licencias en `LICENCIAS.txt`, fuera de la caché de instalación), `inspira_ui.js` (la ventana),
  y en `views/celebridrew.js` `deImagen` (la prenda nueva) + `bannerImagen`. Varillas: `bloques/vestido.js` (opción) + `montaje.js` (`varillas`).

## Pruebas
- `test/unit/drew_inspira.mjs` (16-10) · lectura de la IA (inglés, sinónimos, dudas, caja), diseño (vestido de corsé con varillas, top con
  capucha → sudadera, falda plisada → evasé avisando), ≤ 3 preguntas, medidas en el avatar MakeHuman (midi, crop, ¾, tirantes, vuelo de la
  silueta) y patrón validado con sus canales de varilla (21 pruebas, ~20 s).
- `test/e2e_drew_inspira.js` (16-10) · la ventana como ella: imagen → IA (de mentira, con lo que contestó la de verdad; `REAL=1` = Ollama) →
  2 toques → SAM 2 → crear → cosido en 3D, «🌐 imagen», color de la foto; y sin IA (10 pruebas, ~2 min; con REAL=1 ~4 min).
- `test/unit/drew_sintetica.mjs` · GENERA prendas planas sintéticas de medidas conocidas (camiseta, pantalón, falda, 16-10: vestido) y
  devuelve sus polígonos (`polis`). No es una prueba por sí sola: la usa la siguiente.
- `test/unit/drew_foto_patron.mjs` (16-10) · FOTO → PATRÓN de punta a punta: escena con folio y móvil inclinado → folio → enderezar →
  patrón. Camiseta corta, una manga DEBAJO del folio, manga larga, sin mangas, pantalón, falda evasé y vestido: lo que da por bueno a
  < 1 cm de la verdad, patrón validado, arrastrar un punto (en vivo y al soltar), puntos de la máquina, el patrón encima de la foto,
  «Está bien», cambiar a sudadera, lo que va a la prenda (33 pruebas, ~15 s).
- `test/unit/drew_3d.mjs` · avatar (4 cuerpos), 4 prendas en 3D (costuras cerradas, nada dentro, se queda quieta, cintura en su sitio) y PDF.
  `node test/unit/drew_3d.mjs rapido` = solo la falda (~1 min). Entera: ~8 min.
- `test/unit/drew_calibra.mjs` · folio solo (< 1 px), escala, enderezar, impresora, calibración guardada en A4 y no en A0, hoja de
  comprobación, «Ajustar al borde» desde una esquina a 60 px, foto muy inclinada (24 pruebas, ~1 min).
- En el programa: `PASOS=pasos.js node tools/ver_drew.js carpeta` (Playwright con la app compilada; `window.__drew` = st, V, ED, W).
- La pestaña 📷 FOTO como ella (ratón, flechas, dedo, lápiz, mano apoyada, medidas, llevar a la prenda, hojas y PDF A4/A0, noche,
  estrecha): `tools/drew_foto/` (foto sintética de medidas conocidas + `pasos_foto.js`; instrucciones dentro). Repaso de todas las
  pestañas en 3 tamaños, día y noche (nada encima del 3D/2D, nada fuera): `tools/drew_foto/pasos_repaso.js`.
- 16-10 · «Sacar el patrón de una foto» como ella: `tools/drew_foto/pasos_patron.js` (misma foto sintética; 30 pruebas: medidas < 1 cm,
  tocar una medida, arrastrar con lupa, flechas, sudadera ↔ camiseta, ver/ocultar, «Está bien», PNG, Crear el patrón → 3D y 2D validado,
  volver a la foto y «Actualizar» + Ctrl+Z, noche, 1280, estrecha, DEDO y LÁPIZ con la mano apoyada).
- 16-10 · herramientas del 2D: `tools/drew_foto/pasos_herramientas2d.js` (13: piquete con pareja, Ctrl+Z, quitar, doblez no, imán,
  Mayús = recto, mover escribiendo, largo exacto).

## Lo que falta
Ver la sección del PASE. Lo que se vaya haciendo se apunta aquí con su prueba.
