# Inspektor dokumentu

Inspektor dokumentu to panel obok edytora. Zakładka **Konspekt** mapuje strukturę
dokumentu, a zakładka **Informacje** pokazuje bieżące szczegóły pisanego dokumentu
i pozwala ustawić kilka opcjonalnych limitów oraz status. Możesz wybrać, które z tych
pól są wyświetlane — globalnie i dla każdej przestrzeni — dzięki czemu inspektor
pokazuje tylko to, co Cię interesuje.

## Konspekt

Zakładka **Konspekt** wymienia nagłówki dokumentu w kolejności, wcięte według poziomu,
dzięki czemu możesz jednym rzutem oka zobaczyć kształt długiego tekstu. Aktualizuje się
chwilę po zatrzymaniu pisania.

Konspekt jest budowany z Twoich nagłówków — wpisz `# `, `## ` lub `### ` na początku
wiersza (lub użyj pływającego paska narzędzi), aby dodać nagłówek. Dokument bez
nagłówków pokazuje pusty konspekt; więcej w [Formatowaniu i markdown](formatting-and-markdown#headings-and-structure).

Na telefonie otwórz inspektora z zakładki **więcej**: wybierz **Inspektor dokumentu**
z menu, a on wysunie się z prawej strony.

## Liczba słów i znaków

Zakładka Informacje zawsze pokazuje bieżącą **liczbę słów** i **znaków** w dokumencie.

## Ustawianie limitu słów lub znaków

Jeśli wyświetlane jest pole **Limit słów** lub **Limit znaków**, wpisz liczbę, aby
ustawić cel. Licznik będzie wtedy wyświetlał `bieżące / limit`, a po przekroczeniu
limitu licznik zmieni kolor na czerwony i tekst powyżej limitu zostanie podświetlony
w edytorze. Nic nie jest usuwane ani przycinane — podświetlenie to tylko sygnał
wizualny, więc możesz pisać dalej i przycinać tekst później.

Pozostaw limit pusty (lub ustaw go na `0`) dla braku limitu.

Jeśli wolisz zachować limit i licznik, ale nie podświetlenie w edytorze, wyłącz
opcję **Podświetl tekst przekraczający limit** w ustawieniach (patrz poniżej).

## Status i blokowanie

Selektor **Statusu** przenosi dokument przez jego etapy: _Szkic_, _W trakcie_,
_Do recenzji_, _Ukończono_ i _Opublikowano_. Ustawienie statusu na **Ukończono** lub
**Opublikowano** blokuje dokument, aby nie można go było przypadkowo zmienić —
nad edytorem pojawia się baner z przyciskiem **Odblokuj, aby edytować**. Aby odblokować,
użyj tego przycisku lub ustaw status z powrotem na wcześniejszy etap. Blokowanie
chroni tylko treść dokumentu; nic nie jest usuwane.

## Termin

Jeśli wyświetlane jest pole **Termin**, wybierz datę, aby zanotować termin. Przeterminowana
data jest wyświetlana na czerwono.

## Wybór wyświetlanych pól

Każde pole inspektora jest opcjonalne. Aby wybrać, które są wyświetlane:

- **Globalnie:** otwórz **Ustawienia ogólne → Inspektor dokumentu** i włącz lub
  wyłącz każde pole. Możesz też wybrać, które etapy statusu pojawiają się w selektorze.
- **Dla przestrzeni:** otwórz **Ustawienia → Inspektor dokumentu** danej przestrzeni.
  Każde pole może dziedziczyć wartość domyślną lub być włączone/wyłączone tylko dla
  tej przestrzeni.

Wyłączenie pola ukrywa je w inspektorze — wraz z limitem i podświetleniem edytora —
nawet jeśli wcześniej ustawiono wartość. Wartość nie jest usuwana: włącz pole ponownie,
a pojawi się z powrotem.
