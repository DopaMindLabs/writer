# Jūsu dati

Šī lietotne ir **lokāla pirmā**: jūsu rakstīšana tiek glabāta jūsu pašu pārlūkprogrammā,
jūsu pašu ierīcē. Nekas netiek augšupielādēts serverī, un lietotne pilnībā darbojas bezsaistē.

## Kopsavilkums

- Jūsu darbs dzīvo **jūsu pārlūkprogrammā** — privāts pēc noklusējuma, piesaistīts šai ierīcei.
- **Eksportējiet** prozi un citātus, lai ņemtu darbu līdzi.
- **Dublējiet** regulāri; pārlūkprogrammas vietnes datu dzēšana iznīcina jūsu darbu.
- Pēc izvēles **sinhronizējiet** telpu ar lokālu mapi.

## Ko nozīmē "lokāls pirmais"

- Dokumenti, telpas, piezīmes un citāti dzīvo jūsu pārlūkprogrammas lokālajā krātuvē.
- Nav konta un nav automātiskas mākoņsinhronizācijas — privātums pēc noklusējuma, taču
  jūsu dati ir piesaistīti šai pārlūkprogrammai šajā ierīcē.
- Pārlūkprogrammas vietnes datu dzēšana noņems jūsu darbu, tāpēc uzturiet rezerves kopijas.

## Eksportēšana

Eksportējiet rakstīšanu, lai to ņemtu līdzi vai glabātu drošu kopiju. Visa telpa
tiek eksportēta kā ar laikspiedolu iezīmēts **telpas arhīvs** (.zip); citāti tiek
eksportēti kā [BibTeX](citations-and-bibliography).

Telpas arhīvs satur divus slāņus: lasāmu markdown failu koku, kuru varat atvērt
jebkurā vietā, un pilnu mašīnlasāmu katras ieraksta kopiju — dokumenti, piezīmes,
pielikumi, anotācijas, citāti, savienojumi, versiju vēsture un iestatījumi — lai
arhīvu varētu uzticami atjaunot vai importēt vēlāk.

## Importēšana

Ievietojiet telpu šajā pārlūkprogrammā no telpas arhīva — piemēram, lejupielādēta
momentuzņēmuma vai mapju sinhronizācijas eksporta no citas ierīces. Dodieties uz
**Iestatījumi → Eksportēt / importēt**, izvēlieties arhīva failu, un tas tiek importēts
kā **jauna telpa** blakus esošajām. Importēšana nekad nepārraksta esošo; šī ir arī
telpu pārcelšanas metode starp ierīcēm.

## Rezerves kopijas, atjaunošana un sinhronizācija

- Veidojiet **momentuzņēmumus** no telpas rezerves kopiju apgabala; katrs pievieno
  rindu, kuru varat lejupielādēt, atjaunot vai dzēst.
- **Atjaunojiet** momentuzņēmumu, lai atritinātu visu telpu atpakaļ uz to brīdi.
  Pašreizējais stāvoklis tiek saglabāts kā jauns momentuzņēmums vispirms, tāpēc
  atjaunošanu pašu var atsaukt. Momentuzņēmumi, kas izveidoti pirms atjaunošanas
  atbalsta (tikai markdown), var tikai tikt lejupielādēti.
- Atjaunošana no **lejupielādēta** .zip darbojas caur importēšanu — arhīvs atgriežas
  kā jauna telpa, un esošā telpa paliek neskartas.
- Pievienojiet **sinhronizācijas mapi**, lai spoguļotu telpu lokālajā krātuvē, iestatiet
  intervālu un palaidiet sinhronizāciju pēc pieprasījuma.
- Sākumlapa rāda statusa žetonu: brīdinājumu, kamēr sinhronizācija un rezerves kopijas
  nav iespējotas, un pārslēdzas uz **mapju sinhronizācija ieslēgta**, kad sinhronizācijas
  mape ir pievienota.

Krātuve ir lokāla, tāpēc **regulāras rezerves kopijas ir būtiskas**. Eksportējiet pirms
pārlūkprogrammas datu dzēšanas, ierīces maiņas vai kaut kā jauna izmēģināšanas.

## Ja lietotne nespēj sākt

Ja lietotne nevar atvērt savu lokālo datu bāzi, tā rāda palaišanas kļūdas ekrānu. No
turienes varat izvēlēties **Atiestatīt lokālos datus**, kas — pēc skaidra apstiprinājuma —
dzēš visu, ko lietotne glabājusi šajā pārlūkprogrammā, un sāk no jauna ar demonstrācijas
saturu. Tas neatgriezeniski dzēš jūsu dokumentus, piezīmes, citātus un lietotnes
iekšējās rezerves kopijas, tāpēc uzskatiet to par pēdējo līdzekli un uzturiet eksportus
drošā vietā.

> Šī ir attīstoša pirmsizlaišanas lietotne. Uzskatiet eksportus par patiesās informācijas
> avotu un bieži dublējiet.

## Saistītais

- [Citāti un bibliogrāfija](citations-and-bibliography) — BibTeX eksports.
- [Darba organizēšana](organizing-your-work) — ko satur telpa.
