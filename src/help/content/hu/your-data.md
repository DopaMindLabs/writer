# Az Ön adatai

Ez az alkalmazás **helyi alapú**: az írása a saját böngészőjében, a saját
eszközén tárolódik. Semmi sem töltődik fel kiszolgálóra, és az alkalmazás
teljesen offline is működik.

## Áttekintés

- A munkája a **böngészőjében** él — alapértelmezés szerint privát, ehhez az eszközhöz kötve.
- **Exportálja** a prózát és a hivatkozásokat a munka elvitelére.
- **Rendszeresen készítsen biztonsági mentést**; a webhelyadatok törlése eltávolítja a munkát.
- Opcionálisan **szinkronizálja** a területet egy helyi mappával.

## Mit jelent a helyi alapú

- A dokumentumok, területek, feljegyzések és hivatkozások a böngésző helyi tárolójában élnek.
- Nincs fiók és nincs automatikus felhőszinkronizálás — alapértelmezés szerint privát,
  de az adatai ehhez a böngészőhöz, ezen az eszközön kötöttek.
- A böngésző webhelyadatainak törlése eltávolítja a munkáját, ezért tartson biztonsági másolatokat.

## Exportálás

Exportálja az írásait az elvitelhez vagy egy biztonságos másolat megőrzéséhez.
Egy egész terület **területarchívumként** (.zip) exportálódik időbélyeggel; a
hivatkozások [BibTeX](citations-and-bibliography) formátumban exportálódnak.

A területarchívum két réteget tartalmaz: egy olvasható fájlfa markdown fájlokkal,
amelyeket bárhol megnyithat, és minden rekord teljes gépileg olvasható másolatát —
dokumentumok, feljegyzések, mellékletek, megjegyzések, hivatkozások, kapcsolatok,
verzióelőzmények és beállítások —, így az archívum hűen visszaállítható vagy
importálható később.

## Importálás

Hozzon be egy területet ebbe a böngészőbe egy területarchívumból — például egy
letöltött pillanatképből vagy egy másik eszközről való mappaszinkronizálási exportból.
Menjen a **Beállítások → Exportálás / importálás** menübe, válassza az archívumfájlt,
és **új területként** importálódik a meglévők mellé. Az importálás soha semmit nem
ír felül; ez egyben a módja is egy terület eszközök közötti áthelyezésének.

## Biztonsági mentések, visszaállítás és szinkronizálás

- Hozzon létre **pillanatképeket** a terület biztonsági mentési területéről; mindegyik
  hozzáad egy sort, amelyet letölthet, visszaállíthat vagy törölhet.
- **Állítson vissza** egy pillanatképet a teljes terület adott pillanatra való
  visszagörgetéséhez. Az aktuális állapot először új pillanatképként mentődik, így
  a visszaállítás maga is visszavonható. A visszaállítás támogatása előtt létrehozott
  pillanatképek (csak markdown) csak letölthetők.
- A **letöltött** .zip-ből való visszaállítás importáláson keresztül működik —
  az archívum új területként kerül vissza, és a meglévő terület érintetlen marad.
- Csatlakozzon egy **szinkronizálási mappához** egy terület helyi tároló tükrözéséhez,
  állítsa be az intervallumot, és futtasson szinkronizálást igény szerint.
- A főoldal állapotchipet mutat: figyelmeztetést, amíg a szinkronizálás és a
  biztonsági mentések nincsenek engedélyezve, majd **mappaszinkronizálás be** jelzésre
  vált, ha szinkronizálási mappa van csatlakoztatva.

A tárolás helyi, ezért **a rendszeres biztonsági mentések elengedhetetlenek**.
Exportáljon a böngészőadatok törlése, eszközváltás vagy valami új kipróbálása előtt.

## Ha az alkalmazás nem indul el

Ha az alkalmazás nem tudja megnyitni a helyi adatbázisát, egy rendszerindítási
hiba képernyőt mutat. Onnan kiválaszthatja a **Helyi adatok visszaállítása**
lehetőséget, amely — egy explicit megerősítés után — töröl mindent, amit az
alkalmazás ebben a böngészőben tárolt, és a bemutató tartalommal indul újra.
Ez véglegesen törli a dokumentumokat, feljegyzéseket, hivatkozásokat és az
alkalmazáson belüli biztonsági mentéseket, ezért tartsa ezt végső megoldásnak,
és tartsa az exportokat biztonságos helyen.

> Ez egy fejlődő előzetes verziójú alkalmazás. Tekintse exportjait az igazság
> forrásának, és rendszeresen készítsen biztonsági mentést.

## Kapcsolódó

- [Hivatkozások és bibliográfia](citations-and-bibliography) — BibTeX export.
- [A munka rendszerezése](organizing-your-work) — mit tartalmaz egy terület.
