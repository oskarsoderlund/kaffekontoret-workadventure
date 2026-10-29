# Helikopter och Kaosläge

Öppna http://office.localhost:8090 och välj exempelvis **Oski** (vit mössa).

## Neon Express — rädda takfesten

1. Gå till helikopterplattan uppe till vänster. WASD/pilar styr på marken; högerklick på en gångyta låter karaktären gå dit.
2. Klicka **🚁 Spela → Starta helikopteruppdrag** nära plattan.
3. Flyg med WASD/pilar eller riktningsknapparna. Minikartan visar vitt = helikopter, rosa = DJ Nova i hamnen, blått = takfesten hemma. Gula bonusportar ligger på omvägar.
4. Släpp styrningen och tryck **E** eller **Landa / hämta** i den rosa landningszonen.
5. Flyg hem och landa i den blå zonen. Du har 60 sekunder. Tid och valfria bonusportar ger poäng och en till tre stjärnor; kvällens fem bästa rundor visas i rummet. Turas om och slå kompisens rekord.
6. **Till kontoret** återställer den vanliga vyn. **Avbryt och gå tillbaka** avbryter ett pågående uppdrag.

En spelare är pilot. Andra kan välja **Följ flygningen**. Om piloten lämnar kommer helikoptern tillbaka och någon annan kan ta över ett nytt uppdrag. Resultat gäller det aktuella rummet och försvinner vid serveromstart.

## Skjuta och sparka

Båda spelarna slår på **🎯 Kaos**. Vanliga kollegor som inte valt Kaos kan inte träffas.

- Sikta med musen och vänsterklicka i världen för pistol.
- **K** eller **Sparka** ger en spark med kort knuff på nära håll.
- 100 hälsa; en träff gör 25 skada. Väggar och hinder stoppar skott och knuffar.
- Vid utslagning återkommer du efter 2,5 sekunder med fullt liv och ett kort skydd. Blå hälsomätare visar skyddet. Du kan inte själv attackera medan skyddet är aktivt.
- Kaos av stänger av striden för dig. Återanslutning kräver nytt aktivt val av Kaos.
- När du skriver i ett textfält ska tangenter inte skjuta, sparka eller styra helikoptern.

Servern avgör träffar, hälsa, återhämtningstid, pilotplats och helikopterrörelser via WorkAdventures befintliga room-events. Vanlig gångrörelse är fortfarande WorkAdventures klientrapporterade rörelse; detta är inte fullständigt fuskskydd för publik konkurrensturnering.

Flygkartan är egen imagegen-grafik i samma neonstil som kontoret. Helikoptern och vapen-/sparkeffekterna ritas i Phaser. DJ:n återanvänder Crew Party. Ingen GTA- eller Armor Alley-grafik, kod eller ljud har importerats. Den ursprungliga kontorskartans dekorativa helikopterbild ligger kvar som markgrafik; det körbara fordonet visas i uppdragsvyn.

## Ljud och gångkänsla

- **B** eller den enda högtalarikonen väljer en slumpad effekt. De tre separata Fisa/Rapa/Kissa-knapparna är borttagna. K är kvar som spark.
- Skott, sparkar, träffar, emotes, hämtning och mål får ljud automatiskt efter ditt första klick/tangenttryck. Webbläsaren kräver den interaktionen. **Ljud av** tystar effekterna och sparas för dig; bakgrundsmusiken har separat reglage.
- Stolar och småmöbler har ytterligare 22 kollisionsytor, så fötterna stoppas i stället för att fortsätta genom dem. Kontoret är fortsatt en illustrerad 2D-karta.
- **Spelfokus** döljer samtalsrutorna utan att stänga samtalet. På mobil fälls minikartan ut med **Karta och styrning**.

## Drift

Backendens `GameRoom.ts`, `OfficeGame.ts` och kontorets navigation monteras read-only i Docker. Proxyn följer Dockers DNS även när containrar får nya IP-adresser. De vanliga start-/stoppskripten används som tidigare; testsessioner använder separat composeprojekt och port 18090 med blockerade företagsintegrationer.

QA-resultat och begränsningar för senaste ändringen: `qa-reports/feel-update-2026-10-26/REPORT.md`. Tidigare körningar ligger kvar separat.
