# Licens och 5 USD per användare

Kontrollerat 2026-10-14 mot [aktuell upstream-licens](https://github.com/workadventure/workadventure/blob/master/play/LICENSE.txt), hämtad direkt med GitHub API, och [självhostningsguiden](https://github.com/workadventure/workadventure/blob/master/docs/others/self-hosting/adminAPI.md).

WorkAdventure använder AGPLv3 med Commons Clause. Villkoret förbjuder en avgiftsbelagd produkt eller tjänst som till stor del består av programvaran eller dess funktionalitet. Projektets egen guide anger uttryckligen att en betald WorkAdventure-tjänst kräver separat licens. En vanlig AGPL-källkodspublicering undanröjer alltså inte Commons Clause.

- **Lokal, kostnadsfri prototyp/intern användning:** kan byggas på denna kod inom licensvillkoren. Bevara attribution och tillgängliggör motsvarande ändrad källkod för nätverksanvändare.
- **Betald SaaS:** inte ett klartecken med nuvarande licens. Separat kommersiellt avtal med rättighetsinnehavaren måste täcka den avsedda återförsäljningen, ändringarna och prissättningen. Inget sådant avtal finns verifierat.
- **Alternativ:** egen implementation eller en annan grund med uttryckligen tillåtande kommersiell licens. Att bara byta grafik eller lägga integrationerna i en separat tjänst undanröjer inte begränsningen för WorkAdventure-kärnan.
- **Grafik:** kontorskartan och fem spritesheets är original och genereras i `scripts/create-assets.py`. Inget GTA-material, Rockstar-logotyp, GTA-ljud eller GTA-karaktär har använts. Befintliga WorkAdventure-tillgångar och deras notices finns kvar. De ska granskas separat innan kommersiell distribution.
- **Ny kod:** ingår i motsvarande källkodserbjudande med de befintliga licensvillkoren. Ingen återlicensiering av WorkAdventure görs.

## Ekonomisk ram

5 USD per aktiv/betalande plats och månad ger följande bruttointäkt före skatter, betalavgifter och kostnader. Detta är räkneexempel, inga verifierade kostnadsofferter.

| Betalande platser | Månatlig bruttointäkt |
| --- | ---: |
| 20 | 100 USD |
| 100 | 500 USD |
| 1 000 | 5 000 USD |

Marginal per plats = 5 USD − kommersiell licens − drift/bandbredd/TURN − AI-användning − betalavgifter − support/övrigt. Licensavgift, AI-kostnad och verklig driftkostnad är **UNKNOWN**. Den lokala demonstrationen har därför inte bevisat att priset bär en SaaS-affär. Prototypens befintliga Codex/ChatGPT-inloggning är inte ett verifierat avtal eller en kostnadsmodell för att sälja AI-användning till kunder.

Exempel: för 30 procent bidragsmarginal får dessa kostnader tillsammans vara högst 3,50 USD/plats/månad. En minimilicens eller fasta supportkostnader kan göra små kundteam olönsamma. Närhetsvideo använder peer-to-peer för högst fyra användare i den lokala konfigurationen; det reducerar central videokostnad här men mäter inte belastning, TURN-behov eller drift vid större kundvolymer.

Rekommendation: använd prototypen för produktvalidering. Sälj inte denna WorkAdventure-baserade version innan ett kommersiellt licensavtal och en uppmätt kostnad per aktiv plats finns. Inget mejl till rättighetsinnehavaren har skickats.

För en SaaS krävs dessutom egna kundidentiteter, personbundna Slack-/Asana-kopplingar, roller, datagränser mellan kontor och en begränsad AI-kvot. Mac-ägarens privata kontrolltjänst i prototypen kan inte användas som kundautentisering. Undersök fast pris för kontoret plus separat AI-kvot, eller AI som tillägg, innan obegränsade agentuppgifter inkluderas i 5 USD/plats.
