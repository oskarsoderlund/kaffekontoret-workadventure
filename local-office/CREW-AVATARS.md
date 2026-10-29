# Tolv valbara karaktärer — Oski med vit mössa

Implementerat 2026-10-15 från Oskars bifogade karaktärsbild. Alla tolv finns som spelbara avatarer i samlingen **OSKAR BUSINESSOS · Crew**. **Oski** är karaktären med vit mössa, solglasögon, vit pälsjacka, lila kläder och käpp. Han ligger först och är förvald för nya spelare. Ett redan sparat avatarval behålls tills spelaren väljer en annan.

## Välj i spelet

Öppna http://office.localhost:8090 och ladda om en äldre flik. Klicka **Byt avatar → Oski → Continue**. Samma val finns vid första inloggningen och i WorkAdventures ordinarie profilmeny. `Byt avatar` använder spelets befintliga byte av karaktär; inga privata arbetsverktyg eller behörigheter behövs.

| Position i referensen | Val i spelet |
| --- | --- |
| Övre raden 1 | Kaptenen |
| Övre raden 2, vit mössa | **Oski** |
| Övre raden 3 | Diva |
| Övre raden 4 | Livvakten |
| Övre raden 5 | Neonhackern |
| Övre raden 6 | Party |
| Nedre raden 1 | Fixaren |
| Nedre raden 2 | Punkaren |
| Nedre raden 3 | Gamern |
| Nedre raden 4 | Phantom |
| Nedre raden 5 | Don |
| Nedre raden 6 | Rasta |

## Grafik, prompt och implementation

Grafiken skapades med **inbyggda imagegen** utifrån referensens individer och kläder, med verklig transparens och gångposer framifrån, från vänster, från höger och bakifrån. Det är genererade spelversioner av figurerna, inte stillbilder som flyttas runt utan riktningar.

- [Referensbild](assets/crew/reference.jpg)
- [Katalog med namn och utseendebeskrivningar](assets/crew/catalog.json)
- [Alla tolv slutliga imagegen-prompter](assets/crew/imagegen-prompts.json)
- Ursprungliga genererade bilder: `local-office/assets/crew/raw/crew-*.png`.
- Slutlig spelgrafik: `play/public/office/avatars/crew/crew-*.png`. [Oskis spritesheet](../play/public/office/avatars/crew/crew-oski.png).
- [Import- och packningsrapport](assets/crew/packing-report.json).

Varje spelbild är 384 × 512 px: tre kolumner och fyra riktningar med 128 × 128 px per pose. I världen visas den som 40 × 40 px med samma befintliga 16 × 16 px kollisionskropp. Därmed fungerar befintliga smala passager. De gamla avatarernas 32-pixelsformat stöds samtidigt, liksom befintliga lager för egna Wokas.

`OfficeAvatarTexture.ts` avgränsar HD-formatet till dessa tolv ID:n. Alla fyra laddningsvägar och Woka-förhandsvisningen använder samma formatval. Namnskyltarna flyttas upp för de nya figurerna, och profilbildernas renderingsyta anpassas så att större sprites inte klipps. Övriga spelmekanismer och den befintliga Codex-karaktären är bevarade.

Bildimporten använder ImageMagick för att hitta transparenta mellanrum, beskära kompletta poser, anpassa storlek och packa spelrutorna. En felvänd vänstervariant i de genererade Diva-/Neonhacker-bilderna spegelvänds vid import. Originalbilderna finns kvar oförändrade.

```sh
# Grafikverktyg för utveckling; behövs inte för att starta/spela.
node local-office/scripts/pack-crew.mjs
node local-office/scripts/register-crew.mjs
```

Den vanliga `create-assets.py` bevarar dessa spritesheets och registrerar samlingen igen efter de äldre avatarerna. Upprepad körning är verifierad: tolv identiska bildfiler, Oski först och inga dubblerade samlingar. Inga bilder lämnas enbart i Codex genereringskatalog.

## Verifierat i riktiga Chrome-klienter

**32 browserprov passerar, noll JavaScript-fel.**

- `test-results-crew.json`: 19 prov. Alla tolv kan väljas och syns med namn och transparenta porträtt. Oski förhandsvisas i fyra riktningar. Varje karaktär går med faktisk tangentstyrning åt alla fyra håll, visar flera gångrutor och återgår till rätt vilopose: 48 riktade gångprov sammanlagt. En separat klient ser rätt avatar med rätt bildformat och storlek vid varje byte.
- Valet sparas efter omladdning. Byte tillbaka till Oski fungerar från spelmenyn. De tidigare 32-pixelsavatarerna fungerar samtidigt. Mobilbredd 390 px provas med tillgänglig Byt avatar-knapp och fungerande val av Oski.
- `test-results-lan.json`: 13 multiplayerprov med **Oski och Neonhackern** på Macens HTTPS/LAN-adress. Båda ser varandra, rörelse och chatt överförs, faktisk WebRTC-trafik och avkodade videoframes tas emot åt båda hållen, och fis/rap/kiss visas och hörs hos mottagaren. Zoommeny, skrivbordskollision, ljud av, återanslutning och mobilknappar passerar också.
- Kamera och mikrofon är simulerade i browserproven; transport och avkodning är riktiga. Detta ersätter inte ett prov med en fysisk kompis dator.
- TypeScript, Svelte (0 fel, 0 varningar), fokuserad ESLint, Prettier och klientbygge passerar.
- Ett separat resursprov av ny inloggning och avatarbyte gav inga misslyckade HTTP-resurser.

Granskade skärmbilder:

- [Alla tolv i väljaren](../screenshots/crew-picker.png)
- [Oski i kontoret med en annan spelare](../screenshots/oski-in-office.png)
- [Väljaren på mobilbredd](../screenshots/crew-picker-mobile.png)

Docker lämnas igång. Ändringarna är lokala och ingår i det uppdaterade källkodserbjudandet. Inga commits, pushes, produktionsdeploys, externa meddelanden eller credentialändringar har gjorts.
