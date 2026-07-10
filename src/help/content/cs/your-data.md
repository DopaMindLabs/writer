# Vaše data

Tato aplikace je **lokálně zaměřená**: vaše psaní je uloženo ve vašem vlastním
prohlížeči, na vašem vlastním zařízení. Nic se nenahrává na server a aplikace
funguje plně offline.

## Přehled

- Vaše práce žije ve **vašem prohlížeči** — soukromá ve výchozím nastavení, vázaná
  na toto zařízení.
- **Exportujte** prózu a citace pro přesun práce.
- **Pravidelně zálohujte**; vymazání dat webu smaže vaši práci.
- Volitelně **synchronizujte** prostor s lokální složkou.

## Co znamená lokálně zaměřený

- Dokumenty, prostory, poznámky a citace žijí v lokálním úložišti vašeho prohlížeče.
- Neexistuje žádný účet a žádná automatická cloudová synchronizace — soukromí ve
  výchozím nastavení, ale vaše data jsou vázána na tento prohlížeč na tomto zařízení.
- Vymazání dat webu vašeho prohlížeče odstraní vaši práci, takže si uchovávejte zálohy.

## Export

Exportujte své psaní pro přesun nebo uchování bezpečné kopie. Celý prostor se
exportuje jako **archiv prostoru** s časovým razítkem (.zip); citace se exportují
jako [BibTeX](citations-and-bibliography).

Archiv prostoru obsahuje dvě vrstvy: čitelný strom souborů markdown, které lze
otevřít kdekoli, a kompletní strojově čitelnou kopii každého záznamu — dokumenty,
poznámky, přílohy, anotace, citace, spojení, historii verzí a nastavení — takže
archiv lze věrně obnovit nebo importovat později.

## Import

Přeneste prostor do tohoto prohlížeče z archivu prostoru — například snímku,
který jste stáhli, nebo exportu ze synchronizace složky z jiného zařízení.
Přejděte na **Nastavení → Export / import**, vyberte soubor archivu a importuje
se jako **nový prostor** vedle vašich stávajících. Import nikdy nic nepřepíše;
toto je také způsob, jak přesunout prostor mezi zařízeními.

## Zálohy, obnovení a synchronizace

- Vytvářejte **snímky** z oblasti záloh prostoru; každý přidá řádek, který lze
  stáhnout, obnovit nebo smazat.
- **Obnovte** snímek pro vrácení celého prostoru k danému okamžiku. Aktuální stav
  se nejprve uloží jako nový snímek, takže obnovení lze samo o sobě vrátit. Snímky
  vytvořené před podporou obnovení (pouze markdown) lze pouze stáhnout.
- Obnovení ze **staženého** .zip funguje přes import — archiv se vrátí jako nový
  prostor a stávající prostor zůstane nedotčen.
- Připojte **synchronizační složku** pro zrcadlení prostoru do lokálního úložiště,
  nastavte interval a spusťte synchronizaci na vyžádání.
- Domovská obrazovka zobrazuje stavový čip: varování, dokud nejsou povoleny
  synchronizace a zálohy, přepínající na **synchronizace složky zapnuta**, jakmile
  je připojena synchronizační složka.

Úložiště je lokální, takže **pravidelné zálohy jsou nezbytné**. Exportujte před
vymazáním dat prohlížeče, přepnutím zařízení nebo vyzkoušením něčeho nového.

## Pokud se aplikace nespustí

Pokud aplikace nemůže otevřít svou lokální databázi, zobrazí obrazovku chyby
při spouštění. Odtud můžete zvolit **Resetovat lokální data**, která — po
explicitním potvrzení — vymaže vše, co aplikace uložila v tomto prohlížeči,
a začne znovu s ukázkovým obsahem. Tím se trvale odstraní vaše dokumenty,
poznámky, citace a zálohy v aplikaci, takže to berte jako poslední možnost
a uchovávejte exporty na bezpečném místě.

> Toto je vyvíjející se předběžná verze aplikace. Považujte exporty za primární
> zdroj pravdy a zálohujte často.

## Viz také

- [Citace a bibliografie](citations-and-bibliography) — export BibTeX.
- [Organizace práce](organizing-your-work) — co prostor obsahuje.
