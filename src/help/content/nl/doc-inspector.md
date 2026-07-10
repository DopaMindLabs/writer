# De documentinspecteur

De documentinspecteur is het paneel naast de editor. Het tabblad **Structuur** brengt
de opbouw van het document in kaart, en het tabblad **Info** toont live details over
het document dat je schrijft en laat je een aantal optionele limieten en een status
instellen. Je kiest welke velden worden weergegeven — universeel en per ruimte — zodat
de inspecteur alleen toont wat jou interesseert.

## De structuur

Het tabblad **Structuur** geeft de kopjes van het document in volgorde weer, ingesprongen
per niveau, zodat je de vorm van een lang stuk in één oogopslag ziet. Het wordt even
bijgewerkt nadat je stopt met typen.

De structuur is opgebouwd uit je kopjes — typ `# `, `## ` of `### ` aan het begin van
een regel (of gebruik de zwevende werkbalk) om er een toe te voegen. Een document zonder
kopjes toont een lege structuur; zie
[Opmaak en markdown](formatting-and-markdown#headings-and-structure) voor hoe kopjes werken.

Op een telefoon open je de inspecteur via het tabblad **meer**: kies **Documentinspecteur**
uit het menu en hij schuift van rechts in beeld.

## Woord- en tekentelling

Het tabblad Info toont altijd de live **woord-** en **tekentelling** van het document.

## Een woord- of tekenlimiet instellen

Als het veld **Woordlimiet** of **Tekenlimiet** wordt weergegeven, typ je een getal om
een doel in te stellen. De teller leest dan `huidig / limiet`, en zodra je de limiet
overschrijdt wordt de teller rood en wordt de overtollige tekst in de editor gemarkeerd.
Er wordt nooit iets verwijderd of afgekapt — de markering is slechts een visueel signaal,
zodat je kunt blijven schrijven en later kunt inkorten.

Laat een limiet leeg (of stel hem in op `0`) voor geen limiet.

Als je de limiet en de teller wilt bewaren maar niet de editormarkering, schakel dan
**Markeer tekst boven de limiet** uit in de instellingen (zie hieronder).

## Status en vergrendeling

De **Status**-kiezer verplaatst een document door zijn fasen: _Concept_, _In uitvoering_,
_In beoordeling_, _Gereed_ en _Gepubliceerd_. De status instellen op **Gereed** of
**Gepubliceerd** vergrendelt het document zodat het niet per ongeluk kan worden gewijzigd —
er verschijnt een banner boven de editor met een knop **Ontgrendelen om te bewerken**.
Gebruik die knop om te ontgrendelen, of stel de status terug naar een eerdere fase.
Vergrendelen beschermt alleen de documenttekst; er wordt niets verwijderd.

## Vervaldatum

Als het veld **Vervaldatum** wordt weergegeven, kies je een datum om een deadline vast
te leggen. Een verstreken datum wordt rood weergegeven.

## Kiezen welke velden worden weergegeven

Elk inspecteerveld is optioneel. Om te kiezen welke worden weergegeven:

- **Universeel:** open **Universele instellingen → Documentinspecteur** en schakel elk
  veld in of uit. Je kunt ook kiezen welke statusfasen in de kiezer verschijnen.
- **Per ruimte:** open de **Instellingen → Documentinspecteur** van een ruimte. Elk veld
  kan de universele standaard overnemen of alleen voor die ruimte worden in- of uitgeschakeld.

Een veld uitschakelen verbergt het uit de inspecteur — inclusief de limiet en de
editormarkering — ook als je eerder een waarde had ingesteld. De waarde wordt niet
verwijderd: zet het veld terug aan en het verschijnt weer.
