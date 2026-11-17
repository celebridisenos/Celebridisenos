# Resolución de problemas: fallos de impresión y de pedidos

> Categoría: General · Etiquetas: problemas, 5 porqués, causa-efecto, Ishikawa, prueba y error, fallos de impresión, incidencias, mejora continua

## Por qué resolver problemas con método

En un taller de impresión 3D los problemas son inevitables: piezas que se despegan de la cama, capas que se desplazan, pintura que se cuartea, paquetes que llegan rotos, pedidos que salen con el color equivocado. Lo habitual es apagar el fuego y seguir, pero si no se busca la causa, el mismo problema vuelve una y otra vez.

Resolver con método significa:

1. **Describir bien el problema**: qué ha pasado, cuándo, en qué pedido o impresora.
2. **Buscar la causa raíz**, no solo el síntoma.
3. **Probar una solución** de forma controlada.
4. **Comprobar** que funciona.
5. **Dejarlo por escrito** en un procedimiento para que no se repita.

Este documento explica tres herramientas sencillas: los **5 porqués**, el **diagrama causa-efecto** y la **prueba y error controlada**, con ejemplos de impresión y de pedidos.

## Describir bien el problema

Un problema mal descrito lleva a soluciones equivocadas. Antes de buscar causas, responde:

- **Qué**: qué falla exactamente. «La maceta se despega de la cama a los 20 minutos», no «la impresora va mal».
- **Dónde**: en qué impresora, con qué filamento, en qué plataforma de venta o transportista.
- **Cuándo**: desde cuándo pasa, a qué hora, si es siempre o a veces.
- **Cuánto**: en cuántas piezas o pedidos de cada diez.
- **Qué ha cambiado**: bobina nueva, perfil de laminado nuevo, otro tipo de caja, otro transportista.

Registra los fallos en la app: una tarea con la descripción, o una nota en el pedido si afecta a un cliente y el estado Incidencia cuando corresponda. Con varios registros empiezan a verse patrones.

## Método de los 5 porqués

Consiste en preguntar «¿por qué?» varias veces seguidas hasta llegar a una causa sobre la que se pueda actuar. El número cinco es orientativo: a veces bastan tres, a veces hacen falta más.

Ejemplo con un fallo de impresión:

1. ¿Por qué ha fallado la maceta? Porque se despegó de la cama a mitad de impresión.
2. ¿Por qué se despegó? Porque la primera capa no estaba bien adherida.
3. ¿Por qué no estaba bien adherida? Porque la cama tenía grasa.
4. ¿Por qué tenía grasa? Porque se toca con los dedos al retirar piezas y no se limpia.
5. ¿Por qué no se limpia? Porque no está en el procedimiento de inicio de impresión.

**Causa raíz**: falta un paso en el procedimiento. **Acción**: añadir «limpiar la cama» al checklist de inicio.

Consejo: si la respuesta a un porqué es «por un error de alguien», sigue preguntando. Casi siempre hay un fallo de sistema detrás (falta de procedimiento, de formación o de material).

## Diagrama causa-efecto

Cuando un problema puede tener muchas causas, el diagrama causa-efecto (también llamado de espina de pescado) ayuda a ordenarlas. Se escribe el problema a la derecha y se agrupan las posibles causas en categorías. Para un taller 3D, estas categorías funcionan bien:

- **Máquina**: nivelado, boquilla, correas, temperatura de la cama.
- **Material**: filamento húmedo, bobina de mala calidad, color distinto por lote.
- **Método**: perfil de laminado, velocidad, soportes, procedimiento de empaquetado.
- **Personas**: formación, prisas, cansancio.
- **Entorno**: corrientes de aire, temperatura del taller, humedad, polvo.
- **Medición**: medidas mal tomadas, calibre, datos del cliente incompletos.

