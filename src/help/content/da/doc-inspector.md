# Dokumentinspektøren

Dokumentinspektøren er panelet ved siden af editoren. Fanen **Disposition** kortlægger
dokumentets struktur, og fanen **Info** viser live-detaljer om det dokument, du skriver,
og lader dig angive nogle valgfrie begrænsninger og en status. Du vælger, hvilke af
disse felter der vises — universelt og pr. rum — så inspektøren kun viser det, du har
brug for.

## Dispositionen

Fanen **Disposition** opregner dokumentets overskrifter i rækkefølge, indrykket efter
niveau, så du på et øjeblik kan se formen på et langt stykke. Den opdateres et øjeblik
efter, du holder pause med at skrive.

Dispositionen bygges fra dine overskrifter — skriv `# `, `## ` eller `### ` i
begyndelsen af en linje (eller brug den flydende værktøjslinje) for at tilføje en.
Et dokument uden overskrifter viser en tom disposition; se
[Formatering og markdown](formatting-and-markdown#headings-and-structure) for, hvordan
overskrifter fungerer.

På en telefon åbner du inspektøren fra fanen **mere**: vælg **Dokumentinspektør** fra
menuen, og den glider ind fra højre.

## Ord- og tegntælling

Fanen Info viser altid den aktuelle **ord-** og **tegntælling** for dokumentet.

## Angivelse af en ord- eller tegngræns

Hvis feltet **Ordgrænse** eller **Tegngrænse** vises, skriver du et tal for at angive
et mål. Tælleren viser derefter `aktuelt / grænse`, og når du overskrider grænsen, bliver
tælleren rød, og den overskydende tekst fremhæves i editoren. Intet slettes eller
afkortes nogensinde — fremhævningen er kun en visuel markering, så du kan fortsætte med
at skrive og trimme senere.

Lad en grænse stå tom (eller sæt den til `0`) for ingen grænse.

Hvis du foretrækker at beholde grænsen og tælleren, men ikke editormarkeringen, slår du
**Fremhæv tekst over grænsen** fra i indstillingerne (se nedenfor).

## Status og låsning

**Status**-vælgeren fører et dokument gennem dets faser: _Udkast_, _I gang_,
_Til gennemsyn_, _Færdig_ og _Publiceret_. Hvis status angives til **Færdig** eller
**Publiceret**, låses dokumentet, så det ikke kan ændres ved et uheld — et banner vises
over editoren med knappen **Lås op for at redigere**. Brug den knap for at låse op, eller
sæt status tilbage til et tidligere trin. Låsning beskytter kun dokumentets brødtekst;
intet slettes.

## Forfaldsdato

Hvis feltet **Forfaldsdato** vises, vælger du en dato for at registrere en deadline.
En overskredet dato vises med rødt.

## Valg af hvilke felter der vises

Hvert inspektørfelt er valgfrit. Sådan vælger du, hvilke der vises:

- **Universelt:** åbn **Universelle indstillinger → Dokumentinspektør** og slå hvert
  felt til eller fra. Du kan også vælge, hvilke statusfaser der vises i vælgeren.
- **Pr. rum:** åbn et rums **Indstillinger → Dokumentinspektør**. Hvert felt kan arve
  den universelle standard eller slås til eller fra udelukkende for det pågældende rum.

At slå et felt fra skjuler det fra inspektøren — inkl. dets grænse og editormarkeringen
— selv hvis du tidligere har angivet en værdi. Værdien slettes ikke: slå feltet til
igen, og det dukker op igen.
