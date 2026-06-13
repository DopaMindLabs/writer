# Dokumenta inspektors

Dokumenta inspektors ir panelis blakus redaktoram. Tā cilne **Struktūra** kartē
dokumenta uzbūvi, bet cilne **Informācija** rāda aktuālas ziņas par dokumentu, kuru
rakstāt, un ļauj iestatīt dažus neobligātus ierobežojumus un statusu. Jūs izvēlaties,
kuri lauki parādās — universāli un katrai telpai atsevišķi — tāpēc inspektors rāda
tikai to, kas jums rūp.

## Struktūra

Cilne **Struktūra** uzrāda dokumenta virsrakstus secībā, pēc līmeņa atkāpjot, lai
jūs varētu uzreiz redzēt gara darba formu. Tā atjaunojas brīdi pēc rakstīšanas
pauzes.

Struktūra tiek veidota no jūsu virsrakstiem — ierakstiet `# `, `## ` vai `### ` rindas
sākumā (vai izmantojiet peldošo rīkjoslu), lai pievienotu virsrakstu. Dokuments bez
virsrakstiem rāda tukšu struktūru; skatiet [Formatēšana un markdown](formatting-and-markdown#headings-and-structure)
par virsrakstu darbību.

Tālrunī atveriet inspektoru no cilnes **vairāk**: izvēlnē izvēlieties **Dokumenta
inspektors** un tas ieslīdēs no labās puses.

## Vārdu un rakstzīmju skaits

Cilne Informācija vienmēr rāda aktuālo dokumenta **vārdu** un **rakstzīmju** skaitu.

## Vārdu vai rakstzīmju ierobežojuma iestatīšana

Ja ir parādīts lauks **Vārdu ierobežojums** vai **Rakstzīmju ierobežojums**, ierakstiet
skaitli, lai iestatītu mērķi. Skaitītājs tad rādīs `pašreizējais / ierobežojums`, un
pārsniedzot ierobežojumu, skaitlis kļūst sarkans un pārsniegtais teksts tiek izcelt
redaktorā. Nekas netiek dzēsts vai apgriezts — izcēlums ir tikai vizuāls signāls,
tāpēc varat turpināt rakstīt un vēlāk saīsināt.

Atstājiet ierobežojumu tukšu (vai iestatiet `0`), lai nebūtu ierobežojuma.

Ja vēlaties saglabāt ierobežojumu un skaitītāju, bet bez redaktora izcēluma, izslēdziet
**Izcelt pārsniegt tekstu** iestatījumos (skatiet zemāk).

## Statuss un bloķēšana

**Statusa** izvēlne pārvieto dokumentu caur tā posmiem: _Melnraksts_, _Procesā_, _Pārskatē_,
_Pabeigts_ un _Publicēts_. Iestatot statusu **Pabeigts** vai **Publicēts**, dokuments tiek
bloķēts, lai to nevarētu nejauši mainīt — virs redaktora parādās reklāmkarogs ar pogu
**Atbloķēt rediģēšanai**. Lai atbloķētu, izmantojiet šo pogu vai iestatiet statusu atpakaļ
uz iepriekšējo posmu. Bloķēšana aizsargā tikai dokumenta pamattekstu; nekas netiek dzēsts.

## Termiņš

Ja ir parādīts lauks **Termiņš**, izvēlieties datumu, lai reģistrētu galīgo termiņu.
Nokavēts datums tiek rādīts sarkanā krāsā.

## Parādāmo lauku izvēle

Katrs inspektora lauks ir neobligāts. Lai izvēlētos, kuri parādās:

- **Universāli:** atveriet **Universālie iestatījumi → Dokumenta inspektors** un ieslēdziet
  vai izslēdziet katru lauku. Varat arī izvēlēties, kuri statusa posmi parādās izvēlnē.
- **Katrai telpai:** atveriet telpas **Iestatījumi → Dokumenta inspektors**. Katrs lauks var
  mantot universālo noklusējumu vai tikt ieslēgts vai izslēgts tikai šai telpai.

Izslēdzot lauku, tas tiek paslēpts no inspektora — kopā ar tā ierobežojumu un redaktora
izcēlumu — pat ja iepriekš bija iestatīta vērtība. Vērtība netiek dzēsta: ieslēdziet lauku
atpakaļ un tā atkal parādās.
