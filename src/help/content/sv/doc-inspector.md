# Dokumentinspektören

Dokumentinspektören är panelen bredvid redigeraren. Fliken **Disposition** kartlägger
dokumentets struktur, och fliken **Info** visar livedetaljer om dokumentet du skriver
och låter dig ange några valfria gränser och en status. Du väljer vilka av dessa fält
som visas — universellt och per utrymme — så inspektören visar bara vad du bryr dig om.

## Dispositionen

Fliken **Disposition** listar dokumentets rubriker i ordning, indragda efter nivå, så
du kan se formen på ett långt stycke med ett ögonkast. Den uppdateras ett ögonblick
efter att du slutat skriva.

Dispositionen byggs från dina rubriker — skriv `# `, `## ` eller `### ` i början av
en rad (eller använd det flytande verktygsfältet) för att lägga till en. Ett dokument
utan rubriker visar en tom disposition; se
[Formatering och markdown](formatting-and-markdown#headings-and-structure) för hur
rubriker fungerar.

På en telefon öppnar du inspektören från fliken **mer**: välj **Dokumentinspektör**
från menyn och den glider in från höger.

## Ord- och teckenantal

Fliken Info visar alltid det aktuella **ord-** och **teckenantalet** för dokumentet.

## Ange ett ord- eller teckengräns

Om fältet **Ordgräns** eller **Teckengräns** visas, skriv ett tal för att ange ett mål.
Räknaren visar sedan `aktuellt / gräns`, och när du överskrider gränsen blir räknaren
röd och texten över gränsen markeras i redigeraren. Ingenting raderas eller kapas —
markeringen är bara en visuell ledtråd, så du kan fortsätta skriva och trimma senare.

Lämna ett gräns tomt (eller ange det till `0`) för inget gräns.

Om du hellre vill behålla gränsen och räknaren men inte redigerarmarkeringen stänger
du av **Markera text över gränsen** i inställningarna (se nedan).

## Status och låsning

**Status**-väljaren tar ett dokument genom dess faser: _Utkast_, _Pågående_,
_Under granskning_, _Klart_ och _Publicerat_. Att ange status till **Klart** eller
**Publicerat** låser dokumentet så att det inte kan ändras av misstag — en banner
visas över redigeraren med en knapp **Lås upp för att redigera**. Använd den knappen
för att låsa upp, eller ange statusen tillbaka till ett tidigare skede. Låsning skyddar
bara dokumentets brödtext; ingenting raderas.

## Förfallodatum

Om fältet **Förfallodatum** visas väljer du ett datum för att registrera en deadline.
Ett passerat datum visas i rött.

## Välja vilka fält som visas

Varje inspektörsfält är valfritt. För att välja vilka som visas:

- **Universellt:** öppna **Universella inställningar → Dokumentinspektör** och slå
  varje fält på eller av. Du kan också välja vilka statusfaser som visas i väljaren.
- **Per utrymme:** öppna ett utrymmets **Inställningar → Dokumentinspektör**. Varje
  fält kan ärva den universella standarden eller slås på eller av enbart för det utrymmet.

Att stänga av ett fält döljer det från inspektören — tillsammans med dess gräns och
redigerarmarkeringen — även om du hade angett ett värde tidigare. Värdet raderas inte:
slå på fältet igen så visas det på nytt.
