# Flujo de pedidos y estados en la app
> Categoría: Pedidos · Etiquetas: pedidos, estados, flujo, fabricación, envío, incidencia, cancelado, buenas prácticas

## Para qué sirven los estados de un pedido

Cada pedido de CelebriDiseños pasa por varias fases: entra, se revisa, se fabrica, se empaqueta, se envía y llega al cliente. Los estados de la app reflejan en qué punto está cada pedido. Usarlos bien permite:

- Saber de un vistazo **qué hay que hacer hoy** (qué imprimir, qué empaquetar, qué llevar al punto de envío).
- **Repartir el trabajo** entre Adriana y Biou sin pisarse.
- **Responder al cliente** con precisión cuando pregunta por su pedido.
- **Detectar cuellos de botella**: si hay muchos pedidos acumulados en un mismo estado, algo falla.

Los estados del pedido en la app son, en orden habitual:

1. Nuevo
2. Pendiente de revisión
3. Pendiente de fabricación
4. En fabricación
5. Fabricado
6. Empaquetado
7. Listo para enviar
8. Enviado
9. En tránsito
10. Entregado

Y dos estados especiales que pueden aparecer en cualquier momento: **Incidencia** y **Cancelado**.

La regla principal: **el estado de la app debe coincidir siempre con la realidad**. Un estado desactualizado es peor que no tener estados.

## Nuevo y Pendiente de revisión

**Nuevo** es el estado con el que entra cualquier pedido: una venta en Vinted, Wallapop o Etsy, un encargo por Instagram o WhatsApp, o una venta en persona que registras en la app. Significa "ha llegado y nadie lo ha mirado todavía".

Pasa a **Pendiente de revisión** cuando alguien lo ha visto pero falta comprobar o aclarar algo antes de comprometerse:

- Confirmar que el pago está hecho o garantizado por la plataforma.
- Revisar datos: variante, color, tamaño, dirección, transportista.
- En encargos personalizados: aclarar texto, medidas, colores o esperar la aprobación del diseño.
- Comprobar que hay material suficiente (filamento del color pedido, cajas).

Buenas prácticas:

- Revisa los pedidos en estado Nuevo al menos una vez al día. Ninguno debería quedarse ahí más de 24 horas.
- Si todo está claro desde el principio (por ejemplo, un producto estándar pagado en plataforma), puedes pasar directamente a Pendiente de fabricación o, si hay stock, a Fabricado.
- Anota en el pedido qué falta cuando lo dejes en Pendiente de revisión, para que la otra socia lo sepa.

## Pendiente de fabricación y En fabricación

**Pendiente de fabricación** significa que el pedido está confirmado y todo está claro, pero aún no se ha empezado a imprimir. Es la "cola" de trabajo.

Pasa a **En fabricación** cuando la pieza empieza a producirse: se lanza la impresión, se está pintando o se está montando. Incluye todo el proceso: impresión, retirada de soportes, lijado, pintado y secado.

Cuándo pasar de uno a otro:

- Pendiente de fabricación → En fabricación: en cuanto se lanza la primera impresión del pedido.
- Si una impresión falla, el pedido sigue en En fabricación; no hace falta volver atrás, pero anota el fallo si retrasa el plazo.

Buenas prácticas:

- Ordena la cola por **fecha comprometida**, no por orden de llegada.
- Agrupa pedidos que usan el mismo color o material para imprimir en la misma tanda y ahorrar cambios de filamento.
- Crea tareas en la app para cada impresión larga o cada fase de pintado.
- Si un pedido lleva demasiado tiempo en Pendiente de fabricación, revisa si el plazo prometido sigue siendo realista y avisa al cliente si no lo es.

## Fabricado y Empaquetado

**Fabricado** indica que la pieza está terminada y ha pasado el control de calidad: sin restos de soportes, pintura seca, medidas y colores correctos. Si el pedido se sirve desde stock, puede entrar directamente en este estado.

Antes de marcar Fabricado, haz una revisión rápida:

- ¿Coincide con lo pedido (variante, color, tamaño, texto)?
- ¿Tiene defectos visibles que no aceptarías si fueras la clienta?
- ¿Has hecho foto de la pieza terminada? Sirve como prueba ante reclamaciones.

**Empaquetado** significa que la pieza está protegida y dentro de la caja o sobre, cerrado y listo para etiquetar.

Cuándo pasar:

- Fabricado → Empaquetado: cuando el paquete está cerrado con todo dentro (pieza, relleno, tarjeta, extras).
- Si el paquete necesita etiqueta de la plataforma, puedes generarla aquí o en el siguiente paso.

Buenas prácticas: haz una foto del paquete abierto con la pieza dentro y otra cerrado. Pesa el paquete y comprueba que el tamaño coincide con el declarado para evitar sobrecostes.

## Listo para enviar y Enviado

