# A dokumentumvizsgáló

A dokumentumvizsgáló a szerkesztő melletti panel. A **Vázlat** lapja a dokumentum
szerkezetét térképezi fel, az **Infó** lapja pedig élő részleteket mutat az írt
dokumentumról, és néhány opcionális korlát és állapot beállítását teszi lehetővé.
Ön dönti el, mely mezők jelenjenek meg — általánosan és területenként —, így a
vizsgáló csak azt mutatja, ami érdekli.

## A vázlat

A **Vázlat** lap a dokumentum fejléceit sorrendben, szint szerint behúzva sorolja
fel, így egyetlen pillantással láthatja egy hosszú mű szerkezetét. Frissül egy
pillanattal azután, hogy megáll a gépelés.

A vázlat a fejléceiből épül fel — írjon `# `, `## ` vagy `### ` parancsot egy
sor elejére (vagy használja az úszó eszközpanelt) fejlécek hozzáadásához. A fejlécek
nélküli dokumentum üres vázlatot mutat; a fejlécek működéséről lásd:
[Formázás és markdown](formatting-and-markdown#headings-and-structure).

Telefonon nyissa meg a vizsgálót a **tovább** lapról: válassza a **Dokumentumvizsgáló**
lehetőséget a menüből, és jobbról becsúszik.

## Szó- és karakterszámok

Az Infó lap mindig mutatja a dokumentum élő **szó-** és **karakterszámát**.

## Szó- vagy karakterkorlát beállítása

Ha a **Szókorlát** vagy **Karakterkorlát** mező megjelenik, írjon be egy számot a
cél meghatározásához. A szám ezután `aktuális / korlát` formában jelenik meg,
és ha túllépi a korlátot, a szám pirosra vált, és a korlátot meghaladó szöveg
kiemelésre kerül a szerkesztőben. Semmi sem törlődik vagy vágódik le — a kiemelés
csak vizuális jelzés, így folytathatja az írást, és később rövidíthet.

Hagyja a korlátot üresen (vagy állítsa `0`-ra) a korlát nélküli módhoz.

Ha inkább megtartja a korlátot és a számlálót, de nem a szerkesztő kiemelést,
kapcsolja ki a **Korlátot meghaladó szöveg kiemelése** lehetőséget a beállításokban
(lásd alább).

## Állapot és zárolás

Az **Állapot** választó áthelyezi a dokumentumot a fázisokon keresztül: _Vázlat_,
_Folyamatban_, _Áttekintés alatt_, _Kész_ és _Közzétett_. Az állapot **Kész** vagy
**Közzétett** értékre állítása lezárja a dokumentumot, hogy ne módosítható legyen
véletlenül — a szerkesztő felett megjelenik egy szalag a **Szerkesztés feloldása**
gombbal. A feloldáshoz használja azt a gombot, vagy állítsa az állapotot vissza egy
korábbi fázisba. A zárolás csak a dokumentum törzsét védi; semmi sem törlődik.

## Határidő

Ha a **Határidő** mező megjelenik, válasszon dátumot a határidő rögzítéséhez.
A lejárt dátum pirossal jelenik meg.

## A megjelenő mezők kiválasztása

Minden vizsgálómező opcionális. A megjelenő mezők kiválasztásához:

- **Általánosan:** nyissa meg az **Általános beállítások → Dokumentumvizsgáló**
  menüt, és kapcsoljon be vagy ki minden mezőt. Az állapotválasztóban megjelenő
  állapotfázisokat is kiválaszthatja.
- **Területenként:** nyissa meg a terület **Beállítások → Dokumentumvizsgáló** menüjét.
  Minden mező örökölheti az általános alapértelmezést, vagy bekapcsolható / kikapcsolható
  csak az adott területen.

Egy mező kikapcsolása elrejti azt a vizsgálóból — a korlátával és a szerkesztő
kiemelésével együtt —, még akkor is, ha korábban beállított egy értéket. Az érték
nem törlődik: kapcsolja vissza a mezőt, és ismét megjelenik.
