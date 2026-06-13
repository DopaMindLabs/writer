# Sinu andmed

See rakendus on **kohalik-esmane**: sinu kirjutised salvestatakse sinu enda brauseris, sinu enda seadmes. Midagi ei laadita serverisse ja rakendus töötab täielikult ilma võrguühenduseta.

## Lühiülevaade

- Sinu töö elab **sinu brauseris** — vaikimisi privaatne, seotud selle seadmega.
- **Ekspordi** proosa ja viited, et oma tööd kaasas kanda.
- **Tee varukoopiaid** regulaarselt; saidi andmete kustutamine kustutab sinu töö.
- Vabatahtlikult **sünkrooni** ruum kohaliku kaustaga.

## Mida kohalik-esmane tähendab

- Dokumendid, ruumid, märkused ja viited elavad sinu brauseri kohalikus salvestusruumis.
- Kontot ega automaatset pilvesünkroonimist pole — vaikimisi privaatne, kuid sinu andmed on seotud selle brauseri ja seadmega.
- Brauseri saidi andmete kustutamine eemaldab sinu töö, seega tee varukoopiaid.

## Eksportimine

Ekspordi oma kirjutised, et neid kaasas kanda või turvaline koopia hoida. Terve ruum ekspordib ajatempliga **ruumiarhiivina** (.zip); viited ekspordivad [BibTeX-ina](citations-and-bibliography).

Ruumiarhiiv sisaldab kahte kihti: loetav markdowni failide puu, mida saab avada kõikjal, ja täielik masinloetav koopia igast kirjest — dokumendid, märkused, manused, annotatsioonid, viited, seosed, versiooniajalugu ja seaded —, nii et arhiivi saab hiljem täpselt taastada või importida.

## Importimine

Too ruum sellesse brauserisse ruumiarhiivist — näiteks allalaaditud hetktõmmisest või teise seadme kaustasüngi ekspordist. Mine **Seaded → Eksport / import**, vali arhiivifail ja see imporditakse **uue ruumina** koos olemasolevate kõrvale. Importimine ei kirjuta üle midagi; see on ka viis ruumi seadmete vahel liigutamiseks.

## Varukoopiad, taastamine ja sünkroonimine

- Loo **hetktõmmiseid** ruumi varukoopiate alalt; iga lisab rea, mida saad alla laadida, taastada või kustutada.
- **Taasta** hetktõmmis, et kerida terve ruum tagasi sellesse hetke. Praegune olek salvestatakse enne esmalt uue hetktõmmisena, nii et taastamist saab ise tagasi võtta. Hetktõmmiseid, mis loodi enne taastamistate toetuse olemasolu (ainult markdown), saab ainult alla laadida.
- Allalaaditud .zip-failist taastamine toimib importimise kaudu — arhiiv tuleb tagasi uue ruumina ja olemasolev ruum jääb puutumata.
- Ühenda **sünkroonimiskaust**, et peegeldada ruum kohalikku salvestusruumi, määra intervall ja käivita sünkroonimine nõudmisel.
- Kodukuva näitab olekukiipa: hoiatus, kui sünkroonimine ja varukoopiad pole lubatud, lülitub **kaustasünk sisse** siis, kui sünkroonimiskaust on ühendatud.

Salvestusruum on kohalik, seega on **regulaarsed varukoopiad hädavajalikud**. Ekspordi enne brauseri andmete kustutamist, seadmete vahetamist või uue asja proovimist.

## Kui rakendus ei käivitu

Kui rakendus ei suuda oma kohalikku andmebaasi avada, näitab see käivitusvea ekraani. Sealt saad valida **Lähtesta kohalikud andmed**, mis — pärast selgesõnalist kinnitust — kustutab kõik, mida rakendus on selles brauseris salvestanud, ja alustab uuesti demodisaisiga. See kustutab jäädavalt sinu dokumendid, märkused, viited ja rakendusesisesed varukoopiad, seega kasuta seda viimase abinõuna ja hoia ekspordid kusagil ohutus kohas.

> See on arenev eelversioonirakendus. Käsitle oma ekspordid tõe allikana ja tee varukoopiaid tihti.

## Seotud

- [Viited ja bibliograafia](citations-and-bibliography) — BibTeX-i eksport.
- [Töö korraldamine](organizing-your-work) — mida ruum sisaldab.