**Listo para enviar** significa que el paquete está cerrado, etiquetado y esperando a salir: pendiente de llevarlo a la oficina, punto de recogida o taquilla, o de que pase el transportista.

**Enviado** se marca cuando el paquete ya está en manos del transportista (InPost, Correos, Vinted Go, SEUR, etc.). En este momento conviene registrar en el pedido:

- Transportista.
- **Número de seguimiento**.
- Fecha de entrega en el punto de envío.

Cuándo pasar:

- Empaquetado → Listo para enviar: cuando tiene la etiqueta puesta.
- Listo para enviar → Enviado: cuando el paquete se ha depositado o recogido y tienes el justificante.

Buenas prácticas:

- Guarda el justificante de depósito (foto o recibo) hasta que el pedido esté entregado y cerrado.
- Si la plataforma no notifica automáticamente, envía el número de seguimiento al cliente el mismo día.
- Organiza una ruta de envíos fija (por ejemplo, ciertos días a cierta hora) para no ir al punto de envío por cada paquete.

## En tránsito y Entregado

**En tránsito** indica que el transportista ya ha registrado el paquete y está moviéndolo hacia su destino. Algunos equipos no diferencian entre Enviado y En tránsito; en la app, En tránsito sirve para saber que el seguimiento ya muestra movimiento real, no solo una etiqueta generada.

**Entregado** se marca cuando el seguimiento confirma la entrega o el cliente confirma que lo ha recibido. En plataformas con confirmación de recepción, espera a que se complete.

Cuándo pasar:

- Enviado → En tránsito: cuando el seguimiento muestra el primer movimiento del transportista.
- En tránsito → Entregado: con la confirmación de entrega.

Buenas prácticas:

- Revisa cada día los pedidos En tránsito. Si uno lleva más días de lo normal sin movimiento, contacta con el transportista antes de que te escriba el cliente.
- Tras la entrega, un mensaje breve de agradecimiento mejora la experiencia:

> ¡Hola, [nombre]! Según el seguimiento, tu [producto] ya ha llegado. Espero que te guste mucho. Si tienes cualquier duda, aquí estoy.

## Incidencia

**Incidencia** es un estado especial que se usa cuando algo impide que el pedido siga su curso normal. Puede aparecer en cualquier fase:

- Falta de material o avería de la impresora que retrasa el plazo.
- Error en la pieza detectado antes de enviar.
- Paquete perdido, retenido o devuelto por el transportista.
- Pieza que llega rota o distinta a lo pedido.
- Desacuerdo con el cliente o reclamación en la plataforma.

Cómo gestionarla:

1. Cambia el estado a Incidencia y **anota el motivo** y la fecha.
2. Avisa al cliente cuanto antes con una propuesta concreta.
3. Crea una tarea con la acción y quién se encarga.
4. Cuando se resuelva, **devuelve el pedido al estado que corresponda** (por ejemplo, En fabricación si hay que reimprimir, Enviado si se reenvía) o a Cancelado si se reembolsa.

Nunca dejes un pedido en Incidencia sin una tarea asociada: es el estado con más riesgo de olvido.

## Cancelado

**Cancelado** indica que el pedido no se va a completar. Motivos habituales:

- El cliente se echa atrás antes de la fabricación.
- No se confirma el pago o el diseño personalizado.
- No es posible fabricarlo (material, plazo, viabilidad).
- Se resuelve una incidencia con reembolso completo.

Buenas prácticas:

- Anota siempre el **motivo de la cancelación**. Con el tiempo, estos motivos muestran patrones (plazos largos, precios, dudas de tamaño).
- Si la pieza ya estaba fabricada, **súmala al stock** si se puede vender a otro cliente.
- Si ya había material o trabajo invertido en un personalizado, la empresa debe decidir cómo gestionarlo según las condiciones que se acordaron con el cliente.
- Gestiona el reembolso por el canal oficial de la plataforma o del medio de pago.

Un pedido cancelado no se reabre: si el cliente vuelve a pedirlo, crea un pedido nuevo.

## Buenas prácticas generales del flujo

- **Actualiza el estado en el momento**, no al final del día. Así la otra socia siempre ve la situación real.
- **No saltes estados sin motivo**, salvo los atajos lógicos (pedidos desde stock que entran como Fabricado, ventas en persona que van de Fabricado a Entregado).
- **Revisión diaria rápida**: Nuevos, Incidencias y pedidos En tránsito sin movimiento.
- **Revisión semanal**: pedidos que llevan demasiado en un mismo estado.
- **Fechas comprometidas** visibles en cada pedido.
- **Notas internas** claras: qué se ha hablado con el cliente y qué falta.
- **Un solo pedido por compra**, aunque tenga varias piezas, para que el seguimiento y el beneficio por pedido cuadren.

Con un flujo ordenado, responder a "¿cómo va mi pedido?" lleva segundos.
