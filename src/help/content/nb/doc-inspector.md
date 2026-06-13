# Dokumentinspektøren

Dokumentinspektøren er panelet ved siden av editoren. Fanen **Disposisjon** kartlegger
dokumentets struktur, og fanen **Info** viser live-detaljer om dokumentet du skriver
og lar deg angi noen valgfrie grenser og en status. Du velger hvilke av disse feltene
som vises — universelt og per rom — slik at inspektøren bare viser det du bryr deg om.

## Disposisjonen

Fanen **Disposisjon** lister opp dokumentets overskrifter i rekkefølge, rykket inn etter
nivå, slik at du på et øyeblikk kan se formen på et langt stykke. Den oppdateres et
øyeblikk etter at du slutter å skrive.

Disposisjonen er bygget fra overskriftene dine — skriv `# `, `## ` eller `### ` i
starten av en linje (eller bruk den flytende verktøylinjen) for å legge til en. Et
dokument uten overskrifter viser en tom disposisjon; se
[Formatering og markdown](formatting-and-markdown#headings-and-structure) for hvordan
overskrifter fungerer.

På en telefon åpner du inspektøren fra fanen **mer**: velg **Dokumentinspektør**
fra menyen, og den glir inn fra høyre.

## Ord- og tegntelling

Fanen Info viser alltid den aktuelle **ord-** og **tegntelling** for dokumentet.

## Angi en ord- eller tegngrense

Hvis feltet **Ordgrense** eller **Tegngrense** vises, skriv inn et tall for å angi et
mål. Telleren viser deretter `gjeldende / grense`, og når du overskrider grensen blir
telleren rød og teksten over grensen markeres i editoren. Ingenting slettes eller
kappes — markeringen er bare et visuelt signal, slik at du kan fortsette å skrive og
trimme senere.

La en grense stå tom (eller sett den til `0`) for ingen grense.

Hvis du heller vil beholde grensen og telleren, men ikke editormarkeringen, slår du av
**Merk tekst over grense** i innstillingene (se nedenfor).

## Status og låsing

**Status**-velgeren fører et dokument gjennom fasene: _Utkast_, _Pågår_,
_Til gjennomgang_, _Ferdig_ og _Publisert_. Å sette status til **Ferdig** eller
**Publisert** låser dokumentet slik at det ikke kan endres ved et uhell — et banner
vises over editoren med en knapp **Lås opp for å redigere**. Bruk den knappen for å
låse opp, eller sett statusen tilbake til et tidligere trinn. Låsing beskytter bare
dokumentets brødtekst; ingenting slettes.

## Forfallsdato

Hvis feltet **Forfallsdato** vises, velger du en dato for å registrere en frist.
En forfalt dato vises i rødt.

## Velge hvilke felt som vises

Hvert inspektørfelt er valgfritt. For å velge hvilke som vises:

- **Universelt:** åpne **Universelle innstillinger → Dokumentinspektør** og slå hvert
  felt av eller på. Du kan også velge hvilke statusfaser som vises i velgeren.
- **Per rom:** åpne et roms **Innstillinger → Dokumentinspektør**. Hvert felt kan arve
  den universelle standarden eller slås av eller på kun for det rommet.

Å slå av et felt skjuler det fra inspektøren — inkludert grensen og editormarkeringen
— selv om du hadde angitt en verdi tidligere. Verdien slettes ikke: slå feltet på
igjen, og det dukker opp.
