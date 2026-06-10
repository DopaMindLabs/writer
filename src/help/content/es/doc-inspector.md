# El inspector del documento

El inspector del documento es el panel que está junto al editor. Su pestaña
**Outline** muestra la estructura del documento, y su pestaña **Info** muestra
detalles en vivo del documento que estás escribiendo y te permite fijar
algunos límites opcionales y un estado. Tú eliges qué campos aparecen — global y
por espacio — para que el inspector muestre solo lo que te importa.

## El esquema

La pestaña **Outline** lista los encabezados del documento en orden, con sangría
según su nivel, para que veas la forma de una pieza larga de un vistazo. Se
actualiza un momento después de que dejas de escribir.

El esquema se construye a partir de tus encabezados — escribe `# `, `## ` o
`### ` al principio de una línea (o usa la barra flotante) para añadir uno. Un
documento sin encabezados muestra un esquema vacío; consulta
[Formato y markdown](formatting-and-markdown#headings-and-structure) para saber
cómo funcionan los encabezados.

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
