# Der Dokument-Inspektor

Der Dokument-Inspektor ist das Panel neben dem Editor. Sein **Info**-Tab
zeigt Live-Details über das Dokument, das du schreibst, und lässt
dich einige optionale Limits und einen Status setzen. Du wählst,
welche dieser Felder erscheinen — global und pro Space —, sodass der
Inspektor nur zeigt, was dich interessiert.

## Wort- und Zeichenzahlen

Der Info-Tab zeigt immer die Live-**Wort**- und **Zeichen**-Zahlen
des Dokuments.

## Ein Wort- oder Zeichenlimit setzen

Wenn das Feld **Wortlimit** oder **Zeichenlimit** angezeigt wird,
tippe eine Zahl, um ein Ziel zu setzen. Die Zählung liest dann
`aktuell / Limit`, und sobald du das Limit überschreitest, wird die
Zählung rot und der Text über dem Limit wird im Editor hervorgehoben.
Nichts wird je gelöscht oder abgeschnitten — die Hervorhebung ist nur
ein visueller Hinweis, sodass du weiterschreiben und später kürzen kannst.

Lass ein Limit leer (oder setze es auf `0`) für kein Limit.

Wenn du lieber das Limit und den Zähler behältst, aber nicht die
Editor-Hervorhebung, schalte **Text über Limit hervorheben** in den
Einstellungen aus (siehe unten).

## Status und Sperren

Der **Status**-Picker bewegt ein Dokument durch seine Phasen:
_Entwurf_, _In Bearbeitung_, _In Prüfung_, _Fertig_ und _Veröffentlicht_.
Den Status auf **Fertig** oder **Veröffentlicht** zu setzen, sperrt
das Dokument, damit es nicht versehentlich geändert wird — ein Banner
erscheint über dem Editor mit einem **Zum Bearbeiten entsperren**-Button.
Zum Entsperren nutze diesen Button oder setze den Status auf eine
frühere Phase zurück. Das Sperren schützt nur den Dokumentkörper;
nichts wird gelöscht.

## Fälligkeitsdatum

Wenn das Feld **Fälligkeitsdatum** angezeigt wird, wähle ein Datum,
um eine Frist zu registrieren. Ein überfälliges Datum wird rot angezeigt.

## Wählen, welche Felder erscheinen

Jedes Inspektor-Feld ist optional. Um zu wählen, welche erscheinen:

- **Global:** öffne **Einstellungen → Dokument-Inspektor** und schalte jedes Feld ein oder aus. Du kannst auch wählen, welche Statusphasen im Picker erscheinen.
- **Pro Space:** öffne **Einstellungen → Dokument-Inspektor** eines Space. Jedes Feld kann den globalen Standard erben oder nur für diesen Space ein- oder ausgeschaltet werden.

Ein Feld ausschalten blendet es aus dem Inspektor aus — zusammen mit
seinem Limit und der Editor-Hervorhebung —, auch wenn du zuvor einen
Wert gesetzt hattest. Der Wert wird nicht gelöscht: schalte das Feld
wieder ein, und er erscheint erneut.
