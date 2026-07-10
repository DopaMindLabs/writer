# Dokumendiinspektor

Dokumendiinspektor on redaktori kõrval asuv paneel. Selle vahekaart **Liigendus** kaardistab dokumendi struktuuri ja vahekaart **Teave** näitab reaalajas üksikasju kirjutatava dokumendi kohta ning laseb määrata mõned vabatahtlikud piirangud ja oleku. Sa valid, millised väljad kuvatakse — üldiselt ja ruumi kaupa —, nii et inspektor näitab ainult seda, mis sind huvitab.

## Liigendus

Vahekaart **Liigendus** loetleb dokumendi pealkirjad järjekorras, taseme järgi taandatult, nii et saad pika teksti kuju esmapilgul näha. See uueneb hetk pärast kirjutamise peatamist.

Liigendus koostatakse sinu pealkirjadest — kirjuta `# `, `## ` või `### ` rea algusesse (või kasuta ujuvat tööriistariba) pealkirja lisamiseks. Dokument ilma pealkirjadeta näitab tühja liigendust; vaata [Vormindamine ja markdown](formatting-and-markdown#headings-and-structure) pealkirjade toimimise kohta.

Telefonis ava inspektor vahekaardilt **rohkem**: vali menüüst **Dokumendiinspektor** ja see libiseb paremalt sisse.

## Sõnade ja märkide arv

Vahekaart Teave näitab alati dokumendi reaalajas **sõnade** ja **märkide** arvu.

## Sõnade või märkide piirangu seadmine

Kui väli **Sõnapiirang** või **Märgipiirang** on kuvatud, sisesta number eesmärgi määramiseks. Loendur näitab siis `praegune / piirang` ja kui ületad piirangu, muutub loendur punaseks ning ülepiirangu tekst tõstetakse redaktoris esile. Midagi ei kustutata ega lõigata — esiletõst on ainult visuaalne vihje, nii et saad kirjutamist jätkata ja hiljem kärbida.

Jäta piirang tühjaks (või sea see `0`-le), et piirangut ei oleks.

Kui eelistad säilitada piirangu ja loenduri, kuid mitte redaktori esiletõstu, lülita seadetes välja **Tõsta esile ülepiirangu tekst** (vt allpool).

## Olek ja lukustamine

**Oleku** valija liigutab dokumenti läbi selle etappide: _Mustand_, _Töös_, _Ülevaatuses_, _Valmis_ ja _Avaldatud_. Oleku seadmine **Valmis** või **Avaldatud** lukustab dokumendi, et seda ei saaks kogemata muuta — redaktori kohale ilmub bänner nupuga **Ava muutmiseks**. Lukust avamiseks kasuta seda nuppu või sea olek tagasi varasemasse etappi. Lukustamine kaitseb ainult dokumendi sisu; midagi ei kustutata.

## Tähtaeg

Kui väli **Tähtaeg** on kuvatud, vali kuupäev tähtaja salvestamiseks. Möödunud tähtaeg kuvatakse punaselt.

## Kuvatavate väljade valimine

Kõik inspektori väljad on vabatahtlikud. Kuvatavate väljade valimiseks:

- **Üldiselt:** ava **Üldised seaded → Dokumendiinspektor** ja lülita iga väli sisse või välja. Saad valida ka, millised olekuetapid valijasse ilmuvad.
- **Ruumi kaupa:** ava ruumi **Seaded → Dokumendiinspektor**. Iga väli saab pärida üldise vaikeväärtuse või olla ainult selle ruumi jaoks sisse või välja lülitatud.

Välja väljalülitamine peidab selle inspektorist — koos selle piirangu ja redaktori esiletõstuga —, isegi kui oled varem väärtuse määranud. Väärtust ei kustutata: lülita väli uuesti sisse ja see ilmub uuesti.
