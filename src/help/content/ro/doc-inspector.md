# Inspectorul de document

Inspectorul de document este panoul din dreptul editorului. Fila **Schiță** mapează
structura documentului, iar fila **Info** afișează detalii live despre documentul pe
care îl scrieți și vă permite să setați câteva limite opționale și un status. Dvs.
alegeți care dintre aceste câmpuri apar — universal și per spațiu — astfel încât
inspectorul să afișeze doar ce vă interesează.

## Schița

Fila **Schiță** listează titlurile documentului în ordine, cu indentare pe nivele,
pentru a vedea structura unui text lung dintr-o privire. Se actualizează la scurt
timp după ce faceți pauză din scris.

Schița este construită din titlurile dvs. — tastați `# `, `## ` sau `### ` la
începutul unui rând (sau folosiți bara de instrumente flotantă) pentru a adăuga
un titlu. Un document fără titluri afișează o schiță goală; consultați
[Formatare și markdown](formatting-and-markdown#headings-and-structure) pentru
modul în care funcționează titlurile.

Pe telefon, deschideți inspectorul din fila **mai mult**: alegeți **Inspector document**
din meniu și acesta glisează din dreapta.

## Numărul de cuvinte și caractere

Fila Info afișează întotdeauna numărul live de **cuvinte** și **caractere** ale documentului.

## Setarea unei limite de cuvinte sau caractere

Dacă câmpul **Limită cuvinte** sau **Limită caractere** este afișat, introduceți un
număr pentru a seta un obiectiv. Contorul afișează apoi `curent / limită`, și odată
ce depășiți limita, contorul devine roșu și textul care depășește limita este
evidențiat în editor. Nimic nu este șters sau trunchiat — evidențierea este doar
un indiciu vizual, deci puteți continua să scrieți și să tăiați mai târziu.

Lăsați o limită goală (sau setați-o la `0`) pentru fără limită.

Dacă preferați să păstrați limita și contorul, dar nu evidențierea din editor,
dezactivați **Evidențiere text peste limită** din setări (vezi mai jos).

## Status și blocare

Selectorul de **Status** mută un document prin etapele sale: _Ciornă_, _În progres_,
_În revizuire_, _Complet_ și _Publicat_. Setarea statusului la **Complet** sau
**Publicat** blochează documentul pentru a nu putea fi modificat accidental — apare
un banner deasupra editorului cu un buton **Deblochează pentru editare**. Pentru a
debloca, folosiți acel buton sau setați statusul înapoi la o etapă anterioară.
Blocarea protejează doar corpul documentului; nimic nu este șters.

## Data scadentă

Dacă câmpul **Data scadentă** este afișat, alegeți o dată pentru a înregistra un
termen limită. O dată depășită este afișată în roșu.

## Alegerea câmpurilor afișate

Fiecare câmp al inspectorului este opțional. Pentru a alege care să apară:

- **Universal:** deschideți **Setări universale → Inspector document** și activați
  sau dezactivați fiecare câmp. Puteți alege și ce etape de status apar în selector.
- **Per spațiu:** deschideți **Setări → Inspector document** ale unui spațiu. Fiecare
  câmp poate moșteni valoarea implicită universală sau poate fi activat / dezactivat
  doar pentru acel spațiu.

Dezactivarea unui câmp îl ascunde din inspector — împreună cu limita și evidențierea
din editor — chiar dacă ați setat o valoare anterior. Valoarea nu este ștearsă:
reactivați câmpul și reapare.
