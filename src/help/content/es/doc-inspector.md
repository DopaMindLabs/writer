# El inspector del documento

El inspector del documento es el panel que está junto al editor. Su pestaña **Info**
muestra detalles en vivo del documento que estás escribiendo y te permite fijar
algunos límites opcionales y un estado. Tú eliges qué campos aparecen — global y
por espacio — para que el inspector muestre solo lo que te importa.

## Recuentos de palabras y caracteres

La pestaña Info siempre muestra los recuentos en vivo de **palabras** y
**caracteres** del documento.

## Fijar un límite de palabras o caracteres

Si se muestra el campo **Límite de palabras** o **Límite de caracteres**, escribe
un número para fijar un objetivo. El recuento se lee entonces como
`actual / límite`, y cuando superas el límite el recuento se pone rojo y el
texto fuera de límite se resalta en el editor. Nunca se borra ni se corta nada —
el resaltado es solo una pista visual, para que puedas seguir escribiendo y
recortar después.

Deja un límite vacío (o ponlo a `0`) para no fijar límite.

Si prefieres conservar el límite y el contador pero no el resaltado del editor,
desactiva **Resaltar texto fuera de límite** en la configuración (ver abajo).

## Estado y bloqueo

El selector de **Estado** mueve un documento por sus etapas: _Borrador_, _En
progreso_, _En revisión_, _Completo_ y _Publicado_. Fijar el estado a **Completo**
o **Publicado** bloquea el documento para que no se cambie por accidente —
aparece un banner sobre el editor con un botón **Desbloquear para editar**. Para
desbloquearlo, usa ese botón o vuelve a una etapa anterior. El bloqueo solo
protege el cuerpo del documento; no se borra nada.

## Fecha de entrega

Si se muestra el campo **Fecha de entrega**, elige una fecha para registrar un
plazo. Una fecha vencida se muestra en rojo.

## Elegir qué campos aparecen

Cada campo del inspector es opcional. Para elegir cuáles aparecen:

- **Globalmente:** abre **Configuración → Inspector del documento** y activa o desactiva cada campo. También puedes elegir qué etapas de estado aparecen en el selector.
- **Por espacio:** abre **Configuración → Inspector del documento** del espacio. Cada campo puede heredar el valor global o activarse o desactivarse solo para ese espacio.

Desactivar un campo lo oculta del inspector — junto con su límite y el resaltado
del editor — aunque hubieras fijado un valor antes. El valor no se borra: vuelve
a activar el campo y reaparece.
