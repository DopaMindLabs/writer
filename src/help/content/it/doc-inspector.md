# L'ispettore del documento

L'ispettore del documento è il pannello accanto all'editor. La scheda **Struttura** mappa
la struttura del documento, mentre la scheda **Info** mostra i dettagli in tempo reale
sul documento che stai scrivendo e ti permette di impostare alcuni limiti opzionali e
uno stato. Puoi scegliere quali di questi campi appaiono — universalmente e per spazio —
così l'ispettore mostra solo ciò che ti interessa.

## La struttura

La scheda **Struttura** elenca le intestazioni del documento in ordine, indentate per
livello, così puoi vedere la forma di un testo lungo a colpo d'occhio. Si aggiorna un
momento dopo che hai smesso di digitare.

La struttura è costruita dalle tue intestazioni — digita `# `, `## ` o `### ` all'inizio
di una riga (oppure usa la barra degli strumenti mobile) per aggiungerne una. Un documento
senza intestazioni mostra una struttura vuota; vedi
[Formattazione e markdown](formatting-and-markdown#headings-and-structure) per come
funzionano le intestazioni.

Su un telefono, apri l'ispettore dalla scheda **altro**: scegli **Ispettore documento**
dal menu e scivola dalla destra.

## Conteggio parole e caratteri

La scheda Info mostra sempre il conteggio in tempo reale delle **parole** e dei
**caratteri** del documento.

## Impostare un limite di parole o caratteri

Se è mostrato il campo **Limite parole** o **Limite caratteri**, digita un numero per
impostare un obiettivo. Il conteggio mostrerà quindi `corrente / limite`, e una volta
superato il limite il conteggio diventa rosso e il testo in eccesso viene evidenziato
nell'editor. Nulla viene mai eliminato o troncato — l'evidenziazione è solo un
segnale visivo, così puoi continuare a scrivere e rifinire in seguito.

Lascia un limite vuoto (o impostalo su `0`) per nessun limite.

Se preferisci mantenere il limite e il contatore ma non l'evidenziazione nell'editor,
disattiva **Evidenzia testo oltre il limite** nelle impostazioni (vedi sotto).

## Stato e blocco

Il selettore **Stato** sposta un documento attraverso le sue fasi: _Bozza_, _In corso_,
_In revisione_, _Completo_ e _Pubblicato_. Impostare lo stato su **Completo** o
**Pubblicato** blocca il documento in modo che non possa essere modificato per errore —
appare un banner sull'editor con un pulsante **Sblocca per modificare**. Per sbloccare,
usa quel pulsante o riporta lo stato a una fase precedente. Il blocco protegge solo il
corpo del documento; nulla viene eliminato.

## Data di scadenza

Se è mostrato il campo **Data di scadenza**, scegli una data per registrare una scadenza.
Una data scaduta viene mostrata in rosso.

## Scegliere quali campi appaiono

Ogni campo dell'ispettore è opzionale. Per scegliere quali appaiono:

- **Universalmente:** apri **Impostazioni universali → Ispettore documento** e attiva o
  disattiva ogni campo. Puoi anche scegliere quali fasi di stato appaiono nel selettore.
- **Per spazio:** apri le **Impostazioni → Ispettore documento** di uno spazio. Ogni
  campo può ereditare il valore predefinito universale oppure essere attivato o
  disattivato solo per quello spazio.

Disattivare un campo lo nasconde dall'ispettore — insieme al suo limite e all'evidenziazione
dell'editor — anche se avevi già impostato un valore. Il valore non viene eliminato:
riattiva il campo e riapparirà.
