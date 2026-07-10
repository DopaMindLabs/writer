# Dine data

Denne appen er **lokalt-først**: skrivingen din lagres i din egen nettleser, på din
egen enhet. Ingenting lastes opp til en server, og appen fungerer fullt ut offline.

## Oversikt

- Arbeidet ditt lever i **nettleseren din** — privat som standard, knyttet til denne enheten.
- **Eksporter** prosa og siteringer for å ta med arbeidet ditt.
- **Sikkerhetskopier** regelmessig; tømming av nettstedsdata sletter arbeidet ditt.
- Valgfritt **synkroniser** et rom til en lokal mappe.

## Hva lokalt-først betyr

- Dokumenter, rom, notater og siteringer lever i nettleserens lokale lagring.
- Det er ingen konto og ingen automatisk skysynkronisering — privat som standard, men
  dataene dine er knyttet til denne nettleseren på denne enheten.
- Tømming av nettleserens nettstedsdata fjerner arbeidet ditt, så hold sikkerhetskopier.

## Eksportere

Eksporter skrivingen din for å ta den med deg eller ha en sikker kopi. Et helt rom
eksporteres som et tidsstemplet **romsarkiv** (.zip); siteringer eksporteres som
[BibTeX](citations-and-bibliography).

Et romsarkiv inneholder to lag: et lesbart tre av markdown-filer du kan åpne overalt,
og en fullstendig maskinlesbar kopi av hver post — dokumenter, notater, vedlegg,
merknader, siteringer, koblinger, versjonshistorikk og innstillinger — slik at arkivet
kan gjenopprettes eller importeres trofast senere.

## Importere

Ta et rom inn i denne nettleseren fra et romsarkiv — for eksempel et nedlastet
øyeblikksbilde, eller en mappesync-eksport fra en annen enhet. Gå til
**Innstillinger → Eksporter/importer**, velg arkivfilen, og den importeres som et
**nytt rom** ved siden av de eksisterende. Import overskriver aldri noe; dette er
også måten å flytte et rom mellom enheter.

## Sikkerhetskopier, gjenoppretting og synkronisering

- Opprett **øyeblikksbilder** fra rommets sikkerhetskopieringsområde; hvert legger
  til en rad du kan laste ned, gjenopprette eller slette.
- **Gjenopprett** et øyeblikksbilde for å rulle hele rommet tilbake til det øyeblikket.
  Gjeldende tilstand lagres først som et nytt øyeblikksbilde, slik at en gjenoppretting
  selv kan angres. Øyeblikksbilder opprettet før gjenopprettingsstøtte fantes
  (markdown-only) kan bare lastes ned.
- Gjenoppretting fra en nedlastet .zip fungerer via import — arkivet kommer tilbake
  som et nytt rom, og det eksisterende rommet forblir urørt.
- Koble til en **synkroniseringsmappe** for å speile et rom til lokal lagring, angi
  intervallet og kjør en synkronisering ved behov.
- Hjemskjermen viser et statuschip: en advarsel mens synkronisering og sikkerhetskopier
  ikke er aktivert, som skifter til **mappesynkronisering på** når en
  synkroniseringsmappe er tilkoblet.

Lagring er lokal, så **regelmessige sikkerhetskopier er avgjørende**. Eksporter før du
tømmer nettleserdata, bytter enhet eller prøver noe nytt.

## Hvis appen ikke starter

Hvis appen ikke kan åpne den lokale databasen, vises et oppstartsfeilskjerm. Derfra
kan du velge **Tilbakestill lokale data**, noe som — etter en uttrykkelig bekreftelse
— sletter alt appen har lagret i denne nettleseren og starter på nytt med demoinnhold.
Dette sletter permanent dokumenter, notater, siteringer og in-app-sikkerhetskopier,
så behandle det som en siste utvei og oppbevar eksporter et sikkert sted.

> Dette er en pågående pre-release-app. Behandle eksportene dine som sannhetskilden
> og sikkerhetskopier ofte.

## Relatert

- [Siteringer og bibliografi](citations-and-bibliography) — BibTeX-eksport.
- [Organisering av arbeidet](organizing-your-work) — hva et rom inneholder.