Ejemplo: problema «las figuras salen con hilos finos entre partes». Posibles causas: temperatura alta (máquina), filamento húmedo (material), retracción mal ajustada (método), taller húmedo (entorno). Después se priorizan las más probables y se comprueban una a una.

## Prueba y error controlada

Probar cosas sin orden («subo temperatura, cambio velocidad y seco el filamento a la vez») no permite saber qué ha funcionado. La prueba y error controlada sigue unas reglas:

1. **Cambia una sola variable cada vez.**
2. **Usa una pieza de prueba pequeña** y rápida (un cubo, una torre de temperatura, un trozo de la maceta) en vez de repetir la pieza completa.
3. **Anota cada prueba**: qué cambiaste, valor anterior, valor nuevo y resultado.
4. **Compara con la referencia**: la última configuración que funcionaba bien.
5. **Cuando encuentres la solución**, guárdala como perfil y documéntala.

Plantilla de registro de pruebas:

> Problema: [descripción]. Prueba n.º [n]. Variable cambiada: [variable]. Antes: [valor]. Ahora: [valor]. Pieza de prueba: [pieza]. Resultado: [bien / igual / peor]. Siguiente paso: [acción].

Esto ahorra filamento, electricidad y tiempo de máquina, que son costes reales que recoge la calculadora de costes de la app.

## Aplicado a fallos de pedidos

Los mismos métodos sirven para problemas que no son de impresión. Ejemplo con los 5 porqués:

1. ¿Por qué el cliente recibió la figura en rojo si la pidió en granate? Porque se imprimió en rojo.
2. ¿Por qué se imprimió en rojo? Porque en el pedido ponía «rojo».
3. ¿Por qué ponía «rojo»? Porque se copió rápido de la conversación de Instagram.
4. ¿Por qué no se detectó? Porque no se confirmó el color con el cliente antes de fabricar.
5. ¿Por qué no se confirmó? Porque el paso Pendiente de revisión no incluye confirmar color con foto de muestra.

**Acción**: añadir al procedimiento de revisión el envío de una foto del filamento al cliente en pedidos personalizados.

Otros problemas de pedidos donde aplicar el método: paquetes dañados en el envío (¿embalaje?, ¿tipo de caja?, ¿transportista?), retrasos repetidos (¿cuello de botella en pintado?), pedidos olvidados (¿estados sin actualizar en la app?).

## Comunicar al cliente mientras se resuelve

Si el problema afecta a un pedido, el cliente debe saberlo pronto. No hace falta explicarle el análisis técnico; basta con informar, pedir disculpas y dar una solución y una fecha.

Plantilla:

> Hola, [nombre]. Al revisar tu pedido de [producto] hemos detectado [problema breve] y no queremos enviártelo así. Lo estamos volviendo a fabricar y saldrá el [fecha]. Sentimos la espera; te mando el seguimiento en cuanto esté enviado.

Si el problema es de transporte (pieza rota al llegar), pide fotos del paquete y de la pieza, pasa el pedido a Incidencia en la app y sigue vuestras políticas de garantía y la del canal de venta.

## Cerrar el problema y aprender

Un problema no está resuelto hasta que no se ha evitado que vuelva. Al cerrarlo:

- **Comprueba la solución** con varias piezas o pedidos, no solo con uno.
- **Actualiza el procedimiento** afectado (inicio de impresión, revisión de pedido, empaquetado).
- **Avisa a la otra socia** por las noticias de la app si cambia la forma de trabajar.
- **Guarda el registro**: la próxima vez que aparezca un síntoma parecido, tendréis pistas.
- **Revisa en la reunión semanal** los problemas del periodo y si se repiten.

Resumen rápido:

- [ ] Problema descrito con qué, dónde, cuándo y cuánto.
- [ ] Causa raíz identificada (5 porqués o causa-efecto).
- [ ] Solución probada cambiando una variable cada vez.
- [ ] Resultado comprobado.
- [ ] Procedimiento actualizado y comunicado.
