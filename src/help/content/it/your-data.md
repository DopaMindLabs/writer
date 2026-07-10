# I tuoi dati

Questa app è **locale prima di tutto**: la tua scrittura è memorizzata nel tuo browser,
sul tuo dispositivo. Nulla viene caricato su un server e l'app funziona completamente
offline.

## In sintesi

- Il tuo lavoro vive nel **tuo browser** — privato per impostazione predefinita, legato
  a questo dispositivo.
- **Esporta** prosa e citazioni per portare il tuo lavoro con te.
- **Esegui backup** regolarmente; cancellare i dati del sito elimina il tuo lavoro.
- Facoltativamente **sincronizza** uno spazio con una cartella locale.

## Cosa significa locale prima di tutto

- Documenti, spazi, note e citazioni vivono nell'archiviazione locale del browser.
- Non c'è account e nessuna sincronizzazione cloud automatica — privacy per impostazione
  predefinita, ma i tuoi dati sono legati a questo browser su questo dispositivo.
- Cancellare i dati del sito del browser rimuoverà il tuo lavoro, quindi mantieni i backup.

## Esportazione

Esporta la tua scrittura per portarla con te o tenere una copia sicura. Un intero
spazio viene esportato come un **archivio spazio** con data e ora (.zip); le citazioni
vengono esportate come [BibTeX](citations-and-bibliography).

Un archivio spazio contiene due livelli: un albero leggibile di file markdown apribili
ovunque, e una copia machine-readable completa di ogni record — documenti, note,
allegati, annotazioni, citazioni, connessioni, cronologia versioni e impostazioni —
così l'archivio può essere fedelmente ripristinato o importato in seguito.

## Importazione

Porta uno spazio in questo browser da un archivio spazio — ad esempio uno snapshot
scaricato o un'esportazione con sincronizzazione cartella da un altro dispositivo. Vai
a **Impostazioni → Esporta / importa**, scegli il file di archivio e viene importato
come **nuovo spazio** accanto ai tuoi esistenti. L'importazione non sovrascrive mai
nulla; è anche il modo per spostare uno spazio tra dispositivi.

## Backup, ripristino e sincronizzazione

- Crea **snapshot** dall'area backup dello spazio; ognuno aggiunge una riga che puoi
  scaricare, ripristinare o eliminare.
- **Ripristina** uno snapshot per riportare l'intero spazio a quel momento. Lo stato
  corrente viene salvato prima come nuovo snapshot, così un ripristino può a sua volta
  essere annullato. Gli snapshot creati prima che il supporto al ripristino esistesse
  (solo markdown) possono essere solo scaricati.
- Il ripristino da un `.zip` scaricato funziona tramite importazione — l'archivio
  torna come nuovo spazio, e lo spazio esistente rimane intatto.
- Collega una **cartella di sincronizzazione** per rispecchiare uno spazio
  nell'archiviazione locale, imposta l'intervallo ed esegui una sincronizzazione
  su richiesta.
- La schermata home mostra un chip di stato: un avviso finché sincronizzazione e
  backup non sono abilitati, che diventa **sincronizzazione cartella attiva** una volta
  connessa una cartella di sincronizzazione.

L'archiviazione è locale, quindi i **backup regolari sono essenziali**. Esporta prima
di cancellare i dati del browser, cambiare dispositivo o provare qualcosa di nuovo.

## Se l'app non si avvia

Se l'app non riesce ad aprire il database locale, mostra una schermata di errore
all'avvio. Da lì puoi scegliere **Ripristina dati locali**, che — dopo una conferma
esplicita — cancella tutto ciò che l'app ha memorizzato in questo browser e ricomincia
con il contenuto demo. Questo elimina definitivamente i tuoi documenti, note, citazioni
e backup in-app, quindi consideralo come ultima risorsa e tieni le esportazioni al sicuro.

> Questa è un'app pre-release in evoluzione. Tratta le tue esportazioni come la fonte
> di verità ed esegui backup frequenti.

## Correlato

- [Citazioni e bibliografia](citations-and-bibliography) — esportazione BibTeX.
- [Organizzare il lavoro](organizing-your-work) — cosa contiene uno spazio.
