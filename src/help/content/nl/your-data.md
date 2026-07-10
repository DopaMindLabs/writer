# Je gegevens

Deze app is **lokaal-eerst**: je schrijven wordt opgeslagen in je eigen browser, op je
eigen apparaat. Er wordt niets geüpload naar een server, en de app werkt volledig offline.

## In het kort

- Je werk leeft in **je browser** — standaard privé, gebonden aan dit apparaat.
- **Exporteer** tekst en citaten om je werk mee te nemen.
- **Maak regelmatig back-ups**; het wissen van sitegegevens verwijdert je werk.
- Optioneel **synchroniseer** een ruimte naar een lokale map.

## Wat lokaal-eerst betekent

- Documenten, ruimtes, notities en citaten leven in de lokale opslag van je browser.
- Er is geen account en geen automatische cloudsynchronisatie — standaard privé, maar
  je gegevens zijn gebonden aan deze browser op dit apparaat.
- Het wissen van de sitegegevens van je browser verwijdert je werk, dus bewaar back-ups.

## Exporteren

Exporteer je schrijven om het mee te nemen of een veilige kopie te bewaren. Een hele
ruimte wordt geëxporteerd als een tijdgestempeld **ruimtearchief** (.zip); citaten
worden geëxporteerd als [BibTeX](citations-and-bibliography).

Een ruimtearchief bevat twee lagen: een leesbare boom van markdown-bestanden die je
overal kunt openen, en een complete machineleesbare kopie van elk record — documenten,
notities, bijlagen, annotaties, citaten, verbindingen, versiegeschiedenis en
instellingen — zodat het archief later betrouwbaar kan worden hersteld of geïmporteerd.

## Importeren

Breng een ruimte in deze browser via een ruimtearchief — bijvoorbeeld een gedownload
snapshot, of een map-synchronisatie-export van een ander apparaat. Ga naar
**Instellingen → Exporteren/importeren**, kies het archiefbestand en het wordt
geïmporteerd als een **nieuwe ruimte** naast je bestaande. Importeren overschrijft
nooit iets; dit is ook de manier om een ruimte tussen apparaten te verplaatsen.

## Back-ups, herstellen en synchroniseren

- Maak **snapshots** aan in het back-upgebied van de ruimte; elke voegt een rij toe
  die je kunt downloaden, herstellen of verwijderen.
- **Herstel** een snapshot om de hele ruimte terug te zetten naar dat moment. De
  huidige staat wordt eerst opgeslagen als een nieuw snapshot, zodat een herstel zelf
  ongedaan gemaakt kan worden. Snapshots die zijn aangemaakt voordat herstelondersteuning
  bestond (alleen markdown) kunnen alleen worden gedownload.
- Herstellen vanuit een gedownloade .zip werkt via importeren — het archief komt terug
  als een nieuwe ruimte, en de bestaande ruimte blijft onaangetast.
- Verbind een **synchronisatiemap** om een ruimte te spiegelen naar lokale opslag, stel
  het interval in en voer een synchronisatie op aanvraag uit.
- Het startscherm toont een statuschip: een waarschuwing zolang synchronisatie en
  back-ups niet zijn ingeschakeld, dat overgaat naar **mapsynchronisatie aan** zodra
  een synchronisatiemap is verbonden.

Opslag is lokaal, dus **regelmatige back-ups zijn essentieel**. Exporteer vóór het
wissen van browsergegevens, overstappen op een ander apparaat of iets nieuws proberen.

## Als de app niet start

Als de app zijn lokale database niet kan openen, wordt een opstart-foutscherm getoond.
Van daar kun je **Lokale gegevens resetten** kiezen, wat — na een expliciete bevestiging
— alles verwijdert wat de app in deze browser heeft opgeslagen en opnieuw begint met de
demo-inhoud. Dit verwijdert permanent je documenten, notities, citaten en in-app back-ups,
dus behandel het als laatste redmiddel en bewaar exports op een veilige plek.

> Dit is een evoluerende pre-release app. Behandel je exports als de bron van waarheid
> en maak regelmatig back-ups.

## Gerelateerd

- [Citaten en bibliografie](citations-and-bibliography) — BibTeX-export.
- [Je werk organiseren](organizing-your-work) — wat een ruimte bevat.
