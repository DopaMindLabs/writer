# Twoje dane

Ta aplikacja stawia **lokalność na pierwszym miejscu**: Twoje pisanie jest przechowywane
we własnej przeglądarce, na własnym urządzeniu. Nic nie jest wysyłane na serwer,
a aplikacja działa w pełni offline.

## W skrócie

- Twoja praca żyje **w Twojej przeglądarce** — domyślnie prywatna, przypisana do
  tego urządzenia.
- **Eksportuj** prozę i cytaty, aby zabrać pracę ze sobą.
- **Regularnie twórz kopie zapasowe**; wyczyszczenie danych witryny usuwa pracę.
- Opcjonalnie **synchronizuj** przestrzeń z lokalnym folderem.

## Co oznacza lokalność na pierwszym miejscu

- Dokumenty, przestrzenie, notatki i cytaty żyją w lokalnym przechowywaniu przeglądarki.
- Nie ma konta i automatycznej synchronizacji z chmurą — domyślna prywatność, ale
  dane są przypisane do tej przeglądarki na tym urządzeniu.
- Wyczyszczenie danych witryny przeglądarki usunie pracę, więc dbaj o kopie zapasowe.

## Eksportowanie

Eksportuj pisanie, aby zabrać je ze sobą lub zachować bezpieczną kopię. Cała przestrzeń
eksportuje się jako **archiwum przestrzeni** (.zip) ze znacznikiem czasu; cytaty
eksportuje się jako [BibTeX](citations-and-bibliography).

Archiwum przestrzeni zawiera dwie warstwy: czytelne drzewo plików markdown, które
możesz otworzyć wszędzie, oraz kompletną odczytywalną maszynowo kopię każdego rekordu —
dokumenty, notatki, załączniki, adnotacje, cytaty, połączenia, historię wersji
i ustawienia — dzięki czemu archiwum można wiernie przywrócić lub zaimportować później.

## Importowanie

Wprowadź przestrzeń do tej przeglądarki z archiwum przestrzeni — na przykład pobranej
migawki lub eksportu synchronizacji folderów z innego urządzenia. Przejdź do
**Ustawień → Eksport / import**, wybierz plik archiwum, a zostanie zaimportowany jako
**nowa przestrzeń** obok istniejących. Import nigdy nie nadpisuje niczego; to też
sposób na przenoszenie przestrzeni między urządzeniami.

## Kopie zapasowe, przywracanie i synchronizacja

- Twórz **migawki** w obszarze kopii zapasowych przestrzeni; każda dodaje wiersz,
  który możesz pobrać, przywrócić lub usunąć.
- **Przywróć** migawkę, aby cofnąć całą przestrzeń do tego momentu. Bieżący stan
  jest najpierw zapisywany jako nowa migawka, więc przywrócenie można samo w sobie
  cofnąć. Migawki utworzone przed wprowadzeniem obsługi przywracania (tylko markdown)
  można tylko pobrać.
- Przywracanie z pobranego pliku .zip działa przez import — archiwum wraca jako nowa
  przestrzeń, a istniejąca przestrzeń pozostaje nienaruszona.
- Podłącz **folder synchronizacji**, aby lustrzanie odzwierciedlić przestrzeń
  w lokalnym przechowywaniu, ustaw interwał i uruchom synchronizację na żądanie.
- Ekran główny pokazuje chip statusu: ostrzeżenie, dopóki synchronizacja i kopie
  zapasowe nie są włączone, który zmienia się na **synchronizacja folderów włączona**
  po podłączeniu folderu synchronizacji.

Przechowywanie jest lokalne, więc **regularne kopie zapasowe są niezbędne**. Eksportuj
przed wyczyszczeniem danych przeglądarki, zmianą urządzenia lub wypróbowaniem czegoś nowego.

## Jeśli aplikacja nie uruchamia się

Jeśli aplikacja nie może otworzyć lokalnej bazy danych, wyświetla ekran błędu
rozruchu. Stamtąd możesz wybrać opcję **Zresetuj dane lokalne**, która — po wyraźnym
potwierdzeniu — usuwa wszystko, co aplikacja zapisała w tej przeglądarce, i zaczyna
od nowa z zawartością demo. Trwale usuwa dokumenty, notatki, cytaty i kopie zapasowe
w aplikacji, więc traktuj to jako ostateczność i przechowuj eksporty w bezpiecznym miejscu.

> To ewoluująca aplikacja w wersji przedpremierowej. Traktuj swoje eksporty jako
> źródło prawdy i regularnie twórz kopie zapasowe.

## Powiązane

- [Cytaty i bibliografia](citations-and-bibliography) — eksport BibTeX.
- [Organizowanie pracy](organizing-your-work) — co zawiera przestrzeń.
