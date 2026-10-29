# Neon Rooftop — design efter Oskars referensbild

Detta är det separata kartuppdraget från 2026-10-15. Ursprungliga P1/P2-liveprov i `TEST-APPROVAL.md` ingår inte i kartändringen och inga externa meddelanden eller Asana-ändringar har utförts.

## Levererat

- Samma motiv och planlösning som referensen: solnedgång och skyline vid vattnet; helikopterplatta uppe till vänster; OSKAR BUSINESSOS-reception i mitten; kontor till höger; neonbar och poolterrass till vänster; arbetsplatser i mitten; arkad/biljard till höger; eldstadslounge och entrébrygga längst ned.
- Inritade personer och katten är borttagna ur bakgrunden. Befintliga avatarer används som rörliga spelkaraktärer. Alla fem avatarfiler är byte-identiska efter generatorns körning.
- 16-pixels kollisionsrutor följer gångytorna, trapporna, möblerna, räckena, poolen och vattnet. Alla 2247 tillåtna rutor bildar ett sammanhängande område. Alla tio destinationer är nåbara.
- Codex står i receptionen och öppnar den befintliga uppgiftspanelen. Privata integrationer och övriga arbetsfunktioner behålls.
- Kompakt neonmeny och `Överblick` för hela kartan. Menyn ligger utanför spelkameran och behåller zoom-, chatt- och effektknapparna.
- Vägberäkningens startankare använder karaktärens verkliga colliderförskjutning. Det förhindrar att en ny klickrutt startar med ett oavsiktligt åttapixelshopp på 16-pixelskartor; standardkartor med 32-pixelsrutor behåller sitt ankare.

## Grafik och reproduktion

Miljön är en rasterbild, retuscherad med **inbyggda imagegen** från användarens referens. Det är en referensbaserad bakgrund med borttagna figurer, inte en ny uppsättning spelavatarer. Retuscheringen är generativ och innebär ingen garanti om pixelidentitet med originalfotot.

- [Användarens referens](assets/rooftop-reference.jpg)
- [Genererad miljö, utan personer](assets/rooftop-empty.png)
- [Slutlig serverad grafik](../play/public/office/office.png)
- [Fullständig imagegen-prompt](assets/rooftop-imagegen-prompt.txt)
- [Redigerbar kollisionsplan](assets/rooftop-layout.json)
- [Map-generator](scripts/create-rooftop.py)

Promptens avsikt: ta bort samtliga personer och katten, rekonstruera ytorna bakom dem, behåll motiv, kameravinkel, rum, möbler, neontexter, palmer, vatten och färger. Ingen GTA-grafik används. Miljöbilden kopieras byte för byte till spelet. Bilden är 1672 × 941 px; Tiled använder 1664 × 928 px och lämnar bara den yttersta vattenremsan till höger/nedtill utanför rutnätet.

```sh
python3 local-office/scripts/create-rooftop.py
# Om även de befintliga avatarerna ska återskapas:
python3 local-office/scripts/create-assets.py
```

## Verifiering

- `test-results-rooftop.json`: 16 passerade Chrome-prov, noll JavaScript-fel. Verkliga högerklick går genom WorkAdventures vägberäkning; inga teleporteringar eller injicerade rörelsekommandon används. Faktiska tangenttryckningar provar pool-, bords- och räckeskollisioner. Codex klickas i den nya receptionen. Helhetsvyn kontrolleras mot kartans fyra kanter.
- `rooftop-pathfinding-tests.log`: elva passerade Vitest-prov, inklusive startposition på 16- och 32-pixelskartor.
- `rooftop-typecheck.log`, `rooftop-svelte-check.log`, `rooftop-lint.log`, `rooftop-prettier.log`, `rooftop-build.log`: typkontroll, Svelte-kontroll, fokuserad lint, formatering och klientbygge.
- Gångprovet kör i en separat WorkAdventure-instans med samma server, karta och klient för att befintliga användares närhetssamtal inte ska störa provets klick eller påverkas av testet.
- `test-results-lan.json`: 13 passerade multiplayerprov på Macens HTTPS-adress 2026-10-15. Två separata Chrome-kontexter ser varandra och förmedlar faktisk rörelse, tvåvägschatt och de tre effekternas bild/ljud. WebRTC-statistik visar mottagna ljudbytes och avkodade videoframes i båda riktningarna. Ljud av, återanslutning, kollision, kraftig zoom och 390 px meny provas också. Noll JavaScript-fel. Kamera/mikrofon är simulerade; en fysisk kompis dator har inte använts i dessa automatiserade prov.
- Totalt för kartändringen: **29 browserprov och 11 enhetstester passerar**. Äldre integrationsprov räknas inte in som nya prov av kartändringen.
- [Granskad helhetsbild i spelet](../screenshots/rooftop-desktop.png), [effekt hos den andra spelaren](../screenshots/remote-fart.png), [mobil meny](../screenshots/mobile.png), [tvåvägschatt](../screenshots/chat-bidirectional.png). Bilderna är riktiga skärmbilder från Chrome, inte designmockuper.

## Slutkontroll mot uppdraget

| Krav | Bevis |
| --- | --- |
| Starta Docker när högst två Codex-sessioner är aktiva | Appens trådlista visade endast denna aktiva Codex-tråd före start. Fyra tjänster startades och HTTP ping samt play/back healthchecks verifierades |
| Bygg kartan efter bilden | Ursprunglig referens och tom miljö finns under assets/. Den laddade kartan har granskats visuellt i Chrome mot referensen: samtliga huvudsakliga rum, skyltar, möbler, pool, helikopter, palmer och skyline finns på motsvarande platser |
| Använd befintliga gubbar | Fem befintliga avatar-PNG:er jämförda med SHA256 före och efter generatorn: identiska. De inritade personerna ingår inte i miljöbilden |
| Funktionell karta | Alla öppna rutor sammanhängande; verklig gång till tio områden; tangentstyrda kollisioner; klickbar befintlig Codex-funktion; överblick utan klippta kartkanter |
| Befintligt spel fungerar | 13 Chrome-prov med två klienter: rörelse, chatt, WebRTC, effekter, zoommeny, återanslutning och ljud av |
| Lämna en spelbar lokal prototyp | Servern kör på localhost och HTTPS/LAN-adressen. Aktuell kod, grafik, prompt, generator och dokumentation ingår i källkodserbjudandet |

## Öppna och spela

På Macen: http://office.localhost:8090. Ladda om en redan öppen flik för att hämta den nya kartan. På samma nätverk: båda öppnar https://192.168.68.58:8443 (lokalt självsignerat certifikat).

Pilar/WASD flyttar; Shift springer; högerklick på fri gångyta väljer en rutt. `Överblick` visar hela kartan. Pågående videosamtal använder WorkAdventures vanliga videorutor ovanpå kartan; tangentstyrningen fungerar även när en videoruta täcker en plats du vill gå till.

Docker lämnas igång. Inga commits, pushes eller produktionsdeploys ingår.
