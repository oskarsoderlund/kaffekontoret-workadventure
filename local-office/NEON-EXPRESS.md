# Neon Express — lokal speluppdatering 2026-10-26

Hämta DJ Nova i hamnen och flyg tillbaka till takfesten på60sekunder. Släpp WASD/pilar och tryck E på rosa plattan för hämtning, sedan på blå för hemkomst. Bonusportar på omvägar ger200poäng var. En till tre stjärnor: hemkomst ger1, två portar ger2, tre portar ger3. Poäng:1000+200×portar+10×kvarvarande hela sekunder. Turas om som pilot och jämför kvällens topplista. Andraspelaren följer samma resa och resultat; aktiv andrepilot ingår inte.

Grafik: egen ny imagegen-bakgrund neon-express-harbour.png, skapad med kontorets egen miljö som stilreferens; inga GTA-tillgångar. Originalfilen sparad separat i Codex generated_images. Filen används oförändrad, en projektion i Phaser passar takens centrum längs båda axlar till serverkoordinaterna, utan roterad bildkant över kartan. Crew Party återanvänds som DJ. UI och spelobjekt ligger separat ovanpå bilden; hus är bakgrund under helikoptern som flyger på hög höjd.

Gånghinder:22stol-/småmöbelfotavtryck tillagda i rooftop-layout.json; create-rooftop.py genererar samma kollisioner för klientkartan och serverns navigation. Alla10destinationer kontrolleras för nåbarhet, dessutom riktiga browserrutter och separata vägg-/pool-/stolprov.

Ljud: B eller en ikonknapp väljer en slumpad emote, utan direkt upprepning. K är fortfarande spark. Gemensam WebAudio-kontext för skott, spark, träff, slumpade effekter, hämtning och mål. Effekter startar efter första riktiga klick/tangenttryckning enligt webbläsarpolicy. Personligt muteval sparas separat från bakgrundsmusiken; mute stänger även pågående effekt via gain. Kontorsemotes återanvänder WorkAdventure-transporten.
