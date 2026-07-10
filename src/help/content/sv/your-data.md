# Dina data

Den här appen är **lokal-först**: ditt skrivande lagras i din egen webbläsare, på
din egen enhet. Ingenting laddas upp till en server och appen fungerar helt offline.

## Snabböversikt

- Ditt arbete lever i **din webbläsare** — privat som standard, kopplat till den
  här enheten.
- **Exportera** prosa och citat för att ta med ditt arbete.
- **Säkerhetskopiera** regelbundet; rensning av webbplatsdata raderar ditt arbete.
- Valfritt **synkronisera** ett utrymme till en lokal mapp.

## Vad lokal-först innebär

- Dokument, utrymmen, noteringar och citat lever i webbläsarens lokala lagring.
- Det finns inget konto och ingen automatisk molnsynkronisering — privat som standard,
  men dina data är kopplade till den här webbläsaren på den här enheten.
- Att rensa webbläsarens webbplatsdata tar bort ditt arbete, så håll säkerhetskopior.

## Exportera

Exportera ditt skrivande för att ta med det eller ha en säker kopia. Hela ett utrymme
exporteras som ett tidsstämplat **utrymmesarkiv** (.zip); citat exporteras som
[BibTeX](citations-and-bibliography).

Ett utrymmesarkiv innehåller två lager: ett läsbart träd av markdown-filer du kan
öppna var som helst, och en fullständig maskinläsbar kopia av varje post — dokument,
noteringar, bilagor, anteckningar, citat, kopplingar, versionshistorik och inställningar
— så att arkivet kan återställas eller importeras på ett trovärdigt sätt senare.

## Importera

Ta in ett utrymme i den här webbläsaren från ett utrymmesarkiv — till exempel en
nedladdad ögonblicksbild, eller en mappsynkroniseringsexport från en annan enhet.
Gå till **Inställningar → Exportera/importera**, välj arkivfilen och den importeras
som ett **nytt utrymme** bredvid dina befintliga. Import skriver aldrig över något;
det är också sättet att flytta ett utrymme mellan enheter.

## Säkerhetskopior, återställning och synkronisering

- Skapa **ögonblicksbilder** från utrymmets säkerhetskopieringsområde; var och en
  lägger till en rad du kan ladda ner, återställa eller radera.
- **Återställ** en ögonblicksbild för att rulla tillbaka hela utrymmet till det
  ögonblicket. Det nuvarande tillståndet sparas först som en ny ögonblicksbild, så
  en återställning kan i sin tur ångras. Ögonblicksbilder skapade innan stöd för
  återställning fanns (markdown-only) kan bara laddas ner.
- Återställning från en nedladdad .zip fungerar via import — arkivet kommer tillbaka
  som ett nytt utrymme och det befintliga utrymmet lämnas orört.
- Anslut en **synkroniseringsmapp** för att spegla ett utrymme till lokal lagring,
  ange intervallet och kör en synkronisering på begäran.
- Hemskärmen visar ett statuschip: en varning medan synkronisering och säkerhetskopior
  inte är aktiverade, som övergår till **mappsynkronisering på** när en
  synkroniseringsmapp har anslutits.

Lagring är lokal, så **regelbundna säkerhetskopior är nödvändiga**. Exportera innan
du rensar webbläsardata, byter enhet eller provar något nytt.

## Om appen inte startar

Om appen inte kan öppna sin lokala databas visar den en startfelsskärm. Därifrån
kan du välja **Återställ lokala data**, vilket — efter en uttrycklig bekräftelse —
raderar allt som appen har lagrat i den här webbläsaren och börjar om med
demoinnehåll. Detta raderar permanent dina dokument, noteringar, citat och
in-app-säkerhetskopior, så behandla det som en sista utväg och förvara exporter
på ett säkert ställe.

> Det här är en pågående förhandsversionsapp. Behandla dina exporter som
> sanningskällan och säkerhetskopiera ofta.

## Relaterat

- [Citat och bibliografi](citations-and-bibliography) — BibTeX-export.
- [Organisera ditt arbete](organizing-your-work) — vad ett utrymme innehåller.
