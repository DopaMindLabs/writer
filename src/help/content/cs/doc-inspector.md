# Inspektor dokumentu

Inspektor dokumentu je panel vedle editoru. Jeho záložka **Osnova** mapuje strukturu
dokumentu a záložka **Info** zobrazuje živé detaily o dokumentu, který píšete, a
umožňuje nastavit několik volitelných limitů a stav. Vy volíte, která pole se zobrazí —
globálně i pro každý prostor — takže inspektor zobrazuje jen to, co vás zajímá.

## Osnova

Záložka **Osnova** uvádí nadpisy dokumentu v pořadí, odsazené podle úrovně, takže
vidíte strukturu dlouhého textu na první pohled. Aktualizuje se chvíli poté, co
přestanete psát.

Osnova je postavena z vašich nadpisů — napište `# `, `## ` nebo `### ` na začátek
řádku (nebo použijte plovoucí panel nástrojů) pro přidání nadpisu. Dokument bez nadpisů
zobrazí prázdnou osnovu; viz [Formátování a markdown](formatting-and-markdown#headings-and-structure)
pro vysvětlení, jak nadpisy fungují.

Na telefonu otevřete inspektor ze záložky **více**: vyberte **Inspektor dokumentu**
z menu a přijede zprava.

## Počty slov a znaků

Záložka Info vždy zobrazuje živý počet **slov** a **znaků** dokumentu.

## Nastavení limitu slov nebo znaků

Pokud je zobrazeno pole **Limit slov** nebo **Limit znaků**, zadejte číslo pro
nastavení cíle. Počet pak zobrazuje `aktuální / limit` a jakmile limit překročíte,
počet se zčervená a text přesahující limit se zvýrazní v editoru. Nic se nikdy
nesmaže ani neořízne — zvýraznění je pouze vizuální vodítko, takže můžete pokračovat
v psaní a zkrátit text později.

Nechte limit prázdný (nebo nastavte na `0`) pro žádný limit.

Pokud chcete zachovat limit a počítadlo, ale ne zvýraznění v editoru, vypněte
**Zvýraznit text přesahující limit** v nastavení (viz níže).

## Stav a zamykání

Výběr **Stavu** přesunuje dokument přes jeho fáze: _Koncept_, _Probíhá_, _V recenzi_,
_Dokončeno_ a _Publikováno_. Nastavení stavu na **Dokončeno** nebo **Publikováno**
zamkne dokument, aby nedošlo k náhodným změnám — nad editorem se zobrazí banner
s tlačítkem **Odemknout pro úpravy**. Pro odemknutí použijte toto tlačítko nebo
nastavte stav zpět na dřívější fázi. Zamykání chrání pouze tělo dokumentu; nic se nesmaže.

## Datum splatnosti

Pokud je zobrazeno pole **Datum splatnosti**, vyberte datum pro zaznamenání termínu.
Prošlé datum se zobrazí červeně.

## Výběr zobrazených polí

Každé pole inspektoru je volitelné. Pro výběr zobrazovaných polí:

- **Globálně:** otevřete **Univerzální nastavení → Inspektor dokumentu** a zapněte
  nebo vypněte každé pole. Můžete také zvolit, které fáze stavu se zobrazí ve výběru.
- **Pro každý prostor:** otevřete **Nastavení → Inspektor dokumentu** prostoru.
  Každé pole může zdědit globální výchozí hodnotu nebo být zapnuto či vypnuto jen
  pro daný prostor.

Vypnutím pole ho skryjete z inspektoru — spolu s jeho limitem a zvýrazněním v editoru —
i když jste dříve nastavili hodnotu. Hodnota se nesmaže: zapněte pole znovu a znovu se zobrazí.
